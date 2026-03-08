"""Tests for economic planner integration module."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from custom_components.oig_cloud.battery_forecast.economic_planner_integration import (
    _get_solar_candidates,
    _mode_to_name,
    _pad_or_trim,
    _quarter_hour_from_hourly_kw,
    apply_economic_plan,
    fetch_solar_forecast,
)


class TestSolarForecastHelpers:
    """Test solar forecast helper functions."""

    def test_get_solar_candidates_with_box_id(self) -> None:
        """Test solar candidates with box_id."""
        candidates = _get_solar_candidates("12345")
        assert "sensor.oig_12345_solar_forecast" in candidates
        assert "sensor.oig_12345_solar_forecast_string1" in candidates
        assert "sensor.solcast_forecast" in candidates

    def test_get_solar_candidates_without_box_id(self) -> None:
        """Test solar candidates without box_id."""
        candidates = _get_solar_candidates("")
        assert "sensor.solcast_forecast" in candidates
        assert len(candidates) == 1

    def test_quarter_hour_from_hourly_kw(self) -> None:
        """Test conversion from hourly to quarter-hourly."""
        from datetime import datetime
        hourly = {
            datetime(2025, 3, 1, 0, 0).isoformat(): 1.0,
            datetime(2025, 3, 1, 1, 0).isoformat(): 2.0,
            datetime(2025, 3, 1, 2, 0).isoformat(): 3.0,
        }
        result = _quarter_hour_from_hourly_kw(hourly)
        assert len(result) == 12  # 3 hours * 4 quarters
        assert result[0] == 0.25  # 1.0 / 4
        assert result[4] == 0.5  # 2.0 / 4
        assert result[8] == 0.75  # 3.0 / 4

    def test_quarter_hour_from_hourly_kw_empty(self) -> None:
        """Test conversion with empty dict."""
        result = _quarter_hour_from_hourly_kw({})
        assert result == []

    def test_pad_or_trim_pad(self) -> None:
        """Test padding when list is too short."""
        result = _pad_or_trim([1.0, 2.0], length=5, fill=0.0)
        assert len(result) == 5
        assert result[0] == 1.0
        assert result[1] == 2.0
        assert result[2] == 2.0
        assert result[3] == 2.0
        assert result[4] == 2.0

    def test_pad_or_trim_trim(self) -> None:
        """Test trimming when list is too long."""
        result = _pad_or_trim([1.0, 2.0, 3.0, 4.0, 5.0], length=3, fill=0.0)
        assert len(result) == 3
        assert result == [1.0, 2.0, 3.0]

    def test_pad_or_trim_exact(self) -> None:
        """Test when list is exact length."""
        result = _pad_or_trim([1.0, 2.0, 3.0], length=3, fill=0.0)
        assert len(result) == 3
        assert result == [1.0, 2.0, 3.0]


class TestModeToName:
    """Test mode to name conversion."""

    def test_mode_to_name_home_i(self) -> None:
        """Test HOME_I mode conversion."""
        result = _mode_to_name(0)
        assert result == "HOME_I"

    def test_mode_to_name_home_iii(self) -> None:
        """Test HOME_III mode conversion."""
        result = _mode_to_name(2)
        assert result == "HOME_III"

    def test_mode_to_name_home_ups(self) -> None:
        """Test HOME_UPS mode conversion."""
        result = _mode_to_name(3)
        assert result == "HOME_UPS"

    def test_mode_to_name_unknown(self) -> None:
        """Test unknown mode conversion."""
        result = _mode_to_name(99)
        assert result == "UNKNOWN(99)"


class TestFetchSolarForecast:
    """Test fetch_solar_forecast function."""

    def test_fetch_solar_forecast_no_sensors(self) -> None:
        """Test fallback when no sensors available."""
        hass = MagicMock()
        hass.states.get.return_value = None

        result = fetch_solar_forecast(hass, "12345")

        assert len(result) == 96
        assert all(v == 0.0 for v in result)

    def test_fetch_solar_forecast_with_valid_sensor(self) -> None:
        """Test loading from valid sensor."""
        from datetime import datetime
        hass = MagicMock()
        mock_state = MagicMock()
        mock_state.attributes = {
            "today_hourly_total_kw": {
                datetime(2025, 3, 1, 0, 0).isoformat(): 4.0,
                datetime(2025, 3, 1, 1, 0).isoformat(): 8.0,
            },
        }
        hass.states.get.return_value = mock_state

        result = fetch_solar_forecast(hass, "12345")

        assert len(result) == 96
        assert result[0] == 1.0  # 4.0 / 4


class TestApplyEconomicPlan:
    """Test apply_economic_plan function."""

    def test_apply_economic_plan_logs_info(self, caplog: pytest.LogCaptureFixture) -> None:
        """Test that function logs plan info."""
        modes = [0] * 96

        apply_economic_plan(modes)

        assert "Economic plan generated" in caplog.text
        assert "96 intervals" in caplog.text
