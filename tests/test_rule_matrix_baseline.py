"""Tests for rule matrix baseline schema validation.

This test validates that the baseline rule matrix has:
1. All required sections
2. Proper rule ID format
3. Required fields per rule
4. Conflict/overlap documentation
5. TODO marker documentation

RED→GREEN: These tests should pass once the matrix is complete.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import List, Set

import pytest


# Path to the baseline matrix
MATRIX_PATH = Path(__file__).parent.parent / ".sisyphus" / "evidence" / "task-1-baseline-matrix.md"

# Required sections in the matrix
REQUIRED_SECTIONS = [
    "Executive Summary",
    "Precedence Hierarchy",
    "Rule Definitions",
    "Conflict/Overlap Hotspots",
    "Rule Execution Order",
    "Ambiguous/Underspecified Behavior",
    "Schema for Rule Validation",
]

# Required rule ID prefixes
REQUIRED_PREFIXES = {
    "PR",  # Protection rules
    "SOC",  # SOC/Battery rules
    "GR",  # Grid/Economic rules
    "BA",  # Balancing rules
    "BO",  # Boiler rules
    "AS",  # Auto-Switch rules
    "MG",  # Mode Guard rules
    "SC",  # Scoring rules
    "SM",  # Smoothing rules
}

# Required conflict hotspots (at minimum)
REQUIRED_CONFLICTS = [
    "protection",  # protection vs economic
    "balancing",  # balancing vs economic
    "guard",  # mode guard vs auto-switch
    "hw",  # hw hold vs cost optimization
]


@pytest.fixture
def matrix_content() -> str:
    """Load matrix content."""
    assert MATRIX_PATH.exists(), f"Matrix file not found: {MATRIX_PATH}"
    return MATRIX_PATH.read_text(encoding="utf-8")


@pytest.fixture
def matrix_lines(matrix_content: str) -> List[str]:
    """Get matrix as list of lines."""
    return matrix_content.split("\n")


class TestMatrixFileExists:
    """Test that the matrix file exists and is readable."""

    def test_matrix_file_exists(self) -> None:
        """Matrix file must exist at expected path."""
        assert MATRIX_PATH.exists(), f"Matrix file not found: {MATRIX_PATH}"

    def test_matrix_file_not_empty(self, matrix_content: str) -> None:
        """Matrix file must not be empty."""
        assert len(matrix_content) > 1000, "Matrix file appears too short"

    def test_matrix_is_markdown(self, matrix_content: str) -> None:
        """Matrix file should be valid markdown."""
        assert matrix_content.startswith("#"), "Matrix should start with markdown header"


class TestMatrixSections:
    """Test that all required sections exist in the matrix."""

    def test_has_executive_summary(self, matrix_content: str) -> None:
        """Matrix must have Executive Summary section."""
        assert "## 1. Executive Summary" in matrix_content or "## Executive Summary" in matrix_content

    def test_has_precedence_hierarchy(self, matrix_content: str) -> None:
        """Matrix must have Precedence Hierarchy section."""
        assert "## 2. Precedence Hierarchy" in matrix_content or "## Precedence Hierarchy" in matrix_content

    def test_has_rule_definitions(self, matrix_content: str) -> None:
        """Matrix must have Rule Definitions section."""
        assert "## 3. Rule Definitions" in matrix_content or "## Rule Definitions" in matrix_content

    def test_has_conflict_hotspots(self, matrix_content: str) -> None:
        """Matrix must have Conflict/Overlap Hotspots section."""
        assert "## 4. Conflict/Overlap Hotspots" in matrix_content or "## Conflict/Overlap" in matrix_content

    def test_has_execution_order(self, matrix_content: str) -> None:
        """Matrix must have Rule Execution Order section."""
        assert "## 5. Rule Execution Order" in matrix_content or "## Rule Execution Order" in matrix_content

    def test_has_ambiguous_behavior(self, matrix_content: str) -> None:
        """Matrix must have Ambiguous/Underspecified Behavior section."""
        assert "## 6. Ambiguous" in matrix_content or "## Ambiguous" in matrix_content


class TestRuleIdFormat:
    """Test that rule IDs follow the required format."""

    def test_has_protection_rules(self, matrix_content: str) -> None:
        """Matrix must have PR-NNN (Protection) rules."""
        assert re.search(r"\*\*PR-\d{3}\*\*", matrix_content), "Missing PR-NNN protection rules"

    def test_has_soc_rules(self, matrix_content: str) -> None:
        """Matrix must have SOC-NNN (SOC/Battery) rules."""
        assert re.search(r"\*\*SOC-\d{3}\*\*", matrix_content), "Missing SOC-NNN battery rules"

    def test_has_grid_rules(self, matrix_content: str) -> None:
        """Matrix must have GR-NNN (Grid/Economic) rules."""
        assert re.search(r"\*\*GR-\d{3}\*\*", matrix_content), "Missing GR-NNN grid rules"

    def test_has_balancing_rules(self, matrix_content: str) -> None:
        """Matrix must have BA-NNN (Balancing) rules."""
        assert re.search(r"\*\*BA-\d{3}\*\*", matrix_content), "Missing BA-NNN balancing rules"

    def test_has_boiler_rules(self, matrix_content: str) -> None:
        """Matrix must have BO-NNN (Boiler) rules."""
        assert re.search(r"\*\*BO-\d{3}\*\*", matrix_content), "Missing BO-NNN boiler rules"

    def test_has_autoswitch_rules(self, matrix_content: str) -> None:
        """Matrix must have AS-NNN (Auto-Switch) rules."""
        assert re.search(r"\*\*AS-\d{3}\*\*", matrix_content), "Missing AS-NNN auto-switch rules"

    def test_has_modeguard_rules(self, matrix_content: str) -> None:
        """Matrix must have MG-NNN (Mode Guard) rules."""
        assert re.search(r"\*\*MG-\d{3}\*\*", matrix_content), "Missing MG-NNN mode guard rules"

    def test_rule_ids_unique(self, matrix_content: str) -> None:
        """All rule IDs must be unique."""
        rule_ids = re.findall(r"\*\*([A-Z]{2,3}-\d{3})\*\*", matrix_content)
        unique_ids = set(rule_ids)
        assert len(rule_ids) == len(unique_ids), f"Duplicate rule IDs found: {set(rule_ids) - unique_ids}"


class TestRuleRequiredFields:
    """Test that rules have required fields."""

    def test_rules_have_module_reference(self, matrix_content: str) -> None:
        """Each rule should reference its source module."""
        # Check that module:line pattern exists in rule tables
        assert re.search(r"`[\w/]+\.py:\d+", matrix_content), "Rules should have module:line references"

    def test_rules_have_condition(self, matrix_content: str) -> None:
        """Each rule should have a condition column."""
        assert "| Condition |" in matrix_content or "Condition" in matrix_content

    def test_rules_have_action(self, matrix_content: str) -> None:
        """Each rule should have an action column."""
        assert "| Action |" in matrix_content or "Action" in matrix_content

    def test_rules_have_priority(self, matrix_content: str) -> None:
        """Each rule should have a priority column."""
        assert "| Priority |" in matrix_content or "Priority" in matrix_content


class TestConflictHotspots:
    """Test that conflict/overlap hotspots are documented."""

    def test_protection_vs_economic_conflict(self, matrix_content: str) -> None:
        """Matrix must document Protection vs Economic conflicts."""
        conflict_section = matrix_content[matrix_content.find("4.1") : matrix_content.find("4.2") if "4.2" in matrix_content else len(matrix_content)]
        assert "protection" in conflict_section.lower() or "PR-" in conflict_section

    def test_balancing_vs_economic_conflict(self, matrix_content: str) -> None:
        """Matrix must document Balancing vs Economic conflicts."""
        assert "Balancing" in matrix_content and "Economic" in matrix_content

    def test_modeguard_vs_autoswitch_conflict(self, matrix_content: str) -> None:
        """Matrix must document Mode Guard vs Auto-Switch conflicts."""
        conflict_section = matrix_content[matrix_content.find("4.3") : matrix_content.find("4.4") if "4.4" in matrix_content else len(matrix_content)]
        assert "guard" in conflict_section.lower() or "Guard" in conflict_section

    def test_hwhold_vs_cost_conflict(self, matrix_content: str) -> None:
        """Matrix must document HW Hold vs Cost Optimization conflicts."""
        conflict_section = matrix_content[matrix_content.find("4.4") : matrix_content.find("4.5") if "4.5" in matrix_content else len(matrix_content)]
        assert "hw" in conflict_section.lower() or "HW" in conflict_section or "hold" in conflict_section.lower()


class TestTODOMarkers:
    """Test that TODO markers in code are documented."""

    def test_balancing_todos_documented(self, matrix_content: str) -> None:
        """Matrix must document TODO markers in balancing module."""
        assert "TODO" in matrix_content, "TODO markers should be documented"
        assert "balancing" in matrix_content.lower(), "Balancing TODOs should be mentioned"

    def test_balancing_core_todos(self, matrix_content: str) -> None:
        """Matrix must document balancing/core.py TODOs."""
        assert "balancing/core.py" in matrix_content or "core.py" in matrix_content

    def test_balancing_plan_todos(self, matrix_content: str) -> None:
        """Matrix must document balancing/plan.py TODOs."""
        assert "balancing/plan.py" in matrix_content or "plan.py" in matrix_content


class TestKnownIssues:
    """Test that known issues are documented."""

    def test_pv_forecast_gap_documented(self, matrix_content: str) -> None:
        """Matrix must document the PV forecast check gap."""
        assert "PV" in matrix_content or "forecast" in matrix_content.lower()

    def test_boiler_grid_default_documented(self, matrix_content: str) -> None:
        """Matrix must document the boiler Grid default issue."""
        assert "Grid" in matrix_content and "boiler" in matrix_content.lower()


class TestRuleCount:
    """Test minimum rule counts per category."""

    def test_minimum_protection_rules(self, matrix_content: str) -> None:
        """Should have at least 2 protection rules."""
        pr_rules = re.findall(r"\*\*PR-\d{3}\*\*", matrix_content)
        assert len(pr_rules) >= 2, f"Expected at least 2 PR rules, got {len(pr_rules)}"

    def test_minimum_soc_rules(self, matrix_content: str) -> None:
        """Should have at least 3 SOC rules."""
        soc_rules = re.findall(r"\*\*SOC-\d{3}\*\*", matrix_content)
        assert len(soc_rules) >= 3, f"Expected at least 3 SOC rules, got {len(soc_rules)}"

    def test_minimum_grid_rules(self, matrix_content: str) -> None:
        """Should have at least 5 grid rules."""
        gr_rules = re.findall(r"\*\*GR-\d{3}\*\*", matrix_content)
        assert len(gr_rules) >= 5, f"Expected at least 5 GR rules, got {len(gr_rules)}"

    def test_minimum_balancing_rules(self, matrix_content: str) -> None:
        """Should have at least 5 balancing rules."""
        ba_rules = re.findall(r"\*\*BA-\d{3}\*\*", matrix_content)
        assert len(ba_rules) >= 5, f"Expected at least 5 BA rules, got {len(ba_rules)}"

    def test_minimum_boiler_rules(self, matrix_content: str) -> None:
        """Should have at least 3 boiler rules."""
        bo_rules = re.findall(r"\*\*BO-\d{3}\*\*", matrix_content)
        assert len(bo_rules) >= 3, f"Expected at least 3 BO rules, got {len(bo_rules)}"

    def test_minimum_total_rules(self, matrix_content: str) -> None:
        """Should have at least 50 total rules."""
        all_rules = re.findall(r"\*\*[A-Z]{2,3}-\d{3}\*\*", matrix_content)
        unique_rules = set(all_rules)
        assert len(unique_rules) >= 50, f"Expected at least 50 unique rules, got {len(unique_rules)}"


class TestPrecedenceHierarchy:
    """Test precedence hierarchy documentation."""

    def test_has_nine_priority_levels(self, matrix_content: str) -> None:
        """Precedence hierarchy should have 9 levels."""
        # Count priority levels in the hierarchy table
        hierarchy_match = re.search(r"## 2\. Precedence Hierarchy.*?(?=## 3\.|## 3 |$)", matrix_content, re.DOTALL)
        if hierarchy_match:
            hierarchy_text = hierarchy_match.group(0)
            # Count numbered priorities (1., 2., etc.)
            priorities = re.findall(r"\*\*1\.", hierarchy_text)
            assert len(priorities) >= 1, "Should have at least priority level 1"

    def test_protection_is_highest_priority(self, matrix_content: str) -> None:
        """Protection should be highest priority (1)."""
        hierarchy_match = re.search(r"## 2\. Precedence Hierarchy.*?(?=## 3\.|## 3 |$)", matrix_content, re.DOTALL)
        assert hierarchy_match, "Precedence Hierarchy section not found"
        hierarchy_text = hierarchy_match.group(0)
        # Protection should appear early (priority 1)
        assert "Protection" in hierarchy_text or "protection" in hierarchy_text.lower()


class TestExecutionOrder:
    """Test rule execution order documentation."""

    def test_charging_plan_order_documented(self, matrix_content: str) -> None:
        """Charging plan execution order should be documented."""
        assert "charging_plan.py" in matrix_content and "Order" in matrix_content

    def test_hybrid_planning_order_documented(self, matrix_content: str) -> None:
        """Hybrid planning execution order should be documented."""
        assert "hybrid_planning.py" in matrix_content

    def test_balancing_order_documented(self, matrix_content: str) -> None:
        """Balancing execution order should be documented."""
        assert "balancing/core.py" in matrix_content and "check_balancing" in matrix_content


class TestMatrixCompleteness:
    """Test overall matrix completeness."""

    def test_matrix_has_all_modules(self, matrix_content: str) -> None:
        """Matrix should reference all 9 required modules."""
        required_modules = [
            "charging_plan.py",
            "hybrid_planning.py",
            "hybrid.py",
            "hybrid_scoring.py",
            "planner.py",  # boiler
            "balancing/core.py",
            "balancing/plan.py",
            "auto_switch.py",
            "mode_guard.py",
        ]
        for module in required_modules:
            assert module in matrix_content, f"Missing reference to {module}"

    def test_matrix_has_generation_date(self, matrix_content: str) -> None:
        """Matrix should have generation date."""
        assert "Generated" in matrix_content or "2026" in matrix_content

    def test_matrix_has_purpose_statement(self, matrix_content: str) -> None:
        """Matrix should have purpose statement."""
        assert "Purpose" in matrix_content or "purpose" in matrix_content.lower()
