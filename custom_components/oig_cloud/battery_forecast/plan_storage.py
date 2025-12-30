"""Storage helpers for battery forecast plans."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from homeassistant.helpers.event import async_call_later
from homeassistant.util import dt as dt_util

from . import history as history_module
from .utils_common import safe_nested_get

DATE_FMT = "%Y-%m-%d"

_LOGGER = logging.getLogger(__name__)


async def maybe_fix_daily_plan(sensor: Any) -> None:  # noqa: C901
    """Fix daily plan state and create baseline after midnight."""
    now = dt_util.now()
    today_str = now.strftime(DATE_FMT)

    if not hasattr(sensor, "_daily_plan_state"):
        sensor._daily_plan_state = None

    if now.hour == 0 and 10 <= now.minute < 60:
        plan_exists = await plan_exists_in_storage(sensor, today_str)
        if not plan_exists:
            _LOGGER.info(
                "Post-midnight baseline creation window: %s",
                now.strftime("%H:%M"),
            )
            baseline_created = await create_baseline_plan(sensor, today_str)
            if baseline_created:
                _LOGGER.info("Baseline plan created in Storage Helper for %s", today_str)
            else:
                _LOGGER.warning("Failed to create baseline plan for %s", today_str)
        else:
            _LOGGER.debug("Baseline plan already exists for %s", today_str)

    if (
        sensor._daily_plan_state
        and sensor._daily_plan_state.get("date") == today_str
        and len(sensor._daily_plan_state.get("plan", [])) > 0
    ):
        _LOGGER.debug(
            "Daily plan for %s already in memory with %s intervals, keeping it",
            today_str,
            len(sensor._daily_plan_state.get("plan", [])),
        )
        return

    if sensor._daily_plan_state is None or sensor._daily_plan_state.get("date") != today_str:
        if sensor._daily_plan_state:
            yesterday_date = sensor._daily_plan_state.get("date")
            sensor._daily_plans_archive[yesterday_date] = sensor._daily_plan_state.copy()

            cutoff_date = (now.date() - timedelta(days=7)).strftime(DATE_FMT)
            sensor._daily_plans_archive = {
                date: plan
                for date, plan in sensor._daily_plans_archive.items()
                if date >= cutoff_date
            }

            _LOGGER.info(
                "Archived daily plan for %s (archive size: %s days)",
                yesterday_date,
                len(sensor._daily_plans_archive),
            )

            if sensor._plans_store:
                try:
                    storage_data = await sensor._plans_store.async_load() or {}
                    storage_data["daily_archive"] = sensor._daily_plans_archive
                    await sensor._plans_store.async_save(storage_data)
                    _LOGGER.info(
                        "Saved daily plans archive to storage (%s days)",
                        len(sensor._daily_plans_archive),
                    )
                except Exception as err:
                    _LOGGER.error("Failed to save daily plans archive: %s", err, exc_info=True)

        if hasattr(sensor, "_mode_optimization_result") and sensor._mode_optimization_result:
            optimal_timeline = getattr(sensor, "_timeline_data", [])
            if not optimal_timeline:
                optimal_timeline = sensor._mode_optimization_result.get(
                    "optimal_timeline", []
                )

            mode_recommendations = sensor._mode_optimization_result.get(
                "mode_recommendations", []
            )

            today_start = datetime.combine(now.date(), datetime.min.time())
            today_start = dt_util.as_local(today_start)
            today_end = datetime.combine(now.date(), datetime.max.time())
            today_end = dt_util.as_local(today_end)

            today_timeline = []
            for interval in optimal_timeline:
                if not interval.get("time"):
                    continue
                try:
                    interval_time = datetime.fromisoformat(interval["time"])
                    if interval_time.tzinfo is None:
                        interval_time = dt_util.as_local(interval_time)
                    if today_start <= interval_time <= today_end:
                        today_timeline.append(interval)
                except Exception:  # nosec B112
                    continue

            today_blocks = []
            for block in mode_recommendations:
                if not block.get("from_time"):
                    continue
                try:
                    block_time = datetime.fromisoformat(block["from_time"])
                    if block_time.tzinfo is None:
                        block_time = dt_util.as_local(block_time)
                    if today_start <= block_time <= today_end:
                        today_blocks.append(block)
                except Exception:  # nosec B112
                    continue

            expected_total_cost = sum(i.get("net_cost", 0) for i in today_timeline)

            plan_intervals = []
            for interval in today_timeline:
                plan_intervals.append(
                    {
                        "time": interval.get("timestamp"),
                        "solar_kwh": round(interval.get("solar_kwh", 0), 4),
                        "consumption_kwh": round(interval.get("load_kwh", 0), 4),
                        "battery_soc": round(interval.get("battery_soc", 0), 2),
                        "battery_capacity_kwh": round(
                            interval.get("battery_capacity_kwh", 0), 2
                        ),
                        "grid_import_kwh": round(interval.get("grid_import", 0), 4),
                        "grid_export_kwh": round(interval.get("grid_export", 0), 4),
                        "mode": interval.get("mode", 0),
                        "mode_name": interval.get("mode_name", "N/A"),
                        "spot_price": round(interval.get("spot_price", 0), 2),
                        "net_cost": round(interval.get("net_cost", 0), 2),
                    }
                )

            existing_actual = []
            if (
                hasattr(sensor, "_daily_plan_state")
                and sensor._daily_plan_state
                and sensor._daily_plan_state.get("date") == today_str
            ):
                existing_actual = sensor._daily_plan_state.get("actual", [])
                _LOGGER.debug(
                    "[Fix Plan] Preserving %s existing actual intervals",
                    len(existing_actual),
                )

            sensor._daily_plan_state = {
                "date": today_str,
                "created_at": now.isoformat(),
                "plan": plan_intervals,
                "actual": existing_actual,
            }

            _LOGGER.info(
                "Fixed daily plan for %s: %s plan intervals, %s existing actual, "
            "expected_cost=%.2f CZK",
                today_str,
                len(plan_intervals),
                len(existing_actual),
                expected_total_cost,
            )
        else:
            _LOGGER.warning(
                "No HYBRID optimization result available to fix daily plan for %s",
                today_str,
            )
            sensor._daily_plan_state = {
                "date": today_str,
                "created_at": now.isoformat(),
                "plan": [],
                "actual": [],
            }


async def load_plan_from_storage(sensor: Any, date_str: str) -> Optional[Dict[str, Any]]:
    """Load a plan from Storage Helper for a given date."""
    if not sensor._plans_store:
        _LOGGER.error("Storage Helper not initialized")
        cached = getattr(sensor, "_in_memory_plan_cache", {}).get(date_str)
        if cached:
            _LOGGER.warning(
                "Using in-memory cached plan for %s (Storage Helper not initialized)",
                date_str,
            )
            return cached
        return None

    try:
        data = await sensor._plans_store.async_load()
        if not data:
            _LOGGER.debug("No storage data found")
            cached = getattr(sensor, "_in_memory_plan_cache", {}).get(date_str)
            if cached:
                _LOGGER.warning(
                    "Using in-memory cached plan for %s (Storage empty)",
                    date_str,
                )
                return cached
            return None

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
            cached = getattr(sensor, "_in_memory_plan_cache", {}).get(date_str)
            if cached:
                _LOGGER.warning(
                    "Using in-memory cached plan for %s (not in Storage)",
                    date_str,
                )
                return cached

        return plan

    except Exception as err:
        _LOGGER.error("Error loading plan from Storage: %s", err, exc_info=True)
        cached = getattr(sensor, "_in_memory_plan_cache", {}).get(date_str)
        if cached:
            _LOGGER.warning(
                "Using in-memory cached plan for %s (Storage error)",
                date_str,
            )
            return cached
        return None


async def save_plan_to_storage(
    sensor: Any,
    date_str: str,
    intervals: List[Dict[str, Any]],
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    """Save a plan to Storage Helper."""
    if not sensor._plans_store:
        _LOGGER.error("Storage Helper not initialized")
        return False

    try:
        data = await sensor._plans_store.async_load() or {}

        if "detailed" not in data:
            data["detailed"] = {}
        if "daily" not in data:
            data["daily"] = {}
        if "weekly" not in data:
            data["weekly"] = {}

        plan = {
            "created_at": dt_util.now().isoformat(),
            "baseline": metadata.get("baseline", False) if metadata else False,
            "filled_intervals": metadata.get("filled_intervals") if metadata else None,
            "intervals": intervals,
        }

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

        if not hasattr(sensor, "_in_memory_plan_cache"):
            sensor._in_memory_plan_cache = {}

        sensor._in_memory_plan_cache[date_str] = {
            "created_at": dt_util.now().isoformat(),
            "baseline": metadata.get("baseline", False) if metadata else False,
            "filled_intervals": metadata.get("filled_intervals") if metadata else None,
            "intervals": intervals,
        }

        _LOGGER.warning(
            "Stored plan in memory cache (Storage failed): date=%s, intervals=%s",
            date_str,
            len(intervals),
        )

        if sensor._hass:
            async def retry_save(now):
                _LOGGER.info("Retrying Storage save for %s...", date_str)
                cached_plan = sensor._in_memory_plan_cache.get(date_str)
                if cached_plan:
                    success = await save_plan_to_storage(
                        sensor,
                        date_str,
                        cached_plan["intervals"],
                        {
                            "baseline": cached_plan["baseline"],
                            "filled_intervals": cached_plan["filled_intervals"],
                        },
                    )
                    if success:
                        _LOGGER.info("Retry successful for %s", date_str)
                        del sensor._in_memory_plan_cache[date_str]
                    else:
                        _LOGGER.warning("Retry failed for %s", date_str)

            async_call_later(sensor._hass, 300, retry_save)

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


def is_baseline_plan_invalid(plan: Optional[Dict[str, Any]]) -> bool:
    """Validate baseline plan."""
    if not plan:
        return True

    intervals = plan.get("intervals") or []
    if len(intervals) < 90:
        return True

    filled_intervals = str(plan.get("filled_intervals") or "").strip()
    if filled_intervals in ("00:00-23:45", "00:00-23:59"):
        return True

    nonzero_consumption = sum(
        1
        for interval in intervals
        if abs(float(interval.get("consumption_kwh", 0) or 0)) > 1e-6
    )
    if nonzero_consumption < max(4, len(intervals) // 24):
        return True

    return False


async def create_baseline_plan(sensor: Any, date_str: str) -> bool:  # noqa: C901
    """Create baseline plan for a given date."""
    if not sensor._plans_store:
        _LOGGER.error("Cannot create baseline - Storage Helper not initialized")
        return False

    _LOGGER.info("Creating baseline plan for %s", date_str)

    try:
        hybrid_timeline = getattr(sensor, "_timeline_data", [])

        if not hybrid_timeline:
            fallback_intervals: List[Dict[str, Any]] = []

            if sensor._plans_store:
                try:
                    storage_plans = await sensor._plans_store.async_load() or {}
                    archive_day = storage_plans.get("daily_archive", {}).get(date_str, {}) or {}
                    if archive_day.get("plan"):
                        fallback_intervals = archive_day.get("plan") or []
                    if not fallback_intervals:
                        detailed_day = storage_plans.get("detailed", {}).get(date_str, {})
                        if detailed_day.get("intervals"):
                            fallback_intervals = detailed_day.get("intervals") or []
                except Exception as err:
                    _LOGGER.debug(
                        "Failed to load fallback plans for %s: %s",
                        date_str,
                        err,
                    )

            if (
                not fallback_intervals
                and getattr(sensor, "_daily_plan_state", None)
                and sensor._daily_plan_state.get("date") == date_str
            ):
                fallback_intervals = sensor._daily_plan_state.get("plan") or []

            if fallback_intervals:
                fallback_plan = {
                    "intervals": fallback_intervals,
                    "filled_intervals": None,
                }
                if not is_baseline_plan_invalid(fallback_plan):
                    _LOGGER.info(
                        "Using fallback plan to create baseline for %s",
                        date_str,
                    )
                    return await save_plan_to_storage(
                        sensor,
                        date_str,
                        fallback_intervals,
                        {"baseline": True, "filled_intervals": None},
                    )

            _LOGGER.warning("No HYBRID timeline available - cannot create baseline plan")
            return False

        _LOGGER.debug("Using HYBRID timeline with %s intervals", len(hybrid_timeline))

        date_obj = datetime.strptime(date_str, DATE_FMT).date()
        day_start = datetime.combine(date_obj, datetime.min.time())
        day_start = dt_util.as_local(day_start)

        intervals = []
        filled_count = 0
        first_hybrid_time = None

        for i in range(96):
            interval_start = day_start + timedelta(minutes=i * 15)
            interval_time_str = interval_start.strftime("%H:%M")

            hybrid_interval = None
            for hi in hybrid_timeline:
                hi_time_str = hi.get("time") or hi.get("timestamp", "")
                if not hi_time_str:
                    continue
                try:
                    if "T" in hi_time_str:
                        hi_dt = datetime.fromisoformat(hi_time_str)
                        if hi_dt.tzinfo is None:
                            hi_dt = dt_util.as_local(hi_dt)
                        hi_time_only = hi_dt.strftime("%H:%M")
                    else:
                        hi_time_only = hi_time_str

                    if hi_time_only == interval_time_str:
                        hybrid_interval = hi
                        if first_hybrid_time is None:
                            first_hybrid_time = interval_time_str
                        break
                except Exception:  # nosec B112
                    continue

            if hybrid_interval:
                interval = {
                    "time": interval_time_str,
                    "solar_kwh": round(hybrid_interval.get("solar_kwh", 0), 4),
                    "consumption_kwh": round(hybrid_interval.get("load_kwh", 0), 4),
                    "battery_soc": round(hybrid_interval.get("battery_soc", 50.0), 2),
                    "battery_kwh": round(
                        hybrid_interval.get("battery_capacity_kwh", 7.68), 2
                    ),
                    "grid_import_kwh": round(hybrid_interval.get("grid_import", 0), 4),
                    "grid_export_kwh": round(hybrid_interval.get("grid_export", 0), 4),
                    "mode": hybrid_interval.get("mode", 2),
                    "mode_name": hybrid_interval.get("mode_name", "HOME III"),
                    "spot_price": round(hybrid_interval.get("spot_price", 3.45), 2),
                    "net_cost": round(hybrid_interval.get("net_cost", 0), 2),
                }
            else:
                interval_end = interval_start + timedelta(minutes=15)
                historical_data = await history_module.fetch_interval_from_history(
                    sensor, interval_start, interval_end
                )

                if historical_data:
                    interval = {
                        "time": interval_time_str,
                        "solar_kwh": round(historical_data.get("solar_kwh", 0), 4),
                        "consumption_kwh": round(
                            historical_data.get("consumption_kwh", 0.065), 4
                        ),
                        "battery_soc": round(historical_data.get("battery_soc", 50.0), 2),
                        "battery_kwh": round(historical_data.get("battery_kwh", 7.68), 2),
                        "grid_import_kwh": round(
                            historical_data.get("grid_import_kwh", 0), 4
                        ),
                        "grid_export_kwh": round(
                            historical_data.get("grid_export_kwh", 0), 4
                        ),
                        "mode": historical_data.get("mode", 2),
                        "mode_name": historical_data.get("mode_name", "HOME III"),
                        "spot_price": round(
                            historical_data.get("spot_price", 3.45), 2
                        ),
                        "net_cost": round(historical_data.get("net_cost", 0), 2),
                    }
                    filled_count += 1
                else:
                    first_soc = 50.0
                    first_mode = 2
                    first_mode_name = "HOME III"

                    if hybrid_timeline:
                        first_hi = hybrid_timeline[0]
                        first_soc = first_hi.get("battery_soc", 50.0)
                        first_mode = first_hi.get("mode", 2)
                        first_mode_name = first_hi.get("mode_name", "HOME III")

                    interval = {
                        "time": interval_time_str,
                        "solar_kwh": 0.0,
                        "consumption_kwh": 0.065,
                        "battery_soc": round(first_soc, 2),
                        "battery_kwh": round((first_soc / 100.0) * 15.36, 2),
                        "grid_import_kwh": 0.065,
                        "grid_export_kwh": 0.0,
                        "mode": first_mode,
                        "mode_name": first_mode_name,
                        "spot_price": 3.45,
                        "net_cost": 0.22,
                    }
                    filled_count += 1

            intervals.append(interval)

        filled_intervals_str = None
        if filled_count > 0 and first_hybrid_time:
            filled_intervals_str = f"00:00-{first_hybrid_time}"

        _LOGGER.info(
            "Baseline plan built: %s intervals, %s from HYBRID, %s filled",
            len(intervals),
            len(intervals) - filled_count,
            filled_count,
        )

        success = await save_plan_to_storage(
            sensor,
            date_str,
            intervals,
            {"baseline": True, "filled_intervals": filled_intervals_str},
        )

        if success:
            _LOGGER.info(
                "Baseline plan created: date=%s, intervals=%s, filled=%s",
                date_str,
                len(intervals),
                filled_intervals_str,
            )
        else:
            _LOGGER.error("Failed to save baseline plan for %s", date_str)

        return success

    except Exception as err:
        _LOGGER.error("Error creating baseline plan for %s: %s", date_str, err, exc_info=True)
        return False


async def ensure_plan_exists(sensor: Any, date_str: str) -> bool:
    """Guarantee plan existence for a date, creating it if needed."""
    exists = await plan_exists_in_storage(sensor, date_str)
    if exists:
        _LOGGER.debug("Plan exists for %s", date_str)
        return True

    _LOGGER.warning("Plan missing for %s, attempting to create...", date_str)

    now = dt_util.now()
    today_str = now.strftime(DATE_FMT)

    if date_str != today_str:
        _LOGGER.warning("Cannot create plan for %s (not today %s)", date_str, today_str)
        return False

    current_hour = now.hour
    current_minute = now.minute

    if current_hour == 0 and 10 <= current_minute < 60:
        _LOGGER.info("Midnight baseline window - creating plan for %s", date_str)
        return await create_baseline_plan(sensor, date_str)

    if (current_hour == 6 and current_minute < 10) or (
        current_hour == 12 and current_minute < 10
    ):
        _LOGGER.info(
            "Retry window (%02d:%02d) - creating plan for %s",
            current_hour,
            current_minute,
            date_str,
        )
        return await create_baseline_plan(sensor, date_str)

    _LOGGER.warning(
        "Emergency baseline creation at %s for %s",
        now.strftime("%H:%M"),
        date_str,
    )
    success = await create_baseline_plan(sensor, date_str)

    if success:
        _LOGGER.info("Emergency baseline created for %s", date_str)
    else:
        _LOGGER.error("Failed to create emergency baseline for %s", date_str)

    return success


async def aggregate_daily(sensor: Any, date_str: str) -> bool:
    """Aggregate daily plan into a summary."""
    if not sensor._plans_store:
        _LOGGER.error("Cannot aggregate - Storage Helper not initialized")
        return False

    _LOGGER.info("Aggregating daily plan for %s", date_str)

    try:
        plan = await load_plan_from_storage(sensor, date_str)
        if not plan:
            _LOGGER.warning("No detailed plan found for %s, skipping aggregation", date_str)
            return False

        intervals = plan.get("intervals", [])
        if not intervals:
            _LOGGER.warning("Empty intervals for %s, skipping aggregation", date_str)
            return False

        total_cost = sum(iv.get("net_cost", 0) for iv in intervals)
        total_solar = sum(iv.get("solar_kwh", 0) for iv in intervals)
        total_consumption = sum(iv.get("consumption_kwh", 0) for iv in intervals)
        total_grid_import = sum(iv.get("grid_import_kwh", 0) for iv in intervals)
        total_grid_export = sum(iv.get("grid_export_kwh", 0) for iv in intervals)

        soc_values = [
            iv.get("battery_soc", 0)
            for iv in intervals
            if iv.get("battery_soc") is not None
        ]
        avg_battery_soc = sum(soc_values) / len(soc_values) if soc_values else 0
        min_battery_soc = min(soc_values) if soc_values else 0
        max_battery_soc = max(soc_values) if soc_values else 0

        daily_aggregate = {
            "planned": {
                "total_cost": round(total_cost, 2),
                "total_solar": round(total_solar, 2),
                "total_consumption": round(total_consumption, 2),
                "total_grid_import": round(total_grid_import, 2),
                "total_grid_export": round(total_grid_export, 2),
                "avg_battery_soc": round(avg_battery_soc, 1),
                "min_battery_soc": round(min_battery_soc, 1),
                "max_battery_soc": round(max_battery_soc, 1),
            }
        }

        data = await sensor._plans_store.async_load() or {}
        if "daily" not in data:
            data["daily"] = {}

        data["daily"][date_str] = daily_aggregate
        await sensor._plans_store.async_save(data)

        _LOGGER.info(
            "Daily aggregate saved for %s: cost=%.2f CZK, solar=%.2f kWh, consumption=%.2f kWh",
            date_str,
            total_cost,
            total_solar,
            total_consumption,
        )

        cutoff_date = (
            datetime.strptime(date_str, DATE_FMT).date() - timedelta(days=7)
        ).strftime(DATE_FMT)

        detailed = data.get("detailed", {})
        dates_to_delete = [d for d in detailed.keys() if d < cutoff_date]

        if dates_to_delete:
            for old_date in dates_to_delete:
                del data["detailed"][old_date]
                _LOGGER.debug("Deleted detailed plan for %s (>7 days old)", old_date)

            await sensor._plans_store.async_save(data)
            _LOGGER.info("Cleaned up %s old detailed plans", len(dates_to_delete))

        return True

    except Exception as err:
        _LOGGER.error(
            "Error aggregating daily plan for %s: %s",
            date_str,
            err,
            exc_info=True,
        )
        return False


async def aggregate_weekly(
    sensor: Any, week_str: str, start_date: str, end_date: str
) -> bool:
    """Aggregate weekly plan summary."""
    if not sensor._plans_store:
        _LOGGER.error("Cannot aggregate - Storage Helper not initialized")
        return False

    _LOGGER.info(
        "Aggregating weekly plan for %s (%s to %s)",
        week_str,
        start_date,
        end_date,
    )

    try:
        data = await sensor._plans_store.async_load() or {}
        daily_plans = data.get("daily", {})

        start = datetime.strptime(start_date, DATE_FMT).date()
        end = datetime.strptime(end_date, DATE_FMT).date()

        week_days = []
        current = start
        while current <= end:
            day_str = current.strftime(DATE_FMT)
            if day_str in daily_plans:
                week_days.append(daily_plans[day_str])
            current += timedelta(days=1)

        if not week_days:
            _LOGGER.warning("No daily plans found for %s, skipping aggregation", week_str)
            return False

        total_cost = sum(
            safe_nested_get(day, "planned", "total_cost", default=0)
            for day in week_days
        )
        total_solar = sum(
            safe_nested_get(day, "planned", "total_solar", default=0)
            for day in week_days
        )
        total_consumption = sum(
            safe_nested_get(day, "planned", "total_consumption", default=0)
            for day in week_days
        )
        total_grid_import = sum(
            safe_nested_get(day, "planned", "total_grid_import", default=0)
            for day in week_days
        )
        total_grid_export = sum(
            safe_nested_get(day, "planned", "total_grid_export", default=0)
            for day in week_days
        )

        weekly_aggregate = {
            "start_date": start_date,
            "end_date": end_date,
            "days_count": len(week_days),
            "planned": {
                "total_cost": round(total_cost, 2),
                "total_solar": round(total_solar, 2),
                "total_consumption": round(total_consumption, 2),
                "total_grid_import": round(total_grid_import, 2),
                "total_grid_export": round(total_grid_export, 2),
            },
        }

        if "weekly" not in data:
            data["weekly"] = {}

        data["weekly"][week_str] = weekly_aggregate
        await sensor._plans_store.async_save(data)

        _LOGGER.info(
            "Weekly aggregate saved for %s: cost=%.2f CZK, solar=%.2f kWh, %s days",
            week_str,
            total_cost,
            total_solar,
            len(week_days),
        )

        cutoff_daily = (
            datetime.strptime(end_date, DATE_FMT).date() - timedelta(days=30)
        ).strftime(DATE_FMT)

        daily_to_delete = [d for d in daily_plans.keys() if d < cutoff_daily]

        if daily_to_delete:
            for old_date in daily_to_delete:
                del data["daily"][old_date]
                _LOGGER.debug("Deleted daily plan for %s (>30 days old)", old_date)

            _LOGGER.info("Cleaned up %s old daily plans", len(daily_to_delete))

        weekly_plans = data.get("weekly", {})
        current_year_week = datetime.now().isocalendar()[:2]
        cutoff_week_number = current_year_week[1] - 52
        cutoff_year = (
            current_year_week[0]
            if cutoff_week_number > 0
            else current_year_week[0] - 1
        )

        weekly_to_delete = []
        for week_key in weekly_plans.keys():
            try:
                year, week = week_key.split("-W")
                year, week = int(year), int(week)
                if year < cutoff_year or (
                    year == cutoff_year and week < cutoff_week_number
                ):
                    weekly_to_delete.append(week_key)
            except Exception:  # nosec B112
                continue

        if weekly_to_delete:
            for old_week in weekly_to_delete:
                del data["weekly"][old_week]
                _LOGGER.debug("Deleted weekly plan for %s (>52 weeks old)", old_week)

            _LOGGER.info("Cleaned up %s old weekly plans", len(weekly_to_delete))

        if daily_to_delete or weekly_to_delete:
            await sensor._plans_store.async_save(data)

        return True

    except Exception as err:
        _LOGGER.error(
            "Error aggregating weekly plan for %s: %s",
            week_str,
            err,
            exc_info=True,
        )
        return False


async def backfill_daily_archive_from_storage(sensor: Any) -> None:
    """Backfill daily plans archive from stored detailed plans."""
    if not sensor._plans_store:
        _LOGGER.warning("Cannot backfill - no storage helper")
        return

    try:
        storage_data = await sensor._plans_store.async_load() or {}
        detailed_plans = storage_data.get("detailed", {})

        if not detailed_plans:
            _LOGGER.info("No detailed plans in storage - nothing to backfill")
            return

        now = dt_util.now()
        backfilled_count = 0
        for days_ago in range(1, 8):
            date_str = (now.date() - timedelta(days=days_ago)).strftime(DATE_FMT)

            if date_str in sensor._daily_plans_archive:
                continue

            if date_str in detailed_plans:
                plan_data = detailed_plans[date_str]
                intervals = plan_data.get("intervals", [])
                sensor._daily_plans_archive[date_str] = {
                    "date": date_str,
                    "plan": intervals,
                    "actual": intervals,
                    "created_at": plan_data.get("created_at"),
                }
                backfilled_count += 1
                _LOGGER.debug(
                    "Backfilled archive for %s from storage (%s intervals)",
                    date_str,
                    len(intervals),
                )

        if backfilled_count > 0:
            _LOGGER.info("Backfilled %s days into archive", backfilled_count)
            storage_data["daily_archive"] = sensor._daily_plans_archive
            await sensor._plans_store.async_save(storage_data)
            _LOGGER.info("Saved backfilled archive to storage")
        else:
            _LOGGER.debug("No days needed backfilling")

    except Exception as err:
        _LOGGER.error("Failed to backfill daily archive: %s", err, exc_info=True)
