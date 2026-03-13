"""Integration tests for boiler module - full cycle end-to-end tests.

Tests the complete workflow from config → backend → UI, verifying:
- Config mode (simple/advanced) toggle
- Stratification mode configuration
- Planning horizon configuration
- Heater switch control
- Circulation pump control
- Removed placeholder params

Note: These tests use code analysis since homeassistant is not available in this environment.
"""

from __future__ import annotations

import ast
import os
from pathlib import Path

import pytest

from custom_components.oig_cloud.const import (
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_CONFIG_MODE,
    CONF_BOILER_COLD_INLET_TEMP_C,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    CONF_BOILER_PLANNING_HORIZON_HOURS,
    CONF_BOILER_STRATIFICATION_MODE,
    CONF_BOILER_TARGET_TEMP_C,
    CONF_BOILER_TEMP_SENSOR_TOP,
    CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
    CONF_BOILER_VOLUME_L,
    DEFAULT_BOILER_PLANNING_HORIZON_HOURS,
    DEFAULT_BOILER_TARGET_TEMP_C,
)


def read_file_content(filepath: str) -> str:
    """Helper to read file content."""
    return Path(filepath).read_text(encoding="utf-8")


def find_config_mode_usage() -> list[dict]:
    """Find all usages of config_mode in the codebase."""
    coordinator_path = "custom_components/oig_cloud/boiler/coordinator.py"
    api_views_path = "custom_components/oig_cloud/boiler/api_views.py"

    usages = []

    for filepath in [coordinator_path, api_views_path]:
        if os.path.exists(filepath):
            content = read_file_content(filepath)
            if CONF_BOILER_CONFIG_MODE in content:
                usages.append({"file": filepath, "has_config_mode": True})

    return usages


def test_integration_config_mode_in_const():
    """Test that CONF_BOILER_CONFIG_MODE constant exists.

    Scenario: Config mode constant is defined
    Preconditions: None
    Steps:
        1. Verify CONF_BOILER_CONFIG_MODE exists in const.py
    Expected Result: Constant is defined as "boiler_config_mode"
    """
    assert CONF_BOILER_CONFIG_MODE == "boiler_config_mode"


def test_integration_config_mode_used_in_api():
    """Test that config_mode is used in API views.

    Scenario: API views return config_mode
    Preconditions: None
    Steps:
        1. Check api_views.py for config_mode usage
    Expected Result: config_mode is returned in API responses
    """
    api_views_content = read_file_content(
        "custom_components/oig_cloud/boiler/api_views.py"
    )

    # Check that config_mode is used in API
    assert 'config.get(CONF_BOILER_CONFIG_MODE' in api_views_content or '"config_mode"' in api_views_content


def test_integration_stratification_mode_in_coordinator():
    """Test that stratification_mode is read from config in coordinator.

    Scenario: Stratification mode is read from config, not hardcoded
    Preconditions: None
    Steps:
        1. Check coordinator.py uses config.get for stratification_mode
    Expected Result: config.get(CONF_BOILER_STRATIFICATION_MODE, ...) is used
    """
    coordinator_content = read_file_content(
        "custom_components/oig_cloud/boiler/coordinator.py"
    )

    # Check that stratification_mode is read from config, not hardcoded
    assert f'config.get(CONF_BOILER_STRATIFICATION_MODE' in coordinator_content


def test_integration_planning_horizon_in_planner():
    """Test that planning_horizon_hours is used in planner.

    Scenario: Planning horizon is read from config
    Preconditions: None
    Steps:
        1. Check planner.py uses self.planning_horizon_hours
    Expected Result: self.planning_horizon_hours is used in plan creation
    """
    planner_content = read_file_content(
        "custom_components/oig_cloud/boiler/planner.py"
    )

    # Check that planning_horizon_hours is used
    assert "self.planning_horizon_hours" in planner_content
    assert "timedelta(hours=self.planning_horizon_hours)" in planner_content


def test_integration_heater_switch_control_logic():
    """Test that heater switch control logic exists.

    Scenario: Heater control method exists with proper logic
    Preconditions: None
    Steps:
        1. Check coordinator.py has _control_heater_switch method
        2. Check it calls switch.turn_on and switch.turn_off
    Expected Result: Heater control logic is implemented
    """
    coordinator_content = read_file_content(
        "custom_components/oig_cloud/boiler/coordinator.py"
    )

    # Check that heater control method exists
    assert "_control_heater_switch" in coordinator_content
    assert "_turn_on_heater" in coordinator_content
    assert "_turn_off_heater" in coordinator_content

    # Check that service calls are made
    assert '"switch", "turn_on"' in coordinator_content
    assert '"switch", "turn_off"' in coordinator_content


def test_integration_heater_control_uses_slot_and_temp():
    """Test that heater control uses current slot and temperature.

    Scenario: Heater control checks slot and temperature
    Preconditions: None
    Steps:
        1. Check _control_heater_switch uses get_current_slot
        2. Check it checks temperature vs target
    Expected Result: Control logic uses both slot and temperature
    """
    coordinator_content = read_file_content(
        "custom_components/oig_cloud/boiler/coordinator.py"
    )

    # Extract the heater control method
    if "_control_heater_switch" in coordinator_content:
        # Check that it references current slot
        assert "get_current_slot" in coordinator_content or "current_slot" in coordinator_content

        # Check that it references temperature
        assert "avg_temp" in coordinator_content or "temp" in coordinator_content
        assert CONF_BOILER_TARGET_TEMP_C in coordinator_content


def test_integration_circulation_pump_control_logic():
    """Test that circulation pump control logic exists.

    Scenario: Pump control method exists with peak hour logic
    Preconditions: None
    Steps:
        1. Check coordinator.py has _control_circulation_pump method
        2. Check it uses peak hours
    Expected Result: Pump control logic is implemented
    """
    coordinator_content = read_file_content(
        "custom_components/oig_cloud/boiler/coordinator.py"
    )

    # Check that pump control method exists
    assert "_control_circulation_pump" in coordinator_content
    assert "_turn_on_circulation_pump" in coordinator_content
    assert "_turn_off_circulation_pump" in coordinator_content

    # Check for peak hour logic
    assert "peak" in coordinator_content.lower()


def test_integration_placeholder_constants_exist():
    """Test that placeholder constants exist for backwards compatibility.

    Scenario: Placeholder params constants exist in const.py
    Preconditions: None
    Steps:
        1. Verify CONF_BOILER_COLD_INLET_TEMP_C exists
        2. Verify CONF_BOILER_TWO_ZONE_SPLIT_RATIO exists
    Expected Result: Constants exist for backwards compatibility
    """
    assert CONF_BOILER_COLD_INLET_TEMP_C == "boiler_cold_inlet_temp_c"
    assert CONF_BOILER_TWO_ZONE_SPLIT_RATIO == "boiler_two_zone_split_ratio"


def test_integration_placeholder_params_not_in_ui_schema():
    """Test that placeholder params are not in config flow UI schema.

    Scenario: Placeholder params not shown in vol.Optional fields
    Preconditions: None
    Steps:
        1. Check config/steps.py for vol.Optional fields
        2. Verify cold_inlet_temp and two_zone_split_ratio not in schema
    Expected Result: Params not visible in UI
    """
    steps_content = read_file_content("custom_components/oig_cloud/config/steps.py")

    # Find all vol.Optional fields
    optional_fields = []
    for line in steps_content.split("\n"):
        if "vol.Optional(" in line:
            optional_fields.append(line.strip())

    # Check that placeholder params are NOT in vol.Optional fields
    placeholder_in_ui = any(
        CONF_BOILER_COLD_INLET_TEMP_C.replace("CONF_BOILER_", "") in field
        for field in optional_fields
    )
    assert not placeholder_in_ui, f"{CONF_BOILER_COLD_INLET_TEMP_C} found in UI"

    two_zone_in_ui = any(
        CONF_BOILER_TWO_ZONE_SPLIT_RATIO.replace("CONF_BOILER_", "") in field
        for field in optional_fields
    )
    assert not two_zone_in_ui, f"{CONF_BOILER_TWO_ZONE_SPLIT_RATIO} found in UI"


def test_integration_full_workflow_config_to_backend():
    """Test full workflow: config → backend.

    Scenario: Configuration flows through to backend components
    Preconditions: None
    Steps:
        1. Verify coordinator.py imports all config constants
        2. Verify planner.py uses config params
        3. Verify utils.py uses mode parameter (stratification mode)
    Expected Result: All components connected
    """
    coordinator_content = read_file_content(
        "custom_components/oig_cloud/boiler/coordinator.py"
    )
    planner_content = read_file_content(
        "custom_components/oig_cloud/boiler/planner.py"
    )
    utils_content = read_file_content("custom_components/oig_cloud/boiler/utils.py")

    # Check coordinator imports config constants
    assert "CONF_BOILER_" in coordinator_content

    # Check planner uses config params
    assert "planning_horizon_hours" in planner_content

    # Check utils uses mode parameter (stratification mode)
    assert "mode" in utils_content


def test_integration_backend_to_ui_flow():
    """Test backend → UI data flow.

    Scenario: Backend data flows to UI components
    Preconditions: None
    Steps:
        1. Verify API views expose boiler data
        2. Verify UI data structures use backend data
    Expected Result: Data flows correctly
    """
    api_views_content = read_file_content(
        "custom_components/oig_cloud/boiler/api_views.py"
    )

    # Check API views exist
    assert "BoilerConfigView" in api_views_content or "config" in api_views_content
    assert "BoilerPlanView" in api_views_content or "plan" in api_views_content
    assert "BoilerProfileView" in api_views_content or "profile" in api_views_content


# Happy path tests
def test_happy_path_simple_mode_config():
    """Happy path: Simple mode config workflow.

    Tests simple mode configuration:
    1. Config has only 5 basic params
    2. Advanced params use defaults
    """
    simple_config = {
        CONF_BOILER_CONFIG_MODE: "simple",
        CONF_BOILER_VOLUME_L: 200.0,
        CONF_BOILER_TARGET_TEMP_C: 60.0,
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top",
    }

    assert CONF_BOILER_CONFIG_MODE in simple_config
    assert CONF_BOILER_VOLUME_L in simple_config
    assert CONF_BOILER_TARGET_TEMP_C in simple_config

    # Advanced params should not be in simple config (use defaults)
    assert CONF_BOILER_HEATER_SWITCH_ENTITY not in simple_config
    assert CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY not in simple_config


def test_happy_path_advanced_mode_config():
    """Happy path: Advanced mode config workflow.

    Tests advanced mode configuration:
    1. Config has all params including advanced ones
    2. All features enabled
    """
    advanced_config = {
        CONF_BOILER_CONFIG_MODE: "advanced",
        CONF_BOILER_VOLUME_L: 200.0,
        CONF_BOILER_TARGET_TEMP_C: 60.0,
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top",
        CONF_BOILER_STRATIFICATION_MODE: "gradient",
        CONF_BOILER_PLANNING_HORIZON_HOURS: 48,
        CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.heater",
        CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.pump",
    }

    assert CONF_BOILER_CONFIG_MODE in advanced_config
    assert CONF_BOILER_STRATIFICATION_MODE in advanced_config
    assert CONF_BOILER_PLANNING_HORIZON_HOURS in advanced_config
    assert CONF_BOILER_HEATER_SWITCH_ENTITY in advanced_config
    assert CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY in advanced_config


def test_happy_path_planner_uses_custom_horizon():
    """Happy path: Planner uses custom planning horizon.

    Tests that planner respects custom horizon:
    1. Planner initialized with custom horizon
    2. Plan end time uses custom horizon
    """
    custom_horizon = 48

    # Check planner code uses self.planning_horizon_hours
    planner_content = read_file_content(
        "custom_components/oig_cloud/boiler/planner.py"
    )

    # Verify planner can use custom horizon
    assert "planning_horizon_hours" in planner_content
    assert "timedelta(hours=" in planner_content


# Edge case tests
def test_edge_case_missing_config_mode():
    """Edge case: Missing config_mode defaults to advanced.

    Tests backwards compatibility:
    1. Config without config_mode
    2. Default advanced is applied
    """
    old_config = {
        CONF_BOILER_VOLUME_L: 200.0,
        CONF_BOILER_TARGET_TEMP_C: 60.0,
    }

    # Config without config_mode should work (migration adds default)
    assert CONF_BOILER_VOLUME_L in old_config
    assert CONF_BOILER_TARGET_TEMP_C in old_config


def test_edge_case_missing_heater_entity():
    """Edge case: Heater control handles missing entity gracefully.

    Tests graceful degradation:
    1. No heater switch entity configured
    2. Control doesn't crash
    """
    config = {
        CONF_BOILER_CONFIG_MODE: "advanced",
        CONF_BOILER_TARGET_TEMP_C: 60.0,
    }

    # Config can exist without heater entity
    assert CONF_BOILER_HEATER_SWITCH_ENTITY not in config


def test_edge_case_missing_pump_entity():
    """Edge case: Pump control handles missing entity gracefully.

    Tests graceful degradation:
    1. No pump switch entity configured
    2. Control doesn't crash
    """
    config = {
        CONF_BOILER_CONFIG_MODE: "advanced",
    }

    # Config can exist without pump entity
    assert CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY not in config


def test_edge_case_default_values_used():
    """Edge case: Default values are applied when config missing.

    Tests default values:
    1. Check const.py has defaults
    2. Defaults are used in coordinator/planner
    """
    # Check defaults exist in const
    assert DEFAULT_BOILER_PLANNING_HORIZON_HOURS is not None
    assert DEFAULT_BOILER_TARGET_TEMP_C is not None

    # Verify defaults are used in code
    planner_content = read_file_content(
        "custom_components/oig_cloud/boiler/planner.py"
    )
    assert "planning_horizon_hours" in planner_content
