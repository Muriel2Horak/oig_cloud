"""EV usage profile from hourly SoC statistics."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from custom_components.oig_cloud.ev.profile import (
    HourlySoc,
    build_ev_profile,
    estimate_capacity_kwh,
    next_need,
)

TZ = timezone(timedelta(hours=1))


def _day(start: datetime, soc_by_hour: dict[int, float], *, default: float) -> list[HourlySoc]:
    """24 hourly rows; soc_by_hour sets the min of an hour, later hours keep it."""
    rows = []
    level = default
    for hour in range(24):
        if hour in soc_by_hour:
            level = soc_by_hour[hour]
        rows.append(HourlySoc(start=start + timedelta(hours=hour), min_pct=level, max_pct=level))
    return rows


def _weeks(n_weeks: int, weekday_plan: dict[int, dict[int, float]]) -> list[HourlySoc]:
    """Each day starts at 100 %; weekday_plan[weekday] = {hour: soc after a drive}."""
    rows: list[HourlySoc] = []
    monday = datetime(2026, 9, 7, tzinfo=TZ)  # a Monday
    for week in range(n_weeks):
        for weekday in range(7):
            start = monday + timedelta(days=7 * week + weekday)
            rows += _day(start, weekday_plan.get(weekday, {}), default=100.0)
    return rows


def test_weekday_departure_hour_and_need_from_drops():
    # Workdays: leave in hour 7 and come back at 17 having used 40 %.
    workday = {7: 80.0, 17: 60.0}
    rows = _weeks(4, {d: workday for d in range(5)})

    profile = build_ev_profile(rows)

    monday = profile.weekdays[0]
    assert monday.departure_hour == 7
    assert monday.need_pct == pytest.approx(40.0)
    assert monday.samples == 4
    # Weekend: the car stays home.
    assert profile.weekdays[6].need_pct == pytest.approx(0.0)
    assert profile.weekdays[6].departure_hour is None


def test_need_is_the_80th_percentile_of_days():
    # Four Mondays: 10, 20, 30 and 90 % used.
    rows: list[HourlySoc] = []
    monday = datetime(2026, 9, 7, tzinfo=TZ)
    for week, used in enumerate([10.0, 20.0, 30.0, 90.0]):
        start = monday + timedelta(days=7 * week)
        rows += _day(start, {8: 100.0 - used}, default=100.0)
    profile = build_ev_profile(rows)

    assert profile.weekdays[0].need_pct == pytest.approx(30.0 + 0.4 * 60.0)


def test_departure_is_the_early_quartile_of_drive_starts():
    rows: list[HourlySoc] = []
    monday = datetime(2026, 9, 7, tzinfo=TZ)
    for week, hour in enumerate([6, 7, 7, 9]):
        start = monday + timedelta(days=7 * week)
        rows += _day(start, {hour: 50.0}, default=100.0)
    profile = build_ev_profile(rows)

    assert profile.weekdays[0].departure_hour == 6


def test_charging_hours_and_small_wobbles_are_not_drives():
    monday = datetime(2026, 9, 7, tzinfo=TZ)
    rows = _day(monday, {3: 40.0, 4: 99.0, 10: 98.0}, default=40.0)
    # Hour 3 is low because it starts at 40 and charges up in hour 4: the 1 %
    # wobble at 10 is a reading, not a drive.
    profile = build_ev_profile(rows, charging_hours={monday + timedelta(hours=4)})

    assert profile.weekdays[0].need_pct == pytest.approx(0.0)


def test_days_with_too_few_rows_are_skipped():
    monday = datetime(2026, 9, 7, tzinfo=TZ)
    rows = _day(monday, {8: 50.0}, default=100.0)[:10]
    profile = build_ev_profile(rows)

    assert profile.weekdays[0].samples == 0


def test_next_need_picks_the_next_departure_with_a_real_need():
    workday = {7: 70.0}
    rows = _weeks(3, {d: workday for d in range(5)})
    profile = build_ev_profile(rows)

    # Friday evening: Saturday and Sunday have no drive, Monday 07:00 does.
    friday_evening = datetime(2026, 11, 13, 20, 0, tzinfo=TZ)
    need = next_need(profile, friday_evening)

    assert need is not None
    assert need.deadline == datetime(2026, 11, 16, 7, 0, tzinfo=TZ)
    assert need.need_pct == pytest.approx(30.0)


def test_next_need_skips_a_departure_that_already_passed_today():
    rows = _weeks(3, {d: {7: 70.0} for d in range(7)})
    profile = build_ev_profile(rows)
    after = datetime(2026, 11, 16, 7, 30, tzinfo=TZ)  # Monday after departure

    need = next_need(profile, after)

    assert need is not None
    assert need.deadline == datetime(2026, 11, 17, 7, 0, tzinfo=TZ)


def test_next_need_is_none_without_history():
    assert next_need(build_ev_profile([]), datetime(2026, 11, 16, tzinfo=TZ)) is None


def test_capacity_from_charging_energy_against_soc_rise():
    start = datetime(2026, 11, 8, 10, tzinfo=TZ)
    soc = [
        HourlySoc(start=start, min_pct=10.0, max_pct=10.0),
        HourlySoc(start=start + timedelta(hours=1), min_pct=10.0, max_pct=55.0),
        HourlySoc(start=start + timedelta(hours=2), min_pct=55.0, max_pct=98.0),
    ]
    charge_kw = {
        start + timedelta(hours=1): 11.0,
        start + timedelta(hours=2): 10.5,
    }

    assert estimate_capacity_kwh(soc, charge_kw) == pytest.approx(21.5 / 88.0 * 100.0)


def test_capacity_is_none_without_charging():
    start = datetime(2026, 11, 8, 10, tzinfo=TZ)
    soc = [HourlySoc(start=start, min_pct=10.0, max_pct=10.0)]
    assert estimate_capacity_kwh(soc, {}) is None
