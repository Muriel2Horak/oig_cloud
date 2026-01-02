from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

from custom_components.oig_cloud.battery_forecast.presentation import (
    detail_tabs_blocks as blocks_module,
)


def test_determine_block_status_fixed_tabs():
    now = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
    interval = {"time": now.isoformat()}

    assert (
        blocks_module.determine_block_status(interval, interval, "yesterday", now)
        == "completed"
    )
    assert (
        blocks_module.determine_block_status(interval, interval, "tomorrow", now)
        == "planned"
    )


def test_determine_block_status_current_and_planned():
    now = datetime(2025, 1, 1, 12, 30, tzinfo=timezone.utc)
    current_start = {"time": datetime(2025, 1, 1, 12, 30).isoformat()}
    current_end = {"time": datetime(2025, 1, 1, 12, 30).isoformat()}
    planned_start = {"time": datetime(2025, 1, 1, 13, 0).isoformat()}

    assert (
        blocks_module.determine_block_status(current_start, current_end, "today", now)
        == "current"
    )
    assert (
        blocks_module.determine_block_status(planned_start, planned_start, "today", now)
        == "planned"
    )


def test_get_mode_from_intervals():
    intervals = [{"planned": {"mode": 2}}, {"planned": {"mode": "Home UPS"}}]
    mode_names = {2: "Home 3"}

    assert (
        blocks_module.get_mode_from_intervals(intervals, "planned", mode_names)
        == "Home 3"
    )


def test_summarize_block_reason_guard_exception():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    group_intervals = [
        {
            "planned": {
                "decision_metrics": {
                    "guard_active": True,
                    "guard_type": "guard_exception_soc",
                    "guard_planned_mode": "Home UPS",
                }
            }
        }
    ]
    block = {"mode_planned": "Home UPS"}

    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)

    assert "Výjimka guardu" in reason


def test_summarize_block_reason_price_band_hold():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    group_intervals = [
        {
            "planned": {
                "spot_price": 2.5,
                "decision_metrics": {
                    "planner_reason_code": "price_band_hold",
                    "future_ups_avg_price_czk": 3.0,
                    "spot_price_czk": 2.5,
                },
            }
        }
    ]
    block = {"mode_planned": "Home UPS"}

    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)

    assert "UPS držíme" in reason


def test_summarize_block_reason_ups_charge():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    group_intervals = [
        {
            "planned": {
                "spot_price": 2.0,
            }
        }
    ]
    block = {"mode_planned": "Home UPS", "battery_kwh_start": 2.0, "battery_kwh_end": 2.5}

    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)

    assert "Nabíjíme ze sítě" in reason
