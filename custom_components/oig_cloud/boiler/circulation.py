"""Circulation pump scheduling for pre-peak demand windows.

R5: Independent scheduling driven by the demand map.  The pump is turned on
``lead_min`` minutes before each demand-window start so that the hot-water loop
is already warm when occupants draw water.  Runs are deduplicated by a minimum
gap, capped at ``max_runs`` per local calendar day, and only future-or-active
runs are emitted.

Public API
----------
build_circulation_runs(demand_targets, now, lead_min, run_min, max_runs,
                       min_gap) -> list[tuple[datetime, datetime, str]]
    Pure scheduling function; all datetimes are aware (DST-safe).

is_circulation_recommended(profile, now, schedule=()) -> bool
    Backward-compatible sensor helper. Returns True iff ``now`` is inside any
    active run window.  The signature keeps ``profile`` for sensor call-site
    compatibility (the sensor passes coordinator.data["profile"]) but the value
    is not used by this implementation.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Sequence

# Runs are planned this far ahead (the schedule is rebuilt every cycle).
HORIZON_HOURS = 24


def build_circulation_runs(
    demand_targets: Sequence[Any],
    now: datetime,
    *,
    lead_min: int = 15,
    run_min: int = 10,
    max_runs: int = 3,
    min_gap_min: int = 120,
) -> list[tuple[datetime, datetime, str]]:
    """Build a list of (start, end, label) circulation runs for the current day.

    Each run starts ``lead_min`` minutes before the corresponding demand-target
    ``start`` time and lasts ``run_min`` minutes.  Runs are:

    - Only included when the window is future-or-active at ``now``.
    - Deduplicated: if a candidate start falls within ``min_gap_min`` of the
      previous accepted run's start, it is skipped.
    - Capped at ``max_runs`` runs per local calendar day of the run start.
    - Planned for the next ``HORIZON_HOURS`` (today and tomorrow morning).

    ``demand_targets`` must be an iterable of objects with ``.start``
    (``datetime``, aware) and ``.label`` (``str``) attributes — compatible with
    ``planner_contract.DemandTarget``.

    DST safety: all arithmetic uses aware datetimes; ``timedelta`` subtraction
    handles DST transitions correctly.
    """
    if not demand_targets or lead_min < 0 or run_min <= 0 or max_runs <= 0:
        return []

    horizon = now + timedelta(hours=HORIZON_HOURS)
    accepted: list[tuple[datetime, datetime, str]] = []
    runs_per_day: dict[Any, int] = {}

    # Sort by demand start so we process chronologically.
    try:
        sorted_targets = sorted(demand_targets, key=lambda t: t.start)
    except Exception:
        return []

    for target in sorted_targets:
        target_start: datetime = target.start
        label: str = getattr(target, "label", "")

        # Compute the circulation run window.
        run_start = target_start - timedelta(minutes=lead_min)
        run_end = run_start + timedelta(minutes=run_min)

        # Only keep runs that are future-or-active (i.e. run_end > now).
        if run_end <= now:
            continue

        # The next 24 hours (today and tomorrow morning): the schedule is
        # rebuilt every coordinator cycle, so tomorrow's first run must exist
        # before midnight.
        if run_start >= horizon:
            continue
        day = run_start.date()
        if runs_per_day.get(day, 0) >= max_runs:
            continue

        # Minimum gap deduplication.
        if accepted:
            last_start = accepted[-1][0]
            gap = run_start - last_start
            if abs(gap.total_seconds()) < min_gap_min * 60:
                continue

        accepted.append((run_start, run_end, label))
        runs_per_day[day] = runs_per_day.get(day, 0) + 1

    return accepted


def active_span(
    slot_kwh: Sequence[float],
    day_start: datetime,
    *,
    lead_min: int,
    slot_min: int = 15,
) -> tuple[datetime, datetime] | None:
    """From the first to the last slot of a day's profile that has any draw.

    ``day_start`` is local midnight of that day (aware). The span opens
    ``lead_min`` before the first draw slot and closes at the end of the last
    one. None when the profile has no draw at all.
    """
    drawn = [i for i, kwh in enumerate(slot_kwh) if kwh and kwh > 0]
    if not drawn:
        return None
    start = day_start + timedelta(minutes=drawn[0] * slot_min - max(0, lead_min))
    end = day_start + timedelta(minutes=(drawn[-1] + 1) * slot_min)
    return start, end


def build_keep_warm_runs(
    spans: Sequence[tuple[datetime, datetime]],
    now: datetime,
    *,
    run_min: int,
    pause_min: int,
) -> list[tuple[datetime, datetime, str]]:
    """Runs of ``run_min`` with ``pause_min`` between them through each span.

    Keeps the loop warm for the small draws the tank temperature never shows.
    Only runs that are not over yet and start within ``HORIZON_HOURS``.
    """
    if run_min <= 0 or pause_min < 0:
        return []
    horizon = now + timedelta(hours=HORIZON_HOURS)
    step = timedelta(minutes=run_min + pause_min)
    length = timedelta(minutes=run_min)
    runs: list[tuple[datetime, datetime, str]] = []
    for span_start, span_end in spans:
        start = span_start
        while start < span_end and start < horizon:
            end = min(start + length, span_end)
            if end > now:
                runs.append((start, end, "keep_warm"))
            start += step
    return runs


def merge_runs(
    runs: Sequence[tuple[datetime, datetime, str]],
) -> list[tuple[datetime, datetime, str]]:
    """Sorted runs with overlapping or touching ones joined (first label kept)."""
    merged: list[tuple[datetime, datetime, str]] = []
    for start, end, label in sorted(runs, key=lambda r: (r[0], r[1])):
        if merged and start <= merged[-1][1]:
            last_start, last_end, last_label = merged[-1]
            merged[-1] = (last_start, max(last_end, end), last_label)
        else:
            merged.append((start, end, label))
    return merged


def is_circulation_recommended(
    profile: Any,
    now: Any = None,
    schedule: Sequence[tuple[datetime, datetime, str]] = (),
) -> bool:
    """Return True iff ``now`` is inside an active circulation run window.

    ``profile`` is accepted for backward-compatible call sites (coordinator.py
    passes the current BoilerProfile) but is not used by this implementation.
    ``schedule`` should be the list returned by ``build_circulation_runs``.
    When ``schedule`` is empty (feature disabled or no targets) the function
    always returns False — preserving existing sensor behaviour byte-for-byte.
    """
    if not schedule or now is None:
        return False
    for run_start, run_end, _label in schedule:
        if run_start <= now < run_end:
            return True
    return False
