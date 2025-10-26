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

            # 4. Přepočítat charging intervals pro aktivní window
            # (zahrnuje aktuální probíhající interval)
            # ALE: pouze pokud jsme PŘED balancing fází!
            if self._planned_window:
                now = dt_util.now()
                holding_start = datetime.fromisoformat(
                    self._planned_window["holding_start"]
                )
                if holding_start.tzinfo is None:
                    holding_start = dt_util.as_local(holding_start)

                # Pouze přepočítat pokud ještě NEprobíhá balancing
                if now < holding_start:
                    spot_prices = self._get_spot_prices()
                    if spot_prices:
                        self._planned_window = self._add_charging_intervals(
                            self._planned_window, spot_prices
                        )
                else:
                    _LOGGER.debug(
                        f"Balancing phase active, skipping charging intervals recalculation"
                    )

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
        Planning logika pro hledání optimálního okna.

        Prioritní úrovně:
        - OPPORTUNISTIC (0-∞ dní): Cena < opportunistic_threshold
        - ECONOMIC (5-7 dní): Cena < economic_threshold
        - CRITICAL (8 dní): Nejlepší dostupné okno
        - FORCED (9+ dní): Okamžitě v nejbližším okně

        IMPORTANT: Pokud už existuje aktivní planned_window, NEMĚNIT ho!
        Window se plánuje JEDNOU a drží se ho až do konce nebo zrušení.
        """
        config = self._get_balancing_config()

        if not config["enabled"]:
            self._planned_window = None
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
            except (ValueError, TypeError, KeyError) as e:
                _LOGGER.warning(f"Invalid planned_window format: {e}, clearing")
                self._planned_window = None

        days = self._days_since_last

        # Získat spot prices z coordinator
        spot_prices = self._get_spot_prices()
        if not spot_prices:
            _LOGGER.debug("No spot prices available for planning")
            return  # NEMAZAT existující window

        # Hledat optimální okno podle priority
        if days >= config["interval_days"] + 1:  # Den 8+
            # CRITICAL nebo FORCED - najít nejlepší dostupné okno
            window = self._find_best_window(spot_prices, config, force=True)
        elif days >= config["interval_days"] - 1:  # Den 6-7 (den před i v den deadline)
            # ECONOMIC - hledat přijatelné okno, NEBO force na den 7
            # OPRAVA: Na den 7 (interval_days) garantovat okno pomocí force
            if days >= config["interval_days"]:
                _LOGGER.info(f"Day {days} (deadline day) - forcing best window")
                window = self._find_best_window(spot_prices, config, force=True)
            else:
                # Den 6 - zkusit economic, pokud selže, force backup
                window = self._find_economic_window(spot_prices, config)
                if not window:
                    _LOGGER.warning(
                        f"Day {days} - no economic window found, forcing best available"
                    )
                    window = self._find_best_window(spot_prices, config, force=True)
        else:
            # OPPORTUNISTIC - hledat skvělou cenu
            window = self._find_opportunistic_window(spot_prices, config)

        # Pokud máme window, vypočítat charging intervaly (nejlevnější)
        if window:
            window = self._add_charging_intervals(window, spot_prices)
            _LOGGER.info(
                f"NEW planned window: {window['holding_start']} - {window['holding_end']}, "
                f"charging intervals: {len(window.get('charging_intervals', []))}"
            )

        self._planned_window = window

    def _get_spot_prices(self) -> Dict[str, float]:
        """Získat spot prices ze spot_price_current_15min senzoru."""
        try:
            if not self._hass:
                return {}

            # Číst ze spot price senzoru (stejně jako forecast)
            sensor_id = f"sensor.oig_{self._box_id}_spot_price_current_15min"
            state = self._hass.states.get(sensor_id)

            if not state or state.state in ("unavailable", "unknown", None):
                _LOGGER.debug(f"Spot price sensor {sensor_id} not available")
                return {}

            if not state.attributes:
                _LOGGER.debug(f"Spot price sensor {sensor_id} has no attributes")
                return {}

            # Format: [{timestamp, price, ...}, ...]
            prices_list = state.attributes.get("prices", [])

            if not prices_list:
                _LOGGER.debug("No prices in spot price sensor")
                return {}

            # Převést na dict {timestamp: price}
            prices_dict: Dict[str, float] = {}
            for price_point in prices_list:
                timestamp = price_point.get("timestamp")
                price = price_point.get("price")

                if timestamp and price is not None:
                    prices_dict[timestamp] = float(price)

            _LOGGER.debug(
                f"Loaded {len(prices_dict)} spot prices for balancing planning"
            )
            return prices_dict

        except Exception as e:
            _LOGGER.error(f"Error getting spot prices: {e}", exc_info=True)
            return {}

    def _get_forecast_soc_at_time(self, timestamp_str: str) -> float:
        """Získat predikovaný SOC v daném čase z battery forecast senzoru."""
        try:
            from datetime import datetime

            if not self._hass:
                return 50.0

            forecast_sensor_id = f"sensor.oig_{self._box_id}_battery_forecast"
            forecast_state = self._hass.states.get(forecast_sensor_id)

            if not forecast_state or not forecast_state.attributes:
                _LOGGER.debug(
                    f"Battery forecast sensor {forecast_sensor_id} not available"
                )
                return 50.0

            timeline = forecast_state.attributes.get("timeline_data", [])
            if not timeline:
                return 50.0

            # Najít příslušný bod v timeline
            target_time = datetime.fromisoformat(timestamp_str)
            max_capacity = 12.29  # kWh

            for point in timeline:
                point_time = datetime.fromisoformat(point["timestamp"])
                if point_time == target_time:
                    capacity_kwh = point.get("battery_capacity_kwh", 0)
                    return (capacity_kwh / max_capacity) * 100.0

            # Pokud nenajdeme přesný čas, vrátíme aktuální SOC
            return self._get_current_soc()

        except Exception as e:
            _LOGGER.warning(f"Failed to get forecast SOC: {e}")
            return self._get_current_soc()

    def _check_window_feasibility(
        self, window_start: str, prices: Dict[str, float], force: bool = False
    ) -> tuple[bool, int]:
        """
        Ověřit, jestli je možné nabít baterii do začátku holding okna.

        Returns:
            (is_feasible, intervals_needed)
        """
        try:
            from datetime import datetime
            from homeassistant.util import dt as dt_util

            now = dt_util.now()
            holding_start_dt = datetime.fromisoformat(window_start)
            # Ensure timezone aware
            if holding_start_dt.tzinfo is None:
                holding_start_dt = dt_util.as_local(holding_start_dt)

            # Kolik bude SOC na začátku holding okna (podle forecastu BEZ balancování)?
            forecast_soc_percent = self._get_forecast_soc_at_time(window_start)

            # Kolik energie potřebujeme dobít?
            max_capacity = 12.29  # kWh
            forecast_soc_kwh = (forecast_soc_percent / 100.0) * max_capacity
            energy_needed = max(0, max_capacity - forecast_soc_kwh)

            # Kolik intervalů potřebujeme?
            charging_power_kwh_per_15min = 0.75
            intervals_needed = int(energy_needed / charging_power_kwh_per_15min) + 1

            # Kolik intervalů máme k dispozici?
            available_intervals = 0
            _LOGGER.debug(
                f"Checking available intervals: NOW={now}, holding_start={holding_start_dt}"
            )
            for timestamp_str in prices.keys():
                try:
                    timestamp = datetime.fromisoformat(timestamp_str)
                    # Ensure timezone aware
                    if timestamp.tzinfo is None:
                        timestamp = dt_util.as_local(timestamp)
                    if now <= timestamp < holding_start_dt:
                        available_intervals += 1
                        if available_intervals <= 3:  # Log first 3 matches
                            _LOGGER.debug(f"  ✓ Available: {timestamp_str}")
                            _LOGGER.debug(f"  ✓ Available: {timestamp_str}")
                except (ValueError, TypeError) as e:
                    _LOGGER.debug(f"  ✗ Parse error for {timestamp_str}: {e}")
                    continue

            _LOGGER.debug(f"Total available intervals: {available_intervals}")

            is_feasible = available_intervals >= intervals_needed

            _LOGGER.info(
                f"Feasibility check for {window_start}: "
                f"forecast_soc={forecast_soc_percent:.1f}%, "
                f"need {intervals_needed} intervals, "
                f"have {available_intervals} available → "
                f"{'✅ FEASIBLE' if is_feasible else '❌ NOT FEASIBLE'}"
            )

            # Pokud force (8. den), akceptuj i když není proveditelné
            if force and not is_feasible:
                _LOGGER.warning(
                    f"Window not feasible but FORCING due to critical balancing need"
                )
                return True, intervals_needed

            return is_feasible, intervals_needed

        except Exception as e:
            _LOGGER.error(f"Error checking window feasibility: {e}", exc_info=True)
            return False, 0

    def _find_opportunistic_window(
        self, prices: Dict[str, float], config: Dict[str, Any], force: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Hledat opportunistic okno - extrémně levná cena.

        NOVÁ LOGIKA:
        1. Najde VŠECHNY 3h holding window kandidáty pod threshold
        2. Seřadí je podle ceny (nejlevnější první)
        3. Pro každého kandidáta ověří feasibility (dá se dobít na 100%?)
        4. Vrátí první feasible kandidát
        """
        threshold = config["opportunistic_threshold"]
        hold_hours = config["hold_hours"]
        sorted_times = sorted(prices.keys())

        # 1. Najít VŠECHNY kandidáty pod threshold
        candidates = []

        for i in range(len(sorted_times) - hold_hours * 4):
            window_prices = []
            window_start = sorted_times[i]
            window_end_idx = i + hold_hours * 4

            for j in range(i, window_end_idx):
                window_prices.append(prices[sorted_times[j]])

            avg_price = sum(window_prices) / len(window_prices)

            if avg_price < threshold:
                from datetime import datetime, timedelta

                window_end_time = datetime.fromisoformat(
                    sorted_times[window_end_idx - 1]
                ) + timedelta(minutes=15)

                candidates.append(
                    {
                        "holding_start": window_start,
                        "holding_end": window_end_time.isoformat(),
                        "avg_price_czk": round(avg_price, 2),
                        "reason": "opportunistic",
                    }
                )

        if not candidates:
            _LOGGER.debug(
                f"No opportunistic windows found (threshold={threshold} Kč/kWh)"
            )
            return None

        # 2. Seřadit podle ceny (nejlevnější první)
        candidates.sort(key=lambda x: x["avg_price_czk"])

        _LOGGER.info(
            f"Found {len(candidates)} opportunistic candidates, testing feasibility..."
        )

        # 3. Testovat feasibility pro každého kandidáta (od nejlevnějšího)
        for idx, candidate in enumerate(candidates):
            is_feasible, intervals_needed = self._check_window_feasibility(
                candidate["holding_start"], prices, force
            )

            if is_feasible:
                _LOGGER.info(
                    f"✅ Selected candidate #{idx+1}/{len(candidates)}: "
                    f"{candidate['holding_start']} @ {candidate['avg_price_czk']} Kč/kWh"
                )
                return candidate
            else:
                _LOGGER.debug(
                    f"❌ Candidate #{idx+1} not feasible: {candidate['holding_start']}"
                )

        _LOGGER.warning(
            f"No feasible opportunistic window found (tested {len(candidates)} candidates)"
        )
        return None

    def _find_economic_window(
        self, prices: Dict[str, float], config: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Hledat economic okno - přijatelná cena."""
        threshold = config["economic_threshold"]
        # Použít stejnou logiku jako opportunistic, jen jiný práh
        config_copy = config.copy()
        config_copy["opportunistic_threshold"] = threshold
        window = self._find_opportunistic_window(prices, config_copy)

        if window:
            window["reason"] = "economic"

        return window

    def _find_best_window(
        self, prices: Dict[str, float], config: Dict[str, Any], force: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Najít nejlepší dostupné okno (critical/forced)."""
        # Najít nejlevnější okno bez ohledu na threshold
        config_copy = config.copy()
        config_copy["opportunistic_threshold"] = float("inf")  # Žádný limit
        window = self._find_opportunistic_window(prices, config_copy, force)

        if window:
            window["reason"] = "forced" if force else "critical"

        return window

    def _add_charging_intervals(
        self, window: Dict[str, Any], prices: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Přidat do window informace o charging intervalech.

        Najde nejlevnější intervaly mezi NOW a holding_end pro nabití na 100%.
        """
        try:
            from datetime import datetime
            from homeassistant.util import dt as dt_util

            holding_start = datetime.fromisoformat(window["holding_start"])
            holding_end = datetime.fromisoformat(window["holding_end"])
            # Make timezone aware
            if holding_start.tzinfo is None:
                holding_start = dt_util.as_local(holding_start)
            if holding_end.tzinfo is None:
                holding_end = dt_util.as_local(holding_end)
            now = dt_util.now()

            # Získat aktuální SoC
            current_soc = self._get_current_soc()
            max_capacity = 12.29  # kWh - TODO: získat z config

            # Spočítat potřebnou energii
            charging_power_kwh_per_15min = 0.75
            energy_needed = max(0, max_capacity - (current_soc / 100.0 * max_capacity))
            intervals_needed = int(energy_needed / charging_power_kwh_per_15min) + 1

            # Najít kandidáty (mezi NOW a holding_start - nabíjíme PŘED holding fází!)
            # DŮLEŽITÉ: Zahrnout i aktuální probíhající interval!
            candidates = []
            for timestamp_str, price in prices.items():
                try:
                    timestamp = datetime.fromisoformat(timestamp_str)
                    # Make timezone aware
                    if timestamp.tzinfo is None:
                        timestamp = dt_util.as_local(timestamp)

                    interval_end = timestamp + timedelta(minutes=15)

                    # Zahrnout interval pokud:
                    # 1. Ještě nezačal (timestamp >= now)
                    # 2. NEBO právě probíhá (now je mezi timestamp a timestamp+15min)
                    is_future = timestamp >= now
                    is_current = timestamp < now < interval_end

                    if (is_future or is_current) and timestamp < holding_start:
                        candidates.append({"timestamp": timestamp_str, "price": price})
                        if is_current:
                            _LOGGER.debug(
                                f"Including CURRENT interval: {timestamp_str}"
                            )
                except (ValueError, TypeError):
                    continue

            # Seřadit podle ceny (nejlevnější první)
            candidates.sort(key=lambda c: c["price"])

            # Vybrat N nejlevnějších
            cheapest = candidates[:intervals_needed]

            # Přidat do window
            window["charging_intervals"] = [c["timestamp"] for c in cheapest]
            window["charging_avg_price_czk"] = (
                round(sum(c["price"] for c in cheapest) / len(cheapest), 2)
                if cheapest
                else 0.0
            )

            _LOGGER.info(
                f"Balancing charging: {len(cheapest)} intervals, "
                f"avg price {window['charging_avg_price_czk']} Kč/kWh"
            )

        except Exception as e:
            _LOGGER.warning(f"Failed to calculate charging intervals: {e}")
            window["charging_intervals"] = []
            window["charging_avg_price_czk"] = 0.0

        return window

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
