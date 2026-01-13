from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.api.api_chmu import ChmuApiError
from custom_components.oig_cloud.battery_forecast.data import pricing as pricing_module
from custom_components.oig_cloud.entities.chmu_sensor import OigCloudChmuSensor
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)


def _spot_payload(date_prefix: str, price: float) -> dict:
    key = f"{date_prefix}T00:00:00"
    return {
        "prices_czk_kwh": {key: price},
        "prices15m_czk_kwh": {key: price},
        "hours_count": 1,
    }


@pytest.mark.e2e
async def test_ote_cache_then_refresh_after_13(
    e2e_setup, freezer, monkeypatch
) -> None:
    hass, entry = e2e_setup
    coordinator = hass.data["oig_cloud"][entry.entry_id]["coordinator"]

    freezer.move_to("2026-01-01 13:05:00+01:00")

    cached = _spot_payload("2026-01-01", 3.0)
    updated = _spot_payload("2026-01-01", 3.0)
    updated["prices_czk_kwh"]["2026-01-02T00:00:00"] = 4.5
    updated["prices15m_czk_kwh"]["2026-01-02T00:00:00"] = 4.5
    updated["hours_count"] = 2

    coordinator.data = coordinator.data or {}
    coordinator.data["spot_prices"] = cached

    calls = {"count": 0}

    async def _fake_get_spot_prices(*_args, **_kwargs):
        calls["count"] += 1
        if calls["count"] < 3:
            return {}
        return updated

    monkeypatch.setattr(coordinator.ote_api, "get_spot_prices", _fake_get_spot_prices)

    await coordinator._hourly_fallback_check()
    assert coordinator.data["spot_prices"] == cached

    freezer.move_to("2026-01-01 13:10:00+01:00")
    await coordinator._hourly_fallback_check()
    assert coordinator.data["spot_prices"] == cached

    freezer.move_to("2026-01-01 13:35:00+01:00")
    await coordinator._hourly_fallback_check()

    assert "2026-01-02T00:00:00" in coordinator.data["spot_prices"]["prices_czk_kwh"]

    sensor = SimpleNamespace(
        _config_entry=entry,
        coordinator=coordinator,
        _hass=hass,
        _box_id=entry.options.get("box_id", "2206237016"),
    )
    timeline = await pricing_module.get_spot_price_timeline(sensor)
    assert any(point["time"].startswith("2026-01-02") for point in timeline)


@pytest.mark.e2e
async def test_chmu_keeps_cached_data_on_error(e2e_setup, monkeypatch) -> None:
    hass, entry = e2e_setup
    coordinator = hass.data["oig_cloud"][entry.entry_id]["coordinator"]

    sensor = OigCloudChmuSensor(
        coordinator,
        "chmu_warning_level",
        entry,
        {"identifiers": {("oig_cloud", "chmu")}},
    )
    sensor.hass = hass

    cached = {
        "last_update": datetime.now(timezone.utc).isoformat(),
        "all_warnings_count": 1,
        "local_warnings_count": 1,
        "severity_level": 1,
    }
    sensor._last_warning_data = dict(cached)
    sensor._attr_available = True

    monkeypatch.setattr(sensor, "_get_gps_coordinates", lambda: (50.0, 14.0))

    async def _boom(*_args, **_kwargs):
        raise ChmuApiError("down")

    monkeypatch.setattr(coordinator, "chmu_api", SimpleNamespace(get_warnings=_boom))

    await sensor._fetch_warning_data()

    assert sensor._attr_available is True
    assert sensor._last_warning_data == cached


@pytest.mark.e2e
async def test_forecast_solar_fallback_then_recovery(
    e2e_setup, monkeypatch
) -> None:
    hass, entry = e2e_setup
    coordinator = hass.data["oig_cloud"][entry.entry_id]["coordinator"]

    config_entry = SimpleNamespace(
        options={
            **dict(entry.options),
            "solar_forecast_provider": "forecast_solar",
        },
        data=dict(entry.data),
    )
    sensor = OigCloudSolarForecastSensor(
        coordinator,
        "solar_forecast",
        config_entry,
        {"identifiers": {("oig_cloud", "solar_forecast")}},
    )
    sensor.hass = hass

    cached = {"provider": "forecast_solar", "total_today_kwh": 5.0}
    sensor._last_forecast_data = dict(cached)
    coordinator.solar_forecast_data = dict(cached)

    calls = {"count": 0}

    async def _fake_fetch_strings(**_kwargs):
        calls["count"] += 1
        if calls["count"] == 1:
            raise asyncio.TimeoutError()
        return (
            {
                "result": {
                    "watts": {"2026-01-01T10:00:00+00:00": 1000.0},
                    "watt_hours_day": {"2026-01-01": 5.5},
                }
            },
            None,
        )

    monkeypatch.setattr(sensor, "_fetch_forecast_solar_strings", _fake_fetch_strings)

    await sensor.async_fetch_forecast_data()
    assert sensor._last_forecast_data == cached

    await sensor.async_fetch_forecast_data()
    assert sensor._last_forecast_data != cached
    assert coordinator.solar_forecast_data == sensor._last_forecast_data


@pytest.mark.e2e
async def test_solcast_fallback_then_recovery(e2e_setup, monkeypatch) -> None:
    hass, entry = e2e_setup
    coordinator = hass.data["oig_cloud"][entry.entry_id]["coordinator"]

    config_entry = SimpleNamespace(
        options={
            **dict(entry.options),
            "solar_forecast_provider": "solcast",
            "solcast_api_key": "test-key",
            "solar_forecast_string1_kwp": 4.0,
            "solar_forecast_string2_kwp": 0.0,
        },
        data=dict(entry.data),
    )

    sensor = OigCloudSolarForecastSensor(
        coordinator,
        "solar_forecast",
        config_entry,
        {"identifiers": {("oig_cloud", "solcast")}},
    )
    sensor.hass = hass

    cached = {"provider": "solcast", "total_today_kwh": 4.2}
    sensor._last_forecast_data = dict(cached)
    coordinator.solar_forecast_data = dict(cached)

    calls = {"count": 0}

    async def _fake_fetch_solcast(_current_time):
        calls["count"] += 1
        if calls["count"] == 1:
            raise asyncio.TimeoutError()
        sensor._last_forecast_data = {
            "provider": "solcast",
            "total_today_kwh": 4.8,
        }
        coordinator.solar_forecast_data = sensor._last_forecast_data

    monkeypatch.setattr(sensor, "_fetch_solcast_data", _fake_fetch_solcast)

    await sensor.async_fetch_forecast_data()
    assert sensor._last_forecast_data == cached

    await sensor.async_fetch_forecast_data()
    assert sensor._last_forecast_data != cached
    assert coordinator.solar_forecast_data == sensor._last_forecast_data
