"""Boiler coordinator for OIG Cloud integration."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from ..const import DOMAIN
from .boiler_energy import calculate_required_energy
from .boiler_models import BoilerConfig, BoilerPlan, BoilerState
from .boiler_planner import BoilerPlanner, PriceSlot
from .boiler_profile import BoilerUsageProfiler
from .boiler_utils import (
    atomic_save_json,
    get_full_json_url,
    get_oig_data_dir,
    load_json,
)

_LOGGER = logging.getLogger(__name__)


class BoilerCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinator for boiler data updates."""

    def __init__(
        self,
        hass: HomeAssistant,
        config: BoilerConfig,
        update_interval: timedelta = timedelta(minutes=5),
        test_energy_sensor: Optional[str] = None,
    ) -> None:
        """Initialize coordinator.

        Args:
            hass: Home Assistant instance
            config: Boiler configuration
            update_interval: Update interval
            test_energy_sensor: Optional test energy sensor for development
        """
        super().__init__(
            hass,
            _LOGGER,
            name=f"{DOMAIN}_boiler",
            update_interval=update_interval,
        )
        self.config = config
        self.profiler = BoilerUsageProfiler()
        self.test_energy_sensor = test_energy_sensor  # For testing with real sensor
        self.planner = BoilerPlanner(heater_power_kw=2.0)  # Will be updated from config

        # State
        self.state: Optional[BoilerState] = None
        self.plan: Optional[BoilerPlan] = None

        # Paths
        self.data_dir = get_oig_data_dir(hass.config.path(""))
        self.profile_path = self.data_dir / "boiler_profile.json"
        self.plan_path = self.data_dir / "boiler_plan.json"

        # Flag to track if profile was loaded
        self._profile_loaded = False

    async def async_load_profile(self) -> None:
        """Load saved profiler state from file."""
        if self._profile_loaded:
            return

        try:
            profiler_state = await load_json(self.profile_path, hass=self.hass)
            if profiler_state:
                self.profiler.from_dict(profiler_state)
                _LOGGER.info(
                    f"Loaded profiler state: {len(self.profiler._events)} events"
                )
            self._profile_loaded = True
        except FileNotFoundError:
            _LOGGER.debug("No saved profile found, starting fresh")
            self._profile_loaded = True
        except Exception as e:
            _LOGGER.error(f"Failed to load profile: {e}", exc_info=True)
            self._profile_loaded = True

    async def _async_update_data(self) -> dict[str, Any]:
        """Update boiler data.

        Returns:
            Dict with state and plan digests
        """
        try:
            # Load profile on first run
            if not self._profile_loaded:
                await self.async_load_profile()

            # Read temperature sensors
            _LOGGER.debug(
                f"Reading temp sensors: top={self.config.temp_sensor_top}, bottom={self.config.temp_sensor_bottom}"
            )
            temp_top = await self._get_sensor_value(self.config.temp_sensor_top)
            temp_bottom = await self._get_sensor_value(self.config.temp_sensor_bottom)
            _LOGGER.debug(f"Temp values: top={temp_top}, bottom={temp_bottom}")

            if temp_top is None:
                _LOGGER.warning(
                    f"No top temperature sensor available (entity_id={self.config.temp_sensor_top})"
                )
                return self._get_empty_data()

            # TEST MODE: Use real energy sensor if configured
            if self.test_energy_sensor:
                e_req_from_sensor = await self._get_sensor_value(
                    self.test_energy_sensor
                )
                if e_req_from_sensor is not None and e_req_from_sensor >= 0:
                    _LOGGER.info(
                        f"🧪 TEST MODE: Using energy from {self.test_energy_sensor} = {e_req_from_sensor:.2f} kWh"
                    )
                    # Use sensor value directly as e_req
                    e_req = e_req_from_sensor
                    # Estimate e_target and e_now based on temperature
                    # Assume cold water at config.cold_inlet_temp_c
                    e_target, _, _ = calculate_required_energy(
                        volume_l=self.config.volume_l,
                        target_temp_c=self.config.target_temp_c,
                        cold_temp_c=self.config.cold_inlet_temp_c,
                        temp_top_c=self.config.target_temp_c,
                        temp_bottom_c=self.config.target_temp_c,
                        stratification_mode=self.config.stratification_mode,
                        split_ratio=self.config.two_zone_split_ratio,
                    )
                    e_now = e_target - e_req
                else:
                    # Fallback to normal calculation
                    e_target, e_now, e_req = calculate_required_energy(
                        volume_l=self.config.volume_l,
                        target_temp_c=self.config.target_temp_c,
                        cold_temp_c=self.config.cold_inlet_temp_c,
                        temp_top_c=temp_top,
                        temp_bottom_c=temp_bottom,
                        stratification_mode=self.config.stratification_mode,
                        split_ratio=self.config.two_zone_split_ratio,
                    )
            else:
                # Normal mode: Calculate energy state
                e_target, e_now, e_req = calculate_required_energy(
                    volume_l=self.config.volume_l,
                    target_temp_c=self.config.target_temp_c,
                    cold_temp_c=self.config.cold_inlet_temp_c,
                    temp_top_c=temp_top,
                    temp_bottom_c=temp_bottom,
                    stratification_mode=self.config.stratification_mode,
                    split_ratio=self.config.two_zone_split_ratio,
                )

            # Calculate SOC
            from .boiler_energy import calculate_soc_percent

            soc = calculate_soc_percent(e_now, e_target)

            # Update state
            self.state = BoilerState(
                temp_top_c=temp_top,
                temp_bottom_c=temp_bottom,
                temp_avg_c=(temp_top + temp_bottom) / 2 if temp_bottom else temp_top,
                energy_now_kwh=e_now,
                energy_target_kwh=e_target,
                energy_required_kwh=e_req,
                soc_percent=soc,
                updated_at=datetime.now(),
                method=self.config.stratification_mode,
            )

            # Update profiler (check for usage)
            heating_active = await self._is_heating_active()
            self.profiler.update_energy_reading(e_now, heating_active=heating_active)

            # Save profile periodically
            await self._save_profile()

            # Get predictions from profiler
            profile = self.profiler.get_profile()
            deadline_hour = int(self.config.deadline_time.split(":")[0])
            current_hour = datetime.now().hour
            predicted_today = self.profiler.predict_usage_until(
                deadline_hour, current_hour
            )
            peak_hours = self.profiler.get_peak_usage_hours(top_n=3)

            # AUTO-PLANNING: Automatically create plan if needed
            should_plan = (
                self.plan is None  # No plan exists
                or e_req > 0.5  # Significant energy needed (>0.5 kWh)
            )

            if should_plan:
                try:
                    _LOGGER.info(
                        f"🤖 AUTO-PLANNING: Creating heating plan (energy_required={e_req:.2f} kWh, deadline={self.config.deadline_time})"
                    )
                    await self.create_plan()
                except Exception as plan_err:
                    _LOGGER.warning(f"Auto-planning failed (non-critical): {plan_err}")

            # Return digest data
            result = {
                "state": self.state.to_digest() if self.state else {},
                "plan": self.plan.to_digest() if self.plan else {},
                "profile": {
                    "hourly_avg_kwh": profile.hourly_avg_kwh,
                    "predicted_usage_today": round(predicted_today, 2),
                    "peak_hours": peak_hours,
                    "days_tracked": profile.days_tracked,
                },
                "profile_url": get_full_json_url("boiler_profile.json"),
                "plan_url": get_full_json_url("boiler_plan.json"),
            }
            _LOGGER.debug(
                f"Returning data: state_keys={list(result['state'].keys()) if result['state'] else 'empty'}, plan_keys={list(result['plan'].keys()) if result['plan'] else 'empty'}"
            )
            return result

        except Exception as err:
            _LOGGER.error(f"Error updating boiler data: {err}", exc_info=True)
            raise UpdateFailed(f"Error updating boiler: {err}") from err

    async def _get_sensor_value(self, entity_id: Optional[str]) -> Optional[float]:
        """Get sensor value from entity.

        Args:
            entity_id: Entity ID or None

        Returns:
            Sensor value or None
        """
        if not entity_id or not entity_id.strip():
            _LOGGER.debug(f"Empty entity_id provided")
            return None

        try:
            state = self.hass.states.get(entity_id)
            if state is None:
                _LOGGER.warning(f"Sensor {entity_id} not found in hass.states")
                return None

            _LOGGER.debug(f"Sensor {entity_id} state: {state.state}")

            value = float(state.state)
            _LOGGER.debug(f"Sensor {entity_id} value: {value}")
            return value

        except (ValueError, TypeError) as e:
            state_val = state.state if state is not None else "None"
            _LOGGER.warning(
                f"Failed to read sensor {entity_id}: {e} (state={state_val})"
            )
            return None

    async def _is_heating_active(self) -> bool:
        """Check if heating is currently active.

        Returns:
            True if heating switch is on
        """
        if not self.config.heater_switch_entity:
            return False

        try:
            state = self.hass.states.get(self.config.heater_switch_entity)
            return state is not None and state.state == "on"
        except Exception:
            return False

    async def _save_profile(self) -> None:
        """Save usage profile to file."""
        try:
            # Save full profiler state (including events)
            profiler_state = self.profiler.to_dict()
            await atomic_save_json(profiler_state, self.profile_path, hass=self.hass)
            _LOGGER.debug(
                f"Saved profiler state with {len(self.profiler._events)} events"
            )
        except Exception as e:
            _LOGGER.warning(f"Failed to save profile: {e}")

    async def create_plan(
        self,
        force: bool = False,
        deadline_override: Optional[str] = None,
    ) -> BoilerPlan:
        """Create heating plan.

        Args:
            force: Force recompute even if plan exists
            deadline_override: Override deadline time

        Returns:
            Created plan
        """
        if not force and self.plan and len(self.plan.slots) > 0:
            # Check if plan is still valid (has future slots)
            now = datetime.now()
            future_slots = [s for s in self.plan.slots if s.end > now]
            if future_slots:
                _LOGGER.debug("Existing plan is still valid")
                return self.plan

        # Get energy requirement
        if not self.state:
            await self._async_update_data()

        energy_needed = self.state.energy_required_kwh if self.state else 0.0

        # Get heater power
        heater_power = await self._get_heater_power()

        # Get price forecast
        price_slots = await self._get_price_forecast()

        # Parse deadline
        deadline_time = deadline_override or self.config.deadline_time
        planner = BoilerPlanner(heater_power_kw=heater_power)
        deadline = planner.parse_deadline(deadline_time)

        # Create plan
        self.plan = planner.create_plan(
            energy_needed_kwh=energy_needed,
            price_forecast=price_slots,
            deadline=deadline,
            alt_cost_kwh=self.config.alt_cost_kwh,
            has_alternative=self.config.has_alternative_heating,
        )

        # Save plan to file
        await atomic_save_json(self.plan.to_dict(), self.plan_path, hass=self.hass)

        _LOGGER.info(
            f"Created heating plan: {len(self.plan.slots)} slots, "
            f"{self.plan.total_energy_kwh:.2f}kWh, {self.plan.total_cost_czk:.2f}Kč"
        )

        return self.plan

    async def _get_heater_power(self) -> float:
        """Get heater power in kW.

        Returns:
            Power in kW (from entity or default 2.0)
        """
        # Try to read from entity
        if self.config.heater_power_kw_entity:
            power = await self._get_sensor_value(self.config.heater_power_kw_entity)
            if power is not None and power > 0:
                return power

        # Default fallback
        _LOGGER.warning("Using default heater power 2.0 kW")
        return 2.0

    async def _get_price_forecast(self) -> list[PriceSlot]:
        """Get spot price forecast.

        Returns:
            List of price slots
        """
        if not self.config.spot_price_sensor:
            _LOGGER.warning("No spot price sensor configured")
            return []

        try:
            # Try to get forecast from sensor attributes
            state = self.hass.states.get(self.config.spot_price_sensor)
            if state is None:
                _LOGGER.warning(
                    f"Price sensor {self.config.spot_price_sensor} not found"
                )
                return []

            # Check for forecast in attributes
            forecast_data = state.attributes.get("forecast", [])
            if not forecast_data:
                _LOGGER.warning("No forecast data in price sensor")
                return []

            # Convert to PriceSlot
            slots = BoilerPlanner.create_slots_from_forecast(
                forecast_data,
                slot_duration_minutes=self.config.plan_slot_minutes,
            )

            _LOGGER.debug(f"Loaded {len(slots)} price slots from forecast")
            return slots

        except Exception as e:
            _LOGGER.error(f"Failed to load price forecast: {e}")
            return []

    def _get_empty_data(self) -> dict[str, Any]:
        """Get empty data dict when no data available."""
        return {
            "state": {},
            "plan": {},
            "profile_url": get_full_json_url("boiler_profile.json"),
            "plan_url": get_full_json_url("boiler_plan.json"),
        }
