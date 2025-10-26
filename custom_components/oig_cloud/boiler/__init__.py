"""Boiler module for OIG Cloud integration."""

from __future__ import annotations

from .boiler_coordinator import BoilerCoordinator
from .boiler_energy import (
    calculate_current_energy_simple_avg,
    calculate_current_energy_two_zone,
    calculate_liters_at_temperature,
    calculate_required_energy,
    calculate_soc_percent,
    calculate_target_energy,
)
from .boiler_models import (
    BoilerConfig,
    BoilerPlan,
    BoilerState,
    PlanSlot,
    WaterUsageProfile,
)
from .boiler_planner import BoilerPlanner, PriceSlot
from .boiler_profile import BoilerUsageProfiler
from .boiler_sensors import async_setup_boiler_sensors
from .boiler_services import setup_boiler_services
from .boiler_utils import (
    atomic_save_json,
    get_full_json_url,
    get_oig_data_dir,
    load_json,
)

__all__ = [
    # Coordinator
    "BoilerCoordinator",
    # Models
    "BoilerConfig",
    "BoilerState",
    "BoilerPlan",
    "PlanSlot",
    "WaterUsageProfile",
    # Energy calculations
    "calculate_target_energy",
    "calculate_current_energy_simple_avg",
    "calculate_current_energy_two_zone",
    "calculate_required_energy",
    "calculate_soc_percent",
    "calculate_liters_at_temperature",
    # Planning
    "BoilerPlanner",
    "PriceSlot",
    # Profiling
    "BoilerUsageProfiler",
    # Sensors & Services
    "async_setup_boiler_sensors",
    "setup_boiler_services",
    # Utils
    "atomic_save_json",
    "load_json",
    "get_oig_data_dir",
    "get_full_json_url",
]
