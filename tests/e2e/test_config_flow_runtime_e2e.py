from __future__ import annotations

from typing import Any, Dict
from types import SimpleNamespace

import pytest

import custom_components.oig_cloud as init_module
from custom_components.oig_cloud.battery_forecast.data import (
    solar_forecast as solar_forecast_module,
)
from custom_components.oig_cloud.config.schema import (
    CONF_SOLAR_FORECAST_API_KEY,
    CONF_SOLAR_FORECAST_PROVIDER,
    CONF_SOLAR_FORECAST_STRING1_AZIMUTH,
    CONF_SOLAR_FORECAST_STRING1_DECLINATION,
    CONF_SOLAR_FORECAST_STRING1_ENABLED,
    CONF_SOLAR_FORECAST_STRING1_KWP,
    CONF_SOLCAST_API_KEY,
)
from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud.core import data_source as data_source_module


@pytest.mark.e2e
async def test_intervals_and_debounce_applied(e2e_setup_with_options):
    entry_options: Dict[str, Any] = {
        "box_id": "2206237016",
        "enable_statistics": True,
        "enable_solar_forecast": False,
        "enable_battery_prediction": False,
        "enable_pricing": False,
        "enable_extended_sensors": True,
        "enable_chmu_warnings": False,
        "enable_dashboard": False,
        "enable_boiler": False,
        "enable_auto": False,
        "balancing_enabled": False,
        "standard_scan_interval": 60,
        "extended_scan_interval": 600,
        "local_event_debounce_ms": 500,
        "data_source_mode": data_source_module.DATA_SOURCE_CLOUD_ONLY,
    }

    hass, entry = await e2e_setup_with_options(entry_options)
    data = hass.data[DOMAIN][entry.entry_id]

    coordinator = data["coordinator"]
    assert coordinator.standard_interval == 60
    assert coordinator.extended_interval == 600

    controller = data.get("data_source_controller")
    assert controller is not None
    assert controller._debouncer.cooldown == pytest.approx(0.5)


@pytest.mark.e2e
async def test_solar_provider_and_strings_applied(e2e_setup_with_options):
    entry_options: Dict[str, Any] = {
        "box_id": "2206237016",
        "enable_statistics": True,
        "enable_solar_forecast": True,
        "enable_battery_prediction": False,
        "enable_pricing": False,
        "enable_extended_sensors": True,
        "enable_chmu_warnings": False,
        "enable_dashboard": False,
        "enable_boiler": False,
        "enable_auto": False,
        "balancing_enabled": False,
        "solar_forecast_provider": "solcast",
        "solcast_api_key": "test-solcast-key",
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_declination": 30,
        "solar_forecast_string1_azimuth": 10,
        "solar_forecast_string1_kwp": 6.2,
        "solar_forecast_string2_enabled": True,
        "solar_forecast_string2_declination": 35,
        "solar_forecast_string2_azimuth": 180,
        "solar_forecast_string2_kwp": 4.2,
        "data_source_mode": data_source_module.DATA_SOURCE_CLOUD_ONLY,
    }

    hass, entry = await e2e_setup_with_options(entry_options)
    data = hass.data[DOMAIN][entry.entry_id]
    solar = data["solar_forecast"]

    assert solar is not None
    assert solar["enabled"] is True

    cfg = solar["config"]
    assert cfg["solar_forecast_provider"] == "solcast"
    assert cfg["solcast_api_key"] == "test-solcast-key"
    assert cfg["solar_forecast_string2_enabled"] is True
    assert cfg["solar_forecast_string2_kwp"] == 4.2


@pytest.mark.e2e
async def test_reconfigure_updates_modules_and_intervals(e2e_setup_with_options):
    initial_options: Dict[str, Any] = {
        "box_id": "2206237016",
        "enable_statistics": True,
        "enable_solar_forecast": False,
        "enable_battery_prediction": False,
        "enable_pricing": False,
        "enable_extended_sensors": True,
        "enable_chmu_warnings": False,
        "enable_dashboard": False,
        "enable_boiler": False,
        "enable_auto": False,
        "balancing_enabled": False,
        "standard_scan_interval": 30,
        "extended_scan_interval": 300,
        "data_source_mode": data_source_module.DATA_SOURCE_CLOUD_ONLY,
    }

    hass, entry = await e2e_setup_with_options(initial_options)
    data = hass.data[DOMAIN][entry.entry_id]

    assert data["solar_forecast"] is None
    assert data["coordinator"].standard_interval == 30
    assert data["coordinator"].extended_interval == 300

    updated_options = dict(entry.options)
    updated_options.update(
        {
            "enable_solar_forecast": True,
            "standard_scan_interval": 60,
            "extended_scan_interval": 900,
            "solar_forecast_provider": "forecast_solar",
        }
    )
    hass.config_entries.async_update_entry(entry, options=updated_options)
    entry.hass = hass

    await init_module.async_reload_entry(entry)

    data = hass.data[DOMAIN][entry.entry_id]
    assert data["solar_forecast"] is not None
    assert data["coordinator"].standard_interval == 60
    assert data["coordinator"].extended_interval == 900


@pytest.mark.e2e
async def test_solar_forecast_provider_switch_updates_config(e2e_setup_with_options):
    entry_options: Dict[str, Any] = {
        "box_id": "2206237016",
        "enable_statistics": True,
        "enable_solar_forecast": True,
        "enable_battery_prediction": False,
        "enable_pricing": False,
        "enable_extended_sensors": True,
        "enable_chmu_warnings": False,
        "enable_dashboard": False,
        "enable_boiler": False,
        "enable_auto": False,
        "balancing_enabled": False,
        "solar_forecast_provider": "solcast",
        "solcast_api_key": "test-solcast-key",
        "solar_forecast_string2_enabled": True,
        "solar_forecast_string2_kwp": 4.2,
        "data_source_mode": data_source_module.DATA_SOURCE_CLOUD_ONLY,
    }

    hass, entry = await e2e_setup_with_options(entry_options)
    data = hass.data[DOMAIN][entry.entry_id]
    cfg = data["solar_forecast"]["config"]

    assert cfg["solar_forecast_provider"] == "solcast"
    assert cfg["solcast_api_key"] == "test-solcast-key"
    assert cfg["solar_forecast_string2_enabled"] is True

    updated_options = dict(entry.options)
    updated_options.update(
        {
            "solar_forecast_provider": "forecast_solar",
            "solcast_api_key": "",
            "solar_forecast_string2_enabled": False,
        }
    )
    hass.config_entries.async_update_entry(entry, options=updated_options)
    entry.hass = hass
    await init_module.async_reload_entry(entry)

    data = hass.data[DOMAIN][entry.entry_id]
    cfg = data["solar_forecast"]["config"]
    assert cfg["solar_forecast_provider"] == "forecast_solar"
    assert cfg.get("solcast_api_key", "") in ("", None)
    assert cfg["solar_forecast_string2_enabled"] is False


@pytest.mark.e2e
async def test_solar_forecast_strings_follow_state(e2e_setup_with_options):
    entry_options: Dict[str, Any] = {
        "box_id": "2206237016",
        "enable_statistics": True,
        "enable_solar_forecast": True,
        "enable_battery_prediction": False,
        "enable_pricing": False,
        "enable_extended_sensors": True,
        "enable_chmu_warnings": False,
        "enable_dashboard": False,
        "enable_boiler": False,
        "enable_auto": False,
        "balancing_enabled": False,
        "data_source_mode": data_source_module.DATA_SOURCE_CLOUD_ONLY,
    }

    hass, entry = await e2e_setup_with_options(entry_options)
    box_id = entry.options["box_id"]
    entity_id = f"sensor.oig_{box_id}_solar_forecast"
    sample_time = "2026-01-01T10:00:00+00:00"

    hass.states.async_set(
        entity_id,
        "ok",
        {
            "today_hourly_total_kw": {sample_time: 1.0},
            "tomorrow_hourly_total_kw": {"2026-01-02T10:00:00+00:00": 2.0},
            "today_hourly_string1_kw": {sample_time: 0.6},
            "today_hourly_string2_kw": {sample_time: 0.4},
        },
    )

    sensor = SimpleNamespace(
        _hass=hass,
        _box_id=box_id,
        _config_entry=entry,
        coordinator=SimpleNamespace(solar_forecast_data=None),
        _log_rate_limited=lambda *_args, **_kwargs: None,
    )

    forecast = solar_forecast_module.get_solar_forecast(sensor)
    assert forecast["today"][sample_time] == 1.0

    strings = solar_forecast_module.get_solar_forecast_strings(sensor)
    assert strings["today_string1_kw"][sample_time] == 0.6
    assert strings["today_string2_kw"][sample_time] == 0.4

    hass.config_entries.async_update_entry(
        entry, options={**entry.options, "enable_solar_forecast": False}
    )
    assert solar_forecast_module.get_solar_forecast(sensor) == {}


@pytest.mark.e2e
@pytest.mark.parametrize(
    "provider, key_mode, string1_enabled, string2_enabled",
    [
        ("forecast_solar", "none", True, False),
        ("forecast_solar", "with_key", True, False),
        ("solcast", "with_key", True, False),
        ("solcast", "with_key", True, True),
    ],
)
async def test_solar_provider_and_strings_combinations(
    e2e_setup_with_options,
    ha_config_values,
    provider,
    key_mode,
    string1_enabled,
    string2_enabled,
):
    solar_key = ha_config_values.get("SOLAR_FORECAST_API_KEY", "")
    solcast_key = ha_config_values.get("SOLCAST_API_KEY", "")

    if provider == "forecast_solar" and key_mode == "with_key" and not solar_key:
        pytest.skip("Missing SOLAR_FORECAST_API_KEY for forecast solar test")
    if provider == "solcast" and not solcast_key:
        pytest.skip("Missing SOLCAST_API_KEY for solcast test")

    entry_options: Dict[str, Any] = {
        "box_id": "2206237016",
        "enable_statistics": True,
        "enable_solar_forecast": True,
        "enable_battery_prediction": False,
        "enable_pricing": False,
        "enable_extended_sensors": True,
        "enable_chmu_warnings": False,
        "enable_dashboard": False,
        "enable_boiler": False,
        "enable_auto": False,
        "balancing_enabled": False,
        "data_source_mode": data_source_module.DATA_SOURCE_CLOUD_ONLY,
        CONF_SOLAR_FORECAST_PROVIDER: provider,
        CONF_SOLAR_FORECAST_API_KEY: solar_key if key_mode == "with_key" else "",
        CONF_SOLCAST_API_KEY: solcast_key if provider == "solcast" else "",
        CONF_SOLAR_FORECAST_STRING1_ENABLED: string1_enabled,
        CONF_SOLAR_FORECAST_STRING1_KWP: 5.5,
        CONF_SOLAR_FORECAST_STRING1_DECLINATION: 35,
        CONF_SOLAR_FORECAST_STRING1_AZIMUTH: 0,
        "solar_forecast_string2_enabled": string2_enabled,
        "solar_forecast_string2_kwp": 4.2,
        "solar_forecast_string2_declination": 30,
        "solar_forecast_string2_azimuth": 180,
    }

    hass, entry = await e2e_setup_with_options(entry_options)
    data = hass.data[DOMAIN][entry.entry_id]
    cfg = data["solar_forecast"]["config"]

    assert cfg[CONF_SOLAR_FORECAST_PROVIDER] == provider
    assert cfg[CONF_SOLAR_FORECAST_STRING1_ENABLED] is string1_enabled
    assert cfg["solar_forecast_string2_enabled"] is string2_enabled
    if provider == "forecast_solar":
        assert cfg[CONF_SOLAR_FORECAST_API_KEY] == (solar_key if key_mode == "with_key" else "")
    else:
        assert cfg[CONF_SOLCAST_API_KEY] == solcast_key
