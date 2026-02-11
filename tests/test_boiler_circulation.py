from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.boiler import circulation as module


def test_build_circulation_windows_empty():
    assert module.build_circulation_windows(None) == []
    assert module.build_circulation_windows(SimpleNamespace(hourly_avg=None)) == []


def test_build_circulation_windows_future(monkeypatch):
    now = datetime(2025, 1, 1, 8, 15, tzinfo=timezone.utc)
    monkeypatch.setattr(module.dt_util, "now", lambda: now)
    profile = SimpleNamespace(hourly_avg={9: 1.0, 7: 0.2})
    windows = module.build_circulation_windows(profile, lead_minutes=10)
    assert len(windows) == 2
    assert windows[0]["start"] < windows[0]["end"]


def test_is_circulation_recommended(monkeypatch):
    now = datetime(2025, 1, 1, 8, 15, tzinfo=timezone.utc)
    monkeypatch.setattr(module.dt_util, "now", lambda: now)
    profile = SimpleNamespace(hourly_avg={8: 1.0})
    windows = module.build_circulation_windows(profile, lead_minutes=20)
    start = windows[0]["start"]
    end = windows[0]["end"]
    assert module.is_circulation_recommended(profile, start + timedelta(minutes=5))
    assert module.is_circulation_recommended(profile, end) is False
    assert module.is_circulation_recommended(None, now) is False


def test_pick_peak_hours_variants():
    assert module._pick_peak_hours({}) == []
    hours = module._pick_peak_hours({5: 0.1, 2: 0.3, 9: 0.2, 7: 0.0})
    assert hours == [2, 5, 9]


def test_build_circulation_windows_no_peak_hours(monkeypatch):
    monkeypatch.setattr(module.dt_util, "now", lambda: datetime(2025, 1, 1, 8, 15, tzinfo=timezone.utc))
    profile = SimpleNamespace(hourly_avg={})
    windows = module.build_circulation_windows(profile, lead_minutes=20)
    assert windows == []
