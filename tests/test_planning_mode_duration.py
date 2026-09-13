"""Regression coverage for minimum mode duration with production labels."""

from __future__ import annotations

import pytest

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
        pytest.param([3, 0, 0], [3, 3, 0], id="extend-initial-ups"),
        pytest.param([0, 3, 0, 0], [0, 3, 3, 0], id="extend-later-ups"),
        pytest.param([3, 0, 3, 0], [3, 3, 3, 3], id="extend-repeated-ups"),
        pytest.param([3, 3, 0, 1, 2], [3, 3, 0, 1, 2], id="keep-valid-durations"),
        pytest.param([0, 1, 2], [0, 1, 2], id="keep-other-single-slot-modes"),
        pytest.param([0, 3], [0, 3], id="keep-forecast-horizon"),
        pytest.param([], [], id="empty-plan"),
    ],
)
def test_production_duration_policy(modes: list[int], expected: list[int]) -> None:
    """Production labels must enforce UPS dwell without changing other modes."""
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
