"""Storage for the boiler day record: freeze the baseline, record the actual.

Wraps the pure accounting in ``day_record.py`` with Home Assistant's ``Store``
helper. Debounced saves keep the actual accumulating in memory and hitting
disk at most once a minute; the frozen baseline is force-saved once so a
restart moments later never loses it.

State lives on ``hass.data`` (one bucket per ``(entry_id, box_id)``), not at
module scope, so a fresh ``hass`` (a restart, or a new fixture in a test)
starts from whatever the Store last persisted rather than a stale in-process
cache.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any, Dict, Optional

from homeassistant.util import dt as dt_util

from . import day_record

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1
SAVE_DEBOUNCE_SECONDS = 60.0
MAX_ARCHIVE_DAYS = 7
_STATE_KEY = "_oig_boiler_day_store"


def _storage_key(entry_id: str, box_id: str) -> str:
    return f"oig_cloud.boiler_day_{entry_id}_{box_id}"


def _state_entry(hass: Any, entry_id: str, box_id: str) -> Dict[str, Any]:
    bucket = hass.data.get(_STATE_KEY)
    if bucket is None:
        bucket = {}
        hass.data[_STATE_KEY] = bucket

    cache_key = (entry_id, box_id)
    entry = bucket.get(cache_key)
    if entry is None:
        from homeassistant.helpers.storage import Store

        entry = {
            "store": Store(hass, STORAGE_VERSION, _storage_key(entry_id, box_id)),
            "record": None,
            "last_save": None,
        }
        bucket[cache_key] = entry
    return entry


def _empty_record(day: date) -> Dict[str, Any]:
    return {
        "date": day.isoformat(),
        "plan": None,
        "plan_created_at": None,
        "actual": day_record.empty_actual(),
        "locked": False,
        "archive": {},
    }


def _slots_complete(slots: Optional[list]) -> bool:
    """True when every one of the 96 slots carries a measurement/plan value."""
    if not slots or len(slots) != day_record.SLOTS_PER_DAY:
        return False
    return all(slot.get("heating_kwh") is not None for slot in slots)


def _recompute_locked(record: Dict[str, Any]) -> None:
    record["locked"] = _slots_complete(record.get("plan")) and _slots_complete(
        record.get("actual")
    )


def _archive_snapshot(record: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "date": record.get("date"),
        "plan": record.get("plan"),
        "actual": record.get("actual"),
        "locked": bool(record.get("locked")),
        "created_at": record.get("plan_created_at"),
    }


def _prune_archive(archive: Dict[str, Any]) -> Dict[str, Any]:
    if len(archive) > MAX_ARCHIVE_DAYS:
        for stale_date in sorted(archive.keys())[: len(archive) - MAX_ARCHIVE_DAYS]:
            del archive[stale_date]
    return archive


async def async_load(hass: Any, entry_id: str, box_id: str) -> Dict[str, Any]:
    """Load or create today's record.

    A record already cached in-process for today is returned as-is. Otherwise
    the Store is read; a snapshot from a day other than today is archived
    (covers a restart that crosses midnight without a roll-over call) and a
    fresh record for today is returned.
    """
    entry = _state_entry(hass, entry_id, box_id)
    if entry["record"] is not None:
        return entry["record"]

    today = dt_util.now().date()
    try:
        data = await entry["store"].async_load()
    except Exception:
        _LOGGER.exception("Boiler day store load failed for %s/%s", entry_id, box_id)
        data = None

    if isinstance(data, dict) and data.get("date") == today.isoformat():
        record = data
        record.setdefault("plan", None)
        record.setdefault("plan_created_at", None)
        record.setdefault("actual", day_record.empty_actual())
        record.setdefault("archive", {})
        record.setdefault("locked", False)
    elif isinstance(data, dict) and data.get("date"):
        archive = _prune_archive(
            {**(data.get("archive") or {}), data["date"]: _archive_snapshot(data)}
        )
        record = _empty_record(today)
        record["archive"] = archive
    else:
        record = _empty_record(today)

    entry["record"] = record
    return record


async def async_ensure_baseline(
    hass: Any, entry_id: str, box_id: str, plan_slots: Any, day: date
) -> bool:
    """Freeze today's baseline once. Returns False if one already exists."""
    try:
        record = await async_load(hass, entry_id, box_id)
        if record.get("plan") is not None:
            return False
        record["plan"] = day_record.snapshot_plan(plan_slots, day)
        record["plan_created_at"] = dt_util.now().isoformat()
        _recompute_locked(record)
        await _async_save(hass, entry_id, box_id, force=True)
        return True
    except Exception:
        _LOGGER.exception(
            "Boiler day store baseline freeze failed for %s/%s", entry_id, box_id
        )
        return False


async def async_record(
    hass: Any,
    entry_id: str,
    box_id: str,
    when: datetime,
    *,
    heating_kwh: float,
    source: Optional[str],
    top_temp_c: Optional[float],
) -> None:
    """Route one measurement into today's actual slots and persist (debounced)."""
    try:
        record = await async_load(hass, entry_id, box_id)
        day_record.accumulate(
            record["actual"],
            when,
            heating_kwh=heating_kwh,
            source=source,
            top_temp_c=top_temp_c,
        )
        _recompute_locked(record)
        await _async_save(hass, entry_id, box_id)
    except Exception:
        _LOGGER.exception("Boiler day store record failed for %s/%s", entry_id, box_id)


async def async_roll_over(hass: Any, entry_id: str, box_id: str, now: datetime) -> None:
    """On a date change, archive the finished day and start a fresh one."""
    try:
        entry = _state_entry(hass, entry_id, box_id)
        record = entry["record"]
        if record is None:
            record = await async_load(hass, entry_id, box_id)

        today = now.date().isoformat()
        if record.get("date") == today:
            return  # async_load already rolled it, or it's already current

        archive = _prune_archive(
            {**(record.get("archive") or {}), record["date"]: _archive_snapshot(record)}
        )
        new_record = _empty_record(now.date())
        new_record["archive"] = archive
        entry["record"] = new_record
        await _async_save(hass, entry_id, box_id, force=True)
    except Exception:
        _LOGGER.exception("Boiler day store roll-over failed for %s/%s", entry_id, box_id)


async def _async_save(
    hass: Any, entry_id: str, box_id: str, *, force: bool = False
) -> None:
    entry = _state_entry(hass, entry_id, box_id)
    now = dt_util.now()
    last = entry["last_save"]
    if not force and last is not None and (now - last).total_seconds() < SAVE_DEBOUNCE_SECONDS:
        return
    entry["last_save"] = now
    try:
        await entry["store"].async_save(entry["record"])
    except Exception:
        _LOGGER.exception("Boiler day store save failed for %s/%s", entry_id, box_id)
