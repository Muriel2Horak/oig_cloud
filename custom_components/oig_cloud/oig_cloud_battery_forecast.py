"""Zjednodušený senzor pro predikci nabití baterie v průběhu dne."""

import asyncio
import logging
import math
import numpy as np
import copy
import json
import hashlib
from typing import Any, Dict, List, Optional, Union
from datetime import date, datetime, timedelta, timezone
from collections import defaultdict

from homeassistant.components.sensor import (
    SensorEntity,
    SensorDeviceClass,
    SensorStateClass,
)
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.storage import Store
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.util import dt as dt_util

from .oig_cloud_data_sensor import OigCloudDataSensor
from .const import DOMAIN  # TODO 3: Import DOMAIN for BalancingManager access

_LOGGER = logging.getLogger(__name__)


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
        self._attr_state_class = SensorStateClass.TOTAL_INCREASING
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

        # Phase 2.7: HOME I timeline cache for savings calculation
        self._home_i_timeline_cache: List[Dict[str, Any]] = []

        # FÁZE 5: Detail Tabs cache with TTL
        # Cache structure: {tab_name: {"data": {...}, "timestamp": datetime, "ttl": int}}
        # TTL values: yesterday=None (infinite), today_historical=None, today_planned=60, tomorrow=60
        self._detail_tabs_cache: Dict[str, Dict[str, Any]] = {}

        # Unified charging planner - aktivní plán
        self._active_charging_plan: Optional[Dict[str, Any]] = None
        self._plan_status: str = "none"  # none | pending | active | completed

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
        if hasattr(self, "_active_charging_plan") and self._active_charging_plan:
            attrs["active_plan_data"] = json.dumps(self._active_charging_plan)
            attrs["plan_status"] = getattr(self, "_plan_status", "pending")

        # Phase 2.9: REMOVED daily_plan_state from attributes
        # Důvod: Ukládá se do JSON storage místo HA database (optimalizace)
        # Data dostupná přes timeline_extended API endpoint

        # Phase 2.5: DP Multi-Mode Optimization Summary
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
                _LOGGER.warning(f"Missing battery capacity data - cannot run forecast")
                return

            if not spot_prices:
                _LOGGER.warning(
                    f"No spot prices available - forecast will use fallback prices"
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

                self._mode_optimization_result = self._calculate_optimal_modes_hybrid(
                    current_capacity=current_capacity,
                    max_capacity=max_capacity,
                    min_capacity=min_capacity,
                    target_capacity=target_capacity,
                    spot_prices=spot_prices,
                    export_prices=export_prices,
                    solar_forecast=solar_forecast,
                    load_forecast=load_forecast,
                    balancing_plan=balancing_plan_for_hybrid,
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

            # Use HYBRID timeline if available (nový formát s mode, mode_name, net_cost)
            # Jinak fallback na _calculate_timeline (starý formát)
            has_dp_results = (
                hasattr(self, "_mode_optimization_result")
                and self._mode_optimization_result is not None
            )

            if has_dp_results:
                # Use HYBRID optimal_timeline (nový formát)
                self._timeline_data = self._mode_optimization_result.get(
                    "optimal_timeline", []
                )
                # Uložit HYBRID timeline i jako _hybrid_timeline pro balancing modul
                self._hybrid_timeline = self._timeline_data
                _LOGGER.debug(
                    f"Using HYBRID timeline: {len(self._timeline_data)} intervals"
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
            if not self.hass:
                _LOGGER.debug("Sensor not yet added to HA, skipping state write")
                return

            _LOGGER.info(
                f"🔄 Writing HA state with consumption_summary: {self._consumption_summary}"
            )
            self.async_write_ha_state()

            # Notify dependent sensors (BatteryBalancing) that forecast is ready
            from homeassistant.helpers.dispatcher import async_dispatcher_send

            signal_name = f"oig_cloud_{self._box_id}_forecast_updated"
            _LOGGER.debug(f"📡 Sending signal: {signal_name}")
            async_dispatcher_send(self.hass, signal_name)

        except Exception as e:
            _LOGGER.error(f"Error updating battery forecast: {e}", exc_info=True)

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
        # Initialize result
        result = {
            "new_soc_kwh": battery_soc_kwh,
            "grid_import_kwh": 0.0,
            "grid_export_kwh": 0.0,
            "battery_charge_kwh": 0.0,
            "battery_discharge_kwh": 0.0,
            "grid_cost_czk": 0.0,
            "export_revenue_czk": 0.0,
            "net_cost_czk": 0.0,
        }

        # =====================================================================
        # CRITICAL OPTIMIZATION: NOC (solar == 0) → HOME I/II/III IDENTICKÉ!
        # =====================================================================
        # Podle CBB_MODES_DEFINITIVE.md TABULKA 2:
        # "HOME I/II/III: Všechny IDENTICKÉ - baterie vybíjí do 20% SoC"

        if solar_kwh < 0.001 and mode in [
            CBB_MODE_HOME_I,
            CBB_MODE_HOME_II,
            CBB_MODE_HOME_III,
        ]:
            # NOC: Společná logika - vybíjení baterie do hw_min
            available_battery = max(0.0, battery_soc_kwh - hw_min_capacity_kwh)
            usable_from_battery = available_battery * discharge_efficiency

            battery_discharge_kwh = min(load_kwh, usable_from_battery)

            if battery_discharge_kwh > 0.001:
                result["battery_discharge_kwh"] = (
                    battery_discharge_kwh / discharge_efficiency
                )
                result["new_soc_kwh"] = (
                    battery_soc_kwh - result["battery_discharge_kwh"]
                )

            covered_by_battery = battery_discharge_kwh
            deficit = load_kwh - covered_by_battery

            if deficit > 0.001:
                result["grid_import_kwh"] = deficit
                result["grid_cost_czk"] = deficit * spot_price_czk

            result["net_cost_czk"] = result["grid_cost_czk"]
            return result

        # =====================================================================
        # HOME I (0) - DEN: FVE → spotřeba → baterie, deficit vybíjí
        # =====================================================================

        if mode == CBB_MODE_HOME_I:
            if solar_kwh >= load_kwh:
                # FVE pokrývá spotřebu, přebytek → baterie
                surplus = solar_kwh - load_kwh
                battery_space = capacity_kwh - battery_soc_kwh
                charge_amount = min(surplus, battery_space)

                if charge_amount > 0.001:
                    result["battery_charge_kwh"] = charge_amount
                    physical_charge = charge_amount * charge_efficiency
                    result["new_soc_kwh"] = min(
                        battery_soc_kwh + physical_charge, capacity_kwh
                    )

                remaining_surplus = surplus - charge_amount
                if remaining_surplus > 0.001:
                    result["grid_export_kwh"] = remaining_surplus
                    result["export_revenue_czk"] = remaining_surplus * export_price_czk

            else:
                # FVE < load → deficit vybíjí baterii
                deficit = load_kwh - solar_kwh
                available_battery = max(0.0, battery_soc_kwh - hw_min_capacity_kwh)
                usable_from_battery = available_battery * discharge_efficiency

                battery_discharge_kwh = min(deficit, usable_from_battery)

                if battery_discharge_kwh > 0.001:
                    result["battery_discharge_kwh"] = (
                        battery_discharge_kwh / discharge_efficiency
                    )
                    result["new_soc_kwh"] = (
                        battery_soc_kwh - result["battery_discharge_kwh"]
                    )

                remaining_deficit = deficit - battery_discharge_kwh
                if remaining_deficit > 0.001:
                    result["grid_import_kwh"] = remaining_deficit
                    result["grid_cost_czk"] = remaining_deficit * spot_price_czk

            result["net_cost_czk"] = (
                result["grid_cost_czk"] - result["export_revenue_czk"]
            )
            return result

        # =====================================================================
        # HOME II (1) - DEN: FVE → spotřeba, přebytek → baterie, deficit → SÍŤ!
        # =====================================================================
        # ⚠️ KRITICKÉ: Při deficitu baterie NETOUCHED, deficit POUZE ZE SÍTĚ!

        elif mode == CBB_MODE_HOME_II:
            if solar_kwh >= load_kwh:
                # FVE pokrývá spotřebu, přebytek → baterie
                surplus = solar_kwh - load_kwh
                battery_space = capacity_kwh - battery_soc_kwh
                charge_amount = min(surplus, battery_space)

                if charge_amount > 0.001:
                    result["battery_charge_kwh"] = charge_amount
                    physical_charge = charge_amount * charge_efficiency
                    result["new_soc_kwh"] = min(
                        battery_soc_kwh + physical_charge, capacity_kwh
                    )

                remaining_surplus = surplus - charge_amount
                if remaining_surplus > 0.001:
                    result["grid_export_kwh"] = remaining_surplus
                    result["export_revenue_czk"] = remaining_surplus * export_price_czk

            else:
                # FVE < load → deficit ze SÍTĚ (baterie NETOUCHED!)
                # ⚠️ TOTO JE KLÍČOVÝ ROZDÍL mezi HOME I (vybíjí) a HOME II (šetří)!
                deficit = load_kwh - solar_kwh
                result["grid_import_kwh"] = deficit
                result["grid_cost_czk"] = deficit * spot_price_czk
                # result["new_soc_kwh"] zůstává battery_soc_kwh (NETOUCHED)

            result["net_cost_czk"] = (
                result["grid_cost_czk"] - result["export_revenue_czk"]
            )
            return result

        # =====================================================================
        # HOME III (2) - DEN: FVE → baterie, spotřeba → VŽDY SÍŤ
        # =====================================================================
        # ⚠️ KRITICKÉ: Baterie se přes den NEVYBÍJÍ pro spotřebu!

        elif mode == CBB_MODE_HOME_III:
            # CELÁ FVE → baterie (agresivní nabíjení)
            battery_space = capacity_kwh - battery_soc_kwh
            charge_amount = min(solar_kwh, battery_space)

            if charge_amount > 0.001:
                result["battery_charge_kwh"] = charge_amount
                physical_charge = charge_amount * charge_efficiency
                result["new_soc_kwh"] = min(
                    battery_soc_kwh + physical_charge, capacity_kwh
                )

            # Spotřeba VŽDY ze sítě (i když je FVE!)
            result["grid_import_kwh"] = load_kwh
            result["grid_cost_czk"] = load_kwh * spot_price_czk

            # Export přebytku (pokud baterie plná)
            remaining_solar = solar_kwh - charge_amount
            if remaining_solar > 0.001:
                result["grid_export_kwh"] = remaining_solar
                result["export_revenue_czk"] = remaining_solar * export_price_czk

            result["net_cost_czk"] = (
                result["grid_cost_czk"] - result["export_revenue_czk"]
            )
            return result

        # =====================================================================
        # HOME UPS (3) - Nabíjení na 100% ze VŠECH zdrojů (FVE + síť)
        # =====================================================================

        elif mode == CBB_MODE_HOME_UPS:
            battery_space = capacity_kwh - battery_soc_kwh

            # FVE → baterie (bez limitu)
            solar_to_battery = min(solar_kwh, battery_space)

            # Grid → baterie (max home_charge_rate)
            remaining_space = battery_space - solar_to_battery
            grid_to_battery = min(home_charge_rate_kwh_15min, remaining_space)

            # Celkové nabití
            total_charge = solar_to_battery + grid_to_battery

            if total_charge > 0.001:
                result["battery_charge_kwh"] = total_charge
                physical_charge = total_charge * charge_efficiency
                result["new_soc_kwh"] = min(
                    battery_soc_kwh + physical_charge, capacity_kwh
                )

            # Spotřeba + grid charging ze sítě
            result["grid_import_kwh"] = load_kwh + grid_to_battery
            result["grid_cost_czk"] = result["grid_import_kwh"] * spot_price_czk

            # Export přebytku FVE (pokud baterie plná)
            remaining_solar = solar_kwh - solar_to_battery
            if remaining_solar > 0.001:
                result["grid_export_kwh"] = remaining_solar
                result["export_revenue_czk"] = remaining_solar * export_price_czk

            result["net_cost_czk"] = (
                result["grid_cost_czk"] - result["export_revenue_czk"]
            )
            return result

        else:
            raise ValueError(f"Unknown mode: {mode} (expected 0-3)")

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
                solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
            except:
                solar_kwh = 0.0

            # Simulovat s fixed režimem - NOVÁ centrální funkce!
            # TODO 3: Přechod ze staré _simulate_interval_with_mode() na novou _simulate_interval()
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

        # Phase 2.7: Store HOME I timeline in instance variable
        if fixed_mode == CBB_MODE_HOME_I:
            self._home_i_timeline_cache = timeline_cache
            _LOGGER.debug(
                f"Cached HOME I timeline: {len(timeline_cache)} intervals, total_cost={total_cost:.2f} Kč"
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

        _LOGGER.info(
            f"🔍 Calculating 4 baselines: physical_min={physical_min_capacity:.2f} kWh "
            f"({physical_min_capacity/max_capacity*100:.0f}%)"
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

            _LOGGER.info(
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
                solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
            except:
                solar_kwh = 0.0

            # OPRAVA: Použít současný režim místo HOME I
            # TODO 3: Přechod na novou _simulate_interval()
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
            except:
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
                solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
            except:
                solar_kwh = 0.0

            # OPRAVA: Nabíjet pouze v nejlevnějších nočních intervalech
            if t in cheapest_intervals and battery_soc < max_capacity:
                # Optimální nabíjení v levném intervalu
                mode = CBB_MODE_HOME_UPS  # 3 - Grid charging enabled
            else:
                # Normální provoz (nebo battery už plná)
                mode = CBB_MODE_HOME_I  # 0 - Battery priority

            # TODO 3: Přechod na novou _simulate_interval()
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
        """
        Vytvořit user-friendly doporučení režimů pro DNES a ZÍTRA.

        Phase 2.6: Mode Recommendations - Seskupí po sobě jdoucí stejné režimy
        do časových bloků s DETAILNÍM zdůvodněním.

        Phase 2.8: Oprava rozsahu dat a splitování přes půlnoc
        - Pouze DNES (od teď) a ZÍTRA (celý den)
        - Bloky přes půlnoc se rozdělí na 2 samostatné bloky

        Args:
            optimal_timeline: Timeline z DP optimalizace
            hours_ahead: Kolik hodin do budoucna zahrnout (default 48h)

        Returns:
            List[Dict]: Seskupené režimy s časovými bloky a ekonomickými detaily
                [{
                    "mode": int,
                    "mode_name": str,
                    "from_time": str (ISO),
                    "to_time": str (ISO),
                    "duration_hours": float,
                    "intervals_count": int,
                    "avg_spot_price": float,      # Průměrná spot cena (Kč/kWh)
                    "avg_solar_kw": float,         # Průměrná FVE výroba (kW)
                    "avg_load_kw": float,          # Průměrná spotřeba (kW)
                    "total_cost": float,           # Celkové náklady bloku (Kč)
                    "cost_savings_vs_home_i": float,  # Úspora vs HOME I (Kč)
                    "rationale": str,              # Vysvětlení proč tento režim
                }]
        """
        if not optimal_timeline:
            return []

        try:
            now = datetime.now()

            # OPRAVA Phase 2.8: Mode recommendations jen BUDOUCNOST (od NOW)
            # DNES: od NOW do 23:59:59
            # ZÍTRA: celý den (00:00:00 - 23:59:59)
            # Důvod: optimal_timeline už je filtrovaný od NOW (řádek 400-408)
            tomorrow_end = datetime.combine(
                now.date() + timedelta(days=1), datetime.max.time()
            )

            # Filter pouze intervaly od NOW do konce zítřka
            future_intervals = [
                interval
                for interval in optimal_timeline
                if interval.get("time")
                and now <= datetime.fromisoformat(interval["time"]) <= tomorrow_end
            ]

            if not future_intervals:
                return []

            # Group consecutive same-mode intervals WITH detailed metrics
            recommendations = []
            current_block = None
            block_intervals = []  # Store intervals for current block

            for interval in future_intervals:
                mode = interval.get("mode")
                mode_name = interval.get("mode_name", f"MODE_{mode}")
                time_str = interval.get("time", "")

                if current_block is None:
                    # Start new block - to_time will be set when we know it's the last interval
                    current_block = {
                        "mode": mode,
                        "mode_name": mode_name,
                        "from_time": time_str,
                        "to_time": None,  # Will be set later
                        "intervals_count": 1,
                    }
                    block_intervals = [interval]
                elif current_block["mode"] == mode:
                    # Extend current block - just increment counter
                    current_block["intervals_count"] += 1
                    block_intervals.append(interval)
                else:
                    # Mode changed - finalize previous block
                    # Set to_time = last interval's time + 15min
                    if block_intervals:
                        last_interval_time = block_intervals[-1].get("time", "")
                        try:
                            last_dt = datetime.fromisoformat(last_interval_time)
                            end_dt = last_dt + timedelta(minutes=15)
                            current_block["to_time"] = end_dt.isoformat()
                        except:
                            current_block["to_time"] = last_interval_time

                    self._add_block_details(current_block, block_intervals)
                    # Store intervals for potential splitting later
                    current_block["_intervals"] = block_intervals
                    recommendations.append(current_block)

                    # Start new block
                    current_block = {
                        "mode": mode,
                        "mode_name": mode_name,
                        "from_time": time_str,
                        "to_time": None,  # Will be set later
                        "intervals_count": 1,
                    }
                    block_intervals = [interval]

            # Don't forget last block
            if current_block and block_intervals:
                # Set to_time for last block
                last_interval_time = block_intervals[-1].get("time", "")
                try:
                    last_dt = datetime.fromisoformat(last_interval_time)
                    end_dt = last_dt + timedelta(minutes=15)
                    current_block["to_time"] = end_dt.isoformat()
                except:
                    current_block["to_time"] = last_interval_time

                self._add_block_details(current_block, block_intervals)
                # Store intervals for potential splitting later
                current_block["_intervals"] = block_intervals
                recommendations.append(current_block)

            # OPRAVA Phase 2.8: Splitovat bloky přes půlnoc
            # Pokud blok začíná v jeden den a končí v druhý, rozdělit ho
            split_recommendations = []
            for block in recommendations:
                from_dt = datetime.fromisoformat(block["from_time"])
                to_dt = datetime.fromisoformat(block["to_time"])

                # Pokud blok je ve stejném dni, přidat bez změny
                if from_dt.date() == to_dt.date():
                    # Remove temporary intervals before returning
                    block.pop("_intervals", None)
                    split_recommendations.append(block)
                else:
                    # Blok přes půlnoc - rozdělit na 2
                    midnight = datetime.combine(
                        from_dt.date() + timedelta(days=1), datetime.min.time()
                    )

                    # Get original intervals for precise cost calculation
                    intervals = block.get("_intervals", [])

                    # Split intervals by midnight
                    intervals1 = [
                        i
                        for i in intervals
                        if datetime.fromisoformat(i.get("time", "")) < midnight
                    ]
                    intervals2 = [
                        i
                        for i in intervals
                        if datetime.fromisoformat(i.get("time", "")) >= midnight
                    ]

                    # První část: od from_time do půlnoci
                    block1 = {
                        "mode": block["mode"],
                        "mode_name": block["mode_name"],
                        "from_time": block["from_time"],
                        "to_time": midnight.isoformat(),
                        "intervals_count": len(intervals1),
                    }
                    duration1 = (midnight - from_dt).total_seconds() / 3600
                    block1["duration_hours"] = round(duration1, 2)

                    # Recalculate costs from actual intervals (no rounding errors)
                    if intervals1:
                        self._add_block_details(block1, intervals1)

                    split_recommendations.append(block1)

                    # Druhá část: od půlnoci do to_time
                    block2 = {
                        "mode": block["mode"],
                        "mode_name": block["mode_name"],
                        "from_time": midnight.isoformat(),
                        "to_time": block["to_time"],
                        "intervals_count": len(intervals2),
                    }
                    duration2 = (to_dt - midnight).total_seconds() / 3600
                    block2["duration_hours"] = round(duration2, 2)

                    # Recalculate costs from actual intervals (no rounding errors)
                    if intervals2:
                        self._add_block_details(block2, intervals2)

                    split_recommendations.append(block2)

            return split_recommendations

        except Exception as e:
            _LOGGER.error(f"Failed to create mode recommendations: {e}")
            return []

    def _add_block_details(
        self, block: Dict[str, Any], intervals: List[Dict[str, Any]]
    ) -> None:
        """
        Přidat detailní metriky do bloku doporučení.

        Phase 2.6: Rozšířeno o lidské vysvětlení a ekonomické zdůvodnění.
        Phase 2.7: Přidána kalkulace úspor vs HOME I režim.

        Args:
            block: Block dictionary to enhance
            intervals: List of intervals in this block
        """
        try:
            # Calculate duration
            from_dt = datetime.fromisoformat(block["from_time"])
            to_dt = datetime.fromisoformat(block["to_time"])
            duration = (
                to_dt - from_dt
            ).total_seconds() / 3600 + 0.25  # +15min last interval
            block["duration_hours"] = round(duration, 2)
        except:
            block["duration_hours"] = block["intervals_count"] * 0.25

        # Calculate average metrics across intervals
        if not intervals:
            return

        # We need spot prices and solar/load data
        # These should be available from timeline data
        total_cost = sum(i.get("net_cost", 0) for i in intervals)

        block["total_cost"] = round(total_cost, 2)

        # Phase 2.7: Calculate savings vs HOME I
        # Use cached HOME I timeline if available (from what-if analysis)
        if hasattr(self, "_home_i_timeline_cache") and self._home_i_timeline_cache:
            try:
                # Match intervals by timestamp
                home_i_cost_for_block = 0.0
                for interval in intervals:
                    interval_time = interval.get("time", "")
                    if interval_time:
                        # Find matching interval in HOME I timeline
                        home_i_interval = next(
                            (
                                hi
                                for hi in self._home_i_timeline_cache
                                if hi.get("time") == interval_time
                            ),
                            None,
                        )
                        if home_i_interval:
                            home_i_cost_for_block += home_i_interval.get("net_cost", 0)

                # Savings = HOME I cost - actual optimized cost
                savings = home_i_cost_for_block - total_cost
                block["savings_vs_home_i"] = round(savings, 2)

                # Add explanatory text
                if savings > 0.5:
                    block["savings_note"] = f"Ušetříte {savings:.2f} Kč oproti HOME I"
                elif savings < -0.5:
                    block["savings_note"] = (
                        f"HOME I by byl levnější o {abs(savings):.2f} Kč"
                    )
                else:
                    block["savings_note"] = "Podobné náklady jako HOME I"
            except Exception as e:
                _LOGGER.debug(f"Failed to calculate savings vs HOME I: {e}")
                block["savings_vs_home_i"] = 0.0
        else:
            # No cached data - skip savings calculation
            block["savings_vs_home_i"] = 0.0

        # Try to extract solar/load info if available
        # (This requires timeline to have been enriched with solar/load data)
        solar_vals = [i.get("solar_kwh", 0) * 4 for i in intervals]  # Convert to kW
        load_vals = [i.get("load_kwh", 0) * 4 for i in intervals]
        spot_prices = [i.get("spot_price", 0) for i in intervals]

        if solar_vals and any(v > 0 for v in solar_vals):
            block["avg_solar_kw"] = round(sum(solar_vals) / len(solar_vals), 2)
        else:
            block["avg_solar_kw"] = 0.0

        if load_vals:
            block["avg_load_kw"] = round(sum(load_vals) / len(load_vals), 2)
        else:
            block["avg_load_kw"] = 0.0

        if spot_prices:
            block["avg_spot_price"] = round(sum(spot_prices) / len(spot_prices), 2)
        else:
            block["avg_spot_price"] = 0.0

        # Generate human-friendly rationale with economic reasoning
        mode = block["mode"]
        solar_kw = block["avg_solar_kw"]
        load_kw = block["avg_load_kw"]
        spot_price = block["avg_spot_price"]

        # Get from_time as datetime for expensive period lookup
        from_dt = None
        try:
            from_dt = datetime.fromisoformat(block["from_time"])
        except:
            pass

        # HOME I - Battery Priority
        if mode == CBB_MODE_HOME_I:
            if (
                solar_kw > load_kw + 0.1
            ):  # FVE surplus (threshold 0.1kW to avoid tiny values)
                surplus_kw = solar_kw - load_kw
                block["rationale"] = (
                    f"Nabíjíme baterii z FVE přebytku ({surplus_kw:.1f} kW) - ukládáme levnou energii na později"
                )
            elif solar_kw > 0.2:  # Meaningful FVE production
                deficit_kw = load_kw - solar_kw
                block["rationale"] = (
                    f"FVE pokrývá část spotřeby ({solar_kw:.1f} kW), baterie doplňuje {deficit_kw:.1f} kW"
                )
            else:  # Night or minimal FVE
                block["rationale"] = (
                    f"Vybíjíme baterii pro pokrytí spotřeby - šetříme {spot_price:.1f} Kč/kWh ze sítě"
                )

        # HOME II - Grid Supplements (battery saved for expensive periods)
        elif mode == CBB_MODE_HOME_II:
            if solar_kw > load_kw + 0.1:  # FVE surplus
                surplus_kw = solar_kw - load_kw
                block["rationale"] = (
                    f"Nabíjíme baterii z FVE přebytku ({surplus_kw:.1f} kW) - připravujeme na večerní špičku"
                )
            else:
                # Grid supplements - battery saving mode
                if spot_price > 4.0:  # Relatively expensive
                    block["rationale"] = (
                        f"Grid pokrývá spotřebu ({spot_price:.1f} Kč/kWh) - ale ještě ne vrcholová cena"
                    )
                else:  # Cheap period
                    block["rationale"] = (
                        f"Levný proud ze sítě ({spot_price:.1f} Kč/kWh) - šetříme baterii na dražší období"
                    )

        # HOME III - All Solar to Battery
        elif mode == CBB_MODE_HOME_III:
            if solar_kw > 0.2:  # Meaningful FVE production
                block["rationale"] = (
                    f"Maximální nabíjení baterie - veškeré FVE ({solar_kw:.1f} kW) jde do baterie, spotřeba ze sítě"
                )
            else:  # Night
                block["rationale"] = (
                    f"Vybíjíme baterii pro pokrytí spotřeby - šetříme {spot_price:.1f} Kč/kWh ze sítě"
                )

        # HOME UPS - Grid Charging
        elif mode == CBB_MODE_HOME_UPS:
            if spot_price < 3.0:  # Very cheap
                block["rationale"] = (
                    f"Nabíjíme ze sítě - velmi levný proud ({spot_price:.1f} Kč/kWh), připravujeme plnou baterii"
                )
            else:  # More expensive but still worth it
                block["rationale"] = (
                    f"Nabíjíme ze sítě ({spot_price:.1f} Kč/kWh) - připravujeme na dražší špičku"
                )
        else:
            block["rationale"] = "Optimalizovaný režim podle aktuálních podmínek"

    def _find_next_expensive_hour(
        self, from_time: datetime, current_intervals: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        Najít následující drahé období (pro vysvětlení proč šetříme baterii).

        Args:
            from_time: Od kdy hledáme
            current_intervals: Aktuální intervaly (pro získání kontextu cen)

        Returns:
            String s časem typu "19-21h" nebo None
        """
        try:
            # Get average price of current block
            current_prices = [i.get("spot_price", 0) for i in current_intervals]
            if not current_prices:
                return None

            avg_current_price = sum(current_prices) / len(current_prices)

            # Look for next period where price is significantly higher (>30%)
            # Check next 12 hours
            if not hasattr(self, "_timeline_data") or not self._timeline_data:
                return None

            # _timeline_data is List[Dict], not Dict with "timeline" key
            timeline = self._timeline_data

            expensive_start = None
            for interval in timeline:
                interval_time_str = interval.get("time", "")
                if not interval_time_str:
                    continue

                try:
                    interval_time = datetime.fromisoformat(interval_time_str)

                    # Skip if before from_time
                    if interval_time <= from_time:
                        continue

                    # Check only next 12 hours
                    if (interval_time - from_time).total_seconds() > 12 * 3600:
                        break

                    interval_price = interval.get("spot_price", 0)

                    # Is this significantly more expensive? (>30% more)
                    if interval_price > avg_current_price * 1.3:
                        expensive_start = interval_time
                        break

                except (ValueError, TypeError):
                    continue

            if expensive_start:
                hour = expensive_start.hour
                # Return range like "19-21h" (2h window)
                return f"{hour:02d}-{(hour+2)%24:02d}h"

            return None

        except Exception as e:
            _LOGGER.debug(f"Failed to find next expensive period: {e}")
            return None

    def _calculate_optimal_modes_hybrid(
        self,
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        target_capacity: float,
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
        balancing_plan: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Hybridní algoritmus pro optimalizaci CBB režimů - JEDNODUCHÝ a SPOLEHLIVÝ.

        Strategie:
        1. Forward pass: Simulace s HOME I, detekce minimum violations
        2. Backward pass: Výpočet required battery pro dosažení target
        3. Price-aware charging: HOME UPS jen v nejlevnějších hodinách

        Hard constraint: Baterie NESMÍ klesnout pod min_capacity
        Soft constraint: Dosáhnout alespoň target_capacity na konci
        Optimalizace: Minimální náklady na grid charging

        BALANCING MODE:
        Pokud je předán balancing_plan, algoritmus se přepne do balancing režimu:
        - Target SoC = 100% (ignoruje target_capacity parametr)
        - Charging deadline = balancing_plan["holding_start"]
        - Holding period = holding_start až holding_end (HOME UPS po celou dobu)
        - Preferované charging intervaly z balancing_plan["charging_intervals"]
        - Bez ekonomických kontrol (MUSÍ dosáhnout 100%)
        """
        n = len(spot_prices)
        modes = [CBB_MODE_HOME_I] * n  # Začít s HOME I všude (nejlevnější)
        efficiency = (
            self._get_battery_efficiency()
        )  # Use real measured roundtrip efficiency

        # Parametry nabíjení
        config = (
            self._config_entry.options
            if self._config_entry and self._config_entry.options
            else self._config_entry.data if self._config_entry else {}
        )
        charging_power_kw = config.get("home_charge_rate", 2.8)
        max_charge_per_interval = charging_power_kw / 4.0  # kWh za 15min

        # === BALANCING MODE INITIALIZATION ===
        is_balancing_mode = balancing_plan is not None
        charging_deadline: Optional[datetime] = None
        holding_start: Optional[datetime] = None
        holding_end: Optional[datetime] = None
        preferred_charging_intervals: set = set()
        balancing_reason: str = "unknown"

        if is_balancing_mode:
            try:
                # Parse balancing plan
                holding_start = datetime.fromisoformat(balancing_plan["holding_start"])
                holding_end = datetime.fromisoformat(balancing_plan["holding_end"])

                # Normalize timezone
                if holding_start.tzinfo is None:
                    holding_start = dt_util.as_local(holding_start)
                if holding_end.tzinfo is None:
                    holding_end = dt_util.as_local(holding_end)

                charging_deadline = holding_start  # MUSÍME být na 100% do tohoto času
                target_capacity = max_capacity  # Balancing VŽDY 100%
                balancing_reason = balancing_plan.get("reason", "unknown")

                # Preferované charging intervaly (ISO strings)
                for iv_str in balancing_plan.get("charging_intervals", []):
                    ts = datetime.fromisoformat(iv_str)
                    if ts.tzinfo is None:
                        ts = dt_util.as_local(ts)
                    preferred_charging_intervals.add(ts)

                _LOGGER.warning(
                    f"🔋 BALANCING MODE ACTIVE: reason={balancing_reason}, "
                    f"target=100%, deadline={charging_deadline.strftime('%H:%M')}, "
                    f"holding until {holding_end.strftime('%H:%M')}, "
                    f"preferred_intervals={len(preferred_charging_intervals)}"
                )
            except (ValueError, TypeError, KeyError) as e:
                _LOGGER.error(f"Failed to parse balancing_plan: {e}", exc_info=True)
                is_balancing_mode = False  # Fallback to normal HYBRID

        _LOGGER.info(
            f"🔄 HYBRID algorithm: current={current_capacity:.2f}, min={min_capacity:.2f}, "
            f"target={target_capacity:.2f}, max={max_capacity:.2f}, intervals={n}, "
            f"balancing={is_balancing_mode}"
        )

        # PHASE 2.10: Calculate 4-baseline comparison EARLY
        # (so it's available even if we return early from economic check)
        physical_min_capacity = max_capacity * 0.20  # 20% SoC = physical/HW minimum

        baselines = self._calculate_mode_baselines(
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            physical_min_capacity=physical_min_capacity,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
        )

        # PHASE 1: Forward pass - simulace s HOME I, zjistit minimum dosažené kapacity
        battery_trajectory = [current_capacity]
        battery = current_capacity
        total_transition_cost = 0.0  # Track transition costs
        prev_mode_name = "Home I"  # Start mode

        for i in range(n):
            solar_kwh = load_forecast[i] if i < len(load_forecast) else 0.0
            # Oprava: solar z forecast, load z load_forecast
            try:
                timestamp = datetime.fromisoformat(spot_prices[i]["time"])
                solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
            except:
                solar_kwh = 0.0

            load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125

            # HOME I logika: solar → baterie nebo baterie → load
            if solar_kwh >= load_kwh:
                net_energy = solar_kwh - load_kwh  # Přebytek nabíjí baterii
            else:
                net_energy = -(load_kwh - solar_kwh) / efficiency  # Vybíjení s losses

            battery += net_energy
            # CRITICAL: Trajectory must contain UNCLAMPED values for accurate violation detection
            # Battery can go negative - this shows severity of minimum violation
            # NO CLAMP - we want to see the real trajectory, even if it violates constraints
            battery_trajectory.append(battery)

        min_reached = min(battery_trajectory)
        final_capacity = battery_trajectory[-1]

        _LOGGER.info(
            f"📊 Forward pass: min_reached={min_reached:.2f} kWh, "
            f"final={final_capacity:.2f} kWh (target={target_capacity:.2f})"
        )

        # PHASE 2: Rozhodnout zda potřebujeme nabíjet
        needs_charging_for_minimum = min_reached < min_capacity
        needs_charging_for_target = final_capacity < target_capacity

        # CRITICAL: Hard constraint vs soft constraint
        # - needs_charging_for_minimum = HARD constraint (MUST charge to avoid violation)
        # - needs_charging_for_target = SOFT constraint (MAY charge if economically beneficial)

        if not needs_charging_for_minimum and not needs_charging_for_target:
            _LOGGER.info("✅ No charging needed - HOME I everywhere is optimal")
            return self._build_result(
                modes,
                spot_prices,
                export_prices,
                solar_forecast,
                load_forecast,
                current_capacity,
                max_capacity,
                min_capacity,
                efficiency,
                baselines=baselines,  # Pass baselines even on early return
            )

        # ECONOMIC CHECK: Target charging makes sense ONLY if it prevents future grid imports
        # If battery doesn't drop below minimum with HOME I → NO economic benefit
        if needs_charging_for_target and not needs_charging_for_minimum:
            _LOGGER.info(
                f"⊘ Skipping target charging - battery stays above minimum with HOME I "
                f"(min_reached={min_reached:.2f} kWh >= min={min_capacity:.2f} kWh). "
                f"Target charging would cost money with NO benefit (no grid imports prevented)."
            )
            # Return HOME I baseline (no charging)
            return self._build_result(
                modes,
                spot_prices,
                export_prices,
                solar_forecast,
                load_forecast,
                current_capacity,
                max_capacity,
                min_capacity,
                efficiency,
                baselines=baselines,  # Pass baselines even on early return
            )

        # ECONOMIC CHECK: Calculate cheap price threshold for smart charging
        # SKIP pro balancing mode - balancing MUSÍ proběhnout bez ohledu na cenu
        if is_balancing_mode:
            _LOGGER.info(
                "🔋 Balancing mode - skipping economic checks (MUST charge to 100%)"
            )
        else:
            # Cheap hours = bottom X percentile (default 30% = cheapest 30% of hours)
            CHEAP_PRICE_PERCENTILE = 30  # TODO: Make configurable in config_flow
            sorted_prices = sorted([sp.get("price", 0) for sp in spot_prices])
            percentile_index = int(len(sorted_prices) * CHEAP_PRICE_PERCENTILE / 100)
            cheap_price_threshold = (
                sorted_prices[percentile_index] if sorted_prices else 999
            )

            avg_price = sum(sorted_prices) / len(sorted_prices) if sorted_prices else 0
            _LOGGER.info(
                f"💰 Price analysis: avg={avg_price:.2f} Kč/kWh, "
                f"cheap_threshold (P{CHEAP_PRICE_PERCENTILE})={cheap_price_threshold:.2f} Kč/kWh, "
                f"min={min(sorted_prices):.2f}, max={max(sorted_prices):.2f}"
            )

            # If charging is ONLY for target (not minimum violation), charge ONLY in cheap hours
            if not needs_charging_for_minimum and needs_charging_for_target:
                # Count how many cheap hours we have
                cheap_intervals = [
                    i
                    for i, sp in enumerate(spot_prices)
                    if sp.get("price", 999) <= cheap_price_threshold
                ]

                deficit_kwh = target_capacity - final_capacity
                max_charge_per_interval = charging_power_kw / 4.0  # kWh za 15min
                required_cheap_intervals = (
                    int(deficit_kwh / max_charge_per_interval) + 1
                )

                if len(cheap_intervals) < required_cheap_intervals:
                    _LOGGER.info(
                        f"⚠️  Skipping target charging - not enough cheap hours: "
                        f"need {required_cheap_intervals} intervals, have {len(cheap_intervals)} cheap intervals, "
                        f"deficit={deficit_kwh:.2f} kWh"
                    )
                    # Return HOME I baseline (no charging for target)
                    return self._build_result(
                        modes,
                        spot_prices,
                        export_prices,
                        solar_forecast,
                        load_forecast,
                        current_capacity,
                        max_capacity,
                        min_capacity,
                        efficiency,
                        baselines=baselines,  # Pass baselines even on early return
                    )
                else:
                    _LOGGER.info(
                        f"✅ Target charging feasible in cheap hours: "
                        f"{len(cheap_intervals)} cheap intervals available, "
                        f"need {required_cheap_intervals} for {deficit_kwh:.2f} kWh"
                    )

        _LOGGER.info(
            f"🔋 Charging decision: "
            f"for_minimum={needs_charging_for_minimum}, "
            f"for_target={needs_charging_for_target}"
        )

        # PHASE 3: Backward pass - kolik baterie potřebujeme na začátku každého intervalu
        required_battery = [0.0] * (n + 1)

        # === BALANCING MODE: Backward pass s deadline ===
        if is_balancing_mode and charging_deadline:
            # Najít index charging_deadline v spot_prices
            deadline_index = None
            for i, sp in enumerate(spot_prices):
                try:
                    ts = datetime.fromisoformat(sp["time"])
                    if ts.tzinfo is None:
                        ts = dt_util.as_local(ts)
                    if ts >= charging_deadline:
                        deadline_index = i
                        break
                except (ValueError, TypeError):
                    continue

            if deadline_index is None:
                _LOGGER.warning(
                    f"⚠️  Charging deadline {charging_deadline.strftime('%H:%M')} "
                    f"not found in spot_prices range. Using last interval."
                )
                deadline_index = n

            _LOGGER.info(
                f"🎯 Balancing deadline: index={deadline_index}/{n}, "
                f"time={charging_deadline.strftime('%H:%M')}"
            )

            # Backward pass JEN DO DEADLINE - musíme být na 100%
            required_battery[deadline_index] = max_capacity  # MUSÍ být 100% na deadline

            for i in range(deadline_index - 1, -1, -1):
                try:
                    timestamp = datetime.fromisoformat(spot_prices[i]["time"])
                    solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
                except:
                    solar_kwh = 0.0

                load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125

                # Co musí být NA ZAČÁTKU intervalu aby NA KONCI bylo required_battery[i+1]?
                if solar_kwh >= load_kwh:
                    net_energy = solar_kwh - load_kwh
                    required_battery[i] = required_battery[i + 1] - net_energy
                else:
                    drain = (load_kwh - solar_kwh) / efficiency
                    required_battery[i] = required_battery[i + 1] + drain

                # Jen clamp na max kapacitu
                required_battery[i] = min(required_battery[i], max_capacity)

            # OD DEADLINE DO KONCE: holding na 100% (HOME UPS celou dobu)
            for i in range(deadline_index, n + 1):
                required_battery[i] = max_capacity  # Držet 100%

            _LOGGER.info(
                f"📈 Balancing backward pass: required_start={required_battery[0]:.2f} kWh, "
                f"required_at_deadline={required_battery[deadline_index]:.2f} kWh (target=100%), "
                f"current={current_capacity:.2f}, deficit={max(0, required_battery[0] - current_capacity):.2f}"
            )

        else:
            # === NORMÁLNÍ HYBRID: Backward pass do konce ===
            required_battery[n] = max(
                target_capacity, min_capacity
            )  # Na konci chceme alespoň target

            for i in range(n - 1, -1, -1):
                try:
                    timestamp = datetime.fromisoformat(spot_prices[i]["time"])
                    solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
                except:
                    solar_kwh = 0.0

                load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125

                # Co musí být NA ZAČÁTKU intervalu aby NA KONCI bylo required_battery[i+1]?
                if solar_kwh >= load_kwh:
                    net_energy = solar_kwh - load_kwh
                    required_battery[i] = required_battery[i + 1] - net_energy
                else:
                    drain = (load_kwh - solar_kwh) / efficiency
                    required_battery[i] = required_battery[i + 1] + drain

                # KRITICKÉ: NEPOUŽÍVAT min clamp! Pokud baterie klesá pod minimum,
                # required_battery MUSÍ být VYŠŠÍ než min_capacity aby trigger nabíjení!
                # Jen clamp na max kapacitu
                required_battery[i] = min(required_battery[i], max_capacity)

            _LOGGER.info(
                f"📈 Backward pass: required_start={required_battery[0]:.2f} kWh "
                f"(current={current_capacity:.2f}, deficit={max(0, required_battery[0] - current_capacity):.2f})"
            )

        # PHASE 4: Inteligentní výběr režimu (HOME I/II/III) podle FVE a cen
        # Pravidlo: HOME II/III jen když FVE > 0, jinak HOME I

        # Najít průměrnou cenu pro porovnání
        avg_price = sum(sp.get("price", 0) for sp in spot_prices) / len(spot_prices)

        for i in range(n):
            try:
                timestamp = datetime.fromisoformat(spot_prices[i]["time"])
                solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
            except:
                solar_kwh = 0.0

            load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125
            current_price = spot_prices[i].get("price", 0)

            # Základní pravidlo: Když FVE = 0 → vždy HOME I
            if solar_kwh < 0.01:
                modes[i] = CBB_MODE_HOME_I
                continue

            # FVE > 0: Rozhodnout mezi HOME I, II, III

            # HOME III: Když chceme maximálně nabít baterii a je levná elektřina
            # Celá FVE → baterie, spotřeba → grid
            # Vyplatí se když: FVE je slušná + grid je levný + baterie nízká
            if (
                solar_kwh > 0.3  # Slušná FVE (>1.2kW)
                and current_price < avg_price * 0.8  # Levná elektřina (< 80% průměru)
                and i < n - 8
            ):  # Není poslední 2h (baterii stačí nabít)
                # TODO: Zjistit SoC v tomto intervalu pro lepší rozhodování
                modes[i] = CBB_MODE_HOME_III

            # HOME II: Šetří baterii na drahou špičku
            # FVE → spotřeba, deficit → grid, baterie NETOUCHED
            # Vyplatí se když: Je drahou špičku později + grid je teď levnější
            elif (
                solar_kwh > 0
                and solar_kwh < load_kwh  # FVE nestačí na spotřebu
                and i < n - 4
            ):  # Není poslední hodina
                # Hledat drahou špičku v budoucnu
                future_prices = [
                    spot_prices[j].get("price", 0) for j in range(i + 1, min(i + 12, n))
                ]
                if future_prices:
                    max_future_price = max(future_prices)
                    # Pokud budoucí špička >40% dražší než teď → HOME II (šetři baterii)
                    if max_future_price > current_price * 1.4:
                        modes[i] = CBB_MODE_HOME_II
                    else:
                        modes[i] = CBB_MODE_HOME_I  # Normální provoz
                else:
                    modes[i] = CBB_MODE_HOME_I
            else:
                # HOME I: Výchozí režim
                modes[i] = CBB_MODE_HOME_I

        # PHASE 5: Najít intervaly kde musíme nabíjet ze sítě (deficit > 0)
        charge_opportunities = []
        battery = current_capacity

        for i in range(n):
            deficit = required_battery[i] - battery
            price = spot_prices[i].get("price", 0)

            if deficit > 0.1:  # Potřebujeme nabít alespoň 100Wh
                charge_opportunities.append(
                    {
                        "index": i,
                        "deficit": deficit,
                        "price": price,
                        "time": spot_prices[i].get("time", ""),
                    }
                )

            # Simulace intervalu s aktuálním režimem
            try:
                timestamp = datetime.fromisoformat(spot_prices[i]["time"])
                solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
            except:
                solar_kwh = 0.0

            load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125

            # Simulace podle režimu
            if modes[i] == CBB_MODE_HOME_I:
                if solar_kwh >= load_kwh:
                    battery += solar_kwh - load_kwh
                else:
                    battery -= (load_kwh - solar_kwh) / efficiency
            elif modes[i] == CBB_MODE_HOME_II:
                # Grid doplňuje, baterie netouched když FVE < load
                if solar_kwh >= load_kwh:
                    battery += solar_kwh - load_kwh
                # else: baterie nezmění (grid pokrývá deficit)
            elif modes[i] == CBB_MODE_HOME_III:
                # Celá FVE → baterie, spotřeba → grid
                battery += solar_kwh  # Vše do baterie
                # Spotřeba je ze gridu, baterie se netýká

            battery = max(0, min(battery, max_capacity))

        # PHASE 6: Seřadit charging opportunities podle ceny (vzestupně)
        charge_opportunities.sort(key=lambda x: x["price"])

        _LOGGER.info(f"⚡ Found {len(charge_opportunities)} charging opportunities")

        # PHASE 7: Přidat HOME UPS na nejlevnějších intervalech
        # BALANCING MODE: Speciální logika s deadline a holding period
        # NORMAL MODE: Nejlevnější intervaly pro minimum/target

        ups_intervals_added = 0

        if is_balancing_mode and charging_deadline and holding_start and holding_end:
            # === BALANCING MODE: 3 priority charging selection ===

            # Priorita 1: Preferované charging_intervals (pokud jsou dostupné)
            preferred_used = 0
            for i, sp in enumerate(spot_prices):
                try:
                    ts = datetime.fromisoformat(sp["time"])
                    if ts.tzinfo is None:
                        ts = dt_util.as_local(ts)

                    # Pokud je to preferovaný interval A potřebujeme nabíjet A je před deadline
                    if ts in preferred_charging_intervals and ts < charging_deadline:
                        deficit = required_battery[i] - current_capacity
                        if deficit > 0.1:  # Potřebujeme nabít
                            modes[i] = CBB_MODE_HOME_UPS
                            preferred_used += 1
                            _LOGGER.debug(
                                f"  → [BALANCING-PREFERRED] Interval {i} @ {ts.strftime('%H:%M')}, "
                                f"price={sp.get('price', 0):.2f}, deficit={deficit:.2f} kWh"
                            )
                except (ValueError, TypeError):
                    continue

            # Priorita 2: Doplnit nejlevnější intervaly PŘED deadline pokud preferované nestačí
            # Filtrovat jen intervaly před deadline
            deadline_index = None
            for i, sp in enumerate(spot_prices):
                try:
                    ts = datetime.fromisoformat(sp["time"])
                    if ts.tzinfo is None:
                        ts = dt_util.as_local(ts)
                    if ts >= charging_deadline:
                        deadline_index = i
                        break
                except (ValueError, TypeError):
                    continue

            if deadline_index is None:
                deadline_index = n

            opportunities_before_deadline = [
                opp
                for opp in charge_opportunities
                if opp["index"] < deadline_index
                and modes[opp["index"]] != CBB_MODE_HOME_UPS
            ]
            opportunities_before_deadline.sort(key=lambda x: x["price"])

            additional_added = 0
            for opp in opportunities_before_deadline[
                :20
            ]:  # Max 20 dodatečných intervalů
                idx = opp["index"]
                modes[idx] = CBB_MODE_HOME_UPS
                additional_added += 1
                _LOGGER.debug(
                    f"  → [BALANCING-CHEAPEST] Interval {idx}, "
                    f"price={opp['price']:.2f}, deficit={opp['deficit']:.2f} kWh"
                )

            # Priorita 3: HOLDING period - HOME UPS po celou dobu držení
            holding_intervals = 0
            for i, sp in enumerate(spot_prices):
                try:
                    ts = datetime.fromisoformat(sp["time"])
                    if ts.tzinfo is None:
                        ts = dt_util.as_local(ts)
                    ts_end = ts + timedelta(minutes=15)

                    # Interval překrývá holding period?
                    if ts < holding_end and ts_end > holding_start:
                        if modes[i] != CBB_MODE_HOME_UPS:
                            holding_intervals += 1
                        modes[i] = CBB_MODE_HOME_UPS  # Držet 100%
                except (ValueError, TypeError):
                    continue

            ups_intervals_added = preferred_used + additional_added + holding_intervals

            _LOGGER.warning(
                f"⚡ BALANCING charging plan: preferred={preferred_used}, "
                f"additional_cheapest={additional_added}, holding={holding_intervals}, "
                f"total_UPS={ups_intervals_added}"
            )

            # Feasibility check: Máme dost času na nabití?
            total_charging_kwh = (
                preferred_used + additional_added
            ) * max_charge_per_interval
            required_kwh = max(0, max_capacity - current_capacity)

            if total_charging_kwh < required_kwh * 0.95:  # Safety margin 5%
                _LOGGER.error(
                    f"⚠️  BALANCING WARNING: May NOT reach 100% by deadline! "
                    f"Can charge {total_charging_kwh:.2f} kWh, need {required_kwh:.2f} kWh. "
                    f"Consider adding more intervals or starting earlier."
                )
            else:
                _LOGGER.info(
                    f"✅ Balancing feasibility OK: can charge {total_charging_kwh:.2f} kWh, "
                    f"need {required_kwh:.2f} kWh"
                )

        else:
            # === NORMAL HYBRID MODE: Nejlevnější intervaly ===
            charging_reason = "MINIMUM" if needs_charging_for_minimum else "TARGET"

            for opp in charge_opportunities[:20]:  # Max 20 nabíjecích intervalů (5h)
                idx = opp["index"]
                price = opp["price"]

                modes[idx] = CBB_MODE_HOME_UPS
                ups_intervals_added += 1
                _LOGGER.debug(
                    f"  → [{charging_reason}] Interval {idx}: price={price:.2f}, deficit={opp['deficit']:.2f} kWh"
                )

            _LOGGER.info(
                f"✅ Added {ups_intervals_added} HOME UPS intervals for {charging_reason} (charging enabled)"
            )

        # PHASE 8: Enforce minimum mode duration (HOME UPS musí běžet min 30 min)
        min_duration = MIN_MODE_DURATION.get("Home UPS", 2)
        i = 0
        while i < len(modes):
            if modes[i] == CBB_MODE_HOME_UPS:
                # Extend UPS to minimum duration
                for j in range(i, min(i + min_duration, len(modes))):
                    modes[j] = CBB_MODE_HOME_UPS
                i += min_duration
            else:
                i += 1

        # PHASE 9: Transition optimization - merge blízké UPS intervaly
        # Pokud je gap jen 1 interval a cena gap < transition cost → merge
        i = 0
        while i < len(modes) - 2:
            if (
                modes[i] == CBB_MODE_HOME_UPS
                and modes[i + 1]
                in [CBB_MODE_HOME_I, CBB_MODE_HOME_II, CBB_MODE_HOME_III]
                and modes[i + 2] == CBB_MODE_HOME_UPS
            ):
                # Gap of 1 interval - check if worth merging
                gap_price = spot_prices[i + 1].get("price", 0)
                gap_cost = gap_price * max_charge_per_interval  # Cost to charge in gap

                # Transition cost: 2× switch (UPS→I + I→UPS)
                transition_loss = TRANSITION_COSTS.get(("Home UPS", "Home I"), {}).get(
                    "energy_loss_kwh", 0.02
                )
                transition_loss += TRANSITION_COSTS.get(("Home I", "Home UPS"), {}).get(
                    "energy_loss_kwh", 0.05
                )
                transition_cost_czk = transition_loss * gap_price

                if gap_cost < transition_cost_czk:
                    modes[i + 1] = CBB_MODE_HOME_UPS  # Merge gap
                    _LOGGER.debug(
                        f"🔀 Merged gap at interval {i+1}: gap_cost={gap_cost:.2f} < transition_cost={transition_cost_czk:.2f}"
                    )
            i += 1

        # Count modes
        mode_counts = {
            "HOME I": modes.count(CBB_MODE_HOME_I),
            "HOME II": modes.count(CBB_MODE_HOME_II),
            "HOME III": modes.count(CBB_MODE_HOME_III),
            "HOME UPS": modes.count(CBB_MODE_HOME_UPS),
        }
        _LOGGER.info(
            f"✅ Hybrid result: HOME I={mode_counts['HOME I']}, "
            f"HOME II={mode_counts['HOME II']}, HOME III={mode_counts['HOME III']}, "
            f"HOME UPS={mode_counts['HOME UPS']}"
        )

        # PHASE 2.10: Baselines already calculated at function start
        # (to make them available even if we return early from economic check)

        # =====================================================================
        # PHASE 6.5: MIN_MODE_DURATION - Zamezit flappingu režimů
        # =====================================================================
        # Podle REFACTORING_IMPLEMENTATION_GUIDE.md:
        # - HOME UPS: minimálně 2 intervaly (30 minut)
        # - HOME I/II: minimálně 1 interval (15 minut)
        # Důvod: Časté přepínání způsobuje ztráty energie a opotřebení hardware

        modes = self._enforce_min_mode_duration(modes)

        # =====================================================================
        # PHASE 7: Planning Minimum Validation
        # =====================================================================
        # Podle REFACTORING_IMPLEMENTATION_GUIDE.md:
        # - Kontrola že baterie NIKDY neklesne pod planning_min (33% = 5.07 kWh)
        # - Pokud ANO → přidat HOME UPS charging v nejlevnějších nočních intervalech
        # - Iterativní proces: simuluj → detekuj porušení → oprav → opakuj

        modes = self._validate_planning_minimum(
            modes=modes,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            min_capacity=min_capacity,  # planning_min = 33%
            physical_min_capacity=physical_min_capacity,  # hw_min = 20%
            efficiency=efficiency,
        )

        return self._build_result(
            modes,
            spot_prices,
            export_prices,
            solar_forecast,
            load_forecast,
            current_capacity,
            max_capacity,
            min_capacity,
            efficiency,
            baselines=baselines,  # Pass baselines to _build_result
            physical_min_capacity=physical_min_capacity,  # Pass physical minimum
        )

    def _enforce_min_mode_duration(self, modes: List[int]) -> List[int]:
        """
        PHASE 6.5: Vynucení minimální doby trvání režimu (MIN_MODE_DURATION).

        Podle REFACTORING_IMPLEMENTATION_GUIDE.md:
        - HOME UPS musí běžet minimálně 2 intervaly (30 minut)
        - HOME I/II musí běžet minimálně 1 interval (15 minut)

        Důvod: Časté přepínání způsobuje:
        - Ztráty energie při přechodu mezi režimy
        - Opotřebení hardware (relé, měnič)
        - Nestabilní chování systému

        Args:
            modes: Seznam režimů (list of int, 0-3)

        Returns:
            Upravený seznam režimů s vynucenou minimální dobou trvání
        """
        if not modes:
            return modes

        # Mode name mapping for logging
        mode_names = {
            CBB_MODE_HOME_I: "Home I",
            CBB_MODE_HOME_II: "Home II",
            CBB_MODE_HOME_III: "Home III",
            CBB_MODE_HOME_UPS: "Home UPS",
        }

        result = modes.copy()
        n = len(result)
        i = 0
        violations_fixed = 0

        while i < n:
            current_mode = result[i]
            mode_name = mode_names.get(current_mode, f"Mode {current_mode}")

            # Najít délku aktuálního bloku
            block_start = i
            while i < n and result[i] == current_mode:
                i += 1
            block_length = i - block_start

            # Kontrola min duration
            min_duration = MIN_MODE_DURATION.get(mode_name, 1)

            if block_length < min_duration:
                # Violation! Krátký blok - rozšířit nebo odstranit
                violations_fixed += 1

                # Strategie: Převést na sousední režim (jednodušší než extension)
                # Pokud je to první blok → vezmi následující režim
                # Pokud je to poslední blok → vezmi předchozí režim
                # Jinak → vezmi ten co je častější v okolí

                if block_start == 0:
                    # První blok → vezmi následující
                    replacement_mode = result[i] if i < n else CBB_MODE_HOME_I
                elif i >= n:
                    # Poslední blok → vezmi předchozí
                    replacement_mode = result[block_start - 1]
                else:
                    # Uprostřed → vezmi předchozí (konzervativní přístup)
                    replacement_mode = result[block_start - 1]

                # Převeď celý blok
                for j in range(block_start, min(i, n)):
                    result[j] = replacement_mode

                _LOGGER.debug(
                    f"[MIN_DURATION] Fixed violation: {mode_name} block @ {block_start} "
                    f"(length {block_length} < min {min_duration}) → {mode_names.get(replacement_mode, 'unknown')}"
                )

                # Reset index aby se re-evaluoval merged blok
                i = block_start

        if violations_fixed > 0:
            _LOGGER.info(f"✅ MIN_MODE_DURATION: Fixed {violations_fixed} violations")

        return result

    def _validate_planning_minimum(
        self,
        modes: List[int],
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,  # planning_min = 33%
        physical_min_capacity: float,  # hw_min = 20%
        efficiency: float,
    ) -> List[int]:
        """
        PHASE 7: Validace planning minimum (33% = 5.07 kWh).

        PREEMPTIVE MULTI-INTERVAL CHARGING (B+light D strategy):
        - Simuluje timeline s HW minimum (fyzika nezná planning_min!)
        - Detekuje první violation planning_min
        - Spočítá deficit_kwh (kolik chybí k planning_min + rezerva)
        - Vybere VÍCE levných intervalů PŘED violation (ne jen 1 noční!)
        - Iteruje dokud není porušení opraveno (max 5 iterací)

        Podle REFACTORING_IMPLEMENTATION_GUIDE.md:
        - Simulace používá POUZE physical_min_capacity (hw_min)
        - Planning_min je plánovací constraint (validace výsledku)
        - Žádný clamp na planning_min v simulaci!

        Args:
            modes: Aktuální režimy (list of int)
            spot_prices: Timeline spot cen
            export_prices: Timeline export cen
            solar_forecast: Solární předpověď
            load_forecast: Předpověď spotřeby
            current_capacity: Aktuální SoC (kWh)
            max_capacity: Max kapacita (kWh)
            min_capacity: Planning minimum (kWh, typicky 33% = 5.07)
            physical_min_capacity: HW minimum (kWh, typicky 20% = 3.07)
            efficiency: Účinnost baterie

        Returns:
            Upravený seznam režimů garantující dodržení planning_min
        """
        MAX_ITERATIONS = 5
        SAFETY_MARGIN = 1.10  # Nabít +10% nad planning_min pro rezervu

        # Načíst charging power z konfigurace
        config = (
            self._config_entry.options
            if self._config_entry and self._config_entry.options
            else self._config_entry.data if self._config_entry else {}
        )
        charging_power_kw = config.get("home_charge_rate", 2.8)
        max_charge_per_interval = charging_power_kw / 4.0  # kWh za 15min

        for iteration in range(MAX_ITERATIONS):
            # 1. Simuluj timeline a najdi porušení (s violation SoC)
            violation_result = self._find_first_planning_violation_with_soc(
                modes=modes,
                spot_prices=spot_prices,
                export_prices=export_prices,
                solar_forecast=solar_forecast,
                load_forecast=load_forecast,
                current_capacity=current_capacity,
                max_capacity=max_capacity,
                min_capacity=min_capacity,
                physical_min_capacity=physical_min_capacity,
                efficiency=efficiency,
            )

            if violation_result is None:
                # Žádné porušení → hotovo!
                if iteration > 0:
                    _LOGGER.info(
                        f"✅ PLANNING_MIN validation: Fixed all violations in {iteration} iterations"
                    )
                return modes

            violation_index, soc_at_violation, recovery_idx = violation_result

            # 2. Spočítej deficit s bezpečnostní rezervou
            target_soc = min_capacity * SAFETY_MARGIN
            deficit_kwh = max(0.1, target_soc - soc_at_violation)  # Min 100Wh

            # 3. Určit PŘED jakým intervalem nabíjet:
            #    - Pokud recovery_idx > 0: violation začíná OD ZAČÁTKU (interval 0)
            #      → musíme nabít PŘED/V intervalu 0 (nebo co nejdřív)
            #    - Pokud recovery_idx == 0: violation JE až na violation_index
            #      → můžeme nabít PŘED violation_index
            charge_before_index = recovery_idx if recovery_idx > 0 else violation_index

            _LOGGER.info(
                f"[PLANNING_MIN iter {iteration+1}] Violation @ interval {violation_index}: "
                f"SoC={soc_at_violation:.2f} kWh < planning_min={min_capacity:.2f} kWh, "
                f"deficit={deficit_kwh:.2f} kWh (target={target_soc:.2f} kWh), "
                f"recovery={recovery_idx}, charge_before={charge_before_index}"
            )

            # 4. Vyber kandidátní intervaly PŘED charge_before_index (cost-aware)
            candidate_intervals = self._select_charging_intervals_before(
                modes=modes,
                spot_prices=spot_prices,
                before_index=charge_before_index,
                deficit_kwh=deficit_kwh,
                max_charge_per_interval=max_charge_per_interval,
                max_capacity=max_capacity,
            )

            if not candidate_intervals:
                # Nelze opravit (žádné dostupné intervaly)
                _LOGGER.warning(
                    f"⚠️ PLANNING_MIN violation @ interval {violation_index} "
                    f"cannot be fixed (no charging intervals available before, deficit={deficit_kwh:.2f} kWh)"
                )
                return modes  # Vrátit co je (lepší než crash)

            # 4. Přidej HOME UPS v těchto intervalech
            modes = modes.copy()
            for idx in candidate_intervals:
                modes[idx] = CBB_MODE_HOME_UPS

            expected_charge = len(candidate_intervals) * max_charge_per_interval
            _LOGGER.info(
                f"  → Added HOME UPS @ {len(candidate_intervals)} intervals: {candidate_intervals}, "
                f"expected_charge={expected_charge:.2f} kWh (need {deficit_kwh:.2f} kWh)"
            )

        # Max iterace dosaženo
        _LOGGER.warning(
            f"⚠️ PLANNING_MIN validation: Reached max iterations ({MAX_ITERATIONS}), "
            f"some violations may remain"
        )
        return modes

    def _find_first_planning_violation(
        self,
        modes: List[int],
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        physical_min_capacity: float,
        efficiency: float,
    ) -> Optional[int]:
        """
        Najít první interval kde baterie klesne pod planning_min.

        LEGACY VERSION - vrací jen index.
        Pro novou logiku použij _find_first_planning_violation_with_soc().

        ZÁSADY:
        - Simulace vždy používá physical_min_capacity (HW minimum ~20%)
        - Planning_min (~25%) je PLÁNOVACÍ constraint, ne fyzikální limit
        - Kontrola začíná od recovery_index (kdy SoC >= planning_min)
        - Pokud current_soc < planning_min, snažíme se dostat zpět nad, pak kontrolujeme

        Returns:
            Index prvního intervalu s porušením, nebo None pokud žádné
        """
        result = self._find_first_planning_violation_with_soc(
            modes=modes,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            physical_min_capacity=physical_min_capacity,
            efficiency=efficiency,
        )
        return result[0] if result else None

    def _find_first_planning_violation_with_soc(
        self,
        modes: List[int],
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        physical_min_capacity: float,
        efficiency: float,
    ) -> Optional[tuple[int, float, int]]:
        """
        Najít první interval kde baterie klesne pod planning_min.

        ENHANCED VERSION - vrací (index, soc_at_violation, recovery_index) pro deficit calculation.

        ZÁSADY:
        - Simulace vždy používá physical_min_capacity (HW minimum ~20%)
        - Planning_min (~25%) je PLÁNOVACÍ constraint, ne fyzikální limit
        - Kontrola začíná od recovery_index (kdy SoC >= planning_min)
        - Pokud current_soc < planning_min, snažíme se dostat zpět nad, pak kontrolujeme

        Returns:
            Tuple (violation_index, soc_at_violation, recovery_index) nebo None pokud žádné porušení
        """
        battery_soc = current_capacity
        recovery_index = None  # První interval kde SoC >= planning_min

        # Pokud už začínáme nad planning_min, recovery je hned
        if battery_soc >= min_capacity:
            recovery_index = 0

        for i, mode in enumerate(modes):
            # Získat data pro interval
            spot_price = (
                spot_prices[i].get("price", 0.0) if i < len(spot_prices) else 0.0
            )
            export_price = (
                export_prices[i].get("price", 0.0) if i < len(export_prices) else 0.0
            )
            load_kwh = load_forecast[i] if i < len(load_forecast) else 0.0

            # Get solar
            solar_kwh = 0.0
            try:
                timestamp_str = spot_prices[i].get("time", "")
                timestamp = datetime.fromisoformat(timestamp_str)
                solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
            except Exception:
                solar_kwh = 0.0

            # Simuluj interval s FYZICKÝM HW minimem (NIKDY planning_min!)
            sim_result = self._simulate_interval(
                mode=mode,
                solar_kwh=solar_kwh,
                load_kwh=load_kwh,
                battery_soc_kwh=battery_soc,
                capacity_kwh=max_capacity,
                hw_min_capacity_kwh=physical_min_capacity,  # Reálné HW minimum!
                spot_price_czk=spot_price,
                export_price_czk=export_price,
                charge_efficiency=efficiency,
                discharge_efficiency=efficiency,
            )

            battery_soc = sim_result["new_soc_kwh"]

            # Najít recovery_index (kdy se poprvé dostaneme nad planning_min)
            if recovery_index is None and battery_soc >= min_capacity:
                recovery_index = i
                _LOGGER.debug(
                    f"[PLANNING_MIN] Recovery @ interval {i}: SoC={battery_soc:.2f} kWh >= {min_capacity:.2f} kWh"
                )

            # Kontrola planning_min violation JEN PO recovery
            # Pokud jsme se jednou dostali nad planning_min, nesmíme zpět pod
            if recovery_index is not None and i > recovery_index:
                if battery_soc < min_capacity - 0.01:  # 10Wh tolerance
                    _LOGGER.debug(
                        f"[PLANNING_MIN] Violation @ interval {i}: "
                        f"SoC={battery_soc:.2f} kWh < planning_min={min_capacity:.2f} kWh "
                        f"(recovery was @ {recovery_index})"
                    )
                    return (i, battery_soc, recovery_index)

        # Pokud jsme nikdy nedosáhli recovery
        if recovery_index is None:
            _LOGGER.warning(
                f"[PLANNING_MIN] Cannot reach planning_min in entire timeline "
                f"(started @ {current_capacity:.2f} kWh, need {min_capacity:.2f} kWh)"
            )

        return None  # Žádné porušení

    def _select_charging_intervals_before(
        self,
        modes: List[int],
        spot_prices: List[Dict[str, Any]],
        before_index: int,
        deficit_kwh: float,
        max_charge_per_interval: float,
        max_capacity: float,
    ) -> List[int]:
        """
        Vybrat více levných intervalů PŘED violation pro proaktivní nabíjení.

        PREEMPTIVE MULTI-INTERVAL STRATEGY (B+light D):
        - Kandidáti = všechny intervaly 0..before_index-1
        - Filtr: nejsou už HOME UPS, mají volnou kapacitu
        - Seřazení: podle ceny (levné první), sekundárně podle času (blíže k violation)
        - Výběr: tolik intervalů, aby součet nabití ≥ deficit_kwh

        Args:
            modes: Aktuální režimy
            spot_prices: Timeline spot cen
            before_index: Violation index (vybíráme PŘED tímto indexem)
            deficit_kwh: Kolik kWh potřebujeme dobít
            max_charge_per_interval: Max nabíjecí výkon za 15min (kWh)
            max_capacity: Max kapacita baterie (kWh)

        Returns:
            Seznam indexů pro HOME UPS nabíjení (seřazeno podle času)
        """
        candidates = []

        for i in range(before_index):
            # Skip pokud už je HOME UPS (nepřepisujeme existující logiku)
            if modes[i] == CBB_MODE_HOME_UPS:
                continue

            # Skip pokud nemáme cenu
            if i >= len(spot_prices):
                continue

            price = spot_prices[i].get("price", 999.0)

            # Přidat jako kandidáta
            # (index, price, time_distance_to_violation)
            time_distance = before_index - i  # Čím menší, tím blíž k violation
            candidates.append((i, price, time_distance))

        if not candidates:
            return []

        # Seřadit: primárně podle ceny (ASC), sekundárně podle času (DESC = blíž k violation)
        # Cost-aware: preferujeme levnější intervaly
        # Time-aware: při stejné ceně preferujeme bližší k violation
        candidates.sort(key=lambda x: (x[1], -x[2]))

        # Vybrat tolik intervalů, aby součet nabití ≥ deficit_kwh
        selected_indices = []
        accumulated_charge = 0.0

        for idx, price, _ in candidates:
            selected_indices.append(idx)
            accumulated_charge += max_charge_per_interval

            # Pokud máme dost, končíme
            if accumulated_charge >= deficit_kwh:
                break

            # Ochrana před příliš mnoha intervaly (max 20 = 5h nabíjení)
            if len(selected_indices) >= 20:
                _LOGGER.warning(
                    f"⚠️ Reached max charging intervals (20), "
                    f"accumulated={accumulated_charge:.2f} kWh < deficit={deficit_kwh:.2f} kWh"
                )
                break

        # Seřadit výsledek podle času (pro konzistentní timeline)
        selected_indices.sort()

        return selected_indices

    def _find_cheapest_night_interval_before(
        self,
        spot_prices: List[Dict[str, Any]],
        before_index: int,
    ) -> Optional[int]:
        """
        Najít nejlevnější noční interval (22:00-06:00) před daným indexem.

        Args:
            spot_prices: Timeline spot cen
            before_index: Index před kterým hledat

        Returns:
            Index nejlevnějšího nočního intervalu, nebo None
        """
        night_intervals = []

        for i in range(before_index):
            try:
                timestamp_str = spot_prices[i].get("time", "")
                timestamp = datetime.fromisoformat(timestamp_str)
                hour = timestamp.hour

                # Noční hodiny: 22:00-06:00
                if hour >= 22 or hour < 6:
                    price = spot_prices[i].get("price", 999.0)
                    night_intervals.append((i, price))
            except Exception:
                continue

        if not night_intervals:
            return None

        # Seřadit podle ceny (ascending)
        night_intervals.sort(key=lambda x: x[1])

        # Vrátit index nejlevnějšího
        return night_intervals[0][0]

    def _build_result(
        self,
        modes: List[int],
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        efficiency: float,
        baselines: Dict[str, Dict[str, Any]] | None = None,
        physical_min_capacity: float | None = None,
    ) -> Dict[str, Any]:
        """
        Sestavit výsledek ve formátu kompatibilní s timeline.

        Args:
            baselines: Optional 4-baseline comparison results from _calculate_mode_baselines()
        """
        config = (
            self._config_entry.options
            if self._config_entry and self._config_entry.options
            else self._config_entry.data if self._config_entry else {}
        )
        charging_power_kw = config.get("home_charge_rate", 2.8)
        max_charge_per_interval = charging_power_kw / 4.0

        # Default physical minimum to 20% if not provided
        if physical_min_capacity is None:
            physical_min_capacity = max_capacity * 0.20

        # Create export price lookup by timestamp
        export_price_lookup = {
            ep["time"]: ep["price"]
            for ep in export_prices
            if "time" in ep and "price" in ep
        }

        timeline = []
        battery = current_capacity
        total_cost = 0.0

        for i, mode in enumerate(modes):
            timestamp_str = spot_prices[i].get("time", "")
            price = spot_prices[i].get("price", 0)
            export_price = export_price_lookup.get(timestamp_str, 0)

            try:
                timestamp = datetime.fromisoformat(timestamp_str)
                solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
            except:
                solar_kwh = 0.0

            load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125

            # Initialize variables for this interval
            grid_import = 0.0
            grid_export = 0.0
            solar_charge_kwh = 0.0  # For stacked graph - calculated in physics
            grid_charge_kwh = 0.0  # For stacked graph - calculated in physics
            available_space = max_capacity - battery

            # Fyzika podle módu - OPRAVENO: Dopředný výpočet místo zpětného
            # Charge hodnoty se počítají PŘED změnou battery, ne po ní
            if mode == CBB_MODE_HOME_UPS:
                # UPS: spotřeba ze sítě, baterie nabíjí ze solaru + gridu
                # KROK 1: Vypočítat kolik REÁLNĚ půjde do baterie (respektovat available_space)
                actual_grid_charge = min(
                    max_charge_per_interval, available_space / efficiency
                )
                space_after_grid = max(0, available_space - actual_grid_charge)
                actual_solar_charge = min(solar_kwh, space_after_grid)

                # KROK 2: Fyzika - aktualizovat battery s okamžitým clampingem
                grid_import = load_kwh + actual_grid_charge
                battery += actual_solar_charge + actual_grid_charge
                battery = min(battery, max_capacity)  # Clamp okamžitě

                # KROK 3: Export přebytku solaru (pokud se nevešel do baterie)
                solar_surplus = solar_kwh - actual_solar_charge
                if solar_surplus > 0.001:  # Tolerance pro zaokrouhlovací chyby
                    grid_export = solar_surplus
                    total_cost -= grid_export * export_price

                total_cost += grid_import * price

                # KROK 4: Uložit charge hodnoty pro graf
                solar_charge_kwh = actual_solar_charge
                grid_charge_kwh = actual_grid_charge

            elif mode == CBB_MODE_HOME_II:
                # HOME II: FVE → spotřeba, grid doplňuje, baterie jen přebytek
                if solar_kwh >= load_kwh:
                    # Přebytek po spotřebě
                    surplus = solar_kwh - load_kwh

                    # KROK 1: Kolik reálně půjde do baterie
                    actual_solar_charge = min(surplus, available_space)

                    # KROK 2: Fyzika
                    battery += actual_solar_charge
                    battery = min(battery, max_capacity)  # Clamp

                    # KROK 3: Export přebytku
                    solar_surplus = surplus - actual_solar_charge
                    if solar_surplus > 0.001:
                        grid_export = solar_surplus
                        total_cost -= grid_export * export_price

                    # KROK 4: Uložit pro graf
                    solar_charge_kwh = actual_solar_charge
                else:
                    # Deficit → GRID doplňuje (baterie se nemění)
                    deficit = load_kwh - solar_kwh
                    grid_import = deficit
                    total_cost += grid_import * price
                    # solar_charge_kwh a grid_charge_kwh zůstávají 0

            elif mode == CBB_MODE_HOME_III:
                # HOME III: CELÁ FVE → baterie, spotřeba → grid
                # KROK 1: Kolik reálně půjde do baterie
                actual_solar_charge = min(solar_kwh, available_space)

                # KROK 2: Fyzika
                battery += actual_solar_charge
                battery = min(battery, max_capacity)  # Clamp

                # KROK 3: Export přebytku
                solar_surplus = solar_kwh - actual_solar_charge
                if solar_surplus > 0.001:
                    grid_export = solar_surplus
                    total_cost -= grid_export * export_price

                # Spotřeba vždy ze sítě
                grid_import = load_kwh
                total_cost += grid_import * price

                # KROK 4: Uložit pro graf
                solar_charge_kwh = actual_solar_charge

            else:  # HOME I (default)
                # HOME I: solar → baterie nebo baterie → load
                if solar_kwh >= load_kwh:
                    # Přebytek
                    surplus = solar_kwh - load_kwh

                    # KROK 1: Kolik reálně půjde do baterie
                    actual_solar_charge = min(surplus, available_space)

                    # KROK 2: Fyzika
                    battery += actual_solar_charge
                    battery = min(battery, max_capacity)  # Clamp

                    # KROK 3: Export přebytku
                    solar_surplus = surplus - actual_solar_charge
                    if solar_surplus > 0.001:
                        grid_export = solar_surplus
                        total_cost -= grid_export * export_price

                    # KROK 4: Uložit pro graf
                    solar_charge_kwh = actual_solar_charge
                else:
                    # Deficit → baterie vybíjí (HOME I fyzika)
                    deficit = load_kwh - solar_kwh  # Kolik chybí po solaru

                    # Kolik máme k dispozici v baterii (nad HW minimem = physical_min!)
                    available_battery = max(0, battery - physical_min_capacity)

                    # Kolik reálně vybereme (s účinností)
                    actual_discharge = min(deficit / efficiency, available_battery)
                    battery -= actual_discharge

                    # Pokrytí ze sítě = zbytek deficitu (co baterie nepokryje)
                    covered_by_battery = actual_discharge * efficiency
                    grid_import = deficit - covered_by_battery

                    if grid_import > 0.001:  # Potřebujeme grid
                        total_cost += grid_import * price

                    # Clamp na HW minimum (physical_min, NE planning_min!)
                    battery = max(battery, physical_min_capacity)

                    # solar_charge_kwh a grid_charge_kwh zůstávají 0 (vybíjení)

            # Validace (pro debugging)
            if battery > max_capacity + 0.001:  # Tolerance
                _LOGGER.warning(
                    f"Battery exceeds max capacity: {battery:.3f} > {max_capacity:.3f} "
                    f"at {timestamp_str}, mode={mode}"
                )
            if solar_charge_kwh < -0.001 or grid_charge_kwh < -0.001:
                _LOGGER.warning(
                    f"Negative charge values: solar={solar_charge_kwh:.3f}, grid={grid_charge_kwh:.3f} "
                    f"at {timestamp_str}, mode={mode}"
                )

            interval_cost = grid_import * price - grid_export * price

            timeline.append(
                {
                    "time": timestamp_str,
                    "timestamp": timestamp_str,  # Alias pro zpětnou kompatibilitu s dashboardem
                    "battery_soc": battery,
                    "battery_capacity_kwh": battery,  # Alias pro zpětnou kompatibilitu s dashboardem
                    "mode": mode,
                    "mode_name": CBB_MODE_NAMES.get(mode, "Unknown"),
                    "solar_kwh": solar_kwh,
                    "load_kwh": load_kwh,
                    "grid_import": grid_import,
                    "grid_export": grid_export,
                    "spot_price": price,
                    "spot_price_czk": price,  # Alias pro zpětnou kompatibilitu
                    "export_price_czk": export_price,  # Phase 1.5: Export (sell) price
                    "net_cost": interval_cost,
                    "solar_charge_kwh": round(solar_charge_kwh, 3),  # For stacked graph
                    "grid_charge_kwh": round(grid_charge_kwh, 3),  # For stacked graph
                }
            )

        # Mode recommendations - použít _create_mode_recommendations() pro bloky s detaily
        mode_recommendations = self._create_mode_recommendations(
            timeline, hours_ahead=48
        )

        # Calculate 48h cost for dashboard (DNES+ZÍTRA only, bez včera)
        now = dt_util.now()
        today_start = datetime.combine(now.date(), datetime.min.time())
        today_start = dt_util.as_local(today_start)  # Always timezone-aware
        tomorrow_end = today_start + timedelta(hours=48)

        total_cost_48h = 0.0
        for interval in timeline:
            if not interval.get("time"):
                continue
            try:
                interval_time = datetime.fromisoformat(interval["time"])
                # Normalize timezone for comparison
                if interval_time.tzinfo is None:
                    interval_time = dt_util.as_local(interval_time)
                if today_start <= interval_time < tomorrow_end:
                    total_cost_48h += interval.get("net_cost", 0)
            except:
                continue

        # Calculate HOME I baseline cost for 48h (pro výpočet úspory)
        baseline_cost_48h = 0.0
        battery_baseline = current_capacity
        for interval in timeline:
            if not interval.get("time"):
                continue
            try:
                interval_time = datetime.fromisoformat(interval["time"])
                # Normalize timezone for comparison
                if interval_time.tzinfo is None:
                    interval_time = dt_util.as_local(interval_time)
                if not (today_start <= interval_time < tomorrow_end):
                    continue
            except:
                continue

            # HOME I simulation
            solar_kwh = interval.get("solar_kwh", 0)
            load_kwh = interval.get("load_kwh", 0.125)
            price = interval.get("spot_price", 0)

            grid_import = 0.0
            grid_export = 0.0

            if solar_kwh >= load_kwh:
                surplus = solar_kwh - load_kwh
                battery_baseline += surplus
                if battery_baseline > max_capacity:
                    grid_export = battery_baseline - max_capacity
                    battery_baseline = max_capacity
                    baseline_cost_48h -= grid_export * price
            else:
                deficit = load_kwh - solar_kwh
                battery_baseline -= deficit / efficiency
                if battery_baseline < 0:
                    grid_import = -battery_baseline * efficiency
                    battery_baseline = 0
                    baseline_cost_48h += grid_import * price

            battery_baseline = max(0, min(battery_baseline, max_capacity))

        total_savings_48h = max(0, baseline_cost_48h - total_cost_48h)

        # Generate what-if alternatives for dashboard tile
        alternatives = self._generate_alternatives(
            spot_prices=spot_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
            optimal_cost_48h=total_cost_48h,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            efficiency=efficiency,
        )

        # PHASE 2.10: Add baseline comparison and validation
        result = {
            "optimal_timeline": timeline,
            "optimal_modes": modes,
            "total_cost": total_cost,
            "total_cost_48h": total_cost_48h,  # For dashboard tile (DNES+ZÍTRA)
            "total_savings_48h": total_savings_48h,  # Savings vs HOME I baseline
            "mode_recommendations": mode_recommendations,
            "alternatives": alternatives,  # What-if analysis for tile
        }

        # Add 4-baseline comparison if available
        if baselines:
            result["baselines"] = baselines

            # Find best baseline - používá ADJUSTED cost (cost + penalty)
            best_baseline_name = min(
                baselines.items(), key=lambda x: x[1]["adjusted_total_cost"]
            )[0]
            best_baseline = baselines[best_baseline_name]
            best_baseline_cost = best_baseline["total_cost"]
            best_baseline_adjusted = best_baseline["adjusted_total_cost"]
            best_baseline_penalty = best_baseline["penalty_cost"]
            best_baseline_violations = best_baseline["planning_violations"]

            # Calculate savings vs best baseline (using adjusted costs for fair comparison)
            savings_vs_best = max(0, best_baseline_adjusted - total_cost)
            savings_percentage = (
                (savings_vs_best / best_baseline_adjusted * 100)
                if best_baseline_adjusted > 0
                else 0
            )

            result["best_baseline"] = best_baseline_name
            result["best_baseline_cost"] = best_baseline_cost
            result["best_baseline_adjusted"] = best_baseline_adjusted
            result["best_baseline_penalty"] = best_baseline_penalty
            result["hybrid_cost"] = total_cost
            result["savings_vs_best"] = round(savings_vs_best, 2)
            result["savings_percentage"] = round(savings_percentage, 1)

            # Build penalty info string for logging
            penalty_info = ""
            if best_baseline_violations > 0:
                penalty_info = (
                    f" (penalty: {best_baseline_penalty:.2f} Kč "
                    f"for {best_baseline_violations} violations)"
                )

            # VALIDATION: HYBRID must be <= best baseline (adjusted cost)
            if total_cost > best_baseline_adjusted + 0.01:  # 0.01 Kč tolerance
                _LOGGER.warning(
                    f"⚠️  HYBRID OPTIMIZATION BUG! HYBRID cost ({total_cost:.2f} Kč) > "
                    f"best baseline {best_baseline_name} ({best_baseline_adjusted:.2f} Kč adjusted){penalty_info}. "
                    f"This should NEVER happen!"
                )
            else:
                _LOGGER.info(
                    f"✅ HYBRID validation passed: {total_cost:.2f} Kč <= "
                    f"{best_baseline_name} {best_baseline_adjusted:.2f} Kč adjusted{penalty_info} "
                    f"(saves {savings_vs_best:.2f} Kč, {savings_percentage:.1f}%)"
                )

        return result

    def _generate_alternatives(
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
                except:
                    continue

                # Get input data from forecasts
                try:
                    solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
                except:
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

        # Phase 2.7: Store HOME I timeline cache for savings calculation
        if home_i_timeline_cache:
            self._home_i_timeline_cache = home_i_timeline_cache
            _LOGGER.debug(
                f"[What-If] Cached HOME I timeline: {len(home_i_timeline_cache)} intervals, "
                f"total_cost={alternatives['HOME I']['cost_czk']:.2f} Kč"
            )

        # Add DO NOTHING (current optimized plan)
        alternatives["DO NOTHING"] = {
            "cost_czk": round(optimal_cost_48h, 2),
            "delta_czk": 0.0,
            "current_mode": "Optimized",
        }

        return alternatives

    def _enforce_min_capacity_constraint(
        self,
        optimal_timeline: List[Dict[str, Any]],
        optimal_modes: List[int],
        min_capacity: float,
        max_capacity: float,
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
        current_capacity: float,
        physical_min_capacity: float | None = None,
    ) -> tuple[List[Dict[str, Any]], List[int]]:
        """
        PHASE 2.8: Post-processing - oprav timeline aby nikdy neklesl pod min_capacity.

        Strategie:
        1. Simuluj timeline s DP módy a najdi první porušení min_capacity
        2. Vrat se zpět k nejlevnějším intervalům PŘED porušením
        3. Přidej HOME UPS nabíjení nebo změň HOME II→HOME I (podle ceny)
        4. Opakuj dokud žádné porušení neexistuje

        Args:
            optimal_timeline: Timeline z DP optimalizace
            optimal_modes: Módy z DP optimalizace
            min_capacity: Minimální povolená kapacita baterie
            max_capacity: Maximální kapacita baterie
            spot_prices: Spotové ceny
            export_prices: Export prices
            solar_forecast: Solární předpověď
            load_forecast: Předpověď spotřeby
            current_capacity: Aktuální kapacita baterie

        Returns:
            (opravený_timeline, opravené_módy)
        """
        MAX_ITERATIONS = 10  # Ochrana proti nekonečné smyčce
        iteration = 0

        # Get battery efficiency for simulations
        efficiency = self._get_battery_efficiency()

        while iteration < MAX_ITERATIONS:
            iteration += 1

            # 1. Simuluj timeline a najdi porušení
            violation_index = None
            battery_soc = current_capacity

            _LOGGER.debug(
                f"POST-PROC Iteration {iteration}: Starting simulation from battery={battery_soc:.2f} kWh"
            )

            for i, (timeline_point, mode) in enumerate(
                zip(optimal_timeline, optimal_modes)
            ):
                # Timeline má klíče: solar_kwh, load_kwh, spot_price (ne solar_production!)
                solar_kwh = timeline_point.get("solar_kwh", 0.0)
                load_kwh = timeline_point.get("load_kwh", 0.0)

                # TODO 3: Přechod na novou _simulate_interval()
                # DŮLEŽITÉ: Tady používáme OBĚ minima - physical (hw) i planning (user)
                sim_result = self._simulate_interval(
                    mode=mode,
                    solar_kwh=solar_kwh,
                    load_kwh=load_kwh,
                    battery_soc_kwh=battery_soc,  # NEW: kwh suffix
                    capacity_kwh=max_capacity,  # NEW: kwh suffix
                    hw_min_capacity_kwh=physical_min_capacity,  # NEW: correct hw_min!
                    spot_price_czk=timeline_point.get(
                        "spot_price", 0.0
                    ),  # NEW: czk suffix
                    export_price_czk=timeline_point.get(
                        "export_price", 0.0
                    ),  # NEW: czk suffix
                    charge_efficiency=efficiency,
                    discharge_efficiency=efficiency,
                )

                battery_soc = sim_result["new_soc_kwh"]  # NEW: kwh suffix

                # Debug: Log každých 10 intervalů + kritické případy
                if i % 10 == 0 or battery_soc < min_capacity + 0.5 or i < 5:
                    mode_name = CBB_MODE_NAMES.get(mode, f"MODE_{mode}")
                    _LOGGER.debug(
                        f"POST-PROC [{iteration}] interval {i:3d}: battery={battery_soc:.2f} kWh, "
                        f"mode={mode_name}, solar={solar_kwh:.3f}, load={load_kwh:.3f}, "
                        f"grid_import={sim_result.get('grid_import', 0):.3f}"
                    )

                # Zkontroluj porušení
                if battery_soc < min_capacity:
                    violation_index = i
                    _LOGGER.info(
                        f"⚠️ Iteration {iteration}: Violation at interval {i} "
                        f"(battery={battery_soc:.2f} < min={min_capacity:.2f})"
                    )
                    break

            # 2. Pokud žádné porušení, hotovo!
            if violation_index is None:
                _LOGGER.info(
                    f"✅ Min capacity constraint satisfied after {iteration} iteration(s)"
                )
                break

            # 3. Najdi nejlevnější intervaly PŘED porušením
            # Potřebujeme nabít baterii o deficit_kwh
            deficit_kwh = min_capacity - battery_soc

            # Vytvoř list kandidátů: intervaly PŘED violation_index
            candidates = []
            for i in range(violation_index):
                mode = optimal_modes[i]
                price = spot_prices[i].get("price", 0.0)

                # Kandidát: intervaly kde můžeme přidat nabíjení nebo snížit vybíjení
                # HOME I/II/III → můžeme změnit na HOME UPS (nabíjení)
                # HOME UPS → už nabíjí, můžeme skipnout
                if mode != CBB_MODE_HOME_UPS:
                    candidates.append(
                        {
                            "index": i,
                            "price": price,
                            "current_mode": mode,
                        }
                    )

            # Seřaď podle ceny (nejlevnější první)
            candidates.sort(key=lambda x: x["price"])

            # 4. Přidej HOME UPS nabíjení v nejlevnějších intervalech
            # Potřebujeme nabít deficit_kwh
            # HOME UPS nabíjí ~0.7 kWh/15min (2.8 kW * 0.25h)
            charge_per_interval = 0.7  # kWh
            intervals_needed = int(np.ceil(deficit_kwh / charge_per_interval))

            _LOGGER.info(
                f"  Need {deficit_kwh:.2f} kWh → {intervals_needed} intervals of HOME UPS charging"
            )

            # Změň módy v nejlevnějších intervalech
            changed_count = 0
            for candidate in candidates[:intervals_needed]:
                idx = candidate["index"]
                optimal_modes[idx] = CBB_MODE_HOME_UPS
                optimal_timeline[idx]["mode"] = CBB_MODE_HOME_UPS
                optimal_timeline[idx]["mode_name"] = "HOME UPS"
                changed_count += 1

            _LOGGER.info(
                f"  Changed {changed_count} intervals to HOME UPS (cheapest before violation)"
            )

        if iteration >= MAX_ITERATIONS:
            _LOGGER.error(
                f"❌ Failed to enforce min_capacity after {MAX_ITERATIONS} iterations! "
                "Timeline may still violate minimum."
            )

        return optimal_timeline, optimal_modes

    def _calculate_timeline(
        self,
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        spot_prices: List[Dict[str, Any]],
        export_prices: List[Dict[str, Any]],  # Phase 1.5: Export prices timeline
        solar_forecast: Dict[str, Any],
        load_avg_sensors: Dict[str, Any],
        adaptive_profiles: Optional[Dict[str, Any]] = None,
        balancing_plan: Optional[
            Dict[str, Any]
        ] = None,  # DEPRECATED: Use self._active_charging_plan instead
        mode: Optional[
            int
        ] = None,  # Phase 2: CBB mode for forecast (None = use current mode)
    ) -> List[Dict[str, Any]]:
        """
        Vypočítat timeline predikce baterie.

        Args:
            current_capacity: Aktuální kapacita baterie (kWh)
            max_capacity: Maximální kapacita baterie (kWh)
            min_capacity: Minimální kapacita baterie (kWh)
            spot_prices: Timeline spotových cen (15min intervaly) - nákupní cena
            export_prices: Timeline prodejních cen (15min intervaly) - Phase 1.5
            solar_forecast: Solární předpověď (hodinové hodnoty)
            load_avg_sensors: Load average senzory
            adaptive_profiles: Dict s profily (today_profile, tomorrow_profile) nebo None pro fallback
            balancing_plan: DEPRECATED - kept for compatibility, use self._active_charging_plan
            mode: Phase 2 - CBB mode for forecast (0-3), None = use current mode from sensor

        Returns:
            List timeline bodů s predikcí
        """
        timeline = []

        # REFACTORING: Use DP discretized battery_soc if available
        # This ensures timeline matches DP/POST-PROC physics exactly
        if (
            hasattr(self, "_mode_optimization_result")
            and self._mode_optimization_result
        ):
            optimal_timeline = self._mode_optimization_result.get(
                "optimal_timeline", []
            )
            if optimal_timeline and len(optimal_timeline) > 0:
                # Use DP's discretized initial SoC
                battery_kwh = optimal_timeline[0].get("battery_soc", current_capacity)
                _LOGGER.info(
                    f"Timeline using DP discretized start: {battery_kwh:.2f} kWh "
                    f"(vs parameter {current_capacity:.2f} kWh, delta={battery_kwh - current_capacity:+.2f} kWh)"
                )
            else:
                battery_kwh = current_capacity
        else:
            battery_kwh = current_capacity

        today = dt_util.now().date()

        # Phase 2: Determine mode for timeline calculation
        if mode is None:
            mode = self._get_current_mode()

        mode_name = CBB_MODE_NAMES.get(mode, f"UNKNOWN_{mode}")
        _LOGGER.debug(f"_calculate_timeline() using mode: {mode_name} ({mode})")

        # UNIFIED PLANNER: Použít aktivní plán místo parametru balancing_plan
        active_plan = self._active_charging_plan

        # Parse charging plan times if exists
        balancing_start: Optional[datetime] = None  # Start HOLDING period (už na 100%)
        balancing_end: Optional[datetime] = None  # End HOLDING period
        balancing_charging_intervals: set = set()  # Intervaly kdy nabíjet (podle cen)
        balancing_reason: Optional[str] = None
        plan_requester: Optional[str] = None

        # Tracking pro přesný výpočet ceny balancování
        balancing_charging_cost: float = 0.0  # Cena za nabití na 100%
        balancing_holding_cost: float = 0.0  # Cena za držení (spotřeba ze sítě)

        if active_plan and active_plan.get("charging_plan"):
            try:
                charging_plan = active_plan["charging_plan"]
                balancing_start = datetime.fromisoformat(
                    charging_plan.get("holding_start", "")
                )
                balancing_end = datetime.fromisoformat(
                    charging_plan.get("holding_end", "")
                )

                # Normalize timezone - ensure aware datetimes
                if balancing_start.tzinfo is None:
                    balancing_start = dt_util.as_local(balancing_start)
                if balancing_end.tzinfo is None:
                    balancing_end = dt_util.as_local(balancing_end)

                plan_requester = active_plan.get("requester", "unknown")
                plan_mode = active_plan.get("mode", "unknown")
                balancing_reason = f"{plan_requester}_{plan_mode}"

                # Použít charging intervals z plánu
                charging_intervals_data = charging_plan.get("charging_intervals", [])
                balancing_charging_intervals = set()
                for iv in charging_intervals_data:
                    ts = datetime.fromisoformat(iv["timestamp"])
                    # Normalize timezone
                    if ts.tzinfo is None:
                        ts = dt_util.as_local(ts)
                    balancing_charging_intervals.add(ts)

                _LOGGER.info(
                    f"Active charging plan: {plan_requester} ({plan_mode}), "
                    f"holding {balancing_start.strftime('%H:%M')}-{balancing_end.strftime('%H:%M')}, "
                    f"charging in {len(balancing_charging_intervals)} intervals"
                )
            except (ValueError, TypeError, KeyError) as e:
                _LOGGER.warning(f"Failed to parse active charging plan: {e}")
                active_plan = None

        # Získat battery efficiency pro výpočty
        efficiency = self._get_battery_efficiency()

        _LOGGER.debug(
            f"Starting calculation with capacity={battery_kwh:.2f} kWh, efficiency={efficiency:.3f}"
        )

        # Phase 1.5: Create lookup dict for export prices by timestamp
        export_price_lookup = {
            ep["time"]: ep["price"]
            for ep in export_prices
            if "time" in ep and "price" in ep
        }
        _LOGGER.debug(
            f"Export price lookup created: {len(export_price_lookup)} entries"
        )

        # Info o použité metodě predikce
        if adaptive_profiles:
            profile_name = adaptive_profiles.get("profile_name", "unknown")
            _LOGGER.info(f"Using ADAPTIVE profiles: {profile_name}")
        else:
            _LOGGER.info("Using FALLBACK load_avg sensors")

        # Phase 2.5: Připravit DP mode lookup pro timeline
        # Pokud máme DP optimalizaci, vytvoříme mapu timestamp → optimal mode
        dp_mode_lookup: Dict[str, int] = {}
        if (
            hasattr(self, "_mode_optimization_result")
            and self._mode_optimization_result
        ):
            optimal_timeline = self._mode_optimization_result.get(
                "optimal_timeline", []
            )
            optimal_modes = self._mode_optimization_result.get("optimal_modes", [])

            for dp_point in optimal_timeline:
                dp_time = dp_point.get("time", "")
                dp_mode = dp_point.get("mode", CBB_MODE_HOME_UPS)  # Default UPS
                if dp_time:
                    dp_mode_lookup[dp_time] = dp_mode

            # DEBUG: Check if post-processing modes are included
            mode_counts = {
                "HOME I": optimal_modes.count(0),
                "HOME II": optimal_modes.count(1),
                "HOME III": optimal_modes.count(2),
                "HOME UPS": optimal_modes.count(3),
            }
            _LOGGER.info(
                f"DP mode lookup prepared: {len(dp_mode_lookup)} optimal modes, "
                f"HOME I={mode_counts['HOME I']}, HOME II={mode_counts['HOME II']}, "
                f"HOME III={mode_counts['HOME III']}, HOME UPS={mode_counts['HOME UPS']}"
            )
        else:
            _LOGGER.debug("No DP optimization result - using default mode logic")

        for price_point in spot_prices:
            timestamp_str = price_point.get("time")
            if not timestamp_str:
                continue

            timestamp = datetime.fromisoformat(timestamp_str)
            # Normalize timezone - ensure aware datetime
            if timestamp.tzinfo is None:
                timestamp = dt_util.as_local(timestamp)

            # Získat solar production pro tento čas (kWh za 15min)
            solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)

            # Získat load average pro tento čas (kWh za 15min)
            # ADAPTIVE: Pokud máme adaptive profily, použít je místo load_avg sensors
            if adaptive_profiles:
                # Vybrat správný profil (dnes vs zítra)
                if timestamp.date() == today:
                    profile = adaptive_profiles["today_profile"]
                else:
                    profile = adaptive_profiles.get("tomorrow_profile")
                    if not profile:
                        # Fallback na today profile pokud nemáme tomorrow
                        profile = adaptive_profiles["today_profile"]

                # Získat hodinovou hodnotu z profilu s plovoucím oknem
                hour = timestamp.hour
                start_hour = profile.get("start_hour", 0)
                index = hour - start_hour

                if 0 <= index < len(profile["hourly_consumption"]):
                    hourly_kwh = profile["hourly_consumption"][index]
                else:
                    # Mimo rozsah - použij průměr
                    hourly_kwh = profile.get("avg_kwh_h", 0.5)

                # Převést na 15min interval
                load_kwh = hourly_kwh / 4.0
            else:
                # Fallback: load_avg sensors
                load_kwh = self._get_load_avg_for_timestamp(timestamp, load_avg_sensors)

            # Zkontrolovat jestli jsme v balancing window
            is_balancing_charging = False  # Nabíjení v levných intervalech
            is_balancing_holding = False  # Držení na 100% během holding period

            if active_plan and balancing_start and balancing_end:
                # Charging: jsme v některém z vybraných levných intervalů?
                if timestamp in balancing_charging_intervals:
                    is_balancing_charging = True

                # Holding: interval je holding pokud:
                # 1. Začíná v holding period (timestamp >= balancing_start)
                # 2. Končí v holding period (timestamp + 15min <= balancing_end)
                # 3. Holding period začíná během tohoto intervalu
                interval_end = timestamp + timedelta(minutes=15)

                # Interval je holding pokud se překrývá s holding periodem
                # CRITICAL: Use > not >= to avoid off-by-one error
                # Example: interval 20:30-20:45 should NOT be holding if holding starts at 20:45
                interval_overlaps_holding = (timestamp < balancing_end) and (
                    interval_end > balancing_start
                )

                if interval_overlaps_holding:
                    is_balancing_holding = True

            # Celkové balancing window = charging NEBO holding
            is_balancing_window = is_balancing_charging or is_balancing_holding

            # PHASE 2.5: Určit MODE pro tento interval PŘED výpočtem baterie
            # Priorita:
            # 1. Balancing má prioritu (UPS pro charging i holding)
            # 2. DP optimalizace (pokud existuje)
            # 3. Fallback: Podle mode parametru

            interval_mode_num = mode  # Default: použít mode parametr
            interval_mode_name = CBB_MODE_NAMES.get(mode, "Home UPS")

            # DEBUG first 3 intervals
            if len(timeline) < 3:
                _LOGGER.debug(
                    f"Mode selection [{len(timeline)}]: timestamp_str={timestamp_str}, "
                    f"in_dp_lookup={timestamp_str in dp_mode_lookup}, "
                    f"dp_lookup_size={len(dp_mode_lookup)}"
                )

            if is_balancing_charging or is_balancing_holding:
                # Balancing VŽDY používá Home UPS (AC charging + držení baterie)
                interval_mode_num = CBB_MODE_HOME_UPS
                interval_mode_name = "Home UPS"
            elif timestamp_str in dp_mode_lookup:
                # Použít optimální mode z DP
                interval_mode_num = dp_mode_lookup[timestamp_str]
                interval_mode_name = CBB_MODE_NAMES.get(
                    interval_mode_num, f"MODE_{interval_mode_num}"
                )
            # else: použít mode parametr (už nastaveno výše)

            # Grid charging - normální logika (může být přepsána balancingem)
            grid_kwh = 0.0

            # Debug první pár bodů
            if len(timeline) < 3:
                _LOGGER.info(
                    f"Timeline point {len(timeline)}: {timestamp_str}, mode={interval_mode_name}, "
                    f"battery_before={battery_kwh:.3f}, solar={solar_kwh:.3f}, "
                    f"load={load_kwh:.3f}, grid={grid_kwh:.3f}, "
                    f"balancing_charging={is_balancing_charging}, balancing_holding={is_balancing_holding}"
                )

            # BATTERY BALANCING: Nabíjení v levných hodinách + držení na 100%
            if is_balancing_window:
                # Cílová kapacita je 100%
                target_kwh = max_capacity

                # OPRAVA: Spočítat kolik energie potřebujeme ze sítě
                # Zohlednit že baterie NEMŮŽE být záporná (už je clampnuta na 0)
                # Solar pomůže, load se odečítá (ale v UPS režimu jde ze sítě)
                current_battery = max(0, battery_kwh)  # Zajistit že není záporná
                projected_kwh = current_battery + solar_kwh
                needed_kwh = target_kwh - projected_kwh

                # DŮLEŽITÉ: V holding period NIKDY nenabíjet!
                # Nabíjení probíhá JEN v charging_intervals (před holding periodem)
                # V holding period jen držíme baterii na max kapacitě
                # MODE-AWARE: Balancing vyžaduje HOME_UPS mode (AC charging)
                # Pokud forecastujeme pro jiný mode, balancing ignorovat
                mode_allows_ac_charging = interval_mode_num == CBB_MODE_HOME_UPS
                should_charge = (
                    is_balancing_charging
                    and (not is_balancing_holding)
                    and mode_allows_ac_charging
                )

                if should_charge and needed_kwh > 0:
                    # OPRAVA: Použít home_charge_rate z konfigurace místo hardcoded 0.75
                    # Načíst charging power z config
                    config = (
                        self._config_entry.options
                        if self._config_entry and self._config_entry.options
                        else self._config_entry.data if self._config_entry else {}
                    )
                    charging_power_kw = config.get("home_charge_rate", 2.8)
                    max_charge_per_15min = charging_power_kw / 4.0  # kW → kWh za 15min

                    # Potřebujeme dobít - omezit na max výkon
                    grid_kwh = min(needed_kwh, max_charge_per_15min)
                else:
                    grid_kwh = 0.0

                # Sledovat cenu balancování
                spot_price = price_point.get("price", 0)

                if is_balancing_holding:
                    # HOLDING phase: Cena za spotřebu ze sítě (grid - solar)
                    # V UPS režimu spotřeba jde ze sítě, ale pokud je solar, tak pomáhá
                    net_consumption = max(0, load_kwh - solar_kwh)
                    balancing_holding_cost += net_consumption * spot_price

                    # HOLDING: Držet baterii na současné úrovni (ideálně 100%)
                    # Spotřeba jde ze sítě, baterie se nedotýká
                    # Pokud je solar, pomáhá krýt spotřebu → menší čerpání ze sítě
                    # Baterie zůstává na úrovni z konce charging fáze
                    # (Neměníme battery_kwh - zůstává jak je)

                elif is_balancing_charging:
                    # CHARGING phase: Cena za nabíjení ze sítě
                    balancing_charging_cost += grid_kwh * spot_price

                    # CHARGING: Normální nabíjení ale s max výkonem
                    net_energy = solar_kwh + grid_kwh  # V UPS: spotřeba jde ze sítě
                    battery_kwh = battery_kwh + net_energy
                    # Clamp na maximum
                    if battery_kwh > max_capacity:
                        battery_kwh = max_capacity

                # V balancing režimu je VŽDY UPS (nabíjení nebo držení baterie)
                is_ups_mode = True
                solar_to_battery = solar_kwh  # Veškerý solar jde do baterie
            else:
                # NORMÁLNÍ REŽIM - MODE-AWARE LOGIKA
                # DŮLEŽITÁ LOGIKA s EFFICIENCY:
                # GAP #1: Při vybíjení z baterie musíme zohlednit DC/AC losses
                # GAP #3: V UPS režimu spotřeba jde ze sítě (ne z baterie)

                # MODE-AWARE: Použít interval_mode_num místo fixního mode parametru
                # HOME_UPS (3): AC nabíjení povoleno, spotřeba ze sítě
                # HOME I/II/III (0/1/2): Jen DC nabíjení ze solaru, spotřeba z baterie
                is_ups_mode = interval_mode_num == CBB_MODE_HOME_UPS

                if is_ups_mode:
                    # UPS režim: spotřeba ze sítě (100% účinnost)
                    # Baterie roste jen díky solar + grid nabíjení

                    # CRITICAL: V UPS režimu VŽDY nabíjíme z gridu (DP optimization rozhodla)
                    # DP módy jsou autoritativní - pokud je HOME UPS, nabíjíme!
                    config = (
                        self._config_entry.options
                        if self._config_entry and self._config_entry.options
                        else self._config_entry.data if self._config_entry else {}
                    )
                    charging_power_kw = config.get("home_charge_rate", 2.8)
                    max_charge_per_15min = charging_power_kw / 4.0  # kW → kWh za 15min

                    battery_space = max_capacity - battery_kwh
                    # FIX: Nabíjet VŽDY když není úplně plná (DP už rozhodl že má smysl)
                    # Původní podmínka "battery_space > 0.1" byla ŠPATNĚ - blokovala nabíjení!
                    if battery_kwh < max_capacity - 0.1:
                        grid_kwh = min(max_charge_per_15min, battery_space / efficiency)

                    net_energy = solar_kwh + grid_kwh
                    # load_kwh se NEODEČÍTÁ (jde ze sítě!)
                else:
                    # Home I/II/III režim: spotřeba z baterie (s DC/AC losses)
                    # Solar nejprve pokrývá spotřebu (bez losses), pak nabíjí baterii
                    if solar_kwh >= load_kwh:
                        # Solar pokrývá spotřebu + nabíjí baterii
                        solar_to_battery = solar_kwh - load_kwh
                        net_energy = solar_to_battery + grid_kwh
                    else:
                        # Solar nepokrývá spotřebu → vybíjíme z baterie (s losses!)
                        load_from_battery = load_kwh - solar_kwh
                        battery_drain = (
                            load_from_battery / efficiency
                        )  # 0.882 → 12% více!
                        net_energy = -battery_drain + grid_kwh

                # Pro zobrazení v timeline: kolik soláru čistě přispělo (po pokrytí spotřeby)
                solar_to_battery = max(0, solar_kwh - load_kwh)

                # Výpočet nové kapacity baterie
                battery_kwh = battery_kwh + net_energy

                # Clamp na maximum
                # PHASE 2.8: ODSTRANĚNÍ MIN CLAMPU!
                # DP optimization zajistí, že baterie nikdy neklesne pod min_capacity
                # pomocí HOME UPS nabíjení. Clamp maskoval chyby v DP optimalizaci.
                if battery_kwh > max_capacity:
                    battery_kwh = max_capacity

                # Debug: Log každých 10 intervalů pro porovnání s post-processing
                if (
                    len(timeline) % 10 == 0
                    or battery_kwh < min_capacity + 0.5
                    or len(timeline) < 5
                ):
                    _LOGGER.debug(
                        f"TIMELINE interval {len(timeline):3d}: battery={battery_kwh:.2f} kWh, "
                        f"mode={interval_mode_name}, solar={solar_kwh:.3f}, load={load_kwh:.3f}, "
                        f"grid_kwh={grid_kwh:.3f}, net_energy={net_energy:.3f}"
                    )

                # Debug: Pokud baterie klesla pod minimum, je to chyba v DP optimalizaci!
                if battery_kwh < min_capacity:
                    _LOGGER.error(
                        f"🔴 DP BUG: Battery dropped below minimum! "
                        f"battery={battery_kwh:.2f} kWh < min={min_capacity:.2f} kWh, "
                        f"mode={interval_mode_name}, time={timestamp.isoformat()}"
                    )

            # Určit reason pro tento interval
            reason = "normal"
            if is_balancing_window:
                if is_balancing_charging:
                    reason = f"balancing_charging_{balancing_reason}"
                elif is_balancing_holding:
                    reason = f"balancing_holding_{balancing_reason}"
                else:
                    reason = f"balancing_{balancing_reason}"

            # NOTE: interval_mode_num už je nastaven výše (před výpočtem baterie)

            # Přidat bod do timeline
            # Phase 1.5: Lookup export price for this timestamp
            export_price_czk = export_price_lookup.get(timestamp_str, 0)

            timeline.append(
                {
                    "timestamp": timestamp_str,
                    "spot_price_czk": price_point.get("price", 0),
                    "export_price_czk": export_price_czk,  # Phase 1.5: Export (sell) price
                    "battery_capacity_kwh": round(battery_kwh, 2),
                    "solar_production_kwh": round(
                        solar_kwh, 2
                    ),  # CELKOVÝ solar (ne jen přebytek!)
                    "solar_charge_kwh": round(
                        solar_to_battery, 2
                    ),  # Přebytek do baterie (pro zpětnou kompatibilitu)
                    "consumption_kwh": round(load_kwh, 2),
                    "grid_charge_kwh": round(grid_kwh, 2),
                    "mode": interval_mode_name,  # Použít optimální mode (ne jen UPS/HOME I)
                    "reason": reason,
                }
            )

        # Optimalizace nabíjení ze sítě
        # DŮLEŽITÉ: Pokud máme aktivní charging plan, NEVOLAT optimalizaci!
        # Charging plan má prioritu před grid charging optimalizací
        # DŮLEŽITÉ: Pokud máme DP optimalizaci, NEVOLAT grid charging optimalizaci!
        # DP už určila optimální režimy včetně HOME UPS nabíjení
        # MODE-AWARE: Grid charging optimalizace pouze v HOME_UPS režimu
        has_dp_optimization = bool(dp_mode_lookup)
        _LOGGER.debug(
            f"Timeline before optimization: {len(timeline)} points, has_dp={has_dp_optimization}"
        )

        if not active_plan and not has_dp_optimization:
            timeline = self._optimize_grid_charging(timeline, mode)
            _LOGGER.debug(f"Timeline after optimization: {len(timeline)} points")
        elif has_dp_optimization:
            _LOGGER.info(
                f"Skipping grid charging optimization - using DP optimal modes ({len(dp_mode_lookup)} intervals)"
            )
        else:
            _LOGGER.info(
                f"Skipping grid charging optimization - active charging plan from {plan_requester}"
            )

        # Uložit balancing cost info pro atributy
        if active_plan:
            self._balancing_cost = {
                "charging_cost_czk": round(balancing_charging_cost, 2),
                "holding_cost_czk": round(balancing_holding_cost, 2),
                "total_cost_czk": round(
                    balancing_charging_cost + balancing_holding_cost, 2
                ),
            }
        else:
            self._balancing_cost = None

        return timeline

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
            _LOGGER.debug(f"[fetch_interval_from_history] No _hass instance")
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
                f"sensor.oig_{self._box_id}_battery_soc",  # Baterie [%]
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
            battery_soc = get_value_at_end(f"sensor.oig_{self._box_id}_battery_soc")
            mode_raw = get_value_at_end(f"sensor.oig_{self._box_id}_box_prms_mode")

            # Vypočítat battery_kwh z SOC
            battery_kwh = 0.0
            if battery_soc is not None and hasattr(self, "_battery_capacity"):
                battery_kwh = (battery_soc / 100.0) * self._battery_capacity

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

            _LOGGER.debug(
                f"[fetch_interval_from_history] Result: consumption={result['consumption_kwh']}, "
                f"net_cost={result['net_cost']}, grid_import={result['grid_import']}"
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
            "actual": [],  # Will be filled below
        }

        if not plan_data:
            _LOGGER.debug(f"No plan for {today_str}, skipping actual update")
            return

        _LOGGER.info(f"📊 Updating actual values from history for {today_str}...")

        # Načíst existing actual intervaly
        existing_actual = plan_data.get("actual", [])

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
                _LOGGER.debug(f"No storage data found")
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
            now = dt_util.now()
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

    async def build_detail_tabs(self, tab: Optional[str] = None) -> Dict[str, Any]:
        """
        Build Detail Tabs data - agregace po CBB mode blocích.

        Phase 3.0: Detail Tabs API
        - Reuse build_timeline_extended() pro raw data
        - Agreguje intervaly podle CBB módů pomocí _group_intervals_by_mode()
        - Přidává mode_match detection (historical vs planned mode)
        - Počítá adherence % (jak moc se držíme plánu)

        FÁZE 5: Cache s TTL
        - yesterday: cache bez TTL (historická data se nemění)
        - today completed blocks: cache bez TTL (minulé intervaly se nemění)
        - today planned blocks: cache 60s TTL (plán se může měnit)
        - tomorrow: cache 60s TTL (plán se může měnit)

        Args:
            tab: Optional filter - "yesterday" | "today" | "tomorrow"
                 None = vrátí všechny 3 taby

        Returns:
            Dict s mode_blocks pro každý tab:
            {
                "yesterday": {
                    "date": "2025-11-05",
                    "mode_blocks": [
                        {
                            "mode_historical": "HOME I",
                            "mode_planned": "HOME I",
                            "mode_match": true,
                            "status": "completed",
                            "start_time": "00:00",
                            "end_time": "02:30",
                            "interval_count": 10,
                            "duration_hours": 2.5,
                            "cost_historical": 12.50,
                            "cost_planned": 12.00,
                            "cost_delta": 0.50,
                            "battery_soc_start": 50.0,
                            "battery_soc_end": 45.2,
                            "solar_total_kwh": 0.0,
                            "consumption_total_kwh": 1.8,
                            "grid_import_total_kwh": 1.8,
                            "grid_export_total_kwh": 0.0,
                            "adherence_pct": 100
                        }
                    ],
                    "summary": {
                        "total_cost": 28.50,
                        "overall_adherence": 65,
                        "mode_switches": 8
                    }
                },
                "today": {...},
                "tomorrow": {...}
            }
        """
        # FÁZE 5: Check cache first
        now = dt_util.now()
        tabs_to_process = []
        if tab is None:
            tabs_to_process = ["yesterday", "today", "tomorrow"]
        elif tab in ["yesterday", "today", "tomorrow"]:
            tabs_to_process = [tab]
        else:
            _LOGGER.warning(f"Invalid tab requested: {tab}, returning all tabs")
            tabs_to_process = ["yesterday", "today", "tomorrow"]

        result = {}
        tabs_to_build = []  # Taby, které nejsou v cache nebo jsou expired

        for tab_name in tabs_to_process:
            cache_key = f"{tab_name}_{now.date().isoformat()}"
            cached = self._detail_tabs_cache.get(cache_key)

            if cached:
                # Check TTL
                cache_timestamp = cached.get("timestamp")
                cache_ttl = cached.get("ttl")  # None = infinite, int = seconds

                if cache_ttl is None:
                    # Infinite TTL - use cache
                    result[tab_name] = cached["data"]
                    _LOGGER.debug(f"[Detail Tabs Cache] HIT (infinite) for {cache_key}")
                    continue
                elif (
                    cache_timestamp
                    and (now - cache_timestamp).total_seconds() < cache_ttl
                ):
                    # TTL not expired - use cache
                    result[tab_name] = cached["data"]
                    age = (now - cache_timestamp).total_seconds()
                    _LOGGER.debug(
                        f"[Detail Tabs Cache] HIT ({age:.1f}s old, TTL={cache_ttl}s) for {cache_key}"
                    )
                    continue
                else:
                    # TTL expired
                    age = (
                        (now - cache_timestamp).total_seconds()
                        if cache_timestamp
                        else 0
                    )
                    _LOGGER.debug(
                        f"[Detail Tabs Cache] EXPIRED ({age:.1f}s old, TTL={cache_ttl}s) for {cache_key}"
                    )

            # Cache miss nebo expired - build it
            tabs_to_build.append(tab_name)
            _LOGGER.debug(f"[Detail Tabs Cache] MISS for {cache_key}")

        # Pokud všechny taby v cache, vrátíme result
        if not tabs_to_build:
            return result

        # 1. Získat raw timeline data (reuse!) - pouze když potřebujeme
        # PHASE 3.0: Async call to load Storage Helper data
        timeline_extended = await self.build_timeline_extended()

        # 2. Pro každý tab co potřebujeme buildit - zpracovat intervaly na mode bloky
        for tab_name in tabs_to_build:
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
                    },
                }
            else:
                # 3. Agregovat intervaly podle módů
                mode_blocks = self._build_mode_blocks_for_tab(intervals, tab_name)

                # 4. Spočítat summary
                summary = self._calculate_tab_summary(mode_blocks, intervals)

                tab_result = {
                    "date": date_str,
                    "mode_blocks": mode_blocks,
                    "summary": summary,
                }

            # 5. FÁZE 5: Store in cache with appropriate TTL
            cache_key = f"{tab_name}_{now.date().isoformat()}"
            ttl = self._get_detail_tab_ttl(tab_name, now)

            self._detail_tabs_cache[cache_key] = {
                "data": tab_result,
                "timestamp": now,
                "ttl": ttl,
            }

            ttl_str = "infinite" if ttl is None else f"{ttl}s"
            _LOGGER.debug(f"[Detail Tabs Cache] WRITE {cache_key} (TTL={ttl_str})")

            result[tab_name] = tab_result

        return result

    def _get_detail_tab_ttl(self, tab_name: str, now: datetime) -> Optional[int]:
        """
        Určit TTL pro Detail Tab cache.

        FÁZE 5: Cache TTL Strategy
        - yesterday: None (infinite) - historická data se nemění
        - today: Split strategy
          - completed blocks (historical): None (infinite)
          - planned blocks (future): 60s
          - Poznámka: Pro today vracíme 60s protože mix obsahuje planned data
        - tomorrow: 60s - plánovaná data se mohou měnit (nové OTE ceny po 13:00)

        Args:
            tab_name: "yesterday" | "today" | "tomorrow"
            now: Current datetime

        Returns:
            None = infinite TTL, int = TTL v sekundách
        """
        if tab_name == "yesterday":
            # Historical data never changes
            return None
        elif tab_name == "today":
            # Today contains mix - use 60s TTL because of planned part
            # Future optimization: Split cache per block status
            return 60
        elif tab_name == "tomorrow":
            # Planned data can change (new prices after 13:00)
            return 60
        else:
            # Unknown tab - safe default
            _LOGGER.warning(f"Unknown tab_name for TTL: {tab_name}")
            return 60

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
                    group_intervals[0], tab_name, now
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
                block["battery_soc_start"] = safe_nested_get(
                    first_interval, "actual", "battery_kwh", default=0.0
                )
                block["battery_soc_end"] = safe_nested_get(
                    last_interval, "actual", "battery_kwh", default=0.0
                )
            else:
                block["battery_soc_start"] = safe_nested_get(
                    first_interval, "planned", "battery_kwh", default=0.0
                )
                block["battery_soc_end"] = safe_nested_get(
                    last_interval, "planned", "battery_kwh", default=0.0
                )

            # Energie totals
            solar_total = 0.0
            consumption_total = 0.0
            grid_import_total = 0.0
            grid_export_total = 0.0

            for iv in group_intervals:
                if data_type in ["completed", "both"]:
                    solar_total += safe_nested_get(iv, "actual", "solar_kwh", default=0)
                    consumption_total += safe_nested_get(
                        iv, "actual", "consumption_kwh", default=0
                    )
                    grid_import_total += safe_nested_get(
                        iv, "actual", "grid_import", default=0
                    )
                    grid_export_total += safe_nested_get(
                        iv, "actual", "grid_export", default=0
                    )
                else:
                    solar_total += safe_nested_get(
                        iv, "planned", "solar_kwh", default=0
                    )
                    consumption_total += safe_nested_get(
                        iv, "planned", "consumption_kwh", default=0
                    )
                    grid_import_total += safe_nested_get(
                        iv, "planned", "grid_import", default=0
                    )
                    grid_export_total += safe_nested_get(
                        iv, "planned", "grid_export", default=0
                    )

            block["solar_total_kwh"] = round(solar_total, 2)
            block["consumption_total_kwh"] = round(consumption_total, 2)
            block["grid_import_total_kwh"] = round(grid_import_total, 2)
            block["grid_export_total_kwh"] = round(grid_export_total, 2)

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
        self, interval: Dict[str, Any], tab_name: str, now: datetime
    ) -> str:
        """
        Určit status bloku: completed | current | planned.

        Args:
            interval: První interval v bloku
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
            interval_time_str = interval.get("time", "")
            if not interval_time_str:
                return "planned"

            try:
                interval_time = datetime.fromisoformat(interval_time_str)
                if interval_time.tzinfo is None:
                    interval_time = dt_util.as_local(interval_time)

                current_minute = (now.minute // 15) * 15
                current_interval_time = now.replace(
                    minute=current_minute, second=0, microsecond=0
                )

                # Remove timezone for comparison (both must be naive or both aware)
                # interval_time might be naive from timeline data
                interval_time_naive = (
                    interval_time.replace(tzinfo=None)
                    if interval_time.tzinfo
                    else interval_time
                )
                current_interval_naive = current_interval_time.replace(tzinfo=None)

                if interval_time_naive < current_interval_naive:
                    return "completed"
                elif interval_time_naive == current_interval_naive:
                    return "current"
                else:
                    return "planned"
            except:
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

        summary = {
            "total_cost": round(total_cost, 2),
            "overall_adherence": overall_adherence,
            "mode_switches": mode_switches,
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

    async def build_unified_cost_tile(self) -> Dict[str, Any]:
        """
        Build Unified Cost Tile data.

        Phase V2: PLAN_VS_ACTUAL_UX_REDESIGN_V2.md - Fáze 1 (UCT-BE-001 až UCT-BE-004)
        Consolidates 2 cost tiles into one with today/yesterday/tomorrow context.

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
        today = now.date()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)

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

        return {
            "today": today_data,
            "yesterday": yesterday_data,
            "tomorrow": tomorrow_data,
            "metadata": {
                "last_update": str(now),
                "timezone": str(now.tzinfo),
            },
        }

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
                # Má actual data
                actual_cost = sum(
                    (iv.get("actual") or {}).get("net_cost", 0)
                    for iv in group["intervals"]
                )
                planned_cost = sum(
                    (iv.get("planned") or {}).get("net_cost", 0)
                    for iv in group["intervals"]
                )
                actual_savings = sum(
                    (iv.get("actual") or {}).get("savings_vs_home_i", 0)
                    for iv in group["intervals"]
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

        total_plan_cost = sum(
            i.get("planned", {}).get("net_cost", 0) for i in completed
        )
        total_actual_cost = sum(
            i.get("actual", {}).get("net_cost", 0) for i in completed
        )

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
        avg_price = (
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
            drift_ratio = actual_completed / plan_completed
        else:
            drift_ratio = 1.0

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
            "future_plan_cost": round(plan_future, 2),
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
            today_str = now.date().strftime("%Y-%m-%d")

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
                interval.get("net_cost", 0) for interval in archive_data.get("plan", [])
            )
            actual_total = sum(
                interval.get("net_cost", 0) for interval in actual_intervals
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
                current_mode_idx = 0

                while interval_time <= fetch_end:
                    # Find the mode that was active at interval_time
                    # Use the last mode change that happened before or at interval_time
                    active_mode = None
                    for i, change in enumerate(mode_changes):
                        if change["time"] <= interval_time:
                            active_mode = change
                            current_mode_idx = i
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

    def _format_actual_data(
        self, actual: Dict[str, Any], planned: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Formátovat actual data pro API.

        Args:
            actual: Actual data z trackingu
            planned: Planned data pro doplnění chybějících hodnot (optional)
        """
        if not actual:
            return None

        result = {
            "mode": actual.get("mode", 0),
            "mode_name": actual.get("mode_name", "HOME I"),
            "battery_kwh": round(actual.get("battery_kwh", 0), 2),
            "grid_import": round(actual.get("grid_import", 0), 3),
            "grid_export": round(actual.get("grid_export", 0), 3),
            "net_cost": round(actual.get("net_cost", 0), 2),
            "solar_kwh": round(actual.get("solar_kwh", 0), 3),
            "consumption_kwh": round(actual.get("consumption_kwh", 0), 3),
            "spot_price": round(actual.get("spot_price", 0), 2),
            "export_price": round(actual.get("export_price", 0), 2),
        }

        # Savings vs HOME I (pokud je v actual, jinak z planned)
        if "savings_vs_home_i" in actual:
            result["savings_vs_home_i"] = round(actual.get("savings_vs_home_i", 0), 2)
        elif planned:
            result["savings_vs_home_i"] = round(planned.get("savings_vs_home_i", 0), 2)
        else:
            result["savings_vs_home_i"] = 0

        return result

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

        # Zakomentováno: Spamuje logy během DP optimalizace (23k iterací)
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
        dual_tariff_enabled = config.get("dual_tariff_enabled", True)

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
            _LOGGER.warning(f"🌞 SOLAR DEBUG: TODAY DATA IS EMPTY! ❌")

        if tomorrow:
            sample_keys = list(tomorrow.keys())[:3]
            sample_values = [tomorrow[k] for k in sample_keys]
            _LOGGER.info(
                f"🌞 SOLAR DEBUG: Tomorrow sample: {dict(zip(sample_keys, sample_values))}"
            )
        else:
            _LOGGER.warning(f"🌞 SOLAR DEBUG: TOMORROW DATA IS EMPTY! ❌")

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

    def _optimize_grid_charging(
        self, timeline_data: List[Dict[str, Any]], mode: int
    ) -> List[Dict[str, Any]]:
        """
        Optimalizuje nabíjení baterie ze sítě podle cenových dat.

        Podporuje dva režimy:
        1. Economic charging (nový) - Forward simulace s ekonomickým vyhodnocením
        2. Legacy charging (starý) - Percentile-based s kritickými místy

        MODE-AWARE: Grid charging funguje POUZE v HOME_UPS režimu!
        Pro ostatní režimy (HOME I/II/III) vrací timeline beze změn.

        Args:
            timeline_data: Seznam bodů s predikcí baterie
            mode: CBB mode (0-3) pro forecast

        Returns:
            Optimalizovaná timeline s přidaným grid charging (pokud mode == HOME_UPS)
        """
        # MODE-AWARE: Grid charging jen v HOME_UPS režimu
        if mode != CBB_MODE_HOME_UPS:
            mode_name = CBB_MODE_NAMES.get(mode, f"UNKNOWN_{mode}")
            _LOGGER.debug(
                f"Skipping grid charging optimization - mode {mode_name} ({mode}) doesn't support AC charging"
            )
            return timeline_data

        if not timeline_data:
            return timeline_data

        try:
            # Načíst konfiguraci
            config = (
                self._config_entry.options
                if self._config_entry.options
                else self._config_entry.data
            )

            # Nové parametry
            enable_economic_charging = config.get("enable_economic_charging", True)
            min_savings_margin = config.get("min_savings_margin", 0.30)  # Kč/kWh
            safety_margin_percent = config.get("safety_margin_percent", 10.0)  # %

            # Protection parametry (optional)
            enable_blackout_protection = config.get("enable_blackout_protection", False)
            blackout_protection_hours = config.get("blackout_protection_hours", 12)
            blackout_target_soc_percent = config.get(
                "blackout_target_soc_percent", 60.0
            )

            enable_weather_risk = config.get("enable_weather_risk", False)
            weather_risk_level = config.get("weather_risk_level", "medium")
            weather_target_soc_percent = config.get("weather_target_soc_percent", 70.0)

            # Společné parametry
            min_capacity_percent = config.get("min_capacity_percent", 20.0)
            target_capacity_percent = config.get("target_capacity_percent", 80.0)
            max_charging_price = config.get("max_price_conf", 10.0)
            charging_power_kw = config.get("home_charge_rate", 2.8)

            # Legacy parametr (jen pro backward compatibility)
            peak_percentile = config.get("percentile_conf", 75.0)

            max_capacity = self._get_max_battery_capacity()
            min_capacity_kwh = (min_capacity_percent / 100.0) * max_capacity

            # OPTIMAL NIGHT CHARGE TARGET:
            # Vypočítat optimální target SoC (ne vždy 100%)
            # Využívá ranní solar surplus a evening spot prices z DP optimalizace
            optimal_target_kwh, target_reason = (
                self._calculate_optimal_night_charge_target(
                    timeline_data=timeline_data,
                    max_capacity=max_capacity,
                    default_target_percent=target_capacity_percent,
                )
            )

            # Použít optimální target místo fixního target_capacity_percent
            target_capacity_kwh = optimal_target_kwh

            _LOGGER.info(
                f"Night charge target: {target_capacity_kwh:.2f}kWh "
                f"({(target_capacity_kwh / max_capacity * 100):.1f}%) - {target_reason}"
            )

            # Vypočítat effective_minimum s bezpečnostním marginem
            usable_capacity = max_capacity - min_capacity_kwh
            safety_margin_kwh = (safety_margin_percent / 100.0) * usable_capacity
            effective_minimum_kwh = min_capacity_kwh + safety_margin_kwh

            # Rozhodnout který algoritmus použít
            if enable_economic_charging:
                _LOGGER.info(
                    f"ECONOMIC grid charging: min={min_capacity_kwh:.2f}kWh, "
                    f"effective_min={effective_minimum_kwh:.2f}kWh (+{safety_margin_kwh:.2f}kWh safety), "
                    f"target={target_capacity_kwh:.2f}kWh, max_price={max_charging_price}CZK, "
                    f"min_savings={min_savings_margin}CZK/kWh"
                )

                optimized_timeline = self._economic_charging_plan(
                    timeline_data,
                    min_capacity_kwh=min_capacity_kwh,
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
                )

            else:
                # Fallback na starý algoritmus
                _LOGGER.info(
                    f"LEGACY grid charging: min={min_capacity_kwh:.2f}kWh, "
                    f"target={target_capacity_kwh:.2f}kWh, max_price={max_charging_price}CZK, "
                    f"percentile={peak_percentile}%"
                )

                # Identifikovat špičky podle percentilu
                prices = [
                    point.get("spot_price_czk", 0)
                    for point in timeline_data
                    if point.get("spot_price_czk") is not None
                ]
                if not prices:
                    _LOGGER.warning("No price data available for optimization")
                    return timeline_data

                price_threshold = np.percentile(prices, peak_percentile)
                _LOGGER.debug(
                    f"Price threshold (percentile {peak_percentile}%): {price_threshold:.2f} CZK/kWh"
                )

                # Kopie timeline pro úpravy
                optimized_timeline = [dict(point) for point in timeline_data]

                # Použít starý algoritmus
                optimized_timeline = self._smart_charging_plan(
                    optimized_timeline,
                    min_capacity_kwh,
                    target_capacity_kwh,
                    max_charging_price,
                    price_threshold,
                    charging_power_kw,
                    max_capacity,
                )

            return optimized_timeline

        except Exception as e:
            _LOGGER.error(f"Error in grid charging optimization: {e}", exc_info=True)
            return timeline_data

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
            min_soc_charge = result_charge["min_soc"]
            final_soc_charge = result_charge["final_soc"]
            death_valley_charge = result_charge["death_valley_reached"]

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
            final_soc_wait = result_wait["final_soc"]
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
        used_intervals = set()  # Sledovat použité intervaly

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

    def _fix_minimum_capacity_violations(
        self,
        timeline: List[Dict[str, Any]],
        min_capacity: float,
        max_price: float,
        price_threshold: float,
        charging_power_kw: float,
    ) -> List[Dict[str, Any]]:
        """
        Opraví všechna místa kde kapacita klesne pod minimum.

        Args:
            timeline: Timeline data
            min_capacity: Minimální kapacita (kWh)
            max_price: Maximální cena pro nabíjení (CZK/kWh)
            price_threshold: Práh pro špičky (CZK/kWh)
            charging_power_kw: Nabíjecí výkon (kW)

        Returns:
            Opravená timeline
        """
        max_iterations = 50  # Ochrana proti nekonečné smyčce
        iteration = 0

        while iteration < max_iterations:
            violation_index = self._find_first_minimum_violation(timeline, min_capacity)
            if violation_index is None:
                break  # Žádné porušení

            _LOGGER.debug(
                f"Found minimum violation at index {violation_index}, capacity={timeline[violation_index]['battery_capacity_kwh']:.2f}kWh"
            )

            # Najdi nejlevnější vhodnou hodinu PŘED porušením
            charging_index = self._find_cheapest_hour_before(
                timeline, violation_index, max_price, price_threshold
            )

            if charging_index is None:
                _LOGGER.warning(
                    f"Cannot fix minimum violation at index {violation_index} - no suitable charging time found"
                )
                break  # Nelze opravit

            # Přidej nabíjení a přepočítej od tohoto bodu
            charge_kwh = charging_power_kw / 4.0  # kW → kWh za 15min
            old_charge = timeline[charging_index].get("grid_charge_kwh", 0)
            timeline[charging_index]["grid_charge_kwh"] = old_charge + charge_kwh
            # Ponechat existující reason (může být balancing_*)
            if timeline[charging_index].get("reason") == "normal":
                timeline[charging_index]["reason"] = "legacy_violation_fix"

            _LOGGER.debug(
                f"Adding {charge_kwh:.2f}kWh charging at index {charging_index}, price={timeline[charging_index]['spot_price_czk']:.2f}CZK"
            )

            self._recalculate_timeline_from_index(timeline, charging_index)
            iteration += 1

        if iteration >= max_iterations:
            _LOGGER.warning("Reached max iterations in minimum capacity fixing")

        return timeline

    def _ensure_target_capacity_at_end(
        self,
        timeline: List[Dict[str, Any]],
        target_capacity: float,
        max_price: float,
        price_threshold: float,
        charging_power_kw: float,
    ) -> List[Dict[str, Any]]:
        """
        Zajistí cílovou kapacitu na konci intervalu.

        Args:
            timeline: Timeline data
            target_capacity: Cílová kapacita (kWh)
            max_price: Maximální cena pro nabíjení (CZK/kWh)
            price_threshold: Práh pro špičky (CZK/kWh)
            charging_power_kw: Nabíjecí výkon (kW)

        Returns:
            Optimalizovaná timeline
        """
        if not timeline:
            return timeline

        max_iterations = 50  # Ochrana proti nekonečné smyčce
        iteration = 0

        while iteration < max_iterations:
            final_capacity = timeline[-1].get("battery_capacity_kwh", 0)
            if final_capacity >= target_capacity:
                _LOGGER.debug(
                    f"Target capacity achieved: {final_capacity:.2f}kWh >= {target_capacity:.2f}kWh"
                )
                break

            shortage = target_capacity - final_capacity
            _LOGGER.debug(f"Target capacity shortage: {shortage:.2f}kWh")

            # Najdi nejlevnější vhodnou hodinu v celém intervalu
            charging_index = self._find_cheapest_suitable_hour(
                timeline, max_price, price_threshold
            )

            if charging_index is None:
                _LOGGER.warning(
                    "Cannot achieve target capacity - no suitable charging time found"
                )
                break

            # Přidej nabíjení a přepočítej od tohoto bodu
            charge_kwh = charging_power_kw / 4.0  # kW → kWh za 15min
            old_charge = timeline[charging_index].get("grid_charge_kwh", 0)
            timeline[charging_index]["grid_charge_kwh"] = old_charge + charge_kwh
            # Ponechat existující reason (může být balancing_*)
            if timeline[charging_index].get("reason") == "normal":
                timeline[charging_index]["reason"] = "legacy_target_ensure"

            _LOGGER.debug(
                f"Adding {charge_kwh:.2f}kWh charging at index {charging_index} for target capacity"
            )

            self._recalculate_timeline_from_index(timeline, charging_index)
            iteration += 1

        if iteration >= max_iterations:
            _LOGGER.warning("Reached max iterations in target capacity ensuring")

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

    def _process_adaptive_consumption_for_dashboard(
        self, adaptive_profiles: Optional[Dict[str, Any]]
    ) -> None:
        """Zpracuj adaptive data pro dashboard (do attributes).

        Vypočítá:
        - remaining_kwh: zbývající spotřeba do konce dne
        - profile_name: lidsky čitelný název profilu
        - profile_details: season, day_count, shoda
        - charging_cost_today: celková cena za nabíjení dnes
        """
        # Check if adaptive_profiles is valid Dict (not list or None)
        if not adaptive_profiles or not isinstance(adaptive_profiles, dict):
            _LOGGER.debug(
                f"No adaptive profiles for dashboard: type={type(adaptive_profiles)}"
            )
            self._adaptive_consumption_data = {}
            return

        # 1. Zbývající spotřeba do konce dne
        now = datetime.now()
        current_hour = now.hour
        remaining_kwh = 0.0

        today_profile = adaptive_profiles.get("today_profile")
        if today_profile and "hourly_consumption" in today_profile:
            hourly = today_profile["hourly_consumption"]
            if isinstance(hourly, list):
                for hour in range(current_hour, 24):
                    if hour < len(hourly):
                        remaining_kwh += hourly[hour]
            elif isinstance(hourly, dict):
                for hour in range(current_hour, 24):
                    remaining_kwh += hourly.get(hour, 0.0)

        # 2. Profil název a detaily
        profile_name = adaptive_profiles.get("profile_name", "Neznámý profil")
        match_score = adaptive_profiles.get("match_score", 0)

        profile_details = ""
        if today_profile:
            season = today_profile.get("season", "")
            day_count = today_profile.get("day_count", 0)

            season_names = {
                "winter": "zimní",
                "spring": "jarní",
                "summer": "letní",
                "autumn": "podzimní",
            }
            season_cz = season_names.get(season, season)

            profile_details = f"{season_cz}, {day_count} podobných dnů"
            if match_score > 0:
                profile_details += f" • {int(match_score)}% shoda"

        # 3. Cena za nabíjení dnes (sečti z timeline)
        charging_cost_today = 0.0
        today_date = now.date()

        for entry in self._timeline_data:
            timestamp_str = entry.get("timestamp")
            if not timestamp_str:
                continue

            try:
                entry_dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                if entry_dt.date() == today_date:
                    charging_kwh = entry.get("charging_kwh", 0)
                    spot_price = entry.get("spot_price_czk_per_kwh", 0)
                    if charging_kwh > 0 and spot_price > 0:
                        charging_cost_today += charging_kwh * spot_price
            except (ValueError, AttributeError):
                continue

        # Uložit do instance
        self._adaptive_consumption_data = {
            "remaining_kwh": round(remaining_kwh, 1),
            "profile_name": profile_name,
            "profile_details": profile_details,
            "charging_cost_today": round(charging_cost_today, 0),
        }

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

    def _get_profiles_from_sensor(self) -> Dict[str, Any]:
        """Načte profily z adaptive sensor a převede list na dict."""
        try:
            profiles_sensor = f"sensor.oig_{self._box_id}_adaptive_load_profiles"

            if not self._hass:
                return {}

            profiles_state = self._hass.states.get(profiles_sensor)
            if not profiles_state:
                return {}

            profiles_list = profiles_state.attributes.get("profiles", [])

            # Převést list na dict s profile_id jako klíčem
            if isinstance(profiles_list, list):
                return {
                    p.get("profile_id", f"profile_{i}"): p
                    for i, p in enumerate(profiles_list)
                }
            elif isinstance(profiles_list, dict):
                return profiles_list
            else:
                _LOGGER.warning(f"Unexpected profiles type: {type(profiles_list)}")
                return {}

        except Exception as e:
            _LOGGER.debug(f"Error getting profiles: {e}")
            return {}

    async def _get_today_hourly_consumption(self) -> List[float]:
        """
        Načte dnešní spotřebu po hodinách (od půlnoci do teď).

        Returns:
            List hodinových spotřeb v kWh (např. [0.5, 0.4, 0.3, ..., 1.2])
        """
        try:
            consumption_sensor = f"sensor.oig_{self._box_id}_actual_aco_p"

            # Načíst ze statistics (hodinové průměry)
            from homeassistant.components.recorder import get_instance
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

    def _calculate_profile_similarity(
        self, today_hourly: List[float], profile_hourly: List[float]
    ) -> float:
        """
        Vypočítá podobnost dnešní křivky s profilem (MAPE scoring).

        Returns:
            float: Score 0-100% (vyšší = lepší match)
        """
        if not today_hourly or len(today_hourly) == 0:
            return 0

        # Porovnat jen hodiny které už proběhly
        compare_length = min(len(today_hourly), len(profile_hourly))

        total_error = 0
        valid_hours = 0

        for i in range(compare_length):
            actual = today_hourly[i]
            expected = profile_hourly[i]

            if actual > 0:  # Ignore zero hours
                error = abs(actual - expected) / actual
                total_error += error
                valid_hours += 1

        if valid_hours == 0:
            return 0

        avg_error = total_error / valid_hours
        score = max(0, 100 - (avg_error * 100))

        return score

    def _select_tomorrow_profile(
        self, profiles: Dict[str, Any], current_time: datetime
    ) -> Optional[Dict[str, Any]]:
        """
        Vybere profil pro zítřek podle day_type a transition.

        Args:
            profiles: Všechny dostupné profily
            current_time: Aktuální čas

        Returns:
            Profil pro zítřek nebo None
        """
        try:
            tomorrow = current_time + timedelta(days=1)
            tomorrow_weekday = tomorrow.weekday()
            today_weekday = current_time.weekday()

            # Určit season pro zítřek
            month = tomorrow.month
            if month in [12, 1, 2]:
                season = "winter"
            elif month in [3, 4, 5]:
                season = "spring"
            elif month in [6, 7, 8]:
                season = "summer"
            else:
                season = "autumn"

            # Detekovat transition
            transition_type = None

            # Pátek (4) → Sobota (5)
            if today_weekday == 4 and tomorrow_weekday == 5:
                transition_type = "friday_to_saturday"
            # Neděle (6) → Pondělí (0)
            elif today_weekday == 6 and tomorrow_weekday == 0:
                transition_type = "sunday_to_monday"

            # 1. Zkusit najít transition profil
            if transition_type:
                transition_profile_id = f"{transition_type}_{season}"
                for profile_id, profile in profiles.items():
                    if profile_id.startswith(transition_profile_id):
                        _LOGGER.debug(
                            f"Using transition profile for tomorrow: {profile_id}"
                        )
                        return profile

            # 2. Fallback: standardní profil podle day_type
            tomorrow_is_weekend = tomorrow_weekday >= 5
            day_type = "weekend" if tomorrow_is_weekend else "weekday"
            standard_profile_id = f"{day_type}_{season}"

            best_match = None
            for profile_id, profile in profiles.items():
                if profile_id.startswith(standard_profile_id):
                    # Vezmi první matching profil
                    if not best_match:
                        best_match = profile
                    # Nebo preferuj "typical" level
                    elif "_typical" in profile_id or len(profile_id.split("_")) == 2:
                        best_match = profile

            if best_match:
                _LOGGER.debug(
                    f"Using standard profile for tomorrow: {day_type}_{season}"
                )

            return best_match

        except Exception as e:
            _LOGGER.debug(f"Error selecting tomorrow profile: {e}")
            return None

    async def _get_consumption_today(self) -> Optional[float]:
        """Získat celkovou spotřebu dnes od půlnoci do teď."""
        try:
            consumption_sensor = f"sensor.oig_{self._box_id}_actual_aco_p"

            start_time = dt_util.now().replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            end_time = dt_util.now()

            # Načíst states z recorderu
            from homeassistant.components.recorder import history

            states = await self.hass.async_add_executor_job(
                history.get_significant_states,
                self.hass,
                start_time,
                end_time,
                [consumption_sensor],
            )

            if not states or consumption_sensor not in states:
                return None

            consumption_states = states[consumption_sensor]
            if not consumption_states:
                return None

            # Spočítat průměr a vynásobit hodinami
            import statistics

            valid_values = []
            for state in consumption_states:
                try:
                    value = float(state.state)
                    if 0 <= value <= 20000:  # Sanity check
                        valid_values.append(value)
                except (ValueError, AttributeError):
                    continue

            if not valid_values:
                return None

            avg_watts = statistics.mean(valid_values)
            hours_elapsed = (end_time - start_time).total_seconds() / 3600
            total_kwh = (avg_watts / 1000) * hours_elapsed

            return total_kwh

        except Exception as e:
            _LOGGER.debug(f"Error getting consumption today: {e}")
            return None

    def _get_load_avg_fallback(self) -> float:
        """
        Fallback: Získá průměr z load_avg senzorů pro aktuální čas.

        Returns:
            float: kWh/h
        """
        current_time = dt_util.now()
        is_weekend = current_time.weekday() >= 5
        day_type = "weekend" if is_weekend else "weekday"

        hour = current_time.hour
        if 6 <= hour < 8:
            time_block = "6_8"
        elif 8 <= hour < 12:
            time_block = "8_12"
        elif 12 <= hour < 16:
            time_block = "12_16"
        elif 16 <= hour < 22:
            time_block = "16_22"
        else:
            time_block = "22_6"

        sensor_id = f"sensor.oig_{self._box_id}_load_avg_{time_block}_{day_type}"

        if self._hass:
            sensor_state = self._hass.states.get(sensor_id)
            if sensor_state and sensor_state.state not in ["unknown", "unavailable"]:
                try:
                    watt = float(sensor_state.state)
                    return watt / 1000  # W → kWh/h
                except (ValueError, TypeError):
                    pass

        # Ultimate fallback
        return 0.48

    # ═══════════════════════════════════════════════════════════════════════════
    # UNIFIED CHARGING PLANNER - Centrální funkce pro plánování nabíjení
    # ═══════════════════════════════════════════════════════════════════════════

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
            _LOGGER.debug(f"[Planner] No active plan to cancel")
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
        charge_per_15min = config.get("home_charge_rate", 2.8) / 4.0

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

    def _calculate_charging_intervals(
        self,
    ) -> tuple[List[Dict[str, Any]], float, float]:
        """Vypočítá intervaly nabíjení ze sítě z battery_forecast dat."""
        # Načíst battery_forecast data z coordinátoru
        if not self.coordinator.data:
            return [], 0.0, 0.0

        battery_forecast = self.coordinator.data.get("battery_forecast")
        if not battery_forecast or not isinstance(battery_forecast, dict):
            return [], 0.0, 0.0

        timeline_data = battery_forecast.get("timeline_data", [])
        if not timeline_data:
            return [], 0.0, 0.0

        # Extrahovat intervaly s plánovaným nabíjením ze sítě
        charging_intervals = []
        total_energy = 0.0
        total_cost = 0.0
        now = datetime.now()
        # Zahrnout intervaly od (now - 10 minut) pro detekci probíhajícího nabíjení
        time_threshold = now - timedelta(minutes=10)

        # Pro kontrolu, jestli se baterie nabíjí, potřebujeme předchozí kapacitu
        # Inicializovat z posledního bodu PŘED time_threshold
        prev_battery_capacity = None
        for point in timeline_data:
            try:
                timestamp_str = point.get("timestamp", "")
                timestamp = datetime.fromisoformat(timestamp_str)
                if timestamp < time_threshold:
                    prev_battery_capacity = point.get("battery_capacity_kwh", 0)
                else:
                    break  # Jakmile najdeme bod >= threshold, ukončíme
            except (ValueError, TypeError):
                continue

        # Pokud jsme nenašli žádný bod před threshold (timeline začíná až od "teď"),
        # použijeme AKTUÁLNÍ kapacitu baterie ze sensoru
        if prev_battery_capacity is None:
            # Zkusit načíst aktuální kapacitu ze sensoru
            if hasattr(self, "hass") and self.hass:
                sensor_id = f"sensor.oig_{self._box_id}_remaining_usable_capacity"
                state = self.hass.states.get(sensor_id)
                if state and state.state not in ["unknown", "unavailable"]:
                    try:
                        prev_battery_capacity = float(state.state)
                        _LOGGER.debug(
                            f"Using current battery capacity from sensor: {prev_battery_capacity:.2f} kWh"
                        )
                    except (ValueError, TypeError):
                        pass

            # Fallback: použít první bod z timeline
            if prev_battery_capacity is None and timeline_data:
                prev_battery_capacity = timeline_data[0].get("battery_capacity_kwh", 0)
                _LOGGER.debug(
                    f"Using first timeline point as prev_capacity: {prev_battery_capacity:.2f} kWh"
                )

        for point in timeline_data:
            grid_charge_kwh = point.get("grid_charge_kwh", 0)
            battery_capacity = point.get("battery_capacity_kwh", 0)
            # FIX: Timeline má klíč "mode_name" ne "mode"
            mode = point.get("mode_name", point.get("mode", ""))

            # OPRAVA: Detekce nabíjení podle režimu UPS místo grid_charge_kwh
            # Při balancování může být grid_charge_kwh=0 (nabíjení ze solaru)
            # ale mode je stále "Home UPS"
            is_ups_mode = mode == "Home UPS"

            if is_ups_mode:
                timestamp_str = point.get("timestamp", "")
                try:
                    timestamp = datetime.fromisoformat(timestamp_str)
                    # Interval trvá 15 minut
                    interval_end = timestamp + timedelta(minutes=15)

                    # FIX grid_charging_planned bug:
                    # Zahrnout interval pokud:
                    # 1. Aktuálně probíhá (timestamp <= now < interval_end), NEBO
                    # 2. Začne v budoucnu (timestamp > now), NEBO
                    # 3. Skončil nedávno (timestamp >= time_threshold) pro historii
                    #
                    # DŮLEŽITÉ: interval_end >= now (ne >), aby se zahrnul i interval
                    # který právě skončil (now = 06:30, interval 06:15-06:30)
                    if interval_end >= now or timestamp >= time_threshold:
                        spot_price_czk = point.get("spot_price_czk", 0)

                        # OPRAVA: Při režimu "Home UPS" vždy považujeme za nabíjení
                        # (i když grid_charge_kwh=0, protože může být balancování ze solárů)
                        # Zjistit, jestli se baterie SKUTEČNĚ nabíjí z gridu
                        # (kapacita roste oproti předchozímu bodu)
                        # DŮLEŽITÉ: battery_capacity v timeline je PŘED grid charge!
                        # Musíme přičíst grid_charge_kwh pro správné porovnání
                        is_actually_charging = False
                        reason = point.get("reason", "")
                        is_balancing_holding = "balancing_holding" in reason

                        if prev_battery_capacity is not None:
                            # Kapacita PO grid charge = kapacita před + grid charge
                            capacity_after_charging = battery_capacity + grid_charge_kwh
                            capacity_increase = (
                                capacity_after_charging - prev_battery_capacity
                            )
                            # Pokud kapacita vzrostla, baterie se nabíjí
                            # (tolerance 0.01 kWh pro zaokrouhlovací chyby)
                            is_actually_charging = capacity_increase > 0.01

                        # Přidat interval do seznamu (všechny s UPS režimem)
                        # is_charging_battery = True protože máme "Home UPS" režim
                        interval_data = {
                            "timestamp": timestamp_str,
                            "energy_kwh": round(
                                grid_charge_kwh, 3
                            ),  # Celková grid energie
                            "spot_price_czk": round(spot_price_czk, 2),
                            "battery_capacity_kwh": round(battery_capacity, 2),
                            "is_charging_battery": True,  # OPRAVA: Vždy True při "Home UPS"
                        }

                        # Pokud se baterie SKUTEČNĚ nabíjí, počítáme energii a cenu
                        if is_actually_charging:
                            # Grid energie jde do baterie (grid_charge_kwh)
                            # Může pokrýt i současnou spotřebu, ale to nás nezajímá
                            # Chceme vědět kolik energie šlo DO BATERIE
                            cost_czk = grid_charge_kwh * spot_price_czk
                            interval_data["cost_czk"] = round(cost_czk, 2)
                            interval_data["battery_charge_kwh"] = round(
                                grid_charge_kwh, 3
                            )  # Energie z gridu
                            total_energy += grid_charge_kwh
                            total_cost += cost_czk
                        elif is_balancing_holding:
                            # BALANCING HOLDING: Baterie na 100%, grid pokrývá spotřebu
                            # Nezapočítáváme do total_energy (nebyla energie ze sítě DO baterie)
                            # Ale chceme interval zobrazit v grid_charging_planned
                            consumption_kwh = point.get("consumption_kwh", 0)
                            holding_cost = consumption_kwh * spot_price_czk
                            interval_data["cost_czk"] = round(holding_cost, 2)
                            interval_data["battery_charge_kwh"] = 0.0
                            interval_data["note"] = (
                                "Balancing holding - battery at 100%, grid covers consumption"
                            )
                            # Holding cost se NEZAPOČÍTÁVÁ do total_cost (to je jen charging cost)
                        else:
                            # Grid pokrývá spotřebu, ne nabíjení baterie
                            interval_data["cost_czk"] = 0.0
                            interval_data["battery_charge_kwh"] = 0.0
                            interval_data["note"] = (
                                "Grid covers consumption, battery not charging"
                            )

                        charging_intervals.append(interval_data)

                except (ValueError, TypeError) as e:
                    _LOGGER.debug(
                        f"Invalid timestamp in timeline: {timestamp_str}, error: {e}"
                    )
                    # I když je chyba, musíme update prev_battery_capacity
                    prev_battery_capacity = battery_capacity
                    continue

            # KRITICKÉ: Aktualizovat prev_battery_capacity VŽDY (i když grid_charge=0)!
            # Jinak při mezerách v nabíjení dostáváme špatné capacity_increase
            prev_battery_capacity = battery_capacity

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
        """Vrátí stav senzoru - on pokud TEĎKA probíhá HOME UPS interval."""
        # Data jsou v coordinator.battery_forecast_data
        battery_forecast = getattr(self.coordinator, "battery_forecast_data", None)
        if not battery_forecast or not isinstance(battery_forecast, dict):
            return "off"

        timeline_data = battery_forecast.get("timeline_data", [])
        if not timeline_data:
            return "off"

        now = datetime.now()

        # Projít timeline a najít interval který TEĎKA probíhá
        for point in timeline_data:
            try:
                timestamp_str = point.get("timestamp", "")
                timestamp = datetime.fromisoformat(timestamp_str)
                interval_end = timestamp + timedelta(minutes=15)

                # Pokud NOW je v tomto intervalu (timestamp <= now < interval_end)
                if timestamp <= now < interval_end:
                    # Zkontrolovat mód (může být "Home UPS" nebo "HOME UPS")
                    mode = point.get("mode_name", point.get("mode", ""))
                    if mode.upper() == "HOME UPS":
                        return "on"
                    else:
                        return "off"
            except (ValueError, TypeError):
                continue

        return "off"

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Vrátí atributy senzoru - všechny HOME UPS intervaly."""
        # Data jsou v coordinator.battery_forecast_data
        battery_forecast = getattr(self.coordinator, "battery_forecast_data", None)
        if not battery_forecast or not isinstance(battery_forecast, dict):
            _LOGGER.warning(
                f"[GridChargingPlan] No battery_forecast_data in coordinator"
            )
            return {}

        timeline_data = battery_forecast.get("timeline_data", [])
        if not timeline_data:
            _LOGGER.warning(
                f"[GridChargingPlan] Empty timeline_data in battery_forecast"
            )
            return {}

        _LOGGER.info(
            f"[GridChargingPlan] Processing {len(timeline_data)} timeline points"
        )

        now = datetime.now()
        charging_intervals = []  # Dashboard očekává "charging_intervals"
        next_charging_start = None
        next_charging_end = None

        # Najít všechny HOME UPS intervaly
        for point in timeline_data:
            try:
                timestamp_str = point.get("timestamp", "")
                timestamp = datetime.fromisoformat(timestamp_str)
                mode = point.get("mode_name", point.get("mode", ""))

                # Porovnat case-insensitive (může být "Home UPS" nebo "HOME UPS")
                if mode.upper() == "HOME UPS":
                    interval_end = timestamp + timedelta(minutes=15)
                    energy_kwh = point.get("grid_charge_kwh", 0)
                    spot_price = point.get("spot_price_czk", 0)
                    cost_czk = energy_kwh * spot_price

                    charging_intervals.append(
                        {
                            "timestamp": timestamp_str,  # ISO format pro backend
                            "start": timestamp.strftime("%H:%M"),  # Jen čas
                            "end": interval_end.strftime("%H:%M"),
                            "energy_kwh": round(energy_kwh, 3),
                            "spot_price_czk": round(spot_price, 2),
                            "cost_czk": round(cost_czk, 2),
                            "battery_capacity_kwh": round(
                                point.get("battery_capacity_kwh", 0), 2
                            ),
                            "is_charging_battery": True,  # HOME UPS znamená nabíjení
                        }
                    )

                    # Najít další nabíjecí interval v budoucnu
                    if next_charging_start is None and timestamp > now:
                        next_charging_start = timestamp
                        next_charging_end = interval_end
            except (ValueError, TypeError):
                continue

        # Vypočítat celkovou energii a cenu
        total_energy_kwh = sum(i.get("energy_kwh", 0) for i in charging_intervals)
        total_cost_czk = sum(
            i.get("energy_kwh", 0) * i.get("spot_price_czk", 0)
            for i in charging_intervals
        )

        # Formátovat next_charging_time_range a duration
        next_charging_time_range = None
        next_charging_duration = None
        if next_charging_start:
            next_charging_time_range = (
                f"{next_charging_start.strftime('%H:%M')} - "
                f"{next_charging_end.strftime('%H:%M')}"
            )
            duration_minutes = (next_charging_end - next_charging_start).seconds // 60
            next_charging_duration = f"{duration_minutes} min"

        return {
            "charging_intervals": charging_intervals,  # Dashboard očekává tento klíč
            "total_energy_kwh": round(total_energy_kwh, 2),
            "total_cost_czk": round(total_cost_czk, 2),
            "next_charging_time_range": next_charging_time_range,
            "next_charging_duration": next_charging_duration,
            "is_charging_planned": len(charging_intervals) > 0,
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
            _LOGGER.debug(f"📊 Skipping interval tracking - missing data")

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
