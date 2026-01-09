from __future__ import annotations

import builtins
from types import SimpleNamespace

from custom_components.oig_cloud.entities import sensor_setup as module


class DummyEntry:
    def __init__(self, options=None, data=None, title=""):
        self.options = options or {}
        self.data = data or {}
        self.title = title


class DummyStates:
    def __init__(self, value):
        self._value = value

    def get(self, _entity_id):
        return self._value


class DummyRegistry:
    def __init__(self, entities):
        self.entities = entities


def test_resolve_box_id_forced_and_entry_paths():
    coordinator = SimpleNamespace(forced_box_id="123456")
    assert module.resolve_box_id(coordinator) == "123456"

    entry = DummyEntry(options={"box_id": "654321"})
    coordinator = SimpleNamespace(config_entry=entry)
    assert module.resolve_box_id(coordinator) == "654321"

    entry = DummyEntry(data={"inverter_sn": "777777"})
    coordinator = SimpleNamespace(config_entry=entry)
    assert module.resolve_box_id(coordinator) == "777777"


def test_resolve_box_id_from_title_and_data_fallback(monkeypatch):
    import re

    class FakeMatch:
        def group(self, _idx):
            return "123456"

    monkeypatch.setattr(re, "search", lambda *_a, **_k: FakeMatch())

    entry = DummyEntry(title="Box SN 123456")
    coordinator = SimpleNamespace(config_entry=entry)
    assert module.resolve_box_id(coordinator) == "123456"

    entry = DummyEntry(title=123)
    coordinator = SimpleNamespace(config_entry=entry, data={"999999": {}})
    assert module.resolve_box_id(coordinator) == "999999"

    coordinator = SimpleNamespace(data={"999999": {}})
    assert module.resolve_box_id(coordinator) == "999999"


def test_resolve_box_id_hass_state_and_registry(monkeypatch):
    hass = SimpleNamespace(states=DummyStates(SimpleNamespace(state="555555")))
    coordinator = SimpleNamespace(hass=hass)
    assert module.resolve_box_id(coordinator) == "555555"

    hass = SimpleNamespace(states=DummyStates(None))
    import re

    class FakePattern:
        def match(self, _value):
            return SimpleNamespace(group=lambda _idx: "888888")

    monkeypatch.setattr(re, "compile", lambda *_a, **_k: FakePattern())

    entities = {
        "one": SimpleNamespace(entity_id="sensor.oig_local_888888_power"),
        "two": SimpleNamespace(entity_id="sensor.oig_local_888888_voltage"),
    }
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        lambda _hass: DummyRegistry(entities),
    )
    coordinator = SimpleNamespace(hass=hass)
    assert module.resolve_box_id(coordinator) == "888888"


def test_get_sensor_definition_import_error(monkeypatch):
    original_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "custom_components.oig_cloud.sensor_types":
            raise ImportError("blocked")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    assert module.get_sensor_definition("missing")["sensor_type_category"] == "unknown"
