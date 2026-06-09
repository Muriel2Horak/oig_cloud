"""Pure, HA-agnostic boiler activity classifier.

Task 1 of the Boiler V2 redesign.  This module must never import
Home Assistant or any package that transitively depends on it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


_AURA_MAX_TEMP_C = 80.0
_DEADBAND_C = 0.05
_DISCHARGE_TREND_C_PER_MIN = -0.02

_NORMALIZED_SOURCE_KEYS = frozenset({"fve", "overflow", "grid", "discharge"})


@dataclass
class BoilerReading:
    """A single boiler sensor reading."""

    timestamp: datetime
    top_temp_c: float | None
    bottom_temp_c: float | None
    source_key: str | None = None


@dataclass
class BoilerSourceHeaterSnapshot:
    """Heater/source snapshot passed to the classifier."""

    current_source: Any | None = None
    active_heaters: dict[str, str] = field(default_factory=dict)
    overflow_available: bool | None = None
    power_kw: float | None = None


@dataclass
class BoilerActivityDTO:
    """Deterministic activity classification result."""

    state: str
    source: str | None
    temperature_trend_c_per_min: float | None
    fill_level_pct: float
    aura_max_temp_c: float
    active_segment_hint: dict[str, Any] | None
    heater_states: dict[str, str]
    stale_flags: list[str]


class BoilerActivityClassifier:
    """Deterministic classifier for boiler activity states."""

    def classify(
        self,
        prev: BoilerReading | None,
        curr: BoilerReading,
        snapshot: BoilerSourceHeaterSnapshot,
    ) -> BoilerActivityDTO:
        """Classify the current boiler activity.

        Args:
            prev: Previous reading, or ``None`` for the very first call.
            curr: Current reading.
            snapshot: Source/heater snapshot from the runtime boundary.

        Returns:
            A ``BoilerActivityDTO`` with deterministic state, trend, fill,
            and heater normalization.
        """
        stale_flags: list[str] = []
        if curr.top_temp_c is None:
            stale_flags.append("temperature_unavailable")

        heater_states = _normalize_heater_states(snapshot.active_heaters)
        any_active_heater = any(state == "on" for state in heater_states.values())

        source = _normalize_source(curr.source_key, snapshot.current_source)

        trend = _compute_trend(prev, curr)

        fill_level = _compute_fill_level(curr.top_temp_c)

        state = _determine_activity_state(
            source=source,
            any_active_heater=any_active_heater,
            trend=trend,
            top_temp_available=curr.top_temp_c is not None,
            overflow_available=snapshot.overflow_available,
        )

        active_segment_hint: dict[str, Any] | None = None
        if state in ("charging_fve", "charging_overflow", "charging_grid", "discharging"):
            segment_key = source if source in _NORMALIZED_SOURCE_KEYS else "grid"
            if state == "charging_overflow":
                segment_key = "overflow"
            if state == "discharging":
                segment_key = "discharge"
            active_segment_hint = {
                "key": segment_key,
                "start": curr.timestamp,
                "end": None,
                "energy_kwh": 0.0,
                "fill_pct": 0.0,
                "active": True,
            }

        return BoilerActivityDTO(
            state=state,
            source=source,
            temperature_trend_c_per_min=trend,
            fill_level_pct=fill_level,
            aura_max_temp_c=_AURA_MAX_TEMP_C,
            active_segment_hint=active_segment_hint,
            heater_states=heater_states,
            stale_flags=stale_flags,
        )


def _normalize_source(
    reading_source_key: str | None,
    snapshot_source: Any | None,
) -> str | None:
    """Normalize any raw source value to the public union.

    Priority:
        1. ``reading_source_key`` if it is already a normalized key.
        2. Normalized ``snapshot_source`` otherwise.
    """
    if reading_source_key is not None:
        key = str(reading_source_key).lower().strip()
        if key in _NORMALIZED_SOURCE_KEYS:
            return key

    return _normalize_raw_source(snapshot_source)


def _normalize_raw_source(raw: Any | None) -> str | None:
    """Convert raw EnergySource enum, strings, or HA labels to normalized key."""
    if raw is None:
        return None

    if hasattr(raw, "value"):
        raw = raw.value

    if not isinstance(raw, str):
        return None

    value = raw.lower().strip()

    if value in ("fve", "zapnuto", "manual"):
        return "fve"

    if value in ("grid", "alternative", "alt"):
        return "grid"

    if value == "overflow":
        return "overflow"

    if value == "discharge":
        return "discharge"

    return None


def _normalize_heater_states(active_heaters: dict[str, str]) -> dict[str, str]:
    """Normalize raw heater entity states.

    Exact ``'on'`` or ``'off'`` are preserved; everything else becomes
    ``'unavailable'``.
    """
    result: dict[str, str] = {}
    for entity_id, raw in active_heaters.items():
        if isinstance(raw, str):
            raw = raw.lower().strip()
        if raw in ("on", "off"):
            result[entity_id] = raw
        else:
            result[entity_id] = "unavailable"
    return result


def _compute_trend(
    prev: BoilerReading | None,
    curr: BoilerReading,
) -> float | None:
    """Compute temperature trend in °C/min.

    Returns ``None`` when data is insufficient or out-of-order.
    Returns ``0.0`` inside the deadband.
    """
    if prev is None:
        return None
    if prev.top_temp_c is None or curr.top_temp_c is None:
        return None

    elapsed_seconds = (curr.timestamp - prev.timestamp).total_seconds()
    if elapsed_seconds <= 0:
        return None

    delta = curr.top_temp_c - prev.top_temp_c
    if abs(delta) < _DEADBAND_C:
        return 0.0

    return delta / (elapsed_seconds / 60.0)


def _compute_fill_level(top_temp_c: float | None) -> float:
    if top_temp_c is None:
        return 0.0
    return max(0.0, min(1.0, top_temp_c / _AURA_MAX_TEMP_C))


def _determine_activity_state(
    source: str | None,
    any_active_heater: bool,
    trend: float | None,
    top_temp_available: bool,
    overflow_available: bool | None,
) -> str:
    if not top_temp_available:
        return "unknown"

    if any_active_heater:
        if source == "overflow":
            return "charging_overflow"
        if source == "fve" and overflow_available is True:
            return "charging_overflow"
        if source == "fve":
            return "charging_fve"
        return "charging_grid"

    if trend is not None and trend <= _DISCHARGE_TREND_C_PER_MIN:
        return "discharging"

    return "standby"
