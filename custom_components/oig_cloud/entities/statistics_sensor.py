"""Statistics sensor implementation for OIG Cloud integration."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from statistics import median
from typing import Any, Dict, List, Optional, Tuple, Union

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)
MAX_HOURLY_DATA_POINTS = 168


class OigCloudStatisticsSensor(SensorEntity, RestoreEntity):
    """Statistics sensor for OIG Cloud data."""

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        device_info: Dict[str, Any],
    ) -> None:
        """Initialize the statistics sensor."""
        super().__init__()
        self._coordinator = coordinator
        self._sensor_type = sensor_type
        self._device_info = device_info

        # Získáme konfiguraci senzoru
        from ..sensor_types import SENSOR_TYPES

        sensor_config = SENSOR_TYPES.get(sensor_type, {})
        self._sensor_config = sensor_config

        # Stabilní box_id resolution (config entry → proxy → coordinator numeric keys)
        try:
            from .base_sensor import resolve_box_id

            self._data_key = resolve_box_id(coordinator)
        except Exception:
            self._data_key = "unknown"

        # OPRAVA: Konzistentní logika pro názvy jako u ostatních senzorů
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")

        # Preferujeme český název, fallback na anglický, fallback na sensor_type
        self._attr_name = name_cs or name_en or sensor_type

        # OPRAVA: Entity ID používá sensor_type (anglický klíč) a _box_id podle vzoru
        # Unique ID má formát oig_cloud_{boxId}_{sensor} pro konzistenci
        self._attr_unique_id = f"oig_cloud_{self._data_key}_{sensor_type}"
        self._box_id = self._data_key
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"

        self._attr_icon = sensor_config.get("icon")
        self._attr_native_unit_of_measurement = sensor_config.get("unit")

        # Správné nastavení device_class - buď enum nebo None
        device_class = sensor_config.get("device_class")
        if isinstance(device_class, str):
            try:
                self._attr_device_class = getattr(
                    SensorDeviceClass, device_class.upper()
                )
            except AttributeError:
                self._attr_device_class = device_class
        else:
            self._attr_device_class = device_class

        # Správné nastavení state_class - buď enum nebo None
        state_class = sensor_config.get("state_class")
        if isinstance(state_class, str):
            try:
                self._attr_state_class = getattr(SensorStateClass, state_class.upper())
            except AttributeError:
                self._attr_state_class = state_class
        else:
            self._attr_state_class = state_class

        # Správné nastavení entity_category - už je to enum z config
        self._attr_entity_category = sensor_config.get("entity_category")

        # Inicializace datových struktur pro hodinové senzory
        self._hourly_data: List[Dict[str, Any]] = []
        self._last_hour_reset: Optional[datetime] = None
        self._last_source_value: Optional[float] = None
        self._hourly_accumulated_energy: float = 0.0
        self._current_hourly_value: Optional[float] = None

        # Inicializace source_entity_id pro hodinové senzory
        self._source_entity_id: Optional[str] = None
        if self._sensor_type.startswith("hourly_"):
            source_sensor = sensor_config.get("source_sensor")
            if source_sensor:
                self._source_entity_id = f"sensor.oig_{self._data_key}_{source_sensor}"

        # Statistická data pro základní mediánový senzor
        self._sampling_data: List[Tuple[datetime, float]] = []
        self._max_sampling_size: int = 1000
        self._sampling_minutes: int = 10

        # Data pro intervalové statistiky
        self._interval_data: Dict[str, List[float]] = {}
        self._last_interval_check: Optional[datetime] = None
        self._current_interval_data: List[float] = []

        # Storage pro persistentní data
        self._storage_key = f"oig_stats_{self._data_key}_{sensor_type}"

        # Načtení konfigurace senzoru
        if hasattr(self, "_sensor_config"):
            config = self._sensor_config
            self._sampling_minutes = config.get("sampling_minutes", 10)
            self._max_sampling_size = config.get("sampling_size", 1000)
            self._time_range = config.get("time_range")
            self._day_type = config.get("day_type")
            self._statistic = config.get("statistic", "median")
            self._max_age_days = config.get("max_age_days", 30)

        _LOGGER.debug(
            f"[{self.entity_id}] Initialized statistics sensor: {sensor_type}"
        )

    @property
    def device_info(self) -> Optional[Dict[str, Any]]:
        """Return device info - use same as other sensors."""
        return self._device_info

    async def async_added_to_hass(self) -> None:
        """Handle entity which will be added."""
        await super().async_added_to_hass()

        # Načtení persistentních dat
        await self._load_statistics_data()

        # Nastavení pravidelných aktualizací
        if self._sensor_type == "battery_load_median":
            # Základní mediánový senzor - aktualizace každou minutu
            async_track_time_interval(
                self.hass, self._update_sampling_data, timedelta(minutes=1)
            )
        elif self._sensor_type.startswith("hourly_"):
            # Hodinové senzory - kontrola konce hodiny každých 5 minut
            async_track_time_interval(
                self.hass, self._check_hourly_end, timedelta(minutes=5)
            )
            _LOGGER.debug(
                f"[{self.entity_id}] Set up hourly tracking for sensor: {self._sensor_type}"
            )
        elif hasattr(self, "_time_range") and self._time_range is not None:
            # Intervalové senzory - výpočet statistik jednou denně ve 2:00
            from homeassistant.helpers.event import async_track_time_change

            async_track_time_change(
                self.hass, self._daily_statistics_update, hour=2, minute=0, second=0
            )
            _LOGGER.debug(
                f"[{self.entity_id}] Set up daily statistics calculation at 2:00 for time range: {self._time_range}"
            )
            # První výpočet po startu (neblokuj setup – může to trvat dlouho kvůli recorder historii)
            self.hass.async_create_task(self._daily_statistics_update(None))

    async def _load_statistics_data(self) -> None:
        """Načte statistická data z persistentního úložiště."""
        try:
            store = Store(self.hass, version=1, key=self._storage_key)
            data = await store.async_load()

            if data:
                self._restore_sampling_data(data)
                self._restore_interval_data(data)
                self._restore_hourly_data(data)
                self._restore_hourly_state(data)
                self._restore_last_hour_reset(data)

                # Vyčištění starých dat po načtení
                await self._cleanup_old_data()

                _LOGGER.debug(
                    f"[{self.entity_id}] Loaded data - sampling: {len(self._sampling_data)}, "
                    f"hourly: {len(self._hourly_data)}, current_hourly: {self._current_hourly_value}"
                )

                # Okamžitý výpočet stavu po načtení dat
                if self._sampling_data and self._sensor_type == "battery_load_median":
                    initial_state = self._calculate_statistics_value()
                    if initial_state is not None:
                        _LOGGER.debug(
                            f"[{self.entity_id}] Restored median state: {initial_state}W"
                        )
                        self.async_write_ha_state()

                elif (
                    self._sensor_type.startswith("hourly_")
                    and self._current_hourly_value is not None
                ):
                    _LOGGER.debug(
                        f"[{self.entity_id}] Restored hourly state: {self._current_hourly_value} kWh"
                    )
                    self.async_write_ha_state()

        except Exception as e:
            _LOGGER.warning(f"[{self.entity_id}] Failed to load statistics data: {e}")

    def _restore_sampling_data(self, data: Dict[str, Any]) -> None:
        if "sampling_data" in data:
            sampling_list = data["sampling_data"]
            self._sampling_data = self._load_sampling_data(
                sampling_list, self._max_sampling_size
            )

    def _restore_interval_data(self, data: Dict[str, Any]) -> None:
        if "interval_data" in data:
            self._interval_data = data["interval_data"]

    def _restore_hourly_data(self, data: Dict[str, Any]) -> None:
        if "hourly_data" in data:
            self._hourly_data = self._load_hourly_data(data["hourly_data"])

    def _restore_hourly_state(self, data: Dict[str, Any]) -> None:
        if "current_hourly_value" in data:
            self._current_hourly_value = data["current_hourly_value"]
        if "last_source_value" in data:
            self._last_source_value = data["last_source_value"]

    def _restore_last_hour_reset(self, data: Dict[str, Any]) -> None:
        if not data.get("last_hour_reset"):
            return
        try:
            self._last_hour_reset = datetime.fromisoformat(data["last_hour_reset"])
            if self._last_hour_reset.tzinfo is not None:
                self._last_hour_reset = self._last_hour_reset.replace(tzinfo=None)
        except (ValueError, TypeError) as e:
            _LOGGER.warning(
                f"[{self.entity_id}] Invalid last_hour_reset format: {e}"
            )
            self._last_hour_reset = None

    async def _save_statistics_data(self) -> None:
        """Uloží statistická data do persistentního úložiště."""
        try:
            store = Store(self.hass, version=1, key=self._storage_key)

            sampling_data_serializable = self._serialize_sampling_data()
            safe_hourly_data = self._serialize_hourly_data()

            save_data = {
                "sampling_data": sampling_data_serializable,
                "interval_data": self._interval_data,
                "hourly_data": safe_hourly_data,
                "current_hourly_value": self._current_hourly_value,
                "last_source_value": self._last_source_value,
                "last_hour_reset": (
                    self._last_hour_reset.isoformat() if self._last_hour_reset else None
                ),
                "last_update": datetime.now().isoformat(),
            }

            await store.async_save(save_data)
            _LOGGER.debug(f"[{self.entity_id}] Saved statistics data")

        except Exception as e:
            _LOGGER.warning(f"[{self.entity_id}] Failed to save statistics data: {e}")

    async def _cleanup_old_data(self) -> None:
        """Vyčistí stará data podle konfigurace."""
        now = datetime.now()

        # Vyčištění sampling dat - ponechat jen posledních N minut
        if self._sampling_data:
            cutoff_time = now - timedelta(minutes=self._sampling_minutes * 2)
            self._sampling_data = self._filter_sampling_data(cutoff_time)

        # Vyčištění intervalových dat - ponechat jen posledních N dní
        if hasattr(self, "_max_age_days") and self._interval_data:
            cutoff_date = (now - timedelta(days=self._max_age_days)).strftime(
                "%Y-%m-%d"
            )
            keys_to_remove = [
                key for key in self._interval_data.keys() if key < cutoff_date
            ]
            for key in keys_to_remove:
                del self._interval_data[key]

        # Vyčištění hodinových dat - ponechat jen posledních 48 hodin
        if self._hourly_data:
            cutoff_time = now - timedelta(hours=48)
            self._hourly_data = self._filter_hourly_data(cutoff_time)

    async def _update_sampling_data(self, now: datetime) -> None:
        """Aktualizuje sampling data pro základní mediánový senzor."""
        if self._sensor_type != "battery_load_median":
            return

        try:
            # Získání aktuální hodnoty z source senzoru
            source_value = self._get_actual_load_value()
            if source_value is None:
                return

            # Použití aktuálního lokálního času místo parametru
            now_local = datetime.now()

            # Přidání nového vzorku
            self._sampling_data.append((now_local, source_value))

            # Omezení velikosti dat
            if len(self._sampling_data) > self._max_sampling_size:
                self._sampling_data = self._sampling_data[-self._max_sampling_size :]

            # Vyčištění starých dat - zajistit naive datetime pro porovnání
            cutoff_time = now_local - timedelta(minutes=self._sampling_minutes)
            cleaned_data = []
            for dt, value in self._sampling_data:
                # Převod na naive datetime pokud je timezone-aware
                dt_naive = dt.replace(tzinfo=None) if dt.tzinfo is not None else dt
                if dt_naive > cutoff_time:
                    cleaned_data.append((dt_naive, value))

            self._sampling_data = cleaned_data

            # Aktualizace stavu senzoru
            self.async_write_ha_state()

            # Uložení dat každých 10 vzorků
            if len(self._sampling_data) % 10 == 0:
                await self._save_statistics_data()

            _LOGGER.debug(
                f"[{self.entity_id}] Updated sampling data: {len(self._sampling_data)} points, "
                f"current value: {source_value}W, time: {now_local.strftime('%H:%M:%S')}"
            )

        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error updating sampling data: {e}")

    async def _check_hourly_end(self, now: datetime) -> None:
        """Kontroluje konec hodiny a aktualizuje hodinové senzory."""
        if not self._sensor_type.startswith("hourly_"):
            return

        try:
            if not _should_update_hourly(now, self._last_hour_reset):
                return

            current_hour_naive = _current_hour_naive(now)
            hourly_value = await self._calculate_hourly_energy()
            if hourly_value is None:
                return

            self._current_hourly_value = hourly_value
            previous_hour_naive = _previous_hour_naive(current_hour_naive)
            _append_hourly_record(
                self._hourly_data, previous_hour_naive, hourly_value
            )

            cutoff_time = now - timedelta(hours=48)
            cutoff_naive = cutoff_time.replace(tzinfo=None) if cutoff_time.tzinfo else cutoff_time
            self._hourly_data = self._filter_hourly_data(cutoff_naive)

            self._last_hour_reset = current_hour_naive

            await self._save_statistics_data()
            self.async_write_ha_state()

            _LOGGER.debug(
                "[%s] Hourly update: %.3f kWh for hour ending at %s",
                self.entity_id,
                hourly_value,
                previous_hour_naive.strftime("%H:%M"),
            )

        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error in hourly check: {e}")

    async def _daily_statistics_update(self, now: Optional[datetime]) -> None:
        """Denní aktualizace intervalových statistik z recorder dat."""
        if not hasattr(self, "_time_range") or not self._time_range:
            return

        try:
            _LOGGER.debug(f"[{self.entity_id}] Starting daily statistics calculation")

            # Spočítat medián z posledních 30 dní
            new_value = await self._calculate_interval_statistics_from_history()

            if new_value is not None:
                # Uložit vypočítanou hodnotu
                date_key = datetime.now().strftime("%Y-%m-%d")
                if date_key not in self._interval_data:
                    self._interval_data[date_key] = []

                # Přidat novou hodnotu
                self._interval_data[date_key] = [new_value]

                # Vyčistit staré záznamy (starší než max_age_days + 1 den buffer)
                max_days = getattr(self, "_max_age_days", 14)
                cutoff_date = (datetime.now() - timedelta(days=max_days + 1)).strftime(
                    "%Y-%m-%d"
                )
                self._interval_data = {
                    k: v for k, v in self._interval_data.items() if k >= cutoff_date
                }

                # Uložit data
                await self._save_statistics_data()

                # Aktualizovat stav senzoru
                self.async_write_ha_state()

                _LOGGER.debug(
                    f"[{self.entity_id}] Daily statistics updated: {new_value:.1f}W "
                    f"for interval {self._time_range}"
                )
            else:
                _LOGGER.warning(
                    f"[{self.entity_id}] Daily statistics calculation returned None"
                )

        except Exception as e:
            _LOGGER.error(
                f"[{self.entity_id}] Error in daily statistics update: {e}",
                exc_info=True,
            )

    def _is_correct_day_type(self, dt: datetime) -> bool:
        """Kontroluje zda je správný typ dne (weekday/weekend)."""
        is_weekend = dt.weekday() >= 5

        if hasattr(self, "_day_type"):
            if self._day_type == "weekend":
                return is_weekend
            elif self._day_type == "weekday":
                return not is_weekend

        return True

    async def _calculate_interval_statistics_from_history(  # noqa: C901
        self,
    ) -> Optional[float]:
        """
        Vypočítá statistiku intervalu z historických dat recorder.

        Algoritmus:
        1. Načte data z recorder za posledních 30 dní
        2. Pro každý den vypočítá průměr/medián v daném časovém intervalu
        3. Z těchto 30 denních hodnot spočítá celkový medián

        Returns:
            Medián spotřeby v W pro daný interval, nebo None
        """
        if not hasattr(self, "_time_range") or not self._time_range:
            return None

        try:
            from homeassistant.components.recorder import history

            start_hour, end_hour = self._time_range
            # Zajistit že jsou to int hodnoty
            start_hour = int(start_hour)
            end_hour = int(end_hour)
            source_entity_id = f"sensor.oig_{self._data_key}_actual_aco_p"

            # Časový rozsah - použít max_age_days z konfigurace
            max_days = getattr(self, "_max_age_days", 14)
            end_time = datetime.now()
            start_time = end_time - timedelta(days=max_days)

            _LOGGER.debug(
                f"[{self.entity_id}] Loading history for {source_entity_id} "
                f"from {start_time.date()} to {end_time.date()}"
            )

            # Načíst všechna historická data
            states = await self.hass.async_add_executor_job(
                history.state_changes_during_period,
                self.hass,
                start_time,
                end_time,
                source_entity_id,
            )

            if source_entity_id not in states or not states[source_entity_id]:
                _LOGGER.warning(
                    f"[{self.entity_id}] No historical data found for {source_entity_id}"
                )
                return None

            daily_medians = self._calculate_daily_medians(
                states[source_entity_id],
                start_hour,
                end_hour,
                end_time,
                max_days,
            )

            # Spočítat celkový medián z denních mediánů
            if daily_medians:
                result = median(daily_medians)
                _LOGGER.debug(
                    f"[{self.entity_id}] Calculated interval median: {result:.1f}W "
                    f"from {len(daily_medians)} days (out of {max_days})"
                )
                return round(result, 1)
            else:
                _LOGGER.warning(
                    f"[{self.entity_id}] No valid data found for calculation"
                )
                return None

        except Exception as e:
            _LOGGER.error(
                f"[{self.entity_id}] Error calculating interval statistics: {e}",
                exc_info=True,
            )
            return None

    def _calculate_daily_medians(
        self,
        state_list: List[Any],
        start_hour: int,
        end_hour: int,
        end_time: datetime,
        max_days: int,
    ) -> List[float]:
        daily_medians: List[float] = []
        for days_ago in range(max_days):
            day_date = (end_time - timedelta(days=days_ago)).date()
            if not self._should_include_day(day_date):
                continue
            day_values = self._extract_day_values(
                state_list, day_date, start_hour, end_hour
            )
            if day_values:
                day_median = median(day_values)
                daily_medians.append(day_median)
                _LOGGER.debug(
                    "[%s] Day %s: %s values, median=%.1fW",
                    self.entity_id,
                    day_date,
                    len(day_values),
                    day_median,
                )
        return daily_medians

    def _should_include_day(self, day_date: datetime.date) -> bool:
        day_datetime = datetime.combine(day_date, datetime.min.time())
        is_weekend = day_datetime.weekday() >= 5

        if hasattr(self, "_day_type") and (
            (self._day_type == "weekend" and not is_weekend)
            or (self._day_type == "weekday" and is_weekend)
        ):
            return False
        return True

    def _extract_day_values(
        self,
        state_list: List[Any],
        day_date: datetime.date,
        start_hour: int,
        end_hour: int,
    ) -> List[float]:
        day_values: List[float] = []
        for state in state_list:
            state_time = state.last_updated.replace(tzinfo=None)
            if state_time.date() != day_date:
                continue
            if not self._is_in_interval(state_time.hour, start_hour, end_hour):
                continue
            value = self._safe_state_value(state.state)
            if value is not None:
                day_values.append(value)
        return day_values

    def _is_in_interval(self, hour: int, start_hour: int, end_hour: int) -> bool:
        if end_hour > start_hour:
            return start_hour <= hour < end_hour
        return hour >= start_hour or hour < end_hour

    def _safe_state_value(self, value: Any) -> Optional[float]:
        if value in ("unavailable", "unknown", None):
            return None
        try:
            parsed = float(value)
            return parsed if parsed >= 0 else None
        except (ValueError, TypeError):
            return None

    def _get_actual_load_value(self) -> Optional[float]:
        """Získá aktuální hodnotu odběru ze source senzoru."""
        try:
            # Source sensor pro odběr
            source_entity_id = f"sensor.oig_{self._data_key}_actual_aco_p"
            source_entity = self.hass.states.get(source_entity_id)

            if source_entity and source_entity.state not in (
                "unavailable",
                "unknown",
                None,
            ):
                return float(source_entity.state)

        except (ValueError, TypeError) as e:
            _LOGGER.warning(f"[{self.entity_id}] Error getting load value: {e}")

        return None

    async def _calculate_hourly_energy(self) -> Optional[float]:
        """Vypočítá energii za uplynulou hodinu."""
        if not self._sensor_config or not self._source_entity_id:
            return None

        try:
            source_entity = self.hass.states.get(self._source_entity_id)
            if not source_entity or source_entity.state in (
                "unavailable",
                "unknown",
                None,
            ):
                return None

            current_value = float(source_entity.state)

            # Získání jednotky ze source senzoru
            source_unit = source_entity.attributes.get("unit_of_measurement", "")

            hourly_data_type = self._sensor_config.get(
                "hourly_data_type", "energy_diff"
            )

            if hourly_data_type == "energy_diff":
                energy_diff = _calculate_energy_diff(
                    current_value, self._last_source_value
                )
                self._last_source_value = current_value
                if energy_diff is None:
                    return None
                return _convert_energy_by_unit(
                    self.entity_id, energy_diff, source_unit
                )

            if hourly_data_type == "power_integral":
                return _convert_power_integral(
                    self.entity_id, current_value, source_unit
                )

            return None

        except (ValueError, TypeError) as e:
            _LOGGER.warning(f"[{self.entity_id}] Error calculating hourly energy: {e}")
            return None

    def _calculate_hourly_value(self) -> Optional[float]:
        """Calculate hourly value - vrací uloženou hodnotu z posledního výpočtu."""
        # Pro hodinové senzory vracíme pouze uloženou hodnotu
        # Výpočet se provádí jen na konci hodiny v _calculate_hourly_energy
        return getattr(self, "_current_hourly_value", None)

    def _calculate_statistics_value(self) -> Optional[float]:
        """Calculate statistics value for non-hourly sensors."""
        try:
            if self._sensor_type == "battery_load_median":
                return _calculate_sampling_median(
                    self.entity_id,
                    self._sampling_data,
                    self._sampling_minutes,
                )

            if hasattr(self, "_time_range") and self._time_range:
                return _calculate_interval_median(
                    self.entity_id,
                    self._interval_data,
                )

        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error calculating statistics: {e}")

        return None

    @property
    def state(self) -> Optional[Union[float, str]]:
        """Return the state of the sensor."""
        # Odstraníme závislost na coordinator.data pro statistické senzory
        if self._sensor_type.startswith("hourly_") and self._coordinator.data is None:
            # Pro hodinové senzory zkusíme výpočet i bez coordinator dat
            return self._calculate_hourly_value()

        # Hodinové senzory
        if self._sensor_type.startswith("hourly_"):
            return self._calculate_hourly_value()

        # Ostatní statistické senzory (včetně mediánových)
        return self._calculate_statistics_value()

    @property
    def available(self) -> bool:
        """Return True if sensor is available."""
        # OPRAVA: Kontrola zda jsou statistics povoleny
        entry = getattr(self._coordinator, "config_entry", None)
        options = entry.options if entry else {}
        if isinstance(options, dict):
            statistics_enabled = options.get("enable_statistics", True)
        else:
            statistics_enabled = getattr(options, "enable_statistics", True)

        if not statistics_enabled:
            return False  # Statistics jsou vypnuté - senzor není dostupný

        # Senzor je dostupný pokud má data nebo koordinátor funguje
        if self._sensor_type == "battery_load_median":
            return len(self._sampling_data) > 0 or self._coordinator.data is not None
        elif self._sensor_type.startswith("hourly_"):
            # Hodinové senzory jsou dostupné pokud existuje source entity
            if self._source_entity_id:
                source_entity = self.hass.states.get(self._source_entity_id)
                return source_entity is not None and source_entity.state not in (
                    "unavailable",
                    "unknown",
                )
            return False
        return self._coordinator.data is not None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return extra state attributes."""
        attributes = {}

        try:
            if self._sensor_type == "battery_load_median":
                attributes.update(
                    _build_sampling_attrs(
                        self._sampling_data,
                        self._sampling_minutes,
                        self._max_sampling_size,
                    )
                )
            elif self._sensor_type.startswith("hourly_"):
                attributes.update(
                    _build_hourly_attrs(
                        self.entity_id,
                        self._hourly_data,
                        self._sensor_config,
                    )
                )
            elif hasattr(self, "_time_range") and self._time_range:
                attributes.update(
                    _build_interval_attrs(
                        self._time_range,
                        getattr(self, "_day_type", "unknown"),
                        getattr(self, "_statistic", "median"),
                        getattr(self, "_max_age_days", 30),
                        self._interval_data,
                    )
                )

        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error creating attributes: {e}")
            attributes["error"] = str(e)

        return attributes

    def _load_sampling_data(
        self, sampling_list: List[Tuple[Any, Any]], max_size: int
    ) -> List[Tuple[datetime, float]]:
        samples: List[Tuple[datetime, float]] = []
        for item in sampling_list[-max_size:]:
            try:
                dt = datetime.fromisoformat(item[0])
                if dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
                samples.append((dt, item[1]))
            except (ValueError, TypeError) as err:
                _LOGGER.warning(
                    f"[{self.entity_id}] Skipping invalid sample: {item[0]} - {err}"
                )
        return samples

    def _load_hourly_data(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        safe_hourly_data = []
        for record in raw_data:
            try:
                if (
                    isinstance(record, dict)
                    and "datetime" in record
                    and "value" in record
                ):
                    datetime.fromisoformat(record["datetime"])
                    safe_hourly_data.append(record)
                else:
                    _LOGGER.warning(
                        f"[{self.entity_id}] Invalid hourly record structure: {record}"
                    )
            except (ValueError, TypeError, KeyError) as err:
                _LOGGER.warning(
                    f"[{self.entity_id}] Skipping invalid hourly record: {record} - {err}"
                )
        return safe_hourly_data

    def _serialize_sampling_data(self) -> List[Tuple[str, float]]:
        data: List[Tuple[str, float]] = []
        for dt, value in self._sampling_data:
            if dt.tzinfo is not None:
                dt = dt.replace(tzinfo=None)
            data.append((dt.isoformat(), value))
        return data

    def _serialize_hourly_data(self) -> List[Dict[str, Any]]:
        safe_hourly_data: List[Dict[str, Any]] = []
        for record in self._hourly_data:
            safe_record = {"datetime": "", "value": 0.0}
            try:
                if "datetime" in record:
                    dt = datetime.fromisoformat(record["datetime"])
                    if dt.tzinfo is not None:
                        dt = dt.replace(tzinfo=None)
                    safe_record["datetime"] = dt.isoformat()
                if "value" in record:
                    safe_record["value"] = float(record["value"])
            except (ValueError, TypeError):
                continue
            safe_hourly_data.append(safe_record)
        return safe_hourly_data

    def _filter_sampling_data(self, cutoff_time: datetime) -> List[Tuple[datetime, float]]:
        cleaned: List[Tuple[datetime, float]] = []
        for dt, value in self._sampling_data:
            dt_naive = dt.replace(tzinfo=None) if dt.tzinfo is not None else dt
            if dt_naive > cutoff_time:
                cleaned.append((dt_naive, value))
        return cleaned

    def _filter_hourly_data(self, cutoff_time: datetime) -> List[Dict[str, Any]]:
        cleaned_hourly_data: List[Dict[str, Any]] = []
        for record in self._hourly_data:
            try:
                record_dt = datetime.fromisoformat(record["datetime"])
                record_dt_naive = (
                    record_dt.replace(tzinfo=None)
                    if record_dt.tzinfo is not None
                    else record_dt
                )
                if record_dt_naive > cutoff_time:
                    cleaned_hourly_data.append(record)
            except (ValueError, TypeError, KeyError) as err:
                _LOGGER.warning(
                    f"[{self.entity_id}] Invalid hourly record format: {record} - {err}"
                )
        return cleaned_hourly_data


def _should_update_hourly(now: datetime, last_reset: Optional[datetime]) -> bool:
    if now.minute > 5:
        return False
    current_hour_naive = _current_hour_naive(now)
    last_reset_naive = _naive_dt(last_reset) if last_reset else None
    return last_reset_naive != current_hour_naive


def _current_hour_naive(now: datetime) -> datetime:
    current_hour = now.replace(minute=0, second=0, microsecond=0)
    return _naive_dt(current_hour)


def _previous_hour_naive(current_hour: datetime) -> datetime:
    previous_hour = current_hour - timedelta(hours=1)
    return _naive_dt(previous_hour)


def _naive_dt(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    return value.replace(tzinfo=None) if value.tzinfo is not None else value


def _append_hourly_record(
    hourly_data: List[Dict[str, Any]],
    current_hour: datetime,
    hourly_value: float,
) -> None:
    hourly_data.append(
        {
            "datetime": current_hour.isoformat(),
            "value": hourly_value,
        }
    )
    if len(hourly_data) > MAX_HOURLY_DATA_POINTS:
        del hourly_data[:-MAX_HOURLY_DATA_POINTS]


def _calculate_energy_diff(
    current_value: float, last_value: Optional[float]
) -> Optional[float]:
    if last_value is None:
        return None
    if current_value >= last_value:
        return current_value - last_value
    return current_value


def _convert_energy_by_unit(
    entity_id: str, energy_diff: float, source_unit: str
) -> float:
    unit = source_unit.lower()
    if unit in ["kwh", "kwh"]:
        result = round(energy_diff, 3)
        _LOGGER.debug(
            "[%s] Energy diff: %.3f kWh (source: %s)",
            entity_id,
            energy_diff,
            source_unit,
        )
        return result
    if unit in ["wh", "wh"]:
        result = round(energy_diff / 1000, 3)
        _LOGGER.debug(
            "[%s] Energy diff: %.3f Wh -> %.3f kWh (source: %s)",
            entity_id,
            energy_diff,
            result,
            source_unit,
        )
        return result
    result = round(energy_diff / 1000, 3)
    _LOGGER.warning(
        "[%s] Unknown source unit '%s', assuming Wh. Value: %.3f -> %.3f kWh",
        entity_id,
        source_unit,
        energy_diff,
        result,
    )
    return result


def _convert_power_integral(
    entity_id: str, current_value: float, source_unit: str
) -> float:
    unit = source_unit.lower()
    if unit in ["w", "w", "watt"]:
        result = round(current_value / 1000, 3)
        _LOGGER.debug(
            "[%s] Power integral: %sW -> %s kWh (source: %s)",
            entity_id,
            current_value,
            result,
            source_unit,
        )
        return result
    if unit in ["kw", "kw", "kilowatt"]:
        result = round(current_value, 3)
        _LOGGER.debug(
            "[%s] Power integral: %skW -> %s kWh (source: %s)",
            entity_id,
            current_value,
            result,
            source_unit,
        )
        return result
    result = round(current_value / 1000, 3)
    _LOGGER.warning(
        "[%s] Unknown power unit '%s', assuming W. Value: %sW -> %.3f kWh",
        entity_id,
        source_unit,
        current_value,
        result,
    )
    return result


def _calculate_sampling_median(
    entity_id: str,
    sampling_data: List[Tuple[datetime, float]],
    sampling_minutes: int,
) -> Optional[float]:
    if not sampling_data:
        return None

    now = datetime.now()
    cutoff_time = now - timedelta(minutes=sampling_minutes)
    recent_data = [
        value for dt, value in sampling_data if dt > cutoff_time and value is not None
    ]

    _LOGGER.debug(
        "[%s] Time check: now=%s, cutoff=%s, total_samples=%s, recent_samples=%s",
        entity_id,
        now.strftime("%H:%M:%S"),
        cutoff_time.strftime("%H:%M:%S"),
        len(sampling_data),
        len(recent_data),
    )

    data = (
        recent_data
        if recent_data
        else [value for _, value in sampling_data if value is not None]
    )
    if not data:
        return None
    result = median(data)
    _LOGGER.debug(
        "[%s] Calculated median: %.1fW from %s samples",
        entity_id,
        result,
        len(data),
    )
    return round(result, 1)


def _calculate_interval_median(
    entity_id: str, interval_data: Dict[str, List[float]]
) -> Optional[float]:
    if not interval_data:
        return None
    all_values: List[float] = []
    for date_values in interval_data.values():
        all_values.extend(date_values)
    if not all_values:
        return None
    result = median(all_values)
    _LOGGER.debug(
        "[%s] Calculated interval median: %.1fW from %s historical values",
        entity_id,
        result,
        len(all_values),
    )
    return round(result, 1)


def _build_sampling_attrs(
    sampling_data: List[Tuple[datetime, float]],
    sampling_minutes: int,
    max_sampling_size: int,
) -> Dict[str, Any]:
    attributes = {
        "sampling_points": len(sampling_data),
        "sampling_minutes": sampling_minutes,
        "max_sampling_size": max_sampling_size,
    }
    if sampling_data:
        last_update = max(dt for dt, _ in sampling_data)
        attributes["last_sample"] = last_update.isoformat()
    return attributes


def _build_hourly_attrs(
    entity_id: str,
    hourly_data: List[Dict[str, Any]],
    sensor_config: Dict[str, Any],
) -> Dict[str, Any]:
    attributes = {
        "hourly_data_points": len(hourly_data),
        "source_sensor": sensor_config.get("source_sensor", "unknown"),
        "hourly_data_type": sensor_config.get("hourly_data_type", "unknown"),
    }
    if not hourly_data:
        return attributes

    today_data, yesterday_data = _split_hourly_records(entity_id, hourly_data)
    if today_data:
        attributes["today_hourly"] = today_data
    if yesterday_data:
        attributes["yesterday_hourly"] = yesterday_data

    attributes["today_total"] = round(_sum_hourly_values(today_data), 3)
    attributes["yesterday_total"] = round(_sum_hourly_values(yesterday_data), 3)
    return attributes


def _split_hourly_records(
    entity_id: str, hourly_data: List[Dict[str, Any]]
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    today_data: List[Dict[str, Any]] = []
    yesterday_data: List[Dict[str, Any]] = []

    for record in hourly_data:
        record_time = _parse_record_time(entity_id, record)
        if record_time is None:
            continue
        record_time_naive = (
            record_time.replace(tzinfo=None)
            if record_time.tzinfo is not None
            else record_time
        )
        if record_time_naive >= today_start:
            today_data.append(record)
        elif record_time_naive >= yesterday_start:
            yesterday_data.append(record)

    return today_data, yesterday_data


def _parse_record_time(
    entity_id: str, record: Dict[str, Any]
) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(record["datetime"])
    except (ValueError, TypeError, KeyError) as e:
        _LOGGER.warning(
            "[%s] Invalid record datetime format: %s - %s",
            entity_id,
            record,
            e,
        )
        return None


def _sum_hourly_values(records: List[Dict[str, Any]]) -> float:
    return sum(
        record.get("value", 0.0)
        for record in records
        if isinstance(record.get("value"), (int, float))
    )


def _build_interval_attrs(
    time_range: Tuple[int, int],
    day_type: str,
    statistic: str,
    max_age_days: int,
    interval_data: Dict[str, List[float]],
) -> Dict[str, Any]:
    start_hour, end_hour = time_range
    total_values = sum(len(values) for values in interval_data.values())
    attributes = {
        "time_range": f"{start_hour:02d}:00-{end_hour:02d}:00",
        "day_type": day_type,
        "statistic": statistic,
        "max_age_days": max_age_days,
        "total_days": len(interval_data),
        "total_values": total_values,
    }
    if interval_data:
        attributes["latest_data"] = max(interval_data.keys())
    return attributes


def ensure_timezone_aware(dt: datetime) -> datetime:
    """Ensure datetime object is timezone aware."""
    if dt.tzinfo is None:
        # If naive, assume it's in the local timezone
        return dt_util.as_local(dt)
    return dt


def safe_datetime_compare(dt1: datetime, dt2: datetime) -> bool:
    """Safely compare two datetime objects by ensuring both are timezone aware."""
    try:
        dt1_aware = ensure_timezone_aware(dt1)
        dt2_aware = ensure_timezone_aware(dt2)
        return dt1_aware < dt2_aware
    except Exception as e:
        _LOGGER.warning(f"Error comparing datetimes: {e}")
        return False


def create_hourly_attributes(
    sensor_name: str,
    data_points: List[Dict[str, Any]],
    current_time: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Create attributes for hourly sensors with proper timezone handling."""
    try:
        if current_time is None:
            current_time = dt_util.now()

        # Ensure current_time is timezone aware
        current_time = ensure_timezone_aware(current_time)

        attributes = {}

        # Process data points with timezone-aware datetime handling
        filtered_data = []
        for point in data_points:
            if isinstance(point.get("timestamp"), datetime):
                point_time = ensure_timezone_aware(point["timestamp"])
                point["timestamp"] = point_time
                filtered_data.append(point)
            elif isinstance(point.get("time"), datetime):
                point_time = ensure_timezone_aware(point["time"])
                point["time"] = point_time
                filtered_data.append(point)

        # Add processed data to attributes
        attributes["data_points"] = len(filtered_data)
        attributes["last_updated"] = current_time.isoformat()

        if filtered_data:
            # Find latest data point safely
            latest_point = max(
                filtered_data,
                key=lambda x: x.get("timestamp") or x.get("time") or current_time,
            )
            latest_time = latest_point.get("timestamp") or latest_point.get("time")
            if latest_time:
                attributes["latest_data_time"] = ensure_timezone_aware(
                    latest_time
                ).isoformat()

        return attributes

    except Exception as e:
        _LOGGER.error(f"[{sensor_name}] Error creating attributes: {e}")
        return {
            "error": str(e),
            "last_updated": dt_util.now().isoformat(),
            "data_points": 0,
        }


class StatisticsProcessor:
    """Process statistics with proper timezone handling."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize statistics processor."""
        self.hass = hass

    def process_hourly_data(
        self, sensor_name: str, raw_data: List[Dict[str, Any]], value_key: str = "value"
    ) -> Dict[str, Any]:
        """Process hourly data with timezone-aware datetime handling."""
        try:
            current_time = dt_util.now()

            # Filter and process data points
            processed_data = [
                processed
                for point in raw_data
                if (processed := self._normalize_point(point)) is not None
            ]

            # Create attributes safely
            attributes = create_hourly_attributes(
                sensor_name, processed_data, current_time
            )

            # Calculate current value
            current_value = self._extract_current_value(processed_data, value_key)

            return {"value": current_value, "attributes": attributes}

        except Exception as e:
            _LOGGER.error(f"[{sensor_name}] Error processing hourly data: {e}")
            return {
                "value": 0.0,
                "attributes": {
                    "error": str(e),
                    "last_updated": dt_util.now().isoformat(),
                },
            }

    def _normalize_point(self, point: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        processed_point = dict(point)
        ts = self._normalize_time_field(processed_point, "timestamp")
        if ts is False:
            return None
        if ts is None:
            ts = self._normalize_time_field(processed_point, "time")
            if ts is False:
                return None
        return processed_point

    def _normalize_time_field(
        self, processed_point: Dict[str, Any], key: str
    ) -> Optional[bool]:
        if key not in processed_point:
            return None
        ts = processed_point[key]
        if isinstance(ts, str):
            try:
                ts = dt_util.parse_datetime(ts)
            except ValueError:
                return False
        elif isinstance(ts, datetime):
            ts = ensure_timezone_aware(ts)
        processed_point[key] = ts
        return True

    @staticmethod
    def _extract_current_value(
        processed_data: List[Dict[str, Any]], value_key: str
    ) -> float:
        if not processed_data:
            return 0.0
        latest_point = processed_data[-1]
        return float(latest_point.get(value_key, 0.0))
