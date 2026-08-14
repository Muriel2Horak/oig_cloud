from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities import solar_forecast_sensor as module
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)
from custom_components.oig_cloud.forecast.refresh_result import SolarFetchResult
from custom_components.oig_cloud.forecast.cache_contract import (
    build_cache_provenance,
    build_occurrence_id,
    build_retry_state,
)


SCHEDULED = datetime(2026, 8, 11, 12, 0, tzinfo=timezone(timedelta(hours=2)))


class Coordinator:
    forced_box_id = "123456"

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class Entry:
    entry_id = "entry-scheduler"
    options = {
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5.0,
        "solar_forecast_string2_enabled": False,
        "solar_forecast_string2_kwp": 0.0,
    }


def accepted_candidate() -> dict:
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


def make_sensor(monkeypatch, outcomes):
    sensor = OigCloudSolarForecastSensor(Coordinator(), "solar_forecast", Entry(), {})
    sensor.hass = SimpleNamespace(data={})
    sensor._min_api_interval = 0
    calls = []
    commits = []
    persisted = []
    timers = []
    unsubscribed = []
    queue = list(outcomes)

    async def fetch(**_kwargs):
        calls.append(len(calls))
        return queue.pop(0)

    async def commit(candidate):
        commits.append(
            (
                candidate,
                candidate.context.lifecycle_generation,
                candidate.context.request_id,
            )
        )
        sensor._retry_state = None
        return True

    async def persist(state, **_kwargs):
        persisted.append(state)
        sensor._retry_state = state
        return True

    async def provenance():
        return build_cache_provenance("entry-scheduler", Entry.options, 0)

    def track_point(_hass, callback, when):
        record = {"callback": callback, "when": when, "cancelled": False}
        timers.append(record)

        def cancel():
            record["cancelled"] = True
            unsubscribed.append(when)

        return cancel

    sensor.async_fetch_forecast_data = fetch
    sensor.async_commit_candidate = commit
    sensor._async_persist_retry_state = persist
    sensor._async_current_cache_provenance = provenance
    monkeypatch.setattr(module, "async_track_point_in_utc_time", track_point)
    return sensor, calls, commits, persisted, timers, unsubscribed


async def fire(timer):
    result = timer["callback"](timer["when"])
    if asyncio.iscoroutine(result):
        await result


@pytest.mark.asyncio
async def test_occurrence_retries_exactly_at_plus_15_and_plus_45_then_stops(
    monkeypatch,
):
    sensor, calls, commits, persisted, timers, _unsubscribed = make_sensor(
        monkeypatch,
        [
            SolarFetchResult.retry("rate_limited"),
            SolarFetchResult.retry("timeout"),
            SolarFetchResult.retry("connection"),
        ],
    )

    await sensor._wall_clock_update(SCHEDULED)
    assert timers[0]["when"] == (SCHEDULED + timedelta(minutes=15)).astimezone(
        timezone.utc
    )
    await fire(timers[0])
    assert timers[1]["when"] == (SCHEDULED + timedelta(minutes=45)).astimezone(
        timezone.utc
    )
    await fire(timers[1])

    assert len(calls) == 3
    assert commits == []
    assert len(timers) == 2
    assert persisted[-1] is None
    assert sensor._retry_state is None


@pytest.mark.asyncio
async def test_retry_success_commits_once_and_cancels_remaining_work(monkeypatch):
    accepted = SolarFetchResult.accept(accepted_candidate())
    sensor, calls, commits, persisted, timers, _unsubscribed = make_sensor(
        monkeypatch, [SolarFetchResult.retry("server_error"), accepted]
    )

    await sensor._wall_clock_update(SCHEDULED)
    await fire(timers[0])

    assert len(calls) == 2
    assert len(commits) == 1
    assert len(persisted) == 1
    assert persisted[0] is not None
    assert sensor._retry_state is None
    assert len(timers) == 1


@pytest.mark.asyncio
async def test_retry_candidate_rejected_by_commit_clears_durable_recovery(monkeypatch):
    sensor, _calls, _commits, persisted, timers, _unsubscribed = make_sensor(
        monkeypatch,
        [
            SolarFetchResult.retry("timeout"),
            SolarFetchResult.accept(accepted_candidate()),
        ],
    )
    await sensor._wall_clock_update(SCHEDULED)

    async def reject_commit(_candidate):
        return False

    sensor.async_commit_candidate = reject_commit
    await fire(timers[0])

    assert persisted[-1] is None
    assert sensor._retry_state is None


@pytest.mark.asyncio
async def test_terminal_failure_schedules_no_retry(monkeypatch):
    sensor, calls, commits, persisted, timers, _unsubscribed = make_sensor(
        monkeypatch, [SolarFetchResult.terminal("auth")]
    )

    await sensor._wall_clock_update(SCHEDULED)

    assert len(calls) == 1
    assert commits == []
    assert timers == []
    assert persisted[-1] is None


@pytest.mark.asyncio
async def test_newer_occurrence_cancels_older_retry_and_old_callback_is_inert(
    monkeypatch,
):
    sensor, calls, _commits, _persisted, timers, unsubscribed = make_sensor(
        monkeypatch,
        [
            SolarFetchResult.retry("timeout"),
            SolarFetchResult.terminal("auth"),
        ],
    )
    await sensor._wall_clock_update(SCHEDULED)
    old_timer = timers[0]

    await sensor._wall_clock_update(SCHEDULED + timedelta(hours=4))
    await fire(old_timer)

    assert old_timer["cancelled"] is True
    assert unsubscribed == [
        (SCHEDULED + timedelta(minutes=15)).astimezone(timezone.utc)
    ]
    assert len(calls) == 2


@pytest.mark.asyncio
async def test_duplicate_scheduled_callbacks_claim_before_provider_dispatch(
    monkeypatch,
):
    sensor, calls, commits, _persisted, _timers, _unsubscribed = make_sensor(
        monkeypatch,
        [SolarFetchResult.accept(accepted_candidate())],
    )

    await asyncio.gather(
        sensor._wall_clock_update(SCHEDULED),
        sensor._wall_clock_update(SCHEDULED),
    )

    assert len(calls) == 1
    assert len(commits) == 1


@pytest.mark.asyncio
async def test_hourly_interval_callback_uses_atomic_commit_boundary(monkeypatch):
    sensor, calls, commits, _persisted, _timers, _unsubscribed = make_sensor(
        monkeypatch,
        [SolarFetchResult.accept(accepted_candidate())],
    )
    sensor._config_entry.options = {
        **Entry.options,
        "solar_forecast_mode": "hourly",
    }
    sensor._last_api_call = 0

    await sensor._periodic_update(SCHEDULED)

    assert len(calls) == 1
    assert len(commits) == 1


@pytest.mark.asyncio
async def test_manual_and_scheduled_requests_serialize_without_overlap(monkeypatch):
    sensor = OigCloudSolarForecastSensor(Coordinator(), "solar_forecast", Entry(), {})
    sensor.hass = SimpleNamespace(data={})
    active = 0
    maximum = 0
    entered = asyncio.Event()
    release = asyncio.Event()
    dispatches = []

    async def fetch(**_kwargs):
        nonlocal active, maximum
        active += 1
        maximum = max(maximum, active)
        dispatches.append(len(dispatches))
        if len(dispatches) == 1:
            entered.set()
            await release.wait()
        active -= 1
        return SolarFetchResult.terminal("auth")

    async def persist(state, **_kwargs):
        sensor._retry_state = state
        return True

    async def provenance():
        return build_cache_provenance("entry-scheduler", Entry.options, 0)

    sensor.async_fetch_forecast_data = fetch
    sensor._async_persist_retry_state = persist
    sensor._async_current_cache_provenance = provenance
    monkeypatch.setattr(
        module, "async_track_point_in_utc_time", lambda *_a: lambda: None
    )

    scheduled = asyncio.create_task(sensor._wall_clock_update(SCHEDULED))
    await entered.wait()
    manual = asyncio.create_task(sensor.async_manual_update())
    await asyncio.sleep(0)
    release.set()
    await asyncio.gather(scheduled, manual)

    assert maximum == 1
    assert len(dispatches) == 2


@pytest.mark.asyncio
async def test_two_manual_requests_are_distinct_and_serialized(monkeypatch):
    sensor = OigCloudSolarForecastSensor(Coordinator(), "solar_forecast", Entry(), {})
    sensor.hass = SimpleNamespace(data={})
    active = 0
    maximum = 0
    calls = []

    async def fetch(**_kwargs):
        nonlocal active, maximum
        active += 1
        maximum = max(maximum, active)
        await asyncio.sleep(0)
        calls.append(len(calls))
        active -= 1
        return SolarFetchResult.terminal("auth")

    async def provenance():
        return build_cache_provenance("entry-scheduler", Entry.options, 0)

    sensor.async_fetch_forecast_data = fetch
    sensor._async_current_cache_provenance = provenance

    assert await asyncio.gather(
        sensor.async_manual_update(), sensor.async_manual_update()
    ) == [False, False]
    assert len(calls) == 2
    assert maximum == 1


@pytest.mark.asyncio
async def test_total_attempt_deadline_covers_provider_and_releases_lock(monkeypatch):
    sensor = OigCloudSolarForecastSensor(Coordinator(), "solar_forecast", Entry(), {})
    sensor.hass = SimpleNamespace(data={})
    calls = []

    async def fetch(**_kwargs):
        calls.append(len(calls))
        if len(calls) == 1:
            await asyncio.Event().wait()
        return SolarFetchResult.terminal("auth")

    async def persist(state, **_kwargs):
        sensor._retry_state = state
        return True

    async def provenance():
        return build_cache_provenance("entry-scheduler", Entry.options, 0)

    sensor.async_fetch_forecast_data = fetch
    sensor._async_persist_retry_state = persist
    sensor._async_current_cache_provenance = provenance
    monkeypatch.setattr(module, "ATTEMPT_TIMEOUT_SECONDS", 0.01)
    monkeypatch.setattr(
        module, "async_track_point_in_utc_time", lambda *_a: lambda: None
    )

    await sensor._wall_clock_update(SCHEDULED)
    assert await sensor.async_manual_update() is False

    assert len(calls) == 2
    assert sensor._refresh_lock.locked() is False


@pytest.mark.asyncio
async def test_total_attempt_deadline_includes_request_context_capture(monkeypatch):
    sensor = OigCloudSolarForecastSensor(Coordinator(), "solar_forecast", Entry(), {})
    sensor.hass = SimpleNamespace(data={})
    sensor._cache_provenance = build_cache_provenance(
        "entry-scheduler", Entry.options, 0
    )

    async def blocked_context(**_kwargs):
        await asyncio.Event().wait()

    sensor._async_capture_candidate_context = blocked_context
    monkeypatch.setattr(module, "ATTEMPT_TIMEOUT_SECONDS", 0.01)

    result = await asyncio.wait_for(
        sensor._async_execute_provider_attempt(request_id="deadline-context"),
        timeout=0.1,
    )

    assert result.retryable is True
    assert result.code == "timeout"
    assert result.context is None
    assert result.source_identity is not None
    assert result.source_identity.entry_id == "entry-scheduler"
    assert result.source_identity.request_id == "deadline-context"
    assert result.source_identity.request_sequence == 1


@pytest.mark.asyncio
async def test_retry_persistence_failure_arms_no_timer(monkeypatch):
    sensor, calls, _commits, _persisted, timers, _unsubscribed = make_sensor(
        monkeypatch, [SolarFetchResult.retry("timeout")]
    )

    async def fail_persist(_state, **_kwargs):
        return False

    sensor._async_persist_retry_state = fail_persist

    await sensor._wall_clock_update(SCHEDULED)

    assert len(calls) == 1
    assert timers == []


@pytest.mark.asyncio
async def test_timer_registration_failure_keeps_durable_retry_for_restart(monkeypatch):
    sensor, _calls, _commits, persisted, _timers, _unsubscribed = make_sensor(
        monkeypatch, [SolarFetchResult.retry("timeout")]
    )

    def fail_timer(*_args):
        raise RuntimeError("timer registration failed")

    monkeypatch.setattr(module, "async_track_point_in_utc_time", fail_timer)

    await sensor._wall_clock_update(SCHEDULED)

    assert persisted[-1] is not None
    assert sensor._retry_state == persisted[-1]


@pytest.mark.asyncio
async def test_restart_restores_future_retry_without_provider_dispatch(monkeypatch):
    sensor, calls, _commits, _persisted, timers, _unsubscribed = make_sensor(
        monkeypatch, []
    )
    provenance = build_cache_provenance("entry-scheduler", Entry.options, 0)
    state = build_retry_state(
        occurrence_id=build_occurrence_id(
            "entry-scheduler", "daily_optimized", SCHEDULED
        ),
        scheduled_local=SCHEDULED,
        completed_attempt_index=0,
        next_at=SCHEDULED + timedelta(minutes=15),
        code="timeout",
        provenance=provenance,
    )
    sensor._retry_state = state

    restored = await sensor._async_restore_retry_recovery(
        SCHEDULED - timedelta(minutes=5)
    )

    assert restored is True
    assert calls == []
    assert len(timers) == 1
    assert timers[0]["when"] == (SCHEDULED + timedelta(minutes=15)).astimezone(
        timezone.utc
    )


@pytest.mark.asyncio
async def test_restart_runs_one_overdue_retry_inside_horizon(monkeypatch):
    sensor, calls, commits, persisted, timers, _unsubscribed = make_sensor(
        monkeypatch, [SolarFetchResult.accept(accepted_candidate())]
    )
    provenance = build_cache_provenance("entry-scheduler", Entry.options, 0)
    state = build_retry_state(
        occurrence_id=build_occurrence_id(
            "entry-scheduler", "daily_optimized", SCHEDULED
        ),
        scheduled_local=SCHEDULED,
        completed_attempt_index=0,
        next_at=SCHEDULED + timedelta(minutes=15),
        code="connection",
        provenance=provenance,
    )
    sensor._retry_state = state

    restored = await sensor._async_restore_retry_recovery(
        SCHEDULED + timedelta(minutes=20)
    )

    assert restored is True
    assert len(calls) == 1
    assert len(commits) == 1
    assert persisted == []
    assert sensor._retry_state is None
    assert timers == []
