"""Departures from the profile, Czech holidays, vacations and the user's days."""

from __future__ import annotations

from datetime import date, datetime, time, timezone

from custom_components.oig_cloud.ev.calendar import (
    DAY_DAYOFF,
    DAY_HOME,
    DAY_TRIP,
    DAY_WORKDAY,
    DayOverride,
    EvCalendarData,
    czech_holidays,
    need_for,
    next_departure_day,
    resolve_day,
    upcoming_days,
)
from custom_components.oig_cloud.ev.profile import EvProfile, WeekdayProfile

TZ = timezone.utc


def _profile() -> EvProfile:
    profile = EvProfile()
    for wd in range(5):
        profile.weekdays[wd] = WeekdayProfile(wd, 40.0, 6, 12, 12)
    profile.weekdays[5] = WeekdayProfile(5, 30.0, 8, 12, 10)
    profile.weekdays[6] = WeekdayProfile(6, 15.0, 10, 12, 8)
    return profile


def test_czech_holidays_include_easter_and_fixed_days():
    days = czech_holidays(2026)
    assert date(2026, 4, 3) in days  # Velký pátek 2026
    assert date(2026, 4, 6) in days  # Velikonoční pondělí 2026
    assert date(2026, 11, 17) in days
    assert date(2026, 12, 24) in days
    assert len(days) == 13
    assert date(2027, 3, 26) in czech_holidays(2027)  # Velký pátek 2027


def test_a_holiday_is_planned_like_a_sunday():
    day = resolve_day(_profile(), date(2026, 11, 17), None, tzinfo=TZ)  # Tuesday
    assert day.source == "holiday"
    assert day.departure == datetime(2026, 11, 17, 10, 0, tzinfo=TZ)
    assert day.need_pct == 15.0
    assert day.holiday


def test_workday_override_restores_the_weekday_profile_on_a_holiday():
    cal = EvCalendarData()
    cal.set_day(date(2026, 11, 17), DayOverride(kind=DAY_WORKDAY))
    day = resolve_day(_profile(), date(2026, 11, 17), cal, tzinfo=TZ)
    assert day.source == DAY_WORKDAY
    assert day.departure.hour == 6
    assert day.need_pct == 40.0


def test_workday_override_on_a_saturday_uses_monday():
    cal = EvCalendarData()
    cal.set_day(date(2026, 11, 21), DayOverride(kind=DAY_WORKDAY))
    assert resolve_day(_profile(), date(2026, 11, 21), cal, tzinfo=TZ).departure.hour == 6


def test_dayoff_override_makes_a_weekday_a_sunday():
    cal = EvCalendarData()
    cal.set_day(date(2026, 11, 18), DayOverride(kind=DAY_DAYOFF))
    day = resolve_day(_profile(), date(2026, 11, 18), cal, tzinfo=TZ)
    assert day.departure.hour == 10


def test_vacation_and_home_days_have_no_departure():
    cal = EvCalendarData()
    assert cal.add_vacation(date(2026, 11, 23), date(2026, 11, 27))
    cal.set_day(date(2026, 11, 19), DayOverride(kind=DAY_HOME))
    assert resolve_day(_profile(), date(2026, 11, 25), cal).departure is None
    assert resolve_day(_profile(), date(2026, 11, 25), cal).source == "vacation"
    assert resolve_day(_profile(), date(2026, 11, 19), cal).source == DAY_HOME


def test_a_day_override_wins_over_the_vacation():
    cal = EvCalendarData()
    cal.add_vacation(date(2026, 11, 23), date(2026, 11, 27))
    cal.set_day(date(2026, 11, 27), DayOverride(kind=DAY_TRIP, departure=time(5, 0)))
    day = resolve_day(_profile(), date(2026, 11, 27), cal, tzinfo=TZ)
    assert day.full_charge and day.need_pct == 100.0
    assert day.departure == datetime(2026, 11, 27, 5, 0, tzinfo=TZ)


def test_trip_without_time_uses_the_default_trip_departure():
    cal = EvCalendarData()
    cal.set_day(date(2026, 11, 20), DayOverride(kind=DAY_TRIP))
    day = resolve_day(_profile(), date(2026, 11, 20), cal, tzinfo=TZ, trip_departure=time(6, 30))
    assert day.departure.time() == time(6, 30)


def test_vacation_bounds_are_checked():
    cal = EvCalendarData()
    assert not cal.add_vacation(date(2026, 11, 27), date(2026, 11, 23))
    assert not cal.add_vacation(date(2026, 11, 1), date(2027, 11, 1))


def test_next_departure_skips_vacation_and_past_departures():
    cal = EvCalendarData()
    cal.add_vacation(date(2026, 11, 18), date(2026, 11, 20))
    now = datetime(2026, 11, 17, 12, 0, tzinfo=TZ)  # after the holiday's 10:00
    day = next_departure_day(_profile(), now, cal)
    assert day.day == date(2026, 11, 21)  # Saturday after the vacation
    need = need_for(day)
    assert need.deadline == datetime(2026, 11, 21, 8, 0, tzinfo=TZ)
    assert need.need_pct == 30.0


def test_a_trip_counts_even_on_a_day_with_tiny_use():
    profile = _profile()
    profile.weekdays[2] = WeekdayProfile(2, 1.0, 6, 12, 1)
    cal = EvCalendarData()
    cal.set_day(date(2026, 11, 18), DayOverride(kind=DAY_TRIP))
    now = datetime(2026, 11, 17, 12, 0, tzinfo=TZ)
    assert next_departure_day(profile, now, cal).day == date(2026, 11, 18)


def test_holidays_can_be_switched_off():
    day = resolve_day(_profile(), date(2026, 11, 17), None, tzinfo=TZ, holidays_enabled=False)
    assert day.source == "profile" and day.departure.hour == 6


def test_round_trip_and_prune():
    cal = EvCalendarData()
    cal.add_vacation(date(2026, 11, 23), date(2026, 11, 27))
    cal.set_day(date(2026, 11, 18), DayOverride(kind=DAY_TRIP, departure=time(5, 0), precondition=True))
    cal.set_day(date(2026, 11, 10), DayOverride(kind=DAY_HOME))
    again = EvCalendarData.from_dict(cal.as_dict())
    assert again.as_dict() == cal.as_dict()
    again.prune(date(2026, 11, 16))
    assert date(2026, 11, 10) not in again.days
    assert again.days[date(2026, 11, 18)].precondition is True
    # Clearing every field drops the day.
    again.set_day(date(2026, 11, 18), DayOverride())
    assert date(2026, 11, 18) not in again.days


def test_garbage_is_ignored_when_loading():
    cal = EvCalendarData.from_dict({"days": {"x": {}, "2026-11-18": {"kind": "bogus"}}, "vacations": [["a"]]})
    assert cal.days == {} and cal.vacations == []


def test_upcoming_days_lists_two_weeks():
    days = upcoming_days(_profile(), datetime(2026, 11, 16, 8, 0, tzinfo=TZ), None)
    assert len(days) == 14
    assert days[1].source == "holiday"
    assert days[0].as_dict()["date"] == "2026-11-16"
