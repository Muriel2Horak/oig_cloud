"""Pre-scheduler solar cache reader contract from commit c683fe3f.

The released reader owned only the box-scoped schema-1 key.  Keep this fixture
independent from the current cache implementation so rollback compatibility is
proved by executing the previous artifact contract rather than mocking the new
reader.
"""

from __future__ import annotations

from typing import Any


class PreviousSolarCacheReader:
    """Executable subset of the released pre-scheduler cache reader."""

    def __init__(self, hass: Any, box_id: str, store_factory: Any) -> None:
        self._hass = hass
        self._storage_key = f"oig_solar_forecast_{box_id}"
        self._store_factory = store_factory
        self.last_api_call = 0.0
        self.forecast_data: dict[str, Any] | None = None

    async def async_load(self) -> None:
        """Load only the schema-1 box artifact used by the previous release."""
        store = self._store_factory(
            self._hass,
            version=1,
            key=self._storage_key,
        )
        data = await store.async_load()
        if not data:
            return
        if isinstance(data.get("last_api_call"), (int, float)):
            self.last_api_call = float(data["last_api_call"])
        if isinstance(data.get("forecast_data"), dict):
            self.forecast_data = data["forecast_data"]
