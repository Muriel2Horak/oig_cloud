"""OIG Cloud Data Update Coordinator."""

import asyncio
import logging
import random
import time
from datetime import timedelta, datetime
from typing import Any, Awaitable, Callable, Dict, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util.dt import utcnow

from .lib.oig_cloud_client.api.oig_cloud_api import OigCloudApi, OigCloudApiError
from .const import DEFAULT_UPDATE_INTERVAL, DOMAIN

_LOGGER = logging.getLogger(__name__)

# Jitter configuration: ±5 seconds around base interval
JITTER_SECONDS = 5.0


class OigCloudDataUpdateCoordinator(DataUpdateCoordinator):
    """Class to manage fetching OIG Cloud data."""

    def __init__(
        self,
        hass: HomeAssistant,
        api: OigCloudApi,
        config_entry: ConfigEntry,
        update_interval: Optional[timedelta] = None,
    ) -> None:
        """Initialize the coordinator."""
        # Get update interval from config entry data or use provided interval or default
        configured_interval: int = config_entry.data.get(
            "update_interval", DEFAULT_UPDATE_INTERVAL
        )
        effective_interval: timedelta = update_interval or timedelta(
            seconds=configured_interval
        )

        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=effective_interval,
            config_entry=config_entry,
        )
        self.api: OigCloudApi = api

        # Initialize extended data attributes
        self._extended_enabled: bool = config_entry.data.get(
            "extended_data_enabled", False
        )
        self._extended_update_interval: int = config_entry.data.get(
            "extended_update_interval", 300
        )  # 5 minutes default
        self._last_extended_update: Optional[float] = None

        # NOVÉ: Debug logování extended nastavení
        _LOGGER.info(
            f"Extended data configuration: enabled={self._extended_enabled}, interval={self._extended_update_interval}s"
        )

        # Initialize notification manager reference
        self.notification_manager: Optional[Any] = None

        # Battery forecast data
        self.battery_forecast_data: Optional[Dict[str, Any]] = None

        _LOGGER.info(
            f"Coordinator initialized with intervals: standard={effective_interval.total_seconds()}s, "
            f"extended={self._extended_update_interval}s, jitter=±{JITTER_SECONDS}s"
        )

        # Initialize jitter
        self._next_jitter: float = 0.0

    def _calculate_jitter(self) -> float:
        """Calculate random jitter for update interval.

        Returns a random value between -JITTER_SECONDS and +JITTER_SECONDS.
        This spreads API requests over time to avoid synchronized polling.
        """
        jitter = random.uniform(-JITTER_SECONDS, JITTER_SECONDS)
        self._next_jitter = jitter
        return jitter

    async def _fetch_basic_data(self) -> Dict[str, Any]:
        """Fetch basic data from API."""
        try:
            data: Optional[Dict[str, Any]] = await self.api.get_stats()
            return {"basic": data if data is not None else {}}
        except OigCloudApiError as e:
            _LOGGER.error(f"Error fetching basic data: {e}")
            raise UpdateFailed(f"Failed to fetch basic data: {e}")

    async def _fetch_extended_data(self) -> Dict[str, Any]:
        """Fetch extended data from API."""
        try:
            # Get extended stats for different time periods
            today: datetime = datetime.now()
            yesterday: datetime = today.replace(day=today.day - 1)

            today_str: str = today.strftime("%Y-%m-%d")
            yesterday_str: str = yesterday.strftime("%Y-%m-%d")

            # Fetch different types of extended data
            daily_data: Dict[str, Any] = await self.api.get_extended_stats(
                name="daily", from_date=yesterday_str, to_date=today_str
            )

            monthly_data: Dict[str, Any] = await self.api.get_extended_stats(
                name="monthly", from_date=today.strftime("%Y-%m-01"), to_date=today_str
            )

            return {"extended": {"daily": daily_data, "monthly": monthly_data}}
        except OigCloudApiError as e:
            _LOGGER.error(f"Error fetching extended data: {e}")
            raise UpdateFailed(f"Failed to fetch extended data: {e}")

    async def _async_update_data(self) -> Dict[str, Any]:
        """Fetch data from API endpoint with jittered timing."""
        _LOGGER.warning("🔄 _async_update_data called - starting update cycle")

        # Apply jitter - random delay at start of update
        jitter = random.uniform(-JITTER_SECONDS, JITTER_SECONDS)

        # Only sleep for positive jitter (negative means update sooner, handled by next cycle)
        if jitter > 0:
            _LOGGER.info(f"⏱️  Applying jitter: +{jitter:.1f}s delay before update")
            await asyncio.sleep(jitter)
        else:
            _LOGGER.info(f"⏱️  Jitter: {jitter:.1f}s (no delay, update now)")

        try:
            combined_data: Dict[str, Any] = {}

            # 1. Základní data - vždy načíst
            basic_data: Dict[str, Any] = await self._fetch_basic_data()
            combined_data.update(basic_data)

            # 2. Extended data - načíst jen pokud je povoleno a je čas
            current_time: float = time.time()

            if self._extended_enabled:
                time_since_last: Optional[float] = None
                if self._last_extended_update is not None:
                    time_since_last = current_time - self._last_extended_update

                if self._last_extended_update is None or (
                    time_since_last is not None
                    and time_since_last >= self._extended_update_interval
                ):
                    _LOGGER.info(f"Fetching extended data")
                    try:
                        extended_data: Dict[str, Any] = (
                            await self._fetch_extended_data()
                        )
                        combined_data.update(extended_data)
                        self._last_extended_update = current_time
                        _LOGGER.debug("Extended data updated successfully")
                    except Exception as e:
                        _LOGGER.error(f"Extended data fetch failed: {e}")

            # 3. Aktualizace notifikací - pokud existuje notification manager
            if hasattr(self, "notification_manager") and self.notification_manager:
                try:
                    # KONTROLA: Možná se API objekt dostal do špatného stavu
                    _LOGGER.debug(
                        f"Notification manager API type: {type(self.notification_manager._api)}"
                    )
                    _LOGGER.debug(f"Coordinator API type: {type(self.api)}")

                    # MOŽNÁ OPRAVA: Pokud API objekt chybí, použij coordinator API
                    if not hasattr(self.notification_manager._api, "get_notifications"):
                        _LOGGER.warning(
                            "Notification manager API object doesn't have get_notifications, updating reference"
                        )
                        self.notification_manager._api = self.api

                    await self.notification_manager.update_from_api()
                    _LOGGER.debug("Notification data updated successfully")
                except Exception as e:
                    _LOGGER.warning(
                        f"Notification data fetch failed (non-critical): {e}"
                    )
                    # Neházeme chybu - notifikace nejsou kritické pro fungování integrace

            # Aktualizuj battery forecast pokud je povolen
            battery_prediction_enabled: bool = self.config_entry.options.get(
                "enable_battery_prediction", False
            )
            _LOGGER.info(
                f"🔋 Battery prediction check: enabled={battery_prediction_enabled}"
            )

            if battery_prediction_enabled:
                _LOGGER.info("🔋 Battery prediction is ENABLED, starting update...")
                await self._update_battery_forecast()
            else:
                _LOGGER.info("🔋 Battery prediction is DISABLED, skipping update")

            return combined_data

        except Exception as e:
            _LOGGER.error(f"Error in _async_update_data: {e}", exc_info=True)
            raise UpdateFailed(f"Error communicating with API: {e}")

    async def _update_battery_forecast(self) -> None:
        """Aktualizuje battery forecast data."""
        try:
            # Importujeme battery forecast třídu a použijeme její logiku
            from .oig_cloud_battery_forecast import OigCloudBatteryForecastSensor

            # Získat inverter_sn z config_entry
            inverter_sn: str = self.config_entry.data.get("inverter_sn", "unknown")

            # Vytvořit device_info pro Analytics Module
            device_info: Dict[str, Any] = {
                "identifiers": {(DOMAIN, f"{inverter_sn}_analytics")},
                "name": "Analytics & Predictions",
                "manufacturer": "ČEZ",
                "model": "Battery Box Analytics Module",
                "sw_version": "1.0.0",
            }

            # Vytvoříme dočasnou instanci pro výpočet (bez registrace)
            temp_sensor = OigCloudBatteryForecastSensor(
                self, "battery_forecast", self.config_entry, device_info, self.hass
            )

            # Spustíme výpočet - nová metoda async_update()
            await temp_sensor.async_update()

            # Získat data z timeline_data
            if temp_sensor._timeline_data:
                self.battery_forecast_data = {
                    "timeline_data": temp_sensor._timeline_data,
                    "calculation_time": (
                        temp_sensor._last_update.isoformat()
                        if temp_sensor._last_update
                        else None
                    ),
                    "data_source": "simplified_calculation",
                    "current_battery_kwh": (
                        temp_sensor._timeline_data[0].get("battery_capacity_kwh", 0)
                        if temp_sensor._timeline_data
                        else 0
                    ),
                }
                _LOGGER.debug(
                    f"🔋 Battery forecast data updated in coordinator: {len(temp_sensor._timeline_data)} points"
                )
            else:
                self.battery_forecast_data = None
                _LOGGER.warning("🔋 Battery forecast returned no timeline data")

        except Exception as e:
            _LOGGER.error(
                f"🔋 Failed to update battery forecast in coordinator: {e}",
                exc_info=True,
            )
            self.battery_forecast_data = None
