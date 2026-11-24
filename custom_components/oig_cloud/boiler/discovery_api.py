"""REST endpoint: boiler entity candidates for the settings card (nothing saved)."""

from __future__ import annotations

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from ..ev.api import API_BASE, _find_entry


class OIGCloudBoilerDiscoverView(HomeAssistantView):
    url = f"{API_BASE}/{{box_id}}/boiler/discover"
    name = "api:oig_cloud:boiler:discover"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        hass = request.app["hass"]
        entry = _find_entry(hass, box_id)
        if entry is None:
            return web.json_response({"error": "Box not found"}, status=404)
        from ..ev.discovery import entities_from_hass
        from .discovery import ROLES, discover_boiler

        result = discover_boiler(entities_from_hass(hass))
        options = dict(entry.options or {})
        result["current"] = {role: options.get(role) or None for role in ROLES}
        return web.json_response(result)
