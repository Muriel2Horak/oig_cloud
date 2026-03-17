from __future__ import annotations

import pytest

from custom_components.oig_cloud.battery_forecast.economic_planner import (
    calculate_cost_charge_cheapest,
    calculate_cost_use_battery,
    calculate_cost_wait_for_solar,
    find_critical_moments,
    generate_plan,
    make_economic_decisions,
    plan_battery_schedule,
    simulate_home_i_detailed,
)
from custom_components.oig_cloud.battery_forecast.economic_planner_types import (
    CriticalMoment,
    Decision,
    PlannerInputs,
    PlannerResult,
    SimulatedState,
)
from custom_components.oig_cloud.battery_forecast.types import CBBMode


def _build_inputs(
    *,
    current_soc_kwh: float,
    intervals_count: int,
    prices: list[float] | None = None,
    solar_forecast: list[float] | None = None,
    load_forecast: list[float] | None = None,
    charge_rate_kw: float = 2.8,
) -> PlannerInputs:
    intervals = [{"index": i} for i in range(intervals_count)]
    return PlannerInputs(
        current_soc_kwh=current_soc_kwh,
        max_capacity_kwh=10.24,
        hw_min_kwh=2.048,
        planning_min_percent=33.0,
        charge_rate_kw=charge_rate_kw,
        intervals=intervals,
        prices=prices if prices is not None else [5.0] * intervals_count,
        solar_forecast=(solar_forecast if solar_forecast is not None else [0.0] * intervals_count),
        load_forecast=(load_forecast if load_forecast is not None else [0.0] * intervals_count),
    )


def test_simulate_home_i_tuv_heating_spike_reaches_hw_floor() -> None:
    inputs = _build_inputs(
        current_soc_kwh=3.07,
        intervals_count=16,
        solar_forecast=[0.0] * 16,
        load_forecast=([0.05] * 15) + [1.0],
    )

    states = simulate_home_i_detailed(inputs)

    assert len(states) == 16
    assert states[14].soc_kwh > inputs.hw_min_kwh
    assert states[15].soc_kwh == pytest.approx(inputs.hw_min_kwh, abs=1e-6)
    assert states[15].soc_kwh < inputs.planning_min_kwh
    assert states[15].grid_import_kwh > 0.0


@pytest.mark.parametrize(
    ("initial_soc", "expected_soc"),
    [
        (12.0, 10.24),  # nabity -> clamp to max capacity
        (3.5, 3.5),  # hladovy -> stays unchanged without load
        (0.5, 2.048),  # kriticky -> clamp up to HW minimum
    ],
)
def test_simulate_home_i_soc_boundaries(initial_soc: float, expected_soc: float) -> None:
    inputs = _build_inputs(
        current_soc_kwh=min(initial_soc, 10.24),
        intervals_count=1,
        solar_forecast=[0.0],
        load_forecast=[0.0],
    )
    inputs.current_soc_kwh = initial_soc

    state = simulate_home_i_detailed(inputs)[0]

    assert state.soc_kwh == pytest.approx(expected_soc, abs=1e-6)
    assert inputs.hw_min_kwh <= state.soc_kwh <= inputs.max_capacity_kwh


def test_simulate_home_i_edge_case_zero_solar_zero_load() -> None:
    inputs = _build_inputs(
        current_soc_kwh=6.0,
        intervals_count=4,
        prices=[3.0, 6.0, 1.0, 8.0],
        solar_forecast=[0.0, 0.0, 0.0, 0.0],
        load_forecast=[0.0, 0.0, 0.0, 0.0],
    )

    states = simulate_home_i_detailed(inputs)

    for state in states:
        assert state.soc_kwh == pytest.approx(6.0, abs=1e-6)
        assert state.grid_import_kwh == pytest.approx(0.0, abs=1e-6)
        assert state.grid_export_kwh == pytest.approx(0.0, abs=1e-6)
        assert state.cost_czk == pytest.approx(0.0, abs=1e-6)


def test_simulate_home_i_edge_case_full_battery_exports_surplus() -> None:
    inputs = _build_inputs(
        current_soc_kwh=10.24,
        intervals_count=1,
        solar_forecast=[1.2],
        load_forecast=[0.3],
    )

    state = simulate_home_i_detailed(inputs)[0]

    assert state.soc_kwh == pytest.approx(inputs.max_capacity_kwh, abs=1e-6)
    assert state.grid_import_kwh == pytest.approx(0.0, abs=1e-6)
    assert state.grid_export_kwh == pytest.approx(0.9, abs=1e-6)


def test_find_critical_moments_detects_soc_below_planning_min() -> None:
    inputs = _build_inputs(current_soc_kwh=5.0, intervals_count=4)
    states = [
        SimulatedState(0, 3.6, 0.0, 0.0, 0.0, 0.0, 0.0, 0),
        SimulatedState(1, 3.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0),
        SimulatedState(2, 3.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0),
        SimulatedState(3, 3.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0),
    ]

    moments = find_critical_moments(states, inputs)

    assert [m.interval for m in moments] == [1, 2]
    assert moments[0].type == "PLANNING_MIN"
    assert moments[0].deficit_kwh == pytest.approx(inputs.planning_min_kwh - 3.3, abs=1e-6)
    assert moments[0].intervals_needed == 1
    assert moments[0].must_start_charging == 0
    assert moments[1].deficit_kwh == pytest.approx(inputs.planning_min_kwh - 3.0, abs=1e-6)
    assert moments[1].intervals_needed == 1
    assert moments[1].must_start_charging == 1


def test_find_critical_moments_raises_when_charge_rate_per_interval_is_zero() -> None:
    inputs = _build_inputs(current_soc_kwh=5.0, intervals_count=1)
    inputs.charge_rate_kw = 0.0
    states = [
        SimulatedState(0, 3.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0),
    ]

    with pytest.raises(ZeroDivisionError):
        find_critical_moments(states, inputs)


def test_find_critical_moments_must_start_charging_never_negative() -> None:
    inputs = _build_inputs(current_soc_kwh=5.0, intervals_count=3)
    states = [
        SimulatedState(0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0),
        SimulatedState(1, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0),
        SimulatedState(2, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0),
    ]

    moments = find_critical_moments(states, inputs)

    for m in moments:
        assert m.must_start_charging >= 0


def test_planner_inputs_rejects_forecast_length_mismatch() -> None:
    with pytest.raises(ValueError, match="Forecast lengths must match intervals count"):
        _build_inputs(
            current_soc_kwh=5.0,
            intervals_count=2,
            prices=[5.0],
            solar_forecast=[0.0, 0.0],
            load_forecast=[0.0, 0.0],
        )


def test_planner_inputs_rejects_non_positive_current_soc() -> None:
    with pytest.raises(ValueError, match="Current SOC must be positive"):
        _build_inputs(current_soc_kwh=0.0, intervals_count=1)


def test_planner_inputs_rejects_current_soc_above_capacity() -> None:
    with pytest.raises(ValueError, match="Current SOC exceeds capacity"):
        PlannerInputs(
            current_soc_kwh=10.25,
            max_capacity_kwh=10.24,
            hw_min_kwh=2.048,
            planning_min_percent=33.0,
            charge_rate_kw=2.8,
            intervals=[{"index": 0}],
            prices=[5.0],
            solar_forecast=[0.0],
            load_forecast=[0.0],
        )


def test_planner_inputs_rejects_non_positive_max_capacity() -> None:
    with pytest.raises(ValueError, match="Max capacity must be positive"):
        PlannerInputs(
            current_soc_kwh=1.0,
            max_capacity_kwh=0.0,
            hw_min_kwh=0.0,
            planning_min_percent=0.0,
            charge_rate_kw=2.8,
            intervals=[{"index": 0}],
            prices=[5.0],
            solar_forecast=[0.0],
            load_forecast=[0.0],
        )


def test_planner_inputs_rejects_non_positive_charge_rate() -> None:
    with pytest.raises(ValueError, match="Charge rate must be positive"):
        _build_inputs(current_soc_kwh=5.0, intervals_count=1, charge_rate_kw=0.0)


def test_planner_inputs_rejects_planning_min_percent_above_100() -> None:
    with pytest.raises(ValueError, match="Planning min percent cannot exceed 100"):
        PlannerInputs(
            current_soc_kwh=5.0,
            max_capacity_kwh=10.24,
            hw_min_kwh=2.048,
            planning_min_percent=101.0,
            charge_rate_kw=2.8,
            intervals=[{"index": 0}],
            prices=[5.0],
            solar_forecast=[0.0],
            load_forecast=[0.0],
        )


def test_planner_inputs_rejects_negative_solar_forecast() -> None:
    with pytest.raises(ValueError, match="Solar forecast cannot be negative"):
        _build_inputs(
            current_soc_kwh=5.0,
            intervals_count=1,
            solar_forecast=[-0.1],
            load_forecast=[0.0],
        )


def test_planner_inputs_rejects_negative_load_forecast() -> None:
    with pytest.raises(ValueError, match="Load forecast cannot be negative"):
        _build_inputs(
            current_soc_kwh=5.0,
            intervals_count=1,
            solar_forecast=[0.0],
            load_forecast=[-0.1],
        )


def test_planner_inputs_allows_negative_prices() -> None:
    inputs = _build_inputs(
        current_soc_kwh=5.0,
        intervals_count=1,
        prices=[-1.25],
        solar_forecast=[0.0],
        load_forecast=[0.0],
    )

    assert inputs.prices == [-1.25]


def test_generate_plan_returns_expected_result_structure_and_cost() -> None:
    intervals_count = 96
    inputs = _build_inputs(
        current_soc_kwh=6.0,
        intervals_count=intervals_count,
        prices=[4.0] * intervals_count,
        solar_forecast=[0.0] * 40 + [0.8] * 56,
        load_forecast=[0.3] * intervals_count,
    )
    decision = Decision(
        moment=CriticalMoment(
            type="PLANNING_MIN",
            interval=20,
            deficit_kwh=0.4,
            intervals_needed=1,
            must_start_charging=19,
            soc_kwh=3.2,
        ),
        strategy="CHARGE_CHEAPEST",
        cost=1.2,
        charge_intervals=[10, 11],
    )

    result = generate_plan([decision], inputs)

    assert isinstance(result, PlannerResult)
    assert len(result.modes) == intervals_count
    assert len(result.states) == intervals_count
    assert result.decisions == [decision]
    assert result.modes[10] == CBBMode.HOME_UPS.value
    assert result.modes[11] == CBBMode.HOME_UPS.value
    assert result.modes[50] == CBBMode.HOME_I.value
    assert result.total_cost == pytest.approx(sum(state.cost_czk for state in result.states), abs=1e-6)


def test_plan_battery_schedule_ideal_day_has_no_critical_moments_and_no_ups() -> None:
    intervals_count = 96
    inputs = _build_inputs(
        current_soc_kwh=9.5,
        intervals_count=intervals_count,
        prices=[1.5] * intervals_count,
        solar_forecast=[0.9] * intervals_count,
        load_forecast=[0.2] * intervals_count,
    )

    result = plan_battery_schedule(inputs)

    assert len(result.modes) == intervals_count
    assert len(result.states) == intervals_count
    assert result.decisions == []
    assert all(mode != CBBMode.HOME_UPS.value for mode in result.modes)
    assert all(mode == CBBMode.HOME_I.value for mode in result.modes)
    assert result.total_cost == pytest.approx(sum(state.cost_czk for state in result.states), abs=1e-6)


def test_plan_battery_schedule_critical_day_schedules_ups_charging() -> None:
    intervals_count = 96
    prices = [12.0] * intervals_count
    prices[0:4] = [4.0, 4.0, 4.0, 4.0]
    inputs = _build_inputs(
        current_soc_kwh=4.0,
        intervals_count=intervals_count,
        prices=prices,
        solar_forecast=[0.0] * intervals_count,
        load_forecast=[0.5] * intervals_count,
    )

    result = plan_battery_schedule(inputs)

    assert len(result.modes) == intervals_count
    assert len(result.states) == intervals_count
    assert len(result.decisions) > 0
    assert any(decision.strategy == "CHARGE_CHEAPEST" for decision in result.decisions)
    assert any(mode == CBBMode.HOME_UPS.value for mode in result.modes)
    assert result.total_cost > 0.0


def test_plan_battery_schedule_detects_tuv_heating_spike_as_critical() -> None:
    intervals_count = 96
    load_forecast = [0.0] * intervals_count
    load_forecast[60] = 1.0
    inputs = _build_inputs(
        current_soc_kwh=3.5,
        intervals_count=intervals_count,
        prices=[6.0] * intervals_count,
        solar_forecast=[0.0] * intervals_count,
        load_forecast=load_forecast,
    )

    result = plan_battery_schedule(inputs)

    assert len(result.decisions) > 0
    assert any(decision.moment.interval == 60 for decision in result.decisions)
    assert result.total_cost >= 0.0


def test_plan_battery_schedule_emergency_mode_falls_back_when_planning_fails() -> None:
    intervals_count = 96
    solar_forecast = [0.0] * intervals_count
    solar_forecast[10] = 0.6
    inputs = _build_inputs(
        current_soc_kwh=3.0,
        intervals_count=intervals_count,
        prices=[5.0] * intervals_count,
        solar_forecast=solar_forecast,
        load_forecast=[0.5] + ([0.0] * (intervals_count - 1)),
    )
    inputs.charge_rate_kw = 0.0

    result = plan_battery_schedule(inputs)

    assert isinstance(result, PlannerResult)
    assert len(result.modes) == intervals_count
    assert len(result.states) == intervals_count
    assert result.decisions == []
    assert result.modes[0] == CBBMode.HOME_I.value
    assert result.modes[10] == CBBMode.HOME_I.value
    assert all(mode in (CBBMode.HOME_I.value,) for mode in result.modes)


def test_plan_battery_schedule_logs_error_on_exception(caplog: pytest.LogCaptureFixture) -> None:
    import logging
    from unittest.mock import patch

    inputs = _build_inputs(
        current_soc_kwh=3.0,
        intervals_count=96,
        prices=[5.0] * 96,
        solar_forecast=[0.0] * 96,
        load_forecast=[0.5] * 96,
    )

    with patch(
        "custom_components.oig_cloud.battery_forecast.economic_planner.simulate_home_i_detailed",
        side_effect=ValueError("Test error"),
    ):
        with caplog.at_level(logging.ERROR):
            result = plan_battery_schedule(inputs)

    assert len(caplog.records) >= 1
    error_log = next(r for r in caplog.records if r.levelno == logging.ERROR)
    assert "Economic planning failed:" in error_log.message
    assert "Test error" in error_log.message

    assert isinstance(result, PlannerResult)
    assert len(result.modes) == 96
    assert result.decisions == []


def test_calculate_cost_use_battery_returns_zero_when_moment_out_of_range() -> None:
    inputs = _build_inputs(current_soc_kwh=5.0, intervals_count=2)
    moment = CriticalMoment(
        type="PLANNING_MIN",
        interval=2,
        deficit_kwh=0.2,
        intervals_needed=1,
        must_start_charging=1,
        soc_kwh=3.0,
    )

    assert calculate_cost_use_battery(moment, inputs) == 0.0


def test_calculate_cost_use_battery_uses_current_soc_when_moment_soc_is_none() -> None:
    inputs = _build_inputs(
        current_soc_kwh=6.0,
        intervals_count=2,
        prices=[4.0, 4.0],
        solar_forecast=[0.0, 0.0],
        load_forecast=[0.0, 0.0],
    )
    moment = CriticalMoment(
        type="PLANNING_MIN",
        interval=0,
        deficit_kwh=0.2,
        intervals_needed=1,
        must_start_charging=0,
        soc_kwh=None,
    )

    assert calculate_cost_use_battery(moment, inputs) == pytest.approx(0.0, abs=1e-6)


def test_calculate_cost_wait_for_solar_returns_infinity_when_no_solar_surplus() -> None:
    inputs = _build_inputs(
        current_soc_kwh=5.0,
        intervals_count=3,
        solar_forecast=[0.0, 0.1, 0.2],
        load_forecast=[0.5, 0.5, 0.5],
    )
    moment = CriticalMoment(
        type="PLANNING_MIN",
        interval=0,
        deficit_kwh=0.1,
        intervals_needed=1,
        must_start_charging=0,
        soc_kwh=3.0,
    )

    assert calculate_cost_wait_for_solar(moment, inputs) == float("inf")


def test_calculate_cost_wait_for_solar_uses_current_soc_when_moment_soc_is_none() -> None:
    inputs = _build_inputs(
        current_soc_kwh=7.0,
        intervals_count=4,
        prices=[8.0, 8.0, 1.0, 1.0],
        solar_forecast=[0.0, 0.0, 1.2, 0.0],
        load_forecast=[0.4, 0.4, 0.2, 0.2],
    )
    moment = CriticalMoment(
        type="PLANNING_MIN",
        interval=0,
        deficit_kwh=0.3,
        intervals_needed=1,
        must_start_charging=0,
        soc_kwh=None,
    )

    cost = calculate_cost_wait_for_solar(moment, inputs)

    assert cost >= 0.0
    assert cost < float("inf")


def test_calculate_cost_charge_cheapest_handles_invalid_ranges_and_breaks_when_filled() -> None:
    inputs = _build_inputs(
        current_soc_kwh=5.0,
        intervals_count=3,
        prices=[5.0, 1.0, 7.0],
        solar_forecast=[0.0, 0.0, 0.0],
        load_forecast=[0.0, 0.0, 0.0],
    )

    zero_cost, zero_intervals = calculate_cost_charge_cheapest(0, 1, 0.0, inputs)
    assert zero_cost == 0.0
    assert zero_intervals == []

    bounded_cost, bounded_intervals = calculate_cost_charge_cheapest(10, 12, 1.0, inputs)
    assert bounded_cost == 0.0
    assert bounded_intervals == []

    cost, intervals = calculate_cost_charge_cheapest(0, 3, 0.1, inputs)
    assert intervals == [1]
    assert cost == pytest.approx(0.1 / 0.882, rel=1e-6)


def test_make_economic_decisions_emergency_when_all_strategies_non_finite() -> None:
    from unittest.mock import patch

    inputs = _build_inputs(current_soc_kwh=5.0, intervals_count=2)
    moment = CriticalMoment(
        type="PLANNING_MIN",
        interval=0,
        deficit_kwh=0.5,
        intervals_needed=1,
        must_start_charging=0,
        soc_kwh=3.0,
    )

    with (
        patch(
            "custom_components.oig_cloud.battery_forecast.economic_planner.calculate_cost_use_battery",
            return_value=float("inf"),
        ),
        patch(
            "custom_components.oig_cloud.battery_forecast.economic_planner.calculate_cost_charge_cheapest",
            return_value=(float("inf"), []),
        ),
        patch(
            "custom_components.oig_cloud.battery_forecast.economic_planner.calculate_cost_wait_for_solar",
            return_value=float("inf"),
        ),
    ):
        decisions = make_economic_decisions([moment], inputs)

    assert len(decisions) == 1
    assert decisions[0].strategy == "USE_BATTERY"
    assert decisions[0].reason == "EMERGENCY_NO_FINITE_STRATEGY"
    assert decisions[0].cost == float("inf")


def test_generate_plan_raises_on_safety_validation_failure() -> None:
    from unittest.mock import patch

    inputs = _build_inputs(current_soc_kwh=5.0, intervals_count=1)
    unsafe_state = SimulatedState(
        interval_index=0,
        soc_kwh=inputs.hw_min_kwh * 0.9,
        solar_kwh=0.0,
        load_kwh=0.0,
        grid_import_kwh=0.0,
        grid_export_kwh=0.0,
        cost_czk=0.0,
        mode=CBBMode.HOME_I.value,
    )

    with patch(
        "custom_components.oig_cloud.battery_forecast.economic_planner._simulate_with_modes",
        return_value=[unsafe_state],
    ):
        with pytest.raises(ValueError, match="Safety validation failed"):
            generate_plan([], inputs)
