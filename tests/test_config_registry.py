"""P5 field registry: one canonical definition per config field."""
from __future__ import annotations

import pytest

from datetime import date

from custom_components.oig_cloud.config_registry import (
    DUAL_TARIFF_CODES,
    FIELD_REGISTRY,
    Field,
    _pick_latest_snapshot,
    coerce_value,
    fields_for_section,
    is_dual_tariff,
    registry_as_api_dict,
)


def test_field_defaults_are_sane():
    f = Field(key="x", section="battery", type=float, default=1.0, min=0.0, max=10.0)
    assert f.scope == "premium"
    assert f.secret is False
    assert f.mirror is None
    assert f.label == "field.x.label"  # auto-derived i18n key
    assert f.hint == "field.x.hint"


def test_coerce_bool():
    f = Field(key="b", section="modules", type=bool, default=False)
    assert coerce_value(f, True) is True
    assert coerce_value(f, False) is False
    # fail-closed parity with legacy REST validation: strings are rejected
    with pytest.raises(ValueError):
        coerce_value(f, "true")
    with pytest.raises(ValueError):
        coerce_value(f, "banana")


def test_coerce_float_bounds():
    f = Field(key="r", section="battery", type=float, default=2.8, min=0.5, max=10.0)
    assert coerce_value(f, 3.5) == 3.5
    assert coerce_value(f, 3) == 3.0  # int accepted for float field, like legacy
    with pytest.raises(ValueError):
        coerce_value(f, 0.1)   # below min
    with pytest.raises(ValueError):
        coerce_value(f, 11)    # above max
    with pytest.raises(ValueError):
        coerce_value(f, "3.5")  # fail-closed: numeric strings rejected, like legacy


def test_coerce_enum():
    f = Field(key="p", section="solar", type=str, enum=("forecast_solar", "solcast"))
    assert coerce_value(f, "solcast") == "solcast"
    with pytest.raises(ValueError):
        coerce_value(f, "nasa")


def test_registry_keys_match_field_keys():
    for key, field in FIELD_REGISTRY.items():
        assert key == field.key
        assert field.section in (
            "modules", "battery", "solar", "boiler", "basic", "ai", "pricing",
            "pricing_supplier",
        )


def test_fields_for_section_filters():
    battery = fields_for_section("battery")
    assert battery and all(f.section == "battery" for f in battery.values())


def test_api_dict_never_leaks_secret_defaults():
    api = registry_as_api_dict()
    for key, spec in api.items():
        if spec.get("secret"):
            assert "default" not in spec or spec["default"] in (None, "")
        assert "label" in spec and "section" in spec and "type" in spec


def test_modules_and_battery_sections_ported():
    modules = fields_for_section("modules")
    battery = fields_for_section("battery")
    # Canonical registry owns the module and battery field definitions.
    assert set(modules) == {
        "enable_solar_forecast", "enable_battery_prediction", "enable_pricing",
        "enable_boiler", "enable_statistics", "enable_extended_sensors",
        "enable_chmu_warnings",
    }
    assert {"charge_rate_kw", "expensive_percentile", "battery_comfort_soc_percent",
            "balancing_enabled", "cheap_window_percentile"} <= set(battery)
    assert battery["charge_rate_kw"].mirror == "home_charge_rate"
    assert battery["charge_rate_kw"].min == 0.5 and battery["charge_rate_kw"].max == 10.0
    assert battery["expensive_percentile"].min == 0.5 and battery["expensive_percentile"].max == 0.95
    assert battery["battery_comfort_soc_percent"].min == 0.0 and battery["battery_comfort_soc_percent"].max == 95.0


def test_module_enable_fields_reload_on_change():
    """f1/wv2-modules-fix root cause (b): a persisted enable_* flip must trigger
    an entry reload so CHMU/solar/battery/boiler entities appear or disappear
    without a HA restart. All 7 module toggles carry reload_on_change."""
    modules = fields_for_section("modules")
    for key in (
        "enable_solar_forecast", "enable_battery_prediction", "enable_pricing",
        "enable_boiler", "enable_statistics", "enable_extended_sensors",
        "enable_chmu_warnings",
    ):
        assert modules[key].reload_on_change is True, key


def test_registry_defaults_round_trip_for_all_sections():
    """Every configured default is accepted by its canonical field definition."""
    for section in ("modules", "battery", "solar", "boiler"):
        fields = fields_for_section(section)
        assert fields
        for field in fields.values():
            if field.default is None:
                continue
            assert coerce_value(field, field.default) == field.default


def test_solar_and_boiler_sections_ported():
    solar = fields_for_section("solar")
    boiler = fields_for_section("boiler")
    assert solar["solar_forecast_provider"].enum == ("forecast_solar", "solcast")
    assert solar["solar_forecast_api_key"].secret is True
    assert solar["solcast_api_key"].secret is True
    assert solar["solar_forecast_latitude"].min == -90.0
    assert solar["solar_forecast_string1_azimuth"].min == -180
    assert "boiler_target_temp_c" in boiler
    assert boiler["boiler_volume_l"].reload_on_change is True


# --- Part B: fail-closed coercion --------------------------------------------

def test_coerce_value_rejects_bool_as_number():
    with pytest.raises(ValueError):
        coerce_value(FIELD_REGISTRY["charge_rate_kw"], True)


def test_coerce_value_rejects_non_finite_numbers():
    """NaN and Infinity must be rejected for both float and int fields."""
    for key in ("charge_rate_kw", "balancing_interval_days"):
        field = FIELD_REGISTRY[key]
        for raw in (float("nan"), float("inf"), float("-inf")):
            with pytest.raises(ValueError, match="expected finite number"):
                coerce_value(field, raw)


def test_coerce_value_rejects_oversized_int_with_range_error():
    """An arbitrarily large finite JSON integer must not raise OverflowError.

    It should fail the existing range check with ValueError so the REST view
    returns 400 instead of 500.
    """
    field = FIELD_REGISTRY["balancing_interval_days"]
    with pytest.raises(ValueError, match="above maximum"):
        coerce_value(field, 10**400)


def test_coerce_value_rejects_oversized_int_on_float_field():
    """float(10**400) raises OverflowError; it must surface as a range ValueError.

    The raw integer is compared against the bounds, so the caller gets the same
    above/below-range message as any other out-of-range number — never a 500.
    """
    field = FIELD_REGISTRY["charge_rate_kw"]
    with pytest.raises(ValueError, match="above maximum"):
        coerce_value(field, 10**400)
    with pytest.raises(ValueError, match="below minimum"):
        coerce_value(field, -(10**400))


def test_coerce_value_oversized_int_on_unbounded_float_field():
    """An unbounded float field still converts overflow into ValueError."""
    field = Field("unbounded_test", "battery", float)
    with pytest.raises(ValueError, match="out of range"):
        coerce_value(field, 10**400)


def test_coerce_value_int_field_accepts_equivalent_float():
    """An int field given a whole-number float must coerce like before."""
    field = FIELD_REGISTRY["balancing_interval_days"]
    assert coerce_value(field, 3.0) == 3
    assert isinstance(coerce_value(field, 3.0), int)


def test_coerce_value_rejects_non_string_for_str():
    with pytest.raises(ValueError):
        coerce_value(FIELD_REGISTRY["boiler_temp_sensor_top"], 123)


def test_coerce_value_rejects_none():
    with pytest.raises(ValueError):
        coerce_value(FIELD_REGISTRY["boiler_temp_sensor_top"], None)
    with pytest.raises(ValueError):
        coerce_value(FIELD_REGISTRY["charge_rate_kw"], None)
    with pytest.raises(ValueError):
        coerce_value(FIELD_REGISTRY["enable_solar_forecast"], None)


def test_coerce_value_truncates_long_string_to_200():
    value = coerce_value(FIELD_REGISTRY["boiler_temp_sensor_top"], "x" * 201)
    assert isinstance(value, str)
    assert len(value) == 200


# --- section: basic ---------------------------------------------------------


def test_basic_section_has_six_fields():
    basic = fields_for_section("basic")
    assert set(basic) == {
        "standard_scan_interval",
        "extended_scan_interval",
        "data_source_mode",
        "local_proxy_stale_minutes",
        "local_event_debounce_ms",
        "enable_dashboard",
    }


def test_pricing_section_has_distributor_selector_and_confirmed_price_fields():
    pricing = fields_for_section("pricing")
    assert set(pricing) == {
        "confirmed_distribution_distributor",
        "confirmed_distribution_tariff",
        "confirmed_distribution_price_incl_vat",
        "confirmed_distribution_price_excl_vat",
        "confirmed_distribution_unit",
        # Relocated from pricing_supplier (UX-SPEC §3/§4, owner correction
        # round 2) — see test_distribution_fee_and_vat_rate_moved_to_pricing_section.
        "distribution_fee_vt_kwh", "distribution_fee_nt_kwh", "vat_rate",
    }
    assert pricing["confirmed_distribution_distributor"].section == "pricing"
    assert pricing["confirmed_distribution_distributor"].enum
    assert pricing["confirmed_distribution_tariff"].enum


def test_basic_field_metadata_matches_flow():
    basic = fields_for_section("basic")
    assert basic["standard_scan_interval"] == Field(
        "standard_scan_interval", "basic", int, default=30, min=30, max=300, step=1,
        scope="basic", reload_on_change=True,
    )
    assert basic["extended_scan_interval"] == Field(
        "extended_scan_interval", "basic", int, default=300, min=300, max=3600, step=1,
        scope="basic", reload_on_change=True,
    )
    # OQ-6 resolution: enum is 3-value, including legacy "hybrid". The UI
    # never offers "hybrid" — that is the flow's job (steps._sanitize_data_source_mode).
    assert basic["data_source_mode"] == Field(
        "data_source_mode", "basic", str, default="cloud_only",
        enum=("cloud_only", "local_only", "hybrid"), scope="basic",
    )
    # Proxy-only fields render/apply only in local_only/hybrid mode (fe/fix
    # connection-step defect: FE `show_if` mechanism existed but the backend
    # registry never set it for these two, so they always rendered).
    assert basic["local_proxy_stale_minutes"] == Field(
        "local_proxy_stale_minutes", "basic", int, default=10, min=1, max=120, step=1,
        scope="basic", show_if=("data_source_mode", ("local_only", "hybrid")),
    )
    assert basic["local_event_debounce_ms"] == Field(
        "local_event_debounce_ms", "basic", int, default=300, min=0, max=5000, step=1,
        scope="basic", show_if=("data_source_mode", ("local_only", "hybrid")),
    )


def test_proxy_fields_hidden_outside_local_hybrid_mode():
    basic = fields_for_section("basic")
    for key in ("local_proxy_stale_minutes", "local_event_debounce_ms"):
        assert basic[key].show_if == ("data_source_mode", ("local_only", "hybrid")), key
    assert basic["enable_dashboard"] == Field(
        "enable_dashboard", "basic", bool, default=False, scope="basic",
    )


def test_basic_fields_scope_is_basic():
    for field in fields_for_section("basic").values():
        assert field.scope == "basic"
        assert field.secret is False
        assert field.mirror is None


# --- F1 Plan 3 Task 1: show_if / render metadata / enum-default fixes -------


def test_field_show_if_defaults_to_none():
    f = Field(key="x", section="solar", type=str, default="")
    assert f.show_if is None
    assert f.widget is None
    assert f.scale is None
    assert f.optional is False
    assert f.entity_domain is None


def test_solar_secrets_are_provider_conditional():
    """U1/U2: which key is required is a property of the registry, not the FE."""
    reg = FIELD_REGISTRY
    assert reg["solcast_api_key"].show_if == ("solar_forecast_provider", ("solcast",))
    assert reg["solcast_site_id"].show_if == ("solar_forecast_provider", ("solcast",))
    assert reg["solar_forecast_api_key"].show_if == (
        "solar_forecast_provider", ("forecast_solar",))
    assert reg["solar_forecast_mode"].show_if == (
        "solar_forecast_provider", ("forecast_solar",))


def test_string2_geometry_is_gated_on_string2_enabled():
    """U7: geometry fields hide when their string is off."""
    for key in ("solar_forecast_string2_kwp", "solar_forecast_string2_declination",
                "solar_forecast_string2_azimuth"):
        assert FIELD_REGISTRY[key].show_if == ("solar_forecast_string2_enabled", (True,))


def test_show_if_targets_are_real_registry_keys():
    """A typo in show_if must not silently hide a field forever."""
    for key, f in FIELD_REGISTRY.items():
        if f.show_if is None:
            continue
        target, allowed = f.show_if
        assert target in FIELD_REGISTRY, f"{key}.show_if points at unknown {target}"
        assert allowed, f"{key}.show_if has an empty allowed set"
        tf = FIELD_REGISTRY[target]
        for value in allowed:
            # allowed values must be legal for the TARGET field's own type
            assert isinstance(value, tf.type), f"{key}.show_if: {value!r} not a {tf.type.__name__}"


@pytest.mark.parametrize("key", [
    "solar_forecast_provider",
    "solar_forecast_mode",
    "boiler_alt_source_type",   # the THIRD instance — same bug, different section
])
def test_provider_default_round_trips_through_coerce(key):
    """REGRESSION (verified live 2026-07-17): these registry defaults ('') are
    rejected by their own coerce_value (config_registry.py:74-75), so GET ->
    POST of an untouched form 400s."""
    f = FIELD_REGISTRY[key]
    assert coerce_value(f, f.default) == f.default


def test_no_enum_field_defaults_outside_its_own_enum():
    """The general rule behind the three instances above — a fourth must not
    slip in unnoticed. An enum field's default must be legal, or blank-and-
    optional if 'unset' is genuinely a state (e.g. ai_provider, Task 8)."""
    for key, f in FIELD_REGISTRY.items():
        if f.enum is None:
            continue
        if f.default in ("", None) and f.optional:
            continue   # deliberately unset — Task 8's ai_provider
        assert f.default in f.enum, f"{key}: default {f.default!r} not in {f.enum}"


def _snapshots_payload(snapshots):
    return {"distributors": {}, "valid_from_snapshots": snapshots}


def test_pick_latest_snapshot_skips_future_dated_snapshot():
    payload = _snapshots_payload([
        {"valid_from": "2024-01-01"},
        {"valid_from": "2025-01-01"},
        {"valid_from": "2099-01-01"},  # future relative to `now` below
    ])
    selected = _pick_latest_snapshot(payload, now=date(2026, 1, 1))
    assert selected["valid_from"] == "2025-01-01"


def test_pick_latest_snapshot_all_future_falls_back_to_earliest_without_crashing():
    payload = _snapshots_payload([
        {"valid_from": "2099-06-01"},
        {"valid_from": "2050-01-01"},
    ])
    selected = _pick_latest_snapshot(payload, now=date(2026, 1, 1))
    assert selected["valid_from"] == "2050-01-01"


def test_pick_latest_snapshot_no_snapshots_key_returns_payload_unchanged():
    payload = {"distributors": {}, "year": 2026}
    assert _pick_latest_snapshot(payload, now=date(2026, 1, 1)) is payload


def test_api_dict_emits_show_if_and_widget_metadata():
    api = registry_as_api_dict()
    assert api["solcast_api_key"]["show_if"] == {
        "field": "solar_forecast_provider", "in": ["solcast"]}
    assert api["expensive_percentile"]["scale"] == 100
    assert api["boiler_temp_sensor_top"]["entity_domain"] == "sensor"
    assert api["boiler_temp_sensor_bottom"]["optional"] is True


# --- F1 U4 R3: pricing_supplier restoration (RCA-R3 + UX-SPEC-wizard-v2.md §4) ---


def test_pricing_supplier_section_has_all_21_legacy_keys():
    """RCA-R3's 19-key inventory + UX-SPEC round-2's 5 new _nt keys, minus
    the 3 distribution/VAT keys relocated to the `pricing` section by the
    supplier-step redesign (UX-SPEC §3/§4, owner correction round 2 —
    distribution does not belong in the supplier-contract step)."""
    supplier = fields_for_section("pricing_supplier")
    assert set(supplier) == {
        # A — import
        "spot_pricing_model",
        "spot_positive_fee_percent", "spot_positive_fee_percent_nt",
        "spot_negative_fee_percent", "spot_negative_fee_percent_nt",
        "spot_fixed_fee_mwh", "spot_fixed_fee_mwh_nt",
        "fixed_commercial_price_vt", "fixed_commercial_price_nt",
        # B — export
        "export_pricing_model",
        "export_fee_percent", "export_fee_percent_nt",
        "export_fixed_fee_czk", "export_fixed_fee_czk_nt",
        "export_fixed_price",
        # tariff schedule
        "tariff_vt_start_weekday", "tariff_nt_start_weekday",
        "tariff_weekend_same_as_weekday",
        "tariff_vt_start_weekend", "tariff_nt_start_weekend",
        # derived
        "dual_tariff_enabled",
    }
    assert len(supplier) == 21
    for key, field in supplier.items():
        assert field.section == "pricing_supplier"


def test_distribution_fee_and_vat_rate_moved_to_pricing_section():
    """UX-SPEC §3/§4 (owner correction round 2): distribution_fee_vt_kwh/
    _nt_kwh and vat_rate are a distribution-level fact, not the supplier
    contract — relocated out of `pricing_supplier` into `pricing`. Key names
    are UNCHANGED (no migration needed for stored `entry.options`)."""
    supplier = fields_for_section("pricing_supplier")
    pricing = fields_for_section("pricing")
    for key in ("distribution_fee_vt_kwh", "distribution_fee_nt_kwh", "vat_rate"):
        assert key not in supplier
        assert key in pricing
        assert pricing[key].section == "pricing"
        assert pricing[key].secret is False


def test_pricing_supplier_base_keys_match_legacy_entry_options_names():
    """No renames (RCA-R3 hard requirement): the base/legacy fields keep the
    EXACT unsuffixed key already live in existing entry.options — only the
    genuinely new NT variants get a `_nt` suffix."""
    supplier = fields_for_section("pricing_supplier")
    legacy_unsuffixed = {
        "spot_pricing_model", "spot_positive_fee_percent",
        "spot_negative_fee_percent", "spot_fixed_fee_mwh",
        "export_pricing_model", "export_fee_percent", "export_fixed_fee_czk",
        "export_fixed_price", "dual_tariff_enabled",
    }
    for key in legacy_unsuffixed:
        assert key in supplier
        assert not key.endswith("_vt") and not key.endswith("_nt")
    new_nt_keys = {
        "spot_positive_fee_percent_nt", "spot_negative_fee_percent_nt",
        "spot_fixed_fee_mwh_nt", "export_fee_percent_nt",
        "export_fixed_fee_czk_nt",
    }
    for key in new_nt_keys:
        assert key in supplier
        assert key.endswith("_nt")


@pytest.mark.parametrize("code", DUAL_TARIFF_CODES)
def test_is_dual_tariff_true_for_every_dual_code(code):
    assert is_dual_tariff(code) is True


@pytest.mark.parametrize("code", ["D01d", "D02d", "POZE", "", "unknown"])
def test_is_dual_tariff_false_for_single_tariff_codes(code):
    assert is_dual_tariff(code) is False


def test_dual_tariff_codes_match_ux_spec_inventory():
    assert set(DUAL_TARIFF_CODES) == {
        "D25d", "D26d", "D27d", "D35d", "D45d", "D56d", "D57d", "D61d",
    }


def test_dual_tariff_enabled_is_hidden_and_not_user_facing():
    """UX-SPEC §4 (owner correction, round 2 — MAJOR): dual_tariff_enabled
    is never a user-facing field in any step."""
    field = FIELD_REGISTRY["dual_tariff_enabled"]
    assert field.hidden is True
    assert field.type is bool
    assert field.default is True
    api = registry_as_api_dict()
    assert "dual_tariff_enabled" not in api  # hidden fields never reach the FE


def test_pricing_supplier_show_if_predicates_resolve_to_known_fields():
    """Every show_if / show_if_all target must be a real field the section
    (or a sibling section, for the cross-section tariff-dual predicate) owns."""
    supplier = fields_for_section("pricing_supplier")
    known_targets = set(FIELD_REGISTRY)
    for key, field in supplier.items():
        if field.show_if is not None:
            target, allowed = field.show_if
            assert target in known_targets, f"{key}: unknown show_if target {target}"
            assert allowed
        if field.show_if_all is not None:
            assert len(field.show_if_all) >= 2, f"{key}: show_if_all needs 2+ conditions"
            for target, allowed in field.show_if_all:
                assert target in known_targets, f"{key}: unknown show_if_all target {target}"
                assert allowed


def test_nt_variant_fields_gate_on_scenario_and_tariff_dual():
    """The 5 new _nt fields need BOTH the parent scenario AND tariff
    dual-ness — this is exactly why show_if_all (AND) exists."""
    supplier = fields_for_section("pricing_supplier")
    expected = {
        "spot_positive_fee_percent_nt": "spot_pricing_model",
        "spot_negative_fee_percent_nt": "spot_pricing_model",
        "spot_fixed_fee_mwh_nt": "spot_pricing_model",
        "export_fee_percent_nt": "export_pricing_model",
        "export_fixed_fee_czk_nt": "export_pricing_model",
    }
    for key, scenario_field in expected.items():
        field = supplier[key]
        assert field.show_if is None
        assert field.show_if_all is not None
        targets = {target for target, _ in field.show_if_all}
        assert targets == {scenario_field, "confirmed_distribution_tariff"}
        for target, allowed in field.show_if_all:
            if target == "confirmed_distribution_tariff":
                assert set(allowed) == set(DUAL_TARIFF_CODES)


def test_tariff_weekend_fields_gate_on_dual_and_not_same_as_weekday():
    supplier = fields_for_section("pricing_supplier")
    for key in ("tariff_vt_start_weekend", "tariff_nt_start_weekend"):
        field = supplier[key]
        assert field.show_if_all is not None
        conds = dict(field.show_if_all)
        assert set(conds["confirmed_distribution_tariff"]) == set(DUAL_TARIFF_CODES)
        assert conds["tariff_weekend_same_as_weekday"] == (False,)


def test_pricing_supplier_fields_have_show_if_all_serialized_in_api_dict():
    api = registry_as_api_dict()
    spec = api["spot_positive_fee_percent_nt"]
    assert spec["show_if_all"] == [
        {"field": "spot_pricing_model", "in": ["percentage"]},
        {"field": "confirmed_distribution_tariff", "in": list(DUAL_TARIFF_CODES)},
    ]
    # Fields with only a single condition still use the original show_if shape.
    assert api["spot_positive_fee_percent"]["show_if"] == {
        "field": "spot_pricing_model", "in": ["percentage"]}
    assert "show_if_all" not in api["spot_positive_fee_percent"]


def test_pricing_supplier_scope_and_no_secrets():
    for field in fields_for_section("pricing_supplier").values():
        assert field.secret is False
        assert field.mirror is None


def test_boiler_battery_cycle_cost_default_matches_legacy_literal():
    assert FIELD_REGISTRY["boiler_battery_cycle_cost_czk_kwh"].default == pytest.approx(0.50)
