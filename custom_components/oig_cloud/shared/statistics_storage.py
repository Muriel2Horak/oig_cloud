from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING, Any, Dict, Optional

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)


class StatisticsStore:
    """Shared storage manager pro statistické senzory (low-power: 1 Store per entry, batch writes)."""

    _instance = None

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._write_cooldown_seconds = 600
        self._pending_writes: Dict[str, Dict[str, Any]] = {}
        self._last_batch_time: Optional[float] = None

    @classmethod
    def get_instance(cls, hass):
        if cls._instance is None:
            cls._instance = StatisticsStore(hass)
            _LOGGER.debug("StatisticsStore instance created")
        return cls._instance

    async def save_sensor_data(
        self,
        entry_id: str,
        sensor_type: str,
        sensor_data: Dict[str, Any]
    ) -> None:
        data_key = f"oig_stats_{entry_id}_{sensor_type}"
        self._pending_writes[data_key] = sensor_data
        _LOGGER.debug(f"[STATS] Queued statistics data for {data_key}")

    async def save_all(self) -> None:
        if not self._pending_writes:
            return

        _LOGGER.info(f"[STATS] Flushing {len(self._pending_writes)} statistics datasets to storage")

        for entry_id in self._pending_writes.keys():
            data = self._pending_writes[entry_id]
            store = self._get_store(entry_id)
            if store:
                try:
                    await store.async_save(data)
                    _LOGGER.debug(f"[STATS] Saved statistics for {entry_id}")
                except Exception as e:
                    _LOGGER.error(f"[STATS] Failed to save statistics for {entry_id}: {e}", exc_info=True)

        self._pending_writes.clear()
        self._last_batch_time = None

    async def maybe_flush(self, entry_id: str) -> None:
        if not self._last_batch_time:
            return

        now = asyncio.get_event_loop().time()
        age_seconds = now - self._last_batch_time
        if age_seconds < self._write_cooldown_seconds:
            _LOGGER.debug(f"[STATS] Pending writes for {entry_id}, age: {age_seconds:.1f}s < {self._write_cooldown_seconds}s (skip flush)")
            return

        _LOGGER.info(f"[STATS] Flushing statistics for entry {entry_id} (age: {age_seconds:.1f}s)")
        await self.save_all()
        self._last_batch_time = now

    def _get_store(self, entry_id: str):
        from homeassistant.helpers.storage import Store
        key = f"oig_stats_{entry_id}"
        return Store(self._hass, version=1, key=key)


async def save_statistics_data(hass, entry_id: str, data: Dict[str, Any]) -> None:
    from homeassistant.helpers.storage import Store
    key = f"oig_stats_{entry_id}"
    store = Store(hass, version=1, key=key)
    await store.async_save(data)


async def flush_statistics(hass, entry_id: str) -> None:
    instance = StatisticsStore.get_instance(hass)
    await instance.maybe_flush(entry_id)
