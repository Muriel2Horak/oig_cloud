from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from custom_components.oig_cloud.pricing import spot_price_export_15min as export_module


class DummyOteApi:
    def __init__(self, cache_path=None):
        self.cache_path = cache_path

    @staticmethod
    def get_current_15min_interval(_now):
        return 0

    @staticmethod
    def get_15min_price_for_interval(_idx, data, _date):
        return data.get("prices15m_czk_kwh", {}).get("2025-01-01T12:00:00")

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
        self.forced_box_id = "123"


def _make_sensor(monkeypatch, options=None):
    options = options or {}
    entry = SimpleNamespace(options=options, data={})
    coordinator = DummyCoordinator()
    device_info = {"identifiers": {("oig_cloud", "123")}}

    monkeypatch.setattr(export_module, "OteApi", DummyOteApi)
    monkeypatch.setattr(
        export_module,
        "SENSOR_TYPES_SPOT",
        {"spot_export_15m": {"name": "Export 15m"}},
    )

    return export_module.ExportPrice15MinSensor(
        coordinator,
        entry,
        "spot_export_15m",
        device_info,
    )


def test_export_price_calculation(monkeypatch):
    sensor = _make_sensor(
        monkeypatch,
        {
            "export_pricing_model": "percentage",
            "export_fee_percent": 10.0,
            "export_fixed_fee_czk": 0.2,
            "export_fixed_price": 2.5,
        },
    )

    dt = datetime(2025, 1, 1, 12, 0, 0)
    assert sensor._calculate_export_price_15min(3.0, dt) == 2.7

    sensor._entry.options["export_pricing_model"] = "fixed_prices"
    assert sensor._calculate_export_price_15min(3.0, dt) == 2.5

    sensor._entry.options["export_pricing_model"] = "fixed_fee"
    assert sensor._calculate_export_price_15min(3.0, dt) == 2.8


def test_export_attributes_and_state(monkeypatch):
    sensor = _make_sensor(monkeypatch, {"export_pricing_model": "percentage"})
    fixed_now = datetime(2025, 1, 1, 12, 7, 0)
    monkeypatch.setattr(export_module, "dt_now", lambda: fixed_now)

    sensor._spot_data_15min = {
        "prices15m_czk_kwh": {
            "2025-01-01T11:45:00": 2.0,
            "2025-01-01T12:00:00": 2.5,
            "2025-01-01T12:15:00": 3.0,
        }
    }

    state = sensor._calculate_current_state()
    assert state == 2.12

    attrs = sensor._calculate_attributes()
    assert attrs["current_interval"] == 0
    assert attrs["price_min"] == 2.12
    assert attrs["price_max"] == 2.55
    assert attrs["price_avg"] == 2.33
