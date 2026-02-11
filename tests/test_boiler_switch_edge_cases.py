from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud import switch as module
from custom_components.oig_cloud.const import (
    CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    CONF_ENABLE_BOILER,
    DOMAIN,
)


class DummyServices:
    def __init__(self):
        self.calls = []

    async def async_call(self, domain, service, data, blocking=False):
        self.calls.append((domain, service, data, blocking))


class DummyStates:
    def __init__(self, states=None):
        self._states = states or {}

    def get(self, entity_id):
        return self._states.get(entity_id)


class DummyHass:
    def __init__(self, states=None):
        self.states = DummyStates(states)
        self.services = DummyServices()
        self.config_entries = SimpleNamespace(async_update_entry=lambda *_a, **_k: None)
        self.data = {DOMAIN: {}}


@pytest.mark.asyncio
async def test_switch_setup_logs_debug_when_disabled():
    hass = DummyHass()
    entry = SimpleNamespace(
        options={CONF_ENABLE_BOILER: False},
        data={},
        title="OIG 123",
    )
    added = []

    def _add(entities):
        added.extend(entities)

    await module.async_setup_entry(hass, entry, _add)
    assert added == []


@pytest.mark.asyncio
async def test_switch_setup_logs_info_no_switches():
    hass = DummyHass()
    entry = SimpleNamespace(
        options={
            CONF_ENABLE_BOILER: True,
            "box_id": "123",
        },
        data={},
        title="OIG 123",
    )
    added = []

    def _add(entities):
        added.extend(entities)

    await module.async_setup_entry(hass, entry, _add)
    assert added == []


def test_switch_is_on_returns_none_for_missing_state():
    hass = DummyHass(states={})
    switch = module.BoilerWrapperSwitch(
        hass=hass,
        box_id="123",
        name="Test",
        entity_suffix="bojler_top",
        target_entity_id="switch.missing",
    )
    assert switch.is_on is None


def test_switch_is_on_returns_false_for_off_state():
    hass = DummyHass(states={"switch.missing": SimpleNamespace(state="off")})
    switch = module.BoilerWrapperSwitch(
        hass=hass,
        box_id="123",
        name="Test",
        entity_suffix="bojler_top",
        target_entity_id="switch.missing",
    )
    assert switch.is_on is False


def test_switch_is_on_returns_true_for_on_state():
    hass = DummyHass(states={"switch.missing": SimpleNamespace(state="on")})
    switch = module.BoilerWrapperSwitch(
        hass=hass,
        box_id="123",
        name="Test",
        entity_suffix="bojler_top",
        target_entity_id="switch.missing",
    )
    assert switch.is_on is True


def test_resolve_box_id_updates_entry_options_with_extracted():
    hass = DummyHass()
    updated_options = {}

    def _update(entry, options):
        updated_options.update(options)

    entry = SimpleNamespace(
        options={},
        data={},
        title="OIG Cloud 2206237016",
    )
    entry.options = entry.options.__class__(**entry.options)
    hass.config_entries.async_update_entry = _update

    result = module._resolve_box_id(hass, entry)
    assert result == "2206237016"
    assert updated_options.get("box_id") == "2206237016"
