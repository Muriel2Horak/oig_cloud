from __future__ import annotations

import asyncio
import copy
from datetime import timedelta, timezone
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest

from custom_components.oig_cloud.config import solar_key_store
from custom_components.oig_cloud.entities import solar_forecast_sensor as module
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)
from custom_components.oig_cloud.forecast.refresh_result import SolarFetchResult
from custom_components.oig_cloud.services import _update_solar_forecast_for_entry


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


def make_sensor(monkeypatch, outcomes, *, reset=True):
    if reset:
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

    async def fetch(**_request_context):
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
    delivered_local = (
        module.dt_util.now()
        .astimezone(ZoneInfo("Europe/Prague"))
        .replace(minute=0, second=0)
    )
    await sensor._wall_clock_update(delivered_local)

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


@pytest.mark.asyncio
async def test_restart_between_attempts_restores_exact_plus_45_without_duplicate_dispatch(
    monkeypatch, freezer
):
    freezer.move_to("2026-08-11 10:00:00+00:00")
    scheduled = module.dt_util.now().replace(hour=12, minute=0, second=0)
    first, first_timers = make_sensor(
        monkeypatch,
        [SolarFetchResult.retry("timeout"), SolarFetchResult.retry("rate_limited")],
    )
    await first._wall_clock_update(scheduled)
    freezer.move_to("2026-08-11 10:15:00+00:00")
    await first_timers[0][0](first_timers[0][1])
    await first.async_will_remove_from_hass()

    dispatches = []

    def accepted_after_restart():
        dispatches.append("provider")
        return SolarFetchResult.accept(forecast_candidate())

    restarted, restored_timers = make_sensor(
        monkeypatch, [accepted_after_restart], reset=False
    )
    await restarted._load_persistent_data()
    freezer.move_to("2026-08-11 10:20:00+00:00")

    assert await restarted._async_restore_retry_recovery(module.dt_util.now()) is True
    assert dispatches == []
    assert len(restored_timers) == 1
    assert restored_timers[0][1] == (scheduled + timedelta(minutes=45)).astimezone(
        timezone.utc
    )

    await restarted._wall_clock_update(scheduled)
    assert dispatches == []
    freezer.move_to("2026-08-11 10:45:00+00:00")
    await restored_timers[0][0](restored_timers[0][1])
    assert dispatches == ["provider"]
    assert restarted._retry_state is None


@pytest.mark.asyncio
async def test_restart_after_pre_unload_durable_save_publishes_snapshot_once(
    monkeypatch, freezer
):
    freezer.move_to("2026-08-11 10:00:00+00:00")
    first, _timers = make_sensor(
        monkeypatch, [lambda: SolarFetchResult.accept(forecast_candidate())]
    )
    pre_publish_entered = asyncio.Event()
    pre_publish_release = asyncio.Event()
    context_checks = 0
    first_writes = []
    original_context_check = first._async_candidate_context_is_current

    async def block_after_durable_save(context):
        nonlocal context_checks
        context_checks += 1
        current = await original_context_check(context)
        if context_checks == 2:
            pre_publish_entered.set()
            await pre_publish_release.wait()
        return current

    first._async_candidate_context_is_current = block_after_durable_save
    first.async_write_ha_state = lambda: first_writes.append("state")

    async def record_broadcast():
        first_writes.append("broadcast")

    first._broadcast_forecast_data = record_broadcast
    refresh = asyncio.create_task(first.async_manual_update())
    await pre_publish_entered.wait()
    try:
        assert MemoryStore.bucket[first._storage_key]["forecast_data"][
            "total_today_kwh"
        ] == 2.0
        assert first._last_forecast_data is None
        assert first._durable_cache_envelope is None
        assert first.coordinator.solar_forecast_data is None
        assert first_writes == []
    except BaseException:
        pre_publish_release.set()
        refresh.cancel()
        await asyncio.gather(refresh, return_exceptions=True)
        raise

    unload = asyncio.create_task(first.async_will_remove_from_hass())
    await unload
    assert refresh.cancelled()
    assert first_writes == []

    class CountingCoordinator(Coordinator):
        def __init__(self):
            self.published = []
            self._solar_forecast_data = None

        @property
        def solar_forecast_data(self):
            return self._solar_forecast_data

        @solar_forecast_data.setter
        def solar_forecast_data(self, value):
            self._solar_forecast_data = value
            self.published.append(copy.deepcopy(value))

    coordinator = CountingCoordinator()
    restarted = OigCloudSolarForecastSensor(coordinator, "solar_forecast", Entry(), {})
    restarted.hass = SimpleNamespace(data={})
    restarted._register_refresh_schedule = lambda: None
    restarted._should_fetch_data = lambda: False
    restarted.async_write_ha_state = lambda: None
    await restarted._async_initialize_after_add_impl()

    assert len(coordinator.published) == 1
    assert coordinator.published[0]["total_today_kwh"] == 2.0
    assert restarted._active_refresh_tasks == set()
    assert first._durable_write_tasks == set()
    pre_publish_release.set()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "outcome",
    [SolarFetchResult.retry("timeout"), SolarFetchResult.terminal("auth")],
)
async def test_service_manual_transient_and_terminal_failures_are_truthful_and_clean(
    monkeypatch, outcome
):
    sensor, timers = make_sensor(monkeypatch, [outcome])
    sensor.entity_id = "sensor.oig_entry_e2e_solar_forecast"

    result = await _update_solar_forecast_for_entry(
        "entry-e2e", {"solar_forecast_sensors": [sensor]}
    )
    await sensor.async_will_remove_from_hass()

    assert result == {
        "entry_id": "entry-e2e",
        "status": "error",
        "error": "manual_update_failed",
    }
    assert timers == []
    assert sensor._active_refresh_tasks == set()
    assert sensor._durable_write_tasks == set()
