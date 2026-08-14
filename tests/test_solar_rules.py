"""U3/U6: ONE set of solar cross-field rules, shared by REST and the options flow."""
from __future__ import annotations

import pytest

from custom_components.oig_cloud.config import solar_rules

validate_solar_effective = solar_rules.validate_solar_effective


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


@pytest.mark.parametrize("raw", [0, 90, 138, 180, 270, 360, 90.0])
def test_compass_azimuth_accepts_only_finite_integral_range(raw):
    expected = int(raw)
    assert solar_rules.validate_compass_azimuth(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        True,
        False,
        "90",
        90.5,
        -1,
        361,
        10**400,
        float("nan"),
        float("inf"),
        float("-inf"),
    ],
)
def test_compass_azimuth_rejects_noncanonical_input(raw):
    with pytest.raises(ValueError):
        solar_rules.validate_compass_azimuth(raw)


@pytest.mark.parametrize(
    ("stored", "display", "legacy", "valid"),
    [
        (-180, 0, True, True),
        (-90, 90, True, True),
        (-42, 138, True, True),
        (138, 138, False, True),
        (360, 360, False, True),
        (361, None, False, False),
        (720, None, False, False),
        (90.5, None, False, False),
        ("NaN", None, False, False),
        (float("inf"), None, False, False),
    ],
)
def test_legacy_azimuth_read_model_never_mutates_stored_value(
    stored, display, legacy, valid
):
    model = solar_rules.legacy_azimuth_read_model(stored)
    assert model["stored_value"] == stored
    assert model["display_value"] == display
    assert model["legacy_provider_value"] is legacy
    assert model["requires_adoption"] is legacy
    assert model["valid_for_provider"] is valid


@pytest.mark.parametrize(
    ("compass", "provider"),
    [(0, -180), (90, -90), (138, -42), (180, 0), (270, 90), (360, 180)],
)
def test_forecast_solar_azimuth_converts_only_at_provider_boundary(
    compass, provider
):
    assert solar_rules.forecast_solar_azimuth(compass) == provider


def test_forecast_solar_azimuth_keeps_explicit_legacy_provider_value_raw():
    assert solar_rules.forecast_solar_azimuth(-90, legacy_provider_value=True) == -90
    with pytest.raises(ValueError):
        solar_rules.forecast_solar_azimuth(361)
    with pytest.raises(ValueError):
        solar_rules.forecast_solar_azimuth(90.5)
