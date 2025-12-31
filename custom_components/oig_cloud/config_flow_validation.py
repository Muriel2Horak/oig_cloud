"""Validation helpers for config flow."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict

import aiohttp

from .const import CONF_PASSWORD, CONF_USERNAME, DEFAULT_NAME
from .lib.oig_cloud_client.api.oig_cloud_api import OigCloudApi

_LOGGER = logging.getLogger(__name__)


class CannotConnect(Exception):
    """Error to indicate we cannot connect."""


class InvalidAuth(Exception):
    """Error to indicate invalid authentication."""


class LiveDataNotEnabled(Exception):
    """Error to indicate live data are not enabled in OIG Cloud app."""


class InvalidSolarForecastApiKey(Exception):
    """Error to indicate invalid Solar Forecast API key."""


async def validate_input(hass: Any, data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate the user input allows us to connect."""
    _ = hass
    api = OigCloudApi(data[CONF_USERNAME], data[CONF_PASSWORD], False)

    if not await api.authenticate():
        raise InvalidAuth

    try:
        stats = await api.get_stats()
        if not stats:
            raise CannotConnect

        first_device = next(iter(stats.values())) if stats else None
        if not first_device or "actual" not in first_device:
            _LOGGER.error(
                "Live data not found in API response. User must enable 'Živá data' in OIG Cloud mobile app."
            )
            raise LiveDataNotEnabled

    except LiveDataNotEnabled:
        raise
    except Exception as err:
        _LOGGER.error("Connection test failed: %s", err)
        raise CannotConnect

    return {"title": DEFAULT_NAME}


async def validate_solar_forecast_api_key(
    api_key: str, lat: float = 50.1219800, lon: float = 13.9373742
) -> bool:
    """Validate Solar Forecast API key by making a test request."""
    if not api_key or not api_key.strip():
        return True

    test_url = (
        f"https://api.forecast.solar/{api_key.strip()}/estimate/{lat}/{lon}/35/0/1"
    )

    _LOGGER.debug("🔑 Validating Solar Forecast API key: %s...", test_url[:50])

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(test_url, timeout=10) as response:
                if response.status == 200:
                    _LOGGER.info("🔑 Solar Forecast API key validation: SUCCESS")
                    return True
                if response.status == 401:
                    _LOGGER.warning(
                        "🔑 Solar Forecast API key validation: UNAUTHORIZED (401)"
                    )
                    return False
                if response.status == 429:
                    _LOGGER.warning(
                        "🔑 Solar Forecast API key validation: RATE LIMITED (429) - but key seems valid"
                    )
                    return True

                error_text = await response.text()
                _LOGGER.error(
                    "🔑 Solar Forecast API validation failed with status %s: %s",
                    response.status,
                    error_text,
                )
                return False
    except aiohttp.ClientError as err:
        _LOGGER.error("🔑 Solar Forecast API validation network error: %s", err)
        return False
    except asyncio.TimeoutError:
        _LOGGER.error("🔑 Solar Forecast API validation timeout")
        return False
