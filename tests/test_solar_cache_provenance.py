from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities import solar_forecast_sensor as sensor_module
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)
from custom_components.oig_cloud.forecast.cache_contract import (
    SCHEMA_VERSION,
    build_cache_envelope,
    build_cache_provenance,
    build_occurrence_id,
    build_retry_state,
    cache_provenance_matches,
    validate_retry_state,
)


NOW = datetime(2026, 8, 11, 10, 42, tzinfo=timezone(timedelta(hours=2)))


def options(provider="forecast_solar", **overrides):
    value = {
        "solar_forecast_provider": provider,
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_latitude": 50.1,
        "solar_forecast_longitude": 14.2,
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5.5,
        "solar_forecast_string1_declination": 35,
        "solar_forecast_string1_azimuth": 138,
        "solar_forecast_string2_enabled": False,
        "solar_forecast_string2_kwp": 2.0,
        "solar_forecast_string2_declination": 25,
        "solar_forecast_string2_azimuth": 270,
    }
    value.update(overrides)
    return value


def candidate(response_time=None):
    today = NOW.date().isoformat()
    tomorrow = (NOW.date() + timedelta(days=1)).isoformat()
    return {
        "response_time": (response_time or NOW).isoformat(),
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


@pytest.mark.parametrize(
    ("change", "value"),
    [
        ("solar_forecast_provider", "solcast"),
        ("solar_forecast_mode", "daily"),
        ("solar_forecast_string1_enabled", False),
        ("solar_forecast_string2_enabled", True),
        ("solar_forecast_string1_kwp", 6.0),
        ("solar_forecast_latitude", 49.0),
        ("solar_forecast_longitude", 15.0),
        ("solar_forecast_string1_declination", 36),
        ("solar_forecast_string1_azimuth", 139),
    ],
)
def test_forecast_cache_fingerprint_changes_for_runtime_input(change, value):
    base = build_cache_provenance("entry-a", options(), 4)
    changed_options = options(**{change: value})

    changed = build_cache_provenance("entry-a", changed_options, 4)

    assert changed != base


def test_cache_provenance_changes_for_entry_and_credential_revision():
    base = build_cache_provenance("entry-a", options(), 4)

    assert build_cache_provenance("entry-b", options(), 4) != base
    assert build_cache_provenance("entry-a", options(), 5) != base


def test_solcast_fingerprint_excludes_cloud_owned_geometry_but_keeps_local_kwp():
    base_options = options("solcast")
    base = build_cache_provenance("entry-a", base_options, 4)
    changed_geometry = options(
        "solcast",
        solar_forecast_latitude=1.0,
        solar_forecast_longitude=2.0,
        solar_forecast_string1_declination=1,
        solar_forecast_string1_azimuth=1,
    )

    assert build_cache_provenance("entry-a", changed_geometry, 4) == base
    assert (
        build_cache_provenance(
            "entry-a", options("solcast", solar_forecast_string1_kwp=6.0), 4
        )
        != base
    )


def test_schema2_envelope_contains_only_non_secret_provenance():
    provenance = build_cache_provenance("entry-a", options(), 4)

    envelope = build_cache_envelope(
        provenance=provenance,
        forecast_data=candidate(),
        last_accepted_time=NOW,
        saved_at=NOW,
    )

    assert envelope["schema"] == SCHEMA_VERSION == 2
    assert envelope["entry_id"] == "entry-a"
    assert envelope["provider"] == "forecast_solar"
    assert envelope["credential_revision"] == 4
    assert envelope["config_fingerprint"] == provenance["config_fingerprint"]
    assert "api_key" not in repr(envelope)
    assert "site_id" not in repr(envelope)


def test_provenance_match_requires_every_identity_field():
    provenance = build_cache_provenance("entry-a", options(), 4)
    envelope = build_cache_envelope(
        provenance=provenance,
        forecast_data=candidate(),
        last_accepted_time=NOW,
        saved_at=NOW,
    )

    assert cache_provenance_matches(envelope, provenance) is True
    for key in ("entry_id", "provider", "config_fingerprint", "credential_revision"):
        changed = copy.deepcopy(envelope)
        changed[key] = "different" if key != "credential_revision" else 99
        assert cache_provenance_matches(changed, provenance) is False


def test_occurrence_id_is_restart_stable_and_includes_local_offset():
    first = build_occurrence_id("entry-a", "daily_optimized", NOW.replace(hour=12, minute=0))
    after_restart = build_occurrence_id(
        "entry-a", "daily_optimized", NOW.replace(hour=12, minute=0)
    )
    winter_offset = NOW.replace(hour=12, minute=0, tzinfo=timezone(timedelta(hours=1)))

    assert first == after_restart
    assert build_occurrence_id("entry-a", "daily", NOW.replace(hour=12, minute=0)) != first
    assert build_occurrence_id("entry-a", "daily_optimized", winter_offset) != first


def test_retry_state_round_trip_is_bound_to_occurrence_and_provenance():
    provenance = build_cache_provenance("entry-a", options(), 4)
    scheduled = NOW.replace(hour=12, minute=0)
    occurrence_id = build_occurrence_id("entry-a", "daily_optimized", scheduled)
    state = build_retry_state(
        occurrence_id=occurrence_id,
        scheduled_local=scheduled,
        completed_attempt_index=0,
        next_at=scheduled + timedelta(minutes=15),
        code="rate_limited",
        provenance=provenance,
    )

    restored = validate_retry_state(
        state,
        provenance=provenance,
        entry_id="entry-a",
        mode="daily_optimized",
        now=scheduled + timedelta(minutes=5),
    )

    assert restored == state


@pytest.mark.parametrize(
    "mutation",
    [
        lambda state: {**state, "code": "auth"},
        lambda state: {**state, "completed_attempt_index": 2},
        lambda state: {**state, "next_at": (NOW + timedelta(minutes=16)).isoformat()},
        lambda state: {**state, "occurrence_id": "wrong"},
        lambda state: {**state, "credential_revision": 999},
    ],
)
def test_invalid_terminal_exhausted_or_mismatched_retry_state_is_cleared(mutation):
    provenance = build_cache_provenance("entry-a", options(), 4)
    scheduled = NOW
    state = build_retry_state(
        occurrence_id=build_occurrence_id("entry-a", "daily_optimized", scheduled),
        scheduled_local=scheduled,
        completed_attempt_index=0,
        next_at=scheduled + timedelta(minutes=15),
        code="timeout",
        provenance=provenance,
    )

    assert (
        validate_retry_state(
            mutation(state),
            provenance=provenance,
            entry_id="entry-a",
            mode="daily_optimized",
            now=scheduled + timedelta(minutes=5),
        )
        is None
    )


def test_overdue_retry_inside_original_horizon_restores_once_but_late_is_cleared():
    provenance = build_cache_provenance("entry-a", options(), 4)
    scheduled = NOW
    state = build_retry_state(
        occurrence_id=build_occurrence_id("entry-a", "daily_optimized", scheduled),
        scheduled_local=scheduled,
        completed_attempt_index=1,
        next_at=scheduled + timedelta(minutes=45),
        code="connection",
        provenance=provenance,
    )

    assert validate_retry_state(
        state,
        provenance=provenance,
        entry_id="entry-a",
        mode="daily_optimized",
        now=scheduled + timedelta(minutes=44),
    ) == state
    assert validate_retry_state(
        state,
        provenance=provenance,
        entry_id="entry-a",
        mode="daily_optimized",
        now=scheduled + timedelta(minutes=46),
    ) is None


class Coordinator:
    def __init__(self):
        self.forced_box_id = "123456"

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class Entry:
    entry_id = "entry-a"

    def __init__(self, values):
        self.options = values


class Store:
    bucket = {}
    saves = []

    def __init__(self, _hass, version, key, **_kwargs):
        self.version = version
        self.key = key

    async def async_load(self):
        return copy.deepcopy(self.bucket.get(self.key))

    async def async_save(self, data):
        self.saves.append(self.key)
        self.bucket[self.key] = copy.deepcopy(data)


def make_sensor(monkeypatch, stored, *, values=None):
    from custom_components.oig_cloud.config import solar_key_store

    Store.bucket = copy.deepcopy(stored)
    Store.saves = []
    monkeypatch.setattr(sensor_module, "Store", Store)
    monkeypatch.setattr(solar_key_store, "Store", Store)
    sensor = OigCloudSolarForecastSensor(
        Coordinator(), "solar_forecast", Entry(values or options()), {}
    )
    sensor.hass = SimpleNamespace(data={})
    return sensor


@pytest.mark.asyncio
async def test_matching_recent_schema2_cache_is_current_and_usable(monkeypatch):
    provenance = build_cache_provenance("entry-a", options(), 0)
    envelope = build_cache_envelope(
        provenance=provenance,
        forecast_data=candidate(),
        last_accepted_time=NOW,
        saved_at=NOW,
    )
    sensor = make_sensor(monkeypatch, {"oig_solar_forecast_entry-a": envelope})
    monkeypatch.setattr(sensor_module.dt_util, "now", lambda: NOW)

    await sensor._load_persistent_data()

    assert sensor._cache_usable is True
    assert sensor._forced_stale_reason is None
    assert sensor._last_forecast_data["response_time"] == NOW.isoformat()
    assert sensor._should_fetch_data() is False


@pytest.mark.asyncio
async def test_provenance_mismatch_retains_recent_cache_as_forced_stale(monkeypatch):
    old = build_cache_provenance("entry-a", options(), 0)
    envelope = build_cache_envelope(
        provenance=old,
        forecast_data=candidate(),
        last_accepted_time=NOW,
        saved_at=NOW,
    )
    changed = options(solar_forecast_string1_azimuth=139)
    sensor = make_sensor(
        monkeypatch,
        {"oig_solar_forecast_entry-a": envelope},
        values=changed,
    )
    monkeypatch.setattr(sensor_module.dt_util, "now", lambda: NOW)

    await sensor._load_persistent_data()

    assert sensor._cache_usable is False
    assert sensor._forced_stale_reason == "provenance_mismatch"
    assert sensor._last_forecast_data["response_time"] == NOW.isoformat()
    assert sensor._build_main_attrs()["forecast_stale"] is True
    assert sensor._build_main_attrs()["stale_reason"] == "provenance_mismatch"
    assert sensor._should_fetch_data() is True


@pytest.mark.asyncio
async def test_legacy_box_cache_is_read_once_as_stale_without_rewrite(monkeypatch):
    legacy = {
        "last_api_call": NOW.timestamp(),
        "forecast_data": candidate(),
        "saved_at": NOW.isoformat(),
    }
    sensor = make_sensor(monkeypatch, {"oig_solar_forecast_123456": legacy})
    monkeypatch.setattr(sensor_module.dt_util, "now", lambda: NOW)

    await sensor._load_persistent_data()

    assert sensor._cache_usable is False
    assert sensor._forced_stale_reason == "missing_provenance"
    assert Store.saves == []
    assert Store.bucket["oig_solar_forecast_123456"] == legacy
    assert "oig_solar_forecast_entry-a" not in Store.bucket


@pytest.mark.asyncio
async def test_recent_matching_cache_missing_tomorrow_is_not_usable(monkeypatch):
    broken = candidate()
    broken["total_daily"].pop((NOW.date() + timedelta(days=1)).isoformat())
    provenance = build_cache_provenance("entry-a", options(), 0)
    envelope = build_cache_envelope(
        provenance=provenance,
        forecast_data=broken,
        last_accepted_time=NOW,
        saved_at=NOW,
    )
    sensor = make_sensor(monkeypatch, {"oig_solar_forecast_entry-a": envelope})
    monkeypatch.setattr(sensor_module.dt_util, "now", lambda: NOW)

    await sensor._load_persistent_data()

    assert sensor._cache_usable is False
    assert sensor._forced_stale_reason == "cache_invalid"


@pytest.mark.asyncio
async def test_matching_retry_recovery_precedes_expired_cache_usability(monkeypatch):
    provenance = build_cache_provenance("entry-a", options(), 0)
    scheduled = NOW.replace(hour=12, minute=0)
    retry = build_retry_state(
        occurrence_id=build_occurrence_id("entry-a", "daily_optimized", scheduled),
        scheduled_local=scheduled,
        completed_attempt_index=0,
        next_at=scheduled + timedelta(minutes=15),
        code="timeout",
        provenance=provenance,
    )
    envelope = build_cache_envelope(
        provenance=provenance,
        forecast_data=candidate(response_time=NOW - timedelta(days=2)),
        last_accepted_time=NOW - timedelta(days=2),
        saved_at=NOW - timedelta(days=2),
        retry_state=retry,
    )
    sensor = make_sensor(monkeypatch, {"oig_solar_forecast_entry-a": envelope})
    monkeypatch.setattr(sensor_module.dt_util, "now", lambda: NOW)

    await sensor._load_persistent_data()

    assert sensor._retry_state == retry
    assert sensor._cache_usable is False
    assert sensor._forced_stale_reason == "cache_expired"
