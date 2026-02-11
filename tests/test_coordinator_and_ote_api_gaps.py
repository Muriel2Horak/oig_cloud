from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from homeassistant.helpers import frame as frame_helper

from custom_components.oig_cloud.core import coordinator as coordinator_module


@pytest.mark.asyncio
async def test_coordinator_schedule_spot_price_update(hass, monkeypatch):
    tracked_tasks = []

    def fake_track_point_in_time(hass, callback, when):
        tracked_tasks.append((callback, when))
        return lambda: None

    class DummyOteApi:
        _cache_path = None

    class DummyConfigEntry:
        data = {}
        options = {"enable_pricing": False}

    if hasattr(frame_helper, "async_setup"):
        frame_helper.async_setup(hass)
    elif hasattr(frame_helper, "setup"):
        frame_helper.setup(hass)
    elif hasattr(frame_helper, "async_setup_frame"):
        frame_helper.async_setup_frame(hass)

    coordinator = coordinator_module.OigCloudCoordinator(
        hass,
        DummyOteApi(),
        30,
        300,
        DummyConfigEntry(),
    )

    monkeypatch.setattr(coordinator_module, "async_track_point_in_time", fake_track_point_in_time)
    monkeypatch.setattr(coordinator_module.dt_util, "now", lambda: datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc))

    coordinator._schedule_spot_price_update()

    assert len(tracked_tasks) == 1


@pytest.mark.asyncio
async def test_coordinator_schedule_hourly_fallback(hass, monkeypatch):
    scheduled_calls = []

    def fake_call_later(loop, delay, callback):
        scheduled_calls.append((delay, callback))
        return SimpleNamespace()

    class DummyOteApi:
        _cache_path = None

    class DummyConfigEntry:
        data = {}
        options = {"enable_pricing": False}

    class DummyLoop:
        _scheduled = []

        def call_later(self, delay, callback):
            scheduled_calls.append((delay, callback))
            return SimpleNamespace()

    if hasattr(frame_helper, "async_setup"):
        frame_helper.async_setup(hass)
    elif hasattr(frame_helper, "setup"):
        frame_helper.setup(hass)
    elif hasattr(frame_helper, "async_setup_frame"):
        frame_helper.async_setup_frame(hass)

    coordinator = coordinator_module.OigCloudCoordinator(
        hass,
        DummyOteApi(),
        30,
        300,
        DummyConfigEntry(),
    )

    hass.loop = DummyLoop()

    coordinator._schedule_hourly_fallback()

    assert len(scheduled_calls) == 1
    assert scheduled_calls[0][0] == 3600
