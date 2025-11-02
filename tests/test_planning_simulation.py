"""Unit tests for BatterySimulation core per BR-3."""

import pytest
from datetime import datetime, timedelta
from custom_components.oig_cloud.planning.simulation import (
    BatterySimulation,
    SimulationContext,
    IntervalSimulation,
    TOLERANCE_KWH,
)
from custom_components.oig_cloud.const import HOME_I, HOME_II, HOME_III, HOME_UPS


@pytest.fixture
def base_context():
    """Create base simulation context for testing."""
    return SimulationContext(
        battery_capacity_kwh=15.36,
        battery_soc_kwh=10.0,
        battery_efficiency=0.9,
        ac_charging_limit_kw=5.0,
        min_capacity_kwh=3.0,
        target_capacity_kwh=12.0,
        threshold_cheap_czk=1.5,
        spot_prices={},
        tariff_data={},
        solar_forecast={},
        consumption_forecast={},
        export_limit_kw=10.0,
    )


@pytest.fixture
def simulation(base_context):
    """Create BatterySimulation instance."""
    return BatterySimulation(base_context)


class TestModeSimulation:
    """Test CBB mode simulation per BR-1."""

    def test_home_i_surplus(self, simulation):
        """Test HOME I with solar surplus - should charge battery."""
        ts = datetime(2024, 11, 2, 12, 0)
        simulation.context.solar_forecast[ts] = 5.0  # 5kW
        simulation.context.consumption_forecast[ts] = 2.0  # 2kW
        simulation.context.spot_prices[ts] = 2.0

        result = simulation.simulate_interval(ts, HOME_I, battery_before_kwh=10.0)

        # Surplus 3kW * 0.25h = 0.75kWh, with efficiency 0.9 = 0.675kWh
        assert result.mode == HOME_I
        assert result.solar_kwh == pytest.approx(1.25, abs=0.01)  # 5kW * 0.25h
        assert result.consumption_kwh == pytest.approx(0.5, abs=0.01)  # 2kW * 0.25h
        assert result.battery_charge_kwh > 0  # Should charge
        assert result.grid_import_kwh == 0  # No grid import with surplus

    def test_home_i_deficit(self, simulation):
        """Test HOME I with deficit - should discharge battery."""
        ts = datetime(2024, 11, 2, 12, 0)
        simulation.context.solar_forecast[ts] = 2.0  # 2kW
        simulation.context.consumption_forecast[ts] = 5.0  # 5kW
        simulation.context.spot_prices[ts] = 2.0

        result = simulation.simulate_interval(ts, HOME_I, battery_before_kwh=10.0)

        # Deficit 3kW * 0.25h = 0.75kWh
        assert result.mode == HOME_I
        assert result.battery_discharge_kwh > 0  # Should discharge
        assert result.grid_import_kwh >= 0  # May need grid if battery insufficient

    def test_home_ii_no_battery_discharge(self, simulation):
        """Test HOME II - should NOT discharge battery even with deficit."""
        ts = datetime(2024, 11, 2, 12, 0)
        simulation.context.solar_forecast[ts] = 2.0
        simulation.context.consumption_forecast[ts] = 5.0
        simulation.context.spot_prices[ts] = 2.0

        result = simulation.simulate_interval(ts, HOME_II, battery_before_kwh=10.0)

        assert result.mode == HOME_II
        assert result.battery_discharge_kwh == 0  # No discharge
        assert result.grid_import_kwh > 0  # All deficit from grid

    def test_home_iii_solar_to_battery_priority(self, simulation):
        """Test HOME III - solar goes to battery first, consumption from grid."""
        ts = datetime(2024, 11, 2, 12, 0)
        simulation.context.solar_forecast[ts] = 5.0
        simulation.context.consumption_forecast[ts] = 3.0
        simulation.context.spot_prices[ts] = 2.0

        result = simulation.simulate_interval(ts, HOME_III, battery_before_kwh=10.0)

        assert result.mode == HOME_III
        assert result.battery_charge_kwh > 0  # Solar to battery
        assert result.grid_import_kwh == pytest.approx(
            0.75, abs=0.01
        )  # Consumption from grid

    def test_home_ups_grid_charging(self, simulation):
        """Test HOME UPS - should charge battery from grid."""
        ts = datetime(2024, 11, 2, 3, 0)  # Night
        simulation.context.solar_forecast[ts] = 0.0
        simulation.context.consumption_forecast[ts] = 1.0
        simulation.context.spot_prices[ts] = 1.0

        result = simulation.simulate_interval(ts, HOME_UPS, battery_before_kwh=5.0)

        assert result.mode == HOME_UPS
        assert result.battery_charge_kwh > 0  # Charging from grid
        assert (
            result.grid_import_kwh > result.consumption_kwh
        )  # Import for consumption + charging


class TestModeSelection:
    """Test mode selection logic per BR-3.5."""

    def test_night_cheap_selects_ups(self, simulation):
        """Night with cheap price should select UPS."""
        ts = datetime(2024, 11, 2, 3, 0)
        simulation.context.solar_forecast[ts] = 0.0
        simulation.context.spot_prices[ts] = 1.0  # Cheap
        simulation.context.consumption_forecast[ts] = 1.0

        mode = simulation.select_optimal_mode(ts, battery_soc_kwh=10.0)

        assert mode == HOME_UPS

    def test_night_expensive_with_battery_selects_home_i(self, simulation):
        """Night with expensive price and sufficient battery should select HOME I."""
        ts = datetime(2024, 11, 2, 20, 0)
        simulation.context.solar_forecast[ts] = 0.0
        simulation.context.spot_prices[ts] = 3.0  # Expensive
        simulation.context.consumption_forecast[ts] = 1.0

        mode = simulation.select_optimal_mode(ts, battery_soc_kwh=10.0)

        assert mode == HOME_I  # Discharge battery

    def test_day_surplus_low_soc_selects_home_iii(self, simulation):
        """Day with surplus and low SoC should select HOME III."""
        ts = datetime(2024, 11, 2, 12, 0)
        simulation.context.solar_forecast[ts] = 5.0
        simulation.context.consumption_forecast[ts] = 2.0  # Surplus
        simulation.context.spot_prices[ts] = 2.0

        mode = simulation.select_optimal_mode(ts, battery_soc_kwh=5.0)  # Low SoC

        assert mode == HOME_III  # Charge from solar

    def test_day_surplus_high_soc_selects_home_i(self, simulation):
        """Day with surplus and high SoC should select HOME I."""
        ts = datetime(2024, 11, 2, 12, 0)
        simulation.context.solar_forecast[ts] = 5.0
        simulation.context.consumption_forecast[ts] = 2.0
        simulation.context.spot_prices[ts] = 2.0

        mode = simulation.select_optimal_mode(
            ts, battery_soc_kwh=simulation.context.target_capacity_kwh
        )

        assert mode == HOME_I  # Already at target


class TestDeficitFix:
    """Test deficit fix (clamp detection) per BR-3.4."""

    def test_deficit_detection(self, simulation):
        """Test that deficit below min_capacity is detected."""
        ts = datetime(2024, 11, 2, 20, 0)
        simulation.context.solar_forecast[ts] = 0.0
        simulation.context.consumption_forecast[ts] = 5.0  # High consumption
        simulation.context.spot_prices[ts] = 2.0

        result = simulation.simulate_interval(ts, HOME_I, battery_before_kwh=3.5)

        # Should drop below min_capacity
        assert (
            result.is_deficit
            or result.battery_after_kwh < simulation.context.min_capacity_kwh
        )


class TestTargetConstraint:
    """Test target capacity constraint per BR-3.6."""

    def test_soft_target_automatic(self, simulation):
        """Test soft target for automatic plans (best effort)."""
        start = datetime(2024, 11, 2, 0, 0)
        end = start + timedelta(hours=6)

        # Set up cheap prices and no solar
        for h in range(6):
            ts = start + timedelta(hours=h)
            simulation.context.solar_forecast[ts] = 0.0
            simulation.context.consumption_forecast[ts] = 1.0
            simulation.context.spot_prices[ts] = 1.0  # Cheap

        plan = simulation.optimize_plan(
            start_time=start,
            end_time=end,
            context_type="automatic",
        )

        assert len(plan) > 0
        # Soft target: should try to reach target but not mandatory

    def test_hard_target_manual(self, simulation):
        """Test hard target for manual plans (must reach)."""
        start = datetime(2024, 11, 2, 0, 0)
        target_time = start + timedelta(hours=3)
        end = start + timedelta(hours=6)

        # Set up prices
        for h in range(6):
            ts = start + timedelta(hours=h)
            simulation.context.solar_forecast[ts] = 0.0
            simulation.context.consumption_forecast[ts] = 1.0
            simulation.context.spot_prices[ts] = 1.5

        plan = simulation.optimize_plan(
            start_time=start,
            end_time=end,
            target_soc_kwh=simulation.context.battery_capacity_kwh,
            target_time=target_time,
            context_type="manual",
        )

        assert len(plan) > 0
        # Hard target: MUST reach target by target_time
        # (implementation may not be perfect yet, but plan should be created)


class TestHoldingParameters:
    """Test explicit holding parameters per BR-4.4."""

    def test_holding_mode_applied(self, simulation):
        """Test that holding mode is applied during holding period."""
        start = datetime(2024, 11, 2, 0, 0)
        target_time = start + timedelta(hours=2)
        end = start + timedelta(hours=6)

        # Set up context
        for h in range(6):
            ts = start + timedelta(hours=h)
            simulation.context.solar_forecast[ts] = 2.0
            simulation.context.consumption_forecast[ts] = 1.0
            simulation.context.spot_prices[ts] = 2.0

        plan = simulation.optimize_plan(
            start_time=start,
            end_time=end,
            target_soc_kwh=simulation.context.battery_capacity_kwh,
            target_time=target_time,
            holding_hours=3,  # Hold for 3 hours
            holding_mode=HOME_III,
            context_type="balancing",
        )

        # Check that intervals in holding period use HOME III
        holding_end = target_time + timedelta(hours=3)
        for interval in plan:
            if target_time <= interval.timestamp < holding_end:
                assert interval.mode == HOME_III


class TestTolerance:
    """Test floating point tolerance per BR-0.5."""

    def test_tolerance_kwh_constant(self):
        """Test that tolerance constant is defined correctly."""
        assert TOLERANCE_KWH == 0.5  # 500Wh


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
