from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace
from typing import Any, Dict, List, Optional

import pytest

from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.battery_forecast.planning import auto_switch
from custom_components.oig_cloud.battery_forecast.planning.auto_switch import (
    SwitchContext,
    REASON_WATCHDOG_ENFORCEMENT,
    REASON_SCHEDULED_SWITCH,
    REASON_CURRENT_BLOCK,
    REASON_GUARD_LOCK,
)
from custom_components.oig_cloud.battery_forecast.planning.mode_guard import (
    REASON_GUARD_EXCEPTION_SOC,
    apply_mode_guard,
    build_plan_lock,
)
from custom_components.oig_cloud.battery_forecast.planning.precedence_contract import (
    PrecedenceLevel,
    resolve_conflict,
)
from custom_components.oig_cloud.const import CONF_AUTO_MODE_SWITCH


class DummyConfigEntry:
    def __init__(self, options):
        self.options = options
        self.data = options
        self.entry_id = "test_entry"


class DummyServices:
    def __init__(self):
        self.calls: List[tuple] = []

    async def async_call(self, domain, service, data, blocking=False):
        self.calls.append((domain, service, data, blocking))


class DummyStates:
    def __init__(self, state_map):
        self._state_map = state_map

    def get(self, entity_id):
        return self._state_map.get(entity_id)


class DummyState:
    def __init__(self, state, last_changed=None, last_updated=None):
        self.state = state
        self.last_changed = last_changed
        self.last_updated = last_updated or last_changed


class DummyHass:
    def __init__(self, states=None, data=None):
        self.states = states or DummyStates({})
        self.services = DummyServices()
        self.data = data or {}


class DummySensor:
    def __init__(self, options):
        self._config_entry = DummyConfigEntry(options)
        self._auto_switch_handles = []
        self._auto_switch_retry_unsub = None
        self._hass = None
        self._box_id = "123"
        self._side_effects_enabled = True
        self._last_auto_switch_request = None
        self._timeline_data = []
        self._auto_switch_watchdog_unsub = None
        self._auto_switch_watchdog_interval = timedelta(seconds=30)


@pytest.mark.asyncio
async def test_reason_code_is_propagated_to_switch():
    """
    Verify that when execute_mode_change is called with a SwitchContext,
    the reason_code and precedence information is available in the returned context.
    """
    sensor = DummySensor({CONF_AUTO_MODE_SWITCH: True})
    sensor._hass = DummyHass()
    sensor._config_entry.entry_id = "test_entry"

    # Create a SwitchContext with explicit reason_code and precedence
    context = SwitchContext(
        reason_code=REASON_WATCHDOG_ENFORCEMENT,
        precedence_level=PrecedenceLevel.AUTO_SWITCH,
        precedence_name=PrecedenceLevel.AUTO_SWITCH.name,
        decision_source="watchdog",
        details={"current_mode": "Home 1", "desired_mode": "Home UPS"},
    )

    result_context = await auto_switch.execute_mode_change(
        sensor, "Home UPS", "watchdog enforcement", context=context
    )

    assert result_context is not None
    assert result_context.reason_code == REASON_WATCHDOG_ENFORCEMENT
    assert result_context.precedence_level == PrecedenceLevel.AUTO_SWITCH
    assert result_context.precedence_name == "AUTO_SWITCH"
    assert result_context.decision_source == "watchdog"
    assert result_context.details["current_mode"] == "Home 1"
    assert result_context.details["desired_mode"] == "Home UPS"

    # Verify the service was called exactly once
    assert len(sensor._hass.services.calls) == 1
    domain, service, data, blocking = sensor._hass.services.calls[0]
    assert domain == "oig_cloud"
    assert service == "set_box_mode"
    assert data["mode"] == "Home UPS"


@pytest.mark.asyncio
async def test_reason_code_propagated_from_scheduled_switch():
    """
    Verify that scheduled switches propagate their reason_code correctly.
    """
    sensor = DummySensor({CONF_AUTO_MODE_SWITCH: True})
    sensor._hass = DummyHass()
    sensor._config_entry.entry_id = "test_entry"

    context = SwitchContext(
        reason_code=REASON_SCHEDULED_SWITCH,
        precedence_level=PrecedenceLevel.AUTO_SWITCH,
        precedence_name=PrecedenceLevel.AUTO_SWITCH.name,
        decision_source="auto_switch",
        details={"scheduled_time": "2025-01-01T12:00:00"},
    )

    result_context = await auto_switch.execute_mode_change(
        sensor, "Home 2", "scheduled 2025-01-01T12:00:00", context=context
    )

    assert result_context is not None
    assert result_context.reason_code == REASON_SCHEDULED_SWITCH
    assert result_context.decision_source == "auto_switch"


@pytest.mark.asyncio
async def test_default_context_created_when_not_provided():
    """
    Verify that when no context is provided, a default one is created
    with the reason string as the reason_code.
    """
    sensor = DummySensor({CONF_AUTO_MODE_SWITCH: True})
    sensor._hass = DummyHass()
    sensor._config_entry.entry_id = "test_entry"

    result_context = await auto_switch.execute_mode_change(
        sensor, "Home 1", "current planned block"
    )

    assert result_context is not None
    assert result_context.reason_code == "current planned block"
    assert result_context.precedence_level == PrecedenceLevel.AUTO_SWITCH
    assert result_context.decision_source == "auto_switch"


@pytest.mark.asyncio
async def test_no_race_between_guard_and_watchdog():
    """
    Verify that when both guard and watchdog would fire, only one valid switch
    command is accepted due to the duplicate request detection and min interval.

    Race condition prevention mechanisms:
    1. 90-second duplicate request window in execute_mode_change
    2. 30-minute min interval in ensure_current_mode
    3. ServiceShield pending change check
    """
    sensor = DummySensor({CONF_AUTO_MODE_SWITCH: True})
    now = dt_util.now()

    # Simulate a recent mode change (within the 90-second window)
    sensor._hass = DummyHass()
    sensor._config_entry.entry_id = "test_entry"
    sensor._last_auto_switch_request = ("Home UPS", now)

    # Watchdog tries to switch to the same mode within 90 seconds
    # Should be blocked by duplicate detection
    context1 = SwitchContext(
        reason_code=REASON_WATCHDOG_ENFORCEMENT,
        precedence_level=PrecedenceLevel.AUTO_SWITCH,
        precedence_name=PrecedenceLevel.AUTO_SWITCH.name,
        decision_source="watchdog",
        details={"current_mode": "Home 1", "desired_mode": "Home UPS"},
    )

    result1 = await auto_switch.execute_mode_change(
        sensor, "Home UPS", "watchdog enforcement", context=context1
    )

    # Context is returned but NO service call made (duplicate blocked)
    assert result1 is not None
    assert result1.reason_code == REASON_WATCHDOG_ENFORCEMENT
    assert len(sensor._hass.services.calls) == 0  # No service call

    # Now simulate a manual override with higher precedence
    # Set last request to older time to bypass duplicate check
    sensor._last_auto_switch_request = ("Home 1", now - timedelta(seconds=100))

    context2 = SwitchContext(
        reason_code="manual_override",
        precedence_level=PrecedenceLevel.MODE_GUARD,  # Higher than AUTO_SWITCH
        precedence_name=PrecedenceLevel.MODE_GUARD.name,
        decision_source="manual",
        locked_by_higher_precedence=False,
        details={"source": "user_action"},
    )

    result2 = await auto_switch.execute_mode_change(
        sensor, "Home 2", "manual override", context=context2
    )

    # This should succeed
    assert result2 is not None
    assert result2.reason_code == "manual_override"
    assert len(sensor._hass.services.calls) == 1  # One service call


@pytest.mark.asyncio
async def test_min_interval_prevents_rapid_mode_changes():
    """
    Verify that ensure_current_mode respects the MIN_AUTO_SWITCH_INTERVAL_MINUTES
    to prevent rapid mode oscillation.
    """
    sensor = DummySensor({CONF_AUTO_MODE_SWITCH: True})
    now = dt_util.now()

    # Simulate a recent mode change state
    states = DummyStates(
        {"sensor.oig_123_box_prms_mode": DummyState("Home 1", last_changed=now)}
    )
    sensor._hass = DummyHass(states=states)
    sensor._config_entry.entry_id = "test_entry"

    # Patch get_current_box_mode to return a different mode
    original_get_mode = auto_switch.get_current_box_mode

    def mock_get_mode(_sensor):
        return "Home 2"

    auto_switch.get_current_box_mode = mock_get_mode

    try:
        context = SwitchContext(
            reason_code=REASON_CURRENT_BLOCK,
            precedence_level=PrecedenceLevel.AUTO_SWITCH,
            precedence_name=PrecedenceLevel.AUTO_SWITCH.name,
            decision_source="auto_switch",
        )

        # Try to switch within the 30-minute window
        result = await auto_switch.ensure_current_mode(
            sensor, "Home 1", "current planned block", context=context
        )

        # Context returned but NO service call (min interval not met)
        assert result is not None
        assert len(sensor._hass.services.calls) == 0
    finally:
        auto_switch.get_current_box_mode = original_get_mode


@pytest.mark.asyncio
async def test_switch_context_locked_flag():
    """
    Verify that the locked_by_higher_precedence flag is preserved through the switch.
    """
    sensor = DummySensor({CONF_AUTO_MODE_SWITCH: True})
    sensor._hass = DummyHass()
    sensor._config_entry.entry_id = "test_entry"

    context = SwitchContext(
        reason_code=REASON_GUARD_LOCK,
        precedence_level=PrecedenceLevel.MODE_GUARD,
        precedence_name=PrecedenceLevel.MODE_GUARD.name,
        decision_source="mode_guard",
        locked_by_higher_precedence=True,
        details={"locked_reason": "higher_priority_decision"},
    )

    result = await auto_switch.execute_mode_change(
        sensor, "Home 1", "guard lock", context=context
    )

    assert result is not None
    assert result.locked_by_higher_precedence is True
    assert result.reason_code == REASON_GUARD_LOCK


def test_precedence_level_ordering():
    """
    Verify that MODE_GUARD has higher precedence than AUTO_SWITCH.
    This ensures guard decisions win over auto-switch decisions.
    """
    assert PrecedenceLevel.MODE_GUARD > PrecedenceLevel.AUTO_SWITCH
    assert PrecedenceLevel.MODE_GUARD == 600
    assert PrecedenceLevel.AUTO_SWITCH == 200

    # Verify resolve_conflict returns the higher precedence
    winner = resolve_conflict(PrecedenceLevel.MODE_GUARD, PrecedenceLevel.AUTO_SWITCH)
    assert winner == PrecedenceLevel.MODE_GUARD

    winner = resolve_conflict(PrecedenceLevel.AUTO_SWITCH, PrecedenceLevel.MODE_GUARD)
    assert winner == PrecedenceLevel.MODE_GUARD


def test_switch_context_to_log_string():
    """
    Verify that SwitchContext.to_log_string produces correct output.
    """
    context1 = SwitchContext(
        reason_code=REASON_WATCHDOG_ENFORCEMENT,
        precedence_level=PrecedenceLevel.AUTO_SWITCH,
        precedence_name=PrecedenceLevel.AUTO_SWITCH.name,
        decision_source="watchdog",
    )
    assert "watchdog_enforcement" in context1.to_log_string()
    assert "AUTO_SWITCH" in context1.to_log_string()
    assert "watchdog" in context1.to_log_string()
    assert "[LOCKED]" not in context1.to_log_string()

    context2 = SwitchContext(
        reason_code=REASON_GUARD_LOCK,
        precedence_level=PrecedenceLevel.MODE_GUARD,
        precedence_name=PrecedenceLevel.MODE_GUARD.name,
        decision_source="mode_guard",
        locked_by_higher_precedence=True,
    )
    assert "guard_lock" in context2.to_log_string()
    assert "MODE_GUARD" in context2.to_log_string()
    assert "[LOCKED]" in context2.to_log_string()


@pytest.mark.asyncio
async def test_mode_guard_includes_precedence_in_overrides():
    """
    Verify that mode_guard override dictionaries include precedence information.
    """
    now = dt_util.now()
    spot_prices = [
        {"time": (now + timedelta(minutes=15 * i)).isoformat(), "price": 2.0}
        for i in range(8)
    ]

    modes = [0, 0, 3, 3, 3, 0, 0, 0]  # Mode 0 = HOME I, Mode 3 = HOME UPS

    lock_until, lock_modes = build_plan_lock(
        now=now,
        spot_prices=spot_prices,
        modes=modes,
        mode_guard_minutes=60,
        plan_lock_until=None,
        plan_lock_modes=None,
    )

    assert lock_until is not None
    assert len(lock_modes) > 0

    # Apply guard with a scenario that will trigger a lock
    guarded_modes, overrides, _ = apply_mode_guard(
        modes=[0, 0, 0, 0, 0, 0, 0, 0],  # All HOME I
        spot_prices=spot_prices,
        solar_kwh_list=[0.5] * 8,
        load_forecast=[0.125] * 8,
        current_capacity=5.0,
        max_capacity=10.0,
        hw_min_capacity=0.5,
        efficiency=0.95,
        home_charge_rate_kw=3.0,
        planning_min_kwh=2.0,
        lock_modes=lock_modes,
        guard_until=lock_until,
    )

    # Check that overrides include precedence information
    for override in overrides:
        assert "reason_code" in override
        assert "precedence_level" in override
        assert "precedence_name" in override
        assert override["precedence_level"] == PrecedenceLevel.MODE_GUARD
        assert override["precedence_name"] == "MODE_GUARD"
