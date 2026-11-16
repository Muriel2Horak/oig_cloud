"""REST endpoint for the dashboard's car tab.

The plan's slot list (price, energy, PV and grid share for every slot until
departure) is too big for the sensor's attributes (the recorder keeps at most
16 KiB per state), so the tab reads it here.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Optional, Tuple

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from ..const import (
    CONF_ENABLE_EV,
    CONF_EV_PLUGGED_ENTITY,
    CONF_EV_SOC_ENTITY,
    DOMAIN,
)
from homeassistant.util import dt as dt_util

from .calendar import DAY_KINDS, DayOverride, _parse_time
from .charge_override import MODES
from .runtime import _PLUGGED_STATES, _float_state, get_ev_runtime

API_BASE = "/api/oig_cloud"


def _find_entry(hass: Any, box_id: str) -> Optional[Any]:
    for entry in hass.config_entries.async_entries(DOMAIN):
        entry_data = (hass.data.get(DOMAIN, {}) or {}).get(entry.entry_id, {})
        coordinator = entry_data.get("coordinator") if isinstance(entry_data, dict) else None
        box_map = getattr(coordinator, "data", None)
        if isinstance(box_map, dict) and box_id in box_map:
            return entry
    return None


class OIGCloudEvView(HomeAssistantView):
    url = f"{API_BASE}/{{box_id}}/ev"
    name = "api:oig_cloud:ev"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        hass = request.app["hass"]
        entry = _find_entry(hass, box_id)
        if entry is None:
            return web.json_response({"error": "Box not found"}, status=404)
        options = dict(entry.options or {})
        runtime = get_ev_runtime(hass, entry.entry_id)
        if not options.get(CONF_ENABLE_EV) or runtime is None:
            return web.json_response({"enabled": False})
        plugged_entity = options.get(CONF_EV_PLUGGED_ENTITY)
        plugged_state = hass.states.get(plugged_entity) if plugged_entity else None
        plan = runtime.last_plan
        summary = runtime.as_dict()
        body = {
            "enabled": True,
            "car": {
                "soc_pct": _float_state(hass, options.get(CONF_EV_SOC_ENTITY)),
                "plugged_in": (
                    str(plugged_state.state).lower() in _PLUGGED_STATES
                    if plugged_state is not None
                    else None
                ),
                "capacity_kwh": summary.get("capacity_kwh"),
            },
            "next_departure": summary.get("next_departure"),
            "need_pct": summary.get("need_pct"),
            "issue": summary.get("issue"),
            "profile": summary.get("profile"),
            "profile_updated_at": summary.get("profile_updated_at"),
            "plan": plan.as_detail_dict() if plan is not None else None,
            "next_day": summary.get("next_day"),
            "charge_override": summary.get("charge_override"),
            "vacations": summary.get("vacations"),
            "control": summary.get("control"),
            "days": [day.as_dict() for day in runtime.days()],
        }
        return web.json_response(body)


def _runtime_or_error(hass: Any, box_id: str) -> Tuple[Any, Optional[web.Response]]:
    entry = _find_entry(hass, box_id)
    if entry is None:
        return None, web.json_response({"error": "Box not found"}, status=404)
    runtime = get_ev_runtime(hass, entry.entry_id)
    if not (entry.options or {}).get(CONF_ENABLE_EV) or runtime is None:
        return None, web.json_response({"error": "Car not enabled"}, status=409)
    return runtime, None


async def _json(request: web.Request) -> Tuple[dict, Optional[web.Response]]:
    try:
        payload = await request.json()
    except Exception:
        return {}, web.json_response({"error": "Invalid JSON payload"}, status=400)
    if not isinstance(payload, dict):
        return {}, web.json_response({"error": "Invalid payload"}, status=400)
    return payload, None


def _date(raw: Any) -> Optional[date]:
    try:
        return date.fromisoformat(str(raw))
    except (TypeError, ValueError):
        return None


class OIGCloudEvChargeView(HomeAssistantView):
    """Charge now / charge by HH:MM / back to the plan (one drive only)."""

    url = f"{API_BASE}/{{box_id}}/ev/charge"
    name = "api:oig_cloud:ev:charge"
    requires_auth = True

    async def post(self, request: web.Request, box_id: str) -> web.Response:
        hass = request.app["hass"]
        runtime, error = _runtime_or_error(hass, box_id)
        if error is not None:
            return error
        payload, error = await _json(request)
        if error is not None:
            return error
        mode = payload.get("mode")
        if mode not in MODES:
            return web.json_response({"error": f"mode must be one of {list(MODES)}"}, status=400)
        by = None
        if mode == "by":
            when = _parse_time(payload.get("time"))
            if when is None:
                return web.json_response({"error": "time must be HH:MM"}, status=400)
            now = dt_util.now()
            by = now.replace(hour=when.hour, minute=when.minute, second=0, microsecond=0)
            if by <= now:
                from datetime import timedelta

                by += timedelta(days=1)
        override = await runtime.async_set_charge_mode(mode, by=by)
        if mode != "plan" and override is None:
            return web.json_response({"error": "Time is not in the future"}, status=400)
        return web.json_response({"charge_override": override.as_dict() if override else None})


class OIGCloudEvDayView(HomeAssistantView):
    """One day of the calendar: home / trip / workday / dayoff, heating yes/no."""

    url = f"{API_BASE}/{{box_id}}/ev/day"
    name = "api:oig_cloud:ev:day"
    requires_auth = True

    async def post(self, request: web.Request, box_id: str) -> web.Response:
        hass = request.app["hass"]
        runtime, error = _runtime_or_error(hass, box_id)
        if error is not None:
            return error
        payload, error = await _json(request)
        if error is not None:
            return error
        day = _date(payload.get("date"))
        if day is None:
            return web.json_response({"error": "date must be YYYY-MM-DD"}, status=400)
        kind = payload.get("kind")
        if kind is not None and kind not in DAY_KINDS:
            return web.json_response({"error": f"kind must be one of {list(DAY_KINDS)} or null"}, status=400)
        departure = None
        if payload.get("departure"):
            departure = _parse_time(payload.get("departure"))
            if departure is None:
                return web.json_response({"error": "departure must be HH:MM"}, status=400)
        precondition = payload.get("precondition")
        if precondition is not None and not isinstance(precondition, bool):
            return web.json_response({"error": "precondition must be true, false or null"}, status=400)
        await runtime.async_set_day(day, DayOverride(kind=kind, departure=departure, precondition=precondition))
        return web.json_response({"days": [d.as_dict() for d in runtime.days()]})


class OIGCloudEvVacationView(HomeAssistantView):
    url = f"{API_BASE}/{{box_id}}/ev/vacation"
    name = "api:oig_cloud:ev:vacation"
    requires_auth = True

    async def _range(self, request: web.Request, box_id: str) -> Tuple[Any, Any, Any, Optional[web.Response]]:
        hass = request.app["hass"]
        runtime, error = _runtime_or_error(hass, box_id)
        if error is not None:
            return None, None, None, error
        payload, error = await _json(request)
        if error is not None:
            return None, None, None, error
        start, end = _date(payload.get("start")), _date(payload.get("end"))
        if start is None or end is None:
            return None, None, None, web.json_response({"error": "start and end must be YYYY-MM-DD"}, status=400)
        return runtime, start, end, None

    async def post(self, request: web.Request, box_id: str) -> web.Response:
        runtime, start, end, error = await self._range(request, box_id)
        if error is not None:
            return error
        if not await runtime.async_add_vacation(start, end):
            return web.json_response({"error": "Invalid range (end before start or over 62 days)"}, status=400)
        return web.json_response({"vacations": runtime.calendar.as_dict()["vacations"]})

    async def delete(self, request: web.Request, box_id: str) -> web.Response:
        runtime, start, end, error = await self._range(request, box_id)
        if error is not None:
            return error
        await runtime.async_remove_vacation(start, end)
        return web.json_response({"vacations": runtime.calendar.as_dict()["vacations"]})


class OIGCloudEvDiscoverView(HomeAssistantView):
    """Candidate entities for the car setup wizard (nothing is saved)."""

    url = f"{API_BASE}/{{box_id}}/ev/discover"
    name = "api:oig_cloud:ev:discover"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        hass = request.app["hass"]
        if _find_entry(hass, box_id) is None:
            return web.json_response({"error": "Box not found"}, status=404)
        from .discovery import discover, entities_from_hass

        return web.json_response(discover(entities_from_hass(hass)))
