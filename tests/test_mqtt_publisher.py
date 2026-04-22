from __future__ import annotations

import asyncio
import importlib.util
import json
import sys
from pathlib import Path
from typing import Any

import pytest


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "custom_components" / "oig_cloud" / "shared" / "mqtt_publisher.py"
_MODULE_COUNTER = 0


def _load_module():
    global _MODULE_COUNTER

    assert MODULE_PATH.exists(), "Expected MQTT publisher module to exist"

    _MODULE_COUNTER += 1
    module_name = f"test_mqtt_publisher_module_{_MODULE_COUNTER}"
    spec = importlib.util.spec_from_file_location(module_name, MODULE_PATH)
    assert spec is not None and spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


class FakeMessageInfo:
    def __init__(self, rc: int) -> None:
        self.rc = rc
        self.wait_for_publish_calls = 0

    def wait_for_publish(self, *_args: Any, **_kwargs: Any) -> None:
        self.wait_for_publish_calls += 1


class FakeClient:
    def __init__(self) -> None:
        self.on_connect = None
        self.on_disconnect = None
        self.connect_async_calls: list[tuple[str, int, int]] = []
        self.loop_start_calls = 0
        self.loop_stop_calls = 0
        self.disconnect_calls = 0
        self.close_calls = 0
        self.publish_calls: list[dict[str, Any]] = []
        self.next_publish_rc = 0

    def connect_async(self, host: str, port: int, keepalive: int) -> None:
        self.connect_async_calls.append((host, port, keepalive))

    def loop_start(self) -> None:
        self.loop_start_calls += 1

    def loop_stop(self) -> None:
        self.loop_stop_calls += 1

    def disconnect(self) -> None:
        self.disconnect_calls += 1

    def close(self) -> None:
        self.close_calls += 1

    def publish(self, topic: str, payload: str, qos: int, retain: bool) -> FakeMessageInfo:
        info = FakeMessageInfo(self.next_publish_rc)
        self.publish_calls.append(
            {
                "topic": topic,
                "payload": payload,
                "qos": qos,
                "retain": retain,
                "info": info,
            }
        )
        return info

    def trigger_connect(self, rc: int = 0) -> None:
        if self.on_connect is not None:
            self.on_connect(self, None, {}, rc)

    def trigger_disconnect(self, rc: int = 1) -> None:
        if self.on_disconnect is not None:
            self.on_disconnect(self, None, rc)


def _make_event(*, event_name: str = "incident_auth_failed", device_id: str = "2206237016") -> dict[str, Any]:
    return {
        "schema_version": "1",
        "source_product": "oig_cloud",
        "event_class": "incident",
        "event_name": event_name,
        "occurred_at": "2026-04-20T12:34:56Z",
        "device_id": device_id,
        "install_id_hash": "a" * 64,
        "integration_version": "2.3.35",
        "run_id": "run-1",
        "correlation_id": "corr-1",
        "result": "failed",
        "severity": "error",
        "detail_error_class": "RuntimeError",
    }


async def _wait_for(condition, timeout: float = 0.5) -> None:
    deadline = asyncio.get_running_loop().time() + timeout
    while asyncio.get_running_loop().time() < deadline:
        if condition():
            return
        await asyncio.sleep(0)
    raise AssertionError("condition was not met before timeout")


@pytest.mark.asyncio
async def test_emit_cloud_event_enqueues_without_waiting_for_delivery() -> None:
    module = _load_module()
    client = FakeClient()
    publisher = module.CloudMqttPublisher(
        entry_id="entry-1",
        host="mqtt.internal",
        port=1883,
        topic_prefix="oig/cloud-telemetry",
        client_factory=lambda: client,
        publish_ready_timeout=0.1,
    )

    assert await publisher.async_start() is True

    event = _make_event()
    assert publisher.emit_cloud_event(event) is True
    assert client.publish_calls == []

    client.trigger_connect()
    await _wait_for(lambda: len(client.publish_calls) == 1)

    await publisher.async_shutdown()


@pytest.mark.asyncio
async def test_emit_cloud_event_accepts_serialized_payload() -> None:
    module = _load_module()
    client = FakeClient()
    publisher = module.CloudMqttPublisher(
        entry_id="entry-1",
        host="mqtt.internal",
        port=1883,
        topic_prefix="oig/cloud-telemetry",
        client_factory=lambda: client,
    )

    assert await publisher.async_start() is True
    client.trigger_connect()

    payload = json.dumps(_make_event(event_name="incident_retry_exhausted"))
    assert publisher.emit_cloud_event(payload) is True
    await _wait_for(lambda: len(client.publish_calls) == 1)

    assert json.loads(client.publish_calls[0]["payload"])["event_name"] == "incident_retry_exhausted"

    await publisher.async_shutdown()


@pytest.mark.asyncio
async def test_worker_publishes_to_exact_device_topic_with_qos1_and_no_retain() -> None:
    module = _load_module()
    client = FakeClient()
    publisher = module.CloudMqttPublisher(
        entry_id="entry-1",
        host="mqtt.internal",
        port=1883,
        topic_prefix="oig/cloud-telemetry",
        client_factory=lambda: client,
    )

    assert await publisher.async_start() is True
    client.trigger_connect()

    assert publisher.emit_cloud_event(_make_event()) is True
    await _wait_for(lambda: len(client.publish_calls) == 1)

    publish_call = client.publish_calls[0]
    assert client.connect_async_calls == [("mqtt.internal", 1883, 60)]
    assert client.loop_start_calls == 1
    assert publish_call["topic"] == "oig/cloud-telemetry/2206237016"
    assert publish_call["qos"] == 1
    assert publish_call["retain"] is False
    assert json.loads(publish_call["payload"])["device_id"] == "2206237016"
    assert publish_call["info"].wait_for_publish_calls == 0
    assert publisher.stats["publish_successes"] == 1

    await publisher.async_shutdown()


@pytest.mark.asyncio
async def test_invalid_prefix_is_normalized_to_exact_cloud_topic() -> None:
    module = _load_module()
    client = FakeClient()
    publisher = module.CloudMqttPublisher(
        entry_id="entry-1",
        host="mqtt.internal",
        port=1883,
        topic_prefix="oig/telemetry",
        client_factory=lambda: client,
    )

    assert await publisher.async_start() is True
    client.trigger_connect()

    assert publisher.emit_cloud_event(_make_event()) is True
    await _wait_for(lambda: len(client.publish_calls) == 1)

    assert client.publish_calls[0]["topic"] == "oig/cloud-telemetry/2206237016"

    await publisher.async_shutdown()


@pytest.mark.asyncio
async def test_emit_cloud_event_rejects_missing_device_id_without_placeholder_topic() -> None:
    module = _load_module()
    client = FakeClient()
    publisher = module.CloudMqttPublisher(
        entry_id="entry-1",
        host="mqtt.internal",
        port=1883,
        topic_prefix="oig/cloud-telemetry",
        client_factory=lambda: client,
    )

    assert await publisher.async_start() is True
    assert publisher.emit_cloud_event(_make_event(device_id="")) is False
    await asyncio.sleep(0)
    assert client.publish_calls == []

    await publisher.async_shutdown()


@pytest.mark.asyncio
async def test_emit_cloud_event_rejects_non_numeric_device_id() -> None:
    module = _load_module()
    client = FakeClient()
    publisher = module.CloudMqttPublisher(
        entry_id="entry-1",
        host="mqtt.internal",
        port=1883,
        topic_prefix="oig/cloud-telemetry",
        client_factory=lambda: client,
    )

    assert await publisher.async_start() is True
    assert publisher.emit_cloud_event(_make_event(device_id="2206/237016")) is False
    await asyncio.sleep(0)
    assert client.publish_calls == []

    await publisher.async_shutdown()


@pytest.mark.asyncio
async def test_queue_overflow_drops_oldest_with_rate_limited_warning(caplog: pytest.LogCaptureFixture) -> None:
    module = _load_module()
    client = FakeClient()
    publisher = module.CloudMqttPublisher(
        entry_id="entry-1",
        host="mqtt.internal",
        port=1883,
        topic_prefix="oig/cloud-telemetry",
        client_factory=lambda: client,
        queue_maxsize=1,
        publish_ready_timeout=60,
        overflow_warning_cooldown=3600,
    )

    assert await publisher.async_start() is True

    caplog.set_level("WARNING")

    assert publisher.emit_cloud_event(_make_event(event_name="incident_auth_failed")) is True
    await asyncio.sleep(0)
    assert publisher.emit_cloud_event(_make_event(event_name="incident_retry_exhausted")) is True
    assert publisher.emit_cloud_event(_make_event(event_name="incident_fallback_cloud_to_local")) is True
    assert publisher.emit_cloud_event(_make_event(event_name="incident_fallback_local_to_cloud")) is True

    client.trigger_connect()
    await _wait_for(lambda: len(client.publish_calls) == 2)

    published_event_names = [
        json.loads(call["payload"])["event_name"] for call in client.publish_calls
    ]
    assert published_event_names == [
        "incident_auth_failed",
        "incident_fallback_local_to_cloud",
    ]
    assert publisher.stats["dropped_overflow"] == 2
    assert sum("queue full" in message.lower() for message in caplog.messages) == 1

    await publisher.async_shutdown()


@pytest.mark.asyncio
async def test_first_overflow_logs_warning_immediately(caplog: pytest.LogCaptureFixture) -> None:
    module = _load_module()
    client = FakeClient()
    publisher = module.CloudMqttPublisher(
        entry_id="entry-1",
        host="mqtt.internal",
        port=1883,
        topic_prefix="oig/cloud-telemetry",
        client_factory=lambda: client,
        queue_maxsize=1,
        publish_ready_timeout=60,
        overflow_warning_cooldown=300,
        monotonic=lambda: 0.0,
    )

    assert await publisher.async_start() is True

    caplog.set_level("WARNING")

    assert publisher.emit_cloud_event(_make_event(event_name="incident_auth_failed")) is True
    await asyncio.sleep(0)
    assert publisher.emit_cloud_event(_make_event(event_name="incident_retry_exhausted")) is True
    assert publisher.emit_cloud_event(_make_event(event_name="incident_fallback_cloud_to_local")) is True

    assert any("queue full" in message.lower() for message in caplog.messages)

    await publisher.async_shutdown()


@pytest.mark.asyncio
async def test_async_shutdown_drops_remaining_queue_and_closes_client(caplog: pytest.LogCaptureFixture) -> None:
    module = _load_module()
    client = FakeClient()
    publisher = module.CloudMqttPublisher(
        entry_id="entry-1",
        host="mqtt.internal",
        port=1883,
        topic_prefix="oig/cloud-telemetry",
        client_factory=lambda: client,
        queue_maxsize=5,
        publish_ready_timeout=60,
    )

    assert await publisher.async_start() is True

    caplog.set_level("INFO")

    assert publisher.emit_cloud_event(_make_event(event_name="incident_auth_failed")) is True
    await asyncio.sleep(0)
    assert publisher.emit_cloud_event(_make_event(event_name="incident_retry_exhausted")) is True
    assert publisher.emit_cloud_event(_make_event(event_name="incident_fallback_cloud_to_local")) is True

    await publisher.async_shutdown()

    assert publisher.emit_cloud_event(_make_event()) is False
    assert client.publish_calls == []
    assert client.loop_stop_calls == 1
    assert client.disconnect_calls == 1
    assert client.close_calls == 1
    assert publisher.stats["dropped_unload"] == 2
    assert any("dropped 2 queued mqtt telemetry events during unload" in message.lower() for message in caplog.messages)


@pytest.mark.asyncio
async def test_publish_failure_after_enqueue_is_recorded_without_reaching_caller(caplog: pytest.LogCaptureFixture) -> None:
    module = _load_module()
    client = FakeClient()
    client.next_publish_rc = 4
    publisher = module.CloudMqttPublisher(
        entry_id="entry-1",
        host="mqtt.internal",
        port=1883,
        topic_prefix="oig/cloud-telemetry",
        client_factory=lambda: client,
    )

    assert await publisher.async_start() is True
    client.trigger_connect()

    caplog.set_level("WARNING")

    assert publisher.emit_cloud_event(_make_event()) is True
    await _wait_for(lambda: len(client.publish_calls) == 1)

    assert publisher.stats["publish_successes"] == 0
    assert publisher.stats["publish_failures"] == 1
    assert any("mqtt publish failed" in message.lower() for message in caplog.messages)

    await publisher.async_shutdown()
