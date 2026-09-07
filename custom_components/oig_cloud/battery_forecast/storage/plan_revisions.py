"""Intraday revisions of the stored day plan.

The midnight baseline is the plan we committed to, and it stays exactly as it
was written - it is the only honest answer to "how wrong were we this
morning?". These revisions record, three times a day, what the live planner
believes about the rest of the day, so plan drift becomes measurable instead of
invisible.

Revisions carry only the two series that matter for accuracy, not whole
intervals: the plans store already sits above half a megabyte, and four full
copies of a 96-slot plan per day would roughly quadruple it.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from homeassistant.util import dt as dt_util

from .plan_storage_io import get_plans_store_lock

DATE_FMT = "%Y-%m-%d"
SLOTS_PER_DAY = 96

#: Hours at which the live plan is snapshotted, in order. The index in this
#: tuple plus one is the revision version, so v0 always means the baseline.
REVISION_HOURS = (6, 12, 18)

_LOGGER = logging.getLogger(__name__)


def revision_version_for(now: datetime) -> Optional[int]:
    """Version number for this moment, or None outside a revision hour."""
    if now.hour in REVISION_HOURS:
        return REVISION_HOURS.index(now.hour) + 1
    return None


def _slot_index(time_value: Any) -> Optional[int]:
    """Index of a timeline entry in the 96-slot day grid."""
    if not isinstance(time_value, str) or not time_value:
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


def build_revision_record(
    version: int, now: datetime, timeline: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Project the live timeline onto the day grid.

    Slots the live plan says nothing about - the ones already behind us - stay
    open rather than being back-filled, because a revision at noon has no new
    opinion about eight o'clock.
    """
    consumption: List[Optional[float]] = [None] * SLOTS_PER_DAY
    solar: List[Optional[float]] = [None] * SLOTS_PER_DAY

    for entry in timeline:
        index = _slot_index(entry.get("time") or entry.get("timestamp"))
        if index is None:
            continue
        consumption[index] = round(float(entry.get("load_kwh") or 0.0), 4)
        solar[index] = round(float(entry.get("solar_kwh") or 0.0), 4)

    return {
        "version": version,
        "created_at": now.isoformat(),
        "consumption_kwh": consumption,
        "solar_kwh": solar,
    }


def _already_recorded(day_plan: Dict[str, Any], version: int) -> bool:
    return any(
        entry.get("version") == version for entry in day_plan.get("revisions") or []
    )


async def maybe_record_plan_revision(sensor: Any, now: Optional[datetime] = None) -> bool:
    """Append one revision of today's plan. True when something was written."""
    now = now or dt_util.now()
    version = revision_version_for(now)
    if version is None:
        return False

    timeline = getattr(sensor, "_timeline_data", None) or []
    if not timeline:
        _LOGGER.debug("No live timeline to snapshot as revision v%s", version)
        return False

    store = getattr(sensor, "_plans_store", None)
    if not store:
        return False

    date_str = now.strftime(DATE_FMT)
    try:
        async with get_plans_store_lock(sensor):
            data = await store.async_load() or {}
            day_plan = (data.get("detailed") or {}).get(date_str)
            if not day_plan or not day_plan.get("intervals"):
                _LOGGER.debug("No baseline for %s yet, skipping revision", date_str)
                return False
            if _already_recorded(day_plan, version):
                return False

            # Only "revisions" is touched: "intervals" and "created_at" carry
            # the midnight baseline that every plan-vs-actual view compares
            # against, and a revision must never move that yardstick.
            day_plan.setdefault("revisions", []).append(
                build_revision_record(version, now, timeline)
            )
            await store.async_save(data)
    except Exception as err:
        _LOGGER.error(
            "[OIG_CLOUD_ERROR][component=planner][corr=na][run=na] "
            + "Failed to record plan revision v%s for %s: %s",
            version,
            date_str,
            err,
            exc_info=True,
        )
        return False

    _LOGGER.info("Recorded plan revision v%s for %s", version, date_str)
    return True
