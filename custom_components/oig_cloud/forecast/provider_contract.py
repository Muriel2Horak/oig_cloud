"""Pure, side-effect-free solar provider boundary contract."""
from __future__ import annotations

import json
import math
from collections.abc import Mapping
from typing import Any
from urllib.parse import quote, urlencode

from ..config.solar_rules import (
    forecast_solar_azimuth,
    legacy_azimuth_read_model,
    validate_compass_azimuth,
)

FORECAST_SOLAR_API_ROOT = "https://api.forecast.solar"
SOLCAST_ROOFTOP_API_ROOT = "https://api.solcast.com.au/rooftop_sites"
SOLAR_PROVIDERS = frozenset({"forecast_solar", "solcast"})
SOLAR_MODES = frozenset({"daily", "daily_optimized", "every_4h", "hourly"})
FAST_SOLAR_MODES = frozenset({"every_4h", "hourly"})


def _segment(value: Any) -> str:
    return quote(_number_text(value) if isinstance(value, (int, float)) else str(value), safe="")


def _number_text(value: int | float) -> str:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("expected number")
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError("expected finite number")
    if float(value).is_integer():
        return str(int(value))
    return format(float(value), ".15g")


def build_forecast_solar_url(
    *,
    api_key: str,
    lat: float,
    lon: float,
    declination: int,
    compass_azimuth: int,
    kwp: float,
    legacy_provider_value: bool = False,
) -> str:
    """Build one encoded Forecast.Solar estimate URL."""
    provider_azimuth = forecast_solar_azimuth(
        compass_azimuth, legacy_provider_value=legacy_provider_value
    )
    suffix = "/".join(
        _segment(value)
        for value in (lat, lon, declination, provider_azimuth, kwp)
    )
    key_prefix = f"/{_segment(api_key)}" if api_key else ""
    return f"{FORECAST_SOLAR_API_ROOT}{key_prefix}/estimate/{suffix}"


def build_solcast_url(*, api_key: str, site_id: str) -> str:
    """Build one encoded Solcast Rooftop Site URL."""
    query = urlencode({"format": "json", "api_key": api_key})
    return f"{SOLCAST_ROOFTOP_API_ROOT}/{_segment(site_id)}/forecasts?{query}"


def safe_provider_diagnostic(provider: str, code: str) -> dict[str, str]:
    """Return fixed diagnostic metadata without URLs or credentials."""
    safe_provider = provider if provider in SOLAR_PROVIDERS else "unknown"
    return {"provider": safe_provider, "code": str(code)}


def _strict_bool(value: Any, field: str) -> bool:
    if not isinstance(value, bool):
        raise ValueError(f"{field}: expected boolean")
    return value


def _strict_float(value: Any, field: str, minimum: float, maximum: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field}: expected finite number")
    try:
        result = float(value)
    except OverflowError as err:
        raise ValueError(f"{field}: outside {minimum}..{maximum}") from err
    if not math.isfinite(result) or not minimum <= result <= maximum:
        raise ValueError(f"{field}: outside {minimum}..{maximum}")
    return result


def _strict_int(value: Any, field: str, minimum: int, maximum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field}: expected finite integral number")
    if isinstance(value, float) and (not math.isfinite(value) or not value.is_integer()):
        raise ValueError(f"{field}: expected finite integral number")
    if not minimum <= value <= maximum:
        raise ValueError(f"{field}: outside {minimum}..{maximum}")
    return int(value)


def _selected_secret(
    field: str, active_credentials: Mapping[str, Any], patch: Mapping[str, Any]
) -> str:
    incoming = patch.get(field)
    if isinstance(incoming, str) and incoming.strip():
        return incoming.strip()
    active = active_credentials.get(field)
    return active.strip() if isinstance(active, str) else ""


def build_effective_solar_dto(
    stored_options: Mapping[str, Any],
    active_credentials: Mapping[str, Any],
    incoming_patch: Mapping[str, Any],
) -> dict[str, Any]:
    """Merge and validate one provider-discriminated effective DTO."""
    effective = dict(stored_options)
    effective.update(
        {
            key: value
            for key, value in incoming_patch.items()
            if key not in {"solar_forecast_api_key", "solcast_api_key", "solcast_site_id"}
        }
    )
    provider = effective.get("solar_forecast_provider", "forecast_solar")
    if provider not in SOLAR_PROVIDERS:
        raise ValueError("solar_forecast_provider: unknown provider")
    mode = effective.get("solar_forecast_mode", "daily_optimized")
    if mode not in SOLAR_MODES:
        raise ValueError("solar_forecast_mode: unknown mode")

    dto: dict[str, Any] = {
        "solar_forecast_provider": provider,
        "solar_forecast_mode": mode,
    }
    if provider == "forecast_solar":
        key = _selected_secret(
            "solar_forecast_api_key", active_credentials, incoming_patch
        )
        if mode in FAST_SOLAR_MODES and not key:
            raise ValueError("solar_forecast_api_key: required for selected mode")
        if key:
            dto["solar_forecast_api_key"] = key
        dto["solar_forecast_latitude"] = _strict_float(
            effective.get("solar_forecast_latitude"),
            "solar_forecast_latitude",
            -90,
            90,
        )
        dto["solar_forecast_longitude"] = _strict_float(
            effective.get("solar_forecast_longitude"),
            "solar_forecast_longitude",
            -180,
            180,
        )
    else:
        for field in ("solcast_api_key", "solcast_site_id"):
            value = _selected_secret(field, active_credentials, incoming_patch)
            if not value:
                raise ValueError(f"{field}: required")
            dto[field] = value

    for number in (1, 2):
        enabled_key = f"solar_forecast_string{number}_enabled"
        enabled = _strict_bool(effective.get(enabled_key, False), enabled_key)
        dto[enabled_key] = enabled
        if not enabled:
            continue
        kwp_key = f"solar_forecast_string{number}_kwp"
        dto[kwp_key] = _strict_float(effective.get(kwp_key), kwp_key, 0.1, 50)
        if provider == "forecast_solar":
            declination_key = f"solar_forecast_string{number}_declination"
            azimuth_key = f"solar_forecast_string{number}_azimuth"
            dto[declination_key] = _strict_int(
                effective.get(declination_key), declination_key, 0, 90
            )
            azimuth = effective.get(azimuth_key)
            legacy = legacy_azimuth_read_model(azimuth)
            if legacy is not None and legacy["legacy_provider_value"]:
                if azimuth_key in incoming_patch:
                    raise ValueError(f"{azimuth_key}: expected compass azimuth 0..360")
                dto[azimuth_key] = int(legacy["stored_value"])
                dto[f"{azimuth_key}_legacy_provider_value"] = True
            else:
                try:
                    dto[azimuth_key] = validate_compass_azimuth(azimuth)
                except ValueError as err:
                    raise ValueError(f"{azimuth_key}: {err}") from err

    if not dto["solar_forecast_string1_enabled"] and not dto[
        "solar_forecast_string2_enabled"
    ]:
        raise ValueError("base: no strings enabled")
    return dto


def serialize_effective_solar_dto(dto: Mapping[str, Any]) -> bytes:
    """Serialize validated DTOs canonically for proof binding."""
    return json.dumps(
        dict(dto),
        ensure_ascii=True,
        allow_nan=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
