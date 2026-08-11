"""Solar forecast senzory pro OIG Cloud integraci."""

import asyncio
import copy
import logging
import time
from datetime import date, datetime, timedelta
from typing import TYPE_CHECKING, Any, Callable, Dict, Mapping, Optional, Union

import aiohttp
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import (
    async_call_later,
    async_track_point_in_utc_time,
    async_track_time_change,
    async_track_time_interval,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from ..config.solar_key_store import SolarKeyStore, get_solar_transaction_lock
from ..config.solar_transaction import async_solar_request_snapshot
from ..config.solar_rules import legacy_azimuth_read_model
from ..forecast.provider_contract import (
    build_forecast_solar_url,
    build_solcast_url,
    safe_provider_diagnostic,
)
from ..forecast.cache_contract import (
    SCHEMA_VERSION,
    CandidateValidationError,
    build_cache_envelope,
    build_cache_provenance,
    build_occurrence_id,
    build_retry_state,
    cache_provenance_matches,
    validate_forecast_candidate,
    validate_retry_state,
)
from ..forecast.refresh_result import (
    SolarCandidate,
    SolarCandidateContext,
    SolarFetchResult,
    SolarRequestIdentity,
    classify_http_status,
    classify_provider_exception,
)
from .base_sensor import OigCloudSensor

_LOGGER = logging.getLogger(__name__)

ATTEMPT_TIMEOUT_SECONDS = 90.0
SETUP_RETRY_SECONDS = 60.0

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
        _LOGGER.debug(
            "Invalid forecast hour discarded: error_class=%s",
            type(err).__name__,
        )
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


def _date_value_kwh(
    forecast_data: Dict[str, Any], daily_key: str, target_date: date
) -> float:
    """Denní kWh pro konkrétní datum z uloženého denního slovníku.

    Na rozdíl od zamrzlých ``*_today_kwh`` polí (počítaných jednorázově při
    fetchi vůči tehdejšímu dni) se vyhodnocuje vůči *aktuálnímu* dni, takže
    i u starší předpovědi ukazuje správný kalendářní den. Pokud datum v datech
    není (zastaralá předpověď), vrací 0 — což je poctivější než zamrzlá hodnota.
    """
    return round(
        _daily_value_for_date(forecast_data.get(daily_key, {}), target_date), 3
    )


def _forecast_age_hours(forecast_data: Dict[str, Any]) -> Optional[float]:
    """Return forecast age for either naive-local or timezone-aware timestamps."""
    rt = forecast_data.get("response_time")
    if not rt:
        return None
    try:
        response_time = datetime.fromisoformat(str(rt).replace("Z", "+00:00"))
        now = (
            datetime.now()
            if response_time.tzinfo is None
            else dt_util.now().astimezone(response_time.tzinfo)
        )
        return (now - response_time).total_seconds() / 3600.0
    except (ValueError, TypeError):
        return None


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
    return _safe_float(previous_daily[today.isoformat()])


if TYPE_CHECKING:

    class _SolarForecastBase:
        coordinator: Any
        hass: Any
        entity_id: str
        _box_id: str
        _sensor_type: str

        def __init__(self, coordinator: Any, sensor_type: str) -> None: ...
        async def async_added_to_hass(self) -> None: ...
        async def async_will_remove_from_hass(self) -> None: ...
        def async_write_ha_state(self) -> None: ...

else:

    class _SolarForecastBase(OigCloudSensor):
        pass


class OigCloudSolarForecastSensor(_SolarForecastBase):
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
        self._lifecycle_generation = 0
        self._removed = False
        self._durable_write_tasks: set[asyncio.Task[Any]] = set()
        self._committing_occurrences: set[str] = set()
        self._committed_occurrences: set[str] = set()
        self._manual_request_counter = 0
        self._request_sequence_counter = 0
        self._latest_committed_request_sequence = -1
        self._latest_retry_request_sequence = -1
        self._refresh_lock = asyncio.Lock()
        self._candidate_commit_lock = asyncio.Lock()
        self._current_occurrence_id: Optional[str] = None
        self._occurrence_generation = 0
        self._claimed_occurrences: set[str] = set()
        self._retry_unsubscribe: Optional[Callable[[], None]] = None
        self._setup_retry_unsubscribe: Optional[Callable[[], None]] = None
        self._active_refresh_tasks: set[asyncio.Task[Any]] = set()
        self._removal_complete = False
        self._removal_task: Optional[asyncio.Task[None]] = None
        self._initial_refresh_started = False

        # Schema 2 is owned by ConfigEntry; keep the box key read-only for rollback.
        self._legacy_storage_key = f"oig_solar_forecast_{self._box_id}"
        entry_id = getattr(self._config_entry, "entry_id", None)
        self._storage_key = (
            f"oig_solar_forecast_{entry_id}"
            if isinstance(entry_id, str) and entry_id
            else self._legacy_storage_key
        )
        self._cache_usable = False
        self._forced_stale_reason: Optional[str] = None
        self._cache_provenance: Optional[Dict[str, Any]] = None
        self._durable_cache_envelope: Optional[Dict[str, Any]] = None
        self._retry_state: Optional[Dict[str, Any]] = None

    def _create_refresh_task(self, coroutine: Any) -> Any:
        """Create and immediately track refresh work owned by this entity."""
        created = self.hass.async_create_task(coroutine)
        if isinstance(created, asyncio.Task):
            self._active_refresh_tasks.add(created)
            created.add_done_callback(self._active_refresh_tasks.discard)
        return created

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - nastavit periodické aktualizace podle konfigurace."""
        await super().async_added_to_hass()

        if not hasattr(self.hass, "loop_thread_id"):
            await self._async_initialize_after_add()
            return

        startup_task = self._create_refresh_task(self._async_initialize_after_add())
        if startup_task is None:
            await self._async_initialize_after_add()
        elif asyncio.iscoroutine(startup_task):
            await startup_task

    async def _async_initialize_after_add(self) -> None:
        task = self._register_current_refresh_task()
        try:
            if self._removed:
                return
            await self._async_initialize_after_add_impl()
        finally:
            self._unregister_refresh_task(task)

    async def _async_initialize_after_add_impl(self) -> None:
        """Load cache, restore recovery, and register one refresh schedule."""

        # Načtení posledního času API volání a dat z persistentního úložiště
        provenance_ready = await self._load_persistent_data()
        if self._removed:
            return
        if provenance_ready is False:
            self._arm_setup_recovery()
            return

        self._cancel_setup_recovery()
        self._register_refresh_schedule()
        retry_restored = await self._async_restore_retry_recovery(dt_util.now())

        # OKAMŽITÁ inicializace dat při startu - pouze pro hlavní senzor a pouze pokud jsou data zastaralá
        if (
            not retry_restored
            and self._sensor_type == "solar_forecast"
            and self._should_fetch_data()
        ):
            _LOGGER.info(
                f"🌞 Data is outdated (last call: {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S') if self._last_api_call else 'never'}), triggering immediate fetch"
            )
            # Spustíme úlohu na pozadí s malým zpožděním
            self._create_refresh_task(self._delayed_initial_fetch())
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

        if hasattr(self.hass, "loop_thread_id"):
            self.async_write_ha_state()

    async def _load_persistent_data(self) -> bool:
        """Načte čas posledního API volání a forecast data z persistentního úložiště."""
        self._cache_usable = False
        self._forced_stale_reason = None
        self._retry_state = None
        self._durable_cache_envelope = None
        entry_id = getattr(self._config_entry, "entry_id", None)
        if isinstance(entry_id, str) and entry_id:
            try:
                provenance = await self._async_current_cache_provenance()
            except Exception as err:  # pylint: disable=broad-exception-caught
                self._cache_provenance = None
                self._last_api_call = 0
                self._last_forecast_data = None
                _LOGGER.warning(
                    "Solar cache provenance unavailable: error_class=%s",
                    type(err).__name__,
                )
                return False

            self._cache_provenance = provenance
            try:
                store: Store[Dict[str, Any]] = Store(
                    self.hass,
                    version=SCHEMA_VERSION,
                    key=self._storage_key,
                )
                data = await store.async_load()
                if isinstance(data, Mapping) and data.get("schema") == SCHEMA_VERSION:
                    self._adopt_schema2_cache(data, provenance)
                    return True

                legacy_store: Store[Dict[str, Any]] = Store(
                    self.hass,
                    version=1,
                    key=self._legacy_storage_key,
                )
                legacy = await legacy_store.async_load()
                if isinstance(legacy, Mapping):
                    self._adopt_legacy_cache(legacy)
            except Exception as err:  # pylint: disable=broad-exception-caught
                _LOGGER.warning(
                    "Solar cache artifact unavailable: error_class=%s",
                    type(err).__name__,
                )
                self._last_api_call = 0
                self._last_forecast_data = None
            return True

        try:
            legacy_store = Store(
                self.hass,
                version=1,
                key=self._legacy_storage_key,
            )
            legacy = await legacy_store.async_load()
            if isinstance(legacy, Mapping):
                self._adopt_legacy_cache(legacy, compatible_without_entry=True)
        except Exception as err:
            _LOGGER.warning(
                "🌞 Failed to load persistent data: error_class=%s",
                type(err).__name__,
            )
            self._last_api_call = 0
            self._last_forecast_data = None
        return True

    def _arm_setup_recovery(self) -> None:
        """Retry provenance setup without registering an identity-less schedule."""
        if self._removed or self._setup_retry_unsubscribe is not None:
            return

        async def _retry_setup(_now: datetime) -> None:
            self._setup_retry_unsubscribe = None
            task = self._register_current_refresh_task()
            try:
                if not self._removed:
                    await self._async_initialize_after_add_impl()
            finally:
                self._unregister_refresh_task(task)

        try:
            self._setup_retry_unsubscribe = async_call_later(
                self.hass,
                SETUP_RETRY_SECONDS,
                _retry_setup,
            )
        except Exception as err:  # pylint: disable=broad-exception-caught
            _LOGGER.warning(
                "Solar provenance recovery registration failed: error_class=%s",
                type(err).__name__,
            )

    def _cancel_setup_recovery(self) -> None:
        if self._setup_retry_unsubscribe is not None:
            self._setup_retry_unsubscribe()
            self._setup_retry_unsubscribe = None

    async def _async_current_cache_provenance(self) -> Dict[str, Any]:
        entry_id = getattr(self._config_entry, "entry_id", None)
        if not isinstance(entry_id, str) or not entry_id:
            raise ValueError("ConfigEntry ID is required for schema-2 solar cache")
        revision = await SolarKeyStore(self.hass, entry_id).async_revision()
        return build_cache_provenance(
            entry_id,
            self._config_entry.options,
            revision,
        )

    @staticmethod
    def _parse_cache_time(value: Any) -> Optional[datetime]:
        if not isinstance(value, str):
            return None
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return parsed

    def _adopt_schema2_cache(
        self, envelope: Mapping[str, Any], provenance: Mapping[str, Any]
    ) -> None:
        self._durable_cache_envelope = copy.deepcopy(dict(envelope))
        forecast_data = envelope.get("forecast_data")
        if not isinstance(forecast_data, Mapping):
            return
        self._last_forecast_data = copy_forecast = dict(forecast_data)
        accepted_at = self._parse_cache_time(envelope.get("last_accepted_time"))
        if accepted_at is not None:
            self._last_api_call = accepted_at.timestamp()

        now = dt_util.now()
        entry_id = str(provenance["entry_id"])
        mode = str(
            self._config_entry.options.get("solar_forecast_mode", "daily_optimized")
        )
        self._retry_state = validate_retry_state(
            envelope.get("retry_state"),
            provenance=provenance,
            entry_id=entry_id,
            mode=mode,
            now=now,
        )
        if not cache_provenance_matches(envelope, provenance):
            self._forced_stale_reason = "provenance_mismatch"
            return
        try:
            validated = self._validated_candidate(copy_forecast)
        except CandidateValidationError:
            self._forced_stale_reason = "cache_invalid"
            return
        if accepted_at is None:
            self._forced_stale_reason = "cache_invalid"
            return
        if accepted_at.tzinfo is None:
            accepted_at = accepted_at.replace(tzinfo=now.tzinfo)
        if now.tzinfo is None:
            now = now.replace(tzinfo=accepted_at.tzinfo)
        if now - accepted_at > timedelta(hours=24) or accepted_at > now:
            self._forced_stale_reason = "cache_expired"
            return
        self._last_forecast_data = validated
        self._cache_usable = True

    def _adopt_legacy_cache(
        self,
        envelope: Mapping[str, Any],
        *,
        compatible_without_entry: bool = False,
    ) -> None:
        forecast_data = envelope.get("forecast_data")
        if isinstance(forecast_data, Mapping):
            self._last_forecast_data = dict(forecast_data)
        last_api_call = envelope.get("last_api_call")
        if isinstance(last_api_call, (int, float)) and not isinstance(
            last_api_call, bool
        ):
            self._last_api_call = float(last_api_call)
        if compatible_without_entry:
            self._cache_usable = bool(self._last_forecast_data)
        else:
            self._forced_stale_reason = "missing_provenance"

    async def _save_persistent_data(self) -> None:
        """Uloží čas posledního API volání a forecast data do persistentního úložiště."""
        try:
            store: Store[Dict[str, Any]] = Store(
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
        forecast_mode = self._config_entry.options.get(
            "solar_forecast_mode", "daily_optimized"
        )

        if forecast_mode == "manual":
            return False

        entry_id = getattr(self._config_entry, "entry_id", None)
        if isinstance(entry_id, str) and entry_id:
            return not self._cache_usable

        # Pokud nemáme žádná data
        if not self._last_api_call:
            return True

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
            "daily": None,
            "daily_optimized": None,
            "manual": None,  # Pouze manuální
        }
        return intervals.get(mode)

    def _register_refresh_schedule(self) -> None:
        """Register one primary-sensor schedule in Home Assistant local time."""
        if not self._is_primary_sensor():
            return
        forecast_mode = self._config_entry.options.get(
            "solar_forecast_mode", "daily_optimized"
        )
        wall_clock_hours = {
            "daily": [6],
            "daily_optimized": [6, 12, 16],
        }.get(forecast_mode)
        if wall_clock_hours is not None:
            self._update_interval_remover = async_track_time_change(
                self.hass,
                self._wall_clock_update,
                hour=wall_clock_hours,
                minute=0,
                second=0,
            )
            return
        interval = self._get_update_interval(forecast_mode)
        if interval is not None:
            self._update_interval_remover = async_track_time_interval(
                self.hass,
                self._periodic_update,
                interval,
            )

    async def _wall_clock_update(self, now: datetime) -> None:
        """Dispatch one provider attempt for an HA-local wall-clock occurrence."""
        task = self._register_current_refresh_task()
        try:
            scheduled_local = self._canonical_wall_clock_occurrence(now)
            if (
                scheduled_local is not None
                and self._is_primary_sensor()
                and not self._removed
            ):
                await self._async_start_scheduled_occurrence(scheduled_local)
        finally:
            self._unregister_refresh_task(task)

    def _canonical_wall_clock_occurrence(
        self, delivered: datetime
    ) -> Optional[datetime]:
        """Map HA callback jitter to the configured local scheduled instant."""
        mode = str(
            self._config_entry.options.get("solar_forecast_mode", "daily_optimized")
        )
        scheduled_hours = {
            "daily": {6},
            "daily_optimized": {6, 12, 16},
        }.get(mode)
        if (
            scheduled_hours is None
            or delivered.hour not in scheduled_hours
            or delivered.minute != 0
        ):
            return None
        return delivered.replace(second=0, microsecond=0)

    async def _async_execute_provider_attempt(
        self,
        *,
        request_id: Optional[str] = None,
        occurrence_id: Optional[str] = None,
        occurrence_generation: Optional[int] = None,
    ) -> SolarFetchResult:
        """Serialize lock wait and provider I/O under one bounded deadline."""
        self._request_sequence_counter += 1
        request_sequence = self._request_sequence_counter
        resolved_request_id = (
            request_id or occurrence_id or f"request:{request_sequence}"
        )
        resolved_occurrence_generation = (
            self._occurrence_generation
            if occurrence_generation is None
            else occurrence_generation
        )
        source_identity = self._request_identity_from_loaded_provenance(
            request_id=resolved_request_id,
            occurrence_id=self._current_occurrence_id,
            occurrence_generation=resolved_occurrence_generation,
            lifecycle_generation=self._lifecycle_generation,
            request_sequence=request_sequence,
        )
        fallback_context: Optional[SolarCandidateContext] = None
        try:
            async with asyncio.timeout(ATTEMPT_TIMEOUT_SECONDS):
                fallback_context = await self._async_capture_candidate_context(
                    request_id=resolved_request_id,
                    occurrence_id=self._current_occurrence_id,
                    occurrence_generation=resolved_occurrence_generation,
                    lifecycle_generation=self._lifecycle_generation,
                    request_sequence=request_sequence,
                )
                async with self._refresh_lock:
                    if self._removed:
                        return SolarFetchResult.terminal("removed").with_context(
                            fallback_context
                        )
                    if occurrence_id is not None and (
                        occurrence_id != self._current_occurrence_id
                        or occurrence_generation != self._occurrence_generation
                    ):
                        return SolarFetchResult.terminal("superseded").with_context(
                            fallback_context
                        )
                    result = await self.async_fetch_forecast_data(
                        request_id=resolved_request_id,
                        occurrence_id=self._current_occurrence_id,
                        occurrence_generation=resolved_occurrence_generation,
                        lifecycle_generation=self._lifecycle_generation,
                        request_sequence=request_sequence,
                    )
                    return result.with_source_identity(source_identity).with_context(
                        fallback_context
                    )
        except TimeoutError:
            result = SolarFetchResult.retry("timeout").with_source_identity(
                source_identity
            )
            return (
                result.with_context(fallback_context)
                if fallback_context is not None
                else result
            )

    def _request_identity_from_loaded_provenance(
        self,
        *,
        request_id: str,
        occurrence_id: Optional[str],
        occurrence_generation: int,
        lifecycle_generation: int,
        request_sequence: int,
    ) -> Optional[SolarRequestIdentity]:
        """Capture the setup-validated source identity without awaiting."""
        provenance = self._cache_provenance
        if not isinstance(provenance, Mapping):
            return None
        try:
            return SolarRequestIdentity(
                entry_id=str(provenance["entry_id"]),
                provider=str(provenance["provider"]),
                config_fingerprint=str(provenance["config_fingerprint"]),
                credential_revision=int(provenance["credential_revision"]),
                request_id=request_id,
                occurrence_id=occurrence_id,
                occurrence_generation=occurrence_generation,
                lifecycle_generation=lifecycle_generation,
                request_sequence=request_sequence,
            )
        except (KeyError, TypeError, ValueError):
            return None

    async def _async_capture_candidate_context(
        self,
        *,
        request_id: str,
        occurrence_id: Optional[str],
        occurrence_generation: int,
        lifecycle_generation: int,
        request_sequence: int,
        options: Optional[Mapping[str, Any]] = None,
        credential_revision: Optional[int] = None,
    ) -> SolarCandidateContext:
        """Capture one non-secret immutable request identity before provider I/O."""
        entry_id = getattr(self._config_entry, "entry_id", None)
        resolved_entry_id = (
            entry_id
            if isinstance(entry_id, str) and entry_id
            else f"legacy:{self._storage_key}"
        )
        if options is None or credential_revision is None:
            if isinstance(entry_id, str) and entry_id:
                provenance = await self._async_current_cache_provenance()
            else:
                provenance = build_cache_provenance(
                    resolved_entry_id,
                    self._config_entry.options,
                    0,
                )
        else:
            provenance = build_cache_provenance(
                resolved_entry_id,
                options,
                credential_revision,
            )
        return SolarCandidateContext(
            entry_id=str(provenance["entry_id"]),
            provider=str(provenance["provider"]),
            config_fingerprint=str(provenance["config_fingerprint"]),
            credential_revision=int(provenance["credential_revision"]),
            request_id=request_id,
            occurrence_id=occurrence_id,
            occurrence_generation=occurrence_generation,
            lifecycle_generation=lifecycle_generation,
            request_sequence=request_sequence,
        )

    async def _async_start_scheduled_occurrence(
        self, scheduled_local: datetime
    ) -> None:
        entry_id = getattr(self._config_entry, "entry_id", None)
        if not isinstance(entry_id, str) or not entry_id:
            return
        mode = str(
            self._config_entry.options.get("solar_forecast_mode", "daily_optimized")
        )
        occurrence_id = build_occurrence_id(entry_id, mode, scheduled_local)
        if occurrence_id in self._claimed_occurrences:
            return
        self._claimed_occurrences.add(occurrence_id)
        if len(self._claimed_occurrences) > 64:
            self._claimed_occurrences = {occurrence_id}

        if self._current_occurrence_id != occurrence_id:
            self._cancel_retry_timer()
            if self._retry_state is not None:
                await self._async_persist_retry_state(None)
            self._current_occurrence_id = occurrence_id
            self._occurrence_generation += 1
        generation = self._occurrence_generation
        await self._async_run_scheduled_attempt(
            occurrence_id=occurrence_id,
            occurrence_generation=generation,
            scheduled_local=scheduled_local,
            attempt_index=0,
        )

    async def _async_run_scheduled_attempt(
        self,
        *,
        occurrence_id: str,
        occurrence_generation: int,
        scheduled_local: datetime,
        attempt_index: int,
    ) -> None:
        result = await self._async_execute_provider_attempt(
            occurrence_id=occurrence_id,
            occurrence_generation=occurrence_generation,
        )
        if (
            occurrence_id != self._current_occurrence_id
            or occurrence_generation != self._occurrence_generation
            or self._removed
        ):
            return

        candidate = result.candidate
        if result.accepted and isinstance(candidate, SolarCandidate):
            had_retry_recovery = (
                self._retry_state is not None or self._retry_unsubscribe is not None
            )
            committed = await self.async_commit_candidate(candidate)
            if committed:
                return
            if had_retry_recovery:
                self._cancel_retry_timer()
                await self._async_persist_retry_state(
                    None,
                    source_context=result.context,
                )
            return

        source_identity = result.context or result.source_identity
        if source_identity is None:
            return

        if not result.retryable or attempt_index >= 2:
            self._cancel_retry_timer()
            await self._async_persist_retry_state(
                None,
                source_context=source_identity,
            )
            return

        next_at = scheduled_local + timedelta(minutes=15 if attempt_index == 0 else 45)
        state = build_retry_state(
            occurrence_id=occurrence_id,
            scheduled_local=scheduled_local,
            completed_attempt_index=attempt_index,
            next_at=next_at,
            code=result.code,
            provenance=source_identity.provenance(),
        )
        if not await self._async_persist_retry_state(
            state,
            source_context=source_identity,
        ):
            return
        self._arm_retry_timer(state, occurrence_generation)

    def _arm_retry_timer(
        self, state: Mapping[str, Any], occurrence_generation: int
    ) -> bool:
        next_at = self._parse_cache_time(state.get("next_at"))
        scheduled_local = self._parse_cache_time(state.get("scheduled_local"))
        occurrence_id = state.get("occurrence_id")
        completed = state.get("completed_attempt_index")
        if (
            next_at is None
            or scheduled_local is None
            or not isinstance(occurrence_id, str)
            or isinstance(completed, bool)
            or completed not in (0, 1)
        ):
            return False

        async def _retry_callback(_now: datetime) -> None:
            task = self._register_current_refresh_task()
            try:
                self._retry_unsubscribe = None
                if (
                    occurrence_id != self._current_occurrence_id
                    or occurrence_generation != self._occurrence_generation
                    or self._removed
                ):
                    return
                await self._async_run_scheduled_attempt(
                    occurrence_id=occurrence_id,
                    occurrence_generation=occurrence_generation,
                    scheduled_local=scheduled_local,
                    attempt_index=int(completed) + 1,
                )
            finally:
                self._unregister_refresh_task(task)

        self._cancel_retry_timer()
        try:
            self._retry_unsubscribe = async_track_point_in_utc_time(
                self.hass,
                _retry_callback,
                dt_util.as_utc(next_at),
            )
        except Exception as err:
            _LOGGER.warning(
                "Solar retry timer registration failed: error_class=%s",
                type(err).__name__,
            )
            return False
        return True

    def _cancel_retry_timer(self) -> None:
        if self._retry_unsubscribe is not None:
            self._retry_unsubscribe()
            self._retry_unsubscribe = None

    def _register_current_refresh_task(self) -> Optional[asyncio.Task[Any]]:
        task = asyncio.current_task()
        if task is not None:
            self._active_refresh_tasks.add(task)
        return task

    def _unregister_refresh_task(self, task: Optional[asyncio.Task[Any]]) -> None:
        if task is not None:
            self._active_refresh_tasks.discard(task)

    async def _async_persist_retry_state(
        self,
        state: Optional[Mapping[str, Any]],
        *,
        source_context: Optional[SolarRequestIdentity] = None,
    ) -> bool:
        """Persist retry recovery before arming work; never arm after failure."""
        async def _ordered_retry_write() -> bool:
            if source_context is not None and (
                source_context.request_sequence
                <= max(
                    self._latest_committed_request_sequence,
                    self._latest_retry_request_sequence,
                )
                or source_context.request_id in self._committed_occurrences
                or source_context.request_id in self._committing_occurrences
                or not await self._async_request_identity_is_current(source_context)
            ):
                return False

            store: Store[Dict[str, Any]] = Store(
                self.hass,
                version=SCHEMA_VERSION,
                key=self._storage_key,
            )
            caller_cancelled = False
            try:
                durable = await store.async_load()
                if isinstance(durable, Mapping) and durable.get("schema") == SCHEMA_VERSION:
                    envelope = copy.deepcopy(dict(durable))
                else:
                    candidate = self._last_forecast_data or {}
                    accepted_at = self._parse_cache_time(candidate.get("response_time"))
                    envelope = build_cache_envelope(
                        provenance={},
                        forecast_data=candidate,
                        last_accepted_time=accepted_at,
                        saved_at=dt_util.now(),
                    )
                if state is None:
                    envelope.pop("retry_state", None)
                else:
                    envelope["retry_state"] = copy.deepcopy(dict(state))

                save_task = self._create_durable_write_task(
                    store.async_save(envelope)
                )
                caller_cancelled = await self._async_reconcile_durable_write(
                    save_task
                )
                save_task.result()
            except asyncio.CancelledError:
                raise
            except Exception as err:
                _LOGGER.warning(
                    "Solar retry persistence failed: code=storage_failed error_class=%s",
                    type(err).__name__,
                )
                if caller_cancelled:
                    raise asyncio.CancelledError from err
                return False

            self._durable_cache_envelope = envelope
            self._retry_state = dict(state) if state is not None else None
            if source_context is not None:
                self._latest_retry_request_sequence = source_context.request_sequence
            if caller_cancelled:
                raise asyncio.CancelledError
            return True

        async with self._candidate_commit_lock:
            entry_id = getattr(self._config_entry, "entry_id", None)
            if isinstance(entry_id, str) and entry_id:
                async with get_solar_transaction_lock(self.hass, entry_id):
                    return await _ordered_retry_write()
            return await _ordered_retry_write()

    def _create_durable_write_task(self, coroutine: Any) -> asyncio.Task[Any]:
        """Track Store work until the Store task itself reaches a terminal state."""
        task = asyncio.create_task(coroutine)
        self._durable_write_tasks.add(task)
        task.add_done_callback(self._durable_write_tasks.discard)
        return task

    @staticmethod
    async def _async_reconcile_durable_write(task: asyncio.Task[Any]) -> bool:
        """Wait through arbitrary caller cancellation without cancelling Store I/O."""
        caller_cancelled = False
        completed = asyncio.Event()
        task.add_done_callback(lambda _task: completed.set())
        while not task.done():
            try:
                await completed.wait()
            except asyncio.CancelledError:
                caller_cancelled = True
                current_task = asyncio.current_task()
                if current_task is not None:
                    current_task.uncancel()
        return caller_cancelled

    async def _async_restore_retry_recovery(self, now: datetime) -> bool:
        """Restore one matching future or overdue scheduled retry after restart."""
        if self._retry_state is None or self._removed:
            return False
        entry_id = getattr(self._config_entry, "entry_id", None)
        if not isinstance(entry_id, str) or not entry_id:
            return False
        provenance = await self._async_current_cache_provenance()
        mode = str(
            self._config_entry.options.get("solar_forecast_mode", "daily_optimized")
        )
        state = validate_retry_state(
            self._retry_state,
            provenance=provenance,
            entry_id=entry_id,
            mode=mode,
            now=now,
        )
        if state is None:
            await self._async_persist_retry_state(None)
            return False
        occurrence_id = str(state["occurrence_id"])
        scheduled_local = self._parse_cache_time(state.get("scheduled_local"))
        next_at = self._parse_cache_time(state.get("next_at"))
        completed = state.get("completed_attempt_index")
        if (
            scheduled_local is None
            or next_at is None
            or isinstance(completed, bool)
            or completed not in (0, 1)
        ):
            await self._async_persist_retry_state(None)
            return False
        self._current_occurrence_id = occurrence_id
        self._occurrence_generation += 1
        generation = self._occurrence_generation
        self._claimed_occurrences.add(occurrence_id)
        if next_at > now:
            self._arm_retry_timer(state, generation)
            return True
        await self._async_run_scheduled_attempt(
            occurrence_id=occurrence_id,
            occurrence_generation=generation,
            scheduled_local=scheduled_local,
            attempt_index=int(completed) + 1,
        )
        return True

    async def _delayed_initial_fetch(self) -> None:
        """Spustí okamžitou aktualizaci s malým zpožděním."""
        task = self._register_current_refresh_task()
        try:
            # Počkáme 5 sekund na dokončení inicializace
            await asyncio.sleep(5)
            if self._removed:
                return
            _LOGGER.info("🌞 Starting immediate solar forecast data fetch")
            await self._async_run_initial_refresh()
            _LOGGER.info("🌞 Initial solar forecast data fetch completed")
        except asyncio.CancelledError:
            raise
        except Exception as err:
            _LOGGER.error(
                "🌞 Initial solar forecast fetch failed: error_class=%s",
                type(err).__name__,
            )
        finally:
            self._unregister_refresh_task(task)

    async def _async_run_initial_refresh(self) -> bool:
        """Run the one guarded setup request through the durable commit boundary."""
        if self._initial_refresh_started or self._removed:
            return False
        self._initial_refresh_started = True
        request_id = f"initial:{self._lifecycle_generation}"
        task = self._register_current_refresh_task()
        try:
            result = await self._async_execute_provider_attempt(request_id=request_id)
            candidate = result.candidate
            if not result.accepted or not isinstance(candidate, SolarCandidate):
                return False
            return await self.async_commit_candidate(candidate)
        finally:
            self._unregister_refresh_task(task)

    async def _periodic_update(self, now: datetime) -> None:
        """Periodická aktualizace - optimalizovaná pro 3x denně."""
        task = self._register_current_refresh_task()
        try:
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

            entry_id = getattr(self._config_entry, "entry_id", None)
            should_fetch = bool(entry_id) and not self._cache_usable
            if forecast_mode == "every_4h":
                should_fetch = should_fetch or self._should_fetch_every_4h(current_time)
            elif forecast_mode == "hourly":
                should_fetch = should_fetch or self._should_fetch_hourly(current_time)

            if should_fetch and self._is_primary_sensor() and not self._removed:
                await self._async_start_scheduled_occurrence(now)
        finally:
            self._unregister_refresh_task(task)

    def _is_primary_sensor(self) -> bool:
        return self._sensor_type == "solar_forecast"

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
        task = self._register_current_refresh_task()
        try:
            _LOGGER.info(
                f"🌞 Manual solar forecast update requested for {self.entity_id}"
            )
            self._manual_request_counter += 1
            request_id = (
                f"manual:{self._lifecycle_generation}:"
                f"{self._manual_request_counter}"
            )
            result = await self._async_execute_provider_attempt(request_id=request_id)
            if not isinstance(result, SolarFetchResult):
                _LOGGER.warning(
                    "🌞 Manual solar forecast update finished without new data for %s",
                    self.entity_id,
                )
                return False
            candidate = result.candidate
            if not result.accepted or not isinstance(candidate, SolarCandidate):
                _LOGGER.warning(
                    "🌞 Manual solar forecast update finished without new data for %s",
                    self.entity_id,
                )
                return False
            return await self.async_commit_candidate(candidate)
        except Exception as err:
            _LOGGER.error(
                "Manual solar forecast update failed for %s: error_class=%s",
                self.entity_id,
                type(err).__name__,
            )
            return False
        finally:
            self._unregister_refresh_task(task)

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA - zrušit periodické aktualizace."""
        if self._removal_task is None:
            self._removal_task = asyncio.create_task(self._async_remove_once())
        await asyncio.shield(self._removal_task)

    async def _async_remove_once(self) -> None:
        """Run one shared teardown for every concurrent removal caller."""
        self._removed = True
        self._lifecycle_generation += 1
        self._occurrence_generation += 1
        if self._update_interval_remover:
            self._update_interval_remover()
            self._update_interval_remover = None
        self._cancel_retry_timer()
        self._cancel_setup_recovery()
        current = asyncio.current_task()
        refresh_tasks = [
            task
            for task in self._active_refresh_tasks
            if task is not current and not task.done()
        ]
        for task in refresh_tasks:
            task.cancel()
        if refresh_tasks:
            await asyncio.gather(*refresh_tasks, return_exceptions=True)
        durable_tasks = [task for task in self._durable_write_tasks if not task.done()]
        if durable_tasks:
            await asyncio.wait(durable_tasks)
        await super().async_will_remove_from_hass()
        self._removal_complete = True

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
        declination: int,
        compass_azimuth: int,
        kwp: float,
        legacy_provider_value: bool = False,
    ) -> str:
        return build_forecast_solar_url(
            api_key=api_key,
            lat=lat,
            lon=lon,
            declination=declination,
            compass_azimuth=compass_azimuth,
            kwp=kwp,
            legacy_provider_value=legacy_provider_value,
        )

    async def _fetch_forecast_solar_strings(
        self,
        *,
        lat: float,
        lon: float,
        api_key: str,
        string1_enabled: bool,
        string2_enabled: bool,
        dto: Mapping[str, Any] | None = None,
    ) -> SolarFetchResult:
        data_string1: Optional[Mapping[str, Any]] = None
        data_string2: Optional[Mapping[str, Any]] = None

        async with aiohttp.ClientSession() as session:
            if string1_enabled:
                string1_config = self._forecast_string_config("string1", dto)
                if string1_config is None:
                    _LOGGER.warning(
                        "🌞 String 1 forecast config missing; forecast unavailable"
                    )
                    return SolarFetchResult.terminal("invalid_config")
                declination, azimuth, kwp, legacy_provider_value = string1_config
                string1_result = await self._fetch_forecast_string(
                    session=session,
                    label="string 1",
                    lat=lat,
                    lon=lon,
                    api_key=api_key,
                    declination=declination,
                    compass_azimuth=azimuth,
                    kwp=kwp,
                    legacy_provider_value=legacy_provider_value,
                )
                if not string1_result.accepted:
                    return string1_result
                data_string1 = string1_result.candidate
            else:
                _LOGGER.debug("🌞 String 1 disabled")

            if string2_enabled:
                string2_config = self._forecast_string_config("string2", dto)
                if string2_config is None:
                    _LOGGER.warning(
                        "🌞 String 2 forecast config missing; skipping string 2"
                    )
                    return SolarFetchResult.terminal("invalid_config")
                declination, azimuth, kwp, legacy_provider_value = string2_config
                string2_result = await self._fetch_forecast_string(
                    session=session,
                    label="string 2",
                    lat=lat,
                    lon=lon,
                    api_key=api_key,
                    declination=declination,
                    compass_azimuth=azimuth,
                    kwp=kwp,
                    legacy_provider_value=legacy_provider_value,
                )
                if not string2_result.accepted:
                    return string2_result
                data_string2 = string2_result.candidate
            else:
                _LOGGER.debug("🌞 String 2 disabled")

        if (string1_enabled and data_string1 is None) or (
            string2_enabled and data_string2 is None
        ):
            return SolarFetchResult.terminal("invalid_response")
        forecast_data = self._process_forecast_data(
            dict(data_string1) if data_string1 is not None else None,
            dict(data_string2) if data_string2 is not None else None,
        )
        if forecast_data.get("error") or not forecast_data.get("total_daily"):
            return SolarFetchResult.terminal("invalid_response")
        return SolarFetchResult.accept(forecast_data)

    def _forecast_string_config(
        self, prefix: str, dto: Mapping[str, Any] | None = None
    ) -> tuple[int, int, float, bool] | None:
        source = dto if dto is not None else self._config_entry.options
        declination_value = source.get(f"solar_forecast_{prefix}_declination")
        kwp_value = source.get(f"solar_forecast_{prefix}_kwp")
        if declination_value is None or kwp_value is None:
            return None
        try:
            declination = float(declination_value)
            kwp = float(kwp_value)
        except (TypeError, ValueError):
            return None
        azimuth = source.get(f"solar_forecast_{prefix}_azimuth")
        legacy = legacy_azimuth_read_model(azimuth)
        if (
            not declination.is_integer()
            or not 0 <= declination <= 90
            or legacy is None
            or not legacy["valid_for_provider"]
            or not 0.1 <= kwp <= 50
        ):
            return None
        return (
            int(declination),
            int(legacy["stored_value"]),
            kwp,
            bool(
                source.get(
                    f"solar_forecast_{prefix}_azimuth_legacy_provider_value",
                    legacy["legacy_provider_value"],
                )
            ),
        )

    def _float_option(self, key: str) -> float | None:
        value = self._config_entry.options.get(key)
        if value is None or value == "":
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    async def _active_solar_credentials(self, provider: str) -> Dict[str, str]:
        entry_id = getattr(self._config_entry, "entry_id", None)
        if entry_id:
            try:
                active = await SolarKeyStore(self.hass, entry_id).async_get_active(
                    provider
                )
            except AttributeError:
                if hasattr(self.hass, "data") and hasattr(
                    getattr(self.hass, "config", None), "config_dir"
                ):
                    raise
                active = None
            if active:
                return active

        fields = (
            ("solar_forecast_api_key",)
            if provider == "forecast_solar"
            else ("solcast_api_key", "solcast_site_id")
        )
        return {
            key: str(value).strip()
            for key in fields
            if isinstance((value := self._config_entry.options.get(key)), str)
            and value.strip()
        }

    async def _fetch_forecast_string(
        self,
        *,
        session: aiohttp.ClientSession,
        label: str,
        lat: float,
        lon: float,
        api_key: str,
        declination: int,
        compass_azimuth: int,
        kwp: float,
        legacy_provider_value: bool,
    ) -> SolarFetchResult:
        url = self._build_forecast_url(
            api_key=api_key,
            lat=lat,
            lon=lon,
            declination=declination,
            compass_azimuth=compass_azimuth,
            kwp=kwp,
            legacy_provider_value=legacy_provider_value,
        )
        # Do not log the full URL — the forecast.solar API key is a path segment.
        _LOGGER.info("🌞 Calling forecast.solar API for %s", label)
        try:
            async with session.get(
                url, timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status != 200:
                    result = classify_http_status(int(response.status))
                    _LOGGER.warning(
                        "🌞 %s API request failed: %s",
                        label,
                        safe_provider_diagnostic("forecast_solar", result.code),
                    )
                    return result
                data = await response.json()
        except asyncio.CancelledError:
            raise
        except BaseException as err:
            result = classify_provider_exception(err)
            _LOGGER.warning(
                "🌞 %s provider request failed: %s error_class=%s",
                label,
                safe_provider_diagnostic("forecast_solar", result.code),
                type(err).__name__,
            )
            return result

        if (
            not isinstance(data, Mapping)
            or data.get("error")
            or not isinstance(data.get("result"), Mapping)
        ):
            return SolarFetchResult.terminal("invalid_response")
        provider_result = data["result"]
        if not isinstance(provider_result.get("watts"), Mapping) or not isinstance(
            provider_result.get("watt_hours_day"), Mapping
        ):
            return SolarFetchResult.terminal("invalid_response")
        if not provider_result["watts"] or not provider_result["watt_hours_day"]:
            return SolarFetchResult.terminal("invalid_response")
        _LOGGER.debug("🌞 %s data received successfully", label)
        return SolarFetchResult.accept(data)

    def _validated_candidate(self, candidate: Mapping[str, Any]) -> Dict[str, Any]:
        """Validate a complete provider candidate against current local options."""
        options = self._config_entry.options
        try:
            string1_kwp = float(options.get("solar_forecast_string1_kwp") or 0)
            string2_kwp = float(options.get("solar_forecast_string2_kwp") or 0)
        except (TypeError, ValueError) as err:
            raise CandidateValidationError("configured string kWp is invalid") from err
        return validate_forecast_candidate(
            candidate,
            provider=str(options.get("solar_forecast_provider", "forecast_solar")),
            string1_enabled=bool(options.get("solar_forecast_string1_enabled", True)),
            string2_enabled=bool(options.get("solar_forecast_string2_enabled", False)),
            string1_kwp=string1_kwp,
            string2_kwp=string2_kwp,
            now=dt_util.now(),
        )

    async def _async_save_candidate_snapshot(
        self,
        candidate: Mapping[str, Any],
        commit_time: float,
        context: SolarCandidateContext,
    ) -> Dict[str, Any]:
        """Persist one candidate without mutating sensor memory."""
        accepted_at = self._parse_cache_time(candidate.get("response_time"))
        if accepted_at is None:
            raise CandidateValidationError("candidate response_time is invalid")
        store: Store[Dict[str, Any]] = Store(
            self.hass,
            version=SCHEMA_VERSION,
            key=self._storage_key,
        )
        del commit_time
        envelope = build_cache_envelope(
            provenance=context.provenance(),
            forecast_data=candidate,
            last_accepted_time=accepted_at,
            saved_at=dt_util.now(),
        )
        await store.async_save(envelope)
        return envelope

    async def _async_candidate_context_is_current(
        self, context: SolarCandidateContext
    ) -> bool:
        """Validate every captured request identity against current runtime state."""
        if (
            self._removed
            or context.lifecycle_generation != self._lifecycle_generation
            or context.occurrence_generation != self._occurrence_generation
            or context.occurrence_id != self._current_occurrence_id
        ):
            return False
        entry_id = getattr(self._config_entry, "entry_id", None)
        if isinstance(entry_id, str) and entry_id:
            current = await self._async_current_cache_provenance()
        else:
            current = build_cache_provenance(
                context.entry_id,
                self._config_entry.options,
                0,
            )
        return current == context.provenance()

    async def _async_request_identity_is_current(
        self, identity: SolarRequestIdentity
    ) -> bool:
        """Validate confirmed contexts strongly and timeout identities safely."""
        if isinstance(identity, SolarCandidateContext):
            return await self._async_candidate_context_is_current(identity)
        if (
            self._removed
            or identity.lifecycle_generation != self._lifecycle_generation
            or identity.occurrence_generation != self._occurrence_generation
            or identity.occurrence_id != self._current_occurrence_id
            or not isinstance(self._cache_provenance, Mapping)
        ):
            return False
        entry_id = getattr(self._config_entry, "entry_id", None)
        if entry_id != identity.entry_id:
            return False
        loaded = dict(self._cache_provenance)
        current_options = build_cache_provenance(
            identity.entry_id,
            self._config_entry.options,
            identity.credential_revision,
        )
        return loaded == identity.provenance() == current_options

    async def async_commit_candidate(
        self,
        candidate: SolarCandidate,
    ) -> bool:
        """Persist a validated snapshot, then publish it exactly once."""
        if not isinstance(candidate, SolarCandidate):
            return False
        context = candidate.context

        async def _ordered_commit() -> bool:
            if (
                context.request_sequence
                <= max(
                    self._latest_committed_request_sequence,
                    self._latest_retry_request_sequence,
                )
                or context.request_id in self._committed_occurrences
                or context.request_id in self._committing_occurrences
                or not await self._async_candidate_context_is_current(context)
            ):
                return False
            try:
                snapshot = self._validated_candidate(candidate.forecast_data)
            except CandidateValidationError:
                return False

            self._committing_occurrences.add(context.request_id)
            commit_time = time.time()
            save_task = self._create_durable_write_task(
                self._async_save_candidate_snapshot(snapshot, commit_time, context)
            )
            caller_cancelled = False
            try:
                caller_cancelled = await self._async_reconcile_durable_write(save_task)
                saved_envelope = save_task.result()
            except asyncio.CancelledError:
                raise
            except Exception as err:
                _LOGGER.warning(
                    "Solar forecast storage failed: code=storage_failed error_class=%s",
                    type(err).__name__,
                )
                if caller_cancelled:
                    raise asyncio.CancelledError from err
                return False
            finally:
                self._committing_occurrences.discard(context.request_id)

            self._latest_committed_request_sequence = context.request_sequence
            self._committed_occurrences.add(context.request_id)
            lifecycle_current = await self._async_candidate_context_is_current(context)
            if lifecycle_current:
                if isinstance(saved_envelope, Mapping):
                    self._durable_cache_envelope = copy.deepcopy(
                        dict(saved_envelope)
                    )
                self._last_forecast_data = snapshot
                self._last_api_call = commit_time
                setattr(self.coordinator, "solar_forecast_data", snapshot)
                self._cache_usable = True
                self._forced_stale_reason = None
                self._cache_provenance = context.provenance()
                self._retry_state = None
                self._cancel_retry_timer()
                self.async_write_ha_state()
                await self._broadcast_forecast_data()

            if caller_cancelled:
                raise asyncio.CancelledError
            return lifecycle_current

        async with self._candidate_commit_lock:
            entry_id = getattr(self._config_entry, "entry_id", None)
            if isinstance(entry_id, str) and entry_id:
                async with get_solar_transaction_lock(self.hass, entry_id):
                    return await _ordered_commit()
            return await _ordered_commit()

    async def async_fetch_forecast_data(
        self,
        *,
        request_id: Optional[str] = None,
        occurrence_id: Optional[str] = None,
        occurrence_generation: Optional[int] = None,
        lifecycle_generation: Optional[int] = None,
        request_sequence: Optional[int] = None,
    ) -> SolarFetchResult:
        """Získání forecast dat z API pro oba stringy."""
        try:
            _LOGGER.debug(f"[{self.entity_id}] Starting solar forecast API call")

            current_time = time.time()

            if self._is_rate_limited(current_time):
                return SolarFetchResult.terminal("superseded")

            provenance_options: Mapping[str, Any]
            entry_id = getattr(self._config_entry, "entry_id", None)
            if entry_id:
                dto, provenance_options, revision = await async_solar_request_snapshot(
                    self.hass, self._config_entry, {}
                )
            else:
                revision = None
                provider_for_credentials = self._config_entry.options.get(
                    "solar_forecast_provider", "forecast_solar"
                )
                active = await self._active_solar_credentials(provider_for_credentials)
                from ..forecast.provider_contract import build_effective_solar_dto

                dto = build_effective_solar_dto(
                    self._config_entry.options,
                    active,
                    {},
                )
                provenance_options = self._config_entry.options
            if request_sequence is None:
                self._request_sequence_counter += 1
                request_sequence = self._request_sequence_counter
            resolved_request_id = request_id or f"direct:{request_sequence}"
            context = await self._async_capture_candidate_context(
                request_id=resolved_request_id,
                occurrence_id=(
                    self._current_occurrence_id
                    if occurrence_id is None
                    else occurrence_id
                ),
                occurrence_generation=(
                    self._occurrence_generation
                    if occurrence_generation is None
                    else occurrence_generation
                ),
                lifecycle_generation=(
                    self._lifecycle_generation
                    if lifecycle_generation is None
                    else lifecycle_generation
                ),
                request_sequence=request_sequence,
                options=provenance_options,
                credential_revision=int(revision or 0),
            )
            provider = dto["solar_forecast_provider"]
            if provider == "solcast":
                result = await self._fetch_solcast_data(
                    current_time, dto, revision=revision
                )
                return result.with_context(context)

            # Konfigurační parametry — Plan 4 Task 4 / P7: no implicit author GPS fallback.
            # When the user has not configured a location we surface `unavailable` with
            # a visible warning on the mounted surface (R5.5).
            lat = dto["solar_forecast_latitude"]
            lon = dto["solar_forecast_longitude"]
            api_key = dto.get("solar_forecast_api_key", "")

            # String 1 - zapnutý podle checkboxu
            string1_enabled = dto["solar_forecast_string1_enabled"]

            # String 2 - zapnutý podle checkboxu
            string2_enabled = dto["solar_forecast_string2_enabled"]

            _LOGGER.debug("🌞 String 1: enabled=%s", string1_enabled)
            _LOGGER.debug("🌞 String 2: enabled=%s", string2_enabled)

            result = await self._fetch_forecast_solar_strings(
                lat=lat,
                lon=lon,
                api_key=api_key,
                string1_enabled=string1_enabled,
                string2_enabled=string2_enabled,
                dto=dto,
            )
            return result.with_context(context)
        except asyncio.CancelledError:
            raise
        except BaseException as err:
            result = classify_provider_exception(err)
            _LOGGER.error(
                "[%s] Solar provider request failed: %s error_class=%s; preserving cached data",
                self.entity_id,
                safe_provider_diagnostic(
                    str(locals().get("provider", "unknown")), result.code
                ),
                type(err).__name__,
            )
            captured_context = locals().get("context")
            if isinstance(captured_context, SolarCandidateContext):
                return result.with_context(captured_context)
            return result

    async def _fetch_solcast_data(
        self,
        current_time: float,
        dto: Mapping[str, Any] | None = None,
        *,
        revision: Optional[int] = None,
    ) -> SolarFetchResult:
        """Fetch forecast data from Solcast API and map to unified structure."""
        del current_time, revision
        if dto is None:
            active_credentials = await self._active_solar_credentials("solcast")
            api_key = (active_credentials or {}).get("solcast_api_key", "").strip()
            site_id = (active_credentials or {}).get("solcast_site_id", "").strip()
            source: Mapping[str, Any] = self._config_entry.options
        else:
            api_key = str(dto.get("solcast_api_key", "")).strip()
            site_id = str(dto.get("solcast_site_id", "")).strip()
            source = dto

        if not api_key:
            _LOGGER.error("🌞 Solcast API key missing")
            return SolarFetchResult.terminal("invalid_config")
        if not site_id:
            _LOGGER.error("🌞 Solcast site ID missing")
            return SolarFetchResult.terminal("invalid_config")

        string1_enabled = source.get("solar_forecast_string1_enabled", True)
        string2_enabled = source.get("solar_forecast_string2_enabled", False)

        kwp1 = (
            float(source.get("solar_forecast_string1_kwp") or 0)
            if string1_enabled
            else 0.0
        )
        kwp2 = (
            float(source.get("solar_forecast_string2_kwp") or 0)
            if string2_enabled
            else 0.0
        )
        total_kwp = kwp1 + kwp2
        if total_kwp <= 0:
            _LOGGER.error("🌞 Solcast requires at least one enabled string with kWp")
            return SolarFetchResult.terminal("invalid_config")

        url = build_solcast_url(api_key=api_key, site_id=site_id)
        _LOGGER.info("🌞 Calling Solcast API")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        result = classify_http_status(int(response.status))
                        _LOGGER.warning(
                            "🌞 Solcast API request failed: %s",
                            safe_provider_diagnostic("solcast", result.code),
                        )
                        return result
                    data = await response.json()
        except asyncio.CancelledError:
            raise
        except BaseException as err:
            result = classify_provider_exception(err)
            _LOGGER.warning(
                "🌞 Solcast provider request failed: %s error_class=%s",
                safe_provider_diagnostic("solcast", result.code),
                type(err).__name__,
            )
            return result

        if not isinstance(data, Mapping) or data.get("error"):
            return SolarFetchResult.terminal("invalid_response")
        forecasts = data.get("forecasts")
        if not isinstance(forecasts, list) or not forecasts:
            return SolarFetchResult.terminal("invalid_response")

        forecast_data = self._process_solcast_data(forecasts, kwp1, kwp2)
        if forecast_data.get("error") or not forecast_data.get("total_daily"):
            return SolarFetchResult.terminal("invalid_response")
        return SolarFetchResult.accept(forecast_data)

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
            if not isinstance(ghi, (int, float, str)):
                return None
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
                            self._create_refresh_task(
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
        result: Dict[str, Any] = {"response_time": datetime.now().isoformat()}
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

            if (
                _safe_float(result.get("string1_today_kwh", 0)) <= 0
                and today_key not in string1_data["daily"]
            ):
                result["string1_today_kwh"] = _cached_today_value(
                    self._last_forecast_data,
                    today=today,
                    daily_key="string1_daily",
                    value_key="string1_today_kwh",
                )
            if (
                _safe_float(result.get("string2_today_kwh", 0)) <= 0
                and today_key not in string2_data["daily"]
            ):
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

        except Exception as err:
            _LOGGER.error(
                "Error processing forecast data: error_class=%s",
                type(err).__name__,
            )
            result["error"] = "invalid_response"

        return result

    def _convert_to_hourly(self, watts_data: Dict[str, float]) -> Dict[str, float]:
        """Převede forecast data na hodinová data."""
        hourly_data: Dict[str, float] = {}

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
            except Exception as err:
                _LOGGER.debug(
                    "Forecast timestamp discarded: error_class=%s",
                    type(err).__name__,
                )

        _LOGGER.info(
            f"🌞 CONVERT DEBUG: Output hourly_data has {len(hourly_data)} hours"
        )
        return hourly_data

    @property
    def device_info(self) -> Any:
        """Return device info - Analytics Module."""
        return self._device_info

    @property
    def available(self) -> bool:
        """Return True if entity is available.

        Plan 4 Task 4 / R5.5: a missing-GPS forecast surfaces as `unavailable`,
        not a silently-fallback number. The mounted surface
        (``extra_state_attributes``) carries the visible warning + recovery action.
        """
        if not self._config_entry.options.get("enable_solar_forecast", False):
            return False
        # Sensor-first / options-first: refuse to be available if the user has not
        # configured a location (no implicit author-GPS fallback).
        if self._missing_config_fields():
            return False
        return True

    def _missing_config_fields(self) -> list[str]:
        """Names of user-config fields required for a non-empty forecast, when missing."""
        missing: list[str] = []
        opts = self._config_entry.options
        if opts.get("solar_forecast_provider") != "forecast_solar":
            return missing
        if opts.get("solar_forecast_latitude") is None:
            missing.append("solar_forecast_latitude")
        if opts.get("solar_forecast_longitude") is None:
            missing.append("solar_forecast_longitude")
        return missing

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
            # Stejný zdroj data jako v _build_main_attrs/_build_string_attrs
            today = datetime.now().date()
            if self._sensor_type == "solar_forecast":
                # Celková denní výroba z obou stringů v kWh (vůči dnešnímu dni)
                return round(
                    _date_value_kwh(self._last_forecast_data, "total_daily", today), 2
                )

            elif self._sensor_type == "solar_forecast_string1":
                # Denní výroba jen z string1 v kWh (vůči dnešnímu dni)
                return round(
                    _date_value_kwh(self._last_forecast_data, "string1_daily", today), 2
                )

            elif self._sensor_type == "solar_forecast_string2":
                # Denní výroba jen z string2 v kWh (vůči dnešnímu dni)
                return round(
                    _date_value_kwh(self._last_forecast_data, "string2_daily", today), 2
                )

        except Exception as e:
            _LOGGER.error(f"Error getting solar forecast state: {e}")

        return None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Dodatečné atributy s hodinovými výkony a aktuální hodinovou prognózou.

        R5.5: when configuration required for the forecast is missing we mount a
        visible ``warning`` and ``recovery_action`` on this surface (the dashboard /
        Lovelace renders these attributes), alongside the ``unavailable`` state.
        A log line does not satisfy R5.5; this dict IS the mounted surface.
        """
        attrs: Dict[str, Any] = {}

        # R5.5 visible warning — Plan 4 Task 4 mount point.
        missing = self._missing_config_fields()
        if missing:
            attrs["warning"] = (
                "Solar forecast location (GPS latitude/longitude) is not configured. "
                "The forecast cannot run without a real installation location."
            )
            attrs["missing_fields"] = missing
            attrs["recovery_action"] = (
                "Open the integration's options and set "
                "solar_forecast_latitude / solar_forecast_longitude to your "
                "installation site, then reload the integration."
            )
            attrs["config_status"] = "missing_required_config"
            return attrs

        if self._config_entry.options.get("solar_forecast_provider"):
            attrs["config_status"] = "ok"

        if not self._last_forecast_data:
            return attrs

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
        forecast_data = self._last_forecast_data or {}
        total_hourly = forecast_data.get("total_hourly", {})
        string1_hourly = forecast_data.get("string1_hourly", {})
        string2_hourly = forecast_data.get("string2_hourly", {})

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

        total_daily = forecast_data.get("total_daily", {})
        age_hours = _forecast_age_hours(forecast_data)
        covers_today = (
            isinstance(total_daily, dict) and today.isoformat() in total_daily
        )
        covers_tomorrow = (
            isinstance(total_daily, dict) and tomorrow.isoformat() in total_daily
        )

        return {
            "today_total_kwh": _date_value_kwh(forecast_data, "total_daily", today),
            "tomorrow_total_kwh": _date_value_kwh(
                forecast_data, "total_daily", tomorrow
            ),
            "string1_today_kwh": _date_value_kwh(forecast_data, "string1_daily", today),
            "string1_tomorrow_kwh": _date_value_kwh(
                forecast_data, "string1_daily", tomorrow
            ),
            "string2_today_kwh": _date_value_kwh(forecast_data, "string2_daily", today),
            "string2_tomorrow_kwh": _date_value_kwh(
                forecast_data, "string2_daily", tomorrow
            ),
            "forecast_age_hours": (
                round(age_hours, 1) if age_hours is not None else None
            ),
            "forecast_stale": bool(age_hours is not None and age_hours > 24)
            or not covers_tomorrow
            or self._forced_stale_reason is not None,
            "stale_reason": self._forced_stale_reason,
            "forecast_covers_today": covers_today,
            "forecast_covers_tomorrow": covers_tomorrow,
            "total_daily": forecast_data.get("total_daily", {}),
            "string1_daily": forecast_data.get("string1_daily", {}),
            "string2_daily": forecast_data.get("string2_daily", {}),
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
        forecast_data = self._last_forecast_data or {}
        hourly = forecast_data.get(f"{key}_hourly", {})
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)

        today_hours, tomorrow_hours, today_sum, tomorrow_sum = self._split_hourly(
            hourly, today, tomorrow
        )

        return {
            "today_kwh": _date_value_kwh(forecast_data, f"{key}_daily", today),
            "tomorrow_kwh": _date_value_kwh(forecast_data, f"{key}_daily", tomorrow),
            "daily_kwh": forecast_data.get(f"{key}_daily", {}),
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
        hourly: Dict[str, Any], today: date, tomorrow: date
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
    del raw_data
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
