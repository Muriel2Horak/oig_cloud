"""Home UPS kept out of slots where the breaker belongs to the car or boiler."""

from __future__ import annotations

from typing import List, Optional

import pytest

from custom_components.oig_cloud.battery_forecast import economic_planner as ep
from custom_components.oig_cloud.battery_forecast.economic_planner_types import (
    PlannerInputs,
)
from custom_components.oig_cloud.battery_forecast.types import CBBMode

HOME_1 = CBBMode.HOME_I.value
UPS = CBBMode.HOME_UPS.value
CAPACITY = 15.36
HW_MIN = 0.20 * CAPACITY


def _inputs(
    prices: List[float],
    *,
    soc: float = 8.0,
    load: Optional[List[float]] = None,
    ups_allowed: Optional[List[bool]] = None,
) -> PlannerInputs:
    n = len(prices)
    return PlannerInputs(
        current_soc_kwh=soc,
        max_capacity_kwh=CAPACITY,
        hw_min_kwh=HW_MIN,
        planning_min_percent=22.0,
        charge_rate_kw=2.6,
        intervals=[{"index": i} for i in range(n)],
        prices=prices,
        solar_forecast=[0.0] * n,
        load_forecast=load if load is not None else [0.25] * n,
        export_prices=None,
        current_mode=HOME_1,
        ups_allowed=ups_allowed,
    )


def _ups(modes: List[int]) -> List[int]:
    return [i for i, mode in enumerate(modes) if mode == UPS]


PRICES = [1.0, 1.1, 1.2, 1.3] + [8.0] * 12


def test_without_a_block_the_cheapest_slots_charge():
    result = ep.plan_battery_schedule(_inputs(PRICES))
    assert 0 in _ups(result.modes)


def test_blocked_slot_runs_home_1_and_the_charge_moves_on():
    allowed = [False] + [True] * (len(PRICES) - 1)
    free = ep.plan_battery_schedule(_inputs(PRICES))
    blocked = ep.plan_battery_schedule(_inputs(PRICES, ups_allowed=allowed))

    assert blocked.modes[0] == HOME_1
    # The other cheap slots still charge.
    assert set(_ups(blocked.modes)) == set(_ups(free.modes)) - {0}


def test_the_hard_minimum_wins_over_a_block():
    # At the floor with load and nothing allowed: Home 1 would end below the
    # hard minimum, so UPS is the only legal action there. Once a UPS slot has
    # lifted the SoC, Home 1 is legal again and the block holds.
    floor = CAPACITY * 0.22
    result = ep.plan_battery_schedule(
        _inputs([5.0] * 4, soc=floor, load=[0.5] * 4, ups_allowed=[False] * 4)
    )

    assert result.modes[0] == UPS
    for state, mode in zip(result.states, result.modes):
        assert state.soc_kwh >= floor - 1e-6
    assert HOME_1 in result.modes


def test_ups_allowed_must_match_the_horizon():
    with pytest.raises(ValueError):
        _inputs([1.0, 2.0], ups_allowed=[True])
