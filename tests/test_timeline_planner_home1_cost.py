"""What Home 1 would cost instead of UPS reaches every UPS slot of the timeline."""

from __future__ import annotations

from custom_components.oig_cloud.battery_forecast.timeline.planner import (
    attach_home1_extra_costs,
)


def test_each_ups_slot_gets_its_own_figure():
    """A block that starts later than its run must still have a figure."""
    timeline = [{"decision_metrics": {"planner_reason": "x"}}, {}]

    attach_home1_extra_costs(timeline, [1.2345, 2.0])

    assert timeline[0]["decision_metrics"] == {
        "planner_reason": "x",
        "home1_extra_cost_czk": 1.234,
    }
    assert timeline[1]["decision_metrics"]["home1_extra_cost_czk"] == 2.0


def test_slot_without_a_figure_stays_clean():
    timeline = [{}]

    attach_home1_extra_costs(timeline, [None])

    assert timeline == [{}]
