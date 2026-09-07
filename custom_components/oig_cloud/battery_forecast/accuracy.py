"""How good the forecast actually was.

Nothing in the system produced a number for this, so there was no way to tell
whether a change to the planner helped — and no way to decide later whether an
AI revision layer earns its keep. Everything here is pure: it reads the daily
archive (plan v0 plus measured actuals) and the intraday revisions, and returns
numbers. The sensor that publishes them is a thin wrapper.

Three figures per comparison, because they answer different questions:

* ``bias_pct`` — did we plan too much or too little over the whole day? This is
  what shows up as "the forecast doesn't match reality".
* ``mape_pct`` — how wrong was a typical slot, regardless of direction.
* ``mae_kwh`` — the same in kWh, which stays meaningful when consumption is low
  and percentages stop being.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Sequence

DATE_FMT = "%Y-%m-%d"
SLOTS_PER_DAY = 96

#: Below this a slot's percentage error is noise, so it is left out of MAPE.
#: It still counts towards absolute error and the daily totals.
MAPE_FLOOR_KWH = 0.01

_LOGGER = logging.getLogger(__name__)

_EMPTY_COMPARISON: Dict[str, Any] = {
    "mape_pct": None,
    "mae_kwh": None,
    "bias_pct": None,
    "planned_kwh": 0.0,
    "actual_kwh": 0.0,
    "slots": 0,
}


def _slot_values(rows: Any, field: str) -> List[Optional[float]]:
    """Normalise either a list of interval dicts or a bare series to 96 slots."""
    values: List[Optional[float]] = [None] * SLOTS_PER_DAY
    if not rows:
        return values
    for index, row in enumerate(rows):
        if isinstance(row, dict):
            slot = _slot_index(row.get("time")) if row.get("time") else index
            raw = row.get(field)
        else:
            slot, raw = index, row
        if slot is None or not 0 <= slot < SLOTS_PER_DAY or raw is None:
            continue
        try:
            values[slot] = float(raw)
        except (TypeError, ValueError):
            continue
    return values


def _slot_index(time_value: Any) -> Optional[int]:
    if not isinstance(time_value, str):
        return None
    try:
        if "T" in time_value:
            stamp = datetime.fromisoformat(time_value)
            hour, minute = stamp.hour, stamp.minute
        else:
            hour_str, _, minute_str = time_value.partition(":")
            hour, minute = int(hour_str), int(minute_str)
    except (TypeError, ValueError):
        return None
    if not 0 <= hour < 24:
        return None
    return hour * 4 + minute // 15


def compare_series(
    planned: Any, actual: Any, field: str = "consumption_kwh"
) -> Dict[str, Any]:
    """Score one forecast series against measurement, slot by slot."""
    planned_values = _slot_values(planned, field)
    actual_values = _slot_values(actual, field)

    paired = [
        (p, a)
        for p, a in zip(planned_values, actual_values)
        if p is not None and a is not None
    ]
    if not paired:
        return dict(_EMPTY_COMPARISON)

    planned_total = sum(p for p, _ in paired)
    actual_total = sum(a for _, a in paired)
    abs_errors = [abs(p - a) for p, a in paired]
    pct_errors = [
        abs(p - a) / a * 100.0 for p, a in paired if abs(a) >= MAPE_FLOOR_KWH
    ]

    return {
        "mape_pct": round(sum(pct_errors) / len(pct_errors), 1) if pct_errors else None,
        "mae_kwh": round(sum(abs_errors) / len(abs_errors), 4),
        "bias_pct": (
            round((planned_total - actual_total) / actual_total * 100.0, 1)
            if actual_total
            else None
        ),
        "planned_kwh": round(planned_total, 3),
        "actual_kwh": round(actual_total, 3),
        "slots": len(paired),
    }


def _day_type(day: date) -> str:
    return "weekend" if day.weekday() >= 5 else "weekday"


def naive_forecast(
    archive: Dict[str, Dict[str, Any]],
    target_day: date,
    lookback_days: int = 7,
) -> List[float]:
    """The laziest defensible prediction: this hour, averaged over similar days.

    Everything else — the adaptive profile, and later any AI revision — has to
    beat this to be worth running.
    """
    target_type = _day_type(target_day)
    earliest = target_day - timedelta(days=lookback_days * 2)

    per_slot: List[List[float]] = [[] for _ in range(SLOTS_PER_DAY)]
    matched = 0
    for date_str, entry in sorted(archive.items(), reverse=True):
        day = parse_date(date_str)
        if day is None or day >= target_day or day < earliest:
            continue
        if _day_type(day) != target_type:
            continue
        values = _slot_values(entry.get("actual"), "consumption_kwh")
        if all(value is None for value in values):
            continue
        matched += 1
        for slot, value in enumerate(values):
            if value is not None:
                per_slot[slot].append(value)
        if matched >= lookback_days:
            break

    if not matched:
        return []
    return [
        round(sum(values) / len(values), 4) if values else 0.0 for values in per_slot
    ]


def parse_date(date_str: str) -> Optional[date]:
    try:
        return datetime.strptime(date_str, DATE_FMT).date()
    except (TypeError, ValueError):
        return None


def _cost_totals(rows: Any) -> float:
    if not rows:
        return 0.0
    total = 0.0
    for row in rows:
        if not isinstance(row, dict):
            continue
        try:
            total += float(row.get("net_cost") or 0.0)
        except (TypeError, ValueError):
            continue
    return round(total, 2)


def day_report(
    archive_entry: Dict[str, Any],
    naive: Optional[Sequence[float]] = None,
) -> Dict[str, Any]:
    """Everything measurable about one finished day."""
    plan = archive_entry.get("plan") or []
    actual = archive_entry.get("actual") or []

    versions: List[Dict[str, Any]] = [
        {
            "version": 0,
            "created_at": archive_entry.get("created_at"),
            "consumption": compare_series(plan, actual),
        }
    ]
    for revision in archive_entry.get("revisions") or []:
        versions.append(
            {
                "version": revision.get("version"),
                "created_at": revision.get("created_at"),
                "consumption": compare_series(
                    revision.get("consumption_kwh"), actual
                ),
            }
        )

    report: Dict[str, Any] = {
        "date": archive_entry.get("date"),
        "complete": bool(archive_entry.get("locked")),
        "consumption": versions[0]["consumption"],
        "solar": compare_series(plan, actual, field="solar_kwh"),
        "cost": {
            "planned_czk": _cost_totals(plan),
            "actual_czk": _cost_totals(actual),
        },
        "versions": versions,
    }
    if naive:
        report["naive"] = compare_series(list(naive), actual)
    return report


def _mean(values: Iterable[Optional[float]]) -> Optional[float]:
    present = [value for value in values if value is not None]
    if not present:
        return None
    return round(sum(present) / len(present), 1)


def rolling_summary(
    archive: Dict[str, Dict[str, Any]],
    window_days: int,
    today: date,
) -> Dict[str, Any]:
    """Aggregate the day reports inside a window, for the sensor to publish."""
    earliest = today - timedelta(days=window_days)
    reports = [
        day_report(entry)
        for date_str, entry in sorted(archive.items())
        if (day := parse_date(date_str)) is not None and earliest <= day < today
    ]
    if not reports:
        return {
            "days": 0,
            "consumption_mape_pct": None,
            "consumption_bias_pct": None,
            "solar_bias_pct": None,
            "cost_delta_czk": None,
        }

    return {
        "days": len(reports),
        "consumption_mape_pct": _mean(r["consumption"]["mape_pct"] for r in reports),
        "consumption_bias_pct": _mean(r["consumption"]["bias_pct"] for r in reports),
        "solar_bias_pct": _mean(r["solar"]["bias_pct"] for r in reports),
        "cost_delta_czk": round(
            sum(r["cost"]["actual_czk"] - r["cost"]["planned_czk"] for r in reports), 2
        ),
    }
