"""SoC Simulator - simulates battery state of charge over time.

This module provides battery simulation with mode-aware physics:
- HOME I: Grid priority, battery preserved
- HOME II: Battery priority, no discharge
- HOME III: Solar priority, battery discharges for load
- HOME UPS: AC charging enabled, load from grid
"""

import logging
from dataclasses import dataclass
from typing import List, Optional, Tuple

from ..types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
    DEFAULT_EFFICIENCY,
    DEFAULT_CHARGE_RATE_KW,
    INTERVAL_MINUTES,
)

_LOGGER = logging.getLogger(__name__)


@dataclass
class SimulationResult:
    """Result of a single interval simulation."""

    battery_end: float  # Battery at end of interval
    grid_import: float  # kWh imported from grid
    grid_export: float  # kWh exported to grid
    battery_charge: float  # kWh charged to battery
    battery_discharge: float  # kWh discharged from battery
    solar_used: float  # kWh solar used directly
    solar_to_battery: float  # kWh solar to battery
    solar_exported: float  # kWh solar exported


class SoCSimulator:
    """Simulates battery state of charge with mode-aware physics.

    Supports all CBB modes with proper efficiency modeling:
    - DC/DC (solar to battery): 95% efficiency
    - DC/AC (battery to load): 88.2% efficiency
    - AC/DC (grid to battery): 95% efficiency

    Example:
        simulator = SoCSimulator(
            max_capacity=15.36,
            min_capacity=3.38,
            charge_rate_kw=2.8,
            efficiency=0.882,
        )

        trajectory = simulator.simulate_timeline(
            initial_battery=10.0,
            modes=[3, 3, 2, 2, 0, 0],  # HOME UPS, UPS, III, III, I, I
            solar_forecast=[0, 0, 0.5, 1.0, 0.5, 0],
            consumption_forecast=[0.2, 0.2, 0.3, 0.3, 0.2, 0.2],
            spot_prices=[...],
        )
    """

    def __init__(
        self,
        max_capacity: float,
        min_capacity: float,
        charge_rate_kw: float = DEFAULT_CHARGE_RATE_KW,
        efficiency: float = DEFAULT_EFFICIENCY,
        interval_minutes: int = INTERVAL_MINUTES,
    ) -> None:
        """Initialize simulator.

        Args:
            max_capacity: Maximum battery capacity (kWh)
            min_capacity: Minimum usable capacity / user reserve (kWh)
            charge_rate_kw: AC charging rate (kW)
            efficiency: Round-trip efficiency (DC/AC)
            interval_minutes: Simulation interval in minutes
        """
        self.max_capacity = max_capacity
        self.min_capacity = min_capacity
        self.charge_rate_kw = charge_rate_kw
        self.efficiency = efficiency
        self.interval_minutes = interval_minutes

        # Derived values
        self.interval_hours = interval_minutes / 60.0
        self.max_charge_per_interval = charge_rate_kw * self.interval_hours

        # Efficiency factors
        self.dc_dc_efficiency = 0.95  # Solar to battery
        self.ac_dc_efficiency = 0.95  # Grid to battery
        self.dc_ac_efficiency = efficiency  # Battery to load (typ. 88.2%)

    def simulate_interval(
        self,
        battery_start: float,
        mode: int,
        solar_kwh: float,
        consumption_kwh: float,
        force_charge: bool = False,
    ) -> SimulationResult:
        """Simulate a single interval.

        Args:
            battery_start: Battery level at interval start (kWh)
            mode: Operating mode (0-3)
            solar_kwh: Solar production this interval (kWh)
            consumption_kwh: Load consumption this interval (kWh)
            force_charge: Force charging even if battery not low

        Returns:
            SimulationResult with end state and energy flows
        """
        battery = battery_start
        grid_import = 0.0
        grid_export = 0.0
        battery_charge = 0.0
        battery_discharge = 0.0
        solar_used = 0.0
        solar_to_battery = 0.0
        solar_exported = 0.0

        if mode == CBB_MODE_HOME_UPS:
            # HOME UPS: AC charging enabled, load from grid
            # Solar → battery (DC/DC)
            # Load → grid (not battery!)
            # Grid → battery (AC/DC) if space available

            # Solar goes to battery
            battery_space = self.max_capacity - battery
            solar_charge = min(solar_kwh * self.dc_dc_efficiency, battery_space)
            battery += solar_charge
            solar_to_battery = solar_kwh if solar_charge > 0 else 0
            solar_exported = max(0, solar_kwh - solar_to_battery)

            # Load from grid (100% efficiency)
            grid_import += consumption_kwh

            # Grid charging if space and either forced or economical
            if force_charge or battery < self.max_capacity - 0.1:
                battery_space = self.max_capacity - battery
                charge_amount = min(
                    self.max_charge_per_interval,
                    battery_space / self.ac_dc_efficiency,
                )
                if charge_amount > 0.01:
                    grid_import += charge_amount
                    battery += charge_amount * self.ac_dc_efficiency
                    battery_charge = charge_amount * self.ac_dc_efficiency

        elif mode == CBB_MODE_HOME_I:
            # HOME I: Battery discharge for load coverage
            # Per CBB_MODES_DEFINITIVE.md:
            # - FVE > 0: Solar → load, excess → battery, deficit → BATTERY
            # - FVE = 0: BATTERY discharges to cover load (down to 20% SoC)
            # In night (no solar): HOME I/II/III are IDENTICAL - all discharge!

            if solar_kwh >= consumption_kwh:
                # Solar covers load
                solar_used = consumption_kwh
                excess_solar = solar_kwh - consumption_kwh

                # Excess goes to battery
                battery_space = self.max_capacity - battery
                to_battery = min(excess_solar * self.dc_dc_efficiency, battery_space)
                battery += to_battery
                solar_to_battery = excess_solar if to_battery > 0 else 0

                # Any remaining is exported
                solar_exported = excess_solar - solar_to_battery
                if solar_exported > 0:
                    grid_export = solar_exported
            else:
                # Solar doesn't cover load - use BATTERY first (same as HOME III!)
                solar_used = solar_kwh
                load_deficit = consumption_kwh - solar_kwh

                # Battery provides (with efficiency loss)
                available_from_battery = (
                    battery - self.min_capacity
                ) * self.dc_ac_efficiency
                from_battery = min(load_deficit, max(0, available_from_battery))

                if from_battery > 0:
                    actual_drain = from_battery / self.dc_ac_efficiency
                    battery -= actual_drain
                    battery_discharge = actual_drain

                # Remaining from grid (when battery empty)
                remaining_deficit = load_deficit - from_battery
                if remaining_deficit > 0.001:
                    grid_import = remaining_deficit

        elif mode == CBB_MODE_HOME_II:
            # HOME II: Battery priority during day, discharge at night
            # Per CBB_MODES_DEFINITIVE.md:
            # - FVE > 0, FVE >= load: Solar covers, excess → battery
            # - FVE > 0, FVE < load: Grid supplements, battery UNTOUCHED
            # - FVE = 0: Battery DISCHARGES (same as HOME I/III in night!)

            if solar_kwh >= consumption_kwh:
                # Solar covers load completely
                solar_used = consumption_kwh
                excess_solar = solar_kwh - consumption_kwh

                battery_space = self.max_capacity - battery
                to_battery = min(excess_solar * self.dc_dc_efficiency, battery_space)
                battery += to_battery
                solar_to_battery = excess_solar if to_battery > 0 else 0

                solar_exported = excess_solar - solar_to_battery
                if solar_exported > 0:
                    grid_export = solar_exported
            elif solar_kwh > 0.01:
                # Day with some solar but FVE < load
                # Grid supplements, battery NOT USED (special HOME II behavior)
                solar_used = solar_kwh
                grid_import = consumption_kwh - solar_kwh
            else:
                # Night (FVE = 0): Battery DISCHARGES (same as HOME I/III)
                load_deficit = consumption_kwh

                available_from_battery = (
                    battery - self.min_capacity
                ) * self.dc_ac_efficiency
                from_battery = min(load_deficit, max(0, available_from_battery))

                if from_battery > 0:
                    actual_drain = from_battery / self.dc_ac_efficiency
                    battery -= actual_drain
                    battery_discharge = actual_drain

                remaining_deficit = load_deficit - from_battery
                if remaining_deficit > 0.001:
                    grid_import = remaining_deficit

        elif mode == CBB_MODE_HOME_III:
            # HOME III: Maximum battery charging from solar
            # Per CBB_MODES_DEFINITIVE.md:
            # - FVE > 0: ALL solar → battery (unlimited), load → GRID
            # - FVE = 0: Battery DISCHARGES (same as HOME I/II)

            if solar_kwh > 0.01:
                # Day: ALL solar goes to battery, consumption from GRID
                battery_space = self.max_capacity - battery
                to_battery = min(solar_kwh * self.dc_dc_efficiency, battery_space)
                battery += to_battery
                solar_to_battery = solar_kwh if to_battery > 0 else 0
                battery_charge = to_battery

                # Export any solar that doesn't fit in battery
                solar_exported = max(0, solar_kwh - solar_to_battery)
                if solar_exported > 0:
                    grid_export = solar_exported

                # ALL consumption from grid
                grid_import = consumption_kwh
            else:
                # Night (FVE = 0): Battery DISCHARGES (same as HOME I/II)
                load_deficit = consumption_kwh

                available_from_battery = (
                    battery - self.min_capacity
                ) * self.dc_ac_efficiency
                from_battery = min(load_deficit, max(0, available_from_battery))

                if from_battery > 0:
                    actual_drain = from_battery / self.dc_ac_efficiency
                    battery -= actual_drain
                    battery_discharge = actual_drain

                remaining_deficit = load_deficit - from_battery
                if remaining_deficit > 0.001:
                    grid_import = remaining_deficit

        # Clamp battery to valid range
        battery = max(0, min(battery, self.max_capacity))

        return SimulationResult(
            battery_end=battery,
            grid_import=grid_import,
            grid_export=grid_export,
            battery_charge=battery_charge,
            battery_discharge=battery_discharge,
            solar_used=solar_used,
            solar_to_battery=solar_to_battery,
            solar_exported=solar_exported,
        )

    def simulate_timeline(
        self,
        initial_battery: float,
        modes: List[int],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        balancing_indices: Optional[set] = None,
    ) -> Tuple[List[float], List[float], List[float]]:
        """Simulate full timeline.

        Args:
            initial_battery: Starting battery level (kWh)
            modes: Mode for each interval
            solar_forecast: Solar kWh for each interval
            consumption_forecast: Consumption kWh for each interval
            balancing_indices: Indices where balancing is active (force charge)

        Returns:
            Tuple of (battery_trajectory, grid_imports, grid_exports)
            battery_trajectory contains battery at START of each interval
        """
        n = len(modes)
        balancing_indices = balancing_indices or set()

        battery_trajectory = [initial_battery]
        grid_imports = []
        grid_exports = []

        battery = initial_battery

        for i in range(n):
            mode = modes[i]
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            consumption = (
                consumption_forecast[i] if i < len(consumption_forecast) else 0.125
            )
            force_charge = i in balancing_indices

            result = self.simulate_interval(
                battery_start=battery,
                mode=mode,
                solar_kwh=solar,
                consumption_kwh=consumption,
                force_charge=force_charge,
            )

            battery = result.battery_end
            grid_imports.append(result.grid_import)
            grid_exports.append(result.grid_export)

            # Add battery state at START of next interval
            if i < n - 1:
                battery_trajectory.append(battery)

        return battery_trajectory, grid_imports, grid_exports

    def find_minimum_battery(
        self,
        initial_battery: float,
        modes: List[int],
        solar_forecast: List[float],
        consumption_forecast: List[float],
    ) -> Tuple[float, int]:
        """Find minimum battery level and when it occurs.

        Args:
            initial_battery: Starting battery level
            modes: Mode for each interval
            solar_forecast: Solar kWh for each interval
            consumption_forecast: Consumption kWh for each interval

        Returns:
            Tuple of (minimum_battery_kwh, interval_index)
        """
        trajectory, _, _ = self.simulate_timeline(
            initial_battery=initial_battery,
            modes=modes,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
        )

        min_battery = min(trajectory)
        min_index = trajectory.index(min_battery)

        return min_battery, min_index

    def calculate_required_start(
        self,
        target_end: float,
        modes: List[int],
        solar_forecast: List[float],
        consumption_forecast: List[float],
    ) -> float:
        """Calculate required starting battery to reach target end.

        Uses backward simulation to determine what starting level
        is needed to end with target_end kWh.

        Args:
            target_end: Required battery at end of timeline
            modes: Mode for each interval
            solar_forecast: Solar kWh for each interval
            consumption_forecast: Consumption kWh for each interval

        Returns:
            Required starting battery (kWh)
        """
        # Backward pass: start from target_end, work backwards
        n = len(modes)
        required = [0.0] * (n + 1)
        required[n] = target_end

        for i in range(n - 1, -1, -1):
            mode = modes[i]
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            consumption = (
                consumption_forecast[i] if i < len(consumption_forecast) else 0.125
            )

            # Reverse the energy flow
            if mode == CBB_MODE_HOME_UPS:
                # In UPS, battery only gains from solar (load from grid)
                required[i] = required[i + 1] - solar * self.dc_dc_efficiency
            elif mode == CBB_MODE_HOME_III:
                # In HOME III, battery changes based on net energy
                if solar >= consumption:
                    # Would charge
                    net_charge = (solar - consumption) * self.dc_dc_efficiency
                    required[i] = required[i + 1] - net_charge
                else:
                    # Would discharge
                    net_discharge = (consumption - solar) / self.dc_ac_efficiency
                    required[i] = required[i + 1] + net_discharge
            else:
                # HOME I/II: battery mostly preserved, only charges from excess solar
                if solar > consumption:
                    net_charge = (solar - consumption) * self.dc_dc_efficiency
                    required[i] = required[i + 1] - net_charge
                else:
                    required[i] = required[i + 1]

            # Clamp to valid range
            required[i] = min(required[i], self.max_capacity)

        return max(0, required[0])

    def estimate_charging_time(
        self,
        current_battery: float,
        target_battery: float,
        solar_kwh_per_interval: float = 0.0,
    ) -> int:
        """Estimate intervals needed to charge from current to target.

        Args:
            current_battery: Current battery level (kWh)
            target_battery: Target battery level (kWh)
            solar_kwh_per_interval: Average solar per interval

        Returns:
            Number of intervals needed
        """
        if current_battery >= target_battery:
            return 0

        deficit = target_battery - current_battery

        # Charging rate: AC charging + solar
        charge_per_interval = (
            self.max_charge_per_interval * self.ac_dc_efficiency
            + solar_kwh_per_interval * self.dc_dc_efficiency
        )

        if charge_per_interval <= 0:
            return 999  # Can't charge

        intervals = int(deficit / charge_per_interval) + 1
        return intervals
