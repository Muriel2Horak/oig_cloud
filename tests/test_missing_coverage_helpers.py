from __future__ import annotations

import builtins
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.api.ha_rest_api import _load_detail_tabs_from_entity_store
from custom_components.oig_cloud.api.ote_api import OteApi
from custom_components.oig_cloud.battery_forecast.balancing.core import BalancingManager
from custom_components.oig_cloud.battery_forecast.balancing.executor import (
    _parse_datetime,
    _safe_timestamp,
)
from custom_components.oig_cloud.battery_forecast.presentation.detail_tabs_summary import (
    _attach_completed_planned_summary,
    _calculate_overall_adherence,
)
from custom_components.oig_cloud.battery_forecast.sensors.grid_charging_sensor import (
    _find_battery_forecast_sensor,
)
from custom_components.oig_cloud.boiler.const import BATTERY_SOC_OVERFLOW_THRESHOLD
from custom_components.oig_cloud.boiler.planner import BoilerPlanner, _parse_window_datetime
from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud.core.coordinator import _box_id_from_entry
from custom_components.oig_cloud.core.local_mapper import (
    _ExtendedUpdate,
    _NodeUpdate,
    _apply_extended_update,
    _apply_node_update,
)
from custom_components.oig_cloud.core.oig_cloud_notification import (
    _close_brace,
    _compact_matches,
)
from custom_components.oig_cloud.entities.adaptive_load_profiles_sensor import (
    OigCloudAdaptiveLoadProfilesSensor,
    _average_profiles,
    _profile_special_name,
)
from custom_components.oig_cloud.entities.battery_health_sensor import BatteryHealthTracker
from custom_components.oig_cloud.entities.shield_sensor import (
    _compute_mode_reaction_time,
    _format_entity_display,
)
from custom_components.oig_cloud.entities.statistics_sensor import (
    MAX_HOURLY_DATA_POINTS,
    OigCloudStatisticsSensor,
    _append_hourly_record,
    _build_hourly_attrs,
    _calculate_interval_median,
    _calculate_sampling_median,
    _naive_dt,
)
from custom_components.oig_cloud.sensor import (
    _connect_balancing_manager,
    _create_adaptive_profiles_sensors,
    _create_battery_balancing_sensors,
    _create_battery_efficiency_sensors,
    _create_grid_charging_plan_sensors,
    _create_planner_status_sensors,
    _extract_device_box_id,
    _is_sensor_device_info_valid,
)
from custom_components.oig_cloud.shield.core import ModeTransitionTracker


class DummyPrecomputedStore:
    async def async_load(self):
        return None


class DummyCoordinator:
    def __init__(self):
        self.data = {}
        self.hass = None

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


def _make_adaptive_sensor():
    coordinator = DummyCoordinator()
    entry = SimpleNamespace()
    device_info = {"identifiers": {("oig_cloud", "123")}}
    return OigCloudAdaptiveLoadProfilesSensor(
        coordinator,
        "adaptive_load_profiles",
        entry,
        device_info,
    )


def _make_statistics_sensor():
    coordinator = DummyCoordinator()
    sensor_type = "hourly_energy"
    device_info = {"identifiers": {("oig_cloud", "123")}}
    sensor = OigCloudStatisticsSensor(coordinator, sensor_type, device_info)
    sensor._sensor_type = "hourly_energy"
    return sensor


@pytest.mark.asyncio
async def test_load_detail_tabs_empty_store():
    entity = SimpleNamespace(_precomputed_store=DummyPrecomputedStore())
    result = await _load_detail_tabs_from_entity_store(entity, "123", None, "plan")
    assert result is None


def test_ote_build_daily_stats_empty():
    assert OteApi._build_daily_stats([]) is None


def test_balancing_normalize_stat_time_naive():
    naive = datetime(2025, 1, 1, 12, 0)
    stat = {"start": naive}
    normalized = BalancingManager._normalize_stat_time(stat)
    assert normalized.tzinfo is dt_util.UTC


def test_balancing_finalize_holding_window_empty():
    result = BalancingManager._finalize_holding_window(None, None, 2, None, None)
    assert result == (None, None, None, None)


def test_balancing_estimate_grid_consumption_no_forecast(hass):
    manager = BalancingManager(hass, "123", "/tmp/balancing", SimpleNamespace(options={}))
    manager._forecast_sensor = None
    now = dt_util.now()
    assert manager._estimate_grid_consumption(now, now + timedelta(hours=1)) == 0.0


def test_balancing_estimate_grid_consumption_empty_timeline(hass):
    manager = BalancingManager(hass, "123", "/tmp/balancing", SimpleNamespace(options={}))
    manager._forecast_sensor = SimpleNamespace(_timeline_data=[])
    now = dt_util.now()
    assert manager._estimate_grid_consumption(now, now + timedelta(hours=1)) == 0.0


def test_executor_parse_datetime_non_datetime():
    assert _parse_datetime(123) is None


def test_executor_safe_timestamp_empty():
    assert _safe_timestamp("") is None


def test_detail_tabs_overall_adherence_zero():
    assert _calculate_overall_adherence(0, 0) == 100


def test_detail_tabs_attach_summary_empty():
    summary: dict[str, object] = {"total_cost": 0}
    _attach_completed_planned_summary(summary, [], [])
    assert "completed_summary" not in summary


def test_find_battery_forecast_sensor_no_match():
    entity = SimpleNamespace(entity_id="sensor.other", _precomputed_store=True)
    hass = SimpleNamespace(
        data={"entity_components": {"sensor": SimpleNamespace(entities=[entity])}}
    )
    assert _find_battery_forecast_sensor(hass, "123") is None


def test_parse_overflow_window_missing_end():
    window = {"soc": BATTERY_SOC_OVERFLOW_THRESHOLD, "start": "2025-01-01T00:00:00"}
    assert BoilerPlanner._parse_overflow_window(window) is None


def test_parse_window_datetime_datetime():
    dt_val = datetime(2025, 1, 1, 0, 0)
    assert _parse_window_datetime(dt_val) == dt_val


def test_parse_window_datetime_invalid():
    assert _parse_window_datetime(123) is None


def test_box_id_from_entry_none():
    assert _box_id_from_entry(None) is None


def test_apply_node_update_no_change():
    box = {"telemetry": {"value": 10}}
    update = _NodeUpdate(node_id="telemetry", node_key="value")
    assert _apply_node_update(box, update, 10, 10) is False


def test_apply_extended_update_no_change():
    payload = {"extended_fve": {"items": [{"values": [1, 2, 3, 4, 5]}]}}
    update = _ExtendedUpdate(group="extended_fve", index=0)
    ts = datetime(2025, 1, 1, 0, 0)
    assert _apply_extended_update(payload, update, 1, ts) is False


def test_compact_matches_and_close_brace():
    matches = _compact_matches("bypasson ... bypassoff")
    assert matches == [(0, True), (13, False)]
    assert _close_brace(0, None, 1, "{}", []) == (0, None)


def test_tagged_profile_name_unknown():
    assert _profile_special_name("weekday", "unknown") is None


def test_prediction_attributes_empty():
    sensor = _make_adaptive_sensor()
    sensor._current_prediction = None
    assert sensor._build_prediction_attributes() == {}


def test_profile_attributes_no_predicted():
    sensor = _make_adaptive_sensor()
    prediction = {"predicted_consumption": [], "predict_hours": 0}
    assert sensor._build_profile_attributes(prediction) == {}


def test_pad_profile_hours_no_padding():
    sensor = _make_adaptive_sensor()
    hours = [1.0] * 3
    assert sensor._pad_profile_hours(hours, 2, 0.5) == hours


def test_build_profile_name_suffix_single():
    sensor = _make_adaptive_sensor()
    assert sensor._build_profile_name_suffix(1, 0.75) == " (shoda 0.75)"


def test_resolve_name_sources_today_from_matched():
    sensor = _make_adaptive_sensor()
    matched_profile_full = [0.5] * 48
    today_hours = [0.6] * 24
    tomorrow_hours = [0.4] * 24
    today_name_source, _ = sensor._resolve_name_sources(
        matched_profile_full,
        today_hours,
        tomorrow_hours,
        0,
    )
    assert today_name_source == today_hours


def test_average_profiles_empty():
    assert _average_profiles([]) == []


def test_average_profiles_zero_length():
    assert _average_profiles([{"consumption_kwh": []}]) == []


def test_battery_health_maybe_add_interval_missing_start():
    intervals: list[tuple] = []
    BatteryHealthTracker._maybe_add_interval(
        intervals, None, datetime(2025, 1, 1), None, 100
    )
    assert intervals == []


def test_shield_compute_mode_reaction_time_none_tracker():
    shield = SimpleNamespace(mode_tracker=None)
    assert _compute_mode_reaction_time(shield) is None


def test_shield_compute_mode_reaction_time_no_medians():
    tracker = SimpleNamespace(get_statistics=lambda: {"x": {"avg": 10}})
    shield = SimpleNamespace(mode_tracker=tracker)
    assert _compute_mode_reaction_time(shield) is None


def test_format_entity_display_plain():
    assert _format_entity_display("plain") == "plain"


@pytest.mark.asyncio
async def test_statistics_check_hourly_end_no_value(monkeypatch):
    sensor = _make_statistics_sensor()
    now = dt_util.now().replace(minute=0, second=0, microsecond=0)
    async def _no_value():
        return None

    monkeypatch.setattr(sensor, "_calculate_hourly_energy", _no_value)
    await sensor._check_hourly_end(now)
    assert sensor._current_hourly_value is None


def test_statistics_naive_dt_none():
    assert _naive_dt(None) is None


def test_statistics_append_hourly_record_trim():
    hourly_data = [
        {"datetime": f"2025-01-01T00:00:00+00:00", "value": 1.0}
        for _ in range(MAX_HOURLY_DATA_POINTS)
    ]
    _append_hourly_record(hourly_data, datetime(2025, 1, 2), 2.0)
    assert len(hourly_data) == MAX_HOURLY_DATA_POINTS


def test_statistics_sampling_median_all_none():
    now = datetime.now()
    sampling_data = [(now - timedelta(minutes=10), None)]
    assert _calculate_sampling_median("sensor.test", sampling_data, 5) is None


def test_statistics_interval_median_empty():
    assert _calculate_interval_median("sensor.test", {"2025-01-01": []}) is None


def test_statistics_build_hourly_attrs_empty():
    attrs = _build_hourly_attrs("sensor.test", [], {"source_sensor": "x"})
    assert attrs["hourly_data_points"] == 0


def test_extract_device_box_id_no_match():
    device = SimpleNamespace(identifiers=[("other", "123")])
    assert _extract_device_box_id(device) is None


def test_is_sensor_device_info_valid_no_info():
    sensor = SimpleNamespace(device_info=None)
    assert _is_sensor_device_info_valid(sensor, "label", "type") is True


def test_connect_balancing_manager_missing_domain():
    hass = SimpleNamespace(data={})
    entry = SimpleNamespace(entry_id="entry")
    _connect_balancing_manager(hass, entry, SimpleNamespace(), [])


def test_connect_balancing_manager_no_sensors():
    hass = SimpleNamespace(data={DOMAIN: {"entry": {}}})
    entry = SimpleNamespace(entry_id="entry")
    _connect_balancing_manager(hass, entry, SimpleNamespace(), [])


def test_import_errors_return_empty(monkeypatch):
    def _fake_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name.endswith(
            (
                "battery_balancing_sensor",
                "grid_charging_sensor",
                "efficiency_sensor",
                "recommended_sensor",
                "adaptive_load_profiles_sensor",
            )
        ):
            raise ImportError("boom")
        return real_import(name, globals, locals, fromlist, level)

    real_import = builtins.__import__
    monkeypatch.setattr(builtins, "__import__", _fake_import)

    coordinator = SimpleNamespace()
    entry = SimpleNamespace()
    device_info = {}
    hass = SimpleNamespace()

    assert _create_battery_balancing_sensors(coordinator, entry, device_info, hass) == []
    assert _create_grid_charging_plan_sensors(coordinator, device_info) == []
    assert _create_battery_efficiency_sensors(coordinator, entry, device_info, hass) == []
    assert _create_planner_status_sensors(coordinator, entry, device_info, hass) == []
    assert _create_adaptive_profiles_sensors(coordinator, entry, device_info, hass) == []


def test_mode_tracker_invalid_transition(hass):
    tracker = ModeTransitionTracker(hass, "123")
    earlier = dt_util.now()
    state_list = [
        SimpleNamespace(state="mode1", last_changed=earlier),
        SimpleNamespace(state="mode1", last_changed=earlier + timedelta(seconds=1)),
    ]
    assert tracker._track_transitions(state_list) == 0
