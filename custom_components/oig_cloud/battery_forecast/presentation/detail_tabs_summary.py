"""Detail tab summary helpers for battery forecast."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..utils_common import safe_nested_get


def default_metrics_summary() -> Dict[str, Dict[str, Any]]:
    """Return default summary metrics payload."""
    return {
        "cost": {"plan": 0.0, "actual": 0.0, "unit": "Kč", "has_actual": False},
        "solar": {"plan": 0.0, "actual": 0.0, "unit": "kWh", "has_actual": False},
        "consumption": {
            "plan": 0.0,
            "actual": 0.0,
            "unit": "kWh",
            "has_actual": False,
        },
        "grid": {"plan": 0.0, "actual": 0.0, "unit": "kWh", "has_actual": False},
    }


def aggregate_interval_metrics(
    intervals: List[Dict[str, Any]],
) -> Dict[str, Dict[str, Any]]:
    """Aggregate plan vs actual metrics for summary tiles."""

    metrics_template = {
        "plan": 0.0,
        "actual": 0.0,
        "actual_samples": 0,
    }

    metrics = {
        "cost": dict(metrics_template),
        "solar": dict(metrics_template),
        "consumption": dict(metrics_template),
        "grid": dict(metrics_template),
    }

    for interval in intervals or []:
        plan_cost = _get_plan_value(interval, "net_cost")
        actual_cost = _get_actual_value(interval, "net_cost")
        _accumulate_metric(metrics, "cost", plan_cost, actual_cost)

        plan_solar = _get_plan_value(interval, "solar_kwh")
        actual_solar = _get_actual_value(interval, "solar_kwh")
        _accumulate_metric(metrics, "solar", plan_solar, actual_solar)

        plan_consumption = _get_plan_value(interval, "consumption_kwh")
        actual_consumption = _get_actual_value(interval, "consumption_kwh")
        _accumulate_metric(metrics, "consumption", plan_consumption, actual_consumption)

        plan_grid = _get_grid_net(interval, "planned")
        actual_grid = _get_actual_grid(interval)
        _accumulate_metric(metrics, "grid", plan_grid, actual_grid)

    formatted_metrics: Dict[str, Dict[str, Any]] = {}
    metric_units = {
        "cost": "Kč",
        "solar": "kWh",
        "consumption": "kWh",
        "grid": "kWh",
    }

    for key, value in metrics.items():
        formatted_metrics[key] = {
            "plan": round(value["plan"], 2),
            "actual": round(value["actual"], 2),
            "unit": metric_units.get(key, ""),
            "has_actual": value["actual_samples"] > 0,
        }

    return formatted_metrics


def _get_plan_value(interval: Dict[str, Any], key: str) -> float:
    return safe_nested_get(interval, "planned", key, default=0.0)


def _get_actual_value(interval: Dict[str, Any], key: str) -> Optional[float]:
    actual = interval.get("actual")
    if not actual:
        return None
    value = actual.get(key)
    if value is None:
        return actual.get(f"{key}_kwh")
    return value


def _get_grid_net(payload: Dict[str, Any], prefix: str) -> float:
    import_key = "grid_import"
    export_key = "grid_export"
    import_val = safe_nested_get(payload, prefix, import_key, default=None)
    if import_val is None:
        import_val = safe_nested_get(payload, prefix, f"{import_key}_kwh", default=0.0)
    export_val = safe_nested_get(payload, prefix, export_key, default=None)
    if export_val is None:
        export_val = safe_nested_get(payload, prefix, f"{export_key}_kwh", default=0.0)
    return (import_val or 0.0) - (export_val or 0.0)


def _accumulate_metric(
    metrics_map: Dict[str, Dict[str, Any]],
    metric_key: str,
    plan_value: float,
    actual_value: Optional[float],
) -> None:
    metrics_map[metric_key]["plan"] += plan_value
    if actual_value is not None:
        metrics_map[metric_key]["actual"] += actual_value
        metrics_map[metric_key]["actual_samples"] += 1
    else:
        metrics_map[metric_key]["actual"] += plan_value


def _get_actual_grid(interval: Dict[str, Any]) -> Optional[float]:
    actual_payload = interval.get("actual")
    if not actual_payload:
        return None
    return (
        actual_payload.get("grid_import")
        or actual_payload.get("grid_import_kwh")
        or 0.0
    ) - (
        actual_payload.get("grid_export")
        or actual_payload.get("grid_export_kwh")
        or 0.0
    )


def calculate_tab_summary(
    sensor: Any, mode_blocks: List[Dict[str, Any]], intervals: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Calculate summary for a tab."""
    _ = sensor
    if not mode_blocks:
        return _default_tab_summary()

    totals, completed_blocks, planned_blocks = _summarize_blocks(mode_blocks)
    overall_adherence = _calculate_overall_adherence(
        totals["adherent_blocks"], totals["total_blocks"]
    )
    summary = _build_base_summary(
        total_cost=totals["total_cost"],
        overall_adherence=overall_adherence,
        total_blocks=totals["total_blocks"],
        intervals=intervals,
    )
    _attach_completed_planned_summary(summary, completed_blocks, planned_blocks)
    return summary


def _default_tab_summary() -> Dict[str, Any]:
    return {
        "total_cost": 0.0,
        "overall_adherence": 100,
        "mode_switches": 0,
        "metrics": default_metrics_summary(),
    }


def _summarize_blocks(
    mode_blocks: List[Dict[str, Any]]
) -> tuple[Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]]]:
    total_cost = 0.0
    adherent_blocks = 0
    completed_blocks: List[Dict[str, Any]] = []
    planned_blocks: List[Dict[str, Any]] = []

    for block in mode_blocks:
        total_cost += _resolve_block_cost(block)
        if block.get("adherence_pct") == 100:
            adherent_blocks += 1
        status = block.get("status")
        if status == "completed":
            completed_blocks.append(block)
        elif status in ("current", "planned"):
            planned_blocks.append(block)

    return (
        {
            "total_cost": total_cost,
            "adherent_blocks": adherent_blocks,
            "total_blocks": len(mode_blocks),
        },
        completed_blocks,
        planned_blocks,
    )


def _resolve_block_cost(block: Dict[str, Any]) -> float:
    cost = block.get("cost_historical")
    if cost is not None:
        return float(cost)
    return float(block.get("cost_planned", 0.0))


def _calculate_overall_adherence(adherent_blocks: int, total_blocks: int) -> float:
    if total_blocks <= 0:
        return 100
    return round((adherent_blocks / total_blocks) * 100, 1)


def _build_base_summary(
    *,
    total_cost: float,
    overall_adherence: float,
    total_blocks: int,
    intervals: List[Dict[str, Any]],
) -> Dict[str, Any]:
    metrics = aggregate_interval_metrics(intervals)
    return {
        "total_cost": round(total_cost, 2),
        "overall_adherence": overall_adherence,
        "mode_switches": max(0, total_blocks - 1),
        "metrics": metrics,
    }


def _attach_completed_planned_summary(
    summary: Dict[str, Any],
    completed_blocks: List[Dict[str, Any]],
    planned_blocks: List[Dict[str, Any]],
) -> None:
    if not completed_blocks or not planned_blocks:
        return
    summary["completed_summary"] = _build_completed_summary(completed_blocks)
    summary["planned_summary"] = _build_planned_summary(planned_blocks)


def _build_completed_summary(completed_blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
    completed_cost = sum(b.get("cost_historical", 0) for b in completed_blocks)
    completed_adherent = sum(
        1 for b in completed_blocks if b.get("adherence_pct") == 100
    )
    adherence_pct = (
        round((completed_adherent / len(completed_blocks)) * 100, 1)
        if completed_blocks
        else 100
    )
    return {
        "count": len(completed_blocks),
        "total_cost": round(completed_cost, 2),
        "adherence_pct": adherence_pct,
    }


def _build_planned_summary(planned_blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
    planned_cost = sum(b.get("cost_planned", 0) for b in planned_blocks)
    return {
        "count": len(planned_blocks),
        "total_cost": round(planned_cost, 2),
    }
