"""Charge now / charge by, the calendar and their effect on the car's request."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from types import SimpleNamespace

from custom_components.oig_cloud.ev import runtime as ev_runtime
from custom_components.oig_cloud.ev.calendar import DAY_HOME, DAY_TRIP, DayOverride
from custom_components.oig_cloud.ev.charge_override import (
    MODE_BY,
    MODE_NOW,
    MODE_PLAN,
    ChargeOverride,
    make_override,
    override_need,
)
from custom_components.oig_cloud.ev.profile import EvProfile, WeekdayProfile
from custom_components.oig_cloud.ev.runtime import EvRuntime

TZ = timezone(timedelta(hours=1))
NOW = datetime(2026, 11, 16, 19, 40, tzinfo=TZ)  # Monday evening


def test_charge_now_lasts_until_departure_and_needs_back_to_back_slots():
    departure = datetime(2026, 11, 17, 10, 0, tzinfo=TZ)
    override = make_override(MODE_NOW, NOW, by=None, departure=departure)
    assert override.until == departure
    # 12 kWh missing at 11 kW = 5 quarter-hours from the 19:30 slot.
    need = override_need(override, NOW, soc_pct=42, limit_pct=90, capacity_kwh=25.0, max_power_kw=11.0)
    assert need.deadline == datetime(2026, 11, 16, 20, 45, tzinfo=TZ)
    assert need.need_pct == 90


def test_charge_now_without_departure_ends_within_a_day():
    override = make_override(MODE_NOW, NOW, by=None, departure=None)
    assert override.until == NOW + timedelta(hours=24)


def test_charge_by_needs_a_future_time():
    assert make_override(MODE_BY, NOW, by=NOW - timedelta(minutes=1), departure=None) is None
    by = datetime(2026, 11, 17, 5, 0, tzinfo=TZ)
    override = make_override(MODE_BY, NOW, by=by, departure=None)
    need = override_need(override, NOW, soc_pct=42, limit_pct=90, capacity_kwh=25.0, max_power_kw=11.0)
    assert need.deadline == by
    assert make_override(MODE_PLAN, NOW, by=by, departure=None) is None


def test_override_round_trip_and_garbage():
    override = make_override(MODE_NOW, NOW, by=None, departure=None)
    assert ChargeOverride.from_dict(override.as_dict()) == override
    assert ChargeOverride.from_dict({"mode": "now"}) is None
    assert ChargeOverride.from_dict({"mode": "plan"}) is None


# ── on the runtime ─────────────────────────────────────────────────────────


class _States:
    def __init__(self, values):
        self.values = values

    def get(self, entity_id):
        if entity_id not in self.values:
            return None
        return SimpleNamespace(state=self.values[entity_id], attributes={})


class _Store:
    def __init__(self, data=None):
        self.data = data
        self.saved = []

    async def async_load(self):
        return self.data

    async def async_save(self, data):
        self.saved.append(data)
        self.data = data


def _profile():
    profile = EvProfile()
    for wd in range(5):
        profile.weekdays[wd] = WeekdayProfile(wd, 40.0, 6, 12, 12)
    profile.weekdays[5] = WeekdayProfile(5, 30.0, 8, 12, 10)
    profile.weekdays[6] = WeekdayProfile(6, 15.0, 10, 12, 8)
    return profile


OPTIONS = {
    "ev_soc_entity": "sensor.soc",
    "ev_plugged_entity": "binary_sensor.plug",
    "ev_capacity_kwh": 25.0,
    "ev_max_power_kw": 11.0,
    "ev_charge_limit_pct": 90,
}


def _runtime(states=None, options=None, monkeypatch=None):
    values = {"sensor.soc": "42", "binary_sensor.plug": "on"}
    values.update(states or {})
    hass = SimpleNamespace(states=_States(values), data={})
    runtime = EvRuntime(hass, "entry", {**OPTIONS, **(options or {})})
    runtime.profile = _profile()
    runtime._store = _Store()
    replans = []
    runtime.request_replan = lambda: replans.append(1)
    if monkeypatch is not None:
        monkeypatch.setattr(ev_runtime, "start_background", lambda hass, coro, name=None: coro.close())
    return runtime, replans


def test_holiday_tomorrow_moves_the_departure_to_sunday_time():
    runtime, _ = _runtime()
    request = runtime.build_request(NOW)
    assert request.need.deadline == datetime(2026, 11, 17, 10, 0, tzinfo=TZ)
    assert runtime.next_day.source == "holiday"


async def test_charge_now_replans_and_changes_the_request():
    runtime, replans = _runtime()
    await runtime.async_set_charge_mode(MODE_NOW, now=NOW)
    assert replans == [1]
    assert runtime._store.saved[-1]["charge_override"]["mode"] == MODE_NOW
    request = runtime.build_request(NOW)
    assert request.need.deadline == datetime(2026, 11, 16, 20, 45, tzinfo=TZ)
    assert request.target_mode == "limit"


async def test_unplugging_ends_charge_now(monkeypatch):
    runtime, _ = _runtime(monkeypatch=monkeypatch)
    await runtime.async_set_charge_mode(MODE_NOW, now=NOW)
    runtime.build_request(NOW)
    runtime.hass.states.values["binary_sensor.plug"] = "off"
    runtime.build_request(NOW + timedelta(minutes=5))
    assert runtime.charge_override is None


async def test_charge_by_ends_at_its_time(monkeypatch):
    runtime, _ = _runtime(monkeypatch=monkeypatch)
    by = datetime(2026, 11, 16, 23, 0, tzinfo=TZ)
    await runtime.async_set_charge_mode(MODE_BY, by=by, now=NOW)
    assert runtime.build_request(NOW).need.deadline == by
    later = runtime.build_request(by + timedelta(minutes=1))
    assert runtime.charge_override is None
    assert later.need.deadline == datetime(2026, 11, 17, 10, 0, tzinfo=TZ)


async def test_home_day_and_trip_change_the_need():
    runtime, replans = _runtime()
    await runtime.async_set_day(date(2026, 11, 17), DayOverride(kind=DAY_HOME))
    assert runtime.build_request(NOW).need.deadline == datetime(2026, 11, 18, 6, 0, tzinfo=TZ)
    await runtime.async_set_day(date(2026, 11, 18), DayOverride(kind=DAY_TRIP, departure=time(5, 0)))
    request = runtime.build_request(NOW)
    assert request.need.deadline == datetime(2026, 11, 18, 5, 0, tzinfo=TZ)
    assert request.target_mode == "limit"
    assert request.charge_limit_pct == 90  # the integration may not raise the limit
    assert len(replans) == 2


async def test_trip_with_limit_raising_targets_100():
    runtime, _ = _runtime(options={"ev_raise_limit_for_trip": True})
    await runtime.async_set_day(date(2026, 11, 17), DayOverride(kind=DAY_TRIP))
    assert runtime.build_request(NOW).charge_limit_pct == 100.0


async def test_vacation_and_persistence():
    runtime, _ = _runtime()
    assert await runtime.async_add_vacation(date(2026, 11, 17), date(2026, 11, 20))
    assert runtime.build_request(NOW).need.deadline == datetime(2026, 11, 21, 8, 0, tzinfo=TZ)
    saved = runtime._store.saved[-1]

    again, _ = _runtime()
    again._store = _Store(saved)
    await again.async_load(now=NOW)
    assert again.calendar.vacations == [(date(2026, 11, 17), date(2026, 11, 20))]
    await again.async_remove_vacation(date(2026, 11, 17), date(2026, 11, 20))
    assert again.calendar.vacations == []
    assert not await again.async_add_vacation(date(2026, 11, 20), date(2026, 11, 17))


def test_live_options_win_over_the_setup_snapshot():
    runtime, _ = _runtime()
    entry = SimpleNamespace(options={**OPTIONS, "ev_holidays": False})
    runtime.hass.config_entries = SimpleNamespace(async_get_entry=lambda _id: entry)
    assert runtime.build_request(NOW).need.deadline == datetime(2026, 11, 17, 6, 0, tzinfo=TZ)


def test_summary_carries_calendar_state():
    runtime, _ = _runtime()
    runtime.build_request(NOW)
    summary = runtime.as_dict()
    assert summary["next_day"]["source"] == "holiday"
    assert summary["charge_override"] is None
    assert summary["vacations"] == []
