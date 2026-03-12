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


def _global_greedy_charge_intervals(inputs: PlannerInputs) -> List[int]:
    n = len(inputs.intervals)
    if n == 0 or inputs.charge_rate_per_interval <= 0.0:
        return []

    modes = [CBBMode.HOME_I.value] * n
    deficit_prices = _deficit_interval_prices(modes, inputs)

    if not deficit_prices:
        return []

    sorted_intervals = sorted(range(n), key=lambda i: inputs.prices[i])
    ups_intervals: List[int] = []
    min_useful_charge_kwh = inputs.charge_rate_per_interval * DEFAULT_CHARGE_EFFICIENCY * 0.1

    for candidate_idx in sorted_intervals:
        candidate_price = inputs.prices[candidate_idx]

        # Only charge when the round-trip cost is below the deficit price.
        # Accounts for charge and discharge efficiency losses so we never pre-charge
        # at a price where the round-trip loss makes it more expensive than direct import.
        min_dp = min(deficit_prices)
        max_dp = max(deficit_prices)
        round_trip_eff = DEFAULT_CHARGE_EFFICIENCY * DEFAULT_EFFICIENCY
        if min_dp < max_dp:
            price_ceiling = max_dp * round_trip_eff
        else:
            price_ceiling = max_dp * round_trip_eff if round_trip_eff < 1.0 else float("inf")

        if candidate_price >= price_ceiling:
            break

        soc_traj = _compute_soc_trajectory(modes, inputs)
        headroom = inputs.max_capacity_kwh - soc_traj[candidate_idx]

        if headroom < inputs.charge_rate_per_interval * DEFAULT_CHARGE_EFFICIENCY * 0.5:
            continue

        modes[candidate_idx] = CBBMode.HOME_UPS.value
        ups_intervals.append(candidate_idx)

        deficit_prices = _deficit_interval_prices(modes, inputs)
        if not deficit_prices:
            break

    soc_traj_final = _compute_soc_trajectory(modes, inputs)
    verified: List[int] = []
    for idx in ups_intervals:
        effective_charge = soc_traj_final[idx + 1] - soc_traj_final[idx]
        if effective_charge >= min_useful_charge_kwh:
            verified.append(idx)
        else:
            modes[idx] = CBBMode.HOME_I.value

    return verified


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


def plan_battery_schedule(inputs: PlannerInputs) -> PlannerResult:
    try:
        baseline_states = simulate_home_i_detailed(inputs)
        ups_intervals = _global_greedy_charge_intervals(inputs)

        n = len(inputs.intervals)
        modes = [CBBMode.HOME_I.value] * n

        for idx in ups_intervals:
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

        critical_moments = find_critical_moments(baseline_states, inputs)
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

        return PlannerResult(
            modes=modes,
            states=states,
            total_cost=total_cost,
            decisions=decisions,
        )

    except Exception as e:
        _LOGGER.error("Economic planning failed: %s", e, exc_info=True)
        fallback_modes = [CBBMode.HOME_I.value] * len(inputs.intervals)

        fallback_states = _simulate_with_modes(fallback_modes, inputs)
        fallback_total_cost = sum(state.cost_czk for state in fallback_states)

        return PlannerResult(
            modes=fallback_modes,
            states=fallback_states,
            total_cost=fallback_total_cost,
            decisions=[],
        )
