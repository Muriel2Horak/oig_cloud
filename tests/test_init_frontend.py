from __future__ import annotations

from types import SimpleNamespace

import pytest

import custom_components.oig_cloud as init_module
from custom_components.oig_cloud.const import DOMAIN


class DummyHttp:
    def __init__(self):
        self.paths = None

    async def async_register_static_paths(self, paths):
        self.paths = paths


class DummyConfig:
    def path(self, value):
        return f"/tmp/{value}"


class DummyStates:
    def async_entity_ids(self):
        return ["sensor.oig_123_remaining_usable_capacity"]


class DummyHass:
    def __init__(self):
        self.data = {}
        self.http = DummyHttp()
        self.config = DummyConfig()
        self.states = DummyStates()

    async def async_add_executor_job(self, func, *args):
        return func(*args)


@pytest.mark.asyncio
async def test_register_static_paths():
    hass = DummyHass()
    await init_module._register_static_paths(hass)
    assert hass.http.paths


@pytest.mark.asyncio
async def test_setup_frontend_panel_registers(monkeypatch):
    hass = DummyHass()
    entry = SimpleNamespace(entry_id="entry1", options={"box_id": "123"})
    hass.data[DOMAIN] = {entry.entry_id: {"coordinator": SimpleNamespace(data={"123": {}})}}

    def _read_manifest(_path):
        return '{"version": "1.2.3"}'

    monkeypatch.setattr(init_module, "_read_manifest_file", _read_manifest)
    import time as time_module
    monkeypatch.setattr(time_module, "time", lambda: 42)

    recorded = {}

    def _remove_panel(_hass, panel_id, warn_if_unknown=False):
        recorded["removed"] = panel_id

    def _register_panel(hass, component_name, **kwargs):
        recorded["registered"] = {
            "component": component_name,
            "frontend_url_path": kwargs.get("frontend_url_path"),
            "config": kwargs.get("config"),
        }

    import homeassistant.components.frontend as frontend

    monkeypatch.setattr(frontend, "async_remove_panel", _remove_panel)
    monkeypatch.setattr(frontend, "async_register_built_in_panel", _register_panel)

    await init_module._setup_frontend_panel(hass, entry)

    assert "registered" in recorded
    assert "oig_cloud_dashboard_entry1" in recorded["registered"]["frontend_url_path"]


@pytest.mark.asyncio
async def test_remove_frontend_panel_unknown(monkeypatch):
    hass = DummyHass()
    entry = SimpleNamespace(entry_id="entry1", options={})

    def _remove_panel(_hass, _panel_id, warn_if_unknown=False):
        raise ValueError("unknown panel")

    import homeassistant.components.frontend as frontend

    monkeypatch.setattr(frontend, "async_remove_panel", _remove_panel)

    await init_module._remove_frontend_panel(hass, entry)
