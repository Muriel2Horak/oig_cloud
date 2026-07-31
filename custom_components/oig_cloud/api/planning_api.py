"""
OIG Cloud - Planning System REST API Endpoints.

Provides API endpoints for accessing battery planning system data.

Endpoints:
- /api/oig_cloud/plans/<box_id>/active - Get active plan
- /api/oig_cloud/plans/<box_id>/list - List all plans
- /api/oig_cloud/plans/<box_id>/<plan_id> - Get specific plan
- /api/oig_cloud/plans/<box_id>/create/manual - Create manual plan
- /api/oig_cloud/plans/<box_id>/<plan_id>/activate - Activate plan
- /api/oig_cloud/plans/<box_id>/<plan_id>/deactivate - Deactivate plan
- /api/oig_cloud/<box_id>/planner_simulate - Dry-run planner simulator (no live writes)

Author: OIG Cloud Integration
Date: 2025-11-02
"""

from __future__ import annotations

import importlib
import json
import logging
import os
from dataclasses import asdict
from datetime import datetime
from typing import Any

from aiohttp import web
from homeassistant.core import HomeAssistant
from homeassistant.helpers.http import KEY_HASS, HomeAssistantView

from ..battery_forecast.economic_planner import plan_battery_schedule
from ..battery_forecast.economic_planner_types import PlannerInputs
from ..battery_forecast.types import CBB_MODE_NAMES

_LOGGER = logging.getLogger(__name__)


def _admin_or_403(request: web.Request) -> web.Response | None:
    """Return a 403 response unless the caller is an authenticated admin.

    Plan mutation (create/activate/deactivate) drives the inverter working mode
    and grid cost, so it must be admin-gated like planner_settings/module_config.
    """
    user = request.get("hass_user")
    if not user or not getattr(user, "is_admin", False):
        return web.json_response({"error": "Admin only"}, status=403)
    return None


PLANNING_SYSTEM_NOT_INITIALIZED = "Planning system not initialized"

# API routes base
API_BASE = "/api/oig_cloud"

# --- planner_simulate: dry-run planner simulator (no live state/store writes) ---

# Bounds the synthetic series length so a caller cannot force an arbitrarily
# expensive simulation (the real planner truncates at 144 intervals / 36h;
# double that gives room for longer synthetic scenarios without being unbounded).
MAX_SIMULATE_INTERVALS = 288

_PRESETS_PATH = os.path.join(os.path.dirname(__file__), "planner_simulate_presets.json")
_presets_cache: dict[str, Any] | None = None


def _load_presets() -> dict[str, Any]:
    global _presets_cache
    if _presets_cache is None:
        with open(_PRESETS_PATH, "r", encoding="utf-8") as f:
            _presets_cache = json.load(f)
    return _presets_cache


def _build_planner_inputs(
    prices: list[float],
    solar: list[float],
    consumption: list[float],
    soc_start_kwh: float,
    config_overrides: dict[str, Any],
    defaults: dict[str, Any],
) -> PlannerInputs:
    cfg = dict(defaults)
    cfg.update(config_overrides or {})
    n = len(prices)
    return PlannerInputs(
        current_soc_kwh=soc_start_kwh,
        max_capacity_kwh=float(cfg["max_capacity_kwh"]),
        hw_min_kwh=float(cfg["hw_min_kwh"]),
        planning_min_percent=float(cfg["planning_min_percent"]),
        charge_rate_kw=float(cfg["charge_rate_kw"]),
        intervals=[{"index": i} for i in range(n)],
        prices=list(prices),
        solar_forecast=list(solar),
        load_forecast=list(consumption),
        expensive_percentile=float(cfg["expensive_percentile"]),
        round_trip_efficiency=float(cfg["round_trip_efficiency"]),
        comfort_soc_kwh=float(cfg.get("comfort_soc_kwh", 0.0)),
    )


def _planner_result_to_response(inputs: PlannerInputs, preset_id: str | None) -> dict[str, Any]:
    result = plan_battery_schedule(inputs)

    timeline = []
    for state in result.states:
        d = asdict(state)
        d["mode_name"] = CBB_MODE_NAMES.get(state.mode, str(state.mode))
        d["soc_percent"] = round((state.soc_kwh / inputs.max_capacity_kwh) * 100.0, 2)
        timeline.append(d)

    soc_values = [s.soc_kwh for s in result.states] or [inputs.current_soc_kwh]
    mode_distribution: dict[str, int] = {}
    for state in result.states:
        name = CBB_MODE_NAMES.get(state.mode, str(state.mode))
        mode_distribution[name] = mode_distribution.get(name, 0) + 1

    return {
        "preset": preset_id,
        "horizon_intervals": len(inputs.intervals),
        "interval_minutes": 15,
        "timeline": timeline,
        "summary": {
            "total_cost_czk": round(result.total_cost, 4),
            "total_grid_import_kwh": round(
                sum(s.grid_import_kwh for s in result.states), 4
            ),
            "total_grid_export_kwh": round(
                sum(s.grid_export_kwh for s in result.states), 4
            ),
            "total_solar_kwh": round(sum(s.solar_kwh for s in result.states), 4),
            "min_soc_kwh": round(min(soc_values), 4),
            "max_soc_kwh": round(max(soc_values), 4),
            "min_soc_percent": round(
                (min(soc_values) / inputs.max_capacity_kwh) * 100.0, 2
            ),
            "max_soc_percent": round(
                (max(soc_values) / inputs.max_capacity_kwh) * 100.0, 2
            ),
            "mode_distribution": mode_distribution,
        },
    }


class OIGCloudPlannerSimulateView(HomeAssistantView):
    """Dry-run battery planner simulator.

    Calls the real `plan_battery_schedule()` economic planning engine with
    synthetic or preset inputs. Never reads or writes live HA state, the
    config entry, or the plan store — pure function in, JSON out.
    """

    url = f"{API_BASE}/{{box_id}}/planner_simulate"
    name = "api:oig_cloud:planner_simulate"
    requires_auth = True

    async def post(self, request: web.Request, box_id: str) -> web.Response:
        _ = box_id  # path-scoped for URL consistency; simulation is fully synthetic
        resp = _admin_or_403(request)
        if resp is not None:
            return resp

        try:
            payload = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON payload"}, status=400)

        if not isinstance(payload, dict):
            return web.json_response({"error": "Invalid payload"}, status=400)

        try:
            presets = _load_presets()
        except (OSError, ValueError) as e:
            _LOGGER.error(f"Error loading planner_simulate presets: {e}", exc_info=True)
            return web.json_response({"error": "Presets unavailable"}, status=500)

        defaults = presets["default_config"]
        preset_id = payload.get("preset")

        try:
            if preset_id is not None:
                preset = presets["presets"].get(preset_id)
                if preset is None:
                    return web.json_response(
                        {"error": f"Unknown preset '{preset_id}'"}, status=400
                    )
                prices = preset["prices"]
                solar = preset["solar"]
                consumption = preset["consumption"]
                config_overrides = payload.get("config_overrides") or {}
                cfg = dict(defaults)
                cfg.update(config_overrides)
                soc_start_kwh = float(
                    payload.get("soc_start")
                    if payload.get("soc_start") is not None
                    else preset["soc_start_percent"] / 100.0 * float(cfg["max_capacity_kwh"])
                )
            else:
                for key in ("prices", "solar", "consumption"):
                    if key not in payload:
                        return web.json_response(
                            {"error": f"'{key}' required when no preset given"},
                            status=400,
                        )
                prices = payload["prices"]
                solar = payload["solar"]
                consumption = payload["consumption"]
                if "soc_start" not in payload:
                    return web.json_response(
                        {"error": "'soc_start' required when no preset given"},
                        status=400,
                    )
                soc_start_kwh = float(payload["soc_start"])
                config_overrides = payload.get("config_overrides") or {}

            if not (
                isinstance(prices, list)
                and isinstance(solar, list)
                and isinstance(consumption, list)
            ):
                return web.json_response(
                    {"error": "prices/solar/consumption must be arrays"}, status=400
                )

            n = len(prices)
            if n == 0 or n != len(solar) or n != len(consumption):
                return web.json_response(
                    {"error": "prices/solar/consumption must be equal-length, non-empty"},
                    status=400,
                )
            if n > MAX_SIMULATE_INTERVALS:
                return web.json_response(
                    {
                        "error": f"Series too long ({n} > {MAX_SIMULATE_INTERVALS} intervals)"
                    },
                    status=400,
                )

            inputs = _build_planner_inputs(
                prices, solar, consumption, soc_start_kwh, config_overrides, defaults
            )
            response_body = _planner_result_to_response(inputs, preset_id)
            return web.json_response(response_body)

        except (ValueError, TypeError, KeyError) as e:
            return web.json_response({"error": str(e)}, status=400)
        except Exception as e:
            _LOGGER.error(f"Error running planner simulate: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudPlannerSimulatePresetsView(HomeAssistantView):
    """List the planner_simulate presets (id + short CZ label).

    The simulator overlay fetches this list to populate its preset chips.
    POST-only routing left it 404. Fully synthetic — a read of the bundled
    JSON, no live state — so `box_id` is path-scoped for URL consistency,
    same as `OIGCloudPlannerSimulateView`. Admin-gated like its sibling.
    """

    url = f"{API_BASE}/{{box_id}}/planner_simulate/presets"
    name = "api:oig_cloud:planner_simulate_presets"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        _ = box_id  # path-scoped for URL consistency; preset list is synthetic
        resp = _admin_or_403(request)
        if resp is not None:
            return resp

        try:
            presets = _load_presets().get("presets", {})
        except (OSError, ValueError) as e:
            _LOGGER.error(f"Error loading planner_simulate presets: {e}", exc_info=True)
            return web.json_response({"error": "Presets unavailable"}, status=500)

        items = [
            {"id": preset_id, "name": preset.get("name") or preset.get("label") or preset_id}
            for preset_id, preset in presets.items()
        ]
        return web.json_response(items)


def _load_plan_filter_enums() -> tuple[Any, Any]:
    package_root = (__package__ or "custom_components.oig_cloud.api").rsplit(".", 1)[0]
    plan_manager = importlib.import_module(f"{package_root}.planning.plan_manager")
    return plan_manager.PlanType, plan_manager.PlanStatus


class OIGCloudActivePlanView(HomeAssistantView):
    """API endpoint for active plan data."""

    url = f"{API_BASE}/plans/{{box_id}}/active"
    name = "api:oig_cloud:active_plan"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        Get currently active plan.

        Returns:
            JSON with plan data or null if no active plan
        """
        hass: HomeAssistant = request.app[KEY_HASS]

        try:
            # Get planning system from hass.data
            planning_system = hass.data.get("oig_cloud", {}).get("planning_system")
            if not planning_system:
                return web.json_response(
                    {"error": PLANNING_SYSTEM_NOT_INITIALIZED}, status=503
                )

            # Get active plan
            plan_manager = planning_system.plan_manager
            active_plan = plan_manager.get_active_plan()

            if not active_plan:
                return web.json_response(None)

            return web.json_response(active_plan.to_dict())

        except Exception as e:
            _LOGGER.error(f"Error getting active plan: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudPlanListView(HomeAssistantView):
    """API endpoint for listing plans."""

    url = f"{API_BASE}/plans/{{box_id}}/list"
    name = "api:oig_cloud:plan_list"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        List plans with optional filters.

        Query params:
            ?type=automatic|manual|balancing|weather - Filter by type
            ?status=simulated|active|deactivated - Filter by status
            ?limit=N - Limit number of results (default: 100)

        Returns:
            JSON array of plan objects
        """
        hass: HomeAssistant = request.app[KEY_HASS]

        try:
            # Get query params
            plan_type = request.query.get("type")
            status = request.query.get("status")
            limit = int(request.query.get("limit", 100))

            # Get planning system
            planning_system = hass.data.get("oig_cloud", {}).get("planning_system")
            if not planning_system:
                return web.json_response(
                    {"error": PLANNING_SYSTEM_NOT_INITIALIZED}, status=503
                )

            # List plans
            PlanType, PlanStatus = _load_plan_filter_enums()

            plan_type_enum = None
            if plan_type:
                plan_type_enum = PlanType(plan_type)

            status_enum = None
            if status:
                status_enum = PlanStatus(status)

            plans = planning_system.plan_manager.list_plans(
                plan_type=plan_type_enum,
                status=status_enum,
                limit=limit,
            )

            # Convert to dicts
            plans_data = [plan.to_dict() for plan in plans]

            return web.json_response(
                {
                    "plans": plans_data,
                    "count": len(plans_data),
                    "filters": {
                        "type": plan_type,
                        "status": status,
                        "limit": limit,
                    },
                }
            )

        except Exception as e:
            _LOGGER.error(f"Error listing plans: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudPlanDetailView(HomeAssistantView):
    """API endpoint for specific plan details."""

    url = f"{API_BASE}/plans/{{box_id}}/{{plan_id}}"
    name = "api:oig_cloud:plan_detail"
    requires_auth = True

    async def get(
        self, request: web.Request, box_id: str, plan_id: str
    ) -> web.Response:
        """
        Get specific plan by ID.

        Returns:
            JSON with plan data or 404 if not found
        """
        hass: HomeAssistant = request.app[KEY_HASS]

        try:
            # Get planning system
            planning_system = hass.data.get("oig_cloud", {}).get("planning_system")
            if not planning_system:
                return web.json_response(
                    {"error": PLANNING_SYSTEM_NOT_INITIALIZED}, status=503
                )

            # Get plan
            plan = planning_system.plan_manager.get_plan(plan_id)
            if not plan:
                return web.json_response(
                    {"error": f"Plan {plan_id} not found"}, status=404
                )

            return web.json_response(plan.to_dict())

        except Exception as e:
            _LOGGER.error(f"Error getting plan {plan_id}: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudCreateManualPlanView(HomeAssistantView):
    """API endpoint for creating manual plan."""

    url = f"{API_BASE}/plans/{{box_id}}/create/manual"
    name = "api:oig_cloud:create_manual_plan"
    requires_auth = True

    async def post(self, request: web.Request, box_id: str) -> web.Response:
        """
        Create manual plan.

        POST body:
        {
            "target_soc_percent": 100.0,
            "target_time": "2024-11-02T18:00:00",
            "holding_hours": 6,  // optional
            "holding_mode": 2     // optional (HOME_III)
        }

        Returns:
            JSON with created plan
        """
        resp = _admin_or_403(request)
        if resp is not None:
            return resp
        hass: HomeAssistant = request.app[KEY_HASS]

        try:
            # Parse request body
            data = await request.json()

            # Validate required fields
            if "target_soc_percent" not in data or "target_time" not in data:
                return web.json_response(
                    {"error": "target_soc_percent and target_time required"}, status=400
                )

            # Get planning system
            planning_system = hass.data.get("oig_cloud", {}).get("planning_system")
            if not planning_system:
                return web.json_response(
                    {"error": PLANNING_SYSTEM_NOT_INITIALIZED}, status=503
                )

            # Parse parameters
            target_soc = float(data["target_soc_percent"])
            target_time = datetime.fromisoformat(data["target_time"])
            holding_hours = data.get("holding_hours")
            holding_mode = data.get("holding_mode")

            # Create plan
            plan = planning_system.plan_manager.create_manual_plan(
                target_soc_percent=target_soc,
                target_time=target_time,
                holding_hours=holding_hours,
                holding_mode=holding_mode,
            )

            return web.json_response(
                {
                    "success": True,
                    "plan": plan.to_dict(),
                }
            )

        except Exception as e:
            _LOGGER.error(f"Error creating manual plan: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudActivatePlanView(HomeAssistantView):
    """API endpoint for activating plan."""

    url = f"{API_BASE}/plans/{{box_id}}/{{plan_id}}/activate"
    name = "api:oig_cloud:activate_plan"
    requires_auth = True

    async def post(
        self, request: web.Request, box_id: str, plan_id: str
    ) -> web.Response:
        """
        Activate plan.

        Returns:
            JSON with activated plan
        """
        resp = _admin_or_403(request)
        if resp is not None:
            return resp
        hass: HomeAssistant = request.app[KEY_HASS]

        try:
            # Get planning system
            planning_system = hass.data.get("oig_cloud", {}).get("planning_system")
            if not planning_system:
                return web.json_response(
                    {"error": PLANNING_SYSTEM_NOT_INITIALIZED}, status=503
                )

            # Activate plan
            plan = planning_system.plan_manager.activate_plan(plan_id)

            return web.json_response(
                {
                    "success": True,
                    "plan": plan.to_dict(),
                }
            )

        except Exception as e:
            _LOGGER.error(f"Error activating plan {plan_id}: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudDeactivatePlanView(HomeAssistantView):
    """API endpoint for deactivating plan."""

    url = f"{API_BASE}/plans/{{box_id}}/{{plan_id}}/deactivate"
    name = "api:oig_cloud:deactivate_plan"
    requires_auth = True

    async def post(
        self, request: web.Request, box_id: str, plan_id: str
    ) -> web.Response:
        """
        Deactivate plan.

        Returns:
            JSON with deactivated plan
        """
        resp = _admin_or_403(request)
        if resp is not None:
            return resp
        hass: HomeAssistant = request.app[KEY_HASS]

        try:
            # Get planning system
            planning_system = hass.data.get("oig_cloud", {}).get("planning_system")
            if not planning_system:
                return web.json_response(
                    {"error": PLANNING_SYSTEM_NOT_INITIALIZED}, status=503
                )

            # Deactivate plan
            plan = planning_system.plan_manager.deactivate_plan(plan_id)

            return web.json_response(
                {
                    "success": True,
                    "plan": plan.to_dict(),
                }
            )

        except Exception as e:
            _LOGGER.error(f"Error deactivating plan {plan_id}: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


def setup_planning_api_views(hass: HomeAssistant) -> None:
    """Register all planning API views.

    Call this from __init__.py during setup.
    """
    hass.http.register_view(OIGCloudActivePlanView())
    hass.http.register_view(OIGCloudPlanListView())
    hass.http.register_view(OIGCloudPlanDetailView())
    hass.http.register_view(OIGCloudCreateManualPlanView())
    hass.http.register_view(OIGCloudActivatePlanView())
    hass.http.register_view(OIGCloudDeactivatePlanView())
    hass.http.register_view(OIGCloudPlannerSimulateView())
    hass.http.register_view(OIGCloudPlannerSimulatePresetsView())

    _LOGGER.info("Planning API endpoints registered")
