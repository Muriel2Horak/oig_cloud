from __future__ import annotations

import asyncio
from copy import deepcopy
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


def test_atomic_activation_is_additive_v1_storage_and_increments_once() -> None:
    async def _run() -> None:
        store = SolarKeyStore(SimpleNamespace(), "entry1")
        await store.async_set_candidate(
            "solcast",
            {"solcast_api_key": "old-secret", "solcast_site_id": "old-site"},
        )
        await store.async_promote_candidate("solcast", "2026-08-10T00:00:00+00:00")
        before_revision = (await store.async_api_state())["revision"]

        result = await store.async_activate(
            "forecast_solar",
            {"solar_forecast_api_key": "new-secret"},
            verified_at=None,
        )

        assert result == before_revision + 1
        raw = deepcopy(_MemStore.bucket["oig_cloud.solar_entry1"])
        assert solar_key_store_module.STORAGE_VERSION == 1
        assert raw["active"] == {
            "provider": "forecast_solar",
            "solar_forecast_api_key": "new-secret",
        }
        assert raw["revision"] == result
        assert raw["verification"] == {"status": "unverified"}
        assert raw["candidates"] == {}
        assert await store.async_get_active("solcast") is None

        # Previous-artifact parser contract: legacy code reads only top-level active.
        legacy_active = raw.get("active")
        assert legacy_active["provider"] == "forecast_solar"
        assert legacy_active["solar_forecast_api_key"] == "new-secret"

    asyncio.run(_run())


def test_store_snapshot_restore_recovers_exact_revision_and_active_state() -> None:
    async def _run() -> None:
        store = SolarKeyStore(SimpleNamespace(), "entry1")
        await store.async_activate(
            "forecast_solar",
            {"solar_forecast_api_key": "old-secret"},
            verified_at="2026-08-10T00:00:00+00:00",
        )
        snapshot = await store.async_snapshot()
        before = deepcopy(_MemStore.bucket["oig_cloud.solar_entry1"])

        await store.async_activate(
            "solcast",
            {"solcast_api_key": "new-secret", "solcast_site_id": "new-site"},
            verified_at=None,
        )
        await store.async_restore_snapshot(snapshot)

        assert _MemStore.bucket["oig_cloud.solar_entry1"] == before
        assert await store.async_get_active("forecast_solar") == {
            "solar_forecast_api_key": "old-secret"
        }

    asyncio.run(_run())


def test_proof_is_opaque_bound_expiring_single_use_and_atomically_claimed() -> None:
    async def _run() -> None:
        proof_cls = getattr(solar_key_store_module, "SolarProofStore", None)
        assert proof_cls is not None
        now = 1_000.0
        hass = SimpleNamespace(data={})
        proof_store = proof_cls(hass, now=lambda: now)
        dto = {
            "solar_forecast_provider": "forecast_solar",
            "solar_forecast_mode": "daily",
            "solar_forecast_string1_enabled": True,
        }
        token = await proof_store.async_issue("entry1", dto)
        assert isinstance(token, str) and len(token) >= 32
        assert "forecast_solar" not in token and "daily" not in token

        claims = await asyncio.gather(
            proof_store.async_claim("entry1", token, dto),
            proof_store.async_claim("entry1", token, dto),
        )
        assert claims.count(True) == 1
        assert claims.count(False) == 1

        mismatched = await proof_store.async_issue("entry1", dto)
        assert await proof_store.async_claim(
            "entry1", mismatched, {**dto, "solar_forecast_mode": "hourly"}
        ) is False
        assert await proof_store.async_claim("entry1", mismatched, dto) is False

        expired = await proof_store.async_issue("entry1", dto)
        now += 301
        assert await proof_store.async_claim("entry1", expired, dto) is False

    asyncio.run(_run())
