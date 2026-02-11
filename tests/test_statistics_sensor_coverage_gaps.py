from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from custom_components.oig_cloud.entities.statistics_sensor import (
    _current_hour_naive,
    _previous_hour_naive,
)


def test_statistics_sensor_stats_store_init_exception(monkeypatch):
    from custom_components.oig_cloud.entities.statistics_sensor import (
        OigCloudStatisticsSensor,
        StatisticsStore,
    )
    from types import SimpleNamespace

    class DummyCoordinator:
        def __init__(self):
            self.data = {"123": {}}
            self.config_entry = SimpleNamespace(entry_id="entry123")

        def async_add_listener(self, *_args, **_kwargs):
            return lambda: None

    def boom_get_instance(*_a, **_k):
        raise RuntimeError("stats store boom")

    monkeypatch.setattr(StatisticsStore, "get_instance", boom_get_instance)

    coordinator = DummyCoordinator()
    sensor = OigCloudStatisticsSensor(
        coordinator,
        "battery_load_median",
        {"identifiers": {("oig_cloud", "123")}},
    )
    sensor.hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda _eid: None),
        config=SimpleNamespace(config_dir="/tmp"),
    )
    sensor._source_entity_id = "sensor.oig_123_source"

    sensor.async_write_ha_state = lambda *args, **kwargs: None

    sensor.async_added_to_hass()
    assert sensor._stats_store is None


def test_current_hour_naive_without_timezone():
    naive = datetime(2026, 1, 1, 10, 0)
    result = _current_hour_naive(naive)
    assert result == datetime(2026, 1, 1, 10, 0)


def test_previous_hour_naive_without_timezone():
    current = datetime(2026, 1, 1, 10, 0)
    result = _previous_hour_naive(current)
    assert result == datetime(2026, 1, 1, 9, 0)


@pytest.mark.asyncio
async def test_statistics_save_via_stats_store(monkeypatch):
    from custom_components.oig_cloud.entities.statistics_sensor import (
        OigCloudStatisticsSensor,
        StatisticsStore,
        Store,
    )
    from types import SimpleNamespace

    saved_via_stats = []
    saved_via_store = []

    class DummyStatsStore:
        @staticmethod
        def get_instance(*_a, **_k):
            return DummyStatsStore()

        async def save_sensor_data(self, entry_id, sensor_type, data):
            saved_via_stats.append((entry_id, sensor_type))
            return True

    class DummyStore:
        def __init__(self, *_a, **_k):
            pass

        async def async_save(self, data):
            saved_via_store.append(data)

    class DummyCoordinator:
        def __init__(self):
            self.data = {"123": {}}
            self.config_entry = SimpleNamespace(entry_id="entry123")

        def async_add_listener(self, *_args, **_kwargs):
            return lambda: None

    monkeypatch.setattr(StatisticsStore, "get_instance", DummyStatsStore.get_instance)
    monkeypatch.setattr("homeassistant.helpers.storage.Store", DummyStore)

    coordinator = DummyCoordinator()
    sensor = OigCloudStatisticsSensor(
        coordinator,
        "battery_load_median",
        {"identifiers": {("oig_cloud", "123")}},
    )
    sensor.hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda _eid: None),
        config=SimpleNamespace(config_dir="/tmp"),
        async_create_task=lambda _coro: None,
    )
    sensor._source_entity_id = "sensor.oig_123_source"
    sensor._sampling_data = [(datetime.now(), 1.0)]
    sensor._current_hourly_value = 2.0
    sensor._interval_data = []

    sensor.async_write_ha_state = lambda *args, **kwargs: None

    sensor._stats_store = DummyStatsStore.get_instance()

    await sensor._save_statistics_data()

    assert len(saved_via_stats) == 1
    assert saved_via_stats[0] == ("entry123", "battery_load_median")
    assert len(saved_via_store) == 0
