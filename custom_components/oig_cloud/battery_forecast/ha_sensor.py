"""Zjednodušený senzor pro predikci nabití baterie v průběhu dne."""

import asyncio
import copy
import logging
import time
from datetime import date, datetime, timedelta
from typing import Any, Callable, ClassVar, Dict, List, Optional, Tuple, Union

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from . import auto_switch as auto_switch_module
from . import battery_state as battery_state_module
from . import charging_plan as charging_plan_module
from . import detail_tabs as detail_tabs_module
from . import mode_recommendations as mode_recommendations_module
from . import load_profiles as load_profiles_module
from . import plan_storage as plan_storage_module
from . import pricing as pricing_module
from . import precompute as precompute_module
from . import solar_forecast as solar_forecast_module
from . import unified_cost_tile as unified_cost_tile_module
from . import scenario_analysis as scenario_analysis_module
from . import interval_grouping as interval_grouping_module
from . import state_attributes as state_attributes_module
from . import forecast_update as forecast_update_module
from . import sensor_lifecycle as sensor_lifecycle_module
from .timeline import extended as timeline_extended_module

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
        """Proxy to lifecycle helpers."""
        await super().async_added_to_hass()
        self._hass = self.hass
        await sensor_lifecycle_module.async_added_to_hass(self)

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
        """Proxy to state attribute helpers."""
        return state_attributes_module.build_extra_state_attributes(
            self, debug_expose_baseline_timeline=DEBUG_EXPOSE_BASELINE_TIMELINE
        )

    def _calculate_data_hash(self, timeline_data: List[Dict[str, Any]]) -> str:
        """Proxy to state attribute helpers."""
        return state_attributes_module.calculate_data_hash(timeline_data)

    async def async_update(self) -> None:  # noqa: C901
        """Proxy to forecast update helpers."""
        await super().async_update()
        await forecast_update_module.async_update(self)

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
        """Proxy to scenario analysis helpers."""
        return scenario_analysis_module.simulate_interval(
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

    def _calculate_interval_cost(
        self,
        simulation_result: Dict[str, Any],
        spot_price: float,
        export_price: float,
        time_of_day: str,
    ) -> Dict[str, Any]:
        """Proxy to scenario analysis helpers."""
        return scenario_analysis_module.calculate_interval_cost(
            simulation_result,
            spot_price,
            export_price,
            time_of_day,
        )

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
        """Proxy to scenario analysis helpers."""
        return scenario_analysis_module.calculate_fixed_mode_cost(
            self,
            fixed_mode=fixed_mode,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
            physical_min_capacity=physical_min_capacity,
        )

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
        """Proxy to scenario analysis helpers."""
        return scenario_analysis_module.calculate_mode_baselines(
            self,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            physical_min_capacity=physical_min_capacity,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
        )

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
        """Proxy to scenario analysis helpers."""
        return scenario_analysis_module.calculate_do_nothing_cost(
            self,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
        )

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
        """Proxy to scenario analysis helpers."""
        return scenario_analysis_module.calculate_full_ups_cost(
            self,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
        )

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
        """Proxy to scenario analysis helpers."""
        return scenario_analysis_module.generate_alternatives(
            self,
            spot_prices=spot_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
            optimal_cost_48h=optimal_cost_48h,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            efficiency=efficiency,
        )

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
        """Proxy to battery state helpers."""
        return battery_state_module.get_total_battery_capacity(self)

    def _get_current_battery_soc_percent(self) -> Optional[float]:
        """Proxy to battery state helpers."""
        return battery_state_module.get_current_battery_soc_percent(self)

    def _get_current_battery_capacity(self) -> Optional[float]:
        """Proxy to battery state helpers."""
        return battery_state_module.get_current_battery_capacity(self)

    def _get_max_battery_capacity(self) -> Optional[float]:
        """Proxy to battery state helpers."""
        return battery_state_module.get_max_battery_capacity(self)

    def _get_min_battery_capacity(self) -> Optional[float]:
        """Proxy to battery state helpers."""
        return battery_state_module.get_min_battery_capacity(self)

    def _get_target_battery_capacity(self) -> Optional[float]:
        """Proxy to battery state helpers."""
        return battery_state_module.get_target_battery_capacity(self)

    async def _maybe_fix_daily_plan(self) -> None:  # noqa: C901
        """Proxy to plan storage helpers."""
        await plan_storage_module.maybe_fix_daily_plan(self)

    async def _load_plan_from_storage(self, date_str: str) -> Optional[Dict[str, Any]]:
        """Proxy to plan storage helpers."""
        return await plan_storage_module.load_plan_from_storage(self, date_str)

    async def _save_plan_to_storage(
        self,
        date_str: str,
        intervals: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Proxy to plan storage helpers."""
        return await plan_storage_module.save_plan_to_storage(
            self, date_str, intervals, metadata
        )

    async def _plan_exists_in_storage(self, date_str: str) -> bool:
        """Proxy to plan storage helpers."""
        return await plan_storage_module.plan_exists_in_storage(self, date_str)

    def _is_baseline_plan_invalid(self, plan: Optional[Dict[str, Any]]) -> bool:
        """Proxy to plan storage helpers."""
        return plan_storage_module.is_baseline_plan_invalid(plan)

    async def _create_baseline_plan(self, date_str: str) -> bool:
        """Proxy to plan storage helpers."""
        return await plan_storage_module.create_baseline_plan(self, date_str)

    async def ensure_plan_exists(self, date_str: str) -> bool:
        """Proxy to plan storage helpers."""
        return await plan_storage_module.ensure_plan_exists(self, date_str)

    async def _aggregate_daily(self, date_str: str) -> bool:
        """Proxy to plan storage helpers."""
        return await plan_storage_module.aggregate_daily(self, date_str)

    async def _aggregate_weekly(
        self, week_str: str, start_date: str, end_date: str
    ) -> bool:
        """Proxy to plan storage helpers."""
        return await plan_storage_module.aggregate_weekly(
            self, week_str, start_date, end_date
        )

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
        """Proxy to interval grouping helpers."""
        return interval_grouping_module.group_intervals_by_mode(
            intervals, data_type=data_type, mode_names=CBB_MODE_NAMES
        )

    async def _backfill_daily_archive_from_storage(self) -> None:
        """Proxy to plan storage helpers."""
        await plan_storage_module.backfill_daily_archive_from_storage(self)

    def _get_battery_efficiency(self) -> float:
        """Proxy to battery state helpers."""
        return battery_state_module.get_battery_efficiency(self)

    def _get_ac_charging_limit_kwh_15min(self) -> float:
        """Proxy to battery state helpers."""
        return battery_state_module.get_ac_charging_limit_kwh_15min(self)

    def _get_current_mode(self) -> int:
        """Proxy to battery state helpers."""
        return battery_state_module.get_current_mode(self)

    def _get_boiler_available_capacity(self) -> float:
        """Proxy to battery state helpers."""
        return battery_state_module.get_boiler_available_capacity(self)

    def _calculate_final_spot_price(
        self, raw_spot_price: float, target_datetime: datetime
    ) -> float:
        """Proxy to pricing helpers."""
        return pricing_module.calculate_final_spot_price(
            self, raw_spot_price, target_datetime
        )

    async def _get_spot_price_timeline(self) -> List[Dict[str, Any]]:
        """Proxy to pricing helpers."""
        return await pricing_module.get_spot_price_timeline(self)

    async def _get_export_price_timeline(self) -> List[Dict[str, Any]]:
        """Proxy to pricing helpers."""
        return await pricing_module.get_export_price_timeline(self)

    def _get_spot_data_from_price_sensor(
        self, *, price_type: str
    ) -> Optional[Dict[str, Any]]:
        """Proxy to pricing helpers."""
        return pricing_module.get_spot_data_from_price_sensor(
            self, price_type=price_type
        )

    async def _get_spot_data_from_ote_cache(self) -> Optional[Dict[str, Any]]:
        """Proxy to pricing helpers."""
        return await pricing_module.get_spot_data_from_ote_cache(self)

    def _get_solar_forecast(self) -> Dict[str, Any]:
        """Proxy to solar forecast helpers."""
        return solar_forecast_module.get_solar_forecast(self)

    def _get_solar_forecast_strings(self) -> Dict[str, Any]:
        """Proxy to solar forecast helpers."""
        return solar_forecast_module.get_solar_forecast_strings(self)

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
        """Proxy to load profile helpers."""
        return load_profiles_module.get_load_avg_sensors(self)

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
