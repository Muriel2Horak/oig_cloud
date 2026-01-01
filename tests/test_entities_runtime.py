from __future__ import annotations

from types import SimpleNamespace

from custom_components.oig_cloud.entities import sensor_runtime as runtime_module


class DummyCoordinator:
    def __init__(self, data, last_update_success=True):
        self.data = data
        self.last_update_success = last_update_success


class DummyHass:
    def __init__(self, language="en"):
        self.config = SimpleNamespace(language=language)


class DummySensor(runtime_module.OigCloudSensorRuntimeMixin):
    def __init__(self, coordinator, hass, sensor_type, box_id="123"):
        self.coordinator = coordinator
        self.hass = hass
        self._sensor_type = sensor_type
        self._box_id = box_id
        self._node_id = None
        self._node_key = None
        self.entity_id = f"sensor.oig_{box_id}_{sensor_type}"


def test_available_with_missing_node():
    coordinator = DummyCoordinator({"123": {"box_prms": {}}}, last_update_success=True)
    sensor = DummySensor(coordinator, DummyHass(), "test_sensor")
    sensor._node_id = "missing_node"
    sensor._node_key = "mode"

    assert sensor.available is False


def test_available_when_data_present():
    coordinator = DummyCoordinator({"123": {"box_prms": {"mode": 1}}})
    sensor = DummySensor(coordinator, DummyHass(), "test_sensor")
    sensor._node_id = "box_prms"
    sensor._node_key = "mode"

    assert sensor.available is True


def test_device_info_categories(monkeypatch):
    def _fake_def(sensor_type):
        if sensor_type == "shield_sensor":
            return {"sensor_type_category": "shield", "name": "Shield"}
        if sensor_type == "pricing_sensor":
            return {"sensor_type_category": "pricing", "name": "Pricing"}
        return {"sensor_type_category": "main", "name": "Main"}

    monkeypatch.setattr(runtime_module, "get_sensor_definition", _fake_def)

    data = {"123": {"box_prms": {"sw": "1.2.3"}, "queen": False}}
    coordinator = DummyCoordinator(data)

    shield_sensor = DummySensor(coordinator, DummyHass(), "shield_sensor")
    pricing_sensor = DummySensor(coordinator, DummyHass(), "pricing_sensor")
    main_sensor = DummySensor(coordinator, DummyHass(), "main_sensor")

    assert any(
        "shield" in ident[1] for ident in shield_sensor.device_info["identifiers"]
    )
    assert any(
        "analytics" in ident[1] for ident in pricing_sensor.device_info["identifiers"]
    )
    assert "Battery Box" in main_sensor.device_info["model"]


def test_name_uses_language(monkeypatch):
    monkeypatch.setattr(
        runtime_module,
        "get_sensor_definition",
        lambda _t: {"name": "Voltage", "name_cs": "Napeti"},
    )
    coordinator = DummyCoordinator({"123": {}})
    sensor = DummySensor(coordinator, DummyHass(language="cs"), "grid_voltage")
    assert sensor.name == "Napeti"
    sensor.hass = DummyHass(language="en")
    assert sensor.name == "Voltage"
