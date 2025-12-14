"""Solar forecast utility functions.

Provides helper functions for extracting solar production data
from the solar forecast sensor.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List

_LOGGER = logging.getLogger(__name__)


def get_solar_for_timestamp(
    timestamp: datetime,
    solar_forecast: Dict[str, Any],
    interval_minutes: int = 15,
) -> float:
    """Get solar production for a given timestamp (kWh per interval).

    Args:
        timestamp: Timestamp to look up production for
        solar_forecast: Dict with 'today' and 'tomorrow' hourly data
        interval_minutes: Interval length in minutes (default 15)

    Returns:
        Solar production in kWh for the interval

    Example:
        solar_forecast = {
            "today": {"2025-12-09T14:00:00": 2.5, ...},  # kW values
            "tomorrow": {...}
        }
        kwh = get_solar_for_timestamp(datetime(2025,12,9,14,15), solar_forecast)
        # Returns: 2.5 * 0.25 = 0.625 kWh for 15min interval
    """
    if not solar_forecast:
        return 0.0

    # Determine if today or tomorrow
    today = datetime.now().date()
    is_today = timestamp.date() == today

    data = solar_forecast.get("today" if is_today else "tomorrow", {})

    if not data:
        return 0.0

    # Find hourly value for given time
    # Keys are ISO timestamp WITHOUT timezone: "2025-10-20T14:00:00"
    timestamp_hour = timestamp.replace(minute=0, second=0, microsecond=0)

    # Strip timezone to match solar_forecast key format
    if timestamp_hour.tzinfo is not None:
        hour_key = timestamp_hour.replace(tzinfo=None).isoformat()
    else:
        hour_key = timestamp_hour.isoformat()

    hourly_kw = data.get(hour_key, 0.0)

    try:
        hourly_kw = float(hourly_kw)
    except (ValueError, TypeError):
        _LOGGER.warning(
            f"Invalid solar value for {timestamp.strftime('%H:%M')}: "
            f"{hourly_kw} (type={type(hourly_kw)})"
        )
        return 0.0

    # Convert to interval kWh
    # Value is in kW (average power for hour)
    # For 15min: kW * 0.25h = kWh
    interval_hours = interval_minutes / 60.0
    return hourly_kw * interval_hours


def aggregate_solar_forecast(
    solar_forecast: Dict[str, Any],
    start: datetime,
    end: datetime,
    interval_minutes: int = 15,
) -> List[float]:
    """Aggregate solar forecast into interval-sized chunks.

    Args:
        solar_forecast: Dict with 'today' and 'tomorrow' hourly data
        start: Start datetime
        end: End datetime
        interval_minutes: Interval length in minutes

    Returns:
        List of kWh values for each interval
    """
    result = []
    current = start

    while current < end:
        kwh = get_solar_for_timestamp(current, solar_forecast, interval_minutes)
        result.append(kwh)
        current += timedelta(minutes=interval_minutes)

    return result


def get_total_solar_for_day(
    solar_forecast: Dict[str, Any],
    day: str = "today",
) -> float:
    """Get total solar production for a day.

    Args:
        solar_forecast: Dict with 'today' and 'tomorrow' hourly data
        day: Either "today" or "tomorrow"

    Returns:
        Total kWh expected for the day
    """
    data = solar_forecast.get(day, {})

    if not data:
        return 0.0

    total = 0.0
    for hour_key, kw in data.items():
        try:
            total += float(kw)  # kW per hour = kWh per hour
        except (ValueError, TypeError):
            continue

    return total


def find_solar_peak_hours(
    solar_forecast: Dict[str, Any],
    day: str = "today",
    threshold_kw: float = 0.5,
) -> List[int]:
    """Find hours with significant solar production.

    Args:
        solar_forecast: Dict with 'today' and 'tomorrow' hourly data
        day: Either "today" or "tomorrow"
        threshold_kw: Minimum kW to consider significant

    Returns:
        List of hours (0-23) with solar > threshold
    """
    data = solar_forecast.get(day, {})
    peak_hours = []

    for hour_key, kw in data.items():
        try:
            if float(kw) >= threshold_kw:
                # Parse hour from ISO timestamp
                ts = datetime.fromisoformat(hour_key)
                peak_hours.append(ts.hour)
        except (ValueError, TypeError):
            continue

    return sorted(peak_hours)


def estimate_solar_surplus(
    solar_kwh: float,
    consumption_kwh: float,
    battery_headroom_kwh: float,
) -> float:
    """Estimate solar surplus that could be exported.

    Args:
        solar_kwh: Expected solar production
        consumption_kwh: Expected consumption
        battery_headroom_kwh: Available battery capacity (max - current)

    Returns:
        Expected surplus kWh (after consumption and battery)
    """
    net = solar_kwh - consumption_kwh

    if net <= 0:
        return 0.0

    # Solar surplus goes to battery first, then export
    surplus_after_battery = max(0.0, net - battery_headroom_kwh)
    return surplus_after_battery
