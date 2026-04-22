"""Shared logging utilities for OIG Cloud."""

import logging
import re
from typing import Any

_LOGGER = logging.getLogger(__name__)


def resolve_no_telemetry(entry: Any) -> bool:
    """Legacy no_telemetry flag is intentionally ignored.

    Telemetry is fixed-on and MQTT-only, so persisted user flags no longer disable it.
    """
    _ = entry
    return False


def _redact_sensitive(value: Any) -> Any:
    """Redact sensitive values in logs."""
    if value is None:
        return "none"
    if isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        if len(value) > 100:
            return f"{value[:20]}..."
        token_pattern = re.compile(r"\b[a-z0-9]{20,}", re.IGNORECASE)
        cookie_pattern = re.compile(
            r"\b(?:PHPSESSID|session|cookie|authorization|token|api_key|password|auth)\b",
            re.IGNORECASE,
        )
        if token_pattern.search(value) or cookie_pattern.search(value):
            return "***REDACTED***"
        return value
    return str(value)
