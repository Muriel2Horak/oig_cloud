"""Phase 0 of the plan-fidelity work: the stored day plan must carry the shape
of the adaptive profile instead of collapsing to a constant.

Field evidence these tests encode (box 2206237016, 6. 9. 2026):
  * the stored day plan held ONE consumption value in all 96 slots
    (0.148 kWh/15 min = 592 W) while real consumption ran 0.23-3.15 kWh/h,
  * eight other stored days held 3-6 values, matching the coarse load_avg
    windows rather than the 24-hour adaptive profile,
  * the cause is a profile-window miss that silently degraded to a scalar,
  * and ``is_baseline_plan_invalid`` accepted the result because it only ever
    rejected *zero* consumption, never *constant* consumption.
"""

from __future__ import annotations

import logging
import statistics
from datetime import date, datetime
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as forecast_update_module,
)
from custom_components.oig_cloud.battery_forecast.storage import (
    plan_storage_baseline as baseline_module,
)


class RecordingSensor:
    """Minimal stand-in that records what the code under test logged."""

    def __init__(self) -> None:
        self._log_entries: list[tuple[str, str, str]] = []
        self._box_id = "2206237016"
        self._hass = SimpleNamespace(data={})

    def _log_rate_limited(self, key, level, message, *args, **kwargs) -> None:
        self._log_entries.append((key, level, message))


# Real curve read from sensor.oig_2206237016_adaptive_load_profiles.
TOMORROW_HOURLY = [
    0.45, 0.31, 0.28, 0.27, 0.24, 0.28, 0.35, 1.34,
    1.42, 1.53, 1.55, 1.72, 1.89, 1.82, 1.88, 1.93,
    2.15, 1.94, 1.02, 1.01, 0.87, 0.83, 0.73, 0.67,
]

# The stale snapshot the midnight baseline actually saw: a remaining-hours
# window left over from before midnight, plus the scalar it degraded to.
STALE_TODAY_PROFILE = {
    "start_hour": 22,
    "hourly_consumption": [0.73, 0.67],
    "avg_kwh_h": 0.592,
}

FULL_DAY_PROFILE = {
    "start_hour": 0,
    "hourly_consumption": TOMORROW_HOURLY,
    "avg_kwh_h": 1.103,
}


# --------------------------------------------------------------------------
# 0.1 - the profile that covers the requested hour wins
# --------------------------------------------------------------------------


def test_picks_full_day_profile_when_today_window_does_not_cover_the_hour():
    """At 00:00 the ``today_profile`` still holds yesterday's tail, so asking it
    for hour 14 is meaningless. The 24-hour profile must be used instead."""
    profiles = {
        "today_profile": STALE_TODAY_PROFILE,
        "tomorrow_profile": FULL_DAY_PROFILE,
    }

    selected = forecast_update_module._select_adaptive_profile(
        profiles,
        datetime(2026, 9, 6, 14, 0),
        date(2026, 9, 6),
    )

    assert selected is FULL_DAY_PROFILE


def test_keeps_today_profile_when_it_does_cover_the_hour():
    """The live rolling forecast is correct today and must stay that way: for an
    hour the remaining-day window actually covers, that window still wins."""
    profiles = {
        "today_profile": STALE_TODAY_PROFILE,
        "tomorrow_profile": FULL_DAY_PROFILE,
    }

    selected = forecast_update_module._select_adaptive_profile(
        profiles,
        datetime(2026, 9, 6, 23, 0),
        date(2026, 9, 6),
    )

    assert selected is STALE_TODAY_PROFILE


def test_full_day_load_forecast_is_shaped_not_flat():
    """The acceptance criterion for 0.1: a whole-day resolve against a stale
    ``today_profile`` yields the adaptive shape, not one repeated number."""
    sensor = RecordingSensor()
    profiles = {
        "today_profile": STALE_TODAY_PROFILE,
        "tomorrow_profile": FULL_DAY_PROFILE,
    }

    per_slot = [
        forecast_update_module._resolve_load_kwh(
            sensor,
            datetime(2026, 9, 6, hour, minute),
            profiles,
            load_avg_sensors={},
            today=date(2026, 9, 6),
        )
        for hour in range(24)
        for minute in (0, 15, 30, 45)
    ]

    assert len(per_slot) == 96
    assert len(set(round(value, 4) for value in per_slot)) >= 20
    # Hours 0-21 come from the 24h profile, hours 22-23 from the still-valid
    # remaining-day window - both are the real curve, neither is a constant.
    assert per_slot[0] == pytest.approx(TOMORROW_HOURLY[0] / 4.0)
    assert per_slot[4 * 16] == pytest.approx(TOMORROW_HOURLY[16] / 4.0)


# --------------------------------------------------------------------------
# 0.2 - a window miss must be loud, and must not invent a flat day
# --------------------------------------------------------------------------


def test_window_miss_no_longer_returns_the_daily_average():
    """Returning ``avg_kwh_h`` for an uncovered hour is what produced the
    592 W flat line. It must return None so the caller falls back to the
    (at least shaped) load_avg windows."""
    sensor = RecordingSensor()

    value = forecast_update_module._hourly_kwh_from_profile(
        sensor,
        STALE_TODAY_PROFILE,
        datetime(2026, 9, 6, 3, 0),
    )

    assert value is None


def test_window_miss_is_logged_as_a_warning():
    """A degenerate plan produced no log line above DEBUG, so it was invisible
    in production for weeks."""
    sensor = RecordingSensor()

    forecast_update_module._hourly_kwh_from_profile(
        sensor,
        STALE_TODAY_PROFILE,
        datetime(2026, 9, 6, 3, 0),
    )

    levels = {level for _key, level, _msg in sensor._log_entries}
    assert "warning" in levels


def test_profile_without_any_hourly_series_falls_back_instead_of_flatlining():
    sensor = RecordingSensor()

    value = forecast_update_module._hourly_kwh_from_profile(
        sensor,
        {"start_hour": 0, "avg_kwh_h": 0.9},
        datetime(2026, 9, 6, 3, 0),
    )

    assert value is None


# --------------------------------------------------------------------------
# 0.3 - a constant plan is not a plan
# --------------------------------------------------------------------------


def _plan(consumption_values: list[float]) -> dict:
    return {
        "intervals": [
            {"time": f"{i // 4:02d}:{15 * (i % 4):02d}", "consumption_kwh": value}
            for i, value in enumerate(consumption_values)
        ],
        "filled_intervals": None,
    }


def test_the_real_degenerate_plan_from_6_9_is_rejected():
    """96 slots, one value: 0.148 kWh per 15 min. Today's actual stored plan."""
    assert baseline_module.is_baseline_plan_invalid(_plan([0.148] * 96)) is True


def test_a_coarse_five_window_plan_is_rejected():
    """The other eight stored days: five values, one per load_avg window. Still
    not a day plan - it must be rebuilt from the adaptive profile."""
    windows = [0.0795, 0.4313, 0.4644, 0.5108, 0.167]
    intervals = [windows[i % 5] for i in range(96)]
    assert baseline_module.is_baseline_plan_invalid(_plan(intervals)) is True


def test_a_plan_carrying_the_adaptive_shape_stays_valid():
    intervals = [TOMORROW_HOURLY[i // 4] / 4.0 for i in range(96)]
    plan = _plan(intervals)

    assert statistics.pstdev([r["consumption_kwh"] for r in plan["intervals"]]) > 0.01
    assert baseline_module.is_baseline_plan_invalid(plan) is False


def test_existing_zero_consumption_rejection_still_holds():
    assert baseline_module.is_baseline_plan_invalid(_plan([0.0] * 96)) is True
    assert baseline_module.is_baseline_plan_invalid(None) is True
    assert baseline_module.is_baseline_plan_invalid({"intervals": []}) is True


def test_logging_stays_quiet_for_a_healthy_plan(caplog):
    intervals = [TOMORROW_HOURLY[i // 4] / 4.0 for i in range(96)]
    with caplog.at_level(logging.WARNING, logger=baseline_module.__name__):
        baseline_module.is_baseline_plan_invalid(_plan(intervals))
    assert not caplog.records
