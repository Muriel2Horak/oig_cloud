"""Common helpers for battery forecast logic."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Mapping, Optional

from homeassistant.util import dt as dt_util


def safe_nested_get(obj: Optional[Dict[str, Any]], *keys: str, default: Any = 0) -> Any:
    """Safely get nested dict values, handling None at any level."""
    current = obj
    for key in keys:
        if current is None or not isinstance(current, dict):
            return default
        current = current.get(key)
    return current if current is not None else default


def parse_timeline_timestamp(value: Optional[str]) -> Optional[datetime]:
    """Parse timeline timestamp into local datetime."""
    if not value:
        return None
    dt_obj = dt_util.parse_datetime(value)
    if dt_obj is None:
        try:
            dt_obj = datetime.fromisoformat(value)
        except ValueError:
            return None
    if dt_obj.tzinfo is None:
        dt_obj = dt_util.as_local(dt_obj)
    return dt_obj


def format_time_label(iso_ts: Optional[str]) -> str:
    """Format ISO timestamp to local HH:MM string."""
    if not iso_ts:
        return "--:--"
    try:
        ts = iso_ts
        if iso_ts.endswith("Z"):
            ts = iso_ts.replace("Z", "+00:00")
        dt_obj = datetime.fromisoformat(ts)
        if dt_obj.tzinfo is None:
            dt_obj = dt_util.as_local(dt_obj)
        else:
            dt_obj = dt_obj.astimezone(dt_util.DEFAULT_TIME_ZONE)
        return dt_obj.strftime("%H:%M")
    except Exception:
        return iso_ts


def parse_tariff_times(time_str: str) -> list[int]:
    """Parse tariff times string to list of hours."""
    if not time_str:
        return []
    try:
        return [int(x.strip()) for x in time_str.split(",") if x.strip()]
    except ValueError:
        return []


def _tariff_changes(config: Mapping[str, Any], is_weekend: bool) -> list[tuple[int, str]]:
    if is_weekend:
        nt_times = parse_tariff_times(config.get("tariff_nt_start_weekend", "0"))
        vt_times = parse_tariff_times(config.get("tariff_vt_start_weekend", ""))
    else:
        nt_times = parse_tariff_times(config.get("tariff_nt_start_weekday", "22,2"))
        vt_times = parse_tariff_times(config.get("tariff_vt_start_weekday", "6"))
    return [(hour, "NT") for hour in nt_times] + [(hour, "VT") for hour in vt_times]


def get_tariff_for_datetime(target_datetime: datetime, config: Mapping[str, Any]) -> str:
    """Get tariff (VT/NT) for a given datetime using config values."""
    dual_tariff_enabled = config.get("dual_tariff_enabled", True)
    if not dual_tariff_enabled:
        return "VT"

    weekday = target_datetime.weekday()
    changes_so_far = [
        change
        for change in _tariff_changes(config, weekday >= 5)
        if change[0] <= target_datetime.hour
    ]
    if changes_so_far:
        return max(changes_so_far)[1]

    # Before today's first change the tariff is whatever yesterday ended on.
    yesterday_changes = _tariff_changes(config, (weekday - 1) % 7 >= 5)
    return max(yesterday_changes)[1] if yesterday_changes else "NT"
