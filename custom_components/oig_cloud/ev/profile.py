"""When the car leaves and how much it uses, learned from its SoC history.

Home Assistant keeps state history for about ten days, but hourly statistics of
the car's SoC sensor for as long as the sensor exists (on the reference install
since 3/2025). The profile is therefore built from hourly min/max rows:

* a **drive** is an hour whose minimum SoC is lower than the previous hour's by
  at least ``MIN_DRIVE_DROP_PCT`` while the car is not charging;
* a day's **use** is the sum of its drive drops;
* the **departure** of a day is the start of its first drive hour.

Per weekday the need is the 80th percentile of daily use (a PHEV that runs out
falls back to fuel, so covering four days of five is the default trade-off) and
the departure is the early quartile of drive starts: planning to the earlier
departure costs at most a slot of price, missing it costs the whole charge.

Pure: rows in, dataclasses out.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Mapping, Optional, Sequence, Set

# A drop smaller than this is the car re-reporting its SoC, not a drive: the
# reference car's readings wobble by 1 % while parked.
MIN_DRIVE_DROP_PCT = 2.0
# A day needs most of its hours to say anything about its use.
MIN_ROWS_PER_DAY = 20
# Share of days the planned charge should cover (see module docstring).
NEED_PERCENTILE = 0.8
# Early quartile of the drive starts: the departure the plan aims at.
DEPARTURE_PERCENTILE = 0.25
# A weekday whose need is below this is a day the car usually stays home.
MIN_NEED_PCT = 5.0
# Above this the charger tapers, so an hour there says nothing about capacity.
CAPACITY_TAPER_PCT = 99.0
# An hour charging at less than this is mostly idle.
CAPACITY_MIN_CHARGE_KW = 1.0


@dataclass(frozen=True)
class HourlySoc:
    """One hourly statistics row of the car's SoC sensor (local time)."""

    start: datetime
    min_pct: float
    max_pct: float


@dataclass(frozen=True)
class WeekdayProfile:
    weekday: int
    need_pct: float
    departure_hour: Optional[int]
    samples: int
    drive_days: int = 0


@dataclass
class EvProfile:
    weekdays: Dict[int, WeekdayProfile] = field(default_factory=dict)

    @property
    def total_samples(self) -> int:
        return sum(day.samples for day in self.weekdays.values())

    def as_dict(self) -> dict:
        return {
            str(day.weekday): {
                "need_pct": round(day.need_pct, 1),
                "departure_hour": day.departure_hour,
                "samples": day.samples,
                "drive_days": day.drive_days,
            }
            for day in self.weekdays.values()
        }


@dataclass(frozen=True)
class NextNeed:
    deadline: datetime
    need_pct: float
    weekday: int


def _percentile(values: Sequence[float], p: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return 0.0
    position = p * (len(ordered) - 1)
    low = math.floor(position)
    high = min(low + 1, len(ordered) - 1)
    return ordered[low] + (position - low) * (ordered[high] - ordered[low])


def build_ev_profile(
    rows: Iterable[HourlySoc],
    *,
    charging_hours: Optional[Set[datetime]] = None,
) -> EvProfile:
    """Per-weekday need and departure from hourly SoC rows."""
    charging = charging_hours or set()
    ordered = sorted(rows, key=lambda row: row.start)
    use: Dict[object, float] = {}
    first_drive: Dict[object, int] = {}
    row_count: Dict[object, int] = {}

    previous: Optional[HourlySoc] = None
    for row in ordered:
        day = row.start.date()
        row_count[day] = row_count.get(day, 0) + 1
        use.setdefault(day, 0.0)
        if (
            previous is not None
            and row.start - previous.start == timedelta(hours=1)
            and row.start not in charging
        ):
            drop = previous.min_pct - row.min_pct
            if drop >= MIN_DRIVE_DROP_PCT:
                use[day] += drop
                first_drive.setdefault(day, row.start.hour)
        previous = row

    per_weekday_use: Dict[int, List[float]] = {d: [] for d in range(7)}
    per_weekday_departures: Dict[int, List[int]] = {d: [] for d in range(7)}
    for day, used in use.items():
        if row_count.get(day, 0) < MIN_ROWS_PER_DAY:
            continue
        weekday = day.weekday()  # type: ignore[attr-defined]
        per_weekday_use[weekday].append(used)
        if day in first_drive:
            per_weekday_departures[weekday].append(first_drive[day])

    profile = EvProfile()
    for weekday in range(7):
        uses = per_weekday_use[weekday]
        departures = per_weekday_departures[weekday]
        profile.weekdays[weekday] = WeekdayProfile(
            weekday=weekday,
            need_pct=min(100.0, _percentile(uses, NEED_PERCENTILE)) if uses else 0.0,
            departure_hour=(
                int(math.floor(_percentile(departures, DEPARTURE_PERCENTILE)))
                if departures
                else None
            ),
            samples=len(uses),
            drive_days=len(departures),
        )
    return profile


def next_need(
    profile: EvProfile,
    now: datetime,
    *,
    min_need_pct: float = MIN_NEED_PCT,
    days_ahead: int = 8,
) -> Optional[NextNeed]:
    """The next departure the car has to be charged for, if any."""
    for offset in range(days_ahead):
        day = (now + timedelta(days=offset)).date()
        weekday = day.weekday()
        entry = profile.weekdays.get(weekday)
        if entry is None or entry.departure_hour is None or entry.need_pct < min_need_pct:
            continue
        deadline = now.replace(
            year=day.year,
            month=day.month,
            day=day.day,
            hour=entry.departure_hour,
            minute=0,
            second=0,
            microsecond=0,
        )
        if deadline <= now:
            continue
        return NextNeed(deadline=deadline, need_pct=entry.need_pct, weekday=weekday)
    return None


def estimate_capacity_kwh(
    rows: Iterable[HourlySoc], charge_kw_by_hour: Mapping[datetime, float]
) -> Optional[float]:
    """Charger kWh per 100 % SoC, from hours that charged below the taper.

    The figure is on the charger's side, so it already holds the charging
    losses: it is the energy the plan has to buy for a given SoC rise.
    """
    ordered = sorted(rows, key=lambda row: row.start)
    rise = 0.0
    energy = 0.0
    for previous, row in zip(ordered, ordered[1:]):
        if row.start - previous.start != timedelta(hours=1):
            continue
        charged = float(charge_kw_by_hour.get(row.start, 0.0) or 0.0)
        if charged <= CAPACITY_MIN_CHARGE_KW or row.max_pct >= CAPACITY_TAPER_PCT:
            continue
        gained = row.max_pct - previous.max_pct
        if gained > 0:
            rise += gained
            energy += charged
    if rise <= 0:
        return None
    return energy / rise * 100.0
