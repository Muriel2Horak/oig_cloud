"""Planning System Integration for Coordinator."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Optional

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry

from .planning import (
    BatterySimulation,
    PlanManager,
    BalancingManager,
    WeatherMonitor,
)
from .planning.simulation import SimulationContext
from .planning.balancing_manager import BalancingConfig
from .planning.weather_monitor import WeatherConfig
from .const import HOME_III

_LOGGER = logging.getLogger(__name__)


class PlanningSystem:
    """Planning system integration wrapper.
    
    Coordinates all planning modules and provides simple interface for coordinator.
    """
    
    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: ConfigEntry,
        box_id: str,
        storage_path: str,
    ):
        """Initialize planning system.
        
        Args:
            hass: Home Assistant instance
            config_entry: Config entry
            box_id: OIG box ID
            storage_path: Path for plan storage
        """
        self.hass = hass
        self.config_entry = config_entry
        self.box_id = box_id
        self.storage_path = Path(storage_path)
        self._logger = _LOGGER
        
        # Planning modules (initialized in async_setup)
        self.simulation: Optional[BatterySimulation] = None
        self.plan_manager: Optional[PlanManager] = None
        self.balancing_manager: Optional[BalancingManager] = None
        self.weather_monitor: Optional[WeatherMonitor] = None
        
        self._initialized = False
    
    async def async_setup(self) -> None:
        """Set up planning system asynchronously."""
        if self._initialized:
            return
        
        try:
            # Build simulation context from config and sensors
            context = await self._build_simulation_context()
            
            # Initialize simulation engine
            self.simulation = BatterySimulation(context)
            
            # Initialize plan manager
            self.plan_manager = PlanManager(
                storage_path=self.storage_path,
                simulation=self.simulation,
                box_id=self.box_id,
            )
            
            # Initialize balancing manager
            balancing_config = self._get_balancing_config()
            self.balancing_manager = BalancingManager(
                hass=self.hass,
                plan_manager=self.plan_manager,
                config=balancing_config,
            )
            
            # Initialize weather monitor
            weather_config = self._get_weather_config()
            self.weather_monitor = WeatherMonitor(
                hass=self.hass,
                plan_manager=self.plan_manager,
                config=weather_config,
            )
            
            # Start weather monitoring
            await self.weather_monitor.start()
            
            self._initialized = True
            self._logger.info("Planning system initialized successfully")
            
        except Exception as e:
            self._logger.error(f"Error setting up planning system: {e}", exc_info=True)
            raise
    
    async def async_shutdown(self) -> None:
        """Shut down planning system."""
        if self.weather_monitor:
            await self.weather_monitor.stop()
        
        self._initialized = False
        self._logger.info("Planning system shut down")
    
    async def update_automatic_plan(self) -> Optional[Dict[str, Any]]:
        """Update automatic plan (called periodically by coordinator).
        
        Returns:
            Plan data dict or None
        """
        if not self._initialized:
            self._logger.warning("Planning system not initialized")
            return None
        
        try:
            # Check for weather emergency first
            # (weather monitor handles this automatically)
            
            # Check for balancing needs
            await self._check_balancing()
            
            # Create/update automatic plan
            plan = self.plan_manager.create_automatic_plan()
            
            # Activate if no other plan active
            active_plan = self.plan_manager.get_active_plan()
            if not active_plan or active_plan.plan_type.value == "automatic":
                self.plan_manager.activate_plan(plan.plan_id)
            
            return plan.to_dict()
            
        except Exception as e:
            self._logger.error(f"Error updating automatic plan: {e}", exc_info=True)
            return None
    
    async def _check_balancing(self) -> None:
        """Check and trigger balancing if needed."""
        try:
            # Check opportunistic balancing
            plan_id = await self.balancing_manager.check_opportunistic_balancing()
            if plan_id:
                self._logger.info(f"Triggered opportunistic balancing: {plan_id}")
                return
            
            # Check economic balancing
            plan_id = await self.balancing_manager.check_economic_balancing()
            if plan_id:
                self._logger.info(f"Triggered economic balancing: {plan_id}")
                return
            
            # Check forced balancing
            plan_id = await self.balancing_manager.check_forced_balancing()
            if plan_id:
                self._logger.info(f"Triggered forced balancing: {plan_id}")
                return
            
        except Exception as e:
            self._logger.error(f"Error checking balancing: {e}", exc_info=True)
    
    async def _build_simulation_context(self) -> SimulationContext:
        """Build simulation context from current state and config."""
        # Get battery parameters from sensors
        battery_capacity = await self._get_sensor_float(
            f"sensor.oig_{self.box_id}_battery_capacity_kwh",
            default=15.36
        )
        
        battery_soc = await self._get_sensor_float(
            f"sensor.oig_{self.box_id}_battery_soc_kwh",
            default=10.0
        )
        
        # Get config parameters
        config_data = self.config_entry.data
        min_capacity = config_data.get("battery_min_capacity_kwh", 3.0)
        target_capacity = config_data.get("battery_target_capacity_kwh", 12.0)
        threshold_cheap = config_data.get("threshold_cheap_czk", 1.5)
        
        # Get forecast data (placeholder - will be populated by coordinator)
        spot_prices: Dict[datetime, float] = {}
        solar_forecast: Dict[datetime, float] = {}
        consumption_forecast: Dict[datetime, float] = {}
        
        # TODO: Fetch actual forecast data from sensors/attributes
        
        return SimulationContext(
            battery_capacity_kwh=battery_capacity,
            battery_soc_kwh=battery_soc,
            battery_efficiency=0.9,  # TODO: Get from config
            ac_charging_limit_kw=5.0,  # TODO: Get from sensor
            min_capacity_kwh=min_capacity,
            target_capacity_kwh=target_capacity,
            threshold_cheap_czk=threshold_cheap,
            spot_prices=spot_prices,
            tariff_data={},
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            export_limit_kw=10.0,  # TODO: Get from sensor
        )
    
    def _get_balancing_config(self) -> BalancingConfig:
        """Get balancing configuration from config entry."""
        config_data = self.config_entry.data
        
        return BalancingConfig(
            enabled=config_data.get("balancing_enabled", True),
            opportunistic_enabled=config_data.get("balancing_opportunistic_enabled", True),
            economic_enabled=config_data.get("balancing_economic_enabled", True),
            forced_enabled=config_data.get("balancing_forced_enabled", True),
            holding_mode=HOME_III,
        )
    
    def _get_weather_config(self) -> WeatherConfig:
        """Get weather configuration from config entry."""
        config_data = self.config_entry.data
        
        return WeatherConfig(
            enabled=config_data.get("weather_enabled", True),
            emergency_mode=config_data.get("weather_emergency_mode", True),
            chmu_sensor_id=f"sensor.oig_{self.box_id}_chmu_warning",
        )
    
    async def _get_sensor_float(self, entity_id: str, default: float) -> float:
        """Get float value from sensor."""
        try:
            state = self.hass.states.get(entity_id)
            if state and state.state not in ["unknown", "unavailable"]:
                return float(state.state)
        except Exception as e:
            self._logger.debug(f"Error reading sensor {entity_id}: {e}")
        
        return default
