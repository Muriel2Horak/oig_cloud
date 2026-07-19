"""Transactional config-entry migration helpers for Task 4 cleanup migrations.

Protocol:
1) snapshot current options
2) validate + prepare all transform updates
3) write options (or requested updates)
4) mark migration complete
5) allow explicit restore from the backup store
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from homeassistant.helpers.storage import Store

from .config_merge import merge_entry_options

TRANSFORM = Callable[[dict[str, Any]], tuple[dict[str, Any], list[str]] | dict[str, Any]]

MIGRATION_VERSION = 1

_TRANSFORMS: list[TRANSFORM] = []
_LEGACY_OPTION_KEYS = frozenset(
    {
        "min_capacity_percent",
        "home_charge_rate",
        "max_price_conf",
        "enable_cheap_window_ups",
        "cheap_window_max_intervals",
        "cheap_window_soc_guard_kwh",
        "enable_economic_charging",
        "min_savings_margin",
        "safety_margin_percent",
        "percentile_conf",
    }
)


def register_transform(transform: TRANSFORM) -> None:
    """Register a planner/options migration transform.

    A transform must return either:
    - a dict of updates to apply
    - a tuple of (updates, removed_keys)
    """
    if transform not in _TRANSFORMS:
        _TRANSFORMS.append(transform)


def _backup_store(hass, entry_id: str) -> Store[dict[str, Any]]:
    return Store(
        hass,
        1,
        f"oig_cloud.migration_backup_{entry_id}",
        private=True,
    )


def _marker(options: dict[str, Any]) -> dict[str, Any]:
    marker_value = options.get("_migration")
    if isinstance(marker_value, dict):
        return marker_value
    return {}


def _is_complete(marker: dict[str, Any]) -> bool:
    return marker.get("version") == MIGRATION_VERSION and marker.get("complete") is True


def _has_legacy_state(options: dict[str, Any]) -> bool:
    return any(key in options for key in _LEGACY_OPTION_KEYS)


def _coerce_transform_output(result: object) -> tuple[dict[str, Any], set[str]]:
    if isinstance(result, tuple):
        if len(result) != 2:
            raise TypeError("transform tuple must be (updates, removed_keys)")
        updates, removed_keys = result
    else:
        updates = result
        removed_keys = []

    if not isinstance(updates, dict):
        raise TypeError("transform output must be dict or (dict, list[str])")

    normalized_removed = set(removed_keys)
    if not isinstance(normalized_removed, set):
        raise TypeError("removed_keys must be iterable of strings")
    return updates, {str(key) for key in normalized_removed}


def _append_journal(backup: dict[str, Any], event: str, **extra: Any) -> None:
    journal = backup.get("journal")
    if not isinstance(journal, list):
        journal = []
    entry: dict[str, Any] = {
        "event": event,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    if extra:
        entry.update(extra)
    journal.append(entry)
    backup["journal"] = journal


def _normalize_snapshot(options: Any) -> dict[str, Any]:
    if isinstance(options, dict):
        return dict(options)
    return {}


async def _load_backup(hass, entry_id: str) -> dict[str, Any]:
    try:
        data = await _backup_store(hass, entry_id).async_load()
    except Exception:
        return {}
    if isinstance(data, dict):
        return dict(data)
    return {}


async def _save_backup(hass, entry_id: str, payload: dict[str, Any]) -> None:
    store = _backup_store(hass, entry_id)
    await store.async_save(payload)


async def run_migration(hass, entry) -> bool:
    """Run all registered migration transforms once for this entry.

    Returns True when a migration attempt changes state or writes a completion marker.
    Returns False when already migrated for this schema version.
    """
    options = _normalize_snapshot(getattr(entry, "options", {}))
    marker_value = _marker(options)
    if _is_complete(marker_value):
        return False
    if not _has_legacy_state(options):
        return False

    entry_id = str(getattr(entry, "entry_id", ""))
    backup = await _load_backup(hass, entry_id)
    _append_journal(backup, "start")
    backup["schema_version"] = MIGRATION_VERSION
    backup["snapshot"] = dict(options)
    backup["restored_from"] = None

    working = dict(options)
    removed_keys: set[str] = set()
    updates: dict[str, Any] = {}

    try:
        for transform in list(_TRANSFORMS):
            transform_updates, transform_removed = _coerce_transform_output(transform(working))
            removed_keys.update(transform_removed)
            for removed_key in transform_removed:
                working.pop(removed_key, None)
            for key, value in transform_updates.items():
                working[key] = value
                updates[key] = value
    except Exception:
        backup["complete"] = False
        _append_journal(backup, "failed")
        await _save_backup(hass, entry_id, backup)
        return False

    # Changes computed from the working copy, including explicit removes.
    for key, value in working.items():
        if options.get(key) != value or key not in options:
            updates[key] = value
    removed_keys = {key for key in removed_keys if key in options and key not in working}

    if not updates and not removed_keys:
        updates = {"_migration": {"version": MIGRATION_VERSION, "complete": True}}

    backup["complete"] = False
    await _save_backup(hass, entry_id, backup)

    try:
        if not removed_keys:
            final_updates = dict(updates)
            final_updates["_migration"] = {"version": MIGRATION_VERSION, "complete": True}
            merge_entry_options(hass, entry, final_updates, suppress_reload=True)
        else:
            final_options = dict(options)
            final_options.update(updates)
            for key in removed_keys:
                final_options.pop(key, None)
            final_options["_migration"] = {"version": MIGRATION_VERSION, "complete": True}
            hass.config_entries.async_update_entry(entry, options=final_options)

        backup["complete"] = True
        _append_journal(backup, "committed")
        await _save_backup(hass, entry_id, backup)
    except Exception:
        hass.config_entries.async_update_entry(entry, options=dict(options))
        raise
    return True


async def restore_last_backup(hass, entry) -> bool:
    """Restore the latest migration snapshot for the given entry."""
    entry_id = str(getattr(entry, "entry_id", ""))
    backup = await _load_backup(hass, entry_id)
    if not isinstance(backup, dict):
        return False

    snapshot = backup.get("snapshot")
    if not isinstance(snapshot, dict):
        return False

    restored = dict(snapshot)
    restored.pop("_migration", None)
    options_snapshot = _normalize_snapshot(getattr(entry, "options", {}))
    if restored == options_snapshot:
        return True

    hass.config_entries.async_update_entry(entry, options=restored)
    _append_journal(backup, "restored")
    await _save_backup(hass, entry_id, backup)
    return True
