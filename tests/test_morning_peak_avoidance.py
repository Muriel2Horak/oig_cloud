"""Morning Peak Avoidance Tests — RED Phase (Task 3)

These tests FAIL because `should_pre_charge_for_peak_avoidance` doesn't exist yet.
They test the morning peak avoidance logic that prevents expensive charging
during morning peak hours (06:00-08:00).

DO NOT FIX THE CODE — these tests must FAIL in the RED phase.
Expected failures: ImportError (function doesn't exist) or AssertionError.

Tests verify:
- SOC threshold logic (skip when sufficient)
- Economic calculations with round-trip efficiency
- PV-first overrides (defer to solar)
- Feature flag control
- Decision trace completeness
- Time window validation
- No double-charging with economic charging
- Maximum capacity constraints
- Cheapest interval selection
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

import pytest

# This import will FAIL because should_pre_charge_for_peak_avoidance doesn't exist
from custom_components.oig_cloud.battery_forecast.planning.charging_plan import (
    EconomicChargingPlanConfig,
    PrePeakDecision,
    should_pre_charge_for_peak_avoidance,  # NEEXISTUJE → ImportError
)
from custom_components.oig_cloud.battery_forecast.planning.rollout_flags import RolloutFlags


# =============================================================================
# Helper Functions
# =============================================================================


def _make_pre_peak_intervals(
    peak_start_hour: int = 6,
    pre_peak_hours: int = 2,
    peak_price: float = 11.0,
    pre_peak_price: float = 6.0,
    solar_kwh_pre_peak: float = 0.0,
    initial_soc_kwh: float = 1.5,
    max_capacity_kwh: float = 10.24,
    with_economic_charging: bool = False,
) -> list[dict]:
    """Vytvoří seznam intervalů pro testování pre-peak logiky.
    
    Struktura: pre-peak okno (levné ceny) + peak okno (drahé ceny) + zbytek dne
    Interval structure matches economic_charging_plan() input format.
    """
    timeline: list[dict[str, Any]] = []
    now = datetime(2025, 1, 15, 4, 0, tzinfo=timezone.utc)  # Start at 04:00
    
    # Calculate intervals
    pre_peak_start = peak_start_hour - pre_peak_hours
    peak_end_hour = peak_start_hour + 2  # 2-hour peak window
    
    intervals_count = 96  # 24 hours
    
    for i in range(intervals_count):
        ts = now + timedelta(minutes=15 * i)
        hour = ts.hour
        
        # Price zones
        if pre_peak_start <= hour < peak_start_hour:
            # Pre-peak window: cheap prices
            price = pre_peak_price
            zone = "pre_peak"
        elif peak_start_hour <= hour < peak_end_hour:
            # Peak window: expensive prices
            price = peak_price
            zone = "peak"
        else:
            # Other times: moderate prices
            price = 4.0
            zone = "normal"
        
        # Solar production in pre-peak window
        solar_wh = solar_kwh_pre_peak * 1000 if zone == "pre_peak" and i > 0 else 0
        
        # Economic charging (if enabled)
        grid_charge_kwh = 0.0
        if with_economic_charging and zone == "pre_peak" and i % 4 == 0:
            grid_charge_kwh = 0.8  # Some intervals have economic charging
        
        # Battery SOC (simplified projection)
        soc_kwh = initial_soc_kwh
        if i > 0:
            prev_soc = timeline[i-1]["battery_capacity_kwh"]
            # Simple SOC progression
            soc_kwh = min(max_capacity_kwh, prev_soc + grid_charge_kwh * 0.9)
        
        timeline.append({
            "timestamp": ts.isoformat(),
            "spot_price_czk": price,
            "battery_capacity_kwh": soc_kwh,
            "grid_charge_kwh": grid_charge_kwh,
            "solar_wh": solar_wh,
            "reason": "normal" if grid_charge_kwh == 0 else "economic_charge",
        })
    
    return timeline


# =============================================================================
# Test 1: SOC Threshold Logic
# =============================================================================


def test_no_pre_charge_when_soc_sufficient():
    """SOC > 30% v 06:00 → skip (soc_sufficient)
    
    When battery has sufficient capacity at peak start (06:00), 
    pre-peak charging should be skipped.
    """
    # Arrange: config s dostatečným SOC v 06:00, špička 06:00-08:00
    config = EconomicChargingPlanConfig(
        min_capacity_kwh=2.0,
        min_capacity_floor=1.0,
        effective_minimum_kwh=2.0,
        target_capacity_kwh=8.0,
        max_charging_price=10.0,
        min_savings_margin=0.5,
        charging_power_kw=3.0,
        max_capacity=10.24,
        battery_efficiency=0.87,
        config={},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
    )
    
    flags = RolloutFlags(enable_pre_peak_charging=True)
    intervals = _make_pre_peak_intervals(
        initial_soc_kwh=4.0,  # 40% - sufficient
        peak_start_hour=6,
        peak_price=11.0,
        pre_peak_price=6.0,
    )
    
    # Act: should_pre_charge_for_peak_avoidance(...)
    # This will FAIL with ImportError
    result = should_pre_charge_for_peak_avoidance(
        config=config,
        flags=flags,
        intervals=intervals,
        current_hour=4,  # 04:00 - 2 hours before peak
        current_soc_kwh=4.0,
    )
    
    # Assert: result.should_charge == False; result.reason == "soc_sufficient"
    assert not result.should_charge, f"Expected no pre-charge when SOC sufficient, got {result.should_charge}"
    assert result.reason == "soc_sufficient", f"Expected reason 'soc_sufficient', got '{result.reason}'"


# =============================================================================
# Test 2: Low SOC Triggers Pre-charge
# =============================================================================


def test_pre_charge_triggered_when_soc_low():
    """SOC ≤ hw_min_soc_kwh * 1.1 v 06:00 AND peak > pre_peak/RT → should_charge=True
    
    When SOC is low at peak start AND peak price is high enough compared to pre-peak,
    pre-charge should be triggered.
    """
    # Arrange: SOC 1.5 kWh (pod hw_min 2.05 * 1.1), peak 11 CZK, pre-peak 6 CZK, flag=True
    config = EconomicChargingPlanConfig(
        min_capacity_kwh=2.0,
        min_capacity_floor=1.0,
        effective_minimum_kwh=2.0,
        target_capacity_kwh=8.0,
        max_charging_price=10.0,
        min_savings_margin=0.5,
        charging_power_kw=3.0,
        max_capacity=10.24,
        battery_efficiency=0.87,
        config={},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
        hw_min_soc_kwh=2.05,
    )
    
    flags = RolloutFlags(enable_pre_peak_charging=True)
    intervals = _make_pre_peak_intervals(
        initial_soc_kwh=1.5,  # Low SOC
        peak_start_hour=6,
        peak_price=11.0,
        pre_peak_price=6.0,
    )
    
    # Act
    result = should_pre_charge_for_peak_avoidance(
        config=config,
        flags=flags,
        intervals=intervals,
        current_hour=4,
        current_soc_kwh=1.5,
    )
    
    # Assert: result.should_charge == True
    assert result.should_charge, f"Expected pre-charge when SOC low, got {result.should_charge}"


# =============================================================================
# Test 3: Economic Calculation with Round-Trip Efficiency
# =============================================================================


def test_economic_calculation_includes_round_trip():
    """Kalkulace zahrnuje round_trip_efficiency=0.87
    
    Economic calculation must account for round-trip efficiency when comparing
    peak vs pre-peak prices. Breakeven = pre_peak_price / efficiency * threshold.
    """
    # Arrange: peak=7.5 CZK, pre_peak=6 CZK
    # breakeven = 6 / 0.87 ≈ 6.90 * 1.2 ≈ 8.28 → 7.5 < 8.28 → NOT economical
    config = EconomicChargingPlanConfig(
        min_capacity_kwh=2.0,
        min_capacity_floor=1.0,
        effective_minimum_kwh=2.0,
        target_capacity_kwh=8.0,
        max_charging_price=10.0,
        min_savings_margin=0.5,
        charging_power_kw=3.0,
        max_capacity=10.24,
        battery_efficiency=0.87,
        config={},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
        round_trip_efficiency=0.87,
        peak_price_ratio_threshold=1.2,
    )
    
    flags = RolloutFlags(enable_pre_peak_charging=True)
    intervals = _make_pre_peak_intervals(
        initial_soc_kwh=1.5,
        peak_start_hour=6,
        peak_price=7.5,  # Below breakeven
        pre_peak_price=6.0,
    )
    
    # Act
    result = should_pre_charge_for_peak_avoidance(
        config=config,
        flags=flags,
        intervals=intervals,
        current_hour=4,
        current_soc_kwh=1.5,
    )
    
    # Assert: result.should_charge == False; result.reason == "not_economical"
    assert not result.should_charge, f"Expected no charge when not economical, got {result.should_charge}"
    assert result.reason == "not_economical", f"Expected reason 'not_economical', got '{result.reason}'"


# =============================================================================
# Test 4: PV-First Override
# =============================================================================


def test_pv_first_overrides_peak_avoidance():
    """PV forecast >= 0.5 kWh v pre-peak okně → should_charge=False (pv_first_deferred)
    
    When sufficient PV is forecasted in pre-peak window, peak avoidance should be
    deferred to prioritize PV-first policy.
    """
    # Arrange: intervaly s solar_kwh >= 0.5 v okně, flag=True
    config = EconomicChargingPlanConfig(
        min_capacity_kwh=2.0,
        min_capacity_floor=1.0,
        effective_minimum_kwh=2.0,
        target_capacity_kwh=8.0,
        max_charging_price=10.0,
        min_savings_margin=0.5,
        charging_power_kw=3.0,
        max_capacity=10.24,
        battery_efficiency=0.87,
        config={},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
    )
    
    flags = RolloutFlags(
        enable_pre_peak_charging=True,
        pv_first_policy_enabled=True,
    )
    intervals = _make_pre_peak_intervals(
        initial_soc_kwh=1.5,
        peak_start_hour=6,
        peak_price=11.0,
        pre_peak_price=6.0,
        solar_kwh_pre_peak=0.8,  # Sufficient PV forecast
    )
    
    # Act
    result = should_pre_charge_for_peak_avoidance(
        config=config,
        flags=flags,
        intervals=intervals,
        current_hour=4,
        current_soc_kwh=1.5,
    )
    
    # Assert: result.should_charge == False; result.reason == "pv_first_deferred"
    assert not result.should_charge, f"Expected PV-first override, got {result.should_charge}"
    assert result.reason == "pv_first_deferred", f"Expected reason 'pv_first_deferred', got '{result.reason}'"


# =============================================================================
# Test 5: Feature Flag Control
# =============================================================================


def test_feature_flag_disables_logic():
    """enable_pre_peak_charging=False → should_charge=False, reason='flag_disabled'
    
    Feature flag should completely disable pre-peak charging logic.
    """
    # Arrange: flags = RolloutFlags()  # default False
    config = EconomicChargingPlanConfig(
        min_capacity_kwh=2.0,
        min_capacity_floor=1.0,
        effective_minimum_kwh=2.0,
        target_capacity_kwh=8.0,
        max_charging_price=10.0,
        min_savings_margin=0.5,
        charging_power_kw=3.0,
        max_capacity=10.24,
        battery_efficiency=0.87,
        config={},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
    )
    
    flags = RolloutFlags(enable_pre_peak_charging=False)  # Disabled
    intervals = _make_pre_peak_intervals(
        initial_soc_kwh=1.5,
        peak_start_hour=6,
        peak_price=11.0,
        pre_peak_price=6.0,
    )
    
    # Act
    result = should_pre_charge_for_peak_avoidance(
        config=config,
        flags=flags,
        intervals=intervals,
        current_hour=4,
        current_soc_kwh=1.5,
    )
    
    # Assert: result.should_charge == False; result.reason == "flag_disabled"
    assert not result.should_charge, f"Expected flag disabled, got {result.should_charge}"
    assert result.reason == "flag_disabled", f"Expected reason 'flag_disabled', got '{result.reason}'"


# =============================================================================
# Test 6: Decision Trace Completeness
# =============================================================================


def test_decision_trace_populated():
    """PrePeakDecision obsahuje soc_at_peak_start_kwh, peak_avg_price, estimated_saving_czk
    
    When pre-charge is triggered, decision trace should contain all relevant metrics.
    """
    # Arrange: podmínky pro should_charge=True
    config = EconomicChargingPlanConfig(
        min_capacity_kwh=2.0,
        min_capacity_floor=1.0,
        effective_minimum_kwh=2.0,
        target_capacity_kwh=8.0,
        max_charging_price=10.0,
        min_savings_margin=0.5,
        charging_power_kw=3.0,
        max_capacity=10.24,
        battery_efficiency=0.87,
        config={},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
    )
    
    flags = RolloutFlags(enable_pre_peak_charging=True)
    intervals = _make_pre_peak_intervals(
        initial_soc_kwh=1.5,
        peak_start_hour=6,
        peak_price=11.0,
        pre_peak_price=6.0,
    )
    
    # Act
    result = should_pre_charge_for_peak_avoidance(
        config=config,
        flags=flags,
        intervals=intervals,
        current_hour=4,
        current_soc_kwh=1.5,
    )
    
    # Assert: result.soc_at_peak_start_kwh není None; result.peak_avg_price > 0; result.estimated_saving_czk > 0
    assert result.soc_at_peak_start_kwh is not None, f"soc_at_peak_start_kwh should not be None, got {result.soc_at_peak_start_kwh}"
    assert result.peak_avg_price > 0, f"peak_avg_price should be > 0, got {result.peak_avg_price}"
    assert result.estimated_saving_czk > 0, f"estimated_saving_czk should be > 0, got {result.estimated_saving_czk}"


# =============================================================================
# Test 7: Time Window Validation
# =============================================================================


def test_skip_if_peak_less_than_one_hour_away():
    """< 4 intervaly (< 1 hodina) do začátku špičky → skip (too_close_to_peak)
    
    Should skip pre-charge if peak starts in less than 1 hour (4 intervals).
    """
    # Arrange: now = 05:50, peak_start_hour=6 → pouze 2 intervaly do špičky
    config = EconomicChargingPlanConfig(
        min_capacity_kwh=2.0,
        min_capacity_floor=1.0,
        effective_minimum_kwh=2.0,
        target_capacity_kwh=8.0,
        max_charging_price=10.0,
        min_savings_margin=0.5,
        charging_power_kw=3.0,
        max_capacity=10.24,
        battery_efficiency=0.87,
        config={},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
    )
    
    flags = RolloutFlags(enable_pre_peak_charging=True)
    intervals = _make_pre_peak_intervals(
        initial_soc_kwh=1.5,
        peak_start_hour=6,
        peak_price=11.0,
        pre_peak_price=6.0,
    )
    
    # Act: current_hour=5 (05:00) → only 4 intervals to peak
    result = should_pre_charge_for_peak_avoidance(
        config=config,
        flags=flags,
        intervals=intervals,
        current_hour=5,  # 05:00 - too close
        current_soc_kwh=1.5,
    )
    
    # Assert: result.should_charge == False; result.reason == "too_close_to_peak"
    assert not result.should_charge, f"Expected skip when too close to peak, got {result.should_charge}"
    assert result.reason == "too_close_to_peak", f"Expected reason 'too_close_to_peak', got '{result.reason}'"


# =============================================================================
# Test 8: No Double-Charging
# =============================================================================


def test_no_double_charge_if_economic_already_scheduled():
    """Pokud ECONOMIC_CHARGING již plánuje tentýž interval → no double charge
    
    Should not schedule pre-charge in intervals that already have economic charging.
    """
    # Arrange: intervaly kde nejlevnější sloty mají grid_charge_kwh > 0 (ECONOMIC_CHARGING)
    config = EconomicChargingPlanConfig(
        min_capacity_kwh=2.0,
        min_capacity_floor=1.0,
        effective_minimum_kwh=2.0,
        target_capacity_kwh=8.0,
        max_charging_price=10.0,
        min_savings_margin=0.5,
        charging_power_kw=3.0,
        max_capacity=10.24,
        battery_efficiency=0.87,
        config={},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
    )
    
    flags = RolloutFlags(enable_pre_peak_charging=True)
    intervals = _make_pre_peak_intervals(
        initial_soc_kwh=1.5,
        peak_start_hour=6,
        peak_price=11.0,
        pre_peak_price=6.0,
        with_economic_charging=True,  # Some intervals already have economic charging
    )
    
    # Act
    result = should_pre_charge_for_peak_avoidance(
        config=config,
        flags=flags,
        intervals=intervals,
        current_hour=4,
        current_soc_kwh=1.5,
    )
    
    # Assert: výsledné cheapest_intervals neobsahují duplicitu s existujícím economic charging
    if result.should_charge:
        # Check that cheapest intervals don't overlap with existing economic charging
        for interval_idx in result.cheapest_intervals:
            existing_charge = intervals[interval_idx]["grid_charge_kwh"]
            assert existing_charge == 0, f"Interval {interval_idx} already has economic charging {existing_charge}kWh"


# =============================================================================
# Test 9: Maximum Capacity Constraints
# =============================================================================


def test_do_not_exceed_max_capacity_fraction():
    """Cílový SOC nepřekročí max_capacity * max_charge_fraction (0.95)
    
    Pre-charge should not exceed max_capacity * max_charge_fraction.
    """
    # Arrange: max_capacity=10.24, max_charge_fraction=0.95 → max 9.728 kWh
    config = EconomicChargingPlanConfig(
        min_capacity_kwh=2.0,
        min_capacity_floor=1.0,
        effective_minimum_kwh=2.0,
        target_capacity_kwh=8.0,
        max_charging_price=10.0,
        min_savings_margin=0.5,
        charging_power_kw=3.0,
        max_capacity=10.24,
        battery_efficiency=0.87,
        config={},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
        max_charge_fraction=0.95,
    )
    
    flags = RolloutFlags(enable_pre_peak_charging=True)
    intervals = _make_pre_peak_intervals(
        initial_soc_kwh=8.0,  # Already high SOC
        peak_start_hour=6,
        peak_price=11.0,
        pre_peak_price=6.0,
    )
    
    # Act
    result = should_pre_charge_for_peak_avoidance(
        config=config,
        flags=flags,
        intervals=intervals,
        current_hour=4,
        current_soc_kwh=8.0,
    )
    
    # Assert: result.expected_charge_kwh <= config.max_capacity * config.max_charge_fraction - current_soc
    max_allowed_charge = (config.max_capacity * config.max_charge_fraction) - 8.0
    if result.should_charge:
        assert result.expected_charge_kwh <= max_allowed_charge, (
            f"Expected charge {result.expected_charge_kwh}kWh should not exceed "
            f"max allowed {max_allowed_charge}kWh"
        )


# =============================================================================
# Test 10: Cheapest Interval Selection
# =============================================================================


def test_cheapest_intervals_selected():
    """Z pre-peak okna jsou vybrány nejlevnější intervaly, ne nejdražší
    
    Should select the cheapest intervals from pre-peak window, not the most expensive.
    """
    # Arrange: 8 intervalů v pre-peak okně s různými cenami (2 levné, 6 drahé)
    config = EconomicChargingPlanConfig(
        min_capacity_kwh=2.0,
        min_capacity_floor=1.0,
        effective_minimum_kwh=2.0,
        target_capacity_kwh=8.0,
        max_charging_price=10.0,
        min_savings_margin=0.5,
        charging_power_kw=3.0,
        max_capacity=10.24,
        battery_efficiency=0.87,
        config={},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
    )
    
    flags = RolloutFlags(enable_pre_peak_charging=True)
    intervals = _make_pre_peak_intervals(
        initial_soc_kwh=1.5,
        peak_start_hour=6,
        peak_price=11.0,
        pre_peak_price=6.0,
    )
    
    # Modify some intervals to have different prices
    # First 2 intervals (cheapest), next 6 (more expensive)
    for i in range(8):
        if i < 2:
            intervals[i]["spot_price_czk"] = 4.0  # Cheapest
        else:
            intervals[i]["spot_price_czk"] = 8.0  # More expensive
    
    # Act
    result = should_pre_charge_for_peak_avoidance(
        config=config,
        flags=flags,
        intervals=intervals,
        current_hour=4,
        current_soc_kwh=1.5,
    )
    
    # Assert: result.cheapest_intervals obsahuje indexy levných intervalů, ne drahých
    if result.should_charge and result.cheapest_intervals:
        # Should select intervals 0 and 1 (cheapest), not 2-7 (more expensive)
        cheapest_indices = set(result.cheapest_intervals)
        expensive_indices = set(range(2, 8))
        
        # Cheapest should not overlap with expensive
        intersection = cheapest_indices & expensive_indices
        assert len(intersection) == 0, (
            f"Cheapest intervals {cheapest_indices} should not include "
            f"expensive intervals {expensive_indices}"
        )
        
        # Should include at least one of the cheapest intervals
        assert len(cheapest_indices & {0, 1}) > 0, (
            f"Should include cheapest intervals (0,1), got {cheapest_indices}"
        )
