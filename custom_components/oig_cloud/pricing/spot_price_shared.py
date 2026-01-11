"""Shared helpers for spot price sensors."""

from __future__ import annotations

import asyncio
from typing import Any, Callable

from homeassistant.helpers.event import async_track_time_change
from homeassistant.util.dt import now as dt_now

from ..const import OTE_SPOT_PRICE_CACHE_FILE


def _ote_cache_path(hass) -> str:
    return hass.config.path(".storage", OTE_SPOT_PRICE_CACHE_FILE)


def _resolve_box_id_from_coordinator(coordinator: Any) -> str:
    """Resolve numeric box_id (never use helper keys like 'spot_prices')."""
    try:
        from ..entities.base_sensor import resolve_box_id

        return resolve_box_id(coordinator)
    except Exception:
        return "unknown"


# Retry plán: 5, 10, 15, 30 minut a pak každou hodinu
RETRY_DELAYS_SECONDS = [300, 600, 900, 1800]
HOURLY_RETRY_SECONDS = 3600
# Denní stahování ve 13:00
DAILY_FETCH_HOUR = 13
DAILY_FETCH_MINUTE = 0


def schedule_daily_fetch(hass, fetch_coro: Callable[[], Any]) -> Any:
    """Schedule daily fetch and run immediately if past the daily publish time."""
    now = dt_now()
    current_minutes = now.hour * 60 + now.minute
    daily_update_time = DAILY_FETCH_HOUR * 60 + DAILY_FETCH_MINUTE

    if current_minutes >= daily_update_time:
        hass.async_create_task(fetch_coro())

    return async_track_time_change(
        hass,
        fetch_coro,
        hour=DAILY_FETCH_HOUR,
        minute=DAILY_FETCH_MINUTE,
        second=0,
    )


def get_retry_delay_seconds(attempt: int) -> int:
    """Get retry delay based on attempt number."""
    if attempt < len(RETRY_DELAYS_SECONDS):
        return RETRY_DELAYS_SECONDS[attempt]
    return HOURLY_RETRY_SECONDS


def schedule_retry_task(
    hass,
    fetch_coro: Callable[[], Any],
    delay: int,
    logger,
    entity_id: str,
) -> Any:
    """Schedule a delayed retry task."""

    async def _retry_after_delay():
        logger.info("[%s] Retry task waiting %ss...", entity_id, delay)
        await asyncio.sleep(delay)
        logger.info("[%s] Retry timer fired!", entity_id)
        await fetch_coro()

    return hass.async_create_task(_retry_after_delay())
