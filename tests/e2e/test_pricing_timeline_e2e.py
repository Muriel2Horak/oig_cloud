from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.data import pricing as pricing_module
from custom_components.oig_cloud.battery_forecast.utils_common import (
    get_tariff_for_datetime,
)


def _build_sensor(config: dict, spot_prices: dict) -> SimpleNamespace:
    config_entry = SimpleNamespace(options=config, data={})
    coordinator = SimpleNamespace(data={"spot_prices": spot_prices}, config_entry=config_entry)
    return SimpleNamespace(_config_entry=config_entry, coordinator=coordinator, _hass=None)


@pytest.mark.e2e
async def test_tariff_config_and_spot_vs_fixed_pricing():
    base_config = {
        "dual_tariff_enabled": True,
        "tariff_weekend_same_as_weekday": False,
        "tariff_vt_start_weekday": "6",
        "tariff_nt_start_weekday": "22,2",
        "tariff_vt_start_weekend": "8",
        "tariff_nt_start_weekend": "20,0",
        "distribution_fee_vt_kwh": 1.0,
        "distribution_fee_nt_kwh": 0.5,
        "vat_rate": 21.0,
    }

    weekday_ts = "2026-01-05T07:00:00+00:00"  # Monday, VT
    weekend_ts = "2026-01-10T07:00:00+00:00"  # Saturday, NT (before weekend VT at 8)

    weekday_dt = datetime.fromisoformat(weekday_ts)
    weekend_dt = datetime.fromisoformat(weekend_ts)

    assert get_tariff_for_datetime(weekday_dt, base_config) == "VT"
    assert get_tariff_for_datetime(weekend_dt, base_config) == "NT"

    spot_prices = {
        "prices15m_czk_kwh": {
            weekday_ts: 4.0,
            weekend_ts: 4.0,
        }
    }

    fixed_config = {
        **base_config,
        "spot_pricing_model": "fixed_prices",
        "fixed_commercial_price_vt": 5.0,
        "fixed_commercial_price_nt": 3.0,
    }

    fixed_sensor = _build_sensor(fixed_config, spot_prices)
    fixed_timeline = await pricing_module.get_spot_price_timeline(fixed_sensor)
    fixed_prices = {item["time"]: item["price"] for item in fixed_timeline}

    assert fixed_prices[weekday_ts] == pytest.approx(7.26)
    assert fixed_prices[weekend_ts] == pytest.approx(4.24)

    spot_config = {
        **base_config,
        "spot_pricing_model": "percentage",
        "spot_positive_fee_percent": 10.0,
        "spot_negative_fee_percent": 9.0,
    }

    spot_sensor = _build_sensor(spot_config, spot_prices)
    spot_timeline = await pricing_module.get_spot_price_timeline(spot_sensor)
    spot_prices_out = {item["time"]: item["price"] for item in spot_timeline}

    assert spot_prices_out[weekday_ts] == pytest.approx(6.53)
    assert spot_prices_out[weekend_ts] == pytest.approx(5.93)

    assert spot_prices_out[weekday_ts] != fixed_prices[weekday_ts]


@pytest.mark.e2e
async def test_pricing_timeline_recomputes_after_config_change():
    base_config = {
        "dual_tariff_enabled": True,
        "tariff_weekend_same_as_weekday": True,
        "tariff_vt_start_weekday": "6",
        "tariff_nt_start_weekday": "22",
        "distribution_fee_vt_kwh": 1.0,
        "distribution_fee_nt_kwh": 0.5,
        "vat_rate": 21.0,
        "spot_pricing_model": "percentage",
        "spot_positive_fee_percent": 10.0,
        "spot_negative_fee_percent": 9.0,
    }

    ts = "2026-01-05T07:00:00+00:00"
    spot_prices = {"prices15m_czk_kwh": {ts: 4.0}}

    sensor = _build_sensor(base_config, spot_prices)
    timeline_before = await pricing_module.get_spot_price_timeline(sensor)
    assert timeline_before
    first_price = timeline_before[0]["price"]

    sensor._config_entry.options = {
        **base_config,
        "spot_pricing_model": "fixed_prices",
        "fixed_commercial_price_vt": 5.0,
        "fixed_commercial_price_nt": 3.0,
    }
    timeline_after = await pricing_module.get_spot_price_timeline(sensor)
    assert timeline_after
    second_price = timeline_after[0]["price"]

    assert first_price != second_price


@pytest.mark.e2e
async def test_spot_prices_fallback_to_ote_cache(monkeypatch):
    ts = "2026-01-05T07:00:00+00:00"
    ote_data = {"prices15m_czk_kwh": {ts: 4.0}}
    called = {"ote": False}

    async def _fake_ote(_sensor):
        called["ote"] = True
        return ote_data

    monkeypatch.setattr(pricing_module, "get_spot_data_from_ote_cache", _fake_ote)

    config = {
        "dual_tariff_enabled": False,
        "vat_rate": 21.0,
        "spot_pricing_model": "percentage",
        "spot_positive_fee_percent": 10.0,
        "spot_negative_fee_percent": 9.0,
        "distribution_fee_vt_kwh": 1.0,
        "distribution_fee_nt_kwh": 1.0,
    }
    sensor = _build_sensor(config, spot_prices={})
    sensor._hass = object()
    sensor._box_id = "2206237016"

    timeline = await pricing_module.get_spot_price_timeline(sensor)

    assert called["ote"] is True
    assert timeline
    assert timeline[0]["time"] == ts
