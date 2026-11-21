"""The boiler heating forecast for a live boiler runtime.

Reads what ``heating_forecast`` needs from the running boiler module: its last
plan, its tank and heater (the same topology the boiler planner uses), the top
(and bottom) thermometer, and the hot-water demand profile per 15-minute slot.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Mapping, Optional, Sequence

from homeassistant.util import dt as dt_util

from ..const import CONF_BOILER_HAS_ALTERNATIVE_HEATING
from .demand_profiler import MIN_CONFIDENCE_THRESHOLD, _get_day_category, _slot_index
from .heating_forecast import (
    BoilerHeatingForecast,
    build_heating_forecast,
    draw_scale,
    simulate_thermostat,
)

_LOGGER = logging.getLogger(__name__)

# A tank thermostat (capillary or electronic) switches back on a few kelvin
# under its setpoint; 5 K is the usual factory differential.
THERMOSTAT_HYSTERESIS_C = 5.0
# The tank stands indoors.
AMBIENT_TEMP_C = 20.0
# Standing loss of the tank. Measured on the reference 200 l tank, 7.-16. 11.
# 2026: nights without heating cooled it by 0.08-0.26 K/h at 27-43 °C, i.e.
# 1.0-2.4 W/K for a 19-20 °C room (the tank sat at 19 °C on the night of
# 11. 11.); 2.4 W/K is the median, about 2.3 kWh a day at 60 °C. An energy
# class C tank (EN 50440) would be 1.8 W/K, so this is the conservative end.
TANK_LOSS_W_PER_K = 2.4
# Draw calibration: days of measured heat it looks back on, and how often.
CALIBRATION_DAYS = 14
CALIBRATION_REFRESH = timedelta(hours=24)


def _local(when: datetime) -> datetime:
    return dt_util.as_local(when) if when.tzinfo else when


def _demand_map(coordinator: Any, category: str) -> Any:
    profiler = getattr(coordinator, "_demand_profiler", None)
    if profiler is None:
        return None
    try:
        demand = profiler.get_demand_map(category)
    except Exception as err:  # profiler not ready: no draws
        _LOGGER.debug("Boiler demand map unavailable: %s", err)
        return None
    if demand is None or demand.confidence < MIN_CONFIDENCE_THRESHOLD:
        return None
    return demand


def model_daily_draw_kwh(coordinator: Any, day: date) -> float:
    """Draws the demand profile expects on ``day`` (sum of the slots' p80)."""
    demand = _demand_map(coordinator, _get_day_category(datetime.combine(day, datetime.min.time())))
    if demand is None:
        return 0.0
    return float(sum(float(slot.p80_kwh or 0.0) for slot in demand.slots))


async def async_fetch_daily_totals(
    hass: Any, statistic_ids: set[str], start: datetime, end: datetime
) -> Mapping[str, List[Any]]:
    from homeassistant.components.recorder import get_instance
    from homeassistant.components.recorder.statistics import statistics_during_period

    def _read() -> Mapping[str, List[Any]]:
        # "state" = the counter's last value of the day. The boiler energy
        # sensors reset at midnight, and "change" double-counts every restart
        # (the counter drops to 0 and comes back), e.g. 52 kWh on 5. 11. 2026
        # for a 13 kWh day.
        return statistics_during_period(hass, start, end, statistic_ids, "day", None, {"state"})

    return await get_instance(hass).async_add_executor_job(_read)


def _row_day(row: Mapping[str, Any]) -> Optional[date]:
    start = row.get("start")
    if isinstance(start, datetime):
        return dt_util.as_local(start).date()
    if isinstance(start, (int, float)):
        seconds = start / 1000.0 if start > 1e11 else float(start)
        return dt_util.as_local(dt_util.utc_from_timestamp(seconds)).date()
    return None


async def async_refresh_draw_scale(
    hass: Any, runtime: Any, *, now: Optional[datetime] = None
) -> float:
    """Recompute the draw calibration from measured heat, at most once a day."""
    now = now or dt_util.now()
    current = float(getattr(runtime, "heating_draw_scale", 1.0) or 1.0)
    last = getattr(runtime, "heating_draw_scale_at", None)
    if isinstance(last, datetime) and now - last < CALIBRATION_REFRESH:
        return current
    coordinator = getattr(runtime, "coordinator", None)
    box_id = getattr(runtime, "box_id", None) or getattr(coordinator, "box_id", None)
    config = dict(getattr(coordinator, "config", {}) or {})
    if not box_id:
        return current
    ids = {f"sensor.oig_{box_id}_boiler_{part}_energy" for part in ("fve", "grid", "alt")}
    today = dt_util.as_local(now).replace(hour=0, minute=0, second=0, microsecond=0)
    try:
        rows = await async_fetch_daily_totals(
            hass, ids, today - timedelta(days=CALIBRATION_DAYS), today
        )
    except Exception as err:  # recorder busy or missing: keep the last factor
        _LOGGER.debug("Boiler draw calibration skipped: %s", err)
        return current
    measured: Dict[date, float] = {}
    for entity_rows in (rows or {}).values():
        for row in entity_rows or []:
            day = _row_day(row)
            total = row.get("state")
            if day is not None and isinstance(total, (int, float)) and total > 0:
                measured[day] = measured.get(day, 0.0) + float(total)
    days = sorted(measured)
    try:
        target = float(config.get("boiler_target_temp_c", 60.0))
    except (TypeError, ValueError):
        target = 60.0
    loss = TANK_LOSS_W_PER_K * max(0.0, target - AMBIENT_TEMP_C) * 24 / 1000.0
    model = [model_daily_draw_kwh(coordinator, d) for d in days]
    if not any(model):
        # Demand profile not loaded yet (right after start): try again next
        # cycle rather than settle on 1.0 for a day.
        return current
    scale = draw_scale([measured[d] for d in days], model, loss)
    runtime.heating_draw_scale = scale
    runtime.heating_draw_scale_at = now
    _LOGGER.info(
        "Boiler draw calibration: %.2f from %d days of measured heat", scale, len(days)
    )
    return scale


def _draws(coordinator: Any, slot_starts: Sequence[datetime]) -> List[float]:
    if getattr(coordinator, "_demand_profiler", None) is None:
        return [0.0] * len(slot_starts)
    maps: Dict[str, Any] = {}
    draws: List[float] = []
    for start in slot_starts:
        local = _local(start)
        category = _get_day_category(local)
        if category not in maps:
            maps[category] = _demand_map(coordinator, category)
        demand = maps[category]
        if demand is None:
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
    scale = float(getattr(runtime, "heating_draw_scale", 1.0) or 1.0)

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
                draws_kwh=[d * scale for d in _draws(coordinator, slot_starts)],
                ambient_c=AMBIENT_TEMP_C,
                loss_w_per_k=TANK_LOSS_W_PER_K,
            )

    # An unplanned boiler with an alternative source (gas) heats from it: its
    # own thermostat does not wait for cheap electricity.
    electric = not bool(config.get(CONF_BOILER_HAS_ALTERNATIVE_HEATING, False))
    return build_heating_forecast(
        plan_result=plan_result, thermostat=thermostat, electric=electric, scale=scale
    )


def electric_kwh_for_slots(
    forecast: BoilerHeatingForecast, slot_starts: Sequence[datetime]
) -> List[float]:
    """The forecast's electric heat on the planner's slots (0 where it has none)."""
    by_start: Dict[datetime, float] = {}
    for start, kwh in forecast.electric_kwh_by_start().items():
        key = _local(start).replace(second=0, microsecond=0)
        by_start[key] = by_start.get(key, 0.0) + kwh
    return [by_start.get(_local(start).replace(second=0, microsecond=0), 0.0) for start in slot_starts]
