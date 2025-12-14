"""Simplified Battery Balancing Sensor - reads data from BalancingManager.

This sensor only displays information, all planning logic is in BalancingManager.
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.util import dt as dt_util

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class OigCloudBatteryBalancingSensor(RestoreEntity, CoordinatorEntity, SensorEntity):
    """Battery balancing status sensor - displays BalancingManager state."""

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        """Initialize the battery balancing sensor."""
        super().__init__(coordinator)

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._device_info = device_info
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        # Box ID (stabilní: config entry → proxy → coordinator numeric keys)
        try:
            from .oig_cloud_sensor import resolve_box_id

            self._box_id = resolve_box_id(coordinator)
        except Exception:
            self._box_id = "unknown"

        # Entity setup
        self._attr_unique_id = f"oig_cloud_{self._box_id}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:battery-heart-variant"
        self._attr_native_unit_of_measurement = None
        self._attr_device_class = None
        self._attr_state_class = None
        self._attr_entity_category = EntityCategory.DIAGNOSTIC

        # Název senzoru
        from .sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or sensor_type

        # Cached state
        self._last_balancing: Optional[datetime] = None
        self._days_since_last: int = 99
        self._status: str = "unknown"
        self._current_state: str = "standby"
        self._planned_window: Optional[Dict[str, Any]] = None
        self._last_planning_check: Optional[datetime] = None

        # Cost tracking
        self._cost_immediate: Optional[float] = None
        self._cost_selected: Optional[float] = None
        self._cost_savings: Optional[float] = None

        # Configuration parameters
        self._cycle_days: int = 7
        self._holding_hours: int = 3
        self._soc_threshold: int = 80

    def _get_balancing_manager(self) -> Optional[Any]:
        """Get BalancingManager from hass.data."""
        if not self._hass:
            return None

        try:
            entry_data = self._hass.data.get(DOMAIN, {}).get(
                self._config_entry.entry_id, {}
            )
            return entry_data.get("balancing_manager")
        except Exception as e:
            _LOGGER.debug(f"Could not get BalancingManager: {e}")
            return None

    def _update_from_manager(self) -> None:
        """Update sensor state from BalancingManager."""
        manager = self._get_balancing_manager()
        if not manager:
            self._status = "unknown"
            return

        # Get last balancing timestamp
        self._last_balancing = manager._last_balancing_ts

        # Calculate days since last balancing
        if self._last_balancing:
            delta = dt_util.now() - self._last_balancing
            self._days_since_last = delta.days
        else:
            self._days_since_last = 99

        # Get cost tracking data
        self._cost_immediate = getattr(manager, "_last_immediate_cost", None)
        self._cost_selected = getattr(manager, "_last_selected_cost", None)
        self._cost_savings = getattr(manager, "_last_cost_savings", None)

        # Get config parameters
        self._cycle_days = manager._get_cycle_days()
        self._holding_hours = manager._get_holding_time_hours()
        self._soc_threshold = manager._get_soc_threshold()

        # Get active plan
        active_plan = manager._active_plan
        if active_plan:
            self._planned_window = {
                "mode": active_plan.mode.name,
                "priority": active_plan.priority.name,
                "holding_start": active_plan.holding_start,
                "holding_end": active_plan.holding_end,
                "reason": active_plan.reason,
                "intervals": [
                    {
                        "ts": interval.ts,
                        "mode": interval.mode,
                    }
                    for interval in (active_plan.intervals or [])
                ],
            }

            # Determine status based on plan mode
            if active_plan.mode.name == "natural":
                self._status = "natural"
            elif active_plan.mode.name == "forced":
                self._status = "forced"
            elif active_plan.mode.name == "opportunistic":
                self._status = "opportunistic"
            else:
                self._status = "unknown"
        else:
            self._planned_window = None

            # Determine status based on days
            if self._days_since_last >= self._cycle_days:
                self._status = "overdue"
            elif self._days_since_last >= (self._cycle_days - 2):
                self._status = "opportunistic"
            else:
                self._status = "ok"

        # Current state - simplified (would need more logic to detect charging/balancing)
        self._current_state = "standby"

        # Last planning check - use current time
        self._last_planning_check = datetime.now()

    @property
    def native_value(self) -> str:
        """Return the state of the sensor."""
        return self._status

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return sensor attributes."""
        attrs = {
            "last_balancing": (
                self._last_balancing.isoformat() if self._last_balancing else None
            ),
            "days_since_last": self._days_since_last,
            "status": self._status,
            "current_state": self._current_state,
            "planned": self._planned_window,
            "last_planning_check": (
                self._last_planning_check.isoformat()
                if self._last_planning_check
                else None
            ),
            # Configuration
            "cycle_days": getattr(self, "_cycle_days", 7),
            "holding_hours": getattr(self, "_holding_hours", 3),
            "soc_threshold": getattr(self, "_soc_threshold", 80),
            # Cost tracking
            "cost_immediate_czk": getattr(self, "_cost_immediate", None),
            "cost_selected_czk": getattr(self, "_cost_selected", None),
            "cost_savings_czk": getattr(self, "_cost_savings", None),
        }
        return attrs

    @property
    def device_info(self) -> Dict[str, Any]:
        """Return device info."""
        return self._device_info

    def _handle_coordinator_update(self) -> None:
        """Handle updated data from the coordinator."""
        self._update_from_manager()
        super()._handle_coordinator_update()

    async def async_update(self) -> None:
        """Update sensor state."""
        self._update_from_manager()

    async def async_added_to_hass(self) -> None:
        """When entity is added to hass."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # Initial update
        self._update_from_manager()
