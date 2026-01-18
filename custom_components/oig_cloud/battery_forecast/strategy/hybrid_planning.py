"""Hybrid strategy planning helpers."""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple

from ..config import NegativePriceStrategy
from ..types import CBB_MODE_HOME_I, CBB_MODE_HOME_UPS
from .balancing import StrategyBalancingPlan

_LOGGER = logging.getLogger(__name__)


def plan_charging_intervals(
    strategy,
    *,
    initial_battery_kwh: float,
    prices: List[float],
    solar_forecast: List[float],
    consumption_forecast: List[float],
    balancing_plan: Optional[StrategyBalancingPlan] = None,
    negative_price_intervals: Optional[List[int]] = None,
) -> Tuple[set[int], Optional[str], set[int]]:
    """Plan charging intervals with planning-min enforcement and price guard."""
    n = len(prices)
    charging_intervals: set[int] = set()
    price_band_intervals: set[int] = set()
    infeasible_reason: Optional[str] = None
    eps_kwh = 0.01
    recovery_mode = initial_battery_kwh < strategy._planning_min - eps_kwh
    blocked_indices = _build_blocked_indices(balancing_plan, n)
    _seed_charging_intervals(
        strategy,
        charging_intervals=charging_intervals,
        balancing_plan=balancing_plan,
        negative_price_intervals=negative_price_intervals,
        prices=prices,
        blocked_indices=blocked_indices,
        n=n,
    )
    add_ups_interval = _build_add_ups_interval(
        strategy,
        charging_intervals=charging_intervals,
        prices=prices,
        blocked_indices=blocked_indices,
        n=n,
    )

    recovery_index = 0
    if recovery_mode:
        recovery_index, infeasible_reason, recovered = _run_recovery(
            strategy,
            initial_battery_kwh=initial_battery_kwh,
            prices=prices,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            add_ups_interval=add_ups_interval,
            eps_kwh=eps_kwh,
        )
        if not recovered:
            return charging_intervals, infeasible_reason, price_band_intervals

    infeasible_reason = _apply_repair_and_target(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        charging_intervals=charging_intervals,
        blocked_indices=blocked_indices,
        prices=prices,
        recovery_index=recovery_index,
        add_ups_interval=add_ups_interval,
        infeasible_reason=infeasible_reason,
        n=n,
        eps_kwh=eps_kwh,
    )

    if _apply_cost_aware_override(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        charging_intervals=charging_intervals,
        blocked_indices=blocked_indices,
        prices=prices,
        add_ups_interval=add_ups_interval,
        n=n,
        eps_kwh=eps_kwh,
    ):
        infeasible_reason = None

    infeasible_reason = _finalize_infeasible_reason(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        charging_intervals=charging_intervals,
        recovery_index=recovery_index,
        eps_kwh=eps_kwh,
        infeasible_reason=infeasible_reason,
    )

    if not recovery_mode:
        price_band_intervals = _apply_price_band_extension(
            strategy,
            charging_intervals=charging_intervals,
            prices=prices,
            blocked_indices=blocked_indices,
        )

    return charging_intervals, infeasible_reason, price_band_intervals


def _build_add_ups_interval(
    strategy,
    *,
    charging_intervals: set[int],
    prices: List[float],
    blocked_indices: set[int],
    n: int,
):
    def add_ups_interval(idx: int, *, max_price: Optional[float] = None) -> None:
        if idx in blocked_indices:
            return
        price_cap = (
            max_price
            if max_price is not None
            else strategy.config.max_ups_price_czk
        )
        if prices[idx] > price_cap:
            return
        charging_intervals.add(idx)
        min_len = max(1, strategy.config.min_ups_duration_intervals)
        if min_len <= 1:
            return
        for offset in range(1, min_len):
            next_idx = idx + offset
            if next_idx >= n:
                break
            if next_idx in blocked_indices or next_idx in charging_intervals:
                continue
            if prices[next_idx] <= price_cap:
                charging_intervals.add(next_idx)

    return add_ups_interval


def _apply_repair_and_target(
    strategy,
    *,
    initial_battery_kwh: float,
    solar_forecast: List[float],
    consumption_forecast: List[float],
    charging_intervals: set[int],
    blocked_indices: set[int],
    prices: List[float],
    recovery_index: int,
    add_ups_interval,
    infeasible_reason: Optional[str],
    n: int,
    eps_kwh: float,
) -> Optional[str]:
    buffer = 0.5
    infeasible_reason = _repair_plan_before_min(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        charging_intervals=charging_intervals,
        blocked_indices=blocked_indices,
        prices=prices,
        recovery_index=recovery_index,
        buffer=buffer,
        add_ups_interval=add_ups_interval,
        infeasible_reason=infeasible_reason,
        n=n,
    )

    _reach_target_soc(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        charging_intervals=charging_intervals,
        blocked_indices=blocked_indices,
        prices=prices,
        add_ups_interval=add_ups_interval,
        eps_kwh=eps_kwh,
    )
    return infeasible_reason


def _build_blocked_indices(
    balancing_plan: Optional[StrategyBalancingPlan], n: int
) -> set[int]:
    if not balancing_plan or not balancing_plan.mode_overrides:
        return set()
    return {
        idx
        for idx, mode in balancing_plan.mode_overrides.items()
        if mode != CBB_MODE_HOME_UPS and 0 <= idx < n
    }


def _seed_charging_intervals(
    strategy,
    *,
    charging_intervals: set[int],
    balancing_plan: Optional[StrategyBalancingPlan],
    negative_price_intervals: Optional[List[int]],
    prices: List[float],
    blocked_indices: set[int],
    n: int,
) -> None:
    if balancing_plan:
        for idx in balancing_plan.charging_intervals:
            if 0 <= idx < n and idx not in blocked_indices:
                if prices[idx] > strategy.config.max_ups_price_czk:
                    continue
                charging_intervals.add(idx)

    if (
        negative_price_intervals
        and strategy.config.negative_price_strategy == NegativePriceStrategy.CHARGE_GRID
    ):
        for idx in negative_price_intervals:
            if 0 <= idx < n and idx not in blocked_indices:
                charging_intervals.add(idx)


def _run_recovery(
    strategy,
    *,
    initial_battery_kwh: float,
    prices: List[float],
    solar_forecast: List[float],
    consumption_forecast: List[float],
    add_ups_interval,
    eps_kwh: float,
) -> Tuple[int, Optional[str], bool]:
    recovery_index = 0
    infeasible_reason: Optional[str] = None
    soc = initial_battery_kwh
    n = len(prices)

    for i in range(n):
        if soc >= strategy._planning_min - eps_kwh:
            recovery_index = max(0, i - 1)
            break

        price = prices[i]
        if price > strategy.config.max_ups_price_czk and infeasible_reason is None:
            infeasible_reason = (
                "Battery below planning minimum at start; "
                f"interval {i} exceeds max_ups_price_czk={strategy.config.max_ups_price_czk}"
            )
        add_ups_interval(i)

        solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
        load = consumption_forecast[i] if i < len(consumption_forecast) else 0.125
        res = strategy.simulator.simulate(
            battery_start=soc,
            mode=CBB_MODE_HOME_UPS,
            solar_kwh=solar,
            load_kwh=load,
            force_charge=True,
        )
        soc = res.battery_end

    if recovery_index == 0 and soc >= strategy._planning_min - eps_kwh:
        recovery_index = n - 1

    if soc < strategy._planning_min - eps_kwh:
        if infeasible_reason is None:
            infeasible_reason = (
                "Battery below planning minimum at start and could not recover within planning horizon"
            )
        return recovery_index, infeasible_reason, False

    return recovery_index, infeasible_reason, True


def _repair_plan_before_min(
    strategy,
    *,
    initial_battery_kwh: float,
    solar_forecast: List[float],
    consumption_forecast: List[float],
    charging_intervals: set[int],
    blocked_indices: set[int],
    prices: List[float],
    recovery_index: int,
    buffer: float,
    add_ups_interval,
    infeasible_reason: Optional[str],
    n: int,
) -> Optional[str]:
    for _ in range(strategy.MAX_ITERATIONS):
        infeasible_reason, should_stop = _repair_iteration(
            strategy,
            initial_battery_kwh=initial_battery_kwh,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            charging_intervals=charging_intervals,
            blocked_indices=blocked_indices,
            prices=prices,
            recovery_index=recovery_index,
            buffer=buffer,
            add_ups_interval=add_ups_interval,
            infeasible_reason=infeasible_reason,
            n=n,
        )
        if should_stop:
            break

    return infeasible_reason


def _repair_iteration(
    strategy,
    *,
    initial_battery_kwh: float,
    solar_forecast: List[float],
    consumption_forecast: List[float],
    charging_intervals: set[int],
    blocked_indices: set[int],
    prices: List[float],
    recovery_index: int,
    buffer: float,
    add_ups_interval,
    infeasible_reason: Optional[str],
    n: int,
) -> tuple[Optional[str], bool]:
    battery_trajectory = simulate_trajectory(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        charging_intervals=charging_intervals,
    )

    violation_idx = _find_violation_idx(
        battery_trajectory,
        recovery_index=recovery_index,
        min_level=strategy._planning_min + buffer,
    )
    if violation_idx is None:
        return infeasible_reason, True

    candidate = _pick_repair_candidate(
        strategy,
        prices=prices,
        charging_intervals=charging_intervals,
        blocked_indices=blocked_indices,
        violation_idx=violation_idx,
    )
    if candidate is None:
        infeasible_reason = _mark_infeasible_before_violation(
            strategy,
            infeasible_reason=infeasible_reason,
            violation_idx=violation_idx,
            add_ups_interval=add_ups_interval,
            n=n,
        )
        return infeasible_reason, True

    add_ups_interval(candidate)
    return infeasible_reason, False


def _find_violation_idx(
    battery_trajectory: List[float],
    *,
    recovery_index: int,
    min_level: float,
) -> Optional[int]:
    for i in range(recovery_index + 1, len(battery_trajectory)):
        if battery_trajectory[i] < min_level:
            return i
    return None


def _mark_infeasible_before_violation(
    strategy,
    *,
    infeasible_reason: Optional[str],
    violation_idx: int,
    add_ups_interval,
    n: int,
) -> Optional[str]:
    if infeasible_reason is None:
        infeasible_reason = (
            f"No UPS interval <= max_ups_price_czk={strategy.config.max_ups_price_czk} "
            f"available before violation index {violation_idx}"
        )
    for idx in range(0, min(n, violation_idx + 1)):
        add_ups_interval(idx)
    return infeasible_reason


def _pick_repair_candidate(
    strategy,
    *,
    prices: List[float],
    charging_intervals: set[int],
    blocked_indices: set[int],
    violation_idx: int,
) -> Optional[int]:
    return _find_cheapest_candidate(
        prices=prices,
        charging_intervals=charging_intervals,
        blocked_indices=blocked_indices,
        max_price=strategy.config.max_ups_price_czk,
        limit=violation_idx + 1,
    )


def _reach_target_soc(
    strategy,
    *,
    initial_battery_kwh: float,
    solar_forecast: List[float],
    consumption_forecast: List[float],
    charging_intervals: set[int],
    blocked_indices: set[int],
    prices: List[float],
    add_ups_interval,
    eps_kwh: float,
) -> None:
    if strategy._target <= strategy._planning_min + eps_kwh:
        return

    for _ in range(strategy.MAX_ITERATIONS):
        battery_trajectory = simulate_trajectory(
            strategy,
            initial_battery_kwh=initial_battery_kwh,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            charging_intervals=charging_intervals,
        )
        max_soc = max(battery_trajectory) if battery_trajectory else initial_battery_kwh
        if max_soc >= strategy._target - eps_kwh:
            break

        candidate = _find_cheapest_candidate(
            prices=prices,
            charging_intervals=charging_intervals,
            blocked_indices=blocked_indices,
            max_price=strategy.config.max_ups_price_czk,
            limit=len(prices),
        )
        if candidate is None:
            break

        add_ups_interval(candidate)


def _finalize_infeasible_reason(
    strategy,
    *,
    initial_battery_kwh: float,
    solar_forecast: List[float],
    consumption_forecast: List[float],
    charging_intervals: set[int],
    recovery_index: int,
    eps_kwh: float,
    infeasible_reason: Optional[str],
) -> Optional[str]:
    final_trajectory = simulate_trajectory(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        charging_intervals=charging_intervals,
    )
    start_idx = recovery_index + 1 if recovery_index is not None else 0
    for i in range(start_idx, len(final_trajectory)):
        if final_trajectory[i] < strategy._planning_min - eps_kwh:
            if infeasible_reason is None:
                infeasible_reason = (
                    "Planner could not satisfy planning minimum "
                    f"(first violation at index {i})"
                )
            break
    return infeasible_reason


def _apply_price_band_extension(
    strategy,
    *,
    charging_intervals: set[int],
    prices: List[float],
    blocked_indices: set[int],
) -> set[int]:
    original_charging = set(charging_intervals)
    price_band_intervals = extend_ups_blocks_by_price_band(
        strategy,
        charging_intervals=original_charging,
        prices=prices,
        blocked_indices=blocked_indices,
    )
    if price_band_intervals:
        charging_intervals |= price_band_intervals
        _LOGGER.debug(
            "Price-band UPS extension added %d intervals (delta=%.1f%%)",
            len(price_band_intervals),
            get_price_band_delta_pct(strategy) * 100,
        )
    return price_band_intervals


def _find_cheapest_candidate(
    *,
    prices: List[float],
    charging_intervals: set[int],
    blocked_indices: set[int],
    max_price: float,
    limit: int,
) -> Optional[int]:
    candidate = None
    candidate_price = None
    for idx in range(0, min(len(prices), limit)):
        if idx in charging_intervals or idx in blocked_indices:
            continue
        price = prices[idx]
        if price > max_price:
            continue
        if candidate is None or price < candidate_price:
            candidate = idx
            candidate_price = price
    return candidate


def _apply_cost_aware_override(
    strategy,
    *,
    initial_battery_kwh: float,
    solar_forecast: List[float],
    consumption_forecast: List[float],
    charging_intervals: set[int],
    blocked_indices: set[int],
    prices: List[float],
    add_ups_interval,
    n: int,
    eps_kwh: float,
) -> bool:
    """Allow expensive UPS when it avoids even higher grid import costs."""
    round_trip_eff = _resolve_round_trip_efficiency(strategy)
    if round_trip_eff <= 0:
        return False

    override_applied = False
    for _ in range(strategy.MAX_ITERATIONS):
        trajectory, results = _simulate_with_results(
            strategy,
            initial_battery_kwh=initial_battery_kwh,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            charging_intervals=charging_intervals,
            n=n,
        )
        candidate, price_cap = _pick_cost_override_candidate(
            strategy,
            trajectory=trajectory,
            results=results,
            prices=prices,
            charging_intervals=charging_intervals,
            blocked_indices=blocked_indices,
            round_trip_eff=round_trip_eff,
            eps_kwh=eps_kwh,
        )
        if candidate is None or price_cap is None:
            break
        add_ups_interval(candidate, max_price=price_cap)
        override_applied = True

    return override_applied


def _pick_cost_override_candidate(
    strategy,
    *,
    trajectory: List[float],
    results: List,
    prices: List[float],
    charging_intervals: set[int],
    blocked_indices: set[int],
    round_trip_eff: float,
    eps_kwh: float,
) -> Tuple[Optional[int], Optional[float]]:
    max_price = strategy.config.max_ups_price_czk
    best_idx = None
    best_cap = None
    best_cost = None

    for idx, price in enumerate(prices):
        if idx >= len(results):
            break
        if results[idx].grid_import <= eps_kwh:
            continue
        if trajectory[idx] > strategy._planning_min + eps_kwh:
            continue
        price_cap = price * round_trip_eff
        if price_cap <= max_price + 0.001:
            continue
        cost = results[idx].grid_import * price
        if best_cost is None or cost > best_cost:
            best_cost = cost
            best_idx = idx
            best_cap = price_cap

    if best_idx is None or best_cap is None:
        return None, None

    candidate = _find_cheapest_candidate(
        prices=prices,
        charging_intervals=charging_intervals,
        blocked_indices=blocked_indices,
        max_price=best_cap,
        limit=best_idx,
    )
    if candidate is None:
        return None, None

    return candidate, best_cap


def _resolve_round_trip_efficiency(strategy) -> float:
    ac_dc = getattr(strategy.sim_config, "ac_dc_efficiency", None)
    dc_ac = getattr(strategy.sim_config, "dc_ac_efficiency", None)
    try:
        ac_dc_val = float(ac_dc)
        dc_ac_val = float(dc_ac)
    except (TypeError, ValueError):
        return 0.0
    if ac_dc_val <= 0 or dc_ac_val <= 0:
        return 0.0
    return ac_dc_val * dc_ac_val


def _simulate_with_results(
    strategy,
    *,
    initial_battery_kwh: float,
    solar_forecast: List[float],
    consumption_forecast: List[float],
    charging_intervals: set[int],
    n: int,
) -> Tuple[List[float], List]:
    battery = initial_battery_kwh
    trajectory: List[float] = []
    results: List = []

    for i in range(n):
        solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
        load = consumption_forecast[i] if i < len(consumption_forecast) else 0.125

        mode = CBB_MODE_HOME_UPS if i in charging_intervals else CBB_MODE_HOME_I
        force_charge = i in charging_intervals

        result = strategy.simulator.simulate(
            battery_start=battery,
            mode=mode,
            solar_kwh=solar,
            load_kwh=load,
            force_charge=force_charge,
        )
        battery = result.battery_end
        trajectory.append(battery)
        results.append(result)

    return trajectory, results


def get_price_band_delta_pct(strategy) -> float:
    """Compute price band delta from battery efficiency (min 8%)."""
    eff = getattr(strategy.sim_config, "ac_dc_efficiency", None)
    try:
        eff_val = float(eff)
    except (TypeError, ValueError):
        eff_val = 0.0

    if eff_val <= 0 or eff_val > 1.0:
        return strategy.MIN_UPS_PRICE_BAND_PCT

    derived = (1.0 / eff_val) - 1.0
    return max(strategy.MIN_UPS_PRICE_BAND_PCT, derived)


def extend_ups_blocks_by_price_band(
    strategy,
    *,
    charging_intervals: set[int],
    prices: List[float],
    blocked_indices: set[int],
) -> set[int]:
    """Extend UPS blocks forward when prices stay within efficiency-based band."""
    if not charging_intervals or not prices:
        return set()

    max_price = float(strategy.config.max_ups_price_czk)
    delta_pct = get_price_band_delta_pct(strategy)
    n = len(prices)

    ups_flags = [False] * n
    for idx in charging_intervals:
        if 0 <= idx < n:
            ups_flags[idx] = True

    lookahead = 4  # 1h window (4x 15min) to avoid holding through a price drop.
    can_extend = _build_can_extend(
        prices=prices,
        blocked_indices=blocked_indices,
        max_price=max_price,
        delta_pct=delta_pct,
        lookahead=lookahead,
        n=n,
    )

    extended: set[int] = set()

    _extend_forward(
        ups_flags,
        charging_intervals=charging_intervals,
        extended=extended,
        can_extend=can_extend,
    )
    _fill_single_gaps(
        ups_flags,
        charging_intervals=charging_intervals,
        extended=extended,
        can_extend=can_extend,
    )
    _extend_forward(
        ups_flags,
        charging_intervals=charging_intervals,
        extended=extended,
        can_extend=can_extend,
    )

    return extended


def _build_can_extend(
    *,
    prices: List[float],
    blocked_indices: set[int],
    max_price: float,
    delta_pct: float,
    lookahead: int,
    n: int,
):
    def _has_cheaper_ahead(current_idx: int) -> bool:
        current_price = prices[current_idx]
        limit = min(n, current_idx + lookahead + 1)
        for future_idx in range(current_idx + 1, limit):
            if prices[future_idx] < current_price * (1.0 - delta_pct):
                return True
        return False

    def _can_extend(prev_idx: int, idx: int) -> bool:
        if idx in blocked_indices:
            return False
        prev_price = prices[prev_idx]
        if prev_price > max_price:
            return False
        price = prices[idx]
        if price > max_price:
            return False
        if _has_cheaper_ahead(idx):
            return False
        return price <= prev_price * (1.0 + delta_pct)

    return _can_extend


def _extend_forward(
    ups_flags: list[bool],
    *,
    charging_intervals: set[int],
    extended: set[int],
    can_extend,
) -> None:
    for i in range(1, len(ups_flags)):
        if ups_flags[i - 1] and not ups_flags[i] and can_extend(i - 1, i):
            ups_flags[i] = True
            if i not in charging_intervals:
                extended.add(i)


def _fill_single_gaps(
    ups_flags: list[bool],
    *,
    charging_intervals: set[int],
    extended: set[int],
    can_extend,
) -> None:
    for i in range(1, len(ups_flags) - 1):
        if ups_flags[i - 1] and (not ups_flags[i]) and ups_flags[i + 1]:
            if can_extend(i - 1, i):
                ups_flags[i] = True
                if i not in charging_intervals:
                    extended.add(i)


def simulate_trajectory(
    strategy,
    *,
    initial_battery_kwh: float,
    solar_forecast: List[float],
    consumption_forecast: List[float],
    charging_intervals: set[int],
) -> List[float]:
    """Simulate battery trajectory with given charging plan."""
    n = len(solar_forecast)
    trajectory: List[float] = []
    battery = initial_battery_kwh

    for i in range(n):
        solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
        load = consumption_forecast[i] if i < len(consumption_forecast) else 0.125

        # Use HOME UPS if charging, otherwise HOME I.
        mode = CBB_MODE_HOME_UPS if i in charging_intervals else CBB_MODE_HOME_I
        force_charge = i in charging_intervals

        result = strategy.simulator.simulate(
            battery_start=battery,
            mode=mode,
            solar_kwh=solar,
            load_kwh=load,
            force_charge=force_charge,
        )

        battery = result.battery_end
        trajectory.append(battery)

    return trajectory
