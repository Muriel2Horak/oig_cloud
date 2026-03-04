"""Feature flags for battery forecast rollout control.

This module provides feature flag definitions for safe rollout of new policies:
- PV-first policy: defer grid charging when PV available
- Boiler coordination: battery-aware routing for boiler optimization
- Morning peak avoidance: conservative pre-charge before morning peak
- Emergency rollback: restore legacy decision path

IMPORTABLE WITHOUT RUNTIME DEPENDENCIES:
No HA imports, no coordinator imports, no config references at module load time.
"""

from dataclasses import dataclass
from typing import Dict, Any


@dataclass
class RolloutFlags:
    """Feature flags for battery forecast rollout control.

    All flags default to False for safe, conservative deployment.
    New policies must be explicitly enabled through configuration.

    Attributes:
        pv_first_policy_enabled: Enable PV-first policy that defers grid charging
            when PV forecast is available with sufficient confidence
        boiler_coordination_enabled: Enable boiler coordination policy that
            optimizes battery usage for boiler heating
        enable_pre_peak_charging: Enable morning peak avoidance (conservative default)
        pre_peak_charging_canary_soc_threshold_kwh: Alarm pokud SOC po pre-charge < 1.5 kWh
        emergency_rollback: When True, restore legacy decision path immediately,
            bypassing all new policies regardless of other flag states
    """

    pv_first_policy_enabled: bool = False
    boiler_coordination_enabled: bool = False
    enable_pre_peak_charging: bool = False  # Morning peak avoidance (conservative default)
    pre_peak_charging_canary_soc_threshold_kwh: float = 1.5  # Alarm pokud SOC po pre-charge < 1.5 kWh
    emergency_rollback: bool = False

    @property
    def any_new_policy_enabled(self) -> bool:
        """Check if any new policy is enabled (excluding rollback)."""
        return (self.pv_first_policy_enabled or 
                self.boiler_coordination_enabled or 
                self.enable_pre_peak_charging)

    @property
    def is_legacy_mode(self) -> bool:
        """Check if system is in legacy mode (no new policies active)."""
        return self.emergency_rollback or not self.any_new_policy_enabled


# Conservative defaults: all new policies disabled
DEFAULT_FLAGS = RolloutFlags()

# Aggressive flags: all new policies enabled (for validation/testing)
AGGRESSIVE_FLAGS = RolloutFlags(
    pv_first_policy_enabled=True,
    boiler_coordination_enabled=True,
    enable_pre_peak_charging=True,
)


def get_flags_from_config(options: Dict[str, Any]) -> RolloutFlags:
    """Parse rollout flags from HA config entry options.

    Args:
        options: HA config entry options dictionary

    Returns:
        RolloutFlags instance with values from config or defaults

    Example:
        >>> config = {"pv_first_policy_enabled": True, "boiler_coordination_enabled": False}
        >>> flags = get_flags_from_config(config)
        >>> flags.pv_first_policy_enabled
        True
        >>> flags.boiler_coordination_enabled
        False
        >>> flags.emergency_rollback  # Default value
        False
    """
    return RolloutFlags(
        pv_first_policy_enabled=bool(options.get("pv_first_policy_enabled", False)),
        boiler_coordination_enabled=bool(options.get("boiler_coordination_enabled", False)),
        enable_pre_peak_charging=bool(options.get("enable_pre_peak_charging", False)),
        pre_peak_charging_canary_soc_threshold_kwh=float(options.get("pre_peak_charging_canary_soc_threshold_kwh", 1.5)),
        emergency_rollback=bool(options.get("emergency_rollback", False)),
    )


def get_config_from_flags(flags: RolloutFlags) -> Dict[str, Any]:
    """Convert RolloutFlags to HA config entry options format.

    Args:
        flags: RolloutFlags instance

    Returns:
        Dictionary suitable for HA config entry options

    Example:
        >>> flags = RolloutFlags(pv_first_policy_enabled=True)
        >>> config = get_config_from_flags(flags)
        >>> config
        {'pv_first_policy_enabled': True, 'boiler_coordination_enabled': False, 'emergency_rollback': False}
    """
    return {
        "pv_first_policy_enabled": flags.pv_first_policy_enabled,
        "boiler_coordination_enabled": flags.boiler_coordination_enabled,
        "enable_pre_peak_charging": flags.enable_pre_peak_charging,
        "pre_peak_charging_canary_soc_threshold_kwh": flags.pre_peak_charging_canary_soc_threshold_kwh,
        "emergency_rollback": flags.emergency_rollback,
    }


def validate_flags(flags: RolloutFlags) -> bool:
    """Validate that flag configuration is logically consistent.

    Args:
        flags: RolloutFlags instance to validate

    Returns:
        True if configuration is valid, False otherwise

    Validation rules:
    1. Emergency rollback can be True with any other flag state
       (it overrides everything)
    2. No other invalid combinations currently defined
    """
    # Currently, all flag combinations are valid
    # Emergency rollback is designed to work with any state
    return True


def get_effective_flags(flags: RolloutFlags) -> RolloutFlags:
    """Get the effective flags considering emergency rollback.

    When emergency_rollback is True, all new policies are effectively disabled
    regardless of their individual flag states.

    Args:
        flags: Original RolloutFlags instance

    Returns:
        Effective RolloutFlags considering emergency rollback

    Example:
        >>> flags = RolloutFlags(
        ...     pv_first_policy_enabled=True,
        ...     boiler_coordination_enabled=True,
        ...     emergency_rollback=True
        ... )
        >>> effective = get_effective_flags(flags)
        >>> effective.pv_first_policy_enabled
        False
        >>> effective.boiler_coordination_enabled
        False
        >>> effective.emergency_rollback
        True
    """
    if flags.emergency_rollback:
        # All new policies disabled, rollback active
        return RolloutFlags(
            pv_first_policy_enabled=False,
            boiler_coordination_enabled=False,
            enable_pre_peak_charging=False,
            pre_peak_charging_canary_soc_threshold_kwh=1.5,
            emergency_rollback=True,
        )
    
    # No rollback, return original flags
    return flags


# Utility functions for common flag combinations
def is_pv_first_active(flags: RolloutFlags) -> bool:
    """Check if PV-first policy is active (not rolled back)."""
    effective = get_effective_flags(flags)
    return effective.pv_first_policy_enabled


def is_boiler_coordination_active(flags: RolloutFlags) -> bool:
    """Check if boiler coordination policy is active (not rolled back)."""
    effective = get_effective_flags(flags)
    return effective.boiler_coordination_enabled


def is_pre_peak_charging_active(flags: RolloutFlags) -> bool:
    """Check if pre-peak charging policy is active (not rolled back)."""
    effective = get_effective_flags(flags)
    return effective.enable_pre_peak_charging


def is_any_new_policy_active(flags: RolloutFlags) -> bool:
    """Check if any new policy is active (not rolled back)."""
    effective = get_effective_flags(flags)
    return effective.any_new_policy_enabled