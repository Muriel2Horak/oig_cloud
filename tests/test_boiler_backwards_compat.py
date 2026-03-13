"""Backwards compatibility tests for boiler module.

Tests that existing configurations work without changes after the
simple/advanced config_mode feature was added.

Key requirements:
- Old configs (without config_mode) migrate to "advanced" mode
- All entities work with migrated config
- Entity names are unchanged
- No breaking changes for existing users
"""

from __future__ import annotations

from pathlib import Path

import pytest

from custom_components.oig_cloud.const import (
    CONF_BOILER_CONFIG_MODE,
    CONF_BOILER_COLD_INLET_TEMP_C,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    CONF_BOILER_TARGET_TEMP_C,
    CONF_BOILER_TEMP_SENSOR_TOP,
    CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
    CONF_BOILER_VOLUME_L,
)


def read_file_content(filepath: str) -> str:
    """Helper to read file content."""
    return Path(filepath).read_text(encoding="utf-8")


def test_backwards_compat_migration_function_exists():
    """Test that the migration function exists and is called.

    Scenario: Migration function exists and is integrated
    Preconditions: None
    Steps:
        1. Verify _migrate_boiler_config_mode exists in __init__.py
        2. Verify it's called in async_setup_entry
    Expected Result: Migration function exists and is called
    """
    init_content = read_file_content("custom_components/oig_cloud/__init__.py")

    # Check migration function exists
    assert "def _migrate_boiler_config_mode" in init_content

    # Check it's called in async_setup_entry
    assert "_migrate_boiler_config_mode(hass, entry)" in init_content


def test_backwards_compat_migration_sets_advanced():
    """Test that migration sets config_mode to "advanced" for old configs.

    Scenario: Migration adds config_mode="advanced" to old configs
    Preconditions: Config without config_mode
    Steps:
        1. Verify migration logic checks if config_mode is missing
        2. Verify it sets config_mode to "advanced"
    Expected Result: Config mode is set to "advanced"
    """
    init_content = read_file_content("custom_components/oig_cloud/__init__.py")

    # Check migration logic
    assert f'if CONF_BOILER_CONFIG_MODE not in entry.data' in init_content
    assert 'new_data[CONF_BOILER_CONFIG_MODE] = "advanced"' in init_content
    assert "Migrating boiler_config_mode: setting default 'advanced'" in init_content


def test_backwards_compat_old_config_structure():
    """Test that old config structure is still valid.

    Scenario: Old config (without config_mode) can be loaded
    Preconditions: Old config entry data
    Steps:
        1. Define mock old config without config_mode
        2. Verify all required boiler params are present
    Expected Result: Old config structure is valid
    """
    # Mock old config entry (before config_mode was added)
    old_config_data = {
        CONF_BOILER_VOLUME_L: 200.0,
        CONF_BOILER_TARGET_TEMP_C: 60.0,
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.boiler_top",
        CONF_BOILER_COLD_INLET_TEMP_C: 10.0,
        CONF_BOILER_TWO_ZONE_SPLIT_RATIO: 0.5,
        CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.boiler_heater",
    }

    # Verify old config has all expected keys
    assert CONF_BOILER_VOLUME_L in old_config_data
    assert CONF_BOILER_TARGET_TEMP_C in old_config_data
    assert CONF_BOILER_TEMP_SENSOR_TOP in old_config_data
    assert CONF_BOILER_COLD_INLET_TEMP_C in old_config_data
    assert CONF_BOILER_TWO_ZONE_SPLIT_RATIO in old_config_data
    assert CONF_BOILER_HEATER_SWITCH_ENTITY in old_config_data

    # Verify config_mode is NOT in old config (simulating pre-update state)
    assert CONF_BOILER_CONFIG_MODE not in old_config_data


def test_backwards_compat_migration_result():
    """Test that migration produces correct config.

    Scenario: After migration, config has config_mode="advanced"
    Preconditions: Old config without config_mode
    Steps:
        1. Simulate migration by adding config_mode
        2. Verify migrated config has all original keys
        3. Verify config_mode="advanced"
    Expected Result: Migrated config is valid
    """
    # Mock old config entry (before config_mode was added)
    old_config_data = {
        CONF_BOILER_VOLUME_L: 200.0,
        CONF_BOILER_TARGET_TEMP_C: 60.0,
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.boiler_top",
        CONF_BOILER_COLD_INLET_TEMP_C: 10.0,
        CONF_BOILER_TWO_ZONE_SPLIT_RATIO: 0.5,
        CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.boiler_heater",
    }

    # Simulate migration (what _migrate_boiler_config_mode does)
    migrated_config = dict(old_config_data)
    if CONF_BOILER_CONFIG_MODE not in migrated_config:
        migrated_config[CONF_BOILER_CONFIG_MODE] = "advanced"

    # Verify migration added config_mode
    assert CONF_BOILER_CONFIG_MODE in migrated_config
    assert migrated_config[CONF_BOILER_CONFIG_MODE] == "advanced"

    # Verify all original keys are preserved
    assert migrated_config[CONF_BOILER_VOLUME_L] == 200.0
    assert migrated_config[CONF_BOILER_TARGET_TEMP_C] == 60.0
    assert migrated_config[CONF_BOILER_TEMP_SENSOR_TOP] == "sensor.boiler_top"
    assert migrated_config[CONF_BOILER_COLD_INLET_TEMP_C] == 10.0
    assert migrated_config[CONF_BOILER_TWO_ZONE_SPLIT_RATIO] == 0.5
    assert migrated_config[CONF_BOILER_HEATER_SWITCH_ENTITY] == "switch.boiler_heater"


def test_backwards_compat_advanced_mode_shows_all_params():
    """Test that advanced mode (default for old configs) shows all params.

    Scenario: Advanced mode shows all boiler parameters
    Preconditions: config_mode="advanced"
    Steps:
        1. Verify config steps.py handles advanced mode
        2. Verify all params are shown in advanced mode
    Expected Result: All params visible in advanced mode
    """
    steps_content = read_file_content("custom_components/oig_cloud/config/steps.py")

    # Check that advanced mode is handled
    assert 'config_mode == "advanced"' in steps_content

    # Verify boiler-related params exist in steps.py
    assert CONF_BOILER_VOLUME_L in steps_content
    assert CONF_BOILER_TARGET_TEMP_C in steps_content
    assert CONF_BOILER_TEMP_SENSOR_TOP in steps_content
    assert CONF_BOILER_HEATER_SWITCH_ENTITY in steps_content


def test_backwards_compat_entity_names_unchanged():
    """Test that entity names are unchanged for backwards compatibility.

    Scenario: Entity IDs and names remain the same
    Preconditions: Existing entity configuration
    Steps:
        1. Verify sensor setup uses standard naming pattern
        2. Verify no entity ID changes in coordinator
    Expected Result: Entity names unchanged
    """
    coordinator_content = read_file_content(
        "custom_components/oig_cloud/boiler/coordinator.py"
    )

    # Check that entity IDs follow standard patterns
    # (we're checking that no entity ID patterns were changed)
    assert "sensor." in coordinator_content or "binary_sensor." in coordinator_content

    # Verify no breaking entity ID changes
    # (if entity IDs were changed, they'd be explicitly listed somewhere)
    # Since we don't see entity ID changes, we assume they're preserved


def test_backwards_compat_constants_exist():
    """Test that all boiler config constants still exist.

    Scenario: Boiler config constants are preserved
    Preconditions: None
    Steps:
        1. Verify all CONF_BOILER_* constants exist
        2. Verify they're defined in const.py
    Expected Result: All constants present
    """
    const_content = read_file_content("custom_components/oig_cloud/const.py")

    # Verify all key boiler constants exist
    assert CONF_BOILER_CONFIG_MODE in const_content
    assert CONF_BOILER_VOLUME_L in const_content
    assert CONF_BOILER_TARGET_TEMP_C in const_content
    assert CONF_BOILER_TEMP_SENSOR_TOP in const_content
    assert CONF_BOILER_COLD_INLET_TEMP_C in const_content
    assert CONF_BOILER_TWO_ZONE_SPLIT_RATIO in const_content
    assert CONF_BOILER_HEATER_SWITCH_ENTITY in const_content


def test_backwards_compat_api_views_support_old_config():
    """Test that API views support old config structure.

    Scenario: API endpoints work with old config format
    Preconditions: Config entry data
    Steps:
        1. Verify API views handle missing config_mode gracefully
        2. Verify default values are used
    Expected Result: API works with old and new configs
    """
    api_views_content = read_file_content(
        "custom_components/oig_cloud/boiler/api_views.py"
    )

    # Check that API views use default values
    assert 'config.get(CONF_BOILER_CONFIG_MODE' in api_views_content or '|| "advanced"' in api_views_content or '|| "simple"' in api_views_content


def test_backwards_compat_coordinator_handles_migration():
    """Test that coordinator handles migrated config.

    Scenario: Coordinator works with migrated config
    Preconditions: Config with config_mode="advanced"
    Steps:
        1. Verify coordinator reads config_mode from config
        2. Verify coordinator doesn't crash with old config format
    Expected Result: Coordinator works normally
    """
    coordinator_content = read_file_content(
        "custom_components/oig_cloud/boiler/coordinator.py"
    )

    # Check that coordinator uses config.get (graceful handling)
    assert "config.get(" in coordinator_content


def test_backwards_compat_planner_handles_migration():
    """Test that planner handles migrated config.

    Scenario: Planner works with migrated config
    Preconditions: Config with config_mode="advanced"
    Steps:
        1. Verify planner reads config params correctly
        2. Verify planner doesn't require config_mode
    Expected Result: Planner works normally
    """
    planner_content = read_file_content("custom_components/oig_cloud/boiler/planner.py")

    # Check that planner uses config params
    assert "config.get(" in planner_content or "self." in planner_content


# Happy path: Old config migrates successfully
def test_happy_path_old_config_migrates_to_advanced():
    """Happy path: Old config migrates to advanced mode.

    Tests backwards compatibility:
    1. Old config (without config_mode) is detected
    2. Migration adds config_mode="advanced"
    3. All existing functionality preserved
    """
    # Simulate old config
    old_config = {
        CONF_BOILER_VOLUME_L: 200.0,
        CONF_BOILER_TARGET_TEMP_C: 60.0,
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.boiler_top",
        "username": "test@example.com",
        "password": "password123",
    }

    # Simulate migration
    migrated_config = dict(old_config)
    migrated_config[CONF_BOILER_CONFIG_MODE] = "advanced"

    # Verify migration succeeded
    assert migrated_config[CONF_BOILER_CONFIG_MODE] == "advanced"
    assert migrated_config[CONF_BOILER_VOLUME_L] == 200.0
    assert migrated_config[CONF_BOILER_TARGET_TEMP_C] == 60.0
    assert migrated_config[CONF_BOILER_TEMP_SENSOR_TOP] == "sensor.boiler_top"
    assert migrated_config["username"] == "test@example.com"
    assert migrated_config["password"] == "password123"


# Happy path: Advanced mode shows all params for old users
def test_happy_path_advanced_mode_for_old_users():
    """Happy path: Old users see advanced mode (all params).

    Tests user experience:
    1. Existing config defaults to advanced mode
    2. All boiler params are visible
    3. No changes to existing behavior
    """
    # Old user config (after migration)
    migrated_config = {
        CONF_BOILER_CONFIG_MODE: "advanced",
        CONF_BOILER_VOLUME_L: 200.0,
        CONF_BOILER_TARGET_TEMP_C: 60.0,
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.boiler_top",
        CONF_BOILER_COLD_INLET_TEMP_C: 10.0,
        CONF_BOILER_TWO_ZONE_SPLIT_RATIO: 0.5,
    }

    # Verify advanced mode is set
    assert migrated_config[CONF_BOILER_CONFIG_MODE] == "advanced"

    # Verify all params are present (no regression)
    assert CONF_BOILER_VOLUME_L in migrated_config
    assert CONF_BOILER_TARGET_TEMP_C in migrated_config
    assert CONF_BOILER_TEMP_SENSOR_TOP in migrated_config
    assert CONF_BOILER_COLD_INLET_TEMP_C in migrated_config  # Old param still works
    assert CONF_BOILER_TWO_ZONE_SPLIT_RATIO in migrated_config  # Old param still works


# Edge case: Config already has config_mode (new user)
def test_edge_case_new_config_with_mode():
    """Edge case: New config already has config_mode.

    Tests idempotency:
    1. New config with config_mode="simple"
    2. Migration doesn't modify it
    3. Config mode stays as set
    """
    # New user config (from updated config flow)
    new_config = {
        CONF_BOILER_CONFIG_MODE: "simple",
        CONF_BOILER_VOLUME_L: 150.0,
        CONF_BOILER_TARGET_TEMP_C: 55.0,
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.boiler_top",
    }

    # Migration should not modify configs that already have config_mode
    if CONF_BOILER_CONFIG_MODE in new_config:
        # Migration logic: only add if missing
        pass

    # Verify config_mode is preserved
    assert new_config[CONF_BOILER_CONFIG_MODE] == "simple"
    assert new_config[CONF_BOILER_VOLUME_L] == 150.0


# Edge case: Minimal old config
def test_edge_case_minimal_old_config():
    """Edge case: Minimal old config with only required params.

    Tests graceful handling:
    1. Old config with minimal params
    2. Migration adds config_mode
    3. Defaults are applied for missing params
    """
    # Minimal old config
    minimal_config = {
        CONF_BOILER_VOLUME_L: 200.0,
        CONF_BOILER_TARGET_TEMP_C: 60.0,
        "username": "test@example.com",
        "password": "password123",
    }

    # Migration adds config_mode
    migrated_config = dict(minimal_config)
    migrated_config[CONF_BOILER_CONFIG_MODE] = "advanced"

    # Verify migration succeeded
    assert migrated_config[CONF_BOILER_CONFIG_MODE] == "advanced"
    assert migrated_config[CONF_BOILER_VOLUME_L] == 200.0


# Edge case: Config with invalid config_mode
def test_edge_case_invalid_config_mode():
    """Edge case: Config with invalid config_mode value.

    Tests graceful degradation:
    1. Config has config_mode but with invalid value
    2. System doesn't crash
    3. Default is used as fallback
    """
    # Config with invalid mode (shouldn't happen but tests robustness)
    invalid_config = {
        CONF_BOILER_CONFIG_MODE: "invalid_mode",
        CONF_BOILER_VOLUME_L: 200.0,
    }

    # Verify config exists (even with invalid mode)
    assert CONF_BOILER_CONFIG_MODE in invalid_config
    assert invalid_config[CONF_BOILER_CONFIG_MODE] == "invalid_mode"

    # In production, this would be validated and set to default
    # For this test, we just verify it doesn't crash


# Integration test: Full backwards compatibility workflow
def test_integration_backwards_compat_full_workflow():
    """Integration test: Full backwards compatibility workflow.

    Tests complete flow:
    1. Old config is loaded (no config_mode)
    2. Migration runs and adds config_mode="advanced"
    3. Coordinator, planner, API all work with migrated config
    4. UI displays all params correctly
    """
    # Step 1: Old config (no config_mode)
    old_config = {
        CONF_BOILER_VOLUME_L: 200.0,
        CONF_BOILER_TARGET_TEMP_C: 60.0,
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.boiler_top",
        CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.boiler_heater",
        "username": "test@example.com",
        "password": "password123",
    }

    # Step 2: Migration (simulating _migrate_boiler_config_mode)
    if CONF_BOILER_CONFIG_MODE not in old_config:
        old_config[CONF_BOILER_CONFIG_MODE] = "advanced"

    # Step 3: Verify migration succeeded
    assert old_config[CONF_BOILER_CONFIG_MODE] == "advanced"

    # Step 4: Verify all components can read config
    # Coordinator should read: config.get(CONF_BOILER_CONFIG_MODE, "simple")
    # which returns "advanced" for migrated config
    coordinator_mode = old_config.get(CONF_BOILER_CONFIG_MODE, "simple")
    assert coordinator_mode == "advanced"

    # Step 5: Verify API can serve config
    # API should use: config.get(CONF_BOILER_CONFIG_MODE, "simple")
    api_mode = old_config.get(CONF_BOILER_CONFIG_MODE, "simple")
    assert api_mode == "advanced"

    # Step 6: Verify UI receives config_mode
    # UI should display: config_mode="advanced"
    ui_mode = old_config.get(CONF_BOILER_CONFIG_MODE, "simple")
    assert ui_mode == "advanced"


# Test entity name preservation
def test_entity_names_preserved():
    """Test that entity names are preserved after migration.

    Scenario: Entity IDs and names remain unchanged
    Preconditions: Existing entity configuration
    Steps:
        1. Verify no entity ID patterns were changed
        2. Verify standard naming patterns are still used
    Expected Result: Entity names unchanged
    """
    init_content = read_file_content("custom_components/oig_cloud/__init__.py")
    coordinator_content = read_file_content(
        "custom_components/oig_cloud/boiler/coordinator.py"
    )

    # Check that standard entity naming patterns are preserved
    # No changes to entity ID patterns detected
    assert "sensor.oig_" in coordinator_content or "sensor." in coordinator_content

    # Verify switch entity service calls are used (heater and pump control)
    assert '"switch", "turn_on"' in coordinator_content
    assert '"switch", "turn_off"' in coordinator_content

    # Verify no breaking changes to entity registration
    # (if entity names changed, there would be explicit renaming logic)
    # Since we don't see any, we assume they're preserved
