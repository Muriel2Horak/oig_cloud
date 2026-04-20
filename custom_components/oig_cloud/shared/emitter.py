"""Shared telemetry emitter and entry-scoped sink wiring."""

from __future__ import annotations

import hashlib
import inspect
import logging
from collections.abc import Mapping
from typing import Any

from ..const import (
    CONF_TELEMETRY_MQTT_ENABLED,
    CONF_TELEMETRY_MQTT_HOST,
    CONF_TELEMETRY_MQTT_PORT,
    CONF_TELEMETRY_MQTT_PREFIX,
    DOMAIN,
)
from .cloud_contract import Transport, build_sink_payload, validate_producer_event
from .logging import resolve_no_telemetry, setup_simple_telemetry
from .mqtt_publisher import CloudMqttPublisher


_LOGGER = logging.getLogger(__name__)
_DEFAULT_RAW_EVENT_TYPE = "raw_transport_event"
_DEFAULT_RAW_SERVICE_NAME = "oig_cloud.telemetry"


class MqttTelemetrySink:
    """Adapter that forwards validated sink payloads to MQTT."""

    def __init__(self, publisher: CloudMqttPublisher) -> None:
        self._publisher = publisher

    async def emit_cloud_event(self, event: Mapping[str, Any]) -> bool:
        return bool(self._publisher.emit_cloud_event(dict(event)))


class NewRelicTelemetrySink:
    """Adapter that forwards events to the legacy New Relic transport."""

    def __init__(self, handler: Any) -> None:
        self._handler = handler

    async def emit_cloud_event(self, event: Mapping[str, Any]) -> bool:
        payload = dict(event)
        payload.setdefault("component", "cloud_telemetry")
        return await self._send_payload(payload)

    async def emit_raw_event(self, event: Mapping[str, Any]) -> bool:
        payload = dict(event)
        payload.setdefault("component", "cloud_telemetry")
        return await self._send_payload(payload)

    async def _send_payload(self, payload: dict[str, Any]) -> bool:
        send_event = getattr(self._handler, "send_event", None)
        if not callable(send_event):
            return False

        result = send_event(
            _resolve_new_relic_event_type(payload),
            _resolve_new_relic_service_name(payload),
            payload,
        )
        if inspect.isawaitable(result):
            result = await result
        return bool(result)


class SharedTelemetryEmitter:
    """Entry-scoped shared emitter with cloud/raw routing tiers."""

    def __init__(
        self,
        *,
        entry: Any,
        mqtt_sink: Any | None = None,
        new_relic_sink: Any | None = None,
    ) -> None:
        self._entry = entry
        self._mqtt_sink = mqtt_sink
        self._new_relic_sink = new_relic_sink

    def bind_mqtt_sink(self, sink: Any | None) -> None:
        self._mqtt_sink = sink

    def bind_new_relic_sink(self, sink: Any | None) -> None:
        self._new_relic_sink = sink

    async def emit_cloud_event(self, event: Mapping[str, Any]) -> bool:
        if resolve_no_telemetry(self._entry):
            return False

        validated_event = validate_producer_event(event)
        sink_results: list[bool] = []

        if self._mqtt_sink is not None:
            sink_results.append(
                await self._dispatch_cloud_sink(
                    self._mqtt_sink,
                    validated_event,
                    Transport.MQTT.value,
                )
            )

        if self._new_relic_sink is not None:
            sink_results.append(
                await self._dispatch_cloud_sink(
                    self._new_relic_sink,
                    validated_event,
                    Transport.NEWRELIC.value,
                )
            )

        return any(sink_results)

    async def emit_raw_event(self, event: Mapping[str, Any]) -> bool:
        if resolve_no_telemetry(self._entry):
            return False
        if self._new_relic_sink is None:
            return False

        return await self._dispatch_raw_sink(self._new_relic_sink, dict(event))

    async def _dispatch_cloud_sink(
        self,
        sink: Any,
        event: Mapping[str, Any],
        transport: str,
    ) -> bool:
        payload = build_sink_payload(event, transport)

        try:
            emit_cloud_event = getattr(sink, "emit_cloud_event")
            result = emit_cloud_event(payload)
            if inspect.isawaitable(result):
                result = await result
            return bool(result)
        except Exception as err:
            _LOGGER.warning(
                "Telemetry sink dispatch failed for entry %s via %s: %s",
                getattr(self._entry, "entry_id", "unknown"),
                transport,
                err,
            )
            return False

    async def _dispatch_raw_sink(self, sink: Any, event: dict[str, Any]) -> bool:
        try:
            emit_raw_event = getattr(sink, "emit_raw_event")
            result = emit_raw_event(event)
            if inspect.isawaitable(result):
                result = await result
            return bool(result)
        except Exception as err:
            _LOGGER.warning(
                "Raw telemetry sink dispatch failed for entry %s: %s",
                getattr(self._entry, "entry_id", "unknown"),
                err,
            )
            return False


async def async_setup_entry_telemetry(hass: Any, entry: Any) -> dict[str, Any]:
    """Create and store per-entry telemetry routing state."""
    entry_data = hass.data.setdefault(DOMAIN, {}).setdefault(entry.entry_id, {})
    emitter = SharedTelemetryEmitter(entry=entry)
    telemetry_state: dict[str, Any] = {
        "emitter": emitter,
        "mqtt_publisher": None,
        "mqtt_sink": None,
        "new_relic_handler": None,
        "new_relic_sink": None,
    }
    entry_data["telemetry"] = telemetry_state

    if resolve_no_telemetry(entry):
        return telemetry_state

    new_relic_handler = _setup_new_relic_handler(hass, entry)
    if new_relic_handler is not None:
        new_relic_sink = NewRelicTelemetrySink(new_relic_handler)
        emitter.bind_new_relic_sink(new_relic_sink)
        telemetry_state["new_relic_handler"] = new_relic_handler
        telemetry_state["new_relic_sink"] = new_relic_sink

    mqtt_publisher = await _start_mqtt_publisher(entry)
    if mqtt_publisher is not None:
        mqtt_sink = MqttTelemetrySink(mqtt_publisher)
        emitter.bind_mqtt_sink(mqtt_sink)
        telemetry_state["mqtt_publisher"] = mqtt_publisher
        telemetry_state["mqtt_sink"] = mqtt_sink

    return telemetry_state


async def async_shutdown_entry_telemetry(hass: Any, entry: Any) -> None:
    """Shutdown entry-scoped telemetry resources."""
    entry_data = hass.data.get(DOMAIN, {}).get(entry.entry_id, {})
    telemetry_state = entry_data.get("telemetry")
    if not isinstance(telemetry_state, dict):
        return

    mqtt_publisher = telemetry_state.get("mqtt_publisher")
    if mqtt_publisher is not None and hasattr(mqtt_publisher, "async_shutdown"):
        await mqtt_publisher.async_shutdown()

    new_relic_handler = telemetry_state.get("new_relic_handler")
    if new_relic_handler is not None and hasattr(new_relic_handler, "close"):
        close_result = new_relic_handler.close()
        if inspect.isawaitable(close_result):
            await close_result


def _setup_new_relic_handler(hass: Any, entry: Any) -> Any | None:
    username = str(getattr(entry, "data", {}).get("username", ""))
    core_uuid = str(hass.data.get("core.uuid", "")).strip()
    if not core_uuid:
        _LOGGER.debug(
            "Skipping New Relic telemetry setup for entry %s because core.uuid is unavailable",
            getattr(entry, "entry_id", "unknown"),
        )
        return None

    email_hash = hashlib.sha256(username.encode("utf-8")).hexdigest()
    hass_id = hashlib.sha256(core_uuid.encode("utf-8")).hexdigest()
    return setup_simple_telemetry(email_hash, hass_id)


async def _start_mqtt_publisher(entry: Any) -> CloudMqttPublisher | None:
    options = getattr(entry, "options", {}) or {}
    if not options.get(CONF_TELEMETRY_MQTT_ENABLED):
        return None

    host = str(options.get(CONF_TELEMETRY_MQTT_HOST, "")).strip()
    if not host:
        return None

    publisher = CloudMqttPublisher(
        entry_id=str(entry.entry_id),
        host=host,
        port=int(options.get(CONF_TELEMETRY_MQTT_PORT, 1883)),
        topic_prefix=str(options.get(CONF_TELEMETRY_MQTT_PREFIX, "oig/cloud-telemetry")),
    )
    if await publisher.async_start():
        return publisher
    return None


def _resolve_new_relic_event_type(payload: Mapping[str, Any]) -> str:
    for key in ("event_name", "event_type"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return _DEFAULT_RAW_EVENT_TYPE


def _resolve_new_relic_service_name(payload: Mapping[str, Any]) -> str:
    for key in ("detail_service_name", "service_name", "component"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return _DEFAULT_RAW_SERVICE_NAME
