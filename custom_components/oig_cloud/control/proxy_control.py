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
import time
from datetime import datetime
from typing import Any, Iterable, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, State
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er

from ..core.data_source import DATA_SOURCE_CLOUD_ONLY, get_data_source_state

_LOGGER = logging.getLogger(__name__)

CONF_CONTROL_VIA_PROXY = "control_via_proxy"
CONF_PROXY_MAX_CHARGE_CURRENT_A = "proxy_max_charge_current_a"
CONF_PROXY_EXPORT_LIMIT_W = "proxy_export_limit_w"
# Charge current written after every switch to Home UPS (also by the planner)
# while the proxy controls the box. 0 = keep the box's own reset value (50 A).
CONF_PROXY_UPS_CHARGE_CURRENT_A = "proxy_ups_charge_current_a"

# Set by the service action on the shield params: which route carried the write.
ROUTE_KEY = "_route"
ROUTE_LOCAL = "local"
ROUTE_CLOUD = "cloud"
# Set by the shield when it retries a timed-out local write through the cloud.
FORCE_CLOUD_KEY = "_force_cloud"

PARAM_BOX_MODE = "tbl_box_prms_mode"
PARAM_CHARGE_CURRENT = "tbl_invertor_prm1_aac_max_chrg"
PARAM_CHARGE_CURRENT_MAX = "tbl_invertor_prm1_a_max_chrg"
PARAM_TO_GRID = "tbl_invertor_prms_to_grid"
PARAM_EXPORT_LIMIT = "tbl_invertor_prm1_p_max_feed_grid"
PARAM_GRID_PV_ON = "tbl_invertor_prms_grid_pv_on"
PARAM_GRID_PV_OFF = "tbl_invertor_prms_grid_pv_off"
PARAM_BOILER_MANUAL = "tbl_boiler_prms_manual"
PARAM_BAT_VOLTAGE = "tbl_batt_bat_v"

PROXY_DOMAINS = ("select", "number", "switch", "sensor", "binary_sensor")

# The proxy's result of every setting it delivers to the box (OIG Proxy 2.1.2+,
# 2026-11-06). State "<result> <table>:<KEY>=<value>", attributes result, table,
# key, value, source, audit_id, at (ISO), event_id, evidence, reason. Every
# result is published at once with force_update; the periodic status repeats
# the last one with the same event_id.
PROXY_RESULT_ENTITY_ID = "sensor.oig_local_oig_proxy_proxy_status_control_last_result"
RESULT_ACK = "ack"
RESULT_FAILED = "failed"
_FAILED_RESULTS = ("timeout", "dropped", "nack")
# A queued setting replaced by a newer one for the same item; the newer one
# gets its own result, so this one says nothing about the write.
_IGNORED_REASONS = ("replaced",)
# Set by async_write on the shield params: the proxy writes this step made.
WRITES_KEY = "_proxy_writes"
RESENT_KEY = "_proxy_resent"
# Event ids of proxy results the shield already acted on (resent because of
# them); they never count again for the same step.
USED_RESULTS_KEY = "_proxy_used_results"

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


def data_source_is_local(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """True when the integration currently reads from the proxy."""
    state = get_data_source_state(hass, entry.entry_id)
    return state.effective_mode != DATA_SOURCE_CLOUD_ONLY and bool(state.local_available)


def local_route_available(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """True when the option is on and the data source currently reads locally."""
    return control_enabled(entry) and data_source_is_local(hass, entry)


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


def require_local_route(
    hass: HomeAssistant, entry: ConfigEntry, what: str, *, safety_stop: bool = False
) -> None:
    """Raise with a reason when a proxy-only operation cannot run now.

    ``safety_stop`` (ending a battery export) is allowed even with the option
    turned off: an export started earlier must still be switched off.
    """
    if not safety_stop and not control_enabled(entry):
        raise ProxyControlError(
            f"{what} jde jen přes OIG Proxy. Zapněte volbu „Řídit přes proxy“."
        )
    if not data_source_is_local(hass, entry):
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


def split_param(key: str) -> tuple[str, str]:
    """``tbl_box_prms_mode`` -> (``tbl_box_prms``, ``MODE``), as the box names them."""
    parts = key.split("_")
    return "_".join(parts[:3]), "_".join(parts[3:]).upper()


def box_value_code(key: str, value: Any) -> str:
    """The value as the box and the proxy name it (mode code, 0/1, number)."""
    if key == PARAM_BOX_MODE:
        for code, label in BOX_MODE_OPTIONS.items():
            if label == value:
                return code
    if isinstance(value, bool):
        return "1" if value else "0"
    text = str(value).strip()
    return {"on": "1", "off": "0", "true": "1", "false": "0"}.get(text.lower(), text)


def _same_value(reported: Any, expected: str) -> bool:
    reported_code = box_value_code("", reported)
    try:
        return float(reported_code) == float(expected)
    except (TypeError, ValueError):
        return reported_code == expected.strip()


def record_write(
    service_data: dict[str, Any],
    box_id: str,
    key: str,
    value: Any,
    written_at: Optional[float] = None,
) -> None:
    """Remember a proxy write on the shield params, replacing an earlier one for the key."""
    table, item = split_param(key)
    at = time.time() if written_at is None else written_at
    entry = (box_id, key, value, table, item, box_value_code(key, value), at)
    writes = tuple(w for w in service_data.get(WRITES_KEY) or () if w[1] != key)
    service_data[WRITES_KEY] = writes + (entry,)


def _result_time(value: Any) -> Optional[float]:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def proxy_result(state: Optional[State]) -> Optional[dict[str, Any]]:
    """One setting result from the proxy's result entity, or None."""
    if state is None or state.state in _INVALID_STATES:
        return None
    attrs = state.attributes
    result = attrs.get("result")
    table = attrs.get("table")
    item = attrs.get("key")
    at = _result_time(attrs.get("at"))
    if not result or not table or not item or at is None:
        return None
    return {
        "event_id": str(attrs.get("event_id") or attrs.get("audit_id") or f"{state.state}@{at}"),
        "result": str(result).lower(),
        "table": str(table),
        "key": str(item).upper(),
        "value": attrs.get("value"),
        "source": attrs.get("source"),
        "reason": str(attrs.get("reason") or ""),
        "at": at,
    }


def _matching_results(
    write: tuple, results: Iterable[dict[str, Any]], ignore: Iterable[str] = ()
) -> list[dict[str, Any]]:
    table, item, code, written_at = write[3:7]
    skip = set(ignore)
    return [
        result
        for result in results
        if result["event_id"] not in skip
        and result["at"] >= written_at
        and result["table"] == table
        and result["key"] == item
        and result.get("source") in (None, "local")
        and _same_value(result.get("value"), code)
    ]


def failed_result_ids(
    write: tuple, results: Iterable[dict[str, Any]], ignore: Iterable[str] = ()
) -> list[str]:
    """Event ids of the failure results that count for this write."""
    return [
        result["event_id"]
        for result in _matching_results(write, results, ignore)
        if result["result"] in _FAILED_RESULTS and result["reason"] not in _IGNORED_REASONS
    ]


def write_outcome(
    write: tuple, results: Iterable[dict[str, Any]], ignore: Iterable[str] = ()
) -> Optional[str]:
    """``ack``, ``failed`` or None (no result yet) for one write, from proxy results.

    Only results the proxy produced after the write count, so the last result
    of an earlier setting, repeated by the periodic status, is never taken for
    this one. Results in ``ignore`` (the ones that made the shield resend it)
    never count: on 2026-11-07 the timeout at 15:53:33.408 counted against the
    resend at 15:53:33.449 and the shield gave up 3 s before the resend's ack.
    Proxy and HA share the host clock, so times are compared without tolerance.
    An ack wins over a failure: a resend may follow a timeout.
    """
    matching = _matching_results(write, results, ignore)
    if any(result["result"] == RESULT_ACK for result in matching):
        return RESULT_ACK
    if failed_result_ids(write, matching):
        return RESULT_FAILED
    return None


async def async_write(
    hass: HomeAssistant,
    box_id: str,
    key: str,
    value: Any,
    service_data: Optional[dict[str, Any]] = None,
) -> str:
    """Change a proxy ``_cfg`` entity; the proxy sends the setting to the box.

    With ``service_data`` (the shield params) the write is recorded, so the
    shield can wait for the proxy's result for it.
    """
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
    written_at = time.time()
    await hass.services.async_call(domain, service, data, blocking=True)
    if service_data is not None:
        record_write(service_data, box_id, key, value, written_at)
    return entity_id


def box_mode_is_ups(hass: HomeAssistant, box_id: str) -> bool:
    """True when the box itself reports Home UPS."""
    return read_proxy_state(hass, box_id, PARAM_BOX_MODE) == HOME_UPS_LABEL


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
    box_limit = read_proxy_number(hass, box_id, PARAM_CHARGE_CURRENT_MAX)
    if box_limit is None:
        box_limit = read_proxy_number(hass, box_id, PARAM_CHARGE_CURRENT_MAX, control=True)
    if box_limit is not None and box_limit > 0:
        candidates.append(box_limit)
    entity_id = find_proxy_entity(hass, box_id, PARAM_CHARGE_CURRENT, control=True)
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


def ups_charge_current(
    hass: HomeAssistant, entry: ConfigEntry, box_id: Optional[str]
) -> Optional[int]:
    """Configured Home UPS charge current, capped by the limits, when the proxy controls the box.

    None when the option is 0, the integration reads from cloud, or the box
    limit is unknown: then the box keeps its own reset value (50 A).
    """
    amps = _positive_option(entry, CONF_PROXY_UPS_CHARGE_CURRENT_A)
    if amps is None or not box_id or not local_route_available(hass, entry):
        return None
    limit = charge_current_limit(hass, entry, box_id)
    if limit is None:
        return None
    return int(min(amps, limit))


def effective_charge_rate_kw(
    hass: Any, entry: Any, configured_kw: float
) -> float:
    """Grid charging power the planner should assume.

    With a configured Home UPS charge current and local control available it is
    that current times the live battery voltage (measured 2026-11-06: 121 A at
    ~52.5 V gave 6.4-6.6 kW). Otherwise the configured ``charge_rate_kw``, which
    matches the box's own 50 A.
    """
    try:
        box_id = entry_box_id(entry)
        if hass is None or not box_id:
            return configured_kw
        amps = ups_charge_current(hass, entry, box_id)
        voltage = read_proxy_number(hass, box_id, PARAM_BAT_VOLTAGE) if amps else None
    except (AttributeError, KeyError, TypeError, ValueError):
        return configured_kw
    if not amps or voltage is None or voltage <= 0:
        return configured_kw
    return amps * voltage / 1000.0
