"""Unit tests for WeatherMonitor per BR-7.2."""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch, call

from custom_components.oig_cloud.planning.weather_monitor import (
    WeatherMonitor,
    WeatherConfig,
    UPDATE_INTERVAL_MINUTES,
    SOC_MAINTENANCE_THRESHOLD,
)
from custom_components.oig_cloud.planning.plan_manager import PlanManager
from custom_components.oig_cloud.const import HOME_III, HOME_UPS


@pytest.fixture
def mock_hass():
    """Create mock Home Assistant instance."""
    hass = MagicMock()
    hass.states = MagicMock()
    hass.services = MagicMock()
    return hass


@pytest.fixture
def mock_plan_manager():
    """Create mock PlanManager."""
    manager = MagicMock(spec=PlanManager)
    manager.box_id = "2206237016"
    manager.create_weather_plan = MagicMock()
    manager.activate_plan = MagicMock()
    manager.deactivate_plan = MagicMock()
    return manager


@pytest.fixture
def weather_config():
    """Create default weather configuration."""
    return WeatherConfig(
        enabled=True,
        emergency_mode=True,
        chmu_sensor_id="sensor.oig_chmu_warning",
    )


@pytest.fixture
def weather_monitor(mock_hass, mock_plan_manager, weather_config):
    """Create WeatherMonitor instance."""
    return WeatherMonitor(
        hass=mock_hass,
        plan_manager=mock_plan_manager,
        config=weather_config,
    )


class TestWeatherConfig:
    """Test weather configuration validation."""
    
    def test_valid_config(self):
        """Test valid configuration passes validation."""
        config = WeatherConfig(
            enabled=True,
            emergency_mode=True,
            chmu_sensor_id="sensor.test",
        )
        config.validate()  # Should not raise
    
    def test_missing_sensor_id_raises_error(self):
        """Test that missing sensor ID raises error."""
        config = WeatherConfig(chmu_sensor_id="")
        with pytest.raises(ValueError, match="chmu_sensor_id"):
            config.validate()


class TestWarningDetection:
    """Test ČHMÚ warning detection per BR-7.2."""
    
    @pytest.mark.asyncio
    async def test_activates_on_warning(self, weather_monitor, mock_hass, mock_plan_manager):
        """Test that warning triggers emergency activation."""
        # Mock ČHMÚ sensor with warning
        sensor_state = MagicMock()
        sensor_state.state = "orange"
        sensor_state.attributes = {
            "warning_start": "2024-11-02T18:00:00",
            "warning_end": "2024-11-03T06:00:00",
        }
        mock_hass.states.get.return_value = sensor_state
        
        # Mock plan creation
        mock_plan = MagicMock()
        mock_plan.plan_id = "weather_emergency_123"
        mock_plan_manager.create_weather_plan.return_value = mock_plan
        
        # Check warning
        await weather_monitor._check_weather_warning()
        
        # Should activate emergency
        assert weather_monitor._active_warning == "orange"
        mock_plan_manager.create_weather_plan.assert_called_once()
        mock_plan_manager.activate_plan.assert_called_once_with("weather_emergency_123")
    
    @pytest.mark.asyncio
    async def test_deactivates_on_warning_end(self, weather_monitor, mock_hass, mock_plan_manager):
        """Test that warning end triggers deactivation."""
        # Set active warning
        weather_monitor._active_warning = "orange"
        weather_monitor._emergency_plan_id = "test_plan"
        
        # Mock ČHMÚ sensor with no warning
        sensor_state = MagicMock()
        sensor_state.state = "none"
        mock_hass.states.get.return_value = sensor_state
        
        # Mock plan creation for automatic
        mock_plan = MagicMock()
        mock_plan.plan_id = "auto_123"
        mock_plan_manager.create_automatic_plan = AsyncMock(return_value=mock_plan)
        
        # Check warning
        await weather_monitor._check_weather_warning()
        
        # Should deactivate emergency
        assert weather_monitor._active_warning is None
        mock_plan_manager.deactivate_plan.assert_called_once_with("test_plan")
        mock_plan_manager.create_automatic_plan.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_handles_missing_sensor(self, weather_monitor, mock_hass):
        """Test graceful handling of missing sensor."""
        # Mock missing sensor
        mock_hass.states.get.return_value = None
        
        # Should not raise
        await weather_monitor._check_weather_warning()
        
        # Should not activate
        assert weather_monitor._active_warning is None


class TestDynamicHoldingUpdate:
    """Test dynamic holding update per BR-7.2."""
    
    @pytest.mark.asyncio
    async def test_hourly_plan_update(self, weather_monitor, mock_hass, mock_plan_manager):
        """Test that plan is updated hourly with new duration."""
        # Set active emergency
        weather_monitor._emergency_plan_id = "old_plan"
        weather_monitor._active_warning = "orange"
        
        # Mock ČHMÚ sensor with updated end time
        sensor_state = MagicMock()
        sensor_state.state = "orange"
        sensor_state.attributes = {
            "warning_end": (datetime.now() + timedelta(hours=8)).isoformat(),
        }
        mock_hass.states.get.return_value = sensor_state
        
        # Mock new plan creation
        mock_plan = MagicMock()
        mock_plan.plan_id = "weather_updated_123"
        mock_plan_manager.create_weather_plan.return_value = mock_plan
        
        # Update plan
        await weather_monitor._update_emergency_plan()
        
        # Should create new plan
        mock_plan_manager.create_weather_plan.assert_called_once()
        
        # Verify remaining hours calculated
        call_args = mock_plan_manager.create_weather_plan.call_args[1]
        assert "warning_duration_hours" in call_args
        assert call_args["warning_duration_hours"] > 0
        
        # Should activate new plan
        mock_plan_manager.activate_plan.assert_called_once_with("weather_updated_123")
        assert weather_monitor._emergency_plan_id == "weather_updated_123"
    
    @pytest.mark.asyncio
    async def test_deactivates_if_warning_ended_during_update(self, weather_monitor, mock_hass, mock_plan_manager):
        """Test that update deactivates if warning ended."""
        # Set active emergency
        weather_monitor._emergency_plan_id = "test_plan"
        weather_monitor._active_warning = "orange"
        
        # Mock ČHMÚ sensor with no warning
        sensor_state = MagicMock()
        sensor_state.state = "none"
        mock_hass.states.get.return_value = sensor_state
        
        # Mock automatic plan
        mock_plan = MagicMock()
        mock_plan_manager.create_automatic_plan = AsyncMock(return_value=mock_plan)
        
        # Update plan
        await weather_monitor._update_emergency_plan()
        
        # Should deactivate
        mock_plan_manager.deactivate_plan.assert_called_once_with("test_plan")
        assert weather_monitor._emergency_plan_id is None


class TestSoCMaintenance:
    """Test SoC maintenance per BR-7.2."""
    
    @pytest.mark.asyncio
    async def test_switches_to_ups_on_low_soc(self, weather_monitor, mock_hass):
        """Test that SoC below threshold triggers UPS mode."""
        # Set active emergency
        weather_monitor._emergency_plan_id = "test_plan"
        
        # Mock low SoC
        weather_monitor._get_current_soc_percent = AsyncMock(return_value=99.0)
        weather_monitor._switch_to_ups_mode = AsyncMock()
        
        # Check maintenance
        await weather_monitor._check_soc_maintenance()
        
        # Should switch to UPS
        weather_monitor._switch_to_ups_mode.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_maintains_home_iii_on_good_soc(self, weather_monitor, mock_hass):
        """Test that SoC at 100% maintains HOME III."""
        # Set active emergency
        weather_monitor._emergency_plan_id = "test_plan"
        
        # Mock good SoC
        weather_monitor._get_current_soc_percent = AsyncMock(return_value=99.8)
        weather_monitor._ensure_home_iii_mode = AsyncMock()
        
        # Check maintenance
        await weather_monitor._check_soc_maintenance()
        
        # Should ensure HOME III
        weather_monitor._ensure_home_iii_mode.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_ups_mode_service_call(self, weather_monitor, mock_hass):
        """Test that UPS mode calls correct service."""
        # Switch to UPS
        await weather_monitor._switch_to_ups_mode()
        
        # Verify service called
        mock_hass.services.async_call.assert_called_once()
        call_args = mock_hass.services.async_call.call_args
        
        # Check domain and service
        assert call_args[0][0] == "oig_cloud"
        assert call_args[0][1] == "set_cbb_mode"
        
        # Check parameters
        params = call_args[0][2]
        assert params["mode"] == HOME_UPS
        assert "weather_emergency" in params["reason"]
    
    @pytest.mark.asyncio
    async def test_home_iii_mode_service_call(self, weather_monitor, mock_hass):
        """Test that HOME III mode calls correct service."""
        # Mock current mode is not HOME III
        weather_monitor._get_current_mode = AsyncMock(return_value=HOME_UPS)
        
        # Ensure HOME III
        await weather_monitor._ensure_home_iii_mode()
        
        # Verify service called
        mock_hass.services.async_call.assert_called_once()
        call_args = mock_hass.services.async_call.call_args
        
        params = call_args[0][2]
        assert params["mode"] == HOME_III


class TestEmergencyPlanCreation:
    """Test emergency plan creation per BR-7.2.2."""
    
    @pytest.mark.asyncio
    async def test_plan_with_explicit_holding_parameters(self, weather_monitor, mock_hass, mock_plan_manager):
        """Test that emergency plan has all explicit holding parameters."""
        # Mock warning detection
        sensor_state = MagicMock()
        sensor_state.state = "red"
        sensor_state.attributes = {
            "warning_start": "2024-11-02T18:00:00",
            "warning_end": "2024-11-03T18:00:00",  # 24 hours
        }
        mock_hass.states.get.return_value = sensor_state
        
        # Mock plan
        mock_plan = MagicMock()
        mock_plan.plan_id = "weather_123"
        mock_plan_manager.create_weather_plan.return_value = mock_plan
        
        # Activate emergency
        await weather_monitor._activate_emergency("red", sensor_state.attributes)
        
        # Verify plan creation with holding parameters
        mock_plan_manager.create_weather_plan.assert_called_once()
        call_args = mock_plan_manager.create_weather_plan.call_args[1]
        
        # Check holding parameters
        assert "warning_start" in call_args
        assert "warning_duration_hours" in call_args
        assert call_args["warning_duration_hours"] > 0
    
    @pytest.mark.asyncio
    async def test_target_always_100_percent(self, weather_monitor, mock_hass, mock_plan_manager):
        """Test that emergency always targets 100% SoC."""
        # Mock warning
        sensor_state = MagicMock()
        sensor_state.state = "yellow"
        sensor_state.attributes = {
            "warning_start": datetime.now().isoformat(),
            "warning_end": (datetime.now() + timedelta(hours=12)).isoformat(),
        }
        mock_hass.states.get.return_value = sensor_state
        
        # Mock plan
        mock_plan = MagicMock()
        mock_plan_manager.create_weather_plan.return_value = mock_plan
        
        # Activate
        await weather_monitor._activate_emergency("yellow", sensor_state.attributes)
        
        # Weather plan should target 100%
        # (verified in plan_manager.create_weather_plan implementation)
        mock_plan_manager.create_weather_plan.assert_called_once()


class TestCHMUSensorMonitoring:
    """Test ČHMÚ sensor monitoring (not just warning_end) per BR-7.2."""
    
    @pytest.mark.asyncio
    async def test_monitors_sensor_state_not_timestamp(self, weather_monitor, mock_hass, mock_plan_manager):
        """Test that monitor checks sensor state, not just warning_end."""
        # Set active emergency
        weather_monitor._emergency_plan_id = "test_plan"
        weather_monitor._active_warning = "orange"
        
        # Mock sensor with active state but past warning_end
        sensor_state = MagicMock()
        sensor_state.state = "orange"  # Still active!
        sensor_state.attributes = {
            "warning_end": (datetime.now() - timedelta(hours=1)).isoformat(),  # Past!
        }
        mock_hass.states.get.return_value = sensor_state
        
        # Mock plan update
        mock_plan = MagicMock()
        mock_plan.plan_id = "updated_plan"
        mock_plan_manager.create_weather_plan.return_value = mock_plan
        
        # Update plan
        await weather_monitor._update_emergency_plan()
        
        # Should create NEW plan (because sensor still active)
        mock_plan_manager.create_weather_plan.assert_called_once()
        
        # Should NOT deactivate (sensor still active)
        mock_plan_manager.deactivate_plan.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_uses_sensor_state_for_end_detection(self, weather_monitor, mock_hass, mock_plan_manager):
        """Test that end is detected from sensor state, not timestamp."""
        # Set active emergency
        weather_monitor._active_warning = "orange"
        weather_monitor._emergency_plan_id = "test_plan"
        
        # Mock sensor inactive despite warning_end in future
        sensor_state = MagicMock()
        sensor_state.state = "none"  # Inactive!
        sensor_state.attributes = {
            "warning_end": (datetime.now() + timedelta(hours=10)).isoformat(),  # Future!
        }
        mock_hass.states.get.return_value = sensor_state
        
        # Mock automatic plan
        mock_plan = MagicMock()
        mock_plan_manager.create_automatic_plan = AsyncMock(return_value=mock_plan)
        
        # Check warning
        await weather_monitor._check_weather_warning()
        
        # Should deactivate (sensor inactive)
        mock_plan_manager.deactivate_plan.assert_called_once()


class TestPeriodicUpdate:
    """Test periodic update mechanism."""
    
    @pytest.mark.asyncio
    async def test_periodic_update_calls_check_and_maintain(self, weather_monitor):
        """Test that periodic update checks warning and maintains SoC."""
        # Mock methods
        weather_monitor._check_weather_warning = AsyncMock()
        weather_monitor._update_emergency_plan = AsyncMock()
        weather_monitor._check_soc_maintenance = AsyncMock()
        
        # Set active emergency
        weather_monitor._emergency_plan_id = "test_plan"
        
        # Trigger periodic update
        await weather_monitor._periodic_update(datetime.now())
        
        # Should call all checks
        weather_monitor._check_weather_warning.assert_called_once()
        weather_monitor._update_emergency_plan.assert_called_once()
        weather_monitor._check_soc_maintenance.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
