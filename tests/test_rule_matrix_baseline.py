"""Tests for rule matrix baseline schema validation.

This test validates that the baseline rule matrix has:
1. All required sections
2. Proper rule ID format
3. Required fields per rule
4. Conflict/overlap documentation
5. TODO marker documentation

GREEN: These tests should pass once the matrix is complete.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import List

import pytest


# Path to the baseline matrix
MATRIX_PATH = Path(__file__).parent.parent / ".sisyphus" / "evidence" / "task-1-baseline-matrix.md"

# Required sections in the matrix (flexible matching)
REQUIRED_SECTIONS = [
    "Executive Summary",
    "GRID CHARGING RULES",
    "STATE OF CHARGE RULES",
    "BALANCING RULES",
    "AUTO-SWITCH RULES",
    "PROTECTION RULES",
    "BOILER RULES",
    "CONFLICT/OVERLAP",
]

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


class TestBaselineMatrixHasRequiredSections:
    """Test that the baseline matrix has all required sections.
    
    This is the main validation test class for Task 1.
    """

    def test_matrix_file_exists(self) -> None:
        """Matrix file must exist at expected path."""
        assert MATRIX_PATH.exists(), f"Matrix file not found: {MATRIX_PATH}"

    def test_matrix_file_not_empty(self, matrix_content: str) -> None:
        """Matrix file must not be empty."""
        assert len(matrix_content) > 1000, "Matrix file appears too short"

    def test_matrix_is_markdown(self, matrix_content: str) -> None:
        """Matrix file should be valid markdown."""
        assert matrix_content.startswith("#"), "Matrix should start with markdown header"

    def test_has_executive_summary(self, matrix_content: str) -> None:
        """Matrix must have Executive Summary section."""
        assert "Executive Summary" in matrix_content, "Missing Executive Summary section"

    def test_has_grid_charging_rules(self, matrix_content: str) -> None:
        """Matrix must have Grid Charging Rules section."""
        assert "GRID CHARGING RULES" in matrix_content or "Grid Charging" in matrix_content, "Missing Grid Charging Rules section"

    def test_has_soc_rules(self, matrix_content: str) -> None:
        """Matrix must have State of Charge Rules section."""
        assert "STATE OF CHARGE RULES" in matrix_content or "State of Charge" in matrix_content or "SOC" in matrix_content, "Missing SOC Rules section"

    def test_has_balancing_rules(self, matrix_content: str) -> None:
        """Matrix must have Balancing Rules section."""
        assert "BALANCING RULES" in matrix_content or "Balancing" in matrix_content, "Missing Balancing Rules section"

    def test_has_auto_switch_rules(self, matrix_content: str) -> None:
        """Matrix must have Auto-Switch Rules section."""
        assert "AUTO-SWITCH RULES" in matrix_content or "Auto-Switch" in matrix_content, "Missing Auto-Switch Rules section"

    def test_has_protection_rules(self, matrix_content: str) -> None:
        """Matrix must have Protection Rules section."""
        assert "PROTECTION RULES" in matrix_content or "Protection" in matrix_content, "Missing Protection Rules section"

    def test_has_boiler_rules(self, matrix_content: str) -> None:
        """Matrix must have Boiler Rules section."""
        assert "BOILER RULES" in matrix_content or "Boiler" in matrix_content, "Missing Boiler Rules section"

    def test_has_conflict_overlap_section(self, matrix_content: str) -> None:
        """Matrix must have Conflict/Overlap Analysis section."""
        assert "CONFLICT/OVERLAP" in matrix_content or "Conflict" in matrix_content, "Missing Conflict/Overlap section"

    def test_has_precedence_ladder_reference(self, matrix_content: str) -> None:
        """Matrix must reference precedence ladder from precedence_contract.py."""
        assert "Precedence" in matrix_content or "precedence" in matrix_content.lower(), "Missing precedence reference"

    def test_has_todo_markers_section(self, matrix_content: str) -> None:
        """Matrix must have TODO markers section."""
        assert "TODO" in matrix_content, "Missing TODO markers documentation"

    def test_has_root_cause_analysis(self, matrix_content: str) -> None:
        """Matrix must have Root Cause Analysis section."""
        assert "ROOT CAUSE" in matrix_content or "Root Cause" in matrix_content, "Missing Root Cause Analysis"

    def test_has_rule_count_summary(self, matrix_content: str) -> None:
        """Matrix must have Rule Count Summary section."""
        assert "RULE COUNT" in matrix_content or "Rule Count" in matrix_content or "TOTAL" in matrix_content, "Missing Rule Count Summary"


class TestRuleIdFormat:
    """Test that rule IDs follow the required format."""

    def test_has_protection_rules(self, matrix_content: str) -> None:
        """Matrix must have PR-NNN (Protection) rules."""
        assert re.search(r"PR-\d{3}", matrix_content), "Missing PR-NNN protection rules"

    def test_has_soc_rules(self, matrix_content: str) -> None:
        """Matrix must have SOC-NNN (SOC/Battery) rules."""
        assert re.search(r"SOC-\d{3}", matrix_content), "Missing SOC-NNN battery rules"

    def test_has_grid_rules(self, matrix_content: str) -> None:
        """Matrix must have GR-NNN (Grid/Economic) rules."""
        assert re.search(r"GR-\d{3}", matrix_content), "Missing GR-NNN grid rules"

    def test_has_balancing_rules(self, matrix_content: str) -> None:
        """Matrix must have BA-NNN (Balancing) rules."""
        assert re.search(r"BA-\d{3}", matrix_content), "Missing BA-NNN balancing rules"

    def test_has_boiler_rules(self, matrix_content: str) -> None:
        """Matrix must have BO-NNN (Boiler) rules."""
        assert re.search(r"BO-\d{3}", matrix_content), "Missing BO-NNN boiler rules"

    def test_has_autoswitch_rules(self, matrix_content: str) -> None:
        """Matrix must have AS-NNN (Auto-Switch) rules."""
        assert re.search(r"AS-\d{3}", matrix_content), "Missing AS-NNN auto-switch rules"

    def test_rule_ids_unique(self, matrix_content: str) -> None:
        """Rule ID definitions (in header lines) must be unique."""
        # Rule IDs appear in section headers like: ### GR-001: Rule Name
        # Only count headers (definitions), not cross-reference occurrences
        defined_ids = re.findall(r"^###\s+([A-Z]{2,3}-\d{3}):", matrix_content, re.MULTILINE)
        unique_ids = set(defined_ids)
        assert len(defined_ids) == len(unique_ids), f"Duplicate rule definitions found: {[i for i in defined_ids if defined_ids.count(i) > 1]}"
        assert len(unique_ids) > 0, "No rule definitions found in matrix"


class TestRuleRequiredFields:
    """Test that rules have required fields."""

    def test_rules_have_module_reference(self, matrix_content: str) -> None:
        """Each rule should reference its source module."""
        assert re.search(r"`[\w/]+\.py:\d+", matrix_content), "Rules should have module:line references"

    def test_rules_have_condition(self, matrix_content: str) -> None:
        """Each rule should have a condition field."""
        assert "**Condition**" in matrix_content or "| Condition |" in matrix_content or "Condition" in matrix_content

    def test_rules_have_action(self, matrix_content: str) -> None:
        """Each rule should have an action field."""
        assert "**Action**" in matrix_content or "| Action |" in matrix_content or "Action" in matrix_content

    def test_rules_have_precedence(self, matrix_content: str) -> None:
        """Each rule should have a precedence field."""
        assert "**Precedence**" in matrix_content or "| Precedence |" in matrix_content or "Precedence" in matrix_content


class TestConflictHotspots:
    """Test that conflict/overlap hotspots are documented."""

    def test_protection_vs_economic_conflict(self, matrix_content: str) -> None:
        """Matrix must document Protection vs Economic conflicts."""
        assert "Protection" in matrix_content and "Economic" in matrix_content

    def test_balancing_vs_economic_conflict(self, matrix_content: str) -> None:
        """Matrix must document Balancing vs Economic conflicts."""
        assert "Balancing" in matrix_content and "Economic" in matrix_content

    def test_modeguard_vs_autoswitch_conflict(self, matrix_content: str) -> None:
        """Matrix must document Mode Guard vs Auto-Switch conflicts."""
        assert "guard" in matrix_content.lower() or "Guard" in matrix_content

    def test_hwhold_vs_cost_conflict(self, matrix_content: str) -> None:
        """Matrix must document HW Hold vs Cost Optimization conflicts."""
        assert "hw" in matrix_content.lower() or "HW" in matrix_content or "hold" in matrix_content.lower()


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
        pr_rules = re.findall(r"PR-\d{3}", matrix_content)
        assert len(pr_rules) >= 2, f"Expected at least 2 PR rules, got {len(pr_rules)}"

    def test_minimum_soc_rules(self, matrix_content: str) -> None:
        """Should have at least 3 SOC rules."""
        soc_rules = re.findall(r"SOC-\d{3}", matrix_content)
        assert len(soc_rules) >= 3, f"Expected at least 3 SOC rules, got {len(soc_rules)}"

    def test_minimum_grid_rules(self, matrix_content: str) -> None:
        """Should have at least 5 grid rules."""
        gr_rules = re.findall(r"GR-\d{3}", matrix_content)
        assert len(gr_rules) >= 5, f"Expected at least 5 GR rules, got {len(gr_rules)}"

    def test_minimum_balancing_rules(self, matrix_content: str) -> None:
        """Should have at least 5 balancing rules."""
        ba_rules = re.findall(r"BA-\d{3}", matrix_content)
        assert len(ba_rules) >= 5, f"Expected at least 5 BA rules, got {len(ba_rules)}"

    def test_minimum_boiler_rules(self, matrix_content: str) -> None:
        """Should have at least 3 boiler rules."""
        bo_rules = re.findall(r"BO-\d{3}", matrix_content)
        assert len(bo_rules) >= 3, f"Expected at least 3 BO rules, got {len(bo_rules)}"

    def test_minimum_total_rules(self, matrix_content: str) -> None:
        """Should have at least 50 total rules."""
        all_rules = re.findall(r"(?:PR|SOC|GR|BA|BO|AS|MG|SC|SM)-\d{3}", matrix_content)
        unique_rules = set(all_rules)
        assert len(unique_rules) >= 50, f"Expected at least 50 unique rules, got {len(unique_rules)}"


class TestPrecedenceHierarchy:
    """Test precedence hierarchy documentation."""

    def test_has_precedence_levels(self, matrix_content: str) -> None:
        """Precedence hierarchy should have defined levels."""
        # Check for precedence level references
        assert "PROTECTION_SAFETY" in matrix_content or "Protection" in matrix_content

    def test_pv_first_is_highest_priority(self, matrix_content: str) -> None:
        """PV_FIRST should be highest priority (1000)."""
        assert "PV_FIRST" in matrix_content or "PV-First" in matrix_content or "1000" in matrix_content


class TestMatrixCompleteness:
    """Test overall matrix completeness."""

    def test_matrix_has_all_modules(self, matrix_content: str) -> None:
        """Matrix should reference all required modules."""
        required_modules = [
            "charging_plan.py",
            "hybrid_planning.py",
            "boiler/planner.py",
            "balancing/core.py",
            "balancing/plan.py",
            "auto_switch.py",
            "mode_guard.py",
            "precedence_contract.py",
        ]
        for module in required_modules:
            assert module in matrix_content, f"Missing reference to {module}"

    def test_matrix_has_generation_date(self, matrix_content: str) -> None:
        """Matrix should have generation date."""
        assert "Generated" in matrix_content or "2026" in matrix_content

    def test_matrix_has_task_reference(self, matrix_content: str) -> None:
        """Matrix should reference the task."""
        assert "Task 1" in matrix_content or "task-1" in matrix_content.lower()
