"""Zjednodušený senzor pro predikci nabití baterie v průběhu dne."""

import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta

from homeassistant.components.sensor import (
    SensorEntity,
    SensorDeviceClass,
    SensorStateClass,
)
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry

_LOGGER = logging.getLogger(__name__)


class OigCloudBatteryForecastSensor(CoordinatorEntity, SensorEntity):
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

        # Získání inverter_sn - STEJNÁ LOGIKA jako OigCloudStatisticsSensor
        self._data_key = "unknown"

        # Priorita 1: Z coordinator.config_entry.data (standardní cesta)
        if hasattr(coordinator, "config_entry") and coordinator.config_entry:
            if (
                hasattr(coordinator.config_entry, "data")
                and coordinator.config_entry.data
            ):
                self._data_key = coordinator.config_entry.data.get(
                    "inverter_sn", "unknown"
                )

        # Priorita 2: Fallback - zkusit získat z coordinator.data
        if self._data_key == "unknown" and coordinator.data:
            first_device_key = list(coordinator.data.keys())[0]
            self._data_key = first_device_key

        if self._data_key == "unknown":
            _LOGGER.error("Cannot determine inverter_sn for battery forecast sensor")
            raise ValueError("Cannot determine inverter_sn for battery forecast sensor")

        # Nastavit atributy senzoru - STEJNĚ jako OigCloudStatisticsSensor
        self._box_id = self._data_key
        self._attr_unique_id = f"{self._data_key}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:battery-charging-60"
        self._attr_native_unit_of_measurement = "kWh"
        self._attr_device_class = SensorDeviceClass.ENERGY_STORAGE
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_entity_category = None

        # Načíst název ze sensor types
        from .sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or sensor_type

        # Timeline data cache
        self._timeline_data: List[Dict[str, Any]] = []
        self._last_update: Optional[datetime] = None

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA."""
        await super().async_added_to_hass()
        self._hass = self.hass

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA."""
        await super().async_will_remove_from_hass()

    @property
    def device_info(self) -> Optional[Dict[str, Any]]:
        """Return device info - Analytics Module."""
        return self._device_info

    @property
    def state(self) -> Optional[Union[float, str]]:
        """Stav senzoru - aktuální kapacita baterie."""
        if not self._timeline_data:
            return None

        # První bod v timeline je current capacity
        return round(self._timeline_data[0].get("battery_capacity_kwh", 0), 2)

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Dodatečné atributy s timeline daty."""
        return {
            "timeline_data": self._timeline_data,
            "calculation_time": (
                self._last_update.isoformat() if self._last_update else None
            ),
            "data_source": "simplified_calculation",
        }

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

            solar_forecast = self._get_solar_forecast()
            load_avg_sensors = self._get_load_avg_sensors()

            if current_capacity is None or not spot_prices:
                _LOGGER.info(
                    f"Missing required data for battery forecast: "
                    f"current_capacity={current_capacity}, spot_prices count={len(spot_prices)}"
                )
                return

            # Vypočítat timeline
            self._timeline_data = self._calculate_timeline(
                current_capacity=current_capacity,
                max_capacity=max_capacity,
                min_capacity=min_capacity,
                spot_prices=spot_prices,
                solar_forecast=solar_forecast,
                load_avg_sensors=load_avg_sensors,
            )

            self._last_update = datetime.now()
            _LOGGER.debug(
                f"Battery forecast updated: {len(self._timeline_data)} points"
            )

        except Exception as e:
            _LOGGER.error(f"Error updating battery forecast: {e}", exc_info=True)

    def _calculate_timeline(
        self,
        current_capacity: float,
        max_capacity: float,
        min_capacity: float,
        spot_prices: List[Dict[str, Any]],
        solar_forecast: Dict[str, Any],
        load_avg_sensors: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Vypočítat timeline predikce baterie.

        Args:
            current_capacity: Aktuální kapacita baterie (kWh)
            max_capacity: Maximální kapacita baterie (kWh)
            min_capacity: Minimální kapacita baterie (kWh)
            spot_prices: Timeline spotových cen (15min intervaly)
            solar_forecast: Solární předpověď (hodinové hodnoty)
            load_avg_sensors: Load average senzory

        Returns:
            List timeline bodů s predikcí
        """
        timeline = []
        battery_kwh = current_capacity

        _LOGGER.debug(f"Starting calculation with capacity={battery_kwh:.2f} kWh")

        for price_point in spot_prices:
            timestamp_str = price_point.get("time")
            if not timestamp_str:
                continue

            timestamp = datetime.fromisoformat(timestamp_str)

            # Získat solar production pro tento čas (kWh za 15min)
            solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)

            # Získat load average pro tento čas (kWh za 15min)
            load_kwh = self._get_load_avg_for_timestamp(timestamp, load_avg_sensors)

            # Grid charging (prozatím 0, připraveno pro budoucí logiku)
            grid_kwh = 0.0

            # Debug první pár bodů
            if len(timeline) < 3:
                _LOGGER.info(
                    f"Timeline point {len(timeline)}: {timestamp_str}, "
                    f"battery_before={battery_kwh:.3f}, solar={solar_kwh:.3f}, "
                    f"load={load_kwh:.3f}, grid={grid_kwh:.3f}"
                )

            # Výpočet změny kapacity za 15 minut
            # battery_kwh = předchozí + solar + grid - consumption
            battery_kwh = battery_kwh + solar_kwh + grid_kwh - load_kwh

            # Clamp na min/max
            if battery_kwh > max_capacity:
                battery_kwh = max_capacity
            if battery_kwh < min_capacity:
                battery_kwh = min_capacity

            # Přidat bod do timeline
            timeline.append(
                {
                    "timestamp": timestamp_str,
                    "spot_price_czk": price_point.get("price", 0),
                    "battery_capacity_kwh": round(battery_kwh, 2),
                    "solar_production_kwh": round(solar_kwh, 2),
                    "consumption_kwh": round(load_kwh, 2),
                    "grid_charge_kwh": round(grid_kwh, 2),
                }
            )

        return timeline

    def _get_current_battery_capacity(self) -> Optional[float]:
        """Získat aktuální kapacitu baterie z remaining_usable_capacity."""
        if not self._hass:
            return None

        sensor_id = f"sensor.oig_{self._box_id}_remaining_usable_capacity"
        state = self._hass.states.get(sensor_id)

        if not state or state.state in ["unknown", "unavailable"]:
            _LOGGER.warning(f"Sensor {sensor_id} not available")
            return None

        try:
            return float(state.state)
        except (ValueError, TypeError):
            _LOGGER.warning(f"Invalid value for {sensor_id}: {state.state}")
            return None

    def _get_max_battery_capacity(self) -> float:
        """Získat maximální kapacitu baterie z usable_battery_capacity."""
        if not self._hass:
            return 10.0  # Default fallback

        sensor_id = f"sensor.oig_{self._box_id}_usable_battery_capacity"
        state = self._hass.states.get(sensor_id)

        if not state or state.state in ["unknown", "unavailable"]:
            _LOGGER.warning(f"Sensor {sensor_id} not available, using default 10.0")
            return 10.0

        try:
            return float(state.state)
        except (ValueError, TypeError):
            _LOGGER.warning(f"Invalid value for {sensor_id}: {state.state}")
            return 10.0

    def _get_min_battery_capacity(self) -> float:
        """Získat minimální kapacitu baterie z config flow."""
        # Získat z config entry
        if self._config_entry and self._config_entry.data:
            min_capacity_percent = self._config_entry.data.get(
                "min_capacity_percent", 20.0
            )
            max_capacity = self._get_max_battery_capacity()
            return (min_capacity_percent / 100.0) * max_capacity

        return 2.0  # Default 20% z 10kWh

    async def _get_spot_price_timeline(self) -> List[Dict[str, Any]]:
        """Získat timeline spotových cen z spot_price_current_15min.

        Použijeme retry logiku protože spot_price sensor může být připravený později než battery_forecast.
        """
        if not self._hass:
            _LOGGER.warning("HASS not available in _get_spot_price_timeline")
            return []

        sensor_id = f"sensor.oig_{self._box_id}_spot_price_current_15min"

        # Retry logika: max 3 pokusy s 2s čekáním
        import asyncio

        max_retries = 3
        retry_delay = 2.0

        for attempt in range(max_retries):
            state = self._hass.states.get(sensor_id)

            # Debug logging - co vidíme?
            _LOGGER.info(
                f"Attempt {attempt+1}/{max_retries}: Checking {sensor_id} - "
                f"state exists: {state is not None}, "
                f"state.state: {state.state if state else 'N/A'}, "
                f"has attributes: {state.attributes is not None if state else False}"
            )

            # OPRAVA: Kontrolovat state.state jako OigCloudStatisticsSensor
            if not state or state.state in ("unavailable", "unknown", None):
                _LOGGER.info(
                    f"Attempt {attempt+1}: Sensor {sensor_id} unavailable - "
                    f"state.state={state.state if state else 'None'}"
                )
            elif state.attributes:
                # Načíst prices z atributů (formát: [{date, time, price, tariff}, ...])
                prices = state.attributes.get("prices", [])

                _LOGGER.debug(f"Found {len(prices)} price points in {sensor_id}")

                if prices:
                    # Konvertovat na timeline formát s timestamp
                    timeline = []
                    for price_point in prices:
                        date_str = price_point.get("date")  # "2025-10-20"
                        time_str = price_point.get("time")  # "13:30"
                        price = price_point.get("price", 0)

                        if not date_str or not time_str:
                            continue

                        # Vytvořit ISO timestamp
                        timestamp = f"{date_str}T{time_str}:00"

                        timeline.append({"time": timestamp, "price": price})

                    _LOGGER.info(
                        f"Successfully loaded {len(timeline)} spot price points from {sensor_id}"
                    )
                    return timeline
                else:
                    _LOGGER.info(
                        f"Attempt {attempt+1}: No prices data in {sensor_id} attributes"
                    )
            else:
                _LOGGER.info(
                    f"Attempt {attempt+1}: Sensor {sensor_id} has no attributes"
                )

            # Pokud nejsme na posledním pokusu, počkáme
            if attempt < max_retries - 1:
                _LOGGER.info(f"Waiting {retry_delay}s before retry...")
                await asyncio.sleep(retry_delay)

        # Všechny pokusy selhaly
        _LOGGER.error(
            f"Failed to load spot price timeline after {max_retries} attempts"
        )
        return []

    def _get_solar_forecast(self) -> Dict[str, Any]:
        """Získat solární předpověď z hourly_real_fve_total_kwh."""
        if not self._hass:
            return {}

        sensor_id = "sensor.hourly_real_fve_total_kwh"
        state = self._hass.states.get(sensor_id)

        if not state or not state.attributes:
            _LOGGER.warning(f"Sensor {sensor_id} not available")
            return {}

        # Načíst today a tomorrow data
        today = state.attributes.get("today", {})
        tomorrow = state.attributes.get("tomorrow", {})

        return {"today": today, "tomorrow": tomorrow}

    def _get_load_avg_sensors(self) -> Dict[str, Any]:
        """Získat všechny load_avg senzory."""
        if not self._hass:
            return {}

        load_sensors = {}

        # Najít všechny load_avg senzory
        for entity_id in self._hass.states.async_entity_ids("sensor"):
            if "load_avg_" in entity_id:
                state = self._hass.states.get(entity_id)
                if state and state.state not in ["unknown", "unavailable"]:
                    load_sensors[entity_id] = {
                        "value": float(state.state),
                        "attributes": dict(state.attributes),
                    }

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
        hour_key = timestamp.strftime("%H:00")
        hourly_kwh = data.get(hour_key, 0.0)

        try:
            hourly_kwh = float(hourly_kwh)
        except (ValueError, TypeError):
            return 0.0

        # Převést na 15min interval (1/4 hodiny)
        return hourly_kwh / 4.0

    def _get_load_avg_for_timestamp(
        self, timestamp: datetime, load_avg_sensors: Dict[str, Any]
    ) -> float:
        """
        Získat load average pro daný timestamp (kWh za 15min).

        Args:
            timestamp: Timestamp pro který hledat spotřebu
            load_avg_sensors: Dict všech load_avg senzorů

        Returns:
            Load average v kWh za 15 minut
        """
        # Zjistit den v týdnu (0=pondělí, 6=neděle)
        is_weekend = timestamp.weekday() >= 5
        day_type = "weekend" if is_weekend else "weekday"

        # Čas v hodinách a minutách
        time_str = timestamp.strftime("%H:%M")

        # Najít odpovídající senzor
        for entity_id, sensor_data in load_avg_sensors.items():
            attrs = sensor_data.get("attributes", {})

            # Zkontrolovat day_type
            sensor_day_type = attrs.get("day_type", "").lower()
            if sensor_day_type != day_type:
                continue

            # Zkontrolovat time_range
            time_range = attrs.get("time_range", "")
            if not time_range:
                continue

            # Parsovat time_range (např. "06:00-08:00")
            start_time, end_time = self._parse_time_range(time_range)
            if not start_time or not end_time:
                continue

            # Zkontrolovat jestli timestamp spadá do tohoto rozmezí
            if self._is_time_in_range(time_str, start_time, end_time):
                # Hodnota senzoru je ve wattech (W)
                # 143W = 143Wh za hodinu = 0,143 kWh/h
                # Pro 15min interval: 0,143 / 4 = 0,03575 kWh
                watts = sensor_data.get("value", 0.0)
                kwh_per_hour = watts / 1000.0  # W → kW
                kwh_per_15min = kwh_per_hour / 4.0  # kWh/h → kWh/15min
                return kwh_per_15min

        # Žádný senzor nenalezen
        return 0.0

    def _parse_time_range(self, time_range: str) -> tuple[Optional[str], Optional[str]]:
        """
        Parsovat time_range string.

        Args:
            time_range: String ve formátu "HH:MM-HH:MM"

        Returns:
            Tuple (start_time, end_time) jako stringy "HH:MM"
        """
        try:
            parts = time_range.split("-")
            if len(parts) != 2:
                return None, None

            start_time = parts[0].strip()
            end_time = parts[1].strip()

            # Validace formátu
            datetime.strptime(start_time, "%H:%M")
            datetime.strptime(end_time, "%H:%M")

            return start_time, end_time
        except (ValueError, AttributeError):
            return None, None

    def _is_time_in_range(self, time_str: str, start_time: str, end_time: str) -> bool:
        """
        Zkontrolovat jestli čas spadá do rozmezí.

        Args:
            time_str: Čas ve formátu "HH:MM"
            start_time: Začátek rozmezí "HH:MM"
            end_time: Konec rozmezí "HH:MM"

        Returns:
            True pokud čas spadá do rozmezí
        """
        try:
            time = datetime.strptime(time_str, "%H:%M").time()
            start = datetime.strptime(start_time, "%H:%M").time()
            end = datetime.strptime(end_time, "%H:%M").time()

            # Handle range přes půlnoc
            if start <= end:
                return start <= time < end
            else:
                return time >= start or time < end
        except ValueError:
            return False
