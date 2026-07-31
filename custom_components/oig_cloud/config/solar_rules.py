"""Solar cross-field rules — the SINGLE source for provider/mode/key dependencies.

Called by BOTH the dashboard REST POST and the HA options flow, so a provider
switch can never persist a configuration the other surface would reject
(UX-AUDIT U3). Azimuth is normalised to ONE signed convention (U6).

Pure functions, no Home Assistant imports: importable from tests and from the
REST layer alike.
"""
from __future__ import annotations

from typing import Any, Dict

_FAST_MODES = ("hourly", "every_4h")


def normalize_azimuth(value: Any) -> int:
    """Normalise any azimuth to the signed -180..180 convention (0 = south).

    The registry and the dashboard already use signed (config_registry.py
    string1/2_azimuth min=-180 max=180; settings/index.ts:92 "0 = jih"); the
    options flow historically accepted unsigned 0..360 (steps.py:1662, :1679).
    Legacy stored values are mapped, not rejected.
    """
    # Wrap into (-180, 180]: 0=south, ±180=north. int(value) raises on junk,
    # which callers catch. 180 stays 180 (not -180) to match the registry's
    # inclusive +180 bound.
    azim = int(value) % 360
    if azim > 180:
        azim -= 360
    return azim


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
