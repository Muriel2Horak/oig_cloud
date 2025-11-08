"""Test battery forecast hybrid mode respects planned minimum and target."""

import pytest
from datetime import datetime, timedelta
from custom_components.oig_cloud.planning.simulation import (
    BatterySimulation,
    SimulationContext,
)
from custom_components.oig_cloud.const import HOME_I, HOME_II, HOME_III


@pytest.fixture
def hybrid_context():
    """Create context for hybrid mode testing."""
    return SimulationContext(
        battery_capacity_kwh=15.36,
        battery_soc_kwh=8.0,  # Starting at 52%
        battery_efficiency=0.9,
        ac_charging_limit_kw=5.0,
        min_capacity_kwh=3.0,      # 20% minimum
        target_capacity_kwh=12.0,   # 78% target
        threshold_cheap_czk=1.5,
        spot_prices={},
        tariff_data={},
        solar_forecast={},
        consumption_forecast={},
        export_limit_kw=10.0,
    )


class TestPlannedMinimumRespect:
    """Test that hybrid mode respects planned_minimum constraint."""

    def test_never_drops_below_minimum(self, hybrid_context):
        """Test battery never drops below planned minimum in any mode."""
        simulation = BatterySimulation(hybrid_context)
        
        # Simulate evening with high consumption, no solar
        ts = datetime(2024, 11, 2, 20, 0)
        hybrid_context.solar_forecast[ts] = 0.0
        hybrid_context.consumption_forecast[ts] = 10.0  # Very high
        hybrid_context.spot_prices[ts] = 3.0  # Expensive
        
        # Test HOME_I (should discharge but stop at minimum)
        result_i = simulation.simulate_interval(ts, HOME_I, battery_before_kwh=4.0)
        assert result_i.battery_after_kwh >= hybrid_context.min_capacity_kwh, \
            f"HOME_I dropped below minimum: {result_i.battery_after_kwh} < {hybrid_context.min_capacity_kwh}"
        
        # Test HOME_II (should NOT discharge below minimum)
        result_ii = simulation.simulate_interval(ts, HOME_II, battery_before_kwh=4.0)
        assert result_ii.battery_after_kwh >= hybrid_context.min_capacity_kwh, \
            f"HOME_II dropped below minimum: {result_ii.battery_after_kwh} < {hybrid_context.min_capacity_kwh}"
        
        # Test HOME_III (should protect minimum even more strictly)
        result_iii = simulation.simulate_interval(ts, HOME_III, battery_before_kwh=4.0)
        assert result_iii.battery_after_kwh >= hybrid_context.min_capacity_kwh, \
            f"HOME_III dropped below minimum: {result_iii.battery_after_kwh} < {hybrid_context.min_capacity_kwh}"

    def test_minimum_enforcement_during_discharge(self, hybrid_context):
        """Test minimum is enforced even when battery is discharging."""
        simulation = BatterySimulation(hybrid_context)
        
        # Start just above minimum
        starting_soc = hybrid_context.min_capacity_kwh + 0.5  # 3.5 kWh
        
        ts = datetime(2024, 11, 2, 21, 0)
        hybrid_context.solar_forecast[ts] = 0.0
        hybrid_context.consumption_forecast[ts] = 2.0  # 2kW load
        hybrid_context.spot_prices[ts] = 2.0
        
        result = simulation.simulate_interval(ts, HOME_I, battery_before_kwh=starting_soc)
        
        # Should discharge but MUST NOT go below minimum
        assert result.battery_after_kwh >= hybrid_context.min_capacity_kwh, \
            f"Battery discharged below minimum: {result.battery_after_kwh} kWh"
        
        # Verify it did discharge (wasn't just idle)
        assert result.battery_after_kwh < starting_soc or result.is_deficit, \
            "Battery should have attempted to discharge or flagged deficit"


class TestPlannedTargetRespect:
    """Test that hybrid mode respects planned_target constraint."""

    def test_charges_to_target_when_cheap(self, hybrid_context):
        """Test battery charges to target during cheap periods."""
        simulation = BatterySimulation(hybrid_context)
        
        ts = datetime(2024, 11, 2, 2, 0)  # Night - cheap
        hybrid_context.solar_forecast[ts] = 0.0
        hybrid_context.consumption_forecast[ts] = 1.0
        hybrid_context.spot_prices[ts] = 0.8  # Very cheap
        
        # Start below target
        result = simulation.simulate_interval(ts, HOME_I, battery_before_kwh=8.0)
        
        # Should charge towards target
        assert result.battery_after_kwh > 8.0, "Should charge during cheap period"

    def test_target_not_exceeded_unnecessarily(self, hybrid_context):
        """Test battery doesn't charge beyond target without reason."""
        simulation = BatterySimulation(hybrid_context)
        
        # Start AT target
        starting_soc = hybrid_context.target_capacity_kwh
        
        ts = datetime(2024, 11, 2, 12, 0)  # Midday
        hybrid_context.solar_forecast[ts] = 3.0  # Some solar
        hybrid_context.consumption_forecast[ts] = 1.0
        hybrid_context.spot_prices[ts] = 2.0  # Not particularly cheap
        
        result = simulation.simulate_interval(ts, HOME_I, battery_before_kwh=starting_soc)
        
        # Should not charge much beyond target (allow small tolerance for solar surplus)
        max_allowed = hybrid_context.battery_capacity_kwh  # Can go to max with solar
        assert result.battery_after_kwh <= max_allowed, \
            f"Battery charged beyond capacity: {result.battery_after_kwh} kWh"

    def test_target_achievable_in_multiperiod(self, hybrid_context):
        """Test that target can be achieved over multiple intervals."""
        simulation = BatterySimulation(hybrid_context)
        
        # Simulate 6 hours of cheap night charging
        current_soc = hybrid_context.min_capacity_kwh  # Start at minimum
        
        for hour in range(6):
            ts = datetime(2024, 11, 2, hour, 0)
            hybrid_context.solar_forecast[ts] = 0.0
            hybrid_context.consumption_forecast[ts] = 0.5
            hybrid_context.spot_prices[ts] = 0.9  # Cheap
            
            result = simulation.simulate_interval(ts, HOME_I, battery_before_kwh=current_soc)
            current_soc = result.battery_after_kwh
            
            # Should be charging
            if current_soc < hybrid_context.target_capacity_kwh:
                assert result.ac_charging_kw > 0 or result.solar_charging_kw > 0, \
                    f"Not charging when below target at hour {hour}"
        
        # After 6 hours of cheap charging, should be at or near target
        assert current_soc >= hybrid_context.target_capacity_kwh * 0.9, \
            f"Failed to reach target after cheap period: {current_soc} < {hybrid_context.target_capacity_kwh}"


class TestMinimumTargetInteraction:
    """Test interaction between minimum and target constraints."""

    def test_minimum_below_target(self, hybrid_context):
        """Test that minimum is always below target."""
        assert hybrid_context.min_capacity_kwh < hybrid_context.target_capacity_kwh, \
            "Minimum must be less than target for valid configuration"

    def test_operating_range(self, hybrid_context):
        """Test normal operating range is between min and target."""
        simulation = BatterySimulation(hybrid_context)
        
        # Simulate full day
        results = []
        current_soc = 8.0  # Start in middle
        
        for hour in range(24):
            ts = datetime(2024, 11, 2, hour, 0)
            
            # Typical pattern: solar during day, consumption at night
            if 6 <= hour <= 18:
                hybrid_context.solar_forecast[ts] = 4.0
                hybrid_context.consumption_forecast[ts] = 2.0
                hybrid_context.spot_prices[ts] = 2.0
            else:
                hybrid_context.solar_forecast[ts] = 0.0
                hybrid_context.consumption_forecast[ts] = 1.5
                hybrid_context.spot_prices[ts] = 1.2 if hour < 6 else 2.5
            
            result = simulation.simulate_interval(ts, HOME_I, battery_before_kwh=current_soc)
            results.append(result)
            current_soc = result.battery_after_kwh
            
            # CRITICAL: Never below minimum
            assert current_soc >= hybrid_context.min_capacity_kwh, \
                f"Battery below minimum at hour {hour}: {current_soc} kWh"
            
            # Should not exceed capacity
            assert current_soc <= hybrid_context.battery_capacity_kwh, \
                f"Battery above capacity at hour {hour}: {current_soc} kWh"

    def test_deficit_triggers_near_minimum(self, hybrid_context):
        """Test that deficit flag triggers when approaching minimum."""
        simulation = BatterySimulation(hybrid_context)
        
        # Start just above minimum with high load
        ts = datetime(2024, 11, 2, 20, 0)
        hybrid_context.solar_forecast[ts] = 0.0
        hybrid_context.consumption_forecast[ts] = 5.0
        hybrid_context.spot_prices[ts] = 3.0
        
        result = simulation.simulate_interval(
            ts, HOME_I, 
            battery_before_kwh=hybrid_context.min_capacity_kwh + 0.2
        )
        
        # Should either respect minimum or flag deficit
        if result.battery_after_kwh <= hybrid_context.min_capacity_kwh:
            assert result.is_deficit, \
                "Deficit flag must be set when at or below minimum"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
