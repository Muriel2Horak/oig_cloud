"""Balancing Manager - Battery Balancing Logic per BR-4."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

from homeassistant.core import HomeAssistant

from ..const import HOME_III
from .plan_manager import PlanManager

_LOGGER = logging.getLogger(__name__)

# Constants per BR-4
OPPORTUNISTIC_THRESHOLD_SOC = 98.0  # % - trigger opportunistic balancing
OPPORTUNISTIC_MIN_HOLD_HOURS = 4  # Minimum hold time for opportunistic
ECONOMIC_CHECK_INTERVAL_HOURS = 1  # Check mediána every hour
FORCED_INTERVAL_DAYS = 30  # Force balancing every 30 days


@dataclass
class BalancingConfig:
    """Balancing configuration per BR-4.1."""

    enabled: bool = True  # Master enable/disable

    # Opportunistic mode (BR-4.2)
    opportunistic_enabled: bool = True
    opportunistic_threshold_soc: float = OPPORTUNISTIC_THRESHOLD_SOC
    opportunistic_min_hold_hours: int = OPPORTUNISTIC_MIN_HOLD_HOURS

    # Economic mode (BR-4.3)
    economic_enabled: bool = True
    economic_check_interval_hours: int = ECONOMIC_CHECK_INTERVAL_HOURS

    # Forced mode (BR-4.6)
    forced_enabled: bool = True
    forced_interval_days: int = FORCED_INTERVAL_DAYS

    # Holding configuration
    holding_mode: int = HOME_III  # Default holding mode

    def validate(self) -> None:
        """Validate configuration."""
        if (
            self.opportunistic_threshold_soc < 90.0
            or self.opportunistic_threshold_soc > 100.0
        ):
            raise ValueError("opportunistic_threshold_soc must be 90-100%")
        if self.opportunistic_min_hold_hours < 1:
            raise ValueError("opportunistic_min_hold_hours must be >= 1")
        if self.economic_check_interval_hours < 1:
            raise ValueError("economic_check_interval_hours must be >= 1")


class BalancingManager:
    """Manage battery balancing per BR-4.

    Implements:
    - BR-4.2: Opportunistic balancing (FVE nabije 100%)
    - BR-4.3: Economic balancing (mediána export window)
    - BR-4.4: Explicit holding parameters
    - BR-4.5: Iterative mediána validation
    - BR-4.6: Forced balancing (30 days)
    """

    def __init__(
        self,
        hass: HomeAssistant,
        plan_manager: PlanManager,
        config: BalancingConfig,
    ):
        """Initialize balancing manager.

        Args:
            hass: Home Assistant instance
            plan_manager: PlanManager instance
            config: Balancing configuration
        """
        self.hass = hass
        self.plan_manager = plan_manager
        self.config = config
        self._logger = _LOGGER

        # Validate config
        self.config.validate()

        # State tracking
        self._last_economic_check: Optional[datetime] = None
        self._last_forced_balancing: Optional[datetime] = None
        self._current_holding_start: Optional[datetime] = None
        self._current_holding_end: Optional[datetime] = None

    async def check_opportunistic_balancing(self) -> Optional[str]:
        """Check and trigger opportunistic balancing per BR-4.2.

        Returns:
            Plan ID if balancing plan created, None otherwise
        """
        if not self.config.enabled or not self.config.opportunistic_enabled:
            return None

        # Get current battery SoC
        current_soc = await self._get_current_soc_percent()
        if current_soc is None:
            self._logger.warning("Cannot get current SoC for opportunistic check")
            return None

        # Check threshold
        if current_soc < self.config.opportunistic_threshold_soc:
            return None

        self._logger.info(
            f"Opportunistic balancing triggered: SoC={current_soc:.1f}% "
            f">= threshold={self.config.opportunistic_threshold_soc}%"
        )

        # Detekce holding window per BR-4.2
        holding_window = await self._detect_holding_window()
        if not holding_window:
            self._logger.warning("No suitable holding window detected")
            return None

        target_time, holding_hours = holding_window

        self._logger.info(
            f"Detected holding window: start={target_time}, duration={holding_hours}h"
        )

        # Create balancing plan
        plan = self.plan_manager.create_balancing_plan(
            target_soc_percent=100.0,
            target_time=target_time,
            holding_hours=holding_hours,
            holding_mode=self.config.holding_mode,
            balancing_mode="opportunistic",
        )

        # Activate plan
        self.plan_manager.activate_plan(plan.plan_id)

        self._current_holding_start = target_time
        self._current_holding_end = target_time + timedelta(hours=holding_hours)

        return plan.plan_id

    async def check_economic_balancing(self) -> Optional[str]:
        """Check and trigger economic balancing per BR-4.3 and BR-4.5.

        Implements ITERATIVE mediána validation - checks every hour.

        Returns:
            Plan ID if balancing plan created, None otherwise
        """
        if not self.config.enabled or not self.config.economic_enabled:
            return None

        now = datetime.now()

        # Check if time for periodic check (every N hours)
        if self._last_economic_check:
            elapsed = (now - self._last_economic_check).total_seconds() / 3600
            if elapsed < self.config.economic_check_interval_hours:
                return None

        self._last_economic_check = now

        # Get export window and prices
        export_window = await self._get_export_window()
        if not export_window:
            self._logger.debug("No export window detected for economic balancing")
            return None

        window_start, window_end, prices = export_window
        window_duration = int((window_end - window_start).total_seconds() / 3600)

        self._logger.info(
            f"Export window detected: {window_start} - {window_end} ({window_duration}h)"
        )

        # BR-4.5: Iterative mediána validation
        # Check EVERY interval in holding window
        is_valid = await self._validate_mediana_iterative(
            window_start, window_end, prices
        )

        if not is_valid:
            self._logger.info(
                "Mediána validation failed - economic balancing not triggered"
            )
            return None

        self._logger.info("Mediána validation passed - triggering economic balancing")

        # Calculate target time (začátek exportu)
        # Need to reach 100% BEFORE window starts
        target_time = window_start - timedelta(hours=2)  # 2h buffer to reach 100%

        # Create balancing plan
        plan = self.plan_manager.create_balancing_plan(
            target_soc_percent=100.0,
            target_time=target_time,
            holding_hours=window_duration + 2,  # Hold through entire window
            holding_mode=self.config.holding_mode,
            balancing_mode="economic",
        )

        # Activate plan
        self.plan_manager.activate_plan(plan.plan_id)

        self._current_holding_start = target_time
        self._current_holding_end = window_end

        return plan.plan_id

    async def check_forced_balancing(self) -> Optional[str]:
        """Check and trigger forced balancing per BR-4.6.

        Returns:
            Plan ID if balancing plan created, None otherwise
        """
        if not self.config.enabled or not self.config.forced_enabled:
            return None

        now = datetime.now()

        # Check last forced balancing
        if self._last_forced_balancing:
            days_since = (now - self._last_forced_balancing).days
            if days_since < self.config.forced_interval_days:
                return None

        self._logger.info(
            f"Forced balancing triggered: {self.config.forced_interval_days} days elapsed"
        )

        # Find next cheap window for balancing
        cheap_window = await self._find_cheap_window()
        if not cheap_window:
            self._logger.warning("No cheap window found for forced balancing")
            return None

        target_time, holding_hours = cheap_window

        # Create balancing plan
        plan = self.plan_manager.create_balancing_plan(
            target_soc_percent=100.0,
            target_time=target_time,
            holding_hours=holding_hours,
            holding_mode=self.config.holding_mode,
            balancing_mode="forced",
        )

        # Activate plan
        self.plan_manager.activate_plan(plan.plan_id)

        self._last_forced_balancing = now
        self._current_holding_start = target_time
        self._current_holding_end = target_time + timedelta(hours=holding_hours)

        return plan.plan_id

    async def _detect_holding_window(self) -> Optional[Tuple[datetime, int]]:
        """Detect holding window for opportunistic balancing per BR-4.2.

        Calculates when battery will reach 100% and schedules holding to start then.

        Returns:
            (target_time, holding_hours) where target_time is when to START holding
        """
        now = datetime.now()

        # Get current SoC
        current_soc = await self._get_current_soc_percent()
        if current_soc is None or current_soc >= 99.5:
            # Already at 100%, start holding now
            return now, self.config.opportunistic_min_hold_hours

        # Estimate charging time to 100%
        # Assuming ~5% per 15min interval at typical charge rate
        # NOTE: Use actual battery capacity and charge power from context
        soc_needed = 100.0 - current_soc
        intervals_needed = int(soc_needed / 5.0) + 1  # Conservative estimate
        charge_time_hours = intervals_needed * 0.25  # 15min intervals

        # Target time = now + charge time (when we reach 100%)
        target_time = now + timedelta(hours=charge_time_hours)

        self._logger.info(
            f"Opportunistic balancing: current_soc={current_soc:.1f}%, "
            f"will reach 100% at {target_time.strftime('%H:%M')}, "
            f"holding for {self.config.opportunistic_min_hold_hours}h"
        )

        return target_time, self.config.opportunistic_min_hold_hours

    async def _get_export_window(
        self,
    ) -> Optional[Tuple[datetime, datetime, List[float]]]:
        """Get export window for economic balancing per BR-4.3.

        Returns:
            (window_start, window_end, prices) or None
        """
        # Get spot prices for next 48h
        prices = await self._get_spot_prices(hours=48)
        if not prices:
            return None

        # Find export window (continuous high prices)
        # Simple heuristic: find 4+ hour window above average price

        list(prices.keys())
        price_values = list(prices.values())
        avg_price = sum(price_values) / len(price_values)

        window_start = None
        window_end = None
        current_window = []

        for i, (ts, price) in enumerate(prices.items()):
            if price > avg_price * 1.2:  # 20% above average
                if not current_window:
                    window_start = ts
                current_window.append(price)
                window_end = ts + timedelta(hours=1)
            else:
                # Check if current window is valid
                if len(current_window) >= 4:
                    return window_start, window_end, current_window
                # Reset
                window_start = None
                window_end = None
                current_window = []

        # Check final window
        if len(current_window) >= 4:
            return window_start, window_end, current_window

        return None

    async def _validate_mediana_iterative(
        self,
        window_start: datetime,
        window_end: datetime,
        prices: List[float],
    ) -> bool:
        """Validate mediána iteratively per BR-4.5.

        Check EVERY interval (15min) in holding window that:
        export_price >= mediána_48h

        Args:
            window_start: Window start time
            window_end: Window end time
            prices: Prices in the window

        Returns:
            True if mediána validation passes for ALL intervals
        """
        _ = prices
        # Calculate mediána of next 48h prices
        all_prices = await self._get_spot_prices(hours=48)
        if not all_prices:
            return False

        price_values = sorted(all_prices.values())
        mediana = price_values[len(price_values) // 2]

        self._logger.debug(f"Mediána 48h: {mediana:.2f} CZK/kWh")

        # Check EVERY 15min interval in window
        current = window_start
        interval_count = 0
        passed_count = 0

        while current < window_end:
            # Get price for this interval
            interval_price = all_prices.get(current)
            if interval_price is None:
                self._logger.warning(f"Missing price for interval {current}")
                return False

            # Check mediána condition
            if interval_price >= mediana:
                passed_count += 1
            else:
                self._logger.debug(
                    f"Interval {current}: price={interval_price:.2f} < mediána={mediana:.2f}"
                )

            interval_count += 1
            current += timedelta(minutes=15)

        # All intervals must pass
        success = passed_count == interval_count

        self._logger.info(
            f"Mediána validation: {passed_count}/{interval_count} intervals passed, "
            f"success={success}"
        )

        return success

    async def _find_cheap_window(self) -> Optional[Tuple[datetime, int]]:
        """Find cheap window for forced balancing.

        Returns:
            (target_time, holding_hours) or None
        """
        # Get spot prices for next 48h
        prices = await self._get_spot_prices(hours=48)
        if not prices:
            return None

        # Find cheapest 6-hour window
        timestamps = list(prices.keys())
        min_cost = float("inf")
        best_start = None

        for i in range(len(timestamps) - 24):  # 6h = 24 intervals of 15min
            window_cost = sum(prices[timestamps[j]] for j in range(i, i + 24))
            if window_cost < min_cost:
                min_cost = window_cost
                best_start = timestamps[i]

        if best_start:
            return best_start, 6  # 6 hour holding

        return None

    async def _get_current_soc_percent(self) -> Optional[float]:
        """Get current battery SoC in percent."""
        try:
            # Get sensor from HA
            sensor_id = f"sensor.oig_{self.plan_manager.box_id}_battery_soc_percent"
            state = self.hass.states.get(sensor_id)
            if state and state.state not in ["unknown", "unavailable"]:
                return float(state.state)
        except Exception as e:
            self._logger.error(f"Error getting current SoC: {e}")
        return None

    async def _get_soc_history(self, hours: int = 24) -> List[Tuple[datetime, float]]:
        """Get battery SoC history.

        Args:
            hours: Hours of history to fetch

        Returns:
            List of (timestamp, soc_percent) tuples
        """
        _ = hours
        # NOTE: Implement history fetch from HA recorder
        # For now, return empty list
        self._logger.warning("SoC history fetch not implemented yet")
        return []

    async def _get_spot_prices(self, hours: int = 48) -> Dict[datetime, float]:
        """Get spot prices for next N hours.

        Args:
            hours: Hours of prices to fetch

        Returns:
            Dict of {timestamp: price_czk_kwh}
        """
        _ = hours
        try:
            # Get spot price sensor from HA
            sensor_id = "sensor.spot_cz"
            state = self.hass.states.get(sensor_id)

            if not state or not state.attributes:
                self._logger.warning("Spot price sensor not available")
                return {}

            # Extract prices from attributes
            # Format depends on spot price sensor implementation
            prices = {}

            # NOTE: Parse actual spot price sensor format
            # For now, return empty dict
            self._logger.warning("Spot price parsing not implemented yet")

            return prices
        except Exception as e:
            self._logger.error(f"Error getting spot prices: {e}")
            return {}
