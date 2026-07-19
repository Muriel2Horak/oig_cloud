"""Tests for the Task 4 transactional migration core."""

from __future__ import annotations

import copy
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, Mock

import pytest

from custom_components.oig_cloud import config_migration
from custom_components.oig_cloud.config_migration import MIGRATION_VERSION, run_migration


class _DummyConfigEntries:
    def __init__(self) -> None:
        self.updated: list[dict[str, Any]] = []

    def async_update_entry(
        self,
        entry: Any,
        *,
        options: dict[str, Any] | None = None,
        data: Any | None = None,
    ) -> None:
        if options is not None:
            entry.options = options
        if data is not None:
            entry.data = data
        self.updated.append(copy.deepcopy(entry.options))


class _DummyHass:
    def __init__(self) -> None:
        self.config_entries = _DummyConfigEntries()
        self.services = SimpleNamespace(has_service=lambda *_a, **_k: False)


class _Entry:
    def __init__(self, entry_id: str = "entry-1", options: dict[str, Any] | None = None) -> None:
        self.entry_id = entry_id
        self.options = options or {}
        self.data: dict[str, Any] = {}


class _MemoryStore:
    def __init__(self) -> None:
        self.value: dict[str, Any] | str | None = None
        self.saved: list[dict[str, Any]] = []
        self.private: bool | None = None

    async def async_load(self) -> dict[str, Any] | str | None:
        return copy.deepcopy(self.value)

    async def async_save(self, payload: dict[str, Any]) -> None:
        self.value = copy.deepcopy(payload)
        self.saved.append(copy.deepcopy(payload))


class _StoreFactory:
    def __init__(self, store_class: type[_MemoryStore] = _MemoryStore) -> None:
        self._store_class = store_class
        self.stores: dict[str, _MemoryStore] = {}

    def __call__(self, *_args: Any, **kwargs: Any) -> _MemoryStore:
        entry_id = ""
        if len(_args) >= 3:
            entry_id = str(_args[2]).replace("oig_cloud.migration_backup_", "")
        key = str(entry_id)
        if key not in self.stores:
            self.stores[key] = self._store_class()
        private = kwargs.get("private", False)
        self.stores[key].private = private
        return self.stores[key]

    def backup(self, entry_id: str = "entry-1") -> dict[str, Any] | None:
        store = self.stores.get(entry_id)
        if not store or not isinstance(store.value, dict):
            return None
        return copy.deepcopy(store.value)


class _CorruptStore(_MemoryStore):
    async def async_load(self) -> dict[str, Any] | str | None:
        return "not-a-dict"


class _FailingFinalSaveStore(_MemoryStore):
    async def async_save(self, payload: dict[str, Any]) -> None:
        if payload.get("complete") is True:
            raise RuntimeError("commit backup write failed")
        await super().async_save(payload)


class _UnexpectedStoreAccess:
    async def async_load(self) -> dict[str, Any]:
        return {}

    async def async_save(self, _payload: dict[str, Any]) -> None:
        return None


def _transform_with_defaults(options: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    migrated = dict(options)
    legacy_min = migrated.get("min_capacity_percent")
    if migrated.get("planning_min_percent") is None:
        migrated["planning_min_percent"] = legacy_min if isinstance(legacy_min, (int, float)) else 33.0

    legacy_rate = migrated.get("home_charge_rate")
    if migrated.get("charge_rate_kw") is None:
        migrated["charge_rate_kw"] = legacy_rate if isinstance(legacy_rate, (int, float)) else 2.8

    removed: list[str] = []
    if "max_price_conf" in migrated:
        try:
            migrated["max_ups_price_czk"] = float(migrated["max_price_conf"])
        except (TypeError, ValueError):
            migrated["max_ups_price_czk"] = 10.0
        migrated.pop("max_price_conf", None)
        removed.append("max_price_conf")

    return migrated, removed


@pytest.mark.asyncio
async def test_migration_records_snapshot_private_store_and_marker(monkeypatch):
    stores = _StoreFactory()
    monkeypatch.setattr(config_migration, "Store", stores)
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_transform_with_defaults])

    hass = _DummyHass()
    entry = _Entry(
        options={
            "min_capacity_percent": 25.0,
            "home_charge_rate": 3.0,
            "max_price_conf": "7.75",
        }
    )

    migrated = await run_migration(hass, entry)
    backup = stores.backup("entry-1")

    assert migrated is True
    assert stores.stores["entry-1"].private is True
    assert entry.options["planning_min_percent"] == 25.0
    assert entry.options["charge_rate_kw"] == 3.0
    assert entry.options["max_ups_price_czk"] == 7.75
    assert "max_price_conf" not in entry.options
    assert entry.options["_migration"] == {"version": MIGRATION_VERSION, "complete": True}
    assert backup is not None
    assert backup["schema_version"] == MIGRATION_VERSION
    assert backup["snapshot"]["min_capacity_percent"] == 25.0


@pytest.mark.asyncio
async def test_already_migrated_entry_touches_no_storage(monkeypatch):
    store = Mock(return_value=_UnexpectedStoreAccess())
    save_backup = AsyncMock()
    monkeypatch.setattr(config_migration, "Store", store)
    monkeypatch.setattr(config_migration, "_save_backup", save_backup)
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_transform_with_defaults])

    hass = _DummyHass()
    entry = _Entry(
        options={
            "_migration": {"version": MIGRATION_VERSION, "complete": True},
            "planning_min_percent": 33.0,
            "charge_rate_kw": 2.8,
        }
    )

    migrated = await run_migration(hass, entry)

    assert migrated is False
    assert hass.config_entries.updated == []
    store.assert_not_called()
    save_backup.assert_not_awaited()


@pytest.mark.asyncio
async def test_entry_without_legacy_keys_touches_no_storage(monkeypatch):
    store = Mock(return_value=_UnexpectedStoreAccess())
    save_backup = AsyncMock()
    monkeypatch.setattr(config_migration, "Store", store)
    monkeypatch.setattr(config_migration, "_save_backup", save_backup)
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_transform_with_defaults])

    hass = _DummyHass()
    options = {
        "username": "user@example.test",
        "password": "secret",
        "box_id": "123456",
    }
    entry = _Entry(options=dict(options))

    migrated = await run_migration(hass, entry)

    assert migrated is False
    assert entry.options == options
    assert hass.config_entries.updated == []
    store.assert_not_called()
    save_backup.assert_not_awaited()


@pytest.mark.asyncio
async def test_repeated_no_legacy_migration_is_noop(monkeypatch):
    store = Mock(return_value=_UnexpectedStoreAccess())
    save_backup = AsyncMock()
    monkeypatch.setattr(config_migration, "Store", store)
    monkeypatch.setattr(config_migration, "_save_backup", save_backup)
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_transform_with_defaults])

    hass = _DummyHass()
    options = {
        "username": "user@example.test",
        "password": "secret",
        "box_id": "123456",
    }
    entry = _Entry(options=dict(options))

    first = await run_migration(hass, entry)
    second = await run_migration(hass, entry)

    assert first is False
    assert second is False
    assert entry.options == options
    assert hass.config_entries.updated == []
    store.assert_not_called()
    save_backup.assert_not_awaited()


@pytest.mark.asyncio
async def test_completed_migration_is_idempotent(monkeypatch):
    stores = _StoreFactory()
    monkeypatch.setattr(config_migration, "Store", stores)
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_transform_with_defaults])

    hass = _DummyHass()
    entry = _Entry(options={"min_capacity_percent": 40.0})

    first = await run_migration(hass, entry)
    second = await run_migration(hass, entry)

    assert first is True
    assert second is False
    assert entry.options["_migration"]["complete"] is True
    assert len(hass.config_entries.updated) == 1


@pytest.mark.asyncio
async def test_failed_transform_restores_original_options_and_keeps_backup_state(monkeypatch):
    """Task 7: a transform crash now surfaces as `MigrationTransformError`
    (classified `.code = "transform_failed"`) — not a silent `return False`.
    The pre-migration snapshot is preserved and the entry's options stay
    untouched (recoverable state).
    """
    from custom_components.oig_cloud.config_migration import MigrationTransformError

    stores = _StoreFactory()
    monkeypatch.setattr(config_migration, "Store", stores)

    def _failing_transform(_options: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
        raise RuntimeError("boom")

    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_failing_transform])

    hass = _DummyHass()
    original = {"min_capacity_percent": 25.0}
    entry = _Entry(options=dict(original))

    with pytest.raises(MigrationTransformError) as exc_info:
        await run_migration(hass, entry)

    assert exc_info.value.code == "transform_failed"
    backup = stores.backup("entry-1")
    assert entry.options == original
    assert "_migration" not in entry.options
    assert backup is not None
    assert backup["complete"] is False
    assert backup["snapshot"] == original
    journal = backup["journal"]
    failed_event = next((e for e in journal if e.get("event") == "failed"), None)
    assert failed_event is not None
    assert failed_event.get("code") == "transform_failed"


@pytest.mark.asyncio
async def test_failed_final_backup_save_rolls_back_options_and_propagates(monkeypatch):
    """Task 7: a commit-time backup write failure surfaces as classified
    `MigrationBackupError` (was: generic `RuntimeError`). The entry's options
    are rolled back to the pre-migration snapshot before the error is raised.
    """
    from custom_components.oig_cloud.config_migration import MigrationBackupError

    stores = _StoreFactory(_FailingFinalSaveStore)
    monkeypatch.setattr(config_migration, "Store", stores)
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_transform_with_defaults])

    hass = _DummyHass()
    original = {
        "min_capacity_percent": 25.0,
        "home_charge_rate": 3.0,
        "max_price_conf": "7.75",
    }
    entry = _Entry(options=dict(original))

    with pytest.raises(MigrationBackupError) as exc_info:
        await run_migration(hass, entry)

    assert exc_info.value.code == "backup_failed"
    assert isinstance(exc_info.value.__cause__, RuntimeError)

    backup = stores.backup("entry-1")

    assert entry.options == original
    assert hass.config_entries.updated[-1] == original
    assert backup is not None
    assert backup["complete"] is False
    assert backup["snapshot"] == original


@pytest.mark.asyncio
async def test_restore_round_trips_and_clears_migration_marker(monkeypatch):
    stores = _StoreFactory()
    monkeypatch.setattr(config_migration, "Store", stores)
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_transform_with_defaults])

    hass = _DummyHass()
    entry = _Entry(options={"min_capacity_percent": 25.0, "home_charge_rate": 3.0})

    original = dict(entry.options)
    await run_migration(hass, entry)
    entry.options["planning_min_percent"] = 99.0
    entry.options["_migration"] = {"version": MIGRATION_VERSION, "complete": False}

    restored = await config_migration.restore_last_backup(hass, entry)

    assert restored is True
    assert entry.options == original


@pytest.mark.asyncio
async def test_restore_with_corrupt_backup_raises_classified_error(monkeypatch):
    """Task 7: corrupt backup store must surface as `MigrationBackupError`,
    classified `.code = "backup_failed"`. Entry's options are NOT touched.
    """
    from custom_components.oig_cloud.config_migration import MigrationBackupError

    class _CorruptStoreFactory:
        def __call__(self, *_args: Any, **_kwargs: Any) -> _CorruptStore:
            return _CorruptStore()

    monkeypatch.setattr(config_migration, "Store", _CorruptStoreFactory())

    hass = _DummyHass()
    entry = _Entry(options={"min_capacity_percent": 25.0})

    with pytest.raises(MigrationBackupError) as exc_info:
        await config_migration.restore_last_backup(hass, entry)

    assert exc_info.value.code == "backup_failed"
    assert entry.options == {"min_capacity_percent": 25.0}
