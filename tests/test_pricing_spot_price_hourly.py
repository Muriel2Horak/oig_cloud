from __future__ import annotations

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


def _make_sensor(monkeypatch, sensor_type="spot_price_current_czk_kwh"):
    monkeypatch.setattr(hourly_module, "OteApi", DummyOteApi)
    monkeypatch.setattr(
        hourly_module, "SENSOR_TYPES_SPOT", {sensor_type: {"name": "Spot"}}
    )
    coord = DummyCoordinator()
    return hourly_module.SpotPriceSensor(coord, sensor_type)


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


def test_spot_price_shared_helpers(monkeypatch):
    hass = DummyHass()

    assert shared_module._ote_cache_path(hass).endswith(".storage/oig_ote_spot_prices.json")

    class DummyCoordinator:
        forced_box_id = "777"

    assert shared_module._resolve_box_id_from_coordinator(DummyCoordinator()) == "777"
