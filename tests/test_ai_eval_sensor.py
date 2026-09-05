"""Tests for the AI-eval sensor."""
from __future__ import annotations

from types import SimpleNamespace
from typing import Any, Dict

import pytest

from custom_components.oig_cloud.entities.ai_eval_sensor import OigCloudAiEvalSensor


class _FakeStore:
    def __init__(self, data: Dict[str, Any] | None = None) -> None:
        self._data = data

    async def async_load(self) -> Dict[str, Any] | None:
        return self._data


class _FakeHass:
    def __init__(self, store_data: Dict[str, Any] | None = None) -> None:
        self._store_data = store_data
        self._listeners: Dict[str, list] = {}
        self.loop_thread_id = 0

    def async_create_task(self, coro):  # noqa: ANN001
        import asyncio

        asyncio.get_event_loop().create_task(coro)


def _entry(entry_id: str = "entry1") -> SimpleNamespace:
    return SimpleNamespace(entry_id=entry_id)


def _build_sensor(
    store_data: Dict[str, Any] | None, entry_id: str = "entry1"
) -> OigCloudAiEvalSensor:
    hass = _FakeHass(store_data)
    entry = _entry(entry_id)
    sensor = OigCloudAiEvalSensor(hass, entry, "123456")
    sensor.async_write_ha_state = lambda *args, **kwargs: None
    return sensor


async def _load_sensor(
    store_data: Dict[str, Any] | None, entry_id: str = "entry1"
) -> OigCloudAiEvalSensor:
    sensor = _build_sensor(store_data, entry_id)
    await sensor._async_reload_store_with_data(store_data if store_data else {})
    return sensor


@pytest.mark.asyncio
async def test_sensor_exposes_frozen_attributes_from_store():
    data = {
        "report_fakta": "Fakta text",
        "report_lidsky": "Lidsky text",
        "ledger": "Ledger content",
        "last_run": "2024-01-15T10:30:00+00:00",
        "anomaly_count": 3,
    }
    sensor = await _load_sensor(data)

    attrs = sensor.extra_state_attributes
    assert attrs["report_fakta"] == "Fakta text"
    assert attrs["report_lidsky"] == "Lidsky text"
    assert attrs["ledger"] == "Ledger content"
    assert attrs["last_run"] == "2024-01-15T10:30:00+00:00"
    assert sensor.native_value == "3"
    assert sensor.available is True


@pytest.mark.asyncio
async def test_sensor_unavailable_when_no_store_data():
    sensor = await _load_sensor(None)

    assert sensor.native_value is None
    assert sensor.available is False
    attrs = sensor.extra_state_attributes
    assert attrs["report_fakta"] is None
    assert attrs["report_lidsky"] is None
    assert attrs["ledger"] is None
    assert attrs["last_run"] is None


@pytest.mark.asyncio
async def test_sensor_state_is_last_run_when_anomaly_count_zero():
    data = {
        "report_fakta": "OK",
        "report_lidsky": "Vse v poradku",
        "ledger": "Ledger",
        "last_run": "2024-01-15T10:30:00+00:00",
        "anomaly_count": 0,
    }
    sensor = await _load_sensor(data)

    assert sensor.native_value == "2024-01-15T10:30:00+00:00"
    assert sensor.available is True


@pytest.mark.asyncio
async def test_dispatcher_signal_reloads_store_and_updates_state():
    initial_data = {
        "report_fakta": "Initial",
        "report_lidsky": "Pocatecni",
        "ledger": "Ledger1",
        "last_run": "2024-01-15T10:00:00+00:00",
        "anomaly_count": 1,
    }
    sensor = await _load_sensor(initial_data)
    assert sensor.native_value == "1"
    assert sensor.extra_state_attributes["report_fakta"] == "Initial"

    updated_data = {
        "report_fakta": "Updated",
        "report_lidsky": "Aktualizovano",
        "ledger": "Ledger2",
        "last_run": "2024-01-15T11:00:00+00:00",
        "anomaly_count": 5,
    }
    await sensor._async_reload_store_with_data(updated_data)

    assert sensor.native_value == "5"
    assert sensor.extra_state_attributes["report_fakta"] == "Updated"
    assert sensor.extra_state_attributes["ledger"] == "Ledger2"


@pytest.mark.asyncio
async def test_sensor_entity_id_and_unique_id():
    sensor = _build_sensor(None)
    assert sensor.entity_id == "sensor.oig_123456_ai_eval"
    assert sensor._attr_unique_id == "oig_cloud_123456_ai_eval"


@pytest.mark.asyncio
async def test_sensor_no_exception_on_empty_store():
    sensor = await _load_sensor({})
    assert sensor.available is False
    assert sensor.native_value is None
