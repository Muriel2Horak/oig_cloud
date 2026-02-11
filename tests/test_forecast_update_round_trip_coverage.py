from __future__ import annotations

import pytest

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as forecast_update_module,
)


def test_round_trip_to_directional_invalid_type():
    """Test that invalid efficiency types return 0.0."""
    result = forecast_update_module._round_trip_to_directional("invalid")
    assert result == 0.0


def test_round_trip_to_directional_zero_efficiency():
    """Test that zero or negative efficiency returns 0.0."""
    result = forecast_update_module._round_trip_to_directional(0.0)
    assert result == 0.0


def test_round_trip_to_directional_negative_efficiency():
    """Test that negative efficiency returns 0.0."""
    result = forecast_update_module._round_trip_to_directional(-0.5)
    assert result == 0.0


def test_round_trip_to_directional_efficiency_above_one():
    """Test that efficiency above 1.0 is capped to 1.0."""
    result = forecast_update_module._round_trip_to_directional(1.5)
    assert result == 1.0
