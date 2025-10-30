"""Zjednodušený senzor pro predikci nabití baterie v průběhu dne."""

import logging
import math
import numpy as np
import copy
import json
import hashlib
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
from collections import defaultdict

from homeassistant.components.sensor import (
    SensorEntity,
    SensorDeviceClass,
    SensorStateClass,
)
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.util import dt as dt_util

from .oig_cloud_data_sensor import OigCloudDataSensor

_LOGGER = logging.getLogger(__name__)

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

        # Phase 1.5: Hash-based change detection
        self._data_hash: Optional[str] = (
            None  # MD5 hash of timeline_data for efficient change detection
        )

        # Phase 2.7: HOME I timeline cache for savings calculation
        self._home_i_timeline_cache: List[Dict[str, Any]] = []

        # Unified charging planner - aktivní plán
        self._active_charging_plan: Optional[Dict[str, Any]] = None
        self._plan_status: str = "none"  # none | pending | active | completed

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - restore persistent data."""
        await super().async_added_to_hass()
        self._hass = self.hass

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

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA."""
        await super().async_will_remove_from_hass()

    def _handle_coordinator_update(self) -> None:
        """Handle coordinator update - přepočítat forecast při každé aktualizaci dat."""
        # Zavolat async_update v background tasku
        if self.hass:
            self.hass.async_create_task(self.async_update())
        # Volat parent pro standardní zpracování
        super()._handle_coordinator_update()

    @property
    def device_info(self) -> Optional[Dict[str, Any]]:
        """Return device info - Analytics Module."""
        return self._device_info

    @property
    def state(self) -> Optional[Union[float, str]]:
        """
        State = hash of timeline data (first 8 chars).

        Phase 1.5: Hash-based change detection
        - State changes only when timeline data actually changes
        - Frontend watches state via WebSocket
        - On change -> fetch new data from API
        - Current capacity moved to attributes

        Returns:
            First 8 chars of MD5 hash or "unknown"
        """
        if self._data_hash:
            return self._data_hash[:8]
        return "unknown"

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
            # Current state (moved from state property)
            "current_battery_kwh": (
                round(self._timeline_data[0].get("battery_capacity_kwh", 0), 2)
                if self._timeline_data
                else 0
            ),
            "current_timestamp": (
                self._timeline_data[0].get("timestamp") if self._timeline_data else None
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
                "timeline_length": len(mo.get("optimal_timeline", [])),
            }

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

        # Calculate MD5 hash
        return hashlib.md5(data_str.encode()).hexdigest()

    async def async_update(self) -> None:
        """Update sensor data."""
        await super().async_update()

        try:
            # Update plan lifecycle status FIRST
            self.update_plan_lifecycle()

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

            if current_capacity is None or not spot_prices:
                _LOGGER.info(
                    f"Missing required data for battery forecast: "
                    f"current_capacity={current_capacity}, spot_prices count={len(spot_prices)}"
                )
                return

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
                        hourly_kwh = profile["hourly_consumption"][hour]
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
                self._mode_optimization_result = self._calculate_optimal_modes_hybrid(
                    current_capacity=current_capacity,
                    max_capacity=max_capacity,
                    min_capacity=min_capacity,
                    target_capacity=target_capacity,
                    spot_prices=spot_prices,
                    export_prices=export_prices,
                    solar_forecast=solar_forecast,
                    load_forecast=load_forecast,
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

            # PHASE 2.9: Fix daily plan at midnight for tracking (AFTER optimization)
            await self._maybe_fix_daily_plan()

            # SIMPLIFIED: VŽDY počítat JEN ACTIVE timeline s DP módy
            # Baseline timeline byl zbytečný a způsoboval přepis ACTIVE dat
            has_dp_results = (
                hasattr(self, "_mode_optimization_result")
                and self._mode_optimization_result is not None
            )

            _LOGGER.debug(
                f"Calculating timeline with HYBRID={'yes' if has_dp_results else 'no'}, "
                f"balancing={'yes' if self._active_charging_plan else 'no'}"
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

            # Keep baseline timeline empty for backwards compatibility
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

            # PHASE 2.9: Track actual performance každých 15 minut
            await self._track_actual_performance()

        except Exception as e:
            _LOGGER.error(f"Error updating battery forecast: {e}", exc_info=True)

    def _simulate_interval_with_mode(
        self,
        mode: int,
        solar_kwh: float,
        load_kwh: float,
        battery_soc: float,
        max_capacity: float,
        min_capacity: float,
        spot_price: float,
        export_price: float,
    ) -> Dict[str, Any]:
        """
        Simulovat jeden 15min interval s konkrétním CBB režimem.

        Phase 2.5: Multi-Mode Cost Comparison - simulace podle ECONOMIC_MODE_DECISION_MODEL.md

        Args:
            mode: CBB režim (0=HOME I, 1=HOME II, 2=HOME III, 3=HOME UPS)
            solar_kwh: FVE produkce v intervalu (kWh/15min)
            load_kwh: Spotřeba v intervalu (kWh/15min)
            battery_soc: Aktuální SoC baterie (kWh)
            max_capacity: Max kapacita baterie (kWh)
            min_capacity: Min kapacita baterie (kWh)
            spot_price: Spotová cena nákupu (Kč/kWh)
            export_price: Prodejní cena exportu (Kč/kWh)

        Returns:
            Dict s výsledky simulace:
                - new_soc: Nový SoC baterie (kWh)
                - grid_import: Import ze sítě (kWh, >=0)
                - grid_export: Export do sítě (kWh, >=0)
                - battery_discharge: Vybití baterie (kWh, >=0)
                - battery_charge: Nabití baterie (kWh, >=0)
                - boiler_charge: Energie do bojleru (kWh, >=0) - Phase 2.5
                - grid_cost: Náklady na elektřinu (Kč)
                - export_revenue: Příjem z exportu (Kč)
                - net_cost: Čisté náklady (grid_cost - export_revenue, Kč)
                - curtailed_loss: Ztráta ze ztrátového exportu (Kč, >=0) - Phase 2.5
        """
        efficiency = self._get_battery_efficiency()

        # Initialize result
        result = {
            "new_soc": battery_soc,
            "grid_import": 0.0,
            "grid_export": 0.0,
            "battery_discharge": 0.0,
            "battery_charge": 0.0,
            "boiler_charge": 0.0,  # Phase 2.5: Boiler support
            "grid_cost": 0.0,
            "export_revenue": 0.0,
            "net_cost": 0.0,
            "curtailed_loss": 0.0,  # Phase 2.5: Export price protection
        }

        # =====================================================================
        # CRITICAL OPTIMIZATION: FVE = 0 → HOME I/II/III jsou IDENTICKÉ!
        # =====================================================================
        # Per CBB_MODES_DEFINITIVE.md, when FVE = 0 (night):
        # - HOME I/II/III: All discharge battery to 20% SoC (IDENTICAL behavior)
        # - HOME UPS: Charges from grid, holds 100%, consumption from grid (DIFFERENT)
        #
        # This short-circuit saves 67% of DP computation time at night!
        if solar_kwh < 0.001 and mode in [
            CBB_MODE_HOME_I,
            CBB_MODE_HOME_II,
            CBB_MODE_HOME_III,
        ]:
            # Night mode (FVE=0): HOME I/II/III identical → discharge battery to load
            available_battery = battery_soc - min_capacity

            # VALIDATION: Never discharge below minimum
            if available_battery < 0:
                available_battery = 0.0

            discharge_amount = min(load_kwh, available_battery / efficiency)

            if discharge_amount > 0.001:
                result["battery_discharge"] = discharge_amount
                result["new_soc"] = battery_soc - discharge_amount * efficiency

            # Grid covers remaining load
            deficit = load_kwh - discharge_amount
            if deficit > 0.001:
                result["grid_import"] = deficit
                result["grid_cost"] = deficit * spot_price

            # Net cost
            result["net_cost"] = result["grid_cost"]

            # Clamp SoC (SAFETY: Should never discharge below min_capacity)
            result["new_soc"] = max(min_capacity, min(max_capacity, result["new_soc"]))

            # DEBUG VALIDATION: Verify we respect minimum
            if result["new_soc"] < min_capacity - 0.01:  # 0.01 kWh tolerance
                _LOGGER.warning(
                    f"⚠️  Battery SoC dropped below minimum! "
                    f"new_soc={result['new_soc']:.2f}, min={min_capacity:.2f}, "
                    f"discharge={discharge_amount:.3f}, mode={mode}"
                )

            return result

        # HOME I (0): Battery Priority
        # FVE → battery (DC/DC 95%), battery → load (DC/AC 88.2%)
        # If FVE < load: battery discharges immediately
        if mode == CBB_MODE_HOME_I:
            # First: Charge battery from FVE (DC/DC)
            available_for_battery = solar_kwh
            battery_space = max_capacity - battery_soc
            charge_amount = min(available_for_battery, battery_space / efficiency)

            result["battery_charge"] = charge_amount
            result["new_soc"] = battery_soc + charge_amount * efficiency

            # Remaining FVE after battery charging
            remaining_solar = solar_kwh - charge_amount

            # Load must be covered
            if remaining_solar >= load_kwh:
                # Enough FVE to cover load
                surplus = remaining_solar - load_kwh

                # Phase 2.5: Export price protection with boiler support
                # Priority: Battery > Boiler > Export (if profitable)
                if export_price <= 0 and battery_soc < max_capacity:
                    # Try to store surplus in battery instead of exporting at loss
                    battery_space = max_capacity - result["new_soc"]
                    additional_charge = min(surplus, battery_space / efficiency)

                    result["battery_charge"] += additional_charge
                    result["new_soc"] += additional_charge * efficiency
                    surplus -= additional_charge

                # If still surplus and export would be lossy, try boiler
                if surplus > 0.001 and export_price <= 0:
                    boiler_capacity = self._get_boiler_available_capacity()
                    boiler_usage = min(surplus, boiler_capacity)

                    result["boiler_charge"] = boiler_usage
                    surplus -= boiler_usage

                # Export only if profitable OR no other option (curtailment)
                if surplus > 0.001:
                    if export_price > 0:
                        result["grid_export"] = surplus
                        result["export_revenue"] = surplus * export_price
                    else:
                        # Forced curtailment at loss (battery full, no boiler)
                        result["grid_export"] = surplus
                        result["export_revenue"] = surplus * export_price  # NEGATIVE
                        result["curtailed_loss"] = abs(surplus * export_price)
            else:
                # Not enough FVE - discharge battery (DC/AC)
                deficit = load_kwh - remaining_solar
                battery_available = result["new_soc"] - min_capacity
                discharge_amount = min(deficit / efficiency, battery_available)

                result["battery_discharge"] = discharge_amount
                result["new_soc"] -= discharge_amount

                # CRITICAL FIX: Pokud baterie nestačí (je na minimu), zbytek deficitu ze sítě!
                if discharge_amount < deficit / efficiency:
                    remaining_deficit = deficit - (discharge_amount * efficiency)
                    result["grid_import"] = remaining_deficit
                    result["grid_cost"] = remaining_deficit * spot_price

                # If still deficit, import from grid
                remaining_deficit = deficit - discharge_amount * efficiency
                if remaining_deficit > 0.001:  # tolerance
                    result["grid_import"] = remaining_deficit
                    result["grid_cost"] = remaining_deficit * spot_price

        # HOME II (1): Grid supplements during day, battery saved for evening
        # FVE → load direct, grid supplements if needed
        # Battery charges only from surplus FVE
        elif mode == CBB_MODE_HOME_II:
            # Cover load from FVE first
            if solar_kwh >= load_kwh:
                # Surplus FVE → battery
                surplus = solar_kwh - load_kwh
                battery_space = max_capacity - battery_soc
                charge_amount = min(surplus, battery_space / efficiency)

                result["battery_charge"] = charge_amount
                result["new_soc"] = battery_soc + charge_amount * efficiency

                # Phase 2.5: Export price protection with boiler support
                # Remaining surplus → boiler > export (if profitable)
                remaining_surplus = surplus - charge_amount

                if remaining_surplus > 0.001:
                    # Try boiler first if export would be lossy
                    if export_price <= 0:
                        boiler_capacity = self._get_boiler_available_capacity()
                        boiler_usage = min(remaining_surplus, boiler_capacity)

                        result["boiler_charge"] = boiler_usage
                        remaining_surplus -= boiler_usage

                    # Export remaining (profitable or forced curtailment)
                    if remaining_surplus > 0.001:
                        if export_price > 0:
                            result["grid_export"] = remaining_surplus
                            result["export_revenue"] = remaining_surplus * export_price
                        else:
                            # Forced curtailment (battery full, boiler full/unavailable)
                            result["grid_export"] = remaining_surplus
                            result["export_revenue"] = (
                                remaining_surplus * export_price
                            )  # NEGATIVE
                            result["curtailed_loss"] = abs(
                                remaining_surplus * export_price
                            )
            else:
                # FVE < load → grid supplements (battery NOT used)
                deficit = load_kwh - solar_kwh
                result["grid_import"] = deficit
                result["grid_cost"] = deficit * spot_price

        # HOME III (2): ALL FVE to battery (DC/DC, UNLIMITED!), load from grid
        # KLÍČOVÉ: DC/DC nabíjení BEZ omezení výkonu (ne jen 0.7 kWh/15min!)
        # Spotřeba VŽDY ze sítě, až když baterie = 100% → FVE pomáhá spotřebě
        elif mode == CBB_MODE_HOME_III:
            # ALL FVE → battery (DC/DC 95%, UNLIMITED power)
            battery_space = max_capacity - battery_soc

            if battery_space > 0.001:
                # Battery NOT full → ALL FVE to battery
                charge_amount = min(solar_kwh, battery_space / efficiency)
                result["battery_charge"] = charge_amount
                result["new_soc"] = battery_soc + charge_amount * efficiency

                # Load ALWAYS from grid (i když máme FVE!)
                result["grid_import"] = load_kwh
                result["grid_cost"] = load_kwh * spot_price

                # Surplus only if battery full
                if charge_amount < solar_kwh:
                    surplus = solar_kwh - charge_amount

                    # Try boiler first if export would be lossy
                    if export_price <= 0:
                        boiler_capacity = self._get_boiler_available_capacity()
                        boiler_usage = min(surplus, boiler_capacity)
                        result["boiler_charge"] = boiler_usage
                        surplus -= boiler_usage

                    # Export remaining
                    if surplus > 0.001:
                        result["grid_export"] = surplus
                        result["export_revenue"] = surplus * export_price
                        if export_price <= 0:
                            result["curtailed_loss"] = abs(surplus * export_price)
            else:
                # Battery FULL (100%) → FVE pomáhá spotřebě
                result["new_soc"] = battery_soc

                if solar_kwh >= load_kwh:
                    # FVE pokryje spotřebu
                    surplus = solar_kwh - load_kwh

                    # Try boiler first if export would be lossy
                    if surplus > 0.001 and export_price <= 0:
                        boiler_capacity = self._get_boiler_available_capacity()
                        boiler_usage = min(surplus, boiler_capacity)
                        result["boiler_charge"] = boiler_usage
                        surplus -= boiler_usage

                    # Export remaining
                    if surplus > 0.001:
                        result["grid_export"] = surplus
                        result["export_revenue"] = surplus * export_price
                        if export_price <= 0:
                            result["curtailed_loss"] = abs(surplus * export_price)
                else:
                    # FVE nestačí → doplnit ze sítě
                    deficit = load_kwh - solar_kwh
                    result["grid_import"] = deficit
                    result["grid_cost"] = deficit * spot_price

        # HOME UPS (3): Grid + FVE to battery, consumption from grid
        # Grid → battery: max 2.8 kW (0.7 kWh/15min)
        # FVE → battery: UNLIMITED (DC/DC path)
        # Spotřeba: VŽDY ze sítě (i když je FVE!)
        # Až když baterie = 100% → FVE pomáhá spotřebě
        elif mode == CBB_MODE_HOME_UPS:
            battery_space = max_capacity - battery_soc

            if battery_space > 0.001:
                # Battery NOT full → charge from Grid + FVE

                # 1. FVE → battery (DC/DC, UNLIMITED)
                fve_charge = min(solar_kwh, battery_space / efficiency)
                result["battery_charge"] = fve_charge
                result["new_soc"] = battery_soc + fve_charge * efficiency

                # 2. Grid → battery (AC/DC, max 2.8 kW limit)
                ac_limit = self._get_ac_charging_limit_kwh_15min()
                remaining_space = max_capacity - result["new_soc"]
                grid_charge = min(ac_limit, remaining_space / efficiency)

                if grid_charge > 0.001:
                    result["battery_charge"] += grid_charge
                    result["new_soc"] += grid_charge * efficiency
                    result["grid_import"] += grid_charge
                    result["grid_cost"] += grid_charge * spot_price

                # 3. Spotřeba VŽDY ze sítě (i když máme FVE!)
                result["grid_import"] += load_kwh
                result["grid_cost"] += load_kwh * spot_price

            else:
                # Battery FULL (100%) → FVE pomáhá spotřebě
                result["new_soc"] = battery_soc

                if solar_kwh >= load_kwh:
                    # FVE pokryje spotřebu
                    surplus = solar_kwh - load_kwh

                    # Try boiler first if export would be lossy
                    if surplus > 0.001 and export_price <= 0:
                        boiler_capacity = self._get_boiler_available_capacity()
                        boiler_usage = min(surplus, boiler_capacity)
                        result["boiler_charge"] = boiler_usage
                        surplus -= boiler_usage

                    # Export remaining
                    if surplus > 0.001:
                        result["grid_export"] = surplus
                        result["export_revenue"] = surplus * export_price
                        if export_price <= 0:
                            result["curtailed_loss"] = abs(surplus * export_price)
                else:
                    # FVE nestačí → doplnit ze sítě
                    deficit = load_kwh - solar_kwh
                    result["grid_import"] = deficit
                    result["grid_cost"] = deficit * spot_price

        # Calculate net cost
        result["net_cost"] = result["grid_cost"] - result["export_revenue"]

        # Clamp SoC to valid range
        result["new_soc"] = max(min_capacity, min(max_capacity, result["new_soc"]))

        return result

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
    ) -> float:
        """
        Vypočítat celkové náklady pokud by uživatel zůstal v jednom režimu celou dobu.

        Phase 2.6: What-if Analysis - Srovnání s fixed-mode strategií.
        Phase 2.7: Cache timeline for HOME I (for savings calculation).

        Args:
            fixed_mode: CBB režim (0=HOME I, 1=HOME II, 2=HOME III, 3=HOME UPS)
            current_capacity: Aktuální SoC baterie (kWh)
            max_capacity: Max kapacita baterie (kWh)
            min_capacity: Min kapacita baterie (kWh)
            spot_prices: Timeline spot cen
            export_prices: Timeline export cen
            solar_forecast: Solární předpověď
            load_forecast: Předpověď spotřeby (kWh per interval)

        Returns:
            Celkové náklady v Kč při použití fixed_mode
        """
        total_cost = 0.0
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

            # Simulovat s fixed režimem
            sim_result = self._simulate_interval_with_mode(
                mode=fixed_mode,
                solar_kwh=solar_kwh,
                load_kwh=load_kwh,
                battery_soc=battery_soc,
                max_capacity=max_capacity,
                min_capacity=min_capacity,
                spot_price=spot_price,
                export_price=export_price,
            )

            total_cost += sim_result["net_cost"]
            battery_soc = sim_result["new_soc"]

            # Phase 2.7: Cache timeline for HOME I (mode 0)
            if fixed_mode == CBB_MODE_HOME_I:
                timeline_cache.append(
                    {"time": timestamp_str, "net_cost": sim_result["net_cost"]}
                )

        # Phase 2.7: Store HOME I timeline in instance variable
        if fixed_mode == CBB_MODE_HOME_I:
            self._home_i_timeline_cache = timeline_cache
            _LOGGER.debug(
                f"Cached HOME I timeline: {len(timeline_cache)} intervals, total_cost={total_cost:.2f} Kč"
            )

        return total_cost

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
            sim_result = self._simulate_interval_with_mode(
                mode=current_mode,  # ← OPRAVA: Prostě nech to být!
                solar_kwh=solar_kwh,
                load_kwh=load_kwh,
                battery_soc=battery_soc,
                max_capacity=max_capacity,
                min_capacity=min_capacity,
                spot_price=spot_price,
                export_price=export_price,
            )

            total_cost += sim_result["net_cost"]
            battery_soc = sim_result["new_soc"]

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

            sim_result = self._simulate_interval_with_mode(
                mode=mode,
                solar_kwh=solar_kwh,
                load_kwh=load_kwh,
                battery_soc=battery_soc,
                max_capacity=max_capacity,
                min_capacity=min_capacity,
                spot_price=spot_price,
                export_price=export_price,
            )

            total_cost += sim_result["net_cost"]
            battery_soc = sim_result["new_soc"]

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
        """
        n = len(spot_prices)
        modes = [CBB_MODE_HOME_I] * n  # Začít s HOME I všude (nejlevnější)
        efficiency = 0.88  # DC/AC losses

        # Parametry nabíjení
        config = (
            self._config_entry.options
            if self._config_entry and self._config_entry.options
            else self._config_entry.data if self._config_entry else {}
        )
        charging_power_kw = config.get("home_charge_rate", 2.8)
        max_charge_per_interval = charging_power_kw / 4.0  # kWh za 15min

        _LOGGER.info(
            f"🔄 HYBRID algorithm: current={current_capacity:.2f}, min={min_capacity:.2f}, "
            f"target={target_capacity:.2f}, max={max_capacity:.2f}, intervals={n}"
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
            battery = max(0, min(battery, max_capacity))
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

        if not needs_charging_for_minimum and not needs_charging_for_target:
            _LOGGER.info("✅ No charging needed - HOME I everywhere is optimal")
            return self._build_result(
                modes,
                spot_prices,
                solar_forecast,
                load_forecast,
                current_capacity,
                max_capacity,
                min_capacity,
                efficiency,
            )

        # PHASE 3: Backward pass - kolik baterie potřebujeme na začátku každého intervalu
        required_battery = [0.0] * (n + 1)
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

        # PHASE 4: Najít intervaly kde musíme nabíjet (deficit > 0)
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

            # Simulace intervalu s HOME I
            try:
                timestamp = datetime.fromisoformat(spot_prices[i]["time"])
                solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
            except:
                solar_kwh = 0.0

            load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125

            if solar_kwh >= load_kwh:
                battery += solar_kwh - load_kwh
            else:
                battery -= (load_kwh - solar_kwh) / efficiency

            battery = max(0, min(battery, max_capacity))

        # PHASE 5: Seřadit charging opportunities podle ceny (vzestupně)
        charge_opportunities.sort(key=lambda x: x["price"])

        _LOGGER.info(f"⚡ Found {len(charge_opportunities)} charging opportunities")

        # PHASE 6: Přidat HOME UPS na nejlevnějších intervalech s deficitem
        for opp in charge_opportunities[:20]:  # Max 20 nabíjecích intervalů (5h)
            idx = opp["index"]
            modes[idx] = CBB_MODE_HOME_UPS
            _LOGGER.debug(
                f"  → Interval {idx}: price={opp['price']:.2f}, deficit={opp['deficit']:.2f} kWh"
            )

        # PHASE 7: Enforce minimum mode duration (HOME UPS musí běžet min 30 min)
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

        # PHASE 8: Transition optimization - merge blízké UPS intervaly
        # Pokud je gap jen 1 interval a cena gap < transition cost → merge
        i = 0
        while i < len(modes) - 2:
            if (
                modes[i] == CBB_MODE_HOME_UPS
                and modes[i + 1] == CBB_MODE_HOME_I
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
            "HOME UPS": modes.count(CBB_MODE_HOME_UPS),
        }
        _LOGGER.info(
            f"✅ Hybrid result: HOME I={mode_counts['HOME I']}, HOME UPS={mode_counts['HOME UPS']}"
        )

        return self._build_result(
            modes,
            spot_prices,
            solar_forecast,
            load_forecast,
            current_capacity,
            max_capacity,
            min_capacity,
            efficiency,
        )

    def _build_result(
        self,
        modes: List[int],
        spot_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_forecast: List[float],
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        efficiency: float,
    ) -> Dict[str, Any]:
        """Sestavit výsledek ve formátu kompatibilním s timeline."""
        config = (
            self._config_entry.options
            if self._config_entry and self._config_entry.options
            else self._config_entry.data if self._config_entry else {}
        )
        charging_power_kw = config.get("home_charge_rate", 2.8)
        max_charge_per_interval = charging_power_kw / 4.0

        timeline = []
        battery = current_capacity
        total_cost = 0.0

        for i, mode in enumerate(modes):
            timestamp_str = spot_prices[i].get("time", "")
            price = spot_prices[i].get("price", 0)

            try:
                timestamp = datetime.fromisoformat(timestamp_str)
                solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
            except:
                solar_kwh = 0.0

            load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125

            # Fyzika podle módu
            grid_import = 0.0
            grid_export = 0.0
            grid_charge = 0.0

            if mode == CBB_MODE_HOME_UPS:
                # UPS: spotřeba ze sítě, baterie nabíjí ze solaru + gridu
                battery_space = max_capacity - battery
                grid_charge = min(max_charge_per_interval, battery_space / efficiency)
                grid_import = load_kwh + grid_charge  # Import na spotřebu + nabíjení
                battery += solar_kwh + grid_charge
                total_cost += grid_import * price
            else:
                # HOME I: solar → baterie nebo baterie → load
                if solar_kwh >= load_kwh:
                    surplus = solar_kwh - load_kwh
                    battery += surplus
                    # Pokud je baterie plná, přebytek jde do sítě
                    if battery > max_capacity:
                        grid_export = battery - max_capacity
                        battery = max_capacity
                        total_cost -= grid_export * price  # Export kredit
                else:
                    deficit = load_kwh - solar_kwh
                    battery -= deficit / efficiency
                    # Pokud je baterie prázdná, dobrání ze sítě
                    if battery < 0:
                        grid_import = -battery * efficiency
                        battery = 0
                        total_cost += grid_import * price

            battery = max(0, min(battery, max_capacity))
            interval_cost = grid_import * price - grid_export * price

            timeline.append(
                {
                    "time": timestamp_str,
                    "battery_soc": battery,
                    "mode": mode,
                    "mode_name": CBB_MODE_NAMES.get(mode, "Unknown"),
                    "solar_kwh": solar_kwh,
                    "load_kwh": load_kwh,
                    "grid_import": grid_import,
                    "grid_export": grid_export,
                    "spot_price": price,
                    "net_cost": interval_cost,
                }
            )

        # Mode recommendations - použít _create_mode_recommendations() pro bloky s detaily
        mode_recommendations = self._create_mode_recommendations(
            timeline, hours_ahead=48
        )

        return {
            "optimal_timeline": timeline,
            "optimal_modes": modes,
            "total_cost": total_cost,
            "mode_recommendations": mode_recommendations,
        }

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

                # Simuluj interval
                sim_result = self._simulate_interval_with_mode(
                    mode=mode,
                    solar_kwh=solar_kwh,
                    load_kwh=load_kwh,
                    battery_soc=battery_soc,
                    max_capacity=max_capacity,
                    min_capacity=min_capacity,  # Pro info, ale nespolehlivé
                    spot_price=timeline_point.get("spot_price", 0.0),
                    export_price=timeline_point.get("export_price", 0.0),
                )

                battery_soc = sim_result["new_soc"]

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

                # Získat hodinovou hodnotu z profilu
                hour = timestamp.hour
                hourly_kwh = profile["hourly_consumption"][hour]

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

        Logika:
        1. Je nový den? (plan_date != today)
        2. Máme fresh HYBRID výsledek? (optimal_timeline existuje)
        3. FIXUJ: Ulož celý dnešní plán do daily_plan_state
        """
        now = dt_util.now()
        today_str = now.strftime("%Y-%m-%d")

        # Inicializace state při prvním běhu
        if not hasattr(self, "_daily_plan_state"):
            self._daily_plan_state = None

        # Je nový den?
        if (
            self._daily_plan_state is None
            or self._daily_plan_state.get("plan_date") != today_str
        ):
            # Archivovat včerejší plán pokud existuje
            if (
                self._daily_plan_state
                and self._daily_plan_state.get("status") == "active"
            ):
                self._daily_plan_state["status"] = "completed"
                _LOGGER.info(
                    f"📦 Archived daily plan for {self._daily_plan_state.get('plan_date')}"
                )

            # Máme DP výsledek?
            if (
                hasattr(self, "_mode_optimization_result")
                and self._mode_optimization_result
            ):
                optimal_timeline = self._mode_optimization_result.get(
                    "optimal_timeline", []
                )
                mode_recommendations = self._mode_optimization_result.get(
                    "mode_recommendations", []
                )

                # Filtrovat jen dnešní intervaly (00:00 - 23:45)
                today_start = datetime.combine(now.date(), datetime.min.time())
                today_end = datetime.combine(now.date(), datetime.max.time())

                today_timeline = [
                    interval
                    for interval in optimal_timeline
                    if interval.get("time")
                    and today_start
                    <= datetime.fromisoformat(interval["time"])
                    <= today_end
                ]

                today_blocks = [
                    block
                    for block in mode_recommendations
                    if block.get("from_time")
                    and today_start
                    <= datetime.fromisoformat(block["from_time"])
                    <= today_end
                ]

                expected_total_cost = sum(i.get("net_cost", 0) for i in today_timeline)

                # FIXUJ PLÁN
                self._daily_plan_state = {
                    "plan_date": today_str,
                    "plan_fixed_at": now.isoformat(),
                    "status": "active",
                    "planned_timeline": today_timeline,
                    "mode_blocks": today_blocks,
                    "expected_total_cost": round(expected_total_cost, 2),
                    "actual_intervals": [],  # Postupně se plní během dne
                }

                _LOGGER.info(
                    f"🎯 Fixed daily plan for {today_str}: "
                    f"{len(today_timeline)} intervals, "
                    f"expected_cost={expected_total_cost:.2f} Kč, "
                    f"{len(today_blocks)} mode blocks"
                )
            else:
                _LOGGER.warning(
                    f"No HYBRID optimization result available to fix daily plan for {today_str}"
                )
                # Vytvořit prázdný stav
                self._daily_plan_state = {
                    "plan_date": today_str,
                    "plan_fixed_at": now.isoformat(),
                    "status": "no_plan",
                    "planned_timeline": [],
                    "mode_blocks": [],
                    "expected_total_cost": 0.0,
                    "actual_intervals": [],
                }

    async def _track_actual_performance(self) -> None:
        """
        Průběžně trackovat skutečné náklady vs plán.

        Phase 2.9: Actual Data Tracking
        - Volá se na konci async_update() každých 15 minut
        - Načítá actual values z HA sensorů
        - Porovnává s planned values z daily_plan_state
        - Ukládá delta pro analýzy

        Logika:
        1. Máme aktivní plán? (daily_plan_state.status == "active")
        2. Načíst actual values z HA sensorů
        3. Najít odpovídající planned interval
        4. Uložit porovnání
        """
        if (
            not hasattr(self, "_daily_plan_state")
            or not self._daily_plan_state
            or self._daily_plan_state.get("status") != "active"
        ):
            return

        now = dt_util.now()

        # Round na 15min interval
        current_minute = (now.minute // 15) * 15
        current_interval = now.replace(minute=current_minute, second=0, microsecond=0)
        interval_str = current_interval.isoformat()

        # Skip pokud už máme tento interval
        actual_intervals = self._daily_plan_state.get("actual_intervals", [])
        if any(a.get("time") == interval_str for a in actual_intervals):
            return  # Už trackováno

        # Načíst actual values
        try:
            actual_battery = self._get_current_battery_capacity()  # kWh
            actual_mode = self._get_current_mode()  # 0-3
            actual_mode_name = CBB_MODE_NAMES.get(actual_mode, f"MODE_{actual_mode}")

            # TODO: Grid import/export - potřebujeme DELTA za poslední 15min
            # Pro teď: placeholder (implementovat v další fázi)
            actual_grid_import = 0.0  # kWh za 15min
            actual_grid_export = 0.0

            # Spot price - najít v timeline
            spot_price = 0.0
            if hasattr(self, "_timeline_data") and self._timeline_data:
                for point in self._timeline_data:
                    if point.get("time") == interval_str:
                        spot_price = point.get("spot_price", 0.0)
                        break

            actual_cost = (actual_grid_import * spot_price) - (
                actual_grid_export * spot_price
            )

        except Exception as e:
            _LOGGER.warning(f"Failed to get actual values for {interval_str}: {e}")
            return

        # Najít odpovídající planned interval
        planned_interval = None
        planned_timeline = self._daily_plan_state.get("planned_timeline", [])

        for interval in planned_timeline:
            if interval.get("time") == interval_str:
                planned_interval = interval
                break

        if not planned_interval:
            _LOGGER.debug(f"No planned interval found for {interval_str}")
            # Může být interval mimo plán (např. pokud plán začíná od NOW)
            return

        # Uložit tracking data
        tracking_entry = {
            "time": interval_str,
            "actual": {
                "battery_kwh": round(actual_battery, 2),
                "mode": actual_mode,
                "mode_name": actual_mode_name,
                "grid_import": round(actual_grid_import, 3),
                "grid_export": round(actual_grid_export, 3),
                "net_cost": round(actual_cost, 2),
            },
            "planned": {
                "battery_kwh": round(planned_interval.get("battery_soc", 0), 2),
                "mode": planned_interval.get("mode", 0),
                "mode_name": planned_interval.get("mode_name", "HOME I"),
                "net_cost": round(planned_interval.get("net_cost", 0), 2),
            },
            "delta": {
                "battery_kwh": round(
                    actual_battery - planned_interval.get("battery_soc", 0), 2
                ),
                "net_cost": round(actual_cost - planned_interval.get("net_cost", 0), 2),
            },
        }

        actual_intervals.append(tracking_entry)
        self._daily_plan_state["actual_intervals"] = actual_intervals

        _LOGGER.debug(
            f"✅ Tracked {interval_str}: "
            f"actual={actual_mode_name} ({actual_battery:.2f} kWh), "
            f"planned={planned_interval.get('mode_name')} ({planned_interval.get('battery_soc', 0):.2f} kWh), "
            f"delta_battery={tracking_entry['delta']['battery_kwh']:.2f} kWh"
        )

    def build_timeline_extended(self) -> Dict[str, Any]:
        """
        Postavit rozšířenou timeline strukturu pro API.

        Phase 2.9: Timeline Extended Builder
        - Kombinuje historická data (včera) + mixed (dnes) + plánovaná (zítra)
        - Používá daily_plan_state pro historical tracking
        - Používá DP optimalizaci pro planned data

        Returns:
            Dict s yesterday/today/tomorrow sekcemi
        """
        now = dt_util.now()
        today = now.date()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)

        return {
            "yesterday": self._build_day_timeline(yesterday),
            "today": self._build_day_timeline(today),
            "tomorrow": self._build_day_timeline(tomorrow),
        }

    def _build_day_timeline(self, date: datetime.date) -> Dict[str, Any]:
        """
        Postavit timeline pro jeden den.

        Args:
            date: Datum dne

        Returns:
            Dict s intervals a summary pro daný den
        """
        now = dt_util.now()
        today = now.date()

        day_start = datetime.combine(date, datetime.min.time())
        day_end = datetime.combine(date, datetime.max.time())

        intervals: List[Dict[str, Any]] = []

        # Určit zdroj dat podle dne
        if date < today:
            # VČERA - pouze historical (pokud máme archivovaná data)
            # TODO: Load z persistent storage
            source = "historical_only"
        elif date == today:
            # DNES - historical (00:00-NOW) + planned (NOW-23:45)
            source = "mixed"
        else:
            # ZÍTRA - pouze planned
            source = "planned_only"

        # Build intervals podle source
        if source == "historical_only":
            # TODO: Load včerejší data z archivovaného daily_plan_state
            # Pro teď: prázdné (implementovat v další fázi)
            pass

        elif source == "mixed":
            # DNES: Combine historical + planned
            if (
                hasattr(self, "_daily_plan_state")
                and self._daily_plan_state
                and self._daily_plan_state.get("plan_date") == date.strftime("%Y-%m-%d")
            ):
                actual_intervals = self._daily_plan_state.get("actual_intervals", [])
                planned_timeline = self._daily_plan_state.get("planned_timeline", [])

                for planned in planned_timeline:
                    interval_time_str = planned.get("time", "")
                    if not interval_time_str:
                        continue

                    try:
                        interval_time = datetime.fromisoformat(interval_time_str)
                    except:
                        continue

                    # Round current time na 15min
                    current_minute = (now.minute // 15) * 15
                    current_interval = now.replace(
                        minute=current_minute, second=0, microsecond=0
                    )

                    if interval_time < current_interval:
                        # Historical - hledat actual
                        actual = next(
                            (
                                a
                                for a in actual_intervals
                                if a.get("time") == interval_time_str
                            ),
                            None,
                        )

                        interval_entry = {
                            "time": interval_time_str,
                            "status": "historical",
                            "planned": self._format_planned_data(planned),
                            "actual": (
                                self._format_actual_data(actual.get("actual"))
                                if actual
                                else None
                            ),
                            "delta": (actual.get("delta") if actual else None),
                        }

                    elif interval_time == current_interval:
                        # Current interval
                        interval_entry = {
                            "time": interval_time_str,
                            "status": "current",
                            "planned": self._format_planned_data(planned),
                            "actual": None,
                            "delta": None,
                        }

                    else:
                        # Future (dnes večer)
                        interval_entry = {
                            "time": interval_time_str,
                            "status": "planned",
                            "planned": self._format_planned_data(planned),
                            "actual": None,
                            "delta": None,
                        }

                    intervals.append(interval_entry)

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
        }

    def _format_actual_data(self, actual: Dict[str, Any]) -> Dict[str, Any]:
        """Formátovat actual data pro API."""
        if not actual:
            return None
        return {
            "mode": actual.get("mode", 0),
            "mode_name": actual.get("mode_name", "HOME I"),
            "battery_kwh": round(actual.get("battery_kwh", 0), 2),
            "grid_import": round(actual.get("grid_import", 0), 3),
            "grid_export": round(actual.get("grid_export", 0), 3),
            "net_cost": round(actual.get("net_cost", 0), 2),
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

            if interval_time <= current_time:
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
            if isinstance(hourly, list):
                for hour in range(current_hour, 24):
                    if hour < len(hourly):
                        planned_today += hourly[hour]
            elif isinstance(hourly, dict):
                for hour in range(current_hour, 24):
                    planned_today += hourly.get(hour, 0.0)

        # 2. Plánovaná spotřeba ZÍTRA (celý den 0-23)
        tomorrow_profile = adaptive_profiles.get("tomorrow_profile")
        planned_tomorrow = 0.0

        if tomorrow_profile and isinstance(tomorrow_profile, dict):
            hourly = tomorrow_profile.get("hourly_consumption", [])
            if isinstance(hourly, list):
                planned_tomorrow = sum(
                    hourly[h] if h < len(hourly) else 0.0 for h in range(24)
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

    def update_plan_lifecycle(self) -> None:
        """
        Aktualizuje lifecycle status aktivního plánu podle času.

        Lifecycle transitions:
        - PLANNED → LOCKED: 1h před plan_start
        - LOCKED → RUNNING: plan_start reached
        - RUNNING → COMPLETED: plan_end reached

        Volat každou hodinu (nebo při každém update).
        """
        if not hasattr(self, "_active_charging_plan") or not self._active_charging_plan:
            return

        now = dt_util.now()
        plan = self._active_charging_plan
        current_status = plan.get("status", "planned")

        # Parse timestamps
        try:
            plan_start = datetime.fromisoformat(plan["plan_start"])
            if plan_start.tzinfo is None:
                plan_start = dt_util.as_local(plan_start)

            plan_end = datetime.fromisoformat(plan["plan_end"])
            if plan_end.tzinfo is None:
                plan_end = dt_util.as_local(plan_end)
        except (KeyError, ValueError, TypeError) as e:
            _LOGGER.error(f"[Planner] Invalid plan timestamps: {e}")
            return

        # Determine new status
        new_status = current_status

        if now >= plan_end:
            new_status = "completed"
        elif now >= plan_start:
            new_status = "running"
        elif (plan_start - now).total_seconds() < 3600:  # <1h to start
            new_status = "locked"
        else:
            new_status = "planned"

        # Update if changed
        if new_status != current_status:
            plan["status"] = new_status
            self._plan_status = new_status
            _LOGGER.info(
                f"[Planner] Lifecycle transition: {current_status} → {new_status} "
                f"(requester={plan['requester']})"
            )

            # If completed, archive and clear
            if new_status == "completed":
                _LOGGER.info(
                    f"[Planner] Plan COMPLETED, clearing "
                    f"(requester={plan['requester']}, "
                    f"duration={(plan_end - plan_start).total_seconds() / 3600:.1f}h)"
                )
                self._active_charging_plan = None
                self._plan_status = "none"

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
            # Import DOMAIN
            from .const import DOMAIN

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
