"""Consumption/load forecast utility functions.

Provides helper functions for working with consumption data
from statistics sensors and adaptive load profiles.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

_LOGGER = logging.getLogger(__name__)

# Default fallback consumption (500W average)
DEFAULT_CONSUMPTION_W: float = 500.0
DEFAULT_CONSUMPTION_KWH_15MIN: float = 0.125  # 500W * 0.25h


def get_load_for_timestamp(
    timestamp: datetime,
    load_sensors: Dict[str, Any],
    interval_minutes: int = 15,
) -> float:
    """Get expected load for a given timestamp (kWh per interval).

    Args:
        timestamp: Timestamp to look up load for
        load_sensors: Dict of load sensor data with time ranges
        interval_minutes: Interval length in minutes

    Returns:
        Expected load in kWh for the interval

    Expected load_sensors format:
        {
            "sensor.load_avg_weekday_6_8": {
                "value": 450.0,  # Watts
                "time_range": (6, 8),  # (start_hour, end_hour)
                "day_type": "weekday"
            },
            ...
        }
    """
    if not load_sensors:
        return DEFAULT_CONSUMPTION_KWH_15MIN

    # Determine day type
    is_weekend = timestamp.weekday() >= 5
    day_type = "weekend" if is_weekend else "weekday"

    current_hour = timestamp.hour

    # Find matching sensor
    for entity_id, sensor_data in load_sensors.items():
        # Check day type
        sensor_day_type = sensor_data.get("day_type", "")
        if sensor_day_type != day_type:
            continue

        # Get time range
        time_range = sensor_data.get("time_range")
        if not time_range or not isinstance(time_range, tuple) or len(time_range) != 2:
            continue

        start_hour, end_hour = time_range

        # Check if current hour is in range (handle midnight crossing)
        if start_hour <= end_hour:
            in_range = start_hour <= current_hour < end_hour
        else:
            # Crossing midnight (e.g., 22-6)
            in_range = current_hour >= start_hour or current_hour < end_hour

        if in_range:
            watts = sensor_data.get("value", 0.0)

            # Fallback if no data yet
            if watts == 0:
                watts = DEFAULT_CONSUMPTION_W

            # Convert W to kWh for interval
            interval_hours = interval_minutes / 60.0
            return (watts / 1000.0) * interval_hours

    return DEFAULT_CONSUMPTION_KWH_15MIN


def get_load_forecast(
    start: datetime,
    end: datetime,
    load_sensors: Dict[str, Any],
    interval_minutes: int = 15,
) -> List[float]:
    """Generate load forecast for time range.

    Args:
        start: Start datetime
        end: End datetime
        load_sensors: Dict of load sensor data
        interval_minutes: Interval length in minutes

    Returns:
        List of kWh values for each interval
    """
    result = []
    current = start

    while current < end:
        kwh = get_load_for_timestamp(current, load_sensors, interval_minutes)
        result.append(kwh)
        current += timedelta(minutes=interval_minutes)

    return result


def get_hourly_consumption(
    consumption_profile: Dict[str, Any],
    hour: int,
    day_type: str = "weekday",
) -> float:
    """Get hourly consumption from profile.

    Args:
        consumption_profile: Dict with hourly consumption data
        hour: Hour of day (0-23)
        day_type: "weekday" or "weekend"

    Returns:
        Consumption in kWh for the hour
    """
    if not consumption_profile:
        return DEFAULT_CONSUMPTION_KWH_15MIN * 4  # 4 intervals per hour

    # Try to get from profile
    key = f"{day_type}_{hour}"
    hourly = consumption_profile.get(key)

    if hourly is not None:
        try:
            return float(hourly)
        except (ValueError, TypeError):
            pass

    # Try alternate format
    day_data = consumption_profile.get(day_type, {})
    if isinstance(day_data, dict):
        hourly = day_data.get(str(hour)) or day_data.get(hour)
        if hourly is not None:
            try:
                return float(hourly)
            except (ValueError, TypeError):
                pass

    return DEFAULT_CONSUMPTION_KWH_15MIN * 4


def estimate_daily_consumption(
    consumption_profile: Dict[str, Any],
    day_type: str = "weekday",
) -> float:
    """Estimate total daily consumption.

    Args:
        consumption_profile: Dict with hourly consumption data
        day_type: "weekday" or "weekend"

    Returns:
        Total daily consumption in kWh
    """
    total = 0.0
    for hour in range(24):
        total += get_hourly_consumption(consumption_profile, hour, day_type)
    return total


def get_peak_hours(
    consumption_profile: Dict[str, Any],
    day_type: str = "weekday",
    top_n: int = 4,
) -> List[Tuple[int, float]]:
    """Find peak consumption hours.

    Args:
        consumption_profile: Dict with hourly consumption data
        day_type: "weekday" or "weekend"
        top_n: Number of peak hours to return

    Returns:
        List of (hour, consumption_kwh) tuples sorted by consumption desc
    """
    hours_consumption = []

    for hour in range(24):
        kwh = get_hourly_consumption(consumption_profile, hour, day_type)
        hours_consumption.append((hour, kwh))

    # Sort by consumption descending
    hours_consumption.sort(key=lambda x: x[1], reverse=True)

    return hours_consumption[:top_n]


def scale_consumption(
    base_kwh: float,
    weather_factor: float = 1.0,
    occupancy_factor: float = 1.0,
) -> float:
    """Scale consumption based on external factors.

    Args:
        base_kwh: Base consumption value
        weather_factor: Weather adjustment (1.0 = normal, >1 = cold/hot)
        occupancy_factor: Occupancy adjustment (0-1 for away, >1 for guests)

    Returns:
        Scaled consumption in kWh
    """
    return base_kwh * weather_factor * occupancy_factor


def interpolate_consumption(
    prev_kwh: float,
    next_kwh: float,
    position: float,
) -> float:
    """Interpolate consumption between two values.

    Args:
        prev_kwh: Previous hour's consumption
        next_kwh: Next hour's consumption
        position: Position between 0 (prev) and 1 (next)

    Returns:
        Interpolated consumption in kWh
    """
    return prev_kwh + (next_kwh - prev_kwh) * position
