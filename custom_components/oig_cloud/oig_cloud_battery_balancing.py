"""Sensor pro správu vyrovnání článků baterie (battery cell balancing)."""

import logging
import json
import numpy as np
import asyncio
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.util import dt as dt_util
from homeassistant.const import EntityCategory
from homeassistant.helpers.recorder import get_instance
from homeassistant.components.recorder import history

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# ============================================================================
# 7d Balancing Decision Profiling Constants
# ============================================================================

# Event type pro ukládání balancing decision profiles do recorderu
BALANCING_PROFILE_EVENT_TYPE = "oig_cloud_balancing_decision_profile_7d"

# Časové konstanty
BALANCING_PROFILE_HOURS = 168  # 7 dní dat v profilu (7 × 24)
BALANCING_MATCH_HOURS = 48  # Prvních 48h použít pro matching
BALANCING_PREDICT_HOURS = 120  # Posledních 120h (5 dní) použít jako predikci

# Maximální počet profilů k uložení (52 týdnů)
MAX_BALANCING_PROFILES = 52

# Similarity scoring weights (jak hodnotit podobnost profilů)
WEIGHT_SPOT_PRICE = 0.40  # Korelace spot price pattern (40%)
WEIGHT_SOLAR_FORECAST = 0.30  # Korelace solar forecast pattern (30%)
WEIGHT_BALANCING_SUCCESS = 0.30  # Úspěšnost balancing rozhodnutí (30%)


class OigCloudBatteryBalancingSensor(RestoreEntity, CoordinatorEntity, SensorEntity):
    """Sensor pro správu vyrovnání článků baterie."""

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        """Initialize the battery balancing sensor."""
        super().__init__(coordinator)

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._device_info = device_info

        # Nastavit hass - priorita: parametr > coordinator.hass
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        # Získání box_id z coordinator.data
        self._data_key = "unknown"
        if (
            coordinator
            and coordinator.data
            and isinstance(coordinator.data, dict)
            and coordinator.data
        ):
            self._data_key = list(coordinator.data.keys())[0]
            _LOGGER.debug(f"Battery balancing got box_id: {self._data_key}")
        else:
            _LOGGER.warning(
                "Battery balancing: coordinator has no data, using box_id='unknown'"
            )

        # Nastavit atributy senzoru
        self._box_id = self._data_key
        self._attr_unique_id = f"oig_cloud_{self._data_key}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:battery-heart-variant"
        self._attr_native_unit_of_measurement = None
        self._attr_device_class = None
        self._attr_state_class = None
        self._attr_entity_category = EntityCategory.DIAGNOSTIC

        # Načíst název ze sensor types
        from .sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or sensor_type

        # Balancing state
        self._last_balancing: Optional[datetime] = None
        self._days_since_last: int = 99  # Vysoké číslo = neznámé
        self._status: str = "unknown"
        self._planned_window: Optional[Dict[str, Any]] = None
        self._current_state: str = "standby"  # charging/balancing/planned/standby
        self._time_remaining: Optional[str] = None  # HH:MM format

        # Hodinový planning loop
        self._planning_task: Optional[Any] = None  # asyncio.Task
        self._last_planning_check: Optional[datetime] = None
        self._last_planning_run: Optional[datetime] = None  # Pro rate limiting
        self._last_calculation: Optional[datetime] = (
            None  # Čas posledního výpočtu plánu
        )
        self._planning_status: str = "idle"  # idle/preparing/calculating/ok/error
        self._planning_error: Optional[str] = None  # Poslední chyba při výpočtu

        # Profiling - recent history (5 posledních)
        self._recent_balancing_history: List[Dict[str, Any]] = []

        # 7d Balancing Decision Profiling
        self._balancing_profiling_task: Optional[Any] = None  # asyncio.Task
        self._last_balancing_profile_created: Optional[datetime] = None
        self._balancing_profiling_status: str = "idle"  # idle/creating/ok/error
        self._balancing_profiling_error: Optional[str] = None

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # Načíst uložený stav z restore
        last_state = await self.async_get_last_state()
        if last_state and last_state.attributes:
            _LOGGER.info(f"Restoring balancing sensor state from last session")

            # Restore last_calculation
            if "last_calculation" in last_state.attributes:
                try:
                    self._last_calculation = dt_util.parse_datetime(
                        last_state.attributes["last_calculation"]
                    )
                    _LOGGER.debug(
                        f"Restored last_calculation: {self._last_calculation}"
                    )
                except (ValueError, TypeError):
                    pass

            # Restore last_balancing
            if "last_balancing" in last_state.attributes:
                try:
                    self._last_balancing = dt_util.parse_datetime(
                        last_state.attributes["last_balancing"]
                    )
                    _LOGGER.debug(f"Restored last_balancing: {self._last_balancing}")
                except (ValueError, TypeError):
                    pass

        # Spustit počáteční detekci z historie
        await self._detect_last_balancing_from_history()

        # START: Hodinový planning loop jako background task
        # DŮLEŽITÉ: Musí běžet na pozadí, jinak blokuje HA startup!
        _LOGGER.info("Starting hourly balancing planning loop")
        self._planning_task = self.hass.async_create_background_task(
            self._planning_loop(), name="oig_cloud_balancing_planning_loop"
        )

        # START: Denní balancing profiling loop jako background task
        _LOGGER.info("Starting daily balancing decision profiling loop")
        self._balancing_profiling_task = self.hass.async_create_background_task(
            self._balancing_profiling_loop(),
            name="oig_cloud_balancing_profiling_loop",
        )

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA - zrušit planning task."""
        if self._planning_task and not self._planning_task.done():
            self._planning_task.cancel()
        if self._balancing_profiling_task and not self._balancing_profiling_task.done():
            self._balancing_profiling_task.cancel()
        await super().async_will_remove_from_hass()

    async def _planning_loop(self) -> None:
        """
        Continuous planning loop - validace a opportunistic balancing.

        Běží samostatně každých 30 minut:
        - Každých 30 min: Kontrola opportunistic balancing (rychlá reakce na příležitosti)
        - Každou 1 hodinu: Kompletní validace a plánování (interval-based)
        """
        try:
            # Počkat na forecast data (max 5 min)
            self._planning_status = "preparing"
            self._planning_error = None
            self.async_schedule_update_ha_state(force_refresh=True)

            await self._wait_for_forecast_ready(timeout=300)

            _LOGGER.info(
                "✅ Planning loop started - opportunistic check every 30min, full planning every 60min"
            )
            self._planning_status = "idle"
            self.async_schedule_update_ha_state(force_refresh=True)

            # První běh okamžitě po startu
            first_run = True
            iteration_counter = 0

            while True:
                try:
                    iteration_counter += 1
                    is_full_planning_cycle = (
                        iteration_counter % 2 == 1
                    )  # Každou lichou iteraci (0, 2, 4 = opportunistic, 1, 3, 5 = full)

                    _LOGGER.info(
                        f"🔄 Planning loop iteration #{iteration_counter} starting "
                        f"(first_run={first_run}, full_planning={is_full_planning_cycle})"
                    )

                    # FIRST: Detect natural balancing completion (běží každou hodinu při full cycle)
                    if is_full_planning_cycle:
                        await self._detect_last_balancing_from_history()

                    # Nastavit stav calculating
                    self._planning_status = "calculating"
                    self._planning_error = None
                    self.async_schedule_update_ha_state(force_refresh=True)

                    # FULL CYCLE: Kompletní validace + plánování
                    if is_full_planning_cycle:
                        _LOGGER.info("🔍 Full planning cycle - validating and planning")
                        await self._validate_and_plan()

                    # OPPORTUNISTIC CYCLE: Jen rychlá kontrola opportunistic conditions
                    else:
                        _LOGGER.info(
                            "⚡ Opportunistic cycle - checking for early balancing opportunities"
                        )
                        opportunistic_triggered = (
                            await self._check_opportunistic_balancing()
                        )
                        if opportunistic_triggered:
                            _LOGGER.warning(
                                "✅ Opportunistic balancing triggered in fast cycle!"
                            )
                            # Update current state
                            self._update_current_state()

                    # Update timestamp a stav OK
                    self._last_planning_check = dt_util.now()
                    self._planning_status = "ok"
                    self._planning_error = None
                    self.async_schedule_update_ha_state(force_refresh=True)

                    _LOGGER.info(
                        f"✅ Planning loop iteration #{iteration_counter} completed at {self._last_planning_check}"
                    )

                except Exception as e:
                    _LOGGER.error(
                        f"❌ Planning loop iteration error: {e}", exc_info=True
                    )
                    self._planning_status = "error"
                    self._planning_error = str(e)
                    self.async_schedule_update_ha_state(force_refresh=True)

                # První běh: čekat jen 60s, pak normálně 30 min
                if first_run:
                    _LOGGER.info(
                        "⏱️ First run completed, waiting 60s before next iteration"
                    )
                    self._planning_status = "idle"
                    self.async_schedule_update_ha_state(force_refresh=True)
                    await asyncio.sleep(60)
                    first_run = False
                else:
                    _LOGGER.info("⏱️ Waiting 1800s (30 minutes) until next iteration")
                    self._planning_status = "idle"
                    self.async_schedule_update_ha_state(force_refresh=True)
                    await asyncio.sleep(1800)  # 30 minut místo 3600

        except asyncio.CancelledError:
            _LOGGER.info("Planning loop cancelled")
            self._planning_status = "idle"
            self.async_schedule_update_ha_state(force_refresh=True)
        except Exception as e:
            _LOGGER.error(f"Planning loop fatal error: {e}", exc_info=True)
            self._planning_status = "error"
            self._planning_error = f"Fatal: {str(e)}"
            self.async_schedule_update_ha_state(force_refresh=True)

    async def _balancing_profiling_loop(self) -> None:
        """
        Denní profiling loop - vytváření 7d balancing decision profilů.

        Běží každý den v 00:30 (30 minut po půlnoci).
        Ukládá profil posledních 168h (7 dní) balancing rozhodnutí.
        """
        try:
            _LOGGER.info("📊 Balancing profiling loop starting")

            # První běh hned po startu (aby byl profil k dispozici co nejdříve)
            try:
                _LOGGER.info("📊 Creating initial 7d balancing profile")
                self._balancing_profiling_status = "creating"
                self._balancing_profiling_error = None
                self.async_schedule_update_ha_state(force_refresh=True)

                success = await self._create_balancing_profile()

                if success:
                    self._last_balancing_profile_created = dt_util.now()
                    self._balancing_profiling_status = "ok"
                    self._balancing_profiling_error = None
                    _LOGGER.info(
                        f"✅ Initial balancing profile created at {self._last_balancing_profile_created}"
                    )
                else:
                    self._balancing_profiling_status = "error"
                    self._balancing_profiling_error = "Failed to create initial profile"
                    _LOGGER.warning("❌ Failed to create initial balancing profile")

                self.async_schedule_update_ha_state(force_refresh=True)

            except Exception as e:
                _LOGGER.error(f"❌ Initial profiling error: {e}", exc_info=True)
                self._balancing_profiling_status = "error"
                self._balancing_profiling_error = str(e)
                self.async_schedule_update_ha_state(force_refresh=True)

            # Počkat do prvního denního okna (00:30)
            await self._wait_for_next_profiling_window()

            # Denní loop
            while True:
                try:
                    _LOGGER.info("📊 Creating daily 7d balancing profile")

                    self._balancing_profiling_status = "creating"
                    self._balancing_profiling_error = None
                    self.async_schedule_update_ha_state(force_refresh=True)

                    # Vytvořit profil
                    success = await self._create_balancing_profile()

                    if success:
                        self._last_balancing_profile_created = dt_util.now()
                        self._balancing_profiling_status = "ok"
                        self._balancing_profiling_error = None
                        _LOGGER.info(
                            f"✅ Daily balancing profile created at {self._last_balancing_profile_created}"
                        )
                    else:
                        self._balancing_profiling_status = "error"
                        self._balancing_profiling_error = "Failed to create profile"
                        _LOGGER.warning("❌ Failed to create daily balancing profile")

                    self.async_schedule_update_ha_state(force_refresh=True)

                except Exception as e:
                    _LOGGER.error(f"❌ Profiling loop error: {e}", exc_info=True)
                    self._balancing_profiling_status = "error"
                    self._balancing_profiling_error = str(e)
                    self.async_schedule_update_ha_state(force_refresh=True)

                # Počkat do dalšího dne 00:30
                _LOGGER.info(
                    "⏱️ Waiting until tomorrow 00:30 for next balancing profile"
                )
                self._balancing_profiling_status = "idle"
                self.async_schedule_update_ha_state(force_refresh=True)

                await self._wait_for_next_profiling_window()

        except asyncio.CancelledError:
            _LOGGER.info("Balancing profiling loop cancelled")
            raise
        except Exception as e:
            _LOGGER.error(f"Fatal balancing profiling loop error: {e}", exc_info=True)

    async def _wait_for_next_profiling_window(self) -> None:
        """
        Počkat do dalšího profiling okna (00:30).
        """
        now = dt_util.now()
        target_time = now.replace(hour=0, minute=30, second=0, microsecond=0)

        # Pokud už je po 00:30 dnes, čekat na zítra
        if now >= target_time:
            target_time += timedelta(days=1)

        wait_seconds = (target_time - now).total_seconds()
        _LOGGER.info(
            f"⏱️ Waiting {wait_seconds / 3600:.1f} hours until next profiling window at {target_time}"
        )

        await asyncio.sleep(wait_seconds)

    async def _wait_for_forecast_ready(self, timeout: int = 300) -> None:
        """
        Počkat až forecast sensor má data.

        Args:
            timeout: Max čekání v sekundách (default 5 min)
        """
        _LOGGER.info("⏳ Waiting for forecast sensor to be ready...")
        start = dt_util.now()
        attempt = 0

        while True:
            attempt += 1
            # Zkontrolovat timeout
            elapsed = (dt_util.now() - start).total_seconds()
            if elapsed > timeout:
                _LOGGER.error(
                    f"❌ Timeout waiting for forecast after {attempt} attempts ({timeout}s)"
                )
                return

            # Zkusit získat forecast
            forecast_sensor = self._get_forecast_sensor()
            if not forecast_sensor:
                _LOGGER.debug(
                    f"Attempt {attempt}: Forecast sensor not found, waiting..."
                )
            else:
                timeline = forecast_sensor.get_timeline_data()
                if not timeline:
                    _LOGGER.debug(
                        f"Attempt {attempt}: Forecast sensor found but no timeline data, waiting..."
                    )
                elif len(timeline) == 0:
                    _LOGGER.debug(f"Attempt {attempt}: Timeline empty, waiting...")
                else:
                    _LOGGER.info(
                        f"✅ Forecast ready after {attempt} attempts with {len(timeline)} timeline points"
                    )
                    return

            # Čekat 10s a zkusit znovu
            await asyncio.sleep(10)

    async def _validate_and_plan(self) -> None:
        """
        Validovat existující plán nebo vytvořit nový.

        Process:
        1. Pokud plán existuje → validovat
        2. Pokud není platný → zrušit
        3. Pokud potřeba → naplánovat nový
        """
        _LOGGER.info("🔍 Starting validate_and_plan check...")

        # CRITICAL: Check if forecast has a plan but balancer doesn't
        # This can happen after restart if balancer lost its state
        forecast_sensor = self._get_forecast_sensor()
        if forecast_sensor and not self._planned_window:
            if (
                hasattr(forecast_sensor, "_active_charging_plan")
                and forecast_sensor._active_charging_plan
                and forecast_sensor._active_charging_plan.get("requester")
                == "balancing"
            ):
                _LOGGER.warning(
                    "⚠️ Forecast has balancing plan but balancer doesn't - cancelling orphaned plan"
                )
                await self._cancel_active_plan()

        # 1. VALIDACE EXISTUJÍCÍHO PLÁNU
        if self._planned_window:
            _LOGGER.info(
                f"📋 Found existing plan: holding {self._planned_window.get('holding_start')} → {self._planned_window.get('holding_end')}"
            )
            is_valid = await self._validate_existing_plan()
            if is_valid:
                _LOGGER.info("✅ Existing plan is valid, keeping it")
                # Update current state
                self._update_current_state()
                if self._hass:
                    self.async_write_ha_state()
                return
            else:
                _LOGGER.warning(
                    "❌ Existing plan is no longer valid, will clear and replan"
                )
                self._planned_window = None
                # Zrušit v forecastu
                await self._cancel_active_plan_in_forecast()
        else:
            _LOGGER.info("📋 No existing plan found")

        # 2. ZKONTROLOVAT OPPORTUNISTIC BALANCING
        # Opportunistic balancing se kontroluje VŽDY (nezávisle na dni)
        # Pokud je baterie blízko 100% a elektřina levná, můžeme udržet 100%
        opportunistic_created = await self._check_opportunistic_balancing()
        if opportunistic_created:
            _LOGGER.info("✅ Opportunistic balancing plan created")
            self._update_current_state()
            if self._hass:
                self.async_write_ha_state()
            return

        # 3. ZKONTROLOVAT POTŘEBU INTERVAL-BASED PLÁNOVÁNÍ
        config = self._get_balancing_config()
        if not config["enabled"]:
            _LOGGER.debug("Balancing disabled in config")
            return

        days = self._days_since_last
        interval = config["interval_days"]  # Default 7 dní
        _LOGGER.info(
            f"📊 Interval-based check: days_since_last={days}, interval={interval}"
        )

        # FORCED MODE ENFORCEMENT (den interval+1):
        # Pokud days >= interval + 1, MUSÍME naplánovat balancování
        # i když není ideální okno. Forced mode = must run.
        is_forced = days >= interval + 1

        # Kontrola jestli je čas plánovat (den interval-2 a později)
        # Příklad: interval=7 → plánovat od dne 5
        #          interval=8 → plánovat od dne 6
        planning_threshold = interval - 2

        if days < planning_threshold:
            _LOGGER.debug(
                f"Day {days} - too early for interval-based planning "
                f"(threshold={planning_threshold})"
            )
            return

        # 4. SPUSTIT INTERVAL-BASED PLÁNOVÁNÍ
        if is_forced:
            _LOGGER.warning(
                f"⚠️ FORCED MODE - Day {days} - balancing MUST run, "
                "will plan even without ideal window"
            )
        else:
            _LOGGER.info(f"📅 Day {days} - triggering balancing planning")

        await self._plan_balancing_window(forced=is_forced)

    async def _validate_existing_plan(self) -> bool:
        """
        Zkontrolovat jestli existující plán je stále platný.

        Returns:
            True pokud plán je OK, False pokud skončil nebo je invalid
        """
        if not self._planned_window:
            return False

        try:
            holding_start = datetime.fromisoformat(
                self._planned_window["holding_start"]
            )
            holding_end = datetime.fromisoformat(self._planned_window["holding_end"])

            # Normalize timezone
            if holding_start.tzinfo is None:
                holding_start = dt_util.as_local(holding_start)
            if holding_end.tzinfo is None:
                holding_end = dt_util.as_local(holding_end)

            now = dt_util.now()

            # Skončil? (+ 1h grace period)
            if now > holding_end + timedelta(hours=1):
                _LOGGER.debug(
                    f"Plan ended at {holding_end.strftime('%H:%M')}, "
                    f"now is {now.strftime('%H:%M')}"
                )
                return False

            # Stále aktivní nebo v budoucnosti
            return True

        except (ValueError, TypeError, KeyError) as e:
            _LOGGER.error(f"Plan validation error: {e}")
            return False

    async def _cancel_active_plan_in_forecast(self) -> None:
        """Zrušit aktivní plán v forecast sensoru."""
        forecast_sensor = self._get_forecast_sensor()
        if not forecast_sensor:
            return

        # Pokud forecast má aktivní plán → zrušit
        if (
            hasattr(forecast_sensor, "_active_charging_plan")
            and forecast_sensor._active_charging_plan
        ):
            _LOGGER.info("Cancelling active plan in forecast sensor")
            forecast_sensor._active_charging_plan = None
            forecast_sensor._plan_status = "none"
            if hasattr(forecast_sensor, "async_write_ha_state"):
                forecast_sensor.async_write_ha_state()

    async def _detect_last_balancing_from_history(self) -> None:
        """Detekce posledního balancování z historie SoC."""
        if not self._hass:
            _LOGGER.warning("Cannot detect balancing - hass not available")
            return

        try:
            # Hledat SoC sensor (battery capacity percentage)
            soc_entity_id = f"sensor.oig_{self._box_id}_batt_bat_c"

            # Získat historii posledních 30 dní
            end_time = dt_util.now()
            start_time = end_time - timedelta(days=30)

            _LOGGER.debug(
                f"Detecting last balancing from history: {soc_entity_id} "
                f"from {start_time} to {end_time}"
            )

            # Získat historii ze state history
            history_list = await get_instance(self._hass).async_add_executor_job(
                history.get_significant_states,
                self._hass,
                start_time,
                end_time,
                [soc_entity_id],
            )

            if not history_list or soc_entity_id not in history_list:
                _LOGGER.debug(f"No history found for {soc_entity_id}")
                return

            states = history_list[soc_entity_id]

            # Hledat souvislý úsek SoC >= 100% po dobu >= hold_hours
            config = self._get_balancing_config()
            required_hours = config["hold_hours"]

            last_balancing_time, duration = self._find_balancing_period(
                states, required_hours
            )

            if last_balancing_time:
                self._last_balancing = last_balancing_time
                self._days_since_last = (dt_util.now() - last_balancing_time).days
                _LOGGER.info(
                    f"Detected last balancing: {last_balancing_time} "
                    f"(duration: {duration:.1f}h, {self._days_since_last} days ago)"
                )
            else:
                _LOGGER.debug("No recent balancing period found in history")

        except Exception as e:
            _LOGGER.error(f"Error detecting balancing from history: {e}", exc_info=True)

    def _find_balancing_period(
        self, states: List[Any], required_hours: int
    ) -> Tuple[Optional[datetime], float]:
        """
        Najde poslední souvislý úsek SoC >= 100% po dobu >= required_hours.

        Returns:
            (start_time, duration_hours) nebo (None, 0) pokud nenalezen
        """
        if not states or len(states) < 2:
            return None, 0

        # Projít stavy odzadu (od nejnovějších)
        continuous_start: Optional[datetime] = None
        continuous_end: Optional[datetime] = None

        for i in range(len(states) - 1, -1, -1):
            state = states[i]

            try:
                soc_value = float(state.state)
            except (ValueError, AttributeError):
                continue

            # SoC >= 100%
            if soc_value >= 99.5:  # Tolerance pro floating point
                if continuous_end is None:
                    continuous_end = state.last_updated
                continuous_start = state.last_updated
            else:
                # Přerušení souvislého úseku
                if continuous_start and continuous_end:
                    duration_hours = (
                        continuous_end - continuous_start
                    ).total_seconds() / 3600

                    if duration_hours >= required_hours:
                        # Našli jsme dostatečně dlouhý úsek
                        return continuous_start, duration_hours

                # Reset
                continuous_start = None
                continuous_end = None

        # Zkontrolovat poslední úsek (nejstarší data)
        if continuous_start and continuous_end:
            duration_hours = (continuous_end - continuous_start).total_seconds() / 3600
            if duration_hours >= required_hours:
                return continuous_start, duration_hours

        return None, 0

    def _handle_coordinator_update(self) -> None:
        """Handle updated data from the coordinator."""
        try:
            _LOGGER.debug(f"Battery balancing update triggered for {self._box_id}")

            # 1. Update days_since pokud máme last_balancing
            if self._last_balancing:
                self._days_since_last = (dt_util.now() - self._last_balancing).days

            # 2. Update status based on days_since
            self._update_balancing_status()

            # 3. Planning logic - REMOVED - nyní běží v _planning_loop()
            # ⚠️ CRITICAL: Planning NESMÍ běžet zde - způsobovalo infinite loop
            # Planning je nyní v samostatném 1h loop ve _planning_loop()

            # 4. Přepočítat charging intervals - REMOVED
            # Unified planner již má charging intervals spočítané v plánu
            # Není potřeba přepočítávat

            # 5. Detekce aktuálního stavu (charging/balancing/standby/planned)
            self._update_current_state()

            self.async_write_ha_state()

        except Exception as e:
            _LOGGER.error(
                f"Error updating battery balancing sensor: {e}", exc_info=True
            )

    def _update_balancing_status(self) -> None:
        """Update balancing status based on days_since_last."""
        config = self._get_balancing_config()

        if not config["enabled"]:
            self._status = "disabled"
            return

        days = self._days_since_last
        interval = config["interval_days"]

        # Status logic podle business rules
        if days >= interval + 2:  # Den 9+
            self._status = "overdue"
        elif days >= interval + 1:  # Den 8
            self._status = "critical"
        elif days >= interval - 2:  # Den 5-7
            self._status = "due_soon"
        elif self._planned_window:
            self._status = "planned"
        else:
            self._status = "ok"

    async def _check_opportunistic_balancing(self) -> bool:
        """
        Zkontrolovat podmínky pro opportunistic balancing.

        Opportunistic balancing = kdykoliv je baterie blízko 100% a elektřina levná,
        můžeme udržet 100% pro balancování článků.

        Podmínky:
        1. Baterie >= 95% SoC
        2. Multi-faktorové skóre >= 0.6 (kombinace SoC, ceny, spotřeby)
        3. Lze držet 100% minimálně hold_hours (default 3h)
        4. Není již naplánované balancování
        5. Od posledního balancování uplynulo alespoň 3 dny (aby se nespouštělo moc často)

        Skórovací systém:
        - SoC factor (40% váha): 1.0 při 100%, klesá k 0.0 při 95%
        - Price factor (30% váha): 1.0 při levné ceně, 0.0 při drahé
        - Load factor (30% váha): 1.0 při nízké spotřebě, 0.0 při vysoké

        Returns:
            True pokud byly splněny podmínky a byl vytvořen plán
        """
        # 1. Kontrola že už není plán
        if self._planned_window:
            return False

        # 2. Kontrola config
        config = self._get_balancing_config()
        if not config["enabled"]:
            return False

        opportunistic_threshold = config.get("opportunistic_threshold", 1.1)
        economic_threshold = config.get("economic_threshold", 2.5)
        hold_hours = config.get("hold_hours", 3)
        min_score = config.get("opportunistic_min_score", 0.6)  # Nový parametr

        # 3. Kontrola že od posledního balancování uplynulo alespoň 3 dny
        if self._days_since_last < 3:
            return False

        # 4. Kontrola SoC baterie
        current_soc = self._get_current_soc()
        if current_soc < 95.0:
            return False

        _LOGGER.info(
            f"🔍 Opportunistic check: SoC={current_soc:.1f}%, "
            f"days_since={self._days_since_last}"
        )

        # 5. Získat spot ceny a spotřebu
        forecast_sensor = self._get_forecast_sensor()
        if not forecast_sensor:
            return False

        try:
            price_timeline = await forecast_sensor._get_spot_price_timeline()
            if not price_timeline:
                return False

            # Zkontrolovat následujících hold_hours hodin
            now = dt_util.now()
            end_check = now + timedelta(hours=hold_hours)

            # Najít všechny ceny v tomto období
            prices_in_window = []
            for item in price_timeline:
                item_time = datetime.fromisoformat(item["time"])
                if item_time.tzinfo is None:
                    item_time = dt_util.as_local(item_time)

                if now <= item_time < end_check:
                    prices_in_window.append(item["price"])

            if not prices_in_window:
                return False

            # Spočítat průměrnou cenu v okně
            avg_price = sum(prices_in_window) / len(prices_in_window)
            max_price = max(prices_in_window)

            # Získat průměrnou cenu za následujících 24h pro srovnání
            end_24h = now + timedelta(hours=24)
            prices_24h = []
            for item in price_timeline:
                item_time = datetime.fromisoformat(item["time"])
                if item_time.tzinfo is None:
                    item_time = dt_util.as_local(item_time)
                if now <= item_time < end_24h:
                    prices_24h.append(item["price"])

            avg_price_24h = (
                sum(prices_24h) / len(prices_24h) if prices_24h else avg_price
            )

            # === MULTI-FAKTOROVÉ SKÓROVÁNÍ ===

            # 1. SoC factor (40% váha): lineární škála 95% → 100%
            soc_factor = (current_soc - 95.0) / 5.0  # 0.0 až 1.0
            soc_factor = max(0.0, min(1.0, soc_factor))

            # 2. Price factor (30% váha): normalizace mezi opportunistic a economic threshold
            # Levná cena (< opportunistic_threshold) = 1.0
            # Střední cena (mezi thresholdy) = lineární škála
            # Drahá cena (> economic_threshold) = 0.0
            if avg_price <= opportunistic_threshold:
                price_factor = 1.0
            elif avg_price >= economic_threshold:
                price_factor = 0.0
            else:
                # Lineární interpolace mezi thresholdy
                price_range = economic_threshold - opportunistic_threshold
                price_factor = 1.0 - (
                    (avg_price - opportunistic_threshold) / price_range
                )

            # 3. Load factor (30% váha): porovnat aktuální spotřebu s průměrem
            current_load_kwh = 0.0
            avg_load_kwh = 0.5  # Default fallback

            # Získat aktuální spotřebu z adaptive profiles pokud jsou k dispozici
            adaptive_sensor = self._hass.data.get(DOMAIN, {}).get(
                f"adaptive_load_profiles_{self._box_id}"
            )
            if adaptive_sensor and hasattr(adaptive_sensor, "_current_prediction"):
                prediction = adaptive_sensor._current_prediction
                if prediction:
                    # Získat průměrnou hodinovou spotřebu
                    today_profile = prediction.get("today_profile", {})
                    hourly = today_profile.get("hourly_consumption", [])
                    if hourly:
                        avg_load_kwh = sum(hourly) / len(hourly)
                        # Aktuální spotřeba = průměr poslední hodiny
                        current_hour = now.hour
                        start_hour = today_profile.get("start_hour", 0)
                        index = current_hour - start_hour
                        if 0 <= index < len(hourly):
                            current_load_kwh = hourly[index]

            # Nízká spotřeba = vysoký faktor (inverzní škála)
            if avg_load_kwh > 0:
                load_ratio = current_load_kwh / avg_load_kwh
                load_factor = max(
                    0.0, 1.0 - min(1.0, load_ratio)
                )  # Inverzní: nízká spotřeba = 1.0
            else:
                load_factor = 0.5  # Neutral pokud nemáme data

            # === CELKOVÉ SKÓRE ===
            total_score = soc_factor * 0.4 + price_factor * 0.3 + load_factor * 0.3

            _LOGGER.info(
                f"💯 Opportunistic score: {total_score:.2f} "
                f"(SoC:{soc_factor:.2f}, Price:{price_factor:.2f}, Load:{load_factor:.2f}) "
                f"| avg_price={avg_price:.2f} Kč/kWh, avg_24h={avg_price_24h:.2f} Kč/kWh, "
                f"load={current_load_kwh:.2f}/{avg_load_kwh:.2f} kWh"
            )

            # Kontrola minimálního skóre
            if total_score < min_score:
                _LOGGER.debug(
                    f"❌ Score {total_score:.2f} < min {min_score:.2f}, not triggering"
                )
                return False

            # 6. PODMÍNKY SPLNĚNY - vytvoř opportunistic balancing plán
            _LOGGER.warning(
                f"✅ OPPORTUNISTIC BALANCING TRIGGERED! Score={total_score:.2f} >= {min_score:.2f} "
                f"(SoC={current_soc:.1f}%, price={avg_price:.2f} Kč, load={current_load_kwh:.2f} kWh)"
            )

            # Vytvoř plán - začít držet IHNED
            holding_start = now
            holding_end = now + timedelta(hours=hold_hours)

            # Pro opportunistic balancing NENÍ potřeba nabíjet (už jsme na 95%+)
            # Vytvoříme plán jen s holding period
            self._planned_window = {
                "reason": "opportunistic",
                "holding_start": holding_start.isoformat(),
                "holding_end": holding_end.isoformat(),
                "charging_intervals": [],  # Žádné nabíjení, už jsme nahoře
                "total_cost_czk": 0.0,  # Aproximace - SoC consumption během hold
                "deadline": holding_start.isoformat(),
                "target_soc_percent": 100.0,
            }

            # Propagovat do forecastu
            forecast_sensor = self._get_forecast_sensor()
            if forecast_sensor:
                await forecast_sensor.handle_balancing_plan(self._planned_window)

            self._planning_status = "opportunistic_planned"

            return True

        except Exception as e:
            _LOGGER.error(f"Error in opportunistic balancing check: {e}", exc_info=True)
            return False

    async def _create_emergency_balancing_plan(
        self, timeline: List[Dict[str, Any]]
    ) -> None:
        """
        Emergency planning když FORCED mode nenašel feasible kandidáty.

        Najde nejlevnější 8h okno v následujících 24h bez ohledu na ostatní podmínky.

        Args:
            timeline: Battery forecast timeline
        """
        _LOGGER.info(
            "🚨 Creating emergency balancing plan - finding cheapest 8h window"
        )

        now = dt_util.now()
        # Brát jen následujících 24h
        end_time = now + timedelta(hours=24)

        # Získat spot ceny
        forecast_sensor = self._get_forecast_sensor()
        if not forecast_sensor:
            _LOGGER.error("Cannot create emergency plan - forecast sensor not found")
            return

        # Get timeline from forecast sensor (async)
        price_timeline = await forecast_sensor._get_spot_price_timeline()
        if not price_timeline:
            _LOGGER.error("Cannot create emergency plan - no spot prices available")
            return

        # Extract just prices for sliding window algorithm
        # Timeline format: [{"time": "2025-10-28T13:45:00", "price": 4.51}, ...]
        spot_prices = [item["price"] for item in price_timeline]

        # Najít všechna možná 8h okna v následujících 24h
        best_window = None
        best_avg_price = float("inf")

        for start_idx in range(len(spot_prices) - 7):  # -7 protože potřebujeme 8h
            window_start = now + timedelta(hours=start_idx)
            if window_start > end_time:
                break

            # Spočítat průměrnou cenu pro toto 8h okno
            window_prices = spot_prices[start_idx : start_idx + 8]
            if len(window_prices) < 8:
                continue

            avg_price = sum(window_prices) / 8

            if avg_price < best_avg_price:
                best_avg_price = avg_price
                best_window = {
                    "start": window_start,
                    "end": window_start + timedelta(hours=8),
                    "avg_price": avg_price,
                }

        if not best_window:
            _LOGGER.error("Failed to find any 8h window for emergency plan")
            return

        # Emergency plan: přímo vytvoříme charging intervals pro celé nejlevnější okno
        # Nejlevnější okno je pro CHARGING (všech 8h)
        charging_start = best_window["start"]
        charging_end = best_window["end"]

        # Get hold_hours from config
        config = self._get_balancing_config()
        hold_hours = config.get("hold_hours", 3)

        # Holding následuje hned po charging
        holding_start = charging_end
        holding_end = holding_start + timedelta(hours=hold_hours)

        # Vytvoř charging intervals - každých 15 minut v rámci 8h okna
        charging_intervals = []
        current_time = charging_start
        while current_time < charging_end:
            charging_intervals.append(current_time.isoformat())
            current_time += timedelta(minutes=15)

        # Spočítat aproximativní cost (8h * průměrná cena * ~1.5 kWh/h nabíjení)
        # Předpokládáme že nabíjíme cca 12 kWh za 8h = 1.5 kWh/h
        estimated_kwh_per_hour = 1.5
        total_kwh = 8 * estimated_kwh_per_hour
        total_cost = total_kwh * best_avg_price

        self._planned_window = {
            "plan_start": charging_start.isoformat(),
            "plan_end": holding_end.isoformat(),
            "charging_start": charging_start.isoformat(),
            "charging_end": charging_end.isoformat(),
            "holding_start": holding_start.isoformat(),
            "holding_end": holding_end.isoformat(),
            "charging_intervals": charging_intervals,
            "avg_spot_price": best_avg_price,
            "total_cost_czk": total_cost,
            "type": "emergency",
            "reason": f"FORCED MODE - emergency cheapest 8h charging (avg {best_avg_price:.2f} CZK/kWh)",
        }

        _LOGGER.warning(
            f"✅ EMERGENCY PLAN created: charging {charging_start.strftime('%d.%m %H:%M')}-{charging_end.strftime('%H:%M')} "
            f"({len(charging_intervals)} intervals), "
            f"holding {holding_start.strftime('%H:%M')}-{holding_end.strftime('%H:%M')}, "
            f"estimated cost: {total_cost:.2f} CZK"
        )

        self._status = "planned"
        self.async_schedule_update_ha_state(force_refresh=True)

    async def _plan_balancing_window(self, forced: bool = False) -> None:
        """
        Planning logika s SIMULATION-BASED workflow.

        Args:
            forced: Pokud True, musí naplánovat i bez ideálního okna (den 8+)

        Process:
        1. Check existing plan status (držet se dokud neskončí)
        2. Evaluate need (days_since_last)
        3. Find candidate windows (s historical patterns)
        4. Simulate každý kandidát
        5. Vybrat nejlevnější feasible
        6. Aplikovat plan
        7. Alerting pokud drahý
        """
        # RATE LIMITING - neplánovat častěji než 1× za 5 minut
        now = dt_util.now()
        if self._last_planning_run:
            elapsed = (now - self._last_planning_run).total_seconds()
            if elapsed < 300:  # 5 minut
                _LOGGER.debug(
                    f"Planning skipped - last run {elapsed:.0f}s ago (< 5min)"
                )
                return

        config = self._get_balancing_config()

        if not config["enabled"]:
            self._planned_window = None
            await self._cancel_active_plan()
            return

        # 1. CHECK EXISTING PLAN
        if self._planned_window:
            now = dt_util.now()
            try:
                holding_start = datetime.fromisoformat(
                    self._planned_window["holding_start"]
                )
                holding_end = datetime.fromisoformat(
                    self._planned_window["holding_end"]
                )
                if holding_start.tzinfo is None:
                    holding_start = dt_util.as_local(holding_start)
                if holding_end.tzinfo is None:
                    holding_end = dt_util.as_local(holding_end)

                # LIFECYCLE CHECK: Get plan status from forecast sensor
                forecast_sensor = self._get_forecast_sensor()
                if forecast_sensor and hasattr(
                    forecast_sensor, "_active_charging_plan"
                ):
                    active_plan = forecast_sensor._active_charging_plan
                    if active_plan:
                        plan_status = active_plan.get("status", "planned")
                        plan_requester = active_plan.get("requester")

                        # LOCKED or RUNNING: Cannot re-plan, only validate/cancel
                        if plan_status in ["locked", "running"]:
                            if plan_requester == "balancing":
                                _LOGGER.info(
                                    f"🔒 Plan is {plan_status.upper()} (charging started/imminent), "
                                    f"will not re-plan. Only validation allowed."
                                )
                                # Continue to validation checks below (but won't create new plan)
                            else:
                                _LOGGER.info(
                                    f"Plan {plan_status} but not owned by balancing "
                                    f"(requester={plan_requester}), skipping"
                                )
                                return

                        # COMPLETED: Clear and continue to new planning
                        elif plan_status == "completed":
                            _LOGGER.info(
                                f"Plan COMPLETED, clearing and planning new cycle"
                            )
                            self._planned_window = None
                            await self._cancel_active_plan()
                            # Continue to planning below (don't return)

                        # PLANNED: Can re-plan freely
                        else:  # plan_status == "planned"
                            _LOGGER.debug(
                                f"� Plan is PLANNED (>1h to start), can re-plan if needed"
                            )

                # CRITICAL CHECK: If holding window is active but battery not charged, CANCEL plan
                # But ONLY if plan is RUNNING (not LOCKED - give it time to charge)
                if now >= holding_start and now <= holding_end:
                    current_soc = self._get_current_soc()

                    # Check plan status - only fail if RUNNING and battery not charged
                    plan_status = None
                    if forecast_sensor and hasattr(
                        forecast_sensor, "_active_charging_plan"
                    ):
                        active_plan = forecast_sensor._active_charging_plan
                        if active_plan:
                            plan_status = active_plan.get("status")

                    if current_soc < 95.0:  # Should be ~100% during holding
                        # If LOCKED (just starting), give warning but don't cancel yet
                        if plan_status == "locked":
                            _LOGGER.warning(
                                f"⚠️ Holding window starting but battery only {current_soc:.1f}% "
                                f"(expected 95%+). Plan is LOCKED, monitoring..."
                            )
                            return  # Keep monitoring
                        # If RUNNING, cancel failed plan
                        else:
                            _LOGGER.error(
                                f"❌ PLAN FAILURE: Holding window active but battery only {current_soc:.1f}% "
                                f"(expected 95%+). Cancelling failed plan and re-planning."
                            )
                            self._planned_window = None
                            await self._cancel_active_plan()
                            # Continue to create new plan below (don't return)
                    else:
                        _LOGGER.debug(
                            f"✅ Holding window active, battery at {current_soc:.1f}%, keeping plan"
                        )
                        return  # Plan is working, keep it

                # CRITICAL CHECK: If all charging intervals are in the past, plan cannot work
                # But ONLY check for PLANNED status (LOCKED/RUNNING plans are already executing)
                plan_status = None
                if forecast_sensor and hasattr(
                    forecast_sensor, "_active_charging_plan"
                ):
                    active_plan = forecast_sensor._active_charging_plan
                    if active_plan:
                        plan_status = active_plan.get("status")

                if (
                    self._planned_window
                    and now < holding_start
                    and plan_status == "planned"
                ):
                    charging_intervals = self._planned_window.get(
                        "charging_intervals", []
                    )
                    if charging_intervals:
                        all_past = True
                        for interval_str in charging_intervals:
                            try:
                                interval_time = datetime.fromisoformat(interval_str)
                                if interval_time.tzinfo is None:
                                    interval_time = dt_util.as_local(interval_time)
                                if interval_time > now:
                                    all_past = False
                                    break
                            except (ValueError, TypeError):
                                continue

                        if all_past:
                            _LOGGER.error(
                                f"❌ PLAN FAILURE: All charging intervals are in the past! "
                                f"Cancelling obsolete plan and re-planning."
                            )
                            self._planned_window = None
                            await self._cancel_active_plan()
                            # Continue to create new plan below (don't return)
                        else:
                            _LOGGER.debug(
                                f"Plan has future charging intervals, keeping it"
                            )
                            # If LOCKED or RUNNING, don't re-plan
                            if plan_status in ["locked", "running"]:
                                return

                # Pokud okno ještě neskončilo + 1h grace period, DRŽET SE HO
                elif now < holding_end + timedelta(hours=1):
                    _LOGGER.debug(
                        f"Keeping existing planned window: {holding_start.strftime('%H:%M')}-{holding_end.strftime('%H:%M')}"
                    )
                    return  # NEMĚNIT window!
                else:
                    _LOGGER.info(
                        f"Planned window completed at {holding_end.strftime('%H:%M')}, clearing"
                    )

                    # PROFILING: Uložit dokončený plán do DB
                    if self._planned_window and self._hass:
                        self._hass.async_create_task(
                            self._record_balancing_completion(self._planned_window)
                        )

                    # Update last_balancing
                    self._last_balancing = holding_end
                    self._days_since_last = 0

                    # Clear plan
                    self._planned_window = None
                    await self._cancel_active_plan()
            except (ValueError, TypeError, KeyError) as e:
                _LOGGER.warning(f"Invalid planned_window format: {e}, clearing")
                self._planned_window = None
                await self._cancel_active_plan()

        # 2. EVALUATE NEED
        days = self._days_since_last
        now = dt_util.now()
        hold_hours = config["hold_hours"]

        # Too early?
        if days < config["interval_days"] - 2:  # < 5. den
            _LOGGER.debug(f"Day {days} - too early, skip")
            return

        # Determine mode & deadline
        # Business logic:
        # - Days 1-4: Too early, skip
        # - Days 5-7: Economic mode - find cheap opportunities, deadline = day 9 midnight
        # - Day 8+: Forced mode - MUST charge, deadline = day 9 midnight (or ASAP if late)

        if days < config["interval_days"] + 1:  # Dny 5-7 (economic)
            mode = "economic"
            # Deadline = den 9 půlnoc (interval_days=7 + 2 dny buffer)
            # Example: Day 7 → deadline = day 9 00:00 (2 days from now)
            days_until_deadline = (config["interval_days"] + 2) - days
            deadline = (now + timedelta(days=days_until_deadline)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
        else:  # Den 8+ (forced)
            mode = "forced"
            # Deadline = den 9 půlnoc, ale minimálně 24h od teď
            # Pokud už je den 9+, deadline = ASAP (zítra půlnoc)
            days_overdue = max(0, days - config["interval_days"])
            if days_overdue == 0:  # Den 8
                # Den 9 půlnoc
                deadline = (now + timedelta(days=1)).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
            else:  # Den 9+ (zpožděné)
                # ASAP - zítra půlnoc (minimální čas na nabití)
                deadline = (now + timedelta(days=1)).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )

        _LOGGER.info(
            f"📅 Day {days} - {mode.upper()} mode, "
            f"deadline {deadline.strftime('%Y-%m-%d %H:%M')}"
        )

        # 3. GET FORECAST & TIMELINE
        forecast_sensor = self._get_forecast_sensor()
        if not forecast_sensor:
            _LOGGER.error("Cannot get forecast sensor")
            return

        # CRITICAL: Use BASELINE timeline (without any plan) for planning!
        # Using active timeline would cause circular dependency and re-planning over existing plan
        timeline = forecast_sensor.get_baseline_timeline()
        if not timeline:
            _LOGGER.error("No baseline timeline data available")
            return

        # 4. FIND CANDIDATE WINDOWS (s historical patterns)
        candidates = await self._find_candidate_windows(
            timeline=timeline,
            hold_hours=hold_hours,
            deadline=deadline,
            mode=mode,
        )

        if not candidates:
            if forced:
                _LOGGER.warning(
                    "⚠️ FORCED MODE: No candidates found, creating emergency plan"
                )
                # Emergency plan: Najít nejlevnější 8h okno v následujících 24h
                await self._create_emergency_balancing_plan(timeline)
            else:
                _LOGGER.warning("No feasible candidate windows found")
            return

        # 5. SIMULATE každý kandidát
        best_simulation = None
        best_cost = float("inf")
        best_candidate = None

        for i, candidate in enumerate(candidates):
            _LOGGER.debug(
                f"Simulating candidate {i+1}/{len(candidates)}: "
                f"hour={candidate['hour']}, score={candidate['score']:.1f}"
            )

            # Simulate
            try:
                simulation = await forecast_sensor.simulate_charging_plan(
                    target_soc_percent=100.0,
                    charging_start=now,  # Můžeme nabíjet kdykoli od teď
                    charging_end=candidate["holding_start"],  # Do začátku holding
                    holding_start=candidate["holding_start"],
                    holding_end=candidate["holding_end"],
                    requester="balancing",
                    mode=mode,  # Pass economic/forced mode to simulation
                )

                # Validace feasibility
                if not simulation.get("feasible"):
                    violation = simulation.get("violation")
                    _LOGGER.debug(f"  ❌ Not feasible: {violation}")
                    continue

                # KRITICKÁ KONTROLA: Zkontrolovat jestli dosáhne 100% SOC
                achieved_soc = simulation.get("achieved_soc_percent", 0)

                # Economic mode: REJECT pokud < 95% (čekáme na lepší příležitost)
                # Forced mode: ACCEPT i partial (musíme nabít co nejvíc)
                if mode == "economic" and achieved_soc < 95.0:
                    _LOGGER.debug(
                        f"  ⚠️ Economic mode: insufficient charging {achieved_soc:.1f}% (need 95%+), skipping"
                    )
                    continue
                elif mode == "forced" and achieved_soc < 95.0:
                    _LOGGER.warning(
                        f"  ⚠️ Forced mode: partial charging {achieved_soc:.1f}% (target 95%+), but accepting"
                    )

                # Zkontrolovat náklady
                total_cost = simulation.get("total_cost_czk", float("inf"))

                # SCORING: Preferovat kandidáty které dosáhnou 100% SOC
                # V economic mode je kritické dosáhnout plnou kapacitu
                # Penalizace za nedosažení 100%: za každé procento pod 100% přičíst 2 Kč k ceně
                soc_penalty = 0.0
                if achieved_soc < 100.0:
                    soc_penalty = (100.0 - achieved_soc) * 2.0  # 2 Kč za každé %
                    _LOGGER.debug(
                        f"  SOC penalty: {soc_penalty:.2f} Kč for achieving {achieved_soc:.1f}%"
                    )

                effective_cost = total_cost + soc_penalty

                if effective_cost < best_cost:
                    best_cost = effective_cost
                    best_simulation = simulation
                    best_candidate = candidate
                    _LOGGER.debug(
                        f"  ✅ New best: {total_cost:.2f} Kč (+ {soc_penalty:.2f} penalty) = {effective_cost:.2f}, achieves {achieved_soc:.1f}%"
                    )

            except Exception as e:
                _LOGGER.error(
                    f"Simulation failed for candidate {i+1}: {e}", exc_info=True
                )
                continue

        # 6. Check if found any feasible plan
        if not best_simulation or not best_candidate:
            if mode == "economic":
                _LOGGER.info(
                    f"📊 Economic mode: No candidates achieving 95%+ SOC found, "
                    f"waiting for better prices tomorrow (day {days}/{config['interval_days']})"
                )
            else:
                _LOGGER.error(
                    f"❌ Forced mode: No feasible balancing plan found after simulating all candidates! "
                    f"This should not happen in forced mode."
                )
            return

        # 7. ALERTING - check if expensive
        await self._check_cost_alert(best_cost, mode)

        # 8. APPLY best plan to forecast sensor
        # Konvertovat simulation na plan_result formát
        # DŮLEŽITÉ: Použít holding_start a holding_end z kandidáta, ne z simulace!
        # Simulace vrací plan_start (čas vytvoření) a plan_end (deadline),
        # ale potřebujeme skutečný holding_start a holding_end

        # Najít první charging interval pro plan_start
        charging_intervals = best_simulation.get("charging_intervals", [])
        plan_start = None
        if charging_intervals:
            first_interval_time = None
            for interval in charging_intervals:
                try:
                    interval_time = datetime.fromisoformat(interval["timestamp"])
                    if interval_time.tzinfo is None:
                        interval_time = dt_util.as_local(interval_time)
                    if (
                        first_interval_time is None
                        or interval_time < first_interval_time
                    ):
                        first_interval_time = interval_time
                except (ValueError, TypeError, KeyError):
                    continue
            plan_start = first_interval_time

        # plan_end = konec holding
        plan_end = best_candidate["holding_end"]

        plan_result = {
            "feasible": best_simulation.get("feasible", False),
            "requester": "balancing",
            "mode": mode,
            "achieved_soc_percent": best_simulation.get("final_soc_percent", 100.0),
            "charging_plan": {
                "holding_start": best_candidate["holding_start"].isoformat(),
                "holding_end": best_candidate["holding_end"].isoformat(),
                "charging_intervals": charging_intervals,
            },
            "created_at": dt_util.now().isoformat(),
        }

        # Apply to forecast with lifecycle management
        if plan_start:
            if not forecast_sensor.apply_charging_plan(
                plan_result=plan_result,
                plan_start=plan_start,
                plan_end=plan_end,
            ):
                _LOGGER.error(f"Failed to apply plan to forecast")
                return
        else:
            _LOGGER.error(f"Cannot apply plan: no charging intervals found")
            return

        _LOGGER.info(f"✅ Applied balancing plan to forecast sensor")

        # 9. Save plan to balancing sensor (for state tracking)
        # Konvertovat simulaci do formátu plánu
        holding_start = best_candidate["holding_start"]
        holding_end = best_candidate["holding_end"]

        # Uložit timestamp výpočtu
        calculation_time = dt_util.now()
        self._last_calculation = calculation_time

        self._planned_window = {
            "holding_start": holding_start.isoformat(),
            "holding_end": holding_end.isoformat(),
            "total_cost_czk": best_simulation["total_cost_czk"],
            "charging_cost_czk": best_simulation["charging_cost_czk"],
            "holding_cost_czk": best_simulation["holding_cost_czk"],
            "opportunity_cost_czk": best_simulation["opportunity_cost_czk"],
            "avg_price_czk": (
                best_simulation["total_cost_czk"] / best_simulation["energy_needed_kwh"]
                if best_simulation["energy_needed_kwh"] > 0
                else 0
            ),
            "charging_avg_price_czk": (
                best_simulation["charging_cost_czk"]
                / best_simulation["energy_needed_kwh"]
                if best_simulation["energy_needed_kwh"] > 0
                else 0
            ),
            "reason": mode,
            "charging_intervals": [
                iv["timestamp"] for iv in best_simulation["charging_intervals"]
            ],
            "alternatives_count": len(candidates),  # Pro profiling
        }

        _LOGGER.info(
            f"✅ Balancing plan CREATED: {mode} mode, "
            f"holding {holding_start.strftime('%Y-%m-%d %H:%M')} - {holding_end.strftime('%H:%M')}, "
            f"{len(best_simulation['charging_intervals'])} intervals, "
            f"cost {best_cost:.2f} Kč (charging={best_simulation['charging_cost_czk']:.2f}, "
            f"holding={best_simulation['holding_cost_czk']:.2f}, "
            f"opportunity={best_simulation['opportunity_cost_czk']:.2f})"
        )

        # Update current state and write to HA
        self._update_current_state()
        if self._hass:
            self.async_write_ha_state()

        # Mark planning run timestamp
        self._last_planning_run = dt_util.now()

    async def _check_cost_alert(self, plan_cost: float, mode: str) -> None:
        """
        Alertovat pokud balancování je výrazně dražší než obvykle.

        Args:
            plan_cost: Náklady plánovaného balancování
            mode: economic | forced
        """
        # Načíst historical data
        profiles = await self._load_balancing_completion_profiles(weeks_back=52)
        if not profiles:
            return  # Nemáme historii, nemůžeme porovnat

        patterns = self._analyze_balancing_patterns(profiles)
        avg_cost = patterns.get("avg_cost_overall", 0)

        if avg_cost == 0:
            return

        # Threshold: 1.5× průměrných nákladů
        if plan_cost > avg_cost * 1.5:
            increase_percent = ((plan_cost / avg_cost) - 1) * 100

            # Create persistent notification
            if self._hass:
                await self._hass.services.async_call(
                    "persistent_notification",
                    "create",
                    {
                        "title": "⚠️ Drahé balancování baterie",
                        "message": (
                            f"Plánované balancování stojí **{plan_cost:.2f} Kč**, "
                            f"což je **{increase_percent:.0f}%** více než obvykle "
                            f"(průměr: {avg_cost:.2f} Kč).\n\n"
                            f"**Režim**: {mode}\n"
                            f"**Doporučení**: {'Pokračovat (forced režim)' if mode == 'forced' else 'Zvážit odložení na levnější období'}\n\n"
                            f"_Toto upozornění můžete ignorovat - plán byl automaticky aplikován._"
                        ),
                        "notification_id": "oig_cloud_expensive_balancing",
                    },
                )

            _LOGGER.warning(
                f"⚠️ EXPENSIVE BALANCING: {plan_cost:.2f} Kč "
                f"(+{increase_percent:.0f}% vs avg {avg_cost:.2f} Kč)"
            )

    def _get_forecast_sensor(self) -> Optional[Any]:
        """Získat battery forecast sensor instanci pro volání unified planneru."""
        if not self._hass:
            return None

        forecast_sensor_id = f"sensor.oig_{self._box_id}_battery_forecast"

        # Získat sensor entity
        from homeassistant.helpers import entity_registry as er

        ent_reg = er.async_get(self._hass)
        entity = ent_reg.async_get(forecast_sensor_id)

        if not entity:
            _LOGGER.debug(f"Forecast sensor entity not found: {forecast_sensor_id}")
            return None

        # Najít platform a získat instanci
        # HACK: Procházet všechny entity v hass až najdeme tu správnou
        for component_name in ["sensor"]:
            component = self._hass.data.get("entity_components", {}).get(component_name)
            if component:
                for entity_obj in component.entities:
                    if entity_obj.entity_id == forecast_sensor_id:
                        _LOGGER.debug(
                            f"Found forecast sensor instance: {forecast_sensor_id}"
                        )
                        return entity_obj

        _LOGGER.warning(f"Forecast sensor instance not found: {forecast_sensor_id}")
        return None

    async def _cancel_active_plan(self) -> None:
        """Zruší aktivní plán v forecast senzoru (pokud patří balancingu)."""
        forecast_sensor = self._get_forecast_sensor()
        if forecast_sensor:
            forecast_sensor.cancel_charging_plan(requester="balancing")

            # Force update forecast to reflect cancelled plan
            if hasattr(forecast_sensor, "async_update"):
                await forecast_sensor.async_update()

    # ========================================================================
    # PROFILING & PATTERN ANALYSIS
    # ========================================================================

    async def _record_balancing_completion(self, plan_data: Dict[str, Any]) -> None:
        """
        Uložit profil dokončeného balancování do HA recorder.

        Args:
            plan_data: Data z _planned_window včetně nákladů
        """
        if not self._hass:
            _LOGGER.warning("Cannot record balancing - no hass instance")
            return

        now = dt_util.now()
        week = now.isocalendar()[1]
        year = now.year

        # Parse timestamps
        try:
            charging_start = datetime.fromisoformat(plan_data["charging_intervals"][0])
            charging_end = datetime.fromisoformat(plan_data["charging_intervals"][-1])
            holding_start = datetime.fromisoformat(plan_data["holding_start"])
            holding_end = datetime.fromisoformat(plan_data["holding_end"])

            charging_duration = (charging_end - charging_start).total_seconds() / 3600.0
            holding_duration = (holding_end - holding_start).total_seconds() / 3600.0
        except (KeyError, ValueError, IndexError) as e:
            _LOGGER.error(f"Failed to parse plan timestamps: {e}")
            return

        # Sestavit profil
        profile = {
            # Časová identifikace
            "week": week,
            "year": year,
            "completed_at": now.isoformat(),
            "day_of_week": now.weekday(),  # 0=Po, 6=Ne
            "month": now.month,
            # Decision data
            "mode": plan_data.get("reason", "unknown"),  # economic/forced
            "days_since_last": self._days_since_last,
            "alternatives_evaluated": plan_data.get("alternatives_count", 0),
            # Window timing
            "charging_start": charging_start.isoformat(),
            "charging_end": charging_end.isoformat(),
            "holding_start": holding_start.isoformat(),
            "holding_end": holding_end.isoformat(),
            "charging_duration_hours": round(charging_duration, 2),
            "holding_duration_hours": round(holding_duration, 2),
            # Cost breakdown
            "charging_cost_czk": plan_data.get("total_cost_czk", 0),
            "holding_cost_czk": 0,  # TODO: Extract from forecast
            "opportunity_cost_czk": 0,  # TODO: Calculate
            "total_cost_czk": plan_data.get("total_cost_czk", 0),
            # Energy data
            "initial_soc_percent": 0,  # TODO: Get from forecast
            "final_soc_percent": 100.0,
            "energy_charged_kwh": 0,  # TODO: Calculate
            "charging_efficiency_percent": 0,  # TODO: Calculate
            # Price context
            "avg_spot_price_during_charging": plan_data.get(
                "charging_avg_price_czk", 0
            ),
            "avg_spot_price_during_holding": plan_data.get("avg_price_czk", 0),
            "min_spot_price_available": 0,  # TODO: Get from forecast
            "max_spot_price_available": 0,  # TODO: Get from forecast
            # Success metrics
            "minimal_capacity_violations": 0,  # Vždy 0 (jinak by plán neproběhl)
            "target_achieved": True,
        }

        # Event pro recorder
        self._hass.bus.async_fire("oig_cloud_balancing_completed", profile)

        # Recent history (poslední 5)
        self._recent_balancing_history.append(profile)
        self._recent_balancing_history = self._recent_balancing_history[-5:]

        _LOGGER.info(
            f"📊 Balancing profile saved: week {week}/{year}, "
            f"mode={profile['mode']}, cost={profile['total_cost_czk']:.2f} Kč"
        )

    async def _load_balancing_completion_profiles(
        self, weeks_back: int = 52
    ) -> List[Dict[str, Any]]:
        """
        Načíst balancing completion profily z posledních N týdnů.

        POZNÁMKA: Toto jsou staré 'balancing_completed' events, ne nové decision profily!

        Args:
            weeks_back: Kolik týdnů zpět hledat (default 52 = 1 rok)

        Returns:
            List profilů seřazených od nejnovějšího
        """
        if not self._hass:
            _LOGGER.warning("Cannot load profiles - no hass instance")
            return []

        try:
            # Get recorder instance
            recorder = get_instance(self._hass)
            if not recorder or not recorder.engine:
                _LOGGER.warning("Recorder not available")
                return []

            # SQL query
            from sqlalchemy import text

            cutoff_date = dt_util.now() - timedelta(weeks=weeks_back)

            with recorder.engine.connect() as conn:
                query = text(
                    """
                    SELECT event_data
                    FROM events
                    WHERE event_type = 'oig_cloud_balancing_completed'
                    AND time_fired > :cutoff
                    ORDER BY time_fired DESC
                """
                )

                result = conn.execute(query, {"cutoff": cutoff_date})
                profiles = [json.loads(row[0]) for row in result]

            _LOGGER.debug(f"Loaded {len(profiles)} balancing profiles from DB")
            return profiles

        except Exception as e:
            _LOGGER.error(f"Failed to load balancing profiles: {e}", exc_info=True)
            return []

    def _analyze_balancing_patterns(
        self, profiles: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyzovat historické profily a najít patterns.

        Args:
            profiles: List profilů z _load_balancing_profiles()

        Returns:
            Dictionary s patterns a statistikami
        """
        if not profiles:
            return {
                "total_profiles": 0,
                "avg_cost_overall": 0,
            }

        # Seskupit podle měsíce
        by_month = defaultdict(list)
        for p in profiles:
            month = p.get("month", 0)
            by_month[month].append(p)

        # Seskupit podle dne v týdnu
        by_weekday = defaultdict(list)
        for p in profiles:
            weekday = p.get("day_of_week", 0)
            by_weekday[weekday].append(p)

        # Spočítat průměrné náklady
        all_costs = [p.get("total_cost_czk", 0) for p in profiles]
        avg_cost_overall = float(np.mean(all_costs)) if all_costs else 0

        avg_costs_by_month = {
            month: float(np.mean([p.get("total_cost_czk", 0) for p in ps]))
            for month, ps in by_month.items()
        }

        avg_costs_by_weekday = {
            day: float(np.mean([p.get("total_cost_czk", 0) for p in ps]))
            for day, ps in by_weekday.items()
        }

        # Najít typické časy nabíjení
        charging_hours = []
        for p in profiles:
            try:
                start_str = p.get("charging_start", "")
                if start_str:
                    start = datetime.fromisoformat(start_str)
                    charging_hours.append(start.hour)
            except (ValueError, TypeError):
                continue

        typical_hour = (
            int(max(set(charging_hours), key=charging_hours.count))
            if charging_hours
            else 22
        )

        # Seasonal patterns
        winter_months = [11, 12, 1, 2]
        summer_months = [5, 6, 7, 8]

        winter_profiles = [p for p in profiles if p.get("month") in winter_months]
        summer_profiles = [p for p in profiles if p.get("month") in summer_months]

        winter_avg = (
            float(np.mean([p.get("total_cost_czk", 0) for p in winter_profiles]))
            if winter_profiles
            else None
        )
        summer_avg = (
            float(np.mean([p.get("total_cost_czk", 0) for p in summer_profiles]))
            if summer_profiles
            else None
        )

        # Průměrná doba nabíjení
        durations = [p.get("charging_duration_hours", 0) for p in profiles]
        typical_duration = float(np.mean(durations)) if durations else 4.0

        return {
            "total_profiles": len(profiles),
            "avg_cost_overall": avg_cost_overall,
            "avg_cost_by_month": avg_costs_by_month,
            "avg_cost_by_weekday": avg_costs_by_weekday,
            "typical_charging_hour": typical_hour,
            "typical_charging_duration": typical_duration,
            "winter_avg_cost": winter_avg,
            "summer_avg_cost": summer_avg,
        }

    async def _find_candidate_windows(
        self,
        timeline: List[Dict[str, Any]],
        hold_hours: int,
        deadline: datetime,
        mode: str,
    ) -> List[Dict[str, Any]]:
        """
        Najít kandidátní okna pro balancování s využitím 72h consumption profiling.

        Args:
            timeline: Forecast timeline data
            hold_hours: Kolik hodin držet na 100%
            deadline: Do kdy musí být plán dokončen
            mode: economic | forced

        Returns:
            List top 10 kandidátních oken seřazených podle score (nejlepší první)
        """
        # 1. Načíst 72h consumption prediction z adaptive_load_profiles senzoru
        # Consumption profiling je v adaptive_load_profiles, ne v balancingu
        consumption_prediction = None
        try:
            # Najít adaptive_load_profiles sensor entity
            if self._hass:
                entity_id = f"sensor.oig_{self._box_id}_adaptive_load_profiles"

                # Projít všechny entity a najít náš sensor
                from homeassistant.helpers import entity_platform

                platforms = entity_platform.async_get_platforms(self._hass, "oig_cloud")

                for platform in platforms:
                    if platform.domain == "sensor":
                        for entity in platform.entities.values():
                            if (
                                hasattr(entity, "entity_id")
                                and entity.entity_id == entity_id
                            ):
                                if hasattr(entity, "get_current_prediction"):
                                    consumption_prediction = (
                                        entity.get_current_prediction()
                                    )
                                    break
        except Exception as e:
            _LOGGER.debug(
                f"Could not get consumption prediction from adaptive_load_profiles: {e}"
            )

        if consumption_prediction:
            predicted_24h = consumption_prediction.get("predicted_24h", [])
            similarity = consumption_prediction.get("similarity_score", 0.0)
            _LOGGER.info(
                f"📊 Consumption prediction: similarity={similarity:.3f}, "
                f"predicted_24h_total={sum(predicted_24h):.2f} kWh"
            )
            preferred_hour = 22  # Default když máme consumption prediction
        else:
            _LOGGER.warning(
                "No consumption prediction available, using balancing pattern prediction"
            )

        # 1b. Načíst balancing pattern prediction (7d profiling)
        balancing_pattern = None
        try:
            balancing_pattern = await self._find_best_matching_balancing_pattern()
        except Exception as e:
            _LOGGER.debug(f"Could not get balancing pattern: {e}")

        if balancing_pattern:
            predicted_120h = balancing_pattern.get("predicted_120h_data", [])
            similarity = balancing_pattern.get("similarity_score", 0.0)
            predicted_balancing_hours = balancing_pattern.get(
                "predicted_balancing_hours", 0
            )
            _LOGGER.info(
                f"📊 Balancing pattern: similarity={similarity:.3f}, "
                f"predicted_balancing_hours={predicted_balancing_hours}/120"
            )

            # Najít typickou hodinu kdy balancing začíná v predikci
            if predicted_120h:
                # Najít první hodinu kdy balancing začal v matched profilu
                for i, hour_data in enumerate(predicted_120h):
                    if hour_data.get("balancing_active"):
                        # Převést index (0-119) na hodinu dne
                        preferred_hour = i % 24
                        _LOGGER.info(
                            f"📊 Pattern suggests balancing at hour {preferred_hour}:00"
                        )
                        break
                else:
                    # Pokud nenajdeme aktivní balancing, použít historický pattern
                    _LOGGER.info("No active balancing in pattern, using fallback")
                    preferred_hour = 22
            else:
                preferred_hour = 22
        else:
            # Ultimate fallback: použít historické completion patterns
            _LOGGER.info(
                "No balancing pattern available, using completion history fallback"
            )
            profiles = await self._load_balancing_completion_profiles(weeks_back=52)
            patterns = self._analyze_balancing_patterns(profiles)
            preferred_hour = patterns.get("typical_charging_hour", 22)
            _LOGGER.info(
                f"📊 Fallback completion analysis: {patterns['total_profiles']} profiles, "
                f"typical hour={preferred_hour}:00"
            )

        # 2. Hledat možná okna v timeline
        candidates = []
        now = dt_util.now()
        # Minimální čas do začátku holding - potřebujeme čas na nabití baterie
        # Rezerva: alespoň 1 hodina pro nalezení a spuštění nabíjecích intervalů
        min_holding_start = now + timedelta(hours=1)

        for i in range(len(timeline)):
            point = timeline[i]
            timestamp_str = point.get("timestamp")
            if not timestamp_str:
                continue

            holding_start = datetime.fromisoformat(timestamp_str)
            if holding_start.tzinfo is None:
                holding_start = dt_util.as_local(holding_start)

            holding_end = holding_start + timedelta(hours=hold_hours)

            # Skip holding windows in the past or too soon (need time to charge)
            if holding_start < min_holding_start:
                continue

            # Musí skončit před deadline
            if holding_end > deadline:
                break

            # Score kandidáta
            score = 0.0

            # 1. Cena během holding period (nižší = lepší)
            holding_price_sum = 0.0
            holding_points = 0
            for j in range(i, min(i + hold_hours * 4, len(timeline))):  # 4 = 15min/h
                holding_price_sum += timeline[j].get("spot_price_czk", 0)
                holding_points += 1

            holding_avg_price = (
                holding_price_sum / holding_points if holding_points > 0 else 0
            )
            score -= holding_avg_price * 10  # Váha: cena je nejdůležitější

            # 2. Kapacita baterie na začátku (nižší = lepší, levnější nabít)
            battery_kwh = point.get("battery_capacity_kwh", 0)
            max_capacity = 12.29  # TODO: Get from config
            capacity_ratio = battery_kwh / max_capacity if max_capacity > 0 else 0
            score -= (1.0 - capacity_ratio) * 20  # Bonus za nízkou kapacitu

            # 3. BONUS: Podobnost s historical patterns (preferovaná hodina)
            hour_of_day = holding_start.hour
            hour_diff = abs(hour_of_day - preferred_hour)
            if hour_diff <= 2:  # ±2 hodiny od typického času
                score += 5.0

            # 4. BONUS: Weekend
            if holding_start.weekday() >= 5:  # So, Ne
                score += 3.0

            # 5. BONUS: Noc (22:00-06:00)
            if hour_of_day >= 22 or hour_of_day <= 6:
                score += 2.0

            # 6. BONUS: Balancing pattern prediction podporuje toto okno
            if balancing_pattern and balancing_pattern.get("predicted_120h_data"):
                predicted_120h = balancing_pattern["predicted_120h_data"]
                # Spočítat kolik hodin od teď je holding_start
                hours_from_now = int(
                    (holding_start - dt_util.now()).total_seconds() / 3600
                )

                # Pokud je v rozsahu predikce (0-119h)
                if 0 <= hours_from_now < len(predicted_120h):
                    predicted_hour = predicted_120h[hours_from_now]

                    # Pokud pattern predikuje že balancing bude aktivní v této době
                    if predicted_hour.get("balancing_active"):
                        score += 10.0  # Velký bonus - pattern říká že je to dobrá doba
                        _LOGGER.debug(
                            f"Pattern bonus for {holding_start}: balancing predicted at this time"
                        )

                    # Pokud má pattern nízkou cenu v této době
                    predicted_price = predicted_hour.get("spot_price_czk", 0)
                    current_price = point.get("spot_price_czk", 0)
                    if predicted_price > 0 and predicted_price <= current_price * 1.1:
                        score += 3.0  # Bonus - pattern ukazuje nízkou cenu
                        _LOGGER.debug(
                            f"Pattern price bonus for {holding_start}: {predicted_price:.2f} <= {current_price:.2f}"
                        )

            candidates.append(
                {
                    "holding_start": holding_start,
                    "holding_end": holding_end,
                    "holding_start_idx": i,
                    "score": score,
                    "initial_capacity_percent": capacity_ratio * 100,
                    "holding_avg_price_czk": holding_avg_price,
                    "hour": hour_of_day,
                    "is_weekend": holding_start.weekday() >= 5,
                }
            )

        # 3. Seřadit podle score (nejvyšší = nejlepší)
        candidates.sort(key=lambda x: x["score"], reverse=True)

        # 4. Vrátit top 10
        top_candidates = candidates[:10]

        if top_candidates:
            _LOGGER.info(
                f"Found {len(candidates)} candidate windows, top 10 scores: "
                f"{[round(c['score'], 1) for c in top_candidates]}"
            )

        return top_candidates

    # ═══════════════════════════════════════════════════════════════════════════
    # DEPRECATED METHODS - Removed in refactoring, replaced by unified planner
    # ═══════════════════════════════════════════════════════════════════════════
    # _get_spot_prices() - now in forecast sensor
    # _get_forecast_soc_at_time() - replaced by forecast._predict_soc_at_time()
    # _check_window_feasibility() - replaced by forecast._is_plan_feasible()
    # _find_opportunistic_window() - replaced by forecast.plan_charging_to_target(mode="economic")
    # _find_economic_window() - replaced by forecast.plan_charging_to_target(mode="economic")
    # _find_best_window() - replaced by forecast.plan_charging_to_target(mode="forced")
    # _add_charging_intervals() - replaced by forecast._find_cheapest_charging_intervals()

    def _update_current_state(self) -> None:
        """
        Detekuje aktuální stav balancování.

        Stavy:
        - charging: Probíhá nabíjení v levném intervalu před balancováním
        - balancing: Probíhá balancování (držení na 100%)
        - completed: Balancování dokončeno (do 1h po skončení)
        - planned: Balancování je naplánováno, ale ještě nezačalo
        - standby: Není naplánováno žádné balancování
        """
        _LOGGER.info(
            f"[State Update] _update_current_state called, _planned_window={self._planned_window is not None}"
        )

        if not self._planned_window:
            _LOGGER.info("[State Update] No planned window - setting standby")
            self._current_state = "standby"
            self._time_remaining = None
            return

        now = dt_util.now()

        try:
            holding_start = datetime.fromisoformat(
                self._planned_window["holding_start"]
            )
            holding_end = datetime.fromisoformat(self._planned_window["holding_end"])

            # Make timezone aware!
            if holding_start.tzinfo is None:
                holding_start = dt_util.as_local(holding_start)
            if holding_end.tzinfo is None:
                holding_end = dt_util.as_local(holding_end)

            # Získat charging intervaly pokud existují
            charging_intervals = self._planned_window.get("charging_intervals", [])

            _LOGGER.debug(
                f"[State Check] now={now}, holding_start={holding_start}, "
                f"charging_intervals={charging_intervals}"
            )

            # Zkontrolovat jestli jsme v některém charging intervalu
            is_in_charging_interval = False
            if charging_intervals:
                for interval_str in charging_intervals:
                    try:
                        interval_time = datetime.fromisoformat(interval_str)
                        if interval_time.tzinfo is None:
                            interval_time = dt_util.as_local(interval_time)
                        # 15min interval
                        if interval_time <= now < interval_time + timedelta(minutes=15):
                            is_in_charging_interval = True
                            _LOGGER.info(
                                f"[State Check] IN CHARGING INTERVAL: {interval_str} "
                                f"(now={now.strftime('%H:%M')})"
                            )
                            break
                    except (ValueError, TypeError) as e:
                        _LOGGER.warning(
                            f"[State Check] Invalid interval format: {interval_str} - {e}"
                        )
                        continue

            _LOGGER.debug(
                f"[State Check] is_in_charging_interval={is_in_charging_interval}"
            )

            # Získat aktuální SoC
            current_soc = self._get_current_soc()
            _LOGGER.debug(f"[State Check] current_soc={current_soc}%")

            # Zjistit ve kterém jsme stavu
            if now >= holding_start and now <= holding_end:
                # BALANCING fáze - ale pouze pokud jsme na ~100%!
                # OPRAVA: Snížit práh z 99.5% na 98% kvůli zaokrouhlení
                # Pokud je baterie na max capacity, je to holding i když SoC ukazuje 99%
                if current_soc >= 98.0:
                    self._current_state = "balancing"
                    _LOGGER.info(
                        f"[State] BALANCING - holding at {current_soc:.1f}% until {holding_end.strftime('%H:%M')}"
                    )
                    remaining = holding_end - now
                    hours = int(remaining.total_seconds() // 3600)
                    minutes = int((remaining.total_seconds() % 3600) // 60)
                    self._time_remaining = f"{hours:02d}:{minutes:02d}"
                else:
                    # V holding okně, ale ještě nejsme na ~100% → CHARGING
                    self._current_state = "charging"
                    _LOGGER.warning(
                        f"[State] In holding window but SoC only {current_soc}% - continuing CHARGING"
                    )
                    remaining = holding_end - now
                    hours = int(remaining.total_seconds() // 3600)
                    minutes = int((remaining.total_seconds() % 3600) // 60)
                    self._time_remaining = f"{hours:02d}:{minutes:02d}"

            elif is_in_charging_interval:
                # CHARGING fáze - nabíjení v levném intervalu
                self._current_state = "charging"
                _LOGGER.info(
                    f"[State] CHARGING - preparing for balancing at {holding_start.strftime('%H:%M')}"
                )
                remaining = holding_start - now
                hours = int(remaining.total_seconds() // 3600)
                minutes = int((remaining.total_seconds() % 3600) // 60)
                self._time_remaining = f"{hours:02d}:{minutes:02d}"

            elif now < holding_start:
                # PLANNED - čeká na start (nebo mezi charging intervaly)
                self._current_state = "planned"
                _LOGGER.debug(f"[State] PLANNED - waiting for next event")
                # Najít nejbližší charging interval nebo holding_start
                next_event = holding_start
                if charging_intervals:
                    for interval_str in sorted(charging_intervals):
                        try:
                            interval_time = datetime.fromisoformat(interval_str)
                            if interval_time.tzinfo is None:
                                interval_time = dt_util.as_local(interval_time)
                            if interval_time > now:
                                next_event = interval_time
                                break
                        except (ValueError, TypeError):
                            continue

                remaining = next_event - now
                hours = int(remaining.total_seconds() // 3600)
                minutes = int((remaining.total_seconds() % 3600) // 60)
                self._time_remaining = f"{hours:02d}:{minutes:02d}"

            else:
                # Po skončení - pokud je to méně než 1h, zobrazit completed
                time_since_end = now - holding_end
                if time_since_end.total_seconds() < 3600:  # Méně než 1 hodina
                    self._current_state = "completed"
                    minutes_ago = int(time_since_end.total_seconds() // 60)
                    self._time_remaining = f"před {minutes_ago} min"
                else:
                    # Více než hodinu po skončení - smazat planned window
                    self._current_state = "standby"
                    self._time_remaining = None
                    self._planned_window = None  # Vyčistit starý plán
                    _LOGGER.debug(
                        f"Clearing old planned window (ended at {holding_end.isoformat()})"
                    )

        except (ValueError, TypeError, KeyError) as e:
            _LOGGER.warning(f"Failed to parse balancing window times: {e}")
            self._current_state = "standby"
            self._time_remaining = None

    def _get_current_soc(self) -> float:
        """Získat aktuální SoC baterie v %."""
        if not self._hass:
            return 50.0  # Default

        # Správný sensor je batt_bat_c (battery capacity percentage)
        soc_entity_id = f"sensor.oig_{self._box_id}_batt_bat_c"
        soc_state = self._hass.states.get(soc_entity_id)

        if soc_state and soc_state.state not in ("unknown", "unavailable"):
            try:
                return float(soc_state.state)
            except ValueError:
                pass

        return 50.0  # Default fallback

    # ============================================================================
    # 7d Balancing Decision Profiling Methods
    # ============================================================================

    async def _get_balancing_history_7d(self) -> Optional[Dict[str, Any]]:
        """
        Načíst 7 dní (168h) balancing historie.

        Returns:
            Dict s hourly data: spot_price, solar_forecast, battery_soc, balancing_active
        """
        if not self._hass:
            _LOGGER.warning("Cannot get balancing history - no hass instance")
            return None

        try:
            end_time = dt_util.now()
            start_time = end_time - timedelta(hours=BALANCING_PROFILE_HOURS)

            # Připravit hourly data struktu
            hourly_data = []

            # Pro každou hodinu v 168h okně
            for hour_offset in range(BALANCING_PROFILE_HOURS):
                hour_start = start_time + timedelta(hours=hour_offset)
                hour_end = hour_start + timedelta(hours=1)

                # 1. Spot price - načíst z spot price senzoru
                spot_price = await self._get_spot_price_for_hour(hour_start, hour_end)

                # 2. Solar forecast - načíst z solar forecast senzoru
                solar_forecast = await self._get_solar_forecast_for_hour(
                    hour_start, hour_end
                )

                # 3. Battery SOC - průměr SOC v této hodině
                battery_soc = await self._get_battery_soc_for_hour(hour_start, hour_end)

                # 4. Balancing active - byl balancing aktivní?
                balancing_active = await self._was_balancing_active(
                    hour_start, hour_end
                )

                hourly_data.append(
                    {
                        "timestamp": hour_start.isoformat(),
                        "spot_price_czk": spot_price,
                        "solar_forecast_kwh": solar_forecast,
                        "battery_soc": battery_soc,
                        "balancing_active": balancing_active,
                    }
                )

            _LOGGER.info(f"📊 Loaded 7d balancing history: {len(hourly_data)} hours")

            return {
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "hours": BALANCING_PROFILE_HOURS,
                "hourly_data": hourly_data,
            }

        except Exception as e:
            _LOGGER.error(f"Failed to get balancing history: {e}", exc_info=True)
            return None

    async def _get_spot_price_for_hour(
        self, hour_start: datetime, hour_end: datetime
    ) -> float:
        """Načíst spot price pro danou hodinu."""
        try:
            # Spot price sensor entity ID
            entity_id = "sensor.spot_cena_czk"

            # Načíst historical data
            history_data = await self._hass.async_add_executor_job(
                history.state_changes_during_period,
                self._hass,
                hour_start,
                hour_end,
                entity_id,
            )

            if history_data and entity_id in history_data:
                states = history_data[entity_id]
                if states:
                    # Průměr hodnot v této hodině
                    values = []
                    for s in states:
                        try:
                            values.append(float(s.state))
                        except (ValueError, TypeError):
                            continue

                    if values:
                        return float(np.mean(values))

        except Exception as e:
            _LOGGER.debug(f"Could not get spot price for hour: {e}")

        return 0.0  # Default fallback

    async def _get_solar_forecast_for_hour(
        self, hour_start: datetime, hour_end: datetime
    ) -> float:
        """Načíst solar forecast pro danou hodinu."""
        try:
            # Solar forecast sensor - použít battery forecast který má solar data
            entity_id = f"sensor.oig_{self._box_id}_battery_forecast"

            # Načíst state
            state_obj = self._hass.states.get(entity_id)
            if state_obj and hasattr(state_obj, "attributes"):
                # Forecast data jsou v atributech nebo přes API
                # Pro zjednodušení použijeme historical actual solar production
                entity_id = f"sensor.oig_{self._box_id}_actual_aco_p"

                history_data = await self._hass.async_add_executor_job(
                    history.state_changes_during_period,
                    self._hass,
                    hour_start,
                    hour_end,
                    entity_id,
                )

                if history_data and entity_id in history_data:
                    states = history_data[entity_id]
                    if states:
                        values = []
                        for s in states:
                            try:
                                val = float(s.state)
                                # Pokud je záporné (výroba), převést na kladné
                                if val < 0:
                                    val = abs(val)
                                values.append(val)
                            except (ValueError, TypeError):
                                continue

                        if values:
                            return float(np.mean(values))

        except Exception as e:
            _LOGGER.debug(f"Could not get solar forecast for hour: {e}")

        return 0.0  # Default fallback

    async def _get_battery_soc_for_hour(
        self, hour_start: datetime, hour_end: datetime
    ) -> float:
        """Načíst battery SOC pro danou hodinu."""
        try:
            entity_id = f"sensor.oig_{self._box_id}_battery_soc"

            history_data = await self._hass.async_add_executor_job(
                history.state_changes_during_period,
                self._hass,
                hour_start,
                hour_end,
                entity_id,
            )

            if history_data and entity_id in history_data:
                states = history_data[entity_id]
                if states:
                    values = []
                    for s in states:
                        try:
                            values.append(float(s.state))
                        except (ValueError, TypeError):
                            continue

                    if values:
                        return float(np.mean(values))

        except Exception as e:
            _LOGGER.debug(f"Could not get battery SOC for hour: {e}")

        return 50.0  # Default fallback

    async def _was_balancing_active(
        self, hour_start: datetime, hour_end: datetime
    ) -> bool:
        """Zkontrolovat zda byl balancing aktivní v dané hodině."""
        try:
            # Kontrola balancing status - pokud byl status "balancing" nebo "charging"
            entity_id = f"sensor.oig_{self._box_id}_battery_balancing"

            history_data = await self._hass.async_add_executor_job(
                history.state_changes_during_period,
                self._hass,
                hour_start,
                hour_end,
                entity_id,
            )

            if history_data and entity_id in history_data:
                states = history_data[entity_id]
                for s in states:
                    if s.state in ["balancing", "charging", "planned"]:
                        return True

        except Exception as e:
            _LOGGER.debug(f"Could not check balancing status for hour: {e}")

        return False

    async def _create_balancing_profile(self) -> bool:
        """
        Vytvořit nový 7d balancing profil a uložit do recorderu.

        Returns:
            True pokud úspěch, False při chybě
        """
        if not self._hass:
            return False

        try:
            # Načíst 7d data
            balancing_data = await self._get_balancing_history_7d()

            if not balancing_data or not balancing_data.get("hourly_data"):
                _LOGGER.warning("Cannot create balancing profile - no data")
                return False

            hourly_data = balancing_data["hourly_data"]

            # Spočítat statistiky
            spot_prices = [h["spot_price_czk"] for h in hourly_data]
            solar_forecasts = [h["solar_forecast_kwh"] for h in hourly_data]
            soc_values = [h["battery_soc"] for h in hourly_data]
            balancing_hours = sum(1 for h in hourly_data if h["balancing_active"])

            # Připravit event data
            now = dt_util.now()
            profile_data = {
                "box_id": self._box_id,
                "created_at": now.isoformat(),
                "profile_hours": BALANCING_PROFILE_HOURS,
                "start_time": balancing_data["start_time"],
                "end_time": balancing_data["end_time"],
                "hourly_data": hourly_data,
                # Statistiky
                "avg_spot_price": float(np.mean(spot_prices)),
                "max_spot_price": float(np.max(spot_prices)),
                "min_spot_price": float(np.min(spot_prices)),
                "total_solar": float(np.sum(solar_forecasts)),
                "avg_soc": float(np.mean(soc_values)),
                "balancing_hours": balancing_hours,
                "balancing_percentage": (balancing_hours / BALANCING_PROFILE_HOURS)
                * 100,
            }

            # Fire event do recorderu
            self._hass.bus.async_fire(
                BALANCING_PROFILE_EVENT_TYPE,
                profile_data,
            )

            _LOGGER.info(
                f"📊 Created 7d balancing profile: "
                f"balancing_hours={balancing_hours}, "
                f"avg_spot_price={profile_data['avg_spot_price']:.2f} CZK, "
                f"total_solar={profile_data['total_solar']:.1f} kWh"
            )

            return True

        except Exception as e:
            _LOGGER.error(f"Failed to create balancing profile: {e}", exc_info=True)
            return False

    async def _load_balancing_profiles(
        self, max_profiles: int = MAX_BALANCING_PROFILES
    ) -> List[Dict[str, Any]]:
        """
        Načíst historické balancing profiles z recorderu.

        Args:
            max_profiles: Maximum načtených profilů (default 52 = rok)

        Returns:
            List profilů seřazených od nejnovějšího
        """
        if not self._hass:
            _LOGGER.warning("Cannot load balancing profiles - no hass instance")
            return []

        try:
            recorder = get_instance(self._hass)
            if not recorder or not recorder.engine:
                _LOGGER.warning("Recorder not available")
                return []

            from sqlalchemy import text

            # Načíst max_profiles nejnovějších
            with recorder.engine.connect() as conn:
                query = text(
                    """
                    SELECT event_data
                    FROM events
                    WHERE event_type = :event_type
                    AND JSON_EXTRACT(event_data, '$.box_id') = :box_id
                    ORDER BY time_fired DESC
                    LIMIT :limit
                """
                )

                result = conn.execute(
                    query,
                    {
                        "event_type": BALANCING_PROFILE_EVENT_TYPE,
                        "box_id": self._box_id,
                        "limit": max_profiles,
                    },
                )
                profiles = [json.loads(row[0]) for row in result]

            _LOGGER.debug(f"Loaded {len(profiles)} balancing profiles from recorder")
            return profiles

        except Exception as e:
            _LOGGER.error(f"Failed to load balancing profiles: {e}", exc_info=True)
            return []

    async def _calculate_balancing_similarity(
        self, current_48h: List[Dict[str, Any]], profile_48h: List[Dict[str, Any]]
    ) -> float:
        """
        Spočítat similarity score mezi aktuálními 48h a prvními 48h profilu.

        Scoring:
        - 40% spot price correlation
        - 30% solar forecast correlation
        - 30% balancing success pattern match

        Args:
            current_48h: Aktuální 48h dat
            profile_48h: První 48h historického profilu

        Returns:
            Similarity score 0.0 - 1.0 (1.0 = perfektní match)
        """
        if (
            len(current_48h) != BALANCING_MATCH_HOURS
            or len(profile_48h) != BALANCING_MATCH_HOURS
        ):
            _LOGGER.warning(
                f"Invalid data length for similarity: {len(current_48h)}, {len(profile_48h)}"
            )
            return 0.0

        try:
            # Extrahovat arrays pro NumPy
            current_spot = np.array([h["spot_price_czk"] for h in current_48h])
            profile_spot = np.array([h["spot_price_czk"] for h in profile_48h])

            current_solar = np.array([h["solar_forecast_kwh"] for h in current_48h])
            profile_solar = np.array([h["solar_forecast_kwh"] for h in profile_48h])

            current_balancing = np.array(
                [1 if h["balancing_active"] else 0 for h in current_48h]
            )
            profile_balancing = np.array(
                [1 if h["balancing_active"] else 0 for h in profile_48h]
            )

            # 1. Spot price correlation (40%)
            spot_correlation = np.corrcoef(current_spot, profile_spot)[0, 1]
            if np.isnan(spot_correlation):
                spot_correlation = 0.0
            # Normalize to 0-1 (correlation může být -1 až 1, chceme jen pozitivní)
            spot_score = max(0.0, spot_correlation)

            # 2. Solar forecast correlation (30%)
            solar_correlation = np.corrcoef(current_solar, profile_solar)[0, 1]
            if np.isnan(solar_correlation):
                solar_correlation = 0.0
            solar_score = max(0.0, solar_correlation)

            # 3. Balancing pattern match (30%)
            # Pokud v obou případech balancing byl/nebyl aktivní podobně, score je vyšší
            balancing_match = 1.0 - np.mean(
                np.abs(current_balancing - profile_balancing)
            )
            balancing_score = max(0.0, balancing_match)

            # Weighted sum
            similarity = (
                WEIGHT_SPOT_PRICE * spot_score
                + WEIGHT_SOLAR_FORECAST * solar_score
                + WEIGHT_BALANCING_SUCCESS * balancing_score
            )

            return float(similarity)

        except Exception as e:
            _LOGGER.error(
                f"Failed to calculate balancing similarity: {e}", exc_info=True
            )
            return 0.0

    async def _find_best_matching_balancing_pattern(
        self,
    ) -> Optional[Dict[str, Any]]:
        """
        Najít nejlepší matching 7d balancing profil pro aktuální situaci.

        Matching: Aktuální 48h vs. první 48h profilů
        Predikce: Posledních 120h matched profilu

        Returns:
            Dict s predikcí a match info, nebo None při chybě
        """
        if not self._hass:
            return None

        try:
            # 1. Načíst aktuální 48h dat
            current_data = await self._get_balancing_history_7d()

            if not current_data or not current_data.get("hourly_data"):
                _LOGGER.warning("Not enough current data for balancing matching")
                return None

            # Vezmi posledních 48h (nejnovější data)
            all_current_data = current_data["hourly_data"]
            current_48h = all_current_data[-BALANCING_MATCH_HOURS:]

            # 2. Načíst historické profily
            profiles = await self._load_balancing_profiles()

            if not profiles:
                _LOGGER.warning(
                    "No historical balancing profiles available for matching"
                )
                return None

            # 3. Najít best match
            best_match = None
            best_score = 0.0

            for profile in profiles:
                # Vezmi první 48h z profilu
                profile_data = profile.get("hourly_data", [])
                if len(profile_data) != BALANCING_PROFILE_HOURS:
                    continue

                profile_first_48h = profile_data[:BALANCING_MATCH_HOURS]

                # Spočítat similarity
                score = await self._calculate_balancing_similarity(
                    current_48h, profile_first_48h
                )

                if score > best_score:
                    best_score = score
                    best_match = profile

            if not best_match:
                _LOGGER.warning("No matching balancing profile found")
                return None

            # 4. Extrahovat predicted 120h (poslední 120h z matched profilu)
            matched_data = best_match.get("hourly_data", [])
            predicted_120h = matched_data[-BALANCING_PREDICT_HOURS:]

            # Spočítat predikované metriky
            predicted_balancing_hours = sum(
                1 for h in predicted_120h if h["balancing_active"]
            )
            predicted_avg_spot_price = float(
                np.mean([h["spot_price_czk"] for h in predicted_120h])
            )

            result = {
                "matched_profile_created": best_match.get("created_at"),
                "similarity_score": best_score,
                "predicted_120h_data": predicted_120h,
                "predicted_balancing_hours": predicted_balancing_hours,
                "predicted_balancing_percentage": (
                    predicted_balancing_hours / BALANCING_PREDICT_HOURS
                )
                * 100,
                "predicted_avg_spot_price": predicted_avg_spot_price,
                "matched_profile_balancing_hours": best_match.get("balancing_hours"),
            }

            _LOGGER.info(
                f"🎯 Best matching balancing profile: score={best_score:.3f}, "
                f"predicted_balancing_hours={predicted_balancing_hours}/120"
            )

            return result

        except Exception as e:
            _LOGGER.error(
                f"Failed to find matching balancing pattern: {e}", exc_info=True
            )
            return None

    @property
    def native_value(self) -> str:
        """Return the state of the sensor."""
        return self._status

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return the state attributes."""
        attrs: Dict[str, Any] = {
            "days_since_last": self._days_since_last,
            "last_balancing": (
                self._last_balancing.isoformat() if self._last_balancing else None
            ),
            "last_calculation": (
                self._last_calculation.isoformat() if self._last_calculation else None
            ),
            "current_state": self._current_state,
            "time_remaining": self._time_remaining,
            "planning_status": self._planning_status,  # idle/preparing/calculating/ok/error
            "planning_error": self._planning_error,  # Chyba při výpočtu pokud nastala
            "balancing_profiling_status": self._balancing_profiling_status,  # idle/creating/ok/error
            "balancing_profiling_error": self._balancing_profiling_error,  # Chyba při profiling pokud nastala
            "last_balancing_profile_created": (
                self._last_balancing_profile_created.isoformat()
                if self._last_balancing_profile_created
                else None
            ),
        }

        # Config from config_entry
        config = self._get_balancing_config()
        attrs["config"] = config

        # Planned window if exists
        if self._planned_window:
            attrs["planned"] = self._planned_window

        return attrs

    def _get_balancing_config(self) -> Dict[str, Any]:
        """Get balancing configuration from config_entry."""
        # FIX: Read from options, not data
        # Options are user-configurable, data is initial setup
        battery_config = self._config_entry.options

        return {
            "enabled": battery_config.get("balancing_enabled", True),
            "interval_days": battery_config.get("balancing_interval_days", 7),
            "hold_hours": battery_config.get("balancing_hold_hours", 3),
            "opportunistic_threshold": battery_config.get(
                "balancing_opportunistic_threshold", 1.1
            ),
            "economic_threshold": battery_config.get(
                "balancing_economic_threshold", 2.5
            ),
        }

    @property
    def device_info(self) -> Dict[str, Any]:
        """Return device info."""
        return self._device_info
