"""The cost of Home 1 instead of UPS reaches the slot that opens a UPS run."""

from __future__ import annotations

from types import SimpleNamespace

from custom_components.oig_cloud.battery_forecast.timeline.planner import (
    attach_planner_reasons,
)


def _decision(slots, extra_cost):
    return SimpleNamespace(
        reason="HOLD_FOR_LATER",
        charge_intervals=slots,
        evidence={"home1_extra_cost_czk": extra_cost},
    )


def test_figure_is_on_the_first_slot_only():
    """It is the cost of leaving UPS in that slot, so slots must not add it up."""
    timeline = [{"spot_price": 1.0} for _ in range(3)]

    attach_planner_reasons(timeline, [_decision([0, 1, 2], 1.5)])

    assert timeline[0]["decision_metrics"]["home1_extra_cost_czk"] == 1.5
    assert "home1_extra_cost_czk" not in timeline[1]["decision_metrics"]


def test_missing_figure_is_left_out():
    """Home 1 impossible there, for example under the minimum."""
    timeline = [{"spot_price": 1.0}]

    attach_planner_reasons(timeline, [_decision([0], None)])

    assert "home1_extra_cost_czk" not in timeline[0]["decision_metrics"]
