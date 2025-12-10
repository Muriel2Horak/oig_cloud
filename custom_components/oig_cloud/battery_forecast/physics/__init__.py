"""Physics layer for battery simulation.

This package contains the core physics simulation for CBB battery modes.
"""

from .interval_simulator import (
    IntervalSimulator,
    IntervalResult,
)

__all__ = [
    "IntervalSimulator",
    "IntervalResult",
]
