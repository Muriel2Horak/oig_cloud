"""Canonical registry of all configuration fields (F1 P5).

Every user-configurable option is defined here EXACTLY ONCE. The REST API,
the dashboard forms (served via /config_registry) and the HA options flow
all derive validation and rendering from this registry — never from local
field lists.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple


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
    """Validate + coerce a raw value against a Field.

    Fail-closed: input-kind parity with the legacy REST
    ``_coerce_module_value`` (never looser — F1 plan-1 correction).
    """
    if f.type is bool:
        if not isinstance(raw, bool):
            raise ValueError(f"{f.key}: expected boolean")
        return raw
    if f.type in (int, float):
        if isinstance(raw, bool) or not isinstance(raw, (int, float)):
            raise ValueError(f"{f.key}: expected {f.type.__name__}")
        if isinstance(raw, float) and not math.isfinite(raw):
            raise ValueError(f"{f.key}: expected finite number")
        try:
            value = f.type(raw)
        except OverflowError as err:
            # A JSON integer of arbitrary size (e.g. 10**400) cannot become a
            # float. Range-check the RAW integer instead, so the caller gets the
            # normal above/below-range message rather than a 500.
            if f.min is not None and raw < f.min:
                raise ValueError(f"{f.key}: below minimum {f.min}") from err
            if f.max is not None and raw > f.max:
                raise ValueError(f"{f.key}: above maximum {f.max}") from err
            raise ValueError(f"{f.key}: number out of range") from err
        if f.min is not None and value < f.min:
            raise ValueError(f"{f.key}: below minimum {f.min}")
        if f.max is not None and value > f.max:
            raise ValueError(f"{f.key}: above maximum {f.max}")
        return value
    # str
    if not isinstance(raw, str):
        raise ValueError(f"{f.key}: expected string")
    value = raw[:200]
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

# --- section: solar ---------------------------------------------------------
_register(
    Field("solar_forecast_provider", "solar", str, default="",
          enum=("forecast_solar", "solcast")),
    Field("solar_forecast_mode", "solar", str, default="",
          enum=("hourly", "every_4h", "daily_optimized")),
    Field("solar_forecast_api_key", "solar", str, default="", secret=True),
    Field("solcast_api_key", "solar", str, default="", secret=True),
    Field("solcast_site_id", "solar", str, default=""),
    Field("solar_forecast_latitude", "solar", float, default=None, min=-90.0, max=90.0,
          step=0.0001),
    Field("solar_forecast_longitude", "solar", float, default=None, min=-180.0, max=180.0,
          step=0.0001),
    Field("solar_forecast_string1_enabled", "solar", bool, default=False),
    Field("solar_forecast_string1_kwp", "solar", float, default=None, min=0.1, max=50.0,
          step=0.1),
    Field("solar_forecast_string1_declination", "solar", int, default=None, min=0, max=90),
    Field("solar_forecast_string1_azimuth", "solar", int, default=None, min=-180, max=180),
    Field("solar_forecast_string2_enabled", "solar", bool, default=False),
    Field("solar_forecast_string2_kwp", "solar", float, default=None, min=0.1, max=50.0,
          step=0.1),
    Field("solar_forecast_string2_declination", "solar", int, default=None, min=0, max=90),
    Field("solar_forecast_string2_azimuth", "solar", int, default=None, min=-180, max=180),
)

# --- section: boiler --------------------------------------------------------
# TRANSCRIBED 1:1 from _MODULE_CONFIG_FIELDS["boiler"]; reload_on_change=True on every field.
_register(
    Field("boiler_volume_l", "boiler", float, default=None, min=30.0, max=1000.0,
          reload_on_change=True),
    Field("boiler_temp_sensor_top", "boiler", str, default="", reload_on_change=True),
    Field("boiler_temp_sensor_bottom", "boiler", str, default="", reload_on_change=True),
    Field("boiler_enable_second_thermometer", "boiler", bool, default=False,
          reload_on_change=True),
    Field("boiler_current_power_entity", "boiler", str, default="", reload_on_change=True),
    Field("boiler_alt_energy_sensor", "boiler", str, default="", reload_on_change=True),
    Field("boiler_alt_energy_daily", "boiler", bool, default=False, reload_on_change=True),
    Field("boiler_alt_cost_kwh", "boiler", float, default=None, min=0.0, max=20.0,
          reload_on_change=True),
    Field("boiler_has_alternative_heating", "boiler", bool, default=False,
          reload_on_change=True),
    Field("boiler_target_temp_c", "boiler", float, default=None, min=40.0, max=85.0,
          reload_on_change=True),
    Field("boiler_deadline_time", "boiler", str, default="", reload_on_change=True),
    Field("boiler_alt_source_type", "boiler", str, default="",
          enum=("gas", "heat_pump", "fireplace", "other"), reload_on_change=True),
    Field("boiler_battery_cycle_cost_czk_kwh", "boiler", float, default=0.50,
          min=0.0, max=5.0, reload_on_change=True),
    Field("boiler_thermal_arbitrage_enabled", "boiler", bool, default=False,
          reload_on_change=True),
    Field("boiler_max_temp_c", "boiler", float, default=65.0, min=40.0, max=85.0,
          reload_on_change=True),
    Field("boiler_alt_power_kw", "boiler", float, default=0.0, min=0.0, max=50.0,
          reload_on_change=True),
    Field("box_has_home56", "boiler", bool, default=False, reload_on_change=True),
    Field("boiler_home5_maneuver_enabled", "boiler", bool, default=False,
          reload_on_change=True),
    Field("boiler_circulation_enabled", "boiler", bool, default=False, reload_on_change=True),
    Field("boiler_circulation_lead_minutes", "boiler", int, default=None, min=0, max=120,
          reload_on_change=True),
    Field("boiler_circulation_run_minutes", "boiler", int, default=None, min=1, max=60,
          reload_on_change=True),
    Field("boiler_circulation_max_runs_per_day", "boiler", int, default=None, min=1, max=20,
          reload_on_change=True),
    Field("boiler_circulation_min_gap_minutes", "boiler", int, default=None, min=10, max=480,
          reload_on_change=True),
    Field("boiler_legionella_interval_days", "boiler", int, default=None, min=0, max=30,
          reload_on_change=True),
    Field("boiler_legionella_target_temp_c", "boiler", float, default=None,
          min=60.0, max=75.0, reload_on_change=True),
)


# --- section: basic ---------------------------------------------------------
# OQ-6 resolution (PLAN2-RESOLUTIONS.md): enum is 3-value, including legacy
# "hybrid". The UI never offers "hybrid" — _sanitize_data_source_mode in the
# flow (steps.py) keeps the wizard options on ("cloud_only", "local_only").
# Including "hybrid" in the enum keeps the REST GET→POST round-trip honest
# for any legacy entry that still stores "hybrid".
_register(
    Field("standard_scan_interval", "basic", int, default=30, min=30, max=300,
          step=1, scope="basic"),
    Field("extended_scan_interval", "basic", int, default=300, min=300, max=3600,
          step=1, scope="basic"),
    Field("data_source_mode", "basic", str, default="cloud_only",
          enum=("cloud_only", "local_only", "hybrid"), scope="basic"),
    Field("local_proxy_stale_minutes", "basic", int, default=10, min=1, max=120,
          step=1, scope="basic"),
    Field("local_event_debounce_ms", "basic", int, default=300, min=0, max=5000,
          step=1, scope="basic"),
    Field("enable_dashboard", "basic", bool, default=False, scope="basic"),
)
