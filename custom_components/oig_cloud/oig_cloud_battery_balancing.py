"""Sensor pro správu vyrovnání článků baterie (battery cell balancing)."""

import logging
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta

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

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # Načíst uložený stav z restore
        # TODO: Restore state from previous session

        # Spustit počáteční detekci z historie
        await self._detect_last_balancing_from_history()

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA."""
        await super().async_will_remove_from_hass()

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

            # 3. Planning logic - najít optimální okno (nebo držet existující)
            self._plan_balancing_window()

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

    def _plan_balancing_window(self) -> None:
        """
        Planning logika pro hledání optimálního okna - REFACTORED.

        Nyní používá unified charging planner z battery forecast senzoru.
        Metoda jen určuje parametry (target, deadline, mode) a volá plan_charging_to_target().

        Prioritní úrovně:
        - OPPORTUNISTIC (0-4 dní): Nepovinné, jen pokud velmi levné
        - ECONOMIC (5-7 dní): Ekonomický režim, najdi levné intervaly
        - FORCED (8+ dní): Forced režim, nabij i přes drahé ceny
        """
        config = self._get_balancing_config()

        if not config["enabled"]:
            self._planned_window = None
            # Zrušit aktivní plán pokud existuje
            self._cancel_active_plan()
            return

        # Pokud už máme naplánované okno, zkontrolovat jestli je stále aktivní
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
                    self._planned_window = None
                    # Zrušit aktivní plán
                    self._cancel_active_plan()
            except (ValueError, TypeError, KeyError) as e:
                _LOGGER.warning(f"Invalid planned_window format: {e}, clearing")
                self._planned_window = None
                self._cancel_active_plan()

        days = self._days_since_last

        # Určit mode a deadline podle dnů od posledního balancování
        now = dt_util.now()
        hold_hours = config["hold_hours"]

        # Opportunistic: dny 0-4 - nepovinné, jen pokud super levné
        if days < config["interval_days"] - 2:  # Dny 0-4
            _LOGGER.debug(f"Day {days} - too early for balancing, skipping")
            return

        # Economic: dny 5-7 - hledej levné intervaly
        elif days < config["interval_days"] + 1:  # Dny 5-7
            mode = "economic"
            # Deadline: konec 7. dne
            days_until_deadline = config["interval_days"] - days
            deadline = now + timedelta(days=days_until_deadline, hours=23, minutes=59)
            _LOGGER.info(
                f"Day {days} - ECONOMIC mode, deadline {deadline.strftime('%Y-%m-%d %H:%M')}"
            )

        # Forced: den 8+ - MUSÍ nabít i když drahé
        else:  # Den 8+
            mode = "forced"
            # Deadline: co nejdříve (24h)
            deadline = now + timedelta(hours=24)
            _LOGGER.warning(
                f"Day {days} - FORCED mode (overdue), deadline {deadline.strftime('%Y-%m-%d %H:%M')}"
            )

        # Získat forecast sensor - UNIFIED PLANNER
        forecast_sensor = self._get_forecast_sensor()
        if not forecast_sensor:
            _LOGGER.error("Cannot get forecast sensor for unified planner")
            return

        # Zavolat unified planner
        plan_result = forecast_sensor.plan_charging_to_target(
            target_soc_percent=100.0,
            deadline=deadline,
            holding_duration_hours=hold_hours,
            mode=mode,
            requester="balancing",
        )

        # Vyhodnotit výsledek
        if not plan_result.get("feasible"):
            status = plan_result.get("status")

            if status == "conflict":
                conflict = plan_result.get("conflict", {})
                _LOGGER.warning(
                    f"Balancing plan CONFLICT with {conflict.get('active_plan_requester')}, "
                    f"predicted SOC at deadline: {conflict.get('predicted_soc_at_deadline', 0):.1f}%"
                )
                # V economic mode: akceptuj konflikt, forecast přednost
                # V forced mode: warning ale neodstranuj aktivní plán
                return

            elif status == "partial":
                achieved = plan_result.get("achieved_soc_percent", 0)
                _LOGGER.warning(
                    f"Balancing plan PARTIAL: can only achieve {achieved:.1f}% (target 100%)"
                )
                # V economic mode: odmítnout
                if mode == "economic":
                    _LOGGER.info("Economic mode - rejecting partial plan")
                    return
                # V forced mode: přijmout i partial
                else:
                    _LOGGER.warning("Forced mode - accepting partial plan")

            else:
                _LOGGER.error(f"Balancing plan failed: {status}")
                return

        # ÚSPĚCH - aplikovat plán
        if forecast_sensor.apply_charging_plan(plan_result):
            # Konvertovat do našeho formátu _planned_window
            charging_plan = plan_result["charging_plan"]

            self._planned_window = {
                "holding_start": charging_plan["holding_start"],
                "holding_end": charging_plan["holding_end"],
                "avg_price_czk": (
                    round(
                        charging_plan["total_cost_czk"]
                        / charging_plan["total_energy_kwh"],
                        2,
                    )
                    if charging_plan["total_energy_kwh"] > 0
                    else 0.0
                ),
                "reason": mode,
                "charging_intervals": [
                    iv["timestamp"] for iv in charging_plan["charging_intervals"]
                ],
                "charging_avg_price_czk": (
                    round(
                        charging_plan["charging_cost_czk"]
                        / charging_plan["total_energy_kwh"],
                        2,
                    )
                    if charging_plan["total_energy_kwh"] > 0
                    else 0.0
                ),
            }

            _LOGGER.info(
                f"Balancing plan APPLIED: {mode} mode, "
                f"holding {charging_plan['holding_start']} - {charging_plan['holding_end']}, "
                f"{len(charging_plan['charging_intervals'])} charging intervals, "
                f"total cost {charging_plan['total_cost_czk']:.2f} Kč"
            )
        else:
            _LOGGER.error("Failed to apply balancing plan to forecast")

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
                # BALANCING fáze - ale pouze pokud jsme na 100%!
                if current_soc >= 99.5:
                    self._current_state = "balancing"
                    _LOGGER.info(
                        f"[State] BALANCING - holding at 100% until {holding_end.strftime('%H:%M')}"
                    )
                    remaining = holding_end - now
                    hours = int(remaining.total_seconds() // 3600)
                    minutes = int((remaining.total_seconds() % 3600) // 60)
                    self._time_remaining = f"{hours:02d}:{minutes:02d}"
                else:
                    # V holding okně, ale ještě nejsme na 100% → CHARGING
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

        soc_entity_id = f"sensor.oig_{self._box_id}_battery_soc"
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
