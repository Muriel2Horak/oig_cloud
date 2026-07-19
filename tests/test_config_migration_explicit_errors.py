"""Tests for Plan 4 Task 7 — explicit, classified migration errors.

Task 7 acceptance: "Migration failures must surface as explicit, classified
errors — not silent fallbacks, not a swallowed exception, not a log line only."

The pre-change `config_migration.run_migration` swallows transform and backup
errors via `except Exception:` + `return False` (lines 162-166). The caller
cannot tell apart: "already migrated", "no legacy state", or "transform
crashed". The pre-change `restore_last_backup` silently returns False on
corrupt backups without surfacing the cause.

These tests assert the explicit-error contract:
- transform failure raises `MigrationTransformError` (NOT silent return False)
- backup write failure raises `MigrationBackupError` (NOT silent return False)
- each raised exception carries a classified `.code` (not a raw `str(err)`)
- the journal records the classified event type and exception type
- pre-migration options remain untouched (recoverable state preserved)
- `restore_last_backup` raises `MigrationBackupError` for corrupt backups
"""
from __future__ import annotations

import copy
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud import config_migration
from custom_components.oig_cloud.config_migration import (
    MigrationBackupError,
    MigrationError,
    MigrationTransformError,
    MIGRATION_VERSION,
    run_migration,
)


# ---------- shared fixtures (mirrors test_config_migration.py) ----------


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

    async def async_load(self) -> dict[str, Any] | str | None:
        return copy.deepcopy(self.value)

    async def async_save(self, payload: dict[str, Any]) -> None:
        self.value = copy.deepcopy(payload)
        self.saved.append(copy.deepcopy(payload))


class _StoreFactory:
    def __init__(self) -> None:
        self.stores: dict[str, _MemoryStore] = {}

    def __call__(self, *_args: Any, **kwargs: Any) -> _MemoryStore:
        entry_id = ""
        if len(_args) >= 3:
            entry_id = str(_args[2]).replace("oig_cloud.migration_backup_", "")
        key = str(entry_id)
        if key not in self.stores:
            self.stores[key] = _MemoryStore()
        return self.stores[key]

    def backup(self, entry_id: str = "entry-1") -> dict[str, Any] | None:
        store = self.stores.get(entry_id)
        if not store or not isinstance(store.value, dict):
            return None
        return copy.deepcopy(store.value)


class _BackupSaveFailingStore(_MemoryStore):
    """Backup store whose async_save raises (simulates disk failure)."""

    def __init__(self, on_save_event: str = "any") -> None:
        super().__init__()
        self.on_save_event = on_save_event

    async def async_save(self, payload: dict[str, Any]) -> None:
        # Raise only on the pre-commit ("complete": False) save; commit
        # save is covered by the existing test_failed_final_backup_save_*
        if payload.get("complete") is False and self.on_save_event in ("start", "any"):
            raise RuntimeError("disk full")
        await super().async_save(payload)


def _failing_transform(_options: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    raise RuntimeError("boom — transform crashed")


def _passing_transform(options: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    migrated = dict(options)
    migrated.setdefault("planning_min_percent", 33.0)
    return migrated, []


# ---------- failing tests (must FAIL on the pre-change tree) ----------


@pytest.mark.asyncio
async def test_transform_failure_raises_classified_migration_transform_error(monkeypatch):
    """A transform that raises MUST surface as MigrationTransformError.

    Pre-change behavior: `except Exception:` swallows + return False (line 162-166).
    Post-change behavior: caller sees a classified exception with `.code`.
    """
    stores = _StoreFactory()
    monkeypatch.setattr(config_migration, "Store", stores)
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_failing_transform])

    hass = _DummyHass()
    original = {"min_capacity_percent": 25.0}
    entry = _Entry(options=dict(original))

    with pytest.raises(MigrationTransformError) as exc_info:
        await run_migration(hass, entry)

    err = exc_info.value
    assert isinstance(err, MigrationError)
    assert err.code == "transform_failed"
    assert err.entry_id == "entry-1"
    assert isinstance(err.__cause__, RuntimeError)
    assert "boom" in str(err.__cause__)


@pytest.mark.asyncio
async def test_transform_failure_preserves_pre_migration_options(monkeypatch):
    """Explicit error path MUST NOT half-write the entry.

    After a transform crashes, the entry's options must remain exactly the
    pre-migration snapshot — recoverable state, not a neither-old-nor-new mix.
    """
    stores = _StoreFactory()
    monkeypatch.setattr(config_migration, "Store", stores)
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_failing_transform])

    hass = _DummyHass()
    original = {"min_capacity_percent": 25.0, "home_charge_rate": 3.0}
    entry = _Entry(options=dict(original))

    with pytest.raises(MigrationTransformError):
        await run_migration(hass, entry)

    assert entry.options == original
    assert "_migration" not in entry.options
    assert hass.config_entries.updated == []


@pytest.mark.asyncio
async def test_transform_failure_journal_records_classified_event(monkeypatch):
    """The journal entry on a transform crash MUST carry the classified code,
    not a raw `str(err)` blob. Same shape as the success journal entry.
    """
    stores = _StoreFactory()
    monkeypatch.setattr(config_migration, "Store", stores)
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_failing_transform])

    hass = _DummyHass()
    original = {"min_capacity_percent": 25.0}
    entry = _Entry(options=dict(original))

    with pytest.raises(MigrationTransformError):
        await run_migration(hass, entry)

    backup = stores.backup("entry-1")
    assert backup is not None
    assert backup["complete"] is False
    journal = backup["journal"]
    assert journal, "journal must record the failed attempt"
    failed_event = next((e for e in journal if e.get("event") == "failed"), None)
    assert failed_event is not None
    # classified — not a raw str(err) blob
    assert failed_event.get("code") == "transform_failed"
    assert failed_event.get("error_type") == "RuntimeError"


@pytest.mark.asyncio
async def test_backup_write_failure_raises_classified_migration_backup_error(monkeypatch):
    """A backup write that fails MUST surface as MigrationBackupError.

    Pre-change behavior: `_save_backup` errors at line 178 propagate as
    generic RuntimeError. Post-change behavior: classified MigrationBackupError.
    """
    stores = _StoreFactory()
    # Wrap the factory so the resulting store raises on save.
    class _FailingFactory(_StoreFactory):
        def __call__(self, *_args: Any, **_kwargs: Any) -> Any:
            return _BackupSaveFailingStore()

    monkeypatch.setattr(config_migration, "Store", _FailingFactory())
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_passing_transform])

    hass = _DummyHass()
    original = {"min_capacity_percent": 25.0}
    entry = _Entry(options=dict(original))

    with pytest.raises(MigrationBackupError) as exc_info:
        await run_migration(hass, entry)

    err = exc_info.value
    assert isinstance(err, MigrationError)
    assert err.code == "backup_failed"
    assert err.entry_id == "entry-1"


@pytest.mark.asyncio
async def test_no_op_returns_false_without_raising_when_no_legacy_state(monkeypatch):
    """No-op path MUST keep returning False (no error). Pre-change AND post-change
    both pass — this guards against an over-eager refactor that turns no-op
    into a raise. The failure-mode tests above confirm the explicit-error path.
    """
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_passing_transform])

    hass = _DummyHass()
    entry = _Entry(options={"username": "user@example.test", "password": "secret"})

    result = await run_migration(hass, entry)
    assert result is False
    assert entry.options == {"username": "user@example.test", "password": "secret"}


@pytest.mark.asyncio
async def test_idempotent_already_migrated_returns_false_without_raising(monkeypatch):
    """Already-migrated entries MUST NOT raise (no-op)."""
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_passing_transform])

    hass = _DummyHass()
    entry = _Entry(
        options={
            "_migration": {"version": MIGRATION_VERSION, "complete": True},
            "planning_min_percent": 33.0,
        }
    )

    result = await run_migration(hass, entry)
    assert result is False


@pytest.mark.asyncio
async def test_restore_with_corrupt_backup_raises_classified_error(monkeypatch):
    """`restore_last_backup` MUST surface corrupt backups as MigrationBackupError.

    Pre-change behavior: silently returns False (line 366-367).
    Post-change behavior: raises MigrationBackupError with `.code = "backup_failed"`.
    """
    class _CorruptStore(_MemoryStore):
        async def async_load(self) -> Any:
            return "not-a-dict"

    class _CorruptFactory:
        def __call__(self, *_args: Any, **_kwargs: Any) -> _CorruptStore:
            return _CorruptStore()

    monkeypatch.setattr(config_migration, "Store", _CorruptFactory())

    hass = _DummyHass()
    entry = _Entry(options={"min_capacity_percent": 25.0})

    with pytest.raises(MigrationBackupError) as exc_info:
        await config_migration.restore_last_backup(hass, entry)

    err = exc_info.value
    assert isinstance(err, MigrationError)
    assert err.code == "backup_failed"


@pytest.mark.asyncio
async def test_successful_migration_does_not_raise(monkeypatch):
    """Happy-path migration MUST NOT raise — only failure paths surface errors.

    Pre-change AND post-change both pass — guards the explicit-error refactor
    against accidentally turning success into a raise.
    """
    stores = _StoreFactory()
    monkeypatch.setattr(config_migration, "Store", stores)
    monkeypatch.setattr(config_migration, "_TRANSFORMS", [_passing_transform])

    hass = _DummyHass()
    entry = _Entry(options={"min_capacity_percent": 25.0})

    result = await run_migration(hass, entry)
    assert result is True
    assert entry.options["_migration"] == {"version": MIGRATION_VERSION, "complete": True}


def test_migration_error_classes_are_classified_and_inheritable():
    """The error hierarchy MUST carry a `.code` so callers can route by code,
    not by exception type or message string. This is the classified part of
    "explicit, classified errors" — `.code` is the classifier.
    """
    for cls, expected_code in (
        (MigrationError, "migration_error"),
        (MigrationTransformError, "transform_failed"),
        (MigrationBackupError, "backup_failed"),
    ):
        err = cls("boom", entry_id="entry-1")
        assert err.code == expected_code
        assert err.entry_id == "entry-1"
        assert err.message == "boom"
        classification = err.to_dict()
        assert classification["code"] == expected_code
        assert classification["entry_id"] == "entry-1"
        assert "message" in classification
