"""Precedence contract for battery management decision layers.

This module defines the global priority ladder (PV-first, dynamic day policy,
protection overrides, fallbacks) as the deterministic precedence contract used
by all decision layers.

The contract is a specification/constant module — it does NOT depend on runtime
state. It provides:
- PrecedenceLevel enum with numeric priority values
- PRECEDENCE_LADDER as ordered list from highest to lowest priority
- resolve_conflict() deterministic tie-breaker (pure function)
- INVARIANTS list of non-negotiable rules

IMPORTABLE WITHOUT RUNTIME DEPENDENCIES:
No HA, no coordinator imports, no config references at module load time.
"""

from __future__ import annotations

from enum import IntEnum
from typing import List, Tuple


class PrecedenceLevel(IntEnum):
    """Numeric precedence levels for decision conflicts.

    Higher values = higher priority (win conflicts).
    The numeric values are spaced by 100 to allow for future intermediate levels.

    ORDERING (highest to lowest):
    1. PV_FIRST (1000) - PV-first policy, defer grid charge when PV available
    2. PROTECTION_SAFETY (900) - Hardware protection, safety limits
    3. PRE_PEAK_AVOIDANCE (850) - Morning peak pre-charge/avoidance
    4. DEATH_VALLEY (800) - Minimum SOC enforcement
    5. BALANCING_OVERRIDE (700) - Balancing mode overrides
    6. MODE_GUARD (600) - Mode guard/stability enforcement
    7. RECOVERY_MODE (500) - Recovery from error states
    8. ECONOMIC_CHARGING (400) - Economic grid charging (dynamic-by-day)
    9. OPPORTUNISTIC (300) - Natural/opportunistic balancing
    10. AUTO_SWITCH (200) - Auto-switch enforcement
    11. PLANNING_TARGET (100) - Planning target/minimum achieved
    """

    # HIGHEST PRIORITY: PV-first policy
    # When PV forecast is available with sufficient confidence AND SOC above
    # death-valley threshold, grid charging MUST be deferred.
    PV_FIRST = 1000

    # Protection/Safety layer - hardware limits, critical safety
    # GR-010, SOC-003, SOC-006, SOC-013, BA-001
    PROTECTION_SAFETY = 900

    # Morning Peak Avoidance / Pre-peak charging
    # PRE-001, PRE-002 - conservative pre-charge before morning peak
    PRE_PEAK_AVOIDANCE = 850  # Mezi PROTECTION_SAFETY(900) a DEATH_VALLEY(800) — morning peak pre-charge

    # Death Valley / Minimum SOC enforcement
    # SOC-004, SOC-016, BA-019 - prevent battery from hitting HW minimum
    DEATH_VALLEY = 800

    # Balancing mode overrides - cell calibration requirements
    # BA-021, BA-022, BA-024 - periodic full-charge for cell health
    BALANCING_OVERRIDE = 700

    # Mode guard / stability enforcement
    # AS-012, AS-013 - prevent rapid mode oscillation
    MODE_GUARD = 600

    # Recovery mode - error state recovery
    # GR-001, GR-008 - recover from unexpected states
    RECOVERY_MODE = 500

    # Economic charging - cost optimization
    # GR-004, GR-005, PR-001, PR-004 - grid charging at low prices
    # NOTE: Dynamic-by-day policy (configurable per weekday)
    ECONOMIC_CHARGING = 400

    # Opportunistic / natural balancing
    # BA-011, BA-012, BA-007 - passive balancing, natural opportunities
    OPPORTUNISTIC = 300

    # Auto-switch enforcement
    # AS-007, AS-009 - automatic mode switching rules
    AUTO_SWITCH = 200

    # LOWEST PRIORITY: Planning target achieved
    # SOC-001, SOC-002 - baseline target/min achieved state
    PLANNING_TARGET = 100


# Type alias for clarity
PrecedenceValue = int


# The precedence ladder: ordered list from highest to lowest priority
# This defines the TOTAL ORDER of all decision layers
PRECEDENCE_LADDER: List[PrecedenceLevel] = [
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


def resolve_conflict(
    level_a: PrecedenceLevel,
    level_b: PrecedenceLevel,
) -> PrecedenceLevel:
    """Resolve a conflict between two precedence levels.

    This is a DETERMINISTIC TIE-BREAKER that always returns the winner.
    When levels are equal, returns level_a (first-wins rule).

    PURE FUNCTION: No side effects, no runtime state dependencies.

    Args:
        level_a: First precedence level (first-wins on tie)
        level_b: Second precedence level

    Returns:
        The winning PrecedenceLevel (higher priority wins, first-wins on equal)

    Examples:
        >>> resolve_conflict(PrecedenceLevel.PV_FIRST, PrecedenceLevel.ECONOMIC_CHARGING)
        <PrecedenceLevel.PV_FIRST: 1000>
        >>> resolve_conflict(PrecedenceLevel.ECONOMIC_CHARGING, PrecedenceLevel.PV_FIRST)
        <PrecedenceLevel.PV_FIRST: 1000>
        >>> resolve_conflict(PrecedenceLevel.ECONOMIC_CHARGING, PrecedenceLevel.ECONOMIC_CHARGING)
        <PrecedenceLevel.ECONOMIC_CHARGING: 400>
    """
    # Higher numeric value = higher priority
    if level_a >= level_b:
        return level_a
    return level_b


def resolve_conflict_with_context(
    level_a: PrecedenceLevel,
    level_b: PrecedenceLevel,
    tie_breaker_key: str = "",
) -> Tuple[PrecedenceLevel, str]:
    """Resolve conflict with additional context for debugging/logging.

    Same logic as resolve_conflict, but returns reasoning string.

    Args:
        level_a: First precedence level
        level_b: Second precedence level
        tie_breaker_key: Optional context key for deterministic tie resolution

    Returns:
        Tuple of (winning_level, reason_string)
    """
    winner = resolve_conflict(level_a, level_b)

    if level_a == level_b:
        reason = f"tie resolved: first-wins ({level_a.name})"
    elif winner == level_a:
        reason = f"{level_a.name}({level_a}) > {level_b.name}({level_b})"
    else:
        reason = f"{level_b.name}({level_b}) > {level_a.name}({level_a})"

    return winner, reason


# Invariant definitions: non-negotiable rules that MUST hold
# These are boolean predicates (as strings for documentation) that
# must be true regardless of context.
INVARIANTS: List[str] = [
    # PV-FIRST invariants
    "PV_FIRST_ALWAYS_DEFERS_GRID_WHEN_AVAILABLE: "
    "If PV forecast confidence > threshold AND SOC above death-valley, "
    "grid charging MUST be deferred to PV charging",

    "PV_FIRST_REQUIRES_FORECAST: "
    "PV-first policy only activates when PV forecast is available "
    "with sufficient confidence (not None, not zero prediction)",

    # Protection/Safety invariants
    "PROTECTION_ALWAYS_WINS_OVER_ECONOMICS: "
    "Hardware protection and safety limits ALWAYS override economic optimization",

    "SOC_NEVER_BELOW_HW_MINIMUM: "
    "Battery SOC must NEVER go below hardware minimum (3.07 kWh / 20%) "
    "except during actual discharge in HOME mode with load present",

    # Death Valley invariants
    "DEATH_VALLEY_TRIGGERS_IMMEDIATE_CHARGE: "
    "When projected SOC falls below planning minimum, "
    "immediate grid charging is triggered regardless of price",

    # Balancing invariants
    "BALANCING_DEADLINE_ENFORCED: "
    "Balancing must complete by deadline (configurable, default 06:00) "
    "even if grid charging at higher prices is required",

    "BALANCING_INTERVAL_DAYS_ENFORCED: "
    "Balancing must occur at least every N days (configurable, default 7) "
    "or forced balancing is triggered",

    # Mode Guard invariants
    "MODE_GUARD_PREVENTS_OSCILLATION: "
    "Mode changes within guard window are blocked unless SOC exception applies",

    "MODE_GUARD_SOC_EXCEPTION: "
    "If projected SOC would fall below planning minimum, "
    "mode guard is bypassed to allow protective mode change",

    # Economic Charging invariants
    "ECONOMIC_CHARGING_PRICE_CAP: "
    "Grid charging for economic reasons only occurs when "
    "price is below configurable max_charging_price threshold",

    "ECONOMIC_CHARGING_REQUIRES_SAVINGS_MARGIN: "
    "Economic charging only occurs when savings exceed "
    "configurable min_savings_margin threshold",

    # Total Order invariants
    "PRECEDENCE_IS_TOTAL_ORDER: "
    "For any two distinct precedence levels A and B, "
    "exactly one of A > B or B > A holds (no ties without explicit resolution)",

    "TIE_BREAKER_IS_DETERMINISTIC: "
    "resolve_conflict(A, A) always returns A "
    "(first-wins rule, no random or stateful decisions)",
]


def get_precedence_rank(level: PrecedenceLevel) -> int:
    """Get the rank (1-indexed position) of a precedence level in the ladder.

    Lower rank = higher priority (rank 1 is highest).

    Args:
        level: The precedence level to rank

    Returns:
        1-indexed position in PRECEDENCE_LADDER (1 = highest priority)
    """
    return PRECEDENCE_LADDER.index(level) + 1


def is_higher_priority(
    level_a: PrecedenceLevel,
    level_b: PrecedenceLevel,
) -> bool:
    """Check if level_a has strictly higher priority than level_b.

    Args:
        level_a: First precedence level
        level_b: Second precedence level

    Returns:
        True if level_a has higher priority than level_b
    """
    return level_a > level_b


def get_levels_between(
    low: PrecedenceLevel,
    high: PrecedenceLevel,
) -> List[PrecedenceLevel]:
    """Get all precedence levels strictly between low and high.

    Args:
        low: Lower bound (exclusive)
        high: Higher bound (exclusive)

    Returns:
        List of levels between low and high, in priority order
    """
    low_rank = get_precedence_rank(low)
    high_rank = get_precedence_rank(high)

    # Ensure proper ordering
    if low_rank < high_rank:
        low_rank, high_rank = high_rank, low_rank

    # Extract levels between (exclusive)
    return PRECEDENCE_LADDER[high_rank : low_rank - 1]


# Rule ID to PrecedenceLevel mapping for cross-reference
# Maps the rule IDs from the rule matrix to their precedence levels
RULE_TO_PRECEDENCE: dict[str, PrecedenceLevel] = {
    # PV-FIRST rules (NEW)
    "PV-001": PrecedenceLevel.PV_FIRST,
    "PV-002": PrecedenceLevel.PV_FIRST,
    "PV-003": PrecedenceLevel.PV_FIRST,

    # Protection/Safety rules
    "GR-010": PrecedenceLevel.PROTECTION_SAFETY,
    "SOC-003": PrecedenceLevel.PROTECTION_SAFETY,
    "SOC-006": PrecedenceLevel.PROTECTION_SAFETY,
    "SOC-013": PrecedenceLevel.PROTECTION_SAFETY,
    "BA-001": PrecedenceLevel.PROTECTION_SAFETY,

    # Death Valley rules
    "SOC-004": PrecedenceLevel.DEATH_VALLEY,
    "SOC-016": PrecedenceLevel.DEATH_VALLEY,
    "BA-019": PrecedenceLevel.DEATH_VALLEY,

    # Balancing Override rules
    "BA-021": PrecedenceLevel.BALANCING_OVERRIDE,
    "BA-022": PrecedenceLevel.BALANCING_OVERRIDE,
    "BA-024": PrecedenceLevel.BALANCING_OVERRIDE,

    # Mode Guard rules
    "AS-012": PrecedenceLevel.MODE_GUARD,
    "AS-013": PrecedenceLevel.MODE_GUARD,

    # Recovery Mode rules
    "GR-001": PrecedenceLevel.RECOVERY_MODE,
    "GR-008": PrecedenceLevel.RECOVERY_MODE,

    # Economic Charging rules
    "GR-004": PrecedenceLevel.ECONOMIC_CHARGING,
    "GR-005": PrecedenceLevel.ECONOMIC_CHARGING,
    "PR-001": PrecedenceLevel.ECONOMIC_CHARGING,
    "PR-004": PrecedenceLevel.ECONOMIC_CHARGING,

    # Opportunistic rules
    "BA-011": PrecedenceLevel.OPPORTUNISTIC,
    "BA-012": PrecedenceLevel.OPPORTUNISTIC,
    "BA-007": PrecedenceLevel.OPPORTUNISTIC,

    # Auto-Switch rules
    "AS-007": PrecedenceLevel.AUTO_SWITCH,
    "AS-009": PrecedenceLevel.AUTO_SWITCH,

    # Planning Target rules
    "SOC-001": PrecedenceLevel.PLANNING_TARGET,
    "SOC-002": PrecedenceLevel.PLANNING_TARGET,
}


def get_precedence_for_rule(rule_id: str) -> PrecedenceLevel | None:
    """Get the precedence level for a given rule ID.

    Args:
        rule_id: The rule identifier (e.g., "GR-010", "PV-001")

    Returns:
        The PrecedenceLevel for the rule, or None if not found
    """
    return RULE_TO_PRECEDENCE.get(rule_id)


def validate_total_order() -> bool:
    """Validate that the precedence ladder forms a total order.

    A total order requires:
    1. Antisymmetry: If A > B, then not B > A
    2. Transitivity: If A > B and B > C, then A > C
    3. Totality: For any A != B, either A > B or B > A

    Returns:
        True if the precedence ladder is a valid total order
    """
    # Check that all values are unique (antisymmetry + totality)
    values = [level.value for level in PRECEDENCE_LADDER]
    if len(values) != len(set(values)):
        return False

    # Check that values are strictly decreasing (totality with consistent ordering)
    for i in range(len(values) - 1):
        if values[i] <= values[i + 1]:
            return False

    # Transitivity is guaranteed by integer comparison
    return True


def get_precedence_summary() -> str:
    """Get a human-readable summary of the precedence ladder.

    Returns:
        Multi-line string summarizing all precedence levels
    """
    lines = ["=" * 60, "PRECEDENCE CONTRACT SUMMARY", "=" * 60, ""]

    for i, level in enumerate(PRECEDENCE_LADDER, 1):
        lines.append(f"{i:2}. {level.name:25} (value: {level.value})")

    lines.extend([
        "",
        "=" * 60,
        f"Total levels: {len(PRECEDENCE_LADDER)}",
        f"Total order valid: {validate_total_order()}",
        f"Total invariants: {len(INVARIANTS)}",
        "=" * 60,
    ])

    return "\n".join(lines)
