"""Daily-energy validation and daily-cycle marker state for ``dc_in_fv_ad``."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date
from typing import Any

from homeassistant.helpers.restore_state import ExtraStoredData

MAX_DAILY_ENERGY_WH = 1_000_000_000.0

# Conservative recovery rule for stale carried highs on the same local day:
# a real daily rollover should return close to the new day's start. A quarter
# admits the accepted 18 kWh -> 4 kWh replay while rejecting small same-day
# re-aggregation dips. A strictly later local date is disambiguated by date.
DAILY_ROLLOVER_MAX_FRACTION = 0.25


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
    pending_high_value_wh: float | None = None
    pending_high_local_date: date | None = None


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
                "pending_high_value_wh": self._state.pending_high_value_wh,
                "pending_high_local_date": (
                    self._state.pending_high_local_date.isoformat()
                    if self._state.pending_high_local_date
                    else None
                ),
            }
        }


def _parse_marker_wh(marker: dict[str, Any], field_name: str) -> float | None:
    raw = marker.get(field_name)
    if raw is None:
        return None
    sample = classify_daily_energy_wh(raw)
    if sample.reason_class != "ok":
        raise ValueError(f"{field_name} must be finite daily energy")
    return sample.value_wh


def _parse_marker_date(marker: dict[str, Any], field_name: str) -> date | None:
    raw = marker.get(field_name)
    if raw is None:
        return None
    if isinstance(raw, bool):
        raise ValueError(f"{field_name} must be ISO date")
    return date.fromisoformat(str(raw))


def _parse_pending_marker(
    marker: dict[str, Any],
) -> tuple[float | None, date | None]:
    pending_value = _parse_marker_wh(marker, "pending_high_value_wh")
    pending_date = _parse_marker_date(marker, "pending_high_local_date")
    if (pending_value is None) != (pending_date is None):
        raise ValueError("pending high watermark must include value and date")
    return pending_value, pending_date


def _is_credible_daily_rollover(previous_high_wh: float | None, value_wh: float) -> bool:
    if previous_high_wh is None or previous_high_wh <= 0.0:
        return False
    return value_wh <= previous_high_wh * DAILY_ROLLOVER_MAX_FRACTION


def _armed_marker(value_wh: float, local_date: date) -> DailyCycleMarkerState:
    return DailyCycleMarkerState(
        armed=True,
        last_value_wh=value_wh,
        last_local_date=local_date,
    )


def _observe_with_pending_high(
    state: DailyCycleMarkerState,
    value_wh: float,
    local_date: date,
) -> DailyCycleMarkerState:
    pending_value_wh = state.pending_high_value_wh
    pending_local_date = state.pending_high_local_date
    if pending_value_wh is None or pending_local_date is None:
        return state

    if local_date < pending_local_date:
        return state

    if local_date == pending_local_date:
        can_arm_same_day = state.last_value_wh is not None and (
            state.last_local_date is None
            or state.last_local_date < pending_local_date
        )
        if can_arm_same_day and _is_credible_daily_rollover(
            pending_value_wh, value_wh
        ):
            return _armed_marker(value_wh, local_date)

        if value_wh > pending_value_wh:
            pending_value_wh = value_wh
        return DailyCycleMarkerState(
            armed=False,
            last_value_wh=state.last_value_wh,
            last_local_date=state.last_local_date,
            pending_high_value_wh=pending_value_wh,
            pending_high_local_date=pending_local_date,
        )

    if value_wh < pending_value_wh:
        return _armed_marker(value_wh, local_date)

    return DailyCycleMarkerState(
        armed=False,
        last_value_wh=pending_value_wh,
        last_local_date=pending_local_date,
        pending_high_value_wh=value_wh,
        pending_high_local_date=local_date,
    )


def restore_daily_cycle_marker(
    restored_value: float | None,
    restored_local_date: date | None,
    payload: dict[str, Any] | None,
    *,
    restored_state_seen: bool = False,
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
                last_value_wh = _parse_marker_wh(marker, "last_value_wh")
                last_local_date = _parse_marker_date(marker, "last_local_date")
                pending_value_wh, pending_local_date = _parse_pending_marker(marker)
                return DailyCycleMarkerState(
                    armed=armed_raw,
                    last_value_wh=last_value_wh,
                    last_local_date=last_local_date,
                    pending_high_value_wh=pending_value_wh,
                    pending_high_local_date=pending_local_date,
                )
            except Exception:
                # Intentionally fail closed: malformed versioned payload is
                # treated as no-marker, falling through to legacy unarmed.
                pass  # nosec B110

    if restored_value is None:
        if restored_state_seen:
            return DailyCycleMarkerState(
                armed=False,
                last_value_wh=None,
                last_local_date=restored_local_date,
            )
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

    While unarmed, retain the best pre-boundary reference and a pending high
    watermark for the candidate new local day. A lower value on a later local
    date proves the rollover; smaller same-day re-aggregation dips still need
    the conservative rollover predicate.
    """
    if state.armed:
        return _armed_marker(value_wh, local_date)

    if (
        state.pending_high_value_wh is not None
        and state.pending_high_local_date is not None
    ):
        return _observe_with_pending_high(state, value_wh, local_date)

    if state.last_local_date is None:
        if state.last_value_wh is not None:
            if _is_credible_daily_rollover(state.last_value_wh, value_wh):
                return _armed_marker(value_wh, local_date)
            pending_value_wh = value_wh
            if value_wh < state.last_value_wh:
                pending_value_wh = state.last_value_wh
            return DailyCycleMarkerState(
                armed=False,
                last_value_wh=state.last_value_wh,
                last_local_date=None,
                pending_high_value_wh=pending_value_wh,
                pending_high_local_date=local_date,
            )
        return DailyCycleMarkerState(
            armed=False,
            last_value_wh=state.last_value_wh,
            last_local_date=None,
            pending_high_value_wh=value_wh,
            pending_high_local_date=local_date,
        )

    if local_date < state.last_local_date:
        return DailyCycleMarkerState(
            armed=False,
            last_value_wh=state.last_value_wh,
            last_local_date=state.last_local_date,
        )

    if state.last_value_wh is None:
        return DailyCycleMarkerState(
            armed=False,
            last_value_wh=state.last_value_wh,
            last_local_date=state.last_local_date,
            pending_high_value_wh=value_wh,
            pending_high_local_date=local_date,
        )

    if local_date == state.last_local_date:
        return DailyCycleMarkerState(
            armed=False,
            last_value_wh=value_wh,
            last_local_date=local_date,
            pending_high_value_wh=state.pending_high_value_wh,
            pending_high_local_date=state.pending_high_local_date,
        )

    if value_wh < state.last_value_wh:
        return _armed_marker(value_wh, local_date)

    return DailyCycleMarkerState(
        armed=False,
        last_value_wh=state.last_value_wh,
        last_local_date=state.last_local_date,
        pending_high_value_wh=value_wh,
        pending_high_local_date=local_date,
    )
