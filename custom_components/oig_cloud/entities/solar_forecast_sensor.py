"""Solar forecast senzory pro OIG Cloud integraci."""

import asyncio
import logging
import time
from datetime import date, datetime, timedelta
from typing import Any, Callable, Dict, Optional, Union

import aiohttp
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .base_sensor import OigCloudSensor

_LOGGER = logging.getLogger(__name__)

# URL pro forecast.solar API
FORECAST_SOLAR_API_URL = (
    "https://api.forecast.solar/estimate/{lat}/{lon}/{declination}/{azimuth}/{kwp}"
)
FORECAST_SOLAR_API_URL_WITH_KEY = "https://api.forecast.solar/{api_key}/estimate/{lat}/{lon}/{declination}/{azimuth}/{kwp}"
SOLCAST_WORLD_RADIATION_API_URL = "https://api.solcast.com.au/world_radiation/forecasts"
SOLCAST_ROOFTOP_API_URL = "https://api.solcast.com.au/rooftop_sites/{site_id}/forecasts"


def _parse_forecast_hour(hour_str: str) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(hour_str)
    except Exception as err:
        _LOGGER.debug("Invalid forecast hour '%s': %s", hour_str, err)
        return None


def _normalize_hourly_keys(hourly: Dict[str, float]) -> Dict[str, float]:
    if not isinstance(hourly, dict) or not hourly:
        return {} if hourly is None else hourly

    normalized: Dict[str, float] = {}
    for ts_str, power in hourly.items():
        if not isinstance(ts_str, str):
            normalized[ts_str] = power
            continue
        try:
            parsed = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        except ValueError:
            normalized[ts_str] = power
            continue

        if parsed.tzinfo is None:
            local_dt = parsed
        else:
            local_dt = dt_util.as_local(parsed)

        hour_key = local_dt.replace(
            minute=0, second=0, microsecond=0, tzinfo=None
        ).isoformat()
        existing = normalized.get(hour_key)
        if existing is None or power > existing:
            normalized[hour_key] = power

    return normalized


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _daily_value_for_date(daily: Dict[str, Any], target_date: date) -> float:
    if not isinstance(daily, dict):
        return 0.0
    return _safe_float(daily.get(target_date.isoformat(), 0))


def _daily_value_for_date_or_latest(daily: Dict[str, Any], target_date: date) -> float:
    """Return value for target_date, or the most recent date's value as fallback."""
    if not isinstance(daily, dict) or not daily:
        return 0.0
    key = target_date.isoformat()
    if key in daily:
        return _safe_float(daily[key])
    # Fallback: use the most recent available date
    latest_key = max(daily.keys())
    return _safe_float(daily[latest_key])


def _get_today_tomorrow() -> tuple[date, date]:
    today = dt_util.now().date()
    return today, today + timedelta(days=1)


def _cached_today_value(
    previous: Optional[Dict[str, Any]],
    *,
    today: date,
    daily_key: str,
    value_key: str,
) -> float:
    if not isinstance(previous, dict):
        return 0.0
    previous_daily = previous.get(daily_key)
    if not isinstance(previous_daily, dict):
        return 0.0
    if today.isoformat() not in previous_daily:
        return 0.0
    return _safe_float(previous.get(value_key, previous_daily.get(today.isoformat(), 0)))


class OigCloudSolarForecastSensor(OigCloudSensor):
    """Senzor pro solar forecast data."""

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],  # PŘIDÁNO: přebíráme device_info jako parametr
    ) -> None:
        super().__init__(coordinator, sensor_type)
        self._config_entry = config_entry
        self._device_info = device_info  # OPRAVA: použijeme předané device_info

        # OPRAVA: Přepsat název podle name_cs logiky (pokud OigCloudSensor nemá správnou logiku)
        from ..sensors.SENSOR_TYPES_SOLAR_FORECAST import SENSOR_TYPES_SOLAR_FORECAST

        sensor_config = SENSOR_TYPES_SOLAR_FORECAST.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")

        # Preferujeme český název, fallback na anglický, fallback na sensor_type
        self._attr_name = name_cs or name_en or sensor_type

        self._last_forecast_data: Optional[Dict[str, Any]] = None
        self._last_api_call: float = 0
        self._min_api_interval: float = 300  # 5 minut mezi voláními
        self._retry_count: int = 0
        self._max_retries: int = 3
        self._update_interval_remover: Optional[Any] = None

        # Storage key pro persistentní uložení posledního API volání a dat
        self._storage_key = f"oig_solar_forecast_{self._box_id}"

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - nastavit periodické aktualizace podle konfigurace."""
        await super().async_added_to_hass()

        # Načtení posledního času API volání a dat z persistentního úložiště
        await self._load_persistent_data()

        forecast_mode = self._config_entry.options.get(
            "solar_forecast_mode", "daily_optimized"
        )

        if forecast_mode != "manual":
            interval = self._get_update_interval(forecast_mode)
            if interval:
                self._update_interval_remover = async_track_time_interval(
                    self.hass, self._periodic_update, interval
                )
                _LOGGER.info(
                    f"🌞 Solar forecast periodic updates enabled: {forecast_mode}"
                )

        # OKAMŽITÁ inicializace dat při startu - pouze pro hlavní senzor a pouze pokud jsou data zastaralá
        if self._sensor_type == "solar_forecast" and self._should_fetch_data():
            _LOGGER.info(
                f"🌞 Data is outdated (last call: {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S') if self._last_api_call else 'never'}), triggering immediate fetch"
            )
            # Spustíme úlohu na pozadí s malým zpožděním
            self.hass.async_create_task(self._delayed_initial_fetch())
        else:
            # Pokud máme načtená data z úložiště, sdílíme je s koordinátorem
            if self._last_forecast_data:
                if hasattr(self.coordinator, "solar_forecast_data"):
                    self.coordinator.solar_forecast_data = self._last_forecast_data
                else:
                    setattr(
                        self.coordinator,
                        "solar_forecast_data",
                        self._last_forecast_data,
                    )
                _LOGGER.info(
                    f"🌞 Loaded forecast data from storage (last call: {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S')}), skipping immediate fetch"
                )

    async def _load_persistent_data(self) -> None:
        """Načte čas posledního API volání a forecast data z persistentního úložiště."""
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
                        f"🌞 Loaded last API call time: {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S')}"
                    )

                # Načtení forecast dat
                if isinstance(data.get("forecast_data"), dict):
                    self._last_forecast_data = data["forecast_data"]
                    normalized = self._normalize_forecast_data(self._last_forecast_data)
                    if normalized != self._last_forecast_data:
                        self._last_forecast_data = normalized
                        await self._save_persistent_data()
                        _LOGGER.debug(
                            "Normalized solar forecast hourly keys to local time"
                        )
                    _LOGGER.debug(
                        f"🌞 Loaded forecast data from storage with {len(self._last_forecast_data)} keys"
                    )
                else:
                    _LOGGER.debug("🌞 No forecast data found in storage")
            else:
                _LOGGER.debug("🌞 No previous data found in storage")

        except Exception as e:
            _LOGGER.warning(f"🌞 Failed to load persistent data: {e}")
            self._last_api_call = 0
            self._last_forecast_data = None

    async def _save_persistent_data(self) -> None:
        """Uloží čas posledního API volání a forecast data do persistentního úložiště."""
        try:
            store = Store(
                self.hass,
                version=1,
                key=self._storage_key,
            )

            save_data = {
                "last_api_call": self._last_api_call,
                "forecast_data": self._last_forecast_data,
                "saved_at": datetime.now().isoformat(),
            }

            await store.async_save(save_data)
            _LOGGER.debug(
                f"🌞 Saved persistent data: API call time {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S')}"
            )
        except Exception as e:
            _LOGGER.warning(f"🌞 Failed to save persistent data: {e}")

    def _normalize_forecast_data(self, forecast_data: Dict[str, Any]) -> Dict[str, Any]:
        updated = dict(forecast_data)
        changed = False
        for key in ("total_hourly", "string1_hourly", "string2_hourly"):
            hourly = updated.get(key)
            if not isinstance(hourly, dict):
                continue
            normalized = _normalize_hourly_keys(hourly)
            if normalized != hourly:
                updated[key] = normalized
                changed = True
        return updated if changed else forecast_data

    async def _load_last_api_call(self) -> None:
        """Načte čas posledního API volání z persistentního úložiště."""
        # Tato metoda je teď nahrazena _load_persistent_data
        pass

    async def _save_last_api_call(self) -> None:
        """Uloží čas posledního API volání do persistentního úložiště."""
        # Tato metoda je teď nahrazena _save_persistent_data
        pass

    def _should_fetch_data(self) -> bool:
        """Rozhodne zda je potřeba načíst nová data na základě módu a posledního volání."""
        current_time = time.time()

        # Pokud nemáme žádná data
        if not self._last_api_call:
            return True

        forecast_mode = self._config_entry.options.get(
            "solar_forecast_mode", "daily_optimized"
        )

        time_since_last = current_time - self._last_api_call

        # Pro různé módy různé intervaly
        if forecast_mode == "daily_optimized":
            # Data starší než 4 hodiny vyžadují aktualizaci
            return time_since_last > 14400  # 4 hodiny
        elif forecast_mode == "daily":
            # Data starší než 20 hodin vyžadují aktualizaci
            return time_since_last > 72000  # 20 hodin
        elif forecast_mode == "every_4h":
            # Data starší než 4 hodiny
            return time_since_last > 14400  # 4 hodiny
        elif forecast_mode == "hourly":
            # Data starší než 1 hodinu
            return time_since_last > 3600  # 1 hodina

        # Pro manual mode nikdy neaktualizujeme automaticky
        return False

    def _get_update_interval(self, mode: str) -> Optional[timedelta]:
        """Získá interval aktualizace podle módu."""
        intervals = {
            "hourly": timedelta(hours=1),  # Pro testing - vysoká frekvence
            "every_4h": timedelta(hours=4),  # Klasický 4-hodinový
            "daily": timedelta(hours=24),  # Jednou denně
            "daily_optimized": timedelta(
                minutes=30
            ),  # Každých 30 minut, ale update jen 3x denně
            "manual": None,  # Pouze manuální
        }
        return intervals.get(mode)

    async def _delayed_initial_fetch(self) -> None:
        """Spustí okamžitou aktualizaci s malým zpožděním."""
        # Počkáme 5 sekund na dokončení inicializace
        await asyncio.sleep(5)

        try:
            _LOGGER.info("🌞 Starting immediate solar forecast data fetch")
            await self.async_fetch_forecast_data()
            _LOGGER.info("🌞 Initial solar forecast data fetch completed")
        except Exception as e:
            _LOGGER.error(f"🌞 Initial solar forecast fetch failed: {e}")

    async def _periodic_update(self, now: datetime) -> None:
        """Periodická aktualizace - optimalizovaná pro 3x denně."""
        forecast_mode = self._config_entry.options.get(
            "solar_forecast_mode", "daily_optimized"
        )

        current_time = time.time()

        # Kontrola rate limiting - nikdy neaktualizujeme častěji než každých 5 minut
        if current_time - self._last_api_call < self._min_api_interval:
            _LOGGER.debug(
                f"🌞 Rate limiting: {(current_time - self._last_api_call) / 60:.1f} minutes since last call"
            )
            return

        should_fetch = False
        if forecast_mode == "daily_optimized":
            should_fetch = self._should_fetch_daily_optimized(now, current_time)
        elif forecast_mode == "daily":
            should_fetch = self._should_fetch_daily(now)
        elif forecast_mode == "every_4h":
            should_fetch = self._should_fetch_every_4h(current_time)
        elif forecast_mode == "hourly":
            should_fetch = self._should_fetch_hourly(current_time)

        if should_fetch and self._is_primary_sensor():
            await self.async_fetch_forecast_data()

    def _is_primary_sensor(self) -> bool:
        return self._sensor_type == "solar_forecast"

    def _should_fetch_daily_optimized(self, now: datetime, current_time: float) -> bool:
        target_hours = [6, 12, 16]
        if now.hour not in target_hours or now.minute > 5:
            return False
        if self._last_api_call:
            time_since_last = current_time - self._last_api_call
            if time_since_last < 10800:  # 3 hodiny
                _LOGGER.debug(
                    f"🌞 Skipping update - last call was {time_since_last / 60:.1f} minutes ago"
                )
                return False
        _LOGGER.info(f"🌞 Scheduled solar forecast update at {now.hour}:00")
        return True

    def _should_fetch_daily(self, now: datetime) -> bool:
        if now.hour != 6:
            return False
        if self._last_api_call:
            last_call_date = datetime.fromtimestamp(self._last_api_call).date()
            if last_call_date == now.date():
                _LOGGER.debug("🌞 Already updated today, skipping")
                return False
        return True

    def _should_fetch_every_4h(self, current_time: float) -> bool:
        if self._last_api_call:
            time_since_last = current_time - self._last_api_call
            if time_since_last < 14400:  # 4 hodiny
                return False
        return True

    def _should_fetch_hourly(self, current_time: float) -> bool:
        if self._last_api_call:
            time_since_last = current_time - self._last_api_call
            if time_since_last < 3600:  # 1 hodina
                return False
        return True

    # Přidání metody pro okamžitou aktualizaci
    async def async_manual_update(self) -> bool:
        """Manuální aktualizace forecast dat - pro službu."""
        try:
            _LOGGER.info(
                f"🌞 Manual solar forecast update requested for {self.entity_id}"
            )
            previous_api_call = self._last_api_call
            await self.async_fetch_forecast_data()
            if self._last_api_call <= previous_api_call:
                _LOGGER.warning(
                    "🌞 Manual solar forecast update finished without new data for %s",
                    self.entity_id,
                )
            return True
        except Exception as e:
            _LOGGER.error(
                f"Manual solar forecast update failed for {self.entity_id}: {e}"
            )
            return False

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA - zrušit periodické aktualizace."""
        if self._update_interval_remover:
            self._update_interval_remover()
            self._update_interval_remover = None
        await super().async_will_remove_from_hass()

    def _is_rate_limited(self, current_time: float) -> bool:
        if current_time - self._last_api_call >= self._min_api_interval:
            return False
        remaining_time = self._min_api_interval - (current_time - self._last_api_call)
        _LOGGER.warning(
            "🌞 Rate limiting: waiting %.1f seconds before next API call",
            remaining_time,
        )
        return True

    def _build_forecast_url(
        self,
        *,
        api_key: str,
        lat: float,
        lon: float,
        declination: float,
        azimuth: float,
        kwp: float,
    ) -> str:
        if api_key:
            return FORECAST_SOLAR_API_URL_WITH_KEY.format(
                api_key=api_key,
                lat=lat,
                lon=lon,
                declination=declination,
                azimuth=azimuth,
                kwp=kwp,
            )
        return FORECAST_SOLAR_API_URL.format(
            lat=lat,
            lon=lon,
            declination=declination,
            azimuth=azimuth,
            kwp=kwp,
        )

    async def _fetch_forecast_solar_strings(
        self,
        *,
        lat: float,
        lon: float,
        api_key: str,
        string1_enabled: bool,
        string2_enabled: bool,
    ) -> tuple[Optional[dict], Optional[dict]]:
        data_string1: Optional[dict] = None
        data_string2: Optional[dict] = None

        async with aiohttp.ClientSession() as session:
            if string1_enabled:
                data_string1, fatal = await self._fetch_forecast_string(
                    session=session,
                    label="string 1",
                    lat=lat,
                    lon=lon,
                    api_key=api_key,
                    declination=self._config_entry.options.get(
                        "solar_forecast_string1_declination", 10
                    ),
                    azimuth=self._config_entry.options.get(
                        "solar_forecast_string1_azimuth", 138
                    ),
                    kwp=self._config_entry.options.get(
                        "solar_forecast_string1_kwp", 5.4
                    ),
                    fatal_on_error=True,
                )
                if fatal:
                    return None, None
            else:
                _LOGGER.debug("🌞 String 1 disabled")

            if string2_enabled:
                data_string2, _fatal = await self._fetch_forecast_string(
                    session=session,
                    label="string 2",
                    lat=lat,
                    lon=lon,
                    api_key=api_key,
                    declination=self._config_entry.options.get(
                        "solar_forecast_string2_declination", 10
                    ),
                    azimuth=self._config_entry.options.get(
                        "solar_forecast_string2_azimuth", 138
                    ),
                    kwp=self._config_entry.options.get("solar_forecast_string2_kwp", 0),
                    fatal_on_error=False,
                )
            else:
                _LOGGER.debug("🌞 String 2 disabled")

        return data_string1, data_string2

    async def _fetch_forecast_string(
        self,
        *,
        session: aiohttp.ClientSession,
        label: str,
        lat: float,
        lon: float,
        api_key: str,
        declination: float,
        azimuth: float,
        kwp: float,
        fatal_on_error: bool,
    ) -> tuple[Optional[dict], bool]:
        url = self._build_forecast_url(
            api_key=api_key,
            lat=lat,
            lon=lon,
            declination=declination,
            azimuth=azimuth,
            kwp=kwp,
        )
        _LOGGER.info("🌞 Calling forecast.solar API for %s: %s", label, url)
        async with session.get(url, timeout=30) as response:
            if response.status == 200:
                data = await response.json()
                _LOGGER.debug("🌞 %s data received successfully", label)
                return data, False
            if response.status == 422:
                error_text = await response.text()
                _LOGGER.warning("🌞 %s API error 422: %s", label, error_text)
                return None, fatal_on_error
            if response.status == 429:
                _LOGGER.warning("🌞 %s rate limited", label)
                return None, fatal_on_error
            error_text = await response.text()
            _LOGGER.error("🌞 %s API error %s: %s", label, response.status, error_text)
            return None, fatal_on_error

    async def async_fetch_forecast_data(self) -> None:
        """Získání forecast dat z API pro oba stringy."""
        try:
            _LOGGER.debug(f"[{self.entity_id}] Starting solar forecast API call")

            current_time = time.time()

            if self._is_rate_limited(current_time):
                return

            provider = self._config_entry.options.get(
                "solar_forecast_provider", "forecast_solar"
            )
            if provider == "solcast":
                await self._fetch_solcast_data(current_time)
                return

            # Konfigurační parametry
            lat = self._config_entry.options.get("solar_forecast_latitude", 50.1219800)
            lon = self._config_entry.options.get("solar_forecast_longitude", 13.9373742)
            api_key = self._config_entry.options.get("solar_forecast_api_key", "")

            # String 1 - zapnutý podle checkboxu
            string1_enabled = self._config_entry.options.get(
                "solar_forecast_string1_enabled", True
            )

            # String 2 - zapnutý podle checkboxu
            string2_enabled = self._config_entry.options.get(
                "solar_forecast_string2_enabled", False
            )

            _LOGGER.debug("🌞 String 1: enabled=%s", string1_enabled)
            _LOGGER.debug("🌞 String 2: enabled=%s", string2_enabled)

            data_string1, data_string2 = await self._fetch_forecast_solar_strings(
                lat=lat,
                lon=lon,
                api_key=api_key,
                string1_enabled=string1_enabled,
                string2_enabled=string2_enabled,
            )

            # Kontrola, zda máme alespoň jeden string s daty
            if not data_string1 and not data_string2:
                _LOGGER.error(
                    "🌞 No data received - at least one string must be enabled"
                )
                return

            # Zpracování dat
            self._last_forecast_data = self._process_forecast_data(
                data_string1, data_string2
            )
            self._last_api_call = current_time

            # Uložení času posledního API volání a dat do persistentního úložiště
            await self._save_persistent_data()

            # Uložení dat do koordinátoru pro sdílení mezi senzory
            if hasattr(self.coordinator, "solar_forecast_data"):
                self.coordinator.solar_forecast_data = self._last_forecast_data
            else:
                setattr(
                    self.coordinator, "solar_forecast_data", self._last_forecast_data
                )

            _LOGGER.info(
                f"🌞 Solar forecast data updated successfully - last API call: {datetime.fromtimestamp(current_time).strftime('%Y-%m-%d %H:%M:%S')}"
            )

            # Aktualizuj stav tohoto senzoru
            self.async_write_ha_state()

            # NOVÉ: Pošli signál ostatním solar forecast sensorům, že jsou dostupná nová data
            await self._broadcast_forecast_data()

        except asyncio.TimeoutError:
            _LOGGER.warning(
                f"[{self.entity_id}] Timeout fetching solar forecast data - preserving cached data"
            )
            # DŮLEŽITÉ: Při chybě NEZAPISOVAT do _last_forecast_data!
            # Zachováváme stará platná data místo jejich přepsání chybovým objektem.
            if self._last_forecast_data:
                _LOGGER.info(
                    f"[{self.entity_id}] Using cached solar forecast data from previous successful fetch"
                )
            # else: necháváme _last_forecast_data = None, ale to je OK - nemáme žádná data

        except Exception as e:
            _LOGGER.error(
                f"[{self.entity_id}] Error fetching solar forecast data: {e} - preserving cached data"
            )
            # DŮLEŽITÉ: Při chybě NEZAPISOVAT do _last_forecast_data!
            # Zachováváme stará platná data místo jejich přepsání chybovým objektem.
            if self._last_forecast_data:
                _LOGGER.info(
                    f"[{self.entity_id}] Using cached solar forecast data from previous successful fetch"
                )
            # else: necháváme _last_forecast_data = None

    async def _fetch_solcast_data(self, current_time: float) -> None:
        """Fetch forecast data from Solcast API and map to unified structure."""
        api_key = self._config_entry.options.get("solcast_api_key", "").strip()
        site_id = self._config_entry.options.get("solcast_site_id", "").strip()

        if not api_key:
            _LOGGER.error("🌞 Solcast API key missing")
            return
        if not site_id:
            _LOGGER.error("🌞 Solcast site ID missing")
            return

        string1_enabled = self._config_entry.options.get(
            "solar_forecast_string1_enabled", True
        )
        string2_enabled = self._config_entry.options.get(
            "solar_forecast_string2_enabled", False
        )

        kwp1 = (
            float(self._config_entry.options.get("solar_forecast_string1_kwp", 0))
            if string1_enabled
            else 0.0
        )
        kwp2 = (
            float(self._config_entry.options.get("solar_forecast_string2_kwp", 0))
            if string2_enabled
            else 0.0
        )
        total_kwp = kwp1 + kwp2
        if total_kwp <= 0:
            _LOGGER.error("🌞 Solcast requires at least one enabled string with kWp")
            return

        url = (
            f"{SOLCAST_ROOFTOP_API_URL.format(site_id=site_id)}"
            f"?format=json&api_key={api_key}"
        )
        safe_url = (
            f"{SOLCAST_ROOFTOP_API_URL.format(site_id=site_id)}"
            "?format=json&api_key=***"
        )
        _LOGGER.info("🌞 Calling Solcast API: %s", safe_url)

        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=30) as response:
                if response.status == 200:
                    data = await response.json()
                elif response.status in (401, 403):
                    _LOGGER.error("🌞 Solcast authorization failed")
                    return
                elif response.status == 429:
                    _LOGGER.warning("🌞 Solcast rate limited")
                    return
                else:
                    error_text = await response.text()
                    _LOGGER.error(
                        f"🌞 Solcast API error {response.status}: {error_text}"
                    )
                    return

        forecasts = data.get("forecasts", [])
        if not forecasts:
            _LOGGER.error("🌞 Solcast response has no forecasts")
            return

        self._last_forecast_data = self._process_solcast_data(forecasts, kwp1, kwp2)
        self._last_api_call = current_time

        await self._save_persistent_data()

        if hasattr(self.coordinator, "solar_forecast_data"):
            self.coordinator.solar_forecast_data = self._last_forecast_data
        else:
            setattr(self.coordinator, "solar_forecast_data", self._last_forecast_data)

        _LOGGER.info(
            f"🌞 Solcast forecast data updated - last API call: {datetime.fromtimestamp(current_time).strftime('%Y-%m-%d %H:%M:%S')}"
        )
        self.async_write_ha_state()
        await self._broadcast_forecast_data()

    def _parse_forecast_entry(
        self, entry: Dict[str, Any], total_kwp: float
    ) -> Optional[tuple[str, float, float]]:
        """Parse a single Solcast forecast entry."""
        period_end = entry.get("period_end")
        ghi = entry.get("ghi")
        pv_estimate = entry.get("pv_estimate")
        if not period_end or (ghi is None and pv_estimate is None):
            return None

        period_hours = self._parse_solcast_period_hours(entry.get("period"))
        if pv_estimate is not None:
            try:
                pv_estimate_kw = float(pv_estimate)
            except (TypeError, ValueError):
                return None
        else:
            try:
                ghi_value = float(ghi)
            except (TypeError, ValueError):
                return None
            pv_estimate_kw = total_kwp * (ghi_value / 1000.0)

        return period_end, pv_estimate_kw, period_hours

    def _build_forecast_result(
        self,
        watts_data: Dict[str, float],
        daily_kwh: Dict[str, float],
        ratio1: float,
        ratio2: float,
        forecasts: list[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Build final forecast result from parsed data."""
        total_hourly = self._convert_to_hourly(watts_data)
        total_daily = daily_kwh
        today, tomorrow = _get_today_tomorrow()
        today_key = today.isoformat()
        previous = self._last_forecast_data

        string1_hourly = {k: v * ratio1 for k, v in total_hourly.items()}
        string2_hourly = {k: v * ratio2 for k, v in total_hourly.items()}
        string1_daily = {k: v * ratio1 for k, v in total_daily.items()}
        string2_daily = {k: v * ratio2 for k, v in total_daily.items()}

        total_today_kwh = _daily_value_for_date_or_latest(total_daily, today)
        if total_today_kwh <= 0 and today_key not in total_daily:
            total_today_kwh = _cached_today_value(
                previous,
                today=today,
                daily_key="total_daily",
                value_key="total_today_kwh",
            )

        string1_today_kwh = _daily_value_for_date_or_latest(string1_daily, today)
        if string1_today_kwh <= 0 and today_key not in string1_daily:
            string1_today_kwh = _cached_today_value(
                previous,
                today=today,
                daily_key="string1_daily",
                value_key="string1_today_kwh",
            )

        string2_today_kwh = _daily_value_for_date_or_latest(string2_daily, today)
        if string2_today_kwh <= 0 and today_key not in string2_daily:
            string2_today_kwh = _cached_today_value(
                previous,
                today=today,
                daily_key="string2_daily",
                value_key="string2_today_kwh",
            )

        return {
            "response_time": datetime.now().isoformat(),
            "provider": "solcast",
            "string1_hourly": string1_hourly,
            "string1_daily": string1_daily,
            "string1_today_kwh": string1_today_kwh,
            "string1_tomorrow_kwh": _daily_value_for_date(string1_daily, tomorrow),
            "string2_hourly": string2_hourly,
            "string2_daily": string2_daily,
            "string2_today_kwh": string2_today_kwh,
            "string2_tomorrow_kwh": _daily_value_for_date(string2_daily, tomorrow),
            "total_hourly": total_hourly,
            "total_daily": total_daily,
            "total_today_kwh": total_today_kwh,
            "total_tomorrow_kwh": _daily_value_for_date(total_daily, tomorrow),
            "solcast_raw_data": forecasts,
        }

    def _process_solcast_data(
        self, forecasts: list[Dict[str, Any]], kwp1: float, kwp2: float
    ) -> Dict[str, Any]:
        """Transform Solcast forecasts into unified solar forecast structure."""
        total_kwp = kwp1 + kwp2
        ratio1 = (kwp1 / total_kwp) if total_kwp else 0.0
        ratio2 = (kwp2 / total_kwp) if total_kwp else 0.0

        watts_data: Dict[str, float] = {}
        daily_kwh: Dict[str, float] = {}

        for entry in forecasts:
            parsed = self._parse_forecast_entry(entry, total_kwp)
            if not parsed:
                continue

            period_end, pv_estimate_kw, period_hours = parsed
            watts_data[period_end] = pv_estimate_kw * 1000.0

            day_key = period_end.split("T")[0]
            daily_kwh[day_key] = daily_kwh.get(day_key, 0.0) + (
                pv_estimate_kw * period_hours
            )

        return self._build_forecast_result(
            watts_data, daily_kwh, ratio1, ratio2, forecasts
        )

    @staticmethod
    def _parse_solcast_period_hours(period: Optional[str]) -> float:
        """Parse Solcast period into hours. Defaults to 0.5h."""
        if not period:
            return 0.5
        if period.startswith("PT") and period.endswith("M"):
            try:
                minutes = float(period[2:-1])
                return minutes / 60.0
            except ValueError:
                return 0.5
        if period.startswith("PT") and period.endswith("H"):
            try:
                hours = float(period[2:-1])
                return hours
            except ValueError:
                return 0.5
        return 0.5

    async def _broadcast_forecast_data(self) -> None:
        """Pošle signál ostatním solar forecast sensorům o nových datech."""
        try:
            # Získáme registry správným způsobem
            dr.async_get(self.hass)
            entity_registry = er.async_get(self.hass)

            # Najdeme naše zařízení
            device_id = None
            entity_entry = entity_registry.async_get(self.entity_id)
            if entity_entry:
                device_id = entity_entry.device_id

            if device_id:
                # Najdeme všechny entity tohoto zařízení
                device_entities = er.async_entries_for_device(
                    entity_registry, device_id
                )

                # Aktualizujeme všechny solar forecast senzory
                for device_entity in device_entities:
                    if device_entity.entity_id.endswith(
                        "_solar_forecast_string1"
                    ) or device_entity.entity_id.endswith("_solar_forecast_string2"):

                        entity = self.hass.states.get(device_entity.entity_id)
                        if entity:
                            # Spustíme aktualizaci entity
                            self.hass.async_create_task(
                                self.hass.services.async_call(
                                    "homeassistant",
                                    "update_entity",
                                    {"entity_id": device_entity.entity_id},
                                )
                            )
                            _LOGGER.debug(
                                f"🌞 Triggered update for {device_entity.entity_id}"
                            )
        except Exception as e:
            _LOGGER.error(f"Error broadcasting forecast data: {e}")

    def _process_forecast_data(
        self,
        data_string1: Optional[Dict[str, Any]],
        data_string2: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Zpracuje data z forecast.solar API."""
        result = {"response_time": datetime.now().isoformat()}
        today, tomorrow = _get_today_tomorrow()
        today_key = today.isoformat()

        _LOGGER.info("🌞 PROCESS DEBUG: String1 has data: %s", data_string1 is not None)
        _LOGGER.info("🌞 PROCESS DEBUG: String2 has data: %s", data_string2 is not None)

        try:
            string1_data = _extract_string_data(
                data_string1, self._convert_to_hourly, label="String1"
            )
            string2_data = _extract_string_data(
                data_string2, self._convert_to_hourly, label="String2"
            )

            result.update(_build_string_payload("string1", data_string1, string1_data))
            result.update(_build_string_payload("string2", data_string2, string2_data))

            if _safe_float(result.get("string1_today_kwh", 0)) <= 0 and today_key not in string1_data["daily"]:
                result["string1_today_kwh"] = _cached_today_value(
                    self._last_forecast_data,
                    today=today,
                    daily_key="string1_daily",
                    value_key="string1_today_kwh",
                )
            if _safe_float(result.get("string2_today_kwh", 0)) <= 0 and today_key not in string2_data["daily"]:
                result["string2_today_kwh"] = _cached_today_value(
                    self._last_forecast_data,
                    today=today,
                    daily_key="string2_daily",
                    value_key="string2_today_kwh",
                )

            total_hourly, total_daily = _merge_totals(string1_data, string2_data)
            total_today_kwh = _daily_value_for_date_or_latest(total_daily, today)
            if total_today_kwh <= 0 and today_key not in total_daily:
                total_today_kwh = _cached_today_value(
                    self._last_forecast_data,
                    today=today,
                    daily_key="total_daily",
                    value_key="total_today_kwh",
                )
            result.update(
                {
                    "total_hourly": total_hourly,
                    "total_daily": total_daily,
                    "total_today_kwh": total_today_kwh,
                    "total_tomorrow_kwh": _daily_value_for_date(total_daily, tomorrow),
                }
            )

            _LOGGER.debug(
                "Processed forecast data: String1 today: %.1fkWh, String2 today: %.1fkWh, Total today: %.1fkWh",
                result.get("string1_today_kwh", 0.0),
                result.get("string2_today_kwh", 0.0),
                result.get("total_today_kwh", 0.0),
            )

        except Exception as e:
            _LOGGER.error("Error processing forecast data: %s", e, exc_info=True)
            result["error"] = str(e)

        return result

    def _convert_to_hourly(self, watts_data: Dict[str, float]) -> Dict[str, float]:
        """Převede forecast data na hodinová data."""
        hourly_data = {}

        _LOGGER.info(
            f"🌞 CONVERT DEBUG: Input watts_data has {len(watts_data)} timestamps"
        )

        for timestamp_str, power in watts_data.items():
            try:
                # Parsování timestamp (forecast.solar používá UTC čas)
                dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    local_dt = dt
                else:
                    local_dt = dt_util.as_local(dt)
                # Zaokrouhlení na celou hodinu v lokálním čase (bez tzinfo)
                hour_key = local_dt.replace(
                    minute=0, second=0, microsecond=0, tzinfo=None
                ).isoformat()
                # Uchování nejvyšší hodnoty pro danou hodinu
                hourly_data[hour_key] = max(hourly_data.get(hour_key, 0), power)
            except Exception as e:
                _LOGGER.debug(f"Error parsing timestamp {timestamp_str}: {e}")

        _LOGGER.info(
            f"🌞 CONVERT DEBUG: Output hourly_data has {len(hourly_data)} hours"
        )
        if hourly_data:
            sample = list(hourly_data.items())[:3]
            _LOGGER.info(f"🌞 CONVERT DEBUG: Sample output: {sample}")

        return hourly_data

    @property
    def device_info(self) -> Optional[Dict[str, Any]]:
        """Return device info - Analytics Module."""
        return self._device_info

    @property
    def available(self) -> bool:
        """Return True if entity is available."""
        # ZJEDNODUŠENÍ: Pouze kontrola zda je solar forecast zapnutý
        solar_enabled = self._config_entry.options.get("enable_solar_forecast", False)
        return solar_enabled

    @property
    def state(self) -> Optional[Union[float, str]]:
        """Stav senzoru - celková denní prognóza výroby v kWh."""
        # OPRAVA: Pokud není dostupný, vrátit None
        if not self.available:
            return None

        # Zkusíme načíst data z koordinátoru pokud nemáme vlastní
        if not self._last_forecast_data and hasattr(
            self.coordinator, "solar_forecast_data"
        ):
            self._last_forecast_data = self.coordinator.solar_forecast_data
            _LOGGER.debug(
                f"🌞 {self._sensor_type}: loaded shared data from coordinator"
            )

        if not self._last_forecast_data:
            return None

        try:
            if self._sensor_type == "solar_forecast":
                # Celková denní výroba z obou stringů v kWh
                return round(self._last_forecast_data.get("total_today_kwh", 0), 2)

            elif self._sensor_type == "solar_forecast_string1":
                # Denní výroba jen z string1 v kWh
                return round(self._last_forecast_data.get("string1_today_kwh", 0), 2)

            elif self._sensor_type == "solar_forecast_string2":
                # Denní výroba jen z string2 v kWh
                return round(self._last_forecast_data.get("string2_today_kwh", 0), 2)

        except Exception as e:
            _LOGGER.error(f"Error getting solar forecast state: {e}")

        return None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Dodatečné atributy s hodinovými výkony a aktuální hodinovou prognózou."""
        if not self._last_forecast_data:
            return {}

        attrs: Dict[str, Any] = {}

        try:
            attrs["response_time"] = self._last_forecast_data.get("response_time")

            if self._sensor_type == "solar_forecast":
                attrs.update(self._build_main_attrs())
            elif self._sensor_type == "solar_forecast_string1":
                attrs.update(self._build_string_attrs("string1"))
            elif self._sensor_type == "solar_forecast_string2":
                attrs.update(self._build_string_attrs("string2"))

        except Exception as e:
            _LOGGER.error(f"Error creating solar forecast attributes: {e}")
            attrs["error"] = str(e)

        return attrs

    def _build_main_attrs(self) -> Dict[str, Any]:
        current_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
        total_hourly = self._last_forecast_data.get("total_hourly", {})
        string1_hourly = self._last_forecast_data.get("string1_hourly", {})
        string2_hourly = self._last_forecast_data.get("string2_hourly", {})

        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)

        today_total, tomorrow_total, today_total_sum, tomorrow_total_sum = (
            self._split_hourly(total_hourly, today, tomorrow)
        )
        today_string1, tomorrow_string1, today_string1_sum, tomorrow_string1_sum = (
            self._split_hourly(string1_hourly, today, tomorrow)
        )
        today_string2, tomorrow_string2, today_string2_sum, tomorrow_string2_sum = (
            self._split_hourly(string2_hourly, today, tomorrow)
        )

        return {
            "today_total_kwh": self._last_forecast_data.get("total_today_kwh", 0),
            "tomorrow_total_kwh": self._last_forecast_data.get("total_tomorrow_kwh", 0),
            "string1_today_kwh": self._last_forecast_data.get("string1_today_kwh", 0),
            "string1_tomorrow_kwh": self._last_forecast_data.get("string1_tomorrow_kwh", 0),
            "string2_today_kwh": self._last_forecast_data.get("string2_today_kwh", 0),
            "string2_tomorrow_kwh": self._last_forecast_data.get("string2_tomorrow_kwh", 0),
            "total_daily": self._last_forecast_data.get("total_daily", {}),
            "string1_daily": self._last_forecast_data.get("string1_daily", {}),
            "string2_daily": self._last_forecast_data.get("string2_daily", {}),
            "current_hour_kw": self._current_hour_kw(total_hourly, current_hour),
            "today_hourly_total_kw": today_total,
            "tomorrow_hourly_total_kw": tomorrow_total,
            "today_hourly_string1_kw": today_string1,
            "tomorrow_hourly_string1_kw": tomorrow_string1,
            "today_hourly_string2_kw": today_string2,
            "tomorrow_hourly_string2_kw": tomorrow_string2,
            "today_total_sum_kw": round(today_total_sum, 2),
            "tomorrow_total_sum_kw": round(tomorrow_total_sum, 2),
            "today_string1_sum_kw": round(today_string1_sum, 2),
            "tomorrow_string1_sum_kw": round(tomorrow_string1_sum, 2),
            "today_string2_sum_kw": round(today_string2_sum, 2),
            "tomorrow_string2_sum_kw": round(tomorrow_string2_sum, 2),
        }

    def _build_string_attrs(self, key: str) -> Dict[str, Any]:
        current_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
        hourly = self._last_forecast_data.get(f"{key}_hourly", {})
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)

        today_hours, tomorrow_hours, today_sum, tomorrow_sum = self._split_hourly(
            hourly, today, tomorrow
        )

        return {
            "today_kwh": self._last_forecast_data.get(f"{key}_today_kwh", 0),
            "tomorrow_kwh": self._last_forecast_data.get(f"{key}_tomorrow_kwh", 0),
            "daily_kwh": self._last_forecast_data.get(f"{key}_daily", {}),
            "current_hour_kw": self._current_hour_kw(hourly, current_hour),
            "today_hourly_kw": today_hours,
            "tomorrow_hourly_kw": tomorrow_hours,
            "today_sum_kw": round(today_sum, 2),
            "tomorrow_sum_kw": round(tomorrow_sum, 2),
        }

    @staticmethod
    def _current_hour_kw(hourly: Dict[str, Any], current_hour: datetime) -> float:
        current_hour_watts = hourly.get(current_hour.isoformat(), 0)
        return round(current_hour_watts / 1000, 2)

    @staticmethod
    def _split_hourly(
        hourly: Dict[str, Any], today: datetime.date, tomorrow: datetime.date
    ) -> tuple[Dict[str, float], Dict[str, float], float, float]:
        today_hours: Dict[str, float] = {}
        tomorrow_hours: Dict[str, float] = {}
        today_sum = 0.0
        tomorrow_sum = 0.0

        for hour_str, power in hourly.items():
            hour_dt = _parse_forecast_hour(hour_str)
            if hour_dt is None:
                continue
            power_kw = round(power / 1000, 2)

            if hour_dt.date() == today:
                today_hours[hour_str] = power_kw
                today_sum += power_kw
            elif hour_dt.date() == tomorrow:
                tomorrow_hours[hour_str] = power_kw
                tomorrow_sum += power_kw

        return today_hours, tomorrow_hours, today_sum, tomorrow_sum


def _extract_string_data(
    data: Optional[Dict[str, Any]],
    convert_to_hourly: Callable[[Dict[str, float]], Dict[str, float]],
    *,
    label: str,
) -> Dict[str, Dict[str, float]]:
    if not data or "result" not in data:
        return {"hourly": {}, "daily": {}}
    result = data.get("result", {})
    watts = result.get("watts", {}) or {}
    wh_day = result.get("watt_hours_day", {}) or {}
    _LOGGER.info("🌞 PROCESS DEBUG: %s watts has %s timestamps", label, len(watts))
    hourly = convert_to_hourly(watts)
    daily = {k: v / 1000 for k, v in wh_day.items()}
    return {"hourly": hourly, "daily": daily}


def _build_string_payload(
    prefix: str,
    raw_data: Optional[Dict[str, Any]],
    string_data: Dict[str, Dict[str, float]],
) -> Dict[str, Any]:
    hourly = string_data["hourly"]
    daily = string_data["daily"]
    today, tomorrow = _get_today_tomorrow()
    payload = {
        f"{prefix}_hourly": hourly,
        f"{prefix}_daily": daily,
        f"{prefix}_today_kwh": _daily_value_for_date_or_latest(daily, today),
        f"{prefix}_tomorrow_kwh": _daily_value_for_date(daily, tomorrow),
    }
    if raw_data is not None:
        payload[f"{prefix}_raw_data"] = raw_data
    return payload


def _merge_totals(
    string1_data: Dict[str, Dict[str, float]],
    string2_data: Dict[str, Dict[str, float]],
) -> tuple[Dict[str, float], Dict[str, float]]:
    total_hourly = string1_data["hourly"].copy()
    total_daily = string1_data["daily"].copy()
    for hour, power in string2_data["hourly"].items():
        total_hourly[hour] = total_hourly.get(hour, 0) + power
    for day, energy in string2_data["daily"].items():
        total_daily[day] = total_daily.get(day, 0) + energy
    return total_hourly, total_daily
