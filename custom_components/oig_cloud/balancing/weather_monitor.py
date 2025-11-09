"""Weather Monitor - ČHMÚ Weather Emergency Handling per BR-7.2."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
import logging

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_interval

from ..const import HOME_III, HOME_UPS
from .plan_manager import PlanManager

_LOGGER = logging.getLogger(__name__)

# Constants per BR-7.2
UPDATE_INTERVAL_MINUTES = 60  # Check ČHMÚ sensor every hour
SOC_MAINTENANCE_THRESHOLD = 99.5  # % - if SoC drops below, switch to UPS


@dataclass
class WeatherConfig:
    """Weather emergency configuration per BR-7.2."""

    enabled: bool = True  # Master enable/disable
    emergency_mode: bool = True  # Use emergency mode (vs normal capacity increase)

    # Emergency levels (sensor state → holding mode)
    emergency_levels: Optional[Dict[str, str]] = None

    # ČHMÚ sensor entity ID
    chmu_sensor_id: str = "sensor.oig_chmu_warning"

    def __post_init__(self):
        """Initialize defaults."""
        if self.emergency_levels is None:
            # Default: all warnings trigger emergency
            self.emergency_levels = {
                "yellow": "emergency",
                "orange": "emergency",
                "red": "emergency",
            }

    def validate(self) -> None:
        """Validate configuration."""
        if not self.chmu_sensor_id:
            raise ValueError("chmu_sensor_id required")


class WeatherMonitor:
    """Monitor ČHMÚ weather warnings and manage emergency plans per BR-7.2.

    Implements:
    - BR-7.2.2: Emergency mode with dynamic holding update
    - Dynamic holding duration (re-check hourly)
    - SoC maintenance (UPS if <100%)
    - ČHMÚ sensor monitoring (not just warning_end timestamp)
    """

    def __init__(
        self,
        hass: HomeAssistant,
        plan_manager: PlanManager,
        config: WeatherConfig,
    ):
        """Initialize weather monitor.

        Args:
            hass: Home Assistant instance
            plan_manager: PlanManager instance
            config: Weather configuration
        """
        self.hass = hass
        self.plan_manager = plan_manager
        self.config = config
        self._logger = _LOGGER

        # Validate config
        self.config.validate()

        # State tracking
        self._active_warning: Optional[str] = None  # Current warning level
        self._warning_start: Optional[datetime] = None
        self._emergency_plan_id: Optional[str] = None
        self._update_unsubscribe = None

    async def start(self) -> None:
        """Start weather monitoring."""
        if not self.config.enabled:
            self._logger.info("Weather monitoring disabled")
            return

        self._logger.info("Starting weather monitoring")

        # Register periodic update
        self._update_unsubscribe = async_track_time_interval(
            self.hass,
            self._periodic_update,
            timedelta(minutes=UPDATE_INTERVAL_MINUTES),
        )

        # Initial check
        await self._check_weather_warning()

    async def stop(self) -> None:
        """Stop weather monitoring."""
        if self._update_unsubscribe:
            self._update_unsubscribe()
            self._update_unsubscribe = None

        self._logger.info("Stopped weather monitoring")

    @callback
    async def _periodic_update(self, now: datetime) -> None:
        """Periodic update callback (every hour)."""
        await self._check_weather_warning()

        # If emergency active, update plan dynamically
        if self._emergency_plan_id:
            await self._update_emergency_plan()
            await self._check_soc_maintenance()

    async def _check_weather_warning(self) -> None:
        """Check ČHMÚ sensor for weather warnings."""
        # Get ČHMÚ sensor state
        sensor = self.hass.states.get(self.config.chmu_sensor_id)
        if not sensor:
            self._logger.warning(f"ČHMÚ sensor {self.config.chmu_sensor_id} not found")
            return

        warning_state = sensor.state.lower()

        # Check if warning is active
        if warning_state in ["unknown", "unavailable", "none", "inactive"]:
            # No warning
            if self._active_warning:
                # Warning ended
                self._logger.info(f"Weather warning ended: {self._active_warning}")
                await self._deactivate_emergency()
            return

        # Warning detected
        if (
            self.config.emergency_levels
            and warning_state in self.config.emergency_levels
        ):
            if self._active_warning != warning_state:
                # New warning or level change
                self._logger.warning(
                    f"Weather warning detected: {warning_state} "
                    f"(previous: {self._active_warning})"
                )
                await self._activate_emergency(warning_state, sensor.attributes)

    async def _activate_emergency(
        self, warning_level: str, attributes: Dict[str, Any]
    ) -> None:
        """Activate emergency mode per BR-7.2.2.

        Args:
            warning_level: Warning level (yellow/orange/red)
            attributes: ČHMÚ sensor attributes
        """
        if not self.config.emergency_mode:
            self._logger.info("Emergency mode disabled, using normal capacity increase")
            return

        self._active_warning = warning_level
        self._warning_start = datetime.now()

        # Extract warning times from attributes
        warning_start_attr = attributes.get("warning_start")
        warning_end_attr = attributes.get("warning_end")

        if warning_start_attr:
            try:
                self._warning_start = datetime.fromisoformat(warning_start_attr)
            except Exception as e:
                self._logger.error(f"Error parsing warning_start: {e}")

        # Calculate initial holding duration
        if warning_end_attr:
            try:
                warning_end = datetime.fromisoformat(warning_end_attr)
                duration_hours = int(
                    (warning_end - self._warning_start).total_seconds() / 3600
                )
            except Exception as e:
                self._logger.error(f"Error parsing warning_end: {e}")
                duration_hours = 24  # Default 24h
        else:
            duration_hours = 24  # Default if no end time

        self._logger.info(
            f"Activating emergency: warning_start={self._warning_start}, "
            f"initial_duration={duration_hours}h"
        )

        # Create emergency plan
        plan = self.plan_manager.create_weather_plan(
            warning_start=self._warning_start,
            warning_duration_hours=duration_hours,
            chmu_sensor_state=warning_level,
        )

        # Activate plan
        self.plan_manager.activate_plan(plan.plan_id)
        self._emergency_plan_id = plan.plan_id

        self._logger.info(f"Emergency plan activated: {plan.plan_id}")

    async def _deactivate_emergency(self) -> None:
        """Deactivate emergency mode."""
        if self._emergency_plan_id:
            # Deactivate emergency plan
            self.plan_manager.deactivate_plan(self._emergency_plan_id)
            self._logger.info(f"Emergency plan deactivated: {self._emergency_plan_id}")
            self._emergency_plan_id = None

        # Reset state
        self._active_warning = None
        self._warning_start = None

        # Return to automatic planning
        await self._create_automatic_plan()

    async def _update_emergency_plan(self) -> None:
        """Update emergency plan dynamically per BR-7.2.2.

        Re-calculate remaining holding duration based on current ČHMÚ sensor state.
        """
        if not self._emergency_plan_id:
            return

        # Get current ČHMÚ sensor
        sensor = self.hass.states.get(self.config.chmu_sensor_id)
        if not sensor:
            self._logger.warning("ČHMÚ sensor not available for update")
            return

        # Check if warning still active
        warning_state = sensor.state.lower()
        if (
            not self.config.emergency_levels
            or warning_state not in self.config.emergency_levels
        ):
            # Warning ended
            self._logger.info("Warning ended during update check")
            await self._deactivate_emergency()
            return

        # Calculate remaining duration
        now = datetime.now()

        # Try to get warning_end from sensor
        warning_end_attr = sensor.attributes.get("warning_end")
        if warning_end_attr:
            try:
                warning_end = datetime.fromisoformat(warning_end_attr)
                remaining_hours = max(
                    1, int((warning_end - now).total_seconds() / 3600)
                )
            except Exception as e:
                self._logger.error(f"Error parsing warning_end for update: {e}")
                remaining_hours = 12  # Default fallback
        else:
            # No end time: use default
            remaining_hours = 12

        self._logger.info(
            f"Updating emergency plan: remaining_duration={remaining_hours}h"
        )

        # Create new emergency plan with updated duration
        plan = self.plan_manager.create_weather_plan(
            warning_start=now,  # New target_time = now
            warning_duration_hours=remaining_hours,
            chmu_sensor_state=warning_state,
        )

        # Activate new plan (replaces old one)
        self.plan_manager.activate_plan(plan.plan_id)
        self._emergency_plan_id = plan.plan_id

        self._logger.info(f"Emergency plan updated: {plan.plan_id}")

    async def _check_soc_maintenance(self) -> None:
        """Check and maintain SoC during emergency holding per BR-7.2.2.

        If SoC drops below 100%, switch to UPS to recharge.
        """
        if not self._emergency_plan_id:
            return

        # Get current battery SoC
        current_soc = await self._get_current_soc_percent()
        if current_soc is None:
            self._logger.warning("Cannot get current SoC for maintenance check")
            return

        # Check if SoC dropped below threshold
        if current_soc < SOC_MAINTENANCE_THRESHOLD:
            self._logger.warning(
                f"SoC maintenance triggered: SoC={current_soc:.1f}% < "
                f"threshold={SOC_MAINTENANCE_THRESHOLD}%"
            )

            # Switch to UPS mode to recharge
            await self._switch_to_ups_mode()
        else:
            # SoC OK: ensure HOME III mode
            await self._ensure_home_iii_mode()

    async def _switch_to_ups_mode(self) -> None:
        """Switch to UPS mode for SoC maintenance."""
        try:
            # Call service to set CBB mode to UPS
            await self.hass.services.async_call(
                "oig_cloud",
                "set_cbb_mode",
                {
                    "box_id": self.plan_manager.box_id,
                    "mode": HOME_UPS,
                    "reason": "weather_emergency_soc_maintenance",
                },
            )
            self._logger.info("Switched to UPS mode for SoC maintenance")
        except Exception as e:
            self._logger.error(f"Error switching to UPS mode: {e}")

    async def _ensure_home_iii_mode(self) -> None:
        """Ensure HOME III mode during emergency holding."""
        try:
            # Get current mode
            current_mode = await self._get_current_mode()
            if current_mode != HOME_III:
                # Switch to HOME III
                await self.hass.services.async_call(
                    "oig_cloud",
                    "set_cbb_mode",
                    {
                        "box_id": self.plan_manager.box_id,
                        "mode": HOME_III,
                        "reason": "weather_emergency_holding",
                    },
                )
                self._logger.info("Switched to HOME III mode for emergency holding")
        except Exception as e:
            self._logger.error(f"Error ensuring HOME III mode: {e}")

    async def _create_automatic_plan(self) -> None:
        """Create new automatic plan after emergency ends."""
        try:
            plan = self.plan_manager.create_automatic_plan()
            self.plan_manager.activate_plan(plan.plan_id)
            self._logger.info(f"Returned to automatic planning: {plan.plan_id}")
        except Exception as e:
            self._logger.error(f"Error creating automatic plan: {e}")

    async def _get_current_soc_percent(self) -> Optional[float]:
        """Get current battery SoC in percent."""
        try:
            sensor_id = f"sensor.oig_{self.plan_manager.box_id}_battery_soc_percent"
            state = self.hass.states.get(sensor_id)
            if state and state.state not in ["unknown", "unavailable"]:
                return float(state.state)
        except Exception as e:
            self._logger.error(f"Error getting current SoC: {e}")
        return None

    async def _get_current_mode(self) -> Optional[int]:
        """Get current CBB mode."""
        try:
            sensor_id = f"sensor.oig_{self.plan_manager.box_id}_cbb_mode"
            state = self.hass.states.get(sensor_id)
            if state and state.state not in ["unknown", "unavailable"]:
                return int(state.state)
        except Exception as e:
            self._logger.error(f"Error getting current mode: {e}")
        return None
