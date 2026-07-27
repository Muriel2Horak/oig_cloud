"""API views pro bojlerový modul."""

import json
import logging
import math
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from aiohttp import web
from homeassistant.helpers.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from ..const import DOMAIN, KEY_BOILER_RUNTIMES
from ..const import (
    BOILER_ENERGY_CONSTANT_KWH_L_C,
    CONF_BOILER_ALT_COST_KWH,
    CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
    CONF_BOILER_ALT_POWER_KW,
    CONF_BOILER_ALT_SOURCE_TYPE,
    CONF_BOILER_BATTERY_CYCLE_COST,
    CONF_BOILER_CIRCULATION_ENABLED,
    CONF_BOILER_COLD_INLET_TEMP_C,
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_DEADLINE_TIME,
    CONF_BOILER_EFFECTIVE_POWER_W,
    CONF_BOILER_HAS_ALTERNATIVE_HEATING,
    CONF_BOILER_HOME5_MANEUVER_ENABLED,
    CONF_BOX_HAS_HOME56,
    CONF_BOILER_LEGIONELLA_INTERVAL_DAYS,
    CONF_BOILER_LEGIONELLA_TARGET_TEMP_C,
    CONF_BOILER_PLAN_SLOT_MINUTES,
    CONF_BOILER_STRATIFICATION_MODE,
    CONF_BOILER_TARGET_TEMP_C,
    CONF_BOILER_TEMP_SENSOR_POSITION,
    CONF_BOILER_TEMP_SENSOR_TOP,
    CONF_BOILER_TEMP_SENSOR_BOTTOM,
    CONF_BOILER_THERMAL_ARBITRAGE_ENABLED,
    CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
    CONF_BOILER_VOLUME_L,
    DEFAULT_BOILER_ALT_SOURCE_TYPE,
    DEFAULT_BOILER_BATTERY_CYCLE_COST,
    DEFAULT_BOILER_CIRCULATION_ENABLED,
    DEFAULT_BOILER_COLD_INLET_TEMP_C,
    DEFAULT_BOILER_DEADLINE_TIME,
    DEFAULT_BOILER_HOME5_MANEUVER_ENABLED,
    DEFAULT_BOX_HAS_HOME56,
    DEFAULT_BOILER_LEGIONELLA_INTERVAL_DAYS,
    DEFAULT_BOILER_LEGIONELLA_TARGET_TEMP_C,
    DEFAULT_BOILER_PLAN_SLOT_MINUTES,
    DEFAULT_BOILER_STRATIFICATION_MODE,
    DEFAULT_BOILER_TARGET_TEMP_C,
    DEFAULT_BOILER_TEMP_SENSOR_POSITION,
    DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO,
)
from .const import BOILER_READY_TEMP_C
from .classifier import compute_ready_fraction
from .models import BoilerProfile
from .planner_contract import (
    BoilerBatterySignals,
    DemandTarget,
    LegionellaObligation,
    PlannerInput,
    resolve_alt_source_capability,
)
from .planner_core import _build_empty_slots, plan_comfort_core
from .runtime import (
    _build_planner_topology,
    _float_config,
    _normalize_deadline_time,
    planner_input_horizon_hours,
)
from .thermal import calculate_energy_to_heat


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


class _SimulationInputError(ValueError):
    """Malformed boiler_simulate request body — mapped to HTTP 400."""


_PRESETS_FILE = Path(__file__).parent / "water_day_presets.json"

# Whitelist: only these config keys may be overridden by a simulate request.
# Prevents an admin-gated-but-still-external caller from injecting arbitrary
# config_registry keys through override_config.
_OVERRIDE_CONFIG_KEYS = frozenset(
    {
        CONF_BOILER_VOLUME_L,
        CONF_BOILER_TARGET_TEMP_C,
        CONF_BOILER_COLD_INLET_TEMP_C,
        CONF_BOILER_DEADLINE_TIME,
        CONF_BOILER_ALT_COST_KWH,
        CONF_BOILER_HAS_ALTERNATIVE_HEATING,
        CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
        CONF_BOILER_BATTERY_CYCLE_COST,
        CONF_BOILER_THERMAL_ARBITRAGE_ENABLED,
        CONF_BOILER_ALT_POWER_KW,
        CONF_BOILER_LEGIONELLA_INTERVAL_DAYS,
        CONF_BOILER_LEGIONELLA_TARGET_TEMP_C,
        CONF_BOX_HAS_HOME56,
        CONF_BOILER_HOME5_MANEUVER_ENABLED,
        CONF_BOILER_STRATIFICATION_MODE,
        "boiler_heater_power_kw",
    }
)

_DEFAULT_SIM_PRICE_CZK_KWH = 3.5
_DEFAULT_SIM_CHEAP_PRICE_CZK_KWH = 2.0
_DEFAULT_SIM_CHEAP_HOURS = frozenset(range(0, 6)) | frozenset(range(22, 24))


def _require_admin(request: web.Request) -> Optional[web.Response]:
    """Admin gate mirroring the other boiler/planning mutation POST views."""
    user = request.get("hass_user") if hasattr(request, "get") else None
    if user is None and hasattr(request, "app"):
        user = request.app.get("hass_user")
    if not user or not getattr(user, "is_admin", False):
        return web.json_response({"error": "Admin only"}, status=403)
    return None


@lru_cache(maxsize=1)
def _load_water_day_presets() -> dict[str, Any]:
    with _PRESETS_FILE.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    return {key: value for key, value in data.items() if not key.startswith("_")}


def _resolve_config_source(
    key: str, override_config: dict[str, Any], base_config: dict[str, Any]
) -> str:
    if key in override_config:
        return "request"
    if key in base_config:
        return "config"
    return "constant"


def _resolve_water_draws(
    payload: dict[str, Any],
) -> tuple[list[float], Optional[str], str]:
    preset_id = payload.get("preset")
    if preset_id is not None:
        if not isinstance(preset_id, str):
            raise _SimulationInputError("preset must be a string id")
        presets = _load_water_day_presets()
        preset = presets.get(preset_id)
        if preset is None:
            raise _SimulationInputError(
                f"Unknown preset '{preset_id}'. Known presets: {sorted(presets)}"
            )
        return list(preset["water_draw_profile_lh"]), preset_id, "preset"

    explicit = payload.get("water_draw_profile_lh")
    if isinstance(explicit, list) and len(explicit) == 24:
        try:
            draws = [float(v) for v in explicit]
        except (TypeError, ValueError):
            raise _SimulationInputError(
                "water_draw_profile_lh must be a list of 24 numbers (litres per hour)"
            )
        return draws, None, "request"

    raise _SimulationInputError(
        'Request must include either {"preset": "<id>"} or '
        '"water_draw_profile_lh": [24 hourly litres]'
    )


def _resolve_now(payload: dict[str, Any]) -> tuple[datetime, str]:
    raw = payload.get("now")
    if raw is None:
        return dt_util.now(), "constant"
    if not isinstance(raw, str):
        raise _SimulationInputError("'now' must be an ISO-8601 datetime string")
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        raise _SimulationInputError("'now' must be an ISO-8601 datetime string")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt_util.now().tzinfo)
    return parsed, "request"


def _demand_targets_from_draws(
    draws: list[float],
    now: datetime,
    cold_inlet_c: float,
    target_temp_c: float,
) -> list[DemandTarget]:
    """One DemandTarget per non-zero draw hour, due 1h after that hour starts.

    Hour index is relative to `now` (hour 0 = the first simulated hour), not
    wall-clock hour-of-day — keeps the simulation independent of calendar
    day boundaries.
    """
    base = now.replace(minute=0, second=0, microsecond=0)
    targets: list[DemandTarget] = []
    for hour, liters in enumerate(draws):
        if liters <= 0:
            continue
        required_kwh = calculate_energy_to_heat(liters, cold_inlet_c, target_temp_c)
        if required_kwh <= 0:
            continue
        targets.append(
            DemandTarget(
                start=base + timedelta(hours=hour + 1),
                required_kwh=round(required_kwh, 4),
                label=f"draw_h{hour:02d}",
            )
        )
    return targets


def _default_price_for_slot(slot_start: datetime) -> float:
    return (
        _DEFAULT_SIM_CHEAP_PRICE_CZK_KWH
        if slot_start.hour in _DEFAULT_SIM_CHEAP_HOURS
        else _DEFAULT_SIM_PRICE_CZK_KWH
    )


def _resolve_spot_prices(
    payload: dict[str, Any], slots: list[Any]
) -> tuple[dict[datetime, float], str]:
    override = payload.get("grid_prices_czk_kwh")
    if override is not None:
        if not isinstance(override, list) or len(override) != len(slots):
            raise _SimulationInputError(
                f"grid_prices_czk_kwh must be a list of {len(slots)} floats "
                "(one per 15-minute slot in the horizon)"
            )
        try:
            prices = {
                slot.start: float(price) for slot, price in zip(slots, override)
            }
        except (TypeError, ValueError):
            raise _SimulationInputError("grid_prices_czk_kwh values must be numbers")
        return prices, "request"

    return {slot.start: _default_price_for_slot(slot.start) for slot in slots}, "constant"


def _resolve_pv_overflow_windows(
    payload: dict[str, Any],
) -> tuple[list[tuple[datetime, datetime]], str]:
    raw = payload.get("pv_overflow_windows")
    if raw is None:
        return [], "constant"
    if not isinstance(raw, list):
        raise _SimulationInputError(
            "pv_overflow_windows must be a list of [start_iso, end_iso] pairs"
        )
    windows: list[tuple[datetime, datetime]] = []
    for pair in raw:
        if not isinstance(pair, (list, tuple)) or len(pair) != 2:
            raise _SimulationInputError(
                "pv_overflow_windows entries must be [start_iso, end_iso] pairs"
            )
        try:
            start = datetime.fromisoformat(pair[0])
            end = datetime.fromisoformat(pair[1])
        except (TypeError, ValueError):
            raise _SimulationInputError("pv_overflow_windows timestamps must be ISO-8601")
        windows.append((start, end))
    return windows, "request"


def _maybe_build_legionella_obligation(
    payload: dict[str, Any],
    preset_id: Optional[str],
    merged_config: dict[str, Any],
    start_temp_c: float,
) -> tuple[Optional[LegionellaObligation], str]:
    """Synthetic legionella obligation — opt-in only (no recorder access in a dry run)."""
    explicit_request = bool(payload.get("legionella_due"))
    if not explicit_request and preset_id != "legionella_cycle":
        return None, "constant"

    target_temp_c = _float_config(
        merged_config,
        CONF_BOILER_LEGIONELLA_TARGET_TEMP_C,
        DEFAULT_BOILER_LEGIONELLA_TARGET_TEMP_C,
    )
    interval_days = (
        int(
            merged_config.get(
                CONF_BOILER_LEGIONELLA_INTERVAL_DAYS,
                DEFAULT_BOILER_LEGIONELLA_INTERVAL_DAYS,
            )
        )
        or 7
    )
    required_kwh = calculate_energy_to_heat(
        _float_config(merged_config, CONF_BOILER_VOLUME_L, 200.0),
        start_temp_c,
        target_temp_c,
    )
    obligation = LegionellaObligation(
        overdue=True,
        required_kwh=round(required_kwh, 4),
        legionella_target_temp_c=target_temp_c,
        days_since_last=None,
        interval_days=interval_days,
    )
    return obligation, "request" if explicit_request else "preset"


def _build_synthetic_profile(
    category: str, draws: list[float], cold_inlet_c: float, target_temp_c: float
) -> BoilerProfile:
    """Assemble a BoilerProfile from the water-day draws.

    Not consumed by plan_comfort_core (it plans from demand_targets, not
    profile.hourly_avg) but is a required, non-None PlannerInput field —
    populated here so the contract stays honest for any caller that does
    read it.
    """
    hourly_avg: dict[int, float] = {}
    confidence: dict[int, float] = {}
    sample_count: dict[int, int] = {}
    for hour, liters in enumerate(draws):
        hourly_avg[hour] = round(
            calculate_energy_to_heat(float(liters), cold_inlet_c, target_temp_c), 4
        )
        confidence[hour] = 1.0
        sample_count[hour] = 0
    return BoilerProfile(
        category=category,
        hourly_avg=hourly_avg,
        confidence=confidence,
        sample_count=sample_count,
        last_updated=None,
    )


def _serialize_simulated_slot(slot: Any) -> dict[str, Any]:
    return {
        "start": slot.start.isoformat(),
        "end": slot.end.isoformat(),
        "action": slot.action,
        "source": _resolve_source_value(slot.source),
        "heating_kwh": round(slot.heating_kwh, 3),
        "pv_kwh": round(slot.pv_kwh, 3),
        "grid_kwh": round(slot.grid_kwh, 3),
        "alt_kwh": round(slot.alt_kwh, 3),
        "battery_kwh": round(slot.battery_kwh, 3),
        "estimated_cost_czk": round(slot.estimated_cost_czk, 2),
        "predicted_top_temp_c": slot.predicted_top_temp_c,
        "purpose": slot.purpose,
    }


def _build_simulation_summary(plan_result: Any) -> dict[str, Any]:
    comfort_status = getattr(plan_result, "comfort_status", None)
    return {
        "total_heating_kwh": round(
            plan_result.pv_kwh
            + plan_result.grid_kwh
            + plan_result.alt_kwh
            + plan_result.battery_kwh,
            3,
        ),
        "cost_czk": round(plan_result.estimated_cost_czk, 2),
        "pv_kwh": round(plan_result.pv_kwh, 3),
        "grid_kwh": round(plan_result.grid_kwh, 3),
        "alt_kwh": round(plan_result.alt_kwh, 3),
        "battery_kwh": round(plan_result.battery_kwh, 3),
        "cost_if_all_grid": round(plan_result.cost_if_all_grid, 2),
        "cost_if_all_alt": round(plan_result.cost_if_all_alt, 2),
        "comfort_satisfied": plan_result.comfort_satisfied,
        "comfort_status": (
            getattr(comfort_status, "value", str(comfort_status))
            if comfort_status is not None
            else None
        ),
        "temperature_at_deadline_c": plan_result.temperature_at_deadline_c,
        "unsatisfied_comfort_gap_c": plan_result.unsatisfied_comfort_gap_c,
        "degraded": plan_result.degraded,
        "safe_hold": plan_result.safe_hold,
        "reason_codes": [
            getattr(code, "value", str(code)) for code in plan_result.reason_codes
        ],
        "demands_met": list(plan_result.demands_met),
        "demand_labels": list(plan_result.demand_labels),
    }


def _run_boiler_simulation(
    payload: dict[str, Any],
    base_config: dict[str, Any],
    entry_id: str,
    box_id: str,
) -> dict[str, Any]:
    """Build a synthetic PlannerInput and run it through the REAL comfort-core
    planner (plan_comfort_core). Pure function of its arguments plus the
    wall clock (only when `now` is not supplied) — reads no hass state,
    writes nothing.
    """
    override_config_raw = payload.get("override_config") or {}
    if not isinstance(override_config_raw, dict):
        raise _SimulationInputError("override_config must be an object")
    override_config = {
        key: value
        for key, value in override_config_raw.items()
        if key in _OVERRIDE_CONFIG_KEYS
    }
    merged_config = {**base_config, **override_config}

    draws, preset_id, draws_source = _resolve_water_draws(payload)
    now, now_source = _resolve_now(payload)

    volume_l = _float_config(merged_config, CONF_BOILER_VOLUME_L, 200.0)
    target_temp_c = _float_config(
        merged_config, CONF_BOILER_TARGET_TEMP_C, DEFAULT_BOILER_TARGET_TEMP_C
    )
    cold_inlet_c = _float_config(
        merged_config, CONF_BOILER_COLD_INLET_TEMP_C, DEFAULT_BOILER_COLD_INLET_TEMP_C
    )
    # merged_config carries the entry's LIVE stored value, which can be
    # anything a `selector.TimeSelector()` config-flow field has ever
    # produced ("HH:MM:SS", a datetime.time, ...) — normalize it the same
    # way the live planner does (runtime.py) instead of a bare str() cast,
    # which used to hand PlannerInput's strict HH:MM validator a 3-part
    # string and 500 on the owner's real config.
    deadline_time = _normalize_deadline_time(
        merged_config.get(CONF_BOILER_DEADLINE_TIME, DEFAULT_BOILER_DEADLINE_TIME),
        DEFAULT_BOILER_DEADLINE_TIME,
    )

    start_temp_raw = payload.get("start_temp_c")
    if start_temp_raw is not None:
        try:
            start_temp_c = float(start_temp_raw)
        except (TypeError, ValueError):
            raise _SimulationInputError("start_temp_c must be a number")
        start_temp_source = "request"
    else:
        start_temp_c = round((cold_inlet_c + target_temp_c) / 2.0, 1)
        start_temp_source = "constant"

    topology = _build_planner_topology(merged_config)
    horizon_hours = planner_input_horizon_hours(merged_config)
    slots = _build_empty_slots(now, horizon_hours)

    demand_targets = _demand_targets_from_draws(draws, now, cold_inlet_c, target_temp_c)
    spot_prices, prices_source = _resolve_spot_prices(payload, slots)
    overflow_windows, overflow_source = _resolve_pv_overflow_windows(payload)

    alt_capability = resolve_alt_source_capability(
        has_alternative=bool(merged_config.get(CONF_BOILER_HAS_ALTERNATIVE_HEATING, False)),
        actuator_model="switch" if merged_config.get(CONF_BOILER_ALT_HEATER_SWITCH_ENTITY) else None,
        supported_models={"switch"},
    )
    home5_available = bool(
        merged_config.get(CONF_BOX_HAS_HOME56, DEFAULT_BOX_HAS_HOME56)
        and merged_config.get(
            CONF_BOILER_HOME5_MANEUVER_ENABLED, DEFAULT_BOILER_HOME5_MANEUVER_ENABLED
        )
    )
    battery_cycle_cost = _float_config(
        merged_config, CONF_BOILER_BATTERY_CYCLE_COST, DEFAULT_BOILER_BATTERY_CYCLE_COST
    )
    legionella_obligation, legionella_source = _maybe_build_legionella_obligation(
        payload, preset_id, merged_config, start_temp_c
    )
    synthetic_profile = _build_synthetic_profile(
        preset_id or "custom", draws, cold_inlet_c, target_temp_c
    )

    planner_input = PlannerInput(
        entry_id=entry_id,
        box_id=box_id,
        profile=synthetic_profile,
        spot_prices=spot_prices,
        overflow_windows=overflow_windows,
        deadline_time=deadline_time,
        topology=topology,
        current_top_temp_c=start_temp_c,
        current_bottom_temp_c=None,
        temperature_updated_at=now,
        alt_source_capability=alt_capability,
        alt_cost_kwh=_float_config(merged_config, CONF_BOILER_ALT_COST_KWH, 0.0),
        pv_forecast=0.0,
        pv_confidence=0.0,
        battery_signals=BoilerBatterySignals.from_raw(
            {"overflow_windows": overflow_windows}
        ),
        reason_codes=[],
        demand_targets=demand_targets,
        legionella_obligation=legionella_obligation,
        home5_available=home5_available,
        battery_cycle_cost_czk_kwh=battery_cycle_cost,
        thermal_arbitrage_enabled=bool(
            merged_config.get(CONF_BOILER_THERMAL_ARBITRAGE_ENABLED, False)
        ),
        alt_power_kw=_float_config(merged_config, CONF_BOILER_ALT_POWER_KW, 0.0),
    )

    plan_result = plan_comfort_core(planner_input, now=now)

    return {
        "entry_id": entry_id,
        "box_id": box_id,
        "preset": preset_id,
        "inputs": {
            "now": now.isoformat(),
            "horizon_hours": horizon_hours,
            "water_draw_profile_lh": draws,
            "start_temp_c": start_temp_c,
            "boiler_volume_l": volume_l,
            "boiler_target_temp_c": target_temp_c,
            "boiler_cold_inlet_temp_c": cold_inlet_c,
            "deadline_time": deadline_time,
        },
        "source": {
            "water_draw_profile_lh": draws_source,
            "now": now_source,
            "start_temp_c": start_temp_source,
            "grid_prices_czk_kwh": prices_source,
            "pv_overflow_windows": overflow_source,
            "boiler_volume_l": _resolve_config_source(
                CONF_BOILER_VOLUME_L, override_config, base_config
            ),
            "boiler_target_temp_c": _resolve_config_source(
                CONF_BOILER_TARGET_TEMP_C, override_config, base_config
            ),
            "boiler_cold_inlet_temp_c": _resolve_config_source(
                CONF_BOILER_COLD_INLET_TEMP_C, override_config, base_config
            ),
            "deadline_time": _resolve_config_source(
                CONF_BOILER_DEADLINE_TIME, override_config, base_config
            ),
            "alt_cost_kwh": _resolve_config_source(
                CONF_BOILER_ALT_COST_KWH, override_config, base_config
            ),
            "battery_cycle_cost_czk_kwh": _resolve_config_source(
                CONF_BOILER_BATTERY_CYCLE_COST, override_config, base_config
            ),
            "thermal_arbitrage_enabled": _resolve_config_source(
                CONF_BOILER_THERMAL_ARBITRAGE_ENABLED, override_config, base_config
            ),
            "legionella_obligation": legionella_source,
        },
        "timeline": [_serialize_simulated_slot(slot) for slot in plan_result.slots],
        "summary": _build_simulation_summary(plan_result),
    }


class BoilerSimulateView(HomeAssistantView):
    """Dry-run boiler simulator (S2).

    Feeds a synthetic water-usage day (bundled preset or an explicit 24h
    litre series) through the REAL comfort-core planner (plan_comfort_core)
    and returns the resulting heating windows, temperature trajectory and
    cost — without touching any live sensor, runtime state, config entry or
    persisted store. Admin-gated like the other boiler/planning POST views;
    this endpoint itself performs no mutation, but override_config is a
    config-shaped input surface and is gated the same way as module_config.
    """

    url = "/api/oig_cloud/boiler/{entry_id}/{box_id}/simulate_water_day"
    name = "api:oig_cloud:boiler_simulate"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: web.Request, entry_id: str, box_id: str) -> web.Response:
        admin_error = _require_admin(request)
        if admin_error is not None:
            return admin_error

        try:
            payload = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON payload"}, status=400)
        if not isinstance(payload, dict):
            return web.json_response({"error": "Invalid JSON payload"}, status=400)

        ok, _entry, runtime = _validate_identity(self.hass, entry_id, box_id)
        if not ok:
            return _identity_error("Identity not resolved", "api_repair_required")

        base_config: dict[str, Any] = {}
        if runtime is not None and runtime.coordinator is not None:
            base_config = dict(getattr(runtime.coordinator, "config", {}) or {})

        try:
            result = _run_boiler_simulation(payload, base_config, entry_id, box_id)
        except _SimulationInputError as err:
            return web.json_response({"error": str(err)}, status=400)
        except Exception as e:
            _LOGGER.error("Error in boiler simulate API: %s", e, exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

        return web.json_response(result)


class BoilerSimulatePresetsView(HomeAssistantView):
    """List the simulate_water_day presets (id + short CZ label).

    The simulator overlay fetches this list to populate its preset chips.
    POST-only routing left it 404. Admin-gated + identity-validated like
    `BoilerSimulateView` (it shares the config-shaped path surface).
    """

    url = "/api/oig_cloud/boiler/{entry_id}/{box_id}/simulate_water_day/presets"
    name = "api:oig_cloud:boiler_simulate_presets"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, entry_id: str, box_id: str) -> web.Response:
        admin_error = _require_admin(request)
        if admin_error is not None:
            return admin_error

        ok, _entry, _runtime = _validate_identity(self.hass, entry_id, box_id)
        if not ok:
            return _identity_error("Identity not resolved", "api_repair_required")

        try:
            presets = _load_water_day_presets()
        except (OSError, ValueError) as e:
            _LOGGER.error("Error loading water_day presets: %s", e, exc_info=True)
            return web.json_response({"error": "Presets unavailable"}, status=500)

        items = [
            {"id": preset_id, "name": preset.get("name") or preset.get("label") or preset_id}
            for preset_id, preset in presets.items()
        ]
        return web.json_response(items)


def register_boiler_api_views(hass: HomeAssistant) -> None:
    """Registruje API views pro bojlerový modul."""
    hass.http.register_view(BoilerCanonicalView(hass))
    hass.http.register_view(BoilerProfileView(hass))
    hass.http.register_view(BoilerPlanView(hass))
    hass.http.register_view(BoilerSimulateView(hass))
    hass.http.register_view(BoilerSimulatePresetsView(hass))
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


def _read_alt_energy_cumulative_delta(runtime: Any, current_kwh: float) -> float:
    """Return today's alt-energy delta from a cumulative (non-resetting) sensor.

    Stores a midnight baseline in runtime._alt_energy_cumul_baseline (a dict with
    'date' and 'value').  When the date changes, resets the baseline to current_kwh
    so today's delta starts at 0.  Returns max(0, current - baseline).

    Degrades gracefully when runtime is None or lacks the attribute.
    """
    today = dt_util.now().date()
    baseline_attr = "_alt_energy_cumul_baseline"
    baseline: Optional[dict] = getattr(runtime, baseline_attr, None)

    if baseline is None or baseline.get("date") != today:
        new_baseline: dict = {"date": today, "value": current_kwh}
        try:
            if runtime is not None:
                setattr(runtime, baseline_attr, new_baseline)
        except Exception:
            pass
        # First read of the day: delta is 0 (baseline just set)
        return 0.0

    return max(0.0, current_kwh - baseline["value"])


def _read_energy_tracking(
    hass: HomeAssistant, box_id: str, config: dict[str, Any], runtime: Any = None
) -> dict[str, Any]:
    """Read and attribute today's boiler energy to sources (fve, grid, alternative).

    Attribution strategy (Task B):
    1. Electric split (fve / grid): use per-source accumulators on the runtime
       that are updated on every classifier call (integrating power × duration).
       On the first read after restart we re-seed the accumulators from the box
       day counter so the total matches without losing unseen history.
       NEVER assign the entire day total to the momentary source.
    2. Alternative (gas/heat-pump): read the daily alt-energy meter directly.
       If the meter is unavailable, estimate the residual.
    3. Box day counter (sensor.oig_{box_id}_boiler_day_w Wh) is the ground-truth
       electric total; fve+grid are derived from accumulators clamped to that total.
    """
    day_energy_entity = f"sensor.oig_{box_id}_boiler_day_w"
    alt_energy_sensor = config.get("boiler_alt_energy_sensor")

    day_energy_state = hass.states.get(day_energy_entity)

    total_energy = 0.0
    if day_energy_state:
        try:
            total_energy = float(day_energy_state.state) / 1000.0
        except (ValueError, TypeError):
            pass

    # --- Electric split from runtime accumulators ---
    fve_kwh = 0.0
    grid_kwh = 0.0
    current_source: Optional[str] = None
    source_estimated = True

    if runtime is not None:
        # Re-seed on restart: if accumulators are empty but box counter > 0
        reseed_fn = getattr(runtime, "reseed_daily_source_kwh", None)
        if callable(reseed_fn):
            reseed_fn(total_energy)

        get_daily_fn = getattr(runtime, "get_daily_source_kwh", None)
        if callable(get_daily_fn):
            daily = get_daily_fn()
            fve_kwh = daily.get("fve", 0.0)
            grid_kwh = daily.get("grid", 0.0)
            source_estimated = False

        # Clamp so fve+grid never exceeds total_energy
        electric_total = fve_kwh + grid_kwh
        if electric_total > total_energy + 0.001 and electric_total > 0:
            scale = total_energy / electric_total
            fve_kwh *= scale
            grid_kwh *= scale

        # current_source from live activity
        activity = getattr(runtime, "current_activity", None)
        if activity is not None:
            raw_source = getattr(activity, "source", None)
            normalized = _normalize_runtime_source(raw_source)
            if normalized in ("fve", "overflow"):
                current_source = "fve"
            elif normalized == "grid":
                current_source = "grid"
            elif normalized == "alternative":
                current_source = "alternative"

    if runtime is None or source_estimated:
        # Legacy fallback: no runtime available — avoid assigning the full day to
        # the momentary source.  We do NOT know the split; leave both at 0 and
        # mark source_estimated=True so the UI shows the uncertainty.
        fve_kwh = 0.0
        grid_kwh = 0.0
        source_estimated = True
        current_source = None

    # --- Alt energy meter ---
    # boiler_alt_energy_daily (default True): sensor resets at midnight.
    #   True  → read value directly as today's kWh.
    #   False → cumulative lifetime sensor; compute today's delta from midnight baseline.
    alt_kwh: Optional[float] = None
    alt_energy_daily: bool = bool(config.get("boiler_alt_energy_daily", True))
    if alt_energy_sensor:
        alt_state = hass.states.get(alt_energy_sensor)
        if alt_state:
            try:
                alt_val = float(alt_state.state)
                if getattr(alt_state, "attributes", {}).get("unit_of_measurement") == "Wh":
                    alt_val /= 1000.0
                if math.isfinite(alt_val) and alt_val >= 0:
                    if alt_energy_daily:
                        alt_kwh = alt_val
                    else:
                        # Cumulative sensor: store midnight baseline in runtime and
                        # return today's delta (current − baseline at midnight).
                        alt_kwh = _read_alt_energy_cumulative_delta(runtime, alt_val)
            except (ValueError, TypeError):
                pass

    unattributed_kwh = 0.0
    if alt_kwh is None:
        from .thermal import estimate_residual_energy
        alt_kwh = estimate_residual_energy(total_energy, fve_kwh, grid_kwh)
    else:
        # Alt is metered separately (gas) — the box day counter is ELECTRIC
        # energy only. Any electric energy the accumulators could not attribute
        # (e.g. pre-restart gap) is honestly reported as 'unattributed' instead
        # of being silently dumped into a source bucket.
        unattributed_kwh = max(0.0, total_energy - fve_kwh - grid_kwh)

    # Cost (Kč): grid is integrated at the all-in spot price (runtime cost
    # accumulator); FVE/overflow is free; alt = metered gas/heat × configured
    # Kč/kWh. Savings = what the same electric energy would have cost on the alt
    # source minus what it actually cost (grid only; FVE is free).
    grid_cost = 0.0
    if runtime is not None:
        try:
            grid_cost = float(runtime.get_daily_source_cost_czk().get("grid", 0.0) or 0.0)
        except Exception:
            grid_cost = 0.0
    try:
        alt_price = float(config.get(CONF_BOILER_ALT_COST_KWH, 0.0) or 0.0)
    except (TypeError, ValueError):
        alt_price = 0.0
    alt_cost = round((alt_kwh or 0.0) * alt_price, 2) if alt_price > 0 else 0.0
    cost_czk = round(grid_cost + alt_cost, 2)
    # Savings only over ATTRIBUTED electric energy (fve+grid) where the real cost
    # is known — never the unattributed (post-restart) gap, which would otherwise
    # be counted as "free" and inflate the savings.
    attributed_electric_kwh = fve_kwh + grid_kwh
    savings_vs_alt = (
        round(attributed_electric_kwh * alt_price - grid_cost, 2)
        if alt_price > 0
        else None
    )

    result: dict[str, Any] = {
        "current_source": current_source,
        "total_kwh": round(total_energy, 3),
        "fve_kwh": round(fve_kwh, 3),
        "grid_kwh": round(grid_kwh, 3),
        "alt_kwh": round(alt_kwh, 3),
        "unattributed_kwh": round(unattributed_kwh, 3),
        "source_estimated": source_estimated or unattributed_kwh > 0.01,
        "cost_czk": cost_czk,
        "grid_cost_czk": round(grid_cost, 2),
        "alt_cost_czk": alt_cost,
        "savings_vs_alt_czk": savings_vs_alt,
    }
    return result


def _assemble_plan_slots(
    plan: Any,
    target_temp_c: float = DEFAULT_BOILER_TARGET_TEMP_C,
    volume_l: float = 200.0,
    cold_inlet_c: float = DEFAULT_BOILER_COLD_INLET_TEMP_C,
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

        # SoC curve: predicted ready (>=40 degC) litres from the forecast top
        # temperature (top-only conservative model — the plan predicts top only).
        ready_liters = None
        if predicted_top_temp_c is not None:
            ready_fraction = compute_ready_fraction(
                predicted_top_temp_c,
                None,
                ready_temp_c=BOILER_READY_TEMP_C,
                cold_inlet_c=cold_inlet_c,
            )
            ready_liters = round(ready_fraction * volume_l, 1)

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
            "battery_kwh": round(getattr(slot, "battery_kwh", 0.0), 3),
            "estimated_cost_czk": round(getattr(slot, "estimated_cost_czk", 0.0), 2),
            "predicted_top_temp_c": predicted_top_temp_c,
            "ready_liters": ready_liters,
            "comfort_satisfied": comfort_satisfied,
            "pv_share": round(getattr(slot, "pv_share", 0.0), 3),
            # R9: purpose field — "comfort" (default) or "legionella"
            "purpose": getattr(slot, "purpose", "comfort"),
        }
        if recommended_source is None and getattr(slot, "recommended_source", None) is not None:
            slot_data["source_invalid"] = True
        slots.append(slot_data)
    return slots


_RUNTIME_SOURCE_KEYS = frozenset({"fve", "overflow", "grid", "discharge", "battery", "alternative"})
_PLANNER_SOURCE_KEYS = frozenset({"fve", "overflow", "grid", "battery", "alternative"})


def _normalize_runtime_source(source: Any) -> Optional[str]:
    """Normalize any raw source value to runtime source keys: fve|overflow|grid|discharge|alternative|null."""
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
    if key == "alt":
        return "alternative"
    return None


def _normalize_planner_source(source: Any) -> Optional[str]:
    """Normalize any raw source value to planner source keys: fve|overflow|grid|battery|alternative|null."""
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
    if key == "alt":
        return "alternative"
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


def _read_draw_map_dto(runtime: Any) -> Optional[dict[str, Any]]:
    """Read the draw-map DTO (weekly heatmap + P90 day profiles) for the UI.

    Returns None when no demand profiler exists or there is no history yet.
    Backward compatible: absent key = no draw map (older FE ignores it).
    """
    try:
        coordinator = getattr(runtime, "coordinator", None) if runtime else None
        demand_profiler = getattr(coordinator, "_demand_profiler", None)
        if demand_profiler is None:
            return None
        dto = demand_profiler.get_draw_map_dto()
        if not dto.get("weekly"):
            return None
        return dto
    except Exception as err:
        _LOGGER.debug("Could not read draw map: %s", err, exc_info=True)
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
                "source_estimated": bool(getattr(activity, "source_estimated", False)),
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
    draw_map_dto: dict | None = _read_draw_map_dto(runtime)

    # R9: legionella status DTO (null when disabled or runtime absent)
    legionella_dto: dict | None = _build_legionella_dto(runtime, config, plan_result)

    # R5: circulation runs DTO — list[{start, end, label}], empty when disabled
    circulation_runs_dto: list[dict[str, Any]] = _build_circulation_runs_dto(runtime, config)

    # R3: Home 5 maneuver status DTO
    home5_dto: dict[str, Any] = _build_home5_dto(runtime, config)

    # F4: energy_today — top-level reuse of _read_energy_tracking result.
    # battery_kwh is not tracked retroactively yet (Home 5 engagement attribution
    # TODO: attribute battery slots when Home 5 runtime logs segment energy).
    energy_today_dto: dict[str, Any] = {
        "total_kwh": energy_tracking.get("total_kwh", 0.0),
        "fve_kwh": energy_tracking.get("fve_kwh", 0.0),
        "grid_kwh": energy_tracking.get("grid_kwh", 0.0),
        "alt_kwh": energy_tracking.get("alt_kwh", 0.0),
        "battery_kwh": 0.0,  # TODO: attribute from Home 5 source_segments when available
        "unattributed_kwh": energy_tracking.get("unattributed_kwh", 0.0),
        "source_invalid": bool(energy_tracking.get("source_invalid", False)),
        # Real today cost (Kč) — grid integrated at the all-in spot price + metered
        # gas × config; replaces the planner's estimated FUTURE cost on the tile.
        "cost_czk": energy_tracking.get("cost_czk", 0.0),
        "grid_cost_czk": energy_tracking.get("grid_cost_czk", 0.0),
        "alt_cost_czk": energy_tracking.get("alt_cost_czk", 0.0),
        "savings_vs_alt_czk": energy_tracking.get("savings_vs_alt_czk"),
    }

    # F4: plan_summary — cost benchmarks + deadline from plan_result + config.
    # Null-safe: emits None when no plan has been computed yet.
    plan_summary_dto: dict[str, Any] | None = _build_plan_summary_dto(
        plan_result, config
    )

    # R1/R8: alt_source_type — string label for FE ("gas"|"heat_pump"|"fireplace"|"other").
    alt_source_type: str = config.get(CONF_BOILER_ALT_SOURCE_TYPE, DEFAULT_BOILER_ALT_SOURCE_TYPE) or DEFAULT_BOILER_ALT_SOURCE_TYPE

    # Real heating state from the live activity classifier (driven by the power
    # estimator), NOT the retained last-known source — the latter stays "fve"
    # at standby and falsely reads "heating".
    _activity_now = getattr(runtime, "current_activity", None)
    _activity_state = getattr(_activity_now, "state", None) if _activity_now is not None else None
    is_heating_now = isinstance(_activity_state, str) and _activity_state.startswith("charging_")

    return {
        "entry_id": entry_id,
        "box_id": box_id,
        "alt_source_type": alt_source_type,
        "current_state": {
            "temperatures": temperatures,
            "energy_state": energy_state,
            "energy_tracking": energy_tracking,
            "heating": is_heating_now,
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
        "plan_slots": _assemble_plan_slots(
            plan,
            target_temp_c=target_temp_c,
            volume_l=float(config.get(CONF_BOILER_VOLUME_L, 200.0)),
            cold_inlet_c=float(
                config.get(CONF_BOILER_COLD_INLET_TEMP_C, DEFAULT_BOILER_COLD_INLET_TEMP_C)
            ),
        ),
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
        "draw_map": draw_map_dto,
        "legionella": legionella_dto,
        "circulation_runs": circulation_runs_dto,
        "home5": home5_dto,
        "source_segments": source_segments,
        "timeline": timeline,
        "sparklines": sparklines,
        "energy_today": energy_today_dto,
        "plan_summary": plan_summary_dto,
    }


def _build_plan_summary_dto(
    plan_result: Any,
    config: dict[str, Any],
) -> Optional[dict[str, Any]]:
    """Build the plan_summary sub-DTO for the canonical endpoint (F4).

    Returns None when no plan has been computed yet (null-safe).
    Schema:
        {estimated_cost_czk, cost_if_all_grid, cost_if_all_alt, deadline_time: "HH:MM"}
    """
    deadline_time: str = config.get(CONF_BOILER_DEADLINE_TIME, DEFAULT_BOILER_DEADLINE_TIME) or DEFAULT_BOILER_DEADLINE_TIME

    if plan_result is None:
        # No plan yet — still emit deadline_time so FE can draw the dashed line.
        return {
            "estimated_cost_czk": None,
            "cost_if_all_grid": None,
            "cost_if_all_alt": None,
            "deadline_time": deadline_time,
        }

    estimated_cost = getattr(plan_result, "estimated_cost_czk", None)
    cost_if_all_grid = getattr(plan_result, "cost_if_all_grid", None)
    cost_if_all_alt = getattr(plan_result, "cost_if_all_alt", None)

    def _safe_round(val: Any) -> Optional[float]:
        if val is None:
            return None
        try:
            f = float(val)
            return round(f, 2) if math.isfinite(f) else None
        except (TypeError, ValueError):
            return None

    return {
        "estimated_cost_czk": _safe_round(estimated_cost),
        "cost_if_all_grid": _safe_round(cost_if_all_grid),
        "cost_if_all_alt": _safe_round(cost_if_all_alt),
        "deadline_time": deadline_time,
    }


def _build_legionella_dto(
    runtime: Any,
    config: dict[str, Any],
    plan_result: Any,
) -> Optional[dict[str, Any]]:
    """Build the legionella status sub-DTO for the canonical endpoint.

    Always returns a dict (FE can unconditionally read legionella.enabled).
    Schema:
        {enabled, days_since_last (int|null), interval_days, scheduled_start (ISO|null)}
    """
    interval_days = int(
        config.get(CONF_BOILER_LEGIONELLA_INTERVAL_DAYS, DEFAULT_BOILER_LEGIONELLA_INTERVAL_DAYS)
    )
    enabled = interval_days > 0

    # PlanResult does not carry planner_input; days_since comes from the
    # runtime's legionella cache. scheduled_start comes from plan slot purpose tags.
    days_since: Optional[int] = None
    if runtime is not None:
        cache = getattr(runtime, "_legionella_cache", None)
        if cache is not None:
            last_achieved = getattr(cache, "last_achieved_at", None)
            if last_achieved is not None:
                now = dt_util.now()
                age = now - last_achieved
                days_since = int(age.total_seconds() // 86400)

    # scheduled_start: first legionella-purpose slot in the current plan.
    scheduled_start: Optional[str] = None
    if plan_result is not None:
        slots = getattr(plan_result, "slots", None) or []
        for slot in slots:
            if getattr(slot, "purpose", "comfort") == "legionella":
                try:
                    scheduled_start = slot.start.isoformat()
                except Exception:
                    pass
                break

    return {
        "enabled": enabled,
        "days_since_last": days_since,
        "interval_days": interval_days,
        "scheduled_start": scheduled_start,
    }


def _build_circulation_runs_dto(
    runtime: Any,
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    """Build the circulation_runs sub-DTO for the canonical endpoint.

    Returns an empty list when the feature is disabled or runtime is absent.
    Schema: [{start: ISO, end: ISO, label: str}]
    """
    enabled = bool(config.get(CONF_BOILER_CIRCULATION_ENABLED, DEFAULT_BOILER_CIRCULATION_ENABLED))
    if not enabled or runtime is None:
        return []

    runs = getattr(runtime, "_circulation_runs", []) or []
    result: list[dict[str, Any]] = []
    for run_start, run_end, label in runs:
        try:
            result.append({
                "start": run_start.isoformat() if hasattr(run_start, "isoformat") else str(run_start),
                "end": run_end.isoformat() if hasattr(run_end, "isoformat") else str(run_end),
                "label": label,
            })
        except Exception:
            pass
    return result


def _build_home5_dto(
    runtime: Any,
    config: dict[str, Any],
) -> dict[str, Any]:
    """Build the Home 5 maneuver status sub-DTO for the canonical endpoint.

    Schema:
        {capability: bool, enabled: bool, engaged: bool}

    capability: box supports Home 5/6 (CONF_BOX_HAS_HOME56)
    enabled:    boiler planner opt-in (CONF_BOILER_HOME5_MANEUVER_ENABLED)
    engaged:    planner currently has the Home 5 bit set
    """
    capability = bool(config.get(CONF_BOX_HAS_HOME56, DEFAULT_BOX_HAS_HOME56))
    enabled = bool(
        capability
        and config.get(CONF_BOILER_HOME5_MANEUVER_ENABLED, DEFAULT_BOILER_HOME5_MANEUVER_ENABLED)
    )
    engaged = False
    if runtime is not None:
        engaged = bool(getattr(runtime, "_home5_engaged_by_planner", False))
    return {
        "capability": capability,
        "enabled": enabled,
        "engaged": engaged,
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
