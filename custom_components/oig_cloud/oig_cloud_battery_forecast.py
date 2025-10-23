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
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry

from .oig_cloud_data_sensor import OigCloudDataSensor

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

            # DŮLEŽITÁ LOGIKA: Solár primárně snižuje spotřebu, až přebytek jde do baterie
            # solar_charge_kwh = max(0, solar_production - consumption)
            # Toto je čistý přírůstek do baterie ze soláru
            solar_to_battery = max(0, solar_kwh - load_kwh)

            # Výpočet změny kapacity za 15 minut
            # battery_kwh = předchozí + solar_to_battery + grid - 0 (spotřeba už odečtena v solar_to_battery)
            # POZOR: Původní výpočet byl: battery_kwh + solar + grid - load
            # Ale to počítá spotřebu 2x! Správně:
            battery_kwh = battery_kwh + solar_to_battery + grid_kwh

            # Clamp jen na maximum, NE na minimum
            # (Chceme vidět pokles pod minimum aby grid charging algoritmus reagoval)
            if battery_kwh > max_capacity:
                battery_kwh = max_capacity
            # DŮLEŽITÉ: NEclampovat na minimum - ať timeline ukazuje skutečný pokles
            # if battery_kwh < min_capacity:
            #     battery_kwh = min_capacity

            # Přidat bod do timeline
            # FORMÁT: solar_production_kwh je přejmenováno na solar_charge_kwh (čistý přírůstek)
            timeline.append(
                {
                    "timestamp": timestamp_str,
                    "spot_price_czk": price_point.get("price", 0),
                    "battery_capacity_kwh": round(battery_kwh, 2),
                    "solar_charge_kwh": round(
                        solar_to_battery, 2
                    ),  # ZMĚNA: čistý přírůstek ze soláru
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
                    # Filtrovat pouze budoucí data (od teď dál)
                    now = datetime.now()

                    _LOGGER.info(f"Filtering timeline from now: {now.isoformat()}")

                    # Konvertovat na timeline formát
                    timeline = []
                    for price_point in prices:
                        # Použít timestamp z sensoru (ISO formát)
                        timestamp_str = price_point.get("timestamp")
                        price = price_point.get("price", 0)

                        if not timestamp_str:
                            _LOGGER.warning(
                                f"Price point missing timestamp: {price_point}"
                            )
                            continue

                        # Parsovat timestamp pro porovnání
                        try:
                            timestamp = datetime.fromisoformat(timestamp_str)
                        except ValueError:
                            _LOGGER.warning(
                                f"Invalid timestamp format: {timestamp_str}"
                            )
                            continue

                        # Filtrovat: pouze budoucnost (od teď dál)
                        if timestamp < now:
                            continue  # Přeskočit historická data

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

        Nový algoritmus:
        1. Analyzuje kdy baterie potřebuje nabít (pod minimum nebo pro target)
        2. Vybírá nejlevnější dostupné intervaly kde se baterie SKUTEČNĚ nabije
        3. Zabezpečí že nenabíjíme když je baterie plná

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
                f"Smart grid charging optimization: min={min_capacity_kwh:.2f}kWh, target={target_capacity_kwh:.2f}kWh, max_price={max_charging_price}CZK, percentile={peak_percentile}%"
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

            # NOVÝ PŘÍSTUP: Chytrý plán nabíjení
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

        while iteration < max_iterations:
            # Zkontrolovat aktuální stav na konci
            current_final_capacity = timeline[-1].get("battery_capacity_kwh", 0)

            if current_final_capacity >= target_capacity:
                _LOGGER.info(
                    f"Target capacity achieved: {current_final_capacity:.2f}kWh >= {target_capacity:.2f}kWh"
                )
                break

            # Potřebujeme více energie
            shortage = target_capacity - current_final_capacity

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

            # Clamp jen na maximum, NE na minimum (ať timeline ukazuje skutečný pokles)
            new_capacity = min(new_capacity, max_capacity)
            # NEPOUŽÍVAT: max(min_capacity, ...) - ať vidíme critical intervals

            curr_point["battery_capacity_kwh"] = round(new_capacity, 2)


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
        prev_battery_capacity = None

        for point in timeline_data:
            grid_charge_kwh = point.get("grid_charge_kwh", 0)
            battery_capacity = point.get("battery_capacity_kwh", 0)

            if grid_charge_kwh > 0:
                timestamp_str = point.get("timestamp", "")
                try:
                    timestamp = datetime.fromisoformat(timestamp_str)
                    # Zahrnout intervaly od (now - 10min) pro detekci probíhajícího nabíjení
                    if timestamp >= time_threshold:
                        spot_price_czk = point.get("spot_price_czk", 0)

                        # Zjistit, jestli se baterie SKUTEČNĚ nabíjí
                        # (kapacita roste oproti předchozímu bodu)
                        is_actually_charging = False
                        actual_battery_charge = 0.0  # Skutečný přírůstek kapacity

                        if prev_battery_capacity is not None:
                            capacity_increase = battery_capacity - prev_battery_capacity
                            is_actually_charging = capacity_increase > 0.01  # tolerance
                            if is_actually_charging:
                                actual_battery_charge = capacity_increase

                        # Přidat interval do seznamu (všechny s grid_charge > 0)
                        interval_data = {
                            "timestamp": timestamp_str,
                            "energy_kwh": round(
                                grid_charge_kwh, 3
                            ),  # Celková grid energie
                            "spot_price_czk": round(spot_price_czk, 2),
                            "battery_capacity_kwh": round(battery_capacity, 2),
                            "is_charging_battery": is_actually_charging,
                        }

                        # Pokud se baterie SKUTEČNĚ nabíjí, počítáme energii a cenu
                        if is_actually_charging:
                            # Cena za skutečnou energii do baterie (ne celý grid)
                            cost_czk = actual_battery_charge * spot_price_czk
                            interval_data["cost_czk"] = round(cost_czk, 2)
                            interval_data["battery_charge_kwh"] = round(
                                actual_battery_charge, 3
                            )
                            total_energy += actual_battery_charge
                            total_cost += cost_czk
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

    @property
    def native_value(self) -> str:
        """Vrátí stav senzoru - on/off jestli nabíjení PROBÍHÁ nebo brzy začne."""
        intervals, _, _ = self._calculate_charging_intervals()

        # Kontrola, jestli je aktuální čas v intervalu nabíjení (nebo 5 min před)
        now = datetime.now()
        offset_before_start = timedelta(minutes=5)  # Zapnout 5 min před začátkem
        offset_before_end = timedelta(minutes=5)  # Vypnout 5 min před koncem

        for interval in intervals:
            if not interval.get("is_charging_battery", False):
                continue

            try:
                interval_time = datetime.fromisoformat(interval["timestamp"])
                interval_start = interval_time
                interval_end = interval_time + timedelta(minutes=15)  # 15min interval

                # Je aktuální čas v rozsahu (interval_start - 5min) až (interval_end - 5min)?
                # Zapnout 5 min PŘED začátkem, vypnout 5 min PŘED koncem
                if (
                    (interval_start - offset_before_start)
                    <= now
                    <= (interval_end - offset_before_end)
                ):
                    return "on"
            except (ValueError, TypeError):
                continue

        return "off"

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Atributy s detaily nabíjení."""
        intervals, total_energy, total_cost = self._calculate_charging_intervals()

        # Detekovat SOUVISLÉ BLOKY nabíjení (ne jen první a poslední bod!)
        charging_blocks = []
        current_block = None

        for interval in intervals:
            if interval.get("is_charging_battery", False):
                timestamp = datetime.fromisoformat(interval["timestamp"])

                if current_block is None:
                    # Začátek nového bloku
                    current_block = {
                        "start": timestamp,
                        "end": timestamp + timedelta(minutes=15),
                        "intervals": [interval],
                    }
                else:
                    # Zkontrolovat, jestli navazuje na předchozí interval
                    time_gap = (timestamp - current_block["end"]).total_seconds() / 60

                    if time_gap <= 15:  # Max 15 minut = souvislý blok
                        # Pokračování bloku
                        current_block["end"] = timestamp + timedelta(minutes=15)
                        current_block["intervals"].append(interval)
                    else:
                        # Mezera > 15 min → ukončit blok a začít nový
                        charging_blocks.append(current_block)
                        current_block = {
                            "start": timestamp,
                            "end": timestamp + timedelta(minutes=15),
                            "intervals": [interval],
                        }
            else:
                # Interval bez nabíjení → ukončit aktuální blok
                if current_block is not None:
                    charging_blocks.append(current_block)
                    current_block = None

        # Nezapomenout přidat poslední blok
        if current_block is not None:
            charging_blocks.append(current_block)

        # Připravit formátované časy pro UI - ukázat PRVNÍ blok
        next_charging_start = None
        next_charging_end = None
        next_charging_duration = None
        all_blocks_summary = None

        if charging_blocks:
            # První blok (nejbližší)
            first_block = charging_blocks[0]
            next_charging_start = first_block["start"].strftime("%d.%m. %H:%M")
            next_charging_end = first_block["end"].strftime("%d.%m. %H:%M")

            # Délka prvního bloku
            duration = first_block["end"] - first_block["start"]
            hours = int(duration.total_seconds() // 3600)
            minutes = int((duration.total_seconds() % 3600) // 60)
            next_charging_duration = (
                f"{hours}h {minutes}min" if hours > 0 else f"{minutes}min"
            )

            # Souhrn všech bloků (pro detailní zobrazení)
            if len(charging_blocks) > 1:
                blocks_summary = []
                for block in charging_blocks:
                    start_str = block["start"].strftime("%H:%M")
                    end_str = block["end"].strftime("%H:%M")
                    block_duration = block["end"] - block["start"]
                    block_hours = int(block_duration.total_seconds() // 3600)
                    block_mins = int((block_duration.total_seconds() % 3600) // 60)
                    duration_str = (
                        f"{block_hours}h {block_mins}min"
                        if block_hours > 0
                        else f"{block_mins}min"
                    )
                    blocks_summary.append(f"{start_str}-{end_str} ({duration_str})")
                all_blocks_summary = " | ".join(blocks_summary)

        return {
            "charging_intervals": intervals,
            "total_energy_kwh": round(total_energy, 2),
            "total_cost_czk": round(total_cost, 2),
            "interval_count": len(intervals),
            "charging_battery_count": sum(
                1 for i in intervals if i.get("is_charging_battery", False)
            ),
            "is_charging_planned": len(intervals) > 0,
            # Atributy pro první (nejbližší) blok
            "next_charging_start": next_charging_start,
            "next_charging_end": next_charging_end,
            "next_charging_duration": next_charging_duration,
            "next_charging_time_range": (
                f"{next_charging_start} - {next_charging_end}"
                if next_charging_start
                else None
            ),
            # Nové: info o všech blocích
            "charging_blocks_count": len(charging_blocks),
            "all_charging_blocks": all_blocks_summary,  # např. "00:00-05:30 (5h 30min) | 16:00-16:15 (15min) | 21:45-23:45 (2h)"
        }
