"""Configuration dataclasses for battery forecast module.

This module provides the typed configuration object for the physics layer.
"""

from dataclasses import dataclass
from enum import Enum


class NegativePriceStrategy(Enum):
    """Strategy for handling negative spot prices."""

    CURTAIL = "curtail"  # Reduce solar export (HOME III)
    CONSUME = "consume"  # Maximize self-consumption (HOME I)
    CHARGE_GRID = "charge_grid"  # Charge from grid at negative prices (HOME UPS)
    AUTO = "auto"  # Automatically select best strategy


class ChargingStrategy(Enum):
    """When to use UPS mode for grid charging."""

    CHEAPEST_ONLY = "cheapest_only"  # Only at lowest price intervals
    BELOW_THRESHOLD = "below_threshold"  # When price < threshold
    OPPORTUNISTIC = "opportunistic"  # Charge whenever economically beneficial
    DISABLED = "disabled"  # Never use UPS mode


@dataclass
class SimulatorConfig:
    """Configuration for physics simulation layer.

    Contains physical parameters that don't change during optimization.
    These are typically derived from hardware specs or sensor readings.
    """

    # Battery capacity bounds — Plan 4 Task 4 / P7: no implicit author installation value.
    # When the user's effective capacity is unknown, the dataclass is constructed with
    # ``max_capacity_kwh=None``; downstream callers MUST treat ``None`` as
    # ``unavailable`` and surface a visible warning (R5.5), not a silent fallback.
    max_capacity_kwh: float | None = None
    min_capacity_kwh: float | None = None  # HW minimum (~20% SoC)

    # Charging parameters
    charge_rate_kw: float = 2.8
    max_discharge_rate_kw: float = 5.0

    # Efficiency factors (CBB 3F Home Plus Premium specs)
    dc_dc_efficiency: float = 0.95  # Solar to battery
    dc_ac_efficiency: float = 0.882  # Battery to load
    ac_dc_efficiency: float = 0.95  # Grid to battery

    # Simulation interval
    interval_minutes: int = 15

    @property
    def interval_hours(self) -> float:
        """Interval duration in hours."""
        return self.interval_minutes / 60.0

    @property
    def max_charge_per_interval_kwh(self) -> float:
        """Maximum kWh that can be charged in one interval."""
        return self.charge_rate_kw * self.interval_hours

    @property
    def usable_capacity_kwh(self) -> float | None:
        """Usable capacity above HW minimum."""
        if self.max_capacity_kwh is None or self.min_capacity_kwh is None:
            return None
        return self.max_capacity_kwh - self.min_capacity_kwh
