from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities import solar_forecast_sensor as module
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)


class DummyCoordinator:
    def __init__(self):
        self.forced_box_id = "123"

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class DummyConfigEntry:
    def __init__(self, options):
        self.options = options


class DummyResponse:
    def __init__(self, status, payload=None, text=""):
        self.status = status
        self._payload = payload
        self._text = text

    async def json(self):
        return self._payload

    async def text(self):
        return self._text

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_exc):
        return False


class DummySession:
    def __init__(self, responses):
        self._responses = list(responses)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_exc):
        return False

    def get(self, *_args, **_kwargs):
        return self._responses.pop(0)


def _make_sensor(options, sensor_type="solar_forecast"):
    coordinator = DummyCoordinator()
    entry = DummyConfigEntry(options)
    sensor = OigCloudSolarForecastSensor(coordinator, sensor_type, entry, {})
    sensor.hass = SimpleNamespace()
    return sensor


@pytest.mark.asyncio
async def test_load_persistent_data_missing_forecast(monkeypatch):
    sensor = _make_sensor({"enable_solar_forecast": True})

    class DummyStore:
        async def async_load(self):
            return {"forecast_data": "bad"}

    monkeypatch.setattr(module, "Store", lambda *_a, **_k: DummyStore())
    await sensor._load_persistent_data()
    assert sensor._last_forecast_data is None


@pytest.mark.asyncio
async def test_delayed_initial_fetch_success(monkeypatch):
    sensor = _make_sensor({"enable_solar_forecast": True})

    async def _sleep(_seconds):
        return None

    async def _fetch():
        return None

    monkeypatch.setattr(module.asyncio, "sleep", _sleep)
    monkeypatch.setattr(sensor, "async_fetch_forecast_data", _fetch)

    await sensor._delayed_initial_fetch()


@pytest.mark.asyncio
async def test_periodic_update_every_4h_skip(monkeypatch):
    sensor = _make_sensor({"solar_forecast_mode": "every_4h"})
    sensor._last_api_call = 1000.0
    monkeypatch.setattr(module.time, "time", lambda: 1000.0 + 600.0)
    await sensor._periodic_update(datetime.now())


@pytest.mark.asyncio
async def test_periodic_update_hourly_skip(monkeypatch):
    sensor = _make_sensor({"solar_forecast_mode": "hourly"})
    sensor._last_api_call = 1000.0
    monkeypatch.setattr(module.time, "time", lambda: 1000.0 + 600.0)
    await sensor._periodic_update(datetime.now())


@pytest.mark.asyncio
async def test_manual_update_success(monkeypatch):
    sensor = _make_sensor({"enable_solar_forecast": True})

    async def _fetch():
        return None

    monkeypatch.setattr(sensor, "async_fetch_forecast_data", _fetch)
    assert await sensor.async_manual_update() is True


@pytest.mark.asyncio
async def test_async_fetch_string1_rate_limit_with_key(monkeypatch):
    sensor = _make_sensor({"enable_solar_forecast": True, "solar_forecast_api_key": "abc"})
    sensor._config_entry.options["solar_forecast_string1_enabled"] = True
    sensor._config_entry.options["solar_forecast_string2_enabled"] = False

    session = DummySession([DummyResponse(429)])
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: session)
    await sensor.async_fetch_forecast_data()


@pytest.mark.asyncio
async def test_async_fetch_string1_error_status(monkeypatch):
    sensor = _make_sensor({"enable_solar_forecast": True})
    sensor._config_entry.options["solar_forecast_string1_enabled"] = True
    sensor._config_entry.options["solar_forecast_string2_enabled"] = False

    session = DummySession([DummyResponse(500, text="fail")])
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: session)
    await sensor.async_fetch_forecast_data()


@pytest.mark.asyncio
async def test_async_fetch_string2_success_with_key(monkeypatch):
    sensor = _make_sensor(
        {
            "enable_solar_forecast": True,
            "solar_forecast_api_key": "abc",
            "solar_forecast_string1_enabled": False,
            "solar_forecast_string2_enabled": True,
        }
    )
    payload = {
        "result": {
            "watts": {"2025-01-01T10:00:00+00:00": 500},
            "watt_hours_day": {"2025-01-01": 1000},
        }
    }
    session = DummySession([DummyResponse(200, payload=payload)])
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: session)

    async def _save():
        return None

    async def _broadcast():
        return None

    sensor._save_persistent_data = _save
    sensor._broadcast_forecast_data = _broadcast

    await sensor.async_fetch_forecast_data()
    assert sensor._last_forecast_data is not None


@pytest.mark.asyncio
async def test_async_fetch_string2_rate_limit(monkeypatch):
    sensor = _make_sensor(
        {
            "enable_solar_forecast": True,
            "solar_forecast_string1_enabled": False,
            "solar_forecast_string2_enabled": True,
        }
    )
    session = DummySession([DummyResponse(429)])
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: session)
    await sensor.async_fetch_forecast_data()


@pytest.mark.asyncio
async def test_async_fetch_string2_error_status(monkeypatch):
    sensor = _make_sensor(
        {
            "enable_solar_forecast": True,
            "solar_forecast_string1_enabled": False,
            "solar_forecast_string2_enabled": True,
        }
    )
    session = DummySession([DummyResponse(500, text="fail")])
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: session)
    await sensor.async_fetch_forecast_data()


@pytest.mark.asyncio
async def test_async_fetch_exception_uses_cached(monkeypatch):
    sensor = _make_sensor({"enable_solar_forecast": True})
    sensor._last_forecast_data = {"total_today_kwh": 1.0}

    class BoomSession:
        async def __aenter__(self):
            raise RuntimeError("boom")

        async def __aexit__(self, *_exc):
            return False

    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: BoomSession())
    await sensor.async_fetch_forecast_data()
    assert sensor._last_forecast_data["total_today_kwh"] == 1.0


def test_device_info_property():
    sensor = _make_sensor({"enable_solar_forecast": True})
    assert sensor.device_info == {}


def test_state_returns_none_without_data():
    sensor = _make_sensor({"enable_solar_forecast": True})
    assert sensor.state is None
