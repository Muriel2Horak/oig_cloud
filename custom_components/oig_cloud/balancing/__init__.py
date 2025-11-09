"""Balancing module - pure planning layer (NO PHYSICS).

After refactoring per TODO 1-2:
- plan.py: BalancingPlan dataclass structure
- core.py: BalancingManager (Natural/Opportunistic/Forced detection)
- NO simulation.py (physics is ONLY in forecast._simulate_interval)
"""

from .plan import (
    BalancingPlan,
    BalancingInterval,
    BalancingMode,
    BalancingPriority,
    create_natural_plan,
    create_opportunistic_plan,
    create_forced_plan,
)
from .core import BalancingManager

__all__ = [
    "BalancingPlan",
    "BalancingInterval",
    "BalancingMode",
    "BalancingPriority",
    "create_natural_plan",
    "create_opportunistic_plan",
    "create_forced_plan",
    "BalancingManager",
]
