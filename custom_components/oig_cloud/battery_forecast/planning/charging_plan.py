"""Charging plan helpers extracted from the battery forecast sensor."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from .charging_plan_utils import (
    calculate_minimum_charge,
    calculate_protection_requirement,
    get_candidate_intervals,
    recalculate_timeline_from_index,
    simulate_forward,
)
from .precedence_contract import PrecedenceLevel
from .rollout_flags import RolloutFlags, is_pv_first_active

_LOGGER = logging.getLogger(__name__)


# Precedence reason string constants matching PrecedenceLevel enum
REASON_DEATH_VALLEY = "death_valley"
REASON_PROTECTION_SAFETY = "protection_safety"
REASON_ECONOMIC_CHARGING = "economic_charging"
REASON_PV_FIRST = "pv_first"


@dataclass(slots=True)
class DecisionTrace:
    """Trace entry for a charging decision with precedence context.

    Lightweight trace structure for debugging and testing.
    Does not need to be stored in HA state - returned alongside metrics.
    """

    index: int
    timestamp: str
    action: str  # "charge" | "skip" | "defer"
    reason_code: str  # Human-readable reason
    precedence_level: int  # Numeric PrecedenceLevel value
    precedence_name: str  # PrecedenceLevel enum name
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class EconomicChargingPlanConfig:
    min_capacity_kwh: float
    min_capacity_floor: float
    effective_minimum_kwh: float
    target_capacity_kwh: float
    max_charging_price: float
    min_savings_margin: float
    charging_power_kw: float
    max_capacity: float
    battery_efficiency: float
    config: Dict[str, Any]
    iso_tz_offset: str
    mode_label_home_ups: str
    mode_label_home_i: str
    target_reason: str = "default"
    pv_forecast_kwh: float = 0.0
    pv_forecast_confidence: float = 0.0
    pv_forecast_lookahead_hours: int = 6


def should_defer_for_pv(
    pv_forecast_kwh: float,
    pv_forecast_confidence: float,
    current_soc_kwh: float,
    death_valley_threshold_kwh: float,
    protection_override_active: bool,
    flags: RolloutFlags,
) -> bool:
    if not is_pv_first_active(flags):
        return False

    if protection_override_active:
        return False

    if current_soc_kwh < death_valley_threshold_kwh:
        return False

    min_confidence = 0.3
    min_forecast_kwh = 0.5

    if pv_forecast_kwh <= min_forecast_kwh:
        return False

    if pv_forecast_confidence < min_confidence:
        return False

    return True


def economic_charging_plan(
    *,
    timeline_data: List[Dict[str, Any]],
    plan: EconomicChargingPlanConfig,
    pv_forecast: Optional[Dict[str, Any]] = None,
    rollout_flags: Optional[RolloutFlags] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    timeline = [dict(point) for point in timeline_data]
    decision_trace: List[DecisionTrace] = []

    charge_per_interval = plan.charging_power_kw / 4.0
    current_time = datetime.now()

    protection_soc_kwh, protection_trace = _apply_protection_override(
        timeline,
        plan,
        current_time=current_time,
        charge_per_interval=charge_per_interval,
    )
    decision_trace.extend(protection_trace)

    current_soc = timeline[0].get("battery_capacity_kwh", 0) if timeline else 0
    protection_active = protection_soc_kwh is not None

    flags = rollout_flags or RolloutFlags()

    pv_forecast_kwh = plan.pv_forecast_kwh
    pv_forecast_confidence = plan.pv_forecast_confidence

    if pv_forecast:
        pv_forecast_kwh = pv_forecast.get("pv_forecast_kwh", pv_forecast_kwh)
        pv_forecast_confidence = pv_forecast.get("pv_forecast_confidence", pv_forecast_confidence)

    defer_for_pv = should_defer_for_pv(
        pv_forecast_kwh=pv_forecast_kwh,
        pv_forecast_confidence=pv_forecast_confidence,
        current_soc_kwh=current_soc,
        death_valley_threshold_kwh=plan.effective_minimum_kwh,
        protection_override_active=protection_active,
        flags=flags,
    )

    if defer_for_pv:
        _LOGGER.info(
            "PV-FIRST: Deferring grid charging (PV forecast: %.2fkWh, confidence: %.2f, SOC: %.2fkWh)",
            pv_forecast_kwh,
            pv_forecast_confidence,
            current_soc,
        )
        decision_trace.append(
            DecisionTrace(
                index=0,
                timestamp=timeline[0].get("timestamp", "") if timeline else "",
                action="defer",
                reason_code=REASON_PV_FIRST,
                precedence_level=PrecedenceLevel.PV_FIRST,
                precedence_name=PrecedenceLevel.PV_FIRST.name,
                details={
                    "pv_forecast_kwh": pv_forecast_kwh,
                    "pv_forecast_confidence": pv_forecast_confidence,
                    "current_soc_kwh": current_soc,
                },
            )
        )
        final_capacity = timeline[-1].get("battery_capacity_kwh", 0) if timeline else 0
        metrics = {
            "algorithm": "economic",
            "pv_first_deferred": True,
            "pv_forecast_kwh": pv_forecast_kwh,
            "pv_forecast_confidence": pv_forecast_confidence,
            "target_capacity_kwh": plan.target_capacity_kwh,
            "effective_minimum_kwh": plan.effective_minimum_kwh,
            "final_capacity_kwh": final_capacity,
            "min_capacity_kwh": plan.min_capacity_kwh,
            "target_achieved": final_capacity >= plan.target_capacity_kwh,
            "min_achieved": final_capacity >= plan.min_capacity_kwh,
            "shortage_kwh": max(0, plan.target_capacity_kwh - final_capacity),
            "protection_enabled": plan.config.get("enable_blackout_protection", False)
            or plan.config.get("enable_weather_risk", False),
            "protection_soc_kwh": protection_soc_kwh,
            "optimal_target_info": {
                "target_kwh": plan.target_capacity_kwh,
                "target_percent": (plan.target_capacity_kwh / plan.max_capacity * 100),
                "reason": plan.target_reason,
            },
            "decision_trace": [
                {
                    "index": t.index,
                    "timestamp": t.timestamp,
                    "action": t.action,
                    "reason_code": t.reason_code,
                    "precedence_level": t.precedence_level,
                    "precedence_name": t.precedence_name,
                    "details": t.details,
                }
                for t in decision_trace
            ],
        }
        return timeline, metrics

    candidates = get_candidate_intervals(
        timeline,
        plan.max_charging_price,
        current_time=current_time,
        iso_tz_offset=plan.iso_tz_offset,
    )

    if not candidates:
        _LOGGER.warning(
            "No economic charging candidates under max_price=%sCZK",
            plan.max_charging_price,
        )
        return timeline, {}

    _LOGGER.info("Found %s economic charging candidates", len(candidates))

    for candidate in candidates:
        trace = _apply_economic_candidate(
            timeline,
            plan,
            candidate=candidate,
            charge_per_interval=charge_per_interval,
        )
        if trace is not None:
            decision_trace.append(trace)

    final_capacity = timeline[-1].get("battery_capacity_kwh", 0)
    target_achieved = final_capacity >= plan.target_capacity_kwh
    min_achieved = final_capacity >= plan.min_capacity_kwh

    metrics = {
        "algorithm": "economic",
        "target_capacity_kwh": plan.target_capacity_kwh,
        "effective_minimum_kwh": plan.effective_minimum_kwh,
        "final_capacity_kwh": final_capacity,
        "min_capacity_kwh": plan.min_capacity_kwh,
        "target_achieved": target_achieved,
        "min_achieved": min_achieved,
        "shortage_kwh": (
            max(0, plan.target_capacity_kwh - final_capacity) if not target_achieved else 0
        ),
        "protection_enabled": plan.config.get("enable_blackout_protection", False)
        or plan.config.get("enable_weather_risk", False),
        "protection_soc_kwh": protection_soc_kwh,
        "optimal_target_info": {
            "target_kwh": plan.target_capacity_kwh,
            "target_percent": (plan.target_capacity_kwh / plan.max_capacity * 100),
            "reason": plan.target_reason,
        },
        "decision_trace": [
            {
                "index": t.index,
                "timestamp": t.timestamp,
                "action": t.action,
                "reason_code": t.reason_code,
                "precedence_level": t.precedence_level,
                "precedence_name": t.precedence_name,
                "details": t.details,
            }
            for t in decision_trace
        ],
    }

    _LOGGER.info(
        "Economic charging complete: final=%.2fkWh, target=%.2fkWh, achieved=%s",
        final_capacity,
        plan.target_capacity_kwh,
        target_achieved,
    )

    return timeline, metrics


def smart_charging_plan(
    *,
    timeline: List[Dict[str, Any]],
    min_capacity: float,
    target_capacity: float,
    max_price: float,
    charging_power_kw: float,
    max_capacity: float,
    efficiency: float,
    mode_label_home_ups: str,
    mode_label_home_i: str,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Smart charging plan using cheapest intervals."""
    charge_per_interval = charging_power_kw / 4.0

    critical_intervals, min_capacity_in_timeline, min_capacity_timestamp = (
        _collect_critical_intervals(timeline, min_capacity)
    )

    final_capacity = timeline[-1].get("battery_capacity_kwh", 0)
    energy_needed_for_target = max(0, target_capacity - final_capacity)

    _LOGGER.info(
        "Smart charging: %s critical intervals, min_capacity_in_timeline: %.2fkWh @ %s, min_threshold: %.2fkWh, need %.2fkWh for target",
        len(critical_intervals),
        min_capacity_in_timeline,
        min_capacity_timestamp,
        min_capacity,
        energy_needed_for_target,
    )

    if critical_intervals:
        _apply_critical_fix(
            timeline,
            first_critical=critical_intervals[0],
            min_capacity=min_capacity,
            max_price=max_price,
            max_capacity=max_capacity,
            charge_per_interval=charge_per_interval,
            efficiency=efficiency,
            mode_label_home_ups=mode_label_home_ups,
            mode_label_home_i=mode_label_home_i,
        )

    effective_target = target_capacity
    if target_capacity >= max_capacity * 0.99:
        effective_target = max_capacity * 0.99
    iteration = _apply_target_charging(
        timeline,
        effective_target=effective_target,
        max_price=max_price,
        max_capacity=max_capacity,
        min_capacity=min_capacity,
        charge_per_interval=charge_per_interval,
        efficiency=efficiency,
        mode_label_home_ups=mode_label_home_ups,
        mode_label_home_i=mode_label_home_i,
    )

    if iteration >= 100:
        _LOGGER.warning("Reached max iterations in smart charging plan")

    final_capacity = timeline[-1].get("battery_capacity_kwh", 0)
    target_achieved = final_capacity >= effective_target
    min_achieved = final_capacity >= min_capacity

    metrics = {
        "target_capacity_kwh": target_capacity,
        "effective_target_kwh": effective_target,
        "final_capacity_kwh": final_capacity,
        "min_capacity_kwh": min_capacity,
        "target_achieved": target_achieved,
        "min_achieved": min_achieved,
        "shortage_kwh": (
            max(0, effective_target - final_capacity) if not target_achieved else 0
        ),
    }

    return timeline, metrics


def _apply_protection_override(
    timeline: List[Dict[str, Any]],
    plan: EconomicChargingPlanConfig,
    *,
    current_time: datetime,
    charge_per_interval: float,
) -> Tuple[Optional[float], List[DecisionTrace]]:
    protection_soc_kwh = calculate_protection_requirement(
        timeline,
        plan.max_capacity,
        config=plan.config,
        iso_tz_offset=plan.iso_tz_offset,
    )
    decision_trace: List[DecisionTrace] = []

    if protection_soc_kwh is None:
        return None, decision_trace

    current_soc = timeline[0].get("battery_capacity_kwh", 0)
    protection_shortage = protection_soc_kwh - current_soc
    if protection_shortage <= 0:
        return protection_soc_kwh, decision_trace

    _LOGGER.warning(
        "PROTECTION OVERRIDE: Need %.2fkWh to reach protection target %.2fkWh (current: %.2fkWh)",
        protection_shortage,
        protection_soc_kwh,
        current_soc,
    )

    candidates = get_candidate_intervals(
        timeline,
        plan.max_charging_price,
        current_time=current_time,
        iso_tz_offset=plan.iso_tz_offset,
    )
    if not candidates:
        _LOGGER.error(
            "PROTECTION FAILED: No charging candidates under max_price=%sCZK",
            plan.max_charging_price,
        )
        return protection_soc_kwh, decision_trace

    charged = 0.0
    for candidate in candidates:
        if charged >= protection_shortage:
            break

        idx = candidate["index"]
        old_charge = timeline[idx].get("grid_charge_kwh", 0)
        timeline[idx]["grid_charge_kwh"] = old_charge + charge_per_interval
        if timeline[idx].get("reason") == "normal":
            timeline[idx]["reason"] = "protection_charge"
        timeline[idx]["precedence_reason"] = REASON_PROTECTION_SAFETY
        timeline[idx]["precedence_level"] = PrecedenceLevel.PROTECTION_SAFETY
        charged += charge_per_interval

        decision_trace.append(
            DecisionTrace(
                index=idx,
                timestamp=candidate["timestamp"],
                action="charge",
                reason_code=REASON_PROTECTION_SAFETY,
                precedence_level=PrecedenceLevel.PROTECTION_SAFETY,
                precedence_name=PrecedenceLevel.PROTECTION_SAFETY.name,
                details={"price": candidate["price"], "kwh": charge_per_interval},
            )
        )

        _LOGGER.info(
            "PROTECTION: Adding %.2fkWh at %s (price %.2fCZK)",
            charge_per_interval,
            candidate["timestamp"],
            candidate["price"],
        )

        recalculate_timeline_from_index(
            timeline,
            idx,
            max_capacity=plan.max_capacity,
            min_capacity=plan.min_capacity_floor,
            efficiency=plan.battery_efficiency,
            mode_label_home_ups=plan.mode_label_home_ups,
            mode_label_home_i=plan.mode_label_home_i,
        )

    _LOGGER.info(
        "PROTECTION: Charged %.2fkWh / %.2fkWh needed",
        charged,
        protection_shortage,
    )
    return protection_soc_kwh, decision_trace


def _apply_economic_candidate(
    timeline: List[Dict[str, Any]],
    plan: EconomicChargingPlanConfig,
    *,
    candidate: Dict[str, Any],
    charge_per_interval: float,
) -> Optional[DecisionTrace]:
    idx = candidate["index"]
    price = candidate["price"]
    timestamp = candidate["timestamp"]

    horizon_hours = min(48, len(timeline) - idx)

    result_charge = simulate_forward(
        timeline=timeline,
        start_index=idx,
        charge_now=True,
        charge_amount_kwh=charge_per_interval,
        horizon_hours=horizon_hours,
        effective_minimum_kwh=plan.effective_minimum_kwh,
        efficiency=plan.battery_efficiency,
    )
    cost_charge = result_charge["total_charging_cost"]

    result_wait = simulate_forward(
        timeline=timeline,
        start_index=idx,
        charge_now=False,
        charge_amount_kwh=0,
        horizon_hours=horizon_hours,
        effective_minimum_kwh=plan.effective_minimum_kwh,
        efficiency=plan.battery_efficiency,
    )
    cost_wait = result_wait["total_charging_cost"]
    min_soc_wait = result_wait["min_soc"]
    death_valley_wait = result_wait["death_valley_reached"]

    if death_valley_wait:
        shortage = plan.effective_minimum_kwh - min_soc_wait
        if shortage > 0:
            min_charge = calculate_minimum_charge(
                scenario_wait_min_soc=min_soc_wait,
                effective_minimum_kwh=plan.effective_minimum_kwh,
                max_charge_per_interval=charge_per_interval,
            )
            _LOGGER.warning(
                "DEATH VALLEY at %s: Need %.2fkWh (min_soc_wait=%.2fkWh, effective_min=%.2fkWh)",
                timestamp,
                min_charge,
                min_soc_wait,
                plan.effective_minimum_kwh,
            )
            old_charge = timeline[idx].get("grid_charge_kwh", 0)
            timeline[idx]["grid_charge_kwh"] = old_charge + min_charge
            if timeline[idx].get("reason") == "normal":
                timeline[idx]["reason"] = "death_valley_fix"
            timeline[idx]["precedence_reason"] = REASON_DEATH_VALLEY
            timeline[idx]["precedence_level"] = PrecedenceLevel.DEATH_VALLEY

            recalculate_timeline_from_index(
                timeline,
                idx,
                max_capacity=plan.max_capacity,
                min_capacity=plan.min_capacity_floor,
                efficiency=plan.battery_efficiency,
                mode_label_home_ups=plan.mode_label_home_ups,
                mode_label_home_i=plan.mode_label_home_i,
            )

            _LOGGER.info(
                "DEATH VALLEY FIX: Added %.2fkWh at %s (price %.2fCZK)",
                min_charge,
                timestamp,
                price,
            )
            return DecisionTrace(
                index=idx,
                timestamp=timestamp,
                action="charge",
                reason_code=REASON_DEATH_VALLEY,
                precedence_level=PrecedenceLevel.DEATH_VALLEY,
                precedence_name=PrecedenceLevel.DEATH_VALLEY.name,
                details={"price": price, "kwh": min_charge, "shortage": shortage},
            )

    savings_per_kwh = (cost_wait - cost_charge) / charge_per_interval
    if savings_per_kwh >= plan.min_savings_margin:
        old_charge = timeline[idx].get("grid_charge_kwh", 0)
        timeline[idx]["grid_charge_kwh"] = old_charge + charge_per_interval
        if timeline[idx].get("reason") == "normal":
            timeline[idx]["reason"] = "economic_charge"
        timeline[idx]["precedence_reason"] = REASON_ECONOMIC_CHARGING
        timeline[idx]["precedence_level"] = PrecedenceLevel.ECONOMIC_CHARGING

        recalculate_timeline_from_index(
            timeline,
            idx,
            max_capacity=plan.max_capacity,
            min_capacity=plan.min_capacity_floor,
            efficiency=plan.battery_efficiency,
            mode_label_home_ups=plan.mode_label_home_ups,
            mode_label_home_i=plan.mode_label_home_i,
        )

        _LOGGER.info(
            "ECONOMIC: Added %.2fkWh at %s (price %.2fCZK, savings %.3fCZK/kWh > %.3fCZK/kWh)",
            charge_per_interval,
            timestamp,
            price,
            savings_per_kwh,
            plan.min_savings_margin,
        )
        return DecisionTrace(
            index=idx,
            timestamp=timestamp,
            action="charge",
            reason_code=REASON_ECONOMIC_CHARGING,
            precedence_level=PrecedenceLevel.ECONOMIC_CHARGING,
            precedence_name=PrecedenceLevel.ECONOMIC_CHARGING.name,
            details={"price": price, "kwh": charge_per_interval, "savings_per_kwh": savings_per_kwh},
        )

    _LOGGER.debug(
        "ECONOMIC: Skipping %s (price %.2fCZK, savings %.3fCZK/kWh < %.3fCZK/kWh)",
        timestamp,
        price,
        savings_per_kwh,
        plan.min_savings_margin,
    )
    return DecisionTrace(
        index=idx,
        timestamp=timestamp,
        action="skip",
        reason_code="insufficient_savings",
        precedence_level=PrecedenceLevel.ECONOMIC_CHARGING,
        precedence_name=PrecedenceLevel.ECONOMIC_CHARGING.name,
        details={"price": price, "savings_per_kwh": savings_per_kwh, "margin_required": plan.min_savings_margin},
    )


def _collect_critical_intervals(
    timeline: List[Dict[str, Any]], min_capacity: float
) -> tuple[list[int], float, Optional[str]]:
    critical_intervals: list[int] = []
    min_capacity_in_timeline = float("inf")
    min_capacity_timestamp: Optional[str] = None
    for i, point in enumerate(timeline):
        capacity = point.get("battery_capacity_kwh", 0)
        if capacity < min_capacity:
            critical_intervals.append(i)
        if capacity < min_capacity_in_timeline:
            min_capacity_in_timeline = capacity
            min_capacity_timestamp = point.get("timestamp", "unknown")
    return critical_intervals, min_capacity_in_timeline, min_capacity_timestamp


def _apply_critical_fix(
    timeline: List[Dict[str, Any]],
    *,
    first_critical: int,
    min_capacity: float,
    max_price: float,
    max_capacity: float,
    charge_per_interval: float,
    efficiency: float,
    mode_label_home_ups: str,
    mode_label_home_i: str,
) -> None:
    _LOGGER.info(
        "First critical interval at index %s, capacity: %.2fkWh",
        first_critical,
        timeline[first_critical].get("battery_capacity_kwh", 0),
    )

    critical_capacity = timeline[first_critical].get("battery_capacity_kwh", 0)
    energy_needed = min_capacity - critical_capacity
    if energy_needed <= 0:
        return  # pragma: no cover

    _LOGGER.info("Need %.2fkWh to reach minimum at critical point", energy_needed)
    charging_candidates = _collect_critical_candidates(
        timeline,
        first_critical=first_critical,
        max_price=max_price,
        max_capacity=max_capacity,
    )

    added_energy = 0.0
    while added_energy < energy_needed and charging_candidates:
        best = charging_candidates.pop(0)
        idx = best["index"]

        old_charge = timeline[idx].get("grid_charge_kwh", 0)
        timeline[idx]["grid_charge_kwh"] = old_charge + charge_per_interval
        if timeline[idx].get("reason") == "normal":
            timeline[idx]["reason"] = "legacy_critical"
        added_energy += charge_per_interval

        _LOGGER.debug(
            "Critical fix: Adding %.2fkWh at index %s (price %.2fCZK), total added: %.2fkWh",
            charge_per_interval,
            idx,
            best["price"],
            added_energy,
        )

        recalculate_timeline_from_index(
            timeline,
            idx,
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            efficiency=efficiency,
            mode_label_home_ups=mode_label_home_ups,
            mode_label_home_i=mode_label_home_i,
        )

        new_critical_capacity = timeline[first_critical].get("battery_capacity_kwh", 0)
        if new_critical_capacity >= min_capacity:
            _LOGGER.info(
                "Critical interval fixed: capacity now %.2fkWh >= %.2fkWh",
                new_critical_capacity,
                min_capacity,
            )
            break


def _collect_critical_candidates(
    timeline: List[Dict[str, Any]],
    *,
    first_critical: int,
    max_price: float,
    max_capacity: float,
) -> List[Dict[str, Any]]:
    charging_candidates = []
    for i in range(first_critical):
        point = timeline[i]
        price = point.get("spot_price_czk", float("inf"))
        capacity = point.get("battery_capacity_kwh", 0)
        if price > max_price:
            continue
        if capacity >= max_capacity * 0.99:
            continue
        charging_candidates.append(
            {
                "index": i,
                "price": price,
                "capacity": capacity,
                "timestamp": point.get("timestamp", ""),
            }
        )
    charging_candidates.sort(key=lambda x: x["price"])
    return charging_candidates


def _apply_target_charging(
    timeline: List[Dict[str, Any]],
    *,
    effective_target: float,
    max_price: float,
    max_capacity: float,
    min_capacity: float,
    charge_per_interval: float,
    efficiency: float,
    mode_label_home_ups: str,
    mode_label_home_i: str,
) -> int:
    max_iterations = 100
    iteration = 0
    while iteration < max_iterations:
        current_final_capacity = timeline[-1].get("battery_capacity_kwh", 0)
        if current_final_capacity >= effective_target:
            _LOGGER.info(
                "Target capacity achieved: %.2fkWh >= %.2fkWh",
                current_final_capacity,
                effective_target,
            )
            break

        shortage = effective_target - current_final_capacity
        charging_candidates = _collect_target_candidates(
            timeline,
            max_price=max_price,
            max_capacity=max_capacity,
            charge_per_interval=charge_per_interval,
        )
        if not charging_candidates:
            _LOGGER.warning(
                "No more charging candidates available, shortage: %.2fkWh",
                shortage,
            )
            break

        best_candidate = charging_candidates[0]
        idx = best_candidate["index"]

        old_charge = timeline[idx].get("grid_charge_kwh", 0)
        timeline[idx]["grid_charge_kwh"] = old_charge + charge_per_interval
        if timeline[idx].get("reason") == "normal":
            timeline[idx]["reason"] = "legacy_target"

        _LOGGER.debug(
            "Target charging: Adding %.2fkWh at index %s (price %.2fCZK, timestamp %s), shortage: %.2fkWh, capacity before: %.2fkWh",
            charge_per_interval,
            idx,
            best_candidate["price"],
            best_candidate["timestamp"],
            shortage,
            best_candidate["capacity"],
        )

        recalculate_timeline_from_index(
            timeline,
            idx,
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            efficiency=efficiency,
            mode_label_home_ups=mode_label_home_ups,
            mode_label_home_i=mode_label_home_i,
        )

        iteration += 1

    return iteration


def _collect_target_candidates(
    timeline: List[Dict[str, Any]],
    *,
    max_price: float,
    max_capacity: float,
    charge_per_interval: float,
) -> List[Dict[str, Any]]:
    charging_candidates = []
    for i, point in enumerate(timeline):
        price = point.get("spot_price_czk", float("inf"))
        capacity = point.get("battery_capacity_kwh", 0)
        existing_charge = point.get("grid_charge_kwh", 0)
        if price > max_price:
            continue
        if capacity >= max_capacity * 0.99:
            continue
        if i >= len(timeline) - 1:
            continue
        if existing_charge >= charge_per_interval * 0.99:
            continue
        charging_candidates.append(
            {
                "index": i,
                "price": price,
                "capacity": capacity,
                "timestamp": point.get("timestamp", ""),
                "existing_charge": existing_charge,
            }
        )
    charging_candidates.sort(key=lambda x: x["price"])
    return charging_candidates
