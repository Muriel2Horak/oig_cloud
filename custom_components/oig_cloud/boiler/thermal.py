"""Deterministic thermal physics for boiler planning."""
from __future__ import annotations

import logging
from typing import Optional

from .const import (
    BOILER_HEIGHT_DEFAULT,
    JOULES_TO_KWH,
    SENSOR_POSITION_MAP,
    TEMP_GRADIENT_PER_10CM,
    WATER_SPECIFIC_HEAT,
)

_LOGGER = logging.getLogger(__name__)


def calculate_stratified_temp(
    measured_temp: float,
    sensor_position: str,
    mode: str = "two_zone",
    split_ratio: float = 0.5,
    boiler_height_m: float = BOILER_HEIGHT_DEFAULT,
) -> tuple[float, float]:
    """Compute (upper_zone_temp, lower_zone_temp) from a single thermometer.

    Args:
        measured_temp: Temperature reading [°C].
        sensor_position: One of "top", "upper_quarter", "middle", "lower_quarter".
        mode: "two_zone" applies gradient correction; "simple_avg" returns measured_temp for both zones.
        split_ratio: Fraction of tank considered upper zone (0.0–1.0).
        boiler_height_m: Physical tank height [m].

    Returns:
        (T_upper, T_lower) in °C.
    """
    if mode == "simple_avg":
        return (measured_temp, measured_temp)

    sensor_height_ratio = SENSOR_POSITION_MAP.get(sensor_position, 1.0)
    gradient_per_meter = TEMP_GRADIENT_PER_10CM * 10.0

    upper_zone_center = 1.0 - (1.0 - split_ratio) / 2.0
    lower_zone_center = split_ratio / 2.0

    height_diff_upper = (upper_zone_center - sensor_height_ratio) * boiler_height_m
    temp_upper = measured_temp + (gradient_per_meter * height_diff_upper)

    height_diff_lower = (lower_zone_center - sensor_height_ratio) * boiler_height_m
    temp_lower = measured_temp + (gradient_per_meter * height_diff_lower)

    return (temp_upper, temp_lower)


def calculate_energy_to_heat(
    volume_liters: float,
    temp_current: float,
    temp_target: float,
) -> float:
    """Energy required to raise water temperature.

    Args:
        volume_liters: Tank volume [l].
        temp_current: Starting temperature [°C].
        temp_target: Desired temperature [°C].

    Returns:
        Energy [kWh].
    """
    if temp_target <= temp_current:
        return 0.0

    mass_kg = volume_liters
    temp_delta = temp_target - temp_current
    energy_joules = mass_kg * WATER_SPECIFIC_HEAT * temp_delta
    return energy_joules * JOULES_TO_KWH


def estimate_residual_energy(
    total_consumption_kwh: float,
    fve_contribution_kwh: float,
    grid_contribution_kwh: float,
) -> float:
    """Residual energy from alternative source after FVE and grid contributions.

    Args:
        total_consumption_kwh: Total boiler consumption.
        fve_contribution_kwh: Energy from PV.
        grid_contribution_kwh: Energy from grid.

    Returns:
        Non-negative residual [kWh].
    """
    residual = total_consumption_kwh - fve_contribution_kwh - grid_contribution_kwh
    return max(0.0, residual)


def validate_temperature_sensor(
    state: Optional[object],
    sensor_name: str,
) -> Optional[float]:
    """Validate and extract temperature from an HA state object.

    Args:
        state: HA state object or None.
        sensor_name: Entity ID for logging.

    Returns:
        Temperature in °C or None if invalid.
    """
    if state is None:
        _LOGGER.debug("Senzor %s není dostupný", sensor_name)
        return None

    try:
        temp = float(state.state)  # type: ignore[attr-defined]
        if not (-50 <= temp <= 150):
            _LOGGER.warning(
                "Senzor %s má neplatnou teplotu: %s°C (rozsah -50 až 150°C)",
                sensor_name,
                temp,
            )
            return None
        return temp
    except (ValueError, AttributeError) as err:
        _LOGGER.warning("Nelze přečíst teplotu ze senzoru %s: %s", sensor_name, err)
        return None


def effective_power_kw(
    nominal_power_kw: float,
    voltage_v: float = 230.0,
    nominal_voltage_v: float = 230.0,
) -> float:
    """Normalize heater power for actual grid voltage.

    Args:
        nominal_power_kw: Rated power at nominal voltage [kW].
        voltage_v: Actual measured voltage [V].
        nominal_voltage_v: Voltage at which nominal_power_kw was rated [V].

    Returns:
        Effective power [kW].
    """
    if nominal_voltage_v <= 0:
        return nominal_power_kw
    ratio = voltage_v / nominal_voltage_v
    return nominal_power_kw * (ratio ** 2)


def standing_loss_per_slot(
    tank_volume_l: float,
    temp_avg_c: float,
    ambient_temp_c: float,
    slot_minutes: int,
    loss_coefficient: float = 0.02,
) -> float:
    """Standing heat loss for a single planning slot.

    Args:
        tank_volume_l: Tank volume [l].
        temp_avg_c: Average water temperature [°C].
        ambient_temp_c: Ambient temperature [°C].
        slot_minutes: Slot duration [min].
        loss_coefficient: Loss factor [kWh/(l·°C·h)].

    Returns:
        Energy lost [kWh].
    """
    if temp_avg_c <= ambient_temp_c:
        return 0.0
    temp_delta = temp_avg_c - ambient_temp_c
    hours = slot_minutes / 60.0
    return tank_volume_l * temp_delta * loss_coefficient * hours


def heating_per_slot(
    power_kw: float,
    slot_minutes: int,
    efficiency: float = 1.0,
) -> float:
    """Energy delivered by heater during a slot.

    Args:
        power_kw: Heater power [kW].
        slot_minutes: Slot duration [min].
        efficiency: Heater efficiency (0.0–1.0).

    Returns:
        Energy added [kWh].
    """
    if power_kw <= 0 or slot_minutes <= 0:
        return 0.0
    hours = slot_minutes / 60.0
    return power_kw * hours * efficiency


def predicted_temperature_after_slot(
    current_temp_c: float,
    energy_added_kwh: float,
    energy_lost_kwh: float,
    volume_liters: float,
) -> float:
    """Predict water temperature after a planning slot.

    Args:
        current_temp_c: Temperature at slot start [°C].
        energy_added_kwh: Heating energy [kWh].
        energy_lost_kwh: Standing loss [kWh].
        volume_liters: Tank volume [l].

    Returns:
        Predicted temperature [°C].
    """
    if volume_liters <= 0:
        return current_temp_c
    net_energy_joules = (energy_added_kwh - energy_lost_kwh) * 3_600_000
    temp_delta = net_energy_joules / (volume_liters * WATER_SPECIFIC_HEAT)
    return current_temp_c + temp_delta


def stale_temperature_bias(
    last_reading_minutes: float,
    bias_per_minute: float = 0.1,
) -> float:
    """Conservative bias for stale temperature readings.

    Args:
        last_reading_minutes: Minutes since last valid reading.
        bias_per_minute: Bias magnitude per minute [°C].

    Returns:
        Bias to subtract from temperature [°C].
    """
    if last_reading_minutes <= 0:
        return 0.0
    return last_reading_minutes * bias_per_minute
