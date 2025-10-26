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

            # 3. Planning logic - najít optimální okno
            self._plan_balancing_window()

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
        """
        config = self._get_balancing_config()

        if not config["enabled"]:
            self._planned_window = None
            return

        days = self._days_since_last

        # Získat spot prices z coordinator
        spot_prices = self._get_spot_prices()
        if not spot_prices:
            _LOGGER.debug("No spot prices available for planning")
            self._planned_window = None
            return

        # Hledat optimální okno podle priority
        if days >= config["interval_days"] + 1:  # Den 8+
            # CRITICAL nebo FORCED - najít nejlepší dostupné okno
            window = self._find_best_window(spot_prices, config, force=True)
        elif days >= config["interval_days"] - 2:  # Den 5-7
            # ECONOMIC - hledat přijatelné okno
            window = self._find_economic_window(spot_prices, config)
        else:
            # OPPORTUNISTIC - hledat skvělou cenu
            window = self._find_opportunistic_window(spot_prices, config)

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

            _LOGGER.debug(f"Loaded {len(prices_dict)} spot prices for balancing planning")
            return prices_dict

        except Exception as e:
            _LOGGER.error(f"Error getting spot prices: {e}", exc_info=True)
            return {}

    def _find_opportunistic_window(
        self, prices: Dict[str, float], config: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Hledat opportunistic okno - extrémně levná cena."""
        threshold = config["opportunistic_threshold"]
        hold_hours = config["hold_hours"]

        # Najít 3h okno (holding) kde průměrná cena < threshold
        best_window = None
        best_avg_price = float("inf")

        sorted_times = sorted(prices.keys())

        for i in range(
            len(sorted_times) - hold_hours * 4
        ):  # 4 = 15min intervals per hour
            window_prices = []
            window_start = sorted_times[i]
            window_end_idx = i + hold_hours * 4

            for j in range(i, window_end_idx):
                window_prices.append(prices[sorted_times[j]])

            avg_price = sum(window_prices) / len(window_prices)

            if avg_price < threshold and avg_price < best_avg_price:
                best_avg_price = avg_price
                window_end = sorted_times[window_end_idx - 1]
                best_window = {
                    "holding_start": window_start,
                    "holding_end": window_end,
                    "avg_price_czk": round(avg_price, 2),
                    "reason": "opportunistic",
                    "total_cost_czk": None,  # TODO: Calculate
                }

        return best_window

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
        window = self._find_opportunistic_window(prices, config_copy)

        if window:
            window["reason"] = "forced" if force else "critical"

        return window

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
