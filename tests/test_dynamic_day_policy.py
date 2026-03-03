"""Tests for dynamic-by-day policy scoring layer."""

import pytest

from custom_components.oig_cloud.battery_forecast.planning.dynamic_day_policy import (
    DayContextProfile,
    DayPolicySelector,
    DayProfileId,
    PolicyThresholds,
    PROFILE_CONSERVATIVE,
    PROFILE_COST_AWARE,
    PROFILE_LEGACY,
    PROFILE_PV_FIRST,
    allows_economic_charging,
    get_profile_summary,
    is_pv_first_profile,
    select_day_policy,
)
from custom_components.oig_cloud.battery_forecast.planning.input_quality import (
    InputQualityStatus,
)
from custom_components.oig_cloud.battery_forecast.planning.rollout_flags import (
    RolloutFlags,
)


class TestDayContextProfile:
    """Tests for DayContextProfile dataclass."""

    def test_profile_is_immutable(self):
        """Profile should be frozen (immutable)."""
        profile = DayContextProfile(
            profile_id="test",
            reason_code="test_reason",
        )
        with pytest.raises(AttributeError):
            profile.profile_id = "modified"

    def test_profile_has_required_fields(self):
        """Profile should have profile_id and reason_code."""
        profile = DayContextProfile(
            profile_id="test_profile",
            reason_code="test_reason",
            precedence_level=400,
            allows_grid_charging=True,
            pv_first_enforced=False,
        )
        assert profile.profile_id == "test_profile"
        assert profile.reason_code == "test_reason"
        assert profile.precedence_level == 400
        assert profile.allows_grid_charging is True
        assert profile.pv_first_enforced is False


class TestPredefinedProfiles:
    """Tests for predefined profile constants."""

    def test_pv_first_profile_disallows_grid_charging(self):
        """PV_FIRST profile should not allow grid charging."""
        assert PROFILE_PV_FIRST.pv_first_enforced is True
        assert PROFILE_PV_FIRST.allows_grid_charging is False
        assert PROFILE_PV_FIRST.precedence_level == 1000

    def test_cost_aware_profile_allows_grid_charging(self):
        """COST_AWARE profile should allow grid charging."""
        assert PROFILE_COST_AWARE.pv_first_enforced is False
        assert PROFILE_COST_AWARE.allows_grid_charging is True
        assert PROFILE_COST_AWARE.precedence_level == 400

    def test_conservative_profile_allows_grid_charging(self):
        """CONSERVATIVE profile should allow grid charging."""
        assert PROFILE_CONSERVATIVE.pv_first_enforced is False
        assert PROFILE_CONSERVATIVE.allows_grid_charging is True

    def test_legacy_profile_for_disabled_flags(self):
        """LEGACY profile should be used when flags are disabled."""
        assert PROFILE_LEGACY.profile_id == DayProfileId.LEGACY


class TestDayPolicySelector:
    """Tests for DayPolicySelector."""

    @pytest.fixture
    def selector(self):
        """Create a selector with default thresholds."""
        return DayPolicySelector()

    @pytest.fixture
    def flags_enabled(self):
        """Rollout flags with PV-first enabled."""
        return RolloutFlags(pv_first_policy_enabled=True)

    @pytest.fixture
    def flags_disabled(self):
        """Rollout flags with PV-first disabled."""
        return RolloutFlags(pv_first_policy_enabled=False)

    def test_selects_cost_profile_when_pv_weak(
        self, selector, flags_enabled
    ):
        """Weak PV + high evening price spread should select cost-aware profile."""
        profile = selector.select(
            pv_forecast_kwh=2.0,  # Weak PV (< 3.0 kWh)
            pv_forecast_confidence=0.8,
            price_spread_percent=35.0,  # High spread (> 30%)
            soc_runway_hours=8.0,  # Safe runway (> 6h)
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags_enabled,
        )

        assert profile.profile_id == DayProfileId.COST_AWARE
        assert profile.allows_grid_charging is True
        assert profile.pv_first_enforced is False
        assert "weak_pv" in profile.reason_code
        assert "spread" in profile.reason_code

    def test_pv_first_hard_guard_not_overridden(
        self, selector, flags_enabled
    ):
        """Strong PV day should ALWAYS return PV_FIRST regardless of cost factors."""
        # Even with high price spread (which would normally trigger cost_aware)
        # and low SOC runway, strong PV should still win
        profile = selector.select(
            pv_forecast_kwh=15.0,  # Strong PV (> 10.0 kWh)
            pv_forecast_confidence=0.8,
            price_spread_percent=50.0,  # Very high spread (tempting for arbitrage)
            soc_runway_hours=2.0,  # Low runway (would normally be conservative)
            demand_kwh_per_hour=2.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags_enabled,
        )

        assert profile.profile_id == DayProfileId.PV_FIRST
        assert profile.pv_first_enforced is True
        assert profile.allows_grid_charging is False
        assert "pv_strong" in profile.reason_code

    def test_legacy_when_flags_disabled(self, selector, flags_disabled):
        """When PV-first flag is disabled, should return LEGACY profile."""
        profile = selector.select(
            pv_forecast_kwh=15.0,  # Even strong PV
            pv_forecast_confidence=0.9,
            price_spread_percent=20.0,
            soc_runway_hours=8.0,
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags_disabled,
        )

        assert profile.profile_id == DayProfileId.LEGACY
        assert "disabled" in profile.reason_code

    def test_conservative_when_quality_degraded(self, selector, flags_enabled):
        """Degraded input quality still allows normal selection (DEGRADED is usable)."""
        profile = selector.select(
            pv_forecast_kwh=2.0,  # Weak PV
            pv_forecast_confidence=0.6,
            price_spread_percent=15.0,  # Not high enough for cost_aware
            soc_runway_hours=3.0,  # Below safe runway
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.DEGRADED,
            flags=flags_enabled,
        )

        # DEGRADED is usable, so normal selection applies -> CONSERVATIVE due to weak PV + low spread
        assert profile.profile_id == DayProfileId.CONSERVATIVE

    def test_conservative_when_quality_stale(self, selector, flags_enabled):
        """Stale input quality should select conservative profile."""
        profile = selector.select(
            pv_forecast_kwh=5.0,
            pv_forecast_confidence=0.6,
            price_spread_percent=25.0,
            soc_runway_hours=6.0,
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.STALE,
            flags=flags_enabled,
        )

        assert profile.profile_id == DayProfileId.CONSERVATIVE

    def test_pv_first_with_strong_pv_despite_degraded_quality(
        self, selector, flags_enabled
    ):
        """Strong PV should still be selected even with degraded quality."""
        profile = selector.select(
            pv_forecast_kwh=12.0,  # Strong PV
            pv_forecast_confidence=0.7,
            price_spread_percent=20.0,
            soc_runway_hours=4.0,
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.DEGRADED,
            flags=flags_enabled,
        )

        # Strong PV wins even with degraded quality
        assert profile.profile_id == DayProfileId.PV_FIRST
        assert "pv_strong" in profile.reason_code

    def test_conservative_when_low_runway_and_weak_pv(
        self, selector, flags_enabled
    ):
        """Low SOC runway with weak PV should be conservative."""
        profile = selector.select(
            pv_forecast_kwh=2.0,  # Weak PV
            pv_forecast_confidence=0.6,
            price_spread_percent=15.0,  # Not high enough for cost_aware
            soc_runway_hours=3.0,  # Not safe runway
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags_enabled,
        )

        assert profile.profile_id == DayProfileId.CONSERVATIVE

    def test_deterministic_selection(self, selector, flags_enabled):
        """Same inputs should always produce same output."""
        kwargs = dict(
            pv_forecast_kwh=5.0,
            pv_forecast_confidence=0.6,
            price_spread_percent=25.0,
            soc_runway_hours=4.0,
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags_enabled,
        )

        # Call multiple times with same inputs
        results = [selector.select(**kwargs) for _ in range(10)]

        # All results should be identical
        first = results[0]
        for result in results[1:]:
            assert result.profile_id == first.profile_id
            assert result.reason_code == first.reason_code
            assert result.precedence_level == first.precedence_level

    def test_price_quality_affects_selection(self, selector, flags_enabled):
        """Stale price quality should trigger conservative mode."""
        profile = selector.select(
            pv_forecast_kwh=2.0,
            pv_forecast_confidence=0.6,
            price_spread_percent=35.0,
            soc_runway_hours=8.0,
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags_enabled,
            price_quality=InputQualityStatus.STALE,
        )

        # Stale price should make us conservative
        assert profile.profile_id == DayProfileId.CONSERVATIVE


class TestSelectDayPolicyFunction:
    """Tests for the pure function interface."""

    def test_function_returns_same_as_selector(self):
        """Pure function should return same result as selector."""
        flags = RolloutFlags(pv_first_policy_enabled=True)

        profile = select_day_policy(
            pv_forecast_kwh=15.0,
            pv_forecast_confidence=0.8,
            price_spread_percent=25.0,
            soc_runway_hours=8.0,
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags,
        )

        assert profile.profile_id == DayProfileId.PV_FIRST


class TestHelperFunctions:
    """Tests for helper functions."""

    def test_is_pv_first_profile(self):
        """is_pv_first_profile should correctly identify PV-first profiles."""
        assert is_pv_first_profile(PROFILE_PV_FIRST) is True
        assert is_pv_first_profile(PROFILE_COST_AWARE) is False
        assert is_pv_first_profile(PROFILE_CONSERVATIVE) is False
        assert is_pv_first_profile(PROFILE_LEGACY) is False

    def test_allows_economic_charging(self):
        """allows_economic_charging should correctly identify charging permission."""
        assert allows_economic_charging(PROFILE_PV_FIRST) is False
        assert allows_economic_charging(PROFILE_COST_AWARE) is True
        assert allows_economic_charging(PROFILE_CONSERVATIVE) is True
        assert allows_economic_charging(PROFILE_LEGACY) is True

    def test_get_profile_summary(self):
        """get_profile_summary should return all profile details."""
        summary = get_profile_summary(PROFILE_COST_AWARE)

        assert summary["profile_id"] == DayProfileId.COST_AWARE
        assert "reason_code" in summary
        assert summary["precedence_level"] == 400
        assert summary["allows_grid_charging"] is True
        assert summary["pv_first_enforced"] is False


class TestPolicyThresholds:
    """Tests for policy threshold constants."""

    def test_thresholds_are_reasonable(self):
        """Threshold values should be in reasonable ranges."""
        thresholds = PolicyThresholds()

        # PV thresholds
        assert 5.0 <= thresholds.PV_STRONG_DAY_KWH <= 20.0
        assert 1.0 <= thresholds.PV_WEAK_DAY_KWH <= 5.0
        assert 0.3 <= thresholds.PV_CONFIDENCE_MIN <= 0.7

        # Price spread thresholds
        assert 20.0 <= thresholds.PRICE_SPREAD_HIGH_PERCENT <= 50.0
        assert 5.0 <= thresholds.PRICE_SPREAD_LOW_PERCENT <= 15.0

        # SOC runway thresholds
        assert 1.0 <= thresholds.SOC_RUNWAY_CRITICAL_HOURS <= 3.0
        assert 4.0 <= thresholds.SOC_RUNWAY_SAFE_HOURS <= 10.0


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    @pytest.fixture
    def selector(self):
        return DayPolicySelector()

    @pytest.fixture
    def flags_enabled(self):
        return RolloutFlags(pv_first_policy_enabled=True)

    def test_zero_pv_forecast(self, selector, flags_enabled):
        """Zero PV forecast should not trigger PV-first."""
        profile = selector.select(
            pv_forecast_kwh=0.0,
            pv_forecast_confidence=0.8,
            price_spread_percent=35.0,
            soc_runway_hours=8.0,
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags_enabled,
        )

        assert profile.profile_id != DayProfileId.PV_FIRST

    def test_zero_confidence(self, selector, flags_enabled):
        """Zero confidence should not trigger PV-first even with high forecast."""
        profile = selector.select(
            pv_forecast_kwh=15.0,
            pv_forecast_confidence=0.0,
            price_spread_percent=25.0,
            soc_runway_hours=8.0,
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags_enabled,
        )

        assert profile.profile_id != DayProfileId.PV_FIRST

    def test_exactly_at_strong_pv_threshold(self, selector, flags_enabled):
        """Exactly at strong PV threshold should trigger PV-first."""
        thresholds = PolicyThresholds()
        profile = selector.select(
            pv_forecast_kwh=thresholds.PV_STRONG_DAY_KWH,  # Exactly at threshold
            pv_forecast_confidence=thresholds.PV_CONFIDENCE_MIN,
            price_spread_percent=25.0,
            soc_runway_hours=8.0,
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags_enabled,
        )

        assert profile.profile_id == DayProfileId.PV_FIRST

    def test_just_below_strong_pv_threshold(self, selector, flags_enabled):
        """Just below strong PV threshold should NOT trigger PV-first."""
        thresholds = PolicyThresholds()
        profile = selector.select(
            pv_forecast_kwh=thresholds.PV_STRONG_DAY_KWH - 0.1,
            pv_forecast_confidence=0.8,
            price_spread_percent=15.0,  # Not high enough for cost_aware
            soc_runway_hours=4.0,
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags_enabled,
        )

        assert profile.profile_id != DayProfileId.PV_FIRST

    def test_negative_soc_runway(self, selector, flags_enabled):
        """Negative SOC runway (shouldn't happen but handle gracefully)."""
        profile = selector.select(
            pv_forecast_kwh=2.0,
            pv_forecast_confidence=0.6,
            price_spread_percent=35.0,
            soc_runway_hours=-1.0,  # Invalid but should not crash
            demand_kwh_per_hour=1.0,
            forecast_quality=InputQualityStatus.FRESH,
            flags=flags_enabled,
        )

        # Should still return a valid profile
        assert profile.profile_id in [
            DayProfileId.COST_AWARE,
            DayProfileId.CONSERVATIVE,
        ]
