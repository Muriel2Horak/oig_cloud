"""Shared logging utilities for OIG Cloud."""

import asyncio
import json
import logging
import re
import time
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Dict, Optional

if TYPE_CHECKING:
    from aiohttp import ClientSession, ClientTimeout, TCPConnector
else:
    try:
        from aiohttp import ClientSession, ClientTimeout, TCPConnector
    except ImportError:
        ClientSession = None  # type: ignore
        ClientTimeout = None  # type: ignore
        TCPConnector = None  # type: ignore

from ..const import CONF_NO_TELEMETRY, OT_ENDPOINT, OT_HEADERS, OT_INSECURE

_LOGGER = logging.getLogger(__name__)


def resolve_no_telemetry(entry: Any) -> bool:
    """Resolve the canonical no_telemetry flag from entry data and options."""
    data = getattr(entry, "data", {})
    options = getattr(entry, "options", {})

    data_map = data if isinstance(data, Mapping) else {}
    options_map = options if isinstance(options, Mapping) else {}
    data_value = data_map.get(CONF_NO_TELEMETRY, False)
    options_value = options_map.get(CONF_NO_TELEMETRY, False)
    return bool(data_value or options_value)


def _redact_sensitive(value: Any) -> Any:
    """Redaguje citlivé údaje (tokeny, cookies, session IDs, API keys, hesla)."""
    if value is None:
        return "none"
    if isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        # Krátit dlouhé stringy a tokeny
        if len(value) > 100:
            return f"{value[:20]}..."
        # Redagovat tokeny a cookie-like vzory
        token_pattern = re.compile(r'\b[a-z0-9]{20,}', re.IGNORECASE)
        cookie_pattern = re.compile(r'\b(?:PHPSESSID|session|cookie|authorization|token|api_key|password|auth)\b', re.IGNORECASE)
        if token_pattern.search(value) or cookie_pattern.search(value):
            return "***REDACTED***"
        return value
    return str(value)


class SimpleTelemetry:
    """Jednoduchá telemetrie bez logging handleru."""

    def __init__(self, url: str, headers: Dict[str, str]) -> None:
        self.url = url
        self.headers = headers
        self.session: Optional[ClientSession] = None
        self._aiohttp_available = ClientSession is not None and TCPConnector is not None
        self._expected_http_failures_logged: set[tuple[str, str, int]] = set()

    def _log_http_failure(
        self,
        *,
        event_type: str,
        service_name: str,
        status: int,
        response_text: str,
    ) -> None:
        message = (
            f"[TELEMETRY] Failed to send {event_type}: HTTP {status} - "
            f"{response_text[:100]}"
        )
        if status in {400, 401, 403}:
            key = (event_type, service_name, status)
            if key in self._expected_http_failures_logged:
                _LOGGER.debug(message)
                return
            self._expected_http_failures_logged.add(key)
            _LOGGER.info(message)
            return
        _LOGGER.warning(message)

    async def _get_session(self) -> Optional[ClientSession]:
        """Získá nebo vytvoří aiohttp session."""
        if not self._aiohttp_available:
            return None

        await asyncio.sleep(0)
        if self.session is None or self.session.closed:
            connector = TCPConnector(ssl=not OT_INSECURE)
            self.session = ClientSession(connector=connector)
        return self.session

    async def send_event(
        self, event_type: str, service_name: str, data: Dict[str, Any]
    ) -> bool:
        """Pošle telemetrickou událost přímo do New Relic."""
        try:
            payload = {
                "timestamp": int(time.time() * 1000),
                "message": f"ServiceShield {event_type}: {service_name}",
                "level": "INFO",
                "logger": "custom_components.oig_cloud.telemetry",
                "event_type": event_type,
                "service_name": service_name,
                "component": "service_shield",
                **data,
            }

            # LOGOVÁNÍ: Co odesíláme a kam
            _LOGGER.debug(
                f"[TELEMETRY] Sending {event_type} for {service_name} to {self.url}"
            )
            _LOGGER.debug(f"[TELEMETRY] Payload size: {len(json.dumps(payload))} bytes")
            _LOGGER.debug(
                f"[TELEMETRY] Payload preview: {payload.get('message', 'N/A')}"
            )

            session = await self._get_session()
            if session is None:
                _LOGGER.warning("[TELEMETRY] aiohttp not available, skipping telemetry")
                return False

            if ClientTimeout is not None:
                async with session.post(
                    self.url,
                    json=payload,
                    headers=self.headers,
                    timeout=ClientTimeout(total=10),
                ) as response:
                    response_text = await response.text()
                    status = response.status
            else:
                async with session.post(
                    self.url,
                    json=payload,
                    headers=self.headers,
                ) as response:
                    response_text = await response.text()
                    status = response.status

            # LOGOVÁNÍ: Co se vrátilo
            _LOGGER.debug(f"[TELEMETRY] Response: HTTP {status}")
            _LOGGER.debug(f"[TELEMETRY] Response body: {response_text[:200]}...")

            if status in [200, 202]:
                _LOGGER.debug(
                    f"[TELEMETRY] Successfully sent {event_type} for {service_name}"
                )
                return True
            else:
                self._log_http_failure(
                    event_type=event_type,
                    service_name=service_name,
                    status=status,
                    response_text=response_text,
                )
                return False

        except Exception as e:
            _LOGGER.error(
                f"[TELEMETRY] Exception while sending {event_type} for {service_name}: {e}",
                exc_info=True,
            )
            return False

    async def close(self) -> None:
        """Uzavře HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()


def setup_simple_telemetry(email_hash: str, hass_id: str) -> Optional[SimpleTelemetry]:
    """Setup jednoduché telemetrie."""
    _ = email_hash
    _ = hass_id
    try:
        url = f"{OT_ENDPOINT}/log/v1"
        headers = {"Content-Type": "application/json", "X-Event-Source": "logs"}

        for header_name, header_value in OT_HEADERS:
            headers[header_name] = header_value

        return SimpleTelemetry(url, headers)

    except Exception as e:
        _LOGGER.error(f"Failed to setup telemetry: {e}")
        return None
