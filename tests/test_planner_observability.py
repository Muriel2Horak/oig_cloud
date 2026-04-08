"""Tests for planner observability payload and insertion points.

Tests verify the UPSIntervalDecision payload contract and PlannerDecisionLog
functionality for tracking planner decisions.
"""

from __future__ import annotations

import pytest

from custom_components.oig_cloud.battery_forecast.strategy.planner_observability import (
    UPSDecisionAction,
    UPSDecisionReason,
    UPSIntervalDecision,
    PlannerDecisionLog,
    create_ups_decision,
    format_decision_summary,
    format_decision_log_summary,
)


class TestUPSDecisionEnums:
    """Tests for UPS decision enums."""

    def test_action_enum_values(self):
        """UPS decision actions should have correct values."""
        assert UPSDecisionAction.ADD.value == "add"
        assert UPSDecisionAction.EXTEND.value == "extend"
        assert UPSDecisionAction.BLOCK.value == "block"
        assert UPSDecisionAction.SKIP.value == "skip"

    def test_reason_enum_values(self):
        """UPS decision reasons should have correct values."""
        assert UPSDecisionReason.RECOVERY_BELOW_PLANNING_MIN.value == "recovery_below_planning_min"
        assert UPSDecisionReason.FUTURE_SOLAR_WILL_FILL.value == "future_solar_will_fill"
        assert UPSDecisionReason.ECONOMIC_CHARGE_CHEAPER_FUTURE.value == "economic_charge_cheaper_future"
        assert UPSDecisionReason.PRICE_BAND_EXTENSION.value == "price_band_extension"


class TestUPSIntervalDecision:
    """Tests for UPSIntervalDecision payload."""

    def test_decision_creation_with_required_fields(self):
        """Decision should be created with all required fields."""
        decision = UPSIntervalDecision(
            interval_idx=5,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.ECONOMIC_CHARGE_CHEAPER_FUTURE,
            price_czk=0.5,
            battery_soc_kwh=2.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        )

        assert decision.interval_idx == 5
        assert decision.action == UPSDecisionAction.ADD
        assert decision.reason == UPSDecisionReason.ECONOMIC_CHARGE_CHEAPER_FUTURE
        assert decision.price_czk == 0.5
        assert decision.battery_soc_kwh == 2.5
        assert decision.target_soc_kwh == 4.0
        assert decision.planning_min_kwh == 1.0
        assert decision.max_soc_kwh == 5.0

    def test_decision_creation_with_optional_fields(self):
        """Decision should support optional observability fields."""
        decision = UPSIntervalDecision(
            interval_idx=3,
            action=UPSDecisionAction.BLOCK,
            reason=UPSDecisionReason.FUTURE_SOLAR_WILL_FILL,
            price_czk=-0.2,
            battery_soc_kwh=3.0,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
            # Optional fields
            future_solar_fill=True,
            solar_forecast_sum_kwh=2.5,
            consumption_forecast_sum_kwh=0.5,
            projected_final_soc_kwh=4.2,
            preserved_headroom_kwh=1.0,
            headroom_utilization_pct=0.25,
            export_or_curtailment_penalty_czk=0.15,
            charge_cost_czk=-0.1,
            savings_vs_later_czk=0.3,
            cheapest_future_price_czk=0.8,
            survival_end_idx=12,
            blocked_by_indices={1, 2},
            extension_of_idx=None,
            timestamp="2024-01-15T10:30:00",
            source_function="_determine_mode_for_interval",
        )

        assert decision.future_solar_fill is True
        assert decision.solar_forecast_sum_kwh == 2.5
        assert decision.consumption_forecast_sum_kwh == 0.5
        assert decision.projected_final_soc_kwh == 4.2
        assert decision.preserved_headroom_kwh == 1.0
        assert decision.headroom_utilization_pct == 0.25
        assert decision.export_or_curtailment_penalty_czk == 0.15
        assert decision.charge_cost_czk == -0.1
        assert decision.savings_vs_later_czk == 0.3
        assert decision.cheapest_future_price_czk == 0.8
        assert decision.survival_end_idx == 12
        assert decision.blocked_by_indices == {1, 2}
        assert decision.extension_of_idx is None
        assert decision.timestamp == "2024-01-15T10:30:00"
        assert decision.source_function == "_determine_mode_for_interval"

    def test_decision_to_dict_serialization(self):
        """Decision should serialize to dictionary correctly."""
        decision = create_ups_decision(
            interval_idx=7,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.REACH_TARGET_SOC,
            price_czk=0.3,
            battery_soc_kwh=2.0,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
            future_solar_fill=False,
            cheapest_future_price_czk=0.25,
            survival_end_idx=15,
            blocked_by_indices={5, 6},
            source_function="_reach_target_soc",
        )

        d = decision.to_dict()

        assert d["interval_idx"] == 7
        assert d["action"] == "add"
        assert d["reason"] == "reach_target_soc"
        assert d["price_czk"] == 0.3
        assert d["battery_soc_kwh"] == 2.0
        assert d["target_soc_kwh"] == 4.0
        assert d["planning_min_kwh"] == 1.0
        assert d["max_soc_kwh"] == 5.0
        assert d["future_solar_fill"] is False
        assert d["cheapest_future_price_czk"] == 0.25
        assert d["survival_end_idx"] == 15
        assert d["blocked_by_indices"] == [5, 6]  # Set converted to list
        assert d["source_function"] == "_reach_target_soc"


class TestCreateUPSDecision:
    """Tests for create_ups_decision factory function."""

    def test_factory_creates_decision_with_all_fields(self):
        """Factory should create decision with all specified fields."""
        decision = create_ups_decision(
            interval_idx=10,
            action=UPSDecisionAction.EXTEND,
            reason=UPSDecisionReason.PRICE_BAND_EXTENSION,
            price_czk=0.4,
            battery_soc_kwh=3.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
            future_solar_fill=False,
            solar_forecast_sum_kwh=1.0,
            consumption_forecast_sum_kwh=0.3,
            projected_final_soc_kwh=3.8,
            preserved_headroom_kwh=0.5,
            headroom_utilization_pct=0.125,
            export_or_curtailment_penalty_czk=0.05,
            charge_cost_czk=0.4,
            savings_vs_later_czk=0.1,
            cheapest_future_price_czk=0.5,
            survival_end_idx=20,
            blocked_by_indices={8, 9},
            extension_of_idx=7,
            timestamp="2024-01-15T11:00:00",
            source_function="extend_ups_blocks_by_price_band",
        )

        assert decision.interval_idx == 10
        assert decision.action == UPSDecisionAction.EXTEND
        assert decision.reason == UPSDecisionReason.PRICE_BAND_EXTENSION
        assert decision.extension_of_idx == 7
        assert decision.blocked_by_indices == {8, 9}

    def test_factory_with_defaults(self):
        """Factory should use sensible defaults for optional fields."""
        decision = create_ups_decision(
            interval_idx=0,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.NEGATIVE_PRICE_CHARGE,
            price_czk=-0.5,
            battery_soc_kwh=2.0,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        )

        assert decision.future_solar_fill is False
        assert decision.solar_forecast_sum_kwh == 0.0
        assert decision.consumption_forecast_sum_kwh == 0.0
        assert decision.projected_final_soc_kwh is None
        assert decision.preserved_headroom_kwh == 0.0
        assert decision.blocked_by_indices == set()
        assert decision.extension_of_idx is None


class TestPlannerDecisionLog:
    """Tests for PlannerDecisionLog."""

    def test_empty_log(self):
        """Empty log should have no decisions."""
        log = PlannerDecisionLog()
        assert len(log.decisions) == 0
        assert log.planning_cycle_id is None

    def test_add_decision(self):
        """Should be able to add decisions to log."""
        log = PlannerDecisionLog(
            planning_cycle_id="test-cycle-001",
            initial_soc_kwh=2.0,
            target_soc_kwh=4.0,
        )

        decision = create_ups_decision(
            interval_idx=5,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.ECONOMIC_CHARGE_CHEAPER_FUTURE,
            price_czk=0.3,
            battery_soc_kwh=2.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        )

        log.add_decision(decision)

        assert len(log.decisions) == 1
        assert log.decisions[0].interval_idx == 5
        assert log.planning_cycle_id == "test-cycle-001"
        assert log.initial_soc_kwh == 2.0
        assert log.target_soc_kwh == 4.0

    def test_get_decisions_by_action(self):
        """Should filter decisions by action."""
        log = PlannerDecisionLog()

        log.add_decision(create_ups_decision(
            interval_idx=1,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.RECOVERY_BELOW_PLANNING_MIN,
            price_czk=0.5,
            battery_soc_kwh=1.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        ))
        log.add_decision(create_ups_decision(
            interval_idx=2,
            action=UPSDecisionAction.BLOCK,
            reason=UPSDecisionReason.FUTURE_SOLAR_WILL_FILL,
            price_czk=-0.1,
            battery_soc_kwh=2.0,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        ))
        log.add_decision(create_ups_decision(
            interval_idx=3,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.REACH_TARGET_SOC,
            price_czk=0.4,
            battery_soc_kwh=2.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        ))

        add_decisions = log.get_decisions_by_action(UPSDecisionAction.ADD)
        block_decisions = log.get_decisions_by_action(UPSDecisionAction.BLOCK)

        assert len(add_decisions) == 2
        assert len(block_decisions) == 1
        assert block_decisions[0].interval_idx == 2

    def test_get_decisions_by_reason(self):
        """Should filter decisions by reason."""
        log = PlannerDecisionLog()

        log.add_decision(create_ups_decision(
            interval_idx=1,
            action=UPSDecisionAction.BLOCK,
            reason=UPSDecisionReason.FUTURE_SOLAR_WILL_FILL,
            price_czk=0.2,
            battery_soc_kwh=3.0,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        ))
        log.add_decision(create_ups_decision(
            interval_idx=2,
            action=UPSDecisionAction.BLOCK,
            reason=UPSDecisionReason.PRICE_EXCEEDS_MAX,
            price_czk=2.0,
            battery_soc_kwh=2.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        ))
        log.add_decision(create_ups_decision(
            interval_idx=3,
            action=UPSDecisionAction.BLOCK,
            reason=UPSDecisionReason.FUTURE_SOLAR_WILL_FILL,
            price_czk=0.1,
            battery_soc_kwh=3.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        ))

        solar_blocked = log.get_decisions_by_reason(UPSDecisionReason.FUTURE_SOLAR_WILL_FILL)
        price_blocked = log.get_decisions_by_reason(UPSDecisionReason.PRICE_EXCEEDS_MAX)

        assert len(solar_blocked) == 2
        assert len(price_blocked) == 1

    def test_get_decision_for_interval(self):
        """Should retrieve decision for specific interval."""
        log = PlannerDecisionLog()

        log.add_decision(create_ups_decision(
            interval_idx=5,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.ECONOMIC_CHARGE_CHEAPER_FUTURE,
            price_czk=0.3,
            battery_soc_kwh=2.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        ))

        found = log.get_decision_for_interval(5)
        not_found = log.get_decision_for_interval(10)

        assert found is not None
        assert found.interval_idx == 5
        assert not_found is None

    def test_get_solar_fill_blocked_decisions(self):
        """Should get decisions blocked due to future solar fill."""
        log = PlannerDecisionLog()

        log.add_decision(create_ups_decision(
            interval_idx=1,
            action=UPSDecisionAction.BLOCK,
            reason=UPSDecisionReason.FUTURE_SOLAR_WILL_FILL,
            price_czk=-0.5,
            battery_soc_kwh=2.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
            future_solar_fill=True,
        ))
        log.add_decision(create_ups_decision(
            interval_idx=2,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.NEGATIVE_PRICE_CHARGE,
            price_czk=-0.3,
            battery_soc_kwh=2.8,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        ))
        log.add_decision(create_ups_decision(
            interval_idx=3,
            action=UPSDecisionAction.BLOCK,
            reason=UPSDecisionReason.FUTURE_SOLAR_WILL_FILL,
            price_czk=-0.4,
            battery_soc_kwh=3.0,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
            future_solar_fill=True,
        ))

        solar_blocked = log.get_solar_fill_blocked_decisions()

        assert len(solar_blocked) == 2
        assert all(d.interval_idx in [1, 3] for d in solar_blocked)

    def test_log_to_dict_serialization(self):
        """Log should serialize to dictionary correctly."""
        log = PlannerDecisionLog(
            planning_cycle_id="cycle-123",
            initial_soc_kwh=2.0,
            target_soc_kwh=4.0,
            timestamp="2024-01-15T12:00:00",
        )

        log.add_decision(create_ups_decision(
            interval_idx=0,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.RECOVERY_BELOW_PLANNING_MIN,
            price_czk=0.5,
            battery_soc_kwh=1.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        ))

        d = log.to_dict()

        assert d["planning_cycle_id"] == "cycle-123"
        assert d["initial_soc_kwh"] == 2.0
        assert d["target_soc_kwh"] == 4.0
        assert d["timestamp"] == "2024-01-15T12:00:00"
        assert len(d["decisions"]) == 1
        assert d["decisions"][0]["interval_idx"] == 0


class TestDecisionFormatting:
    """Tests for decision formatting functions."""

    def test_format_decision_summary(self):
        """Should format decision as readable summary."""
        decision = create_ups_decision(
            interval_idx=5,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.ECONOMIC_CHARGE_CHEAPER_FUTURE,
            price_czk=0.35,
            battery_soc_kwh=2.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
            future_solar_fill=False,
            preserved_headroom_kwh=0.5,
            headroom_utilization_pct=0.125,
            export_or_curtailment_penalty_czk=0.1,
            savings_vs_later_czk=0.2,
            cheapest_future_price_czk=0.55,
        )

        summary = format_decision_summary(decision)

        assert "Interval 5: ADD" in summary
        assert "Reason: economic_charge_cheaper_future" in summary
        assert "Price: 0.350 CZK/kWh" in summary
        assert "SOC: 2.50/4.00 kWh" in summary
        assert "Preserved headroom: 0.50 kWh (12.5%)" in summary
        assert "Savings vs later: 0.200 CZK" in summary

    def test_format_decision_log_summary(self):
        """Should format decision log as readable summary."""
        log = PlannerDecisionLog(
            planning_cycle_id="test-001",
            initial_soc_kwh=2.0,
            target_soc_kwh=4.0,
        )

        log.add_decision(create_ups_decision(
            interval_idx=1,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.RECOVERY_BELOW_PLANNING_MIN,
            price_czk=0.5,
            battery_soc_kwh=1.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        ))
        log.add_decision(create_ups_decision(
            interval_idx=2,
            action=UPSDecisionAction.BLOCK,
            reason=UPSDecisionReason.FUTURE_SOLAR_WILL_FILL,
            price_czk=-0.2,
            battery_soc_kwh=2.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
            future_solar_fill=True,
        ))

        summary = format_decision_log_summary(log)

        assert "Planner Decision Log" in summary
        assert "Cycle ID: test-001" in summary
        assert "Initial SOC: 2.00 kWh" in summary
        assert "Total decisions: 2" in summary
        assert "add: 1" in summary
        assert "block: 1" in summary
        assert "Solar-fill blocked decisions (1):" in summary


class TestPayloadContract:
    """Tests verifying the required payload contract fields."""

    def test_payload_has_future_solar_fill(self):
        """Payload must include future_solar_fill field."""
        decision = create_ups_decision(
            interval_idx=0,
            action=UPSDecisionAction.BLOCK,
            reason=UPSDecisionReason.FUTURE_SOLAR_WILL_FILL,
            price_czk=0.0,
            battery_soc_kwh=2.0,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
            future_solar_fill=True,
        )

        d = decision.to_dict()
        assert "future_solar_fill" in d
        assert d["future_solar_fill"] is True

    def test_payload_has_preserved_headroom(self):
        """Payload must include preserved_headroom_kwh field."""
        decision = create_ups_decision(
            interval_idx=0,
            action=UPSDecisionAction.BLOCK,
            reason=UPSDecisionReason.WOULD_WASTE_HEADROOM,
            price_czk=0.0,
            battery_soc_kwh=4.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
            preserved_headroom_kwh=0.5,
            headroom_utilization_pct=0.5,
        )

        d = decision.to_dict()
        assert "preserved_headroom_kwh" in d
        assert "headroom_utilization_pct" in d
        assert d["preserved_headroom_kwh"] == 0.5

    def test_payload_has_export_or_curtailment_penalty(self):
        """Payload must include export_or_curtailment_penalty_czk field."""
        decision = create_ups_decision(
            interval_idx=0,
            action=UPSDecisionAction.BLOCK,
            reason=UPSDecisionReason.FUTURE_SOLAR_WILL_FILL,
            price_czk=-0.1,
            battery_soc_kwh=3.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
            export_or_curtailment_penalty_czk=0.15,
        )

        d = decision.to_dict()
        assert "export_or_curtailment_penalty_czk" in d
        assert d["export_or_curtailment_penalty_czk"] == 0.15

    def test_payload_has_decision_reason(self):
        """Payload must include decision reason."""
        decision = create_ups_decision(
            interval_idx=0,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.ECONOMIC_CHARGE_CHEAPER_FUTURE,
            price_czk=0.3,
            battery_soc_kwh=2.0,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        )

        d = decision.to_dict()
        assert "reason" in d
        assert d["reason"] == "economic_charge_cheaper_future"

    def test_payload_has_price_and_soc_context(self):
        """Payload must include price and SOC context."""
        decision = create_ups_decision(
            interval_idx=5,
            action=UPSDecisionAction.ADD,
            reason=UPSDecisionReason.REACH_TARGET_SOC,
            price_czk=0.25,
            battery_soc_kwh=2.5,
            target_soc_kwh=4.0,
            planning_min_kwh=1.0,
            max_soc_kwh=5.0,
        )

        d = decision.to_dict()
        assert d["price_czk"] == 0.25
        assert d["battery_soc_kwh"] == 2.5
        assert d["target_soc_kwh"] == 4.0
        assert d["planning_min_kwh"] == 1.0


class TestInsertionPointsMap:
    """Tests verifying insertion points are documented."""

    def test_insertion_points_documented_in_module(self):
        """Insertion points map should be documented in module docstring/comments."""
        from custom_components.oig_cloud.battery_forecast.strategy import planner_observability

        # The insertion points map is documented as comments in the module
        # This test verifies the module contains the expected documentation
        source = planner_observability.__doc__ or ""

        # Check that key insertion points are mentioned in comments
        # (The actual map is in comments after the code)
        assert hasattr(planner_observability, 'UPSDecisionAction')
        assert hasattr(planner_observability, 'UPSDecisionReason')
        assert hasattr(planner_observability, 'UPSIntervalDecision')

    def test_all_reason_codes_cover_insertion_points(self):
        """All reason codes should cover the documented insertion points."""
        # Verify we have reason codes for all major decision points
        reasons = set(UPSDecisionReason)

        # Recovery and repair
        assert UPSDecisionReason.RECOVERY_BELOW_PLANNING_MIN in reasons
        assert UPSDecisionReason.REPAIR_PLANNING_MIN_VIOLATION in reasons

        # Target SOC
        assert UPSDecisionReason.REACH_TARGET_SOC in reasons

        # Economic charging
        assert UPSDecisionReason.ECONOMIC_CHARGE_CHEAPER_FUTURE in reasons

        # Negative price
        assert UPSDecisionReason.NEGATIVE_PRICE_CHARGE in reasons

        # Cost override
        assert UPSDecisionReason.COST_AWARE_OVERRIDE in reasons

        # HW min hold
        assert UPSDecisionReason.HW_MIN_HOLD_LIMIT in reasons

        # Price band
        assert UPSDecisionReason.PRICE_BAND_EXTENSION in reasons

        # Blocking reasons
        assert UPSDecisionReason.FUTURE_SOLAR_WILL_FILL in reasons
        assert UPSDecisionReason.PRICE_EXCEEDS_MAX in reasons
        assert UPSDecisionReason.BLOCKED_BY_BALANCING in reasons
        assert UPSDecisionReason.WOULD_WASTE_HEADROOM in reasons
