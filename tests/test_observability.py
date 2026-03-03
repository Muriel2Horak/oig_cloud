"""Tests for rollout observability pack.

Tests verify metrics tracking, health evaluation, and alert conditions
for aggressive rollout monitoring.
"""

import pytest

from custom_components.oig_cloud.battery_forecast.planning.observability import (
    AlertCondition,
    RolloutGate,
    RolloutHealthStatus,
    RolloutMetrics,
    create_metrics_from_dict,
    evaluate_rollout_health,
    format_metrics_summary,
    merge_metrics,
)


class TestRolloutMetrics:
    """Tests for RolloutMetrics dataclass."""

    def test_pv_defer_counter_increments(self):
        """PV defer counter should increment correctly."""
        metrics = RolloutMetrics()
        
        assert metrics.pv_defer_count == 0
        assert metrics.total_decisions == 0
        
        metrics.increment_pv_defer()
        assert metrics.pv_defer_count == 1
        assert metrics.total_decisions == 1
        
        metrics.increment_pv_defer()
        metrics.increment_pv_defer()
        assert metrics.pv_defer_count == 3
        assert metrics.total_decisions == 3

    def test_grid_charge_counter_increments(self):
        """Grid charge counter should increment correctly."""
        metrics = RolloutMetrics()
        
        metrics.increment_grid_charge()
        metrics.increment_grid_charge()
        
        assert metrics.grid_charge_count == 2
        assert metrics.total_decisions == 2

    def test_protection_bypass_counter_increments(self):
        """Protection bypass counter should increment independently."""
        metrics = RolloutMetrics()
        
        metrics.increment_protection_bypass()
        metrics.increment_protection_bypass()
        metrics.increment_protection_bypass()
        
        assert metrics.protection_bypass_count == 3
        # Protection bypass does NOT increment total_decisions
        assert metrics.total_decisions == 0

    def test_boiler_source_outcome_tracking(self):
        """Boiler source outcomes should be tracked correctly."""
        metrics = RolloutMetrics()
        
        metrics.record_boiler_source("fve")
        metrics.record_boiler_source("FVE")  # Case insensitive
        metrics.record_boiler_source("grid")
        metrics.record_boiler_source("alternative")
        metrics.record_boiler_source("grid")
        
        assert metrics.boiler_source_outcomes == {
            "fve": 2,
            "grid": 2,
            "alternative": 1,
        }

    def test_decision_reason_tracking(self):
        """Decision reasons should be tracked correctly."""
        metrics = RolloutMetrics()
        
        metrics.record_decision_reason("pv_first")
        metrics.record_decision_reason("economic_charging")
        metrics.record_decision_reason("pv_first")
        metrics.record_decision_reason("death_valley")
        
        assert metrics.decision_reason_counts == {
            "pv_first": 2,
            "economic_charging": 1,
            "death_valley": 1,
        }

    def test_rate_calculations_with_no_decisions(self):
        """Rates should return 0.0 when no decisions made."""
        metrics = RolloutMetrics()
        
        assert metrics.get_pv_defer_rate() == 0.0
        assert metrics.get_grid_charge_rate() == 0.0
        assert metrics.get_protection_bypass_rate() == 0.0
        assert metrics.get_boiler_source_rate("fve") == 0.0

    def test_rate_calculations_with_decisions(self):
        """Rates should calculate correctly with decisions."""
        metrics = RolloutMetrics()
        
        # 3 PV defers, 7 grid charges = 10 total
        for _ in range(3):
            metrics.increment_pv_defer()
        for _ in range(7):
            metrics.increment_grid_charge()
        
        assert metrics.get_pv_defer_rate() == 0.3
        assert metrics.get_grid_charge_rate() == 0.7

    def test_reset_clears_all_counters(self):
        """Reset should clear all counters."""
        metrics = RolloutMetrics()
        metrics.increment_pv_defer()
        metrics.increment_grid_charge()
        metrics.increment_protection_bypass()
        metrics.record_boiler_source("fve")
        metrics.record_decision_reason("pv_first")
        
        metrics.reset()
        
        assert metrics.pv_defer_count == 0
        assert metrics.grid_charge_count == 0
        assert metrics.protection_bypass_count == 0
        assert metrics.boiler_source_outcomes == {}
        assert metrics.decision_reason_counts == {}
        assert metrics.total_decisions == 0


class TestAlertCondition:
    """Tests for AlertCondition evaluation."""

    def test_gt_comparison(self):
        """Greater-than comparison should work."""
        condition = AlertCondition(
            name="test",
            threshold=0.5,
            comparison="gt",
            message="Test message",
        )
        
        assert condition.evaluate(0.6) is True
        assert condition.evaluate(0.5) is False
        assert condition.evaluate(0.4) is False

    def test_lt_comparison(self):
        """Less-than comparison should work."""
        condition = AlertCondition(
            name="test",
            threshold=0.5,
            comparison="lt",
            message="Test message",
        )
        
        assert condition.evaluate(0.4) is True
        assert condition.evaluate(0.5) is False
        assert condition.evaluate(0.6) is False

    def test_gte_comparison(self):
        """Greater-than-or-equal comparison should work."""
        condition = AlertCondition(
            name="test",
            threshold=0.5,
            comparison="gte",
            message="Test message",
        )
        
        assert condition.evaluate(0.6) is True
        assert condition.evaluate(0.5) is True
        assert condition.evaluate(0.4) is False

    def test_lte_comparison(self):
        """Less-than-or-equal comparison should work."""
        condition = AlertCondition(
            name="test",
            threshold=0.5,
            comparison="lte",
            message="Test message",
        )
        
        assert condition.evaluate(0.4) is True
        assert condition.evaluate(0.5) is True
        assert condition.evaluate(0.6) is False


class TestRolloutGate:
    """Tests for RolloutGate evaluation."""

    def test_rollout_gate_passes_healthy_metrics(self):
        """Healthy metrics should produce HEALTHY gate."""
        metrics = RolloutMetrics()
        
        # 70% PV defer, 20% grid charge, 2% bypass - all healthy
        # 2/100 = 2% bypass (< 5%), 20/100 = 20% grid (< 30%), 70/100 = 70% PV defer (> 10%)
        for _ in range(70):
            metrics.increment_pv_defer()
        for _ in range(30):
            metrics.increment_grid_charge()
        for _ in range(2):
            metrics.increment_protection_bypass()
        
        gate = evaluate_rollout_health(metrics, pv_first_enabled=True)
        
        assert gate.status == RolloutHealthStatus.HEALTHY
        assert gate.is_healthy is True
        assert gate.should_pause is False
        assert len(gate.alerts) == 0

    def test_rollout_gate_fails_on_high_bypass_rate(self):
        """High protection bypass rate should trigger UNHEALTHY."""
        metrics = RolloutMetrics()
        
        # 100 decisions, 10 bypass = 10% bypass rate (> 5% threshold)
        # 80 PV defer, 20 grid = 20% grid (< 30%), so only bypass alert triggers
        for _ in range(80):
            metrics.increment_pv_defer()
        for _ in range(20):
            metrics.increment_grid_charge()
        for _ in range(10):
            metrics.increment_protection_bypass()
        
        gate = evaluate_rollout_health(metrics, pv_first_enabled=True)
        
        assert gate.status == RolloutHealthStatus.UNHEALTHY
        assert gate.should_pause is True
        assert gate.has_critical_alerts is True
        assert len(gate.alerts) == 1
        assert gate.alerts[0].name == "max_protection_bypass_rate"

    def test_protection_bypass_alerts_threshold(self):
        """Protection bypass should alert at exactly 5% rate."""
        metrics = RolloutMetrics()
        
        # 100 decisions, 5 bypasses = 5% rate (at threshold, should NOT alert with gt)
        # 70 PV defer, 30 grid = 30% grid (= threshold, should NOT alert with gt)
        for _ in range(70):
            metrics.increment_pv_defer()
        for _ in range(30):
            metrics.increment_grid_charge()
        for _ in range(5):
            metrics.increment_protection_bypass()
        
        gate = evaluate_rollout_health(metrics, pv_first_enabled=True)
        
        # At exactly 5% and 30%, gt comparison should NOT trigger
        assert gate.status == RolloutHealthStatus.HEALTHY

    def test_low_pv_defer_rate_triggers_warning(self):
        """Low PV defer rate should trigger warning when PV-first enabled."""
        metrics = RolloutMetrics()
        
        # 5% PV defer rate (< 10% threshold)
        for _ in range(5):
            metrics.increment_pv_defer()
        for _ in range(95):
            metrics.increment_grid_charge()
        
        gate = evaluate_rollout_health(metrics, pv_first_enabled=True)
        
        assert gate.status == RolloutHealthStatus.DEGRADED
        assert gate.has_warnings is True
        assert any(a.name == "min_pv_defer_rate" for a in gate.alerts)

    def test_high_grid_charge_rate_triggers_warning(self):
        """High grid charge rate should trigger warning when PV-first enabled."""
        metrics = RolloutMetrics()
        
        # 40% grid charge rate (> 30% threshold)
        for _ in range(60):
            metrics.increment_pv_defer()
        for _ in range(40):
            metrics.increment_grid_charge()
        
        gate = evaluate_rollout_health(metrics, pv_first_enabled=True)
        
        assert gate.status == RolloutHealthStatus.DEGRADED
        assert gate.has_warnings is True
        assert any(a.name == "max_grid_charge_rate" for a in gate.alerts)

    def test_pv_first_disabled_skips_pv_checks(self):
        """PV-first checks should be skipped when policy disabled."""
        metrics = RolloutMetrics()
        
        # Would fail PV-first checks, but policy is disabled
        for _ in range(5):
            metrics.increment_pv_defer()
        for _ in range(95):
            metrics.increment_grid_charge()
        
        gate = evaluate_rollout_health(metrics, pv_first_enabled=False)
        
        # Should be healthy because PV-first checks are skipped
        assert gate.status == RolloutHealthStatus.HEALTHY
        assert len(gate.alerts) == 0

    def test_multiple_alerts_triggers_unhealthy(self):
        """Critical alert should make status UNHEALTHY regardless of warnings."""
        metrics = RolloutMetrics()
        
        # Low PV defer (warning) + high bypass (critical)
        for _ in range(5):
            metrics.increment_pv_defer()
        for _ in range(5):
            metrics.increment_grid_charge()
        for _ in range(10):
            metrics.increment_protection_bypass()
        
        gate = evaluate_rollout_health(metrics, pv_first_enabled=True)
        
        assert gate.status == RolloutHealthStatus.UNHEALTHY
        assert gate.has_critical_alerts is True
        assert gate.has_warnings is True


class TestFormatMetricsSummary:
    """Tests for metrics summary formatting."""

    def test_format_empty_metrics(self):
        """Empty metrics should format correctly."""
        metrics = RolloutMetrics()
        summary = format_metrics_summary(metrics)
        
        assert "Total Decisions: 0" in summary
        assert "PV Defer Count: 0" in summary
        assert "(no boiler decisions)" in summary
        assert "(no decision reasons recorded)" in summary

    def test_format_metrics_with_data(self):
        """Metrics with data should format correctly."""
        metrics = RolloutMetrics()
        
        for _ in range(30):
            metrics.increment_pv_defer()
        for _ in range(10):
            metrics.increment_grid_charge()
        metrics.record_boiler_source("fve")
        metrics.record_boiler_source("grid")
        metrics.record_decision_reason("pv_first")
        
        summary = format_metrics_summary(metrics)
        
        assert "Total Decisions: 40" in summary
        assert "PV Defer Count: 30" in summary
        assert "75.0%" in summary  # 30/40 = 75% for PV defer
        assert "fve:" in summary
        assert "pv_first:" in summary


class TestCreateMetricsFromDict:
    """Tests for creating metrics from dictionary."""

    def test_create_from_empty_dict(self):
        """Empty dict should create default metrics."""
        metrics = create_metrics_from_dict({})
        
        assert metrics.pv_defer_count == 0
        assert metrics.grid_charge_count == 0
        assert metrics.protection_bypass_count == 0

    def test_create_from_dict_with_values(self):
        """Dict with values should create populated metrics."""
        data = {
            "pv_defer_count": 10,
            "grid_charge_count": 5,
            "protection_bypass_count": 2,
            "boiler_source_outcomes": {"fve": 3, "grid": 1},
            "decision_reason_counts": {"pv_first": 10},
            "total_decisions": 15,
            "pv_first_enabled": True,
            "timestamp": "2024-01-01T12:00:00",
        }
        
        metrics = create_metrics_from_dict(data)
        
        assert metrics.pv_defer_count == 10
        assert metrics.grid_charge_count == 5
        assert metrics.protection_bypass_count == 2
        assert metrics.boiler_source_outcomes == {"fve": 3, "grid": 1}
        assert metrics.timestamp == "2024-01-01T12:00:00"


class TestMergeMetrics:
    """Tests for merging multiple metrics instances."""

    def test_merge_empty_list(self):
        """Merging empty list should return empty metrics."""
        merged = merge_metrics([])
        
        assert merged.pv_defer_count == 0
        assert merged.total_decisions == 0

    def test_merge_single_metrics(self):
        """Merging single metrics should return copy."""
        metrics = RolloutMetrics()
        metrics.increment_pv_defer()
        metrics.increment_pv_defer()
        
        merged = merge_metrics([metrics])
        
        assert merged.pv_defer_count == 2

    def test_merge_multiple_metrics(self):
        """Merging multiple metrics should aggregate correctly."""
        m1 = RolloutMetrics()
        m1.increment_pv_defer()
        m1.record_boiler_source("fve")
        
        m2 = RolloutMetrics()
        m2.increment_grid_charge()
        m2.record_boiler_source("grid")
        
        m3 = RolloutMetrics()
        m3.increment_pv_defer()
        m3.record_boiler_source("fve")
        
        merged = merge_metrics([m1, m2, m3])
        
        assert merged.pv_defer_count == 2
        assert merged.grid_charge_count == 1
        assert merged.total_decisions == 3
        assert merged.boiler_source_outcomes == {"fve": 2, "grid": 1}

    def test_merge_uses_latest_timestamp(self):
        """Merged metrics should use most recent timestamp."""
        m1 = RolloutMetrics(timestamp="2024-01-01T10:00:00")
        m2 = RolloutMetrics(timestamp="2024-01-01T12:00:00")
        m3 = RolloutMetrics(timestamp="2024-01-01T11:00:00")
        
        merged = merge_metrics([m1, m2, m3])
        
        assert merged.timestamp == "2024-01-01T12:00:00"


class TestMetricsSnapshot:
    """Tests for metrics snapshot in RolloutGate."""

    def test_snapshot_contains_all_fields(self):
        """Snapshot should contain all relevant metric fields."""
        metrics = RolloutMetrics()
        metrics.increment_pv_defer()
        metrics.increment_grid_charge()
        metrics.record_boiler_source("fve")
        
        gate = evaluate_rollout_health(metrics)
        snapshot = gate.metrics_snapshot
        
        assert "pv_defer_count" in snapshot
        assert "grid_charge_count" in snapshot
        assert "pv_defer_rate" in snapshot
        assert "grid_charge_rate" in snapshot
        assert "protection_bypass_rate" in snapshot
        assert "boiler_source_outcomes" in snapshot
        assert "decision_reason_counts" in snapshot
        assert "pv_first_enabled" in snapshot

    def test_snapshot_isolation(self):
        """Snapshot should not be affected by later metric changes."""
        metrics = RolloutMetrics()
        metrics.increment_pv_defer()
        
        gate = evaluate_rollout_health(metrics)
        snapshot_count = gate.metrics_snapshot["pv_defer_count"]
        
        # Modify original metrics
        metrics.increment_pv_defer()
        metrics.increment_pv_defer()
        
        # Snapshot should still have original value
        assert gate.metrics_snapshot["pv_defer_count"] == snapshot_count
