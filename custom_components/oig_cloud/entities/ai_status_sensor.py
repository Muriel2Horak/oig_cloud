"""Sensor exposing sanitized AI key and provider status."""
from __future__ import annotations

import logging
from typing import Any, Dict

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.device_registry import DeviceInfo

from ..ai.backends import PROVIDERS
from ..ai.backoff import AiBackoffState, get_ai_backoff_state
from ..ai.key_store import AiKeyStore
from ..const import DEFAULT_NAME, DOMAIN

_LOGGER = logging.getLogger(__name__)

SAFE_ERROR_CODES = frozenset({
    "no_credits",
    "auth",
    "provider_unreachable",
    "timeout",
    "invalid_response",
    "error",
})


class OigCloudAiStatusSensor(SensorEntity):
    """Show the sanitized AI status for an OIG Cloud config entry."""

    _attr_has_entity_name = True
    _attr_native_unit_of_measurement = None
    _attr_icon = "mdi:brain"

    def __init__(
        self,
        hass: Any,
        entry: Any,
        box_id: str,
        key_store: Any | None = None,
        backoff_state: AiBackoffState | None = None,
    ) -> None:
        self.hass = hass
        self.entry = entry
        self._box_id = box_id
        self._key_store = key_store
        self._backoff_state = backoff_state or get_ai_backoff_state(hass)
        self._api_state: Dict[str, Any] = {
            "provider": None,
            "key_set": False,
            "verified": False,
        }
        self._attr_name = "AI status"
        self._attr_unique_id = f"oig_cloud_{self._box_id}_ai_status"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, self._box_id)},
            name=f"{DEFAULT_NAME} {self._box_id}",
            manufacturer="OIG",
            model=DEFAULT_NAME,
        )
        self.entity_id = f"sensor.oig_{self._box_id}_ai_status"

    @property
    def native_value(self) -> str:
        if not self._key_set:
            return "not_configured"

        last_error_code = self._last_error_code
        if last_error_code == "no_credits":
            return "no_credits"

        backoff = self._backoff_state.snapshot(self.entry.entry_id, self._provider)
        if backoff.state == "backing_off":
            return "backing_off"

        if last_error_code:
            return "error"

        if self._verified:
            return "verified"
        return "unverified"

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        attrs: Dict[str, Any] = {
            "provider": self._provider,
            "last_error_code": self._last_error_code,
        }
        backoff = self._backoff_state.snapshot(self.entry.entry_id, self._provider)
        if backoff.state == "backing_off":
            attrs["next_probe_at"] = backoff.next_probe_at
        return attrs

    async def async_update(self) -> None:
        try:
            if self._key_store is None:
                self._key_store = AiKeyStore(self.hass, self.entry.entry_id)
            self._api_state = await self._key_store.async_api_state()
        except Exception as err:
            _LOGGER.debug("Failed to refresh AI status sensor: %s", type(err).__name__)
            self._api_state = {
                "provider": None,
                "key_set": False,
                "verified": False,
            }

    async def async_added_to_hass(self) -> None:
        await self.async_update()
        await super().async_added_to_hass()

    @property
    def _provider(self) -> str | None:
        provider = self._api_state.get("provider")
        if provider in PROVIDERS:
            return provider
        return None

    @property
    def _key_set(self) -> bool:
        return bool(self._api_state.get("key_set"))

    @property
    def _verified(self) -> bool:
        return bool(self._api_state.get("verified"))

    @property
    def _last_error_code(self) -> str | None:
        domain_data = getattr(self.hass, "data", {}).get(DOMAIN, {})
        entry_data = domain_data.get(self.entry.entry_id, {})
        raw_code = entry_data.get("ai_last_error_code")
        if raw_code is None:
            return None
        if raw_code in SAFE_ERROR_CODES:
            return raw_code
        return "error"
