"""Rate limiter for side-effect-free solar candidate tests."""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Iterable

from ..const import DOMAIN

HASS_DATA_KEY = "_solar_test_limiter"
WINDOW_SECONDS = 30.0
MAX_IN_FLIGHT = 4


def _normalize(value: Any) -> str:
    return str(value or "").strip().lower()


@dataclass
class _Bucket:
    lock: asyncio.Lock
    last_started_at: float | None = None


class SolarTestLease:
    """Held limiter resources for one accepted provider test."""

    def __init__(self, pair_lock: asyncio.Lock, global_semaphore: asyncio.Semaphore) -> None:
        self._pair_lock = pair_lock
        self._global_semaphore = global_semaphore
        self._released = False

    def release(self) -> None:
        if self._released:
            return
        self._released = True
        self._global_semaphore.release()
        self._pair_lock.release()


class SolarTestLimiter:
    """Limits solar provider probes by normalized ``(entry_id, provider)``."""

    def __init__(
        self,
        *,
        window_seconds: float = WINDOW_SECONDS,
        max_in_flight: int = MAX_IN_FLIGHT,
    ) -> None:
        self._window_seconds = window_seconds
        self._global_semaphore = asyncio.Semaphore(max_in_flight)
        self._buckets: dict[tuple[str, str], _Bucket] = {}
        self._now = time.monotonic

    async def acquire(self, entry_id: Any, provider: Any) -> SolarTestLease | None:
        """Return a lease when a provider test may run, otherwise ``None``."""
        key = (_normalize(entry_id), _normalize(provider))
        bucket = self._buckets.setdefault(key, _Bucket(asyncio.Lock()))

        if bucket.lock.locked():
            return None
        await bucket.lock.acquire()

        now = self._now()
        if (
            bucket.last_started_at is not None
            and now - bucket.last_started_at < self._window_seconds
        ):
            bucket.lock.release()
            return None

        if self._global_semaphore.locked():
            bucket.lock.release()
            return None

        await self._global_semaphore.acquire()
        bucket.last_started_at = now
        return SolarTestLease(bucket.lock, self._global_semaphore)

    def prune(self, active_entry_ids: Iterable[Any], providers: Iterable[str]) -> None:
        """Drop idle buckets that no longer map to active entries/providers."""
        active_entries = {_normalize(entry_id) for entry_id in active_entry_ids}
        active_providers = {_normalize(provider) for provider in providers}
        for key, bucket in list(self._buckets.items()):
            if bucket.lock.locked():
                continue
            entry_id, provider = key
            if entry_id not in active_entries or provider not in active_providers:
                self._buckets.pop(key, None)


def get_solar_test_limiter(hass: Any) -> SolarTestLimiter:
    """Return the integration-lifetime solar test limiter singleton."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    limiter = domain_data.get(HASS_DATA_KEY)
    if not isinstance(limiter, SolarTestLimiter):
        limiter = SolarTestLimiter()
        domain_data[HASS_DATA_KEY] = limiter
    return limiter
