"""A car on the box's backup output charges only in Home UPS.

Field case 21. 11. 2026: the wallbox hangs on the backup output. In Home 1 the
11 kW car ran from the battery (02:45-04:01, down to 19 %), the inverter
reported ERR_ELSE=4 within a minute of every start and the box moved the load
to its bypass after about two minutes.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import List, Optional

import pytest

from custom_components.oig_cloud.battery_forecast import economic_planner as ep
from custom_components.oig_cloud.battery_forecast.economic_planner_types import PlannerInputs
from custom_components.oig_cloud.battery_forecast.planning import auto_switch
from custom_components.oig_cloud.battery_forecast.planning.flex_loads import (
    EvRequest,
    FlexInputs,
    GridLimits,
    plan_flex_loads,
)
from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
    _flex_ups_required,
    _force_ups_required,
)
from custom_components.oig_cloud.battery_forecast.types import CBBMode
from custom_components.oig_cloud.ev import backup_guard
from custom_components.oig_cloud.ev.control import EvController
from custom_components.oig_cloud.ev.profile import NextNeed
from tests.test_auto_switch_regressions import switch_runtime  # noqa: F401  (fixture)

HOME_1 = CBBMode.HOME_I.value
UPS = CBBMode.HOME_UPS.value
TZ = timezone(timedelta(hours=1))
NOW = datetime(2026, 11, 21, 2, 45, tzinfo=TZ)
BACKUP = {
    "ev_on_backup_circuit": True,
    "ev_charger_power_entity": "sensor.wallbox_power",
    "grid_breaker_a": 25.0,
    "grid_reserve_a": 2.0,
    "grid_phases": 3,
}


# ── the pure parts ─────────────────────────────────────────────────────────


def _hass(values):
    def get(entity_id):
        if entity_id not in values:
            return None
        value = values[entity_id]
        state, attrs = value if isinstance(value, tuple) else (value, {})
        return SimpleNamespace(entity_id=entity_id, state=state, attributes=attrs)

    return SimpleNamespace(states=SimpleNamespace(get=get))


def test_wallbox_power_in_kw_or_w():
    kw = _hass({"sensor.wallbox_power": ("11.0", {"unit_of_measurement": "kW"})})
    watts = _hass({"sensor.wallbox_power": ("7800", {"unit_of_measurement": "W"})})
    assert backup_guard.car_draw_kw(kw, BACKUP) == 11.0
    assert backup_guard.car_draw_kw(watts, BACKUP) == 7.8
    assert backup_guard.car_drawing(kw, BACKUP)
    # Off the backup output nothing is guarded.
    assert not backup_guard.car_drawing(kw, {**BACKUP, "ev_on_backup_circuit": False})
    # Standby or unknown power is not charging.
    assert not backup_guard.car_drawing(_hass({"sensor.wallbox_power": "0.2"}), BACKUP)
    assert not backup_guard.car_drawing(_hass({"sensor.wallbox_power": "unavailable"}), BACKUP)


def test_home_ups_is_forced_after_a_minute_of_drawing_outside_it():
    timer = backup_guard.OverloadTimer()
    assert not timer.due(NOW, drawing=True, in_ups=False)
    assert not timer.due(NOW + timedelta(seconds=30), drawing=True, in_ups=False)
    assert timer.due(NOW + timedelta(seconds=60), drawing=True, in_ups=False)
    # In Home UPS, or once the car stops, the clock starts again.
    assert not timer.due(NOW + timedelta(seconds=90), drawing=True, in_ups=True)
    assert not timer.due(NOW + timedelta(seconds=120), drawing=True, in_ups=False)
    assert not timer.due(NOW + timedelta(seconds=150), drawing=False, in_ups=False)
    assert timer.since is None


def test_battery_charge_current_fits_the_breaker_next_to_the_car():
    # 23 A x 230 V x 3 = 15.87 kW; house with the car 14.99 kW (box event 11:51:22).
    amps = backup_guard.battery_charge_amps_for_breaker(BACKUP, 14_988.0, 51.9, 125)
    assert amps == 16
    # Plenty of room: the configured current stays.
    assert backup_guard.battery_charge_amps_for_breaker(BACKUP, 1_000.0, 52.0, 125) == 125
    # Over the breaker already: the lowest current, not zero.
    assert (
        backup_guard.battery_charge_amps_for_breaker(BACKUP, 20_000.0, 52.0, 125)
        == backup_guard.MIN_UPS_CHARGE_A
    )
    # Unknown load, voltage or breaker: unchanged.
    assert backup_guard.battery_charge_amps_for_breaker(BACKUP, None, 52.0, 125) == 125
    assert backup_guard.battery_charge_amps_for_breaker({**BACKUP, "grid_breaker_a": 0}, 14_000.0, 52.0, 125) == 125


# ── the battery plan ───────────────────────────────────────────────────────

CAPACITY = 15.36


def _planner_inputs(prices, *, required=None, allowed=None, soc=10.0):
    n = len(prices)
    return PlannerInputs(
        current_soc_kwh=soc,
        max_capacity_kwh=CAPACITY,
        hw_min_kwh=0.2 * CAPACITY,
        planning_min_percent=22.0,
        charge_rate_kw=6.4,
        intervals=[{"index": i} for i in range(n)],
        prices=prices,
        solar_forecast=[0.0] * n,
        load_forecast=[0.25] * n,
        export_prices=None,
        current_mode=HOME_1,
        ups_allowed=allowed,
        ups_required=required,
    )


def test_the_plan_is_home_ups_wherever_the_car_charges():
    # Expensive slots: the optimizer alone would run Home 1 everywhere.
    prices = [9.0] * 12
    free = ep.plan_battery_schedule(_planner_inputs(prices))
    assert UPS not in free.modes
    required = [False] * 4 + [True] * 3 + [False] * 5
    # Even where the breaker would have kept the battery out.
    allowed = [False] * 12
    result = ep.plan_battery_schedule(_planner_inputs(prices, required=required, allowed=allowed))
    assert [i for i, m in enumerate(result.modes) if m == UPS][:3] == [4, 5, 6]
    reasons = {d.reason for d in result.decisions}
    assert ep.REASON_EV_ON_BACKUP in reasons


def test_the_mode_guard_cannot_undo_the_cars_ups():
    modes = [HOME_1, HOME_1, HOME_1, HOME_1]
    assert _force_ups_required(modes, [False, True, True, False]) == [HOME_1, UPS, UPS, HOME_1]
    assert _force_ups_required(modes, None) == modes
    assert _flex_ups_required(SimpleNamespace(ups_required=[False, False]), 3) is None
    assert _flex_ups_required(SimpleNamespace(ups_required=[False, True]), 3) == [False, True, False]


def _flex(on_backup: bool, battery_first: bool = False):
    n = 16
    start = NOW
    return plan_flex_loads(
        FlexInputs(
            slot_starts=[start + timedelta(minutes=15 * i) for i in range(n)],
            import_prices=[6.0] * 4 + [3.0] * 4 + [6.0] * 8,
            export_prices=[0.5] * n,
            solar_kwh=[0.0] * n,
            backup_load_kwh=[0.25] * n,
            surplus_after_battery_kwh=[0.0] * n,
            battery_charge_kw=6.4,
            limits=GridLimits(breaker_a=25.0, reserve_a=2.0, phases=3),
            priority=("battery", "ev", "boiler") if battery_first else ("ev", "boiler", "battery"),
            ev=EvRequest(
                soc_pct=60.0,
                capacity_kwh=25.9,
                charge_limit_pct=100.0,
                max_power_kw=11.0,
                min_power_kw=4.14,
                need=NextNeed(start + timedelta(hours=4), 100.0, 0),
            ),
            ev_on_backup=on_backup,
        )
    )


def test_car_slots_on_the_backup_output_require_home_ups():
    plan = _flex(True)
    charged = [g + p > 0 for g, p in zip(plan.ev_plan.grid_kwh_by_slot(), plan.ev_plan.pv_kwh_by_slot())]
    assert any(charged)
    assert plan.ups_required == charged
    # Required slots are allowed, whatever the breaker says.
    assert all(plan.ups_allowed[i] for i, req in enumerate(plan.ups_required) if req)
    assert plan.as_dict()["ups_required_slots"] == [i for i, c in enumerate(charged) if c]
    # The car on the non-backup circuit requires nothing.
    assert _flex(False).ups_required == []


# ── the watchdog ───────────────────────────────────────────────────────────


def _backup_runtime(runtime, wallbox_kw: Optional[float], mode: str = "Home 1"):
    """switch_runtime with the car on the backup output and a wallbox sensor."""
    values = {"sensor.wallbox_power": (str(wallbox_kw), {"unit_of_measurement": "kW"})}
    box_state = runtime.state
    box_state.state = mode

    def get(entity_id):
        if entity_id == "sensor.oig_123_box_prms_mode":
            return box_state
        value = values.get(entity_id)
        if value is None:
            return None
        return SimpleNamespace(entity_id=entity_id, state=value[0], attributes=value[1])

    runtime.sensor._hass.states = SimpleNamespace(get=get)
    runtime.sensor._config_entry.options.update(BACKUP)
    runtime.values = values
    return runtime


def _mode_calls(runtime) -> List[str]:
    return [call[3].get("mode") for call in runtime.calls if call[3].get("mode")]


@pytest.mark.asyncio
async def test_car_drawing_in_home_1_forces_home_ups_past_the_guards(switch_runtime):  # noqa: F811
    runtime = _backup_runtime(switch_runtime, 11.0)
    # The box changed a minute ago: the 5-minute interval would normally wait.
    runtime.state.last_changed = runtime.clock.now - timedelta(minutes=1)
    await auto_switch.auto_switch_watchdog_tick(runtime.sensor, runtime.clock.now)
    assert _mode_calls(runtime) == []  # not yet a minute of drawing
    runtime.clock.now += timedelta(seconds=60)
    await auto_switch.auto_switch_watchdog_tick(runtime.sensor, runtime.clock.now)
    assert _mode_calls(runtime) == ["Home UPS"]


@pytest.mark.asyncio
async def test_a_short_spike_does_not_switch(switch_runtime):  # noqa: F811
    runtime = _backup_runtime(switch_runtime, 11.0)
    runtime.sensor._timeline_data = [{"time": runtime.clock.now.isoformat(), "mode_name": "HOME I"}]
    await auto_switch.auto_switch_watchdog_tick(runtime.sensor, runtime.clock.now)
    runtime.values["sensor.wallbox_power"] = ("0.0", {"unit_of_measurement": "kW"})
    runtime.clock.now += timedelta(seconds=60)
    await auto_switch.auto_switch_watchdog_tick(runtime.sensor, runtime.clock.now)
    assert _mode_calls(runtime) == []


@pytest.mark.asyncio
async def test_home_ups_is_not_left_while_the_car_draws(switch_runtime):  # noqa: F811
    runtime = _backup_runtime(switch_runtime, 11.0, mode="Home UPS")
    runtime.state.last_changed = runtime.clock.now - timedelta(hours=1)
    # The plan wants Home 1 now: neither the watchdog nor a scheduled switch moves.
    runtime.sensor._timeline_data = [{"time": runtime.clock.now.isoformat(), "mode_name": "HOME I"}]
    await auto_switch.auto_switch_watchdog_tick(runtime.sensor, runtime.clock.now)
    context = auto_switch.SwitchContext(reason_code=auto_switch.REASON_SCHEDULED_SWITCH)
    await auto_switch.ensure_current_mode(runtime.sensor, "Home 1", "scheduled", context=context)
    assert _mode_calls(runtime) == []
    # Once the car stops, the plan decides again.
    runtime.values["sensor.wallbox_power"] = ("0.0", {"unit_of_measurement": "kW"})
    await auto_switch.ensure_current_mode(runtime.sensor, "Home 1", "scheduled", context=context)
    assert _mode_calls(runtime) == ["Home 1"]


@pytest.mark.asyncio
async def test_charge_current_follows_the_breaker_while_the_car_charges(switch_runtime, monkeypatch):  # noqa: F811
    from custom_components.oig_cloud.control import proxy_control as pc

    runtime = _backup_runtime(switch_runtime, 11.0, mode="Home UPS")
    runtime.state.last_changed = runtime.clock.now - timedelta(minutes=3)
    runtime.values["sensor.oig_123_actual_aco_p"] = ("0", {})
    runtime.values["sensor.oig_123_actual_acinb_wtotal"] = ("14988", {})
    readback = {"value": 125.0}
    monkeypatch.setattr(pc, "ups_charge_current", lambda hass, entry, box_id: 125)

    def read(hass, box_id, key, control=False):
        return 51.9 if key == pc.PARAM_BAT_VOLTAGE else readback["value"]

    monkeypatch.setattr(pc, "read_proxy_number", read)
    assert await auto_switch.ensure_ups_charge_current(runtime.sensor, runtime.clock.now)
    assert runtime.calls[-1][3] == {"charge_current": 16, "acknowledgement": True}
    readback["value"] = 16.0
    # The load barely moved: no rewrite.
    runtime.clock.now += timedelta(minutes=6)
    runtime.values["sensor.oig_123_actual_acinb_wtotal"] = ("14600", {})
    assert not await auto_switch.ensure_ups_charge_current(runtime.sensor, runtime.clock.now)
    # The car stopped: the configured current comes back.
    runtime.values["sensor.wallbox_power"] = ("0.0", {"unit_of_measurement": "kW"})
    assert await auto_switch.ensure_ups_charge_current(runtime.sensor, runtime.clock.now)
    assert runtime.calls[-1][3] == {"charge_current": 125, "acknowledgement": True}


# ── the car controller ─────────────────────────────────────────────────────


class _Services:
    def __init__(self):
        self.calls = []

    async def async_call(self, domain, service, data, blocking=False):
        self.calls.append((domain, service, dict(data)))


class _Runtime:
    def __init__(self, options, in_ups):
        self.hass = _hass({"switch.wb": "off"})
        self.hass.services = _Services()
        self.options = options
        self.last_plan = SimpleNamespace(charge_now=True, slots=[SimpleNamespace(power_kw=11.0)])
        self.last_plugged = True
        self.next_day = None
        self.charge_override = None
        self.control_state = {}
        self.ups = {"value": in_ups}
        self.requests = 0
        self.box_in_ups = lambda: self.ups["value"]
        self.request_ups = self._request

    def _request(self):
        self.requests += 1

    def live_options(self):
        return dict(self.options)

    def raise_limit_for_trip(self):
        return False

    def user_target_limit(self):
        return 0.0

    def set_car_limit(self):
        return False

    async def async_save(self):
        pass


WALLBOX = {"ev_control_mode": "wallbox", "ev_switch_entity": "switch.wb"}


async def test_planned_charge_waits_for_home_ups():
    runtime = _Runtime({**WALLBOX, **BACKUP}, in_ups=False)
    ctl = EvController(runtime)
    await ctl.async_apply(NOW)
    assert runtime.hass.services.calls == []
    assert runtime.requests == 1
    await ctl.async_apply(NOW + timedelta(minutes=1))
    assert runtime.hass.services.calls == [] and runtime.requests == 1
    runtime.ups["value"] = True
    await ctl.async_apply(NOW + timedelta(minutes=2))
    assert runtime.hass.services.calls == [("switch", "turn_on", {"entity_id": "switch.wb"})]


async def test_a_box_that_never_answers_does_not_cost_the_departure():
    runtime = _Runtime({**WALLBOX, **BACKUP}, in_ups=False)
    ctl = EvController(runtime)
    await ctl.async_apply(NOW)
    await ctl.async_apply(NOW + backup_guard.PRESTART_MAX_WAIT)
    assert runtime.hass.services.calls == [("switch", "turn_on", {"entity_id": "switch.wb"})]


async def test_off_the_backup_output_the_car_starts_at_once():
    runtime = _Runtime(dict(WALLBOX), in_ups=False)
    await EvController(runtime).async_apply(NOW)
    assert runtime.hass.services.calls == [("switch", "turn_on", {"entity_id": "switch.wb"})]
    assert runtime.requests == 0
