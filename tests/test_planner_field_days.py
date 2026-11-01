"""Days the planner got wrong in the field, and the restraint it must keep.

Box 2206237016, 7. 9. 2026: the battery reached 22 % against a 20 % trigger and
the box force-charged 0.974 kWh at 7.87 CZK/kWh in slots the plan had left empty.
A flat ~6 CZK night came before an 8 CZK morning peak, with the day's genuinely
cheap tier only in the afternoon. A comfort layer was added to buy from that
night; it judged every slot by rules of its own.

The optimizer has no such layer. The night is bought because it pays, and flat
days buy nothing because nothing there pays.
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
    planning_min_percent: float = 22.0,
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


def _real_day() -> PlannerInputs:
    return _build_inputs(
        current_soc_kwh=4.9,  # 32 % - where the battery actually stood at 00:00
        prices=REAL_DAY_PRICES,
        solar_forecast=REAL_DAY_SOLAR,
        load_forecast=REAL_DAY_LOAD,
    )


def test_the_night_before_an_expensive_morning_is_bought():
    """6.01 CZK at night against 8.38+ in the morning pays the round trip."""
    ups = _ups_indices(plan_battery_schedule(_real_day()))

    assert any(idx < 7 for idx in ups), ups
    cheapest_night_slot = min(range(7), key=lambda i: REAL_DAY_PRICES[i])
    assert cheapest_night_slot in ups, ups


def test_nothing_is_bought_at_the_peak_prices():
    result = plan_battery_schedule(_real_day())

    assert all(REAL_DAY_PRICES[idx] < 8.0 for idx in _ups_indices(result)), [
        (idx, REAL_DAY_PRICES[idx]) for idx in _ups_indices(result)
    ]


def test_the_afternoon_cheap_tier_is_bought_for_the_evening():
    ups = _ups_indices(plan_battery_schedule(_real_day()))

    assert any(12 <= idx < 18 for idx in ups), ups


def test_the_low_point_stays_on_the_right_side_of_the_minimum():
    inputs = _real_day()
    result = plan_battery_schedule(inputs)

    assert min(s.soc_kwh for s in result.states) >= inputs.planning_min_kwh - 1e-9


# --------------------------------------------------------------------------
# the restraint that must survive
# --------------------------------------------------------------------------


def test_flat_expensive_day_still_buys_nothing():
    """Nothing to gain: every slot costs the same, so buying early only adds
    round-trip losses. Descend and let the hard floor do its job."""
    result = plan_battery_schedule(
        _build_inputs(
            current_soc_kwh=6.0,
            prices=[5.0] * 8,
            solar_forecast=[0.0] * 8,
            load_forecast=[0.1] * 8,
        )
    )

    assert _ups_indices(result) == []


def test_a_cheap_low_point_is_not_worth_pre_buying_for():
    """If the battery's low point falls in a cheap window, letting it descend
    there costs less than topping up beforehand."""
    result = plan_battery_schedule(
        _build_inputs(
            current_soc_kwh=6.0,
            prices=[6.0, 6.0, 6.0, 6.0, 1.0, 1.0, 1.0, 1.0],
            solar_forecast=[0.0] * 8,
            load_forecast=[0.1] * 8,
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
        )
    )

    assert _ups_indices(result) == []


# --------------------------------------------------------------------------
# "the sun will fix it" must not excuse a dip that comes before the sun
# --------------------------------------------------------------------------

# A bright day whose PV only starts at 08:00, drained overnight. The day's total
# solar surplus dwarfs what the battery misses, but none of it exists yet at
# 07:00, which is where the box would take over at the morning peak.
SUNRISE_PRICES = [
    6.10, 6.05, 6.00, 6.02, 6.08, 6.15, 6.60, 8.40,   # 00-07
    8.90, 8.20, 5.40, 4.60, 3.60, 3.10, 3.00, 3.20,   # 08-15
    4.10, 5.80, 7.90, 9.20, 9.90, 9.10, 8.00, 7.00,   # 16-23
]
SUNRISE_SOLAR = [0.0] * 8 + [2.6, 3.2, 3.6, 3.8, 3.8, 3.6, 3.0, 2.2, 1.2, 0.5] + [0.0] * 6
SUNRISE_LOAD = [0.45] * 8 + [1.0] * 10 + [1.1] * 6


def _sunrise_day() -> PlannerInputs:
    return _build_inputs(
        current_soc_kwh=6.4,
        prices=SUNRISE_PRICES,
        solar_forecast=SUNRISE_SOLAR,
        load_forecast=SUNRISE_LOAD,
    )


def test_solar_arriving_after_the_low_point_does_not_excuse_the_dip():
    """The day's surplus is large, but all of it lands after 08:00. The hard
    minimum still has to hold until then, and the night is where to pay for it."""
    inputs = _sunrise_day()
    result = plan_battery_schedule(inputs)

    ups = _ups_indices(result)
    assert ups, "the plan is relying on solar that has not arrived yet"
    assert all(idx < 8 for idx in ups), f"charged after sunrise: {ups}"
    assert all(SUNRISE_PRICES[idx] < 7.0 for idx in ups), [
        (idx, SUNRISE_PRICES[idx]) for idx in ups
    ]
    assert min(s.soc_kwh for s in result.states) >= inputs.planning_min_kwh - 1e-9


def test_a_transient_dip_well_clear_of_the_trigger_still_defers_to_solar():
    """The restraint that must survive: a battery that dips but stays far above
    the trigger, with solar on the way, must not buy grid for it."""
    result = plan_battery_schedule(
        _build_inputs(
            current_soc_kwh=11.0,
            prices=[3.0] * 24,
            solar_forecast=[0.0] * 9 + [3.0] * 9 + [0.0] * 6,
            load_forecast=[0.5] * 9 + [0.9] * 15,
        )
    )

    assert _ups_indices(result) == [], _ups_indices(result)
