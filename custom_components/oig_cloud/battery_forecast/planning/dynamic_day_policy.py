"""Dynamic-by-day policy scoring layer for battery management.

This module provides a deterministic day-context policy selector that resolves
lower-order conflicts after PV-first is satisfied. It selects a cost/planning
profile based on: forecast quality, price spread, SOC runway, and demand profile.

PV-FIRST IS A HARD TOP-LEVEL INVARIANT:
The dynamic layer NEVER overrides PV-first. PV-first is checked at precedence
level 1000 (highest), while economic decisions are at level 400.

IMPORTABLE WITHOUT RUNTIME DEPENDENCIES:
No HA imports, no coordinator imports, no config references at module load time.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional

from .input_quality import InputQualityStatus
from .precedence_contract import PrecedenceLevel
from .rollout_flags import RolloutFlags, is_pv_first_active


class DayProfileId(str, Enum):
    """Identifiers for day-context policy profiles.

    Each profile represents a different optimization strategy:
    - PV_FIRST: Strong PV day - defer grid charging, let PV charge battery
    - COST_AWARE: Weak PV + high price spread - optimize for cost arbitrage
    - CONSERVATIVE: Uncertain/degraded inputs - minimize risk, charge when safe
    - LEGACY: Feature flags disabled - use original algorithm
    """

    PV_FIRST = "pv_first"
    COST_AWARE = "cost_aware"
    CONSERVATIVE = "conservative"
    LEGACY = "legacy"


@dataclass(frozen=True, slots=True)
class DayContextProfile:
    """Immutable profile for day-context policy selection.

    Attributes:
        profile_id: Identifier for the selected policy profile
        reason_code: Human-readable explanation for why this profile was selected
        precedence_level: The precedence level this profile operates at
        allows_grid_charging: Whether this profile allows economic grid charging
        pv_first_enforced: Whether PV-first constraint is enforced (always True for PV_FIRST profile)
    """

    profile_id: str
    reason_code: str
    precedence_level: int = PrecedenceLevel.ECONOMIC_CHARGING
    allows_grid_charging: bool = True
    pv_first_enforced: bool = False


# Pre-defined profiles for common scenarios
PROFILE_PV_FIRST = DayContextProfile(
    profile_id=DayProfileId.PV_FIRST,
    reason_code="pv_strong_defer_grid",
    precedence_level=PrecedenceLevel.PV_FIRST,
    allows_grid_charging=False,
    pv_first_enforced=True,
)

PROFILE_COST_AWARE = DayContextProfile(
    profile_id=DayProfileId.COST_AWARE,
    reason_code="weak_pv_high_spread_optimize_cost",
    precedence_level=PrecedenceLevel.ECONOMIC_CHARGING,
    allows_grid_charging=True,
    pv_first_enforced=False,
)

PROFILE_CONSERVATIVE = DayContextProfile(
    profile_id=DayProfileId.CONSERVATIVE,
    reason_code="degraded_inputs_minimize_risk",
    precedence_level=PrecedenceLevel.ECONOMIC_CHARGING,
    allows_grid_charging=True,
    pv_first_enforced=False,
)

PROFILE_LEGACY = DayContextProfile(
    profile_id=DayProfileId.LEGACY,
    reason_code="feature_flags_disabled_use_original",
    precedence_level=PrecedenceLevel.ECONOMIC_CHARGING,
    allows_grid_charging=True,
    pv_first_enforced=False,
)


# Thresholds for policy selection
class PolicyThresholds:
    """Threshold constants for policy selection.

    These thresholds determine when to switch between profiles.
    Values are tuned for typical residential battery scenarios.
    """

    # PV forecast thresholds
    PV_STRONG_DAY_KWH = 10.0  # Above this = strong PV day
    PV_WEAK_DAY_KWH = 3.0     # Below this = weak PV day
    PV_CONFIDENCE_MIN = 0.5   # Minimum confidence to trust PV forecast

    # Price spread thresholds
    PRICE_SPREAD_HIGH_PERCENT = 30.0  # High spread = good arbitrage opportunity
    PRICE_SPREAD_LOW_PERCENT = 10.0   # Low spread = limited arbitrage

    # SOC runway thresholds
    SOC_RUNWAY_CRITICAL_HOURS = 2.0   # Less than 2h runway = critical
    SOC_RUNWAY_SAFE_HOURS = 6.0       # More than 6h runway = safe

    # Demand profile thresholds
    DEMAND_HIGH_KWH_PER_HOUR = 1.5    # High demand = more consumption
    DEMAND_LOW_KWH_PER_HOUR = 0.5     # Low demand = less consumption


class DayPolicySelector:
    """Deterministic day-context policy selector.

    Selects the appropriate cost/planning profile based on current conditions.
    PV-first is a HARD constraint - if conditions indicate strong PV day,
    the selector will ALWAYS return PV_FIRST profile regardless of other factors.

    DETERMINISM GUARANTEE:
    Same inputs ALWAYS produce same output. No random tie-breaking.

    Example:
        >>> selector = DayPolicySelector()
        >>> profile = selector.select(
        ...     pv_forecast_kwh=15.0,
        ...     pv_forecast_confidence=0.8,
        ...     price_spread_percent=25.0,
        ...     soc_runway_hours=8.0,
        ...     demand_kwh_per_hour=1.0,
        ...     forecast_quality=InputQualityStatus.FRESH,
        ...     flags=RolloutFlags(pv_first_policy_enabled=True),
        ... )
        >>> profile.profile_id
        'pv_first'
    """

    def __init__(self, thresholds: Optional[PolicyThresholds] = None):
        """Initialize selector with optional custom thresholds.

        Args:
            thresholds: Custom threshold values (defaults to PolicyThresholds)
        """
        self._thresholds = thresholds or PolicyThresholds()

    def select(
        self,
        *,
        pv_forecast_kwh: float,
        pv_forecast_confidence: float,
        price_spread_percent: float,
        soc_runway_hours: float,
        demand_kwh_per_hour: float,
        forecast_quality: InputQualityStatus,
        flags: RolloutFlags,
        price_quality: Optional[InputQualityStatus] = None,
    ) -> DayContextProfile:
        """Select the appropriate day-context policy profile.

        Selection order (deterministic):
        1. Check feature flags - if PV-first disabled, return LEGACY
        2. Check input quality - if degraded, return CONSERVATIVE
        3. Check PV conditions - if strong PV day, return PV_FIRST (HARD CONSTRAINT)
        4. Check price spread - if high spread + weak PV, return COST_AWARE
        5. Default to CONSERVATIVE

        Args:
            pv_forecast_kwh: Total PV forecast for the period (kWh)
            pv_forecast_confidence: Forecast confidence (0.0-1.0)
            price_spread_percent: Price spread between low/high (%)
            soc_runway_hours: Hours of battery at current consumption
            demand_kwh_per_hour: Average demand rate (kWh/h)
            forecast_quality: Quality status of PV forecast
            flags: Rollout flags for feature control
            price_quality: Optional quality status of price data

        Returns:
            DayContextProfile with selected profile and reason
        """
        # Step 1: Check feature flags
        if not is_pv_first_active(flags):
            return DayContextProfile(
                profile_id=DayProfileId.LEGACY,
                reason_code="pv_first_policy_disabled",
                precedence_level=PrecedenceLevel.ECONOMIC_CHARGING,
                allows_grid_charging=True,
                pv_first_enforced=False,
            )

        # Step 2: Check input quality
        if self._is_quality_degraded(forecast_quality, price_quality):
            return self._select_for_degraded_inputs(
                pv_forecast_kwh=pv_forecast_kwh,
                pv_forecast_confidence=pv_forecast_confidence,
                soc_runway_hours=soc_runway_hours,
            )

        # Step 3: PV-FIRST HARD CONSTRAINT
        # If strong PV day, ALWAYS return PV_FIRST profile
        # This cannot be overridden by cost considerations
        if self._is_strong_pv_day(pv_forecast_kwh, pv_forecast_confidence):
            return DayContextProfile(
                profile_id=DayProfileId.PV_FIRST,
                reason_code=self._build_pv_first_reason(
                    pv_forecast_kwh=pv_forecast_kwh,
                    pv_forecast_confidence=pv_forecast_confidence,
                ),
                precedence_level=PrecedenceLevel.PV_FIRST,
                allows_grid_charging=False,
                pv_first_enforced=True,
            )

        # Step 4: Check for cost-aware opportunity
        if self._is_cost_aware_opportunity(
            pv_forecast_kwh=pv_forecast_kwh,
            price_spread_percent=price_spread_percent,
            soc_runway_hours=soc_runway_hours,
        ):
            return DayContextProfile(
                profile_id=DayProfileId.COST_AWARE,
                reason_code=self._build_cost_aware_reason(
                    pv_forecast_kwh=pv_forecast_kwh,
                    price_spread_percent=price_spread_percent,
                    soc_runway_hours=soc_runway_hours,
                ),
                precedence_level=PrecedenceLevel.ECONOMIC_CHARGING,
                allows_grid_charging=True,
                pv_first_enforced=False,
            )

        # Step 5: Default to conservative
        return DayContextProfile(
            profile_id=DayProfileId.CONSERVATIVE,
            reason_code=self._build_conservative_reason(
                pv_forecast_kwh=pv_forecast_kwh,
                price_spread_percent=price_spread_percent,
                soc_runway_hours=soc_runway_hours,
            ),
            precedence_level=PrecedenceLevel.ECONOMIC_CHARGING,
            allows_grid_charging=True,
            pv_first_enforced=False,
        )

    def _is_quality_degraded(
        self,
        forecast_quality: InputQualityStatus,
        price_quality: Optional[InputQualityStatus],
    ) -> bool:
        """Check if input quality is degraded enough to require conservative mode."""
        degraded_statuses = {InputQualityStatus.STALE, InputQualityStatus.INVALID}

        if forecast_quality in degraded_statuses:
            return True

        if price_quality is not None and price_quality in degraded_statuses:
            return True

        return False

    def _is_strong_pv_day(
        self,
        pv_forecast_kwh: float,
        pv_forecast_confidence: float,
    ) -> bool:
        """Check if this is a strong PV production day.

        Strong PV day = high forecast with good confidence.
        On strong PV days, grid charging should be deferred.
        """
        return (
            pv_forecast_kwh >= self._thresholds.PV_STRONG_DAY_KWH
            and pv_forecast_confidence >= self._thresholds.PV_CONFIDENCE_MIN
        )

    def _is_cost_aware_opportunity(
        self,
        pv_forecast_kwh: float,
        price_spread_percent: float,
        soc_runway_hours: float,
    ) -> bool:
        """Check if conditions favor cost-aware optimization.

        Cost-aware is appropriate when:
        - PV is weak (not enough to charge battery)
        - Price spread is high (good arbitrage opportunity)
        - SOC runway is safe (no immediate need to charge)
        """
        is_weak_pv = pv_forecast_kwh < self._thresholds.PV_WEAK_DAY_KWH
        is_high_spread = price_spread_percent >= self._thresholds.PRICE_SPREAD_HIGH_PERCENT
        is_safe_runway = soc_runway_hours >= self._thresholds.SOC_RUNWAY_SAFE_HOURS

        return is_weak_pv and is_high_spread and is_safe_runway

    def _select_for_degraded_inputs(
        self,
        pv_forecast_kwh: float,
        pv_forecast_confidence: float,
        soc_runway_hours: float,
    ) -> DayContextProfile:
        """Select profile when input quality is degraded.

        Even with degraded inputs, we may still have usable data.
        If PV forecast is strong despite quality issues, still prefer PV-first.
        """
        # If we have strong PV data despite quality issues, still use it
        if pv_forecast_kwh >= self._thresholds.PV_STRONG_DAY_KWH:
            return DayContextProfile(
                profile_id=DayProfileId.PV_FIRST,
                reason_code=f"degraded_quality_strong_pv_{pv_forecast_kwh:.1f}kWh",
                precedence_level=PrecedenceLevel.PV_FIRST,
                allows_grid_charging=False,
                pv_first_enforced=True,
            )

        # Critical SOC runway - must allow charging
        if soc_runway_hours < self._thresholds.SOC_RUNWAY_CRITICAL_HOURS:
            return DayContextProfile(
                profile_id=DayProfileId.CONSERVATIVE,
                reason_code=f"degraded_quality_critical_soc_{soc_runway_hours:.1f}h",
                precedence_level=PrecedenceLevel.ECONOMIC_CHARGING,
                allows_grid_charging=True,
                pv_first_enforced=False,
            )

        # Default conservative for degraded inputs
        return DayContextProfile(
            profile_id=DayProfileId.CONSERVATIVE,
            reason_code="degraded_quality_conservative",
            precedence_level=PrecedenceLevel.ECONOMIC_CHARGING,
            allows_grid_charging=True,
            pv_first_enforced=False,
        )

    def _build_pv_first_reason(
        self,
        pv_forecast_kwh: float,
        pv_forecast_confidence: float,
    ) -> str:
        """Build human-readable reason for PV-first selection."""
        return f"pv_strong_{pv_forecast_kwh:.1f}kWh_conf_{pv_forecast_confidence:.0%}"

    def _build_cost_aware_reason(
        self,
        pv_forecast_kwh: float,
        price_spread_percent: float,
        soc_runway_hours: float,
    ) -> str:
        """Build human-readable reason for cost-aware selection."""
        return (
            f"weak_pv_{pv_forecast_kwh:.1f}kWh_"
            f"spread_{price_spread_percent:.0f}%_"
            f"runway_{soc_runway_hours:.1f}h"
        )

    def _build_conservative_reason(
        self,
        pv_forecast_kwh: float,
        price_spread_percent: float,
        soc_runway_hours: float,
    ) -> str:
        """Build human-readable reason for conservative selection."""
        return (
            f"moderate_pv_{pv_forecast_kwh:.1f}kWh_"
            f"spread_{price_spread_percent:.0f}%_"
            f"runway_{soc_runway_hours:.1f}h"
        )


# Pure function interface for simpler usage
def select_day_policy(
    *,
    pv_forecast_kwh: float,
    pv_forecast_confidence: float,
    price_spread_percent: float,
    soc_runway_hours: float,
    demand_kwh_per_hour: float,
    forecast_quality: InputQualityStatus,
    flags: RolloutFlags,
    price_quality: Optional[InputQualityStatus] = None,
) -> DayContextProfile:
    """Pure function interface for day policy selection.

    This is a convenience wrapper around DayPolicySelector.select().
    Same inputs always produce same output (deterministic).

    Args:
        pv_forecast_kwh: Total PV forecast for the period (kWh)
        pv_forecast_confidence: Forecast confidence (0.0-1.0)
        price_spread_percent: Price spread between low/high (%)
        soc_runway_hours: Hours of battery at current consumption
        demand_kwh_per_hour: Average demand rate (kWh/h)
        forecast_quality: Quality status of PV forecast
        flags: Rollout flags for feature control
        price_quality: Optional quality status of price data

    Returns:
        DayContextProfile with selected profile and reason
    """
    selector = DayPolicySelector()
    return selector.select(
        pv_forecast_kwh=pv_forecast_kwh,
        pv_forecast_confidence=pv_forecast_confidence,
        price_spread_percent=price_spread_percent,
        soc_runway_hours=soc_runway_hours,
        demand_kwh_per_hour=demand_kwh_per_hour,
        forecast_quality=forecast_quality,
        flags=flags,
        price_quality=price_quality,
    )


def is_pv_first_profile(profile: DayContextProfile) -> bool:
    """Check if a profile enforces PV-first constraint.

    Args:
        profile: The profile to check

    Returns:
        True if PV-first is enforced (grid charging not allowed)
    """
    return profile.pv_first_enforced


def allows_economic_charging(profile: DayContextProfile) -> bool:
    """Check if a profile allows economic grid charging.

    Args:
        profile: The profile to check

    Returns:
        True if economic grid charging is allowed
    """
    return profile.allows_grid_charging


def get_profile_summary(profile: DayContextProfile) -> Dict[str, Any]:
    """Get a summary of the profile for logging/debugging.

    Args:
        profile: The profile to summarize

    Returns:
        Dict with profile details
    """
    return {
        "profile_id": profile.profile_id,
        "reason_code": profile.reason_code,
        "precedence_level": profile.precedence_level,
        "allows_grid_charging": profile.allows_grid_charging,
        "pv_first_enforced": profile.pv_first_enforced,
    }
