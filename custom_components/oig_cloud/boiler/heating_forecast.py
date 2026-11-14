"""How much heat the boiler will take, and when, whatever the source.

The boiler planner decides *where* heat comes from (grid, PV, battery, the
alternative source). Everything else that plans around the boiler — the home
battery, the car, the breaker — first needs to know how much the boiler will
draw in each slot. This module answers that, independent of the source:

* with a boiler plan, its slots are the forecast (heat per slot, split by the
  source the plan chose);
* without one (start-up, setup incomplete, planner held), the tank is simulated
  under its own thermostat: hot-water draws from the demand profile and
  standing loss cool it, and the heater switches on below ``setpoint −
  hysteresis`` and runs at full power until the setpoint is back. That is what
  an unplanned boiler does, so it is the honest forecast for it.

The plan's own temperature prediction knows only its heating; the thermostat
simulation here is where draws and losses enter.

Pure: lists and dataclasses in and out.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

# Heat capacity of water: 4186 J/(kg·K) / 3.6 MJ/kWh, per litre.
WATER_KWH_PER_L_K = 4186.0 / 3_600_000.0
# Energy below this is rounding, not heating.
_EPS_KWH = 1e-9

METHOD_PLAN = "plan"
METHOD_THERMOSTAT = "thermostat"
METHOD_NONE = "none"


@dataclass(frozen=True)
class HeatingSlot:
    """Heat the boiler takes in one slot, and from where."""

    start: datetime
    heat_kwh: float
    electric_kwh: float
    pv_kwh: float = 0.0
    grid_kwh: float = 0.0
    battery_kwh: float = 0.0
    alt_kwh: float = 0.0
    temp_c: Optional[float] = None
    draw_kwh: float = 0.0
    loss_kwh: float = 0.0
    method: str = METHOD_THERMOSTAT

    def as_dict(self) -> dict:
        return {
            "start": self.start.isoformat(),
            "heat_kwh": round(self.heat_kwh, 3),
            "electric_kwh": round(self.electric_kwh, 3),
            "pv_kwh": round(self.pv_kwh, 3),
            "grid_kwh": round(self.grid_kwh, 3),
            "battery_kwh": round(self.battery_kwh, 3),
            "alt_kwh": round(self.alt_kwh, 3),
            "temp_c": None if self.temp_c is None else round(self.temp_c, 1),
        }


@dataclass
class BoilerHeatingForecast:
    method: str
    slots: List[HeatingSlot] = field(default_factory=list)

    @property
    def total_heat_kwh(self) -> float:
        return sum(slot.heat_kwh for slot in self.slots)

    @property
    def electric_kwh(self) -> float:
        return sum(slot.electric_kwh for slot in self.slots)

    @property
    def first_heat_at(self) -> Optional[datetime]:
        return next((s.start for s in self.slots if s.heat_kwh > _EPS_KWH), None)

    def electric_kwh_by_start(self) -> Dict[datetime, float]:
        return {s.start: s.electric_kwh for s in self.slots if s.electric_kwh > _EPS_KWH}

    def as_dict(self) -> dict:
        first = self.first_heat_at
        return {
            "method": self.method,
            "total_heat_kwh": round(self.total_heat_kwh, 2),
            "electric_kwh": round(self.electric_kwh, 2),
            "first_heat_at": first.isoformat() if first else None,
            "slots": [s.as_dict() for s in self.slots if s.heat_kwh > _EPS_KWH],
        }


def simulate_thermostat(
    *,
    slot_starts: Sequence[datetime],
    start_temp_c: float,
    volume_l: float,
    setpoint_c: float,
    hysteresis_c: float,
    heater_kw: float,
    draws_kwh: Sequence[float],
    ambient_c: float,
    loss_w_per_k: float,
    slot_minutes: int = 15,
) -> List[HeatingSlot]:
    """One-node tank under its thermostat, slot by slot."""
    if volume_l <= 0:
        return []
    heat_capacity = volume_l * WATER_KWH_PER_L_K  # kWh per K
    hours = slot_minutes / 60.0
    switch_on_c = setpoint_c - max(0.0, hysteresis_c)
    temp = float(start_temp_c)
    heating = temp < switch_on_c
    slots: List[HeatingSlot] = []
    for i, start in enumerate(slot_starts):
        draw = max(0.0, float(draws_kwh[i]) if i < len(draws_kwh) else 0.0)
        loss = max(0.0, loss_w_per_k * (temp - ambient_c) * hours / 1000.0)
        temp -= (draw + loss) / heat_capacity
        if temp < switch_on_c:
            heating = True
        heat = 0.0
        if heating:
            heat = max(0.0, min(heater_kw * hours, (setpoint_c - temp) * heat_capacity))
            temp += heat / heat_capacity
            if temp >= setpoint_c - 1e-9:
                heating = False
        slots.append(
            HeatingSlot(
                start=start,
                heat_kwh=heat,
                electric_kwh=heat,
                grid_kwh=heat,
                temp_c=temp,
                draw_kwh=draw,
                loss_kwh=loss,
                method=METHOD_THERMOSTAT,
            )
        )
    return slots


def _num(slot: Any, name: str) -> float:
    try:
        return max(0.0, float(getattr(slot, name, 0.0) or 0.0))
    except (TypeError, ValueError):
        return 0.0


def forecast_from_plan(plan_result: Any) -> List[HeatingSlot]:
    """The boiler plan's slots as a heating forecast, split by source."""
    slots: List[HeatingSlot] = []
    for slot in getattr(plan_result, "slots", None) or []:
        start = getattr(slot, "start", None)
        if not isinstance(start, datetime):
            continue
        pv = _num(slot, "pv_kwh")
        grid = _num(slot, "grid_kwh")
        battery = _num(slot, "battery_kwh")
        alt = _num(slot, "alt_kwh")
        electric = pv + grid + battery
        temp = getattr(slot, "predicted_top_temp_c", None)
        slots.append(
            HeatingSlot(
                start=start,
                heat_kwh=max(_num(slot, "heating_kwh"), electric + alt),
                electric_kwh=electric,
                pv_kwh=pv,
                grid_kwh=grid,
                battery_kwh=battery,
                alt_kwh=alt,
                temp_c=float(temp) if isinstance(temp, (int, float)) and temp else None,
                method=METHOD_PLAN,
            )
        )
    return slots


def build_heating_forecast(
    *,
    plan_result: Any,
    thermostat: Optional[Sequence[HeatingSlot]],
    electric: bool = True,
) -> BoilerHeatingForecast:
    """The plan when there is one, the thermostat simulation otherwise.

    ``electric=False`` says the unplanned boiler heats from its alternative
    source (gas), so the thermostat heat is not an electric load.
    """
    planned = forecast_from_plan(plan_result) if plan_result is not None else []
    if planned:
        return BoilerHeatingForecast(method=METHOD_PLAN, slots=planned)
    if thermostat:
        if electric:
            return BoilerHeatingForecast(method=METHOD_THERMOSTAT, slots=list(thermostat))
        return BoilerHeatingForecast(
            method=METHOD_THERMOSTAT,
            slots=[
                HeatingSlot(
                    start=s.start,
                    heat_kwh=s.heat_kwh,
                    electric_kwh=0.0,
                    alt_kwh=s.heat_kwh,
                    temp_c=s.temp_c,
                    draw_kwh=s.draw_kwh,
                    loss_kwh=s.loss_kwh,
                    method=METHOD_THERMOSTAT,
                )
                for s in thermostat
            ],
        )
    return BoilerHeatingForecast(method=METHOD_NONE)
