from __future__ import annotations

import asyncio
import copy
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities import solar_forecast_sensor as sensor_module
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)
from custom_components.oig_cloud.forecast.cache_contract import (
    CandidateValidationError,
    validate_forecast_candidate,
)
from custom_components.oig_cloud.forecast.refresh_result import SolarFetchResult


NOW = datetime(2026, 8, 11, 6, 0, tzinfo=timezone.utc)
TODAY = "2026-08-11"
TOMORROW = "2026-08-12"


@pytest.fixture(autouse=True)
def freeze_solar_candidate_now(monkeypatch):
    monkeypatch.setattr(sensor_module.dt_util, "now", lambda: NOW)


def valid_candidate(provider: str = "forecast_solar") -> dict:
    return {
        "response_time": NOW.isoformat(),
        "provider": provider,
        "string1_hourly": {f"{TODAY}T10:00:00": 1000.0},
        "string1_daily": {TODAY: 2.0, TOMORROW: 3.0},
        "string1_today_kwh": 2.0,
        "string1_tomorrow_kwh": 3.0,
        "string2_hourly": {},
        "string2_daily": {},
        "string2_today_kwh": 0.0,
        "string2_tomorrow_kwh": 0.0,
        "total_hourly": {f"{TODAY}T10:00:00": 1000.0},
        "total_daily": {TODAY: 2.0, TOMORROW: 3.0},
        "total_today_kwh": 2.0,
        "total_tomorrow_kwh": 3.0,
    }


def validate(candidate: dict, **overrides):
    kwargs = {
        "provider": (
            candidate.get("provider", "forecast_solar")
            if isinstance(candidate, dict)
            else "forecast_solar"
        ),
        "string1_enabled": True,
        "string2_enabled": False,
        "string1_kwp": 5.0,
        "string2_kwp": 0.0,
        "now": NOW,
    }
    kwargs.update(overrides)
    return validate_forecast_candidate(candidate, **kwargs)


def test_valid_forecast_candidate_returns_independent_complete_snapshot():
    candidate = valid_candidate()

    snapshot = validate(candidate)
    candidate["total_daily"][TODAY] = 99.0

    assert snapshot["total_daily"] == {TODAY: 2.0, TOMORROW: 3.0}
    assert snapshot["response_time"] == NOW.isoformat()


@pytest.mark.parametrize(
    ("mutation", "reason"),
    [
        (lambda value: None, "mapping"),
        (lambda value: {}, "empty"),
        (lambda value: {**value, "response_time": "bad"}, "response_time"),
        (lambda value: {**value, "error": "provider failed"}, "error"),
        (
            lambda value: {
                **value,
                "total_daily": {TODAY: 2.0},
            },
            "tomorrow",
        ),
        (
            lambda value: {
                **value,
                "string1_daily": {TODAY: 2.0},
            },
            "enabled string",
        ),
        (
            lambda value: {
                **value,
                "string1_daily": {TODAY: float("nan"), TOMORROW: 3.0},
            },
            "finite",
        ),
        (
            lambda value: {
                **value,
                "total_daily": {TODAY: float("inf"), TOMORROW: 3.0},
            },
            "finite",
        ),
        (
            lambda value: {
                **value,
                "total_daily": {TODAY: -0.1, TOMORROW: 3.0},
            },
            "non-negative",
        ),
        (
            lambda value: {
                **value,
                "total_daily": {"2026-13-99": 2.0, TOMORROW: 3.0},
            },
            "date",
        ),
        (
            lambda value: {
                **value,
                "total_hourly": {"not-an-hour": 1000.0},
            },
            "hour",
        ),
    ],
)
def test_invalid_forecast_candidate_is_rejected(mutation, reason):
    candidate = mutation(valid_candidate())

    with pytest.raises(CandidateValidationError, match=reason):
        validate(candidate)


def test_recent_candidate_without_tomorrow_is_rejected():
    candidate = valid_candidate()
    candidate["response_time"] = NOW.isoformat()
    candidate["total_daily"] = {TODAY: 2.0}

    with pytest.raises(CandidateValidationError, match="tomorrow"):
        validate(candidate)


def test_forecast_requires_every_enabled_string_to_cover_today_and_tomorrow():
    candidate = valid_candidate()
    candidate["string2_daily"] = {TODAY: 1.0}

    with pytest.raises(CandidateValidationError, match="enabled string2"):
        validate(candidate, string2_enabled=True, string2_kwp=2.0)


def test_solcast_requires_aggregate_and_derived_string_ratios():
    candidate = valid_candidate("solcast")
    candidate["string1_daily"] = {TODAY: 1.5, TOMORROW: 2.25}
    candidate["string2_daily"] = {TODAY: 0.5, TOMORROW: 0.75}

    snapshot = validate(
        candidate,
        provider="solcast",
        string2_enabled=True,
        string1_kwp=3.0,
        string2_kwp=1.0,
    )

    assert snapshot["total_daily"] == {TODAY: 2.0, TOMORROW: 3.0}


def test_solcast_rejects_incorrect_derived_string_ratio():
    candidate = valid_candidate("solcast")
    candidate["string1_daily"] = {TODAY: 1.0, TOMORROW: 2.25}
    candidate["string2_daily"] = {TODAY: 1.0, TOMORROW: 0.75}

    with pytest.raises(CandidateValidationError, match="ratio"):
        validate(
            candidate,
            provider="solcast",
            string2_enabled=True,
            string1_kwp=3.0,
            string2_kwp=1.0,
        )


class Coordinator:
    def __init__(self) -> None:
        self.forced_box_id = "cache-box"
        self.solar_forecast_data = {"old": True}

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class Entry:
    entry_id = "entry-cache"
    options = {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5.0,
        "solar_forecast_string2_enabled": False,
        "solar_forecast_string2_kwp": 0.0,
    }


class MemoryStore:
    bucket = {"old": "envelope"}
    save_started: asyncio.Event | None = None
    save_release: asyncio.Event | None = None
    failure: BaseException | None = None

    def __init__(self, _hass, version, key, **_kwargs):
        self.version = version
        self.key = key

    async def async_load(self):
        return copy.deepcopy(self.bucket.get(self.key))

    async def async_save(self, data):
        if self.save_started is not None:
            self.save_started.set()
        if self.save_release is not None:
            await self.save_release.wait()
        if self.failure is not None:
            raise self.failure
        self.bucket[self.key] = copy.deepcopy(data)


def make_commit_sensor(monkeypatch) -> OigCloudSolarForecastSensor:
    from custom_components.oig_cloud.config import solar_key_store

    MemoryStore.bucket = {"old": "envelope"}
    MemoryStore.save_started = None
    MemoryStore.save_release = None
    MemoryStore.failure = None
    monkeypatch.setattr(sensor_module, "Store", MemoryStore)
    monkeypatch.setattr(solar_key_store, "Store", MemoryStore)
    sensor = OigCloudSolarForecastSensor(Coordinator(), "solar_forecast", Entry(), {})
    sensor.hass = SimpleNamespace(data={})
    sensor._last_forecast_data = {"old": True}
    sensor._last_api_call = 77.0
    sensor.writes = []
    sensor.async_write_ha_state = lambda: sensor.writes.append("state")

    async def broadcast():
        sensor.writes.append("broadcast")

    sensor._broadcast_forecast_data = broadcast
    return sensor


def assert_old_observable_state(sensor) -> None:
    assert sensor._last_forecast_data == {"old": True}
    assert sensor._last_api_call == 77.0
    assert sensor.coordinator.solar_forecast_data == {"old": True}
    assert sensor.writes == []


async def contextual_candidate(sensor, data, *, request_id, sequence=1):
    context = await sensor._async_capture_candidate_context(
        request_id=request_id,
        occurrence_id=sensor._current_occurrence_id,
        occurrence_generation=sensor._occurrence_generation,
        lifecycle_generation=sensor._lifecycle_generation,
        request_sequence=sequence,
    )
    return SolarFetchResult.accept(data).with_context(context).candidate


@pytest.mark.asyncio
async def test_storage_failure_keeps_every_observable_state_unchanged(monkeypatch):
    sensor = make_commit_sensor(monkeypatch)
    MemoryStore.failure = OSError("disk-secret")

    candidate = await contextual_candidate(
        sensor, valid_candidate(), request_id="manual-1"
    )
    committed = await sensor.async_commit_candidate(candidate)

    assert committed is False
    assert_old_observable_state(sensor)


@pytest.mark.asyncio
@pytest.mark.parametrize("invalidate", ["generation", "removed"])
async def test_lifecycle_change_between_save_and_publish_keeps_old_observable_state(
    monkeypatch, invalidate
):
    sensor = make_commit_sensor(monkeypatch)
    MemoryStore.save_started = asyncio.Event()
    MemoryStore.save_release = asyncio.Event()
    candidate = await contextual_candidate(
        sensor, valid_candidate(), request_id="scheduled-1"
    )
    task = asyncio.create_task(sensor.async_commit_candidate(candidate))
    await MemoryStore.save_started.wait()
    if invalidate == "generation":
        sensor._lifecycle_generation += 1
    else:
        sensor._removed = True
    MemoryStore.save_release.set()

    assert await task is False
    assert_old_observable_state(sensor)


@pytest.mark.asyncio
async def test_accepted_candidate_persists_then_publishes_once(monkeypatch):
    sensor = make_commit_sensor(monkeypatch)

    candidate = await contextual_candidate(
        sensor, valid_candidate(), request_id="scheduled-2"
    )
    committed = await sensor.async_commit_candidate(candidate)

    assert committed is True
    assert sensor._last_forecast_data["total_daily"] == {TODAY: 2.0, TOMORROW: 3.0}
    assert sensor.coordinator.solar_forecast_data is sensor._last_forecast_data
    assert sensor.writes == ["state", "broadcast"]
    assert (
        MemoryStore.bucket[sensor._storage_key]["forecast_data"]["response_time"]
        == NOW.isoformat()
    )


@pytest.mark.asyncio
async def test_duplicate_occurrence_commits_and_broadcasts_once(monkeypatch):
    sensor = make_commit_sensor(monkeypatch)

    candidate = await contextual_candidate(
        sensor, valid_candidate(), request_id="scheduled-duplicate"
    )
    first = await sensor.async_commit_candidate(candidate)
    second = await sensor.async_commit_candidate(candidate)

    assert first is True
    assert second is False
    assert sensor.writes == ["state", "broadcast"]


@pytest.mark.asyncio
async def test_caller_cancellation_waits_for_durable_save_reconciliation(monkeypatch):
    sensor = make_commit_sensor(monkeypatch)
    MemoryStore.save_started = asyncio.Event()
    MemoryStore.save_release = asyncio.Event()
    candidate = await contextual_candidate(
        sensor, valid_candidate(), request_id="scheduled-cancel"
    )
    task = asyncio.create_task(sensor.async_commit_candidate(candidate))
    await MemoryStore.save_started.wait()
    task.cancel()
    await asyncio.sleep(0)
    assert task.done() is False

    MemoryStore.save_release.set()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert (
        MemoryStore.bucket[sensor._storage_key]["forecast_data"]["response_time"]
        == NOW.isoformat()
    )
    assert sensor.writes == ["state", "broadcast"]
    assert not sensor._durable_write_tasks


@pytest.mark.asyncio
async def test_store_internal_cancellation_leaves_old_envelope(monkeypatch):
    sensor = make_commit_sensor(monkeypatch)
    before = copy.deepcopy(MemoryStore.bucket)
    MemoryStore.failure = asyncio.CancelledError()

    with pytest.raises(asyncio.CancelledError):
        candidate = await contextual_candidate(
            sensor, valid_candidate(), request_id="scheduled-store-cancel"
        )
        await sensor.async_commit_candidate(candidate)

    assert MemoryStore.bucket == before
    assert_old_observable_state(sensor)


@pytest.mark.asyncio
async def test_manual_refresh_is_true_only_after_candidate_commit(monkeypatch):
    sensor = make_commit_sensor(monkeypatch)

    async def fetch(**_request_context):
        return SolarFetchResult.accept(valid_candidate())

    sensor.async_fetch_forecast_data = fetch

    assert await sensor.async_manual_update() is True
    assert sensor._last_forecast_data["response_time"] == NOW.isoformat()
    assert sensor.writes == ["state", "broadcast"]


@pytest.mark.asyncio
async def test_manual_refresh_rejects_invalid_accepted_candidate(monkeypatch):
    sensor = make_commit_sensor(monkeypatch)
    invalid = valid_candidate()
    invalid["total_daily"] = {TODAY: 2.0}

    async def fetch(**_request_context):
        return SolarFetchResult.accept(invalid)

    sensor.async_fetch_forecast_data = fetch

    assert await sensor.async_manual_update() is False
    assert_old_observable_state(sensor)
