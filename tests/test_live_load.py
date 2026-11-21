"""The planner sees the house's live load, and replans when it jumps."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from custom_components.oig_cloud.battery_forecast.planning.live_load import (
    LiveLoadTracker,
    LoadJumpDetector,
    blend_live_load,
    planned_kw_at,
)

T0 = datetime(2026, 11, 15, 6, 0, tzinfo=timezone.utc)


def _at(minutes: float) -> datetime:
    return T0 + timedelta(minutes=minutes)


def test_mean_is_time_weighted_over_the_window():
    tracker = LiveLoadTracker()
    tracker.add(_at(0), 1000.0)
    tracker.add(_at(4), 5000.0)  # 4 min at 1 kW, then 1 min at 5 kW
    assert tracker.mean_kw(_at(5), timedelta(minutes=5)) == pytest.approx(1.8)


def test_value_before_the_window_carries_into_it():
    tracker = LiveLoadTracker()
    tracker.add(_at(0), 2000.0)
    # No new reading for 10 min: the last one still holds.
    assert tracker.mean_kw(_at(10), timedelta(minutes=5)) == pytest.approx(2.0)


def test_no_mean_until_half_the_window_is_covered():
    tracker = LiveLoadTracker()
    tracker.add(_at(0), 2000.0)
    assert tracker.mean_kw(_at(2), timedelta(minutes=5)) is None
    assert tracker.mean_kw(_at(3), timedelta(minutes=5)) == pytest.approx(2.0)


def test_stale_readings_give_no_mean():
    tracker = LiveLoadTracker()
    tracker.add(_at(0), 2000.0)
    # Sensor silent for half an hour: do not pretend to know the load.
    assert tracker.mean_kw(_at(31), timedelta(minutes=5)) is None


def test_old_samples_are_dropped():
    tracker = LiveLoadTracker()
    for minute in range(0, 120, 1):
        tracker.add(_at(minute), 1000.0)
    assert len(tracker) < 40


def test_blend_puts_live_load_in_the_current_slot_and_fades_over_an_hour():
    forecast = [0.25] * 6  # 1 kW profile
    blend_live_load(forecast, 5.0)  # 5 kW live

    assert forecast[0] == pytest.approx(1.25)
    assert forecast[1] == pytest.approx(0.75 * 1.25 + 0.25 * 0.25)
    assert forecast[2] == pytest.approx(0.5 * 1.25 + 0.5 * 0.25)
    assert forecast[3] == pytest.approx(0.25 * 1.25 + 0.75 * 0.25)
    assert forecast[4:] == [0.25, 0.25]


def test_blend_also_lowers_an_overestimated_profile():
    forecast = [1.0, 1.0]
    blend_live_load(forecast, 0.4)
    assert forecast[0] == pytest.approx(0.1)


def test_detector_fires_on_a_sustained_jump_and_then_waits():
    detector = LoadJumpDetector()
    assert detector.should_replan(_at(0), live_kw=4.8, planned_kw=1.4) is True
    # Same situation a minute later: the replan is already on its way.
    assert detector.should_replan(_at(1), live_kw=4.8, planned_kw=1.4) is False
    # After the cooldown a still-unmatched plan fires again.
    assert detector.should_replan(_at(11), live_kw=4.8, planned_kw=1.4) is True


def test_detector_ignores_small_differences_and_missing_data():
    detector = LoadJumpDetector()
    assert detector.should_replan(_at(0), live_kw=2.5, planned_kw=1.4) is False
    assert detector.should_replan(_at(0), live_kw=None, planned_kw=1.4) is False
    assert detector.should_replan(_at(0), live_kw=3.0, planned_kw=None) is False


def test_detector_fires_on_a_drop_too():
    detector = LoadJumpDetector()
    assert detector.should_replan(_at(0), live_kw=0.5, planned_kw=4.0) is True


def test_planned_kw_reads_the_current_slot_of_the_timeline():
    timeline = [
        {"time": "2026-11-15T05:45:00", "load_kwh": 0.5},
        {"time": "2026-11-15T06:00:00", "load_kwh": 0.35},
        {"time": "2026-11-15T06:15:00", "load_kwh": 0.30},
    ]
    now = datetime(2026, 11, 15, 6, 7)
    assert planned_kw_at(timeline, now) == pytest.approx(1.4)
    assert planned_kw_at([], now) is None
    assert planned_kw_at(timeline, datetime(2026, 11, 15, 9, 0)) is None
