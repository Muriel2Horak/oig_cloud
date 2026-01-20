"""Schema and constants for config flow."""

from __future__ import annotations

from typing import Dict, List, Optional

import voluptuous as vol

from ..const import CONF_PASSWORD, CONF_USERNAME

# Scan intervals
CONF_STANDARD_SCAN_INTERVAL = "standard_scan_interval"
CONF_EXTENDED_SCAN_INTERVAL = "extended_scan_interval"

# Solar Forecast constants
CONF_SOLAR_FORECAST_ENABLED = "solar_forecast_enabled"
CONF_SOLAR_FORECAST_PROVIDER = "solar_forecast_provider"
CONF_SOLAR_FORECAST_API_KEY = "solar_forecast_api_key"
CONF_SOLCAST_API_KEY = "solcast_api_key"
CONF_SOLCAST_SITE_ID = "solcast_site_id"
CONF_SOLAR_FORECAST_LATITUDE = "solar_forecast_latitude"
CONF_SOLAR_FORECAST_LONGITUDE = "solar_forecast_longitude"
CONF_SOLAR_FORECAST_INTERVAL = "solar_forecast_interval"

# String 1
CONF_SOLAR_FORECAST_STRING1_ENABLED = "solar_forecast_string1_enabled"
CONF_SOLAR_FORECAST_STRING1_DECLINATION = "solar_forecast_string1_declination"
CONF_SOLAR_FORECAST_STRING1_AZIMUTH = "solar_forecast_string1_azimuth"
CONF_SOLAR_FORECAST_STRING1_KWP = "solar_forecast_string1_kwp"

# String 2
CONF_SOLAR_FORECAST_STRING2_ENABLED = "solar_forecast_string2_enabled"
CONF_SOLAR_FORECAST_STRING2_DECLINATION = "solar_forecast_string2_declination"
CONF_SOLAR_FORECAST_STRING2_AZIMUTH = "solar_forecast_string2_azimuth"
CONF_SOLAR_FORECAST_STRING2_KWP = "solar_forecast_string2_kwp"

# Statistics
CONF_STATISTICS_ENABLED = "statistics_enabled"
CONF_STATISTICS_SAMPLING_SIZE = "statistics_sampling_size"
CONF_STATISTICS_MAX_AGE_DAYS = "statistics_max_age_days"
CONF_STATISTICS_RESTORE_DATA = "statistics_restore_data"
CONF_STATISTICS_MEDIAN_MINUTES = "statistics_median_minutes"

SPOT_PRICING_SCHEMA = vol.Schema(
    {
        vol.Optional("spot_trading_enabled", default=False): bool,
        vol.Optional("distribution_area", default="PRE"): vol.In(["PRE", "CEZ", "EGD"]),
        vol.Optional("fixed_price_enabled", default=True): bool,
        vol.Optional("fixed_price_vt", default=4.50): vol.Coerce(float),
        vol.Optional("fixed_price_nt", default=3.20): vol.Coerce(float),
        vol.Optional("fixed_price_single", default=4.00): vol.Coerce(float),
        vol.Optional("tariff_type", default="dual"): vol.In(["single", "dual"]),
        vol.Optional("spot_buy_fixed_fee", default=0.0): vol.Coerce(float),
        vol.Optional("spot_buy_percent_positive", default=110.0): vol.Coerce(float),
        vol.Optional("spot_buy_percent_negative", default=90.0): vol.Coerce(float),
        vol.Optional("spot_sell_fixed_fee", default=0.0): vol.Coerce(float),
        vol.Optional("spot_sell_percent_positive", default=85.0): vol.Coerce(float),
        vol.Optional("spot_sell_percent_negative", default=100.0): vol.Coerce(float),
        vol.Optional("spot_buy_combined_enabled", default=False): bool,
        vol.Optional("spot_sell_combined_enabled", default=False): bool,
    }
)

DISTRIBUTION_SCHEMA = vol.Schema(
    {
        vol.Optional("breaker_size", default=25): vol.In(
            [16, 20, 25, 32, 40, 50, 63, 80, 100]
        ),
        vol.Optional("consumption_category", default="C02d"): vol.In(
            ["C01d", "C02d", "C25d", "C26d"]
        ),
        vol.Optional("monthly_consumption_kwh", default=300): vol.Coerce(int),
        vol.Optional("yearly_consumption_kwh", default=3600): vol.Coerce(int),
        vol.Optional("auto_load_distribution_fees", default=True): bool,
    }
)

STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_USERNAME, description={"suggested_value": ""}): str,
        vol.Required(CONF_PASSWORD): str,
        vol.Required(
            "live_data_enabled",
            default=False,
            description="✅ POTVRZUJI: Mám v aplikaci OIG Cloud zapnutá 'Živá data'",
        ): bool,
        vol.Optional(
            "enable_solar_forecast",
            default=False,
            description="Povolit solární předpověď",
        ): bool,
        vol.Optional(
            "enable_statistics",
            default=True,
            description="Povolit statistiky a analýzy",
        ): bool,
        vol.Optional(
            "enable_pricing",
            default=False,
            description="Povolit cenové senzory a spotové ceny z OTE",
        ): bool,
        vol.Optional(
            "enable_extended_sensors",
            default=True,
            description="Povolit rozšířené senzory (napětí, proudy, teploty)",
        ): bool,
        vol.Optional(
            "enable_dashboard",
            default=False,
            description="Povolit webový dashboard s grafy",
        ): bool,
    }
)


def validate_tariff_hours(
    vt_starts_str: str, nt_starts_str: str, allow_single_tariff: bool = False
) -> tuple[bool, Optional[str]]:
    """Validate VT/NT tariff hour starts for gaps and overlaps."""
    vt_starts, error = _parse_hour_starts(vt_starts_str)
    if error:
        return False, error

    nt_starts, error = _parse_hour_starts(nt_starts_str)
    if error:
        return False, error

    if not vt_starts and not nt_starts:
        return False, "tariff_gaps"
    if allow_single_tariff and (not vt_starts or not nt_starts):
        return True, None
    if not vt_starts or not nt_starts:
        return False, "tariff_gaps"

    hour_map: Dict[int, str] = {}

    if not _fill_tariff_hours(hour_map, vt_starts, vt_starts, nt_starts, "VT"):
        return False, "overlapping_tariffs"
    if not _fill_tariff_hours(hour_map, nt_starts, vt_starts, nt_starts, "NT"):
        return False, "overlapping_tariffs"

    if len(hour_map) != 24:
        return False, "tariff_gaps"

    return True, None


def _parse_hour_starts(value: str) -> tuple[List[int], Optional[str]]:
    try:
        hours = [int(x.strip()) for x in value.split(",") if x.strip()]
    except ValueError:
        return [], "invalid_hour_format"
    if not all(0 <= h <= 23 for h in hours):
        return [], "invalid_hour_range"
    return hours, None


def _next_tariff_start(all_starts: List[int], start: int) -> int:
    try:
        next_start_idx = all_starts.index(start) + 1
        if next_start_idx < len(all_starts):
            return all_starts[next_start_idx]
        return all_starts[0]
    except (ValueError, IndexError):
        return (start + 1) % 24


def _fill_tariff_hours(
    hour_map: Dict[int, str],
    starts: List[int],
    vt_starts: List[int],
    nt_starts: List[int],
    label: str,
) -> bool:
    for start in sorted(starts):
        all_starts = sorted(vt_starts + nt_starts)
        next_start = _next_tariff_start(all_starts, start)
        h = start
        while h != next_start:
            if h in hour_map:
                return False
            hour_map[h] = label
            h = (h + 1) % 24
            if len(hour_map) > 24:  # pragma: no cover
                break
    return True
