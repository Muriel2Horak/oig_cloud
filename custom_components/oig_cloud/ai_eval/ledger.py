"""Rolling anomaly ledger for the hourly eval — pure logic.

Each hourly tick appends its notable events; the ledger keeps a sliding window
(default 23 h) so the LLM sees "what was odd earlier today" without re-sending
raw data. On day-end the ledger IS the daily evaluation. HA-Store persistence
is done by the wiring layer; this module only transforms plain dicts/lists.
"""
from __future__ import annotations

from typing import Any, Dict, List

WINDOW_HOURS = 23
MAX_ENTRIES = 60          # hard cap so a noisy day cannot bloat the prompt


def prune(entries: List[Dict[str, Any]], now_ts: float,
          window_hours: int = WINDOW_HOURS) -> List[Dict[str, Any]]:
    """Drop entries older than the sliding window; keep newest MAX_ENTRIES."""
    cutoff = now_ts - window_hours * 3600
    kept = [e for e in entries if float(e.get("ts", 0)) >= cutoff]
    kept.sort(key=lambda e: float(e.get("ts", 0)))
    return kept[-MAX_ENTRIES:]


def add_events(entries: List[Dict[str, Any]], events: List[Dict[str, Any]],
               now_ts: float, window_hours: int = WINDOW_HOURS) -> List[Dict[str, Any]]:
    """Append this tick's events (stamped `now_ts`) and prune the window.

    A same-kind entry inside the last 15 min is treated as a continuation and
    not re-added, so a persistent state does not fill the ledger every tick."""
    recent_kinds = {
        e.get("kind") for e in entries if float(e.get("ts", 0)) >= now_ts - 900
    }
    merged = list(entries)
    for ev in events:
        if ev.get("kind") in recent_kinds:
            continue
        merged.append({
            "ts": now_ts,
            "at": ev.get("at", ""),
            "kind": ev.get("kind", ""),
            "detail": ev.get("detail", ""),
        })
    return prune(merged, now_ts, window_hours)


def format_for_prompt(entries: List[Dict[str, Any]]) -> str:
    """Render the ledger as the compact text block the LLM reads."""
    if not entries:
        return "(zatím prázdný)"
    return "\n".join(
        f"{e.get('at','')} | {e.get('kind','')} | {e.get('detail','')}"
        for e in entries
    )
