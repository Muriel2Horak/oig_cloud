"""Acting on the car's plan: switch, current, limit, heating before departure."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.ev.calendar import EvDay
from custom_components.oig_cloud.ev.control import EvController, amps_for_power
from custom_components.oig_cloud.ev.precondition import decide_precondition

TZ = timezone(timedelta(hours=1))
NOW = datetime(2026, 11, 16, 22, 0, tzinfo=TZ)
DEPARTURE = datetime(2026, 11, 17, 6, 0, tzinfo=TZ)


class _States:
    def __init__(self, values):
        self.values = values

    def get(self, entity_id):
        if entity_id not in self.values:
            return None
        value = self.values[entity_id]
        state, attrs = value if isinstance(value, tuple) else (value, {})
        return SimpleNamespace(entity_id=entity_id, state=state, attributes=attrs)


class _Services:
    def __init__(self, states):
        self.calls = []
        self.states = states

    async def async_call(self, domain, service, data, blocking=False):
        self.calls.append((domain, service, dict(data)))


class _Runtime:
    def __init__(self, states, options, plan=None, day=None):
        self.hass = SimpleNamespace(states=_States(states))
        self.hass.services = _Services(self.hass.states)
        self.options = options
        self.last_plan = plan
        self.last_plugged = True
        self.next_day = day
        self.charge_override = None
        self.control_state = {}
        self.saved = 0

    def live_options(self):
        return dict(self.options)

    def raise_limit_for_trip(self):
        return bool(self.options.get("ev_raise_limit_for_trip"))

    def user_target_limit(self):
        return 0.0

    def set_car_limit(self):
        return False

    async def async_save(self):
        self.saved += 1


def _plan(charge_now, power_kw=11.0):
    return SimpleNamespace(charge_now=charge_now, slots=[SimpleNamespace(power_kw=power_kw)])


WALLBOX = {"ev_control_mode": "wallbox", "ev_switch_entity": "switch.wb"}


def _day(**kw):
    values = dict(day=date(2026, 11, 17), source="profile", departure=DEPARTURE, need_pct=40.0)
    values.update(kw)
    return EvDay(**values)


async def test_switch_follows_the_plan_and_waits_for_the_device():
    runtime = _Runtime({"switch.wb": "on"}, WALLBOX, plan=_plan(False), day=_day())
    ctl = EvController(runtime)
    await ctl.async_apply(NOW)
    assert runtime.hass.services.calls == [("switch", "turn_off", {"entity_id": "switch.wb"})]
    # The cloud has not answered yet: no second command.
    await ctl.async_apply(NOW + timedelta(minutes=1))
    assert len(runtime.hass.services.calls) == 1


async def test_a_change_by_someone_else_holds_until_departure():
    runtime = _Runtime({"switch.wb": "off"}, WALLBOX, plan=_plan(False), day=_day())
    ctl = EvController(runtime)
    await ctl.async_apply(NOW)  # already off: remembered as ours
    assert runtime.hass.services.calls == []
    runtime.hass.states.values["switch.wb"] = "on"  # someone resumed it in the app
    await ctl.async_apply(NOW + timedelta(minutes=5))
    assert ctl.manual_hold_until == DEPARTURE
    assert runtime.hass.services.calls == []
    # Unplugging ends the hold.
    runtime.last_plugged = False
    await ctl.async_apply(NOW + timedelta(minutes=6))
    assert ctl.manual_hold_until is None


async def test_nothing_happens_in_plan_only_mode_or_when_unplugged():
    runtime = _Runtime({"switch.wb": "on"}, {"ev_control_mode": "none", "ev_switch_entity": "switch.wb"}, plan=_plan(False))
    await EvController(runtime).async_apply(NOW)
    runtime2 = _Runtime({"switch.wb": "on"}, WALLBOX, plan=_plan(False))
    runtime2.last_plugged = False
    await EvController(runtime2).async_apply(NOW)
    assert runtime.hass.services.calls == runtime2.hass.services.calls == []


async def test_current_follows_the_planned_power():
    options = {**WALLBOX, "ev_current_control": True, "ev_current_entity": "number.amps"}
    runtime = _Runtime({"switch.wb": "on", "number.amps": ("16", {"min": 6, "max": 16})}, options, plan=_plan(True, 6.0))
    ctl = EvController(runtime)
    await ctl.async_apply(NOW)
    assert ("number", "set_value", {"entity_id": "number.amps", "value": 9}) in runtime.hass.services.calls
    assert ctl.last_current_a == 9


def test_amps_for_power_stays_in_range():
    assert amps_for_power(11.0, 3, 6, 16) == 16
    assert amps_for_power(2.0, 3, 6, 16) == 6
    assert amps_for_power(0.0, 3, 6, 16) == 6
    assert amps_for_power(3.7, 1, 6, 32) == 17


async def test_trip_raises_the_limit_and_restores_it_after():
    options = {"ev_charge_limit_entity": "number.limit", "ev_raise_limit_for_trip": True}
    runtime = _Runtime({"number.limit": "80"}, options, day=_day(source="trip", full_charge=True, need_pct=100))
    ctl = EvController(runtime)
    await ctl.async_apply(NOW)
    assert runtime.control_state == {"restore_limit": 80.0}
    assert ("number", "set_value", {"entity_id": "number.limit", "value": 100}) in runtime.hass.services.calls
    runtime.hass.states.values["number.limit"] = "100"
    runtime.next_day = _day()  # after the trip
    await ctl.async_apply(NOW + timedelta(days=1))
    assert runtime.hass.services.calls[-1] == ("number", "set_value", {"entity_id": "number.limit", "value": 80.0})
    assert runtime.control_state == {}


async def test_stopping_the_integration_leaves_the_switch_alone():
    # A restart must not start a charge: the switch stays as it is.
    runtime = _Runtime({"switch.wb": "off"}, WALLBOX)
    await EvController(runtime).async_stop()
    assert runtime.hass.services.calls == []


async def test_heating_starts_once_before_a_cold_departure():
    options = {
        "ev_climate_entity": "climate.car",
        "ev_climate_when": "cold",
        "ev_outside_temp_entity": "weather.home",
        "ev_window_heating_entity": "switch.windows",
    }
    states = {
        "climate.car": ("off", {"hvac_modes": ["heat_cool", "off"]}),
        "weather.home": ("cloudy", {"temperature": 1.5}),
    }
    runtime = _Runtime(states, options, day=_day())
    ctl = EvController(runtime)
    await ctl.async_apply(DEPARTURE - timedelta(minutes=30))
    assert runtime.hass.services.calls == []
    assert ctl.last_precondition.reason == "waiting"
    await ctl.async_apply(DEPARTURE - timedelta(minutes=19))
    assert runtime.hass.services.calls == [
        ("climate", "set_temperature", {"entity_id": "climate.car", "temperature": 22.0, "hvac_mode": "heat_cool"}),
        ("switch", "turn_on", {"entity_id": "switch.windows"}),
    ]
    await ctl.async_apply(DEPARTURE - timedelta(minutes=10))
    assert len(runtime.hass.services.calls) == 2
    assert ctl.as_dict()["precondition"]["reason"] == "done"


@pytest.mark.parametrize(
    ("when", "outside", "day_choice", "plugged", "reason"),
    [
        ("off", 0.0, None, True, "not_wanted"),
        ("cold", 8.0, None, True, "warm"),
        ("cold", None, None, True, "no_temperature"),
        ("calendar", 0.0, None, True, "not_wanted"),
        ("calendar", 20.0, True, True, "start"),
        ("always", 20.0, False, True, "day_off"),
        ("always", 20.0, None, False, "unplugged"),
        ("always", 20.0, None, True, "start"),
    ],
)
def test_precondition_rules(when, outside, day_choice, plugged, reason):
    decision = decide_precondition(
        _day(precondition=day_choice),
        DEPARTURE - timedelta(minutes=5),
        when=when,
        minutes=20,
        cold_c=5.0,
        outside_c=outside,
        plugged=plugged,
        plugged_only=True,
        already_done_for=None,
    )
    assert decision.reason == reason
    assert decision.starts_at == DEPARTURE - timedelta(minutes=20)


def test_precondition_without_departure():
    decision = decide_precondition(
        None, NOW, when="always", minutes=20, cold_c=5, outside_c=0, plugged=True,
        plugged_only=True, already_done_for=None,
    )
    assert decision.reason == "no_departure"


async def test_an_inverted_pause_switch_and_an_input_boolean_work_too():
    options = {"ev_control_mode": "wallbox", "ev_switch_entity": "input_boolean.pause", "ev_switch_inverted": True}
    runtime = _Runtime({"input_boolean.pause": "off"}, options, plan=_plan(False), day=_day())
    await EvController(runtime).async_apply(NOW)
    assert runtime.hass.services.calls == [("input_boolean", "turn_on", {"entity_id": "input_boolean.pause"})]


async def test_an_unsupported_switch_domain_is_reported_not_called():
    options = {"ev_control_mode": "wallbox", "ev_switch_entity": "light.charger"}
    runtime = _Runtime({"light.charger": "on"}, options, plan=_plan(False), day=_day())
    ctl = EvController(runtime)
    await ctl.async_apply(NOW)
    assert runtime.hass.services.calls == []
    assert "unsupported" in ctl.as_dict()["error"]


async def test_user_target_is_written_into_the_car_before_a_charge():
    options = {"ev_charge_limit_entity": "number.limit", "ev_target_limit_pct": 100, "ev_set_car_limit": True}
    runtime = _Runtime({"number.limit": ("80", {"min": 50, "max": 100, "step": 10})}, options, plan=_plan(True), day=_day())
    runtime.user_target_limit = lambda: 100.0
    runtime.set_car_limit = lambda: True
    ctl = EvController(runtime)
    await ctl.async_apply(NOW)
    assert runtime.hass.services.calls == [("number", "set_value", {"entity_id": "number.limit", "value": 100.0})]
    # Not repeated while the car cloud has not answered.
    await ctl.async_apply(NOW + timedelta(minutes=2))
    assert len(runtime.hass.services.calls) == 1
    # The car put it back to 80 % after charging: set again at the next charge.
    await ctl.async_apply(NOW + timedelta(minutes=30))
    assert len(runtime.hass.services.calls) == 2


async def test_user_target_waits_for_a_charge_and_respects_the_step():
    options = {"ev_charge_limit_entity": "number.limit"}
    plan = SimpleNamespace(charge_now=False, next_start=NOW + timedelta(hours=3), slots=[SimpleNamespace(power_kw=0.0)])
    runtime = _Runtime({"number.limit": ("80", {"min": 50, "max": 100, "step": 10})}, options, plan=plan, day=_day())
    runtime.user_target_limit = lambda: 95.0
    runtime.set_car_limit = lambda: True
    ctl = EvController(runtime)
    await ctl.async_apply(NOW)
    assert runtime.hass.services.calls == []  # no charge soon
    plan.next_start = NOW + timedelta(minutes=10)
    await ctl.async_apply(NOW)
    assert runtime.hass.services.calls == [("number", "set_value", {"entity_id": "number.limit", "value": 100.0})]


async def test_user_target_is_not_written_without_the_switch():
    options = {"ev_charge_limit_entity": "number.limit"}
    runtime = _Runtime({"number.limit": "80"}, options, plan=_plan(True), day=_day())
    runtime.user_target_limit = lambda: 100.0
    runtime.set_car_limit = lambda: False
    await EvController(runtime).async_apply(NOW)
    assert runtime.hass.services.calls == []
