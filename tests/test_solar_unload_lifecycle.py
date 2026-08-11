from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)
from custom_components.oig_cloud.forecast.refresh_result import SolarFetchResult


SCHEDULED = datetime(2026, 8, 11, 12, 0, tzinfo=timezone.utc)


class Coordinator:
    forced_box_id = "123456"

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class Entry:
    entry_id = "entry-unload"
    options = {
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5.0,
        "solar_forecast_string2_enabled": False,
        "solar_forecast_string2_kwp": 0.0,
    }


def candidate():
    today = SCHEDULED.date().isoformat()
    tomorrow = (SCHEDULED.date() + timedelta(days=1)).isoformat()
    return {
        "response_time": SCHEDULED.isoformat(),
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


def make_sensor():
    sensor = OigCloudSolarForecastSensor(Coordinator(), "solar_forecast", Entry(), {})
    sensor.hass = SimpleNamespace(data={})
    sensor._min_api_interval = 0
    return sensor


@pytest.mark.asyncio
async def test_unload_cancels_and_awaits_active_provider_request():
    sensor = make_sensor()
    entered = asyncio.Event()
    cancelled = asyncio.Event()

    async def fetch():
        entered.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            raise

    sensor.async_fetch_forecast_data = fetch
    refresh = asyncio.create_task(sensor._wall_clock_update(SCHEDULED))
    await entered.wait()

    await sensor.async_will_remove_from_hass()

    assert cancelled.is_set()
    assert refresh.done()
    assert sensor._removed is True
    assert sensor._active_refresh_tasks == set()


@pytest.mark.asyncio
async def test_unload_cancels_manual_request_waiting_for_lock():
    sensor = make_sensor()
    await sensor._refresh_lock.acquire()
    manual = asyncio.create_task(sensor.async_manual_update())
    await asyncio.sleep(0)

    await sensor.async_will_remove_from_hass()

    assert manual.cancelled()
    sensor._refresh_lock.release()
    assert sensor._active_refresh_tasks == set()


@pytest.mark.asyncio
async def test_unload_waits_for_shielded_durable_save_without_post_remove_publish():
    sensor = make_sensor()
    save_started = asyncio.Event()
    save_release = asyncio.Event()
    durable = []
    writes = []

    async def fetch():
        return SolarFetchResult.accept(candidate())

    async def save(_candidate, _commit_time):
        save_started.set()
        await save_release.wait()
        durable.append("saved")

    sensor.async_fetch_forecast_data = fetch
    sensor._async_save_candidate_snapshot = save
    sensor.async_write_ha_state = lambda: writes.append("state")

    async def broadcast():
        writes.append("broadcast")

    sensor._broadcast_forecast_data = broadcast
    manual = asyncio.create_task(sensor.async_manual_update())
    await save_started.wait()
    unload = asyncio.create_task(sensor.async_will_remove_from_hass())
    await asyncio.sleep(0)
    assert unload.done() is False

    save_release.set()
    await unload

    assert durable == ["saved"]
    assert writes == []
    assert manual.cancelled()
    assert not sensor._durable_write_tasks


@pytest.mark.asyncio
async def test_unload_runs_schedule_and_retry_unsubscribers_once_and_is_idempotent():
    sensor = make_sensor()
    unsubscribed = []
    sensor._update_interval_remover = lambda: unsubscribed.append("schedule")
    sensor._retry_unsubscribe = lambda: unsubscribed.append("retry")
    sensor._retry_state = {"durable": True}

    await sensor.async_will_remove_from_hass()
    await sensor.async_will_remove_from_hass()

    assert unsubscribed == ["schedule", "retry"]
    assert sensor._retry_state == {"durable": True}
    assert sensor._active_refresh_tasks == set()


@pytest.mark.asyncio
async def test_unload_cancels_setup_before_it_can_register_new_work():
    sensor = make_sensor()
    load_started = asyncio.Event()
    load_release = asyncio.Event()
    registrations = []

    async def load():
        load_started.set()
        await load_release.wait()

    sensor._load_persistent_data = load
    sensor._register_refresh_schedule = lambda: registrations.append("schedule")
    setup = asyncio.create_task(sensor._async_initialize_after_add())
    await load_started.wait()

    try:
        await sensor.async_will_remove_from_hass()
        assert setup.cancelled()
        assert registrations == []
    finally:
        if not setup.done():
            setup.cancel()
            await asyncio.gather(setup, return_exceptions=True)
