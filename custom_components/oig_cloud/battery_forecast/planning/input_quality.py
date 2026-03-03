"""Input quality guards for PV forecast and spot pricing data.

This module provides stale/invalid input detection functions that ensure
the system degrades safely rather than silently using bad data.

PURE FUNCTIONS: No HA/coordinator imports, only basic Python types.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, Optional, Union


class InputQualityStatus(Enum):
    """Input data quality status.
    
    FRESH: Data is current and valid
    STALE: Data is too old
    INVALID: Data is malformed or missing required fields
    DEGRADED: Data is present but has quality issues (partial data, etc.)
    """
    FRESH = "fresh"
    STALE = "stale"
    INVALID = "invalid"
    DEGRADED = "degraded"


def check_forecast_quality(
    forecast_data: Dict[str, Any], 
    max_age_minutes: int = 60
) -> InputQualityStatus:
    """Check quality of PV forecast data.
    
    Args:
        forecast_data: Solar forecast dict from get_solar_forecast()
        max_age_minutes: Maximum allowed age in minutes (default: 60)
        
    Returns:
        InputQualityStatus indicating data quality
        
    Examples:
        >>> check_forecast_quality({}, 60)
        <InputQualityStatus.INVALID: 'invalid'>
        
        >>> check_forecast_quality({"today": {}, "tomorrow": {}}, 60)
        <InputQualityStatus.DEGRADED: 'degraded'>
        
        >>> # With actual data (would be FRESH if recent enough)
        >>> data = {"today": {"2024-01-01T12:00:00": 1.5}, "tomorrow": {}}
        >>> check_forecast_quality(data, 60)
        <InputQualityStatus.FRESH: 'fresh'>
    """
    if not forecast_data:
        return InputQualityStatus.INVALID
    
    # Check basic structure
    if not isinstance(forecast_data, dict):
        return InputQualityStatus.INVALID
    
    # Check required keys
    if "today" not in forecast_data and "tomorrow" not in forecast_data:
        return InputQualityStatus.INVALID
    
    # Check if both today and tomorrow are empty
    today_data = forecast_data.get("today", {})
    tomorrow_data = forecast_data.get("tomorrow", {})
    
    if not today_data and not tomorrow_data:
        return InputQualityStatus.INVALID
    
    # Check data structure within today/tomorrow
    for day_name, day_data in [("today", today_data), ("tomorrow", tomorrow_data)]:
        if day_data:
            if not isinstance(day_data, dict):
                return InputQualityStatus.INVALID
            
            # Check if we have any non-zero forecast values
            has_any_data = False
            has_recent_data = False
            
            for time_key, kw_value in day_data.items():
                # Validate time key format and kw value
                try:
                    # Parse timestamp to check age
                    if isinstance(time_key, str):
                        try:
                            time_dt = datetime.fromisoformat(time_key)
                            now = datetime.now(time_dt.tzinfo) if time_dt.tzinfo else datetime.now()
                            
                            # Check if data is recent enough
                            age = now - time_dt
                            if age <= timedelta(minutes=max_age_minutes):
                                has_recent_data = True
                        except ValueError:
                            # Invalid timestamp format
                            continue
                    
                    # Validate kW value
                    if isinstance(kw_value, (int, float)) and kw_value >= 0:
                        if kw_value > 0:  # Non-zero forecast value
                            has_any_data = True
                except (TypeError, ValueError):
                    # Invalid data, continue checking other entries
                    continue
            
            # If we have data but none recent, it's stale
            if day_data and not has_recent_data and has_any_data:
                return InputQualityStatus.STALE
    
    # If we have some data but very limited (e.g., only tomorrow), it's degraded
    total_data_points = len(today_data) + len(tomorrow_data)
    if total_data_points > 0 and total_data_points < 3:  # Less than 3 hours of data but some data exists
        return InputQualityStatus.DEGRADED
    
    # Check if we have meaningful forecast data (non-zero values)
    has_meaningful_data = False
    for day_data in [today_data, tomorrow_data]:
        for kw_value in day_data.values():
            if isinstance(kw_value, (int, float)) and kw_value > 0.1:  # Above 100W
                has_meaningful_data = True
                break
        if has_meaningful_data:
            break
    
    # Only mark as degraded if we have data points but no meaningful values
    if total_data_points > 0 and not has_meaningful_data:
        return InputQualityStatus.DEGRADED
    
    return InputQualityStatus.FRESH


def check_price_quality(
    price_data: Dict[str, Any], 
    max_age_minutes: int = 30
) -> InputQualityStatus:
    """Check quality of spot pricing data.
    
    Args:
        price_data: Price data dict from sensor attributes
        max_age_minutes: Maximum allowed age in minutes (default: 30)
        
    Returns:
        InputQualityStatus indicating data quality
        
    Examples:
        >>> check_price_quality({}, 30)
        <InputQualityStatus.INVALID: 'invalid'>
        
        >>> # With valid recent data
        >>> data = {"last_update": "2024-01-01T12:00:00", "current_price": 2.5}
        >>> check_price_quality(data, 30)
        <InputQualityStatus.FRESH: 'fresh'>
    """
    if not price_data:
        return InputQualityStatus.INVALID
    
    if not isinstance(price_data, dict):
        return InputQualityStatus.INVALID
    
    # Check for required fields
    last_update = price_data.get("last_update")
    current_price = price_data.get("current_price")
    
    # If no last_update timestamp, can't determine age
    if not last_update:
        return InputQualityStatus.INVALID
    
    # Parse timestamp and check age
    try:
        if isinstance(last_update, str):
            update_time = datetime.fromisoformat(last_update.replace("Z", "+00:00"))
        else:
            # Assume it's already a datetime
            update_time = last_update
            
        now = datetime.now(update_time.tzinfo) if update_time.tzinfo else datetime.now()
        age = now - update_time
        
        if age > timedelta(minutes=max_age_minutes):
            return InputQualityStatus.STALE
            
    except (ValueError, TypeError):
        # Invalid timestamp format
        return InputQualityStatus.INVALID
    
    # Check current price validity
    if current_price is None:
        return InputQualityStatus.INVALID
    
    try:
        price_float = float(current_price)
        # Check for reasonable price range (CZK/kWh)
        if not (-10.0 <= price_float <= 50.0):  # Outside reasonable bounds
            return InputQualityStatus.INVALID
    except (TypeError, ValueError):
        return InputQualityStatus.INVALID
    
    # Check for future prices if available (for economic planning)
    future_prices = price_data.get("future_prices", [])
    if future_prices:
        if not isinstance(future_prices, list):
            return InputQualityStatus.DEGRADED
        
        # Validate future prices
        valid_prices = 0
        for price in future_prices:
            try:
                price_float = float(price)
                if -10.0 <= price_float <= 50.0:
                    valid_prices += 1
            except (TypeError, ValueError):
                continue
        
        # If we have future prices but most are invalid, it's degraded
        if valid_prices < len(future_prices) * 0.5:  # Less than 50% valid
            return InputQualityStatus.DEGRADED
    
    return InputQualityStatus.FRESH


def should_use_economic_charging(
    forecast_quality: Union[InputQualityStatus, str], 
    price_quality: Union[InputQualityStatus, str]
) -> bool:
    """Determine if economic charging should be enabled.
    
    Returns False if either forecast or price data is STALE or INVALID.
    This ensures safe degradation rather than silent use of bad data.
    
    Args:
        forecast_quality: Quality status of PV forecast data
        price_quality: Quality status of price data
        
    Returns:
        True if both inputs are good enough for economic charging
        
    Examples:
        >>> should_use_economic_charging(InputQualityStatus.FRESH, InputQualityStatus.FRESH)
        True
        
        >>> should_use_economic_charging(InputQualityStatus.STALE, InputQualityStatus.FRESH)
        False
        
        >>> should_use_economic_charging(InputQualityStatus.FRESH, InputQualityStatus.INVALID)
        False
    """
    # Convert string enum values to enum if needed
    if isinstance(forecast_quality, str):
        try:
            forecast_quality = InputQualityStatus(forecast_quality)
        except ValueError:
            return False
    
    if isinstance(price_quality, str):
        try:
            price_quality = InputQualityStatus(price_quality)
        except ValueError:
            return False
    
    # Block economic charging if either input is STALE or INVALID
    # DEGRADED is still acceptable (reduced functionality but safe)
    blocked_statuses = [InputQualityStatus.STALE, InputQualityStatus.INVALID]
    
    if forecast_quality in blocked_statuses or price_quality in blocked_statuses:
        return False
    
    return True


def get_quality_summary(
    forecast_quality: InputQualityStatus, 
    price_quality: InputQualityStatus
) -> Dict[str, Any]:
    """Get a summary of input quality status.
    
    Useful for logging and debugging.
    
    Args:
        forecast_quality: Quality status of PV forecast
        price_quality: Quality status of price data
        
    Returns:
        Dict with quality status and economic charging decision
    """
    return {
        "forecast_quality": forecast_quality.value,
        "price_quality": price_quality.value,
        "economic_charging_enabled": should_use_economic_charging(forecast_quality, price_quality),
        "can_plan": (
            forecast_quality != InputQualityStatus.INVALID and 
            price_quality != InputQualityStatus.INVALID
        ),
        "needs_attention": (
            forecast_quality in [InputQualityStatus.STALE, InputQualityStatus.INVALID] or
            price_quality in [InputQualityStatus.STALE, InputQualityStatus.INVALID]
        )
    }