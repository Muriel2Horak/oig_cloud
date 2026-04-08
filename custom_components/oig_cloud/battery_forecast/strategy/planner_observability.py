"""Planner observability for UPS interval decision tracking.

This module provides structured payload capture for planner decisions,
enabling debugging and comparison of UPS add/extend/block decisions.

IMPORTABLE WITHOUT RUNTIME DEPENDENCIES:
No HA imports, no coordinator imports, no config references at module load time.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class UPSDecisionReason(Enum):
    """Reason codes for UPS interval decisions.

    These capture why a UPS interval was added, extended, or blocked.
    """
    # Add reasons
    RECOVERY_BELOW_PLANNING_MIN = "recovery_below_planning_min"
    REPAIR_PLANNING_MIN_VIOLATION = "repair_planning_min_violation"
    REACH_TARGET_SOC = "reach_target_soc"
    NEGATIVE_PRICE_CHARGE = "negative_price_charge"
    ECONOMIC_CHARGE_CHEAPER_FUTURE = "economic_charge_cheaper_future"
    COST_AWARE_OVERRIDE = "cost_aware_override"
    HW_MIN_HOLD_LIMIT = "hw_min_hold_limit"
    PRICE_BAND_EXTENSION = "price_band_extension"
    BALANCING_PLAN = "balancing_plan"

    # Block reasons
    BLOCKED_BY_BALANCING = "blocked_by_balancing"
    PRICE_EXCEEDS_MAX = "price_exceeds_max"
    FUTURE_SOLAR_WILL_FILL = "future_solar_will_fill"
    WOULD_WASTE_HEADROOM = "would_waste_headroom"

    # Extend reasons
    PRICE_BAND_CONTINUATION = "price_band_continuation"
    GAP_FILL = "gap_fill"

    # Default
    UNKNOWN = "unknown"


class UPSDecisionAction(Enum):
    """Action taken for a UPS interval decision."""
    ADD = "add"
    EXTEND = "extend"
    BLOCK = "block"
    SKIP = "skip"


@dataclass
class UPSIntervalDecision:
    """Structured payload for a single UPS interval decision.

    Captures the complete context for why a UPS interval was added,
    extended, blocked, or skipped at a specific interval.

    Attributes:
        interval_idx: The interval index this decision applies to
        action: The action taken (add/extend/block/skip)
        reason: The reason code for the decision
        price_czk: Price at this interval in CZK/kWh
        battery_soc_kwh: Battery SOC at start of interval
        target_soc_kwh: Target SOC for planning
        planning_min_kwh: Planning minimum SOC
        max_soc_kwh: Maximum battery capacity

        # Solar fill analysis
        future_solar_fill: Whether future solar would reach target
        solar_forecast_sum_kwh: Sum of solar forecast from this interval
        consumption_forecast_sum_kwh: Sum of consumption forecast from this interval
        projected_final_soc_kwh: Projected final SOC without grid charging

        # Headroom analysis
        preserved_headroom_kwh: Headroom preserved by not charging
        headroom_utilization_pct: Percentage of headroom that would be used

        # Cost analysis
        export_or_curtailment_penalty_czk: Estimated cost of not charging
        charge_cost_czk: Cost to charge at this interval
        savings_vs_later_czk: Savings vs charging at cheapest future interval

        # Context
        cheapest_future_price_czk: Cheapest price in survival window
        survival_end_idx: End of survival window index
        blocked_by_indices: Set of indices blocking this interval
        extension_of_idx: If extended, the original interval index

        # Metadata
        timestamp: ISO timestamp of decision
        source_function: Function that made the decision
    """
    interval_idx: int
    action: UPSDecisionAction
    reason: UPSDecisionReason
    price_czk: float
    battery_soc_kwh: float
    target_soc_kwh: float
    planning_min_kwh: float
    max_soc_kwh: float

    # Solar fill analysis
    future_solar_fill: bool = False
    solar_forecast_sum_kwh: float = 0.0
    consumption_forecast_sum_kwh: float = 0.0
    projected_final_soc_kwh: Optional[float] = None

    # Headroom analysis
    preserved_headroom_kwh: float = 0.0
    headroom_utilization_pct: float = 0.0

    # Cost analysis
    export_or_curtailment_penalty_czk: float = 0.0
    charge_cost_czk: float = 0.0
    savings_vs_later_czk: Optional[float] = None

    # Context
    cheapest_future_price_czk: Optional[float] = None
    survival_end_idx: Optional[int] = None
    blocked_by_indices: set[int] = field(default_factory=set)
    extension_of_idx: Optional[int] = None

    # Metadata
    timestamp: Optional[str] = None
    source_function: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert decision to dictionary for serialization."""
        return {
            "interval_idx": self.interval_idx,
            "action": self.action.value,
            "reason": self.reason.value,
            "price_czk": self.price_czk,
            "battery_soc_kwh": self.battery_soc_kwh,
            "target_soc_kwh": self.target_soc_kwh,
            "planning_min_kwh": self.planning_min_kwh,
            "max_soc_kwh": self.max_soc_kwh,
            "future_solar_fill": self.future_solar_fill,
            "solar_forecast_sum_kwh": self.solar_forecast_sum_kwh,
            "consumption_forecast_sum_kwh": self.consumption_forecast_sum_kwh,
            "projected_final_soc_kwh": self.projected_final_soc_kwh,
            "preserved_headroom_kwh": self.preserved_headroom_kwh,
            "headroom_utilization_pct": self.headroom_utilization_pct,
            "export_or_curtailment_penalty_czk": self.export_or_curtailment_penalty_czk,
            "charge_cost_czk": self.charge_cost_czk,
            "savings_vs_later_czk": self.savings_vs_later_czk,
            "cheapest_future_price_czk": self.cheapest_future_price_czk,
            "survival_end_idx": self.survival_end_idx,
            "blocked_by_indices": list(self.blocked_by_indices),
            "extension_of_idx": self.extension_of_idx,
            "timestamp": self.timestamp,
            "source_function": self.source_function,
        }


@dataclass
class PlannerDecisionLog:
    """Collection of UPS interval decisions for a planning cycle.

    Tracks all decisions made during a single planning run,
    enabling post-hoc analysis and comparison.
    """
    decisions: List[UPSIntervalDecision] = field(default_factory=list)
    planning_cycle_id: Optional[str] = None
    initial_soc_kwh: Optional[float] = None
    target_soc_kwh: Optional[float] = None
    timestamp: Optional[str] = None

    def add_decision(self, decision: UPSIntervalDecision) -> None:
        """Add a decision to the log."""
        self.decisions.append(decision)

    def get_decisions_by_action(
        self, action: UPSDecisionAction
    ) -> List[UPSIntervalDecision]:
        """Get all decisions with a specific action."""
        return [d for d in self.decisions if d.action == action]

    def get_decisions_by_reason(
        self, reason: UPSDecisionReason
    ) -> List[UPSIntervalDecision]:
        """Get all decisions with a specific reason."""
        return [d for d in self.decisions if d.reason == reason]

    def get_decision_for_interval(
        self, interval_idx: int
    ) -> Optional[UPSIntervalDecision]:
        """Get the decision for a specific interval."""
        for d in self.decisions:
            if d.interval_idx == interval_idx:
                return d
        return None

    def get_solar_fill_blocked_decisions(self) -> List[UPSIntervalDecision]:
        """Get decisions blocked due to future solar fill."""
        return [
            d
            for d in self.decisions
            if d.reason == UPSDecisionReason.FUTURE_SOLAR_WILL_FILL
        ]

    def to_dict(self) -> Dict[str, Any]:
        """Convert decision log to dictionary for serialization."""
        return {
            "planning_cycle_id": self.planning_cycle_id,
            "initial_soc_kwh": self.initial_soc_kwh,
            "target_soc_kwh": self.target_soc_kwh,
            "timestamp": self.timestamp,
            "decisions": [d.to_dict() for d in self.decisions],
        }


def create_ups_decision(
    interval_idx: int,
    action: UPSDecisionAction,
    reason: UPSDecisionReason,
    *,
    price_czk: float,
    battery_soc_kwh: float,
    target_soc_kwh: float,
    planning_min_kwh: float,
    max_soc_kwh: float,
    future_solar_fill: bool = False,
    solar_forecast_sum_kwh: float = 0.0,
    consumption_forecast_sum_kwh: float = 0.0,
    projected_final_soc_kwh: Optional[float] = None,
    preserved_headroom_kwh: float = 0.0,
    headroom_utilization_pct: float = 0.0,
    export_or_curtailment_penalty_czk: float = 0.0,
    charge_cost_czk: float = 0.0,
    savings_vs_later_czk: Optional[float] = None,
    cheapest_future_price_czk: Optional[float] = None,
    survival_end_idx: Optional[int] = None,
    blocked_by_indices: Optional[set[int]] = None,
    extension_of_idx: Optional[int] = None,
    timestamp: Optional[str] = None,
    source_function: Optional[str] = None,
) -> UPSIntervalDecision:
    """Factory function to create a UPSIntervalDecision.

    Provides a convenient way to create decisions with all required fields.
    """
    return UPSIntervalDecision(
        interval_idx=interval_idx,
        action=action,
        reason=reason,
        price_czk=price_czk,
        battery_soc_kwh=battery_soc_kwh,
        target_soc_kwh=target_soc_kwh,
        planning_min_kwh=planning_min_kwh,
        max_soc_kwh=max_soc_kwh,
        future_solar_fill=future_solar_fill,
        solar_forecast_sum_kwh=solar_forecast_sum_kwh,
        consumption_forecast_sum_kwh=consumption_forecast_sum_kwh,
        projected_final_soc_kwh=projected_final_soc_kwh,
        preserved_headroom_kwh=preserved_headroom_kwh,
        headroom_utilization_pct=headroom_utilization_pct,
        export_or_curtailment_penalty_czk=export_or_curtailment_penalty_czk,
        charge_cost_czk=charge_cost_czk,
        savings_vs_later_czk=savings_vs_later_czk,
        cheapest_future_price_czk=cheapest_future_price_czk,
        survival_end_idx=survival_end_idx,
        blocked_by_indices=blocked_by_indices or set(),
        extension_of_idx=extension_of_idx,
        timestamp=timestamp,
        source_function=source_function,
    )


def format_decision_summary(decision: UPSIntervalDecision) -> str:
    """Format a single decision as a human-readable summary."""
    lines = [
        f"Interval {decision.interval_idx}: {decision.action.value.upper()}",
        f"  Reason: {decision.reason.value}",
        f"  Price: {decision.price_czk:.3f} CZK/kWh",
        f"  SOC: {decision.battery_soc_kwh:.2f}/{decision.target_soc_kwh:.2f} kWh "
        f"(target, min={decision.planning_min_kwh:.2f})",
    ]

    if decision.future_solar_fill:
        lines.append("  Future solar WILL reach target")
        if decision.projected_final_soc_kwh is not None:
            lines.append(f"  Projected final SOC: {decision.projected_final_soc_kwh:.2f} kWh")

    if decision.preserved_headroom_kwh > 0:
        lines.append(
            f"  Preserved headroom: {decision.preserved_headroom_kwh:.2f} kWh "
            f"({decision.headroom_utilization_pct:.1%})"
        )

    if decision.export_or_curtailment_penalty_czk > 0:
        lines.append(
            f"  Export/curtailment penalty: {decision.export_or_curtailment_penalty_czk:.3f} CZK"
        )

    if decision.savings_vs_later_czk is not None:
        lines.append(f"  Savings vs later: {decision.savings_vs_later_czk:.3f} CZK")

    if decision.cheapest_future_price_czk is not None:
        lines.append(f"  Cheapest future price: {decision.cheapest_future_price_czk:.3f} CZK")

    return "\n".join(lines)


def format_decision_log_summary(log: PlannerDecisionLog) -> str:
    """Format a complete decision log as a human-readable summary."""
    lines = [
        "=== Planner Decision Log ===",
        f"Cycle ID: {log.planning_cycle_id or 'unknown'}",
        f"Initial SOC: {log.initial_soc_kwh:.2f} kWh" if log.initial_soc_kwh else "Initial SOC: unknown",
        f"Target SOC: {log.target_soc_kwh:.2f} kWh" if log.target_soc_kwh else "Target SOC: unknown",
        f"Total decisions: {len(log.decisions)}",
        "",
        "Decisions by action:",
    ]

    for action in UPSDecisionAction:
        count = len(log.get_decisions_by_action(action))
        if count > 0:
            lines.append(f"  {action.value}: {count}")

    lines.extend(["", "Decisions by reason:"])
    for reason in UPSDecisionReason:
        count = len(log.get_decisions_by_reason(reason))
        if count > 0:
            lines.append(f"  {reason.value}: {count}")

    solar_blocked = log.get_solar_fill_blocked_decisions()
    if solar_blocked:
        lines.extend([
            "",
            f"Solar-fill blocked decisions ({len(solar_blocked)}):",
        ])
        for d in solar_blocked[:5]:  # Show first 5
            lines.append(f"  Interval {d.interval_idx}: price={d.price_czk:.3f}")
        if len(solar_blocked) > 5:
            lines.append(f"  ... and {len(solar_blocked) - 5} more")

    lines.append("=" * 30)

    return "\n".join(lines)


# =============================================================================
# UPS INTERVAL DECISION INSERTION POINTS MAP
# =============================================================================
# This section documents where UPS interval decisions are made in the planner
# and provides guidance for instrumenting each decision point.
#
# The insertion points are organized by function and decision type (ADD/EXTEND/BLOCK).
#
# INSERTION POINT 1: _build_add_ups_interval (lines ~188-217)
# -----------------------------------------------------------------------------
# Location: custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py
# Function: _build_add_ups_interval() -> returns add_ups_interval closure
#
# Decision Types: ADD
# - Primary UPS interval addition point
# - Called from: _run_recovery, _repair_iteration, _reach_target_soc,
#                _apply_economic_charging, _apply_cost_aware_override,
#                _apply_hw_min_hold_limit, _force_target_before_index
#
# Payload Context Available:
# - idx: interval index being added
# - max_price: price cap for this addition
# - prices[idx]: actual price at interval
# - blocked_indices: set of blocked intervals
# - strategy.config.max_ups_price_czk: global price cap
# - strategy.config.min_ups_duration_intervals: minimum duration
#
# Recommended Payload Fields:
# - interval_idx, action=ADD, reason=<caller_specific>
# - price_czk=prices[idx], battery_soc_kwh=<from trajectory>
# - target_soc_kwh=strategy._target
# - planning_min_kwh=strategy._planning_min
# - max_soc_kwh=strategy._max
#
# INSERTION POINT 2: _determine_mode_for_interval (lines ~757-807)
# -----------------------------------------------------------------------------
# Location: custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py
# Function: _determine_mode_for_interval(idx, battery, ctx)
#
# Decision Types: ADD, BLOCK, SKIP
# - Per-interval mode decision during economic charging phase
# - This is the most detailed decision point with full context
#
# Decision Logic Flow:
# 1. BLOCK: if idx in ctx.blocked_indices -> return CBB_MODE_HOME_I
# 2. BLOCK: if idx in ctx.charging_intervals -> return CBB_MODE_HOME_UPS (already added)
# 3. BLOCK: if price > ctx.max_price + 0.0001 -> return CBB_MODE_HOME_I
# 4. BLOCK: if _would_future_solar_reach_target(...) -> return CBB_MODE_HOME_I
#    - This is the CRITICAL solar-fill check
#    - Payload should capture: future_solar_fill=True
# 5. ADD: if _should_charge_now(...) -> ctx.add_ups_interval(idx) -> return CBB_MODE_HOME_UPS
# 6. SKIP: otherwise -> return CBB_MODE_HOME_I
#
# Payload Context Available (via ctx: _ModeDecisionContext):
# - strategy, charging_intervals, blocked_indices, prices
# - max_price, solar_forecast, consumption_forecast
# - n, eps_kwh, round_trip_eff, hysteresis
# - add_ups_interval: callable to add interval
#
# Additional Context Computed:
# - survival_end: from _estimate_survival_end()
# - min_future: from _find_min_future_price()
# - battery: current battery SOC at interval start
#
# Recommended Payload Fields:
# - interval_idx, action=<ADD/BLOCK/SKIP>, reason=<specific>
# - price_czk=prices[idx], battery_soc_kwh=battery
# - target_soc_kwh=strategy._target, planning_min_kwh=strategy._planning_min
# - future_solar_fill=<from _would_future_solar_reach_target>
# - cheapest_future_price_czk=min_future, survival_end_idx=survival_end
# - preserved_headroom_kwh=<compute from trajectory>
#
# INSERTION POINT 3: _add_negative_price_intervals (lines ~297-356)
# -----------------------------------------------------------------------------
# Location: custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py
# Function: _add_negative_price_intervals(...)
#
# Decision Types: ADD, BLOCK (solar-fill skip)
# - Seeds charging intervals for negative price periods
# - Special handling: skips if _would_future_solar_reach_target returns True
#
# Decision Logic:
# - For each negative_price_intervals:
#   - if _would_future_solar_reach_target(...): continue (BLOCK)
#   - else: charging_intervals.add(idx) (ADD)
#
# Recommended Payload Fields:
# - interval_idx, action=<ADD/BLOCK>, reason=<NEGATIVE_PRICE_CHARGE/FUTURE_SOLAR_WILL_FILL>
# - price_czk=prices[idx], battery_soc_kwh=<computed>
# - future_solar_fill=<result of _would_future_solar_reach_target>
#
# INSERTION POINT 4: extend_ups_blocks_by_price_band (lines ~1202-1253)
# -----------------------------------------------------------------------------
# Location: custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py
# Function: extend_ups_blocks_by_price_band(...)
#
# Decision Types: EXTEND
# - Extends UPS blocks forward when prices stay within efficiency band
# - Uses _extend_forward and _fill_single_gaps helpers
#
# Decision Logic:
# - _extend_forward: extends contiguous UPS blocks
# - _fill_single_gaps: fills single-interval gaps
#
# Recommended Payload Fields:
# - interval_idx, action=EXTEND, reason=<PRICE_BAND_CONTINUATION/GAP_FILL>
# - price_czk=prices[idx], extension_of_idx=<original interval>
#
# INSERTION POINT 5: _run_recovery (lines ~421-468)
# -----------------------------------------------------------------------------
# Location: custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py
# Function: _run_recovery(...)
#
# Decision Types: ADD
# - Recovery mode: battery below planning minimum at start
# - Adds UPS intervals until planning minimum is reached
#
# Decision Logic:
# - For each interval until recovery:
#   - add_ups_interval(i, max_price=float("inf")) (ADD with infinite price cap)
#
# Recommended Payload Fields:
# - interval_idx, action=ADD, reason=RECOVERY_BELOW_PLANNING_MIN
# - price_czk=prices[i], battery_soc_kwh=<current SOC>
#
# INSERTION POINT 6: _repair_iteration (lines ~507-556)
# -----------------------------------------------------------------------------
# Location: custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py
# Function: _repair_iteration(...)
#
# Decision Types: ADD
# - Repairs planning minimum violations by adding cheapest candidate intervals
#
# Decision Logic:
# - Find violation_idx where battery < planning_min
# - Pick cheapest candidate before violation
# - add_ups_interval(candidate) (ADD)
#
# Recommended Payload Fields:
# - interval_idx=candidate, action=ADD, reason=REPAIR_PLANNING_MIN_VIOLATION
# - price_czk=prices[candidate], battery_soc_kwh=<at violation>
#
# INSERTION POINT 7: _reach_target_soc (lines ~606-674)
# -----------------------------------------------------------------------------
# Location: custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py
# Function: _reach_target_soc(...)
#
# Decision Types: ADD
# - Adds intervals to reach target SOC
#
# Decision Logic:
# - While max_soc < target:
#   - Find cheapest candidate
#   - add_ups_interval(candidate, max_price=price_cap) (ADD)
#
# Recommended Payload Fields:
# - interval_idx=candidate, action=ADD, reason=REACH_TARGET_SOC
# - price_czk=prices[candidate], battery_soc_kwh=<current>
#
# INSERTION POINT 8: _apply_cost_aware_override (lines ~930-976)
# -----------------------------------------------------------------------------
# Location: custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py
# Function: _apply_cost_aware_override(...)
#
# Decision Types: ADD
# - Allows expensive UPS when it avoids higher grid import costs
#
# Decision Logic:
# - Find cost override candidate
# - add_ups_interval(candidate, max_price=price_cap) (ADD)
#
# Recommended Payload Fields:
# - interval_idx=candidate, action=ADD, reason=COST_AWARE_OVERRIDE
# - price_czk=prices[candidate], charge_cost_czk=<computed>
#
# INSERTION POINT 9: _apply_hw_min_hold_limit (lines ~1047-1109)
# -----------------------------------------------------------------------------
# Location: custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py
# Function: _apply_hw_min_hold_limit(...)
#
# Decision Types: ADD
# - Forces target before index when holding at hw_min too long
#
# Decision Logic:
# - If holding at hw_min for too long:
#   - _force_target_before_index -> add_ups_interval(candidate, max_price=inf)
#
# Recommended Payload Fields:
# - interval_idx=candidate, action=ADD, reason=HW_MIN_HOLD_LIMIT
# - price_czk=prices[candidate], battery_soc_kwh=<at hold>
#
# =============================================================================
# INSTRUMENTATION GUIDANCE
# =============================================================================
#
# To instrument a decision point:
#
# 1. Import the observability types:
#    from .planner_observability import (
#        UPSIntervalDecision,
#        UPSDecisionAction,
#        UPSDecisionReason,
#        PlannerDecisionLog,
#        create_ups_decision,
#    )
#
# 2. Create a decision log at planning start:
#    decision_log = PlannerDecisionLog(
#        planning_cycle_id=<unique_id>,
#        initial_soc_kwh=initial_battery_kwh,
#        target_soc_kwh=strategy._target,
#    )
#
# 3. At each decision point, create and log a decision:
#    decision = create_ups_decision(
#        interval_idx=idx,
#        action=UPSDecisionAction.ADD,  # or BLOCK, EXTEND, SKIP
#        reason=UPSDecisionReason.ECONOMIC_CHARGE_CHEAPER_FUTURE,
#        price_czk=prices[idx],
#        battery_soc_kwh=battery,
#        target_soc_kwh=strategy._target,
#        planning_min_kwh=strategy._planning_min,
#        max_soc_kwh=strategy._max,
#        future_solar_fill=<computed>,
#        cheapest_future_price_czk=min_future,
#        survival_end_idx=survival_end,
#        source_function="_determine_mode_for_interval",
#    )
#    decision_log.add_decision(decision)
#
# 4. After planning, analyze the log:
#    solar_blocked = decision_log.get_solar_fill_blocked_decisions()
#    print(format_decision_log_summary(decision_log))
#
# =============================================================================
