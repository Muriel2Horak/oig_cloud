from __future__ import annotations

import asyncio
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest


class _MemStore:
    bucket: dict[str, Any] = {}
    inits: list[tuple[int, str, bool]] = []
    raise_missing_on_remove = False

    def __init__(self, _hass: Any, version: int, key: str, **kwargs: Any) -> None:
        self.key = key
        _MemStore.inits.append((version, key, kwargs.get("private") is True))

    async def async_load(self) -> Any:
        return _MemStore.bucket.get(self.key)

    async def async_save(self, data: Any) -> None:
        _MemStore.bucket[self.key] = data

    async def async_remove(self) -> None:
        if _MemStore.raise_missing_on_remove:
            raise FileNotFoundError(self.key)
        _MemStore.bucket.pop(self.key, None)


try:
    root = Path(__file__).resolve().parents[1]
    oig_pkg = types.ModuleType("custom_components.oig_cloud")
    oig_pkg.__path__ = [str(root / "custom_components" / "oig_cloud")]
    config_pkg = types.ModuleType("custom_components.oig_cloud.config")
    config_pkg.__path__ = [str(root / "custom_components" / "oig_cloud" / "config")]
    sys.modules.setdefault("custom_components.oig_cloud", oig_pkg)
    sys.modules.setdefault("custom_components.oig_cloud.config", config_pkg)
    from custom_components.oig_cloud.config import solar_key_store as solar_key_store_module
except ModuleNotFoundError as exc:
    if not (exc.name or "").startswith("homeassistant"):
        raise
    homeassistant = types.ModuleType("homeassistant")
    helpers = types.ModuleType("homeassistant.helpers")
    storage = types.ModuleType("homeassistant.helpers.storage")
    storage.Store = _MemStore
    homeassistant.helpers = helpers
    helpers.storage = storage
    sys.modules.setdefault("homeassistant", homeassistant)
    sys.modules.setdefault("homeassistant.helpers", helpers)
    sys.modules.setdefault("homeassistant.helpers.storage", storage)
    from custom_components.oig_cloud.config import solar_key_store as solar_key_store_module

SolarKeyStore = solar_key_store_module.SolarKeyStore


@pytest.fixture(autouse=True)
def solar_store(monkeypatch: pytest.MonkeyPatch) -> None:
    _MemStore.bucket = {}
    _MemStore.inits = []
    _MemStore.raise_missing_on_remove = False
    monkeypatch.setattr(solar_key_store_module, "Store", _MemStore)


def test_solar_key_store_round_trips_candidate_and_active_credentials() -> None:
    async def _run() -> None:
        store = SolarKeyStore(SimpleNamespace(), "entry1")

        await store.async_set_candidate(
            "forecast_solar",
            {"solar_forecast_api_key": "fs_secret_123456789"},
        )

        assert _MemStore.inits[-1] == (1, "oig_cloud.solar_entry1", True)
        assert await store.async_get_candidate("forecast_solar") == {
            "solar_forecast_api_key": "fs_secret_123456789"
        }
        assert await store.async_get_active("forecast_solar") is None

        await store.async_promote_candidate("forecast_solar", "2026-07-22T00:00:00+00:00")

        reloaded = SolarKeyStore(SimpleNamespace(), "entry1")
        assert await reloaded.async_get_active("forecast_solar") == {
            "solar_forecast_api_key": "fs_secret_123456789"
        }
        state = await reloaded.async_api_state()
        assert state["provider"] == "forecast_solar"
        assert state["solar_forecast_api_key_set"] is True
        assert state["verified"] is True
        assert "fs_secret" not in str(state)

    asyncio.run(_run())


def test_solar_key_store_clear_removes_file_and_swallows_missing() -> None:
    async def _run() -> None:
        store = SolarKeyStore(SimpleNamespace(), "entry1")
        await store.async_set_candidate(
            "solcast",
            {"solcast_api_key": "sc_secret_123456789", "solcast_site_id": "site-123"},
        )

        await store.async_clear()

        assert "oig_cloud.solar_entry1" not in _MemStore.bucket

        _MemStore.raise_missing_on_remove = True
        await store.async_clear()

    asyncio.run(_run())


def test_provider_switch_clears_inactive_candidate_without_entry_option_leak() -> None:
    async def _run() -> None:
        entry = SimpleNamespace(options={"solar_forecast_provider": "solcast"})
        store = SolarKeyStore(SimpleNamespace(), "entry1")
        await store.async_set_candidate(
            "forecast_solar",
            {"solar_forecast_api_key": "leak-me"},
        )

        await store.async_clear_inactive("solcast")

        assert await store.async_get_candidate("forecast_solar") is None
        assert await store.async_get_active("forecast_solar") is None
        assert "solar_forecast_api_key" not in entry.options
        assert "leak-me" not in str(entry.options)

    asyncio.run(_run())


def test_solar_key_store_merges_partial_solcast_candidate_updates() -> None:
    async def _run() -> None:
        store = SolarKeyStore(SimpleNamespace(), "entry1")
        await store.async_set_candidate("solcast", {"solcast_site_id": "site-123"})
        await store.async_set_candidate(
            "solcast", {"solcast_api_key": "sc_secret_123456789"}
        )

        assert await store.async_get_candidate("solcast") == {
            "solcast_api_key": "sc_secret_123456789",
            "solcast_site_id": "site-123",
        }

    asyncio.run(_run())
