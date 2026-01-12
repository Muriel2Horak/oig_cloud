"""Balancing executor - applies balancing plan to modes.

This module handles the application of balancing plans to the
timeline modes, ensuring proper charging and holding periods.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

from homeassistant.util import dt as dt_util

from ..types import CBB_MODE_HOME_UPS, INTERVAL_MINUTES

_LOGGER = logging.getLogger(__name__)


@dataclass
class BalancingResult:
    """Result of balancing execution."""

    modes: List[int]
    charging_intervals: List[int]
    holding_intervals: List[int]
    total_ups_added: int
    feasible: bool
    expected_charging_kwh: float
    required_charging_kwh: float
    warning: Optional[str] = None


@dataclass
class BalancingPlanData:
    """Parsed balancing plan data."""

    holding_start: datetime
    holding_end: datetime
    preferred_intervals: Set[datetime] = field(default_factory=set)
    reason: str = "unknown"
    mode: str = "opportunistic"
    target_soc_percent: float = 100.0

    @property
    def deadline(self) -> datetime:
        """Charging deadline is the same as holding start."""
        return self.holding_start


class BalancingExecutor:
    """Executes balancing plan by modifying modes list.

    Balancing has three phases:
    1. CHARGING: Before deadline, charge to 100%
    2. HOLDING: From holding_start to holding_end, maintain 100%
    3. NORMAL: After holding_end, return to normal optimization

    Example:
        executor = BalancingExecutor(
            max_capacity=15.36,
            charge_rate_kw=2.8,
            interval_minutes=15,
        )

        result = executor.apply_balancing(
            modes=[0, 0, 0, ...],  # Initial modes
            spot_prices=[...],
            current_battery=10.0,
            balancing_plan={
                "holding_start": "2025-12-09T21:00:00",
                "holding_end": "2025-12-10T00:00:00",
                "charging_intervals": [...],
            },
        )

        if result.feasible:
            modes = result.modes  # Use modified modes
        else:
            print(f"Warning: {result.warning}")
    """

    def __init__(
        self,
        max_capacity: float,
        charge_rate_kw: float = 2.8,
        efficiency: float = 0.95,
        interval_minutes: int = INTERVAL_MINUTES,
    ) -> None:
        """Initialize executor.

        Args:
            max_capacity: Maximum battery capacity (kWh)
            charge_rate_kw: AC charging rate (kW)
            efficiency: AC/DC charging efficiency
            interval_minutes: Interval length in minutes
        """
        self.max_capacity = max_capacity
        self.charge_rate_kw = charge_rate_kw
        self.efficiency = efficiency
        self.interval_minutes = interval_minutes

        # Derived values
        self.interval_hours = interval_minutes / 60.0
        self.max_charge_per_interval = charge_rate_kw * self.interval_hours * efficiency

    def parse_plan(
        self,
        plan: Dict[str, Any],
    ) -> Optional[BalancingPlanData]:
        """Parse raw balancing plan dict into data object.

        Args:
            plan: Raw balancing plan dict

        Returns:
            BalancingPlanData or None if parsing fails
        """
        try:
            holding_start = _parse_datetime(plan.get("holding_start"))
            holding_end = _parse_datetime(plan.get("holding_end"))
            if not holding_start or not holding_end:
                _LOGGER.warning("Balancing plan missing holding_start or holding_end")
                return None

            preferred = _parse_preferred_intervals(
                plan.get("charging_intervals", [])
            )

            return BalancingPlanData(
                holding_start=holding_start,
                holding_end=holding_end,
                preferred_intervals=preferred,
                reason=plan.get("reason", "unknown"),
                mode=plan.get("mode", "opportunistic"),
                target_soc_percent=plan.get("target_soc_percent", 100.0),
            )

        except (ValueError, TypeError, KeyError) as e:
            _LOGGER.error(f"Failed to parse balancing plan: {e}")
            return None

    def apply_balancing(
        self,
        modes: List[int],
        spot_prices: List[Dict[str, Any]],
        current_battery: float,
        balancing_plan: Dict[str, Any],
    ) -> BalancingResult:
        """Apply balancing plan to modes list.

        Args:
            modes: List of modes to modify (will be modified in place)
            spot_prices: List of spot price dicts with 'time' and 'price'
            current_battery: Current battery level (kWh)
            balancing_plan: Balancing plan dict

        Returns:
            BalancingResult with modified modes and metrics
        """
        plan = self.parse_plan(balancing_plan)

        if not plan:
            return BalancingResult(
                modes=modes,
                charging_intervals=[],
                holding_intervals=[],
                total_ups_added=0,
                feasible=True,
                expected_charging_kwh=0,
                required_charging_kwh=0,
                warning="Could not parse balancing plan",
            )

        n = len(modes)
        charging_indices: List[int] = []
        holding_indices: List[int] = []

        deadline_idx, holding_start_idx, holding_end_idx = _find_holding_indices(
            spot_prices, plan.holding_start, plan.holding_end, n
        )

        _LOGGER.info(
            "🔋 Balancing executor: deadline_idx=%s, holding=%s-%s",
            deadline_idx,
            holding_start_idx,
            holding_end_idx,
        )

        preferred_used = _apply_preferred_intervals(
            modes,
            spot_prices,
            plan.preferred_intervals,
            deadline_idx,
            charging_indices,
        )

        required_kwh = max(0, self.max_capacity - current_battery)
        remaining_kwh = _remaining_charge_kwh(
            required_kwh, preferred_used, self.max_charge_per_interval
        )

        if remaining_kwh > 0.1:
            _apply_cheapest_intervals(
                modes,
                spot_prices,
                deadline_idx,
                remaining_kwh,
                self.max_charge_per_interval,
                charging_indices,
            )

        _apply_holding_period(
            modes,
            holding_start_idx,
            holding_end_idx,
            n,
            holding_indices,
        )

        result = _build_balancing_result(
            modes=modes,
            charging_indices=charging_indices,
            holding_indices=holding_indices,
            max_charge_per_interval=self.max_charge_per_interval,
            required_kwh=required_kwh,
            preferred_used=preferred_used,
        )

        return result

    def get_balancing_indices(
        self,
        spot_prices: List[Dict[str, Any]],
        balancing_plan: Dict[str, Any],
    ) -> Tuple[Set[int], Set[int]]:
        """Get indices for balancing (charging + holding).

        Args:
            spot_prices: List of spot price dicts
            balancing_plan: Balancing plan dict

        Returns:
            Tuple of (charging_indices, holding_indices)
        """
        plan = self.parse_plan(balancing_plan)

        if not plan:
            return set(), set()

        charging = set()
        holding = set()

        for i, sp in enumerate(spot_prices):
            try:
                ts = datetime.fromisoformat(sp["time"])
                if ts.tzinfo is None:
                    ts = dt_util.as_local(ts)
                ts_end = ts + timedelta(minutes=self.interval_minutes)

                # Charging: before deadline
                if ts < plan.deadline:
                    charging.add(i)

                # Holding: overlaps holding period
                if ts < plan.holding_end and ts_end > plan.holding_start:
                    holding.add(i)
            except (ValueError, TypeError):
                continue

        return charging, holding

    def estimate_balancing_cost(
        self,
        spot_prices: List[Dict[str, Any]],
        charging_indices: List[int],
        holding_indices: List[int],
        consumption_per_interval: float = 0.125,
    ) -> Tuple[float, float]:
        """Estimate cost of balancing.

        Args:
            spot_prices: List of spot price dicts
            charging_indices: Indices where charging happens
            holding_indices: Indices in holding period
            consumption_per_interval: Average consumption kWh

        Returns:
            Tuple of (charging_cost_czk, holding_cost_czk)
        """
        charging_cost = 0.0
        holding_cost = 0.0

        for idx in charging_indices:
            if idx < len(spot_prices):
                price = spot_prices[idx].get("price", 0)
                charging_cost += self.max_charge_per_interval * price

        for idx in holding_indices:
            if idx < len(spot_prices):
                price = spot_prices[idx].get("price", 0)
                # During holding, consumption comes from grid
                holding_cost += consumption_per_interval * price

        return round(charging_cost, 2), round(holding_cost, 2)


def _parse_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, str):
        dt_val = datetime.fromisoformat(value)
    else:
        dt_val = value
    if not isinstance(dt_val, datetime):
        return None
    if dt_val.tzinfo is None:
        dt_val = dt_util.as_local(dt_val)
    return dt_val


def _parse_preferred_intervals(
    intervals: List[Any],
) -> Set[datetime]:
    preferred: Set[datetime] = set()
    for iv in intervals:
        try:
            if isinstance(iv, str):
                ts = datetime.fromisoformat(iv)
            elif isinstance(iv, dict):
                ts = datetime.fromisoformat(iv.get("timestamp", ""))
            else:
                continue
            if ts.tzinfo is None:
                ts = dt_util.as_local(ts)
            preferred.add(ts)
        except (ValueError, TypeError):
            continue
    return preferred


def _find_holding_indices(
    spot_prices: List[Dict[str, Any]],
    holding_start: datetime,
    holding_end: datetime,
    n: int,
) -> tuple[int, int, int]:
    deadline_idx = n
    holding_start_idx = n
    holding_end_idx = n
    for i, sp in enumerate(spot_prices):
        try:
            ts = datetime.fromisoformat(sp["time"])
            if ts.tzinfo is None:
                ts = dt_util.as_local(ts)
            if ts >= holding_start and holding_start_idx == n:
                holding_start_idx = i
                deadline_idx = i
            if ts >= holding_end and holding_end_idx == n:
                holding_end_idx = i
                break
        except (ValueError, TypeError):
            continue
    return deadline_idx, holding_start_idx, holding_end_idx


def _apply_preferred_intervals(
    modes: List[int],
    spot_prices: List[Dict[str, Any]],
    preferred: Set[datetime],
    deadline_idx: int,
    charging_indices: List[int],
) -> int:
    preferred_used = 0
    for i, sp in enumerate(spot_prices):
        if i >= deadline_idx:
            break
        ts = _safe_timestamp(sp.get("time"))
        if not ts:
            continue
        if ts in preferred:
            modes[i] = CBB_MODE_HOME_UPS
            charging_indices.append(i)
            preferred_used += 1
    return preferred_used


def _safe_timestamp(value: Any) -> Optional[datetime]:
    try:
        if not value:
            return None
        ts = datetime.fromisoformat(value)
        if ts.tzinfo is None:
            ts = dt_util.as_local(ts)
        return ts
    except (ValueError, TypeError):
        return None


def _remaining_charge_kwh(
    required_kwh: float, preferred_used: int, max_charge_per_interval: float
) -> float:
    charging_from_preferred = preferred_used * max_charge_per_interval
    return required_kwh - charging_from_preferred


def _apply_cheapest_intervals(
    modes: List[int],
    spot_prices: List[Dict[str, Any]],
    deadline_idx: int,
    remaining_kwh: float,
    max_charge_per_interval: float,
    charging_indices: List[int],
) -> None:
    candidates = _collect_cheapest_candidates(modes, spot_prices, deadline_idx)
    candidates.sort(key=lambda x: x["price"])
    intervals_needed = int(remaining_kwh / max_charge_per_interval) + 1
    for cand in candidates[:intervals_needed]:
        idx = cand["index"]
        modes[idx] = CBB_MODE_HOME_UPS
        charging_indices.append(idx)


def _collect_cheapest_candidates(
    modes: List[int], spot_prices: List[Dict[str, Any]], deadline_idx: int
) -> List[Dict[str, Any]]:
    candidates = []
    for i in range(deadline_idx):
        if modes[i] == CBB_MODE_HOME_UPS:
            continue
        candidates.append({"index": i, "price": spot_prices[i].get("price", 0)})
    return candidates


def _apply_holding_period(
    modes: List[int],
    holding_start_idx: int,
    holding_end_idx: int,
    n: int,
    holding_indices: List[int],
) -> None:
    for i in range(holding_start_idx, min(holding_end_idx, n)):
        modes[i] = CBB_MODE_HOME_UPS
        holding_indices.append(i)


def _build_balancing_result(
    *,
    modes: List[int],
    charging_indices: List[int],
    holding_indices: List[int],
    max_charge_per_interval: float,
    required_kwh: float,
    preferred_used: int,
) -> BalancingResult:
    total_charging_intervals = len(set(charging_indices))
    expected_kwh = total_charging_intervals * max_charge_per_interval
    feasible = expected_kwh >= required_kwh * 0.95
    warning = None
    if not feasible:
        warning = (
            f"May not reach 100% by deadline! "
            f"Can charge {expected_kwh:.1f} kWh, need {required_kwh:.1f} kWh"
        )
        _LOGGER.warning("⚠️ BALANCING WARNING: %s", warning)

    total_ups = len(set(charging_indices + holding_indices))
    _LOGGER.info(
        "⚡ BALANCING applied: preferred=%s, additional=%s, holding=%s, total_UPS=%s",
        preferred_used,
        len(charging_indices) - preferred_used,
        len(holding_indices),
        total_ups,
    )

    return BalancingResult(
        modes=modes,
        charging_intervals=sorted(set(charging_indices)),
        holding_intervals=sorted(set(holding_indices)),
        total_ups_added=total_ups,
        feasible=feasible,
        expected_charging_kwh=expected_kwh,
        required_charging_kwh=required_kwh,
        warning=warning,
    )
