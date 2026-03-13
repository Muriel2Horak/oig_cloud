"""API views pro bojlerový modul."""

import logging
from datetime import datetime

from aiohttp import web
from homeassistant.helpers.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from ..const import DOMAIN
from ..const import (
    BOILER_ENERGY_CONSTANT_KWH_L_C,
    CONF_BOILER_COLD_INLET_TEMP_C,
    CONF_BOILER_CONFIG_MODE,
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_DEADLINE_TIME,
    CONF_BOILER_PLAN_SLOT_MINUTES,
    CONF_BOILER_STRATIFICATION_MODE,
    CONF_BOILER_TARGET_TEMP_C,
    CONF_BOILER_TEMP_SENSOR_POSITION,
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


class BoilerProfileView(HomeAssistantView):
    """API endpoint pro data profilu."""

    url = "/api/oig_cloud/{entry_id}/boiler_profile"
    name = "api:oig_cloud:boiler_profile"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize view."""
        self.hass = hass

    async def get(self, request: web.Request, entry_id: str) -> web.Response:
        """Vrátí profilová data ve formátu pro heatmapu."""
        try:
            # Získat boiler coordinator
            entry_data = self.hass.data.get(DOMAIN, {}).get(entry_id)
            if not entry_data:
                return web.json_response({"error": "Entry not found"}, status=404)

            boiler_coordinator = entry_data.get("boiler_coordinator")
            if not boiler_coordinator:
                return web.json_response(
                    {"error": "Boiler module not enabled"}, status=404
                )

            # Získat všechny profily
            profiles = boiler_coordinator.profiler.get_all_profiles()

            # Formátovat data pro frontend
            response_data = {
                "profiles": {},
                "current_category": None,
                "summary": None,
                "config": _build_boiler_config_summary(boiler_coordinator),
            }

            # Aktuální profil
            if boiler_coordinator._current_profile:
                response_data["current_category"] = (
                    boiler_coordinator._current_profile.category
                )

            # Všechny profily
            current_profile = boiler_coordinator._current_profile
            if current_profile:
                response_data["summary"] = _build_profile_summary(
                    current_profile, boiler_coordinator
                )

            for category, profile in profiles.items():
                # Heatmap data: 7 dní × 24 hodin
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
    """API endpoint pro plán ohřevu."""

    url = "/api/oig_cloud/{entry_id}/boiler_plan"
    name = "api:oig_cloud:boiler_plan"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize view."""
        self.hass = hass

    async def get(self, request: web.Request, entry_id: str) -> web.Response:
        """Vrátí plán ohřevu."""
        try:
            # Získat boiler coordinator
            entry_data = self.hass.data.get(DOMAIN, {}).get(entry_id)
            if not entry_data:
                return web.json_response({"error": "Entry not found"}, status=404)

            boiler_coordinator = entry_data.get("boiler_coordinator")
            if not boiler_coordinator:
                return web.json_response(
                    {"error": "Boiler module not enabled"}, status=404
                )

            # Získat plán
            plan = boiler_coordinator._current_plan
            if not plan:
                return web.json_response({"error": "No plan available yet"}, status=404)

            now = dt_util.now()

            # Formátovat sloty
            slots_data = []
            for slot in plan.slots:
                slots_data.append(
                    {
                        "start": slot.start.isoformat(),
                        "end": slot.end.isoformat(),
                        "consumption_kwh": round(slot.avg_consumption_kwh, 3),
                        "confidence": round(slot.confidence, 2),
                        "recommended_source": slot.recommended_source.value,
                        "spot_price": slot.spot_price_kwh,
                        "alt_price": slot.alt_price_kwh,
                        "overflow_available": slot.overflow_available,
                    }
                )

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
    hass.http.register_view(BoilerProfileView(hass))
    hass.http.register_view(BoilerPlanView(hass))
    _LOGGER.info("Boiler API views registered")


def _build_boiler_config_summary(coordinator) -> dict:
    config = getattr(coordinator, "config", {}) or {}
    return {
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
        "config_mode": config.get(CONF_BOILER_CONFIG_MODE, "simple"),
    }


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
    return {
        "start": slot.start.isoformat(),
        "end": slot.end.isoformat(),
        "consumption_kwh": round(slot.avg_consumption_kwh, 3),
        "confidence": round(slot.confidence, 2),
        "recommended_source": slot.recommended_source.value,
        "spot_price": slot.spot_price_kwh,
        "alt_price": slot.alt_price_kwh,
        "overflow_available": slot.overflow_available,
    }


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
