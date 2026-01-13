from __future__ import annotations

import pytest

from custom_components.oig_cloud.const import DOMAIN

pytestmark = pytest.mark.e2e_mock


@pytest.mark.e2e
async def test_frontend_config_flow_renders(e2e_setup):
    hass, entry = e2e_setup
    data = hass.data[DOMAIN][entry.entry_id]

    assert data["config"]["enable_dashboard"] is True
    assert data["dashboard_enabled"] is True


@pytest.mark.e2e
async def test_frontend_tile_add_remove(e2e_setup):
    hass, _entry = e2e_setup

    await hass.services.async_call(
        DOMAIN,
        "save_dashboard_tiles",
        {"config": '{"tiles_left": ["battery"], "tiles_right": [], "version": 1}'},
        blocking=True,
    )
    response = await hass.services.async_call(
        DOMAIN,
        "get_dashboard_tiles",
        {},
        blocking=True,
        return_response=True,
    )
    assert response["config"]["tiles_left"] == ["battery"]

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
    assert response["config"]["tiles_left"] == []
