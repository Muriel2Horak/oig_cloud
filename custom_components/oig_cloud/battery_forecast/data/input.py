"""Input helpers for battery forecast (solar/load lookup)."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Optional

_LOGGER = logging.getLogger(__name__)


def get_solar_for_timestamp(
    timestamp: datetime,
    solar_forecast: Dict[str, Any],
    *,
    log_rate_limited: Optional[Any] = None,
) -> float:
    """Get solar production for a timestamp (kWh per 15min)."""
    today = datetime.now().date()
    is_today = timestamp.date() == today

    data = solar_forecast.get("today" if is_today else "tomorrow", {})

    if not data:
        return 0.0

    timestamp_hour = timestamp.replace(minute=0, second=0, microsecond=0)

    # Strip timezone to match solar_forecast key format
    if timestamp_hour.tzinfo is not None:
        hour_key = timestamp_hour.replace(tzinfo=None).isoformat()
    else:
        hour_key = timestamp_hour.isoformat()

    hourly_kw = data.get(hour_key, 0.0)

    if timestamp.hour in (7, 8, 9, 10) and log_rate_limited:
        try:
            keys_count = len(data)
        except Exception:
            keys_count = -1
        log_rate_limited(
            "solar_lookup_debug",
            "debug",
            "🔍 SOLAR LOOKUP: ts=%s hour_key=%s keys=%s value=%s",
            timestamp.isoformat(),
            hour_key,
            keys_count,
            hourly_kw,
            cooldown_s=3600.0,
        )

    try:
        hourly_kw = float(hourly_kw)
    except (ValueError, TypeError):
        _LOGGER.warning(
            "Invalid solar value for %s: %s (type=%s), key=%s",
            timestamp.strftime("%H:%M"),
            hourly_kw,
            type(hourly_kw),
            hour_key,
        )
        return 0.0

    if timestamp.hour in (14, 15, 16) and log_rate_limited:
        log_rate_limited(
            "solar_values_debug",
            "debug",
            "Solar sample for %s: key=%s kW=%.3f 15min_kWh=%.3f",
            timestamp.strftime("%H:%M"),
            hour_key,
            hourly_kw,
            hourly_kw / 4.0,
            cooldown_s=3600.0,
        )

    return hourly_kw / 4.0


def get_load_avg_for_timestamp(
    timestamp: datetime,
    load_avg_sensors: Dict[str, Any],
    *,
    state: Optional[Any] = None,
) -> float:
    """Get load average for a timestamp (kWh per 15min)."""
    if not load_avg_sensors:
        if state is not None and not getattr(
            state, "_empty_load_sensors_logged", False
        ):
            _LOGGER.debug(
                "load_avg_sensors dictionary is empty - using fallback 500W (statistics sensors may not be available yet)"
            )
            setattr(state, "_empty_load_sensors_logged", True)
        return 0.125

    is_weekend = timestamp.weekday() >= 5
    day_type = "weekend" if is_weekend else "weekday"

    current_hour = timestamp.hour

    for entity_id, sensor_data in load_avg_sensors.items():
        sensor_day_type = sensor_data.get("day_type", "")
        if sensor_day_type != day_type:
            continue

        time_range = sensor_data.get("time_range")
        if not time_range or not isinstance(time_range, tuple) or len(time_range) != 2:
            continue

        start_hour, end_hour = time_range

        if start_hour <= end_hour:
            in_range = start_hour <= current_hour < end_hour
        else:
            in_range = current_hour >= start_hour or current_hour < end_hour

        if in_range:
            watts = sensor_data.get("value", 0.0)

            if watts == 0:
                watts = 500.0
                _LOGGER.debug(
                    "No consumption data yet for %s, using fallback: 500W",
                    timestamp.strftime("%H:%M"),
                )

            kwh_per_hour = watts / 1000.0
            kwh_per_15min = kwh_per_hour / 4.0
            _LOGGER.debug(
                "Matched %s for %s: %sW → %.5f kWh/15min",
                entity_id,
                timestamp.strftime("%H:%M"),
                watts,
                kwh_per_15min,
            )
            return kwh_per_15min

    _LOGGER.debug(
        "No load_avg sensor found for %s (%s), searched %s sensors - using fallback 500W",
        timestamp.strftime("%H:%M"),
        day_type,
        len(load_avg_sensors),
    )
    return 0.125
