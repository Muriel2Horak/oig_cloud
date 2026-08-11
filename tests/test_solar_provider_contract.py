"""Provider-boundary URL, DTO, and deterministic serialization contracts."""
from __future__ import annotations

from copy import deepcopy
from urllib.parse import parse_qs, unquote, urlsplit

import pytest

from custom_components.oig_cloud.forecast import provider_contract


def _forecast_options(**overrides):
    options = {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_latitude": 50,
        "solar_forecast_longitude": 14.5,
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5,
        "solar_forecast_string1_declination": 35,
        "solar_forecast_string1_azimuth": 138,
        "solar_forecast_string2_enabled": False,
        "solar_forecast_string2_kwp": 3,
        "solar_forecast_string2_declination": 20,
        "solar_forecast_string2_azimuth": 270,
    }
    options.update(overrides)
    return options


@pytest.mark.parametrize("secret", ["a/b", "a?b", "a#b", "a%b", "a b"])
def test_forecast_solar_url_encodes_api_key_as_one_path_segment(secret):
    build = provider_contract.build_forecast_solar_url
    url = build(
        api_key=secret,
        lat=50.1,
        lon=14.2,
        declination=35,
        compass_azimuth=138,
        kwp=5.5,
    )
    split = urlsplit(url)
    segments = split.path.split("/")
    assert split.scheme == "https"
    assert split.netloc == "api.forecast.solar"
    assert unquote(segments[1]) == secret
    assert segments[2:] == ["estimate", "50.1", "14.2", "35", "-42", "5.5"]
    assert split.query == ""


@pytest.mark.parametrize("secret", ["a/b", "a?b", "a#b", "a%b", "a b"])
def test_solcast_url_encodes_site_path_and_api_key_query(secret):
    url = provider_contract.build_solcast_url(api_key=secret, site_id=secret)
    split = urlsplit(url)
    assert split.scheme == "https"
    assert split.netloc == "api.solcast.com.au"
    assert unquote(split.path.split("/")[2]) == secret
    assert parse_qs(split.query) == {"format": ["json"], "api_key": [secret]}


def test_safe_provider_diagnostic_contains_no_secret_or_credential_url():
    secret = "sentinel/a?b#c%d e"
    diagnostic = provider_contract.safe_provider_diagnostic(
        "solcast", "provider_unreachable"
    )
    rendered = repr(diagnostic)
    assert diagnostic == {
        "provider": "solcast",
        "code": "provider_unreachable",
    }
    assert secret not in rendered
    assert "api.solcast.com.au" not in rendered


def test_effective_forecast_dto_merges_patch_and_retains_omitted_or_blank_secret():
    build = provider_contract.build_effective_solar_dto
    dto = build(
        _forecast_options(),
        {"solar_forecast_api_key": "active-key"},
        {"solar_forecast_string1_kwp": 6, "solar_forecast_api_key": ""},
    )
    assert dto == {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_api_key": "active-key",
        "solar_forecast_latitude": 50.0,
        "solar_forecast_longitude": 14.5,
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 6.0,
        "solar_forecast_string1_declination": 35,
        "solar_forecast_string1_azimuth": 138,
        "solar_forecast_string2_enabled": False,
    }


def test_effective_solcast_dto_excludes_geometry_but_keeps_enabled_string_kwp():
    stored = _forecast_options()
    before = deepcopy(stored)
    dto = provider_contract.build_effective_solar_dto(
        stored,
        {"solcast_api_key": "solcast-key", "solcast_site_id": "site-id"},
        {"solar_forecast_provider": "solcast", "solar_forecast_mode": "daily"},
    )
    assert dto == {
        "solar_forecast_provider": "solcast",
        "solar_forecast_mode": "daily",
        "solcast_api_key": "solcast-key",
        "solcast_site_id": "site-id",
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5.0,
        "solar_forecast_string2_enabled": False,
    }
    assert stored == before
    assert not any(
        key in dto
        for key in (
            "solar_forecast_latitude",
            "solar_forecast_longitude",
            "solar_forecast_string1_declination",
            "solar_forecast_string1_azimuth",
        )
    )


def test_deterministic_serializer_canonicalizes_numeric_equivalence_and_order():
    build = provider_contract.build_effective_solar_dto
    serialize = provider_contract.serialize_effective_solar_dto
    first = build(
        _forecast_options(solar_forecast_latitude=50, solar_forecast_string1_kwp=5),
        {"solar_forecast_api_key": "key"},
        {"solar_forecast_string1_declination": 35.0},
    )
    second = build(
        dict(reversed(list(_forecast_options(
            solar_forecast_latitude=50.0, solar_forecast_string1_kwp=5.0
        ).items()))),
        {"solar_forecast_api_key": "key"},
        dict(reversed(list({"solar_forecast_string1_declination": 35}.items()))),
    )
    assert serialize(first) == serialize(second)


@pytest.mark.parametrize(
    ("field", "bad"),
    [
        ("solar_forecast_latitude", True),
        ("solar_forecast_latitude", "50"),
        ("solar_forecast_latitude", float("nan")),
        ("solar_forecast_latitude", 91),
        ("solar_forecast_longitude", 181),
        ("solar_forecast_string1_kwp", 0.09),
        ("solar_forecast_string1_kwp", 51),
        ("solar_forecast_string1_declination", 35.5),
        ("solar_forecast_string1_azimuth", 361),
    ],
)
def test_effective_dto_rejects_invalid_numeric_contract(field, bad):
    with pytest.raises(ValueError, match=field):
        provider_contract.build_effective_solar_dto(
            _forecast_options(**{field: bad}),
            {},
            {},
        )


def test_effective_dto_preserves_stored_legacy_azimuth_but_rejects_new_negative_patch():
    stored = _forecast_options(solar_forecast_string1_azimuth=-1)
    dto = provider_contract.build_effective_solar_dto(stored, {}, {})
    assert dto["solar_forecast_string1_azimuth"] == -1
    assert dto["solar_forecast_string1_azimuth_legacy_provider_value"] is True

    with pytest.raises(ValueError, match="solar_forecast_string1_azimuth"):
        provider_contract.build_effective_solar_dto(
            _forecast_options(),
            {},
            {"solar_forecast_string1_azimuth": -1},
        )


def test_provider_switch_excludes_inactive_secret_without_mutating_inputs():
    stored = _forecast_options()
    active = {
        "solar_forecast_api_key": "forecast-key",
        "solcast_api_key": "solcast-key",
        "solcast_site_id": "site-id",
    }
    patch = {"solar_forecast_provider": "solcast"}
    snapshots = deepcopy((stored, active, patch))
    dto = provider_contract.build_effective_solar_dto(stored, active, patch)
    assert "solar_forecast_api_key" not in dto
    assert dto["solcast_api_key"] == "solcast-key"
    assert (stored, active, patch) == snapshots
