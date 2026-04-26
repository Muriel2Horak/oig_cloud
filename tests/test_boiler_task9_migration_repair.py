"""Task 9: destructive boiler migration, storage cleanup, and repair behavior."""

from __future__ import annotations

import importlib
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud.boiler import actuator as actuator_mod
from custom_components.oig_cloud.boiler.planner_contract import PlannerReasonCode
from custom_components.oig_cloud.const import DOMAIN


FIXED_NOW = datetime(2026, 4, 26, 9, 0, tzinfo=timezone.utc)


def _migration_mod():
    return importlib.import_module("custom_components.oig_cloud.boiler.migration")


class _MemoryStore:
    def __init__(self, backing: dict[str, Any], key: str) -> None:
        self._backing = backing
        self.key = key
        self.saved: list[Any] = []

    async def async_load(self):
        value = self._backing.get(self.key)
        if isinstance(value, dict):
            return dict(value)
        return value

    async def async_save(self, data):
        self.saved.append(data)
        if isinstance(data, dict):
            self._backing[self.key] = dict(data)
        else:
            self._backing[self.key] = data


class _StoreFactory:
    def __init__(self, backing: dict[str, Any] | None = None) -> None:
        self.backing = backing or {}
        self.instances: dict[str, _MemoryStore] = {}

    def __call__(self, _hass, _version, key):
        store = self.instances.get(key)
        if store is None:
            store = _MemoryStore(self.backing, key)
            self.instances[key] = store
        return store


class _DummyConfigEntries:
    def __init__(self) -> None:
        self.updated: list[Any] = []

    def async_update_entry(self, entry, *, options=None, data=None):
        if options is not None:
            entry.options = options
        if data is not None:
            entry.data = data
        self.updated.append(entry)


class _DummyServices:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, dict[str, Any], bool]] = []

    async def async_call(self, domain, service, data, blocking=False):
        self.calls.append((domain, service, data, blocking))


class _DummyStates:
    def __init__(self) -> None:
        self._states = {
            "switch.oig_box9_bojler_top": SimpleNamespace(state="on"),
            "switch.oig_box9_bojler_alt": SimpleNamespace(state="off"),
        }

    def get(self, entity_id):
        return self._states.get(entity_id)


class _DummyHass:
    def __init__(self) -> None:
        self.data: dict[str, Any] = {DOMAIN: {}}
        self.services = _DummyServices()
        self.states = _DummyStates()
        self.config_entries = _DummyConfigEntries()


class _DummyEntry:
    def __init__(
        self,
        *,
        entry_id: str = "entry9",
        options: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
    ) -> None:
        self.entry_id = entry_id
        self.options = options or {}
        self.data = data or {}


def _legacy_schedule_payload(entry_id: str = "entry9") -> dict[str, Any]:
    return {
        entry_id: {
            "created_at": FIXED_NOW.isoformat(),
            "entities": ["switch.oig_box9_bojler_top"],
            "windows": [
                {
                    "entity_id": "switch.oig_box9_bojler_top",
                    "start": (FIXED_NOW + timedelta(minutes=15)).isoformat(),
                    "end": (FIXED_NOW + timedelta(hours=1)).isoformat(),
                }
            ],
        }
    }


def _unsafe_legacy_options() -> dict[str, Any]:
    return {
        "enable_boiler": True,
        "boiler_box_id": "box9",
        "box_id": "box9",
        "boiler_volume_l": 180,
        "boiler_temp_sensor_top": "sensor.boiler_top",
        "boiler_heater_switch_entity": "switch.real_heater",
        "legacy_boiler_manual_override": {"enabled": True},
    }


def _safe_legacy_options() -> dict[str, Any]:
    return {
        "enable_boiler": True,
        "boiler_box_id": "box9",
        "box_id": "box9",
        "boiler_volume_l": 180,
        "boiler_temp_sensor_top": "sensor.boiler_top",
        "boiler_heater_switch_entity": "switch.real_heater",
        "boiler_effective_power_w": 2200,
        "boiler_alt_cost_kwh": 3.5,
        "boiler_stratification_mode": "simple_avg",
    }


def _ambiguous_alt_source_legacy_options() -> dict[str, Any]:
    options = _safe_legacy_options()
    options["boiler_has_alternative_heating"] = True
    return options


def _modern_complete_options() -> dict[str, Any]:
    return {
        "enable_boiler": True,
        "boiler_setup_complete": True,
        "boiler_storage_schema_version": 2,
        "boiler_box_id": "box9",
        "boiler_volume_l": 180,
        "boiler_temp_sensor_top": "sensor.boiler_top",
        "boiler_heater_switch_entity": "switch.real_heater",
    }


def _add_in_memory_schedule(hass: _DummyHass) -> list[str]:
    cancelled: list[str] = []
    hass.data[DOMAIN].setdefault("boiler_schedules", {})["entry9"] = SimpleNamespace(
        cancel_callbacks=[lambda: cancelled.append("timer-cancelled")],
        entities={"switch.oig_box9_bojler_top"},
        pump_entity="switch.oig_box9_bojler_pump",
        pump_follower_enabled=True,
    )
    return cancelled


@pytest.mark.asyncio
async def test_unsafe_legacy_config_forces_disable_and_repair():
    migration_mod = _migration_mod()
    hass = _DummyHass()
    entry = _DummyEntry(options=_unsafe_legacy_options())
    stores = _StoreFactory({"boiler_schedule": _legacy_schedule_payload()})

    result = await migration_mod.async_migrate_boiler_entry(
        hass,
        entry,
        store_factory=stores,
        now=FIXED_NOW,
    )

    assert result.repair_required is True
    assert result.reason == PlannerReasonCode.MIGRATION_REQUIRED.value
    assert entry.options["enable_boiler"] is False
    assert entry.options["boiler_setup_complete"] is False
    assert entry.options["boiler_migration_status"] == "repair_required"
    repairs = hass.data[DOMAIN]["boiler_repairs"]
    assert repairs[("entry9", "box9")]["reason"] == PlannerReasonCode.MIGRATION_REQUIRED.value


@pytest.mark.asyncio
async def test_stale_unversioned_schedule_is_archived_and_not_restored(monkeypatch):
    migration_mod = _migration_mod()
    hass = _DummyHass()
    entry = _DummyEntry(options=_unsafe_legacy_options())
    stores = _StoreFactory({"boiler_schedule": _legacy_schedule_payload()})

    await migration_mod.async_migrate_boiler_entry(
        hass,
        entry,
        store_factory=stores,
        now=FIXED_NOW,
    )

    assert stores.backing["boiler_schedule"] == {"schema_version": 2, "entries": {}}

    scheduled: list[Any] = []

    def _schedule(*args):
        scheduled.append(args)
        return [lambda: None]

    monkeypatch.setattr(actuator_mod, "Store", lambda *_a, **_k: stores(None, 2, "boiler_schedule"))
    monkeypatch.setattr(actuator_mod, "_schedule_switch_window", _schedule)

    await actuator_mod._restore_boiler_schedule(hass, "entry9")

    assert scheduled == []
    assert hass.data[DOMAIN].get("boiler_schedules", {}) == {}


@pytest.mark.asyncio
async def test_forced_disable_cancels_future_actions_without_switching_outputs():
    migration_mod = _migration_mod()
    hass = _DummyHass()
    cancelled = _add_in_memory_schedule(hass)
    entry = _DummyEntry(options=_unsafe_legacy_options())
    stores = _StoreFactory({"boiler_schedule": _legacy_schedule_payload()})

    await migration_mod.async_migrate_boiler_entry(
        hass,
        entry,
        store_factory=stores,
        now=FIXED_NOW,
    )

    assert cancelled == ["timer-cancelled"]
    assert hass.services.calls == []
    top_switch = hass.states.get("switch.oig_box9_bojler_top")
    assert top_switch is not None
    assert top_switch.state == "on"
    assert "entry9" not in hass.data[DOMAIN].get("boiler_schedules", {})


def test_entity_registry_cleanup_preserves_survivors_and_removes_obsolete(monkeypatch):
    migration_mod = _migration_mod()

    class Registry:
        def __init__(self) -> None:
            self.removed: list[str] = []

        def async_remove(self, entity_id: str) -> None:
            self.removed.append(entity_id)

    registry = Registry()
    entries = [
        SimpleNamespace(
            entity_id="sensor.oig_box9_boiler_upper_zone_temp",
            unique_id="oig_cloud_box9_boiler_upper_zone_temp",
        ),
        SimpleNamespace(
            entity_id="sensor.oig_box9_boiler_legacy_schedule_window",
            unique_id="oig_cloud_box9_boiler_legacy_schedule_window",
        ),
        SimpleNamespace(
            entity_id="switch.oig_box9_bojler_top",
            unique_id="oig_cloud_box9_boiler_bojler_top",
        ),
        SimpleNamespace(
            entity_id="sensor.oig_other_boiler_legacy_schedule_window",
            unique_id="oig_cloud_other_boiler_legacy_schedule_window",
        ),
    ]

    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        lambda _hass: registry,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_entries_for_config_entry",
        lambda _reg, _entry_id: entries,
    )

    result = migration_mod.cleanup_boiler_entity_registry(_DummyHass(), "entry9", "box9")

    assert result.preserved == [
        "sensor.oig_box9_boiler_upper_zone_temp",
        "switch.oig_box9_bojler_top",
    ]
    assert registry.removed == ["sensor.oig_box9_boiler_legacy_schedule_window"]


@pytest.mark.asyncio
async def test_restart_during_staged_migration_resumes_disabled_repair_state():
    migration_mod = _migration_mod()
    hass = _DummyHass()
    cancelled = _add_in_memory_schedule(hass)
    entry = _DummyEntry(options=_unsafe_legacy_options())
    stores = _StoreFactory(
        {
            "boiler_schedule": _legacy_schedule_payload(),
            "boiler_migration_entry9_box9": {
                "schema_version": 2,
                "migration_in_progress": True,
                "entry_id": "entry9",
                "box_id": "box9",
                "backup_key": "boiler_legacy_backup_entry9_box9",
            },
            "boiler_legacy_backup_entry9_box9": {"schema_version": 2},
        }
    )

    result = await migration_mod.async_migrate_boiler_entry(
        hass,
        entry,
        store_factory=stores,
        now=FIXED_NOW,
    )

    assert result.resumed is True
    assert result.repair_required is True
    assert entry.options["enable_boiler"] is False
    assert cancelled == ["timer-cancelled"]
    assert hass.services.calls == []
    top_switch = hass.states.get("switch.oig_box9_bojler_top")
    assert top_switch is not None
    assert top_switch.state == "on"
    assert stores.backing["boiler_schedule"] == {"schema_version": 2, "entries": {}}


@pytest.mark.asyncio
async def test_backup_and_schema_versioning_never_reenable_legacy_automation():
    migration_mod = _migration_mod()
    hass = _DummyHass()
    entry = _DummyEntry(options=_unsafe_legacy_options())
    stores = _StoreFactory({"boiler_schedule": _legacy_schedule_payload()})

    await migration_mod.async_migrate_boiler_entry(
        hass,
        entry,
        store_factory=stores,
        now=FIXED_NOW,
    )

    backup = stores.backing["boiler_legacy_backup_entry9_box9"]
    assert backup["schema_version"] == 2
    assert backup["legacy_schema_version"] == 1
    assert backup["entry_id"] == "entry9"
    assert backup["box_id"] == "box9"
    assert backup["legacy_schedule"]["entry9"]["windows"]

    migrated = stores.backing["boiler_migration_entry9_box9"]
    assert migrated["schema_version"] == 2
    assert migrated["automation_enabled"] is False
    assert migrated["repair_required"] is True

    await migration_mod.async_migrate_boiler_entry(
        hass,
        entry,
        store_factory=stores,
        now=FIXED_NOW + timedelta(minutes=5),
    )

    assert entry.options["enable_boiler"] is False


@pytest.mark.asyncio
async def test_modern_complete_versioned_config_is_not_disabled_or_repaired():
    migration_mod = _migration_mod()
    hass = _DummyHass()
    original_options = _modern_complete_options()
    entry = _DummyEntry(options=dict(original_options))
    stores = _StoreFactory({"boiler_schedule": {"schema_version": 2, "entries": {}}})

    result = await migration_mod.async_migrate_boiler_entry(
        hass,
        entry,
        store_factory=stores,
        now=FIXED_NOW,
    )

    assert result.action in {"noop", "already_modern"}
    assert result.repair_required is False
    assert result.safe_mapped is False
    assert entry.options == original_options
    assert "boiler_repairs" not in hass.data[DOMAIN]
    assert "boiler_migration_entry9_box9" not in stores.backing


@pytest.mark.asyncio
async def test_allowlisted_legacy_config_safe_maps_without_repair():
    migration_mod = _migration_mod()
    hass = _DummyHass()
    entry = _DummyEntry(options=_safe_legacy_options())
    stores = _StoreFactory({"boiler_schedule": {"schema_version": 2, "entries": {}}})

    result = await migration_mod.async_migrate_boiler_entry(
        hass,
        entry,
        store_factory=stores,
        now=FIXED_NOW,
    )

    assert result.safe_mapped is True
    assert result.repair_required is False
    assert entry.options["enable_boiler"] is True
    assert entry.options["boiler_setup_complete"] is True
    assert entry.options["boiler_storage_schema_version"] == 2
    assert "legacy_boiler_manual_override" not in entry.options
    assert stores.backing["boiler_migration_entry9_box9"]["schema_version"] == 2


def test_ambiguous_legacy_alternative_source_bool_is_not_safe_mapped_static_probe():
    migration_mod = _migration_mod()
    entry = _DummyEntry(options=_ambiguous_alt_source_legacy_options())

    assert migration_mod._can_safe_map(entry) is False
    assert "incomplete_or_ambiguous_config" in migration_mod._unsafe_legacy_reasons(
        entry,
        None,
    )


@pytest.mark.asyncio
async def test_ambiguous_legacy_alternative_source_bool_forces_repair():
    migration_mod = _migration_mod()
    hass = _DummyHass()
    entry = _DummyEntry(options=_ambiguous_alt_source_legacy_options())
    stores = _StoreFactory({"boiler_schedule": {"schema_version": 2, "entries": {}}})

    result = await migration_mod.async_migrate_boiler_entry(
        hass,
        entry,
        store_factory=stores,
        now=FIXED_NOW,
    )

    assert result.repair_required is True
    assert result.safe_mapped is False
    assert entry.options["enable_boiler"] is False
    assert entry.options["boiler_migration_status"] == "repair_required"
    assert entry.options.get("boiler_alt_source_mode") != "benchmark_only"


def test_migration_allowlist_and_denylist_are_explicit_contracts():
    migration_mod = _migration_mod()
    assert "boiler_volume_l" in migration_mod.LEGACY_BOILER_CONFIG_ALLOWLIST
    assert "boiler_temp_sensor_top" in migration_mod.LEGACY_BOILER_CONFIG_ALLOWLIST
    assert "legacy_boiler_manual_override" in migration_mod.LEGACY_BOILER_CONFIG_DENYLIST
    assert "schedule_windows" in migration_mod.LEGACY_BOILER_CONFIG_DENYLIST
