"""ČHMÚ weather warning sensors pro OIG Cloud integraci."""

import asyncio
import logging
from typing import Any, Dict, Optional
from datetime import datetime, timedelta
import time

from homeassistant.helpers.entity import EntityCategory
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers import aiohttp_client
from .oig_cloud_sensor import OigCloudSensor

_LOGGER = logging.getLogger(__name__)


class OigCloudChmuSensor(OigCloudSensor):
    """Senzor pro ČHMÚ meteorologická varování."""

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
    ) -> None:
        super().__init__(coordinator, sensor_type)
        self._config_entry = config_entry
        self._device_info = device_info

        # Získáme inverter_sn ze správného místa
        inverter_sn = "unknown"

        if hasattr(coordinator, "config_entry") and coordinator.config_entry.data:
            inverter_sn = coordinator.config_entry.data.get("inverter_sn", "unknown")

        if inverter_sn == "unknown" and coordinator.data:
            first_device_key = list(coordinator.data.keys())[0]
            inverter_sn = first_device_key

        # Nastavit _box_id a entity_id
        self._box_id = inverter_sn
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"

        # Nastavit název podle name_cs
        from .sensors.SENSOR_TYPES_CHMU import SENSOR_TYPES_CHMU

        sensor_config = SENSOR_TYPES_CHMU.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")

        self._attr_name = name_cs or name_en or sensor_type

        self._last_warning_data: Optional[Dict[str, Any]] = None
        self._last_api_call: float = 0
        self._update_interval_remover: Optional[Any] = None

        # Storage key pro persistentní uložení
        self._storage_key = f"oig_chmu_warnings_{inverter_sn}"

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - nastavit periodické aktualizace."""
        await super().async_added_to_hass()

        # Načtení dat z persistentního úložiště
        await self._load_persistent_data()

        # Nastavit hodinové aktualizace (60 minut)
        interval = timedelta(hours=1)
        self._update_interval_remover = async_track_time_interval(
            self.hass, self._periodic_update, interval
        )
        _LOGGER.info("🌦️ ČHMÚ warnings periodic updates enabled (60 min)")

        # Okamžitá inicializace dat při startu - pouze pro hlavní senzor
        if self._sensor_type == "chmu_warning_level" and self._should_fetch_data():
            _LOGGER.info(
                f"🌦️ Data is outdated (last call: {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S') if self._last_api_call else 'never'}), triggering immediate fetch"
            )
            # Spustíme úlohu na pozadí s malým zpožděním
            self.hass.async_create_task(self._delayed_initial_fetch())
        else:
            # Pokud máme načtená data z úložiště, sdílíme je s koordinátorem
            if self._last_warning_data:
                if hasattr(self.coordinator, "chmu_warning_data"):
                    self.coordinator.chmu_warning_data = self._last_warning_data
                else:
                    setattr(
                        self.coordinator,
                        "chmu_warning_data",
                        self._last_warning_data,
                    )
                _LOGGER.info(
                    f"🌦️ Loaded warning data from storage (last call: {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S')}), skipping immediate fetch"
                )

    async def _load_persistent_data(self) -> None:
        """Načte data z persistentního úložiště."""
        try:
            store = Store(
                self.hass,
                version=1,
                key=self._storage_key,
            )
            data = await store.async_load()

            if data:
                # Načtení času posledního API volání
                if isinstance(data.get("last_api_call"), (int, float)):
                    self._last_api_call = float(data["last_api_call"])
                    _LOGGER.debug(
                        f"🌦️ Loaded last API call time: {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S')}"
                    )

                # Načtení warning dat
                if isinstance(data.get("warning_data"), dict):
                    self._last_warning_data = data["warning_data"]
                    _LOGGER.debug(f"🌦️ Loaded warning data from storage")
                else:
                    _LOGGER.debug("🌦️ No warning data found in storage")
            else:
                _LOGGER.debug("🌦️ No previous data found in storage")

        except Exception as e:
            _LOGGER.warning(f"🌦️ Failed to load persistent data: {e}")
            self._last_api_call = 0
            self._last_warning_data = None

    async def _save_persistent_data(self) -> None:
        """Uloží data do persistentního úložiště."""
        try:
            store = Store(
                self.hass,
                version=1,
                key=self._storage_key,
            )

            save_data = {
                "last_api_call": self._last_api_call,
                "warning_data": self._last_warning_data,
                "saved_at": datetime.now().isoformat(),
            }

            await store.async_save(save_data)
            _LOGGER.debug(
                f"🌦️ Saved persistent data: API call time {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S')}"
            )
        except Exception as e:
            _LOGGER.warning(f"🌦️ Failed to save persistent data: {e}")

    def _should_fetch_data(self) -> bool:
        """Rozhodne zda je potřeba načíst nová data."""
        current_time = time.time()

        # Pokud nemáme žádná data
        if not self._last_api_call:
            return True

        time_since_last = current_time - self._last_api_call

        # Fetch pokud už uplynula hodina (3600 sekund)
        return time_since_last >= 3600

    async def _delayed_initial_fetch(self) -> None:
        """Zpožděné počáteční stažení dat."""
        # Počkat 5 sekund na inicializaci HA
        await asyncio.sleep(5)
        await self._fetch_warning_data()

    async def _periodic_update(self, now: datetime) -> None:
        """Periodická aktualizace dat."""
        if self._sensor_type == "chmu_warning_level":
            await self._fetch_warning_data()

    async def _fetch_warning_data(self) -> None:
        """Stažení dat z ČHMÚ API."""
        try:
            _LOGGER.debug("🌦️ Fetching ČHMÚ warning data")

            # Získat GPS souřadnice
            latitude, longitude = self._get_gps_coordinates()

            if latitude is None or longitude is None:
                _LOGGER.error("🌦️ No GPS coordinates available, cannot fetch warnings")
                self._attr_available = False
                return

            # Získat ČHMÚ API klienta z coordinatoru
            if (
                not hasattr(self.coordinator, "chmu_api")
                or not self.coordinator.chmu_api
            ):
                _LOGGER.error("🌦️ ČHMÚ API not initialized in coordinator")
                self._attr_available = False
                return

            # Fetch data pomocí aiohttp session z HA
            session = aiohttp_client.async_get_clientsession(self.hass)

            warning_data = await self.coordinator.chmu_api.get_warnings(
                latitude, longitude, session
            )

            # Uložit data
            self._last_warning_data = warning_data
            self._last_api_call = time.time()

            # Sdílet data s koordinátorem
            self.coordinator.chmu_warning_data = warning_data

            # Uložit do persistentního úložiště
            await self._save_persistent_data()

            # Označit jako dostupný
            self._attr_available = True

            _LOGGER.info(
                f"🌦️ ČHMÚ warnings updated: "
                f"{warning_data['all_warnings_count']} total, "
                f"{warning_data['local_warnings_count']} local, "
                f"severity={warning_data['severity_level']}"
            )

        except Exception as e:
            _LOGGER.error(f"🌦️ Error fetching ČHMÚ warning data: {e}", exc_info=True)
            self._attr_available = False

    def _get_gps_coordinates(self) -> tuple[Optional[float], Optional[float]]:
        """
        Získá GPS souřadnice v pořadí priority:
        1. Solar Forecast config
        2. HA General Settings
        3. Praha default
        """
        # 1. Solar Forecast config
        if self._config_entry.options.get("enable_solar_forecast", False):
            lat = self._config_entry.options.get("solar_forecast_latitude")
            lon = self._config_entry.options.get("solar_forecast_longitude")
            if lat is not None and lon is not None:
                _LOGGER.debug(f"🌦️ Using GPS from Solar Forecast: {lat}, {lon}")
                return (float(lat), float(lon))

        # 2. HA General Settings
        if hasattr(self.hass.config, "latitude") and hasattr(
            self.hass.config, "longitude"
        ):
            lat = self.hass.config.latitude
            lon = self.hass.config.longitude
            if lat is not None and lon is not None:
                _LOGGER.debug(f"🌦️ Using GPS from HA config: {lat}, {lon}")
                return (float(lat), float(lon))

        # 3. Praha default
        _LOGGER.warning("🌦️ No GPS configured, using Praha default")
        return (50.0875, 14.4213)

    @property
    def state(self) -> int:
        """Vrátí severity level (0-4)."""
        if not self._last_warning_data:
            # Pokud nemáme data z úložiště, zkusíme z coordinatoru
            if hasattr(self.coordinator, "chmu_warning_data"):
                self._last_warning_data = self.coordinator.chmu_warning_data

        if not self._last_warning_data:
            return 0

        # Global sensor - nejvyšší severity v ČR
        if self._sensor_type == "chmu_warning_level_global":
            return self._last_warning_data.get("highest_severity_cz", 0)
        
        # Local sensor - severity pro lokalitu
        return self._last_warning_data.get("severity_level", 0)

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Vrátí atributy senzoru."""
        if not self._last_warning_data:
            # Pokud nemáme data z úložiště, zkusíme z coordinatoru
            if hasattr(self.coordinator, "chmu_warning_data"):
                self._last_warning_data = self.coordinator.chmu_warning_data

        if not self._last_warning_data:
            return {
                "warnings_count": 0,
                "last_update": None,
                "source": "ČHMÚ CAP Feed",
            }

        # Global sensor - všechna varování pro ČR
        if self._sensor_type == "chmu_warning_level_global":
            attrs = {
                "warnings_count": self._last_warning_data.get("all_warnings_count", 0),
                "all_warnings": self._last_warning_data.get("all_warnings", []),
                "highest_severity": self._last_warning_data.get("highest_severity_cz", 0),
                "severity_distribution": self._get_severity_distribution(),
                "last_update": self._last_warning_data.get("last_update"),
                "source": self._last_warning_data.get("source", "ČHMÚ CAP Feed"),
            }
            return attrs

        # Local sensor - varování pro lokalitu
        attrs = {
            "local_warnings_count": self._last_warning_data.get(
                "local_warnings_count", 0
            ),
            "top_local_warning": self._last_warning_data.get("top_local_warning"),
            "local_warnings": self._last_warning_data.get("local_warnings", []),
            # Globální statistiky
            "all_warnings_count": self._last_warning_data.get("all_warnings_count", 0),
            "highest_severity_cz": self._last_warning_data.get(
                "highest_severity_cz", 0
            ),
            # Meta
            "gps_location": self._last_warning_data.get("gps_location", {}),
            "last_update": self._last_warning_data.get("last_update"),
            "source": self._last_warning_data.get("source", "ČHMÚ CAP Feed"),
            "filter_method": self._last_warning_data.get("filter_method", "no_filter"),
        }

        return attrs

    def _get_severity_distribution(self) -> Dict[str, int]:
        """Vrátí rozdělení severity pro všechna varování."""
        if not self._last_warning_data:
            return {"Minor": 0, "Moderate": 0, "Severe": 0, "Extreme": 0}
        
        all_warnings = self._last_warning_data.get("all_warnings", [])
        distribution = {"Minor": 0, "Moderate": 0, "Severe": 0, "Extreme": 0}
        
        for warning in all_warnings:
            severity = warning.get("severity", "Unknown")
            if severity in distribution:
                distribution[severity] += 1
        
        return distribution

    @property
    def icon(self) -> str:
        """Vrátí ikonu podle severity."""
        severity = self.state

        if severity >= 4:
            return "mdi:alert-octagon"  # Extreme - červená osmihran
        elif severity >= 3:
            return "mdi:alert"  # Severe - výkřičník
        elif severity >= 2:
            return "mdi:alert-circle"  # Moderate - kolečko
        elif severity >= 1:
            return "mdi:alert-circle-outline"  # Minor - outline
        else:
            return "mdi:check-circle-outline"  # Žádné varování - check

    @property
    def device_info(self) -> Dict[str, Any]:
        """Vrátí device info."""
        return self._device_info
