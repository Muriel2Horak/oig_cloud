"""Boiler migration, destructive cleanup, and repair helpers."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from ..const import DOMAIN, STORAGE_KEY_BOILER_SCHEDULE
from .planner_contract import PlannerReasonCode

_LOGGER = logging.getLogger(__name__)

MIGRATED_SCHEMA_VERSION = 2
LEGACY_SCHEMA_VERSION = 1

LEGACY_BOILER_CONFIG_ALLOWLIST = frozenset(
    {
        "box_id",
        "boiler_box_id",
        "boiler_volume_l",
        "boiler_temp_sensor_top",
        "boiler_temp_sensor_bottom",
        "boiler_enable_second_thermometer",
        "boiler_temp_sensor_position",
        "boiler_stratification_mode",
        "boiler_two_zone_split_ratio",
        "boiler_heater_switch_entity",
        "boiler_effective_power_w",
        "boiler_recovery_rate_c_per_hour",
        "boiler_heater_power_kw_entity",
        "boiler_has_alternative_heating",
        "boiler_alt_source_mode",
        "boiler_alt_cost_kwh",
        "boiler_alt_heater_switch_entity",
        "boiler_alt_energy_sensor",
        "boiler_spot_price_sensor",
    }
)

LEGACY_BOILER_CONFIG_DENYLIST = frozenset(
    {
        "legacy_boiler_manual_override",
        "boiler_manual_override",
        "boiler_override_state",
        "boiler_runtime_snapshot",
        "boiler_last_plan",
        "boiler_current_plan",
        "boiler_plan_snapshot",
        "boiler_schedule",
        "boiler_schedule_windows",
        "schedule_windows",
        "boiler_circulation_windows",
        "boiler_guessed_alt_source",
        "boiler_alt_source_capability_guess",
        "boiler_hardcoded_box_default",
    }
)

_MIGRATION_META_KEYS = frozenset(
    {
        "enable_boiler",
        "boiler_module_selected",
        "boiler_setup_complete",
        "boiler_setup_mode",
        "boiler_storage_schema_version",
        "boiler_migration_status",
        "boiler_repair_reason",
    }
)

_REQUIRED_SAFE_MAPPING_KEYS = frozenset(
    {
        "boiler_box_id",
        "boiler_volume_l",
        "boiler_temp_sensor_top",
        "boiler_heater_switch_entity",
    }
)

_SAFE_ALT_SOURCE_MODES = frozenset({"disabled", "benchmark_only", "controllable"})

_OBSOLETE_BOILER_ENTITY_SUFFIXES = frozenset(
    {
        "legacy_schedule_window",
        "schedule_window",
        "manual_override",
        "circulation_window",
        "pump_schedule_window",
    }
)

_SURVIVING_BOILER_ENTITY_SUFFIXES = frozenset(
    {
        "upper_zone_temp",
        "lower_zone_temp",
        "avg_temp",
        "energy_needed",
        "total_energy",
        "fve_energy",
        "grid_energy",
        "alt_energy",
        "current_source",
        "recommended_source",
        "charging_recommended",
        "circulation_recommended",
        "estimated_cost",
        "profile_confidence",
        "bojler_top",
        "bojler_alt",
    }
)

StoreFactory = Callable[[HomeAssistant, int, str], Any]


@dataclass(frozen=True)
class BoilerMigrationResult:
    entry_id: str
    box_id: str
    action: str
    reason: str = ""
    repair_required: bool = False
    safe_mapped: bool = False
    resumed: bool = False
    backup_key: str | None = None
    unsafe_reasons: tuple[str, ...] = ()


@dataclass(frozen=True)
class BoilerEntityCleanupResult:
    preserved: list[str] = field(default_factory=list)
    removed: list[str] = field(default_factory=list)


def migration_store_key(entry_id: str, box_id: str) -> str:
    return f"boiler_migration_{entry_id}_{box_id}"


def legacy_backup_key(entry_id: str, box_id: str) -> str:
    return f"boiler_legacy_backup_{entry_id}_{box_id}"


def boiler_restore_blocked(hass: HomeAssistant, entry_id: str) -> bool:
    repairs = hass.data.get(DOMAIN, {}).get("boiler_repairs", {})
    if isinstance(repairs, dict):
        return any(key[0] == entry_id for key in repairs if isinstance(key, tuple))
    return False


async def async_migrate_boiler_entry(
    hass: HomeAssistant,
    entry: Any,
    *,
    store_factory: StoreFactory | None = None,
    now: datetime | None = None,
) -> BoilerMigrationResult:
    """Run the explicit Task 9 migration contract for one config entry."""
    if now is None:
        now = dt_util.now()

    box_id = _resolve_boiler_box_id(entry)
    entry_id = str(entry.entry_id)
    migration_key = migration_store_key(entry_id, box_id)
    backup_key = legacy_backup_key(entry_id, box_id)
    migration_store = _make_store(hass, migration_key, store_factory)
    migration_state = await _async_load_dict(migration_store)
    schedule_store = _make_store(hass, STORAGE_KEY_BOILER_SCHEDULE, store_factory)
    schedule_payload = await _async_load_dict(schedule_store)

    if migration_state.get("migration_in_progress") is True:
        return await _resume_destructive_migration(
            hass=hass,
            entry=entry,
            box_id=box_id,
            now=now,
            migration_store=migration_store,
            schedule_store=schedule_store,
            schedule_payload=schedule_payload,
            backup_key=str(migration_state.get("backup_key") or backup_key),
        )

    entry_schedule = _schedule_entries(schedule_payload).get(entry_id)
    if _is_modern_versioned_complete(entry) and not entry_schedule:
        return BoilerMigrationResult(
            entry_id=entry_id,
            box_id=box_id,
            action="already_modern",
        )

    if not _has_boiler_migration_work(entry, entry_schedule):
        return BoilerMigrationResult(entry_id=entry_id, box_id=box_id, action="noop")

    unsafe_reasons = _unsafe_legacy_reasons(entry, entry_schedule)
    if unsafe_reasons:
        return await _destructive_disable_for_repair(
            hass=hass,
            entry=entry,
            box_id=box_id,
            now=now,
            migration_store=migration_store,
            schedule_store=schedule_store,
            schedule_payload=schedule_payload,
            backup_key=backup_key,
            unsafe_reasons=unsafe_reasons,
            resumed=False,
            write_backup=True,
        )

    if _can_safe_map(entry):
        return await _safe_map_legacy_config(
            hass=hass,
            entry=entry,
            box_id=box_id,
            now=now,
            migration_store=migration_store,
        )

    return BoilerMigrationResult(entry_id=entry_id, box_id=box_id, action="noop")


def cleanup_boiler_entity_registry(
    hass: HomeAssistant,
    entry_id: str,
    box_id: str,
) -> BoilerEntityCleanupResult:
    """Preserve surviving boiler unique IDs and remove obsolete boiler entities."""
    try:
        from homeassistant.helpers import entity_registry as er

        registry = er.async_get(hass)
        entries = er.async_entries_for_config_entry(registry, entry_id)
    except Exception as exc:
        _LOGGER.debug("Boiler entity registry cleanup skipped: %s", exc)
        return BoilerEntityCleanupResult()

    prefix = f"oig_cloud_{box_id}_boiler_"
    preserved: list[str] = []
    removed: list[str] = []
    for entity in entries:
        unique_id = str(getattr(entity, "unique_id", "") or "")
        entity_id = str(getattr(entity, "entity_id", "") or "")
        if not unique_id.startswith(prefix):
            continue
        suffix = unique_id[len(prefix):]
        if suffix in _SURVIVING_BOILER_ENTITY_SUFFIXES:
            preserved.append(entity_id)
            continue
        if suffix in _OBSOLETE_BOILER_ENTITY_SUFFIXES:
            try:
                registry.async_remove(entity_id)
                removed.append(entity_id)
            except Exception as exc:
                _LOGGER.warning("Failed to remove obsolete boiler entity %s: %s", entity_id, exc)
    return BoilerEntityCleanupResult(preserved=preserved, removed=removed)


async def _resume_destructive_migration(
    *,
    hass: HomeAssistant,
    entry: Any,
    box_id: str,
    now: datetime,
    migration_store: Any,
    schedule_store: Any,
    schedule_payload: dict[str, Any],
    backup_key: str,
) -> BoilerMigrationResult:
    return await _destructive_disable_for_repair(
        hass=hass,
        entry=entry,
        box_id=box_id,
        now=now,
        migration_store=migration_store,
        schedule_store=schedule_store,
        schedule_payload=schedule_payload,
        backup_key=backup_key,
        unsafe_reasons=("migration_in_progress",),
        resumed=True,
        write_backup=False,
    )


async def _destructive_disable_for_repair(
    *,
    hass: HomeAssistant,
    entry: Any,
    box_id: str,
    now: datetime,
    migration_store: Any,
    schedule_store: Any,
    schedule_payload: dict[str, Any],
    backup_key: str,
    unsafe_reasons: tuple[str, ...],
    resumed: bool,
    write_backup: bool,
) -> BoilerMigrationResult:
    entry_id = str(entry.entry_id)
    if write_backup:
        backup_store = _make_store_from_existing(schedule_store, hass, backup_key)
        await backup_store.async_save(
            _build_backup_payload(entry, box_id, schedule_payload, now)
        )

    await migration_store.async_save(
        {
            "schema_version": MIGRATED_SCHEMA_VERSION,
            "entry_id": entry_id,
            "box_id": box_id,
            "migration_in_progress": True,
            "backup_key": backup_key,
            "unsafe_reasons": list(unsafe_reasons),
            "started_at": now.isoformat(),
        }
    )

    await _clear_legacy_schedules_without_switching(
        hass, entry_id, schedule_store, schedule_payload
    )
    _apply_disabled_options(hass, entry, box_id)
    _raise_repair_issue(hass, entry_id, box_id, PlannerReasonCode.MIGRATION_REQUIRED.value)
    cleanup_boiler_entity_registry(hass, entry_id, box_id)

    final_state = {
        "schema_version": MIGRATED_SCHEMA_VERSION,
        "entry_id": entry_id,
        "box_id": box_id,
        "migration_in_progress": False,
        "automation_enabled": False,
        "repair_required": True,
        "reason": PlannerReasonCode.MIGRATION_REQUIRED.value,
        "backup_key": backup_key,
        "unsafe_reasons": list(unsafe_reasons),
        "completed_at": now.isoformat(),
    }
    await migration_store.async_save(final_state)
    return BoilerMigrationResult(
        entry_id=entry_id,
        box_id=box_id,
        action="disabled_repair",
        reason=PlannerReasonCode.MIGRATION_REQUIRED.value,
        repair_required=True,
        safe_mapped=False,
        resumed=resumed,
        backup_key=backup_key,
        unsafe_reasons=unsafe_reasons,
    )


async def _safe_map_legacy_config(
    *,
    hass: HomeAssistant,
    entry: Any,
    box_id: str,
    now: datetime,
    migration_store: Any,
) -> BoilerMigrationResult:
    entry_id = str(entry.entry_id)
    options = dict(entry.options)
    options["box_id"] = box_id
    options["boiler_box_id"] = box_id
    options["enable_boiler"] = True
    options["boiler_setup_complete"] = True
    options["boiler_storage_schema_version"] = MIGRATED_SCHEMA_VERSION
    options["boiler_migration_status"] = "migrated"
    _update_entry_options(hass, entry, options)
    await migration_store.async_save(
        {
            "schema_version": MIGRATED_SCHEMA_VERSION,
            "entry_id": entry_id,
            "box_id": box_id,
            "migration_in_progress": False,
            "automation_enabled": True,
            "repair_required": False,
            "safe_mapped_fields": sorted(_safe_boiler_keys(options)),
            "completed_at": now.isoformat(),
        }
    )
    return BoilerMigrationResult(
        entry_id=entry_id,
        box_id=box_id,
        action="safe_mapped",
        safe_mapped=True,
    )


def _resolve_boiler_box_id(entry: Any) -> str:
    for container in (getattr(entry, "options", {}), getattr(entry, "data", {})):
        if not isinstance(container, dict):
            continue
        for key in ("boiler_box_id", "box_id", "inverter_sn"):
            value = container.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return "unknown"


def _make_store(
    hass: HomeAssistant,
    key: str,
    store_factory: StoreFactory | None,
) -> Any:
    if store_factory is not None:
        return store_factory(hass, MIGRATED_SCHEMA_VERSION, key)
    return Store(hass, MIGRATED_SCHEMA_VERSION, key)


def _make_store_from_existing(existing_store: Any, hass: HomeAssistant, key: str) -> Any:
    factory = getattr(existing_store, "_factory", None)
    if callable(factory):
        return factory(hass, MIGRATED_SCHEMA_VERSION, key)
    backing = getattr(existing_store, "_backing", None)
    if isinstance(backing, dict):
        return type(existing_store)(backing, key)
    return Store(hass, MIGRATED_SCHEMA_VERSION, key)


async def _async_load_dict(store: Any) -> dict[str, Any]:
    try:
        data = await store.async_load()
    except Exception as exc:
        _LOGGER.warning("Boiler migration store load failed: %s", exc)
        return {}
    return data if isinstance(data, dict) else {}


def _has_boiler_migration_work(entry: Any, entry_schedule: Any) -> bool:
    if entry_schedule:
        return True
    options = getattr(entry, "options", {})
    data = getattr(entry, "data", {})
    for container in (options, data):
        if not isinstance(container, dict):
            continue
        if container.get("enable_boiler"):
            return True
        if any(str(key).startswith("boiler_") for key in container):
            return True
        if any(key in LEGACY_BOILER_CONFIG_DENYLIST for key in container):
            return True
    return False


def _unsafe_legacy_reasons(entry: Any, entry_schedule: Any) -> tuple[str, ...]:
    reasons: list[str] = []
    if entry_schedule:
        reasons.append("legacy_schedule")
    options = getattr(entry, "options", {})
    data = getattr(entry, "data", {})
    for container_name, container in (("options", options), ("data", data)):
        if not isinstance(container, dict):
            continue
        for key, value in container.items():
            if key in LEGACY_BOILER_CONFIG_DENYLIST:
                reasons.append(f"denylist:{container_name}:{key}")
            elif _is_unknown_legacy_boiler_key(key, entry):
                reasons.append(f"unknown:{container_name}:{key}")
            if _contains_hardcoded_legacy_box(value):
                reasons.append(f"hardcoded_box:{container_name}:{key}")
        if _has_ambiguous_alt_source_capability(container):
            reasons.append(f"ambiguous_alt_source:{container_name}")
    if _wants_boiler_enabled(entry) and not _can_safe_map(entry):
        reasons.append("incomplete_or_ambiguous_config")
    return tuple(dict.fromkeys(reasons))


def _is_unknown_legacy_boiler_key(key: str, entry: Any) -> bool:
    if not str(key).startswith("boiler_"):
        return False
    if _is_modern_complete(entry):
        return False
    return key not in LEGACY_BOILER_CONFIG_ALLOWLIST and key not in _MIGRATION_META_KEYS


def _contains_hardcoded_legacy_box(value: Any) -> bool:
    if isinstance(value, str):
        return "2206237016" in value
    if isinstance(value, dict):
        return any(_contains_hardcoded_legacy_box(v) for v in value.values())
    if isinstance(value, (list, tuple, set)):
        return any(_contains_hardcoded_legacy_box(v) for v in value)
    return False


def _wants_boiler_enabled(entry: Any) -> bool:
    options = getattr(entry, "options", {})
    return isinstance(options, dict) and bool(options.get("enable_boiler"))


def _is_modern_complete(entry: Any) -> bool:
    options = getattr(entry, "options", {})
    return isinstance(options, dict) and bool(options.get("boiler_setup_complete"))


def _is_modern_versioned_complete(entry: Any) -> bool:
    options = getattr(entry, "options", {})
    if not isinstance(options, dict):
        return False
    if not options.get("enable_boiler"):
        return False
    if not options.get("boiler_setup_complete"):
        return False
    if options.get("boiler_storage_schema_version") != MIGRATED_SCHEMA_VERSION:
        return False
    if not _REQUIRED_SAFE_MAPPING_KEYS.issubset(options):
        return False
    return not _has_denylisted_or_hardcoded_marker(entry)


def _has_denylisted_or_hardcoded_marker(entry: Any) -> bool:
    for container in (getattr(entry, "options", {}), getattr(entry, "data", {})):
        if not isinstance(container, dict):
            continue
        for key, value in container.items():
            if key in LEGACY_BOILER_CONFIG_DENYLIST:
                return True
            if _contains_hardcoded_legacy_box(value):
                return True
    return False


def _can_safe_map(entry: Any) -> bool:
    options = getattr(entry, "options", {})
    if not isinstance(options, dict) or not options.get("enable_boiler"):
        return False
    if _is_modern_complete(entry):
        return False
    if _has_ambiguous_alt_source_capability(options):
        return False
    safe_keys = _safe_boiler_keys(options)
    return _REQUIRED_SAFE_MAPPING_KEYS.issubset(safe_keys)


def _has_ambiguous_alt_source_capability(options: dict[str, Any]) -> bool:
    mode_present = "boiler_alt_source_mode" in options
    mode = options.get("boiler_alt_source_mode")
    if options.get("boiler_has_alternative_heating") is True and not mode_present:
        return True
    if not mode_present:
        return False
    if mode not in _SAFE_ALT_SOURCE_MODES:
        return True
    if mode == "controllable" and not _is_nonempty_string(
        options.get("boiler_alt_heater_switch_entity")
    ):
        return True
    return False


def _is_nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _safe_boiler_keys(options: dict[str, Any]) -> set[str]:
    return {
        key for key in options if key in LEGACY_BOILER_CONFIG_ALLOWLIST
    }


def _build_backup_payload(
    entry: Any,
    box_id: str,
    schedule_payload: dict[str, Any],
    now: datetime,
) -> dict[str, Any]:
    return {
        "schema_version": MIGRATED_SCHEMA_VERSION,
        "legacy_schema_version": _schedule_schema_version(schedule_payload),
        "entry_id": str(entry.entry_id),
        "box_id": box_id,
        "created_at": now.isoformat(),
        "legacy_config": {
            "data": dict(getattr(entry, "data", {}) or {}),
            "options": dict(getattr(entry, "options", {}) or {}),
        },
        "legacy_schedule": schedule_payload,
        "restore_policy": "backup_only_never_auto_enable",
    }


def _schedule_schema_version(schedule_payload: dict[str, Any]) -> int:
    version = schedule_payload.get("schema_version")
    return version if version == MIGRATED_SCHEMA_VERSION else LEGACY_SCHEMA_VERSION


def _schedule_entries(schedule_payload: dict[str, Any]) -> dict[str, Any]:
    if schedule_payload.get("schema_version") == MIGRATED_SCHEMA_VERSION:
        entries = schedule_payload.get("entries", {})
        return dict(entries) if isinstance(entries, dict) else {}
    return dict(schedule_payload)


async def _clear_legacy_schedules_without_switching(
    hass: HomeAssistant,
    entry_id: str,
    schedule_store: Any,
    schedule_payload: dict[str, Any],
) -> None:
    from .actuator import clear_in_memory_schedule_without_switching

    clear_in_memory_schedule_without_switching(hass, entry_id)
    entries = _schedule_entries(schedule_payload)
    entries.pop(entry_id, None)
    await schedule_store.async_save(
        {"schema_version": MIGRATED_SCHEMA_VERSION, "entries": entries}
    )


def _apply_disabled_options(hass: HomeAssistant, entry: Any, box_id: str) -> None:
    options = dict(getattr(entry, "options", {}) or {})
    options["box_id"] = box_id
    options["boiler_box_id"] = box_id
    options["enable_boiler"] = False
    options["boiler_setup_complete"] = False
    options["boiler_storage_schema_version"] = MIGRATED_SCHEMA_VERSION
    options["boiler_migration_status"] = "repair_required"
    options["boiler_repair_reason"] = PlannerReasonCode.MIGRATION_REQUIRED.value
    _update_entry_options(hass, entry, options)


def _update_entry_options(hass: HomeAssistant, entry: Any, options: dict[str, Any]) -> None:
    config_entries = getattr(hass, "config_entries", None)
    updater = getattr(config_entries, "async_update_entry", None)
    if callable(updater):
        updater(entry, options=options)
    else:
        entry.options = options


def _raise_repair_issue(
    hass: HomeAssistant,
    entry_id: str,
    box_id: str,
    reason: str,
) -> None:
    domain_data = hass.data.setdefault(DOMAIN, {})
    repairs = domain_data.setdefault("boiler_repairs", {})
    repairs[(entry_id, box_id)] = {
        "reason": reason,
        "issue_id": _repair_issue_id(entry_id, box_id),
        "re_onboarding_required": True,
    }
    try:
        from homeassistant.helpers import issue_registry as ir
        from homeassistant.helpers.issue_registry import IssueSeverity

        ir.async_create_issue(
            hass,
            DOMAIN,
            _repair_issue_id(entry_id, box_id),
            is_fixable=True,
            severity=IssueSeverity.WARNING,
            translation_key="boiler_reonboarding_required",
            translation_placeholders={"entry_id": entry_id, "box_id": box_id},
        )
    except Exception as exc:
        _LOGGER.debug("HA repair issue registry unavailable for boiler migration: %s", exc)


def _repair_issue_id(entry_id: str, box_id: str) -> str:
    return f"boiler_reonboarding_required_{entry_id}_{box_id}"
