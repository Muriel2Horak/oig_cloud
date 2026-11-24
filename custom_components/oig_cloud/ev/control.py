"""Acting on the car's plan: the charging switch, the current, the limit, heating.

What switches the charging is the user's choice (``ev_control_mode``):

* ``none``: nothing; an automation reads the plan sensor;
* ``wallbox``: a charger's switch (any integration; answers within minutes);
* ``car``: the car's own charging switch (a vendor cloud: slower, fewer
  commands).

The switch is any ``switch`` or ``input_boolean``; ``ev_switch_inverted``
reads it as "pause" (on = paused) for chargers that expose it that way.

Rules:

* The switch follows the plan's "charge now" while the car is plugged in.
* Someone else flipping the switch (wallbox app, car app, a person) wins until
  the next departure, until the car is unplugged, until the switch is back
  where the plan wants it, or until the user picks a charging choice in the
  dashboard.
* A command is not repeated before the device had time to answer (both
  integrations poll a cloud), and a car cloud gets fewer commands.
* With current control on, the wallbox current follows the planned power of
  the slot (the breaker share and PV), within the number entity's range.
* With limit raising on, a trip day raises the car's charge limit to 100 %
  and the old limit comes back after the departure.
* Stopping or restarting the integration leaves the switch as it is; after a
  restart the first tick puts it back in line with the plan.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from ..const import (
    CONF_EV_CHARGE_LIMIT_ENTITY,
    CONF_EV_CLIMATE_COLD_C,
    CONF_EV_CLIMATE_ENTITY,
    CONF_EV_CLIMATE_MINUTES,
    CONF_EV_CLIMATE_PLUGGED_ONLY,
    CONF_EV_CLIMATE_TEMP_C,
    CONF_EV_CLIMATE_WHEN,
    CONF_EV_CONTROL_MODE,
    CONF_EV_CURRENT_CONTROL,
    CONF_EV_CURRENT_ENTITY,
    CONF_EV_OUTSIDE_TEMP_ENTITY,
    CONF_EV_PHASES,
    CONF_EV_SWITCH_ENTITY,
    CONF_EV_SWITCH_INVERTED,
    CONF_EV_WINDOW_HEATING_ENTITY,
    DEFAULT_EV_CLIMATE_COLD_C,
    DEFAULT_EV_CLIMATE_MINUTES,
    DEFAULT_EV_CLIMATE_PLUGGED_ONLY,
    DEFAULT_EV_CLIMATE_TEMP_C,
    DEFAULT_EV_CLIMATE_WHEN,
    DEFAULT_EV_CONTROL_MODE,
    DEFAULT_EV_CURRENT_CONTROL,
    DEFAULT_EV_PHASES,
    DEFAULT_EV_SWITCH_INVERTED,
)
from . import backup_guard
from .precondition import PreconditionDecision, decide_precondition

_LOGGER = logging.getLogger(__name__)

MODE_NONE = "none"
MODE_WALLBOX = "wallbox"
MODE_CAR = "car"
# Time a cloud-polled device needs to show a command in its state, and the
# least time between two commands. The wallbox integration polls its cloud
# about once a minute; the car cloud is slower and rate-limited.
SETTLE = {MODE_WALLBOX: timedelta(minutes=3), MODE_CAR: timedelta(minutes=10)}
TICK = timedelta(minutes=1)
# The car's limit is set this long before a planned charge, and a limit
# command is not repeated sooner (car clouds answer in minutes).
LIMIT_LEAD = timedelta(minutes=15)
LIMIT_SETTLE = timedelta(minutes=10)
# A manual change without a known departure holds this long.
MANUAL_HOLD_FALLBACK = timedelta(hours=12)
# Mains phase voltage (CZ, ČSN EN 50160): amps from planned kW.
PHASE_VOLTAGE_V = 230.0
# Lowest current an AC charger offers (IEC 61851: 6 A).
MIN_CHARGE_A = 6.0
_ON = {"on", "true"}


@dataclass
class _Command:
    on: bool
    at: datetime


def amps_for_power(power_kw: float, phases: int, low: float, high: float) -> int:
    """Wallbox current for a planned power, within the charger's range."""
    if power_kw <= 0:
        return int(low)
    amps = math.ceil(power_kw * 1000.0 / (PHASE_VOLTAGE_V * max(1, phases)) - 1e-9)
    return int(max(low, min(high, amps)))


class EvController:
    def __init__(self, runtime: Any) -> None:
        self.runtime = runtime
        self._last_limit_cmd: Optional[tuple] = None
        self.hass = runtime.hass
        self.manual_hold_until: Optional[datetime] = None
        self.last_command: Optional[_Command] = None
        self.last_current_a: Optional[int] = None
        self.last_precondition: Optional[PreconditionDecision] = None
        self.preconditioned_for: Optional[datetime] = None
        self.last_error: Optional[str] = None
        # Since when a start waits for the box to report Home UPS (car on the
        # backup output).
        self.ups_wait_since: Optional[datetime] = None
        # Heating before departure keeps the wallbox on until the departure:
        # the car heats from the grid, not from its own battery, and charges
        # back to the target afterwards.
        self.preheat_until: Optional[datetime] = None
        # While the grid is dear (the battery plan runs Home 1), the heating
        # charge runs at the lowest current from the home battery. The value
        # the current entity had before, restored afterwards.
        self.reduced_from_a: Optional[float] = None
        self._unsub: Any = None

    # ── lifecycle ────────────────────────────────────────────────────────
    def start(self) -> None:
        self._unsub = async_track_time_interval(self.hass, self._async_tick, TICK)

    async def async_stop(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None

    def release_manual_hold(self) -> None:
        """The user chose in the dashboard: the plan decides again."""
        self.manual_hold_until = None
        self.last_command = None

    async def _async_tick(self, _now: Any = None) -> None:
        await self.async_apply()

    # ── helpers ──────────────────────────────────────────────────────────
    def _options(self) -> Dict[str, Any]:
        return self.runtime.live_options()

    def _switch_on(self, entity_id: str) -> Optional[bool]:
        state = self.hass.states.get(entity_id)
        if state is None or str(state.state) in ("unavailable", "unknown"):
            return None
        return str(state.state).lower() in _ON

    def _charging_allowed(self, entity_id: str, options: Dict[str, Any]) -> Optional[bool]:
        on = self._switch_on(entity_id)
        if on is None:
            return None
        inverted = bool(options.get(CONF_EV_SWITCH_INVERTED, DEFAULT_EV_SWITCH_INVERTED))
        return (not on) if inverted else on

    async def _set_charging(self, entity_id: str, options: Dict[str, Any], allow: bool) -> bool:
        inverted = bool(options.get(CONF_EV_SWITCH_INVERTED, DEFAULT_EV_SWITCH_INVERTED))
        domain = entity_id.split(".", 1)[0]
        if domain not in ("switch", "input_boolean"):
            self.last_error = f"unsupported switch entity {entity_id}"
            return False
        turn_on = allow != inverted
        return await self._call(domain, "turn_on" if turn_on else "turn_off", {"entity_id": entity_id})

    def _number(self, entity_id: Optional[str]) -> Optional[Any]:
        if not entity_id:
            return None
        state = self.hass.states.get(entity_id)
        if state is None:
            return None
        try:
            float(state.state)
        except (TypeError, ValueError):
            return None
        return state

    def _outside_c(self, entity_id: Optional[str]) -> Optional[float]:
        if not entity_id:
            return None
        state = self.hass.states.get(entity_id)
        if state is None:
            return None
        raw = state.attributes.get("temperature") if entity_id.startswith("weather.") else state.state
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None
        return None if math.isnan(value) else value

    async def _call(self, domain: str, service: str, data: Dict[str, Any]) -> bool:
        try:
            await self.hass.services.async_call(domain, service, data, blocking=False)
        except Exception as err:  # a missing entity must not stop the plan
            self.last_error = f"{domain}.{service}: {err}"
            _LOGGER.warning("EV control: %s.%s failed: %s", domain, service, err)
            return False
        self.last_error = None
        return True

    # ── the loop ─────────────────────────────────────────────────────────
    async def async_apply(self, now: Optional[datetime] = None) -> None:
        now = now or dt_util.now()
        options = self._options()
        plugged = self.runtime.last_plugged is not False
        if not plugged:
            # Unplugging ends a manual hold and forgets the last command.
            self.manual_hold_until = None
            self.last_command = None
        await self._apply_precondition(now, options, plugged)
        await self._apply_switch(now, options, plugged)
        await self._apply_limit(now, options)

    async def _apply_switch(self, now: datetime, options: Dict[str, Any], plugged: bool) -> None:
        mode = options.get(CONF_EV_CONTROL_MODE, DEFAULT_EV_CONTROL_MODE)
        switch = options.get(CONF_EV_SWITCH_ENTITY)
        plan = self.runtime.last_plan
        if mode not in (MODE_WALLBOX, MODE_CAR) or not switch or plan is None or not plugged:
            return
        current = self._charging_allowed(switch, options)
        if current is None:
            return
        settle = SETTLE[mode]
        last = self.last_command
        if last is not None and current != last.on and now - last.at > settle:
            # The switch moved away from our command: somebody else decided.
            day = self.runtime.next_day
            departure = day.departure if day is not None else None
            self.manual_hold_until = departure if departure and departure > now else now + MANUAL_HOLD_FALLBACK
            self.last_command = None
            _LOGGER.info("EV control: manual change, holding until %s", self.manual_hold_until)
        preheating = self.preheating(now)
        want = bool(plan.charge_now) or preheating
        if not want:
            self.ups_wait_since = None
        await self._apply_preheat_current(options, plan, preheating)
        if self.manual_hold_until is not None:
            # The hold ends at departure, or as soon as the switch is back
            # where the plan wants it (the person undid their change).
            if now < self.manual_hold_until and current != want:
                return
            self.manual_hold_until = None
            if current == want:
                self.last_command = _Command(want, now)
        if want and not self.on_home_battery() and options.get(CONF_EV_CURRENT_CONTROL, DEFAULT_EV_CURRENT_CONTROL):
            await self._apply_current(options, plan)
        if current == want:
            if last is None or last.on != want:
                self.last_command = _Command(want, now)
            return
        if last is not None and last.on == want and now - last.at <= settle:
            return  # sent, the device has not answered yet
        if want and not self.on_home_battery() and not self._box_ready_for_car(now, options):
            return
        if await self._set_charging(switch, options, want):
            self.last_command = _Command(want, now)
            if want:
                self.ups_wait_since = None

    def preheating(self, now: datetime) -> bool:
        """The car heats for a departure and the wallbox stays on until then."""
        if self.preheat_until is None:
            return False
        if now >= self.preheat_until or self.runtime.last_plugged is False:
            self.preheat_until = None
            return False
        return True

    def on_home_battery(self) -> bool:
        """The heating charge runs at the lowest current from the home battery.

        The auto-switch watchdog then leaves the box in Home 1 and steps in
        only when the box reports an inverter overload.
        """
        return self.reduced_from_a is not None

    def _grid_is_dear(self) -> bool:
        """The battery plan runs Home 1 now: grid power costs more than stored."""
        hook = getattr(self.runtime, "planned_box_mode", None)
        mode = hook() if callable(hook) else None
        return mode is not None and mode != backup_guard.HOME_UPS

    async def _apply_preheat_current(self, options: Dict[str, Any], plan: Any, preheating: bool) -> None:
        """Lowest charge current while heating at a dear grid price, else back."""
        entity = options.get(CONF_EV_CURRENT_ENTITY)
        state = self._number(entity)
        reduce = (
            state is not None
            and preheating
            and not plan.charge_now
            and backup_guard.on_backup(options)
            and self._grid_is_dear()
        )
        if reduce and state is not None:
            low = max(MIN_CHARGE_A, float(state.attributes.get("min", MIN_CHARGE_A) or MIN_CHARGE_A))
            if self.reduced_from_a is None:
                self.reduced_from_a = float(state.state)
            if abs(float(state.state) - low) >= 1:
                if await self._call("number", "set_value", {"entity_id": entity, "value": low}):
                    self.last_current_a = int(low)
                    _LOGGER.info("EV control: heating on the home battery at %s A (grid is dear)", int(low))
            return
        if self.reduced_from_a is not None:
            back = self.reduced_from_a
            self.reduced_from_a = None
            if state is not None and abs(float(state.state) - back) >= 1:
                await self._call("number", "set_value", {"entity_id": entity, "value": back})
                self.last_current_a = int(back)

    def _box_ready_for_car(self, now: datetime, options: Dict[str, Any]) -> bool:
        """A car on the backup output starts only once the box is in Home UPS.

        Asks for Home UPS and waits for the box to report it, at most
        ``PRESTART_MAX_WAIT``: a box that does not answer must not cost the
        departure, and the auto-switch watchdog keeps forcing Home UPS while
        the car draws.
        """
        if not backup_guard.on_backup(options):
            return True
        in_ups_hook = getattr(self.runtime, "box_in_ups", None)
        in_ups = in_ups_hook() if callable(in_ups_hook) else None
        if in_ups is None or in_ups:
            self.ups_wait_since = None
            return True
        if self.ups_wait_since is None:
            self.ups_wait_since = now
            request = getattr(self.runtime, "request_ups", None)
            if callable(request):
                request()
            _LOGGER.info("EV control: waiting for Home UPS before charging (car on the backup output)")
            return False
        if now - self.ups_wait_since >= backup_guard.PRESTART_MAX_WAIT:
            _LOGGER.warning(
                "EV control: box not in Home UPS after %s, charging anyway",
                backup_guard.PRESTART_MAX_WAIT,
            )
            self.ups_wait_since = None
            return True
        return False

    async def _apply_current(self, options: Dict[str, Any], plan: Any) -> None:
        entity = options.get(CONF_EV_CURRENT_ENTITY)
        state = self._number(entity)
        if state is None or not plan.slots:
            return
        low = float(state.attributes.get("min", 6) or 6)
        high = float(state.attributes.get("max", 16) or 16)
        phases = int(options.get(CONF_EV_PHASES, DEFAULT_EV_PHASES) or 3)
        amps = amps_for_power(plan.slots[0].power_kw, phases, low, high)
        if abs(float(state.state) - amps) < 1:
            self.last_current_a = amps
            return
        if await self._call("number", "set_value", {"entity_id": entity, "value": amps}):
            self.last_current_a = amps

    async def _apply_limit(self, now: datetime, options: Dict[str, Any]) -> None:
        entity = options.get(CONF_EV_CHARGE_LIMIT_ENTITY)
        if not entity or not entity.startswith("number."):
            return
        state = self._number(entity)
        if state is None:
            return
        value = float(state.state)
        day = self.runtime.next_day
        trip = (
            day is not None
            and day.full_charge
            and self.runtime.raise_limit_for_trip()
            and self.runtime.charge_override is None
        )
        saved = self.runtime.control_state.get("restore_limit")
        if trip and value < 100:
            if saved is None:
                self.runtime.control_state["restore_limit"] = value
                await self.runtime.async_save()
            await self._set_limit(now, entity, state, 100)
            return
        if not trip and saved is not None:
            if abs(value - float(saved)) >= 1:
                await self._set_limit(now, entity, state, float(saved))
            self.runtime.control_state.pop("restore_limit", None)
            await self.runtime.async_save()
            return
        # The user's target, written into the car when a charge is due: many
        # cars put their limit back (e.g. to 80 %) after every charge.
        target = self.runtime.user_target_limit()
        plan = self.runtime.last_plan
        if (
            target
            and self.runtime.set_car_limit()
            and plan is not None
            and (plan.charge_now or self._charge_soon(now, plan) or self.preheat_until is not None)
            and value < target - 0.5
        ):
            await self._set_limit(now, entity, state, target)

    @staticmethod
    def _charge_soon(now: datetime, plan: Any) -> bool:
        start = getattr(plan, "next_start", None)
        return start is not None and start - now <= LIMIT_LEAD

    async def _set_limit(self, now: datetime, entity: str, state: Any, value: float) -> None:
        """Set the car's limit within its range and step, once per settle time."""
        low = float(state.attributes.get("min", 0) or 0)
        high = float(state.attributes.get("max", 100) or 100)
        step = float(state.attributes.get("step", 1) or 1)
        wanted = min(high, max(low, math.ceil(value / step - 1e-9) * step))
        if abs(float(state.state) - wanted) < 0.5:
            return
        last = self._last_limit_cmd
        if last is not None and last[0] == wanted and now - last[1] < LIMIT_SETTLE:
            return  # sent; the car cloud has not answered yet
        if await self._call("number", "set_value", {"entity_id": entity, "value": wanted}):
            self._last_limit_cmd = (wanted, now)

    def _departure_day(self, now: datetime) -> Any:
        """The next day, leaving at the "charged by" time when the user set one.

        24. 11. 2026: "charged by 05:00" was set for a 05:00 departure, but the
        heating followed the profile's 07:00 and would have started at 06:40.
        """
        day = self.runtime.next_day
        override = getattr(self.runtime, "charge_override", None)
        until = getattr(override, "until", None)
        if (
            day is None
            or getattr(override, "mode", None) != "by"
            or until is None
            or until <= now
            or until.date() != day.day
        ):
            return day
        return replace(day, departure=until)

    async def _apply_precondition(self, now: datetime, options: Dict[str, Any], plugged: bool) -> None:
        climate = options.get(CONF_EV_CLIMATE_ENTITY)
        if not climate:
            self.last_precondition = None
            return
        day = self._departure_day(now)
        decision = decide_precondition(
            day,
            now,
            when=str(options.get(CONF_EV_CLIMATE_WHEN, DEFAULT_EV_CLIMATE_WHEN)),
            minutes=int(options.get(CONF_EV_CLIMATE_MINUTES, DEFAULT_EV_CLIMATE_MINUTES)),
            cold_c=float(options.get(CONF_EV_CLIMATE_COLD_C, DEFAULT_EV_CLIMATE_COLD_C)),
            outside_c=self._outside_c(options.get(CONF_EV_OUTSIDE_TEMP_ENTITY)),
            plugged=plugged,
            plugged_only=bool(options.get(CONF_EV_CLIMATE_PLUGGED_ONLY, DEFAULT_EV_CLIMATE_PLUGGED_ONLY)),
            already_done_for=self.preconditioned_for,
        )
        self.last_precondition = decision
        if not decision.start or day is None:
            return
        state = self.hass.states.get(climate)
        modes = list((state.attributes.get("hvac_modes") if state is not None else None) or [])
        hvac = next((m for m in ("heat_cool", "heat", "auto") if m in modes), None)
        data: Dict[str, Any] = {
            "entity_id": climate,
            "temperature": float(options.get(CONF_EV_CLIMATE_TEMP_C, DEFAULT_EV_CLIMATE_TEMP_C)),
        }
        if hvac:
            data["hvac_mode"] = hvac
        if await self._call("climate", "set_temperature", data):
            self.preconditioned_for = day.departure
            if plugged and options.get(CONF_EV_CONTROL_MODE, DEFAULT_EV_CONTROL_MODE) == MODE_WALLBOX:
                self.preheat_until = day.departure
            window = options.get(CONF_EV_WINDOW_HEATING_ENTITY)
            if window:
                await self._call("switch", "turn_on", {"entity_id": window})
            _LOGGER.info("EV control: heating the car for the %s departure", day.departure)

    def as_dict(self) -> Dict[str, Any]:
        options = self._options()
        return {
            "mode": options.get(CONF_EV_CONTROL_MODE, DEFAULT_EV_CONTROL_MODE),
            "switch_entity": options.get(CONF_EV_SWITCH_ENTITY) or None,
            "manual_hold_until": (
                self.manual_hold_until.isoformat() if self.manual_hold_until else None
            ),
            "last_command": (
                {"on": self.last_command.on, "at": self.last_command.at.isoformat()}
                if self.last_command
                else None
            ),
            "current_a": self.last_current_a,
            "precondition": self.last_precondition.as_dict() if self.last_precondition else None,
            "climate_entity": options.get(CONF_EV_CLIMATE_ENTITY) or None,
            "error": self.last_error,
            "preheat_until": self.preheat_until.isoformat() if self.preheat_until else None,
            "heating_on_home_battery": self.on_home_battery(),
            "waiting_for_ups_since": (
                self.ups_wait_since.isoformat() if self.ups_wait_since else None
            ),
        }
