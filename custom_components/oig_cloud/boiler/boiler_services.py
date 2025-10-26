"""Boiler services for OIG Cloud integration."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers import config_validation as cv

from ..const import (
    DOMAIN,
    SERVICE_APPLY_BOILER_PLAN,
    SERVICE_CANCEL_BOILER_PLAN,
    SERVICE_PLAN_BOILER_HEATING,
)
from .boiler_coordinator import BoilerCoordinator

_LOGGER = logging.getLogger(__name__)

SERVICE_GENERATE_TEST_PROFILE = "generate_boiler_test_profile"

# Service schemas
PLAN_BOILER_HEATING_SCHEMA = vol.Schema(
    {
        vol.Optional("force", default=False): cv.boolean,
        vol.Optional("deadline"): cv.string,
    }
)

APPLY_BOILER_PLAN_SCHEMA = vol.Schema({})

CANCEL_BOILER_PLAN_SCHEMA = vol.Schema({})

GENERATE_TEST_PROFILE_SCHEMA = vol.Schema(
    {
        vol.Required("energy_sensor"): cv.entity_id,
        vol.Optional("days", default=7): cv.positive_int,
        vol.Optional("drop_threshold_kwh", default=0.5): cv.positive_float,
    }
)


def setup_boiler_services(hass: HomeAssistant, coordinator: BoilerCoordinator) -> None:
    """Set up boiler services.

    Args:
        hass: Home Assistant instance
        coordinator: Boiler coordinator
    """

    @callback
    async def handle_plan_boiler_heating(call: ServiceCall) -> None:
        """Handle plan_boiler_heating service call."""
        force = call.data.get("force", False)
        deadline = call.data.get("deadline")

        _LOGGER.info(f"Planning boiler heating (force={force}, deadline={deadline})")

        try:
            plan = await coordinator.create_plan(
                force=force,
                deadline_override=deadline,
            )

            # Fire event with plan summary
            hass.bus.async_fire(
                f"{DOMAIN}_boiler_plan_created",
                {
                    "slots_count": len(plan.slots),
                    "total_energy_kwh": plan.total_energy_kwh,
                    "total_cost_czk": plan.total_cost_czk,
                    "use_alternative": plan.use_alternative,
                    "deadline": plan.deadline.isoformat() if plan.deadline else None,
                },
            )

            _LOGGER.info(
                f"Plan created: {len(plan.slots)} slots, "
                f"{plan.total_energy_kwh:.2f}kWh, {plan.total_cost_czk:.2f}Kč"
            )

        except Exception as e:
            _LOGGER.error(f"Failed to create boiler plan: {e}", exc_info=True)
            raise

    @callback
    async def handle_apply_boiler_plan(call: ServiceCall) -> None:
        """Handle apply_boiler_plan service call."""
        _LOGGER.info("Applying boiler heating plan")

        if not coordinator.plan or len(coordinator.plan.slots) == 0:
            _LOGGER.warning("No plan to apply, creating new plan first")
            await coordinator.create_plan(force=True)

        if not coordinator.plan or len(coordinator.plan.slots) == 0:
            _LOGGER.error("Failed to create plan, cannot apply")
            return

        # TODO: Implement scheduler logic
        # For now, just log the plan
        _LOGGER.info(f"Would apply plan with {len(coordinator.plan.slots)} slots")

        # Fire event
        hass.bus.async_fire(
            f"{DOMAIN}_boiler_plan_applied",
            {
                "slots_count": len(coordinator.plan.slots),
                "total_energy_kwh": coordinator.plan.total_energy_kwh,
            },
        )

        # TODO: Create automations/schedules to turn on heater_switch_entity
        # during planned slots

    @callback
    async def handle_cancel_boiler_plan(call: ServiceCall) -> None:
        """Handle cancel_boiler_plan service call."""
        _LOGGER.info("Cancelling boiler heating plan")

        # Clear plan
        coordinator.plan = None

        # Fire event
        hass.bus.async_fire(f"{DOMAIN}_boiler_plan_cancelled", {})

        # TODO: Remove scheduled automations

    @callback
    async def handle_generate_test_profile(call: ServiceCall) -> None:
        """Generate test profile from historical energy sensor data."""
        energy_sensor = call.data["energy_sensor"]
        days = call.data.get("days", 7)
        drop_threshold = call.data.get("drop_threshold_kwh", 0.5)

        _LOGGER.info(
            f"🧪 Generating test profile from {energy_sensor} ({days} days, threshold={drop_threshold} kWh)"
        )

        try:
            from datetime import timedelta
            from homeassistant.util import dt as dt_util
            from homeassistant.components.recorder import history

            # Get historical data
            end_time = dt_util.now()
            start_time = end_time - timedelta(days=days)

            _LOGGER.info(f"Querying history from {start_time} to {end_time}")

            # Use recorder to get state history
            states = await hass.async_add_executor_job(
                history.state_changes_during_period,
                hass,
                start_time,
                end_time,
                energy_sensor,
            )

            if not states or energy_sensor not in states:
                _LOGGER.error(f"No history found for {energy_sensor}")
                return

            sensor_states = states[energy_sensor]
            _LOGGER.info(f"Found {len(sensor_states)} state changes")

            # Detect energy drops (water usage events)
            usage_events = []
            last_energy = None
            last_time = None

            for state in sensor_states:
                try:
                    current_energy = float(state.state)
                    current_time = state.last_updated

                    if last_energy is not None:
                        energy_drop = last_energy - current_energy

                        # Detect significant drop (water usage)
                        if energy_drop > drop_threshold:
                            usage_events.append((current_time, energy_drop))
                            _LOGGER.debug(
                                f"💧 Usage detected: {current_time.strftime('%Y-%m-%d %H:%M')} - {energy_drop:.2f} kWh"
                            )

                    last_energy = current_energy
                    last_time = current_time

                except (ValueError, TypeError):
                    continue

            _LOGGER.info(f"✅ Detected {len(usage_events)} usage events")

            # Feed events to profiler
            for event_time, energy_kwh in usage_events:
                coordinator.profiler._events[event_time] = energy_kwh

            # Save profile
            await coordinator._save_profile()

            # Get updated profile stats
            profile = coordinator.profiler.get_profile()
            peak_hours = coordinator.profiler.get_peak_usage_hours(top_n=3)
            hours_with_usage = [
                h for h, kwh in profile.hourly_avg_kwh.items() if kwh > 0
            ]

            _LOGGER.info(
                f"📊 Profile generated: {len(usage_events)} events, {len(hours_with_usage)} hours with usage, peaks at {peak_hours}"
            )

            # Fire success event
            hass.bus.async_fire(
                f"{DOMAIN}_test_profile_generated",
                {
                    "total_events": len(usage_events),
                    "hours_with_usage": len(hours_with_usage),
                    "peak_hours": peak_hours,
                    "days_analyzed": days,
                },
            )

        except Exception as e:
            _LOGGER.error(f"Failed to generate test profile: {e}", exc_info=True)

    # Register services
    hass.services.async_register(
        DOMAIN,
        SERVICE_PLAN_BOILER_HEATING,
        handle_plan_boiler_heating,
        schema=PLAN_BOILER_HEATING_SCHEMA,
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_APPLY_BOILER_PLAN,
        handle_apply_boiler_plan,
        schema=APPLY_BOILER_PLAN_SCHEMA,
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_CANCEL_BOILER_PLAN,
        handle_cancel_boiler_plan,
        schema=CANCEL_BOILER_PLAN_SCHEMA,
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_GENERATE_TEST_PROFILE,
        handle_generate_test_profile,
        schema=GENERATE_TEST_PROFILE_SCHEMA,
    )

    _LOGGER.info("Registered 4 boiler services (including test profile generator)")
