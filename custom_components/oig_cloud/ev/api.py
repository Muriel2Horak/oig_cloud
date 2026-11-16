"""REST endpoint for the dashboard's car tab.

The plan's slot list (price, energy, PV and grid share for every slot until
departure) is too big for the sensor's attributes (the recorder keeps at most
16 KiB per state), so the tab reads it here.
"""

from __future__ import annotations

from typing import Any, Optional

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from ..const import (
    CONF_ENABLE_EV,
    CONF_EV_PLUGGED_ENTITY,
    CONF_EV_SOC_ENTITY,
    DOMAIN,
)
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
        }
        return web.json_response(body)
