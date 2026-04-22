from __future__ import annotations

import asyncio
import hashlib
import logging
from types import SimpleNamespace
from unittest.mock import AsyncMock

from custom_components.oig_cloud.shield import dispatch as dispatch_module
from custom_components.oig_cloud.shield import queue as queue_module
from custom_components.oig_cloud.shield import validation as validation_module


INSTALL_ID_HASH = hashlib.sha256(b"core-uuid").hexdigest()
COMMON_SHIELD_KEYS = {
    "schema_version",
    "source_product",
    "event_class",
    "event_name",
    "occurred_at",
    "device_id",
    "install_id_hash",
    "integration_version",
    "run_id",
    "correlation_id",
    "result",
    "severity",
    "metric_timeout_minutes",
    "metric_entity_count",
    "metric_expected_change_count",
    "metric_queue_depth",
    "metric_guard_active",
    "detail_service_name",
    "detail_result_reason",
    "detail_duplicate_location",
}
RESERVED_EVENT_NAMES = {"shield_call_blocked", "shield_override_applied"}


class DummyState:
    def __init__(self, entity_id: str, state: str) -> None:
        self.entity_id = entity_id
        self.state = state


class DummyStates:
    def __init__(self, states: list[DummyState]) -> None:
        self._states = {state.entity_id: state for state in states}

    def get(self, entity_id: str):
        return self._states.get(entity_id)


class DummyHass:
    def __init__(self, states: DummyStates | None = None) -> None:
        self.states = states or DummyStates([])
        self.data = {"oig_cloud": {}, "core.uuid": "core-uuid"}

    def async_create_task(self, task):
        return task


class RecordingEmitter:
    def __init__(self, *, should_raise: bool = False) -> None:
        self.should_raise = should_raise
        self.cloud_events: list[dict[str, object]] = []

    async def emit_cloud_event(self, event):
        if self.should_raise:
            raise RuntimeError("cloud sink boom")
        self.cloud_events.append(dict(event))
        return True


class DummyShield:
    def __init__(
        self,
        hass: DummyHass,
        entry: SimpleNamespace,
        *,
        expected_entities: dict[str, str],
        emitter: RecordingEmitter | None = None,
        expected_entity_missing: bool = False,
    ) -> None:
        self.hass = hass
        self.entry = entry
        self.queue: list[tuple[object, ...]] = []
        self.pending: dict[str, dict[str, object]] = {}
        self.running = None
        self.queue_metadata: dict[tuple[str, str], dict[str, object]] = {}
        self.last_checked_entity_id = None
        self._is_checking = False
        self._expected_entity_missing = expected_entity_missing
        self._telemetry_emitter = emitter
        self.extract_expected_entities = lambda _service_name, _params: expected_entities
        self._extract_api_info = lambda _service_name, _params: {}
        self._log_security_event = lambda *_args, **_kwargs: None
        self._notify_state_change = lambda: None
        self._check_loop = lambda _when: None
        self._log_event = AsyncMock()
        self._log_telemetry = AsyncMock()

    def _normalize_value(self, value):
        return validation_module.normalize_value(value)


def _entry() -> SimpleNamespace:
    return SimpleNamespace(entry_id="entry-1", options={"box_id": "123"}, data={})


def _assert_event_shape(
    event: dict[str, object],
    *,
    event_name: str,
    result: str,
    service_name: str,
    correlation_id: str,
) -> None:
    assert event["schema_version"] == "1"
    assert event["source_product"] == "oig_cloud"
    assert event["event_class"] == "shield"
    assert event["event_name"] == event_name
    assert event["device_id"] == "123"
    assert event["install_id_hash"] == INSTALL_ID_HASH
    assert event["integration_version"] == "2.3.35"
    assert event["run_id"] == "na"
    assert event["correlation_id"] == correlation_id
    assert event["result"] == result
    assert event["detail_service_name"] == service_name
    assert RESERVED_EVENT_NAMES.isdisjoint({event["event_name"]})
    assert set(event).issubset(COMMON_SHIELD_KEYS)
    assert "params" not in event
    assert "entities" not in event
    assert "expected_entities" not in event


def test_intercept_service_call_emits_allowed_cloud_event_when_request_proceeds(monkeypatch):
    emitter = RecordingEmitter()
    shield = DummyShield(
        DummyHass(DummyStates([DummyState("sensor.oig_123_box_prms_mode", "Home")])),
        _entry(),
        expected_entities={"sensor.oig_123_box_prms_mode": "Home 1"},
        emitter=emitter,
    )
    enqueue_mock = AsyncMock()

    monkeypatch.setattr(dispatch_module.uuid, "uuid4", lambda: "corr1234")
    monkeypatch.setattr(dispatch_module, "_enqueue_or_run", enqueue_mock)

    asyncio.run(
        dispatch_module.intercept_service_call(
            shield,
            "oig_cloud",
            "set_box_mode",
            {"params": {"mode": "home_1"}},
            AsyncMock(),
            False,
            None,
        )
    )

    enqueue_mock.assert_awaited_once()
    assert len(emitter.cloud_events) == 1

    event = emitter.cloud_events[0]
    _assert_event_shape(
        event,
        event_name="shield_call_allowed",
        result="allowed",
        service_name="oig_cloud.set_box_mode",
        correlation_id="corr1234",
    )
    assert event["metric_entity_count"] == 1
    assert event["metric_expected_change_count"] == 1
    assert event["metric_queue_depth"] == 0
    assert event["metric_guard_active"] is True


def test_intercept_service_call_emits_allowed_bypass_event_for_missing_entity(monkeypatch):
    emitter = RecordingEmitter()
    shield = DummyShield(
        DummyHass(),
        _entry(),
        expected_entities={},
        emitter=emitter,
        expected_entity_missing=True,
    )
    original_call = AsyncMock()

    monkeypatch.setattr(dispatch_module.uuid, "uuid4", lambda: "corr5678")

    asyncio.run(
        dispatch_module.intercept_service_call(
            shield,
            "oig_cloud",
            "set_box_mode",
            {"params": {"mode": "home_1"}},
            original_call,
            False,
            None,
        )
    )

    original_call.assert_awaited_once()
    assert len(emitter.cloud_events) == 1

    event = emitter.cloud_events[0]
    _assert_event_shape(
        event,
        event_name="shield_call_allowed",
        result="allowed",
        service_name="oig_cloud.set_box_mode",
        correlation_id="corr5678",
    )
    assert event["detail_result_reason"] == "entity_not_found"
    assert event["metric_entity_count"] == 0
    assert event["metric_expected_change_count"] == 0
    assert event["metric_guard_active"] is False


def test_intercept_service_call_emits_guardrail_event_when_change_already_completed(monkeypatch):
    emitter = RecordingEmitter()
    shield = DummyShield(
        DummyHass(DummyStates([DummyState("sensor.oig_123_box_prms_mode", "Home 1")])),
        _entry(),
        expected_entities={"sensor.oig_123_box_prms_mode": "Home 1"},
        emitter=emitter,
    )
    original_call = AsyncMock()

    monkeypatch.setattr(dispatch_module.uuid, "uuid4", lambda: "guard123")

    asyncio.run(
        dispatch_module.intercept_service_call(
            shield,
            "oig_cloud",
            "set_box_mode",
            {"params": {"mode": "home_1"}},
            original_call,
            False,
            None,
        )
    )

    original_call.assert_not_awaited()
    assert len(emitter.cloud_events) == 1

    event = emitter.cloud_events[0]
    _assert_event_shape(
        event,
        event_name="shield_guardrail_triggered",
        result="guardrail",
        service_name="oig_cloud.set_box_mode",
        correlation_id="guard123",
    )
    assert event["detail_result_reason"] == "already_completed"
    assert event["metric_guard_active"] is True


def test_intercept_service_call_emits_duplicate_blocked_event(monkeypatch):
    emitter = RecordingEmitter()
    shield = DummyShield(
        DummyHass(DummyStates([DummyState("sensor.oig_123_box_prms_mode", "Home")])),
        _entry(),
        expected_entities={"sensor.oig_123_box_prms_mode": "Home 1"},
        emitter=emitter,
    )
    shield.queue.append(
        (
            "oig_cloud.set_box_mode",
            {"mode": "home_1"},
            {"sensor.oig_123_box_prms_mode": "Home 1"},
            None,
            "oig_cloud",
            "set_box_mode",
            False,
            None,
        )
    )

    monkeypatch.setattr(dispatch_module.uuid, "uuid4", lambda: "dupe1234")

    asyncio.run(
        dispatch_module.intercept_service_call(
            shield,
            "oig_cloud",
            "set_box_mode",
            {"params": {"mode": "home_1"}},
            AsyncMock(),
            False,
            None,
        )
    )

    assert len(emitter.cloud_events) == 1

    event = emitter.cloud_events[0]
    _assert_event_shape(
        event,
        event_name="shield_duplicate_blocked",
        result="duplicate",
        service_name="oig_cloud.set_box_mode",
        correlation_id="dupe1234",
    )
    assert event["detail_result_reason"] == "duplicate_in_queue"
    assert event["detail_duplicate_location"] == "queue"
    assert event["metric_queue_depth"] == 1


def test_handle_timeout_emits_timeout_cloud_event_and_warning_marker(caplog):
    emitter = RecordingEmitter()
    shield = DummyShield(
        DummyHass(),
        _entry(),
        expected_entities={"sensor.oig_123_box_prms_mode": "Home 1"},
        emitter=emitter,
    )
    info = {
        "params": {"mode": "home_1"},
        "entities": {"sensor.oig_123_box_prms_mode": "Home 1"},
        "original_states": {},
        "trace_id": "time1234",
    }

    with caplog.at_level(logging.WARNING):
        asyncio.run(queue_module._handle_timeout(shield, "oig_cloud.set_box_mode", info))

    assert len(emitter.cloud_events) == 1

    event = emitter.cloud_events[0]
    _assert_event_shape(
        event,
        event_name="shield_call_timeout",
        result="timeout",
        service_name="oig_cloud.set_box_mode",
        correlation_id="time1234",
    )
    assert event["detail_result_reason"] == "timeout_exceeded"
    assert event["metric_timeout_minutes"] == 15
    assert (
        "[OIG_CLOUD_WARNING][component=shield][corr=time1234][run=na]" in caplog.text
    )


def test_allow_path_stays_non_blocking_when_cloud_emitter_raises(monkeypatch, caplog):
    shield = DummyShield(
        DummyHass(DummyStates([DummyState("sensor.oig_123_box_prms_mode", "Home")])),
        _entry(),
        expected_entities={"sensor.oig_123_box_prms_mode": "Home 1"},
        emitter=RecordingEmitter(should_raise=True),
    )
    enqueue_mock = AsyncMock()

    monkeypatch.setattr(dispatch_module.uuid, "uuid4", lambda: "fail1234")
    monkeypatch.setattr(dispatch_module, "_enqueue_or_run", enqueue_mock)

    with caplog.at_level(logging.WARNING):
        asyncio.run(
            dispatch_module.intercept_service_call(
                shield,
                "oig_cloud",
                "set_box_mode",
                {"params": {"mode": "home_1"}},
                AsyncMock(),
                False,
                None,
            )
        )

    enqueue_mock.assert_awaited_once()
    assert (
        "[OIG_CLOUD_WARNING][component=shield][corr=fail1234][run=na]" in caplog.text
    )
