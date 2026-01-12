from __future__ import annotations

import pytest
from custom_components.oig_cloud.const import DOMAIN


@pytest.mark.e2e
async def test_services_registered(e2e_setup):
    hass, _entry = e2e_setup
    services = hass.services.async_services()
    assert "oig_cloud" in services

    names = set(services["oig_cloud"].keys())
    expected = {
        "set_box_mode",
        "set_grid_delivery",
        "set_boiler_mode",
        "set_formating_mode",
        "update_solar_forecast",
        "save_dashboard_tiles",
        "get_dashboard_tiles",
    }
    assert expected.issubset(names)


@pytest.mark.e2e
async def test_service_set_box_mode_calls_api(e2e_setup, mock_api):
    hass, _entry = e2e_setup
    await hass.services.async_call(
        DOMAIN,
        "set_box_mode",
        {"mode": "Home 1", "acknowledgement": True},
        blocking=True,
    )
    mock_api.set_box_mode.assert_awaited()


@pytest.mark.e2e
async def test_service_set_grid_delivery_calls_api(e2e_setup, mock_api):
    hass, _entry = e2e_setup
    await hass.services.async_call(
        DOMAIN,
        "set_grid_delivery",
        {
            "limit": 5000,
            "acknowledgement": True,
            "warning": True,
        },
        blocking=True,
    )
    mock_api.set_grid_delivery_limit.assert_awaited()


@pytest.mark.e2e
async def test_service_set_boiler_mode_calls_api(e2e_setup, mock_api):
    hass, _entry = e2e_setup
    await hass.services.async_call(
        DOMAIN,
        "set_boiler_mode",
        {"mode": "CBB", "acknowledgement": True},
        blocking=True,
    )
    mock_api.set_boiler_mode.assert_awaited()


@pytest.mark.e2e
async def test_service_set_formating_mode_calls_api(e2e_setup, mock_api):
    hass, _entry = e2e_setup
    await hass.services.async_call(
        DOMAIN,
        "set_formating_mode",
        {"mode": "Nabíjet", "limit": 80, "acknowledgement": True},
        blocking=True,
    )
    mock_api.set_formating_mode.assert_awaited_with("80")


@pytest.mark.e2e
async def test_service_update_solar_forecast_calls_update(e2e_setup):
    hass, entry = e2e_setup
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    await hass.services.async_call(
        DOMAIN, "update_solar_forecast", {}, blocking=True
    )
    coordinator.solar_forecast.async_update.assert_awaited()


@pytest.mark.e2e
async def test_service_dashboard_tiles_roundtrip(e2e_setup):
    hass, _entry = e2e_setup
    config = {"tiles_left": [], "tiles_right": [], "version": 1}
    await hass.services.async_call(
        DOMAIN,
        "save_dashboard_tiles",
        {"config": '{"tiles_left": [], "tiles_right": [], "version": 1}'},
        blocking=True,
    )
    response = await hass.services.async_call(
        DOMAIN,
        "get_dashboard_tiles",
        {},
        blocking=True,
        return_response=True,
    )
    assert response["config"] == config
