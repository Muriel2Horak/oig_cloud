"""The boiler heating forecast for a live boiler runtime.

Reads what ``heating_forecast`` needs from the running boiler module: its last
plan, its tank and heater (the same topology the boiler planner uses), the top
(and bottom) thermometer, and the hot-water demand profile per 15-minute slot.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

from homeassistant.util import dt as dt_util

from ..const import CONF_BOILER_HAS_ALTERNATIVE_HEATING
from .demand_profiler import MIN_CONFIDENCE_THRESHOLD, _get_day_category, _slot_index
from .heating_forecast import BoilerHeatingForecast, build_heating_forecast, simulate_thermostat

_LOGGER = logging.getLogger(__name__)

# A tank thermostat (capillary or electronic) switches back on a few kelvin
# under its setpoint; 5 K is the usual factory differential.
THERMOSTAT_HYSTERESIS_C = 5.0
# The tank stands indoors.
AMBIENT_TEMP_C = 20.0
# Standing loss of a 150-200 l tank of energy class C (EN 50440): about
# 2 kWh a day at 65 °C in a 20 °C room, i.e. 1.8 W per kelvin.
TANK_LOSS_W_PER_K = 1.8


def _local(when: datetime) -> datetime:
    return dt_util.as_local(when) if when.tzinfo else when


def _draws(coordinator: Any, slot_starts: Sequence[datetime]) -> List[float]:
    profiler = getattr(coordinator, "_demand_profiler", None)
    if profiler is None:
        return [0.0] * len(slot_starts)
    maps: Dict[str, Any] = {}
    draws: List[float] = []
    for start in slot_starts:
        local = _local(start)
        category = _get_day_category(local)
        if category not in maps:
            try:
                maps[category] = profiler.get_demand_map(category)
            except Exception as err:  # profiler not ready: no draws
                _LOGGER.debug("Boiler demand map unavailable: %s", err)
                maps[category] = None
        demand = maps[category]
        if demand is None or demand.confidence < MIN_CONFIDENCE_THRESHOLD:
            draws.append(0.0)
            continue
        slot = demand.slots[_slot_index(local)]
        draws.append(float(slot.p80_kwh or 0.0))
    return draws


def _start_temperature(hass: Any, config: Dict[str, Any], now: datetime) -> Optional[float]:
    from .runtime import resolve_temperature_state

    state = resolve_temperature_state(hass=hass, config=config, now=now)
    if state.top_temp_c is None:
        return None
    if state.bottom_temp_c is None:
        return float(state.top_temp_c)
    return (float(state.top_temp_c) + float(state.bottom_temp_c)) / 2.0


def boiler_heating_forecast(
    hass: Any,
    runtime: Any,
    slot_starts: Sequence[datetime],
    *,
    now: Optional[datetime] = None,
) -> BoilerHeatingForecast:
    """Heat the boiler takes per slot: its plan, else its thermostat."""
    now = now or dt_util.now()
    coordinator = getattr(runtime, "coordinator", None)
    config = dict(getattr(coordinator, "config", {}) or {})
    plan_result = getattr(runtime, "last_plan_result", None)

    thermostat = None
    if not getattr(plan_result, "slots", None):
        from .runtime import _build_planner_topology

        try:
            topology = _build_planner_topology(config)
            start_temp = _start_temperature(hass, config, now)
        except Exception as err:  # incomplete setup: no thermostat forecast
            _LOGGER.debug("Boiler thermostat forecast skipped: %s", err)
            topology, start_temp = None, None
        if topology is not None and start_temp is not None:
            thermostat = simulate_thermostat(
                slot_starts=list(slot_starts),
                start_temp_c=start_temp,
                volume_l=topology.tank_volume_l,
                setpoint_c=topology.target_temp_c,
                hysteresis_c=THERMOSTAT_HYSTERESIS_C,
                heater_kw=topology.heater_power_kw,
                draws_kwh=_draws(coordinator, slot_starts),
                ambient_c=AMBIENT_TEMP_C,
                loss_w_per_k=TANK_LOSS_W_PER_K,
            )

    # An unplanned boiler with an alternative source (gas) heats from it: its
    # own thermostat does not wait for cheap electricity.
    electric = not bool(config.get(CONF_BOILER_HAS_ALTERNATIVE_HEATING, False))
    return build_heating_forecast(plan_result=plan_result, thermostat=thermostat, electric=electric)


def electric_kwh_for_slots(
    forecast: BoilerHeatingForecast, slot_starts: Sequence[datetime]
) -> List[float]:
    """The forecast's electric heat on the planner's slots (0 where it has none)."""
    by_start: Dict[datetime, float] = {}
    for start, kwh in forecast.electric_kwh_by_start().items():
        key = _local(start).replace(second=0, microsecond=0)
        by_start[key] = by_start.get(key, 0.0) + kwh
    return [by_start.get(_local(start).replace(second=0, microsecond=0), 0.0) for start in slot_starts]
