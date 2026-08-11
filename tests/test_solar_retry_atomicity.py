from __future__ import annotations

import asyncio
import copy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.config import solar_key_store
from custom_components.oig_cloud.entities import solar_forecast_sensor as module
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)
from custom_components.oig_cloud.forecast.cache_contract import (
    build_cache_envelope,
    build_cache_provenance,
    build_occurrence_id,
    build_retry_state,
    cache_provenance_matches,
)
from custom_components.oig_cloud.forecast.refresh_result import (
    SolarCandidate,
    SolarCandidateContext,
    SolarFetchResult,
)


NOW = datetime(2026, 8, 11, 12, 0, tzinfo=timezone.utc)
SCHEDULED = NOW


def options(**overrides):
    values = {
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
    values.update(overrides)
    return values


def candidate(marker: float = 2.0) -> dict:
    today = NOW.date().isoformat()
    tomorrow = (NOW.date() + timedelta(days=1)).isoformat()
    return {
        "response_time": NOW.isoformat(),
        "provider": "forecast_solar",
        "string1_hourly": {f"{today}T10:00:00": marker * 1000},
        "string1_daily": {today: marker, tomorrow: marker + 1},
        "string1_today_kwh": marker,
        "string1_tomorrow_kwh": marker + 1,
        "string2_hourly": {},
        "string2_daily": {},
        "string2_today_kwh": 0.0,
        "string2_tomorrow_kwh": 0.0,
        "total_hourly": {f"{today}T10:00:00": marker * 1000},
        "total_daily": {today: marker, tomorrow: marker + 1},
        "total_today_kwh": marker,
        "total_tomorrow_kwh": marker + 1,
    }


class Coordinator:
    forced_box_id = "retry-box"
    solar_forecast_data = None

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class Entry:
    entry_id = "entry-retry-atomic"

    def __init__(self, values):
        self.options = values


class MemoryStore:
    bucket = {}
    saves = []
    block_next_cache_save = False
    blocked_save_started = None
    blocked_save_release = None

    def __init__(self, _hass, version, key, **_kwargs):
        self.version = version
        self.key = key

    async def async_load(self):
        return copy.deepcopy(self.bucket.get(self.key))

    async def async_save(self, value):
        snapshot = copy.deepcopy(value)
        self.saves.append((self.key, snapshot))
        if (
            self.key == "oig_solar_forecast_entry-retry-atomic"
            and self.block_next_cache_save
        ):
            self.block_next_cache_save = False
            self.blocked_save_started.set()
            await self.blocked_save_release.wait()
        self.bucket[self.key] = snapshot

    async def async_remove(self):
        self.bucket.pop(self.key, None)


def make_sensor(monkeypatch, values=None, *, reset=False):
    if reset:
        MemoryStore.bucket = {}
        MemoryStore.saves = []
        MemoryStore.block_next_cache_save = False
        MemoryStore.blocked_save_started = None
        MemoryStore.blocked_save_release = None
    monkeypatch.setattr(module, "Store", MemoryStore)
    monkeypatch.setattr(solar_key_store, "Store", MemoryStore)
    sensor = OigCloudSolarForecastSensor(
        Coordinator(), "solar_forecast", Entry(values or options()), {}
    )
    sensor.hass = SimpleNamespace(data={})
    sensor._min_api_interval = 0
    sensor.async_write_ha_state = lambda: None

    async def broadcast():
        return None

    sensor._broadcast_forecast_data = broadcast
    monkeypatch.setattr(module.dt_util, "now", lambda: NOW)
    return sensor


def retry_state(provenance, *, completed=0):
    next_at = SCHEDULED + timedelta(minutes=15 if completed == 0 else 45)
    return build_retry_state(
        occurrence_id=build_occurrence_id(
            "entry-retry-atomic", "daily_optimized", SCHEDULED
        ),
        scheduled_local=SCHEDULED,
        completed_attempt_index=completed,
        next_at=next_at,
        code="timeout",
        provenance=provenance,
    )


async def request_context(
    sensor,
    *,
    request_id: str,
    request_sequence: int,
    occurrence_id: str,
) -> SolarCandidateContext:
    return await sensor._async_capture_candidate_context(
        request_id=request_id,
        occurrence_id=occurrence_id,
        occurrence_generation=sensor._occurrence_generation,
        lifecycle_generation=sensor._lifecycle_generation,
        request_sequence=request_sequence,
    )


async def seed_current_cache(sensor, *, with_retry=False):
    provenance = build_cache_provenance(
        "entry-retry-atomic", sensor._config_entry.options, 0
    )
    state = retry_state(provenance) if with_retry else None
    MemoryStore.bucket[sensor._storage_key] = build_cache_envelope(
        provenance=provenance,
        forecast_data=candidate(1.0),
        last_accepted_time=NOW,
        saved_at=NOW,
        retry_state=state,
    )
    await sensor._load_persistent_data()
    return provenance, state


@pytest.mark.asyncio
async def test_retry_persist_and_clear_preserve_mismatched_cache_provenance(
    monkeypatch,
):
    old_values = options(solar_forecast_string1_azimuth=138)
    current_values = options(solar_forecast_string1_azimuth=90)
    old_provenance = build_cache_provenance("entry-retry-atomic", old_values, 0)
    current_provenance = build_cache_provenance("entry-retry-atomic", current_values, 0)
    original = build_cache_envelope(
        provenance=old_provenance,
        forecast_data=candidate(),
        last_accepted_time=NOW,
        saved_at=NOW,
    )
    MemoryStore.bucket = {"oig_solar_forecast_entry-retry-atomic": original}
    MemoryStore.saves = []
    sensor = make_sensor(monkeypatch, current_values)
    await sensor._load_persistent_data()
    state = retry_state(current_provenance)

    assert await sensor._async_persist_retry_state(state) is True
    assert await sensor._async_persist_retry_state(None) is True

    stored = MemoryStore.bucket[sensor._storage_key]
    assert {key: stored[key] for key in old_provenance} == old_provenance
    assert stored["forecast_data"] == original["forecast_data"]
    assert "retry_state" not in stored
    restarted = make_sensor(monkeypatch, current_values)
    await restarted._load_persistent_data()
    assert restarted._cache_usable is False
    assert restarted._forced_stale_reason == "provenance_mismatch"


@pytest.mark.asyncio
async def test_retry_persistence_keeps_legacy_cache_read_only_and_forced_stale(
    monkeypatch,
):
    legacy_key = "oig_solar_forecast_retry-box"
    legacy = {
        "last_api_call": NOW.timestamp(),
        "forecast_data": candidate(),
        "saved_at": NOW.isoformat(),
    }
    MemoryStore.bucket = {legacy_key: copy.deepcopy(legacy)}
    MemoryStore.saves = []
    sensor = make_sensor(monkeypatch)
    await sensor._load_persistent_data()
    provenance = build_cache_provenance(
        "entry-retry-atomic", sensor._config_entry.options, 0
    )
    state = retry_state(provenance)

    assert await sensor._async_persist_retry_state(state) is True

    assert MemoryStore.bucket[legacy_key] == legacy
    schema2 = MemoryStore.bucket[sensor._storage_key]
    assert cache_provenance_matches(schema2, provenance) is False
    assert schema2["retry_state"] == state
    restarted = make_sensor(monkeypatch)
    await restarted._load_persistent_data()
    assert restarted._cache_usable is False
    assert restarted._forced_stale_reason is not None
    assert restarted._retry_state == state


@pytest.mark.asyncio
async def test_retry_persistence_preserves_invalid_cache_artifact(monkeypatch):
    provenance = build_cache_provenance("entry-retry-atomic", options(), 0)
    invalid = candidate()
    invalid["total_daily"].pop((NOW.date() + timedelta(days=1)).isoformat())
    original = build_cache_envelope(
        provenance=provenance,
        forecast_data=invalid,
        last_accepted_time=NOW,
        saved_at=NOW,
    )
    MemoryStore.bucket = {"oig_solar_forecast_entry-retry-atomic": original}
    MemoryStore.saves = []
    sensor = make_sensor(monkeypatch)
    await sensor._load_persistent_data()
    state = retry_state(provenance)

    assert await sensor._async_persist_retry_state(state) is True

    stored = MemoryStore.bucket[sensor._storage_key]
    assert stored["forecast_data"] == invalid
    restarted = make_sensor(monkeypatch)
    await restarted._load_persistent_data()
    assert restarted._cache_usable is False
    assert restarted._forced_stale_reason == "cache_invalid"
    assert restarted._retry_state == state


@pytest.mark.asyncio
async def test_successful_retry_clears_recovery_in_accepted_snapshot_write(
    monkeypatch,
):
    sensor = make_sensor(monkeypatch, reset=True)
    provenance = build_cache_provenance(
        "entry-retry-atomic", sensor._config_entry.options, 0
    )
    state = retry_state(provenance, completed=0)
    MemoryStore.bucket[sensor._storage_key] = build_cache_envelope(
        provenance=provenance,
        forecast_data=candidate(1.0),
        last_accepted_time=NOW,
        saved_at=NOW,
        retry_state=state,
    )
    sensor._last_forecast_data = candidate(1.0)
    sensor._retry_state = state
    sensor._current_occurrence_id = state["occurrence_id"]
    sensor._occurrence_generation = 1

    async def fetch(**_kwargs):
        return SolarFetchResult.accept(candidate(8.0))

    sensor.async_fetch_forecast_data = fetch
    await sensor._async_run_scheduled_attempt(
        occurrence_id=state["occurrence_id"],
        occurrence_generation=1,
        scheduled_local=SCHEDULED,
        attempt_index=1,
    )

    task_saves = [
        saved for key, saved in MemoryStore.saves if key == sensor._storage_key
    ]
    assert len(task_saves) == 1
    assert task_saves[0]["forecast_data"]["total_today_kwh"] == 8.0
    assert "retry_state" not in task_saves[0]
    assert sensor._retry_state is None


@pytest.mark.asyncio
async def test_restart_cannot_replay_retry_after_durable_success_before_publish(
    monkeypatch,
):
    sensor = make_sensor(monkeypatch, reset=True)
    provenance = build_cache_provenance(
        "entry-retry-atomic", sensor._config_entry.options, 0
    )
    state = retry_state(provenance, completed=0)
    MemoryStore.bucket[sensor._storage_key] = build_cache_envelope(
        provenance=provenance,
        forecast_data=candidate(1.0),
        last_accepted_time=NOW,
        saved_at=NOW,
        retry_state=state,
    )
    sensor._last_forecast_data = candidate(1.0)
    sensor._retry_state = state
    sensor._current_occurrence_id = state["occurrence_id"]
    sensor._occurrence_generation = 1
    publish_entered = asyncio.Event()
    publish_release = asyncio.Event()

    async def fetch(**_kwargs):
        return SolarFetchResult.accept(candidate(7.0))

    async def blocked_publish():
        publish_entered.set()
        await publish_release.wait()

    sensor.async_fetch_forecast_data = fetch
    sensor._broadcast_forecast_data = blocked_publish
    attempt = asyncio.create_task(
        sensor._async_run_scheduled_attempt(
            occurrence_id=state["occurrence_id"],
            occurrence_generation=1,
            scheduled_local=SCHEDULED,
            attempt_index=1,
        )
    )
    await publish_entered.wait()

    stored = MemoryStore.bucket[sensor._storage_key]
    assert stored["forecast_data"]["total_today_kwh"] == 7.0
    assert "retry_state" not in stored
    restarted = make_sensor(monkeypatch)
    await restarted._load_persistent_data()
    assert restarted._retry_state is None
    assert restarted._last_forecast_data["total_today_kwh"] == 7.0

    publish_release.set()
    await attempt


@pytest.mark.asyncio
@pytest.mark.parametrize("operation", ["set", "clear"])
async def test_retry_write_and_accepted_commit_share_one_cache_transaction(
    monkeypatch, operation
):
    sensor = make_sensor(monkeypatch, reset=True)
    provenance, stored_retry = await seed_current_cache(
        sensor, with_retry=operation == "clear"
    )
    occurrence_id = retry_state(provenance)["occurrence_id"]
    sensor._current_occurrence_id = occurrence_id
    sensor._occurrence_generation = 1
    old_update = retry_state(provenance) if operation == "set" else None
    MemoryStore.block_next_cache_save = True
    MemoryStore.blocked_save_started = asyncio.Event()
    MemoryStore.blocked_save_release = asyncio.Event()

    old_write = asyncio.create_task(sensor._async_persist_retry_state(old_update))
    await MemoryStore.blocked_save_started.wait()
    newer_context = await request_context(
        sensor,
        request_id="request:newer",
        request_sequence=2,
        occurrence_id=occurrence_id,
    )
    newer_commit = asyncio.create_task(
        sensor.async_commit_candidate(SolarCandidate(candidate(9.0), newer_context))
    )
    await asyncio.sleep(0)

    try:
        assert newer_commit.done() is False
    finally:
        MemoryStore.blocked_save_release.set()
        await asyncio.gather(old_write, newer_commit, return_exceptions=True)

    assert newer_commit.result() is True
    assert MemoryStore.bucket[sensor._storage_key]["forecast_data"][
        "total_today_kwh"
    ] == 9.0
    assert "retry_state" not in MemoryStore.bucket[sensor._storage_key]
    if operation == "clear":
        assert stored_retry is not None


@pytest.mark.asyncio
async def test_obsolete_retry_source_cannot_overwrite_newer_accepted_snapshot(
    monkeypatch,
):
    sensor = make_sensor(monkeypatch, reset=True)
    provenance, _ = await seed_current_cache(sensor)
    state = retry_state(provenance)
    occurrence_id = state["occurrence_id"]
    sensor._current_occurrence_id = occurrence_id
    sensor._occurrence_generation = 1
    old_context = await request_context(
        sensor,
        request_id="request:old-retry",
        request_sequence=1,
        occurrence_id=occurrence_id,
    )
    newer_context = await request_context(
        sensor,
        request_id="request:new-snapshot",
        request_sequence=2,
        occurrence_id=occurrence_id,
    )

    assert (
        await sensor.async_commit_candidate(
            SolarCandidate(candidate(10.0), newer_context)
        )
        is True
    )
    saves_before = len(MemoryStore.saves)

    assert (
        await sensor._async_persist_retry_state(
            state,
            source_context=old_context,
        )
        is False
    )
    assert len(MemoryStore.saves) == saves_before
    assert MemoryStore.bucket[sensor._storage_key]["forecast_data"][
        "total_today_kwh"
    ] == 10.0
    assert "retry_state" not in MemoryStore.bucket[sensor._storage_key]


@pytest.mark.asyncio
async def test_older_retry_sequence_cannot_replace_newer_retry_recovery(monkeypatch):
    sensor = make_sensor(monkeypatch, reset=True)
    provenance, _ = await seed_current_cache(sensor)
    old_state = retry_state(provenance)
    newer_state = {**old_state, "code": "rate_limited"}
    occurrence_id = old_state["occurrence_id"]
    sensor._current_occurrence_id = occurrence_id
    sensor._occurrence_generation = 1
    old_context = await request_context(
        sensor,
        request_id="request:retry-old",
        request_sequence=1,
        occurrence_id=occurrence_id,
    )
    newer_context = await request_context(
        sensor,
        request_id="request:retry-new",
        request_sequence=2,
        occurrence_id=occurrence_id,
    )

    assert (
        await sensor._async_persist_retry_state(
            newer_state,
            source_context=newer_context,
        )
        is True
    )
    saves_before = len(MemoryStore.saves)

    assert (
        await sensor._async_persist_retry_state(
            old_state,
            source_context=old_context,
        )
        is False
    )
    assert len(MemoryStore.saves) == saves_before
    assert MemoryStore.bucket[sensor._storage_key]["retry_state"] == newer_state


@pytest.mark.asyncio
async def test_retry_store_write_is_shielded_and_reconciles_caller_cancellation(
    monkeypatch,
):
    sensor = make_sensor(monkeypatch, reset=True)
    provenance, _ = await seed_current_cache(sensor)
    state = retry_state(provenance)
    MemoryStore.block_next_cache_save = True
    MemoryStore.blocked_save_started = asyncio.Event()
    MemoryStore.blocked_save_release = asyncio.Event()
    caller = asyncio.create_task(sensor._async_persist_retry_state(state))
    await MemoryStore.blocked_save_started.wait()

    caller.cancel()
    await asyncio.sleep(0)

    try:
        assert caller.done() is False
        MemoryStore.blocked_save_release.set()
        with pytest.raises(asyncio.CancelledError):
            await caller
    finally:
        MemoryStore.blocked_save_release.set()
        await asyncio.gather(caller, return_exceptions=True)

    assert MemoryStore.bucket[sensor._storage_key]["retry_state"] == state
    assert sensor._durable_write_tasks == set()


@pytest.mark.asyncio
async def test_unload_during_retry_save_preserves_one_durable_recovery(
    monkeypatch,
):
    sensor = make_sensor(monkeypatch, reset=True)
    await seed_current_cache(sensor)
    MemoryStore.block_next_cache_save = True
    MemoryStore.blocked_save_started = asyncio.Event()
    MemoryStore.blocked_save_release = asyncio.Event()
    writes = []

    async def retry_fetch(**_kwargs):
        return SolarFetchResult.retry("timeout")

    sensor.async_fetch_forecast_data = retry_fetch
    sensor.async_write_ha_state = lambda: writes.append("state")

    async def broadcast():
        writes.append("broadcast")

    sensor._broadcast_forecast_data = broadcast
    refresh = asyncio.create_task(sensor._wall_clock_update(SCHEDULED))
    await MemoryStore.blocked_save_started.wait()
    unload = asyncio.create_task(sensor.async_will_remove_from_hass())
    await asyncio.sleep(0)

    try:
        assert unload.done() is False
        MemoryStore.blocked_save_release.set()
        await unload
    finally:
        MemoryStore.blocked_save_release.set()
        await asyncio.gather(refresh, unload, return_exceptions=True)

    stored = MemoryStore.bucket[sensor._storage_key]
    assert stored["retry_state"]["code"] == "timeout"
    retry_saves = [
        item
        for key, item in MemoryStore.saves
        if key == sensor._storage_key and "retry_state" in item
    ]
    assert len(retry_saves) == 1
    assert writes == []
    assert sensor._active_refresh_tasks == set()
    assert sensor._durable_write_tasks == set()
