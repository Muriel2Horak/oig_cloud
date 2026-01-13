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
async def test_async_fetch_solcast_provider_calls_fetch(monkeypatch):
    sensor = _make_sensor({"solar_forecast_provider": "solcast"})
    called = {"ok": False}

    async def _fetch(_now):
        called["ok"] = True

    monkeypatch.setattr(module.time, "time", lambda: 12345.0)
    monkeypatch.setattr(sensor, "_fetch_solcast_data", _fetch)

    await sensor.async_fetch_forecast_data()
    assert called["ok"] is True


@pytest.mark.asyncio
async def test_fetch_solcast_missing_api_key(monkeypatch):
    sensor = _make_sensor({"solar_forecast_provider": "solcast"})
    await sensor._fetch_solcast_data(1000.0)
    assert sensor._last_forecast_data is None


@pytest.mark.asyncio
async def test_fetch_solcast_requires_kwp(monkeypatch):
    sensor = _make_sensor(
        {
            "solar_forecast_provider": "solcast",
            "solcast_api_key": "key",
            "solar_forecast_string1_enabled": False,
            "solar_forecast_string2_enabled": False,
        }
    )
    await sensor._fetch_solcast_data(1000.0)
    assert sensor._last_forecast_data is None


@pytest.mark.asyncio
async def test_fetch_solcast_auth_failed(monkeypatch):
    sensor = _make_sensor(
        {
            "solar_forecast_provider": "solcast",
            "solcast_api_key": "key",
            "solar_forecast_string1_enabled": True,
            "solar_forecast_string1_kwp": 1.0,
        }
    )
    session = DummySession([DummyResponse(401)])
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: session)
    await sensor._fetch_solcast_data(1000.0)
    assert sensor._last_forecast_data is None


@pytest.mark.asyncio
async def test_fetch_solcast_rate_limited(monkeypatch):
    sensor = _make_sensor(
        {
            "solar_forecast_provider": "solcast",
            "solcast_api_key": "key",
            "solar_forecast_string1_enabled": True,
            "solar_forecast_string1_kwp": 1.0,
        }
    )
    session = DummySession([DummyResponse(429)])
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: session)
    await sensor._fetch_solcast_data(1000.0)
    assert sensor._last_forecast_data is None


@pytest.mark.asyncio
async def test_fetch_solcast_other_error(monkeypatch):
    sensor = _make_sensor(
        {
            "solar_forecast_provider": "solcast",
            "solcast_api_key": "key",
            "solar_forecast_string1_enabled": True,
            "solar_forecast_string1_kwp": 1.0,
        }
    )
    session = DummySession([DummyResponse(500, text="boom")])
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: session)
    await sensor._fetch_solcast_data(1000.0)
    assert sensor._last_forecast_data is None


@pytest.mark.asyncio
async def test_fetch_solcast_no_forecasts(monkeypatch):
    sensor = _make_sensor(
        {
            "solar_forecast_provider": "solcast",
            "solcast_api_key": "key",
            "solar_forecast_string1_enabled": True,
            "solar_forecast_string1_kwp": 1.0,
        }
    )
    session = DummySession([DummyResponse(200, payload={"forecasts": []})])
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: session)
    await sensor._fetch_solcast_data(1000.0)
    assert sensor._last_forecast_data is None


@pytest.mark.asyncio
async def test_fetch_solcast_success(monkeypatch):
    sensor = _make_sensor(
        {
            "solar_forecast_provider": "solcast",
            "solcast_api_key": "key",
            "solar_forecast_string1_enabled": True,
            "solar_forecast_string1_kwp": 1.0,
            "solar_forecast_string2_enabled": True,
            "solar_forecast_string2_kwp": 2.0,
        }
    )
    payload = {
        "forecasts": [
            {"period_end": "2025-01-01T10:00:00+00:00", "ghi": 500, "period": "PT30M"}
        ]
    }
    session = DummySession([DummyResponse(200, payload=payload)])
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: session)

    async def _save():
        return None

    async def _broadcast():
        return None

    sensor._save_persistent_data = _save
    sensor._broadcast_forecast_data = _broadcast
    sensor.async_write_ha_state = lambda *args, **kwargs: None
    sensor.hass.data = {}
    sensor.coordinator.solar_forecast_data = {}

    await sensor._fetch_solcast_data(1000.0)
    assert sensor._last_forecast_data is not None
    assert sensor.coordinator.solar_forecast_data is sensor._last_forecast_data


@pytest.mark.asyncio
async def test_fetch_solcast_success_sets_attr(monkeypatch):
    sensor = _make_sensor(
        {
            "solar_forecast_provider": "solcast",
            "solcast_api_key": "key",
            "solar_forecast_string1_enabled": True,
            "solar_forecast_string1_kwp": 1.0,
        }
    )
    payload = {
        "forecasts": [
            {"period_end": "2025-01-01T10:00:00+00:00", "ghi": 500, "period": "PT30M"}
        ]
    }
    session = DummySession([DummyResponse(200, payload=payload)])
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: session)

    async def _save():
        return None

    async def _broadcast():
        return None

    sensor._save_persistent_data = _save
    sensor._broadcast_forecast_data = _broadcast
    sensor.async_write_ha_state = lambda *args, **kwargs: None
    sensor.hass.data = {}

    await sensor._fetch_solcast_data(1000.0)
    assert hasattr(sensor.coordinator, "solar_forecast_data")


def test_process_solcast_data_skips_invalid_entries():
    sensor = _make_sensor({"solar_forecast_provider": "solcast"})
    forecasts = [
        {"period_end": None, "ghi": 100, "period": "PT30M"},
        {"period_end": "2025-01-01T10:00:00+00:00", "ghi": None, "period": "PT30M"},
        {"period_end": "2025-01-01T11:00:00+00:00", "ghi": "bad", "period": "PT30M"},
        {"period_end": "2025-01-01T12:00:00+00:00", "ghi": 500, "period": "PT1H"},
    ]
    data = sensor._process_solcast_data(forecasts, 1.0, 0.0)
    assert "total_hourly" in data
    assert data["provider"] == "solcast"


def test_parse_solcast_period_hours_invalid_minutes():
    assert OigCloudSolarForecastSensor._parse_solcast_period_hours("PTbadM") == 0.5


def test_parse_solcast_period_hours_invalid_hours():
    assert OigCloudSolarForecastSensor._parse_solcast_period_hours("PTbadH") == 0.5


def test_parse_solcast_period_hours_default():
    assert OigCloudSolarForecastSensor._parse_solcast_period_hours("bad") == 0.5


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


def test_process_solcast_data_splits_strings():
    sensor = _make_sensor({"enable_solar_forecast": True})
    forecasts = [
        {
            "period_end": "2025-01-01T10:00:00+00:00",
            "ghi": 500,
            "period": "PT30M",
        }
    ]
    result = sensor._process_solcast_data(forecasts, kwp1=4.0, kwp2=2.0)
    assert result["total_today_kwh"] == pytest.approx(1.5)
    assert result["string1_today_kwh"] == pytest.approx(1.0)
    assert result["string2_today_kwh"] == pytest.approx(0.5)


def test_parse_solcast_period_hours():
    sensor = _make_sensor({"enable_solar_forecast": True})
    assert sensor._parse_solcast_period_hours("PT30M") == pytest.approx(0.5)
    assert sensor._parse_solcast_period_hours("PT1H") == pytest.approx(1.0)
    assert sensor._parse_solcast_period_hours(None) == pytest.approx(0.5)


def test_device_info_property():
    sensor = _make_sensor({"enable_solar_forecast": True})
    assert sensor.device_info == {}


def test_state_returns_none_without_data():
    sensor = _make_sensor({"enable_solar_forecast": True})
    assert sensor.state is None
