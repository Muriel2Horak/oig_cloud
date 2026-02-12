"""Boiler services for planning and scheduling heating windows."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Callable, Optional

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from ..const import (
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
from ..boiler.models import EnergySource

_LOGGER = logging.getLogger(__name__)

_BOILER_WRAPPER_SWITCH_ERROR = "Boiler wrapper switch not available: %s"

# Storage constants
STORAGE_VERSION = 1
STORAGE_KEY = "boiler_schedule"

# Service schemas
PLAN_SCHEMA = vol.Schema(
    {
        vol.Optional("force", default=False): bool,
        vol.Optional("deadline"): str,
    }
)
APPLY_SCHEMA = vol.Schema({})
CANCEL_SCHEMA = vol.Schema({})


def setup_boiler_services(
    hass: HomeAssistant, entry_id: str, boiler_coordinator: Any
) -> None:
    """Register boiler plan services (once)."""
    _ = boiler_coordinator
    if hass.services.has_service(DOMAIN, SERVICE_PLAN_BOILER_HEATING):
        return

    hass.async_create_task(_restore_boiler_schedule(hass, entry_id))

    async def handle_plan_boiler(call: ServiceCall) -> None:
        force = bool(call.data.get("force", False))
        deadline = call.data.get("deadline")
        if deadline and not _is_valid_time(deadline):
            _LOGGER.error("Invalid deadline format: %s", deadline)
            return

        await _create_boiler_plan(
            boiler_coordinator,
            entry_id,
            force=force,
            deadline_override=deadline,
        )

    async def handle_apply_boiler(call: ServiceCall) -> None:
        await _apply_boiler_plan(hass, boiler_coordinator, entry_id)

    async def handle_cancel_boiler(call: ServiceCall) -> None:
        await _cancel_boiler_plan(hass, boiler_coordinator, entry_id, clear_plan=False)

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
    coordinator: Any,
    entry_id: str,
    *,
    force: bool,
    deadline_override: Optional[str],
) -> None:
    now = dt_util.now()
    plan = getattr(coordinator, "_current_plan", None)
    if plan and not force and getattr(plan, "valid_until", now) > now:
        _LOGGER.debug("Boiler plan still valid for %s, skipping", entry_id)
        return

    if not getattr(coordinator, "_current_profile", None):
        await coordinator._update_profile()

    profile = getattr(coordinator, "_current_profile", None)
    if not profile:
        _LOGGER.warning("Boiler profile not available for %s", entry_id)
        return

    spot_prices = await coordinator._get_spot_prices()
    overflow_windows = await coordinator._get_overflow_windows()

    config = getattr(coordinator, "config", {}) or {}
    deadline = deadline_override or config.get(
        CONF_BOILER_DEADLINE_TIME, DEFAULT_BOILER_DEADLINE_TIME
    )

    coordinator._current_plan = await coordinator.planner.async_create_plan(
        profile=profile,
        spot_prices=spot_prices,
        overflow_windows=overflow_windows,
        deadline_time=deadline,
    )

    await coordinator.async_request_refresh()
    _LOGGER.info("Boiler plan created for %s", entry_id)


async def _apply_boiler_plan(
    hass: HomeAssistant, coordinator: Any, entry_id: str
) -> None:
    await _cancel_boiler_plan(hass, coordinator, entry_id, clear_plan=False)

    plan = getattr(coordinator, "_current_plan", None)
    if not plan or not getattr(plan, "slots", None):
        _LOGGER.warning("No boiler plan to apply for %s", entry_id)
        return

    config = getattr(coordinator, "config", {}) or {}
    box_id = _resolve_box_id(coordinator, config)
    main_switch = _resolve_wrapper_entity(box_id, "bojler_top")
    alt_switch = _resolve_wrapper_entity(box_id, "bojler_alt")
    pump_switch = _resolve_wrapper_entity(box_id, "bojler_cirkulace")

    has_main_config = bool(config.get(CONF_BOILER_HEATER_SWITCH_ENTITY))
    has_alt_config = bool(config.get(CONF_BOILER_ALT_HEATER_SWITCH_ENTITY))
    has_pump_config = bool(config.get(CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY))

    if not has_main_config:
        _LOGGER.error("Missing boiler heater switch configuration for %s", entry_id)
        return

    if not _entity_exists(hass, main_switch):
        _LOGGER.error(_BOILER_WRAPPER_SWITCH_ERROR, main_switch)
        return

    if has_alt_config and not _entity_exists(hass, alt_switch):
        _LOGGER.error(_BOILER_WRAPPER_SWITCH_ERROR, alt_switch)
        return

    if has_pump_config and not _entity_exists(hass, pump_switch):
        _LOGGER.error(_BOILER_WRAPPER_SWITCH_ERROR, pump_switch)
        return

    windows = _build_heating_windows(plan.slots, has_alt_config)
    schedule = BoilerSchedule(
        cancel_callbacks=[],
        entities=set(),
        created_at=dt_util.now(),
        windows={},
    )
    schedule_windows = schedule.windows

    for window in windows.get("main", []):
        schedule.cancel_callbacks.extend(
            _schedule_switch_window(hass, main_switch, window)
        )
        schedule.entities.add(main_switch)
        schedule_windows.setdefault(main_switch, []).append(window)

    if has_alt_config:
        for window in windows.get("alt", []):
            schedule.cancel_callbacks.extend(
                _schedule_switch_window(hass, alt_switch, window)
            )
            schedule.entities.add(alt_switch)
            schedule_windows.setdefault(alt_switch, []).append(window)

    pump_windows: list[dict[str, datetime]] = []
    if has_pump_config:
        pump_windows = _build_circulation_windows(
            getattr(coordinator, "_current_profile", None)
        )
        for window in pump_windows:
            schedule.cancel_callbacks.extend(
                _schedule_switch_window(hass, pump_switch, window)
            )
            schedule.entities.add(pump_switch)
            schedule_windows.setdefault(pump_switch, []).append(window)

    _store_schedule(hass, entry_id, schedule)
    await _persist_schedule(hass, entry_id, schedule)
    _LOGGER.info(
        "Boiler plan applied for %s (windows: main=%s, alt=%s, pump=%s)",
        entry_id,
        len(windows.get("main", [])),
        len(windows.get("alt", [])),
        len(pump_windows),
    )


async def _cancel_boiler_plan(
    hass: HomeAssistant, coordinator: Any, entry_id: str, *, clear_plan: bool = False
) -> None:
    schedule = _pop_schedule(hass, entry_id)
    if schedule:
        for cancel in schedule.cancel_callbacks:
            cancel()
        for entity_id in schedule.entities:
            await _async_switch_off(hass, entity_id)

    await _clear_persisted_schedule(hass, entry_id)

    if clear_plan:
        coordinator._current_plan = None
        _LOGGER.info("Boiler plan cleared for %s", entry_id)


def _build_heating_windows(
    slots: list[Any], has_alt_config: bool
) -> dict[str, list[dict[str, datetime]]]:
    main_windows: list[dict[str, datetime]] = []
    alt_windows: list[dict[str, datetime]] = []

    for slot in slots:
        consumption = getattr(slot, "avg_consumption_kwh", 0.0)
        if consumption <= 0:
            continue
        source = getattr(slot, "recommended_source", EnergySource.GRID)
        source_value = source.value if isinstance(source, EnergySource) else str(source)

        target = (
            "alt"
            if source_value == EnergySource.ALTERNATIVE.value and has_alt_config
            else "main"
        )
        windows = alt_windows if target == "alt" else main_windows
        _merge_window(windows, slot.start, slot.end)

    return {"main": main_windows, "alt": alt_windows}


def _build_circulation_windows(profile: Any) -> list[dict[str, datetime]]:
    if not profile or not getattr(profile, "hourly_avg", None):
        return []

    hourly_avg = profile.hourly_avg
    peak_hours = _pick_peak_hours(hourly_avg)
    if not peak_hours:
        return []

    lead_minutes = 20
    windows = []
    now = dt_util.now()
    base = now.replace(minute=0, second=0, microsecond=0)

    for hour in peak_hours:
        end = base.replace(hour=hour)
        if end <= now:
            end += timedelta(days=1)
        start = end - timedelta(minutes=lead_minutes)
        windows.append({"start": start, "end": end})

    return windows


def _pick_peak_hours(hourly_avg: dict[int, float]) -> list[int]:
    ranked = sorted(hourly_avg.items(), key=lambda item: item[1], reverse=True)
    top = [hour for hour, value in ranked if value > 0][:3]
    return sorted(top)


def _merge_window(windows: list[dict[str, datetime]], start: datetime, end: datetime) -> None:
    if not windows:
        windows.append({"start": start, "end": end})
        return

    last = windows[-1]
    if start <= last["end"]:
        if end > last["end"]:
            last["end"] = end
    else:
        windows.append({"start": start, "end": end})


def _resolve_box_id(coordinator: Any, config: dict[str, Any]) -> str:
    box_id = getattr(coordinator, "box_id", None)
    if isinstance(box_id, str) and box_id.isdigit():
        return box_id
    fallback = config.get("box_id")
    if isinstance(fallback, str) and fallback.isdigit():
        return fallback
    return "unknown"


def _resolve_wrapper_entity(box_id: str, suffix: str) -> str:
    return f"switch.oig_{box_id}_{suffix}"


def _entity_exists(hass: HomeAssistant, entity_id: str) -> bool:
    return hass.states.get(entity_id) is not None


def _schedule_switch_window(
    hass: HomeAssistant, entity_id: Optional[str], window: dict[str, datetime]
) -> list[Callable[[], None]]:
    if not entity_id:
        return []

    start = window["start"]
    end = window["end"]
    now = dt_util.now()
    cancel_callbacks = []

    async def _turn_on(_: datetime) -> None:
        await _async_switch_on(hass, entity_id)

    async def _turn_off(_: datetime) -> None:
        await _async_switch_off(hass, entity_id)

    if end <= now:
        return []
    if start <= now < end:
        hass.async_create_task(_async_switch_on(hass, entity_id))
        cancel_callbacks.append(async_track_point_in_time(hass, _turn_off, end))
        return cancel_callbacks

    cancel_callbacks.append(async_track_point_in_time(hass, _turn_on, start))
    cancel_callbacks.append(async_track_point_in_time(hass, _turn_off, end))
    return cancel_callbacks


async def _async_switch_on(hass: HomeAssistant, entity_id: str) -> None:
    await hass.services.async_call(
        "switch", "turn_on", {"entity_id": entity_id}, blocking=False
    )


async def _async_switch_off(hass: HomeAssistant, entity_id: str) -> None:
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": entity_id}, blocking=False
    )


def _store_schedule(hass: HomeAssistant, entry_id: str, schedule: BoilerSchedule) -> None:
    schedules = hass.data.setdefault(DOMAIN, {}).setdefault("boiler_schedules", {})
    schedules[entry_id] = schedule


def _pop_schedule(hass: HomeAssistant, entry_id: str) -> Optional[BoilerSchedule]:
    schedules = hass.data.setdefault(DOMAIN, {}).setdefault("boiler_schedules", {})
    return schedules.pop(entry_id, None)


async def _persist_schedule(
    hass: HomeAssistant, entry_id: str, schedule: BoilerSchedule
) -> None:
    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    existing = await store.async_load() or {}
    serialized = {
        "created_at": schedule.created_at.isoformat(),
        "entities": sorted(schedule.entities),
        "windows": [],
    }

    windows_by_entity = schedule.windows or {}
    for entity_id in schedule.entities:
        for window in windows_by_entity.get(entity_id, []):
            serialized["windows"].append(
                {
                    "entity_id": entity_id,
                    "start": window["start"].isoformat(),
                    "end": window["end"].isoformat(),
                }
            )

    existing[entry_id] = serialized
    await store.async_save(existing)


async def _clear_persisted_schedule(hass: HomeAssistant, entry_id: str) -> None:
    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    existing = await store.async_load() or {}
    if entry_id in existing:
        existing.pop(entry_id, None)
        await store.async_save(existing)


async def _restore_boiler_schedule(hass: HomeAssistant, entry_id: str) -> None:
    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    existing = await store.async_load() or {}
    data = existing.get(entry_id)
    if not data:
        return

    now = dt_util.now()
    schedule = BoilerSchedule(
        cancel_callbacks=[],
        entities=set(),
        created_at=now,
        windows={},
    )

    schedule_windows = schedule.windows

    for window in data.get("windows", []):
        try:
            entity_id = window.get("entity_id")
            start = dt_util.parse_datetime(window.get("start"))
            end = dt_util.parse_datetime(window.get("end"))
            if not entity_id or not start or not end:
                continue
            if end <= now:
                continue
            schedule.entities.add(entity_id)
            schedule_windows.setdefault(entity_id, []).append(
                {"start": start, "end": end}
            )
            schedule.cancel_callbacks.extend(
                _schedule_switch_window(hass, entity_id, {"start": start, "end": end})
            )
        except Exception:
            continue

    if schedule.entities:
        _store_schedule(hass, entry_id, schedule)


def _is_valid_time(value: str) -> bool:
    return dt_util.parse_time(value) is not None


def _ensure_schedule_windows(schedule: BoilerSchedule) -> dict[str, list[dict[str, datetime]]]:
    return schedule.windows
