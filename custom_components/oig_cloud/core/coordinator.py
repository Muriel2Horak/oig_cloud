import asyncio
import logging
import random
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo  # Nahradit pytz import

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .data_source import DATA_SOURCE_CLOUD_ONLY, get_data_source_state

if TYPE_CHECKING:
    from ..api.ote_api import OteApi

_LOGGER = logging.getLogger(__name__)

# Jitter configuration: ±5 seconds around base interval
JITTER_SECONDS = 5.0

# HA storage snapshot (retain last-known values across restart)
COORDINATOR_CACHE_VERSION = 1
COORDINATOR_CACHE_SAVE_COOLDOWN_S = 900.0  # 15 minut (low-power default)
COORDINATOR_CACHE_MAX_LIST_ITEMS = 1500
COORDINATOR_CACHE_MAX_STR_LEN = 5000


class OigCloudCoordinator(DataUpdateCoordinator):
    @staticmethod
    def _utcnow() -> datetime:
        """Return utcnow compatible with HA test stubs."""
        utcnow = getattr(dt_util, "utcnow", None)
        if callable(utcnow):
            return utcnow()
        return datetime.now(timezone.utc)

    def __init__(
        self,
        hass: HomeAssistant,
        api: Any,
        standard_interval_seconds: int = 30,
        extended_interval_seconds: int = 300,
        config_entry: Optional[Any] = None,
    ) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name="OIG Cloud Coordinator",
            update_interval=timedelta(seconds=standard_interval_seconds),
        )

        self.api = api
        self.standard_interval = standard_interval_seconds
        self.extended_interval = extended_interval_seconds
        self.config_entry = config_entry  # NOVÉ: Uložit config_entry

        self.extended_data: Dict[str, Any] = {}
        self._last_extended_update: Optional[datetime] = None

        # NOVÉ: Přidání notification manager support
        self.notification_manager: Optional[Any] = None

        # Battery forecast data
        self.battery_forecast_data: Optional[Dict[str, Any]] = None
        self._battery_forecast_task: Optional[asyncio.Task] = None
        self._battery_forecast_last_update: Optional[datetime] = None
        self._battery_forecast_last_inputs_hash: Optional[int] = None

        # Spot price cache shared between scheduler/fallback and coordinator updates
        self._spot_prices_cache: Optional[Dict[str, Any]] = None

        # NOVÉ: OTE API inicializace - OPRAVA logiky
        pricing_enabled = self.config_entry and self.config_entry.options.get(
            "enable_pricing", False
        )

        self.ote_api: Optional["OteApi"] = None

        if pricing_enabled:
            self._setup_pricing_ote(hass)
        else:
            _LOGGER.debug("Spot prices disabled - not initializing OTE API")

        # NOVÉ: Sledování posledního stažení spotových cen
        self._last_spot_fetch: Optional[datetime] = None
        self._spot_retry_count: int = 0
        self._spot_retry_task: Optional[asyncio.Task] = None
        self._max_spot_retries: int = 20  # 20 * 15min = 5 hodin retry
        self._hourly_fallback_active: bool = False  # NOVÉ: flag pro hodinový fallback

        # NOVÉ: ČHMÚ API inicializace
        self._setup_chmu_warnings()

        # Last jitter value (for diagnostics/tests).
        self._next_jitter: Optional[float] = None
        self._skip_next_jitter: bool = False

        # Startup grace period to avoid loading-heavy work during HA bootstrap
        self._startup_ts: datetime = self._utcnow()
        self._startup_grace_seconds: int = (
            int(self.config_entry.options.get("startup_grace_seconds", 30))
            if self.config_entry and hasattr(self.config_entry, "options")
            else 30
        )

        # Retain last-known coordinator payload to avoid "unknown" after HA restart.
        self._cache_store: Optional[Store] = None
        self._last_cache_save_ts: Optional[datetime] = None
        try:
            if self.config_entry and getattr(self.config_entry, "entry_id", None):
                self._cache_store = Store(
                    hass,
                    COORDINATOR_CACHE_VERSION,
                    f"oig_cloud.coordinator_cache_{self.config_entry.entry_id}",
                )
        except Exception:
            self._cache_store = None

        _LOGGER.info(
            "Coordinator initialized with intervals: standard=%ss, extended=%ss, jitter=±%ss",
            standard_interval_seconds,
            extended_interval_seconds,
            JITTER_SECONDS,
        )

    def _setup_chmu_warnings(self) -> None:
        chmu_enabled = self.config_entry and self.config_entry.options.get(
            "enable_chmu_warnings", False
        )
        if not chmu_enabled:
            _LOGGER.debug("ČHMÚ warnings disabled - not initializing ČHMÚ API")
            self.chmu_api = None
            self.chmu_warning_data = None
            return
        try:
            _LOGGER.debug("ČHMÚ warnings enabled - initializing ČHMÚ API")
            from ..api.api_chmu import ChmuApi

            self.chmu_api = ChmuApi()
            self.chmu_warning_data = None
            _LOGGER.debug("ČHMÚ API initialized successfully")
        except Exception as e:
            _LOGGER.error(f"Failed to initialize ČHMÚ API: {e}")
            self.chmu_api = None
            self.chmu_warning_data = None

    def _setup_pricing_ote(self, hass: HomeAssistant) -> None:
        try:
            _LOGGER.debug("Pricing enabled - initializing OTE API")
            from ..api.ote_api import OteApi

            # OPRAVA: Předat cache_path pro načtení uložených spotových cen
            cache_path = hass.config.path(".storage", "oig_ote_spot_prices.json")
            ote_api = OteApi(cache_path=cache_path)
            self.ote_api = ote_api

            # Load cached spot prices asynchronously (avoid blocking file I/O in event loop)
            async def _async_load_ote_cache() -> None:
                try:
                    await ote_api.async_load_cached_spot_prices()
                    if ote_api._last_data:
                        self._spot_prices_cache = ote_api._last_data
                        _LOGGER.info(
                            "Loaded %d hours of cached spot prices from disk",
                            ote_api._last_data.get("hours_count", 0),
                        )
                except Exception as err:
                    _LOGGER.debug("Failed to load OTE cache asynchronously: %s", err)

            self.hass.async_create_task(_async_load_ote_cache())

            # Naplánovat aktualizaci na příští den ve 13:05 (OTE zveřejňuje kolem 13:00)
            # OPRAVA: Použít zoneinfo místo pytz
            now = datetime.now(ZoneInfo("Europe/Prague"))
            next_update = now.replace(hour=13, minute=5, second=0, microsecond=0)
            if next_update <= now:
                next_update += timedelta(days=1)

            _LOGGER.debug("Next spot price update scheduled for: %s", next_update)

            # NOVÉ: Naplánovat fallback hodinové kontroly
            self._schedule_hourly_fallback()

            # NOVĚ: Aktivovat i hlavní plánovač a provést první fetch asynchronně
            self._schedule_spot_price_update()
            self.hass.async_create_task(self._update_spot_prices())

        except Exception as e:
            _LOGGER.error(f"Failed to initialize OTE API: {e}")
            self.ote_api = None

    async def async_config_entry_first_refresh(self) -> None:
        self._skip_next_jitter = True
        await self.async_hydrate_startup_cache()

        try:
            await super().async_config_entry_first_refresh()
        except Exception as err:
            # Keep cached values if refresh fails during startup (e.g. cloud unreachable).
            if self.data:
                self.last_update_success = True
                _LOGGER.warning(
                    "First refresh failed, continuing with cached coordinator data: %s",
                    err,
                )
                return
            raise

    async def async_hydrate_startup_cache(self) -> bool:
        if self._cache_store is None:
            return False

        try:
            cached = await self._cache_store.async_load()
        except Exception as err:
            _LOGGER.debug("Failed to load coordinator cache: %s", err)
            return False

        cached_data = cached.get("data") if isinstance(cached, dict) else None
        if not isinstance(cached_data, dict) or not cached_data:
            return False

        self.data = cached_data
        self.last_update_success = True
        _LOGGER.debug(
            "Loaded cached coordinator data (%d keys) before refresh",
            len(cached_data),
        )
        return True

    def _prune_for_cache(self, value: Any, *, _depth: int = 0) -> Any:
        """Reduce payload size before saving to HA storage."""
        if _depth > 6:
            return None

        if value is None or isinstance(value, (bool, int, float)):
            return value

        if isinstance(value, str):
            return self._prune_string(value)

        if isinstance(value, datetime):
            return self._prune_datetime(value)

        if isinstance(value, list):
            return self._prune_sequence(value, _depth=_depth)

        if isinstance(value, tuple):
            return self._prune_sequence(list(value), _depth=_depth)

        if isinstance(value, dict):
            return self._prune_mapping(value, _depth=_depth)

        # Fallback: keep a readable representation
        try:
            return str(value)
        except Exception:
            return None

    @staticmethod
    def _prune_string(value: str) -> str:
        return (
            value
            if len(value) <= COORDINATOR_CACHE_MAX_STR_LEN
            else value[:COORDINATOR_CACHE_MAX_STR_LEN]
        )

    @staticmethod
    def _prune_datetime(value: datetime) -> str:
        try:
            return value.isoformat()
        except Exception:
            return str(value)

    def _prune_sequence(self, value: List[Any], *, _depth: int) -> List[Any]:
        trimmed = value[:COORDINATOR_CACHE_MAX_LIST_ITEMS]
        return [self._prune_for_cache(v, _depth=_depth + 1) for v in trimmed]

    def _prune_mapping(self, value: Dict[Any, Any], *, _depth: int) -> Dict[str, Any]:
        out: Dict[str, Any] = {}
        for k, v in value.items():
            key = str(k)
            if key in {"timeline_data", "timeline", "latest_timeline"}:
                continue
            out[key] = self._prune_for_cache(v, _depth=_depth + 1)
        return out

    def _maybe_schedule_cache_save(self, data: Dict[str, Any]) -> None:
        if self._cache_store is None:
            return
        cache_store = self._cache_store
        now = self._utcnow()
        if self._last_cache_save_ts is not None:
            age = (now - self._last_cache_save_ts).total_seconds()
            if age < COORDINATOR_CACHE_SAVE_COOLDOWN_S:
                return

        self._last_cache_save_ts = now

        snapshot = {
            "saved_at": now.isoformat(),
            "data": self._prune_for_cache(data),
        }

        async def _save() -> None:
            try:
                await cache_store.async_save(snapshot)
            except Exception as err:
                _LOGGER.debug("Failed to save coordinator cache: %s", err)

        try:
            self.hass.async_create_task(_save())
        except Exception as err:
            _LOGGER.debug("Failed to schedule coordinator cache save: %s", err)

    def update_intervals(self, standard_interval: int, extended_interval: int) -> None:
        """Dynamicky aktualizuje intervaly coordinatoru."""
        # Uložíme původní hodnoty pro logování
        old_standard = (
            self.update_interval.total_seconds()
            if self.update_interval is not None
            else 0.0
        )
        old_extended = self.extended_interval

        self.standard_interval = standard_interval
        self.extended_interval = extended_interval

        # Aktualizujeme update_interval coordinatoru
        self.update_interval = timedelta(seconds=standard_interval)

        _LOGGER.info(
            f"Coordinator intervals updated: standard {old_standard}s→{standard_interval}s, "
            f"extended {old_extended}s→{extended_interval}s"
        )

        # Vynutíme okamžitou aktualizaci s novým intervalem
        self.hass.async_create_task(self.async_request_refresh())

    def _schedule_spot_price_update(self) -> None:
        """Naplánuje aktualizaci spotových cen."""
        now = dt_util.now()
        today_13 = now.replace(hour=13, minute=5, second=0, microsecond=0)

        # Pokud je už po 13:05 dnes, naplánujeme na zítra
        if now >= today_13:
            next_update = today_13 + timedelta(days=1)
        else:
            next_update = today_13

        _LOGGER.debug(f"Next spot price update scheduled for: {next_update}")

        # Naplánujeme callback
        async def spot_price_callback(now: datetime) -> None:
            await self._update_spot_prices()

        async_track_point_in_time(self.hass, spot_price_callback, next_update)

    def _schedule_hourly_fallback(self) -> None:
        """Naplánuje hodinové fallback stahování OTE dat."""

        # Spustit každou hodinu
        self.hass.loop.call_later(
            3600,  # 1 hodina
            lambda: self.hass.async_create_task(self._hourly_fallback_check()),
        )

    async def _hourly_fallback_check(self) -> None:
        """Hodinová kontrola a případné stahování OTE dat."""
        if not self.ote_api:
            return

        now = dt_util.now()

        needs_data = self._needs_spot_data(now)

        if needs_data:
            self._hourly_fallback_active = True
            try:
                _LOGGER.info(
                    "Hourly fallback: Attempting to fetch spot prices from OTE"
                )

                spot_data = await self._fetch_spot_prices_for_fallback(now)
                self._apply_spot_fallback_result(spot_data)

            except Exception as e:
                _LOGGER.warning(f"Hourly fallback: Failed to update spot prices: {e}")
            finally:
                self._hourly_fallback_active = False

        # Naplánuj další hodinovou kontrolu
        self._schedule_hourly_fallback()

    def _needs_spot_data(self, now: datetime) -> bool:
        if hasattr(self, "data") and self.data and "spot_prices" in self.data:
            spot_data = self.data["spot_prices"]
            return self._is_spot_data_missing(now, spot_data)

        _LOGGER.debug("No spot price data available, triggering fallback")
        return True

    def _is_spot_data_missing(self, now: datetime, spot_data: Dict[str, Any]) -> bool:
        if now.hour < 13:
            today_key = f"{now.strftime('%Y-%m-%d')}T{now.hour:02d}:00:00"
            if today_key not in spot_data.get("prices_czk_kwh", {}):
                _LOGGER.debug(
                    "Missing today's data for hour %s, triggering fallback", now.hour
                )
                return True
        else:
            tomorrow = now + timedelta(days=1)
            tomorrow_key = f"{tomorrow.strftime('%Y-%m-%d')}T00:00:00"
            if tomorrow_key not in spot_data.get("prices_czk_kwh", {}):
                _LOGGER.debug(
                    "Missing tomorrow's data after 13:00, triggering fallback"
                )
                return True
        return False

    async def _fetch_spot_prices_for_fallback(self, now: datetime) -> Optional[Dict[str, Any]]:
        ote_api = self.ote_api
        if ote_api is None:
            return None
        if now.hour < 13:
            _LOGGER.debug("Before 13:00 - fetching today's data only")
        else:
            _LOGGER.debug("After 13:00 - fetching today + tomorrow data")
        return await ote_api.get_spot_prices()

    def _apply_spot_fallback_result(self, spot_data: Optional[Dict[str, Any]]) -> None:
        if spot_data and spot_data.get("prices_czk_kwh"):
            self._spot_prices_cache = spot_data
            if hasattr(self, "data") and self.data:
                self.data["spot_prices"] = spot_data
                self.async_update_listeners()

            _LOGGER.info(
                "Hourly fallback: Successfully updated spot prices: %s hours",
                spot_data.get("hours_count", 0),
            )
            self._last_spot_fetch = dt_util.now()
            self._hourly_fallback_active = False
        else:
            _LOGGER.warning("Hourly fallback: No valid spot price data received")

    async def _update_spot_prices(self) -> None:
        """Aktualizace spotových cen s lepším error handling."""
        if not self.ote_api:
            return

        try:
            _LOGGER.info(
                "Attempting to update spot prices from OTE (scheduled 13:05 update)"
            )
            spot_data = await self.ote_api.get_spot_prices()

            if spot_data and spot_data.get("prices_czk_kwh"):
                _LOGGER.info(
                    f"Successfully updated spot prices: {spot_data.get('hours_count', 0)} hours"
                )
                self._spot_prices_cache = spot_data
                self._last_spot_fetch = dt_util.now()
                self._spot_retry_count = 0
                self._hourly_fallback_active = (
                    False  # NOVÉ: vypnout fallback po úspěšném stažení
                )

                # Uložíme data do coordinator dat
                if hasattr(self, "data") and self.data:
                    self.data["spot_prices"] = spot_data
                    self.async_update_listeners()

                # Naplánujeme další aktualizaci na zítra ve 13:05
                self._schedule_spot_price_update()

            else:
                _LOGGER.warning("No valid spot price data received from OTE API")
                self._handle_spot_retry()

        except Exception as e:
            _LOGGER.warning(f"Failed to update spot prices: {e}")
            self._handle_spot_retry()

    def _handle_spot_retry(self) -> None:
        """Handle spot price retry logic - pouze pro scheduled updates."""
        self._spot_retry_count += 1

        # Omezit retry pouze na důležité časy (kolem 13:05)
        now = dt_util.now()
        is_important_time = 12 <= now.hour <= 15  # Retry pouze 12-15h

        if self._spot_retry_count < 3 and is_important_time:  # Snížit max retries
            # Zkusíme znovu za 30 minut místo 15
            _LOGGER.info(
                f"Retrying spot price update in 30 minutes (attempt {self._spot_retry_count + 1}/3)"
            )

            async def retry_callback() -> None:
                await asyncio.sleep(30 * 60)  # 30 minutes
                await self._update_spot_prices()

            if self._spot_retry_task and not self._spot_retry_task.done():
                self._spot_retry_task.cancel()
            self._spot_retry_task = asyncio.create_task(retry_callback())
        else:
            if not is_important_time:
                _LOGGER.info(
                    "OTE API error outside important hours (12-15h), skipping retries until tomorrow"
                )
            else:
                _LOGGER.error(
                    "Failed to update spot prices after 3 attempts, giving up until tomorrow"
                )

            self._spot_retry_count = 0
            if self._spot_retry_task and not self._spot_retry_task.done():
                self._spot_retry_task.cancel()
                self._spot_retry_task = None
            # Naplánujeme další pokus na zítra
            self._schedule_spot_price_update()

    def _calculate_jitter(self) -> float:
        """Return jitter in seconds and store it for diagnostics."""
        jitter = random.uniform(-JITTER_SECONDS, JITTER_SECONDS)
        self._next_jitter = jitter
        return jitter

    async def _async_update_data(self) -> Dict[str, Any]:  # noqa: C901
        """Aktualizace základních dat."""
        _LOGGER.debug("🔄 _async_update_data called - starting update cycle")

        # Apply jitter - random delay at start of update
        if self._skip_next_jitter:
            self._skip_next_jitter = False
            self._next_jitter = 0.0
            jitter = 0.0
        else:
            jitter = self._calculate_jitter()

        # Only sleep for positive jitter (negative means update sooner, handled by next cycle)
        if jitter > 0:
            _LOGGER.debug(f"⏱️  Applying jitter: +{jitter:.1f}s delay before update")
            await asyncio.sleep(jitter)
        else:
            _LOGGER.debug(f"⏱️  Jitter: {jitter:.1f}s (no delay, update now)")

        try:
            use_cloud = self._resolve_use_cloud()
            stats = await self._get_stats_for_mode(use_cloud)

            cloud_notifications_enabled = bool(
                self.config_entry
                and self.config_entry.options.get("enable_cloud_notifications", True)
            )
            self._configure_notification_manager(use_cloud, cloud_notifications_enabled)

            extended_enabled = self._resolve_extended_enabled()
            if self._is_startup_grace_active(stats):
                return self._build_startup_result(stats)

            await self._maybe_update_extended_data(
                use_cloud=use_cloud,
                extended_enabled=extended_enabled,
                cloud_notifications_enabled=cloud_notifications_enabled,
            )

            self._maybe_update_battery_forecast()
            await self._maybe_include_spot_prices(stats)

            # Sloučíme standardní a extended data
            result = stats.copy() if stats else {}
            result.update(self.extended_data)

            # Přidáme battery forecast data pokud jsou k dispozici
            if self.battery_forecast_data:
                result["battery_forecast"] = self.battery_forecast_data
                _LOGGER.debug("🔋 Including battery forecast data in coordinator data")

            # Persist last-known payload for retain-like startup behavior.
            if isinstance(result, dict) and result:
                self._maybe_schedule_cache_save(result)

            return result

        except Exception as exception:
            _LOGGER.error(f"Error updating data: {exception}")
            raise UpdateFailed(
                f"Error communicating with OIG API: {exception}"
            ) from exception

    def _resolve_use_cloud(self) -> bool:
        use_cloud = True
        try:
            if self.config_entry:
                state = get_data_source_state(self.hass, self.config_entry.entry_id)
                _LOGGER.debug(
                    "Data source state: configured=%s effective=%s local_ok=%s reason=%s",
                    state.configured_mode,
                    state.effective_mode,
                    state.local_available,
                    state.reason,
                )
                use_cloud = state.effective_mode == DATA_SOURCE_CLOUD_ONLY
        except Exception:
            use_cloud = True
        return use_cloud

    async def _get_stats_for_mode(self, use_cloud: bool) -> Dict[str, Any]:
        if use_cloud:
            return await self._try_get_stats() or {}

        telemetry_store = getattr(self, "telemetry_store", None)
        if telemetry_store is not None:
            try:
                snap = telemetry_store.get_snapshot()
                stats = snap.payload
            except Exception:
                stats = self.data or {}
        else:
            stats = self.data or {}

        try:
            if isinstance(stats, dict):
                await self._maybe_fill_config_nodes_from_cloud(stats)
        except Exception as err:
            _LOGGER.debug("Failed to fill config nodes from cloud: %s", err)

        return stats

    def _configure_notification_manager(
        self, use_cloud: bool, cloud_notifications_enabled: bool
    ) -> None:
        if use_cloud and cloud_notifications_enabled:
            if (
                not hasattr(self, "notification_manager")
                or self.notification_manager is None
            ):
                _LOGGER.debug("Initializing notification manager")
                try:
                    from .oig_cloud_notification import OigNotificationManager

                    self.notification_manager = OigNotificationManager(
                        self.hass, self.api, "https://portal.oigpower.cz"
                    )
                    _LOGGER.debug("Notification manager initialized with API session")
                except Exception as e:
                    _LOGGER.error(f"Failed to initialize notification manager: {e}")
                    self.notification_manager = None
        else:
            self.notification_manager = None

        _LOGGER.debug(
            "Notification manager status: %s", hasattr(self, "notification_manager")
        )
        if hasattr(self, "notification_manager"):
            _LOGGER.debug("Notification manager value: %s", self.notification_manager)
            _LOGGER.debug(
                "Notification manager is None: %s", self.notification_manager is None
            )
            if self.notification_manager is not None:
                _LOGGER.debug(
                    "Notification manager ready: device_id=%s",
                    getattr(self.notification_manager, "_device_id", None),
                )
        else:
            _LOGGER.debug("Coordinator does not have notification_manager attribute")

    def _resolve_extended_enabled(self) -> bool:
        config_entry = self.config_entry
        if config_entry:
            extended_enabled = config_entry.options.get("enable_extended_sensors", False)
            _LOGGER.debug("Config entry found: True")
            try:
                _LOGGER.debug(
                    "Config entry option keys: %s",
                    sorted(getattr(config_entry, "options", {}).keys()),
                )
            except Exception:
                _LOGGER.debug("Config entry option keys: <unavailable>")
            _LOGGER.debug("Extended sensors enabled from options: %s", extended_enabled)
            return extended_enabled

        _LOGGER.warning("No config entry available for this coordinator")
        return False

    def _is_startup_grace_active(self, stats: Dict[str, Any]) -> bool:
        elapsed = (self._utcnow() - self._startup_ts).total_seconds()
        if elapsed >= self._startup_grace_seconds:
            return False
        remaining = self._startup_grace_seconds - int(elapsed)
        _LOGGER.debug(
            "Startup grace active (%ss left) – skipping extended stats, spot fetch, and forecast",
            remaining,
        )
        return True

    def _build_startup_result(self, stats: Dict[str, Any]) -> Dict[str, Any]:
        result = stats.copy() if stats else {}
        if self._spot_prices_cache:
            result["spot_prices"] = self._spot_prices_cache
            _LOGGER.debug("Including cached spot prices during startup grace")
        return result

    async def _maybe_update_extended_data(
        self,
        *,
        use_cloud: bool,
        extended_enabled: bool,
        cloud_notifications_enabled: bool,
    ) -> None:
        should_update_extended = self._should_update_extended()
        _LOGGER.debug("Should update extended: %s", should_update_extended)
        _LOGGER.debug("Last extended update: %s", self._last_extended_update)
        _LOGGER.debug("Extended interval: %ss", self.extended_interval)

        if use_cloud and extended_enabled and should_update_extended:
            await self._refresh_extended_stats(cloud_notifications_enabled)
            return

        if not extended_enabled:
            _LOGGER.debug("Extended sensors disabled in configuration")
            await self._maybe_refresh_notifications_standalone(
                cloud_notifications_enabled
            )

    async def _refresh_extended_stats(self, cloud_notifications_enabled: bool) -> None:
        _LOGGER.info("Fetching extended stats (FVE, LOAD, BATT, GRID)")
        try:
            today_from, today_to = self._today_range()
            _LOGGER.debug("Date range for extended stats: %s to %s", today_from, today_to)

            extended_batt = await self.api.get_extended_stats(
                "batt", today_from, today_to
            )
            extended_fve = await self.api.get_extended_stats(
                "fve", today_from, today_to
            )
            extended_grid = await self.api.get_extended_stats(
                "grid", today_from, today_to
            )
            extended_load = await self.api.get_extended_stats(
                "load", today_from, today_to
            )

            self.extended_data = {
                "extended_batt": extended_batt,
                "extended_fve": extended_fve,
                "extended_grid": extended_grid,
                "extended_load": extended_load,
            }
            self._last_extended_update = dt_util.now()
            _LOGGER.debug("Extended stats updated successfully")

            await self._maybe_refresh_notifications_with_extended(
                cloud_notifications_enabled
            )

        except Exception as e:
            _LOGGER.warning(f"Failed to fetch extended stats: {e}")
            self.extended_data = {}

    async def _maybe_refresh_notifications_with_extended(
        self, cloud_notifications_enabled: bool
    ) -> None:
        if not cloud_notifications_enabled:
            return
        if not (
            hasattr(self, "notification_manager")
            and self.notification_manager
            and hasattr(self.notification_manager, "_device_id")
            and self.notification_manager._device_id is not None
        ):
            _LOGGER.debug(
                "Notification manager not ready for extended data refresh - device_id not set yet"
            )
            return
        try:
            _LOGGER.debug("Refreshing notification data with extended stats")
            await self.notification_manager.update_from_api()
            _LOGGER.debug("Notification data updated successfully")
        except Exception as e:
            _LOGGER.debug(f"Notification data fetch failed: {e}")

    async def _maybe_refresh_notifications_standalone(
        self, cloud_notifications_enabled: bool
    ) -> None:
        if not cloud_notifications_enabled:
            return
        if not (
            hasattr(self, "notification_manager")
            and self.notification_manager
            and hasattr(self.notification_manager, "_device_id")
            and self.notification_manager._device_id is not None
        ):
            _LOGGER.debug(
                "Notification manager not available for standalone refresh - device_id not set yet"
            )
            return

        if not hasattr(self, "_last_notification_update"):
            self._last_notification_update = None

        now = dt_util.now()
        if self._last_notification_update is None:
            should_refresh_notifications = True
        else:
            time_since_notification = (
                now - self._last_notification_update
            ).total_seconds()
            should_refresh_notifications = time_since_notification >= 300

        if not should_refresh_notifications:
            return
        try:
            _LOGGER.debug("Refreshing notification data (standalone)")
            await self.notification_manager.update_from_api()
            self._last_notification_update = now
            _LOGGER.debug("Standalone notification data updated successfully")
        except Exception as e:
            _LOGGER.debug(f"Standalone notification data fetch failed: {e}")

    def _compute_battery_forecast_inputs_hash(self) -> int:
        """Hash relevantnich vstupních entit pro battery forecast (change detection)."""
        import hashlib
        data_str = ""

        if self.data and isinstance(self.data, dict):
            data_str += str(sorted(self.data.get("box_id", "")))

        if self._spot_prices_cache:
            data_str += str(self._spot_prices_cache.get("hours_count", 0))

        return int(hashlib.md5(data_str.encode()).hexdigest()[:8], 16)

    def _maybe_update_battery_forecast(self) -> None:
        """Throttled battery forecast computation (low-power: 30 min)."""
        if not (
            self.config_entry
            and self.config_entry.options.get("enable_battery_prediction", False)
        ):
            return

        if not self._battery_forecast_task or self._battery_forecast_task.done():
            self._battery_forecast_task = self.hass.async_create_task(
                self._update_battery_forecast()
            )
        else:
            _LOGGER.debug("Battery forecast task already running, skipping")

    async def _maybe_include_spot_prices(self, stats: Dict[str, Any]) -> None:
        if self._spot_prices_cache:
            stats["spot_prices"] = self._spot_prices_cache
            _LOGGER.debug("Including cached spot prices in coordinator data")
            return
        if self.ote_api and not hasattr(self, "_initial_spot_attempted"):
            self._initial_spot_attempted = True
            try:
                _LOGGER.debug("Attempting initial spot price fetch")
                spot_data = await self.ote_api.get_spot_prices()
                if spot_data and spot_data.get("hours_count", 0) > 0:
                    stats["spot_prices"] = spot_data
                    self._spot_prices_cache = spot_data
                    _LOGGER.info("Initial spot price data loaded successfully")
                else:
                    _LOGGER.warning("Initial spot price fetch returned empty data")
            except Exception as e:
                _LOGGER.warning(f"Initial spot price fetch failed: {e}")

    async def _try_get_stats(self) -> Optional[Dict[str, Any]]:
        """Wrapper na načítání standardních statistik s ošetřením chyb."""
        try:
            return await self.api.get_stats()
        except Exception as e:
            _LOGGER.error(f"Error fetching standard stats: {e}", exc_info=True)
            raise e

    async def _maybe_fill_config_nodes_from_cloud(self, stats: Dict[str, Any]) -> None:
        """In local effective mode, backfill missing configuration nodes from cloud (throttled)."""
        now = self._utcnow()
        if _should_skip_cloud_fill(now, getattr(self, "_last_cloud_config_fill_ts", None)):
            return

        box_id = _resolve_box_id(self.config_entry, stats)
        if not box_id:
            return

        box = _get_box_stats(stats, box_id)
        if box is None:
            return

        missing_nodes = _get_missing_config_nodes(box)
        if not missing_nodes:
            return

        cloud_box = await _fetch_cloud_box(self.api, box_id)
        if cloud_box is None:
            return

        if _backfill_missing_nodes(box, cloud_box, missing_nodes):
            self._last_cloud_config_fill_ts = now
            _LOGGER.info(
                "Local mode: backfilled config nodes from cloud: %s",
                ",".join(missing_nodes),
            )

    def _today_range(self) -> Tuple[str, str]:
        """Vrátí dnešní datum jako string tuple pro API."""
        today = dt_util.now().date()
        today_str = today.strftime("%Y-%m-%d")
        return today_str, today_str

    def _should_update_extended(self) -> bool:
        """Určí, zda je čas aktualizovat extended data."""
        if self._last_extended_update is None:
            return True
        # OPRAVA: Používat lokální čas místo UTC pro konzistenci
        now = dt_util.now()
        # Pokud _last_extended_update je v UTC, převést na lokální čas
        if self._last_extended_update.tzinfo is not None:
            # Převést UTC na lokální čas
            last_update_local = self._last_extended_update.astimezone(now.tzinfo)
            delta = now - last_update_local
        else:
            # Předpokládat že je už v lokálním čase
            delta = now - self._last_extended_update

        time_diff = delta.total_seconds()
        _LOGGER.debug(
            f"Extended time check: now={now.strftime('%H:%M:%S')}, last_update={self._last_extended_update.strftime('%H:%M:%S')}, diff={time_diff:.1f}s, interval={self.extended_interval}s"
        )

        return time_diff > self.extended_interval

    async def _update_battery_forecast(self) -> None:
        """Aktualizuje battery forecast s throttlingem (low-power: 30 min)."""
        # Throttling check (low-power default: 30 min)
        now = datetime.now()
        if (
            self._battery_forecast_last_update
            and (now - self._battery_forecast_last_update).total_seconds() < 1800
        ):
            _LOGGER.debug("Battery forecast throttled (skip, last update < 30m ago)")
            return

        # Check if inputs changed (hash)
        inputs_hash = self._compute_battery_forecast_inputs_hash()
        if (
            self._battery_forecast_last_inputs_hash
            and self._battery_forecast_last_inputs_hash == inputs_hash
        ):
            _LOGGER.debug("Battery forecast inputs unchanged, skipping")
            return

        try:
            _LOGGER.debug("🔋 Starting battery forecast calculation in coordinator")

            # KRITICKÁ KONTROLA: Coordinator MUSÍ mít data před vytvořením battery forecast sensoru
            if not self.data or not isinstance(self.data, dict) or not self.data:
                _LOGGER.debug(
                    "🔋 Coordinator has no data yet, skipping battery forecast calculation"
                )
                return

            # Získat inverter_sn deterministicky (config entry → numerické klíče v self.data)
            inverter_sn = self._resolve_forecast_box_id()
            if not inverter_sn:
                _LOGGER.debug(
                    "🔋 No numeric inverter_sn available, skipping forecast update"
                )
                return

            _LOGGER.debug("🔍 Inverter SN resolved for forecast: %s", inverter_sn)

            temp_sensor = self._create_forecast_sensor(inverter_sn)
            _LOGGER.debug(
                f"🔍 Temp sensor created, _hass set: {temp_sensor._hass is not None}"
            )

            # Spustíme výpočet - nová metoda async_update()
            await temp_sensor.async_update()

            forecast_payload = self._build_forecast_payload(temp_sensor)
            if forecast_payload is None:
                self.battery_forecast_data = None
                _LOGGER.warning("🔋 Battery forecast returned no timeline data")
                return

            self.battery_forecast_data = forecast_payload
            self._battery_forecast_last_update = now
            self._battery_forecast_last_inputs_hash = inputs_hash
            _LOGGER.debug(
                "🔋 Battery forecast data updated in coordinator: %s points",
                len(temp_sensor._timeline_data or []),
            )

        except Exception as e:
            _LOGGER.error(
                f"🔋 Failed to update battery forecast in coordinator: {e}",
                exc_info=True,
            )
            self.battery_forecast_data = None

    async def async_shutdown(self) -> None:
        if self._spot_retry_task and not self._spot_retry_task.done():
            self._spot_retry_task.cancel()
            try:
                await self._spot_retry_task
            except asyncio.CancelledError:
                raise
        self._spot_retry_task = None

        if self._battery_forecast_task and not self._battery_forecast_task.done():
            self._battery_forecast_task.cancel()
            try:
                await self._battery_forecast_task
            except asyncio.CancelledError:
                raise
        self._battery_forecast_task = None

    def _resolve_forecast_box_id(self) -> Optional[str]:
        inverter_sn: Optional[str] = None
        try:
            if self.config_entry:
                opt_box = self.config_entry.options.get("box_id")
                if isinstance(opt_box, str) and opt_box.isdigit():
                    inverter_sn = opt_box
        except Exception:
            inverter_sn = None

        if inverter_sn is None and isinstance(self.data, dict) and self.data:
            inverter_sn = next(
                (str(k) for k in self.data.keys() if str(k).isdigit()),
                None,
            )

        return inverter_sn

    def _build_forecast_device_info(self, inverter_sn: str) -> Dict[str, Any]:
        from ..const import DOMAIN

        return {
            "identifiers": {(DOMAIN, f"{inverter_sn}_analytics")},
            "name": "Analytics & Predictions",
            "manufacturer": "ČEZ",
            "model": "Battery Box Analytics Module",
            "sw_version": "1.0.0",
        }

    def _create_forecast_sensor(self, inverter_sn: str) -> Any:
        from ..battery_forecast.sensors.ha_sensor import OigCloudBatteryForecastSensor
        if self.config_entry is None:
            raise RuntimeError("config_entry is required for forecast sensor creation")

        device_info = self._build_forecast_device_info(inverter_sn)
        _LOGGER.debug(
            "🔍 Creating temp sensor with config_entry: %s",
            self.config_entry is not None,
        )
        return OigCloudBatteryForecastSensor(
            self,
            "battery_forecast",
            self.config_entry,
            device_info,
            self.hass,
            side_effects_enabled=False,
        )

    def _build_forecast_payload(self, sensor: Any) -> Optional[Dict[str, Any]]:
        if not sensor._timeline_data:
            return None
        return {
            "timeline_data": sensor._timeline_data,
            "calculation_time": (
                sensor._last_update.isoformat() if sensor._last_update else None
            ),
            "data_source": "simplified_calculation",
            "current_battery_kwh": (
                sensor._timeline_data[0].get("battery_capacity_kwh", 0)
                if sensor._timeline_data
                else 0
            ),
            "mode_recommendations": sensor._mode_recommendations or [],
        }

    def _create_simple_battery_forecast(self) -> Dict[str, Any]:
        """Vytvoří jednoduchá forecast data když senzor není dostupný."""
        current_time = dt_util.now()

        # Základní data z koordinátoru
        if self.data:
            device_id = next(
                (str(k) for k in self.data.keys() if str(k).isdigit()), None
            )
            device_data = self.data.get(device_id, {}) if device_id else {}
            battery_level = device_data.get("batt_bat_c", 0)
        else:
            battery_level = 0

        return {
            "calculation_time": current_time.isoformat(),
            "current_battery_level": battery_level,
            "forecast_available": False,
            "simple_forecast": True,
        }


def _should_skip_cloud_fill(now: datetime, last: Optional[datetime]) -> bool:
    if isinstance(last, datetime) and (now - last).total_seconds() < 900:
        return True
    return False


def _resolve_box_id(entry: Optional[ConfigEntry], stats: Dict[str, Any]) -> Optional[str]:
    box_id = _box_id_from_entry(entry)
    if box_id:
        return box_id
    try:
        return next((str(k) for k in stats.keys() if str(k).isdigit()), None)
    except Exception:
        return None


def _box_id_from_entry(entry: Optional[ConfigEntry]) -> Optional[str]:
    if not entry:
        return None
    opt = getattr(entry, "options", {}) or {}
    for key in ("box_id", "inverter_sn"):
        try:
            val = opt.get(key)
        except Exception:
            continue
        if isinstance(val, str) and val.isdigit():
            return val
    return None


def _get_box_stats(stats: Dict[str, Any], box_id: str) -> Optional[Dict[str, Any]]:
    box = stats.get(box_id)
    if isinstance(box, dict):
        return box
    return None


def _get_missing_config_nodes(box: Dict[str, Any]) -> List[str]:
    config_nodes = (
        "box_prms",
        "batt_prms",
        "invertor_prm1",
        "invertor_prms",
        "boiler_prms",
    )
    return [
        node_id
        for node_id in config_nodes
        if not isinstance(box.get(node_id), dict) or not box.get(node_id)
    ]


async def _fetch_cloud_box(api: Any, box_id: str) -> Optional[Dict[str, Any]]:
    try:
        cloud = await api.get_stats()
    except Exception as err:
        _LOGGER.debug("Local mode: config backfill cloud fetch failed: %s", err)
        return None
    if not isinstance(cloud, dict):
        return None
    cloud_box = cloud.get(box_id)
    if isinstance(cloud_box, dict):
        return cloud_box
    return None


def _backfill_missing_nodes(
    box: Dict[str, Any],
    cloud_box: Dict[str, Any],
    missing_nodes: List[str],
) -> bool:
    did = False
    for node_id in missing_nodes:
        node = cloud_box.get(node_id)
        if isinstance(node, dict) and node:
            box[node_id] = node
            did = True
    return did
