"""Battery Planning Simulation - Core Algorithm per BR-3."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import logging

from ..const import HOME_I, HOME_II, HOME_III, HOME_UPS

_LOGGER = logging.getLogger(__name__)

# Constants per BR-0.5
TOLERANCE_KWH = 0.5  # 500Wh tolerance for floating point comparisons
FVE_SWITCH_THRESHOLD_W = 500  # Minimum FVE for mode switching HOME I/II/III
INTERVAL_MINUTES = 15  # 15min intervals
INTERVALS_PER_DAY = 96  # 24h * 4 intervals


@dataclass
class SimulationContext:
    """Simulation context containing all required parameters per BR-0."""
    
    # Hardware sensors (BR-0.1)
    battery_capacity_kwh: float  # Total battery capacity
    battery_soc_kwh: float  # Current battery SoC
    battery_efficiency: float  # Round-trip efficiency (0-1)
    ac_charging_limit_kw: float  # AC charging power limit
    
    # Configuration parameters (BR-0.2)
    min_capacity_kwh: float  # Minimum capacity (hardware + safety)
    target_capacity_kwh: float  # Target capacity for normal operation
    threshold_cheap_czk: float  # Threshold for "cheap" electricity
    
    # Pricing and forecast data
    spot_prices: Dict[datetime, float]  # CZK/kWh spot prices
    tariff_data: Dict[str, Any]  # Distribution tariff configuration
    solar_forecast: Dict[datetime, float]  # kW solar forecast
    consumption_forecast: Dict[datetime, float]  # kW consumption forecast
    
    # Boiler configuration (optional)
    boiler_enabled: bool = False
    boiler_install_power_kw: float = 0.0
    boiler_available_capacity_kwh: float = 0.0
    
    # Export limit
    export_limit_kw: float = 10.0  # Default 10kW export limit


@dataclass
class IntervalSimulation:
    """Single interval simulation result per BR-3.1."""
    
    timestamp: datetime
    mode: int  # HOME_I/II/III/UPS
    
    # Energy flows (kWh for 15min interval)
    solar_kwh: float
    consumption_kwh: float
    battery_charge_kwh: float  # Positive = charging
    battery_discharge_kwh: float  # Positive = discharging
    grid_import_kwh: float
    grid_export_kwh: float
    boiler_kwh: float  # Energy to boiler
    
    # Battery state
    battery_before_kwh: float
    battery_after_kwh: float
    
    # Cost calculation (BR-3.3)
    spot_price_czk: float
    export_price_czk: float
    tariff_distribution_czk: float
    interval_cost_czk: float  # Total cost for this interval
    
    # Metadata
    is_deficit: bool = False  # Battery hit min_capacity
    is_clamped: bool = False  # Had to add UPS to fix deficit


class BatterySimulation:
    """Battery planning simulation engine per BR-3.
    
    Implements:
    - BR-3.1: Interval simulation with all 4 CBB modes
    - BR-3.2: Energy flows (solar, grid, battery, boiler)
    - BR-3.3: Cost calculation
    - BR-3.4: Deficit fix (clamp detection)
    - BR-3.5: Mode selection logic
    - BR-3.6: Target capacity (soft for automatic, hard for manual/weather/balancing)
    - BR-3.7: Cost optimization
    """
    
    def __init__(self, context: SimulationContext):
        """Initialize simulation engine with context."""
        self.context = context
        self._logger = _LOGGER
    
    def simulate_interval(
        self,
        timestamp: datetime,
        mode: int,
        battery_before_kwh: float,
    ) -> IntervalSimulation:
        """Simulate single 15min interval with given mode.
        
        Args:
            timestamp: Interval start time
            mode: CBB mode (HOME_I/II/III/UPS)
            battery_before_kwh: Battery SoC at interval start
            
        Returns:
            IntervalSimulation with all energy flows and cost
        """
        # Get forecast data
        solar_kw = self.context.solar_forecast.get(timestamp, 0.0)
        consumption_kw = self.context.consumption_forecast.get(timestamp, 0.0)
        
        # Convert to kWh for 15min interval
        solar_kwh = solar_kw * 0.25
        consumption_kwh = consumption_kw * 0.25
        
        # Get pricing
        spot_price = self.context.spot_prices.get(timestamp, 0.0)
        export_price = spot_price * 0.8  # TODO: Get from config
        tariff_dist = self._get_distribution_tariff(timestamp)
        
        # Simulate mode behavior per BR-1
        result = self._simulate_mode_behavior(
            mode=mode,
            solar_kwh=solar_kwh,
            consumption_kwh=consumption_kwh,
            battery_before_kwh=battery_before_kwh,
        )
        
        # Calculate cost per BR-3.3
        cost = self._calculate_interval_cost(
            grid_import_kwh=result["grid_import_kwh"],
            grid_export_kwh=result["grid_export_kwh"],
            spot_price=spot_price,
            export_price=export_price,
            tariff_dist=tariff_dist,
        )
        
        # Check for deficit
        is_deficit = result["battery_after_kwh"] < self.context.min_capacity_kwh
        
        return IntervalSimulation(
            timestamp=timestamp,
            mode=mode,
            solar_kwh=solar_kwh,
            consumption_kwh=consumption_kwh,
            battery_charge_kwh=result["battery_charge_kwh"],
            battery_discharge_kwh=result["battery_discharge_kwh"],
            grid_import_kwh=result["grid_import_kwh"],
            grid_export_kwh=result["grid_export_kwh"],
            boiler_kwh=result["boiler_kwh"],
            battery_before_kwh=battery_before_kwh,
            battery_after_kwh=result["battery_after_kwh"],
            spot_price_czk=spot_price,
            export_price_czk=export_price,
            tariff_distribution_czk=tariff_dist,
            interval_cost_czk=cost,
            is_deficit=is_deficit,
        )
    
    def _simulate_mode_behavior(
        self,
        mode: int,
        solar_kwh: float,
        consumption_kwh: float,
        battery_before_kwh: float,
    ) -> Dict[str, float]:
        """Simulate CBB mode behavior per BR-1.
        
        Returns dict with:
        - battery_charge_kwh
        - battery_discharge_kwh
        - grid_import_kwh
        - grid_export_kwh
        - boiler_kwh
        - battery_after_kwh
        """
        # Initialize flows
        battery_charge = 0.0
        battery_discharge = 0.0
        grid_import = 0.0
        grid_export = 0.0
        boiler = 0.0
        
        # Calculate net energy
        net_energy = solar_kwh - consumption_kwh
        
        if mode == HOME_I:
            # HOME I: FVE→spotřeba, přebytek→baterie, deficit→baterie, baterie prázdná→síť
            if net_energy > 0:
                # Surplus: charge battery
                available_capacity = self.context.battery_capacity_kwh - battery_before_kwh
                charge_power = min(net_energy, available_capacity, self._get_max_charge_15min())
                battery_charge = charge_power
                
                # Remaining surplus
                remaining = net_energy - battery_charge
                if remaining > 0:
                    # Export or boiler
                    boiler, grid_export = self._distribute_surplus(remaining)
            else:
                # Deficit: discharge battery
                deficit = abs(net_energy)
                available_discharge = max(0, battery_before_kwh - self.context.min_capacity_kwh)
                discharge_power = min(deficit, available_discharge)
                battery_discharge = discharge_power
                
                # Remaining deficit from grid
                grid_import = deficit - battery_discharge
        
        elif mode == HOME_II:
            # HOME II: FVE→spotřeba, přebytek→baterie, deficit→síť (šetři baterii)
            if net_energy > 0:
                # Surplus: charge battery (same as HOME I)
                available_capacity = self.context.battery_capacity_kwh - battery_before_kwh
                charge_power = min(net_energy, available_capacity, self._get_max_charge_15min())
                battery_charge = charge_power
                
                remaining = net_energy - battery_charge
                if remaining > 0:
                    boiler, grid_export = self._distribute_surplus(remaining)
            else:
                # Deficit: ALL from grid (don't discharge battery)
                grid_import = abs(net_energy)
        
        elif mode == HOME_III:
            # HOME III: FVE→baterie priorita, přebytek→export, spotřeba→síť
            if solar_kwh > 0:
                # All solar to battery first
                available_capacity = self.context.battery_capacity_kwh - battery_before_kwh
                charge_power = min(solar_kwh, available_capacity, self._get_max_charge_15min())
                battery_charge = charge_power
                
                # Remaining solar surplus
                remaining_solar = solar_kwh - battery_charge
                if remaining_solar > 0:
                    boiler, grid_export = self._distribute_surplus(remaining_solar)
            
            # Consumption from grid
            grid_import = consumption_kwh
        
        elif mode == HOME_UPS:
            # HOME UPS: vše ze sítě, baterie nabíjí
            grid_import = consumption_kwh
            
            # Charge battery from grid
            available_capacity = self.context.battery_capacity_kwh - battery_before_kwh
            charge_power = min(
                available_capacity,
                self._get_max_charge_15min(),
                self.context.ac_charging_limit_kw * 0.25,  # AC charging limit
            )
            battery_charge = charge_power
            grid_import += battery_charge  # Additional import for charging
            
            # Solar goes to battery or export
            if solar_kwh > 0:
                remaining_capacity = available_capacity - battery_charge
                solar_to_battery = min(solar_kwh, remaining_capacity)
                battery_charge += solar_to_battery
                
                remaining_solar = solar_kwh - solar_to_battery
                if remaining_solar > 0:
                    boiler_solar, export_solar = self._distribute_surplus(remaining_solar)
                    boiler += boiler_solar
                    grid_export += export_solar
        
        # Apply efficiency to battery charging
        if battery_charge > 0:
            battery_charge *= self.context.battery_efficiency
        
        # Calculate final battery state
        battery_after = battery_before_kwh + battery_charge - battery_discharge
        battery_after = max(0, min(battery_after, self.context.battery_capacity_kwh))
        
        return {
            "battery_charge_kwh": battery_charge,
            "battery_discharge_kwh": battery_discharge,
            "grid_import_kwh": grid_import,
            "grid_export_kwh": grid_export,
            "boiler_kwh": boiler,
            "battery_after_kwh": battery_after,
        }
    
    def _distribute_surplus(self, surplus_kwh: float) -> Tuple[float, float]:
        """Distribute surplus energy between boiler and grid export.
        
        Returns (boiler_kwh, export_kwh)
        """
        if not self.context.boiler_enabled:
            # No boiler: all to export
            export = min(surplus_kwh, self.context.export_limit_kw * 0.25)
            return 0.0, export
        
        # Boiler priority
        boiler_capacity = self.context.boiler_available_capacity_kwh
        boiler_power_limit = self.context.boiler_install_power_kw * 0.25
        to_boiler = min(surplus_kwh, boiler_capacity, boiler_power_limit)
        
        # Remaining to export
        remaining = surplus_kwh - to_boiler
        to_export = min(remaining, self.context.export_limit_kw * 0.25)
        
        return to_boiler, to_export
    
    def _get_max_charge_15min(self) -> float:
        """Get maximum battery charge in 15min interval (kWh)."""
        # Typically limited by inverter AC power
        return self.context.ac_charging_limit_kw * 0.25
    
    def _calculate_interval_cost(
        self,
        grid_import_kwh: float,
        grid_export_kwh: float,
        spot_price: float,
        export_price: float,
        tariff_dist: float,
    ) -> float:
        """Calculate interval cost per BR-3.3.
        
        cost = import * (spot + tariff) - export * export_price
        """
        import_cost = grid_import_kwh * (spot_price + tariff_dist)
        export_revenue = grid_export_kwh * export_price
        return import_cost - export_revenue
    
    def _get_distribution_tariff(self, timestamp: datetime) -> float:
        """Get distribution tariff for given timestamp (CZK/kWh)."""
        # TODO: Implement tariff logic from config
        # For now, return simple default
        hour = timestamp.hour
        if 7 <= hour < 22:
            return 0.5  # High tariff
        else:
            return 0.2  # Low tariff
    
    def select_optimal_mode(
        self,
        timestamp: datetime,
        battery_soc_kwh: float,
        context_type: str = "automatic",
    ) -> int:
        """Select optimal mode for interval per BR-3.5.
        
        Args:
            timestamp: Interval timestamp
            battery_soc_kwh: Current battery SoC
            context_type: "automatic", "manual", "weather", or "balancing"
            
        Returns:
            Optimal CBB mode (HOME_I/II/III/UPS)
        """
        solar_kw = self.context.solar_forecast.get(timestamp, 0.0)
        consumption_kw = self.context.consumption_forecast.get(timestamp, 0.0)
        spot_price = self.context.spot_prices.get(timestamp, 0.0)
        
        solar_kwh = solar_kw * 0.25
        consumption_kwh = consumption_kw * 0.25
        
        # Check if FVE produces anything meaningful
        has_fve = solar_kw > (FVE_SWITCH_THRESHOLD_W / 1000)
        
        # Calculate surplus/deficit
        net_energy = solar_kwh - consumption_kwh
        
        # Decision logic per BR-3.5
        
        if not has_fve:
            # Night/no FVE
            if spot_price < self.context.threshold_cheap_czk:
                # Cheap hour: charge with UPS
                return HOME_UPS
            elif battery_soc_kwh > self.context.min_capacity_kwh + TOLERANCE_KWH:
                # Can discharge
                return HOME_I
            else:
                # Near minimum: charge
                return HOME_UPS
        
        # Has FVE
        if net_energy > 0:
            # Surplus
            if battery_soc_kwh < self.context.target_capacity_kwh - TOLERANCE_KWH:
                # Need to charge: HOME III (max FVE to battery)
                return HOME_III
            else:
                # Already at target: HOME I (normal operation)
                return HOME_I
        else:
            # Deficit
            # Check if worth switching from HOME I
            if not has_fve or solar_kw < (FVE_SWITCH_THRESHOLD_W / 1000):
                # Too small FVE: don't bother switching
                if battery_soc_kwh > self.context.min_capacity_kwh + TOLERANCE_KWH:
                    return HOME_I
                else:
                    return HOME_UPS
            
            # Larger FVE: check if expensive hour
            if spot_price > self.context.threshold_cheap_czk:
                # Expensive: save battery for later (HOME II)
                return HOME_II
            elif battery_soc_kwh > self.context.min_capacity_kwh + TOLERANCE_KWH:
                # Can discharge: HOME I
                return HOME_I
            else:
                # Need charge: HOME III or UPS
                if has_fve:
                    return HOME_III
                else:
                    return HOME_UPS
    
    def optimize_plan(
        self,
        start_time: datetime,
        end_time: datetime,
        target_soc_kwh: Optional[float] = None,
        target_time: Optional[datetime] = None,
        holding_hours: Optional[int] = None,
        holding_mode: Optional[int] = None,
        context_type: str = "automatic",
    ) -> List[IntervalSimulation]:
        """Optimize battery plan for given time range per BR-3.
        
        Args:
            start_time: Plan start
            end_time: Plan end
            target_soc_kwh: Target SoC to reach (optional for automatic)
            target_time: Time to reach target (required if target_soc set)
            holding_hours: Hours to hold after target (optional)
            holding_mode: Mode for holding (required if holding_hours set)
            context_type: "automatic", "manual", "weather", or "balancing"
            
        Returns:
            List of interval simulations
        """
        self._logger.info(
            f"Optimizing plan: {start_time} - {end_time}, "
            f"context={context_type}, target={target_soc_kwh}, "
            f"target_time={target_time}, holding={holding_hours}h"
        )
        
        # Generate time intervals
        intervals = self._generate_intervals(start_time, end_time)
        
        # Simulated plan
        plan: List[IntervalSimulation] = []
        current_soc = self.context.battery_soc_kwh
        
        # Determine if target is HARD constraint
        is_hard_target = context_type in ["manual", "weather", "balancing"]
        
        # First pass: select modes
        for ts in intervals:
            # Check if in holding period
            if holding_hours and target_time:
                holding_end = target_time + timedelta(hours=holding_hours)
                if target_time <= ts < holding_end:
                    # In holding: use holding_mode
                    mode = holding_mode or HOME_III
                else:
                    # Normal mode selection
                    mode = self.select_optimal_mode(ts, current_soc, context_type)
            else:
                mode = self.select_optimal_mode(ts, current_soc, context_type)
            
            # Simulate interval
            sim = self.simulate_interval(ts, mode, current_soc)
            plan.append(sim)
            current_soc = sim.battery_after_kwh
        
        # BR-3.4: Deficit fix (clamp detection)
        plan = self._fix_deficits(plan)
        
        # BR-3.6: Target capacity constraint
        if target_soc_kwh and target_time:
            plan = self._enforce_target_constraint(
                plan, target_soc_kwh, target_time, is_hard=is_hard_target
            )
        
        return plan
    
    def _generate_intervals(
        self, start_time: datetime, end_time: datetime
    ) -> List[datetime]:
        """Generate 15min interval timestamps."""
        intervals = []
        current = start_time.replace(minute=(start_time.minute // 15) * 15, second=0, microsecond=0)
        
        while current < end_time:
            intervals.append(current)
            current += timedelta(minutes=INTERVAL_MINUTES)
        
        return intervals
    
    def _fix_deficits(self, plan: List[IntervalSimulation]) -> List[IntervalSimulation]:
        """Fix deficits by inserting UPS intervals per BR-3.4."""
        # Re-simulate with deficit fixes
        fixed_plan = []
        current_soc = self.context.battery_soc_kwh
        
        for sim in plan:
            # Check if this interval would cause deficit
            if sim.battery_after_kwh < self.context.min_capacity_kwh:
                # Calculate deficit
                deficit = self.context.min_capacity_kwh - sim.battery_after_kwh
                
                # Add UPS charging before this interval
                # For simplicity, use current interval timestamp
                # In production, should find cheapest prior interval
                ups_sim = self.simulate_interval(sim.timestamp, HOME_UPS, current_soc)
                ups_sim.is_clamped = True
                fixed_plan.append(ups_sim)
                current_soc = ups_sim.battery_after_kwh
            
            # Re-simulate original interval with updated SoC
            new_sim = self.simulate_interval(sim.timestamp, sim.mode, current_soc)
            fixed_plan.append(new_sim)
            current_soc = new_sim.battery_after_kwh
        
        return fixed_plan
    
    def _enforce_target_constraint(
        self,
        plan: List[IntervalSimulation],
        target_soc_kwh: float,
        target_time: datetime,
        is_hard: bool,
    ) -> List[IntervalSimulation]:
        """Enforce target capacity constraint per BR-3.6."""
        # Find target interval
        target_idx = None
        for idx, sim in enumerate(plan):
            if sim.timestamp >= target_time:
                target_idx = idx
                break
        
        if target_idx is None:
            self._logger.warning(f"Target time {target_time} not in plan")
            return plan
        
        # Check if target is reached
        target_sim = plan[target_idx]
        if abs(target_sim.battery_after_kwh - target_soc_kwh) < TOLERANCE_KWH:
            # Already at target
            return plan
        
        if is_hard:
            # HARD constraint: MUST reach target
            # This requires more sophisticated algorithm (backtracking, optimization)
            # For MVP, log error
            self._logger.error(
                f"HARD target not reached: expected {target_soc_kwh}, "
                f"got {target_sim.battery_after_kwh} at {target_time}"
            )
            # TODO: Implement proper constraint solver
        else:
            # SOFT constraint: best effort
            # Already doing best effort in mode selection
            pass
        
        return plan
