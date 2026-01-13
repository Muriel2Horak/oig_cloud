"""Storage IO helpers for battery forecast plans."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from homeassistant.helpers.event import async_call_later
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)
STORAGE_HELPER_NOT_INITIALIZED = "Storage Helper not initialized"


async def load_plan_from_storage(
    sensor: Any, date_str: str
) -> Optional[Dict[str, Any]]:
    """Load a plan from Storage Helper for a given date."""
    if not sensor._plans_store:
        _LOGGER.error(STORAGE_HELPER_NOT_INITIALIZED)
        return _get_cached_plan(sensor, date_str, STORAGE_HELPER_NOT_INITIALIZED)

    try:
        data = await sensor._plans_store.async_load()
        if not data:
            _LOGGER.debug("No storage data found")
            return _get_cached_plan(sensor, date_str, "Storage empty")

        detailed = data.get("detailed", {})
        plan = detailed.get(date_str)

        if plan:
            interval_count = len(plan.get("intervals", []))
            _LOGGER.debug(
                "Loaded plan from Storage: date=%s, intervals=%s, baseline=%s",
                date_str,
                interval_count,
                plan.get("baseline"),
            )
        else:
            _LOGGER.debug("No plan found in Storage for %s", date_str)
            return _get_cached_plan(sensor, date_str, "not in Storage")

        return plan

    except Exception as err:
        _LOGGER.error("Error loading plan from Storage: %s", err, exc_info=True)
        return _get_cached_plan(sensor, date_str, "Storage error")


async def save_plan_to_storage(
    sensor: Any,
    date_str: str,
    intervals: List[Dict[str, Any]],
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    """Save a plan to Storage Helper."""
    if not sensor._plans_store:
        _LOGGER.error(STORAGE_HELPER_NOT_INITIALIZED)
        return False

    try:
        data = await sensor._plans_store.async_load() or {}
        _ensure_storage_sections(data)
        plan = _build_plan_payload(intervals, metadata)
        data["detailed"][date_str] = plan
        await sensor._plans_store.async_save(data)

        _LOGGER.info(
            "Saved plan to Storage: date=%s, intervals=%s, baseline=%s",
            date_str,
            len(intervals),
            plan["baseline"],
        )
        return True

    except Exception as err:
        _LOGGER.error("Error saving plan to Storage: %s", err, exc_info=True)
        _cache_plan_in_memory(sensor, date_str, intervals, metadata)
        _schedule_retry_save(sensor, date_str)

        if sensor._hass:
            sensor._hass.components.persistent_notification.create(
                (
                    f"Battery plan storage failed for {date_str}. "
                    "Data is cached in memory only (will be lost on restart). "
                    "Check disk space and permissions."
                ),
                title="OIG Cloud Storage Warning",
                notification_id=f"oig_storage_fail_{date_str}",
            )

        return False


def _get_cached_plan(sensor: Any, date_str: str, reason: str) -> Optional[Dict[str, Any]]:
    cached = getattr(sensor, "_in_memory_plan_cache", {}).get(date_str)
    if cached:
        _LOGGER.warning("Using in-memory cached plan for %s (%s)", date_str, reason)
        return cached
    return None


def _ensure_storage_sections(data: Dict[str, Any]) -> None:
    for key in ("detailed", "daily", "weekly"):
        data.setdefault(key, {})


def _build_plan_payload(
    intervals: List[Dict[str, Any]], metadata: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    return {
        "created_at": dt_util.now().isoformat(),
        "baseline": metadata.get("baseline", False) if metadata else False,
        "filled_intervals": metadata.get("filled_intervals") if metadata else None,
        "intervals": intervals,
    }


def _cache_plan_in_memory(
    sensor: Any,
    date_str: str,
    intervals: List[Dict[str, Any]],
    metadata: Optional[Dict[str, Any]],
) -> None:
    if not hasattr(sensor, "_in_memory_plan_cache"):
        sensor._in_memory_plan_cache = {}

    sensor._in_memory_plan_cache[date_str] = _build_plan_payload(intervals, metadata)
    _LOGGER.warning(
        "Stored plan in memory cache (Storage failed): date=%s, intervals=%s",
        date_str,
        len(intervals),
    )


def _schedule_retry_save(sensor: Any, date_str: str) -> None:
    if not sensor._hass:
        return

    async def retry_save(_now):
        _LOGGER.info("Retrying Storage save for %s...", date_str)
        cached_plan = sensor._in_memory_plan_cache.get(date_str, {})
        success = await save_plan_to_storage(
            sensor,
            date_str,
            cached_plan.get("intervals", []),
            {
                "baseline": cached_plan.get("baseline", False),
                "filled_intervals": cached_plan.get("filled_intervals"),
            },
        )
        if success:
            _LOGGER.info("Retry successful for %s", date_str)
            del sensor._in_memory_plan_cache[date_str]
        else:
            _LOGGER.warning("Retry failed for %s", date_str)

    async_call_later(sensor._hass, 300, retry_save)


async def plan_exists_in_storage(sensor: Any, date_str: str) -> bool:
    """Check if a plan exists in Storage for a given date."""
    if not sensor._plans_store:
        return False

    try:
        data = await sensor._plans_store.async_load()
        if not data:
            return False

        detailed = data.get("detailed", {})
        exists = date_str in detailed
        _LOGGER.debug("Plan existence check: date=%s, exists=%s", date_str, exists)
        return exists

    except Exception as err:
        _LOGGER.error("Error checking plan existence: %s", err, exc_info=True)
        return False
