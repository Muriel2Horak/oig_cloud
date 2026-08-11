"""Solar provider copy and translation parity contracts."""
from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "oig_cloud"
CS_COMPASS = "Sever 0°/360°, východ 90°, jih 180°, západ 270°. Rozsah: 0–360°."
EN_COMPASS = "North 0°/360°, east 90°, south 180°, west 270°. Range: 0–360°."


def _load(relative: str) -> dict:
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def test_all_wizard_azimuth_hints_use_compass_copy_for_both_strings() -> None:
    catalogs = (
        (_load("strings.json"), CS_COMPASS),
        (_load("translations/cs.json"), CS_COMPASS),
        (_load("translations/en.json"), EN_COMPASS),
    )
    for catalog, expected in catalogs:
        for flow in ("config", "options"):
            descriptions = catalog[flow]["step"]["wizard_solar"]["data_description"]
            assert descriptions["solar_forecast_string1_azimuth"] == expected
            assert descriptions["solar_forecast_string2_azimuth"] == expected

    legacy_en = _load("translations/en.json")["options"]["step"][
        "solar_forecast"
    ]["data_description"]
    assert legacy_en["solar_forecast_string1_azimuth"] == EN_COMPASS
    assert legacy_en["solar_forecast_string2_azimuth"] == EN_COMPASS


def test_solcast_help_owns_geometry_and_marks_local_kwp_non_transmitted() -> None:
    for relative, language_markers in (
        ("translations/cs.json", ("Rooftop Site", "neposílá")),
        ("translations/en.json", ("Rooftop Site", "not sent")),
    ):
        catalog = _load(relative)
        for flow in ("config", "options"):
            descriptions = catalog[flow]["step"]["wizard_solar"]["data_description"]
            assert language_markers[0] in descriptions["solcast_site_id"]
            for number in (1, 2):
                kwp = descriptions[f"solar_forecast_string{number}_kwp"]
                assert "Solcast" in kwp
                assert language_markers[1] in kwp


def test_wizard_translation_key_parity_and_json_parse() -> None:
    catalogs = [_load(path) for path in (
        "strings.json", "translations/cs.json", "translations/en.json"
    )]
    for flow in ("config", "options"):
        key_sets = [
            set(catalog[flow]["step"]["wizard_solar"]["data_description"])
            for catalog in catalogs
        ]
        assert key_sets[0] == key_sets[1] == key_sets[2]


def test_native_solar_descriptions_are_provider_neutral_and_catalogs_match() -> None:
    catalogs = (
        (_load("strings.json"), "Forecast.Solar nebo Solcast", "Rooftop Site"),
        (_load("translations/cs.json"), "Forecast.Solar nebo Solcast", "Rooftop Site"),
        (_load("translations/en.json"), "Forecast.Solar or Solcast", "Rooftop Site"),
    )
    for catalog, provider_choice, rooftop in catalogs:
        for flow in ("config", "options"):
            step = catalog[flow]["step"]["wizard_solar"]
            assert provider_choice in step["description"]
            assert rooftop in step["description"]
            module_hint = catalog[flow]["step"]["wizard_modules"][
                "data_description"
            ]["enable_solar_forecast"]
            assert provider_choice in module_hint

    for flow in ("config", "options"):
        descriptions = [
            catalog[flow]["step"]["wizard_solar"]["description"]
            for catalog, _choice, _rooftop in catalogs
        ]
        assert all("Solcast" in description for description in descriptions)
