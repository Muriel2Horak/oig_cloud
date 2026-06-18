"""Boiler services for planning and scheduling heating windows."""

from __future__ import annotations

import logging
from typing import Any, Optional

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.util import dt as dt_util

from ..const import (  # noqa: F401
    ATTR_CONFIG_ENTRY_ID,
    CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_DEADLINE_TIME,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    DEFAULT_BOILER_DEADLINE_TIME,
    DOMAIN,
    SERVICE_APPLY_BOILER_PLAN,
    SERVICE_CANCEL_BOILER_PLAN,
    SERVICE_PLAN_BOILER_HEATING,
)
from ..boiler.models import EnergySource  # noqa: F401
from ..boiler.runtime import get_boiler_runtime
from ..boiler.migration import boiler_restore_blocked

from ..boiler.actuator import (  # noqa: F401
    BoilerSchedule,
    _build_heating_windows,
    _clear_persisted_schedule,
    _entity_exists,
    _merge_window,
    _persist_schedule,
    _pop_schedule,
    _resolve_wrapper_entity,
    _restore_boiler_schedule,
    _schedule_switch_window,
    _store_schedule,
)

_LOGGER = logging.getLogger(__name__)

_BOILER_WRAPPER_SWITCH_ERROR = "Boiler wrapper switch not available: %s"

STORAGE_VERSION = 1
STORAGE_KEY = "boiler_schedule"


PLAN_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_CONFIG_ENTRY_ID): str,
        vol.Required("box_id"): str,
        vol.Optional("force", default=False): bool,
        vol.Optional("deadline"): str,
    }
)
APPLY_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_CONFIG_ENTRY_ID): str,
        vol.Required("box_id"): str,
    }
)
CANCEL_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_CONFIG_ENTRY_ID): str,
        vol.Required("box_id"): str,
    }
)


def _get_boiler_coordinator(hass: HomeAssistant, entry_id: str) -> Any | None:
    entry_data = hass.data.get(DOMAIN, {}).get(entry_id)
    if isinstance(entry_data, dict):
        return entry_data.get("boiler_coordinator")
    return None


def _get_boiler_runtime(hass: HomeAssistant, entry_id: str, box_id: str) -> Any | None:
    runtime = get_boiler_runtime(hass, entry_id, box_id)
    if runtime is not None:
        return runtime
    coordinator = _get_boiler_coordinator(hass, entry_id)
    if coordinator is None:
        return None
    from ..boiler.runtime import _create_runtime_for_coordinator

    return _create_runtime_for_coordinator(hass, coordinator, entry_id, box_id)


def setup_boiler_services(
    hass: HomeAssistant, entry_id: str, boiler_coordinator: Any
) -> None:
    _ = boiler_coordinator
    if hass.services.has_service(DOMAIN, SERVICE_PLAN_BOILER_HEATING):
        return

    if not boiler_restore_blocked(hass, entry_id):
        hass.async_create_task(_restore_boiler_schedule(hass, entry_id))

    async def handle_plan_boiler(call: ServiceCall) -> None:
        call_entry_id = call.data[ATTR_CONFIG_ENTRY_ID]
        call_box_id = call.data["box_id"]

        from ..services import _resolve_canonical_boiler_identity

        _resolve_canonical_boiler_identity(
            hass, call_entry_id, call_box_id, SERVICE_PLAN_BOILER_HEATING
        )

        runtime = _get_boiler_runtime(hass, call_entry_id, call_box_id)
        if not runtime:
            _LOGGER.error("No boiler runtime for entry %s", call_entry_id)
            return

        force = bool(call.data.get("force", False))
        deadline = call.data.get("deadline")
        if deadline and not _is_valid_time(deadline):
            _LOGGER.error("Invalid deadline format: %s", deadline)
            return

        await _create_boiler_plan(
            hass,
            runtime,
            call_entry_id,
            force=force,
            deadline_override=deadline,
        )

    async def handle_apply_boiler(call: ServiceCall) -> None:
        call_entry_id = call.data[ATTR_CONFIG_ENTRY_ID]
        call_box_id = call.data["box_id"]

        from ..services import _resolve_canonical_boiler_identity

        _resolve_canonical_boiler_identity(
            hass, call_entry_id, call_box_id, SERVICE_APPLY_BOILER_PLAN
        )

        runtime = _get_boiler_runtime(hass, call_entry_id, call_box_id)
        if not runtime:
            _LOGGER.error("No boiler runtime for entry %s", call_entry_id)
            return

        await _apply_boiler_plan(hass, runtime, call_entry_id)

    async def handle_cancel_boiler(call: ServiceCall) -> None:
        call_entry_id = call.data[ATTR_CONFIG_ENTRY_ID]
        call_box_id = call.data["box_id"]

        from ..services import _resolve_canonical_boiler_identity

        _resolve_canonical_boiler_identity(
            hass, call_entry_id, call_box_id, SERVICE_CANCEL_BOILER_PLAN
        )

        runtime = _get_boiler_runtime(hass, call_entry_id, call_box_id)
        if not runtime:
            _LOGGER.error("No boiler runtime for entry %s", call_entry_id)
            return

        await _cancel_boiler_plan(hass, runtime, call_entry_id, clear_plan=False)

    hass.services.async_register(
        DOMAIN, SERVICE_PLAN_BOILER_HEATING, handle_plan_boiler, schema=PLAN_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_APPLY_BOILER_PLAN, handle_apply_boiler, schema=APPLY_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_CANCEL_BOILER_PLAN, handle_cancel_boiler, schema=CANCEL_SCHEMA
    )

    _LOGGER.info("Boiler planning services registered")


async def _create_boiler_plan(
    hass: HomeAssistant,
    runtime: Any,
    entry_id: str,
    *,
    force: bool,
    deadline_override: Optional[str],
) -> None:
    now = dt_util.now()
    plan = runtime.get_current_plan()
    if plan and not force and getattr(plan, "valid_until", now) > now:
        _LOGGER.debug("Boiler plan still valid for %s, skipping", entry_id)
        return
    await runtime.async_create_plan(force=force, deadline_override=deadline_override)
    await runtime.async_request_refresh()
    _LOGGER.info("Boiler plan created for %s", entry_id)


async def _apply_boiler_plan(
    hass: HomeAssistant, runtime: Any, entry_id: str
) -> None:
    await runtime.async_apply_plan(entry_id)


async def _cancel_boiler_plan(
    hass: HomeAssistant, runtime: Any, entry_id: str, *, clear_plan: bool = False
) -> None:
    await runtime.async_cancel_plan(entry_id, clear_plan)


def _resolve_box_id(coordinator: Any, config: dict[str, Any]) -> str:
    box_id = getattr(coordinator, "box_id", None)
    if isinstance(box_id, str) and box_id.isdigit():
        return box_id
    fallback = config.get("box_id")
    if isinstance(fallback, str) and fallback.isdigit():
        return fallback
    raise ValueError("box_id could not be resolved from coordinator or config")


def _is_valid_time(value: str) -> bool:
    return dt_util.parse_time(value) is not None


def _ensure_schedule_windows(schedule: BoilerSchedule) -> dict[str, list[dict[str, Any]]]:
    return schedule.windows
