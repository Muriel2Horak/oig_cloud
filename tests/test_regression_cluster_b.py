"""Regression Hardening Edge-Case Cluster B + Rollout Canary Checks — Task 16

Tests for boiler coordination edge cases, observability gate thresholds,
and canary check suite that verifies rollout health logic end-to-end
with realistic metric patterns.
"""
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.boiler.models import EnergySource
from custom_components.oig_cloud.boiler.planner import BoilerPlanner
from custom_components.oig_cloud.battery_forecast.planning.observability import (
    AlertCondition,
    RolloutGate,
    RolloutHealthStatus,
    RolloutMetrics,
    DEFAULT_THRESHOLDS,
    evaluate_rollout_health,
)
from custom_components.oig_cloud.battery_forecast.planning.rollout_flags import (
    RolloutFlags,
    get_effective_flags,
    is_pv_first_active,
    is_boiler_coordination_active,
)


# =============================================================================
# BOILER COORDINATION EDGE CASES (5 tests)
# =============================================================================

class TestBoilerCoordinationEdgeCases:
    """Tests for boiler coordination edge cases with PV forecast thresholds."""

    def test_boiler_pv_forecast_exactly_at_minimum(self):
        """Exactly 0.5 kWh forecast → defers to FVE.

        Scenario:
        - PV forecast = 0.5 kWh (exactly at PV_FORECAST_MIN_KWH)
        - PV confidence = 0.5 (above PV_CONFIDENCE_MIN = 0.3)
        - No overflow available
        - Expensive grid price (5.0 CZK/kWh)
        - Expected: Returns FVE (PV-first defer activates)

        This verifies the boundary condition at exactly 0.5 kWh.
        """
        planner = BoilerPlanner(
            hass=SimpleNamespace(),
            slot_minutes=15,
            alt_cost_kwh=3.5,
            has_alternative=False,
        )

        source = planner._recommend_source(
            overflow_available=False,
            spot_price=5.0,
            alt_price=3.5,
            pv_forecast=0.5,  # Exactly at PV_FORECAST_MIN_KWH
            pv_confidence=0.5,  # Above PV_CONFIDENCE_MIN (0.3)
        )

        assert source == EnergySource.FVE, (
            f"PV-FIRST BOUNDARY VIOLATION: Boiler chose {source.value} when "
            f"PV forecast is exactly 0.5 kWh (at threshold). Should defer to FVE."
        )

    def test_boiler_pv_forecast_below_minimum_falls_back_to_grid(self):
        """0.49 kWh forecast → Grid fallback.

        Scenario:
        - PV forecast = 0.49 kWh (below PV_FORECAST_MIN_KWH = 0.5)
        - PV confidence = 0.8 (above threshold)
        - No overflow available
        - Expensive grid price (5.0 CZK/kWh)
        - Expected: Returns GRID (forecast too low to defer)

        This verifies the boundary condition just below 0.5 kWh.
        """
        planner = BoilerPlanner(
            hass=SimpleNamespace(),
            slot_minutes=15,
            alt_cost_kwh=8.0,
            has_alternative=True,
        )

        source = planner._recommend_source(
            overflow_available=False,
            spot_price=5.0,
            alt_price=8.0,  # More expensive than grid
            pv_forecast=0.49,  # Just below PV_FORECAST_MIN_KWH
            pv_confidence=0.8,
        )

        assert source == EnergySource.GRID, (
            f"PV-FIRST BOUNDARY VIOLATION: Boiler chose {source.value} when "
            f"PV forecast is 0.49 kWh (below 0.5 threshold). Should fall back to Grid."
        )

    def test_boiler_with_zero_confidence_no_defer(self):
        """0.0 confidence (no PV trust) → Grid.

        Scenario:
        - PV forecast = 3.0 kWh (above threshold)
        - PV confidence = 0.0 (below PV_CONFIDENCE_MIN = 0.3)
        - No overflow available
        - Grid price = 5.0 CZK/kWh
        - Expected: Returns GRID (can't trust forecast with 0% confidence)

        This verifies that confidence threshold is enforced.
        """
        planner = BoilerPlanner(
            hass=SimpleNamespace(),
            slot_minutes=15,
            alt_cost_kwh=8.0,
            has_alternative=True,
        )

        source = planner._recommend_source(
            overflow_available=False,
            spot_price=5.0,
            alt_price=8.0,
            pv_forecast=3.0,  # Good forecast
            pv_confidence=0.0,  # But zero confidence - can't trust it
        )

        assert source == EnergySource.GRID, (
            f"CONFIDENCE THRESHOLD VIOLATION: Boiler chose {source.value} when "
            f"PV confidence is 0.0 (below 0.3 threshold). Should fall back to Grid."
        )

    def test_boiler_overflow_always_wins_over_pv_forecast(self):
        """FVE overflow takes priority over forecast check.

        Scenario:
        - FVE overflow available = True
        - PV forecast = 0.0 kWh (no forecast)
        - Grid price = 5.0 CZK/kWh
        - Expected: Returns FVE (overflow is highest priority)

        This verifies that overflow check happens before PV-first logic.
        """
        planner = BoilerPlanner(
            hass=SimpleNamespace(),
            slot_minutes=15,
            alt_cost_kwh=3.5,
            has_alternative=False,
        )

        source = planner._recommend_source(
            overflow_available=True,  # Overflow takes priority
            spot_price=5.0,
            alt_price=3.5,
            pv_forecast=0.0,  # No forecast needed
            pv_confidence=0.0,
        )

        assert source == EnergySource.FVE, (
            f"OVERFLOW PRIORITY VIOLATION: Boiler chose {source.value} when "
            f"FVE overflow is available. Overflow should always win."
        )

    def test_boiler_alternative_source_beats_grid_even_without_pv(self):
        """Alt price cheaper than grid → ALTERNATIVE.

        Scenario:
        - No overflow available
        - No PV forecast (0.0 kWh, 0.0 confidence)
        - Grid price = 5.0 CZK/kWh
        - Alternative price = 3.0 CZK/kWh (cheaper)
        - has_alternative = True
        - Expected: Returns ALTERNATIVE (cheaper than grid)

        This verifies that economic fallback still works when PV is unavailable.
        """
        planner = BoilerPlanner(
            hass=SimpleNamespace(),
            slot_minutes=15,
            alt_cost_kwh=3.0,  # Cheaper than grid
            has_alternative=True,
        )

        source = planner._recommend_source(
            overflow_available=False,
            spot_price=5.0,
            alt_price=3.0,  # Cheaper than grid
            pv_forecast=0.0,
            pv_confidence=0.0,
        )

        assert source == EnergySource.ALTERNATIVE, (
            f"ECONOMIC FALLBACK VIOLATION: Boiler chose {source.value} when "
            f"alternative (3.0 CZK/kWh) is cheaper than grid (5.0 CZK/kWh)."
        )


# =============================================================================
# OBSERVABILITY GATE CANARY CHECKS (5 tests)
# =============================================================================

class TestObservabilityGateCanaryChecks:
    """Tests for observability gate canary checks with realistic metric patterns."""

    def test_canary_healthy_run_metrics_passes_gate(self):
        """Realistic healthy metrics → gate PASS.

        Scenario:
        - 80 PV defers, 20 grid charges = 100 decisions
        - 2 protection bypasses (2% rate, below 5% threshold)
        - PV defer rate = 80% (well above 10% threshold)
        - Grid charge rate = 20% (below 30% threshold)
        - pv_first_enabled = True
        - Expected: HEALTHY status, no alerts
        """
        metrics = RolloutMetrics()

        # 80 PV defers, 20 grid charges = 100 total decisions
        for _ in range(80):
            metrics.increment_pv_defer()
        for _ in range(20):
            metrics.increment_grid_charge()
        # 2 protection bypasses = 2% rate (below 5% threshold)
        for _ in range(2):
            metrics.increment_protection_bypass()

        gate = evaluate_rollout_health(metrics, pv_first_enabled=True)

        assert gate.status == RolloutHealthStatus.HEALTHY, (
            f"GATE FAILED UNEXPECTEDLY: Status={gate.status.value}, "
            f"alerts={[a.name for a in gate.alerts]}"
        )
        assert gate.is_healthy is True
        assert gate.should_pause is False
        assert len(gate.alerts) == 0

    def test_canary_high_bypass_rate_fails_gate(self):
        """10% bypass rate (> 5% threshold) → gate FAIL.

        Scenario:
        - 100 decisions total
        - 10 protection bypasses = 10% rate (exceeds 5% threshold)
        - Expected: UNHEALTHY status with critical alert
        """
        metrics = RolloutMetrics()

        # 90 PV defers = 90% defer rate (good)
        for _ in range(90):
            metrics.increment_pv_defer()
        for _ in range(10):
            metrics.increment_grid_charge()
        # 10 bypasses = 10% rate (exceeds 5% threshold)
        for _ in range(10):
            metrics.increment_protection_bypass()

        gate = evaluate_rollout_health(metrics, pv_first_enabled=True)

        assert gate.status == RolloutHealthStatus.UNHEALTHY, (
            f"GATE SHOULD FAIL: 10% bypass rate exceeds 5% threshold. "
            f"Status={gate.status.value}"
        )
        assert gate.should_pause is True
        assert gate.has_critical_alerts is True
        assert any(a.name == "max_protection_bypass_rate" for a in gate.alerts)

    def test_canary_low_pv_defer_when_pv_enabled_fails(self):
        """pv_first_enabled but 0% defer rate → WARN.

        Scenario:
        - pv_first_enabled = True
        - 100 grid charges, 0 PV defers = 0% defer rate
        - Expected: DEGRADED status with warning (policy may not be working)
        """
        metrics = RolloutMetrics()

        # 100 grid charges, 0 PV defers = 0% defer rate
        for _ in range(100):
            metrics.increment_grid_charge()

        gate = evaluate_rollout_health(metrics, pv_first_enabled=True)

        assert gate.status == RolloutHealthStatus.DEGRADED, (
            f"GATE SHOULD WARN: 0% PV defer rate with pv_first_enabled. "
            f"Status={gate.status.value}"
        )
        assert gate.has_warnings is True
        assert any(a.name == "min_pv_defer_rate" for a in gate.alerts)

    def test_canary_grid_charge_rate_above_threshold_with_pv_fails(self):
        """35% grid charge + pv_first → WARN.

        Scenario:
        - pv_first_enabled = True
        - 35 grid charges, 65 PV defers = 35% grid charge rate
        - Expected: DEGRADED status with warning (too much grid charging)
        """
        metrics = RolloutMetrics()

        # 65 PV defers, 35 grid charges = 35% grid charge rate (exceeds 30%)
        for _ in range(65):
            metrics.increment_pv_defer()
        for _ in range(35):
            metrics.increment_grid_charge()

        gate = evaluate_rollout_health(metrics, pv_first_enabled=True)

        assert gate.status == RolloutHealthStatus.DEGRADED, (
            f"GATE SHOULD WARN: 35% grid charge rate exceeds 30% threshold. "
            f"Status={gate.status.value}"
        )
        assert gate.has_warnings is True
        assert any(a.name == "max_grid_charge_rate" for a in gate.alerts)

    def test_canary_zero_decisions_with_pv_enabled_warns(self):
        """No decisions yet with pv_first_enabled → WARN (0% defer triggers alert).

        Scenario:
        - 0 total decisions
        - pv_first_enabled = True
        - Expected: DEGRADED status (0% defer rate < 10% threshold)

        Note: This documents CURRENT behavior where 0 decisions results in
        0% defer rate, which triggers min_pv_defer_rate warning when PV-first
        is enabled. Fresh installations may see warnings until decisions are made.
        """
        metrics = RolloutMetrics()

        # No decisions at all
        assert metrics.total_decisions == 0

        gate = evaluate_rollout_health(metrics, pv_first_enabled=True)

        # Current behavior: 0% defer rate triggers min_pv_defer_rate warning
        assert gate.status == RolloutHealthStatus.DEGRADED, (
            f"GATE SHOULD WARN: 0% defer rate with pv_first_enabled. "
            f"Status={gate.status.value}"
        )
        assert gate.has_warnings is True
        assert any(a.name == "min_pv_defer_rate" for a in gate.alerts)

    def test_canary_zero_decisions_pv_disabled_passes(self):
        """No decisions yet with pv_first_disabled → gate PASS.

        Scenario:
        - 0 total decisions
        - pv_first_enabled = False
        - Expected: HEALTHY status (PV checks skipped when disabled)

        This verifies that fresh installations pass health checks when
        PV-first policy is disabled.
        """
        metrics = RolloutMetrics()

        # No decisions at all
        assert metrics.total_decisions == 0

        gate = evaluate_rollout_health(metrics, pv_first_enabled=False)

        # When PV-first is disabled, PV-related checks are skipped
        assert gate.status == RolloutHealthStatus.HEALTHY, (
            f"GATE SHOULD PASS: PV-first disabled, no PV checks. "
            f"Status={gate.status.value}"
        )
        assert gate.is_healthy is True
        assert len(gate.alerts) == 0


# =============================================================================
# ROLLOUT FLAG COMBINATION CHECKS (2 tests)
# =============================================================================

class TestRolloutFlagCombinationChecks:
    """Tests for rollout flag combination checks."""

    def test_all_flags_enabled_full_policy_active(self):
        """All flags on → full new policy.

        Scenario:
        - pv_first_policy_enabled = True
        - boiler_coordination_enabled = True
        - emergency_rollback = False
        - Expected: Both policies active, not in legacy mode
        """
        flags = RolloutFlags(
            pv_first_policy_enabled=True,
            boiler_coordination_enabled=True,
            emergency_rollback=False,
        )

        effective = get_effective_flags(flags)

        assert effective.pv_first_policy_enabled is True
        assert effective.boiler_coordination_enabled is True
        assert effective.emergency_rollback is False
        assert effective.any_new_policy_enabled is True
        assert effective.is_legacy_mode is False
        assert is_pv_first_active(flags) is True
        assert is_boiler_coordination_active(flags) is True

    def test_emergency_rollback_disables_all_policy(self):
        """emergency_rollback=True → all new policy disabled.

        Scenario:
        - pv_first_policy_enabled = True
        - boiler_coordination_enabled = True
        - emergency_rollback = True
        - Expected: Effective flags show all policies disabled, legacy mode active

        This verifies the kill-switch behavior of emergency rollback.
        """
        flags = RolloutFlags(
            pv_first_policy_enabled=True,
            boiler_coordination_enabled=True,
            emergency_rollback=True,  # Kill-switch active
        )

        effective = get_effective_flags(flags)

        # Emergency rollback overrides all other flags
        assert effective.pv_first_policy_enabled is False, (
            "Emergency rollback should disable pv_first_policy"
        )
        assert effective.boiler_coordination_enabled is False, (
            "Emergency rollback should disable boiler_coordination"
        )
        assert effective.emergency_rollback is True
        assert effective.any_new_policy_enabled is False
        assert effective.is_legacy_mode is True

        # Utility functions should also reflect effective state
        assert is_pv_first_active(flags) is False
        assert is_boiler_coordination_active(flags) is False
