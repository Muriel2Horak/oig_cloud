"""Extended timeline builders extracted from legacy battery forecast."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from homeassistant.util import dt as dt_util

from ..data import history as history_module
from .extended_summary import (
    build_today_tile_summary,
    calculate_day_summary,
    format_planned_data,
)

_LOGGER = logging.getLogger(__name__)

DATE_FMT = "%Y-%m-%d"
DATETIME_FMT = "%Y-%m-%dT%H:%M:%S"
UTC_OFFSET = "+00:00"


async def _load_storage_plans(sensor: Any) -> Dict[str, Any]:
    if not getattr(sensor, "_plans_store", None):
        return {}
    try:
        storage_plans = await sensor._plans_store.async_load() or {}
        _LOGGER.debug(
            "📦 Loaded Storage Helper data for timeline building: %s days",
            len(storage_plans.get("detailed", {})),
        )
        return storage_plans
    except Exception as err:
        _LOGGER.error("Failed to load Storage Helper data: %s", err)
        return {}


def _get_day_source(day: date, today: date) -> str:
    if day < today:
        return "historical_only"
    if day == today:
        return "mixed"
    return "planned_only"


async def _build_planned_intervals_map(
    sensor: Any,
    storage_plans: Dict[str, Any],
    day: date,
    date_str: str,
) -> Dict[str, Dict[str, Any]]:
    planned_intervals_map: Dict[str, Dict[str, Any]] = {}
    if not storage_plans:
        return planned_intervals_map

    planned_intervals_list = await _load_planned_intervals_list(
        sensor, storage_plans, date_str
    )

    for planned_entry in planned_intervals_list:
        _add_planned_interval(
            planned_intervals_map,
            planned_entry,
            day,
        )

    _LOGGER.debug(
        "📊 Loaded %s planned intervals from Storage for %s",
        len(planned_intervals_map),
        date_str,
    )
    return planned_intervals_map


def _add_planned_interval(
    planned_intervals_map: Dict[str, Dict[str, Any]],
    planned_entry: Dict[str, Any],
    day: date,
) -> None:
    time_key = planned_entry.get("time", "")
    if not time_key:
        return
    try:
        planned_dt = _parse_planned_time(time_key, day)
        if not planned_dt:
            return
        planned_dt = dt_util.as_local(planned_dt)
        time_str = planned_dt.strftime(DATETIME_FMT)
        planned_intervals_map[time_str] = planned_entry
    except Exception:  # nosec B112
        return


async def _load_planned_intervals_list(
    sensor: Any, storage_plans: Dict[str, Any], date_str: str
) -> List[Dict[str, Any]]:
    planned_intervals_list: List[Dict[str, Any]] = []
    yesterday_plan = storage_plans.get("detailed", {}).get(date_str, {})
    if yesterday_plan and not sensor._is_baseline_plan_invalid(yesterday_plan):
        return yesterday_plan.get("intervals", [])

    archive_day = storage_plans.get("daily_archive", {}).get(date_str, {})
    if archive_day and archive_day.get("plan"):
        planned_intervals_list = archive_day.get("plan", [])
        await _maybe_persist_archive_plan(sensor, date_str, planned_intervals_list)
        return planned_intervals_list

    return yesterday_plan.get("intervals", [])


async def _maybe_persist_archive_plan(
    sensor: Any, date_str: str, planned_intervals_list: List[Dict[str, Any]]
) -> None:
    archive_plan = {
        "intervals": planned_intervals_list,
        "filled_intervals": None,
    }
    if sensor._plans_store and not sensor._is_baseline_plan_invalid(archive_plan):
        try:
            await sensor._save_plan_to_storage(
                date_str,
                planned_intervals_list,
                {"baseline": True, "filled_intervals": None},
            )
            _LOGGER.info(
                "Rebuilt baseline plan for %s from daily archive",
                date_str,
            )
        except Exception as err:
            _LOGGER.debug(
                "Failed to persist archive baseline for %s: %s",
                date_str,
                err,
            )
        return

    _LOGGER.info(
        "Using daily archive plan for %s (baseline invalid)",
        date_str,
    )


async def _build_historical_actual_data(
    sensor: Any,
    interval_time: datetime,
    mode_from_recorder: Dict[str, Any],
) -> Dict[str, Any]:
    interval_end = interval_time + timedelta(minutes=15)
    historical_metrics = await history_module.fetch_interval_from_history(
        sensor, interval_time, interval_end
    )

    if historical_metrics:
        return {
            "mode": mode_from_recorder.get("mode", 0),
            "mode_name": mode_from_recorder.get("mode_name", "Unknown"),
            "consumption_kwh": historical_metrics.get("consumption_kwh", 0),
            "solar_kwh": historical_metrics.get("solar_kwh", 0),
            "battery_soc": historical_metrics.get("battery_soc", 0),
            "battery_kwh": historical_metrics.get("battery_kwh", 0),
            "grid_import_kwh": historical_metrics.get("grid_import", 0),
            "grid_export_kwh": historical_metrics.get("grid_export", 0),
            "net_cost": historical_metrics.get("net_cost", 0),
            "savings": 0,
        }
    return {
        "mode": mode_from_recorder.get("mode", 0),
        "mode_name": mode_from_recorder.get("mode_name", "Unknown"),
        "consumption_kwh": 0,
        "solar_kwh": 0,
        "battery_soc": 0,
        "battery_kwh": 0,
        "grid_import_kwh": 0,
        "grid_export_kwh": 0,
        "net_cost": 0,
        "savings": 0,
    }


def _parse_iso_datetime(time_str: str) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(time_str.replace("Z", UTC_OFFSET))
    except (ValueError, TypeError):
        return None


def _parse_planned_time(
    time_str: str, day: date, _date_str: Optional[str] = None
) -> Optional[datetime]:
    if not time_str:
        return None
    if "T" in time_str:
        return _parse_iso_datetime(time_str)
    try:
        return datetime.combine(day, datetime.strptime(time_str, "%H:%M").time())
    except (ValueError, TypeError):
        return None


def _planned_data_from_storage(planned_entry: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "mode": planned_entry.get("mode", 0),
        "mode_name": planned_entry.get("mode_name", "Unknown"),
        "consumption_kwh": planned_entry.get("consumption_kwh", 0),
        "solar_kwh": planned_entry.get("solar_kwh", 0),
        "battery_soc": planned_entry.get("battery_soc", 0),
        "net_cost": planned_entry.get("net_cost", 0),
    }


async def _load_historical_modes(
    sensor: Any,
    source: str,
    day_start: datetime,
    day_end: datetime,
    now: datetime,
    date_str: str,
) -> Dict[str, Any]:
    if source not in ("historical_only", "mixed") or not sensor._hass:
        return {}
    try:
        fetch_end = day_end if source == "historical_only" else now
        return await history_module.build_historical_modes_lookup(
            sensor,
            day_start=day_start,
            fetch_end=fetch_end,
            date_str=date_str,
            source=source,
        )
    except Exception as err:
        _LOGGER.error(
            "Failed to fetch historical modes from Recorder for %s: %s",
            date_str,
            err,
        )
        return {}


async def _build_historical_only_intervals(
    sensor: Any,
    day: date,
    day_start: datetime,
    storage_plans: Dict[str, Any],
    date_str: str,
    historical_modes_lookup: Dict[str, Any],
) -> List[Dict[str, Any]]:
    planned_intervals_map = await _build_planned_intervals_map(
        sensor, storage_plans, day, date_str
    )
    intervals: List[Dict[str, Any]] = []
    interval_time = day_start
    while interval_time.date() == day:
        interval_time_str = interval_time.strftime(DATETIME_FMT)

        mode_from_recorder = historical_modes_lookup.get(interval_time_str)
        planned_from_storage = planned_intervals_map.get(interval_time_str, {})

        actual_data = {}
        if mode_from_recorder:
            actual_data = await _build_historical_actual_data(
                sensor, interval_time, mode_from_recorder
            )

        planned_data = (
            _planned_data_from_storage(planned_from_storage)
            if planned_from_storage
            else {}
        )

        mode_match = None
        if actual_data and planned_data:
            mode_match = actual_data.get("mode") == planned_data.get("mode")

        intervals.append(
            {
                "time": interval_time_str,
                "status": "historical",
                "planned": planned_data,
                "actual": actual_data,
                "delta": None,
                "mode_match": mode_match,
            }
        )

        interval_time += timedelta(minutes=15)
    return intervals


async def _maybe_repair_baseline(
    sensor: Any,
    storage_plans: Dict[str, Any],
    date_str: str,
) -> tuple[Dict[str, Any], bool]:
    if date_str in sensor._baseline_repair_attempts:
        return storage_plans, False
    sensor._baseline_repair_attempts.add(date_str)
    _LOGGER.info("Baseline plan missing/invalid for %s, attempting rebuild", date_str)
    try:
        repaired = await sensor._create_baseline_plan(date_str)
    except Exception as err:
        _LOGGER.error(
            "Baseline rebuild failed for %s: %s",
            date_str,
            err,
            exc_info=True,
        )
        repaired = False
    if repaired:
        refreshed = await _refresh_storage_after_repair(sensor, storage_plans, date_str)
        return refreshed, True
    return storage_plans, False


async def _refresh_storage_after_repair(
    sensor: Any, storage_plans: Dict[str, Any], date_str: str
) -> Dict[str, Any]:
    try:
        refreshed_plans = await sensor._plans_store.async_load() or {}
        storage_day = refreshed_plans.get("detailed", {}).get(date_str)
        storage_invalid = (
            sensor._is_baseline_plan_invalid(storage_day) if storage_day else True
        )
        if not storage_invalid and storage_day and storage_day.get("intervals"):
            return refreshed_plans
    except Exception as err:
        _LOGGER.error(
            "Failed to reload baseline plan after rebuild for %s: %s",
            date_str,
            err,
            exc_info=True,
        )
    return storage_plans


def _load_past_planned_from_daily_state(
    sensor: Any, date_str: str, day: date
) -> List[Dict[str, Any]]:
    if not getattr(sensor, "_daily_plan_state", None):
        return []
    if sensor._daily_plan_state.get("date") != date_str:
        return []
    past_planned: List[Dict[str, Any]] = []
    plan_intervals = sensor._daily_plan_state.get("plan", [])
    plan_locked = bool(sensor._daily_plan_state.get("locked", False))
    if plan_intervals:
        past_planned = plan_intervals
        _LOGGER.info("Using in-memory daily plan for %s (baseline invalid)", date_str)
    elif not plan_locked:
        actual_intervals = sensor._daily_plan_state.get("actual", [])
        for interval in actual_intervals:
            if interval.get("time"):
                past_planned.append(interval)
    _LOGGER.debug(
        "📋 Loaded %s intervals from _daily_plan_state for %s",
        len(past_planned),
        day,
    )
    return past_planned


def _collect_future_planned(
    all_timeline: List[Dict[str, Any]],
    day: date,
) -> List[Dict[str, Any]]:
    future_planned: List[Dict[str, Any]] = []
    parse_errors = 0
    wrong_date = 0
    for interval in all_timeline:
        time_str = interval.get("time")
        if time_str:
            interval_dt = _parse_iso_datetime(time_str)
            if not interval_dt:
                parse_errors += 1
                continue
            if interval_dt.date() == day:
                future_planned.append(interval)
            else:
                wrong_date += 1
    _LOGGER.debug(
        "📋 Future filter: %s kept, %s wrong_date, %s parse_errors (from %s total)",
        len(future_planned),
        wrong_date,
        parse_errors,
        len(all_timeline),
    )
    return future_planned


def _build_planned_lookup(
    past_planned: List[Dict[str, Any]],
    future_planned: List[Dict[str, Any]],
    date_str: str,
    current_interval_naive: datetime,
) -> Dict[str, Dict[str, Any]]:
    planned_lookup: Dict[str, Dict[str, Any]] = {}
    _add_past_planned_entries(
        planned_lookup, past_planned, date_str, current_interval_naive
    )
    added_future, skipped_future = _add_future_planned_entries(
        planned_lookup, future_planned, current_interval_naive
    )

    _LOGGER.debug(
        "📋 Merge stats: added_future=%s, skipped_future=%s, current_interval=%s",
        added_future,
        skipped_future,
        current_interval_naive,
    )
    return planned_lookup


def _add_past_planned_entries(
    planned_lookup: Dict[str, Dict[str, Any]],
    past_planned: List[Dict[str, Any]],
    date_str: str,
    current_interval_naive: datetime,
) -> None:
    for planned in past_planned:
        time_str = planned.get("time")
        if not time_str:
            continue
        if "T" not in time_str:
            time_str = f"{date_str}T{time_str}:00"
        interval_dt = _parse_iso_datetime(time_str)
        if not interval_dt:
            _LOGGER.warning("Failed to parse time_str: %s", time_str)
            continue
        interval_dt_naive = (
            interval_dt.replace(tzinfo=None) if interval_dt.tzinfo else interval_dt
        )
        if interval_dt_naive < current_interval_naive:
            planned_lookup[interval_dt.strftime(DATETIME_FMT)] = planned


def _add_future_planned_entries(
    planned_lookup: Dict[str, Dict[str, Any]],
    future_planned: List[Dict[str, Any]],
    current_interval_naive: datetime,
) -> tuple[int, int]:
    added_future = 0
    skipped_future = 0
    for planned in future_planned:
        time_str = planned.get("time")
        if not time_str:
            continue
        interval_dt = _parse_iso_datetime(time_str)
        if not interval_dt:
            _LOGGER.debug("Failed to parse time: %s", time_str)
            continue
        interval_dt_naive = (
            interval_dt.replace(tzinfo=None) if interval_dt.tzinfo else interval_dt
        )
        if interval_dt_naive >= current_interval_naive:
            planned_lookup[time_str] = planned
            added_future += 1
        else:
            skipped_future += 1
    return added_future, skipped_future


def _interval_status(
    interval_time: datetime, current_interval_naive: datetime
) -> str:
    interval_time_naive = (
        interval_time.replace(tzinfo=None) if interval_time.tzinfo else interval_time
    )
    if interval_time_naive < current_interval_naive:
        return "historical"
    if interval_time_naive == current_interval_naive:
        return "current"
    return "planned"


async def _build_actual_data(
    sensor: Any,
    interval_time: datetime,
    interval_time_str: str,
    status: str,
    planned_data: Dict[str, Any],
    historical_modes_lookup: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    if status not in ("historical", "current"):
        return None
    mode_from_recorder = historical_modes_lookup.get(interval_time_str)
    if not mode_from_recorder:
        return None
    interval_end = interval_time + timedelta(minutes=15)
    historical_metrics = await history_module.fetch_interval_from_history(
        sensor, interval_time, interval_end
    )
    if historical_metrics:
        return {
            "mode": mode_from_recorder.get("mode", 0),
            "mode_name": mode_from_recorder.get("mode_name", "Unknown"),
            "consumption_kwh": historical_metrics.get("consumption_kwh", 0),
            "solar_kwh": historical_metrics.get("solar_kwh", 0),
            "battery_soc": historical_metrics.get("battery_soc", 0),
            "grid_import_kwh": historical_metrics.get("grid_import", 0),
            "grid_export_kwh": historical_metrics.get("grid_export", 0),
            "net_cost": historical_metrics.get("net_cost", 0),
            "savings": 0,
        }
    return {
        "mode": mode_from_recorder.get("mode", 0),
        "mode_name": mode_from_recorder.get("mode_name", "Unknown"),
        "consumption_kwh": 0,
        "solar_kwh": 0,
        "battery_soc": 0,
        "grid_import_kwh": 0,
        "grid_export_kwh": 0,
        "net_cost": planned_data.get("net_cost", 0) if planned_data else 0,
        "savings": 0,
    }


def _apply_current_interval_data(
    sensor: Any,
    actual_data: Optional[Dict[str, Any]],
    mode_names: Dict[int, str],
) -> Dict[str, Any]:
    current_mode = sensor._get_current_mode()
    current_mode_name = mode_names.get(current_mode, "HOME I")
    current_soc = sensor._get_current_battery_soc_percent()
    current_kwh = sensor._get_current_battery_capacity()
    if actual_data is None:
        actual_data = {
            "consumption_kwh": 0,
            "solar_kwh": 0,
            "grid_import_kwh": 0,
            "grid_export_kwh": 0,
            "net_cost": 0,
            "savings": 0,
        }
    actual_data["mode"] = current_mode
    actual_data["mode_name"] = current_mode_name
    if current_soc is not None:
        actual_data["battery_soc"] = round(current_soc, 1)
    if current_kwh is not None:
        actual_data["battery_kwh"] = round(current_kwh, 2)
    return actual_data


async def _build_mixed_intervals(
    sensor: Any,
    day: date,
    day_start: datetime,
    storage_plans: Dict[str, Any],
    date_str: str,
    now: datetime,
    mode_names: Dict[int, str],
    historical_modes_lookup: Dict[str, Any],
) -> List[Dict[str, Any]]:
    past_planned, future_planned = await _resolve_mixed_planned(
        sensor, storage_plans, date_str, day
    )

    current_minute = (now.minute // 15) * 15
    current_interval = now.replace(minute=current_minute, second=0, microsecond=0)
    current_interval_naive = current_interval.replace(tzinfo=None)

    planned_lookup = _build_planned_lookup(
        past_planned, future_planned, date_str, current_interval_naive
    )
    _LOGGER.debug(
        "📋 Combined planned lookup: %s total intervals for %s",
        len(planned_lookup),
        day,
    )

    return await _build_mixed_interval_entries(
        sensor,
        day,
        day_start,
        current_interval_naive,
        planned_lookup,
        historical_modes_lookup,
        mode_names,
    )


async def _resolve_mixed_planned(
    sensor: Any,
    storage_plans: Dict[str, Any],
    date_str: str,
    day: date,
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    storage_day = storage_plans.get("detailed", {}).get(date_str)
    past_planned: List[Dict[str, Any]] = []
    storage_invalid = sensor._is_baseline_plan_invalid(storage_day) if storage_day else True
    storage_missing = not storage_day or not storage_day.get("intervals")
    if storage_day and storage_day.get("intervals") and not storage_invalid:
        past_planned = storage_day["intervals"]
        _LOGGER.debug(
            "📦 Loaded %s planned intervals from Storage Helper for %s",
            len(past_planned),
            day,
        )
    if sensor._plans_store and (storage_missing or storage_invalid):
        storage_plans, _ = await _maybe_repair_baseline(sensor, storage_plans, date_str)
        storage_day = storage_plans.get("detailed", {}).get(date_str)
        storage_invalid = (
            sensor._is_baseline_plan_invalid(storage_day) if storage_day else True
        )
        if storage_day and storage_day.get("intervals") and not storage_invalid:
            past_planned = storage_day["intervals"]
    if not past_planned:
        past_planned = _load_past_planned_from_daily_state(sensor, date_str, day)
    if not past_planned and storage_day and storage_day.get("intervals"):
        past_planned = storage_day["intervals"]
        _LOGGER.warning(
            "Using baseline plan for %s despite invalid data (no fallback)",
            date_str,
        )
    if not past_planned:
        _LOGGER.debug("⚠️  No past planned data available for %s", day)

    future_planned = _collect_future_planned(getattr(sensor, "_timeline_data", []), day)

    _LOGGER.debug(
        "📋 Planned data sources for %s: past=%s intervals from daily_plan, future=%s intervals from active timeline",
        day,
        len(past_planned),
        len(future_planned),
    )
    return past_planned, future_planned


async def _build_mixed_interval_entries(
    sensor: Any,
    day: date,
    day_start: datetime,
    current_interval_naive: datetime,
    planned_lookup: Dict[str, Dict[str, Any]],
    historical_modes_lookup: Dict[str, Any],
    mode_names: Dict[int, str],
) -> List[Dict[str, Any]]:
    intervals: List[Dict[str, Any]] = []
    interval_time = day_start
    while interval_time.date() == day:
        interval_entry = await _build_interval_entry(
            sensor,
            interval_time,
            current_interval_naive,
            planned_lookup,
            historical_modes_lookup,
            mode_names,
        )
        if interval_entry:
            intervals.append(interval_entry)

        interval_time += timedelta(minutes=15)

    return intervals


async def _build_interval_entry(
    sensor: Any,
    interval_time: datetime,
    current_interval_naive: datetime,
    planned_lookup: Dict[str, Dict[str, Any]],
    historical_modes_lookup: Dict[str, Any],
    mode_names: Dict[int, str],
) -> Optional[Dict[str, Any]]:
    interval_time_str = interval_time.strftime(DATETIME_FMT)
    status = _interval_status(interval_time, current_interval_naive)

    planned_entry = planned_lookup.get(interval_time_str)
    planned_data = format_planned_data(planned_entry) if planned_entry else {}

    actual_data = await _build_actual_data(
        sensor,
        interval_time,
        interval_time_str,
        status,
        planned_data,
        historical_modes_lookup,
    )

    if status == "current":
        actual_data = _apply_current_interval_data(sensor, actual_data, mode_names)

    if not actual_data and not planned_data:
        return None

    return {
        "time": interval_time_str,
        "status": status,
        "planned": planned_data,
        "actual": actual_data,
        "delta": None,
    }


def _build_planned_only_intervals(
    sensor: Any, day_start: datetime, day_end: datetime
) -> List[Dict[str, Any]]:
    intervals: List[Dict[str, Any]] = []
    if not (getattr(sensor, "_mode_optimization_result", None)):
        return intervals
    optimal_timeline = sensor._mode_optimization_result.get("optimal_timeline", [])
    for interval in optimal_timeline:
        planned_entry = _build_planned_only_entry(interval, day_start, day_end)
        if planned_entry:
            intervals.append(planned_entry)
    return intervals


def _build_planned_only_entry(
    interval: Dict[str, Any], day_start: datetime, day_end: datetime
) -> Optional[Dict[str, Any]]:
    interval_time_str = interval.get("time", "")
    if not interval_time_str:
        return None
    interval_time = _parse_iso_datetime(interval_time_str)
    if not interval_time:
        return None
    if interval_time.tzinfo is None:
        interval_time = dt_util.as_local(interval_time)
    if not (day_start <= interval_time <= day_end):
        return None  # pragma: no cover
    return {
        "time": interval_time_str,
        "status": "planned",
        "planned": format_planned_data(interval),
        "actual": None,
        "delta": None,
    }


async def build_timeline_extended(
    sensor: Any, *, mode_names: Optional[Dict[int, str]] = None
) -> Dict[str, Any]:
    """Build extended timeline structure for API."""
    self = sensor
    mode_names = mode_names or {}

    now, yesterday, today, tomorrow = _timeline_dates()
    storage_plans = await _load_storage_plans(self)

    yesterday_data, today_data, tomorrow_data = await _build_day_summaries(
        self,
        yesterday=yesterday,
        today=today,
        tomorrow=tomorrow,
        storage_plans=storage_plans,
        mode_names=mode_names,
    )

    today_tile_summary = build_today_tile_summary(
        self, today_data.get("intervals", []), now
    )

    return {
        "yesterday": yesterday_data,
        "today": today_data,
        "tomorrow": tomorrow_data,
        "today_tile_summary": today_tile_summary,
    }


def _timeline_dates() -> tuple[datetime, date, date, date]:
    now = dt_util.now()
    today = now.date()
    return now, today - timedelta(days=1), today, today + timedelta(days=1)


async def _build_day_summaries(
    sensor: Any,
    *,
    yesterday: date,
    today: date,
    tomorrow: date,
    storage_plans: Dict[str, Any],
    mode_names: Dict[int, str],
) -> tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    yesterday_data = await build_day_timeline(
        sensor, yesterday, storage_plans, mode_names=mode_names
    )
    today_data = await build_day_timeline(
        sensor, today, storage_plans, mode_names=mode_names
    )
    tomorrow_data = await build_day_timeline(
        sensor, tomorrow, storage_plans, mode_names=mode_names
    )
    return yesterday_data, today_data, tomorrow_data


async def build_day_timeline(  # noqa: C901
    sensor: Any,
    day: date,
    storage_plans: Optional[Dict[str, Any]] = None,
    *,
    mode_names: Optional[Dict[int, str]] = None,
) -> Dict[str, Any]:
    """Build timeline for a single day."""
    self = sensor
    mode_names = mode_names or {}

    now, day_start, day_end, date_str, source = _build_day_context(day)

    historical_modes_lookup = await _load_historical_modes(
        self, source, day_start, day_end, now, date_str
    )

    intervals = await _select_day_intervals(
        sensor=self,
        source=source,
        day=day,
        day_start=day_start,
        day_end=day_end,
        storage_plans=storage_plans,
        date_str=date_str,
        now=now,
        mode_names=mode_names,
        historical_modes_lookup=historical_modes_lookup,
    )

    return _build_day_result(day, intervals)


def _build_day_context(
    day: date,
) -> tuple[datetime, datetime, datetime, str, str]:
    now = dt_util.now()
    today = now.date()
    day_start = dt_util.as_local(datetime.combine(day, datetime.min.time()))
    day_end = dt_util.as_local(datetime.combine(day, datetime.max.time()))
    date_str = day.strftime(DATE_FMT)
    source = _get_day_source(day, today)
    return now, day_start, day_end, date_str, source


def _build_day_result(day: date, intervals: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "date": day.strftime(DATE_FMT),
        "intervals": intervals,
        "summary": calculate_day_summary(intervals),
    }


async def _select_day_intervals(
    *,
    sensor: Any,
    source: str,
    day: date,
    day_start: datetime,
    day_end: datetime,
    storage_plans: Optional[Dict[str, Any]],
    date_str: str,
    now: datetime,
    mode_names: Dict[int, str],
    historical_modes_lookup: Dict[str, Any],
) -> List[Dict[str, Any]]:
    if source == "historical_only":
        return await _build_historical_only_intervals(
            sensor, day, day_start, storage_plans, date_str, historical_modes_lookup
        )
    if source == "mixed":
        return await _build_mixed_intervals(
            sensor,
            day,
            day_start,
            storage_plans,
            date_str,
            now,
            mode_names,
            historical_modes_lookup,
        )
    return _build_planned_only_intervals(sensor, day_start, day_end)
