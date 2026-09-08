"""What the boiler actually did, against what it said it would.

The boiler module publishes a plan and nothing else — no adherence, no
archive, no plan-versus-actual anywhere. That is the whole difference from the
Ceny tab, which shows a plan and the day running against it.

Two things make this harder than it looks for the boiler:

* The published plan is a **rolling** 24 hours (created 11:55, valid to 11:45
  tomorrow), not a day. A target that moves every cycle cannot be adhered to,
  so the day gets a baseline snapshotted once and then left alone.
* A slot can start on PV and finish on grid. It is recorded as whichever
  source delivered most of its kWh; taking the first or the last would let
  adherence flatter itself.

Everything here is pure — datetimes in, dicts out — so the accounting can be
tested without Home Assistant.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional, Sequence

SLOTS_PER_DAY = 96
SLOT_MINUTES = 15

#: Below this a slot did not really heat; it is idle for adherence purposes.
HEATING_EPS_KWH = 1e-4


def slot_index(when: datetime) -> int:
    """Index of the quarter-hour this moment falls in."""
    return when.hour * 4 + when.minute // SLOT_MINUTES


def slot_time(index: int) -> str:
    return f"{index // 4:02d}:{(index % 4) * SLOT_MINUTES:02d}"


def _plan_slot_index(raw_start: Any, day: date) -> Optional[int]:
    if not isinstance(raw_start, str) or not raw_start:
        return None
    try:
        stamp = datetime.fromisoformat(raw_start)
    except ValueError:
        return None
    if stamp.date() != day:
        return None
    return slot_index(stamp)


def snapshot_plan(plan_slots: Sequence[Dict[str, Any]], day: date) -> List[Dict[str, Any]]:
    """Reduce the rolling plan to a fixed baseline for one day.

    Slots the rolling plan does not reach are left open rather than zeroed: a
    baseline taken at noon knows nothing about the morning, and a zero there
    would later read as a day followed perfectly.
    """
    baseline: List[Dict[str, Any]] = [
        {
            "time": slot_time(index),
            "heating_kwh": None,
            "source": None,
            "cost_czk": None,
            "predicted_top_temp_c": None,
        }
        for index in range(SLOTS_PER_DAY)
    ]

    for raw in plan_slots or []:
        if not isinstance(raw, dict):
            continue
        index = _plan_slot_index(raw.get("start"), day)
        if index is None:
            continue
        baseline[index].update(
            {
                "heating_kwh": _as_float(raw.get("heating_kwh")),
                "source": raw.get("recommended_source"),
                "cost_czk": _as_float(raw.get("estimated_cost_czk")),
                "predicted_top_temp_c": _as_float(raw.get("predicted_top_temp_c")),
            }
        )
    return baseline


def _as_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def empty_actual() -> List[Dict[str, Any]]:
    """A day of unmeasured slots."""
    return [
        {
            "time": slot_time(index),
            "heating_kwh": None,
            "source": None,
            "top_temp_c": None,
            "by_source_kwh": {},
        }
        for index in range(SLOTS_PER_DAY)
    ]


def accumulate(
    actual: List[Dict[str, Any]],
    when: datetime,
    *,
    heating_kwh: float,
    source: Optional[str],
    top_temp_c: Optional[float],
) -> None:
    """Add one measurement into the slot it happened in."""
    index = slot_index(when)
    if not 0 <= index < len(actual):
        return
    slot = actual[index]

    energy = max(0.0, float(heating_kwh or 0.0))
    slot["heating_kwh"] = round((slot["heating_kwh"] or 0.0) + energy, 6)
    if top_temp_c is not None:
        slot["top_temp_c"] = float(top_temp_c)

    if source and energy > 0.0:
        by_source = slot["by_source_kwh"]
        by_source[source] = round(by_source.get(source, 0.0) + energy, 6)
        # Whichever source delivered most of the slot's energy owns the slot.
        slot["source"] = max(by_source, key=lambda key: by_source[key])


def _heated(slot: Dict[str, Any]) -> bool:
    value = slot.get("heating_kwh")
    return value is not None and value > HEATING_EPS_KWH


def compare(
    plan: Sequence[Dict[str, Any]], actual: Sequence[Dict[str, Any]]
) -> Dict[str, Any]:
    """Pair the baseline with the measured day, slot by slot."""
    slots: List[Dict[str, Any]] = []
    matched = 0
    relevant = 0
    planned_total = 0.0
    actual_total = 0.0

    for index in range(SLOTS_PER_DAY):
        planned = dict(plan[index]) if index < len(plan) else {}
        measured = dict(actual[index]) if index < len(actual) else {}
        measured.pop("by_source_kwh", None)

        completed = measured.get("heating_kwh") is not None
        planned_kwh = planned.get("heating_kwh")
        actual_kwh = measured.get("heating_kwh")
        planned_total += planned_kwh or 0.0
        actual_total += actual_kwh or 0.0

        source_match: Optional[bool] = None
        # Idle slots matching idle slots say nothing: eighty-five of them would
        # report near-perfect adherence to a day where nothing was attempted.
        if completed and (_heated(planned) or _heated(measured)):
            relevant += 1
            source_match = planned.get("source") == measured.get("source")
            if source_match:
                matched += 1

        slots.append(
            {
                "time": slot_time(index),
                "status": "historical" if completed else "planned",
                "planned": planned,
                "actual": measured if completed else None,
                "source_match": source_match,
                "delta_kwh": (
                    round((actual_kwh or 0.0) - (planned_kwh or 0.0), 4)
                    if completed
                    else None
                ),
            }
        )

    return {
        "slots": slots,
        "completed_slots": sum(1 for s in slots if s["status"] == "historical"),
        "adherence_pct": round(matched / relevant * 100.0, 1) if relevant else None,
        "energy": {
            "planned_kwh": round(planned_total, 3),
            "actual_kwh": round(actual_total, 3),
            "delta_kwh": round(actual_total - planned_total, 3),
        },
    }


def eod_estimate(
    plan: Sequence[Dict[str, Any]],
    actual: Sequence[Dict[str, Any]],
    now: datetime,
) -> Dict[str, Any]:
    """What the day is heading for: what already ran plus the rest of the plan."""
    current = slot_index(now)

    actual_so_far = sum(
        (slot.get("heating_kwh") or 0.0)
        for slot in actual[: min(len(actual), SLOTS_PER_DAY)]
    )
    remaining = sum(
        (plan[index].get("heating_kwh") or 0.0)
        for index in range(min(current + 1, len(plan)), min(len(plan), SLOTS_PER_DAY))
    )
    planned_total = sum(
        (slot.get("heating_kwh") or 0.0)
        for slot in plan[: min(len(plan), SLOTS_PER_DAY)]
    )

    return {
        "actual_so_far_kwh": round(actual_so_far, 3),
        "remaining_planned_kwh": round(remaining, 3),
        "estimated_total_kwh": round(actual_so_far + remaining, 3),
        "planned_total_kwh": round(planned_total, 3),
    }
