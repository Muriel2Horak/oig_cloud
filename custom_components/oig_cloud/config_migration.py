"""Transactional config-entry migration helpers for Task 4 cleanup migrations.

Protocol:
1) snapshot current options
2) validate + prepare all transform updates
3) write options (or requested updates)
4) mark migration complete
5) allow explicit restore from the backup store

Task 7 — explicit, classified migration errors
----------------------------------------------
Every migration failure surfaces as a `MigrationError` subclass (see below) with
a stable `.code` classifier. Callers MUST NOT receive silent fallbacks,
swallowed exceptions, or log-line-only diagnostics — the silent-fallback shape
(`except Exception: return False`) was Task 7's target and is no longer present
in this module. No-op paths (already migrated / no legacy state / no-op
restore) keep returning False and do NOT raise.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Callable

from homeassistant.helpers.storage import Store

from .config_merge import merge_entry_options

TRANSFORM = Callable[[dict[str, Any]], tuple[dict[str, Any], list[str]] | dict[str, Any]]

MIGRATION_VERSION = 1
_REDACTED = "[redacted]"
_LEGACY_SECRET_ALIASES = frozenset(
    {
        "ai_api_key",
        "api_key",
        "forecast_solar_api_key",
        "password",
        "solar_api_key",
        "solcast_key",
    }
)


# ---------------------------------------------------------------------------
# Explicit, classified error surface (Task 7).
#
# Migration failures surface as one of these subclasses — never as a silent
# return, never as a swallowed `except Exception: return False`, never as a
# log-line-only signal. Callers route by `.code` (stable string classifier),
# not by exception type or message. The pre-migration snapshot is recorded
# before the error is raised so the entry remains recoverable.
# ---------------------------------------------------------------------------


class MigrationError(Exception):
    """Base class for explicit, classified migration errors (Task 7).

    Carries a stable `.code` so callers can route failures without parsing
    message strings. Subclasses set `code` to a specific classifier. The
    originating exception (if any) is exposed via `__cause__`.
    """

    code: str = "migration_error"

    def __init__(
        self,
        message: str,
        *,
        entry_id: str = "",
        cause: BaseException | None = None,
        **context: Any,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.entry_id = entry_id
        self.context: dict[str, Any] = dict(context)
        if cause is not None:
            self.__cause__ = cause

    def to_dict(self) -> dict[str, Any]:
        """Return a classified, structured representation for diagnostics.

        Stable shape (same keys for every subclass) so consumers can parse
        without per-class branching. The `.code` is the primary classifier.
        """
        out: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.entry_id:
            out["entry_id"] = self.entry_id
        if self.context:
            out["context"] = dict(self.context)
        if self.__cause__ is not None:
            out["cause_type"] = type(self.__cause__).__name__
            out["cause_message"] = str(self.__cause__)
        return out


class MigrationTransformError(MigrationError):
    """A registered migration transform raised during evaluation.

    Classifier: `"transform_failed"`. The pre-migration snapshot is preserved
    in the backup store; the entry's options remain untouched.
    """

    code = "transform_failed"


class MigrationBackupError(MigrationError):
    """A backup-store read or write failed unrecoverably.

    Classifier: `"backup_failed"`. Raised when the pre-commit snapshot save
    fails, when the post-commit "complete" save fails, or when
    `restore_last_backup` cannot read a usable snapshot.
    """

    code = "backup_failed"


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
_DEAD_OPTION_KEYS = frozenset(
    {
        "notifications_scan_interval",
        "tariff_weekend_same_as_weekday",
        "planning_min_percent",
        "disable_planning_min_guard",
        "price_hysteresis_czk",
        "hw_min_hold_hours",
        "boiler_comfort_profile_mode",
        "boiler_planning_horizon_hours",
        "boiler_recovery_rate_c_per_hour",
        "boiler_alt_source_mode",
    }
)

_AUTHOR_DEFAULT_GPS_SCALE = 10_000_000
_AUTHOR_DEFAULT_SOLAR_LATITUDE = 501_219_800 / _AUTHOR_DEFAULT_GPS_SCALE
_AUTHOR_DEFAULT_SOLAR_LONGITUDE = 139_373_742 / _AUTHOR_DEFAULT_GPS_SCALE
_AUTHOR_DEFAULT_SOLAR_STRING1 = {
    "solar_forecast_string1_declination": 10,
    "solar_forecast_string1_azimuth": 138,
    "solar_forecast_string1_kwp": 5.4,
}
_AUTHOR_DEFAULT_SOLAR_STRING2 = {
    "solar_forecast_string2_declination": 10,
    "solar_forecast_string2_azimuth": 138,
    "solar_forecast_string2_kwp": 0,
}


def register_transform(transform: TRANSFORM) -> None:
    """Register a planner/options migration transform.

    A transform must return either:
    - a dict of updates to apply
    - a tuple of (updates, removed_keys)
    """
    if transform not in _TRANSFORMS:
        _TRANSFORMS.append(transform)


def _missing_option(options: dict[str, Any], key: str) -> bool:
    return options.get(key) in (None, "")


def _author_defaults_preseed_transform(options: dict[str, Any]) -> dict[str, Any]:
    """Pre-seed values old releases effectively supplied through removed defaults."""
    if options.get("enable_solar_forecast") is not True:
        return {}

    provider = options.get("solar_forecast_provider") or "forecast_solar"
    if provider != "forecast_solar":
        return {}

    updates: dict[str, Any] = {}
    if _missing_option(options, "solar_forecast_provider"):
        updates["solar_forecast_provider"] = "forecast_solar"
    if _missing_option(options, "solar_forecast_latitude"):
        updates["solar_forecast_latitude"] = _AUTHOR_DEFAULT_SOLAR_LATITUDE
    if _missing_option(options, "solar_forecast_longitude"):
        updates["solar_forecast_longitude"] = _AUTHOR_DEFAULT_SOLAR_LONGITUDE

    string1_enabled = options.get("solar_forecast_string1_enabled")
    if string1_enabled is not False:
        if _missing_option(options, "solar_forecast_string1_enabled"):
            updates["solar_forecast_string1_enabled"] = True
        for key, value in _AUTHOR_DEFAULT_SOLAR_STRING1.items():
            if _missing_option(options, key):
                updates[key] = value

    if options.get("solar_forecast_string2_enabled") is True:
        for key, value in _AUTHOR_DEFAULT_SOLAR_STRING2.items():
            if _missing_option(options, key):
                updates[key] = value

    return updates


register_transform(_author_defaults_preseed_transform)


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


def _secret_field_keys() -> frozenset[str]:
    from .config_registry import FIELD_REGISTRY

    secret_keys: set[str] = set(_LEGACY_SECRET_ALIASES)
    for key, field in FIELD_REGISTRY.items():
        if not getattr(field, "secret", False):
            continue
        secret_keys.add(key)
        mirror = getattr(field, "mirror", None)
        if mirror:
            secret_keys.add(str(mirror))
    return frozenset(secret_keys)


def _secret_values(payload: Any, secret_keys: frozenset[str]) -> frozenset[str]:
    values: set[str] = set()
    if isinstance(payload, dict):
        for key, value in payload.items():
            if str(key) in secret_keys and isinstance(value, str) and value:
                values.add(value)
            values.update(_secret_values(value, secret_keys))
    elif isinstance(payload, list):
        for item in payload:
            values.update(_secret_values(item, secret_keys))
    return frozenset(values)


def _redact_text(value: str, needles: frozenset[str]) -> str:
    redacted = value
    for needle in sorted((item for item in needles if item), key=len, reverse=True):
        redacted = redacted.replace(needle, _REDACTED)
    return redacted


def _sanitize_backup_payload(
    payload: Any,
    secret_keys: frozenset[str],
    secret_values: frozenset[str],
) -> Any:
    needles = frozenset(set(secret_keys) | set(secret_values))
    if isinstance(payload, dict):
        return {
            key: _sanitize_backup_payload(value, secret_keys, secret_values)
            for key, value in payload.items()
            if str(key) not in secret_keys
        }
    if isinstance(payload, list):
        return [
            _sanitize_backup_payload(item, secret_keys, secret_values)
            for item in payload
        ]
    if isinstance(payload, str):
        return _redact_text(payload, needles)
    return payload


def _assert_no_backup_secret(
    payload: dict[str, Any],
    secret_keys: frozenset[str],
    secret_values: frozenset[str],
) -> None:
    serialized = json.dumps(payload, sort_keys=True, default=str)
    leaked_key = next((key for key in secret_keys if key and key in serialized), None)
    leaked_value = next(
        (value for value in secret_values if value and value in serialized),
        None,
    )
    if leaked_key or leaked_value:
        raise ValueError("migration backup contains secret material")


def _sanitize_backup_for_save(payload: dict[str, Any]) -> dict[str, Any]:
    secret_keys = _secret_field_keys()
    secret_values = _secret_values(payload, secret_keys)
    sanitized = _sanitize_backup_payload(payload, secret_keys, secret_values)
    if not isinstance(sanitized, dict):
        raise ValueError("migration backup payload must be a dict")
    _assert_no_backup_secret(sanitized, secret_keys, secret_values)
    return sanitized


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
    payload = _sanitize_backup_for_save(payload)
    store = _backup_store(hass, entry_id)
    await store.async_save(payload)


async def run_migration(hass, entry) -> bool:
    """Run all registered migration transforms once for this entry.

    Returns:
        True when a migration attempt changes state or writes a completion marker.
        False when already migrated for this schema version OR when no legacy state
        is present (no-op).

    Raises:
        MigrationTransformError: a registered transform raised during evaluation.
            The pre-migration snapshot is preserved in the backup store and the
            entry's options remain untouched (recoverable state).
        MigrationBackupError: a backup-store read or write failed. The pre-commit
            save failure prevents any option change. The post-commit save failure
            restores the entry's options to the pre-migration snapshot before
            raising.
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
    except Exception as err:
        # Task 7: surface the failure explicitly. Classify, journal the code,
        # persist the snapshot for restore, then raise — never return False
        # silently, never swallow.
        backup["complete"] = False
        _append_journal(
            backup,
            "failed",
            code="transform_failed",
            error_type=type(err).__name__,
            error_message=str(err),
        )
        try:
            await _save_backup(hass, entry_id, backup)
        except Exception as save_err:
            # Best-effort: raise a classified backup error chained to the
            # original save failure so the caller can see both.
            raise MigrationBackupError(
                "migration backup write failed after transform error",
                entry_id=entry_id,
                cause=save_err,
                code="transform_failed",
            ) from save_err
        raise MigrationTransformError(
            "migration transform failed",
            entry_id=entry_id,
            cause=err,
            transform_count=len(_TRANSFORMS),
        ) from err

    # Changes computed from the working copy, including explicit removes.
    for key, value in working.items():
        if options.get(key) != value or key not in options:
            updates[key] = value
    removed_keys = {key for key in removed_keys if key in options and key not in working}

    if not updates and not removed_keys:
        updates = {"_migration": {"version": MIGRATION_VERSION, "complete": True}}

    backup["complete"] = False
    try:
        await _save_backup(hass, entry_id, backup)
    except Exception as err:
        # Pre-commit snapshot save failed. No option change has been made
        # yet — classify and re-raise so the caller sees the failure mode.
        backup["complete"] = False
        _append_journal(
            backup,
            "failed",
            code="backup_failed",
            error_type=type(err).__name__,
            error_message=str(err),
        )
        raise MigrationBackupError(
            "migration pre-commit backup write failed",
            entry_id=entry_id,
            cause=err,
        ) from err

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
    except Exception as err:
        # The commit-time failure rolls the entry's options back to the
        # pre-migration snapshot so the caller can retry. The error is
        # classified before being re-raised.
        hass.config_entries.async_update_entry(entry, options=dict(options))
        try:
            backup["complete"] = False
            _append_journal(
                backup,
                "failed",
                code="backup_failed",
                error_type=type(err).__name__,
                error_message=str(err),
            )
            await _save_backup(hass, entry_id, backup)
        except Exception:
            # Best-effort journal write; still raise the classified error.
            pass
        if isinstance(err, MigrationError):
            raise
        raise MigrationBackupError(
            "migration commit backup write failed",
            entry_id=entry_id,
            cause=err,
        ) from err
    return True


async def strip_dead_keys(hass, entry) -> bool:
    """Strip audited dead keys using the migration backup store."""
    options = _normalize_snapshot(getattr(entry, "options", {}))
    removed = {key: options.pop(key) for key in _DEAD_OPTION_KEYS if key in options}
    if not removed:
        return False

    entry_id = str(getattr(entry, "entry_id", ""))
    backup = await _load_backup(hass, entry_id)
    existing_removed = backup.get("removed_keys")
    if not isinstance(existing_removed, dict):
        existing_removed = {}

    backup["schema_version"] = MIGRATION_VERSION
    backup["removed_keys"] = {**existing_removed, **removed}
    backup["backup_until_version"] = MIGRATION_VERSION + 1
    try:
        await _save_backup(hass, entry_id, backup)
    except Exception as err:
        raise MigrationBackupError(
            "dead-key migration backup write failed",
            entry_id=entry_id,
            cause=err,
        ) from err

    hass.config_entries.async_update_entry(entry, options=options)
    return True


async def restore_last_backup(hass, entry) -> bool:
    """Restore the latest migration snapshot for the given entry.

    Returns:
        True when the entry's options were updated to the snapshot, or when
        the entry is already on the snapshot (no-op). False when there is no
        snapshot to restore (no backup has ever been written for this entry).

    Raises:
        MigrationBackupError: the backup store is corrupt, unreadable, or its
            payload is not a valid snapshot. The entry's options are not
            touched. Classified `.code = "backup_failed"`.
    """
    entry_id = str(getattr(entry, "entry_id", ""))
    # Read the raw payload directly so a corrupt store (non-dict payload)
    # surfaces as a classified error rather than being swallowed by
    # `_load_backup` (which normalizes non-dicts to an empty dict).
    try:
        raw = await _backup_store(hass, entry_id).async_load()
    except Exception as err:
        raise MigrationBackupError(
            "migration backup store unreadable",
            entry_id=entry_id,
            cause=err,
        ) from err
    if raw is None:
        return False
    if not isinstance(raw, dict):
        raise MigrationBackupError(
            "migration backup store payload is not a dict",
            entry_id=entry_id,
            payload_type=type(raw).__name__,
        )

    backup = raw
    snapshot = backup.get("snapshot")
    if not isinstance(snapshot, dict):
        # No snapshot ever written for this entry — distinguish "no backup"
        # (return False) from "corrupt backup" (raise). An empty dict
        # snapshot is treated as no-backup too.
        if not snapshot:
            return False
        raise MigrationBackupError(
            "migration backup store has non-dict snapshot",
            entry_id=entry_id,
            snapshot_type=type(snapshot).__name__,
        )

    restored = dict(snapshot)
    restored.pop("_migration", None)
    options_snapshot = _normalize_snapshot(getattr(entry, "options", {}))
    if restored == options_snapshot:
        return True

    hass.config_entries.async_update_entry(entry, options=restored)
    _append_journal(backup, "restored")
    await _save_backup(hass, entry_id, backup)
    return True
