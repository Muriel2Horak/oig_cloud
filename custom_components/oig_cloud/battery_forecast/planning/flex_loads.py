"""Car, boiler and home battery against one PV surplus and one main breaker.

The car and the boiler hang on the box's non-backup circuit (measured on the
reference install: 11 kW in the wallbox showed on ``acinb``, not on the backup
load). The battery therefore never feeds them; they draw from the grid side,
where they meet the battery's grid charging under one main breaker.

Two resources are shared, each in priority order:

* **The breaker.** Per phase, the house (backup load, counted as grid draw: in
  Home UPS it is) and the reserve come off first, then each consumer in
  ``priority`` order. A three-phase car gets the room of the most loaded phase
  on all three; a one-phase boiler lands on the most loaded phase (which phase
  it really is, the planner does not know). The battery's grid charging is a
  block of fixed power, so where it no longer fits after the consumers ranked
  above it, Home UPS is not allowed in that slot. Consumers ranked below the
  battery get the room its UPS slots leave.
* **The PV surplus.** By default it goes where the box sends it: backup load,
  then battery, then the grid side, where the car and the boiler take it
  before export. The car and the boiler then get the surplus left after the
  battery (``surplus_after_battery_kwh``). With ``pv_battery_first`` off, they
  take it by ``priority`` before the battery, and the battery plan is given
  only what they leave. The box does not do that by itself (no Home mode
  sends PV to the non-backup circuit before the battery), so that switch is
  for when the battery's PV charging is steered.

The boiler is a fixed load here: its heating forecast says how much electric
heat it takes in each slot, whatever the source; this module only says which
part the PV surplus covers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Sequence

from ...ev.planner import EvPlan, EvPlanInput, plan_ev_charging
from ...ev.profile import NextNeed

CONSUMER_EV = "ev"
CONSUMER_BOILER = "boiler"
CONSUMER_BATTERY = "battery"
DEFAULT_PRIORITY: tuple[str, ...] = (CONSUMER_EV, CONSUMER_BOILER, CONSUMER_BATTERY)

_EPS = 1e-9


@dataclass(frozen=True)
class GridLimits:
    breaker_a: float
    reserve_a: float = 0.0
    voltage_v: float = 230.0
    phases: int = 3

    @property
    def phase_limit_a(self) -> float:
        return max(0.0, self.breaker_a - self.reserve_a)


@dataclass(frozen=True)
class EvRequest:
    soc_pct: float
    capacity_kwh: float
    charge_limit_pct: float
    max_power_kw: float
    min_power_kw: float
    need: Optional[NextNeed]
    plugged_in: bool = True
    phases: int = 3


@dataclass(frozen=True)
class FlexInputs:
    slot_starts: Sequence[datetime]
    import_prices: Sequence[float]
    export_prices: Sequence[float]
    solar_kwh: Sequence[float]
    backup_load_kwh: Sequence[float]
    surplus_after_battery_kwh: Sequence[float]
    battery_charge_kw: float
    limits: GridLimits
    priority: Sequence[str] = DEFAULT_PRIORITY
    pv_battery_first: bool = True
    ev: Optional[EvRequest] = None
    boiler_electric_kwh: Optional[Sequence[float]] = None
    # Known battery grid charging per slot (kWh) when the battery plan came
    # first; None when this runs before the battery plan.
    battery_ups_kwh: Optional[Sequence[float]] = None
    slot_minutes: int = 15


@dataclass
class FlexPlan:
    ev_plan: Optional[EvPlan]
    solar_for_battery: List[float]
    ups_allowed: List[bool]
    ev_headroom_kw: List[float] = field(default_factory=list)
    boiler_pv_kwh: List[float] = field(default_factory=list)
    boiler_grid_kwh: List[float] = field(default_factory=list)
    overloaded_slots: List[int] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "ev": self.ev_plan.as_dict() if self.ev_plan else None,
            "boiler": {
                "pv_kwh": round(sum(self.boiler_pv_kwh), 3),
                "grid_kwh": round(sum(self.boiler_grid_kwh), 3),
            },
            "ups_blocked_slots": [i for i, ok in enumerate(self.ups_allowed) if not ok],
            "overloaded_slots": list(self.overloaded_slots),
        }


class _Phases:
    """Current per phase in one slot."""

    def __init__(self, limits: GridLimits) -> None:
        self.limits = limits
        self.amps = [0.0] * max(1, limits.phases)

    def add_symmetric(self, kw: float, phases: int | None = None) -> None:
        used = min(len(self.amps), max(1, phases or len(self.amps)))
        per_phase = kw * 1000.0 / self.limits.voltage_v / used
        # A load on fewer phases than the grid lands on the most loaded ones.
        order = sorted(range(len(self.amps)), key=lambda p: -self.amps[p])
        for p in order[:used]:
            self.amps[p] += per_phase

    def room_kw(self, phases: int) -> float:
        used = min(len(self.amps), max(1, phases))
        worst = sorted(self.amps, reverse=True)[:used]
        room_a = max(0.0, self.limits.phase_limit_a - max(worst))
        return room_a * self.limits.voltage_v * used / 1000.0

    def fits(self, kw: float) -> bool:
        per_phase = kw * 1000.0 / self.limits.voltage_v / len(self.amps)
        return max(self.amps) + per_phase <= self.limits.phase_limit_a + _EPS

    def overloaded(self) -> bool:
        return max(self.amps) > self.limits.phase_limit_a + _EPS


def _at(values: Optional[Sequence[float]], i: int) -> float:
    if values is None or i >= len(values):
        return 0.0
    return max(0.0, float(values[i] or 0.0))


def plan_flex_loads(inputs: FlexInputs) -> FlexPlan:  # noqa: C901
    n = len(inputs.slot_starts)
    hours = inputs.slot_minutes / 60.0
    order = [c for c in inputs.priority if c in (CONSUMER_EV, CONSUMER_BOILER, CONSUMER_BATTERY)]
    for consumer in DEFAULT_PRIORITY:
        if consumer not in order:
            order.append(consumer)

    phases = [_Phases(inputs.limits) for _ in range(n)]
    for i in range(n):
        phases[i].add_symmetric(_at(inputs.backup_load_kwh, i) / hours)

    if inputs.pv_battery_first:
        surplus = [_at(inputs.surplus_after_battery_kwh, i) for i in range(n)]
    else:
        surplus = [
            max(0.0, _at(inputs.solar_kwh, i) - _at(inputs.backup_load_kwh, i)) for i in range(n)
        ]
    pv_taken_before_battery = [0.0] * n
    battery_seen = False

    ev_plan: Optional[EvPlan] = None
    ev_headroom = [0.0] * n
    boiler_pv = [0.0] * n
    boiler_grid = [0.0] * n
    ups_allowed = [True] * n

    def take_pv(i: int, wanted: float) -> float:
        got = min(surplus[i], max(0.0, wanted))
        surplus[i] -= got
        if not battery_seen and not inputs.pv_battery_first:
            pv_taken_before_battery[i] += got
        return got

    for consumer in order:
        if consumer == CONSUMER_BATTERY:
            battery_seen = True
            for i in range(n):
                ups_kwh = None if inputs.battery_ups_kwh is None else _at(inputs.battery_ups_kwh, i)
                if ups_kwh is None:
                    ups_allowed[i] = phases[i].fits(inputs.battery_charge_kw)
                    # Consumers ranked below the battery: count its charging
                    # where it is allowed, as the plan may use it there.
                    if ups_allowed[i]:
                        phases[i].add_symmetric(inputs.battery_charge_kw)
                elif ups_kwh > _EPS:
                    phases[i].add_symmetric(ups_kwh / hours)
        elif consumer == CONSUMER_EV and inputs.ev is not None:
            ev = inputs.ev
            ev_headroom = [phases[i].room_kw(ev.phases) for i in range(n)]
            ev_plan = plan_ev_charging(
                EvPlanInput(
                    slot_starts=list(inputs.slot_starts),
                    import_prices=list(inputs.import_prices),
                    export_prices=list(inputs.export_prices),
                    pv_surplus_kwh=list(surplus),
                    grid_headroom_kw=ev_headroom,
                    soc_pct=ev.soc_pct,
                    capacity_kwh=ev.capacity_kwh,
                    charge_limit_pct=ev.charge_limit_pct,
                    max_power_kw=ev.max_power_kw,
                    min_power_kw=ev.min_power_kw,
                    need=ev.need,
                    plugged_in=ev.plugged_in,
                    slot_minutes=inputs.slot_minutes,
                )
            )
            for i, (grid_kwh, pv_kwh) in enumerate(
                zip(ev_plan.grid_kwh_by_slot(), ev_plan.pv_kwh_by_slot())
            ):
                take_pv(i, pv_kwh)
                if grid_kwh > _EPS:
                    phases[i].add_symmetric(grid_kwh / hours, ev.phases)
        elif consumer == CONSUMER_BOILER and inputs.boiler_electric_kwh is not None:
            for i in range(n):
                demand = _at(inputs.boiler_electric_kwh, i)
                if demand <= _EPS:
                    continue
                boiler_pv[i] = take_pv(i, demand)
                boiler_grid[i] = demand - boiler_pv[i]
                if boiler_grid[i] > _EPS:
                    phases[i].add_symmetric(boiler_grid[i] / hours, 1)

    solar_for_battery = [
        max(0.0, float(inputs.solar_kwh[i]) - pv_taken_before_battery[i])
        if i < len(inputs.solar_kwh)
        else 0.0
        for i in range(n)
    ]
    return FlexPlan(
        ev_plan=ev_plan,
        solar_for_battery=solar_for_battery,
        ups_allowed=ups_allowed,
        ev_headroom_kw=ev_headroom,
        boiler_pv_kwh=boiler_pv,
        boiler_grid_kwh=boiler_grid,
        overloaded_slots=[i for i in range(n) if phases[i].overloaded()],
    )
