"""Sensor pro správu vyrovnání článků baterie (battery cell balancing)."""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.util import dt as dt_util
from homeassistant.const import EntityCategory

_LOGGER = logging.getLogger(__name__)


class OigCloudBatteryBalancingSensor(CoordinatorEntity, SensorEntity):
    """Sensor pro správu vyrovnání článků baterie."""

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

        # Nastavit hass - priorita: parametr > coordinator.hass
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        # Získání box_id z coordinator.data
        self._data_key = "unknown"
        if (
            coordinator
            and coordinator.data
            and isinstance(coordinator.data, dict)
            and coordinator.data
        ):
            self._data_key = list(coordinator.data.keys())[0]
            _LOGGER.debug(f"Battery balancing got box_id: {self._data_key}")
        else:
            _LOGGER.warning(
                "Battery balancing: coordinator has no data, using box_id='unknown'"
            )

        # Nastavit atributy senzoru
        self._box_id = self._data_key
        self._attr_unique_id = f"oig_cloud_{self._data_key}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:battery-heart-variant"
        self._attr_native_unit_of_measurement = None
        self._attr_device_class = None
        self._attr_state_class = None
        self._attr_entity_category = EntityCategory.DIAGNOSTIC

        # Načíst název ze sensor types
        from .sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or sensor_type

        # Balancing state
        self._last_balancing: Optional[datetime] = None
        self._days_since_last: int = 99  # Vysoké číslo = neznámé
        self._status: str = "unknown"
        self._planned_window: Optional[Dict[str, Any]] = None

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA."""
        await super().async_added_to_hass()
        self._hass = self.hass
        
        # TODO: Načíst uložený stav (last_balancing z attributes)
        # TODO: Spustit detekci z historie

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA."""
        await super().async_will_remove_from_hass()

    def _handle_coordinator_update(self) -> None:
        """Handle updated data from the coordinator."""
        try:
            _LOGGER.debug(f"Battery balancing update triggered for {self._box_id}")
            
            # TODO: Implementovat business logiku
            # 1. Detekce posledního balancování z historie
            # 2. Výpočet days_since
            # 3. Planning logiku (opportunistic/economic/forced)
            # 4. Update attributes
            
            # Pro teď jen placeholder
            self._update_balancing_status()
            
            self.async_write_ha_state()
            
        except Exception as e:
            _LOGGER.error(f"Error updating battery balancing sensor: {e}", exc_info=True)

    def _update_balancing_status(self) -> None:
        """Update balancing status - placeholder."""
        # TODO: Implementovat skutečnou logiku
        self._status = "ok"
        self._days_since_last = 3

    @property
    def native_value(self) -> str:
        """Return the state of the sensor."""
        return self._status

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return the state attributes."""
        attrs: Dict[str, Any] = {
            "days_since_last": self._days_since_last,
            "last_balancing": self._last_balancing.isoformat() if self._last_balancing else None,
        }
        
        # Config from config_entry
        config = self._get_balancing_config()
        attrs["config"] = config
        
        # Planned window if exists
        if self._planned_window:
            attrs["planned"] = self._planned_window
        
        return attrs

    def _get_balancing_config(self) -> Dict[str, Any]:
        """Get balancing configuration from config_entry."""
        battery_config = self._config_entry.data.get("battery", {})
        
        return {
            "enabled": battery_config.get("balancing_enabled", True),
            "interval_days": battery_config.get("balancing_interval_days", 7),
            "hold_hours": battery_config.get("balancing_hold_hours", 3),
            "opportunistic_threshold": battery_config.get("balancing_opportunistic_threshold", 1.1),
            "economic_threshold": battery_config.get("balancing_economic_threshold", 2.5),
        }

    @property
    def device_info(self) -> Dict[str, Any]:
        """Return device info."""
        return self._device_info
