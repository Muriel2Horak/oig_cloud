from __future__ import annotations

import asyncio
from copy import deepcopy
import hashlib
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
    fail_remove_for: set[str] = set()
    fail_remove_once_for: set[str] = set()
    fail_save_for: set[str] = set()
    fail_save_once_for: set[str] = set()
    load_delay_for: set[str] = set()

    def __init__(self, _hass: Any, version: int, key: str, **kwargs: Any) -> None:
        self.key = key
        _MemStore.inits.append((version, key, kwargs.get("private") is True))

    async def async_load(self) -> Any:
        if self.key in _MemStore.load_delay_for:
            value = _MemStore.bucket.get(self.key)
            await asyncio.sleep(0)
            return value
        return _MemStore.bucket.get(self.key)

    async def async_save(self, data: Any) -> None:
        if self.key in _MemStore.fail_save_for:
            raise RuntimeError("injected persistent save failure")
        if self.key in _MemStore.fail_save_once_for:
            _MemStore.fail_save_once_for.remove(self.key)
            raise RuntimeError("injected save failure")
        _MemStore.bucket[self.key] = data

    async def async_remove(self) -> None:
        if self.key in _MemStore.fail_remove_for:
            raise RuntimeError("injected persistent remove failure")
        if self.key in _MemStore.fail_remove_once_for:
            _MemStore.fail_remove_once_for.remove(self.key)
            raise RuntimeError("injected remove failure")
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
    _MemStore.fail_remove_for = set()
    _MemStore.fail_remove_once_for = set()
    _MemStore.fail_save_for = set()
    _MemStore.fail_save_once_for = set()
    _MemStore.load_delay_for = set()
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


def test_initial_credentials_are_owner_bound_expiring_and_cleaned() -> None:
    """Dropping owner/expiry metadata or cleanup must fail this lifecycle test."""

    async def _run() -> None:
        hass = SimpleNamespace(data={})
        token = await solar_key_store_module.async_stage_initial_credentials(
            hass,
            "forecast_solar",
            {"solar_forecast_api_key": "bootstrap-secret-a"},
            owner="box-owner-a",
            now=lambda: 1_000.0,
        )
        assert token
        pending_key = f"oig_cloud.solar_initial_{token}"
        staged = deepcopy(_MemStore.bucket[pending_key])
        assert staged["provider"] == "forecast_solar"
        assert staged["owner_binding"]
        assert staged["owner_binding"] != "box-owner-a"
        assert staged["expires_at"] == 1_300.0
        assert "bootstrap-secret-a" not in token

        cleanup = getattr(
            solar_key_store_module, "async_cleanup_initial_credentials", None
        )
        assert callable(cleanup)
        assert await cleanup(hass, now=lambda: 1_299.0) == 0
        assert pending_key in _MemStore.bucket
        assert await cleanup(hass, now=lambda: 1_300.0) == 1
        assert pending_key not in _MemStore.bucket

    asyncio.run(_run())


def test_initial_credentials_claim_is_global_single_use_and_bound() -> None:
    """Per-entry locking permits two entries to activate the same setup token."""

    async def _run() -> None:
        hass = SimpleNamespace(data={})

        class _ConfigEntries:
            @staticmethod
            def async_update_entry(entry: Any, options: dict[str, Any]) -> None:
                entry.options = options

        hass.config_entries = _ConfigEntries()
        token = await solar_key_store_module.async_stage_initial_credentials(
            hass,
            "forecast_solar",
            {"solar_forecast_api_key": "single-use-bootstrap-secret"},
            owner="shared-owner",
            now=lambda: 2_000.0,
        )
        assert token
        options = {
            "solar_forecast_provider": "forecast_solar",
            solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD: token,
        }
        entries = [
            SimpleNamespace(
                entry_id=f"entry-{index}",
                data={"username": "shared-owner"},
                options=dict(options),
            )
            for index in range(2)
        ]
        results = await asyncio.gather(
            *(
                solar_key_store_module.async_activate_initial_credentials(
                    hass, entry, now=lambda: 2_001.0
                )
                for entry in entries
            )
        )
        assert results.count(True) == 1
        assert results.count(False) == 1
        active_count = 0
        for entry in entries:
            active = await SolarKeyStore(hass, entry.entry_id).async_get_active(
                "forecast_solar"
            )
            active_count += active is not None
        assert active_count == 1

        wrong_owner = await solar_key_store_module.async_stage_initial_credentials(
            hass,
            "forecast_solar",
            {"solar_forecast_api_key": "wrong-owner-secret"},
            owner="right-owner",
            now=lambda: 2_100.0,
        )
        wrong_entry = SimpleNamespace(
            entry_id="wrong-owner-entry",
            data={"username": "wrong-owner"},
            options={
                "solar_forecast_provider": "forecast_solar",
                solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD: wrong_owner,
            },
        )
        assert not await solar_key_store_module.async_activate_initial_credentials(
            hass, wrong_entry, now=lambda: 2_101.0
        )
        assert await SolarKeyStore(hass, wrong_entry.entry_id).async_get_active(
            "forecast_solar"
        ) is None

        wrong_provider = SimpleNamespace(
            entry_id="wrong-provider-entry",
            data={"username": "right-owner"},
            options={
                "solar_forecast_provider": "solcast",
                solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD: wrong_owner,
            },
        )
        assert not await solar_key_store_module.async_activate_initial_credentials(
            hass, wrong_provider, now=lambda: 2_101.0
        )

        for unusable in (None, "", "../malformed", "missing-token"):
            entry = SimpleNamespace(
                entry_id=f"bad-{unusable}",
                data={"username": "right-owner"},
                options={
                    "solar_forecast_provider": "forecast_solar",
                    solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD: unusable,
                },
            )
            assert not await solar_key_store_module.async_activate_initial_credentials(
                hass, entry, now=lambda: 2_101.0
            )

    asyncio.run(_run())


def test_initial_credentials_global_claim_serializes_two_entry_race() -> None:
    """Per-entry locks let both entries load one token before either removes it."""

    async def _run() -> None:
        hass = SimpleNamespace(data={})

        class _ConfigEntries:
            @staticmethod
            def async_update_entry(entry: Any, options: dict[str, Any]) -> None:
                entry.options = options

        hass.config_entries = _ConfigEntries()
        token = "race-token-with-safe-shape-123456789012345"
        pending_key = f"oig_cloud.solar_initial_{token}"
        _MemStore.bucket[pending_key] = {
            "provider": "forecast_solar",
            "credentials": {"solar_forecast_api_key": "race-secret"},
            "owner_binding": hashlib.sha256(b"shared-owner").hexdigest(),
            "expires_at": 9_999_999_999.0,
        }
        _MemStore.bucket["oig_cloud.solar_initial_index"] = {
            token: 9_999_999_999.0
        }
        _MemStore.load_delay_for.add(pending_key)
        entries = [
            SimpleNamespace(
                entry_id=f"race-entry-{index}",
                data={"username": "shared-owner"},
                options={
                    "solar_forecast_provider": "forecast_solar",
                    solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD: token,
                },
            )
            for index in range(2)
        ]

        results = await asyncio.gather(
            *(
                solar_key_store_module.async_activate_initial_credentials(hass, entry)
                for entry in entries
            )
        )

        assert results.count(True) == 1
        assert results.count(False) == 1
        active = [
            await SolarKeyStore(hass, entry.entry_id).async_get_active(
                "forecast_solar"
            )
            for entry in entries
        ]
        assert sum(value is not None for value in active) == 1

    asyncio.run(_run())


def test_initial_credentials_reject_owner_provider_expiry_and_malformed_token() -> None:
    """Ignoring any bootstrap binding must activate at least one invalid claim."""

    async def _run() -> None:
        hass = SimpleNamespace(data={})

        class _ConfigEntries:
            @staticmethod
            def async_update_entry(entry: Any, options: dict[str, Any]) -> None:
                entry.options = options

        hass.config_entries = _ConfigEntries()

        def _seed(token: str, *, owner: str, expires_at: float) -> None:
            _MemStore.bucket[f"oig_cloud.solar_initial_{token}"] = {
                "provider": "forecast_solar",
                "credentials": {"solar_forecast_api_key": "bound-secret"},
                "owner_binding": hashlib.sha256(owner.encode()).hexdigest(),
                "expires_at": expires_at,
            }
            index = _MemStore.bucket.setdefault(
                "oig_cloud.solar_initial_index", {}
            )
            index[token] = expires_at

        cases = [
            ("wrong-owner-token-123456789012345678901234", "wrong-owner", "forecast_solar", 9_999_999_999.0),
            ("wrong-provider-token-123456789012345678901", "right-owner", "solcast", 9_999_999_999.0),
            ("expired-token-1234567890123456789012345678", "right-owner", "forecast_solar", 0.0),
            ("../malformed-token", "right-owner", "forecast_solar", 9_999_999_999.0),
        ]
        for index, (token, owner, provider, expires_at) in enumerate(cases):
            _seed(token, owner="right-owner", expires_at=expires_at)
            entry = SimpleNamespace(
                entry_id=f"invalid-entry-{index}",
                data={"username": owner},
                options={
                    "solar_forecast_provider": provider,
                    solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD: token,
                },
            )
            assert not await solar_key_store_module.async_activate_initial_credentials(
                hass, entry
            )
            assert await SolarKeyStore(hass, entry.entry_id).async_get_active(
                "forecast_solar"
            ) is None

        missing = SimpleNamespace(
            entry_id="missing-entry",
            data={"username": "right-owner"},
            options={
                "solar_forecast_provider": "forecast_solar",
                solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD:
                    "missing-token-1234567890123456789012345678",
            },
        )
        assert not await solar_key_store_module.async_activate_initial_credentials(
            hass, missing
        )

    asyncio.run(_run())


def test_initial_credentials_cleanup_removes_expired_indexed_records() -> None:
    """Without deterministic cleanup, abandoned private bootstrap stores survive."""

    async def _run() -> None:
        hass = SimpleNamespace(data={})
        expired = "expired-cleanup-token-12345678901234567890"
        current = "current-cleanup-token-12345678901234567890"
        for token, expires_at in ((expired, 10.0), (current, 30.0)):
            _MemStore.bucket[f"oig_cloud.solar_initial_{token}"] = {
                "provider": "forecast_solar",
                "credentials": {"solar_forecast_api_key": f"secret-{token}"},
                "owner_binding": hashlib.sha256(b"owner").hexdigest(),
                "expires_at": expires_at,
            }
        _MemStore.bucket["oig_cloud.solar_initial_index"] = {
            expired: 10.0,
            current: 30.0,
        }
        cleanup = getattr(
            solar_key_store_module, "async_cleanup_initial_credentials", None
        )
        assert callable(cleanup)

        assert await cleanup(hass, now=lambda: 20.0) == 1
        assert f"oig_cloud.solar_initial_{expired}" not in _MemStore.bucket
        assert f"oig_cloud.solar_initial_{current}" in _MemStore.bucket

    asyncio.run(_run())


def test_initial_credentials_remove_failure_restores_retryable_claim() -> None:
    """A removal fault must not consume the claim or leave activated credentials."""

    async def _run() -> None:
        hass = SimpleNamespace(data={})

        class _ConfigEntries:
            @staticmethod
            def async_update_entry(entry: Any, options: dict[str, Any]) -> None:
                entry.options = options

        hass.config_entries = _ConfigEntries()
        token = await solar_key_store_module.async_stage_initial_credentials(
            hass,
            "forecast_solar",
            {"solar_forecast_api_key": "retryable-bootstrap-secret"},
            owner="retry-owner",
            now=lambda: 3_000.0,
        )
        assert token
        entry = SimpleNamespace(
            entry_id="retry-entry",
            data={"username": "retry-owner"},
            options={
                "solar_forecast_provider": "forecast_solar",
                solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD: token,
            },
        )
        pending_key = f"oig_cloud.solar_initial_{token}"
        _MemStore.fail_remove_once_for.add(pending_key)

        assert not await solar_key_store_module.async_activate_initial_credentials(
            hass, entry, now=lambda: 3_001.0
        )
        assert solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD in entry.options
        assert pending_key in _MemStore.bucket
        assert await SolarKeyStore(hass, entry.entry_id).async_get_active(
            "forecast_solar"
        ) is None

        assert await solar_key_store_module.async_activate_initial_credentials(
            hass, entry, now=lambda: 3_002.0
        )
        assert solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD not in entry.options
        assert await SolarKeyStore(hass, entry.entry_id).async_get_active(
            "forecast_solar"
        ) == {"solar_forecast_api_key": "retryable-bootstrap-secret"}

    asyncio.run(_run())


@pytest.mark.parametrize("fault", ["activation", "token_strip"])
def test_initial_credentials_activation_and_token_strip_failures_are_retryable(
    fault: str,
) -> None:
    """Every activation boundary restores the pending record and public reference."""

    async def _run() -> None:
        hass = SimpleNamespace(data={})

        class _ConfigEntries:
            fail_once = fault == "token_strip"

            @classmethod
            def async_update_entry(
                cls, entry: Any, options: dict[str, Any]
            ) -> None:
                if cls.fail_once:
                    cls.fail_once = False
                    raise RuntimeError("injected token-strip failure")
                entry.options = options

        hass.config_entries = _ConfigEntries()
        token = await solar_key_store_module.async_stage_initial_credentials(
            hass,
            "forecast_solar",
            {"solar_forecast_api_key": "retry-after-boundary-secret"},
            owner="retry-boundary-owner",
            now=lambda: 4_000.0,
        )
        assert token
        entry = SimpleNamespace(
            entry_id=f"retry-{fault}-entry",
            data={"username": "retry-boundary-owner"},
            options={
                "solar_forecast_provider": "forecast_solar",
                solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD: token,
            },
        )
        if fault == "activation":
            _MemStore.fail_save_once_for.add(
                f"oig_cloud.solar_{entry.entry_id}"
            )

        assert not await solar_key_store_module.async_activate_initial_credentials(
            hass, entry, now=lambda: 4_001.0
        )
        pending_key = f"oig_cloud.solar_initial_{token}"
        assert pending_key in _MemStore.bucket
        assert solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD in entry.options
        assert await SolarKeyStore(hass, entry.entry_id).async_get_active(
            "forecast_solar"
        ) is None

        assert await solar_key_store_module.async_activate_initial_credentials(
            hass, entry, now=lambda: 4_002.0
        )
        assert pending_key not in _MemStore.bucket
        assert solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD not in entry.options

    asyncio.run(_run())


def test_initial_credentials_persistent_config_fault_runs_every_compensation() -> None:
    """One failing compensator must not skip pending/index restoration attempts."""

    async def _run() -> None:
        hass = SimpleNamespace(data={})
        token = await solar_key_store_module.async_stage_initial_credentials(
            hass,
            "forecast_solar",
            {"solar_forecast_api_key": "persistent-config-secret"},
            owner="persistent-owner",
            now=lambda: 5_000.0,
        )
        assert token
        pending_key = f"oig_cloud.solar_initial_{token}"
        active_key = "oig_cloud.solar_persistent-entry"
        entry = SimpleNamespace(
            entry_id="persistent-entry",
            data={"username": "persistent-owner"},
            options={
                "solar_forecast_provider": "forecast_solar",
                solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD: token,
            },
        )

        class _PersistentlyBrokenConfigEntries:
            calls = 0

            @classmethod
            def async_update_entry(
                cls, _entry: Any, *, options: dict[str, Any]
            ) -> None:
                cls.calls += 1
                # Activation has already mutated the private store. Make its
                # compensating save independently fail before this platform
                # boundary reports its own persistent failure.
                _MemStore.fail_save_for.add(active_key)
                raise RuntimeError("persistent config-entry failure")

        hass.config_entries = _PersistentlyBrokenConfigEntries()

        result = await solar_key_store_module.async_activate_initial_credentials(
            hass, entry, now=lambda: 5_001.0
        )

        assert result is False
        assert _PersistentlyBrokenConfigEntries.calls == 2
        assert pending_key in _MemStore.bucket
        assert _MemStore.bucket["oig_cloud.solar_initial_index"][token] == 5_300.0
        assert solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD in entry.options
        # The active Store is the one unrecoverable component while its
        # platform fault persists; the exact terminal state is still explicit.
        assert _MemStore.bucket[active_key]["active"] == {
            "provider": "forecast_solar",
            "solar_forecast_api_key": "persistent-config-secret",
        }

        _MemStore.fail_save_for.clear()

        class _RecoveredConfigEntries:
            @staticmethod
            def async_update_entry(
                target: Any, *, options: dict[str, Any]
            ) -> None:
                target.options = options

        hass.config_entries = _RecoveredConfigEntries()
        assert await solar_key_store_module.async_activate_initial_credentials(
            hass, entry, now=lambda: 5_002.0
        )
        assert pending_key not in _MemStore.bucket
        assert token not in _MemStore.bucket["oig_cloud.solar_initial_index"]
        assert solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD not in entry.options

    asyncio.run(_run())


@pytest.mark.parametrize("fault", ["pending_remove", "index_save"])
def test_initial_credentials_persistent_private_fault_is_fail_closed_and_retryable(
    fault: str,
) -> None:
    """Each private persistence boundary preserves an operator-retryable claim."""

    async def _run() -> None:
        hass = SimpleNamespace(data={})

        class _ConfigEntries:
            @staticmethod
            def async_update_entry(
                entry: Any, *, options: dict[str, Any]
            ) -> None:
                entry.options = options

        hass.config_entries = _ConfigEntries()
        token = await solar_key_store_module.async_stage_initial_credentials(
            hass,
            "forecast_solar",
            {"solar_forecast_api_key": f"persistent-{fault}-secret"},
            owner="private-fault-owner",
            now=lambda: 6_000.0,
        )
        assert token
        pending_key = f"oig_cloud.solar_initial_{token}"
        entry = SimpleNamespace(
            entry_id=f"private-{fault}-entry",
            data={"username": "private-fault-owner"},
            options={
                "solar_forecast_provider": "forecast_solar",
                solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD: token,
            },
        )
        fault_key = (
            pending_key
            if fault == "pending_remove"
            else "oig_cloud.solar_initial_index"
        )
        if fault == "pending_remove":
            _MemStore.fail_remove_for.add(fault_key)
        else:
            _MemStore.fail_save_for.add(fault_key)

        assert not await solar_key_store_module.async_activate_initial_credentials(
            hass, entry, now=lambda: 6_001.0
        )
        assert pending_key in _MemStore.bucket
        assert solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD in entry.options
        assert await SolarKeyStore(hass, entry.entry_id).async_get_active(
            "forecast_solar"
        ) is None

        _MemStore.fail_remove_for.clear()
        _MemStore.fail_save_for.clear()
        assert await solar_key_store_module.async_activate_initial_credentials(
            hass, entry, now=lambda: 6_002.0
        )
        assert pending_key not in _MemStore.bucket
        assert solar_key_store_module.INITIAL_CREDENTIALS_TOKEN_FIELD not in entry.options

    asyncio.run(_run())
