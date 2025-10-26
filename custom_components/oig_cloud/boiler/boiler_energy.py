"""Energy calculations for boiler heating."""

from __future__ import annotations

import logging
from typing import Literal, Optional

from ..const import BOILER_ENERGY_CONSTANT_KWH_L_C

_LOGGER = logging.getLogger(__name__)


def calculate_target_energy(
    volume_l: float, target_temp_c: float, cold_temp_c: float
) -> float:
    """Calculate energy needed to heat full tank from cold to target temperature.

    Args:
        volume_l: Tank volume in liters
        target_temp_c: Target temperature in °C
        cold_temp_c: Cold water inlet temperature in °C

    Returns:
        Energy in kWh

    Raises:
        ValueError: If parameters are invalid
    """
    if volume_l <= 0:
        raise ValueError("volume_l must be positive")
    if target_temp_c <= cold_temp_c:
        raise ValueError("target_temp_c must be greater than cold_temp_c")

    energy_kwh = (
        volume_l * (target_temp_c - cold_temp_c) * BOILER_ENERGY_CONSTANT_KWH_L_C
    )
    _LOGGER.debug(
        f"Target energy: {volume_l}L * ({target_temp_c}°C - {cold_temp_c}°C) * {BOILER_ENERGY_CONSTANT_KWH_L_C} = {energy_kwh:.2f} kWh"
    )
    return energy_kwh


def calculate_current_energy_simple_avg(
    volume_l: float,
    temp_top_c: Optional[float],
    temp_bottom_c: Optional[float],
    cold_temp_c: float,
) -> float:
    """Calculate current energy in tank using simple average method.

    If both sensors available: avg = (top + bottom) / 2
    If only top sensor: avg = top
    If no sensors: return 0

    Args:
        volume_l: Tank volume in liters
        temp_top_c: Top temperature sensor reading in °C (optional)
        temp_bottom_c: Bottom temperature sensor reading in °C (optional)
        cold_temp_c: Cold water inlet temperature in °C

    Returns:
        Current energy in kWh
    """
    if temp_top_c is None:
        _LOGGER.warning("No temperature sensors available, returning 0 energy")
        return 0.0

    if temp_bottom_c is not None:
        temp_avg_c = (temp_top_c + temp_bottom_c) / 2.0
        _LOGGER.debug(
            f"Simple avg: ({temp_top_c}°C + {temp_bottom_c}°C) / 2 = {temp_avg_c:.1f}°C"
        )
    else:
        temp_avg_c = temp_top_c
        _LOGGER.debug(f"Simple avg (single sensor): {temp_avg_c:.1f}°C")

    if temp_avg_c < cold_temp_c:
        _LOGGER.warning(
            f"Average temp {temp_avg_c}°C is below cold inlet {cold_temp_c}°C, clamping to cold"
        )
        temp_avg_c = cold_temp_c

    energy_kwh = volume_l * (temp_avg_c - cold_temp_c) * BOILER_ENERGY_CONSTANT_KWH_L_C
    _LOGGER.debug(
        f"Current energy (simple_avg): {volume_l}L * ({temp_avg_c:.1f}°C - {cold_temp_c}°C) = {energy_kwh:.2f} kWh"
    )
    return energy_kwh


def calculate_current_energy_two_zone(
    volume_l: float,
    temp_top_c: Optional[float],
    temp_bottom_c: Optional[float],
    cold_temp_c: float,
    split_ratio: float = 0.5,
) -> float:
    """Calculate current energy in tank using two-zone stratification model.

    Tank is split into top and bottom zones with separate temperatures.

    Args:
        volume_l: Total tank volume in liters
        temp_top_c: Top zone temperature in °C
        temp_bottom_c: Bottom zone temperature in °C
        cold_temp_c: Cold water inlet temperature in °C
        split_ratio: Ratio of top zone volume (0.1-0.9, default 0.5)

    Returns:
        Current energy in kWh

    Raises:
        ValueError: If split_ratio is invalid or both temps are None
    """
    if not 0.1 <= split_ratio <= 0.9:
        raise ValueError("split_ratio must be between 0.1 and 0.9")

    if temp_top_c is None or temp_bottom_c is None:
        _LOGGER.warning(
            "Two-zone mode requires both sensors, falling back to simple_avg"
        )
        return calculate_current_energy_simple_avg(
            volume_l, temp_top_c, temp_bottom_c, cold_temp_c
        )

    volume_top_l = volume_l * split_ratio
    volume_bottom_l = volume_l * (1.0 - split_ratio)

    # Clamp temps to not go below cold inlet
    temp_top_clamped = max(temp_top_c, cold_temp_c)
    temp_bottom_clamped = max(temp_bottom_c, cold_temp_c)

    energy_top_kwh = (
        volume_top_l * (temp_top_clamped - cold_temp_c) * BOILER_ENERGY_CONSTANT_KWH_L_C
    )
    energy_bottom_kwh = (
        volume_bottom_l
        * (temp_bottom_clamped - cold_temp_c)
        * BOILER_ENERGY_CONSTANT_KWH_L_C
    )
    total_energy_kwh = energy_top_kwh + energy_bottom_kwh

    _LOGGER.debug(
        f"Two-zone energy: top={volume_top_l:.1f}L*({temp_top_clamped:.1f}°C-{cold_temp_c}°C)={energy_top_kwh:.2f}kWh, "
        f"bottom={volume_bottom_l:.1f}L*({temp_bottom_clamped:.1f}°C-{cold_temp_c}°C)={energy_bottom_kwh:.2f}kWh, "
        f"total={total_energy_kwh:.2f}kWh"
    )
    return total_energy_kwh


def calculate_required_energy(
    volume_l: float,
    target_temp_c: float,
    cold_temp_c: float,
    temp_top_c: Optional[float],
    temp_bottom_c: Optional[float],
    stratification_mode: Literal["simple_avg", "two_zone"] = "simple_avg",
    split_ratio: float = 0.5,
    standby_losses_kwh: float = 0.0,
) -> tuple[float, float, float]:
    """Calculate required energy to heat tank to target temperature.

    Args:
        volume_l: Tank volume in liters
        target_temp_c: Target temperature in °C
        cold_temp_c: Cold water inlet temperature in °C
        temp_top_c: Current top temperature in °C
        temp_bottom_c: Current bottom temperature in °C (optional)
        stratification_mode: Calculation method ('simple_avg' or 'two_zone')
        split_ratio: Top zone volume ratio for two_zone mode (0.1-0.9)
        standby_losses_kwh: Estimated standby losses to add (optional)

    Returns:
        Tuple of (energy_target_kwh, energy_now_kwh, energy_required_kwh)
    """
    # Calculate target energy
    energy_target_kwh = calculate_target_energy(volume_l, target_temp_c, cold_temp_c)

    # Calculate current energy based on mode
    if stratification_mode == "two_zone":
        energy_now_kwh = calculate_current_energy_two_zone(
            volume_l, temp_top_c, temp_bottom_c, cold_temp_c, split_ratio
        )
    else:
        energy_now_kwh = calculate_current_energy_simple_avg(
            volume_l, temp_top_c, temp_bottom_c, cold_temp_c
        )

    # Calculate required energy (never negative)
    energy_required_kwh = max(
        0.0, energy_target_kwh - energy_now_kwh + standby_losses_kwh
    )

    _LOGGER.info(
        f"Energy calculation ({stratification_mode}): "
        f"target={energy_target_kwh:.2f}kWh, now={energy_now_kwh:.2f}kWh, "
        f"required={energy_required_kwh:.2f}kWh (losses={standby_losses_kwh:.2f}kWh)"
    )

    return energy_target_kwh, energy_now_kwh, energy_required_kwh


def calculate_soc_percent(energy_now_kwh: float, energy_target_kwh: float) -> float:
    """Calculate State of Charge as percentage.

    Args:
        energy_now_kwh: Current energy in tank
        energy_target_kwh: Target energy

    Returns:
        SOC in percent (0-100), or 0 if target is zero
    """
    if energy_target_kwh <= 0:
        return 0.0

    soc = (energy_now_kwh / energy_target_kwh) * 100.0
    return min(100.0, max(0.0, soc))  # Clamp to 0-100%


def calculate_liters_at_temperature(
    energy_now_kwh: float,
    cold_temp_c: float,
    output_temp_c: float = 40.0,
) -> float:
    """Calculate equivalent liters available at a specific output temperature.

    This calculates how many liters at output_temp_c can be drawn from current energy.
    Useful for displaying "liters of 40°C water available".

    Args:
        energy_now_kwh: Current energy in tank
        cold_temp_c: Cold water inlet temperature
        output_temp_c: Desired output temperature (default 40°C for showering)

    Returns:
        Equivalent liters at output_temp_c
    """
    if output_temp_c <= cold_temp_c:
        return 0.0

    temp_diff = output_temp_c - cold_temp_c
    if temp_diff <= 0:
        return 0.0

    liters = energy_now_kwh / (temp_diff * BOILER_ENERGY_CONSTANT_KWH_L_C)
    return liters
