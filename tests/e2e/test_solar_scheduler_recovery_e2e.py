from __future__ import annotations

import copy
from datetime import timedelta
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.config import solar_key_store
from custom_components.oig_cloud.entities import solar_forecast_sensor as module
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)
from custom_components.oig_cloud.forecast.refresh_result import SolarFetchResult


class Coordinator:
    forced_box_id = "123456"
    solar_forecast_data = None

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class Entry:
    entry_id = "entry-e2e"
    options = {
        "enable_solar_forecast": True,
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_latitude": 50.1,
        "solar_forecast_longitude": 14.2,
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5.0,
        "solar_forecast_string1_declination": 35,
        "solar_forecast_string1_azimuth": 138,
        "solar_forecast_string2_enabled": False,
        "solar_forecast_string2_kwp": 0.0,
    }


class MemoryStore:
    bucket = {}

    def __init__(self, _hass, version, key, **_kwargs):
        self.version = version
        self.key = key

    async def async_load(self):
        return copy.deepcopy(self.bucket.get(self.key))

    async def async_save(self, data):
        self.bucket[self.key] = copy.deepcopy(data)

    async def async_remove(self):
        self.bucket.pop(self.key, None)


def forecast_candidate() -> dict:
    now = module.dt_util.now()
    today = now.date().isoformat()
    tomorrow = (now.date() + timedelta(days=1)).isoformat()
    return {
        "response_time": now.isoformat(),
        "provider": "forecast_solar",
        "string1_hourly": {f"{today}T10:00:00": 1000.0},
        "string1_daily": {today: 2.0, tomorrow: 3.0},
        "string1_today_kwh": 2.0,
        "string1_tomorrow_kwh": 3.0,
        "string2_hourly": {},
        "string2_daily": {},
        "string2_today_kwh": 0.0,
        "string2_tomorrow_kwh": 0.0,
        "total_hourly": {f"{today}T10:00:00": 1000.0},
        "total_daily": {today: 2.0, tomorrow: 3.0},
        "total_today_kwh": 2.0,
        "total_tomorrow_kwh": 3.0,
    }


def make_sensor(monkeypatch, outcomes):
    MemoryStore.bucket = {}
    monkeypatch.setattr(module, "Store", MemoryStore)
    monkeypatch.setattr(solar_key_store, "Store", MemoryStore)
    timers = []

    def track_point(_hass, callback, when):
        timers.append((callback, when))
        return lambda: None

    monkeypatch.setattr(module, "async_track_point_in_utc_time", track_point)
    sensor = OigCloudSolarForecastSensor(Coordinator(), "solar_forecast", Entry(), {})
    sensor.hass = SimpleNamespace(data={})
    sensor._min_api_interval = 0
    sensor.async_write_ha_state = lambda: None

    async def broadcast():
        return None

    sensor._broadcast_forecast_data = broadcast
    queue = list(outcomes)

    async def fetch():
        outcome = queue.pop(0)
        return outcome() if callable(outcome) else outcome

    sensor.async_fetch_forecast_data = fetch
    return sensor, timers


@pytest.mark.asyncio
async def test_two_day_stale_snapshot_recovers_at_next_local_occurrence(
    monkeypatch, freezer
):
    freezer.move_to("2026-08-11 08:42:00+00:00")
    sensor, _timers = make_sensor(
        monkeypatch,
        [
            lambda: SolarFetchResult.accept(forecast_candidate()),
            lambda: SolarFetchResult.accept(forecast_candidate()),
        ],
    )

    assert await sensor._async_run_initial_refresh() is True
    first_response = sensor._last_forecast_data["response_time"]

    freezer.move_to("2026-08-13 10:00:00+00:00")
    assert sensor._build_main_attrs()["forecast_stale"] is True
    await sensor._wall_clock_update(module.dt_util.now().replace(minute=0, second=0))

    attrs = sensor._build_main_attrs()
    assert sensor._last_forecast_data["response_time"] != first_response
    assert attrs["forecast_age_hours"] == 0.0
    assert attrs["forecast_covers_tomorrow"] is True
    assert attrs["forecast_stale"] is False


@pytest.mark.asyncio
async def test_transient_failures_keep_old_card_until_plus_45_success(
    monkeypatch, freezer
):
    freezer.move_to("2026-08-11 10:00:00+00:00")
    sensor, timers = make_sensor(
        monkeypatch,
        [
            lambda: SolarFetchResult.accept(forecast_candidate()),
            SolarFetchResult.retry("rate_limited"),
            SolarFetchResult.retry("timeout"),
            lambda: SolarFetchResult.accept(forecast_candidate()),
        ],
    )
    assert await sensor._async_run_initial_refresh() is True
    old = copy.deepcopy(sensor._last_forecast_data)
    scheduled = module.dt_util.now().replace(hour=12, minute=0, second=0)

    await sensor._wall_clock_update(scheduled)
    assert sensor._last_forecast_data == old
    freezer.move_to("2026-08-11 10:15:00+00:00")
    await timers[0][0](timers[0][1])
    assert sensor._last_forecast_data == old
    freezer.move_to("2026-08-11 10:45:00+00:00")
    await timers[1][0](timers[1][1])

    assert sensor._build_main_attrs()["forecast_stale"] is False
    assert sensor._retry_state is None


@pytest.mark.asyncio
async def test_terminal_auth_failure_preserves_card_and_manual_reports_false(
    monkeypatch, freezer
):
    freezer.move_to("2026-08-11 10:00:00+00:00")
    sensor, timers = make_sensor(
        monkeypatch,
        [
            lambda: SolarFetchResult.accept(forecast_candidate()),
            SolarFetchResult.terminal("auth"),
        ],
    )
    assert await sensor._async_run_initial_refresh() is True
    old = copy.deepcopy(sensor._last_forecast_data)

    assert await sensor.async_manual_update() is False

    assert sensor._last_forecast_data == old
    assert timers == []
