"""Tests for the registry-scale-driven legacy percent -> fraction migration.

Owner live repro: `expensive_percentile` (config_registry.py:314) is canonical
FRACTION (0.5-0.95) with a `scale=100` display hint, but a pre-registry-era
stored option may still hold the raw display percent (70 instead of 0.70).
That value flows unchanged into `PlannerInputs` (forecast_update.py:1006),
which rejects anything outside (0, 1] — the live planner run raises, is
caught by `_run_planner`'s broad `except Exception`, and silently returns an
empty timeline every cycle. The migration transform here normalizes any
registry field carrying `scale` whose stored value is out of its canonical
[min, max] but sane once divided by `scale`.
"""

from __future__ import annotations

import copy
import logging
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud import config_migration
from custom_components.oig_cloud.config_migration import (
    MIGRATION_VERSION,
    _has_legacy_state,
    _percentile_unit_migration_transform,
    run_migration,
)


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
    def __init__(self) -> None:
        self.stores: dict[str, _MemoryStore] = {}

    def __call__(self, *_args: Any, **kwargs: Any) -> _MemoryStore:
        entry_id = ""
        if len(_args) >= 3:
            entry_id = str(_args[2]).replace("oig_cloud.migration_backup_", "")
        key = str(entry_id)
        if key not in self.stores:
            self.stores[key] = _MemoryStore()
        self.stores[key].private = kwargs.get("private", False)
        return self.stores[key]

    def backup(self, entry_id: str = "entry-1") -> dict[str, Any] | None:
        store = self.stores.get(entry_id)
        if not store or not isinstance(store.value, dict):
            return None
        return copy.deepcopy(store.value)


def test_transform_rescales_legacy_percent_to_canonical_fraction():
    updates = _percentile_unit_migration_transform({"expensive_percentile": 70})
    assert updates == {"expensive_percentile": 0.7}


def test_transform_is_noop_for_already_canonical_value():
    updates = _percentile_unit_migration_transform({"expensive_percentile": 0.7})
    assert updates == {}


def test_transform_is_noop_when_rescale_still_out_of_range():
    # 999 / 100 = 9.99, still far above max=0.95 — never guess at nonsense.
    updates = _percentile_unit_migration_transform({"expensive_percentile": 999})
    assert updates == {}


def test_transform_is_noop_when_field_absent():
    updates = _percentile_unit_migration_transform({"charge_rate_kw": 2.8})
    assert updates == {}


def test_transform_ignores_fields_without_a_registry_scale():
    # cheap_window_percentile is canonically a percent already (no `scale`
    # on its Field) — must never be divided.
    updates = _percentile_unit_migration_transform({"cheap_window_percentile": 30})
    assert updates == {}


def test_has_legacy_state_detects_out_of_range_scaled_value_alone():
    """A stored value like 70 has no key overlap with `_LEGACY_OPTION_KEYS`
    (it IS a known registry key) — the gate must still fire on the value
    itself, not just on presence of a legacy key name."""
    assert _has_legacy_state({"expensive_percentile": 70}) is True


def test_has_legacy_state_false_for_canonical_value():
    assert _has_legacy_state({"expensive_percentile": 0.7}) is False


@pytest.mark.asyncio
async def test_run_migration_rescales_owner_stored_value_and_logs(monkeypatch, caplog):
    stores = _StoreFactory()
    monkeypatch.setattr(config_migration, "Store", stores)

    hass = _DummyHass()
    entry = _Entry(options={"expensive_percentile": 70, "enable_battery_prediction": True})

    with caplog.at_level(logging.INFO):
        migrated = await run_migration(hass, entry)

    assert migrated is True
    assert entry.options["expensive_percentile"] == pytest.approx(0.7)
    assert entry.options["enable_battery_prediction"] is True
    assert "expensive_percentile" in caplog.text
    assert "70" in caplog.text and "0.7" in caplog.text


@pytest.mark.asyncio
async def test_run_migration_leaves_canonical_value_untouched(monkeypatch):
    stores = _StoreFactory()
    monkeypatch.setattr(config_migration, "Store", stores)

    hass = _DummyHass()
    entry = _Entry(options={"expensive_percentile": 0.8})

    migrated = await run_migration(hass, entry)

    assert migrated is False
    assert entry.options["expensive_percentile"] == 0.8
