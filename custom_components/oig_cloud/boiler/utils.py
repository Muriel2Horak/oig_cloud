"""Utility funkce pro bojlerový modul.

Backward-compatible wrappers delegating to boiler.thermal.
"""

import logging

from .thermal import (
    calculate_energy_to_heat,
    calculate_stratified_temp,
    estimate_residual_energy,
    validate_temperature_sensor,
)

_LOGGER = logging.getLogger(__name__)

__all__ = [
    "calculate_energy_to_heat",
    "calculate_stratified_temp",
    "estimate_residual_energy",
    "validate_temperature_sensor",
]
