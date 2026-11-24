"""Cheapest-slot scheduling of a flexible load against energy deadlines.

One scheduler for every load that can move in time: the car charging before it
leaves, the boiler heating before the tank runs cold. The load says how much
energy it needs by when (a staircase of requirements); every slot says how much
it can take and at what price, split into tranches (PV surplus valued at the
export price it would otherwise earn, grid at the import price).

Requirements are served earliest deadline first, each from the cheapest tranches
still free before its deadline. With nested deadlines that is optimal: the
energy an earlier deadline needs is also counted by every later one, so taking
the cheapest slots for it never costs a later deadline anything.

Pure: lists in, lists out, so the planners that use it test without Home
Assistant.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence

# Energy below this is rounding, not a delivery.
_EPS_KWH = 1e-9


@dataclass(frozen=True)
class Tranche:
    """Energy a slot can deliver at one price."""

    cost_per_kwh: float
    kwh: float
    source: str


@dataclass(frozen=True)
class FlexSlot:
    """What one slot can give the load: a total cap and priced tranches."""

    max_kwh: float
    tranches: tuple[Tranche, ...] = ()


@dataclass(frozen=True)
class Requirement:
    """At least ``kwh`` in total must be delivered in slots before ``before_index``."""

    before_index: int
    kwh: float


@dataclass(frozen=True)
class OpportunisticRule:
    """Extra energy beyond the requirements: tranches of these sources at or
    below this price (all sources when ``sources`` is None)."""

    max_cost_per_kwh: float
    sources: Optional[frozenset[str]] = None


@dataclass
class FlexSchedule:
    energy_kwh: List[float]
    by_source: List[Dict[str, float]]
    cost_czk: float
    shortfall_kwh: float
    opportunistic_kwh: float = 0.0


class _State:
    def __init__(self, slots: Sequence[FlexSlot]) -> None:
        self.slots = slots
        self.energy = [0.0] * len(slots)
        self.by_source: List[Dict[str, float]] = [{} for _ in slots]
        self.used = [[0.0] * len(slot.tranches) for slot in slots]
        self.cost = 0.0

    def candidates(
        self, end: int, max_cost: Optional[float], sources: Optional[frozenset[str]]
    ) -> List[tuple[float, int, int]]:
        found = []
        for i in range(min(end, len(self.slots))):
            for t, tranche in enumerate(self.slots[i].tranches):
                if max_cost is not None and tranche.cost_per_kwh > max_cost:
                    continue
                if sources is not None and tranche.source not in sources:
                    continue
                if tranche.kwh - self.used[i][t] > _EPS_KWH:
                    found.append((tranche.cost_per_kwh, i, t))
        found.sort()
        return found

    def take(self, i: int, t: int, wanted: float) -> float:
        slot = self.slots[i]
        tranche = slot.tranches[t]
        room = min(tranche.kwh - self.used[i][t], max(0.0, slot.max_kwh) - self.energy[i])
        amount = max(0.0, min(room, wanted))
        if amount <= _EPS_KWH:
            return 0.0
        self.used[i][t] += amount
        self.energy[i] += amount
        self.by_source[i][tranche.source] = self.by_source[i].get(tranche.source, 0.0) + amount
        self.cost += amount * tranche.cost_per_kwh
        return amount

    def fill(
        self,
        end: int,
        wanted: float,
        max_cost: Optional[float] = None,
        sources: Optional[frozenset[str]] = None,
    ) -> float:
        delivered = 0.0
        for _cost, i, t in self.candidates(end, max_cost, sources):
            if wanted - delivered <= _EPS_KWH:
                break
            delivered += self.take(i, t, wanted - delivered)
        return delivered


def schedule_flexible_load(
    slots: Sequence[FlexSlot],
    requirements: Sequence[Requirement],
    *,
    opportunistic: Sequence[OpportunisticRule] = (),
    opportunistic_max_kwh: float = 0.0,
) -> FlexSchedule:
    """Deliver every requirement at the lowest cost, then take cheap extras.

    Each ``opportunistic`` rule in turn adds energy beyond the requirements from
    the tranches it allows (PV surplus that would otherwise be exported for
    less, grid energy at a negative price), up to ``opportunistic_max_kwh`` in
    total over all rules.
    """
    state = _State(slots)
    shortfall = 0.0
    for requirement in sorted(requirements, key=lambda r: r.before_index):
        end = min(max(0, requirement.before_index), len(slots))
        delivered = sum(state.energy[:end])
        missing = requirement.kwh - delivered
        if missing <= _EPS_KWH:
            continue
        got = state.fill(end, missing)
        shortfall = max(shortfall, missing - got)

    extra = 0.0
    for rule in opportunistic:
        left = opportunistic_max_kwh - extra
        if left <= _EPS_KWH:
            break
        extra += state.fill(
            len(slots), left, max_cost=rule.max_cost_per_kwh, sources=rule.sources
        )

    return FlexSchedule(
        energy_kwh=[0.0 if e <= _EPS_KWH else e for e in state.energy],
        by_source=[
            {k: v for k, v in sources.items() if v > _EPS_KWH} for sources in state.by_source
        ],
        cost_czk=state.cost,
        shortfall_kwh=0.0 if shortfall <= _EPS_KWH else shortfall,
        opportunistic_kwh=extra,
    )
