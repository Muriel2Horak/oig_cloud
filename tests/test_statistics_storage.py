"""Tests for StatisticsStore - batched statistics storage for low-power mode."""

from __future__ import annotations

import asyncio
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from custom_components.oig_cloud.shared.statistics_storage import (
    StatisticsStore,
    flush_statistics,
    save_statistics_data,
)


class DummyStore:
    """Mock Store for testing."""

    def __init__(self, *args, **kwargs):
        self._saved_data = None

    async def async_save(self, data):
        await asyncio.sleep(0)
        self._saved_data = data


class DummyHass:
    """Mock HomeAssistant for testing."""

    def __init__(self):
        self._stores = {}

    def _get_or_create_store(self, key):
        if key not in self._stores:
            self._stores[key] = DummyStore()
        return self._stores[key]


@pytest.fixture
def mock_hass():
    """Create a mock HomeAssistant instance."""
    return DummyHass()


@pytest.fixture(autouse=True)
def reset_singleton():
    """Reset singleton before each test."""
    StatisticsStore._instance = None
    yield
    StatisticsStore._instance = None


def test_singleton_pattern(mock_hass):
    """Test that get_instance returns the same instance."""
    instance1 = StatisticsStore.get_instance(mock_hass)
    instance2 = StatisticsStore.get_instance(mock_hass)
    assert instance1 is instance2
    assert instance1._hass is mock_hass


@pytest.mark.asyncio
async def test_save_sensor_data_queues_data(mock_hass):
    """Test that save_sensor_data correctly queues data."""
    store = StatisticsStore.get_instance(mock_hass)
    sensor_data = {"sampling_data": [1, 2, 3], "total": 6}

    store._pending_writes.clear()
    await store.save_sensor_data("entry_1", "hourly", sensor_data)

    assert len(store._pending_writes) == 1
    assert "oig_stats_entry_1_hourly" in store._pending_writes
    assert store._pending_writes["oig_stats_entry_1_hourly"] == sensor_data


@pytest.mark.asyncio
async def test_save_sensor_data_overwrites_existing(mock_hass):
    """Test that save_sensor_data overwrites existing queued data."""
    store = StatisticsStore.get_instance(mock_hass)
    data1 = {"total": 10}
    data2 = {"total": 20}

    await store.save_sensor_data("entry_1", "hourly", data1)
    await store.save_sensor_data("entry_1", "hourly", data2)

    assert store._pending_writes["oig_stats_entry_1_hourly"] == data2


@pytest.mark.asyncio
async def test_save_all_writes_pending_data(mock_hass):
    """Test that save_all writes all pending data to storage."""
    store = StatisticsStore.get_instance(mock_hass)
    store._pending_writes.clear()

    # Patch _get_store to return our DummyStore
    store._get_store = lambda key: DummyStore()

    data1 = {"key": "value1"}
    data2 = {"key": "value2"}
    store._pending_writes["key1"] = data1
    store._pending_writes["key2"] = data2

    await store.save_all()

    assert len(store._pending_writes) == 0


@pytest.mark.asyncio
async def test_save_all_handles_empty_pending(mock_hass):
    """Test that save_all handles empty pending writes."""
    store = StatisticsStore.get_instance(mock_hass)
    store._pending_writes.clear()

    await store.save_all()

    assert len(store._pending_writes) == 0


@pytest.mark.asyncio
async def test_save_all_resets_last_batch_time(mock_hass):
    """Test that save_all resets _last_batch_time."""
    store = StatisticsStore.get_instance(mock_hass)
    store._pending_writes.clear()
    store._get_store = lambda key: DummyStore()
    store._pending_writes["key1"] = {"data": "test"}
    store._last_batch_time = 100.0

    await store.save_all()

    assert store._last_batch_time is None


@pytest.mark.asyncio
async def test_maybe_flush_returns_early_without_last_batch_time(mock_hass):
    """Test that maybe_flush returns early if _last_batch_time is None."""
    store = StatisticsStore.get_instance(mock_hass)
    store._last_batch_time = None
    store._pending_writes["key1"] = {"data": "test"}

    # Should not raise any exception
    await store.maybe_flush("entry_1")

    assert len(store._pending_writes) == 1


@pytest.mark.asyncio
async def test_maybe_flush_skips_when_age_below_cooldown(mock_hass):
    """Test that maybe_flush skips flush if age is below cooldown."""
    store = StatisticsStore.get_instance(mock_hass)
    loop = asyncio.get_event_loop()
    store._last_batch_time = loop.time() - 100  # 100 seconds ago
    store._write_cooldown_seconds = 600  # 10 minutes
    store._pending_writes["key1"] = {"data": "test"}
    store.save_all = AsyncMock()

    await store.maybe_flush("entry_1")

    assert store.save_all.called is False


@pytest.mark.asyncio
async def test_maybe_flush_flushes_when_age_above_cooldown(mock_hass):
    """Test that maybe_flush flushes if age is above cooldown."""
    store = StatisticsStore.get_instance(mock_hass)
    store._pending_writes.clear()
    store._get_store = lambda key: DummyStore()
    loop = asyncio.get_event_loop()
    store._last_batch_time = loop.time() - 700  # 700 seconds ago
    store._write_cooldown_seconds = 600  # 10 minutes
    store._pending_writes["key1"] = {"data": "test"}

    await store.maybe_flush("entry_1")

    assert len(store._pending_writes) == 0


@pytest.mark.asyncio
async def test_save_statistics_data_saves_directly(mock_hass):
    """Test that save_statistics_data helper saves directly."""
    import homeassistant.helpers.storage as storage_module
    from unittest.mock import patch

    # Mock Store class
    class FakeStore:
        def __init__(self, *args, **kwargs):
            self._saved_data = None

        async def async_save(self, data):
            await asyncio.sleep(0)
            self._saved_data = data

    fake_store = FakeStore()

    with patch.object(storage_module, "Store", return_value=fake_store):
        data = {"key": "value"}
        await save_statistics_data(mock_hass, "entry_1", data)

        assert fake_store._saved_data == data


@pytest.mark.asyncio
async def test_flush_statistics_calls_instance_flush(mock_hass):
    """Test that flush_statistics helper calls instance.maybe_flush."""
    store = StatisticsStore.get_instance(mock_hass)
    store.maybe_flush = AsyncMock()

    await flush_statistics(mock_hass, "entry_1")

    store.maybe_flush.assert_called_once_with("entry_1")


@pytest.mark.asyncio
async def test_multiple_sensors_can_queue_separately(mock_hass):
    """Test that multiple sensors can queue data separately."""
    store = StatisticsStore.get_instance(mock_hass)
    store._pending_writes.clear()

    await store.save_sensor_data("entry_1", "sensor_a", {"data": "a"})
    await store.save_sensor_data("entry_1", "sensor_b", {"data": "b"})
    await store.save_sensor_data("entry_2", "sensor_c", {"data": "c"})

    assert len(store._pending_writes) == 3
    assert "oig_stats_entry_1_sensor_a" in store._pending_writes
    assert "oig_stats_entry_1_sensor_b" in store._pending_writes
    assert "oig_stats_entry_2_sensor_c" in store._pending_writes


@pytest.mark.asyncio
async def test_save_all_handles_storage_errors(mock_hass):
    """Test that save_all handles storage errors gracefully."""
    store = StatisticsStore.get_instance(mock_hass)
    store._pending_writes.clear()

    class FailingStore:
        async def async_save(self, data):
            raise RuntimeError("Storage error")

    store._get_store = lambda key: FailingStore()
    store._pending_writes["key1"] = {"data": "test"}

    # Should not raise exception
    await store.save_all()

    # But pending should still be cleared
    assert len(store._pending_writes) == 0


def test_get_store_builds_expected_key(mock_hass, monkeypatch):
    """Test _get_store constructs Store with expected key."""
    captured = {}

    class FakeStore:
        def __init__(self, hass, version, key):
            captured["hass"] = hass
            captured["version"] = version
            captured["key"] = key

    monkeypatch.setattr("homeassistant.helpers.storage.Store", FakeStore)

    store = StatisticsStore.get_instance(mock_hass)
    _ = store._get_store("entry_abc")

    assert captured["hass"] is mock_hass
    assert captured["version"] == 1
    assert captured["key"] == "oig_stats_entry_abc"
