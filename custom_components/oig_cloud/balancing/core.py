"""Balancing Manager - Pure Planning Layer (NO PHYSICS).

TODO 5: Implement Natural/Opportunistic/Forced balancing as mode planner.

This module is ONLY responsible for:
1. Detecting when balancing is needed (7-day cycle)
2. Finding suitable charging windows
3. Creating BalancingPlan with mode overrides

It does NOT:
- Simulate battery physics (that's in forecast._simulate_interval)
- Calculate costs (that's in HYBRID)
- Apply modes (that's in HYBRID reading this plan)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from ..const import HOME_UPS
from .plan import (
    BalancingPlan,
    BalancingInterval,
    create_natural_plan,
    create_opportunistic_plan,
    create_forced_plan,
)

_LOGGER = logging.getLogger(__name__)

# Constants per refactoring requirements
# These are now loaded from config_entry.options, keeping defaults here for reference:
# - balancing_holding_time: 3 hours (how long to hold at 100%)
# - balancing_cycle_days: 7 days (max days between forced balancing)
# - balancing_cooldown_hours: 24 hours (min time between opportunistic attempts)
# - balancing_soc_threshold: 80% (min SoC for opportunistic balancing)

MIN_MODE_DURATION = 4  # Minimum 4 intervals (1 hour) per mode


class BalancingManager:
    """Balancing manager - pure planning layer.

    Implements TODO 5: Natural/Opportunistic/Forced balancing logic.

    This is NOT a simulation engine - it only creates plans (mode schedules).
    Forecast applies these plans during HYBRID calculation.
    """

    def __init__(
        self,
        hass: HomeAssistant,
        box_id: str,
        storage_path: str,
        config_entry: Any,
    ):
        """Initialize balancing manager.

        Args:
            hass: Home Assistant instance
            box_id: Box ID for sensor access
            storage_path: Path for storing balancing state
            config_entry: Config entry for accessing balancing options
        """
        self.hass = hass
        self.box_id = box_id
        self._config_entry = config_entry
        self._logger = _LOGGER

        # Storage for balancing state
        self._store = Store(
            hass,
            version=1,
            key=f"oig_cloud_balancing_{box_id}",
            private=True,
        )

        # Current state
        self._last_balancing_ts: Optional[datetime] = None
        self._active_plan: Optional[BalancingPlan] = None
        self._forecast_sensor = None  # Reference to forecast sensor for timeline access

        # Cost tracking for frontend display
        self._last_immediate_cost: Optional[float] = None
        self._last_selected_cost: Optional[float] = None
        self._last_cost_savings: Optional[float] = None

    # Configuration parameter helpers
    def _get_holding_time_hours(self) -> int:
        """Get balancing holding time from config (default 3 hours)."""
        return self._config_entry.options.get("balancing_holding_time", 3)

    def _get_cycle_days(self) -> int:
        """Get balancing cycle days from config (default 7 days)."""
        return self._config_entry.options.get("balancing_cycle_days", 7)

    def _get_cooldown_hours(self) -> int:
        """Get balancing cooldown hours from config (default 24 hours)."""
        return self._config_entry.options.get("balancing_cooldown_hours", 24)

    def _get_soc_threshold(self) -> int:
        """Get SoC threshold for opportunistic balancing from config (default 80%)."""
        return self._config_entry.options.get("balancing_soc_threshold", 80)

    async def async_setup(self) -> None:
        """Load balancing state from storage - MUST be fast and safe."""
        _LOGGER.info("BalancingManager: async_setup() start")
        try:
            # 1) Load state from storage (already async)
            await self._load_state_safe()

            # 2) No periodic task registration here - done in __init__.py
            # 3) No initial check here - done in __init__.py via async_call_later

            _LOGGER.info("BalancingManager: async_setup() done")
        except Exception as err:
            _LOGGER.error(
                "BalancingManager: async_setup() failed: %s", err, exc_info=True
            )
            raise

    async def _load_state_safe(self) -> None:
        """Safely load state from storage."""
        try:
            data = await self._store.async_load()
            if data:
                if data.get("last_balancing_ts"):
                    self._last_balancing_ts = datetime.fromisoformat(
                        data["last_balancing_ts"]
                    )
                if data.get("active_plan"):
                    self._active_plan = BalancingPlan.from_dict(data["active_plan"])

            _LOGGER.info(
                f"BalancingManager: State loaded. Last balancing: {self._last_balancing_ts}"
            )
        except Exception as err:
            _LOGGER.warning(
                "BalancingManager: Failed to load state: %s (starting fresh)", err
            )
            # Start with clean state if load fails
            self._last_balancing_ts = None
            self._active_plan = None

    async def _save_state(self) -> None:
        """Save balancing state to storage."""
        data = {
            "last_balancing_ts": (
                self._last_balancing_ts.isoformat() if self._last_balancing_ts else None
            ),
            "active_plan": self._active_plan.to_dict() if self._active_plan else None,
        }
        await self._store.async_save(data)

    def set_forecast_sensor(self, forecast_sensor: Any) -> None:
        """Set reference to forecast sensor for timeline access.

        Args:
            forecast_sensor: OigCloudBatteryForecastSensor instance
        """
        self._forecast_sensor = forecast_sensor

    async def check_balancing(self) -> Optional[BalancingPlan]:
        """Check if balancing is needed and create plan.

        Called periodically (e.g., every 30 minutes) by coordinator.

        Returns:
            BalancingPlan if created, None otherwise
        """
        _LOGGER.debug("BalancingManager: check_balancing() CALLED")

        if not self._forecast_sensor:
            _LOGGER.warning("Forecast sensor not set, cannot check balancing")
            return None

        # 0. Check if balancing just completed
        completion_result = await self._check_if_balancing_occurred()
        if completion_result[0]:  # balancing_occurred = True
            completion_time = completion_result[1]
            _LOGGER.info(
                f"✅ Balancing completed at {completion_time.strftime('%Y-%m-%d %H:%M')}! "
                f"Battery held at ≥99% for {self._get_holding_time_hours()}h"
            )
            self._last_balancing_ts = completion_time
            self._active_plan = None  # Clear active plan
            await self._save_state()
            return None

        # Calculate days since last balancing
        days_since_last = self._get_days_since_last_balancing()
        cycle_days = self._get_cycle_days()
        cooldown_hours = self._get_cooldown_hours()

        _LOGGER.info(f"📊 Balancing check: {days_since_last:.1f} days since last")

        # Check in order: Natural → Opportunistic → Forced

        # 1. Natural: Check if HYBRID already reaches 100% naturally
        _LOGGER.debug("Checking Natural balancing...")
        natural_plan = await self._check_natural_balancing()
        if natural_plan:
            _LOGGER.info("✓ Natural balancing detected in HYBRID forecast")
            self._active_plan = natural_plan
            self._last_balancing_ts = datetime.fromisoformat(natural_plan.holding_end)
            await self._save_state()
            return natural_plan

        # 2. Forced: cycle_days passed, charge ASAP regardless of cost
        if days_since_last >= cycle_days:
            forced_plan = await self._create_forced_plan()
            if forced_plan:
                _LOGGER.warning(
                    f"🔴 FORCED balancing after {days_since_last:.1f} days! "
                    "Health priority over cost."
                )
                self._active_plan = forced_plan
                await self._save_state()
                return forced_plan

        # 3. Opportunistic: SoC ≥ threshold AND cooldown passed
        hours_since_last = self._get_hours_since_last_balancing()
        if hours_since_last >= cooldown_hours:
            _LOGGER.debug(
                f"Checking Opportunistic balancing (hours={hours_since_last:.1f})..."
            )
            opportunistic_plan = await self._create_opportunistic_plan()
            if opportunistic_plan:
                _LOGGER.info(
                    f"⚡ Opportunistic balancing planned after {hours_since_last:.1f} hours"
                )
                self._active_plan = opportunistic_plan
                await self._save_state()
                return opportunistic_plan

        _LOGGER.info(f"No balancing needed yet ({days_since_last:.1f} days)")
        return None

    def _get_days_since_last_balancing(self) -> int:
        """Calculate days since last balancing."""
        if self._last_balancing_ts is None:
            return 99  # Unknown

        delta = dt_util.now() - self._last_balancing_ts
        return delta.days

    def _get_hours_since_last_balancing(self) -> float:
        """Calculate hours since last successful balancing.

        Returns:
            Hours as float (e.g., 25.5 hours)
        """
        if not self._last_balancing_ts:
            # Never balanced - assume cooldown passed
            return float(self._get_cooldown_hours())

        delta = datetime.now() - self._last_balancing_ts
        return delta.total_seconds() / 3600.0

    async def _check_if_balancing_occurred(self) -> Tuple[bool, Optional[datetime]]:
        """Check if battery balancing just completed.

        Scans battery SoC sensor history to detect continuous period at ≥99%
        lasting for holding_time hours.

        Returns:
            (balancing_occurred, completion_time)
            - balancing_occurred: True if balancing detected
            - completion_time: End of holding period (when to update last_balancing)
        """
        holding_time_hours = self._get_holding_time_hours()

        # Get battery SoC sensor
        battery_sensor_id = f"sensor.oig_{self.box_id}_batt_bat_c"

        # Determine how far back to scan
        from homeassistant.util import dt as dt_util

        end_time = dt_util.now()

        if self._last_balancing_ts is None:
            # No previous balancing recorded - scan last 30 days to find it
            history_hours = 30 * 24
            _LOGGER.info(
                "No last balancing timestamp - scanning last 30 days for completion"
            )
        else:
            # Have previous balancing - only check recent history for new completion
            history_hours = holding_time_hours + 1

        start_time = end_time - timedelta(hours=history_hours)

        # Query HA statistics (longer retention than state history)
        try:
            from homeassistant.components.recorder.statistics import (
                statistics_during_period,
            )

            # Use hourly statistics for battery SoC
            stats = await self.hass.async_add_executor_job(
                statistics_during_period,
                self.hass,
                start_time,
                end_time,
                {battery_sensor_id},
                "hour",
                None,
                {"mean", "max"},
            )

            if not stats or battery_sensor_id not in stats:
                _LOGGER.debug(
                    "No battery SoC statistics available for balancing detection"
                )
                return (False, None)

            hourly_stats = stats[battery_sensor_id]

            # Scan for ALL continuous periods with SoC ≥99% and find the latest one
            holding_start = None
            latest_completion = None
            latest_completion_time = None

            for stat in hourly_stats:
                # Use 'max' if available, otherwise 'mean'
                soc = stat.get("max") or stat.get("mean")
                # stat["start"] is already a datetime object from statistics API
                stat_time = (
                    stat["start"]
                    if isinstance(stat["start"], datetime)
                    else dt_util.parse_datetime(stat["start"])
                )

                if soc and soc >= 99.0:
                    # Battery at high SoC during this hour
                    if holding_start is None:
                        holding_start = stat_time
                else:
                    # Battery dropped below threshold
                    if holding_start is not None:
                        # Check if previous high-SoC period was long enough
                        holding_duration = stat_time - holding_start
                        if holding_duration >= timedelta(hours=holding_time_hours):
                            # Found a balancing completion - keep track of latest
                            if (
                                latest_completion_time is None
                                or stat_time > latest_completion_time
                            ):
                                latest_completion = (
                                    holding_start,
                                    stat_time,
                                    holding_duration,
                                )
                                latest_completion_time = stat_time
                    holding_start = None

            # Check if still holding (last stat was ≥99%)
            if holding_start is not None and hourly_stats:
                now = dt_util.now()
                holding_duration = now - holding_start
                if holding_duration >= timedelta(hours=holding_time_hours):
                    # Balancing completed and still holding!
                    # This is the most recent, use it
                    _LOGGER.info(
                        f"Detected ongoing balancing completion: "
                        f"SoC ≥99% since {holding_start.strftime('%Y-%m-%d %H:%M')} "
                        f"({holding_duration.total_seconds() / 3600:.1f}h)"
                    )
                    return (True, now)

            # Return the latest completed balancing found
            if latest_completion is not None:
                holding_start, completion_time, holding_duration = latest_completion
                _LOGGER.info(
                    f"Detected last balancing completion: "
                    f"SoC ≥99% from {holding_start.strftime('%Y-%m-%d %H:%M')} "
                    f"to {completion_time.strftime('%Y-%m-%d %H:%M')} "
                    f"({holding_duration.total_seconds() / 3600:.1f}h)"
                )
                return (True, completion_time)

        except Exception as e:
            _LOGGER.error(f"Error checking balancing completion: {e}", exc_info=True)

        return (False, None)

    async def _check_natural_balancing(self) -> Optional[BalancingPlan]:
        """Check if HYBRID forecast naturally reaches 100% for 3h.

        TODO 5.1: Natural balancing detection.

        Scans HYBRID timeline to find 3-hour window at 100% SoC.
        If found, creates natural plan (no mode overrides needed).

        Returns:
            Natural BalancingPlan if 100% window found, None otherwise
        """
        _LOGGER.debug("_check_natural_balancing: Getting HYBRID timeline...")
        timeline = self._get_hybrid_timeline()
        if not timeline:
            _LOGGER.warning("No HYBRID timeline available for natural balancing check")
            return None

        _LOGGER.debug(f"Timeline has {len(timeline)} intervals")

        # Look for 12 consecutive intervals (3 hours) at >= 99% SoC
        battery_capacity_kwh = self._get_battery_capacity_kwh()
        if not battery_capacity_kwh:
            return None

        threshold_kwh = battery_capacity_kwh * 0.99  # 99% = close enough to 100%

        window_start = None
        window_count = 0

        for interval in timeline:
            soc_kwh = interval.get("battery_soc_kwh", 0)

            if soc_kwh >= threshold_kwh:
                if window_start is None:
                    window_start = interval.get("timestamp")
                window_count += 1

                # Found 3-hour window?
                if window_count >= 12:  # 12 intervals = 3 hours
                    window_end_ts = interval.get("timestamp")
                    window_end = datetime.fromisoformat(window_end_ts)

                    return create_natural_plan(
                        holding_start=datetime.fromisoformat(window_start),
                        holding_end=window_end,
                        last_balancing_ts=window_end,
                    )
            else:
                # Reset window
                window_start = None
                window_count = 0

        return None

    async def _create_opportunistic_plan(self) -> Optional[BalancingPlan]:
        """Create opportunistic balancing plan.

        TODO 5.2: Opportunistic balancing.

        Checks if current SoC ≥ threshold, then calculates total cost for:
        1. Immediate balancing (charge NOW to 100%)
        2. Delayed balancing (wait for cheap window + charge then)

        Selects option with minimum total cost.

        Returns:
            Opportunistic BalancingPlan or None if SoC below threshold
        """
        # Check if SoC meets threshold
        current_soc_percent = await self._get_current_soc_percent()
        if current_soc_percent is None:
            _LOGGER.warning("Cannot get current SoC for opportunistic balancing")
            return None

        soc_threshold = self._get_soc_threshold()
        if current_soc_percent < soc_threshold:
            _LOGGER.debug(
                f"SoC {current_soc_percent:.1f}% below threshold {soc_threshold}%, "
                "no opportunistic balancing"
            )
            return None

        # Cost optimization: evaluate immediate vs. all delayed windows
        _LOGGER.info(
            f"Evaluating balancing costs (SoC={current_soc_percent:.1f}%, "
            f"threshold={soc_threshold}%)"
        )

        # 1. Calculate immediate balancing cost
        immediate_cost = await self._calculate_immediate_balancing_cost(
            current_soc_percent
        )
        _LOGGER.info(f"Immediate balancing cost: {immediate_cost:.2f} CZK")

        # 2. Find all possible holding windows in next 48h
        prices = await self._get_spot_prices_48h()
        if not prices:
            _LOGGER.warning("No spot prices available for cost optimization")
            # Fall back to immediate
            holding_start = datetime.now() + timedelta(hours=1)
            holding_end = holding_start + timedelta(
                hours=self._get_holding_time_hours()
            )
        else:
            # Evaluate each possible window
            timestamps = sorted(prices.keys())
            holding_time_hours = self._get_holding_time_hours()
            intervals_needed = holding_time_hours * 4  # 15min intervals

            min_cost = immediate_cost
            best_window_start = None  # None means immediate is best

            for i in range(len(timestamps) - intervals_needed + 1):
                window_start = timestamps[i]

                # Skip if window starts in past
                if window_start <= datetime.now():
                    continue

                # Calculate total cost for this window
                delayed_cost = await self._calculate_total_balancing_cost(
                    window_start, current_soc_percent
                )

                if delayed_cost < min_cost:
                    min_cost = delayed_cost
                    best_window_start = window_start

            # Log decision
            if best_window_start is None:
                # Immediate is cheapest
                _LOGGER.info(
                    f"✅ Immediate balancing selected: {immediate_cost:.2f} CZK "
                    f"(cheapest option)"
                )
                holding_start = datetime.now() + timedelta(hours=1)
                holding_end = holding_start + timedelta(hours=holding_time_hours)

                # Store costs for sensor
                self._last_immediate_cost = immediate_cost
                self._last_selected_cost = immediate_cost
                self._last_cost_savings = 0.0
            else:
                # Delayed window is cheaper
                holding_start = best_window_start
                holding_end = holding_start + timedelta(hours=holding_time_hours)
                savings = immediate_cost - min_cost
                _LOGGER.info(
                    f"⏰ Delayed balancing selected: {min_cost:.2f} CZK at "
                    f"{holding_start.strftime('%H:%M')} "
                    f"(vs immediate {immediate_cost:.2f} CZK, saving {savings:.2f} CZK)"
                )

                # Store costs for sensor
                self._last_immediate_cost = immediate_cost
                self._last_selected_cost = min_cost
                self._last_cost_savings = savings

        # Plan UPS intervals before holding window
        charging_intervals = self._plan_ups_charging(
            target_time=holding_start,
            current_soc_percent=current_soc_percent,
            target_soc_percent=100.0,
        )

        # Add holding intervals (HOME_UPS during holding window to maintain 100%)
        holding_intervals = self._create_holding_intervals(
            holding_start, holding_end, mode=HOME_UPS
        )

        all_intervals = charging_intervals + holding_intervals

        return create_opportunistic_plan(
            holding_start=holding_start,
            holding_end=holding_end,
            charging_intervals=all_intervals,
            days_since_last=int(self._get_days_since_last_balancing()),
        )

    async def _create_forced_plan(self) -> Optional[BalancingPlan]:
        """Create forced balancing plan.

        TODO 5.3: Forced balancing.

        Emergency balancing after cycle_days. Charges ASAP regardless of cost.
        Still calculates and logs costs for monitoring purposes.

        Returns:
            Forced BalancingPlan (locked, critical priority)
        """
        # Get current SoC
        current_soc_percent = await self._get_current_soc_percent()
        if current_soc_percent is None:
            current_soc_percent = 50.0  # Assume worst case

        # Calculate costs for monitoring (even though we ignore them)
        immediate_cost = await self._calculate_immediate_balancing_cost(
            current_soc_percent
        )

        _LOGGER.warning(
            f"🔴 FORCED balancing: Health priority! "
            f"Cost={immediate_cost:.2f} CZK (not optimized)"
        )

        # Store costs for sensor
        self._last_immediate_cost = immediate_cost
        self._last_selected_cost = immediate_cost
        self._last_cost_savings = 0.0  # No optimization in forced mode

        # Find next available holding window (ASAP)
        now = datetime.now()
        holding_time_hours = self._get_holding_time_hours()

        # Start holding in 2 hours (time to charge + safety margin)
        holding_start = now + timedelta(hours=2)
        holding_end = holding_start + timedelta(hours=holding_time_hours)

        # Plan aggressive UPS charging NOW
        charging_intervals = self._plan_ups_charging(
            target_time=holding_start,
            current_soc_percent=current_soc_percent,
            target_soc_percent=100.0,
        )

        # Add holding intervals
        holding_intervals = self._create_holding_intervals(
            holding_start, holding_end, mode=HOME_UPS
        )

        all_intervals = charging_intervals + holding_intervals

        return create_forced_plan(
            holding_start=holding_start,
            holding_end=holding_end,
            charging_intervals=all_intervals,
        )

    def _plan_ups_charging(
        self,
        target_time: datetime,
        current_soc_percent: float,
        target_soc_percent: float,
    ) -> List[BalancingInterval]:
        """Plan UPS charging intervals to reach target SoC.

        Simple heuristic: Assume ~3kW charging power (HOME_UPS limit).
        Battery capacity ~15 kWh, so 5% ≈ 0.75 kWh, takes 15 min.

        Args:
            target_time: When to reach target SoC
            current_soc_percent: Current battery SoC (%)
            target_soc_percent: Target SoC (typically 100%)

        Returns:
            List of BalancingInterval with HOME_UPS mode
        """
        soc_needed = target_soc_percent - current_soc_percent
        if soc_needed <= 0:
            return []  # Already at target

        # Conservative estimate: 5% per 15min interval
        intervals_needed = max(1, int(soc_needed / 5.0))

        # Respect MIN_MODE_DURATION
        intervals_needed = max(intervals_needed, MIN_MODE_DURATION)

        # Start charging before target time
        charging_start = target_time - timedelta(minutes=15 * intervals_needed)

        # Create UPS intervals
        intervals = []
        current_ts = charging_start
        for _ in range(intervals_needed):
            intervals.append(
                BalancingInterval(
                    ts=current_ts.isoformat(),
                    mode=HOME_UPS,
                )
            )
            current_ts += timedelta(minutes=15)

        _LOGGER.debug(
            f"Planned {intervals_needed} UPS intervals "
            f"from {charging_start.strftime('%H:%M')} to {target_time.strftime('%H:%M')}"
        )

        return intervals

    def _create_holding_intervals(
        self, start: datetime, end: datetime, mode: int = HOME_UPS
    ) -> List[BalancingInterval]:
        """Create intervals for holding window.

        Args:
            start: Window start
            end: Window end
            mode: CBB mode to use (default HOME_UPS)

        Returns:
            List of BalancingInterval
        """
        intervals = []
        current_ts = start

        while current_ts < end:
            intervals.append(
                BalancingInterval(
                    ts=current_ts.isoformat(),
                    mode=mode,
                )
            )
            current_ts += timedelta(minutes=15)

        return intervals

    async def _calculate_immediate_balancing_cost(
        self, current_soc_percent: float
    ) -> float:
        """Calculate cost to balance immediately.

        Args:
            current_soc_percent: Current battery SoC %

        Returns:
            Cost in CZK to charge from current SoC to 100%
        """
        # Get current spot price
        prices = await self._get_spot_prices_48h()
        if not prices:
            _LOGGER.warning("No spot prices available for immediate cost calculation")
            return 999.0  # High cost to prevent selection

        now = datetime.now()
        # Find closest timestamp
        current_price = None
        min_delta = timedelta(hours=1)
        for ts, price in prices.items():
            delta = abs(ts - now)
            if delta < min_delta:
                min_delta = delta
                current_price = price

        if current_price is None:
            _LOGGER.warning("Could not find current spot price")
            return 999.0

        # Calculate charge needed
        battery_capacity_kwh = self._get_battery_capacity_kwh()
        if not battery_capacity_kwh:
            return 999.0

        charge_needed_kwh = (100 - current_soc_percent) / 100 * battery_capacity_kwh

        immediate_cost = charge_needed_kwh * current_price

        _LOGGER.debug(
            f"Immediate cost: {charge_needed_kwh:.2f} kWh * {current_price:.2f} CZK/kWh "
            f"= {immediate_cost:.2f} CZK"
        )

        return immediate_cost

    async def _calculate_total_balancing_cost(
        self, window_start: datetime, current_soc_percent: float
    ) -> float:
        """Calculate total cost for delayed balancing.

        Total cost = waiting_cost + charging_cost

        Waiting cost includes:
        - Battery discharge during wait (self-discharge rate ~0.05 kWh/h)
        - Grid consumption during wait (from forecast timeline)

        Charging cost:
        - Energy needed to reach 100% at window start
        - Multiplied by average spot price during charging window

        Args:
            window_start: When to start holding window
            current_soc_percent: Current battery SoC %

        Returns:
            Total cost in CZK (waiting + charging)
        """
        now = datetime.now()
        wait_duration = (window_start - now).total_seconds() / 3600.0  # hours

        if wait_duration <= 0:
            # Window is now or in past, no waiting cost
            return await self._calculate_immediate_balancing_cost(current_soc_percent)

        battery_capacity_kwh = self._get_battery_capacity_kwh()
        if not battery_capacity_kwh:
            return 999.0

        # 1. Calculate battery discharge during wait
        # Self-discharge rate ~0.05 kWh/hour (from battery specs)
        DISCHARGE_RATE_KWH_PER_HOUR = 0.05
        battery_loss_kwh = wait_duration * DISCHARGE_RATE_KWH_PER_HOUR

        # 2. Get grid consumption during wait from forecast timeline
        grid_consumption_kwh = 0.0
        if self._forecast_sensor and hasattr(self._forecast_sensor, "_timeline_data"):
            timeline = self._forecast_sensor._timeline_data
            if timeline:
                for interval in timeline:
                    interval_time = datetime.fromisoformat(interval.ts)
                    if now <= interval_time < window_start:
                        # Grid consumption in this 15-min interval
                        grid_kwh = getattr(interval, "grid_consumption_kwh", 0.0)
                        grid_consumption_kwh += grid_kwh

        # 3. Calculate average spot price during wait
        prices = await self._get_spot_prices_48h()
        wait_prices = [
            price for ts, price in prices.items() if now <= ts < window_start
        ]
        avg_wait_price = sum(wait_prices) / len(wait_prices) if wait_prices else 5.0

        # 4. Calculate waiting cost
        total_wait_energy = battery_loss_kwh + grid_consumption_kwh
        waiting_cost = total_wait_energy * avg_wait_price

        # 5. Calculate SoC at window start
        soc_loss_percent = (battery_loss_kwh / battery_capacity_kwh) * 100
        soc_at_window = max(0, current_soc_percent - soc_loss_percent)

        # 6. Calculate charging cost
        charge_needed_kwh = (100 - soc_at_window) / 100 * battery_capacity_kwh

        # Average spot price during charging/holding window
        holding_time_hours = self._get_holding_time_hours()
        window_end = window_start + timedelta(hours=holding_time_hours)
        charging_prices = [
            price for ts, price in prices.items() if window_start <= ts < window_end
        ]
        avg_charging_price = (
            sum(charging_prices) / len(charging_prices) if charging_prices else 5.0
        )

        charging_cost = charge_needed_kwh * avg_charging_price

        # 7. Total cost
        total_cost = waiting_cost + charging_cost

        _LOGGER.debug(
            f"Delayed cost for window {window_start.strftime('%H:%M')}: "
            f"waiting={waiting_cost:.2f} CZK ({battery_loss_kwh:.2f} + {grid_consumption_kwh:.2f} kWh @ {avg_wait_price:.2f}), "
            f"charging={charging_cost:.2f} CZK ({charge_needed_kwh:.2f} kWh @ {avg_charging_price:.2f}), "
            f"total={total_cost:.2f} CZK"
        )

        return total_cost

    async def _find_cheap_holding_window(
        self,
    ) -> Optional[Tuple[datetime, datetime]]:
        """Find cheapest 3-hour window in next 48 hours.

        Returns:
            (holding_start, holding_end) or None
        """
        # Get spot prices for next 48h
        prices = await self._get_spot_prices_48h()
        if not prices:
            return None

        # Find 3-hour window with lowest average price
        # Use 12 consecutive 15min intervals
        min_avg_price = float("inf")
        best_start = None

        timestamps = sorted(prices.keys())
        holding_time_hours = self._get_holding_time_hours()
        intervals_needed = holding_time_hours * 4  # 4 intervals per hour (15min each)

        for i in range(len(timestamps) - intervals_needed + 1):
            window_prices = [
                prices[timestamps[j]] for j in range(i, i + intervals_needed)
            ]
            avg_price = sum(window_prices) / len(window_prices)

            if avg_price < min_avg_price:
                min_avg_price = avg_price
                best_start = timestamps[i]

        if best_start:
            best_end = best_start + timedelta(hours=holding_time_hours)
            _LOGGER.debug(
                f"Found cheap window: {best_start.strftime('%H:%M')} - "
                f"{best_end.strftime('%H:%M')}, avg price {min_avg_price:.2f} CZK/kWh"
            )
            return best_start, best_end

        return None

    def _get_hybrid_timeline(self) -> Optional[List[Dict[str, Any]]]:
        """Get HYBRID timeline from forecast sensor.

        Returns:
            Timeline list or None
        """
        if not self._forecast_sensor:
            return None

        # Access forecast sensor's HYBRID timeline
        # This is the source of truth for what will actually happen
        timeline = getattr(self._forecast_sensor, "_hybrid_timeline", None)
        return timeline

    async def _get_current_soc_percent(self) -> Optional[float]:
        """Get current battery SoC percentage.

        Returns:
            SoC as percentage (0-100) or None
        """
        sensor_id = f"sensor.oig_{self.box_id}_batt_bat_c"
        state = self.hass.states.get(sensor_id)

        if not state or state.state in ["unknown", "unavailable"]:
            return None

        try:
            return float(state.state)
        except (ValueError, TypeError):
            return None

    def _get_battery_capacity_kwh(self) -> Optional[float]:
        """Get battery capacity in kWh.

        Returns:
            Capacity in kWh or None
        """
        sensor_id = f"sensor.oig_{self.box_id}_installed_battery_capacity_kwh"
        state = self.hass.states.get(sensor_id)

        if not state or state.state in ["unknown", "unavailable"]:
            _LOGGER.warning(
                f"Battery capacity sensor {sensor_id} not available or unknown"
            )
            return None

        try:
            capacity = float(state.state)
            _LOGGER.debug(f"Battery capacity: {capacity:.2f} kWh from {sensor_id}")
            return capacity
        except (ValueError, TypeError):
            return None

    async def _get_spot_prices_48h(self) -> Dict[datetime, float]:
        """Get spot prices for next 48 hours from forecast sensor.

        Returns:
            Dict mapping datetime to price (CZK/kWh)
        """
        if not self._forecast_sensor:
            _LOGGER.warning("Forecast sensor not set, cannot get spot prices")
            return {}

        # Get active timeline from forecast sensor (_timeline_data attribute)
        timeline = getattr(self._forecast_sensor, "_timeline_data", None)
        if not timeline:
            _LOGGER.warning("No active timeline available for spot prices")
            return {}

        prices = {}
        for interval in timeline:
            timestamp_str = interval.get("timestamp") or interval.get("time")
            if not timestamp_str:
                continue

            try:
                ts = datetime.fromisoformat(timestamp_str)
                spot_price = interval.get("spot_price_czk") or interval.get(
                    "spot_price"
                )
                if spot_price is not None:
                    prices[ts] = float(spot_price)
            except (ValueError, TypeError) as e:
                _LOGGER.debug(f"Failed to parse interval timestamp/price: {e}")
                continue

        _LOGGER.debug(f"Loaded {len(prices)} spot price intervals from forecast")
        return prices

    def get_active_plan(self) -> Optional[BalancingPlan]:
        """Get currently active balancing plan.

        Returns:
            Active BalancingPlan or None
        """
        return self._active_plan

    def get_sensor_state(self) -> str:
        """Get sensor state string for HA balancing sensor.

        Returns:
            State: idle | natural | opportunistic | forced | overdue | error
        """
        if not self._active_plan:
            days_since = self._get_days_since_last_balancing()
            cycle_days = self._get_cycle_days()
            if days_since >= cycle_days:
                return "overdue"
            return "idle"

        return self._active_plan.mode.value

    def get_sensor_attributes(self) -> Dict[str, Any]:
        """Get sensor attributes for HA balancing sensor.

        Returns:
            Attributes dict
        """
        days_since = self._get_days_since_last_balancing()

        attrs = {
            "last_balancing_ts": (
                self._last_balancing_ts.isoformat() if self._last_balancing_ts else None
            ),
            "days_since_last": round(days_since, 1),
            "active_plan": None,
            "holding_start": None,
            "holding_end": None,
            "reason": None,
            "priority": None,
            "locked": False,
            # Cost information
            "immediate_cost_czk": self._last_immediate_cost,
            "selected_cost_czk": self._last_selected_cost,
            "cost_savings_czk": self._last_cost_savings,
        }

        if self._active_plan:
            attrs.update(
                {
                    "active_plan": self._active_plan.mode.value,
                    "holding_start": self._active_plan.holding_start,
                    "holding_end": self._active_plan.holding_end,
                    "reason": self._active_plan.reason,
                    "priority": self._active_plan.priority.value,
                    "locked": self._active_plan.locked,
                }
            )

        return attrs
