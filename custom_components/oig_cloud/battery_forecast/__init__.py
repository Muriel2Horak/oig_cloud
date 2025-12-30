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
    ├── physics/             # Layer 1: Physics simulation (NEW)
    │   ├── __init__.py
    │   └── interval_simulator.py
    ├── strategy/            # Layer 2: Optimization strategies (NEW)
    │   ├── __init__.py
    │   ├── balancing.py     # Balancing cycle planning
    │   └── hybrid.py        # Mode optimization
    ├── timeline/
    │   ├── __init__.py
    │   └── planner.py
    ├── balancing/
    │   ├── __init__.py
    │   ├── executor.py
    │   └── constraints.py
"""

from .physics import IntervalResult, IntervalSimulator
from .strategy import (
    BalancingPlan as BalancingPlanNew,  # Avoid conflict with types.BalancingPlan
)
from .strategy import (
    BalancingResult,
    BalancingStrategy,
    HybridResult,
    HybridStrategy,
)
from .types import (  # Mode constants; TypedDicts; Constants; Helper functions
    AC_CHARGING_DISABLED_MODES,
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
    CBB_MODE_NAMES,
    CBB_MODE_SERVICE_MAP,
    DEFAULT_CHARGE_RATE_KW,
    DEFAULT_EFFICIENCY,
    INTERVAL_MINUTES,
    MIN_MODE_DURATION,
    TRANSITION_COSTS,
    BalancingPlan,
    CBBMode,
    ModeRecommendation,
    OptimizationResult,
    SpotPrice,
    TimelineInterval,
    get_mode_name,
    is_charging_mode,
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
    # NEW: Physics layer
    "IntervalSimulator",
    "IntervalResult",
    # NEW: Strategy layer
    "BalancingStrategy",
    "BalancingPlanNew",
    "BalancingResult",
    "HybridStrategy",
    "HybridResult",
]
