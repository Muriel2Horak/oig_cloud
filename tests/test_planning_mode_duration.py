"""Regression coverage for minimum mode duration with production labels."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from custom_components.oig_cloud.battery_forecast.planning import forecast_update, mode_guard
from custom_components.oig_cloud.battery_forecast.planning.mode_guard import (
    enforce_min_mode_duration,
)
from custom_components.oig_cloud.battery_forecast.types import (
    CBB_MODE_NAMES,
    MIN_MODE_DURATION,
)


@pytest.mark.parametrize(
    ("modes", "expected"),
    [
        pytest.param([3, 0, 0], [3, 0, 0], id="keep-single-initial-ups-slot"),
        pytest.param([0, 3, 0, 0], [0, 3, 0, 0], id="keep-single-later-ups-slot"),
        pytest.param([3, 0, 3, 0], [3, 0, 3, 0], id="keep-separate-ups-slots"),
        pytest.param([3, 3, 0, 1, 2], [3, 3, 0, 1, 2], id="keep-valid-durations"),
        pytest.param([0, 1, 2], [0, 1, 2], id="keep-other-single-slot-modes"),
        pytest.param([0, 3], [0, 3], id="keep-forecast-horizon"),
        pytest.param([], [], id="empty-plan"),
    ],
)
def test_production_duration_policy(modes: list[int], expected: list[int]) -> None:
    """A five-minute guard must not stretch 15-minute UPS slots to 30 minutes."""
    original = modes.copy()

    result = enforce_min_mode_duration(
        modes, mode_names=CBB_MODE_NAMES, min_mode_duration=MIN_MODE_DURATION
    )

    assert result == expected
    assert modes == original


@pytest.mark.parametrize(
    ("mode_names", "durations", "modes", "expected"),
    [
        pytest.param(
            CBB_MODE_NAMES,
            {"Home UPS": 2},
            [3, 0, 0],
            [3, 3, 0],
            id="mixed-case-custom-policy",
        ),
        pytest.param(
            {3: "Charging", 0: "Idle"},
            {"Charging": 3},
            [3, 0, 0, 0],
            [3, 3, 3, 0],
            id="custom-ups-duration",
        ),
        pytest.param(
            {3: "Home UPS", 0: "Home 1"},
            {"Home UPS": 1},
            [3, 0, 0],
            [3, 0, 0],
            id="custom-single-slot-ups",
        ),
        pytest.param(
            {0: "Home 1", 1: "Home 2"},
            {"Home 2": 2},
            [0, 1, 0, 0],
            [0, 0, 0, 0],
            id="custom-other-mode-duration",
        ),
        pytest.param(
            {3: "UPS", 0: "Idle"},
            {"UPS": 3, "ups": 1},
            [3, 0, 0, 0],
            [3, 3, 3, 0],
            id="exact-custom-label-takes-precedence",
        ),
    ],
)
def test_custom_duration_policy_is_preserved(
    mode_names: dict[int, str],
    durations: dict[str, int],
    modes: list[int],
    expected: list[int],
) -> None:
    """Custom durations and exact label matches retain their existing meaning."""
    result = enforce_min_mode_duration(
        modes, mode_names=mode_names, min_mode_duration=durations
    )

    assert result == expected


def test_default_plan_lock_allows_replanning_after_five_minutes():
    start = datetime(2026, 9, 13, 12, 0, tzinfo=timezone.utc)
    prices = [{"time": start.isoformat()}]
    until, modes = mode_guard.build_plan_lock(
        now=start, spot_prices=prices, modes=[3],
        mode_guard_minutes=forecast_update.MODE_GUARD_MINUTES,
        plan_lock_until=None, plan_lock_modes=None,
    )
    _, revised = mode_guard.build_plan_lock(
        now=start + timedelta(minutes=5), spot_prices=prices, modes=[0],
        mode_guard_minutes=forecast_update.MODE_GUARD_MINUTES,
        plan_lock_until=until, plan_lock_modes=modes,
    )
    assert revised == {start.isoformat(): 0}
