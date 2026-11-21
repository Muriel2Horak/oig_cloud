"""A mode the user set by hand is held, not reverted within minutes.

Field case 15. 11. 2026: Martin switched to Home 2 at 10:47, 16:12, 18:36 and
19:10; the watchdog put Home UPS back within 2-7 minutes each time.
"""

from datetime import timedelta

import pytest

from custom_components.oig_cloud.battery_forecast.planning import auto_switch
from tests.test_auto_switch_regressions import switch_runtime  # noqa: F401  (fixture)


def _manual(runtime, minutes_ago: float, mode: str = "Home 2") -> None:
    """The integration had put the box in Home UPS an hour ago; the user then
    switched by hand."""
    runtime.sensor._last_auto_switch_request = ("Home UPS", runtime.clock.now - timedelta(hours=1))
    runtime.state.state = mode
    runtime.state.last_changed = runtime.clock.now - timedelta(minutes=minutes_ago)


@pytest.mark.asyncio
async def test_watchdog_holds_a_manual_mode_until_the_slot_after_fifteen_minutes(
    switch_runtime,  # noqa: F811
):
    runtime = switch_runtime
    _manual(runtime, 8)  # changed at 11:52; plan says Home UPS

    await auto_switch.auto_switch_watchdog_tick(runtime.sensor, runtime.clock.now)
    assert runtime.calls == []
    assert runtime.retries and runtime.retries[-1][0] == 15 * 60

    # Held until 12:15 (first slot boundary 15 minutes after the change).
    runtime.clock.now += timedelta(minutes=16)
    await auto_switch.auto_switch_watchdog_tick(runtime.sensor, runtime.clock.now)
    assert runtime.calls and runtime.calls[-1][3]["mode"] == "Home UPS"


@pytest.mark.asyncio
async def test_the_refresh_of_the_current_block_holds_it_too(switch_runtime):  # noqa: F811
    runtime = switch_runtime
    _manual(runtime, 8)
    context = auto_switch.SwitchContext(reason_code=auto_switch.REASON_CURRENT_BLOCK)

    await auto_switch.ensure_current_mode(
        runtime.sensor, "Home UPS", "current planned block", context=context
    )
    assert runtime.calls == []


@pytest.mark.asyncio
async def test_a_mode_the_integration_requested_is_not_a_manual_one(switch_runtime):  # noqa: F811
    runtime = switch_runtime
    _manual(runtime, 8)
    runtime.sensor._last_auto_switch_request = (
        "Home 2",
        runtime.state.last_changed - timedelta(seconds=40),
    )

    await auto_switch.auto_switch_watchdog_tick(runtime.sensor, runtime.clock.now)
    assert runtime.calls and runtime.calls[-1][3]["mode"] == "Home UPS"


@pytest.mark.asyncio
async def test_a_new_plan_decision_at_a_slot_boundary_still_switches(switch_runtime):  # noqa: F811
    runtime = switch_runtime
    _manual(runtime, 8)
    context = auto_switch.SwitchContext(reason_code=auto_switch.REASON_SCHEDULED_SWITCH)

    await auto_switch.ensure_current_mode(
        runtime.sensor, "Home UPS", "scheduled", context=context
    )
    assert runtime.calls and runtime.calls[-1][3]["mode"] == "Home UPS"


def test_hold_end_is_a_slot_boundary_at_least_fifteen_minutes_after_the_change(
    switch_runtime,  # noqa: F811
):
    runtime = switch_runtime
    _manual(runtime, 1)  # 11:59
    until = auto_switch.manual_hold_until(runtime.sensor)
    assert until == runtime.clock.now + timedelta(minutes=15)  # 12:15


@pytest.mark.asyncio
async def test_without_any_request_since_start_nothing_is_held(switch_runtime):  # noqa: F811
    runtime = switch_runtime
    runtime.state.state = "Home 2"
    runtime.state.last_changed = runtime.clock.now - timedelta(minutes=8)

    assert auto_switch.manual_hold_until(runtime.sensor) is None
    await auto_switch.auto_switch_watchdog_tick(runtime.sensor, runtime.clock.now)
    assert runtime.calls and runtime.calls[-1][3]["mode"] == "Home UPS"


def test_a_request_the_box_is_still_applying_is_not_a_manual_mode(switch_runtime):  # noqa: F811
    """Field case 17. 11. 2026, 09:59: Home 1 was requested, the box (proxy,
    about a minute) still showed the Home UPS it had since the restart, and
    that was taken for a manual UPS: the plan was blocked until 10:15."""
    runtime = switch_runtime
    runtime.state.state = "Home UPS"
    runtime.state.last_changed = runtime.clock.now - timedelta(minutes=6)
    runtime.sensor._last_auto_switch_request = ("Home 1", runtime.clock.now - timedelta(seconds=30))

    assert auto_switch.manual_hold_until(runtime.sensor) is None


def test_a_change_after_our_request_to_another_mode_is_still_manual(switch_runtime):  # noqa: F811
    runtime = switch_runtime
    runtime.sensor._last_auto_switch_request = ("Home 1", runtime.clock.now - timedelta(minutes=20))
    runtime.state.state = "Home 2"
    runtime.state.last_changed = runtime.clock.now - timedelta(minutes=2)

    assert auto_switch.manual_hold_until(runtime.sensor) is not None


async def test_home_ups_entered_without_us_gets_the_charge_current_once(switch_runtime, monkeypatch):  # noqa: F811
    """Every mode change resets the box to 50 A; a Home UPS after a restart or a
    manual switch gets the configured current written once."""
    from custom_components.oig_cloud.control import proxy_control as pc

    runtime = switch_runtime
    monkeypatch.setattr(pc, "ups_charge_current", lambda hass, entry, box_id: 125)
    readback = {"value": 50.0}
    monkeypatch.setattr(pc, "read_proxy_number", lambda hass, box_id, key, control=False: readback["value"])
    runtime.state.state = "Home UPS"
    runtime.state.last_changed = runtime.clock.now - timedelta(minutes=1)

    # Not while the box may still be applying the mode.
    assert not await auto_switch.ensure_ups_charge_current(runtime.sensor, runtime.clock.now)
    runtime.clock.now += timedelta(minutes=2)
    assert await auto_switch.ensure_ups_charge_current(runtime.sensor, runtime.clock.now)
    assert runtime.calls[-1][3] == {"charge_current": 125, "acknowledgement": True}
    # Once per Home UPS stretch, even if the readback still says 50 A.
    assert not await auto_switch.ensure_ups_charge_current(runtime.sensor, runtime.clock.now)
    # Already at the configured current: nothing.
    readback["value"] = 125.0
    runtime.state.last_changed = runtime.clock.now
    runtime.clock.now += timedelta(minutes=5)
    assert not await auto_switch.ensure_ups_charge_current(runtime.sensor, runtime.clock.now)
