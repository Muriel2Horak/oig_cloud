"""Charging plan helpers extracted from the battery forecast sensor."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from .charging_plan_adjustments import schedule_pre_peak_charging
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
REASON_PRE_PEAK_AVOIDANCE = "pre_peak_avoidance"


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
    peak_start_hour: int = 6
    peak_end_hour: int = 8
    pre_peak_window_hours: int = 2
    hw_min_soc_kwh: float = 2.05
    round_trip_efficiency: float = 0.87
    peak_price_ratio_threshold: float = 1.2
    max_charge_fraction: float = 0.95


@dataclass(slots=True)
class PrePeakDecision:
    should_charge: bool
    reason: str
    soc_at_peak_start_kwh: float
    cheapest_intervals: list[int]  # indexy intervalů k nabíjení
    expected_charge_kwh: float
    estimated_saving_czk: float
    peak_avg_price: float
    pre_peak_avg_price: float


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

    # Pre-peak avoidance: check if we should pre-charge before morning peak
    pre_peak_decision = should_pre_charge_for_peak_avoidance(
        config=plan,
        flags=flags,
        intervals=timeline,
        current_hour=datetime.now().hour,
        current_soc_kwh=current_soc,
    )

    if pre_peak_decision.should_charge:
        schedule_pre_peak_charging(
            intervals=timeline,
            decision=pre_peak_decision,
            config=plan,
        )
        decision_trace.append(
            DecisionTrace(
                index=0,
                timestamp=timeline[0].get("timestamp", "") if timeline else "",
                action="charge",
                reason_code=REASON_PRE_PEAK_AVOIDANCE,
                precedence_level=PrecedenceLevel.PRE_PEAK_AVOIDANCE,
                precedence_name=PrecedenceLevel.PRE_PEAK_AVOIDANCE.name,
                details={
                    "expected_charge_kwh": pre_peak_decision.expected_charge_kwh,
                    "estimated_saving_czk": pre_peak_decision.estimated_saving_czk,
                    "cheapest_intervals": pre_peak_decision.cheapest_intervals,
                },
            )
        )
        if current_soc < flags.pre_peak_charging_canary_soc_threshold_kwh:
            _LOGGER.warning(
                "PRE_PEAK_CANARY: SOC %.2fkWh below canary threshold %.2fkWh",
                current_soc,
                flags.pre_peak_charging_canary_soc_threshold_kwh,
            )

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


def _get_hour_from_interval(interval: dict) -> int:
    """Extract hour from interval timestamp."""
    ts = interval.get("timestamp", "")
    try:
        dt = datetime.fromisoformat(ts)
        return dt.hour
    except (ValueError, TypeError):
        return -1


def _get_interval_solar_kwh(interval: dict) -> float:
    solar_kwh = interval.get("solar_production_kwh")
    if solar_kwh is not None:
        try:
            return max(0.0, float(solar_kwh))
        except (TypeError, ValueError):
            return 0.0

    solar_wh = interval.get("solar_wh")
    if solar_wh is not None:
        try:
            return max(0.0, float(solar_wh) / 1000.0)
        except (TypeError, ValueError):
            return 0.0

    return 0.0


def _get_interval_load_kwh(interval: dict) -> float:
    try:
        return max(0.0, float(interval.get("consumption_kwh", 0.0) or 0.0))
    except (TypeError, ValueError):
        return 0.0


def _get_interval_price_czk(interval: dict) -> Optional[float]:
    try:
        return float(interval.get("spot_price_czk", float("inf")))
    except (TypeError, ValueError):
        return None


def _get_interval_grid_charge_kwh(interval: dict) -> float:
    try:
        return max(0.0, float(interval.get("grid_charge_kwh", 0.0) or 0.0))
    except (TypeError, ValueError):
        return 0.0


def _project_soc_until_index(
    *,
    current_soc_kwh: float,
    intervals: list[dict],
    end_idx_exclusive: int,
    round_trip_efficiency: float,
    max_capacity_kwh: float,
    extra_charge_by_index: Optional[dict[int, float]] = None,
) -> tuple[float, float]:
    if round_trip_efficiency <= 0:
        return current_soc_kwh, current_soc_kwh

    battery_soc = current_soc_kwh
    min_soc = current_soc_kwh
    extra_charge_by_index = extra_charge_by_index or {}

    for idx, interval in enumerate(intervals[:end_idx_exclusive]):
        solar_kwh = _get_interval_solar_kwh(interval)
        load_kwh = _get_interval_load_kwh(interval)
        grid_charge_kwh = _get_interval_grid_charge_kwh(interval) + extra_charge_by_index.get(idx, 0.0)

        if grid_charge_kwh > 0.0:
            battery_soc += solar_kwh + grid_charge_kwh
        elif solar_kwh >= load_kwh:
            battery_soc += solar_kwh - load_kwh
        else:
            battery_soc -= (load_kwh - solar_kwh) / round_trip_efficiency

        battery_soc = max(0.0, min(max_capacity_kwh, battery_soc))
        min_soc = min(min_soc, battery_soc)

    return battery_soc, min_soc


def _estimate_soc_after_peak_window(
    *,
    current_soc_kwh: float,
    intervals: list[dict],
    peak_end_idx: int,
    round_trip_efficiency: float,
    max_capacity_kwh: float,
) -> float:
    projected_soc, _ = _project_soc_until_index(
        current_soc_kwh=current_soc_kwh,
        intervals=intervals,
        end_idx_exclusive=peak_end_idx + 1,
        round_trip_efficiency=round_trip_efficiency,
        max_capacity_kwh=max_capacity_kwh,
    )
    return projected_soc


def _find_cheapest_future_interval(
    intervals: list[dict],
    *,
    start_idx: int,
) -> tuple[Optional[int], Optional[float]]:
    cheapest_idx: Optional[int] = None
    cheapest_price: Optional[float] = None
    for idx in range(start_idx, len(intervals)):
        price = _get_interval_price_czk(intervals[idx])
        if price is None:
            continue
        if cheapest_price is None or price < cheapest_price:
            cheapest_price = price
            cheapest_idx = idx
    return cheapest_idx, cheapest_price


def _has_future_negative_price_headroom_risk(
    intervals: list[dict],
    *,
    start_idx: int,
    current_soc_kwh: float,
    round_trip_efficiency: float,
    max_capacity_kwh: float,
    hw_min_soc_kwh: float,
    extra_charge_by_index: Optional[dict[int, float]] = None,
) -> bool:
    tolerance = 1e-9

    for idx in range(start_idx, len(intervals)):
        interval = intervals[idx]
        price = _get_interval_price_czk(interval)
        if price is None or price >= 0.0:
            continue

        future_surplus_kwh = max(0.0, _get_interval_solar_kwh(interval) - _get_interval_load_kwh(interval))
        if future_surplus_kwh <= 0.0:
            continue

        soc_without, min_soc_without = _project_soc_until_index(
            current_soc_kwh=current_soc_kwh,
            intervals=intervals,
            end_idx_exclusive=idx,
            round_trip_efficiency=round_trip_efficiency,
            max_capacity_kwh=max_capacity_kwh,
        )
        if min_soc_without < hw_min_soc_kwh:
            continue

        soc_with, _ = _project_soc_until_index(
            current_soc_kwh=current_soc_kwh,
            intervals=intervals,
            end_idx_exclusive=idx,
            round_trip_efficiency=round_trip_efficiency,
            max_capacity_kwh=max_capacity_kwh,
            extra_charge_by_index=extra_charge_by_index,
        )

        headroom_without = max(0.0, max_capacity_kwh - soc_without)
        headroom_with = max(0.0, max_capacity_kwh - soc_with)
        if (
            headroom_without + tolerance >= future_surplus_kwh
            and headroom_with + tolerance < future_surplus_kwh
        ):
            return True

    return False


def _select_pre_peak_intervals(
    *,
    pre_peak_intervals: list[tuple[int, dict]],
    current_soc_kwh: float,
    config: EconomicChargingPlanConfig,
) -> tuple[list[int], float, float]:
    target_soc = min(
        config.hw_min_soc_kwh * 1.2,
        config.max_capacity * config.max_charge_fraction,
    )
    needed_kwh = max(0.0, target_soc - current_soc_kwh)

    available_intervals = []
    for idx, interval in pre_peak_intervals:
        if _get_interval_grid_charge_kwh(interval) > 0.0:
            continue
        price = _get_interval_price_czk(interval)
        if price is None:
            continue
        available_intervals.append((idx, price))

    available_intervals.sort(key=lambda item: item[1])

    charge_per_interval = config.charging_power_kw / 4.0
    selected_indices: list[int] = []
    total_charge = 0.0

    for idx, _price in available_intervals:
        if total_charge >= needed_kwh:
            break
        selected_indices.append(idx)
        total_charge += charge_per_interval

    return selected_indices, min(total_charge, needed_kwh), charge_per_interval


def _build_extra_charge_by_index(
    *,
    selected_indices: list[int],
    actual_charge_kwh: float,
    charge_per_interval: float,
) -> dict[int, float]:
    remaining_charge = actual_charge_kwh
    charge_map: dict[int, float] = {}

    for idx in selected_indices:
        if remaining_charge <= 0.0:
            break
        planned_charge = min(charge_per_interval, remaining_charge)
        charge_map[idx] = planned_charge
        remaining_charge -= planned_charge

    return charge_map


def should_pre_charge_for_peak_avoidance(
    config: EconomicChargingPlanConfig,
    flags: RolloutFlags,
    intervals: list[dict],
    current_hour: int,
    current_soc_kwh: float,
) -> PrePeakDecision:
    """Decide whether to pre-charge before morning peak hours.

    This function implements the morning peak avoidance logic that prevents
    expensive charging during peak hours (typically 06:00-08:00) by pre-charging
    during cheaper pre-peak hours.

    Args:
        config: EconomicChargingPlanConfig with peak parameters
        flags: RolloutFlags for feature toggles
        intervals: List of interval dicts with timestamps, prices, SOC
        current_hour: Current hour (0-23)
        current_soc_kwh: Current battery SOC in kWh

    Returns:
        PrePeakDecision with charging recommendation and details
    """
    # Step 1: Feature flag check
    if not flags.enable_pre_peak_charging:
        return PrePeakDecision(
            should_charge=False,
            reason="flag_disabled",
            soc_at_peak_start_kwh=current_soc_kwh,
            cheapest_intervals=[],
            expected_charge_kwh=0.0,
            estimated_saving_czk=0.0,
            peak_avg_price=0.0,
            pre_peak_avg_price=0.0,
        )

    # Step 2: Time window validation - check if too close to peak
    # intervals_to_peak = (peak_start_hour - current_hour) * 4
    # If <= 4 intervals, too close to peak
    intervals_to_peak = (config.peak_start_hour - current_hour) * 4
    if intervals_to_peak <= 4:
        return PrePeakDecision(
            should_charge=False,
            reason="too_close_to_peak",
            soc_at_peak_start_kwh=current_soc_kwh,
            cheapest_intervals=[],
            expected_charge_kwh=0.0,
            estimated_saving_czk=0.0,
            peak_avg_price=0.0,
            pre_peak_avg_price=0.0,
        )

    # Step 3: Identify peak intervals
    peak_intervals = []
    for i, interval in enumerate(intervals):
        hour = _get_hour_from_interval(interval)
        if config.peak_start_hour <= hour < config.peak_end_hour:
            peak_intervals.append((i, interval))

    if not peak_intervals:
        return PrePeakDecision(
            should_charge=False,
            reason="no_peak_intervals",
            soc_at_peak_start_kwh=current_soc_kwh,
            cheapest_intervals=[],
            expected_charge_kwh=0.0,
            estimated_saving_czk=0.0,
            peak_avg_price=0.0,
            pre_peak_avg_price=0.0,
        )

    # Step 4: Identify pre-peak intervals
    pre_peak_start_hour = config.peak_start_hour - config.pre_peak_window_hours
    pre_peak_intervals = []
    for i, interval in enumerate(intervals):
        hour = _get_hour_from_interval(interval)
        if pre_peak_start_hour <= hour < config.peak_start_hour:
            pre_peak_intervals.append((i, interval))

    if not pre_peak_intervals:
        return PrePeakDecision(
            should_charge=False,
            reason="no_pre_peak_intervals",
            soc_at_peak_start_kwh=current_soc_kwh,
            cheapest_intervals=[],
            expected_charge_kwh=0.0,
            estimated_saving_czk=0.0,
            peak_avg_price=0.0,
            pre_peak_avg_price=0.0,
        )

    # Step 5: PV-first check
    total_solar_kwh = sum(_get_interval_solar_kwh(interval) for _, interval in pre_peak_intervals)
    if total_solar_kwh >= 0.5 and flags.pv_first_policy_enabled:
        return PrePeakDecision(
            should_charge=False,
            reason="pv_first_deferred",
            soc_at_peak_start_kwh=current_soc_kwh,
            cheapest_intervals=[],
            expected_charge_kwh=0.0,
            estimated_saving_czk=0.0,
            peak_avg_price=0.0,
            pre_peak_avg_price=0.0,
        )

    peak_start_idx = peak_intervals[0][0]
    soc_at_peak_start, _ = _project_soc_until_index(
        current_soc_kwh=current_soc_kwh,
        intervals=intervals,
        end_idx_exclusive=peak_start_idx,
        round_trip_efficiency=config.round_trip_efficiency,
        max_capacity_kwh=config.max_capacity,
    )

    # Step 6 & 7: SOC sufficient check
    soc_threshold = config.hw_min_soc_kwh * 1.1
    if soc_at_peak_start >= soc_threshold:
        return PrePeakDecision(
            should_charge=False,
            reason="soc_sufficient",
            soc_at_peak_start_kwh=soc_at_peak_start,
            cheapest_intervals=[],
            expected_charge_kwh=0.0,
            estimated_saving_czk=0.0,
            peak_avg_price=0.0,
            pre_peak_avg_price=0.0,
        )

    # Step 8: Economic calculation with round-trip efficiency
    peak_prices = [i["spot_price_czk"] for _, i in peak_intervals if "spot_price_czk" in i]
    pre_peak_prices = [i["spot_price_czk"] for _, i in pre_peak_intervals if "spot_price_czk" in i]

    if not peak_prices or not pre_peak_prices:
        return PrePeakDecision(
            should_charge=False,
            reason="no_price_data",
            soc_at_peak_start_kwh=current_soc_kwh,
            cheapest_intervals=[],
            expected_charge_kwh=0.0,
            estimated_saving_czk=0.0,
            peak_avg_price=0.0,
            pre_peak_avg_price=0.0,
        )

    peak_avg = sum(peak_prices) / len(peak_prices)
    pre_peak_avg = sum(pre_peak_prices) / len(pre_peak_prices)

    selected_indices, actual_charge_kwh, charge_per_interval = _select_pre_peak_intervals(
        pre_peak_intervals=pre_peak_intervals,
        current_soc_kwh=current_soc_kwh,
        config=config,
    )
    extra_charge_by_index = _build_extra_charge_by_index(
        selected_indices=selected_indices,
        actual_charge_kwh=actual_charge_kwh,
        charge_per_interval=charge_per_interval,
    )
    peak_end_idx = peak_intervals[-1][0]

    projected_soc_after_peak = _estimate_soc_after_peak_window(
        current_soc_kwh=current_soc_kwh,
        intervals=intervals,
        peak_end_idx=peak_end_idx,
        round_trip_efficiency=config.round_trip_efficiency,
        max_capacity_kwh=config.max_capacity,
    )
    future_soc_without_charge, min_soc_without_charge = _project_soc_until_index(
        current_soc_kwh=current_soc_kwh,
        intervals=intervals,
        end_idx_exclusive=peak_end_idx + 1,
        round_trip_efficiency=config.round_trip_efficiency,
        max_capacity_kwh=config.max_capacity,
    )
    survives_peak_without_precharge = min_soc_without_charge >= config.hw_min_soc_kwh

    cheapest_future_idx, cheapest_future_price = _find_cheapest_future_interval(
        intervals,
        start_idx=peak_end_idx + 1,
    )
    if (
        survives_peak_without_precharge
        and actual_charge_kwh > 0.0
        and _has_future_negative_price_headroom_risk(
            intervals,
            start_idx=peak_end_idx + 1,
            current_soc_kwh=current_soc_kwh,
            round_trip_efficiency=config.round_trip_efficiency,
            max_capacity_kwh=config.max_capacity,
            hw_min_soc_kwh=config.hw_min_soc_kwh,
            extra_charge_by_index=extra_charge_by_index,
        )
    ):
        return PrePeakDecision(
            should_charge=False,
            reason="future_negative_price_headroom",
            soc_at_peak_start_kwh=soc_at_peak_start,
            cheapest_intervals=[],
            expected_charge_kwh=0.0,
            estimated_saving_czk=0.0,
            peak_avg_price=peak_avg,
            pre_peak_avg_price=pre_peak_avg,
        )

    if (
        cheapest_future_idx is not None
        and actual_charge_kwh > 0.0
        and cheapest_future_price is not None
        and cheapest_future_price < pre_peak_avg
        and _project_soc_until_index(
            current_soc_kwh=current_soc_kwh,
            intervals=intervals,
            end_idx_exclusive=cheapest_future_idx,
            round_trip_efficiency=config.round_trip_efficiency,
            max_capacity_kwh=config.max_capacity,
        )[1] >= config.hw_min_soc_kwh
    ):
        return PrePeakDecision(
            should_charge=False,
            reason="cheaper_post_peak_available",
            soc_at_peak_start_kwh=soc_at_peak_start,
            cheapest_intervals=[],
            expected_charge_kwh=0.0,
            estimated_saving_czk=0.0,
            peak_avg_price=peak_avg,
            pre_peak_avg_price=pre_peak_avg,
        )

    # Breakeven calculation with round-trip efficiency
    breakeven = pre_peak_avg / config.round_trip_efficiency
    if peak_avg < breakeven * config.peak_price_ratio_threshold:
        return PrePeakDecision(
            should_charge=False,
            reason="not_economical",
            soc_at_peak_start_kwh=current_soc_kwh,
            cheapest_intervals=[],
            expected_charge_kwh=0.0,
            estimated_saving_czk=0.0,
            peak_avg_price=peak_avg,
            pre_peak_avg_price=pre_peak_avg,
        )

    # Step 10: Return positive decision
    estimated_saving = (peak_avg - pre_peak_avg / config.round_trip_efficiency) * actual_charge_kwh

    return PrePeakDecision(
        should_charge=True,
        reason="economical_pre_peak",
        soc_at_peak_start_kwh=current_soc_kwh + actual_charge_kwh,
        cheapest_intervals=selected_indices,
        expected_charge_kwh=actual_charge_kwh,
        estimated_saving_czk=estimated_saving,
        peak_avg_price=peak_avg,
        pre_peak_avg_price=pre_peak_avg,
    )
