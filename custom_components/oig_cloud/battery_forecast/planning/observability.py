"""Observability pack for aggressive rollout monitoring.

This module provides metrics tracking and rollout health evaluation for
the PV-first and boiler coordination rollout. It enables safe aggressive
rollout with automatic health checks and alerting.

IMPORTABLE WITHOUT RUNTIME DEPENDENCIES:
No HA imports, no coordinator imports, no config references at module load time.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class RolloutHealthStatus(Enum):
    """Health status of the rollout.
    
    HEALTHY: All metrics within acceptable thresholds
    DEGRADED: Some metrics outside preferred range but still acceptable
    UNHEALTHY: Metrics exceed alert thresholds - rollout should be paused
    """
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass
class AlertCondition:
    """Definition of an alert condition for rollout monitoring.
    
    Attributes:
        name: Unique identifier for this alert condition
        threshold: The threshold value that triggers the alert
        comparison: Comparison operator ('gt', 'lt', 'gte', 'lte', 'eq')
        message: Human-readable alert message
        severity: Alert severity ('warning', 'critical', 'info')
    """
    name: str
    threshold: float
    comparison: str  # 'gt', 'lt', 'gte', 'lte', 'eq'
    message: str
    severity: str = "warning"
    
    def evaluate(self, value: float) -> bool:
        """Check if this condition is triggered by the given value.
        
        Args:
            value: The metric value to check
            
        Returns:
            True if the condition is triggered (alert should fire)
        """
        if self.comparison == "gt":
            return value > self.threshold
        elif self.comparison == "lt":
            return value < self.threshold
        elif self.comparison == "gte":
            return value >= self.threshold
        elif self.comparison == "lte":
            return value <= self.threshold
        elif self.comparison == "eq":
            return value == self.threshold
        return False


@dataclass
class RolloutMetrics:
    """Tracks metrics for aggressive rollout monitoring.
    
    All counters are mutable to allow incremental updates during
    the decision cycle. Use reset() to clear all counters.
    
    Attributes:
        pv_defer_count: Number of times grid charging was deferred for PV
        grid_charge_count: Number of times grid charging was chosen
        protection_bypass_count: Number of times protection layer was bypassed
        boiler_source_outcomes: Dict mapping source name to count (e.g., {"fve": 10, "grid": 5})
        decision_reason_counts: Dict mapping reason codes to counts
        total_decisions: Total number of charging decisions made
        pv_first_enabled: Whether PV-first policy was enabled during collection
        timestamp: ISO timestamp of metrics collection
    """
    pv_defer_count: int = 0
    grid_charge_count: int = 0
    protection_bypass_count: int = 0
    boiler_source_outcomes: Dict[str, int] = field(default_factory=dict)
    decision_reason_counts: Dict[str, int] = field(default_factory=dict)
    total_decisions: int = 0
    pv_first_enabled: bool = False
    timestamp: Optional[str] = None
    
    def increment_pv_defer(self) -> None:
        """Increment the PV defer counter."""
        self.pv_defer_count += 1
        self.total_decisions += 1
    
    def increment_grid_charge(self) -> None:
        """Increment the grid charge counter."""
        self.grid_charge_count += 1
        self.total_decisions += 1
    
    def increment_protection_bypass(self) -> None:
        """Increment the protection bypass counter."""
        self.protection_bypass_count += 1
    
    def record_boiler_source(self, source: str) -> None:
        """Record a boiler source decision.
        
        Args:
            source: The energy source chosen (e.g., "fve", "grid", "alternative")
        """
        source_lower = source.lower()
        self.boiler_source_outcomes[source_lower] = (
            self.boiler_source_outcomes.get(source_lower, 0) + 1
        )
    
    def record_decision_reason(self, reason: str) -> None:
        """Record a decision reason code.
        
        Args:
            reason: The reason code (e.g., "pv_first", "economic_charging", "death_valley")
        """
        self.decision_reason_counts[reason] = (
            self.decision_reason_counts.get(reason, 0) + 1
        )
    
    def reset(self) -> None:
        """Reset all counters to zero."""
        self.pv_defer_count = 0
        self.grid_charge_count = 0
        self.protection_bypass_count = 0
        self.boiler_source_outcomes = {}
        self.decision_reason_counts = {}
        self.total_decisions = 0
        self.timestamp = None
    
    def get_pv_defer_rate(self) -> float:
        """Calculate the PV defer rate as a fraction of total decisions.
        
        Returns:
            PV defer rate (0.0 to 1.0), or 0.0 if no decisions
        """
        if self.total_decisions == 0:
            return 0.0
        return self.pv_defer_count / self.total_decisions
    
    def get_grid_charge_rate(self) -> float:
        """Calculate the grid charge rate as a fraction of total decisions.
        
        Returns:
            Grid charge rate (0.0 to 1.0), or 0.0 if no decisions
        """
        if self.total_decisions == 0:
            return 0.0
        return self.grid_charge_count / self.total_decisions
    
    def get_protection_bypass_rate(self) -> float:
        """Calculate the protection bypass rate as a fraction of total decisions.
        
        Returns:
            Protection bypass rate (0.0 to 1.0), or 0.0 if no decisions
        """
        if self.total_decisions == 0:
            return 0.0
        return self.protection_bypass_count / self.total_decisions
    
    def get_boiler_source_rate(self, source: str) -> float:
        """Calculate the rate for a specific boiler source.
        
        Args:
            source: The energy source to check (e.g., "fve", "grid")
            
        Returns:
            Source rate (0.0 to 1.0), or 0.0 if no boiler decisions
        """
        total_boiler = sum(self.boiler_source_outcomes.values())
        if total_boiler == 0:
            return 0.0
        return self.boiler_source_outcomes.get(source.lower(), 0) / total_boiler


# Default thresholds for rollout health evaluation
DEFAULT_THRESHOLDS: Dict[str, AlertCondition] = {
    "max_protection_bypass_rate": AlertCondition(
        name="max_protection_bypass_rate",
        threshold=0.05,  # 5%
        comparison="gt",
        message="Protection bypass rate exceeds 5% - safety layer may be compromised",
        severity="critical",
    ),
    "min_pv_defer_rate": AlertCondition(
        name="min_pv_defer_rate",
        threshold=0.10,  # 10%
        comparison="lt",
        message="PV defer rate below 10% when PV-first enabled - policy may not be working",
        severity="warning",
    ),
    "max_grid_charge_rate": AlertCondition(
        name="max_grid_charge_rate",
        threshold=0.30,  # 30%
        comparison="gt",
        message="Grid charge rate exceeds 30% when PV-first enabled - too much grid charging",
        severity="warning",
    ),
}


@dataclass
class RolloutGate:
    """Evaluates rollout health based on metrics and thresholds.
    
    Provides a go/no-go decision for continuing aggressive rollout
    based on observed metrics vs defined thresholds.
    
    Attributes:
        status: Current health status (HEALTHY, DEGRADED, UNHEALTHY)
        alerts: List of triggered alert conditions
        metrics_snapshot: Copy of metrics at evaluation time
        recommendations: List of recommended actions
    """
    status: RolloutHealthStatus
    alerts: List[AlertCondition]
    metrics_snapshot: Dict[str, Any]
    recommendations: List[str]
    
    @property
    def is_healthy(self) -> bool:
        """Check if rollout is healthy enough to continue."""
        return self.status == RolloutHealthStatus.HEALTHY
    
    @property
    def should_pause(self) -> bool:
        """Check if rollout should be paused due to health issues."""
        return self.status == RolloutHealthStatus.UNHEALTHY
    
    @property
    def has_warnings(self) -> bool:
        """Check if there are any warning-level alerts."""
        return any(a.severity == "warning" for a in self.alerts)
    
    @property
    def has_critical_alerts(self) -> bool:
        """Check if there are any critical-level alerts."""
        return any(a.severity == "critical" for a in self.alerts)


def evaluate_rollout_health(
    metrics: RolloutMetrics,
    thresholds: Optional[Dict[str, AlertCondition]] = None,
    pv_first_enabled: bool = True,
) -> RolloutGate:
    """Evaluate rollout health based on current metrics.
    
    Pure function that checks metrics against thresholds and returns
    a RolloutGate with health status and any triggered alerts.
    
    Args:
        metrics: Current rollout metrics
        thresholds: Custom thresholds (uses defaults if None)
        pv_first_enabled: Whether PV-first policy is currently enabled
        
    Returns:
        RolloutGate with health status and alerts
    """
    if thresholds is None:
        thresholds = DEFAULT_THRESHOLDS
    
    alerts: List[AlertCondition] = []
    recommendations: List[str] = []
    
    # Check protection bypass rate (always relevant)
    bypass_rate = metrics.get_protection_bypass_rate()
    if "max_protection_bypass_rate" in thresholds:
        condition = thresholds["max_protection_bypass_rate"]
        if condition.evaluate(bypass_rate):
            alerts.append(condition)
            recommendations.append(
                "Investigate protection layer - high bypass rate detected"
            )
    
    # Only check PV-first metrics if policy is enabled
    if pv_first_enabled:
        # Check PV defer rate
        pv_defer_rate = metrics.get_pv_defer_rate()
        if "min_pv_defer_rate" in thresholds:
            condition = thresholds["min_pv_defer_rate"]
            if condition.evaluate(pv_defer_rate):
                alerts.append(condition)
                recommendations.append(
                    "Check PV forecast input - PV-first may not be activating"
                )
        
        # Check grid charge rate
        grid_rate = metrics.get_grid_charge_rate()
        if "max_grid_charge_rate" in thresholds:
            condition = thresholds["max_grid_charge_rate"]
            if condition.evaluate(grid_rate):
                alerts.append(condition)
                recommendations.append(
                    "Review charging decisions - excessive grid charging detected"
                )
    
    # Determine overall health status
    if not alerts:
        status = RolloutHealthStatus.HEALTHY
    elif any(a.severity == "critical" for a in alerts):
        status = RolloutHealthStatus.UNHEALTHY
    else:
        status = RolloutHealthStatus.DEGRADED
    
    # Create metrics snapshot
    metrics_snapshot = {
        "pv_defer_count": metrics.pv_defer_count,
        "grid_charge_count": metrics.grid_charge_count,
        "protection_bypass_count": metrics.protection_bypass_count,
        "total_decisions": metrics.total_decisions,
        "pv_defer_rate": metrics.get_pv_defer_rate(),
        "grid_charge_rate": metrics.get_grid_charge_rate(),
        "protection_bypass_rate": metrics.get_protection_bypass_rate(),
        "boiler_source_outcomes": dict(metrics.boiler_source_outcomes),
        "decision_reason_counts": dict(metrics.decision_reason_counts),
        "pv_first_enabled": pv_first_enabled,
    }
    
    return RolloutGate(
        status=status,
        alerts=alerts,
        metrics_snapshot=metrics_snapshot,
        recommendations=recommendations,
    )


def format_metrics_summary(metrics: RolloutMetrics) -> str:
    """Format metrics as a human-readable summary string.
    
    Pure function for logging and debugging.
    
    Args:
        metrics: Rollout metrics to format
        
    Returns:
        Multi-line string summary of metrics
    """
    lines = [
        "=== Rollout Metrics Summary ===",
        f"Total Decisions: {metrics.total_decisions}",
        f"PV Defer Count: {metrics.pv_defer_count} ({metrics.get_pv_defer_rate():.1%})",
        f"Grid Charge Count: {metrics.grid_charge_count} ({metrics.get_grid_charge_rate():.1%})",
        f"Protection Bypass Count: {metrics.protection_bypass_count} ({metrics.get_protection_bypass_rate():.1%})",
        "",
        "Boiler Source Outcomes:",
    ]
    
    if metrics.boiler_source_outcomes:
        for source, count in sorted(metrics.boiler_source_outcomes.items()):
            rate = metrics.get_boiler_source_rate(source)
            lines.append(f"  {source}: {count} ({rate:.1%})")
    else:
        lines.append("  (no boiler decisions)")
    
    lines.extend([
        "",
        "Decision Reason Counts:",
    ])
    
    if metrics.decision_reason_counts:
        for reason, count in sorted(metrics.decision_reason_counts.items()):
            lines.append(f"  {reason}: {count}")
    else:
        lines.append("  (no decision reasons recorded)")
    
    if metrics.timestamp:
        lines.extend([
            "",
            f"Timestamp: {metrics.timestamp}",
        ])
    
    lines.append("=" * 30)
    
    return "\n".join(lines)


def create_metrics_from_dict(data: Dict[str, Any]) -> RolloutMetrics:
    """Create RolloutMetrics from a dictionary (e.g., from HA state).
    
    Factory function for reconstructing metrics from persisted state.
    
    Args:
        data: Dictionary with metric values
        
    Returns:
        RolloutMetrics instance
    """
    return RolloutMetrics(
        pv_defer_count=data.get("pv_defer_count", 0),
        grid_charge_count=data.get("grid_charge_count", 0),
        protection_bypass_count=data.get("protection_bypass_count", 0),
        boiler_source_outcomes=data.get("boiler_source_outcomes", {}),
        decision_reason_counts=data.get("decision_reason_counts", {}),
        total_decisions=data.get("total_decisions", 0),
        pv_first_enabled=data.get("pv_first_enabled", False),
        timestamp=data.get("timestamp"),
    )


def merge_metrics(metrics_list: List[RolloutMetrics]) -> RolloutMetrics:
    """Merge multiple RolloutMetrics instances into one.
    
    Useful for aggregating metrics from multiple decision cycles.
    
    Args:
        metrics_list: List of RolloutMetrics to merge
        
    Returns:
        New RolloutMetrics with aggregated values
    """
    merged = RolloutMetrics()
    
    for m in metrics_list:
        merged.pv_defer_count += m.pv_defer_count
        merged.grid_charge_count += m.grid_charge_count
        merged.protection_bypass_count += m.protection_bypass_count
        merged.total_decisions += m.total_decisions
        
        # Merge boiler source outcomes
        for source, count in m.boiler_source_outcomes.items():
            merged.boiler_source_outcomes[source] = (
                merged.boiler_source_outcomes.get(source, 0) + count
            )
        
        # Merge decision reason counts
        for reason, count in m.decision_reason_counts.items():
            merged.decision_reason_counts[reason] = (
                merged.decision_reason_counts.get(reason, 0) + count
            )
    
    # Find the most recent timestamp if available
    latest_timestamp = None
    for m in metrics_list:
        if m.timestamp:
            if latest_timestamp is None or m.timestamp > latest_timestamp:
                latest_timestamp = m.timestamp
    merged.timestamp = latest_timestamp
    
    return merged
