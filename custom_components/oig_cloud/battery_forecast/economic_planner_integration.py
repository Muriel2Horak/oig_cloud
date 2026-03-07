"""Integration of economic planner with Home Assistant coordinator.

This module provides the bridge between the economic planner algorithm
and Home Assistant's coordinator pattern.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.template import Template

from ..const import (
    CONF_CHARGE_RATE_KW,
    CONF_PLANNING_MIN_PERCENT,
    DEFAULT_CHARGE_RATE_KW,
    DEFAULT_PLANNING_MIN_PERCENT,
)
from .economic_planner import plan_battery_schedule
from .economic_planner_types import PlannerInputs
from .types import CBBMode

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry

_LOGGER = logging.getLogger(__name__)


def load_planner_inputs(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
) -> PlannerInputs:
    """Load dynamic inputs from Home Assistant sensors and config.

    Args:
        hass: Home Assistant instance
        config_entry: Configuration entry with planner settings

    Returns:
        PlannerInputs populated with current sensor values

    Raises:
        ValueError: If required sensors are unavailable
    """
    # Get box_id from config
    box_id = config_entry.data.get("box_id", "")

    # Sensor entity IDs
    soc_sensor = f"sensor.oig_{box_id}_battery_level" if box_id else "sensor.battery_level"
    capacity_sensor = f"sensor.oig_{box_id}_installed_battery_capacity_kwh" if box_id else "sensor.installed_battery_capacity_kwh"
    hw_min_sensor = f"sensor.oig_{box_id}_batt_bat_min" if box_id else "sensor.batt_bat_min"

    # Read current values from sensors
    soc_state = hass.states.get(soc_sensor)
    capacity_state = hass.states.get(capacity_sensor)
    hw_min_state = hass.states.get(hw_min_sensor)

    if not soc_state or not capacity_state:
        raise ValueError(f"Required sensors unavailable: {soc_sensor}, {capacity_sensor}")

    # Parse values
    current_soc_kwh = float(soc_state.state) if soc_state else 5.0
    max_capacity_kwh = float(capacity_state.state) if capacity_state else 10.24
    hw_min_kwh = float(hw_min_state.state) if hw_min_state else (max_capacity_kwh * 0.20)

    # Get config values
    planning_min_percent = config_entry.options.get(
        CONF_PLANNING_MIN_PERCENT,
        config_entry.data.get(CONF_PLANNING_MIN_PERCENT, DEFAULT_PLANNING_MIN_PERCENT)
    )
    charge_rate_kw = config_entry.options.get(
        CONF_CHARGE_RATE_KW,
        config_entry.data.get(CONF_CHARGE_RATE_KW, DEFAULT_CHARGE_RATE_KW)
    )

    # Validate planning_min >= HW min
    hw_min_percent = (hw_min_kwh / max_capacity_kwh) * 100
    if planning_min_percent < hw_min_percent:
        _LOGGER.warning(
            "Planning min %.1f%% is below HW min %.1f%%, adjusting to %.1f%%",
            planning_min_percent, hw_min_percent, hw_min_percent
        )
        planning_min_percent = hw_min_percent

    # Get forecast data (these would come from forecast sensors)
    # For now, use placeholder - in real implementation these would be
    # fetched from forecast sensors or services
    intervals = [{"index": i} for i in range(96)]

    # Placeholder forecasts - in production these come from:
    # - Solar forecast sensor (e.g., sensor.solcast_forecast)
    # - Load forecast (calculated from history)
    # - Spot prices (OTE API)
    solar_forecast = [0.0] * 96  # TODO: Fetch from forecast sensor
    load_forecast = [0.5] * 96    # TODO: Calculate from history
    prices = [5.0] * 96           # TODO: Fetch from OTE API

    return PlannerInputs(
        current_soc_kwh=current_soc_kwh,
        max_capacity_kwh=max_capacity_kwh,
        hw_min_kwh=hw_min_kwh,
        planning_min_percent=planning_min_percent,
        charge_rate_kw=charge_rate_kw,
        intervals=intervals,
        prices=prices,
        solar_forecast=solar_forecast,
        load_forecast=load_forecast,
    )


async def run_economic_planning(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
) -> dict[str, Any]:
    """Run economic planning and return results.

    Args:
        hass: Home Assistant instance
        config_entry: Configuration entry

    Returns:
        Dictionary with planning results including modes and decisions
    """
    try:
        # Load inputs
        inputs = load_planner_inputs(hass, config_entry)

        # Run planner
        result = plan_battery_schedule(inputs)

        # Log decisions
        for decision in result.decisions:
            _LOGGER.info(
                "Economic decision at interval %d: %s (cost: %.2f Kč)",
                decision.moment.interval,
                decision.strategy,
                decision.cost
            )

        # Convert modes to mode names
        mode_names = []
        for mode in result.modes:
            if mode == CBBMode.HOME_I.value:
                mode_names.append("HOME_I")
            elif mode == CBBMode.HOME_III.value:
                mode_names.append("HOME_III")
            elif mode == CBBMode.HOME_UPS.value:
                mode_names.append("HOME_UPS")
            else:
                mode_names.append(f"UNKNOWN({mode})")

        return {
            "success": True,
            "modes": result.modes,
            "mode_names": mode_names,
            "total_cost": result.total_cost,
            "decisions_count": len(result.decisions),
            "states": result.states,
        }

    except Exception as e:
        _LOGGER.error("Economic planning failed: %s", e)
        return {
            "success": False,
            "error": str(e),
        }


async def apply_economic_plan(
    hass: HomeAssistant,
    modes: list[int],
    box_id: str = "",
) -> None:
    """Apply economic plan modes to battery box.

    Args:
        hass: Home Assistant instance
        modes: List of mode values for each interval
        box_id: Battery box ID
    """
    # This would integrate with the existing mode switching logic
    # For now, just log the planned modes
    _LOGGER.info("Economic plan generated with %d intervals", len(modes))

    # Count mode distribution
    home_i_count = sum(1 for m in modes if m == CBBMode.HOME_I.value)
    home_iii_count = sum(1 for m in modes if m == CBBMode.HOME_III.value)
    home_ups_count = sum(1 for m in modes if m == CBBMode.HOME_UPS.value)

    _LOGGER.info(
        "Mode distribution: HOME_I=%d, HOME_III=%d, HOME_UPS=%d",
        home_i_count, home_iii_count, home_ups_count
    )
