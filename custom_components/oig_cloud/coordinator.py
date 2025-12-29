"""Legacy coordinator compatibility layer used by tests."""

from __future__ import annotations

import asyncio
import logging
import random
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DEFAULT_UPDATE_INTERVAL
from .lib.oig_cloud_client.api.oig_cloud_api import OigCloudApiError

_LOGGER = logging.getLogger(__name__)
JITTER_SECONDS = 5.0


class OigCloudDataUpdateCoordinator(DataUpdateCoordinator):
    """Legacy-style coordinator for unit tests and compatibility."""

    def __init__(
        self,
        hass: Any,
        api: Any,
        config_entry: Optional[Any],
        update_interval: Optional[timedelta] = None,
    ) -> None:
        interval = update_interval
        if interval is None:
            interval_seconds = (
                config_entry.data.get("update_interval", DEFAULT_UPDATE_INTERVAL)
                if config_entry
                else DEFAULT_UPDATE_INTERVAL
            )
            interval = timedelta(seconds=interval_seconds)

        super().__init__(
            hass,
            _LOGGER,
            name="oig_cloud",
            update_interval=interval,
        )

        self.api = api
        self.config_entry = config_entry
        self._next_jitter: float = 0.0

    def _calculate_jitter(self) -> float:
        """Return and store jitter in the configured range."""
        self._next_jitter = random.uniform(-JITTER_SECONDS, JITTER_SECONDS)
        return self._next_jitter

    async def _fetch_basic_data(self) -> Dict[str, Any]:
        """Fetch basic stats from API and normalize."""
        try:
            stats = await self.api.get_stats()
            if not stats:
                stats = {}
            return {"basic": stats}
        except OigCloudApiError as err:
            raise UpdateFailed(f"Failed to fetch basic data: {err}") from err
        except asyncio.TimeoutError as err:
            raise UpdateFailed("Error communicating with API") from err
        except Exception as err:  # pragma: no cover - defensive
            raise UpdateFailed(f"Error communicating with API: {err}") from err

    async def _fetch_extended_data(self) -> Dict[str, Any]:
        """Fetch extended stats (daily + monthly) if enabled."""
        if not self.config_entry:
            return {}
        if not self.config_entry.data.get("extended_data_enabled", False):
            return {}

        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        first_day = now.replace(day=1).strftime("%Y-%m-%d")

        daily = await self.api.get_extended_stats("daily", today, today)
        monthly = await self.api.get_extended_stats("monthly", first_day, today)

        return {"extended": {"daily": daily, "monthly": monthly}}

    async def _async_update_data(self) -> Dict[str, Any]:
        """Update coordinator data (basic + optional extended)."""
        data = await self._fetch_basic_data()
        extended = await self._fetch_extended_data()
        data.update(extended)
        return data
