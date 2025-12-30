"""Zjednodušený senzor pro predikci nabití baterie v průběhu dne."""

import asyncio
import copy
import hashlib
import json
import logging
import math
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable, ClassVar, Dict, List, Optional, Tuple, Union

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from ..api.ote_api import OteApi
from .config import HybridConfig, SimulatorConfig
from .input import (
    get_load_avg_for_timestamp,
    get_solar_for_timestamp,
)
from .adaptive_consumption import AdaptiveConsumptionHelper
from . import auto_switch as auto_switch_module
from . import charging_plan as charging_plan_module
from . import detail_tabs as detail_tabs_module
from . import history as history_module
from . import mode_guard as mode_guard_module
from . import mode_recommendations as mode_recommendations_module
from . import precompute as precompute_module
from . import unified_cost_tile as unified_cost_tile_module
from .strategy import BalancingPlan as StrategyBalancingPlan
from .strategy import HybridStrategy
from .timeline.planner import (
    add_decision_reasons_to_timeline,
    attach_planner_reasons,
    build_planner_timeline,
)
from .timeline import extended as timeline_extended_module
from .utils_common import (
    get_tariff_for_datetime,
    parse_timeline_timestamp,
    safe_nested_get,
)
from ..const import (  # PHASE 3: Import DOMAIN for BalancingManager access
    DOMAIN,
    OTE_SPOT_PRICE_CACHE_FILE,
)
from ..physics import simulate_interval

_LOGGER = logging.getLogger(__name__)

AUTO_SWITCH_STARTUP_DELAY = timedelta(seconds=0)



# CBB 3F Home Plus Premium - Mode Constants (Phase 2)
# Mode definitions from sensor.oig_{box_id}_box_prms_mode
CBB_MODE_HOME_I = 0  # Grid priority (cheap mode)
CBB_MODE_HOME_II = 1  # Battery priority
CBB_MODE_HOME_III = 2  # Solar priority (default)
CBB_MODE_HOME_UPS = 3  # UPS mode (AC charging enabled)
#
# Note: The box also supports "Home 5" and "Home 6". We do not simulate these
# modes; when they appear in history/current state, we map them to HOME I.

# Mode names for display
CBB_MODE_NAMES = {
    CBB_MODE_HOME_I: "HOME I",
    CBB_MODE_HOME_II: "HOME II",
    CBB_MODE_HOME_III: "HOME III",
    CBB_MODE_HOME_UPS: "HOME UPS",
}

# Mode transition costs (energy loss + time delay)
MODE_LABEL_HOME_I = "Home I"
MODE_LABEL_HOME_II = "Home II"
MODE_LABEL_HOME_III = "Home III"
MODE_LABEL_HOME_UPS = "Home UPS"

SERVICE_MODE_HOME_1 = "Home 1"
SERVICE_MODE_HOME_2 = "Home 2"
SERVICE_MODE_HOME_3 = "Home 3"
SERVICE_MODE_HOME_UPS = "Home UPS"
SERVICE_MODE_HOME_5 = "Home 5"
SERVICE_MODE_HOME_6 = "Home 6"

DATE_FMT = "%Y-%m-%d"
DATETIME_FMT = "%Y-%m-%dT%H:%M:%S"
ISO_TZ_OFFSET = "+00:00"

TRANSITION_COSTS = {
    (MODE_LABEL_HOME_I, MODE_LABEL_HOME_UPS): {
        "energy_loss_kwh": 0.05,  # Energy loss when switching to UPS
        "time_delay_intervals": 1,  # Delay in 15-min intervals
    },
    (MODE_LABEL_HOME_UPS, MODE_LABEL_HOME_I): {
        "energy_loss_kwh": 0.02,  # Energy loss when switching from UPS
        "time_delay_intervals": 0,
    },
    (MODE_LABEL_HOME_I, MODE_LABEL_HOME_II): {
        "energy_loss_kwh": 0.0,  # No loss between Home modes
        "time_delay_intervals": 0,
    },
    (MODE_LABEL_HOME_II, MODE_LABEL_HOME_I): {
        "energy_loss_kwh": 0.0,
        "time_delay_intervals": 0,
    },
}

# Minimum mode duration (in 15-min intervals)
MIN_MODE_DURATION = {
    MODE_LABEL_HOME_UPS: 2,  # UPS must run at least 30 minutes (2×15min)
    MODE_LABEL_HOME_I: 1,
    MODE_LABEL_HOME_II: 1,
}

# Stabilizační guard po změně režimu (v minutách)
MODE_GUARD_MINUTES = 60

CBB_MODE_SERVICE_MAP = {
    CBB_MODE_HOME_I: SERVICE_MODE_HOME_1,
    CBB_MODE_HOME_II: SERVICE_MODE_HOME_2,
    CBB_MODE_HOME_III: SERVICE_MODE_HOME_3,
    CBB_MODE_HOME_UPS: SERVICE_MODE_HOME_UPS,
}

# AC Charging - modes where charging is DISABLED (only solar DC/DC allowed)
AC_CHARGING_DISABLED_MODES = [CBB_MODE_HOME_I, CBB_MODE_HOME_II, CBB_MODE_HOME_III]

# NOTE: AC charging limit and efficiency are now read from:
# - Config: home_charge_rate (kW) - user configured max charging power
# - Sensor: sensor.oig_{box_id}_battery_efficiency (%) - real-time measured efficiency
#
# Example: home_charge_rate = 2.8 kW → 0.7 kWh per 15min interval
# Fallback efficiency if sensor unavailable: 88.2%

# Debug options - Phase 1.5: API Optimization
# Set to False for LEAN attributes (96% memory reduction)
DEBUG_EXPOSE_BASELINE_TIMELINE = False  # Expose baseline timeline in sensor attributes


class OigCloudBatteryForecastSensor(RestoreEntity, CoordinatorEntity, SensorEntity):
    """Zjednodušený senzor pro predikci nabití baterie."""

    # Shared log throttling across instances (dashboard/API can trigger multiple computations).
    _GLOBAL_LOG_LAST_TS: ClassVar[Dict[str, float]] = {}

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
        *,
        side_effects_enabled: bool = True,
    ) -> None:
        """Initialize the battery forecast sensor."""
        super().__init__(coordinator)

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._device_info = device_info

        # Nastavit hass - priorita: parametr > coordinator.hass
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)
        # Guard side effects (service calls, timers) for temp instances created by coordinator.
        self._side_effects_enabled: bool = bool(side_effects_enabled)

        # Stabilní box_id resolution (config entry → proxy → coordinator numeric keys)
        try:
            from ..oig_cloud_sensor import resolve_box_id

            self._box_id = resolve_box_id(coordinator)
        except Exception:
            self._box_id = "unknown"

        if self._box_id == "unknown":
            _LOGGER.warning(
                "Battery forecast sensor: unable to resolve box_id, using 'unknown' (sensor will be unstable)"
            )

        # Nastavit atributy senzoru - STEJNĚ jako OigCloudStatisticsSensor
        # Unique ID má formát oig_cloud_{boxId}_{sensor} pro konzistenci
        self._attr_unique_id = f"oig_cloud_{self._box_id}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:battery-charging-60"
        self._attr_native_unit_of_measurement = "kWh"
        self._attr_device_class = SensorDeviceClass.ENERGY_STORAGE
        # Represents current/forecasted battery capacity; not strictly increasing.
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_entity_category = None

        # Načíst název ze sensor types
        from ..sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or sensor_type

        # Timeline data cache
        # Throttling: forecast should be computed at most once per 15-minute interval.
        self._last_forecast_bucket: Optional[datetime] = None
        self._forecast_in_progress: bool = False
        self._profiles_dirty: bool = False
        self._plan_lock_until: Optional[datetime] = None
        self._plan_lock_modes: Dict[str, int] = {}
        self._timeline_data: List[Dict[str, Any]] = (
            []
        )  # ACTIVE timeline (with applied plan)
        self._baseline_timeline: List[Dict[str, Any]] = []  # CLEAN baseline (no plan)
        self._last_update: Optional[datetime] = None
        self._charging_metrics: Dict[str, Any] = {}
        self._adaptive_consumption_data: Dict[str, Any] = {}  # DEPRECATED
        self._consumption_summary: Dict[str, Any] = (
            {}
        )  # NOVÉ: pro dashboard (4 hodnoty)
        self._first_update: bool = True  # Flag pro první update (setup)
        self._auto_switch_handles: List[Any] = []
        self._last_auto_switch_request: Optional[Tuple[str, datetime]] = None
        self._auto_switch_ready_at: Optional[datetime] = (
            dt_util.now() + AUTO_SWITCH_STARTUP_DELAY
        )
        self._auto_switch_retry_unsub: Optional[Callable[[], None]] = None
        self._auto_switch_watchdog_unsub: Optional[Callable[[], None]] = None
        self._auto_switch_watchdog_interval: timedelta = timedelta(seconds=30)
        self._forecast_retry_unsub: Optional[Callable[[], None]] = None

        # Log throttling to prevent HA "logging too frequently" warnings
        self._log_last_ts = self._GLOBAL_LOG_LAST_TS

        # Planner result snapshot (legacy attribute schema name: mode_optimization)
        self._mode_optimization_result: Optional[Dict[str, Any]] = None

        # Phase 2.8: Mode recommendations (DNES + ZÍTRA) for API
        self._mode_recommendations: List[Dict[str, Any]] = []

        # Phase 2.9: Daily plans archive (včera, předevčírem, ...)
        self._daily_plans_archive: Dict[str, Dict[str, Any]] = {}  # {date: plan_state}

        # Phase 2.9: Current daily plan state (will be restored from HA storage)
        self._daily_plan_state: Optional[Dict[str, Any]] = None
        self._baseline_repair_attempts: set[str] = set()

        # Phase 1.5: Hash-based change detection
        self._data_hash: Optional[str] = (
            None  # MD5 hash of timeline_data for efficient change detection
        )

        # Unified charging planner - aktivní plán
        self._active_charging_plan: Optional[Dict[str, Any]] = None
        self._plan_status: str = "none"  # none | pending | active | completed
        self._balancing_plan_snapshot: Optional[Dict[str, Any]] = None

        # Phase 2.9: Hourly history update tracking
        self._last_history_update_hour: Optional[int] = None
        self._initial_history_update_done: bool = False

        # Phase 3.0: Storage Helper for persistent battery plans
        # Storage path: /var/lib/homeassistant/homeassistant/config/.storage/
        # File: oig_cloud.battery_plans_{box_id}
        # Version: 1 (structure compatible with future migrations)
        self._plans_store: Optional[Store] = None
        if self._hass:
            self._plans_store = Store(
                self._hass,
                version=1,
                key=f"oig_cloud.battery_plans_{self._box_id}",
            )
            _LOGGER.debug(
                f"✅ Initialized Storage Helper: oig_cloud.battery_plans_{self._box_id}"
            )
        else:
            _LOGGER.warning(
                "⚠️ Cannot initialize Storage Helper - hass not available yet. "
                "Will retry in async_added_to_hass()"
            )

        # Phase 3.5: Storage Helper for precomputed UI data (timeline_extended + unified_cost_tile)
        # File: oig_cloud.precomputed_data_{box_id}
        # Updated every 15 min by coordinator → instant API responses
        self._precomputed_store: Optional[Store] = None
        self._precompute_interval = timedelta(minutes=15)
        self._last_precompute_at: Optional[datetime] = None
        self._last_precompute_hash: Optional[str] = None
        self._precompute_task: Optional[asyncio.Task] = None
        if self._hass:
            self._precomputed_store = Store(
                self._hass,
                version=1,
                key=f"oig_cloud.precomputed_data_{self._box_id}",
            )
            _LOGGER.debug(
                f"✅ Initialized Precomputed Data Storage: oig_cloud.precomputed_data_{self._box_id}"
            )
        else:
            _LOGGER.debug(
                "⚠️ Precomputed storage will be initialized in async_added_to_hass()"
            )

    # Legacy attributes kept for backward compatibility (single planner only).
    # NOTE: Single planner only.

    def _log_rate_limited(
        self,
        key: str,
        level: str,
        message: str,
        *args: Any,
        cooldown_s: float = 300.0,
    ) -> None:
        """Log at most once per cooldown_s for a given key."""
        now_ts = time.time()
        last = self._log_last_ts.get(key, 0.0)
        if now_ts - last < cooldown_s:
            return
        self._log_last_ts[key] = now_ts
        logger = getattr(_LOGGER, level, None)
        if callable(logger):
            logger(message, *args)

    async def async_added_to_hass(self) -> None:  # noqa: C901
        """Při přidání do HA - restore persistent data."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # Phase 3.0: Retry Storage Helper initialization if failed in __init__
        if not self._plans_store and self._hass:
            self._plans_store = Store(
                self._hass,
                version=1,
                key=f"oig_cloud.battery_plans_{self._box_id}",
            )
            _LOGGER.info(
                f"✅ Retry: Initialized Storage Helper: oig_cloud.battery_plans_{self._box_id}"
            )

        # Phase 3.5: Retry Precomputed Data Storage initialization if failed in __init__
        if not self._precomputed_store and self._hass:
            self._precomputed_store = Store(
                self._hass,
                version=1,
                key=f"oig_cloud.precomputed_data_{self._box_id}",
            )
            _LOGGER.info(
                f"✅ Retry: Initialized Precomputed Data Storage: oig_cloud.precomputed_data_{self._box_id}"
            )

        if auto_switch_module.auto_mode_switch_enabled(self):
            auto_switch_module.start_auto_switch_watchdog(self)
            # Keep scheduled set_box_mode calls aligned with the currently loaded timeline.
            if self._side_effects_enabled:
                self._create_task_threadsafe(
                    auto_switch_module.update_auto_switch_schedule, self
                )

        # Restore last successful forecast output (so dashboard doesn't show 0 after restart)
        # Source of truth is the precomputed storage which also includes timeline snapshot.
        if self._precomputed_store:
            try:
                precomputed = await self._precomputed_store.async_load() or {}
                timeline = precomputed.get("timeline_hybrid")
                last_update = precomputed.get("last_update")
                if isinstance(timeline, list) and timeline:
                    self._timeline_data = timeline
                    # Keep a copy as hybrid timeline if other code references it.
                    setattr(self, "_hybrid_timeline", copy.deepcopy(timeline))
                    if isinstance(last_update, str) and last_update:
                        try:
                            self._last_update = dt_util.parse_datetime(
                                last_update
                            ) or dt_util.dt.datetime.fromisoformat(last_update)
                        except Exception:
                            self._last_update = dt_util.now()
                    self._data_hash = self._calculate_data_hash(self._timeline_data)
                    self.async_write_ha_state()
                    _LOGGER.debug(
                        "[BatteryForecast] Restored timeline from storage (%d points)",
                        len(self._timeline_data),
                    )
            except Exception as err:
                _LOGGER.debug(
                    "[BatteryForecast] Failed to restore precomputed data: %s", err
                )

        # Restore data z předchozí instance
        if last_state := await self.async_get_last_state():
            if last_state.attributes:
                # Restore active plan z attributes (pokud existoval)
                if "active_plan_data" in last_state.attributes:
                    try:
                        plan_json = last_state.attributes.get("active_plan_data")
                        if plan_json:
                            self._active_charging_plan = json.loads(plan_json)
                            self._plan_status = last_state.attributes.get(
                                "plan_status", "pending"
                            )
                            if self._active_charging_plan:
                                _LOGGER.info(
                                    f"✅ Restored charging plan: "
                                    f"requester={self._active_charging_plan.get('requester', 'unknown')}, "
                                    f"status={self._plan_status}"
                                )
                    except (json.decoder.JSONDecodeError, TypeError) as e:
                        _LOGGER.warning(f"Failed to restore charging plan: {e}")

        # PHASE 3.0: Storage Helper Integration
        # Storage plán se načítá on-demand v build_timeline_extended() (když API endpoint volá)
        # NEPOTŘEBUJEME načítat při startu - to jen zpomaluje startup
        _LOGGER.debug("Sensor initialized - storage plans will load on-demand via API")

        # PHASE 3.1: Load daily plans archive from storage (včera data pro Unified Cost Tile)
        if self._plans_store:
            try:
                storage_data = await self._plans_store.async_load() or {}
                if "daily_archive" in storage_data:
                    self._daily_plans_archive = storage_data["daily_archive"]
                    _LOGGER.info(
                        f"✅ Restored daily plans archive from storage: {len(self._daily_plans_archive)} days"
                    )
                else:
                    _LOGGER.info(
                        "No daily archive in storage - will backfill from history"
                    )
            except Exception as e:
                _LOGGER.warning(f"Failed to load daily plans archive from storage: {e}")

        # PHASE 3.1: Backfill missing days from storage detailed plans
        if self._plans_store and len(self._daily_plans_archive) < 3:
            try:
                _LOGGER.info("🔄 Backfilling daily plans archive from storage...")
                await self._backfill_daily_archive_from_storage()
            except Exception as e:
                _LOGGER.warning(f"Failed to backfill daily archive: {e}")

        # FALLBACK: Restore z attributes (starý způsob - bude deprecated)
        if last_state and last_state.attributes:
            # Restore daily plan state with actual intervals (Phase 2.9)
            if "daily_plan_state" in last_state.attributes:
                try:
                    daily_plan_json = last_state.attributes.get("daily_plan_state")
                    if daily_plan_json:
                        self._daily_plan_state = json.loads(daily_plan_json)
                        actual_count = len(self._daily_plan_state.get("actual", []))
                        _LOGGER.info(
                            f"✅ Restored daily plan state: "
                            f"date={self._daily_plan_state.get('date')}, "
                            f"actual={actual_count}"
                        )
                except (json.decoder.JSONDecodeError, TypeError) as e:
                    _LOGGER.warning(f"Failed to restore daily plan state: {e}")

        # PHASE 3.0: DISABLED - Historical data loading moved to on-demand (API only)
        # Old Phase 2.9 loaded history every 15 min - POMALÉ a ZBYTEČNÉ!
        # Nově: build_timeline_extended() načítá z Recorderu on-demand při API volání
        _LOGGER.debug("Historical data will load on-demand via API (not at startup)")

        # Import helper pro time tracking
        from homeassistant.helpers.event import async_track_time_change

        # ========================================================================
        # SCHEDULER: Forecast refresh každých 15 minut (asynchronní, neblokuje)
        # ========================================================================
        async def _forecast_refresh_job(now):
            """Run forecast refresh every 15 minutes (aligned with spot price intervals)."""
            _LOGGER.info(f"⏰ Forecast refresh triggered at {now.strftime('%H:%M')}")
            try:
                await self.async_update()
            except Exception as e:
                _LOGGER.error(f"Forecast refresh failed: {e}", exc_info=True)

        # Schedule every 15 minutes (at :00, :15, :30, :45)
        for minute in [0, 15, 30, 45]:
            async_track_time_change(
                self.hass,
                _forecast_refresh_job,
                minute=minute,
                second=30,  # 30s offset to ensure spot prices are updated
            )
        _LOGGER.info("✅ Scheduled forecast refresh every 15 minutes")

        # ========================================================================
        # LISTEN for AdaptiveLoadProfiles updates (dispatcher pattern)
        # ========================================================================
        from homeassistant.helpers.dispatcher import async_dispatcher_connect

        async def _on_profiles_updated():
            """Called when AdaptiveLoadProfiles completes update."""
            # Do not recompute immediately; keep forecast cadence at 1× / 15 minutes.
            # Mark inputs dirty and let the next scheduled 15-min tick pick it up.
            self._profiles_dirty = True
            self._log_rate_limited(
                "profiles_updated_deferred",
                "info",
                "📡 profiles_updated received - deferring forecast refresh to next 15-min tick",
                cooldown_s=300.0,
            )

        # Subscribe to profiles updates
        signal_name = f"oig_cloud_{self._box_id}_profiles_updated"
        _LOGGER.debug(f"📡 Subscribing to signal: {signal_name}")
        async_dispatcher_connect(self.hass, signal_name, _on_profiles_updated)

        # ========================================================================
        # INITIAL REFRESH: Wait for profiles, then calculate (non-blocking)
        # ========================================================================
        async def _delayed_initial_refresh():
            """Initial forecast calculation - wait for profiles (non-blocking)."""
            # Wait max 60s for first profiles update
            _LOGGER.info("⏳ Waiting for AdaptiveLoadProfiles to complete (max 60s)...")

            profiles_ready = False

            async def _mark_ready():
                nonlocal profiles_ready
                profiles_ready = True

            # Temporary listener for initial profiles
            temp_unsub = async_dispatcher_connect(
                self.hass, f"oig_cloud_{self._box_id}_profiles_updated", _mark_ready
            )

            try:
                # Wait max 60s for profiles
                for _ in range(60):
                    if profiles_ready:
                        _LOGGER.info("✅ Profiles ready - starting initial forecast")
                        break
                    await asyncio.sleep(1)
                else:
                    _LOGGER.info(
                        "Profiles not ready after 60s - starting forecast anyway"
                    )

                # Now run forecast
                await self.async_update()
                _LOGGER.info("✅ Initial forecast completed")

            except Exception as e:
                _LOGGER.error(f"Initial forecast failed: {e}", exc_info=True)
            finally:
                # Cleanup temporary listener
                temp_unsub()

        # Spustit jako background task (neblokuje async_added_to_hass)
        self.hass.async_create_task(_delayed_initial_refresh())

        # ========================================================================
        # SCHEDULER: Daily and weekly aggregations
        # ========================================================================
        # Daily aggregation at 00:05 (aggregate yesterday's data)
        async def _daily_aggregation_job(now):
            """Run daily aggregation at 00:05."""
            yesterday = (now.date() - timedelta(days=1)).strftime(DATE_FMT)
            _LOGGER.info(f"⏰ Daily aggregation job triggered for {yesterday}")
            await self._aggregate_daily(yesterday)

        async_track_time_change(
            self.hass,
            _daily_aggregation_job,
            hour=0,
            minute=5,
            second=0,
        )
        _LOGGER.debug("✅ Scheduled daily aggregation at 00:05")

        # Weekly aggregation every Sunday at 23:55
        async def _weekly_aggregation_job(now):
            """Run weekly aggregation on Sunday at 23:55."""
            # Only run on Sunday (weekday() == 6)
            if now.weekday() != 6:
                return

            # Calculate week info
            year, week_num, _ = now.isocalendar()
            week_str = f"{year}-W{week_num:02d}"

            # Week end is today (Sunday)
            end_date = now.date().strftime(DATE_FMT)
            # Week start is 6 days ago (Monday)
            start_date = (now.date() - timedelta(days=6)).strftime(DATE_FMT)

            _LOGGER.info(f"⏰ Weekly aggregation job triggered for {week_str}")
            await self._aggregate_weekly(week_str, start_date, end_date)

        async_track_time_change(
            self.hass,
            _weekly_aggregation_job,
            hour=23,
            minute=55,
            second=0,
        )
        _LOGGER.debug("✅ Scheduled weekly aggregation at Sunday 23:55")

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA."""
        auto_switch_module.cancel_auto_switch_schedule(self)
        auto_switch_module.stop_auto_switch_watchdog(self)
        await super().async_will_remove_from_hass()

    def _get_config(self) -> Dict[str, Any]:
        """Return config dict from config entry (options preferred, then data)."""
        if not self._config_entry:
            return {}
        options = getattr(self._config_entry, "options", None)
        if options:
            return options
        return self._config_entry.data or {}

    def _handle_coordinator_update(self) -> None:
        """Handle coordinator update.

        NEDĚLÁ ŽÁDNÉ VÝPOČTY - forecast se přepočítá:
        - Každých 15 min (time scheduler)
        - Při startu (delayed 3s initial refresh)
        - Manuálně přes service call
        """
        # Jen zavolat parent pro refresh HA state (rychlé)
        super()._handle_coordinator_update()

    @property
    def device_info(self) -> Optional[Dict[str, Any]]:
        """Return device info - Analytics Module."""
        return self._device_info

    @property
    def state(self) -> Optional[Union[float, str]]:
        """
        State = current battery capacity in kWh.

        Dashboard graph needs numeric value to display battery timeline.

        Returns:
            Current battery capacity (kWh) or 0 if no data
        """
        if self._timeline_data and len(self._timeline_data) > 0:
            # Try new format first (battery_soc from HYBRID)
            capacity = self._timeline_data[0].get("battery_soc")
            if capacity is None:
                # Fallback: old format (battery_capacity_kwh)
                capacity = self._timeline_data[0].get("battery_capacity_kwh", 0)
            return round(capacity, 2)
        return 0

    @property
    def available(self) -> bool:
        """Return if sensor is available.

        CRITICAL FIX: Override CoordinatorEntity.available to prevent 'unavailable' state.
        Sensor should always be available if it has run at least once (has timeline data).
        """
        # If we have timeline data from successful calculation, sensor is available
        if hasattr(self, "_timeline_data") and self._timeline_data:
            return True

        # Otherwise use coordinator availability
        return super().available

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """
        Dodatečné atributy - LEAN VERSION (Phase 1.5 API Optimization).

        PŘED: 280 KB (celá timeline v attributes)
        PO: ~2 KB (pouze summary, timeline přes API)

        Full data dostupná přes API:
        GET /api/oig_cloud/battery_forecast/{box_id}/timeline
        """
        # LEAN ATTRIBUTES: Pouze summary data pro dashboard
        attrs = {
            # Basic info
            "last_update": (
                self._last_update.isoformat() if self._last_update else None
            ),
            "data_source": "simplified_calculation",
            # Current state
            "current_battery_kwh": (
                round(
                    self._timeline_data[0].get(
                        "battery_soc",
                        self._timeline_data[0].get("battery_capacity_kwh", 0),
                    ),
                    2,
                )
                if self._timeline_data and len(self._timeline_data) > 0
                else 0
            ),
            "current_timestamp": (
                self._timeline_data[0].get(
                    "time", self._timeline_data[0].get("timestamp")
                )
                if self._timeline_data and len(self._timeline_data) > 0
                else None
            ),
            # Capacity limits
            "max_capacity_kwh": self._get_max_battery_capacity(),
            "min_capacity_kwh": self._get_min_battery_capacity(),
            # Timeline metadata
            "timeline_points_count": (
                len(self._timeline_data) if self._timeline_data else 0
            ),
            "timeline_horizon_hours": (
                round((len(self._timeline_data) * 15 / 60), 1)
                if self._timeline_data
                else 0
            ),
            # Phase 1.5: Hash-based change detection
            "data_hash": self._data_hash if self._data_hash else "unknown",
            # API endpoint hint
            "api_endpoint": f"/api/oig_cloud/battery_forecast/{self._box_id}/timeline",
            "api_query_params": "?type=active (default) | baseline | both",
            "api_note": "Full timeline data available via REST API (reduces memory by 96%)",
        }

        # Metriky nabíjení (malé, keep)
        if hasattr(self, "_charging_metrics") and self._charging_metrics:
            attrs.update(self._charging_metrics)

        # Consumption summary (4 hodnoty, keep)
        if hasattr(self, "_consumption_summary") and self._consumption_summary:
            attrs.update(self._consumption_summary)

        # Balancing cost (1 hodnota, keep)
        if hasattr(self, "_balancing_cost") and self._balancing_cost:
            attrs["balancing_cost"] = self._balancing_cost

        # PERSISTENCE: Active plan (kompaktní JSON, keep)
        plan_snapshot: Optional[Dict[str, Any]] = None
        if getattr(self, "_balancing_plan_snapshot", None):
            plan_snapshot = self._balancing_plan_snapshot
        elif hasattr(self, "_active_charging_plan") and self._active_charging_plan:
            plan_snapshot = self._active_charging_plan

        if plan_snapshot:
            attrs["active_plan_data"] = json.dumps(plan_snapshot)

        attrs["plan_status"] = getattr(self, "_plan_status", "none")

        # Phase 2.9: REMOVED daily_plan_state from attributes
        # Důvod: Ukládá se do JSON storage místo HA database (optimalizace)
        # Data dostupná přes timeline_extended API endpoint

        # Planner summary (legacy attribute schema: mode_optimization)
        if (
            hasattr(self, "_mode_optimization_result")
            and self._mode_optimization_result
        ):
            mo = self._mode_optimization_result
            attrs["mode_optimization"] = {
                # Phase 2.8: Use 48h cost for frontend tile (DNES+ZÍTRA only)
                "total_cost_czk": round(mo.get("total_cost_48h", 0), 2),
                "total_savings_vs_home_i_czk": round(mo.get("total_savings_48h", 0), 2),
                "total_cost_72h_czk": round(
                    mo.get("total_cost", 0), 2
                ),  # For reference
                "modes_distribution": {
                    "HOME_I": mo["optimal_modes"].count(0),
                    "HOME_II": mo["optimal_modes"].count(1),
                    "HOME_III": mo["optimal_modes"].count(2),
                    "HOME_UPS": mo["optimal_modes"].count(3),
                },
                # Backwards compatibility: lowercase keys for old dashboard
                "home_i_intervals": mo["optimal_modes"].count(0),
                "home_ii_intervals": mo["optimal_modes"].count(1),
                "home_iii_intervals": mo["optimal_modes"].count(2),
                "home_ups_intervals": mo["optimal_modes"].count(3),
                "timeline_length": len(mo.get("optimal_timeline", [])),
            }

            # Phase 2.10: 4-Baseline Comparison
            if mo.get("baselines"):
                attrs["mode_optimization"]["baselines"] = mo["baselines"]
                attrs["mode_optimization"]["best_baseline"] = mo.get("best_baseline")
                attrs["mode_optimization"]["hybrid_cost"] = round(
                    mo.get("hybrid_cost", 0), 2
                )
                attrs["mode_optimization"]["best_baseline_cost"] = round(
                    mo.get("best_baseline_cost", 0), 2
                )
                attrs["mode_optimization"]["savings_vs_best"] = round(
                    mo.get("savings_vs_best", 0), 2
                )
                attrs["mode_optimization"]["savings_percentage"] = round(
                    mo.get("savings_percentage", 0), 1
                )

            # Phase 2.6: What-if Analysis - Alternatives
            if mo.get("alternatives"):
                attrs["mode_optimization"]["alternatives"] = mo["alternatives"]

            # Phase 2.8: mode_recommendations moved to API endpoint
            # (no longer in attributes to reduce memory usage)

            # Phase 2.5: Boiler summary (if boiler was used in optimization)
            boiler_total = sum(
                interval.get("boiler_charge", 0)
                for interval in mo.get("optimal_timeline", [])
            )
            curtailed_total = sum(
                interval.get("curtailed_loss", 0)
                for interval in mo.get("optimal_timeline", [])
            )

            if boiler_total > 0.001 or curtailed_total > 0.001:
                attrs["boiler_summary"] = {
                    "total_energy_kwh": round(boiler_total, 2),
                    "intervals_used": sum(
                        1
                        for i in mo.get("optimal_timeline", [])
                        if i.get("boiler_charge", 0) > 0.001
                    ),
                    "avoided_export_loss_czk": round(curtailed_total, 2),
                }

        # Phase V2: Unified Cost Tile - MOVED TO API ENDPOINT
        # unified_cost_tile now built on-demand in REST API (async context)
        # Not in attributes to avoid blocking extra_state_attributes()

        # DEBUG MODE: Expose full timeline pouze pro development/testing
        # V produkci: False (timeline přes API)
        if DEBUG_EXPOSE_BASELINE_TIMELINE:
            _LOGGER.warning(
                "⚠️ DEBUG MODE: Full timeline in attributes (280 KB)! "
                "Set DEBUG_EXPOSE_BASELINE_TIMELINE=False for production."
            )
            attrs["timeline_data"] = self._timeline_data
            if hasattr(self, "_baseline_timeline"):
                attrs["baseline_timeline_data"] = self._baseline_timeline

        return attrs

    def _calculate_data_hash(self, timeline_data: List[Dict[str, Any]]) -> str:
        """
        Calculate MD5 hash of timeline data for efficient change detection.

        Phase 1.5: Hash-based change detection
        - Frontend watches sensor state (hash)
        - State change triggers WebSocket event
        - Frontend fetches new data from API
        - Avoids polling, reduces bandwidth

        Args:
            timeline_data: List of timeline points (active or baseline)

        Returns:
            MD5 hash string (32 chars hex)
        """
        if not timeline_data:
            return "empty"

        # Convert to deterministic JSON string
        data_str = json.dumps(timeline_data, sort_keys=True)

        # Calculate SHA-256 hash (secure for integrity checking)
        return hashlib.sha256(data_str.encode()).hexdigest()

    async def async_update(self) -> None:  # noqa: C901
        """Update sensor data."""
        await super().async_update()

        try:
            mark_bucket_done = False
            now_aware = dt_util.now()
            bucket_minute = (now_aware.minute // 15) * 15
            bucket_start = now_aware.replace(
                minute=bucket_minute, second=0, microsecond=0
            )

            previous_timeline = (
                copy.deepcopy(self._timeline_data)
                if getattr(self, "_timeline_data", None)
                else None
            )

            # Enforce single in-flight computation.
            if self._forecast_in_progress:
                self._log_rate_limited(
                    "forecast_in_progress",
                    "debug",
                    "Forecast computation already in progress - skipping",
                    cooldown_s=60.0,
                )
                return

            # Enforce cadence: at most once per 15-minute bucket.
            if self._last_forecast_bucket == bucket_start:
                return

            self._forecast_in_progress = True

            # Získat všechna potřebná data
            self._log_rate_limited(
                "forecast_update_tick",
                "debug",
                "Battery forecast async_update() tick",
                cooldown_s=300.0,
            )
            current_capacity = self._get_current_battery_capacity()
            max_capacity = self._get_max_battery_capacity()
            min_capacity = self._get_min_battery_capacity()

            if current_capacity is None or max_capacity is None or min_capacity is None:
                # During startup, sensors may not be ready yet. Retry shortly without spamming logs.
                self._log_rate_limited(
                    "forecast_missing_capacity",
                    "debug",
                    "Forecast prerequisites not ready (current=%s max=%s min=%s); retrying shortly",
                    current_capacity,
                    max_capacity,
                    min_capacity,
                    cooldown_s=120.0,
                )
                self._schedule_forecast_retry(10.0)
                return
            mark_bucket_done = True

            _LOGGER.debug(
                "Battery capacities: current=%.2f kWh, max=%.2f kWh, min=%.2f kWh",
                current_capacity,
                max_capacity,
                min_capacity,
            )

            self._log_rate_limited(
                "forecast_spot_fetch",
                "debug",
                "Calling _get_spot_price_timeline()",
                cooldown_s=600.0,
            )
            spot_prices = await self._get_spot_price_timeline()  # ASYNC!
            self._log_rate_limited(
                "forecast_spot_fetch_done",
                "debug",
                "_get_spot_price_timeline() returned %s prices",
                len(spot_prices),
                cooldown_s=600.0,
            )

            # CRITICAL FIX: Filter spot prices to start from current 15-minute interval
            # Round NOW down to nearest 15-minute interval (00, 15, 30, 45)
            current_interval_start = bucket_start
            # Convert to naive datetime for comparison (spot prices are timezone-naive strings)
            current_interval_naive = current_interval_start.replace(tzinfo=None)

            self._log_rate_limited(
                "forecast_spot_filter",
                "debug",
                "Filtering timeline from current interval: %s",
                current_interval_naive.isoformat(),
                cooldown_s=600.0,
            )

            spot_prices_filtered = [
                sp
                for sp in spot_prices
                if datetime.fromisoformat(sp["time"]) >= current_interval_naive
            ]
            if len(spot_prices_filtered) < len(spot_prices):
                self._log_rate_limited(
                    "forecast_spot_filtered",
                    "debug",
                    "Filtered spot prices: %s -> %s (removed %s past intervals)",
                    len(spot_prices),
                    len(spot_prices_filtered),
                    len(spot_prices) - len(spot_prices_filtered),
                    cooldown_s=600.0,
                )
            spot_prices = spot_prices_filtered

            # Phase 1.5: Load export prices for timeline integration
            self._log_rate_limited(
                "forecast_export_fetch",
                "debug",
                "Calling _get_export_price_timeline()",
                cooldown_s=600.0,
            )
            export_prices = await self._get_export_price_timeline()  # ASYNC!
            self._log_rate_limited(
                "forecast_export_fetch_done",
                "debug",
                "_get_export_price_timeline() returned %s prices",
                len(export_prices),
                cooldown_s=600.0,
            )

            # Filter export prices too
            export_prices = [
                ep
                for ep in export_prices
                if datetime.fromisoformat(ep["time"]) >= current_interval_naive
            ]

            solar_forecast = self._get_solar_forecast()
            load_avg_sensors = self._get_load_avg_sensors()

            # NOVÉ: Zkusit získat adaptivní profily
            adaptive_helper = AdaptiveConsumptionHelper(
                self.hass or self._hass,
                self._box_id,
                ISO_TZ_OFFSET,
            )
            adaptive_profiles = await adaptive_helper.get_adaptive_load_prediction()

            # NOVÉ: Získat balancing plán
            balancing_plan = self._get_balancing_plan()

            if not spot_prices:
                _LOGGER.warning(
                    "No spot prices available - forecast will use fallback prices"
                )
                # Continue anyway - forecast can run with fallback prices

            # ONE PLANNER: single planning pipeline.

            # PHASE 2.8 + REFACTORING: Get target from new getter
            target_capacity = self._get_target_battery_capacity()
            current_soc_percent = self._get_current_battery_soc_percent()

            if target_capacity is None:
                target_capacity = max_capacity
            if current_soc_percent is None and max_capacity > 0:
                current_soc_percent = (current_capacity / max_capacity) * 100.0

            self._log_rate_limited(
                "battery_state_summary",
                "debug",
                "Battery state: current=%.2f kWh (%.1f%%), total=%.2f kWh, min=%.2f kWh, target=%.2f kWh",
                current_capacity,
                float(current_soc_percent or 0.0),
                max_capacity,
                min_capacity,
                target_capacity,
                cooldown_s=600.0,
            )

            # Build load forecast list (kWh/15min for each interval)
            load_forecast = []
            today = dt_util.now().date()
            for sp in spot_prices:
                try:
                    timestamp = datetime.fromisoformat(sp["time"])
                    # Normalize timezone
                    if timestamp.tzinfo is None:
                        timestamp = dt_util.as_local(timestamp)

                    if adaptive_profiles:
                        # Use adaptive profiles (hourly → 15min)
                        if timestamp.date() == today:
                            profile = adaptive_profiles["today_profile"]
                        else:
                            profile = adaptive_profiles.get(
                                "tomorrow_profile", adaptive_profiles["today_profile"]
                            )

                        hour = timestamp.hour
                        start_hour = profile.get(
                            "start_hour", 0
                        )  # Default 0 for tomorrow

                        # Mapování absolutní hodiny na index v poli
                        # today_profile: start_hour=14 → hour=14 → index=0, hour=15 → index=1
                        # tomorrow_profile: start_hour=0 → hour=0 → index=0, hour=1 → index=1
                        index = hour - start_hour

                        if 0 <= index < len(profile["hourly_consumption"]):
                            hourly_kwh = profile["hourly_consumption"][index]
                        else:
                            # Mimo rozsah - použij průměr nebo fallback
                            self._log_rate_limited(
                                "adaptive_profile_oob",
                                "debug",
                                "Adaptive profile hour out of range: hour=%s start=%s len=%s (using avg)",
                                hour,
                                start_hour,
                                len(profile.get("hourly_consumption", []) or []),
                                cooldown_s=900.0,
                            )
                            hourly_kwh = profile.get("avg_kwh_h", 0.5)

                        load_kwh = hourly_kwh / 4.0
                    else:
                        # Fallback: load_avg sensors
                        load_kwh = get_load_avg_for_timestamp(
                            timestamp,
                            load_avg_sensors,
                            state=self,
                        )

                    load_forecast.append(load_kwh)
                except Exception as e:
                    _LOGGER.warning(f"Failed to get load for {sp.get('time')}: {e}")
                    load_forecast.append(0.125)  # 500W fallback

            if adaptive_profiles:
                recent_ratio = await adaptive_helper.calculate_recent_consumption_ratio(
                    adaptive_profiles
                )
                if recent_ratio and recent_ratio > 1.1:
                    adaptive_helper.apply_consumption_boost_to_forecast(
                        load_forecast, recent_ratio
                    )

            # PLANNER: build plan timeline with HybridStrategy.
            try:
                active_balancing_plan = None
                try:
                    entry_id = (
                        self._config_entry.entry_id if self._config_entry else None
                    )
                    if (
                        entry_id
                        and DOMAIN in self._hass.data
                        and entry_id in self._hass.data[DOMAIN]
                    ):
                        balancing_manager = self._hass.data[DOMAIN][entry_id].get(
                            "balancing_manager"
                        )
                        if balancing_manager:
                            active_balancing_plan = balancing_manager.get_active_plan()
                except Exception as err:
                    _LOGGER.debug("Could not load BalancingManager plan: %s", err)

                # Build solar list (kWh/15min) aligned to spot_prices
                solar_kwh_list: List[float] = []
                for sp in spot_prices:
                    try:
                        ts = datetime.fromisoformat(sp.get("time", ""))
                        if ts.tzinfo is None:
                            ts = dt_util.as_local(ts)
                        solar_kwh_list.append(
                            get_solar_for_timestamp(
                                ts,
                                solar_forecast,
                                log_rate_limited=self._log_rate_limited,
                            )
                        )
                    except Exception:
                        solar_kwh_list.append(0.0)

                # Hard-limit horizon to 36h (144×15min).
                max_intervals = 36 * 4
                if len(spot_prices) > max_intervals:
                    spot_prices = spot_prices[:max_intervals]
                    export_prices = export_prices[:max_intervals]
                    load_forecast = load_forecast[:max_intervals]
                    solar_kwh_list = solar_kwh_list[:max_intervals]

                balancing_plan = self._build_strategy_balancing_plan(
                    spot_prices, active_balancing_plan
                )

                opts = self._config_entry.options if self._config_entry else {}
                max_ups_price_czk = float(opts.get("max_ups_price_czk", 10.0))
                efficiency = float(self._get_battery_efficiency())
                home_charge_rate_kw = float(opts.get("home_charge_rate", 2.8))

                sim_config = SimulatorConfig(
                    max_capacity_kwh=max_capacity,
                    min_capacity_kwh=max_capacity * 0.20,
                    charge_rate_kw=home_charge_rate_kw,
                    dc_dc_efficiency=efficiency,
                    dc_ac_efficiency=efficiency,
                    ac_dc_efficiency=efficiency,
                )
                hybrid_config = HybridConfig(
                    planning_min_percent=float(opts.get("min_capacity_percent", 33.0)),
                    target_percent=float(opts.get("target_capacity_percent", 80.0)),
                    max_ups_price_czk=max_ups_price_czk,
                )

                export_price_values: List[float] = []
                for i in range(len(spot_prices)):
                    if i < len(export_prices):
                        export_price_values.append(
                            float(export_prices[i].get("price", 0.0) or 0.0)
                        )
                    else:
                        export_price_values.append(0.0)

                strategy = HybridStrategy(hybrid_config, sim_config)
                result = strategy.optimize(
                    initial_battery_kwh=current_capacity,
                    spot_prices=spot_prices,
                    solar_forecast=solar_kwh_list,
                    consumption_forecast=load_forecast,
                    balancing_plan=balancing_plan,
                    export_prices=export_price_values,
                )

                hw_min_kwh = max_capacity * 0.20
                planning_min_kwh = hybrid_config.planning_min_kwh(max_capacity)
                lock_until, lock_modes = mode_guard_module.build_plan_lock(
                    now=dt_util.now(),
                    spot_prices=spot_prices,
                    modes=result.modes,
                    mode_guard_minutes=MODE_GUARD_MINUTES,
                    plan_lock_until=self._plan_lock_until,
                    plan_lock_modes=self._plan_lock_modes,
                )
                self._plan_lock_until = lock_until
                self._plan_lock_modes = lock_modes
                guarded_modes, guard_overrides, guard_until = (
                    mode_guard_module.apply_mode_guard(
                        modes=result.modes,
                        spot_prices=spot_prices,
                        solar_kwh_list=solar_kwh_list,
                        load_forecast=load_forecast,
                        current_capacity=current_capacity,
                        max_capacity=max_capacity,
                        hw_min_capacity=hw_min_kwh,
                        efficiency=efficiency,
                        home_charge_rate_kw=home_charge_rate_kw,
                        planning_min_kwh=planning_min_kwh,
                        lock_modes=lock_modes,
                        guard_until=lock_until,
                        log_rate_limited=self._log_rate_limited,
                    )
                )
                self._timeline_data = build_planner_timeline(
                    modes=guarded_modes,
                    spot_prices=spot_prices,
                    export_prices=export_prices,
                    solar_forecast=solar_forecast,
                    load_forecast=load_forecast,
                    current_capacity=current_capacity,
                    max_capacity=max_capacity,
                    hw_min_capacity=hw_min_kwh,
                    efficiency=efficiency,
                    home_charge_rate_kw=home_charge_rate_kw,
                    log_rate_limited=self._log_rate_limited,
                )
                attach_planner_reasons(self._timeline_data, result.decisions)

                add_decision_reasons_to_timeline(
                    self._timeline_data,
                    current_capacity=current_capacity,
                    max_capacity=max_capacity,
                    min_capacity=planning_min_kwh,
                    efficiency=float(efficiency),
                )
                mode_guard_module.apply_guard_reasons_to_timeline(
                    self._timeline_data,
                    guard_overrides,
                    guard_until,
                    None,
                    mode_names=CBB_MODE_NAMES,
                )
                self._hybrid_timeline = self._timeline_data
                self._mode_optimization_result = {
                    "optimal_timeline": self._timeline_data,
                    "optimal_modes": guarded_modes,
                    "planner": "planner",
                    "planning_min_kwh": planning_min_kwh,
                    "target_kwh": hybrid_config.target_kwh(max_capacity),
                    "infeasible": result.infeasible,
                    "infeasible_reason": result.infeasible_reason,
                }
                self._mode_recommendations = self._create_mode_recommendations(
                    self._timeline_data, hours_ahead=48
                )

            except Exception as e:
                _LOGGER.error("Planner failed: %s", e, exc_info=True)
                self._timeline_data = []
                self._hybrid_timeline = []
                self._mode_optimization_result = None
                self._mode_recommendations = []

            # PHASE 2.9: Fix daily plan at midnight for tracking (AFTER _timeline_data is set)
            await self._maybe_fix_daily_plan()

            # Baseline timeline (legacy) is no longer computed.
            # Keeping attribute for backwards compatibility only.
            self._baseline_timeline = []

            # Phase 1.5: Calculate hash for change detection
            new_hash = self._calculate_data_hash(self._timeline_data)
            if new_hash != self._data_hash:
                _LOGGER.debug(
                    f"Timeline data changed: {self._data_hash[:8] if self._data_hash else 'none'} -> {new_hash[:8]}"
                )
                self._data_hash = new_hash
            else:
                _LOGGER.debug("Timeline data unchanged (same hash)")

            self._last_update = datetime.now()
            _LOGGER.debug(
                f"Battery forecast updated: {len(self._timeline_data)} timeline points"
            )

            # Vypočítat consumption summary pro dashboard
            if adaptive_profiles and isinstance(adaptive_profiles, dict):
                self._consumption_summary = adaptive_helper.calculate_consumption_summary(
                    adaptive_profiles
                )
            else:
                self._consumption_summary = {}

            # Označit že první update proběhl
            if self._first_update:
                self._first_update = False

            # KRITICKÉ: Uložit timeline zpět do coordinator.data aby grid_charging_planned sensor viděl aktuální data
            if hasattr(self.coordinator, "battery_forecast_data"):
                self.coordinator.battery_forecast_data = {
                    "timeline_data": self._timeline_data,
                    "calculation_time": self._last_update.isoformat(),
                    "data_source": "simplified_calculation",
                    "current_battery_kwh": (
                        self._timeline_data[0].get("battery_capacity_kwh", 0)
                        if self._timeline_data
                        else 0
                    ),
                    # Correct key and default: API expects `mode_recommendations` (list)
                    "mode_recommendations": self._mode_recommendations or [],
                }
                _LOGGER.info(
                    "✅ Battery forecast data saved to coordinator - grid_charging_planned will update"
                )

                # Data jsou už v coordinator.battery_forecast_data
                # Grid charging sensor je závislý na coordinator update cycle
                # NEMĚNÍME coordinator.data - jen přidáváme battery_forecast_data

            # Keep auto mode switching schedule in sync with the latest timeline.
            # This also cancels any previously scheduled events when switching is disabled.
            if self._side_effects_enabled:
                self._create_task_threadsafe(
                    auto_switch_module.update_auto_switch_schedule, self
                )

            # SIMPLE STORAGE: Update actual values každých 15 minut
            now = dt_util.now()
            current_minute = now.minute

            # Spustit update každých 15 minut (v 0, 15, 30, 45)
            should_update = current_minute in [0, 15, 30, 45]

            if should_update:
                # PHASE 3.0: DISABLED - Historical data loading moved to on-demand (API only)
                # Načítání z Recorderu každých 15 min je POMALÉ!
                # Nově: build_timeline_extended() načítá on-demand při API volání.
                # NOTE: Historically skipped until initial history update; kept for future re-enable.
                pass

            # CRITICAL FIX: Write state after every update to publish consumption_summary
            # Check if sensor is already added to HA (self.hass is set by framework)
            if not self.hass:
                _LOGGER.debug("Sensor not yet added to HA, skipping state write")
                return

            self._log_rate_limited(
                "write_state_consumption_summary",
                "debug",
                "🔄 Writing HA state with consumption_summary: %s",
                self._consumption_summary,
                cooldown_s=900.0,
            )
            self.async_write_ha_state()

            # NOTE: Single planner only.

            # PHASE 3.5: Precompute UI data for instant API responses
            # Build timeline_extended + unified_cost_tile and save to storage
            # This runs every 15 min after forecast update
            hash_changed = self._data_hash != self._last_precompute_hash
            self._schedule_precompute(
                force=self._last_precompute_at is None or hash_changed
            )

            # Notify dependent sensors (BatteryBalancing) that forecast is ready
            from homeassistant.helpers.dispatcher import async_dispatcher_send

            signal_name = f"oig_cloud_{self._box_id}_forecast_updated"
            _LOGGER.debug(f"📡 Sending signal: {signal_name}")
            async_dispatcher_send(self.hass, signal_name)

        except Exception as e:
            _LOGGER.error(f"Error updating battery forecast: {e}", exc_info=True)
        finally:
            # Mark bucket complete only if prerequisites were ready.
            try:
                if mark_bucket_done:
                    now_done = dt_util.now()
                    done_bucket_minute = (now_done.minute // 15) * 15
                    self._last_forecast_bucket = now_done.replace(
                        minute=done_bucket_minute, second=0, microsecond=0
                    )
                    # We intentionally keep profiles dirty until a successful compute; if async_update
                    # failed, the next tick will retry.
                    if self._timeline_data:
                        self._profiles_dirty = False
            except Exception:  # nosec B110
                pass
            self._forecast_in_progress = False

    def _simulate_interval(
        self,
        mode: int,  # 0=HOME I, 1=HOME II, 2=HOME III, 3=HOME UPS
        solar_kwh: float,  # FVE produkce (kWh/15min)
        load_kwh: float,  # Spotřeba (kWh/15min)
        battery_soc_kwh: float,  # Aktuální SoC (kWh)
        capacity_kwh: float,  # Max kapacita (kWh)
        hw_min_capacity_kwh: float,  # Fyzické minimum 20% (kWh) - INVERTOR LIMIT
        spot_price_czk: float,  # Nákupní cena (Kč/kWh)
        export_price_czk: float,  # Prodejní cena (Kč/kWh)
        charge_efficiency: float = 0.95,  # AC→DC + DC→battery efficiency
        discharge_efficiency: float = 0.95,  # battery→DC + DC→AC efficiency
        home_charge_rate_kwh_15min: float = 0.7,  # HOME UPS: 2.8kW = 0.7kWh/15min
        planning_min_capacity_kwh: float = None,  # Planning minimum (může být vyšší než hw_min)
    ) -> dict:
        """
        Simulovat jeden 15min interval s konkrétním CBB režimem.

        ZDROJ PRAVDY: CBB_MODES_DEFINITIVE.md

        DŮLEŽITÉ - Oddělení odpovědností:
        - Tato funkce implementuje POUZE fyziku režimů měniče
        - Zná pouze hw_min_capacity (invertor hardware limit = 20%)
        - NEVÍ o planning_min_capacity (to řeší HYBRID plánovač)
        - NEVÍ o target SoC (to řeší HYBRID plánovač)
        - NEVÍ o cheap/expensive prices (to řeší HYBRID plánovač)

        Režimy podle CBB_MODES_DEFINITIVE.md:

        HOME I (0) - DEN: FVE → spotřeba → baterie, deficit vybíjí
        HOME I (0) - NOC: Baterie → spotřeba (do hw_min), pak síť

        HOME II (1) - DEN: FVE → spotřeba, přebytek → baterie, deficit → SÍŤ (NETOUCHED!)
        HOME II (1) - NOC: Stejné jako HOME I (vybíjí do hw_min)

        HOME III (2) - DEN: FVE → baterie, spotřeba → VŽDY SÍŤ
        HOME III (2) - NOC: Stejné jako HOME I (vybíjí do hw_min)

        HOME UPS (3): Nabíjení na 100% (FVE + síť), spotřeba → síť

        Args:
            mode: CBB režim (0-3)
            solar_kwh: FVE produkce za 15min (kWh)
            load_kwh: Spotřeba za 15min (kWh)
            battery_soc_kwh: Aktuální stav baterie (kWh, NE %)
            capacity_kwh: Max kapacita (kWh)
            hw_min_capacity_kwh: HW minimum invertoru (kWh, typicky 20% = 3.07 kWh)
            spot_price_czk: Nákupní cena (Kč/kWh)
            export_price_czk: Prodejní cena (Kč/kWh)
            charge_efficiency: Nabíjecí účinnost (default 0.95)
            discharge_efficiency: Vybíjecí účinnost (default 0.95)
            home_charge_rate_kwh_15min: Max nabíjení ze sítě pro HOME UPS (kWh/15min)

        Returns:
            dict:
                new_soc_kwh: Nový SoC (kWh)
                grid_import_kwh: Import ze sítě (kWh)
                grid_export_kwh: Export do sítě (kWh)
                battery_charge_kwh: Nabití baterie (kWh)
                battery_discharge_kwh: Vybití baterie (kWh)
                grid_cost_czk: Náklady na import (Kč)
                export_revenue_czk: Příjem z exportu (Kč)
                net_cost_czk: Čisté náklady (Kč)
        """
        effective_min = (
            planning_min_capacity_kwh
            if planning_min_capacity_kwh is not None
            else hw_min_capacity_kwh
        )

        flows = simulate_interval(
            mode=mode,
            solar_kwh=solar_kwh,
            load_kwh=load_kwh,
            battery_soc_kwh=battery_soc_kwh,
            capacity_kwh=capacity_kwh,
            hw_min_capacity_kwh=effective_min,
            charge_efficiency=charge_efficiency,
            discharge_efficiency=discharge_efficiency,
            home_charge_rate_kwh_15min=home_charge_rate_kwh_15min,
        )

        grid_cost_czk = flows.grid_import_kwh * spot_price_czk
        export_revenue_czk = flows.grid_export_kwh * export_price_czk
        net_cost_czk = grid_cost_czk - export_revenue_czk

        return {
            "new_soc_kwh": flows.new_soc_kwh,
            "grid_import_kwh": flows.grid_import_kwh,
            "grid_export_kwh": flows.grid_export_kwh,
            "battery_charge_kwh": flows.battery_charge_kwh,
            "battery_discharge_kwh": flows.battery_discharge_kwh,
            "grid_cost_czk": grid_cost_czk,
            "export_revenue_czk": export_revenue_czk,
            "net_cost_czk": net_cost_czk,
        }

    # =========================================================================
    # STARÉ FUNKCE ODSTRANĚNY (TODO 6: Cleanup)
    # =========================================================================
    # _simulate_interval_with_mode() - SMAZÁNO (původně line 1296-1666, 370 řádků)
    #   → Nahrazeno centrální funkcí _simulate_interval() (line 1026-1343)
    #   → Všechna volání migrována v TODO 3 (lines 1790, 1995, 2125, 3836)
    #   → Zdroj pravdy: CBB_MODES_DEFINITIVE.md
    # =========================================================================

    def _calculate_interval_cost(
        self,
        simulation_result: Dict[str, Any],
        spot_price: float,
        export_price: float,
        time_of_day: str,
    ) -> Dict[str, Any]:
        """
        Vypočítat ekonomické náklady pro jeden interval.

        Phase 2.5: Zahrnuje opportunity cost - cena za použití baterie TEĎ vs POZDĚJI.

        Args:
            simulation_result: Výsledek z _simulate_interval_with_mode()
            spot_price: Spotová cena nákupu (Kč/kWh)
            export_price: Prodejní cena exportu (Kč/kWh)
            time_of_day: Časová kategorie ("night", "morning", "midday", "evening")

        Returns:
            Dict s náklady:
                - direct_cost: Přímé náklady (grid_import * spot - grid_export * export)
                - opportunity_cost: Oportunitní náklad použití baterie
                - total_cost: Celkové náklady (direct + opportunity)
        """
        direct_cost = simulation_result["net_cost"]

        # Opportunity cost: Kolik "stojí" vybít baterii TEĎ místo POZDĚJI
        # Pokud vybíjíme baterii během dne, mohli bychom ji ušetřit na večerní peak
        battery_discharge = simulation_result.get("battery_discharge", 0.0)

        # Evening peak price assumption (můžeme použít max(spot_prices) nebo config)
        # Pro začátek: pevná hodnota 6 Kč/kWh (typický večerní peak)
        evening_peak_price = 6.0

        opportunity_cost = 0.0
        if battery_discharge > 0.001:
            # Pokud vybíjíme během "cheap" období, ztrácíme možnost použít baterii večer
            if time_of_day in ["night", "midday"]:
                # Opportunity cost = kolik bychom ušetřili, kdybychom baterii použili večer
                # Discharge now costs us: (evening_peak - spot_price) * discharge
                opportunity_cost = (evening_peak_price - spot_price) * battery_discharge

        total_cost = direct_cost + opportunity_cost

        return {
            "direct_cost": direct_cost,
            "opportunity_cost": opportunity_cost,
            "total_cost": total_cost,
        }

    def _calculate_fixed_mode_cost(
        self,
        fixed_mode: int,
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
        physical_min_capacity: float | None = None,
    ) -> float:
        """
        Vypočítat celkové náklady pokud by uživatel zůstal v jednom režimu celou dobu.

        Phase 2.6: What-if Analysis - Srovnání s fixed-mode strategií.
        Phase 2.7: Cache timeline for HOME I (for savings calculation).
        Phase 2.10: 4-Baseline Comparison - Use physical minimum for baseline simulations.

        Args:
            fixed_mode: CBB režim (0=HOME I, 1=HOME II, 2=HOME III, 3=HOME UPS)
            current_capacity: Aktuální SoC baterie (kWh)
            max_capacity: Max kapacita baterie (kWh)
            min_capacity: Min kapacita baterie (kWh) - Planning minimum (33% = 5.07 kWh)
            spot_prices: Timeline spot cen
            export_prices: Timeline export cen
            solar_forecast: Solární předpověď
            load_forecast: Předpověď spotřeby (kWh per interval)
            physical_min_capacity: Physical/HW minimum (20% = 3.07 kWh). If None, use min_capacity.
                                   For baseline simulations, pass physical minimum.
                                   For HYBRID optimization, pass None to use planning minimum.

        Returns:
            Dict s výsledky:
                - total_cost: Celkové náklady v Kč
                - grid_import_kwh: Celkový import ze sítě (kWh)
                - final_battery_kwh: Finální stav baterie (kWh)
                - penalty_cost: Penalizace za porušení planning minima (Kč)
                - planning_violations: Počet intervalů pod planning minimem
        """
        # Use physical minimum for baselines, planning minimum for HYBRID
        effective_min = (
            physical_min_capacity if physical_min_capacity is not None else min_capacity
        )

        # Planning minimum penalty tracking
        planning_minimum = min_capacity  # 33% = 5.07 kWh
        penalty_cost = 0.0
        planning_violations = 0
        efficiency = self._get_battery_efficiency()

        total_cost = 0.0
        total_grid_import = 0.0
        battery_soc = current_capacity
        timeline_cache = []  # Phase 2.7: Cache for savings calculation

        for t in range(len(spot_prices)):
            timestamp_str = spot_prices[t].get("time", "")
            spot_price = spot_prices[t].get("price", 0.0)
            export_price = (
                export_prices[t].get("price", 0.0) if t < len(export_prices) else 0.0
            )
            load_kwh = load_forecast[t] if t < len(load_forecast) else 0.0

            # Get solar
            solar_kwh = 0.0
            try:
                timestamp = datetime.fromisoformat(timestamp_str)
                solar_kwh = get_solar_for_timestamp(
                    timestamp,
                    solar_forecast,
                    log_rate_limited=self._log_rate_limited,
                )
            except Exception:
                solar_kwh = 0.0

            # Simulovat s fixed režimem - NOVÁ centrální funkce!
            # PHASE 3: Přechod ze staré _simulate_interval_with_mode() na novou _simulate_interval()
            sim_result = self._simulate_interval(
                mode=fixed_mode,
                solar_kwh=solar_kwh,
                load_kwh=load_kwh,
                battery_soc_kwh=battery_soc,  # NEW: explicit kwh suffix
                capacity_kwh=max_capacity,  # NEW: explicit kwh suffix
                hw_min_capacity_kwh=effective_min,  # NEW: hw_min instead of min_capacity
                spot_price_czk=spot_price,  # NEW: explicit czk suffix
                export_price_czk=export_price,  # NEW: explicit czk suffix
                charge_efficiency=efficiency,
                discharge_efficiency=efficiency,
            )

            total_cost += sim_result["net_cost_czk"]  # NEW: explicit czk suffix
            total_grid_import += sim_result.get(
                "grid_import_kwh", 0.0
            )  # NEW: explicit kwh suffix
            battery_soc = sim_result["new_soc_kwh"]  # NEW: explicit kwh suffix

            # Planning minimum penalty: když baseline klesne pod planning minimum,
            # penalizujeme je jako by museli tu energii koupit z gridu
            if battery_soc < planning_minimum:
                deficit = planning_minimum - battery_soc
                # Penalty = deficit musí být pokryt z gridu (s efficiency losses)
                interval_penalty = (deficit * spot_price) / efficiency
                penalty_cost += interval_penalty
                planning_violations += 1

            # Phase 2.7: Cache timeline for HOME I (mode 0)
            if fixed_mode == CBB_MODE_HOME_I:
                timeline_cache.append(
                    {
                        "time": timestamp_str,
                        "net_cost": sim_result["net_cost_czk"],
                    }  # NEW: czk suffix
                )

        # Calculate adjusted total cost (includes penalty)
        adjusted_total_cost = total_cost + penalty_cost

        return {
            "total_cost": round(total_cost, 2),
            "grid_import_kwh": round(total_grid_import, 2),
            "final_battery_kwh": round(battery_soc, 2),
            "penalty_cost": round(penalty_cost, 2),
            "planning_violations": planning_violations,
            "adjusted_total_cost": round(adjusted_total_cost, 2),
        }

    def _calculate_mode_baselines(
        self,
        current_capacity: float,
        max_capacity: float,
        physical_min_capacity: float,
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
    ) -> Dict[str, Dict[str, Any]]:
        """
        Vypočítat baseline scénáře pro všechny 4 CBB režimy.

        ZDROJ PRAVDY:
        - CBB_MODES_DEFINITIVE.md - chování režimů
        - REFACTORING_IMPLEMENTATION_GUIDE.md - hw_min vs planning_min

        Phase 2.10: 4-Baseline Comparison

        Tato funkce simuluje co by se stalo kdyby uživatel zůstal celý den v jednom
        z fixních CBB režimů (HOME I/II/III/UPS) bez využití HYBRID optimalizace.

        DŮLEŽITÉ - Oddělení odpovědností:
        - Baseline používá hw_min_capacity (20% fyzické minimum invertoru)
        - HYBRID plánovač používá planning_min_capacity (33% user minimum)
        - Všechna fyzika přes centrální _simulate_interval()

        Args:
            current_capacity: Aktuální SoC baterie (kWh)
            max_capacity: Max kapacita baterie (kWh)
            physical_min_capacity: Fyzické/HW minimum (20% = 3.07 kWh)
            spot_prices: Timeline spot cen
            export_prices: Timeline export cen
            solar_forecast: Solární předpověď
            load_forecast: Předpověď spotřeby (kWh per interval)

        Returns:
            Dict s baseline pro každý režim:
            {
                "HOME_I": {
                    "total_cost": float,  # Kč
                    "grid_import_kwh": float,  # kWh
                    "final_battery_kwh": float,  # kWh
                },
                "HOME_II": {...},
                "HOME_III": {...},
                "HOME_UPS": {...},
            }
        """
        baselines = {}

        mode_mapping = [
            (CBB_MODE_HOME_I, "HOME_I"),
            (CBB_MODE_HOME_II, "HOME_II"),
            (CBB_MODE_HOME_III, "HOME_III"),
            (CBB_MODE_HOME_UPS, "HOME_UPS"),
        ]

        _LOGGER.debug(
            f"🔍 Calculating 4 baselines: physical_min={physical_min_capacity:.2f} kWh "
            f"({physical_min_capacity / max_capacity * 100:.0f}%)"
        )

        for mode_id, mode_name in mode_mapping:
            result = self._calculate_fixed_mode_cost(
                fixed_mode=mode_id,
                current_capacity=current_capacity,
                max_capacity=max_capacity,
                min_capacity=physical_min_capacity,  # DUMMY - not used with physical_min
                spot_prices=spot_prices,
                export_prices=export_prices,
                solar_forecast=solar_forecast,
                load_forecast=load_forecast,
                physical_min_capacity=physical_min_capacity,  # Use physical minimum!
            )

            baselines[mode_name] = result

            # Log baseline s penalty informací
            penalty_info = ""
            if result["planning_violations"] > 0:
                penalty_info = (
                    f", penalty={result['penalty_cost']:.2f} Kč "
                    f"({result['planning_violations']} violations)"
                )

            _LOGGER.debug(
                f"  {mode_name}: cost={result['total_cost']:.2f} Kč{penalty_info}, "
                f"grid_import={result['grid_import_kwh']:.2f} kWh, "
                f"final_battery={result['final_battery_kwh']:.2f} kWh, "
                f"adjusted_cost={result['adjusted_total_cost']:.2f} Kč"
            )

        return baselines

    def _calculate_do_nothing_cost(
        self,
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
    ) -> float:
        """
        Vypočítat náklady pokud uživatel NIC NEZMĚNÍ.

        Phase 2.6: What-if Analysis - DO NOTHING = současný režim bez změn.

        OPRAVA 29.10.2025:
        - PŘED: Simuloval HOME I jako "pasivní" režim (nesprávně)
        - PO: Simuluje SOUČASNÝ CBB REŽIM po celý den BEZ ZMĚN

        Logika:
        - Načíst aktuální režim ze sensoru box_prms_mode
        - Simulovat celých 24h s tímto režimem
        - Uživatel vidí: "Co kdybyste nechali současný režim (HOME II) celý den?"

        Args:
            current_capacity: Aktuální SoC baterie (kWh)
            max_capacity: Max kapacita baterie (kWh)
            min_capacity: Min kapacita baterie (kWh)
            spot_prices: Timeline spot cen
            export_prices: Timeline export cen
            solar_forecast: Solární předpověď
            load_forecast: Předpověď spotřeby (kWh per interval)

        Returns:
            Celkové náklady v Kč pokud uživatel nechá současný režim
        """
        # OPRAVA: Načíst současný režim místo fixed HOME I
        current_mode = self._get_current_mode()
        efficiency = self._get_battery_efficiency()

        _LOGGER.debug(
            f"[DO NOTHING] Calculating cost for current mode: {current_mode} "
            f"({['HOME I', 'HOME II', 'HOME III', 'HOME UPS'][current_mode]})"
        )

        total_cost = 0.0
        battery_soc = current_capacity

        for t in range(len(spot_prices)):
            timestamp_str = spot_prices[t].get("time", "")
            spot_price = spot_prices[t].get("price", 0.0)
            export_price = (
                export_prices[t].get("price", 0.0) if t < len(export_prices) else 0.0
            )
            load_kwh = load_forecast[t] if t < len(load_forecast) else 0.0

            # Get solar
            solar_kwh = 0.0
            try:
                timestamp = datetime.fromisoformat(timestamp_str)
                solar_kwh = get_solar_for_timestamp(
                    timestamp,
                    solar_forecast,
                    log_rate_limited=self._log_rate_limited,
                )
            except Exception:
                solar_kwh = 0.0

            # OPRAVA: Použít současný režim místo HOME I
            # PHASE 3: Přechod na novou _simulate_interval()
            sim_result = self._simulate_interval(
                mode=current_mode,  # ← OPRAVA: Prostě nech to být!
                solar_kwh=solar_kwh,
                load_kwh=load_kwh,
                battery_soc_kwh=battery_soc,  # NEW: explicit kwh
                capacity_kwh=max_capacity,  # NEW: explicit kwh
                hw_min_capacity_kwh=min_capacity,  # NEW: hw_min (here used as planning min - suboptimal but works)
                spot_price_czk=spot_price,  # NEW: explicit czk
                export_price_czk=export_price,  # NEW: explicit czk
                charge_efficiency=efficiency,
                discharge_efficiency=efficiency,
            )

            total_cost += sim_result["net_cost_czk"]  # NEW: czk suffix
            battery_soc = sim_result["new_soc_kwh"]  # NEW: kwh suffix

        return total_cost

    def _calculate_full_ups_cost(
        self,
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
    ) -> float:
        """
        Vypočítat náklady pokud uživatel nabíjí baterii na 100% ASAP v nejlevnějších nočních intervalech.

        Phase 2.6: What-if Analysis - Optimální noční nabíjení na 100%.

        OPRAVA 29.10.2025:
        - PŘED: Nabíjel celou noc (22-06h) bez ohledu na cenu (8 hodin)
        - PO: Nabíjí ASAP v nejlevnějších nočních intervalech (pouze potřebný čas)

        Logika:
        1. Spočítat potřebu: needed_kwh = max_capacity - current_capacity
        2. AC charging limit: 2.8 kW = 0.7 kWh/15min
        3. Intervals needed: ceil(needed_kwh / 0.7)
        4. Najít N nejlevnějších nočních intervalů (22-06h)
        5. Nabít pouze v těchto intervalech
        6. Zbytek dne: HOME I

        Výsledek: Úspora vs nabíjení celou noc, lepší ekonomie

        Args:
            current_capacity: Aktuální SoC baterie (kWh)
            max_capacity: Max kapacita baterie (kWh)
            min_capacity: Min kapacita baterie (kWh)
            spot_prices: Timeline spot cen
            export_prices: Timeline export cen
            solar_forecast: Solární předpověď
            load_forecast: Předpověď spotřeby (kWh per interval)

        Returns:
            Celkové náklady v Kč s optimálním nočním nabíjením
        """
        # Get battery efficiency for calculations
        efficiency = self._get_battery_efficiency()

        # 1. Spočítat potřebu dobití
        needed_kwh = max_capacity - current_capacity

        # 2. AC charging limit per 15min interval
        ac_charging_limit = 0.7  # kWh per 15min (2.8 kW AC path)

        # 3. Kolik intervalů potřebujeme na dobití?
        if needed_kwh > 0.001:
            intervals_needed = int(math.ceil(needed_kwh / ac_charging_limit))
        else:
            intervals_needed = 0  # Battery už plná

        _LOGGER.debug(
            f"[FULL UPS] Need {needed_kwh:.2f} kWh to reach {max_capacity:.2f} kWh, "
            f"requires {intervals_needed} intervals (×15min)"
        )

        # 4. Najít noční intervaly (22:00-06:00) a seřadit podle ceny
        night_intervals = []
        for t, price_data in enumerate(spot_prices):
            timestamp_str = price_data.get("time", "")
            try:
                timestamp = datetime.fromisoformat(timestamp_str)
                hour = timestamp.hour

                # Noční hodiny: 22-23, 0-5
                if 22 <= hour or hour < 6:
                    night_intervals.append((t, price_data.get("price", 0.0)))
            except Exception:  # nosec B112
                continue

        # 5. Seřadit podle ceny a vybrat N nejlevnějších
        night_sorted = sorted(
            night_intervals, key=lambda x: x[1]
        )  # Sort by price (ascending)
        cheapest_intervals = set(
            [idx for idx, price in night_sorted[:intervals_needed]]
        )

        if cheapest_intervals:
            _LOGGER.debug(
                f"[FULL UPS] Selected {len(cheapest_intervals)} cheapest night intervals "
                f"from {len(night_intervals)} total night intervals"
            )

        # 6. Simulovat s optimálním nabíjením
        total_cost = 0.0
        battery_soc = current_capacity

        for t in range(len(spot_prices)):
            timestamp_str = spot_prices[t].get("time", "")
            spot_price = spot_prices[t].get("price", 0.0)
            export_price = (
                export_prices[t].get("price", 0.0) if t < len(export_prices) else 0.0
            )
            load_kwh = load_forecast[t] if t < len(load_forecast) else 0.0

            # Get solar
            solar_kwh = 0.0
            try:
                timestamp = datetime.fromisoformat(timestamp_str)
                solar_kwh = get_solar_for_timestamp(
                    timestamp,
                    solar_forecast,
                    log_rate_limited=self._log_rate_limited,
                )
            except Exception:
                solar_kwh = 0.0

            # OPRAVA: Nabíjet pouze v nejlevnějších nočních intervalech
            if t in cheapest_intervals and battery_soc < max_capacity:
                # Optimální nabíjení v levném intervalu
                mode = CBB_MODE_HOME_UPS  # 3 - Grid charging enabled
            else:
                # Normální provoz (nebo battery už plná)
                mode = CBB_MODE_HOME_I  # 0 - Battery priority

            # PHASE 3: Přechod na novou _simulate_interval()
            sim_result = self._simulate_interval(
                mode=mode,
                solar_kwh=solar_kwh,
                load_kwh=load_kwh,
                battery_soc_kwh=battery_soc,  # NEW: kwh suffix
                capacity_kwh=max_capacity,  # NEW: kwh suffix
                hw_min_capacity_kwh=min_capacity,  # NEW: hw_min
                spot_price_czk=spot_price,  # NEW: czk suffix
                export_price_czk=export_price,  # NEW: czk suffix
                charge_efficiency=efficiency,
                discharge_efficiency=efficiency,
            )

            total_cost += sim_result["net_cost_czk"]  # NEW: czk suffix
            battery_soc = sim_result["new_soc_kwh"]  # NEW: kwh suffix

        return total_cost

    def _create_mode_recommendations(
        self, optimal_timeline: List[Dict[str, Any]], hours_ahead: int = 48
    ) -> List[Dict[str, Any]]:
        """Vytvořit user-friendly doporučení režimů pro DNES a ZÍTRA."""
        return mode_recommendations_module.create_mode_recommendations(
            optimal_timeline,
            hours_ahead=hours_ahead,
            mode_home_i=CBB_MODE_HOME_I,
            mode_home_ii=CBB_MODE_HOME_II,
            mode_home_iii=CBB_MODE_HOME_III,
            mode_home_ups=CBB_MODE_HOME_UPS,
        )

    def _generate_alternatives(  # noqa: C901
        self,
        spot_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
        optimal_cost_48h: float,
        current_capacity: float,
        max_capacity: float,
        efficiency: float,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Generate what-if alternatives: what would cost be if we used only one mode all day?

        Returns dict with structure:
        {
            "HOME I": {"cost_czk": 50.5, "delta_czk": 5.2},
            "HOME II": {"cost_czk": 48.0, "delta_czk": 2.7},
            ...
        }
        """
        now = dt_util.now()
        today_start = datetime.combine(now.date(), datetime.min.time())
        today_start = dt_util.as_local(today_start)
        tomorrow_end = today_start + timedelta(hours=48)

        # Phase 2.7: Cache timeline for HOME I
        home_i_timeline_cache = []

        def simulate_mode(mode: int) -> float:
            """Simulate 48h cost with fixed mode"""
            battery = current_capacity
            total_cost = 0.0

            for i, price_data in enumerate(spot_prices):
                timestamp_str = price_data.get("time", "")
                if not timestamp_str:
                    continue

                try:
                    timestamp = datetime.fromisoformat(timestamp_str)
                    if timestamp.tzinfo is None:
                        timestamp = dt_util.as_local(timestamp)
                    if not (today_start <= timestamp < tomorrow_end):
                        continue
                except Exception:  # nosec B112
                    continue

                # Get input data from forecasts
                try:
                    solar_kwh = get_solar_for_timestamp(
                        timestamp,
                        solar_forecast,
                        log_rate_limited=self._log_rate_limited,
                    )
                except Exception:
                    solar_kwh = 0.0

                load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125
                price = price_data.get("price", 0)

                grid_import = 0.0
                grid_export = 0.0
                net_cost = 0.0

                # HOME I: Battery priority (NO GRID CHARGING - this is the baseline)
                if mode == 0:
                    if solar_kwh >= load_kwh:
                        surplus = solar_kwh - load_kwh
                        battery += surplus
                        if battery > max_capacity:
                            grid_export = battery - max_capacity
                            battery = max_capacity
                            net_cost = -grid_export * price
                            total_cost += net_cost
                    else:
                        deficit = load_kwh - solar_kwh
                        battery -= deficit / efficiency
                        if battery < 0:
                            grid_import = -battery * efficiency
                            battery = 0
                            net_cost = grid_import * price
                            total_cost += net_cost

                    # Phase 2.7: Cache timeline for HOME I
                    home_i_timeline_cache.append(
                        {"time": timestamp_str, "net_cost": net_cost}
                    )

                # HOME II: Grid supplements, battery saved
                elif mode == 1:
                    if solar_kwh >= load_kwh:
                        surplus = solar_kwh - load_kwh
                        battery += surplus
                        if battery > max_capacity:
                            grid_export = battery - max_capacity
                            battery = max_capacity
                            total_cost -= grid_export * price
                    else:
                        # Grid covers load, battery untouched
                        grid_import = load_kwh - solar_kwh
                        total_cost += grid_import * price

                # HOME III: Max charge
                elif mode == 2:
                    battery += solar_kwh
                    if battery > max_capacity:
                        grid_export = battery - max_capacity
                        battery = max_capacity
                        total_cost -= grid_export * price
                    # Load from grid
                    grid_import = load_kwh
                    total_cost += grid_import * price

                # HOME UPS: Grid charging allowed
                elif mode == 3:
                    # Nabít baterii z gridu pokud je levné
                    if price < 1.5:  # Threshold for charging
                        charge_amount = min(2.8 / 4.0, max_capacity - battery)
                        if charge_amount > 0:
                            grid_import += charge_amount
                            total_cost += charge_amount * price
                            battery += charge_amount * efficiency

                    # Stejná logika jako HOME I pro FVE
                    if solar_kwh >= load_kwh:
                        surplus = solar_kwh - load_kwh
                        battery += surplus
                        if battery > max_capacity:
                            grid_export = battery - max_capacity
                            battery = max_capacity
                            total_cost -= grid_export * price
                    else:
                        deficit = load_kwh - solar_kwh
                        battery -= deficit / efficiency
                        if battery < 0:
                            extra_import = -battery * efficiency
                            battery = 0
                            grid_import += extra_import
                            total_cost += extra_import * price

                battery = max(0, min(battery, max_capacity))

            return total_cost

        alternatives = {}
        mode_names = {
            0: "HOME I",
            1: "HOME II",
            2: "HOME III",
            3: "HOME UPS",
        }

        for mode, name in mode_names.items():
            cost = simulate_mode(mode)
            delta = cost - optimal_cost_48h
            alternatives[name] = {
                "cost_czk": round(cost, 2),
                "delta_czk": round(delta, 2),
            }

        # Add DO NOTHING (current optimized plan)
        alternatives["DO NOTHING"] = {
            "cost_czk": round(optimal_cost_48h, 2),
            "delta_czk": 0.0,
            "current_mode": "Optimized",
        }

        return alternatives

    def _update_balancing_plan_snapshot(self, plan: Optional[Dict[str, Any]]) -> None:
        """Keep BalancingManager plan snapshot in sync with legacy plan handling."""

        def _is_balancing_requester(requester: Optional[str]) -> bool:
            if not requester:
                return False
            return requester.lower() in {"balancingmanager", "balancing_manager"}

        self._balancing_plan_snapshot = plan

        if plan:
            if not self._active_charging_plan or _is_balancing_requester(
                self._active_charging_plan.get("requester")
            ):
                self._active_charging_plan = plan
        else:
            if self._active_charging_plan and _is_balancing_requester(
                self._active_charging_plan.get("requester")
            ):
                self._active_charging_plan = None

    def _get_total_battery_capacity(self) -> Optional[float]:
        """Získat CELKOVOU kapacitu baterie z API (box_prms.p_bat → kWh).

        Toto je FYZICKÁ celková kapacita baterie (0-100%).
        """
        if not self._hass:
            return None

        # Prefer dedicated sensor (available in both cloud and local mode)
        installed_sensor = f"sensor.oig_{self._box_id}_installed_battery_capacity_kwh"
        installed_state = self._hass.states.get(installed_sensor)
        if installed_state and installed_state.state not in [
            "unknown",
            "unavailable",
            None,
            "",
        ]:
            try:
                # Stored as Wh (Wp) → convert to kWh
                total_kwh = float(installed_state.state) / 1000.0
                if total_kwh > 0:
                    return total_kwh
            except (ValueError, TypeError):
                pass

        # Zkusit získat z PV data (box_prms.p_bat)
        pv_data_sensor = f"sensor.oig_{self._box_id}_pv_data"
        state = self._hass.states.get(pv_data_sensor)

        if state and hasattr(state, "attributes"):
            try:
                pv_data = state.attributes.get("data", {})
                if isinstance(pv_data, dict):
                    p_bat_wp = pv_data.get("box_prms", {}).get("p_bat")
                    if p_bat_wp:
                        total_kwh = float(p_bat_wp) / 1000.0
                        _LOGGER.debug(
                            f"Total battery capacity from API: {p_bat_wp} Wp = {total_kwh:.2f} kWh"
                        )
                        return total_kwh
            except (KeyError, ValueError, TypeError) as e:
                _LOGGER.debug(f"Error reading p_bat from pv_data: {e}")

        # Fallback: vypočítat z usable_battery_capacity (backwards compatibility)
        usable_sensor = f"sensor.oig_{self._box_id}_usable_battery_capacity"
        usable_state = self._hass.states.get(usable_sensor)

        if usable_state and usable_state.state not in ["unknown", "unavailable"]:
            try:
                usable_kwh = float(usable_state.state)
                total_kwh = usable_kwh / 0.8  # Usable je 80% z total
                _LOGGER.debug(
                    f"Total battery capacity from usable: {usable_kwh:.2f} kWh × 1.25 = {total_kwh:.2f} kWh"
                )
                return total_kwh
            except (ValueError, TypeError):
                pass

        self._log_rate_limited(
            "battery_capacity_missing",
            "debug",
            "Battery total capacity not available yet; waiting for sensors",
            cooldown_s=600.0,
        )
        return None

    def _get_current_battery_soc_percent(self) -> Optional[float]:
        """Získat aktuální SoC v % z API (actual.bat_c).

        Toto je SKUTEČNÝ SoC% vůči celkové kapacitě (0-100%).
        """
        if not self._hass:
            return None

        # Hlavní sensor: batt_bat_c (Battery Percent z API)
        soc_sensor = f"sensor.oig_{self._box_id}_batt_bat_c"
        state = self._hass.states.get(soc_sensor)

        if state and state.state not in ["unknown", "unavailable"]:
            try:
                soc_percent = float(state.state)
                _LOGGER.debug(f"Battery SoC from API: {soc_percent:.1f}%")
                return soc_percent
            except (ValueError, TypeError):
                _LOGGER.debug(f"Invalid SoC value: {state.state}")

        self._log_rate_limited(
            "battery_soc_missing",
            "debug",
            "Battery SoC%% not available yet; waiting for sensors",
            cooldown_s=600.0,
        )
        return None

    def _get_current_battery_capacity(self) -> Optional[float]:
        """Získat aktuální kapacitu baterie v kWh.

        NOVÝ VÝPOČET: total_capacity × soc_percent / 100
        (místo remaining_usable_capacity computed sensoru)
        """
        total = self._get_total_battery_capacity()
        soc_percent = self._get_current_battery_soc_percent()
        if total is None or soc_percent is None:
            return None
        current_kwh = total * soc_percent / 100.0

        _LOGGER.debug(
            f"Current battery capacity: {total:.2f} kWh × {soc_percent:.1f}% = {current_kwh:.2f} kWh"
        )
        return current_kwh

    def _get_max_battery_capacity(self) -> Optional[float]:
        """Získat maximální kapacitu baterie (= total capacity).

        DEPRECATED: Kept for backwards compatibility.
        Use _get_total_battery_capacity() instead.
        """
        return self._get_total_battery_capacity()

    def _get_min_battery_capacity(self) -> Optional[float]:
        """Získat minimální kapacitu baterie z config flow.

        NOVÝ VÝPOČET: min_percent × total_capacity
        (místo min_percent × usable_capacity)
        """
        total = self._get_total_battery_capacity()
        if total is None:
            return None

        if self._config_entry:
            min_percent = (
                self._config_entry.options.get("min_capacity_percent")
                if self._config_entry.options
                else self._config_entry.data.get("min_capacity_percent", 33.0)
            )
            if min_percent is None:
                min_percent = 33.0
            min_kwh = total * float(min_percent) / 100.0

            _LOGGER.debug(
                f"Min battery capacity: {min_percent:.0f}% × {total:.2f} kWh = {min_kwh:.2f} kWh "
                f"(source={'options' if self._config_entry.options else 'data'})"
            )
            return min_kwh

        # Default: 33% z total
        return total * 0.33

    def _get_target_battery_capacity(self) -> Optional[float]:
        """Získat cílovou kapacitu baterie z config flow.

        Cílová kapacita (kWh) pro plánovač.
        """
        total = self._get_total_battery_capacity()
        if total is None:
            return None

        if self._config_entry:
            target_percent = (
                self._config_entry.options.get("target_capacity_percent")
                if self._config_entry.options
                else self._config_entry.data.get("target_capacity_percent", 80.0)
            )
            if target_percent is None:
                target_percent = 80.0
            target_kwh = total * float(target_percent) / 100.0

            _LOGGER.debug(
                f"Target battery capacity: {target_percent:.0f}% × {total:.2f} kWh = {target_kwh:.2f} kWh "
                f"(source={'options' if self._config_entry.options else 'data'})"
            )
            return target_kwh

        # Default: 80% z total
        return total * 0.80

    # =========================================================================
    # PHASE 2.9: DAILY PLAN TRACKING - Historie vs Plán
    # =========================================================================

    async def _maybe_fix_daily_plan(self) -> None:  # noqa: C901
        """
        Fixovat denní plán při prvním výpočtu po půlnoci.

        Phase 2.9: Daily Plan Tracking
        - Volá se po HYBRID optimalizaci
        - Kontroluje jestli je nový den
        - Fixuje plán z HYBRID optimalizace pro celý dnešek
        - Ukládá do self._daily_plan_state pro pozdější tracking

        Phase 3.0: Storage Helper Integration
        - Po půlnoci (00:10-00:30): Vytvoř baseline plán do Storage Helper
        - Baseline = 96 intervalů s plánovanými hodnotami
        - Persists across HA restarts

        Logika:
        1. Je nový den? (plan_date != today)
        2. Máme fresh HYBRID výsledek? (optimal_timeline existuje)
        3. FIXUJ: Ulož celý dnešní plán do daily_plan_state
        4. STORAGE: Ulož baseline do Storage Helper (persistent)
        """
        now = dt_util.now()
        today_str = now.strftime(DATE_FMT)

        # Inicializace state při prvním běhu
        if not hasattr(self, "_daily_plan_state"):
            self._daily_plan_state = None

        # PHASE 3.0: Pokus o vytvoření baseline plánu po půlnoci
        # Spustí se pokud je nový den A čas je mezi 00:10 a 01:00
        if now.hour == 0 and 10 <= now.minute < 60:
            # Check if baseline already exists
            plan_exists = await self._plan_exists_in_storage(today_str)
            if not plan_exists:
                _LOGGER.info(
                    f"⏰ Post-midnight baseline creation window: {now.strftime('%H:%M')}"
                )
                # Attempt to create baseline (will be implemented properly later)
                # For now, just log
                baseline_created = await self._create_baseline_plan(today_str)
                if baseline_created:
                    _LOGGER.info(
                        f"✅ Baseline plan created in Storage Helper for {today_str}"
                    )
                else:
                    _LOGGER.warning(f"⚠️ Failed to create baseline plan for {today_str}")
            else:
                _LOGGER.debug(f"Baseline plan already exists for {today_str}")

        # PHASE 3.0: Storage Helper Integration
        # _maybe_fix_daily_plan() je zodpovědná POUZE za:
        # 1. Vytvoření baseline plánu po půlnoci (00:10-01:00)
        # 2. Fixování dnešního plánu do in-memory state
        #
        # NEPOTŘEBUJEME číst Storage tady - to se děje až v build_timeline_extended()
        # když API endpoint potřebuje data (on-demand loading)

        # Pokud už máme plán v paměti pro dnešek s intervaly, NEPŘEPISOVAT
        if (
            self._daily_plan_state
            and self._daily_plan_state.get("date") == today_str
            and len(self._daily_plan_state.get("plan", [])) > 0
        ):
            _LOGGER.debug(
                f"Daily plan for {today_str} already in memory with {len(self._daily_plan_state['plan'])} intervals, keeping it"
            )
            return

        # Je nový den? NEBO ještě nemáme dnešní plán?
        if (
            self._daily_plan_state is None
            or self._daily_plan_state.get("date") != today_str
        ):
            # Archivovat včerejší plán pokud existuje
            if self._daily_plan_state:
                yesterday_date = self._daily_plan_state.get("date")

                # NOVĚ: Uložit do archivu (max 7 dní)
                self._daily_plans_archive[yesterday_date] = (
                    self._daily_plan_state.copy()
                )

                # Vyčistit staré plány (starší než 7 dní)
                cutoff_date = (now.date() - timedelta(days=7)).strftime(DATE_FMT)
                self._daily_plans_archive = {
                    date: plan
                    for date, plan in self._daily_plans_archive.items()
                    if date >= cutoff_date
                }

                _LOGGER.info(
                    f"📦 Archived daily plan for {yesterday_date} "
                    f"(archive size: {len(self._daily_plans_archive)} days)"
                )

                # PHASE 3.1: Persist archive to storage (pro Unified Cost Tile)
                if self._plans_store:
                    try:
                        storage_data = await self._plans_store.async_load() or {}
                        storage_data["daily_archive"] = self._daily_plans_archive
                        await self._plans_store.async_save(storage_data)
                        _LOGGER.info(
                            f"💾 Saved daily plans archive to storage ({len(self._daily_plans_archive)} days)"
                        )
                    except Exception as e:
                        _LOGGER.error(
                            f"Failed to save daily plans archive: {e}", exc_info=True
                        )

            # Máme výsledek z plánovače?
            if (
                hasattr(self, "_mode_optimization_result")
                and self._mode_optimization_result
            ):
                # Použít _timeline_data pro kompletní timeline (včetně minulých intervalů)
                optimal_timeline = getattr(self, "_timeline_data", [])

                # Fallback na mode_optimization pokud _timeline_data není k dispozici
                if not optimal_timeline:
                    optimal_timeline = self._mode_optimization_result.get(
                        "optimal_timeline", []
                    )

                mode_recommendations = self._mode_optimization_result.get(
                    "mode_recommendations", []
                )

                # Filtrovat jen dnešní intervaly (00:00 - 23:45)
                today_start = datetime.combine(now.date(), datetime.min.time())
                today_start = dt_util.as_local(today_start)  # Timezone-aware
                today_end = datetime.combine(now.date(), datetime.max.time())
                today_end = dt_util.as_local(today_end)  # Timezone-aware

                today_timeline = []
                for interval in optimal_timeline:
                    if not interval.get("time"):
                        continue
                    try:
                        interval_time = datetime.fromisoformat(interval["time"])
                        if interval_time.tzinfo is None:
                            interval_time = dt_util.as_local(interval_time)
                        if today_start <= interval_time <= today_end:
                            today_timeline.append(interval)
                    except Exception:  # nosec B112
                        continue

                today_blocks = []
                for block in mode_recommendations:
                    if not block.get("from_time"):
                        continue
                    try:
                        block_time = datetime.fromisoformat(block["from_time"])
                        if block_time.tzinfo is None:
                            block_time = dt_util.as_local(block_time)
                        if today_start <= block_time <= today_end:
                            today_blocks.append(block)
                    except Exception:  # nosec B112
                        continue

                expected_total_cost = sum(i.get("net_cost", 0) for i in today_timeline)

                # ========================================
                # MEMORY STORAGE: Store plan in memory (NOT in files!)
                # Storage Helper je ONLY pro baseline plány po půlnoci
                # ========================================

                # Build plan intervals z today_timeline
                plan_intervals = []
                for interval in today_timeline:
                    plan_intervals.append(
                        {
                            "time": interval.get("timestamp"),
                            "solar_kwh": round(interval.get("solar_kwh", 0), 4),
                            "consumption_kwh": round(interval.get("load_kwh", 0), 4),
                            "battery_soc": round(interval.get("battery_soc", 0), 2),
                            "battery_capacity_kwh": round(
                                interval.get("battery_capacity_kwh", 0), 2
                            ),
                            "grid_import_kwh": round(interval.get("grid_import", 0), 4),
                            "grid_export_kwh": round(interval.get("grid_export", 0), 4),
                            "mode": interval.get("mode", 0),
                            "mode_name": interval.get("mode_name", "N/A"),
                            "spot_price": round(interval.get("spot_price", 0), 2),
                            "net_cost": round(interval.get("net_cost", 0), 2),
                        }
                    )

                # Zachovat existing actual data pokud fixujeme během dne
                existing_actual = []
                if (
                    hasattr(self, "_daily_plan_state")
                    and self._daily_plan_state
                    and self._daily_plan_state.get("date") == today_str
                ):
                    existing_actual = self._daily_plan_state.get("actual", [])
                    _LOGGER.debug(
                        f"[Fix Plan] Preserving {len(existing_actual)} existing actual intervals"
                    )

                # SIMPLE struktura (memory only!)
                self._daily_plan_state = {
                    "date": today_str,
                    "created_at": now.isoformat(),
                    "plan": plan_intervals,  # Plán intervalů pro celý dnešní den
                    "actual": existing_actual,  # Postupně se bude plnit každých 15 min
                }

                _LOGGER.info(
                    f"🎯 Fixed daily plan for {today_str}: "
                    f"{len(plan_intervals)} plan intervals, "
                    f"{len(existing_actual)} existing actual intervals, "
                    f"expected_cost={expected_total_cost:.2f} Kč"
                )

                # NO FILE SAVE - keep in memory only!
                # Storage Helper je ONLY pro baseline plány (po půlnoci)
            else:
                _LOGGER.warning(
                    f"No HYBRID optimization result available to fix daily plan for {today_str}"
                )
                # Vytvořit prázdný stav
                self._daily_plan_state = {
                    "date": today_str,
                    "created_at": now.isoformat(),
                    "plan": [],
                    "actual": [],
                }

    # ========================================================================
    # PHASE 3.0: STORAGE HELPER METHODS - Persistent Battery Plans
    # ========================================================================
    # Storage structure:
    # {
    #   "detailed": {
    #     "2025-11-06": {
    #       "created_at": "2025-11-06T00:15:00+01:00",
    #       "baseline": true,
    #       "filled_intervals": null,
    #       "intervals": [...]  # 96 intervals
    #     }
    #   },
    #   "daily": {
    #     "2025-11-05": {"planned": {...}}  # Daily aggregates
    #   },
    #   "weekly": {
    #     "2025-W45": {"planned": {...}}  # Weekly aggregates
    #   }
    # }

    async def _load_plan_from_storage(self, date_str: str) -> Optional[Dict[str, Any]]:
        """
        Load plan from Storage Helper for given date.

        Args:
            date_str: Date in YYYY-MM-DD format

        Returns:
            Plan data with 96 intervals or None if not found

        Example:
            plan = await self._load_plan_from_storage("2025-11-06")
            if plan:
                intervals = plan.get("intervals", [])  # 96 intervals
        """
        if not self._plans_store:
            _LOGGER.error("Storage Helper not initialized")
            # Fallback: Check in-memory cache
            if hasattr(self, "_in_memory_plan_cache"):
                cached = self._in_memory_plan_cache.get(date_str)
                if cached:
                    _LOGGER.warning(
                        f"Using in-memory cached plan for {date_str} "
                        f"(Storage Helper not initialized)"
                    )
                    return cached
            return None

        try:
            # Load entire storage
            data = await self._plans_store.async_load()
            if not data:
                _LOGGER.debug("No storage data found")
                # Fallback: Check in-memory cache
                if hasattr(self, "_in_memory_plan_cache"):
                    cached = self._in_memory_plan_cache.get(date_str)
                    if cached:
                        _LOGGER.warning(
                            f"Using in-memory cached plan for {date_str} "
                            f"(Storage empty)"
                        )
                        return cached
                return None

            # Get detailed plan for date
            detailed = data.get("detailed", {})
            plan = detailed.get(date_str)

            if plan:
                interval_count = len(plan.get("intervals", []))
                _LOGGER.debug(
                    f"📂 Loaded plan from Storage: date={date_str}, "
                    f"intervals={interval_count}, baseline={plan.get('baseline')}"
                )
            else:
                _LOGGER.debug(f"No plan found in Storage for {date_str}")
                # Fallback: Check in-memory cache
                if hasattr(self, "_in_memory_plan_cache"):
                    cached = self._in_memory_plan_cache.get(date_str)
                    if cached:
                        _LOGGER.warning(
                            f"Using in-memory cached plan for {date_str} "
                            f"(not in Storage)"
                        )
                        return cached

            return plan

        except Exception as e:
            _LOGGER.error(f"Error loading plan from Storage: {e}", exc_info=True)
            # Fallback: Check in-memory cache
            if hasattr(self, "_in_memory_plan_cache"):
                cached = self._in_memory_plan_cache.get(date_str)
                if cached:
                    _LOGGER.warning(
                        f"Using in-memory cached plan for {date_str} "
                        f"(Storage error)"
                    )
                    return cached
            return None

    async def _save_plan_to_storage(
        self,
        date_str: str,
        intervals: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Save plan to Storage Helper.

        Args:
            date_str: Date in YYYY-MM-DD format
            intervals: List of 96 intervals with planned values
            metadata: Optional metadata (baseline, filled_intervals, etc.)

        Returns:
            True if saved successfully

        Example:
            success = await self._save_plan_to_storage(
                "2025-11-06",
                intervals,
                {"baseline": True, "filled_intervals": "00:00-06:00"}
            )
        """
        if not self._plans_store:
            _LOGGER.error("Storage Helper not initialized")
            return False

        try:
            # Load current data
            data = await self._plans_store.async_load() or {}

            # Ensure structure
            if "detailed" not in data:
                data["detailed"] = {}
            if "daily" not in data:
                data["daily"] = {}
            if "weekly" not in data:
                data["weekly"] = {}

            # Build plan object
            plan = {
                "created_at": dt_util.now().isoformat(),
                "baseline": metadata.get("baseline", False) if metadata else False,
                "filled_intervals": (
                    metadata.get("filled_intervals") if metadata else None
                ),
                "intervals": intervals,
            }

            # Save to detailed
            data["detailed"][date_str] = plan

            # Save to storage (atomic write)
            await self._plans_store.async_save(data)

            _LOGGER.info(
                f"💾 Saved plan to Storage: date={date_str}, "
                f"intervals={len(intervals)}, baseline={plan['baseline']}"
            )
            return True

        except Exception as e:
            _LOGGER.error(f"Error saving plan to Storage: {e}", exc_info=True)

            # PHASE 3.0: Graceful degradation - fallback to in-memory cache
            if not hasattr(self, "_in_memory_plan_cache"):
                self._in_memory_plan_cache = {}

            # Store in memory as fallback
            self._in_memory_plan_cache[date_str] = {
                "created_at": dt_util.now().isoformat(),
                "baseline": metadata.get("baseline", False) if metadata else False,
                "filled_intervals": (
                    metadata.get("filled_intervals") if metadata else None
                ),
                "intervals": intervals,
            }

            _LOGGER.warning(
                f"⚠️ Stored plan in memory cache (Storage failed): "
                f"date={date_str}, intervals={len(intervals)}"
            )

            # Schedule retry in 5 minutes
            if self._hass:
                from homeassistant.helpers.event import async_call_later

                async def retry_save(now):
                    """Retry saving to Storage."""
                    _LOGGER.info(f"Retrying Storage save for {date_str}...")
                    cached_plan = self._in_memory_plan_cache.get(date_str)
                    if cached_plan:
                        success = await self._save_plan_to_storage(
                            date_str,
                            cached_plan["intervals"],
                            {
                                "baseline": cached_plan["baseline"],
                                "filled_intervals": cached_plan["filled_intervals"],
                            },
                        )
                        if success:
                            _LOGGER.info(f"✅ Retry successful for {date_str}")
                            # Remove from memory cache
                            del self._in_memory_plan_cache[date_str]
                        else:
                            _LOGGER.warning(f"Retry failed for {date_str}")

                async_call_later(self._hass, 300, retry_save)  # 5 minutes

            # Send persistent notification to user
            if self._hass:
                self._hass.components.persistent_notification.create(
                    f"Battery plan storage failed for {date_str}. "
                    f"Data is cached in memory only (will be lost on restart). "
                    f"Check disk space and permissions.",
                    title="OIG Cloud Storage Warning",
                    notification_id=f"oig_storage_fail_{date_str}",
                )

            # Return False to indicate storage failure (but data is cached)
            return False

    async def _plan_exists_in_storage(self, date_str: str) -> bool:
        """
        Check if plan exists in Storage for given date.

        Args:
            date_str: Date in YYYY-MM-DD format

        Returns:
            True if plan exists
        """
        if not self._plans_store:
            return False

        try:
            data = await self._plans_store.async_load()
            if not data:
                return False

            detailed = data.get("detailed", {})
            exists = date_str in detailed

            _LOGGER.debug(f"Plan existence check: date={date_str}, exists={exists}")
            return exists

        except Exception as e:
            _LOGGER.error(f"Error checking plan existence: {e}", exc_info=True)
            return False

    def _is_baseline_plan_invalid(self, plan: Optional[Dict[str, Any]]) -> bool:
        if not plan:
            return True

        intervals = plan.get("intervals") or []
        if len(intervals) < 90:
            return True

        filled_intervals = str(plan.get("filled_intervals") or "").strip()
        if filled_intervals in ("00:00-23:45", "00:00-23:59"):
            return True

        nonzero_consumption = sum(
            1
            for interval in intervals
            if abs(float(interval.get("consumption_kwh", 0) or 0)) > 1e-6
        )
        if nonzero_consumption < max(4, len(intervals) // 24):
            return True

        return False

    async def _create_baseline_plan(self, date_str: str) -> bool:
        """
        Create baseline plan for given date.

        This is called after first HYBRID run after midnight (00:15+).

        Process:
        1. Get HYBRID plan (future intervals from NOW onwards)
        2. Fill missing past intervals (00:00 → NOW):
           - Option A (preferred): From Recorder (historical reality)
           - Option B (fallback): Extrapolate from first HYBRID interval
        3. Merge into 96 intervals
        4. Save to Storage with baseline=True

        Args:
            date_str: Date in YYYY-MM-DD format (e.g., "2025-11-06")

        Returns:
            True if baseline created successfully
        """
        if not self._plans_store:
            _LOGGER.error("Cannot create baseline - Storage Helper not initialized")
            return False

        _LOGGER.info(f"🔨 Creating baseline plan for {date_str}")

        try:
            # PHASE 3.0: Real implementation with HYBRID + Recorder

            # 1. Get HYBRID timeline (future intervals from NOW onwards)
            # Use existing _timeline_data if available (set by async_update)
            hybrid_timeline = getattr(self, "_timeline_data", [])

            if not hybrid_timeline:
                fallback_intervals: List[Dict[str, Any]] = []

                if self._plans_store:
                    try:
                        storage_plans = await self._plans_store.async_load() or {}
                        archive_day = (
                            storage_plans.get("daily_archive", {}).get(date_str, {})
                            or {}
                        )
                        if archive_day.get("plan"):
                            fallback_intervals = archive_day.get("plan") or []
                        if not fallback_intervals:
                            detailed_day = storage_plans.get("detailed", {}).get(
                                date_str, {}
                            )
                            if detailed_day.get("intervals"):
                                fallback_intervals = detailed_day.get("intervals") or []
                    except Exception as err:
                        _LOGGER.debug(
                            "Failed to load fallback plans for %s: %s",
                            date_str,
                            err,
                        )

                if (
                    not fallback_intervals
                    and getattr(self, "_daily_plan_state", None)
                    and self._daily_plan_state.get("date") == date_str
                ):
                    fallback_intervals = self._daily_plan_state.get("plan") or []

                if fallback_intervals:
                    fallback_plan = {
                        "intervals": fallback_intervals,
                        "filled_intervals": None,
                    }
                    if not self._is_baseline_plan_invalid(fallback_plan):
                        _LOGGER.info(
                            "Using fallback plan to create baseline for %s",
                            date_str,
                        )
                        return await self._save_plan_to_storage(
                            date_str,
                            fallback_intervals,
                            {"baseline": True, "filled_intervals": None},
                        )

                _LOGGER.warning(
                    "No HYBRID timeline available - cannot create baseline plan"
                )
                return False

            _LOGGER.debug(
                f"Using HYBRID timeline with {len(hybrid_timeline)} intervals"
            )

            # 2. Determine date range for baseline (00:00 - 23:45)
            date_obj = datetime.strptime(date_str, DATE_FMT).date()
            day_start = datetime.combine(date_obj, datetime.min.time())
            day_start = dt_util.as_local(day_start)  # Make timezone-aware

            # 3. Build 96 intervals
            intervals = []
            filled_count = 0
            first_hybrid_time = None

            for i in range(96):
                interval_start = day_start + timedelta(minutes=i * 15)
                interval_time_str = interval_start.strftime("%H:%M")

                # Try to find matching interval in HYBRID timeline
                hybrid_interval = None
                for hi in hybrid_timeline:
                    hi_time_str = hi.get("time") or hi.get("timestamp", "")
                    if not hi_time_str:
                        continue

                    # Parse time (can be HH:MM or ISO format)
                    try:
                        if "T" in hi_time_str:
                            # ISO format
                            hi_dt = datetime.fromisoformat(hi_time_str)
                            if hi_dt.tzinfo is None:
                                hi_dt = dt_util.as_local(hi_dt)
                            hi_time_only = hi_dt.strftime("%H:%M")
                        else:
                            # Just time HH:MM
                            hi_time_only = hi_time_str

                        if hi_time_only == interval_time_str:
                            hybrid_interval = hi
                            if first_hybrid_time is None:
                                first_hybrid_time = interval_time_str
                            break
                    except Exception:  # nosec B112
                        continue

                # Build interval
                if hybrid_interval:
                    # Use HYBRID data (planned values)
                    interval = {
                        "time": interval_time_str,
                        "solar_kwh": round(hybrid_interval.get("solar_kwh", 0), 4),
                        "consumption_kwh": round(hybrid_interval.get("load_kwh", 0), 4),
                        "battery_soc": round(
                            hybrid_interval.get("battery_soc", 50.0), 2
                        ),
                        "battery_kwh": round(
                            hybrid_interval.get("battery_capacity_kwh", 7.68), 2
                        ),
                        "grid_import_kwh": round(
                            hybrid_interval.get("grid_import", 0), 4
                        ),
                        "grid_export_kwh": round(
                            hybrid_interval.get("grid_export", 0), 4
                        ),
                        "mode": hybrid_interval.get("mode", 2),
                        "mode_name": hybrid_interval.get("mode_name", "HOME III"),
                        "spot_price": round(hybrid_interval.get("spot_price", 3.45), 2),
                        "net_cost": round(hybrid_interval.get("net_cost", 0), 2),
                    }
                else:
                    # Missing interval - try to fill from Recorder (historical reality)
                    # This happens for intervals before HYBRID started (00:00 → NOW)
                    interval_end = interval_start + timedelta(minutes=15)

                    # Try to fetch from history
                    historical_data = await history_module.fetch_interval_from_history(
                        self, interval_start, interval_end
                    )

                    if historical_data:
                        # Use reality as baseline for missing past intervals
                        interval = {
                            "time": interval_time_str,
                            "solar_kwh": round(historical_data.get("solar_kwh", 0), 4),
                            "consumption_kwh": round(
                                historical_data.get("consumption_kwh", 0.065), 4
                            ),
                            "battery_soc": round(
                                historical_data.get("battery_soc", 50.0), 2
                            ),
                            "battery_kwh": round(
                                historical_data.get("battery_kwh", 7.68), 2
                            ),
                            "grid_import_kwh": round(
                                historical_data.get("grid_import_kwh", 0), 4
                            ),
                            "grid_export_kwh": round(
                                historical_data.get("grid_export_kwh", 0), 4
                            ),
                            "mode": historical_data.get("mode", 2),
                            "mode_name": historical_data.get("mode_name", "HOME III"),
                            "spot_price": round(
                                historical_data.get("spot_price", 3.45), 2
                            ),
                            "net_cost": round(historical_data.get("net_cost", 0), 2),
                        }
                        filled_count += 1
                    else:
                        # Fallback: Extrapolate from first HYBRID interval
                        # or use defaults if HYBRID not available yet
                        first_soc = 50.0
                        first_mode = 2
                        first_mode_name = "HOME III"

                        if hybrid_timeline:
                            first_hi = hybrid_timeline[0]
                            first_soc = first_hi.get("battery_soc", 50.0)
                            first_mode = first_hi.get("mode", 2)
                            first_mode_name = first_hi.get("mode_name", "HOME III")

                        interval = {
                            "time": interval_time_str,
                            "solar_kwh": 0.0,
                            "consumption_kwh": 0.065,
                            "battery_soc": round(first_soc, 2),
                            "battery_kwh": round((first_soc / 100.0) * 15.36, 2),
                            "grid_import_kwh": 0.065,
                            "grid_export_kwh": 0.0,
                            "mode": first_mode,
                            "mode_name": first_mode_name,
                            "spot_price": 3.45,
                            "net_cost": 0.22,
                        }
                        filled_count += 1

                intervals.append(interval)

            # Track which intervals were filled
            filled_intervals_str = None
            if filled_count > 0 and first_hybrid_time:
                # Calculate filled range (00:00 → first_hybrid_time)
                filled_intervals_str = f"00:00-{first_hybrid_time}"

            _LOGGER.info(
                f"Baseline plan built: {len(intervals)} intervals, "
                f"{len(intervals) - filled_count} from HYBRID, "
                f"{filled_count} filled from Recorder/extrapolation"
            )

            # Save to storage
            success = await self._save_plan_to_storage(
                date_str,
                intervals,
                {
                    "baseline": True,
                    "filled_intervals": filled_intervals_str,
                },
            )

            if success:
                _LOGGER.info(
                    f"✅ Baseline plan created: date={date_str}, "
                    f"intervals={len(intervals)}, filled={filled_intervals_str}"
                )
            else:
                _LOGGER.error(f"Failed to save baseline plan for {date_str}")

            return success

        except Exception as e:
            _LOGGER.error(
                f"Error creating baseline plan for {date_str}: {e}", exc_info=True
            )
            return False

    async def ensure_plan_exists(self, date_str: str) -> bool:
        """
        Guarantee that a plan exists for given date.

        Phase 3.0: Edge Case - Plan Availability Guarantee

        This is the main entry point for ensuring plan data availability.
        Called by API endpoints and other components that need plan data.

        Strategy:
        1. Check Storage Helper - if exists, done ✅
        2. Check current time:
           - If midnight window (00:10-01:00): Create baseline
           - If retry windows (06:00, 12:00): Create baseline
           - Otherwise: Create emergency baseline
        3. If all fails: Return False (caller must handle gracefully)

        Args:
            date_str: Date in YYYY-MM-DD format

        Returns:
            True if plan exists or was created successfully

        Example:
            if not await self.ensure_plan_exists("2025-11-06"):
                return {"error": "Plan unavailable"}
        """
        # 1. Check if plan already exists
        exists = await self._plan_exists_in_storage(date_str)
        if exists:
            _LOGGER.debug(f"Plan exists for {date_str}")
            return True

        _LOGGER.warning(f"Plan missing for {date_str}, attempting to create...")

        # 2. Determine creation strategy based on current time
        now = dt_util.now()
        today_str = now.strftime(DATE_FMT)

        # Only create plan for today (not future/past dates)
        if date_str != today_str:
            _LOGGER.warning(
                f"Cannot create plan for {date_str} (not today {today_str})"
            )
            return False

        # 3. Scheduled baseline windows
        current_hour = now.hour
        current_minute = now.minute

        # Midnight window (00:10-01:00)
        if current_hour == 0 and 10 <= current_minute < 60:
            _LOGGER.info(f"⏰ Midnight baseline window - creating plan for {date_str}")
            return await self._create_baseline_plan(date_str)

        # Retry windows (06:00-06:10, 12:00-12:10)
        if (current_hour == 6 and current_minute < 10) or (
            current_hour == 12 and current_minute < 10
        ):
            _LOGGER.info(
                f"⏰ Retry window ({current_hour:02d}:{current_minute:02d}) - "
                f"creating plan for {date_str}"
            )
            return await self._create_baseline_plan(date_str)

        # 4. Emergency: Create baseline anytime during the day
        _LOGGER.warning(
            f"🚨 Emergency baseline creation at {now.strftime('%H:%M')} for {date_str}"
        )
        success = await self._create_baseline_plan(date_str)

        if success:
            _LOGGER.info(f"✅ Emergency baseline created for {date_str}")
        else:
            _LOGGER.error(f"❌ Failed to create emergency baseline for {date_str}")

        return success

    # ========================================================================
    # PHASE 3.0: DAILY & WEEKLY AGGREGATION
    # ========================================================================

    async def _aggregate_daily(self, date_str: str) -> bool:
        """
        Aggregate daily plan into daily summary.

        Called every day at 00:05 to summarize YESTERDAY's plan.

        Process:
        1. Load yesterday's detailed plan (96 intervals)
        2. Calculate aggregates:
           - Total: cost, solar, consumption, grid_import, grid_export
           - Average: battery_soc
           - Min/Max: battery_soc
        3. Save to daily section
        4. Delete detailed plan older than 7 days

        Args:
            date_str: Date to aggregate (YYYY-MM-DD), typically yesterday

        Returns:
            True if aggregation successful
        """
        if not self._plans_store:
            _LOGGER.error("Cannot aggregate - Storage Helper not initialized")
            return False

        _LOGGER.info(f"📊 Aggregating daily plan for {date_str}")

        try:
            # 1. Load detailed plan
            plan = await self._load_plan_from_storage(date_str)
            if not plan:
                _LOGGER.warning(
                    f"No detailed plan found for {date_str}, skipping aggregation"
                )
                return False

            intervals = plan.get("intervals", [])
            if not intervals:
                _LOGGER.warning(f"Empty intervals for {date_str}, skipping aggregation")
                return False

            # 2. Calculate aggregates
            total_cost = sum(iv.get("net_cost", 0) for iv in intervals)
            total_solar = sum(iv.get("solar_kwh", 0) for iv in intervals)
            total_consumption = sum(iv.get("consumption_kwh", 0) for iv in intervals)
            total_grid_import = sum(iv.get("grid_import_kwh", 0) for iv in intervals)
            total_grid_export = sum(iv.get("grid_export_kwh", 0) for iv in intervals)

            soc_values = [
                iv.get("battery_soc", 0)
                for iv in intervals
                if iv.get("battery_soc") is not None
            ]
            avg_battery_soc = sum(soc_values) / len(soc_values) if soc_values else 0
            min_battery_soc = min(soc_values) if soc_values else 0
            max_battery_soc = max(soc_values) if soc_values else 0

            daily_aggregate = {
                "planned": {
                    "total_cost": round(total_cost, 2),
                    "total_solar": round(total_solar, 2),
                    "total_consumption": round(total_consumption, 2),
                    "total_grid_import": round(total_grid_import, 2),
                    "total_grid_export": round(total_grid_export, 2),
                    "avg_battery_soc": round(avg_battery_soc, 1),
                    "min_battery_soc": round(min_battery_soc, 1),
                    "max_battery_soc": round(max_battery_soc, 1),
                }
            }

            # 3. Save to Storage
            data = await self._plans_store.async_load() or {}
            if "daily" not in data:
                data["daily"] = {}

            data["daily"][date_str] = daily_aggregate
            await self._plans_store.async_save(data)

            _LOGGER.info(
                f"✅ Daily aggregate saved for {date_str}: "
                f"cost={total_cost:.2f} Kč, solar={total_solar:.2f} kWh, "
                f"consumption={total_consumption:.2f} kWh"
            )

            # 4. Cleanup: Delete detailed plans older than 7 days
            cutoff_date = (
                datetime.strptime(date_str, DATE_FMT).date() - timedelta(days=7)
            ).strftime(DATE_FMT)

            detailed = data.get("detailed", {})
            dates_to_delete = [d for d in detailed.keys() if d < cutoff_date]

            if dates_to_delete:
                for old_date in dates_to_delete:
                    del data["detailed"][old_date]
                    _LOGGER.debug(
                        f"🗑️ Deleted detailed plan for {old_date} (>7 days old)"
                    )

                await self._plans_store.async_save(data)
                _LOGGER.info(f"Cleaned up {len(dates_to_delete)} old detailed plans")

            return True

        except Exception as e:
            _LOGGER.error(
                f"Error aggregating daily plan for {date_str}: {e}", exc_info=True
            )
            return False

    async def _aggregate_weekly(
        self, week_str: str, start_date: str, end_date: str
    ) -> bool:
        """
        Aggregate weekly plan into weekly summary.

        Called every Sunday at 23:55 to summarize last week's daily plans.

        Process:
        1. Load daily plans for Mon-Sun (7 days)
        2. Calculate weekly totals (sum of daily totals)
        3. Save to weekly section
        4. Delete daily plans older than 30 days
        5. Delete weekly plans older than 52 weeks

        Args:
            week_str: Week identifier (e.g., "2025-W45")
            start_date: Week start date (YYYY-MM-DD), Monday
            end_date: Week end date (YYYY-MM-DD), Sunday

        Returns:
            True if aggregation successful
        """
        if not self._plans_store:
            _LOGGER.error("Cannot aggregate - Storage Helper not initialized")
            return False

        _LOGGER.info(
            f"📊 Aggregating weekly plan for {week_str} ({start_date} to {end_date})"
        )

        try:
            # 1. Load daily plans for the week
            data = await self._plans_store.async_load() or {}
            daily_plans = data.get("daily", {})

            # Get all days in week range
            start = datetime.strptime(start_date, DATE_FMT).date()
            end = datetime.strptime(end_date, DATE_FMT).date()

            week_days = []
            current = start
            while current <= end:
                day_str = current.strftime(DATE_FMT)
                if day_str in daily_plans:
                    week_days.append(daily_plans[day_str])
                current += timedelta(days=1)

            if not week_days:
                _LOGGER.warning(
                    f"No daily plans found for {week_str}, skipping aggregation"
                )
                return False

            # 2. Calculate weekly totals - PHASE 3.0 FIX: Use safe_nested_get
            total_cost = sum(
                safe_nested_get(day, "planned", "total_cost", default=0)
                for day in week_days
            )
            total_solar = sum(
                safe_nested_get(day, "planned", "total_solar", default=0)
                for day in week_days
            )
            total_consumption = sum(
                safe_nested_get(day, "planned", "total_consumption", default=0)
                for day in week_days
            )
            total_grid_import = sum(
                safe_nested_get(day, "planned", "total_grid_import", default=0)
                for day in week_days
            )
            total_grid_export = sum(
                safe_nested_get(day, "planned", "total_grid_export", default=0)
                for day in week_days
            )

            weekly_aggregate = {
                "start_date": start_date,
                "end_date": end_date,
                "days_count": len(week_days),
                "planned": {
                    "total_cost": round(total_cost, 2),
                    "total_solar": round(total_solar, 2),
                    "total_consumption": round(total_consumption, 2),
                    "total_grid_import": round(total_grid_import, 2),
                    "total_grid_export": round(total_grid_export, 2),
                },
            }

            # 3. Save to Storage
            if "weekly" not in data:
                data["weekly"] = {}

            data["weekly"][week_str] = weekly_aggregate
            await self._plans_store.async_save(data)

            _LOGGER.info(
                f"✅ Weekly aggregate saved for {week_str}: "
                f"cost={total_cost:.2f} Kč, solar={total_solar:.2f} kWh, "
                f"{len(week_days)} days"
            )

            # 4. Cleanup: Delete daily plans older than 30 days
            cutoff_daily = (
                datetime.strptime(end_date, DATE_FMT).date() - timedelta(days=30)
            ).strftime(DATE_FMT)

            daily_to_delete = [d for d in daily_plans.keys() if d < cutoff_daily]

            if daily_to_delete:
                for old_date in daily_to_delete:
                    del data["daily"][old_date]
                    _LOGGER.debug(f"🗑️ Deleted daily plan for {old_date} (>30 days old)")

                _LOGGER.info(f"Cleaned up {len(daily_to_delete)} old daily plans")

            # 5. Cleanup: Delete weekly plans older than 52 weeks
            weekly_plans = data.get("weekly", {})

            # Parse week numbers and delete old ones
            current_year_week = datetime.now().isocalendar()[:2]  # (year, week)
            cutoff_week_number = current_year_week[1] - 52
            cutoff_year = (
                current_year_week[0]
                if cutoff_week_number > 0
                else current_year_week[0] - 1
            )

            weekly_to_delete = []
            for week_key in weekly_plans.keys():
                try:
                    # Parse "2025-W45" format
                    year, week = week_key.split("-W")
                    year, week = int(year), int(week)

                    # Simple check: if year is older or (same year but week older)
                    if year < cutoff_year or (
                        year == cutoff_year and week < cutoff_week_number
                    ):
                        weekly_to_delete.append(week_key)
                except Exception:  # nosec B112
                    continue

            if weekly_to_delete:
                for old_week in weekly_to_delete:
                    del data["weekly"][old_week]
                    _LOGGER.debug(
                        f"🗑️ Deleted weekly plan for {old_week} (>52 weeks old)"
                    )

                _LOGGER.info(f"Cleaned up {len(weekly_to_delete)} old weekly plans")

            # Save cleanup changes
            if daily_to_delete or weekly_to_delete:
                await self._plans_store.async_save(data)

            return True

        except Exception as e:
            _LOGGER.error(
                f"Error aggregating weekly plan for {week_str}: {e}", exc_info=True
            )
            return False

    async def _precompute_ui_data(self) -> None:
        """
        Precompute UI data (detail_tabs + unified_cost_tile) and save to storage.

        PHASE 3.5: Performance Optimization
        - Called every 15 min after forecast update
        - Saves precomputed data to ~/.storage/oig_cloud_precomputed_data_{box_id}.json
        - API endpoints read from storage → instant response (< 100ms)
        - Eliminates 4s wait time for build_detail_tabs() + build_unified_cost_tile()
        """
        await precompute_module.precompute_ui_data(self)

    def _schedule_precompute(self, force: bool = False) -> None:
        """Schedule precompute job with throttling."""
        precompute_module.schedule_precompute(self, force=force)



    async def build_timeline_extended(self) -> Dict[str, Any]:
        """
        Postavit rozšířenou timeline strukturu pro API.

        Phase 2.9: Timeline Extended Builder
        - Kombinuje historická data (včera) + mixed (dnes) + plánovaná (zítra)
        - Používá daily_plan_state pro historical tracking
        - Používá plánovač pro planned data
        - PHASE 3.0: Načítá Storage Helper data pro včerejší baseline plan

        Returns:
            Dict s yesterday/today/tomorrow sekcemi + today_tile_summary
        """
        return await timeline_extended_module.build_timeline_extended(
            self, mode_names=CBB_MODE_NAMES
        )

    async def _build_day_timeline(
        self, day: date, storage_plans: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        return await timeline_extended_module.build_day_timeline(
            self, day, storage_plans, mode_names=CBB_MODE_NAMES
        )

    async def build_detail_tabs(
        self, tab: Optional[str] = None, plan: str = "hybrid"
    ) -> Dict[str, Any]:
        """
        Build Detail Tabs data (aggregated mode blocks).
        """
        return await detail_tabs_module.build_detail_tabs(
            self, tab=tab, plan=plan, mode_names=CBB_MODE_NAMES
        )

    def _decorate_plan_tabs(
        self,
        primary_tabs: Dict[str, Any],
        secondary_tabs: Dict[str, Any],
        primary_plan: str,
        secondary_plan: str,
    ) -> Dict[str, Any]:
        """Attach metadata and optional comparison blocks to plan tabs."""

        result: Dict[str, Any] = {}

        for key, tab_data in primary_tabs.items():
            tab_copy = {
                "date": tab_data.get("date"),
                "mode_blocks": copy.deepcopy(tab_data.get("mode_blocks", [])),
                "summary": copy.deepcopy(tab_data.get("summary", {})),
                "intervals": copy.deepcopy(tab_data.get("intervals", [])),
            }

            metadata = tab_data.get("metadata", {}).copy()
            metadata["active_plan"] = primary_plan
            metadata["comparison_plan_available"] = (
                secondary_plan if secondary_tabs.get(key) else None
            )
            tab_copy["metadata"] = metadata

            comparison_source = secondary_tabs.get(key)
            if comparison_source:
                has_current = any(
                    block.get("status") == "current"
                    for block in tab_copy.get("mode_blocks", [])
                )
                if not has_current:
                    comparison_blocks = [
                        block
                        for block in comparison_source.get("mode_blocks", [])
                        if block.get("status") in ("current", "planned")
                    ]
                    if comparison_blocks:
                        tab_copy["comparison"] = {
                            "plan": secondary_plan,
                            "mode_blocks": comparison_blocks,
                        }

            result[key] = tab_copy

        return result

    def _schedule_forecast_retry(self, delay_seconds: float) -> None:
        if not self._hass or delay_seconds <= 0:
            return
        if self._forecast_retry_unsub:
            return

        def _retry(now: datetime) -> None:
            self._forecast_retry_unsub = None
            self._create_task_threadsafe(self.async_update)

        self._forecast_retry_unsub = async_call_later(self._hass, delay_seconds, _retry)

    def _create_task_threadsafe(self, coro_func, *args) -> None:
        """Create an HA task safely from any thread without leaking an un-awaited coroutine."""
        hass = getattr(self, "_hass", None) or getattr(self, "hass", None)
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

    async def build_unified_cost_tile(self) -> Dict[str, Any]:
        """
        Build Unified Cost Tile data.

        Phase V2: PLAN_VS_ACTUAL_UX_REDESIGN_V2.md - Fáze 1 (UCT-BE-001 až UCT-BE-004)
        Consolidates 2 cost tiles into one with today/yesterday/tomorrow context.

        Cache: 60s TTL - prevents repeated slow API calls on page refresh.

        Returns:
            Dict with today/yesterday/tomorrow cost data:
            {
                "today": {
                    "plan_total_cost": 45.50,
                    "actual_total_cost": 42.30,
                    "delta": -3.20,
                    "performance": "better",  # better/worse/on_plan
                    "completed_intervals": 32,
                    "total_intervals": 96,
                    "progress_pct": 33,
                    "eod_prediction": {
                        "predicted_total": 128.50,
                        "vs_plan": -4.50,
                        "confidence": "medium"
                    }
                },
                "yesterday": {
                    "plan_total_cost": 125.00,
                    "actual_total_cost": 118.50,
                    "delta": -6.50,
                    "performance": "better"
                },
                "tomorrow": {
                    "plan_total_cost": 135.00
                }
            }
        """
        return await unified_cost_tile_module.build_unified_cost_tile(
            self, mode_names=CBB_MODE_NAMES
        )

    def _group_intervals_by_mode(
        self, intervals: List[Dict[str, Any]], data_type: str = "both"
    ) -> List[Dict[str, Any]]:
        """
        Seskupit intervaly podle režimu do časových bloků.

        Args:
            intervals: Seznam intervalů
            data_type: "completed" (má actual), "planned" (jen plan), "both" (oboje)

        Returns:
            Seznam skupin [{mode, start_time, end_time, interval_count, costs...}]
        """
        if not intervals:
            return []

        groups = []
        current_group = None

        for interval in intervals:
            # Skip None intervals
            if interval is None:
                continue

            # Určit režim podle data_type
            if data_type == "completed":
                actual = interval.get("actual") or {}
                planned = interval.get("planned") or {}
                actual_mode = actual.get("mode")
                planned_mode = planned.get("mode")
                # Pro completed: použít actual mode, fallback na planned
                if actual_mode is not None:
                    mode = actual_mode
                elif planned_mode is not None:
                    mode = planned_mode
                else:
                    mode = "Unknown"
                # Log prvních 3 intervalů pro debug
                if len(groups) < 3:
                    _LOGGER.info(
                        f"[_group_intervals_by_mode] COMPLETED: time={interval.get('time', '?')[:16]}, "
                        f"actual_mode={actual_mode}, planned_mode={planned_mode}, final_mode={mode}, "
                        f"has_actual={bool(actual)}"
                    )
            elif data_type == "planned":
                planned = interval.get("planned") or {}
                mode = planned.get("mode", "Unknown")
            else:  # both - priorita actual, fallback na planned
                actual = interval.get("actual") or {}
                planned = interval.get("planned") or {}
                # POZOR: 0 je validní mode, nesmíme použít simple `or`!
                actual_mode = actual.get("mode")
                planned_mode = planned.get("mode")
                if actual_mode is not None:
                    mode = actual_mode
                elif planned_mode is not None:
                    mode = planned_mode
                else:
                    mode = "Unknown"
                _LOGGER.debug(
                    f"[_group_intervals_by_mode] data_type=both: "
                    f"actual_mode={actual_mode}, planned_mode={planned_mode}, final_mode={mode}"
                )

            # Převést mode ID na jméno (mode může být int nebo string)
            if isinstance(mode, int):
                mode = CBB_MODE_NAMES.get(mode, f"Mode {mode}")
            elif mode != "Unknown":
                mode = str(mode).strip()

            # Fallback pokud je mode prázdný
            if not mode or mode == "":
                mode = "Unknown"

            # Nová skupina nebo pokračování?
            if not current_group or current_group["mode"] != mode:
                current_group = {
                    "mode": mode,
                    "start_time": interval.get("time", ""),
                    "end_time": interval.get("time", ""),
                    "intervals": [interval],
                }
                groups.append(current_group)
            else:
                current_group["intervals"].append(interval)
                current_group["end_time"] = interval.get("time", "")

        # Agregovat náklady pro každou skupinu
        for group in groups:
            interval_count = len(group["intervals"])
            group["interval_count"] = interval_count

            if data_type in ["completed", "both"]:
                # Actual cost POUZE z intervalů, které už nastaly (mají actual data)
                actual_cost = sum(
                    iv.get("actual", {}).get("net_cost", 0)
                    for iv in group["intervals"]
                    if iv.get("actual") is not None
                )
                planned_cost = sum(
                    (iv.get("planned") or {}).get("net_cost", 0)
                    for iv in group["intervals"]
                )
                actual_savings = sum(
                    iv.get("actual", {}).get("savings_vs_home_i", 0)
                    for iv in group["intervals"]
                    if iv.get("actual") is not None
                )
                planned_savings = sum(
                    (iv.get("planned") or {}).get("savings_vs_home_i", 0)
                    for iv in group["intervals"]
                )
                delta = actual_cost - planned_cost
                delta_pct = (delta / planned_cost * 100) if planned_cost > 0 else 0.0

                group["actual_cost"] = round(actual_cost, 2)
                group["planned_cost"] = round(planned_cost, 2)
                group["actual_savings"] = round(actual_savings, 2)
                group["planned_savings"] = round(planned_savings, 2)
                group["delta"] = round(delta, 2)
                group["delta_pct"] = round(delta_pct, 1)

            if data_type == "planned":
                # Jen plánovaná data
                planned_cost = sum(
                    (iv.get("planned") or {}).get("net_cost", 0)
                    for iv in group["intervals"]
                )
                planned_savings = sum(
                    (iv.get("planned") or {}).get("savings_vs_home_i", 0)
                    for iv in group["intervals"]
                )
                group["planned_cost"] = round(planned_cost, 2)
                group["planned_savings"] = round(planned_savings, 2)

            # Formátovat časy
            if group["start_time"]:
                try:
                    start_dt = datetime.fromisoformat(group["start_time"])
                    group["start_time"] = start_dt.strftime("%H:%M")
                except Exception:  # nosec B110
                    pass

            if group["end_time"]:
                try:
                    end_dt = datetime.fromisoformat(group["end_time"])
                    # Přidat 15 minut pro konec intervalu
                    end_dt = end_dt + timedelta(minutes=15)
                    group["end_time"] = end_dt.strftime("%H:%M")
                except Exception:  # nosec B110
                    pass

            # PHASE 3.0: KEEP intervals for Detail Tabs API
            # Původně se mazaly pro úsporu paměti, ale Detail Tabs je potřebuje
            # del group["intervals"]

        return groups






    async def _backfill_daily_archive_from_storage(self) -> None:
        """
        Backfill daily plans archive from storage detailed plans.

        PHASE 3.1: Zpětné doplnění archivu z již uložených daily plans.
        Použije se při startu, pokud archiv chybí (např. po restartu před implementací persistence).
        """
        if not self._plans_store:
            _LOGGER.warning("Cannot backfill - no storage helper")
            return

        try:
            storage_data = await self._plans_store.async_load() or {}
            detailed_plans = storage_data.get("detailed", {})

            if not detailed_plans:
                _LOGGER.info("No detailed plans in storage - nothing to backfill")
                return

            now = dt_util.now()

            # Backfill posledních 7 dní (kromě dneška)
            backfilled_count = 0
            for days_ago in range(1, 8):  # 1-7 dní zpátky
                date = (now.date() - timedelta(days=days_ago)).strftime(DATE_FMT)

                # Skip if already in archive
                if date in self._daily_plans_archive:
                    continue

                # Check if we have this date in detailed plans
                if date in detailed_plans:
                    plan_data = detailed_plans[date]
                    intervals = plan_data.get("intervals", [])

                    # Build daily_plan_state structure from detailed plan
                    self._daily_plans_archive[date] = {
                        "date": date,
                        "plan": intervals,
                        "actual": intervals,  # Pro starší dny nemáme rozlišení plan vs actual
                        "created_at": plan_data.get("created_at"),
                    }
                    backfilled_count += 1
                    _LOGGER.debug(
                        f"Backfilled archive for {date} from storage ({len(intervals)} intervals)"
                    )

            if backfilled_count > 0:
                _LOGGER.info(f"✅ Backfilled {backfilled_count} days into archive")

                # Save updated archive back to storage
                storage_data["daily_archive"] = self._daily_plans_archive
                await self._plans_store.async_save(storage_data)
                _LOGGER.info("💾 Saved backfilled archive to storage")
            else:
                _LOGGER.debug("No days needed backfilling")

        except Exception as e:
            _LOGGER.error(f"Failed to backfill daily archive: {e}", exc_info=True)










    def _get_battery_efficiency(self) -> float:
        """
        Získat aktuální efektivitu baterie z battery_efficiency sensoru.

        Returns:
            Efektivita jako desetinné číslo (0.882 pro 88.2%)
            Fallback na 0.882 pokud sensor není k dispozici
        """
        if not self._hass:
            _LOGGER.debug("HASS not available, using fallback efficiency 0.882")
            return 0.882

        sensor_id = f"sensor.oig_{self._box_id}_battery_efficiency"
        state = self._hass.states.get(sensor_id)

        if not state or state.state in ["unknown", "unavailable"]:
            # Zakomentováno: Spamuje logy během výpočtu
            # _LOGGER.debug(
            #     f"Battery efficiency sensor {sensor_id} not available, using fallback 0.882"
            # )
            return 0.882

        try:
            # State je v %, převést na desetinné číslo
            efficiency_pct = float(state.state)
            efficiency = efficiency_pct / 100.0

            # Sanity check
            if efficiency < 0.70 or efficiency > 1.0:
                _LOGGER.warning(
                    f"Unrealistic efficiency {efficiency:.3f} ({efficiency_pct}%), using fallback 0.882"
                )
                return 0.882

            # Zakomentováno: Spamuje logy během výpočtu
            # _LOGGER.debug(
            #     f"Using battery efficiency: {efficiency:.3f} ({efficiency_pct}%)"
            # )
            return efficiency

        except (ValueError, TypeError) as e:
            _LOGGER.error(f"Error parsing battery efficiency: {e}")
            return 0.882

    def _get_ac_charging_limit_kwh_15min(self) -> float:
        """
        Získat AC charging limit pro 15min interval z configu.

        Config obsahuje home_charge_rate v kW (hodinový výkon).
        Pro 15min interval: kW / 4 = kWh per 15min

        Example: home_charge_rate = 2.8 kW → 0.7 kWh/15min

        Returns:
            AC charging limit v kWh pro 15min interval
            Default: 2.8 kW → 0.7 kWh/15min
        """
        config = self._config_entry.options if self._config_entry else {}
        charging_power_kw = config.get("home_charge_rate", 2.8)

        # Convert kW to kWh/15min
        limit_kwh_15min = charging_power_kw / 4.0

        # Zakomentováno: Spamuje logy během výpočtu
        # _LOGGER.debug(
        #     f"AC charging limit: {charging_power_kw} kW → {limit_kwh_15min} kWh/15min"
        # )

        return limit_kwh_15min

    def _get_current_mode(self) -> int:
        """
        Získat aktuální CBB režim ze sensoru.

        Čte: sensor.oig_{box_id}_box_prms_mode

        Returns:
            Mode number (0=HOME I, 1=HOME II, 2=HOME III, 3=HOME UPS)
            Default: CBB_MODE_HOME_III (2) pokud sensor není k dispozici
        """
        if not self._hass:
            _LOGGER.debug("HASS not available, using fallback mode HOME III")
            return CBB_MODE_HOME_III

        sensor_id = f"sensor.oig_{self._box_id}_box_prms_mode"
        state = self._hass.states.get(sensor_id)

        if not state or state.state in ["unknown", "unavailable"]:
            _LOGGER.debug(
                f"Mode sensor {sensor_id} not available, using fallback HOME III"
            )
            return CBB_MODE_HOME_III

        try:
            # Sensor může vracet buď int (0-3) nebo string ("Home 1", "Home I", ...)
            mode_value = state.state

            # Pokud je to string, převést na int
            if isinstance(mode_value, str):
                # Mapování string → int (podporuje obě varianty: "Home 1" i "Home I")
                mode_map = {
                    MODE_LABEL_HOME_I: CBB_MODE_HOME_I,
                    MODE_LABEL_HOME_II: CBB_MODE_HOME_II,
                    MODE_LABEL_HOME_III: CBB_MODE_HOME_III,
                    MODE_LABEL_HOME_UPS: CBB_MODE_HOME_UPS,
                    SERVICE_MODE_HOME_1: CBB_MODE_HOME_I,
                    SERVICE_MODE_HOME_2: CBB_MODE_HOME_II,
                    SERVICE_MODE_HOME_3: CBB_MODE_HOME_III,
                    SERVICE_MODE_HOME_5: CBB_MODE_HOME_I,
                    SERVICE_MODE_HOME_6: CBB_MODE_HOME_I,
                }

                if mode_value in mode_map:
                    mode = mode_map[mode_value]
                else:
                    # Zkusit parse jako int
                    mode = int(mode_value)
            else:
                mode = int(mode_value)

            # Validate mode range; Home 5/6 map to HOME I for simulation.
            if mode in (4, 5):
                return CBB_MODE_HOME_I
            if mode not in (
                CBB_MODE_HOME_I,
                CBB_MODE_HOME_II,
                CBB_MODE_HOME_III,
                CBB_MODE_HOME_UPS,
            ):
                _LOGGER.warning(f"Invalid mode {mode}, using fallback HOME III")
                return CBB_MODE_HOME_III

            mode_name = CBB_MODE_NAMES.get(mode, f"UNKNOWN_{mode}")
            _LOGGER.debug(f"Current CBB mode: {mode_name} ({mode})")

            return mode

        except (ValueError, TypeError) as e:
            _LOGGER.error(f"Error parsing CBB mode from '{state.state}': {e}")
            return CBB_MODE_HOME_III

    def _get_boiler_available_capacity(self) -> float:
        """
        Zjistit kolik kWh může bojler přijmout v 15min intervalu.

        Phase 2.5: Boiler support pro přebytkovou energii.

        Pokud je boiler_is_use=on, CBB firmware automaticky směřuje přebytky do bojleru
        až do výše boiler_install_power (kW limit).

        Returns:
            kWh capacity for 15min interval (0 pokud bojler není aktivní)
        """
        if not self._hass:
            return 0.0

        # Check if boiler usage is enabled
        boiler_use_sensor = f"sensor.oig_{self._box_id}_boiler_is_use"
        state = self._hass.states.get(boiler_use_sensor)

        if not state or state.state not in ["on", "1", "true"]:
            # Boiler not active
            return 0.0

        # Get boiler power limit (kW)
        boiler_power_sensor = f"sensor.oig_{self._box_id}_boiler_install_power"
        power_state = self._hass.states.get(boiler_power_sensor)

        if not power_state:
            _LOGGER.warning(
                f"Boiler is enabled but {boiler_power_sensor} not found, using default 2.8 kW"
            )
            # Default to typical 2.8 kW limit (same as AC charging)
            return 0.7  # kWh/15min

        try:
            power_kw = float(power_state.state)
            # Convert kW to kWh/15min
            capacity_kwh_15min = power_kw / 4.0

            _LOGGER.debug(
                f"Boiler available: {power_kw} kW → {capacity_kwh_15min} kWh/15min"
            )

            return capacity_kwh_15min

        except (ValueError, TypeError) as e:
            _LOGGER.warning(f"Error parsing boiler power: {e}, using default 0.7 kWh")
            return 0.7  # Fallback

    def _calculate_final_spot_price(
        self, raw_spot_price: float, target_datetime: datetime
    ) -> float:
        """
        Vypočítat finální spotovou cenu včetně obchodní přirážky, distribuce a DPH.

        KRITICKÉ: Toto je STEJNÝ výpočet jako SpotPrice15MinSensor._calculate_final_price_15min()
        Musí zůstat synchronizovaný!

        Args:
            raw_spot_price: Čistá spotová cena z OTE (Kč/kWh, bez přirážek)
            target_datetime: Datetime pro určení tarifu (VT/NT)

        Returns:
            Finální cena včetně obchodní přirážky, distribuce a DPH (Kč/kWh)
        """
        config = (
            self._config_entry.options
            if self._config_entry.options
            else self._config_entry.data
        )

        # Parametry z konfigurace
        pricing_model = config.get("spot_pricing_model", "percentage")
        positive_fee_percent = config.get("spot_positive_fee_percent", 15.0)
        negative_fee_percent = config.get("spot_negative_fee_percent", 9.0)
        fixed_fee_mwh = config.get("spot_fixed_fee_mwh", 0.0)
        distribution_fee_vt_kwh = config.get("distribution_fee_vt_kwh", 1.50)
        distribution_fee_nt_kwh = config.get("distribution_fee_nt_kwh", 1.20)
        vat_rate = config.get("vat_rate", 21.0)

        # 1. Obchodní cena (spot + přirážka)
        if pricing_model == "percentage":
            if raw_spot_price >= 0:
                commercial_price = raw_spot_price * (1 + positive_fee_percent / 100.0)
            else:
                commercial_price = raw_spot_price * (1 - negative_fee_percent / 100.0)
        else:  # fixed
            fixed_fee_kwh = fixed_fee_mwh / 1000.0
            commercial_price = raw_spot_price + fixed_fee_kwh

        # 2. Tarif pro distribuci (VT/NT)
        current_tariff = get_tariff_for_datetime(target_datetime, config)

        # 3. Distribuční poplatek
        distribution_fee = (
            distribution_fee_vt_kwh
            if current_tariff == "VT"
            else distribution_fee_nt_kwh
        )

        # 4. Cena bez DPH
        price_without_vat = commercial_price + distribution_fee

        # 5. Finální cena s DPH
        final_price = price_without_vat * (1 + vat_rate / 100.0)

        return round(final_price, 2)

    async def _get_spot_price_timeline(self) -> List[Dict[str, Any]]:
        """
        Získat timeline spotových cen z coordinator data.

        KRITICKÝ FIX: Vrací FINÁLNÍ ceny včetně obchodní přirážky, distribuce a DPH!
        PŘED: Vracelo jen čistou spot price (2.29 Kč/kWh)
        PO: Vrací finální cenu (4.51 Kč/kWh) = spot + přirážka 15% + distribuce 1.50 Kč/kWh + DPH 21%

        Phase 1.5: Spot prices jsou v coordinator.data["spot_prices"], ne v sensor attributes.
        Sensor attributes obsahují jen summary (current_price, price_min/max/avg).

        Returns:
            List of dicts: [{"time": "2025-10-28T13:15:00", "price": 4.51}, ...]
        """
        if not self.coordinator:
            _LOGGER.warning("Coordinator not available in _get_spot_price_timeline")
            # Continue with fallbacks (sensor/OTE cache) if possible.
            spot_data = {}
        else:
            # Read from coordinator data (Phase 1.5 - lean attributes)
            spot_data = self.coordinator.data.get("spot_prices", {})  # type: ignore[union-attr]

        if not spot_data:
            spot_data = self._get_spot_data_from_price_sensor(price_type="spot") or {}

        if not spot_data and self._hass:
            spot_data = await self._get_spot_data_from_ote_cache() or {}

        if not spot_data:
            _LOGGER.warning("No spot price data available for forecast")
            return []

        # spot_data format: {"prices15m_czk_kwh": {"2025-10-28T13:45:00": 2.29, ...}}
        # Toto je ČISTÁ spotová cena BEZ přirážek, distribuce a DPH!
        raw_prices_dict = spot_data.get("prices15m_czk_kwh", {})

        if not raw_prices_dict:
            # Coordinator payload may contain only hourly prices; try fallbacks that are known
            # to carry 15-minute data.
            fallback = self._get_spot_data_from_price_sensor(price_type="spot") or {}
            if not fallback and self._hass:
                fallback = await self._get_spot_data_from_ote_cache() or {}
            raw_prices_dict = fallback.get("prices15m_czk_kwh", {}) if fallback else {}
            if not raw_prices_dict:
                _LOGGER.warning("No prices15m_czk_kwh in spot price data")
                return []

        # Convert to timeline format WITH FINAL PRICES
        timeline = []
        for timestamp_str, raw_spot_price in sorted(raw_prices_dict.items()):
            try:
                # Validate and parse timestamp
                target_datetime = datetime.fromisoformat(timestamp_str)

                # KRITICKÝ FIX: Vypočítat FINÁLNÍ cenu včetně přirážky, distribuce a DPH
                final_price = self._calculate_final_spot_price(
                    raw_spot_price, target_datetime
                )

                timeline.append({"time": timestamp_str, "price": final_price})

            except ValueError:
                _LOGGER.warning(f"Invalid timestamp in spot prices: {timestamp_str}")
                continue

        _LOGGER.info(
            f"Successfully loaded {len(timeline)} spot price points from coordinator "
            f"(converted from raw spot to final price with distribution + VAT)"
        )
        return timeline

    async def _get_export_price_timeline(self) -> List[Dict[str, Any]]:
        """Získat timeline prodejních cen z coordinator data (Phase 1.5).

        Export prices také v coordinator.data["spot_prices"], protože OTE API vrací obě ceny.
        Sensor attributes obsahují jen summary (current_price, price_min/max/avg).

        Returns:
            List of dicts: [{"time": "2025-10-28T13:15:00", "price": 2.5}, ...]
        """
        if not self.coordinator:
            _LOGGER.warning("Coordinator not available in _get_export_price_timeline")
            spot_data = {}
        else:
            spot_data = self.coordinator.data.get("spot_prices", {})  # type: ignore[union-attr]

        # Prefer coordinator, then sensor internals, then OTE cache.
        if not spot_data:
            spot_data = self._get_spot_data_from_price_sensor(price_type="export") or {}
        if not spot_data:
            spot_data = self._get_spot_data_from_price_sensor(price_type="spot") or {}
        if not spot_data and self._hass:
            spot_data = await self._get_spot_data_from_ote_cache() or {}

        if not spot_data:
            _LOGGER.warning("No spot price data available for export timeline")
            return []

        # Export prices jsou v "export_prices15m_czk_kwh" klíči (stejný formát jako spot)
        # Pokud klíč neexistuje, zkusíme alternativní způsob výpočtu
        export_prices_dict = spot_data.get("export_prices15m_czk_kwh", {})

        if not export_prices_dict:
            # Fallback: Vypočítat z spot prices podle config (percentage model)
            _LOGGER.info("No direct export prices, calculating from spot prices")
            spot_prices_dict = spot_data.get("prices15m_czk_kwh", {})

            if not spot_prices_dict:
                # Coordinator payload may carry only hourly prices; try 15m fallbacks.
                fallback = (
                    self._get_spot_data_from_price_sensor(price_type="spot") or {}
                )
                if not fallback and self._hass:
                    fallback = await self._get_spot_data_from_ote_cache() or {}
                spot_prices_dict = (
                    fallback.get("prices15m_czk_kwh", {})
                    if isinstance(fallback, dict)
                    else {}
                )
                if not spot_prices_dict:
                    _LOGGER.warning("No prices15m_czk_kwh for export price calculation")
                    return []

            # Get export pricing config from coordinator
            config_entry = self.coordinator.config_entry if self.coordinator else None
            config = config_entry.options if config_entry else {}
            export_model = config.get("export_pricing_model", "percentage")
            export_fee = config.get("export_fee_percent", 15.0)

            # Calculate export prices (spot price * (1 - fee/100))
            export_prices_dict = {}
            for timestamp_str, spot_price in spot_prices_dict.items():
                if export_model == "percentage":
                    export_price = spot_price * (1 - export_fee / 100)
                else:
                    # Fixed fee model
                    export_price = max(0, spot_price - export_fee)
                export_prices_dict[timestamp_str] = export_price

        # Convert to timeline format
        timeline = []
        for timestamp_str, price in sorted(export_prices_dict.items()):
            try:
                # Validate timestamp
                datetime.fromisoformat(timestamp_str)
                timeline.append({"time": timestamp_str, "price": price})
            except ValueError:
                _LOGGER.warning(f"Invalid timestamp in export prices: {timestamp_str}")
                continue

        _LOGGER.info(
            f"Successfully loaded {len(timeline)} export price points from coordinator"
        )
        return timeline

    def _get_spot_data_from_price_sensor(
        self, *, price_type: str
    ) -> Optional[Dict[str, Any]]:
        """Read internal 15min spot data from the spot/export price sensor entity.

        This is a robust fallback when coordinator doesn't carry spot_prices (e.g. pricing disabled).
        """
        hass = self._hass
        if not hass:
            return None

        if price_type == "export":
            sensor_id = f"sensor.oig_{self._box_id}_export_price_current_15min"
        else:
            sensor_id = f"sensor.oig_{self._box_id}_spot_price_current_15min"

        try:
            component = None
            # HA 2024+: entity_components registry
            entity_components = (
                hass.data.get("entity_components")
                if isinstance(hass.data, dict)
                else None
            )
            if isinstance(entity_components, dict):
                component = entity_components.get("sensor")

            # Legacy fallback
            if component is None:
                component = (
                    hass.data.get("sensor") if isinstance(hass.data, dict) else None
                )

            entity_obj = None
            if component is not None:
                get_entity = getattr(component, "get_entity", None)
                if callable(get_entity):
                    entity_obj = get_entity(sensor_id)

            if entity_obj is None and component is not None:
                entities = getattr(component, "entities", None)
                if isinstance(entities, list):
                    for ent in entities:
                        if getattr(ent, "entity_id", None) == sensor_id:
                            entity_obj = ent
                            break

            if entity_obj is None:
                return None

            spot_data = getattr(entity_obj, "_spot_data_15min", None)
            if isinstance(spot_data, dict) and spot_data:
                return spot_data
        except Exception as err:
            _LOGGER.debug("Failed to read spot data from %s: %s", sensor_id, err)

        return None

    async def _get_spot_data_from_ote_cache(self) -> Optional[Dict[str, Any]]:
        """Fallback: load spot prices via OTE cache (shared `.storage` file)."""
        hass = self._hass
        if not hass:
            return None
        try:
            cache_path = hass.config.path(".storage", OTE_SPOT_PRICE_CACHE_FILE)
            ote = OteApi(cache_path=cache_path)
            try:
                await ote.async_load_cached_spot_prices()
                data = await ote.get_spot_prices()
                return data if isinstance(data, dict) and data else None
            finally:
                await ote.close()
        except Exception as err:
            _LOGGER.debug("Failed to load OTE spot prices from cache: %s", err)
            return None

    def _get_solar_forecast(self) -> Dict[str, Any]:
        """Získat solární předpověď z solar_forecast senzoru."""
        if not self._hass:
            return {}

        # If solar forecast feature is disabled, don't warn/log.
        if not (
            self._config_entry
            and self._config_entry.options.get("enable_solar_forecast", False)
        ):
            return {}

        sensor_id = f"sensor.oig_{self._box_id}_solar_forecast"
        state = self._hass.states.get(sensor_id)

        if not state:
            # Entity may not be registered yet during startup.
            # Fallback: use coordinator cached solar_forecast_data restored from storage.
            cached = getattr(self.coordinator, "solar_forecast_data", None)
            total_hourly = (
                cached.get("total_hourly") if isinstance(cached, dict) else None
            )
            if isinstance(total_hourly, dict) and total_hourly:
                today = dt_util.now().date()
                tomorrow = today + timedelta(days=1)
                today_total: Dict[str, float] = {}
                tomorrow_total: Dict[str, float] = {}
                for hour_str, watts in total_hourly.items():
                    try:
                        hour_dt = datetime.fromisoformat(hour_str)
                        kw = round(float(watts) / 1000.0, 2)
                        if hour_dt.date() == today:
                            today_total[hour_str] = kw
                        elif hour_dt.date() == tomorrow:
                            tomorrow_total[hour_str] = kw
                    except Exception:  # nosec B112
                        continue
                self._log_rate_limited(
                    "solar_forecast_fallback",
                    "debug",
                    "Solar forecast entity missing; using coordinator cached data (%s)",
                    sensor_id,
                    cooldown_s=900.0,
                )
                return {"today": today_total, "tomorrow": tomorrow_total}

            self._log_rate_limited(
                "solar_forecast_missing",
                "debug",
                "Solar forecast sensor not found yet: %s",
                sensor_id,
                cooldown_s=900.0,
            )
            return {}

        if not state.attributes:
            self._log_rate_limited(
                "solar_forecast_no_attrs",
                "debug",
                "Solar forecast sensor has no attributes yet: %s",
                sensor_id,
                cooldown_s=900.0,
            )
            return {}

        # Načíst today a tomorrow data (správné názvy atributů)
        today = state.attributes.get("today_hourly_total_kw", {})
        tomorrow = state.attributes.get("tomorrow_hourly_total_kw", {})

        self._log_rate_limited(
            "solar_forecast_loaded",
            "debug",
            "Solar forecast loaded: today=%d tomorrow=%d (%s)",
            len(today) if isinstance(today, dict) else 0,
            len(tomorrow) if isinstance(tomorrow, dict) else 0,
            sensor_id,
            cooldown_s=1800.0,
        )

        return {"today": today, "tomorrow": tomorrow}

    def _get_solar_forecast_strings(self) -> Dict[str, Any]:
        """
        Získat solární předpověď pro String1 a String2 samostatně.

        Returns:
            Dict ve formátu:
            {
                "today_string1_kw": {"2025-11-09T07:00:00": 0.5, ...},
                "today_string2_kw": {"2025-11-09T07:00:00": 0.3, ...},
                "tomorrow_string1_kw": {...},
                "tomorrow_string2_kw": {...}
            }
        """
        if not self._hass:
            return {}

        sensor_id = f"sensor.oig_{self._box_id}_solar_forecast"
        state = self._hass.states.get(sensor_id)

        if not state or not state.attributes:
            return {}

        return {
            "today_string1_kw": state.attributes.get("today_hourly_string1_kw", {}),
            "today_string2_kw": state.attributes.get("today_hourly_string2_kw", {}),
            "tomorrow_string1_kw": state.attributes.get(
                "tomorrow_hourly_string1_kw", {}
            ),
            "tomorrow_string2_kw": state.attributes.get(
                "tomorrow_hourly_string2_kw", {}
            ),
        }

    def _get_balancing_plan(self) -> Optional[Dict[str, Any]]:
        """Získat plán balancování z battery_balancing senzoru."""
        if not self._hass:
            return None

        sensor_id = f"sensor.oig_{self._box_id}_battery_balancing"
        state = self._hass.states.get(sensor_id)

        if not state or not state.attributes:
            _LOGGER.debug(f"Battery balancing sensor {sensor_id} not available")
            return None

        # Načíst planned window z atributů
        planned = state.attributes.get("planned")

        if not planned:
            _LOGGER.debug("No balancing window planned")
            return None

        _LOGGER.info(
            f"Balancing plan: {planned.get('reason')} from {planned.get('holding_start')} "
            f"to {planned.get('holding_end')}"
        )

        return planned

    async def plan_balancing(
        self,
        requested_start: datetime,
        requested_end: datetime,
        target_soc: float,
        mode: str,
    ) -> Dict[str, Any]:
        """
        Vypočítat balancing plán pro požadované okno.

        KRITICKÉ - HLAVNÍ METODA PRO BALANCING:
        - Balancing řekne: "Chci nabít na 100% od 00:00 do 03:00"
        - Forecast vypočítá: "Ano/ne můžu" + vrátí skutečné intervaly

        Args:
            requested_start: Požadovaný start okna
            requested_end: Požadovaný konec okna
            target_soc: Cílový SoC (100% pro balancing)
            mode: "forced" | "opportunistic"

        Returns:
            {
                "can_do": bool,
                "charging_intervals": [...],  # ISO timestampy
                "actual_holding_start": str,
                "actual_holding_end": str,
                "reason": str,
            }
        """
        try:
            _LOGGER.info(
                f"📋 Balancing REQUEST: {mode}, "
                f"window={requested_start.strftime('%H:%M')}-{requested_end.strftime('%H:%M')}, "
                f"target={target_soc}%"
            )

            # TODO: IMPLEMENTOVAT FYZIKU
            # 1. Zjistit aktuální SoC
            # 2. Vypočítat kolik energie potřebuju (target_soc - current_soc)
            # 3. Zjistit spotřebu během okna z profilu
            # 4. Vypočítat charging_intervals aby dosáhl target_soc
            # 5. Vypočítat actual_holding_start/end (kdy začne držet 100%)

            # DOČASNĚ: Vždycky vrať "můžu" s celým oknem
            charging_intervals = []
            current = requested_start
            while current < requested_end:
                charging_intervals.append(current.isoformat())
                current += timedelta(minutes=15)

            return {
                "can_do": True,
                "charging_intervals": charging_intervals,
                "actual_holding_start": requested_start.isoformat(),
                "actual_holding_end": requested_end.isoformat(),
                "reason": "Temporary implementation - always accepts",
            }

        except Exception as e:
            _LOGGER.error(f"❌ Failed to plan balancing: {e}", exc_info=True)
            return {
                "can_do": False,
                "charging_intervals": [],
                "actual_holding_start": None,
                "actual_holding_end": None,
                "reason": f"Error: {e}",
            }

    def _get_load_avg_sensors(self) -> Dict[str, Any]:
        """
        Získat všechny load_avg senzory pro box.

        Používá PŘÍMO konfiguraci ze SENSOR_TYPES_STATISTICS místo hledání v atributech.
        Mapuje entity_id na tuple (start_hour, end_hour, day_type).

        Returns:
            Dict[entity_id] = {
                "value": float,
                "time_range": (start_hour, end_hour),  # tuple!
                "day_type": "weekday" | "weekend"
            }
        """
        if not self._hass:
            _LOGGER.warning("_get_load_avg_sensors: hass not available")
            return {}

        from ..sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        load_sensors = {}

        # Projít všechny load_avg senzory z konfigurace
        for sensor_type, config in SENSOR_TYPES_STATISTICS.items():
            # Hledat jen load_avg_* senzory
            if not sensor_type.startswith("load_avg_"):
                continue

            # Zkontrolovat jestli má time_range a day_type v konfiguraci
            if "time_range" not in config or "day_type" not in config:
                continue

            # Sestavit entity_id
            entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"

            # Získat stav senzoru
            state = self._hass.states.get(entity_id)
            if not state:
                _LOGGER.debug(f"Sensor {entity_id} not found in HA")
                continue

            if state.state in ["unknown", "unavailable"]:
                _LOGGER.debug(f"Sensor {entity_id} is {state.state}")
                continue

            # Parsovat hodnotu
            try:
                value = float(state.state)
            except (ValueError, TypeError) as e:
                _LOGGER.warning(
                    f"Failed to parse {entity_id} value '{state.state}': {e}"
                )
                continue

            # Uložit s time_range jako TUPLE (ne string!)
            time_range = config["time_range"]  # (6, 8)
            day_type = config["day_type"]  # "weekday" | "weekend"

            load_sensors[entity_id] = {
                "value": value,
                "time_range": time_range,  # TUPLE!
                "day_type": day_type,
            }

        _LOGGER.info(f"Found {len(load_sensors)} valid load_avg sensors")
        if load_sensors:
            # Log prvního senzoru pro debugging
            first_id = next(iter(load_sensors))
            first = load_sensors[first_id]
            _LOGGER.info(
                f"Example: {first_id}, value={first['value']}W, "
                f"range={first['time_range']}, day={first['day_type']}"
            )

        return load_sensors

    # ========================================================================
    # GRID CHARGING OPTIMIZATION METHODS
    # ========================================================================

    def _economic_charging_plan(
        self,
        timeline_data: List[Dict[str, Any]],
        min_capacity_kwh: float,
        effective_minimum_kwh: float,
        target_capacity_kwh: float,
        max_charging_price: float,
        min_savings_margin: float,
        charging_power_kw: float,
        max_capacity: float,
        enable_blackout_protection: bool,
        blackout_protection_hours: int,
        blackout_target_soc_percent: float,
        enable_weather_risk: bool,
        weather_risk_level: str,
        weather_target_soc_percent: float,
        target_reason: str = "default",
    ) -> List[Dict[str, Any]]:
        """Ekonomický plán nabíjení s forward simulací."""
        config = self._config_entry.options or self._config_entry.data
        min_capacity_percent = config.get("min_capacity_percent", 20.0)
        min_capacity_floor = (min_capacity_percent / 100.0) * max_capacity
        efficiency = self._get_battery_efficiency()

        timeline, metrics = charging_plan_module.economic_charging_plan(
            timeline_data=timeline_data,
            min_capacity_kwh=min_capacity_kwh,
            min_capacity_floor=min_capacity_floor,
            effective_minimum_kwh=effective_minimum_kwh,
            target_capacity_kwh=target_capacity_kwh,
            max_charging_price=max_charging_price,
            min_savings_margin=min_savings_margin,
            charging_power_kw=charging_power_kw,
            max_capacity=max_capacity,
            enable_blackout_protection=enable_blackout_protection,
            blackout_protection_hours=blackout_protection_hours,
            blackout_target_soc_percent=blackout_target_soc_percent,
            enable_weather_risk=enable_weather_risk,
            weather_risk_level=weather_risk_level,
            weather_target_soc_percent=weather_target_soc_percent,
            target_reason=target_reason,
            battery_efficiency=efficiency,
            config=config,
            iso_tz_offset=ISO_TZ_OFFSET,
            mode_label_home_ups=MODE_LABEL_HOME_UPS,
            mode_label_home_i=MODE_LABEL_HOME_I,
        )
        if metrics:
            self._charging_metrics = metrics

        return timeline

    def _smart_charging_plan(
        self,
        timeline: List[Dict[str, Any]],
        min_capacity: float,
        target_capacity: float,
        max_price: float,
        price_threshold: float,
        charging_power_kw: float,
        max_capacity: float,
    ) -> List[Dict[str, Any]]:
        """Chytrý plán nabíjení - vybírá nejlevnější intervaly."""
        timeline_result, metrics = charging_plan_module.smart_charging_plan(
            timeline=timeline,
            min_capacity=min_capacity,
            target_capacity=target_capacity,
            max_price=max_price,
            price_threshold=price_threshold,
            charging_power_kw=charging_power_kw,
            max_capacity=max_capacity,
            efficiency=self._get_battery_efficiency(),
            mode_label_home_ups=MODE_LABEL_HOME_UPS,
            mode_label_home_i=MODE_LABEL_HOME_I,
        )
        if metrics:
            self._charging_metrics = metrics

        return timeline_result
