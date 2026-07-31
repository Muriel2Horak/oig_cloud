"""Tests for the boiler manual-override REST endpoint (POST/DELETE .../override)."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.api import ha_rest_api as api_module
from custom_components.oig_cloud.boiler.actuator import BoilerActuatorSerializer
from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES

_ADMIN_USER = SimpleNamespace(is_admin=True)
_NON_ADMIN_USER = SimpleNamespace(is_admin=False)

_ENTRY_ID = "entry_override"
_BOX_ID = "box_override"


class _Entry:
    entry_id = _ENTRY_ID
    domain = DOMAIN
    options = {}


class _ConfigEntries:
    def __init__(self, entries):
        self._entries = entries

    def async_get_entry(self, entry_id):
        for entry in self._entries:
            if entry.entry_id == entry_id:
                return entry
        return None


class _Hass:
    def __init__(self):
        self.data = {}
        self.config_entries = _ConfigEntries([_Entry()])


class _Request:
    """Real-HA shape: hass_user lives on request[...], not on request.app[...]."""

    def __init__(self, hass, user, payload=None):
        self.app = {"hass": hass}
        self._user = user
        self._payload = payload

    def get(self, key, default=None):
        if key == "hass_user":
            return self._user
        return default

    async def json(self):
        return self._payload


def _hass_with_runtime():
    hass = _Hass()
    serializer = BoilerActuatorSerializer(entry_id=_ENTRY_ID, box_id=_BOX_ID)
    runtime = SimpleNamespace(_serializer=serializer)
    hass.data[DOMAIN] = {
        _ENTRY_ID: {KEY_BOILER_RUNTIMES: {_BOX_ID: runtime}}
    }
    return hass, serializer


@pytest.mark.asyncio
async def test_override_post_happy_path():
    hass, serializer = _hass_with_runtime()
    view = api_module.OIGCloudBoilerOverrideView()

    request = _Request(
        hass, _ADMIN_USER, {"ttl_minutes": 30, "reason": "manual test"}
    )
    response = await view.post(request, _ENTRY_ID, _BOX_ID)
    payload = json.loads(response.text)

    assert response.status == 200, payload
    assert payload["override"]["active"] is True
    assert payload["override"]["reason"] == "manual test"
    assert payload["override"]["until"]
    assert serializer.override_state is not None


@pytest.mark.asyncio
async def test_override_delete_happy_path():
    hass, serializer = _hass_with_runtime()
    view = api_module.OIGCloudBoilerOverrideView()

    post_request = _Request(hass, _ADMIN_USER, {"ttl_minutes": 30, "reason": "r"})
    await view.post(post_request, _ENTRY_ID, _BOX_ID)
    assert serializer.override_state is not None

    delete_request = _Request(hass, _ADMIN_USER)
    response = await view.delete(delete_request, _ENTRY_ID, _BOX_ID)
    payload = json.loads(response.text)

    assert response.status == 200, payload
    assert payload == {"override": {"active": False}}
    assert serializer.override_state is None


@pytest.mark.asyncio
async def test_override_post_rejects_non_admin():
    hass, _serializer = _hass_with_runtime()
    view = api_module.OIGCloudBoilerOverrideView()

    request = _Request(
        hass, _NON_ADMIN_USER, {"ttl_minutes": 30, "reason": "r"}
    )
    response = await view.post(request, _ENTRY_ID, _BOX_ID)

    assert response.status == 403


@pytest.mark.asyncio
async def test_override_delete_rejects_non_admin():
    hass, _serializer = _hass_with_runtime()
    view = api_module.OIGCloudBoilerOverrideView()

    request = _Request(hass, _NON_ADMIN_USER)
    response = await view.delete(request, _ENTRY_ID, _BOX_ID)

    assert response.status == 403


@pytest.mark.asyncio
async def test_override_post_unknown_box_returns_404():
    hass, _serializer = _hass_with_runtime()
    view = api_module.OIGCloudBoilerOverrideView()

    request = _Request(hass, _ADMIN_USER, {"ttl_minutes": 30, "reason": "r"})
    response = await view.post(request, _ENTRY_ID, "unknown_box")

    assert response.status == 404


@pytest.mark.asyncio
async def test_override_delete_unknown_entry_returns_404():
    hass, _serializer = _hass_with_runtime()
    view = api_module.OIGCloudBoilerOverrideView()

    request = _Request(hass, _ADMIN_USER)
    response = await view.delete(request, "unknown_entry", _BOX_ID)

    assert response.status == 404


@pytest.mark.asyncio
@pytest.mark.parametrize("ttl_minutes", [14, 721, 0, -5])
async def test_override_post_ttl_out_of_range_returns_400(ttl_minutes):
    hass, _serializer = _hass_with_runtime()
    view = api_module.OIGCloudBoilerOverrideView()

    request = _Request(
        hass, _ADMIN_USER, {"ttl_minutes": ttl_minutes, "reason": "r"}
    )
    response = await view.post(request, _ENTRY_ID, _BOX_ID)

    assert response.status == 400


@pytest.mark.asyncio
async def test_override_post_reason_too_long_returns_400():
    hass, _serializer = _hass_with_runtime()
    view = api_module.OIGCloudBoilerOverrideView()

    request = _Request(
        hass, _ADMIN_USER, {"ttl_minutes": 30, "reason": "x" * 201}
    )
    response = await view.post(request, _ENTRY_ID, _BOX_ID)

    assert response.status == 400
