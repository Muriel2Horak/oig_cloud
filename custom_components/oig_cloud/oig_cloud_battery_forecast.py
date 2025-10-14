"""Senzor pro predikci nabití baterie v průběhu dne."""

import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta

from homeassistant.components.sensor import SensorEntity, SensorDeviceClass, SensorStateClass
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.entity import EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.config_entries import ConfigEntry

_LOGGER = logging.getLogger(__name__)


class OigCloudBatteryForecastSensor(CoordinatorEntity, SensorEntity):
    """Senzor pro predikci nabití baterie."""

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
    ) -> None:
        """Initialize the battery forecast sensor."""
        super().__init__(coordinator)
        
        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._device_info = device_info
        self._hass: Optional[HomeAssistant] = None

        # Získáme inverter_sn z config_entry
        inverter_sn = config_entry.data.get("inverter_sn", "unknown")
        
        if inverter_sn == "unknown":
            _LOGGER.error("Cannot determine inverter_sn for battery forecast sensor")
            raise ValueError("Cannot determine inverter_sn for battery forecast sensor")

        _LOGGER.debug(f"Battery forecast: Using inverter_sn: {inverter_sn}")

        # Nastavit atributy senzoru
        self._box_id = inverter_sn
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_name = "Predikce kapacity baterie"
        self._attr_unique_id = f"{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:battery-charging-60"
        self._attr_native_unit_of_measurement = "kWh"
        self._attr_device_class = SensorDeviceClass.ENERGY_STORAGE
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_entity_category = None

        # OPRAVA: Přepsat název podle name_cs logiky - bez replace("_", " ").title()
        from .sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")

        # Preferujeme český název, fallback na anglický, fallback na sensor_type
        self._attr_name = name_cs or name_en or sensor_type

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA."""
        await super().async_added_to_hass()
        self._hass = self.hass

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA."""
        await super().async_will_remove_from_hass()

    async def _wait_for_sensor(self, entity_id: str, timeout: int = 5) -> bool:
        """
        Počká na dostupnost senzoru.

        Args:
            entity_id: ID senzoru na který čekat
            timeout: Max čas čekání v sekundách

        Returns:
            bool: True pokud je senzor dostupný
        """
        import asyncio

        if not self._hass:
            return False

        for _ in range(timeout):
            state = self._hass.states.get(entity_id)
            if state and state.state not in ["unknown", "unavailable", None]:
                _LOGGER.debug(f"✅ Sensor {entity_id} is available")
                return True
            await asyncio.sleep(1)

        _LOGGER.debug(f"⚠️ Sensor {entity_id} not available after {timeout}s")
        return False

    @property
    def device_info(self) -> Optional[Dict[str, Any]]:
        """Return device info - Analytics Module."""
        return self._device_info

    @property
    def state(self) -> Optional[Union[float, str]]:
        """Stav senzoru - aktuální predikovaná kapacita baterie."""
        # OPRAVA: Používat správnou strukturu dat
        forecast_data = getattr(self.coordinator, "battery_forecast_data", None)

        if not forecast_data:
            return None

        # Vzít aktuální kapacitu z výpočtu
        current_kwh = forecast_data.get("current_battery_kwh", 0)
        return round(current_kwh, 2) if current_kwh > 0 else None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Dodatečné atributy s daty forecast."""
        forecast_data = getattr(self.coordinator, "battery_forecast_data", None)

        if not forecast_data:
            return {}

        return {
            # Původní kompatibilní struktura
            "solar_today_predicted": forecast_data.get("solar_today_predicted", {}),
            "solar_tomorrow_predicted": forecast_data.get(
                "solar_tomorrow_predicted", {}
            ),
            "battery_today_predicted": forecast_data.get("battery_today_predicted", {}),
            "battery_tomorrow_predicted": forecast_data.get(
                "battery_tomorrow_predicted", {}
            ),
            "consumption_prediction": forecast_data.get("consumption_prediction", {}),
            # NOVÉ: Timeline data pro dashboard
            "timeline_data": forecast_data.get("timeline_data", []),
            # Metadata
            "current_battery_kwh": forecast_data.get("current_battery_kwh", 0),
            "max_capacity_kwh": forecast_data.get("max_capacity_kwh", 0),
            "calculation_time": forecast_data.get("calculation_time"),
            "data_source": forecast_data.get("data_source", "unknown"),
            # Optimalizační data
            "charging_hours_recommended": forecast_data.get(
                "charging_hours_recommended", []
            ),
            "charging_hours_today": forecast_data.get("charging_hours_today", []),
            "charging_hours_tomorrow": forecast_data.get("charging_hours_tomorrow", []),
            "peak_hours": forecast_data.get("peak_hours", []),
            "off_peak_hours": forecast_data.get("off_peak_hours", []),
            "optimization_enabled": forecast_data.get("optimization_enabled", False),
            "battery_config": forecast_data.get("battery_config", {}),
            # NOVÉ: Control signály pro řízení (10min předstih)
            "control_signals": forecast_data.get("control_signals", {}),
            "charging_state": forecast_data.get("charging_state", "idle"),
            "next_charging_event": forecast_data.get("next_charging_event"),
            "should_prepare_charging": forecast_data.get(
                "should_prepare_charging", False
            ),
            "is_charging_active": forecast_data.get("is_charging_active", False),
            "should_end_charging": forecast_data.get("should_end_charging", False),
        }

    async def _calculate_battery_forecast(self) -> Dict[str, Any]:
        """Výpočet predikce nabití baterie pomocí existujících senzorů."""
        _LOGGER.debug("🔋 Starting battery forecast calculation using existing sensors")

        calculation_time = datetime.now()

        # Počkat na klíčové senzory před výpočetem
        critical_sensors = [
            "sensor.hourly_real_fve_total_kwh",
            f"sensor.oig_{self._box_id}_remaining_usable_capacity",
        ]

        for sensor_id in critical_sensors:
            if not await self._wait_for_sensor(sensor_id, timeout=5):
                _LOGGER.warning(
                    f"🔋 Critical sensor {sensor_id} not available, continuing with fallback data"
                )

        # Použijeme data z existujících senzorů (synchronní operace)
        solar_forecast_data = self._get_existing_solar_forecast()
        consumption_stats = self._get_existing_consumption_stats()
        current_battery_data = self._get_current_battery_state()
        spot_prices_data = self._get_existing_spot_prices()

        # Jednoduchý forecast výpočet (bez nabíjení)
        battery_forecast_base = self._calculate_simple_battery_forecast(
            solar_forecast_data, consumption_stats, current_battery_data
        )

        # NOVÉ: Načíst konfiguraci pro optimalizaci nabíjení
        optimization_config = self._get_optimization_config()
        charging_hours: List[str] = []
        peak_hours: Dict[str, bool] = {}

        # NOVÉ: Pokud máme spotové ceny a je zapnutá optimalizace, najít optimální nabíjecí hodiny
        if spot_prices_data and optimization_config.get("enabled", False):
            _LOGGER.info(
                "🔋 Charging optimization is enabled, calculating optimal hours"
            )

            # Identifikovat peak/off-peak hodiny
            peak_hours = self._identify_peak_hours(
                spot_prices_data,
                optimization_config.get("percentile_threshold", 75.0),
                optimization_config.get("max_price", 10.0),
            )

            # Najít optimální nabíjecí hodiny
            charging_hours = await self._find_optimal_charging_hours(
                battery_forecast_base.get("continuous", {}),
                spot_prices_data,
                peak_hours,
                {
                    "min_capacity_percent": optimization_config.get(
                        "min_capacity_percent", 20.0
                    ),
                    "max_capacity_kwh": current_battery_data.get("max_kwh", 10.0),
                    "charge_rate_kw": optimization_config.get("charge_rate_kw", 2.8),
                    "target_capacity_percent": optimization_config.get(
                        "target_capacity_percent", 80.0
                    ),
                    "charge_on_bad_weather": optimization_config.get(
                        "charge_on_bad_weather", False
                    ),
                },
            )

            # Přepočítat forecast s nabíjením
            if charging_hours:
                battery_forecast_optimized = self._recalculate_forecast_with_charging(
                    battery_forecast_base.get("continuous", {}),
                    charging_hours,
                    optimization_config.get("charge_rate_kw", 2.8),
                    current_battery_data.get("max_kwh", 10.0),
                )

                # Aktualizovat forecast s optimalizovanými hodnotami
                battery_forecast = battery_forecast_optimized
            else:
                battery_forecast = battery_forecast_base
        else:
            battery_forecast = battery_forecast_base
            _LOGGER.debug(
                "🔋 Charging optimization disabled or no spot prices available"
            )

        # NOVÉ: Vytvoříme spojitou časovou řadu pro všechna data
        timeline_data = self._create_combined_timeline(
            solar_forecast_data, battery_forecast, spot_prices_data
        )

        # NOVÉ: Přidat informace o nabíjení do timeline
        timeline_data = self._enrich_timeline_with_charging(
            timeline_data, charging_hours, peak_hours
        )

        # NOVÉ: Rozdělit nabíjecí hodiny na dnes/zítra
        charging_today, charging_tomorrow = self._split_charging_hours_by_day(
            charging_hours
        )

        # NOVÉ: Generovat control signály pro řízení nabíjení
        control_signals = self._get_charging_control_signals(
            charging_hours, pre_signal_minutes=10
        )

        return {
            # Původní struktura pro kompatibilitu
            "solar_today_predicted": solar_forecast_data.get(
                "today_hourly_total_kw", {}
            ),
            "solar_tomorrow_predicted": solar_forecast_data.get(
                "tomorrow_hourly_total_kw", {}
            ),
            "consumption_prediction": consumption_stats,
            "battery_today_predicted": battery_forecast.get("today", {}),
            "battery_tomorrow_predicted": battery_forecast.get("tomorrow", {}),
            # NOVÉ: Spojitá časová řada pro dashboard
            "timeline_data": timeline_data,
            # NOVÉ: Optimalizační data
            "charging_hours_recommended": charging_hours,
            "charging_hours_today": charging_today,
            "charging_hours_tomorrow": charging_tomorrow,
            "peak_hours": [k for k, v in peak_hours.items() if v],
            "off_peak_hours": [k for k, v in peak_hours.items() if not v],
            "optimization_enabled": optimization_config.get("enabled", False),
            # NOVÉ: Control signály pro řízení
            "control_signals": control_signals,
            "charging_state": control_signals.get("current_state"),
            "next_charging_event": control_signals.get("next_event"),
            "should_prepare_charging": control_signals.get("should_prepare_charging"),
            "is_charging_active": control_signals.get("is_charging_active"),
            "should_end_charging": control_signals.get("should_end_charging"),
            # Metadata
            "calculation_time": calculation_time.isoformat(),
            "data_source": "existing_sensors",
            "current_battery_kwh": current_battery_data.get("current_kwh", 0),
            "max_capacity_kwh": current_battery_data.get("max_kwh", 10),
            "battery_config": {
                "min_capacity_percent": optimization_config.get(
                    "min_capacity_percent", 20.0
                ),
                "charge_rate_kw": optimization_config.get("charge_rate_kw", 2.8),
                "max_price_czk": optimization_config.get("max_price", 10.0),
                "percentile_threshold": optimization_config.get(
                    "percentile_threshold", 75.0
                ),
                "target_capacity_percent": optimization_config.get(
                    "target_capacity_percent", 80.0
                ),
                "charge_on_bad_weather": optimization_config.get(
                    "charge_on_bad_weather", False
                ),
            },
        }

    def _get_optimization_config(self) -> Dict[str, Any]:
        """Načte konfiguraci pro optimalizaci nabíjení z options."""
        if not self._config_entry:
            return {"enabled": False}

        options = self._config_entry.options

        # Zkontrolovat jestli je optimalizace zapnutá
        enabled = options.get("enable_battery_prediction", False)

        return {
            "enabled": enabled,
            "min_capacity_percent": options.get("min_capacity_percent", 20.0),
            "charge_rate_kw": options.get("home_charge_rate", 2.8),
            "percentile_threshold": options.get("percentile_conf", 75.0),
            "max_price": options.get("max_price_conf", 10.0),
            "target_capacity_percent": options.get("target_capacity_percent", 80.0),
            "charge_on_bad_weather": options.get("charge_on_bad_weather", False),
        }

    def _split_forecast_by_days(
        self, continuous_forecast: Dict[str, float]
    ) -> Dict[str, Dict[str, float]]:
        """Rozdělí spojitý forecast zpět na dny."""
        now = datetime.now()
        today = now.date()
        yesterday = (now - timedelta(days=1)).date()
        tomorrow = (now + timedelta(days=1)).date()

        result = {
            "yesterday": {},
            "today": {},
            "tomorrow": {},
            "continuous": continuous_forecast,
        }

        for timestamp_str, capacity in continuous_forecast.items():
            timestamp = datetime.fromisoformat(timestamp_str)
            hour_key = f"{timestamp.hour:02d}:00"

            if timestamp.date() == yesterday:
                result["yesterday"][hour_key] = capacity
            elif timestamp.date() == today:
                result["today"][hour_key] = capacity
            elif timestamp.date() == tomorrow:
                result["tomorrow"][hour_key] = capacity

        return result

    def _enrich_timeline_with_charging(
        self,
        timeline: List[Dict[str, Any]],
        charging_hours: List[str],
        peak_hours: Dict[str, bool],
    ) -> List[Dict[str, Any]]:
        """Přidá informace o nabíjení a peak hodinách do timeline."""
        enriched = []

        for point in timeline:
            timestamp_str = point["timestamp"]

            # Vytvořit hodinový klíč pro porovnání
            try:
                dt = datetime.fromisoformat(timestamp_str)
                hour_key = f"{dt.strftime('%Y-%m-%d')}T{dt.hour:02d}:00:00"

                # Přidat informaci o nabíjení
                point["is_charging_recommended"] = hour_key in charging_hours
                point["is_peak_hour"] = peak_hours.get(hour_key, False)

            except (ValueError, AttributeError):
                point["is_charging_recommended"] = False
                point["is_peak_hour"] = False

            enriched.append(point)

        return enriched

    def _split_charging_hours_by_day(
        self, charging_hours: List[str]
    ) -> tuple[List[str], List[str]]:
        """Rozdělí nabíjecí hodiny na dnešní a zítřejší."""
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)

        today_str = today.strftime("%Y-%m-%d")
        tomorrow_str = tomorrow.strftime("%Y-%m-%d")

        charging_today = [h for h in charging_hours if h.startswith(today_str)]
        charging_tomorrow = [h for h in charging_hours if h.startswith(tomorrow_str)]

        return charging_today, charging_tomorrow

    def _get_charging_control_signals(
        self, charging_hours: List[str], pre_signal_minutes: int = 10
    ) -> Dict[str, Any]:
        """
        Generuje control signály pro řízení nabíjení s předstihem.

        Systém potřebuje 10 minut na změnu režimu, proto:
        - Pre-signal: Signál 10 min před začátkem nabíjení
        - Active: Aktivní nabíjení v této hodině
        - Post-signal: Signál 10 min před koncem (pro ukončení)

        Returns:
            Dict s časovými okny a aktuálními stavy
        """
        now = datetime.now()

        # Vytvoříme timeline všech nabíjecích událostí
        charging_timeline: List[Dict[str, Any]] = []

        for hour_str in sorted(charging_hours):
            try:
                charge_start = datetime.fromisoformat(hour_str)
                charge_end = charge_start + timedelta(hours=1)

                # Pre-signal začíná 10 min před nabíjením
                pre_signal_start = charge_start - timedelta(minutes=pre_signal_minutes)

                # Post-signal začíná 10 min před koncem
                post_signal_start = charge_end - timedelta(minutes=pre_signal_minutes)

                charging_timeline.append(
                    {
                        "pre_signal_start": pre_signal_start,
                        "charge_start": charge_start,
                        "post_signal_start": post_signal_start,
                        "charge_end": charge_end,
                        "hour_key": hour_str,
                    }
                )

            except (ValueError, AttributeError):
                continue

        # Zjistit aktuální stav
        current_state = "idle"
        next_event: Optional[Dict[str, Any]] = None
        active_charging_hour: Optional[str] = None

        for event in charging_timeline:
            # PRE-SIGNAL fáze (10 min před nabíjením)
            if event["pre_signal_start"] <= now < event["charge_start"]:
                current_state = "pre_signal"
                next_event = {
                    "type": "charging_start",
                    "time": event["charge_start"],
                    "minutes_until": int(
                        (event["charge_start"] - now).total_seconds() / 60
                    ),
                }
                active_charging_hour = event["hour_key"]
                break

            # ACTIVE fáze (nabíjení probíhá)
            elif event["charge_start"] <= now < event["post_signal_start"]:
                current_state = "charging"
                next_event = {
                    "type": "post_signal",
                    "time": event["post_signal_start"],
                    "minutes_until": int(
                        (event["post_signal_start"] - now).total_seconds() / 60
                    ),
                }
                active_charging_hour = event["hour_key"]
                break

            # POST-SIGNAL fáze (10 min před koncem)
            elif event["post_signal_start"] <= now < event["charge_end"]:
                current_state = "post_signal"
                next_event = {
                    "type": "charging_end",
                    "time": event["charge_end"],
                    "minutes_until": int(
                        (event["charge_end"] - now).total_seconds() / 60
                    ),
                }
                active_charging_hour = event["hour_key"]
                break

        # Pokud nejsme v žádné fázi, najít další budoucí event
        if current_state == "idle" and charging_timeline:
            for event in charging_timeline:
                if event["pre_signal_start"] > now:
                    next_event = {
                        "type": "pre_signal",
                        "time": event["pre_signal_start"],
                        "minutes_until": int(
                            (event["pre_signal_start"] - now).total_seconds() / 60
                        ),
                    }
                    break

        return {
            "current_state": current_state,
            "active_charging_hour": active_charging_hour,
            "next_event": next_event,
            "timeline": charging_timeline,
            "pre_signal_minutes": pre_signal_minutes,
            # Binary sensors friendly výstupy
            "should_prepare_charging": current_state == "pre_signal",
            "is_charging_active": current_state == "charging",
            "should_end_charging": current_state == "post_signal",
        }

    async def _find_optimal_charging_hours(
        self,
        battery_forecast: Dict[str, float],
        spot_prices: Dict[str, float],
        peak_hours: Dict[str, bool],
        config: Dict[str, Any],
    ) -> List[str]:
        """
        NOVÝ ALGORITMUS podle správných pravidel:

        1. Nabíjíme POUZE v off-peak hodinách
        2. VŽDY za nejnižší budoucí cenu
        3. Peak = ZERO nabíjení (za žádnou cenu)
        4. Minimální kapacita = hard limit (nesmí klesnout)
        5. Cílová kapacita = optimální stav
        6. Omezená nabíjecí rychlost
        7. Nepřízeň počasí = preventivní nabití

        Args:
            battery_forecast: Predikovaná kapacita baterie v čase {timestamp: kwh}
            spot_prices: Spotové ceny {timestamp: czk/kwh}
            peak_hours: Peak/off-peak označení {timestamp: bool}
            config: Konfigurační parametry

        Returns:
            List[str]: Seznam ISO timestampů kdy nabíjet
        """

        # Konfigurace
        min_capacity_percent = config.get("min_capacity_percent", 20.0)
        target_capacity_percent = config.get("target_capacity_percent", 80.0)
        max_capacity_kwh = config.get("max_capacity_kwh", 10.0)
        charge_rate_kw = config.get("charge_rate_kw", 2.8)
        max_price_czk = config.get("max_price", 10.0)
        charge_on_bad_weather = config.get("charge_on_bad_weather", False)

        # Přepočet na kWh
        min_capacity_kwh = (min_capacity_percent / 100.0) * max_capacity_kwh
        target_capacity_kwh = (target_capacity_percent / 100.0) * max_capacity_kwh

        _LOGGER.info(
            f"🔋 Optimization config: min={min_capacity_kwh:.2f}kWh ({min_capacity_percent}%), "
            f"target={target_capacity_kwh:.2f}kWh ({target_capacity_percent}%), "
            f"charge_rate={charge_rate_kw}kW, max_price={max_price_czk}CZK/kWh"
        )

        # KROK 1: Identifikovat OFF-PEAK hodiny s cenami
        off_peak_prices: List[tuple[str, float]] = []

        for time_key, is_peak in peak_hours.items():
            if not is_peak:  # POUZE off-peak
                price = spot_prices.get(time_key)
                if price is not None and price <= max_price_czk:
                    off_peak_prices.append((time_key, price))

        if not off_peak_prices:
            _LOGGER.warning("🔋 No off-peak hours available within price limit!")
            return []

        # KROK 2: Seřadit podle ceny (od nejlevnější)
        off_peak_prices.sort(key=lambda x: x[1])

        _LOGGER.info(
            f"🔋 Found {len(off_peak_prices)} off-peak hours, "
            f"cheapest: {off_peak_prices[0][1]:.2f} CZK/kWh, "
            f"most expensive: {off_peak_prices[-1][1]:.2f} CZK/kWh"
        )

        # KROK 3: Detekce nepřízně počasí (pokud je zapnuto)
        bad_weather_detected = False
        if charge_on_bad_weather:
            bad_weather_detected = await self._check_bad_weather_forecast()
            if bad_weather_detected:
                _LOGGER.warning(
                    "🔋 ⚠️ BAD WEATHER detected! Preventive charging enabled"
                )

        # KROK 4: Iterativní výběr nabíjecích hodin
        charging_hours: List[str] = []
        working_forecast = battery_forecast.copy()

        max_iterations = 100
        for iteration in range(max_iterations):
            # Najít nejkritičtější čas (kde klesáme pod minimum)
            critical_time: Optional[str] = None
            min_capacity_time: Optional[str] = None
            min_capacity_value = float("inf")

            for time_key in sorted(working_forecast.keys()):
                capacity = working_forecast[time_key]

                # Najít minimum
                if capacity < min_capacity_value:
                    min_capacity_value = capacity
                    min_capacity_time = time_key

                # Kritický pokles pod minimum
                if capacity < min_capacity_kwh and time_key not in [
                    h for h, _ in charging_hours
                ]:
                    critical_time = time_key
                    break

            # KROK 5: Rozhodování o nabíjení

            # Případ A: KRITICKÝ stav - klesáme pod minimum
            if critical_time:
                _LOGGER.warning(
                    f"🔋 ⚠️ CRITICAL: Battery will drop to {working_forecast[critical_time]:.2f}kWh "
                    f"(below {min_capacity_kwh:.2f}kWh) at {critical_time}"
                )

                # Najít nejlevnější off-peak hodinu PŘED kritickým časem
                selected_hour: Optional[tuple[str, float]] = None

                for time_key, price in off_peak_prices:
                    # Musí být před kritickým časem a ještě nenabíjená
                    if time_key < critical_time and time_key not in [
                        h for h, _ in charging_hours
                    ]:
                        selected_hour = (time_key, price)
                        break

                if selected_hour:
                    charging_hours.append(selected_hour)
                    _LOGGER.info(
                        f"🔋 ✅ EMERGENCY charging at {selected_hour[0]} "
                        f"(price: {selected_hour[1]:.2f} CZK/kWh)"
                    )

                    # Přepočítat forecast s touto nabíjecí hodinou
                    working_forecast = self._recalculate_forecast_with_charging(
                        working_forecast,
                        [h for h, _ in charging_hours],
                        charge_rate_kw,
                        max_capacity_kwh,
                    )
                    continue
                else:
                    _LOGGER.error(
                        f"🔋 ❌ Cannot find off-peak hour before critical time {critical_time}!"
                    )
                    break

            # Případ B: Nepřízeň počasí - nabít na target
            elif bad_weather_detected and min_capacity_value < target_capacity_kwh:
                _LOGGER.info(
                    f"🔋 🌧️ Bad weather mode: charging to target "
                    f"(current min: {min_capacity_value:.2f}kWh)"
                )

                # Vybrat nejlevnější dostupnou off-peak hodinu
                selected_hour: Optional[tuple[str, float]] = None

                for time_key, price in off_peak_prices:
                    if time_key not in [h for h, _ in charging_hours]:
                        selected_hour = (time_key, price)
                        break

                if selected_hour:
                    charging_hours.append(selected_hour)
                    _LOGGER.info(
                        f"🔋 ✅ Weather charging at {selected_hour[0]} "
                        f"(price: {selected_hour[1]:.2f} CZK/kWh)"
                    )

                    working_forecast = self._recalculate_forecast_with_charging(
                        working_forecast,
                        [h for h, _ in charging_hours],
                        charge_rate_kw,
                        max_capacity_kwh,
                    )
                    continue
                else:
                    break

            # Případ C: Optimální stav - žádné nabíjení potřeba
            else:
                _LOGGER.info(
                    f"🔋 ✅ Battery forecast OK: minimum {min_capacity_value:.2f}kWh "
                    f"(above {min_capacity_kwh:.2f}kWh limit)"
                )
                break

        # KROK 6: Výstup
        final_hours = sorted([h for h, _ in charging_hours])

        if final_hours:
            total_cost = sum(p for _, p in charging_hours) * charge_rate_kw
            _LOGGER.info(
                f"🔋 📊 Final plan: {len(final_hours)} charging hours, "
                f"total cost: ~{total_cost:.2f} CZK"
            )
            for hour, price in sorted(charging_hours, key=lambda x: x[0]):
                _LOGGER.info(f"🔋   • {hour}: {price:.2f} CZK/kWh")
        else:
            _LOGGER.info("🔋 ✅ No charging needed - battery forecast is sufficient")

        return final_hours

    async def _check_bad_weather_forecast(self) -> bool:
        """
        Kontrola předpovědi počasí z Home Assistant Weather entity.

        Automaticky detekuje weather entitu a analyzuje předpověď.

        Detekuje:
        - Bouřky (thunderstorm, lightning)
        - Vichřice (strong wind > 60 km/h)
        - Extrémní sníh/déšť (heavy-rain, heavy-snow)
        - Krupobití (hail)

        Returns:
            bool: True pokud je detekována nepřízeň počasí v příštích 24h
        """
        try:
            if not self._hass:
                return False

            # KROK 1: Najít weather entity (preferujeme tu co má forecast)
            weather_entity_id: Optional[str] = None

            # Zkusíme z config_flow options (pokud uživatel vybral)
            weather_entity_id = self._config_entry.options.get("weather_entity")

            # Pokud není v options, najdeme první dostupnou weather entitu
            if not weather_entity_id:
                weather_entity_id = self._find_weather_entity()

            if not weather_entity_id:
                _LOGGER.debug(
                    "🌦️ No weather entity found, skipping bad weather detection"
                )
                return False

            _LOGGER.debug(f"🌦️ Using weather entity: {weather_entity_id}")

            # KROK 2: Získat weather state a forecast
            weather_state = self._hass.states.get(weather_entity_id)

            if not weather_state:
                _LOGGER.warning(f"🌦️ Weather entity {weather_entity_id} not found")
                return False

            # KROK 3: Analyzovat aktuální stav
            current_condition = weather_state.state.lower()

            # Kritické aktuální stavy
            critical_conditions = [
                "lightning",
                "lightning-rainy",
                "pouring",
                "hail",
                "exceptional",
            ]

            if current_condition in critical_conditions:
                _LOGGER.warning(f"🌦️ ⚠️ CRITICAL weather NOW: {current_condition}")
                return True

            # KROK 4: Analyzovat forecast (příštích 24 hodin)
            forecast = weather_state.attributes.get("forecast", [])

            if not forecast:
                _LOGGER.debug("🌦️ No forecast data available")
                return False

            now = datetime.now()
            bad_weather_hours: List[str] = []

            for forecast_item in forecast:
                try:
                    # Parsovat čas předpovědi
                    forecast_time_str = forecast_item.get("datetime")
                    if not forecast_time_str:
                        continue

                    forecast_time = datetime.fromisoformat(
                        forecast_time_str.replace("Z", "+00:00")
                    )

                    # Pouze příštích 24 hodin
                    hours_ahead = (forecast_time - now).total_seconds() / 3600
                    if hours_ahead < 0 or hours_ahead > 24:
                        continue

                    # Analyzovat condition
                    condition = forecast_item.get("condition", "").lower()

                    # Kritické podmínky
                    if condition in critical_conditions:
                        bad_weather_hours.append(
                            f"{forecast_time.strftime('%H:%M')} ({condition})"
                        )
                        continue

                    # Bouřky
                    if "thunder" in condition or "storm" in condition:
                        bad_weather_hours.append(
                            f"{forecast_time.strftime('%H:%M')} (storm)"
                        )
                        continue

                    # Silný vítr
                    wind_speed = forecast_item.get("wind_speed")
                    if wind_speed and wind_speed > 60:  # km/h
                        bad_weather_hours.append(
                            f"{forecast_time.strftime('%H:%M')} (wind {wind_speed}km/h)"
                        )
                        continue

                    # Extrémní srážky
                    precipitation = forecast_item.get("precipitation")
                    if precipitation and precipitation > 10:  # mm/h
                        bad_weather_hours.append(
                            f"{forecast_time.strftime('%H:%M')} (rain {precipitation}mm)"
                        )
                        continue

                except Exception as e:
                    _LOGGER.debug(f"Error parsing forecast item: {e}")
                    continue

            # KROK 5: Vyhodnocení
            if bad_weather_hours:
                _LOGGER.warning(
                    f"🌦️ ⚠️ BAD WEATHER FORECAST detected in next 24h: "
                    f"{', '.join(bad_weather_hours[:3])}"  # Zobrazit max 3
                )
                return True
            else:
                _LOGGER.debug("🌦️ ✅ Weather forecast OK for next 24h")
                return False

        except Exception as e:
            _LOGGER.error(f"🌦️ Error checking weather forecast: {e}")
            return False

    def _find_weather_entity(self) -> Optional[str]:
        """
        Automaticky najde první dostupnou weather entitu v HA.

        Preferuje entity které mají forecast atribut.

        Returns:
            str: Entity ID weather entity nebo None
        """
        try:
            if not self._hass:
                return None

            # Získat všechny weather entity
            weather_entities: List[str] = []

            for state in self._hass.states.async_all("weather"):
                entity_id = state.entity_id

                # Preferujeme entity s forecast
                if state.attributes.get("forecast"):
                    _LOGGER.debug(f"🌦️ Found weather entity with forecast: {entity_id}")
                    return entity_id

                weather_entities.append(entity_id)

            # Pokud žádná nemá forecast, vrátíme první
            if weather_entities:
                _LOGGER.debug(
                    f"🌦️ Found weather entity (no forecast): {weather_entities[0]}"
                )
                return weather_entities[0]

            return None

        except Exception as e:
            _LOGGER.error(f"Error finding weather entity: {e}")
            return None

    # ========== METODY PRO ČTENÍ DAT ZE SENZORŮ ==========

    def _get_existing_solar_forecast(self) -> Dict[str, Any]:
        """
        Načte data z existujícího solar forecast senzoru.

        Returns:
            Dict s hodinovými předpověďmi FVE výroby
        """
        if not self._hass:
            return {}

        # Senzor s hodinovou FVE předpovědí
        solar_sensor_id = "sensor.hourly_real_fve_total_kwh"
        solar_state = self._hass.states.get(solar_sensor_id)

        if not solar_state:
            _LOGGER.warning(f"Solar forecast sensor {solar_sensor_id} not found")
            return {}

        # Získat hodinová data z atributů
        today_hourly = solar_state.attributes.get("today_hourly_total_kw", {})
        tomorrow_hourly = solar_state.attributes.get("tomorrow_hourly_total_kw", {})

        return {
            "today_hourly_total_kw": today_hourly,
            "tomorrow_hourly_total_kw": tomorrow_hourly,
        }

    def _get_existing_consumption_stats(self) -> Dict[str, Any]:
        """
        Načte statistiky spotřeby z analytics senzoru.

        Returns:
            Dict s průměrnou hodinovou spotřebou
        """
        if not self._hass:
            return {"average_hourly_kwh": 0.5}

        # Analytics senzor se spotřebou
        analytics_sensor_id = f"sensor.oig_{self._box_id}_analytics"
        analytics_state = self._hass.states.get(analytics_sensor_id)

        if not analytics_state:
            _LOGGER.debug(
                f"Analytics sensor {analytics_sensor_id} not found, using default consumption"
            )
            return {"average_hourly_kwh": 0.5}

        # Průměrná spotřeba z posledních 30 dní
        consumption_30d = analytics_state.attributes.get("consumption_30d_kwh", 0)

        # Převést na hodinový průměr
        average_hourly = consumption_30d / (30 * 24) if consumption_30d > 0 else 0.5

        return {
            "average_hourly_kwh": round(average_hourly, 2),
            "consumption_30d_kwh": consumption_30d,
        }

    def _get_current_battery_state(self) -> Dict[str, Any]:
        """
        Načte aktuální stav baterie ze senzorů.

        Returns:
            Dict s aktuální kapacitou a maximem
        """
        if not self._hass:
            return {"current_kwh": 0, "max_kwh": 10.0}

        # Senzor s aktuální kapacitou
        capacity_sensor_id = f"sensor.oig_{self._box_id}_remaining_usable_capacity"
        capacity_state = self._hass.states.get(capacity_sensor_id)

        current_kwh = 0.0
        if capacity_state and capacity_state.state not in ["unknown", "unavailable"]:
            try:
                current_kwh = float(capacity_state.state)
            except (ValueError, TypeError):
                current_kwh = 0.0

        # Maximální kapacita z konfigurace nebo default
        max_kwh = self._config_entry.options.get("battery_capacity_kwh", 10.0)

        return {
            "current_kwh": current_kwh,
            "max_kwh": max_kwh,
            "current_percent": (
                round((current_kwh / max_kwh * 100), 1) if max_kwh > 0 else 0
            ),
        }

    def _get_existing_spot_prices(self) -> Dict[str, float]:
        """
        Načte spotové ceny z 15min spot price senzoru.

        Returns:
            Dict {timestamp: price_czk_kwh}
        """
        if not self._hass:
            return {}

        # 15min spot price senzor
        spot_sensor_id = f"sensor.oig_{self._box_id}_spot_price_current_15min"
        spot_state = self._hass.states.get(spot_sensor_id)

        if not spot_state:
            _LOGGER.debug(f"Spot price sensor {spot_sensor_id} not found")
            return {}

        # Získat hodinové ceny z atributů
        prices = spot_state.attributes.get("prices", [])

        if not prices:
            return {}

        # Převést na dict {timestamp: price}
        spot_prices: Dict[str, float] = {}

        for interval in prices:
            date = interval.get("date")
            time = interval.get("time")
            price = interval.get("price")

            if date and time and price is not None:
                # Vytvořit ISO timestamp
                timestamp = f"{date}T{time}:00"
                spot_prices[timestamp] = price

        return spot_prices

    def _calculate_simple_battery_forecast(
        self,
        solar_forecast: Dict[str, Any],
        consumption_stats: Dict[str, Any],
        battery_state: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Jednoduchý výpočet predikce baterie bez nabíjení ze sítě.

        Args:
            solar_forecast: Hodinová předpověď FVE
            consumption_stats: Statistiky spotřeby
            battery_state: Aktuální stav baterie

        Returns:
            Dict s předpovědí kapacity po hodinách
        """
        now = datetime.now()
        current_capacity = battery_state.get("current_kwh", 0)
        max_capacity = battery_state.get("max_kwh", 10.0)
        average_consumption = consumption_stats.get("average_hourly_kwh", 0.5)

        today_solar = solar_forecast.get("today_hourly_total_kw", {})
        tomorrow_solar = solar_forecast.get("tomorrow_hourly_total_kw", {})

        # Spojená časová řada
        continuous_forecast: Dict[str, float] = {}
        capacity = current_capacity

        # Zpracovat dnes + zítra (48 hodin)
        for hour_offset in range(48):
            target_time = now + timedelta(hours=hour_offset)
            hour_key = f"{target_time.hour:02d}:00"
            date_str = target_time.strftime("%Y-%m-%d")
            timestamp = f"{date_str}T{target_time.hour:02d}:00:00"

            # Získat FVE výrobu pro tuto hodinu
            if target_time.date() == now.date():
                solar_kwh = today_solar.get(hour_key, 0)
            else:
                solar_kwh = tomorrow_solar.get(hour_key, 0)

            # Bilance: FVE - spotřeba
            net_kwh = solar_kwh - average_consumption

            # Aktualizovat kapacitu
            capacity += net_kwh

            # Omezit na rozsah 0 - max
            capacity = max(0, min(capacity, max_capacity))

            continuous_forecast[timestamp] = round(capacity, 2)

        # Rozdělit na dny
        result = self._split_forecast_by_days(continuous_forecast)

        return result

    def _identify_peak_hours(
        self,
        spot_prices: Dict[str, float],
        percentile_threshold: float,
        max_price: float,
    ) -> Dict[str, bool]:
        """
        Identifikuje peak/off-peak hodiny podle spotových cen.

        Peak hodiny = ceny nad percentil threshold NEBO nad max_price

        Args:
            spot_prices: Spotové ceny {timestamp: price}
            percentile_threshold: Percentil pro určení peak (75.0 = top 25%)
            max_price: Maximální cena pro off-peak

        Returns:
            Dict {timestamp: is_peak}
        """
        if not spot_prices:
            return {}

        prices_list = list(spot_prices.values())

        # Vypočítat percentil
        prices_sorted = sorted(prices_list)
        percentile_index = int(len(prices_sorted) * (percentile_threshold / 100.0))
        percentile_price = (
            prices_sorted[percentile_index] if prices_sorted else max_price
        )

        # Použít nižší z obou limitů
        effective_limit = min(percentile_price, max_price)

        _LOGGER.debug(
            f"🔋 Peak identification: percentile {percentile_threshold}% = {percentile_price:.2f} CZK/kWh, "
            f"max_price = {max_price:.2f} CZK/kWh, using {effective_limit:.2f} CZK/kWh"
        )

        # Označit hodiny
        peak_hours: Dict[str, bool] = {}
        for timestamp, price in spot_prices.items():
            peak_hours[timestamp] = price > effective_limit

        return peak_hours

    def _recalculate_forecast_with_charging(
        self,
        base_forecast: Dict[str, float],
        charging_hours: List[str],
        charge_rate_kw: float,
        max_capacity_kwh: float,
    ) -> Dict[str, float]:
        """
        Přepočítá forecast baterie s přidáním nabíjení ze sítě.

        Args:
            base_forecast: Základní forecast bez nabíjení {timestamp: kwh}
            charging_hours: Seznam timestampů kdy nabíjet
            charge_rate_kw: Nabíjecí výkon [kW]
            max_capacity_kwh: Maximální kapacita baterie

        Returns:
            Dict {timestamp: kwh} s přepočítaným forecastem
        """
        optimized_forecast: Dict[str, float] = {}

        for timestamp in sorted(base_forecast.keys()):
            base_capacity = base_forecast[timestamp]

            # Pokud je toto nabíjecí hodina, přidat nabití
            if timestamp in charging_hours:
                # Nabít o charge_rate_kw (za 1 hodinu)
                new_capacity = base_capacity + charge_rate_kw
                # Omezit na maximum
                new_capacity = min(new_capacity, max_capacity_kwh)
                optimized_forecast[timestamp] = round(new_capacity, 2)
            else:
                optimized_forecast[timestamp] = base_capacity

        # Vrátit jen dict, ne strukturu s klíčem "continuous"
        return optimized_forecast

    def _create_combined_timeline(
        self,
        solar_forecast: Dict[str, Any],
        battery_forecast: Dict[str, Any],
        spot_prices: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """
        Vytvoří spojenou časovou řadu pro dashboard.

        Args:
            solar_forecast: FVE předpověď
            battery_forecast: Předpověď baterie
            spot_prices: Spotové ceny

        Returns:
            List timeline bodů
        """
        timeline: List[Dict[str, Any]] = []

        # Získat continuous forecast
        continuous_battery = battery_forecast.get("continuous", {})

        for timestamp in sorted(continuous_battery.keys()):
            battery_kwh = continuous_battery[timestamp]

            # Najít odpovídající spotovou cenu
            spot_price = spot_prices.get(timestamp)

            timeline.append(
                {
                    "timestamp": timestamp,
                    "battery_kwh": battery_kwh,
                    "spot_price_czk": spot_price,
                }
            )

        return timeline
