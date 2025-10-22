"""Zjednodušený senzor pro predikci nabití baterie v průběhu dne."""

import logging
import numpy as np
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

        # Získání box_id (inverter_sn) - STEJNÁ LOGIKA jako OigCloudStatisticsSensor
        # Priorita: coordinator.data > config_entry.data
        self._data_key = None

        if coordinator and coordinator.data:
            # Získat první klíč z coordinator.data (to je box_id)
            if isinstance(coordinator.data, dict) and coordinator.data:
                first_key = next(iter(coordinator.data.keys()), None)
                if first_key:
                    self._data_key = first_key
                    _LOGGER.debug(f"Got box_id from coordinator.data: {self._data_key}")

        # Fallback: config_entry.data
        if not self._data_key:
            if hasattr(coordinator, "config_entry") and coordinator.config_entry:
                if (
                    hasattr(coordinator.config_entry, "data")
                    and coordinator.config_entry.data
                ):
                    self._data_key = coordinator.config_entry.data.get("inverter_sn")
                    if self._data_key:
                        _LOGGER.debug(
                            f"Got box_id from config_entry.data: {self._data_key}"
                        )

        if not self._data_key:
            _LOGGER.error("Cannot determine box_id for battery forecast sensor")
            raise ValueError("Cannot determine box_id for battery forecast sensor")

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
        # HA databáze má limit 16KB na atributy
        # Timeline s 135 body (každý ~120 bytes) = ~16KB
        # Vrátíme CELOU timeline pro dashboard, ale s kompaktním formátem
        return {
            "timeline_data": self._timeline_data,  # Celá timeline pro chart
            "calculation_time": (
                self._last_update.isoformat() if self._last_update else None
            ),
            "data_source": "simplified_calculation",
            "max_capacity_kwh": self._get_max_battery_capacity(),
            "min_capacity_kwh": self._get_min_battery_capacity(),
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

        # Optimalizace nabíjení ze sítě
        _LOGGER.debug(f"Timeline before optimization: {len(timeline)} points")
        timeline = self._optimize_grid_charging(timeline)
        _LOGGER.debug(f"Timeline after optimization: {len(timeline)} points")

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
                    # Vypočítat časové hranice: od teď do půlnoci dalšího dne
                    now = datetime.now()
                    tomorrow_midnight = (now + timedelta(days=1)).replace(
                        hour=0, minute=0, second=0, microsecond=0
                    )
                    
                    _LOGGER.info(
                        f"Filtering timeline: now={now.isoformat()}, "
                        f"end={tomorrow_midnight.isoformat()}"
                    )
                    
                    # Konvertovat na timeline formát s timestamp
                    timeline = []
                    for price_point in prices:
                        date_str = price_point.get("date")  # "2025-10-20"
                        time_str = price_point.get("time")  # "13:30"
                        price = price_point.get("price", 0)

                        if not date_str or not time_str:
                            continue

                        # Vytvořit ISO timestamp
                        timestamp_str = f"{date_str}T{time_str}:00"
                        
                        # Parsovat timestamp pro porovnání
                        try:
                            timestamp = datetime.fromisoformat(timestamp_str)
                        except ValueError:
                            _LOGGER.warning(f"Invalid timestamp format: {timestamp_str}")
                            continue
                        
                        # Filtrovat: pouze budoucnost až do půlnoci dalšího dne
                        if timestamp < now:
                            continue  # Přeskočit historická data
                        
                        if timestamp > tomorrow_midnight:
                            break  # Ukončit na půlnoci dalšího dne (prices jsou seřazené)

                        timeline.append({"time": timestamp_str, "price": price})

                    _LOGGER.info(
                        f"Successfully loaded {len(timeline)} spot price points "
                        f"(filtered from {len(prices)} total) from {sensor_id}"
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
        """Získat solární předpověď z solar_forecast senzoru."""
        if not self._hass:
            return {}

        sensor_id = f"sensor.oig_{self._box_id}_solar_forecast"
        state = self._hass.states.get(sensor_id)

        if not state or not state.attributes:
            _LOGGER.warning(f"Sensor {sensor_id} not available")
            return {}

        # Načíst today a tomorrow data (správné názvy atributů)
        today = state.attributes.get("today_hourly_total_kw", {})
        tomorrow = state.attributes.get("tomorrow_hourly_total_kw", {})

        # Debug logging
        if today:
            sample_keys = list(today.keys())[:3]
            sample_values = [today[k] for k in sample_keys]
            _LOGGER.info(
                f"Solar forecast today sample: {dict(zip(sample_keys, sample_values))}"
            )

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

        _LOGGER.info(f"Found {len(load_sensors)} load_avg sensors")
        if len(load_sensors) > 0:
            # Log first sensor for debugging
            first_sensor = list(load_sensors.keys())[0]
            _LOGGER.info(
                f"Example sensor: {first_sensor}, "
                f"value={load_sensors[first_sensor]['value']}W, "
                f"attrs={load_sensors[first_sensor]['attributes']}"
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
        # Klíče jsou ve formátu ISO timestamp: "2025-10-20T14:00:00"
        hour_key = timestamp.replace(minute=0, second=0, microsecond=0).isoformat()

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
                
                # FALLBACK: Pokud jsou data 0 (ještě se nesebrala), použít 500W jako rozumný default
                if watts == 0:
                    watts = 500.0  # 500W = rozumná průměrná spotřeba domácnosti
                    _LOGGER.info(
                        f"No consumption data yet for {time_str}, using fallback: 500W"
                    )
                
                kwh_per_hour = watts / 1000.0  # W → kW
                kwh_per_15min = kwh_per_hour / 4.0  # kWh/h → kWh/15min
                _LOGGER.debug(
                    f"Matched {entity_id} for {time_str}: "
                    f"{watts}W → {kwh_per_15min:.5f} kWh/15min"
                )
                return kwh_per_15min

        # Žádný senzor nenalezen - použít fallback 500W
        _LOGGER.warning(
            f"No load_avg sensor found for {time_str} ({day_type}), "
            f"searched {len(load_avg_sensors)} sensors - using fallback 500W"
        )
        # 500W = 0.5 kWh/h = 0.125 kWh/15min
        return 0.125

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
                # Inclusive start, exclusive end (standard interval notation)
                # BUT: for boundary times, check if next range starts at this time
                # For now: inclusive on both ends to avoid gaps
                return start <= time <= end
            else:
                # Range přes půlnoc (např. "22:00-02:00")
                return time >= start or time <= end
        except ValueError:
            return False

    # ========================================================================
    # GRID CHARGING OPTIMIZATION METHODS
    # ========================================================================

    def _optimize_grid_charging(
        self, timeline_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Optimalizuje nabíjení baterie ze sítě podle cenových dat.

        Algoritmus:
        1. PRIORITA 1: Vyřešit minimum v průběhu (aby neklesla pod limit)
        2. PRIORITA 2: Vyřešit cílovou kapacitu na konci

        Args:
            timeline_data: Seznam bodů s predikcí baterie

        Returns:
            Optimalizovaná timeline s přidaným grid charging
        """
        if not timeline_data:
            return timeline_data

        try:
            # Načíst konfiguraci
            config = (
                self._config_entry.options
                if self._config_entry.options
                else self._config_entry.data
            )
            min_capacity_percent = config.get("min_capacity_percent", 20.0)
            target_capacity_percent = config.get("target_capacity_percent", 80.0)
            max_charging_price = config.get("max_price_conf", 10.0)
            peak_percentile = config.get("percentile_conf", 75.0)
            charging_power_kw = config.get("home_charge_rate", 2.8)

            max_capacity = self._get_max_battery_capacity()
            min_capacity_kwh = (min_capacity_percent / 100.0) * max_capacity
            target_capacity_kwh = (target_capacity_percent / 100.0) * max_capacity

            _LOGGER.info(
                f"Grid charging optimization: min={min_capacity_kwh:.2f}kWh, target={target_capacity_kwh:.2f}kWh, max_price={max_charging_price}CZK, percentile={peak_percentile}%"
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

            # PRIORITA 1: Vyřešit minimum v průběhu
            optimized_timeline = self._fix_minimum_capacity_violations(
                optimized_timeline,
                min_capacity_kwh,
                max_charging_price,
                price_threshold,
                charging_power_kw,
            )

            # PRIORITA 2: Vyřešit cílovou kapacitu na konci
            optimized_timeline = self._ensure_target_capacity_at_end(
                optimized_timeline,
                target_capacity_kwh,
                max_charging_price,
                price_threshold,
                charging_power_kw,
            )

            return optimized_timeline

        except Exception as e:
            _LOGGER.error(f"Error in grid charging optimization: {e}", exc_info=True)
            return timeline_data

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

            # Preferuj hodiny s nejmenším už existujícím nabíjením
            existing_charge = point.get("grid_charge_kwh", 0)
            candidates.append((i, price, existing_charge))

        if not candidates:
            return None

        # Seřadit podle ceny (primární) a existujícího nabíjení (sekundární)
        candidates.sort(key=lambda x: (x[1], x[2]))
        return candidates[0][0]

    def _recalculate_timeline_from_index(
        self, timeline: List[Dict[str, Any]], start_index: int
    ) -> None:
        """
        Přepočítá timeline od daného indexu podle vzorce baterie.

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

        for i in range(start_index, len(timeline)):
            if i == 0:
                # První bod - použij aktuální kapacitu jako základ
                continue

            prev_point = timeline[i - 1]
            curr_point = timeline[i]

            # Vzorec: nová_kapacita = předchozí + solar + grid - consumption
            prev_capacity = prev_point.get("battery_capacity_kwh", 0)
            solar_kwh = curr_point.get("solar_production_kwh", 0)
            grid_kwh = curr_point.get("grid_charge_kwh", 0)
            consumption_kwh = curr_point.get("consumption_kwh", 0)

            new_capacity = prev_capacity + solar_kwh + grid_kwh - consumption_kwh

            # Clamp na min/max
            new_capacity = max(min_capacity, min(new_capacity, max_capacity))

            curr_point["battery_capacity_kwh"] = round(new_capacity, 2)
