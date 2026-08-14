"""Solar cross-field rules and strict application-value validation.

Called by BOTH the dashboard REST POST and the HA options flow, so a provider
switch can never persist a configuration the other surface would reject
(UX-AUDIT U3). New values use compass degrees; legacy negative provider values
are described without mutation until explicit adoption.

Pure functions, no Home Assistant imports: importable from tests and from the
REST layer alike.
"""
from __future__ import annotations

import math
from typing import Any, Dict

_FAST_MODES = ("hourly", "every_4h")


def validate_compass_azimuth(value: Any) -> int:
    """Return an integral compass azimuth without wrapping invalid input."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("expected finite integral compass azimuth")
    if isinstance(value, float) and (not math.isfinite(value) or not value.is_integer()):
        raise ValueError("expected finite integral compass azimuth")
    if value < 0 or value > 360:
        raise ValueError("compass azimuth outside 0..360")
    return int(value)


def legacy_azimuth_read_model(value: Any) -> Dict[str, Any]:
    """Describe stored azimuth state without changing the stored representation."""
    valid_compass = False
    legacy_provider = False
    display_value: int | None = None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        finite_integral = not isinstance(value, float) or (
            math.isfinite(value) and value.is_integer()
        )
        if finite_integral and 0 <= value <= 360:
            valid_compass = True
            display_value = int(value)
        elif finite_integral and -180 <= value < 0:
            valid_compass = True
            legacy_provider = True
            display_value = int(value) + 180
    return {
        "stored_value": value,
        "display_value": display_value,
        "legacy_provider_value": legacy_provider,
        "requires_adoption": legacy_provider,
        "valid_for_provider": valid_compass,
    }


def forecast_solar_azimuth(
    value: Any, *, legacy_provider_value: bool = False
) -> int:
    """Map compass degrees to Forecast.Solar at the outbound boundary."""
    if legacy_provider_value:
        model = legacy_azimuth_read_model(value)
        if not model["legacy_provider_value"]:
            raise ValueError("expected legacy Forecast.Solar azimuth")
        return int(value)
    return validate_compass_azimuth(value) - 180


def validate_solar_effective(effective: Dict[str, Any]) -> Dict[str, str]:
    """Validate the EFFECTIVE (stored ∪ incoming) solar config.

    Returns {field_key: i18n_error_key}. This is the WHOLE solar cross-field rule
    set — every rule the options flow applies, so the two surfaces cannot drift:

    - provider/mode/key   (was ConfigFlow._validate_solar_provider, steps.py:1606-1622)
    - no_strings_enabled  (was ConfigFlow._validate_solar_strings,  steps.py:1637-1643)

    Per-string geometry (kwp/declination bounds, steps.py:1651-1683) stays in the
    flow: the registry already pins those bounds (config_registry.py:163-171) and
    REST enforces them per-field via coerce_value. Only CROSS-field rules live here.
    """
    errors: Dict[str, str] = {}
    provider = effective.get("solar_forecast_provider", "forecast_solar")

    if provider == "forecast_solar":
        mode = effective.get("solar_forecast_mode", "daily_optimized")
        api_key = str(effective.get("solar_forecast_api_key") or "").strip()
        if mode in _FAST_MODES and not api_key:
            errors["solar_forecast_mode"] = "api_key_required_for_frequent_updates"
    else:
        if not str(effective.get("solcast_api_key") or "").strip():
            errors["solcast_api_key"] = "solcast_api_key_required"
        if not str(effective.get("solcast_site_id") or "").strip():
            errors["solcast_site_id"] = "solcast_site_id_required"

    # M1: a solar config with no panels is meaningless on EITHER surface.
    if not effective.get("solar_forecast_string1_enabled") and not effective.get(
        "solar_forecast_string2_enabled"
    ):
        errors["base"] = "no_strings_enabled"
    return errors
