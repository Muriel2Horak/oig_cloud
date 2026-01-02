from __future__ import annotations

from types import SimpleNamespace

import pytest
from homeassistant.helpers.entity_registry import RegistryEntryDisabler

import custom_components.oig_cloud as init_module
from custom_components.oig_cloud.const import DOMAIN


class DummyDevice:
    def __init__(self, device_id, identifiers, name=None):
        self.id = device_id
        self.identifiers = identifiers
        self.name = name or device_id


class DummyDeviceRegistry:
    def __init__(self, devices):
        self.devices = devices
        self.removed = []

    def async_remove_device(self, device_id):
        self.removed.append(device_id)


class DummyEntityRegistry:
    def __init__(self, entities):
        self.entities = {ent.entity_id: ent for ent in entities}
        self.updated = []
        self.removed = []

    def async_update_entity(self, entity_id, new_entity_id=None, new_unique_id=None, disabled_by=None):
        self.updated.append((entity_id, new_entity_id, new_unique_id, disabled_by))
        entity = self.entities.get(entity_id)
        if entity is None:
            return
        if new_entity_id:
            self.entities.pop(entity_id)
            entity.entity_id = new_entity_id
            self.entities[new_entity_id] = entity
        if new_unique_id:
            entity.unique_id = new_unique_id
        if disabled_by is not None:
            entity.disabled_by = disabled_by

    def async_remove(self, entity_id):
        self.removed.append(entity_id)
        self.entities.pop(entity_id, None)


class DummyEntity:
    def __init__(self, entity_id, unique_id, disabled_by=None):
        self.entity_id = entity_id
        self.unique_id = unique_id
        self.disabled_by = disabled_by


class DummyServices:
    def __init__(self):
        self.calls = []

    async def async_call(self, domain, service, data):
        self.calls.append((domain, service, data))


@pytest.mark.asyncio
async def test_cleanup_invalid_empty_devices(monkeypatch):
    devices = [
        DummyDevice("dev1", {(DOMAIN, "spot_prices")}),
        DummyDevice("dev2", {(DOMAIN, "123")}),
        DummyDevice("dev3", {(DOMAIN, "oig_bojler")}),
        DummyDevice("dev4", {(DOMAIN, "bad_analytics")}),
    ]
    device_registry = DummyDeviceRegistry(devices)
    entity_registry = DummyEntityRegistry([])

    entry = SimpleNamespace(entry_id="entry1")
    hass = SimpleNamespace()

    monkeypatch.setattr(
        "homeassistant.helpers.device_registry.async_get",
        lambda _hass: device_registry,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        lambda _hass: entity_registry,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.device_registry.async_entries_for_config_entry",
        lambda _reg, _entry_id: devices,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_entries_for_device",
        lambda _reg, _device_id: [],
    )

    await init_module._cleanup_invalid_empty_devices(hass, entry)

    assert "dev1" in device_registry.removed
    assert "dev4" in device_registry.removed
    assert "dev2" not in device_registry.removed
    assert "dev3" not in device_registry.removed


@pytest.mark.asyncio
async def test_migrate_entity_unique_ids(monkeypatch):
    entities = [
        DummyEntity(
            "sensor.oig_123_power_2",
            "oig_cloud_123_power",
            disabled_by=RegistryEntryDisabler.INTEGRATION,
        ),
        DummyEntity("sensor.oig_123_temp_2", "123_temp"),
        DummyEntity("sensor.oig_123_voltage", "oig_123_voltage"),
        DummyEntity("sensor.oig_123_boiler_mode", "entry_boiler_mode_boiler"),
    ]
    entity_registry = DummyEntityRegistry(entities)
    hass = SimpleNamespace(services=DummyServices())
    entry = SimpleNamespace(entry_id="entry1")

    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        lambda _hass: entity_registry,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_entries_for_config_entry",
        lambda _reg, _entry_id: list(entity_registry.entities.values()),
    )

    await init_module._migrate_entity_unique_ids(hass, entry)

    assert "sensor.oig_123_temp_2" in entity_registry.removed
    assert any(call[1] == "sensor.oig_123_power" for call in entity_registry.updated)
    assert any(call[2] == "oig_cloud_123_voltage" for call in entity_registry.updated)
    assert hass.services.calls
