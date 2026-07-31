"""Versioned deprecation window for legacy planner option aliases."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

ALIAS_COMPAT_UNTIL_VERSION = 1
ALIAS_COMPAT_CURRENT_VERSION = 1

LEGACY_PLANNER_REPLACEMENTS: Mapping[str, str | None] = {
    "min_capacity_percent": "planning_min_percent",
    "target_capacity_percent": None,
    "home_charge_rate": "charge_rate_kw",
    "max_ups_price_czk": None,
    "disable_planning_min_guard": None,
    "price_hysteresis_czk": None,
    "hw_min_hold_hours": None,
}
LEGACY_PLANNER_KEYS = tuple(LEGACY_PLANNER_REPLACEMENTS.keys())


@dataclass(frozen=True)
class DeprecationStatus:
    """Structured deprecation decision for one options payload."""

    accepted: bool
    warnings: list[dict[str, Any]]
    errors: list[dict[str, Any]]


class LegacyOptionsMigrationRequired(RuntimeError):
    """Raised when legacy aliases survive beyond the compatibility window."""

    def __init__(self, status: DeprecationStatus) -> None:
        deprecated = _deprecated_from_status(status)
        self.status = status
        self.payload = {
            "error": "migration_required",
            "deprecated": deprecated,
            "compat_until_version": ALIAS_COMPAT_UNTIL_VERSION,
        }
        super().__init__(
            "Legacy planner options require migration: " + ", ".join(deprecated)
        )


def _present_legacy_keys(options: Mapping[str, Any]) -> list[str]:
    return [key for key in LEGACY_PLANNER_KEYS if key in options]


def _deprecated_from_status(status: DeprecationStatus) -> list[str]:
    if status.errors:
        deprecated = status.errors[0].get("deprecated", [])
        if isinstance(deprecated, list):
            return [str(key) for key in deprecated]
    return [str(warning["key"]) for warning in status.warnings if "key" in warning]


def deprecation_status(
    *,
    options: Mapping[str, Any],
    current_version: int,
) -> DeprecationStatus:
    """Return the deprecation outcome for keys actually present in options."""
    present_keys = _present_legacy_keys(options)
    if not present_keys:
        return DeprecationStatus(accepted=True, warnings=[], errors=[])

    if current_version > ALIAS_COMPAT_UNTIL_VERSION:
        return DeprecationStatus(
            accepted=False,
            warnings=[],
            errors=[
                {
                    "code": "migration_required",
                    "deprecated": present_keys,
                    "compat_until_version": ALIAS_COMPAT_UNTIL_VERSION,
                }
            ],
        )

    warnings = [
        {
            "code": "deprecated_option",
            "key": key,
            "replacement": LEGACY_PLANNER_REPLACEMENTS[key],
            "compat_until_version": ALIAS_COMPAT_UNTIL_VERSION,
        }
        for key in present_keys
    ]
    return DeprecationStatus(accepted=True, warnings=warnings, errors=[])
