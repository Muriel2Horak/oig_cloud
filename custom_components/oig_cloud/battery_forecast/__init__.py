"""Battery forecast module - modular architecture for battery optimization.

This module provides:
- Timeline building and SoC simulation
- HYBRID multi-mode optimization algorithm
- Balancing plan execution
- Mode management (HOME I/II/III/UPS)

Architecture:
    battery_forecast/
    ├── __init__.py          # This file - exports
    ├── types.py             # TypedDicts, Enums, Constants
    ├── optimizer/
    │   ├── __init__.py
    │   ├── base.py          # Abstract optimizer interface
    │   ├── hybrid.py        # HYBRID algorithm
    │   └── modes.py         # Mode selection logic
    ├── timeline/
    │   ├── __init__.py
    │   ├── builder.py       # Timeline structure building
    │   └── simulator.py     # SoC simulation
    ├── balancing/
    │   ├── __init__.py
    │   ├── executor.py      # Apply balancing plan to modes
    │   └── constraints.py   # Deadline, holding period
    └── utils/
        ├── __init__.py
        ├── solar.py         # Solar forecast helpers
        ├── prices.py        # Spot price helpers
        └── consumption.py   # Load forecast helpers
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
]
