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

# Service schemas
PLAN_BOILER_HEATING_SCHEMA = vol.Schema(
    {
        vol.Optional("force", default=False): cv.boolean,
        vol.Optional("deadline"): cv.string,
    }
)

APPLY_BOILER_PLAN_SCHEMA = vol.Schema({})

CANCEL_BOILER_PLAN_SCHEMA = vol.Schema({})


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

    _LOGGER.info("Registered 3 boiler services")
