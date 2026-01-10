from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.shield import queue as queue_module


class DummyBus:
    def __init__(self):
        self.events = []

    def async_fire(self, event, data):
        self.events.append((event, data))


class DummyState:
    def __init__(self, state):
        self.state = state


class DummyStates:
    def __init__(self, states=None):
        self._states = states or {}

    def get(self, entity_id):
        if entity_id in self._states:
            return DummyState(self._states[entity_id])
        return None


class DummyHass:
    def __init__(self, states=None):
        self.bus = DummyBus()
        self.states = DummyStates(states)


class DummyShield:
    def __init__(self, states=None):
        self.hass = DummyHass(states)
        self.pending = {}
        self.queue = []
        self.queue_metadata = {}
        self.running = None
        self._state_listener_unsub = None
        self._is_checking = False
        self._active_tasks = {}
        self.check_task = None
        self.logged = []
        self.telemetry = []
        self.security_events = []
        self.notified = 0
        self.start_calls = []

    def _normalize_value(self, value):
        return str(value).lower()

    def _get_entity_state(self, entity_id):
        state = self.hass.states.get(entity_id)
        return state.state if state else None

    def _values_match(self, current_value, expected_value):
        return self._normalize_value(current_value) == self._normalize_value(
            expected_value
        )

    async def _log_event(self, *_args, **_kwargs):
        self.logged.append((_args, _kwargs))

    async def _log_telemetry(self, *_args, **_kwargs):
        self.telemetry.append((_args, _kwargs))

    def _log_security_event(self, event_type, details):
        self.security_events.append((event_type, details))

    def _notify_state_change(self):
        self.notified += 1

    async def _start_call(self, *args):
        self.start_calls.append(args)


@pytest.mark.asyncio
async def test_handle_status_and_queue_info():
    shield = DummyShield()
    await queue_module.handle_shield_status(shield, SimpleNamespace())
    await queue_module.handle_queue_info(shield, SimpleNamespace())
    assert shield.hass.bus.events


def test_get_shield_status_variants():
    shield = DummyShield()
    shield.running = "svc"
    assert queue_module.get_shield_status(shield).startswith("Běží:")
    shield.running = None
    shield.queue = [("svc", {}, {}, None, "", "", False, None)]
    assert "Ve frontě" in queue_module.get_shield_status(shield)
    shield.queue = []
    assert queue_module.get_shield_status(shield) == "Neaktivní"


def test_get_queue_info_returns():
    shield = DummyShield()
    shield.queue = [("svc", {}, {}, None, "", "", False, None)]
    info = queue_module.get_queue_info(shield)
    assert info["queue_length"] == 1


def test_has_pending_mode_change_branches():
    shield = DummyShield()
    shield.pending = {"oig_cloud.set_box_mode": {"entities": {}}}
    assert queue_module.has_pending_mode_change(shield) is False

    shield.pending = {"oig_cloud.set_box_mode": {"entities": {"a": "Home 1"}}}
    assert queue_module.has_pending_mode_change(shield) is True

    shield.pending = {}
    shield.queue = [
        ("oig_cloud.set_box_mode", {}, {"a": "Home 2"}, None, "", "", False, None)
    ]
    assert queue_module.has_pending_mode_change(shield, "Home 2") is True

    shield.queue = []
    shield.running = "oig_cloud.set_box_mode"
    assert queue_module.has_pending_mode_change(shield) is True


def test_has_pending_mode_change_matches_target():
    shield = DummyShield()
    shield.queue = [
        ("oig_cloud.set_box_mode", {}, {"mode": "Home 3"}, None, "", "", False, None)
    ]
    assert queue_module.has_pending_mode_change(shield, "Home 3") is True

    shield.queue = [
        ("oig_cloud.set_box_mode", {}, {"mode": "Home 1"}, None, "", "", False, None)
    ]
    assert queue_module.has_pending_mode_change(shield, "Home 3") is False


@pytest.mark.asyncio
async def test_check_loop_timeout_and_power_monitor_variants(monkeypatch):
    shield = DummyShield(states={"sensor.power": "unknown", "sensor.bad": "bad"})
    shield.pending = {
        "svc": {
            "called_at": datetime.now() - timedelta(minutes=20),
            "params": {},
            "entities": {"sensor.x": "on"},
        },
        "svc_power_missing": {
            "called_at": datetime.now(),
            "params": {},
            "entities": {"sensor.x": "on"},
            "power_monitor": {
                "entity_id": "sensor.missing",
                "last_power": 0.0,
                "is_going_to_home_ups": True,
                "threshold_kw": 1.0,
            },
        },
        "svc_power_unknown": {
            "called_at": datetime.now(),
            "params": {},
            "entities": {"sensor.x": "on"},
            "power_monitor": {
                "entity_id": "sensor.power",
                "last_power": 0.0,
                "is_going_to_home_ups": True,
                "threshold_kw": 1.0,
            },
        },
        "svc_power_bad": {
            "called_at": datetime.now(),
            "params": {},
            "entities": {"sensor.x": "on"},
            "power_monitor": {
                "entity_id": "sensor.bad",
                "last_power": 0.0,
                "is_going_to_home_ups": True,
                "threshold_kw": 1.0,
            },
        },
        "svc_fake": {
            "called_at": datetime.now(),
            "params": {},
            "entities": {"fake_formating_mode_1": "x"},
        },
        "svc_norm": {
            "called_at": datetime.now(),
            "params": {},
            "entities": {
                "sensor.oig_1_invertor_prm1_p_max_feed_grid": "bad",
                "binary_sensor.oig_1_invertor_prms_to_grid": "omezeno",
                "sensor.oig_1_other": "on",
            },
        },
    }

    shield.hass.states = DummyStates(
        {
            "sensor.oig_1_invertor_prm1_p_max_feed_grid": "bad",
            "binary_sensor.oig_1_invertor_prms_to_grid": "zapnuto",
            "sensor.oig_1_other": "off",
        }
    )

    await queue_module.check_loop(shield, datetime.now())
    assert shield.notified >= 1


@pytest.mark.asyncio
async def test_check_loop_power_monitor_unknown_only():
    shield = DummyShield(states={"sensor.power": "unknown"})
    shield.pending = {
        "svc_power_unknown": {
            "called_at": datetime.now(),
            "params": {},
            "entities": {"sensor.x": "on"},
            "power_monitor": {
                "entity_id": "sensor.power",
                "last_power": 0.0,
                "is_going_to_home_ups": True,
                "threshold_kw": 1.0,
            },
        }
    }
    await queue_module.check_loop(shield, datetime.now())


@pytest.mark.asyncio
async def test_check_loop_power_monitor_drop_and_error():
    shield = DummyShield(states={"sensor.power": "0", "sensor.bad": "bad"})
    shield.pending = {
        "svc_power_drop": {
            "called_at": datetime.now(),
            "params": {},
            "entities": {"sensor.x": "on"},
            "power_monitor": {
                "entity_id": "sensor.power",
                "last_power": 2000.0,
                "is_going_to_home_ups": False,
                "threshold_kw": 1.0,
            },
        },
        "svc_power_error": {
            "called_at": datetime.now(),
            "params": {},
            "entities": {"sensor.x": "on"},
            "power_monitor": {
                "entity_id": "sensor.bad",
                "last_power": 0.0,
                "is_going_to_home_ups": False,
                "threshold_kw": 1.0,
            },
        },
    }
    await queue_module.check_loop(shield, datetime.now())


@pytest.mark.asyncio
async def test_check_loop_invertor_prm1_rounding_success():
    shield = DummyShield(states={"sensor.oig_1_invertor_prm1_p_max_feed_grid": "10.4"})
    shield.pending = {
        "svc_norm": {
            "called_at": datetime.now(),
            "params": {},
            "entities": {"sensor.oig_1_invertor_prm1_p_max_feed_grid": "10.2"},
        }
    }
    await queue_module.check_loop(shield, datetime.now())


def test_start_monitoring_warning_when_done(monkeypatch):
    shield = DummyShield()

    class DummyTask:
        def done(self):
            return True

        def cancelled(self):
            return False

    shield.check_task = DummyTask()
    def _create_task(coro):
        coro.close()
        return DummyTask()

    monkeypatch.setattr(queue_module.asyncio, "create_task", _create_task)
    queue_module.start_monitoring(shield)
    assert shield.check_task is not None


@pytest.mark.asyncio
async def test_async_check_loop_hits_sleep(monkeypatch):
    shield = DummyShield()
    calls = {"sleep": 0}

    async def _sleep(_s):
        calls["sleep"] += 1
        raise asyncio.CancelledError()

    async def _check_loop(*_a, **_k):
        return None

    monkeypatch.setattr(queue_module, "check_loop", _check_loop)
    monkeypatch.setattr(queue_module.asyncio, "sleep", _sleep)

    with pytest.raises(asyncio.CancelledError):
        await queue_module.async_check_loop(shield)
    assert calls["sleep"] == 1
