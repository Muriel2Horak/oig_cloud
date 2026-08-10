"""
OIG Cloud - Home Assistant REST API Endpoints.

This module provides REST API endpoints for accessing large sensor data
that would otherwise bloat sensor attributes and cause memory issues.

Architecture:
- Sensors store ONLY summary data in attributes (< 2 KB)
- Full data stored in internal variables or via event profiling
- API endpoints expose full data on-demand via HTTP GET
- Dashboard/frontend fetches via /api/oig_cloud/<endpoint>

Endpoints:
- /api/oig_cloud/battery_forecast/<box_id>/timeline - Full timeline data (280 KB)
- /api/oig_cloud/battery_forecast/<box_id>/baseline - Baseline timeline (280 KB)
- /api/oig_cloud/spot_prices/<box_id>/intervals - 15min price intervals (155 KB)
- /api/oig_cloud/analytics/<box_id>/hourly - Hourly analytics (6.5 KB)
- /api/oig_cloud/consumption_profiles/<box_id> - 72h consumption prediction (~2 KB)
- /api/oig_cloud/balancing_decisions/<box_id> - 7d balancing pattern prediction (~15 KB)

Total API payload: ~739 KB
Total sensor attributes: ~17 KB (97% reduction!)

Author: OIG Cloud Integration
Date: 2025-10-28
"""

from __future__ import annotations

import logging
import math
import sys
import time
import asyncio
from datetime import timedelta
from typing import Any, Dict, Mapping, Optional

from aiohttp import web
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import aiohttp_client
from homeassistant.helpers.entity_component import EntityComponent
from homeassistant.helpers.http import HomeAssistantView
from homeassistant.util import dt as dt_util

from ..const import (
    BOILER_ENERGY_CONSTANT_KWH_L_C,
    CONF_AUTO_MODE_SWITCH,
    CONF_BOILER_COLD_INLET_TEMP_C,
    CONF_BOILER_TARGET_TEMP_C,
    CONF_BOILER_VOLUME_L,
    DEFAULT_BOILER_COLD_INLET_TEMP_C,
    DEFAULT_BOILER_TARGET_TEMP_C,
    DOMAIN,
)
from ..config_merge import merge_entry_options
from ..config_registry import (
    _load_released_pricelists,
    _pick_latest_snapshot,
    _snapshot_valid_from_date,
    FIELD_REGISTRY,
    coerce_value,
    fields_for_section,
    is_dual_tariff,
    registry_as_api_dict,
)
from ..battery_forecast.config import SimulatorConfig
from ..config.modules_validation import validate_modules_selection
from ..config.solar_rules import normalize_azimuth, validate_solar_effective
from ..config.solar_key_store import SOLAR_PRIVATE_FIELDS, SolarKeyStore
from ..ai.backends import (
    AiBackendError,
    PROMPT_ALLOWED_FIELDS,
    PROVIDERS,
    VALIDATE_CONFIG_SCHEMA,
    OpenAiCompatBackend,
    build_anonymous_prompt,
    validate_config_result,
    validate_config_selector_schema,
)
from ..ai.key_store import AiKeyStore
from ..ai.backoff import get_ai_backoff_state
from ..boiler.classifier import compute_ready_fraction
from ..boiler.const import BOILER_READY_TEMP_C
from ..boiler.planner_contract import PlannerReasonCode
from ..boiler.runtime import get_boiler_runtime
from ..entities.ai_status_sensor import OigCloudAiStatusSensor, SAFE_ERROR_CODES
from ..forecast.candidate_test import run_solar_candidate_test
from ..forecast.solar_test_limiter import get_solar_test_limiter
from ..onboarding import ONBOARDING_STEPS, OnboardingState

_LOGGER = logging.getLogger(__name__)

# API routes base
API_BASE = "/api/oig_cloud"
SENSOR_COMPONENT_NOT_FOUND = "Sensor component not found"
_SOLAR_TEST_ALLOWED_KEYS = frozenset(
    {
        "provider",
        "solar_forecast_api_key",
        "solcast_api_key",
        "solcast_site_id",
        "solar_forecast_latitude",
        "solar_forecast_longitude",
        "solar_forecast_string1_enabled",
        "solar_forecast_string1_kwp",
        "solar_forecast_string1_declination",
        "solar_forecast_string1_azimuth",
        "solar_forecast_string2_enabled",
        "solar_forecast_string2_kwp",
        "solar_forecast_string2_declination",
        "solar_forecast_string2_azimuth",
    }
)
_SOLAR_TEST_PROVIDERS = frozenset({"forecast_solar", "solcast"})

try:
    # Reuse the established chains on HA versions that provide ai_task. The
    # dev harness intentionally lacks that module, so keep a minimal local
    # fallback for direct-backend REST tests.
    from ..ai_task import MODEL_CHAINS
except ImportError:
    MODEL_CHAINS = {
        "groq": ("qwen/qwen3.6-27b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"),
        "nvidia": ("z-ai/glm-5.2",),
    }


_AI_STATUS_STATES = frozenset(
    {"not_configured", "verified", "unverified", "backing_off", "no_credits", "error"}
)
_AI_PROVIDERS = frozenset({"groq", "nvidia", "ai_task"})
_VALIDATE_CONFIG_OPTION_FIELDS = (
    "battery_comfort_soc_percent",
    "auto_mode_switch_enabled",
    "balancing_enabled",
    "balancing_interval_days",
    "balancing_hold_hours",
    "cheap_window_percentile",
    "expensive_percentile",
    "charge_rate_kw",
)


def _safe_ai_error_code(code: Any) -> str:
    return code if isinstance(code, str) and code in SAFE_ERROR_CODES else "error"


def _sensor_state_for_ai(
    hass: HomeAssistant, box_id: str
) -> tuple[str | None, Mapping[str, Any]]:
    """Read the already-computed Task 6 sensor state when HA has published it."""
    states = getattr(hass, "states", None)
    getter = getattr(states, "get", None)
    if callable(getter):
        state = getter(f"sensor.oig_{box_id}_ai_status")
        value = getattr(state, "state", None) if state is not None else None
        attrs = getattr(state, "attributes", {}) if state is not None else {}
        if value in _AI_STATUS_STATES and isinstance(attrs, Mapping):
            return value, attrs
    return None, {}


def _format_next_probe_at(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        # AiBackoffState stores a monotonic deadline. Convert it to the REST
        # contract's ISO-8601 wall-clock representation without exposing the
        # process-local monotonic value.
        seconds = max(0.0, float(value) - time.monotonic())
        return (dt_util.utcnow() + timedelta(seconds=seconds)).isoformat()
    return str(value)


def _ai_rest_state(
    hass: HomeAssistant,
    entry: ConfigEntry,
    box_id: str,
    api_state: Mapping[str, Any],
) -> Dict[str, Any]:
    """Return the sanitized GET shape, using the Task 6 sensor classification."""
    provider = api_state.get("provider")
    provider = provider if provider in _AI_PROVIDERS else ""
    status, attrs = _sensor_state_for_ai(hass, box_id)
    if status is None:
        # The test harness and HA startup can precede state publication. Use
        # the same sensor class and properties rather than a second classifier.
        sensor = OigCloudAiStatusSensor(hass, entry, box_id)
        sensor._api_state = dict(api_state)
        status = sensor.native_value
        attrs = sensor.extra_state_attributes

    last_error_code = attrs.get("last_error_code")
    if last_error_code not in SAFE_ERROR_CODES:
        last_error_code = None if last_error_code is None else "error"
    return {
        "provider": provider,
        "key_set": bool(api_state.get("key_set")),
        "verified": bool(api_state.get("verified")),
        "status": status if status in _AI_STATUS_STATES else "error",
        "last_error_code": last_error_code,
        "next_probe_at": _format_next_probe_at(attrs.get("next_probe_at")),
    }


def _mapping_value(source: Any, key: str, default: Any = None) -> Any:
    if isinstance(source, Mapping):
        return source.get(key, default)
    return getattr(source, key, default)


def _capacity_from_resolved_config(source: Any) -> float | None:
    if source is None:
        return None
    usable = _mapping_value(source, "usable_capacity_kwh")
    if usable is not None:
        try:
            return float(usable)
        except (TypeError, ValueError):
            pass
    maximum = _mapping_value(source, "max_capacity_kwh")
    if maximum is not None:
        try:
            maximum_value = float(maximum)
        except (TypeError, ValueError):
            return None
        minimum = _mapping_value(source, "min_capacity_kwh")
        if minimum is not None:
            try:
                resolved = SimulatorConfig(
                    max_capacity_kwh=maximum_value,
                    min_capacity_kwh=float(minimum),
                ).usable_capacity_kwh
            except (TypeError, ValueError):
                resolved = None
            if resolved is not None:
                return float(resolved)
        return maximum_value
    return None


def _resolved_capacity_kwh(
    hass: HomeAssistant, entry: ConfigEntry, coordinator: Any, box_id: str
) -> float | None:
    """Resolve capacity from the forecast config/live sensor, never entry options."""
    entry_data = getattr(hass, "data", {}).get(DOMAIN, {}).get(entry.entry_id, {})
    candidates = [
        getattr(coordinator, "battery_config", None),
        getattr(coordinator, "battery_forecast_config", None),
        getattr(coordinator, "_battery_config", None),
        entry_data.get("battery_config") if isinstance(entry_data, Mapping) else None,
    ]
    for candidate in candidates:
        capacity = _capacity_from_resolved_config(candidate)
        if capacity is not None:
            return capacity

    # The forecast sensor's methods use the live box capacity resolution
    # helpers. Build the same SimulatorConfig-derived usable value when that
    # sensor is present in the entry runtime data.
    forecast_sensors = (
        entry_data.get("battery_forecast_sensors", [])
        if isinstance(entry_data, Mapping)
        else []
    )
    if not forecast_sensors:
        component = getattr(hass, "data", {}).get("sensor")
        forecast_sensors = getattr(component, "entities", []) if component else []
    for sensor in forecast_sensors:
        if not getattr(sensor, "entity_id", "").endswith("_battery_forecast"):
            continue
        try:
            maximum = sensor._get_max_battery_capacity()
            minimum = sensor._get_min_battery_capacity()
        except Exception:  # noqa: BLE001 - live entity may be mid-unload
            continue
        if maximum is None:
            continue
        if minimum is not None:
            resolved = SimulatorConfig(
                max_capacity_kwh=float(maximum),
                min_capacity_kwh=float(minimum),
            ).usable_capacity_kwh
            if resolved is not None:
                return max(0.0, float(resolved))
        return float(maximum)
    return None


def _collect_anonymous_install(
    hass: HomeAssistant, entry: ConfigEntry, coordinator: Any
) -> Dict[str, Any]:
    """Collect only anonymous scalar inputs for validate_config."""
    options = getattr(entry, "options", {}) or {}
    collected: Dict[str, Any] = {}
    box_id = str(options.get("box_id", ""))

    capacity = _resolved_capacity_kwh(hass, entry, coordinator, box_id)
    if capacity is not None and "capacity_kwh" in PROMPT_ALLOWED_FIELDS:
        collected["capacity_kwh"] = capacity

    string1_enabled = bool(options.get("solar_forecast_string1_enabled", True))
    string2_enabled = bool(options.get("solar_forecast_string2_enabled", False))
    string1_kwp = options.get("solar_forecast_string1_kwp")
    string2_kwp = options.get("solar_forecast_string2_kwp")
    if string1_kwp is not None or string2_kwp is not None:
        collected["kwp"] = float(string1_kwp or 0) + float(string2_kwp or 0)

    declination1 = options.get("solar_forecast_string1_declination")
    azimuth1 = options.get("solar_forecast_string1_azimuth")
    declination2 = options.get("solar_forecast_string2_declination")
    azimuth2 = options.get("solar_forecast_string2_azimuth")
    same_orientation = (
        string1_enabled
        and string2_enabled
        and declination1 is not None
        and azimuth1 is not None
        and declination1 == declination2
        and azimuth1 == azimuth2
    )
    if same_orientation:
        if declination1 is not None:
            collected["declination"] = declination1
        if azimuth1 is not None:
            collected["azimuth"] = azimuth1

    for key in _VALIDATE_CONFIG_OPTION_FIELDS:
        if key in options and key in PROMPT_ALLOWED_FIELDS and options[key] is not None:
            collected[key] = options[key]

    # Keep this collector conservative as well as relying on the backend's
    # outgoing allow-list. This makes the REST boundary safe under test seams
    # that replace the backend method itself.
    return {key: value for key, value in collected.items() if key in PROMPT_ALLOWED_FIELDS}


async def _delegate_validate_config_ai_task(
    hass: HomeAssistant,
    entry: ConfigEntry,
    structure: Any,
    install: Mapping[str, Any],
) -> Any:
    """Delegate through the existing Task 9 entity helper."""
    from homeassistant.components.conversation import ChatLog

    from ..ai_task import GenDataTask, OigAiTaskEntity

    entity = OigAiTaskEntity(
        provider="ai_task",
        backend=None,
        install=install,
        entry_id=entry.entry_id,
        consent_cross_provider=bool(
            getattr(entry, "options", {}).get(
                "ai_consent_cross_provider_fallback", False
            )
        ),
    )
    entity.hass = hass
    task = GenDataTask(
        name="validate_config",
        instructions=build_anonymous_prompt("validate_config", install),
        structure=structure,
    )
    result = await entity._async_generate_data(task, ChatLog(hass, entry.entry_id))
    return getattr(result, "data", result)


def _record_ai_error(hass: HomeAssistant, entry: ConfigEntry, provider: str, code: str) -> None:
    entry_data = hass.data.setdefault(DOMAIN, {}).setdefault(entry.entry_id, {})
    if isinstance(entry_data, dict):
        entry_data["ai_last_error_code"] = code
    get_ai_backoff_state(hass).record_failure(entry.entry_id, provider)


def _record_ai_success(hass: HomeAssistant, entry: ConfigEntry, provider: str) -> None:
    entry_data = hass.data.setdefault(DOMAIN, {}).setdefault(entry.entry_id, {})
    if isinstance(entry_data, dict):
        entry_data.pop("ai_last_error_code", None)
    get_ai_backoff_state(hass).record_success(entry.entry_id, provider)


def _transform_timeline_for_api(timeline: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Transform timeline from internal format to API format.

    Internal format uses long descriptive keys:
    - solar_production_kwh → solar_kwh
    - consumption_kwh → load_kwh
    - grid_charge_kwh → stays same

    API format uses short keys expected by frontend.
    """
    transformed = []
    for point in timeline:
        new_point = point.copy()

        # Rename long keys to short keys
        if "solar_production_kwh" in new_point:
            new_point["solar_kwh"] = new_point.pop("solar_production_kwh")
        if "consumption_kwh" in new_point:
            new_point["load_kwh"] = new_point.pop("consumption_kwh")

        transformed.append(new_point)

    return transformed


def _find_entry_for_box(hass: HomeAssistant, box_id: str) -> Optional[ConfigEntry]:
    """Locate config entry that owns a given box_id."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        return None

    domain_data = hass.data.get(DOMAIN, {})
    for entry in entries:
        entry_data = domain_data.get(entry.entry_id, {})
        coordinator = entry_data.get("coordinator")
        if not coordinator or not hasattr(coordinator, "data"):
            continue
        box_map = getattr(coordinator, "data", {})
        if isinstance(box_map, dict) and box_id in box_map:
            return entry

    return None


def _solar_key_store_or_none(
    hass: HomeAssistant, entry_id: str
) -> Optional[SolarKeyStore]:
    """Return a solar key store when HA storage is available."""
    try:
        return SolarKeyStore(hass, entry_id)
    except AttributeError:
        if not hasattr(hass, "data") or not hasattr(
            getattr(hass, "config", None), "config_dir"
        ):
            return None
        raise


async def _load_precomputed_timeline(
    hass: HomeAssistant, box_id: str
) -> Optional[Dict[str, Any]]:
    from homeassistant.helpers.storage import Store

    store: Store = Store(hass, 1, f"oig_cloud.precomputed_data_{box_id}")
    try:
        loaded: Optional[Dict[str, Any]] = await store.async_load()
        return loaded if isinstance(loaded, dict) else None
    except Exception as storage_error:
        _LOGGER.warning(
            "Failed to read precomputed timeline data (fast path): %s",
            storage_error,
        )
        return None


def _build_precomputed_response(
    precomputed_data: Dict[str, Any], timeline_type: str, box_id: str
) -> Optional[web.Response]:
    last_update: Optional[str] = (precomputed_data or {}).get("last_update")
    stored_hybrid: Optional[list[Any]] = (precomputed_data or {}).get("timeline")
    if not stored_hybrid:
        stored_hybrid = (precomputed_data or {}).get("timeline_hybrid")
    if not stored_hybrid:
        return None  # pragma: no cover
    metadata = {
        "box_id": box_id,
        "last_update": last_update,
        "points_count": len(stored_hybrid),
        "size_kb": round(sys.getsizeof(str(stored_hybrid)) / 1024, 1),
    }
    response_data = {
        "plan": "hybrid",
        "active": stored_hybrid,
        "timeline": stored_hybrid,
        "metadata": metadata,
    }
    if timeline_type in ("baseline", "both"):
        response_data["baseline"] = []
    return web.json_response(response_data)


def _find_entity(component: EntityComponent, entity_id: str) -> Optional[Any]:
    for entity in component.entities:
        if entity.entity_id == entity_id:
            return entity
    return None


def _get_sensor_component(hass: HomeAssistant) -> Optional[EntityComponent]:
    entity_components = hass.data.get("entity_components")
    if isinstance(entity_components, dict):
        component = entity_components.get("sensor")
        if component:
            return component
    return hass.data.get("sensor")


async def _load_entity_precomputed(entity_obj: Any) -> Optional[Dict[str, Any]]:
    if not getattr(entity_obj, "_precomputed_store", None):
        return None
    try:
        return await entity_obj._precomputed_store.async_load() or {}
    except Exception as storage_error:
        _LOGGER.warning(
            "Failed to read precomputed timeline data: %s", storage_error
        )
        return None


def _build_timeline_response(
    *,
    timeline_type: str,
    box_id: str,
    active_timeline: list[Any],
    last_update: Any,
) -> web.Response:
    response_data: Dict[str, Any] = {}
    if timeline_type in ("active", "both"):
        response_data["active"] = active_timeline
    if timeline_type in ("baseline", "both"):
        response_data["baseline"] = []
    response_data["metadata"] = {
        "box_id": box_id,
        "last_update": str(last_update) if last_update else None,
        "points_count": len(active_timeline),
        "size_kb": round(sys.getsizeof(str(response_data)) / 1024, 1),
    }
    return web.json_response(response_data)


class OIGCloudBatteryTimelineView(HomeAssistantView):
    """API endpoint for battery forecast timeline data."""

    url = f"{API_BASE}/battery_forecast/{{box_id}}/timeline"
    name = "api:oig_cloud:battery_timeline"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        Get full battery forecast timeline data.

        Args:
            box_id: OIG box ID (e.g., "2206237016")

        Query params:
            ?type=active - Active timeline (with applied charging plan)
            ?type=baseline - Baseline timeline (no charging plan)
            ?type=both - Both timelines (default)

        Returns:
            JSON with timeline data:
            {
                "active": [...],  # 192 timeline points
                "baseline": [...],  # 192 timeline points
                "metadata": {
                    "box_id": "2206237016",
                    "last_update": "2025-10-28T12:00:00+01:00",
                    "points_count": 192,
                    "size_kb": 280
                }
            }
        """
        hass: HomeAssistant = request.app["hass"]
        request.query.get("mode", "hybrid").lower()
        timeline_type = request.query.get("type", "both")
        _ = request.query.get("plan", "hybrid").lower()  # legacy (single-planner)

        try:
            precomputed_data = await _load_precomputed_timeline(hass, box_id)
            if precomputed_data:
                response = _build_precomputed_response(
                    precomputed_data, timeline_type, box_id
                )
                if response is not None:
                    return response

            sensor_id = f"sensor.oig_{box_id}_battery_forecast"
            component: EntityComponent = hass.data.get("sensor")  # type: ignore

            if not component:
                return web.json_response(
                    {"error": "Sensor component not found and no precomputed data"},
                    status=503,
                )

            entity_obj = _find_entity(component, sensor_id)
            if not entity_obj:
                return web.json_response(
                    {"error": f"Sensor {sensor_id} not found and no precomputed data"},
                    status=503,
                )

            entity_precomputed = await _load_entity_precomputed(entity_obj)
            stored_active = None
            if entity_precomputed:
                stored_active = entity_precomputed.get(
                    "timeline"
                ) or entity_precomputed.get("timeline_hybrid")
                if stored_active:
                    _LOGGER.debug(
                        "API: Serving hybrid timeline from precomputed storage for %s",
                        box_id,
                    )

            active_timeline = stored_active or getattr(entity_obj, "_timeline_data", [])
            last_update = getattr(entity_obj, "_last_update", None)
            if stored_active and entity_precomputed:
                last_update = entity_precomputed.get("last_update", last_update)

            _LOGGER.debug(
                "API: Serving battery timeline for %s, type=%s, points=%s",
                box_id,
                timeline_type,
                len(active_timeline),
            )
            return _build_timeline_response(
                timeline_type=timeline_type,
                box_id=box_id,
                active_timeline=active_timeline,
                last_update=last_update,
            )

        except Exception as err:
            _LOGGER.error("Error serving battery timeline API: %s", err)
            return web.json_response({"error": str(err)}, status=500)


class OIGCloudSpotPricesView(HomeAssistantView):
    """API endpoint for spot price intervals (Phase 1.5)."""

    url = f"{API_BASE}/spot_prices/{{box_id}}/intervals"
    name = "api:oig_cloud:spot_prices"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        Get 15-minute spot price intervals.

        Args:
            box_id: OIG box ID (e.g., "2206237016")

        Query params:
            ?type=export - Export prices (without VAT/distribution)
            ?type=spot - Spot prices (with VAT/distribution)
            ?currency=czk - CZK prices only (default)
            ?currency=eur - EUR prices only
            ?currency=both - Both currencies

        Returns:
            JSON with price intervals:
            {
                "intervals": [
                    {"time": "2025-10-28T00:00:00", "price": 1.234},
                    ...
                ],
                "metadata": {
                    "box_id": "2206237016",
                    "type": "export",
                    "intervals_count": 192,
                    "last_update": "2025-10-28T12:00:00+01:00",
                    "currency": "czk",
                    "size_kb": 12
                }
            }
        """
        hass: HomeAssistant = request.app["hass"]
        price_type = request.query.get("type", "export")  # export or spot
        currency = request.query.get("currency", "czk")

        try:
            # Determine sensor ID based on type
            if price_type == "export":
                sensor_id = f"sensor.oig_{box_id}_export_price_current_15min"
            elif price_type == "spot":
                sensor_id = f"sensor.oig_{box_id}_spot_price_current_15min"
            else:
                return web.json_response(
                    {"error": f"Invalid type: {price_type}. Use 'export' or 'spot'."},
                    status=400,
                )

            component = _get_sensor_component(hass)

            if not component:
                return web.json_response(
                    {"error": SENSOR_COMPONENT_NOT_FOUND}, status=500
                )

            entity_obj = _find_entity(component, sensor_id)

            if not entity_obj:
                return web.json_response(
                    {"error": f"Sensor {sensor_id} not found"}, status=404
                )

            # Get spot data from sensor's internal variables
            spot_data = getattr(entity_obj, "_spot_data_15min", {})
            last_update = getattr(entity_obj, "_last_update", None)

            # Extract intervals
            prices_15m = spot_data.get("prices15m_czk_kwh", {})
            intervals = [
                {"time": time_key, "price": price}
                for time_key, price in sorted(prices_15m.items())
            ]

            # Build response
            metadata: dict[str, Any] = {
                "box_id": box_id,
                "type": price_type,
                "intervals_count": len(intervals),
                "last_update": last_update.isoformat() if last_update else None,
                "currency": currency,
            }
            response_data: dict[str, Any] = {
                "intervals": intervals,
                "metadata": metadata,
            }

            # Add size info
            import sys

            metadata["size_kb"] = round(
                sys.getsizeof(str(response_data)) / 1024, 1
            )

            _LOGGER.debug(
                f"API: Serving {price_type} prices for {box_id}, "
                f"currency={currency}, intervals={len(intervals)}"
            )

            return web.json_response(response_data)

        except Exception as e:
            _LOGGER.error(f"Error serving spot prices API: {e}")
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudAnalyticsView(HomeAssistantView):
    """API endpoint for hourly analytics data."""

    url = f"{API_BASE}/analytics/{{box_id}}/hourly"
    name = "api:oig_cloud:analytics"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        Get hourly analytics data.

        Args:
            box_id: OIG box ID (e.g., "2206237016")

        Returns:
            JSON with hourly analytics:
            {
                "hourly_prices": [...],  # 48 hours of data
                "metadata": {
                    "box_id": "2206237016",
                    "hours_count": 48,
                    "last_update": "2025-10-28T12:00:00+01:00",
                    "size_kb": 6.5
                }
            }
        """
        hass: HomeAssistant = request.app["hass"]

        try:
            # Find analytics sensor
            sensor_id = f"sensor.oig_{box_id}_hourly_analytics"
            component = _get_sensor_component(hass)

            if not component:
                return web.json_response(
                    {"error": SENSOR_COMPONENT_NOT_FOUND}, status=500
                )

            entity_obj = _find_entity(component, sensor_id)

            if not entity_obj:
                return web.json_response(
                    {"error": f"Sensor {sensor_id} not found"}, status=404
                )

            # Get hourly data
            hourly_prices = getattr(entity_obj, "_hourly_prices", [])
            last_update = getattr(entity_obj, "_last_update", None)

            # Build response
            import sys

            response_data = {
                "hourly_prices": hourly_prices,
                "metadata": {
                    "box_id": box_id,
                    "hours_count": len(hourly_prices),
                    "last_update": str(last_update) if last_update else None,
                    "size_kb": round(sys.getsizeof(str(hourly_prices)) / 1024, 1),
                },
            }

            _LOGGER.debug(
                "API: Serving analytics for %s, hours=%s",
                box_id,
                len(hourly_prices),
            )

            return web.json_response(response_data)

        except Exception as e:
            _LOGGER.error(f"Error serving analytics API: {e}")
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudConsumptionProfilesView(HomeAssistantView):
    """API endpoint for 72h consumption profiles data."""

    url = f"{API_BASE}/consumption_profiles/{{box_id}}"
    name = "api:oig_cloud:consumption_profiles"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        Get current 72h consumption profile and prediction.

        Args:
            box_id: OIG box ID (e.g., "2206237016")

        Returns:
            JSON with profile data:
            {
                "current_prediction": {
                    "matched_profile_created": "2025-10-20T00:30:00+01:00",
                    "similarity_score": 0.856,
                    "predicted_consumption_24h": [...],  # 24 hourly values
                    "predicted_total_kwh": 28.45,
                    "predicted_avg_kwh": 1.185
                },
                "metadata": {
                    "box_id": "2206237016",
                    "last_profile_created": "2025-10-28T00:30:00+01:00",
                    "profiling_status": "ok",
                    "data_hash": "a3f2b1c4"
                }
            }
        """
        hass: HomeAssistant = request.app["hass"]

        try:
            # Find sensor entity
            sensor_id = f"sensor.oig_{box_id}_adaptive_load_profiles"
            component = _get_sensor_component(hass)

            if not component:
                return web.json_response(
                    {"error": SENSOR_COMPONENT_NOT_FOUND}, status=500
                )

            entity_obj = _find_entity(component, sensor_id)

            if not entity_obj:
                return web.json_response(
                    {"error": f"Sensor {sensor_id} not found"}, status=404
                )

            # Get prediction from sensor
            current_prediction = entity_obj.get_current_prediction()

            response_data = {
                "current_prediction": current_prediction,
                "metadata": {
                    "box_id": box_id,
                    "last_profile_created": getattr(
                        entity_obj, "_last_profile_created", None
                    ),
                    "profiling_status": getattr(
                        entity_obj, "_profiling_status", "unknown"
                    ),
                    "data_hash": getattr(entity_obj, "_data_hash", None),
                },
            }

            _LOGGER.debug(f"API: Serving consumption profiles for {box_id}")

            return web.json_response(response_data)

        except Exception as e:
            _LOGGER.error(f"Error serving consumption profiles API: {e}")
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudBalancingDecisionsView(HomeAssistantView):
    """API endpoint for balancing decision pattern data."""

    url = f"{API_BASE}/balancing_decisions/{{box_id}}"
    name = "api:oig_cloud:balancing_decisions"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        GET /api/oig_cloud/balancing_decisions/{box_id}

        Returns balancing decision pattern prediction based on 7d profiling.

        Response structure:
        {
            "current_prediction": {
                "matched_profile_created": "2025-10-27T00:30:00",
                "similarity_score": 0.87,
                "predicted_120h_data": [...],  # 120 hours of predicted data
                "predicted_balancing_hours": 18,
                "predicted_balancing_percentage": 15.0,
                "predicted_avg_spot_price": 2.35,
                "matched_profile_balancing_hours": 22
            },
            "metadata": {
                "box_id": "CBB00000123",
                "last_profile_created": "2025-10-28T00:30:00",
                "profiling_status": "ok",
                "data_source": "7d_balancing_profiling"
            }
        }
        """
        try:
            hass: HomeAssistant = getattr(self, "hass", request.app["hass"])
            # Find battery_balancing sensor entity
            entity_id = f"sensor.oig_{box_id}_battery_balancing"
            entity_component = _get_sensor_component(hass)

            if not entity_component:
                return web.json_response(
                    {"error": SENSOR_COMPONENT_NOT_FOUND}, status=404
                )

            entity_obj = _find_entity(entity_component, entity_id)

            if not entity_obj:
                return web.json_response(
                    {"error": f"Battery balancing sensor {entity_id} not found"},
                    status=404,
                )

            # Get current prediction from sensor
            current_prediction = None
            if hasattr(entity_obj, "_find_best_matching_balancing_pattern"):
                try:
                    current_prediction = await entity_obj._find_best_matching_balancing_pattern()  # type: ignore
                except Exception as e:
                    _LOGGER.warning(f"Failed to get balancing pattern: {e}")

            # Prepare response
            metadata = {
                "box_id": box_id,
                "last_profile_created": (
                    entity_obj._last_balancing_profile_created.isoformat()  # type: ignore
                    if hasattr(entity_obj, "_last_balancing_profile_created")
                    and entity_obj._last_balancing_profile_created  # type: ignore
                    else None
                ),
                "profiling_status": (
                    entity_obj._balancing_profiling_status  # type: ignore
                    if hasattr(entity_obj, "_balancing_profiling_status")
                    else "unknown"
                ),
                "data_source": "7d_balancing_profiling",
            }

            response_data = {
                "current_prediction": current_prediction,
                "metadata": metadata,
            }

            _LOGGER.debug(f"API: Serving balancing decisions for {box_id}")

            return web.json_response(response_data)

        except Exception as e:
            _LOGGER.error(f"Error serving balancing decisions API: {e}")
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudUnifiedCostTileView(HomeAssistantView):
    """
    API endpoint for Unified Cost Tile data.

    Phase V2: PLAN_VS_ACTUAL_UX_REDESIGN_V2.md - Fáze 1
    Consolidates 2 cost tiles into one with today/yesterday/tomorrow context.
    """

    url = f"{API_BASE}/battery_forecast/{{box_id}}/unified_cost_tile"
    name = "api:oig_cloud:unified_cost_tile"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        Get unified cost tile data.

        Returns:
            JSON with today/yesterday/tomorrow cost data:
            {
                "today": {
                    "plan_total_cost": 45.50,
                    "actual_total_cost": 42.30,
                    "delta": -3.20,
                    "performance": "better",
                    "completed_intervals": 32,
                    "total_intervals": 96,
                    "progress_pct": 33,
                    "eod_prediction": {
                        "predicted_total": 128.50,
                        "vs_plan": -4.50,
                        "confidence": "medium"
                    }
                },
                "yesterday": {
                    "plan_total_cost": 125.00,
                    "actual_total_cost": 118.50,
                    "delta": -6.50,
                    "performance": "better"
                },
                "tomorrow": {
                    "plan_total_cost": 135.00
                }
            }
        """
        hass: HomeAssistant = request.app["hass"]
        _ = request.query.get("plan") or request.query.get("mode") or "hybrid"  # legacy
        mode = "hybrid"

        try:
            precomputed_data = await _load_precomputed_data(hass, box_id)
            response_payload = _build_precomputed_tile_payload(
                precomputed_data, mode
            )
            if response_payload is not None:
                return web.json_response(response_payload)

            entity_obj = _resolve_battery_forecast_entity(hass, box_id)
            if entity_obj is None:
                return _json_error(
                    "Sensor component not found, and no precomputed data available",
                    status=503,
                )

            comparison_summary = (
                precomputed_data.get("cost_comparison") if precomputed_data else None
            )
            tile_data = await _build_unified_cost_tile_on_demand(
                entity_obj, box_id
            )
            if tile_data is None:
                return _json_error("Failed to build unified cost tile data", status=500)

            if comparison_summary and isinstance(tile_data, dict):
                tile_data = dict(tile_data)
                tile_data["comparison"] = comparison_summary

            _LOGGER.debug(
                "API: Serving unified cost tile for %s, today_delta=%.2f Kč",
                box_id,
                tile_data.get("today", {}).get("delta", 0),
            )

            return web.json_response(tile_data)

        except Exception as e:
            _LOGGER.error(f"Error serving unified cost tile API: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


async def _load_precomputed_data(
    hass: HomeAssistant, box_id: str
) -> Optional[Dict[str, Any]]:
    from homeassistant.helpers.storage import Store

    store: Store[Dict[str, Any]] = Store(hass, 1, f"oig_cloud.precomputed_data_{box_id}")
    try:
        return await store.async_load()
    except Exception:
        return None


def _build_precomputed_tile_payload(
    precomputed_data: Optional[Dict[str, Any]], mode: str
) -> Optional[Dict[str, Any]]:
    if not precomputed_data:
        return None
    tile_key = _pick_unified_cost_tile_key(precomputed_data)
    tile_payload = precomputed_data.get(tile_key)
    if not tile_payload:
        return None
    response_payload = dict(tile_payload)
    comparison_summary = precomputed_data.get("cost_comparison")
    if comparison_summary and isinstance(response_payload, dict):
        response_payload["comparison"] = comparison_summary
    _LOGGER.debug(
        "API: Serving %s unified cost tile from precomputed storage",
        mode,
    )
    return response_payload


def _pick_unified_cost_tile_key(precomputed_data: Dict[str, Any]) -> str:
    if precomputed_data.get("unified_cost_tile"):
        return "unified_cost_tile"
    return "unified_cost_tile_hybrid"


def _resolve_battery_forecast_entity(
    hass: HomeAssistant, box_id: str
) -> Optional[Any]:
    sensor_id = f"sensor.oig_{box_id}_battery_forecast"
    component = _get_sensor_component(hass)
    if not component:
        return None
    return _find_entity(component, sensor_id)


async def _build_unified_cost_tile_on_demand(
    entity_obj: Any, box_id: str
) -> Optional[Dict[str, Any]]:
    if not hasattr(entity_obj, "build_unified_cost_tile"):
        _LOGGER.error("API: build_unified_cost_tile method not found for %s", box_id)
        raise AttributeError(
            f"build_unified_cost_tile method not found for {box_id}"
        )
    try:
        _LOGGER.info("API: Building unified cost tile for %s...", box_id)
        tile_data = await entity_obj.build_unified_cost_tile()
        _LOGGER.info(
            "API: Unified cost tile built successfully: %s",
            list(tile_data.keys()) if isinstance(tile_data, dict) else type(tile_data),
        )
        return tile_data
    except Exception as build_error:
        _LOGGER.error(
            "API: Error in build_unified_cost_tile() for %s: %s",
            box_id,
            build_error,
            exc_info=True,
        )
        return None


def _json_error(message: str, *, status: int) -> web.Response:
    return web.json_response({"error": message}, status=status)


def _filter_detail_tabs(detail_tabs: Dict[str, Any], tab: Optional[str]) -> Dict[str, Any]:
    if tab and tab in ["yesterday", "today", "tomorrow"]:
        return {tab: detail_tabs.get(tab, {})}
    return {
        "yesterday": detail_tabs.get("yesterday", {}),
        "today": detail_tabs.get("today", {}),
        "tomorrow": detail_tabs.get("tomorrow", {}),
    }


async def _load_detail_tabs_from_store(
    hass: HomeAssistant, box_id: str
) -> Optional[Dict[str, Any]]:
    from homeassistant.helpers.storage import Store

    store: Store = Store(hass, 1, f"oig_cloud.precomputed_data_{box_id}")
    try:
        loaded: Optional[Dict[str, Any]] = await store.async_load()
        if not isinstance(loaded, dict):
            return None
        return loaded.get("detail_tabs") or loaded.get("detail_tabs_hybrid")
    except Exception as storage_error:
        _LOGGER.warning(
            "Failed to read precomputed detail tabs data (fast path): %s",
            storage_error,
        )
        return None


async def _load_detail_tabs_from_entity_store(
    entity_obj: Any,
    box_id: str,
    tab: Optional[str],
    plan_key: str,
) -> Optional[Dict[str, Any]]:
    if not (hasattr(entity_obj, "_precomputed_store") and entity_obj._precomputed_store):
        return None
    try:
        precomputed_data = await entity_obj._precomputed_store.async_load()
        if not precomputed_data:
            return None
        detail_tabs = precomputed_data.get("detail_tabs") or precomputed_data.get(
            "detail_tabs_hybrid"
        )
        if not detail_tabs:
            _LOGGER.debug("API: detail_tabs missing in precomputed store")
            return None
        last_update_raw = precomputed_data.get("last_update")
        last_update = dt_util.parse_datetime(last_update_raw) if last_update_raw else None
        age_info = (
            f"age={(dt_util.now() - last_update).total_seconds():.0f}s"
            if last_update is not None
            else "unknown age"
        )
        _LOGGER.debug(
            f"API: Serving detail tabs ({plan_key}) from precomputed storage for {box_id}, "
            f"tab_filter={tab}, {age_info}"
        )
        return detail_tabs
    except Exception as storage_error:
        _LOGGER.warning(
            f"Failed to read precomputed data ({plan_key}): {storage_error}, falling back to live build"
        )
        return None


async def _load_detail_tabs_on_demand(
    entity_obj: Any, box_id: str, tab: Optional[str], plan_key: str
) -> Dict[str, Any]:
    if not hasattr(entity_obj, "build_detail_tabs"):
        raise AttributeError("build_detail_tabs method not found")
    try:
        return await entity_obj.build_detail_tabs(tab=tab, plan=plan_key)
    except Exception as build_error:
        _LOGGER.error(
            f"API: Error in build_detail_tabs() for {box_id}: {build_error}",
            exc_info=True,
        )
        raise


class OIGCloudDetailTabsView(HomeAssistantView):
    """
    API endpoint for Detail Tabs - mode-aggregated battery forecast data.

    Phase 3.0: Detail Tabs API
    Provides aggregated data by CBB modes instead of 15min intervals.
    """

    url = f"{API_BASE}/battery_forecast/{{box_id}}/detail_tabs"
    name = "api:oig_cloud:detail_tabs"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        Get Detail Tabs data - aggregated by CBB modes.

        Args:
            box_id: OIG box ID (e.g., "2206237016")

        Query params:
            ?tab=yesterday|today|tomorrow - Filter specific tab (optional)

        Returns:
            JSON with mode-aggregated data:
            {
                "yesterday": {
                    "date": "2025-11-05",
                    "mode_blocks": [
                        {
                            "mode_historical": "HOME I",
                            "mode_planned": "HOME I",
                            "mode_match": true,
                            "status": "completed",
                            "start_time": "00:00",
                            "end_time": "02:30",
                            "interval_count": 10,
                            "duration_hours": 2.5,
                            "cost_historical": 12.50,
                            "cost_planned": 12.00,
                            "cost_delta": 0.50,
                            "battery_soc_start": 50.0,
                            "battery_soc_end": 45.2,
                            "solar_total_kwh": 0.0,
                            "consumption_total_kwh": 1.8,
                            "grid_import_total_kwh": 1.8,
                            "grid_export_total_kwh": 0.0,
                            "adherence_pct": 100
                        }
                    ],
                    "summary": {
                        "total_cost": 28.50,
                        "overall_adherence": 65,
                        "mode_switches": 8
                    }
                },
                "today": {...},
                "tomorrow": {...}
            }
        """
        hass: HomeAssistant = request.app["hass"]
        tab = request.query.get("tab", None)
        # Always use hybrid plan (autonomy removed)
        plan_key = "hybrid"

        try:
            detail_tabs = await _load_detail_tabs_from_store(hass, box_id)
            if detail_tabs:
                return web.json_response(_filter_detail_tabs(detail_tabs, tab))

            sensor_id = f"sensor.oig_{box_id}_battery_forecast"
            component = _get_sensor_component(hass)
            if not component:
                return web.json_response(
                    {"error": SENSOR_COMPONENT_NOT_FOUND}, status=503
                )
            entity_obj = _find_entity(component, sensor_id)
            if not entity_obj:
                return web.json_response(
                    {"error": f"Sensor {sensor_id} not found"}, status=404
                )

            detail_tabs = await _load_detail_tabs_from_entity_store(
                entity_obj, box_id, tab, plan_key
            )
            if detail_tabs:
                return web.json_response(_filter_detail_tabs(detail_tabs, tab))

            detail_tabs = await _load_detail_tabs_on_demand(
                entity_obj, box_id, tab, plan_key
            )

            _LOGGER.debug(
                f"API: Serving detail tabs for {box_id}, "
                f"tab_filter={tab}, "
                f"tabs_count={len(detail_tabs)}"
            )

            return web.json_response(detail_tabs)

        except Exception as e:
            _LOGGER.error(f"Error serving detail tabs API: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudPlannerSettingsView(HomeAssistantView):
    """API endpoint to read/update planner settings."""

    url = f"{API_BASE}/battery_forecast/{{box_id}}/planner_settings"
    name = "api:oig_cloud:planner_settings"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        hass: HomeAssistant = request.app["hass"]
        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)

        value = entry.options.get(CONF_AUTO_MODE_SWITCH, False)
        # Always use hybrid plan (autonomy removed)
        return web.json_response(
            {
                "auto_mode_switch_enabled": value,
                "planner_mode": "hybrid",
            }
        )

    async def post(self, request: web.Request, box_id: str) -> web.Response:
        """Update planner settings (admin-only)."""
        hass = request.app["hass"]
        # Same fail-closed gate as OIGCloudAiView (:1752-1765): read
        # request["hass_user"] first (real HA convention — the auth middleware
        # sets it on the request mapping, not on the application), and only
        # fall back to request.app[...] for the test harness's DummyRequest
        # which mirrors the convention only partially.
        user = request.get("hass_user") if hasattr(request, "get") else None
        if user is None and hasattr(request, "app"):
            user = request.app.get("hass_user")

        # Admin-only kontrola
        if not user or not user.is_admin:
            return web.json_response({"error": "Admin only"}, status=403)

        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)

        try:
            payload = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON payload"}, status=400)

        if not isinstance(payload, dict):
            return web.json_response({"error": "Invalid payload"}, status=400)

        current_enabled = entry.options.get(CONF_AUTO_MODE_SWITCH, False)

        desired_enabled = current_enabled

        if "auto_mode_switch_enabled" in payload:
            desired_enabled = bool(payload.get("auto_mode_switch_enabled"))

        # Always use hybrid plan (autonomy removed)
        if desired_enabled == current_enabled:
            return web.json_response(
                {
                    "auto_mode_switch_enabled": current_enabled,
                    "planner_mode": "hybrid",
                    "updated": False,
                }
            )

        new_options = dict(entry.options)
        new_options[CONF_AUTO_MODE_SWITCH] = desired_enabled
        hass.config_entries.async_update_entry(entry, options=new_options)
        _LOGGER.info(
            "Planner settings updated for %s: auto_mode_switch_enabled=%s",
            box_id,
            desired_enabled,
        )

        return web.json_response(
            {
                "auto_mode_switch_enabled": desired_enabled,
                "planner_mode": "hybrid",
                "updated": True,
            }
        )


# ============================================================================
# Module config (dashboard settings wizards)
# ============================================================================


class OIGCloudModuleConfigView(HomeAssistantView):
    """Read/update per-module options from the dashboard settings UI.

    GET  -> current values of all registry fields, grouped by section
            (secrets masked to a boolean *_set flag).
    POST -> {"section": "battery", "values": {...}} — validates against the
            registry and updates the config entry (admin only); the entry's
            update listener applies/reloads as needed.
    """

    url = f"{API_BASE}/{{box_id}}/module_config"
    name = "api:oig_cloud:module_config"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        # Fail CLOSED: same sensitive surface as POST (:1235-1237) — home GPS
        # coordinates and the Solcast site id are not for every authenticated
        # household account.
        user = request.get("hass_user") or request.app.get("hass_user")
        if not user or not user.is_admin:
            return web.json_response({"error": "Admin only"}, status=403)

        hass: HomeAssistant = request.app["hass"]
        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)

        opts = dict(entry.options)
        out: dict[str, Any] = {}
        solar_store = _solar_key_store_or_none(hass, entry.entry_id)
        solar_private_state = (
            await solar_store.async_private_field_state()
            if solar_store is not None
            else {}
        )
        for section in (
            "basic", "modules", "battery", "solar", "boiler", "pricing",
            "pricing_supplier",
        ):
            sec: dict[str, Any] = {}
            for key, field in fields_for_section(section).items():
                if section == "solar" and key in SOLAR_PRIVATE_FIELDS:
                    sec[f"{key}_set"] = solar_private_state.get(f"{key}_set", False)
                    continue
                if field.secret:
                    sec[f"{key}_set"] = bool(opts.get(key))
                    continue
                sec[key] = opts.get(key, field.default)
            out[section] = sec
        return web.json_response(out)

    async def post(self, request: web.Request, box_id: str) -> web.Response:
        hass: HomeAssistant = request.app["hass"]
        # Fail CLOSED: module_config is the most sensitive write surface
        # (API keys, GPS, entities, planner/boiler params + reload).
        user = request.get("hass_user") or request.app.get("hass_user")
        if not user or not user.is_admin:
            return web.json_response({"error": "Admin only"}, status=403)

        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)

        try:
            payload = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON payload"}, status=400)

        section = payload.get("section") if isinstance(payload, dict) else None
        values = payload.get("values") if isinstance(payload, dict) else None
        section_fields = fields_for_section(section or "")
        if not section_fields or not isinstance(values, dict):
            return web.json_response(
                {"error": "Expected {section, values} with a known section"},
                status=400,
            )

        updates: dict[str, Any] = {}
        private_updates: dict[str, Any] = {}
        errors: dict[str, str] = {}
        for key, value in values.items():
            field = section_fields.get(key)
            if field is None:
                errors[key] = "unknown field"
                continue
            # Empty secret = keep current value
            if field.secret and value == "":
                continue
            if key in ("solar_forecast_string1_azimuth", "solar_forecast_string2_azimuth"):
                try:
                    value = normalize_azimuth(value)
                except (TypeError, ValueError):
                    errors[key] = "invalid_azimuth"
                    continue
            try:
                coerced = coerce_value(field, value)
            except (ValueError, OverflowError) as err:
                # OverflowError is defensive: coerce_value maps it to ValueError,
                # but a numeric edge case must never escape as a 500.
                errors[key] = str(err)
                continue
            if section == "solar" and key in SOLAR_PRIVATE_FIELDS:
                private_updates[key] = coerced
            else:
                updates[key] = coerced

        # Cross-field solar rules: shared with the options flow (U3/U6). The
        # validator must see the EFFECTIVE config — stored options merged with
        # the incoming updates — otherwise "blank secret = keep current" above
        # makes a half-finished provider switch look valid.
        solar_store: Optional[SolarKeyStore] = (
            _solar_key_store_or_none(hass, entry.entry_id)
            if section == "solar"
            else None
        )
        effective_provider: Optional[str] = None
        if section == "solar" and not errors:
            effective_provider = str(
                updates.get(
                    "solar_forecast_provider",
                    entry.options.get("solar_forecast_provider", "forecast_solar"),
                )
            )
            private_effective = (
                await solar_store.async_credentials_for_validation(effective_provider)
                if solar_store is not None
                else {}
            )
            provider_private_fields = (
                ("solar_forecast_api_key",)
                if effective_provider == "forecast_solar"
                else ("solcast_api_key", "solcast_site_id")
            )
            private_effective.update(
                {
                    key: value
                    for key, value in private_updates.items()
                    if key in provider_private_fields
                }
            )
            effective = {**dict(entry.options), **private_effective, **updates}
            errors.update(validate_solar_effective(effective))

        # Cross-field module rules: shared with the onboarding wizard (fix-C
        # live finding — REST accepted enable_battery_prediction=true with
        # enable_solar_forecast=false, a combination the wizard blocks). Same
        # effective-config shape as the solar validation above, so a partial
        # module toggle can't slip past REST while the wizard would reject it.
        if section == "modules" and not errors:
            effective = {**dict(entry.options), **updates}
            errors.update(validate_modules_selection(effective))

        if errors:
            return web.json_response({"error": "validation", "fields": errors}, status=400)
        if section == "solar" and private_updates and solar_store is None:
            return web.json_response(
                {"error": "Solar credential storage unavailable"},
                status=500,
            )
        if not updates and not private_updates:
            return web.json_response({"updated": False})

        # RCA-R3 (F1 U4): dual-ness is derived from confirmed_distribution_tariff,
        # never asked of the user directly, but PERSISTED under the legacy
        # dual_tariff_enabled key so existing pricing consumers keep working.
        if section == "pricing" and "confirmed_distribution_tariff" in updates:
            updates["dual_tariff_enabled"] = is_dual_tariff(
                updates["confirmed_distribution_tariff"]
            )

        previous_provider = entry.options.get("solar_forecast_provider", "forecast_solar")
        wrote = merge_entry_options(hass, entry, updates)
        if section == "solar":
            if (
                solar_store is not None
                and isinstance(effective_provider, str)
                and effective_provider != previous_provider
            ):
                await solar_store.async_clear_inactive(effective_provider)
        if section == "solar" and private_updates and solar_store is not None:
            if "solar_forecast_api_key" in private_updates:
                await solar_store.async_set_candidate(
                    "forecast_solar",
                    {"solar_forecast_api_key": private_updates["solar_forecast_api_key"]},
                )
            solcast_updates = {
                key: private_updates[key]
                for key in ("solcast_api_key", "solcast_site_id")
                if key in private_updates
            }
            if solcast_updates:
                await solar_store.async_set_candidate("solcast", solcast_updates)
            wrote = True
        _LOGGER.info(
            "Module config updated for %s (%s): %s",
            box_id,
            section,
            {
                k: ("***" if FIELD_REGISTRY[k].secret or k in SOLAR_PRIVATE_FIELDS else v)
                for k, v in {**updates, **private_updates}.items()
            },
        )
        return web.json_response(
            {"updated": wrote, "keys": sorted({**updates, **private_updates})}
        )


class OIGCloudConfigRegistryView(HomeAssistantView):
    """Read-only endpoint exposing the canonical config field registry."""

    url = f"{API_BASE}/{{box_id}}/config_registry"
    name = "api:oig_cloud:config_registry"
    requires_auth = True

    def _require_admin(self, request: web.Request) -> Optional[web.Response]:
        user = request.get("hass_user") if hasattr(request, "get") else None
        if user is None and hasattr(request, "app"):
            user = request.app.get("hass_user")
        if not user or not user.is_admin:
            return web.json_response({"error": "Admin only"}, status=403)
        return None

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        denied = self._require_admin(request)
        if denied is not None:
            return denied
        hass: HomeAssistant = request.app["hass"]
        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)

        fields = registry_as_api_dict()
        sections = sorted({spec["section"] for spec in fields.values()})
        return web.json_response({"fields": fields, "sections": sections})


class OIGCloudPricelistsView(HomeAssistantView):
    """Read-only endpoint exposing released pricelist rates for onboarding."""

    url = f"{API_BASE}/{{box_id}}/pricelists"
    name = "api:oig_cloud:pricelists"
    requires_auth = True

    def _require_admin(self, request: web.Request) -> Optional[web.Response]:
        user = request.get("hass_user") if hasattr(request, "get") else None
        if user is None and hasattr(request, "app"):
            user = request.app.get("hass_user")
        if not user or not user.is_admin:
            return web.json_response({"error": "Admin only"}, status=403)
        return None

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        denied = self._require_admin(request)
        if denied is not None:
            return denied
        hass: HomeAssistant = request.app["hass"]
        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)

        try:
            payload = _load_released_pricelists()
            snapshot = _pick_latest_snapshot(payload)
            snapshot_distributors = snapshot.get("distributors", payload["distributors"])
            if not isinstance(snapshot_distributors, dict):
                raise RuntimeError("pricing snapshot distributors must be a dict")
            distributors = {
                str(distributor): dict(rates) if isinstance(rates, dict) else {}
                for distributor, rates in snapshot_distributors.items()
            }
            tariff_set: set[str] = set()
            for rates in distributors.values():
                if isinstance(rates, dict):
                    tariff_set.update(rates.keys())
            tariffs = tuple(sorted(str(tariff) for tariff in tariff_set))

            options = getattr(entry, "options", {})
            selected_distributor = options.get(
                "confirmed_distribution_distributor", ""
            ) or FIELD_REGISTRY["confirmed_distribution_distributor"].default
            selected_tariff = options.get("confirmed_distribution_tariff", "") or FIELD_REGISTRY["confirmed_distribution_tariff"].default

            if selected_distributor not in distributors:
                selected_distributor = sorted(distributors.keys())[0] if distributors else ""
            selected_rates = distributors.get(selected_distributor, {}) if selected_distributor else {}
            if selected_tariff not in selected_rates:
                selected_tariff = tuple(sorted(selected_rates.keys()))[0] if selected_rates else ""

            selected_rate = selected_rates.get(selected_tariff, {}) if selected_tariff else {}
            if not isinstance(selected_rate, dict):
                selected_rate = {}

            valid_from = snapshot.get("valid_from")
            snapshot_date = _snapshot_valid_from_date(snapshot)
            year = snapshot_date.year if snapshot_date is not None else None
            stale_warning = year is not None and year < dt_util.utcnow().year

            # Owner D57d bug: the wizard's suggested distribution fee dropped
            # system_services/electricity_tax and used dist_leg only — those
            # per-MWh regulated charges are distributor-independent (top-level
            # `regulated_components`, not per-snapshot), so pass the section
            # through as-is; older/synthetic payloads without it degrade to {}.
            regulated_components = payload.get("regulated_components", {})
            if not isinstance(regulated_components, dict):
                regulated_components = {}

            return web.json_response(
                {
                    "distributors": distributors,
                    "regulated_components": regulated_components,
                    "tariffs": list(tariffs),
                    "selected_distributor": selected_distributor,
                    "selected_tariff": selected_tariff,
                    "confirmed_distribution_price_incl_vat": float(
                        selected_rate.get("price_incl_vat", FIELD_REGISTRY["confirmed_distribution_price_incl_vat"].default)
                    ),
                    "confirmed_distribution_price_excl_vat": float(
                        selected_rate.get("price_excl_vat", FIELD_REGISTRY["confirmed_distribution_price_excl_vat"].default)
                    ),
                    "confirmed_distribution_unit": str(
                        selected_rate.get("unit", FIELD_REGISTRY["confirmed_distribution_unit"].default or "Kc/A/mesic")
                    ),
                    "year": year,
                    "valid_from": valid_from,
                    "stale_warning": stale_warning,
                }
            )

        except (OSError, RuntimeError) as err:
            _LOGGER.error("Failed to serve pricelists for %s: %s", box_id, err)
            return web.json_response({"error": "Pricelist data unavailable"}, status=503)


class OIGCloudAiView(HomeAssistantView):
    """Admin-only REST surface for the per-entry AI provider key (F1-DESIGN §3, P2).

    GET  -> {"provider", "key_set", "verified"} only — never the key, never its prefix.
    POST -> {"provider", "api_key"} — cheap LOCAL prefix check first (SCOPE-REVISION #7),
            then a live probe via OpenAiCompatBackend, and ONLY on verification success
            is the candidate promoted to AiKeyStore (R11.3) — a provider outage must
            leave a previously stored, verified key intact.
    Both surfaces fail closed (403 for non-admin) — mirrors module_config POST (:1228-1230).
    """

    url = f"{API_BASE}/{{box_id}}/ai"
    name = "api:oig_cloud:ai"
    requires_auth = True

    def _require_admin(self, request: web.Request) -> Optional[web.Response]:
        # Real web.Request exposes `request.get(key)` (mapping-style); the test
        # harness's DummyRequest does not. `request.app["hass_user"]` is the
        # canonical Home Assistant convention, populated by the auth middleware
        # HA's auth middleware puts the authenticated user on the REQUEST mapping
        # (request["hass_user"]); request.app is the Application and does NOT carry
        # it in production. Read the request first (real HA), fall back to app only
        # for the test harness's DummyRequest. Mirrors module_config POST (:1235).
        user = request.get("hass_user") if hasattr(request, "get") else None
        if user is None and hasattr(request, "app"):
            user = request.app.get("hass_user")
        if not user or not user.is_admin:
            return web.json_response({"error": "Admin only"}, status=403)
        return None

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        denied = self._require_admin(request)
        if denied is not None:
            return denied
        hass: HomeAssistant = request.app["hass"]
        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)
        store = AiKeyStore(hass, entry.entry_id)
        state = await store.async_api_state()
        return web.json_response(_ai_rest_state(hass, entry, box_id, state))

    async def post(self, request: web.Request, box_id: str) -> web.Response:
        denied = self._require_admin(request)
        if denied is not None:
            return denied
        hass: HomeAssistant = request.app["hass"]
        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)

        try:
            payload = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON payload"}, status=400)
        if not isinstance(payload, dict):
            return web.json_response({"error": "Invalid payload"}, status=400)

        provider = payload.get("provider")
        api_key = payload.get("api_key")
        if not isinstance(provider, str) or provider not in PROVIDERS:
            return web.json_response({"error": "unknown provider"}, status=400)
        if not isinstance(api_key, str) or not api_key:
            return web.json_response({"error": "api_key required"}, status=400)

        # Cheap LOCAL prefix check FIRST — never call the provider with garbage.
        expected_prefix = PROVIDERS[provider]["key_prefix"]
        if not api_key.startswith(expected_prefix):
            return web.json_response(
                {"error": (
                    f"key for '{provider}' must start with the expected provider prefix "
                    f"(wrong prefix for {provider})"
                )},
                status=400,
            )

        store = AiKeyStore(hass, entry.entry_id)

        # Real Home Assistant always exposes a `bus` and a client session; a
        # partial hass (e.g. test harness, future sub-instance) shouldn't make
        # the verify path crash before the probe runs. Production uses the real
        # session; tests monkeypatch async_verify_key so a stub is fine.
        try:
            session = aiohttp_client.async_get_clientsession(hass)
        except (AttributeError, Exception):                  # noqa: BLE001
            session = None
        backend = OpenAiCompatBackend(
            session=session,
            base_url=PROVIDERS[provider]["base_url"],
            api_key=api_key,
            models=("verify-only",),
        )
        # R11.3: verify the CANDIDATE key before it ever touches the store — a
        # provider outage (or a bad candidate) must not overwrite a previously
        # stored, verified key.
        try:
            ok = await backend.async_verify_key()
        except Exception as err:                              # noqa: BLE001
            _LOGGER.warning(
                "AI key verify probe failed for %s (%s): %s",
                box_id, provider, err,
                exc_info=True,
            )
            return web.json_response(
                {
                    "error": "verify failed",
                    "code": "ai_verify_failed",
                    **await store.async_api_state(),
                },
                status=502,
            )
        if not ok:
            return web.json_response(
                {
                    "error": "verify failed",
                    "code": "ai_verify_failed",
                    **await store.async_api_state(),
                },
                status=502,
            )

        await store.async_set_key(provider, api_key)
        await store.async_mark_verified(dt_util.utcnow().isoformat())
        return web.json_response(await store.async_api_state())


class OIGCloudAiValidateConfigView(OIGCloudAiView):
    """Admin-only anonymous configuration validation through the selected AI."""

    url = f"{API_BASE}/{{box_id}}/ai/validate_config"
    name = "api:oig_cloud:ai:validate_config"
    requires_auth = True

    async def post(self, request: web.Request, box_id: str) -> web.Response:
        denied = self._require_admin(request)
        if denied is not None:
            return denied

        hass: HomeAssistant = request.app["hass"]
        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)

        store = AiKeyStore(hass, entry.entry_id)
        api_state = await store.async_api_state()
        if _ai_rest_state(hass, entry, box_id, api_state)["status"] != "verified":
            return web.json_response({"ok": False, "code": "ai_not_verified"})

        provider = api_state.get("provider")
        entry_data = hass.data.get(DOMAIN, {}).get(entry.entry_id, {})
        coordinator = (
            entry_data.get("coordinator") if isinstance(entry_data, Mapping) else None
        )
        collected = _collect_anonymous_install(hass, entry, coordinator)

        # Hard wall-clock budget for the whole chain (F1 Unit B). The chain
        # depth × DEFAULT_TIMEOUT_S is the worst case (groq: 3 × 30s = 90s —
        # matches the live hang), and there is no inner timeout on the
        # ai_task delegation path at all. Cap it here so a slow provider
        # cannot strand the only user-facing AI feature; on cap, answer 504
        # with a closed ``ai_timeout`` code the FE surfaces in the validation
        # panel.
        _VALIDATE_CONFIG_BUDGET_S = 25
        t_start = time.monotonic()
        chain_model = "host_ai_task" if provider == "ai_task" else (
            MODEL_CHAINS[provider][0] if provider in PROVIDERS else None
        )
        _LOGGER.info(
            "AI validate_config start box=%s provider=%s task=validate_config model=%s",
            box_id, provider, chain_model,
        )
        try:
            if provider == "ai_task":
                # This is the host-AI selector shape derived from the same
                # schema used by the direct providers. No key lookup occurs.
                async with asyncio.timeout(_VALIDATE_CONFIG_BUDGET_S):
                    result = await _delegate_validate_config_ai_task(
                        hass,
                        entry,
                        validate_config_selector_schema(),
                        collected,
                    )
                    validated = validate_config_result(result)
            elif provider in PROVIDERS:
                key = await store.async_get_key()
                if not key:
                    return web.json_response({"ok": False, "code": "ai_not_verified"})
                try:
                    session = aiohttp_client.async_get_clientsession(hass)
                except Exception:  # noqa: BLE001 - partial HA test harness
                    session = None
                backend = OpenAiCompatBackend(
                    session=session,
                    base_url=PROVIDERS[provider]["base_url"],
                    api_key=key,
                    models=MODEL_CHAINS[provider],
                    entry_id=entry.entry_id,
                    provider=provider,
                )
                async with asyncio.timeout(_VALIDATE_CONFIG_BUDGET_S):
                    result = await backend.async_generate_data(
                        "validate_config", collected, VALIDATE_CONFIG_SCHEMA
                    )
                    validated = validate_config_result(result)
            else:
                return web.json_response({"ok": False, "code": "unknown_provider"})
        except (asyncio.TimeoutError, TimeoutError):
            # ``asyncio.timeout`` fires when the chain wall-clock exceeds the
            # 25s budget (F1 Unit B). ``TimeoutError`` covers the built-in
            # alias raised by aiohttp's own deadlines. Return BEFORE the
            # generic ``Exception`` branch so a timeout is never downgraded
            # to ``error`` — the FE surfaces ``ai_timeout`` in the validation
            # panel.
            duration_ms = int((time.monotonic() - t_start) * 1000)
            _LOGGER.warning(
                "AI validate_config timeout box=%s provider=%s model=%s duration_ms=%d",
                box_id, provider, chain_model, duration_ms,
            )
            if provider in _AI_PROVIDERS:
                _record_ai_error(hass, entry, provider, "ai_timeout")
            return web.json_response(
                {"ok": False, "code": "ai_timeout"}, status=504,
            )
        except AiBackendError as err:
            code = _safe_ai_error_code(err.code)
            if provider in _AI_PROVIDERS:
                _record_ai_error(hass, entry, provider, code)
            return web.json_response({"ok": False, "code": code})
        except Exception as err:  # noqa: BLE001 - classify all provider failures
            _LOGGER.warning(
                "AI validate_config failed for %s (%s): %s",
                box_id,
                provider,
                type(err).__name__,
            )
            code = _safe_ai_error_code(getattr(err, "code", None))
            if provider in _AI_PROVIDERS:
                _record_ai_error(hass, entry, provider, code)
            return web.json_response({"ok": False, "code": code})

        if provider in _AI_PROVIDERS:
            _record_ai_success(hass, entry, provider)
        duration_ms = int((time.monotonic() - t_start) * 1000)
        _LOGGER.info(
            "AI validate_config ok box=%s provider=%s model=%s duration_ms=%d result=ok",
            box_id, provider, chain_model, duration_ms,
        )
        return web.json_response({"ok": True, **validated})


class OIGCloudSolarTestView(HomeAssistantView):
    """Admin-only REST surface for side-effect-free solar provider probes."""

    url = f"{API_BASE}/{{box_id}}/solar_test"
    name = "api:oig_cloud:solar_test"
    requires_auth = True

    def _require_admin(self, request: web.Request) -> Optional[web.Response]:
        # Real web.Request exposes `request.get(key)` (mapping-style); the test
        # harness's DummyRequest does not. `request.app["hass_user"]` is the
        # canonical Home Assistant convention, populated by the auth middleware
        # HA's auth middleware puts the authenticated user on the REQUEST mapping
        # (request["hass_user"]); request.app is the Application and does NOT carry
        # it in production. Read the request first (real HA), fall back to app only
        # for the test harness's DummyRequest. Mirrors module_config POST (:1235).
        user = request.get("hass_user") if hasattr(request, "get") else None
        if user is None and hasattr(request, "app"):
            user = request.app.get("hass_user")
        if not user or not user.is_admin:
            return web.json_response({"error": "Admin only"}, status=403)
        return None

    async def post(self, request: web.Request, box_id: str) -> web.Response:
        denied = self._require_admin(request)
        if denied is not None:
            return denied

        try:
            payload = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON payload"}, status=400)
        if not isinstance(payload, dict):
            return web.json_response({"error": "Invalid payload"}, status=400)

        parsed, error_response = self._parse_payload(payload)
        if error_response is not None:
            return error_response
        if parsed is None:
            return web.json_response({"error": "Invalid payload"}, status=400)

        hass: HomeAssistant = request.app["hass"]
        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)

        limiter = get_solar_test_limiter(hass)
        limiter.prune(
            (candidate.entry_id for candidate in hass.config_entries.async_entries(DOMAIN)),
            _SOLAR_TEST_PROVIDERS,
        )
        lease = await limiter.acquire(entry.entry_id, parsed["provider"])
        if lease is None:
            return web.json_response(
                {"ok": False, "code": "rate_limited"},
                status=429,
            )

        try:
            try:
                session = aiohttp_client.async_get_clientsession(hass)
            except Exception:  # noqa: BLE001
                _LOGGER.warning("Solar candidate test failed for %s: provider_unreachable", box_id)
                return web.json_response(
                    {"ok": False, "code": "provider_unreachable"},
                    status=502,
                )

            result = await run_solar_candidate_test(
                session,
                parsed["provider"],
                parsed["credentials"],
                parsed["gps"],
                parsed["strings"],
            )
        finally:
            lease.release()
        if "code" in result:
            return web.json_response(
                result,
                status=504 if result["code"] == "timeout" else 502,
            )
        store = _solar_key_store_or_none(hass, entry.entry_id)
        if store is not None:
            await store.async_set_candidate(parsed["provider"], parsed["credentials"])
            await store.async_promote_candidate(
                parsed["provider"], dt_util.utcnow().isoformat()
            )
        return web.json_response(result)

    def _parse_payload(
        self, payload: Dict[str, Any]
    ) -> tuple[Optional[Dict[str, Any]], Optional[web.Response]]:
        unknown = sorted(set(payload) - _SOLAR_TEST_ALLOWED_KEYS)
        if unknown:
            return None, web.json_response(
                {"error": "unknown field", "fields": unknown},
                status=400,
            )

        provider = payload.get("provider")
        if not isinstance(provider, str) or provider not in _SOLAR_TEST_PROVIDERS:
            return None, web.json_response({"error": "unknown provider"}, status=400)

        gps, gps_error = self._parse_gps(payload)
        if gps_error is not None:
            return None, gps_error

        strings: list[Dict[str, float]] = []
        for idx in (1, 2):
            parsed_string, string_error = self._parse_string(payload, idx)
            if string_error is not None:
                return None, string_error
            if parsed_string is not None:
                strings.append(parsed_string)

        credentials, credential_error = self._parse_credentials(payload, provider)
        if credential_error is not None:
            return None, credential_error

        return {
            "provider": provider,
            "credentials": credentials,
            "gps": gps,
            "strings": strings,
        }, None

    def _parse_gps(
        self, payload: Dict[str, Any]
    ) -> tuple[Optional[Dict[str, float]], Optional[web.Response]]:
        lat, lat_error = self._required_number(payload, "solar_forecast_latitude")
        if lat_error is not None:
            return None, lat_error
        lon, lon_error = self._required_number(payload, "solar_forecast_longitude")
        if lon_error is not None:
            return None, lon_error
        assert lat is not None and lon is not None
        return {"latitude": lat, "longitude": lon}, None

    def _parse_string(
        self, payload: Dict[str, Any], idx: int
    ) -> tuple[Optional[Dict[str, float]], Optional[web.Response]]:
        enabled_key = f"solar_forecast_string{idx}_enabled"
        enabled = payload.get(enabled_key, False)
        if not isinstance(enabled, bool):
            return None, web.json_response(
                {"error": f"{enabled_key} must be boolean"},
                status=400,
            )

        field_keys = [
            f"solar_forecast_string{idx}_kwp",
            f"solar_forecast_string{idx}_declination",
            f"solar_forecast_string{idx}_azimuth",
        ]
        if not enabled:
            present = [key for key in field_keys if key in payload]
            if present:
                return None, web.json_response(
                    {"error": "inactive string fields must be omitted", "fields": present},
                    status=400,
                )
            return None, None

        kwp, kwp_error = self._required_number(payload, field_keys[0])
        if kwp_error is not None:
            return None, kwp_error
        declination, declination_error = self._required_number(payload, field_keys[1])
        if declination_error is not None:
            return None, declination_error
        azimuth, azimuth_error = self._required_number(payload, field_keys[2])
        if azimuth_error is not None:
            return None, azimuth_error
        assert kwp is not None and declination is not None and azimuth is not None
        return {
            "kwp": kwp,
            "declination": declination,
            "azimuth": azimuth,
        }, None

    def _parse_credentials(
        self, payload: Dict[str, Any], provider: str
    ) -> tuple[Optional[Dict[str, str]], Optional[web.Response]]:
        if provider == "forecast_solar":
            unexpected = sorted(
                key for key in ("solcast_api_key", "solcast_site_id") if key in payload
            )
            if unexpected:
                return None, web.json_response(
                    {"error": "unexpected credential field", "fields": unexpected},
                    status=400,
                )
            key = payload.get("solar_forecast_api_key")
            if not isinstance(key, str) or not key.strip():
                return None, web.json_response(
                    {"error": "solar_forecast_api_key required"},
                    status=400,
                )
            return {"solar_forecast_api_key": key.strip()}, None

        if "solar_forecast_api_key" in payload:
            return None, web.json_response(
                {
                    "error": "unexpected credential field",
                    "fields": ["solar_forecast_api_key"],
                },
                status=400,
            )

        api_key = payload.get("solcast_api_key")
        site_id = payload.get("solcast_site_id")
        if not isinstance(api_key, str) or not api_key.strip():
            return None, web.json_response(
                {"error": "solcast_api_key required"},
                status=400,
            )
        if not isinstance(site_id, str) or not site_id.strip():
            return None, web.json_response(
                {"error": "solcast_site_id required"},
                status=400,
            )
        return {"solcast_api_key": api_key.strip(), "solcast_site_id": site_id.strip()}, None

    def _required_number(
        self, payload: Dict[str, Any], key: str
    ) -> tuple[Optional[float], Optional[web.Response]]:
        value = payload.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None, web.json_response(
                {"error": f"{key} must be numeric"},
                status=400,
            )
        return float(value), None


class OIGCloudOnboardingView(HomeAssistantView):
    """Admin-only REST surface for the soft onboarding guide (Plan 3 Task 11).

    SCOPE-REVISION #6: onboarding is a SOFT guide — there is NO ``locked`` concept and
    nothing here may imply one. A user sees a banner, never a wall.

    GET  -> the versioned onboarding state (steps/timestamps/provider +
            ``grandfathered``, derived from the entry's solar options). Never a
            key, never a gate concept.
    POST -> {"step": "ai|solar|pricing"} marks a step done (independent, no ordering);
            add {"action": "skip"} (or "status") to record a skip instead;
            {"provider": "<name>"} records the chosen AI provider;
            {"action": "dismiss_banner"} persists that the migration/review banner
            was closed (D11 — grandfathered users may never want the wizard).
            All optional. Fails closed (403 for non-admin) — mirrors
            OIGCloudAiView._require_admin.
    """

    url = f"{API_BASE}/{{box_id}}/onboarding"
    name = "api:oig_cloud:onboarding"
    requires_auth = True

    def _require_admin(self, request: web.Request) -> Optional[web.Response]:
        # Same fail-closed gate as OIGCloudAiView: read request["hass_user"] (real HA),
        # fall back to request.app only for the DummyRequest test harness (:1235 pattern).
        user = request.get("hass_user") if hasattr(request, "get") else None
        if user is None and hasattr(request, "app"):
            user = request.app.get("hass_user")
        if not user or not user.is_admin:
            return web.json_response({"error": "Admin only"}, status=403)
        return None

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        denied = self._require_admin(request)
        if denied is not None:
            return denied
        hass: HomeAssistant = request.app["hass"]
        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)
        # Pass the entry's options so ``grandfathered`` is REAL (derived from the
        # already-chosen solar provider + keys), never hard-coded (#6 / D11).
        state = await OnboardingState(hass, entry.entry_id, entry.options).async_get()
        return web.json_response(state)

    async def post(self, request: web.Request, box_id: str) -> web.Response:
        denied = self._require_admin(request)
        if denied is not None:
            return denied
        hass: HomeAssistant = request.app["hass"]
        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)

        try:
            payload = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON payload"}, status=400)
        if not isinstance(payload, dict):
            return web.json_response({"error": "Invalid payload"}, status=400)

        ob = OnboardingState(hass, entry.entry_id, entry.options)
        step = payload.get("step")
        provider = payload.get("provider")
        # Action routes a skip vs a completion. Accept "action" or "status" for
        # FE flexibility; anything that is not an explicit skip completes the step
        # (soft guide — no lock; #5/#6). "complete_step" (the FE's complete verb)
        # and the default both mean done.
        action = payload.get("action") or payload.get("status")
        normalized_action = action.strip().lower() if isinstance(action, str) else None
        if normalized_action == "finish":
            result = await ob.async_finish()
            code = result.get("code")
            if code == "finish_in_progress":
                return web.json_response(result, status=409)
            if code == "finish_save_failed":
                return web.json_response(result, status=503)
            return web.json_response(result)
        if normalized_action == "dismiss_banner":
            return web.json_response(await ob.async_dismiss_banner())
        if step is not None:
            if not isinstance(step, str) or step not in ONBOARDING_STEPS:
                return web.json_response({"error": "unknown step"}, status=400)
            if normalized_action in ("skip", "skipped"):
                await ob.async_skip_step(step)
            else:
                await ob.async_complete_step(step)
        if provider is not None:
            if not isinstance(provider, str) or not provider.strip():
                return web.json_response(
                    {"error": "provider must be a non-empty string"}, status=400
                )
            await ob.async_set_provider(provider.strip())
        return web.json_response(await ob.async_get())


class OIGCloudDashboardModulesView(HomeAssistantView):
    """API endpoint to read enabled dashboard modules for an entry."""

    url = f"{API_BASE}/{{entry_id}}/modules"
    name = "api:oig_cloud:dashboard_modules"
    requires_auth = True

    async def get(self, request: web.Request, entry_id: str) -> web.Response:
        hass: HomeAssistant = request.app["hass"]
        entry = hass.config_entries.async_get_entry(entry_id)
        if not entry or entry.domain != DOMAIN:
            return web.json_response({"error": "Entry not found"}, status=404)

        opts: dict[str, Any] = dict(entry.options)
        return web.json_response(
            {
                "enable_boiler": bool(opts.get("enable_boiler", False)),
            }
        )


class OIGCloudBoilerOverrideView(HomeAssistantView):
    """API endpoint to force/clear a bounded manual override of the boiler actuator."""

    url = f"{API_BASE}/boiler/{{entry_id}}/{{box_id}}/override"
    name = "api:oig_cloud:boiler_override"
    requires_auth = True

    _MIN_TTL_MINUTES = 15
    _MAX_TTL_MINUTES = 720
    _MAX_REASON_LEN = 200

    def _admin_or_none(self, request: web.Request) -> Optional[web.Response]:
        # Same fail-closed gate as OIGCloudPlannerSettingsView.post (:1351-1357):
        # request["hass_user"] first (real HA), request.app[...] as fallback (test harness).
        user = request.get("hass_user") if hasattr(request, "get") else None
        if user is None and hasattr(request, "app"):
            user = request.app.get("hass_user")
        if not user or not user.is_admin:
            return web.json_response({"error": "Admin only"}, status=403)
        return None

    def _find_runtime_or_none(self, hass: HomeAssistant, entry_id: str, box_id: str):
        entry = hass.config_entries.async_get_entry(entry_id)
        if not entry or entry.domain != DOMAIN:
            return None
        return get_boiler_runtime(hass, entry_id, box_id)

    async def post(self, request: web.Request, entry_id: str, box_id: str) -> web.Response:
        denied = self._admin_or_none(request)
        if denied is not None:
            return denied

        hass: HomeAssistant = request.app["hass"]
        runtime = self._find_runtime_or_none(hass, entry_id, box_id)
        if runtime is None:
            return web.json_response({"error": "Boiler not found"}, status=404)

        try:
            payload = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON payload"}, status=400)
        if not isinstance(payload, dict):
            return web.json_response({"error": "Invalid payload"}, status=400)

        ttl_minutes = payload.get("ttl_minutes")
        if not isinstance(ttl_minutes, int) or not (
            self._MIN_TTL_MINUTES <= ttl_minutes <= self._MAX_TTL_MINUTES
        ):
            return web.json_response(
                {
                    "error": (
                        f"ttl_minutes must be an integer between "
                        f"{self._MIN_TTL_MINUTES} and {self._MAX_TTL_MINUTES}"
                    )
                },
                status=400,
            )

        reason = payload.get("reason", "")
        if not isinstance(reason, str) or len(reason) > self._MAX_REASON_LEN:
            return web.json_response(
                {"error": f"reason must be a string of at most {self._MAX_REASON_LEN} characters"},
                status=400,
            )

        # BoilerRuntime does not expose the serializer publicly; the override
        # mechanism lives on it (actuator.py:374-443). Reaching the private
        # attribute here avoids adding new public surface out of this change's
        # scope fence (runtime.py is not in the allowed file list).
        serializer = runtime._serializer
        if serializer is None:
            return web.json_response({"error": "Boiler actuator not ready"}, status=503)

        ok, error_reason = await serializer.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=ttl_minutes,
        )
        if not ok:
            return web.json_response({"error": error_reason}, status=400)

        override_state = serializer.override_state or {}
        return web.json_response(
            {
                "override": {
                    "active": True,
                    "until": override_state.get("expires_at"),
                    "reason": reason,
                }
            }
        )

    async def delete(self, request: web.Request, entry_id: str, box_id: str) -> web.Response:
        denied = self._admin_or_none(request)
        if denied is not None:
            return denied

        hass: HomeAssistant = request.app["hass"]
        runtime = self._find_runtime_or_none(hass, entry_id, box_id)
        if runtime is None:
            return web.json_response({"error": "Boiler not found"}, status=404)

        serializer = runtime._serializer
        if serializer is not None:
            await serializer.clear_override()

        return web.json_response({"override": {"active": False}})


# ---------------------------------------------------------------------------
# Boiler "Plan & realita" detail-tabs read-model (M3a)
# ---------------------------------------------------------------------------
# Serves GET .../boiler/{entry_id}/{box_id}/detail_tabs?tab=today|yesterday|tomorrow
# as a plan-vs-actual view for the boiler tab, mirroring the Ceny flow and the
# battery_forecast detail_tabs sibling (:1219).
#
# v1 honesty note (see CONTRACT): the PLAN side is populated from the live
# boiler plan (runtime.get_current_plan()); today's actual per-source kWh totals
# come from runtime.get_daily_source_kwh(); current SoC from the live temperature
# sensors.  Fields that need slot-aligned actual-source history or a forecast
# model not yet built return null and are documented as pending the M2
# plan/actuals persistence unit:
#   - adherence_pct       -> needs per-slot actual-source history (M2)
#   - progress            -> today-only; needs actual cost tracking (M2)
#   - eod_prediction      -> needs end-of-day forecast model (not built)
#   - block.actual_kwh    -> needs per-slot actual energy (M2); mismatch stays False
#   - metric cost_czk.actual -> needs actual cost tracking (M2)
# Yesterday has no persisted historical plan/actuals in v1, so it returns
# {"available": false} (matching the fresh-install CONTRACT example).

_BOILER_DETAIL_TAB_KEYS = ("today", "yesterday", "tomorrow")


def _boiler_slot_float(slot: Any, attr: str) -> float:
    value = getattr(slot, attr, 0.0)
    try:
        return float(value or 0.0)
    except (TypeError, ValueError):
        return 0.0


def _boiler_source_class(raw: Any) -> str:
    """Map any plan/runtime source to the CONTRACT block enum fve|grid|battery|alt|idle."""
    if raw is None:
        return "idle"
    value = getattr(raw, "value", raw)
    if not isinstance(value, str):
        return "idle"
    key = value.lower().strip()
    if key in ("fve", "overflow", "zapnuto", "manual"):
        return "fve"
    if key == "grid":
        return "grid"
    if key in ("battery", "discharge"):
        return "battery"
    if key in ("alt", "alternative"):
        return "alt"
    return "idle"


def _boiler_slot_source_class(slot: Any) -> str:
    # A slot with no planned heating reads as idle regardless of its nominal source.
    if _boiler_slot_float(slot, "heating_kwh") <= 0.0:
        return "idle"
    return _boiler_source_class(getattr(slot, "recommended_source", None))


def _boiler_capacity_kwh(volume_l: float, target_temp_c: float, cold_inlet_c: float) -> float:
    delta = target_temp_c - cold_inlet_c
    if delta <= 0:
        return 0.0
    return round(volume_l * delta * BOILER_ENERGY_CONSTANT_KWH_L_C, 3)


def _boiler_hhmm(value: Any) -> str:
    if hasattr(value, "strftime"):
        return value.strftime("%H:%M")
    return str(value)


def _boiler_block_status(start_dt: Any, end_dt: Any, now: Any) -> str:
    try:
        if end_dt <= now:
            return "historical"
        if start_dt <= now < end_dt:
            return "current"
        return "planned"
    except TypeError:
        # Naive/aware mismatch or non-datetime — degrade to planned rather than 500.
        return "planned"


def _build_boiler_blocks(slots: list, now: Any) -> list:
    """Aggregate contiguous same-source-class plan slots into CONTRACT blocks."""
    blocks: list = []
    current: Optional[dict] = None
    for slot in slots:
        cls = _boiler_slot_source_class(slot)
        source_changed = current is None or current.get("source") != cls
        if source_changed:
            if current is not None:
                blocks.append(current)
            current = {
                "start": _boiler_hhmm(slot.start),
                "end": _boiler_hhmm(slot.end),
                "source": cls,
                "planned_kwh": 0.0,
                "cost_czk": 0.0,
                "_start_dt": slot.start,
                "_end_dt": slot.end,
            }
        assert current is not None
        current["end"] = _boiler_hhmm(slot.end)
        current["_end_dt"] = slot.end
        current["planned_kwh"] += _boiler_slot_float(slot, "heating_kwh")
        current["cost_czk"] += _boiler_slot_float(slot, "estimated_cost_czk")
    if current is not None:
        blocks.append(current)

    result: list = []
    for block in blocks:
        start_dt = block.pop("_start_dt")
        end_dt = block.pop("_end_dt")
        result.append(
            {
                "start": block["start"],
                "end": block["end"],
                "source": block["source"],
                "planned_kwh": round(block["planned_kwh"], 3),
                "actual_kwh": None,  # per-slot actual energy pending M2 persistence
                "cost_czk": round(block["cost_czk"], 2),
                "status": _boiler_block_status(start_dt, end_dt, now),
                "mismatch": False,  # needs actual-source history to detect (M2)
            }
        )
    return result


def _boiler_metric(key: str, plan: float, actual: Optional[float], better: str) -> dict:
    return {"key": key, "plan": plan, "actual": actual, "better": better}


def _plan_ready_liters_min(slots: list, volume_l: float, cold_inlet_c: float) -> float:
    """Worst-case predicted ready (>=40 degC) litres across the day's plan slots."""
    ready_values: list = []
    for slot in slots:
        predicted = getattr(slot, "predicted_top_temp_c", None)
        if (
            isinstance(predicted, (int, float))
            and math.isfinite(predicted)
            and predicted > 0.0
        ):
            fraction = compute_ready_fraction(
                predicted,
                None,
                ready_temp_c=BOILER_READY_TEMP_C,
                cold_inlet_c=cold_inlet_c,
            )
            ready_values.append(round(fraction * volume_l, 1))
    return min(ready_values) if ready_values else 0.0


def _build_boiler_savings(slots: list, plan_cost: float) -> dict:
    """Savings vs a naive all-grid / all-alt baseline priced at each slot's spot/alt price."""
    grid_baseline = 0.0
    alt_baseline = 0.0
    grid_has = False
    alt_has = False
    for slot in slots:
        kwh = _boiler_slot_float(slot, "heating_kwh")
        spot_price = getattr(slot, "spot_price_kwh", None)
        alt_price = getattr(slot, "alt_price_kwh", None)
        if isinstance(spot_price, (int, float)):
            grid_baseline += kwh * float(spot_price)
            grid_has = True
        if isinstance(alt_price, (int, float)):
            alt_baseline += kwh * float(alt_price)
            alt_has = True
    return {
        "vs_alt_czk": round(alt_baseline - plan_cost, 2) if alt_has else None,
        "vs_grid_czk": round(grid_baseline - plan_cost, 2) if grid_has else None,
        "detail": (
            "Plan cost vs a naive all-grid / all-alt baseline, each slot priced "
            "at its own spot/alt price."
        ),
    }


def _boiler_soc_from_temps(
    hass: HomeAssistant, config: Mapping[str, Any], volume_l: float, cold_inlet_c: float
) -> tuple:
    """Current SoC from the live temperature sensors; (soc_dict, current_ready_liters)."""
    try:
        from ..boiler.api_views import _read_temperatures_from_hass

        temps = _read_temperatures_from_hass(hass, dict(config))
    except Exception:  # pragma: no cover - defensive against import/read errors
        temps = {"top": None, "bottom": None, "upper_zone": None, "lower_zone": None}

    top = temps.get("upper_zone")
    if top is None:
        top = temps.get("top")
    bottom = temps.get("lower_zone")

    if top is None:
        return {"now_kwh": None, "now_liters": None, "now_pct": None}, None

    fraction = compute_ready_fraction(
        top, bottom, ready_temp_c=BOILER_READY_TEMP_C, cold_inlet_c=cold_inlet_c
    )
    now_liters = round(fraction * volume_l, 1)
    now_pct = round(fraction * 100.0, 1)
    avg_temp = (top + bottom) / 2.0 if bottom is not None else top
    now_kwh = round(
        max(0.0, volume_l * (avg_temp - cold_inlet_c) * BOILER_ENERGY_CONSTANT_KWH_L_C), 3
    )
    return {"now_kwh": now_kwh, "now_liters": now_liters, "now_pct": now_pct}, now_liters


def _build_boiler_detail_tab(hass: HomeAssistant, runtime: Any, tab: str) -> dict:
    """Assemble the CONTRACT payload for one tab from the live boiler plan + actuals."""
    now = dt_util.now()
    today = now.date()
    if tab == "yesterday":
        target_date = today - timedelta(days=1)
    elif tab == "tomorrow":
        target_date = today + timedelta(days=1)
    else:
        target_date = today

    coordinator = getattr(runtime, "coordinator", None)
    config = (getattr(coordinator, "config", {}) or {}) if coordinator is not None else {}

    volume_l = float(config.get(CONF_BOILER_VOLUME_L, 200.0) or 200.0)
    target_temp_c = float(
        config.get(CONF_BOILER_TARGET_TEMP_C, DEFAULT_BOILER_TARGET_TEMP_C)
        or DEFAULT_BOILER_TARGET_TEMP_C
    )
    cold_inlet_c = float(
        config.get(CONF_BOILER_COLD_INLET_TEMP_C, DEFAULT_BOILER_COLD_INLET_TEMP_C)
        or DEFAULT_BOILER_COLD_INLET_TEMP_C
    )

    plan = runtime.get_current_plan() if hasattr(runtime, "get_current_plan") else None
    slots: list = []
    if plan is not None and getattr(plan, "slots", None):
        slots = [
            slot
            for slot in plan.slots
            if getattr(slot.start, "date", lambda: None)() == target_date
        ]

    # Yesterday, or any day the live plan does not cover, has no persisted
    # historical plan/actuals in v1 -> report unavailable.
    if not slots:
        return {"tab": tab, "available": False}

    slots.sort(key=lambda slot: slot.start)

    soc, actual_ready_liters = _boiler_soc_from_temps(hass, config, volume_l, cold_inlet_c)
    blocks = _build_boiler_blocks(slots, now)

    plan_cost = round(sum(_boiler_slot_float(s, "estimated_cost_czk") for s in slots), 2)
    plan_grid = round(sum(_boiler_slot_float(s, "grid_kwh") for s in slots), 3)
    plan_fve = round(sum(_boiler_slot_float(s, "pv_kwh") for s in slots), 3)
    plan_ready_min = _plan_ready_liters_min(slots, volume_l, cold_inlet_c)

    # Actual per-source kWh totals: today only, from the live daily accumulators.
    actual_grid: Optional[float] = None
    actual_fve: Optional[float] = None
    if tab == "today" and hasattr(runtime, "get_daily_source_kwh"):
        daily = runtime.get_daily_source_kwh() or {}
        actual_grid = round(float(daily.get("grid", 0.0) or 0.0), 3)
        actual_fve = round(float(daily.get("fve", 0.0) or 0.0), 3)

    # "actual" columns are only meaningful for today; a past/future tab has no
    # live actual to compare against in v1.  SoC itself is current state and is
    # reported regardless of tab.
    metric_ready_actual = actual_ready_liters if tab == "today" else None

    metrics = [
        # actual cost needs per-slot actual cost tracking (M2) -> null
        _boiler_metric("cost_czk", plan_cost, None, "lower"),
        _boiler_metric("grid_kwh", plan_grid, actual_grid, "lower"),
        _boiler_metric("fve_kwh", plan_fve, actual_fve, "higher"),
        _boiler_metric("ready_liters_min", plan_ready_min, metric_ready_actual, "higher"),
    ]

    return {
        "tab": tab,
        "available": True,
        "savings": _build_boiler_savings(slots, plan_cost),
        "adherence_pct": None,
        "progress": None,
        "eod_prediction": None,
        "metrics": metrics,
        "blocks": blocks,
        "capacity_kwh": _boiler_capacity_kwh(volume_l, target_temp_c, cold_inlet_c),
        "soc": soc,
    }


class OIGCloudBoilerDetailTabsView(HomeAssistantView):
    """Read-only plan-vs-actual detail tabs for the boiler tab (M3a).

    GET .../boiler/{entry_id}/{box_id}/detail_tabs?tab=today|yesterday|tomorrow
    Authenticated (no admin gate — read-only); 404 on unknown entry/box.
    """

    url = f"{API_BASE}/boiler/{{entry_id}}/{{box_id}}/detail_tabs"
    name = "api:oig_cloud:boiler_detail_tabs"
    requires_auth = True

    def _find_runtime_or_none(self, hass: HomeAssistant, entry_id: str, box_id: str):
        entry = hass.config_entries.async_get_entry(entry_id)
        if not entry or entry.domain != DOMAIN:
            return None
        return get_boiler_runtime(hass, entry_id, box_id)

    async def get(self, request: web.Request, entry_id: str, box_id: str) -> web.Response:
        hass: HomeAssistant = request.app["hass"]
        tab = request.query.get("tab", "today")
        if tab not in _BOILER_DETAIL_TAB_KEYS:
            return web.json_response(
                {"error": "tab must be one of today|yesterday|tomorrow"}, status=400
            )

        runtime = self._find_runtime_or_none(hass, entry_id, box_id)
        if runtime is None:
            return web.json_response({"error": "Boiler not found"}, status=404)

        try:
            return web.json_response(_build_boiler_detail_tab(hass, runtime, tab))
        except Exception as e:
            _LOGGER.error(
                f"Error serving boiler detail_tabs for {box_id}: {e}", exc_info=True
            )
            return web.json_response({"error": str(e)}, status=500)


@callback
def setup_api_endpoints(hass: HomeAssistant) -> None:
    """
    Register all REST API endpoints for OIG Cloud integration.

    Args:
        hass: Home Assistant instance
    """
    _LOGGER.info("🚀 Registering OIG Cloud REST API endpoints")

    # Register views
    hass.http.register_view(OIGCloudBatteryTimelineView())
    hass.http.register_view(OIGCloudUnifiedCostTileView())
    hass.http.register_view(OIGCloudDetailTabsView())
    hass.http.register_view(OIGCloudPlannerSettingsView())
    hass.http.register_view(OIGCloudDashboardModulesView())
    hass.http.register_view(OIGCloudBoilerOverrideView())
    hass.http.register_view(OIGCloudBoilerDetailTabsView())
    hass.http.register_view(OIGCloudModuleConfigView())
    hass.http.register_view(OIGCloudConfigRegistryView())
    hass.http.register_view(OIGCloudPricelistsView())
    hass.http.register_view(OIGCloudSpotPricesView())
    hass.http.register_view(OIGCloudAnalyticsView())
    hass.http.register_view(OIGCloudConsumptionProfilesView())
    hass.http.register_view(OIGCloudBalancingDecisionsView())
    hass.http.register_view(OIGCloudAiView())
    hass.http.register_view(OIGCloudAiValidateConfigView())
    hass.http.register_view(OIGCloudSolarTestView())
    hass.http.register_view(OIGCloudOnboardingView())

    _LOGGER.info(
        "✅ OIG Cloud REST API endpoints registered:\n"
        f"  - {API_BASE}/battery_forecast/<box_id>/timeline\n"
        f"  - {API_BASE}/battery_forecast/<box_id>/unified_cost_tile\n"
        f"  - {API_BASE}/battery_forecast/<box_id>/detail_tabs\n"
        f"  - {API_BASE}/battery_forecast/<box_id>/planner_settings\n"
        f"  - {API_BASE}/<entry_id>/modules\n"
        f"  - {API_BASE}/boiler/<entry_id>/<box_id>/override\n"
        f"  - {API_BASE}/boiler/<entry_id>/<box_id>/detail_tabs\n"
        f"  - {API_BASE}/spot_prices/<box_id>/intervals\n"
        f"  - {API_BASE}/analytics/<box_id>/hourly\n"
        f"  - {API_BASE}/consumption_profiles/<box_id>\n"
        f"  - {API_BASE}/balancing_decisions/<box_id>\n"
        f"  - {API_BASE}/<box_id>/ai (admin only)\n"
        f"  - {API_BASE}/<box_id>/ai/validate_config (admin only)\n"
        f"  - {API_BASE}/<box_id>/solar_test (admin only)\n"
        f"  - {API_BASE}/<box_id>/pricelists (admin only)\n"
        f"  - {API_BASE}/<box_id>/onboarding (admin only)"
    )
