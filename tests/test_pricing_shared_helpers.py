from __future__ import annotations

from datetime import datetime

from custom_components.oig_cloud.pricing import spot_price_shared as shared


class DummyHass:
    def __init__(self):
        self.created = 0

    def async_create_task(self, coro):
        self.created += 1
        coro.close()
        return object()


def test_get_retry_delay_seconds():
    assert shared.get_retry_delay_seconds(0) == 300
    assert shared.get_retry_delay_seconds(1) == 600
    assert shared.get_retry_delay_seconds(3) == 1800
    assert shared.get_retry_delay_seconds(4) == 3600


def test_schedule_daily_fetch_runs_immediate_after_publish(monkeypatch):
    hass = DummyHass()
    called = {"fetch": 0}

    async def fake_fetch():
        called["fetch"] += 1

    def fake_track_time_change(_hass, _func, **_kwargs):
        return "remove"

    monkeypatch.setattr(shared, "async_track_time_change", fake_track_time_change)
    monkeypatch.setattr(
        shared, "dt_now", lambda: datetime(2025, 1, 1, 13, 10, 0)
    )

    remove = shared.schedule_daily_fetch(hass, fake_fetch)
    assert remove == "remove"
    assert hass.created == 1


def test_schedule_retry_task_dispatches(monkeypatch):
    hass = DummyHass()
    called = {"fetch": 0}

    async def fake_fetch():
        called["fetch"] += 1

    class DummyLogger:
        def info(self, *_args, **_kwargs):
            return None

    task = shared.schedule_retry_task(hass, fake_fetch, 1, DummyLogger(), "id", "label")
    assert task is not None
    assert hass.created == 1
