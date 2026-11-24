"""Once an hour, the finished 15-minute slots as an anonymous energy batch.

Runs on the battery forecast sensor, which already reads finished slots from
the Recorder (``data.history.fetch_interval_from_history``, cached per slot).
Sends only with the user's consent (``share_energy_data``) and only through
the TLS publisher. A slot the Recorder does not have is left out, not sent as
zero.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, List, Optional

from ...const import CONF_SHARE_ENERGY_DATA, DEFAULT_SHARE_ENERGY_DATA
from ...shared.energy_telemetry import build_energy_batch, install_hash, slot_from_history
from ..data.history import fetch_interval_from_history

_LOGGER = logging.getLogger(__name__)

SLOT = timedelta(minutes=15)
# The Recorder needs a few minutes after a slot ends to hold its last values.
SETTLE = timedelta(minutes=5)
# After an outage, send at most the last day rather than replaying a week.
MAX_SLOTS_PER_BATCH = 96


def _floor_quarter(when: datetime) -> datetime:
    return when.replace(minute=(when.minute // 15) * 15, second=0, microsecond=0)


def slots_to_send(now: datetime, *, last_sent: Optional[datetime]) -> List[datetime]:
    """Starts of the finished slots not sent yet (oldest first)."""
    end = _floor_quarter(now - SETTLE)  # exclusive
    first = last_sent + SLOT if last_sent is not None else end - timedelta(hours=1)
    first = max(first, end - SLOT * MAX_SLOTS_PER_BATCH)
    starts: List[datetime] = []
    cursor = first
    while cursor < end:
        starts.append(cursor)
        cursor += SLOT
    return starts


def share_energy_data(sensor: Any) -> bool:
    options = getattr(getattr(sensor, "_config_entry", None), "options", None) or {}
    return bool(options.get(CONF_SHARE_ENERGY_DATA, DEFAULT_SHARE_ENERGY_DATA))


def _float_state(hass: Any, entity_id: str) -> Optional[float]:
    state = getattr(hass, "states", None) and hass.states.get(entity_id)
    try:
        return float(state.state) if state is not None else None
    except (TypeError, ValueError):
        return None


class EnergyTelemetryJob:
    def __init__(
        self,
        sensor: Any,
        *,
        publisher: Any,
        salt: str,
        integration_version: str = "unknown",
    ) -> None:
        self._sensor = sensor
        self._publisher = publisher
        self._install_id = install_hash(str(sensor._box_id), salt)
        self._version = integration_version
        self._last_sent: Optional[datetime] = None

    async def async_run(self, now: datetime) -> bool:
        if not share_energy_data(self._sensor):
            return False
        starts = slots_to_send(now, last_sent=self._last_sent)
        if not starts:
            return False
        slots = []
        for start in starts:
            try:
                row = await fetch_interval_from_history(self._sensor, start, start + SLOT)
            except Exception as err:  # Recorder busy: the slot is skipped
                _LOGGER.debug("Energy telemetry: slot %s unreadable: %s", start, err)
                row = None
            slots.append(slot_from_history(start, row) if row else None)
        sensor = self._sensor
        hass = getattr(sensor, "_hass", None)
        options = getattr(getattr(sensor, "_config_entry", None), "options", None) or {}
        capacity = getattr(sensor, "_get_total_battery_capacity", lambda: None)()
        batch = build_energy_batch(
            install_id=self._install_id,
            slots=slots,
            capacity_kwh=capacity,
            bat_min_pct=_float_state(hass, f"sensor.oig_{sensor._box_id}_batt_bat_min"),
            charge_kw=options.get("home_charge_rate"),
            integration_version=self._version,
            sent_at=now,
        )
        self._last_sent = starts[-1]
        if batch is None:
            return False
        return bool(self._publisher.emit_cloud_event(batch))
