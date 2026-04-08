"""Runtime helpers for OIG Cloud sensors."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass
from homeassistant.const import EntityCategory
from homeassistant.helpers.device_registry import DeviceInfo

from ..const import DEFAULT_NAME, DOMAIN
from .sensor_setup import get_sensor_definition

if TYPE_CHECKING:  # pragma: no cover
    from homeassistant.core import HomeAssistant


class _EntityBase:
    """Stub for parent class to satisfy super().async_update() call."""

    async def async_update(self) -> None:
        """Cooperative super call to support MRO chaining."""
        # Use super() to ensure cooperative multiple inheritance works
        # when this class is mixed with concrete implementations
        parent = super()
        method = getattr(parent, "async_update", None)
        if method is None:
            return
        result = method()
        if result is not None:
            await result


_LOGGER = logging.getLogger(__name__)


class OigCloudSensorRuntimeMixin(_EntityBase):
    """Runtime properties for OIG Cloud sensors."""

    hass: "HomeAssistant"
    entity_id: str
    _node_id: Optional[str]
    _box_id: str
    _sensor_type: str
    _node_key: Optional[str]

    def _get_runtime_coordinator(self) -> Any:
        return getattr(self, "_coordinator", getattr(self, "coordinator", None))

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        coordinator = self._get_runtime_coordinator()
        if coordinator is None:
            return False
        if not coordinator.last_update_success or not coordinator.data:
            return False

        if self._node_id is not None:
            box_id = self._box_id
            if not box_id or box_id == "unknown":
                return False
            box_data = (
                coordinator.data.get(box_id, {})
                if isinstance(coordinator.data, dict)
                else {}
            )
            if self._node_id not in box_data:
                return False

        return True

    @property
    def entity_category(self) -> Optional[EntityCategory]:
        """Return the entity category of the sensor."""
        value = get_sensor_definition(self._sensor_type).get("entity_category")
        if isinstance(value, EntityCategory):
            return value
        if isinstance(value, str):
            try:
                return EntityCategory(value)
            except ValueError:
                return None
        return None

    @property
    def unique_id(self) -> str:
        """Return a unique ID for this entity."""
        return f"oig_cloud_{self._box_id}_{self._sensor_type}"

    @property
    def device_info(self) -> DeviceInfo:
        """Return information about the device."""
        coordinator = self._get_runtime_coordinator()
        box_id = self._box_id
        data: Dict[str, Any] = coordinator.data if coordinator and coordinator.data else {}
        pv_data: Dict[str, Any] = data.get(box_id, {}) if isinstance(data, dict) else {}

        is_queen: bool = bool(pv_data.get("queen", False))
        model_name: str = f"{DEFAULT_NAME} {'Queen' if is_queen else 'Home'}"

        sensor_def = get_sensor_definition(self._sensor_type)
        sensor_category = sensor_def.get("sensor_type_category")

        if sensor_category == "shield":
            return DeviceInfo(
                identifiers={(DOMAIN, f"{self._box_id}_shield")},
                name=f"ServiceShield {self._box_id}",
                manufacturer="OIG",
                model="Shield",
                via_device=(DOMAIN, self._box_id),
            )

        if sensor_category in ["statistics", "solar_forecast", "pricing"]:
            return DeviceInfo(
                identifiers={(DOMAIN, f"{self._box_id}_analytics")},
                name=f"Analytics & Predictions {self._box_id}",
                manufacturer="OIG",
                model="Analytics Module",
                via_device=(DOMAIN, self._box_id),
            )

        return DeviceInfo(
            identifiers={(DOMAIN, self._box_id)},
            name=f"{model_name} {self._box_id}",
            manufacturer="OIG",
            model=model_name,
            sw_version=pv_data.get("box_prms", {}).get("sw", None),
        )

    @property
    def should_poll(self) -> bool:
        """Return False as entity should not poll on its own."""
        return False

    @property
    def options(self) -> Optional[List[str]]:
        """Return the options for this sensor if applicable."""
        return get_sensor_definition(self._sensor_type).get("options")

    @property
    def name(self) -> str:
        """Return the name of the sensor."""
        language: str = self.hass.config.language
        if language == "cs":
            return get_sensor_definition(self._sensor_type).get(
                "name_cs", get_sensor_definition(self._sensor_type)["name"]
            )
        return get_sensor_definition(self._sensor_type)["name"]

    @property
    def icon(self) -> Optional[str]:
        """Return the icon for the sensor."""
        return get_sensor_definition(self._sensor_type).get("icon")

    @property
    def device_class(self) -> Optional[SensorDeviceClass]:
        """Return the device class."""
        value = get_sensor_definition(self._sensor_type).get("device_class")
        if isinstance(value, SensorDeviceClass):
            return value
        if isinstance(value, str):
            try:
                return SensorDeviceClass(value)
            except ValueError:
                return None
        return None

    @property
    def state_class(self) -> Optional[SensorStateClass]:
        """Return the state class of the sensor."""
        value = get_sensor_definition(self._sensor_type).get("state_class")
        if isinstance(value, SensorStateClass):
            return value
        if isinstance(value, str):
            try:
                return SensorStateClass(value)
            except ValueError:
                return None
        return None

    def get_node_value(self) -> Any:
        """Safely extract node value from coordinator data."""
        coordinator = self._get_runtime_coordinator()
        if coordinator is None or not coordinator.data or not self._node_id or not self._node_key:
            return None

        box_id = self._box_id
        if not box_id or box_id == "unknown":
            return None
        try:
            data: Dict[str, Any] = (
                coordinator.data if isinstance(coordinator.data, dict) else {}
            )
            return data[box_id][self._node_id][self._node_key]
        except (KeyError, TypeError):
            _LOGGER.debug(
                "Could not find %s.%s in data for sensor %s",
                self._node_id,
                self._node_key,
                self.entity_id,
            )
            return None

    async def async_update(self) -> None:
        """Update the sensor."""
        await super().async_update()
