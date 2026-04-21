"""MQTT publisher adapter for cloud telemetry events."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

try:
    import paho.mqtt.client as mqtt
except ImportError:  # pragma: no cover - exercised through startup failure path
    mqtt = None  # type: ignore[assignment]


_LOGGER = logging.getLogger(__name__)

_DEFAULT_KEEPALIVE = 60
_DEFAULT_QUEUE_MAXSIZE = 100
_DEFAULT_PUBLISH_READY_TIMEOUT = 1.0
_DEFAULT_OVERFLOW_WARNING_COOLDOWN = 300.0
_EXACT_CLOUD_TOPIC_PREFIX = "oig/cloud-telemetry"


@dataclass(slots=True)
class _QueuedCloudEvent:
    topic: str
    payload: str


class CloudMqttPublisher:
    """Best-effort MQTT publisher for validated cloud telemetry events."""

    def __init__(
        self,
        *,
        entry_id: str,
        host: str,
        port: int,
        topic_prefix: str,
        client_factory: Callable[[], Any] | None = None,
        queue_maxsize: int = _DEFAULT_QUEUE_MAXSIZE,
        publish_ready_timeout: float = _DEFAULT_PUBLISH_READY_TIMEOUT,
        overflow_warning_cooldown: float = _DEFAULT_OVERFLOW_WARNING_COOLDOWN,
        monotonic: Callable[[], float] | None = None,
    ) -> None:
        self._entry_id = entry_id
        self._host = host
        self._port = port
        self._topic_prefix = self._normalize_topic_prefix(topic_prefix)
        self._client_factory = client_factory
        self._queue: asyncio.Queue[_QueuedCloudEvent] = asyncio.Queue(
            maxsize=queue_maxsize
        )
        self._publish_ready_timeout = publish_ready_timeout
        self._overflow_warning_cooldown = overflow_warning_cooldown
        self._monotonic = monotonic or time.monotonic

        self._client: Any | None = None
        self._worker_task: asyncio.Task[None] | None = None
        self._connected = asyncio.Event()
        self._accepting = False
        self._started = False
        self._stopped = False

        self._last_overflow_warning_ts: float | None = None
        self._not_ready_warning_emitted = False

        self._stats = {
            "enqueued": 0,
            "publish_successes": 0,
            "publish_failures": 0,
            "dropped_overflow": 0,
            "dropped_unready": 0,
            "dropped_unload": 0,
        }

    @property
    def stats(self) -> dict[str, int]:
        """Return a copy of publisher counters."""
        return dict(self._stats)

    async def async_start(self) -> bool:
        """Create the client, start the network loop, and launch the worker."""
        if self._started:
            return True
        if self._stopped:
            return False
        if not self._host:
            _LOGGER.debug(
                "MQTT publisher not started for entry %s because host is empty",
                self._entry_id,
            )
            return False

        try:
            client = self._build_client()
            client.on_connect = self._handle_connect
            client.on_disconnect = self._handle_disconnect
            client.connect_async(self._host, self._port, _DEFAULT_KEEPALIVE)
            client.loop_start()
            self._client = client
            self._worker_task = asyncio.create_task(
                self._run_worker(),
                name=f"oig-cloud-mqtt-publisher-{self._entry_id}",
            )
        except Exception as err:
            _LOGGER.warning(
                "Failed to start MQTT publisher for entry %s: %s",
                self._entry_id,
                err,
            )
            self._client = None
            return False

        self._accepting = True
        self._started = True
        return True

    def emit_cloud_event(self, event: str | Mapping[str, Any]) -> bool:
        """Serialize and enqueue a single cloud telemetry event."""
        if not self._accepting:
            return False

        prepared_event = self._prepare_event(event)
        if prepared_event is None:
            return False

        self._enqueue(
            _QueuedCloudEvent(
                topic=f"{self._topic_prefix}/{prepared_event[0]}",
                payload=prepared_event[1],
            )
        )
        self._stats["enqueued"] += 1
        return True

    async def async_shutdown(self) -> None:
        """Stop the worker, drop queued events, and close the client."""
        if self._stopped:
            return

        self._stopped = True
        self._accepting = False

        worker_task = self._worker_task
        self._worker_task = None
        if worker_task is not None:
            worker_task.cancel()
            try:
                await worker_task
            except asyncio.CancelledError:
                pass

        dropped_count = self._drop_remaining_queue()
        if dropped_count > 0:
            self._stats["dropped_unload"] += dropped_count
            _LOGGER.info(
                "Dropped %s queued MQTT telemetry events during unload for entry %s",
                dropped_count,
                self._entry_id,
            )

        client = self._client
        self._client = None
        self._connected.clear()

        if client is None:
            return

        self._safe_client_call(client, "loop_stop")
        self._safe_client_call(client, "disconnect")
        self._safe_close_client(client)

    def _build_client(self) -> Any:
        if self._client_factory is not None:
            return self._client_factory()
        if mqtt is None:
            raise RuntimeError("paho-mqtt is not available")
        return mqtt.Client()

    def _enqueue(self, queued_event: _QueuedCloudEvent) -> None:
        try:
            self._queue.put_nowait(queued_event)
            return
        except asyncio.QueueFull:
            oldest_event = self._queue.get_nowait()
            self._queue.task_done()
            self._stats["dropped_overflow"] += 1
            self._log_overflow_warning(oldest_event.topic)

        self._queue.put_nowait(queued_event)

    def _log_overflow_warning(self, dropped_topic: str) -> None:
        now = self._monotonic()
        if (
            self._last_overflow_warning_ts is not None
            and now - self._last_overflow_warning_ts < self._overflow_warning_cooldown
        ):
            return

        self._last_overflow_warning_ts = now
        _LOGGER.warning(
            "Cloud MQTT queue full for entry %s; dropped oldest queued event for topic %s",
            self._entry_id,
            dropped_topic,
        )

    async def _run_worker(self) -> None:
        try:
            while True:
                queued_event = await self._queue.get()
                try:
                    await self._publish_event(queued_event)
                finally:
                    self._queue.task_done()
        except asyncio.CancelledError:
            raise

    async def _publish_event(self, queued_event: _QueuedCloudEvent) -> None:
        client = self._client
        if client is None:
            self._stats["publish_failures"] += 1
            return

        if not await self._wait_until_connected():
            self._stats["dropped_unready"] += 1
            return

        try:
            message_info = client.publish(
                queued_event.topic,
                queued_event.payload,
                qos=1,
                retain=False,
            )
        except Exception as err:
            self._stats["publish_failures"] += 1
            _LOGGER.warning(
                "MQTT publish failed for entry %s topic %s: %s",
                self._entry_id,
                queued_event.topic,
                err,
            )
            return

        if getattr(message_info, "rc", None) == self._mqtt_success_code():
            self._stats["publish_successes"] += 1
            return

        self._stats["publish_failures"] += 1
        _LOGGER.warning(
            "MQTT publish failed for entry %s topic %s: rc=%s",
            self._entry_id,
            queued_event.topic,
            getattr(message_info, "rc", None),
        )

    async def _wait_until_connected(self) -> bool:
        if self._connected.is_set():
            return True

        try:
            await asyncio.wait_for(
                self._connected.wait(),
                timeout=self._publish_ready_timeout,
            )
            return True
        except TimeoutError:
            if not self._not_ready_warning_emitted:
                _LOGGER.warning(
                    "MQTT client not ready within %.1fs for entry %s; dropping event",
                    self._publish_ready_timeout,
                    self._entry_id,
                )
                self._not_ready_warning_emitted = True
            return False

    def _handle_connect(
        self,
        _client: Any,
        _userdata: Any,
        _flags: Any,
        rc: Any,
        _properties: Any = None,
    ) -> None:
        if rc == self._mqtt_success_code():
            self._connected.set()
            self._not_ready_warning_emitted = False

    def _handle_disconnect(
        self,
        _client: Any,
        _userdata: Any,
        _rc: Any,
        _properties: Any = None,
    ) -> None:
        self._connected.clear()

    def _drop_remaining_queue(self) -> int:
        dropped_count = 0
        while True:
            try:
                self._queue.get_nowait()
            except asyncio.QueueEmpty:
                return dropped_count
            self._queue.task_done()
            dropped_count += 1

    def _safe_client_call(self, client: Any, method_name: str) -> None:
        method = getattr(client, method_name, None)
        if not callable(method):
            return
        try:
            method()
        except Exception as err:
            _LOGGER.debug(
                "MQTT client %s failed for entry %s: %s",
                method_name,
                self._entry_id,
                err,
            )

    def _safe_close_client(self, client: Any) -> None:
        close_method = getattr(client, "close", None)
        if callable(close_method):
            self._safe_client_call(client, "close")
            return

        private_close_method = getattr(client, "_sock_close", None)
        if callable(private_close_method):
            self._safe_client_call(client, "_sock_close")

    def _prepare_event(self, event: str | Mapping[str, Any]) -> tuple[str, str] | None:
        if isinstance(event, str):
            payload = event
            try:
                decoded_event = json.loads(event)
            except json.JSONDecodeError as err:
                _LOGGER.warning(
                    "Failed to decode serialized MQTT telemetry event for entry %s: %s",
                    self._entry_id,
                    err,
                )
                return None
            if not isinstance(decoded_event, Mapping):
                _LOGGER.warning(
                    "Serialized MQTT telemetry event for entry %s must decode to an object",
                    self._entry_id,
                )
                return None
            event_mapping = decoded_event
        else:
            event_mapping = event
            try:
                payload = json.dumps(dict(event), separators=(",", ":"), ensure_ascii=False)
            except (TypeError, ValueError) as err:
                _LOGGER.warning(
                    "Failed to serialize MQTT telemetry event for entry %s: %s",
                    self._entry_id,
                    err,
                )
                return None

        device_id = self._resolve_device_id(event_mapping)
        if device_id is None:
            _LOGGER.debug(
                "Cloud MQTT telemetry skipped for entry %s because device_id is missing or invalid",
                self._entry_id,
            )
            return None

        return device_id, payload

    @staticmethod
    def _resolve_device_id(event: Mapping[str, Any]) -> str | None:
        raw_device_id = event.get("device_id")
        if raw_device_id is None:
            return None
        device_id = str(raw_device_id).strip()
        if not device_id or not device_id.isdigit():
            return None
        return device_id

    def _normalize_topic_prefix(self, topic_prefix: str) -> str:
        normalized_prefix = topic_prefix.rstrip("/")
        if normalized_prefix == _EXACT_CLOUD_TOPIC_PREFIX:
            return normalized_prefix
        return _EXACT_CLOUD_TOPIC_PREFIX

    @staticmethod
    def _mqtt_success_code() -> int:
        return int(getattr(mqtt, "MQTT_ERR_SUCCESS", 0))
