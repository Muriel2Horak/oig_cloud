"""Integration version resolver -- event-loop safe.

``manifest.json`` is immutable at runtime (installed with the integration and
never rewritten). Reading it is a blocking filesystem operation, so it must
never run on the Home Assistant event loop. This helper resolves the version
exactly once via the executor and caches the result for the process lifetime.

Both telemetry paths (shield + planner) embed this version in cloud events.
They obtain a ``hass`` object and must call :func:`async_load_integration_version`
rather than touching ``manifest.json`` directly.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

_LOGGER = logging.getLogger(__name__)

# Path construction is not I/O; the file is only touched inside the executor.
_MANIFEST_PATH = Path(__file__).resolve().parents[1] / "manifest.json"

# Cached for the process lifetime -- the manifest never changes at runtime.
_CACHED_VERSION: Optional[str] = None


def _read_manifest_version(path: Path) -> str:
    """Blocking manifest read -- only ever called from the executor."""
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
        return str(manifest.get("version", "unknown"))
    except Exception as exc:  # noqa: BLE001 -- surfaced as "unknown"
        _LOGGER.debug("Could not read integration version from manifest: %s", exc)
        return "unknown"


def get_integration_version() -> Optional[str]:
    """Return the cached version, or ``None`` if not yet resolved.

    Pure: performs no filesystem I/O. Safe to call from the event loop. The
    value is populated by :func:`async_load_integration_version`.
    """
    return _CACHED_VERSION


async def async_load_integration_version(hass: Any) -> str:
    """Resolve and cache the integration version via the executor.

    Reads ``manifest.json`` exactly once per process (it is immutable at
    runtime) using ``hass.async_add_executor_job`` so the blocking read never
    runs on the event loop. Returns ``"unknown"`` if the manifest cannot be
    read.
    """
    global _CACHED_VERSION
    if _CACHED_VERSION is not None:
        return _CACHED_VERSION

    try:
        version = await hass.async_add_executor_job(
            _read_manifest_version, _MANIFEST_PATH
        )
    except Exception as exc:  # noqa: BLE001 -- executor/IO failure is non-fatal
        _LOGGER.debug("Executor manifest read failed: %s", exc)
        version = "unknown"

    _CACHED_VERSION = version
    return version
