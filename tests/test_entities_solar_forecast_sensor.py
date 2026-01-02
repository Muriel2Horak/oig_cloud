from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities import solar_forecast_sensor as sensor_module

from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
    _parse_forecast_hour,
)


class DummyCoordinator:
    def __init__(self):
        self.forced_box_id = "123"


class DummyConfigEntry:
    def __init__(self, options):
        self.options = options


def _make_sensor(options):
    coordinator = DummyCoordinator()
    entry = DummyConfigEntry(options)
    return OigCloudSolarForecastSensor(coordinator, "solar_forecast", entry, {})


def test_parse_forecast_hour():
    assert _parse_forecast_hour("2025-01-01T12:00:00") is not None
    assert _parse_forecast_hour("bad") is None


def test_should_fetch_data_daily_optimized(monkeypatch):
    sensor = _make_sensor({"solar_forecast_mode": "daily_optimized"})
    sensor._last_api_call = 1000.0

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.solar_forecast_sensor.time.time",
        lambda: 1000.0 + 15000.0,
    )

    assert sensor._should_fetch_data() is True


def test_should_fetch_data_manual(monkeypatch):
    sensor = _make_sensor({"solar_forecast_mode": "manual"})
    sensor._last_api_call = 1000.0

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.solar_forecast_sensor.time.time",
        lambda: 1000.0 + 99999.0,
    )

    assert sensor._should_fetch_data() is False


def test_get_update_interval():
    sensor = _make_sensor({})
    assert sensor._get_update_interval("hourly") is not None
    assert sensor._get_update_interval("manual") is None


class DummyStore:
    data = None
    saved = None

    def __init__(self, hass, version, key):
        self.hass = hass
        self.version = version
        self.key = key

    async def async_load(self):
        return DummyStore.data

    async def async_save(self, data):
        DummyStore.saved = data


@pytest.mark.asyncio
async def test_load_persistent_data(monkeypatch):
    sensor = _make_sensor({})
    sensor.hass = SimpleNamespace()
    DummyStore.data = {"last_api_call": 1234, "forecast_data": {"a": 1}}

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.solar_forecast_sensor.Store", DummyStore
    )

    await sensor._load_persistent_data()

    assert sensor._last_api_call == 1234.0
    assert sensor._last_forecast_data == {"a": 1}


@pytest.mark.asyncio
async def test_save_persistent_data(monkeypatch):
    sensor = _make_sensor({})
    sensor.hass = SimpleNamespace()
    sensor._last_api_call = 4321.0
    sensor._last_forecast_data = {"b": 2}

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.solar_forecast_sensor.Store", DummyStore
    )

    await sensor._save_persistent_data()

    assert DummyStore.saved["last_api_call"] == 4321.0
    assert DummyStore.saved["forecast_data"] == {"b": 2}


def test_should_fetch_data_modes(monkeypatch):
    sensor = _make_sensor({"solar_forecast_mode": "daily"})
    sensor._last_api_call = 1000.0
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.solar_forecast_sensor.time.time",
        lambda: 1000.0 + 80000.0,
    )
    assert sensor._should_fetch_data() is True

    sensor._config_entry.options["solar_forecast_mode"] = "every_4h"
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.solar_forecast_sensor.time.time",
        lambda: 1000.0 + 100.0,
    )
    assert sensor._should_fetch_data() is False


def test_convert_to_hourly_keeps_max():
    sensor = _make_sensor({})
    watts_data = {
        "2025-01-01T10:15:00+00:00": 100.0,
        "2025-01-01T10:45:00+00:00": 150.0,
        "2025-01-01T11:00:00+00:00": 90.0,
    }
    hourly = sensor._convert_to_hourly(watts_data)
    key_10 = datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc).isoformat()
    key_11 = datetime(2025, 1, 1, 11, 0, tzinfo=timezone.utc).isoformat()

    assert hourly[key_10] == 150.0
    assert hourly[key_11] == 90.0


def test_process_forecast_data_combines_strings():
    sensor = _make_sensor({})
    data_string1 = {
        "result": {
            "watts": {
                "2025-01-01T10:00:00+00:00": 100.0,
            },
            "watt_hours_day": {"2025-01-01": 1000.0},
        }
    }
    data_string2 = {
        "result": {
            "watts": {
                "2025-01-01T10:30:00+00:00": 200.0,
            },
            "watt_hours_day": {"2025-01-01": 500.0},
        }
    }
    result = sensor._process_forecast_data(data_string1, data_string2)

    assert result["string1_today_kwh"] == 1.0
    assert result["string2_today_kwh"] == 0.5
    assert result["total_today_kwh"] == 1.5
    assert result["total_hourly"]
