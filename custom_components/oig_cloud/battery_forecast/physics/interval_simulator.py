"""Interval Simulator - core physics for battery simulation.

This module provides a stateless simulator for single interval calculations.
All CBB modes are implemented according to CBB_MODES_DEFINITIVE.md:

HOME I (mode=0):
    - During day: Solar → Load → Battery, deficit from Battery
    - At night: Battery discharges to cover load (same as II, III)
    - Export: Only when battery is 100% full

HOME II (mode=1):
    - During day: Solar → Load → Battery, deficit from GRID (battery untouched)
    - At night: Battery discharges (same as I, III)
    - Export: Only when battery is 100% full

HOME III (mode=2):
    - During day: ALL solar → Battery, load from GRID
    - At night: Battery discharges (same as I, II)
    - Export: Only when battery is 100% full

HOME UPS (mode=3):
    - Solar → Battery (DC/DC)
    - Load from GRID
    - Grid → Battery (AC/DC) charging enabled
    - Export: Only when battery is 100% full
"""

from dataclasses import dataclass
from ...physics import simulate_interval
from ..config import SimulatorConfig
from ..types import CBB_MODE_HOME_I, CBB_MODE_HOME_II


@dataclass(frozen=True)
class IntervalResult:
    """Result of simulating a single interval.

    All energy values are in kWh for the interval duration.
    """

    battery_end: float  # Battery SoC at end of interval (kWh)
    grid_import: float  # Energy imported from grid (kWh)
    grid_export: float  # Energy exported to grid (kWh)
    battery_charge: float  # Energy charged to battery (kWh)
    battery_discharge: float  # Energy discharged from battery (kWh)
    solar_used_direct: float  # Solar used directly for load (kWh)
    solar_to_battery: float  # Solar charged to battery (kWh)
    solar_exported: float  # Solar exported to grid (kWh)
    solar_curtailed: float  # Solar that couldn't be used (kWh)

    @property
    def net_battery_change(self) -> float:
        """Net change in battery (positive = charge, negative = discharge)."""
        return self.battery_charge - self.battery_discharge

    @property
    def net_grid_flow(self) -> float:
        """Net grid flow (positive = import, negative = export)."""
        return self.grid_import - self.grid_export


class IntervalSimulator:
    """Stateless physics simulator for single intervals.

    This class implements the core physics for all CBB modes.
    It is designed to be:
    - Stateless: All state passed as arguments
    - Pure: Same inputs always produce same outputs
    - Efficient: No logging or side effects

    Example:
        config = SimulatorConfig(max_capacity_kwh=15.36, min_capacity_kwh=3.07)
        simulator = IntervalSimulator(config)

        result = simulator.simulate(
            battery_start=10.0,
            mode=CBB_MODE_HOME_I,
            solar_kwh=2.0,
            load_kwh=0.5,
        )
        print(f"Battery: {result.battery_end:.2f} kWh")
    """

    def __init__(self, config: SimulatorConfig) -> None:
        """Initialize simulator with configuration.

        Args:
            config: SimulatorConfig with battery parameters
        """
        self.config = config

        # Cache commonly used values
        self._max = config.max_capacity_kwh
        self._min = config.min_capacity_kwh
        self._dc_dc = config.dc_dc_efficiency
        self._dc_ac = config.dc_ac_efficiency
        self._ac_dc = config.ac_dc_efficiency
        self._max_charge = config.max_charge_per_interval_kwh

    def simulate(
        self,
        battery_start: float,
        mode: int,
        solar_kwh: float,
        load_kwh: float,
        force_charge: bool = False,
    ) -> IntervalResult:
        """Simulate a single interval.

        Args:
            battery_start: Battery level at interval start (kWh)
            mode: CBB mode (0=HOME_I, 1=HOME_II, 2=HOME_III, 3=HOME_UPS)
            solar_kwh: Solar production this interval (kWh)
            load_kwh: Load consumption this interval (kWh)
            force_charge: Force grid charging (for balancing)

        Returns:
            IntervalResult with all energy flows
        """
        # Clamp inputs to valid range
        battery_start = max(0, min(battery_start, self._max))
        solar_kwh = max(0, solar_kwh)
        load_kwh = max(0, load_kwh)

        # Canonical physics lives in shared simulate_interval().
        # Note: force_charge is currently ignored because UPS physics always charges.
        charge_efficiency = self._ac_dc
        discharge_efficiency = self._dc_ac

        flows = simulate_interval(
            mode=mode,
            solar_kwh=solar_kwh,
            load_kwh=load_kwh,
            battery_soc_kwh=battery_start,
            capacity_kwh=self._max,
            hw_min_capacity_kwh=self._min,
            charge_efficiency=charge_efficiency,
            discharge_efficiency=discharge_efficiency,
            home_charge_rate_kwh_15min=self._max_charge,
        )

        if mode in (CBB_MODE_HOME_I, CBB_MODE_HOME_II):
            solar_used_direct = min(solar_kwh, load_kwh)
        else:
            solar_used_direct = 0.0

        solar_to_battery = flows.solar_charge_kwh
        solar_exported = flows.grid_export_kwh
        solar_curtailed = max(
            0.0,
            solar_kwh - solar_used_direct - solar_to_battery - solar_exported,
        )

        return IntervalResult(
            battery_end=flows.new_soc_kwh,
            grid_import=flows.grid_import_kwh,
            grid_export=flows.grid_export_kwh,
            battery_charge=flows.battery_charge_kwh * charge_efficiency,
            battery_discharge=flows.battery_discharge_kwh,
            solar_used_direct=solar_used_direct,
            solar_to_battery=solar_to_battery,
            solar_exported=solar_exported,
            solar_curtailed=solar_curtailed,
        )

    def calculate_cost(
        self,
        result: IntervalResult,
        spot_price: float,
        export_price: float,
    ) -> float:
        """Calculate net cost for an interval result.

        Args:
            result: IntervalResult from simulation
            spot_price: Buy price (CZK/kWh)
            export_price: Sell price (CZK/kWh)

        Returns:
            Net cost in CZK (positive = cost, negative = revenue)
        """
        import_cost = result.grid_import * spot_price
        export_revenue = result.grid_export * export_price
        return import_cost - export_revenue


# =============================================================================
# Convenience factory function
# =============================================================================


def create_simulator(
    max_capacity: float = 15.36,
    min_capacity: float = 3.07,
    **kwargs: float,
) -> IntervalSimulator:
    """Create an IntervalSimulator with given parameters.

    Args:
        max_capacity: Maximum battery capacity (kWh)
        min_capacity: HW minimum battery capacity (kWh)
        **kwargs: Additional SimulatorConfig parameters

    Returns:
        Configured IntervalSimulator
    """
    config = SimulatorConfig(
        max_capacity_kwh=max_capacity,
        min_capacity_kwh=min_capacity,
        **kwargs,
    )
    return IntervalSimulator(config)
