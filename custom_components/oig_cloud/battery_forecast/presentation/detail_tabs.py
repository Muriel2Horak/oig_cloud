"""Detail tabs builders extracted from legacy battery forecast."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from .detail_tabs_blocks import build_mode_blocks_for_tab
from .detail_tabs_summary import calculate_tab_summary, default_metrics_summary

_LOGGER = logging.getLogger(__name__)


async def build_detail_tabs(
    sensor: Any,
    *,
    tab: Optional[str] = None,
    plan: str = "hybrid",
    mode_names: Optional[Dict[int, str]] = None,
) -> Dict[str, Any]:
    """Build Detail Tabs data (aggregated mode blocks)."""
    _ = plan
    mode_names = mode_names or {}

    timeline_extended = await sensor.build_timeline_extended()
    hybrid_tabs = await build_hybrid_detail_tabs(
        sensor, tab=tab, timeline_extended=timeline_extended, mode_names=mode_names
    )

    return sensor._decorate_plan_tabs(  # pylint: disable=protected-access
        primary_tabs=hybrid_tabs,
        secondary_tabs={},
        primary_plan="hybrid",
        secondary_plan="none",
    )


async def build_hybrid_detail_tabs(
    sensor: Any,
    *,
    tab: Optional[str] = None,
    timeline_extended: Optional[Dict[str, Any]] = None,
    mode_names: Optional[Dict[int, str]] = None,
) -> Dict[str, Any]:
    """Internal helper that builds hybrid detail tabs."""
    result: Dict[str, Any] = {}
    if timeline_extended is None:
        timeline_extended = await sensor.build_timeline_extended()

    mode_names = mode_names or {}
    tabs_to_process = _resolve_tabs(tab)

    for tab_name in tabs_to_process:
        tab_data = timeline_extended.get(tab_name, {})
        intervals = tab_data.get("intervals", [])
        date_str = tab_data.get("date", "")

        tab_result = _build_tab_result(
            sensor, tab_name, date_str, intervals, mode_names=mode_names
        )

        result[tab_name] = tab_result

    return result


def _resolve_tabs(tab: Optional[str]) -> List[str]:
    if tab is None:
        return ["yesterday", "today", "tomorrow"]
    if tab in ["yesterday", "today", "tomorrow"]:
        return [tab]
    _LOGGER.warning("Invalid tab requested: %s, returning all tabs", tab)
    return ["yesterday", "today", "tomorrow"]


def _build_tab_result(
    sensor: Any,
    tab_name: str,
    date_str: str,
    intervals: List[Dict[str, Any]],
    *,
    mode_names: Dict[int, str],
) -> Dict[str, Any]:
    if not intervals:
        return {
            "date": date_str,
            "mode_blocks": [],
            "summary": {
                "total_cost": 0.0,
                "overall_adherence": 100,
                "mode_switches": 0,
                "metrics": default_metrics_summary(),
            },
            "intervals": [],
        }

    mode_blocks = build_mode_blocks_for_tab(
        sensor, intervals, tab_name, mode_names=mode_names
    )
    summary = calculate_tab_summary(sensor, mode_blocks, intervals)
    return {
        "date": date_str,
        "mode_blocks": mode_blocks,
        "summary": summary,
        "intervals": intervals,
    }
