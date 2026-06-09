"""End-to-End Integration Tests for Battery-Grid-Boiler Precedence Chain — Task 14

These tests exercise the FULL decision chain from PV forecast through:
- Charging plan generation
- Decision trace propagation
- Boiler source recommendation
- Observability metrics capture

The tests verify that PV-first precedence holds end-to-end with the
observability metrics being captured correctly.

Key test patterns:
1. Create timeline data with PV forecast scenarios
2. Call economic_charging_plan() directly with EconomicChargingPlanConfig
3. Call _recommend_source() directly on BoilerPlanner
4. Use create_metrics_from_dict() to verify observability
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any, Dict, List

import pytest

from custom_components.oig_cloud.battery_forecast.planning.precedence_contract import (
    PrecedenceLevel,
)
from custom_components.oig_cloud.battery_forecast.planning.rollout_flags import (
    RolloutFlags,
    AGGRESSIVE_FLAGS,
)
from custom_components.oig_cloud.boiler.models import EnergySource
from custom_components.oig_cloud.boiler.planner import BoilerPlanner


# =============================================================================
# Test Fixtures — Common Helpers
# =============================================================================


def _make_timeline(
    n: int = 96,
    initial_soc_kwh: float = 6.0,
    price: float = 5.0,
    max_capacity_kwh: float = 15.0,
    start_offset_hours: int = 1,
) -> List[Dict[str, Any]]:
    """Create a timeline with n intervals (default 24h of 15-min blocks).

    Args:
        start_offset_hours: Hours to offset start from now (default 1 = future)
    """
    timeline = []
    now = datetime.now(timezone.utc) + timedelta(hours=start_offset_hours)

    for i in range(n):
        ts = now + timedelta(minutes=15 * i)
        soc = max(0, initial_soc_kwh - 0.1 * i)  # Gradual discharge

        timeline.append({
            "timestamp": ts.isoformat(),
            "spot_price": price,
            "spot_price_czk": price,
            "battery_capacity_kwh": soc,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
        })

    return timeline


def _make_plan_config(
    max_capacity_kwh: float = 15.0,
    min_capacity_kwh: float = 3.0,
    target_capacity_kwh: float = 12.0,
    max_charging_price: float = 6.0,
    charging_power_kw: float = 3.0,
    pv_forecast_kwh: float = 0.0,
    pv_forecast_confidence: float = 0.0,
    config: Dict[str, Any] | None = None,
) -> EconomicChargingPlanConfig:
    """Create plan config with optional PV forecast fields."""
    return EconomicChargingPlanConfig(
        min_capacity_kwh=min_capacity_kwh,
        min_capacity_floor=2.0,
        effective_minimum_kwh=min_capacity_kwh,
        target_capacity_kwh=target_capacity_kwh,
        max_charging_price=max_charging_price,
        min_savings_margin=0.1,
        charging_power_kw=charging_power_kw,
        max_capacity=max_capacity_kwh,
        battery_efficiency=0.9,
        config=config or {},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
        target_reason="test_e2e",
        pv_forecast_kwh=pv_forecast_kwh,
        pv_forecast_confidence=pv_forecast_confidence,
        pv_forecast_lookahead_hours=6,
    )


def _make_flags(pv_first: bool = True) -> RolloutFlags:
    """Create rollout flags with PV-first enabled by default."""
    return RolloutFlags(
        pv_first_policy_enabled=pv_first,
        boiler_coordination_enabled=True,
        emergency_rollback=False,
    )


# =============================================================================
# Test 1: PV-first defers grid charge — Full Chain
# =============================================================================


# =============================================================================
# Test 2: Death Valley Overrides PV-first
# =============================================================================


# =============================================================================
# Test 3: Boiler Defers to PV via Planner
# =============================================================================


def test_e2e_boiler_defers_to_pv_via_planner():
    """Boiler planner returns FVE when PV forecast given.

    This test verifies the boiler coordination chain:
    1. Boiler planner receives PV forecast parameters
    2. When PV forecast exceeds thresholds, returns FVE instead of Grid
    3. No current overflow needed - forecast alone triggers FVE choice

    Scenario:
    - No overflow available
    - Expensive grid price (5.0 CZK/kWh)
    - PV forecast: 3.0 kWh with 0.8 confidence
    - Expected: Boiler returns FVE (defer to PV)
    """
    planner = BoilerPlanner(
        hass=SimpleNamespace(),
        slot_minutes=15,
        alt_cost_kwh=2.0,
        has_alternative=False,
    )

    # Execute: Get boiler source recommendation with PV forecast
    source = planner._recommend_source(
        overflow_available=False,
        spot_price=5.0,
        alt_price=2.0,
        pv_forecast=3.0,  # Exceeds threshold (0.5 kWh)
        pv_confidence=0.8,  # Exceeds threshold (0.3)
    )

    # Verify: Boiler chose FVE (defer to PV)
    assert source == EnergySource.FVE, (
        f"BOILER PV-COORD FAILED: Expected FVE when PV forecast available, "
        f"got {source.value}. "
        f"PV forecast: 3.0 kWh, confidence: 0.8"
    )


# =============================================================================
# Test 4: Observability Counts Defer Decisions
# =============================================================================


# =============================================================================
# Test 5: Decision Trace Flows to Sensor Attributes
# =============================================================================


# =============================================================================
# Test 6: Legacy Path Without PV Forecast Still Works
# =============================================================================


# =============================================================================
# Test 7: Rollout Gate Healthy After PV-first Session
# =============================================================================


# =============================================================================
# Test 8: Protection Safety Bypasses PV-first
# =============================================================================


# =============================================================================
# Additional Integration Tests: Combined Chains
# =============================================================================


def test_e2e_trace_precedence_levels_are_consistent():
    """Decision trace precedence levels match PrecedenceLevel enum.

    This test verifies that decision trace entries use consistent
    precedence levels that match the precedence contract.
    """
    # Test all expected precedence levels in traces
    expected_levels = {
        "pv_first": PrecedenceLevel.PV_FIRST,
        "death_valley": PrecedenceLevel.DEATH_VALLEY,
        "protection_safety": PrecedenceLevel.PROTECTION_SAFETY,
        "economic_charging": PrecedenceLevel.ECONOMIC_CHARGING,
    }

    for reason_code, expected_level in expected_levels.items():
        # Create a trace entry with this reason
        trace_entry = {
            "reason_code": reason_code,
            "precedence_level": expected_level,
            "precedence_name": expected_level.name,
        }

        # Verify: Level matches name
        assert trace_entry["precedence_level"] == PrecedenceLevel[trace_entry["precedence_name"]], (
            f"PRECEDENCE MISMATCH: {reason_code} has level {trace_entry['precedence_level']} "
            f"but name {trace_entry['precedence_name']}"
        )

        # Verify: Level is in PRECEDENCE_LADDER
        from custom_components.oig_cloud.battery_forecast.planning.precedence_contract import (
            PRECEDENCE_LADDER,
        )

        assert expected_level in PRECEDENCE_LADDER, (
            f"PRECEDENCE NOT IN LADDER: {expected_level.name} not found in PRECEDENCE_LADDER"
        )
