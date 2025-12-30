"""Detail tabs builders extracted from legacy battery forecast."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

_LOGGER = logging.getLogger(__name__)


async def build_detail_tabs(
    sensor: Any, *, tab: Optional[str] = None, plan: str = "hybrid"
) -> Dict[str, Any]:
    """Build Detail Tabs data (aggregated mode blocks)."""
    _ = plan  # legacy parameter (dual-planner removed)

    timeline_extended = await sensor.build_timeline_extended()
    hybrid_tabs = await build_hybrid_detail_tabs(
        sensor, tab=tab, timeline_extended=timeline_extended
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
) -> Dict[str, Any]:
    """Internal helper that builds hybrid detail tabs."""
    if tab is None:
        tabs_to_process = ["yesterday", "today", "tomorrow"]
    elif tab in ["yesterday", "today", "tomorrow"]:
        tabs_to_process = [tab]
    else:
        _LOGGER.warning("Invalid tab requested: %s, returning all tabs", tab)
        tabs_to_process = ["yesterday", "today", "tomorrow"]

    result: Dict[str, Any] = {}
    if timeline_extended is None:
        timeline_extended = await sensor.build_timeline_extended()

    for tab_name in tabs_to_process:
        tab_data = timeline_extended.get(tab_name, {})
        intervals = tab_data.get("intervals", [])
        date_str = tab_data.get("date", "")

        if not intervals:
            tab_result = {
                "date": date_str,
                "mode_blocks": [],
                "summary": {
                    "total_cost": 0.0,
                    "overall_adherence": 100,
                    "mode_switches": 0,
                    "metrics": sensor._default_metrics_summary(),  # pylint: disable=protected-access
                },
                "intervals": [],
            }
        else:
            mode_blocks = sensor._build_mode_blocks_for_tab(  # pylint: disable=protected-access
                intervals, tab_name
            )
            summary = sensor._calculate_tab_summary(  # pylint: disable=protected-access
                mode_blocks, intervals
            )
            tab_result = {
                "date": date_str,
                "mode_blocks": mode_blocks,
                "summary": summary,
                "intervals": intervals,
            }

        result[tab_name] = tab_result

    return result
