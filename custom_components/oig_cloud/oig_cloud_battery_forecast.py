"""Zjednodušený senzor pro predikci nabití baterie v průběhu dne."""

import asyncio
import logging
import math
import numpy as np
import copy
import json
import hashlib
import time
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
from datetime import date, datetime, timedelta, timezone

from homeassistant.components.sensor import (
    SensorEntity,
    SensorDeviceClass,
    SensorStateClass,
)
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.storage import Store
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.config_entries import ConfigEntry
from homeassistant.util import dt as dt_util
from homeassistant.helpers.event import async_track_point_in_time, async_call_later

try:  # HA 2025.1 removed async_track_time_interval
    from homeassistant.helpers.event import async_track_time_interval
except ImportError:  # pragma: no cover - fallback for newer HA
    async_track_time_interval = None

from .const import (
    DOMAIN,
    CONF_AUTO_MODE_SWITCH,
    CONF_AUTO_MODE_PLAN,
)  # TODO 3: Import DOMAIN for BalancingManager access

# REFACTOR: Use new modular battery_forecast module (replaces legacy _calculate_optimal_modes_hybrid)
from .battery_forecast.bridge import calculate_hybrid_with_new_module

_LOGGER = logging.getLogger(__name__)

AUTO_SWITCH_STARTUP_DELAY = timedelta(minutes=4)


# PHASE 3.0 FIX: Safe nested get helper to prevent AttributeError on None values
def safe_nested_get(obj: Optional[Dict[str, Any]], *keys: str, default: Any = 0) -> Any:
    """
    Safely get nested dict values, handling None at any level.

    Args:
        obj: Dict or None
        keys: Sequence of keys to traverse (e.g., "planned", "net_cost")
        default: Default value if any key is missing or value is None

    Returns:
        Value if found, default otherwise

    Example:
        safe_nested_get(interval, "planned", "net_cost", default=0)
        # Same as: interval.get("planned", {}).get("net_cost", 0)
        # But handles: interval.get("planned") = None ✓
    """
    current = obj
    for key in keys:
        if current is None or not isinstance(current, dict):
            return default
        current = current.get(key)
    return current if current is not None else default


# CBB 3F Home Plus Premium - Mode Constants (Phase 2)
# Mode definitions from sensor.oig_{box_id}_box_prms_mode
CBB_MODE_HOME_I = 0  # Grid priority (cheap mode)
CBB_MODE_HOME_II = 1  # Battery priority
CBB_MODE_HOME_III = 2  # Solar priority (default)
CBB_MODE_HOME_UPS = 3  # UPS mode (AC charging enabled)

# Mode names for display
CBB_MODE_NAMES = {
    CBB_MODE_HOME_I: "HOME I",
    CBB_MODE_HOME_II: "HOME II",
    CBB_MODE_HOME_III: "HOME III",
    CBB_MODE_HOME_UPS: "HOME UPS",
}

# Mode transition costs (energy loss + time delay)
TRANSITION_COSTS = {
    ("Home I", "Home UPS"): {
        "energy_loss_kwh": 0.05,  # Energy loss when switching to UPS
        "time_delay_intervals": 1,  # Delay in 15-min intervals
    },
    ("Home UPS", "Home I"): {
        "energy_loss_kwh": 0.02,  # Energy loss when switching from UPS
        "time_delay_intervals": 0,
    },
    ("Home I", "Home II"): {
        "energy_loss_kwh": 0.0,  # No loss between Home modes
        "time_delay_intervals": 0,
    },
    ("Home II", "Home I"): {
        "energy_loss_kwh": 0.0,
        "time_delay_intervals": 0,
    },
}

# Minimum mode duration (in 15-min intervals)
MIN_MODE_DURATION = {
    "Home UPS": 2,  # UPS must run at least 30 minutes (2×15min)
    "Home I": 1,
    "Home II": 1,
}

# Mapping from autonomy planner labels to HA service names
AUTONOMY_MODE_SERVICE_MAP = {
    "HOME I": "Home 1",
    "HOME 1": "Home 1",
    "HOME II": "Home 2",
    "HOME 2": "Home 2",
    "HOME III": "Home 3",
    "HOME 3": "Home 3",
    "HOME UPS": "Home UPS",
}

CBB_MODE_SERVICE_MAP = {
    CBB_MODE_HOME_I: "Home 1",
    CBB_MODE_HOME_II: "Home 2",
    CBB_MODE_HOME_III: "Home 3",
    CBB_MODE_HOME_UPS: "Home UPS",
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

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        """Initialize the battery forecast sensor."""
        super().__init__(coordinator)

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._device_info = device_info

        # Nastavit hass - priorita: parametr > coordinator.hass
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        # Získání box_id z coordinator.data (stejně jako v sensor.py řádek 377)
        # Coordinator vždy má data po async_config_entry_first_refresh()
        self._data_key = "unknown"
        if (
            coordinator
            and coordinator.data
            and isinstance(coordinator.data, dict)
            and coordinator.data
        ):
            self._data_key = list(coordinator.data.keys())[0]
            _LOGGER.debug(f"Got box_id from coordinator.data: {self._data_key}")
        else:
            _LOGGER.warning(
                "Battery forecast sensor: coordinator has no data, using box_id='unknown'"
            )

        # Nastavit atributy senzoru - STEJNĚ jako OigCloudStatisticsSensor
        self._box_id = self._data_key
        # Unique ID má formát oig_cloud_{boxId}_{sensor} pro konzistenci
        self._attr_unique_id = f"oig_cloud_{self._data_key}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:battery-charging-60"
        self._attr_native_unit_of_measurement = "kWh"
        self._attr_device_class = SensorDeviceClass.ENERGY_STORAGE
        # OPRAVA: MEASUREMENT místo TOTAL_INCREASING - forecast hodnota může klesat
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_entity_category = None

        # Načíst název ze sensor types
        from .sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or sensor_type

        # Timeline data cache
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
        self._autonomy_switch_handles: List[Any] = []
        self._last_autonomy_request: Optional[Tuple[str, datetime]] = None
        self._auto_switch_ready_at: Optional[datetime] = (
            dt_util.now() + AUTO_SWITCH_STARTUP_DELAY
        )
        self._autonomy_switch_retry_unsub: Optional[Callable[[], None]] = None
        self._autonomy_watchdog_unsub: Optional[Callable[[], None]] = None
        self._autonomy_watchdog_interval: timedelta = timedelta(seconds=30)

        # Phase 2.5: DP Multi-Mode Optimization result
        self._mode_optimization_result: Optional[Dict[str, Any]] = None

        # Phase 2.8: Mode recommendations (DNES + ZÍTRA) for API
        self._mode_recommendations: List[Dict[str, Any]] = []

        # Phase 2.9: Daily plans archive (včera, předevčírem, ...)
        self._daily_plans_archive: Dict[str, Dict[str, Any]] = {}  # {date: plan_state}

        # Phase 2.9: Current daily plan state (will be restored from HA storage)
        self._daily_plan_state: Optional[Dict[str, Any]] = None

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

        # Phase 4.0: Autonomous preview storage (parallel planner)
        self._autonomy_preview: Optional[Dict[str, Any]] = None
        self._autonomy_store: Optional[Store] = None
        if self._hass:
            self._autonomy_store = Store(
                self._hass,
                version=1,
                key=f"oig_cloud.autonomy_{self._box_id}",
            )
            _LOGGER.debug(
                f"✅ Initialized Autonomy Storage: oig_cloud.autonomy_{self._box_id}"
            )
        else:
            _LOGGER.debug(
                "⚠️ Autonomy storage will be initialized in async_added_to_hass()"
            )

    async def async_added_to_hass(self) -> None:
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

        if not self._autonomy_store and self._hass:
            self._autonomy_store = Store(
                self._hass,
                version=1,
                key=f"oig_cloud.autonomy_{self._box_id}",
            )
            _LOGGER.info(
                f"✅ Retry: Initialized Autonomy Storage: oig_cloud.autonomy_{self._box_id}"
            )

        if self._auto_mode_switch_enabled():
            self._start_autonomy_watchdog()

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
            _LOGGER.info(
                "📡 Received profiles_updated signal - triggering forecast refresh"
            )
            try:
                await self.async_update()
            except Exception as e:
                _LOGGER.error(
                    f"Forecast refresh after profiles update failed: {e}", exc_info=True
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
                    _LOGGER.warning(
                        "⚠️ Profiles not ready after 60s - starting forecast anyway"
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
            yesterday = (now.date() - timedelta(days=1)).strftime("%Y-%m-%d")
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
            end_date = now.date().strftime("%Y-%m-%d")
            # Week start is 6 days ago (Monday)
            start_date = (now.date() - timedelta(days=6)).strftime("%Y-%m-%d")

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
        self._cancel_autonomy_switch_schedule()
        self._stop_autonomy_watchdog()
        await super().async_will_remove_from_hass()

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
            # HYBRID format uses battery_start, legacy uses battery_soc/battery_capacity_kwh
            capacity = self._timeline_data[0].get("battery_start")
            if capacity is None:
                capacity = self._timeline_data[0].get("battery_soc")
            if capacity is None:
                capacity = self._timeline_data[0].get("battery_capacity_kwh", 0)
            return round(capacity, 2) if capacity else 0
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
            # Current state - HYBRID uses battery_start, legacy uses battery_soc
            "current_battery_kwh": (
                round(
                    self._timeline_data[0].get(
                        "battery_start",
                        self._timeline_data[0].get(
                            "battery_soc",
                            self._timeline_data[0].get("battery_capacity_kwh", 0),
                        ),
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

        # Phase 2.5: DP Multi-Mode Optimization Summary
        if (
            hasattr(self, "_mode_optimization_result")
            and self._mode_optimization_result
        ):
            mo = self._mode_optimization_result
            optimal_modes = mo.get("optimal_modes", [])
            attrs["mode_optimization"] = {
                # Phase 2.8: Use 48h cost for frontend tile (DNES+ZÍTRA only)
                "total_cost_czk": round(mo.get("total_cost_48h", 0), 2),
                "total_savings_vs_home_i_czk": round(mo.get("total_savings_48h", 0), 2),
                "total_cost_72h_czk": round(
                    mo.get("total_cost", 0), 2
                ),  # For reference
                "modes_distribution": {
                    "HOME_I": optimal_modes.count(0),
                    "HOME_II": optimal_modes.count(1),
                    "HOME_III": optimal_modes.count(2),
                    "HOME_UPS": optimal_modes.count(3),
                },
                # Backwards compatibility: lowercase keys for old dashboard
                "home_i_intervals": optimal_modes.count(0),
                "home_ii_intervals": optimal_modes.count(1),
                "home_iii_intervals": optimal_modes.count(2),
                "home_ups_intervals": optimal_modes.count(3),
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

    async def async_update(self) -> None:
        """Update sensor data."""
        await super().async_update()

        try:
            # Získat všechna potřebná data
            _LOGGER.info("Battery forecast async_update() called")
            current_capacity = self._get_current_battery_capacity()
            max_capacity = self._get_max_battery_capacity()
            min_capacity = self._get_min_battery_capacity()

            _LOGGER.info(
                f"Battery capacities: current={current_capacity} kWh, "
                f"max={max_capacity} kWh, min={min_capacity} kWh"
            )

            _LOGGER.info("Calling _get_spot_price_timeline()...")
            spot_prices = await self._get_spot_price_timeline()  # ASYNC!
            _LOGGER.info(
                f"_get_spot_price_timeline() returned {len(spot_prices)} prices"
            )

            # CRITICAL FIX: Filter spot prices to start from current 15-minute interval
            # Round NOW down to nearest 15-minute interval (00, 15, 30, 45)
            now_aware = dt_util.now()
            current_minute = (now_aware.minute // 15) * 15
            current_interval_start = now_aware.replace(
                minute=current_minute, second=0, microsecond=0
            )
            # Convert to naive datetime for comparison (spot prices are timezone-naive strings)
            current_interval_naive = current_interval_start.replace(tzinfo=None)

            _LOGGER.info(
                f"Filtering timeline from current interval: {current_interval_naive.isoformat()}"
            )

            spot_prices_filtered = [
                sp
                for sp in spot_prices
                if datetime.fromisoformat(sp["time"]) >= current_interval_naive
            ]
            if len(spot_prices_filtered) < len(spot_prices):
                _LOGGER.info(
                    f"Filtered spot prices: {len(spot_prices)} → {len(spot_prices_filtered)} "
                    f"(removed {len(spot_prices) - len(spot_prices_filtered)} past intervals)"
                )
            spot_prices = spot_prices_filtered

            # Phase 1.5: Load export prices for timeline integration
            _LOGGER.info("Calling _get_export_price_timeline()...")
            export_prices = await self._get_export_price_timeline()  # ASYNC!
            _LOGGER.info(
                f"_get_export_price_timeline() returned {len(export_prices)} prices"
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
            adaptive_profiles = await self._get_adaptive_load_prediction()

            # NOVÉ: Získat balancing plán
            balancing_plan = self._get_balancing_plan()

            if current_capacity is None:
                _LOGGER.warning("Missing battery capacity data - cannot run forecast")
                return

            if not spot_prices:
                _LOGGER.warning(
                    "No spot prices available - forecast will use fallback prices"
                )
                # Continue anyway - forecast can run with fallback prices

            # PHASE 2.5: DP Multi-Mode Optimization
            # Vypočítat optimální sekvenci CBB režimů před timeline calculation
            _LOGGER.info("Phase 2.5: Running DP multi-mode optimization...")

            # PHASE 2.8 + REFACTORING: Get target from new getter
            target_capacity = self._get_target_battery_capacity()
            current_soc_percent = self._get_current_battery_soc_percent()

            _LOGGER.info(
                f"🔋 Battery state: current={current_capacity:.2f} kWh ({current_soc_percent:.1f}%), "
                f"total={max_capacity:.2f} kWh, min={min_capacity:.2f} kWh, target={target_capacity:.2f} kWh"
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
                            _LOGGER.warning(
                                f"Hour {hour} out of range for profile starting at {start_hour} "
                                f"(length={len(profile['hourly_consumption'])}), using average"
                            )
                            hourly_kwh = profile.get("avg_kwh_h", 0.5)

                        load_kwh = hourly_kwh / 4.0
                    else:
                        # Fallback: load_avg sensors
                        load_kwh = self._get_load_avg_for_timestamp(
                            timestamp, load_avg_sensors
                        )

                    load_forecast.append(load_kwh)
                except Exception as e:
                    _LOGGER.warning(f"Failed to get load for {sp.get('time')}: {e}")
                    load_forecast.append(0.125)  # 500W fallback

            if adaptive_profiles:
                recent_ratio = await self._calculate_recent_consumption_ratio(
                    adaptive_profiles
                )
                if recent_ratio and recent_ratio > 1.1:
                    self._apply_consumption_boost_to_forecast(
                        load_forecast, recent_ratio
                    )

            # Run HYBRID optimization (simplified, reliable)
            try:
                # TODO 3: Load balancing plan from new BalancingManager
                balancing_plan_for_hybrid = None

                # TODO 3: Try new BalancingManager first
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
                            active_plan = balancing_manager.get_active_plan()
                            if active_plan and active_plan.active:
                                # Convert BalancingPlan to HYBRID format
                                balancing_plan_for_hybrid = {
                                    "holding_start": active_plan.holding_start,
                                    "holding_end": active_plan.holding_end,
                                    "charging_intervals": [
                                        interval.ts
                                        for interval in active_plan.intervals
                                    ],
                                    "reason": active_plan.reason,
                                }
                                _LOGGER.info(
                                    f"🔋 Loaded balancing plan from BalancingManager: "
                                    f"mode={active_plan.mode.value}, "
                                    f"holding={active_plan.holding_start} - {active_plan.holding_end}, "
                                    f"intervals={len(active_plan.intervals)}"
                                )
                except Exception as e:
                    _LOGGER.debug(f"Could not load from BalancingManager: {e}")

                # Use new modular battery_forecast module
                efficiency = self._get_battery_efficiency()
                config = (
                    self._config_entry.options
                    if self._config_entry and self._config_entry.options
                    else self._config_entry.data if self._config_entry else {}
                )
                charging_power_kw = config.get("home_charge_rate", 2.8)

                self._mode_optimization_result = calculate_hybrid_with_new_module(
                    current_capacity=current_capacity,
                    max_capacity=max_capacity,
                    min_capacity=min_capacity,
                    target_capacity=target_capacity,
                    spot_prices=spot_prices,
                    export_prices=export_prices,
                    solar_forecast=solar_forecast,
                    load_forecast=load_forecast,
                    balancing_plan=balancing_plan_for_hybrid,
                    efficiency=efficiency,
                    charge_rate_kw=charging_power_kw,
                )

                _LOGGER.info(
                    f"✅ HYBRID optimization completed: total_cost={self._mode_optimization_result['total_cost']:.2f} Kč, "
                    f"target={target_capacity:.2f} kWh"
                )

                # Phase 2.8: Store mode_recommendations for API endpoint
                self._mode_recommendations = self._mode_optimization_result.get(
                    "mode_recommendations", []
                )

            except Exception as e:
                _LOGGER.error(f"HYBRID optimization failed: {e}", exc_info=True)
                self._mode_optimization_result = None
                self._mode_recommendations = []

            # ================================================================
            # PHASE 2.10: Determine ACTIVE planner based on battery_planner_mode
            # Both HYBRID and AUTONOMY are always calculated for comparison
            # ================================================================
            config_options = self._config_entry.options if self._config_entry else {}
            # Battery planner - always use hybrid (autonomy removed)

            has_dp_results = (
                hasattr(self, "_mode_optimization_result")
                and self._mode_optimization_result is not None
            )

            if has_dp_results:
                # Store HYBRID timeline
                hybrid_timeline = self._mode_optimization_result.get(
                    "optimal_timeline", []
                )
                self._hybrid_timeline = hybrid_timeline

                # Always use HYBRID (Standardní plánování)
                self._timeline_data = hybrid_timeline
                _LOGGER.info(
                    f"📊 ACTIVE PLANNER: Standardní plánování (HYBRID) - {len(hybrid_timeline)} intervals"
                )
            else:
                # Fallback: old format timeline
                _LOGGER.debug(
                    f"Calculating timeline with HYBRID=no, balancing={'yes' if self._active_charging_plan else 'no'}"
                )
                self._timeline_data = self._calculate_timeline(
                    current_capacity=current_capacity,
                    max_capacity=max_capacity,
                    min_capacity=min_capacity,
                    spot_prices=spot_prices,
                    export_prices=export_prices,
                    solar_forecast=solar_forecast,
                    load_avg_sensors=load_avg_sensors,
                    adaptive_profiles=adaptive_profiles,
                    balancing_plan=balancing_plan,
                )

            # PHASE 2.9: Fix daily plan at midnight for tracking (AFTER _timeline_data is set)
            await self._maybe_fix_daily_plan()

            # Generate BASELINE timeline (without balancing plan) for planning purposes
            # NOTE: New balancing module uses HYBRID timeline, baseline kept for legacy/debug
            if self._active_charging_plan:
                # Generate baseline without charging plan
                _LOGGER.debug("Generating baseline timeline (without charging plan)")

                # CRITICAL: Temporarily disable charging plan for baseline calculation
                temp_plan = self._active_charging_plan
                self._active_charging_plan = None

                try:
                    self._baseline_timeline = self._calculate_timeline(
                        current_capacity=current_capacity,
                        max_capacity=max_capacity,
                        min_capacity=min_capacity,
                        spot_prices=spot_prices,
                        export_prices=export_prices,
                        solar_forecast=solar_forecast,
                        load_avg_sensors=load_avg_sensors,
                        adaptive_profiles=adaptive_profiles,
                        balancing_plan=None,  # Parameter ignored, but keep for clarity
                    )
                finally:
                    # Restore active charging plan
                    self._active_charging_plan = temp_plan

                _LOGGER.debug(
                    f"Baseline timeline generated: {len(self._baseline_timeline)} points"
                )
            else:
                # No charging plan - baseline not needed by new balancing module
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
                self._calculate_consumption_summary(adaptive_profiles)
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

            # SIMPLE STORAGE: Update actual values každých 15 minut
            now = dt_util.now()
            current_minute = now.minute

            # Spustit update každých 15 minut (v 0, 15, 30, 45)
            should_update = current_minute in [0, 15, 30, 45]

            if should_update and not self._initial_history_update_done:
                # Skip pokud ještě neproběhl initial update
                pass
            elif should_update:
                # PHASE 3.0: DISABLED - Historical data loading moved to on-demand (API only)
                # Načítání z Recorderu každých 15 min je POMALÉ!
                # Nově: build_timeline_extended() načítá on-demand při API volání
                # _LOGGER.info(f"⏰ 15-minute history update triggered: {now.strftime('%H:%M')}")
                # await self._update_actual_from_history()
                pass

            # CRITICAL FIX: Write state after every update to publish consumption_summary
            # Check if sensor is already added to HA (self.hass is set by framework)
            # NOTE: For temp sensors in coordinator, self.hass is None but self._hass is set
            # We only want to write state for REGISTERED sensors (self.hass is set by HA)
            if not self.hass:
                _LOGGER.debug(
                    "Temp sensor (not registered in HA), skipping state write"
                )
                return

            _LOGGER.info(
                f"🔄 Writing HA state with consumption_summary: {self._consumption_summary}"
            )
            self.async_write_ha_state()

            # NOTE: Autonomy preview disabled - using only hybrid planner
            # await self._run_autonomy_preview(...)

            # PHASE 3.5: Precompute UI data for instant API responses
            # Build timeline_extended + unified_cost_tile and save to storage
            # This runs every 15 min after forecast update
            self._schedule_precompute(force=self._last_precompute_at is None)

            # Notify dependent sensors (BatteryBalancing) that forecast is ready
            from homeassistant.helpers.dispatcher import async_dispatcher_send

            signal_name = f"oig_cloud_{self._box_id}_forecast_updated"
            _LOGGER.debug(f"📡 Sending signal: {signal_name}")
            async_dispatcher_send(self.hass, signal_name)

        except Exception as e:
            _LOGGER.error(f"Error updating battery forecast: {e}", exc_info=True)

    def _simulate_interval(
        self,
        mode: int,
        solar_kwh: float,
        load_kwh: float,
        battery_soc_kwh: float,
        capacity_kwh: float,
        hw_min_capacity_kwh: float,
        spot_price_czk: float,
        export_price_czk: float,
        charge_efficiency: float = 0.95,
        discharge_efficiency: float = 0.95,
        home_charge_rate_kwh_15min: float = 0.7,
        planning_min_capacity_kwh: float = None,
    ) -> dict:
        """
        Simulate single 15-min interval with specific CBB mode.

        REFACTORED: Delegates to battery_forecast.bridge module.
        Legacy implementation removed (~287 lines).
        """
        from .battery_forecast.bridge import simulate_interval_with_new_module

        return simulate_interval_with_new_module(
            mode=mode,
            solar_kwh=solar_kwh,
            load_kwh=load_kwh,
            battery_soc_kwh=battery_soc_kwh,
            capacity_kwh=capacity_kwh,
            hw_min_capacity_kwh=hw_min_capacity_kwh,
            spot_price_czk=spot_price_czk,
            export_price_czk=export_price_czk,
            charge_efficiency=charge_efficiency,
            discharge_efficiency=discharge_efficiency,
            home_charge_rate_kwh_15min=home_charge_rate_kwh_15min,
            planning_min_capacity_kwh=planning_min_capacity_kwh,
        )

    def _calculate_timeline(
        self,
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_avg_sensors: Dict[str, Any],
        adaptive_profiles: Optional[Dict[str, Any]] = None,
        balancing_plan: Optional[Dict[str, Any]] = None,
        mode: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Calculate battery timeline using new modular architecture.

        REFACTORED: This method now delegates to battery_forecast.bridge module.
        Legacy implementation removed (~570 lines).
        """
        from .battery_forecast.bridge import calculate_timeline_with_new_module

        # Get load forecast from sensors or use default
        load_forecast = self._build_load_forecast(load_avg_sensors, len(spot_prices))

        # Get modes from optimization result if available
        modes = None
        if (
            hasattr(self, "_mode_optimization_result")
            and self._mode_optimization_result
        ):
            modes = self._mode_optimization_result.get("modes")

        # If single mode specified, use it for all intervals
        if mode is not None:
            modes = [mode] * len(spot_prices)

        return calculate_timeline_with_new_module(
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
            modes=modes,
            efficiency=self._get_battery_efficiency(),
            charge_rate_kw=(
                self._config_entry.options.get("home_charge_rate", 2.8)
                if self._config_entry
                else 2.8
            ),
        )

    def _build_load_forecast(
        self, load_avg_sensors: Dict[str, Any], n_intervals: int
    ) -> List[float]:
        """Build load forecast from sensors data."""
        load_forecast = []

        # Try to get from sensors
        for i in range(n_intervals):
            hour = (i * 15 // 60) % 24
            load = (
                self._get_load_avg_for_hour(hour)
                if hasattr(self, "_get_load_avg_for_hour")
                else 0.3
            )
            load_forecast.append(load / 4)  # Convert hourly to 15min

        return load_forecast if load_forecast else [0.3] * n_intervals

    def _get_total_battery_capacity(self) -> float:
        """Získat CELKOVOU kapacitu baterie z API (box_prms.p_bat → kWh).

        Toto je FYZICKÁ celková kapacita baterie (0-100%).
        """
        if not self._hass:
            return 15.36  # Default fallback

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

        _LOGGER.warning("Unable to get total battery capacity, using default 15.36 kWh")
        return 15.36

    def _get_current_battery_soc_percent(self) -> float:
        """Získat aktuální SoC v % z API (actual.bat_c).

        Toto je SKUTEČNÝ SoC% vůči celkové kapacitě (0-100%).
        """
        if not self._hass:
            return 46.0  # Default fallback

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

        _LOGGER.warning("Unable to get battery SoC%, using default 46%")
        return 46.0

    def _get_current_battery_capacity(self) -> float:
        """Získat aktuální kapacitu baterie v kWh.

        NOVÝ VÝPOČET: total_capacity × soc_percent / 100
        (místo remaining_usable_capacity computed sensoru)
        """
        total = self._get_total_battery_capacity()
        soc_percent = self._get_current_battery_soc_percent()
        current_kwh = total * soc_percent / 100.0

        _LOGGER.debug(
            f"Current battery capacity: {total:.2f} kWh × {soc_percent:.1f}% = {current_kwh:.2f} kWh"
        )
        return current_kwh

    def _get_max_battery_capacity(self) -> float:
        """Získat maximální kapacitu baterie (= total capacity).

        DEPRECATED: Kept for backwards compatibility.
        Use _get_total_battery_capacity() instead.
        """
        return self._get_total_battery_capacity()

    def _get_min_battery_capacity(self) -> float:
        """Získat minimální kapacitu baterie z config flow.

        NOVÝ VÝPOČET: min_percent × total_capacity
        (místo min_percent × usable_capacity)
        """
        total = self._get_total_battery_capacity()

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

    def _get_target_battery_capacity(self) -> float:
        """Získat cílovou kapacitu baterie z config flow.

        NOVÝ: Target capacity pro DP optimalizaci (kWh).
        """
        total = self._get_total_battery_capacity()

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

    async def _maybe_fix_daily_plan(self) -> None:
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
        today_str = now.strftime("%Y-%m-%d")

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
                cutoff_date = (now.date() - timedelta(days=7)).strftime("%Y-%m-%d")
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

            # Máme DP výsledek?
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
                    except:
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
                    except:
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

    async def _fetch_interval_from_history(
        self, start_time: datetime, end_time: datetime
    ) -> Optional[Dict[str, Any]]:
        """
        Načíst actual data pro jeden 15min interval z HA history.

        Args:
            start_time: Začátek intervalu (timezone-aware)
            end_time: Konec intervalu (timezone-aware)

        Returns:
            Dict s actual hodnotami nebo None pokud data nejsou k dispozici
        """
        if not self._hass:
            _LOGGER.debug("[fetch_interval_from_history] No _hass instance")
            return None

        _LOGGER.debug(
            f"[fetch_interval_from_history] Fetching {start_time} - {end_time}"
        )

        try:
            from homeassistant.components.recorder.history import get_significant_states

            # Senzory které potřebujeme
            entity_ids = [
                f"sensor.oig_{self._box_id}_ac_out_en_day",  # Spotřeba [Wh kumulativně]
                f"sensor.oig_{self._box_id}_ac_in_ac_ad",  # Grid import [Wh kumulativně]
                f"sensor.oig_{self._box_id}_ac_in_ac_pd",  # Grid export [Wh kumulativně]
                f"sensor.oig_{self._box_id}_dc_in_fv_ad",  # Solar [Wh kumulativně]
                f"sensor.oig_{self._box_id}_batt_bat_c",  # Baterie [%] - OPRAVENO: správný název senzoru
                f"sensor.oig_{self._box_id}_box_prms_mode",  # Režim střídače (box_prms_mode)
                f"sensor.oig_{self._box_id}_spot_price_current_15min",  # Import spot price [Kč/kWh]
                f"sensor.oig_{self._box_id}_export_price_current_15min",  # Export price [Kč/kWh]
            ]

            # Načíst historii
            states = await self._hass.async_add_executor_job(
                get_significant_states,
                self._hass,
                start_time,
                end_time,
                entity_ids,
                None,  # filters
                True,  # include_start_time_state
            )

            if not states:
                return None

            # Extrahovat hodnoty na ZAČÁTKU a KONCI intervalu
            def get_delta(entity_id: str) -> float:
                """Získat delta (konec - začátek) pro kumulativní senzor."""
                entity_states = states.get(entity_id, [])
                if not entity_states:
                    return 0.0

                # Normalizovat interval na UTC pro porovnání
                # (states.last_updated jsou v UTC, start_time/end_time mohou být v lokálním čase)
                start_utc = (
                    start_time.astimezone(timezone.utc)
                    if start_time.tzinfo
                    else start_time
                )
                end_utc = (
                    end_time.astimezone(timezone.utc) if end_time.tzinfo else end_time
                )

                # Filtrovat states uvnitř intervalu [start_time, end_time]
                interval_states = [
                    s
                    for s in entity_states
                    if start_utc <= s.last_updated.astimezone(timezone.utc) <= end_utc
                ]

                # Pokud nejsou žádné states v intervalu, najdi nejbližší před a po
                if not interval_states:
                    # Najdi poslední state PŘED intervalem
                    before_states = [
                        s
                        for s in entity_states
                        if s.last_updated.astimezone(timezone.utc) < start_utc
                    ]
                    # Najdi první state PO intervalu
                    after_states = [
                        s
                        for s in entity_states
                        if s.last_updated.astimezone(timezone.utc) > end_utc
                    ]

                    # Pokud máme oba, použij je pro aproximaci
                    if before_states and after_states:
                        interval_states = [before_states[-1], after_states[0]]
                    else:
                        # Jinak vrať 0 (není dost dat pro výpočet)
                        return 0.0

                if len(interval_states) < 2:
                    return 0.0

                try:
                    start_val = float(interval_states[0].state)
                    end_val = float(interval_states[-1].state)
                    delta_wh = end_val - start_val

                    # Reset check (denní kumulativní senzory se resetují o půlnoci)
                    if delta_wh < 0:
                        delta_wh = end_val

                    return delta_wh / 1000.0  # Wh → kWh
                except (ValueError, AttributeError):
                    return 0.0

            def get_value_at_end(entity_id: str) -> Any:
                """
                Získat hodnotu NA KONCI intervalu (= end_time).

                Pro battery_soc a mode je důležité mít hodnotu přesně NA KONCI intervalu,
                aby byla sladěná s planned hodnotami (které reprezentují stav NA KONCI).

                Hledáme state CO NEJBLÍŽE end_time, ne prostě poslední v seznamu!
                """
                entity_states = states.get(entity_id, [])
                if not entity_states:
                    return None

                # Normalizovat end_time na UTC
                end_utc = (
                    end_time.astimezone(timezone.utc) if end_time.tzinfo else end_time
                )

                # Najít state s časem NEJBLÍŽE end_time (může být před i po)
                closest_state = min(
                    entity_states,
                    key=lambda s: abs(
                        (
                            s.last_updated.astimezone(timezone.utc) - end_utc
                        ).total_seconds()
                    ),
                )

                try:
                    return float(closest_state.state)
                except (ValueError, AttributeError):
                    return None

            def get_last_value(entity_id: str) -> Any:
                """Získat poslední hodnotu pro snapshot senzor (ceny)."""
                entity_states = states.get(entity_id, [])
                if not entity_states:
                    return None
                try:
                    return float(entity_states[-1].state)
                except (ValueError, AttributeError):
                    return None

            # Vypočítat actual values
            consumption_kwh = get_delta(f"sensor.oig_{self._box_id}_ac_out_en_day")
            grid_import_kwh = get_delta(f"sensor.oig_{self._box_id}_ac_in_ac_ad")
            grid_export_kwh = get_delta(f"sensor.oig_{self._box_id}_ac_in_ac_pd")
            solar_kwh = get_delta(f"sensor.oig_{self._box_id}_dc_in_fv_ad")

            # OPRAVA: Použít hodnotu NA KONCI intervalu (end_time), ne prostě poslední
            battery_soc = get_value_at_end(f"sensor.oig_{self._box_id}_batt_bat_c")
            mode_raw = get_value_at_end(f"sensor.oig_{self._box_id}_box_prms_mode")

            # Vypočítat battery_kwh z SOC
            battery_kwh = 0.0
            if battery_soc is not None:
                total_capacity = self._get_total_battery_capacity()
                if total_capacity > 0:
                    battery_kwh = (battery_soc / 100.0) * total_capacity

            # Načíst spot price a export price pro tento interval (z history)
            spot_price = (
                get_last_value(f"sensor.oig_{self._box_id}_spot_price_current_15min")
                or 0.0
            )
            export_price = (
                get_last_value(f"sensor.oig_{self._box_id}_export_price_current_15min")
                or 0.0
            )

            # Spočítat net_cost
            import_cost = grid_import_kwh * spot_price
            export_revenue = grid_export_kwh * export_price
            net_cost = import_cost - export_revenue

            # Převést mode z textové hodnoty na int
            # box_prms_mode vrací "Home 1", "Home 3", "Home UPS" atd.
            mode = 0  # Default HOME I
            if mode_raw is not None:
                mode_str = str(mode_raw).strip()
                # Mapování textových hodnot na mode ID
                if "Home 1" in mode_str or "HOME I" in mode_str:
                    mode = 0
                elif "Home 3" in mode_str or "HOME III" in mode_str:
                    mode = 2
                elif "UPS" in mode_str or "Home UPS" in mode_str:
                    mode = 3
                elif "Home 2" in mode_str or "HOME II" in mode_str:
                    mode = 1

            mode_name = CBB_MODE_NAMES.get(mode, "HOME I")

            result = {
                "battery_kwh": round(battery_kwh, 2),
                "battery_soc": (
                    round(battery_soc, 1) if battery_soc is not None else 0.0
                ),
                "mode": mode,
                "mode_name": mode_name,
                "solar_kwh": round(solar_kwh, 3),
                "consumption_kwh": round(consumption_kwh, 3),
                "grid_import": round(grid_import_kwh, 3),
                "grid_export": round(grid_export_kwh, 3),
                "spot_price": round(spot_price, 2),
                "export_price": round(export_price, 2),
                "net_cost": round(net_cost, 2),
            }

            _LOGGER.info(
                f"[fetch_interval_from_history] {start_time.strftime('%Y-%m-%d %H:%M')} -> "
                f"battery_soc={battery_soc}, battery_kwh={battery_kwh:.2f}, "
                f"consumption={result['consumption_kwh']:.3f}, net_cost={result['net_cost']:.2f}"
            )

            return result

        except Exception as e:
            _LOGGER.warning(f"Failed to fetch history for {start_time}: {e}")
            return None

    async def _update_actual_from_history(self) -> None:
        """
        Načíst actual values z HA history pro dnešní den.

        OPTIMALIZOVANÁ verze:
        - Načte jen CHYBĚJÍCÍ 15min intervaly (ne všechny od půlnoci!)
        - Doplní je do existing "actual" array
        - Žádné nested struktury, žádné delta - jen čistá actual data
        """
        now = dt_util.now()
        today_str = now.strftime("%Y-%m-%d")

        # Načíst existing plan z Storage Helper (FAST)
        # PHASE 3.0: Use Storage Helper instead of file I/O
        plan_storage = await self._load_plan_from_storage(today_str)
        if not plan_storage:
            _LOGGER.debug(
                f"No plan in Storage for {today_str}, skipping history update"
            )
            return

        # Convert to daily_plan_state format
        plan_data = {
            "date": today_str,
            "plan": plan_storage.get("intervals", []),
            "actual": [],  # Will be filled/overwritten below
        }

        if not plan_data:
            _LOGGER.debug(f"No plan for {today_str}, skipping actual update")
            return

        existing_actual: List[Dict[str, Any]] = []
        if self._daily_plan_state and self._daily_plan_state.get("date") == today_str:
            existing_actual = copy.deepcopy(self._daily_plan_state.get("actual", []))
            plan_data["actual"] = existing_actual
        else:
            existing_actual = plan_data.get("actual", [])

        _LOGGER.info(f"📊 Updating actual values from history for {today_str}...")

        # Doplň chybějící net_cost do existujících intervalů (zpětná kompatibilita)
        patched_existing: List[Dict[str, Any]] = []
        for interval in existing_actual:
            if interval.get("net_cost") is not None:
                patched_existing.append(interval)
                continue
            ts = interval.get("time")
            if not ts:
                patched_existing.append(interval)
                continue
            start_dt = dt_util.parse_datetime(ts)
            if start_dt is None:
                try:
                    start_dt = datetime.fromisoformat(ts)
                except Exception:
                    start_dt = None
            if start_dt is None:
                patched_existing.append(interval)
                continue
            if start_dt.tzinfo is None:
                start_dt = dt_util.as_local(start_dt)
            interval_end = start_dt + timedelta(minutes=15)
            historical_patch = await self._fetch_interval_from_history(
                start_dt, interval_end
            )
            if historical_patch:
                interval = {
                    **interval,
                    "net_cost": round(historical_patch.get("net_cost", 0), 2),
                    "spot_price": round(historical_patch.get("spot_price", 0), 2),
                    "export_price": round(historical_patch.get("export_price", 0), 2),
                }
            patched_existing.append(interval)
        existing_actual = patched_existing
        plan_data["actual"] = existing_actual

        # Vytvořit set existujících časů pro rychlé vyhledávání
        existing_times = {interval.get("time") for interval in existing_actual}

        _LOGGER.debug(f"Found {len(existing_actual)} existing actual intervals")

        # Najít chybějící intervaly od půlnoci do teď
        start_time = dt_util.start_of_local_day(now)
        current_time = start_time
        new_intervals = []

        while current_time <= now:
            interval_time_str = current_time.isoformat()

            # Přeskočit pokud už existuje
            if interval_time_str in existing_times:
                current_time += timedelta(minutes=15)
                continue

            # Načíst z historie - JEN CHYBĚJÍCÍ INTERVAL
            actual_data = await self._fetch_interval_from_history(
                current_time, current_time + timedelta(minutes=15)
            )

            if actual_data:
                new_intervals.append(
                    {
                        "time": interval_time_str,
                        "solar_kwh": round(actual_data.get("solar_kwh", 0), 4),
                        "consumption_kwh": round(
                            actual_data.get("consumption_kwh", 0), 4
                        ),
                        "battery_soc": round(actual_data.get("battery_soc", 0), 2),
                        "battery_capacity_kwh": round(
                            actual_data.get("battery_capacity_kwh", 0), 2
                        ),
                        "grid_import_kwh": round(actual_data.get("grid_import", 0), 4),
                        "grid_export_kwh": round(actual_data.get("grid_export", 0), 4),
                        "net_cost": round(actual_data.get("net_cost", 0), 2),
                        "spot_price": round(actual_data.get("spot_price", 0), 2),
                        "export_price": round(actual_data.get("export_price", 0), 2),
                        "mode": actual_data.get("mode", 0),
                        "mode_name": actual_data.get("mode_name", "N/A"),
                    }
                )

            current_time += timedelta(minutes=15)

        # DOPLNIT nové intervaly k existujícím (ne přepsat!)
        if new_intervals:
            plan_data["actual"] = existing_actual + new_intervals
            _LOGGER.info(
                f"✅ Added {len(new_intervals)} new actual intervals (total: {len(plan_data['actual'])})"
            )
        else:
            _LOGGER.debug("No new actual intervals to add")

        # Update in-memory state pouze pokud byly přidány nové intervaly
        if new_intervals:
            self._daily_plan_state = plan_data
        else:
            _LOGGER.debug("No changes, skipping storage update")

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
                _LOGGER.warning(
                    "No HYBRID timeline available - cannot create baseline plan"
                )
                return False

            _LOGGER.debug(
                f"Using HYBRID timeline with {len(hybrid_timeline)} intervals"
            )

            # 2. Determine date range for baseline (00:00 - 23:45)
            dt_util.now()
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
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
                    except:
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
                    historical_data = await self._fetch_interval_from_history(
                        interval_start, interval_end
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
        today_str = now.strftime("%Y-%m-%d")

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
                datetime.strptime(date_str, "%Y-%m-%d").date() - timedelta(days=7)
            ).strftime("%Y-%m-%d")

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
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            end = datetime.strptime(end_date, "%Y-%m-%d").date()

            week_days = []
            current = start
            while current <= end:
                day_str = current.strftime("%Y-%m-%d")
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
                datetime.strptime(end_date, "%Y-%m-%d").date() - timedelta(days=30)
            ).strftime("%Y-%m-%d")

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
                except:
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

    def _transform_timeline_for_api(
        self, timeline: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Transform timeline from internal format to API format.

        Internal format uses long descriptive keys:
        - solar_production_kwh → solar_kwh
        - consumption_kwh → load_kwh
        - grid_charge_kwh → stays same

        API format uses short keys expected by frontend.
        """
        transformed = []
        for point in timeline:
            new_point = point.copy()

            # Rename long keys to short keys
            if "solar_production_kwh" in new_point:
                new_point["solar_kwh"] = new_point.pop("solar_production_kwh")
            if "consumption_kwh" in new_point:
                new_point["load_kwh"] = new_point.pop("consumption_kwh")

            transformed.append(new_point)

        return transformed

    async def _precompute_ui_data(self) -> None:
        """
        Precompute UI data (detail_tabs + unified_cost_tile) and save to storage.

        PHASE 3.5: Performance Optimization
        - Called every 15 min after forecast update
        - Saves precomputed data to ~/.storage/oig_cloud_precomputed_data_{box_id}.json
        - API endpoints read from storage → instant response (< 100ms)
        - Eliminates 4s wait time for build_detail_tabs() + build_unified_cost_tile()
        """
        if not self._precomputed_store:
            _LOGGER.warning("⚠️ Precomputed storage not initialized, skipping")
            return

        try:
            _LOGGER.info("📊 Precomputing UI data for instant API responses...")
            start_time = dt_util.now()

            # Build detail_tabs for BOTH planners - they are independent algorithms
            # Each algorithm has its own timeline, but they share:
            # - Yesterday (historical actual)
            # - Today completed intervals (historical actual)
            # - Today active interval (current actual)
            # They differ in:
            # - Today future intervals (each has its own plan)
            # - Tomorrow (each has its own plan)
            config_options = self._config_entry.options if self._config_entry else {}
            battery_planner_mode = config_options.get("battery_planner_mode", "hybrid")

            # Build BOTH planners always (they are independent)
            detail_tabs_hybrid: Dict[str, Any] = {}
            detail_tabs_autonomy: Dict[str, Any] = {}

            try:
                detail_tabs_hybrid = await self.build_detail_tabs(plan="hybrid")
            except Exception as err:
                _LOGGER.error(
                    f"Failed to build hybrid detail_tabs: {err}", exc_info=True
                )

            try:
                detail_tabs_autonomy = await self.build_detail_tabs(plan="autonomy")
            except Exception as err:
                _LOGGER.error(
                    f"Failed to build autonomy detail_tabs: {err}", exc_info=True
                )

            # Build unified_cost_tile for BOTH planners - they are independent algorithms
            unified_cost_tile_hybrid = await self.build_unified_cost_tile()
            unified_cost_tile_autonomy = await self.build_autonomy_cost_tile()
            cost_comparison = self._build_cost_comparison_summary(
                unified_cost_tile_hybrid,
                unified_cost_tile_autonomy,
            )

            # Snapshot current timelines for both planners
            timeline_hybrid = copy.deepcopy(
                getattr(self, "_hybrid_timeline", None) or self._timeline_data or []
            )
            timeline_autonomy = []
            if self._autonomy_preview:
                timeline_autonomy = copy.deepcopy(
                    self._autonomy_preview.get("timeline", []) or []
                )

            # Transform timelines from internal format to API format
            # (solar_production_kwh → solar_kwh, consumption_kwh → load_kwh)
            timeline_hybrid_api = self._transform_timeline_for_api(timeline_hybrid)
            timeline_autonomy_api = self._transform_timeline_for_api(timeline_autonomy)

            # Save to storage
            precomputed_data = {
                "detail_tabs_hybrid": detail_tabs_hybrid,  # Standard algorithm
                "detail_tabs_autonomy": detail_tabs_autonomy,  # Dynamic algorithm
                "active_planner": battery_planner_mode,  # Which planner is active (for default view)
                "unified_cost_tile_hybrid": unified_cost_tile_hybrid,  # Standard algorithm costs
                "unified_cost_tile_autonomy": unified_cost_tile_autonomy,  # Dynamic algorithm costs
                "timeline_hybrid": timeline_hybrid_api,  # Transformed to API format
                "timeline_autonomy": timeline_autonomy_api,  # Transformed to API format
                "cost_comparison": cost_comparison,
                "last_update": dt_util.now().isoformat(),
                "version": 2,  # Dual-planner architecture
            }

            await self._precomputed_store.async_save(precomputed_data)

            duration = (dt_util.now() - start_time).total_seconds()
            _LOGGER.info(
                f"✅ Precomputed UI data saved to storage in {duration:.2f}s "
                f"(hybrid: {len(detail_tabs_hybrid.get('today', {}).get('mode_blocks', []))} blocks, "
                f"autonomy: {len(detail_tabs_autonomy.get('today', {}).get('mode_blocks', []))} blocks, "
                f"hybrid_cost: {unified_cost_tile_hybrid.get('today', {}).get('plan_total_cost', 0):.2f} Kč, "
                f"autonomy_cost: {unified_cost_tile_autonomy.get('today', {}).get('plan_total_cost', 0):.2f} Kč)"
            )

        except Exception as e:
            _LOGGER.error(f"Failed to precompute UI data: {e}", exc_info=True)
        finally:
            self._last_precompute_at = dt_util.now()

    def _schedule_precompute(self, force: bool = False) -> None:
        """Schedule precompute job with throttling."""
        if not self.hass or not self._precomputed_store:
            return

        now = dt_util.now()
        if (
            not force
            and self._last_precompute_at
            and (now - self._last_precompute_at) < self._precompute_interval
        ):
            _LOGGER.debug(
                "[Precompute] Skipping (last run %ss ago)",
                (now - self._last_precompute_at).total_seconds(),
            )
            return

        if self._precompute_task and not self._precompute_task.done():
            _LOGGER.debug("[Precompute] Job already running, skipping")
            return

        async def _runner():
            try:
                await self._precompute_ui_data()
            except Exception as err:  # pragma: no cover - logged inside
                _LOGGER.error("[Precompute] Job failed: %s", err, exc_info=True)
            finally:
                self._precompute_task = None

        self._precompute_task = self.hass.async_create_task(_runner())

    async def _run_autonomy_preview(
        self,
        *,
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        target_capacity: float,
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
    ) -> None:
        """Run autonomous planner preview (no hardware control).

        CRITICAL: Always generate autonomy timeline in parallel with hybrid,
        regardless of enable_autonomous_preview setting. Both timelines should
        always be available for comparison and auto-switching.
        """

        # Gracefully skip when spot prices are not available
        if not spot_prices:
            self._autonomy_preview = None
            _LOGGER.warning("No spot prices available - autonomy preview skipped")
            await self._update_autonomy_switch_schedule()
            return

        try:
            preview = self._calculate_autonomy_plan(
                current_capacity=current_capacity,
                max_capacity=max_capacity,
                min_capacity=min_capacity,
                target_capacity=target_capacity,
                spot_prices=spot_prices,
                export_prices=export_prices,
                solar_forecast=solar_forecast,
                load_forecast=load_forecast,
            )

            self._autonomy_preview = preview
            await self._archive_autonomy_summary(preview)
            await self._update_autonomy_switch_schedule()
        except Exception as err:
            self._autonomy_preview = None
            _LOGGER.error(f"Autonomy preview failed: {err}", exc_info=True)
            await self._update_autonomy_switch_schedule()

    def _calculate_autonomy_plan(
        self,
        *,
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        target_capacity: float,
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
    ) -> Dict[str, Any]:
        """Calculate autonomy preview plan using DP optimization."""
        # If prices are missing, return an empty plan instead of raising
        if not spot_prices:
            _LOGGER.warning(
                "No spot prices available for autonomy preview - returning empty plan"
            )
            return {"timeline": [], "total_cost": 0.0, "horizon": 0}

        start_ts = time.perf_counter()
        horizon = len(spot_prices)
        _LOGGER.info(
            "🧠 Autonomy preview ▶️ start: start_soc=%.2f kWh, horizon=%d intervals",
            current_capacity,
            horizon,
        )

        physical_min_capacity = max_capacity * 0.20
        efficiency = self._get_battery_efficiency()
        home_charge_rate_kw = (
            self._config_entry.options.get("home_charge_rate", 2.8) or 2.8
        )
        home_charge_rate_kwh_15min = home_charge_rate_kw / 4.0

        optimization = self._optimize_autonomy_modes(
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            planning_floor_kwh=min_capacity,
            target_capacity=target_capacity,
            physical_min_capacity=physical_min_capacity,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
            efficiency=efficiency,
            home_charge_rate_kwh_15min=home_charge_rate_kwh_15min,
        )

        modes = optimization["modes"]
        if not modes:
            _LOGGER.warning("Autonomy DP returned empty plan")
            return {"timeline": [], "total_cost": 0.0, "horizon": 0}

        final_modes = self._enforce_min_mode_duration(modes)
        result = self._build_result(
            modes=final_modes,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            efficiency=efficiency,
            baselines=None,
            physical_min_capacity=physical_min_capacity,
        )

        timeline = result.get("optimal_timeline", [])
        final_modes = list(result.get("optimal_modes", final_modes))
        total_cost = result.get("total_cost", 0.0)

        day_costs = self._aggregate_cost_by_day(timeline)

        preview = {
            "timeline": timeline,
            "modes": list(result.get("optimal_modes", final_modes)),
            "total_cost": total_cost,
            "day_costs": day_costs,
            "metadata": {
                "generated_at": dt_util.now().isoformat(),
                "plan": "autonomy",
                "planning_floor_kwh": round(min_capacity, 3),
            },
        }

        final_modes_out = preview["modes"]
        runtime_ms = (time.perf_counter() - start_ts) * 1000.0
        precharge_count = optimization.get("precharge_intervals", 0)
        dp_cost = optimization.get("dp_cost", 0.0)
        _LOGGER.info(
            "🧠 Autonomy preview ✅ done in %.1f ms (UPS=%d, enforced_floor=%.2f kWh, precharge=%d, dp_cost=%.2f Kč)",
            runtime_ms,
            final_modes_out.count(CBB_MODE_HOME_UPS),
            min_capacity,
            precharge_count,
            dp_cost,
        )

        return preview

    def _optimize_autonomy_modes(
        self,
        *,
        current_capacity: float,
        max_capacity: float,
        planning_floor_kwh: float,
        target_capacity: float,
        physical_min_capacity: float,
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
        efficiency: float,
        home_charge_rate_kwh_15min: float,
    ) -> Dict[str, Any]:
        """Dynamic programming optimizer with iterative pre-charge scheduling."""

        import bisect
        import math

        n = len(spot_prices)
        if n == 0:
            return {"modes": [], "dp_cost": 0.0, "precharge_intervals": 0}

        options = (
            self._config_entry.options
            if self._config_entry and self._config_entry.options
            else {}
        )
        soc_step = max(0.1, options.get("autonomy_soc_step_kwh", 0.5))
        eps = 1e-6
        guard_margin = 0.3  # keep SoC at least +0.3 kWh above planning floor

        export_lookup = {
            ep.get("time"): ep.get("price", 0.0)
            for ep in export_prices
            if ep.get("time")
        }

        solar_series: List[float] = []
        for sp in spot_prices:
            try:
                timestamp = datetime.fromisoformat(sp["time"])
                if timestamp.tzinfo is None:
                    timestamp = dt_util.as_local(timestamp)
                solar_series.append(
                    self._get_solar_for_timestamp(timestamp, solar_forecast)
                )
            except Exception:
                solar_series.append(0.0)

        forced_modes: Dict[int, int] = {}
        iteration = 0
        max_iterations = max(1, n * 2)
        gain_per_slot = home_charge_rate_kwh_15min * efficiency

        # If we already start below the planning floor, reserve early UPS slots.
        if current_capacity < planning_floor_kwh + guard_margin - eps:
            deficit = planning_floor_kwh + guard_margin - current_capacity
            idx = 0
            while deficit > 0 and idx < n:
                forced_modes[idx] = CBB_MODE_HOME_UPS
                deficit -= gain_per_slot
                iteration += 1
                idx += 1

        def run_dp() -> Dict[str, Any]:
            levels = max(
                1, int(math.ceil((max_capacity - planning_floor_kwh) / soc_step)) + 1
            )
            soc_levels = [
                min(max_capacity, planning_floor_kwh + i * soc_step)
                for i in range(levels)
            ]

            def soc_to_index(value: float) -> int:
                return max(
                    0,
                    min(
                        len(soc_levels) - 1,
                        bisect.bisect_left(soc_levels, value + eps),
                    ),
                )

            INF_COST = 1e12
            INF_DEV = 1e6
            dp: List[List[Tuple[float, float]]] = [
                [(INF_COST, INF_DEV) for _ in soc_levels] for _ in range(n + 1)
            ]
            choice: List[List[Optional[Tuple[int, int]]]] = [
                [None for _ in soc_levels] for _ in range(n)
            ]

            for s_idx, soc_level in enumerate(soc_levels):
                deviation = abs(soc_level - target_capacity)
                dp[n][s_idx] = (0.0, deviation)

            candidate_modes = (
                CBB_MODE_HOME_I,
                CBB_MODE_HOME_II,
                CBB_MODE_HOME_III,
                CBB_MODE_HOME_UPS,
            )

            def _is_better(
                current: Tuple[float, float], best: Tuple[float, float]
            ) -> bool:
                cost_a, dev_a = current
                cost_b, dev_b = best
                if cost_a < cost_b - 1e-6:
                    return True
                if cost_a > cost_b + 1e-6:
                    return False
                return dev_a < dev_b - 1e-6

            for i in range(n - 1, -1, -1):
                price = spot_prices[i].get("price", 0.0)
                export_price = export_lookup.get(spot_prices[i].get("time"), 0.0)
                solar_kwh = solar_series[i] if i < len(solar_series) else 0.0
                load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125

                forced_mode = forced_modes.get(i)
                modes_to_try = (
                    (forced_mode,) if forced_mode is not None else candidate_modes
                )

                for s_idx, soc_level in enumerate(soc_levels):
                    best_pair = (INF_COST, INF_DEV)
                    best_choice = None

                    for mode in modes_to_try:
                        sim = self._simulate_interval(
                            mode=mode,
                            solar_kwh=solar_kwh,
                            load_kwh=load_kwh,
                            battery_soc_kwh=soc_level,
                            capacity_kwh=max_capacity,
                            hw_min_capacity_kwh=planning_floor_kwh,
                            spot_price_czk=price,
                            export_price_czk=export_price,
                            charge_efficiency=efficiency,
                            discharge_efficiency=efficiency,
                            home_charge_rate_kwh_15min=home_charge_rate_kwh_15min,
                            planning_min_capacity_kwh=planning_floor_kwh,
                        )
                        new_soc = sim.get("new_soc_kwh", soc_level)
                        if new_soc < planning_floor_kwh - 1e-6:
                            continue

                        next_idx = soc_to_index(new_soc)
                        future_cost, future_dev = dp[i + 1][next_idx]
                        if future_cost >= INF_COST:
                            continue

                        interval_cost = sim.get(
                            "net_cost_czk", sim.get("net_cost", 0.0)
                        )
                        total_pair = (interval_cost + future_cost, future_dev)

                        if _is_better(total_pair, best_pair):
                            best_pair = total_pair
                            best_choice = (mode, next_idx)

                    if best_choice:
                        dp[i][s_idx] = best_pair
                        choice[i][s_idx] = best_choice

            start_soc = max(current_capacity, planning_floor_kwh)
            start_idx = soc_to_index(start_soc)
            start_cost, _ = dp[0][start_idx]
            if start_cost >= INF_COST:
                _LOGGER.warning(
                    "Autonomy DP infeasible, falling back to greedy floor-guarded plan"
                )
                fallback_modes: List[int] = []
                soc = start_soc
                for i in range(n):
                    price = spot_prices[i].get("price", 0.0)
                    export_price = export_lookup.get(spot_prices[i].get("time"), 0.0)
                    solar_kwh = solar_series[i]
                    load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125
                    if soc <= planning_floor_kwh + guard_margin:
                        mode = CBB_MODE_HOME_UPS
                    else:
                        mode = CBB_MODE_HOME_I
                    fallback_modes.append(mode)
                    sim = self._simulate_interval(
                        mode=mode,
                        solar_kwh=solar_kwh,
                        load_kwh=load_kwh,
                        battery_soc_kwh=soc,
                        capacity_kwh=max_capacity,
                        hw_min_capacity_kwh=planning_floor_kwh,
                        spot_price_czk=price,
                        export_price_czk=export_price,
                        charge_efficiency=efficiency,
                        discharge_efficiency=efficiency,
                        home_charge_rate_kwh_15min=home_charge_rate_kwh_15min,
                        planning_min_capacity_kwh=planning_floor_kwh,
                    )
                    soc = sim.get("new_soc_kwh", soc)
                return {"modes": fallback_modes, "dp_cost": INF_COST}

            modes: List[int] = []
            soc_idx = start_idx
            for i in range(n):
                selection = choice[i][soc_idx]
                if not selection:
                    modes.append(forced_modes.get(i, CBB_MODE_HOME_I))
                    continue
                mode, next_idx = selection
                modes.append(mode)
                soc_idx = next_idx

            return {"modes": modes, "dp_cost": dp[0][start_idx]}

        while True:
            dp_result = run_dp()
            modes = dp_result["modes"]
            soc_trace = self._simulate_autonomy_soc_trace(
                modes=modes,
                spot_prices=spot_prices,
                export_prices=export_prices,
                solar_forecast=solar_forecast,
                load_forecast=load_forecast,
                current_capacity=current_capacity,
                max_capacity=max_capacity,
                min_capacity=planning_floor_kwh,
                efficiency=efficiency,
                home_charge_rate_kwh_15min=home_charge_rate_kwh_15min,
            )
            violation_idx = self._find_first_planning_floor_violation(
                soc_trace, planning_floor_kwh
            )
            if violation_idx is None:
                dp_result["precharge_intervals"] = sum(
                    1 for mode in forced_modes.values() if mode == CBB_MODE_HOME_UPS
                )
                return dp_result

            deficit = planning_floor_kwh + guard_margin - soc_trace[violation_idx]
            if deficit <= 0:
                # floating point noise
                dp_result["precharge_intervals"] = sum(
                    1 for mode in forced_modes.values() if mode == CBB_MODE_HOME_UPS
                )
                return dp_result

            required_slots = max(1, math.ceil(deficit / max(gain_per_slot, 1e-6)))
            candidates = [
                (spot_prices[idx].get("price", float("inf")), idx)
                for idx in range(0, violation_idx)
                if forced_modes.get(idx) != CBB_MODE_HOME_UPS
            ]
            candidates.sort()
            selected = [idx for _, idx in candidates[:required_slots]]
            if not selected:
                _LOGGER.warning(
                    "Autonomy DP: Unable to satisfy planning minimum before %s",
                    spot_prices[violation_idx].get("time"),
                )
                dp_result["precharge_intervals"] = sum(
                    1 for mode in forced_modes.values() if mode == CBB_MODE_HOME_UPS
                )
                return dp_result

            for idx in selected:
                forced_modes[idx] = CBB_MODE_HOME_UPS
            iteration += len(selected)
            if iteration >= max_iterations:
                _LOGGER.warning(
                    "Autonomy DP: reached max UPS iterations (%d)", max_iterations
                )
                dp_result["precharge_intervals"] = sum(
                    1 for mode in forced_modes.values() if mode == CBB_MODE_HOME_UPS
                )
                return dp_result

    def _simulate_autonomy_soc_trace(
        self,
        *,
        modes: List[int],
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        efficiency: float,
        home_charge_rate_kwh_15min: float,
    ) -> List[float]:
        """Simulate SoC before each interval for guard checks."""

        soc_trace: List[float] = []
        soc = current_capacity
        export_lookup = {
            ep.get("time"): ep.get("price", 0.0)
            for ep in export_prices
            if ep.get("time")
        }

        for idx, mode in enumerate(modes):
            soc_trace.append(soc)
            spot_price = spot_prices[idx].get("price", 0.0)
            export_price = export_lookup.get(spot_prices[idx].get("time"), 0.0)
            load_kwh = load_forecast[idx] if idx < len(load_forecast) else 0.125
            try:
                timestamp = datetime.fromisoformat(spot_prices[idx].get("time", ""))
                if timestamp.tzinfo is None:
                    timestamp = dt_util.as_local(timestamp)
                solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
            except Exception:
                solar_kwh = 0.0

            interval = self._simulate_interval(
                mode=mode,
                solar_kwh=solar_kwh,
                load_kwh=load_kwh,
                battery_soc_kwh=soc,
                capacity_kwh=max_capacity,
                hw_min_capacity_kwh=min_capacity,
                spot_price_czk=spot_price,
                export_price_czk=export_price,
                charge_efficiency=efficiency,
                discharge_efficiency=efficiency,
                home_charge_rate_kwh_15min=home_charge_rate_kwh_15min,
                planning_min_capacity_kwh=min_capacity,
            )
            soc = interval.get("new_soc_kwh", soc)

        return soc_trace

    def _find_first_planning_floor_violation(
        self, soc_trace: List[float], floor_kwh: float
    ) -> Optional[int]:
        """Return index of first interval that breaches planning minimum."""

        guard = floor_kwh + 0.05  # 50Wh guard band to avoid hovering at the floor
        for idx, soc in enumerate(soc_trace):
            if soc <= guard:
                return idx
        return None

    async def _archive_autonomy_summary(self, preview: Dict[str, Any]) -> None:
        """Store daily cost summary for autonomy preview (for yesterday detail)."""

        if not self._autonomy_store:
            return

        day_costs = preview.get("day_costs", {})
        if not day_costs:
            return

        try:
            data = await self._autonomy_store.async_load() or {}
            daily = data.get("daily", {})

            for day_str, cost in day_costs.items():
                daily[day_str] = {
                    "plan_total_cost": round(cost, 2),
                    "saved_at": dt_util.now().isoformat(),
                }

            # Cleanup - keep last 14 days
            if len(daily) > 14:
                sorted_days = sorted(daily.keys())
                for old_day in sorted_days[:-14]:
                    daily.pop(old_day, None)

            data["daily"] = daily
            await self._autonomy_store.async_save(data)
        except Exception as err:
            _LOGGER.warning(f"Failed to archive autonomy summary: {err}")

    def _aggregate_cost_by_day(
        self, timeline: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Aggregate planned cost by day."""

        day_costs: Dict[str, float] = {}
        for interval in timeline:
            ts = interval.get("time")
            if not ts:
                continue
            try:
                day = datetime.fromisoformat(ts).date().isoformat()
            except Exception:
                continue
            day_costs.setdefault(day, 0.0)
            day_costs[day] += interval.get("net_cost", 0.0)
        return day_costs

    def _get_day_cost_from_timeline(
        self, timeline: List[Dict[str, Any]], target_day: date
    ) -> Optional[float]:
        """Sum net_cost for specific date."""

        if not timeline:
            return None

        total = 0.0
        found = False
        for interval in timeline:
            ts = interval.get("time")
            if not ts:
                continue
            try:
                interval_day = datetime.fromisoformat(ts).date()
            except Exception:
                continue
            if interval_day == target_day:
                total += interval.get("net_cost", 0.0)
                found = True
        return total if found else None

    async def build_timeline_extended(self) -> Dict[str, Any]:
        """
        Postavit rozšířenou timeline strukturu pro API.

        Phase 2.9: Timeline Extended Builder
        - Kombinuje historická data (včera) + mixed (dnes) + plánovaná (zítra)
        - Používá daily_plan_state pro historical tracking
        - Používá DP optimalizaci pro planned data
        - PHASE 3.0: Načítá Storage Helper data pro včerejší baseline plan

        Returns:
            Dict s yesterday/today/tomorrow sekcemi + today_tile_summary
        """
        now = dt_util.now()
        today = now.date()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)

        # PHASE 3.0: Load Storage Helper data JEDNOU pro všechny dny
        storage_plans = {}
        if self._plans_store:
            try:
                storage_plans = await self._plans_store.async_load() or {}
                _LOGGER.debug(
                    f"📦 Loaded Storage Helper data for timeline building: "
                    f"{len(storage_plans.get('detailed', {}))} days"
                )
            except Exception as e:
                _LOGGER.error(f"Failed to load Storage Helper data: {e}")
                storage_plans = {}

        # Build timelines (pass storage_plans to _build_day_timeline)
        yesterday_data = await self._build_day_timeline(yesterday, storage_plans)
        today_data = await self._build_day_timeline(today, storage_plans)
        tomorrow_data = await self._build_day_timeline(tomorrow, storage_plans)

        # NOVÉ: Build today tile summary pro dlaždici "Dnes - Plnění plánu"
        today_tile_summary = self._build_today_tile_summary(
            today_data.get("intervals", []), now
        )

        return {
            "yesterday": yesterday_data,
            "today": today_data,
            "tomorrow": tomorrow_data,
            "today_tile_summary": today_tile_summary,  # ← NOVÉ pro dlaždici
        }

    async def build_detail_tabs(
        self, tab: Optional[str] = None, plan: str = "hybrid"
    ) -> Dict[str, Any]:
        """
        Build Detail Tabs data (aggregated mode blocks).
        """
        plan_normalized = (plan or "hybrid").lower()

        timeline_extended = await self.build_timeline_extended()
        hybrid_tabs = await self._build_hybrid_detail_tabs(
            tab=tab, timeline_extended=timeline_extended
        )
        autonomy_tabs = await self._build_autonomy_only_tabs(
            tab=tab,
            timeline_extended=timeline_extended,
            include_actual=True,
        )

        if plan_normalized == "autonomy":
            return self._decorate_plan_tabs(
                primary_tabs=autonomy_tabs,
                secondary_tabs=hybrid_tabs,
                primary_plan="autonomy",
                secondary_plan="hybrid",
            )

        return self._decorate_plan_tabs(
            primary_tabs=hybrid_tabs,
            secondary_tabs=autonomy_tabs,
            primary_plan="hybrid",
            secondary_plan="autonomy",
        )

    async def _build_hybrid_detail_tabs(
        self,
        tab: Optional[str] = None,
        timeline_extended: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Internal helper that builds hybrid detail tabs."""

        if tab is None:
            tabs_to_process = ["yesterday", "today", "tomorrow"]
        elif tab in ["yesterday", "today", "tomorrow"]:
            tabs_to_process = [tab]
        else:
            _LOGGER.warning(f"Invalid tab requested: {tab}, returning all tabs")
            tabs_to_process = ["yesterday", "today", "tomorrow"]

        result: Dict[str, Any] = {}
        if timeline_extended is None:
            timeline_extended = await self.build_timeline_extended()

        for tab_name in tabs_to_process:
            tab_data = timeline_extended.get(tab_name, {})
            intervals = tab_data.get("intervals", [])
            date_str = tab_data.get("date", "")

            if not intervals:
                tab_result = {
                    "date": date_str,
                    "mode_blocks": [],
                    "summary": {
                        "total_cost": 0.0,
                        "overall_adherence": 100,
                        "mode_switches": 0,
                        "metrics": self._default_metrics_summary(),
                    },
                    "intervals": [],
                }
            else:
                mode_blocks = self._build_mode_blocks_for_tab(intervals, tab_name)
                summary = self._calculate_tab_summary(mode_blocks, intervals)
                tab_result = {
                    "date": date_str,
                    "mode_blocks": mode_blocks,
                    "summary": summary,
                    "intervals": intervals,
                }

            result[tab_name] = tab_result

        return result

    async def _build_autonomy_only_tabs(
        self,
        tab: Optional[str] = None,
        timeline_extended: Optional[Dict[str, Any]] = None,
        include_actual: bool = True,
    ) -> Dict[str, Any]:
        """Build detail tabs purely from autonomy preview (no hybrid merge)."""

        preview = self._autonomy_preview or {}
        timeline = preview.get("timeline", [])

        today = dt_util.now().date()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)

        if tab is None:
            tabs_to_process: List[str] = ["yesterday", "today", "tomorrow"]
        else:
            tabs_to_process = [tab]

        actual_intervals_by_date: Dict[str, Dict[str, Any]] = {}
        if include_actual and timeline_extended:
            for key in ("yesterday", "today", "tomorrow"):
                day_data = (timeline_extended or {}).get(key, {})
                date_key = day_data.get("date")
                intervals = day_data.get("intervals", [])
                if not date_key or not intervals:
                    continue
                lookup: Dict[str, Any] = {}
                for interval in intervals:
                    ts = interval.get("time")
                    if ts:
                        lookup[ts] = interval
                if lookup:
                    actual_intervals_by_date[date_key] = lookup

        def build_day(day_obj: date) -> Dict[str, Any]:
            day_str = day_obj.isoformat()
            intervals = [
                iv for iv in timeline if iv.get("time", "").startswith(day_str)
            ]
            actual_lookup = (
                actual_intervals_by_date.get(day_str) if include_actual else None
            )
            pseudo_intervals: List[Dict[str, Any]] = []
            seen_times: set[str] = set()

            for iv in intervals:
                status = "planned"
                actual_payload = None
                if actual_lookup:
                    actual_interval = actual_lookup.get(iv.get("time"))
                    if actual_interval:
                        actual_payload = actual_interval.get("actual")
                        status = actual_interval.get("status", status)

                planned_payload = {
                    "mode": iv.get("mode"),
                    "mode_name": iv.get("mode_name"),
                    "battery_soc": iv.get("battery_soc"),
                    "battery_kwh": iv.get("battery_soc"),
                    "battery_capacity_kwh": iv.get("battery_capacity_kwh"),
                    "solar_kwh": iv.get("solar_kwh", 0.0),
                    "consumption_kwh": iv.get("load_kwh", 0.0),
                    "grid_import": iv.get("grid_import", 0.0),
                    "grid_export": iv.get("grid_export", 0.0),
                    "grid_import_kwh": iv.get("grid_import", 0.0),
                    "grid_export_kwh": iv.get("grid_export", 0.0),
                    "spot_price": iv.get("spot_price_czk", iv.get("spot_price", 0.0)),
                    "net_cost": iv.get("net_cost", 0.0),
                    "savings_vs_home_i": iv.get("savings_vs_home_i", 0.0),
                }

                pseudo_intervals.append(
                    {
                        "time": iv.get("time"),
                        "planned": planned_payload,
                        "actual": actual_payload,
                        "status": status,
                    }
                )
                if iv.get("time"):
                    seen_times.add(iv.get("time"))

            if actual_lookup:
                for ts in sorted(actual_lookup.keys()):
                    if not ts or ts in seen_times:
                        continue
                    actual_interval = actual_lookup.get(ts) or {}
                    pseudo_intervals.append(
                        {
                            "time": ts,
                            "planned": copy.deepcopy(
                                (actual_interval.get("planned") or {})
                            ),
                            "actual": copy.deepcopy(
                                (actual_interval.get("actual") or {})
                            ),
                            "status": actual_interval.get("status", "historical"),
                        }
                    )
                    seen_times.add(ts)

            if not pseudo_intervals:
                return {
                    "date": day_str,
                    "mode_blocks": [],
                    "summary": {
                        "total_cost": 0.0,
                        "overall_adherence": 100,
                        "mode_switches": 0,
                        "metrics": self._default_metrics_summary(),
                    },
                    "intervals": [],
                }

            pseudo_intervals.sort(key=lambda item: item.get("time") or "")
            tab_name = (
                "today"
                if day_obj == today
                else "yesterday" if day_obj == yesterday else "tomorrow"
            )
            mode_blocks = self._build_mode_blocks_for_tab(pseudo_intervals, tab_name)
            summary = self._calculate_tab_summary(mode_blocks, pseudo_intervals)

            return {
                "date": day_str,
                "mode_blocks": mode_blocks,
                "summary": summary,
                "intervals": pseudo_intervals,
            }

        mapping = {
            "yesterday": build_day(yesterday),
            "today": build_day(today),
            "tomorrow": build_day(tomorrow),
        }

        result: Dict[str, Any] = {}

        for key in tabs_to_process:
            result[key] = mapping.get(
                key,
                {
                    "date": (
                        yesterday
                        if key == "yesterday"
                        else tomorrow if key == "tomorrow" else today
                    ).isoformat(),
                    "mode_blocks": [],
                    "intervals": [],
                    "summary": {
                        "total_cost": 0.0,
                        "overall_adherence": 100,
                        "mode_switches": 0,
                        "metrics": self._default_metrics_summary(),
                    },
                },
            )

        return result

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

    def _get_planner_mode(self) -> str:
        if self._config_entry and self._config_entry.options:
            return self._config_entry.options.get(
                "battery_planner_mode", "hybrid_autonomy"
            )
        return "hybrid_autonomy"

    def _is_autonomy_preview_only(self) -> bool:
        return self._get_planner_mode() == "autonomy_preview"

    def _auto_mode_switch_enabled(self) -> bool:
        options = {}
        if self._config_entry:
            options = self._config_entry.options or {}
        if self._is_autonomy_preview_only():
            return False
        return bool(options.get(CONF_AUTO_MODE_SWITCH, False))

    def _get_auto_mode_plan(self) -> str:
        """Get the planner mode for auto-switching. Uses battery_planner_mode from config."""
        plan = "hybrid"  # Default: Standard planning
        if self._config_entry and self._config_entry.options:
            plan = self._config_entry.options.get("battery_planner_mode", "hybrid")
        if plan not in ("autonomy", "hybrid"):
            plan = "hybrid"  # Force valid value, no fallback
        return plan

    def _normalize_service_mode(
        self, mode_value: Optional[Union[str, int]]
    ) -> Optional[str]:
        if mode_value is None:
            return None
        if isinstance(mode_value, int):
            return CBB_MODE_SERVICE_MAP.get(mode_value)

        mode_str = str(mode_value).strip()
        if not mode_str:
            return None
        upper = mode_str.upper()
        if upper in AUTONOMY_MODE_SERVICE_MAP:
            return AUTONOMY_MODE_SERVICE_MAP[upper]

        # Attempt to standardize other strings (e.g., Home 1)
        title = mode_str.title()
        if title in AUTONOMY_MODE_SERVICE_MAP.values():
            return title

        return None

    def _parse_autonomy_timestamp(self, value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        dt_obj = dt_util.parse_datetime(value)
        if dt_obj is None:
            try:
                dt_obj = datetime.fromisoformat(value)
            except ValueError:
                return None
        if dt_obj.tzinfo is None:
            dt_obj = dt_util.as_local(dt_obj)
        return dt_obj

    def _get_current_box_mode(self) -> Optional[str]:
        if not self._hass:
            return None
        entity_id = f"sensor.oig_{self._box_id}_box_prms_mode"
        state = self._hass.states.get(entity_id)
        if not state or not state.state:
            return None
        normalized = self._normalize_service_mode(state.state)
        return normalized

    def _cancel_autonomy_switch_schedule(self) -> None:
        if self._autonomy_switch_handles:
            for unsub in self._autonomy_switch_handles:
                try:
                    unsub()
                except Exception as err:
                    _LOGGER.debug(f"Failed to cancel scheduled auto switch: {err}")
        self._autonomy_switch_handles = []
        self._clear_autonomy_switch_retry()

    def _clear_autonomy_switch_retry(self) -> None:
        if not self._autonomy_switch_retry_unsub:
            return
        try:
            self._autonomy_switch_retry_unsub()
        except Exception as err:
            _LOGGER.debug(f"Failed to cancel delayed auto switch sync: {err}")
        finally:
            self._autonomy_switch_retry_unsub = None

    def _start_autonomy_watchdog(self) -> None:
        """Ensure periodic enforcement of planned modes is running."""
        if (
            not self._hass
            or self._autonomy_watchdog_unsub
            or not self._auto_mode_switch_enabled()
        ):
            return

        self._autonomy_watchdog_unsub = async_track_time_interval(
            self._hass,
            self._autonomy_watchdog_tick,
            self._autonomy_watchdog_interval,
        )
        _LOGGER.debug(
            "[AutonomySwitch] Watchdog started (interval=%ss)",
            int(self._autonomy_watchdog_interval.total_seconds()),
        )

    def _stop_autonomy_watchdog(self) -> None:
        """Stop watchdog if running."""
        if self._autonomy_watchdog_unsub:
            self._autonomy_watchdog_unsub()
            self._autonomy_watchdog_unsub = None
            _LOGGER.debug("[AutonomySwitch] Watchdog stopped")

    async def _autonomy_watchdog_tick(self, now: datetime) -> None:
        """Periodic check that correct mode is applied."""
        if not self._auto_mode_switch_enabled():
            self._stop_autonomy_watchdog()
            return

        timeline, timeline_source = self._get_mode_switch_timeline()
        if not timeline:
            _LOGGER.debug(
                f"[AutonomySwitch] Watchdog: No timeline (source={timeline_source})"
            )
            return

        desired_mode = self._get_planned_mode_for_time(now, timeline)
        if not desired_mode:
            _LOGGER.debug(
                "[AutonomySwitch] Watchdog: No desired mode found for current time"
            )
            return

        current_mode = self._get_current_box_mode()
        _LOGGER.debug(
            f"[AutonomySwitch] Watchdog tick: current={current_mode}, desired={desired_mode}, source={timeline_source}"
        )
        if current_mode == desired_mode:
            return

        _LOGGER.warning(
            "[AutonomySwitch] Watchdog correcting mode from %s -> %s",
            current_mode or "unknown",
            desired_mode,
        )
        await self._ensure_current_mode(desired_mode, "watchdog enforcement")

    def _get_planned_mode_for_time(
        self, reference_time: datetime, timeline: List[Dict[str, Any]]
    ) -> Optional[str]:
        """Return planned mode for the interval covering reference_time."""
        planned_mode: Optional[str] = None

        for interval in timeline:
            timestamp = interval.get("time") or interval.get("timestamp")
            mode_label = self._normalize_service_mode(
                interval.get("mode_name")
            ) or self._normalize_service_mode(interval.get("mode"))
            if not timestamp or not mode_label:
                continue

            start_dt = self._parse_autonomy_timestamp(timestamp)
            if not start_dt:
                continue

            if start_dt <= reference_time:
                planned_mode = mode_label
                continue

            # Timeline is sorted; once we pass reference_time we can stop
            break

        return planned_mode

    def _schedule_autonomy_switch_retry(self, delay_seconds: float) -> None:
        if not self._hass or delay_seconds <= 0:
            return
        if self._autonomy_switch_retry_unsub:
            return

        async def _retry_async(now: datetime) -> None:
            """Async retry callback for autonomy switch."""
            self._autonomy_switch_retry_unsub = None
            if self._hass:
                await self._update_autonomy_switch_schedule()

        self._autonomy_switch_retry_unsub = async_call_later(
            self._hass, delay_seconds, _retry_async
        )
        _LOGGER.debug(
            "[AutonomySwitch] Delaying auto-switch sync by %.0f seconds", delay_seconds
        )

    def _get_mode_switch_offset(self, from_mode: Optional[str], to_mode: str) -> float:
        """Return reaction-time offset based on shield tracker statistics."""
        fallback = (
            self._config_entry.options.get("autonomy_switch_lead_seconds", 180.0)
            if self._config_entry and self._config_entry.options
            else 180.0
        )
        if not from_mode or not self._hass or not self._config_entry:
            return fallback

        try:
            entry = self._hass.data.get(DOMAIN, {}).get(self._config_entry.entry_id, {})
            service_shield = entry.get("service_shield")
            mode_tracker = getattr(service_shield, "mode_tracker", None)
            if not mode_tracker:
                return fallback

            offset_seconds = mode_tracker.get_offset_for_scenario(from_mode, to_mode)
            if offset_seconds is None or offset_seconds <= 0:
                return fallback

            return float(offset_seconds)
        except Exception as err:  # pragma: no cover - defensive
            _LOGGER.warning(
                "[AutonomySwitch] Failed to read mode switch offset %s→%s: %s",
                from_mode,
                to_mode,
                err,
            )
            return fallback

    def _get_service_shield(self) -> Optional[Any]:
        """Safe helper to get ServiceShield instance."""
        if not self._hass or not self._config_entry:
            return None

        entry = self._hass.data.get(DOMAIN, {}).get(self._config_entry.entry_id, {})
        return entry.get("service_shield")

    async def _execute_autonomy_mode_change(
        self, target_mode: str, reason: str
    ) -> None:
        if not self._hass:
            return

        now = dt_util.now()
        service_shield = self._get_service_shield()
        if service_shield and hasattr(service_shield, "has_pending_mode_change"):
            if service_shield.has_pending_mode_change(target_mode):
                _LOGGER.debug(
                    "[AutonomySwitch] Skipping %s (%s) - shield already processing mode change",
                    target_mode,
                    reason,
                )
                return

        if (
            self._last_autonomy_request
            and self._last_autonomy_request[0] == target_mode
            and (now - self._last_autonomy_request[1]).total_seconds() < 90
        ):
            _LOGGER.debug(
                f"[AutonomySwitch] Skipping duplicate request for {target_mode} ({reason})"
            )
            return

        try:
            await self._hass.services.async_call(
                DOMAIN,
                "set_box_mode",
                {
                    "mode": target_mode,
                    "acknowledgement": True,
                },
                blocking=False,
            )
            self._last_autonomy_request = (target_mode, now)
            _LOGGER.info(f"[AutonomySwitch] Requested mode '{target_mode}' ({reason})")
        except Exception as err:
            _LOGGER.error(
                f"[AutonomySwitch] Failed to switch to {target_mode}: {err}",
                exc_info=True,
            )

    async def _ensure_current_mode(self, desired_mode: str, reason: str) -> None:
        current_mode = self._get_current_box_mode()
        _LOGGER.info(
            f"[AutonomySwitch] _ensure_current_mode: current={current_mode}, desired={desired_mode}, reason={reason}"
        )
        if current_mode == desired_mode:
            _LOGGER.debug(
                f"[AutonomySwitch] Mode already {desired_mode} ({reason}), no action"
            )
            return
        _LOGGER.warning(
            f"[AutonomySwitch] Mode mismatch! current={current_mode} != desired={desired_mode}, executing change..."
        )
        await self._execute_autonomy_mode_change(desired_mode, reason)

    def _get_mode_switch_timeline(self) -> Tuple[List[Dict[str, Any]], str]:
        """
        Return the best available timeline for automatic mode switching.

        Preference order:
        1. Use plan selected for auto switching (autonomy/hybrid)
        2. If preferred plan is not available, fall back to available timeline

        CRITICAL FIX: When autonomy is preferred but not available,
        fall back to hybrid if hybrid timeline exists. This allows auto-switching
        to work even when autonomy timeline is not generated.
        """
        preferred_plan = self._get_auto_mode_plan()

        if preferred_plan == "autonomy":
            timeline = self.get_autonomy_timeline()
            if timeline:
                return timeline, "autonomy"
            # CHANGED: Fall back to hybrid if autonomy is preferred but missing
            _LOGGER.warning(
                "[AutonomySwitch] Autonomy plan preferred but timeline not available - falling back to hybrid"
            )
            # Try hybrid timeline as fallback
            hybrid_timeline = getattr(self, "_timeline_data", None) or []
            if hybrid_timeline:
                _LOGGER.info(
                    f"[AutonomySwitch] Using hybrid timeline as fallback ({len(hybrid_timeline)} intervals)"
                )
                return hybrid_timeline, "hybrid_fallback"
            return [], "none"

        # Hybrid is preferred (or default)
        hybrid_timeline = getattr(self, "_timeline_data", None) or []
        if hybrid_timeline:
            return hybrid_timeline, "hybrid"

        # Fall back to autonomy only if hybrid was preferred but missing
        timeline = self.get_autonomy_timeline()
        if timeline:
            _LOGGER.warning(
                "[AutonomySwitch] Hybrid plan preferred but not available - falling back to autonomy"
            )
            return timeline, "autonomy"

        return [], "none"

    async def _update_autonomy_switch_schedule(self) -> None:
        """Sync scheduled set_box_mode calls with autonomy preview."""
        # Always cancel previous schedule first
        self._cancel_autonomy_switch_schedule()

        if not self._hass:
            _LOGGER.debug("[AutonomySwitch] No hass instance, auto switching disabled")
            self._stop_autonomy_watchdog()
            return

        if not self._auto_mode_switch_enabled():
            auto_enabled = (
                self._config_entry.options.get(CONF_AUTO_MODE_SWITCH, False)
                if self._config_entry
                else False
            )
            _LOGGER.info(
                f"[AutonomySwitch] Auto mode switching disabled (CONF_AUTO_MODE_SWITCH={auto_enabled})"
            )
            self._stop_autonomy_watchdog()
            return

        now = dt_util.now()
        if self._auto_switch_ready_at:
            if now < self._auto_switch_ready_at:
                wait_seconds = (self._auto_switch_ready_at - now).total_seconds()
                _LOGGER.debug(
                    "[AutonomySwitch] Startup delay active (%.0fs remaining)",
                    wait_seconds,
                )
                self._schedule_autonomy_switch_retry(wait_seconds)
                return
            self._auto_switch_ready_at = None
            self._clear_autonomy_switch_retry()

        timeline, timeline_source = self._get_mode_switch_timeline()
        auto_plan = self._get_auto_mode_plan()
        _LOGGER.info(
            f"[AutonomySwitch] Timeline source={timeline_source}, auto_plan={auto_plan}, timeline_len={len(timeline) if timeline else 0}"
        )
        if not timeline:
            _LOGGER.warning(
                "[AutonomySwitch] No timeline available for auto switching (source=%s, auto_plan=%s)",
                timeline_source,
                auto_plan,
            )
            return
        if timeline_source != "autonomy":
            _LOGGER.info(
                "[AutonomySwitch] Using %s timeline (auto_plan=%s, %d intervals)",
                timeline_source,
                auto_plan,
                len(timeline),
            )

        current_mode: Optional[str] = None
        last_mode: Optional[str] = None
        scheduled_events: List[Tuple[datetime, str, Optional[str]]] = []

        for idx, interval in enumerate(timeline):
            timestamp = interval.get("time") or interval.get("timestamp")
            mode_raw = interval.get("mode_name") or interval.get("mode")
            mode_label = self._normalize_service_mode(
                interval.get("mode_name")
            ) or self._normalize_service_mode(interval.get("mode"))
            if idx < 3:  # Log first 3 intervals for debugging
                _LOGGER.info(
                    f"[AutonomySwitch] Interval {idx}: timestamp={timestamp}, mode_raw={mode_raw}, mode_label={mode_label}"
                )
            if not timestamp or not mode_label:
                continue

            start_dt = self._parse_autonomy_timestamp(timestamp)
            if not start_dt:
                continue

            if start_dt <= now:
                current_mode = mode_label
                last_mode = mode_label
                continue

            if mode_label == last_mode:
                continue

            previous_mode = last_mode
            last_mode = mode_label
            scheduled_events.append((start_dt, mode_label, previous_mode))

        if current_mode:
            await self._ensure_current_mode(current_mode, "current autonomy block")
        else:
            current_capacity = self._get_current_battery_capacity()
            planning_min = self._get_min_battery_capacity()
            if (
                current_capacity is not None
                and planning_min is not None
                and current_capacity <= planning_min + 0.1
            ):
                _LOGGER.warning(
                    "[AutonomySwitch] SOC %.2f kWh <= planning minimum %.2f kWh - forcing immediate Home UPS",
                    current_capacity,
                    planning_min,
                )
                await self._ensure_current_mode(
                    "Home UPS", "soc below planning minimum"
                )

        if not scheduled_events:
            _LOGGER.debug("[AutonomySwitch] No upcoming mode changes to schedule")
            self._start_autonomy_watchdog()
            return

        for when, mode, prev_mode in scheduled_events:
            lead_seconds = self._get_mode_switch_offset(
                prev_mode or current_mode or "Home 1", mode
            )
            adjusted_when = when - timedelta(seconds=lead_seconds)
            if adjusted_when <= now:
                adjusted_when = now + timedelta(seconds=1)

            async def _callback(event_time: datetime, desired_mode: str = mode) -> None:
                await self._execute_autonomy_mode_change(
                    desired_mode, f"scheduled {event_time.isoformat()}"
                )

            unsub = async_track_point_in_time(self._hass, _callback, adjusted_when)
            self._autonomy_switch_handles.append(unsub)
            _LOGGER.info(
                f"[AutonomySwitch] Scheduled switch to {mode} at {adjusted_when.isoformat()} (lead {lead_seconds:.0f}s, target {when.isoformat()})"
            )
        self._start_autonomy_watchdog()

    def _build_mode_blocks_for_tab(
        self, intervals: List[Dict[str, Any]], tab_name: str
    ) -> List[Dict[str, Any]]:
        """
        Postavit mode bloky pro jeden tab.

        Args:
            intervals: Seznam intervalů z _build_day_timeline()
            tab_name: "yesterday" | "today" | "tomorrow"

        Returns:
            Seznam mode bloků s detailními metrikami
        """
        if not intervals:
            return []

        # Určit data_type podle tabu
        now = dt_util.now()

        if tab_name == "yesterday":
            # VČERA - pouze historical data
            data_type = "completed"
        elif tab_name == "today":
            # DNES - historical (minulost) + planned (budoucnost)
            # Potřebujeme rozdělít na completed vs future
            data_type = "both"
        else:  # tomorrow
            # ZÍTRA - pouze planned
            data_type = "planned"

        # Použít existující _group_intervals_by_mode() pro agregaci
        mode_groups = self._group_intervals_by_mode(intervals, data_type)

        _LOGGER.info(
            f"[build_mode_blocks_for_tab] tab={tab_name}, data_type={data_type}, intervals_count={len(intervals)}, mode_groups_count={len(mode_groups)}"
        )

        total_capacity = self._get_total_battery_capacity() or 0.0

        def _extract_soc_payload(
            interval_entry: Dict[str, Any], branch: str
        ) -> Tuple[float, float]:
            """
            Vrátit dvojici (percent, kWh) pro daný interval a větev (actual/planned).

            Hodnoty v datech jsou bohužel nekonzistentní:
            - Actual intervaly mají battery_soc v % a battery_kwh v kWh
            - Planned intervaly ukládají battery_soc jako kWh (historický formát)

            Aby FE dostal konzistentní % SOC, normalizujeme zde.
            """

            source = (
                interval_entry.get(branch) if isinstance(interval_entry, dict) else None
            )
            if not isinstance(source, dict):
                return (0.0, 0.0)

            raw_soc = source.get("battery_soc")
            raw_kwh = source.get("battery_kwh")

            # Některé planned záznamy používají battery_capacity_kwh místo battery_kwh
            if raw_kwh is None:
                raw_kwh = source.get("battery_capacity_kwh")

            soc_percent = None
            kwh_value = raw_kwh

            if raw_soc is not None:
                if total_capacity > 0 and raw_soc <= total_capacity + 0.01:
                    # Hodnota je pravděpodobně v kWh (<= fyzická kapacita)
                    kwh_value = raw_soc if kwh_value is None else kwh_value
                else:
                    # Hodnota je v procentech (větší než fyzická kapacita)
                    soc_percent = raw_soc

            if soc_percent is None and kwh_value is not None and total_capacity > 0:
                soc_percent = (kwh_value / total_capacity) * 100.0

            if soc_percent is not None and kwh_value is None and total_capacity > 0:
                kwh_value = (soc_percent / 100.0) * total_capacity

            return (
                round(soc_percent or 0.0, 1),
                round(kwh_value or 0.0, 2),
            )

        # Helper pro grid net
        def _interval_net(
            interval_entry: Dict[str, Any], branch: str
        ) -> Optional[float]:
            if not isinstance(interval_entry.get(branch), dict):
                return None
            import_val = safe_nested_get(
                interval_entry, branch, "grid_import", default=None
            )
            if import_val is None:
                import_val = safe_nested_get(
                    interval_entry, branch, "grid_import_kwh", default=None
                )
            export_val = safe_nested_get(
                interval_entry, branch, "grid_export", default=None
            )
            if export_val is None:
                export_val = safe_nested_get(
                    interval_entry, branch, "grid_export_kwh", default=None
                )
            if import_val is None and export_val is None:
                return None
            return (import_val or 0.0) - (export_val or 0.0)

        # Rozšířit o detailní metriky pro Detail Tabs
        mode_blocks = []
        for group in mode_groups:
            group_intervals = group.get("intervals", [])
            if not group_intervals:
                continue

            # Základní info z group
            block = {
                "mode_historical": group.get("mode", "Unknown"),
                "mode_planned": group.get("mode", "Unknown"),  # Pro planned-only
                "mode_match": True,  # Default pro planned-only
                "status": self._determine_block_status(
                    group_intervals[0], group_intervals[-1], tab_name, now
                ),
                "start_time": group.get("start_time", ""),
                "end_time": group.get("end_time", ""),
                "interval_count": group.get("interval_count", 0),
            }

            # Duration v hodinách
            duration_hours = block["interval_count"] * 0.25  # 15min = 0.25h
            block["duration_hours"] = round(duration_hours, 2)

            # Náklady
            if data_type in ["completed", "both"]:
                block["cost_historical"] = group.get("actual_cost", 0.0)
                block["cost_planned"] = group.get("planned_cost", 0.0)
                block["cost_delta"] = group.get("delta", 0.0)

                # Mode match detection (porovnat historical vs planned mode)
                historical_mode = self._get_mode_from_intervals(
                    group_intervals, "actual"
                )
                planned_mode = self._get_mode_from_intervals(group_intervals, "planned")
                block["mode_historical"] = historical_mode or "Unknown"
                block["mode_planned"] = planned_mode or "Unknown"
                block["mode_match"] = historical_mode == planned_mode
            else:  # planned-only
                block["cost_planned"] = group.get("planned_cost", 0.0)
                block["cost_historical"] = None
                block["cost_delta"] = None

            # Battery SOC (začátek a konec bloku)
            first_interval = group_intervals[0]
            last_interval = group_intervals[-1]

            if data_type in ["completed", "both"]:
                start_soc_pct, start_soc_kwh = _extract_soc_payload(
                    first_interval, "actual"
                )
                end_soc_pct, end_soc_kwh = _extract_soc_payload(last_interval, "actual")
            else:
                start_soc_pct, start_soc_kwh = _extract_soc_payload(
                    first_interval, "planned"
                )
                end_soc_pct, end_soc_kwh = _extract_soc_payload(
                    last_interval, "planned"
                )

            block["battery_soc_start"] = start_soc_pct
            block["battery_soc_end"] = end_soc_pct
            block["battery_kwh_start"] = start_soc_kwh
            block["battery_kwh_end"] = end_soc_kwh

            # Energie totals (plan vs actual)
            solar_plan_total = 0.0
            solar_actual_total = 0.0
            solar_actual_samples = 0

            consumption_plan_total = 0.0
            consumption_actual_total = 0.0
            consumption_actual_samples = 0

            grid_plan_net_total = 0.0
            grid_actual_net_total = 0.0
            grid_actual_samples = 0

            grid_plan_export_total = 0.0
            grid_actual_export_total = 0.0
            grid_export_actual_samples = 0

            for iv in group_intervals:
                # Planned values
                solar_plan_total += safe_nested_get(
                    iv, "planned", "solar_kwh", default=0
                )
                consumption_plan_total += safe_nested_get(
                    iv, "planned", "consumption_kwh", default=0
                )
                grid_plan_net_total += _interval_net(iv, "planned") or 0.0
                grid_plan_export_total += safe_nested_get(
                    iv, "planned", "grid_export", default=0
                ) or safe_nested_get(iv, "planned", "grid_export_kwh", default=0)

                # Actual values
                actual_solar = safe_nested_get(iv, "actual", "solar_kwh", default=None)
                if actual_solar is not None:
                    solar_actual_total += actual_solar
                    solar_actual_samples += 1

                actual_consumption = safe_nested_get(
                    iv, "actual", "consumption_kwh", default=None
                )
                if actual_consumption is not None:
                    consumption_actual_total += actual_consumption
                    consumption_actual_samples += 1

                actual_net = _interval_net(iv, "actual")
                if actual_net is not None:
                    grid_actual_net_total += actual_net
                    grid_actual_samples += 1

                actual_export = safe_nested_get(
                    iv, "actual", "grid_export", default=None
                )
                if actual_export is None:
                    actual_export = safe_nested_get(
                        iv, "actual", "grid_export_kwh", default=None
                    )
                if actual_export is not None:
                    grid_actual_export_total += actual_export
                    grid_export_actual_samples += 1

            def _round_or_none(value: float, samples: int) -> Optional[float]:
                return round(value, 2) if samples > 0 else None

            block["solar_planned_kwh"] = round(solar_plan_total, 2)
            block["solar_actual_kwh"] = _round_or_none(
                solar_actual_total, solar_actual_samples
            )

            block["consumption_planned_kwh"] = round(consumption_plan_total, 2)
            block["consumption_actual_kwh"] = _round_or_none(
                consumption_actual_total, consumption_actual_samples
            )

            block["grid_import_planned_kwh"] = round(grid_plan_net_total, 2)
            block["grid_import_actual_kwh"] = _round_or_none(
                grid_actual_net_total, grid_actual_samples
            )

            block["grid_export_planned_kwh"] = round(grid_plan_export_total, 2)
            block["grid_export_actual_kwh"] = _round_or_none(
                grid_actual_export_total, grid_export_actual_samples
            )

            # Backwards compatible totals (use actual if available else planned)
            block["solar_total_kwh"] = (
                block["solar_actual_kwh"]
                if block["solar_actual_kwh"] is not None
                else block["solar_planned_kwh"]
            )
            block["consumption_total_kwh"] = (
                block["consumption_actual_kwh"]
                if block["consumption_actual_kwh"] is not None
                else block["consumption_planned_kwh"]
            )
            block["grid_import_total_kwh"] = (
                block["grid_import_actual_kwh"]
                if block["grid_import_actual_kwh"] is not None
                else block["grid_import_planned_kwh"]
            )
            block["grid_export_total_kwh"] = (
                block["grid_export_actual_kwh"]
                if block["grid_export_actual_kwh"] is not None
                else block["grid_export_planned_kwh"]
            )

            # Delta helpers
            def _calc_delta(
                actual_val: Optional[float], planned_val: float
            ) -> Optional[float]:
                if actual_val is None:
                    return None
                return round(actual_val - planned_val, 2)

            block["solar_delta_kwh"] = _calc_delta(
                block["solar_actual_kwh"], block["solar_planned_kwh"]
            )
            block["consumption_delta_kwh"] = _calc_delta(
                block["consumption_actual_kwh"], block["consumption_planned_kwh"]
            )
            block["grid_import_delta_kwh"] = _calc_delta(
                block["grid_import_actual_kwh"], block["grid_import_planned_kwh"]
            )
            block["grid_export_delta_kwh"] = _calc_delta(
                block["grid_export_actual_kwh"], block["grid_export_planned_kwh"]
            )

            # Adherence % (pro completed bloky)
            if data_type in ["completed", "both"] and block["mode_match"]:
                block["adherence_pct"] = 100
            elif data_type in ["completed", "both"]:
                # Mode nesouhlasí - částečná adherence
                block["adherence_pct"] = 0
            else:
                # Planned-only - N/A
                block["adherence_pct"] = None

            mode_blocks.append(block)

        return mode_blocks

    def _determine_block_status(
        self,
        first_interval: Dict[str, Any],
        last_interval: Dict[str, Any],
        tab_name: str,
        now: datetime,
    ) -> str:
        """
        Určit status bloku: completed | current | planned.

        Args:
            first_interval: První interval v bloku (start time)
            last_interval: Poslední interval v bloku (end time)
            tab_name: "yesterday" | "today" | "tomorrow"
            now: Aktuální čas

        Returns:
            "completed" | "current" | "planned"
        """
        if tab_name == "yesterday":
            return "completed"
        elif tab_name == "tomorrow":
            return "planned"
        else:  # today
            start_time_str = first_interval.get("time", "")
            end_time_str = last_interval.get("time", "")

            if not start_time_str or not end_time_str:
                return "planned"

            try:
                start_time = datetime.fromisoformat(start_time_str)
                end_time = datetime.fromisoformat(end_time_str)

                if start_time.tzinfo is None:
                    start_time = dt_util.as_local(start_time)
                if end_time.tzinfo is None:
                    end_time = dt_util.as_local(end_time)

                # Konec intervalu je začátek + 15 minut
                end_time = end_time + timedelta(minutes=15)

                current_minute = (now.minute // 15) * 15
                current_interval_time = now.replace(
                    minute=current_minute, second=0, microsecond=0
                )

                # Remove timezone for comparison
                start_time_naive = (
                    start_time.replace(tzinfo=None) if start_time.tzinfo else start_time
                )
                end_time_naive = (
                    end_time.replace(tzinfo=None) if end_time.tzinfo else end_time
                )
                current_interval_naive = current_interval_time.replace(tzinfo=None)

                # Celý blok v minulosti?
                if end_time_naive <= current_interval_naive:
                    return "completed"
                # Začátek v minulosti, konec v budoucnosti?
                elif start_time_naive <= current_interval_naive < end_time_naive:
                    return "current"
                # Celý blok v budoucnosti
                else:
                    return "planned"
            except Exception as e:
                _LOGGER.warning(f"[_determine_block_status] Error parsing times: {e}")
                return "planned"

    def _get_mode_from_intervals(
        self, intervals: List[Dict[str, Any]], key: str
    ) -> Optional[str]:
        """
        Získat mode z intervalů (actual nebo planned).

        Args:
            intervals: Seznam intervalů
            key: "actual" nebo "planned"

        Returns:
            Mode name nebo None
        """
        for interval in intervals:
            data = interval.get(key)
            if data and isinstance(data, dict):
                mode = data.get("mode")
                if isinstance(mode, int):
                    return CBB_MODE_NAMES.get(mode, f"Mode {mode}")
                elif mode:
                    return str(mode)
        return None

    def _calculate_tab_summary(
        self, mode_blocks: List[Dict[str, Any]], intervals: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Spočítat summary pro tab.

        Args:
            mode_blocks: Seznam mode bloků
            intervals: Raw intervaly

        Returns:
            Summary dict s total_cost, adherence, mode_switches
            + pro TODAY: completed_summary a planned_summary
        """
        if not mode_blocks:
            return {
                "total_cost": 0.0,
                "overall_adherence": 100,
                "mode_switches": 0,
                "metrics": self._default_metrics_summary(),
            }

        # Total cost (historical pokud máme, jinak planned)
        total_cost = 0.0
        adherent_blocks = 0
        total_blocks = len(mode_blocks)

        # Sub-summaries pro TODAY
        completed_blocks = []
        planned_blocks = []

        for block in mode_blocks:
            cost = block.get("cost_historical")
            if cost is not None:
                total_cost += cost
            else:
                total_cost += block.get("cost_planned", 0.0)

            # Adherence counting
            if block.get("adherence_pct") == 100:
                adherent_blocks += 1

            # Separate completed vs planned for TODAY
            if block.get("status") == "completed":
                completed_blocks.append(block)
            elif block.get("status") in ("current", "planned"):
                planned_blocks.append(block)

        # Overall adherence %
        overall_adherence = (
            round((adherent_blocks / total_blocks) * 100, 1)
            if total_blocks > 0
            else 100
        )

        # Mode switches = počet bloků - 1
        mode_switches = max(0, total_blocks - 1)

        metrics = self._aggregate_interval_metrics(intervals)

        summary = {
            "total_cost": round(total_cost, 2),
            "overall_adherence": overall_adherence,
            "mode_switches": mode_switches,
            "metrics": metrics,
        }

        # Add sub-summaries if we have both completed and planned (TODAY case)
        if completed_blocks and planned_blocks:
            # Completed summary
            completed_cost = sum(b.get("cost_historical", 0) for b in completed_blocks)
            completed_adherent = sum(
                1 for b in completed_blocks if b.get("adherence_pct") == 100
            )

            summary["completed_summary"] = {
                "count": len(completed_blocks),
                "total_cost": round(completed_cost, 2),
                "adherence_pct": (
                    round((completed_adherent / len(completed_blocks)) * 100, 1)
                    if completed_blocks
                    else 100
                ),
            }

            # Planned summary
            planned_cost = sum(b.get("cost_planned", 0) for b in planned_blocks)

            summary["planned_summary"] = {
                "count": len(planned_blocks),
                "total_cost": round(planned_cost, 2),
            }

        return summary

    def _aggregate_interval_metrics(
        self, intervals: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """Aggregate plan vs actual metrics for summary tiles."""

        def _get_plan_value(interval: Dict[str, Any], key: str) -> float:
            return safe_nested_get(interval, "planned", key, default=0.0)

        def _get_actual_value(interval: Dict[str, Any], key: str) -> Optional[float]:
            actual = interval.get("actual")
            if not actual:
                return None
            value = actual.get(key)
            if value is None:
                # Some actual payloads use _kwh suffix
                return actual.get(f"{key}_kwh")
            return value

        def _get_grid_net(payload: Dict[str, Any], prefix: str) -> float:
            import_key = "grid_import"
            export_key = "grid_export"
            import_val = safe_nested_get(payload, prefix, import_key, default=None)
            if import_val is None:
                import_val = safe_nested_get(
                    payload, prefix, f"{import_key}_kwh", default=0.0
                )
            export_val = safe_nested_get(payload, prefix, export_key, default=None)
            if export_val is None:
                export_val = safe_nested_get(
                    payload, prefix, f"{export_key}_kwh", default=0.0
                )
            return (import_val or 0.0) - (export_val or 0.0)

        metrics_template = {
            "plan": 0.0,
            "actual": 0.0,
            "actual_samples": 0,
        }

        metrics = {
            "cost": dict(metrics_template),
            "solar": dict(metrics_template),
            "consumption": dict(metrics_template),
            "grid": dict(metrics_template),
        }

        for interval in intervals or []:
            plan_cost = _get_plan_value(interval, "net_cost")
            actual_cost = _get_actual_value(interval, "net_cost")
            metrics["cost"]["plan"] += plan_cost
            if actual_cost is not None:
                metrics["cost"]["actual"] += actual_cost
                metrics["cost"]["actual_samples"] += 1
            else:
                metrics["cost"]["actual"] += plan_cost

            plan_solar = _get_plan_value(interval, "solar_kwh")
            actual_solar = _get_actual_value(interval, "solar_kwh")
            metrics["solar"]["plan"] += plan_solar
            if actual_solar is not None:
                metrics["solar"]["actual"] += actual_solar
                metrics["solar"]["actual_samples"] += 1
            else:
                metrics["solar"]["actual"] += plan_solar

            plan_consumption = _get_plan_value(interval, "consumption_kwh")
            actual_consumption = _get_actual_value(interval, "consumption_kwh")
            metrics["consumption"]["plan"] += plan_consumption
            if actual_consumption is not None:
                metrics["consumption"]["actual"] += actual_consumption
                metrics["consumption"]["actual_samples"] += 1
            else:
                metrics["consumption"]["actual"] += plan_consumption

            plan_grid = _get_grid_net(interval, "planned")
            actual_grid = None
            actual_payload = interval.get("actual")
            if actual_payload:
                actual_grid = (
                    actual_payload.get("grid_import")
                    or actual_payload.get("grid_import_kwh")
                    or 0.0
                ) - (
                    actual_payload.get("grid_export")
                    or actual_payload.get("grid_export_kwh")
                    or 0.0
                )
            metrics["grid"]["plan"] += plan_grid
            if actual_grid is not None:
                metrics["grid"]["actual"] += actual_grid
                metrics["grid"]["actual_samples"] += 1
            else:
                metrics["grid"]["actual"] += plan_grid

        formatted_metrics: Dict[str, Dict[str, Any]] = {}
        metric_units = {
            "cost": "Kč",
            "solar": "kWh",
            "consumption": "kWh",
            "grid": "kWh",
        }

        for key, value in metrics.items():
            formatted_metrics[key] = {
                "plan": round(value["plan"], 2),
                "actual": round(value["actual"], 2),
                "unit": metric_units.get(key, ""),
                "has_actual": value["actual_samples"] > 0,
            }

        return formatted_metrics

    def _default_metrics_summary(self) -> Dict[str, Dict[str, Any]]:
        return {
            "cost": {"plan": 0.0, "actual": 0.0, "unit": "Kč", "has_actual": False},
            "solar": {"plan": 0.0, "actual": 0.0, "unit": "kWh", "has_actual": False},
            "consumption": {
                "plan": 0.0,
                "actual": 0.0,
                "unit": "kWh",
                "has_actual": False,
            },
            "grid": {"plan": 0.0, "actual": 0.0, "unit": "kWh", "has_actual": False},
        }

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
        now = dt_util.now()

        # Build fresh data (bez cache)
        _LOGGER.info("Unified Cost Tile: Building fresh data...")
        build_start = dt_util.now()

        today = now.date()
        today - timedelta(days=1)
        today + timedelta(days=1)

        # Build data for each day
        try:
            today_data = await self._build_today_cost_data()
        except Exception as e:
            _LOGGER.error(f"Failed to build today cost data: {e}", exc_info=True)
            today_data = {
                "plan_total_cost": 0.0,
                "actual_total_cost": 0.0,
                "delta": 0.0,
                "performance": "on_plan",
                "completed_intervals": 0,
                "total_intervals": 0,
                "progress_pct": 0,
                "eod_prediction": {
                    "predicted_total": 0.0,
                    "vs_plan": 0.0,
                    "confidence": "low",
                },
                "error": str(e),
            }

        try:
            # Yesterday is always the same for both planners (historical data)
            yesterday_data = self._get_yesterday_cost_from_archive()
        except Exception as e:
            _LOGGER.error(f"Failed to get yesterday cost data: {e}", exc_info=True)
            yesterday_data = {
                "plan_total_cost": 0.0,
                "actual_total_cost": 0.0,
                "delta": 0.0,
                "performance": "on_plan",
                "error": str(e),
            }

        try:
            tomorrow_data = await self._build_tomorrow_cost_data()
        except Exception as e:
            _LOGGER.error(f"Failed to build tomorrow cost data: {e}", exc_info=True)
            tomorrow_data = {
                "plan_total_cost": 0.0,
                "error": str(e),
            }

        result = {
            "today": today_data,
            "yesterday": yesterday_data,
            "tomorrow": tomorrow_data,
            "metadata": {
                "last_update": str(now),
                "timezone": str(now.tzinfo),
            },
        }

        build_duration = (dt_util.now() - build_start).total_seconds()
        _LOGGER.info(f"Unified Cost Tile: Built in {build_duration:.2f}s")

        return result

    async def build_autonomy_cost_tile(self) -> Dict[str, Any]:
        """Build cost tile data for autonomous preview with blended totals."""

        now = dt_util.now()
        today = now.date()
        tomorrow = today + timedelta(days=1)
        today - timedelta(days=1)

        preview = self._autonomy_preview or {}
        timeline = preview.get("timeline", [])
        day_costs_preview = preview.get("day_costs", {})

        store_daily: Dict[str, Any] = {}
        if self._autonomy_store:
            try:
                store_data = await self._autonomy_store.async_load() or {}
                store_daily = store_data.get("daily", {})
            except Exception as err:
                _LOGGER.warning(f"Autonomy store load failed: {err}")

        timeline_extended = await self.build_timeline_extended()
        today_tab = (timeline_extended or {}).get("today", {})
        today_intervals: List[Dict[str, Any]] = today_tab.get("intervals", [])
        yesterday_summary = self._get_yesterday_cost_from_archive()

        def safe_float(value: Any, default: float = 0.0) -> float:
            try:
                if value is None:
                    return default
                return float(value)
            except (TypeError, ValueError):
                return default

        current_slot_start = now.replace(
            minute=(now.minute // 15) * 15,
            second=0,
            microsecond=0,
        )

        def parse_time(ts: Optional[str]) -> Optional[datetime]:
            if not ts:
                return None
            dt_obj = dt_util.parse_datetime(ts)
            if dt_obj is None:
                try:
                    dt_obj = datetime.fromisoformat(ts)
                except Exception:
                    return None
            if dt_obj.tzinfo is None:
                dt_obj = dt_util.as_local(dt_obj)
            return dt_obj

        def iter_autonomy_intervals(day_obj: date):
            prefix = day_obj.isoformat()
            for entry in timeline:
                ts_str = entry.get("time") or entry.get("timestamp")
                if not ts_str or not ts_str.startswith(prefix):
                    continue
                dt_obj = parse_time(ts_str)
                if not dt_obj or dt_obj.date() != day_obj:
                    continue
                yield entry, dt_obj

        def resolve_autonomy_plan_total(day_obj: date) -> Optional[float]:
            day_str = day_obj.isoformat()
            value = day_costs_preview.get(day_str)
            if value is None and store_daily.get(day_str):
                value = store_daily[day_str].get("plan_total_cost")
            if value is not None:
                try:
                    return round(float(value), 2)
                except (TypeError, ValueError):
                    return None
            total = 0.0
            found = False
            for entry, _ in iter_autonomy_intervals(day_obj):
                total += safe_float(entry.get("net_cost", 0.0))
                found = True
            return round(total, 2) if found else None

        def sum_future_autonomy(
            day_obj: date,
            cutoff: Optional[datetime],
            include_cutoff: bool,
        ) -> Optional[float]:
            total = 0.0
            found = False
            for entry, dt_obj in iter_autonomy_intervals(day_obj):
                if cutoff and (
                    dt_obj < cutoff or (not include_cutoff and dt_obj == cutoff)
                ):
                    continue
                found = True
                total += safe_float(entry.get("net_cost", 0.0))
            return round(total, 2) if found else None

        def sum_actual_cost_until(
            intervals: List[Dict[str, Any]], cutoff: datetime
        ) -> float:
            total = 0.0
            for interval in intervals:
                ts = parse_time(interval.get("time"))
                if not ts or ts >= cutoff:
                    continue
                actual = interval.get("actual")
                if not actual:
                    continue
                total += safe_float(actual.get("net_cost", 0.0))
            return round(total, 2)

        actual_cost_so_far = sum_actual_cost_until(today_intervals, current_slot_start)
        active_plan = "hybrid"
        active_plan_getter = getattr(self, "_get_active_plan_key", None)
        if callable(active_plan_getter):
            try:
                active_plan = active_plan_getter() or "hybrid"
            except Exception as err:
                _LOGGER.warning(
                    "Failed to resolve active plan key: %s. Defaulting to hybrid.", err
                )
        include_current_interval = active_plan == "autonomy"
        future_autonomy_cost = sum_future_autonomy(
            today, current_slot_start, include_current_interval
        )
        blended_total = (
            round(actual_cost_so_far + future_autonomy_cost, 2)
            if future_autonomy_cost is not None
            else None
        )

        hybrid_today_cost = self._get_day_cost_from_timeline(self._timeline_data, today)
        today_plan_total = resolve_autonomy_plan_total(today)
        today_entry = {
            "date": today.isoformat(),
            "plan_total_cost": today_plan_total,
            "hybrid_plan_total": (
                round(hybrid_today_cost, 2) if hybrid_today_cost is not None else None
            ),
            "delta_vs_hybrid": (
                round(today_plan_total - hybrid_today_cost, 2)
                if today_plan_total is not None and hybrid_today_cost is not None
                else None
            ),
            "blended_total_cost": blended_total,
            "actual_total_cost": actual_cost_so_far,
            "actual_cost_so_far": actual_cost_so_far,
            "future_plan_cost": future_autonomy_cost,
        }

        tomorrow_plan_total = resolve_autonomy_plan_total(tomorrow)
        hybrid_tomorrow_cost = self._get_day_cost_from_timeline(
            self._timeline_data, tomorrow
        )
        tomorrow_entry: Dict[str, Any] = {
            "date": tomorrow.isoformat(),
            "plan_total_cost": tomorrow_plan_total,
            "hybrid_plan_total": (
                round(hybrid_tomorrow_cost, 2)
                if hybrid_tomorrow_cost is not None
                else None
            ),
        }
        if (
            tomorrow_plan_total is not None
            and tomorrow_entry["hybrid_plan_total"] is not None
        ):
            tomorrow_entry["delta_vs_hybrid"] = round(
                tomorrow_plan_total - tomorrow_entry["hybrid_plan_total"], 2
            )

        result = {
            "today": today_entry,
            "yesterday": yesterday_summary,
            "tomorrow": tomorrow_entry,
            "metadata": {
                "last_update": now.isoformat(),
                "plan": "autonomy",
                "preview_available": bool(timeline),
            },
        }

        return result

    def _build_cost_comparison_summary(
        self,
        hybrid_tile: Optional[Dict[str, Any]],
        autonomy_tile: Optional[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """Prepare compact cost comparison snapshot for FE."""

        try:
            today_h = (hybrid_tile or {}).get("today", {}) or {}
            today_a = (autonomy_tile or {}).get("today", {}) or {}
            actual_spent = today_h.get("actual_cost_so_far")
            if actual_spent is None:
                actual_spent = today_h.get("actual_total_cost")
            if actual_spent is None:
                actual_spent = today_a.get("actual_cost_so_far")
            if actual_spent is None:
                actual_spent = today_a.get("actual_total_cost")
            actual_spent = round(actual_spent or 0, 2)

            def plan_summary(day_data, plan_key):
                future = day_data.get("future_plan_cost")
                if future is None:
                    future = day_data.get("plan_total_cost")
                future = round(future or 0, 2)
                total = round(actual_spent + future, 2)
                return {
                    "plan_key": plan_key,
                    "future_plan_cost": future,
                    "actual_cost": actual_spent,
                    "total_cost": total,
                }

            standard_summary = plan_summary(today_h, "hybrid")
            dynamic_summary = plan_summary(today_a, "autonomy")
            delta = round(
                dynamic_summary["total_cost"] - standard_summary["total_cost"], 2
            )

            tomorrow_std = ((hybrid_tile or {}).get("tomorrow", {}) or {}).get(
                "plan_total_cost"
            )
            tomorrow_dyn = ((autonomy_tile or {}).get("tomorrow", {}) or {}).get(
                "plan_total_cost"
            )

            summary = {
                "active_plan": (
                    self._get_active_plan_key()
                    if hasattr(self, "_get_active_plan_key")
                    else "hybrid"
                ),
                "actual_spent": actual_spent,
                "plans": {
                    "standard": standard_summary,
                    "dynamic": dynamic_summary,
                },
                "delta_vs_standard": delta,
                "baseline": today_h.get("baseline_comparison"),
                "yesterday": (hybrid_tile or {}).get("yesterday"),
                "tomorrow": {
                    "standard": tomorrow_std,
                    "dynamic": tomorrow_dyn,
                },
            }
            return summary
        except Exception as err:
            _LOGGER.warning(
                "Failed to build cost comparison summary: %s", err, exc_info=True
            )
            return None

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
                mode = (
                    actual_mode
                    if actual_mode is not None
                    else (planned_mode if planned_mode is not None else "Unknown")
                )
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
                mode = (
                    actual_mode
                    if actual_mode is not None
                    else (planned_mode if planned_mode is not None else "Unknown")
                )
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
                except:
                    pass

            if group["end_time"]:
                try:
                    end_dt = datetime.fromisoformat(group["end_time"])
                    # Přidat 15 minut pro konec intervalu
                    end_dt = end_dt + timedelta(minutes=15)
                    group["end_time"] = end_dt.strftime("%H:%M")
                except:
                    pass

            # PHASE 3.0: KEEP intervals for Detail Tabs API
            # Původně se mazaly pro úsporu paměti, ale Detail Tabs je potřebuje
            # del group["intervals"]

        return groups

    def _build_baseline_comparison(self, hybrid_cost: float) -> Dict[str, Any]:
        """
        Build baseline comparison data for cost tile.

        Compares HYBRID optimization cost against best fixed mode baseline.

        Args:
            hybrid_cost: Total cost of HYBRID plan (Kč)

        Returns:
            Dict with baseline comparison:
            {
                "hybrid_cost": 51.19,
                "best_baseline": "HOME_III",
                "best_baseline_cost": 59.64,
                "savings": 8.45,
                "savings_pct": 14.2,
                "all_baselines": {...}
            }
        """
        # Get baselines from mode_optimization_result
        if (
            not hasattr(self, "_mode_optimization_result")
            or not self._mode_optimization_result
        ):
            return {}

        baselines = self._mode_optimization_result.get("baselines", {})
        if not baselines:
            return {}

        # Find best baseline (lowest adjusted cost, excluding HOME_UPS)
        best_baseline = None
        best_cost = float("inf")

        for mode_name in ["HOME_I", "HOME_II", "HOME_III"]:
            if mode_name in baselines:
                cost = baselines[mode_name].get("adjusted_total_cost", float("inf"))
                if cost < best_cost:
                    best_cost = cost
                    best_baseline = mode_name

        if not best_baseline:
            return {}

        # Calculate savings
        savings = best_cost - hybrid_cost
        savings_pct = (savings / best_cost * 100) if best_cost > 0 else 0

        # Build all baselines summary (only HOME I/II/III for display)
        all_baselines = {}
        for mode_name in ["HOME_I", "HOME_II", "HOME_III"]:
            if mode_name in baselines:
                all_baselines[mode_name] = round(
                    baselines[mode_name].get("adjusted_total_cost", 0), 2
                )

        return {
            "hybrid_cost": round(hybrid_cost, 2),
            "best_baseline": best_baseline,
            "best_baseline_cost": round(best_cost, 2),
            "savings": round(savings, 2),
            "savings_pct": round(savings_pct, 1),
            "all_baselines": all_baselines,
        }

    def _analyze_today_variance(
        self, intervals: List[Dict], plan_total: float, predicted_total: float
    ) -> str:
        """
        Analyze today's variance from plan and generate human-readable explanation.

        Compares planned vs actual for completed intervals, identifies biggest impacts.

        Returns:
            Human-readable text explaining what happened and why costs differ from plan.
        """
        # Separate completed intervals
        completed = [i for i in intervals if i.get("actual")]

        if not completed:
            return f"Dnes plánujeme utratit {plan_total:.0f} Kč. Den právě začal, zatím žádná data."

        # Aggregate planned vs actual metrics
        total_plan_solar = sum(
            i.get("planned", {}).get("solar_kwh", 0) for i in completed
        )
        total_actual_solar = sum(
            i.get("actual", {}).get("solar_kwh", 0) for i in completed
        )

        total_plan_load = sum(
            i.get("planned", {}).get("load_kwh", 0) for i in completed
        )
        total_actual_load = sum(
            i.get("actual", {}).get("load_kwh", 0) for i in completed
        )

        sum(i.get("planned", {}).get("net_cost", 0) for i in completed)
        sum(i.get("actual", {}).get("net_cost", 0) for i in completed)

        # Calculate variances
        solar_diff = total_actual_solar - total_plan_solar
        load_diff = total_actual_load - total_plan_load
        cost_diff = predicted_total - plan_total

        # Build explanation
        text = f"Měli jsme naplánováno {plan_total:.0f} Kč, ale vypadá to na {predicted_total:.0f} Kč"

        if abs(cost_diff) >= 1:
            text += f" ({cost_diff:+.0f} Kč).\n"
        else:
            text += " (přesně dle plánu).\n"

        # Solar variance
        if abs(solar_diff) >= 0.5:
            text += f"Slunce svítilo o {abs(solar_diff):.1f} kWh {'VÍC' if solar_diff > 0 else 'MÉNĚ'} než odhad (plán: {total_plan_solar:.1f} kWh, real: {total_actual_solar:.1f} kWh).\n"

        # Load variance
        if abs(load_diff) >= 0.5:
            text += f"Spotřeba byla o {abs(load_diff):.1f} kWh {'VĚTŠÍ' if load_diff > 0 else 'MENŠÍ'} (plán: {total_plan_load:.1f} kWh, real: {total_actual_load:.1f} kWh).\n"

        # Identify biggest impact
        solar_cost_impact = abs(solar_diff) * 4.0  # rough estimate Kč/kWh
        load_cost_impact = abs(load_diff) * 4.0

        if solar_cost_impact > load_cost_impact and abs(solar_diff) >= 0.5:
            text += f"Největší dopad: {'menší' if solar_diff < 0 else 'větší'} solární výroba ({solar_cost_impact:+.0f} Kč)."
        elif abs(load_diff) >= 0.5:
            text += f"Největší dopad: {'vyšší' if load_diff > 0 else 'nižší'} spotřeba ({load_cost_impact:+.0f} Kč)."

        return text

    async def _analyze_yesterday_performance(self) -> str:
        """
        Analyze yesterday's performance - post-mortem of plan vs actual.

        Returns:
            Human-readable explanation of what happened yesterday and biggest variances.
        """
        now = dt_util.now()
        yesterday = (now - timedelta(days=1)).date()

        yesterday_timeline = await self._build_day_timeline(yesterday)
        if not yesterday_timeline:
            return "Včera: Žádná data k dispozici."

        intervals = yesterday_timeline.get("intervals", [])
        if not intervals:
            return "Včera: Žádné intervaly."

        # Aggregate full day
        total_plan_solar = sum(
            i.get("planned", {}).get("solar_kwh", 0) for i in intervals
        )
        total_actual_solar = sum(
            i.get("actual", {}).get("solar_kwh", 0)
            for i in intervals
            if i.get("actual")
        )

        total_plan_load = sum(
            i.get("planned", {}).get("load_kwh", 0) for i in intervals
        )
        total_actual_load = sum(
            i.get("actual", {}).get("load_kwh", 0) for i in intervals if i.get("actual")
        )

        total_plan_cost = sum(
            i.get("planned", {}).get("net_cost", 0) for i in intervals
        )
        total_actual_cost = sum(
            i.get("actual", {}).get("net_cost", 0) for i in intervals if i.get("actual")
        )

        cost_diff = total_actual_cost - total_plan_cost
        solar_diff = total_actual_solar - total_plan_solar
        load_diff = total_actual_load - total_plan_load

        # Build text
        text = f"Včera jsme plánovali {total_plan_cost:.0f} Kč, utratili jsme {total_actual_cost:.0f} Kč"

        if abs(cost_diff) >= 1:
            text += f" ({cost_diff:+.0f} Kč).\n"
        else:
            text += " (přesně dle plánu).\n"

        if abs(solar_diff) >= 0.5:
            text += f"Solární výroba: plán {total_plan_solar:.1f} kWh, real {total_actual_solar:.1f} kWh ({solar_diff:+.1f} kWh).\n"

        if abs(load_diff) >= 0.5:
            text += f"Spotřeba: plán {total_plan_load:.1f} kWh, real {total_actual_load:.1f} kWh ({load_diff:+.1f} kWh).\n"

        # Biggest impacts
        impacts = []
        if abs(solar_diff) >= 0.5:
            impacts.append(
                f"{'menší' if solar_diff < 0 else 'větší'} solár ({abs(solar_diff) * 4:.0f} Kč)"
            )
        if abs(load_diff) >= 0.5:
            impacts.append(
                f"{'vyšší' if load_diff > 0 else 'nižší'} spotřeba ({abs(load_diff) * 4:.0f} Kč)"
            )

        if impacts:
            text += f"Největší dopad: {', '.join(impacts)}."

        return text

    async def _analyze_tomorrow_plan(self) -> str:
        """
        Analyze tomorrow's plan - expected production, consumption, charging, battery state.

        Returns:
            Human-readable explanation of tomorrow's plan and expectations.
        """
        now = dt_util.now()
        tomorrow = (now + timedelta(days=1)).date()

        tomorrow_timeline = await self._build_day_timeline(tomorrow)
        if not tomorrow_timeline:
            return "Zítra: Žádný plán k dispozici."

        intervals = tomorrow_timeline.get("intervals", [])
        if not intervals:
            return "Zítra: Žádné intervaly naplánované."

        # Aggregate planned metrics - PHASE 3.0 FIX: Use safe_nested_get
        total_solar = sum(
            safe_nested_get(i, "planned", "solar_kwh", default=0) for i in intervals
        )
        total_load = sum(
            safe_nested_get(i, "planned", "load_kwh", default=0) for i in intervals
        )
        total_cost = sum(
            safe_nested_get(i, "planned", "net_cost", default=0) for i in intervals
        )

        # Find charging intervals (HOME_UPS mode)
        charging_intervals = [
            i for i in intervals if safe_nested_get(i, "planned", "mode") == "HOME_UPS"
        ]
        total_charging = sum(
            safe_nested_get(i, "planned", "grid_charge_kwh", default=0)
            for i in charging_intervals
        )

        # Get last interval battery state
        last_interval = intervals[-1] if intervals else None
        final_battery = (
            safe_nested_get(last_interval, "planned", "battery_kwh", default=0)
            if last_interval
            else 0
        )
        final_battery_pct = (
            (final_battery / 10.0 * 100) if final_battery else 0
        )  # assuming 10 kWh capacity

        # Average spot price
        (
            sum(
                safe_nested_get(i, "planned", "spot_price", default=0)
                for i in intervals
            )
            / len(intervals)
            if intervals
            else 0
        )

        # Build text
        text = f"Zítra plánujeme {total_cost:.0f} Kč.\n"
        text += f"Očekávaná solární výroba: {total_solar:.1f} kWh"

        if total_solar < 5:
            text += " (zataženo)"
        elif total_solar > 15:
            text += " (slunečno)"
        text += ".\n"

        text += f"Očekávaná spotřeba: {total_load:.1f} kWh.\n"

        if total_charging >= 0.5:
            avg_charging_price = (
                sum(
                    i.get("planned", {}).get("spot_price", 0)
                    for i in charging_intervals
                )
                / len(charging_intervals)
                if charging_intervals
                else 0
            )
            text += f"Plánované nabíjení: {total_charging:.1f} kWh v noci (průměr {avg_charging_price:.1f} Kč/kWh).\n"

        text += f"Stav baterie na konci dne: {final_battery:.1f} kWh ({final_battery_pct:.0f}%)."

        return text

    async def _build_today_cost_data(self) -> Dict[str, Any]:
        """
        Build today's cost data with actual vs plan tracking.

        UCT-BE-002: Implementovat _build_today_cost_data()
        """
        now = dt_util.now()
        today = now.date()

        # Load storage plans for timeline building
        storage_plans = {}
        if self._plans_store:
            try:
                storage_plans = await self._plans_store.async_load() or {}
            except Exception as e:
                _LOGGER.warning(f"Failed to load storage plans: {e}")
                storage_plans = {}

        # Get today's timeline
        today_timeline = await self._build_day_timeline(today, storage_plans)
        _LOGGER.info(
            f"[UCT] _build_day_timeline returned: type={type(today_timeline)}, value={today_timeline is not None}"
        )
        if not today_timeline:
            _LOGGER.warning("_build_day_timeline returned None for today")
            today_timeline = {}
        intervals = today_timeline.get("intervals", [])
        _LOGGER.info(f"[UCT] Intervals count: {len(intervals)}")

        # Extract spot prices for today (for minigraph visualization)
        spot_prices_today = []
        if self.coordinator and self.coordinator.data:
            spot_data = self.coordinator.data.get("spot_prices", {})
            timeline = spot_data.get("timeline", [])

            if timeline:
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                today_end = now.replace(
                    hour=23, minute=59, second=59, microsecond=999999
                )

                for sp in timeline:
                    sp_time_str = sp.get("time", "")
                    if not sp_time_str:
                        continue

                    sp_time = datetime.fromisoformat(sp_time_str)
                    if sp_time.tzinfo is None:
                        sp_time = dt_util.as_local(sp_time)

                    if today_start <= sp_time <= today_end:
                        spot_prices_today.append(
                            {
                                "time": sp_time_str,
                                "price": sp.get("spot_price_czk", 0.0),
                            }
                        )

                _LOGGER.info(
                    f"[UCT] Extracted {len(spot_prices_today)} spot prices for today"
                )

        if not intervals:
            return {
                "plan_total_cost": 0.0,
                "actual_total_cost": 0.0,
                "delta": 0.0,
                "performance": "on_plan",
                "completed_intervals": 0,
                "total_intervals": 0,
                "progress_pct": 0,
                "eod_prediction": {
                    "predicted_total": 0.0,
                    "vs_plan": 0.0,
                    "confidence": "low",
                },
                "spot_prices_today": spot_prices_today,
            }

        # Separate completed vs future intervals
        completed = []
        future = []
        active = None

        current_minute = (now.minute // 15) * 15
        current_interval_time = now.replace(
            minute=current_minute, second=0, microsecond=0
        )

        # Konec dnešního dne (půlnoc)
        end_of_today = now.replace(hour=23, minute=59, second=59, microsecond=999999)

        for interval in intervals:
            # PHASE 3.0 FIX: Skip None intervals
            if interval is None:
                continue

            # PHASE 3.0 FIX: Type check
            if not isinstance(interval, dict):
                continue

            interval_time_str = interval.get("time", "")
            if not interval_time_str:
                continue

            interval_time = datetime.fromisoformat(interval_time_str)
            if interval_time.tzinfo is None:
                interval_time = dt_util.as_local(interval_time)

            # Skip intervals after midnight (patří do zítřka)
            if interval_time > end_of_today:
                continue

            # Compare naive datetimes to avoid timezone issues
            interval_time_naive = (
                interval_time.replace(tzinfo=None)
                if interval_time.tzinfo
                else interval_time
            )
            current_interval_naive = (
                current_interval_time.replace(tzinfo=None)
                if current_interval_time.tzinfo
                else current_interval_time
            )

            if interval_time_naive < current_interval_naive:
                if interval.get("actual"):
                    completed.append(interval)
            elif interval_time_naive == current_interval_naive:
                active = interval
            else:
                future.append(interval)

        # Calculate totals - PHASE 3.0 FIX: Use safe_get_cost helper
        completed = [c for c in completed if c is not None]
        future = [f for f in future if f is not None]

        # PHASE 3.0 FIX: Safe sum with None handling
        def safe_get_cost(interval: Dict[str, Any], key: str) -> float:
            """Safely get cost from interval, handling None values."""
            data = interval.get(key)
            if data is None:
                return 0.0
            if isinstance(data, dict):
                return float(data.get("net_cost", 0))
            return 0.0

        plan_completed = sum(safe_get_cost(c, "planned") for c in completed)
        actual_completed = sum(safe_get_cost(c, "actual") for c in completed)

        _LOGGER.debug(
            f"💰 Cost calculation: plan_completed={plan_completed:.2f}, "
            f"actual_completed={actual_completed:.2f}, "
            f"completed_count={len(completed)}"
        )
        if completed:
            first = completed[0]
            _LOGGER.debug(
                f"   First completed: plan={safe_nested_get(first, 'planned', 'net_cost', default=0):.2f}, "
                f"actual={safe_nested_get(first, 'actual', 'net_cost', default=0):.2f}"
            )

        plan_future = sum(
            safe_nested_get(f, "planned", "net_cost", default=0) for f in future
        )
        if active:
            plan_future += safe_nested_get(active, "planned", "net_cost", default=0)

        plan_total = plan_completed + plan_future
        actual_total = actual_completed  # Skutečnost jen za completed

        delta = actual_completed - plan_completed

        # Performance classification (±2% tolerance)
        if plan_completed > 0:
            delta_pct = (delta / plan_completed) * 100
            if delta_pct < -2:
                performance = "better"
            elif delta_pct > 2:
                performance = "worse"
            else:
                performance = "on_plan"
        else:
            performance = "on_plan"

        # Progress - % času dne (nikoli % intervalů!)
        now_time = now.time()
        seconds_since_midnight = (
            now_time.hour * 3600 + now_time.minute * 60 + now_time.second
        )
        total_seconds_in_day = 24 * 3600
        progress_pct = seconds_since_midnight / total_seconds_in_day * 100

        total_intervals = len(intervals)
        completed_count = len(completed)

        # EOD prediction
        # ZMĚNA: Používáme plán pro budoucí intervaly, ne drift ratio
        # (drift ratio platí jen pro již proběhlé intervaly)
        if plan_completed > 0:
            actual_completed / plan_completed
        else:
            pass

        # EOD = actual (dosud) + plánované budoucí náklady
        eod_predicted = actual_completed + plan_future
        eod_vs_plan = eod_predicted - plan_total

        # Confidence based on how much data we have
        if completed_count < 10:
            confidence = "low"
        elif completed_count < 48:
            confidence = "medium"
        else:
            confidence = "high"

        # Calculate savings vs HOME I (v2.1 requirement)
        plan_savings_completed = sum(
            c.get("planned", {}).get("savings_vs_home_i", 0) for c in completed
        )
        actual_savings_completed = sum(
            c.get("actual", {}).get("savings_vs_home_i", 0) for c in completed
        )
        plan_savings_future = sum(
            f.get("planned", {}).get("savings_vs_home_i", 0) for f in future
        )
        if active:
            plan_savings_future += active.get("planned", {}).get("savings_vs_home_i", 0)

        plan_savings_total = plan_savings_completed + plan_savings_future
        # ZMĚNA: Používáme plán pro budoucí úspory, ne drift
        predicted_savings = actual_savings_completed + plan_savings_future

        # Count mode switches and blocks (v2.1 metadata requirement)
        mode_switches = 0
        total_blocks = 0
        last_mode = None
        for interval in intervals:
            current_mode = interval.get("planned", {}).get("mode", "")
            if current_mode != last_mode:
                if last_mode is not None:
                    mode_switches += 1
                total_blocks += 1
                last_mode = current_mode

        # Calculate partial performance for active interval (v2.1 requirement)
        active_interval_data = None
        if active:
            interval_time_str = active.get("time", "")
            if interval_time_str:
                interval_time = datetime.fromisoformat(interval_time_str)
                if interval_time.tzinfo is None:
                    interval_time = dt_util.as_local(interval_time)

                duration_minutes = active.get("duration_minutes", 120)
                elapsed_minutes = int((now - interval_time).total_seconds() / 60)
                interval_progress_pct = min(
                    100, max(0, (elapsed_minutes / duration_minutes) * 100)
                )

                # Get planned values
                planned_cost = active.get("planned", {}).get("net_cost", 0)
                planned_savings = active.get("planned", {}).get("savings", 0)

                # Expected values at current progress
                expected_cost = planned_cost * (interval_progress_pct / 100)
                expected_savings = planned_savings * (interval_progress_pct / 100)

                # Get actual values so far (if available)
                actual_data = active.get("actual") or {}
                actual_cost_so_far = actual_data.get("net_cost", expected_cost)
                actual_savings_so_far = actual_data.get("savings", expected_savings)

                # Calculate partial performance
                cost_delta = actual_cost_so_far - expected_cost
                cost_delta_pct = (
                    (cost_delta / expected_cost * 100) if expected_cost > 0 else 0
                )

                active_interval_data = {
                    "time": interval_time_str,
                    "duration_minutes": duration_minutes,
                    "elapsed_minutes": elapsed_minutes,
                    "progress_pct": round(interval_progress_pct, 1),
                    "planned_cost": round(planned_cost, 2),
                    "planned_savings": round(planned_savings, 2),
                    "expected_cost_at_progress": round(expected_cost, 2),
                    "expected_savings_at_progress": round(expected_savings, 2),
                    "actual_cost_so_far": round(actual_cost_so_far, 2),
                    "actual_savings_so_far": round(actual_savings_so_far, 2),
                    "cost_delta": round(cost_delta, 2),
                    "cost_delta_pct": round(cost_delta_pct, 1),
                    "performance": (
                        "better"
                        if cost_delta < -0.5
                        else "worse" if cost_delta > 0.5 else "on_plan"
                    ),
                }

        # FÁZE 1 - Nové metriky pro FE (BE-centralizace)
        # remaining_to_eod = zbývající PLÁNOVANÉ náklady (ne predikce!)
        remaining_to_eod = plan_future
        vs_plan_pct = (eod_vs_plan / plan_total * 100) if plan_total > 0 else 0.0

        # Performance klasifikace (±2% tolerance)
        if vs_plan_pct <= -2:
            performance_class = "better"
            performance_icon = "✅"
        elif vs_plan_pct >= 2:
            performance_class = "worse"
            performance_icon = "❌"
        else:
            performance_class = "on_plan"
            performance_icon = "⚪"

        # FÁZE 1.2 - Seskupené intervaly podle režimů
        completed_groups = self._group_intervals_by_mode(completed, "completed")
        future_groups = self._group_intervals_by_mode(future, "planned")

        # Active group (pokud existuje)
        active_group = None
        if active is not None:
            active_groups = self._group_intervals_by_mode([active], "both")
            if active_groups:
                active_group = active_groups[0]

        # PHASE 2.10: Baseline comparison for cost tile
        baseline_comparison = self._build_baseline_comparison(plan_total)

        # Generate human-readable tooltips for cost analysis
        today_tooltip = self._analyze_today_variance(
            intervals, plan_total, eod_predicted
        )
        yesterday_tooltip = await self._analyze_yesterday_performance()
        tomorrow_tooltip = await self._analyze_tomorrow_plan()

        return {
            "plan_total_cost": round(plan_total, 2),
            "actual_total_cost": round(actual_total, 2),
            "delta": round(delta, 2),
            "blended_total_cost": round(actual_completed + plan_future, 2),
            "actual_cost_so_far": round(actual_completed, 2),
            "future_plan_cost": round(plan_future, 2),
            "performance": performance,
            "completed_intervals": completed_count,
            "total_intervals": total_intervals,
            "progress_pct": round(progress_pct, 1),
            "eod_prediction": {
                "predicted_total": round(eod_predicted, 2),
                "vs_plan": round(eod_vs_plan, 2),
                "confidence": confidence,
                "predicted_savings": round(predicted_savings, 2),
                "planned_savings": round(plan_savings_total, 2),
            },
            # FÁZE 1 - Nové metriky
            "remaining_to_eod": round(remaining_to_eod, 2),
            "future_plan_savings": round(plan_savings_future, 2),
            "vs_plan_pct": round(vs_plan_pct, 1),
            "performance_class": performance_class,
            "performance_icon": performance_icon,
            # PHASE 2.10 - Baseline comparison
            "baseline_comparison": baseline_comparison,
            # Spot prices for visualization (minigraph)
            "spot_prices_today": spot_prices_today,
            # Human-readable tooltips
            "tooltips": {
                "today": today_tooltip,
                "yesterday": yesterday_tooltip,
                "tomorrow": tomorrow_tooltip,
            },
            # FÁZE 1.2 - Seskupené intervaly
            "completed_groups": completed_groups,
            "active_group": active_group,
            "future_groups": future_groups,
            "completed_so_far": {
                "actual_cost": round(actual_completed, 2),
                "planned_cost": round(plan_completed, 2),
                "delta_cost": round(delta, 2),
                "delta_pct": round(delta_pct if plan_completed > 0 else 0, 1),
                "actual_savings": round(actual_savings_completed, 2),
                "planned_savings": round(plan_savings_completed, 2),
                "performance": performance,
            },
            "active_interval": active_interval_data,
            "metadata": {
                "mode_switches": mode_switches,
                "total_blocks": total_blocks,
                "completed_intervals": completed_count,
                "active_intervals": 1 if active else 0,
                "future_intervals": len(future),
            },
        }

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
            now.date().strftime("%Y-%m-%d")

            # Backfill posledních 7 dní (kromě dneška)
            backfilled_count = 0
            for days_ago in range(1, 8):  # 1-7 dní zpátky
                date = (now.date() - timedelta(days=days_ago)).strftime("%Y-%m-%d")

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

    def _get_yesterday_cost_from_archive(self) -> Dict[str, Any]:
        """
        Get yesterday's cost data from archive.

        UCT-BE-003: Implementovat _get_yesterday_cost_from_archive()
        DŮLEŽITÉ: Bereme z archivu, NEPOČÍTÁME!
        """
        yesterday = (dt_util.now().date() - timedelta(days=1)).strftime("%Y-%m-%d")

        # Get from archive
        if yesterday in self._daily_plans_archive:
            archive_data = self._daily_plans_archive[yesterday]
            actual_intervals = archive_data.get("actual", [])

            # Calculate from archived data
            plan_total = sum(
                self._resolve_interval_cost(interval, prefer_actual=False)
                for interval in archive_data.get("plan", [])
            )
            actual_total = sum(
                self._resolve_interval_cost(interval, prefer_actual=True)
                for interval in actual_intervals
            )
            delta = actual_total - plan_total

            # Performance classification
            if plan_total > 0:
                delta_pct = (delta / plan_total) * 100
                if delta_pct < -2:
                    performance = "better"
                    performance_icon = "✅"
                elif delta_pct > 2:
                    performance = "worse"
                    performance_icon = "❌"
                else:
                    performance = "on_plan"
                    performance_icon = "⚪"
            else:
                performance = "on_plan"
                performance_icon = "⚪"
                delta_pct = 0.0

            # FÁZE 2 - Mode statistiky a skupiny
            mode_groups = self._group_intervals_by_mode(actual_intervals, "completed")

            # Helper: normalizace mode na jméno
            def normalize_mode(mode_raw):
                if isinstance(mode_raw, int):
                    return CBB_MODE_NAMES.get(mode_raw, f"Mode {mode_raw}")
                elif mode_raw:
                    return str(mode_raw).strip()
                return "Unknown"

            # Přidat mode matching statistiky ke každé skupině
            for group in mode_groups:
                # Najít originální intervaly pro tuto skupinu
                group_intervals = [
                    iv
                    for iv in actual_intervals
                    if iv is not None
                    and (
                        normalize_mode((iv.get("actual") or {}).get("mode"))
                        == group["mode"]
                        or normalize_mode((iv.get("planned") or {}).get("mode"))
                        == group["mode"]
                    )
                ]

                mode_matches = sum(
                    1
                    for iv in group_intervals
                    if normalize_mode((iv.get("actual") or {}).get("mode"))
                    == normalize_mode((iv.get("planned") or {}).get("mode"))
                )
                mode_mismatches = len(group_intervals) - mode_matches
                adherence_pct = (
                    (mode_matches / len(group_intervals) * 100)
                    if len(group_intervals) > 0
                    else 0.0
                )

                group["mode_matches"] = mode_matches
                group["mode_mismatches"] = mode_mismatches
                group["adherence_pct"] = round(adherence_pct, 1)

            # Celková shoda režimů
            total_matches = sum(
                1
                for iv in actual_intervals
                if iv is not None
                and normalize_mode((iv.get("actual") or {}).get("mode"))
                == normalize_mode((iv.get("planned") or {}).get("mode"))
            )
            mode_adherence_pct = (
                (total_matches / len(actual_intervals) * 100)
                if len(actual_intervals) > 0
                else 0.0
            )

            # Top 3 největší odchylky
            variances = []
            for iv in actual_intervals:
                planned_cost = iv.get("planned", {}).get("net_cost", 0)
                actual_cost = iv.get("actual", {}).get("net_cost", 0)
                variance = actual_cost - planned_cost
                if abs(variance) > 0.5:  # Jen významné odchylky
                    variances.append(
                        {
                            "time": iv.get("time", ""),
                            "planned": round(planned_cost, 2),
                            "actual": round(actual_cost, 2),
                            "variance": round(variance, 2),
                            "variance_pct": round(
                                (
                                    (variance / planned_cost * 100)
                                    if planned_cost > 0
                                    else 0
                                ),
                                1,
                            ),
                        }
                    )

            # Seřadit podle absolutní velikosti odchylky
            variances.sort(key=lambda x: abs(x["variance"]), reverse=True)
            top_variances = variances[:3]

            return {
                "plan_total_cost": round(plan_total, 2),
                "actual_total_cost": round(actual_total, 2),
                "delta": round(delta, 2),
                "performance": performance,
                # FÁZE 2 - Nové metriky
                "performance_icon": performance_icon,
                "vs_plan_pct": round(delta_pct, 1),
                "mode_groups": mode_groups,
                "mode_adherence_pct": round(mode_adherence_pct, 1),
                "top_variances": top_variances,
            }
        else:
            # No archive data
            return {
                "plan_total_cost": 0.0,
                "actual_total_cost": 0.0,
                "delta": 0.0,
                "performance": "on_plan",
                "note": "No archive data available",
            }

    def _resolve_interval_cost(
        self, interval: Optional[Dict[str, Any]], prefer_actual: bool = True
    ) -> float:
        """Extract or derive interval cost from archived payload."""

        if not interval:
            return 0.0

        payload_candidates: List[Optional[Dict[str, Any]]] = []
        if isinstance(interval, dict):
            if prefer_actual:
                payload_candidates.append(interval.get("actual"))
                payload_candidates.append(
                    interval if not interval.get("actual") else None
                )
                payload_candidates.append(interval.get("planned"))
            else:
                payload_candidates.append(interval.get("planned"))
                payload_candidates.append(
                    interval if not interval.get("planned") else None
                )
                payload_candidates.append(interval.get("actual"))
        else:
            payload_candidates.append(interval)  # type: ignore[arg-type]

        for payload in payload_candidates:
            if not payload or not isinstance(payload, dict):
                continue
            value = payload.get("net_cost")
            if value is not None:
                try:
                    return float(value)
                except (TypeError, ValueError):
                    pass

            # Derive from energy + price data if available
            grid_import = payload.get("grid_import_kwh", payload.get("grid_import"))
            grid_export = payload.get("grid_export_kwh", payload.get("grid_export"))
            spot_price = payload.get("spot_price_czk", payload.get("spot_price"))
            export_price = payload.get("export_price_czk", payload.get("export_price"))

            if grid_import is not None and spot_price is not None:
                try:
                    import_cost = float(grid_import) * float(spot_price)
                    export_cost = float(grid_export or 0) * float(export_price or 0)
                    return round(import_cost - export_cost, 2)
                except (TypeError, ValueError):
                    continue

        return 0.0

    async def _build_tomorrow_cost_data(self) -> Dict[str, Any]:
        """
        Build tomorrow's cost data (plan only).

        UCT-BE-004: Implementovat _build_tomorrow_cost_data()
        """
        tomorrow = dt_util.now().date() + timedelta(days=1)

        # Get tomorrow's timeline
        tomorrow_timeline = await self._build_day_timeline(tomorrow)
        intervals = tomorrow_timeline.get("intervals", [])

        if not intervals:
            return {
                "plan_total_cost": 0.0,
            }

        # Calculate total plan
        plan_total = sum(
            interval.get("planned", {}).get("net_cost", 0) for interval in intervals
        )

        # FÁZE 3 - Mode distribuce a skupiny
        mode_distribution = {}
        for interval in intervals:
            if interval is None:
                continue
            mode_raw = (interval.get("planned") or {}).get("mode", "Unknown")

            # Převést mode ID na jméno
            if isinstance(mode_raw, int):
                mode = CBB_MODE_NAMES.get(mode_raw, f"Mode {mode_raw}")
            elif mode_raw and mode_raw != "Unknown":
                mode = str(mode_raw).strip()
            else:
                mode = "Unknown"

            mode_distribution[mode] = mode_distribution.get(mode, 0) + 1

        # Dominantní režim
        if mode_distribution:
            dominant_mode = max(mode_distribution.items(), key=lambda x: x[1])
            dominant_mode_name = dominant_mode[0]
            dominant_mode_count = dominant_mode[1]
            dominant_mode_pct = (
                (dominant_mode_count / len(intervals) * 100)
                if len(intervals) > 0
                else 0.0
            )
        else:
            dominant_mode_name = "Unknown"
            dominant_mode_count = 0
            dominant_mode_pct = 0.0

        # Seskupené intervaly
        planned_groups = self._group_intervals_by_mode(intervals, "planned")

        return {
            "plan_total_cost": round(plan_total, 2),
            # FÁZE 3 - Nové metriky
            "mode_distribution": mode_distribution,
            "dominant_mode_name": dominant_mode_name,
            "dominant_mode_count": dominant_mode_count,
            "dominant_mode_pct": round(dominant_mode_pct, 1),
            "planned_groups": planned_groups,
        }

    async def _fetch_mode_history_from_recorder(
        self, start_time: datetime, end_time: datetime
    ) -> List[Dict[str, Any]]:
        """
        Načíst historical režimy ze senzoru box_prms_mode z HA Recorderu.

        Phase 3.0: Historical Mode Tracking
        - Implementuje Recorder-based historical fetching podle dokumentace
        - "Historical se NEUKLÁDÁ (z Recorderu on-demand)"
        - Načítá změny režimu ze sensor.oig_{box_id}_box_prms_mode

        Args:
            start_time: Začátek periody (timezone-aware)
            end_time: Konec periody (timezone-aware)

        Returns:
            List intervalů s actual modes:
            [
                {
                    "time": "2025-11-06T00:51:44+00:00",
                    "mode_name": "Home UPS",
                    "mode": 5
                },
                ...
            ]
        """
        if not self._hass:
            _LOGGER.warning("HASS not available, cannot fetch mode history")
            return []

        sensor_id = f"sensor.oig_{self._box_id}_box_prms_mode"

        try:
            from homeassistant.components.recorder import history

            # Načíst změny stavu ze sensoru
            history_data = await self._hass.async_add_executor_job(
                history.state_changes_during_period,
                self._hass,
                start_time,
                end_time,
                sensor_id,
            )

            if not history_data or sensor_id not in history_data:
                _LOGGER.debug(
                    f"No mode history found for {sensor_id} between {start_time} - {end_time}"
                )
                return []

            states = history_data[sensor_id]
            if not states:
                return []

            # Konvertovat stavy na intervaly
            mode_intervals = []
            for state in states:
                mode_name = state.state
                if mode_name in ["unavailable", "unknown", None]:
                    continue

                # Mapovat mode name na mode ID
                mode_id = self._map_mode_name_to_id(mode_name)

                mode_intervals.append(
                    {
                        "time": state.last_changed.isoformat(),
                        "mode_name": mode_name,
                        "mode": mode_id,
                    }
                )

            _LOGGER.debug(
                f"📊 Fetched {len(mode_intervals)} mode changes from Recorder "
                f"for {sensor_id} ({start_time.strftime('%Y-%m-%d %H:%M')} - {end_time.strftime('%Y-%m-%d %H:%M')})"
            )

            return mode_intervals

        except ImportError:
            _LOGGER.error("Recorder component not available")
            return []
        except Exception as e:
            _LOGGER.error(f"Error fetching mode history from Recorder: {e}")
            return []

    def _map_mode_name_to_id(self, mode_name: str) -> int:
        """
        Mapovat mode name (z sensoru) na mode ID.

        Args:
            mode_name: Např. "Home 1", "Home UPS", "Home 3"

        Returns:
            Mode ID (0-3)
        """
        # Mapping podle CBB_MODE_NAMES constants
        mode_mapping = {
            "Home 1": CBB_MODE_HOME_I,  # 0
            "Home 2": CBB_MODE_HOME_II,  # 1
            "Home 3": CBB_MODE_HOME_III,  # 2
            "Home UPS": CBB_MODE_HOME_UPS,  # 3
        }

        # Normalizovat string (remove extra spaces, case-insensitive)
        normalized = mode_name.strip()

        mode_id = mode_mapping.get(normalized)
        if mode_id is None:
            _LOGGER.warning(
                f"Unknown mode name '{mode_name}', using fallback mode ID 0 (HOME I)"
            )
            return 0

        return mode_id

    async def _build_day_timeline(
        self, date: date, storage_plans: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """

        Postavit timeline pro jeden den.

        Phase 3.0: Načítá historical MODES z HA Recorderu (on-demand)
        Phase 2.9: Načítá actual_intervals z JSON storage místo z paměti.

        Args:
            date: Datum dne
            storage_plans: Optional Storage Helper data (pro planned intervaly včera)

        Returns:
            Dict s intervals a summary pro daný den
        """
        now = dt_util.now()
        today = now.date()

        # Make day_start and day_end timezone-aware
        day_start = dt_util.as_local(datetime.combine(date, datetime.min.time()))
        day_end = dt_util.as_local(datetime.combine(date, datetime.max.time()))

        intervals: List[Dict[str, Any]] = []
        date_str = date.strftime("%Y-%m-%d")

        # Určit zdroj dat podle dne
        if date < today:
            # VČERA - pouze historical (načíst z JSON storage)
            source = "historical_only"
        elif date == today:
            # DNES - historical (00:00-NOW) + planned (NOW-23:45)
            source = "mixed"
        else:
            # ZÍTRA - pouze planned
            source = "planned_only"

        # PHASE 3.0: Načíst historical modes z Recorderu (pro včera a dnes)
        historical_modes_lookup = {}
        if source in ["historical_only", "mixed"] and self._hass:
            try:
                # Determine fetch end time
                if source == "historical_only":
                    # Celý včerejšek
                    fetch_end = day_end
                else:  # mixed (today)
                    # Pouze do TEĎKA (ne budoucnost)
                    fetch_end = now

                # Await async method directly (we're in async context now!)
                mode_history = await self._fetch_mode_history_from_recorder(
                    day_start, fetch_end
                )

                # Build lookup table: time -> mode_data
                # First, build map of mode changes
                mode_changes = []
                for mode_entry in mode_history:
                    time_key = mode_entry.get("time", "")
                    if time_key:
                        try:
                            dt = datetime.fromisoformat(time_key)
                            # Make timezone-aware if needed
                            if dt.tzinfo is None:
                                dt = dt_util.as_local(dt)
                            mode_changes.append(
                                {
                                    "time": dt,
                                    "mode": mode_entry.get("mode"),
                                    "mode_name": mode_entry.get("mode_name"),
                                }
                            )
                        except:
                            continue

                # Sort by time
                mode_changes.sort(key=lambda x: x["time"])

                # Expand to all 15-min intervals in the day
                # Fill forward: each interval gets the mode that was active at that time
                interval_time = day_start

                while interval_time <= fetch_end:
                    # Find the mode that was active at interval_time
                    # Use the last mode change that happened before or at interval_time
                    active_mode = None
                    for i, change in enumerate(mode_changes):
                        if change["time"] <= interval_time:
                            active_mode = change
                        else:
                            break

                    if active_mode:
                        interval_time_str = interval_time.strftime("%Y-%m-%dT%H:%M:%S")
                        historical_modes_lookup[interval_time_str] = {
                            "time": interval_time_str,
                            "mode": active_mode["mode"],
                            "mode_name": active_mode["mode_name"],
                        }

                    interval_time += timedelta(minutes=15)

                _LOGGER.debug(
                    f"📊 Loaded {len(historical_modes_lookup)} historical mode intervals "
                    f"from Recorder for {date_str} ({source}) (expanded from {len(mode_changes)} changes)"
                )

            except Exception as e:
                _LOGGER.error(
                    f"Failed to fetch historical modes from Recorder for {date_str}: {e}"
                )
                historical_modes_lookup = {}

        # Build intervals podle source
        if source == "historical_only":
            # ========================================
            # VČERA - historical modes z Recorderu + planned z Storage
            # Historical modes: Z Recorderu (actual)
            # Planned data: Z Storage Helper (baseline plan)
            # ========================================

            # Pro včera NEMÁME planned data v paměti (optimal_timeline je pro dnes+zítra)
            # ALE máme baseline plan v Storage Helper!

            # Získat planned intervaly z Storage
            planned_intervals_map = {}
            if storage_plans:
                yesterday_plan = storage_plans.get("detailed", {}).get(date_str, {})
                planned_intervals_list = yesterday_plan.get("intervals", [])

                # Build lookup table: time -> planned_data
                for planned_entry in planned_intervals_list:
                    time_key = planned_entry.get("time", "")
                    if time_key:
                        # Normalize to full datetime format
                        try:
                            # time is "HH:MM" format
                            planned_dt = datetime.combine(
                                date, datetime.strptime(time_key, "%H:%M").time()
                            )
                            planned_dt = dt_util.as_local(planned_dt)
                            time_str = planned_dt.strftime("%Y-%m-%dT%H:%M:%S")
                            planned_intervals_map[time_str] = planned_entry
                        except:
                            continue

                _LOGGER.debug(
                    f"📊 Loaded {len(planned_intervals_map)} planned intervals "
                    f"from Storage for {date_str}"
                )

            # Build 96 intervalů s historical + planned data
            interval_time = day_start
            while interval_time.date() == date:
                interval_time_str = interval_time.strftime("%Y-%m-%dT%H:%M:%S")

                # Historical mode z Recorderu
                mode_from_recorder = historical_modes_lookup.get(interval_time_str)

                # Planned data z Storage
                planned_from_storage = planned_intervals_map.get(interval_time_str, {})

                # Build interval data
                actual_data = {}
                if mode_from_recorder:
                    # Fetch actual consumption/costs from history
                    interval_end = interval_time + timedelta(minutes=15)
                    historical_metrics = await self._fetch_interval_from_history(
                        interval_time, interval_end
                    )

                    if historical_metrics:
                        actual_data = {
                            "mode": mode_from_recorder.get("mode", 0),
                            "mode_name": mode_from_recorder.get("mode_name", "Unknown"),
                            "consumption_kwh": historical_metrics.get(
                                "consumption_kwh", 0
                            ),
                            "solar_kwh": historical_metrics.get("solar_kwh", 0),
                            "battery_soc": historical_metrics.get("battery_soc", 0),
                            "battery_kwh": historical_metrics.get("battery_kwh", 0),
                            "grid_import_kwh": historical_metrics.get(
                                "grid_import",
                                0,  # Function returns "grid_import" not "grid_import_kwh"
                            ),
                            "grid_export_kwh": historical_metrics.get(
                                "grid_export",
                                0,  # Function returns "grid_export" not "grid_export_kwh"
                            ),
                            "net_cost": historical_metrics.get("net_cost", 0),
                            "savings": 0,  # Savings requires baseline comparison
                        }
                    else:
                        # Fallback if history unavailable
                        actual_data = {
                            "mode": mode_from_recorder.get("mode", 0),
                            "mode_name": mode_from_recorder.get("mode_name", "Unknown"),
                            "consumption_kwh": 0,
                            "solar_kwh": 0,
                            "battery_soc": 0,
                            "battery_kwh": 0,
                            "grid_import_kwh": 0,
                            "grid_export_kwh": 0,
                            "net_cost": 0,
                            "savings": 0,
                        }

                planned_data = {}
                if planned_from_storage:
                    planned_data = {
                        "mode": planned_from_storage.get("mode", 0),
                        "mode_name": planned_from_storage.get("mode_name", "Unknown"),
                        "consumption_kwh": planned_from_storage.get(
                            "consumption_kwh", 0
                        ),
                        "solar_kwh": planned_from_storage.get("solar_kwh", 0),
                        "battery_soc": planned_from_storage.get("battery_soc", 0),
                        "net_cost": planned_from_storage.get("net_cost", 0),
                    }

                # Mode match detection
                mode_match = None
                if actual_data and planned_data:
                    actual_mode = actual_data.get("mode")
                    planned_mode = planned_data.get("mode")
                    mode_match = actual_mode == planned_mode

                intervals.append(
                    {
                        "time": interval_time_str,
                        "status": "historical",
                        "planned": planned_data,
                        "actual": actual_data,
                        "delta": None,
                        "mode_match": mode_match,
                    }
                )

                interval_time += timedelta(minutes=15)

        elif source == "mixed":
            # ========================================
            # DNES: Historical (Recorder) + Planned (kombinace actual + future)
            # Planned data KOMBINACE:
            #   1. MINULOST: Z _daily_plan_state["actual"] (plánovaná data z rána)
            #   2. BUDOUCNOST: Z _timeline_data (aktivní optimalizace)
            # Historical modes: Z Recorderu
            # ========================================

            # Phase 1: Get past planned intervals
            # Priority:
            #   1. Storage Helper (ranní plán uložený v 00:10)
            #   2. Fallback: _daily_plan_state["actual"] (pokud storage není dostupný)
            past_planned = []

            # Try Storage Helper first
            date_str = date.strftime("%Y-%m-%d")
            storage_day = storage_plans.get("detailed", {}).get(date_str)
            if storage_day and storage_day.get("intervals"):
                past_planned = storage_day["intervals"]
                _LOGGER.debug(
                    f"📦 Loaded {len(past_planned)} planned intervals from Storage Helper for {date}"
                )
            # Fallback: _daily_plan_state
            elif hasattr(self, "_daily_plan_state") and self._daily_plan_state:
                actual_intervals = self._daily_plan_state.get("actual", [])
                # "actual" obsahuje jak actual tak i planned data z rána
                for interval in actual_intervals:
                    if interval.get("time"):
                        past_planned.append(interval)
                _LOGGER.debug(
                    f"📋 Loaded {len(past_planned)} intervals from _daily_plan_state for {date}"
                )
            else:
                _LOGGER.debug(f"⚠️  No past planned data available for {date}")

            # Phase 2: Get future planned intervals from active timeline
            future_planned = []
            all_timeline = getattr(self, "_timeline_data", [])
            parse_errors = 0
            wrong_date = 0
            for interval in all_timeline:
                time_str = interval.get("time")
                if time_str:
                    try:
                        interval_dt = datetime.fromisoformat(time_str)
                        # Keep only intervals from today
                        if interval_dt.date() == date:
                            future_planned.append(interval)
                        else:
                            wrong_date += 1
                    except (ValueError, TypeError):
                        parse_errors += 1
                        continue

            _LOGGER.debug(
                f"📋 Future filter: {len(future_planned)} kept, {wrong_date} wrong_date, "
                f"{parse_errors} parse_errors (from {len(all_timeline)} total)"
            )

            _LOGGER.debug(
                f"📋 Planned data sources for {date}: "
                f"past={len(past_planned)} intervals from daily_plan, "
                f"future={len(future_planned)} intervals from active timeline"
            )

            # Determine current interval
            current_minute = (now.minute // 15) * 15
            current_interval = now.replace(
                minute=current_minute, second=0, microsecond=0
            )
            # Remove timezone for comparison with naive datetimes from timeline
            current_interval_naive = current_interval.replace(tzinfo=None)

            # Phase 3: MERGE - use past_planned for history, future_planned for future
            planned_lookup = {}

            # Add all past planned data (před current_interval)
            for p in past_planned:
                time_str = p.get("time")
                if time_str:
                    try:
                        # Storage uses "HH:MM" format, convert to full datetime
                        if "T" not in time_str:
                            # HH:MM format from storage - prepend date
                            time_str = f"{date_str}T{time_str}:00"

                        interval_dt = datetime.fromisoformat(time_str)
                        interval_dt_naive = (
                            interval_dt.replace(tzinfo=None)
                            if interval_dt.tzinfo
                            else interval_dt
                        )

                        # Only use past data for intervals BEFORE current
                        if interval_dt_naive < current_interval_naive:
                            # Store with HH:MM:SS format for consistency
                            lookup_key = interval_dt.strftime("%Y-%m-%dT%H:%M:%S")
                            planned_lookup[lookup_key] = p
                    except (ValueError, TypeError):
                        # Fallback: if can't parse, skip it
                        _LOGGER.warning(f"Failed to parse time_str: {time_str}")
                        continue

            # Add future data (od current_interval dál)
            added_future = 0
            skipped_future = 0
            for p in future_planned:
                time_str = p.get("time")
                if time_str:
                    try:
                        interval_dt = datetime.fromisoformat(time_str)
                        # Only use future data for current and future intervals
                        if interval_dt >= current_interval_naive:
                            planned_lookup[time_str] = p
                            added_future += 1
                        else:
                            skipped_future += 1
                    except (ValueError, TypeError) as e:
                        _LOGGER.debug(f"Failed to parse time: {time_str}, error: {e}")
                        continue

            _LOGGER.debug(
                f"📋 Merge stats: added_future={added_future}, skipped_future={skipped_future}, "
                f"current_interval={current_interval_naive}"
            )

            _LOGGER.debug(
                f"📋 Combined planned lookup: {len(planned_lookup)} total intervals for {date}"
            )

            # Build 96 intervals for whole day
            interval_time = day_start
            while interval_time.date() == date:
                interval_time_str = interval_time.strftime("%Y-%m-%dT%H:%M:%S")

                # Determine status (use naive for comparison)
                interval_time_naive = (
                    interval_time.replace(tzinfo=None)
                    if interval_time.tzinfo
                    else interval_time
                )
                if interval_time_naive < current_interval_naive:
                    status = "historical"
                elif interval_time_naive == current_interval_naive:
                    status = "current"
                else:
                    status = "planned"

                # Get planned data (pokud existuje)
                planned_entry = planned_lookup.get(interval_time_str)
                planned_data = None
                if planned_entry:
                    planned_data = self._format_planned_data(planned_entry)

                # Ensure planned_data is never None
                if planned_data is None:
                    planned_data = {}

                # Get actual data (jen pro historical a current)
                actual_data = None
                if status in ("historical", "current"):
                    # Historical mode z Recorderu
                    mode_from_recorder = historical_modes_lookup.get(interval_time_str)
                    if mode_from_recorder:
                        # Fetch actual consumption/costs from history
                        interval_end = interval_time + timedelta(minutes=15)
                        historical_metrics = await self._fetch_interval_from_history(
                            interval_time, interval_end
                        )

                        if historical_metrics:
                            actual_data = {
                                "mode": mode_from_recorder.get("mode", 0),
                                "mode_name": mode_from_recorder.get(
                                    "mode_name", "Unknown"
                                ),
                                "consumption_kwh": historical_metrics.get(
                                    "consumption_kwh", 0
                                ),
                                "solar_kwh": historical_metrics.get("solar_kwh", 0),
                                "battery_soc": historical_metrics.get("battery_soc", 0),
                                "grid_import_kwh": historical_metrics.get(
                                    "grid_import",
                                    0,  # Function returns "grid_import" not "grid_import_kwh"
                                ),
                                "grid_export_kwh": historical_metrics.get(
                                    "grid_export",
                                    0,  # Function returns "grid_export" not "grid_export_kwh"
                                ),
                                "net_cost": historical_metrics.get("net_cost", 0),
                                "savings": 0,  # Savings requires baseline comparison
                            }
                        else:
                            # Fallback if history unavailable
                            actual_data = {
                                "mode": mode_from_recorder.get("mode", 0),
                                "mode_name": mode_from_recorder.get(
                                    "mode_name", "Unknown"
                                ),
                                "consumption_kwh": 0,
                                "solar_kwh": 0,
                                "battery_soc": 0,
                                "grid_import_kwh": 0,
                                "grid_export_kwh": 0,
                                "net_cost": (
                                    planned_data.get("net_cost", 0)
                                    if planned_data
                                    else 0
                                ),
                                "savings": 0,
                            }

                # Přidat interval pokud máme actual NEBO planned
                if actual_data or planned_data:
                    intervals.append(
                        {
                            "time": interval_time_str,
                            "status": status,
                            "planned": planned_data,
                            "actual": actual_data,
                            "delta": None,
                        }
                    )

                interval_time += timedelta(minutes=15)

        elif source == "planned_only":
            # ZÍTRA - pouze planned z DP výsledku
            if (
                hasattr(self, "_mode_optimization_result")
                and self._mode_optimization_result
            ):
                optimal_timeline = self._mode_optimization_result.get(
                    "optimal_timeline", []
                )

                for interval in optimal_timeline:
                    interval_time_str = interval.get("time", "")
                    if not interval_time_str:
                        continue

                    try:
                        interval_time = datetime.fromisoformat(interval_time_str)
                        # Make timezone-aware if naive
                        if interval_time.tzinfo is None:
                            interval_time = dt_util.as_local(interval_time)
                    except:
                        continue

                    if day_start <= interval_time <= day_end:
                        intervals.append(
                            {
                                "time": interval_time_str,
                                "status": "planned",
                                "planned": self._format_planned_data(interval),
                                "actual": None,
                                "delta": None,
                            }
                        )

        # Calculate summary
        summary = self._calculate_day_summary(intervals)

        return {
            "date": date.strftime("%Y-%m-%d"),
            "intervals": intervals,
            "summary": summary,
        }

    def _format_planned_data(self, planned: Dict[str, Any]) -> Dict[str, Any]:
        """Formátovat planned data pro API."""
        return {
            "mode": planned.get("mode", 0),
            "mode_name": planned.get("mode_name", "HOME I"),
            "battery_kwh": round(planned.get("battery_soc", 0), 2),
            "solar_kwh": round(planned.get("solar_kwh", 0), 3),
            "consumption_kwh": round(planned.get("load_kwh", 0), 3),
            "grid_import": round(planned.get("grid_import", 0), 3),
            "grid_export": round(planned.get("grid_export", 0), 3),
            "spot_price": round(planned.get("spot_price", 0), 2),
            "net_cost": round(planned.get("net_cost", 0), 2),
            "savings_vs_home_i": round(planned.get("savings_vs_home_i", 0), 2),
        }

    def _calculate_day_summary(self, intervals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Vypočítat summary pro den."""
        planned_cost = sum(
            i.get("planned", {}).get("net_cost", 0)
            for i in intervals
            if i.get("planned")
        )
        actual_cost = sum(
            i.get("actual", {}).get("net_cost", 0) for i in intervals if i.get("actual")
        )

        historical_count = sum(1 for i in intervals if i.get("status") == "historical")

        delta_cost = actual_cost - planned_cost if historical_count > 0 else None
        accuracy_pct = (
            round((1 - abs(delta_cost) / planned_cost) * 100, 1)
            if planned_cost > 0 and delta_cost is not None
            else None
        )

        return {
            "planned_total_cost": round(planned_cost, 2) if planned_cost > 0 else None,
            "actual_total_cost": round(actual_cost, 2) if actual_cost > 0 else None,
            "delta_cost": round(delta_cost, 2) if delta_cost is not None else None,
            "accuracy_pct": accuracy_pct,
            "intervals_count": len(intervals),
            "historical_count": historical_count,
        }

    def _build_today_tile_summary(
        self, intervals: List[Dict[str, Any]], now: datetime
    ) -> Dict[str, Any]:
        """
        Vytvořit summary pro dlaždici "Dnes - Plnění plánu".

        NOVÉ v Phase 2.9 - pro dlaždici místo 48h okna cen.

        Args:
            intervals: Seznam intervalů pro dnešek
            now: Aktuální čas

        Returns:
            Dict s metrikami pro dlaždici:
            - progress_pct: % dne uběhlo
            - planned_so_far: Plán dosud (00:00 - NOW)
            - actual_so_far: Skutečně dosud
            - delta: Odchylka (Kč)
            - delta_pct: Odchylka (%)
            - eod_prediction: End-of-day predikce
            - eod_plan: EOD plán celkem
            - eod_delta_pct: EOD odchylka (%)
            - mini_chart_data: Data pro mini graf
            - current_time: Aktuální čas (HH:MM)
        """
        if not intervals:
            return self._get_empty_tile_summary(now)

        # Round current time na 15min
        current_minute = (now.minute // 15) * 15
        current_interval_time = now.replace(
            minute=current_minute, second=0, microsecond=0
        )

        # Rozdělit intervaly na historical vs future
        historical = []
        future = []

        for interval in intervals:
            try:
                interval_time_str = interval.get("time", "")
                if not interval_time_str:
                    continue

                interval_time = datetime.fromisoformat(interval_time_str)
                if interval_time.tzinfo is None:
                    interval_time = dt_util.as_local(interval_time)

                if interval_time < current_interval_time and interval.get("actual"):
                    historical.append(interval)
                else:
                    future.append(interval)
            except:
                continue

        # PHASE 3.0 FIX: Safe cost getter (reuse from _build_today_cost_data)
        def safe_get_cost(interval: Dict[str, Any], key: str) -> float:
            """Safely get cost from interval, handling None values."""
            data = interval.get(key)
            if data is None:
                return 0.0
            if isinstance(data, dict):
                return float(data.get("net_cost", 0))
            return 0.0

        # Spočítat plán vs skutečnost dosud
        planned_so_far = sum(safe_get_cost(h, "planned") for h in historical)
        actual_so_far = sum(safe_get_cost(h, "actual") for h in historical)
        delta = actual_so_far - planned_so_far
        delta_pct = (delta / planned_so_far * 100) if planned_so_far > 0 else 0.0

        # EOD = skutečnost uplynulých + plán budoucích (včetně aktivního)
        planned_future = sum(safe_get_cost(f, "planned") for f in future)
        eod_plan = planned_so_far + planned_future  # Původní celý denní plán

        # NOVÁ LOGIKA: EOD je skutečnost + budoucí plán (BEZ drift ratio)
        eod_prediction = actual_so_far + planned_future
        eod_delta = eod_prediction - eod_plan
        eod_delta_pct = (eod_delta / eod_plan * 100) if eod_plan > 0 else 0.0

        # Progress
        total_intervals = len(intervals)
        historical_count = len(historical)
        progress_pct = (
            (historical_count / total_intervals * 100) if total_intervals > 0 else 0.0
        )

        # Confidence level (pro UI indikátor)
        if progress_pct < 25:
            confidence = "low"
        elif progress_pct < 50:
            confidence = "medium"
        elif progress_pct < 75:
            confidence = "good"
        else:
            confidence = "high"

        # Mini chart data (jen delty pro variance chart)
        mini_chart_data = []
        for interval in intervals:
            interval_time_str = interval.get("time", "")
            if not interval_time_str:
                continue

            try:
                interval_time = datetime.fromisoformat(interval_time_str)
                if interval_time.tzinfo is None:
                    interval_time = dt_util.as_local(interval_time)

                is_current = (
                    current_interval_time
                    <= interval_time
                    < current_interval_time + timedelta(minutes=15)
                )

                delta_value = None
                if interval.get("actual") and interval.get("delta"):
                    delta_value = interval["delta"].get("net_cost")

                mini_chart_data.append(
                    {
                        "time": interval_time_str,
                        "delta": delta_value,
                        "is_historical": bool(interval.get("actual")),
                        "is_current": is_current,
                    }
                )
            except:
                continue

        return {
            "progress_pct": round(progress_pct, 1),
            "planned_so_far": round(planned_so_far, 2),
            "actual_so_far": round(actual_so_far, 2),
            "delta": round(delta, 2),
            "delta_pct": round(delta_pct, 1),
            "eod_prediction": round(eod_prediction, 2),
            "eod_plan": round(eod_plan, 2),
            "eod_delta": round(eod_delta, 2),
            "eod_delta_pct": round(eod_delta_pct, 1),
            "confidence": confidence,
            "mini_chart_data": mini_chart_data,
            "current_time": now.strftime("%H:%M"),
            "last_updated": now.isoformat(),
            "intervals_total": total_intervals,
            "intervals_historical": historical_count,
            "intervals_future": len(future),
        }

    def _get_empty_tile_summary(self, now: datetime) -> Dict[str, Any]:
        """Prázdné tile summary pokud nejsou data."""
        return {
            "progress_pct": 0.0,
            "planned_so_far": 0.0,
            "actual_so_far": 0.0,
            "delta": 0.0,
            "delta_pct": 0.0,
            "eod_prediction": 0.0,
            "eod_plan": 0.0,
            "eod_delta": 0.0,
            "eod_delta_pct": 0.0,
            "confidence": "none",
            "mini_chart_data": [],
            "current_time": now.strftime("%H:%M"),
            "last_updated": now.isoformat(),
            "intervals_total": 0,
            "intervals_historical": 0,
            "intervals_future": 0,
        }

    # =========================================================================
    # ECONOMIC CHARGING - Nové metody pro ekonomické rozhodování
    # =========================================================================

    def _get_candidate_intervals(
        self,
        timeline: List[Dict[str, Any]],
        max_charging_price: float,
        current_time: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Získat kandidátní intervaly pro nabíjení.

        Filtruje:
        1. Cena < max_charging_price (pojistka)
        2. Timestamp > now (jen budoucnost)
        3. Seřadí od nejlevnějších

        Args:
            timeline: Timeline data
            max_charging_price: Maximální cena (pojistka)
            current_time: Aktuální čas (nebo None = now)

        Returns:
            Seznam kandidátních intervalů seřazených podle ceny
        """
        if current_time is None:
            current_time = dt_util.now()

        candidates = []

        for i, interval in enumerate(timeline):
            price = interval.get("spot_price_czk", float("inf"))
            timestamp_str = interval.get("timestamp", "")

            # Parse timestamp
            try:
                interval_time = datetime.fromisoformat(
                    timestamp_str.replace("Z", "+00:00")
                )
            except:
                continue

            # Filtry
            if price >= max_charging_price:
                continue  # Nad pojistkou

            # Compare naive datetimes to avoid timezone issues
            interval_time_naive = (
                interval_time.replace(tzinfo=None)
                if interval_time.tzinfo
                else interval_time
            )
            current_time_naive = (
                current_time.replace(tzinfo=None)
                if current_time.tzinfo
                else current_time
            )

            if interval_time_naive <= current_time_naive:
                continue  # Minulost

            candidates.append(
                {
                    "index": i,
                    "price": price,
                    "timestamp": timestamp_str,
                    "interval_time": interval_time,
                }
            )

        # Seřadit od nejlevnějších
        candidates.sort(key=lambda x: x["price"])

        if not candidates:
            _LOGGER.warning(
                f"No charging intervals available - all prices above "
                f"max_charging_price ({max_charging_price:.2f} Kč/kWh)"
            )

        return candidates

    def _simulate_forward(
        self,
        timeline: List[Dict[str, Any]],
        start_index: int,
        charge_now: bool,
        charge_amount_kwh: float,
        horizon_hours: int,
        effective_minimum_kwh: float,
        efficiency: float,
    ) -> Dict[str, Any]:
        """
        Forward simulace budoucího SoC.

        Simuluje co se stane s baterií od start_index až +horizon_hours.

        Args:
            timeline: Timeline data
            start_index: Index od kterého simulovat
            charge_now: Nabít v start_index?
            charge_amount_kwh: Kolik nabít (pokud charge_now)
            horizon_hours: Kolik hodin dopředu simulovat
            effective_minimum_kwh: Bezpečné minimum (hard min + safety margin)
            efficiency: Efektivita baterie (0.882)

        Returns:
            Dict s výsledky simulace:
                - total_charging_cost: Celkové náklady na nabíjení
                - min_soc: Nejnižší SoC v horizontu
                - final_soc: Koncové SoC
                - death_valley_reached: True pokud SoC < effective_minimum
                - charging_events: Seznam nabíjecích událostí
        """
        if start_index >= len(timeline):
            return {
                "total_charging_cost": 0,
                "min_soc": 0,
                "final_soc": 0,
                "death_valley_reached": True,
                "charging_events": [],
            }

        # Kopie pro simulaci
        sim_timeline = [dict(point) for point in timeline]

        soc = sim_timeline[start_index].get("battery_capacity_kwh", 0)
        total_cost = 0
        charging_events = []

        # Nabít v prvním intervalu?
        if charge_now and charge_amount_kwh > 0:
            soc += charge_amount_kwh
            price = sim_timeline[start_index].get("spot_price_czk", 0)
            cost = charge_amount_kwh * price
            total_cost += cost

            charging_events.append(
                {
                    "index": start_index,
                    "kwh": charge_amount_kwh,
                    "price": price,
                    "cost": cost,
                    "reason": "scenario_test",
                }
            )

            # Update timeline
            sim_timeline[start_index]["battery_capacity_kwh"] = soc
            sim_timeline[start_index]["grid_charge_kwh"] = charge_amount_kwh

        min_soc = soc
        horizon_intervals = horizon_hours * 4  # 15min intervaly

        # Simulovat následující intervaly
        for i in range(
            start_index + 1, min(start_index + horizon_intervals, len(sim_timeline))
        ):
            prev_soc = sim_timeline[i - 1].get("battery_capacity_kwh", 0)

            # Spočítat změnu SoC podle solar, consumption
            solar_kwh = sim_timeline[i].get("solar_production_kwh", 0)
            load_kwh = sim_timeline[i].get("consumption_kwh", 0)
            grid_kwh = sim_timeline[i].get("grid_charge_kwh", 0)
            reason = sim_timeline[i].get("reason", "")

            # Použít stejnou logiku jako v _calculate_timeline
            # OPRAVA: Při balancování VŽDY UPS režim
            is_balancing = reason.startswith("balancing_")
            is_ups_mode = grid_kwh > 0 or is_balancing

            if is_ups_mode:
                net_energy = solar_kwh + grid_kwh
            else:
                if solar_kwh >= load_kwh:
                    net_energy = (solar_kwh - load_kwh) + grid_kwh
                else:
                    load_from_battery = load_kwh - solar_kwh
                    battery_drain = load_from_battery / efficiency
                    net_energy = -battery_drain + grid_kwh

            soc = prev_soc + net_energy
            sim_timeline[i]["battery_capacity_kwh"] = soc

            # Track minimum
            min_soc = min(min_soc, soc)

        final_soc = sim_timeline[
            min(start_index + horizon_intervals - 1, len(sim_timeline) - 1)
        ].get("battery_capacity_kwh", 0)
        death_valley_reached = min_soc < effective_minimum_kwh

        return {
            "total_charging_cost": total_cost,
            "min_soc": min_soc,
            "final_soc": final_soc,
            "death_valley_reached": death_valley_reached,
            "charging_events": charging_events,
        }

    def _calculate_minimum_charge(
        self,
        scenario_wait_min_soc: float,
        effective_minimum_kwh: float,
        max_charge_per_interval: float,
    ) -> float:
        """
        Vypočítat minimální potřebné nabití.

        Nabít JEN rozdíl mezi projekcí a bezpečným minimem (ne plnou kapacitu!).

        Args:
            scenario_wait_min_soc: Nejnižší SoC při WAIT scénáři
            effective_minimum_kwh: Bezpečné minimum
            max_charge_per_interval: Max nabití za 15 min

        Returns:
            Kolik kWh nabít (0 pokud není potřeba)
        """
        shortage = effective_minimum_kwh - scenario_wait_min_soc

        if shortage <= 0:
            return 0  # Není potřeba nabíjet

        # Přidat 10% buffer pro nepřesnost predikce
        charge_needed = shortage * 1.1

        # Omezit max nabíjením za interval
        return min(charge_needed, max_charge_per_interval)

    def _calculate_protection_requirement(
        self,
        timeline: List[Dict[str, Any]],
        max_capacity: float,
    ) -> Optional[float]:
        """
        Vypočítat required SoC pro blackout/weather ochranu.

        Args:
            timeline: Timeline data
            max_capacity: Maximální kapacita baterie

        Returns:
            Required SoC v kWh nebo None (pokud vypnuto)
        """
        config = (
            self._config_entry.options
            if self._config_entry.options
            else self._config_entry.data
        )

        required_soc = 0

        # A) Blackout ochrana
        enable_blackout = config.get("enable_blackout_protection", False)
        if enable_blackout:
            blackout_hours = config.get("blackout_protection_hours", 12)
            blackout_target_percent = config.get("blackout_target_soc_percent", 60.0)

            # Spotřeba během autonomy period
            current_time = dt_util.now()
            autonomy_end = current_time + timedelta(hours=blackout_hours)

            autonomy_consumption = 0
            for point in timeline:
                try:
                    timestamp_str = point.get("timestamp", "")
                    point_time = datetime.fromisoformat(
                        timestamp_str.replace("Z", "+00:00")
                    )

                    if current_time < point_time <= autonomy_end:
                        autonomy_consumption += point.get("consumption_kwh", 0)
                except:
                    continue

            blackout_soc = max(
                autonomy_consumption, (blackout_target_percent / 100.0) * max_capacity
            )
            required_soc = max(required_soc, blackout_soc)

            _LOGGER.debug(
                f"Blackout protection: required {blackout_soc:.2f} kWh "
                f"(consumption {autonomy_consumption:.2f} kWh, target {blackout_target_percent}%)"
            )

        # B) ČHMÚ weather risk
        enable_weather = config.get("enable_weather_risk", False)
        if enable_weather:
            # TODO: Implementovat až bude sensor.oig_chmu_warning dostupný
            # Pro nyní použít jen target
            weather_target_percent = config.get("weather_target_soc_percent", 70.0)
            weather_soc = (weather_target_percent / 100.0) * max_capacity
            required_soc = max(required_soc, weather_soc)

            _LOGGER.debug(f"Weather risk protection: required {weather_soc:.2f} kWh")

        return required_soc if required_soc > 0 else None

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
            # Zakomentováno: Spamuje logy během DP optimalizace (23k iterací)
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

            # Zakomentováno: Spamuje logy během DP optimalizace (23k iterací)
            # _LOGGER.debug(
            #     f"Using battery efficiency: {efficiency:.3f} ({efficiency_pct}%)"
            # )
            return efficiency

        except (ValueError, TypeError) as e:
            _LOGGER.error(f"Error parsing battery efficiency: {e}")
            return 0.882

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
                    "Home I": CBB_MODE_HOME_I,
                    "Home II": CBB_MODE_HOME_II,
                    "Home III": CBB_MODE_HOME_III,
                    "Home UPS": CBB_MODE_HOME_UPS,
                    "Home 1": CBB_MODE_HOME_I,
                    "Home 2": CBB_MODE_HOME_II,
                    "Home 3": CBB_MODE_HOME_III,
                }

                if mode_value in mode_map:
                    mode = mode_map[mode_value]
                else:
                    # Zkusit parse jako int
                    mode = int(mode_value)
            else:
                mode = int(mode_value)

            # Validate mode range
            if mode not in [
                CBB_MODE_HOME_I,
                CBB_MODE_HOME_II,
                CBB_MODE_HOME_III,
                CBB_MODE_HOME_UPS,
            ]:
                _LOGGER.warning(f"Invalid mode {mode}, using fallback HOME III")
                return CBB_MODE_HOME_III

            mode_name = CBB_MODE_NAMES.get(mode, f"UNKNOWN_{mode}")
            _LOGGER.debug(f"Current CBB mode: {mode_name} ({mode})")

            return mode

        except (ValueError, TypeError) as e:
            _LOGGER.error(f"Error parsing CBB mode from '{state.state}': {e}")
            return CBB_MODE_HOME_III

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
        config.get("dual_tariff_enabled", True)

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
        current_tariff = self._get_tariff_for_datetime(target_datetime)

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

    def _get_tariff_for_datetime(self, target_datetime: datetime) -> str:
        """
        Získat tarif (VT/NT) pro daný datetime.

        KRITICKÉ: Kopie logiky z SpotPrice15MinSensor._get_tariff_for_datetime()
        Musí zůstat synchronizovaná!
        """
        config = (
            self._config_entry.options
            if self._config_entry.options
            else self._config_entry.data
        )

        dual_tariff_enabled = config.get("dual_tariff_enabled", True)
        if not dual_tariff_enabled:
            return "VT"

        is_weekend = target_datetime.weekday() >= 5

        if is_weekend:
            nt_times = self._parse_tariff_times(
                config.get("tariff_nt_start_weekend", "0")
            )
            vt_times = self._parse_tariff_times(
                config.get("tariff_vt_start_weekend", "")
            )
        else:
            nt_times = self._parse_tariff_times(
                config.get("tariff_nt_start_weekday", "22,2")
            )
            vt_times = self._parse_tariff_times(
                config.get("tariff_vt_start_weekday", "6")
            )

        current_hour = target_datetime.hour
        last_tariff = "NT"
        last_hour = -1

        all_changes = []
        for hour in nt_times:
            all_changes.append((hour, "NT"))
        for hour in vt_times:
            all_changes.append((hour, "VT"))

        all_changes.sort(reverse=True)

        for hour, tariff in all_changes:
            if hour <= current_hour and hour > last_hour:
                last_tariff = tariff
                last_hour = hour

        return last_tariff

    def _parse_tariff_times(self, time_str: str) -> list[int]:
        """Parse tariff times string to list of hours."""
        if not time_str:
            return []
        try:
            return [int(x.strip()) for x in time_str.split(",") if x.strip()]
        except ValueError:
            return []

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
            return []

        # Read from coordinator data (Phase 1.5 - lean attributes)
        spot_data = self.coordinator.data.get("spot_prices", {})

        if not spot_data:
            _LOGGER.warning("No spot_prices data in coordinator")
            return []

        # spot_data format: {"prices15m_czk_kwh": {"2025-10-28T13:45:00": 2.29, ...}}
        # Toto je ČISTÁ spotová cena BEZ přirážek, distribuce a DPH!
        raw_prices_dict = spot_data.get("prices15m_czk_kwh", {})

        if not raw_prices_dict:
            _LOGGER.warning("No prices15m_czk_kwh in spot_data")
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
            return []

        # Export prices jsou v coordinator data (stejně jako spot prices)
        # OTE API je vrací v rámci get_spot_prices()
        spot_data = self.coordinator.data.get("spot_prices", {})

        if not spot_data:
            _LOGGER.warning("No spot_prices data in coordinator for export prices")
            return []

        # Export prices jsou v "export_prices15m_czk_kwh" klíči (stejný formát jako spot)
        # Pokud klíč neexistuje, zkusíme alternativní způsob výpočtu
        export_prices_dict = spot_data.get("export_prices15m_czk_kwh", {})

        if not export_prices_dict:
            # Fallback: Vypočítat z spot prices podle config (percentage model)
            _LOGGER.info("No direct export prices, calculating from spot prices")
            spot_prices_dict = spot_data.get("prices15m_czk_kwh", {})

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

    def _get_solar_forecast(self) -> Dict[str, Any]:
        """Získat solární předpověď z solar_forecast senzoru."""
        if not self._hass:
            _LOGGER.warning("🌞 SOLAR DEBUG: HomeAssistant instance not available")
            return {}

        sensor_id = f"sensor.oig_{self._box_id}_solar_forecast"
        state = self._hass.states.get(sensor_id)

        if not state:
            _LOGGER.warning(f"🌞 SOLAR DEBUG: Sensor {sensor_id} NOT FOUND in HA")
            return {}

        if not state.attributes:
            _LOGGER.warning(f"🌞 SOLAR DEBUG: Sensor {sensor_id} has NO ATTRIBUTES")
            return {}

        # Načíst today a tomorrow data (správné názvy atributů)
        today = state.attributes.get("today_hourly_total_kw", {})
        tomorrow = state.attributes.get("tomorrow_hourly_total_kw", {})

        # Enhanced debug logging
        _LOGGER.info(f"🌞 SOLAR DEBUG: Retrieved solar forecast from {sensor_id}")
        _LOGGER.info(f"🌞 SOLAR DEBUG: Today data points: {len(today)}")
        _LOGGER.info(f"🌞 SOLAR DEBUG: Tomorrow data points: {len(tomorrow)}")

        if today:
            sample_keys = list(today.keys())[:3]
            sample_values = [today[k] for k in sample_keys]
            _LOGGER.info(
                f"🌞 SOLAR DEBUG: Today sample: {dict(zip(sample_keys, sample_values))}"
            )
        else:
            _LOGGER.warning("🌞 SOLAR DEBUG: TODAY DATA IS EMPTY! ❌")

        if tomorrow:
            sample_keys = list(tomorrow.keys())[:3]
            sample_values = [tomorrow[k] for k in sample_keys]
            _LOGGER.info(
                f"🌞 SOLAR DEBUG: Tomorrow sample: {dict(zip(sample_keys, sample_values))}"
            )
        else:
            _LOGGER.warning("🌞 SOLAR DEBUG: TOMORROW DATA IS EMPTY! ❌")

        return {"today": today, "tomorrow": tomorrow}

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

        from .sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

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

    def _get_solar_for_timestamp(
        self, timestamp: datetime, solar_forecast: Dict[str, Any]
    ) -> float:
        """
        Získat solar production pro daný timestamp (kWh za 15min).

        Args:
            timestamp: Timestamp pro který hledat produkci
            solar_forecast: Dict s 'today' a 'tomorrow' hodinovými daty

        Returns:
            Solar production v kWh za 15 minut
        """
        # Rozhodnout jestli today nebo tomorrow
        today = datetime.now().date()
        is_today = timestamp.date() == today

        data = solar_forecast.get("today" if is_today else "tomorrow", {})

        if not data:
            return 0.0

        # Najít hodinovou hodnotu pro daný čas
        # Klíče jsou ve formátu ISO timestamp BEZ timezone: "2025-10-20T14:00:00"
        # Normalizovat timestamp na naive (local time) pro matching
        timestamp_hour = timestamp.replace(minute=0, second=0, microsecond=0)

        # Strip timezone to match solar_forecast key format
        if timestamp_hour.tzinfo is not None:
            # Convert to naive local time (remove timezone info)
            hour_key = timestamp_hour.replace(tzinfo=None).isoformat()
        else:
            hour_key = timestamp_hour.isoformat()

        hourly_kw = data.get(hour_key, 0.0)

        # 🔍 DEBUG: Log každý lookup během DP optimalizace
        if timestamp.hour in [7, 8, 9, 10]:  # Ráno kdy by měl být solar
            _LOGGER.info(
                f"🔍 SOLAR LOOKUP: timestamp={timestamp.isoformat()}, "
                f"hour_key={hour_key}, "
                f"data_keys={list(data.keys())[:5]}, "
                f"found_value={hourly_kw}"
            )

        try:
            hourly_kw = float(hourly_kw)
        except (ValueError, TypeError):
            _LOGGER.warning(
                f"Invalid solar value for {timestamp.strftime('%H:%M')}: "
                f"{hourly_kw} (type={type(hourly_kw)}), key={hour_key}"
            )
            return 0.0

        # Debug prvních pár hodnot
        if timestamp.hour in [14, 15, 16]:
            _LOGGER.debug(
                f"Solar for {timestamp.strftime('%H:%M')}: "
                f"key={hour_key}, kW={hourly_kw}, 15min_kWh={hourly_kw/4.0:.3f}"
            )

        # Převést na 15min interval
        # Hodnota je v kW (průměrný výkon za hodinu)
        # Pro 15min: kW * 0.25h = kWh
        return hourly_kw / 4.0

    def _get_load_avg_for_timestamp(
        self, timestamp: datetime, load_avg_sensors: Dict[str, Any]
    ) -> float:
        """
        Získat load average pro daný timestamp (kWh za 15min).

        Args:
            timestamp: Timestamp pro který hledat spotřebu
            load_avg_sensors: Dict[entity_id] = {
                "value": float,
                "time_range": (start_hour, end_hour),
                "day_type": "weekday" | "weekend"
            }

        Returns:
            Load average v kWh za 15 minut
        """
        if not load_avg_sensors:
            if not hasattr(self, "_empty_load_sensors_logged"):
                _LOGGER.debug(
                    "load_avg_sensors dictionary is empty - using fallback 500W (statistics sensors may not be available yet)"
                )
                self._empty_load_sensors_logged = True
            return 0.125  # 500W fallback

        # Zjistit den v týdnu (0=pondělí, 6=neděle)
        is_weekend = timestamp.weekday() >= 5
        day_type = "weekend" if is_weekend else "weekday"

        current_hour = timestamp.hour

        # Najít odpovídající senzor podle time_range tuple
        for entity_id, sensor_data in load_avg_sensors.items():
            # Zkontrolovat day_type
            sensor_day_type = sensor_data.get("day_type", "")
            if sensor_day_type != day_type:
                continue

            # Získat time_range jako tuple (start_hour, end_hour)
            time_range = sensor_data.get("time_range")
            if (
                not time_range
                or not isinstance(time_range, tuple)
                or len(time_range) != 2
            ):
                continue

            start_hour, end_hour = time_range

            # Zkontrolovat jestli current_hour spadá do rozmezí
            # Ošetřit případ přes půlnoc (např. 22-6)
            if start_hour <= end_hour:
                # Normální rozmezí (např. 6-8, 8-12)
                in_range = start_hour <= current_hour < end_hour
            else:
                # Přes půlnoc (např. 22-6)
                in_range = current_hour >= start_hour or current_hour < end_hour

            if in_range:
                # Hodnota senzoru je ve wattech (W)
                # 143W = 143Wh za hodinu = 0,143 kWh/h
                # Pro 15min interval: 0,143 / 4 = 0,03575 kWh
                watts = sensor_data.get("value", 0.0)

                # FALLBACK: Pokud jsou data 0 (ještě se nesebrala), použít 500W jako rozumný default
                if watts == 0:
                    watts = 500.0  # 500W = rozumná průměrná spotřeba domácnosti
                    _LOGGER.debug(
                        f"No consumption data yet for {timestamp.strftime('%H:%M')}, using fallback: 500W"
                    )

                kwh_per_hour = watts / 1000.0  # W → kW
                kwh_per_15min = kwh_per_hour / 4.0  # kWh/h → kWh/15min
                _LOGGER.debug(
                    f"Matched {entity_id} for {timestamp.strftime('%H:%M')}: "
                    f"{watts}W → {kwh_per_15min:.5f} kWh/15min"
                )
                return kwh_per_15min

        # Žádný senzor nenalezen - použít fallback 500W
        _LOGGER.debug(
            f"No load_avg sensor found for {timestamp.strftime('%H:%M')} ({day_type}), "
            f"searched {len(load_avg_sensors)} sensors - using fallback 500W"
        )
        # 500W = 0.5 kWh/h = 0.125 kWh/15min
        return 0.125

    def _get_load_avg_for_hour(self, hour: int) -> float:
        """
        Získat load average pro danou hodinu dnešního dne (kWh za hodinu).

        Používá load_avg senzory pro získání průměrné spotřeby.

        Args:
            hour: Hodina dne (0-23)

        Returns:
            Load average v kWh za hodinu
        """
        load_avg_sensors = self._get_load_avg_sensors()
        if not load_avg_sensors:
            return 0.5  # 500W default

        now = dt_util.now()
        ts = now.replace(hour=hour, minute=30, second=0, microsecond=0)

        # _get_load_avg_for_timestamp vrací kWh/15min, chceme kWh/h
        kwh_15min = self._get_load_avg_for_timestamp(ts, load_avg_sensors)
        return kwh_15min * 4  # 4 intervaly = 1 hodina

    # ========================================================================
    # GRID CHARGING OPTIMIZATION METHODS
    # ========================================================================

    def _calculate_optimal_night_charge_target(
        self,
        timeline_data: List[Dict[str, Any]],
        max_capacity: float,
        default_target_percent: float,
    ) -> tuple[float, str]:
        """
        Vypočítá optimální target SoC pro noční nabíjení (ne vždy 100%).

        Algoritmus:
        1. Najít ranní solar surplus (FVE > spotřeba)
        2. Rozhodnout jestli je lepší storage nebo export
        3. Vrátit optimální target SoC

        Args:
            timeline_data: Timeline data s predikcí
            max_capacity: Maximální kapacita baterie (kWh)
            default_target_percent: Výchozí target z configu (%)

        Returns:
            (optimal_target_kwh, reason) - optimální target a vysvětlení
        """
        try:
            # Najít ranní hodiny (06:00 - 12:00)
            now = datetime.now()
            morning_start = now.replace(hour=6, minute=0, second=0, microsecond=0)
            if now.hour < 6:
                # Pokud je před 6:00, použít dnešní ráno
                pass
            else:
                # Jinak zítřejší ráno
                morning_start += timedelta(days=1)

            morning_end = morning_start.replace(hour=12, minute=0)

            # Filtrovat ranní intervaly
            morning_intervals = []
            for point in timeline_data:
                try:
                    timestamp = datetime.fromisoformat(point.get("timestamp", ""))
                    if morning_start <= timestamp < morning_end:
                        morning_intervals.append(point)
                except (ValueError, TypeError):
                    continue

            if not morning_intervals:
                _LOGGER.debug(
                    "No morning intervals found for optimal target calculation"
                )
                return (
                    (default_target_percent / 100.0) * max_capacity,
                    f"default ({default_target_percent:.0f}%) - no morning data",
                )

            # Spočítat ranní solar surplus
            morning_surplus_kwh = 0.0
            for interval in morning_intervals:
                solar = interval.get("solar_production_kwh", 0)
                consumption = interval.get("consumption_kwh", 0)
                surplus = max(0, solar - consumption)
                morning_surplus_kwh += surplus

            _LOGGER.debug(
                f"Morning solar surplus ({len(morning_intervals)} intervals): {morning_surplus_kwh:.2f} kWh"
            )

            # Pokud není surplus, použít default
            if morning_surplus_kwh < 0.5:
                return (
                    (default_target_percent / 100.0) * max_capacity,
                    f"default ({default_target_percent:.0f}%) - no morning surplus",
                )

            # Najít průměrnou export price ráno
            export_prices = [
                p.get("export_price_czk", 0)
                for p in morning_intervals
                if p.get("export_price_czk") is not None
            ]
            avg_export_price = (
                sum(export_prices) / len(export_prices) if export_prices else 0
            )

            # Najít večerní spot price (18:00 - 22:00)
            evening_start = morning_start.replace(hour=18, minute=0)
            evening_end = morning_start.replace(hour=22, minute=0)
            evening_prices = []
            for point in timeline_data:
                try:
                    timestamp = datetime.fromisoformat(point.get("timestamp", ""))
                    if evening_start <= timestamp < evening_end:
                        spot = point.get("spot_price_czk")
                        if spot is not None:
                            evening_prices.append(spot)
                except (ValueError, TypeError):
                    continue

            avg_evening_spot = (
                sum(evening_prices) / len(evening_prices) if evening_prices else 6.0
            )

            # ROZHODNUTÍ: Storage value vs Export value
            # Storage: uložit surplus ráno, využít večer (s efficiency loss)
            dc_dc_efficiency = 0.95  # DC/DC charging (solar → battery)
            dc_ac_efficiency = (
                self._get_battery_efficiency()
            )  # DC/AC discharge (battery → consumption)
            storage_efficiency = dc_dc_efficiency * dc_ac_efficiency  # ~83.8%

            storage_value = avg_evening_spot * morning_surplus_kwh * storage_efficiency
            export_value = avg_export_price * morning_surplus_kwh

            _LOGGER.info(
                f"Optimal target calculation: "
                f"morning_surplus={morning_surplus_kwh:.2f}kWh, "
                f"export_price={avg_export_price:.2f}CZK/kWh, "
                f"evening_spot={avg_evening_spot:.2f}CZK/kWh, "
                f"storage_value={storage_value:.2f}CZK, "
                f"export_value={export_value:.2f}CZK"
            )

            # Pokud storage je lepší než export (s 10% tolerance)
            if storage_value > export_value * 1.1:
                # Nechat místo pro ranní solar
                # Kolik místa potřebujeme? morning_surplus / dc_dc_efficiency
                space_needed_kwh = morning_surplus_kwh / dc_dc_efficiency

                # Optimal target = max_capacity - space_needed
                optimal_target_kwh = max_capacity - space_needed_kwh

                # Clamp mezi 50% a 95%
                min_target = max_capacity * 0.50
                max_target = max_capacity * 0.95
                optimal_target_kwh = max(
                    min_target, min(max_target, optimal_target_kwh)
                )

                optimal_percent = (optimal_target_kwh / max_capacity) * 100

                reason = (
                    f"optimized ({optimal_percent:.0f}%) - "
                    f"save {space_needed_kwh:.1f}kWh for morning solar "
                    f"(storage_value={storage_value:.1f}CZK > export={export_value:.1f}CZK)"
                )

                _LOGGER.info(
                    f"OPTIMAL TARGET: {optimal_target_kwh:.2f}kWh ({optimal_percent:.0f}%) - {reason}"
                )

                return (optimal_target_kwh, reason)

            # Export je OK → nabít na default (nebo blízko 100%)
            # Ale nikdy ne víc než 95% (leave margin for rounding)
            safe_target = min(default_target_percent, 95.0)
            target_kwh = (safe_target / 100.0) * max_capacity

            reason = (
                f"default ({safe_target:.0f}%) - "
                f"export profitable (export={export_value:.1f}CZK >= storage={storage_value:.1f}CZK)"
            )

            _LOGGER.info(
                f"OPTIMAL TARGET: {target_kwh:.2f}kWh ({safe_target:.0f}%) - {reason}"
            )

            return (target_kwh, reason)

        except Exception as e:
            _LOGGER.error(
                f"Error calculating optimal night charge target: {e}", exc_info=True
            )
            # Fallback na default
            return (
                (default_target_percent / 100.0) * max_capacity,
                f"default ({default_target_percent:.0f}%) - calculation error",
            )

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
        """
        Ekonomický plán nabíjení s forward simulací.

        Algoritmus:
        1. Kontrola ochran (blackout, weather) - pokud aktivní, nabít okamžitě v nejlevnějším
        2. Forward simulace - porovnání nákladů s/bez nabíjení
        3. Death valley prevence - minimum charge pro přežití
        4. Ekonomické rozhodnutí - nabít jen pokud se to vyplatí

        Args:
            timeline_data: Timeline data
            min_capacity_kwh: Minimální kapacita (kWh)
            effective_minimum_kwh: Minimální kapacita + bezpečnostní margin (kWh)
            target_capacity_kwh: Cílová kapacita na konci (kWh)
            max_charging_price: Maximální cena (CZK/kWh) - SAFETY LIMIT
            min_savings_margin: Minimální úspora pro nabíjení (CZK/kWh)
            charging_power_kw: Nabíjecí výkon (kW)
            max_capacity: Maximální kapacita baterie (kWh)
            enable_blackout_protection: Aktivovat ochranu před blackoutem
            blackout_protection_hours: Počet hodin ochrany
            blackout_target_soc_percent: Cílový SoC pro blackout (%)
            enable_weather_risk: Aktivovat ochranu před počasím
            weather_risk_level: Úroveň rizika (low/medium/high)
            weather_target_soc_percent: Cílový SoC pro weather (%)
            target_reason: Vysvětlení proč byl zvolen tento target

        Returns:
            Optimalizovaná timeline
        """
        # Kopie timeline pro úpravy
        timeline = [dict(point) for point in timeline_data]

        charge_per_interval = charging_power_kw / 4.0  # kWh za 15min
        current_time = datetime.now()

        # KROK 1: PRIORITA MAXIMUM - Protection overrides (blackout, weather)
        protection_soc_kwh = self._calculate_protection_requirement(
            timeline=timeline,
            max_capacity=max_capacity,
        )

        if protection_soc_kwh is not None:
            current_soc = timeline[0].get("battery_capacity_kwh", 0)
            protection_shortage = protection_soc_kwh - current_soc

            if protection_shortage > 0:
                _LOGGER.warning(
                    f"PROTECTION OVERRIDE: Need {protection_shortage:.2f}kWh "
                    f"to reach protection target {protection_soc_kwh:.2f}kWh "
                    f"(current: {current_soc:.2f}kWh)"
                )

                # Najít nejlevnější intervaly bez ohledu na ekonomiku
                # Ale stále respektovat max_charging_price jako safety limit!
                candidates = self._get_candidate_intervals(
                    timeline=timeline,
                    max_charging_price=max_charging_price,  # Safety limit
                    current_time=current_time,
                )

                if not candidates:
                    _LOGGER.error(
                        f"PROTECTION FAILED: No charging candidates under "
                        f"max_price={max_charging_price}CZK"
                    )
                else:
                    # Nabít postupně v nejlevnějších intervalech
                    charged = 0.0
                    for candidate in candidates:
                        if charged >= protection_shortage:
                            break

                        idx = candidate["index"]
                        old_charge = timeline[idx].get("grid_charge_kwh", 0)
                        timeline[idx]["grid_charge_kwh"] = (
                            old_charge + charge_per_interval
                        )
                        # Ponechat existující reason (může být balancing_*)
                        if timeline[idx].get("reason") == "normal":
                            timeline[idx]["reason"] = "protection_charge"
                        charged += charge_per_interval

                        _LOGGER.info(
                            f"PROTECTION: Adding {charge_per_interval:.2f}kWh at "
                            f"{candidate['timestamp']} (price {candidate['price']:.2f}CZK)"
                        )

                        # Přepočítat timeline
                        self._recalculate_timeline_from_index(timeline, idx)

                    _LOGGER.info(
                        f"PROTECTION: Charged {charged:.2f}kWh / {protection_shortage:.2f}kWh needed"
                    )

        # KROK 2: EKONOMICKÁ OPTIMALIZACE
        # Získat kandidáty seřazené podle ceny
        candidates = self._get_candidate_intervals(
            timeline=timeline,
            max_charging_price=max_charging_price,
            current_time=current_time,
        )

        if not candidates:
            _LOGGER.warning(
                f"No economic charging candidates under max_price={max_charging_price}CZK"
            )
            return timeline

        _LOGGER.info(f"Found {len(candidates)} economic charging candidates")

        # Pro každého kandidáta: forward simulace a ekonomické vyhodnocení
        efficiency = self._get_battery_efficiency()

        for candidate in candidates:
            idx = candidate["index"]
            price = candidate["price"]
            timestamp = candidate["timestamp"]

            # Simulovat 48h dopředu (nebo do konce timeline)
            horizon_hours = min(48, len(timeline) - idx)

            # Scénář 1: Nabít tady
            result_charge = self._simulate_forward(
                timeline=timeline,
                start_index=idx,
                charge_now=True,
                charge_amount_kwh=charge_per_interval,
                horizon_hours=horizon_hours,
                effective_minimum_kwh=effective_minimum_kwh,
                efficiency=efficiency,
            )
            cost_charge = result_charge["total_charging_cost"]
            result_charge["min_soc"]
            result_charge["final_soc"]
            result_charge["death_valley_reached"]

            # Scénář 2: Počkat (nenabíjet tady)
            result_wait = self._simulate_forward(
                timeline=timeline,
                start_index=idx,
                charge_now=False,
                charge_amount_kwh=0,
                horizon_hours=horizon_hours,
                effective_minimum_kwh=effective_minimum_kwh,
                efficiency=efficiency,
            )
            cost_wait = result_wait["total_charging_cost"]
            min_soc_wait = result_wait["min_soc"]
            result_wait["final_soc"]
            death_valley_wait = result_wait["death_valley_reached"]

            # ROZHODNUTÍ 1: Death valley prevence
            if death_valley_wait:
                # Pokud nenabijeme, spadneme pod effective_minimum
                shortage = effective_minimum_kwh - min_soc_wait

                if shortage > 0:
                    # Spočítat minimum charge
                    min_charge = self._calculate_minimum_charge(
                        scenario_wait_min_soc=min_soc_wait,
                        effective_minimum_kwh=effective_minimum_kwh,
                        max_charge_per_interval=charge_per_interval,
                    )

                    _LOGGER.warning(
                        f"DEATH VALLEY at {timestamp}: Need {min_charge:.2f}kWh "
                        f"(min_soc_wait={min_soc_wait:.2f}kWh, effective_min={effective_minimum_kwh:.2f}kWh)"
                    )

                    # Nabít minimum (ne full charge!)
                    old_charge = timeline[idx].get("grid_charge_kwh", 0)
                    timeline[idx]["grid_charge_kwh"] = old_charge + min_charge
                    # Ponechat existující reason (může být balancing_*)
                    if timeline[idx].get("reason") == "normal":
                        timeline[idx]["reason"] = "death_valley_fix"

                    # Přepočítat timeline
                    self._recalculate_timeline_from_index(timeline, idx)

                    _LOGGER.info(
                        f"DEATH VALLEY FIX: Added {min_charge:.2f}kWh at {timestamp} "
                        f"(price {price:.2f}CZK)"
                    )

                    continue  # Další kandidát

            # ROZHODNUTÍ 2: Ekonomické vyhodnocení
            # Nabíjet jen pokud to ušetří min_savings_margin
            savings_per_kwh = (cost_wait - cost_charge) / charge_per_interval

            if savings_per_kwh >= min_savings_margin:
                # Vyplatí se nabít!
                old_charge = timeline[idx].get("grid_charge_kwh", 0)
                timeline[idx]["grid_charge_kwh"] = old_charge + charge_per_interval
                # Ponechat existující reason (může být balancing_*)
                if timeline[idx].get("reason") == "normal":
                    timeline[idx]["reason"] = "economic_charge"

                # Přepočítat timeline
                self._recalculate_timeline_from_index(timeline, idx)

                _LOGGER.info(
                    f"ECONOMIC: Added {charge_per_interval:.2f}kWh at {timestamp} "
                    f"(price {price:.2f}CZK, savings {savings_per_kwh:.3f}CZK/kWh > {min_savings_margin}CZK/kWh)"
                )
            else:
                _LOGGER.debug(
                    f"ECONOMIC: Skipping {timestamp} "
                    f"(price {price:.2f}CZK, savings {savings_per_kwh:.3f}CZK/kWh < {min_savings_margin}CZK/kWh)"
                )

        # KROK 3: Finální kontrola a metriky
        final_capacity = timeline[-1].get("battery_capacity_kwh", 0)
        target_achieved = final_capacity >= target_capacity_kwh
        min_achieved = final_capacity >= min_capacity_kwh

        # Uložit metriky pro dashboard
        self._charging_metrics = {
            "algorithm": "economic",
            "target_capacity_kwh": target_capacity_kwh,
            "effective_minimum_kwh": effective_minimum_kwh,
            "final_capacity_kwh": final_capacity,
            "min_capacity_kwh": min_capacity_kwh,
            "target_achieved": target_achieved,
            "min_achieved": min_achieved,
            "shortage_kwh": (
                max(0, target_capacity_kwh - final_capacity)
                if not target_achieved
                else 0
            ),
            "protection_enabled": enable_blackout_protection or enable_weather_risk,
            "protection_soc_kwh": protection_soc_kwh,
            "optimal_target_info": {
                "target_kwh": target_capacity_kwh,
                "target_percent": (target_capacity_kwh / max_capacity * 100),
                "reason": target_reason,
            },
        }

        _LOGGER.info(
            f"Economic charging complete: final={final_capacity:.2f}kWh, "
            f"target={target_capacity_kwh:.2f}kWh, achieved={target_achieved}"
        )

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
        """
        Chytrý plán nabíjení - vybírá nejlevnější intervaly kde se baterie SKUTEČNĚ nabije.

        Algoritmus:
        1. Simuluje timeline bez nabíjení
        2. Identifikuje kde baterie potřebuje energii (pod minimum nebo pro target)
        3. Vytvoří seznam kandidátů (levné intervaly kde se baterie může nabít)
        4. Vybere optimální intervaly a naplánuje nabíjení

        Args:
            timeline: Timeline data
            min_capacity: Minimální kapacita (kWh)
            target_capacity: Cílová kapacita na konci (kWh)
            max_price: Maximální cena (CZK/kWh)
            price_threshold: Práh pro špičky (CZK/kWh)
            charging_power_kw: Nabíjecí výkon (kW)
            max_capacity: Maximální kapacita baterie (kWh)

        Returns:
            Optimalizovaná timeline
        """
        charge_per_interval = charging_power_kw / 4.0  # kWh za 15min

        # KROK 1: Najít intervaly kde baterie klesne pod minimum
        critical_intervals = []
        min_capacity_in_timeline = float("inf")
        min_capacity_timestamp = None

        for i, point in enumerate(timeline):
            capacity = point.get("battery_capacity_kwh", 0)
            if capacity < min_capacity:
                critical_intervals.append(i)
            if capacity < min_capacity_in_timeline:
                min_capacity_in_timeline = capacity
                min_capacity_timestamp = point.get("timestamp", "unknown")

        # KROK 2: Spočítat kolik energie potřebujeme na konci
        final_capacity = timeline[-1].get("battery_capacity_kwh", 0)
        energy_needed_for_target = max(0, target_capacity - final_capacity)

        _LOGGER.info(
            f"Smart charging: {len(critical_intervals)} critical intervals, "
            f"min_capacity_in_timeline: {min_capacity_in_timeline:.2f}kWh @ {min_capacity_timestamp}, "
            f"min_threshold: {min_capacity:.2f}kWh, "
            f"need {energy_needed_for_target:.2f}kWh for target"
        )

        # KROK 3: PRIORITA 1 - Opravit kritická místa (minimální nabíjení)
        # Najít první kritické místo
        if critical_intervals:
            first_critical = critical_intervals[0]

            _LOGGER.info(
                f"First critical interval at index {first_critical}, "
                f"capacity: {timeline[first_critical].get('battery_capacity_kwh', 0):.2f}kWh"
            )

            # Spočítat kolik energie potřebujeme pro dosažení min_capacity v prvním kritickém místě
            critical_capacity = timeline[first_critical].get("battery_capacity_kwh", 0)
            energy_needed = min_capacity - critical_capacity

            if energy_needed > 0:
                _LOGGER.info(
                    f"Need {energy_needed:.2f}kWh to reach minimum at critical point"
                )

                # Najít nejlevnější intervaly PŘED kritickým místem
                charging_candidates = []
                for i in range(first_critical):
                    point = timeline[i]
                    price = point.get("spot_price_czk", float("inf"))
                    capacity = point.get("battery_capacity_kwh", 0)

                    # Filtr: cena musí být OK
                    if price > max_price:
                        continue

                    # Filtr: baterie nesmí být plná
                    if capacity >= max_capacity * 0.99:
                        continue

                    charging_candidates.append(
                        {
                            "index": i,
                            "price": price,
                            "capacity": capacity,
                            "timestamp": point.get("timestamp", ""),
                        }
                    )

                # Seřadit podle ceny
                charging_candidates.sort(key=lambda x: x["price"])

                # Přidat nabíjení postupně dokud nedosáhneme min_capacity
                added_energy = 0
                while added_energy < energy_needed and charging_candidates:
                    best = charging_candidates.pop(0)
                    idx = best["index"]

                    old_charge = timeline[idx].get("grid_charge_kwh", 0)
                    timeline[idx]["grid_charge_kwh"] = old_charge + charge_per_interval
                    # Ponechat existující reason (může být balancing_*)
                    if timeline[idx].get("reason") == "normal":
                        timeline[idx]["reason"] = "legacy_critical"
                    added_energy += charge_per_interval

                    _LOGGER.debug(
                        f"Critical fix: Adding {charge_per_interval:.2f}kWh at index {idx} "
                        f"(price {best['price']:.2f}CZK), total added: {added_energy:.2f}kWh"
                    )

                    # Přepočítat timeline
                    self._recalculate_timeline_from_index(timeline, idx)

                    # Zkontrolovat jestli jsme vyřešili kritické místo
                    new_critical_capacity = timeline[first_critical].get(
                        "battery_capacity_kwh", 0
                    )
                    if new_critical_capacity >= min_capacity:
                        _LOGGER.info(
                            f"Critical interval fixed: capacity now {new_critical_capacity:.2f}kWh >= {min_capacity:.2f}kWh"
                        )
                        break

        # KROK 4: PRIORITA 2 - Dosáhnout cílové kapacity na konci (v levných hodinách)
        max_iterations = 100
        iteration = 0

        # Vypočítat effective_target (pro 100% target použít 99%)
        effective_target = target_capacity
        if target_capacity >= max_capacity * 0.99:
            effective_target = max_capacity * 0.99

        while iteration < max_iterations:
            # Zkontrolovat aktuální stav na konci
            current_final_capacity = timeline[-1].get("battery_capacity_kwh", 0)

            if current_final_capacity >= effective_target:
                _LOGGER.info(
                    f"Target capacity achieved: {current_final_capacity:.2f}kWh >= {effective_target:.2f}kWh "
                    f"(original target: {target_capacity:.2f}kWh)"
                )
                break

            # Potřebujeme více energie
            shortage = effective_target - current_final_capacity

            # DŮLEŽITÉ: Přestavět seznam kandidátů s aktuálními kapacitami
            charging_candidates = []
            for i, point in enumerate(timeline):
                price = point.get("spot_price_czk", float("inf"))
                capacity = point.get("battery_capacity_kwh", 0)
                existing_charge = point.get("grid_charge_kwh", 0)

                # Filtr: cena musí být pod max_price (NE price_threshold - to jen pro kritická místa)
                if price > max_price:
                    continue

                # Filtr: baterie nesmí být plná (ponecháme 1% rezervu)
                if capacity >= max_capacity * 0.99:
                    continue

                # Filtr: musí být prostor pro nabití (ne na konci)
                if i >= len(timeline) - 1:
                    continue

                # KRITICKÝ FILTR: Max 1× charge_per_interval per interval (fyzikální limit!)
                # S 2.8 kW můžeme nabít max 0.7 kWh za 15 min
                if existing_charge >= charge_per_interval * 0.99:  # tolerance
                    continue

                charging_candidates.append(
                    {
                        "index": i,
                        "price": price,
                        "capacity": capacity,
                        "timestamp": point.get("timestamp", ""),
                        "existing_charge": existing_charge,
                    }
                )

            # Seřadit podle ceny (nejlevnější první)
            charging_candidates.sort(key=lambda x: x["price"])

            # Najít nejlevnějšího kandidáta
            if not charging_candidates:
                _LOGGER.warning(
                    f"No more charging candidates available, shortage: {shortage:.2f}kWh"
                )
                break

            best_candidate = charging_candidates[0]
            idx = best_candidate["index"]

            # Přidat nabíjení
            old_charge = timeline[idx].get("grid_charge_kwh", 0)
            timeline[idx]["grid_charge_kwh"] = old_charge + charge_per_interval
            # Ponechat existující reason (může být balancing_*)
            if timeline[idx].get("reason") == "normal":
                timeline[idx]["reason"] = "legacy_target"

            _LOGGER.debug(
                f"Target charging: Adding {charge_per_interval:.2f}kWh at index {idx} "
                f"(price {best_candidate['price']:.2f}CZK, timestamp {best_candidate['timestamp']}), "
                f"shortage: {shortage:.2f}kWh, capacity before: {best_candidate['capacity']:.2f}kWh"
            )

            # Přepočítat timeline od tohoto bodu
            self._recalculate_timeline_from_index(timeline, idx)

            iteration += 1

        if iteration >= max_iterations:
            _LOGGER.warning("Reached max iterations in smart charging plan")

        # Zkontrolovat finální stav a uložit metriky pro dashboard
        final_capacity = timeline[-1].get("battery_capacity_kwh", 0)
        target_achieved = final_capacity >= effective_target
        min_achieved = final_capacity >= min_capacity

        # Uložit metriky pro pozdější použití v extra_state_attributes
        self._charging_metrics = {
            "target_capacity_kwh": target_capacity,
            "effective_target_kwh": effective_target,
            "final_capacity_kwh": final_capacity,
            "min_capacity_kwh": min_capacity,
            "target_achieved": target_achieved,
            "min_achieved": min_achieved,
            "shortage_kwh": (
                max(0, effective_target - final_capacity) if not target_achieved else 0
            ),
        }

        return timeline

    def _find_first_minimum_violation(
        self, timeline: List[Dict[str, Any]], min_capacity: float
    ) -> Optional[int]:
        """
        Najde první index kde kapacita klesne pod minimum.

        Args:
            timeline: Timeline data
            min_capacity: Minimální kapacita (kWh)

        Returns:
            Index prvního porušení nebo None
        """
        for i, point in enumerate(timeline):
            capacity = point.get("battery_capacity_kwh", 0)
            if capacity < min_capacity:
                return i
        return None

    def _find_cheapest_hour_before(
        self,
        timeline: List[Dict[str, Any]],
        before_index: int,
        max_price: float,
        price_threshold: float,
    ) -> Optional[int]:
        """
        Najde nejlevnější vhodnou hodinu před daným indexem.

        Args:
            timeline: Timeline data
            before_index: Index před kterým hledat
            max_price: Maximální cena (CZK/kWh)
            price_threshold: Práh pro špičky (CZK/kWh)

        Returns:
            Index nejlevnější vhodné hodiny nebo None
        """
        candidates = []

        for i in range(before_index):
            point = timeline[i]
            price = point.get("spot_price_czk", float("inf"))

            # Kontrola podmínek
            if price > max_price:
                continue
            if price > price_threshold:  # Je to špička
                continue

            candidates.append((i, price))

        if not candidates:
            return None

        # Seřadit podle ceny a vrátit nejlevnější
        candidates.sort(key=lambda x: x[1])
        return candidates[0][0]

    def _find_cheapest_suitable_hour(
        self, timeline: List[Dict[str, Any]], max_price: float, price_threshold: float
    ) -> Optional[int]:
        """
        Najde nejlevnější vhodnou hodinu v celém intervalu.

        Args:
            timeline: Timeline data
            max_price: Maximální cena (CZK/kWh)
            price_threshold: Práh pro špičky (CZK/kWh)

        Returns:
            Index nejlevnější vhodné hodiny nebo None
        """
        candidates = []

        for i, point in enumerate(timeline):
            price = point.get("spot_price_czk", float("inf"))

            # Kontrola podmínek
            if price > max_price:
                continue
            if price > price_threshold:  # Je to špička
                continue

            # PŘESKOČIT sloty, které už mají nějaké nabíjení
            existing_charge = point.get("grid_charge_kwh", 0)
            if existing_charge > 0:
                continue

            candidates.append((i, price))

        if not candidates:
            return None

        # Seřadit podle ceny a vrátit nejlevnější
        candidates.sort(key=lambda x: x[1])
        return candidates[0][0]

    def _recalculate_timeline_from_index(
        self, timeline: List[Dict[str, Any]], start_index: int
    ) -> None:
        """
        Přepočítá timeline od daného indexu podle vzorce baterie.

        DŮLEŽITÉ: Používá stejnou logiku jako _calculate_timeline():
        - GAP #1: Efficiency při vybíjení (DC/AC losses)
        - GAP #3: UPS režim (spotřeba ze sítě)

        Args:
            timeline: Timeline data (modifikuje in-place)
            start_index: Index od kterého přepočítat
        """
        max_capacity = self._get_max_battery_capacity()
        min_capacity_percent = (
            self._config_entry.options.get("min_capacity_percent", 20.0)
            if self._config_entry.options
            else self._config_entry.data.get("min_capacity_percent", 20.0)
        )
        min_capacity = (min_capacity_percent / 100.0) * max_capacity

        # Získat battery efficiency
        efficiency = self._get_battery_efficiency()

        for i in range(start_index, len(timeline)):
            if i == 0:
                # První bod - použij aktuální kapacitu jako základ
                continue

            prev_point = timeline[i - 1]
            curr_point = timeline[i]

            # Načíst hodnoty z timeline
            prev_capacity = prev_point.get("battery_capacity_kwh", 0)
            solar_kwh = curr_point.get("solar_production_kwh", 0)  # CELKOVÝ solar
            grid_kwh = curr_point.get("grid_charge_kwh", 0)
            load_kwh = curr_point.get("consumption_kwh", 0)
            reason = curr_point.get("reason", "")

            # Určit režim (UPS vs Home)
            # OPRAVA: Při balancování VŽDY UPS režim
            is_balancing = reason.startswith("balancing_")
            is_ups_mode = grid_kwh > 0 or is_balancing

            if is_ups_mode:
                # UPS režim: spotřeba ze sítě, baterie roste díky solar + grid
                net_energy = solar_kwh + grid_kwh
            else:
                # Home režim: spotřeba z baterie (s DC/AC losses)
                if solar_kwh >= load_kwh:
                    # Solar pokrývá spotřebu + nabíjí baterii
                    solar_to_battery = solar_kwh - load_kwh
                    net_energy = solar_to_battery + grid_kwh
                else:
                    # Solar nepokrývá spotřebu → vybíjení z baterie (s losses!)
                    load_from_battery = load_kwh - solar_kwh
                    battery_drain = load_from_battery / efficiency
                    net_energy = -battery_drain + grid_kwh

            # Aktualizovat solar_charge_kwh pro zobrazení
            curr_point["solar_charge_kwh"] = round(max(0, solar_kwh - load_kwh), 2)

            new_capacity = prev_capacity + net_energy

            # Clamp na maximum a minimum - MUSÍ být konzistentní s _calculate_timeline()
            # 1. Maximum: max battery capacity
            # 2. Minimum: min_capacity (politika) - baterie nemá klesnout pod 20%
            # 3. HARD FLOOR: 0 kWh (fyzikální limit) - baterie nemůže být záporná
            new_capacity = min(new_capacity, max_capacity)
            if new_capacity < min_capacity:
                # Clamp na policy minimum (stejně jako v _calculate_timeline)
                new_capacity = min_capacity
            new_capacity = max(0.0, new_capacity)  # HARD FLOOR - fyzikální limit

            curr_point["battery_capacity_kwh"] = round(new_capacity, 2)

            # Aktualizovat mode pokud se změnilo grid_charge
            curr_point["mode"] = "Home UPS" if is_ups_mode else "Home I"

    # =========================================================================
    # ADAPTIVE LOAD PREDICTION v2
    # =========================================================================

    def _calculate_consumption_summary(self, adaptive_profiles: Dict[str, Any]) -> None:
        """Vypočítá 4 sumarizační hodnoty pro dashboard.

        Výstup do self._consumption_summary:
        - planned_consumption_today: kWh od teď do půlnoci
        - planned_consumption_tomorrow: kWh celý zítřek
        - profile_today: lidsky čitelný popis profilu
        - profile_tomorrow: lidsky čitelný popis profilu
        """
        if not adaptive_profiles or not isinstance(adaptive_profiles, dict):
            self._consumption_summary = {}
            return

        # 1. Plánovaná spotřeba DNES (od current_hour do půlnoci)
        today_profile = adaptive_profiles.get("today_profile")
        current_hour = datetime.now().hour
        planned_today = 0.0

        if today_profile and isinstance(today_profile, dict):
            hourly = today_profile.get("hourly_consumption", [])
            start_hour = today_profile.get(
                "start_hour", 0
            )  # Plovoucí okno: od které hodiny začíná pole

            if isinstance(hourly, list):
                # Převést absolutní hodinu na index v poli
                # current_hour=14, start_hour=13 → index=1
                for hour in range(current_hour, 24):
                    index = hour - start_hour
                    if 0 <= index < len(hourly):
                        planned_today += hourly[index]
            elif isinstance(hourly, dict):
                for hour in range(current_hour, 24):
                    planned_today += hourly.get(hour, 0.0)

        # 2. Plánovaná spotřeba ZÍTRA (celý den 0-23)
        tomorrow_profile = adaptive_profiles.get("tomorrow_profile")
        planned_tomorrow = 0.0

        if tomorrow_profile and isinstance(tomorrow_profile, dict):
            hourly = tomorrow_profile.get("hourly_consumption", [])
            start_hour = tomorrow_profile.get(
                "start_hour", 0
            )  # Vždy 0, ale pro konzistenci

            if isinstance(hourly, list):
                # Zítřek vždy začíná od půlnoci (start_hour=0), takže index=hour
                planned_tomorrow = sum(
                    (
                        hourly[h - start_hour]
                        if 0 <= (h - start_hour) < len(hourly)
                        else 0.0
                    )
                    for h in range(24)
                )
            elif isinstance(hourly, dict):
                planned_tomorrow = sum(hourly.get(h, 0.0) for h in range(24))

        # 3. Formátované popisy profilů
        profile_today_text = self._format_profile_description(today_profile)
        profile_tomorrow_text = self._format_profile_description(tomorrow_profile)

        # Uložit
        self._consumption_summary = {
            "planned_consumption_today": round(planned_today, 1),
            "planned_consumption_tomorrow": round(planned_tomorrow, 1),
            "profile_today": profile_today_text,
            "profile_tomorrow": profile_tomorrow_text,
        }

        _LOGGER.debug(
            f"Consumption summary: today={planned_today:.1f}kWh, "
            f"tomorrow={planned_tomorrow:.1f}kWh"
        )

    def _format_profile_description(self, profile: Optional[Dict[str, Any]]) -> str:
        """Vrátí lidsky čitelný popis profilu.

        Příklad: "Páteční večer (zimní, 15 podobných dnů)"
        """
        if not profile or not isinstance(profile, dict):
            return "Žádný profil"

        # Získat název z profile["ui"]["name"]
        ui = profile.get("ui", {})
        description = ui.get("name", "Neznámý profil")

        # Získat season z profile["characteristics"]["season"]
        characteristics = profile.get("characteristics", {})
        season = characteristics.get("season", "")

        # Počet dnů z profile["sample_count"]
        day_count = profile.get("sample_count", 0)

        # České názvy ročních období
        season_names = {
            "winter": "zimní",
            "spring": "jarní",
            "summer": "letní",
            "autumn": "podzimní",
        }
        season_cz = season_names.get(season, season)

        # Formát: "Popis (season, X podobných dnů)"
        if season and day_count > 0:
            return f"{description} ({season_cz}, {day_count} podobných dnů)"
        elif season:
            return f"{description} ({season_cz})"
        else:
            return description

    async def _get_adaptive_load_prediction(self) -> Optional[Dict[str, Any]]:
        """
        Načte adaptive load prediction přímo z adaptive_load_profiles sensoru.

        Sensor už má předpočítané today_profile a tomorrow_profile z 72h matching algoritmu.

        Returns:
            Dict nebo None:
            {
                "today_profile": {...},      # Profil pro zbytek dneška
                "tomorrow_profile": {...},   # Profil pro zítřek (pokud timeline přes půlnoc)
                "match_score": 0.666,
                "prediction_summary": {...}
            }
        """
        try:
            # Načíst data přímo z adaptive sensor
            profiles_sensor = f"sensor.oig_{self._box_id}_adaptive_load_profiles"

            if not self._hass:
                return None

            profiles_state = self._hass.states.get(profiles_sensor)
            if not profiles_state:
                _LOGGER.debug(f"Adaptive profiles sensor not found: {profiles_sensor}")
                return None

            attrs = profiles_state.attributes

            # Zkontrolovat jestli má today_profile a tomorrow_profile
            if "today_profile" not in attrs or "tomorrow_profile" not in attrs:
                _LOGGER.debug(
                    "Adaptive sensor missing today_profile or tomorrow_profile"
                )
                return None

            # Vrátit profily přímo - sensor už udělal matching a prediction
            result = {
                "today_profile": attrs["today_profile"],
                "tomorrow_profile": attrs["tomorrow_profile"],
                "match_score": attrs.get("prediction_summary", {}).get(
                    "similarity_score", 0.0
                ),
                "prediction_summary": attrs.get("prediction_summary", {}),
            }

            _LOGGER.debug(
                f"✅ Adaptive prediction loaded: "
                f"today={result['today_profile'].get('total_kwh', 0):.2f} kWh, "
                f"match_score={result['match_score']:.3f}"
            )

            return result

        except Exception as e:
            _LOGGER.error(f"Error in adaptive load prediction: {e}", exc_info=True)
            return None

    async def _get_today_hourly_consumption(self) -> List[float]:
        """
        Načte dnešní spotřebu po hodinách (od půlnoci do teď).

        Returns:
            List hodinových spotřeb v kWh (např. [0.5, 0.4, 0.3, ..., 1.2])
        """
        try:
            # OPRAVA: Kontrola že hass je dostupný
            if not self.hass:
                _LOGGER.debug("_get_today_hourly_consumption: hass not available yet")
                return []

            consumption_sensor = f"sensor.oig_{self._box_id}_actual_aco_p"

            # Načíst ze statistics (hodinové průměry)
            from homeassistant.components.recorder.statistics import (
                statistics_during_period,
            )

            start_time = dt_util.now().replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            end_time = dt_util.now()

            stats = await self.hass.async_add_executor_job(
                statistics_during_period,
                self.hass,
                start_time,
                end_time,
                {consumption_sensor},
                "hour",
                None,
                {"mean"},
            )

            if not stats or consumption_sensor not in stats:
                return []

            hourly_values = []
            for stat in stats[consumption_sensor]:
                if stat.get("mean") is not None:
                    # Statistics jsou ve wattech, převést na kWh/h
                    kwh = stat["mean"] / 1000
                    hourly_values.append(kwh)

            return hourly_values

        except Exception as e:
            _LOGGER.debug(f"Error getting today hourly consumption: {e}")
            return []

    async def _calculate_recent_consumption_ratio(
        self, adaptive_profiles: Optional[Dict[str, Any]], hours: int = 3
    ) -> Optional[float]:
        """Porovná reálnou spotřebu vs plán za posledních N hodin.

        OPRAVA: Používá původní plán z _daily_plan_state (persistentní),
        ne dynamicky se měnící adaptive_profiles (ty mají start_hour
        posunutý během dne a indexování pak nefunguje).
        """
        actual_hourly = await self._get_today_hourly_consumption()
        if not actual_hourly:
            return None

        total_hours = len(actual_hourly)
        if total_hours == 0:
            return None

        lookback = min(hours, total_hours)
        actual_total = sum(actual_hourly[-lookback:])

        # OPRAVA: Použít původní plán z _daily_plan_state místo adaptive_profiles
        # _daily_plan_state obsahuje "plan" s consumption_kwh pro každý 15-min interval
        # a vytváří se jednou denně, takže je stabilní
        planned_total = 0.0
        plan_source = "none"

        # Preferovat persistentní plán z půlnoci (musí mít alespoň nějaké intervaly)
        plan_intervals = []
        if (
            hasattr(self, "_daily_plan_state")
            and self._daily_plan_state
            and self._daily_plan_state.get("plan")
            and len(self._daily_plan_state.get("plan", [])) > 0
        ):
            plan_intervals = self._daily_plan_state.get("plan", [])

            # Spočítat, kolik intervalů odpovídá lookback hodinám
            # total_hours = počet hodinových dat (od 0:00), lookback = 3h
            # start_hour = total_hours - lookback (např. 18-3=15)
            start_hour = total_hours - lookback

            # Plan intervals jsou po 15 minutách, takže pro hodinu H potřebujeme
            # intervaly H*4 až H*4+3 (4 intervaly = 1 hodina)
            for hour_idx in range(lookback):
                hour = start_hour + hour_idx
                # Sečíst 4 intervaly (15min * 4 = 1h)
                for quarter in range(4):
                    interval_idx = hour * 4 + quarter
                    if 0 <= interval_idx < len(plan_intervals):
                        planned_total += plan_intervals[interval_idx].get(
                            "consumption_kwh", 0
                        )

            if planned_total > 0:
                plan_source = "daily_plan_state"

        # Fallback #1: Adaptive profiles (pokud daily_plan_state nemá data)
        if planned_total <= 0 and (
            adaptive_profiles
            and isinstance(adaptive_profiles, dict)
            and "today_profile" in adaptive_profiles
        ):
            # Fallback na adaptive profiles (ale se správným výpočtem)
            today_profile = adaptive_profiles.get("today_profile") or {}
            hourly_plan = today_profile.get("hourly_consumption", [])
            start_hour_profile = today_profile.get("start_hour", 0)
            avg_fallback = today_profile.get("avg_kwh_h", 0.5)

            start_hour = total_hours - lookback

            for idx in range(lookback):
                hour = start_hour + idx
                plan_idx = hour - start_hour_profile
                if 0 <= plan_idx < len(hourly_plan):
                    planned_total += hourly_plan[plan_idx]
                else:
                    # Pokud nemáme data pro tuto hodinu, použij load_avg senzory
                    load_avg = self._get_load_avg_for_hour(hour)
                    if load_avg > 0:
                        planned_total += load_avg
                    else:
                        planned_total += avg_fallback

            plan_source = "adaptive_profiles"

        # Fallback #2: Load_avg senzory (pokud ani adaptive profiles nemají data)
        if planned_total <= 0:
            load_avg_sensors = self._get_load_avg_sensors()
            start_hour = total_hours - lookback

            for hour_idx in range(lookback):
                hour = start_hour + hour_idx
                # Vytvořit timestamp pro tuto hodinu
                now = dt_util.now()
                ts = now.replace(hour=hour, minute=30, second=0, microsecond=0)
                load_kwh = self._get_load_avg_for_timestamp(ts, load_avg_sensors)
                planned_total += load_kwh * 4  # 4 intervaly = 1 hodina

            plan_source = "load_avg_sensors"

        if planned_total <= 0:
            _LOGGER.warning(
                f"[LoadForecast] Cannot calculate ratio: planned_total=0 (source={plan_source})"
            )
            return None

        ratio = actual_total / planned_total
        _LOGGER.debug(
            "[LoadForecast] Recent consumption ratio (last %dh): actual=%.2f kWh, planned=%.2f kWh → %.2fx (source=%s)",
            lookback,
            actual_total,
            planned_total,
            ratio,
            plan_source,
        )
        return ratio

    def _apply_consumption_boost_to_forecast(
        self, load_forecast: List[float], ratio: float, hours: int = 3
    ) -> None:
        """Navýší load forecast podle zjištěné odchylky mezi skutečnou a plánovanou spotřebou.

        OPRAVA: Aplikuje boost na CELÝ forecast, ne jen na prvních pár hodin.
        Důvod: Pokud spotřeba je stabilně vyšší (např. 1.7x), bude pravděpodobně
        vyšší i zbytek dne. Původní omezení na ~6h způsobovalo, že baterie
        klesla na minimum bez reakce.

        Strategie boostu:
        - ratio < 1.1: Žádný boost (v rámci tolerance)
        - ratio 1.1-1.5: Plný boost na prvních 4h, pak postupný fade (50%, 25%)
        - ratio > 1.5: Plný boost na celý zbytek dneška (do půlnoci)

        Args:
            load_forecast: List spotřeby v kWh/15min (in-place modifikace)
            ratio: Poměr skutečné/plánované spotřeby
            hours: Lookback window (nepoužito v nové verzi)
        """
        if not load_forecast:
            return

        # Cap ratio na 3.0 (300%) - víc by bylo nerealistické
        capped_ratio = min(ratio, 3.0)

        # Kolik intervalů zbývá do půlnoci?
        now = dt_util.now()
        current_minute = now.hour * 60 + now.minute
        minutes_until_midnight = 24 * 60 - current_minute
        intervals_until_midnight = minutes_until_midnight // 15

        # Určit strategii podle severity driftu
        if capped_ratio >= 1.5:
            # Vysoký drift (50%+): boost na celý zbytek dneška
            full_boost_intervals = min(len(load_forecast), intervals_until_midnight)
            fade_start = full_boost_intervals  # Žádný fade
            _LOGGER.info(
                f"[LoadForecast] HIGH drift detected (ratio={ratio:.2f}x): "
                f"boosting ALL {full_boost_intervals} intervals until midnight"
            )
        elif capped_ratio >= 1.3:
            # Střední drift (30-50%): boost na 6h, pak fade
            full_boost_intervals = min(6 * 4, len(load_forecast))  # 6 hodin
            fade_start = full_boost_intervals
        else:
            # Nízký drift (10-30%): boost na 3h, pak fade
            full_boost_intervals = min(3 * 4, len(load_forecast))  # 3 hodiny
            fade_start = full_boost_intervals

        boosted_count = 0
        for idx in range(len(load_forecast)):
            if idx < full_boost_intervals:
                # Plný boost
                load_forecast[idx] = round(load_forecast[idx] * capped_ratio, 4)
                boosted_count += 1
            elif idx < fade_start + 8:  # Fade zone (2h)
                # Postupný fade: 75% → 50% → 25% boostu
                fade_progress = (idx - fade_start) / 8.0
                fade_ratio = 1.0 + (capped_ratio - 1.0) * (1.0 - fade_progress * 0.75)
                load_forecast[idx] = round(load_forecast[idx] * fade_ratio, 4)
                boosted_count += 1
            # Za fade zone: žádná změna (zítra může být jinak)

        _LOGGER.info(
            "[LoadForecast] Boosted %d intervals: %d full (%.0f%%), rest fading. "
            "Drift ratio %.2fx (capped %.2fx)",
            boosted_count,
            full_boost_intervals,
            (capped_ratio - 1) * 100,
            ratio,
            capped_ratio,
        )

    def plan_charging_to_target(
        self,
        target_soc_percent: float,
        deadline: datetime,
        holding_duration_hours: int,
        mode: str,
        requester: str,
    ) -> Dict[str, Any]:
        """
        Centrální plánovací funkce pro nabíjení baterie na cílový SOC.

        Args:
            target_soc_percent: Cílový SOC (0-100%)
            deadline: DO KDY má být dosaženo (konec holding fáze)
            holding_duration_hours: Délka holding fáze (např. 3h pro balancing)
            mode: "economic" (hledá levné intervaly) nebo "forced" (MUSÍ nabít)
            requester: "balancing", "weather_protection", "blackout_protection", "manual"

        Returns:
            Dict s výsledkem plánování:
            {
                "feasible": bool,           # Podařilo se vytvořit plán?
                "status": str,              # "complete" nebo "partial"
                "achieved_soc_percent": float,  # Čeho skutečně dosáhne
                "charging_plan": {...},     # Detailní plán (pokud feasible)
                "conflict": {...}           # Info o konfliktu (pokud nelze aplikovat)
            }
        """
        _LOGGER.info(
            f"[Planner] Request from {requester}: target={target_soc_percent}%, "
            f"deadline={deadline.strftime('%Y-%m-%d %H:%M')}, mode={mode}"
        )

        # 1. Kontrola konfliktu s aktivním plánem
        if hasattr(self, "_active_charging_plan") and self._active_charging_plan:
            # Spočítat předpokládaný SOC k našemu deadline při aktivním plánu
            predicted_soc = self._predict_soc_at_time(
                deadline, self._active_charging_plan
            )

            _LOGGER.warning(
                f"[Planner] CONFLICT: Active plan from {self._active_charging_plan['requester']}, "
                f"predicted SOC at {deadline.strftime('%H:%M')} = {predicted_soc:.1f}%"
            )

            return {
                "feasible": False,
                "status": "conflict",
                "conflict": {
                    "active_plan_requester": self._active_charging_plan["requester"],
                    "active_plan_deadline": self._active_charging_plan["deadline"],
                    "active_plan_target_soc": self._active_charging_plan[
                        "target_soc_percent"
                    ],
                    "predicted_soc_at_deadline": predicted_soc,
                },
            }

        # 2. Načíst konfiguraci
        config = (
            self._config_entry.options
            if self._config_entry and self._config_entry.options
            else self._config_entry.data if self._config_entry else {}
        )
        charging_power_kw = config.get("home_charge_rate", 2.8)
        charge_per_15min = charging_power_kw / 4.0  # kW → kWh za 15min

        max_capacity = self._get_max_battery_capacity()
        target_soc_kwh = (target_soc_percent / 100.0) * max_capacity

        # 3. Vypočítat holding window
        now = dt_util.now()
        holding_start = deadline - timedelta(hours=holding_duration_hours)
        holding_end = deadline

        # 4. Získat BASELINE forecast battery capacity v holding_start
        # KRITICKÉ: Použít BASELINE timeline (bez plánu) pro plánování!
        # Jinak cyklická závislost: plan → forecast 100% → simulace "už plno" → žádné charging

        # Use cached baseline timeline if available
        baseline_timeline = (
            self._baseline_timeline
            if hasattr(self, "_baseline_timeline") and self._baseline_timeline
            else None
        )

        if not baseline_timeline:
            # Fallback: Generate baseline on-demand
            _LOGGER.warning(
                "[Planner] No baseline timeline cached, generating on-demand"
            )
            current_capacity = self._get_current_battery_capacity()
            if current_capacity is None:
                _LOGGER.error("[Planner] Cannot get current battery capacity")
                return {
                    "feasible": False,
                    "status": "error",
                    "error": "No current capacity data",
                }

            # Načíst spot prices pro baseline timeline
            spot_prices_list = []
            if hasattr(self, "_spot_prices") and self._spot_prices:
                spot_prices_list = self._spot_prices

            # Get battery parameters
            max_capacity = self._get_max_battery_capacity()
            min_capacity = self._get_min_battery_capacity()

            # Get solar forecast and load sensors
            solar_forecast = getattr(self, "_solar_forecast", {})
            load_avg_sensors = getattr(self, "_load_avg_sensors", {})

            # Generate baseline timeline (NO PLAN!)
            baseline_timeline = self._calculate_timeline(
                current_capacity=current_capacity,
                max_capacity=max_capacity,
                min_capacity=min_capacity,
                spot_prices=spot_prices_list,
                export_prices=[],  # Phase 1.5: Empty list (not available in this context)
                solar_forecast=solar_forecast,
                load_avg_sensors=load_avg_sensors,
                adaptive_profiles=getattr(self, "_adaptive_profiles", None),
                balancing_plan=None,  # CRITICAL: No plan for baseline!
            )

        # Najít battery capacity v čase holding_start z BASELINE
        current_battery_kwh = None
        for point in baseline_timeline:
            point_time = point.get("time")
            # point_time is already a datetime object, no need to parse
            if isinstance(point_time, str):
                point_time = dt_util.parse_datetime(point_time)
            if point_time and point_time >= holding_start:
                current_battery_kwh = point.get("battery_capacity_kwh")
                _LOGGER.info(
                    f"[Planner] Baseline forecast at {point_time.strftime('%H:%M')}: "
                    f"{current_battery_kwh:.2f} kWh ({current_battery_kwh/max_capacity*100:.1f}%)"
                )
                break

        # Fallback na současnou kapacitu pokud forecast není dostupný
        if current_battery_kwh is None:
            current_capacity = self._get_current_battery_capacity()
            if current_capacity is None:
                _LOGGER.error("[Planner] Cannot get current battery capacity")
                return {
                    "feasible": False,
                    "status": "error",
                    "error": "No current capacity data",
                }
            current_battery_kwh = current_capacity
            _LOGGER.warning(
                f"[Planner] Could not find baseline forecast at holding_start, "
                f"using current capacity: {current_battery_kwh:.2f} kWh"
            )

        # Pokud holding_start je v minulosti, posunout do budoucnosti
        if holding_start <= now:
            _LOGGER.warning(
                f"[Planner] Holding start {holding_start} is in the past (now={now})!"
            )
            holding_start = now + timedelta(hours=1)
            holding_end = holding_start + timedelta(hours=holding_duration_hours)

        # 5. Najít dostupné intervaly (NOW až holding_start)

        # 6. Získat spot prices ze senzoru (ne async call!)
        try:
            if not self._hass:
                _LOGGER.error("[Planner] No hass instance available")
                return {"feasible": False, "status": "error", "error": "No hass"}

            # Číst ze spot price senzoru (stejně jako dřív balancing)
            sensor_id = f"sensor.oig_{self._box_id}_spot_price_current_15min"
            state = self._hass.states.get(sensor_id)

            if not state or state.state in ("unavailable", "unknown", None):
                _LOGGER.error(f"[Planner] Spot price sensor {sensor_id} not available")
                return {
                    "feasible": False,
                    "status": "error",
                    "error": "No spot prices sensor",
                }

            if not state.attributes:
                _LOGGER.error(
                    f"[Planner] Spot price sensor {sensor_id} has no attributes"
                )
                return {
                    "feasible": False,
                    "status": "error",
                    "error": "No spot prices data",
                }

            # Format: [{timestamp, price, ...}, ...]
            prices_list = state.attributes.get("prices", [])
            if not prices_list:
                _LOGGER.error("[Planner] No prices in spot price sensor")
                return {
                    "feasible": False,
                    "status": "error",
                    "error": "Empty spot prices",
                }

            # Převést na timeline formát
            spot_prices = []
            for price_point in prices_list:
                timestamp = price_point.get("timestamp")
                price = price_point.get("price")
                if timestamp and price is not None:
                    spot_prices.append({"time": timestamp, "price": float(price)})

            _LOGGER.debug(f"[Planner] Loaded {len(spot_prices)} spot prices")

        except Exception as e:
            _LOGGER.error(f"[Planner] Failed to get spot prices: {e}")
            return {"feasible": False, "status": "error", "error": str(e)}

        if not spot_prices:
            _LOGGER.error("[Planner] No spot prices available")
            return {"feasible": False, "status": "error", "error": "No spot prices"}

        # 7. Najít nejlevnější intervaly
        charging_intervals = self._find_cheapest_charging_intervals(
            spot_prices=spot_prices,
            start_time=now,
            end_time=holding_start,
            target_soc_kwh=target_soc_kwh,
            current_soc_kwh=current_battery_kwh,
            charge_per_15min=charge_per_15min,
            mode=mode,
        )

        if not charging_intervals:
            _LOGGER.warning("[Planner] No charging intervals found")
            return {
                "feasible": False,
                "status": "insufficient_time",
                "achieved_soc_percent": (current_battery_kwh / max_capacity) * 100.0,
                "charging_intervals": [],  # Return empty list instead of missing key
                "initial_battery_kwh": current_battery_kwh,
                "target_soc_percent": target_soc_percent,
                "requester": requester,
                "mode": mode,
                "created_at": now.isoformat(),
            }

        # 8. Spočítat dosažený SOC
        total_energy = sum(iv["grid_kwh"] for iv in charging_intervals)
        achieved_soc_kwh = current_battery_kwh + total_energy
        achieved_soc_percent = min(100.0, (achieved_soc_kwh / max_capacity) * 100.0)

        # 9. Vyhodnotit úspěšnost
        is_complete = achieved_soc_percent >= target_soc_percent - 1.0  # 1% tolerance
        status = "complete" if is_complete else "partial"

        # 10. Economic mode - kontrola threshold
        if mode == "economic" and not is_complete:
            _LOGGER.warning(
                f"[Planner] Economic mode failed: achieved {achieved_soc_percent:.1f}% < target {target_soc_percent}%"
            )
            # CRITICAL FIX: Economic mode MUST return partial results with charging_intervals
            # Otherwise simulation will fail with KeyError when trying to access them
            return {
                "feasible": False,
                "status": "partial",
                "achieved_soc_percent": achieved_soc_percent,
                "charging_intervals": charging_intervals,  # Return what we found
                "initial_battery_kwh": current_battery_kwh,  # For simulation
                "target_soc_percent": target_soc_percent,
                "requester": requester,
                "mode": mode,
                "created_at": now.isoformat(),
            }

        # 11. Spočítat náklady
        costs = self._calculate_charging_costs(
            charging_intervals=charging_intervals,
            holding_start=holding_start,
            holding_end=holding_end,
            spot_prices=spot_prices,
        )

        # 12. Sestavit charging plan
        charging_plan = {
            "holding_start": holding_start.isoformat(),
            "holding_end": holding_end.isoformat(),
            "charging_intervals": charging_intervals,
            "total_cost_czk": costs["total_cost_czk"],
            "total_energy_kwh": total_energy,
            "charging_cost_czk": costs["charging_cost_czk"],
            "holding_cost_czk": costs["holding_cost_czk"],
        }

        _LOGGER.info(
            f"[Planner] SUCCESS: {status}, "
            f"achieved={achieved_soc_percent:.1f}%, "
            f"intervals={len(charging_intervals)}, "
            f"cost={costs['total_cost_czk']:.2f} Kč"
        )

        return {
            "feasible": True,
            "status": status,
            "target_soc_percent": target_soc_percent,  # Původní cíl
            "achieved_soc_percent": achieved_soc_percent,  # Co jsme dosáhli
            "charging_plan": charging_plan,
            "total_cost_czk": costs["total_cost_czk"],  # Pro srovnání kandidátů
            "charging_intervals": charging_intervals,  # Pro simulation wrapper
            "initial_battery_kwh": current_battery_kwh,  # Baseline battery při holding_start
            "requester": requester,
            "mode": mode,
            "created_at": now.isoformat(),
        }

    def apply_charging_plan(
        self,
        plan_result: Dict[str, Any],
        plan_start: datetime,
        plan_end: datetime,
    ) -> bool:
        """
        Aplikuje schválený plán s lifecycle managementem.

        Plan Lifecycle:
        - PLANNED: Čeká na start, lze přeplánovat
        - LOCKED: <1h před startem, lze jen zrušit
        - RUNNING: Aktivní nabíjení/holding, lze jen zrušit
        - COMPLETED: Dokončeno

        Args:
            plan_result: Výsledek z plan_charging_to_target()
            plan_start: Začátek plánu (první charging interval)
            plan_end: Konec plánu (konec holding)

        Returns:
            True pokud úspěšně aplikováno
        """
        if not plan_result.get("feasible"):
            _LOGGER.warning("[Planner] Cannot apply non-feasible plan")
            return False

        now = dt_util.now()

        # Určit počáteční status podle času do startu
        time_to_start = (plan_start - now).total_seconds() / 3600  # hodiny

        if time_to_start <= 0:
            initial_status = "running"
        elif time_to_start < 1:
            initial_status = "locked"
        else:
            initial_status = "planned"

        self._active_charging_plan = {
            "requester": plan_result["requester"],
            "mode": plan_result["mode"],
            "target_soc_percent": plan_result.get("target_soc_percent", 100.0),
            "deadline": plan_result["charging_plan"]["holding_end"],
            "charging_plan": plan_result["charging_plan"],
            "plan_start": plan_start.isoformat(),  # NOVÉ: Začátek aktivace
            "plan_end": plan_end.isoformat(),  # NOVÉ: Konec plánu
            "status": initial_status,  # NOVÉ: Lifecycle status
            "created_at": plan_result["created_at"],
        }

        # Nastavit global status
        self._plan_status = initial_status

        _LOGGER.info(
            f"[Planner] Plan APPLIED: {plan_result['requester']} "
            f"({plan_result['mode']} mode), status={initial_status}, "
            f"start={plan_start.strftime('%H:%M')}, end={plan_end.strftime('%H:%M')}"
        )

        # Přepočítat forecast s novým plánem
        if self._hass:
            self._hass.async_create_task(self.async_update())

        return True

    def cancel_charging_plan(self, requester: str) -> bool:
        """
        Zruší aktivní plán (pouze pokud patří danému requesteru).

        Args:
            requester: ID requestera který plán vytvořil

        Returns:
            True pokud úspěšně zrušeno
        """
        if not hasattr(self, "_active_charging_plan") or not self._active_charging_plan:
            _LOGGER.debug("[Planner] No active plan to cancel")
            return False

        if self._active_charging_plan["requester"] != requester:
            _LOGGER.warning(
                f"[Planner] Cannot cancel plan: requester mismatch "
                f"(active={self._active_charging_plan['requester']}, requested={requester})"
            )
            return False

        _LOGGER.info(f"[Planner] Plan CANCELLED: {requester}")
        self._active_charging_plan = None
        self._plan_status = "none"

        # Přepočítat forecast bez plánu
        if self._hass:
            self._hass.async_create_task(self.async_update())

        return True

    def get_active_plan(self) -> Optional[Dict[str, Any]]:
        """Vrátí aktuální aktivní plán nebo None."""
        if hasattr(self, "_active_charging_plan"):
            return self._active_charging_plan
        return None

    def get_timeline_data(self) -> List[Dict[str, Any]]:
        """Vrátí aktuální ACTIVE timeline data (s aplikovaným plánem) pro UI/dashboard."""
        if hasattr(self, "_timeline_data"):
            return self._timeline_data
        return []

    def get_baseline_timeline(self) -> List[Dict[str, Any]]:
        """Vrátí BASELINE timeline (bez plánu) pro simulace a plánování."""
        if hasattr(self, "_baseline_timeline"):
            return self._baseline_timeline
        return []

    def get_autonomy_preview(self) -> Optional[Dict[str, Any]]:
        """Return latest autonomous preview summary."""
        return self._autonomy_preview

    def get_autonomy_timeline(self) -> List[Dict[str, Any]]:
        """Return autonomous timeline for API consumers."""
        if self._autonomy_preview:
            return self._autonomy_preview.get("timeline", [])
        return []

    # ========================================================================
    # SIMULATION API - pro testování charging plánů bez aplikace
    # ========================================================================

    async def simulate_charging_plan(
        self,
        target_soc_percent: float,
        charging_start: datetime,
        charging_end: datetime,
        holding_start: datetime,
        holding_end: datetime,
        requester: str,
        mode: str = "economic",
    ) -> Dict[str, Any]:
        """
        SIMULACE charging plánu - NEAPLIKUJE ho na skutečný forecast!

        Proces:
        1. Vezme aktuální timeline (spot prices, solar, consumption)
        2. Vytvoří KOPII timeline
        3. Na kopii aplikuje simulovaný plán (nabíjení + holding)
        4. Spočítá náklady, feasibility, violations
        5. Vrátí výsledky BEZ změny skutečného stavu

        Args:
            target_soc_percent: Cílová SOC při začátku holding (obvykle 100%)
            charging_start: Začátek charging window
            charging_end: Konec charging window (začátek holding)
            holding_start: Začátek holding period
            holding_end: Konec holding period
            requester: Kdo žádá simulaci (balancing, weather_protection, atd.)

        Returns:
            {
                "simulation_id": "sim_balancing_20251027_080000",
                "feasible": True/False,
                "violation": None nebo "minimal_capacity_breach",
                "violation_time": None nebo datetime,

                "charging_cost_czk": 35.12,
                "holding_cost_czk": 2.15,
                "opportunity_cost_czk": 5.30,
                "total_cost_czk": 42.57,

                "energy_needed_kwh": 9.8,
                "min_capacity_during_plan": 2.45,
                "initial_soc_percent": 21.5,
                "final_soc_percent": 100.0,

                "plan_start": "2025-10-27T10:45:00",
                "plan_end": "2025-10-28T07:00:00",
                "charging_intervals": [...]
            }
        """
        # Inicializovat simulace dict pokud neexistuje
        if not hasattr(self, "_simulations"):
            self._simulations: Dict[str, Dict] = {}

        # 1. Use BASELINE timeline (clean, no active plan)
        # CRITICAL: Simulations must use clean data to avoid circular dependency!
        baseline_timeline = (
            self._baseline_timeline
            if hasattr(self, "_baseline_timeline") and self._baseline_timeline
            else None
        )

        if not baseline_timeline:
            _LOGGER.error("Cannot simulate - no baseline timeline available")
            return {
                "simulation_id": None,
                "feasible": False,
                "violation": "no_baseline_timeline",
            }

        original_timeline = baseline_timeline  # Use BASELINE for simulation!

        # 2. Najít charging intervaly (nejlevnější v okně)
        config = (
            self._config_entry.options
            if self._config_entry and self._config_entry.options
            else self._config_entry.data if self._config_entry else {}
        )

        max_capacity_kwh = self._get_max_battery_capacity()
        target_soc_kwh = (target_soc_percent / 100.0) * max_capacity_kwh
        config.get("home_charge_rate", 2.8) / 4.0

        # Najít charging intervaly pomocí plan_charging_to_target
        # která používá baseline forecast pro určení aktuální kapacity
        holding_duration_hours = (holding_end - holding_start).total_seconds() / 3600

        plan_result = self.plan_charging_to_target(
            target_soc_percent=target_soc_percent,
            deadline=holding_end,
            holding_duration_hours=holding_duration_hours,
            mode=mode,  # Use parameter instead of hardcoded "economic"
            requester=requester,
        )

        # Accept both full feasible plans AND partial results with charging_intervals
        # Partial results occur in economic mode when target can't be reached at low prices
        if not plan_result or not plan_result.get("charging_intervals"):
            status = plan_result.get("status") if plan_result else "no_result"
            _LOGGER.error(f"Failed to generate charging plan: {status}")
            return {
                "simulation_id": None,
                "feasible": False,
                "violation": "plan_generation_failed",
            }

        charging_intervals = plan_result["charging_intervals"]
        initial_soc_kwh = plan_result.get("initial_battery_kwh", 0)

        # 3. Simulace na kopii timeline
        simulation_result = await self._run_timeline_simulation(
            original_timeline=original_timeline,
            charging_intervals=charging_intervals,
            holding_start=holding_start,
            holding_end=holding_end,
            target_soc_kwh=target_soc_kwh,
        )

        # 4. Validace
        minimal_capacity_kwh = self._get_min_battery_capacity()
        violations = self._validate_simulation(
            timeline=simulation_result["simulated_timeline"],
            minimal_capacity_kwh=minimal_capacity_kwh,
        )

        # 5. Náklady
        costs = self._calculate_simulation_costs(
            original_timeline=original_timeline,
            simulated_timeline=simulation_result["simulated_timeline"],
            charging_intervals=charging_intervals,
            holding_start=holding_start,
            holding_end=holding_end,
        )

        # 6. Generate ID
        sim_id = f"sim_{requester}_{dt_util.now().strftime('%Y%m%d_%H%M%S')}"

        # 7. Uložit simulaci (max 10, auto-cleanup starších než 1h)
        self._cleanup_old_simulations()
        self._simulations[sim_id] = {
            "created_at": dt_util.now(),
            "timeline": simulation_result["simulated_timeline"],
            "costs": costs,
            "violations": violations,
            "metadata": {
                "charging_start": charging_start,
                "charging_end": charging_end,
                "holding_start": holding_start,
                "holding_end": holding_end,
                "requester": requester,
            },
        }

        # 8. Return results
        return {
            "simulation_id": sim_id,
            "feasible": len([v for v in violations if v["severity"] == "critical"])
            == 0,
            "violation": violations[0]["type"] if violations else None,
            "violation_time": violations[0]["time"] if violations else None,
            "charging_cost_czk": costs["charging"],
            "holding_cost_czk": costs["holding"],
            "opportunity_cost_czk": costs["opportunity"],
            "total_cost_czk": costs["total"],
            "energy_needed_kwh": simulation_result["energy_needed"],
            "min_capacity_during_plan": simulation_result["min_capacity"],
            "initial_soc_percent": (initial_soc_kwh / max_capacity_kwh) * 100,
            "achieved_soc_percent": plan_result.get(
                "achieved_soc_percent", 100.0
            ),  # From plan
            "final_soc_percent": simulation_result[
                "final_soc_percent"
            ],  # From timeline sim
            "plan_start": charging_start.isoformat(),
            "plan_end": holding_end.isoformat(),
            "charging_intervals": charging_intervals,
        }

    async def _run_timeline_simulation(
        self,
        original_timeline: List[Dict[str, Any]],
        charging_intervals: List[Dict[str, Any]],
        holding_start: datetime,
        holding_end: datetime,
        target_soc_kwh: float,
    ) -> Dict[str, Any]:
        """
        Spustí simulaci timeline s aplikovaným plánem.

        Returns:
            {
                "simulated_timeline": [...],
                "energy_needed": 9.8,
                "min_capacity": 2.45,
                "final_soc_percent": 100.0
            }
        """
        # COPY-ON-WRITE: Kopie timeline
        simulated_timeline = copy.deepcopy(original_timeline)

        # Převést charging intervals na set pro rychlé lookup
        charging_times = {
            datetime.fromisoformat(iv["timestamp"]) for iv in charging_intervals
        }

        # Config
        config = (
            self._config_entry.options
            if self._config_entry and self._config_entry.options
            else self._config_entry.data if self._config_entry else {}
        )
        max_capacity_kwh = self._get_max_battery_capacity()
        charge_per_15min = config.get("home_charge_rate", 2.8) / 4.0

        # Tracking
        min_capacity = float("inf")
        energy_charged = 0.0

        # Aplikovat plán na timeline
        for i, point in enumerate(simulated_timeline):
            timestamp = datetime.fromisoformat(point["timestamp"])
            if timestamp.tzinfo is None:
                timestamp = dt_util.as_local(timestamp)

            battery_kwh = point["battery_capacity_kwh"]

            # Nabíjení v charging intervals
            if timestamp in charging_times:
                # Nabít k target (ale ne více než max capacity)
                needed = min(charge_per_15min, max_capacity_kwh - battery_kwh)
                point["grid_charge_kwh"] = needed
                point["battery_capacity_kwh"] = min(
                    battery_kwh + needed, max_capacity_kwh
                )
                point["mode"] = "Home UPS"
                point["reason"] = "balancing_charging"
                energy_charged += needed

            # Holding period - držet na 100%
            elif holding_start <= timestamp <= holding_end:
                # V UPS režimu baterie drží 100%, spotřeba jde ze sítě
                point["mode"] = "Home UPS"
                point["reason"] = "balancing_holding"
                # Baterie zůstává na target_soc (invertror drží)
                point["battery_capacity_kwh"] = target_soc_kwh

            # Track minimum
            if point["battery_capacity_kwh"] < min_capacity:
                min_capacity = point["battery_capacity_kwh"]

        # Final SOC
        final_soc_percent = 0.0
        if simulated_timeline:
            last_point = simulated_timeline[-1]
            final_soc_percent = (
                last_point["battery_capacity_kwh"] / max_capacity_kwh
            ) * 100

        return {
            "simulated_timeline": simulated_timeline,
            "energy_needed": energy_charged,
            "min_capacity": min_capacity,
            "final_soc_percent": final_soc_percent,
        }

    def _validate_simulation(
        self,
        timeline: List[Dict[str, Any]],
        minimal_capacity_kwh: float,
    ) -> List[Dict[str, Any]]:
        """
        Zkontrolovat všechna porušení kritických parametrů.

        Returns:
            List violations: [{type, time, capacity, limit, severity}, ...]
        """
        violations = []

        for point in timeline:
            battery_kwh = point.get("battery_capacity_kwh", 0)
            timestamp = point.get("timestamp")

            # KRITICKÉ: minimal capacity
            if battery_kwh < minimal_capacity_kwh:
                violations.append(
                    {
                        "type": "minimal_capacity_breach",
                        "time": timestamp,
                        "capacity": battery_kwh,
                        "limit": minimal_capacity_kwh,
                        "severity": "critical",
                    }
                )

        return violations

    def _calculate_simulation_costs(
        self,
        original_timeline: List[Dict[str, Any]],
        simulated_timeline: List[Dict[str, Any]],
        charging_intervals: List[Dict[str, Any]],
        holding_start: datetime,
        holding_end: datetime,
    ) -> Dict[str, float]:
        """
        Spočítat všechny náklady simulace.

        Returns:
            {
                "charging": náklady na nabití,
                "holding": náklady na držení (spotřeba ze sítě),
                "opportunity": ztráta úspor (co bychom ušetřili bez plánu),
                "total": součet všech nákladů
            }
        """
        charging_cost = 0.0
        holding_cost = 0.0
        opportunity_cost = 0.0

        # 1. Charging cost - sečíst ceny nabíjení
        for interval in charging_intervals:
            charging_cost += interval.get("price_czk", 0)

        # 2. Holding cost - spotřeba ze sítě během holding
        for i, point in enumerate(simulated_timeline):
            timestamp = datetime.fromisoformat(point["timestamp"])
            if timestamp.tzinfo is None:
                timestamp = dt_util.as_local(timestamp)

            if holding_start <= timestamp <= holding_end:
                # V UPS režimu: spotřeba jde ze sítě
                consumption_kwh = point.get("consumption_kwh", 0)
                spot_price = point.get("spot_price_czk", 0)
                holding_cost += consumption_kwh * spot_price

        # 3. Opportunity cost - co ZTRATÍME tím že držíme baterii
        for i, (orig, sim) in enumerate(zip(original_timeline, simulated_timeline)):
            orig_timestamp = datetime.fromisoformat(orig["timestamp"])
            if orig_timestamp.tzinfo is None:
                orig_timestamp = dt_util.as_local(orig_timestamp)

            # Pouze v období charging + holding
            if not (charging_intervals[0] if charging_intervals else None):
                continue

            plan_start = datetime.fromisoformat(charging_intervals[0]["timestamp"])
            if plan_start.tzinfo is None:
                plan_start = dt_util.as_local(plan_start)

            if not (plan_start <= orig_timestamp <= holding_end):
                continue

            # Původní plán: kolik bychom ušetřili vybitím baterie
            # (záporné battery_change = vybíjení)
            orig_discharge = 0.0
            if i > 0:
                orig_discharge = max(
                    0,
                    original_timeline[i - 1].get("battery_capacity_kwh", 0)
                    - orig.get("battery_capacity_kwh", 0),
                )

            sim_discharge = 0.0
            if i > 0:
                sim_discharge = max(
                    0,
                    simulated_timeline[i - 1].get("battery_capacity_kwh", 0)
                    - sim.get("battery_capacity_kwh", 0),
                )

            spot_price = orig.get("spot_price_czk", 0)

            # Rozdíl v úsporách
            orig_savings = orig_discharge * spot_price
            sim_savings = sim_discharge * spot_price
            opportunity_cost += max(0, orig_savings - sim_savings)

        total_cost = charging_cost + holding_cost + opportunity_cost

        return {
            "charging": round(charging_cost, 2),
            "holding": round(holding_cost, 2),
            "opportunity": round(opportunity_cost, 2),
            "total": round(total_cost, 2),
        }

    def _cleanup_old_simulations(self) -> None:
        """Smazat staré simulace (> 1h) a udržet max 10."""
        if not hasattr(self, "_simulations"):
            return

        now = dt_util.now()
        cutoff = now - timedelta(hours=1)

        # Smazat starší než 1h
        to_delete = [
            sim_id
            for sim_id, sim_data in self._simulations.items()
            if sim_data["created_at"] < cutoff
        ]

        for sim_id in to_delete:
            del self._simulations[sim_id]

        # Udržet max 10 (smazat nejstarší)
        if len(self._simulations) > 10:
            sorted_sims = sorted(
                self._simulations.items(), key=lambda x: x[1]["created_at"]
            )
            to_delete = [sim_id for sim_id, _ in sorted_sims[:-10]]
            for sim_id in to_delete:
                del self._simulations[sim_id]

    def _find_cheapest_charging_intervals(
        self,
        spot_prices: List[Dict[str, Any]],
        start_time: datetime,
        end_time: datetime,
        target_soc_kwh: float,
        current_soc_kwh: float,
        charge_per_15min: float,
        mode: str,
    ) -> List[Dict[str, Any]]:
        """
        Najde nejlevnější intervaly pro nabíjení v časovém okně.

        Returns:
            List intervalů: [{"timestamp": str, "grid_kwh": float, "price_czk": float}, ...]
        """
        # Kolik energie potřebujeme?
        energy_needed = max(0, target_soc_kwh - current_soc_kwh)
        intervals_needed = int(np.ceil(energy_needed / charge_per_15min))

        _LOGGER.info(
            f"[Planner] Energy needed: {energy_needed:.2f} kWh = {intervals_needed} intervals "
            f"(target={target_soc_kwh:.2f}, current={current_soc_kwh:.2f}, rate={charge_per_15min:.2f})"
        )
        _LOGGER.info(
            f"[Planner] Charging window: {start_time.strftime('%Y-%m-%d %H:%M')} → {end_time.strftime('%Y-%m-%d %H:%M')}"
        )
        _LOGGER.info(f"[Planner] Spot prices available: {len(spot_prices)} points")

        # Filtrovat intervaly v časovém okně
        available_intervals = []
        for price_point in spot_prices:
            try:
                timestamp = datetime.fromisoformat(price_point["time"])
                # Make timezone aware if needed
                if timestamp.tzinfo is None:
                    timestamp = dt_util.as_local(timestamp)
                if start_time <= timestamp < end_time:
                    available_intervals.append(
                        {
                            "timestamp": price_point["time"],
                            "price_czk": price_point["price"],
                        }
                    )
            except (ValueError, KeyError):
                continue

        if len(available_intervals) < intervals_needed:
            _LOGGER.warning(
                f"[Planner] Insufficient intervals: need {intervals_needed}, have {len(available_intervals)} "
                f"(window: {start_time.strftime('%H:%M')} → {end_time.strftime('%H:%M')}, mode={mode})"
            )
            # Both economic and forced modes use what's available
            # Simulation will report status="partial" if target not reached
            # Balancing will decide: wait for better prices or accept partial
            _LOGGER.info(
                f"[Planner] {mode.upper()} mode: using {len(available_intervals)} available intervals (partial result expected)"
            )
            intervals_needed = len(available_intervals)

        # Seřadit podle ceny (nejlevnější první)
        available_intervals.sort(key=lambda x: x["price_czk"])

        # Vybrat N nejlevnějších
        selected = available_intervals[:intervals_needed]

        # Přidat grid_kwh
        result = []
        remaining_energy = energy_needed
        for interval in selected:
            grid_kwh = min(charge_per_15min, remaining_energy)
            result.append(
                {
                    "timestamp": interval["timestamp"],
                    "grid_kwh": round(grid_kwh, 3),
                    "price_czk": round(interval["price_czk"], 2),
                }
            )
            remaining_energy -= grid_kwh

        return result

    def _calculate_charging_costs(
        self,
        charging_intervals: List[Dict[str, Any]],
        holding_start: datetime,
        holding_end: datetime,
        spot_prices: List[Dict[str, Any]],
    ) -> Dict[str, float]:
        """
        Spočítá náklady na charging + holding fázi.

        Returns:
            {"charging_cost_czk": float, "holding_cost_czk": float, "total_cost_czk": float}
        """
        # Charging cost
        charging_cost = sum(
            iv["grid_kwh"] * iv["price_czk"] for iv in charging_intervals
        )

        # Holding cost - spotřeba ze sítě během holding (pokud ne solar)
        # Pro zjednodušení: průměrná spotřeba * počet hodin * průměrná cena
        # TODO: Refine s real forecast data
        holding_hours = (holding_end - holding_start).total_seconds() / 3600
        avg_consumption_kw = 0.15  # Průměrná spotřeba během noci

        # Najít průměrnou cenu během holding
        holding_prices = []
        for price_point in spot_prices:
            try:
                timestamp = datetime.fromisoformat(price_point["time"])
                # Make timezone aware if needed
                if timestamp.tzinfo is None:
                    timestamp = dt_util.as_local(timestamp)
                if holding_start <= timestamp <= holding_end:
                    holding_prices.append(price_point["price"])
            except (ValueError, KeyError):
                continue

        avg_holding_price = np.mean(holding_prices) if holding_prices else 4.0
        holding_cost = avg_consumption_kw * holding_hours * avg_holding_price

        return {
            "charging_cost_czk": round(charging_cost, 2),
            "holding_cost_czk": round(holding_cost, 2),
            "total_cost_czk": round(charging_cost + holding_cost, 2),
        }

    def _predict_soc_at_time(
        self, target_time: datetime, active_plan: Optional[Dict[str, Any]] = None
    ) -> float:
        """
        Predikuje SOC v daném čase (s nebo bez aktivního plánu).

        Args:
            target_time: Čas pro predikci
            active_plan: Aktivní charging plan (nebo None pro normální forecast)

        Returns:
            Predikovaný SOC v % (0-100)
        """
        # Pokud nemáme timeline, použij aktuální SOC
        if not self._timeline_data:
            current_capacity = self._get_current_battery_capacity()
            max_capacity = self._get_max_battery_capacity()
            if current_capacity and max_capacity:
                return (current_capacity / max_capacity) * 100.0
            return 50.0  # Fallback

        # Najít bod v timeline nejblíže target_time
        closest_point = None
        min_diff = float("inf")

        for point in self._timeline_data:
            try:
                timestamp = datetime.fromisoformat(point["timestamp"])
                diff = abs((timestamp - target_time).total_seconds())
                if diff < min_diff:
                    min_diff = diff
                    closest_point = point
            except (ValueError, KeyError):
                continue

        if closest_point:
            max_capacity = self._get_max_battery_capacity()
            capacity_kwh = closest_point.get("battery_capacity_kwh", 0)
            return (capacity_kwh / max_capacity) * 100.0

        return 50.0  # Fallback


class OigCloudGridChargingPlanSensor(CoordinatorEntity, SensorEntity):
    """Sensor pro plánované nabíjení ze sítě - odvozený z battery_forecast."""

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        device_info: Dict[str, Any],
    ) -> None:
        """Initialize sensor."""
        super().__init__(coordinator)
        self._sensor_type = sensor_type
        self._attr_device_info = device_info

        # Načteme sensor config
        from .sensor_types import SENSOR_TYPES

        self._config = SENSOR_TYPES.get(sensor_type, {})

        # Entity info
        self._box_id = (
            list(coordinator.data.keys())[0] if coordinator.data else "unknown"
        )
        # Unique ID má formát oig_cloud_{boxId}_{sensor} pro konzistenci
        self._attr_unique_id = f"oig_cloud_{self._box_id}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"

        # Načíst název ze sensor types
        name_cs = self._config.get("name_cs")
        name_en = self._config.get("name")
        self._attr_name = name_cs or name_en or sensor_type

        # Nastavit vlastnosti senzoru
        self._attr_native_unit_of_measurement = self._config.get("unit")
        self._attr_icon = self._config.get("icon", "mdi:battery-charging")

        # Správné typování pro device_class a entity_category
        device_class = self._config.get("device_class")
        if device_class:
            self._attr_device_class = SensorDeviceClass(device_class)

        entity_category = self._config.get("entity_category")
        if entity_category:
            self._attr_entity_category = EntityCategory(entity_category)

        state_class = self._config.get("state_class")
        if state_class:
            self._attr_state_class = SensorStateClass(state_class)

        # Cache pro offsety (aby se nelogoval pokaždé)
        self._last_offset_start = None
        self._last_offset_end = None

        # Cache pro UPS bloky z precomputed storage
        self._cached_ups_blocks: List[Dict[str, Any]] = []

    async def async_added_to_hass(self) -> None:
        """When entity is added to hass."""
        await super().async_added_to_hass()
        # Load initial data
        await self._load_ups_blocks()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle updated data from coordinator."""
        # Schedule async load of UPS blocks
        if self.hass:
            self.hass.async_create_task(self._load_ups_blocks())
        super()._handle_coordinator_update()

    async def _load_ups_blocks(self) -> None:
        """Load UPS blocks from precomputed storage (async)."""
        plan_key = self._get_active_plan_key()
        self._cached_ups_blocks = await self._get_home_ups_blocks_from_detail_tabs(
            plan=plan_key
        )
        _LOGGER.debug(
            f"[GridChargingPlan] Loaded {len(self._cached_ups_blocks)} UPS blocks into cache"
        )
        # Trigger state update after loading cache
        self.async_write_ha_state()

    async def _get_home_ups_blocks_from_detail_tabs(
        self, plan: str = "hybrid"
    ) -> List[Dict[str, Any]]:
        """
        Načte HOME UPS bloky z precomputed storage.
        Vrací pouze AKTIVNÍ a BUDOUCÍ bloky (ne completed z minulosti).
        """
        try:
            # 1. Najít BatteryForecastSensor
            if not self.hass:
                return []

            battery_sensor = None
            component = self.hass.data.get("entity_components", {}).get("sensor")
            if component:
                for entity in component.entities:
                    if (
                        hasattr(entity, "_precomputed_store")
                        and self._box_id in entity.entity_id
                        and "battery_forecast" in entity.entity_id
                    ):
                        battery_sensor = entity
                        break

            if not battery_sensor:
                _LOGGER.warning("[GridChargingPlan] BatteryForecastSensor not found")
                return []

            # 2. Načíst precomputed data ASYNC
            precomputed = await battery_sensor._precomputed_store.async_load()

            if not precomputed:
                _LOGGER.debug("[GridChargingPlan] No precomputed data yet")
                return []

            # 3. Získat today + tomorrow mode_blocks
            plan_key = "autonomy" if plan.lower() in ("autonomy", "auto") else "hybrid"
            detail_key = (
                "detail_tabs_autonomy" if plan_key == "autonomy" else "detail_tabs"
            )
            detail_tabs = precomputed.get(detail_key, {})
            if not detail_tabs:
                _LOGGER.debug(
                    "[GridChargingPlan] No %s detail tabs data available", plan_key
                )
                return []

            # 4. Filtrovat HOME UPS bloky - pouze active + planned (ne completed)
            now = dt_util.now()
            current_time = now.strftime("%H:%M")

            ups_blocks = []

            # Process TODAY blocks
            today = detail_tabs.get("today", {})
            today_blocks = today.get("mode_blocks", [])

            for block in today_blocks:
                # Zkontrolovat zda je to HOME UPS blok
                mode_hist = block.get("mode_historical", "")
                mode_plan = block.get("mode_planned", "")
                if "HOME UPS" not in mode_hist and "HOME UPS" not in mode_plan:
                    continue

                # Filtrovat podle statusu a času
                status = block.get("status", "")
                end_time = block.get("end_time", "")

                # Přeskočit completed bloky z minulosti
                if status == "completed" and end_time < current_time:
                    continue

                # Přidat aktivní nebo budoucí blok
                ups_blocks.append(
                    {
                        "time_from": block.get("start_time", ""),
                        "time_to": end_time,
                        "day": "today",
                        "mode": "Home UPS",
                        "status": status,
                        "grid_charge_kwh": block.get("grid_import_total_kwh", 0.0),
                        "cost_czk": block.get(
                            (
                                "cost_historical"
                                if status == "completed"
                                else "cost_planned"
                            ),
                            0.0,
                        ),
                        "battery_start_kwh": block.get("battery_soc_start", 0.0),
                        "battery_end_kwh": block.get("battery_soc_end", 0.0),
                        "interval_count": block.get("interval_count", 0),
                        "duration_hours": block.get("duration_hours", 0.0),
                    }
                )

            # Process TOMORROW blocks (všechny jsou planned)
            tomorrow = detail_tabs.get("tomorrow", {})
            tomorrow_blocks = tomorrow.get("mode_blocks", [])

            for block in tomorrow_blocks:
                # Zkontrolovat zda je to HOME UPS blok
                mode_plan = block.get("mode_planned", "")
                if "HOME UPS" not in mode_plan:
                    continue

                # Přidat zítřejší plánovaný blok
                ups_blocks.append(
                    {
                        "time_from": block.get("start_time", ""),
                        "time_to": block.get("end_time", ""),
                        "day": "tomorrow",
                        "mode": "Home UPS",
                        "status": "planned",  # Všechny zítřejší bloky jsou planned
                        "grid_charge_kwh": block.get("grid_import_total_kwh", 0.0),
                        "cost_czk": block.get("cost_planned", 0.0),
                        "battery_start_kwh": block.get("battery_soc_start", 0.0),
                        "battery_end_kwh": block.get("battery_soc_end", 0.0),
                        "interval_count": block.get("interval_count", 0),
                        "duration_hours": block.get("duration_hours", 0.0),
                    }
                )

            _LOGGER.debug(
                f"[GridChargingPlan] Found {len(ups_blocks)} active/future UPS blocks (today + tomorrow)"
            )
            return ups_blocks

        except Exception as e:
            _LOGGER.error(f"[GridChargingPlan] Error: {e}", exc_info=True)
            return []

    def _get_active_plan_key(self) -> str:
        """Return plan currently controlling automation (autonomy/hybrid)."""
        config_entry = getattr(self.coordinator, "config_entry", None)
        if not config_entry:
            return "hybrid"
        if config_entry.options.get("battery_planner_mode") == "autonomy_preview":
            return "autonomy"
        plan = config_entry.options.get(CONF_AUTO_MODE_PLAN, "autonomy")
        if plan not in ("autonomy", "hybrid"):
            plan = "autonomy"
        if (
            config_entry.options.get(CONF_AUTO_MODE_SWITCH, False)
            and plan == "autonomy"
        ):
            return "autonomy"
        return "hybrid"

    def _calculate_charging_intervals(
        self,
    ) -> tuple[List[Dict[str, Any]], float, float]:
        """Vypočítá intervaly nabíjení ze sítě z CACHED detail_tabs dat."""
        # Použít cache místo async volání
        charging_intervals = self._cached_ups_blocks

        if not charging_intervals:
            return [], 0.0, 0.0

        total_energy = sum(block["grid_charge_kwh"] for block in charging_intervals)
        total_cost = sum(block["cost_czk"] for block in charging_intervals)

        return charging_intervals, total_energy, total_cost

    def _get_dynamic_offset(self, from_mode: str, to_mode: str) -> float:
        """Získá dynamický offset z ModeTransitionTracker.

        Args:
            from_mode: Zdrojový režim (např. "Home 1")
            to_mode: Cílový režim (např. "Home UPS")

        Returns:
            Offset v sekundách (fallback 300s = 5 minut pokud tracker není dostupný)
        """
        try:
            # OPRAVA: Použít self.hass z CoordinatorEntity
            if not self.hass:
                _LOGGER.warning(
                    f"[GridChargingPlan] hass not available for offset {from_mode}→{to_mode}, using fallback 300s"
                )
                return 300.0  # Fallback 5 minut

            # Získat config_entry přes coordinator
            config_entry = self.coordinator.config_entry
            if not config_entry:
                _LOGGER.warning(
                    f"[GridChargingPlan] No config_entry for offset {from_mode}→{to_mode}, using fallback 300s"
                )
                return 300.0

            entry_data = self.hass.data.get(DOMAIN, {}).get(config_entry.entry_id)
            if not entry_data:
                _LOGGER.warning(
                    f"[GridChargingPlan] No entry data for offset {from_mode}→{to_mode}, using fallback 300s"
                )
                return 300.0

            service_shield = entry_data.get("service_shield")
            if not service_shield or not hasattr(service_shield, "mode_tracker"):
                _LOGGER.warning(
                    f"[GridChargingPlan] ServiceShield or mode_tracker not available for offset {from_mode}→{to_mode}, using fallback 300s"
                )
                return 300.0

            mode_tracker = service_shield.mode_tracker
            if not mode_tracker:
                _LOGGER.warning(
                    f"[GridChargingPlan] Mode tracker not initialized for offset {from_mode}→{to_mode}, using fallback 300s"
                )
                return 300.0

            # Získat doporučený offset
            offset_seconds = mode_tracker.get_offset_for_scenario(from_mode, to_mode)

            _LOGGER.info(
                f"[GridChargingPlan] ✅ Dynamic offset {from_mode}→{to_mode}: {offset_seconds}s (from tracker)"
            )

            return offset_seconds

        except Exception as e:
            _LOGGER.warning(
                f"[GridChargingPlan] ❌ Error getting offset {from_mode}→{to_mode}, using fallback 300s: {e}",
                exc_info=True,
            )
            return 300.0  # Fallback 5 minut

    @property
    def native_value(self) -> str:
        """Vrátí ON pokud právě běží nebo brzy začne HOME UPS (s offsetem)."""
        charging_intervals, _, _ = self._calculate_charging_intervals()

        if not charging_intervals:
            return "off"

        # Získat aktuální čas
        now = dt_util.now()
        now.time()

        # Získat aktuální režim z coordinator
        current_mode = self._get_current_mode()

        # Seřadit bloky chronologicky (today před tomorrow)
        sorted_blocks = sorted(
            charging_intervals,
            key=lambda b: (0 if b.get("day") == "today" else 1, b.get("time_from", "")),
        )

        # Projít všechny UPS bloky a zkontrolovat s offsety
        for i, block in enumerate(sorted_blocks):
            start_time_str = block.get("time_from", "00:00")
            end_time_str = block.get("time_to", "23:59")
            day = block.get("day", "today")

            # Parse časy
            try:
                start_hour, start_min = map(int, start_time_str.split(":"))
                end_hour, end_min = map(int, end_time_str.split(":"))

                start_time = now.replace(
                    hour=start_hour, minute=start_min, second=0, microsecond=0
                )
                end_time = now.replace(
                    hour=end_hour, minute=end_min, second=0, microsecond=0
                )

                # Pokud je blok zítra, přidat 1 den
                if day == "tomorrow":
                    start_time = start_time + timedelta(days=1)
                    end_time = end_time + timedelta(days=1)

                # Pokud end_time <= start_time, je to přes půlnoc
                if end_time <= start_time:
                    end_time = end_time + timedelta(days=1)

            except (ValueError, AttributeError):
                _LOGGER.warning(
                    f"[GridChargingPlan] Invalid time format: {start_time_str} - {end_time_str}"
                )
                continue

            # Získat offset pro zapnutí (current_mode → HOME UPS)
            offset_on = self._get_dynamic_offset(current_mode, "HOME UPS")
            start_time_with_offset = start_time - timedelta(seconds=offset_on)

            # Zkontrolovat zda je další blok taky HOME UPS (continuity)
            next_block_is_ups = False
            if i + 1 < len(sorted_blocks):
                next_block = sorted_blocks[i + 1]
                # Pokud další blok začíná hned po tomto (± 1 minuta), je to continuity
                next_start = next_block.get("time_from", "")
                if (
                    next_start == end_time_str
                    or abs(
                        (
                            self._parse_time_to_datetime(
                                next_start, next_block.get("day")
                            )
                            - end_time
                        ).total_seconds()
                    )
                    <= 60
                ):
                    next_block_is_ups = True

            # Získat offset pro vypnutí
            if next_block_is_ups:
                # Další blok je taky UPS, takže NEVYPíNÁME (offset = 0)
                offset_off = 0
            else:
                # Najít následující režim (kam jdeme po UPS)
                next_mode = self._get_next_mode_after_ups(block, sorted_blocks, i)
                offset_off = self._get_dynamic_offset("HOME UPS", next_mode)

            end_time_with_offset = end_time - timedelta(seconds=offset_off)

            # Zkontrolovat zda jsme v časovém okně s offsety
            if start_time_with_offset <= now <= end_time_with_offset:
                _LOGGER.debug(
                    f"[GridChargingPlan] Sensor ON: now={now.strftime('%H:%M:%S')}, "
                    f"block={start_time_str}-{end_time_str}, "
                    f"offset_on={offset_on}s, offset_off={offset_off}s"
                )
                return "on"

        return "off"

    def _get_current_mode(self) -> str:
        """Získá aktuální režim z coordinator data."""
        if not self.coordinator or not self.coordinator.data:
            return "HOME I"  # Fallback

        box_data = self.coordinator.data.get(self._box_id, {})
        current_mode = box_data.get("current_mode", "HOME I")
        return current_mode

    def _get_next_mode_after_ups(
        self, current_block: Dict, all_blocks: List[Dict], current_idx: int
    ) -> str:
        """Získá režim následující po UPS bloku."""
        # Zkusit najít další non-UPS blok v precomputed data
        if current_idx + 1 < len(all_blocks):
            next_block = all_blocks[current_idx + 1]
            next_mode = next_block.get("mode_planned", "HOME I")
            if "HOME UPS" not in next_mode:
                return next_mode

        # Fallback na HOME I (nejčastější режim po nabíjení)
        return "HOME I"

    def _parse_time_to_datetime(self, time_str: str, day: str) -> datetime:
        """Parse time string to datetime."""
        now = dt_util.now()
        try:
            hour, minute = map(int, time_str.split(":"))
            dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if day == "tomorrow":
                dt = dt + timedelta(days=1)
            return dt
        except (ValueError, AttributeError):
            return now

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Vrátí atributy senzoru - nabíjecí bloky z detail_tabs API."""
        # Vypočítat data on-demand (bez cache)
        charging_intervals, total_energy, total_cost = (
            self._calculate_charging_intervals()
        )

        if not charging_intervals:
            return {
                "charging_blocks": [],
                "total_energy_kwh": 0.0,
                "total_cost_czk": 0.0,
                "next_charging_time_range": None,
                "next_charging_duration": None,
                "is_charging_planned": False,
            }

        # Najít další budoucí nabíjecí blok (status=planned)
        next_charging_block = None
        for interval in charging_intervals:
            if interval.get("status") == "planned":
                next_charging_block = interval
                break

        next_charging_time_range = None
        next_charging_duration = None
        if next_charging_block:
            day_label = (
                "zítra" if next_charging_block.get("day") == "tomorrow" else "dnes"
            )
            next_charging_time_range = f"{day_label} {next_charging_block['time_from']} - {next_charging_block['time_to']}"
            duration_hours = next_charging_block.get("duration_hours", 0)
            duration_minutes = int(duration_hours * 60)
            next_charging_duration = f"{duration_minutes} min"

        # Přejmenovat charging_intervals na charging_blocks pro konzistenci s GUI
        charging_blocks = []
        for interval in charging_intervals:
            # Přemapovat klíče pro zpětnou kompatibilitu
            block = {
                "time_from": interval["time_from"],
                "time_to": interval["time_to"],
                "day": interval["day"],  # Přidat den (today/tomorrow)
                "mode": interval["mode"],
                "status": interval["status"],
                "grid_charge_kwh": interval["grid_charge_kwh"],
                "total_cost_czk": interval["cost_czk"],
                "battery_start_kwh": interval["battery_start_kwh"],
                "battery_end_kwh": interval["battery_end_kwh"],
                "interval_count": interval["interval_count"],
                "is_charging_battery": True,  # Všechny bloky jsou nabíjecí (filtrováno v _calculate_charging_intervals)
                # Průměrná cena
                "avg_spot_price_czk": (
                    round(interval["cost_czk"] / interval["grid_charge_kwh"], 2)
                    if interval["grid_charge_kwh"] > 0
                    else 0.0
                ),
            }
            charging_blocks.append(block)

        return {
            "charging_blocks": charging_blocks,
            "total_energy_kwh": round(total_energy, 2),
            "total_cost_czk": round(total_cost, 2),
            "next_charging_time_range": next_charging_time_range,
            "next_charging_duration": next_charging_duration,
            "is_charging_planned": len(charging_blocks) > 0,
        }


# =============================================================================
# BATTERY EFFICIENCY SENSOR
# =============================================================================


class OigCloudBatteryEfficiencySensor(RestoreEntity, CoordinatorEntity, SensorEntity):
    """
    Battery round-trip efficiency calculator.

    Calculates battery efficiency using existing monthly sensors:
    - sensor.computed_batt_charge_energy_month
    - sensor.computed_batt_discharge_energy_month
    - sensor.remaining_usable_capacity

    State = Last COMPLETE month efficiency (%)
    Attributes = Current month (partial) efficiency and metrics

    Updates:
    - Daily at 23:55: Update current month partial data
    - Monthly on 1st at 00:10: Calculate last month and save to state

    Formula:
    efficiency = (effective_discharge / charge) * 100
    where: effective_discharge = discharge - (battery_end - battery_start)

    NOTE: RestoreEntity není třeba - všechna data jsou v extra_state_attributes
    které HA automaticky ukládá.
    """

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        """Initialize the battery efficiency sensor."""
        CoordinatorEntity.__init__(self, coordinator)

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        # Získání box_id z coordinator.data
        if coordinator and coordinator.data and isinstance(coordinator.data, dict):
            self._box_id = list(coordinator.data.keys())[0]
        else:
            self._box_id = "unknown"

        # Set device info early - type: ignore because DeviceInfo is a TypedDict
        self._attr_device_info = device_info  # type: ignore[assignment]

        # Entity setup
        self._attr_unique_id = f"oig_cloud_{self._box_id}_battery_efficiency"
        self.entity_id = f"sensor.oig_{self._box_id}_battery_efficiency"
        self._attr_icon = "mdi:battery-sync"
        self._attr_native_unit_of_measurement = "%"
        self._attr_device_class = None
        self._attr_state_class = SensorStateClass.MEASUREMENT

        # Načíst název ze sensor types
        from .sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or "Efektivita baterie (měsíc)"

        # State tracking
        self._efficiency_last_month: Optional[float] = None  # State = minulý měsíc
        self._battery_kwh_month_start: Optional[float] = None
        self._current_month_partial: Dict[str, Any] = {}
        self._last_month_data: Dict[str, Any] = {}  # Kompletní data minulého měsíce
        self._loading_history: bool = False  # Flag aby se načítání neopakovalo

        # Initialize extra state attributes
        self._attr_extra_state_attributes = {}

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - restore state from attributes."""
        await CoordinatorEntity.async_added_to_hass(self)
        self._hass = self.hass

        # Try to restore from last state (HA automatically stores extra_state_attributes)
        last_state = await self.async_get_last_state()
        if last_state:
            # Restore efficiency minulého měsíce (state)
            try:
                if last_state.state not in ["unknown", "unavailable"]:
                    self._efficiency_last_month = float(last_state.state)
            except (ValueError, TypeError):
                self._efficiency_last_month = None

            # Restore tracking data from attributes
            if last_state.attributes:
                self._battery_kwh_month_start = last_state.attributes.get(
                    "_battery_kwh_month_start"
                )
                self._current_month_partial = last_state.attributes.get(
                    "_current_month_partial", {}
                )
                self._last_month_data = last_state.attributes.get(
                    "_last_month_data", {}
                )
                _LOGGER.info(
                    f"🔋 Restored battery efficiency state: "
                    f"last_month={self._efficiency_last_month}%, "
                    f"month_start={self._battery_kwh_month_start} kWh"
                )

        # Initialize if None
        # Pro první deployment: inicializuj i uprostřed měsíce (data nebudou přesná)
        # Po 1. listopadu to můžeme změnit aby čekalo na začátek měsíce
        now = datetime.now()
        if self._battery_kwh_month_start is None:
            battery_now = self._get_sensor("remaining_usable_capacity") or 0
            self._battery_kwh_month_start = battery_now

            if now.day <= 2:
                _LOGGER.info(
                    f"🔋 Battery efficiency sensor initialized (beginning of month): "
                    f"month_start={battery_now:.2f} kWh"
                )
            else:
                _LOGGER.warning(
                    f"🔋 Battery efficiency sensor initialized mid-month (day {now.day}): "
                    f"month_start={battery_now:.2f} kWh. "
                    f"Current month data will be PARTIAL and may be inaccurate. "
                    f"Full accuracy starts from 1st November."
                )

        # Schedule monthly calculation on 1st day at 00:10
        from homeassistant.helpers.event import async_track_utc_time_change

        # Monthly: 1. den v měsíci v 00:10 UTC
        async_track_utc_time_change(
            self.hass, self._monthly_calculation, hour=0, minute=10, second=0
        )

        # Daily: každý den v 23:55 UTC
        async_track_utc_time_change(
            self.hass, self._daily_update, hour=23, minute=55, second=0
        )

        # Initial update
        await self._daily_update()

    def _handle_coordinator_update(self) -> None:
        """Handle coordinator update - refresh current month data."""
        # Aktualizovat atributy při každém coordinator update (každých 30s)
        # Ale nelogovat a nedělat full daily update - jen refresh dat
        if self._battery_kwh_month_start is not None and self._hass:
            charge_month_wh = self._get_sensor("computed_batt_charge_energy_month") or 0
            discharge_month_wh = (
                self._get_sensor("computed_batt_discharge_energy_month") or 0
            )
            battery_now = self._get_sensor("remaining_usable_capacity") or 0

            charge_month = charge_month_wh / 1000
            discharge_month = discharge_month_wh / 1000

            # Update partial data
            self._current_month_partial = {
                "charge": round(charge_month, 2),
                "discharge": round(discharge_month, 2),
                "battery_start": round(self._battery_kwh_month_start, 2),
                "battery_end": round(battery_now, 2),
                "timestamp": datetime.now().isoformat(),
            }

            # Vypočítat průběžnou efficiency
            if charge_month >= 1.0 and discharge_month >= 1.0:
                delta = battery_now - self._battery_kwh_month_start
                effective_discharge = discharge_month - delta

                if (
                    effective_discharge > 0
                    and effective_discharge <= charge_month * 1.2
                ):
                    efficiency_current = (effective_discharge / charge_month) * 100
                    self._current_month_partial["efficiency"] = round(
                        efficiency_current, 1
                    )
                    self._current_month_partial["delta"] = round(delta, 2)
                    self._current_month_partial["effective_discharge"] = round(
                        effective_discharge, 2
                    )

            # Update attributes
            self._update_extra_state_attributes()

            # Update state value - fallback to current month if no last month
            if self._efficiency_last_month is not None:
                self._attr_native_value = self._efficiency_last_month
            else:
                self._attr_native_value = self._current_month_partial.get("efficiency")

        super()._handle_coordinator_update()

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA."""
        await CoordinatorEntity.async_will_remove_from_hass(self)

    async def _monthly_calculation(self, now: datetime) -> None:
        """
        1. den měsíce - spočítat efficiency MINULÉHO měsíce.

        Vezme data uložená včera večer v _daily_update a uloží jako state.
        """
        # Kontrola zda je to opravdu 1. den
        if now.day != 1:
            return

        _LOGGER.info("🔋 Monthly calculation: Computing last month efficiency")

        # Použít data z včerejška (uložená v _daily_update)
        charge_last_month = self._current_month_partial.get("charge", 0)
        discharge_last_month = self._current_month_partial.get("discharge", 0)
        battery_month_end = self._current_month_partial.get("battery_end", 0)
        battery_month_start = self._current_month_partial.get("battery_start", 0)

        # Snížený limit z 20 na 5 kWh - umožní výpočet i pro částečná data
        if charge_last_month < 5.0 or discharge_last_month < 5.0:
            _LOGGER.warning(
                f"🔋 Insufficient data for last month: "
                f"charge={charge_last_month:.2f}, discharge={discharge_last_month:.2f}"
            )
            self._efficiency_last_month = None
        else:
            # Výpočet
            delta = battery_month_end - battery_month_start
            effective_discharge = discharge_last_month - delta

            if (
                effective_discharge > 0
                and effective_discharge <= charge_last_month * 1.1
            ):
                efficiency = (effective_discharge / charge_last_month) * 100
                losses_kwh = charge_last_month - effective_discharge
                losses_pct = (losses_kwh / charge_last_month) * 100

                self._efficiency_last_month = round(efficiency, 1)

                # Uložit kompletní data minulého měsíce
                self._last_month_data = {
                    "efficiency_pct": round(efficiency, 1),
                    "losses_kwh": round(losses_kwh, 2),
                    "losses_pct": round(losses_pct, 1),
                    "charge_kwh": round(charge_last_month, 2),
                    "discharge_kwh": round(discharge_last_month, 2),
                    "effective_discharge_kwh": round(effective_discharge, 2),
                    "delta_kwh": round(delta, 2),
                    "battery_start_kwh": round(battery_month_start, 2),
                    "battery_end_kwh": round(battery_month_end, 2),
                }

                _LOGGER.info(
                    f"🔋 Last month: efficiency={self._efficiency_last_month}%, "
                    f"losses={losses_kwh:.2f} kWh ({losses_pct:.1f}%), "
                    f"charge={charge_last_month:.2f}, discharge={discharge_last_month:.2f}, delta={delta:.2f}"
                )
            else:
                _LOGGER.warning(
                    f"🔋 Invalid effective discharge: {effective_discharge:.2f} kWh"
                )
                self._efficiency_last_month = None

        # Reset pro nový měsíc
        battery_now = self._get_sensor("remaining_usable_capacity") or 0
        self._battery_kwh_month_start = battery_now
        self._current_month_partial = {}

        _LOGGER.info(f"🔋 New month started with {battery_now:.2f} kWh")

        # Update state
        self._attr_native_value = self._efficiency_last_month
        self.async_write_ha_state()

    async def _daily_update(self, now: Optional[datetime] = None) -> None:
        """
        Denně v 23:55 - aktualizovat průběžná data TOHOTO měsíce.
        """
        _LOGGER.debug("🔋 Daily update: Computing current month (partial) efficiency")

        # Pokud nemáme month_start, nemůžeme počítat efektivitu
        if self._battery_kwh_month_start is None:
            _LOGGER.warning(
                "🔋 Cannot compute efficiency - battery_kwh_month_start not initialized. "
                "Waiting for next month to start."
            )
            self._attr_native_value = self._efficiency_last_month
            self._update_extra_state_attributes()
            self.async_write_ha_state()
            return

        # Číst aktuální měsíční data
        charge_month_wh = self._get_sensor("computed_batt_charge_energy_month") or 0
        discharge_month_wh = (
            self._get_sensor("computed_batt_discharge_energy_month") or 0
        )
        battery_now = self._get_sensor("remaining_usable_capacity") or 0

        charge_month = charge_month_wh / 1000
        discharge_month = discharge_month_wh / 1000

        # Uložit snapshot pro monthly calculation
        self._current_month_partial = {
            "charge": round(charge_month, 2),
            "discharge": round(discharge_month, 2),
            "battery_start": round(self._battery_kwh_month_start, 2),
            "battery_end": round(battery_now, 2),
            "timestamp": datetime.now().isoformat(),
        }

        # Vypočítat průběžnou efficiency (jen pro atributy)
        if charge_month >= 1.0 and discharge_month >= 1.0:
            delta = battery_now - self._battery_kwh_month_start
            effective_discharge = discharge_month - delta

            if effective_discharge > 0 and effective_discharge <= charge_month * 1.2:
                efficiency_current = (effective_discharge / charge_month) * 100
                self._current_month_partial["efficiency"] = round(efficiency_current, 1)
                self._current_month_partial["delta"] = round(delta, 2)
                self._current_month_partial["effective_discharge"] = round(
                    effective_discharge, 2
                )

        # Update extra state attributes
        self._update_extra_state_attributes()

        # State: Zobraz minulý měsíc pokud máme, jinak aktuální měsíc (partial)
        if self._efficiency_last_month is not None:
            self._attr_native_value = self._efficiency_last_month
        else:
            # Fallback na current month pokud nemáme last month
            self._attr_native_value = self._current_month_partial.get("efficiency")

        self.async_write_ha_state()

    def _update_extra_state_attributes(self) -> None:
        """Update extra state attributes with current data."""
        now = datetime.now()

        # Pokud nemáme kompletní data za minulý měsíc (chybí kWh hodnoty), zkusit načíst z historie
        # Kontrolujeme charge_kwh protože to je klíčová hodnota pro zobrazení v dashboardu
        # A ZÁROVEŇ kontrolujeme flag aby se načítání neopakovalo
        if (
            not self._last_month_data or not self._last_month_data.get("charge_kwh")
        ) and not self._loading_history:
            # Nastavit flag aby se loading neopakoval
            self._loading_history = True
            # Asynchronně spustit načtení (ale nevyčkávat na výsledek)
            self.hass.async_create_task(self._try_load_last_month_from_history())

        # Průběžná data tohoto měsíce
        current_efficiency = self._current_month_partial.get("efficiency")
        current_charge = self._current_month_partial.get("charge")
        current_discharge = self._current_month_partial.get("discharge")
        current_delta = self._current_month_partial.get("delta")
        current_effective_discharge = self._current_month_partial.get(
            "effective_discharge"
        )

        # Výpočet ztrát pro aktuální měsíc
        current_losses_kwh = None
        current_losses_pct = None
        if current_charge and current_effective_discharge:
            current_losses_kwh = round(current_charge - current_effective_discharge, 2)
            current_losses_pct = round((current_losses_kwh / current_charge) * 100, 1)

        # Výpočet ztrát pro minulý měsíc (z uložených dat nebo z efficiency)
        last_month_losses_kwh = self._last_month_data.get("losses_kwh")
        last_month_losses_pct = self._last_month_data.get("losses_pct")
        if last_month_losses_pct is None and self._efficiency_last_month is not None:
            # Fallback pokud nemáme uložená data (starší verze)
            last_month_losses_pct = round(100 - self._efficiency_last_month, 1)

        # Status podle stavu inicializace
        if self._battery_kwh_month_start is None:
            current_month_status = (
                f"not initialized (day {now.day}) - waiting for next month"
            )
        else:
            current_month_status = f"partial ({now.day} days)"

        self._attr_extra_state_attributes = {
            # Minulý měsíc (kompletní) - to je STATE
            "efficiency_last_month_pct": self._efficiency_last_month,
            "losses_last_month_kwh": last_month_losses_kwh,
            "losses_last_month_pct": last_month_losses_pct,
            "last_month_charge_kwh": self._last_month_data.get("charge_kwh"),
            "last_month_discharge_kwh": self._last_month_data.get("discharge_kwh"),
            "last_month_status": "complete",
            # Tento měsíc (průběžné)
            "efficiency_current_month_pct": current_efficiency,
            "losses_current_month_kwh": current_losses_kwh,
            "losses_current_month_pct": current_losses_pct,
            "current_month_charge_kwh": current_charge,
            "current_month_discharge_kwh": current_discharge,
            "current_month_delta_kwh": current_delta,
            "current_month_days": now.day,
            "current_month_status": current_month_status,
            # Battery tracking
            "battery_kwh_month_start": (
                round(self._battery_kwh_month_start, 2)
                if self._battery_kwh_month_start
                else None
            ),
            "battery_kwh_now": round(
                self._get_sensor("remaining_usable_capacity") or 0, 2
            ),
            # Metadata
            "last_daily_update": self._current_month_partial.get("timestamp"),
            "next_monthly_calculation": "1st day of next month at 00:10",
            "calculation_method": "Energy balance with SoC correction",
            "data_source": "computed_batt_charge/discharge_energy_month",
            "formula": "(discharge - ΔE_battery) / charge * 100",
            "formula_losses": "charge - (discharge - ΔE_battery)",
            # Internal (for restore)
            "_battery_kwh_month_start": self._battery_kwh_month_start,
            "_current_month_partial": self._current_month_partial,
            "_last_month_data": self._last_month_data,
        }

    async def _try_load_last_month_from_history(self) -> None:
        """
        Pokus o načtení dat za minulý měsíc z historie HA.
        Použije monthly sensors k vypočtení efficiency za minulý měsíc.
        """
        try:
            from homeassistant.components import recorder
            from homeassistant.components.recorder.history import get_significant_states
        except ImportError:
            _LOGGER.warning("🔋 Recorder component not available")
            return

        _LOGGER.info("🔋 Attempting to load last month efficiency from history...")

        try:
            # Zjistit datum minulého měsíce
            now = datetime.now()
            if now.month == 1:
                last_month_year = now.year - 1
                last_month = 12
            else:
                last_month_year = now.year
                last_month = now.month - 1

            # Poslední den minulého měsíce v 23:59
            import calendar
            from datetime import timezone

            last_day = calendar.monthrange(last_month_year, last_month)[1]
            end_time = datetime(
                last_month_year, last_month, last_day, 23, 59, 59, tzinfo=timezone.utc
            )

            # První den minulého měsíce v 00:00
            start_time = datetime(
                last_month_year, last_month, 1, 0, 0, 0, tzinfo=timezone.utc
            )

            _LOGGER.debug(f"🔋 Looking for history between {start_time} and {end_time}")

            # Načíst historii pro monthly sensors
            charge_sensor = (
                f"sensor.oig_{self._box_id}_computed_batt_charge_energy_month"
            )
            discharge_sensor = (
                f"sensor.oig_{self._box_id}_computed_batt_discharge_energy_month"
            )
            battery_sensor = f"sensor.oig_{self._box_id}_remaining_usable_capacity"

            # Získat stavy na konci měsíce
            history = await self.hass.async_add_executor_job(
                get_significant_states,
                self.hass,
                end_time - timedelta(hours=1),
                end_time,
                [charge_sensor, discharge_sensor, battery_sensor],
            )

            _LOGGER.debug(
                f"🔋 History result type: {type(history)}, keys: {history.keys() if history else 'None'}"
            )
            if history:
                for key, values in history.items():
                    _LOGGER.debug(f"🔋 History[{key}]: {len(values)} entries")

            if not history:
                _LOGGER.warning(
                    f"🔋 No history found for {last_month}/{last_month_year}"
                )
                return

            # Parse hodnoty
            charge_wh = None
            discharge_wh = None
            battery_end = None

            if charge_sensor in history and history[charge_sensor]:
                for item in reversed(history[charge_sensor]):
                    if isinstance(item, dict):
                        state_value = item.get("state")
                    else:
                        state_value = item.state
                    if state_value not in ["unknown", "unavailable", None]:
                        try:
                            charge_wh = float(state_value)
                            break
                        except (ValueError, TypeError):
                            continue

            if discharge_sensor in history and history[discharge_sensor]:
                for item in reversed(history[discharge_sensor]):
                    if isinstance(item, dict):
                        state_value = item.get("state")
                    else:
                        state_value = item.state
                    if state_value not in ["unknown", "unavailable", None]:
                        try:
                            discharge_wh = float(state_value)
                            break
                        except (ValueError, TypeError):
                            continue

            if battery_sensor in history and history[battery_sensor]:
                for item in reversed(history[battery_sensor]):
                    if isinstance(item, dict):
                        state_value = item.get("state")
                    else:
                        state_value = item.state
                    if state_value not in ["unknown", "unavailable", None]:
                        try:
                            battery_end = float(state_value)
                            break
                        except (ValueError, TypeError):
                            continue

            # Načíst stav baterie na začátku měsíce
            history_start = await self.hass.async_add_executor_job(
                get_significant_states,
                self.hass,
                start_time,
                start_time + timedelta(hours=1),
                [battery_sensor],
            )

            battery_start = None
            if battery_sensor in history_start and history_start[battery_sensor]:
                for item in history_start[battery_sensor]:
                    if isinstance(item, dict):
                        state_value = item.get("state")
                    else:
                        state_value = item.state
                    if state_value not in ["unknown", "unavailable", None]:
                        try:
                            battery_start = float(state_value)
                            break
                        except (ValueError, TypeError):
                            continue

            # Vypočítat efficiency
            if (
                charge_wh
                and discharge_wh
                and battery_start is not None
                and battery_end is not None
            ):
                charge_kwh = charge_wh / 1000
                discharge_kwh = discharge_wh / 1000
                delta_kwh = battery_end - battery_start
                effective_discharge = discharge_kwh - delta_kwh

                if effective_discharge > 0 and charge_kwh > 0:
                    efficiency = (effective_discharge / charge_kwh) * 100
                    losses_kwh = charge_kwh - effective_discharge
                    losses_pct = (losses_kwh / charge_kwh) * 100

                    self._efficiency_last_month = round(efficiency, 1)
                    self._last_month_data = {
                        "efficiency_pct": round(efficiency, 1),
                        "losses_kwh": round(losses_kwh, 2),
                        "losses_pct": round(losses_pct, 1),
                        "charge_kwh": round(charge_kwh, 2),
                        "discharge_kwh": round(discharge_kwh, 2),
                        "effective_discharge_kwh": round(effective_discharge, 2),
                        "delta_kwh": round(delta_kwh, 2),
                        "battery_start_kwh": round(battery_start, 2),
                        "battery_end_kwh": round(battery_end, 2),
                    }

                    _LOGGER.info(
                        f"🔋 Loaded {last_month}/{last_month_year} from history: "
                        f"efficiency={efficiency:.1f}%, charge={charge_kwh:.2f} kWh, "
                        f"discharge={discharge_kwh:.2f} kWh, delta={delta_kwh:.2f} kWh"
                    )

                    # Uložit state do HA aby přežil restart
                    self._update_extra_state_attributes()
                    self.async_write_ha_state()
                    _LOGGER.info("🔋 Last month data saved to state storage")
                else:
                    _LOGGER.warning(
                        f"🔋 Invalid data for {last_month}/{last_month_year}: "
                        f"effective_discharge={effective_discharge:.2f}, charge={charge_kwh:.2f}"
                    )
            else:
                _LOGGER.warning(
                    f"🔋 Incomplete data for {last_month}/{last_month_year}: "
                    f"charge={charge_wh}, discharge={discharge_wh}, "
                    f"battery_start={battery_start}, battery_end={battery_end}"
                )

        except Exception as e:
            _LOGGER.error(f"🔋 Error loading history: {e}", exc_info=True)
        finally:
            # Vždy resetovat flag aby se mohl zkusit loading znovu při dalším update
            self._loading_history = False

    def _get_sensor(self, sensor_type: str) -> Optional[float]:
        """Získat hodnotu z existujícího sensoru."""
        if not self._hass:
            return None

        sensor_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        state = self._hass.states.get(sensor_id)

        if not state or state.state in ["unknown", "unavailable"]:
            return None

        try:
            return float(state.state)
        except (ValueError, TypeError):
            return None


# ============================================================================
# BATTERY FORECAST PERFORMANCE TRACKING SENSOR
# Phase 2.7: Track Expected vs Actual costs for model validation
# ============================================================================


class OigCloudBatteryForecastPerformanceSensor(
    RestoreEntity, CoordinatorEntity, SensorEntity
):
    """
    Sensor pro tracking výkonu DP optimalizace - porovnání očekávaných vs skutečných nákladů.

    Phase 2.7: Performance Tracking & Validation

    Lifecycle:
    1. 00:00 - Plan Fixation: První DP výpočet dne fixuje expected_cost + timeline
    2. 00:15-23:45 - Actual Tracking: Průběžně sbírá actual grid import/export a spot prices
    3. 00:00 (+1 day) - End-of-Day Evaluation: Porovná expected vs actual, uloží statistiky

    State: Accuracy % (dnešní nebo průměr za měsíc)

    Attributes:
        - today: Dnešní tracking (expected, actual_so_far, status)
        - yesterday: Včerejší výsledky (expected, actual, delta, accuracy)
        - monthly_summary: Měsíční statistiky (total_savings, avg_accuracy, days_tracked)
        - all_time_summary: Celkové statistiky
        - daily_history: Posledních 30 dní (pro vizualizaci)
    """

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        """Initialize the performance tracking sensor."""
        super().__init__(coordinator)

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._device_info = device_info
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        # Box ID
        self._data_key = "unknown"
        if (
            coordinator
            and coordinator.data
            and isinstance(coordinator.data, dict)
            and coordinator.data
        ):
            self._data_key = list(coordinator.data.keys())[0]

        self._box_id = self._data_key
        self._attr_unique_id = f"oig_cloud_{self._data_key}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:chart-line"
        self._attr_native_unit_of_measurement = "%"
        self._attr_device_class = None
        self._attr_state_class = None
        self._attr_entity_category = None
        self._attr_name = "Battery Forecast Performance"

        # Performance tracking state
        self._today_plan: Optional[Dict[str, Any]] = None  # Fixovaný plán na dnes
        self._actual_intervals: List[Dict[str, Any]] = (
            []
        )  # Skutečné hodnoty za intervaly
        self._daily_history: List[Dict[str, Any]] = []  # Historie posledních 30 dní

        # Monthly aggregates
        self._monthly_stats: Dict[str, Any] = {}
        self._all_time_stats: Dict[str, Any] = {}

        # Previous sensor readings for delta calculation
        self._prev_grid_import: Optional[float] = None
        self._prev_grid_export: Optional[float] = None
        self._prev_timestamp: Optional[datetime] = None

    async def async_added_to_hass(self) -> None:
        """Restore persistent data when added to HA."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # Restore from last state
        if last_state := await self.async_get_last_state():
            if last_state.attributes:
                try:
                    # Restore today's plan if exists
                    if "today" in last_state.attributes:
                        self._today_plan = last_state.attributes["today"]

                    # Restore daily history
                    if "daily_history" in last_state.attributes:
                        self._daily_history = last_state.attributes["daily_history"]

                    # Restore monthly stats
                    if "monthly_summary" in last_state.attributes:
                        self._monthly_stats = last_state.attributes["monthly_summary"]

                    # Restore all-time stats
                    if "all_time_summary" in last_state.attributes:
                        self._all_time_stats = last_state.attributes["all_time_summary"]

                    # Restore delta tracking baselines
                    if "delta_tracking" in last_state.attributes:
                        tracking = last_state.attributes["delta_tracking"]
                        self._prev_grid_import = tracking.get("prev_grid_import")
                        self._prev_grid_export = tracking.get("prev_grid_export")
                        if timestamp_str := tracking.get("prev_timestamp"):
                            try:
                                self._prev_timestamp = datetime.fromisoformat(
                                    timestamp_str
                                )
                            except (ValueError, TypeError):
                                pass

                    _LOGGER.info(
                        f"📊 Restored performance data: "
                        f"{len(self._daily_history)} days history, "
                        f"today_plan={'active' if self._today_plan else 'none'}, "
                        f"delta_baseline={'set' if self._prev_grid_import else 'unset'}"
                    )
                except Exception as e:
                    _LOGGER.error(f"Failed to restore performance data: {e}")

    @property
    def native_value(self) -> Optional[float]:
        """Return accuracy percentage."""
        # If today's tracking is complete, return today's accuracy
        if self._today_plan and self._today_plan.get("status") == "completed":
            return self._today_plan.get("accuracy")

        # Otherwise return monthly average accuracy
        if self._monthly_stats and self._monthly_stats.get("avg_accuracy"):
            return self._monthly_stats["avg_accuracy"]

        return None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return performance tracking attributes."""
        attrs = {}

        # Today's status
        if self._today_plan:
            attrs["today"] = self._today_plan

        # Yesterday's results (last entry in history)
        if self._daily_history and len(self._daily_history) > 0:
            attrs["yesterday"] = self._daily_history[-1]

        # Monthly summary
        if self._monthly_stats:
            attrs["monthly_summary"] = self._monthly_stats

        # All-time summary
        if self._all_time_stats:
            attrs["all_time_summary"] = self._all_time_stats

        # Daily history (last 30 days)
        attrs["daily_history"] = (
            self._daily_history[-30:] if self._daily_history else []
        )

        # Delta tracking baselines (for persistence)
        attrs["delta_tracking"] = {
            "prev_grid_import": self._prev_grid_import,
            "prev_grid_export": self._prev_grid_export,
            "prev_timestamp": (
                self._prev_timestamp.isoformat() if self._prev_timestamp else None
            ),
        }

        return attrs

    async def async_update(self) -> None:
        """Update performance tracking."""
        try:
            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")

            # Check if we need to fix a new plan (first update after midnight)
            await self._maybe_fix_daily_plan(now, today_str)

            # Track actual performance if plan is active
            if self._today_plan and self._today_plan.get("status") in [
                "plan_fixed",
                "tracking",
            ]:
                await self._track_actual_performance(now)

            # Check if we need end-of-day evaluation (after midnight)
            await self._maybe_evaluate_yesterday(now)

            # Update monthly aggregates
            self._update_monthly_summary()

        except Exception as e:
            _LOGGER.error(f"Error updating performance sensor: {e}", exc_info=True)

    async def _maybe_fix_daily_plan(self, now: datetime, today_str: str) -> None:
        """
        Fixovat denní plán při prvním DP výpočtu dne.

        Volá se každých 15min, ale fixuje pouze pokud:
        1. Ještě nemáme plán pro dnešek
        2. Battery forecast sensor má mode_optimization data
        """
        # Už máme plán na dnes?
        if self._today_plan and self._today_plan.get("date") == today_str:
            return

        # Načíst mode_optimization z battery_forecast sensoru
        forecast_sensor_id = f"sensor.oig_{self._box_id}_battery_forecast"

        if not self._hass:
            return

        forecast_state = self._hass.states.get(forecast_sensor_id)
        if not forecast_state or forecast_state.state in ["unavailable", "unknown"]:
            _LOGGER.debug("📊 Battery forecast not available for plan fixation")
            return

        attrs = forecast_state.attributes or {}
        mode_opt = attrs.get("mode_optimization")

        if not mode_opt or not mode_opt.get("total_cost_czk"):
            _LOGGER.debug("📊 No mode_optimization data for plan fixation")
            return

        # FIXUJ PLÁN!
        _LOGGER.info(f"🎯 Fixing daily plan for {today_str}")

        self._today_plan = {
            "date": today_str,
            "status": "plan_fixed",
            "plan_timestamp": now.isoformat(),
            "expected_cost": mode_opt["total_cost_czk"],
            "actual_cost_so_far": 0.0,
            "actual_cost_final": None,
            "delta": None,
            "accuracy": None,
            "intervals_tracked": 0,
            "intervals_total": 96,  # 24h * 4 intervals
        }

        # Reset actual intervals for new day
        self._actual_intervals = []

        # Reset delta tracking (new baseline)
        self._prev_grid_import = None
        self._prev_grid_export = None
        self._prev_timestamp = None

        _LOGGER.info(
            f"📋 Daily plan fixed: expected_cost={mode_opt['total_cost_czk']:.2f} Kč, "
            f"intervals=96"
        )

    async def _track_actual_performance(self, now: datetime) -> None:
        """
        Průběžně trackovat skutečné náklady.

        Načítá actual grid import/export a spot prices každých 15min.
        """
        if not self._today_plan:
            return

        # Update status to tracking
        if self._today_plan["status"] == "plan_fixed":
            self._today_plan["status"] = "tracking"

        # Načíst actual hodnoty ze sensorů
        actual_grid_import = await self._get_actual_grid_import()
        actual_grid_export = await self._get_actual_grid_export()
        actual_spot_price = await self._get_current_spot_price()
        actual_export_price = await self._get_current_export_price()

        # Update timestamp
        self._prev_timestamp = now

        # Spočítat náklady za tento interval
        if actual_grid_import is not None and actual_spot_price is not None:
            import_cost = actual_grid_import * actual_spot_price
            export_revenue = (actual_grid_export or 0) * (actual_export_price or 0)
            interval_cost = import_cost - export_revenue

            # Přidat do actual intervals
            self._actual_intervals.append(
                {
                    "time": now.isoformat(),
                    "grid_import": actual_grid_import,
                    "grid_export": actual_grid_export or 0,
                    "spot_price": actual_spot_price,
                    "export_price": actual_export_price or 0,
                    "cost": interval_cost,
                }
            )

            # Update cumulative cost
            self._today_plan["actual_cost_so_far"] = sum(
                interval["cost"] for interval in self._actual_intervals
            )
            self._today_plan["intervals_tracked"] = len(self._actual_intervals)

            _LOGGER.debug(
                f"📊 Tracked interval: import={actual_grid_import:.3f} kWh, "
                f"export={actual_grid_export:.3f} kWh, "
                f"cost={interval_cost:.2f} Kč, "
                f"total_so_far={self._today_plan['actual_cost_so_far']:.2f} Kč"
            )
        else:
            _LOGGER.debug("📊 Skipping interval tracking - missing data")

    async def _get_actual_grid_import(self) -> Optional[float]:
        """
        Načíst actual grid import za poslední 15min interval.

        Returns:
            kWh imported from grid in last 15min interval
        """
        if not self._hass:
            return None

        # Get cumulative grid_import sensor
        sensor_id = f"sensor.oig_{self._box_id}_grid_import"
        state = self._hass.states.get(sensor_id)

        if not state or state.state in ["unavailable", "unknown"]:
            _LOGGER.debug(f"Grid import sensor not available: {sensor_id}")
            return None

        try:
            current_value = float(state.state)

            # Calculate delta from previous reading
            if self._prev_grid_import is not None:
                delta = current_value - self._prev_grid_import

                # Sanity check (delta should be positive and < 10 kWh per 15min)
                if 0 <= delta < 10:
                    self._prev_grid_import = current_value
                    return delta
                else:
                    _LOGGER.warning(
                        f"Grid import delta sanity check failed: {delta:.3f} kWh "
                        f"(prev={self._prev_grid_import}, current={current_value})"
                    )
                    # Reset and return None to skip this interval
                    self._prev_grid_import = current_value
                    return None
            else:
                # First reading - store and return None
                self._prev_grid_import = current_value
                _LOGGER.debug(f"Grid import baseline set: {current_value:.3f} kWh")
                return None

        except (ValueError, TypeError) as e:
            _LOGGER.debug(f"Failed to parse grid import: {e}")
            return None

    async def _get_actual_grid_export(self) -> Optional[float]:
        """
        Načíst actual grid export za poslední 15min interval.

        Returns:
            kWh exported to grid in last 15min interval
        """
        if not self._hass:
            return None

        sensor_id = f"sensor.oig_{self._box_id}_grid_export"
        state = self._hass.states.get(sensor_id)

        if not state or state.state in ["unavailable", "unknown"]:
            return None

        try:
            current_value = float(state.state)

            # Calculate delta from previous reading
            if self._prev_grid_export is not None:
                delta = current_value - self._prev_grid_export

                # Sanity check (delta should be positive and < 10 kWh per 15min)
                if 0 <= delta < 10:
                    self._prev_grid_export = current_value
                    return delta
                else:
                    _LOGGER.warning(
                        f"Grid export delta sanity check failed: {delta:.3f} kWh "
                        f"(prev={self._prev_grid_export}, current={current_value})"
                    )
                    self._prev_grid_export = current_value
                    return None
            else:
                # First reading - store and return None
                self._prev_grid_export = current_value
                _LOGGER.debug(f"Grid export baseline set: {current_value:.3f} kWh")
                return None

        except (ValueError, TypeError) as e:
            _LOGGER.debug(f"Failed to parse grid export: {e}")
            return None

    async def _get_current_spot_price(self) -> Optional[float]:
        """
        Načíst aktuální spot price pro tento interval.

        Returns:
            Current spot price in Kč/kWh (including distribution + VAT)
        """
        if not self._hass:
            return None

        # Get from battery_forecast sensor which has spot prices
        forecast_sensor_id = f"sensor.oig_{self._box_id}_battery_forecast"
        state = self._hass.states.get(forecast_sensor_id)

        if not state or state.state in ["unavailable", "unknown"]:
            return None

        attrs = state.attributes or {}

        # Try to match current time to timeline entry
        mode_opt = attrs.get("mode_optimization", {})
        timeline = mode_opt.get("timeline", [])

        if timeline:
            now = datetime.now()
            current_hour = now.replace(minute=0, second=0, microsecond=0)

            # Find matching timeline entry
            for entry in timeline:
                try:
                    entry_time = datetime.fromisoformat(entry.get("time", ""))
                    if entry_time == current_hour:
                        return entry.get("spot_price_czk_kwh")
                except (ValueError, TypeError):
                    continue

        # Fallback: Calculate average from mode_optimization
        if mode_opt.get("total_cost_czk") and mode_opt.get("total_kwh_import"):
            avg_price = mode_opt["total_cost_czk"] / mode_opt["total_kwh_import"]
            _LOGGER.debug(f"Using average spot price: {avg_price:.2f} Kč/kWh")
            return avg_price

        # Final fallback
        _LOGGER.debug("No spot price found, using fallback: 3.0 Kč/kWh")
        return 3.0

    async def _get_current_export_price(self) -> Optional[float]:
        """
        Načíst aktuální export price.

        Returns:
            Current export price in Kč/kWh
        """
        if not self._hass:
            return None

        # Get from battery_forecast sensor
        forecast_sensor_id = f"sensor.oig_{self._box_id}_battery_forecast"
        state = self._hass.states.get(forecast_sensor_id)

        if not state or state.state in ["unavailable", "unknown"]:
            return None

        attrs = state.attributes or {}

        # Try to get from mode_optimization timeline
        mode_opt = attrs.get("mode_optimization", {})
        timeline = mode_opt.get("timeline", [])

        if timeline:
            now = datetime.now()
            current_hour = now.replace(minute=0, second=0, microsecond=0)

            # Find matching timeline entry
            for entry in timeline:
                try:
                    entry_time = datetime.fromisoformat(entry.get("time", ""))
                    if entry_time == current_hour:
                        return entry.get("export_price_czk_kwh", 1.5)
                except (ValueError, TypeError):
                    continue

        # Fallback: Use average export price if available
        if mode_opt.get("total_revenue_czk") and mode_opt.get("total_kwh_export"):
            if mode_opt["total_kwh_export"] > 0:
                avg_export = (
                    mode_opt["total_revenue_czk"] / mode_opt["total_kwh_export"]
                )
                _LOGGER.debug(f"Using average export price: {avg_export:.2f} Kč/kWh")
                return avg_export

        # Final fallback
        return 1.5

    async def _maybe_evaluate_yesterday(self, now: datetime) -> None:
        """
        Vyhodnotit včerejší den pokud jsme právě přešli půlnoc.

        Kontroluje jestli máme plan z včerejška který není evaluated.
        """
        if not self._today_plan:
            return

        today_str = now.strftime("%Y-%m-%d")
        plan_date = self._today_plan.get("date")

        # Je plán z včerejška a ještě není completed?
        if plan_date != today_str and self._today_plan.get("status") != "completed":
            _LOGGER.info(f"📊 Evaluating yesterday's performance: {plan_date}")

            # Mark as completed
            self._today_plan["status"] = "completed"

            # TODO: Phase 2 - Calculate final actual_cost
            # Pro Phase 1: Use placeholder
            expected = self._today_plan["expected_cost"]
            actual = self._today_plan.get("actual_cost_so_far", expected)  # Placeholder

            delta = expected - actual
            accuracy = (1 - abs(delta) / expected) * 100 if expected > 0 else 100

            # Determine rating
            if accuracy >= 95:
                rating = "excellent"
            elif accuracy >= 90:
                rating = "good"
            elif accuracy >= 85:
                rating = "fair"
            else:
                rating = "poor"

            # Update plan with final values
            self._today_plan["actual_cost_final"] = actual
            self._today_plan["delta"] = delta
            self._today_plan["accuracy"] = accuracy
            self._today_plan["rating"] = rating

            # Add to history
            self._daily_history.append(
                {
                    "date": plan_date,
                    "expected": expected,
                    "actual": actual,
                    "delta": delta,
                    "accuracy": accuracy,
                    "rating": rating,
                }
            )

            # Keep only last 90 days in history
            self._daily_history = self._daily_history[-90:]

            _LOGGER.info(
                f"📊 Yesterday evaluation complete: "
                f"expected={expected:.2f} Kč, actual={actual:.2f} Kč, "
                f"delta={delta:+.2f} Kč, accuracy={accuracy:.1f}% ({rating})"
            )

            # TODO: Phase 3 - Save to HA Statistics API
            # await self._save_to_statistics(plan_date, expected, actual, delta, accuracy)

    def _update_monthly_summary(self) -> None:
        """Update monthly and all-time aggregates from history."""
        if not self._daily_history:
            return

        now = datetime.now()
        current_month = now.strftime("%Y-%m")

        # Filter this month's data
        month_data = [
            day for day in self._daily_history if day["date"].startswith(current_month)
        ]

        if not month_data:
            return

        # Calculate monthly stats
        total_expected = sum(day["expected"] for day in month_data)
        total_actual = sum(day["actual"] for day in month_data)
        total_savings = total_expected - total_actual
        avg_accuracy = sum(day["accuracy"] for day in month_data) / len(month_data)

        # Count rating distribution
        excellent = sum(1 for day in month_data if day["rating"] == "excellent")
        good = sum(1 for day in month_data if day["rating"] == "good")
        fair = sum(1 for day in month_data if day["rating"] == "fair")
        poor = sum(1 for day in month_data if day["rating"] == "poor")

        self._monthly_stats = {
            "month": current_month,
            "days_tracked": len(month_data),
            "total_expected_cost": round(total_expected, 2),
            "total_actual_cost": round(total_actual, 2),
            "total_savings": round(total_savings, 2),
            "avg_accuracy": round(avg_accuracy, 1),
            "excellent_days": excellent,
            "good_days": good,
            "fair_days": fair,
            "poor_days": poor,
        }

        # Calculate all-time stats
        all_expected = sum(day["expected"] for day in self._daily_history)
        all_actual = sum(day["actual"] for day in self._daily_history)
        all_savings = all_expected - all_actual
        all_avg_accuracy = sum(day["accuracy"] for day in self._daily_history) / len(
            self._daily_history
        )

        self._all_time_stats = {
            "total_days": len(self._daily_history),
            "total_expected_cost": round(all_expected, 2),
            "total_actual_cost": round(all_actual, 2),
            "total_savings": round(all_savings, 2),
            "avg_accuracy": round(all_avg_accuracy, 1),
        }
