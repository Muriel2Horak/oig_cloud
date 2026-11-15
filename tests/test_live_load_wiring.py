"""Live load wired into the battery forecast cycle."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as forecast_update_module,
)
from custom_components.oig_cloud.battery_forecast.planning.live_load import (
    LiveLoadTracker,
    LoadJumpDetector,
    handle_live_load_reading,
)


def _sensor(**kw):
    values = dict(
        _forecast_in_progress=False,
        _last_forecast_bucket=None,
        _profiles_dirty=False,
        _timeline_data=[],
        _plan_lock_until=None,
        _plan_lock_modes={},
        retries=[],
    )
    values.update(kw)
    sensor = SimpleNamespace(**values)
    sensor._schedule_forecast_retry = lambda delay: sensor.retries.append(delay)
    return sensor


def test_live_load_overrides_the_profile_in_the_current_slot():
    now = dt_util.now()
    tracker = LiveLoadTracker()
    tracker.add(now - timedelta(minutes=6), 6500.0)
    sensor = _sensor(_live_load_tracker=tracker)
    forecast = [0.35, 0.35, 0.35, 0.35, 0.35]

    forecast_update_module._apply_live_load(sensor, forecast, now=now)

    assert forecast[0] == pytest.approx(6.5 * 0.25)
    assert forecast[4] == pytest.approx(0.35)


def test_without_live_readings_the_forecast_stays():
    forecast = [0.35, 0.35]
    forecast_update_module._apply_live_load(_sensor(), forecast, now=dt_util.now())
    assert forecast == [0.35, 0.35]


def test_a_requested_replan_runs_inside_the_same_bucket():
    bucket = datetime(2026, 11, 15, 6, 0, tzinfo=timezone.utc)
    sensor = _sensor(_last_forecast_bucket=bucket)
    assert forecast_update_module._should_skip_bucket(sensor, bucket) is True

    sensor._live_load_replan = True
    assert forecast_update_module._should_skip_bucket(sensor, bucket) is False


def test_starting_a_load_replan_releases_the_plan_lock():
    sensor = _sensor(
        _live_load_replan=True,
        _plan_lock_until=dt_util.now() + timedelta(minutes=4),
        _plan_lock_modes={"2026-11-15T06:00:00": 3},
    )
    forecast_update_module._consume_live_load_replan(sensor)

    assert sensor._live_load_replan is False
    assert sensor._plan_lock_until is None
    assert sensor._plan_lock_modes == {}


def test_a_regular_run_keeps_the_plan_lock():
    until = dt_util.now() + timedelta(minutes=4)
    sensor = _sensor(_plan_lock_until=until, _plan_lock_modes={"x": 3})
    forecast_update_module._consume_live_load_replan(sensor)
    assert sensor._plan_lock_until == until


def _timeline_for(now: datetime, load_kwh: float):
    local = dt_util.as_local(now)
    start = local.replace(minute=(local.minute // 15) * 15, second=0, microsecond=0)
    return [{"time": start.replace(tzinfo=None).isoformat(), "load_kwh": load_kwh}]


def test_a_sustained_jump_asks_for_a_replan_once():
    now = dt_util.now()
    sensor = _sensor(_timeline_data=_timeline_for(now, 0.35))

    handle_live_load_reading(sensor, now - timedelta(minutes=6), 6500.0)
    handle_live_load_reading(sensor, now, 6500.0)
    handle_live_load_reading(sensor, now + timedelta(seconds=30), 6400.0)

    assert sensor._live_load_replan is True
    assert sensor.retries == [1.0]
    assert isinstance(sensor._live_load_detector, LoadJumpDetector)


def test_load_matching_the_plan_asks_for_nothing():
    now = dt_util.now()
    sensor = _sensor(_timeline_data=_timeline_for(now, 0.35))
    handle_live_load_reading(sensor, now - timedelta(minutes=6), 1500.0)
    handle_live_load_reading(sensor, now, 1400.0)

    assert getattr(sensor, "_live_load_replan", False) is False
    assert sensor.retries == []


def test_lifecycle_feeds_backup_load_state_changes_to_the_tracker(monkeypatch):
    from custom_components.oig_cloud.battery_forecast.sensors import sensor_lifecycle

    captured = {}

    def fake_track(hass, entity_ids, action):
        captured["entity_ids"] = entity_ids
        captured["action"] = action
        return lambda: None

    monkeypatch.setattr(sensor_lifecycle, "async_track_state_change_event", fake_track)
    now = dt_util.now()
    current = SimpleNamespace(state="900", last_updated=now - timedelta(minutes=1))
    hass = SimpleNamespace(states=SimpleNamespace(get=lambda _e: current))
    removers = []
    sensor = _sensor(_hass=hass, hass=hass, _box_id="2206237016")
    sensor.async_on_remove = removers.append

    sensor_lifecycle._subscribe_live_load(sensor)

    assert captured["entity_ids"] == ["sensor.oig_2206237016_actual_aco_p"]
    assert len(sensor._live_load_tracker) == 1  # seeded from the current state
    event = SimpleNamespace(data={"new_state": SimpleNamespace(state="6500", last_updated=now)})
    captured["action"](event)
    bad = SimpleNamespace(data={"new_state": SimpleNamespace(state="unavailable", last_updated=now)})
    captured["action"](bad)
    assert len(sensor._live_load_tracker) == 2
    assert removers
