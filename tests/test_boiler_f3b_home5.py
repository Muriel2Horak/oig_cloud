"""R3: Home 5 maneuver (battery-discharge boiler heating) tests.

Covered:
1. Flag gating — any flag off → BATTERY never allocated
2. Overflow-later eligibility rule — battery only when future overflow exists
3. usable-kwh cap — battery allocation stops when budget exhausted
4. Cost ordering — battery cheaper than expensive grid, more expensive than overflow/cheap grid
5. Actuation on/off service-call sequence (mocked hass)
6. Non-interference — never disable Home 5 when user enabled it manually
7. R6 overlay — battery slots included in boiler grid/load overlay
8. BoilerBatterySignals.from_raw accepts battery_usable_kwh
9. home5_available=False → no BATTERY source in plan
10. SOURCE_SELECTED_BATTERY reason code emitted when battery used
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.oig_cloud.boiler.models import (
    BoilerProfile,
    BoilerThermalTopology,
    EnergySource,
)
from custom_components.oig_cloud.boiler.planner_contract import (
    BoilerBatterySignals,
    PlannerInput,
    PlannerReasonCode,
)
from custom_components.oig_cloud.boiler.planner_core import (
    BATTERY_CYCLE_COST_CZK_PER_KWH,
    PlanSlotAction,
    PlanResult,
    _battery_is_cheaper,
    _slot_allocation,
    _slot_has_future_overflow,
    plan_comfort_core,
)
from custom_components.oig_cloud.boiler.const import BATTERY_CYCLE_COST_CZK_PER_KWH as _BATT_COST


_UTC = timezone.utc

# Reference "now": early morning, boiler cold, deadline later today.
_NOW = datetime(2026, 6, 10, 5, 0, 0, tzinfo=_UTC)
# Overflow window: midday (after NOW + planning).
_OW_START = datetime(2026, 6, 10, 10, 0, 0, tzinfo=_UTC)
_OW_END = datetime(2026, 6, 10, 14, 0, 0, tzinfo=_UTC)
_OVERFLOW_WINDOWS = [(_OW_START, _OW_END)]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _profile() -> BoilerProfile:
    return BoilerProfile(
        category="workday_summer",
        hourly_avg={hour: 0.0 for hour in range(24)},
        confidence={hour: 1.0 for hour in range(24)},
    )


def _topology(
    volume_l: float = 80.0,
    current_temp_c: float = 25.0,
    target_temp_c: float = 55.0,
    heater_kw: float = 2.0,
) -> BoilerThermalTopology:
    return BoilerThermalTopology(
        stratification_mode="two_zone",
        thermometer_placements=["top"],
        temperature_topology="top_only",
        tank_volume_l=volume_l,
        target_temp_c=target_temp_c,
        cold_inlet_temp_c=10.0,
        heater_power_kw=heater_kw,
    )


def _spot_prices(price: float = 5.0, now: datetime = _NOW, hours: int = 48) -> dict[datetime, float]:
    """Create hourly spot prices for the given horizon."""
    return {
        now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=i): price
        for i in range(hours)
    }


def _make_planner_input(
    *,
    spot_price: float = 5.0,
    battery_usable_kwh: float | None = 5.0,
    overflow_windows: list = _OVERFLOW_WINDOWS,
    home5_available: bool = True,
    current_top_temp_c: float = 25.0,
    target_temp_c: float = 55.0,
) -> PlannerInput:
    signals = BoilerBatterySignals(
        overflow_windows=list(overflow_windows),
        battery_usable_kwh=battery_usable_kwh,
    )
    return PlannerInput(
        entry_id="e1",
        box_id="box1",
        profile=_profile(),
        spot_prices=_spot_prices(spot_price),
        overflow_windows=list(overflow_windows),
        deadline_time="08:00",
        topology=_topology(current_temp_c=current_top_temp_c, target_temp_c=target_temp_c),
        current_top_temp_c=current_top_temp_c,
        battery_signals=signals,
        home5_available=home5_available,
        horizon_hours=24,
    )


# ---------------------------------------------------------------------------
# 1. Flag gating — any flag off → BATTERY never allocated
# ---------------------------------------------------------------------------


def test_battery_not_used_when_home5_available_false():
    """When home5_available=False, no battery slots regardless of battery_usable_kwh."""
    inp = _make_planner_input(home5_available=False, battery_usable_kwh=10.0, spot_price=10.0)
    result = plan_comfort_core(inp, now=_NOW)
    battery_slots = [s for s in result.slots if getattr(s, "source", None) == EnergySource.BATTERY]
    assert len(battery_slots) == 0
    assert PlannerReasonCode.SOURCE_SELECTED_BATTERY not in result.reason_codes


def test_battery_not_used_when_battery_usable_kwh_is_none():
    """When battery_usable_kwh is None, no battery slots."""
    inp = _make_planner_input(home5_available=True, battery_usable_kwh=None, spot_price=10.0)
    result = plan_comfort_core(inp, now=_NOW)
    battery_slots = [s for s in result.slots if getattr(s, "source", None) == EnergySource.BATTERY]
    assert len(battery_slots) == 0


def test_battery_not_used_when_battery_usable_kwh_is_zero():
    """When battery_usable_kwh is 0.0, no battery slots."""
    inp = _make_planner_input(home5_available=True, battery_usable_kwh=0.0, spot_price=10.0)
    result = plan_comfort_core(inp, now=_NOW)
    battery_slots = [s for s in result.slots if getattr(s, "source", None) == EnergySource.BATTERY]
    assert len(battery_slots) == 0


# ---------------------------------------------------------------------------
# 2. Overflow-later eligibility rule
# ---------------------------------------------------------------------------


def test_battery_not_used_when_no_future_overflow():
    """Battery slot is ineligible when no overflow window starts after the slot."""
    # Put an overflow window in the PAST relative to all planning slots.
    past_ow = (
        datetime(2026, 6, 9, 10, 0, 0, tzinfo=_UTC),
        datetime(2026, 6, 9, 14, 0, 0, tzinfo=_UTC),
    )
    inp = _make_planner_input(
        home5_available=True,
        battery_usable_kwh=10.0,
        overflow_windows=[past_ow],
        spot_price=10.0,
    )
    result = plan_comfort_core(inp, now=_NOW)
    battery_slots = [s for s in result.slots if getattr(s, "source", None) == EnergySource.BATTERY]
    assert len(battery_slots) == 0


def test_battery_used_when_future_overflow_exists():
    """Battery slots are allocated when expensive grid AND future overflow window exists."""
    # spot_price > BATTERY_CYCLE_COST_CZK_PER_KWH (0.50) → battery cheaper than grid
    inp = _make_planner_input(
        home5_available=True,
        battery_usable_kwh=10.0,
        overflow_windows=_OVERFLOW_WINDOWS,
        spot_price=5.0,  # 5.0 > 0.50 → battery is cheaper
    )
    result = plan_comfort_core(inp, now=_NOW)
    battery_slots = [s for s in result.slots if getattr(s, "source", None) == EnergySource.BATTERY]
    # At least some slots should use battery
    assert len(battery_slots) > 0
    assert PlannerReasonCode.SOURCE_SELECTED_BATTERY in result.reason_codes


def test_slot_has_future_overflow_helper():
    """Unit test for _slot_has_future_overflow."""
    slot_early = PlanSlotAction(
        start=datetime(2026, 6, 10, 6, 0, tzinfo=_UTC),
        end=datetime(2026, 6, 10, 6, 15, tzinfo=_UTC),
        action="idle",
        source=None,
    )
    slot_late = PlanSlotAction(
        start=datetime(2026, 6, 10, 12, 0, tzinfo=_UTC),
        end=datetime(2026, 6, 10, 12, 15, tzinfo=_UTC),
        action="idle",
        source=None,
    )
    # Overflow window starts at 10:00 — early slot (6:00) has future overflow
    assert _slot_has_future_overflow(slot_early, [(_OW_START, _OW_END)])
    # Late slot (12:00) is INSIDE overflow, not BEFORE it — _OW_START (10:00) is not > slot.start (12:00)
    assert not _slot_has_future_overflow(slot_late, [(_OW_START, _OW_END)])


# ---------------------------------------------------------------------------
# 3. usable-kwh cap
# ---------------------------------------------------------------------------


def test_battery_cap_respected():
    """Battery allocation stops when usable_kwh is exhausted."""
    # Very small battery budget: only 1 slot worth of energy.
    # heater 2.0 kW × 15 min = 0.5 kWh per slot.
    inp = _make_planner_input(
        home5_available=True,
        battery_usable_kwh=0.5,  # exactly 1 slot
        overflow_windows=_OVERFLOW_WINDOWS,
        spot_price=10.0,
    )
    result = plan_comfort_core(inp, now=_NOW)
    battery_slots = [s for s in result.slots if getattr(s, "source", None) == EnergySource.BATTERY]
    total_battery_kwh = sum(getattr(s, "battery_kwh", 0.0) for s in result.slots)
    # Should not exceed the budget
    assert total_battery_kwh <= 0.5 + 1e-9
    # Should have at most 1 battery slot
    assert len(battery_slots) <= 1


def test_battery_plan_result_battery_kwh_sum():
    """PlanResult.battery_kwh equals sum of slot battery_kwh."""
    inp = _make_planner_input(
        home5_available=True,
        battery_usable_kwh=5.0,
        overflow_windows=_OVERFLOW_WINDOWS,
        spot_price=5.0,
    )
    result = plan_comfort_core(inp, now=_NOW)
    slot_sum = sum(getattr(s, "battery_kwh", 0.0) for s in result.slots)
    assert abs(result.battery_kwh - slot_sum) < 1e-9


# ---------------------------------------------------------------------------
# 4. Cost ordering
# ---------------------------------------------------------------------------


def test_battery_cheaper_than_expensive_grid():
    """Battery (0.50) beats expensive grid (10.0 CZK/kWh)."""
    assert _battery_is_cheaper(10.0, battery_cost=0.50)


def test_battery_not_cheaper_than_cheap_grid():
    """Battery (0.50) does NOT beat cheap grid (0.30 CZK/kWh)."""
    assert not _battery_is_cheaper(0.30, battery_cost=0.50)


def test_battery_not_cheaper_than_free_overflow():
    """Battery not chosen over PV overflow (free)."""
    # PV overflow slot: battery_usable_kwh is large, overflow window covers slot.
    # The slot is IN the overflow window — PV should be chosen, not battery.
    ow_start = _NOW + timedelta(minutes=15)
    ow_end = _NOW + timedelta(hours=2)
    inp = _make_planner_input(
        home5_available=True,
        battery_usable_kwh=10.0,
        overflow_windows=[(ow_start, ow_end)],
        spot_price=5.0,
    )
    result = plan_comfort_core(inp, now=_NOW)
    # Slots within overflow window should prefer FVE (free) over battery (0.50/kWh).
    for slot in result.slots:
        if ow_start <= slot.start < ow_end and slot.heating_kwh > 0:
            assert slot.source in (EnergySource.FVE, EnergySource.BATTERY, None), \
                f"Slot {slot.start}: unexpected source {slot.source}"
            # FVE (pv_kwh > 0) should take priority when overlap is complete.
            if slot.pv_kwh >= slot.heating_kwh - 1e-9:
                assert slot.source == EnergySource.FVE


def test_battery_cost_constant():
    """BATTERY_CYCLE_COST_CZK_PER_KWH must be 0.50 CZK/kWh."""
    assert _BATT_COST == 0.50


# ---------------------------------------------------------------------------
# 5. Actuation on/off service-call sequence
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_home5_engaged_when_battery_slot_current():
    """_async_tick_home5_maneuver calls set_box_mode(home_grid_v=True) when current slot is battery."""
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime
    from custom_components.oig_cloud.boiler.models import EnergySource

    now = datetime(2026, 6, 10, 6, 0, 0, tzinfo=_UTC)
    slot_start = now
    slot_end = now + timedelta(minutes=15)

    # Build a minimal battery-sourced plan result.
    battery_slot = PlanSlotAction(
        start=slot_start,
        end=slot_end,
        action="heat",
        source=EnergySource.BATTERY,
        battery_kwh=0.5,
        heating_kwh=0.5,
    )
    mock_plan_result = SimpleNamespace(slots=[battery_slot])

    # Mock hass.
    mock_hass = MagicMock()
    mock_hass.services = AsyncMock()
    mock_hass.services.async_call = AsyncMock()

    # Build a minimal runtime-like object.
    runtime = _make_minimal_runtime(mock_hass)
    runtime.last_plan_result = mock_plan_result
    runtime._home5_engaged_by_planner = False

    from custom_components.oig_cloud.const import (
        CONF_BOX_HAS_HOME56,
        CONF_BOILER_HOME5_MANEUVER_ENABLED,
    )
    runtime.coordinator.config = {
        CONF_BOX_HAS_HOME56: True,
        CONF_BOILER_HOME5_MANEUVER_ENABLED: True,
    }

    await runtime._async_tick_home5_maneuver(now=now)

    mock_hass.services.async_call.assert_called_once()
    call_args = mock_hass.services.async_call.call_args
    assert call_args.args[0] == "oig_cloud"
    assert call_args.args[1] == "set_box_mode"
    service_data_sent = call_args.args[2]
    assert service_data_sent["home_grid_v"] is True
    assert service_data_sent["acknowledgement"] is True
    assert call_args.kwargs.get("blocking") is True
    assert runtime._home5_engaged_by_planner is True


@pytest.mark.asyncio
async def test_home5_released_when_slot_no_longer_battery():
    """When we engaged Home 5 but current slot is now grid, bit is released."""
    now = datetime(2026, 6, 10, 6, 30, 0, tzinfo=_UTC)
    slot_start = now
    slot_end = now + timedelta(minutes=15)

    # Grid slot (not battery).
    grid_slot = PlanSlotAction(
        start=slot_start,
        end=slot_end,
        action="heat",
        source=EnergySource.GRID,
        grid_kwh=0.5,
        heating_kwh=0.5,
    )
    mock_plan_result = SimpleNamespace(slots=[grid_slot])

    mock_hass = MagicMock()
    mock_hass.services = AsyncMock()
    mock_hass.services.async_call = AsyncMock()

    runtime = _make_minimal_runtime(mock_hass)
    runtime.last_plan_result = mock_plan_result
    runtime._home5_engaged_by_planner = True  # Simulate: we had set it

    from custom_components.oig_cloud.const import (
        CONF_BOX_HAS_HOME56,
        CONF_BOILER_HOME5_MANEUVER_ENABLED,
    )
    runtime.coordinator.config = {
        CONF_BOX_HAS_HOME56: True,
        CONF_BOILER_HOME5_MANEUVER_ENABLED: True,
    }

    await runtime._async_tick_home5_maneuver(now=now)

    mock_hass.services.async_call.assert_called_once()
    call_args = mock_hass.services.async_call.call_args
    assert call_args.args[0] == "oig_cloud"
    assert call_args.args[1] == "set_box_mode"
    service_data_sent = call_args.args[2]
    assert service_data_sent["home_grid_v"] is False
    assert service_data_sent["acknowledgement"] is True
    assert call_args.kwargs.get("blocking") is True
    assert runtime._home5_engaged_by_planner is False


@pytest.mark.asyncio
async def test_home5_not_released_when_user_set_manually():
    """Never disable Home 5 bit if we didn't set it (non-interference)."""
    now = datetime(2026, 6, 10, 6, 30, 0, tzinfo=_UTC)
    slot_start = now
    slot_end = now + timedelta(minutes=15)

    grid_slot = PlanSlotAction(
        start=slot_start,
        end=slot_end,
        action="heat",
        source=EnergySource.GRID,
        grid_kwh=0.5,
        heating_kwh=0.5,
    )
    mock_plan_result = SimpleNamespace(slots=[grid_slot])

    mock_hass = MagicMock()
    mock_hass.services = AsyncMock()
    mock_hass.services.async_call = AsyncMock()

    runtime = _make_minimal_runtime(mock_hass)
    runtime.last_plan_result = mock_plan_result
    runtime._home5_engaged_by_planner = False  # WE did NOT set it

    from custom_components.oig_cloud.const import (
        CONF_BOX_HAS_HOME56,
        CONF_BOILER_HOME5_MANEUVER_ENABLED,
    )
    runtime.coordinator.config = {
        CONF_BOX_HAS_HOME56: True,
        CONF_BOILER_HOME5_MANEUVER_ENABLED: True,
    }

    await runtime._async_tick_home5_maneuver(now=now)

    # Must NOT call set_box_mode at all — non-interference.
    mock_hass.services.async_call.assert_not_called()
    assert runtime._home5_engaged_by_planner is False


@pytest.mark.asyncio
async def test_home5_released_when_feature_toggled_off():
    """When feature is disabled mid-flight, release the bit if we engaged it."""
    now = datetime(2026, 6, 10, 6, 30, 0, tzinfo=_UTC)

    mock_hass = MagicMock()
    mock_hass.services = AsyncMock()
    mock_hass.services.async_call = AsyncMock()

    runtime = _make_minimal_runtime(mock_hass)
    runtime.last_plan_result = None
    runtime._home5_engaged_by_planner = True  # We had it set

    from custom_components.oig_cloud.const import (
        CONF_BOX_HAS_HOME56,
        CONF_BOILER_HOME5_MANEUVER_ENABLED,
    )
    # Feature is now OFF.
    runtime.coordinator.config = {
        CONF_BOX_HAS_HOME56: False,
        CONF_BOILER_HOME5_MANEUVER_ENABLED: True,
    }

    await runtime._async_tick_home5_maneuver(now=now)

    mock_hass.services.async_call.assert_called_once()
    call_args = mock_hass.services.async_call.call_args
    assert call_args.args[0] == "oig_cloud"
    assert call_args.args[1] == "set_box_mode"
    service_data_sent = call_args.args[2]
    assert service_data_sent["home_grid_v"] is False
    assert service_data_sent["acknowledgement"] is True
    assert call_args.kwargs.get("blocking") is True


@pytest.mark.asyncio
async def test_home5_service_failure_clears_engaged_flag():
    """Service call failure clears _home5_engaged_by_planner (don't assume we hold the bit)."""
    now = datetime(2026, 6, 10, 6, 0, 0, tzinfo=_UTC)
    slot_start = now
    slot_end = now + timedelta(minutes=15)

    battery_slot = PlanSlotAction(
        start=slot_start,
        end=slot_end,
        action="heat",
        source=EnergySource.BATTERY,
        battery_kwh=0.5,
        heating_kwh=0.5,
    )
    mock_plan_result = SimpleNamespace(slots=[battery_slot])

    mock_hass = MagicMock()
    mock_hass.services = AsyncMock()
    mock_hass.services.async_call = AsyncMock(side_effect=RuntimeError("flexibilita mode"))

    runtime = _make_minimal_runtime(mock_hass)
    runtime.last_plan_result = mock_plan_result
    runtime._home5_engaged_by_planner = False

    from custom_components.oig_cloud.const import (
        CONF_BOX_HAS_HOME56,
        CONF_BOILER_HOME5_MANEUVER_ENABLED,
    )
    runtime.coordinator.config = {
        CONF_BOX_HAS_HOME56: True,
        CONF_BOILER_HOME5_MANEUVER_ENABLED: True,
    }

    # Should not raise; failure is logged + flag stays False.
    await runtime._async_tick_home5_maneuver(now=now)
    assert runtime._home5_engaged_by_planner is False


@pytest.mark.asyncio
async def test_home5_turn_off_failure_retains_engaged_flag():
    """When turn-OFF fails (e.g. flexibilita became active), _home5_engaged_by_planner
    stays True so the next coordinator tick will retry the turn-OFF.
    Without this fix the bit would be permanently stuck ON."""
    now = datetime(2026, 6, 10, 6, 30, 0, tzinfo=_UTC)
    # Current slot is GRID (battery slot has ended) → planner wants to turn off Home5.
    grid_slot = PlanSlotAction(
        start=now,
        end=now + timedelta(minutes=15),
        action="heat",
        source=EnergySource.GRID,
        grid_kwh=0.5,
        heating_kwh=0.5,
    )
    mock_plan_result = SimpleNamespace(slots=[grid_slot])

    mock_hass = MagicMock()
    mock_hass.services = AsyncMock()
    mock_hass.services.async_call = AsyncMock(side_effect=RuntimeError("Flexibilita mode is active"))

    runtime = _make_minimal_runtime(mock_hass)
    runtime.last_plan_result = mock_plan_result
    runtime._home5_engaged_by_planner = True  # WE had set it

    from custom_components.oig_cloud.const import (
        CONF_BOX_HAS_HOME56,
        CONF_BOILER_HOME5_MANEUVER_ENABLED,
    )
    runtime.coordinator.config = {
        CONF_BOX_HAS_HOME56: True,
        CONF_BOILER_HOME5_MANEUVER_ENABLED: True,
    }

    # Turn-OFF failure must keep engaged=True so the next tick retries.
    await runtime._async_tick_home5_maneuver(now=now)
    assert runtime._home5_engaged_by_planner is True, (
        "Turn-OFF failure must keep _home5_engaged_by_planner=True to allow retry"
    )


# ---------------------------------------------------------------------------
# 6. Non-interference — BoilerRuntime._home5_engaged_by_planner default False
# ---------------------------------------------------------------------------


def test_runtime_home5_flag_default_false():
    """New BoilerRuntime has _home5_engaged_by_planner = False."""
    runtime = _make_minimal_runtime(MagicMock())
    assert runtime._home5_engaged_by_planner is False


@pytest.mark.asyncio
async def test_home5_not_claimed_when_battery_slot_but_bit_already_set():
    """Non-interference: when a battery slot is active but the user has Home 5
    ON already (detected via coordinator data), the planner must NOT claim
    ownership — because it would later turn the bit off when the slot ends."""
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime
    from custom_components.oig_cloud.boiler.models import EnergySource

    now = datetime(2026, 6, 10, 6, 0, 0, tzinfo=_UTC)
    battery_slot = PlanSlotAction(
        start=now,
        end=now + timedelta(minutes=15),
        action="heat",
        source=EnergySource.BATTERY,
        battery_kwh=0.5,
        heating_kwh=0.5,
    )
    mock_plan_result = SimpleNamespace(slots=[battery_slot])

    mock_hass = MagicMock()
    mock_hass.services = AsyncMock()
    mock_hass.services.async_call = AsyncMock()

    runtime = _make_minimal_runtime(mock_hass)
    runtime.last_plan_result = mock_plan_result
    runtime._home5_engaged_by_planner = False  # WE did NOT set it

    from custom_components.oig_cloud.const import (
        CONF_BOX_HAS_HOME56,
        CONF_BOILER_HOME5_MANEUVER_ENABLED,
    )
    runtime.coordinator.config = {
        CONF_BOX_HAS_HOME56: True,
        CONF_BOILER_HOME5_MANEUVER_ENABLED: True,
    }
    # Simulate the hardware bit already being set (raw app=1 → bit 0 set = home_grid_v ON).
    runtime.coordinator.data = {"box_prm2": {"app": 1}}

    await runtime._async_tick_home5_maneuver(now=now)

    # Must NOT call set_box_mode — non-interference when user already has the bit set.
    mock_hass.services.async_call.assert_not_called()
    assert runtime._home5_engaged_by_planner is False


# ---------------------------------------------------------------------------
# 7. R6 overlay — battery slots included
# ---------------------------------------------------------------------------


def test_r6_overlay_includes_battery_slots():
    """_read_boiler_grid_load_overlay includes battery_kwh in overlay."""
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _read_boiler_grid_load_overlay,
    )
    from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES

    t0 = datetime(2026, 6, 10, 6, 0, 0, tzinfo=_UTC)
    battery_slot = PlanSlotAction(
        start=t0,
        end=t0 + timedelta(minutes=15),
        action="heat",
        source=EnergySource.BATTERY,
        battery_kwh=0.5,
        grid_kwh=0.0,
    )
    plan_result = SimpleNamespace(slots=[battery_slot])
    runtime = SimpleNamespace(last_plan_result=plan_result)

    hass = SimpleNamespace(
        data={DOMAIN: {"e1": {KEY_BOILER_RUNTIMES: {"box1": runtime}}}}
    )
    sensor = SimpleNamespace(hass=hass, _hass=hass)
    overlay = _read_boiler_grid_load_overlay(sensor)
    assert len(overlay) > 0
    # battery slot start is in overlay
    assert any(abs((k - t0).total_seconds()) < 1 for k in overlay), \
        f"Expected {t0} in overlay keys {list(overlay.keys())}"
    # Value should be the battery_kwh
    matching = [v for k, v in overlay.items() if abs((k - t0).total_seconds()) < 1]
    assert matching and matching[0] == pytest.approx(0.5)


def test_r6_overlay_excludes_pure_pv_slots():
    """_read_boiler_grid_load_overlay excludes slots with only pv_kwh (grid_kwh=0, battery_kwh=0)."""
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _read_boiler_grid_load_overlay,
    )
    from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES

    t0 = datetime(2026, 6, 10, 10, 0, 0, tzinfo=_UTC)
    pv_slot = PlanSlotAction(
        start=t0,
        end=t0 + timedelta(minutes=15),
        action="heat",
        source=EnergySource.FVE,
        pv_kwh=0.5,
        grid_kwh=0.0,
        battery_kwh=0.0,
    )
    plan_result = SimpleNamespace(slots=[pv_slot])
    runtime = SimpleNamespace(last_plan_result=plan_result)

    hass = SimpleNamespace(
        data={DOMAIN: {"e1": {KEY_BOILER_RUNTIMES: {"box1": runtime}}}}
    )
    sensor = SimpleNamespace(hass=hass, _hass=hass)
    overlay = _read_boiler_grid_load_overlay(sensor)
    # PV slot must NOT appear in overlay.
    assert len(overlay) == 0


def test_r6_overlay_includes_both_grid_and_battery():
    """_read_boiler_grid_load_overlay sums grid_kwh + battery_kwh for mixed slots."""
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _read_boiler_grid_load_overlay,
    )
    from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES

    t0 = datetime(2026, 6, 10, 6, 0, 0, tzinfo=_UTC)
    grid_slot = PlanSlotAction(
        start=t0,
        end=t0 + timedelta(minutes=15),
        action="heat",
        source=EnergySource.GRID,
        grid_kwh=0.4,
        battery_kwh=0.0,
    )
    batt_slot = PlanSlotAction(
        start=t0 + timedelta(minutes=15),
        end=t0 + timedelta(minutes=30),
        action="heat",
        source=EnergySource.BATTERY,
        battery_kwh=0.5,
        grid_kwh=0.0,
    )
    plan_result = SimpleNamespace(slots=[grid_slot, batt_slot])
    runtime = SimpleNamespace(last_plan_result=plan_result)

    hass = SimpleNamespace(
        data={DOMAIN: {"e1": {KEY_BOILER_RUNTIMES: {"box1": runtime}}}}
    )
    sensor = SimpleNamespace(hass=hass, _hass=hass)
    overlay = _read_boiler_grid_load_overlay(sensor)
    assert len(overlay) == 2  # two distinct timestamps
    values = list(overlay.values())
    assert pytest.approx(0.4) in values
    assert pytest.approx(0.5) in values


# ---------------------------------------------------------------------------
# 8. BoilerBatterySignals.from_raw accepts battery_usable_kwh
# ---------------------------------------------------------------------------


def test_battery_signals_from_raw_with_usable_kwh():
    """from_raw accepts and stores battery_usable_kwh."""
    raw = {"overflow_windows": [], "battery_usable_kwh": 7.5}
    signals = BoilerBatterySignals.from_raw(raw)
    assert signals.battery_usable_kwh == pytest.approx(7.5)


def test_battery_signals_from_raw_without_usable_kwh():
    """from_raw with no battery_usable_kwh leaves it None."""
    raw = {"overflow_windows": []}
    signals = BoilerBatterySignals.from_raw(raw)
    assert signals.battery_usable_kwh is None


def test_battery_signals_from_raw_non_numeric_usable_kwh():
    """from_raw with non-numeric battery_usable_kwh leaves it None."""
    raw = {"overflow_windows": [], "battery_usable_kwh": "invalid"}
    signals = BoilerBatterySignals.from_raw(raw)
    assert signals.battery_usable_kwh is None


def test_battery_signals_from_raw_rejects_extra_fields():
    """from_raw silently ignores fields not in ALLOWED_FIELDS."""
    raw = {
        "overflow_windows": [],
        "battery_usable_kwh": 3.0,
        "secret_internal_field": "hack",
    }
    signals = BoilerBatterySignals.from_raw(raw)
    assert signals.battery_usable_kwh == pytest.approx(3.0)
    assert not hasattr(signals, "secret_internal_field")


# ---------------------------------------------------------------------------
# 9. home5_available=False → no BATTERY source
# ---------------------------------------------------------------------------


def test_no_battery_when_home5_not_available():
    """Plan result has no battery_kwh when home5_available is False."""
    inp = _make_planner_input(
        home5_available=False,
        battery_usable_kwh=10.0,
        spot_price=10.0,
    )
    result = plan_comfort_core(inp, now=_NOW)
    assert result.battery_kwh == 0.0
    assert all(getattr(s, "battery_kwh", 0.0) == 0.0 for s in result.slots)


# ---------------------------------------------------------------------------
# 10. SOURCE_SELECTED_BATTERY reason code
# ---------------------------------------------------------------------------


def test_source_selected_battery_reason_code_present():
    """SOURCE_SELECTED_BATTERY is in reason_codes when battery slots allocated."""
    inp = _make_planner_input(
        home5_available=True,
        battery_usable_kwh=10.0,
        overflow_windows=_OVERFLOW_WINDOWS,
        spot_price=5.0,
    )
    result = plan_comfort_core(inp, now=_NOW)
    if result.battery_kwh > 0:
        assert PlannerReasonCode.SOURCE_SELECTED_BATTERY in result.reason_codes


def test_source_selected_battery_not_in_codes_when_no_battery():
    """SOURCE_SELECTED_BATTERY is NOT in reason_codes when feature is off."""
    inp = _make_planner_input(home5_available=False, battery_usable_kwh=10.0, spot_price=10.0)
    result = plan_comfort_core(inp, now=_NOW)
    assert PlannerReasonCode.SOURCE_SELECTED_BATTERY not in result.reason_codes


# ---------------------------------------------------------------------------
# Helpers for runtime mocking
# ---------------------------------------------------------------------------


def _make_minimal_runtime(mock_hass: Any) -> Any:
    """Return a BoilerRuntime-like object with just enough for Home 5 tests."""
    # Use the real class to get the correct _async_tick_home5_maneuver method.
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime

    # Minimal interface mocks.
    read_model = MagicMock()
    planner = MagicMock()
    actuator = MagicMock()
    energy_adapter = MagicMock()
    coordinator = MagicMock()
    coordinator.config = {}

    runtime = BoilerRuntime(
        hass=mock_hass,
        read_model=read_model,
        planner=planner,
        actuator=actuator,
        energy_adapter=energy_adapter,
        coordinator=coordinator,
        box_id="box1",
        entry_id="e1",
    )
    return runtime
