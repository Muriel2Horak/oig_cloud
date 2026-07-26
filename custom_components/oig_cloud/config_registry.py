"""Canonical registry of all configuration fields (F1 P5).

Every user-configurable option is defined here EXACTLY ONCE. The REST API,
the dashboard forms (served via /config_registry) and the HA options flow
all derive validation and rendering from this registry — never from local
field lists.
"""
from __future__ import annotations

import logging
import math
import json
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class Field:
    key: str
    section: str                       # basic|modules|battery|solar|boiler|ai
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

    # --- F1 Plan 3: render + visibility contract (UX-AUDIT U1/U2/U7/U9) -------
    # (field_key, allowed_values) — field is rendered/validated only when the
    # referenced field's current value is in allowed_values.
    show_if: Optional[Tuple[str, Tuple[Any, ...]]] = None
    # F1 U4 R3: additive AND-extension for fields whose visibility depends on
    # MORE than one other field (e.g. an NT variant gated on both a pricing
    # scenario AND tariff dual-ness). Every (field, allowed_values) pair must
    # hold. `show_if` itself is untouched — existing single-condition fields
    # need no change; this is a second, optional predicate list, not a
    # rewrite of the mechanism.
    show_if_all: Optional[Tuple[Tuple[str, Tuple[Any, ...]], ...]] = None
    widget: Optional[str] = None        # override the type-derived control
    scale: Optional[float] = None       # display multiplier (fraction stored, % shown)
    optional: bool = False              # may be left blank
    entity_domain: Optional[str] = None  # render an entity picker for this domain
    hidden: bool = False                # excluded from /config_registry (FE never renders it)

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


# --- pricing source data ------------------------------------------------------
_PRICELISTS_JSON_PATH = (
    Path(__file__).resolve().parent / "remote_config" / "data" / "pricelists.json"
)


def _load_released_pricelists() -> Dict[str, Any]:
    try:
        with _PRICELISTS_JSON_PATH.open("r", encoding="utf-8") as fh:
            payload = json.load(fh)
    except OSError as err:
        raise RuntimeError("pricing release file missing") from err
    if not isinstance(payload, dict) or "distributors" not in payload:
        raise RuntimeError("pricing release file has invalid shape")
    return payload


def _snapshot_valid_from_date(item: Dict[str, Any]) -> Optional[date]:
    raw = item.get("valid_from")
    if not isinstance(raw, str):
        return None
    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def _pick_latest_snapshot(
    payload: Dict[str, Any], *, now: Optional[date] = None
) -> Dict[str, Any]:
    """Select the newest bundled snapshot with ``valid_from <= now`` (R7.6/R8.6).

    ``now`` is an injectable reference date for deterministic tests (R8.6
    forbids a module-level clock override) — production callers omit it and
    get the real UTC date.
    """
    snapshots = payload.get("valid_from_snapshots")
    if not snapshots:
        return payload
    try:
        ordered = sorted(
            snapshots,
            key=lambda item: str(item.get("valid_from", "")),
        )
    except Exception as err:
        raise RuntimeError("pricing snapshot sorting failed") from err

    reference = now if now is not None else datetime.now(timezone.utc).date()
    non_future = [
        item
        for item in ordered
        if (snapshot_date := _snapshot_valid_from_date(item)) is not None
        and snapshot_date <= reference
    ]
    if non_future:
        return non_future[-1]

    _LOGGER.warning(
        "All %d pricing snapshot(s) are future-dated relative to %s; "
        "falling back to the earliest snapshot",
        len(ordered),
        reference.isoformat(),
    )
    return ordered[0]


def _derive_pricing_enums() -> tuple[
    Tuple[str, ...],
    Tuple[str, ...],
    str,
    str,
    str,
    float,
    float,
]:
    payload = _load_released_pricelists()
    distributors_block = payload.get("distributors", {})
    if not isinstance(distributors_block, dict):
        raise RuntimeError("pricing release distributors must be a dict")

    dist_keys = tuple(sorted({str(k) for k in distributors_block.keys()}))
    tariff_keys = sorted(
        {
            str(tariff)
            for item in distributors_block.values()
            if isinstance(item, dict)
            for tariff in item.keys()
        }
    )

    default_dist = dist_keys[0] if dist_keys else ""
    default_tariff = tuple(tariff_keys)[0] if tariff_keys else ""

    snapshot = _pick_latest_snapshot(payload)
    snapshot_distributors = snapshot.get("distributors", payload["distributors"])
    fallback = next((rates for rates in snapshot_distributors.values() if isinstance(rates, dict)), {})
    if isinstance(fallback, dict):
        fallback_rate = fallback.get(default_tariff, {}) if default_tariff else {}
    else:
        fallback_rate = {}

    default_price_incl = float(
        fallback_rate.get("price_incl_vat", 0.0)
    ) if isinstance(fallback_rate, dict) else 0.0
    default_price_excl = float(
        fallback_rate.get("price_excl_vat", 0.0)
    ) if isinstance(fallback_rate, dict) else 0.0
    default_unit = (
        str(fallback_rate.get("unit", "Kc/A/mesic"))
        if isinstance(fallback_rate, dict)
        else "Kc/A/mesic"
    )

    return (
        dist_keys,
        tuple(tariff_keys),
        default_dist,
        str(default_tariff),
        default_unit,
        default_price_incl,
        default_price_excl,
    )


_PRICE_DISTRIBUTORS, _PRICE_TARIFFS, _PRICE_DEFAULT_DISTRIBUTOR, _PRICE_DEFAULT_TARIFF, _PRICE_DEFAULT_UNIT, _PRICE_DEFAULT_INCL, _PRICE_DEFAULT_EXCL = (
    _derive_pricing_enums()
)

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
        if f.hidden:
            continue
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
        if f.show_if is not None:
            target, allowed = f.show_if
            spec["show_if"] = {"field": target, "in": list(allowed)}
        if f.show_if_all is not None:
            spec["show_if_all"] = [
                {"field": target, "in": list(allowed)} for target, allowed in f.show_if_all
            ]
        for attr in ("widget", "scale", "entity_domain"):
            if getattr(f, attr) is not None:
                spec[attr] = getattr(f, attr)
        if f.optional:
            spec["optional"] = True
        out[key] = spec
    return out


# --- section: modules -------------------------------------------------------
# reload_on_change on EVERY enable_* flag (f1/wv2-modules-fix root cause b):
# these gate whole platforms/entity sets at async_setup_entry (e.g. CHMU
# sensors, solar-forecast, battery-prediction, boiler). Without the flag a
# persisted flip left the old entities alive until a HA restart — the owner's
# "turn OFF Výstrahy ČHMÚ has no effect" repro. The flag routes the merge-save
# through _needs_reload -> async_update_options -> async_reload (config_merge.py
# / __init__.py:2203), which tears down and rebuilds the entry's entities.
_register(
    Field("enable_solar_forecast", "modules", bool, default=False, reload_on_change=True),
    Field("enable_battery_prediction", "modules", bool, default=False, reload_on_change=True),
    Field("enable_pricing", "modules", bool, default=False, reload_on_change=True),
    Field("enable_boiler", "modules", bool, default=False, reload_on_change=True),
    # OQ-5 resolution (PLAN2-RESOLUTIONS.md): defaults follow the flow and the
    # live box (both True). Flipping these lets _build_base_options derive the
    # values from the registry without changing emitted behaviour — an entry
    # that never stored these keys still reads True on GET.
    Field("enable_statistics", "modules", bool, default=True, reload_on_change=True),
    Field("enable_extended_sensors", "modules", bool, default=True, reload_on_change=True),
    Field("enable_chmu_warnings", "modules", bool, default=False, reload_on_change=True),
)

# --- section: battery -------------------------------------------------------
_register(
    Field("auto_mode_switch_enabled", "battery", bool, default=False),
    Field("charge_rate_kw", "battery", float, default=None, min=0.5, max=10.0,
          step=0.1, mirror="home_charge_rate"),
    Field("expensive_percentile", "battery", float, default=None, min=0.5, max=0.95,
          scale=100),
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
    Field("solar_forecast_provider", "solar", str, default="forecast_solar",
          enum=("forecast_solar", "solcast")),
    Field("solar_forecast_mode", "solar", str, default="daily_optimized",
          enum=("hourly", "every_4h", "daily_optimized"),
          show_if=("solar_forecast_provider", ("forecast_solar",))),
    Field("solar_forecast_api_key", "solar", str, default="", secret=True, optional=True,
          show_if=("solar_forecast_provider", ("forecast_solar",))),
    Field("solcast_api_key", "solar", str, default="", secret=True,
          show_if=("solar_forecast_provider", ("solcast",))),
    Field("solcast_site_id", "solar", str, default="", secret=True,
          show_if=("solar_forecast_provider", ("solcast",))),
    Field("solar_forecast_latitude", "solar", float, default=None, min=-90.0, max=90.0,
          step=0.0001),
    Field("solar_forecast_longitude", "solar", float, default=None, min=-180.0, max=180.0,
          step=0.0001),
    Field("solar_forecast_string1_enabled", "solar", bool, default=False),
    Field("solar_forecast_string1_kwp", "solar", float, default=None, min=0.1, max=50.0,
          step=0.1, show_if=("solar_forecast_string1_enabled", (True,))),
    Field("solar_forecast_string1_declination", "solar", int, default=None, min=0, max=90,
          show_if=("solar_forecast_string1_enabled", (True,))),
    Field("solar_forecast_string1_azimuth", "solar", int, default=None, min=-180, max=180,
          show_if=("solar_forecast_string1_enabled", (True,))),
    Field("solar_forecast_string2_enabled", "solar", bool, default=False),
    Field("solar_forecast_string2_kwp", "solar", float, default=None, min=0.1, max=50.0,
          step=0.1, show_if=("solar_forecast_string2_enabled", (True,))),
    Field("solar_forecast_string2_declination", "solar", int, default=None, min=0, max=90,
          show_if=("solar_forecast_string2_enabled", (True,))),
    Field("solar_forecast_string2_azimuth", "solar", int, default=None, min=-180, max=180,
          show_if=("solar_forecast_string2_enabled", (True,))),
)

# --- section: boiler --------------------------------------------------------
# TRANSCRIBED 1:1 from _MODULE_CONFIG_FIELDS["boiler"]; reload_on_change=True on every field.
_register(
    Field("boiler_volume_l", "boiler", float, default=None, min=30.0, max=1000.0,
          reload_on_change=True),
    Field("boiler_temp_sensor_top", "boiler", str, default="", reload_on_change=True,
          entity_domain="sensor"),
    Field("boiler_temp_sensor_bottom", "boiler", str, default="", reload_on_change=True,
          entity_domain="sensor", optional=True),
    Field("boiler_enable_second_thermometer", "boiler", bool, default=False,
          reload_on_change=True),
    Field("boiler_current_power_entity", "boiler", str, default="", reload_on_change=True,
          entity_domain="sensor", optional=True),
    Field("boiler_alt_energy_sensor", "boiler", str, default="", reload_on_change=True,
          entity_domain="sensor", optional=True),
    Field("boiler_alt_energy_daily", "boiler", bool, default=False, reload_on_change=True),
    Field("boiler_alt_cost_kwh", "boiler", float, default=None, min=0.0, max=20.0,
          reload_on_change=True),
    Field("boiler_has_alternative_heating", "boiler", bool, default=False,
          reload_on_change=True),
    Field("boiler_target_temp_c", "boiler", float, default=None, min=40.0, max=85.0,
          reload_on_change=True),
    Field("boiler_deadline_time", "boiler", str, default="", reload_on_change=True),
    Field("boiler_alt_source_type", "boiler", str, default="gas",
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


# --- section: ai ------------------------------------------------------------
# SCOPE-REVISION #8: co-equal choice, NO hard default, NO "recommended".
# SCOPE-REVISION #9: OIG supplies its own backend; base_url is user-overridable.
# The API KEY IS DELIBERATELY ABSENT — it belongs to AiKeyStore (.storage), P2.
_register(
    Field("ai_provider", "ai", str, default="", optional=True,
          enum=("ai_task", "groq", "nvidia")),
    Field("ai_base_url", "ai", str, default="", optional=True),
    Field("ai_model", "ai", str, default="", optional=True),
)


# --- section: pricing --------------------------------------------------------
# R5.2: distributor enum must be derived from released dataset, not a hardcoded
# list. The confirmed price fields are populated from the same data so the client
# can prefill the wizard without duplicate parser logic.
_register(
    Field(
        "confirmed_distribution_distributor",
        "pricing",
        str,
        default=_PRICE_DEFAULT_DISTRIBUTOR,
        enum=_PRICE_DISTRIBUTORS,
    ),
    Field(
        "confirmed_distribution_tariff",
        "pricing",
        str,
        default=_PRICE_DEFAULT_TARIFF,
        enum=_PRICE_TARIFFS,
    ),
    Field(
        "confirmed_distribution_price_incl_vat",
        "pricing",
        float,
        default=_PRICE_DEFAULT_INCL,
        min=0.0,
    ),
    Field(
        "confirmed_distribution_price_excl_vat",
        "pricing",
        float,
        default=_PRICE_DEFAULT_EXCL,
        min=0.0,
    ),
    Field(
        "confirmed_distribution_unit",
        "pricing",
        str,
        default=_PRICE_DEFAULT_UNIT,
        optional=True,
    ),
)


# --- section: pricing_supplier ----------------------------------------------
# RCA-R3 (docs/redesign_2026_07/rework/RCA-R3.md): the commercial/supplier
# pricing fields the legacy `config/steps.py` wizard reads/writes were never
# ported to the registry. This section restores them under the EXACT legacy
# `entry.options` key names (RCA-R3's inventory) — no migration, no renames —
# plus the 5 new NT-variant keys UX-SPEC-wizard-v2.md §4 (owner correction,
# round 2) adds for the VT/NT split of the three fields the legacy flow left
# unsplit. Key-naming call (spec explicitly leaves this to the implementer,
# §4 line ~421): the *base* field keeps the legacy unsuffixed name
# (`spot_positive_fee_percent`, not `..._vt`) because that is the literal key
# already live in users' `entry.options` — RCA-R3's backward-compat
# requirement overrides the spec's illustrative `_vt` spelling for fields
# that have no suffix today. `fixed_commercial_price_vt`/`_nt` and
# `distribution_fee_vt_kwh`/`_nt` already carry legacy suffixes, unchanged.
DUAL_TARIFF_CODES: Tuple[str, ...] = (
    "D25d", "D26d", "D27d", "D35d", "D45d", "D56d", "D57d", "D61d",
)


def is_dual_tariff(tariff_code: Any) -> bool:
    """RCA-R3 dual-ness derivation: tariff code decides the VT/NT split."""
    return tariff_code in DUAL_TARIFF_CODES


_register(
    # --- A: Nakupni cena (import) ---
    Field("spot_pricing_model", "pricing_supplier", str, default="percentage",
          enum=("percentage", "fixed", "fixed_prices")),
    Field("spot_positive_fee_percent", "pricing_supplier", float, default=15.0,
          min=0.0, max=100.0, show_if=("spot_pricing_model", ("percentage",))),
    Field("spot_positive_fee_percent_nt", "pricing_supplier", float, default=13.0,
          min=0.0, max=100.0,
          show_if_all=(("spot_pricing_model", ("percentage",)),
                       ("confirmed_distribution_tariff", DUAL_TARIFF_CODES))),
    Field("spot_negative_fee_percent", "pricing_supplier", float, default=9.0,
          min=0.0, max=100.0, show_if=("spot_pricing_model", ("percentage",))),
    Field("spot_negative_fee_percent_nt", "pricing_supplier", float, default=7.0,
          min=0.0, max=100.0,
          show_if_all=(("spot_pricing_model", ("percentage",)),
                       ("confirmed_distribution_tariff", DUAL_TARIFF_CODES))),
    Field("spot_fixed_fee_mwh", "pricing_supplier", float, default=500.0,
          min=0.0, show_if=("spot_pricing_model", ("fixed",))),
    Field("spot_fixed_fee_mwh_nt", "pricing_supplier", float, default=400.0,
          min=0.0,
          show_if_all=(("spot_pricing_model", ("fixed",)),
                       ("confirmed_distribution_tariff", DUAL_TARIFF_CODES))),
    Field("fixed_commercial_price_vt", "pricing_supplier", float, default=4.50,
          min=0.0, show_if=("spot_pricing_model", ("fixed_prices",))),
    Field("fixed_commercial_price_nt", "pricing_supplier", float, default=3.20,
          min=0.0,
          show_if_all=(("spot_pricing_model", ("fixed_prices",)),
                       ("confirmed_distribution_tariff", DUAL_TARIFF_CODES))),

    # --- B: Prodejni cena / export ---
    Field("export_pricing_model", "pricing_supplier", str, default="percentage",
          enum=("percentage", "fixed", "fixed_prices")),
    Field("export_fee_percent", "pricing_supplier", float, default=15.0,
          min=0.0, max=100.0, show_if=("export_pricing_model", ("percentage",))),
    Field("export_fee_percent_nt", "pricing_supplier", float, default=13.0,
          min=0.0, max=100.0,
          show_if_all=(("export_pricing_model", ("percentage",)),
                       ("confirmed_distribution_tariff", DUAL_TARIFF_CODES))),
    Field("export_fixed_fee_czk", "pricing_supplier", float, default=0.20,
          min=0.0, show_if=("export_pricing_model", ("fixed",))),
    Field("export_fixed_fee_czk_nt", "pricing_supplier", float, default=0.15,
          min=0.0,
          show_if_all=(("export_pricing_model", ("fixed",)),
                       ("confirmed_distribution_tariff", DUAL_TARIFF_CODES))),
    Field("export_fixed_price", "pricing_supplier", float, default=2.50,
          min=0.0, show_if=("export_pricing_model", ("fixed_prices",))),

    # --- Tariff schedule (UX-SPEC step 4; registry-side this is still
    # pricing_supplier — the step split is wizard-UI layout, out of scope) ---
    Field("tariff_vt_start_weekday", "pricing_supplier", str, default="6",
          show_if=("confirmed_distribution_tariff", DUAL_TARIFF_CODES)),
    Field("tariff_nt_start_weekday", "pricing_supplier", str, default="22,2",
          show_if=("confirmed_distribution_tariff", DUAL_TARIFF_CODES)),
    Field("tariff_weekend_same_as_weekday", "pricing_supplier", bool, default=True,
          show_if=("confirmed_distribution_tariff", DUAL_TARIFF_CODES)),
    Field("tariff_vt_start_weekend", "pricing_supplier", str, default="", optional=True,
          show_if_all=(("confirmed_distribution_tariff", DUAL_TARIFF_CODES),
                       ("tariff_weekend_same_as_weekday", (False,)))),
    Field("tariff_nt_start_weekend", "pricing_supplier", str, default="0",
          show_if_all=(("confirmed_distribution_tariff", DUAL_TARIFF_CODES),
                       ("tariff_weekend_same_as_weekday", (False,)))),

    # --- Derived, not user-facing (UX-SPEC §4, owner correction round 2) ---
    Field("dual_tariff_enabled", "pricing_supplier", bool, default=True, hidden=True),
)


# UX-SPEC-wizard-v2.md §3/§4 (owner correction, round 2 — supplier-step
# redesign): distribution does not belong in the supplier contract's step —
# relocated to the `pricing` section (distribution's own registry section).
# KEY NAMES UNCHANGED — an existing entry's `entry.options["vat_rate"]` etc.
# stay valid; only the registry `section` attribute (wizard-step grouping)
# moves.
_register(
    Field("distribution_fee_vt_kwh", "pricing", float, default=1.42, min=0.0),
    Field("distribution_fee_nt_kwh", "pricing", float, default=0.91, min=0.0,
          show_if=("confirmed_distribution_tariff", DUAL_TARIFF_CODES)),
    Field("vat_rate", "pricing", float, default=21.0, min=0.0, max=100.0),
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
    # Proxy-only knobs: relevant only when data_source_mode reads from the
    # local proxy ("hybrid" is the legacy alias _sanitize_data_source_mode
    # maps to local_only, config/steps.py:95 — a pre-existing entry stored
    # with that value must still show these fields, not just new local_only
    # picks).
    Field("local_proxy_stale_minutes", "basic", int, default=10, min=1, max=120,
          step=1, scope="basic",
          show_if=("data_source_mode", ("local_only", "hybrid"))),
    Field("local_event_debounce_ms", "basic", int, default=300, min=0, max=5000,
          step=1, scope="basic",
          show_if=("data_source_mode", ("local_only", "hybrid"))),
    Field("enable_dashboard", "basic", bool, default=False, scope="basic"),
)
