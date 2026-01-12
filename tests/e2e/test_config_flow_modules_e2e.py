from __future__ import annotations

import pytest

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
        "data_source_mode": data_source_module.DATA_SOURCE_LOCAL_ONLY,
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
    assert data["config"]["enable_boiler"] is True
    assert data["config"]["enable_dashboard"] is True
