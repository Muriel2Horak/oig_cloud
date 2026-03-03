"""Tests for input quality guards."""

import pytest
from datetime import datetime, timedelta
from custom_components.oig_cloud.battery_forecast.planning.input_quality import (
    InputQualityStatus,
    check_forecast_quality,
    check_price_quality,
    should_use_economic_charging,
    get_quality_summary,
)


class TestForecastQuality:
    """Test PV forecast quality checking."""
    
    def test_empty_forecast_triggers_invalid(self):
        """Empty forecast data should be marked as invalid."""
        result = check_forecast_quality({})
        assert result == InputQualityStatus.INVALID
    
    def test_none_forecast_triggers_invalid(self):
        """None forecast data should be marked as invalid."""
        result = check_forecast_quality(None)
        assert result == InputQualityStatus.INVALID
    
    def test_empty_today_tomorrow_triggers_invalid(self):
        """Forecast with empty today and tomorrow should be invalid."""
        result = check_forecast_quality({"today": {}, "tomorrow": {}})
        assert result == InputQualityStatus.INVALID
    
    def test_stale_pv_forecast_triggers_fallback(self):
        """Stale PV forecast data should trigger fallback to degraded/stale."""
        # Create old data (more than 60 minutes old)
        old_time = datetime.now() - timedelta(minutes=120)
        old_data = {
            "today": {
                old_time.isoformat(): 1.5,
                (old_time - timedelta(hours=1)).isoformat(): 2.0
            },
            "tomorrow": {}
        }
        
        result = check_forecast_quality(old_data, max_age_minutes=60)
        assert result == InputQualityStatus.STALE
    
    def test_fresh_forecast_with_valid_data(self):
        """Fresh forecast with valid data should be marked as fresh."""
        recent_time = datetime.now() - timedelta(minutes=30)
        fresh_data = {
            "today": {
                recent_time.isoformat(): 1.5,
                (recent_time + timedelta(hours=1)).isoformat(): 2.0
            },
            "tomorrow": {
                (recent_time + timedelta(hours=24)).isoformat(): 0.8
            }
        }
        
        result = check_forecast_quality(fresh_data, max_age_minutes=60)
        assert result == InputQualityStatus.FRESH
    
    def test_forecast_with_only_zero_values_degraded(self):
        """Forecast with only zero values should be marked as degraded."""
        recent_time = datetime.now() - timedelta(minutes=30)
        zero_data = {
            "today": {
                recent_time.isoformat(): 0.0,
                (recent_time + timedelta(hours=1)).isoformat(): 0.0
            }
        }
        
        result = check_forecast_quality(zero_data, max_age_minutes=60)
        assert result == InputQualityStatus.DEGRADED
    
    def test_forecast_with_insufficient_data_degraded(self):
        """Forecast with insufficient data points should be marked as degraded."""
        recent_time = datetime.now() - timedelta(minutes=30)
        limited_data = {
            "today": {
                recent_time.isoformat(): 1.5
            }
        }
        
        result = check_forecast_quality(limited_data, max_age_minutes=60)
        assert result == InputQualityStatus.DEGRADED
    
    def test_forecast_with_invalid_timestamp_format(self):
        """Forecast with invalid timestamp format should handle gracefully."""
        recent_time = datetime.now() - timedelta(minutes=30)
        invalid_data = {
            "today": {
                "invalid-timestamp": 1.5,
                recent_time.isoformat(): 2.0
            }
        }
        
        result = check_forecast_quality(invalid_data, max_age_minutes=60)
        assert result in [InputQualityStatus.FRESH, InputQualityStatus.DEGRADED]
    
    def test_forecast_with_negative_values_ignored(self):
        """Negative forecast values should be ignored but not invalidate."""
        recent_time = datetime.now() - timedelta(minutes=30)
        mixed_data = {
            "today": {
                recent_time.isoformat(): -1.0,  # Negative value
                (recent_time + timedelta(hours=1)).isoformat(): 1.5,
                (recent_time + timedelta(hours=2)).isoformat(): 2.0,
                (recent_time + timedelta(hours=3)).isoformat(): 0.8
            }
        }
        
        result = check_forecast_quality(mixed_data, max_age_minutes=60)
        assert result == InputQualityStatus.FRESH


class TestPriceQuality:
    """Test spot price quality checking."""
    
    def test_empty_price_triggers_invalid(self):
        """Empty price data should be marked as invalid."""
        result = check_price_quality({})
        assert result == InputQualityStatus.INVALID
    
    def test_none_price_triggers_invalid(self):
        """None price data should be marked as invalid."""
        result = check_price_quality(None)
        assert result == InputQualityStatus.INVALID
    
    def test_price_without_timestamp_invalid(self):
        """Price data without timestamp should be invalid."""
        result = check_price_quality({"current_price": 2.5})
        assert result == InputQualityStatus.INVALID
    
    def test_stale_price_data_blocks_economic_charge(self):
        """Stale price data should block economic charging."""
        old_time = datetime.now() - timedelta(minutes=45)
        stale_price = {
            "last_update": old_time.isoformat(),
            "current_price": 2.5
        }
        
        result = check_price_quality(stale_price, max_age_minutes=30)
        assert result == InputQualityStatus.STALE
    
    def test_fresh_price_with_valid_data(self):
        """Fresh price data should be marked as fresh."""
        recent_time = datetime.now() - timedelta(minutes=15)
        fresh_price = {
            "last_update": recent_time.isoformat(),
            "current_price": 2.5,
            "future_prices": [2.3, 2.4, 2.6, 2.1]
        }
        
        result = check_price_quality(fresh_price, max_age_minutes=30)
        assert result == InputQualityStatus.FRESH
    
    def test_price_with_unreasonable_values_invalid(self):
        """Price with unreasonable values should be marked as invalid."""
        recent_time = datetime.now() - timedelta(minutes=15)
        unreasonable_price = {
            "last_update": recent_time.isoformat(),
            "current_price": 1000.0  # Unreasonably high
        }
        
        result = check_price_quality(unreasonable_price, max_age_minutes=30)
        assert result == InputQualityStatus.INVALID
    
    def test_price_with_negative_current_price_valid(self):
        """Negative current price should be valid (can happen in spot markets)."""
        recent_time = datetime.now() - timedelta(minutes=15)
        negative_price = {
            "last_update": recent_time.isoformat(),
            "current_price": -2.5
        }
        
        result = check_price_quality(negative_price, max_age_minutes=30)
        assert result == InputQualityStatus.FRESH
    
    def test_price_with_mostly_invalid_future_prices_degraded(self):
        """Price with mostly invalid future prices should be degraded."""
        recent_time = datetime.now() - timedelta(minutes=15)
        degraded_price = {
            "last_update": recent_time.isoformat(),
            "current_price": 2.5,
            "future_prices": [2.3, "invalid", None, 2.1, "invalid", "invalid"]
        }
        
        result = check_price_quality(degraded_price, max_age_minutes=30)
        assert result == InputQualityStatus.DEGRADED


class TestEconomicChargingDecision:
    """Test economic charging decision logic."""
    
    def test_both_fresh_enables_charging(self):
        """Both fresh inputs should enable economic charging."""
        result = should_use_economic_charging(
            InputQualityStatus.FRESH, 
            InputQualityStatus.FRESH
        )
        assert result is True
    
    def test_fresh_degraded_enables_charging(self):
        """Fresh + degraded inputs should still enable economic charging."""
        result = should_use_economic_charging(
            InputQualityStatus.FRESH, 
            InputQualityStatus.DEGRADED
        )
        assert result is True
        
        result = should_use_economic_charging(
            InputQualityStatus.DEGRADED, 
            InputQualityStatus.FRESH
        )
        assert result is True
    
    def test_stale_price_data_blocks_economic_charge(self):
        """Stale price data should block economic charging."""
        result = should_use_economic_charging(
            InputQualityStatus.FRESH, 
            InputQualityStatus.STALE
        )
        assert result is False
        
        result = should_use_economic_charging(
            InputQualityStatus.STALE, 
            InputQualityStatus.FRESH
        )
        assert result is False
    
    def test_invalid_forecast_blocks_economic_charge(self):
        """Invalid forecast should block economic charging."""
        result = should_use_economic_charging(
            InputQualityStatus.INVALID, 
            InputQualityStatus.FRESH
        )
        assert result is False
        
        result = should_use_economic_charging(
            InputQualityStatus.FRESH, 
            InputQualityStatus.INVALID
        )
        assert result is False
    
    def test_both_stale_blocks_economic_charge(self):
        """Both stale inputs should block economic charging."""
        result = should_use_economic_charging(
            InputQualityStatus.STALE, 
            InputQualityStatus.STALE
        )
        assert result is False
    
    def test_string_enum_values(self):
        """Should handle string enum values."""
        result = should_use_economic_charging("fresh", "fresh")
        assert result is True
        
        result = should_use_economic_charging("stale", "fresh")
        assert result is False
    
    def test_invalid_string_values(self):
        """Invalid string values should block economic charging."""
        result = should_use_economic_charging("invalid_value", "fresh")
        assert result is False


class TestQualitySummary:
    """Test quality summary generation."""
    
    def test_summary_includes_all_fields(self):
        """Quality summary should include all expected fields."""
        summary = get_quality_summary(
            InputQualityStatus.FRESH, 
            InputQualityStatus.FRESH
        )
        
        expected_fields = [
            "forecast_quality",
            "price_quality", 
            "economic_charging_enabled",
            "can_plan",
            "needs_attention"
        ]
        
        for field in expected_fields:
            assert field in summary
        
        assert summary["forecast_quality"] == "fresh"
        assert summary["price_quality"] == "fresh"
        assert summary["economic_charging_enabled"] is True
        assert summary["can_plan"] is True
        assert summary["needs_attention"] is False
    
    def test_summary_with_stale_data(self):
        """Summary with stale data should reflect that."""
        summary = get_quality_summary(
            InputQualityStatus.STALE, 
            InputQualityStatus.FRESH
        )
        
        assert summary["economic_charging_enabled"] is False
        assert summary["needs_attention"] is True
    
    def test_summary_with_invalid_data(self):
        """Summary with invalid data should reflect that."""
        summary = get_quality_summary(
            InputQualityStatus.INVALID, 
            InputQualityStatus.DEGRADED
        )
        
        assert summary["economic_charging_enabled"] is False
        assert summary["can_plan"] is False
        assert summary["needs_attention"] is True