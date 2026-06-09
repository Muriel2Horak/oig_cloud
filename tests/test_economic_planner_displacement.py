"""Focused unit tests for the LOCKED displacement algorithm (F1 core).

Covers the EXPENSIVE_IMPORT classifier and the displacement loop added to
economic_planner.py:

  * cheap-night / expensive-morning  -> pre-charges ahead of the peak
  * sunny day before peak            -> defers to PV (no grid pre-charge)
  * all-cheap day                    -> no economic charging
  * all-expensive day                -> only safety-floor defense (no η-gated charge)
  * η-gate boundary                  -> charge only when cheap/η < expensive
  * empty PV                         -> still classifies / displaces correctly
"""
from __future__ import annotations

from typing import List

from custom_components.oig_cloud.battery_forecast.economic_planner import (
    find_expensive_import_moments,
    plan_battery_schedule,
    simulate_home_i_detailed,
    _percentile_threshold,
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
    max_capacity_kwh: float = 10.24,
    hw_min_kwh: float = 2.048,
    planning_min_percent: float = 20.0,
    expensive_percentile: float = 0.70,
    round_trip_efficiency: float = 0.85,
) -> PlannerInputs:
    n = len(prices)
    intervals: List[IntervalData] = [{"index": i} for i in range(n)]
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
        expensive_percentile=expensive_percentile,
        round_trip_efficiency=round_trip_efficiency,
    )


def _count_ups(result) -> int:
    return sum(1 for m in result.modes if m == CBBMode.HOME_UPS.value)


def _ups_indices(result) -> List[int]:
    return [i for i, m in enumerate(result.modes) if m == CBBMode.HOME_UPS.value]


# ---------------------------------------------------------------------------
# Percentile helper
# ---------------------------------------------------------------------------


def test_percentile_threshold_basic() -> None:
    values = [1.0, 2.0, 3.0, 4.0, 5.0]
    # P=0.0 -> min, P=1.0 -> max.
    assert _percentile_threshold(values, 0.0) == 1.0
    assert _percentile_threshold(values, 1.0) == 5.0
    # P=0.5 -> median.
    assert _percentile_threshold(values, 0.5) == 3.0


def test_percentile_threshold_empty_is_inf() -> None:
    assert _percentile_threshold([], 0.7) == float("inf")


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------


def test_expensive_import_classifier_flags_high_price_imports() -> None:
    # 8 intervals: first 4 cheap (no import because battery full), last 4
    # expensive with load forcing grid import once the battery drains.
    prices = [1.0, 1.0, 1.0, 1.0, 9.0, 9.0, 9.0, 9.0]
    solar = [0.0] * 8
    load = [0.5, 0.5, 0.5, 0.5, 2.0, 2.0, 2.0, 2.0]
    inputs = _build_inputs(
        current_soc_kwh=3.0,
        prices=prices,
        solar_forecast=solar,
        load_forecast=load,
    )
    baseline = simulate_home_i_detailed(inputs)
    moments = find_expensive_import_moments(baseline, inputs)

    assert moments, "expected at least one expensive import moment"
    # All flagged moments must be in the expensive (>= P-th percentile) region
    # and have a positive baseline import.
    for m in moments:
        assert m.type == "EXPENSIVE_IMPORT"
        assert m.price_czk is not None and m.price_czk >= 8.0
        assert m.deficit_kwh > 0.0


# ---------------------------------------------------------------------------
# Cheap-night / expensive-morning -> pre-charges
# ---------------------------------------------------------------------------


def test_cheap_night_expensive_morning_precharges() -> None:
    # Night (cheap) then morning peak (expensive), no PV. Battery would drain
    # and import expensively in the morning -> planner should pre-charge at night.
    prices = [1.0] * 8 + [10.0] * 8
    solar = [0.0] * 16
    load = [0.6] * 16
    inputs = _build_inputs(
        current_soc_kwh=3.0,
        prices=prices,
        solar_forecast=solar,
        load_forecast=load,
    )
    result = plan_battery_schedule(inputs)

    ups = _ups_indices(result)
    assert ups, "expected pre-charging UPS intervals"
    # Pre-charge must happen in the cheap night window (indices < 8).
    assert all(i < 8 for i in ups), f"pre-charge must be in cheap window, got {ups}"


# ---------------------------------------------------------------------------
# Sunny day before peak -> defers to PV
# ---------------------------------------------------------------------------


def test_sunny_day_before_peak_defers_to_pv() -> None:
    # Cheap morning with abundant solar surplus that will refill the battery,
    # then an expensive evening. PV-first guard should skip grid pre-charge.
    prices = [2.0] * 8 + [10.0] * 8
    solar = [4.0] * 8 + [0.0] * 8  # large surplus over load in the cheap window
    load = [0.5] * 16
    inputs = _build_inputs(
        current_soc_kwh=4.0,
        prices=prices,
        solar_forecast=solar,
        load_forecast=load,
    )
    result = plan_battery_schedule(inputs)

    # Solar surplus covers headroom, so no grid pre-charge should be scheduled.
    assert _count_ups(result) == 0, f"expected PV deferral, got UPS at {_ups_indices(result)}"


# ---------------------------------------------------------------------------
# All-cheap day -> no economic charging
# ---------------------------------------------------------------------------


def test_all_cheap_day_no_economic_charging() -> None:
    # Flat cheap prices: there is no "expensive" interval to displace, and SOC
    # stays above the floor -> no UPS at all.
    prices = [2.0] * 16
    solar = [0.0] * 16
    load = [0.4] * 16
    inputs = _build_inputs(
        current_soc_kwh=8.0,
        prices=prices,
        solar_forecast=solar,
        load_forecast=load,
    )
    baseline = simulate_home_i_detailed(inputs)
    # No expensive imports flagged on a flat price day where the percentile
    # threshold equals the flat price but battery covers the load.
    result = plan_battery_schedule(inputs)
    assert _count_ups(result) == 0


# ---------------------------------------------------------------------------
# All-expensive day -> only floor defense (no eta-gated economic charge)
# ---------------------------------------------------------------------------


def test_all_expensive_day_only_floor_defense() -> None:
    # Flat expensive prices. The η-gate (cheap/η < expensive) can never pass
    # because cheap == expensive, so displacement must NOT charge. SOC starts
    # below planning_min, so the safety floor MUST still charge (no η-gate).
    prices = [10.0] * 12
    solar = [0.0] * 12
    load = [0.7] * 12
    inputs = _build_inputs(
        current_soc_kwh=2.1,  # just above hw_min, below planning_min
        prices=prices,
        solar_forecast=solar,
        load_forecast=load,
        planning_min_percent=33.0,
    )
    result = plan_battery_schedule(inputs)

    # Floor defense should kick in (SOC under planning_min on a no-PV day).
    assert _count_ups(result) >= 1, "safety floor must charge even on all-expensive day"

    # And SOC must never violate the hard safety floor.
    safety_min = inputs.hw_min_kwh * 0.95
    assert all(s.soc_kwh >= safety_min - 1e-6 for s in result.states)


def test_all_expensive_high_soc_no_charge() -> None:
    # Flat expensive prices but SOC comfortably above planning_min and no floor
    # breach: η-gate blocks economic charging, floor needs nothing -> no UPS.
    prices = [10.0] * 12
    solar = [0.0] * 12
    load = [0.2] * 12
    inputs = _build_inputs(
        current_soc_kwh=9.0,
        prices=prices,
        solar_forecast=solar,
        load_forecast=load,
    )
    result = plan_battery_schedule(inputs)
    assert _count_ups(result) == 0


# ---------------------------------------------------------------------------
# eta-gate boundary
# ---------------------------------------------------------------------------


def test_eta_gate_blocks_when_spread_too_small() -> None:
    # Spread is below the η break-even: cheap=8, expensive=9, η=0.85.
    # cheap/η = 8/0.85 = 9.41 >= 9 -> NOT economical -> no displacement charge.
    prices = [8.0] * 8 + [9.0] * 8
    solar = [0.0] * 16
    load = [0.6] * 16
    inputs = _build_inputs(
        current_soc_kwh=9.5,  # high SOC so no floor defense interferes
        prices=prices,
        solar_forecast=solar,
        load_forecast=load,
        round_trip_efficiency=0.85,
    )
    result = plan_battery_schedule(inputs)
    assert _count_ups(result) == 0, "η-gate should block uneconomical charging"


def test_eta_gate_allows_when_spread_large() -> None:
    # Wide spread: cheap=2, expensive=10, η=0.85.
    # cheap/η = 2/0.85 = 2.35 < 10 -> economical -> displacement should charge.
    prices = [2.0] * 8 + [10.0] * 8
    solar = [0.0] * 16
    load = [0.6] * 16
    inputs = _build_inputs(
        current_soc_kwh=4.0,
        prices=prices,
        solar_forecast=solar,
        load_forecast=load,
        round_trip_efficiency=0.85,
    )
    result = plan_battery_schedule(inputs)
    ups = _ups_indices(result)
    assert ups, "wide spread should trigger economic pre-charge"
    assert all(i < 8 for i in ups)


# ---------------------------------------------------------------------------
# Empty PV
# ---------------------------------------------------------------------------


def test_empty_pv_classifies_and_plans() -> None:
    # Zero PV entire horizon, cheap-then-expensive. Should behave like the
    # cheap-night/expensive-morning case (pre-charge in cheap window).
    prices = [1.0] * 6 + [12.0] * 6
    solar = [0.0] * 12
    load = [0.8] * 12
    inputs = _build_inputs(
        current_soc_kwh=3.0,
        prices=prices,
        solar_forecast=solar,
        load_forecast=load,
    )
    result = plan_battery_schedule(inputs)
    ups = _ups_indices(result)
    assert ups, "empty PV expensive horizon should pre-charge"
    assert all(i < 6 for i in ups)

    # Public contract stays stable.
    assert len(result.modes) == 12
    assert len(result.states) == 12
    assert result.total_cost >= 0.0


# ---------------------------------------------------------------------------
# Public contract / return stability
# ---------------------------------------------------------------------------


def test_public_return_shape_stable() -> None:
    prices = [3.0] * 10
    inputs = _build_inputs(
        current_soc_kwh=6.0,
        prices=prices,
        solar_forecast=[0.0] * 10,
        load_forecast=[0.3] * 10,
    )
    result = plan_battery_schedule(inputs)
    assert hasattr(result, "modes")
    assert hasattr(result, "states")
    assert hasattr(result, "total_cost")
    assert hasattr(result, "decisions")
    assert all(m in (CBBMode.HOME_I.value, CBBMode.HOME_UPS.value) for m in result.modes)


# ---------------------------------------------------------------------------
# Performance regression guard (displacement must stay ~O(n²), not O(n⁴))
# ---------------------------------------------------------------------------


def test_displacement_performance_full_horizon() -> None:
    """Worst-case full horizon must plan quickly.

    The first displacement implementation re-simulated twice per candidate,
    giving ~O(n⁴): n=96 took ~5.6 s and n=192 did not finish in ~54 s. The
    fixed loop is ~O(n²). This guard runs the production-sized horizon and a
    larger one and asserts a generous wall-clock bound so the blowup can never
    silently return.
    """
    import time

    for n in (96, 192):
        prices = [(2.0 if i % 8 < 4 else 6.0) for i in range(n)]
        inputs = _build_inputs(
            current_soc_kwh=5.0,
            prices=prices,
            solar_forecast=[0.0] * n,
            load_forecast=[0.6] * n,
        )
        started = time.perf_counter()
        result = plan_battery_schedule(inputs)
        elapsed = time.perf_counter() - started
        assert result.modes, f"n={n} produced no plan"
        assert elapsed < 3.0, f"n={n} planning too slow: {elapsed:.2f}s (perf regression)"


# ---------------------------------------------------------------------------
# Per-day percentile (a cheap day's relative peak is judged per day)
# ---------------------------------------------------------------------------


def test_per_day_percentile_flags_each_days_relative_peak() -> None:
    """A whole-horizon percentile lets a very expensive day-1 hide day-0's own
    relative peak. Per-day percentile judges each day independently."""
    n = 8
    prices = [1.0, 1.0, 1.0, 5.0, 10.0, 10.0, 10.0, 10.0]
    # battery at floor -> every interval imports from grid (grid_import > 0)
    base = dict(
        current_soc_kwh=2.048, prices=prices, solar_forecast=[0.0] * n,
        load_forecast=[0.5] * n, hw_min_kwh=2.048, planning_min_percent=20.0,
        expensive_percentile=0.70,
    )
    wh = _build_inputs(**base)
    wh_flagged = {m.interval for m in find_expensive_import_moments(
        simulate_home_i_detailed(wh), wh)}

    pd = _build_inputs(**base)
    pd.interval_days = [0, 0, 0, 0, 1, 1, 1, 1]
    pd_flagged = {m.interval for m in find_expensive_import_moments(
        simulate_home_i_detailed(pd), pd)}

    assert 3 not in wh_flagged, "whole-horizon threshold hides day-0 relative peak"
    assert 3 in pd_flagged, "per-day threshold flags day-0 relative peak"


# ---------------------------------------------------------------------------
# Regression: relative spread but no real cost benefit -> NO grid charging
# ---------------------------------------------------------------------------


def test_no_charge_when_displacement_does_not_lower_cost() -> None:
    """A gentle price ramp makes the top-percentile intervals "expensive"
    relatively, but pre-charging them from a similarly-priced earlier slot does
    not lower total cost once round-trip losses are counted. The planner must
    NOT grid-charge (this was a real bug: it charged ~7.5 kWh for 0 savings)."""
    n = 96
    # Small absolute spread (3.0 .. 3.6), no big cheap/expensive gap.
    prices = [3.0 + 0.6 * (i / (n - 1)) for i in range(n)]
    solar = [0.0] * n
    load = [0.08] * n  # total ~7.7 kWh: battery (14 -> ~6.3) never reaches floor
    inputs = _build_inputs(
        current_soc_kwh=14.0, prices=prices, solar_forecast=solar,
        load_forecast=load, max_capacity_kwh=15.36, hw_min_kwh=3.07,
        planning_min_percent=20.0, expensive_percentile=0.70,
        round_trip_efficiency=0.838,
    )
    result = plan_battery_schedule(inputs)
    assert _count_ups(result) == 0, (
        f"no cost-reducing arbitrage exists, must not grid-charge; got UPS at "
        f"{_ups_indices(result)}"
    )
