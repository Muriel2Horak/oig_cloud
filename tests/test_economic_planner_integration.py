"""Tests for economic planner integration module."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from custom_components.oig_cloud.battery_forecast.economic_planner_integration import (
    _get_solar_candidates,
    _mode_to_name,
    _pad_or_trim,
    _quarter_hour_from_hourly_kw,
    _safe_parse_iso,
    _sorted_dict_values,
    _state_float,
    _try_load_solar_from_entity,
    apply_economic_plan,
    fetch_solar_forecast,
    run_economic_planning,
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
        import logging
        modes = [0] * 96

        with caplog.at_level(logging.INFO):
            apply_economic_plan(modes)

        assert "Economic plan generated" in caplog.text
        assert "96 intervals" in caplog.text


class TestFetchLoadForecast:
    """Test fetch_load_forecast function."""

    def test_fetch_load_forecast_no_sensors(self) -> None:
        """Test fallback when no load sensors available."""
        hass = MagicMock()
        hass.states.get.return_value = None

        from custom_components.oig_cloud.battery_forecast.economic_planner_integration import fetch_load_forecast
        result = fetch_load_forecast(hass, "12345")

        assert len(result) == 96


class TestFetchPrices:
    """Test fetch_prices function."""

    def test_fetch_prices_no_data(self) -> None:
        """Test fallback when no price data available."""
        hass = MagicMock()
        hass.data = {}
        config_entry = MagicMock()
        config_entry.entry_id = "test_entry"

        from custom_components.oig_cloud.battery_forecast.economic_planner_integration import fetch_prices
        result = fetch_prices(hass, config_entry, "12345")

        assert len(result) == 96


class TestLoadPlannerInputs:
    """Test load_planner_inputs function."""

    def test_load_planner_inputs_basic(self) -> None:
        """Test basic input loading."""
        hass = MagicMock()

        battery_state = MagicMock()
        battery_state.state = "5.0"
        capacity_state = MagicMock()
        capacity_state.state = "10.24"
        hw_min_state = MagicMock()
        hw_min_state.state = "1.0"

        def _mock_get_state(entity_id: str):
            if entity_id == "sensor.oig_12345_battery_level":
                return battery_state
            if entity_id == "sensor.oig_12345_installed_battery_capacity_kwh":
                return capacity_state
            if entity_id == "sensor.oig_12345_batt_bat_min":
                return hw_min_state
            return None

        hass.states.get.side_effect = _mock_get_state

        config_entry = MagicMock()
        config_entry.data = {"box_id": "12345"}
        config_entry.options = {}

        from custom_components.oig_cloud.battery_forecast.economic_planner_integration import load_planner_inputs
        result = load_planner_inputs(hass, config_entry)

        assert result.current_soc_kwh == 5.0
        assert result.max_capacity_kwh == 10.24


class TestEconomicPlannerIntegrationCoverage:
    """Additional coverage for economic planner integration module."""

    def test_state_float_handles_invalid_and_unknown(self) -> None:
        """Return None for unknown and invalid state values."""
        hass = MagicMock()
        state = MagicMock()
        state.state = "unknown"
        hass.states.get.return_value = state
        assert _state_float(hass, "sensor.any") is None

        state.state = "not-a-number"
        assert _state_float(hass, "sensor.any") is None

    def test_safe_parse_iso_invalid(self) -> None:
        """Return None for invalid ISO timestamp."""
        assert _safe_parse_iso("not-iso") is None

    def test_sorted_dict_values_filters_invalid_entries(self) -> None:
        """Skip entries with invalid timestamp or value."""
        data = {
            "invalid": 2,
            "2025-03-01T01:00:00": "invalid",
            "2025-03-01T00:00:00": -3,
        }
        assert _sorted_dict_values(data) == [0.0]

    def test_try_load_solar_from_entity_returns_none_when_empty(self) -> None:
        """Return None when no hourly data can be loaded."""
        hass = MagicMock()
        state = MagicMock()
        state.attributes = {
            "today_hourly_total_kw": {},
            "tomorrow_hourly_total_kw": {},
        }
        hass.states.get.return_value = state

        assert _try_load_solar_from_entity(hass, "sensor.any") is None

    def test_fetch_prices_fallback_default_when_no_sources(self) -> None:
        """Fallback to default flat pricing when no price source exists."""
        hass = MagicMock()
        hass.states.get.return_value = None
        hass.data = {}
        config_entry = MagicMock()
        config_entry.entry_id = "entry"

        from custom_components.oig_cloud.battery_forecast.economic_planner_integration import fetch_prices

        result = fetch_prices(hass, config_entry, "12345")
        assert len(result) == 96
        assert all(v == 5.0 for v in result)

    def test_prices_from_coordinator_exception_branch(self) -> None:
        """Handle coordinator data read exceptions gracefully."""

        class BrokenData:
            def get(self, _key, _default=None):
                raise RuntimeError("boom")

        hass = MagicMock()
        hass.data = BrokenData()
        config_entry = MagicMock()
        config_entry.entry_id = "entry"

        from custom_components.oig_cloud.battery_forecast.economic_planner_integration import _prices_from_coordinator

        assert _prices_from_coordinator(hass, config_entry) == []

    def test_load_planner_inputs_raises_when_required_sensors_missing(self) -> None:
        """Raise ValueError if required sensors are unavailable."""
        hass = MagicMock()
        hass.states.get.return_value = None

        config_entry = MagicMock()
        config_entry.data = {"box_id": "12345"}
        config_entry.options = {}

        from custom_components.oig_cloud.battery_forecast.economic_planner_integration import load_planner_inputs

        with pytest.raises(ValueError):
            load_planner_inputs(hass, config_entry)

    @patch("custom_components.oig_cloud.battery_forecast.economic_planner_integration.plan_battery_schedule")
    def test_run_economic_planning_success(self, mock_plan: MagicMock) -> None:
        """Return successful payload from planner output."""
        decision = MagicMock()
        decision.moment.interval = 0
        decision.strategy = "cheap"
        decision.cost = 1.23

        planner_result = MagicMock()
        planner_result.modes = [0, 2, 3]
        planner_result.total_cost = 12.5
        planner_result.decisions = [decision]
        planner_result.states = [{"state": "ok"}]
        mock_plan.return_value = planner_result

        hass = MagicMock()
        config_entry = MagicMock()

        with patch(
            "custom_components.oig_cloud.battery_forecast.economic_planner_integration.load_planner_inputs",
            return_value=MagicMock(),
        ):
            result = run_economic_planning(hass, config_entry)

        assert result["success"] is True
        assert result["mode_names"] == ["HOME_I", "HOME_III", "HOME_UPS"]
        assert result["total_cost"] == 12.5
        assert result["decisions_count"] == 1

    def test_run_economic_planning_error(self) -> None:
        """Return failure payload when planning raises exception."""
        hass = MagicMock()
        config_entry = MagicMock()

        with patch(
            "custom_components.oig_cloud.battery_forecast.economic_planner_integration.load_planner_inputs",
            side_effect=RuntimeError("planner failed"),
        ):
            result = run_economic_planning(hass, config_entry)

        assert result["success"] is False
        assert "planner failed" in result["error"]

    @patch(
        "custom_components.oig_cloud.battery_forecast.economic_planner_integration.SENSOR_TYPES_STATISTICS",
        {
            "load_avg_missing_fields": {"day_type": "weekday"},
            "load_avg_ok": {"time_range": "0_6", "day_type": "weekday"},
        },
    )
    def test_collect_load_avg_sensors_with_empty_box_id(self) -> None:
        """Use non-box entity naming and skip invalid sensor definitions."""
        hass = MagicMock()

        def _get_state(entity_id: str):
            if entity_id == "sensor.load_avg_ok":
                state = MagicMock()
                state.state = "120"
                return state
            return None

        hass.states.get.side_effect = _get_state

        from custom_components.oig_cloud.battery_forecast.economic_planner_integration import _collect_load_avg_sensors

        result = _collect_load_avg_sensors(hass, "")
        assert "sensor.load_avg_ok" in result
        assert "sensor.load_avg_missing_fields" not in result
