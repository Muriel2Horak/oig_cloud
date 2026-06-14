"""Demand-map profiler for F2: percentile draw detection from temperature history.

Design:
- Rate-based draw detection: >= 0.15 degC/min sustained over >= 2 consecutive
  sensor intervals AND total drop >= 0.5 degC.  Rejects standing-loss (~0.05
  degC/min) while capturing genuine hot-water draws.
- 96 x 15-min slot buckets per day-category (workday/weekend x season).
- p50/p80 percentiles across observed draws; fallback chain when sparse.
- Liters conversion: liters = kWh / (ENERGY_CONSTANT_KWH_L_K * delta_T)
  where ENERGY_CONSTANT_KWH_L_K = 1.163e-3 kWh/(L·K) and
  delta_T = target_temp_c - cold_inlet_temp_c.
"""

from __future__ import annotations

import bisect
import logging
import math
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Optional

_LOGGER = logging.getLogger(__name__)

# Thermal constants
# c = 4186 J/(kg·K), 1 kWh = 3_600_000 J → 4186/3_600_000 = 1.1628e-3 kWh/(L·K)
ENERGY_CONSTANT_KWH_L_K: float = 4186.0 / 3_600_000.0  # ~1.163e-3 kWh/(L·K)

# Draw detection thresholds (validated against live data 2026-06-04)
DRAW_RATE_THRESHOLD_C_PER_MIN: float = 0.15  # degC/min — rejects standing loss (~0.05)
DRAW_MIN_DROP_C: float = 0.5  # minimum total drop to count as draw
DRAW_MIN_INTERVALS: int = 2  # sustained over at least 2 consecutive intervals

# Slot model
SLOT_DURATION_MIN: int = 15
SLOTS_PER_DAY: int = 96  # 24 h * 4 slots/h

# Percentile thresholds
MIN_SAMPLES_FOR_PERCENTILE: int = 3  # minimum days with draws to compute meaningful p80
MIN_CONFIDENCE_THRESHOLD: float = 0.3  # confidence below this → empty state

# Window clustering
NOISE_FLOOR_KWH: float = 0.05  # p80 below this → ignore slot for window clustering
MAX_WINDOWS_PER_DAY: int = 3  # cap on readiness windows

# Window labels by time-of-day (hour of the first slot's start)
_WINDOW_LABELS: list[tuple[int, int, str]] = [
    (4, 10, "morning"),   # 04:00–10:00
    (10, 17, "day"),      # 10:00–17:00
    (17, 24, "evening"),  # 17:00–24:00
    (0, 4, "night"),      # 00:00–04:00
]

SEASON_MAP: dict[int, str] = {
    3: "spring", 4: "spring", 5: "spring",
    6: "summer", 7: "summer", 8: "summer",
    9: "autumn", 10: "autumn", 11: "autumn",
    12: "winter", 1: "winter", 2: "winter",
}

PROFILE_CATEGORIES = [
    "workday_spring", "workday_summer", "workday_autumn", "workday_winter",
    "weekend_spring", "weekend_summer", "weekend_autumn", "weekend_winter",
]


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class DrawEvent:
    """A single detected hot-water draw."""
    start: datetime
    end: datetime
    drop_c: float          # total temperature drop [degC]
    rate_c_per_min: float  # mean rate during draw [degC/min]
    energy_kwh: float      # estimated energy removed [kWh]
    liters: float          # equivalent hot-water volume at target temp [L]


@dataclass
class DemandSlot:
    """Statistics for one 15-min slot index (0..95)."""
    p50_kwh: float = 0.0
    p80_kwh: float = 0.0
    liters_p80: float = 0.0
    # has_data distinguishes zero-draw (valid 0) from missing data
    has_data: bool = False


@dataclass
class DemandWindow:
    """A readiness window: contiguous slots with p80 above noise floor."""
    slot_index: int          # first slot index
    start_minute: int        # minutes from midnight of first slot
    p80_kwh: float
    liters: float
    label: str               # "morning" | "day" | "evening" | "night"


@dataclass
class MatchMeta:
    """Describes which profile level was used for the demand map."""
    category: str            # original requested category (what we plan FOR)
    level: str               # "exact" | "day_type" | "global" | "bootstrap"
    days_used: int
    label: str               # human-readable for `category` (English; FE adds i18n)
    fallback_used: bool
    source_category: str = ""  # category the data was actually BORROWED from (fallback)


@dataclass
class DemandMap:
    """Full demand map returned by get_demand_map()."""
    slots: list[DemandSlot]              # 96 entries
    windows: list[DemandWindow]          # up to MAX_WINDOWS_PER_DAY
    meta: MatchMeta
    confidence: float                    # 0..1

    def to_dto(self) -> dict[str, Any]:
        """Serialize to canonical DTO dict (lean, rounded)."""
        return {
            "slot_duration_min": SLOT_DURATION_MIN,
            "slots_p50": [round(s.p50_kwh, 3) for s in self.slots],
            "slots_p80": [round(s.p80_kwh, 3) for s in self.slots],
            "slots_liters_p80": [round(s.liters_p80, 1) for s in self.slots],
            "windows": [
                {
                    "slot_index": w.slot_index,
                    "start_minute": w.start_minute,
                    "p80_kwh": round(w.p80_kwh, 3),
                    "liters": round(w.liters, 1),
                    "label": w.label,
                }
                for w in self.windows
            ],
            "profile": {
                "category": self.meta.category,
                "level": self.meta.level,
                "days_used": self.meta.days_used,
                "label": self.meta.label,
                "fallback_used": self.meta.fallback_used,
                "source_category": self.meta.source_category,
            },
            "confidence": round(self.confidence, 2),
        }


# ---------------------------------------------------------------------------
# Draw detection
# ---------------------------------------------------------------------------

def detect_draws(
    history: list[dict],
    volume_l: float,
    target_temp_c: float,
    cold_inlet_temp_c: float,
    threshold_c_per_min: float = DRAW_RATE_THRESHOLD_C_PER_MIN,
    min_drop_c: float = DRAW_MIN_DROP_C,
    min_intervals: int = DRAW_MIN_INTERVALS,
) -> list[DrawEvent]:
    """Detect hot-water draw events from temperature history.

    Args:
        history: Sorted list of dicts with keys: timestamp (datetime),
                 temp (float), heating (str "on"|"off").
        volume_l: Tank volume [L].
        target_temp_c: Target hot-water temperature [degC].
        cold_inlet_temp_c: Cold-inlet temperature [degC].
        threshold_c_per_min: Rate threshold [degC/min].
        min_drop_c: Minimum total drop [degC].
        min_intervals: Minimum sustained intervals.

    Returns:
        List of DrawEvent (sorted by start time).
    """
    if len(history) < 2:
        return []

    sorted_history = sorted(history, key=lambda x: x["timestamp"])
    delta_t = target_temp_c - cold_inlet_temp_c
    if delta_t <= 0.0:
        delta_t = 30.0  # fallback

    events: list[DrawEvent] = []
    i = 0
    n = len(sorted_history)

    while i < n - 1:
        entry = sorted_history[i]
        # Skip heating periods
        if entry.get("heating", "off") == "on":
            i += 1
            continue

        # Look for a rate-based draw starting at i
        # A draw = consecutive intervals each with rate >= threshold,
        # heating off throughout, total drop >= min_drop_c
        draw_start = i
        sustained = 0
        j = i + 1

        while j < n:
            curr = sorted_history[j]
            prev = sorted_history[j - 1]

            # If heating comes on, break the draw window
            if curr.get("heating", "off") == "on":
                break

            interval_sec = (curr["timestamp"] - prev["timestamp"]).total_seconds()
            if interval_sec <= 0:
                j += 1
                continue

            drop = prev["temp"] - curr["temp"]
            rate = (drop / interval_sec) * 60.0  # degC/min

            if rate >= threshold_c_per_min:
                sustained += 1
                j += 1
            else:
                # Rate dropped below threshold — stop extending
                break

        # Check if we had enough sustained intervals and enough total drop
        if sustained >= min_intervals:
            draw_end_idx = j - 1
            total_drop = sorted_history[draw_start]["temp"] - sorted_history[draw_end_idx]["temp"]
            if total_drop >= min_drop_c:
                start_dt = sorted_history[draw_start]["timestamp"]
                end_dt = sorted_history[draw_end_idx]["timestamp"]
                dur_sec = (end_dt - start_dt).total_seconds()
                mean_rate = (total_drop / dur_sec * 60.0) if dur_sec > 0 else threshold_c_per_min
                energy_kwh = total_drop * volume_l * ENERGY_CONSTANT_KWH_L_K
                liters = energy_kwh / (ENERGY_CONSTANT_KWH_L_K * delta_t) if delta_t > 0 else 0.0

                events.append(DrawEvent(
                    start=start_dt,
                    end=end_dt,
                    drop_c=round(total_drop, 2),
                    rate_c_per_min=round(mean_rate, 3),
                    energy_kwh=round(energy_kwh, 4),
                    liters=round(liters, 1),
                ))
                # Skip past this draw to avoid double-counting overlapping windows
                i = draw_end_idx
                continue

        i += 1

    return events


# ---------------------------------------------------------------------------
# Category helpers
# ---------------------------------------------------------------------------

def _get_day_category(dt: datetime) -> str:
    """Return workday|weekend × spring|summer|autumn|winter category."""
    is_weekend = dt.weekday() >= 5
    season = SEASON_MAP.get(dt.month, "spring")
    day_type = "weekend" if is_weekend else "workday"
    return f"{day_type}_{season}"


def _day_type(category: str) -> str:
    return category.split("_")[0]  # "workday" or "weekend"


def _slot_index(dt: datetime) -> int:
    """Convert a datetime to a 15-min slot index 0..95."""
    return (dt.hour * 60 + dt.minute) // SLOT_DURATION_MIN


def _slot_start_minute(slot_idx: int) -> int:
    """Minutes from midnight for a slot index."""
    return slot_idx * SLOT_DURATION_MIN


def _window_label(start_minute: int) -> str:
    hour = start_minute // 60
    for h_start, h_end, label in _WINDOW_LABELS:
        if h_start <= hour < h_end:
            return label
    return "night"


# ---------------------------------------------------------------------------
# Slot distribution: distribute draw energy across 15-min slots it spans
# ---------------------------------------------------------------------------

def _distribute_draw_to_slots(draw: DrawEvent) -> dict[int, float]:
    """Return {slot_index: kwh_fraction} for all 15-min slots the draw touches.

    Slot indices are computed in local time so that the 96-slot profile
    represents the user's local clock (e.g. slot 6 = 01:30 local, not UTC).
    """
    total_sec = (draw.end - draw.start).total_seconds()
    local_start = _as_local(draw.start)
    if total_sec <= 0:
        # Single-slot draw: put all in start slot (local time)
        return {_slot_index(local_start): draw.energy_kwh}

    result: dict[int, float] = {}
    # Walk each 15-min slot from draw.start to draw.end (in original tz for
    # wall-clock arithmetic; slot indices derived from local conversion)
    slot_start = draw.start.replace(
        minute=(draw.start.minute // 15) * 15,
        second=0,
        microsecond=0,
    )

    while True:
        slot_end = slot_start + timedelta(minutes=SLOT_DURATION_MIN)
        # Overlap between draw window and this slot
        overlap_start = max(draw.start, slot_start)
        overlap_end = min(draw.end, slot_end)
        overlap_sec = (overlap_end - overlap_start).total_seconds()
        if overlap_sec > 0:
            fraction = overlap_sec / total_sec
            # Convert slot boundary to local time for slot index
            idx = _slot_index(_as_local(slot_start))
            result[idx] = result.get(idx, 0.0) + draw.energy_kwh * fraction
        if slot_end >= draw.end:
            break
        slot_start = slot_end

    return result


# ---------------------------------------------------------------------------
# Profile storage: category -> list-of-days -> slot -> kWh samples
# ---------------------------------------------------------------------------

# Internal type: dict[category, dict[day_str, dict[slot_idx, float]]]
# For each observed day, we sum kWh per slot (single observation per slot per day).
CategorySlots = dict[str, dict[str, dict[int, float]]]


def _as_local(dt: datetime) -> datetime:
    """Convert a datetime to local time using dt_util when available.

    Falls back to the datetime as-is (useful in tests that pass local-aware
    datetimes directly).
    """
    try:
        from homeassistant.util import dt as dt_util
        return dt_util.as_local(dt)
    except Exception:
        return dt


def build_category_slots(
    draws: list[DrawEvent],
) -> CategorySlots:
    """Aggregate draw events into per-category per-day per-slot kWh sums.

    draw.start/draw.end are converted to local time before computing the
    day-category and slot index so that a 22:30 UTC Friday draw that is
    actually 00:30 Saturday local time is classified as weekend, not workday.

    Returns:
        {category: {day_str: {slot_idx: kwh}}}
    """
    result: CategorySlots = {}

    for draw in draws:
        local_start = _as_local(draw.start)
        category = _get_day_category(local_start)
        day_str = local_start.strftime("%Y-%m-%d")
        slots = _distribute_draw_to_slots(draw)

        cat_data = result.setdefault(category, {})
        day_data = cat_data.setdefault(day_str, {})
        for slot_idx, kwh in slots.items():
            day_data[slot_idx] = day_data.get(slot_idx, 0.0) + kwh

    return result


# ---------------------------------------------------------------------------
# Percentile computation
# ---------------------------------------------------------------------------

def _percentile(values: list[float], p: float) -> float:
    """Compute p-th percentile of values (0..100) using linear interpolation."""
    if not values:
        return 0.0
    sorted_v = sorted(values)
    n = len(sorted_v)
    if n == 1:
        return sorted_v[0]
    idx_f = (p / 100.0) * (n - 1)
    lo = int(math.floor(idx_f))
    hi = min(lo + 1, n - 1)
    frac = idx_f - lo
    return sorted_v[lo] + frac * (sorted_v[hi] - sorted_v[lo])


def _compute_slots_from_category_data(
    cat_data: dict[str, dict[int, float]],
    volume_l: float,
    target_temp_c: float,
    cold_inlet_temp_c: float,
) -> list[DemandSlot]:
    """Compute DemandSlot list from per-day slot data.

    For each slot index, collect the kWh values across all observed days.
    Days with no draw in a slot contribute 0.0 — this is correct because
    zero consumption IS data (not missing data).

    has_data is True if at least 1 day had any draw in any slot.
    """
    delta_t = max(target_temp_c - cold_inlet_temp_c, 1.0)
    total_days = len(cat_data)
    has_any_draw = total_days > 0

    # Build per-slot sample lists including zero for days without a draw
    slot_samples: dict[int, list[float]] = defaultdict(list)
    for _day, day_slots in cat_data.items():
        for slot_idx in range(SLOTS_PER_DAY):
            slot_samples[slot_idx].append(day_slots.get(slot_idx, 0.0))

    result: list[DemandSlot] = []
    for idx in range(SLOTS_PER_DAY):
        samples = slot_samples.get(idx, [])
        if samples:
            p50 = _percentile(samples, 50)
            p80 = _percentile(samples, 80)
        else:
            p50 = p80 = 0.0
        liters_p80 = p80 / (ENERGY_CONSTANT_KWH_L_K * delta_t) if p80 > 0.0 else 0.0
        result.append(DemandSlot(
            p50_kwh=p50,
            p80_kwh=p80,
            liters_p80=liters_p80,
            has_data=has_any_draw,
        ))

    return result


# ---------------------------------------------------------------------------
# Fallback chain
# ---------------------------------------------------------------------------

def _fallback_chain(category: str) -> list[tuple[str, str]]:
    """Return ordered (key, level_label) pairs for the fallback chain."""
    day_type = _day_type(category)
    chain = [(category, "exact")]
    # Same day-type, any season
    for cat in PROFILE_CATEGORIES:
        if cat != category and cat.startswith(day_type):
            chain.append((cat, "day_type"))
    # All categories (global)
    for cat in PROFILE_CATEGORIES:
        if cat != category and not cat.startswith(day_type):
            chain.append((cat, "global"))
    return chain


def _category_label(category: str, days_used: int) -> str:
    """Human-readable label for a category."""
    cat_names = {
        "workday": "workday", "weekend": "weekend",
    }
    season_names = {
        "spring": "spring", "summer": "summer",
        "autumn": "autumn", "winter": "winter",
    }
    parts = category.split("_", 1)
    day_type_label = cat_names.get(parts[0], parts[0])
    season_label = season_names.get(parts[1], parts[1]) if len(parts) > 1 else ""
    return f"{day_type_label} ({season_label}), {days_used} days"


# ---------------------------------------------------------------------------
# Main demand profiler class
# ---------------------------------------------------------------------------

class BoilerDemandProfiler:
    """Demand-map profiler: detects draws from temperature history and builds
    per-category 96-slot percentile statistics.

    Usage:
        profiler = BoilerDemandProfiler(volume_l=120, target_temp_c=60, cold_inlet_temp_c=10)
        profiler.update(temperature_history)
        demand_map = profiler.get_demand_map("workday_summer")
    """

    def __init__(
        self,
        volume_l: float,
        target_temp_c: float,
        cold_inlet_temp_c: float,
        draw_threshold_c_per_min: float = DRAW_RATE_THRESHOLD_C_PER_MIN,
    ) -> None:
        self.volume_l = volume_l
        self.target_temp_c = target_temp_c
        self.cold_inlet_temp_c = cold_inlet_temp_c
        self.draw_threshold_c_per_min = draw_threshold_c_per_min
        # category -> {day_str -> {slot_idx -> kwh}}
        self._category_slots: CategorySlots = {}
        self._last_draw_count: int = 0

    def update(self, history: list[dict]) -> None:
        """Process temperature history and update internal slot statistics.

        Args:
            history: List of dicts with keys: timestamp (datetime),
                     temp (float), heating (str "on"|"off").
        """
        draws = detect_draws(
            history,
            volume_l=self.volume_l,
            target_temp_c=self.target_temp_c,
            cold_inlet_temp_c=self.cold_inlet_temp_c,
            threshold_c_per_min=self.draw_threshold_c_per_min,
        )
        self._last_draw_count = len(draws)
        self._category_slots = build_category_slots(draws)
        _LOGGER.debug(
            "DemandProfiler: %d draws detected, %d categories populated",
            len(draws),
            len(self._category_slots),
        )

    def get_demand_map(self, category: str) -> DemandMap:
        """Return DemandMap for the given category using the fallback chain.

        Args:
            category: Day category string like "workday_summer".

        Returns:
            DemandMap with 96 slots, windows, and match metadata.
        """
        slots, meta = self._resolve_slots(category)
        windows = _cluster_windows(slots, self.target_temp_c, self.cold_inlet_temp_c)
        confidence = self._compute_confidence(meta)
        return DemandMap(slots=slots, windows=windows, meta=meta, confidence=confidence)

    def _resolve_slots(
        self, category: str
    ) -> tuple[list[DemandSlot], MatchMeta]:
        """Walk the fallback chain and return (slots, meta) for the best level."""
        chain = _fallback_chain(category)

        # Try exact and fallback candidates
        for cat_key, level in chain:
            cat_data = self._category_slots.get(cat_key)
            if not cat_data:
                continue
            days_used = len(cat_data)
            if days_used < MIN_SAMPLES_FOR_PERCENTILE and level == "exact":
                # Try fallback but keep this as the merge source
                pass
            if days_used >= MIN_SAMPLES_FOR_PERCENTILE or level == "global":
                slots = _compute_slots_from_category_data(
                    cat_data,
                    self.volume_l,
                    self.target_temp_c,
                    self.cold_inlet_temp_c,
                )
                meta = MatchMeta(
                    category=category,
                    level=level,
                    days_used=days_used,
                    # Label describes what we PLAN FOR (requested category) so it
                    # never contradicts `category`; the borrowed profile is in
                    # source_category + fallback_used.
                    label=_category_label(category, days_used),
                    fallback_used=level != "exact",
                    source_category=cat_key,
                )
                return slots, meta

        # Try exact category even if sparse (< MIN_SAMPLES_FOR_PERCENTILE)
        cat_data = self._category_slots.get(category)
        if cat_data:
            days_used = len(cat_data)
            slots = _compute_slots_from_category_data(
                cat_data,
                self.volume_l,
                self.target_temp_c,
                self.cold_inlet_temp_c,
            )
            meta = MatchMeta(
                category=category,
                level="exact",
                days_used=days_used,
                label=_category_label(category, days_used),
                fallback_used=False,
                source_category=category,
            )
            return slots, meta

        # Bootstrap fallback — no data at all
        empty_slots = [DemandSlot() for _ in range(SLOTS_PER_DAY)]
        meta = MatchMeta(
            category=category,
            level="bootstrap",
            days_used=0,
            label="no history (bootstrap)",
            fallback_used=True,
            source_category="",
        )
        return empty_slots, meta

    def _compute_confidence(self, meta: MatchMeta) -> float:
        """Compute confidence 0..1 from days_used and level."""
        if meta.level == "bootstrap":
            return 0.0
        if meta.level == "exact":
            # 10 days = 1.0
            return min(1.0, meta.days_used / 10.0)
        if meta.level == "day_type":
            return min(0.7, meta.days_used / 15.0)
        # global
        return min(0.5, meta.days_used / 20.0)


# ---------------------------------------------------------------------------
# Window clustering
# ---------------------------------------------------------------------------

def _cluster_windows(
    slots: list[DemandSlot],
    target_temp_c: float,
    cold_inlet_temp_c: float,
) -> list[DemandWindow]:
    """Cluster contiguous slots above noise floor into readiness windows.

    Returns up to MAX_WINDOWS_PER_DAY windows sorted by p80_kwh descending.
    """
    delta_t = max(target_temp_c - cold_inlet_temp_c, 1.0)
    windows: list[DemandWindow] = []
    in_window = False
    window_start = 0
    window_kwh = 0.0

    def _finish_window(start_idx: int, end_idx_exclusive: int, total_kwh: float) -> None:
        if total_kwh < NOISE_FLOOR_KWH:
            return
        start_min = _slot_start_minute(start_idx)
        liters = total_kwh / (ENERGY_CONSTANT_KWH_L_K * delta_t)
        label = _window_label(start_min)
        windows.append(DemandWindow(
            slot_index=start_idx,
            start_minute=start_min,
            p80_kwh=round(total_kwh, 3),
            liters=round(liters, 1),
            label=label,
        ))

    for idx, slot in enumerate(slots):
        if slot.p80_kwh >= NOISE_FLOOR_KWH:
            if not in_window:
                window_start = idx
                window_kwh = 0.0
                in_window = True
            window_kwh += slot.p80_kwh
        else:
            if in_window:
                _finish_window(window_start, idx, window_kwh)
                in_window = False

    if in_window:
        _finish_window(window_start, SLOTS_PER_DAY, window_kwh)

    # Sort by significance (p80_kwh desc), cap at MAX_WINDOWS_PER_DAY
    windows.sort(key=lambda w: w.p80_kwh, reverse=True)
    return windows[:MAX_WINDOWS_PER_DAY]


# ---------------------------------------------------------------------------
# Async profiler wrapper (follows executor pattern from existing profiler.py)
# ---------------------------------------------------------------------------

class BoilerDemandProfilerAsync:
    """Async wrapper around BoilerDemandProfiler that fetches recorder data.

    Follows the same executor pattern as BoilerProfiler._fetch_history.
    """

    def __init__(
        self,
        hass: Any,
        temp_sensor_entity: str,
        heating_entity: Optional[str],
        volume_l: float,
        target_temp_c: float,
        cold_inlet_temp_c: float,
        lookback_days: int = 90,
        draw_threshold_c_per_min: float = DRAW_RATE_THRESHOLD_C_PER_MIN,
    ) -> None:
        self.hass = hass
        self.temp_sensor_entity = temp_sensor_entity
        self.heating_entity = heating_entity
        self.lookback_days = lookback_days
        self._profiler = BoilerDemandProfiler(
            volume_l=volume_l,
            target_temp_c=target_temp_c,
            cold_inlet_temp_c=cold_inlet_temp_c,
            draw_threshold_c_per_min=draw_threshold_c_per_min,
        )

    async def async_update(self) -> None:
        """Fetch history from recorder and update demand profiles."""
        try:
            from homeassistant.components.recorder.history import state_changes_during_period
            from homeassistant.helpers.recorder import get_instance
            from homeassistant.util import dt as dt_util

            instance = get_instance(self.hass)
            if instance is None:
                _LOGGER.warning("DemandProfiler: recorder not available")
                return

            end_time = dt_util.now()
            start_time = end_time - timedelta(days=self.lookback_days)

            # Fetch temperature history
            temp_states = await instance.async_add_executor_job(
                state_changes_during_period,
                self.hass,
                start_time,
                end_time,
                self.temp_sensor_entity,
            )

            # Fetch heating state if configured.
            # Build a sorted list of (timestamp, is_on) pairs and use bisect
            # for last-value-carry-forward lookup, because the heating entity
            # and the temperature entity change state at different moments so
            # exact isoformat key matching always misses.
            heating_ts_list: list[datetime] = []
            heating_on_list: list[bool] = []
            if self.heating_entity:
                heating_raw = await instance.async_add_executor_job(
                    state_changes_during_period,
                    self.hass,
                    start_time,
                    end_time,
                    self.heating_entity,
                )
                pairs: list[tuple[datetime, bool]] = []
                for state in heating_raw.get(self.heating_entity, []):
                    try:
                        ts = state.last_updated
                        is_on = str(state.state).lower() in ("on", "true", "1", "zapnuto")
                        pairs.append((ts, is_on))
                    except (ValueError, AttributeError):
                        pass
                pairs.sort(key=lambda p: p[0])
                heating_ts_list = [p[0] for p in pairs]
                heating_on_list = [p[1] for p in pairs]

            def _is_heating_on_at(ts: datetime) -> bool:
                """Return True if heating was on at ts (last-value-carry-forward)."""
                if not heating_ts_list:
                    return False
                idx = bisect.bisect_right(heating_ts_list, ts) - 1
                if idx < 0:
                    return False
                return heating_on_list[idx]

            # Build history list
            temp_list = temp_states.get(self.temp_sensor_entity, [])
            history: list[dict] = []
            for state in temp_list:
                try:
                    temp = float(state.state)
                    ts = state.last_updated
                    heating_on = _is_heating_on_at(ts)
                    history.append({
                        "timestamp": ts,
                        "temp": temp,
                        "heating": "on" if heating_on else "off",
                    })
                except (ValueError, AttributeError):
                    continue

            _LOGGER.debug(
                "DemandProfiler: fetched %d temperature records for %s",
                len(history),
                self.temp_sensor_entity,
            )
            self._profiler.update(history)

        except Exception as err:
            _LOGGER.error("DemandProfiler async_update failed: %s", err, exc_info=True)

    def get_demand_map(self, category: str) -> DemandMap:
        """Return demand map for the given category."""
        return self._profiler.get_demand_map(category)
