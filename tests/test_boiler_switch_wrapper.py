from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud import switch as module
from custom_components.oig_cloud.const import (
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    CONF_ENABLE_BOILER,
    DOMAIN,
)
from custom_components.oig_cloud.boiler.runtime import KEY_BOILER_RUNTIMES


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


class DummyActuator:
    def __init__(self):
        self.turn_on_calls = []
        self.turn_off_calls = []

    async def async_turn_on_entity(self, entity_id, is_heater=False):
        self.turn_on_calls.append((entity_id, is_heater))

    async def async_turn_off_entity(self, entity_id, is_heater=False):
        self.turn_off_calls.append((entity_id, is_heater))


class DummyRuntime:
    def __init__(self):
        self.actuator = DummyActuator()


class DummyHass:
    def __init__(self, states=None):
        self.states = DummyStates(states)
        self.services = DummyServices()
        self.config_entries = SimpleNamespace(async_update_entry=lambda *_a, **_k: None)
        self.data = {DOMAIN: {}}


@pytest.mark.asyncio
async def test_boiler_switch_setup_skips_without_targets():
    hass = DummyHass()
    entry = SimpleNamespace(options={CONF_ENABLE_BOILER: True}, data={}, title="OIG 123", entry_id="entry1")
    added = []

    def _add(entities):
        added.extend(entities)

    await module.async_setup_entry(hass, entry, _add)
    assert added == []


@pytest.mark.asyncio
async def test_boiler_switch_wrapper_turns_on_and_off():
    target_entity = "switch.real_heater"
    hass = DummyHass(states={target_entity: SimpleNamespace(state="off")})
    entry = SimpleNamespace(
        options={
            CONF_ENABLE_BOILER: True,
            "box_id": "123",
            CONF_BOILER_HEATER_SWITCH_ENTITY: target_entity,
        },
        data={},
        title="OIG 123",
        entry_id="entry1",
    )
    added = []

    def _add(entities):
        added.extend(entities)

    await module.async_setup_entry(hass, entry, _add)
    assert len(added) == 1
    wrapper = added[0]

    assert wrapper.entity_id == "switch.oig_123_bojler_top"
    assert wrapper.unique_id == "oig_cloud_123_boiler_bojler_top"
    assert wrapper._attr_has_entity_name is False

    # Without runtime, turn_on/turn_off log error and do not call services directly
    await wrapper.async_turn_on()
    await wrapper.async_turn_off()
    assert len(hass.services.calls) == 0

    # With runtime, delegates to actuator
    runtime = DummyRuntime()
    hass.data[DOMAIN]["entry1"] = {
        KEY_BOILER_RUNTIMES: {"123": runtime},
        "config": {"box_id": "123"},
    }

    await wrapper.async_turn_on()
    assert runtime.actuator.turn_on_calls == [(target_entity, True)]

    await wrapper.async_turn_off()
    assert runtime.actuator.turn_off_calls == [(target_entity, True)]


@pytest.mark.asyncio
async def test_boiler_switch_wrapper_circulation_optional():
    target_entity = "switch.circulation"
    hass = DummyHass(states={target_entity: SimpleNamespace(state="on")})
    entry = SimpleNamespace(
        options={
            CONF_ENABLE_BOILER: True,
            "box_id": "777",
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: target_entity,
        },
        data={},
        title="OIG 777",
        entry_id="entry2",
    )
    added = []

    def _add(entities):
        added.extend(entities)

    await module.async_setup_entry(hass, entry, _add)
    assert len(added) == 1
    assert added[0].entity_id == "switch.oig_777_bojler_cirkulace"
