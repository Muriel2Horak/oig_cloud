"""Hybrid strategy planning helpers."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, List, Optional, Tuple

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

    infeasible_reason = _apply_planning_min_repair(
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
    )

    target_price_cap = strategy.config.max_ups_price_czk
    target_kwh = strategy._target
    target_limit = None
    if balancing_plan and balancing_plan.is_active and balancing_plan.holding_intervals:
        target_price_cap = float("inf")
        target_kwh = strategy._max
        target_limit = min(balancing_plan.holding_intervals)
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
        max_price=target_price_cap,
        target_kwh=target_kwh,
        limit=target_limit,
    )

    if not recovery_mode:
        _apply_economic_charging(
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

        if _apply_hw_min_hold_limit(
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

    if not recovery_mode:
        price_band_intervals = _apply_price_band_extension(
            strategy,
            charging_intervals=charging_intervals,
            prices=prices,
            blocked_indices=blocked_indices,
        )

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
            max_price if max_price is not None else strategy.config.max_ups_price_czk
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


def _apply_planning_min_repair(
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
    return infeasible_reason


@dataclass(frozen=True)
class _ModeDecisionContext:
    strategy: Any
    charging_intervals: set[int]
    blocked_indices: set[int]
    prices: List[float]
    max_price: float
    solar_forecast: List[float]
    consumption_forecast: List[float]
    n: int
    eps_kwh: float
    round_trip_eff: float
    hysteresis: float
    add_ups_interval: Any


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


def _add_balancing_intervals(
    strategy,
    charging_intervals: set[int],
    balancing_plan: Optional[StrategyBalancingPlan],
    prices: List[float],
    blocked_indices: set[int],
    n: int,
) -> None:
    """Add charging intervals from balancing plan."""
    if not balancing_plan:
        return
    for idx in balancing_plan.charging_intervals:
        if 0 <= idx < n and idx not in blocked_indices:
            if prices[idx] <= strategy.config.max_ups_price_czk:
                charging_intervals.add(idx)


def _add_negative_price_intervals(
    strategy,
    charging_intervals: set[int],
    negative_price_intervals: Optional[List[int]],
    blocked_indices: set[int],
    n: int,
) -> None:
    """Add negative price charging intervals."""
    if not negative_price_intervals:
        return
    if strategy.config.negative_price_strategy != NegativePriceStrategy.CHARGE_GRID:
        return
    for idx in negative_price_intervals:
        if 0 <= idx < n and idx not in blocked_indices:
            charging_intervals.add(idx)


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
    _add_balancing_intervals(
        strategy, charging_intervals, balancing_plan, prices, blocked_indices, n
    )
    _add_negative_price_intervals(
        strategy, charging_intervals, negative_price_intervals, blocked_indices, n
    )


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
        add_ups_interval(i, max_price=float("inf"))

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
            infeasible_reason = "Battery below planning minimum at start and could not recover within planning horizon"
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
    max_price: Optional[float] = None,
    target_kwh: Optional[float] = None,
    limit: Optional[int] = None,
) -> None:
    target = target_kwh if target_kwh is not None else strategy._target
    if target <= strategy._planning_min + eps_kwh:
        return

    price_cap = (
        float(max_price) if max_price is not None else strategy.config.max_ups_price_czk
    )

    limit_idx = len(prices) if limit is None else max(0, min(len(prices), limit))

    for _ in range(strategy.MAX_ITERATIONS):
        battery_trajectory = simulate_trajectory(
            strategy,
            initial_battery_kwh=initial_battery_kwh,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            charging_intervals=charging_intervals,
        )
        if limit_idx <= 0:
            return
        max_soc = (
            max(battery_trajectory[:limit_idx])
            if battery_trajectory
            else initial_battery_kwh
        )
        if max_soc >= target - eps_kwh:
            break

        candidate = _find_cheapest_candidate(
            prices=prices,
            charging_intervals=charging_intervals,
            blocked_indices=blocked_indices,
            max_price=price_cap,
            limit=limit_idx,
        )
        if candidate is None:
            break

        add_ups_interval(candidate, max_price=price_cap)


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


def _determine_mode_for_interval(
    idx: int,
    battery: float,
    ctx: _ModeDecisionContext,
) -> str:
    """Determine charging mode for a specific interval."""
    if idx in ctx.blocked_indices:
        return CBB_MODE_HOME_I
    if idx in ctx.charging_intervals:
        return CBB_MODE_HOME_UPS

    price = ctx.prices[idx]
    if price > ctx.max_price + 0.0001:
        return CBB_MODE_HOME_I

    survival_end = _estimate_survival_end(
        ctx.strategy,
        start_idx=idx,
        battery_start=battery,
        solar_forecast=ctx.solar_forecast,
        consumption_forecast=ctx.consumption_forecast,
        min_level=ctx.strategy._planning_min,
        n=ctx.n,
        eps_kwh=ctx.eps_kwh,
    )
    min_future = _find_min_future_price(
        ctx.prices,
        start=idx + 1,
        end=survival_end,
        max_price=ctx.max_price,
        blocked_indices=ctx.blocked_indices,
    )
    if _should_charge_now(
        price,
        min_future_price=min_future,
        round_trip_eff=ctx.round_trip_eff,
        hysteresis=ctx.hysteresis,
    ):
        ctx.add_ups_interval(idx)
        return CBB_MODE_HOME_UPS
    return CBB_MODE_HOME_I


def _apply_economic_charging(
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
) -> None:
    round_trip_eff = _resolve_round_trip_efficiency(strategy)
    if round_trip_eff <= 0:
        return

    hysteresis = float(getattr(strategy.config, "price_hysteresis_czk", 0.0))
    max_price = strategy.config.max_ups_price_czk
    battery = initial_battery_kwh

    ctx = _ModeDecisionContext(
        strategy=strategy,
        charging_intervals=charging_intervals,
        blocked_indices=blocked_indices,
        prices=prices,
        max_price=max_price,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        n=n,
        eps_kwh=eps_kwh,
        round_trip_eff=round_trip_eff,
        hysteresis=hysteresis,
        add_ups_interval=add_ups_interval,
    )

    for idx in range(n):
        mode = _determine_mode_for_interval(
            idx,
            battery,
            ctx,
        )

        solar = solar_forecast[idx] if idx < len(solar_forecast) else 0.0
        load = consumption_forecast[idx] if idx < len(consumption_forecast) else 0.125
        result = strategy.simulator.simulate(
            battery_start=battery,
            mode=mode,
            solar_kwh=solar,
            load_kwh=load,
            force_charge=(mode == CBB_MODE_HOME_UPS),
        )
        battery = result.battery_end


def _estimate_survival_end(
    strategy,
    *,
    start_idx: int,
    battery_start: float,
    solar_forecast: List[float],
    consumption_forecast: List[float],
    min_level: float,
    n: int,
    eps_kwh: float,
) -> int:
    battery = battery_start
    last_idx = start_idx
    for idx in range(start_idx, n):
        if battery <= min_level + eps_kwh and idx > start_idx:
            break
        solar = solar_forecast[idx] if idx < len(solar_forecast) else 0.0
        load = consumption_forecast[idx] if idx < len(consumption_forecast) else 0.125
        result = strategy.simulator.simulate(
            battery_start=battery,
            mode=CBB_MODE_HOME_I,
            solar_kwh=solar,
            load_kwh=load,
        )
        battery = result.battery_end
        last_idx = idx
    return last_idx


def _find_min_future_price(
    prices: List[float],
    *,
    start: int,
    end: int,
    max_price: float,
    blocked_indices: Optional[set[int]] = None,
) -> Optional[float]:
    if start >= len(prices) or end < start:
        return None
    limit = min(len(prices), end + 1)
    best: Optional[float] = None
    for idx in range(start, limit):
        if blocked_indices and idx in blocked_indices:
            continue
        price = prices[idx]
        if price > max_price:
            continue
        if best is None or price < best:
            best = price
    return best


def _should_charge_now(
    price_now: float,
    *,
    min_future_price: Optional[float],
    round_trip_eff: float,
    hysteresis: float,
) -> bool:
    if min_future_price is None:
        return True
    effective_future = min_future_price / round_trip_eff
    return price_now <= effective_future - hysteresis


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
    hysteresis = float(getattr(strategy.config, "price_hysteresis_czk", 0.0))
    hw_min = getattr(strategy.sim_config, "min_capacity_kwh", 0.0)

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
            trajectory=trajectory,
            results=results,
            prices=prices,
            charging_intervals=charging_intervals,
            blocked_indices=blocked_indices,
            round_trip_eff=round_trip_eff,
            hysteresis=hysteresis,
            hw_min=hw_min,
            eps_kwh=eps_kwh,
        )
        if candidate is None or price_cap is None:
            break
        add_ups_interval(candidate, max_price=price_cap)
        override_applied = True

    return override_applied


def _pick_cost_override_candidate(
    *,
    trajectory: List[float],
    results: List,
    prices: List[float],
    charging_intervals: set[int],
    blocked_indices: set[int],
    round_trip_eff: float,
    hysteresis: float,
    hw_min: float,
    eps_kwh: float,
) -> Tuple[Optional[int], Optional[float]]:
    best_idx = None
    best_cap = None
    best_cost = None

    for idx, price in enumerate(prices):
        if idx >= len(results):
            break
        if results[idx].grid_import <= eps_kwh:
            continue
        if trajectory[idx] > hw_min + eps_kwh:
            continue
        price_cap = max(0.0, (price - hysteresis)) * round_trip_eff
        if price_cap <= 0.0:
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
    eff = getattr(strategy.config, "round_trip_efficiency", None)
    try:
        eff_val = float(eff)
    except (TypeError, ValueError):
        eff_val = 0.0
    if 0 < eff_val <= 1.0:
        return eff_val
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


def _apply_hw_min_hold_limit(
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
    max_hold_hours = float(getattr(strategy.config, "hw_min_hold_hours", 0.0))
    if max_hold_hours <= 0:
        return False
    max_hold_intervals = max(1, int(round(max_hold_hours * 4)))
    hw_min = getattr(strategy.sim_config, "min_capacity_kwh", 0.0)

    trajectory, _ = _simulate_with_results(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        charging_intervals=charging_intervals,
        n=n,
    )

    hold_start = None
    for idx, soc in enumerate(trajectory):
        at_min = soc <= hw_min + eps_kwh
        if at_min and hold_start is None:
            hold_start = idx
        if not at_min and hold_start is not None:
            if idx - hold_start >= max_hold_intervals:
                return _force_target_before_index(
                    strategy,
                    initial_battery_kwh=initial_battery_kwh,
                    solar_forecast=solar_forecast,
                    consumption_forecast=consumption_forecast,
                    charging_intervals=charging_intervals,
                    blocked_indices=blocked_indices,
                    prices=prices,
                    add_ups_interval=add_ups_interval,
                    limit=idx,
                    eps_kwh=eps_kwh,
                )
            hold_start = None

    if hold_start is not None and (len(trajectory) - hold_start) >= max_hold_intervals:
        return _force_target_before_index(
            strategy,
            initial_battery_kwh=initial_battery_kwh,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            charging_intervals=charging_intervals,
            blocked_indices=blocked_indices,
            prices=prices,
            add_ups_interval=add_ups_interval,
            limit=len(prices),
            eps_kwh=eps_kwh,
        )
    return False


def _force_target_before_index(
    strategy,
    *,
    initial_battery_kwh: float,
    solar_forecast: List[float],
    consumption_forecast: List[float],
    charging_intervals: set[int],
    blocked_indices: set[int],
    prices: List[float],
    add_ups_interval,
    limit: int,
    eps_kwh: float,
) -> bool:
    if strategy._target <= strategy._planning_min + eps_kwh:
        return False
    applied = False
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
            max_price=float("inf"),
            limit=limit,
        )
        if candidate is None:
            break
        add_ups_interval(candidate, max_price=float("inf"))
        applied = True
    return applied


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
    eff = getattr(strategy.config, "round_trip_efficiency", None)
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
