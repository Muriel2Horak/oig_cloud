"""Tests for battery_forecast module."""

from datetime import datetime, timedelta

import pytest


# Test imports work
def test_types_import():
    """Test that types module imports correctly."""
    from custom_components.oig_cloud.battery_forecast.types import (
        CBB_MODE_HOME_I,
        CBB_MODE_HOME_II,
        CBB_MODE_HOME_III,
        CBB_MODE_HOME_UPS,
        CBB_MODE_NAMES,
        get_mode_name,
        is_charging_mode,
    )

    assert CBB_MODE_HOME_I == 0
    assert CBB_MODE_HOME_II == 1
    assert CBB_MODE_HOME_III == 2
    assert CBB_MODE_HOME_UPS == 3

    assert get_mode_name(0) == "HOME I"
    assert get_mode_name(3) == "HOME UPS"

    assert is_charging_mode(3) is True
    assert is_charging_mode(0) is False


def test_simulator_basic():
    """Test basic SoC simulation."""
    from custom_components.oig_cloud.battery_forecast.timeline.simulator import (
        SoCSimulator,
    )
    from custom_components.oig_cloud.battery_forecast.types import (
        CBB_MODE_HOME_III,
        CBB_MODE_HOME_UPS,
    )

    sim = SoCSimulator(
        max_capacity=15.0,
        min_capacity=3.0,
        charge_rate_kw=2.8,
        efficiency=0.88,
    )

    # Test single interval - HOME III: ALL solar → battery, load from GRID
    # Per CBB_MODES_DEFINITIVE.md:
    # - HOME III during day: ALL solar goes to battery, load comes from grid
    result = sim.simulate_interval(
        battery_start=10.0,
        mode=CBB_MODE_HOME_III,
        solar_kwh=0.5,
        consumption_kwh=0.2,
    )

    # Battery should increase (solar goes to battery)
    assert result.battery_end > 10.0
    # Grid import should equal consumption (HOME III uses grid for load)
    assert result.grid_import == 0.2

    # Test UPS charging
    result = sim.simulate_interval(
        battery_start=10.0,
        mode=CBB_MODE_HOME_UPS,
        solar_kwh=0.0,
        consumption_kwh=0.2,
        force_charge=True,
    )

    # Battery should increase from grid charging
    assert result.battery_end > 10.0
    assert result.grid_import > 0.0


def test_simulator_timeline():
    """Test full timeline simulation."""
    from custom_components.oig_cloud.battery_forecast.timeline.simulator import (
        SoCSimulator,
    )
    from custom_components.oig_cloud.battery_forecast.types import (
        CBB_MODE_HOME_III,
        CBB_MODE_HOME_UPS,
    )

    sim = SoCSimulator(
        max_capacity=15.0,
        min_capacity=3.0,
        charge_rate_kw=2.8,
        efficiency=0.88,
    )

    # 6 intervals: 2 UPS, 4 HOME III
    modes = [
        CBB_MODE_HOME_UPS,
        CBB_MODE_HOME_UPS,
        CBB_MODE_HOME_III,
        CBB_MODE_HOME_III,
        CBB_MODE_HOME_III,
        CBB_MODE_HOME_III,
    ]
    solar = [0.0, 0.0, 0.5, 1.0, 0.5, 0.0]
    consumption = [0.2, 0.2, 0.3, 0.3, 0.3, 0.3]

    trajectory, imports, exports = sim.simulate_timeline(
        initial_battery=8.0,
        modes=modes,
        solar_forecast=solar,
        consumption_forecast=consumption,
    )

    assert len(trajectory) == 6
    assert trajectory[0] == 8.0  # Start
    assert trajectory[1] > 8.0  # After first UPS
    assert sum(imports) > 0  # Some grid import


def test_mode_selector():
    """Test mode selection logic."""
    from custom_components.oig_cloud.battery_forecast.optimizer.modes import (
        ModeSelector,
    )
    from custom_components.oig_cloud.battery_forecast.types import (
        CBB_MODE_HOME_I,
        CBB_MODE_HOME_III,
        CBB_MODE_HOME_UPS,
    )

    selector = ModeSelector(
        max_capacity=15.0,
        min_capacity=3.0,
        target_capacity=12.0,
    )

    # Test balancing takes priority
    mode, reason = selector.select_mode(
        solar_kwh=0.5,
        consumption_kwh=0.2,
        battery_kwh=10.0,
        spot_price=3.0,
        avg_price=4.0,
        future_prices=[4.0, 5.0],
        is_balancing=True,
    )
    assert mode == CBB_MODE_HOME_UPS
    assert "balancing" in reason.lower()

    # Test no solar uses grid
    mode, reason = selector.select_mode(
        solar_kwh=0.0,
        consumption_kwh=0.2,
        battery_kwh=10.0,
        spot_price=3.0,
        avg_price=4.0,
        future_prices=[4.0, 5.0],
    )
    assert mode == CBB_MODE_HOME_I


def test_hybrid_optimizer_basic():
    """Test HYBRID optimizer basic functionality."""
    from custom_components.oig_cloud.battery_forecast.optimizer.hybrid import (
        HybridOptimizer,
    )

    optimizer = HybridOptimizer(
        max_capacity=15.0,
        min_capacity=3.0,
        target_capacity=12.0,
        charge_rate_kw=2.8,
        efficiency=0.88,
    )

    # Create simple test data
    now = datetime.now()
    spot_prices = [
        {"time": (now + timedelta(minutes=i * 15)).isoformat(), "price": 3.0 + (i % 4)}
        for i in range(24)  # 6 hours
    ]
    solar = [0.0] * 8 + [0.5, 1.0, 1.5, 1.5, 1.0, 0.5] + [0.0] * 10
    consumption = [0.2] * 24

    result = optimizer.optimize(
        current_capacity=10.0,
        spot_prices=spot_prices,
        solar_forecast=solar,
        load_forecast=consumption,
    )

    assert "modes" in result
    assert len(result["modes"]) == 24
    assert result["total_cost_czk"] >= 0
    assert "modes_distribution" in result


def test_balancing_executor():
    """Test balancing executor."""
    from zoneinfo import ZoneInfo

    from custom_components.oig_cloud.battery_forecast.balancing.executor import (
        BalancingExecutor,
    )

    executor = BalancingExecutor(
        max_capacity=15.0,
        charge_rate_kw=2.8,
    )

    # Use timezone-aware datetime (executor uses dt_util.as_local)
    tz = ZoneInfo("Europe/Prague")
    now = datetime.now(tz)

    # Test plan parsing
    plan = executor.parse_plan(
        {
            "holding_start": (now + timedelta(hours=3)).isoformat(),
            "holding_end": (now + timedelta(hours=6)).isoformat(),
            "charging_intervals": [],
            "reason": "test",
        }
    )

    assert plan is not None
    assert plan.reason == "test"

    # Test apply balancing
    # 24 intervals of 15 min = 6 hours total
    # holding_start at 2 hours = interval 8
    # holding_end at 4 hours = interval 16
    modes = [0] * 24  # All HOME I
    spot_prices = [
        {"time": (now + timedelta(minutes=i * 15)).isoformat(), "price": 3.0}
        for i in range(24)
    ]

    result = executor.apply_balancing(
        modes=modes,
        spot_prices=spot_prices,
        current_battery=10.0,
        balancing_plan={
            "holding_start": (now + timedelta(hours=2)).isoformat(),
            "holding_end": (now + timedelta(hours=4)).isoformat(),
        },
    )

    # Should add UPS intervals for charging and holding
    assert result.total_ups_added > 0
    # Holding should cover intervals 8-15 (2h to 4h)
    assert len(result.holding_intervals) > 0


def test_timeline_builder():
    """Test timeline builder."""
    from custom_components.oig_cloud.battery_forecast.timeline.builder import (
        TimelineBuilder,
    )

    builder = TimelineBuilder(
        max_capacity=15.0,
        min_capacity=3.0,
    )

    now = datetime.now()

    # Build single interval
    interval = builder.build_interval(
        timestamp=now,
        battery_kwh=10.0,
        mode=2,
        solar_kwh=0.5,
        consumption_kwh=0.3,
        spot_price=3.5,
    )

    assert interval["battery_kwh"] == 10.0
    assert interval["mode"] == 2
    assert interval["mode_name"] == "HOME III"

    # Build full timeline
    spot_prices = [
        {"time": (now + timedelta(minutes=i * 15)).isoformat(), "price": 3.0}
        for i in range(4)
    ]

    timeline = builder.build_timeline(
        spot_prices=spot_prices,
        modes=[0, 0, 2, 2],
        battery_trajectory=[10.0, 10.5, 11.0, 10.8],
        solar_forecast=[0.5, 0.5, 0.5, 0.5],
        consumption_forecast=[0.2, 0.2, 0.2, 0.2],
    )

    assert len(timeline) == 4
    assert timeline[0]["mode"] == 0


def test_orchestrator():
    """Test full orchestrator flow."""
    from custom_components.oig_cloud.battery_forecast import (
        BatteryForecastOrchestrator,
        ForecastConfig,
        calculate_battery_forecast,
    )

    now = datetime.now()

    # Create realistic test data - 24 intervals (6 hours)
    spot_prices = [
        {
            "time": (now + timedelta(minutes=i * 15)).isoformat(),
            "price": 2.5 + abs(i - 12) / 3,
        }
        for i in range(24)
    ]

    # Morning solar ramp
    solar = (
        [0.0] * 4
        + [0.1, 0.3, 0.5, 0.8, 1.2, 1.5, 1.5, 1.2, 0.8, 0.5, 0.3, 0.1]
        + [0.0] * 8
    )
    consumption = [0.25] * 24

    # Test with convenience function
    result = calculate_battery_forecast(
        current_capacity=8.0,
        max_capacity=15.36,
        min_capacity=3.0,
        target_capacity=12.0,
        spot_prices=spot_prices,
        solar_forecast=solar,
        load_forecast=consumption,
    )

    assert len(result.modes) == 24
    assert len(result.timeline) == 24
    assert result.total_cost_czk >= 0
    assert result.algorithm == "HYBRID"

    # Test with config
    config = ForecastConfig(
        max_capacity=15.36,
        min_capacity=3.0,
        target_capacity=12.0,
        use_balancing=True,
    )

    orchestrator = BatteryForecastOrchestrator(config)

    # Test with balancing plan
    balancing_plan = {
        "holding_start": (now + timedelta(hours=2)).isoformat(),
        "holding_end": (now + timedelta(hours=4)).isoformat(),
        "reason": "test_balancing",
    }

    result_with_bal = orchestrator.calculate_forecast(
        current_capacity=8.0,
        spot_prices=spot_prices,
        solar_forecast=solar,
        load_forecast=consumption,
        balancing_plan=balancing_plan,
    )

    assert result_with_bal.balancing_applied
    assert result_with_bal.balancing_reason == "test_balancing"

    # Test to_dict()
    result_dict = result.to_dict()
    assert "modes" in result_dict
    assert "total_cost_czk" in result_dict
    assert "balancing_applied" in result_dict


if __name__ == "__main__":
    # Run tests
    test_types_import()
    print("✅ test_types_import passed")

    test_simulator_basic()
    print("✅ test_simulator_basic passed")

    test_simulator_timeline()
    print("✅ test_simulator_timeline passed")

    test_mode_selector()
    print("✅ test_mode_selector passed")

    test_timeline_builder()
    print("✅ test_timeline_builder passed")

    test_balancing_executor()
    print("✅ test_balancing_executor passed")

    test_hybrid_optimizer_basic()
    print("✅ test_hybrid_optimizer_basic passed")

    test_orchestrator()
    print("✅ test_orchestrator passed")

    print("\n🎉 All tests passed!")
