from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.planning.interval_grouping import (
    group_intervals_by_mode,
)
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


def test_determine_block_status_invalid_time():
    now = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
    interval = {"time": "bad"}
    assert (
        blocks_module.determine_block_status(interval, interval, "today", now)
        == "planned"
    )


def test_determine_block_status_missing_time():
    now = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
    interval = {}
    assert (
        blocks_module.determine_block_status(interval, interval, "today", now)
        == "planned"
    )


def test_get_mode_from_intervals():
    intervals = [{"planned": {"mode": 2}}, {"planned": {"mode": "Home UPS"}}]
    mode_names = {2: "Home 3"}

    assert (
        blocks_module.get_mode_from_intervals(intervals, "planned", mode_names)
        == "Home 3"
    )

    intervals = [{"planned": {"mode": "Custom"}}]
    assert (
        blocks_module.get_mode_from_intervals(intervals, "planned", mode_names)
        == "Custom"
    )

    intervals = [{"planned": {"mode": None}}]
    assert blocks_module.get_mode_from_intervals(intervals, "planned", mode_names) is None


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


def test_summarize_dominant_code_no_reason(monkeypatch):
    monkeypatch.setattr(blocks_module, "format_planner_reason", lambda *_a, **_k: None)
    reason = blocks_module._summarize_dominant_code(
        "none", avg_price=None, avg_future_ups=None, band_pct=0.0
    )
    assert reason is None


def test_summarize_block_reason_price_band_hold_no_future():
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
                },
            }
        }
    ]
    block = {"mode_planned": "Home UPS"}
    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)
    assert "cenovém pásmu" in reason


def test_summarize_block_reason_price_band_hold_no_price():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    group_intervals = [
        {
            "planned": {
                "decision_metrics": {
                    "planner_reason_code": "price_band_hold",
                },
            }
        }
    ]
    block = {"mode_planned": "Home UPS"}
    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)
    assert "cenovém pásmu" in reason


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


def test_summarize_block_reason_guard_forced_mode():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    group_intervals = [
        {
            "planned": {
                "decision_metrics": {
                    "guard_active": True,
                    "guard_forced_mode": "Home 2",
                    "guard_until": "2025-01-01T12:00:00",
                }
            }
        }
    ]
    block = {"mode_planned": "Home 2"}
    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)
    assert "Stabilizace" in reason


def test_summarize_block_reason_guard_no_time():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    group_intervals = [
        {
            "planned": {
                "decision_metrics": {
                    "guard_active": True,
                    "guard_forced_mode": "Home 2",
                }
            }
        }
    ]
    block = {"mode_planned": "Home 2"}
    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)
    assert "60 min" in reason


def test_summarize_block_reason_dominant_other():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    group_intervals = [
        {
            "planned": {
                "spot_price": 2.0,
                "decision_metrics": {"planner_reason_code": "balancing_charge"},
            }
        }
    ]
    block = {"mode_planned": "Home 1"}
    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)
    assert "Balancování" in reason
    assert "Kč/kWh" in reason


def test_summarize_block_reason_names_the_optimizer_reason_instead_of_the_generic_line():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    group_intervals = [
        {
            "planned": {
                "spot_price": price,
                "decision_metrics": {
                    "planner_reason_code": "ECONOMIC_CHARGE_CHEAPER_FUTURE",
                    "grid_charge_kwh": 0.65,
                },
            }
        }
        for price in (2.0, 3.0)
    ]
    block = {"mode_planned": "Home UPS"}

    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)

    assert reason == "Nabíjení ze sítě, později bude elektřina dražší (průměr 2.50 Kč/kWh)."


def test_summarize_block_reason_ups_price_limit():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 3.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    group_intervals = [
        {
            "planned": {
                "spot_price": 2.0,
                "decision_metrics": {
                    "grid_charge_kwh": 1.0,
                    "future_ups_avg_price_czk": 3.5,
                },
            }
        }
    ]
    block = {"mode_planned": "Home UPS", "battery_kwh_start": 1.0, "battery_kwh_end": 2.0}
    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)
    assert "UPS" in reason

    group_intervals[0]["planned"]["spot_price"] = 5.0
    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)
    assert "vyšší cenu" in reason

    group_intervals = [{"planned": {}}]
    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)
    assert "UPS režim" in reason


def test_summarize_block_reason_ups_high_price_no_charge():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 3.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    group_intervals = [{"planned": {"spot_price": 5.0}}]
    block = {"mode_planned": "Home UPS"}
    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)
    assert "vyšší cenu" in reason
    assert reason.endswith(".")


def test_summarize_block_reason_no_entries():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    assert blocks_module.summarize_block_reason(sensor, [], {}) is None


def test_summarize_block_reason_modes():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    base = {"planned": {"solar_kwh": 1.0, "consumption_kwh": 0.5}}

    block = {"mode_planned": "Home II"}
    group_intervals = [
        {
            "planned": {
                "decision_metrics": {
                    "home1_saving_czk": 1.2,
                    "recharge_cost_czk": 1.0,
                }
            }
        }
    ]
    assert "HOME II" in blocks_module.summarize_block_reason(sensor, group_intervals, block)

    block = {"mode_planned": "Home 3"}
    group_intervals = [base]
    assert "maximalizujeme" in blocks_module.summarize_block_reason(sensor, group_intervals, block).lower()

    block = {"mode_planned": "Home I", "battery_kwh_start": 4.0, "battery_kwh_end": 3.0}
    group_intervals = [{"planned": {"spot_price": 5.0, "solar_kwh": 0.1, "consumption_kwh": 0.3}}]
    assert "Vybíjíme baterii" in blocks_module.summarize_block_reason(sensor, group_intervals, block)

    block = {"mode_planned": "Home I", "battery_kwh_start": 3.0, "battery_kwh_end": 4.0}
    group_intervals = [{"planned": {"solar_kwh": 1.0, "consumption_kwh": 0.2}}]
    assert "Solár pokrývá spotřebu" in blocks_module.summarize_block_reason(sensor, group_intervals, block)

    block = {"mode_planned": "Home I", "battery_kwh_start": 4.0, "battery_kwh_end": 3.0}
    group_intervals = [
        {"planned": {"spot_price": 5.0, "consumption_kwh": 0.5, "solar_kwh": 0.1, "decision_metrics": {"future_ups_avg_price_czk": 3.0}}}
    ]
    assert "UPS" in blocks_module.summarize_block_reason(sensor, group_intervals, block)

    block = {"mode_planned": "Home II"}
    group_intervals = [{"planned": {"spot_price": 2.0}}]
    assert "HOME II" in blocks_module.summarize_block_reason(sensor, group_intervals, block)

    block = {"mode_planned": "Home 3"}
    group_intervals = [{"planned": {"solar_kwh": 0.1, "consumption_kwh": 0.5}}]
    assert "Maximalizujeme" in blocks_module.summarize_block_reason(sensor, group_intervals, block)

    block = {"mode_planned": "Home I", "battery_kwh_start": 4.0, "battery_kwh_end": 3.0}
    group_intervals = [{"planned": {"spot_price": 2.0, "consumption_kwh": 0.5, "solar_kwh": 0.1}}]
    assert "Vybíjíme baterii" in blocks_module.summarize_block_reason(sensor, group_intervals, block)

    block = {"mode_planned": "Other"}
    group_intervals = [{"planned": {"decision_reason": "Custom reason"}}]
    assert blocks_module.summarize_block_reason(sensor, group_intervals, block) == "Custom reason"


def test_summarize_block_reason_no_reason():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.9,
    )
    block = {"mode_planned": "Other"}
    group_intervals = [{"planned": {"solar_kwh": 0.1, "consumption_kwh": 0.2}}]
    assert blocks_module.summarize_block_reason(sensor, group_intervals, block) is None


def test_summarize_block_reason_actual_only():
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
        _get_battery_efficiency=lambda: 0.0,
    )
    group_intervals = [
        {
            "actual": {
                "spot_price": 2.0,
                "decision_metrics": {},
                "consumption_kwh": 0.5,
                "solar_kwh": 0.5,
            }
        }
    ]
    block = {"mode_historical": "Home UPS", "battery_kwh_start": 1.0, "battery_kwh_end": 1.5}
    reason = blocks_module.summarize_block_reason(sensor, group_intervals, block)
    assert "Nabíjíme ze sítě" in reason


def test_build_mode_blocks_for_tab():
    sensor = SimpleNamespace(
        _group_intervals_by_mode=lambda *_a, **_k: [
            {
                "mode": "Home 1",
                "intervals": [
                    {
                        "time": "2025-01-01T00:00:00",
                        "planned": {
                            "mode": 0,
                            "battery_soc": 50,
                            "battery_kwh": None,
                            "solar_kwh": 1.0,
                            "consumption_kwh": 0.5,
                            "grid_import_kwh": 0.2,
                            "grid_export": 0.1,
                            "spot_price": 2.0,
                        },
                        "actual": {
                            "mode": 0,
                            "battery_soc": 4.0,
                            "solar_kwh": 0.9,
                            "consumption_kwh": 0.4,
                            "grid_import": 0.3,
                            "grid_export_kwh": 0.0,
                        },
                    }
                ],
                "start_time": "2025-01-01T00:00:00",
                "end_time": "2025-01-01T00:15:00",
                "interval_count": 1,
                "actual_cost": 1.0,
                "planned_cost": 1.1,
                "delta": -0.1,
            }
        ],
        _get_total_battery_capacity=lambda: 10.0,
        _get_battery_efficiency=lambda: 0.9,
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
    )
    blocks = blocks_module.build_mode_blocks_for_tab(
        sensor,
        [{"time": "2025-01-01T00:00:00"}],
        "today",
        mode_names={0: "Home 1"},
    )
    assert blocks
    assert blocks[0]["battery_kwh_start"] >= 0.0
    assert blocks[0]["grid_import_planned_kwh"] >= 0.0


def test_build_mode_blocks_for_tab_empty():
    sensor = SimpleNamespace(_group_intervals_by_mode=lambda *_a, **_k: [])
    assert (
        blocks_module.build_mode_blocks_for_tab(
            sensor, [], "today", mode_names={}
        )
        == []
    )


def test_build_mode_blocks_for_tab_skips_empty_group():
    sensor = SimpleNamespace(
        _group_intervals_by_mode=lambda *_a, **_k: [{"intervals": []}],
        _get_total_battery_capacity=lambda: 0.0,
    )
    blocks = blocks_module.build_mode_blocks_for_tab(
        sensor,
        [{"time": "2025-01-01T00:00:00"}],
        "today",
        mode_names={},
    )
    assert blocks == []


def test_build_mode_blocks_for_tab_planned_only():
    sensor = SimpleNamespace(
        _group_intervals_by_mode=lambda *_a, **_k: [
            {
                "mode": "Home 1",
                "intervals": [
                    {
                        "time": "2025-01-02T00:00:00",
                        "planned": {
                            "mode": 0,
                            "battery_soc": 80,
                            "battery_kwh": None,
                            "solar_kwh": 1.0,
                            "consumption_kwh": 0.5,
                            "grid_import": 0.2,
                            "grid_export_kwh": 0.1,
                        },
                    }
                ],
                "start_time": "2025-01-02T00:00:00",
                "end_time": "2025-01-02T00:15:00",
                "interval_count": 1,
                "planned_cost": 1.1,
            }
        ],
        _get_total_battery_capacity=lambda: 10.0,
        _get_battery_efficiency=lambda: 0.9,
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
    )
    blocks = blocks_module.build_mode_blocks_for_tab(
        sensor,
        [{"time": "2025-01-02T00:00:00"}],
        "tomorrow",
        mode_names={0: "Home 1"},
    )
    assert blocks[0]["adherence_pct"] is None
    assert blocks[0]["battery_kwh_start"] > 0.0


def test_build_mode_blocks_for_tab_non_dict_payload():
    sensor = SimpleNamespace(
        _group_intervals_by_mode=lambda *_a, **_k: [
            {
                "mode": "Home 1",
                "intervals": [
                    {
                        "time": "2025-01-02T00:00:00",
                        "planned": "bad",
                    }
                ],
                "start_time": "2025-01-02T00:00:00",
                "end_time": "2025-01-02T00:15:00",
                "interval_count": 1,
                "planned_cost": 1.0,
            }
        ],
        _get_total_battery_capacity=lambda: 10.0,
        _get_battery_efficiency=lambda: 0.9,
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
    )
    blocks = blocks_module.build_mode_blocks_for_tab(
        sensor,
        [{"time": "2025-01-02T00:00:00"}],
        "tomorrow",
        mode_names={0: "Home 1"},
    )
    assert blocks[0]["battery_soc_start"] == 0.0
    assert blocks[0]["battery_kwh_start"] == 0.0


def test_build_mode_blocks_for_tab_completed_mismatch():
    sensor = SimpleNamespace(
        _group_intervals_by_mode=lambda *_a, **_k: [
            {
                "mode": "Home 1",
                "intervals": [
                    {
                        "time": "2025-01-01T00:00:00",
                        "planned": {"mode": 0, "battery_kwh": 1.0},
                        "actual": {"mode": 1, "battery_kwh": 2.0},
                    }
                ],
                "start_time": "2025-01-01T00:00:00",
                "end_time": "2025-01-01T00:15:00",
                "interval_count": 1,
                "actual_cost": 1.0,
                "planned_cost": 1.2,
                "delta": -0.2,
            }
        ],
        _get_total_battery_capacity=lambda: 10.0,
        _get_battery_efficiency=lambda: 0.9,
        _config_entry=SimpleNamespace(options={"max_ups_price_czk": 4.0}),
    )
    blocks = blocks_module.build_mode_blocks_for_tab(
        sensor,
        [{"time": "2025-01-01T00:00:00"}],
        "yesterday",
        mode_names={0: "Home 1", 1: "Home 2"},
    )
    assert blocks[0]["adherence_pct"] == 0


MODE_NAMES = {0: "HOME I", 3: "HOME UPS"}


def _interval(time, planned, actual=None):
    entry = {"time": time, "planned": {"mode": planned, "net_cost": 1.0}}
    entry["actual"] = None if actual is None else {"mode": actual, "net_cost": 2.0}
    return entry


def test_today_block_does_not_merge_what_happened_with_what_is_planned():
    """Regression: actual UPS and planned UPS merged into one tile named after the past."""
    groups = group_intervals_by_mode(
        [
            _interval("2026-11-01T15:00:00", 0, 3),
            _interval("2026-11-01T15:15:00", 0, 3),
            _interval("2026-11-01T15:30:00", 3),
            _interval("2026-11-01T15:45:00", 3),
        ],
        "both",
        MODE_NAMES,
    )

    assert [(g["start_time"], g["end_time"]) for g in groups] == [
        ("15:00", "15:30"),
        ("15:30", "16:00"),
    ]


def test_completed_days_still_merge_by_mode():
    groups = group_intervals_by_mode(
        [_interval("2026-11-01T15:00:00", 0, 3), _interval("2026-11-01T15:15:00", 3, 3)],
        "completed",
        MODE_NAMES,
    )

    assert len(groups) == 1


def _costs(intervals):
    block = {}
    blocks_module._populate_mode_costs(block, {}, intervals, "both", MODE_NAMES)
    return block


def test_block_plan_is_the_prevailing_mode_not_the_first_interval():
    block = _costs(
        [
            _interval("2026-11-01T15:00:00", 3, 3),
            _interval("2026-11-01T15:15:00", 0, 3),
            _interval("2026-11-01T15:30:00", 0, 3),
        ]
    )

    assert block["mode_historical"] == "HOME UPS"
    assert block["mode_planned"] == "HOME I"
    assert block["mode_match"] is False


def test_block_without_actuals_has_nothing_to_disagree_with():
    block = _costs([_interval("2026-11-01T17:00:00", 3)])

    assert block["mode_planned"] == "HOME UPS"
    assert block["mode_match"] is True


def test_block_matches_only_when_every_interval_does():
    assert _costs([_interval("2026-11-01T15:00:00", 3, 3)])["mode_match"] is True


def _planned_interval(time, extra_cost=None):
    metrics = {} if extra_cost is None else {"home1_extra_cost_czk": extra_cost}
    return {"time": time, "planned": {"mode": 3, "decision_metrics": metrics}, "actual": None}


def test_ups_block_says_what_home_1_would_cost():
    block = {"status": "planned", "mode_planned": "HOME UPS"}

    blocks_module._apply_home1_extra_cost(
        block, [_planned_interval("07:15"), _planned_interval("07:30", 1.234)]
    )

    assert block["home1_extra_cost_czk"] == 1.23


def test_home_1_block_has_no_such_figure():
    block = {"status": "planned", "mode_planned": "HOME I"}

    blocks_module._apply_home1_extra_cost(block, [_planned_interval("14:15", 1.0)])

    assert "home1_extra_cost_czk" not in block


def test_finished_block_has_no_such_figure():
    """The tile of a finished block says what happened, not what the plan weighed."""
    block = {"status": "completed", "mode_planned": "HOME UPS"}

    blocks_module._apply_home1_extra_cost(block, [_planned_interval("07:15", 1.0)])

    assert "home1_extra_cost_czk" not in block
