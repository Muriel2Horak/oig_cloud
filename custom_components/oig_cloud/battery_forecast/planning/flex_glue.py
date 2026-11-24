"""Feed the car and the boiler into the battery forecast cycle.

Collects, for the planner's own slots, what ``flex_loads`` needs from the live
install: the car (``ev.runtime``), the boiler heating forecast of every boiler
runtime, the breaker and priority options, and the PV surplus the battery
leaves. Runs before the battery plan when the car outranks the battery on the
breaker, after it otherwise (then the battery's UPS charging is known).
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

from homeassistant.util import dt as dt_util

from ...const import (
    CONF_BOILER_ON_BACKUP_CIRCUIT,
    CONF_FLEX_PRIORITY,
    CONF_FLEX_PV_BATTERY_FIRST,
    CONF_GRID_BREAKER_A,
    CONF_GRID_PHASES,
    CONF_GRID_RESERVE_A,
    DEFAULT_BOILER_ON_BACKUP_CIRCUIT,
    DEFAULT_FLEX_PRIORITY,
    DEFAULT_FLEX_PV_BATTERY_FIRST,
    DEFAULT_GRID_BREAKER_A,
    DEFAULT_GRID_PHASES,
    DEFAULT_GRID_RESERVE_A,
    DOMAIN,
    KEY_BOILER_RUNTIMES,
)
from ..types import DEFAULT_CHARGE_EFFICIENCY, DEFAULT_EFFICIENCY
from .flex_loads import (
    CONSUMER_BATTERY,
    CONSUMER_EV,
    DEFAULT_PRIORITY,
    FlexInputs,
    FlexPlan,
    GridLimits,
    plan_flex_loads,
)

_LOGGER = logging.getLogger(__name__)


def _options(sensor: Any) -> Dict[str, Any]:
    entry = getattr(sensor, "_config_entry", None)
    return dict(getattr(entry, "options", None) or {})


def _hass(sensor: Any) -> Any:
    return getattr(sensor, "hass", None) or getattr(sensor, "_hass", None)


def parse_priority(raw: Any) -> tuple[str, ...]:
    if isinstance(raw, (list, tuple)):
        items = [str(x).strip().lower() for x in raw]
    else:
        items = [x.strip().lower() for x in str(raw or "").split(",")]
    known = [x for x in items if x in DEFAULT_PRIORITY]
    seen: List[str] = []
    for item in known + list(DEFAULT_PRIORITY):
        if item not in seen:
            seen.append(item)
    return tuple(seen)


def battery_outranks_car(options: Dict[str, Any]) -> bool:
    order = parse_priority(options.get(CONF_FLEX_PRIORITY, DEFAULT_FLEX_PRIORITY))
    return order.index(CONSUMER_BATTERY) < order.index(CONSUMER_EV)


def ev_on_backup(options: Dict[str, Any]) -> bool:
    from ...ev.backup_guard import on_backup

    return on_backup(options)


def boiler_on_backup(sensor: Any) -> bool:
    return bool(_options(sensor).get(CONF_BOILER_ON_BACKUP_CIRCUIT, DEFAULT_BOILER_ON_BACKUP_CIRCUIT))


def estimate_surplus_after_battery(
    solar: Sequence[float],
    load: Sequence[float],
    *,
    soc_kwh: float,
    max_kwh: float,
    min_kwh: float,
) -> List[float]:
    """PV that reaches the grid side when the battery takes surplus first (Home 1)."""
    soc = soc_kwh
    surplus_out: List[float] = []
    for i in range(len(solar)):
        sun = max(0.0, float(solar[i]))
        use = max(0.0, float(load[i])) if i < len(load) else 0.0
        surplus = max(0.0, sun - use)
        room = max(0.0, (max_kwh - soc) / DEFAULT_CHARGE_EFFICIENCY)
        charge = min(surplus, room)
        soc += charge * DEFAULT_CHARGE_EFFICIENCY
        surplus_out.append(surplus - charge)
        deficit = max(0.0, use - sun)
        if deficit > 0:
            soc = max(min_kwh, soc - deficit / DEFAULT_EFFICIENCY)
    return surplus_out


def _slot_starts(spot_prices: Sequence[Dict[str, Any]]) -> List[datetime]:
    starts: List[datetime] = []
    for point in spot_prices:
        ts = datetime.fromisoformat(str(point.get("time")))
        starts.append(dt_util.as_local(ts) if ts.tzinfo is None else ts)
    return starts


def _boiler_runtimes(hass: Any) -> List[Any]:
    data = getattr(hass, "data", None)
    if not isinstance(data, dict):
        return []
    runtimes: List[Any] = []
    for entry_data in data.get(DOMAIN, {}).values():
        if isinstance(entry_data, dict):
            found = entry_data.get(KEY_BOILER_RUNTIMES, {})
            if isinstance(found, dict):
                runtimes.extend(found.values())
    return runtimes


def boiler_electric_forecast(
    sensor: Any, slot_starts: Sequence[datetime]
) -> Optional[List[float]]:
    """Electric heat per slot over all boiler runtimes; None without a boiler.

    Each runtime keeps its forecast (``heating_forecast``) for the boiler
    forecast sensor.
    """
    hass = _hass(sensor)
    runtimes = _boiler_runtimes(hass)
    if not runtimes:
        return None
    from ...boiler.heating_forecast_live import boiler_heating_forecast, electric_kwh_for_slots

    total = [0.0] * len(slot_starts)
    for runtime in runtimes:
        try:
            forecast = boiler_heating_forecast(hass, runtime, slot_starts)
        except Exception as err:  # never let the boiler stop the battery plan
            _LOGGER.debug("Boiler heating forecast failed: %s", err)
            continue
        try:
            setattr(runtime, "heating_forecast", forecast)
        except Exception:  # pragma: no cover - frozen runtime
            pass
        for i, kwh in enumerate(electric_kwh_for_slots(forecast, slot_starts)):
            total[i] += kwh
    return total


async def async_refresh_boiler_calibration(sensor: Any) -> None:
    """Daily draw calibration of every boiler's heating forecast (never raises)."""
    hass = _hass(sensor)
    from ...boiler import heating_forecast_live

    for runtime in _boiler_runtimes(hass):
        try:
            await heating_forecast_live.async_refresh_draw_scale(hass, runtime)
        except Exception as err:  # the boiler never stops the battery plan
            _LOGGER.debug("Boiler draw calibration failed: %s", err)


def request_flex_replan(sensor: Any) -> None:
    """The car's charging choice or calendar changed: plan again now.

    Unlike a live-load replan it keeps the battery's plan lock: the battery's
    inputs did not change, only the car's. ``forecast_update`` runs the bucket
    again while ``_flex_replan`` is set.
    """
    sensor._flex_replan = True
    retry = getattr(sensor, "_schedule_forecast_retry", None)
    if callable(retry):
        retry(1.0)


def _attach_box_hooks(sensor: Any, ev_runtime: Any) -> None:
    """Let the car controller see and ask for Home UPS (car on the backup output)."""
    from .auto_switch import (
        REASON_EV_BACKUP_PRESTART,
        get_current_box_mode,
        request_ev_backup_ups,
    )
    from ..types import SERVICE_MODE_HOME_UPS

    def box_in_ups() -> Optional[bool]:
        mode = get_current_box_mode(sensor)
        return None if mode is None else mode == SERVICE_MODE_HOME_UPS

    def request_ups() -> None:
        hass = _hass(sensor)
        if hass is None:
            return
        hass.async_create_task(
            request_ev_backup_ups(sensor, REASON_EV_BACKUP_PRESTART, {"source": "ev_control"})
        )

    def planned_box_mode() -> Optional[str]:
        from .auto_switch import get_mode_switch_timeline, get_planned_mode_for_time

        timeline, _ = get_mode_switch_timeline(sensor)
        if not timeline:
            return None
        return get_planned_mode_for_time(sensor, dt_util.now(), timeline)

    ev_runtime.box_in_ups = box_in_ups
    ev_runtime.request_ups = request_ups
    ev_runtime.planned_box_mode = planned_box_mode


def _ev_runtime(sensor: Any) -> Any:
    from ...ev.runtime import get_ev_runtime

    entry = getattr(sensor, "_config_entry", None)
    entry_id = getattr(entry, "entry_id", None)
    hass = _hass(sensor)
    if hass is None or not entry_id:
        return None
    return get_ev_runtime(hass, entry_id)


def coordinate_flex_loads(
    sensor: Any,
    *,
    spot_prices: Sequence[Dict[str, Any]],
    export_prices: Sequence[Dict[str, Any]],
    solar_kwh: Sequence[float],
    load_kwh: Sequence[float],
    current_capacity: float,
    max_capacity: float,
    min_capacity: float,
    charge_rate_kw: float,
    battery_ups_kwh: Optional[Sequence[float]] = None,
) -> Optional[FlexPlan]:
    """The flexible-load plan for this cycle, or None when there is nothing to share."""
    if not spot_prices:
        return None
    options = _options(sensor)
    try:
        starts = _slot_starts(spot_prices)
    except (TypeError, ValueError):
        return None
    n = len(starts)

    ev_runtime = _ev_runtime(sensor)
    if ev_runtime is not None:
        ev_runtime.request_replan = lambda: request_flex_replan(sensor)
        _attach_box_hooks(sensor, ev_runtime)
    ev_request = ev_runtime.build_request() if ev_runtime is not None else None
    boiler_kwh = boiler_electric_forecast(sensor, starts)
    if ev_request is None and not boiler_kwh:
        if ev_runtime is not None:
            ev_runtime.publish(None)
        return None

    limits = GridLimits(
        breaker_a=float(options.get(CONF_GRID_BREAKER_A, DEFAULT_GRID_BREAKER_A) or 0.0),
        reserve_a=float(options.get(CONF_GRID_RESERVE_A, DEFAULT_GRID_RESERVE_A) or 0.0),
        phases=int(options.get(CONF_GRID_PHASES, DEFAULT_GRID_PHASES) or 3),
    )
    if limits.breaker_a <= 0:
        # No breaker configured: nothing limits the grid side.
        limits = GridLimits(breaker_a=1e6, reserve_a=0.0, phases=limits.phases)
    solar = [float(solar_kwh[i]) if i < len(solar_kwh) else 0.0 for i in range(n)]
    load = [float(load_kwh[i]) if i < len(load_kwh) else 0.0 for i in range(n)]
    plan = plan_flex_loads(
        FlexInputs(
            slot_starts=starts,
            import_prices=[float(p.get("price", 0.0) or 0.0) for p in spot_prices],
            export_prices=[
                float(export_prices[i].get("price", 0.0) or 0.0) if i < len(export_prices) else 0.0
                for i in range(n)
            ],
            solar_kwh=solar,
            backup_load_kwh=load,
            surplus_after_battery_kwh=estimate_surplus_after_battery(
                solar,
                load,
                soc_kwh=current_capacity,
                max_kwh=max_capacity,
                min_kwh=min_capacity,
            ),
            battery_charge_kw=charge_rate_kw,
            limits=limits,
            priority=parse_priority(options.get(CONF_FLEX_PRIORITY, DEFAULT_FLEX_PRIORITY)),
            pv_battery_first=bool(
                options.get(CONF_FLEX_PV_BATTERY_FIRST, DEFAULT_FLEX_PV_BATTERY_FIRST)
            ),
            ev=ev_request,
            boiler_electric_kwh=boiler_kwh,
            battery_ups_kwh=battery_ups_kwh,
            ev_on_backup=ev_on_backup(options),
        )
    )
    if ev_runtime is not None:
        ev_runtime.publish(plan.ev_plan)
    sensor._flex_plan = plan
    return plan
