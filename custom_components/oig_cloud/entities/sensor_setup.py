"""Setup helpers for OIG Cloud sensors."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

_LOGGER = logging.getLogger(__name__)


def resolve_box_id(coordinator: Any) -> str:
    """Resolve the real box_id/inverter_sn and ignore helper keys."""
    try:
        forced = _resolve_forced_box_id(coordinator)
        if forced:
            return forced

        entry = getattr(coordinator, "config_entry", None)
        entry_box = _resolve_from_entry(entry)
        if entry_box:
            return entry_box

        hass = getattr(coordinator, "hass", None)
        proxy_box = _resolve_from_proxy_sensor(hass)
        if proxy_box:
            return proxy_box

        registry_box = _resolve_from_registry(hass)
        if registry_box:
            return registry_box

        data_box = _resolve_from_data(coordinator)
        if data_box:
            return data_box
    except Exception as err:
        _LOGGER.debug("Failed to resolve box_id from coordinator data: %s", err)

    return "unknown"


def _extract_digits(text: Any) -> Optional[str]:
    if not isinstance(text, str):
        return None
    import re

    m = re.search(r"(\\d{6,})", text)
    return m.group(1) if m else None


def _is_valid_box_id(val: Any) -> bool:
    return isinstance(val, str) and val.isdigit()


def _resolve_forced_box_id(coordinator: Any) -> Optional[str]:
    forced = getattr(coordinator, "forced_box_id", None)
    return forced if _is_valid_box_id(forced) else None


def _resolve_from_entry(entry: Any) -> Optional[str]:
    if not entry:
        return None
    for key in ("box_id", "inverter_sn"):
        if hasattr(entry, "options"):
            val = entry.options.get(key)
            if _is_valid_box_id(val):
                return val
        if hasattr(entry, "data"):
            val = entry.data.get(key)
            if _is_valid_box_id(val):
                return val
    from_title = _extract_digits(getattr(entry, "title", ""))
    return from_title if _is_valid_box_id(from_title) else None


def _resolve_from_proxy_sensor(hass: Any) -> Optional[str]:
    if not hass:
        return None
    try:
        state = hass.states.get(
            "sensor.oig_local_oig_proxy_proxy_status_box_device_id"
        )
        if state and _is_valid_box_id(state.state):
            return state.state
    except Exception as err:
        _LOGGER.debug("Failed to resolve box_id from proxy sensor: %s", err)
    return None


def _resolve_from_registry(hass: Any) -> Optional[str]:
    if not hass:
        return None
    try:
        import re

        from homeassistant.helpers import entity_registry as er

        reg = er.async_get(hass)
        ids: set[str] = set()
        pat = re.compile(r"^sensor\\.oig_local_(\\d+)_")
        for ent in reg.entities.values():
            m = pat.match(ent.entity_id)
            if m:
                ids.add(m.group(1))
        if len(ids) == 1:
            return next(iter(ids))
    except Exception as err:
        _LOGGER.debug("Failed to resolve box_id from entity registry: %s", err)
    return None


def _resolve_from_data(coordinator: Any) -> Optional[str]:
    data = getattr(coordinator, "data", None)
    if isinstance(data, dict) and data:
        numeric = next((str(k) for k in data.keys() if str(k).isdigit()), None)
        if numeric:
            return numeric
    return None


def get_sensor_definition(sensor_type: str) -> Dict[str, Any]:
    """Load sensor definition from SENSOR_TYPES."""
    try:
        from ..sensor_types import SENSOR_TYPES

        if sensor_type in SENSOR_TYPES:
            definition = SENSOR_TYPES[sensor_type]
            if "unit_of_measurement" in definition and "unit" not in definition:
                definition["unit"] = definition["unit_of_measurement"]
            return definition
    except ImportError:
        pass

    _LOGGER.error("Sensor type '%s' not found in SENSOR_TYPES!", sensor_type)
    return {
        "name": sensor_type,
        "unit": None,
        "icon": "mdi:help",
        "device_class": None,
        "state_class": None,
        "sensor_type_category": "unknown",
    }
