"""Boiler sensors for OIG Cloud integration."""

from __future__ import annotations

import logging
from typing import Any, Optional

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfEnergy
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from ..const import DOMAIN
from .boiler_coordinator import BoilerCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_boiler_sensors(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
    coordinator: BoilerCoordinator,
) -> None:
    """Set up boiler sensors.

    Args:
        hass: Home Assistant instance
        config_entry: Config entry
        async_add_entities: Callback to add entities
        coordinator: Boiler coordinator
    """
    entities = [
        BoilerEnergyRequiredSensor(coordinator, config_entry),
        BoilerPlanCostSensor(coordinator, config_entry),
        BoilerSOCSensor(coordinator, config_entry),
        BoilerTemperatureTopSensor(coordinator, config_entry),
    ]

    async_add_entities(entities)
    _LOGGER.info(f"Added {len(entities)} boiler sensors")


class BoilerBaseSensor(CoordinatorEntity[BoilerCoordinator], SensorEntity):
    """Base class for boiler sensors."""

    def __init__(
        self,
        coordinator: BoilerCoordinator,
        config_entry: ConfigEntry,
        sensor_type: str,
    ) -> None:
        """Initialize sensor.

        Args:
            coordinator: Boiler coordinator
            config_entry: Config entry
            sensor_type: Sensor type identifier
        """
        super().__init__(coordinator)
        self._attr_has_entity_name = True
        self._attr_unique_id = f"{config_entry.entry_id}_boiler_{sensor_type}"
        self._entry_id = config_entry.entry_id

    @property
    def device_info(self) -> dict[str, Any]:
        """Return device info."""
        return {
            "identifiers": {(DOMAIN, f"{self._entry_id}_boiler")},
            "name": "OIG Bojler",
            "manufacturer": "OIG Cloud",
            "model": "Boiler Module",
            "sw_version": "1.0",
        }


class BoilerEnergyRequiredSensor(BoilerBaseSensor):
    """Sensor for energy required to heat boiler."""

    def __init__(
        self,
        coordinator: BoilerCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize sensor."""
        super().__init__(coordinator, config_entry, "energy_required")
        self._attr_name = "Požadovaná energie"
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_icon = "mdi:water-boiler"

    @property
    def native_value(self) -> Optional[float]:
        """Return the state."""
        if not self.coordinator.data:
            return None
        state_data = self.coordinator.data.get("state", {})
        return state_data.get("energy_required_kwh")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return extra attributes."""
        if not self.coordinator.data:
            return {}

        state_data = self.coordinator.data.get("state", {})
        attrs = {
            "volume_l": self.coordinator.config.volume_l,
            "target_temp_c": self.coordinator.config.target_temp_c,
            "cold_temp_c": self.coordinator.config.cold_inlet_temp_c,
            "energy_now_kwh": state_data.get("energy_now_kwh"),
            "energy_target_kwh": state_data.get("energy_target_kwh"),
            "soc_percent": state_data.get("soc_percent"),
            "temp_top_c": state_data.get("temp_top_c"),
            "temp_bottom_c": state_data.get("temp_bottom_c"),
            "method": state_data.get("method"),
            "updated_at": state_data.get("updated_at"),
            "profile_url": self.coordinator.data.get("profile_url"),
        }

        return {k: v for k, v in attrs.items() if v is not None}


class BoilerPlanCostSensor(BoilerBaseSensor):
    """Sensor for boiler heating plan cost."""

    def __init__(
        self,
        coordinator: BoilerCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize sensor."""
        super().__init__(coordinator, config_entry, "plan_cost")
        self._attr_name = "Cena plánu ohřevu"
        self._attr_native_unit_of_measurement = "Kč"
        self._attr_icon = "mdi:cash"
        self._attr_state_class = SensorStateClass.MEASUREMENT

    @property
    def native_value(self) -> Optional[float]:
        """Return the state."""
        if not self.coordinator.data:
            return None
        plan_data = self.coordinator.data.get("plan", {})
        return plan_data.get("total_cost_czk")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return extra attributes."""
        if not self.coordinator.data:
            return {}

        plan_data = self.coordinator.data.get("plan", {})
        attrs = {
            "total_energy_kwh": plan_data.get("total_energy_kwh"),
            "deadline": plan_data.get("deadline"),
            "use_alternative": plan_data.get("use_alternative"),
            "slots_count": plan_data.get("slots_count"),
            "slots": plan_data.get("slots", []),
            "created_at": plan_data.get("created_at"),
            "plan_url": self.coordinator.data.get("plan_url"),
        }

        return {k: v for k, v in attrs.items() if v is not None}


class BoilerSOCSensor(BoilerBaseSensor):
    """Sensor for boiler state of charge."""

    def __init__(
        self,
        coordinator: BoilerCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize sensor."""
        super().__init__(coordinator, config_entry, "soc")
        self._attr_name = "Stav nabití"
        self._attr_native_unit_of_measurement = "%"
        self._attr_icon = "mdi:water-percent"
        self._attr_state_class = SensorStateClass.MEASUREMENT

    @property
    def native_value(self) -> Optional[float]:
        """Return the state."""
        if not self.coordinator.data:
            return None
        state_data = self.coordinator.data.get("state", {})
        return state_data.get("soc_percent")


class BoilerTemperatureTopSensor(BoilerBaseSensor):
    """Sensor for boiler top temperature."""

    def __init__(
        self,
        coordinator: BoilerCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize sensor."""
        super().__init__(coordinator, config_entry, "temperature_top")
        self._attr_name = "Teplota nahoře"
        self._attr_device_class = SensorDeviceClass.TEMPERATURE
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_native_unit_of_measurement = "°C"
        self._attr_icon = "mdi:thermometer"

    @property
    def native_value(self) -> Optional[float]:
        """Return the state."""
        if not self.coordinator.data:
            return None
        state_data = self.coordinator.data.get("state", {})
        return state_data.get("temp_top_c")
