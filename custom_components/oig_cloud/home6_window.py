"""Keep the Home 6 window on the box in step with what setup asked for."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from homeassistant.components import persistent_notification
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

NOTIFICATION_ID = "oig_cloud_home6_window"
# The box applies one change at a time from the cloud queue, which it polls about
# once a minute, so the second bound waits for the first to land.
WRITE_SPACING_SECONDS = 60.0

_LOCK_KEY = "home6_window_lock"


def _parse_applied(value: Any) -> tuple[int, int]:
    try:
        start, end = str(value).split("-")
        return int(start), int(end)
    except ValueError:
        return 0, 0


async def async_sync_home6_window(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Write the window when it differs from the one last written.

    Comparing against the last write, not the box, leaves a window set on the box
    or in the portal alone until the customer chooses a different one here.
    """
    entry_data = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if not entry_data:
        return

    lock = entry_data.setdefault(_LOCK_KEY, asyncio.Lock())
    async with lock:
        options = entry.options
        desired = (
            int(options.get("home6_window_start", 0)),
            int(options.get("home6_window_end", 0)),
        )
        applied = _parse_applied(options.get("home6_window_applied", "0-0"))
        if desired == applied:
            return

        session_manager = entry_data["session_manager"]
        try:
            wrote = False
            for bound_changed, write, hour in (
                (
                    desired[0] != applied[0],
                    session_manager.set_home6_window_start,
                    desired[0],
                ),
                (
                    desired[1] != applied[1],
                    session_manager.set_home6_window_end,
                    desired[1],
                ),
            ):
                if not bound_changed:
                    continue
                if wrote:
                    await asyncio.sleep(WRITE_SPACING_SECONDS)
                await write(hour)
                wrote = True
        except Exception as err:  # pylint: disable=broad-except
            _LOGGER.warning("Could not write the Home 6 window to the box: %s", err)
            persistent_notification.async_create(
                hass,
                f"Okno Home 6 {desired[0]:02d}:00-{desired[1]:02d}:00 se nepodařilo "
                "zapsat do boxu. Další pokus proběhne po restartu nebo změně okna.",
                title="OIG Cloud",
                notification_id=NOTIFICATION_ID,
            )
            return

        hass.config_entries.async_update_entry(
            entry,
            options={
                **entry.options,
                "home6_window_applied": f"{desired[0]}-{desired[1]}",
            },
        )
        persistent_notification.async_dismiss(hass, NOTIFICATION_ID)
