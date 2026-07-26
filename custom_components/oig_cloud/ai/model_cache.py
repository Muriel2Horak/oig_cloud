"""TTL cache of the last-working model per (entry_id, provider).

Process-memory only — no disk/Store persistence. A restart cold-starts back
to chain-head order (P1 does not require persistence).
"""
from __future__ import annotations

import time
from typing import Any, Callable, Optional


HASS_DATA_KEY = "oig_ai_model_cache"
DOMAIN = "oig_cloud"


class LastWorkingModelCache:
    """TTL-bounded cache mapping (entry_id, provider) -> last working model."""

    def __init__(
        self,
        now: Callable[[], float] = time.monotonic,
        ttl_seconds: float = 3600,
    ) -> None:
        self._now = now
        self._ttl = ttl_seconds
        self._store: dict[tuple[str, str], tuple[str, float]] = {}

    def set(self, entry_id: str, provider: str, model: str) -> None:
        self._store[(entry_id, provider)] = (model, self._now())

    def get(self, entry_id: str, provider: str) -> Optional[str]:
        entry = self._store.get((entry_id, provider))
        if entry is None:
            return None
        model, ts = entry
        if self._now() - ts > self._ttl:
            del self._store[(entry_id, provider)]
            return None
        return model


def get_ai_model_cache(hass: Any) -> LastWorkingModelCache:
    """Return the integration-lifetime model cache singleton."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    cache = domain_data.get(HASS_DATA_KEY)
    if not isinstance(cache, LastWorkingModelCache):
        cache = LastWorkingModelCache()
        domain_data[HASS_DATA_KEY] = cache
    return cache
