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
from .types import CBBMode, DEFAULT_CHARGE_EFFICIENCY, DEFAULT_EFFICIENCY

_LOGGER = logging.getLogger(__name__)
_SOLAR_HEADROOM_EPS_KWH = 0.05
_PRICE_EPS_CZK = 1e-9
# A displacement grid-charge is only kept if it lowers TOTAL plan cost by at
# least this much. Using real cost (not "expensive kWh") automatically accounts
# for round-trip losses, so pre-charging is rejected unless cheap/η < expensive
# actually pays off — no pointless charging on flat-price days.
_COST_IMPROVEMENT_EPS_CZK = 1e-4
# Comfort top-up charges ONLY in windows at or below this price percentile of the
# planning horizon ("the cheapest windows"). Above it the battery is allowed to
# keep descending toward the hard floor — comfort is never bought with expensive
# grid (that would re-create the over-charge problem). 0.30 = cheapest ~third.
_COMFORT_CHEAP_PERCENTILE = 0.30


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


def _comfort_charge_intervals(
    modes: List[int],
    inputs: PlannerInputs,
    comfort_kwh: float,
    cheap_threshold: float,
) -> List[int]:
    """Opportunistically top up toward the comfort SoC using ONLY cheap windows.

    Runs on top of the floor-defense + displacement modes. For each interval
    where the projected SoC would dip below ``comfort_kwh``, it places HOME_UPS in
    the cheapest earlier window whose price is at/below ``cheap_threshold`` and
    that has headroom. It NEVER charges from an expensive window: if no cheap
    window is available the battery is allowed to keep descending toward the hard
    floor (which the greedy defends at any price). This keeps a buffer above the
    BOX bat_min trigger cheaply, so the box never force-charges to ~80%.
    """
    n = len(inputs.intervals)
    if n == 0 or inputs.charge_rate_per_interval <= 0.0 or comfort_kwh <= 0.0:
        return []

    target = min(comfort_kwh, inputs.max_capacity_kwh)
    min_useful_charge_kwh = inputs.charge_rate_per_interval * DEFAULT_CHARGE_EFFICIENCY * 0.1
    added: List[int] = []

    for _ in range(2 * n):
        states = _simulate_with_modes(modes, inputs)
        # Earliest interval whose projected SoC dips below the comfort target.
        moment_idx: int | None = None
        for i, state in enumerate(states):
            if state.soc_kwh < target - _SOLAR_HEADROOM_EPS_KWH:
                moment_idx = i
                break
        if moment_idx is None:
            break

        soc_traj = _compute_soc_trajectory(modes, inputs)
        # Cheapest CHEAP window up to AND INCLUDING the dip interval (charging at
        # the dip itself lifts its end-of-interval SoC), so a battery that already
        # starts below comfort can still top up from the earliest cheap window.
        candidates = sorted(
            range(0, min(moment_idx + 1, n)), key=lambda idx: inputs.prices[idx]
        )
        # PV-first: if upcoming solar will lift the SoC back to the comfort target
        # on its own, this dip is transient — don't grid-charge for it (comfort is
        # a soft "descend & wait" target, the hard floor still protects). Avoids
        # buying grid for a morning dip that the day's solar refills anyway.
        deficit_kwh = target - states[moment_idx].soc_kwh
        future_solar_kwh = _estimate_future_storable_surplus_kwh(
            inputs, start_idx=moment_idx, end_idx=n
        )
        if future_solar_kwh >= deficit_kwh - _SOLAR_HEADROOM_EPS_KWH:
            break

        picked: int | None = None
        for candidate_idx in candidates:
            if modes[candidate_idx] == CBBMode.HOME_UPS.value:
                continue
            if inputs.prices[candidate_idx] > cheap_threshold + _PRICE_EPS_CZK:
                continue  # not cheap → don't force; let the battery descend
            # PV-first: never add grid in an interval where solar already produces
            # a net surplus — the battery is charging from the sun there for free.
            solar_c = (
                max(0.0, inputs.solar_forecast[candidate_idx])
                if candidate_idx < len(inputs.solar_forecast)
                else 0.0
            )
            load_c = (
                max(0.0, inputs.load_forecast[candidate_idx])
                if candidate_idx < len(inputs.load_forecast)
                else 0.0
            )
            if solar_c > load_c + _SOLAR_HEADROOM_EPS_KWH:
                continue
            headroom = inputs.max_capacity_kwh - soc_traj[candidate_idx]
            if min(inputs.charge_rate_per_interval * DEFAULT_CHARGE_EFFICIENCY, max(0.0, headroom)) < min_useful_charge_kwh:
                continue
            picked = candidate_idx
            break

        if picked is None:
            break  # no cheap window available — descend and wait

        modes[picked] = CBBMode.HOME_UPS.value
        added.append(picked)

    return sorted(added)


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
        trial_states = _simulate_with_modes(modes, inputs)
        trial_cost = sum(state.cost_czk for state in trial_states)

        if trial_cost >= total_cost - _COST_IMPROVEMENT_EPS_CZK:
            # Not cost-reducing (no real arbitrage / round-trip loss dominates) —
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

        # Step 4 (COMFORT buffer): keep the battery above a comfort SoC using ONLY
        # cheap windows, so it never dwells near the BOX bat_min trigger (which
        # would make the box force-charge to ~80% at any price). Cheap-only, so it
        # cannot re-create expensive over-charging; if no cheap window exists the
        # battery descends and only the hard floor (Step 3) is defended at any price.
        comfort_kwh = max(0.0, getattr(inputs, "comfort_soc_kwh", 0.0) or 0.0)
        comfort_intervals: List[int] = []
        if comfort_kwh > inputs.planning_min_kwh and inputs.prices:
            prices_nonneg = [max(0.0, p) for p in inputs.prices]
            cheap_threshold = _percentile_threshold(prices_nonneg, _COMFORT_CHEAP_PERCENTILE)
            mean_price = sum(prices_nonneg) / len(prices_nonneg)
            # Only top up for comfort when a genuinely cheap tier exists (spread).
            # On a flat/all-expensive day there is no cheap window → descend and
            # wait (the hard floor still protects against the box takeover).
            if cheap_threshold < mean_price - _PRICE_EPS_CZK:
                comfort_intervals = _comfort_charge_intervals(
                    modes, inputs, comfort_kwh, cheap_threshold
                )

        ups_intervals = sorted(
            set(floor_intervals) | set(displacement_intervals) | set(comfort_intervals)
        )

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
