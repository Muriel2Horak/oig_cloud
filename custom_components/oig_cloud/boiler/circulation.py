"""Helper for circulation recommendation."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from homeassistant.util import dt as dt_util


def build_circulation_windows(profile: Any, *, lead_minutes: int = 20) -> list[dict[str, datetime]]:
    if not profile or not getattr(profile, "hourly_avg", None):
        return []

    hourly_avg = profile.hourly_avg
    peak_hours = _pick_peak_hours(hourly_avg)
    if not peak_hours:
        return []

    windows = []
    now = dt_util.now()
    base = now.replace(minute=0, second=0, microsecond=0)

    for hour in peak_hours:
        end = base.replace(hour=hour)
        if end <= now:
            end += timedelta(days=1)
        start = end - timedelta(minutes=lead_minutes)
        windows.append({"start": start, "end": end})

    return windows


def is_circulation_recommended(profile: Any, now: datetime | None = None) -> bool:
    if not profile:
        return False
    now = now or dt_util.now()
    windows = build_circulation_windows(profile)
    for window in windows:
        if window["start"] <= now < window["end"]:
            return True
    return False


def _pick_peak_hours(hourly_avg: dict[int, float]) -> list[int]:
    ranked = sorted(hourly_avg.items(), key=lambda item: item[1], reverse=True)
    top = [hour for hour, value in ranked if value > 0][:3]
    return sorted(top)
