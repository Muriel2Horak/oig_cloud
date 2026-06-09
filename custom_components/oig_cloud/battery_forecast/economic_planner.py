from __future__ import annotations

import logging
from math import ceil, isfinite
from typing import List, Tuple

from .economic_planner_types import (
    CriticalMoment,
    Decision,
    PlannerInputs,
    PlannerResult,
    SimulatedState,
)
from .types import CBBMode, DEFAULT_CHARGE_EFFICIENCY, DEFAULT_EFFICIENCY

_LOGGER = logging.getLogger(__name__)
_SOLAR_HEADROOM_EPS_KWH = 0.05
_PRICE_EPS_CZK = 1e-9


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

    threshold = _percentile_threshold(
        [max(0.0, p) for p in inputs.prices],
        inputs.expensive_percentile,
    )

    for interval, state in enumerate(states):
        price = max(0.0, inputs.prices[interval])
        if state.grid_import_kwh <= 0.0:
            continue
        if price + _PRICE_EPS_CZK < threshold:
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


def calculate_cost_use_battery(moment: CriticalMoment, inputs: PlannerInputs) -> float:
    if moment.interval >= len(inputs.intervals):
        return 0.0

    initial_soc = moment.soc_kwh
    if initial_soc is None:
        initial_soc = inputs.current_soc_kwh

    soc = max(inputs.hw_min_kwh, min(initial_soc, inputs.max_capacity_kwh))
    total_cost = 0.0

    for i in range(moment.interval, len(inputs.intervals)):
        solar = max(0.0, inputs.solar_forecast[i])
        load = max(0.0, inputs.load_forecast[i])
        price = max(0.0, inputs.prices[i])

        soc, _, _, cost = _simulate_interval(
            soc=soc,
            solar=solar,
            load=load,
            price=price,
            inputs=inputs,
            mode=CBBMode.HOME_I.value,
        )
        total_cost += cost

    return total_cost


def calculate_cost_wait_for_solar(moment: CriticalMoment, inputs: PlannerInputs) -> float:
    solar_start = None
    for i in range(moment.interval, len(inputs.intervals)):
        if inputs.solar_forecast[i] > inputs.load_forecast[i]:
            solar_start = i
            break

    if solar_start is None:
        return float("inf")

    initial_soc = moment.soc_kwh
    if initial_soc is None:
        initial_soc = inputs.current_soc_kwh

    soc = max(inputs.hw_min_kwh, min(initial_soc, inputs.max_capacity_kwh))
    total_cost = 0.0

    for i in range(moment.interval, solar_start):
        solar = max(0.0, inputs.solar_forecast[i])
        load = max(0.0, inputs.load_forecast[i])
        price = max(0.0, inputs.prices[i])

        soc, _, _, cost = _simulate_interval(
            soc=soc,
            solar=solar,
            load=load,
            price=price,
            inputs=inputs,
            mode=CBBMode.HOME_I.value,
        )
        total_cost += cost

    return total_cost


def calculate_cost_charge_cheapest(
    start_idx: int,
    end_idx: int,
    deficit: float,
    inputs: PlannerInputs,
) -> Tuple[float, List[int]]:
    if (
        deficit <= 0.0
        or start_idx >= end_idx
        or inputs.charge_rate_per_interval <= 0.0
        or DEFAULT_EFFICIENCY <= 0.0
    ):
        return 0.0, []

    bounded_start = max(0, start_idx)
    bounded_end = min(end_idx, len(inputs.intervals))
    if bounded_start >= bounded_end:
        return 0.0, []

    candidates = [(i, max(0.0, inputs.prices[i])) for i in range(bounded_start, bounded_end)]
    candidates.sort(key=lambda interval_price: interval_price[1])

    total_cost = 0.0
    remaining_deficit = max(0.0, deficit)
    charge_intervals: List[int] = []

    for interval_idx, price in candidates:
        if remaining_deficit <= 0.0:
            break

        required_input_energy = remaining_deficit / DEFAULT_EFFICIENCY
        charged_energy = min(inputs.charge_rate_per_interval, required_input_energy)
        effective_energy = charged_energy * DEFAULT_EFFICIENCY

        total_cost += charged_energy * price
        remaining_deficit = max(0.0, remaining_deficit - effective_energy)
        charge_intervals.append(interval_idx)

    return total_cost, charge_intervals


def make_economic_decisions(
    moments: List[CriticalMoment],
    inputs: PlannerInputs,
) -> List[Decision]:
    decisions: List[Decision] = []

    for moment in moments:
        cost_a = calculate_cost_use_battery(moment, inputs)
        cost_b, intervals_b = calculate_cost_charge_cheapest(
            moment.must_start_charging,
            moment.interval,
            moment.deficit_kwh,
            inputs,
        )
        cost_c = calculate_cost_wait_for_solar(moment, inputs)

        costs = [
            ("USE_BATTERY", cost_a, []),
            ("CHARGE_CHEAPEST", cost_b, intervals_b),
            ("WAIT_FOR_SOLAR", cost_c, []),
        ]

        viable_costs = [candidate for candidate in costs if isfinite(candidate[1])]

        if viable_costs:
            best = min(viable_costs, key=lambda candidate: candidate[1])
            decisions.append(
                Decision(
                    moment=moment,
                    strategy=best[0],
                    cost=best[1],
                    charge_intervals=best[2],
                    alternatives=[(name, cost) for name, cost, _ in costs],
                )
            )
            continue

        decisions.append(
            Decision(
                moment=moment,
                strategy="USE_BATTERY",
                cost=float("inf"),
                charge_intervals=[],
                alternatives=[(name, cost) for name, cost, _ in costs],
                reason="EMERGENCY_NO_FINITE_STRATEGY",
            )
        )

    return decisions


def _compute_soc_trajectory(modes: List[int], inputs: PlannerInputs) -> List[float]:
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


def _deficit_interval_prices(modes: List[int], inputs: PlannerInputs) -> List[float]:
    prices: List[float] = []
    soc = max(inputs.hw_min_kwh, min(inputs.current_soc_kwh, inputs.max_capacity_kwh))
    for i, mode in enumerate(modes):
        solar = max(0.0, inputs.solar_forecast[i])
        load = max(0.0, inputs.load_forecast[i])
        price = max(0.0, inputs.prices[i])
        soc, grid_import, _, _ = _simulate_interval(soc, solar, load, price, inputs, mode)
        if mode != CBBMode.HOME_UPS.value and grid_import > 0.0:
            prices.append(price)
    return prices


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
        states = _simulate_with_modes(modes, inputs)
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
        states = _simulate_with_modes(modes, inputs)
        moments = find_expensive_import_moments(states, inputs)
        if not moments:
            break
        total = sum(m.deficit_kwh for m in moments)

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

        # Place tentatively, then verify it actually reduced expensive imports.
        modes[candidate_idx] = CBBMode.HOME_UPS.value
        trial_states = _simulate_with_modes(modes, inputs)
        trial_total = sum(
            m.deficit_kwh for m in find_expensive_import_moments(trial_states, inputs)
        )

        if trial_total >= total - _SOLAR_HEADROOM_EPS_KWH:
            # No economic improvement (charge spilled or drained elsewhere) —
            # revert, block this candidate, and try the next-cheapest one.
            modes[candidate_idx] = CBBMode.HOME_I.value
            blocked.add(candidate_idx)
            continue

        added.append(candidate_idx)

    return sorted(added)


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


def generate_plan(decisions: List[Decision], inputs: PlannerInputs) -> PlannerResult:
    n = len(inputs.intervals)
    modes = [CBBMode.HOME_I.value] * n

    for decision in decisions:
        if decision.strategy != "CHARGE_CHEAPEST":
            continue
        for idx in decision.charge_intervals:
            if 0 <= idx < n:
                modes[idx] = CBBMode.HOME_UPS.value

    states = _simulate_with_modes(modes, inputs)

    safety_min_kwh = inputs.hw_min_kwh * 0.95
    for state in states:
        if state.soc_kwh < safety_min_kwh:
            raise ValueError(
                f"Safety validation failed: interval={state.interval_index}, "
                f"soc={state.soc_kwh:.3f}kWh, minimum={safety_min_kwh:.3f}kWh"
            )

    total_cost = sum(state.cost_czk for state in states)

    return PlannerResult(
        modes=modes,
        states=states,
        total_cost=total_cost,
        decisions=decisions,
    )


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

        ups_intervals = sorted(set(floor_intervals) | set(displacement_intervals))

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
