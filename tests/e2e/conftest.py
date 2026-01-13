from __future__ import annotations

import os
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Dict
from unittest.mock import AsyncMock

import pytest
import pytest_socket
from pytest_homeassistant_custom_component.common import MockConfigEntry

import custom_components.oig_cloud as init_module
from custom_components.oig_cloud.const import CONF_PASSWORD, CONF_USERNAME, DOMAIN
from custom_components.oig_cloud.core import data_source as data_source_module


def pytest_collection_modifyitems(config, items) -> None:
    for item in items:
        if "tests/e2e/" in str(item.fspath):
            item.add_marker(pytest.mark.enable_socket)


def pytest_configure(config) -> None:
    config.option.force_enable_socket = True
    config.__socket_force_enabled = True
    config.option.disable_socket = False
    config.__socket_disabled = False
    config.option.allow_hosts = None
    config.__socket_allow_hosts = None


@pytest.fixture(autouse=True)
def _allow_sockets_for_e2e(pytestconfig):
    pytestconfig.__socket_force_enabled = True
    pytestconfig.__socket_disabled = False
    pytestconfig.__socket_allow_hosts = None
    pytest_socket.enable_socket()
    pytest_socket._remove_restrictions()
    yield


@pytest.hookimpl(trylast=True)
def pytest_runtest_setup(item) -> None:
    item.config.__socket_allow_hosts = None
    item.config.__socket_disabled = False
    item.config.__socket_force_enabled = True
    pytest_socket.enable_socket()
    pytest_socket._remove_restrictions()


def _read_ha_config() -> Dict[str, str]:
    config: Dict[str, str] = {}
    root = Path(__file__).resolve().parents[2]
    path = root / ".ha_config"
    if not path.exists():
        return config
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        config[key.strip()] = value.strip()
    return config


@pytest.fixture(scope="session")
def ha_config_values() -> Dict[str, str]:
    return _read_ha_config()


@pytest.fixture
def e2e_data_mode(request) -> str:
    marker = request.node.get_closest_marker("e2e_mock")
    if marker:
        return "mock"
    return os.getenv("E2E_DATA_MODE", "live")


@pytest.fixture
def live_credentials(ha_config_values) -> Dict[str, str]:
    return {
        "username": ha_config_values.get("OIG_LOGIN", ""),
        "password": ha_config_values.get("OIG_PASS", ""),
    }


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
        "enable_boiler": False,
        "enable_auto": True,
        "balancing_enabled": False,
        "data_source_mode": data_source_module.DATA_SOURCE_CLOUD_ONLY,
    }


async def _setup_entry(hass, entry_options, monkeypatch, *, data_mode, mock_api, live_credentials):
    pytest_socket.enable_socket()
    pytest_socket._remove_restrictions()
    if data_mode == "live":
        username = live_credentials.get("username") or ""
        password = live_credentials.get("password") or ""
        if not username or not password:
            pytest.skip("Missing OIG_LOGIN/OIG_PASS for live E2E mode")
        entry_data = {CONF_USERNAME: username, CONF_PASSWORD: password}
    else:
        entry_data = {CONF_USERNAME: "user", CONF_PASSWORD: "pass"}

    entry = MockConfigEntry(
        domain=DOMAIN,
        data=entry_data,
        options=entry_options,
        title="OIG Cloud",
    )
    entry.add_to_hass(hass)

    class DummyCoordinator:
        def __init__(
            self,
            hass,
            api,
            standard_interval: int = 30,
            extended_interval: int = 300,
            config_entry=None,
        ):
            self.hass = hass
            self.api = api
            self.standard_interval = standard_interval
            self.extended_interval = extended_interval
            self.config_entry = config_entry
            self.data = {}
            self.solar_forecast = SimpleNamespace(async_update=AsyncMock())
            self.async_request_refresh = AsyncMock()

        async def async_config_entry_first_refresh(self):
            return None

        def async_add_listener(self, _listener):
            def _unsub():
                return None

            return _unsub

    async def _forward_entry_setups(_entry, _platforms):
        return None

    async def _setup_frontend(_hass, _entry):
        return None

    hass.config_entries.async_forward_entry_setups = _forward_entry_setups

    if data_mode == "mock":
        monkeypatch.setattr(init_module, "OigCloudApi", lambda *_a, **_k: mock_api)
        monkeypatch.setattr(init_module, "OigCloudCoordinator", DummyCoordinator)

    monkeypatch.setattr(init_module, "_setup_frontend_panel", _setup_frontend)
    monkeypatch.setattr(
        init_module, "setup_planning_api_views", lambda *_a, **_k: None, raising=False
    )
    monkeypatch.setattr(
        init_module, "setup_api_endpoints", lambda *_a, **_k: None, raising=False
    )

    try:
        from custom_components.oig_cloud.shield.core import ModeTransitionTracker

        async def _skip_history(_self, _sensor_id):
            return None

        monkeypatch.setattr(
            ModeTransitionTracker, "_async_load_historical_data", _skip_history
        )
    except Exception:
        pass

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
async def e2e_setup(
    hass, mock_api, e2e_entry_options, monkeypatch, e2e_data_mode, live_credentials
):
    return await _setup_entry(
        hass,
        e2e_entry_options,
        monkeypatch,
        data_mode=e2e_data_mode,
        mock_api=mock_api,
        live_credentials=live_credentials,
    )


@pytest.fixture
async def e2e_setup_with_options(
    hass, mock_api, monkeypatch, e2e_data_mode, live_credentials
):
    async def _factory(entry_options: Dict[str, Any]):
        return await _setup_entry(
            hass,
            entry_options,
            monkeypatch,
            data_mode=e2e_data_mode,
            mock_api=mock_api,
            live_credentials=live_credentials,
        )

    return _factory
