from __future__ import annotations

from types import SimpleNamespace

import pytest

import custom_components.oig_cloud as init_module
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant


@pytest.mark.asyncio
async def test_setup_shield_monitoring_flush_stats_exception(hass, monkeypatch):
    class DummyStatsStore:
        saved = []

        @staticmethod
        def get_instance(*_a, **_k):
            return DummyStatsStore()

        async def save_all(self):
            self.saved.append("flush")
            raise RuntimeError("stats flush boom")

    class DummyServiceShield:
        telemetry_handler = None
        queue = []
        pending = []
        running = False

        def get_shield_status(self):
            return "active"

        def get_queue_info(self):
            return "queue-info"

        def _log_telemetry(self):
            pass

    class DummyConfigEntry:
        entry_id = "entry123"
        title = "Test Entry"
        data = {}
        minor_version = 0
        options = {}
        source = "test"
        discovery_keys = []
        domain = "oig_cloud"
        subentries_data = {}
        unique_id = "test_unique_id"
        version = 1

    hass.data["oig_cloud"] = {}
    hass.data["config_entries"] = {}
    hass.data["core"] = {"uuid": "test-uuid"}
    hass.services = SimpleNamespace(async_register=lambda *a, **k: None)

    monkeypatch.setattr(
        init_module,
        "StatisticsStore",
        DummyStatsStore,
    )

    monkeypatch.setattr(
        "custom_components.oig_cloud.shield.core.ServiceShield",
        DummyServiceShield,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.event.async_track_time_interval",
        lambda *_a, **_k: None,
    )

    result = await init_module._setup_service_shield_monitoring(hass, DummyConfigEntry(), username="user", service_shield=DummyServiceShield())

    assert result is None


@pytest.mark.asyncio
async def test_unload_config_entry_flush_stats_exception(hass, monkeypatch):
    class DummyStatsStore:
        saved = []

        @staticmethod
        def get_instance(*_a, **_k):
            return DummyStatsStore()

        async def save_all(self):
            self.saved.append("flush")
            raise RuntimeError("unload stats flush boom")

    class DummyConfigEntry:
        entry_id = "entry123"
        title = "Test Entry"
        data = {}
        minor_version = 0
        options = {}
        source = "test"
        discovery_keys = []
        domain = "oig_cloud"
        subentries_data = {}
        unique_id = "test_unique_id"
        version = 1

    class DummyConfigEntries:
        async def async_unload_platforms(self, entry, platforms):
            return True

    hass.data["oig_cloud"] = {}
    hass.config_entries = DummyConfigEntries()

    monkeypatch.setattr(
        init_module,
        "StatisticsStore",
        DummyStatsStore,
    )

    async def fake_async_remove(*_a, **_k):
        pass

    monkeypatch.setattr(init_module, "_remove_frontend_panel", fake_async_remove)

    result = await init_module.async_unload_config_entry(hass, DummyConfigEntry())
    assert result is True
