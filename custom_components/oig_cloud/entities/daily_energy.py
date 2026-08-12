"""Daily-energy validation and daily-cycle marker state for ``dc_in_fv_ad``."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date
from typing import Any

from homeassistant.helpers.restore_state import ExtraStoredData

MAX_DAILY_ENERGY_WH = 1_000_000_000.0


@dataclass(frozen=True, slots=True)
class DailyEnergySample:
    """A classified daily-energy sample."""

    value_wh: float | None
    reason_class: str


def classify_daily_energy_wh(raw: Any) -> DailyEnergySample:
    """Classify a raw daily-energy sample in watt-hours.

    Accepts integers, floats, and base-10 numeric strings that produce a finite
    value in the inclusive range ``0..MAX_DAILY_ENERGY_WH``.

    Rejects booleans, empty text, malformed text, NaN, infinity, negative
    values, and values above the cap.  ``bool`` is rejected before numeric
    coercion because it is a ``float``-coercible subtype of ``int``.
    """
    if isinstance(raw, bool):
        return DailyEnergySample(None, "boolean")
    if isinstance(raw, str) and not raw.strip():
        return DailyEnergySample(None, "empty")
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return DailyEnergySample(None, "malformed")
    if not math.isfinite(value):
        return DailyEnergySample(None, "non_finite")
    if value < 0.0:
        return DailyEnergySample(None, "negative")
    if value > MAX_DAILY_ENERGY_WH:
        return DailyEnergySample(None, "above_max")
    return DailyEnergySample(value, "ok")


@dataclass(frozen=True, slots=True)
class DailyCycleMarkerState:
    """In-memory daily-cycle marker state.

    ``armed`` is ``True`` once a proven day-boundary rollover has been observed.
    ``last_value_wh`` and ``last_local_date`` retain the pre-boundary reference
    while the marker is unarmed, protecting against stale pre-midnight data and
    same-day dips.
    """

    armed: bool
    last_value_wh: float | None
    last_local_date: date | None


class DailyCycleRestoreData(ExtraStoredData):
    """Versioned extra restore data for the daily-cycle marker."""

    def __init__(self, state: DailyCycleMarkerState) -> None:
        self._state = state

    def as_dict(self) -> dict[str, Any]:
        return {
            "daily_cycle_marker": {
                "version": 1,
                "armed": self._state.armed,
                "last_value_wh": self._state.last_value_wh,
                "last_local_date": (
                    self._state.last_local_date.isoformat()
                    if self._state.last_local_date
                    else None
                ),
            }
        }


def restore_daily_cycle_marker(
    restored_value: float | None,
    restored_local_date: date | None,
    payload: dict[str, Any] | None,
) -> DailyCycleMarkerState:
    """Build initial marker state from restored state and extra data.

    Fresh entity with no restored state starts armed and keeps current
    daily-cycle behaviour.

    Restored entity with valid versioned extra data resumes the stored state.

    Restored entity with state but no marker extra data is a legacy migration
    and starts unarmed.

    Malformed marker extra data fails closed to the legacy unarmed state when a
    restored state exists.
    """
    if payload is not None:
        marker = payload.get("daily_cycle_marker")
        if isinstance(marker, dict) and marker.get("version") == 1:
            try:
                armed_raw = marker.get("armed")
                if not isinstance(armed_raw, bool):
                    raise ValueError("armed must be boolean")
                last_value_wh = marker.get("last_value_wh")
                if last_value_wh is not None:
                    last_value_wh = float(last_value_wh)
                    if not math.isfinite(last_value_wh):
                        raise ValueError("last_value_wh must be finite")
                    if last_value_wh < 0.0 or last_value_wh > MAX_DAILY_ENERGY_WH:
                        raise ValueError("last_value_wh out of range")
                last_local_date_raw = marker.get("last_local_date")
                last_local_date: date | None = None
                if last_local_date_raw is not None:
                    last_local_date = date.fromisoformat(str(last_local_date_raw))
                return DailyCycleMarkerState(
                    armed=armed_raw,
                    last_value_wh=last_value_wh,
                    last_local_date=last_local_date,
                )
            except Exception:
                pass

    if restored_value is None:
        return DailyCycleMarkerState(
            armed=True,
            last_value_wh=None,
            last_local_date=None,
        )

    return DailyCycleMarkerState(
        armed=False,
        last_value_wh=restored_value,
        last_local_date=restored_local_date,
    )


def observe_daily_cycle_value(
    state: DailyCycleMarkerState,
    value_wh: float,
    local_date: date,
) -> DailyCycleMarkerState:
    """Observe one validated daily value and update the marker state.

    While unarmed, retain the pre-boundary reference when a later-day value is
    equal or higher. Arm only when the later-day validated value is strictly
    lower. Same-day valid updates refresh the retained reference.
    """
    if state.armed:
        return DailyCycleMarkerState(
            armed=True,
            last_value_wh=value_wh,
            last_local_date=local_date,
        )

    if state.last_local_date is None:
        return DailyCycleMarkerState(
            armed=False,
            last_value_wh=value_wh,
            last_local_date=local_date,
        )

    if local_date < state.last_local_date:
        return DailyCycleMarkerState(
            armed=False,
            last_value_wh=state.last_value_wh,
            last_local_date=state.last_local_date,
        )

    if local_date == state.last_local_date:
        return DailyCycleMarkerState(
            armed=False,
            last_value_wh=value_wh,
            last_local_date=local_date,
        )

    if value_wh >= state.last_value_wh:
        return DailyCycleMarkerState(
            armed=False,
            last_value_wh=state.last_value_wh,
            last_local_date=state.last_local_date,
        )

    return DailyCycleMarkerState(
        armed=True,
        last_value_wh=value_wh,
        last_local_date=local_date,
    )
