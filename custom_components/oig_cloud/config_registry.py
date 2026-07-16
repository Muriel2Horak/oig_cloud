"""Canonical registry of all configuration fields (F1 P5).

Every user-configurable option is defined here EXACTLY ONCE. The REST API,
the dashboard forms (served via /config_registry) and the HA options flow
all derive validation and rendering from this registry — never from local
field lists.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

_TRUE = {"true", "1", "on", "yes"}
_FALSE = {"false", "0", "off", "no"}


@dataclass(frozen=True)
class Field:
    key: str
    section: str                       # basic|modules|battery|solar|boiler
    type: type                         # bool|int|float|str
    default: Any = None
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None
    enum: Optional[Tuple[str, ...]] = None
    scope: str = "premium"             # basic|premium|advanced
    secret: bool = False               # write-only via API; never echoed
    mirror: Optional[str] = None       # legacy alias key kept in sync on write
    reload_on_change: bool = False     # entry reload required (e.g. boiler)
    label: str = ""                    # i18n key (K2f: keys, not _cs strings)
    hint: str = ""                     # i18n key

    def __post_init__(self) -> None:
        if not self.label:
            object.__setattr__(self, "label", f"field.{self.key}.label")
        if not self.hint:
            object.__setattr__(self, "hint", f"field.{self.key}.hint")


def coerce_value(f: Field, raw: Any) -> Any:
    """Coerce+validate a raw (possibly string) value against a Field."""
    if f.type is bool:
        if isinstance(raw, bool):
            return raw
        if isinstance(raw, str):
            low = raw.strip().lower()
            if low in _TRUE:
                return True
            if low in _FALSE:
                return False
        raise ValueError(f"{f.key}: expected boolean")
    if f.type in (int, float):
        try:
            value = f.type(float(raw))
        except (TypeError, ValueError) as err:
            raise ValueError(f"{f.key}: expected {f.type.__name__}") from err
        if f.min is not None and value < f.min:
            raise ValueError(f"{f.key}: below minimum {f.min}")
        if f.max is not None and value > f.max:
            raise ValueError(f"{f.key}: above maximum {f.max}")
        return value
    # str
    value = "" if raw is None else str(raw)
    if f.enum is not None and value not in f.enum:
        raise ValueError(f"{f.key}: must be one of {f.enum}")
    return value


# Populated by _register() below; Tasks 2-3 add the actual fields.
FIELD_REGISTRY: Dict[str, Field] = {}


def _register(*fields: Field) -> None:
    for f in fields:
        if f.key in FIELD_REGISTRY:
            raise RuntimeError(f"duplicate registry key {f.key}")
        FIELD_REGISTRY[f.key] = f


def fields_for_section(section: str) -> Dict[str, Field]:
    return {k: f for k, f in FIELD_REGISTRY.items() if f.section == section}


def registry_as_api_dict() -> Dict[str, Dict[str, Any]]:
    """Serializable field definitions for the FE (no secret defaults)."""
    out: Dict[str, Dict[str, Any]] = {}
    for key, f in FIELD_REGISTRY.items():
        spec: Dict[str, Any] = {
            "section": f.section,
            "type": f.type.__name__,
            "scope": f.scope,
            "label": f.label,
            "hint": f.hint,
        }
        if f.secret:
            spec["secret"] = True
        else:
            spec["default"] = f.default
        for attr in ("min", "max", "step"):
            if getattr(f, attr) is not None:
                spec[attr] = getattr(f, attr)
        if f.enum is not None:
            spec["enum"] = list(f.enum)
        if f.reload_on_change:
            spec["reload_on_change"] = True
        out[key] = spec
    return out


# --- section: modules -------------------------------------------------------
_register(
    Field("enable_solar_forecast", "modules", bool, default=False),
    Field("enable_battery_prediction", "modules", bool, default=False),
    Field("enable_pricing", "modules", bool, default=False),
    Field("enable_boiler", "modules", bool, default=False),
    Field("enable_statistics", "modules", bool, default=False),
    Field("enable_extended_sensors", "modules", bool, default=False),
    Field("enable_chmu_warnings", "modules", bool, default=False),
)

# --- section: battery -------------------------------------------------------
_register(
    Field("auto_mode_switch_enabled", "battery", bool, default=False),
    Field("charge_rate_kw", "battery", float, default=None, min=0.5, max=10.0,
          step=0.1, mirror="home_charge_rate"),
    Field("expensive_percentile", "battery", float, default=None, min=0.5, max=0.95),
    Field("battery_comfort_soc_percent", "battery", float, default=None, min=0.0,
          max=95.0, step=5.0),
    Field("balancing_enabled", "battery", bool, default=False),
    Field("balancing_interval_days", "battery", int, default=None, min=3, max=30),
    Field("balancing_hold_hours", "battery", int, default=None, min=1, max=12),
    Field("balancing_opportunistic_threshold", "battery", float, default=None,
          min=0.5, max=5.0),
    Field("balancing_economic_threshold", "battery", float, default=None,
          min=0.5, max=10.0),
    Field("cheap_window_percentile", "battery", int, default=None, min=5, max=80),
)
