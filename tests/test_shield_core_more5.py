from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.shield import core as core_module


class DummyServices:
    def __init__(self):
        self.calls = []

    def async_register(self, domain, service, handler, schema=None):
        self.calls.append((domain, service))


class DummyBus:
    def __init__(self):
        self.events = []

    def async_fire(self, event, data, context=None):
        self.events.append((event, data, context))


class DummyHass:
    def __init__(self):
        self.services = DummyServices()
        self.bus = DummyBus()
        self.data = {"core.uuid": "uuid"}
        self.states = SimpleNamespace(get=lambda _eid: None)
        self._tasks = []

    def async_create_task(self, coro):
        self._tasks.append(coro)
        coro.close()
        return object()

    async def async_add_executor_job(self, *_args, **_kwargs):
        return {}


def _make_shield(hass=None, entry=None):
    hass = hass or DummyHass()
    entry = entry or SimpleNamespace(options={"no_telemetry": True}, data={"username": "u"})
    return core_module.ServiceShield(hass, entry)


def test_setup_telemetry_failure_sets_none(monkeypatch):
    hass = DummyHass()
    entry = SimpleNamespace(options={"no_telemetry": False}, data={"username": "u"})
    monkeypatch.setattr(core_module, "setup_simple_telemetry", lambda *_a: 1 / 0)
    shield = core_module.ServiceShield(hass, entry)
    assert shield.telemetry_handler is None
    assert shield.telemetry_logger is None


def test_log_security_event_uses_logger(monkeypatch):
    shield = _make_shield()
    shield._telemetry_handler = object()
    shield._log_security_event("event", {"task_id": "t"})


@pytest.mark.asyncio
async def test_log_telemetry_missing_handler_and_error(monkeypatch):
    shield = _make_shield()
    await shield._log_telemetry("evt", "svc")

    class BadHandler:
        async def send_event(self, **_k):
            raise RuntimeError("boom")

    shield._telemetry_handler = BadHandler()
    await shield._log_telemetry("evt", "svc", {"a": 1})


def test_unregister_and_notify_state_change_error():
    shield = _make_shield()

    def _ok():
        return None

    def _boom():
        raise RuntimeError("fail")

    shield.register_state_change_callback(_ok)
    shield.register_state_change_callback(_boom)
    shield.unregister_state_change_callback(_ok)
    shield._notify_state_change()


def test_setup_state_listener_no_entities(monkeypatch):
    shield = _make_shield()
    shield.pending["svc"] = {"entities": {}}

    called = {"track": False}

    def _track(*_a, **_k):
        called["track"] = True

    monkeypatch.setattr(core_module, "async_track_state_change_event", _track)
    shield._setup_state_listener()
    assert called["track"] is False


def test_on_entity_state_changed_missing_state():
    shield = _make_shield()
    event = SimpleNamespace(data={"entity_id": "sensor.x", "new_state": None})
    shield._on_entity_state_changed(event)


@pytest.mark.asyncio
async def test_register_services_error(monkeypatch):
    shield = _make_shield()

    def _raise(*_a, **_k):
        raise RuntimeError("boom")

    monkeypatch.setattr(shield.hass.services, "async_register", _raise)
    with pytest.raises(RuntimeError):
        await shield.register_services()


@pytest.mark.asyncio
async def test_handle_status_queue_info_delegation(monkeypatch):
    shield = _make_shield()
    calls = {"status": False, "queue": False}

    async def _status(_shield, _call):
        calls["status"] = True

    async def _queue(_shield, _call):
        calls["queue"] = True

    monkeypatch.setattr(core_module.shield_queue, "handle_shield_status", _status)
    monkeypatch.setattr(core_module.shield_queue, "handle_queue_info", _queue)

    await shield._handle_shield_status(SimpleNamespace())
    await shield._handle_queue_info(SimpleNamespace())
    assert calls["status"] and calls["queue"]


@pytest.mark.asyncio
async def test_intercept_and_start_call_delegation(monkeypatch):
    shield = _make_shield()
    calls = {"intercept": False, "start": False}

    async def _intercept(*_a, **_k):
        calls["intercept"] = True

    async def _start(*_a, **_k):
        calls["start"] = True

    monkeypatch.setattr(core_module.shield_dispatch, "intercept_service_call", _intercept)
    monkeypatch.setattr(core_module.shield_dispatch, "start_call", _start)

    await shield.intercept_service_call("d", "s", {}, lambda: None, False, None)
    await shield._start_call("svc", {}, {}, lambda: None, "d", "s", False, None)
    assert calls["intercept"] and calls["start"]


@pytest.mark.asyncio
async def test_cleanup_paths(monkeypatch):
    shield = _make_shield()
    called = {"unsub": False, "closed": False}

    async def _cleanup():
        called["cleanup"] = True

    shield.mode_tracker = SimpleNamespace(cleanup=_cleanup)

    def _unsub():
        called["unsub"] = True

    shield._state_listener_unsub = _unsub

    class DummyTelemetry(logging.Handler):
        async def close(self):
            called["closed"] = True

    handler = DummyTelemetry()
    shield._telemetry_handler = handler
    shield.telemetry_logger = SimpleNamespace(info=lambda *_a, **_k: None)

    shield_logger = logging.getLogger("custom_components.oig_cloud.service_shield")
    shield_logger.addHandler(handler)

    await shield.cleanup()
    assert called["unsub"] is True
    assert called["closed"] is True


@pytest.mark.asyncio
async def test_cleanup_handles_telemetry_error():
    shield = _make_shield()

    class BadTelemetry(logging.Handler):
        async def close(self):
            raise RuntimeError("boom")

    shield._telemetry_handler = BadTelemetry()
    await shield.cleanup()


@pytest.mark.asyncio
async def test_mode_tracker_setup_and_history(monkeypatch):
    hass = DummyHass()
    tracker = core_module.ModeTransitionTracker(hass, "123")
    calls = {"listen": False, "load": False}

    def _track(_hass, _sensor, _cb):
        calls["listen"] = True
        return lambda: None

    async def _load(_sensor_id):
        calls["load"] = True

    monkeypatch.setattr(core_module, "async_track_state_change_event", _track)
    monkeypatch.setattr(tracker, "_async_load_historical_data", _load)
    await tracker.async_setup()
    assert calls["listen"] and calls["load"]


def test_mode_tracker_track_request_same_mode():
    tracker = core_module.ModeTransitionTracker(DummyHass(), "123")
    tracker.track_request("t", "Home 1", "Home 1")
    assert tracker._active_transitions == {}


def test_values_match_and_pending_mode():
    shield = _make_shield()
    assert shield._values_match("1", "1") is True
    shield.has_pending_mode_change()


def test_mode_tracker_async_mode_changed_returns():
    tracker = core_module.ModeTransitionTracker(DummyHass(), "123")
    tracker._async_mode_changed(SimpleNamespace(data={"new_state": None, "old_state": None}))

    same = SimpleNamespace(
        data={
            "new_state": SimpleNamespace(state="Home 1"),
            "old_state": SimpleNamespace(state="Home 1"),
        }
    )
    tracker._async_mode_changed(same)


def test_mode_tracker_async_mode_changed_trims_history(monkeypatch):
    tracker = core_module.ModeTransitionTracker(DummyHass(), "123")
    tracker._max_samples = 1
    tracker._transition_history = {"Home 1→Home 2": [1.0]}
    tracker._active_transitions = {
        "t1": {"from_mode": "Home 1", "to_mode": "Home 2", "start_time": core_module.dt_now()}
    }
    event = SimpleNamespace(
        data={
            "new_state": SimpleNamespace(state="Home 2"),
            "old_state": SimpleNamespace(state="Home 1"),
        }
    )
    tracker._async_mode_changed(event)
    assert len(tracker._transition_history["Home 1→Home 2"]) == 1


def test_mode_tracker_get_statistics_error():
    tracker = core_module.ModeTransitionTracker(DummyHass(), "123")
    tracker._transition_history = {"A→B": ["bad"]}
    stats = tracker.get_statistics()
    assert stats == {}


def test_mode_tracker_get_statistics_empty():
    tracker = core_module.ModeTransitionTracker(DummyHass(), "123")
    tracker._transition_history = {"A→B": []}
    stats = tracker.get_statistics()
    assert stats == {}


def test_mode_tracker_offset_uses_stats():
    tracker = core_module.ModeTransitionTracker(DummyHass(), "123")
    tracker._transition_history = {"A→B": [1.0, 2.0]}
    assert tracker.get_offset_for_scenario("A", "B") == 2.0


@pytest.mark.asyncio
async def test_mode_tracker_load_history_no_states(monkeypatch):
    hass = DummyHass()
    tracker = core_module.ModeTransitionTracker(hass, "123")
    await tracker._async_load_historical_data("sensor.oig_123_box_prms_mode")


@pytest.mark.asyncio
async def test_mode_tracker_load_history_transitions(monkeypatch):
    hass = DummyHass()
    tracker = core_module.ModeTransitionTracker(hass, "123")
    tracker._max_samples = 1

    class DummyState:
        def __init__(self, state, last_changed, attrs=None):
            self.state = state
            self.last_changed = last_changed
            self.attributes = attrs or {}

    now = datetime.now()
    states = {
        "sensor.oig_123_box_prms_mode": [
            DummyState("Home 1", now - timedelta(seconds=30)),
            DummyState("Home 2", now - timedelta(seconds=20)),
            DummyState("Home 1", now - timedelta(seconds=10)),
            DummyState("Home 2", now - timedelta(seconds=5)),
        ]
    }

    async def _executor(_func, *_a, **_k):
        return states

    monkeypatch.setattr(hass, "async_add_executor_job", _executor)

    await tracker._async_load_historical_data("sensor.oig_123_box_prms_mode")
    assert tracker._transition_history


@pytest.mark.asyncio
async def test_mode_tracker_load_history_exception(monkeypatch):
    hass = DummyHass()
    tracker = core_module.ModeTransitionTracker(hass, "123")

    async def _executor(*_a, **_k):
        raise RuntimeError("boom")

    monkeypatch.setattr(hass, "async_add_executor_job", _executor)
    await tracker._async_load_historical_data("sensor.oig_123_box_prms_mode")

@pytest.mark.asyncio
async def test_mode_tracker_async_cleanup():
    tracker = core_module.ModeTransitionTracker(DummyHass(), "123")
    called = {"unsub": False}

    def _unsub():
        called["unsub"] = True

    tracker._state_listener_unsub = _unsub
    await tracker.async_cleanup()
    assert called["unsub"] is True
