from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.pricing import spot_price_15min as price15_module


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

    monkeypatch.setattr(price15_module, "OteApi", DummyOteApi)
    monkeypatch.setattr(
        price15_module,
        "SENSOR_TYPES_SPOT",
        {"spot_price_current_15m": {"name": "Spot 15m"}},
    )

    return price15_module.SpotPrice15MinSensor(
        coordinator,
        entry,
        "spot_price_current_15m",
        device_info,
    )


def test_tariff_parsing_and_calculation_percentage(monkeypatch):
    sensor = _make_sensor(
        monkeypatch,
        {
            "spot_pricing_model": "percentage",
            "spot_positive_fee_percent": 10.0,
            "spot_negative_fee_percent": 5.0,
            "distribution_fee_vt_kwh": 1.0,
            "distribution_fee_nt_kwh": 0.5,
            "vat_rate": 0.0,
            "dual_tariff_enabled": False,
        },
    )

    assert sensor._parse_tariff_times("22,2") == [22, 2]
    assert sensor._parse_tariff_times("") == []

    dt = datetime(2025, 1, 1, 12, 0, 0)
    price = sensor._calculate_final_price_15min(2.0, dt)
    assert price == 3.2

    negative_price = sensor._calculate_final_price_15min(-1.0, dt)
    assert negative_price == 0.05


def test_tariff_fixed_prices_and_fee(monkeypatch):
    sensor = _make_sensor(
        monkeypatch,
        {
            "spot_pricing_model": "fixed_prices",
            "fixed_commercial_price_vt": 4.0,
            "fixed_commercial_price_nt": 3.0,
            "distribution_fee_vt_kwh": 1.0,
            "distribution_fee_nt_kwh": 0.5,
            "vat_rate": 0.0,
            "dual_tariff_enabled": True,
            "tariff_nt_start_weekday": "0",
            "tariff_vt_start_weekday": "6",
        },
    )

    dt = datetime(2025, 1, 1, 7, 0, 0)
    price = sensor._calculate_final_price_15min(2.0, dt)
    assert price == 5.0

    sensor._entry.options["spot_pricing_model"] = "fixed_fee"
    sensor._entry.options["spot_fixed_fee_mwh"] = 100.0
    fee_price = sensor._calculate_final_price_15min(2.0, dt)
    assert fee_price == 3.1


def test_calculate_attributes_and_state(monkeypatch):
    sensor = _make_sensor(
        monkeypatch,
        {
            "dual_tariff_enabled": False,
            "spot_pricing_model": "percentage",
            "spot_positive_fee_percent": 0.0,
            "spot_negative_fee_percent": 0.0,
            "distribution_fee_vt_kwh": 0.0,
            "distribution_fee_nt_kwh": 0.0,
            "vat_rate": 0.0,
        },
    )

    fixed_now = datetime(2025, 1, 1, 12, 7, 0)
    monkeypatch.setattr(price15_module, "dt_now", lambda: fixed_now)

    sensor._spot_data_15min = {
        "prices15m_czk_kwh": {
            "2025-01-01T11:45:00": 2.0,
            "2025-01-01T12:00:00": 2.5,
            "2025-01-01T12:15:00": 3.0,
        }
    }

    state = sensor._calculate_current_state()
    assert state == 2.5

    attrs = sensor._calculate_attributes()
    assert attrs["current_interval"] == 0
    assert attrs["price_min"] == 2.5
    assert attrs["price_max"] == 3.0
    assert attrs["price_avg"] == 2.75
