from __future__ import annotations

import logging
from dataclasses import dataclass
from math import ceil
from typing import Callable, Dict, List, Optional, Set, Tuple

import numpy as np

from .economic_planner_types import (
    CriticalMoment,
    Decision,
    PlannerInputs,
    PlannerResult,
    SimulatedState,
)
from .types import (
    CBBMode,
    DEFAULT_CHARGE_EFFICIENCY,
    DEFAULT_EFFICIENCY,
    MODE_LABEL_HOME_I,
    MODE_LABEL_HOME_UPS,
    TRANSITION_COSTS,
)

_LOGGER = logging.getLogger(__name__)
_HOME_1 = CBBMode.HOME_I.value
_HOME_UPS = CBBMode.HOME_UPS.value
# Resolution of the optimizer's SoC grid: a numerical setting, not a preference.
# One UPS slot stores about twelve of these at 2.6 kW. A finer grid no longer
# changes what the plan costs: a year replayed on the box's data comes to
# 11 822 CZK at this step and 11 824 CZK at 0.01 kWh.
_SOC_GRID_STEP_KWH = 0.05
# A cost difference below this is rounding, not a saving; such ties go to Home 1.
_COST_TIE_EPS_CZK = 1e-6
# Floating point slack on SoC comparisons, not a margin on the hard minimum.
_ENERGY_EPS_KWH = 1e-9
# What a mode change loses, from the existing transition table. Priced at the
# slot's own price it comes to a few tenths of a crown per round trip: small
# against a real price spread, enough to stop the plan chasing rounding.
_SWITCH_ENERGY_LOSS_KWH: Dict[Tuple[Optional[int], int], float] = {
    (_HOME_1, _HOME_UPS): TRANSITION_COSTS[(MODE_LABEL_HOME_I, MODE_LABEL_HOME_UPS)][
        "energy_loss_kwh"
    ],
    (_HOME_UPS, _HOME_1): TRANSITION_COSTS[(MODE_LABEL_HOME_UPS, MODE_LABEL_HOME_I)][
        "energy_loss_kwh"
    ],
}

# Why a UPS slot is in the plan. The values are taken from the telemetry contract
# (DETAIL_ENUMS["detail_reason"]), so they reach it without a contract change.
REASON_FLOOR_RECOVERY = "RECOVERY_BELOW_PLANNING_MIN"
REASON_FLOOR_DEFENSE = "REPAIR_PLANNING_MIN_VIOLATION"
REASON_PRICE_SPREAD = "ECONOMIC_CHARGE_CHEAPER_FUTURE"
REASON_HOLD_FOR_LATER = "PRICE_BAND_CONTINUATION"
REASON_END_OF_HORIZON = "REACH_TARGET_SOC"
REASON_SWITCH_NOT_WORTH_IT = "GAP_FILL"
_FLOOR_REASONS = frozenset({REASON_FLOOR_RECOVERY, REASON_FLOOR_DEFENSE})

_SwitchCost = Callable[[Optional[int], int, float], float]


def _simulate_interval(
    soc: float,
    solar: float,
    load: float,
    price: float,
    inputs: PlannerInputs,
    mode: int = CBBMode.HOME_I.value,
) -> tuple[float, float, float, float]:
    grid_import = 0.0
    grid_export = 0.0
    new_soc = soc

    solar_to_load = min(solar, load)
    remaining_load = max(0.0, load - solar_to_load)
    solar_surplus = max(0.0, solar - solar_to_load)

    max_storable_input = (
        (inputs.max_capacity_kwh - new_soc) / DEFAULT_CHARGE_EFFICIENCY
        if DEFAULT_CHARGE_EFFICIENCY > 0
        else 0.0
    )
    charge_from_solar = min(solar_surplus, max(0.0, max_storable_input))
    new_soc = min(inputs.max_capacity_kwh, new_soc + (charge_from_solar * DEFAULT_CHARGE_EFFICIENCY))
    grid_export = max(0.0, solar_surplus - charge_from_solar)

    if mode == CBBMode.HOME_UPS.value:
        max_storable_input = (
            (inputs.max_capacity_kwh - new_soc) / DEFAULT_CHARGE_EFFICIENCY
            if DEFAULT_CHARGE_EFFICIENCY > 0
            else 0.0
        )
        grid_charge_input = min(
            inputs.charge_rate_per_interval,
            max(0.0, max_storable_input),
        )
        new_soc = min(inputs.max_capacity_kwh, new_soc + (grid_charge_input * DEFAULT_CHARGE_EFFICIENCY))
        grid_import = remaining_load + grid_charge_input
    else:
        available_storage = max(0.0, new_soc - inputs.hw_min_kwh)
        available_output = available_storage * DEFAULT_EFFICIENCY
        battery_to_load = min(remaining_load, available_output)

        if battery_to_load > 0.0 and DEFAULT_EFFICIENCY > 0:
            discharge_from_storage = battery_to_load / DEFAULT_EFFICIENCY
            new_soc = max(inputs.hw_min_kwh, new_soc - discharge_from_storage)

        grid_import = max(0.0, remaining_load - battery_to_load)

    return new_soc, grid_import, grid_export, grid_import * price


def _simulate_interval_array(
    soc: np.ndarray,
    solar: float,
    load: float,
    inputs: PlannerInputs,
    mode: int,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """``_simulate_interval`` over an array of SoC values.

    The optimizer steps every grid point of every slot, and ``_run_planner`` runs
    in the event loop: one call per point would hold it for hundreds of
    milliseconds on the box. Same operations in the same order; a test holds the
    two equal, so there is still only one battery model.
    """
    capacity = inputs.max_capacity_kwh
    solar_to_load = min(solar, load)
    remaining_load = max(0.0, load - solar_to_load)
    solar_surplus = max(0.0, solar - solar_to_load)

    max_storable_input = (capacity - soc) / DEFAULT_CHARGE_EFFICIENCY
    charge_from_solar = np.minimum(solar_surplus, np.maximum(0.0, max_storable_input))
    new_soc = np.minimum(capacity, soc + (charge_from_solar * DEFAULT_CHARGE_EFFICIENCY))
    grid_export = np.maximum(0.0, solar_surplus - charge_from_solar)

    if mode == _HOME_UPS:
        max_storable_input = (capacity - new_soc) / DEFAULT_CHARGE_EFFICIENCY
        grid_charge_input = np.minimum(
            inputs.charge_rate_per_interval, np.maximum(0.0, max_storable_input)
        )
        new_soc = np.minimum(capacity, new_soc + (grid_charge_input * DEFAULT_CHARGE_EFFICIENCY))
        grid_import = remaining_load + grid_charge_input
    else:
        available_output = np.maximum(0.0, new_soc - inputs.hw_min_kwh) * DEFAULT_EFFICIENCY
        battery_to_load = np.minimum(remaining_load, available_output)
        new_soc = np.where(
            battery_to_load > 0.0,
            np.maximum(inputs.hw_min_kwh, new_soc - battery_to_load / DEFAULT_EFFICIENCY),
            new_soc,
        )
        grid_import = np.maximum(0.0, remaining_load - battery_to_load)

    return new_soc, grid_import, grid_export


def simulate_home_i_detailed(inputs: PlannerInputs) -> List[SimulatedState]:
    states: List[SimulatedState] = []
    soc = max(inputs.hw_min_kwh, min(inputs.current_soc_kwh, inputs.max_capacity_kwh))

    for i in range(len(inputs.intervals)):
        solar = max(0.0, inputs.solar_forecast[i])
        load = max(0.0, inputs.load_forecast[i])
        price = max(0.0, inputs.prices[i])

        soc, grid_import, grid_export, cost = _simulate_interval(
            soc=soc,
            solar=solar,
            load=load,
            price=price,
            inputs=inputs,
            mode=CBBMode.HOME_I.value,
        )

        states.append(
            SimulatedState(
                interval_index=i,
                soc_kwh=soc,
                solar_kwh=solar,
                load_kwh=load,
                grid_import_kwh=grid_import,
                grid_export_kwh=grid_export,
                cost_czk=cost,
                mode=CBBMode.HOME_I.value,
            )
        )

    return states


def find_critical_moments(
    states: List[SimulatedState],
    inputs: PlannerInputs,
) -> List[CriticalMoment]:
    moments: List[CriticalMoment] = []

    for interval, state in enumerate(states):
        if state.soc_kwh < inputs.planning_min_kwh:
            deficit = inputs.planning_min_kwh - state.soc_kwh
            intervals_needed = ceil(deficit / inputs.charge_rate_per_interval)
            moments.append(
                CriticalMoment(
                    type="PLANNING_MIN",
                    interval=interval,
                    deficit_kwh=deficit,
                    intervals_needed=intervals_needed,
                    must_start_charging=max(0, interval - intervals_needed),
                    soc_kwh=state.soc_kwh,
                )
            )

    return moments


def _simulate_with_modes(modes: List[int], inputs: PlannerInputs) -> List[SimulatedState]:
    states: List[SimulatedState] = []
    soc = max(inputs.hw_min_kwh, min(inputs.current_soc_kwh, inputs.max_capacity_kwh))

    for i, mode in enumerate(modes):
        solar = max(0.0, inputs.solar_forecast[i])
        load = max(0.0, inputs.load_forecast[i])
        price = max(0.0, inputs.prices[i])

        soc, grid_import, grid_export, cost = _simulate_interval(
            soc=soc,
            solar=solar,
            load=load,
            price=price,
            inputs=inputs,
            mode=mode,
        )

        states.append(
            SimulatedState(
                interval_index=i,
                soc_kwh=soc,
                solar_kwh=solar,
                load_kwh=load,
                grid_import_kwh=grid_import,
                grid_export_kwh=grid_export,
                cost_czk=cost,
                mode=mode,
            )
        )

    return states


def _stored_energy_value(inputs: PlannerInputs) -> float:
    """What one kWh still in the battery at the end of the horizon is worth (CZK).

    Without a value the cheapest way to finish is an empty battery, whatever the
    last slots cost. A stored kWh will later replace DEFAULT_EFFICIENCY kWh of
    purchase and wear the battery on its way out. The prices after the horizon
    are unknown, so the horizon's own median stands in for them: it does not
    swing with a single peak or a single cheap hour.
    """
    if not inputs.prices:
        return 0.0
    typical_price = float(np.median(np.maximum(inputs.prices, 0.0)))
    return max(0.0, DEFAULT_EFFICIENCY * typical_price - inputs.battery_wear_czk_per_kwh)


def _switch_cost(from_mode: Optional[int], to_mode: int, price: float) -> float:
    """Penalty for changing mode; a negative price is no reward for switching."""
    return _SWITCH_ENERGY_LOSS_KWH.get((from_mode, to_mode), 0.0) * max(0.0, price)


def _no_switch_cost(_from_mode: Optional[int], _to_mode: int, _price: float) -> float:
    return 0.0


def _slot_forecast(inputs: PlannerInputs, i: int) -> Tuple[float, float, float, float]:
    export_price = inputs.export_prices[i] if inputs.export_prices else 0.0
    return (
        max(0.0, inputs.solar_forecast[i]),
        max(0.0, inputs.load_forecast[i]),
        inputs.prices[i],
        export_price,
    )


def _slot_cost(
    soc: np.ndarray | float,
    new_soc: np.ndarray | float,
    grid_import: np.ndarray | float,
    grid_export: np.ndarray | float,
    price: float,
    export_price: float,
    wear: float,
) -> np.ndarray | float:
    """The objective of one slot: what it buys, less what it sells, plus the wear
    on what leaves the battery. Same formula for the grid and for the real SoC."""
    return (
        grid_import * price
        - grid_export * export_price
        + wear * np.maximum(0.0, soc - new_soc)
    )


def _soc_grid(inputs: PlannerInputs, floor_kwh: float) -> np.ndarray:
    """SoC levels the backward pass evaluates; the hard minimum is one of them."""
    span = inputs.max_capacity_kwh - inputs.hw_min_kwh
    count = max(2, ceil(span / _SOC_GRID_STEP_KWH) + 1)
    return np.union1d(
        np.linspace(inputs.hw_min_kwh, inputs.max_capacity_kwh, count), [floor_kwh]
    )


def _cost_to_go(
    inputs: PlannerInputs,
    grid: np.ndarray,
    floor_kwh: float,
    switch_cost: _SwitchCost,
) -> List[Tuple[np.ndarray, np.ndarray]]:
    """Backward pass: cheapest cost from each slot boundary to the end.

    One curve over the SoC grid per mode of the slot before the boundary, because
    that mode decides whether the next slot pays for a switch.
    """
    n = len(inputs.intervals)
    wear = inputs.battery_wear_czk_per_kwh
    end_of_horizon = -_stored_energy_value(inputs) * grid
    to_go: List[Tuple[np.ndarray, np.ndarray]] = [(end_of_horizon, end_of_horizon)] * (n + 1)

    for i in range(n - 1, -1, -1):
        solar, load, price, export_price = _slot_forecast(inputs, i)
        after_home, after_ups = to_go[i + 1]

        new_soc, grid_import, grid_export = _simulate_interval_array(
            grid, solar, load, inputs, _HOME_1
        )
        via_home = _slot_cost(
            grid, new_soc, grid_import, grid_export, price, export_price, wear
        ) + np.interp(new_soc, grid, after_home)
        # Home 1 may not end a slot below the hard minimum, not even on its way
        # back up: a battery that lingers down there hands control to the box.
        # UPS never lowers the SoC, so a legal action always exists.
        via_home[new_soc < floor_kwh - _ENERGY_EPS_KWH] = np.inf

        new_soc, grid_import, grid_export = _simulate_interval_array(
            grid, solar, load, inputs, _HOME_UPS
        )
        via_ups = _slot_cost(
            grid, new_soc, grid_import, grid_export, price, export_price, wear
        ) + np.interp(new_soc, grid, after_ups)

        to_go[i] = (
            np.minimum(via_home, via_ups + switch_cost(_HOME_1, _HOME_UPS, price)),
            np.minimum(via_home + switch_cost(_HOME_UPS, _HOME_1, price), via_ups),
        )

    return to_go


@dataclass
class _PlannedSlot:
    """One slot of an optimized plan and what the optimizer knew when choosing it."""

    mode: int
    soc_before_kwh: float
    soc_after_kwh: float
    grid_charge_kwh: float
    discharge_kwh: float
    # What the horizon would cost on top if this slot ran Home 1 instead. None
    # when Home 1 would break the hard minimum here.
    home1_extra_cost_czk: Optional[float]


def _optimize_modes(
    inputs: PlannerInputs,
    floor_kwh: float,
    switch_cost: _SwitchCost = _switch_cost,
) -> List[_PlannedSlot]:
    """Cheapest Home 1 / Home UPS sequence over the horizon for this forecast.

    Dynamic programming over the SoC: backward over a grid to learn what each
    level is worth, then forward from the real SoC with the real physics, so
    nothing but ``_simulate_interval`` decides where the battery ends up. The
    objective is what the slots cost (imports minus export earnings, plus wear on
    what leaves the battery, plus mode switches) less the value of the energy
    left at the end.
    """
    if inputs.charge_rate_per_interval <= 0.0:
        raise ValueError("Charge rate must be positive")
    # A single NaN would silently pick UPS for the whole horizon: every comparison
    # with it is false.
    if not np.isfinite(inputs.prices).all() or not np.isfinite(inputs.export_prices or 0.0).all():
        raise ValueError("Prices must be finite")

    grid = _soc_grid(inputs, floor_kwh)
    to_go = _cost_to_go(inputs, grid, floor_kwh, switch_cost)
    wear = inputs.battery_wear_czk_per_kwh
    soc = max(inputs.hw_min_kwh, min(inputs.current_soc_kwh, inputs.max_capacity_kwh))
    previous = inputs.current_mode
    slots: List[_PlannedSlot] = []

    for i in range(len(inputs.intervals)):
        solar, load, price, export_price = _slot_forecast(inputs, i)
        after_home, after_ups = to_go[i + 1]

        home_soc, home_import, home_export, _ = _simulate_interval(
            soc, solar, load, price, inputs, _HOME_1
        )
        via_home: Optional[float] = None
        if home_soc >= floor_kwh - _ENERGY_EPS_KWH:
            via_home = float(
                _slot_cost(soc, home_soc, home_import, home_export, price, export_price, wear)
                + np.interp(home_soc, grid, after_home)
            )

        ups_soc, ups_import, ups_export, _ = _simulate_interval(
            soc, solar, load, price, inputs, _HOME_UPS
        )
        via_ups = float(
            _slot_cost(soc, ups_soc, ups_import, ups_export, price, export_price, wear)
            + np.interp(ups_soc, grid, after_ups)
        )

        home_total = (
            None if via_home is None else via_home + switch_cost(previous, _HOME_1, price)
        )
        ups_total = via_ups + switch_cost(previous, _HOME_UPS, price)

        if home_total is not None and ups_total >= home_total - _COST_TIE_EPS_CZK:
            mode = _HOME_1
            new_soc = home_soc
        else:
            mode = _HOME_UPS
            new_soc = ups_soc

        slots.append(
            _PlannedSlot(
                mode=mode,
                soc_before_kwh=soc,
                soc_after_kwh=new_soc,
                grid_charge_kwh=(
                    max(0.0, ups_import - max(0.0, load - solar)) if mode == _HOME_UPS else 0.0
                ),
                discharge_kwh=max(0.0, soc - new_soc),
                home1_extra_cost_czk=(
                    None if home_total is None else home_total - ups_total
                ),
            )
        )
        soc = new_soc
        previous = mode

    return slots


def _ups_slots(slots: List[_PlannedSlot]) -> Set[int]:
    return {i for i, slot in enumerate(slots) if slot.mode == _HOME_UPS}


def _ups_slot_reason(
    index: int,
    slot: _PlannedSlot,
    without_floor: Set[int],
    without_switch_cost: Set[int],
    floor_kwh: float,
    lowest_later_soc: float,
) -> str:
    if slot.soc_before_kwh < floor_kwh - _ENERGY_EPS_KWH:
        return REASON_FLOOR_RECOVERY
    # Counterfactuals, not the slot's own figures: with flat prices a charge well
    # ahead of the low point exists only for the minimum, and with a real spread
    # a charge right next to the minimum may be worth buying anyway. The same for
    # switching: Home 1's cost in this slot already includes the way back to UPS,
    # so comparing the two modes here does not show what the switch decided.
    if index not in without_floor:
        return REASON_FLOOR_DEFENSE
    if index not in without_switch_cost:
        return REASON_SWITCH_NOT_WORTH_IT
    if slot.grid_charge_kwh <= _ENERGY_EPS_KWH:
        return REASON_HOLD_FOR_LATER
    # The battery never comes back down to what this slot added, so nothing in
    # the horizon uses it: only its value at the end pays for the purchase.
    if lowest_later_soc >= slot.soc_after_kwh - _ENERGY_EPS_KWH:
        return REASON_END_OF_HORIZON
    return REASON_PRICE_SPREAD


def _served_moment(
    reason: str,
    block: List[int],
    slots: List[_PlannedSlot],
    inputs: PlannerInputs,
    baseline_moments: List[CriticalMoment],
) -> CriticalMoment:
    """The interval a UPS block is there for."""
    first, last = block[0], block[-1]
    interval = len(slots) - 1
    moment_type = "HORIZON_END"
    deficit = 0.0
    price: Optional[float] = None

    if reason in _FLOOR_REASONS:
        breach = next((m for m in baseline_moments if m.interval >= first), None)
        moment_type = "PLANNING_MIN"
        interval = breach.interval if breach else first
        deficit = breach.deficit_kwh if breach else 0.0
    elif reason != REASON_END_OF_HORIZON:
        later_discharges = [
            i for i in range(last + 1, len(slots)) if slots[i].discharge_kwh > _ENERGY_EPS_KWH
        ]
        if later_discharges:
            interval = max(later_discharges, key=lambda i: inputs.prices[i])
            moment_type = "EXPENSIVE_IMPORT"
            price = inputs.prices[interval]

    return CriticalMoment(
        type=moment_type,
        interval=interval,
        deficit_kwh=deficit,
        intervals_needed=len(block),
        must_start_charging=first,
        soc_kwh=slots[first].soc_before_kwh,
        price_czk=price,
    )


def _ups_decisions(
    slots: List[_PlannedSlot],
    inputs: PlannerInputs,
    baseline_moments: List[CriticalMoment],
    total_cost: float,
) -> List[Decision]:
    """One decision per run of neighbouring UPS slots that share a reason.

    Not one per slot: the trace is published as a sensor attribute, a plan can
    hold UPS for most of the horizon, and the recorder drops every attribute of
    a state above 16 KiB. ``charge_intervals`` still names each slot.
    """
    floor_kwh = inputs.planning_min_kwh
    without_floor = _ups_slots(_optimize_modes(inputs, inputs.hw_min_kwh))
    without_switch_cost = _ups_slots(
        _optimize_modes(inputs, floor_kwh, switch_cost=_no_switch_cost)
    )
    lowest_later_soc = [float("inf")] * len(slots)
    for i in range(len(slots) - 2, -1, -1):
        lowest_later_soc[i] = min(lowest_later_soc[i + 1], slots[i + 1].soc_after_kwh)

    blocks: List[Tuple[str, List[int]]] = []
    for i, slot in enumerate(slots):
        if slot.mode != _HOME_UPS:
            continue
        reason = _ups_slot_reason(
            i, slot, without_floor, without_switch_cost, floor_kwh, lowest_later_soc[i]
        )
        if blocks and blocks[-1][0] == reason and blocks[-1][1][-1] == i - 1:
            blocks[-1][1].append(i)
        else:
            blocks.append((reason, [i]))

    decisions: List[Decision] = []
    for reason, block in blocks:
        moment = _served_moment(reason, block, slots, inputs, baseline_moments)
        first_slot, last_slot = slots[block[0]], slots[block[-1]]
        extra_cost = first_slot.home1_extra_cost_czk
        decisions.append(
            Decision(
                moment=moment,
                strategy="CHARGE_CHEAPEST",
                cost=total_cost,
                charge_intervals=block,
                alternatives=[],
                reason=reason,
                evidence={
                    "slot_price_czk": round(
                        sum(inputs.prices[i] for i in block) / len(block), 3
                    ),
                    "served_price_czk": moment.price_czk,
                    "grid_charge_kwh": round(
                        sum(slots[i].grid_charge_kwh for i in block), 3
                    ),
                    "soc_start_kwh": round(first_slot.soc_before_kwh, 3),
                    "soc_end_kwh": round(last_slot.soc_after_kwh, 3),
                    "home1_extra_cost_czk": (
                        None if extra_cost is None else round(extra_cost, 3)
                    ),
                },
            )
        )
    return decisions


def _trace_action(decision: Decision) -> str:
    if not decision.charge_intervals:
        return "defer"
    return "hold" if decision.evidence.get("grid_charge_kwh") == 0.0 else "charge"


def build_planner_decision_trace(
    decisions: List[Decision],
    inputs: PlannerInputs,
) -> List[dict[str, object]]:
    return [
        {
            "interval_idx": decision.moment.interval,
            "must_start_charging_idx": decision.moment.must_start_charging,
            "action": _trace_action(decision),
            "strategy": decision.strategy,
            "reason": decision.reason or decision.strategy.lower(),
            "deficit_kwh": round(decision.moment.deficit_kwh, 3),
            "planning_min_kwh": round(inputs.planning_min_kwh, 3),
            "charge_intervals": list(decision.charge_intervals),
            "alternatives": [
                {"strategy": name, "cost": cost}
                for name, cost in (decision.alternatives or [])
            ],
            **decision.evidence,
        }
        for decision in decisions
    ]


def plan_battery_schedule(inputs: PlannerInputs) -> PlannerResult:
    try:
        baseline_states = simulate_home_i_detailed(inputs)

        slots = _optimize_modes(inputs, inputs.planning_min_kwh)
        modes = [slot.mode for slot in slots]
        states = _simulate_with_modes(modes, inputs)

        safety_min_kwh = inputs.hw_min_kwh * 0.95
        for state in states:
            if state.soc_kwh < safety_min_kwh:
                raise ValueError(
                    f"Safety validation failed: interval={state.interval_index}, "
                    f"soc={state.soc_kwh:.3f}kWh, minimum={safety_min_kwh:.3f}kWh"
                )

        total_cost = sum(state.cost_czk for state in states)

        critical_moments = find_critical_moments(baseline_states, inputs)
        decisions = (
            _ups_decisions(slots, inputs, critical_moments, total_cost)
            if _HOME_UPS in modes
            else []
        )

        return PlannerResult(
            modes=modes,
            states=states,
            total_cost=total_cost,
            decisions=decisions,
        )

    except Exception as e:
        _LOGGER.error("[OIG_CLOUD_ERROR][component=planner][corr=na][run=na] " + "Economic planning failed: %s", e, exc_info=True)
        fallback_modes = [CBBMode.HOME_I.value] * len(inputs.intervals)

        fallback_states = _simulate_with_modes(fallback_modes, inputs)
        fallback_total_cost = sum(state.cost_czk for state in fallback_states)

        return PlannerResult(
            modes=fallback_modes,
            states=fallback_states,
            total_cost=fallback_total_cost,
            decisions=[],
        )
