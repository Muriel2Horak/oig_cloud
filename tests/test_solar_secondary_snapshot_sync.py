from __future__ import annotations

import asyncio
import copy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any, Mapping

import pytest

from custom_components.oig_cloud.config import solar_key_store
from custom_components.oig_cloud.entities import solar_forecast_sensor as module
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)
from custom_components.oig_cloud.forecast.refresh_result import SolarCandidate


NOW = datetime(2026, 8, 12, 12, 0, 5, tzinfo=timezone.utc)
TODAY = NOW.date().isoformat()
TOMORROW = (NOW.date() + timedelta(days=1)).isoformat()


def options() -> dict[str, Any]:
    return {
        "enable_solar_forecast": True,
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_latitude": 50.1,
        "solar_forecast_longitude": 14.2,
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5.0,
        "solar_forecast_string1_declination": 35,
        "solar_forecast_string1_azimuth": 138,
        "solar_forecast_string2_enabled": True,
        "solar_forecast_string2_kwp": 2.0,
        "solar_forecast_string2_declination": 35,
        "solar_forecast_string2_azimuth": 180,
    }


def forecast_snapshot(
    *,
    response_time: datetime,
    string1_today: float,
    string2_today: float,
) -> dict[str, Any]:
    string1_tomorrow = round(string1_today + 1.25, 2)
    string2_tomorrow = round(string2_today + 0.75, 2)
    total_today = round(string1_today + string2_today, 2)
    total_tomorrow = round(string1_tomorrow + string2_tomorrow, 2)
    today_hour = f"{TODAY}T13:00:00+00:00"
    tomorrow_hour = f"{TOMORROW}T09:00:00+00:00"
    string1_hourly = {
        today_hour: string1_today * 100.0,
        tomorrow_hour: string1_tomorrow * 100.0,
    }
    string2_hourly = {
        today_hour: string2_today * 100.0,
        tomorrow_hour: string2_tomorrow * 100.0,
    }
    return {
        "response_time": response_time.isoformat(),
        "provider": "forecast_solar",
        "string1_hourly": string1_hourly,
        "string1_daily": {TODAY: string1_today, TOMORROW: string1_tomorrow},
        "string1_today_kwh": string1_today,
        "string1_tomorrow_kwh": string1_tomorrow,
        "string2_hourly": string2_hourly,
        "string2_daily": {TODAY: string2_today, TOMORROW: string2_tomorrow},
        "string2_today_kwh": string2_today,
        "string2_tomorrow_kwh": string2_tomorrow,
        "total_hourly": {
            hour: string1_hourly[hour] + string2_hourly[hour]
            for hour in string1_hourly
        },
        "total_daily": {TODAY: total_today, TOMORROW: total_tomorrow},
        "total_today_kwh": total_today,
        "total_tomorrow_kwh": total_tomorrow,
    }


class Coordinator:
    forced_box_id = "2206237016"

    def __init__(self) -> None:
        self.solar_forecast_data: dict[str, Any] | None = None

    def async_add_listener(self, *_args: Any, **_kwargs: Any) -> Any:
        return lambda: None

    async def async_request_refresh(self) -> None:
        return None


class Entry:
    entry_id = "entry-sync"

    def __init__(self) -> None:
        self.options = options()


class MemoryStore:
    bucket: dict[str, Any] = {}
    saves: list[Mapping[str, Any]] = []

    def __init__(self, _hass: Any, version: int, key: str, **_kwargs: Any) -> None:
        self.version = version
        self.key = key

    async def async_load(self) -> Any:
        return copy.deepcopy(self.bucket.get(self.key))

    async def async_save(self, value: Mapping[str, Any]) -> None:
        snapshot = copy.deepcopy(dict(value))
        self.saves.append(snapshot)
        self.bucket[self.key] = snapshot

    async def async_remove(self) -> None:
        self.bucket.pop(self.key, None)


class FakeStates:
    def __init__(self, entities: Mapping[str, OigCloudSolarForecastSensor]) -> None:
        self._entities = entities

    def get(self, entity_id: str) -> object | None:
        return object() if entity_id in self._entities else None


class FakeServices:
    def __init__(self, entities: Mapping[str, OigCloudSolarForecastSensor]) -> None:
        self.entities = entities
        self.calls: list[dict[str, Any]] = []

    async def async_call(
        self, domain: str, service: str, data: Mapping[str, Any]
    ) -> None:
        self.calls.append(
            {"domain": domain, "service": service, "data": dict(data)}
        )
        await self.entities[str(data["entity_id"])].async_update()


class FakeHass:
    def __init__(self, entities: Mapping[str, OigCloudSolarForecastSensor]) -> None:
        self.data: dict[str, Any] = {}
        self.states = FakeStates(entities)
        self.services = FakeServices(entities)
        self.tasks: list[asyncio.Task[Any]] = []

    def async_create_task(self, coroutine: Any) -> asyncio.Task[Any]:
        task = asyncio.create_task(coroutine)
        self.tasks.append(task)
        return task

    async def drain_tasks(self) -> None:
        pending = [task for task in self.tasks if not task.done()]
        if pending:
            await asyncio.gather(*pending)


class EntityEntry:
    def __init__(self, entity_id: str, device_id: str) -> None:
        self.entity_id = entity_id
        self.device_id = device_id


def patch_registries(
    monkeypatch: pytest.MonkeyPatch,
    primary: OigCloudSolarForecastSensor,
    secondaries: tuple[OigCloudSolarForecastSensor, OigCloudSolarForecastSensor],
) -> None:
    class EntityRegistry:
        def async_get(self, entity_id: str) -> EntityEntry | None:
            if entity_id == primary.entity_id:
                return EntityEntry(entity_id, "device-sync")
            return None

    entries = [
        EntityEntry(secondaries[0].entity_id, "device-sync"),
        EntityEntry(secondaries[1].entity_id, "device-sync"),
    ]
    monkeypatch.setattr(module.er, "async_get", lambda _hass: EntityRegistry())
    monkeypatch.setattr(
        module.er,
        "async_entries_for_device",
        lambda _registry, _device_id: entries,
    )
    monkeypatch.setattr(module.dr, "async_get", lambda _hass: SimpleNamespace())


def make_sensor(
    coordinator: Coordinator, sensor_type: str
) -> OigCloudSolarForecastSensor:
    sensor = OigCloudSolarForecastSensor(coordinator, sensor_type, Entry(), {})
    sensor._current_occurrence_id = "occurrence-sync"
    sensor._occurrence_generation = 1
    return sensor


def forbid_secondary_ownership(sensor: OigCloudSolarForecastSensor) -> None:
    async def forbidden_async(*_args: Any, **_kwargs: Any) -> Any:
        raise AssertionError(f"{sensor.entity_id} attempted primary-owned work")

    def forbidden_sync(*_args: Any, **_kwargs: Any) -> Any:
        raise AssertionError(f"{sensor.entity_id} attempted primary-owned work")

    sensor.async_fetch_forecast_data = forbidden_async
    sensor._async_execute_provider_attempt = forbidden_async
    sensor._async_save_candidate_snapshot = forbidden_async
    sensor._async_persist_retry_state = forbidden_async
    sensor._broadcast_forecast_data = forbidden_async
    sensor._register_refresh_schedule = forbidden_sync


async def commit_primary_snapshot(
    primary: OigCloudSolarForecastSensor,
    hass: FakeHass,
    snapshot: Mapping[str, Any],
    *,
    request_id: str,
    request_sequence: int,
) -> None:
    context = await primary._async_capture_candidate_context(
        request_id=request_id,
        occurrence_id=primary._current_occurrence_id,
        occurrence_generation=primary._occurrence_generation,
        lifecycle_generation=primary._lifecycle_generation,
        request_sequence=request_sequence,
    )
    assert await primary.async_commit_candidate(SolarCandidate(snapshot, context))
    await hass.drain_tasks()


@pytest.fixture
def sync_entities(
    monkeypatch: pytest.MonkeyPatch,
) -> tuple[
    OigCloudSolarForecastSensor,
    OigCloudSolarForecastSensor,
    OigCloudSolarForecastSensor,
    FakeHass,
]:
    MemoryStore.bucket = {}
    MemoryStore.saves = []
    monkeypatch.setattr(module, "Store", MemoryStore)
    monkeypatch.setattr(solar_key_store, "Store", MemoryStore)
    monkeypatch.setattr(module.dt_util, "now", lambda: NOW)

    class FixedDatetime(datetime):
        @classmethod
        def now(cls, tz: timezone | None = None) -> datetime:
            return NOW.astimezone(tz) if tz else NOW

        @classmethod
        def fromisoformat(cls, date_string: str) -> datetime:
            return datetime.fromisoformat(date_string)

        @classmethod
        def fromtimestamp(cls, timestamp: float, tz: timezone | None = None) -> datetime:
            return datetime.fromtimestamp(timestamp, tz)

    monkeypatch.setattr(module, "datetime", FixedDatetime)

    coordinator = Coordinator()
    primary = make_sensor(coordinator, "solar_forecast")
    string1 = make_sensor(coordinator, "solar_forecast_string1")
    string2 = make_sensor(coordinator, "solar_forecast_string2")
    entities = {
        primary.entity_id: primary,
        string1.entity_id: string1,
        string2.entity_id: string2,
    }
    hass = FakeHass(entities)
    for sensor in entities.values():
        sensor.hass = hass
        sensor.async_write_ha_state = lambda *_args, **_kwargs: None
    patch_registries(monkeypatch, primary, (string1, string2))
    forbid_secondary_ownership(string1)
    forbid_secondary_ownership(string2)
    return primary, string1, string2, hass


@pytest.mark.asyncio
async def test_secondary_sensors_adopt_primary_committed_snapshot_on_broadcast(
    sync_entities: tuple[
        OigCloudSolarForecastSensor,
        OigCloudSolarForecastSensor,
        OigCloudSolarForecastSensor,
        FakeHass,
    ],
) -> None:
    primary, string1, string2, hass = sync_entities
    accepted = forecast_snapshot(
        response_time=NOW,
        string1_today=32.73,
        string2_today=0.82,
    )
    stale = forecast_snapshot(
        response_time=NOW - timedelta(days=2),
        string1_today=1.0,
        string2_today=0.0,
    )
    string1._last_forecast_data = copy.deepcopy(stale)
    string2._last_forecast_data = copy.deepcopy(stale)

    await commit_primary_snapshot(
        primary,
        hass,
        accepted,
        request_id="noon-refresh",
        request_sequence=1,
    )

    assert [call["data"]["entity_id"] for call in hass.services.calls] == [
        string1.entity_id,
        string2.entity_id,
    ]
    assert len(MemoryStore.saves) == 1
    assert string1._last_forecast_data == accepted
    assert string2._last_forecast_data == accepted
    assert string1.state == accepted["string1_daily"][TODAY]
    assert string2.state == accepted["string2_daily"][TODAY]

    string1_attrs = string1.extra_state_attributes
    string2_attrs = string2.extra_state_attributes
    assert string1_attrs["response_time"] == accepted["response_time"]
    assert string2_attrs["response_time"] == accepted["response_time"]
    assert string1_attrs["tomorrow_kwh"] == accepted["string1_daily"][TOMORROW]
    assert string2_attrs["tomorrow_kwh"] == accepted["string2_daily"][TOMORROW]
    assert string1_attrs["daily_kwh"] == accepted["string1_daily"]
    assert string2_attrs["daily_kwh"] == accepted["string2_daily"]
    assert string1_attrs["today_hourly_kw"] == {
        f"{TODAY}T13:00:00+00:00": round(
            accepted["string1_hourly"][f"{TODAY}T13:00:00+00:00"] / 1000,
            2,
        )
    }
    assert string2_attrs["tomorrow_hourly_kw"] == {
        f"{TOMORROW}T09:00:00+00:00": round(
            accepted["string2_hourly"][f"{TOMORROW}T09:00:00+00:00"] / 1000,
            2,
        )
    }


@pytest.mark.asyncio
async def test_secondary_sensors_follow_repeated_primary_commits_without_regression(
    sync_entities: tuple[
        OigCloudSolarForecastSensor,
        OigCloudSolarForecastSensor,
        OigCloudSolarForecastSensor,
        FakeHass,
    ],
) -> None:
    primary, string1, string2, hass = sync_entities
    first = forecast_snapshot(
        response_time=NOW,
        string1_today=20.0,
        string2_today=1.5,
    )
    newest = forecast_snapshot(
        response_time=NOW + timedelta(hours=4),
        string1_today=26.0,
        string2_today=2.25,
    )

    await commit_primary_snapshot(
        primary,
        hass,
        first,
        request_id="first-refresh",
        request_sequence=1,
    )
    await commit_primary_snapshot(
        primary,
        hass,
        newest,
        request_id="second-refresh",
        request_sequence=2,
    )

    assert string1._last_forecast_data == newest
    assert string2._last_forecast_data == newest
    assert string1.state == newest["string1_daily"][TODAY]
    assert string2.state == newest["string2_daily"][TODAY]
    assert [save["forecast_data"]["response_time"] for save in MemoryStore.saves] == [
        first["response_time"],
        newest["response_time"],
    ]

    primary.coordinator.solar_forecast_data = first
    await string1.async_update()
    await string2.async_update()

    assert string1._last_forecast_data == newest
    assert string2._last_forecast_data == newest


@pytest.mark.asyncio
async def test_secondary_update_preserves_valid_snapshot_without_shared_payload(
    sync_entities: tuple[
        OigCloudSolarForecastSensor,
        OigCloudSolarForecastSensor,
        OigCloudSolarForecastSensor,
        FakeHass,
    ],
) -> None:
    _primary, string1, string2, _hass = sync_entities
    validated = forecast_snapshot(
        response_time=NOW,
        string1_today=18.0,
        string2_today=1.0,
    )
    string1._last_forecast_data = copy.deepcopy(validated)
    string2._last_forecast_data = copy.deepcopy(validated)
    delattr(string1.coordinator, "solar_forecast_data")

    await string1.async_update()
    await string2.async_update()

    assert string1._last_forecast_data == validated
    assert string2._last_forecast_data == validated


@pytest.mark.asyncio
async def test_secondary_update_rejects_invalid_shared_payload_without_leakage(
    sync_entities: tuple[
        OigCloudSolarForecastSensor,
        OigCloudSolarForecastSensor,
        OigCloudSolarForecastSensor,
        FakeHass,
    ],
    caplog: pytest.LogCaptureFixture,
) -> None:
    _primary, string1, _string2, _hass = sync_entities
    validated = forecast_snapshot(
        response_time=NOW,
        string1_today=18.0,
        string2_today=1.0,
    )
    sentinel = "RAW-SOLAR-PAYLOAD-SENTINEL"
    string1._last_forecast_data = copy.deepcopy(validated)
    string1.coordinator.solar_forecast_data = {
        "response_time": "not-a-time",
        "provider": "forecast_solar",
        "payload": sentinel,
    }

    with caplog.at_level("DEBUG", logger=module.__name__):
        await string1.async_update()

    assert string1._last_forecast_data == validated
    assert string1.state == validated["string1_daily"][TODAY]
    assert string1.extra_state_attributes["response_time"] == validated["response_time"]
    assert sentinel not in caplog.text
    assert "not-a-time" not in caplog.text
