from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from typing import Callable

from custom_components.oig_cloud.battery_forecast import task_utils
from custom_components.oig_cloud.battery_forecast.sensors import sensor_runtime


class DummyHass:
    def __init__(self):
        self.loop = SimpleNamespace(
            call_soon_threadsafe=lambda callback, *args: callback(*args)
        )


class DummySensor:
    def __init__(self):
        self._hass = DummyHass()
        self._forecast_retry_unsub = None
        self._forecast_retry_generation = 0
        self._forecast_retry_active = True
        self._retry_tasks = 0

    def async_update(self):
        self._retry_tasks += 1


def test_schedule_forecast_retry_replaces_prior_timer_and_only_latest_callback_runs(monkeypatch):
    sensor = DummySensor()
    callbacks: list[Callable[[datetime], None]] = []
    unsub_call_count = {"first": 0}

    def _fake_async_call_later(_hass, _delay, callback):
        callbacks.append(callback)
        if len(callbacks) == 1:
            return lambda: unsub_call_count.__setitem__(
                "first", unsub_call_count["first"] + 1
            )
        return lambda: None

    monkeypatch.setattr(task_utils, "async_call_later", _fake_async_call_later)
    created: list[Callable] = []
    monkeypatch.setattr(
        task_utils,
        "create_task_threadsafe",
        lambda _sensor, callback, *_args: created.append(callback),
    )

    task_utils.schedule_forecast_retry(sensor, 1.0)
    task_utils.schedule_forecast_retry(sensor, 2.0)

    assert sensor._forecast_retry_generation == 2
    assert sensor._forecast_retry_unsub is not None

    callbacks[0](datetime.now())
    assert unsub_call_count["first"] == 1
    assert created == []

    callbacks[1](datetime.now())
    assert created == [sensor.async_update]
    created.clear()

    callbacks[1](datetime.now())
    assert created == []


def test_invalidate_stale_callback_after_unload_is_inert(monkeypatch):
    sensor = DummySensor()
    callbacks: list[Callable[[datetime], None]] = []
    unsub_calls = {"count": 0}

    def _fake_async_call_later(_hass, _delay, callback):
        callbacks.append(callback)
        return lambda: unsub_calls.__setitem__("count", unsub_calls["count"] + 1)

    monkeypatch.setattr(task_utils, "async_call_later", _fake_async_call_later)

    task_utils.schedule_forecast_retry(sensor, 1.0)
    assert unsub_calls["count"] == 0

    task_utils.schedule_forecast_retry(sensor, 1.0)
    assert unsub_calls["count"] == 1

    created = []

    def _noop_task(_sensor, callback, *_args):
        created.append(callback)

    monkeypatch.setattr(task_utils, "create_task_threadsafe", _noop_task)

    assert sensor._forecast_retry_active is True
    assert unsub_calls["count"] == 1

    task_utils.invalidate_forecast_retry_lifecycle(sensor)
    assert unsub_calls["count"] == 2

    callbacks[0](datetime.now())
    callbacks[1](datetime.now())

    assert sensor._forecast_retry_active is False
    assert sensor._forecast_retry_generation >= 3
    assert not created


def test_handle_will_remove_invalidates_and_unsubscribes_retry_lifecycle_only_once(monkeypatch):
    sensor = DummySensor()
    unsub_calls = {"count": 0}

    sensor._forecast_retry_unsub = lambda: unsub_calls.__setitem__("count", unsub_calls["count"] + 1)

    auto_switch_calls = {"cancel": 0, "stop": 0}

    def _cancel(_sensor):
        auto_switch_calls["cancel"] += 1

    def _stop(_sensor):
        auto_switch_calls["stop"] += 1

    monkeypatch.setattr(
        sensor_runtime.auto_switch_module,
        "cancel_auto_switch_schedule",
        _cancel,
    )
    monkeypatch.setattr(
        sensor_runtime.auto_switch_module,
        "stop_auto_switch_watchdog",
        _stop,
    )

    sensor_runtime.handle_will_remove(sensor)
    sensor_runtime.handle_will_remove(sensor)

    assert unsub_calls["count"] == 1
    assert sensor._forecast_retry_active is False
    assert sensor._forecast_retry_unsub is None
    assert auto_switch_calls == {"cancel": 2, "stop": 2}
