"""U3/U6: ONE set of solar cross-field rules, shared by REST and the options flow."""
from __future__ import annotations

import pytest

from custom_components.oig_cloud.config.solar_rules import (
    normalize_azimuth,
    validate_solar_effective,
)


def _opts(**over):
    base = {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_api_key": "",
        "solcast_api_key": "",
        "solcast_site_id": "",
        # string1 on: the no_strings_enabled rule (steps.py:1643) is part of the
        # shared rule set, so a valid fixture must satisfy it.
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string2_enabled": False,
    }
    base.update(over)
    return base


def test_forecast_solar_daily_needs_no_key():
    assert validate_solar_effective(_opts()) == {}


def test_both_strings_disabled_is_rejected():
    """M1: no_strings_enabled lived ONLY in the flow (_validate_solar_strings,
    steps.py:1637-1643) — REST happily saved a panel-less solar config."""
    errors = validate_solar_effective(
        _opts(solar_forecast_string1_enabled=False,
              solar_forecast_string2_enabled=False))
    assert errors == {"base": "no_strings_enabled"}


def test_either_string_alone_satisfies_the_rule():
    for on in ("solar_forecast_string1_enabled", "solar_forecast_string2_enabled"):
        opts = _opts(solar_forecast_string1_enabled=False,
                     solar_forecast_string2_enabled=False)
        opts[on] = True
        assert "base" not in validate_solar_effective(opts)


def test_forecast_solar_fast_mode_requires_its_own_key():
    errors = validate_solar_effective(_opts(solar_forecast_mode="hourly"))
    assert errors == {"solar_forecast_mode": "api_key_required_for_frequent_updates"}
    assert validate_solar_effective(
        _opts(solar_forecast_mode="hourly", solar_forecast_api_key="k")) == {}


def test_solcast_requires_key_and_site():
    errors = validate_solar_effective(_opts(solar_forecast_provider="solcast"))
    assert errors == {
        "solcast_api_key": "solcast_api_key_required",
        "solcast_site_id": "solcast_site_id_required",
    }


def test_switching_to_solcast_without_credentials_is_rejected():
    """The exact live bug: provider switch saved with blank Solcast fields."""
    stored = _opts(solar_forecast_api_key="fs-key")
    incoming = {"solar_forecast_provider": "solcast"}
    errors = validate_solar_effective({**stored, **incoming})
    assert "solcast_api_key" in errors and "solcast_site_id" in errors


@pytest.mark.parametrize("raw,expected", [
    (0, 0), (90, 90), (-90, -90), (180, 180),
    (270, -90),    # legacy unsigned west
    (360, 0),      # legacy unsigned north
    (181, -179),
])
def test_normalize_azimuth_maps_legacy_unsigned_to_signed(raw, expected):
    assert normalize_azimuth(raw) == expected
