"""Async task helpers for battery forecast."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable

from homeassistant.core import callback
from homeassistant.helpers.event import async_call_later

_LOGGER = logging.getLogger(__name__)


def _is_active(sensor: Any) -> bool:
    return bool(getattr(sensor, "_forecast_retry_active", True))


def _advance_generation(sensor: Any) -> int:
    current = int(getattr(sensor, "_forecast_retry_generation", 0))
    current += 1
    setattr(sensor, "_forecast_retry_generation", current)
    return current


def _clear_retry_unsub(sensor: Any) -> Callable[[], Any] | None:
    unsub = getattr(sensor, "_forecast_retry_unsub", None)
    sensor._forecast_retry_unsub = None
    if unsub is None:
        return None

    try:
        unsub()
    except Exception as err:  # pragma: no cover - defensive
        _LOGGER.debug(
            "Failed to clear forecast retry timer (error_class=%s)",
            err.__class__.__name__,
        )
    return unsub


def schedule_forecast_retry(sensor, delay_seconds: float) -> None:
    """Schedule a forecast retry, replacing any pending retry.

    Debounced via a monotonic generation counter: a new call cancels and
    replaces the previous timer rather than stacking retries.
    """
    if not sensor._hass or delay_seconds <= 0:
        return
    if not _is_active(sensor):
        return

    @callback
    def _retry(now: datetime) -> None:
        # HassJobType.Callback: Home Assistant runs this inline on the event
        # loop (see HomeAssistant.async_run_hass_job), never via
        # loop.run_in_executor. That guarantees this guard-and-dispatch runs
        # atomically with respect to schedule_forecast_retry/
        # invalidate_forecast_retry_lifecycle, so a dequeued/stale callback
        # can never clear a replacement timer's handle out from under it.
        if sensor._forecast_retry_unsub is None:
            return
        if not _is_active(sensor):
            return
        if generation != getattr(sensor, "_forecast_retry_generation", -1):
            return
        sensor._forecast_retry_unsub = None
        task = create_task_threadsafe(sensor, sensor.async_update)
        if task is not None:
            tasks = getattr(sensor, "_forecast_retry_tasks", None)
            if tasks is None:
                tasks = set()
                sensor._forecast_retry_tasks = tasks
            tasks.add(task)
            task.add_done_callback(tasks.discard)

    generation = _advance_generation(sensor)
    _clear_retry_unsub(sensor)
    sensor._forecast_retry_unsub = async_call_later(sensor._hass, delay_seconds, _retry)


def invalidate_forecast_retry_lifecycle(sensor) -> None:
    """Invalidate pending retry callbacks and prevent future retries."""
    sensor._forecast_retry_active = False
    _advance_generation(sensor)
    _clear_retry_unsub(sensor)
    for task in tuple(getattr(sensor, "_forecast_retry_tasks", ())):
        task.cancel()


async def async_wait_forecast_retry_tasks(sensor) -> None:
    """Await all retry updates owned by this sensor after invalidation."""
    while tasks := tuple(getattr(sensor, "_forecast_retry_tasks", ())):
        await asyncio.gather(*tasks, return_exceptions=True)


def create_task_threadsafe(sensor, coro_func, *args) -> asyncio.Task[Any] | None:
    """Create an HA task safely from any thread."""
    hass = getattr(sensor, "_hass", None) or getattr(sensor, "hass", None)
    if not hass:
        return None

    created: asyncio.Task[Any] | None = None

    def _runner() -> None:
        nonlocal created
        try:
            created = hass.async_create_task(coro_func(*args))
        except Exception as err:  # pragma: no cover - defensive
            _LOGGER.debug(
                "Failed to schedule task %s (error_class=%s)",
                getattr(coro_func, "__name__", str(coro_func)),
                err.__class__.__name__,
            )

    try:
        loop = hass.loop
        try:
            running = asyncio.get_running_loop()
        except RuntimeError:
            running = None
        if running is loop:
            _runner()
        else:
            loop.call_soon_threadsafe(_runner)
    except Exception:  # pragma: no cover - defensive
        _runner()
    return created
