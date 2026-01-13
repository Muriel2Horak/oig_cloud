from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.pricing import spot_price_15min_base as base_module


class DummyOteApi:
    def __init__(self, cache_path=None):
        self.cache_path = cache_path


class DummyConfig:
    def path(self, *parts):
        return "/" + "/".join(parts)


class DummyHass:
    def __init__(self):
        self.config = DummyConfig()


class DummyCoordinator:
    def __init__(self):
        self.hass = DummyHass()
        self.data = {}
        self.forced_box_id = "123"

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


def _make_base_sensor(monkeypatch):
    entry = SimpleNamespace(options={}, data={})
    coordinator = DummyCoordinator()
    device_info = {"identifiers": {("oig_cloud", "123")}}

    monkeypatch.setattr(base_module, "OteApi", DummyOteApi)
    monkeypatch.setattr(
        base_module,
        "SENSOR_TYPES_SPOT",
        {"spot_price_current_15m": {"name": "Spot 15m"}},
    )

    sensor = base_module.BasePrice15MinSensor(
        coordinator,
        entry,
        "spot_price_current_15m",
        device_info,
    )
    sensor.hass = coordinator.hass
    return sensor


def test_base_build_attributes_defaults(monkeypatch):
    sensor = _make_base_sensor(monkeypatch)
    attrs = sensor._build_attributes(
        now=datetime(2025, 1, 1, 12, 0, 0),
        current_interval=0,
        current_price=None,
        next_price=None,
        next_update=datetime(2025, 1, 1, 12, 15, 0),
        future_prices=[],
    )
    assert attrs == {}


def test_base_calculate_interval_price_not_implemented(monkeypatch):
    sensor = _make_base_sensor(monkeypatch)
    with pytest.raises(NotImplementedError):
        sensor._calculate_interval_price(1.0, datetime(2025, 1, 1, 12, 0, 0))
