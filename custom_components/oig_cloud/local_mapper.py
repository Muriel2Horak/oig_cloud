from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from homeassistant.util import dt as dt_util

from .sensor_types import SENSOR_TYPES

_LOGGER = logging.getLogger(__name__)


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


def _build_suffix_updates() -> Dict[str, List[LocalUpdate]]:
    out: Dict[str, List[LocalUpdate]] = {}
    for sensor_type, cfg in SENSOR_TYPES.items():
        suffix = cfg.get("local_entity_suffix")
        if not isinstance(suffix, str) or not suffix:
            continue

        updates: List[LocalUpdate] = out.setdefault(suffix, [])

        node_id = cfg.get("node_id")
        node_key = cfg.get("node_key")
        if isinstance(node_id, str) and isinstance(node_key, str) and node_id and node_key:
            updates.append(_NodeUpdate(node_id=node_id, node_key=node_key))

        ext = _EXTENDED_INDEX_BY_SENSOR_TYPE.get(sensor_type)
        if ext is not None:
            group, index = ext
            updates.append(_ExtendedUpdate(group=group, index=index))

    return out


_SUFFIX_UPDATES: Dict[str, List[LocalUpdate]] = _build_suffix_updates()


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
        prefix = f"sensor.oig_local_{self.box_id}_"
        if not (isinstance(entity_id, str) and entity_id.startswith(prefix)):
            return False
        suffix = entity_id[len(prefix) :]
        updates = _SUFFIX_UPDATES.get(suffix)
        if not updates:
            return False

        value = _coerce_number(state)
        if value is None:
            return False

        changed = False
        ts = _as_utc(last_updated) or dt_util.utcnow()

        # Ensure base structure exists
        box = payload.setdefault(self.box_id, {})
        if not isinstance(box, dict):
            payload[self.box_id] = {}
            box = payload[self.box_id]

        for upd in updates:
            if isinstance(upd, _NodeUpdate):
                node = box.setdefault(upd.node_id, {})
                if not isinstance(node, dict):
                    box[upd.node_id] = {}
                    node = box[upd.node_id]
                prev = node.get(upd.node_key)
                if prev != value:
                    node[upd.node_key] = value
                    changed = True
            elif isinstance(upd, _ExtendedUpdate):
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
                    changed = True

        return changed

