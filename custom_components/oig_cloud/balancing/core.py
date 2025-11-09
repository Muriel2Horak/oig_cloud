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
BALANCING_INTERVAL_HOURS = 3  # 100% SoC must be held for 3 hours
BALANCING_CYCLE_DAYS = 7  # Balancing every 7 days
OPPORTUNISTIC_THRESHOLD_DAYS = 5  # Start looking for cheap hours after 5 days
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
    ):
        """Initialize balancing manager.

        Args:
            hass: Home Assistant instance
            box_id: Box ID for sensor access
            storage_path: Path for storing balancing state
        """
        self.hass = hass
        self.box_id = box_id
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

            _LOGGER.debug(
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

        # Calculate days since last balancing
        days_since_last = self._get_days_since_last_balancing()

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

        # 2. Opportunistic: 5-6 days, find cheap charging window
        if days_since_last >= OPPORTUNISTIC_THRESHOLD_DAYS:
            _LOGGER.debug(
                f"Checking Opportunistic balancing (days={days_since_last:.1f})..."
            )
            opportunistic_plan = await self._create_opportunistic_plan(days_since_last)
            if opportunistic_plan:
                _LOGGER.info(
                    f"⚡ Opportunistic balancing planned after {days_since_last:.1f} days"
                )
                self._active_plan = opportunistic_plan
                await self._save_state()
                return opportunistic_plan

        # 3. Forced: 7+ days, charge ASAP regardless of cost
        if days_since_last >= BALANCING_CYCLE_DAYS:
            forced_plan = await self._create_forced_plan()
            if forced_plan:
                _LOGGER.warning(
                    f"🔴 FORCED balancing after {days_since_last:.1f} days! "
                    "Health priority over cost."
                )
                self._active_plan = forced_plan
                await self._save_state()
                return forced_plan

        _LOGGER.info(f"No balancing needed yet ({days_since_last:.1f} days)")
        return None

    def _get_days_since_last_balancing(self) -> float:
        """Calculate days since last successful balancing.

        Returns:
            Days as float (e.g., 5.3 days)
        """
        if not self._last_balancing_ts:
            # Never balanced - assume 7 days (trigger forced)
            return 7.0

        delta = datetime.now() - self._last_balancing_ts
        return delta.total_seconds() / 86400.0

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

    async def _create_opportunistic_plan(
        self, days_since_last: float
    ) -> Optional[BalancingPlan]:
        """Create opportunistic balancing plan.

        TODO 5.2: Opportunistic balancing.

        Finds cheap 3-hour window in next days and plans UPS charging before it
        to reach 100% and hold for 3 hours.

        Args:
            days_since_last: Days since last balancing (5-6)

        Returns:
            Opportunistic BalancingPlan or None if no suitable window
        """
        # Find cheap 3-hour window in next 48 hours
        cheap_window = await self._find_cheap_holding_window()
        if not cheap_window:
            _LOGGER.warning("No cheap 3h window found for opportunistic balancing")
            return None

        holding_start, holding_end = cheap_window

        # Calculate how much charging needed to reach 100%
        current_soc_percent = await self._get_current_soc_percent()
        if current_soc_percent is None:
            return None

        # Plan UPS intervals before holding window
        charging_intervals = self._plan_ups_charging(
            target_time=holding_start,
            current_soc_percent=current_soc_percent,
            target_soc_percent=100.0,
        )

        # Add holding intervals (HOME_UPS during 3h window to maintain 100%)
        holding_intervals = self._create_holding_intervals(
            holding_start, holding_end, mode=HOME_UPS
        )

        all_intervals = charging_intervals + holding_intervals

        return create_opportunistic_plan(
            holding_start=holding_start,
            holding_end=holding_end,
            charging_intervals=all_intervals,
            days_since_last=int(days_since_last),
        )

    async def _create_forced_plan(self) -> Optional[BalancingPlan]:
        """Create forced balancing plan.

        TODO 5.3: Forced balancing.

        Emergency balancing after 7+ days. Finds nearest 3-hour window
        and charges ASAP, regardless of electricity cost.

        Returns:
            Forced BalancingPlan (locked, critical priority)
        """
        # Find next available 3-hour window (ASAP, ignore cost)
        now = datetime.now()

        # Start holding in 2 hours (time to charge + safety margin)
        holding_start = now + timedelta(hours=2)
        holding_end = holding_start + timedelta(hours=BALANCING_INTERVAL_HOURS)

        # Get current SoC
        current_soc_percent = await self._get_current_soc_percent()
        if current_soc_percent is None:
            current_soc_percent = 50.0  # Assume worst case

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
        for i in range(len(timestamps) - 11):  # Need 12 consecutive
            window_prices = [prices[timestamps[j]] for j in range(i, i + 12)]
            avg_price = sum(window_prices) / len(window_prices)

            if avg_price < min_avg_price:
                min_avg_price = avg_price
                best_start = timestamps[i]

        if best_start:
            best_end = best_start + timedelta(hours=BALANCING_INTERVAL_HOURS)
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
        """Get spot prices for next 48 hours.

        Returns:
            Dict mapping datetime to price (CZK/kWh)
        """
        # TODO: Get from spot price sensor
        # For now, return dummy data
        now = datetime.now()
        prices = {}

        for hour in range(48):
            ts = now + timedelta(hours=hour)
            # Dummy: cheaper at night
            if 22 <= ts.hour or ts.hour < 6:
                prices[ts] = 1.5  # Cheap
            else:
                prices[ts] = 3.0  # Expensive

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
            if days_since >= BALANCING_CYCLE_DAYS:
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
