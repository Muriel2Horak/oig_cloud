"""Tests for the Task 3 legacy planner deprecation window."""

from __future__ import annotations

import logging

import pytest

from custom_components.oig_cloud import _migrate_legacy_planner_options
from custom_components.oig_cloud.config_deprecation import (
    ALIAS_COMPAT_UNTIL_VERSION,
    LEGACY_PLANNER_KEYS,
    LegacyOptionsMigrationRequired,
    deprecation_status,
)


def test_legacy_keys_accepted_inside_compat_window_returns_keyed_warning() -> None:
    status = deprecation_status(
        options={"min_capacity_percent": 25.0, "home_charge_rate": 3.0},
        current_version=ALIAS_COMPAT_UNTIL_VERSION,
    )

    assert status.accepted is True
    assert status.errors == []
    assert status.warnings == [
        {
            "code": "deprecated_option",
            "key": "min_capacity_percent",
            "replacement": "planning_min_percent",
            "compat_until_version": ALIAS_COMPAT_UNTIL_VERSION,
        },
        {
            "code": "deprecated_option",
            "key": "home_charge_rate",
            "replacement": "charge_rate_kw",
            "compat_until_version": ALIAS_COMPAT_UNTIL_VERSION,
        },
    ]


def test_legacy_keys_hard_error_after_window_contains_migration_payload() -> None:
    options = {key: index for index, key in enumerate(LEGACY_PLANNER_KEYS)}
    options["standard"] = 60

    status = deprecation_status(
        options=options,
        current_version=ALIAS_COMPAT_UNTIL_VERSION + 1,
    )

    assert status.accepted is False
    assert status.warnings == []
    assert status.errors == [
        {
            "code": "migration_required",
            "deprecated": list(LEGACY_PLANNER_KEYS),
            "compat_until_version": ALIAS_COMPAT_UNTIL_VERSION,
        }
    ]
    assert "standard" not in status.errors[0]["deprecated"]


def test_canonical_only_options_never_trigger_deprecation() -> None:
    status = deprecation_status(
        options={
            "standard_scan_interval": 60,
            "planning_min_percent": 30.0,
            "charge_rate_kw": 3.2,
        },
        current_version=ALIAS_COMPAT_UNTIL_VERSION + 1,
    )

    assert status.accepted is True
    assert status.warnings == []
    assert status.errors == []


def test_legacy_planner_migration_logs_deprecation_inside_window(caplog: pytest.LogCaptureFixture) -> None:
    options = {"min_capacity_percent": 25.0}

    with caplog.at_level(logging.WARNING, logger="custom_components.oig_cloud"):
        _migrate_legacy_planner_options(
            options,
            current_version=ALIAS_COMPAT_UNTIL_VERSION,
        )

    assert options["planning_min_percent"] == 25.0
    assert any(
        "deprecated planner option" in record.message and "min_capacity_percent" in record.message
        for record in caplog.records
    )


def test_legacy_planner_migration_raises_structured_error_after_window() -> None:
    options = {"min_capacity_percent": 25.0}

    with pytest.raises(LegacyOptionsMigrationRequired) as raised:
        _migrate_legacy_planner_options(
            options,
            current_version=ALIAS_COMPAT_UNTIL_VERSION + 1,
        )

    assert raised.value.payload == {
        "error": "migration_required",
        "deprecated": ["min_capacity_percent"],
        "compat_until_version": ALIAS_COMPAT_UNTIL_VERSION,
    }
    assert "planning_min_percent" not in options
