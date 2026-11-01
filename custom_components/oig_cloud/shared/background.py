"""Run work that outlives setup without making Home Assistant wait for it."""

from __future__ import annotations

from collections.abc import Coroutine
from typing import Any


def start_background(hass: Any, coro: Coroutine[Any, Any, Any], name: str) -> Any:
    """Start ``coro`` as a task that Home Assistant's startup does not wait for.

    A plain ``async_create_task`` is tracked: bootstrap waits for it, so one slow
    read holds up every other integration too.
    """
    create_background = getattr(hass, "async_create_background_task", None)
    if callable(create_background):
        return create_background(coro, name=name)
    return hass.async_create_task(coro)
