"""Write box settings through the OIG Proxy while the integration reads locally.

The proxy publishes every writable box parameter as an MQTT entity whose
unique_id is ``oig_local_<box>_<table>_<key>_cfg``; changing its value sends the
setting to the box. The read-only twin without ``_cfg`` reports what the box
actually holds.

Route rule: when the ``control_via_proxy`` option is on and the data source is
local (the same decision the integration uses for reading, which falls back to
cloud after ``local_proxy_stale_minutes``), writes go to the proxy. Otherwise
they go to the cloud as before. Operations the cloud cannot do (charge current,
battery export) fail with a reason in cloud mode.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er

from ..core.data_source import DATA_SOURCE_CLOUD_ONLY, get_data_source_state

_LOGGER = logging.getLogger(__name__)

CONF_CONTROL_VIA_PROXY = "control_via_proxy"
CONF_PROXY_MAX_CHARGE_CURRENT_A = "proxy_max_charge_current_a"
CONF_PROXY_EXPORT_LIMIT_W = "proxy_export_limit_w"

# Set by the service action on the shield params: which route carried the write.
ROUTE_KEY = "_route"
ROUTE_LOCAL = "local"
ROUTE_CLOUD = "cloud"
# Set by the shield when it retries a timed-out local write through the cloud.
FORCE_CLOUD_KEY = "_force_cloud"

KEY_BOX_MODE = "tbl_box_prms_mode"
KEY_CHARGE_CURRENT = "tbl_invertor_prm1_aac_max_chrg"
KEY_CHARGE_CURRENT_MAX = "tbl_invertor_prm1_a_max_chrg"
KEY_TO_GRID = "tbl_invertor_prms_to_grid"
KEY_EXPORT_LIMIT = "tbl_invertor_prm1_p_max_feed_grid"
KEY_GRID_PV_ON = "tbl_invertor_prms_grid_pv_on"
KEY_GRID_PV_OFF = "tbl_invertor_prms_grid_pv_off"
KEY_BOILER_MANUAL = "tbl_boiler_prms_manual"

PROXY_DOMAINS = ("select", "number", "switch", "sensor", "binary_sensor")

# Cloud numeric box mode -> option label of the proxy's box mode select.
BOX_MODE_OPTIONS = {"0": "Home 1", "1": "Home 2", "2": "Home 3", "3": "Home UPS"}
HOME_UPS_LABEL = "Home UPS"

_INVALID_STATES = (None, "", "unknown", "unavailable")


class ProxyControlError(HomeAssistantError):
    """A local write cannot be done; the message says why (Czech, user-facing)."""


def control_enabled(entry: ConfigEntry) -> bool:
    """True when the user turned on control through the proxy."""
    return bool((getattr(entry, "options", None) or {}).get(CONF_CONTROL_VIA_PROXY, False))


def entry_box_id(entry: ConfigEntry) -> Optional[str]:
    """Box id configured for the entry (the one the data source validates)."""
    box_id = (getattr(entry, "options", None) or {}).get("box_id")
    return str(box_id) if box_id else None


def local_route_available(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """True when the option is on and the data source currently reads locally."""
    if not control_enabled(entry):
        return False
    state = get_data_source_state(hass, entry.entry_id)
    return state.effective_mode != DATA_SOURCE_CLOUD_ONLY and bool(state.local_available)


def use_local_route(
    hass: HomeAssistant,
    entry: ConfigEntry,
    box_id: Optional[str],
    service_data: dict[str, Any],
) -> bool:
    """Decide the route of one write: proxy when local, cloud otherwise."""
    if service_data.get(FORCE_CLOUD_KEY):
        return False
    if not local_route_available(hass, entry):
        return False
    expected = entry_box_id(entry)
    # The proxy controls one box: the one the data source validated.
    return not (box_id and expected and str(box_id) != expected)


def require_local_route(hass: HomeAssistant, entry: ConfigEntry, what: str) -> None:
    """Raise with a reason when a proxy-only operation cannot run now."""
    if not control_enabled(entry):
        raise ProxyControlError(
            f"{what} jde jen přes OIG Proxy. Zapněte volbu „Řídit přes proxy“."
        )
    if not local_route_available(hass, entry):
        raise ProxyControlError(
            f"{what} jde jen přes OIG Proxy a integrace teď čte z cloudu."
        )


def _entity_registry(hass: HomeAssistant) -> Any:
    try:
        return er.async_get(hass)
    except (KeyError, AttributeError):  # registry missing in minimal setups
        return None


def find_proxy_entity(
    hass: HomeAssistant, box_id: str, key: str, *, control: bool
) -> Optional[str]:
    """Return the entity_id of a proxy entity, looked up by its stable unique_id.

    Entity ids are not stable: some carry the ``oig_local_`` prefix and some do
    not, depending on how HA named them. The unique_id always does.
    """
    suffix = "_cfg" if control else ""
    unique_id = f"oig_local_{box_id}_{key}{suffix}"
    registry = _entity_registry(hass)
    if registry is not None:
        for domain in PROXY_DOMAINS:
            entity_id = registry.async_get_entity_id(domain, "mqtt", unique_id)
            if entity_id:
                return entity_id
    for domain in PROXY_DOMAINS:
        for object_id in (f"oig_local_{box_id}_{key}{suffix}", f"{box_id}_{key}{suffix}"):
            candidate = f"{domain}.{object_id}"
            if hass.states.get(candidate) is not None:
                return candidate
    return None


def read_proxy_state(
    hass: HomeAssistant, box_id: str, key: str, *, control: bool = False
) -> Optional[str]:
    """State of a proxy entity, or None when missing, unknown or unavailable."""
    entity_id = find_proxy_entity(hass, box_id, key, control=control)
    if not entity_id:
        return None
    state = hass.states.get(entity_id)
    if state is None or state.state in _INVALID_STATES:
        return None
    return str(state.state)


def read_proxy_number(
    hass: HomeAssistant, box_id: str, key: str, *, control: bool = False
) -> Optional[float]:
    """Numeric state of a proxy entity, or None."""
    value = read_proxy_state(hass, box_id, key, control=control)
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


async def async_write(hass: HomeAssistant, box_id: str, key: str, value: Any) -> str:
    """Change a proxy ``_cfg`` entity; the proxy sends the setting to the box."""
    entity_id = find_proxy_entity(hass, box_id, key, control=True)
    if not entity_id:
        raise ProxyControlError(f"OIG Proxy nemá entitu {key}_cfg pro box {box_id}.")
    state = hass.states.get(entity_id)
    if state is None or state.state == "unavailable":
        raise ProxyControlError(f"Entita {entity_id} je nedostupná.")

    domain = entity_id.split(".", 1)[0]
    data: dict[str, Any] = {"entity_id": entity_id}
    if domain == "select":
        service = "select_option"
        data["option"] = str(value)
    elif domain == "number":
        service = "set_value"
        data["value"] = value
    elif domain == "switch":
        service = "turn_on" if value else "turn_off"
    else:
        raise ProxyControlError(f"Entitu {entity_id} nelze zapisovat.")

    _LOGGER.info("[OIG Proxy] %s.%s %s", domain, service, data)
    await hass.services.async_call(domain, service, data, blocking=True)
    return entity_id


def box_mode_is_ups(hass: HomeAssistant, box_id: str) -> bool:
    """True when the box itself reports Home UPS."""
    return read_proxy_state(hass, box_id, KEY_BOX_MODE) == HOME_UPS_LABEL


def _positive_option(entry: ConfigEntry, key: str) -> Optional[float]:
    try:
        value = float((getattr(entry, "options", None) or {}).get(key) or 0)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def charge_current_limit(
    hass: HomeAssistant, entry: ConfigEntry, box_id: str
) -> Optional[float]:
    """Highest allowed charge current: the box's own limit, then the user's cap."""
    candidates: list[float] = []
    box_limit = read_proxy_number(hass, box_id, KEY_CHARGE_CURRENT_MAX)
    if box_limit is None:
        box_limit = read_proxy_number(hass, box_id, KEY_CHARGE_CURRENT_MAX, control=True)
    if box_limit is not None and box_limit > 0:
        candidates.append(box_limit)
    entity_id = find_proxy_entity(hass, box_id, KEY_CHARGE_CURRENT, control=True)
    state = hass.states.get(entity_id) if entity_id else None
    entity_max = (getattr(state, "attributes", None) or {}).get("max") if state else None
    try:
        if entity_max is not None and float(entity_max) > 0:
            candidates.append(float(entity_max))
    except (TypeError, ValueError):
        pass
    user_cap = _positive_option(entry, CONF_PROXY_MAX_CHARGE_CURRENT_A)
    if user_cap is not None:
        candidates.append(user_cap)
    return min(candidates) if candidates else None


def validate_charge_current(
    hass: HomeAssistant, entry: ConfigEntry, box_id: str, amps: Any
) -> int:
    """Return the charge current as int, or raise when it is over the limit."""
    try:
        value = int(amps)
    except (TypeError, ValueError) as err:
        raise ProxyControlError(f"Neplatný nabíjecí proud: {amps}.") from err
    if value <= 0:
        raise ProxyControlError("Nabíjecí proud musí být kladný.")
    limit = charge_current_limit(hass, entry, box_id)
    if limit is None:
        raise ProxyControlError("Box nehlásí maximální nabíjecí proud, nelze ověřit limit.")
    if value > limit:
        raise ProxyControlError(f"Nabíjecí proud {value} A je nad limitem {limit:.0f} A.")
    return value


def export_limit_cap(entry: ConfigEntry, base_limit: Optional[float]) -> Optional[float]:
    """The user's cap, else the box's current export limit (what the distributor allows)."""
    user_cap = _positive_option(entry, CONF_PROXY_EXPORT_LIMIT_W)
    if user_cap is not None:
        return user_cap
    return base_limit
