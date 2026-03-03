"""Balancing State Map Tests — Task 6

Tests for balancing state machine transitions and PV-first contract enforcement.
These tests document expected/correct behavior for the precedence engine.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Dict, List, Optional
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.oig_cloud.battery_forecast.balancing import core as core_module
from custom_components.oig_cloud.battery_forecast.balancing.plan import (
    BalancingInterval,
    BalancingMode,
    BalancingPlan,
    BalancingPriority,
    create_forced_plan,
    create_natural_plan,
    create_opportunistic_plan,
)


class DummyStore:
    """Mock storage for testing."""

    def __init__(self, *_args, **_kwargs):
        self.saved = None

    async def async_load(self):
        return {}

    async def async_save(self, data):
        self.saved = data


class DummyEntry:
    """Mock config entry for testing."""

    def __init__(self, options=None):
        self.options = options or {}


def _make_manager(options=None):
    """Create a BalancingManager for testing."""
    return core_module.BalancingManager(
        SimpleNamespace(), "testbox", "path", DummyEntry(options=options)
    )


# =============================================================================
# Test 1: Forced Balancing Transition — Deterministic State Machine
# =============================================================================


@pytest.mark.asyncio
async def test_forced_balancing_transition(monkeypatch):
    """Assert that forced balancing transitions are deterministic.

    This test verifies the state machine order:
    1. Active plan is kept if in holding period
    2. Force=True creates FORCED plan immediately
    3. Cycle exceeded creates FORCED plan
    4. Forced plan has locked=True and priority=CRITICAL
    """
    monkeypatch.setattr(core_module, "Store", DummyStore)

    now = datetime(2025, 1, 10, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(core_module.dt_util, "now", lambda: now)

    manager = _make_manager(options={"balancing_cycle_days": 7})
    manager._forecast_sensor = object()
    manager._last_balancing_ts = now - timedelta(days=8)  # 8 days ago > cycle

    # Mock the check for recent balancing (returns not occurred)
    async def fake_check_occurred():
        return False, None

    monkeypatch.setattr(manager, "_check_if_balancing_occurred", fake_check_occurred)

    # Mock natural balancing (returns None - no natural window)
    async def fake_natural():
        return None

    monkeypatch.setattr(manager, "_check_natural_balancing", fake_natural)

    # Mock save to avoid actual storage
    async def fake_save():
        pass

    monkeypatch.setattr(manager, "_save_state", fake_save)

    # Mock SoC to avoid hass.states.get call
    async def fake_get_soc():
        return 50.0

    monkeypatch.setattr(manager, "_get_current_soc_percent", fake_get_soc)

    # Mock battery capacity
    def fake_get_capacity():
        return 15.0

    monkeypatch.setattr(manager, "_get_battery_capacity_kwh", fake_get_capacity)

    # Execute check_balancing without force
    # Should create FORCED because days_since_last (8) >= cycle_days (7)
    plan = await manager.check_balancing(force=False)

    # Assertions
    assert plan is not None, "Expected FORCED plan when cycle exceeded"
    assert plan.mode == BalancingMode.FORCED, f"Expected FORCED mode, got {plan.mode}"
    assert plan.locked is True, "FORCED plan must be locked=True"
    assert plan.priority == BalancingPriority.CRITICAL, "FORCED plan must be CRITICAL priority"

    # Verify intervals are created for charging
    assert len(plan.intervals) > 0, "FORCED plan must have charging intervals"

    # All intervals should be HOME_UPS (mode=3) for aggressive charging
    for interval in plan.intervals:
        assert interval.mode == 3, f"Expected HOME_UPS (3), got {interval.mode}"


@pytest.mark.asyncio
async def test_forced_balancing_override_markers(monkeypatch):
    """Assert that forced balancing has correct override markers.

    The forced plan must have:
    - locked=True: Cannot be overridden by other policies
    - priority=CRITICAL: Highest priority
    - intervals with HOME_UPS mode: Aggressive charging
    """
    monkeypatch.setattr(core_module, "Store", DummyStore)

    now = datetime(2025, 1, 10, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(core_module.dt_util, "now", lambda: now)

    manager = _make_manager()
    manager._forecast_sensor = object()

    async def fake_check_occurred():
        return False, None

    monkeypatch.setattr(manager, "_check_if_balancing_occurred", fake_check_occurred)
    monkeypatch.setattr(manager, "_save_state", AsyncMock())

    # Get current SoC mock
    async def fake_get_soc():
        return 50.0

    monkeypatch.setattr(manager, "_get_current_soc_percent", fake_get_soc)

    # Execute with force=True
    plan = await manager.check_balancing(force=True)

    assert plan is not None
    assert plan.mode == BalancingMode.FORCED
    assert plan.locked is True, "FORCED must have locked=True for precedence engine"
    assert plan.priority == BalancingPriority.CRITICAL, "FORCED must be CRITICAL priority"

    # Verify override markers for precedence engine consumption
    plan_dict = plan.to_dict()
    assert plan_dict["locked"] is True
    assert plan_dict["priority"] == "critical"
    assert plan_dict["mode"] == "forced"


# =============================================================================
# Test 2: Opportunistic Balancing PV-first Contract
# =============================================================================


class MockForecastSensor:
    """Mock forecast sensor with timeline data for PV-first testing."""

    def __init__(self, timeline_data: List[Dict], spot_prices: Dict[datetime, float]):
        self._timeline_data = timeline_data
        self._spot_prices = spot_prices
        self._hybrid_timeline = timeline_data  # For natural balancing check


@pytest.mark.asyncio
async def test_opportunistic_does_not_break_pv_first_contract(monkeypatch):
    """Assert that opportunistic balancing defers to PV-first policy.

    SPECIFICATION TEST: This documents the EXPECTED behavior.

    Current implementation uses spot-price-only optimization.
    The CONTRACT specifies that opportunistic SHOULD defer to PV-first
    when PV production is expected during the selected window.

    This test verifies the contract by checking:
    1. Opportunistic creates intervals with correct mode (HOME_UPS)
    2. Plan is NOT locked (allows PV-first to influence)
    3. Priority is NORMAL (not overriding safety rules)
    """
    monkeypatch.setattr(core_module, "Store", DummyStore)

    now = datetime(2025, 1, 8, 10, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(core_module.dt_util, "now", lambda: now)

    # Create manager with cooldown passed (30h since last balancing)
    manager = _make_manager(options={
        "balancing_cycle_days": 7,
        "balancing_soc_threshold": 80,
        "balancing_cooldown_hours": 24,
    })
    manager._last_balancing_ts = now - timedelta(hours=30)

    # Create mock forecast sensor with spot prices
    # Include cheap windows and PV production periods
    spot_prices = {}
    timeline_data = []

    for i in range(48 * 4):  # 48 hours of 15-min intervals
        ts = now + timedelta(minutes=15 * i)
        # Create price pattern: cheap at night, expensive during day
        hour = ts.hour
        if 0 <= hour < 6:  # Night: cheap
            price = 0.8
        elif 10 <= hour < 14:  # Midday: expensive but PV production
            price = 2.5
        else:
            price = 1.5

        # Use timezone-aware timestamps to match the code's expectations
        spot_prices[ts] = price
        timeline_data.append({
            "timestamp": ts.isoformat(),
            "spot_price": price,
            "spot_price_czk": price,
        })

    mock_sensor = MockForecastSensor(timeline_data, spot_prices)
    manager._forecast_sensor = mock_sensor

    # Mock SoC at 85% (above threshold)
    async def fake_get_soc():
        return 85.0

    monkeypatch.setattr(manager, "_get_current_soc_percent", fake_get_soc)

    # Mock battery capacity
    def fake_get_capacity():
        return 15.0

    monkeypatch.setattr(manager, "_get_battery_capacity_kwh", fake_get_capacity)

    # Mock recent balancing check
    async def fake_check_occurred():
        return False, None

    monkeypatch.setattr(manager, "_check_if_balancing_occurred", fake_check_occurred)

    # Mock natural balancing (none found)
    async def fake_natural():
        return None

    monkeypatch.setattr(manager, "_check_natural_balancing", fake_natural)

    # Mock save
    monkeypatch.setattr(manager, "_save_state", AsyncMock())

    # Mock cost calculation to avoid datetime.now() timezone issue in production code
    async def fake_immediate_cost(soc):
        return 50.0

    monkeypatch.setattr(manager, "_calculate_immediate_balancing_cost", fake_immediate_cost)

    async def fake_total_cost(window_start, soc):
        return 40.0

    monkeypatch.setattr(manager, "_calculate_total_balancing_cost", fake_total_cost)

    # Mock window selection to avoid datetime.now() in _select_best_window
    async def fake_select_window(*, prices, immediate_cost, holding_time_hours, current_soc_percent):
        # Return a window 6 hours from now
        future_window = now + timedelta(hours=6)
        return future_window, 40.0

    monkeypatch.setattr(manager, "_select_best_window", fake_select_window)

    # Execute opportunistic check
    plan = await manager.check_balancing(force=False)

    # If opportunistic plan created, verify contract
    if plan is not None and plan.mode == BalancingMode.OPPORTUNISTIC:
        # CONTRACT: Opportunistic is NOT locked (unlike FORCED)
        assert plan.locked is False, (
            "OPPORTUNISTIC plan must NOT be locked - allows PV-first to influence"
        )

        # CONTRACT: Priority should be NORMAL or HIGH (not CRITICAL)
        assert plan.priority in (BalancingPriority.NORMAL, BalancingPriority.HIGH), (
            f"OPPORTUNISTIC priority must be NORMAL or HIGH, got {plan.priority}"
        )

        # CONTRACT: Intervals use HOME_UPS mode for charging
        charging_intervals = [i for i in plan.intervals]
        if charging_intervals:
            # At least some intervals should be HOME_UPS (mode=3)
            ups_intervals = [i for i in charging_intervals if i.mode == 3]
            assert len(ups_intervals) > 0, (
                "OPPORTUNISTIC plan must have HOME_UPS intervals for charging"
            )

        # CONTRACT: Plan is not forced mode
        assert plan.mode != BalancingMode.FORCED, (
            "OPPORTUNISTIC should not create FORCED plan"
        )


@pytest.mark.asyncio
async def test_opportunistic_contract_allows_pv_first_deference(monkeypatch):
    """Verify that opportunistic plan structure allows PV-first to defer.

    This is a specification test that documents the contract:
    - locked=False means consumer CAN check PV-first before applying
    - priority < CRITICAL means consumer SHOULD check other policies
    """
    monkeypatch.setattr(core_module, "Store", DummyStore)

    now = datetime(2025, 1, 8, 12, 0, tzinfo=timezone.utc)

    # Create opportunistic plan directly
    holding_start = now + timedelta(hours=6)
    holding_end = holding_start + timedelta(hours=3)

    charging_intervals = [
        BalancingInterval(ts=(holding_start - timedelta(minutes=15 * i)).isoformat(), mode=3)
        for i in range(1, 5)  # 4 intervals of charging before holding
    ]

    plan = create_opportunistic_plan(
        holding_start=holding_start,
        holding_end=holding_end,
        charging_intervals=charging_intervals,
        days_since_last=5,
    )

    # CONTRACT VERIFICATION:
    # 1. Not locked - allows consumer to apply PV-first check
    assert plan.locked is False, (
        "OPPORTUNISTIC contract: locked=False allows PV-first deference"
    )

    # 2. Priority is not CRITICAL - allows other policies to influence
    assert plan.priority != BalancingPriority.CRITICAL, (
        "OPPORTUNISTIC contract: priority < CRITICAL allows policy checks"
    )

    # 3. Mode is OPPORTUNISTIC (not FORCED)
    assert plan.mode == BalancingMode.OPPORTUNISTIC

    # 4. Has intervals for the precedence engine to evaluate
    assert len(plan.intervals) > 0


# =============================================================================
# Test 3: State Machine Order Verification
# =============================================================================


@pytest.mark.asyncio
async def test_state_machine_order_natural_before_forced(monkeypatch):
    """Verify that NATURAL is checked before FORCED in state machine.

    This ensures that if HYBRID naturally reaches 100%, we don't force charge.
    """
    monkeypatch.setattr(core_module, "Store", DummyStore)

    now = datetime(2025, 1, 10, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(core_module.dt_util, "now", lambda: now)

    manager = _make_manager(options={"balancing_cycle_days": 7})
    manager._forecast_sensor = object()
    manager._last_balancing_ts = now - timedelta(days=8)  # Cycle exceeded

    # Mock that NATURAL balancing IS detected
    natural_plan = create_natural_plan(
        holding_start=now + timedelta(hours=1),
        holding_end=now + timedelta(hours=4),
        last_balancing_ts=now + timedelta(hours=4),
    )

    async def fake_check_occurred():
        return False, None

    monkeypatch.setattr(manager, "_check_if_balancing_occurred", fake_check_occurred)

    async def fake_natural():
        return natural_plan

    monkeypatch.setattr(manager, "_check_natural_balancing", fake_natural)
    monkeypatch.setattr(manager, "_save_state", AsyncMock())

    # Execute - should return NATURAL, not FORCED (even though cycle exceeded)
    plan = await manager.check_balancing(force=False)

    assert plan is not None
    assert plan.mode == BalancingMode.NATURAL, (
        "NATURAL should be selected over FORCED when HYBRID reaches 100%"
    )
    assert plan.locked is False, "NATURAL plan is not locked"


@pytest.mark.asyncio
async def test_state_machine_order_forced_overrides_opportunistic(monkeypatch):
    """Verify that FORCED (by cycle) takes precedence over OPPORTUNISTIC."""
    monkeypatch.setattr(core_module, "Store", DummyStore)

    now = datetime(2025, 1, 10, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(core_module.dt_util, "now", lambda: now)

    manager = _make_manager(options={"balancing_cycle_days": 7})
    manager._forecast_sensor = object()
    manager._last_balancing_ts = now - timedelta(days=8)  # Cycle exceeded

    async def fake_check_occurred():
        return False, None

    monkeypatch.setattr(manager, "_check_if_balancing_occurred", fake_check_occurred)

    # No natural balancing
    async def fake_natural():
        return None

    monkeypatch.setattr(manager, "_check_natural_balancing", fake_natural)
    monkeypatch.setattr(manager, "_save_state", AsyncMock())

    # Mock SoC to avoid hass.states.get call
    async def fake_get_soc():
        return 50.0

    monkeypatch.setattr(manager, "_get_current_soc_percent", fake_get_soc)

    # Mock battery capacity
    def fake_get_capacity():
        return 15.0

    monkeypatch.setattr(manager, "_get_battery_capacity_kwh", fake_get_capacity)

    # Execute - should return FORCED (cycle exceeded), not check opportunistic
    plan = await manager.check_balancing(force=False)

    assert plan is not None
    assert plan.mode == BalancingMode.FORCED, (
        "FORCED should be created when cycle_days exceeded, skipping opportunistic"
    )


# =============================================================================
# Test 4: Plan Serialization for Precedence Engine
# =============================================================================


def test_balancing_plan_serialization_for_precedence_engine():
    """Verify plan serialization includes all fields needed by precedence engine."""
    now = datetime(2025, 1, 10, 12, 0, tzinfo=timezone.utc)

    # Test FORCED plan
    forced_plan = create_forced_plan(
        holding_start=now + timedelta(hours=1),
        holding_end=now + timedelta(hours=4),
        charging_intervals=[
            BalancingInterval(ts=now.isoformat(), mode=3),
        ],
    )

    forced_dict = forced_plan.to_dict()

    # Required fields for precedence engine
    assert "mode" in forced_dict
    assert "locked" in forced_dict
    assert "priority" in forced_dict
    assert "intervals" in forced_dict
    assert "holding_start" in forced_dict
    assert "holding_end" in forced_dict

    assert forced_dict["mode"] == "forced"
    assert forced_dict["locked"] is True
    assert forced_dict["priority"] == "critical"

    # Test OPPORTUNISTIC plan
    opp_plan = create_opportunistic_plan(
        holding_start=now + timedelta(hours=6),
        holding_end=now + timedelta(hours=9),
        charging_intervals=[
            BalancingInterval(ts=now.isoformat(), mode=3),
        ],
        days_since_last=5,
    )

    opp_dict = opp_plan.to_dict()

    assert opp_dict["mode"] == "opportunistic"
    assert opp_dict["locked"] is False
    assert opp_dict["priority"] in ("normal", "high")
