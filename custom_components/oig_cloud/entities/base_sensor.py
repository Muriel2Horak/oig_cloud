from typing import Any


def _as_numeric_string(value: Any) -> str | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int | float):
        return str(int(value))
    if isinstance(value, str) and value.isdigit():
        return value
    return None


def resolve_box_id(coordinator: Any) -> str:
    forced = _as_numeric_string(getattr(coordinator, "forced_box_id", None))
    if forced:
        return forced

    entry = getattr(coordinator, "config_entry", None)
    if entry:
        for key in ("box_id", "inverter_sn"):
            for source in (getattr(entry, "options", None), getattr(entry, "data", None)):
                if isinstance(source, dict):
                    resolved = _as_numeric_string(source.get(key))
                    if resolved:
                        return resolved

    data = getattr(coordinator, "data", None)
    if isinstance(data, dict):
        for key in data:
            resolved = _as_numeric_string(key)
            if resolved:
                return resolved

    return "unknown"
