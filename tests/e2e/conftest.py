from __future__ import annotations

from types import SimpleNamespace
from typing import Any, Dict
from unittest.mock import AsyncMock

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

import custom_components.oig_cloud as init_module
from custom_components.oig_cloud.const import CONF_PASSWORD, CONF_USERNAME, DOMAIN
from custom_components.oig_cloud.core import data_source as data_source_module


@pytest.fixture
def e2e_entry_options() -> Dict[str, Any]:
    return {
        "box_id": "2206237016",
        "enable_statistics": True,
        "enable_solar_forecast": True,
        "enable_battery_prediction": True,
        "enable_pricing": True,
        "enable_extended_sensors": True,
        "enable_chmu_warnings": True,
        "enable_dashboard": True,
        "enable_boiler": True,
        "enable_auto": True,
        "balancing_enabled": True,
        "data_source_mode": data_source_module.DATA_SOURCE_LOCAL_ONLY,
    }


async def _setup_entry(hass, mock_api, entry_options):
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={CONF_USERNAME: "user", CONF_PASSWORD: "pass"},
        options=entry_options,
        title="OIG Cloud",
    )
    entry.add_to_hass(hass)

    class DummyCoordinator:
        def __init__(self, hass, *_args, **_kwargs):
            self.hass = hass
            self.api = mock_api
            self.data = {}
            self.solar_forecast = SimpleNamespace(async_update=AsyncMock())
            self.async_request_refresh = AsyncMock()

        async def async_config_entry_first_refresh(self):
            return None

    def _data_source_state(*_a, **_k):
        return SimpleNamespace(
            configured_mode=data_source_module.DATA_SOURCE_LOCAL_ONLY,
            effective_mode=data_source_module.DATA_SOURCE_LOCAL_ONLY,
            local_available=True,
            last_local_data=None,
            reason="local",
        )

    async def _forward_entry_setups(_entry, _platforms):
        return None

    async def _setup_frontend(_hass, _entry):
        return None

    hass.config_entries.async_forward_entry_setups = _forward_entry_setups

    init_module.OigCloudApi = lambda *_a, **_k: mock_api
    init_module.OigCloudCoordinator = DummyCoordinator
    init_module.get_data_source_state = _data_source_state
    init_module._setup_frontend_panel = _setup_frontend
    init_module.setup_planning_api_views = lambda *_a, **_k: None
    init_module.setup_api_endpoints = lambda *_a, **_k: None

    hass.http = SimpleNamespace(register_view=lambda *_a, **_k: None)

    assert await init_module.async_setup_entry(hass, entry)
    await hass.async_block_till_done()

    box_id = entry_options["box_id"]
    hass.states.async_set(f"sensor.oig_{box_id}_box_prms_mode", "Home 2")
    hass.states.async_set(
        f"sensor.oig_{box_id}_invertor_prms_to_grid", "Vypnuto / Off"
    )
    hass.states.async_set(
        f"sensor.oig_{box_id}_invertor_prm1_p_max_feed_grid", "1000"
    )
    hass.states.async_set(f"sensor.oig_{box_id}_boiler_manual_mode", "Manuální")

    return hass, entry


@pytest.fixture
async def e2e_setup(hass, mock_api, e2e_entry_options):
    return await _setup_entry(hass, mock_api, e2e_entry_options)


@pytest.fixture
async def e2e_setup_with_options(hass, mock_api):
    async def _factory(entry_options: Dict[str, Any]):
        return await _setup_entry(hass, mock_api, entry_options)

    return _factory
