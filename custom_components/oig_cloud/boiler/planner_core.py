"""Comfort-first core planner for one controllable boiler heat source."""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field, replace
from datetime import datetime, time as dt_time, timedelta, timezone
from itertools import combinations
from typing import Any, Callable, Optional

from homeassistant.util import dt as dt_util

from .models import BoilerThermalTopology, EnergySource, TemperatureTopology
from .planner_contract import (
    AlternativeSourceCapability,
    PlannerInput,
    PlannerReasonCode,
)
from .thermal import (
    calculate_energy_to_heat,
    heating_per_slot,
    predicted_temperature_after_slot,
    stale_temperature_bias,
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
    estimated_cost_czk: float = 0.0
    predicted_top_temp_c: float = 0.0


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
    safe_hold: bool = False
    degraded: bool = False
    explanation: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class _SlotAllocation:
    source: EnergySource
    selected_source: EnergySource
    pv_kwh: float
    grid_kwh: float
    alt_kwh: float
    cost_czk: float


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
    required_heat_slots = _required_heat_slots(required_kwh, heat_kwh)
    feasible = required_heat_slots <= len(deadline_slots)
    heat_allocations = _choose_heat_allocations(
        deadline_slots,
        required_heat_slots,
        feasible,
        planner_input,
        heat_kwh,
    )

    planned_slots, temperature_at_deadline = _predict_slots(
        slots,
        heat_allocations,
        topology,
        top_temp,
        heat_kwh,
        deadline,
    )
    result = _plan_result(
        planner_input,
        now,
        planned_slots,
        deadline,
        topology,
        top_temp,
        temperature_at_deadline,
        feasible and temperature_at_deadline >= topology.target_temp_c,
        reasons,
        degraded_top_only,
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
) -> dict[datetime, _SlotAllocation]:
    if required_heat_slots <= 0:
        return {}
    if not feasible:
        return {
            slot.start: _slot_allocation(slot, planner_input, heat_kwh)
            for slot in deadline_slots
        }

    selected = _best_heat_slot_combination(
        deadline_slots,
        required_heat_slots,
        planner_input,
        heat_kwh,
    )
    return {
        slot.start: _slot_allocation(slot, planner_input, heat_kwh)
        for slot in selected
    }


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


def _combination_score(
    slots: tuple[PlanSlotAction, ...],
    planner_input: PlannerInput,
    heat_kwh: float,
) -> tuple[float, float, int, float]:
    allocations = [_slot_allocation(slot, planner_input, heat_kwh) for slot in slots]
    total_cost = sum(allocation.cost_czk for allocation in allocations)
    total_pv = sum(allocation.pv_kwh for allocation in allocations)
    return (
        round(total_cost, 9),
        -round(total_pv, 9),
        _transition_count(slots),
        -sum(slot.start.timestamp() for slot in slots),
    )


def _slot_score(
    slot: PlanSlotAction,
    planner_input: PlannerInput,
    heat_kwh: float,
) -> tuple[float, float, float]:
    allocation = _slot_allocation(slot, planner_input, heat_kwh)
    return (
        round(allocation.cost_czk, 9),
        -round(allocation.pv_kwh, 9),
        -slot.start.timestamp(),
    )


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
) -> _SlotAllocation:
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


def _predict_slots(
    slots: list[PlanSlotAction],
    heat_allocations: dict[datetime, _SlotAllocation],
    topology: BoilerThermalTopology,
    starting_top_temp: float,
    heat_kwh: float,
    deadline: datetime,
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
        planned.append(
            replace(
                slot,
                action=action,
                source=source,
                heating_kwh=heating_kwh,
                pv_kwh=allocation.pv_kwh if allocation is not None else 0.0,
                grid_kwh=allocation.grid_kwh if allocation is not None else 0.0,
                alt_kwh=allocation.alt_kwh if allocation is not None else 0.0,
                estimated_cost_czk=allocation.cost_czk if allocation is not None else 0.0,
                predicted_top_temp_c=predicted_top,
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
) -> PlanResult:
    heated_kwh = sum(slot.heating_kwh for slot in slots)
    pv_kwh = sum(slot.pv_kwh for slot in slots)
    grid_kwh = sum(slot.grid_kwh for slot in slots)
    alt_kwh = sum(slot.alt_kwh for slot in slots)
    estimated_cost = sum(slot.estimated_cost_czk for slot in slots)
    benchmark_selected = _benchmark_alternative_selected(planner_input, slots)
    selected_source = _selected_source(pv_kwh, grid_kwh, alt_kwh, benchmark_selected)
    actuated_source = _actuated_source(pv_kwh, grid_kwh, alt_kwh)
    if comfort_satisfied:
        _append_reason(reasons, PlannerReasonCode.COMFORT_SATISFIED)
        comfort_status = PlannerReasonCode.COMFORT_SATISFIED
        gap = 0.0
    else:
        _append_reason(reasons, PlannerReasonCode.COMFORT_UNSATISFIED)
        _append_reason(reasons, PlannerReasonCode.NO_FEASIBLE_PLAN)
        comfort_status = PlannerReasonCode.COMFORT_UNSATISFIED
        gap = max(0.0, topology.target_temp_c - temperature_at_deadline)
    _append_source_reasons(reasons, selected_source, pv_kwh, grid_kwh, alt_kwh)
    if benchmark_selected:
        _append_reason(reasons, PlannerReasonCode.SOURCE_BENCHMARK_ONLY)
    stale_optimization = _has_stale_optimization_inputs(reasons)
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
    )


def _selected_source(
    pv_kwh: float,
    grid_kwh: float,
    alt_kwh: float,
    benchmark_selected: bool,
) -> Optional[EnergySource]:
    if alt_kwh > 0 or benchmark_selected:
        return EnergySource.ALTERNATIVE
    if pv_kwh > 0:
        return EnergySource.FVE
    if grid_kwh > 0:
        return EnergySource.GRID
    return EnergySource.GRID


def _actuated_source(
    pv_kwh: float,
    grid_kwh: float,
    alt_kwh: float,
) -> Optional[EnergySource]:
    if alt_kwh > 0:
        return EnergySource.ALTERNATIVE
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
) -> None:
    if pv_kwh > 0:
        _append_reason(reasons, PlannerReasonCode.SOURCE_SELECTED_PV)
    if alt_kwh > 0 or selected_source == EnergySource.ALTERNATIVE:
        _append_reason(reasons, PlannerReasonCode.SOURCE_SELECTED_ALTERNATIVE)
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
