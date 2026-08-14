from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest

from custom_components.oig_cloud.entities import solar_forecast_sensor as module
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)
from custom_components.oig_cloud.forecast.cache_contract import build_cache_provenance
from custom_components.oig_cloud.forecast.refresh_result import SolarFetchResult


PRAGUE = ZoneInfo("Europe/Prague")


class Coordinator:
    forced_box_id = "123456"

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class Entry:
    entry_id = "entry-schedule"

    def __init__(self, mode):
        self.options = {
            "solar_forecast_mode": mode,
            "solar_forecast_provider": "forecast_solar",
        }


def make_sensor(mode="daily_optimized", sensor_type="solar_forecast"):
    sensor = OigCloudSolarForecastSensor(Coordinator(), sensor_type, Entry(mode), {})
    sensor.hass = SimpleNamespace(data={})

    async def provenance():
        return build_cache_provenance("entry-schedule", sensor._config_entry.options, 0)

    async def persist(state, **_kwargs):
        sensor._retry_state = state
        return True

    sensor._async_current_cache_provenance = provenance
    sensor._async_persist_retry_state = persist
    return sensor


def capture_schedules(monkeypatch):
    wall_clock = []
    intervals = []

    def track_time_change(hass, callback, **kwargs):
        wall_clock.append((hass, callback, kwargs))
        return lambda: None

    def track_interval(hass, callback, interval):
        intervals.append((hass, callback, interval))
        return lambda: None

    monkeypatch.setattr(module, "async_track_time_change", track_time_change)
    monkeypatch.setattr(module, "async_track_time_interval", track_interval)
    return wall_clock, intervals


@pytest.mark.asyncio
async def test_setup_at_1042_dispatches_once_at_local_noon(monkeypatch):
    sensor = make_sensor("daily_optimized")
    wall_clock, intervals = capture_schedules(monkeypatch)
    dispatched = []

    async def fetch(**_kwargs):
        dispatched.append(datetime.now())
        return SolarFetchResult.terminal("invalid_response")

    sensor.async_fetch_forecast_data = fetch

    sensor._register_refresh_schedule()
    assert intervals == []
    assert len(wall_clock) == 1
    _hass, callback, kwargs = wall_clock[0]
    assert kwargs == {"hour": [6, 12, 16], "minute": 0, "second": 0}

    startup = datetime(2026, 8, 11, 10, 42, tzinfo=PRAGUE)
    assert startup.minute == 42
    await callback(datetime(2026, 8, 11, 12, 0, tzinfo=PRAGUE))

    assert len(dispatched) == 1


@pytest.mark.parametrize(
    ("mode", "hours"),
    [
        ("daily_optimized", [6, 12, 16]),
        ("daily", [6]),
    ],
)
def test_daily_modes_register_home_assistant_local_wall_clock(monkeypatch, mode, hours):
    sensor = make_sensor(mode)
    wall_clock, intervals = capture_schedules(monkeypatch)

    sensor._register_refresh_schedule()

    assert intervals == []
    assert len(wall_clock) == 1
    assert wall_clock[0][2] == {"hour": hours, "minute": 0, "second": 0}


@pytest.mark.parametrize(
    ("mode", "interval"),
    [("hourly", timedelta(hours=1)), ("every_4h", timedelta(hours=4))],
)
def test_true_interval_modes_keep_interval_subscription(monkeypatch, mode, interval):
    sensor = make_sensor(mode)
    wall_clock, intervals = capture_schedules(monkeypatch)

    sensor._register_refresh_schedule()

    assert wall_clock == []
    assert len(intervals) == 1
    assert intervals[0][2] == interval


def test_manual_and_secondary_sensors_register_no_schedule(monkeypatch):
    wall_clock, intervals = capture_schedules(monkeypatch)

    make_sensor("manual")._register_refresh_schedule()
    make_sensor(
        "daily_optimized", "solar_forecast_string1"
    )._register_refresh_schedule()
    make_sensor("hourly", "solar_forecast_string2")._register_refresh_schedule()

    assert wall_clock == []
    assert intervals == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "target",
    [
        datetime(2026, 3, 29, 6, 0, tzinfo=PRAGUE),
        datetime(2026, 3, 29, 12, 0, tzinfo=PRAGUE),
        datetime(2026, 3, 29, 16, 0, tzinfo=PRAGUE),
        datetime(2026, 10, 25, 6, 0, tzinfo=PRAGUE),
        datetime(2026, 10, 25, 12, 0, tzinfo=PRAGUE),
        datetime(2026, 10, 25, 16, 0, tzinfo=PRAGUE),
    ],
)
async def test_prague_dst_transition_targets_dispatch_once(monkeypatch, target):
    sensor = make_sensor("daily_optimized")
    wall_clock, _intervals = capture_schedules(monkeypatch)
    dispatched = []

    async def fetch(**_kwargs):
        dispatched.append(target.isoformat())
        return SolarFetchResult.terminal("invalid_response")

    sensor.async_fetch_forecast_data = fetch
    sensor._register_refresh_schedule()

    await wall_clock[0][1](target)

    assert dispatched == [target.isoformat()]
