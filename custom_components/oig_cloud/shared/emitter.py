"""Shared telemetry emitter and entry-scoped sink wiring."""

from __future__ import annotations

import inspect
import logging
from collections.abc import Mapping
from typing import Any

from ..const import (
    DOMAIN,
    TELEMETRY_MQTT_HOST,
    TELEMETRY_MQTT_PORT,
    TELEMETRY_MQTT_PREFIX,
)
from .cloud_contract import Transport, build_sink_payload, validate_producer_event
from .logging import resolve_no_telemetry
from .mqtt_publisher import CloudMqttPublisher


_LOGGER = logging.getLogger(__name__)


class MqttTelemetrySink:
    """Adapter that forwards validated sink payloads to MQTT."""

    def __init__(self, publisher: CloudMqttPublisher) -> None:
        self._publisher = publisher

    async def emit_cloud_event(self, event: Mapping[str, Any]) -> bool:
        return bool(self._publisher.emit_cloud_event(dict(event)))


class SharedTelemetryEmitter:
    """Entry-scoped shared emitter with MQTT-only cloud routing."""

    def __init__(
        self,
        *,
        entry: Any,
        mqtt_sink: Any | None = None,
    ) -> None:
        self._entry = entry
        self._mqtt_sink = mqtt_sink

    def bind_mqtt_sink(self, sink: Any | None) -> None:
        self._mqtt_sink = sink

    async def emit_cloud_event(self, event: Mapping[str, Any]) -> bool:
        if resolve_no_telemetry(self._entry):
            return False

        if self._mqtt_sink is None:
            return False

        validated_event = validate_producer_event(event)
        return await self._dispatch_cloud_sink(
            self._mqtt_sink,
            validated_event,
            Transport.MQTT.value,
        )

    async def emit_raw_event(self, event: Mapping[str, Any]) -> bool:
        """Legacy raw telemetry path removed with New Relic transport."""
        _ = event
        if resolve_no_telemetry(self._entry):
            return False
        return False

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


async def async_setup_entry_telemetry(hass: Any, entry: Any) -> dict[str, Any]:
    """Create and store per-entry telemetry routing state."""
    entry_data = hass.data.setdefault(DOMAIN, {}).setdefault(entry.entry_id, {})
    emitter = SharedTelemetryEmitter(entry=entry)
    telemetry_state: dict[str, Any] = {
        "emitter": emitter,
        "mqtt_publisher": None,
        "mqtt_sink": None,
    }
    entry_data["telemetry"] = telemetry_state

    if resolve_no_telemetry(entry):
        return telemetry_state

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


async def _start_mqtt_publisher(entry: Any) -> CloudMqttPublisher | None:
    publisher = CloudMqttPublisher(
        entry_id=str(entry.entry_id),
        host=TELEMETRY_MQTT_HOST,
        port=TELEMETRY_MQTT_PORT,
        topic_prefix=TELEMETRY_MQTT_PREFIX,
    )
    if await publisher.async_start():
        return publisher
    return None
