"""The house's live load in the planner, and a replan when it jumps.

The load forecast is a learned profile corrected by today's completed hourly
statistics (``adaptive_consumption``). That correction arrives at the earliest
when an hour has closed and is averaged over three hours, so air conditioning
switched on at 06:00 reached the plan around 07:10, diluted. Meanwhile the box
kept the mode planned for a quiet morning (field case 15. 11. 2026: Home UPS
holding a full battery while the house drew 6.5 kW from the grid at 7.3 CZK).

Two pieces close that gap:

* ``LiveLoadTracker`` keeps the last minutes of the backup load sensor and gives
  a time-weighted mean; ``blend_live_load`` puts it into the current slot and
  fades it back to the profile over the next hour.
* ``LoadJumpDetector`` compares that mean with the load the published plan
  assumed for the current slot and asks for a replan at once when they differ
  clearly, instead of waiting for the next 15-minute run.

Pure: datetimes and floats in, so it tests without Home Assistant.
"""

from __future__ import annotations

from collections import deque
from datetime import datetime, timedelta
from typing import Any, Deque, Dict, List, Optional, Sequence, Tuple

# Mean of the last five minutes: a kettle (2 kW for 3 min) averages to about
# 1.2 kW, below the jump threshold, while air conditioning or a heat pump that
# stays on shows in full within the window.
LIVE_WINDOW = timedelta(minutes=5)
# Readings older than this are not "live": a silent sensor must not pin the
# plan to an old value.
MAX_SAMPLE_AGE = timedelta(minutes=30)
# Slots over which the live load fades back to the profile (one hour). A
# sustained load lasts longer and the hourly correction takes over once its
# hour closes; a short one fades before it costs a misplanned evening.
BLEND_SLOTS = 4
# Difference between live and planned load that is worth a replan. Smaller
# changes stay within what a 15-minute rerun absorbs; this size changes what a
# slot costs by about 0.4 kWh x price, enough to flip Home 1 against Home UPS.
JUMP_THRESHOLD_KW = 1.5
# One replan per this time at most, so a load hovering around the threshold
# cannot keep the planner busy.
REPLAN_COOLDOWN = timedelta(minutes=10)


class LiveLoadTracker:
    """Recent backup-load readings (W) with a time-weighted mean."""

    def __init__(self, max_age: timedelta = MAX_SAMPLE_AGE) -> None:
        self._max_age = max_age
        self._samples: Deque[Tuple[datetime, float]] = deque()

    def __len__(self) -> int:
        return len(self._samples)

    def add(self, when: datetime, watts: float) -> None:
        if self._samples and when < self._samples[-1][0]:
            return
        self._samples.append((when, float(watts)))
        cutoff = when - self._max_age
        # Keep one reading before the cutoff: it is the value at the cutoff.
        while len(self._samples) > 1 and self._samples[1][0] <= cutoff:
            self._samples.popleft()

    def mean_kw(self, now: datetime, window: timedelta = LIVE_WINDOW) -> Optional[float]:
        if not self._samples:
            return None
        last_time = self._samples[-1][0]
        if now - last_time > self._max_age:
            return None
        start = now - window
        first_time = self._samples[0][0]
        covered_from = max(start, first_time)
        if now - covered_from < window / 2:
            return None
        energy = 0.0
        for i, (when, watts) in enumerate(self._samples):
            seg_start = max(when, start)
            seg_end = self._samples[i + 1][0] if i + 1 < len(self._samples) else now
            seg_end = min(seg_end, now)
            if seg_end > seg_start:
                energy += watts * (seg_end - seg_start).total_seconds()
        span = (now - covered_from).total_seconds()
        return energy / span / 1000.0 if span > 0 else None


def blend_live_load(
    load_forecast: List[float],
    live_kw: float,
    *,
    slot_hours: float = 0.25,
    blend_slots: int = BLEND_SLOTS,
) -> None:
    """Live load in slot 0, fading linearly to the forecast over ``blend_slots``."""
    live_kwh = max(0.0, live_kw) * slot_hours
    for k in range(min(blend_slots, len(load_forecast))):
        weight = 1.0 - k / blend_slots
        load_forecast[k] = weight * live_kwh + (1.0 - weight) * load_forecast[k]


class LoadJumpDetector:
    """Asks for a replan when the live load leaves the plan's assumption."""

    def __init__(
        self,
        threshold_kw: float = JUMP_THRESHOLD_KW,
        cooldown: timedelta = REPLAN_COOLDOWN,
    ) -> None:
        self._threshold_kw = threshold_kw
        self._cooldown = cooldown
        self._last_fired: Optional[datetime] = None

    def should_replan(
        self, now: datetime, *, live_kw: Optional[float], planned_kw: Optional[float]
    ) -> bool:
        if live_kw is None or planned_kw is None:
            return False
        if abs(live_kw - planned_kw) < self._threshold_kw:
            return False
        if self._last_fired is not None and now - self._last_fired < self._cooldown:
            return False
        self._last_fired = now
        return True


def _naive_local(when: datetime, reference: datetime) -> datetime:
    if when.tzinfo is None:
        return when
    if reference.tzinfo is not None:
        when = when.astimezone(reference.tzinfo)
    return when.replace(tzinfo=None)


def planned_kw_at(timeline: Sequence[Dict[str, Any]], now: datetime) -> Optional[float]:
    """Load (kW) the published plan assumes for the slot ``now`` falls in."""
    now_local = now.replace(tzinfo=None)
    for entry in timeline or []:
        try:
            start = datetime.fromisoformat(str(entry.get("time") or entry.get("timestamp")))
        except (TypeError, ValueError):
            continue
        start = _naive_local(start, now)
        if start <= now_local < start + timedelta(minutes=15):
            load = entry.get("load_kwh")
            return float(load) * 4.0 if isinstance(load, (int, float)) else None
    return None


def handle_live_load_reading(sensor: Any, when: datetime, watts: float) -> None:
    """Feed one backup-load reading; ask the forecast sensor to replan on a jump.

    The tracker and detector live on the forecast sensor. A replan is a flag the
    next run consumes (it runs inside the current 15-minute bucket and releases
    the plan lock) plus an immediate retry of the forecast.
    """
    tracker = getattr(sensor, "_live_load_tracker", None)
    if tracker is None:
        tracker = LiveLoadTracker()
        sensor._live_load_tracker = tracker
    detector = getattr(sensor, "_live_load_detector", None)
    if detector is None:
        detector = LoadJumpDetector()
        sensor._live_load_detector = detector
    tracker.add(when, watts)
    planned = planned_kw_at(getattr(sensor, "_timeline_data", None) or [], when)
    if detector.should_replan(when, live_kw=tracker.mean_kw(when), planned_kw=planned):
        sensor._live_load_replan = True
        sensor._schedule_forecast_retry(1.0)
