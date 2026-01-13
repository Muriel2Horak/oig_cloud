from __future__ import annotations

import pytest

import logging

from custom_components.oig_cloud import async_update_options
from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud.core import data_source as data_source_module


@pytest.mark.e2e
async def test_config_flow_modules_enable_disable(e2e_setup_with_options):
    entry_options = {
        "box_id": "2206237016",
        "enable_statistics": False,
        "enable_solar_forecast": False,
        "enable_battery_prediction": False,
        "enable_pricing": False,
        "enable_extended_sensors": True,
        "enable_chmu_warnings": False,
        "enable_dashboard": False,
        "enable_boiler": False,
        "enable_auto": False,
        "balancing_enabled": True,
        "data_source_mode": data_source_module.DATA_SOURCE_CLOUD_ONLY,
    }
    hass, entry = await e2e_setup_with_options(entry_options)
    data = hass.data[DOMAIN][entry.entry_id]

    assert data["solar_forecast"] is None
    assert data["balancing_manager"] is None
    assert data["config"]["enable_statistics"] is False
    assert data["config"]["enable_pricing"] is False
    assert data["config"]["enable_boiler"] is False
    assert data["config"]["enable_dashboard"] is False


@pytest.mark.e2e
async def test_config_flow_modules_options_update(e2e_setup):
    hass, entry = e2e_setup
    data = hass.data[DOMAIN][entry.entry_id]

    assert data["config"]["enable_statistics"] is True
    assert data["config"]["enable_pricing"] is True
    assert data["config"]["enable_boiler"] is False
    assert data["config"]["enable_dashboard"] is True


@pytest.mark.e2e
@pytest.mark.parametrize(
    "entry_options,expect_solar,expect_ote",
    [
        (
            {
                "box_id": "2206237016",
                "enable_statistics": True,
                "enable_solar_forecast": True,
                "enable_battery_prediction": True,
                "enable_pricing": True,
                "enable_extended_sensors": True,
                "enable_chmu_warnings": True,
                "enable_dashboard": True,
                "enable_boiler": False,
                "enable_auto": True,
                "balancing_enabled": False,
                "data_source_mode": data_source_module.DATA_SOURCE_CLOUD_ONLY,
            },
            True,
            True,
        ),
        (
            {
                "box_id": "2206237016",
                "enable_statistics": False,
                "enable_solar_forecast": False,
                "enable_battery_prediction": False,
                "enable_pricing": False,
                "enable_extended_sensors": False,
                "enable_chmu_warnings": False,
                "enable_dashboard": False,
                "enable_boiler": False,
                "enable_auto": False,
                "balancing_enabled": False,
                "data_source_mode": data_source_module.DATA_SOURCE_CLOUD_ONLY,
            },
            False,
            False,
        ),
    ],
)
async def test_config_flow_module_combinations(
    e2e_setup_with_options, entry_options, expect_solar, expect_ote
):
    hass, entry = await e2e_setup_with_options(entry_options)
    data = hass.data[DOMAIN][entry.entry_id]

    assert data["solar_forecast"] is not None if expect_solar else data["solar_forecast"] is None
    assert data["ote_api"] is not None if expect_ote else data["ote_api"] is None


@pytest.mark.e2e
async def test_options_upgrade_toggle_dashboard(e2e_setup, caplog):
    hass, entry = e2e_setup
    caplog.set_level(logging.WARNING)

    await async_update_options(hass, entry)
    data = hass.data[DOMAIN][entry.entry_id]
    assert data["dashboard_enabled"] is True
    assert data["config"]["enable_dashboard"] is True

    hass.config_entries.async_update_entry(
        entry, options={**entry.options, "enable_dashboard": False}
    )
    entry.hass = hass
    await async_update_options(hass, entry)

    data = hass.data[DOMAIN][entry.entry_id]
    assert data["dashboard_enabled"] is False
    assert data["config"]["enable_dashboard"] is False

    oig_logs = [
        record
        for record in caplog.records
        if record.name.startswith("custom_components.oig_cloud")
        and record.levelno >= logging.WARNING
    ]
    assert not oig_logs


@pytest.mark.e2e
async def test_setup_emits_no_warnings(e2e_setup_with_options, caplog):
    caplog.set_level(logging.WARNING)
    entry_options = {
        "box_id": "2206237016",
        "enable_statistics": True,
        "enable_solar_forecast": True,
        "enable_battery_prediction": True,
        "enable_pricing": True,
        "enable_extended_sensors": True,
        "enable_chmu_warnings": True,
        "enable_dashboard": True,
        "enable_boiler": False,
        "enable_auto": True,
        "balancing_enabled": False,
        "data_source_mode": data_source_module.DATA_SOURCE_CLOUD_ONLY,
    }
    await e2e_setup_with_options(entry_options)

    oig_logs = [
        record
        for record in caplog.records
        if record.name.startswith("custom_components.oig_cloud")
        and record.levelno >= logging.WARNING
    ]
    assert not oig_logs


@pytest.mark.e2e
async def test_options_update_triggers_reload(e2e_setup, monkeypatch):
    hass, entry = e2e_setup
    called = {"reload": False}

    async def _fake_reload(_entry_id):
        called["reload"] = True

    monkeypatch.setattr(hass.config_entries, "async_reload", _fake_reload)

    hass.config_entries.async_update_entry(
        entry, options={**entry.options, "_needs_reload": True}
    )
    entry.hass = hass
    await async_update_options(hass, entry)

    assert called["reload"] is True
