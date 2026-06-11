"""API views pro bojlerový modul."""

import logging
import math
from datetime import datetime
from typing import Any, Optional

from aiohttp import web
from homeassistant.helpers.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from ..const import DOMAIN, KEY_BOILER_RUNTIMES
from ..const import (
    BOILER_ENERGY_CONSTANT_KWH_L_C,
    CONF_BOILER_COLD_INLET_TEMP_C,
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_DEADLINE_TIME,
    CONF_BOILER_EFFECTIVE_POWER_W,
    CONF_BOILER_PLAN_SLOT_MINUTES,
    CONF_BOILER_STRATIFICATION_MODE,
    CONF_BOILER_TARGET_TEMP_C,
    CONF_BOILER_TEMP_SENSOR_POSITION,
    CONF_BOILER_TEMP_SENSOR_TOP,
    CONF_BOILER_TEMP_SENSOR_BOTTOM,
    CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
    CONF_BOILER_VOLUME_L,
    DEFAULT_BOILER_COLD_INLET_TEMP_C,
    DEFAULT_BOILER_DEADLINE_TIME,
    DEFAULT_BOILER_PLAN_SLOT_MINUTES,
    DEFAULT_BOILER_STRATIFICATION_MODE,
    DEFAULT_BOILER_TARGET_TEMP_C,
    DEFAULT_BOILER_TEMP_SENSOR_POSITION,
    DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO,
)


_LOGGER = logging.getLogger(__name__)


def _identity_error(message: str, reason_code: str = "api_repair_required") -> web.Response:
    return web.json_response(
        {"error": message, "reason_code": reason_code},
        status=404,
    )


def _deprecation_response(endpoint: str) -> web.Response:
    return web.json_response(
        {
            "error": "deprecated",
            "reason_code": "api_repair_required",
            "message": "Use GET /api/oig_cloud/boiler/{entry_id}/{box_id}",
            "repair_url": endpoint,
        },
        status=410,
    )


class BoilerCanonicalView(HomeAssistantView):
    """Canonical API endpoint for boiler query DTO."""

    url = "/api/oig_cloud/boiler/{entry_id}/{box_id}"
    name = "api:oig_cloud:boiler_canonical"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, entry_id: str, box_id: str) -> web.Response:
        try:
            dto = _assemble_canonical_dto(self.hass, entry_id, box_id)
            if isinstance(dto, web.Response):
                return dto
            return web.json_response(dto)
        except Exception as e:
            _LOGGER.error("Error in boiler canonical API: %s", e, exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class BoilerProfileView(HomeAssistantView):
    """API endpoint pro data profilu. DEPRECATED — compatibility shim."""

    url = "/api/oig_cloud/{entry_id}/boiler_profile"
    name = "api:oig_cloud:boiler_profile"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, entry_id: str) -> web.Response:
        try:
            entry_data = self.hass.data.get(DOMAIN, {}).get(entry_id)
            if entry_data is None:
                return web.json_response({"error": "Entry not found"}, status=404)

            boiler_coordinator = entry_data.get("boiler_coordinator")
            if not boiler_coordinator:
                # Fall back to runtime path for config summary when legacy coordinator
                # is absent.  Pick the first available runtime for this entry.
                runtimes: dict = entry_data.get(KEY_BOILER_RUNTIMES) or {}
                if runtimes:
                    first_runtime = next(iter(runtimes.values()))
                    runtime_coordinator = getattr(first_runtime, "coordinator", None)
                    config_summary = _build_boiler_config_summary(runtime_coordinator)
                    return web.json_response(
                        {
                            "profiles": {},
                            "current_category": None,
                            "summary": None,
                            "config": config_summary,
                        }
                    )
                return _deprecation_response("/api/oig_cloud/boiler/{entry_id}/{box_id}")

            profiles = boiler_coordinator.profiler.get_all_profiles()

            response_data: dict[str, Any] = {
                "profiles": {},
                "current_category": None,
                "summary": None,
                "config": _build_boiler_config_summary(boiler_coordinator),
            }

            if boiler_coordinator._current_profile:
                response_data["current_category"] = (
                    boiler_coordinator._current_profile.category
                )

            current_profile = boiler_coordinator._current_profile
            if current_profile:
                response_data["summary"] = _build_profile_summary(
                    current_profile, boiler_coordinator
                )

            for category, profile in profiles.items():
                heatmap_data = []
                for _ in range(7):
                    day_data = []
                    for hour in range(24):
                        consumption, confidence = profile.get_consumption(hour)
                        day_data.append(
                            {
                                "hour": hour,
                                "consumption": round(consumption, 3),
                                "confidence": round(confidence, 2),
                            }
                        )
                    heatmap_data.append(day_data)

                response_data["profiles"][category] = {
                    "category": category,
                    "heatmap": heatmap_data,
                    "hourly_avg": {
                        str(h): round(v, 3) for h, v in profile.hourly_avg.items()
                    },
                    "confidence": {
                        str(h): round(v, 2) for h, v in profile.confidence.items()
                    },
                    "sample_count": {
                        str(h): c for h, c in profile.sample_count.items()
                    },
                    "last_updated": (
                        profile.last_updated.isoformat()
                        if profile.last_updated
                        else None
                    ),
                }

            return web.json_response(response_data)

        except Exception as e:
            _LOGGER.error("Error in boiler profile API: %s", e, exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class BoilerPlanView(HomeAssistantView):
    """API endpoint pro plán ohřevu. DEPRECATED — compatibility shim."""

    url = "/api/oig_cloud/{entry_id}/boiler_plan"
    name = "api:oig_cloud:boiler_plan"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, entry_id: str) -> web.Response:
        try:
            entry_data = self.hass.data.get(DOMAIN, {}).get(entry_id)
            if entry_data is None:
                return web.json_response({"error": "Entry not found"}, status=404)

            boiler_coordinator = entry_data.get("boiler_coordinator")
            if not boiler_coordinator:
                return _deprecation_response("/api/oig_cloud/boiler/{entry_id}/{box_id}")

            plan = boiler_coordinator._current_plan
            if not plan:
                return web.json_response(
                    {"error": "No plan available yet"}, status=404
                )

            now = dt_util.now()

            slots_data = []
            for slot in plan.slots:
                rec_source = _normalize_planner_source(slot.recommended_source)
                slot_entry = {
                    "start": slot.start.isoformat(),
                    "end": slot.end.isoformat(),
                    "consumption_kwh": round(slot.avg_consumption_kwh, 3),
                    "confidence": round(slot.confidence, 2),
                    "recommended_source": rec_source,
                    "spot_price": slot.spot_price_kwh,
                    "alt_price": slot.alt_price_kwh,
                    "overflow_available": slot.overflow_available,
                }
                if rec_source is None and slot.recommended_source is not None:
                    slot_entry["source_invalid"] = True
                slots_data.append(slot_entry)

            next_slot = _find_next_heating_slot(plan.slots, now)

            response_data = {
                "created_at": plan.created_at.isoformat(),
                "valid_until": plan.valid_until.isoformat(),
                "total_consumption_kwh": round(plan.total_consumption_kwh, 2),
                "estimated_cost_czk": round(plan.estimated_cost_czk, 2),
                "fve_kwh": round(plan.fve_kwh, 2),
                "grid_kwh": round(plan.grid_kwh, 2),
                "alt_kwh": round(plan.alt_kwh, 2),
                "slots": slots_data,
                "next_slot": _serialize_slot(next_slot) if next_slot else None,
                "state": _build_state_payload(boiler_coordinator),
            }

            return web.json_response(response_data)

        except Exception as e:
            _LOGGER.error("Error in boiler plan API: %s", e, exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


def register_boiler_api_views(hass: HomeAssistant) -> None:
    """Registruje API views pro bojlerový modul."""
    hass.http.register_view(BoilerCanonicalView(hass))
    hass.http.register_view(BoilerProfileView(hass))
    hass.http.register_view(BoilerPlanView(hass))
    _LOGGER.info("Boiler API views registered")


def _resolve_box_id_from_entry(entry: Any) -> Optional[str]:
    for container_name in ("options", "data"):
        container = getattr(entry, container_name, None)
        if isinstance(container, dict):
            box_id = container.get("box_id")
            if box_id:
                return str(box_id)
    return None


def _validate_identity(
    hass: HomeAssistant, entry_id: str, box_id: str
) -> tuple[bool, Any, Any]:
    """Validate canonical identity. Returns (ok, entry, runtime)."""
    entry = None
    entries = hass.config_entries.async_entries(DOMAIN)
    for candidate in entries:
        if candidate.entry_id == entry_id:
            entry = candidate
            break

    if entry is None or entry.domain != DOMAIN:
        return False, None, None

    domain_data = hass.data.get(DOMAIN, {})
    entry_data = domain_data.get(entry_id)
    if not isinstance(entry_data, dict):
        return False, entry, None

    runtimes = entry_data.get(KEY_BOILER_RUNTIMES)
    if not isinstance(runtimes, dict):
        return False, entry, None

    runtime = runtimes.get(box_id)
    if runtime is None:
        return False, entry, None

    owned_box_id = _resolve_box_id_from_entry(entry)
    if owned_box_id and owned_box_id != box_id:
        return False, entry, None

    coordinator = getattr(runtime, "coordinator", None)
    if coordinator is not None:
        coord_box_id = getattr(coordinator, "box_id", None)
        if coord_box_id and str(coord_box_id) != box_id:
            return False, entry, None

    return True, entry, runtime


def _read_temperatures_from_hass(hass: HomeAssistant, config: dict[str, Any]) -> dict[str, Any]:
    top_sensor = config.get(CONF_BOILER_TEMP_SENSOR_TOP)
    bottom_sensor = config.get(CONF_BOILER_TEMP_SENSOR_BOTTOM)
    temps: dict[str, Any] = {"top": None, "bottom": None, "upper_zone": None, "lower_zone": None}

    top_temp = _read_sensor_float(hass, top_sensor)
    bottom_temp = _read_sensor_float(hass, bottom_sensor)

    temps["top"] = top_temp
    temps["bottom"] = bottom_temp

    if top_temp is not None and bottom_temp is not None:
        temps["upper_zone"] = top_temp
        temps["lower_zone"] = bottom_temp
    elif top_temp is not None:
        split_ratio = config.get(CONF_BOILER_TWO_ZONE_SPLIT_RATIO, DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO)
        from .thermal import calculate_stratified_temp
        upper, lower = calculate_stratified_temp(
            measured_temp=top_temp,
            sensor_position=config.get(CONF_BOILER_TEMP_SENSOR_POSITION, DEFAULT_BOILER_TEMP_SENSOR_POSITION),
            mode="two_zone",
            split_ratio=split_ratio,
        )
        temps["upper_zone"] = upper
        temps["lower_zone"] = lower

    return temps


def _read_sensor_float(hass: HomeAssistant, entity_id: Optional[str]) -> Optional[float]:
    if not entity_id or not hasattr(hass, "states"):
        return None
    state = hass.states.get(entity_id)
    if state is None:
        return None
    try:
        value = float(state.state)
        if not (-50 <= value <= 150):
            return None
        return value
    except (ValueError, AttributeError, TypeError):
        return None


def _compute_energy_state(temperatures: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    volume_l = config.get(CONF_BOILER_VOLUME_L, 200.0)
    target_temp = config.get(CONF_BOILER_TARGET_TEMP_C, DEFAULT_BOILER_TARGET_TEMP_C)
    temp_upper = temperatures.get("upper_zone")
    temp_lower = temperatures.get("lower_zone")

    if temp_upper is not None and temp_lower is not None:
        avg_temp = (temp_upper + temp_lower) / 2.0
        from .thermal import calculate_energy_to_heat
        energy_needed = calculate_energy_to_heat(
            volume_liters=volume_l,
            temp_current=avg_temp,
            temp_target=target_temp,
        )
        return {"avg_temp": round(avg_temp, 2), "energy_needed_kwh": round(energy_needed, 3)}

    if temperatures.get("top") is not None:
        avg_temp = temperatures["top"]
        from .thermal import calculate_energy_to_heat
        energy_needed = calculate_energy_to_heat(
            volume_liters=volume_l,
            temp_current=avg_temp,
            temp_target=target_temp,
        )
        return {"avg_temp": round(avg_temp, 2), "energy_needed_kwh": round(energy_needed, 3)}

    return {"avg_temp": None, "energy_needed_kwh": 0.0}


def _read_energy_tracking(
    hass: HomeAssistant, box_id: str, config: dict[str, Any], runtime: Any = None
) -> dict[str, Any]:
    manual_mode_entity = f"sensor.oig_{box_id}_boiler_manual_mode"
    current_cbb_entity = f"sensor.oig_{box_id}_boiler_current_cbb_w"
    day_energy_entity = f"sensor.oig_{box_id}_boiler_day_w"
    alt_energy_sensor = config.get("boiler_alt_energy_sensor")

    manual_state = hass.states.get(manual_mode_entity)
    current_cbb_state = hass.states.get(current_cbb_entity)
    day_energy_state = hass.states.get(day_energy_entity)

    total_energy = 0.0
    if day_energy_state:
        try:
            total_energy = float(day_energy_state.state) / 1000.0
        except (ValueError, TypeError):
            pass

    # Try runtime attribution first
    source_invalid = False
    current_source: Optional[str] = None
    fve_kwh = 0.0
    grid_kwh = 0.0
    runtime_attribution_resolved = False

    if runtime is not None:
        activity = getattr(runtime, "current_activity", None)
        if activity is not None:
            raw_source = getattr(activity, "source", None)
            normalized = _normalize_runtime_source(raw_source)
            if normalized in ("fve", "overflow"):
                current_source = normalized if normalized in _PLANNER_SOURCE_KEYS else "fve"
                fve_kwh = total_energy
                grid_kwh = 0.0
            elif normalized == "grid":
                current_source = "grid"
                fve_kwh = 0.0
                grid_kwh = total_energy
            elif normalized == "discharge":
                current_source = None
                fve_kwh = 0.0
                grid_kwh = 0.0
            else:
                source_invalid = True
                current_source = None
            runtime_attribution_resolved = True

    if not runtime_attribution_resolved:
        # Legacy heuristic fallback
        if manual_state and manual_state.state == "Zapnuto":
            current_source = "fve"
            fve_kwh = total_energy
            grid_kwh = 0.0
        elif current_cbb_state:
            try:
                if float(current_cbb_state.state) > 0:
                    current_source = "fve"
                    fve_kwh = total_energy
                    grid_kwh = 0.0
            except (ValueError, TypeError):
                pass

        if current_source is None:
            current_source = "grid"
            fve_kwh = 0.0
            grid_kwh = total_energy

    alt_kwh = None
    if alt_energy_sensor:
        alt_state = hass.states.get(alt_energy_sensor)
        if alt_state:
            try:
                alt_val = float(alt_state.state)
                if getattr(alt_state, "attributes", {}).get("unit_of_measurement") == "Wh":
                    alt_val /= 1000.0
                alt_kwh = alt_val
            except (ValueError, TypeError):
                pass

    if alt_kwh is None:
        from .thermal import estimate_residual_energy
        alt_kwh = estimate_residual_energy(total_energy, fve_kwh, grid_kwh)

    result: dict[str, Any] = {
        "current_source": current_source,
        "total_kwh": round(total_energy, 3),
        "fve_kwh": round(fve_kwh, 3),
        "grid_kwh": round(grid_kwh, 3),
        "alt_kwh": round(alt_kwh, 3),
        "source_estimated": not runtime_attribution_resolved,
    }
    if source_invalid:
        result["source_invalid"] = True
    return result


def _assemble_plan_slots(
    plan: Any, target_temp_c: float = DEFAULT_BOILER_TARGET_TEMP_C
) -> list[dict[str, Any]]:
    slots: list[dict[str, Any]] = []
    if not plan or not hasattr(plan, "slots"):
        return slots
    for slot in plan.slots:
        recommended_source = _normalize_planner_source(
            getattr(slot, "recommended_source", None)
        )
        raw_predicted = getattr(slot, "predicted_top_temp_c", None)
        predicted_top_temp_c = None
        comfort_satisfied = None
        if (
            raw_predicted is not None
            and isinstance(raw_predicted, (int, float))
            and math.isfinite(raw_predicted)
            and raw_predicted > 0.0
        ):
            predicted_top_temp_c = raw_predicted
            comfort_satisfied = raw_predicted >= target_temp_c

        slot_data: dict[str, Any] = {
            "start": (
                slot.start.isoformat()
                if hasattr(slot.start, "isoformat")
                else str(slot.start)
            ),
            "end": (
                slot.end.isoformat()
                if hasattr(slot.end, "isoformat")
                else str(slot.end)
            ),
            "consumption_kwh": round(getattr(slot, "avg_consumption_kwh", 0.0), 3),
            "confidence": round(getattr(slot, "confidence", 0.0), 2),
            "recommended_source": recommended_source,
            "spot_price": getattr(slot, "spot_price_kwh", None),
            "alt_price": getattr(slot, "alt_price_kwh", None),
            "overflow_available": getattr(slot, "overflow_available", False),
            "heating_kwh": round(getattr(slot, "heating_kwh", 0.0), 3),
            "pv_kwh": round(getattr(slot, "pv_kwh", 0.0), 3),
            "grid_kwh": round(getattr(slot, "grid_kwh", 0.0), 3),
            "alt_kwh": round(getattr(slot, "alt_kwh", 0.0), 3),
            "estimated_cost_czk": round(getattr(slot, "estimated_cost_czk", 0.0), 2),
            "predicted_top_temp_c": predicted_top_temp_c,
            "comfort_satisfied": comfort_satisfied,
            "pv_share": round(getattr(slot, "pv_share", 0.0), 3),
        }
        if recommended_source is None and getattr(slot, "recommended_source", None) is not None:
            slot_data["source_invalid"] = True
        slots.append(slot_data)
    return slots


_RUNTIME_SOURCE_KEYS = frozenset({"fve", "overflow", "grid", "discharge"})
_PLANNER_SOURCE_KEYS = frozenset({"fve", "overflow", "grid"})


def _normalize_runtime_source(source: Any) -> Optional[str]:
    """Normalize any raw source value to runtime source keys: fve|overflow|grid|discharge|null."""
    if source is None:
        return None
    if hasattr(source, "value"):
        source = source.value
    if not isinstance(source, str):
        return None
    key = source.lower().strip()
    if key in _RUNTIME_SOURCE_KEYS:
        return key
    # Map known aliases
    if key in ("zapnuto", "manual"):
        return "fve"
    if key in ("alternative", "alt"):
        return "grid"
    return None


def _normalize_planner_source(source: Any) -> Optional[str]:
    """Normalize any raw source value to planner source keys: fve|overflow|grid|null."""
    if source is None:
        return None
    if hasattr(source, "value"):
        source = source.value
    if not isinstance(source, str):
        return None
    key = source.lower().strip()
    if key in _PLANNER_SOURCE_KEYS:
        return key
    # Map known aliases
    if key in ("zapnuto", "manual"):
        return "fve"
    if key in ("alternative", "alt"):
        return "grid"
    return None


def _resolve_source_value(source: Any) -> Optional[str]:
    if source is None:
        return None
    if hasattr(source, "value"):
        return str(source.value)
    return str(source)


def _iso_or_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _read_demand_map_dto(runtime: Any, config: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Read demand map DTO from coordinator's demand profiler.

    Returns None if no demand profiler is configured or no data is available yet.
    Backward compatible: absent key = no demand map (older FE ignores it).
    """
    try:
        coordinator = getattr(runtime, "coordinator", None) if runtime else None
        demand_profiler = getattr(coordinator, "_demand_profiler", None)
        if demand_profiler is None:
            return None

        # Determine current category from now()
        from homeassistant.util import dt as dt_util
        from .profiler import _get_profile_category

        now = dt_util.now()
        category = _get_profile_category(now)
        demand_map = demand_profiler.get_demand_map(category)

        # Don't serialize bootstrap/empty maps
        if demand_map.meta.level == "bootstrap" and demand_map.meta.days_used == 0:
            return None

        return demand_map.to_dto()
    except Exception as err:
        _LOGGER.debug("Could not read demand map: %s", err, exc_info=True)
        return None


def _assemble_canonical_dto(
    hass: HomeAssistant, entry_id: str, box_id: str
) -> dict[str, Any] | web.Response:
    ok, entry, runtime = _validate_identity(hass, entry_id, box_id)
    if not ok:
        return _identity_error("Identity not resolved", "api_repair_required")

    config = getattr(runtime.coordinator, "config", {}) or {} if runtime.coordinator else {}
    now = dt_util.now()
    target_temp_c = config.get(CONF_BOILER_TARGET_TEMP_C, DEFAULT_BOILER_TARGET_TEMP_C)

    temperatures = _read_temperatures_from_hass(hass, config)
    energy_state = _compute_energy_state(temperatures, config)
    energy_tracking = _read_energy_tracking(hass, box_id, config, runtime=runtime)

    plan = runtime.get_current_plan() if hasattr(runtime, "get_current_plan") else None
    profile = runtime.get_current_profile() if hasattr(runtime, "get_current_profile") else None
    plan_result = getattr(runtime, "last_plan_result", None)

    serializer = getattr(runtime, "_serializer", None)
    actuator = getattr(runtime, "actuator", None)

    selected_source = None
    actuated_source = None
    comfort_status_code = None
    comfort_satisfied = False
    temperature_at_deadline_c = None
    unsatisfied_comfort_gap_c = None
    plan_reason_codes: list[str] = []
    degraded = False

    if plan_result is not None:
        selected_source = _resolve_source_value(getattr(plan_result, "selected_source", None))
        actuated_source = _resolve_source_value(getattr(plan_result, "actuated_source", None))
        comfort_status = getattr(plan_result, "comfort_status", None)
        if comfort_status is not None:
            comfort_status_code = getattr(comfort_status, "value", str(comfort_status))
        comfort_satisfied = getattr(plan_result, "comfort_satisfied", False)
        temperature_at_deadline_c = getattr(plan_result, "temperature_at_deadline_c", None)
        unsatisfied_comfort_gap_c = getattr(plan_result, "unsatisfied_comfort_gap_c", None)
        for code in getattr(plan_result, "reason_codes", []) or []:
            plan_reason_codes.append(getattr(code, "value", str(code)))
        degraded = getattr(plan_result, "degraded", False)

    if actuated_source is None and serializer is not None:
        actuated_source = getattr(serializer, "last_actuated_source", None)
    if actuated_source is None and actuator is not None:
        actuated_source = getattr(actuator, "last_actuated_source", None)

    if selected_source is None and plan is not None:
        current_slot = plan.get_current_slot(now) if hasattr(plan, "get_current_slot") else None
        if current_slot is not None:
            selected_source = _resolve_source_value(getattr(current_slot, "recommended_source", None))

    selected_source = _normalize_planner_source(selected_source)
    actuated_source = _normalize_planner_source(actuated_source)

    reason_codes = list(plan_reason_codes)
    if serializer is not None:
        for code in getattr(serializer, "reason_codes", []) or []:
            if code not in reason_codes:
                reason_codes.append(code)
    if actuator is not None:
        for code in getattr(actuator, "reason_codes", []) or []:
            if code not in reason_codes:
                reason_codes.append(code)

    degraded_flags: list[str] = []
    if degraded:
        degraded_flags.append("plan_degraded")
    if serializer is not None and getattr(serializer, "state", None) is not None:
        serializer_state = getattr(serializer.state, "value", str(serializer.state))
        if serializer_state in ("degraded", "stopped"):
            degraded_flags.append(f"serializer_{serializer_state}")

    manual_override_state = None
    if serializer is not None:
        manual_override_state = getattr(serializer, "override_state", None)
    if manual_override_state is None and actuator is not None:
        manual_override_state = getattr(actuator, "override_state", None)

    freshness: dict[str, Any] = {
        "last_update": now.isoformat(),
        "data_age_seconds": 0,
    }
    if plan is not None:
        freshness["plan_created_at"] = (
            plan.created_at.isoformat() if hasattr(plan.created_at, "isoformat") else str(plan.created_at)
        )
        freshness["plan_valid_until"] = (
            plan.valid_until.isoformat() if hasattr(plan.valid_until, "isoformat") else str(plan.valid_until)
        )
    if profile is not None and getattr(profile, "last_updated", None):
        freshness["profile_last_updated"] = (
            profile.last_updated.isoformat()
            if hasattr(profile.last_updated, "isoformat")
            else str(profile.last_updated)
        )

    activity_data: dict[str, Any] | None = None
    aura_data: dict[str, Any] | None = None
    source_segments: list[dict[str, Any]] = []
    timeline: list[dict[str, Any]] = []
    sparklines: dict[str, list[float]] = {}

    if runtime is not None:
        activity = getattr(runtime, "current_activity", None)
        if activity is not None:
            activity_source = _normalize_runtime_source(getattr(activity, "source", None))
            activity_data = {
                "state": getattr(activity, "state", "unknown"),
                "source": activity_source,
                "temperature_trend_c_per_min": getattr(activity, "temperature_trend_c_per_min", None),
                "fill_level_pct": round(getattr(activity, "fill_level_pct", 0.0), 3),
                "aura_max_temp_c": getattr(activity, "aura_max_temp_c", 80.0),
                "stale_flags": list(getattr(activity, "stale_flags", [])),
                "heater_states": dict(getattr(activity, "heater_states", {})),
            }
            if activity_data["source"] is None and getattr(activity, "source", None) is not None:
                activity_data["source_invalid"] = True

            current_temp_c = temperatures.get("top")
            aura_data = {
                "fill_level_pct": activity_data["fill_level_pct"],
                "max_temp_c": activity_data["aura_max_temp_c"],
                "current_temp_c": current_temp_c,
            }
        else:
            activity_data = {
                "state": "unknown",
                "source": None,
                "temperature_trend_c_per_min": None,
                "fill_level_pct": 0.0,
                "aura_max_temp_c": 80.0,
                "stale_flags": ["runtime_cache_empty"],
                "heater_states": {},
            }
            aura_data = {
                "fill_level_pct": 0.0,
                "max_temp_c": 80.0,
                "current_temp_c": temperatures.get("top"),
            }

        for seg in getattr(runtime, "source_segments", []):
            key = _normalize_runtime_source(seg.get("key"))
            seg_data: dict[str, Any] = {
                "key": key,
                "start": _iso_or_str(seg.get("start")),
                "end": _iso_or_str(seg.get("end")),
                "energy_kwh": max(0.0, round(seg.get("energy_kwh", 0.0), 3)),
                "fill_pct": 0.0 if key == "discharge" else round(seg.get("fill_pct", 0.0), 3),
                "active": seg.get("active", False),
            }
            if key is None and seg.get("key") is not None:
                seg_data["source_invalid"] = True
            source_segments.append(seg_data)

        for entry in getattr(runtime, "timeline_buffer", []):
            entry_source = _normalize_runtime_source(entry.get("source_key"))
            timeline.append({
                "timestamp": _iso_or_str(entry.get("timestamp")),
                "top_temp_c": entry.get("top_temp_c"),
                "bottom_temp_c": entry.get("bottom_temp_c"),
                "source_key": entry_source,
                "power_kw": entry.get("power_kw"),
                "activity_state": entry.get("activity_state"),
            })

        sparklines = dict(getattr(runtime, "sparklines", {}))

    # Demand map (F2): read from coordinator's demand profiler if available
    demand_map_dto: dict | None = _read_demand_map_dto(runtime, config)

    return {
        "entry_id": entry_id,
        "box_id": box_id,
        "current_state": {
            "temperatures": temperatures,
            "energy_state": energy_state,
            "energy_tracking": energy_tracking,
            "heating": energy_tracking.get("current_source") == "fve",
            "recommended_source": selected_source,
            "last_update": now.isoformat(),
        },
        "comfort_status": {
            "comfort_satisfied": comfort_satisfied,
            "comfort_status_code": comfort_status_code,
            "temperature_at_deadline_c": temperature_at_deadline_c,
            "unsatisfied_comfort_gap_c": unsatisfied_comfort_gap_c,
        },
        "selected_source": selected_source,
        "actuated_source": actuated_source,
        "plan_slots": _assemble_plan_slots(plan, target_temp_c=target_temp_c),
        "reason_codes": reason_codes,
        "freshness": freshness,
        "degraded_flags": {
            "degraded": degraded,
            "flags": degraded_flags,
            "serializer_state": (
                getattr(serializer.state, "value", str(serializer.state))
                if serializer is not None else None
            ),
        },
        "manual_override": {
            "active": manual_override_state is not None,
            "state": manual_override_state,
        },
        "activity": activity_data,
        "aura": aura_data,
        "demand_map": demand_map_dto,
        "source_segments": source_segments,
        "timeline": timeline,
        "sparklines": sparklines,
    }


def _build_boiler_config_summary(coordinator) -> dict:
    config = getattr(coordinator, "config", {}) or {}
    result = {
        "volume_l": config.get(CONF_BOILER_VOLUME_L, 0),
        "target_temp_c": config.get(CONF_BOILER_TARGET_TEMP_C, DEFAULT_BOILER_TARGET_TEMP_C),
        "cold_inlet_temp_c": config.get(
            CONF_BOILER_COLD_INLET_TEMP_C, DEFAULT_BOILER_COLD_INLET_TEMP_C
        ),
        "deadline_time": config.get(CONF_BOILER_DEADLINE_TIME, DEFAULT_BOILER_DEADLINE_TIME),
        "plan_slot_minutes": config.get(
            CONF_BOILER_PLAN_SLOT_MINUTES, DEFAULT_BOILER_PLAN_SLOT_MINUTES
        ),
        "stratification_mode": config.get(
            CONF_BOILER_STRATIFICATION_MODE, DEFAULT_BOILER_STRATIFICATION_MODE
        ),
        "sensor_position": config.get(
            CONF_BOILER_TEMP_SENSOR_POSITION, DEFAULT_BOILER_TEMP_SENSOR_POSITION
        ),
        "two_zone_split_ratio": config.get(
            CONF_BOILER_TWO_ZONE_SPLIT_RATIO, DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO
        ),
        "circulation_pump_switch_entity": config.get(
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY
        ),
        "aura_max_temp_c": 80.0,
    }

    raw_power = config.get(CONF_BOILER_EFFECTIVE_POWER_W)
    if raw_power is not None and raw_power != "":
        try:
            val = float(raw_power)
            if math.isfinite(val):
                result["heater_power_kw"] = val / 1000.0
        except (TypeError, ValueError):
            pass

    return result


def _build_profile_summary(profile, coordinator) -> dict:
    hourly_avg = profile.hourly_avg or {}
    total_kwh = sum(hourly_avg.values()) if hourly_avg else 0.0
    peak_hours = _pick_peak_hours(hourly_avg)
    confidence_values = list(profile.confidence.values()) if profile.confidence else []
    avg_confidence = (
        sum(confidence_values) / len(confidence_values) if confidence_values else 0.0
    )

    config = getattr(coordinator, "config", {}) or {}
    cold_inlet = config.get(CONF_BOILER_COLD_INLET_TEMP_C, DEFAULT_BOILER_COLD_INLET_TEMP_C)
    delta_temp = max(40.0 - float(cold_inlet), 1.0)
    water_liters_40c = (
        total_kwh / (BOILER_ENERGY_CONSTANT_KWH_L_C * delta_temp) if total_kwh else 0.0
    )

    circulation_windows = _build_circulation_windows(peak_hours)

    return {
        "predicted_total_kwh": round(total_kwh, 3),
        "peak_hours": peak_hours,
        "avg_confidence": round(avg_confidence, 2),
        "water_liters_40c": round(water_liters_40c, 0),
        "circulation_windows": circulation_windows,
    }


def _pick_peak_hours(hourly_avg: dict) -> list[int]:
    if not hourly_avg:
        return []
    ranked = sorted(hourly_avg.items(), key=lambda item: item[1], reverse=True)
    top = [hour for hour, value in ranked if value > 0][:3]
    return sorted(top)


def _build_circulation_windows(peak_hours: list[int]) -> list[dict[str, str]]:
    if not peak_hours:
        return []

    lead_minutes = 20
    total_minutes = 24 * 60
    windows = []

    for hour in sorted(set(peak_hours)):
        end_total = hour * 60
        start_total = (end_total - lead_minutes) % total_minutes
        start_label = f"{start_total // 60:02d}:{start_total % 60:02d}"
        end_label = f"{end_total // 60:02d}:{end_total % 60:02d}"
        windows.append({"start": start_label, "end": end_label})

    return windows


def _find_next_heating_slot(slots, now: datetime):
    for slot in slots:
        if slot.end <= now:
            continue
        if slot.avg_consumption_kwh <= 0:
            continue
        return slot
    return None


def _serialize_slot(slot) -> dict:
    rec_source = _normalize_planner_source(slot.recommended_source)
    result = {
        "start": slot.start.isoformat(),
        "end": slot.end.isoformat(),
        "consumption_kwh": round(slot.avg_consumption_kwh, 3),
        "confidence": round(slot.confidence, 2),
        "recommended_source": rec_source,
        "spot_price": slot.spot_price_kwh,
        "alt_price": slot.alt_price_kwh,
        "overflow_available": slot.overflow_available,
    }
    if rec_source is None and slot.recommended_source is not None:
        result["source_invalid"] = True
    return result


def _build_state_payload(coordinator) -> dict:
    data = getattr(coordinator, "data", {}) or {}
    state = {
        "temperatures": data.get("temperatures") or {},
        "energy_state": data.get("energy_state") or {},
        "energy_tracking": data.get("energy_tracking") or {},
        "charging_recommended": data.get("charging_recommended", False),
        "circulation_recommended": data.get("circulation_recommended", False),
        "recommended_source": data.get("recommended_source"),
        "last_update": None,
    }
    last_update = data.get("last_update")
    if isinstance(last_update, datetime):
        state["last_update"] = last_update.isoformat()
    return state
