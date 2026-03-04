"""Tests for rollout flags feature flag system."""

import pytest
from typing import Dict, Any

from custom_components.oig_cloud.battery_forecast.planning.rollout_flags import (
    RolloutFlags,
    DEFAULT_FLAGS,
    AGGRESSIVE_FLAGS,
    get_flags_from_config,
    get_config_from_flags,
    validate_flags,
    get_effective_flags,
    is_pv_first_active,
    is_boiler_coordination_active,
    is_any_new_policy_active,
)


class TestRolloutFlags:
    """Test RolloutFlags dataclass and basic functionality."""

    def test_default_flags_all_disabled(self):
        """Test that DEFAULT_FLAGS has all policies disabled."""
        flags = DEFAULT_FLAGS
        
        assert flags.pv_first_policy_enabled is False
        assert flags.boiler_coordination_enabled is False
        assert flags.emergency_rollback is False
        assert flags.any_new_policy_enabled is False
        assert flags.is_legacy_mode is True

    def test_aggressive_flags_all_enabled(self):
        """Test that AGGRESSIVE_FLAGS has all policies enabled."""
        flags = AGGRESSIVE_FLAGS
        
        assert flags.pv_first_policy_enabled is True
        assert flags.boiler_coordination_enabled is True
        assert flags.emergency_rollback is False
        assert flags.any_new_policy_enabled is True
        assert flags.is_legacy_mode is False

    def test_any_new_policy_enabled_property(self):
        """Test any_new_policy_enabled property."""
        # Both disabled
        flags1 = RolloutFlags()
        assert flags1.any_new_policy_enabled is False
        
        # Only PV-first enabled
        flags2 = RolloutFlags(pv_first_policy_enabled=True)
        assert flags2.any_new_policy_enabled is True
        
        # Only boiler enabled
        flags3 = RolloutFlags(boiler_coordination_enabled=True)
        assert flags3.any_new_policy_enabled is True
        
        # Both enabled
        flags4 = RolloutFlags(pv_first_policy_enabled=True, boiler_coordination_enabled=True)
        assert flags4.any_new_policy_enabled is True

    def test_is_legacy_mode_property(self):
        """Test is_legacy_mode property."""
        # All disabled
        flags1 = RolloutFlags()
        assert flags1.is_legacy_mode is True
        
        # Emergency rollback enabled
        flags2 = RolloutFlags(emergency_rollback=True)
        assert flags2.is_legacy_mode is True
        
        # New policies enabled but no rollback
        flags3 = RolloutFlags(pv_first_policy_enabled=True)
        assert flags3.is_legacy_mode is False
        
        # New policies enabled with rollback (should still be legacy)
        flags4 = RolloutFlags(
            pv_first_policy_enabled=True,
            boiler_coordination_enabled=True,
            emergency_rollback=True
        )
        assert flags4.is_legacy_mode is True


class TestConfigParsing:
    """Test configuration parsing functions."""

    def test_get_flags_from_config_empty(self):
        """Test parsing empty config returns defaults."""
        config: Dict[str, Any] = {}
        flags = get_flags_from_config(config)
        
        assert flags.pv_first_policy_enabled is False
        assert flags.boiler_coordination_enabled is False
        assert flags.emergency_rollback is False

    def test_get_flags_from_config_with_values(self):
        """Test parsing config with flag values."""
        config: Dict[str, Any] = {
            "pv_first_policy_enabled": True,
            "boiler_coordination_enabled": True,
            "emergency_rollback": True,
        }
        flags = get_flags_from_config(config)
        
        assert flags.pv_first_policy_enabled is True
        assert flags.boiler_coordination_enabled is True
        assert flags.emergency_rollback is True

    def test_get_flags_from_config_partial_values(self):
        """Test parsing config with only some values."""
        config: Dict[str, Any] = {
            "pv_first_policy_enabled": True,
            # boiler_coordination_enabled and emergency_rollback missing
        }
        flags = get_flags_from_config(config)
        
        assert flags.pv_first_policy_enabled is True
        assert flags.boiler_coordination_enabled is False  # Default
        assert flags.emergency_rollback is False  # Default

    def test_get_config_from_flags(self):
        """Test converting flags back to config format."""
        flags = RolloutFlags(
            pv_first_policy_enabled=True,
            boiler_coordination_enabled=False,
            emergency_rollback=True,
        )
        config = get_config_from_flags(flags)
        
        expected = {
            "pv_first_policy_enabled": True,
            "boiler_coordination_enabled": False,
            "emergency_rollback": True,
            "enable_pre_peak_charging": False,
            "pre_peak_charging_canary_soc_threshold_kwh": 1.5,
        }
        assert config == expected

    def test_config_roundtrip(self):
        """Test that config -> flags -> config preserves values."""
        original_config: Dict[str, Any] = {
            "pv_first_policy_enabled": True,
            "boiler_coordination_enabled": False,
            "emergency_rollback": True,
            "enable_pre_peak_charging": False,
            "pre_peak_charging_canary_soc_threshold_kwh": 1.5,
        }
        
        flags = get_flags_from_config(original_config)
        restored_config = get_config_from_flags(flags)
        
        assert restored_config == original_config


class TestValidation:
    """Test flag validation functions."""

    def test_validate_flags_all_combinations(self):
        """Test that all flag combinations are currently valid."""
        # Test all combinations of boolean flags (2^3 = 8 combinations)
        for pv_enabled in [False, True]:
            for boiler_enabled in [False, True]:
                for rollback in [False, True]:
                    flags = RolloutFlags(
                        pv_first_policy_enabled=pv_enabled,
                        boiler_coordination_enabled=boiler_enabled,
                        emergency_rollback=rollback,
                    )
                    assert validate_flags(flags) is True


class TestEffectiveFlags:
    """Test effective flags calculation considering emergency rollback."""

    def test_effective_flags_no_rollback(self):
        """Test effective flags when emergency rollback is False."""
        original = RolloutFlags(
            pv_first_policy_enabled=True,
            boiler_coordination_enabled=True,
            emergency_rollback=False,
        )
        effective = get_effective_flags(original)
        
        # Should be unchanged
        assert effective == original
        assert effective.pv_first_policy_enabled is True
        assert effective.boiler_coordination_enabled is True
        assert effective.emergency_rollback is False

    def test_effective_flags_with_rollback(self):
        """Test effective flags when emergency rollback is True."""
        original = RolloutFlags(
            pv_first_policy_enabled=True,
            boiler_coordination_enabled=True,
            emergency_rollback=True,
        )
        effective = get_effective_flags(original)
        
        # Should have new policies disabled but rollback active
        assert effective.pv_first_policy_enabled is False
        assert effective.boiler_coordination_enabled is False
        assert effective.emergency_rollback is True

    def test_effective_flags_rollback_overrides_all(self):
        """Test that emergency rollback overrides all other flags."""
        # Start with aggressive flags
        original = AGGRESSIVE_FLAGS
        assert original.pv_first_policy_enabled is True
        assert original.boiler_coordination_enabled is True
        assert original.emergency_rollback is False
        
        # Enable rollback
        original.emergency_rollback = True
        effective = get_effective_flags(original)
        
        # All new policies should be disabled
        assert effective.pv_first_policy_enabled is False
        assert effective.boiler_coordination_enabled is False
        assert effective.emergency_rollback is True


class TestUtilityFunctions:
    """Test utility functions for checking policy status."""

    def test_is_pv_first_active(self):
        """Test is_pv_first_active function."""
        # No policies active
        flags1 = RolloutFlags()
        assert is_pv_first_active(flags1) is False
        
        # PV-first enabled, no rollback
        flags2 = RolloutFlags(pv_first_policy_enabled=True)
        assert is_pv_first_active(flags2) is True
        
        # PV-first enabled but rolled back
        flags3 = RolloutFlags(
            pv_first_policy_enabled=True,
            emergency_rollback=True,
        )
        assert is_pv_first_active(flags3) is False

    def test_is_boiler_coordination_active(self):
        """Test is_boiler_coordination_active function."""
        # No policies active
        flags1 = RolloutFlags()
        assert is_boiler_coordination_active(flags1) is False
        
        # Boiler coordination enabled, no rollback
        flags2 = RolloutFlags(boiler_coordination_enabled=True)
        assert is_boiler_coordination_active(flags2) is True
        
        # Boiler coordination enabled but rolled back
        flags3 = RolloutFlags(
            boiler_coordination_enabled=True,
            emergency_rollback=True,
        )
        assert is_boiler_coordination_active(flags3) is False

    def test_is_any_new_policy_active(self):
        """Test is_any_new_policy_active function."""
        # No policies active
        flags1 = RolloutFlags()
        assert is_any_new_policy_active(flags1) is False
        
        # Only PV-first active
        flags2 = RolloutFlags(pv_first_policy_enabled=True)
        assert is_any_new_policy_active(flags2) is True
        
        # Only boiler active
        flags3 = RolloutFlags(boiler_coordination_enabled=True)
        assert is_any_new_policy_active(flags3) is True
        
        # Both active
        flags4 = RolloutFlags(
            pv_first_policy_enabled=True,
            boiler_coordination_enabled=True,
        )
        assert is_any_new_policy_active(flags4) is True
        
        # Both active but rolled back
        flags5 = RolloutFlags(
            pv_first_policy_enabled=True,
            boiler_coordination_enabled=True,
            emergency_rollback=True,
        )
        assert is_any_new_policy_active(flags5) is False


# Test for new policy enabled path
def test_new_policy_enabled_path():
    """Test that new precedence branch executes when flag ON."""
    # Create flags with PV-first enabled
    flags = RolloutFlags(pv_first_policy_enabled=True)
    
    # Verify that PV-first is active
    assert is_pv_first_active(flags) is True
    
    # Verify that new policies are considered active
    assert is_any_new_policy_active(flags) is True
    
    # Verify that we're not in legacy mode
    assert flags.is_legacy_mode is False
    
    # Test with boiler coordination also enabled
    flags_both = RolloutFlags(
        pv_first_policy_enabled=True,
        boiler_coordination_enabled=True,
    )
    
    assert is_pv_first_active(flags_both) is True
    assert is_boiler_coordination_active(flags_both) is True
    assert is_any_new_policy_active(flags_both) is True
    assert flags_both.is_legacy_mode is False


# Test for rollback restoring legacy logic
def test_rollback_restores_legacy_logic():
    """Test that outputs match legacy behavior when rollback flag TRUE."""
    # Create flags with new policies enabled but rollback active
    flags = RolloutFlags(
        pv_first_policy_enabled=True,
        boiler_coordination_enabled=True,
        emergency_rollback=True,
    )
    
    # Get effective flags (should have rollback applied)
    effective = get_effective_flags(flags)
    
    # Verify that all new policies are disabled
    assert effective.pv_first_policy_enabled is False
    assert effective.boiler_coordination_enabled is False
    assert effective.emergency_rollback is True
    
    # Verify utility functions respect rollback
    assert is_pv_first_active(flags) is False
    assert is_boiler_coordination_active(flags) is False
    assert is_any_new_policy_active(flags) is False
    
    # Verify that we're in legacy mode
    assert flags.is_legacy_mode is True
    
    # Test that default flags (all disabled) also give legacy behavior
    default_flags = DEFAULT_FLAGS
    assert is_pv_first_active(default_flags) is False
    assert is_boiler_coordination_active(default_flags) is False
    assert is_any_new_policy_active(default_flags) is False
    assert default_flags.is_legacy_mode is True