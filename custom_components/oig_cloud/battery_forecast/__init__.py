"""Battery forecast module - modular architecture for battery optimization.

This module provides:
- Timeline building and SoC simulation
- HYBRID multi-mode optimization algorithm
- Balancing plan execution
- Mode management (HOME I/II/III/UPS)

Architecture (NEW 3-layer design):
    battery_forecast/
    ├── __init__.py          # This file - exports
    ├── types.py             # TypedDicts, Enums, Constants
    ├── config.py            # Configuration dataclasses (NEW)
    ├── service.py           # Top-level orchestrator (NEW)
    ├── physics/             # Layer 1: Physics simulation (NEW)
    │   ├── __init__.py
    │   └── interval_simulator.py
    ├── strategy/            # Layer 2: Optimization strategies (NEW)
    │   ├── __init__.py
    │   ├── balancing.py     # Balancing cycle planning
    │   └── hybrid.py        # Mode optimization
    ├── optimizer/           # Legacy optimizer (deprecated)
    │   ├── __init__.py
    │   ├── base.py
    │   ├── hybrid.py
    │   └── modes.py
    ├── timeline/
    │   ├── __init__.py
    │   ├── builder.py
    │   └── simulator.py
    ├── balancing/
    │   ├── __init__.py
    │   ├── executor.py
    │   └── constraints.py
    └── utils/
        ├── __init__.py
        ├── solar.py
        ├── prices.py
        └── consumption.py
"""

from .types import (
    # Mode constants
    CBBMode,
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
    CBB_MODE_NAMES,
    CBB_MODE_SERVICE_MAP,
    AC_CHARGING_DISABLED_MODES,
    # TypedDicts
    TimelineInterval,
    SpotPrice,
    BalancingPlan,
    OptimizationResult,
    ModeRecommendation,
    # Constants
    TRANSITION_COSTS,
    MIN_MODE_DURATION,
    DEFAULT_EFFICIENCY,
    DEFAULT_CHARGE_RATE_KW,
    INTERVAL_MINUTES,
    # Helper functions
    get_mode_name,
    is_charging_mode,
)

from .sensor import (
    BatteryForecastOrchestrator,
    ForecastConfig,
    ForecastResult,
    calculate_battery_forecast,
)

from .bridge import (
    calculate_hybrid_with_new_module,
    calculate_timeline_with_new_module,
    simulate_interval_with_new_module,
    validate_bridge_compatibility,
)

# NEW: 3-layer architecture exports
from .config import (
    SimulatorConfig,
    HybridConfig,
    BalancingConfig,
    ForecastServiceConfig,
    NegativePriceStrategy,
    ChargingStrategy,
    default_config,
    aggressive_charging_config,
    battery_preservation_config,
    maximum_self_consumption_config,
)

from .physics import (
    IntervalSimulator,
    IntervalResult,
)

from .strategy import (
    BalancingStrategy,
    BalancingPlan as BalancingPlanNew,  # Avoid conflict with types.BalancingPlan
    BalancingResult,
    HybridStrategy,
    HybridResult,
)

from .service import (
    BatteryForecastService,
    ForecastInput,
    ForecastOutput,
    create_service,
    create_service_from_ha,
)

__all__ = [
    # Mode constants
    "CBBMode",
    "CBB_MODE_HOME_I",
    "CBB_MODE_HOME_II",
    "CBB_MODE_HOME_III",
    "CBB_MODE_HOME_UPS",
    "CBB_MODE_NAMES",
    "CBB_MODE_SERVICE_MAP",
    "AC_CHARGING_DISABLED_MODES",
    # TypedDicts
    "TimelineInterval",
    "SpotPrice",
    "BalancingPlan",
    "OptimizationResult",
    "ModeRecommendation",
    # Constants
    "TRANSITION_COSTS",
    "MIN_MODE_DURATION",
    "DEFAULT_EFFICIENCY",
    "DEFAULT_CHARGE_RATE_KW",
    "INTERVAL_MINUTES",
    # Helper functions
    "get_mode_name",
    "is_charging_mode",
    # Orchestrator
    "BatteryForecastOrchestrator",
    "ForecastConfig",
    "ForecastResult",
    "calculate_battery_forecast",
    # Bridge (legacy compatibility)
    "calculate_hybrid_with_new_module",
    "calculate_timeline_with_new_module",
    "simulate_interval_with_new_module",
    "validate_bridge_compatibility",
    # NEW: Configuration
    "SimulatorConfig",
    "HybridConfig",
    "BalancingConfig",
    "ForecastServiceConfig",
    "NegativePriceStrategy",
    "ChargingStrategy",
    "default_config",
    "aggressive_charging_config",
    "battery_preservation_config",
    "maximum_self_consumption_config",
    # NEW: Physics layer
    "IntervalSimulator",
    "IntervalResult",
    # NEW: Strategy layer
    "BalancingStrategy",
    "BalancingPlanNew",
    "BalancingResult",
    "HybridStrategy",
    "HybridResult",
    # NEW: Service layer
    "BatteryForecastService",
    "ForecastInput",
    "ForecastOutput",
    "create_service",
    "create_service_from_ha",
]
