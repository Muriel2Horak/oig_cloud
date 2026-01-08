from __future__ import annotations

from types import SimpleNamespace

import pytest

import custom_components.oig_cloud as init_module
from custom_components.oig_cloud.const import DOMAIN


class DummyDevice:
    def __init__(self, device_id, name):
        self.id = device_id
        self.name = name


class DummyDeviceRegistry:
    def __init__(self, devices):
        self.devices = devices
        self.removed = []

    def async_remove_device(self, device_id):
        self.removed.append(device_id)


class DummyEntityRegistry:
    def __init__(self, entities_by_device):
        self.entities_by_device = entities_by_device


@pytest.mark.asyncio
async def test_setup_telemetry_success(monkeypatch):
    hass = SimpleNamespace(data={"core.uuid": "abc"})
    handler = object()

    monkeypatch.setattr(
        "custom_components.oig_cloud.shared.logging.setup_simple_telemetry",
        lambda *_a, **_k: handler,
    )

    await init_module._setup_telemetry(hass, "user@example.com")

    assert hass.data[DOMAIN]["telemetry"] is handler


@pytest.mark.asyncio
async def test_setup_telemetry_exception(monkeypatch):
    hass = SimpleNamespace(data={"core.uuid": "abc"})

    def _raise(*_a, **_k):
        raise RuntimeError("fail")

    monkeypatch.setattr(
        "custom_components.oig_cloud.shared.logging.setup_simple_telemetry", _raise
    )

    await init_module._setup_telemetry(hass, "user@example.com")

    assert DOMAIN not in hass.data or "telemetry" not in hass.data[DOMAIN]


@pytest.mark.asyncio
async def test_cleanup_unused_devices(monkeypatch):
    devices = [
        DummyDevice("dev1", "OIG Cloud Home"),
        DummyDevice("dev2", "Random Device"),
        DummyDevice("dev3", "ServiceShield"),
    ]
    device_registry = DummyDeviceRegistry(devices)
    entity_registry = DummyEntityRegistry({"dev2": []})

    hass = SimpleNamespace()
    entry = SimpleNamespace(entry_id="entry1")

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
        lambda _reg, device_id: entity_registry.entities_by_device.get(device_id, []),
    )

    await init_module._cleanup_unused_devices(hass, entry)

    assert "dev2" in device_registry.removed
    assert "dev1" not in device_registry.removed
    assert "dev3" not in device_registry.removed


@pytest.mark.asyncio
async def test_async_remove_config_entry_device(monkeypatch):
    device_entry = SimpleNamespace(
        id="dev1", identifiers={(DOMAIN, "123")}
    )
    hass = SimpleNamespace()

    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        lambda _hass: SimpleNamespace(),
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_entries_for_device",
        lambda *_a, **_k: [],
    )

    allowed = await init_module.async_remove_config_entry_device(
        hass, SimpleNamespace(), device_entry
    )

    assert allowed is True

    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_entries_for_device",
        lambda *_a, **_k: [SimpleNamespace(entity_id="sensor.test")],
    )

    denied = await init_module.async_remove_config_entry_device(
        hass, SimpleNamespace(), device_entry
    )

    assert denied is False
