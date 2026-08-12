from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace
from typing import Callable

from homeassistant.core import HassJob, HassJobType

from custom_components.oig_cloud.battery_forecast import task_utils
from custom_components.oig_cloud.battery_forecast.sensors import (
    sensor_runtime,
    sensor_setup,
)


class DummyHass:
    def __init__(self):
        self.data = {}
        self.config = SimpleNamespace(config_dir="/tmp")
        self.loop = SimpleNamespace(
            call_soon_threadsafe=lambda callback, *args: callback(*args)
        )


class DummySensor:
    _GLOBAL_LOG_LAST_TS: dict = {}

    def __init__(self):
        self._hass = DummyHass()
        self._forecast_retry_unsub = None
        self._forecast_retry_generation = 0
        self._forecast_retry_active = True
        self._retry_tasks = 0

    def async_update(self):
        self._retry_tasks += 1


class DummyCoordinator:
    def __init__(self, hass):
        self.hass = hass


class DummyEntry:
    def __init__(self):
        self.options = {}
        self.data = {}


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


def test_retry_job_is_event_loop_owned_not_executor(monkeypatch):
    """A plain sync function handed to async_call_later is classified
    HassJobType.Executor by Home Assistant and dispatched via
    loop.run_in_executor(...) on a worker thread -- a different thread than
    the one mutating _forecast_retry_unsub/_forecast_retry_generation. Only
    HassJobType.Callback guarantees hass.async_run_hass_job() calls the
    target inline on the event-loop thread, which is what actually rules
    out a dequeued retry racing a replacement timer or teardown.
    """
    sensor = DummySensor()
    captured: dict = {}

    def _fake_async_call_later(_hass, _delay, callback):
        captured["callback"] = callback
        return lambda: None

    monkeypatch.setattr(task_utils, "async_call_later", _fake_async_call_later)

    task_utils.schedule_forecast_retry(sensor, 1.0)

    job = HassJob(captured["callback"])
    assert job.job_type is HassJobType.Callback


def test_scheduling_after_invalidation_arms_no_timer(monkeypatch):
    calls = []

    def _fake_async_call_later(_hass, _delay, callback):
        calls.append(callback)
        return lambda: None

    monkeypatch.setattr(task_utils, "async_call_later", _fake_async_call_later)

    sensor = DummySensor()
    task_utils.invalidate_forecast_retry_lifecycle(sensor)
    generation_after_invalidate = sensor._forecast_retry_generation

    task_utils.schedule_forecast_retry(sensor, 1.0)

    assert calls == []
    assert sensor._forecast_retry_unsub is None
    assert sensor._forecast_retry_generation == generation_after_invalidate


def test_unsubscribe_exception_leaves_teardown_fail_safe_and_idempotent():
    sensor = DummySensor()

    def _boom():
        raise RuntimeError("boom")

    sensor._forecast_retry_unsub = _boom

    task_utils.invalidate_forecast_retry_lifecycle(sensor)

    assert sensor._forecast_retry_active is False
    assert sensor._forecast_retry_unsub is None

    generation_after_first = sensor._forecast_retry_generation

    # Idempotent: a second invalidation must not raise and must not re-run
    # the already-cleared (and already-exploding) unsub.
    task_utils.invalidate_forecast_retry_lifecycle(sensor)

    assert sensor._forecast_retry_unsub is None
    assert sensor._forecast_retry_generation > generation_after_first


def _init_dummy_sensor(sensor, hass) -> None:
    sensor_setup.initialize_sensor(
        sensor,
        DummyCoordinator(hass),
        "battery_load_median",
        DummyEntry(),
        {},
        hass,
        side_effects_enabled=True,
        auto_switch_startup_delay=timedelta(seconds=0),
    )


def test_repeated_initialization_cannot_revive_stale_generation_callback(monkeypatch):
    """Reproduces the review finding: initialize_sensor() unconditionally
    reset _forecast_retry_generation to 0. A retry scheduled right after the
    first init captured generation=1; a careless re-init (duplicate platform
    setup, reload racing teardown) reset the counter back to 0, so the next
    schedule advanced it to 1 again -- colliding with the stale closure's
    captured generation and letting it pass the staleness guard.
    """
    monkeypatch.setattr(sensor_setup, "resolve_box_id", lambda _c: "box1", raising=False)

    sensor = DummySensor()
    hass = sensor._hass
    _init_dummy_sensor(sensor, hass)

    captured: dict = {}

    def _fake_async_call_later(_hass, _delay, callback):
        captured["callback"] = callback
        return lambda: None

    monkeypatch.setattr(task_utils, "async_call_later", _fake_async_call_later)

    dispatched = []
    monkeypatch.setattr(
        task_utils,
        "create_task_threadsafe",
        lambda _sensor, callback, *_args: dispatched.append(callback),
    )

    task_utils.schedule_forecast_retry(sensor, 1.0)
    stale_callback = captured["callback"]
    assert sensor._forecast_retry_generation == 1

    # A second initialize_sensor() call must not roll the generation counter
    # back -- it must stay monotonic across repeated initialization.
    _init_dummy_sensor(sensor, hass)
    assert sensor._forecast_retry_generation == 1

    task_utils.schedule_forecast_retry(sensor, 1.0)
    assert sensor._forecast_retry_generation == 2

    # The pre-reinit closure must not match the post-reinit generation.
    stale_callback(datetime.now())
    assert dispatched == []
