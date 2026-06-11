from __future__ import annotations

import logging
from math import ceil
from typing import List

from .economic_planner_types import (
    CriticalMoment,
    Decision,
    PlannerInputs,
    PlannerResult,
    SimulatedState,
)
from .planning.charging_plan_adjustments import (
    REASON_FLOOR_DWELL_GUARD,
    fix_floor_dwell_violations,
)
from .planning.charging_plan_utils import (
    BOX_FLOOR_DWELL_TRIGGER_MIN,
    BOX_FORCED_CHARGE_TARGET_PCT,
    FLOOR_DWELL_EPS_PCT,
    FLOOR_DWELL_HYSTERESIS_KWH,
)
from .types import CBBMode, DEFAULT_CHARGE_EFFICIENCY, DEFAULT_EFFICIENCY, INTERVAL_MINUTES

_LOGGER = logging.getLogger(__name__)
_SOLAR_HEADROOM_EPS_KWH = 0.05
_PRICE_EPS_CZK = 1e-9
# A displacement grid-charge is only kept if it lowers TOTAL plan cost by at
# least this much. Using real cost (not "expensive kWh") automatically accounts
# for round-trip losses, so pre-charging is rejected unless cheap/η < expensive
# actually pays off — no pointless charging on flat-price days.
_COST_IMPROVEMENT_EPS_CZK = 1e-4

# Number of consecutive 15-min intervals at the floor required to trigger the
# box's autonomous balancing charge (derived from BOX_FLOOR_DWELL_TRIGGER_MIN).
_FLOOR_DWELL_TRIGGER_INTERVALS: int = max(
    1, BOX_FLOOR_DWELL_TRIGGER_MIN // INTERVAL_MINUTES
)


def _floor_kwh_for_dwell(inputs: PlannerInputs) -> float:
    """Return the hw floor in kWh to use for dwell detection.

    Prefers the proxy sensor value (``proxy_bat_min_pct``) when available so
    that installs with the local proxy benefit from the measured value.  Falls
    back to ``hw_min_kwh`` (derived from the default 20 % assumption) for
    cloud-only installs.

    The planning layer is kept HA-agnostic: the proxy percent is injected as a
    plain float by the HA-side caller (``forecast_update._run_planner``).
    """
    if inputs.proxy_bat_min_pct is not None:
        try:
            pct = float(inputs.proxy_bat_min_pct)
            if 0.0 < pct < 100.0:
                return inputs.max_capacity_kwh * (pct / 100.0)
        except (TypeError, ValueError):
            pass
    return inputs.hw_min_kwh


class _DwellTracker:
    """O(1)-per-interval tracker for floor-dwell state.

    Counts consecutive intervals where the simulated SoC is at or below
    ``floor_kwh * (1 + FLOOR_DWELL_EPS_PCT)``.

    Cost model — amortised linear penalty:
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The box triggers forced balancing after BOX_FLOOR_DWELL_TRIGGER_MIN minutes
    at the floor and charges ~full at whatever the current price is.  The total
    forced energy is ``(max_capacity - floor_kwh) * BOX_FORCED_CHARGE_TARGET_PCT``.

    Instead of injecting that energy as a lump at the trigger interval (which
    creates a "cliff" that the greedy marginal optimizer cannot climb), we
    **amortise** the cost evenly across the trigger window: each interval the
    battery dwells at the floor adds ``total_forced_kwh / trigger_intervals``
    kWh of grid import cost at the current price.  When the trigger fires the
    accumulated SoC is topped up to the target.

    This gives the displacement optimizer a smooth per-interval gradient:
    each cheap-window UPS slot that pushes the floor-reach one interval later
    saves exactly one slot's worth of (expensive) dwell cost, making the
    cost improvement visible interval-by-interval.

    After triggering, the tracker resets so a subsequent dwell can fire again.
    """

    __slots__ = (
        "_floor_kwh", "_target_kwh", "_total_forced_kwh",
        "_kwh_per_dwell_interval", "_count", "_triggered",
    )

    def __init__(self, inputs: PlannerInputs) -> None:
        self._floor_kwh: float = _floor_kwh_for_dwell(inputs)
        self._target_kwh: float = inputs.max_capacity_kwh * BOX_FORCED_CHARGE_TARGET_PCT
        # Total forced energy when the box balances (target minus floor).
        self._total_forced_kwh: float = max(0.0, self._target_kwh - self._floor_kwh)
        # Amortised share per dwell interval so the optimizer has a smooth gradient.
        self._kwh_per_dwell_interval: float = (
            self._total_forced_kwh / _FLOOR_DWELL_TRIGGER_INTERVALS
            if _FLOOR_DWELL_TRIGGER_INTERVALS > 0
            else self._total_forced_kwh
        )
        self._count: int = 0
        self._triggered: bool = False

    def step(
        self,
        soc_after: float,
        price: float,
    ) -> tuple[float, float, float]:
        """Advance tracker by one interval.

        Returns (extra_grid_kwh, extra_cost_czk, new_soc_after) where:
          - extra_grid_kwh: forced grid energy counted this step (amortised
            share while dwelling; full balance on trigger)
          - extra_cost_czk: cost of that energy at *price*
          - new_soc_after: SoC *after* any forced charge (same when no trigger)

        During the dwell lead-up each interval contributes
        ``_kwh_per_dwell_interval`` of cost (amortised), without changing SoC
        yet.  At the trigger interval the battery SoC jumps to the target (the
        forced charge actually completes) and the tracker resets.
        """
        dwell_threshold = self._floor_kwh * (1.0 + FLOOR_DWELL_EPS_PCT)
        if soc_after > dwell_threshold:
            # Battery recovered; reset the dwell counter.
            self._count = 0
            self._triggered = False
            return 0.0, 0.0, soc_after

        if self._triggered:
            # Already fired; wait until SoC rises naturally (or next dwell).
            return 0.0, 0.0, soc_after

        self._count += 1

        if self._count < _FLOOR_DWELL_TRIGGER_INTERVALS:
            # Pre-trigger dwell: return 0 cost/energy; only the trigger
            # interval fires the forced charge.  Pre-trigger intervals must
            # NOT inject any phantom energy — doing so double-counts the cost
            # and violates the backward-compat requirement that plans which
            # never reach the trigger are byte-for-byte identical.
            return 0.0, 0.0, soc_after

        # Trigger interval: forced charge completes.  The box imports enough
        # AC energy to charge the battery from floor to target.
        # Use AC grid kWh (battery-delta / charge-efficiency) to match the
        # convention used everywhere else in _simulate_interval (HOME_UPS).
        battery_delta = max(0.0, self._target_kwh - soc_after)
        # AC grid import needed (inverse of charge efficiency).
        extra_grid_kwh = (
            battery_delta / DEFAULT_CHARGE_EFFICIENCY
            if DEFAULT_CHARGE_EFFICIENCY > 0
            else battery_delta
        )
        extra_cost_czk = extra_grid_kwh * price
        new_soc = min(self._target_kwh, soc_after + battery_delta)
        self._triggered = True
        self._count = 0  # reset so a future dwell can fire again
        return extra_grid_kwh, extra_cost_czk, new_soc


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


def simulate_home_i_detailed(inputs: PlannerInputs) -> List[SimulatedState]:
    states: List[SimulatedState] = []
    soc = max(inputs.hw_min_kwh, min(inputs.current_soc_kwh, inputs.max_capacity_kwh))
    dwell = _DwellTracker(inputs)

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

        # Floor-dwell injection: if the box would autonomously force-charge,
        # add the energy and cost to this interval's accounting.
        extra_grid_kwh, extra_cost, soc = dwell.step(soc, price)
        if extra_grid_kwh > 0.0:
            grid_import = grid_import + extra_grid_kwh
            cost = cost + extra_cost

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
                box_forced_balancing_kwh=extra_grid_kwh if extra_grid_kwh > 0.0 else None,
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


def _percentile_threshold(values: List[float], percentile: float) -> float:
    """Return the value at ``percentile`` (0..1) of ``values``.

    Uses a simple nearest-rank style threshold on the sorted prices so that the
    classifier is deterministic and dependency-free. With percentile ``P`` an
    interval is "expensive" when its price is >= this returned threshold.
    """
    if not values:
        return float("inf")
    clamped = min(1.0, max(0.0, percentile))
    ordered = sorted(values)
    # Nearest-rank index into the sorted list.
    rank = clamped * (len(ordered) - 1)
    lower = int(rank)
    upper = min(lower + 1, len(ordered) - 1)
    frac = rank - lower
    return ordered[lower] + (ordered[upper] - ordered[lower]) * frac


def find_expensive_import_moments(
    states: List[SimulatedState],
    inputs: PlannerInputs,
) -> List[CriticalMoment]:
    """Emit EXPENSIVE_IMPORT moments from a baseline (all-HOME_I) simulation.

    A moment is created for every baseline interval that imports from the grid
    (grid_import > 0) at a price >= the P-th percentile of the horizon prices.
    These are the periods the LOCKED design wants to displace by pre-charging
    the battery in cheaper, earlier windows.
    """
    moments: List[CriticalMoment] = []
    if not states:
        return moments

    prices = [max(0.0, p) for p in inputs.prices]
    days = inputs.interval_days
    if days and len(days) == len(prices):
        # Per-day percentile: judge each day's expensive intervals against that
        # day's own price distribution (a cheap day and an expensive day do not
        # blend into one threshold).
        by_day: dict[int, List[float]] = {}
        for idx, day in enumerate(days):
            by_day.setdefault(day, []).append(prices[idx])
        day_threshold = {
            day: _percentile_threshold(values, inputs.expensive_percentile)
            for day, values in by_day.items()
        }
        thresholds = [day_threshold[days[idx]] for idx in range(len(prices))]
    else:
        whole = _percentile_threshold(prices, inputs.expensive_percentile)
        thresholds = [whole] * len(prices)

    for interval, state in enumerate(states):
        price = prices[interval] if interval < len(prices) else 0.0
        if state.grid_import_kwh <= 0.0:
            continue
        if price + _PRICE_EPS_CZK < thresholds[interval]:
            continue

        # The "deficit" for an expensive import is the energy we would like the
        # battery to have supplied instead of the grid at this interval.
        deficit = state.grid_import_kwh
        intervals_needed = (
            ceil(deficit / inputs.charge_rate_per_interval)
            if inputs.charge_rate_per_interval > 0.0
            else 0
        )
        moments.append(
            CriticalMoment(
                type="EXPENSIVE_IMPORT",
                interval=interval,
                deficit_kwh=deficit,
                intervals_needed=intervals_needed,
                must_start_charging=max(0, interval - intervals_needed),
                soc_kwh=state.soc_kwh,
                price_czk=price,
            )
        )

    return moments


def _compute_soc_trajectory(modes: List[int], inputs: PlannerInputs) -> List[float]:
    """Compute SoC trajectory for headroom checks; no dwell injection.

    Used by the displacement optimizer to determine whether a candidate slot has
    sufficient headroom for a charge.  Dwell injection is omitted so that the
    optimizer's SoC estimates match the raw physics (consistent with
    ``_simulate_with_modes_raw``).
    """
    soc_trajectory: List[float] = []
    soc = max(inputs.hw_min_kwh, min(inputs.current_soc_kwh, inputs.max_capacity_kwh))

    for i, mode in enumerate(modes):
        soc_trajectory.append(soc)
        solar = max(0.0, inputs.solar_forecast[i])
        load = max(0.0, inputs.load_forecast[i])
        price = max(0.0, inputs.prices[i])
        soc, _, _, _ = _simulate_interval(soc, solar, load, price, inputs, mode)

    soc_trajectory.append(soc)
    return soc_trajectory


def _estimate_future_storable_surplus_kwh(
    inputs: PlannerInputs,
    *,
    start_idx: int,
    end_idx: int,
) -> float:
    surplus_kwh = 0.0
    bounded_end = min(end_idx, len(inputs.intervals))
    for idx in range(max(0, start_idx), bounded_end):
        solar = max(0.0, inputs.solar_forecast[idx])
        load = max(0.0, inputs.load_forecast[idx])
        surplus_kwh += max(0.0, solar - load) * DEFAULT_CHARGE_EFFICIENCY
    return surplus_kwh


def _pick_greedy_candidate_for_moment(
    *,
    moment: CriticalMoment,
    modes: List[int],
    inputs: PlannerInputs,
) -> int | None:
    candidate_range = range(0, min(moment.interval, len(inputs.intervals)))
    candidates = sorted(candidate_range, key=lambda idx: inputs.prices[idx])
    soc_traj = _compute_soc_trajectory(modes, inputs)
    min_useful_charge_kwh = inputs.charge_rate_per_interval * DEFAULT_CHARGE_EFFICIENCY * 0.1

    for candidate_idx in candidates:
        if modes[candidate_idx] == CBBMode.HOME_UPS.value:
            continue

        headroom_before_charge = inputs.max_capacity_kwh - soc_traj[candidate_idx]
        effective_charge_kwh = min(
            inputs.charge_rate_per_interval * DEFAULT_CHARGE_EFFICIENCY,
            max(0.0, headroom_before_charge),
        )
        if effective_charge_kwh < min_useful_charge_kwh:
            continue

        future_surplus_kwh = _estimate_future_storable_surplus_kwh(
            inputs,
            start_idx=candidate_idx + 1,
            end_idx=moment.interval,
        )
        remaining_headroom_after_charge = max(
            0.0,
            headroom_before_charge - effective_charge_kwh,
        )
        if future_surplus_kwh > remaining_headroom_after_charge + _SOLAR_HEADROOM_EPS_KWH:
            continue

        return candidate_idx

    return None


def _global_greedy_charge_intervals(inputs: PlannerInputs) -> List[int]:
    n = len(inputs.intervals)
    if n == 0 or inputs.charge_rate_per_interval <= 0.0:
        return []

    modes = [CBBMode.HOME_I.value] * n
    ups_intervals: List[int] = []

    for _ in range(n):
        # Use raw simulation (no dwell) for floor-defense so that the greedy
        # incremental algorithm can improve cost step by step.
        states = _simulate_with_modes_raw(modes, inputs)
        critical_moments = find_critical_moments(states, inputs)
        if not critical_moments:
            break

        worst_moment = max(
            critical_moments,
            key=lambda moment: (moment.deficit_kwh, moment.interval),
        )
        candidate_idx = _pick_greedy_candidate_for_moment(
            moment=worst_moment,
            modes=modes,
            inputs=inputs,
        )
        if candidate_idx is None:
            break

        modes[candidate_idx] = CBBMode.HOME_UPS.value
        ups_intervals.append(candidate_idx)

    return sorted(ups_intervals)


def _pick_displacement_candidate(
    *,
    moment: CriticalMoment,
    modes: List[int],
    inputs: PlannerInputs,
    soc_traj: List[float],
    blocked: set[int],
) -> int | None:
    """Pick an earlier interval to set HOME_UPS so it displaces ``moment``.

    Cheapest-first. Applies, in order:
      (a) economic η-gate for EXPENSIVE_IMPORT (cheap_price/η < expensive_price);
          PLANNING_MIN is a hard safety floor and skips the gate.
      (b) battery headroom (accounting for intervening solar via the PV-first
          surplus skip).
      (c) re-simulation persistence: charging must actually reach the target.
    """
    n = len(inputs.intervals)
    candidate_range = range(0, min(moment.interval, n))
    candidates = sorted(candidate_range, key=lambda idx: inputs.prices[idx])
    min_useful_charge_kwh = inputs.charge_rate_per_interval * DEFAULT_CHARGE_EFFICIENCY * 0.1

    apply_eta_gate = moment.type == "EXPENSIVE_IMPORT"
    expensive_price = moment.price_czk if moment.price_czk is not None else 0.0
    eta = inputs.round_trip_efficiency if inputs.round_trip_efficiency > 0.0 else 1.0

    for candidate_idx in candidates:
        if modes[candidate_idx] == CBBMode.HOME_UPS.value:
            continue
        if candidate_idx in blocked:
            continue

        cheap_price = max(0.0, inputs.prices[candidate_idx])

        # (a) Economic gate (EXPENSIVE_IMPORT only). Safety floor bypasses it.
        if apply_eta_gate:
            if cheap_price / eta >= expensive_price - _PRICE_EPS_CZK:
                # Cheapest-first ordering means no later candidate can pass either.
                return None

        # (b) Headroom + PV-first surplus skip (shared with the floor picker).
        headroom_before_charge = inputs.max_capacity_kwh - soc_traj[candidate_idx]
        effective_charge_kwh = min(
            inputs.charge_rate_per_interval * DEFAULT_CHARGE_EFFICIENCY,
            max(0.0, headroom_before_charge),
        )
        if effective_charge_kwh < min_useful_charge_kwh:
            continue

        future_surplus_kwh = _estimate_future_storable_surplus_kwh(
            inputs,
            start_idx=candidate_idx + 1,
            end_idx=moment.interval,
        )
        remaining_headroom_after_charge = max(
            0.0,
            headroom_before_charge - effective_charge_kwh,
        )
        if future_surplus_kwh > remaining_headroom_after_charge + _SOLAR_HEADROOM_EPS_KWH:
            continue

        return candidate_idx

    return None


def _displace_expensive_imports(
    modes: List[int],
    inputs: PlannerInputs,
) -> List[int]:
    """Core displacement loop (LOCKED step 2).

    For each expensive baseline import (most expensive first) try to pre-charge an
    earlier cheap window. After each successful HOME_UPS placement, re-simulate and
    recompute the remaining expensive imports, then repeat. Returns the list of
    newly added UPS interval indices.
    """
    n = len(inputs.intervals)
    if n == 0 or inputs.charge_rate_per_interval <= 0.0:
        return []

    added: List[int] = []
    blocked: set[int] = set()

    # Each iteration either places one UPS interval or blocks one non-improving
    # candidate, so it terminates in <= 2n iterations. Cost per iteration is a
    # constant number of O(n) simulations => O(n²) overall. Persistence ("does
    # the charge actually reduce an expensive import?") is verified cheaply here
    # by an improvement check instead of a per-candidate re-simulation.
    for _ in range(2 * n):
        # Use raw simulation (no dwell) so the greedy marginal algorithm can
        # find incremental improvements; dwell's lump-sum cost surface would
        # otherwise make single-slot additions appear non-improving.
        states = _simulate_with_modes_raw(modes, inputs)
        moments = find_expensive_import_moments(states, inputs)
        if not moments:
            break
        # Improvement is measured in real TOTAL COST, not "expensive kWh": a
        # pre-charge that merely shifts an import to a similarly priced earlier
        # slot does not lower cost (and round-trip losses make it worse), so it
        # must be rejected.
        total_cost = sum(state.cost_czk for state in states)

        # Most expensive first; tie-break on later interval (closer deadline).
        moments.sort(key=lambda m: (m.price_czk or 0.0, m.interval), reverse=True)

        # SoC trajectory under the current modes — shared by all candidates this
        # iteration (modes do not change until we place one).
        soc_traj = _compute_soc_trajectory(modes, inputs)

        candidate_idx: int | None = None
        for moment in moments:
            candidate_idx = _pick_displacement_candidate(
                moment=moment,
                modes=modes,
                inputs=inputs,
                soc_traj=soc_traj,
                blocked=blocked,
            )
            if candidate_idx is not None:
                break

        if candidate_idx is None:
            break

        # Place tentatively, then keep it only if TOTAL plan cost strictly drops.
        modes[candidate_idx] = CBBMode.HOME_UPS.value
        trial_states = _simulate_with_modes_raw(modes, inputs)
        trial_cost = sum(state.cost_czk for state in trial_states)

        if trial_cost >= total_cost - _COST_IMPROVEMENT_EPS_CZK:
            # Not cost-reducing (no real arbitrage / round-trip loss dominates) —
            # revert, block this candidate, and try the next-cheapest one.
            modes[candidate_idx] = CBBMode.HOME_I.value
            blocked.add(candidate_idx)
            continue

        added.append(candidate_idx)

    return sorted(added)


def _simulate_with_modes_raw(modes: List[int], inputs: PlannerInputs) -> List[SimulatedState]:
    """Simulate without floor-dwell injection.

    Used by the optimizer's internal candidate-evaluation loops (displacement,
    floor defense) where the dwell model's cliff-shaped cost surface would
    prevent the greedy marginal algorithm from finding incremental improvements.
    Preserves the existing O(n) per-pass performance contract.
    """
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


def _simulate_with_modes(modes: List[int], inputs: PlannerInputs) -> List[SimulatedState]:
    """Simulate with floor-dwell injection for final cost reporting.

    Used for the final plan cost calculation and the published
    ``PlannerResult.states`` so that plans which would cause the box to
    autonomously force-charge carry their realistic cost penalty.

    The optimizer's internal loops use ``_simulate_with_modes_raw`` instead
    to avoid the cliff-shaped cost surface introduced by the lump-sum dwell
    penalty, which the greedy marginal algorithm cannot climb.
    """
    states: List[SimulatedState] = []
    soc = max(inputs.hw_min_kwh, min(inputs.current_soc_kwh, inputs.max_capacity_kwh))
    dwell = _DwellTracker(inputs)

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

        # Floor-dwell injection: if the box would autonomously force-charge,
        # add the energy and cost to this interval's accounting.
        extra_grid_kwh, extra_cost, soc = dwell.step(soc, price)
        if extra_grid_kwh > 0.0:
            grid_import = grid_import + extra_grid_kwh
            cost = cost + extra_cost

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
                box_forced_balancing_kwh=extra_grid_kwh if extra_grid_kwh > 0.0 else None,
            )
        )

    return states


def build_planner_decision_trace(
    decisions: List[Decision],
    inputs: PlannerInputs,
) -> List[dict[str, object]]:
    trace: List[dict[str, object]] = []
    for decision in decisions:
        if (
            decision.strategy == "CHARGE_CHEAPEST"
            and decision.reason == "GLOBAL_GREEDY"
            and len(decision.charge_intervals) > 1
        ):
            for charge_interval in decision.charge_intervals:
                trace.append(
                    {
                        "interval_idx": decision.moment.interval,
                        "must_start_charging_idx": decision.moment.must_start_charging,
                        "action": "charge",
                        "strategy": decision.strategy,
                        "reason": decision.reason,
                        "deficit_kwh": round(decision.moment.deficit_kwh, 3),
                        "planning_min_kwh": round(inputs.planning_min_kwh, 3),
                        "charge_intervals": [charge_interval],
                        "alternatives": [
                            {"strategy": name, "cost": cost}
                            for name, cost in (decision.alternatives or [])
                        ],
                    }
                )
            continue

        trace.append(
            {
                "interval_idx": decision.moment.interval,
                "must_start_charging_idx": decision.moment.must_start_charging,
                "action": "charge" if decision.charge_intervals else "defer",
                "strategy": decision.strategy,
                "reason": decision.reason or decision.strategy.lower(),
                "deficit_kwh": round(decision.moment.deficit_kwh, 3),
                "planning_min_kwh": round(inputs.planning_min_kwh, 3),
                "charge_intervals": list(decision.charge_intervals),
                "alternatives": [
                    {"strategy": name, "cost": cost}
                    for name, cost in (decision.alternatives or [])
                ],
            }
        )
    return trace


def plan_battery_schedule(inputs: PlannerInputs) -> PlannerResult:
    try:
        baseline_states = simulate_home_i_detailed(inputs)

        n = len(inputs.intervals)
        modes = [CBBMode.HOME_I.value] * n

        # Step 3 (HARD safety floor, KEEP): defend planning_min by charging the
        # cheapest earlier windows WITHOUT the economic η-gate.
        floor_intervals = _global_greedy_charge_intervals(inputs)
        for idx in floor_intervals:
            if 0 <= idx < n:
                modes[idx] = CBBMode.HOME_UPS.value

        # Step 2 (CORE displacement): pre-charge cheap windows ahead of expensive
        # low-PV imports, applying the economic η-gate and PV-first guard. This
        # runs on top of the floor-defense modes and re-simulates internally.
        displacement_intervals = _displace_expensive_imports(modes, inputs)

        # Step 2b (FLOOR DWELL GUARD): After displacement, scan the plan for any
        # runs of intervals where the simulated SoC stays at or below the hw floor
        # long enough to trigger the box's autonomous forced-balancing (≥ trigger_min
        # minutes).  Insert a controlled pre-charge at the cheapest slot before the
        # dwell start so that the box never needs to fire uncontrolled.
        #
        # The guard uses the raw (no-dwell) simulation internally so it can iterate
        # cheaply.  The final dwell-aware simulation below still reflects the box's
        # true cost if any residual dwell remains after the guard loop exhausts.
        #
        # The max_price cap is set to the 95th-percentile of the price timeline so
        # the guard is willing to charge at any reasonable price to prevent the dwell
        # (cheaper alternatives have already been locked by displacement).
        prices_for_cap = [max(0.0, p) for p in inputs.prices]
        if prices_for_cap:
            sorted_prices = sorted(prices_for_cap)
            p95_idx = min(int(len(sorted_prices) * 0.95), len(sorted_prices) - 1)
            guard_max_price = sorted_prices[p95_idx]
        else:
            guard_max_price = float("inf")

        floor_kwh_for_guard = _floor_kwh_for_dwell(inputs)
        modes, dwell_guard_intervals = fix_floor_dwell_violations(
            modes=modes,
            inputs=inputs,
            simulate_fn=_simulate_with_modes_raw,
            home_ups_mode=CBBMode.HOME_UPS.value,
            floor_kwh=floor_kwh_for_guard,
            hysteresis_kwh=FLOOR_DWELL_HYSTERESIS_KWH,
            max_price=guard_max_price,
            interval_minutes=INTERVAL_MINUTES,
        )

        ups_intervals = sorted(set(floor_intervals) | set(displacement_intervals) | set(dwell_guard_intervals))

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
        expensive_moments = find_expensive_import_moments(baseline_states, inputs)
        decisions: List[Decision] = []
        if critical_moments:
            worst = max(critical_moments, key=lambda m: m.deficit_kwh)
            if ups_intervals:
                decisions.append(
                    Decision(
                        moment=worst,
                        strategy="CHARGE_CHEAPEST",
                        cost=total_cost,
                        charge_intervals=ups_intervals,
                        alternatives=[],
                        reason="GLOBAL_GREEDY",
                    )
                )
            else:
                decisions.append(
                    Decision(
                        moment=worst,
                        strategy="USE_BATTERY",
                        cost=total_cost,
                        charge_intervals=[],
                        alternatives=[],
                        reason="BATTERY_SUFFICIENT",
                    )
                )
        elif displacement_intervals and expensive_moments:
            # Displacement-only plan: no static-floor breach, but we pre-charged
            # cheap windows to displace expensive imports. Record it for the trace
            # without altering the stable PlannerResult contract.
            worst_expensive = max(
                expensive_moments, key=lambda m: (m.price_czk or 0.0, m.deficit_kwh)
            )
            decisions.append(
                Decision(
                    moment=worst_expensive,
                    strategy="CHARGE_CHEAPEST",
                    cost=total_cost,
                    charge_intervals=sorted(displacement_intervals),
                    alternatives=[],
                    reason="DISPLACE_EXPENSIVE_IMPORT",
                )
            )

        return PlannerResult(
            modes=modes,
            states=states,
            total_cost=total_cost,
            decisions=decisions,
            dwell_guard_intervals=dwell_guard_intervals,
        )

    except Exception as e:
        _LOGGER.error("[OIG_CLOUD_ERROR][component=planner][corr=na][run=na] " + "Economic planning failed: %s", e, exc_info=True)
        fallback_modes = [CBBMode.HOME_I.value] * len(inputs.intervals)

        # Use dwell-aware simulation for the fallback cost report so that the
        # reported cost reflects what the box will actually do.
        fallback_states = _simulate_with_modes(fallback_modes, inputs)
        fallback_total_cost = sum(state.cost_czk for state in fallback_states)

        return PlannerResult(
            modes=fallback_modes,
            states=fallback_states,
            total_cost=fallback_total_cost,
            decisions=[],
        )
