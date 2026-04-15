from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from homeassistant.util import dt as dt_util

from ..sensor_types import SENSOR_TYPES

_LOGGER = logging.getLogger(__name__)

SUPPORTED_DOMAINS: Tuple[str, ...] = ("sensor", "binary_sensor", "switch", "number", "select")


@dataclass(frozen=True, slots=True)
class ProxyEntityDescriptor:
    """Canonical parsed representation of a local/proxy entity ID.

    Attributes:
        domain: One of the supported proxy domains (sensor, binary_sensor,
            switch, number, select).
        device_id: The box/device identifier extracted from the entity ID
            (e.g. "2206237016", "dev01").
        table: The table/section name from the proxy object-id
            (e.g. "tbl_actual_aci", "tbl_invertor_prms", "proxy_control").
        key: The semantic key within that table
            (e.g. "wr", "to_grid", "bat_min", "mode", "proxy_mode").
        is_control: True when the original entity ID carries the _cfg suffix,
            indicating this is a control (write) entity rather than a read-only
            telemetry entity.
        raw_suffix: The complete suffix after the oig_local_ prefix, as
            originally present in the entity_id. Useful for SENSOR_TYPES
            suffix lookups that still expect the raw suffix.
    """

    domain: str
    device_id: str
    table: str
    key: str
    is_control: bool
    raw_suffix: str


def normalize_proxy_entity_id(
    entity_id: Any, expected_device_id: str
) -> Optional[ProxyEntityDescriptor]:
    """Parse a local/proxy entity ID into a canonical descriptor.

    Accepts entity IDs conforming to the audited oig-proxy contract:
        {domain}.oig_local_{device_id}_{table}_{key}[_cfg]

    The _cfg suffix on the key portion indicates a control entity.
    Strict device_id scoping is enforced.

    Args:
        entity_id: The entity ID string to normalize (e.g.
            "switch.oig_local_2206237016_tbl_invertor_prms_to_grid_cfg").
        expected_device_id: The box/device ID that must appear after
            "oig_local_" for the ID to be considered valid.

    Returns:
        A ProxyEntityDescriptor with all parsed components, or None if the
        entity ID is malformed, uses an unsupported domain, or does not match
        the expected_device_id.
    """
    if not isinstance(entity_id, str):
        return None

    dot_pos = entity_id.find(".")
    if dot_pos < 1:
        return None
    domain = entity_id[:dot_pos]
    if domain not in SUPPORTED_DOMAINS:
        return None

    expected_prefix = f"{domain}.oig_local_{expected_device_id}_"
    if not entity_id.startswith(expected_prefix):
        return None

    raw_suffix = entity_id[len(expected_prefix):]
    if not raw_suffix:
        return None

    is_control = False
    if raw_suffix.endswith("_cfg"):
        is_control = True
        key_part = raw_suffix[:-4]
    else:
        key_part = raw_suffix

    if key_part.startswith("proxy_control_"):
        table = "proxy_control"
        key = key_part[len("proxy_control_"):]
    elif key_part.startswith("tbl_"):
        first_us = key_part.find("_", 4)
        if first_us >= 4:
            second_us = key_part.find("_", first_us + 1)
            if second_us >= first_us + 1:
                table = key_part[:second_us]
                key = key_part[second_us + 1:]
            elif second_us == -1:
                table = key_part[:first_us]
                key = key_part[first_us + 1:]
            else:
                table = key_part
                key = ""
        else:
            table = key_part
            key = ""
    else:
        last_us = key_part.rfind("_")
        if last_us >= 1:
            table = key_part[:last_us]
            key = key_part[last_us + 1:]
        else:
            table = key_part
            key = ""

    if not table or not key:
        return None

    return ProxyEntityDescriptor(
        domain=domain,
        device_id=expected_device_id,
        table=table,
        key=key,
        is_control=is_control,
        raw_suffix=raw_suffix,
    )


def _as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    try:
        return dt_util.as_utc(dt) if dt.tzinfo else dt.replace(tzinfo=dt_util.UTC)
    except Exception:
        return None


def _coerce_number(value: Any) -> Any:
    if value in (None, "", "unknown", "unavailable"):
        return None
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        s = value.strip()
        try:
            return float(s) if "." in s else int(s)
        except Exception:
            return value
    return value


def _normalize_box_mode(value: Any) -> Optional[int]:
    """Normalize local box mode to the cloud numeric ID (0..5)."""
    coerced = _coerce_number(value)
    if coerced is None:
        return None
    if isinstance(coerced, (int, float)):
        return _normalize_box_mode_number(coerced)
    if isinstance(coerced, str):
        return _normalize_box_mode_string(coerced)
    return None


def _normalize_box_mode_number(value: float) -> Optional[int]:
    try:
        as_int = int(value)
    except Exception:
        return None
    return as_int if 0 <= as_int <= 5 else None


def _normalize_box_mode_string(value: str) -> Optional[int]:
    s = value.strip().lower()
    if not s:
        return None
    if s in {"neznámý", "neznamy", "unknown"}:
        return None
    if s.startswith("home"):
        if "ups" in s:
            return 3
        for num, mode_id in (
            ("1", 0),
            ("2", 1),
            ("3", 2),
            ("4", 3),
            ("5", 4),
            ("6", 5),
        ):
            if num in s:
                return mode_id
    return None


def _normalize_domains(value: Any) -> Tuple[str, ...]:
    if isinstance(value, str):
        raw = [value]
    elif isinstance(value, (list, tuple, set)):
        raw = list(value)
    else:
        raw = []

    domains: List[str] = []
    for item in raw:
        if not isinstance(item, str):
            continue
        domain = item.strip()
        if domain in SUPPORTED_DOMAINS and domain not in domains:
            domains.append(domain)

    if not domains:
        domains = ["sensor"]
    return tuple(domains)


def _normalize_value_map(value: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(value, dict):
        return None
    out: Dict[str, Any] = {}
    for key, mapped in value.items():
        if not isinstance(key, str):
            continue
        out[key.strip().lower()] = mapped
    return out or None


def _apply_value_map(value: Any, value_map: Optional[Dict[str, Any]]) -> Any:
    if isinstance(value, str) and value_map:
        key = value.strip().lower()
        if key in value_map:
            return value_map[key]
    return _coerce_number(value)


# Extended "values" layout used by OigCloudDataSensor._get_extended_value()
_EXTENDED_INDEX_BY_SENSOR_TYPE: Dict[str, Tuple[str, int]] = {
    # battery -> extended_batt
    "extended_battery_voltage": ("extended_batt", 0),
    "extended_battery_current": ("extended_batt", 1),
    "extended_battery_capacity": ("extended_batt", 2),
    "extended_battery_temperature": ("extended_batt", 3),
    # fve -> extended_fve
    "extended_fve_voltage_1": ("extended_fve", 0),
    "extended_fve_voltage_2": ("extended_fve", 1),
    "extended_fve_power_1": ("extended_fve", 3),
    "extended_fve_power_2": ("extended_fve", 4),
    # grid -> extended_grid
    "extended_grid_voltage": ("extended_grid", 0),
    "extended_grid_power": ("extended_grid", 1),
    "extended_grid_consumption": ("extended_grid", 2),
    "extended_grid_delivery": ("extended_grid", 3),
    # load -> extended_load
    "extended_load_l1_power": ("extended_load", 0),
    "extended_load_l2_power": ("extended_load", 1),
    "extended_load_l3_power": ("extended_load", 2),
}

_EXTENDED_GROUP_SIZES: Dict[str, int] = {
    "extended_batt": 4,
    "extended_fve": 5,
    "extended_grid": 4,
    "extended_load": 3,
}


@dataclass(frozen=True, slots=True)
class _NodeUpdate:
    node_id: str
    node_key: str


@dataclass(frozen=True, slots=True)
class _ExtendedUpdate:
    group: str
    index: int


LocalUpdate = _NodeUpdate | _ExtendedUpdate


@dataclass(frozen=True, slots=True)
class _SuffixConfig:
    updates: Tuple[LocalUpdate, ...]
    domains: Tuple[str, ...]
    value_map: Optional[Dict[str, Any]]


def _build_suffix_updates() -> Dict[str, _SuffixConfig]:
    raw: Dict[str, Dict[str, Any]] = {}
    for sensor_type, cfg in SENSOR_TYPES.items():
        suffix = cfg.get("local_entity_suffix")
        if not isinstance(suffix, str) or not suffix:
            continue
        entry = _get_suffix_entry(raw, suffix)
        _merge_domains(entry, cfg.get("local_entity_domains"))
        _merge_value_map(entry, cfg.get("local_value_map"))
        _append_updates(entry, cfg, sensor_type)

    out: Dict[str, _SuffixConfig] = {}
    for suffix, entry in raw.items():
        domains = tuple(entry["domains"]) if entry["domains"] else ("sensor",)
        out[suffix] = _SuffixConfig(
            updates=tuple(entry["updates"]),
            domains=domains,
            value_map=entry["value_map"],
        )
        out[f"{suffix}_cfg"] = _SuffixConfig(
            updates=tuple(entry["updates"]),
            domains=SUPPORTED_DOMAINS,
            value_map=entry["value_map"],
        )
    return out


def _get_suffix_entry(raw: Dict[str, Dict[str, Any]], suffix: str) -> Dict[str, Any]:
    return raw.setdefault(
        suffix,
        {
            "updates": [],
            "domains": [],
            "value_map": None,
        },
    )


def _merge_domains(entry: Dict[str, Any], raw_domains: Any) -> None:
    domains = _normalize_domains(raw_domains)
    for domain in domains:
        if domain not in entry["domains"]:
            entry["domains"].append(domain)


def _merge_value_map(entry: Dict[str, Any], raw_value_map: Any) -> None:
    value_map = _normalize_value_map(raw_value_map)
    if not value_map:
        return
    if entry["value_map"] is None:
        entry["value_map"] = {}
    entry["value_map"].update(value_map)


def _append_updates(
    entry: Dict[str, Any], cfg: Dict[str, Any], sensor_type: str
) -> None:
    updates: List[LocalUpdate] = entry["updates"]
    node_id = cfg.get("node_id")
    node_key = cfg.get("node_key")
    if isinstance(node_id, str) and node_id and isinstance(node_key, str) and node_key:
        updates.append(_NodeUpdate(node_id=node_id, node_key=node_key))

    ext = _EXTENDED_INDEX_BY_SENSOR_TYPE.get(sensor_type)
    if ext is not None:
        group, index = ext
        updates.append(_ExtendedUpdate(group=group, index=index))


def _is_valid_node_pair(node_id: Any, node_key: Any) -> bool:
    return bool(
        isinstance(node_id, str)
        and isinstance(node_key, str)
        and node_id
        and node_key
    )


_SUFFIX_UPDATES: Dict[str, _SuffixConfig] = _build_suffix_updates()


class LocalUpdateApplier:
    """Apply local proxy state updates into the cloud-shaped coordinator payload."""

    def __init__(self, box_id: str) -> None:
        self.box_id = box_id

    def apply_state(
        self,
        payload: Dict[str, Any],
        entity_id: str,
        state: Any,
        last_updated: Optional[datetime],
    ) -> bool:
        """Return True if payload changed."""
        descriptor = normalize_proxy_entity_id(entity_id, self.box_id)
        if descriptor is None:
            return False

        suffix_cfg = _SUFFIX_UPDATES.get(descriptor.raw_suffix)
        if not suffix_cfg or descriptor.domain not in suffix_cfg.domains:
            return False

        value = _apply_value_map(state, suffix_cfg.value_map)
        if value is None:
            return False

        changed = False
        ts = _as_utc(last_updated) or dt_util.utcnow()

        box = _ensure_box_payload(payload, self.box_id)

        for upd in suffix_cfg.updates:
            if isinstance(upd, _NodeUpdate):
                if _apply_node_update(box, upd, value, state):
                    changed = True
            elif isinstance(upd, _ExtendedUpdate):
                if _apply_extended_update(payload, upd, value, ts):
                    changed = True

        return changed


def _ensure_box_payload(payload: Dict[str, Any], box_id: str) -> Dict[str, Any]:
    box = payload.setdefault(box_id, {})
    if not isinstance(box, dict):
        payload[box_id] = {}
        box = payload[box_id]
    return box


def _apply_node_update(
    box: Dict[str, Any],
    upd: _NodeUpdate,
    value: Any,
    raw_state: Any,
) -> bool:
    node = box.setdefault(upd.node_id, {})
    if not isinstance(node, dict):
        box[upd.node_id] = {}
        node = box[upd.node_id]
    new_value: Any = value
    if upd.node_id == "box_prms" and upd.node_key == "mode":
        normalized = _normalize_box_mode(raw_state)
        if normalized is None:
            return False
        new_value = normalized

    if node.get(upd.node_key) != new_value:
        node[upd.node_key] = new_value
        return True
    return False


def _apply_extended_update(
    payload: Dict[str, Any],
    upd: _ExtendedUpdate,
    value: Any,
    ts: datetime,
) -> bool:
    group_size = _EXTENDED_GROUP_SIZES.get(upd.group, upd.index + 1)
    ext_obj = payload.get(upd.group)
    if not isinstance(ext_obj, dict):
        ext_obj = {"items": []}
        payload[upd.group] = ext_obj
    items = ext_obj.get("items")
    if not isinstance(items, list):
        items = []
        ext_obj["items"] = items
    if items:
        last = items[-1]
    else:
        last = {}
        items.append(last)
    values = last.get("values")
    if not isinstance(values, list):
        values = [None] * group_size
        last["values"] = values
    if len(values) < group_size:
        values.extend([None] * (group_size - len(values)))
    prev = values[upd.index] if upd.index < len(values) else None
    if prev != value:
        values[upd.index] = value
        last["ts"] = ts.isoformat()
        return True
    return False
