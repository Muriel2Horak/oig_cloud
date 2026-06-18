"""Comfort-first core planner for one controllable boiler heat source."""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field, replace
from datetime import datetime, time as dt_time, timedelta, timezone
from itertools import combinations
from typing import Any, Callable, Optional

from homeassistant.util import dt as dt_util

from .const import BATTERY_CYCLE_COST_CZK_PER_KWH
from .models import BoilerThermalTopology, EnergySource, TemperatureTopology
from .planner_contract import (
    AlternativeSourceCapability,
    DemandTarget,
    LegionellaObligation,
    PlannerInput,
    PlannerReasonCode,
)
from .thermal import (
    calculate_energy_to_heat,
    heating_per_slot,
    predicted_temperature_after_slot,
    stale_temperature_bias,
    standing_loss_per_slot,
)

SLOT_MINUTES = 15
DEFAULT_HORIZON_HOURS = 24
MIN_HORIZON_HOURS = 12
MAX_HORIZON_HOURS = 48
CORE_PLANNER_BUDGET_SECONDS = 5.0
TOP_ONLY_REQUIRED_ENERGY_SAFETY_FACTOR = 1.25


@dataclass(frozen=True)
class PlanSlotAction:
    """One 15-minute comfort-core source action."""

    start: datetime
    end: datetime
    action: str
    source: Optional[EnergySource]
    heating_kwh: float = 0.0
    pv_kwh: float = 0.0
    grid_kwh: float = 0.0
    alt_kwh: float = 0.0
    # R3: battery_kwh > 0 when Home 5 maneuver sourced this slot
    battery_kwh: float = 0.0
    estimated_cost_czk: float = 0.0
    predicted_top_temp_c: float = 0.0
    # R9: "comfort" (default) | "legionella" — distinguishes obligation type
    purpose: str = "comfort"


@dataclass(frozen=True)
class PlanResult:
    """Explicit comfort-core planner result."""

    entry_id: str
    box_id: str
    created_at: datetime
    valid_until: datetime
    deadline: datetime
    slots: list[PlanSlotAction] = field(default_factory=list)
    selected_source: Optional[EnergySource] = None
    actuated_source: Optional[EnergySource] = None
    comfort_satisfied: bool = False
    comfort_status: PlannerReasonCode = PlannerReasonCode.COMFORT_UNSATISFIED
    reason_codes: list[PlannerReasonCode] = field(default_factory=list)
    temperature_at_deadline_c: float = 0.0
    unsatisfied_comfort_gap_c: float = 0.0
    estimated_cost_czk: float = 0.0
    pv_kwh: float = 0.0
    grid_kwh: float = 0.0
    alt_kwh: float = 0.0
    # R3: battery_kwh > 0 when Home 5 maneuver sourced any slots
    battery_kwh: float = 0.0
    safe_hold: bool = False
    degraded: bool = False
    explanation: dict[str, Any] = field(default_factory=dict)
    # F3a: cost benchmarks (default 0.0 so frozen replace() calls need no change)
    cost_if_all_grid: float = 0.0
    cost_if_all_alt: float = 0.0
    # F3a: per-demand-target satisfaction flags (informational; empty = legacy)
    demands_met: list[bool] = field(default_factory=list)
    demand_labels: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class _SlotAllocation:
    source: EnergySource
    selected_source: EnergySource
    pv_kwh: float
    grid_kwh: float
    alt_kwh: float
    cost_czk: float
    # R3: battery_kwh > 0 when Home 5 maneuver sourced this slot
    battery_kwh: float = 0.0


def plan_comfort_core(
    planner_input: PlannerInput,
    *,
    now: Optional[datetime] = None,
    previous_plan: Optional[PlanResult] = None,
    time_source: Callable[[], float] = time.perf_counter,
    budget_seconds: float = CORE_PLANNER_BUDGET_SECONDS,
) -> PlanResult:
    """Plan one-source heating slots with comfort as the hard constraint."""
    started_at = time_source()
    if now is None:
        now = dt_util.now()
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    horizon_hours = _resolve_horizon_hours(planner_input.horizon_hours)
    slots = _build_empty_slots(now, horizon_hours)
    deadline = _resolve_deadline(now, planner_input.deadline_time)
    reasons = _unique_reasons(list(planner_input.reason_codes))
    topology = planner_input.topology

    if _top_unavailable(planner_input):
        _append_reason(reasons, PlannerReasonCode.TOP_SENSOR_UNAVAILABLE)
        _append_reason(reasons, PlannerReasonCode.COMFORT_UNSATISFIED)
        result = _safe_hold_result(planner_input, now, slots, deadline, reasons)
        return _timeout_result_if_needed(
            result,
            previous_plan,
            started_at,
            time_source,
            budget_seconds,
        )

    if topology is None:
        _append_reason(reasons, PlannerReasonCode.SETUP_INCOMPLETE)
        _append_reason(reasons, PlannerReasonCode.COMFORT_UNSATISFIED)
        result = _safe_hold_result(planner_input, now, slots, deadline, reasons)
        return _timeout_result_if_needed(
            result,
            previous_plan,
            started_at,
            time_source,
            budget_seconds,
        )

    assert planner_input.current_top_temp_c is not None
    top_temp = float(planner_input.current_top_temp_c)
    top_temp = _apply_stale_temperature_bias(
        top_temp,
        planner_input.temperature_updated_at,
        now,
        reasons,
    )
    bottom_temp = planner_input.current_bottom_temp_c
    degraded_top_only = _bottom_degraded_to_top_only(
        topology,
        bottom_temp,
        reasons,
    )

    heat_kwh = heating_per_slot(topology.heater_power_kw, SLOT_MINUTES)
    deadline_slots = [slot for slot in slots if slot.end <= deadline]
    required_kwh = _required_energy_kwh(
        topology,
        top_temp,
        bottom_temp,
        degraded_top_only,
    )

    # F3a: multi-target allocation — degenerates to single-target when
    # demand_targets is empty (legacy path, zero regression).
    heat_allocations, demands_met, demand_labels, all_targets_met = _allocate_multi_target(
        slots=slots,
        deadline=deadline,
        deadline_slots=deadline_slots,
        required_kwh=required_kwh,
        planner_input=planner_input,
        heat_kwh=heat_kwh,
        topology=topology,
        reasons=reasons,
    )

    # R9: anti-legionella obligation — allocate AFTER comfort, on remaining capacity.
    legionella_starts: set[datetime] = set()
    obligation = getattr(planner_input, "legionella_obligation", None)
    if (
        obligation is not None
        and isinstance(obligation, LegionellaObligation)
        and obligation.overdue
        and obligation.interval_days > 0
    ):
        heat_allocations, legionella_starts = _allocate_legionella(
            slots=slots,
            comfort_allocated=heat_allocations,
            required_kwh=obligation.required_kwh,
            planner_input=planner_input,
            heat_kwh=heat_kwh,
            reasons=reasons,
        )

    # Phase B: opportunistic thermal arbitrage on top of comfort + legionella.
    heat_allocations = _allocate_arbitrage(
        slots=slots,
        comfort_allocated=heat_allocations,
        planner_input=planner_input,
        topology=topology,
        top_temp=top_temp,
        bottom_temp=bottom_temp,
        degraded_top_only=degraded_top_only,
        required_kwh=required_kwh,
        heat_kwh=heat_kwh,
        reasons=reasons,
    )

    planned_slots, temperature_at_deadline = _predict_slots(
        slots,
        heat_allocations,
        topology,
        top_temp,
        heat_kwh,
        deadline,
        legionella_starts=legionella_starts if legionella_starts else None,
    )
    # Overall comfort_satisfied: safety-net deadline reachable AND (no demand
    # targets OR all demand targets met).
    safety_net_satisfied = (
        len(deadline_slots) > 0
        and sum(1 for s in deadline_slots if s.start in heat_allocations)
        >= _required_heat_slots(required_kwh, heat_kwh)
        or _required_heat_slots(required_kwh, heat_kwh) == 0
    ) and temperature_at_deadline >= topology.target_temp_c
    comfort_satisfied = safety_net_satisfied and all_targets_met
    result = _plan_result(
        planner_input,
        now,
        planned_slots,
        deadline,
        topology,
        top_temp,
        temperature_at_deadline,
        comfort_satisfied,
        reasons,
        degraded_top_only,
        demands_met=demands_met,
        demand_labels=demand_labels,
    )
    return _timeout_result_if_needed(
        result,
        previous_plan,
        started_at,
        time_source,
        budget_seconds,
    )


def _resolve_horizon_hours(value: Optional[int]) -> int:
    if value is None:
        return DEFAULT_HORIZON_HOURS
    if value < MIN_HORIZON_HOURS or value > MAX_HORIZON_HOURS:
        raise ValueError("horizon_hours must be between 12 and 48")
    return value


def _build_empty_slots(now: datetime, horizon_hours: int) -> list[PlanSlotAction]:
    local_tz = now.tzinfo or timezone.utc
    start_utc = now.astimezone(timezone.utc).replace(second=0, microsecond=0)
    start_utc = start_utc.replace(
        minute=(start_utc.minute // SLOT_MINUTES) * SLOT_MINUTES
    )
    slot_count = horizon_hours * (60 // SLOT_MINUTES)
    slots: list[PlanSlotAction] = []
    for index in range(slot_count):
        slot_start_utc = start_utc + timedelta(minutes=SLOT_MINUTES * index)
        slot_end_utc = slot_start_utc + timedelta(minutes=SLOT_MINUTES)
        slots.append(
            PlanSlotAction(
                start=slot_start_utc.astimezone(local_tz),
                end=slot_end_utc.astimezone(local_tz),
                action="idle",
                source=None,
            )
        )
    return slots


def _resolve_deadline(now: datetime, deadline_time: str) -> datetime:
    hour, minute = [int(part) for part in deadline_time.split(":")]
    target_time = dt_time(hour, minute)
    candidate = _local_deadline(now, target_time, days=0)
    if candidate <= now:
        candidate = _local_deadline(now, target_time, days=1)
    return candidate


def _local_deadline(now: datetime, target_time: dt_time, days: int) -> datetime:
    target_date = (now + timedelta(days=days)).date()
    candidate = datetime.combine(target_date, target_time).replace(tzinfo=now.tzinfo)
    return _advance_nonexistent_wall_time(candidate)


def _advance_nonexistent_wall_time(candidate: datetime) -> datetime:
    tzinfo = candidate.tzinfo
    if tzinfo is None:
        return candidate
    probe = candidate
    for _ in range(180):
        normalized = probe.astimezone(timezone.utc).astimezone(tzinfo)
        if _same_wall_label(normalized, probe):
            return probe
        probe += timedelta(minutes=1)
    return candidate


def _same_wall_label(left: datetime, right: datetime) -> bool:
    return (
        left.year,
        left.month,
        left.day,
        left.hour,
        left.minute,
        left.fold,
    ) == (
        right.year,
        right.month,
        right.day,
        right.hour,
        right.minute,
        right.fold,
    )


def _top_unavailable(planner_input: PlannerInput) -> bool:
    return (
        planner_input.current_top_temp_c is None
        or PlannerReasonCode.TOP_SENSOR_UNAVAILABLE in planner_input.reason_codes
    )


def _apply_stale_temperature_bias(
    top_temp: float,
    updated_at: Optional[datetime],
    now: datetime,
    reasons: list[PlannerReasonCode],
) -> float:
    if updated_at is None:
        return top_temp
    if updated_at.tzinfo is None and now.tzinfo is not None:
        updated_at = updated_at.replace(tzinfo=now.tzinfo)
    age_minutes = max(0.0, (now - updated_at).total_seconds() / 60.0)
    if age_minutes <= SLOT_MINUTES:
        return top_temp
    _append_reason(reasons, PlannerReasonCode.INPUT_STALE_TEMPERATURE)
    return top_temp - stale_temperature_bias(age_minutes)


def _bottom_degraded_to_top_only(
    topology: BoilerThermalTopology,
    bottom_temp: Optional[float],
    reasons: list[PlannerReasonCode],
) -> bool:
    if topology.temperature_topology != TemperatureTopology.TOP_BOTTOM:
        return False
    if bottom_temp is not None:
        return False
    _append_reason(
        reasons,
        PlannerReasonCode.BOTTOM_SENSOR_UNAVAILABLE_TOP_ONLY_DEGRADED,
    )
    return True


def _required_energy_kwh(
    topology: BoilerThermalTopology,
    top_temp: float,
    bottom_temp: Optional[float],
    degraded_top_only: bool,
) -> float:
    if topology.temperature_topology != TemperatureTopology.TOP_BOTTOM or degraded_top_only:
        return (
            calculate_energy_to_heat(
                topology.tank_volume_l,
                top_temp,
                topology.target_temp_c,
            )
            * TOP_ONLY_REQUIRED_ENERGY_SAFETY_FACTOR
        )
    layer_volume = topology.tank_volume_l * 0.5
    bottom = top_temp if bottom_temp is None else float(bottom_temp)
    return calculate_energy_to_heat(
        layer_volume,
        top_temp,
        topology.target_temp_c,
    ) + calculate_energy_to_heat(
        layer_volume,
        bottom,
        topology.target_temp_c,
    )


def _required_heat_slots(required_kwh: float, heat_kwh: float) -> int:
    if required_kwh <= 0:
        return 0
    if heat_kwh <= 0:
        return 10**9
    return int(math.ceil(required_kwh / heat_kwh))


def _choose_heat_slots(
    deadline_slots: list[PlanSlotAction],
    required_heat_slots: int,
    feasible: bool,
) -> set[datetime]:
    if required_heat_slots <= 0:
        return set()
    if feasible:
        selected = deadline_slots[-required_heat_slots:]
    else:
        selected = deadline_slots
    return {slot.start for slot in selected}


def _choose_heat_allocations(
    deadline_slots: list[PlanSlotAction],
    required_heat_slots: int,
    feasible: bool,
    planner_input: PlannerInput,
    heat_kwh: float,
    battery_budget_remaining: Optional[list[float]] = None,
) -> dict[datetime, _SlotAllocation]:
    """Build allocation dict for selected slots, tracking battery budget.

    battery_budget_remaining: single-element list used as a mutable float
    reference so callers can observe/update the running battery budget.
    If None, battery is treated as unavailable (0.0 budget).
    """
    if required_heat_slots <= 0:
        return {}

    budget_ref = battery_budget_remaining  # mutable list[float] or None

    if not feasible:
        result: dict[datetime, _SlotAllocation] = {}
        for slot in deadline_slots:
            bkwh = budget_ref[0] if budget_ref is not None else 0.0
            alloc = _slot_allocation(slot, planner_input, heat_kwh, bkwh)
            if budget_ref is not None:
                budget_ref[0] = max(0.0, budget_ref[0] - alloc.battery_kwh)
            result[slot.start] = alloc
        return result

    selected = _best_heat_slot_combination(
        deadline_slots,
        required_heat_slots,
        planner_input,
        heat_kwh,
    )
    result = {}
    for slot in selected:
        bkwh = budget_ref[0] if budget_ref is not None else 0.0
        alloc = _slot_allocation(slot, planner_input, heat_kwh, bkwh)
        if budget_ref is not None:
            budget_ref[0] = max(0.0, budget_ref[0] - alloc.battery_kwh)
        result[slot.start] = alloc
    return result


def _allocate_multi_target(
    *,
    slots: list[PlanSlotAction],
    deadline: datetime,
    deadline_slots: list[PlanSlotAction],
    required_kwh: float,
    planner_input: PlannerInput,
    heat_kwh: float,
    topology: Any,
    reasons: list[PlannerReasonCode],
) -> tuple[dict[datetime, _SlotAllocation], list[bool], list[str], bool]:
    """Allocate heat slots across multiple demand targets + safety-net deadline.

    When demand_targets is empty this reduces exactly to the single-deadline
    path (_choose_heat_allocations over deadline_slots) — zero regression.

    Returns:
        (heat_allocations, demands_met, demand_labels, all_targets_met)
        where heat_allocations maps slot.start → _SlotAllocation.
    """
    demand_targets: list[DemandTarget] = list(planner_input.demand_targets)

    # Sort by start time so we process earliest target first.
    demand_targets.sort(key=lambda t: t.start)

    # Safety-net target is derived from the full required_kwh at the deadline.
    # It is NOT appended to demand_targets; it is handled as the final sweep
    # over all deadline_slots minus already-allocated slots.

    allocated: dict[datetime, _SlotAllocation] = {}
    demands_met: list[bool] = []
    demand_labels: list[str] = []
    # total_allocated_kwh = cumulative HEAT scheduled (drives the safety-net).
    # carried_kwh = net energy still in the tank for the NEXT target = prior heat
    # MINUS the draws of earlier targets. Crediting prior HEAT (the old bug)
    # ignored intervening draws, so a later draw inherited heat that an earlier
    # draw had already consumed → sequential draws were under-prepared.
    total_allocated_kwh: float = 0.0
    carried_kwh: float = 0.0
    all_targets_met = True

    # R3: shared mutable battery budget reference across all allocation passes.
    battery_budget_ref: Optional[list[float]] = _make_battery_budget_ref(planner_input)

    for target in demand_targets:
        # Slots available for this target: end <= target.start and not yet
        # allocated.
        available = [
            s for s in slots
            if s.end <= target.start and s.start not in allocated
        ]
        # Credit only energy that SURVIVES earlier draws (carried), not all the
        # earlier heat.
        remaining_kwh = max(0.0, target.required_kwh - carried_kwh)
        required_slots_i = _required_heat_slots(remaining_kwh, heat_kwh)

        if required_slots_i <= 0:
            # Already covered by carried energy; this target's draw still
            # consumes from it.
            demands_met.append(True)
            demand_labels.append(target.label)
            carried_kwh = max(0.0, carried_kwh - target.required_kwh)
            continue

        feasible_i = required_slots_i <= len(available)
        if feasible_i:
            selected = _best_heat_slot_combination(
                available,
                required_slots_i,
                planner_input,
                heat_kwh,
            )
            demands_met.append(True)
        else:
            # Infeasible: heat all available slots.
            selected = list(available)
            demands_met.append(False)
            all_targets_met = False
            _append_reason(reasons, PlannerReasonCode.DEMAND_TARGET_MISSED)

        demand_labels.append(target.label)
        heated_this_target = 0.0
        for slot in selected:
            if slot.start not in allocated:
                bkwh = battery_budget_ref[0] if battery_budget_ref is not None else 0.0
                alloc = _slot_allocation(slot, planner_input, heat_kwh, bkwh)
                if battery_budget_ref is not None:
                    battery_budget_ref[0] = max(0.0, battery_budget_ref[0] - alloc.battery_kwh)
                allocated[slot.start] = alloc
                total_allocated_kwh += heat_kwh
                heated_this_target += heat_kwh
        # After heating for this target and its draw, update the carried energy.
        carried_kwh = max(0.0, carried_kwh + heated_this_target - target.required_kwh)

    # Safety-net pass: allocate remaining slots between last demand target
    # (or now) and the deadline to ensure the topology target_temp is met.
    remaining_deadline_slots = [
        s for s in deadline_slots if s.start not in allocated
    ]
    safety_kwh = max(0.0, required_kwh - total_allocated_kwh)
    safety_slots_needed = _required_heat_slots(safety_kwh, heat_kwh)
    safety_feasible = safety_slots_needed <= len(remaining_deadline_slots)

    if safety_slots_needed > 0:
        if safety_feasible:
            safety_selected = _best_heat_slot_combination(
                remaining_deadline_slots,
                safety_slots_needed,
                planner_input,
                heat_kwh,
            )
        else:
            safety_selected = list(remaining_deadline_slots)
        for slot in safety_selected:
            if slot.start not in allocated:
                bkwh = battery_budget_ref[0] if battery_budget_ref is not None else 0.0
                alloc = _slot_allocation(slot, planner_input, heat_kwh, bkwh)
                if battery_budget_ref is not None:
                    battery_budget_ref[0] = max(0.0, battery_budget_ref[0] - alloc.battery_kwh)
                allocated[slot.start] = alloc

    return allocated, demands_met, demand_labels, all_targets_met


def _best_heat_slot_combination(
    deadline_slots: list[PlanSlotAction],
    required_heat_slots: int,
    planner_input: PlannerInput,
    heat_kwh: float,
) -> list[PlanSlotAction]:
    if required_heat_slots >= len(deadline_slots):
        return list(deadline_slots)

    if math.comb(len(deadline_slots), required_heat_slots) > 20000:
        return _greedy_heat_slots(
            deadline_slots,
            required_heat_slots,
            planner_input,
            heat_kwh,
        )

    best: Optional[tuple[tuple[float, float, int, float], tuple[PlanSlotAction, ...]]] = None
    for candidate in combinations(deadline_slots, required_heat_slots):
        score = _combination_score(candidate, planner_input, heat_kwh)
        if best is None:
            best = (score, candidate)
            continue
        if score < best[0]:
            best = (score, candidate)

    return list(best[1]) if best is not None else []


def _greedy_heat_slots(
    deadline_slots: list[PlanSlotAction],
    required_heat_slots: int,
    planner_input: PlannerInput,
    heat_kwh: float,
) -> list[PlanSlotAction]:
    ranked = sorted(
        deadline_slots,
        key=lambda slot: _slot_score(slot, planner_input, heat_kwh),
    )
    return sorted(ranked[:required_heat_slots], key=lambda slot: slot.start)


def _standing_loss_cost_per_wait_slot(
    planner_input: PlannerInput,
    slot: PlanSlotAction,
    heat_kwh: float,
) -> float:
    """Cost of one slot's standing loss waiting after heating.

    Used to bias the score toward just-in-time heating: heating earlier than
    needed incurs a penalty equal to the expected standing loss * grid price
    per wait slot.  Returns 0.0 when standing_loss_coefficient is 0.0 (default
    for legacy configs) so behaviour is unchanged without explicit opt-in.
    """
    topology = planner_input.topology
    if topology is None:
        return 0.0
    loss_coeff = getattr(topology, "standing_loss_coefficient", 0.0)
    if not loss_coeff:
        return 0.0
    ambient_c = getattr(topology, "cold_inlet_temp_c", 10.0)
    target_c = getattr(topology, "target_temp_c", 55.0)
    loss_kwh = standing_loss_per_slot(
        topology.tank_volume_l,
        target_c,
        ambient_c,
        SLOT_MINUTES,
        loss_coeff,
    )
    # Price per kWh: use slot's grid price or fallback to 0 (free overflow).
    spot_price = _spot_price_for_slot(slot.start, planner_input.spot_prices)
    price = spot_price if spot_price is not None else 0.0
    return loss_kwh * price


def _combination_score(
    slots: tuple[PlanSlotAction, ...],
    planner_input: PlannerInput,
    heat_kwh: float,
) -> tuple[float, float, int, float]:
    """Score a candidate combination of heating slots.

    Tuple components (lower is better):
      0. total monetary cost + standing-loss penalty (just-in-time bias)
      1. negative total PV (more PV → lower score)
      2. transition count (fewer on/off transitions preferred)
      3. negative sum of timestamps (later slots preferred when tied)
    """
    # R3: pass full battery budget for scoring — cost ordering is correct
    # even if the actual allocation caps usage at the real remaining budget.
    battery_budget = _battery_budget_for_scoring(planner_input, heat_kwh)
    allocations = [
        _slot_allocation(slot, planner_input, heat_kwh, battery_budget)
        for slot in slots
    ]
    total_cost = sum(allocation.cost_czk for allocation in allocations)
    total_pv = sum(allocation.pv_kwh for allocation in allocations)

    # Standing-loss bias: each heated slot that is *not* the last in the
    # combination incurs one extra wait-slot penalty.  The last slot (latest
    # timestamp) has zero wait.
    sorted_slots = sorted(slots, key=lambda s: s.start)
    loss_per_wait = [
        _standing_loss_cost_per_wait_slot(planner_input, s, heat_kwh)
        for s in sorted_slots
    ]
    # Slot i waits (N - 1 - i) slots after it, where N = len(sorted_slots).
    n = len(sorted_slots)
    standing_loss_penalty = sum(
        loss_per_wait[i] * (n - 1 - i) for i in range(n)
    )
    total_cost_adj = total_cost + standing_loss_penalty

    return (
        round(total_cost_adj, 9),
        -round(total_pv, 9),
        _transition_count(slots),
        -sum(slot.start.timestamp() for slot in slots),
    )


def _slot_score(
    slot: PlanSlotAction,
    planner_input: PlannerInput,
    heat_kwh: float,
) -> tuple[float, float, float]:
    """Score a single slot for greedy selection (lower is better)."""
    # R3: pass full battery budget for scoring
    battery_budget = _battery_budget_for_scoring(planner_input, heat_kwh)
    allocation = _slot_allocation(slot, planner_input, heat_kwh, battery_budget)
    # For greedy, we approximate standing-loss penalty as cost of one wait slot
    # per unit of earliness (the timestamp term already handles recency bias).
    loss_penalty = _standing_loss_cost_per_wait_slot(planner_input, slot, heat_kwh)
    cost_adj = allocation.cost_czk + loss_penalty
    return (
        round(cost_adj, 9),
        -round(allocation.pv_kwh, 9),
        -slot.start.timestamp(),
    )


def _make_battery_budget_ref(
    planner_input: PlannerInput,
) -> Optional[list[float]]:
    """Return a single-element mutable list [budget_kwh] for battery tracking.

    Returns None when feature is off or no capacity available — callers then
    always pass 0.0 to _slot_allocation.
    """
    if not getattr(planner_input, "home5_available", False):
        return None
    signals = planner_input.battery_signals
    if signals is None:
        return None
    usable = getattr(signals, "battery_usable_kwh", None)
    if usable is None:
        return None
    usable = float(usable)
    if usable <= 0.0:
        return None
    return [usable]


def _battery_budget_for_scoring(
    planner_input: PlannerInput,
    heat_kwh: float,
) -> float:
    """Return the battery budget to use during slot *scoring*.

    For scoring we pass the full usable-kWh so all candidate battery slots
    receive their correct (lower) cost.  The actual cap is enforced during
    real-allocation via a running counter.  When the feature is off or no
    capacity is available, returns 0.0 so _slot_allocation never picks battery.
    """
    if not getattr(planner_input, "home5_available", False):
        return 0.0
    signals = planner_input.battery_signals
    if signals is None:
        return 0.0
    usable = getattr(signals, "battery_usable_kwh", None)
    if usable is None:
        return 0.0
    return max(0.0, float(usable))


def _transition_count(slots: tuple[PlanSlotAction, ...]) -> int:
    if not slots:
        return 0
    sorted_slots = sorted(slots, key=lambda slot: slot.start)
    transitions = 1
    previous = sorted_slots[0]
    for slot in sorted_slots[1:]:
        if slot.start != previous.end:
            transitions += 1
        previous = slot
    return transitions


def _slot_allocation(
    slot: PlanSlotAction,
    planner_input: PlannerInput,
    heat_kwh: float,
    battery_kwh_remaining: float = 0.0,
) -> _SlotAllocation:
    """Compute source allocation for a single heating slot.

    battery_kwh_remaining: how much battery energy is still available for
    R3 Home-5 maneuver slots.  Pass 0.0 (default) when feature is off or
    budget is exhausted.  Only used when home5_available is True on
    planner_input.
    """
    pv_kwh = min(
        heat_kwh,
        _pv_surplus_for_slot(slot, planner_input.overflow_windows, heat_kwh),
    )
    residual_kwh = max(0.0, heat_kwh - pv_kwh)
    spot_price = _spot_price_for_slot(slot.start, planner_input.spot_prices)
    grid_price = spot_price if spot_price is not None else 0.0
    alt_cheaper = _alternative_is_cheaper(planner_input, spot_price)

    if residual_kwh <= 1e-9:
        return _SlotAllocation(
            source=EnergySource.FVE,
            selected_source=EnergySource.FVE,
            pv_kwh=pv_kwh,
            grid_kwh=0.0,
            alt_kwh=0.0,
            cost_czk=0.0,
        )

    if (
        planner_input.alt_source_capability == AlternativeSourceCapability.CONTROLLABLE
        and alt_cheaper
    ):
        return _SlotAllocation(
            source=EnergySource.ALTERNATIVE,
            selected_source=EnergySource.ALTERNATIVE,
            pv_kwh=pv_kwh,
            grid_kwh=0.0,
            alt_kwh=residual_kwh,
            cost_czk=residual_kwh * planner_input.alt_cost_kwh,
        )

    # R3: Home 5 maneuver — battery wins over grid when:
    #   - home5_available is True in planner_input
    #   - there is remaining battery budget
    #   - slot lies BEFORE at least one future overflow window (battery recharge window)
    #   - battery cost < grid cost (battery_cycle_cost_czk_kwh < spot_price)
    _batt_cost = _resolve_battery_cycle_cost(planner_input)
    if (
        getattr(planner_input, "home5_available", False)
        and battery_kwh_remaining >= residual_kwh - 1e-9
        and battery_kwh_remaining > 0.0
        and _slot_has_future_overflow(slot, planner_input.overflow_windows)
        and _battery_is_cheaper(spot_price, _batt_cost)
    ):
        return _SlotAllocation(
            source=EnergySource.BATTERY,
            selected_source=EnergySource.BATTERY,
            pv_kwh=pv_kwh,
            grid_kwh=0.0,
            alt_kwh=0.0,
            battery_kwh=residual_kwh,
            cost_czk=residual_kwh * _batt_cost,
        )

    selected_source = EnergySource.GRID
    if (
        planner_input.alt_source_capability == AlternativeSourceCapability.BENCHMARK_ONLY
        and alt_cheaper
    ):
        selected_source = EnergySource.ALTERNATIVE
    elif pv_kwh > 0:
        selected_source = EnergySource.FVE

    return _SlotAllocation(
        source=EnergySource.GRID,
        selected_source=selected_source,
        pv_kwh=pv_kwh,
        grid_kwh=residual_kwh,
        alt_kwh=0.0,
        cost_czk=residual_kwh * grid_price,
    )


def _alternative_is_cheaper(
    planner_input: PlannerInput,
    spot_price: Optional[float],
) -> bool:
    if planner_input.alt_source_capability == AlternativeSourceCapability.DISABLED:
        return False
    if planner_input.alt_cost_kwh <= 0 or spot_price is None:
        return False
    if PlannerReasonCode.INPUT_STALE_PRICE in planner_input.reason_codes:
        return False
    return planner_input.alt_cost_kwh < spot_price


def _resolve_battery_cycle_cost(planner_input: "PlannerInput") -> float:
    """Return the effective battery cycle cost from config or the hardcoded fallback."""
    configured = getattr(planner_input, "battery_cycle_cost_czk_kwh", None)
    if configured is not None and isinstance(configured, (int, float)) and configured >= 0:
        return float(configured)
    return BATTERY_CYCLE_COST_CZK_PER_KWH


def _battery_is_cheaper(spot_price: Optional[float], battery_cost: float) -> bool:
    """Return True when battery cycle cost is cheaper than the grid spot price."""
    if spot_price is None:
        return False
    return battery_cost < spot_price


def _slot_has_future_overflow(
    slot: PlanSlotAction,
    overflow_windows: list[Any],
) -> bool:
    """Return True if there is at least one overflow window that starts AFTER
    this slot's start time.

    Rationale: the battery-discharge maneuver only makes economic sense when
    PV will recharge the battery later in the same planning horizon.  If the
    slot is already inside or after all overflow windows the battery would not
    be topped up again.
    """
    for window in overflow_windows:
        parsed = _parse_overflow_window(window, 0.0)
        if parsed is None:
            continue
        window_start, _end, _surplus = parsed
        if window_start > slot.start:
            return True
    return False


def _spot_price_for_slot(
    start: datetime,
    spot_prices: dict[datetime, float],
) -> Optional[float]:
    if start in spot_prices:
        return _float_or_none(spot_prices[start])
    hour_start = start.replace(minute=0, second=0, microsecond=0)
    if hour_start in spot_prices:
        return _float_or_none(spot_prices[hour_start])
    return None


def _pv_surplus_for_slot(
    slot: PlanSlotAction,
    overflow_windows: list[Any],
    heat_kwh: float,
) -> float:
    surplus = 0.0
    for window in overflow_windows:
        parsed = _parse_overflow_window(window, heat_kwh)
        if parsed is None:
            continue
        window_start, window_end, window_surplus = parsed
        overlap = _overlap_fraction(slot.start, slot.end, window_start, window_end)
        if overlap <= 0:
            continue
        surplus += window_surplus * overlap
    return min(heat_kwh, surplus)


def _parse_overflow_window(
    window: Any,
    default_surplus_kwh: float,
) -> Optional[tuple[datetime, datetime, float]]:
    if isinstance(window, dict):
        start = window.get("start")
        end = window.get("end")
        surplus = (
            window.get("surplus_kwh")
            or window.get("available_kwh")
            or window.get("pv_kwh")
            or default_surplus_kwh
        )
    else:
        try:
            start = window[0]
            end = window[1]
            surplus = window[2] if len(window) > 2 else default_surplus_kwh
        except (TypeError, IndexError):
            return None
    if not isinstance(start, datetime) or not isinstance(end, datetime):
        return None
    surplus_value = _float_or_none(surplus)
    if surplus_value is None:
        surplus_value = default_surplus_kwh
    return start, end, max(0.0, surplus_value)


def _overlap_fraction(
    slot_start: datetime,
    slot_end: datetime,
    window_start: datetime,
    window_end: datetime,
) -> float:
    overlap_start = max(slot_start, window_start)
    overlap_end = min(slot_end, window_end)
    if overlap_end <= overlap_start:
        return 0.0
    slot_seconds = (slot_end - slot_start).total_seconds()
    if slot_seconds <= 0:
        return 0.0
    return (overlap_end - overlap_start).total_seconds() / slot_seconds


def _float_or_none(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _allocate_legionella(
    *,
    slots: list[PlanSlotAction],
    comfort_allocated: dict[datetime, _SlotAllocation],
    required_kwh: float,
    planner_input: PlannerInput,
    heat_kwh: float,
    reasons: list[PlannerReasonCode],
) -> tuple[dict[datetime, _SlotAllocation], set[datetime]]:
    """Allocate legionella-obligation heat slots on top of comfort allocation.

    Finds the cheapest CONTIGUOUS feasible window in the full horizon for
    the additional energy needed, without stealing comfort-allocated slots.
    Returns updated combined allocations + the set of legionella-slot starts.

    When no feasible contiguous window exists (horizon too short / heater too
    weak), appends LEGIONELLA_OVERDUE_INFEASIBLE and returns unchanged
    comfort allocations with an empty legionella set.
    """
    if required_kwh <= 0 or heat_kwh <= 0:
        # Temperature already at/above legionella target — obligation is met, no slots needed.
        _append_reason(reasons, PlannerReasonCode.LEGIONELLA_ALREADY_SATISFIED)
        return dict(comfort_allocated), set()

    slots_needed = _required_heat_slots(required_kwh, heat_kwh)
    # Candidate slots: any slot in the full horizon not already comfort-allocated.
    free_slots = [s for s in slots if s.start not in comfort_allocated]

    # R3: compute remaining battery budget after comfort allocation.
    battery_budget_ref: Optional[list[float]] = _make_battery_budget_ref(planner_input)
    if battery_budget_ref is not None:
        used_battery = sum(
            alloc.battery_kwh for alloc in comfort_allocated.values()
        )
        battery_budget_ref[0] = max(0.0, battery_budget_ref[0] - used_battery)

    # Find cheapest contiguous window of length slots_needed.
    # For scoring pass the full remaining budget (same slot may appear in any window).
    best_window: Optional[list[PlanSlotAction]] = None
    best_cost = float("inf")

    for i in range(len(free_slots) - slots_needed + 1):
        window = free_slots[i : i + slots_needed]
        # Contiguity check: each slot's end must equal next slot's start.
        contiguous = all(
            window[j].end == window[j + 1].start for j in range(len(window) - 1)
        )
        if not contiguous:
            continue
        budget_for_scoring = battery_budget_ref[0] if battery_budget_ref is not None else 0.0
        cost = sum(
            _slot_allocation(s, planner_input, heat_kwh, budget_for_scoring).cost_czk
            for s in window
        )
        if cost < best_cost:
            best_cost = cost
            best_window = window

    if best_window is None:
        _append_reason(reasons, PlannerReasonCode.LEGIONELLA_OVERDUE_INFEASIBLE)
        return dict(comfort_allocated), set()

    legionella_starts: set[datetime] = set()
    combined = dict(comfort_allocated)
    for slot in best_window:
        bkwh = battery_budget_ref[0] if battery_budget_ref is not None else 0.0
        alloc = _slot_allocation(slot, planner_input, heat_kwh, bkwh)
        if battery_budget_ref is not None:
            battery_budget_ref[0] = max(0.0, battery_budget_ref[0] - alloc.battery_kwh)
        combined[slot.start] = alloc
        legionella_starts.add(slot.start)

    _append_reason(reasons, PlannerReasonCode.LEGIONELLA_SCHEDULED)
    return combined, legionella_starts


def _energy_to_max_temp(
    topology: BoilerThermalTopology,
    top_temp: float,
    bottom_temp: Optional[float],
    degraded_top_only: bool,
) -> float:
    """Energy (kWh) to bring the tank from its current state up to max_temp_c.

    Mirrors _required_energy_kwh but targets the arbitrage ceiling instead of
    the comfort target. Used to bound how much extra heat arbitrage may store.
    """
    max_temp = getattr(topology, "max_temp_c", topology.target_temp_c)
    if topology.temperature_topology != TemperatureTopology.TOP_BOTTOM or degraded_top_only:
        return calculate_energy_to_heat(topology.tank_volume_l, top_temp, max_temp)
    layer_volume = topology.tank_volume_l * 0.5
    bottom = top_temp if bottom_temp is None else float(bottom_temp)
    return (
        calculate_energy_to_heat(layer_volume, top_temp, max_temp)
        + calculate_energy_to_heat(layer_volume, bottom, max_temp)
    )


def _allocate_arbitrage(
    *,
    slots: list[PlanSlotAction],
    comfort_allocated: dict[datetime, _SlotAllocation],
    planner_input: PlannerInput,
    topology: BoilerThermalTopology,
    top_temp: float,
    bottom_temp: Optional[float],
    degraded_top_only: bool,
    required_kwh: float,
    heat_kwh: float,
    reasons: list[PlannerReasonCode],
) -> dict[datetime, _SlotAllocation]:
    """Phase B: opportunistically over-heat in cheap slots (spot < alt cost).

    Additive pass AFTER comfort + legionella. NEVER part of required_kwh, so it
    can never force expensive heating to meet a deadline — it only fills cheap,
    unused slots up to the max_temp ceiling, while reserving headroom for
    forecast FVE overflow (free) so that free solar is never crowded out.
    "Hold" emerges naturally next cycle: a hot tank needs ~0 comfort heat until
    standing losses pull it back down.
    """
    if not getattr(planner_input, "thermal_arbitrage_enabled", False):
        return dict(comfort_allocated)
    if planner_input.alt_source_capability == AlternativeSourceCapability.DISABLED:
        return dict(comfort_allocated)
    # Arbitrage is the ONLY pass that BUYS extra grid energy (pre-heating to
    # max_temp), so trusting stale spot prices is the costliest failure. Mirror
    # the freshness guard used by the source-selection path (_alternative_is_cheaper).
    if PlannerReasonCode.INPUT_STALE_PRICE in planner_input.reason_codes:
        return dict(comfort_allocated)
    alt_cost = float(planner_input.alt_cost_kwh or 0.0)
    if alt_cost <= 0.0 or heat_kwh <= 0.0:
        return dict(comfort_allocated)

    # Extra energy available between the comfort target and the max-temp ceiling.
    headroom_kwh = max(
        0.0,
        _energy_to_max_temp(topology, top_temp, bottom_temp, degraded_top_only) - required_kwh,
    )
    if headroom_kwh <= 0.0:
        return dict(comfort_allocated)

    # Cheap, unused slots: spot strictly below the alternative-source cost.
    cheap: list[tuple[float, PlanSlotAction]] = []
    for s in slots:
        if s.start in comfort_allocated:
            continue
        sp = _spot_price_for_slot(s.start, planner_input.spot_prices)
        if sp is not None and sp < alt_cost:
            cheap.append((sp, s))
    if not cheap:
        return dict(comfort_allocated)

    cheap_capacity = len(cheap) * heat_kwh
    # Reserve headroom for forecast FVE overflow (free) so it is never wasted.
    overflow_reserve = sum(
        _pv_surplus_for_slot(s, planner_input.overflow_windows, heat_kwh) for s in slots
    )
    arbitrage_kwh = max(0.0, min(headroom_kwh, cheap_capacity) - overflow_reserve)
    if arbitrage_kwh <= 0.0:
        return dict(comfort_allocated)

    # FLOOR (not ceil) the arbitrage slots so opportunistic pre-heat never
    # overshoots the max_temp ceiling by a whole extra slot.
    slots_needed = int(arbitrage_kwh / heat_kwh) if heat_kwh > 0 else 0
    if slots_needed <= 0:
        return dict(comfort_allocated)
    cheap.sort(key=lambda pair: (pair[0], pair[1].start))
    combined = dict(comfort_allocated)
    scheduled = 0
    for _sp, slot in cheap:
        if scheduled >= slots_needed:
            break
        # No battery for arbitrage (budget 0) — store cheap grid/PV, not cycles.
        combined[slot.start] = _slot_allocation(slot, planner_input, heat_kwh, 0.0)
        scheduled += 1
    if scheduled > 0:
        _append_reason(reasons, PlannerReasonCode.ARBITRAGE_SCHEDULED)
    return combined


def _predict_slots(
    slots: list[PlanSlotAction],
    heat_allocations: dict[datetime, _SlotAllocation],
    topology: BoilerThermalTopology,
    starting_top_temp: float,
    heat_kwh: float,
    deadline: datetime,
    legionella_starts: Optional[set[datetime]] = None,
) -> tuple[list[PlanSlotAction], float]:
    predicted_top = starting_top_temp
    temperature_at_deadline = starting_top_temp
    planned: list[PlanSlotAction] = []
    for slot in slots:
        allocation = heat_allocations.get(slot.start)
        heating_kwh = heat_kwh if allocation is not None else 0.0
        if heating_kwh > 0:
            predicted_top = predicted_temperature_after_slot(
                predicted_top,
                heating_kwh,
                0.0,
                topology.tank_volume_l,
            )
        action = "heat" if heating_kwh > 0 else "idle"
        source = allocation.source if allocation is not None else None
        # R9: mark legionella-obligation slots
        purpose = (
            "legionella"
            if (legionella_starts and slot.start in legionella_starts)
            else "comfort"
        )
        planned.append(
            replace(
                slot,
                action=action,
                source=source,
                heating_kwh=heating_kwh,
                pv_kwh=allocation.pv_kwh if allocation is not None else 0.0,
                grid_kwh=allocation.grid_kwh if allocation is not None else 0.0,
                alt_kwh=allocation.alt_kwh if allocation is not None else 0.0,
                battery_kwh=allocation.battery_kwh if allocation is not None else 0.0,
                estimated_cost_czk=allocation.cost_czk if allocation is not None else 0.0,
                predicted_top_temp_c=predicted_top,
                purpose=purpose,
            )
        )
        if slot.end <= deadline:
            temperature_at_deadline = predicted_top
    return planned, temperature_at_deadline


def _plan_result(
    planner_input: PlannerInput,
    now: datetime,
    slots: list[PlanSlotAction],
    deadline: datetime,
    topology: BoilerThermalTopology,
    starting_top_temp: float,
    temperature_at_deadline: float,
    comfort_satisfied: bool,
    reasons: list[PlannerReasonCode],
    degraded_top_only: bool,
    *,
    demands_met: list[bool] | None = None,
    demand_labels: list[str] | None = None,
) -> PlanResult:
    heated_kwh = sum(slot.heating_kwh for slot in slots)
    pv_kwh = sum(slot.pv_kwh for slot in slots)
    grid_kwh = sum(slot.grid_kwh for slot in slots)
    alt_kwh = sum(slot.alt_kwh for slot in slots)
    battery_kwh = sum(getattr(slot, "battery_kwh", 0.0) for slot in slots)
    estimated_cost = sum(slot.estimated_cost_czk for slot in slots)
    benchmark_selected = _benchmark_alternative_selected(planner_input, slots)
    selected_source = _selected_source(pv_kwh, grid_kwh, alt_kwh, benchmark_selected, battery_kwh)
    actuated_source = _actuated_source(pv_kwh, grid_kwh, alt_kwh, battery_kwh)
    if comfort_satisfied:
        _append_reason(reasons, PlannerReasonCode.COMFORT_SATISFIED)
        comfort_status = PlannerReasonCode.COMFORT_SATISFIED
        gap = 0.0
    else:
        _append_reason(reasons, PlannerReasonCode.COMFORT_UNSATISFIED)
        _append_reason(reasons, PlannerReasonCode.NO_FEASIBLE_PLAN)
        comfort_status = PlannerReasonCode.COMFORT_UNSATISFIED
        gap = max(0.0, topology.target_temp_c - temperature_at_deadline)
    _append_source_reasons(reasons, selected_source, pv_kwh, grid_kwh, alt_kwh, battery_kwh)
    if benchmark_selected:
        _append_reason(reasons, PlannerReasonCode.SOURCE_BENCHMARK_ONLY)
    stale_optimization = _has_stale_optimization_inputs(reasons)

    # F3a: compute cost benchmarks over heated slots.
    heated_slots = [s for s in slots if s.heating_kwh > 0]
    heat_kwh_per_slot = heated_slots[0].heating_kwh if heated_slots else 0.0
    cost_if_all_grid = sum(
        (heat_kwh_per_slot or s.heating_kwh)
        * ((_spot_price_for_slot(s.start, planner_input.spot_prices) or 0.0))
        for s in heated_slots
    )
    cost_if_all_alt = sum(
        (heat_kwh_per_slot or s.heating_kwh) * planner_input.alt_cost_kwh
        for s in heated_slots
    )

    return PlanResult(
        entry_id=planner_input.entry_id,
        box_id=planner_input.box_id,
        created_at=now,
        valid_until=slots[-1].end if slots else now,
        deadline=deadline,
        slots=slots,
        selected_source=selected_source,
        actuated_source=actuated_source if heated_kwh > 0 else None,
        comfort_satisfied=comfort_satisfied,
        comfort_status=comfort_status,
        reason_codes=_unique_reasons(reasons),
        temperature_at_deadline_c=temperature_at_deadline,
        unsatisfied_comfort_gap_c=gap,
        estimated_cost_czk=estimated_cost,
        pv_kwh=pv_kwh,
        grid_kwh=grid_kwh,
        alt_kwh=alt_kwh,
        battery_kwh=battery_kwh,
        safe_hold=False,
        degraded=degraded_top_only or stale_optimization,
        explanation=_explanation(
            topology,
            starting_top_temp,
            degraded_top_only,
            planner_input,
            pv_kwh,
            grid_kwh,
            alt_kwh,
            benchmark_selected,
            stale_optimization,
        ),
        cost_if_all_grid=cost_if_all_grid,
        cost_if_all_alt=cost_if_all_alt,
        demands_met=list(demands_met) if demands_met is not None else [],
        demand_labels=list(demand_labels) if demand_labels is not None else [],
    )


def _selected_source(
    pv_kwh: float,
    grid_kwh: float,
    alt_kwh: float,
    benchmark_selected: bool,
    battery_kwh: float = 0.0,
) -> Optional[EnergySource]:
    if alt_kwh > 0 or benchmark_selected:
        return EnergySource.ALTERNATIVE
    if battery_kwh > 0:
        return EnergySource.BATTERY
    if pv_kwh > 0:
        return EnergySource.FVE
    if grid_kwh > 0:
        return EnergySource.GRID
    return EnergySource.GRID


def _actuated_source(
    pv_kwh: float,
    grid_kwh: float,
    alt_kwh: float,
    battery_kwh: float = 0.0,
) -> Optional[EnergySource]:
    if alt_kwh > 0:
        return EnergySource.ALTERNATIVE
    if battery_kwh > 0:
        return EnergySource.BATTERY
    if grid_kwh > 0:
        return EnergySource.GRID
    if pv_kwh > 0:
        return EnergySource.FVE
    return None


def _benchmark_alternative_selected(
    planner_input: PlannerInput,
    slots: list[PlanSlotAction],
) -> bool:
    if planner_input.alt_source_capability != AlternativeSourceCapability.BENCHMARK_ONLY:
        return False
    if planner_input.alt_cost_kwh <= 0:
        return False
    for slot in slots:
        if slot.grid_kwh <= 0:
            continue
        spot_price = _spot_price_for_slot(slot.start, planner_input.spot_prices)
        if _alternative_is_cheaper(planner_input, spot_price):
            return True
    return False


def _append_source_reasons(
    reasons: list[PlannerReasonCode],
    selected_source: Optional[EnergySource],
    pv_kwh: float,
    grid_kwh: float,
    alt_kwh: float,
    battery_kwh: float = 0.0,
) -> None:
    if pv_kwh > 0:
        _append_reason(reasons, PlannerReasonCode.SOURCE_SELECTED_PV)
    if alt_kwh > 0 or selected_source == EnergySource.ALTERNATIVE:
        _append_reason(reasons, PlannerReasonCode.SOURCE_SELECTED_ALTERNATIVE)
    if battery_kwh > 0 or selected_source == EnergySource.BATTERY:
        _append_reason(reasons, PlannerReasonCode.SOURCE_SELECTED_BATTERY)
    if grid_kwh > 0 or selected_source == EnergySource.GRID:
        _append_reason(reasons, PlannerReasonCode.SOURCE_SELECTED_GRID)


def _has_stale_optimization_inputs(reasons: list[PlannerReasonCode]) -> bool:
    return (
        PlannerReasonCode.INPUT_STALE_PRICE in reasons
        or PlannerReasonCode.INPUT_STALE_PV in reasons
    )


def _safe_hold_result(
    planner_input: PlannerInput,
    now: datetime,
    slots: list[PlanSlotAction],
    deadline: datetime,
    reasons: list[PlannerReasonCode],
) -> PlanResult:
    return PlanResult(
        entry_id=planner_input.entry_id,
        box_id=planner_input.box_id,
        created_at=now,
        valid_until=slots[-1].end if slots else now,
        deadline=deadline,
        slots=slots,
        selected_source=None,
        actuated_source=None,
        comfort_satisfied=False,
        comfort_status=PlannerReasonCode.COMFORT_UNSATISFIED,
        reason_codes=_unique_reasons(reasons),
        safe_hold=True,
        degraded=True,
        explanation={
            "objective": "comfort_first",
            "fallback": "safe_hold",
        },
    )


def _timeout_result_if_needed(
    result: PlanResult,
    previous_plan: Optional[PlanResult],
    started_at: float,
    time_source: Callable[[], float],
    budget_seconds: float,
) -> PlanResult:
    if time_source() - started_at <= budget_seconds:
        return result
    if previous_plan is not None and previous_plan.comfort_satisfied:
        reasons = _unique_reasons(
            [*previous_plan.reason_codes, PlannerReasonCode.PLANNER_TIMEOUT]
        )
        explanation = dict(previous_plan.explanation)
        explanation["fallback"] = "last_safe_plan"
        return replace(
            previous_plan,
            reason_codes=reasons,
            degraded=True,
            explanation=explanation,
        )
    reasons = _unique_reasons([*result.reason_codes, PlannerReasonCode.PLANNER_TIMEOUT])
    idle_slots = [
        replace(slot, action="idle", source=None, heating_kwh=0.0)
        for slot in result.slots
    ]
    return replace(
        result,
        slots=idle_slots,
        selected_source=None,
        actuated_source=None,
        comfort_satisfied=False,
        comfort_status=PlannerReasonCode.COMFORT_UNSATISFIED,
        reason_codes=reasons,
        safe_hold=True,
        degraded=True,
        explanation={
            **result.explanation,
            "fallback": "safe_hold",
        },
    )


def _explanation(
    topology: BoilerThermalTopology,
    starting_top_temp: float,
    degraded_top_only: bool,
    planner_input: PlannerInput,
    pv_kwh: float,
    grid_kwh: float,
    alt_kwh: float,
    benchmark_selected: bool,
    stale_optimization: bool,
) -> dict[str, Any]:
    topology_name = TemperatureTopology(topology.temperature_topology).value
    if degraded_top_only:
        topology_name = "top_only_degraded"
    source_model = "single_primary_electric"
    if (
        pv_kwh > 0
        or alt_kwh > 0
        or benchmark_selected
        or planner_input.alt_source_capability != AlternativeSourceCapability.DISABLED
    ):
        source_model = "multi_source_scoring"
    explanation = {
        "objective": "comfort_first",
        "source_model": source_model,
        "temperature_model": {
            "topology": topology_name,
            "starting_top_temp_c": starting_top_temp,
            "target_temp_c": topology.target_temp_c,
        },
        "energy_allocation": {
            "pv_kwh": pv_kwh,
            "grid_kwh": grid_kwh,
            "alt_kwh": alt_kwh,
        },
    }
    if planner_input.alt_source_capability != AlternativeSourceCapability.DISABLED:
        explanation["alternative_source"] = {
            "mode": planner_input.alt_source_capability.value,
            "cost_kwh": planner_input.alt_cost_kwh,
            "benchmark_selected": benchmark_selected,
        }
    if stale_optimization:
        explanation["fallback"] = "stale_optimization_inputs"
    return explanation


def _append_reason(
    reasons: list[PlannerReasonCode],
    reason: PlannerReasonCode,
) -> None:
    if reason not in reasons:
        reasons.append(reason)


def _unique_reasons(values: list[PlannerReasonCode]) -> list[PlannerReasonCode]:
    reasons: list[PlannerReasonCode] = []
    for value in values:
        code = value if isinstance(value, PlannerReasonCode) else PlannerReasonCode(value)
        _append_reason(reasons, code)
    return reasons
