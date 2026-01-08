from __future__ import annotations

import asyncio
from datetime import datetime
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.pricing import spot_price_hourly as hourly_module
from custom_components.oig_cloud.pricing import spot_price_shared as shared_module


class DummyOteApi:
    def __init__(self, cache_path=None):
        self.cache_path = cache_path

    async def async_load_cached_spot_prices(self):
        return None

    async def get_spot_prices(self):
        return {}

    async def close(self):
        return None


class DummyConfig:
    def path(self, *parts):
        return "/" + "/".join(parts)


class DummyHass:
    def __init__(self):
        self.config = DummyConfig()

    def async_create_task(self, coro):
        coro.close()
        return object()


class DummyCoordinator:
    def __init__(self):
        self.hass = DummyHass()
        self.data = {}

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


def _make_sensor(monkeypatch, sensor_type="spot_price_current_czk_kwh"):
    monkeypatch.setattr(hourly_module, "OteApi", DummyOteApi)
    monkeypatch.setattr(
        hourly_module, "SENSOR_TYPES_SPOT", {sensor_type: {"name": "Spot"}}
    )
    coord = DummyCoordinator()
    sensor = hourly_module.SpotPriceSensor(coord, sensor_type)
    sensor.hass = coord.hass
    sensor.async_write_ha_state = lambda *args, **kwargs: None
    return sensor


def test_validate_spot_data(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    fixed_now = datetime(2025, 1, 1, 10, 0, 0)
    monkeypatch.setattr(hourly_module, "dt_now", lambda: fixed_now)

    prices = {
        f"2025-01-01T{hour:02d}:00:00": 2.0 + hour * 0.1 for hour in range(12)
    }
    data = {"prices_czk_kwh": prices}

    assert sensor._validate_spot_data(data) is True

    data["prices_czk_kwh"] = {"2025-01-01T00:00:00": 0.0}
    assert sensor._validate_spot_data(data) is False


def test_current_price_and_attributes(monkeypatch):
    sensor = _make_sensor(monkeypatch, "spot_price_current_czk_kwh")
    fixed_now = datetime(2025, 1, 1, 8, 30, 0)
    monkeypatch.setattr(hourly_module, "dt_now", lambda: fixed_now)

    sensor._spot_data = {
        "prices_czk_kwh": {
            "2025-01-01T08:00:00": 3.2,
            "2025-01-01T09:00:00": 3.4,
        },
        "today_stats": {"avg_czk": 3.3, "min_czk": 3.0, "max_czk": 3.6},
        "tomorrow_stats": {"avg_czk": 3.1},
    }

    assert sensor.state == 3.2

    attrs = sensor.extra_state_attributes
    assert attrs["today_avg_czk_kwh"] == 3.3
    assert attrs["tomorrow_avg_czk_kwh"] == 3.1
    assert "today_prices" in attrs
    assert attrs["next_hour_price"] == 3.4


def test_all_hourly_prices(monkeypatch):
    sensor = _make_sensor(monkeypatch, "spot_price_hourly_all")
    fixed_now = datetime(2025, 1, 1, 8, 0, 0)
    monkeypatch.setattr(hourly_module, "dt_now", lambda: fixed_now)

    sensor._spot_data = {
        "prices_czk_kwh": {
            "2025-01-01T08:00:00": 3.0,
            "2025-01-01T09:00:00": 4.0,
            "2025-01-02T08:00:00": 5.0,
        },
        "today_stats": {"avg_czk": 3.5, "min_czk": 3.0, "max_czk": 4.0},
        "tomorrow_stats": {"avg_czk": 5.0},
    }

    attrs = sensor.extra_state_attributes
    summary = attrs["price_summary"]
    assert summary["min"] == 3.0
    assert summary["max"] == 5.0
    assert summary["current"] == 3.0
    assert summary["next"] == 4.0
    assert attrs["data_info"]["coverage"] == "today only"


def test_handle_coordinator_update(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    sensor.coordinator.data = {"spot_prices": {"hours_count": 10}}
    sensor._handle_coordinator_update()
    assert sensor._spot_data["hours_count"] == 10


@pytest.mark.asyncio
async def test_async_added_to_hass_initial_fetch(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    sensor.hass = sensor.coordinator.hass

    called = {"fetch": 0, "setup": 0}

    async def fake_fetch():
        called["fetch"] += 1

    async def fake_restore():
        return None

    def fake_setup():
        called["setup"] += 1

    monkeypatch.setattr(sensor, "_fetch_spot_data_with_retry", fake_fetch)
    monkeypatch.setattr(sensor, "_restore_data", fake_restore)
    monkeypatch.setattr(sensor, "_setup_time_tracking", fake_setup)
    monkeypatch.setattr(hourly_module, "dt_now", lambda: datetime(2025, 1, 1, 10, 0, 0))

    await sensor.async_added_to_hass()
    assert called["fetch"] == 1
    assert called["setup"] == 1


@pytest.mark.asyncio
async def test_restore_data_invalid_timestamp(monkeypatch):
    sensor = _make_sensor(monkeypatch)

    class DummyState:
        attributes = {"last_update": "bad"}

    async def fake_last_state():
        return DummyState()

    monkeypatch.setattr(sensor, "async_get_last_state", fake_last_state)
    await sensor._restore_data()


def test_do_fetch_spot_data_paths(monkeypatch):
    sensor = _make_sensor(monkeypatch)

    async def fake_get():
        return {"prices_czk_kwh": {"2025-01-01T00:00:00": 1.0}, "tomorrow_stats": {}}

    async def fake_get_empty():
        return {}

    sensor._ote_api._is_cache_valid = lambda: True
    monkeypatch.setattr(sensor._ote_api, "get_spot_prices", fake_get)
    monkeypatch.setattr(sensor, "_validate_spot_data", lambda *_a, **_k: True)
    result = asyncio.run(sensor._do_fetch_spot_data())
    assert result is True

    sensor._ote_api._is_cache_valid = lambda: False
    result = asyncio.run(sensor._do_fetch_spot_data())
    assert result is False

    monkeypatch.setattr(sensor._ote_api, "get_spot_prices", fake_get_empty)
    result = asyncio.run(sensor._do_fetch_spot_data())
    assert result is False


def test_state_branches(monkeypatch):
    sensor = _make_sensor(monkeypatch, "spot_price_current_eur_mwh")
    fixed_now = datetime(2025, 1, 1, 8, 0, 0)
    monkeypatch.setattr(hourly_module, "dt_now", lambda: fixed_now)

    sensor._spot_data = {
        "prices_czk_kwh": {"2025-01-01T08:00:00": 3.3},
        "prices_eur_mwh": {"2025-01-01T08:00:00": 100.0},
        "today_stats": {"avg_czk": 3.3, "min_czk": 3.0, "max_czk": 3.6},
    }
    assert sensor.state == 100.0

    sensor._sensor_type = "spot_price_tomorrow_avg"
    sensor._spot_data["tomorrow_stats"] = {"avg_czk": 2.5}
    assert sensor.state == 2.5

    sensor._sensor_type = "spot_price_today_min"
    assert sensor.state == 3.0

    sensor._sensor_type = "spot_price_today_max"
    assert sensor.state == 3.6

    sensor._sensor_type = "spot_price_today_avg"
    assert sensor.state == 3.3

    sensor._sensor_type = "spot_price_hourly_all"
    assert sensor.state == 3.3


def test_hourly_prices_empty(monkeypatch):
    sensor = _make_sensor(monkeypatch, "spot_price_current_czk_kwh")
    sensor._spot_data = {}
    assert sensor._get_hourly_prices() == {}
    assert sensor._get_all_hourly_prices() == {}


def test_retry_timer_cancel(monkeypatch):
    sensor = _make_sensor(monkeypatch)

    class DummyTask:
        def __init__(self, done=False):
            self._done = done
            self.cancelled = False

        def done(self):
            return self._done

        def cancel(self):
            self.cancelled = True

    sensor._retry_remove = DummyTask()
    sensor._cancel_retry_timer()
    assert sensor._retry_remove is None


def test_spot_price_shared_helpers(monkeypatch):
    hass = DummyHass()

    assert shared_module._ote_cache_path(hass).endswith(".storage/oig_ote_spot_prices.json")

    class DummyCoordinator:
        forced_box_id = "777"

    assert shared_module._resolve_box_id_from_coordinator(DummyCoordinator()) == "777"
