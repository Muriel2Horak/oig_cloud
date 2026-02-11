from __future__ import annotations

from datetime import datetime, timezone, timedelta
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities import statistics_sensor
from custom_components.oig_cloud.shared import logging as logging_module


@pytest.mark.asyncio
async def test_statistics_sensor_stats_store_init_exception(hass, monkeypatch):
    class DummyStatsStore:
        @staticmethod
        def get_instance(*_a, **_k):
            raise RuntimeError("stats store init boom")

    class DummyCoordinator:
        data = {"123": {}}
        config_entry = SimpleNamespace(entry_id="entry123")

        def async_add_listener(self, *args, **kwargs):
            return lambda: None

    sensor = statistics_sensor.OigCloudStatisticsSensor(
        DummyCoordinator(),
        "battery_load_median",
        {"identifiers": {("oig_cloud", "123")}},
    )
    sensor.hass = hass

    monkeypatch.setattr(
        statistics_sensor.StatisticsStore,
        "get_instance",
        DummyStatsStore.get_instance,
    )
    monkeypatch.setattr(
        logging_module,
        "_LOGGER",
        SimpleNamespace(
            debug=lambda *a, **k: None,
            warning=lambda *a, **k: None,
            error=lambda *a, **k: None,
        ),
    )

    sensor.async_write_ha_state = lambda *args, **kwargs: None

    await sensor.async_added_to_hass()

    assert sensor._stats_store is None


@pytest.mark.asyncio
async def test_statistics_sensor_save_via_statistics_store(hass, monkeypatch):
    class DummyStatsStore:
        saved = []

        @staticmethod
        def get_instance(*_a, **_k):
            return DummyStatsStore()

        async def save_sensor_data(self, entry_id, sensor_type, data):
            self.saved.append((entry_id, sensor_type))
            return True

    class DummyCoordinator:
        data = {"123": {}}
        config_entry = SimpleNamespace(entry_id="entry123")

        def async_add_listener(self, *args, **kwargs):
            return lambda: None

    sensor = statistics_sensor.OigCloudStatisticsSensor(
        DummyCoordinator(),
        "battery_load_median",
        {"identifiers": {("oig_cloud", "123")}},
    )
    sensor.hass = hass

    monkeypatch.setattr(
        statistics_sensor.StatisticsStore,
        "get_instance",
        DummyStatsStore.get_instance,
    )

    sensor.async_write_ha_state = lambda *args, **kwargs: None

    sensor._stats_store = DummyStatsStore.get_instance()

    await sensor._save_statistics_data()

    assert len(DummyStatsStore.saved) == 1
    assert DummyStatsStore.saved[0][0] == "entry123"
    assert DummyStatsStore.saved[0][1] == "battery_load_median"


@pytest.mark.asyncio
async def test_statistics_sensor_save_with_missing_config_entry(hass, monkeypatch):
    class DummyStatsStore:
        saved = []

        @staticmethod
        def get_instance(*_a, **_k):
            return DummyStatsStore()

        async def save_sensor_data(self, entry_id, sensor_type, data):
            self.saved.append((entry_id, sensor_type))
            return True

    class DummyCoordinator:
        data = {"123": {}}

        def async_add_listener(self, *args, **kwargs):
            return lambda: None

    sensor = statistics_sensor.OigCloudStatisticsSensor(
        DummyCoordinator(),
        "battery_load_median",
        {"identifiers": {("oig_cloud", "123")}},
    )
    sensor.hass = hass

    monkeypatch.setattr(
        statistics_sensor.StatisticsStore,
        "get_instance",
        DummyStatsStore.get_instance,
    )

    sensor.async_write_ha_state = lambda *args, **kwargs: None

    sensor._stats_store = DummyStatsStore.get_instance()

    sensor._coordinator.config_entry = None

    await sensor._save_statistics_data()

    assert len(DummyStatsStore.saved) == 0
