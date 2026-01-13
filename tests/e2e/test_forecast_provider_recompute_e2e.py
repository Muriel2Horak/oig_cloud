from __future__ import annotations

import asyncio
from datetime import datetime

import pytest
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store

from custom_components.oig_cloud.battery_forecast.sensors.recommended_sensor import (
    OigCloudPlannerRecommendedModeSensor,
)


def _build_precomputed_payload(timeline: list[dict], *, ts: str) -> dict:
    return {
        "detail_tabs": {},
        "detail_tabs_hybrid": {},
        "unified_cost_tile": {},
        "unified_cost_tile_hybrid": {},
        "timeline": timeline,
        "timeline_hybrid": timeline,
        "last_update": ts,
        "version": 3,
    }


@pytest.mark.e2e
async def test_forecast_provider_switch_updates_recommended_mode(
    e2e_setup, freezer
):
    hass, entry = e2e_setup
    box_id = entry.options["box_id"]

    freezer.move_to("2026-01-01 12:07:00+00:00")

    sensor = OigCloudPlannerRecommendedModeSensor(
        hass.data["oig_cloud"][entry.entry_id]["coordinator"],
        "recommended_mode",
        entry,
        {"identifiers": {(f"oig_cloud", f"{box_id}_analytics")}},
        hass=hass,
    )
    sensor.hass = hass

    store = Store(hass, version=1, key=f"oig_cloud.precomputed_data_{box_id}")

    timeline_a = [
        {"time": "2026-01-01T12:00:00+00:00", "mode_name": "Home 1", "mode": 0},
        {"time": "2026-01-01T12:15:00+00:00", "mode_name": "Home 2", "mode": 1},
    ]
    await store.async_save(
        _build_precomputed_payload(timeline_a, ts="2026-01-01T12:00:00+00:00")
    )

    await sensor.async_added_to_hass()
    assert sensor.native_value == "Home 1"
    assert sensor.extra_state_attributes.get("points_count") == 2

    timeline_b = [
        {"time": "2026-01-01T12:00:00+00:00", "mode_name": "Home 3", "mode": 2},
        {"time": "2026-01-01T12:15:00+00:00", "mode_name": "Home 2", "mode": 1},
    ]
    await store.async_save(
        _build_precomputed_payload(timeline_b, ts="2026-01-01T12:05:00+00:00")
    )

    async_dispatcher_send(hass, f"oig_cloud_{box_id}_forecast_updated")
    await asyncio.sleep(0)
    await hass.async_block_till_done()

    assert sensor.native_value == "Home 3"
