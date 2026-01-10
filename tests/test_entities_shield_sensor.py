from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

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
        self.states = DummyStates({})


class DummyStates:
    def __init__(self, states):
        self._states = states

    def get(self, entity_id):
        return self._states.get(entity_id)


class DummyState:
    def __init__(self, state):
        self.state = state


def test_extract_param_type():
    assert _extract_param_type("sensor.oig_123_p_max_feed_grid") == "limit"
    assert _extract_param_type("sensor.oig_123_box_prms_mode") == "mode"
    assert _extract_param_type("sensor.oig_123_boiler_manual_mode") == "mode"
    assert _extract_param_type("sensor.oig_123_formating_mode") == "level"
    assert _extract_param_type("sensor.oig_123_prms_to_grid") == "mode"
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


def test_shield_sensor_state_unavailable():
    hass = DummyHass(None)
    coordinator = DummyCoordinator()
    sensor = OigCloudShieldSensor(coordinator, "service_shield_status")
    sensor.hass = hass

    assert sensor.state == "nedostupný"


def test_shield_sensor_should_poll_and_metadata(monkeypatch):
    coordinator = DummyCoordinator()
    sensor = OigCloudShieldSensor(coordinator, "service_shield_status")
    sensor.hass = DummyHass(DummyShield())

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.shield_sensor._get_sensor_definition",
        lambda _t: {
            "name": "Shield Status",
            "name_cs": "Stav stitu",
            "icon": "mdi:shield-check",
            "unit_of_measurement": "units",
            "device_class": "problem",
        },
    )

    assert sensor.should_poll is False
    assert sensor.name == "Stav stitu"
    assert sensor.icon == "mdi:shield-check"
    assert sensor.unit_of_measurement == "units"
    assert sensor.device_class == "problem"


def test_shield_sensor_state_mode_reaction_time():
    shield = DummyShield()
    shield.mode_tracker = SimpleNamespace(
        get_statistics=lambda: {
            "a": {"median_seconds": 1.0},
            "b": {"median_seconds": 2.0},
        }
    )
    hass = DummyHass(shield)
    coordinator = DummyCoordinator()
    sensor = OigCloudShieldSensor(coordinator, "mode_reaction_time")
    sensor.hass = hass

    assert sensor.state == 1.5


def test_shield_sensor_state_mode_reaction_time_empty_stats():
    shield = DummyShield()
    shield.mode_tracker = SimpleNamespace(get_statistics=lambda: {})
    hass = DummyHass(shield)
    sensor = OigCloudShieldSensor(DummyCoordinator(), "mode_reaction_time")
    sensor.hass = hass

    assert sensor.state is None


def test_shield_sensor_state_activity_and_idle():
    shield = DummyShield()
    shield.running = "oig_cloud.set_box_mode"
    shield.pending = {
        "oig_cloud.set_box_mode": {
            "entities": {"sensor.oig_123_box_prms_mode": "Home 2"}
        }
    }
    hass = DummyHass(shield)
    coordinator = DummyCoordinator()

    sensor = OigCloudShieldSensor(coordinator, "service_shield_activity")
    sensor.hass = hass
    assert sensor.state == "set_box_mode: Home 2"

    shield.running = None
    assert sensor.state == "nečinný"


def test_shield_sensor_state_activity_fallback():
    shield = DummyShield()
    shield.running = "oig_cloud.set_box_mode"
    shield.pending = {}
    hass = DummyHass(shield)
    coordinator = DummyCoordinator()
    sensor = OigCloudShieldSensor(coordinator, "service_shield_activity")
    sensor.hass = hass

    assert sensor.state == "set_box_mode"


def test_shield_sensor_state_unknown():
    shield = DummyShield()
    hass = DummyHass(shield)
    sensor = OigCloudShieldSensor(DummyCoordinator(), "some_other_state")
    sensor.hass = hass

    assert sensor.state == "neznámý"


def test_shield_sensor_state_error_branch(monkeypatch):
    shield = DummyShield()
    hass = DummyHass(shield)
    coordinator = DummyCoordinator()
    sensor = OigCloudShieldSensor(coordinator, "service_shield_activity")
    sensor.hass = hass

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.shield_sensor.translate_shield_state",
        lambda value: f"translated-{value}",
    )

    def _boom():
        raise RuntimeError("boom")

    sensor.hass.data = SimpleNamespace()
    assert sensor.state == "translated-error"


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


@pytest.mark.asyncio
async def test_shield_sensor_registers_callback():
    shield = DummyShield()
    hass = DummyHass(shield)
    coordinator = DummyCoordinator()
    sensor = OigCloudShieldSensor(coordinator, "service_shield_status")
    sensor.hass = hass

    calls = {"registered": 0, "unregistered": 0}

    def _register(_cb):
        calls["registered"] += 1

    def _unregister(_cb):
        calls["unregistered"] += 1

    shield.register_state_change_callback = _register
    shield.unregister_state_change_callback = _unregister

    await sensor.async_added_to_hass()
    await sensor.async_will_remove_from_hass()

    assert calls["registered"] == 1
    assert calls["unregistered"] == 1


def test_shield_sensor_extra_state_attributes():
    now = datetime.now()
    shield = DummyShield()
    shield.running = "oig_cloud.set_box_mode"
    shield.pending = {
        "oig_cloud.set_box_mode": {
            "entities": {"sensor.oig_123_box_prms_mode": "Home 2"},
            "original_states": {"sensor.oig_123_box_prms_mode": "Home 1"},
            "called_at": now - timedelta(seconds=30),
        }
    }
    shield.queue = [
        (
            "oig_cloud.set_grid_limit",
            {"limit": 3},
            {"sensor.oig_123_prm1_p_max_feed_grid": "3"},
        )
    ]
    shield.queue_metadata = {
        (
            "oig_cloud.set_grid_limit",
            str({"limit": 3}),
        ): {"queued_at": now - timedelta(seconds=60), "trace_id": "abc"}
    }
    hass = DummyHass(shield)
    hass.states = DummyStates(
        {
            "sensor.oig_123_box_prms_mode": DummyState("Home 1"),
            "sensor.oig_123_prm1_p_max_feed_grid": DummyState("2"),
        }
    )
    coordinator = DummyCoordinator()
    sensor = OigCloudShieldSensor(coordinator, "service_shield_activity")
    sensor.hass = hass

    attrs = sensor.extra_state_attributes
    assert attrs["queue_length"] == 1
    assert attrs["running_count"] == 1
    assert attrs["running_requests"][0]["targets"][0]["param"] == "mode"
    assert attrs["queued_requests"][0]["targets"][0]["param"] == "limit"
    assert attrs["queued_requests"][0]["trace_id"] == "abc"


def test_shield_sensor_extra_state_attributes_grid_limit_running():
    now = datetime.now()
    shield = DummyShield()
    shield.running = "oig_cloud.set_grid_limit"
    shield.pending = {
        "oig_cloud.set_grid_limit": {
            "entities": {"sensor.oig_123_prm1_p_max_feed_grid": "3"},
            "original_states": {"sensor.oig_123_prm1_p_max_feed_grid": "2"},
            "called_at": now - timedelta(seconds=5),
        }
    }
    shield.queue = []
    hass = DummyHass(shield)
    hass.states = DummyStates({"sensor.oig_123_prm1_p_max_feed_grid": DummyState("2")})
    sensor = OigCloudShieldSensor(DummyCoordinator(), "service_shield_activity")
    sensor.hass = hass

    attrs = sensor.extra_state_attributes
    changes = attrs["running_requests"][0]["changes"][0]
    assert "prm1_p_max_feed_grid" in changes


def test_shield_sensor_extra_state_attributes_legacy_queue_meta():
    now = datetime.now()
    shield = DummyShield()
    shield.queue = [
        (
            "oig_cloud.set_box_mode",
            {"mode": "Home 2"},
            {"sensor.oig_123_box_prms_mode": "Home 2"},
        )
    ]
    shield.queue_metadata = {("oig_cloud.set_box_mode", str({"mode": "Home 2"})): "trace"}
    hass = DummyHass(shield)
    hass.states = DummyStates({"sensor.oig_123_box_prms_mode": DummyState("Home 1")})
    sensor = OigCloudShieldSensor(DummyCoordinator(), "service_shield_activity")
    sensor.hass = hass

    attrs = sensor.extra_state_attributes
    assert attrs["queued_requests"][0]["trace_id"] == "trace"
    assert attrs["queued_requests"][0]["queued_at"] is None


def test_shield_sensor_extra_state_attributes_queue_no_targets():
    shield = DummyShield()
    shield.queue = [("oig_cloud.formating_mode", {"mode": "fast"}, {})]
    hass = DummyHass(shield)
    sensor = OigCloudShieldSensor(DummyCoordinator(), "service_shield_activity")
    sensor.hass = hass

    attrs = sensor.extra_state_attributes
    assert attrs["queued_requests"][0]["description"].startswith("Změna")


def test_shield_sensor_extra_state_attributes_mode_reaction():
    shield = DummyShield()
    shield.queue = []
    shield.pending = {}
    shield.mode_tracker = SimpleNamespace(
        get_statistics=lambda: {"a": {"samples": 2}, "b": {"samples": 3}}
    )
    hass = DummyHass(shield)
    sensor = OigCloudShieldSensor(DummyCoordinator(), "mode_reaction_time")
    sensor.hass = hass

    attrs = sensor.extra_state_attributes
    assert attrs["total_samples"] == 5
    assert attrs["tracked_scenarios"] == 2


def test_shield_sensor_extra_state_attributes_error():
    hass = DummyHass(DummyShield())
    sensor = OigCloudShieldSensor(DummyCoordinator(), "service_shield_activity")
    sensor.hass = hass
    sensor.hass.data = {}

    attrs = sensor.extra_state_attributes
    assert "error" in attrs


def test_shield_sensor_unique_id_device_info_available():
    coordinator = SimpleNamespace(forced_box_id="654321")
    sensor = OigCloudShieldSensor(coordinator, "service_shield_status")
    sensor.hass = DummyHass(DummyShield())

    assert "654321" in sensor.unique_id
    assert sensor.device_info["model"] == "Shield"
    assert sensor.available is True


def test_shield_sensor_resolve_box_id_from_title(monkeypatch):
    coordinator = SimpleNamespace(
        forced_box_id="unknown", config_entry=SimpleNamespace(title="Box \\dddddd")
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.shield_sensor.resolve_box_id",
        lambda *_a, **_k: "unknown",
    )
    sensor = OigCloudShieldSensor(coordinator, "service_shield_status")
    sensor.hass = DummyHass(DummyShield())
    assert "dddddd" in sensor.unique_id


def test_shield_sensor_resolve_box_id_regex_error(monkeypatch):
    class BadEntry:
        @property
        def title(self):
            raise RuntimeError("boom")

    coordinator = SimpleNamespace(
        forced_box_id="unknown", config_entry=BadEntry()
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.shield_sensor.resolve_box_id",
        lambda *_a, **_k: "unknown",
    )
    sensor = OigCloudShieldSensor(coordinator, "service_shield_status")
    sensor.hass = DummyHass(DummyShield())

    assert sensor.unique_id.endswith("_unknown_service_shield_status_v2")


def test_shield_sensor_available_false():
    sensor = OigCloudShieldSensor(DummyCoordinator(), "service_shield_status")
    sensor.hass = DummyHass(None)
    assert sensor.available is False
