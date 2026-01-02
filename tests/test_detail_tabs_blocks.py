from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.battery_forecast.presentation import (
    detail_tabs_blocks as blocks_module,
)
from custom_components.oig_cloud.battery_forecast.presentation import (
    detail_tabs_summary as summary_module,
)


def _make_interval(
    ts: datetime,
    *,
    planned: dict,
    actual: dict | None = None,
) -> dict:
    return {
        "time": ts.replace(microsecond=0).isoformat(),
        "planned": planned,
        "actual": actual,
    }


class DummySensor:
    def __init__(self, mode_groups, efficiency=0.9):
        self._config_entry = SimpleNamespace(options={"max_ups_price_czk": 6.0})
        self._mode_groups = mode_groups
        self._efficiency = efficiency

    def _group_intervals_by_mode(self, intervals, _data_type):
        return self._mode_groups

    def _get_total_battery_capacity(self):
        return 10.0

    def _get_battery_efficiency(self):
        return self._efficiency


def test_determine_block_status_yesterday():
    now = dt_util.as_local(datetime(2025, 1, 2, 12, 0, 0))
    first = {"time": "2025-01-01T00:00:00"}
    last = {"time": "2025-01-01T00:15:00"}
    status = blocks_module.determine_block_status(first, last, "yesterday", now)
    assert status == "completed"


def test_determine_block_status_missing_times():
    now = dt_util.as_local(datetime(2025, 1, 2, 12, 0, 0))
    status = blocks_module.determine_block_status({}, {}, "today", now)
    assert status == "planned"


def test_determine_block_status_invalid_times():
    now = dt_util.as_local(datetime(2025, 1, 2, 12, 0, 0))
    first = {"time": "invalid"}
    last = {"time": "invalid"}
    status = blocks_module.determine_block_status(first, last, "today", now)
    assert status == "planned"


@pytest.mark.parametrize("reason_code,guard_active", [("price_band_hold", False), (None, True)])
def test_build_mode_blocks_with_reasons(reason_code, guard_active):
    now = dt_util.now()
    planned_metrics = {
        "planner_reason_code": reason_code,
        "future_ups_avg_price_czk": 4.5,
        "grid_charge_kwh": 0.2,
        "home1_saving_czk": 0.6,
        "recharge_cost_czk": 0.2,
        "guard_active": guard_active,
        "guard_type": "guard_exception_soc" if guard_active else None,
        "guard_planned_mode": "Home UPS" if guard_active else None,
    }
    planned = {
        "mode": 0,
        "mode_name": "Home 1",
        "battery_soc": 55.0,
        "battery_kwh": 5.5,
        "solar_kwh": 0.8,
        "consumption_kwh": 1.2,
        "grid_import": 0.5,
        "grid_export": 0.1,
        "net_cost": 2.0,
        "decision_metrics": planned_metrics,
        "spot_price": 3.5,
    }
    actual = {
        "mode": 0,
        "battery_soc": 54.0,
        "battery_kwh": 5.4,
        "solar_kwh": 0.7,
        "consumption_kwh": 1.1,
        "grid_import": 0.4,
        "grid_export": 0.05,
        "net_cost": 1.9,
        "spot_price": 3.4,
    }
    intervals = [
        _make_interval(now - timedelta(minutes=30), planned=planned, actual=actual),
        _make_interval(now - timedelta(minutes=15), planned=planned, actual=actual),
    ]
    mode_group = {
        "mode": "Home 1",
        "intervals": intervals,
        "start_time": intervals[0]["time"],
        "end_time": intervals[-1]["time"],
        "interval_count": len(intervals),
        "actual_cost": 1.9,
        "planned_cost": 2.0,
        "delta": -0.1,
    }
    sensor = DummySensor([mode_group])

    blocks = blocks_module.build_mode_blocks_for_tab(
        sensor, intervals, "today", mode_names={0: "Home 1"}
    )

    assert len(blocks) == 1
    block = blocks[0]
    assert block["mode_planned"] == "Home 1"
    assert block["interval_count"] == 2
    assert "interval_reasons" in block
    assert block["grid_import_total_kwh"] is not None

    summary = summary_module.calculate_tab_summary(sensor, blocks, intervals)
    assert summary["mode_switches"] == 0
    assert summary["metrics"]["cost"]["plan"] == 4.0


def test_summarize_block_reason_ups_charge_band():
    now = dt_util.now()
    planned = {
        "mode": 3,
        "battery_kwh": 5.0,
        "solar_kwh": 0.1,
        "consumption_kwh": 0.2,
        "grid_import": 0.3,
        "grid_export": 0.0,
        "spot_price": 3.8,
        "decision_metrics": {
            "future_ups_avg_price_czk": 5.0,
            "grid_charge_kwh": 0.4,
        },
    }
    intervals = [_make_interval(now, planned=planned, actual=None)]
    sensor = DummySensor(mode_groups=[])
    block = {"mode_planned": "Home UPS", "battery_kwh_start": 5.0, "battery_kwh_end": 5.4}

    reason = blocks_module.summarize_block_reason(sensor, intervals, block)

    assert reason
    assert "Nabíjíme ze sítě" in reason


def test_summarize_block_reason_guard_until():
    now = dt_util.now()
    planned = {
        "mode": 0,
        "decision_metrics": {
            "guard_active": True,
            "guard_forced_mode": "Home 2",
            "guard_until": now.isoformat(),
        },
    }
    intervals = [_make_interval(now, planned=planned, actual=None)]
    sensor = DummySensor(mode_groups=[])
    block = {"mode_planned": "Home 2"}

    reason = blocks_module.summarize_block_reason(sensor, intervals, block)

    assert reason
    assert "Stabilizace" in reason


def test_summarize_block_reason_home1_expensive():
    now = dt_util.now()
    planned = {
        "mode": 0,
        "battery_kwh": 5.0,
        "solar_kwh": 0.0,
        "consumption_kwh": 1.2,
        "spot_price": 7.5,
        "decision_metrics": {
            "future_ups_avg_price_czk": 4.0,
        },
    }
    intervals = [_make_interval(now, planned=planned, actual=None)]
    sensor = DummySensor(mode_groups=[])
    block = {"mode_planned": "Home 1", "battery_kwh_start": 5.0, "battery_kwh_end": 4.4}

    reason = blocks_module.summarize_block_reason(sensor, intervals, block)

    assert reason
    assert "Vybíjíme baterii" in reason


def test_summarize_block_reason_home3_solar_surplus():
    now = dt_util.now()
    planned = {
        "mode": 2,
        "battery_kwh": 5.0,
        "solar_kwh": 2.0,
        "consumption_kwh": 1.0,
    }
    intervals = [_make_interval(now, planned=planned, actual=None)]
    sensor = DummySensor(mode_groups=[])
    block = {"mode_planned": "Home 3"}

    reason = blocks_module.summarize_block_reason(sensor, intervals, block)

    assert reason
    assert "HOME III" in reason


def test_build_mode_blocks_planned_only():
    now = dt_util.now()
    planned = {
        "mode": 0,
        "battery_kwh": 5.0,
        "solar_kwh": 0.2,
        "consumption_kwh": 0.6,
        "grid_import": 0.1,
        "grid_export": 0.0,
        "spot_price": 3.0,
    }
    intervals = [_make_interval(now, planned=planned, actual=None)]
    mode_group = {
        "mode": "Home 1",
        "intervals": intervals,
        "start_time": intervals[0]["time"],
        "end_time": intervals[-1]["time"],
        "interval_count": len(intervals),
        "planned_cost": 1.0,
    }
    sensor = DummySensor([mode_group])

    blocks = blocks_module.build_mode_blocks_for_tab(
        sensor, intervals, "tomorrow", mode_names={0: "Home 1"}
    )

    assert blocks[0]["cost_historical"] is None
    assert blocks[0]["adherence_pct"] is None
