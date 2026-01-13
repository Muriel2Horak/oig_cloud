"""Precompute helpers extracted from legacy battery forecast."""

from __future__ import annotations

import copy
import logging
from typing import Any, Dict

from homeassistant.util import dt as dt_util

from . import detail_tabs as detail_tabs_module

_LOGGER = logging.getLogger(__name__)


async def precompute_ui_data(sensor: Any) -> None:
    """Precompute UI data (detail_tabs + unified_cost_tile) and save to storage."""
    if not _has_precomputed_store(sensor):
        _LOGGER.warning("⚠️ Precomputed storage not initialized, skipping")
        return

    try:
        _LOGGER.info("📊 Precomputing UI data for instant API responses...")
        start_time = dt_util.now()

        detail_tabs = await _build_detail_tabs(sensor)
        unified_cost_tile = await sensor.build_unified_cost_tile()
        timeline = copy.deepcopy(sensor._timeline_data or [])
        precomputed_data = _build_precomputed_payload(
            detail_tabs, unified_cost_tile, timeline
        )

        await sensor._precomputed_store.async_save(precomputed_data)  # pylint: disable=protected-access
        sensor._last_precompute_hash = (
            sensor._data_hash
        )  # pylint: disable=protected-access

        _dispatch_precompute_update(sensor)

        duration = (dt_util.now() - start_time).total_seconds()
        plan_cost = unified_cost_tile.get("today", {}).get("plan_total_cost") or 0.0
        _LOGGER.info(
            "✅ Precomputed UI data saved in %.2fs (blocks=%s, cost=%.2f Kč)",
            duration,
            len(detail_tabs.get("today", {}).get("mode_blocks", [])),
            float(plan_cost),
        )

    except Exception as err:
        _LOGGER.error("Failed to precompute UI data: %s", err, exc_info=True)
    finally:
        sensor._last_precompute_at = dt_util.now()  # pylint: disable=protected-access


def schedule_precompute(sensor: Any, *, force: bool = False) -> None:
    """Schedule precompute job with throttling."""
    if not sensor.hass or not _has_precomputed_store(sensor):
        return

    now = dt_util.now()
    if _should_skip_precompute(sensor, now, force):
        return

    if (
        sensor._precompute_task and not sensor._precompute_task.done()
    ):  # pylint: disable=protected-access
        _LOGGER.debug("[Precompute] Job already running, skipping")
        return

    async def _runner():
        await _run_precompute_task(sensor)

    sensor._precompute_task = sensor.hass.async_create_task(
        _runner()
    )  # pylint: disable=protected-access


def _has_precomputed_store(sensor: Any) -> bool:
    return bool(sensor._precomputed_store)  # pylint: disable=protected-access


async def _build_detail_tabs(sensor: Any) -> Dict[str, Any]:
    try:
        return await detail_tabs_module.build_detail_tabs(sensor, plan="active")
    except Exception as err:
        _LOGGER.error("Failed to build detail_tabs: %s", err, exc_info=True)
        return {}


def _build_precomputed_payload(
    detail_tabs: Dict[str, Any],
    unified_cost_tile: Dict[str, Any],
    timeline: list[Dict[str, Any]],
) -> Dict[str, Any]:
    return {
        "detail_tabs": detail_tabs,
        "detail_tabs_hybrid": detail_tabs,  # legacy alias
        "active_planner": "planner",
        "unified_cost_tile": unified_cost_tile,
        "unified_cost_tile_hybrid": unified_cost_tile,  # legacy alias
        "timeline": timeline,
        "timeline_hybrid": timeline,  # legacy alias
        "cost_comparison": {},  # legacy key (dual-planner removed)
        "last_update": dt_util.now().isoformat(),
        "version": 3,  # Single-planner architecture
    }


def _dispatch_precompute_update(sensor: Any) -> None:
    if not sensor.hass:
        return
    from homeassistant.helpers.dispatcher import async_dispatcher_send

    signal_name = f"oig_cloud_{sensor._box_id}_forecast_updated"  # pylint: disable=protected-access
    async_dispatcher_send(sensor.hass, signal_name)


def _should_skip_precompute(sensor: Any, now: Any, force: bool) -> bool:
    if force:
        return False
    if not sensor._last_precompute_at:  # pylint: disable=protected-access
        return False
    last_precompute = sensor._last_precompute_at  # pylint: disable=protected-access
    if now - last_precompute < sensor._precompute_interval:  # pylint: disable=protected-access
        _LOGGER.debug(
            "[Precompute] Skipping (last run %ss ago)",
            (now - last_precompute).total_seconds(),
        )
        return True
    return False


async def _run_precompute_task(sensor: Any) -> None:
    try:
        await precompute_ui_data(sensor)
    except Exception as err:  # pragma: no cover - logged inside
        _LOGGER.error("[Precompute] Job failed: %s", err, exc_info=True)
    finally:
        sensor._precompute_task = None  # pylint: disable=protected-access
