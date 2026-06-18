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
    - Capped at ``max_runs`` runs per local calendar *day* (keyed on
      ``now.date()``).

    ``demand_targets`` must be an iterable of objects with ``.start``
    (``datetime``, aware) and ``.label`` (``str``) attributes — compatible with
    ``planner_contract.DemandTarget``.

    DST safety: all arithmetic uses aware datetimes; ``timedelta`` subtraction
    handles DST transitions correctly.
    """
    if not demand_targets or lead_min < 0 or run_min <= 0 or max_runs <= 0:
        return []

    today = now.date()
    accepted: list[tuple[datetime, datetime, str]] = []

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

        # Only keep runs within the current local calendar day.
        if run_start.date() != today and run_end.date() != today:
            # Both start and end fall outside today → skip.
            # (If run crosses midnight the start may be yesterday; end today →
            # keep so "active" runs crossing 00:00 are still acted on.)
            if run_start.date() < today:
                # run started yesterday but ends today: keep only if end > now
                if run_end <= now:
                    continue
            else:
                # run_start is tomorrow → skip
                continue

        # Minimum gap deduplication.
        if accepted:
            last_start = accepted[-1][0]
            gap = run_start - last_start
            if abs(gap.total_seconds()) < min_gap_min * 60:
                continue

        accepted.append((run_start, run_end, label))

        if len(accepted) >= max_runs:
            break

    return accepted


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
