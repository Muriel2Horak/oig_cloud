from __future__ import annotations

import asyncio
import copy
from dataclasses import FrozenInstanceError
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.config import solar_key_store
from custom_components.oig_cloud.entities import solar_forecast_sensor as module
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)
from custom_components.oig_cloud.forecast.refresh_result import SolarFetchResult


NOW = datetime(2026, 8, 11, 12, 0, tzinfo=timezone.utc)


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
        "solar_forecast_string2_declination": 35,
        "solar_forecast_string2_azimuth": 180,
    }
    values.update(overrides)
    return values


def candidate(marker: float, *, provider: str = "forecast_solar") -> dict:
    today = NOW.date().isoformat()
    tomorrow = (NOW.date() + timedelta(days=1)).isoformat()
    return {
        "response_time": NOW.isoformat(),
        "provider": provider,
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
    forced_box_id = "ordering-box"
    solar_forecast_data = None

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class Entry:
    entry_id = "entry-ordering"

    def __init__(self, values=None):
        self.options = values or options()


class MemoryStore:
    bucket = {}
    saves = []

    def __init__(self, _hass, version, key, **_kwargs):
        self.version = version
        self.key = key

    async def async_load(self):
        return copy.deepcopy(self.bucket.get(self.key))

    async def async_save(self, value):
        snapshot = copy.deepcopy(value)
        self.saves.append(snapshot)
        self.bucket[self.key] = snapshot

    async def async_remove(self):
        self.bucket.pop(self.key, None)


def make_sensor(monkeypatch, values=None):
    MemoryStore.bucket = {}
    MemoryStore.saves = []
    monkeypatch.setattr(module, "Store", MemoryStore)
    monkeypatch.setattr(solar_key_store, "Store", MemoryStore)
    sensor = OigCloudSolarForecastSensor(
        Coordinator(), "solar_forecast", Entry(values), {}
    )
    sensor.hass = SimpleNamespace(data={})
    sensor._min_api_interval = 0
    sensor.async_write_ha_state = lambda: None

    async def broadcast():
        return None

    sensor._broadcast_forecast_data = broadcast
    sensor._current_occurrence_id = "scheduled:current"
    sensor._occurrence_generation = 7
    monkeypatch.setattr(module.dt_util, "now", lambda: NOW)
    return sensor


async def classified_candidate(monkeypatch, sensor, value: dict):
    async def fetch_forecast_solar(**_kwargs):
        return SolarFetchResult.accept(value)

    async def fetch_solcast(*_args, **_kwargs):
        return SolarFetchResult.accept(value)

    monkeypatch.setattr(
        sensor, "_fetch_forecast_solar_strings", fetch_forecast_solar
    )
    monkeypatch.setattr(sensor, "_fetch_solcast_data", fetch_solcast)
    return await sensor._async_execute_provider_attempt(
        occurrence_id="scheduled:current",
        occurrence_generation=7,
    )


@pytest.mark.asyncio
async def test_accepted_candidate_carries_immutable_pre_io_context(monkeypatch):
    sensor = make_sensor(monkeypatch)
    entered = asyncio.Event()
    release = asyncio.Event()

    async def fetch(**_kwargs):
        entered.set()
        await release.wait()
        return SolarFetchResult.accept(candidate(1.0))

    monkeypatch.setattr(sensor, "_fetch_forecast_solar_strings", fetch)
    task = asyncio.create_task(
        sensor._async_execute_provider_attempt(
            occurrence_id="scheduled:current",
            occurrence_generation=7,
        )
    )
    await entered.wait()
    sensor._config_entry.options["solar_forecast_string1_azimuth"] = 180
    release.set()
    result = await task

    context = result.candidate.context
    assert context.entry_id == "entry-ordering"
    assert context.provider == "forecast_solar"
    assert context.credential_revision == 0
    assert context.request_id == "scheduled:current"
    assert context.occurrence_generation == 7
    assert context.lifecycle_generation == 0
    assert isinstance(context.config_fingerprint, str)
    assert len(context.config_fingerprint) == 64
    with pytest.raises(FrozenInstanceError):
        context.provider = "solcast"


@pytest.mark.asyncio
async def test_newer_candidate_commits_before_older_candidate_without_regression(
    monkeypatch,
):
    sensor = make_sensor(monkeypatch)
    older = await classified_candidate(monkeypatch, sensor, candidate(1.0))
    newer = await classified_candidate(monkeypatch, sensor, candidate(9.0))

    assert (
        newer.candidate.context.request_sequence
        > older.candidate.context.request_sequence
    )
    assert await sensor.async_commit_candidate(newer.candidate) is True
    assert await sensor.async_commit_candidate(older.candidate) is False

    assert [item["forecast_data"]["total_today_kwh"] for item in MemoryStore.saves] == [
        9.0
    ]
    assert sensor._last_forecast_data["total_today_kwh"] == 9.0
    assert sensor.coordinator.solar_forecast_data["total_today_kwh"] == 9.0


@pytest.mark.asyncio
async def test_current_candidate_context_commits_as_negative_control(monkeypatch):
    sensor = make_sensor(monkeypatch)
    result = await classified_candidate(monkeypatch, sensor, candidate(4.0))

    assert await sensor.async_commit_candidate(result.candidate) is True
    persisted = MemoryStore.bucket[sensor._storage_key]
    assert persisted["forecast_data"]["total_today_kwh"] == 4.0
    assert persisted["provider"] == "forecast_solar"
    assert persisted["credential_revision"] == 0


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "invalidate",
    [
        "provider",
        "gps",
        "azimuth",
        "kwp",
        "mode",
        "enabled_strings",
        "credential_revision",
        "lifecycle",
        "occurrence",
    ],
)
async def test_candidate_captured_before_io_cannot_commit_after_context_change(
    monkeypatch, invalidate
):
    sensor = make_sensor(monkeypatch)
    result = await classified_candidate(monkeypatch, sensor, candidate(3.0))

    if invalidate == "provider":
        sensor._config_entry.options["solar_forecast_provider"] = "solcast"
    elif invalidate == "gps":
        sensor._config_entry.options["solar_forecast_latitude"] = 49.9
    elif invalidate == "azimuth":
        sensor._config_entry.options["solar_forecast_string1_azimuth"] = 90
    elif invalidate == "kwp":
        sensor._config_entry.options["solar_forecast_string1_kwp"] = 6.0
    elif invalidate == "mode":
        sensor._config_entry.options["solar_forecast_mode"] = "hourly"
    elif invalidate == "enabled_strings":
        sensor._config_entry.options["solar_forecast_string2_enabled"] = True
    elif invalidate == "credential_revision":
        await solar_key_store.SolarKeyStore(
            sensor.hass, sensor._config_entry.entry_id
        ).async_activate(
            "forecast_solar",
            {"solar_forecast_api_key": "replacement-secret"},
            verified_at=None,
        )
    elif invalidate == "lifecycle":
        sensor._lifecycle_generation += 1
    else:
        sensor._current_occurrence_id = "scheduled:new"
        sensor._occurrence_generation += 1

    assert await sensor.async_commit_candidate(result.candidate) is False
    assert all("forecast_data" not in saved for saved in MemoryStore.saves)
    assert sensor._last_forecast_data is None
    assert sensor.coordinator.solar_forecast_data is None


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", ["forecast_solar", "solcast"])
async def test_real_provider_path_uses_full_standard_wizard_context(
    monkeypatch, provider
):
    values = options(solar_forecast_provider=provider)
    if provider == "solcast":
        values.update(
            {
                "solcast_api_key": "private-solcast-key",
                "solcast_site_id": "private-site-id",
            }
        )
    sensor = make_sensor(monkeypatch, values)
    result = await classified_candidate(
        monkeypatch,
        sensor,
        candidate(5.0, provider=provider),
    )

    assert result.accepted is True
    assert result.candidate.context.provider == provider
    assert "private-solcast-key" not in repr(result.candidate.context)
    assert "private-site-id" not in repr(result.candidate.context)
    assert await sensor.async_commit_candidate(result.candidate) is True


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", ["forecast_solar", "solcast"])
async def test_disabled_string_defaults_remain_provenance_relevant(
    monkeypatch, provider
):
    values = options(solar_forecast_provider=provider)
    if provider == "solcast":
        values.update(
            {
                "solcast_api_key": "private-solcast-key",
                "solcast_site_id": "private-site-id",
            }
        )
    sensor = make_sensor(monkeypatch, values)
    result = await classified_candidate(
        monkeypatch,
        sensor,
        candidate(6.0, provider=provider),
    )

    sensor._config_entry.options["solar_forecast_string2_kwp"] = 3.0

    assert await sensor.async_commit_candidate(result.candidate) is False
    assert MemoryStore.saves == []
