"""P5 field registry: one canonical definition per config field."""
from __future__ import annotations

import pytest

from custom_components.oig_cloud.config_registry import (
    FIELD_REGISTRY,
    Field,
    coerce_value,
    fields_for_section,
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
    assert coerce_value(f, "true") is True
    assert coerce_value(f, "off") is False
    with pytest.raises(ValueError):
        coerce_value(f, "banana")


def test_coerce_float_bounds():
    f = Field(key="r", section="battery", type=float, default=2.8, min=0.5, max=10.0)
    assert coerce_value(f, "3.5") == 3.5
    with pytest.raises(ValueError):
        coerce_value(f, 0.1)   # below min
    with pytest.raises(ValueError):
        coerce_value(f, 11)    # above max


def test_coerce_enum():
    f = Field(key="p", section="solar", type=str, enum=("forecast_solar", "solcast"))
    assert coerce_value(f, "solcast") == "solcast"
    with pytest.raises(ValueError):
        coerce_value(f, "nasa")


def test_registry_keys_match_field_keys():
    for key, field in FIELD_REGISTRY.items():
        assert key == field.key
        assert field.section in ("modules", "battery", "solar", "boiler", "basic")


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
    # parity with the legacy _MODULE_CONFIG_FIELDS whitelist
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


def test_get_parity_defaults_all_sections():
    """Registry defaults must equal what legacy GET returns for empty options.

    The legacy view computes: spec.get("default",
        False if bool else ("" if str else None)).
    When GET is rewired to the registry, output for an unset field must not change.
    """
    from custom_components.oig_cloud.api.ha_rest_api import _MODULE_CONFIG_FIELDS

    for section in ("modules", "battery", "solar", "boiler"):
        reg = fields_for_section(section)
        legacy = _MODULE_CONFIG_FIELDS[section]
        assert set(reg) == set(legacy), f"{section}: key set differs from legacy whitelist"
        for key, spec in legacy.items():
            legacy_default = spec.get(
                "default",
                False if spec["type"] is bool else ("" if spec["type"] is str else None),
            )
            assert reg[key].default == legacy_default, (
                f"{key}: registry default {reg[key].default!r} != legacy GET {legacy_default!r}"
            )
            assert reg[key].type is spec["type"], f"{key}: type mismatch"


def test_solar_and_boiler_sections_ported():
    solar = fields_for_section("solar")
    boiler = fields_for_section("boiler")
    assert solar["solar_forecast_provider"].enum == ("forecast_solar", "solcast")
    assert solar["solar_forecast_api_key"].secret is True
    assert solar["solcast_api_key"].secret is True
    assert solar["solar_forecast_latitude"].min == -90.0
    assert solar["solar_forecast_string1_azimuth"].min == -180
    # boiler: parity spot-checks (full parity asserted by the guard test below)
    assert "boiler_target_temp_c" in boiler
    assert boiler["boiler_volume_l"].reload_on_change is True


def test_registry_covers_legacy_whitelist():
    from custom_components.oig_cloud.api.ha_rest_api import _MODULE_CONFIG_FIELDS
    for section, fields in _MODULE_CONFIG_FIELDS.items():
        for key in fields:
            assert key in FIELD_REGISTRY, f"missing {section}.{key} in registry"
