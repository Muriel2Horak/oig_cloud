"""Archiving a finished day: what we planned at midnight, and what happened.

The archive used to store a snapshot of the *remaining* forward timeline taken
at whatever moment it ran, alongside an ``actual`` list that nothing ever
filled - so "Včera" compared a partial forward projection against nothing, and
locked the result. Here the plan side is the midnight baseline and the actual
side is read back from the Recorder.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List

from homeassistant.util import dt as dt_util

from ..data import history as history_module
from .plan_storage_baseline import is_baseline_plan_invalid

DATE_FMT = "%Y-%m-%d"
DATETIME_FMT = "%Y-%m-%dT%H:%M:%S"
SLOTS_PER_DAY = 96

_LOGGER = logging.getLogger(__name__)


def baseline_plan_for(
    storage_plans: Dict[str, Any], date_str: str
) -> List[Dict[str, Any]]:
    """The day's committed plan (v0), or nothing.

    A degenerate baseline is deliberately refused rather than archived: writing
    a flat plan into the history would bake the defect into the very record the
    accuracy work reads back.
    """
    day_plan = (storage_plans.get("detailed") or {}).get(date_str) or {}
    intervals = day_plan.get("intervals") or []
    if not intervals or is_baseline_plan_invalid(day_plan):
        return []
    return intervals


async def build_day_actual_series(
    sensor: Any, day: date
) -> List[Dict[str, Any]]:
    """Measured slots for a finished day, in order.

    Only slots the Recorder actually has are returned. An unmeasured slot is
    left out rather than written as 0 kWh - a zero is a measurement claim, and
    every accuracy number computed from a fabricated one would be wrong.
    """
    if not getattr(sensor, "_hass", None):
        return []

    day_start = dt_util.as_local(datetime.combine(day, datetime.min.time()))
    day_end = day_start + timedelta(days=1) - timedelta(minutes=15)
    date_str = day.strftime(DATE_FMT)

    try:
        modes = await history_module.build_historical_modes_lookup(
            sensor,
            day_start=day_start,
            fetch_end=day_end,
            date_str=date_str,
            source="historical_only",
        )
    except Exception as err:
        _LOGGER.error(
            "[OIG_CLOUD_ERROR][component=planner][corr=na][run=na] "
            + "Failed to read historical modes for %s: %s",
            date_str,
            err,
        )
        return []

    series: List[Dict[str, Any]] = []
    for index in range(SLOTS_PER_DAY):
        slot_start = day_start + timedelta(minutes=15 * index)
        mode = modes.get(slot_start.strftime(DATETIME_FMT))
        if not mode:
            continue
        row = await _measured_slot(sensor, slot_start, mode)
        if row:
            series.append(row)
    return series


async def _measured_slot(
    sensor: Any, slot_start: datetime, mode: Dict[str, Any]
) -> Dict[str, Any] | None:
    try:
        metrics = await history_module.fetch_interval_from_history(
            sensor, slot_start, slot_start + timedelta(minutes=15)
        )
    except Exception as err:
        _LOGGER.debug("No history for %s: %s", slot_start, err)
        return None
    if not metrics:
        return None
    return {
        "time": slot_start.strftime("%H:%M"),
        "mode": mode.get("mode", 0),
        "mode_name": mode.get("mode_name", "Unknown"),
        "consumption_kwh": round(float(metrics.get("consumption_kwh") or 0.0), 4),
        "solar_kwh": round(float(metrics.get("solar_kwh") or 0.0), 4),
        "battery_soc": round(float(metrics.get("battery_soc") or 0.0), 2),
        "grid_import_kwh": round(float(metrics.get("grid_import") or 0.0), 4),
        "grid_export_kwh": round(float(metrics.get("grid_export") or 0.0), 4),
        "net_cost": round(float(metrics.get("net_cost") or 0.0), 2),
    }


async def build_archive_entry(
    sensor: Any,
    date_str: str,
    fallback_plan: List[Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    """The archive record for one finished day.

    ``locked`` means "this is the final word on that day", so it is only set
    when both sides are complete. Locking a half-recorded day is what froze
    four slots from 23:00 as the permanent record of 5. 9.
    """
    storage_plans: Dict[str, Any] = {}
    store = getattr(sensor, "_plans_store", None)
    if store:
        try:
            storage_plans = await store.async_load() or {}
        except Exception as err:
            _LOGGER.debug("Could not load plans while archiving %s: %s", date_str, err)

    plan = baseline_plan_for(storage_plans, date_str)
    plan_is_baseline = bool(plan)
    if not plan:
        plan = list(fallback_plan or [])

    try:
        day = datetime.strptime(date_str, DATE_FMT).date()
    except ValueError:
        day = dt_util.now().date()
    actual = await build_day_actual_series(sensor, day)

    complete = (
        plan_is_baseline
        and len(plan) == SLOTS_PER_DAY
        and len(actual) == SLOTS_PER_DAY
    )
    if not complete:
        _LOGGER.info(
            "Archiving %s unlocked: plan=%s slots (baseline=%s), actual=%s slots",
            date_str,
            len(plan),
            plan_is_baseline,
            len(actual),
        )

    return {
        "date": date_str,
        "created_at": dt_util.now().isoformat(),
        "plan": plan,
        "actual": actual,
        "locked": complete,
    }
