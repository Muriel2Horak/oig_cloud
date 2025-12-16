"""Configuration dataclasses for battery forecast module.

This module provides typed configuration objects for:
- SimulatorConfig: Physics layer configuration
- HybridConfig: Hybrid optimization strategy parameters
- BalancingConfig: Balancing strategy parameters
- ForecastServiceConfig: Top-level orchestrator configuration
"""

from dataclasses import dataclass, field
from datetime import time
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

    # Battery capacity bounds
    max_capacity_kwh: float = 15.36
    min_capacity_kwh: float = 3.07  # HW minimum (~20% SoC)

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
    def usable_capacity_kwh(self) -> float:
        """Usable capacity above HW minimum."""
        return self.max_capacity_kwh - self.min_capacity_kwh


@dataclass
class HybridConfig:
    """Configuration for hybrid optimization strategy.

    Contains tunable parameters for the optimizer.
    These can be adjusted based on user preferences or seasonal patterns.
    """

    # SoC targets (as percentage 0-100)
    planning_min_percent: float = 20.0  # Don't plan below this
    target_percent: float = 80.0  # Target SoC at end of period
    emergency_reserve_percent: float = 33.0  # Reserve for grid outage

    # Price thresholds (relative to average, in %)
    cheap_threshold_percent: float = 75.0  # Below this = cheap
    expensive_threshold_percent: float = 125.0  # Above this = expensive
    very_cheap_threshold_percent: float = 50.0  # Very cheap = force charge

    # Absolute price limits (CZK/kWh)
    max_ups_price_czk: float = 2.0  # Max price for grid charging
    min_export_price_czk: float = -0.5  # Min price to allow export

    # Negative price handling
    negative_price_strategy: NegativePriceStrategy = NegativePriceStrategy.AUTO
    negative_price_min_solar_kwh: float = 0.5  # Min solar to trigger strategy

    # Mode selection weights (for scoring)
    weight_cost: float = 1.0  # Weight for cost savings
    weight_battery_preservation: float = 0.3  # Weight for keeping battery charged
    weight_self_consumption: float = 0.5  # Weight for using own solar

    # UPS mode parameters
    charging_strategy: ChargingStrategy = ChargingStrategy.BELOW_THRESHOLD
    min_ups_duration_intervals: int = 2  # Minimum 30 min UPS
    max_ups_duration_intervals: int = 8  # Maximum 2h UPS

    # Smoothing to avoid oscillation
    min_mode_duration_intervals: int = 2  # Minimum time in any mode
    transition_penalty_czk: float = 0.1  # Penalty for mode switch

    # Look-ahead for optimization
    look_ahead_hours: int = 24  # How far to optimize

    def planning_min_kwh(self, max_capacity: float) -> float:
        """Calculate planning minimum in kWh."""
        return max_capacity * (self.planning_min_percent / 100.0)

    def target_kwh(self, max_capacity: float) -> float:
        """Calculate target capacity in kWh."""
        return max_capacity * (self.target_percent / 100.0)

    def emergency_reserve_kwh(self, max_capacity: float) -> float:
        """Calculate emergency reserve in kWh."""
        return max_capacity * (self.emergency_reserve_percent / 100.0)


@dataclass
class BalancingConfig:
    """Configuration for balancing strategy.

    Balancing ensures battery reaches 100% periodically for cell calibration.
    """

    # Enable/disable balancing
    enabled: bool = True

    # Balancing schedule
    interval_days: int = 7  # Days between balancing cycles
    holding_hours: int = 3  # Hours to hold at 100%
    deadline_time: time = field(default_factory=lambda: time(6, 0))  # Default 06:00

    # Charging parameters
    max_charge_price_czk: float = 3.0  # Max price to pay for balancing charge
    prefer_solar: bool = True  # Prefer solar charging over grid

    # Emergency balancing
    force_after_days: int = 14  # Force balancing after this many days
    min_soc_for_skip_percent: float = 95.0  # Can skip if above this SoC

    # Holding period behavior
    allow_discharge_during_holding: bool = False  # Allow small discharge
    max_discharge_during_holding_kwh: float = 0.5  # If allowed, max amount

    def deadline_datetime(self, day_offset: int = 0) -> time:
        """Get deadline time (for compatibility)."""
        _ = day_offset
        return self.deadline_time


@dataclass
class ForecastServiceConfig:
    """Top-level configuration for BatteryForecastService.

    Combines all sub-configurations and adds service-level settings.
    """

    # Sub-configurations
    simulator: SimulatorConfig = field(default_factory=SimulatorConfig)
    hybrid: HybridConfig = field(default_factory=HybridConfig)
    balancing: BalancingConfig = field(default_factory=BalancingConfig)

    # Device identification
    box_id: str = ""

    # Update settings
    update_interval_minutes: int = 15

    # API compatibility mode
    legacy_api_format: bool = True  # Output in legacy format for FE compatibility

    # Debug settings
    debug_logging: bool = False
    log_interval_details: bool = False

    @classmethod
    def from_ha_config(
        cls,
        ha_config: dict,
        box_id: str,
    ) -> "ForecastServiceConfig":
        """Create config from Home Assistant config entry.

        Args:
            ha_config: Config entry data dict
            box_id: Device box ID

        Returns:
            ForecastServiceConfig instance
        """
        # Extract battery parameters
        max_capacity = float(ha_config.get("battery_max_capacity", 15.36))
        min_capacity_percent = float(ha_config.get("min_capacity_percent", 20.0))
        target_percent = float(ha_config.get("target_capacity_percent", 80.0))

        # Extract balancing parameters
        balancing_enabled = ha_config.get("balancing_enabled", True)
        balancing_interval = int(ha_config.get("balancing_interval_days", 7))
        # Backward/forward compatibility: historically we used multiple option keys.
        balancing_holding = int(
            ha_config.get(
                "balancing_hold_hours",
                ha_config.get("balancing_holding_hours", ha_config.get("balancing_holding_time", 3)),
            )
        )

        # Build configs
        simulator_config = SimulatorConfig(
            max_capacity_kwh=max_capacity,
            min_capacity_kwh=max_capacity * 0.2,  # HW minimum always 20%
        )

        hybrid_config = HybridConfig(
            planning_min_percent=min_capacity_percent,
            target_percent=target_percent,
        )

        balancing_config = BalancingConfig(
            enabled=balancing_enabled,
            interval_days=balancing_interval,
            holding_hours=balancing_holding,
        )

        return cls(
            simulator=simulator_config,
            hybrid=hybrid_config,
            balancing=balancing_config,
            box_id=box_id,
        )


# =============================================================================
# Factory functions for common configurations
# =============================================================================


def default_config() -> ForecastServiceConfig:
    """Create default configuration for CBB 3F Home Plus Premium."""
    return ForecastServiceConfig()


def aggressive_charging_config() -> ForecastServiceConfig:
    """Configuration that aggressively uses cheap grid power."""
    config = default_config()
    config.hybrid.charging_strategy = ChargingStrategy.OPPORTUNISTIC
    config.hybrid.max_ups_price_czk = 3.0
    config.hybrid.cheap_threshold_percent = 85.0
    return config


def battery_preservation_config() -> ForecastServiceConfig:
    """Configuration that preserves battery life."""
    config = default_config()
    config.hybrid.planning_min_percent = 30.0
    config.hybrid.target_percent = 70.0
    config.hybrid.weight_battery_preservation = 0.8
    config.balancing.interval_days = 14  # Less frequent balancing
    return config


def maximum_self_consumption_config() -> ForecastServiceConfig:
    """Configuration that maximizes solar self-consumption."""
    config = default_config()
    config.hybrid.weight_self_consumption = 1.0
    config.hybrid.charging_strategy = ChargingStrategy.DISABLED
    config.hybrid.negative_price_strategy = NegativePriceStrategy.CONSUME
    return config
