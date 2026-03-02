"""Test pro ověření, že battery forecast data se správně generují a přenášejí."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.data.pricing import (
    _build_price_timeline,
)
from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
    _filter_price_timeline,
)
from custom_components.oig_cloud.battery_forecast.presentation.state_attributes import (
    build_extra_state_attributes,
    calculate_data_hash,
)


def _build_sensor(
    spot_prices: dict, config: dict
) -> SimpleNamespace:
    """Vytvoří testovací sensor."""
    coordinator = SimpleNamespace(
        data={"spot_prices": spot_prices},
        config_entry=SimpleNamespace(options=config),
    )
    return SimpleNamespace(
        _config_entry=SimpleNamespace(options=config),
        coordinator=coordinator,
        _hass=None,
        _box_id="123",
        _timeline_data=spot_prices.get("prices15m_czk_kwh") or [
            {"time": ts} for ts in spot_prices
            if not isinstance(spot_prices[ts], list)
        ],
        _last_update=datetime.now(),
        _data_hash="test_hash",
        _get_max_battery_capacity=lambda: 10.0,
        _get_min_battery_capacity=lambda: 1.0,
    )


@pytest.mark.asyncio
async def test_timeline_data_from_spot_prices():
    """Test, že timeline data se správně generují ze spot prices."""
    now = datetime.now()
    prices = {
        "2026-02-12T00:00:00+01:00": 4.0,
        "2026-02-12T00:15:00+01:00": 4.5,
        "2026-02-12T00:30:00+01:00": 5.0,
        "2026-02-12T01:00:00+01:00": 3.5,
        "2026-02-12T01:15:00+01:00": 3.0,
    }

    timeline = _build_price_timeline(prices, label="spot")

    assert len(timeline) == len(prices)
    assert all(item["time"] in prices for item in timeline)
    assert all("price" in item for item in timeline)


@pytest.mark.asyncio
async def test_extra_state_attributes_contain_timeline_info():
    """Test, že extra_state_attributes obsahují informace o timeline."""
    prices = {
        "2026-02-12T00:00:00+01:00": 4.0,
        "2026-02-12T00:15:00+01:00": 4.5,
    }

    sensor = _build_sensor(prices, {})

    attrs = build_extra_state_attributes(
        sensor, debug_expose_baseline_timeline=False
    )

    assert "timeline_points_count" in attrs
    assert attrs["timeline_points_count"] == 2
    assert "timeline_horizon_hours" in attrs
    assert attrs["timeline_horizon_hours"] == pytest.approx(0.5)
    assert "api_endpoint" in attrs
    assert "api_note" in attrs
    assert "timeline_data" not in attrs  # Production mode - timeline data přes API


@pytest.mark.asyncio
async def test_extra_state_attributes_debug_mode_contains_timeline():
    """Test, že v debug módu se timeline data přidávají do attributes."""
    prices = {
        "2026-02-12T00:00:00+01:00": 4.0,
        "2026-02-12T00:15:00+01:00": 4.5,
    }

    sensor = _build_sensor(prices, {})

    attrs = build_extra_state_attributes(
        sensor, debug_expose_baseline_timeline=True
    )

    assert "timeline_points_count" in attrs
    assert "timeline_data" in attrs
    assert isinstance(attrs["timeline_data"], list)
    assert len(attrs["timeline_data"]) == 2


@pytest.mark.asyncio
async def test_price_timeline_filtering():
    """Test, že timeline filtering funguje správně."""
    now = datetime(2026, 2, 12, 7, 0, 0)

    all_prices = [
        {"time": "2026-02-12T00:00:00", "price": 4.0},
        {"time": "2026-02-12T06:00:00", "price": 5.0},
        {"time": "2026-02-12T07:00:00", "price": 3.0},
    ]

    sensor = SimpleNamespace(
        _box_id="123",
        _log_rate_limited=lambda *args, **kwargs: None,
    )

    filtered = _filter_price_timeline(
        all_prices, now, "test", sensor
    )

    assert len(filtered) == 1
    assert all(item["time"] >= "2026-02-12T07:00:00" for item in filtered)


@pytest.mark.asyncio
async def test_data_hash_calculation():
    """Test, že data hash se správně vypočítá."""
    timeline = [
        {"time": "2026-02-12T00:00:00+01:00", "price": 4.0},
        {"time": "2026-02-12T00:15:00+01:00", "price": 4.5},
    ]

    hash1 = calculate_data_hash(timeline)
    hash2 = calculate_data_hash(timeline)

    assert hash1 == hash2
    assert isinstance(hash1, str)
    assert len(hash1) > 10


@pytest.mark.asyncio
async def test_empty_timeline_data():
    """Test, že prázdná timeline data se správně zpracují."""
    sensor = SimpleNamespace(
        _timeline_data=[],
        _last_update=datetime.now(),
        _data_hash="empty",
        _box_id="123",
        _get_max_battery_capacity=lambda: 15.36,
        _get_min_battery_capacity=lambda: 4.61,
        _config_entry=SimpleNamespace(options={}),
    )

    attrs = build_extra_state_attributes(
        sensor, debug_expose_baseline_timeline=False
    )

    assert attrs["timeline_points_count"] == 0
    assert attrs["timeline_horizon_hours"] == 0
