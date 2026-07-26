"""Finding B — re-enabling a module doesn't recreate entities.

Traces the trigger half of the chain named in the brief:
    module_config POST -> config_merge.merge_entry_options (sets
    _needs_reload/_reload_reason) -> async_update_options listener ->
    hass.config_entries.async_reload scheduled via hass.async_create_task.

Also pins the new `reload_reason` debug breadcrumb (config_merge.py sets
`_reload_reason` alongside the existing `_needs_reload` sentinel key;
async_update_options logs and pops it) so an operator can see what triggered
a reload without changing merge_entry_options' public signature/return type.
"""
from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace

import pytest

import custom_components.oig_cloud as init_module
from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView
from custom_components.oig_cloud.const import DOMAIN

_ADMIN_USER = SimpleNamespace(is_admin=True)


class DummyEntry:
    def __init__(self, entry_id, options):
        self.entry_id = entry_id
        self.options = dict(options)
        self.domain = DOMAIN


class DummyCoordinator:
    def __init__(self, box_id):
        self.data = {box_id: {}}


class DummyConfigEntries:
    def __init__(self, entry):
        self._entry = entry
        self.updated = []
        self.reloaded = []

    def async_entries(self, domain):
        return [self._entry]

    def async_update_entry(self, entry, options):
        entry.options = dict(options)
        self.updated.append(dict(options))

    async def async_reload(self, entry_id):
        self.reloaded.append(entry_id)


class DummyHass:
    def __init__(self, entry, box_id):
        self.config_entries = DummyConfigEntries(entry)
        self.data = {
            DOMAIN: {
                entry.entry_id: {
                    "coordinator": DummyCoordinator(box_id),
                    "config": dict(entry.options),
                }
            }
        }

    def async_create_task(self, coro):
        return asyncio.ensure_future(coro)


class _PostRequest:
    def __init__(self, hass, payload):
        self.app = {"hass": hass}
        self._payload = payload

    def get(self, key, default=None):
        if key == "hass_user":
            return _ADMIN_USER
        return default

    async def json(self):
        return self._payload


@pytest.mark.asyncio
async def test_module_config_post_triggers_reload_with_options():
    box_id = "reloadbox"
    entry = DummyEntry(f"eid_{box_id}", {"enable_chmu_warnings": False})
    hass = DummyHass(entry, box_id)

    view = OIGCloudModuleConfigView()
    request = _PostRequest(
        hass,
        {"section": "modules", "values": {"enable_chmu_warnings": True}},
    )

    response = await view.post(request, box_id)
    assert response.status == 200
    data = json.loads(response.text)
    assert data["updated"] is True

    # merge_entry_options must have written the sentinel that routes through
    # the reload listener, and the human-readable reason alongside it.
    assert entry.options.get("enable_chmu_warnings") is True
    assert entry.options.get("_needs_reload") is True
    assert entry.options.get("_reload_reason") == "enable_chmu_warnings"

    # Drive the actual listener HA would invoke on the options change — this
    # is the "async_reload was scheduled via the listener path" check.
    await init_module.async_update_options(hass, entry)
    assert hass.config_entries.reloaded == [], "reload must be scheduled as a task, not run inline"

    # Let the scheduled task run.
    await asyncio.sleep(0)

    assert hass.config_entries.reloaded == [entry.entry_id]
    # the sentinel keys must not leak into the persisted options
    assert "_needs_reload" not in entry.options
    assert "_reload_reason" not in entry.options


@pytest.mark.asyncio
async def test_module_config_post_no_reload_when_field_unchanged():
    """Posting the same value back must not mark _needs_reload (K2f: merge, not
    replace — reposting an unchanged flag is a no-op for reload purposes)."""
    box_id = "samebox"
    entry = DummyEntry(f"eid_{box_id}", {"enable_chmu_warnings": True})
    hass = DummyHass(entry, box_id)

    view = OIGCloudModuleConfigView()
    request = _PostRequest(
        hass,
        {"section": "modules", "values": {"enable_chmu_warnings": True}},
    )

    response = await view.post(request, box_id)
    assert response.status == 200

    assert "_needs_reload" not in entry.options
    assert "_reload_reason" not in entry.options
