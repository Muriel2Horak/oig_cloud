"""Balancing Strategy - plans periodic battery balancing cycles.

Balancing ensures the battery reaches 100% SoC periodically for:
- Cell voltage calibration
- BMS SoC correction
- Long-term battery health

This strategy is called BEFORE HybridStrategy and provides constraints
that the hybrid optimizer must respect.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple

from ..config import BalancingConfig, SimulatorConfig
from ..types import SpotPrice

_LOGGER = logging.getLogger(__name__)


@dataclass
class ChargingWindow:
    """A time window suitable for charging."""

    start_idx: int  # Start interval index
    end_idx: int  # End interval index (exclusive)
    avg_price: float  # Average price in window
    min_price: float  # Minimum price in window
    total_capacity_kwh: float  # How much can be charged in this window
    timestamps: List[str] = field(default_factory=list)


@dataclass
class BalancingPlan:
    """Plan for a balancing cycle.

    Contains:
    - When to charge (charging windows)
    - When holding period starts/ends
    - Which intervals are affected
    """

    # Timing
    deadline: datetime  # When battery must be at 100%
    holding_start: datetime  # Start of holding period
    holding_end: datetime  # End of holding period

    # Intervals
    charging_intervals: Set[int] = field(default_factory=set)  # Indices to charge
    holding_intervals: Set[int] = field(default_factory=set)  # Indices in holding
    mode_overrides: Dict[int, int] = field(default_factory=dict)  # Interval -> CBB mode

    # Charging windows (for display/debugging)
    windows: List[ChargingWindow] = field(default_factory=list)

    # Estimated cost
    estimated_cost_czk: float = 0.0
    estimated_charge_kwh: float = 0.0

    # Status
    is_active: bool = False
    reason: str = "scheduled"  # scheduled, opportunistic, forced, emergency

    @property
    def all_affected_intervals(self) -> Set[int]:
        """All intervals affected by balancing."""
        return self.charging_intervals | self.holding_intervals


@dataclass
class BalancingResult:
    """Result of balancing strategy calculation."""

    # Plan (None if no balancing needed)
    plan: Optional[BalancingPlan]

    # Diagnostics
    days_since_last_balancing: int
    next_balancing_due: datetime
    current_soc_percent: float

    # Reason for decision
    should_balance: bool
    skip_reason: Optional[str] = None  # Why balancing was skipped


class BalancingStrategy:
    """Strategy for planning battery balancing cycles.

    This strategy determines:
    1. Whether balancing is needed
    2. When to schedule it (deadline)
    3. Which intervals to use for charging
    4. How long to hold at 100%

    Example:
        config = BalancingConfig(interval_days=7, holding_hours=3)
        strategy = BalancingStrategy(config, simulator_config)

        result = strategy.plan(
            current_battery_kwh=10.0,
            last_balancing=datetime(2024, 1, 1),
            spot_prices=[...],
            solar_forecast=[...],
            now=datetime.now(),
        )

        if result.plan:
            print(f"Charge at intervals: {result.plan.charging_intervals}")
    """

    def __init__(
        self,
        config: BalancingConfig,
        simulator_config: SimulatorConfig,
    ) -> None:
        """Initialize strategy.

        Args:
            config: Balancing configuration
            simulator_config: Simulator configuration (for battery params)
        """
        self.config = config
        self.sim_config = simulator_config

    def plan(
        self,
        current_battery_kwh: float,
        last_balancing: Optional[datetime],
        spot_prices: List[SpotPrice],
        solar_forecast: List[float],
        now: datetime,
        interval_timestamps: Optional[List[datetime]] = None,
    ) -> BalancingResult:
        """Plan balancing cycle.

        Args:
            current_battery_kwh: Current battery level
            last_balancing: When battery was last at 100%
            spot_prices: Spot prices for planning horizon
            solar_forecast: Solar forecast (kWh per interval)
            now: Current time
            interval_timestamps: Timestamps for each interval

        Returns:
            BalancingResult with plan if balancing is needed
        """
        if not self.config.enabled:
            return BalancingResult(
                plan=None,
                days_since_last_balancing=0,
                next_balancing_due=now + timedelta(days=365),
                current_soc_percent=self._kwh_to_percent(current_battery_kwh),
                should_balance=False,
                skip_reason="balancing_disabled",
            )

        # Calculate days since last balancing
        if last_balancing:
            days_since = (now - last_balancing).days
        else:
            days_since = self.config.force_after_days  # Assume overdue

        # Calculate next due date
        next_due = self._calculate_next_deadline(last_balancing, now)

        # Check if balancing is needed
        current_soc = self._kwh_to_percent(current_battery_kwh)
        should_balance, reason = self._should_balance(
            days_since, current_soc, next_due, now
        )

        if not should_balance:
            return BalancingResult(
                plan=None,
                days_since_last_balancing=days_since,
                next_balancing_due=next_due,
                current_soc_percent=current_soc,
                should_balance=False,
                skip_reason=reason,
            )

        # Create balancing plan
        plan = self._create_plan(
            current_battery_kwh=current_battery_kwh,
            spot_prices=spot_prices,
            solar_forecast=solar_forecast,
            deadline=next_due,
            now=now,
            interval_timestamps=interval_timestamps,
            reason=reason or "scheduled",
        )

        return BalancingResult(
            plan=plan,
            days_since_last_balancing=days_since,
            next_balancing_due=next_due,
            current_soc_percent=current_soc,
            should_balance=True,
        )

    def _should_balance(
        self,
        days_since: int,
        current_soc: float,
        next_due: datetime,
        now: datetime,
    ) -> Tuple[bool, Optional[str]]:
        """Determine if balancing should occur.

        Returns:
            Tuple of (should_balance, reason_or_skip_reason)
        """
        # Emergency: Force balancing if overdue
        if days_since >= self.config.force_after_days:
            return True, "emergency_overdue"

        # Skip if very high SoC
        if current_soc >= self.config.min_soc_for_skip_percent:
            return False, "soc_already_high"

        # Check if within planning window (24h before deadline)
        hours_to_deadline = (next_due - now).total_seconds() / 3600
        if hours_to_deadline <= 24 and hours_to_deadline > 0:
            return True, "scheduled"

        # Check if interval days have passed
        if days_since >= self.config.interval_days:
            return True, "interval_reached"

        return False, "not_due_yet"

    def _calculate_next_deadline(
        self,
        last_balancing: Optional[datetime],
        now: datetime,
    ) -> datetime:
        """Calculate next balancing deadline.

        Returns:
            datetime when battery should be at 100%
        """
        # Default: interval_days from last balancing at deadline_time
        if last_balancing:
            base_date = last_balancing.date() + timedelta(
                days=self.config.interval_days
            )
        else:
            # No history - plan for tomorrow
            base_date = now.date() + timedelta(days=1)

        deadline = datetime.combine(base_date, self.config.deadline_time)

        # If deadline is in the past, move to next occurrence
        while deadline <= now:
            deadline += timedelta(days=self.config.interval_days)

        return deadline

    def _create_plan(
        self,
        current_battery_kwh: float,
        spot_prices: List[SpotPrice],
        solar_forecast: List[float],
        deadline: datetime,
        now: datetime,
        interval_timestamps: Optional[List[datetime]],
        reason: str,
    ) -> BalancingPlan:
        """Create detailed balancing plan.

        Args:
            current_battery_kwh: Current battery
            spot_prices: Price data
            solar_forecast: Solar forecast
            deadline: When battery must be at 100%
            now: Current time
            interval_timestamps: Timestamps for intervals
            reason: Why balancing is happening

        Returns:
            BalancingPlan with charging and holding intervals
        """
        max_capacity = self.sim_config.max_capacity_kwh
        charge_needed = max_capacity - current_battery_kwh

        # Calculate holding period
        holding_start = deadline
        holding_end = deadline + timedelta(hours=self.config.holding_hours)

        # Find cheapest intervals for charging before deadline
        n_intervals = len(spot_prices)

        # Generate timestamps if not provided
        if interval_timestamps is None:
            interval_minutes = self.sim_config.interval_minutes
            interval_timestamps = [
                now + timedelta(minutes=i * interval_minutes)
                for i in range(n_intervals)
            ]

        # Find intervals before deadline
        deadline_idx = self._find_deadline_index(interval_timestamps, deadline)
        holding_end_idx = self._find_deadline_index(interval_timestamps, holding_end)

        # Find cheapest charging windows
        charging_intervals, windows, estimated_cost = self._find_charging_windows(
            spot_prices=spot_prices[:deadline_idx],
            solar_forecast=solar_forecast[:deadline_idx] if solar_forecast else [],
            charge_needed=charge_needed,
            max_idx=deadline_idx,
            interval_timestamps=interval_timestamps[:deadline_idx],
        )

        # Create holding interval set
        holding_intervals = set(range(deadline_idx, min(holding_end_idx, n_intervals)))

        return BalancingPlan(
            deadline=deadline,
            holding_start=holding_start,
            holding_end=holding_end,
            charging_intervals=charging_intervals,
            holding_intervals=holding_intervals,
            windows=windows,
            estimated_cost_czk=estimated_cost,
            estimated_charge_kwh=charge_needed,
            is_active=True,
            reason=reason,
        )

    def _find_deadline_index(
        self,
        timestamps: List[datetime],
        target: datetime,
    ) -> int:
        """Find index of first interval at or after target time."""
        for i, ts in enumerate(timestamps):
            if ts >= target:
                return i
        return len(timestamps)

    def _find_charging_windows(
        self,
        spot_prices: List[SpotPrice],
        solar_forecast: List[float],
        charge_needed: float,
        max_idx: int,
        interval_timestamps: List[datetime],
    ) -> Tuple[Set[int], List[ChargingWindow], float]:
        """Find optimal charging windows.

        Prioritizes:
        1. Solar charging (free)
        2. Cheap grid charging (below threshold)

        Returns:
            Tuple of (charging_interval_indices, windows, estimated_cost)
        """
        _ = interval_timestamps
        charging_intervals: Set[int] = set()
        windows: List[ChargingWindow] = []
        total_cost = 0.0
        charge_per_interval = self.sim_config.max_charge_per_interval_kwh
        remaining_charge = charge_needed

        # Build price/solar list
        intervals_data: List[Tuple[int, float, float]] = []  # (idx, price, solar)
        for i in range(min(max_idx, len(spot_prices))):
            price = (
                spot_prices[i].get("price", 0.0)
                if isinstance(spot_prices[i], dict)
                else 0.0
            )
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            intervals_data.append((i, price, solar))

        # Sort by effective cost (solar reduces cost)
        # Effective cost = price - solar_value (assuming solar is free)
        intervals_data.sort(key=lambda x: x[1] - x[2] * 1000)  # Solar very valuable

        # Select cheapest intervals until we have enough charge
        for idx, price, solar in intervals_data:
            if remaining_charge <= 0:
                break

            # Skip if price too high (unless emergency)
            if price > self.config.max_charge_price_czk and solar < 0.5:
                continue

            charging_intervals.add(idx)
            charge_this_interval = min(charge_per_interval, remaining_charge)
            remaining_charge -= charge_this_interval

            # Cost is grid portion only (solar is free)
            grid_charge = max(
                0, charge_this_interval - solar * self.sim_config.dc_dc_efficiency
            )
            total_cost += grid_charge * price

        # If we still need more charge, take any remaining intervals
        if remaining_charge > 0:
            for idx, price, solar in intervals_data:
                if idx in charging_intervals:
                    continue
                if remaining_charge <= 0:
                    break

                charging_intervals.add(idx)
                charge_this_interval = min(charge_per_interval, remaining_charge)
                remaining_charge -= charge_this_interval
                total_cost += charge_this_interval * price

        return charging_intervals, windows, total_cost

    def _kwh_to_percent(self, kwh: float) -> float:
        """Convert kWh to percentage."""
        return (kwh / self.sim_config.max_capacity_kwh) * 100.0

    def is_in_holding_period(
        self,
        plan: BalancingPlan,
        interval_idx: int,
    ) -> bool:
        """Check if interval is in holding period."""
        return interval_idx in plan.holding_intervals

    def is_charging_interval(
        self,
        plan: BalancingPlan,
        interval_idx: int,
    ) -> bool:
        """Check if interval should charge for balancing."""
        return interval_idx in plan.charging_intervals
