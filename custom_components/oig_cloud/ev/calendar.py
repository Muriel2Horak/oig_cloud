"""Which days the car leaves, and when: profile, Czech holidays, the user's days.

The weekday profile (``profile.EvProfile``) says when the car usually leaves.
On top of it:

* Czech public holidays count as a Sunday (the car keeps its day-off routine);
* the user can mark a vacation (no departure, the car only takes cheap PV);
* the user can override a single day: ``home`` (no departure), ``trip`` (a long
  drive: full charge by a given time), ``workday`` (leave as on a working day
  although it is a holiday) or ``dayoff`` (leave as on a Sunday);
* the user can ask to heat the car before a given day's departure, or not.

Everything here is pure; the runtime persists ``EvCalendarData``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Dict, List, Mapping, Optional, Tuple

from .profile import MIN_NEED_PCT, EvProfile, NextNeed

DAY_HOME = "home"
DAY_TRIP = "trip"
DAY_WORKDAY = "workday"
DAY_DAYOFF = "dayoff"
DAY_KINDS = (DAY_HOME, DAY_TRIP, DAY_WORKDAY, DAY_DAYOFF)

SUNDAY = 6
# A working day the profile has no departure for falls back to Monday's.
_WORKDAY_FALLBACK = 0
# Days a vacation may span (a typo like 2062 must not freeze the car).
MAX_VACATION_DAYS = 62


def _easter_sunday(year: int) -> date:
    """Gregorian Easter (anonymous algorithm, Meeus/Jones/Butcher)."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    ell = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * ell) // 451
    month, day = divmod(h + ell - 7 * m + 114, 31)
    return date(year, month, day + 1)


def czech_holidays(year: int) -> Dict[date, str]:
    """Czech public holidays (zákon č. 245/2000 Sb.)."""
    easter = _easter_sunday(year)
    days = {
        date(year, 1, 1): "Nový rok, Den obnovy samostatného českého státu",
        easter - timedelta(days=2): "Velký pátek",
        easter + timedelta(days=1): "Velikonoční pondělí",
        date(year, 5, 1): "Svátek práce",
        date(year, 5, 8): "Den vítězství",
        date(year, 7, 5): "Den slovanských věrozvěstů Cyrila a Metoděje",
        date(year, 7, 6): "Den upálení mistra Jana Husa",
        date(year, 9, 28): "Den české státnosti",
        date(year, 10, 28): "Den vzniku samostatného československého státu",
        date(year, 11, 17): "Den boje za svobodu a demokracii",
        date(year, 12, 24): "Štědrý den",
        date(year, 12, 25): "1. svátek vánoční",
        date(year, 12, 26): "2. svátek vánoční",
    }
    return dict(sorted(days.items()))


def holiday_name(day: date) -> Optional[str]:
    return czech_holidays(day.year).get(day)


def _parse_time(raw: object) -> Optional[time]:
    if isinstance(raw, time):
        return raw
    try:
        hours, minutes = str(raw).split(":")[:2]
        return time(int(hours), int(minutes))
    except (TypeError, ValueError):
        return None


@dataclass(frozen=True)
class DayOverride:
    kind: Optional[str] = None          # one of DAY_KINDS, None = as planned
    departure: Optional[time] = None    # trip departure (else the profile's)
    precondition: Optional[bool] = None  # heat before departure: yes/no/default

    def as_dict(self) -> dict:
        return {
            "kind": self.kind,
            "departure": self.departure.strftime("%H:%M") if self.departure else None,
            "precondition": self.precondition,
        }

    @property
    def empty(self) -> bool:
        return self.kind is None and self.departure is None and self.precondition is None


@dataclass
class EvCalendarData:
    days: Dict[date, DayOverride] = field(default_factory=dict)
    vacations: List[Tuple[date, date]] = field(default_factory=list)

    # ── persistence ──────────────────────────────────────────────────────
    def as_dict(self) -> dict:
        return {
            "days": {d.isoformat(): o.as_dict() for d, o in sorted(self.days.items())},
            "vacations": [[a.isoformat(), b.isoformat()] for a, b in self.vacations],
        }

    @classmethod
    def from_dict(cls, raw: Mapping[str, object] | None) -> "EvCalendarData":
        data = cls()
        if not isinstance(raw, Mapping):
            return data
        days = raw.get("days")
        if isinstance(days, Mapping):
            for key, value in days.items():
                try:
                    day = date.fromisoformat(str(key))
                except ValueError:
                    continue
                if not isinstance(value, Mapping):
                    continue
                kind = value.get("kind")
                override = DayOverride(
                    kind=kind if kind in DAY_KINDS else None,
                    departure=_parse_time(value.get("departure")) if value.get("departure") else None,
                    precondition=(
                        bool(value["precondition"])
                        if value.get("precondition") is not None
                        else None
                    ),
                )
                if not override.empty:
                    data.days[day] = override
        vacations = raw.get("vacations")
        if isinstance(vacations, list):
            for item in vacations:
                try:
                    start, end = (date.fromisoformat(str(x)) for x in item)
                except (TypeError, ValueError):
                    continue
                data.add_vacation(start, end)
        return data

    # ── edits ────────────────────────────────────────────────────────────
    def set_day(self, day: date, override: DayOverride) -> None:
        if override.empty:
            self.days.pop(day, None)
        else:
            self.days[day] = override

    def add_vacation(self, start: date, end: date) -> bool:
        if end < start or (end - start).days >= MAX_VACATION_DAYS:
            return False
        if (start, end) not in self.vacations:
            self.vacations.append((start, end))
            self.vacations.sort()
        return True

    def remove_vacation(self, start: date, end: date) -> None:
        self.vacations = [v for v in self.vacations if v != (start, end)]

    def prune(self, today: date) -> None:
        """Forget days and vacations that are over."""
        self.days = {d: o for d, o in self.days.items() if d >= today}
        self.vacations = [(a, b) for a, b in self.vacations if b >= today]

    def on_vacation(self, day: date) -> Optional[Tuple[date, date]]:
        for start, end in self.vacations:
            if start <= day <= end:
                return start, end
        return None


@dataclass(frozen=True)
class EvDay:
    """What the planner expects of one day."""

    day: date
    source: str                   # profile|holiday|vacation|home|trip|workday|dayoff
    departure: Optional[datetime]  # None = the car does not leave
    need_pct: float               # usual use that day (profile p80); trip = 100
    full_charge: bool = False     # trip: charge to 100 % (if the limit allows)
    holiday: Optional[str] = None
    precondition: Optional[bool] = None  # the user's choice for that day

    def as_dict(self) -> dict:
        return {
            "date": self.day.isoformat(),
            "source": self.source,
            "departure": self.departure.isoformat() if self.departure else None,
            "need_pct": round(self.need_pct, 1),
            "full_charge": self.full_charge,
            "holiday": self.holiday,
            "precondition": self.precondition,
        }


def _profile_departure(
    profile: Optional[EvProfile], weekday: int
) -> Tuple[Optional[int], float]:
    if profile is None:
        return None, 0.0
    entry = profile.weekdays.get(weekday)
    if entry is None:
        return None, 0.0
    return entry.departure_hour, entry.need_pct


def resolve_day(
    profile: Optional[EvProfile],
    day: date,
    calendar: Optional[EvCalendarData],
    *,
    tzinfo: object = None,
    trip_departure: time = time(7, 0),
    holidays_enabled: bool = True,
) -> EvDay:
    calendar = calendar or EvCalendarData()
    override = calendar.days.get(day, DayOverride())
    holiday = holiday_name(day) if holidays_enabled else None

    def at(hour_or_time: "time | int") -> datetime:
        when = hour_or_time if isinstance(hour_or_time, time) else time(int(hour_or_time), 0)
        return datetime.combine(day, when, tzinfo=tzinfo)  # type: ignore[arg-type]

    if override.kind == DAY_HOME:
        return EvDay(day, DAY_HOME, None, 0.0, holiday=holiday, precondition=override.precondition)
    if override.kind == DAY_TRIP:
        return EvDay(
            day, DAY_TRIP, at(override.departure or trip_departure), 100.0, full_charge=True,
            holiday=holiday, precondition=override.precondition,
        )
    if override.kind is None and calendar.on_vacation(day):
        return EvDay(day, "vacation", None, 0.0, holiday=holiday, precondition=override.precondition)

    weekday = day.weekday()
    source = "profile"
    if override.kind == DAY_DAYOFF or (override.kind is None and holiday):
        weekday, source = SUNDAY, (DAY_DAYOFF if override.kind else "holiday")
    elif override.kind == DAY_WORKDAY:
        source = DAY_WORKDAY
        if weekday >= 5:
            weekday = _WORKDAY_FALLBACK
    hour, need = _profile_departure(profile, weekday)
    if override.kind == DAY_WORKDAY and hour is None:
        hour, need = _profile_departure(profile, _WORKDAY_FALLBACK)
    departure: Optional[datetime] = None
    if override.departure is not None:
        departure = at(override.departure)
    elif hour is not None:
        departure = at(hour)
    return EvDay(
        day, source, departure, need, holiday=holiday, precondition=override.precondition
    )


def upcoming_days(
    profile: Optional[EvProfile],
    now: datetime,
    calendar: Optional[EvCalendarData],
    *,
    days: int = 14,
    trip_departure: time = time(7, 0),
    holidays_enabled: bool = True,
) -> List[EvDay]:
    start = now.date()
    return [
        resolve_day(
            profile,
            start + timedelta(days=offset),
            calendar,
            tzinfo=now.tzinfo,
            trip_departure=trip_departure,
            holidays_enabled=holidays_enabled,
        )
        for offset in range(days)
    ]


def next_departure_day(
    profile: Optional[EvProfile],
    now: datetime,
    calendar: Optional[EvCalendarData],
    *,
    min_need_pct: float = MIN_NEED_PCT,
    days_ahead: int = 8,
    trip_departure: time = time(7, 0),
    holidays_enabled: bool = True,
) -> Optional[EvDay]:
    """The next day the car leaves and has to be charged for."""
    for day in upcoming_days(
        profile, now, calendar, days=days_ahead,
        trip_departure=trip_departure, holidays_enabled=holidays_enabled,
    ):
        if day.departure is None or day.departure <= now:
            continue
        if not day.full_charge and day.need_pct < min_need_pct:
            continue
        return day
    return None


def need_for(day: Optional[EvDay]) -> Optional[NextNeed]:
    if day is None or day.departure is None:
        return None
    return NextNeed(deadline=day.departure, need_pct=day.need_pct, weekday=day.day.weekday())
