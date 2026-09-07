"""The comfort buffer must be able to buy in the window it protects.

Field defect (box 2206237016, 7. 9. 2026): the comfort layer exists precisely
so the battery never dwells at the BOX ``bat_min`` trigger, where the box
force-charges at whatever the price happens to be. It never fired.

Its "cheap window" test was a percentile of the WHOLE planning horizon. On a
day whose cheap tier sits in the afternoon, nothing in the night qualifies:

    30th percentile of the day   5.64 CZK
    night 00:00-08:00            5.99 - 8.61 CZK   -> zero eligible slots
    first eligible slot          09:30              -> after the morning dip

On five of nine stored days the night had zero eligible slots, and the first
one landed at 09:15-09:45 — always after the dip. So the buffer was never built
for the morning, the battery reached 22 % against a 20 % trigger, and the box
force-charged 0.974 kWh at 7.87 CZK/kWh in slots the plan had left empty.

The window that matters is the one reachable before the dip, priced against
what the exposure would otherwise cost.
"""

from __future__ import annotations

from typing import List

from custom_components.oig_cloud.battery_forecast.economic_planner import (
    plan_battery_schedule,
)
from custom_components.oig_cloud.battery_forecast.economic_planner_types import (
    IntervalData,
    PlannerInputs,
)
from custom_components.oig_cloud.battery_forecast.types import CBBMode


def _build_inputs(
    *,
    current_soc_kwh: float,
    prices: List[float],
    solar_forecast: List[float],
    load_forecast: List[float],
    charge_rate_kw: float = 2.8,
    max_capacity_kwh: float = 15.36,
    hw_min_kwh: float = 3.07,
    planning_min_percent: float = 20.0,
    comfort_soc_kwh: float = 0.0,
) -> PlannerInputs:
    intervals: List[IntervalData] = [{"index": i} for i in range(len(prices))]
    return PlannerInputs(
        current_soc_kwh=current_soc_kwh,
        max_capacity_kwh=max_capacity_kwh,
        hw_min_kwh=hw_min_kwh,
        planning_min_percent=planning_min_percent,
        charge_rate_kw=charge_rate_kw,
        intervals=intervals,
        prices=prices,
        solar_forecast=solar_forecast,
        load_forecast=load_forecast,
        expensive_percentile=0.70,
        round_trip_efficiency=0.85,
        comfort_soc_kwh=comfort_soc_kwh,
    )


def _ups_indices(result) -> List[int]:
    return [i for i, m in enumerate(result.modes) if m == CBBMode.HOME_UPS.value]


# --------------------------------------------------------------------------
# the field case, at hourly resolution
# --------------------------------------------------------------------------

# 24 hours of 7. 9. 2026: a flat ~6 CZK night, an 8 CZK morning peak, the
# day's genuinely cheap tier in the early afternoon, an expensive evening.
REAL_DAY_PRICES = [
    6.75, 6.31, 6.13, 6.01, 6.40, 6.20, 6.11, 8.38,   # 00-07
    8.89, 8.18, 5.45, 5.64, 4.76, 3.67, 3.13, 3.85,   # 08-15
    4.20, 5.90, 7.80, 9.10, 10.11, 9.40, 8.20, 7.10,  # 16-23
]
# Nothing before sunrise, a solid PV day, nothing after sunset.
REAL_DAY_SOLAR = (
    [0.0] * 7
    + [0.3, 0.9, 1.6, 2.1, 2.4, 2.5, 2.3, 1.8, 1.1, 0.6, 0.2]  # 07-17
    + [0.0] * 6
)
# The morning block is what drains the battery to the trigger.
REAL_DAY_LOAD = [
    0.45, 0.31, 0.28, 0.27, 0.24, 0.28, 0.35, 1.34,
    1.42, 1.53, 1.55, 1.72, 1.89, 1.82, 1.88, 1.93,
    2.15, 1.94, 1.02, 1.01, 0.87, 0.83, 0.73, 0.67,
]


def _real_day(comfort_soc_kwh: float) -> PlannerInputs:
    return _build_inputs(
        current_soc_kwh=4.9,  # 32 % — where the battery actually stood at 00:00
        prices=REAL_DAY_PRICES,
        solar_forecast=REAL_DAY_SOLAR,
        load_forecast=REAL_DAY_LOAD,
        comfort_soc_kwh=7.68,  # 50 %, the configured default
    )


def _without_comfort() -> PlannerInputs:
    return _build_inputs(
        current_soc_kwh=4.9,
        prices=REAL_DAY_PRICES,
        solar_forecast=REAL_DAY_SOLAR,
        load_forecast=REAL_DAY_LOAD,
        comfort_soc_kwh=0.0,
    )


def test_comfort_adds_a_buffer_the_floor_defense_does_not():
    """The regression. Floor defense alone lands the projected low on the
    trigger; the comfort layer is what should lift it, and on this day it
    bought nothing at all because no night slot passed the whole-horizon
    percentile."""
    bare = _ups_indices(plan_battery_schedule(_without_comfort()))
    with_comfort = _ups_indices(plan_battery_schedule(_real_day(7.68)))

    added = sorted(set(with_comfort) - set(bare))
    assert added, (
        "comfort layer added nothing; floor defense alone charged at "
        f"{bare}"
    )
    assert any(idx < 8 for idx in added), (
        f"nothing added before the 08:00 dip; comfort added {added}"
    )


def test_comfort_keeps_the_battery_off_the_box_trigger():
    """The point of the buffer: the projected low must clear the hard floor by
    a real margin, not the two points that let the box take over."""
    inputs = _real_day(7.68)
    result = plan_battery_schedule(inputs)

    lowest = min(state.soc_kwh for state in result.states)
    assert lowest > inputs.hw_min_kwh * 1.25, (
        f"projected low {lowest:.2f} kWh sits on the {inputs.hw_min_kwh:.2f} kWh floor"
    )


def test_comfort_never_pays_more_than_the_exposure_would_cost():
    bare = set(_ups_indices(plan_battery_schedule(_without_comfort())))
    result = plan_battery_schedule(_real_day(7.68))

    for idx in _ups_indices(result):
        if idx in bare:
            continue  # floor defense buys at any price, by design
        assert REAL_DAY_PRICES[idx] < 8.0, (
            f"bought comfort at {REAL_DAY_PRICES[idx]:.2f} CZK in slot {idx}"
        )


def test_comfort_prefers_the_cheapest_slot_of_the_reachable_window():
    """The afternoon's 3.13 CZK cannot serve an 08:00 dip. Among the slots that
    can, the cheapest must be taken first."""
    bare = set(_ups_indices(plan_battery_schedule(_without_comfort())))
    with_comfort = _ups_indices(plan_battery_schedule(_real_day(7.68)))
    added_night = [i for i in sorted(set(with_comfort) - bare) if i < 8]

    assert added_night
    reachable = [i for i in range(8) if i not in bare]
    cheapest = min(reachable, key=lambda i: REAL_DAY_PRICES[i])
    assert cheapest in added_night, (
        f"cheapest reachable night slot {cheapest} "
        f"({REAL_DAY_PRICES[cheapest]:.2f}) skipped; comfort took {added_night}"
    )


# --------------------------------------------------------------------------
# the restraint that must survive
# --------------------------------------------------------------------------


def test_flat_expensive_day_still_buys_nothing():
    """Nothing to gain: every slot costs what the exposure costs, so buying
    early only adds round-trip losses. Descend and let the hard floor do its
    job."""
    result = plan_battery_schedule(
        _build_inputs(
            current_soc_kwh=6.0,
            prices=[5.0] * 8,
            solar_forecast=[0.0] * 8,
            load_forecast=[0.1] * 8,
            comfort_soc_kwh=8.0,
        )
    )

    assert _ups_indices(result) == []


def test_a_cheap_exposure_is_not_worth_pre_buying_for():
    """If the battery's low point falls in a cheap window, letting it descend
    there costs less than topping up beforehand."""
    result = plan_battery_schedule(
        _build_inputs(
            current_soc_kwh=6.0,
            prices=[6.0, 6.0, 6.0, 6.0, 1.0, 1.0, 1.0, 1.0],
            solar_forecast=[0.0] * 8,
            load_forecast=[0.1] * 8,
            comfort_soc_kwh=8.0,
        )
    )

    assert all(idx >= 4 for idx in _ups_indices(result)), _ups_indices(result)


def test_solar_recovery_still_wins_over_grid():
    result = plan_battery_schedule(
        _build_inputs(
            current_soc_kwh=4.0,
            prices=[1.0] * 8,
            solar_forecast=[2.0] * 8,
            load_forecast=[0.5] * 8,
            comfort_soc_kwh=8.0,
        )
    )

    assert _ups_indices(result) == []


def test_comfort_disabled_leaves_the_plan_untouched():
    """comfort_soc_kwh = 0 must be exactly the old behaviour."""
    off = _ups_indices(plan_battery_schedule(_without_comfort()))
    on = _ups_indices(plan_battery_schedule(_real_day(7.68)))

    assert set(off).issubset(set(on))
    assert len(off) < len(on)
