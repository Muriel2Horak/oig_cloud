from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.config.steps import OigCloudOptionsFlowHandler
from custom_components.oig_cloud.const import CONF_USERNAME


class DummyConfigEntries:
    def __init__(self):
        self.updated = []
        self.reloaded = []

    def async_update_entry(self, entry, options=None):
        self.updated.append((entry, options))

    async def async_reload(self, entry_id):
        self.reloaded.append(entry_id)


class DummyHass:
    def __init__(self):
        self.config_entries = DummyConfigEntries()


class DummyOptionsFlow(OigCloudOptionsFlowHandler):
    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    def async_abort(self, **kwargs):
        return {"type": "abort", **kwargs}

    async def async_step_wizard_modules(self, user_input=None):
        return {"type": "modules"}


@pytest.mark.asyncio
async def test_options_flow_welcome_reconfigure():
    entry = SimpleNamespace(entry_id="entry1", data={CONF_USERNAME: "demo"}, options={})
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    result = await flow.async_step_wizard_welcome_reconfigure()
    assert result["type"] == "form"

    result = await flow.async_step_wizard_welcome_reconfigure({})
    assert result["type"] == "modules"


@pytest.mark.asyncio
async def test_options_flow_summary_updates_entry():
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    assert flow.hass.config_entries.updated
    assert flow.hass.config_entries.reloaded == ["entry1"]
