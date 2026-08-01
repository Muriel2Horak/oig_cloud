"""Sensor exposing the latest hourly AI-eval report for a box."""
from __future__ import annotations

import logging
from typing import Any, Callable, Dict, Optional

from homeassistant.components.sensor import SensorEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo

from ..const import DEFAULT_NAME, DOMAIN

_LOGGER = logging.getLogger(__name__)

_FROZEN_ATTR_KEYS = ("report_fakta", "report_lidsky", "ledger", "last_run")


class OigCloudAiEvalSensor(SensorEntity):
    """Expose the latest hourly AI-eval report from the coordinator's Store."""

    _attr_has_entity_name = True
    _attr_native_unit_of_measurement = None
    _attr_icon = "mdi:clipboard-check-outline"

    def __init__(
        self,
        hass: HomeAssistant,
        entry: Any,
        box_id: str,
    ) -> None:
        self.hass = hass
        self.entry = entry
        self._box_id = box_id
        self._attr_name = "AI eval"
        self._attr_unique_id = f"oig_cloud_{self._box_id}_ai_eval"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, self._box_id)},
            name=f"{DEFAULT_NAME} {self._box_id}",
            manufacturer="OIG",
            model=DEFAULT_NAME,
        )
        self.entity_id = f"sensor.oig_{self._box_id}_ai_eval"
        self._report: Dict[str, Any] = {}
        self._unsub: Optional[Callable[[], None]] = None

    @property
    def available(self) -> bool:
        return bool(self._report)

    @property
    def native_value(self) -> Optional[str]:
        if not self._report:
            return None
        anomaly_count = self._report.get("anomaly_count")
        if anomaly_count is None:
            return None
        if int(anomaly_count) == 0:
            last_run = self._report.get("last_run")
            return str(last_run) if last_run is not None else "0"
        return str(int(anomaly_count))

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        return {key: self._report.get(key) for key in _FROZEN_ATTR_KEYS}

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        await self._async_reload_store()

        from homeassistant.helpers.dispatcher import async_dispatcher_connect

        signal = f"oig_cloud_ai_eval_update_{self.entry.entry_id}"

        @callback
        def _on_signal(*_args: Any) -> None:
            self.hass.async_create_task(self._async_reload_store())

        self._unsub = async_dispatcher_connect(self.hass, signal, _on_signal)

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub is not None:
            try:
                self._unsub()
            except Exception:
                pass
            self._unsub = None
        await super().async_will_remove_from_hass()

    async def _async_reload_store(self) -> None:
        try:
            from homeassistant.helpers.storage import Store

            store: Store = Store(
                self.hass, 1, f"oig_cloud.ai_eval_{self.entry.entry_id}"
            )
            data = await store.async_load()
            self._report = dict(data) if isinstance(data, dict) else {}
        except Exception as err:
            _LOGGER.debug("AI-eval sensor store read failed: %s", type(err).__name__)
            self._report = {}
        self.async_write_ha_state()

    async def _async_reload_store_with_data(self, data: Dict[str, Any]) -> None:
        self._report = dict(data) if isinstance(data, dict) else {}
        self.async_write_ha_state()
