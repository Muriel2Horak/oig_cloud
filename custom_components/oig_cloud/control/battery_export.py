"""Battery-to-grid export window and its automatic end.

An export always has an end. The window lives in HA storage, so it survives a
restart. The integration stops the export (both grid_pv flags off, export limit
back to its value before the export) when:

- the end time passes;
- Home Assistant restarts while an export is active;
- the battery reaches the box's discharge minimum (``bat_min``).

The stop goes through the ``stop_battery_export`` service, so it is queued and
confirmed by the service shield like any other write. If the proxy is not
reachable at that moment, the stop waits until the data source is local again.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Callable, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import (
    async_track_point_in_utc_time,
    async_track_state_change_event,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from ..const import DOMAIN
from ..core.data_source import EVENT_DATA_SOURCE_CHANGED
from . import proxy_control as pc

_LOGGER = logging.getLogger(__name__)

STORE_VERSION = 1
KEY_SOC = "tbl_batt_bat_c"
KEY_BAT_MIN = "tbl_batt_prms_bat_min"


class BatteryExportManager:
    """Owns the active export window of one config entry."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, box_id: str) -> None:
        self.hass = hass
        self.entry = entry
        self.box_id = box_id
        self._store: Store = Store(
            hass, STORE_VERSION, f"{DOMAIN}.battery_export_{entry.entry_id}"
        )
        self._lease: Optional[dict[str, Any]] = None
        self._stop_pending = False
        self._stop_running = False
        self._stop_queued = False
        self._timer_unsub: Optional[Callable[[], None]] = None
        self._soc_unsub: Optional[Callable[[], None]] = None
        self._unsubs: list[Callable[[], None]] = []

    @property
    def active(self) -> bool:
        """True while an export window is stored."""
        return self._lease is not None

    @property
    def lease(self) -> Optional[dict[str, Any]]:
        """Copy of the stored window: until, restore_limit, started."""
        return dict(self._lease) if self._lease else None

    def restore_limit(self, current_limit: Optional[float]) -> Optional[float]:
        """Limit to restore at the end: kept from the first export of the window."""
        if self._lease and self._lease.get("restore_limit") is not None:
            return float(self._lease["restore_limit"])
        return current_limit

    async def async_setup(self) -> None:
        """Load a window left by the previous run and stop it."""
        try:
            stored = await self._store.async_load()
        except (OSError, ValueError, HomeAssistantError) as err:
            _LOGGER.debug("Battery export store load failed: %s", err)
            stored = None
        self._unsubs.append(
            self.hass.bus.async_listen(EVENT_DATA_SOURCE_CHANGED, self._on_data_source_changed)
        )
        if isinstance(stored, dict) and stored.get("until"):
            self._lease = stored
            _LOGGER.warning(
                "[OIG Proxy] Battery export was active before restart (until %s), stopping it",
                stored.get("until"),
            )
            self._stop_pending = True
            self.hass.async_create_task(self.async_request_stop("restart"))

    async def async_unload(self) -> None:
        """Drop listeners; the stored window stays for the next start."""
        self._cancel_watchers()
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()

    async def async_arm(self, until: datetime, restore_limit: Optional[float]) -> None:
        """Store the window and watch its end time and the battery minimum."""
        keep_restore = self.restore_limit(restore_limit)
        self._lease = {
            "until": dt_util.as_utc(until).isoformat(),
            "restore_limit": keep_restore,
            "started": dt_util.utcnow().isoformat(),
        }
        self._stop_pending = False
        self._stop_queued = False
        await self._save()
        self._watch()
        _LOGGER.info(
            "[OIG Proxy] Battery export armed until %s (restore limit %s)",
            self._lease["until"],
            keep_restore,
        )

    async def async_clear(self) -> None:
        """Forget the window after the export was stopped."""
        self._lease = None
        self._stop_pending = False
        self._stop_queued = False
        self._cancel_watchers()
        await self._save()

    async def _save(self) -> None:
        try:
            await self._store.async_save(self._lease or {})
        except (OSError, ValueError, HomeAssistantError) as err:
            _LOGGER.warning("Battery export store save failed: %s", err)

    def _watch(self) -> None:
        self._cancel_watchers()
        until = dt_util.parse_datetime(str(self._lease["until"])) if self._lease else None
        if until is not None:
            self._timer_unsub = async_track_point_in_utc_time(
                self.hass, self._on_end_time, until
            )
        soc_entity = pc.find_proxy_entity(self.hass, self.box_id, KEY_SOC, control=False)
        if soc_entity:
            self._soc_unsub = async_track_state_change_event(
                self.hass, [soc_entity], self._on_soc_change
            )

    def _cancel_watchers(self) -> None:
        for attr in ("_timer_unsub", "_soc_unsub"):
            unsub = getattr(self, attr)
            if unsub is not None:
                unsub()
                setattr(self, attr, None)

    @callback
    def _on_end_time(self, _now: Any) -> None:
        self._timer_unsub = None
        self.hass.async_create_task(self.async_request_stop("end_time"))

    @callback
    def _on_soc_change(self, _event: Any) -> None:
        if self.soc_at_minimum():
            self.hass.async_create_task(self.async_request_stop("soc_minimum"))

    @callback
    def _on_data_source_changed(self, event: Any) -> None:
        data = getattr(event, "data", {}) or {}
        if data.get("entry_id") != self.entry.entry_id:
            return
        if self._stop_pending and self.active:
            self.hass.async_create_task(self.async_request_stop("retry"))

    def soc_at_minimum(self) -> bool:
        """True when the battery is at or below the box's discharge minimum."""
        soc = pc.read_proxy_number(self.hass, self.box_id, KEY_SOC)
        bat_min = pc.read_proxy_number(self.hass, self.box_id, KEY_BAT_MIN)
        return soc is not None and bat_min is not None and soc <= bat_min

    async def async_request_stop(self, reason: str) -> bool:
        """Ask the shield to stop the export. Keeps it pending if that is not possible now."""
        if not self.active or self._stop_running or self._stop_queued:
            return False
        self._stop_pending = True
        self._stop_running = True
        try:
            _LOGGER.info("[OIG Proxy] Stopping battery export (%s)", reason)
            await self.hass.services.async_call(
                DOMAIN,
                "stop_battery_export",
                {"acknowledgement": True},
                blocking=True,
            )
            self._stop_queued = True
            self._cancel_watchers()
            return True
        except (HomeAssistantError, ValueError) as err:
            _LOGGER.warning(
                "[OIG Proxy] Battery export stop deferred (%s): %s", reason, err
            )
            return False
        finally:
            self._stop_running = False
