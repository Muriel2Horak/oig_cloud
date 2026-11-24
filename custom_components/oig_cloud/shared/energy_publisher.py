"""TLS-only MQTT transport for anonymous energy slots.

Same queueing as the cloud telemetry publisher, but its own topic
(``oig/energy/<install id>``), an install hash instead of the box serial as
the address, and TLS always on: a household's consumption curve is personal
data and does not travel in plain text. When the broker does not offer TLS
the connection never comes up and the slots are simply not sent.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any, Callable

from ..const import TELEMETRY_ENERGY_PORT, TELEMETRY_ENERGY_PREFIX, TELEMETRY_MQTT_HOST
from .mqtt_publisher import CloudMqttPublisher

_INSTALL_ID_RE = re.compile(r"^[0-9a-f]{24}$")


class EnergyMqttPublisher(CloudMqttPublisher):
    def __init__(
        self,
        *,
        entry_id: str,
        host: str = TELEMETRY_MQTT_HOST,
        port: int = TELEMETRY_ENERGY_PORT,
        client_factory: Callable[[], Any] | None = None,
    ) -> None:
        super().__init__(
            entry_id=entry_id,
            host=host,
            port=port,
            topic_prefix=TELEMETRY_ENERGY_PREFIX,
            client_factory=client_factory,
        )

    async def _async_build_client(self) -> Any:
        client = await super()._async_build_client()
        # System CA bundle: the broker presents the public *.muriel-cz.cz cert.
        client.tls_set()
        return client

    def _normalize_topic_prefix(self, topic_prefix: str) -> str:
        return TELEMETRY_ENERGY_PREFIX

    @staticmethod
    def _resolve_device_id(event: Mapping[str, Any]) -> str | None:
        install_id = str(event.get("install_id") or "").strip()
        return install_id if _INSTALL_ID_RE.fullmatch(install_id) else None
