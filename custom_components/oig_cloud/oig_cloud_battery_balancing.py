"""Sensor pro správu vyrovnání článků baterie (battery cell balancing)."""

import logging
import json
import numpy as np
import asyncio
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.util import dt as dt_util
from homeassistant.const import EntityCategory
from homeassistant.helpers.recorder import get_instance
from homeassistant.components.recorder import history

_LOGGER = logging.getLogger(__name__)


class OigCloudBatteryBalancingSensor(CoordinatorEntity, SensorEntity):
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

        # Profiling - recent history (5 posledních)
        self._recent_balancing_history: List[Dict[str, Any]] = []

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # Načíst uložený stav z restore
        # TODO: Restore state from previous session

        # Spustit počáteční detekci z historie
        await self._detect_last_balancing_from_history()

        # START: Hodinový planning loop jako background task
        # DŮLEŽITÉ: Musí běžet na pozadí, jinak blokuje HA startup!
        _LOGGER.info("Starting hourly balancing planning loop")
        self._planning_task = self.hass.async_create_background_task(
            self._planning_loop(), name="oig_cloud_balancing_planning_loop"
        )

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA - zrušit planning task."""
        if self._planning_task and not self._planning_task.done():
            self._planning_task.cancel()
        await super().async_will_remove_from_hass()

    async def _planning_loop(self) -> None:
        """
        Hodinový planning loop - validace a plánování balancování.

        Běží samostatně 1× za hodinu místo při každém coordinator update.
        """
        try:
            # Počkat na forecast data (max 5 min)
            await self._wait_for_forecast_ready(timeout=300)

            _LOGGER.info("✅ Planning loop started - will run every hour")

            # První běh okamžitě po startu
            first_run = True

            while True:
                try:
                    _LOGGER.info(
                        f"🔄 Planning loop iteration starting (first_run={first_run})"
                    )

                    # Validovat/naplánovat
                    await self._validate_and_plan()

                    # Update timestamp
                    self._last_planning_check = dt_util.now()
                    _LOGGER.info(
                        f"✅ Planning loop iteration completed at {self._last_planning_check}"
                    )

                except Exception as e:
                    _LOGGER.error(
                        f"❌ Planning loop iteration error: {e}", exc_info=True
                    )

                # První běh: čekat jen 60s, pak normálně 1h
                if first_run:
                    _LOGGER.info(
                        "⏱️ First run completed, waiting 60s before next iteration"
                    )
                    await asyncio.sleep(60)
                    first_run = False
                else:
                    _LOGGER.info("⏱️ Waiting 3600s (1 hour) until next iteration")
                    await asyncio.sleep(3600)

        except asyncio.CancelledError:
            _LOGGER.info("Planning loop cancelled")
        except Exception as e:
            _LOGGER.error(f"Planning loop fatal error: {e}", exc_info=True)

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

        # 2. ZKONTROLOVAT POTŘEBU PLÁNOVÁNÍ
        config = self._get_balancing_config()
        if not config["enabled"]:
            _LOGGER.debug("Balancing disabled in config")
            return

        days = self._days_since_last
        interval = config["interval_days"]  # Default 7 dní
        _LOGGER.info(
            f"📊 Balancing status: days_since_last={days}, interval={interval}"
        )

        # FORCED MODE ENFORCEMENT (den 8+):
        # Pokud days >= interval + 1 (den 8+), MUSÍME naplánovat balancování
        # i když není ideální okno. Forced mode = must run.
        is_forced = days >= interval + 1

        if days < interval - 2:  # < 5. den
            _LOGGER.debug(f"Day {days} - too early for planning")
            return

        # 3. SPUSTIT PLÁNOVÁNÍ
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
            self._cancel_active_plan()
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

                # Pokud okno ještě neskončilo + 1h grace period, DRŽET SE HO
                if now < holding_end + timedelta(hours=1):
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
                    self._cancel_active_plan()
            except (ValueError, TypeError, KeyError) as e:
                _LOGGER.warning(f"Invalid planned_window format: {e}, clearing")
                self._planned_window = None
                self._cancel_active_plan()

        # 2. EVALUATE NEED
        days = self._days_since_last
        now = dt_util.now()
        hold_hours = config["hold_hours"]

        # Too early?
        if days < config["interval_days"] - 2:  # < 5. den
            _LOGGER.debug(f"Day {days} - too early, skip")
            return

        # Determine mode & deadline
        if days < config["interval_days"] + 1:  # Dny 5-7
            mode = "economic"
            days_until_deadline = config["interval_days"] - days
            deadline = (now + timedelta(days=days_until_deadline)).replace(
                hour=23, minute=59, second=59, microsecond=0
            )
        else:  # Den 8+
            mode = "forced"
            days_overdue = days - config["interval_days"]
            deadline = (now + timedelta(days=2 - days_overdue)).replace(
                hour=23, minute=59, second=59, microsecond=0
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

        timeline = forecast_sensor.get_timeline_data()
        if not timeline:
            _LOGGER.error("No timeline data available")
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
                    "⚠️ FORCED MODE: No candidates found, will create emergency plan"
                )
                # TODO: Vytvořit emergency plan - nejlevnější 8h okno v následujících 24h
                # Pro teď jen logovat a return
                _LOGGER.error(
                    "Emergency planning not implemented yet - balancing skipped"
                )
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

                if total_cost < best_cost:
                    best_cost = total_cost
                    best_simulation = simulation
                    best_candidate = candidate
                    _LOGGER.debug(
                        f"  ✅ New best: {total_cost:.2f} Kč, achieves {achieved_soc:.1f}%"
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
        plan_result = {
            "feasible": best_simulation.get("feasible", False),
            "requester": "balancing",
            "mode": mode,
            "achieved_soc_percent": best_simulation.get("final_soc_percent", 100.0),
            "charging_plan": {
                "holding_start": best_candidate["holding_start"].isoformat(),
                "holding_end": best_candidate["holding_end"].isoformat(),
                "charging_intervals": best_simulation.get("charging_intervals", []),
            },
            "created_at": dt_util.now().isoformat(),
        }

        # Apply to forecast
        if not forecast_sensor.apply_charging_plan(plan_result):
            _LOGGER.error(f"Failed to apply plan to forecast")
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
        profiles = await self._load_balancing_profiles(weeks_back=52)
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

    def _cancel_active_plan(self) -> None:
        """Zruší aktivní plán v forecast senzoru (pokud patří balancingu)."""
        forecast_sensor = self._get_forecast_sensor()
        if forecast_sensor:
            forecast_sensor.cancel_charging_plan(requester="balancing")

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

    async def _load_balancing_profiles(
        self, weeks_back: int = 52
    ) -> List[Dict[str, Any]]:
        """
        Načíst balancing profily z posledních N týdnů.

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
        Najít kandidátní okna pro balancování s využitím historical patterns.

        Args:
            timeline: Forecast timeline data
            hold_hours: Kolik hodin držet na 100%
            deadline: Do kdy musí být plán dokončen
            mode: economic | forced

        Returns:
            List top 10 kandidátních oken seřazených podle score (nejlepší první)
        """
        # 1. Načíst historical patterns
        profiles = await self._load_balancing_profiles(weeks_back=52)
        patterns = self._analyze_balancing_patterns(profiles)

        preferred_hour = patterns.get("typical_charging_hour", 22)

        _LOGGER.info(
            f"📊 Pattern analysis: {patterns['total_profiles']} profiles, "
            f"typical hour={preferred_hour}:00, avg cost={patterns['avg_cost_overall']:.2f} Kč"
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
        battery_config = self._config_entry.data.get("battery", {})

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
