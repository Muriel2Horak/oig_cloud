"""Integration version resolver -- event-loop safe.

``manifest.json`` is immutable at runtime (installed with the integration and
never rewritten), so the version is read once and cached for the process
lifetime. The read itself is blocking filesystem I/O and must never run on the
Home Assistant event loop -- neither at import time nor at emit time.

Design notes worth keeping:

* **Nothing touches the filesystem at import.** ``Path.resolve()`` is a
  syscall per path component, so resolving the manifest path at module scope
  would be blocking I/O executed on whatever loop first imports this module.
  The path is built inside the executor job.
* **Single flight.** Cold callers race during setup (shield telemetry and the
  planner both emit early). A per-loop lock collapses them onto one read.
* **Only success is cached.** A transient executor or filesystem failure must
  leave the cache empty so a later call can still resolve the real version;
  caching ``"unknown"`` would pin every subsequent cloud event to it.
* **Failures are logged by class only.** The manifest path is absolute and the
  exception text is not under our control, so neither is logged, and no
  traceback is attached.
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Optional
from weakref import WeakKeyDictionary

_LOGGER = logging.getLogger(__name__)

UNKNOWN_VERSION = "unknown"

# Cached for the process lifetime -- the manifest never changes at runtime.
# Populated only by a successful read.
_CACHED_VERSION: Optional[str] = None

# One lock per event loop, so a resolver used from two loops (tests, or a
# restarted loop) never awaits a lock bound to a dead one.
_LOCKS: "WeakKeyDictionary[Any, asyncio.Lock]" = WeakKeyDictionary()


def _read_manifest_version() -> str:
    """Blocking manifest read -- only ever called from the executor.

    Raises rather than returning a sentinel so the caller can tell a failed
    read (do not cache) from a resolved version (cache).
    """
    manifest_path = Path(__file__).resolve().parents[1] / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    version = str(manifest.get("version", "")).strip()
    if not version:
        raise ValueError("manifest_version_missing")
    return version


def _get_lock() -> asyncio.Lock:
    loop = asyncio.get_running_loop()
    lock = _LOCKS.get(loop)
    if lock is None:
        lock = asyncio.Lock()
        _LOCKS[loop] = lock
    return lock


async def async_load_integration_version(hass: Any) -> str:
    """Resolve and cache the integration version via the executor.

    Returns :data:`UNKNOWN_VERSION` when the manifest cannot be read; that
    result is deliberately not cached, so a transient failure recovers on the
    next call.
    """
    global _CACHED_VERSION

    if _CACHED_VERSION is not None:
        return _CACHED_VERSION

    async with _get_lock():
        # Another cold caller may have resolved it while we waited.
        if _CACHED_VERSION is not None:
            return _CACHED_VERSION

        try:
            version = await hass.async_add_executor_job(_read_manifest_version)
        except asyncio.CancelledError:
            raise
        except Exception as err:  # noqa: BLE001 -- surfaced as UNKNOWN_VERSION
            # Class only: the exception text may carry the absolute manifest
            # path or other environment detail that must not reach the log.
            _LOGGER.debug(
                "Integration version unresolved; reason_class=%s",
                type(err).__name__,
            )
            return UNKNOWN_VERSION

        _CACHED_VERSION = version
        return version
