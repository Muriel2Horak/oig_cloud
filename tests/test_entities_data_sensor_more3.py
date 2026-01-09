from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities.data_sensor import OigCloudDataSensor, _LANGS


class DummyCoordinator:
    def __init__(self, data=None):
        self.data = data or {}
        self.forced_box_id = "123"
        self.hass = None

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class DummyHass:
    def __init__(self):
        self.states = SimpleNamespace(get=lambda _eid: None)


def _make_sensor(sensor_type="invertor_prms_to_grid", coordinator=None):
    coordinator = coordinator or DummyCoordinator()
    sensor = OigCloudDataSensor(coordinator, sensor_type)
    sensor.hass = DummyHass()
    return sensor


def test_fallback_value_prefers_last_state():
    sensor = _make_sensor("box_prms_mode")
    sensor._last_state = "Home 1"
    assert sensor._fallback_value() == "Home 1"


def test_local_entity_id_suffix_and_domains(monkeypatch):
    sensor = _make_sensor("box_prms_mode")
    sensor._box_id = "abc"
    config = {
        "local_entity_suffix": "foo",
        "local_entity_domains": ["sensor", "binary_sensor"],
    }
    entity_id = sensor._get_local_entity_id_for_config(config)
    assert entity_id == "sensor.oig_local_abc_foo"


def test_apply_local_value_map_numeric_conversion():
    sensor = _make_sensor("box_prms_mode")
    config = {"local_value_map": {"on": "1"}}
    assert sensor._apply_local_value_map("on", config) == "1"
    assert sensor._apply_local_value_map("2", {}) == 2


def test_get_local_grid_mode_failure():
    sensor = _make_sensor("invertor_prms_to_grid")
    assert sensor._get_local_grid_mode("bad", "cs") == _LANGS["unknown"]["cs"]


def test_get_node_value_missing_node_key():
    coordinator = DummyCoordinator({"123": {"node": {"val": 1}}})
    sensor = _make_sensor("box_prms_mode", coordinator)
    sensor._sensor_config = {"node_id": "node"}
    assert sensor.get_node_value() is None
