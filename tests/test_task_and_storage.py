from __future__ import annotations

import asyncio
from datetime import datetime

import pytest

from custom_components.oig_cloud.battery_forecast import task_utils
from custom_components.oig_cloud.battery_forecast.storage import plan_storage_io


class DummyLoop:
    def __init__(self):
        self.calls = []

    def call_soon_threadsafe(self, callback):
        self.calls.append(callback)
        callback()


class DummyHass:
    def __init__(self, loop):
        self.loop = loop
        self.created = []

    def async_create_task(self, coro):
        coro.close()
        self.created.append(True)
        return object()


class DummyStore:
    def __init__(self, data=None, fail_load=False, fail_save=False):
        self.data = data or {}
        self.fail_load = fail_load
        self.fail_save = fail_save
        self.saved = None

    async def async_load(self):
        if self.fail_load:
            raise RuntimeError("load failed")
        return self.data

    async def async_save(self, data):
        if self.fail_save:
            raise RuntimeError("save failed")
        self.saved = data
        self.data = data


class DummySensor:
    def __init__(self, hass=None):
        self._hass = hass
        self._forecast_retry_unsub = None

    async def async_update(self):
        return None


@pytest.mark.asyncio
async def test_create_task_threadsafe_same_loop():
    loop = asyncio.get_running_loop()
    hass = DummyHass(loop)
    sensor = DummySensor(hass=hass)

    async def _coro():
        return 1

    task_utils.create_task_threadsafe(sensor, _coro)
    assert hass.created


def test_create_task_threadsafe_other_loop():
    loop = DummyLoop()
    hass = DummyHass(loop)
    sensor = DummySensor(hass=hass)

    async def _coro():
        return 1

    task_utils.create_task_threadsafe(sensor, _coro)
    assert loop.calls


def test_schedule_forecast_retry(monkeypatch):
    sensor = DummySensor(hass=object())
    called = {}

    def _fake_call_later(_hass, _delay, callback):
        called["cb"] = callback
        return lambda: None

    monkeypatch.setattr(task_utils, "async_call_later", _fake_call_later)
    task_utils.schedule_forecast_retry(sensor, 10.0)

    assert sensor._forecast_retry_unsub is not None
    task_utils.schedule_forecast_retry(sensor, 10.0)
    assert sensor._forecast_retry_unsub is not None


@pytest.mark.asyncio
async def test_save_and_load_plan_storage():
    sensor = DummySensor()
    sensor._plans_store = DummyStore(data={})

    intervals = [{"time": "2025-01-01T00:00:00"}]
    ok = await plan_storage_io.save_plan_to_storage(
        sensor, "2025-01-01", intervals, {"baseline": True}
    )

    assert ok is True
    assert sensor._plans_store.saved["detailed"]["2025-01-01"]["baseline"] is True

    loaded = await plan_storage_io.load_plan_from_storage(sensor, "2025-01-01")
    assert loaded["intervals"] == intervals


@pytest.mark.asyncio
async def test_save_plan_storage_failure_creates_cache():
    sensor = DummySensor()
    sensor._plans_store = DummyStore(fail_save=True)

    await plan_storage_io.save_plan_to_storage(
        sensor, "2025-01-02", [{"time": "t"}], {"baseline": False}
    )

    assert "2025-01-02" in sensor._in_memory_plan_cache


@pytest.mark.asyncio
async def test_load_plan_storage_fallback_cache():
    sensor = DummySensor()
    sensor._plans_store = None
    sensor._in_memory_plan_cache = {"2025-01-03": {"intervals": [{"time": "x"}]}}

    loaded = await plan_storage_io.load_plan_from_storage(sensor, "2025-01-03")
    assert loaded["intervals"][0]["time"] == "x"
