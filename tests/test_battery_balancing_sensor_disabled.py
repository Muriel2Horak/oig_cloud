"""Balancing sensor must report 'disabled' (not a bogus 99-day counter) when the
user has turned balancing off — the manager is never created in that case, so the
sensor previously hung at status='unknown'/days_since_last=99 forever.
"""
from __future__ import annotations

from types import SimpleNamespace

from custom_components.oig_cloud.entities.battery_balancing_sensor import (
    OigCloudBatteryBalancingSensor,
)


def _stub(enabled: bool):
    stub = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"balancing_enabled": enabled}),
        _status="unknown",
        _days_since_last=99,
    )
    stub._get_balancing_manager = lambda: None
    return stub


def test_no_manager_disabled_reports_disabled():
    stub = _stub(enabled=False)
    OigCloudBatteryBalancingSensor._update_from_manager(stub)
    assert stub._status == "disabled"
    assert stub._days_since_last is None  # not the misleading 99


def test_no_manager_but_enabled_stays_unknown():
    # Enabled but manager not ready yet (startup) → keep 'unknown', don't claim disabled.
    stub = _stub(enabled=True)
    OigCloudBatteryBalancingSensor._update_from_manager(stub)
    assert stub._status == "unknown"
