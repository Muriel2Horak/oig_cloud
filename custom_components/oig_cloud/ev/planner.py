"""Price-driven charging window for the car, like the home battery's UPS slots.

The car has to hold ``need_pct`` of its SoC (never more than its charge limit)
when it leaves at the predicted departure. Every 15-minute slot until then can
give it:

* PV surplus left after the consumers ranked above the car, valued at the
  export price it would otherwise earn;
* grid energy at the slot's import price, up to the power the main breaker has
  left after the house and the consumers ranked above the car.

A slot is usable only when those two together reach the wallbox minimum: a
charger does not run at 1 kW. The cheapest slots before departure are taken
(``shared.flex_scheduler``). After that the car also takes surplus that would be
exported for less than the cheapest import, and grid energy at a negative
price, up to its charge limit. After the departure the car is away, so nothing
is planned there.

A departure past the last known price is planned on estimated slots at the
median known price; the plan marks them, and they firm up when the next day's
prices arrive.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from statistics import median
from typing import List, Optional, Sequence

from ..shared.flex_scheduler import (
    FlexSlot,
    OpportunisticRule,
    Requirement,
    Tranche,
    schedule_flexible_load,
)
from .profile import NextNeed

STATUS_PLANNED = "planned"
STATUS_SHORTFALL = "shortfall"
STATUS_NO_NEED = "no_need"
STATUS_UNPLUGGED = "unplugged"

_EPS_KWH = 1e-6


@dataclass(frozen=True)
class EvPlanInput:
    """Everything the plan needs; per-slot lists share one index."""

    slot_starts: Sequence[datetime]
    import_prices: Sequence[float]
    export_prices: Sequence[float]
    pv_surplus_kwh: Sequence[float]
    grid_headroom_kw: Sequence[float]
    soc_pct: float
    capacity_kwh: float
    charge_limit_pct: float
    max_power_kw: float
    min_power_kw: float
    need: Optional[NextNeed]
    plugged_in: bool = True
    slot_minutes: int = 15


@dataclass(frozen=True)
class EvPlanSlot:
    start: datetime
    energy_kwh: float
    pv_kwh: float
    grid_kwh: float
    power_kw: float
    import_price: float
    cost_czk: float
    estimated: bool = False

    def as_dict(self) -> dict:
        return {
            "start": self.start.isoformat(),
            "energy_kwh": round(self.energy_kwh, 3),
            "pv_kwh": round(self.pv_kwh, 3),
            "grid_kwh": round(self.grid_kwh, 3),
            "power_kw": round(self.power_kw, 2),
            "price": round(self.import_price, 3),
            "cost_czk": round(self.cost_czk, 2),
            "estimated": self.estimated,
        }


@dataclass
class EvPlan:
    status: str
    slots: List[EvPlanSlot]
    target_soc_pct: float
    deadline: Optional[datetime]
    needed_kwh: float
    planned_kwh: float
    shortfall_kwh: float
    opportunistic_kwh: float
    cost_czk: float
    soc_at_deadline_pct: float
    charge_now: bool
    next_start: Optional[datetime]
    known_slots: int = 0
    notes: List[str] = field(default_factory=list)

    def grid_kwh_by_slot(self) -> List[float]:
        """Grid energy per input slot (estimated slots past the prices left out)."""
        return [slot.grid_kwh for slot in self.slots[: self.known_slots]]

    def pv_kwh_by_slot(self) -> List[float]:
        return [slot.pv_kwh for slot in self.slots[: self.known_slots]]

    def as_detail_dict(self) -> dict:
        """``as_dict`` plus every slot until departure (for the dashboard)."""
        until = [
            slot
            for slot in self.slots
            if self.deadline is None or slot.start < self.deadline
        ]
        detail = self.as_dict()
        detail["timeline"] = [slot.as_dict() for slot in until[:192]]
        return detail

    def as_dict(self) -> dict:
        charging = [slot for slot in self.slots if slot.energy_kwh > _EPS_KWH]
        return {
            "status": self.status,
            "target_soc_pct": round(self.target_soc_pct, 1),
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "needed_kwh": round(self.needed_kwh, 2),
            "planned_kwh": round(self.planned_kwh, 2),
            "shortfall_kwh": round(self.shortfall_kwh, 2),
            "opportunistic_kwh": round(self.opportunistic_kwh, 2),
            "cost_czk": round(self.cost_czk, 2),
            "soc_at_deadline_pct": round(self.soc_at_deadline_pct, 1),
            "charge_now": self.charge_now,
            "next_start": self.next_start.isoformat() if self.next_start else None,
            "slots": [slot.as_dict() for slot in charging],
        }


def _extended_slots(plan_input: EvPlanInput) -> tuple[list[datetime], int]:
    starts = list(plan_input.slot_starts)
    known = len(starts)
    deadline = plan_input.need.deadline if plan_input.need else None
    if deadline is None or not starts:
        return starts, known
    step = timedelta(minutes=plan_input.slot_minutes)
    while starts[-1] + step < deadline:
        starts.append(starts[-1] + step)
    return starts, known


def plan_ev_charging(plan_input: EvPlanInput) -> EvPlan:
    hours = plan_input.slot_minutes / 60.0
    starts, known = _extended_slots(plan_input)
    n = len(starts)
    known_prices = [float(p) for p in plan_input.import_prices[:known]]
    fallback_price = median(known_prices) if known_prices else 0.0
    fallback_headroom = (
        median([float(h) for h in plan_input.grid_headroom_kw[:known]]) if known else 0.0
    )

    def at(values: Sequence[float], i: int, default: float) -> float:
        return float(values[i]) if i < known and i < len(values) else default

    capacity = max(0.0, plan_input.capacity_kwh)
    limit_pct = max(0.0, min(100.0, plan_input.charge_limit_pct))
    soc_pct = max(0.0, min(100.0, plan_input.soc_pct))
    need = plan_input.need
    target_pct = min(limit_pct, need.need_pct) if need else soc_pct
    needed_kwh = max(0.0, (target_pct - soc_pct) / 100.0 * capacity)
    room_kwh = max(0.0, (limit_pct - soc_pct) / 100.0 * capacity)

    deadline_index = n
    if need is not None:
        deadline_index = sum(1 for start in starts if start < need.deadline)

    flex_slots: list[FlexSlot] = []
    for i in range(n):
        if not plan_input.plugged_in or i >= deadline_index:
            flex_slots.append(FlexSlot(max_kwh=0.0))
            continue
        pv_kwh = max(0.0, at(plan_input.pv_surplus_kwh, i, 0.0))
        headroom_kw = max(0.0, at(plan_input.grid_headroom_kw, i, fallback_headroom))
        pv_kw = pv_kwh / hours if hours > 0 else 0.0
        if pv_kw + headroom_kw + _EPS_KWH < plan_input.min_power_kw:
            flex_slots.append(FlexSlot(max_kwh=0.0))
            continue
        cap = plan_input.max_power_kw * hours
        tranches = []
        if pv_kwh > _EPS_KWH:
            tranches.append(
                Tranche(cost_per_kwh=at(plan_input.export_prices, i, 0.0), kwh=pv_kwh, source="pv")
            )
        grid_kwh = min(headroom_kw, plan_input.max_power_kw) * hours
        if grid_kwh > _EPS_KWH:
            tranches.append(
                Tranche(
                    cost_per_kwh=at(plan_input.import_prices, i, fallback_price),
                    kwh=grid_kwh,
                    source="grid",
                )
            )
        flex_slots.append(FlexSlot(max_kwh=cap, tranches=tuple(tranches)))

    cheapest_import = min(known_prices) if known_prices else 0.0
    schedule = schedule_flexible_load(
        flex_slots,
        [Requirement(before_index=deadline_index, kwh=needed_kwh)] if needed_kwh > 0 else [],
        opportunistic=[
            OpportunisticRule(max_cost_per_kwh=cheapest_import, sources=frozenset({"pv"})),
            OpportunisticRule(max_cost_per_kwh=0.0, sources=frozenset({"grid"})),
        ],
        opportunistic_max_kwh=max(0.0, room_kwh - needed_kwh),
    )

    slots: list[EvPlanSlot] = []
    for i, start in enumerate(starts):
        sources = schedule.by_source[i]
        pv = sources.get("pv", 0.0)
        grid = sources.get("grid", 0.0)
        price = at(plan_input.import_prices, i, fallback_price)
        export = at(plan_input.export_prices, i, 0.0)
        energy = schedule.energy_kwh[i]
        slots.append(
            EvPlanSlot(
                start=start,
                energy_kwh=energy,
                pv_kwh=pv,
                grid_kwh=grid,
                power_kw=energy / hours if hours > 0 else 0.0,
                import_price=price,
                cost_czk=grid * price + pv * export,
                estimated=i >= known,
            )
        )

    planned = sum(schedule.energy_kwh)
    by_deadline = sum(schedule.energy_kwh[:deadline_index])
    shortfall = max(0.0, needed_kwh - by_deadline) if plan_input.plugged_in else needed_kwh
    if not plan_input.plugged_in:
        status = STATUS_UNPLUGGED
    elif needed_kwh <= _EPS_KWH:
        status = STATUS_NO_NEED
    elif shortfall > _EPS_KWH:
        status = STATUS_SHORTFALL
    else:
        status = STATUS_PLANNED
    next_start = next((slot.start for slot in slots if slot.energy_kwh > _EPS_KWH), None)

    return EvPlan(
        status=status,
        slots=slots,
        target_soc_pct=target_pct,
        deadline=need.deadline if need else None,
        needed_kwh=needed_kwh,
        planned_kwh=planned,
        shortfall_kwh=shortfall if shortfall > _EPS_KWH else 0.0,
        opportunistic_kwh=schedule.opportunistic_kwh,
        cost_czk=sum(slot.cost_czk for slot in slots),
        soc_at_deadline_pct=(
            min(100.0, soc_pct + by_deadline / capacity * 100.0) if capacity > 0 else soc_pct
        ),
        charge_now=bool(slots) and slots[0].energy_kwh > _EPS_KWH,
        next_start=next_start,
        known_slots=known,
    )
