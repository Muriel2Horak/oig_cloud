"""Helpers for unified cost tile calculations."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from homeassistant.util import dt as dt_util

from ..data.history import DATE_FMT
from ..utils_common import safe_nested_get

_LOGGER = logging.getLogger(__name__)


def build_baseline_comparison(sensor: Any, hybrid_cost: float) -> Dict[str, Any]:
    """Build baseline comparison data for cost tile."""
    self = sensor

    if (
        not hasattr(self, "_mode_optimization_result")
        or not self._mode_optimization_result
    ):
        return {}

    baselines = self._mode_optimization_result.get("baselines", {})
    if not baselines:
        return {}

    best_baseline = None
    best_cost = float("inf")

    for mode_name in ["HOME_I", "HOME_II", "HOME_III"]:
        if mode_name in baselines:
            cost = baselines[mode_name].get("adjusted_total_cost", float("inf"))
            if cost < best_cost:
                best_cost = cost
                best_baseline = mode_name

    if not best_baseline:
        return {}

    savings = best_cost - hybrid_cost
    savings_pct = (savings / best_cost * 100) if best_cost > 0 else 0

    all_baselines = {}
    for mode_name in ["HOME_I", "HOME_II", "HOME_III"]:
        if mode_name in baselines:
            all_baselines[mode_name] = round(
                baselines[mode_name].get("adjusted_total_cost", 0), 2
            )

    return {
        "hybrid_cost": round(hybrid_cost, 2),
        "best_baseline": best_baseline,
        "best_baseline_cost": round(best_cost, 2),
        "savings": round(savings, 2),
        "savings_pct": round(savings_pct, 1),
        "all_baselines": all_baselines,
    }


def analyze_today_variance(
    sensor: Any,
    intervals: List[Dict[str, Any]],
    plan_total: float,
    predicted_total: float,
) -> str:
    """Analyze today's variance from plan and generate explanation."""
    _ = sensor

    completed = [i for i in intervals if i.get("actual")]
    if not completed:
        return (
            f"Dnes plánujeme utratit {plan_total:.0f} Kč. "
            "Den právě začal, zatím žádná data."
        )

    totals = _summarize_plan_actual_totals(completed)
    text = _format_variance_header(plan_total, predicted_total)
    text += _format_solar_variance(totals)
    text += _format_load_variance(totals)
    text += _format_largest_impact(totals)
    return text


def _summarize_plan_actual_totals(
    completed: List[Dict[str, Any]],
) -> Dict[str, float]:
    total_plan_solar = sum(i.get("planned", {}).get("solar_kwh", 0) for i in completed)
    total_actual_solar = sum(i.get("actual", {}).get("solar_kwh", 0) for i in completed)
    total_plan_load = sum(i.get("planned", {}).get("load_kwh", 0) for i in completed)
    total_actual_load = sum(i.get("actual", {}).get("load_kwh", 0) for i in completed)
    return {
        "plan_solar": total_plan_solar,
        "actual_solar": total_actual_solar,
        "plan_load": total_plan_load,
        "actual_load": total_actual_load,
        "solar_diff": total_actual_solar - total_plan_solar,
        "load_diff": total_actual_load - total_plan_load,
    }


def _format_variance_header(plan_total: float, predicted_total: float) -> str:
    cost_diff = predicted_total - plan_total
    text = (
        f"Měli jsme naplánováno {plan_total:.0f} Kč, "
        f"ale vypadá to na {predicted_total:.0f} Kč"
    )
    if abs(cost_diff) >= 1:
        return text + f" ({cost_diff:+.0f} Kč).\n"
    return text + " (přesně dle plánu).\n"


def _format_solar_variance(totals: Dict[str, float]) -> str:
    solar_diff = totals["solar_diff"]
    if abs(solar_diff) < 0.5:
        return ""
    return (
        f"Slunce svítilo o {abs(solar_diff):.1f} kWh "
        f"{'VÍC' if solar_diff > 0 else 'MÉNĚ'} než odhad "
        f"(plán: {totals['plan_solar']:.1f} kWh, "
        f"real: {totals['actual_solar']:.1f} kWh).\n"
    )


def _format_load_variance(totals: Dict[str, float]) -> str:
    load_diff = totals["load_diff"]
    if abs(load_diff) < 0.5:
        return ""
    return (
        f"Spotřeba byla o {abs(load_diff):.1f} kWh "
        f"{'VĚTŠÍ' if load_diff > 0 else 'MENŠÍ'} "
        f"(plán: {totals['plan_load']:.1f} kWh, "
        f"real: {totals['actual_load']:.1f} kWh).\n"
    )


def _format_largest_impact(totals: Dict[str, float]) -> str:
    solar_diff = totals["solar_diff"]
    load_diff = totals["load_diff"]
    solar_cost_impact = abs(solar_diff) * 4.0
    load_cost_impact = abs(load_diff) * 4.0
    if solar_cost_impact > load_cost_impact and abs(solar_diff) >= 0.5:
        return (
            f"Největší dopad: {'menší' if solar_diff < 0 else 'větší'} "
            f"solární výroba ({solar_cost_impact:+.0f} Kč)."
        )
    if abs(load_diff) >= 0.5:
        return (
            f"Největší dopad: {'vyšší' if load_diff > 0 else 'nižší'} "
            f"spotřeba ({load_cost_impact:+.0f} Kč)."
        )
    return ""


async def analyze_yesterday_performance(sensor: Any) -> str:
    """Analyze yesterday's performance - post-mortem of plan vs actual."""
    self = sensor

    now = dt_util.now()
    yesterday = (now - timedelta(days=1)).date()

    yesterday_timeline = await self._build_day_timeline(yesterday)
    if not yesterday_timeline:
        return "Včera: Žádná data k dispozici."

    intervals = yesterday_timeline.get("intervals", [])
    if not intervals:
        return "Včera: Žádné intervaly."

    total_plan_solar = sum(i.get("planned", {}).get("solar_kwh", 0) for i in intervals)
    total_actual_solar = sum(
        i.get("actual", {}).get("solar_kwh", 0) for i in intervals if i.get("actual")
    )

    total_plan_load = sum(i.get("planned", {}).get("load_kwh", 0) for i in intervals)
    total_actual_load = sum(
        i.get("actual", {}).get("load_kwh", 0) for i in intervals if i.get("actual")
    )

    total_plan_cost = sum(i.get("planned", {}).get("net_cost", 0) for i in intervals)
    total_actual_cost = sum(
        i.get("actual", {}).get("net_cost", 0) for i in intervals if i.get("actual")
    )

    cost_diff = total_actual_cost - total_plan_cost
    solar_diff = total_actual_solar - total_plan_solar
    load_diff = total_actual_load - total_plan_load

    text = (
        f"Včera jsme plánovali {total_plan_cost:.0f} Kč, "
        f"utratili jsme {total_actual_cost:.0f} Kč"
    )

    if abs(cost_diff) >= 1:
        text += f" ({cost_diff:+.0f} Kč).\n"
    else:
        text += " (přesně dle plánu).\n"

    if abs(solar_diff) >= 0.5:
        text += (
            f"Solární výroba: plán {total_plan_solar:.1f} kWh, "
            f"real {total_actual_solar:.1f} kWh ({solar_diff:+.1f} kWh).\n"
        )

    if abs(load_diff) >= 0.5:
        text += (
            f"Spotřeba: plán {total_plan_load:.1f} kWh, "
            f"real {total_actual_load:.1f} kWh ({load_diff:+.1f} kWh).\n"
        )

    impacts = []
    if abs(solar_diff) >= 0.5:
        impacts.append(
            f"{'menší' if solar_diff < 0 else 'větší'} solár ({abs(solar_diff) * 4:.0f} Kč)"
        )
    if abs(load_diff) >= 0.5:
        impacts.append(
            f"{'vyšší' if load_diff > 0 else 'nižší'} spotřeba ({abs(load_diff) * 4:.0f} Kč)"
        )

    if impacts:
        text += f"Největší dopad: {', '.join(impacts)}."

    return text


async def analyze_tomorrow_plan(sensor: Any) -> str:
    """Analyze tomorrow's plan - expected production, consumption, charging, battery state."""
    self = sensor

    now = dt_util.now()
    tomorrow = (now + timedelta(days=1)).date()

    tomorrow_timeline = await self._build_day_timeline(tomorrow)
    if not tomorrow_timeline:
        return "Zítra: Žádný plán k dispozici."

    intervals = tomorrow_timeline.get("intervals", [])
    if not intervals:
        return "Zítra: Žádné intervaly naplánované."

    total_solar = sum(
        safe_nested_get(i, "planned", "solar_kwh", default=0) for i in intervals
    )
    total_load = sum(
        safe_nested_get(i, "planned", "load_kwh", default=0) for i in intervals
    )
    total_cost = sum(
        safe_nested_get(i, "planned", "net_cost", default=0) for i in intervals
    )

    charging_intervals = [
        i for i in intervals if safe_nested_get(i, "planned", "mode") == "HOME_UPS"
    ]
    total_charging = sum(
        safe_nested_get(i, "planned", "grid_charge_kwh", default=0)
        for i in charging_intervals
    )

    last_interval = intervals[-1] if intervals else None
    final_battery = (
        safe_nested_get(last_interval, "planned", "battery_kwh", default=0)
        if last_interval
        else 0
    )
    final_battery_pct = (final_battery / 10.0 * 100) if final_battery else 0

    text = f"Zítra plánujeme {total_cost:.0f} Kč.\n"
    text += f"Očekávaná solární výroba: {total_solar:.1f} kWh"

    if total_solar < 5:
        text += " (zataženo)"
    elif total_solar > 15:
        text += " (slunečno)"
    text += ".\n"

    text += f"Očekávaná spotřeba: {total_load:.1f} kWh.\n"

    if total_charging >= 0.5:
        avg_charging_price = (
            sum(i.get("planned", {}).get("spot_price", 0) for i in charging_intervals)
            / len(charging_intervals)
            if charging_intervals
            else 0
        )
        text += (
            f"Plánované nabíjení: {total_charging:.1f} kWh v noci "
            f"(průměr {avg_charging_price:.1f} Kč/kWh).\n"
        )

    text += (
        f"Stav baterie na konci dne: {final_battery:.1f} kWh "
        f"({final_battery_pct:.0f}%)."
    )

    return text


async def build_today_cost_data(sensor: Any) -> Dict[str, Any]:  # noqa: C901
    """Build today's cost data with actual vs plan tracking."""
    self = sensor

    now = dt_util.now()
    today = now.date()

    storage_plans = await _load_storage_plans(self)
    intervals = await _load_today_intervals(self, today, storage_plans)
    spot_prices_today = _extract_spot_prices_today(self, now)

    if not intervals:
        return _empty_today_cost(spot_prices_today)

    completed, future, active = _partition_intervals(intervals, now)
    plan_completed, actual_completed, plan_total, actual_total, plan_future = (
        _compute_cost_totals(intervals, completed, future, active)
    )

    _LOGGER.debug(
        "💰 Cost calculation: plan_completed=%.2f, actual_completed=%.2f, completed_count=%s",
        plan_completed,
        actual_completed,
        len(completed),
    )

    delta = actual_total - plan_total
    performance, delta_pct = _compute_performance(plan_completed, delta)
    progress_pct = _compute_progress(now)

    total_intervals = len(intervals)
    completed_count = len(completed)

    eod_predicted = actual_completed + plan_future
    eod_vs_plan = eod_predicted - plan_total
    confidence = _confidence_level(completed_count)

    (
        plan_savings_completed,
        actual_savings_completed,
        plan_savings_future,
    ) = _compute_savings(completed, future, active)
    plan_savings_total = plan_savings_completed + plan_savings_future
    predicted_savings = actual_savings_completed + plan_savings_future

    mode_switches, total_blocks = _count_mode_switches(intervals)
    active_interval_data = _build_active_interval_data(active, now)

    remaining_to_eod = plan_future
    vs_plan_pct = (eod_vs_plan / plan_total * 100) if plan_total > 0 else 0.0
    performance_class, performance_icon = _performance_class(vs_plan_pct)

    completed_groups = self._group_intervals_by_mode(completed, "completed")
    future_groups = self._group_intervals_by_mode(future, "planned")

    active_group = None
    if active is not None:
        active_groups = self._group_intervals_by_mode([active], "both")
        if active_groups:
            active_group = active_groups[0]

    baseline_comparison = build_baseline_comparison(self, plan_total)

    today_tooltip = analyze_today_variance(self, intervals, plan_total, eod_predicted)
    yesterday_tooltip = await analyze_yesterday_performance(self)
    tomorrow_tooltip = await analyze_tomorrow_plan(self)

    return {
        "plan_total_cost": round(plan_total, 2),
        "actual_total_cost": round(actual_total, 2),
        "delta": round(delta, 2),
        "blended_total_cost": round(actual_completed + plan_future, 2),
        "actual_cost_so_far": round(actual_completed, 2),
        "performance": performance,
        "completed_intervals": completed_count,
        "total_intervals": total_intervals,
        "progress_pct": round(progress_pct, 1),
        "eod_prediction": {
            "predicted_total": round(eod_predicted, 2),
            "vs_plan": round(eod_vs_plan, 2),
            "confidence": confidence,
            "predicted_savings": round(predicted_savings, 2),
            "planned_savings": round(plan_savings_total, 2),
        },
        "remaining_to_eod": round(remaining_to_eod, 2),
        "future_plan_cost": round(plan_future, 2),
        "future_plan_savings": round(plan_savings_future, 2),
        "vs_plan_pct": round(vs_plan_pct, 1),
        "performance_class": performance_class,
        "performance_icon": performance_icon,
        "baseline_comparison": baseline_comparison,
        "spot_prices_today": spot_prices_today,
        "tooltips": {
            "today": today_tooltip,
            "yesterday": yesterday_tooltip,
            "tomorrow": tomorrow_tooltip,
        },
        "completed_groups": completed_groups,
        "active_group": active_group,
        "future_groups": future_groups,
        "completed_so_far": {
            "actual_cost": round(actual_completed, 2),
            "planned_cost": round(plan_completed, 2),
            "delta_cost": round(delta, 2),
            "delta_pct": round(delta_pct if plan_completed > 0 else 0, 1),
            "actual_savings": round(actual_savings_completed, 2),
            "planned_savings": round(plan_savings_completed, 2),
            "performance": performance,
        },
        "active_interval": active_interval_data,
        "metadata": {
            "mode_switches": mode_switches,
            "total_blocks": total_blocks,
            "completed_intervals": completed_count,
            "active_intervals": 1 if active else 0,
            "future_intervals": len(future),
        },
    }


async def _load_storage_plans(sensor: Any) -> Dict[str, Any]:
    if not sensor._plans_store:
        return {}
    try:
        return await sensor._plans_store.async_load() or {}
    except Exception as e:
        _LOGGER.warning(f"Failed to load storage plans: {e}")
        return {}


async def _load_today_intervals(
    sensor: Any, today: date, storage_plans: Dict[str, Any]
) -> List[Dict[str, Any]]:
    today_timeline = await sensor._build_day_timeline(today, storage_plans)
    _LOGGER.info(
        "[UCT] _build_day_timeline returned: type=%s, value=%s",
        type(today_timeline),
        today_timeline is not None,
    )
    if not today_timeline:
        _LOGGER.warning("_build_day_timeline returned None for today")
        return []
    intervals = today_timeline.get("intervals", [])
    _LOGGER.info("[UCT] Intervals count: %s", len(intervals))
    return intervals


def _extract_spot_prices_today(sensor: Any, now: datetime) -> List[Dict[str, Any]]:
    spot_prices_today = []
    if not (sensor.coordinator and sensor.coordinator.data):
        return spot_prices_today

    spot_data = sensor.coordinator.data.get("spot_prices", {})
    timeline = spot_data.get("timeline", [])
    if not timeline:
        return spot_prices_today

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    for sp in timeline:
        sp_time_str = sp.get("time", "")
        if not sp_time_str:
            continue

        sp_time = datetime.fromisoformat(sp_time_str)
        if sp_time.tzinfo is None:
            sp_time = dt_util.as_local(sp_time)

        if today_start <= sp_time <= today_end:
            spot_prices_today.append(
                {"time": sp_time_str, "price": sp.get("spot_price_czk", 0.0)}
            )

    _LOGGER.info("[UCT] Extracted %s spot prices for today", len(spot_prices_today))
    return spot_prices_today


def _empty_today_cost(spot_prices_today: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "plan_total_cost": 0.0,
        "actual_total_cost": 0.0,
        "delta": 0.0,
        "performance": "on_plan",
        "completed_intervals": 0,
        "total_intervals": 0,
        "progress_pct": 0,
        "eod_prediction": {
            "predicted_total": 0.0,
            "vs_plan": 0.0,
            "confidence": "low",
        },
        "spot_prices_today": spot_prices_today,
    }


def _partition_intervals(
    intervals: List[Dict[str, Any]], now: datetime
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    completed: List[Dict[str, Any]] = []
    future: List[Dict[str, Any]] = []
    active: Optional[Dict[str, Any]] = None

    current_interval_time, end_of_today = _current_interval_bounds(now)

    for interval in intervals:
        interval_time = _parse_interval_time(interval)
        if not interval_time:
            continue

        status = _classify_interval_time(
            interval_time, current_interval_time, end_of_today
        )
        if status == "completed" and interval.get("actual"):
            completed.append(interval)
        elif status == "active":
            active = interval
        elif status == "future":
            future.append(interval)

    return [c for c in completed if c is not None], [f for f in future if f is not None], active


def _current_interval_bounds(now: datetime) -> tuple[datetime, datetime]:
    current_minute = (now.minute // 15) * 15
    current_interval_time = now.replace(minute=current_minute, second=0, microsecond=0)
    end_of_today = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    return current_interval_time, end_of_today


def _parse_interval_time(interval: Optional[Dict[str, Any]]) -> Optional[datetime]:
    if interval is None or not isinstance(interval, dict):
        return None
    interval_time_str = interval.get("time", "")
    if not interval_time_str:
        return None
    interval_time = datetime.fromisoformat(interval_time_str)
    if interval_time.tzinfo is None:
        interval_time = dt_util.as_local(interval_time)
    return interval_time


def _strip_tz(timestamp: datetime) -> datetime:
    return timestamp.replace(tzinfo=None) if timestamp.tzinfo else timestamp


def _classify_interval_time(
    interval_time: datetime, current_interval_time: datetime, end_of_today: datetime
) -> Optional[str]:
    if interval_time > end_of_today:
        return None
    interval_time_naive = _strip_tz(interval_time)
    current_interval_naive = _strip_tz(current_interval_time)
    if interval_time_naive < current_interval_naive:
        return "completed"
    if interval_time_naive == current_interval_naive:
        return "active"
    return "future"


def _safe_get_cost(interval: Dict[str, Any], key: str) -> float:
    data = interval.get(key)
    if data is None:
        return 0.0
    if isinstance(data, dict):
        return float(data.get("net_cost", 0))
    return 0.0


def _compute_cost_totals(
    intervals: List[Dict[str, Any]],
    completed: List[Dict[str, Any]],
    future: List[Dict[str, Any]],
    active: Optional[Dict[str, Any]],
) -> tuple[float, float, float, float, float]:
    plan_completed = sum(_safe_get_cost(c, "planned") for c in completed)
    actual_completed = sum(_safe_get_cost(c, "actual") for c in completed)
    plan_total = sum(_safe_get_cost(interval, "planned") for interval in intervals)
    actual_total = sum(_safe_get_cost(interval, "actual") for interval in intervals)
    plan_future = sum(_safe_get_cost(f, "planned") for f in future)
    if active:
        plan_future += _safe_get_cost(active, "planned")
    return plan_completed, actual_completed, plan_total, actual_total, plan_future


def _compute_performance(plan_completed: float, delta: float) -> tuple[str, float]:
    if plan_completed > 0:
        delta_pct = (delta / plan_completed) * 100
        if delta_pct < -2:
            return "better", delta_pct
        if delta_pct > 2:
            return "worse", delta_pct
        return "on_plan", delta_pct
    return "on_plan", 0.0


def _compute_progress(now: datetime) -> float:
    now_time = now.time()
    seconds_since_midnight = (
        now_time.hour * 3600 + now_time.minute * 60 + now_time.second
    )
    total_seconds_in_day = 24 * 3600
    return seconds_since_midnight / total_seconds_in_day * 100


def _confidence_level(completed_count: int) -> str:
    if completed_count < 10:
        return "low"
    if completed_count < 48:
        return "medium"
    return "high"


def _compute_savings(
    completed: List[Dict[str, Any]],
    future: List[Dict[str, Any]],
    active: Optional[Dict[str, Any]],
) -> tuple[float, float, float]:
    plan_savings_completed = sum(
        c.get("planned", {}).get("savings_vs_home_i", 0) for c in completed
    )
    actual_savings_completed = sum(
        c.get("actual", {}).get("savings_vs_home_i", 0) for c in completed
    )
    plan_savings_future = sum(
        f.get("planned", {}).get("savings_vs_home_i", 0) for f in future
    )
    if active:
        plan_savings_future += active.get("planned", {}).get("savings_vs_home_i", 0)
    return plan_savings_completed, actual_savings_completed, plan_savings_future


def _count_mode_switches(intervals: List[Dict[str, Any]]) -> tuple[int, int]:
    mode_switches = 0
    total_blocks = 0
    last_mode = None
    for interval in intervals:
        current_mode = interval.get("planned", {}).get("mode", "")
        if current_mode != last_mode:
            if last_mode is not None:
                mode_switches += 1
            total_blocks += 1
            last_mode = current_mode
    return mode_switches, total_blocks


def _build_active_interval_data(
    active: Optional[Dict[str, Any]], now: datetime
) -> Optional[Dict[str, Any]]:
    if not active:
        return None
    interval_time_str = active.get("time", "")
    if not interval_time_str:
        return None

    interval_time = datetime.fromisoformat(interval_time_str)
    if interval_time.tzinfo is None:
        interval_time = dt_util.as_local(interval_time)

    duration_minutes = active.get("duration_minutes", 120)
    elapsed_minutes = int((now - interval_time).total_seconds() / 60)
    interval_progress_pct = min(
        100, max(0, (elapsed_minutes / duration_minutes) * 100)
    )

    planned_cost = active.get("planned", {}).get("net_cost", 0)
    planned_savings = active.get("planned", {}).get("savings", 0)

    expected_cost = planned_cost * (interval_progress_pct / 100)
    expected_savings = planned_savings * (interval_progress_pct / 100)

    actual_data = active.get("actual") or {}
    actual_cost_so_far = actual_data.get("net_cost", expected_cost)
    actual_savings_so_far = actual_data.get("savings", expected_savings)

    cost_delta = actual_cost_so_far - expected_cost
    cost_delta_pct = (cost_delta / expected_cost * 100) if expected_cost > 0 else 0

    if cost_delta < -0.5:
        active_interval_performance = "better"
    elif cost_delta > 0.5:
        active_interval_performance = "worse"
    else:
        active_interval_performance = "on_plan"

    return {
        "time": interval_time_str,
        "duration_minutes": duration_minutes,
        "elapsed_minutes": elapsed_minutes,
        "progress_pct": round(interval_progress_pct, 1),
        "planned_cost": round(planned_cost, 2),
        "planned_savings": round(planned_savings, 2),
        "expected_cost_at_progress": round(expected_cost, 2),
        "expected_savings_at_progress": round(expected_savings, 2),
        "actual_cost_so_far": round(actual_cost_so_far, 2),
        "actual_savings_so_far": round(actual_savings_so_far, 2),
        "cost_delta": round(cost_delta, 2),
        "cost_delta_pct": round(cost_delta_pct, 1),
        "performance": active_interval_performance,
    }


def _performance_class(vs_plan_pct: float) -> tuple[str, str]:
    if vs_plan_pct <= -2:
        return "better", "✅"
    if vs_plan_pct >= 2:
        return "worse", "❌"
    return "on_plan", "⚪"


def get_yesterday_cost_from_archive(
    sensor: Any, *, mode_names: Optional[Dict[int, str]] = None
) -> Dict[str, Any]:
    """Get yesterday's cost data from archive."""
    self = sensor
    mode_names = mode_names or {}

    yesterday = (dt_util.now().date() - timedelta(days=1)).strftime(DATE_FMT)

    archive_data = self._daily_plans_archive.get(yesterday)
    if archive_data:
        actual_intervals = archive_data.get("actual", [])
        plan_total, actual_total, delta = _compute_archive_costs(
            archive_data, actual_intervals
        )
        performance, performance_icon, delta_pct = _performance_from_delta(
            plan_total, delta
        )

        normalize_mode = _build_mode_normalizer(mode_names)
        mode_groups = self._group_intervals_by_mode(actual_intervals, "completed")
        _annotate_mode_groups(mode_groups, actual_intervals, normalize_mode)
        mode_adherence_pct = _compute_mode_adherence(actual_intervals, normalize_mode)
        top_variances = _top_variances(actual_intervals)

        return {
            "plan_total_cost": round(plan_total, 2),
            "actual_total_cost": round(actual_total, 2),
            "delta": round(delta, 2),
            "performance": performance,
            "performance_icon": performance_icon,
            "vs_plan_pct": round(delta_pct, 1),
            "mode_groups": mode_groups,
            "mode_adherence_pct": round(mode_adherence_pct, 1),
            "top_variances": top_variances,
        }

    return {
        "plan_total_cost": 0.0,
        "actual_total_cost": 0.0,
        "delta": 0.0,
        "performance": "on_plan",
        "note": "No archive data available",
    }


def _compute_archive_costs(
    archive_data: Dict[str, Any], actual_intervals: List[Dict[str, Any]]
) -> tuple[float, float, float]:
    plan_total = sum(
        resolve_interval_cost(interval, prefer_actual=False)
        for interval in archive_data.get("plan", [])
    )
    actual_total = sum(
        resolve_interval_cost(interval, prefer_actual=True) for interval in actual_intervals
    )
    return plan_total, actual_total, actual_total - plan_total


def _performance_from_delta(plan_total: float, delta: float) -> tuple[str, str, float]:
    if plan_total <= 0:
        return "on_plan", "⚪", 0.0
    delta_pct = (delta / plan_total) * 100
    if delta_pct < -2:
        return "better", "✅", delta_pct
    if delta_pct > 2:
        return "worse", "❌", delta_pct
    return "on_plan", "⚪", delta_pct


def _build_mode_normalizer(mode_names: Dict[int, str]):
    def normalize_mode(mode_raw):
        if isinstance(mode_raw, int):
            return mode_names.get(mode_raw, f"Mode {mode_raw}")
        if mode_raw:
            return str(mode_raw).strip()
        return "Unknown"

    return normalize_mode


def _annotate_mode_groups(
    mode_groups: List[Dict[str, Any]],
    actual_intervals: List[Dict[str, Any]],
    normalize_mode,
) -> None:
    for group in mode_groups:
        group_intervals = [
            iv
            for iv in actual_intervals
            if iv is not None
            and (
                normalize_mode((iv.get("actual") or {}).get("mode")) == group["mode"]
                or normalize_mode((iv.get("planned") or {}).get("mode")) == group["mode"]
            )
        ]
        mode_matches = sum(
            1
            for iv in group_intervals
            if normalize_mode((iv.get("actual") or {}).get("mode"))
            == normalize_mode((iv.get("planned") or {}).get("mode"))
        )
        mode_mismatches = len(group_intervals) - mode_matches
        adherence_pct = (
            (mode_matches / len(group_intervals) * 100)
            if len(group_intervals) > 0
            else 0.0
        )
        group["mode_matches"] = mode_matches
        group["mode_mismatches"] = mode_mismatches
        group["adherence_pct"] = round(adherence_pct, 1)


def _compute_mode_adherence(
    actual_intervals: List[Dict[str, Any]], normalize_mode
) -> float:
    total_matches = sum(
        1
        for iv in actual_intervals
        if iv is not None
        and normalize_mode((iv.get("actual") or {}).get("mode"))
        == normalize_mode((iv.get("planned") or {}).get("mode"))
    )
    if not actual_intervals:
        return 0.0
    return total_matches / len(actual_intervals) * 100


def _top_variances(actual_intervals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    variances = []
    for iv in actual_intervals:
        planned_cost = iv.get("planned", {}).get("net_cost", 0)
        actual_cost = iv.get("actual", {}).get("net_cost", 0)
        variance = actual_cost - planned_cost
        if abs(variance) > 0.5:
            variances.append(
                {
                    "time": iv.get("time", ""),
                    "planned": round(planned_cost, 2),
                    "actual": round(actual_cost, 2),
                    "variance": round(variance, 2),
                    "variance_pct": round(
                        (variance / planned_cost * 100) if planned_cost > 0 else 0, 1
                    ),
                }
            )
    variances.sort(key=lambda x: abs(x["variance"]), reverse=True)
    return variances[:3]


def resolve_interval_cost(
    interval: Optional[Dict[str, Any]], prefer_actual: bool = True
) -> float:
    """Extract or derive interval cost from archived payload."""
    if not interval:
        return 0.0

    for payload in _payload_candidates(interval, prefer_actual):
        cost = _payload_cost(payload)
        if cost is not None:
            return cost

    return 0.0


def _payload_candidates(
    interval: Dict[str, Any], prefer_actual: bool
) -> List[Optional[Dict[str, Any]]]:
    if not isinstance(interval, dict):
        return [interval]  # type: ignore[list-item]
    if prefer_actual:
        return [
            interval.get("actual"),
            interval if not interval.get("actual") else None,
            interval.get("planned"),
        ]
    return [
        interval.get("planned"),
        interval if not interval.get("planned") else None,
        interval.get("actual"),
    ]


def _payload_cost(payload: Optional[Dict[str, Any]]) -> Optional[float]:
    if not payload or not isinstance(payload, dict):
        return None
    value = payload.get("net_cost")
    if value is not None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    grid_import = payload.get("grid_import_kwh", payload.get("grid_import"))
    grid_export = payload.get("grid_export_kwh", payload.get("grid_export"))
    spot_price = payload.get("spot_price_czk", payload.get("spot_price"))
    export_price = payload.get("export_price_czk", payload.get("export_price"))

    if grid_import is None or spot_price is None:
        return None
    try:
        import_cost = float(grid_import) * float(spot_price)
        export_cost = float(grid_export or 0) * float(export_price or 0)
        return round(import_cost - export_cost, 2)
    except (TypeError, ValueError):
        return None


async def build_tomorrow_cost_data(
    sensor: Any, *, mode_names: Optional[Dict[int, str]] = None
) -> Dict[str, Any]:
    """Build tomorrow's cost data (plan only)."""
    self = sensor
    mode_names = mode_names or {}

    tomorrow = dt_util.now().date() + timedelta(days=1)

    tomorrow_timeline = await self._build_day_timeline(tomorrow)
    intervals = tomorrow_timeline.get("intervals", [])

    if not intervals:
        return {
            "plan_total_cost": 0.0,
        }

    plan_total = sum(
        interval.get("planned", {}).get("net_cost", 0) for interval in intervals
    )

    mode_distribution = {}
    for interval in intervals:
        if interval is None:
            continue
        mode_raw = (interval.get("planned") or {}).get("mode", "Unknown")

        if isinstance(mode_raw, int):
            mode = mode_names.get(mode_raw, f"Mode {mode_raw}")
        elif mode_raw and mode_raw != "Unknown":
            mode = str(mode_raw).strip()
        else:
            mode = "Unknown"

        mode_distribution[mode] = mode_distribution.get(mode, 0) + 1

    if mode_distribution:
        dominant_mode = max(mode_distribution.items(), key=lambda x: x[1])
        dominant_mode_name = dominant_mode[0]
        dominant_mode_count = dominant_mode[1]
        dominant_mode_pct = (
            (dominant_mode_count / len(intervals) * 100) if len(intervals) > 0 else 0.0
        )
    else:
        dominant_mode_name = "Unknown"
        dominant_mode_count = 0
        dominant_mode_pct = 0.0

    planned_groups = self._group_intervals_by_mode(intervals, "planned")

    return {
        "plan_total_cost": round(plan_total, 2),
        "mode_distribution": mode_distribution,
        "dominant_mode_name": dominant_mode_name,
        "dominant_mode_count": dominant_mode_count,
        "dominant_mode_pct": round(dominant_mode_pct, 1),
        "planned_groups": planned_groups,
    }
