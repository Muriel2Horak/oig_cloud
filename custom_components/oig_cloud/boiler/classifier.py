"""Pure, HA-agnostic boiler activity classifier.

Task 1 / Task A of the Boiler V2 redesign.  This module must never import
Home Assistant or any package that transitively depends on it.

## Classification truth table (power-first)

1. ``power_w`` is available and > ``BOILER_POWER_ON_THRESHOLD_W``
   → **electric** heating is occurring.
   - ``box_boiler_mode == 'cbb'``  → source = 'overflow' (when
     ``overflow_available``) else 'fve'.
   - manual mode → source = 'grid' when ``grid_import_w > 0.5 × power_w``
     (house concurrently importing ≳ boiler load), else 'fve'.
   heater_states switches are reported as *info only* and do NOT drive this
   branch.

2. Not electric **and** ``alt_heat_delta_kwh > 0``
   → ``charging_alt`` / source = 'alternative'  (metered gas/heat-pump delta).

3. Not electric **and** trend ≥ ``ALT_TREND_THRESHOLD_C_PER_MIN`` **and**
   alt meter unavailable **and** ``has_alternative`` hint
   → ``charging_alt`` / source = 'alternative' (estimated, ``source_estimated=True``).

4. trend ≤ ``_DISCHARGE_TREND_C_PER_MIN``  → ``discharging``

5. otherwise → ``standby``

6. ``power_w is None``  → fall back to old switch-based heuristic
   (backward compat for installs without a current-power sensor).
   ``source_estimated = True`` in that case.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from .const import (
    ALT_TREND_THRESHOLD_C_PER_MIN,
    BOILER_POWER_ON_THRESHOLD_W,
    BOILER_READY_TEMP_C,
)


_AURA_MAX_TEMP_C = 80.0
_DEADBAND_C = 0.05
_DISCHARGE_TREND_C_PER_MIN = -0.02

# Cold-inlet reference temperature for fill-level physics (°C).
# This is the temperature of fresh tap water entering the boiler.
_COLD_INLET_TEMP_C = 10.0

_NORMALIZED_SOURCE_KEYS = frozenset({"fve", "overflow", "grid", "discharge", "alternative"})


@dataclass
class BoilerReading:
    """A single boiler sensor reading."""

    timestamp: datetime
    top_temp_c: float | None
    bottom_temp_c: float | None
    source_key: str | None = None


@dataclass
class BoilerSourceHeaterSnapshot:
    """Heater/source snapshot passed to the classifier.

    New fields (Task A — power-first classification):

    ``power_w``
        Live CBB→boiler power in Watts from
        ``sensor.oig_{box_id}_boiler_current_cbb_w``.
        ``None`` means the sensor is absent (old install) — in that case the
        classifier falls back to the legacy switch-based heuristic.

    ``box_boiler_mode``
        Normalised box boiler mode string, e.g. ``'cbb'`` (surplus/auto) or
        ``'manual'``.  ``None`` = unknown.  Case-insensitive.

    ``grid_import_w``
        Total household grid import in Watts at this instant
        (e.g. ``sensor.oig_{box_id}_actual_aci_wtotal``).
        Used to disambiguate grid vs FVE when box is in manual mode.
        ``None`` = sensor absent or unavailable.

    ``pv_surplus_hint``
        True when the current plan slot or battery SoC indicates active PV
        overflow.  Forwarded from ``overflow_available``.  Kept for
        backward compatibility.

    ``alt_heat_delta_kwh``
        kWh increase in the alternative-heat meter (e.g. gas meter for hot
        water) since the previous classify call.  Positive value → gas/heat-pump
        fired.  ``None`` = no meter configured.
    """

    current_source: Any | None = None
    active_heaters: dict[str, str] = field(default_factory=dict)
    overflow_available: bool | None = None
    # Legacy field kept for backward compat — reading in kW from
    # CONF_BOILER_HEATER_POWER_KW_ENTITY (if configured).  Not used for
    # classification when power_w is set.
    power_kw: float | None = None

    # --- Task A: new power-first fields ---
    power_w: float | None = None
    """Live CBB→boiler power (W).  None = sensor absent → legacy fallback."""

    box_boiler_mode: str | None = None
    """Normalised box boiler mode: 'cbb' | 'manual' | None."""

    grid_import_w: float | None = None
    """Total household grid import at this instant (W).  None = unavailable."""

    pv_surplus_hint: bool | None = None
    """True when current plan slot shows PV overflow.  Mirrors overflow_available."""

    alt_heat_delta_kwh: float | None = None
    """Gas/alt-heat meter delta since last call (kWh).  None = no meter."""

    has_alternative: bool | None = None
    """Explicit capability flag from config (boiler_has_alternative_heating).

    The legacy derivation from ``current_source == 'alternative'`` never fires
    on real installs (the runtime source snapshot reports grid/fve modes), so
    without this flag the trend-based gas detection (Branch C) was dead: gas
    heating at +1.9 °C/min showed as 'standby'.  None = unknown → legacy
    derivation."""


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
    source_estimated: bool = False
    """True when the source was inferred (no direct power meter or alt meter)."""


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

        source = _normalize_source(curr.source_key, snapshot.current_source)

        trend = _compute_trend(prev, curr)

        fill_level = compute_ready_fraction(
            top_c=curr.top_temp_c,
            bottom_c=curr.bottom_temp_c,
        )

        state, resolved_source, source_estimated = _determine_activity_state(
            snapshot=snapshot,
            source=source,
            heater_states=heater_states,
            trend=trend,
            top_temp_available=curr.top_temp_c is not None,
        )

        active_segment_hint: dict[str, Any] | None = None
        if state in (
            "charging_fve", "charging_overflow", "charging_grid",
            "charging_alt", "discharging",
        ):
            segment_key = resolved_source if resolved_source in _NORMALIZED_SOURCE_KEYS else "grid"
            if state == "charging_overflow":
                segment_key = "overflow"
            elif state == "charging_alt":
                segment_key = "alternative"
            elif state == "discharging":
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
            source=resolved_source,
            temperature_trend_c_per_min=trend,
            fill_level_pct=fill_level,
            aura_max_temp_c=_AURA_MAX_TEMP_C,
            active_segment_hint=active_segment_hint,
            heater_states=heater_states,
            stale_flags=stale_flags,
            source_estimated=source_estimated,
        )


def compute_ready_fraction(
    top_c: float | None,
    bottom_c: float | None,
    ready_temp_c: float = BOILER_READY_TEMP_C,
    cold_inlet_c: float = _COLD_INLET_TEMP_C,
) -> float:
    """Compute the fraction of boiler volume with temperature ≥ ready_temp_c.

    Physics model (linear stratification):
    - When BOTH top and bottom temperatures are available:
      Assumes linear temperature gradient from bottom → top across the full
      tank volume.  Returns the fraction of tank height where T ≥ ready_temp_c,
      clamped to [0, 1].
      - Both ≥ ready_temp_c → 1.0 (fully ready)
      - Both < ready_temp_c  → 0.0 (cold)
      - Linear interpolation for all cases in between.
    - When only top temperature is available (conservative):
      top < ready_temp_c → 0.0 (we cannot confirm any usable volume)
      top ≥ ready_temp_c → fractional estimate of usable upper zone only.
        fraction = clamp((top_c - ready_temp_c) / (top_c - cold_inlet_c), 0, 1)
        This is intentionally conservative: only the top portion above the
        ready threshold is counted; the rest is assumed cold.
    - top_c is None → 0.0 (no data)
    """
    if top_c is None:
        return 0.0

    if bottom_c is not None:
        # Both sensors: linear stratification bottom → top.
        if bottom_c >= ready_temp_c and top_c >= ready_temp_c:
            return 1.0
        if bottom_c < ready_temp_c and top_c < ready_temp_c:
            return 0.0
        # Partial: find the fraction of height above the ready_temp threshold.
        # Linear gradient: T(h) = bottom_c + h*(top_c - bottom_c), h ∈ [0, 1]
        # At the ready threshold: h_ready = (ready_temp_c - bottom_c) / (top_c - bottom_c)
        temp_range = top_c - bottom_c
        if abs(temp_range) < 1e-9:
            # Uniform temperature across the tank
            return 1.0 if top_c >= ready_temp_c else 0.0
        h_ready = (ready_temp_c - bottom_c) / temp_range
        h_ready = max(0.0, min(1.0, h_ready))
        if top_c > bottom_c:
            # Hot water is on top: ready fraction = 1 - h_ready
            return max(0.0, min(1.0, 1.0 - h_ready))
        else:
            # Unusual: bottom hotter than top (e.g. fresh sensor reads) — conservative
            return max(0.0, min(1.0, h_ready))

    # top-only conservative estimate
    if top_c < ready_temp_c:
        return 0.0
    denominator = top_c - cold_inlet_c
    if denominator <= 0:
        return 0.0
    fraction = (top_c - ready_temp_c) / denominator
    return max(0.0, min(1.0, fraction))


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
    """Convert raw EnergySource enum, strings, or HA labels to normalized key.

    NOTE: 'alternative' and 'alt' now map correctly to 'alternative'
    (previously they were incorrectly mapped to 'grid' — Task A fix).
    The old behaviour was retained for the legacy ``_normalize_runtime_source``
    in api_views.py which has its own mapping table.
    """
    if raw is None:
        return None

    if hasattr(raw, "value"):
        raw = raw.value

    if not isinstance(raw, str):
        return None

    value = raw.lower().strip()

    if value in ("fve", "zapnuto", "manual"):
        return "fve"

    if value in ("alternative", "alt"):
        return "alternative"

    if value == "grid":
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


def _determine_activity_state(
    snapshot: BoilerSourceHeaterSnapshot,
    source: str | None,
    heater_states: dict[str, str],
    trend: float | None,
    top_temp_available: bool,
) -> tuple[str, str | None, bool]:
    """Classify state, resolved source, and whether source is estimated.

    Returns:
        (state, resolved_source, source_estimated)

    ## Classification logic (power-first)

    **Branch A — electric heating (power_w available)**:
      When ``power_w >= BOILER_POWER_ON_THRESHOLD_W`` (default 100 W) the box
      is sending electricity to the boiler.  Source determination:
      - ``box_boiler_mode == 'cbb'`` (auto/surplus mode):
        source = 'overflow' if overflow is available, else 'fve'.
      - Manual mode:
        source = 'grid' if ``grid_import_w > 0.5 × power_w`` (the house is
        concurrently importing roughly the boiler load), else 'fve'.
        This simple heuristic avoids false "grid" calls when the house is
        self-sufficient but the user manually turned on the heater.
      The heater_states switches are **not** used to decide whether heating
      occurs — only ``power_w`` determines that.

    **Branch B — alternative heat (metered)**:
      Not electric, but ``alt_heat_delta_kwh > 0``.  Gas or heat-pump fired.
      state = 'charging_alt', source = 'alternative'.

    **Branch C — alternative heat (estimated by trend)**:
      Not electric, no alt meter, but trend ≥ ``ALT_TREND_THRESHOLD_C_PER_MIN``
      and the ``has_alternative`` hint (``snapshot.pv_surplus_hint`` is not used
      here — ``snapshot.current_source`` carries the has_alternative flag as an
      EnergySource.ALTERNATIVE or 'alternative' string from the runtime).
      state = 'charging_alt', source = 'alternative', source_estimated = True.

    **Branch D — power_w not available (legacy fallback)**:
      Fall back to switch-based heuristic (original behaviour).
      source_estimated = True.  NEVER used when power_w is available.

    **Branch E — discharging**:
      trend ≤ ``_DISCHARGE_TREND_C_PER_MIN``.

    **Branch F — standby** (default).
    """
    if not top_temp_available:
        return "unknown", source, False

    has_alternative = _snapshot_has_alternative(snapshot, source)

    # -----------------------------------------------------------------------
    # Branch A: power_w available — power-first truth
    # -----------------------------------------------------------------------
    if snapshot.power_w is not None:
        if snapshot.power_w >= BOILER_POWER_ON_THRESHOLD_W:
            # Electric heating is occurring — determine source.
            mode = (snapshot.box_boiler_mode or "").lower().strip()
            overflow_avail = (
                snapshot.pv_surplus_hint
                if snapshot.pv_surplus_hint is not None
                else snapshot.overflow_available
            )

            if mode == "cbb":
                if overflow_avail:
                    return "charging_overflow", "overflow", False
                else:
                    return "charging_fve", "fve", False
            else:
                # Manual mode (or unknown mode): use grid-import heuristic.
                # Grid if household imports ≳ boiler power (>50% of load).
                grid_import = snapshot.grid_import_w
                if (
                    grid_import is not None
                    and grid_import > 0.5 * snapshot.power_w
                ):
                    return "charging_grid", "grid", False
                else:
                    return "charging_fve", "fve", False

        # power_w available but == 0 (or below threshold) — NOT charging.
        # Fall through to alt/trend/discharge/standby branches.
        # Do NOT use switch states here.

        # Branch B: metered alternative heat
        if snapshot.alt_heat_delta_kwh is not None and snapshot.alt_heat_delta_kwh > 0:
            return "charging_alt", "alternative", False

        # Branch C: trend-estimated alternative heat
        if (
            trend is not None
            and trend >= ALT_TREND_THRESHOLD_C_PER_MIN
            and has_alternative
        ):
            return "charging_alt", "alternative", True

        # Branch E: discharging
        if trend is not None and trend <= _DISCHARGE_TREND_C_PER_MIN:
            return "discharging", source, False

        return "standby", source, False

    # -----------------------------------------------------------------------
    # Branch D: power_w not available — legacy switch-based fallback.
    # Backward compatibility for installs without current_cbb_w sensor.
    # source_estimated = True always in this path.
    # -----------------------------------------------------------------------
    any_active_heater = any(s == "on" for s in heater_states.values())

    if any_active_heater:
        if source == "overflow":
            return "charging_overflow", source, True
        if source == "fve" and snapshot.overflow_available is True:
            return "charging_overflow", source, True
        if source == "fve":
            return "charging_fve", source, True
        # Default: charging_grid
        return "charging_grid", source if source else "grid", True

    # Not actively heating (by switch) — check alt/trend/discharge.
    if snapshot.alt_heat_delta_kwh is not None and snapshot.alt_heat_delta_kwh > 0:
        return "charging_alt", "alternative", False

    if (
        trend is not None
        and trend >= ALT_TREND_THRESHOLD_C_PER_MIN
        and has_alternative
    ):
        return "charging_alt", "alternative", True

    if trend is not None and trend <= _DISCHARGE_TREND_C_PER_MIN:
        return "discharging", source, True

    return "standby", source, True


def _snapshot_has_alternative(
    snapshot: BoilerSourceHeaterSnapshot,
    source: str | None,
) -> bool:
    """Return True when the runtime signals that alternative heating exists.

    Checks (in order):
    - ``snapshot.has_alternative`` — explicit config capability flag (preferred;
      the source-based derivations below never fire on real installs).
    - ``source == 'alternative'`` (current source resolved to alternative)
    - ``snapshot.current_source`` is a raw 'alternative' / 'alt' string or
      EnergySource.ALTERNATIVE enum value.
    """
    if snapshot.has_alternative is not None:
        return bool(snapshot.has_alternative)
    if source == "alternative":
        return True
    raw = snapshot.current_source
    if raw is None:
        return False
    if hasattr(raw, "value"):
        raw = raw.value
    if isinstance(raw, str):
        return raw.lower().strip() in ("alternative", "alt")
    return False
