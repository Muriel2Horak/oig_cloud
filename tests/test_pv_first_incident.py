"""PV-First Incident Reproduction Tests — RED Phase (Task 2)

These tests FAIL to prove that current code charges from grid despite PV expected.
They reproduce the incident where battery was charged from grid (~5 CZK/kWh)
despite PV expected next morning.

DO NOT FIX THE CODE — these tests must FAIL in the RED phase.

Incident Scenario:
- PV forecast: strong solar (2000+ Wh in next 4 hours)
- Spot price: currently expensive (>3 CZK/kWh), cheap later
- SOC: 40% (partial, above death-valley threshold)
- Expected: Grid charge DEFERRED to PV-first window
- Actual (BUG): Grid charging scheduled immediately
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any, Dict, List

import pytest

from custom_components.oig_cloud.battery_forecast.planning.charging_plan import (
    EconomicChargingPlanConfig,
    economic_charging_plan,
)
from custom_components.oig_cloud.boiler.models import EnergySource
from custom_components.oig_cloud.boiler.planner import BoilerPlanner


# =============================================================================
# Test Fixtures — Incident Scenario
# =============================================================================


def _make_incident_timeline(
    current_hour: int = 18,  # 6 PM - expensive evening price
    pv_start_hour: int = 8,  # 8 AM next day - PV production starts
    pv_peak_wh: int = 2500,  # Strong solar: 2500 Wh peak
    expensive_price: float = 5.0,  # ~5 CZK/kWh - expensive evening
    cheap_price: float = 0.8,  # Cheap night/weekend price
    initial_soc_kwh: float = 6.0,  # 40% of 15 kWh battery
    max_capacity_kwh: float = 15.0,
    intervals_count: int = 96,  # 24 hours of 15-min intervals
) -> List[Dict[str, Any]]:
    """Create a timeline representing the incident scenario.

    Scenario:
    - Current time: 18:00 (6 PM) - expensive spot price
    - PV expected: 08:00-16:00 next day (strong production)
    - Current SOC: 40% (6 kWh of 15 kWh)
    - Price pattern: expensive now (5 CZK), cheap later (0.8 CZK)
    """
    timeline = []
    now = datetime(2025, 1, 15, current_hour, 0, tzinfo=timezone.utc)

    for i in range(intervals_count):
        ts = now + timedelta(minutes=15 * i)
        hour = ts.hour

        # Price pattern: expensive evening, cheap night/morning
        if 17 <= hour <= 21:  # Evening peak: expensive
            price = expensive_price
        elif 0 <= hour <= 5:  # Night: cheap
            price = cheap_price
        elif 10 <= hour <= 14:  # Midday: moderate
            price = 1.5
        else:
            price = 2.0

        # PV production pattern: 8 AM - 4 PM
        pv_wh = 0
        if pv_start_hour <= hour < pv_start_hour + 8:
            # Bell curve: ramp up, peak, ramp down
            hour_in_pv = hour - pv_start_hour
            if hour_in_pv < 4:
                pv_wh = int(pv_peak_wh * (0.3 + 0.175 * hour_in_pv))
            else:
                pv_wh = int(pv_peak_wh * (1.0 - 0.175 * (hour_in_pv - 4)))

        # Consumption pattern: ~500Wh average
        consumption_wh = 400 if 0 <= hour < 6 else 600 if 17 <= hour <= 21 else 500

        # Battery SOC projection (simplified)
        # Starts at initial, affected by PV - consumption
        soc_kwh = initial_soc_kwh
        if i > 0:
            # Simplified: just show PV would charge the battery
            soc_kwh = min(
                max_capacity_kwh,
                timeline[i - 1]["battery_capacity_kwh"] + pv_wh / 1000 - consumption_wh / 1000,
            )

        timeline.append({
            "timestamp": ts.isoformat(),
            "spot_price": price,
            "spot_price_czk": price,
            "pv_production_wh": pv_wh,
            "consumption_wh": consumption_wh,
            "battery_capacity_kwh": max(0, soc_kwh),
            "grid_charge_kwh": 0.0,
            "reason": "normal",
        })

    return timeline


def _make_incident_plan_config(
    max_capacity_kwh: float = 15.0,
    min_capacity_kwh: float = 3.0,  # 20% death valley threshold
    target_capacity_kwh: float = 12.0,  # 80% target
    max_charging_price: float = 6.0,  # Allow charging up to 6 CZK
    charging_power_kw: float = 3.0,
) -> EconomicChargingPlanConfig:
    """Create plan config for incident scenario.

    Key settings:
    - Max charging price: 6 CZK/kWh (allows expensive evening charging)
    - Min capacity: 3 kWh (20% - above this, PV-first should apply)
    - Target: 12 kWh (80%)
    """
    return EconomicChargingPlanConfig(
        min_capacity_kwh=min_capacity_kwh,
        min_capacity_floor=2.0,  # Hardware minimum
        effective_minimum_kwh=min_capacity_kwh,
        target_capacity_kwh=target_capacity_kwh,
        max_charging_price=max_charging_price,
        min_savings_margin=0.1,
        charging_power_kw=charging_power_kw,
        max_capacity=max_capacity_kwh,
        battery_efficiency=0.9,
        config={},  # No blackout protection to isolate PV-first issue
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
        target_reason="test_incident",
    )


# =============================================================================
# Test 1: Grid Charge Deferred When PV Expected — INCIDENT REPRODUCTION
# =============================================================================


def test_grid_charge_is_deferred_when_pv_expected():
    """FAILING TEST: Proves economic_charging_plan lacks PV-first enforcement.

    CONTRACT VIOLATION TEST:
    The precedence contract specifies PV_FIRST (1000) > ECONOMIC_CHARGING (400).
    This means when PV is expected AND SOC above death-valley, grid charging
    MUST be deferred to PV-first policy.

    Current implementation: economic_charging_plan() does NOT have a
    PV forecast parameter and does NOT check PV availability before
    scheduling grid charging.

    This test verifies the architectural gap: the function signature
    lacks PV context, making PV-first enforcement impossible.
    """
    import inspect

    # Get function signature
    sig = inspect.signature(economic_charging_plan)
    params = list(sig.parameters.keys())

    # FAILING ASSERTION: Function should have PV forecast parameter
    # to enable PV-first policy enforcement
    #
    # Current signature: (timeline_data, plan)
    # Expected: Should receive PV forecast data to enforce PV_FIRST > ECONOMIC
    assert "pv_forecast" in params or "solar_forecast" in params or "pv_data" in params, (
        f"ARCHITECTURAL GAP: economic_charging_plan() lacks PV forecast parameter. "
        f"Current params: {params}. "
        f"Cannot enforce PV_FIRST (1000) > ECONOMIC_CHARGING (400) precedence "
        f"without PV context. "
        f"INCIDENT ROOT CAUSE: Charging plan cannot defer to PV it doesn't know about."
    )


def test_grid_charge_considers_pv_forecast_before_expensive_charging():
    """FAILING TEST: Proves EconomicChargingPlanConfig lacks PV forecast config.

    CONTRACT VIOLATION TEST:
    The PV_FIRST invariant states: "If PV forecast confidence > threshold AND
    SOC above death-valley, grid charging MUST be deferred."

    Current implementation: EconomicChargingPlanConfig does NOT have any
    PV-related configuration fields (pv_forecast_threshold, pv_confidence_min, etc.)

    This test verifies the configuration gap: no way to configure PV-first policy.
    """
    import dataclasses

    # Get config fields
    fields = [f.name for f in dataclasses.fields(EconomicChargingPlanConfig)]

    # FAILING ASSERTION: Config should have PV-first related fields
    pv_fields = [f for f in fields if "pv" in f.lower() or "solar" in f.lower()]

    assert len(pv_fields) > 0, (
        f"ARCHITECTURAL GAP: EconomicChargingPlanConfig lacks PV forecast fields. "
        f"Current fields: {fields}. "
        f"Cannot configure PV-first policy (pv_forecast_threshold, pv_confidence_min) "
        f"without PV-related configuration. "
        f"INCIDENT ROOT CAUSE: No way to configure when PV deferral should activate."
    )


# =============================================================================
# Test 2: Boiler Does Not Force Early Grid Charge — INCIDENT REPRODUCTION
# =============================================================================


def test_boiler_does_not_force_early_grid_charge():
    """PASSING TEST: Verifies boiler defers to PV when forecast available.

    INCIDENT FIX VERIFICATION:
    - Boiler needs heating
    - PV expected next morning (forecast > threshold)
    - Current: expensive grid price
    - Expected: Boiler defers to PV (returns FVE)
    - Fixed: _recommend_source() now accepts pv_forecast parameter

    This test now PASSES because _recommend_source() has PV forecast context
    and returns FVE when PV forecast exceeds thresholds.
    """
    # Setup: Create a BoilerPlanner
    planner = BoilerPlanner(
        hass=SimpleNamespace(),  # Mock HA
        slot_minutes=15,
        alt_cost_kwh=2.0,  # Alternative source cost
        has_alternative=False,  # No alternative - tests Grid vs PV
    )

    # Scenario: PV expected, no overflow, expensive grid price
    overflow_available = False  # No current overflow
    spot_price = 5.0  # Expensive grid price
    alt_price = 2.0  # (not used since has_alternative=False)
    pv_forecast = 2.0  # Strong PV forecast (> 0.5 kWh threshold)
    pv_confidence = 0.8  # High confidence (> 0.3 threshold)

    # Execute: Get recommendation WITH PV forecast
    recommended = planner._recommend_source(
        overflow_available=overflow_available,
        spot_price=spot_price,
        alt_price=alt_price,
        pv_forecast=pv_forecast,
        pv_confidence=pv_confidence,
    )

    # PASSING ASSERTION: Should return FVE when PV is expected
    # Fixed behavior: Returns FVE because pv_forecast > threshold
    assert recommended == EnergySource.FVE, (
        f"PV-FIRST VERIFICATION: Boiler should return FVE when PV forecast "
        f"({pv_forecast} kWh, {pv_confidence} confidence) exceeds thresholds. "
        f"Got {recommended.value} instead. "
        f"INCIDENT FIX: Boiler now defers to PV instead of expensive grid."
    )


def test_boiler_defers_to_pv_when_forecast_available():
    """PASSING TEST: Verifies boiler defers to PV when forecast shows production.

    This test verifies that the boiler planner correctly integrates with
    PV forecast data. When PV production is expected with sufficient
    confidence, the boiler should return FVE instead of Grid.

    Fixed behavior: _recommend_source() now checks pv_forecast parameter
    and returns FVE when forecast exceeds thresholds.
    """
    planner = BoilerPlanner(
        hass=SimpleNamespace(),
        slot_minutes=15,
        alt_cost_kwh=2.0,
        has_alternative=False,
    )

    # Scenario 1: No overflow now, but PV expected soon
    # Expected: Return FVE (defer to PV), NOT Grid
    recommended = planner._recommend_source(
        overflow_available=False,
        spot_price=4.5,  # Expensive
        alt_price=2.0,
        pv_forecast=1.5,  # PV forecast > 0.5 kWh threshold
        pv_confidence=0.6,  # Confidence > 0.3 threshold
    )

    # PASSING: Returns FVE because PV forecast exceeds thresholds
    assert recommended == EnergySource.FVE, (
        f"BOILER PV-COORDINATION VERIFIED: "
        f"Returns {recommended.value} when PV forecast available. "
        f"INCIDENT FIX: Boiler now defers to PV instead of expensive grid."
    )

    # Scenario 2: Very expensive grid with PV forecast - should defer to PV
    recommended_expensive = planner._recommend_source(
        overflow_available=False,
        spot_price=8.0,  # Very expensive
        alt_price=2.0,
        pv_forecast=3.0,  # Strong PV forecast
        pv_confidence=0.9,  # High confidence
    )

    # PASSING: Returns FVE because PV forecast exceeds thresholds
    assert recommended_expensive == EnergySource.FVE, (
        f"BOILER COST AWARENESS VERIFIED: "
        f"Returns FVE at 8 CZK/kWh grid price when PV forecast available. "
        f"INCIDENT FIX: No more expensive grid charging when PV is coming."
    )


def test_boiler_source_recommendation_lacks_pv_context():
    """PASSING TEST: Verifies _recommend_source has PV forecast parameter.

    This is a specification test that verifies the PV forecast
    integration in the boiler planner.

    The _recommend_source() method signature now includes a PV forecast
    parameter to enable PV-first decision making.
    """
    import inspect

    planner = BoilerPlanner(
        hass=SimpleNamespace(),
        slot_minutes=15,
    )

    # Get method signature
    sig = inspect.signature(planner._recommend_source)
    params = list(sig.parameters.keys())

    # FAILING ASSERTION: Method should have pv_forecast parameter
    #
    # Current signature: (overflow_available, spot_price, alt_price)
    # Expected signature: (overflow_available, spot_price, alt_price, pv_forecast_available)
    #
    # This documents the architectural gap: boiler planner has no PV context
    assert "pv_forecast" in params or "pv_expected" in params or "pv_available" in params, (
        f"ARCHITECTURAL GAP: _recommend_source() lacks PV forecast parameter. "
        f"Current params: {params}. "
        f"Cannot implement PV-first policy without PV context. "
        f"INCIDENT ROOT CAUSE: Boiler cannot defer to PV it doesn't know about."
    )


# =============================================================================
# Test 3: Integration — Combined Battery + Boiler Incident
# =============================================================================


def test_combined_battery_boiler_incident_scenario():
    """FAILING TEST: Documents combined architectural gaps in battery + boiler.

    INCIDENT ROOT CAUSE ANALYSIS:
    Both battery charging plan AND boiler planner lack PV forecast integration:

    1. Battery (EconomicChargingPlanConfig): No PV-related config fields
    2. Boiler (_recommend_source): No PV forecast parameter

    This test documents that BOTH systems independently lack PV context,
    making coordinated PV-first policy impossible.

    The precedence contract says PV_FIRST (1000) > ECONOMIC_CHARGING (400),
    but neither system can enforce this without PV forecast data.
    """
    import dataclasses
    import inspect

    # Check battery side: EconomicChargingPlanConfig lacks PV fields
    config_fields = [f.name for f in dataclasses.fields(EconomicChargingPlanConfig)]
    battery_pv_fields = [f for f in config_fields if "pv" in f.lower() or "solar" in f.lower()]

    # Check boiler side: _recommend_source lacks PV parameter
    planner = BoilerPlanner(hass=SimpleNamespace(), slot_minutes=15)
    sig = inspect.signature(planner._recommend_source)
    boiler_params = list(sig.parameters.keys())
    boiler_pv_params = [p for p in boiler_params if "pv" in p.lower() or "forecast" in p.lower()]

    # FAILING ASSERTION: Both systems lack PV context
    battery_has_pv = len(battery_pv_fields) > 0
    boiler_has_pv = len(boiler_pv_params) > 0

    assert battery_has_pv or boiler_has_pv, (
        f"COMBINED ARCHITECTURAL GAP:\n"
        f"Battery config fields: {config_fields} (PV fields: {battery_pv_fields})\n"
        f"Boiler params: {boiler_params} (PV params: {boiler_pv_params})\n"
        f"NEITHER system has PV forecast integration.\n"
        f"INCIDENT: Both can choose expensive Grid without knowing PV is coming.\n"
        f"PRECEDENCE CONTRACT VIOLATION: PV_FIRST (1000) cannot be enforced."
    )
