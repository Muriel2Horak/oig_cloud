"""A car on the box's backup output charges only in Home UPS.

In Home 1 the inverter feeds the backup output from the battery. An 11 kW car
there overloads it: on 21. 11. 2026 the box reported ``ERR_ELSE=4`` within a
minute of every charge start in Home 1 and moved the backup load to its bypass
after about two minutes; between 02:45 and 04:01 the car ran from the battery
down to 19 %. In Home UPS the grid feeds the backup output, so the inverter
carries nothing.

Three places keep the car and the box apart:

* the battery plan puts Home UPS in every slot the car plan charges in
  (``planning.flex_loads``);
* the car controller does not switch the wallbox on before the box reports
  Home UPS (``ev.control``), at most ``PRESTART_MAX_WAIT``;
* the auto-switch watchdog forces Home UPS when the car draws power in another
  mode for ``OVERLOAD_GRACE`` (the car started by itself, the plan changed),
  and does not leave Home UPS while it draws.

In Home UPS the box also charges the battery from the grid; with the car on
the same main breaker that charge current is lowered to what the breaker leaves.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Any, Mapping, Optional

from ..const import (
    CONF_EV_CHARGER_POWER_ENTITY,
    CONF_EV_ON_BACKUP_CIRCUIT,
    CONF_GRID_BREAKER_A,
    CONF_GRID_PHASES,
    CONF_GRID_RESERVE_A,
    DEFAULT_EV_ON_BACKUP_CIRCUIT,
    DEFAULT_GRID_BREAKER_A,
    DEFAULT_GRID_PHASES,
    DEFAULT_GRID_RESERVE_A,
)

# Wallbox power that counts as charging. The car's own trickle and the
# wallbox's standby stay well below (measured 0 kW between charges).
CAR_DRAW_KW = 1.0
# How long the car may draw in Home 1 before the box is forced to Home UPS.
# The box itself moves the load to its bypass after about two minutes; the
# watchdog runs every 30 s, so the switch is asked for within 60-90 s.
OVERLOAD_GRACE = timedelta(seconds=60)
# How long a planned charge waits for the box to report Home UPS. After that
# it starts anyway (a box that does not answer must not cost the departure);
# the watchdog keeps forcing Home UPS.
PRESTART_MAX_WAIT = timedelta(minutes=5)
# Lowest battery charge current written while the car shares the breaker.
MIN_UPS_CHARGE_A = 10
PHASE_VOLTAGE_V = 230.0
# Grid power per watt into the battery (AC/DC conversion of grid charging).
GRID_CHARGE_EFFICIENCY = 0.95

HOME_UPS = "Home UPS"


def on_backup(options: Mapping[str, Any]) -> bool:
    return bool(options.get(CONF_EV_ON_BACKUP_CIRCUIT, DEFAULT_EV_ON_BACKUP_CIRCUIT))


def car_draw_kw(hass: Any, options: Mapping[str, Any]) -> Optional[float]:
    """Live wallbox power in kW, None when unknown."""
    entity_id = options.get(CONF_EV_CHARGER_POWER_ENTITY)
    if not entity_id or hass is None:
        return None
    state = hass.states.get(entity_id)
    if state is None:
        return None
    try:
        value = float(state.state)
    except (TypeError, ValueError):
        return None
    if math.isnan(value):
        return None
    unit = str((getattr(state, "attributes", None) or {}).get("unit_of_measurement") or "kW")
    return value / 1000.0 if unit.lower() == "w" else value


def car_drawing(hass: Any, options: Mapping[str, Any]) -> bool:
    """The car on the backup output draws power right now."""
    if not on_backup(options):
        return False
    kw = car_draw_kw(hass, options)
    return kw is not None and kw >= CAR_DRAW_KW


class OverloadTimer:
    """How long the car has drawn outside Home UPS."""

    def __init__(self) -> None:
        self.since: Optional[datetime] = None

    def due(self, now: datetime, drawing: bool, in_ups: bool) -> bool:
        """True when Home UPS must be forced now."""
        if not drawing or in_ups:
            self.since = None
            return False
        if self.since is None:
            self.since = now
        return now - self.since >= OVERLOAD_GRACE


# The box's "other errors" register shows bit 4 while the inverter is
# overloaded: on 21. 11. 2026 it went 0 -> 4 within a minute of every 11 kW
# charge start in Home 1 and back to 0 in Home UPS or bypass.
OVERLOAD_ERROR_BIT = 4


def inverter_overloaded(hass: Any, box_id: Optional[str]) -> bool:
    """The box reports an inverter overload (``tbl_invertor_prms_err_else``)."""
    if hass is None or not box_id:
        return False
    state = hass.states.get(f"sensor.oig_local_{box_id}_tbl_invertor_prms_err_else")
    if state is None:
        return False
    try:
        return bool(int(float(state.state)) & OVERLOAD_ERROR_BIT)
    except (TypeError, ValueError):
        return False


def breaker_limit_w(options: Mapping[str, Any]) -> Optional[float]:
    breaker = float(options.get(CONF_GRID_BREAKER_A, DEFAULT_GRID_BREAKER_A) or 0.0)
    if breaker <= 0:
        return None
    reserve = float(options.get(CONF_GRID_RESERVE_A, DEFAULT_GRID_RESERVE_A) or 0.0)
    phases = int(options.get(CONF_GRID_PHASES, DEFAULT_GRID_PHASES) or 3)
    return max(0.0, breaker - reserve) * PHASE_VOLTAGE_V * max(1, phases)


def battery_charge_amps_for_breaker(
    options: Mapping[str, Any],
    house_w: Optional[float],
    battery_v: Optional[float],
    wanted_a: int,
) -> int:
    """Battery charge current that fits the main breaker next to the house and the car.

    ``house_w`` is everything the house draws besides the battery charging,
    the car included (the box's backup plus non-backup load). Without a
    breaker, a load or a voltage the wanted current stays.
    """
    limit = breaker_limit_w(options)
    if limit is None or house_w is None or not battery_v or battery_v <= 0:
        return wanted_a
    room_a = max(0.0, limit - max(0.0, house_w)) * GRID_CHARGE_EFFICIENCY / battery_v
    return int(min(wanted_a, max(MIN_UPS_CHARGE_A, math.floor(room_a))))
