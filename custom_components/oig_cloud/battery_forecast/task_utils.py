"""Async task helpers for battery forecast."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime

from homeassistant.helpers.event import async_call_later

_LOGGER = logging.getLogger(__name__)


def cancel_forecast_retry(sensor) -> None:
    """Cancel any pending forecast retry (idempotent)."""
    if sensor._forecast_retry_unsub:
        sensor._forecast_retry_unsub()
        sensor._forecast_retry_unsub = None


def schedule_forecast_retry(sensor, delay_seconds: float) -> None:
    """Schedule a forecast retry with lifecycle awareness.

    Captures the current generation at schedule time. The retry callback
    checks generation on invocation — if it has moved on, the callback
    is a stale dequeued callback from a previous lifecycle and must not run.
    """
    if not sensor._hass or delay_seconds <= 0:
        return
    if sensor._forecast_retry_unsub:
        return

    # Capture generation at schedule time — this is the "ticket" the callback
    # must present to prove it is still valid.
    captured_generation = sensor._forecast_lifecycle_generation

    def _retry(now: datetime) -> None:
        # Clear the unsub handle FIRST, before any conditional logic — ensures
        # idempotent cleanup even if we early-return.
        sensor._forecast_retry_unsub = None

        # Stale dequeued callback: entity was unloaded/reloaded or teardown
        # occurred between schedule and fire. Do not run — sensor is torn down.
        if not sensor._forecast_lifecycle_active:
            return
        # Generation moved on: a new lifecycle is active, this callback predates
        # it and must not execute against the new entity state.
        if sensor._forecast_lifecycle_generation != captured_generation:
            return

        create_task_threadsafe(sensor, sensor.async_update)

    sensor._forecast_retry_unsub = async_call_later(sensor._hass, delay_seconds, _retry)


def create_task_threadsafe(sensor, coro_func, *args) -> None:
    """Create an HA task safely from any thread."""
    hass = getattr(sensor, "_hass", None) or getattr(sensor, "hass", None)
    if not hass:
        return

    def _runner() -> None:
        try:
            hass.async_create_task(coro_func(*args))
        except Exception as err:  # pragma: no cover - defensive
            _LOGGER.debug(
                "Failed to schedule task %s: %s",
                getattr(coro_func, "__name__", str(coro_func)),
                err,
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
