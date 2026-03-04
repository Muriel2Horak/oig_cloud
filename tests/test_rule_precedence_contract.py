"""Tests for the precedence contract module.

Validates:
1. Total order property - no ambiguous ordering
2. Deterministic tie-breakers
3. Invariant consistency
"""

from __future__ import annotations

import pytest

from custom_components.oig_cloud.battery_forecast.planning.precedence_contract import (
    INVARIANTS,
    PRECEDENCE_LADDER,
    PrecedenceLevel,
    get_levels_between,
    get_precedence_for_rule,
    get_precedence_rank,
    get_precedence_summary,
    is_higher_priority,
    resolve_conflict,
    resolve_conflict_with_context,
    validate_total_order,
)


class TestPrecedenceLevel:
    """Tests for PrecedenceLevel enum."""

    def test_all_levels_have_unique_values(self):
        """Each precedence level must have a unique numeric value."""
        values = [level.value for level in PrecedenceLevel]
        assert len(values) == len(set(values)), "Duplicate values found"

    def test_values_are_spaced_by_multiples_of_50(self):
        """Values should be spaced by multiples of 50 to allow intermediate levels."""
        values = sorted([level.value for level in PrecedenceLevel], reverse=True)
        for i in range(len(values) - 1):
            diff = values[i] - values[i + 1]
            assert diff % 50 == 0 and diff >= 50, f"Gap between {values[i]} and {values[i+1]} is {diff}, expected multiple of 50 and >= 50"

    def test_pv_first_is_highest(self):
        """PV_FIRST must have the highest numeric value."""
        assert PrecedenceLevel.PV_FIRST.value == 1000
        for level in PrecedenceLevel:
            if level != PrecedenceLevel.PV_FIRST:
                assert PrecedenceLevel.PV_FIRST > level

    def test_planning_target_is_lowest(self):
        """PLANNING_TARGET must have the lowest numeric value."""
        assert PrecedenceLevel.PLANNING_TARGET.value == 100
        for level in PrecedenceLevel:
            if level != PrecedenceLevel.PLANNING_TARGET:
                assert level > PrecedenceLevel.PLANNING_TARGET

    def test_level_count(self):
        """There should be exactly 11 precedence levels (including PRE_PEAK_AVOIDANCE)."""
        assert len(list(PrecedenceLevel)) == 11


class TestPrecedenceLadder:
    """Tests for PRECEDENCE_LADDER ordering."""

    def test_ladder_has_all_levels(self):
        """Ladder must contain all PrecedenceLevel values."""
        assert set(PRECEDENCE_LADDER) == set(PrecedenceLevel)

    def test_ladder_is_strictly_decreasing(self):
        """Ladder must be ordered from highest to lowest priority."""
        for i in range(len(PRECEDENCE_LADDER) - 1):
            assert PRECEDENCE_LADDER[i] > PRECEDENCE_LADDER[i + 1], (
                f"Ladder not decreasing at index {i}: "
                f"{PRECEDENCE_LADDER[i]} <= {PRECEDENCE_LADDER[i + 1]}"
            )

    def test_ladder_matches_enum_order(self):
        """Ladder order should match expected semantic ordering."""
        expected_order = [
            PrecedenceLevel.PV_FIRST,
            PrecedenceLevel.PROTECTION_SAFETY,
            PrecedenceLevel.PRE_PEAK_AVOIDANCE,
            PrecedenceLevel.DEATH_VALLEY,
            PrecedenceLevel.BALANCING_OVERRIDE,
            PrecedenceLevel.MODE_GUARD,
            PrecedenceLevel.RECOVERY_MODE,
            PrecedenceLevel.ECONOMIC_CHARGING,
            PrecedenceLevel.OPPORTUNISTIC,
            PrecedenceLevel.AUTO_SWITCH,
            PrecedenceLevel.PLANNING_TARGET,
        ]
        assert PRECEDENCE_LADDER == expected_order


class TestPriorityOrderIsTotal:
    """Tests proving the ordering is total (no ambiguous ordering)."""

    def test_priority_order_is_total(self):
        """For any two distinct levels, exactly one is greater than the other."""
        levels = list(PrecedenceLevel)
        for i, level_a in enumerate(levels):
            for level_b in levels[i + 1 :]:
                # Exactly one must be greater
                assert level_a != level_b
                assert (level_a > level_b) != (level_b > level_a)

    def test_no_cycles_in_ordering(self):
        """Transitivity must hold: if A > B and B > C, then A > C."""
        levels = list(PrecedenceLevel)
        for a in levels:
            for b in levels:
                for c in levels:
                    if a > b and b > c:
                        assert a > c, f"Cycle detected: {a} > {b} > {c} but not {a} > {c}"

    def test_validate_total_order_returns_true(self):
        """The validate_total_order function should return True."""
        assert validate_total_order() is True

    def test_totality_for_all_pairs(self):
        """For any two distinct levels, one must be greater (totality)."""
        levels = list(PrecedenceLevel)
        for i, level_a in enumerate(levels):
            for level_b in levels[i + 1 :]:
                # At least one comparison must be true (totality)
                assert level_a > level_b or level_b > level_a

    def test_antisymmetry(self):
        """If A > B, then NOT B > A (antisymmetry)."""
        levels = list(PrecedenceLevel)
        for level_a in levels:
            for level_b in levels:
                if level_a > level_b:
                    assert not (level_b > level_a)


class TestTieBreakersAreDeterministic:
    """Tests proving tie-breakers are deterministic."""

    def test_tie_breakers_are_deterministic(self):
        """resolve_conflict must be deterministic - same inputs always give same output."""
        # Test all pairs including equal pairs
        for level_a in PrecedenceLevel:
            for level_b in PrecedenceLevel:
                result1 = resolve_conflict(level_a, level_b)
                result2 = resolve_conflict(level_a, level_b)
                result3 = resolve_conflict(level_a, level_b)
                assert result1 == result2 == result3

    def test_equal_levels_return_first(self):
        """When levels are equal, first-wins rule applies."""
        for level in PrecedenceLevel:
            result = resolve_conflict(level, level)
            assert result == level, f"Equal levels should return the level itself: {level}"

    def test_higher_priority_always_wins(self):
        """Higher priority level always wins regardless of argument order."""
        for level_a in PrecedenceLevel:
            for level_b in PrecedenceLevel:
                result_ab = resolve_conflict(level_a, level_b)
                result_ba = resolve_conflict(level_b, level_a)
                # Both should return the same winner (the higher one)
                assert result_ab == result_ba, (
                    f"Non-deterministic: resolve({level_a}, {level_b})={result_ab} "
                    f"but resolve({level_b}, {level_a})={result_ba}"
                )
                # The winner should be the max
                assert result_ab == max(level_a, level_b)

    def test_resolve_conflict_is_pure_function(self):
        """resolve_conflict should have no side effects."""
        import inspect

        # Check that the function doesn't modify global state
        source = inspect.getsource(resolve_conflict)
        # Pure function shouldn't have global declarations or external calls
        assert "global " not in source
        assert "random" not in source
        assert "time." not in source

    def test_resolve_conflict_with_context_is_deterministic(self):
        """resolve_conflict_with_context must also be deterministic."""
        for level_a in PrecedenceLevel:
            for level_b in PrecedenceLevel:
                result1, reason1 = resolve_conflict_with_context(level_a, level_b)
                result2, reason2 = resolve_conflict_with_context(level_a, level_b)
                assert result1 == result2
                assert reason1 == reason2

    def test_tie_breaker_reason_string_for_equal(self):
        """Tie-breaker reason should indicate first-wins for equal levels."""
        level = PrecedenceLevel.ECONOMIC_CHARGING
        winner, reason = resolve_conflict_with_context(level, level)
        assert winner == level
        assert "tie" in reason.lower()
        assert "first-wins" in reason.lower()


class TestResolveConflict:
    """Tests for resolve_conflict function."""

    def test_pv_first_wins_over_all(self):
        """PV_FIRST must win over all other levels."""
        for level in PrecedenceLevel:
            if level != PrecedenceLevel.PV_FIRST:
                assert resolve_conflict(PrecedenceLevel.PV_FIRST, level) == PrecedenceLevel.PV_FIRST
                assert resolve_conflict(level, PrecedenceLevel.PV_FIRST) == PrecedenceLevel.PV_FIRST

    def test_protection_wins_over_economic(self):
        """Protection must win over economic charging."""
        assert resolve_conflict(
            PrecedenceLevel.PROTECTION_SAFETY, PrecedenceLevel.ECONOMIC_CHARGING
        ) == PrecedenceLevel.PROTECTION_SAFETY
        assert resolve_conflict(
            PrecedenceLevel.ECONOMIC_CHARGING, PrecedenceLevel.PROTECTION_SAFETY
        ) == PrecedenceLevel.PROTECTION_SAFETY

    def test_death_valley_wins_over_opportunistic(self):
        """Death valley enforcement must win over opportunistic."""
        assert resolve_conflict(
            PrecedenceLevel.DEATH_VALLEY, PrecedenceLevel.OPPORTUNISTIC
        ) == PrecedenceLevel.DEATH_VALLEY

    def test_balancing_wins_over_auto_switch(self):
        """Balancing override must win over auto-switch."""
        assert resolve_conflict(
            PrecedenceLevel.BALANCING_OVERRIDE, PrecedenceLevel.AUTO_SWITCH
        ) == PrecedenceLevel.BALANCING_OVERRIDE


class TestInvariants:
    """Tests for INVARIANTS list."""

    def test_invariants_not_empty(self):
        """There must be at least one invariant defined."""
        assert len(INVARIANTS) > 0

    def test_invariants_are_strings(self):
        """All invariants must be strings (documentation)."""
        for invariant in INVARIANTS:
            assert isinstance(invariant, str)

    def test_invariants_contain_key_rules(self):
        """Invariants must mention key precedence concepts."""
        all_invariants = " ".join(INVARIANTS)
        assert "PV_FIRST" in all_invariants or "PV-FIRST" in all_invariants
        assert "PROTECTION" in all_invariants
        assert "DEATH_VALLEY" in all_invariants or "death-valley" in all_invariants.lower()
        assert "TOTAL_ORDER" in all_invariants or "total order" in all_invariants.lower()

    def test_pv_first_invariant_present(self):
        """PV_FIRST invariant must be defined."""
        pv_invariants = [i for i in INVARIANTS if "PV_FIRST" in i or "PV-FIRST" in i]
        assert len(pv_invariants) >= 2  # At least 2 PV-related invariants

    def test_total_order_invariant_present(self):
        """Total order invariant must be defined."""
        total_invariants = [i for i in INVARIANTS if "TOTAL_ORDER" in i or "total order" in i.lower()]
        assert len(total_invariants) >= 1


class TestHelperFunctions:
    """Tests for helper functions."""

    def test_get_precedence_rank(self):
        """get_precedence_rank should return correct 1-indexed position."""
        assert get_precedence_rank(PrecedenceLevel.PV_FIRST) == 1
        assert get_precedence_rank(PrecedenceLevel.PLANNING_TARGET) == 11
        assert get_precedence_rank(PrecedenceLevel.PROTECTION_SAFETY) == 2

    def test_is_higher_priority(self):
        """is_higher_priority should return correct comparison."""
        assert is_higher_priority(PrecedenceLevel.PV_FIRST, PrecedenceLevel.ECONOMIC_CHARGING)
        assert not is_higher_priority(PrecedenceLevel.ECONOMIC_CHARGING, PrecedenceLevel.PV_FIRST)
        assert not is_higher_priority(PrecedenceLevel.ECONOMIC_CHARGING, PrecedenceLevel.ECONOMIC_CHARGING)

    def test_get_levels_between(self):
        """get_levels_between should return correct levels."""
        between = get_levels_between(PrecedenceLevel.PLANNING_TARGET, PrecedenceLevel.DEATH_VALLEY)
        # Should include: BALANCING_OVERRIDE, MODE_GUARD, RECOVERY_MODE, ECONOMIC_CHARGING, OPPORTUNISTIC, AUTO_SWITCH
        assert PrecedenceLevel.BALANCING_OVERRIDE in between
        assert PrecedenceLevel.MODE_GUARD in between
        assert PrecedenceLevel.ECONOMIC_CHARGING in between
        # Should NOT include the bounds
        assert PrecedenceLevel.DEATH_VALLEY not in between
        assert PrecedenceLevel.PLANNING_TARGET not in between

    def test_get_precedence_for_rule(self):
        """get_precedence_for_rule should map rules to levels."""
        assert get_precedence_for_rule("GR-010") == PrecedenceLevel.PROTECTION_SAFETY
        assert get_precedence_for_rule("PV-001") == PrecedenceLevel.PV_FIRST
        assert get_precedence_for_rule("BA-021") == PrecedenceLevel.BALANCING_OVERRIDE
        assert get_precedence_for_rule("NONEXISTENT") is None

    def test_get_precedence_summary(self):
        """get_precedence_summary should return formatted string."""
        summary = get_precedence_summary()
        assert "PRECEDENCE CONTRACT SUMMARY" in summary
        assert "PV_FIRST" in summary
        assert "Total levels: 11" in summary
        assert "Total order valid: True" in summary


class TestContractIntegration:
    """Integration tests for the contract as a whole."""

    def test_contract_is_importable_without_dependencies(self):
        """Contract module must be importable without HA or runtime dependencies."""
        import custom_components.oig_cloud.battery_forecast.planning.precedence_contract as pc

        module_names = dir(pc)
        module_names_str = " ".join(module_names).lower()
        assert "homeassistant" not in module_names_str
        assert "coordinator" not in module_names_str

    def test_all_rule_ids_have_precedence(self):
        """All known rule IDs should map to a precedence level."""
        known_rules = [
            "PV-001", "PV-002", "PV-003",
            "GR-010", "SOC-003", "SOC-006", "SOC-013", "BA-001",
            "SOC-004", "SOC-016", "BA-019",
            "BA-021", "BA-022", "BA-024",
            "AS-012", "AS-013",
            "GR-001", "GR-008",
            "GR-004", "GR-005", "PR-001", "PR-004",
            "BA-011", "BA-012", "BA-007",
            "AS-007", "AS-009",
            "SOC-001", "SOC-002",
        ]
        for rule_id in known_rules:
            level = get_precedence_for_rule(rule_id)
            assert level is not None, f"Rule {rule_id} has no precedence mapping"
            assert isinstance(level, PrecedenceLevel)

    def test_precedence_values_support_comparison(self):
        """PrecedenceLevel values must support all comparison operations."""
        assert PrecedenceLevel.PV_FIRST > PrecedenceLevel.ECONOMIC_CHARGING
        assert PrecedenceLevel.ECONOMIC_CHARGING < PrecedenceLevel.PV_FIRST
        assert PrecedenceLevel.ECONOMIC_CHARGING <= PrecedenceLevel.PV_FIRST
        assert PrecedenceLevel.PV_FIRST >= PrecedenceLevel.ECONOMIC_CHARGING
        assert PrecedenceLevel.ECONOMIC_CHARGING == PrecedenceLevel.ECONOMIC_CHARGING
        assert PrecedenceLevel.ECONOMIC_CHARGING != PrecedenceLevel.PV_FIRST
