from __future__ import annotations

from types import SimpleNamespace

import pytest

import custom_components.oig_cloud as init_module
from homeassistant.config_entries import ConfigEntry, ConfigEntriesFlowManager


@pytest.mark.asyncio
async def test_migrate_boiler_entities_returns_early():
    hass = SimpleNamespace()
    entry = SimpleNamespace(entry_id="entry123")

    result = await init_module._migrate_boiler_entities(hass, entry)
    assert result is None


@pytest.mark.asyncio
async def test_setup_shield_monitoring_flush_stats_exception(monkeypatch):
    hass = SimpleNamespace(
        data={"core": {"uuid": "test-uuid"}},
        services=SimpleNamespace(async_register=lambda *a, **k: None),
    )
    entry = SimpleNamespace(entry_id="entry123")

    class DummyStatsStore:
        @staticmethod
        def get_instance(*_a, **_k):
            return DummyStatsStore()

        async def save_all(self):
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

    hass.services.async_register = lambda *a, **k: None
    hass.config_entries = ConfigEntry()

    monkeypatch.setattr(
        "custom_components.oig_cloud.shield.core.ServiceShield",
        DummyServiceShield,
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.shared.statistics_storage.StatisticsStore",
        DummyStatsStore,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.event.async_track_time_interval",
        lambda *_a, **_k: None,
    )

    await init_module._setup_service_shield_monitoring(hass, entry, username="user", service_shield=DummyServiceShield())


@pytest.mark.asyncio
async def test_unload_config_entry_flush_stats_exception(monkeypatch):
    class DummyStatsStore:
        @staticmethod
        def get_instance(*_a, **_k):
            return DummyStatsStore()

        async def save_all(self):
            raise RuntimeError("unload stats flush boom")

    entry = ConfigEntry(version="1.0", title="Test Entry", entry_id="test_entry", data={})

    class DummyConfigEntries(ConfigEntry):
        async def async_unload(self):
            if hasattr(entry, "data"):
                del entry.data

    hass = SimpleNamespace(
        data={},
        config_entries=entry,
    )
    hass.data["oig_cloud"] = {}

    monkeypatch.setattr(
        "custom_components.oig_cloud.shared.statistics_storage.StatisticsStore",
        DummyStatsStore,
    )

    async def fake_async_remove(*_a, **_k):
        pass

    monkeypatch.setattr(init_module, "_remove_frontend_panel", fake_async_remove)

    result = await init_module.async_unload_config_entry(hass, entry)
    assert result is True
