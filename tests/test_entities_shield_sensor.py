from __future__ import annotations

from types import SimpleNamespace

from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud.entities.shield_sensor import (
    OigCloudShieldSensor,
    _extract_param_type,
    translate_shield_state,
)


class DummyCoordinator:
    def __init__(self):
        self.forced_box_id = "123"


class DummyShield:
    def __init__(self):
        self.queue = [1, 2]
        self.pending = {"svc": {}}
        self.running = None
        self.mode_tracker = None

    def register_state_change_callback(self, _cb):
        return None

    def unregister_state_change_callback(self, _cb):
        return None


class DummyHass:
    def __init__(self, shield):
        self.data = {DOMAIN: {"shield": shield}}


def test_extract_param_type():
    assert _extract_param_type("sensor.oig_123_p_max_feed_grid") == "limit"
    assert _extract_param_type("sensor.oig_123_box_prms_mode") == "mode"
    assert _extract_param_type("sensor.oig_123_formating_mode") == "level"
    assert _extract_param_type("sensor.oig_123_other") == "value"


def test_translate_shield_state():
    assert translate_shield_state("active") == "aktivní"
    assert translate_shield_state("UNKNOWN") == "neznámý"
    assert translate_shield_state("custom") == "custom"


def test_shield_sensor_state_queue_and_status():
    shield = DummyShield()
    hass = DummyHass(shield)
    coordinator = DummyCoordinator()

    queue_sensor = OigCloudShieldSensor(coordinator, "service_shield_queue")
    queue_sensor.hass = hass

    assert queue_sensor.state == 3

    status_sensor = OigCloudShieldSensor(coordinator, "service_shield_status")
    status_sensor.hass = hass

    assert status_sensor.state == "aktivní"


def test_shield_sensor_state_changed_callback():
    shield = DummyShield()
    hass = DummyHass(shield)
    coordinator = DummyCoordinator()

    sensor = OigCloudShieldSensor(coordinator, "service_shield_status")
    sensor.hass = hass

    called = {}

    def _schedule():
        called["done"] = True

    sensor.schedule_update_ha_state = _schedule

    sensor._on_shield_state_changed()

    assert called["done"] is True
