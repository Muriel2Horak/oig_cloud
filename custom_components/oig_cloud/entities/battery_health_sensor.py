"""Battery Health Monitoring - ZJEDNODUŠENÁ VERZE.

Algoritmus:
1. Jednou denně (v 01:00) analyzuje posledních 10 dní z recorder states
2. Najde intervaly kde SoC MONOTÓNNĚ ROSTE (nikdy neklesne) o ≥50%
3. Kapacita = (charge_month[konec] - charge_month[začátek]) / delta_soc
4. Výsledky ukládá do HA Storage

Žádné online sledování, žádné SoH limity, žádná kontrola discharge.
"""

import asyncio
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

# Storage version
STORAGE_VERSION = 1
STORAGE_KEY_PREFIX = "oig_cloud.battery_health"


@dataclass
class CapacityMeasurement:
    """Jedno měření kapacity baterie."""

    timestamp: str  # ISO format
    start_soc: float
    end_soc: float
    delta_soc: float
    charge_energy_wh: float
    capacity_kwh: float
    soh_percent: float
    duration_hours: float


class BatteryHealthTracker:
    """Tracker pro měření kapacity baterie z historie."""

    def __init__(
        self,
        hass: HomeAssistant,
        box_id: str,
        nominal_capacity_kwh: float = 15.3,  # kWh - skutečná kapacita baterie
    ) -> None:
        self._recorder_days = 10
        self._stats_backfill_days = 120
        self._min_delta_soc = 50
        self._min_duration_hours = 3.0
        self._min_charge_wh = 2000
        self._soc_drop_tolerance = 1.5
        self._hass = hass
        self._box_id = box_id
        self._nominal_capacity_kwh = nominal_capacity_kwh

        # HA Storage
        self._store = Store(hass, STORAGE_VERSION, f"{STORAGE_KEY_PREFIX}_{box_id}")
        self._measurements: List[CapacityMeasurement] = []
        self._last_analysis: Optional[datetime] = None
        self._stats_backfill_until: Optional[datetime] = None

        _LOGGER.info(
            f"BatteryHealthTracker initialized, nominal capacity: {nominal_capacity_kwh:.2f} kWh"
        )

    async def async_load_from_storage(self) -> None:
        """Načíst uložená měření ze storage."""
        try:
            data = await self._store.async_load()
            if data:
                self._measurements = [
                    CapacityMeasurement(**m) for m in data.get("measurements", [])
                ]
                if data.get("last_analysis"):
                    self._last_analysis = datetime.fromisoformat(data["last_analysis"])
                if data.get("stats_backfill_until"):
                    self._stats_backfill_until = datetime.fromisoformat(
                        data["stats_backfill_until"]
                    )
                _LOGGER.info(
                    f"Loaded {len(self._measurements)} measurements from storage"
                )
        except Exception as e:
            _LOGGER.error(f"Error loading from storage: {e}")

    async def async_save_to_storage(self) -> None:
        """Uložit měření do storage."""
        try:
            data = {
                "measurements": [
                    asdict(m) for m in self._measurements[-100:]
                ],  # Max 100
                "last_analysis": (
                    self._last_analysis.isoformat() if self._last_analysis else None
                ),
                "stats_backfill_until": (
                    self._stats_backfill_until.isoformat()
                    if self._stats_backfill_until
                    else None
                ),
                "nominal_capacity_kwh": self._nominal_capacity_kwh,
            }
            await self._store.async_save(data)
            _LOGGER.debug(f"Saved {len(self._measurements)} measurements to storage")
        except Exception as e:
            _LOGGER.error(f"Error saving to storage: {e}")

    async def analyze_last_10_days(self) -> List[CapacityMeasurement]:
        """
        Analyzovat posledních 10 dní a najít čisté nabíjecí cykly.

        Returns:
            List nových měření
        """
        from homeassistant.components.recorder import get_instance
        from homeassistant.components.recorder.history import get_significant_states

        end_time = dt_util.now()
        start_time = end_time - timedelta(days=self._recorder_days)

        _LOGGER.info(f"Analyzing {start_time} to {end_time} for clean charging cycles")

        # Entity IDs - batt_bat_c je správný název (ne bat_c)
        soc_sensor = f"sensor.oig_{self._box_id}_batt_bat_c"
        charge_sensor = f"sensor.oig_{self._box_id}_computed_batt_charge_energy_month"

        try:
            # Načíst historii z recorder
            history = await get_instance(self._hass).async_add_executor_job(
                get_significant_states,
                self._hass,
                start_time,
                end_time,
                [soc_sensor, charge_sensor],
                None,  # filters
                True,  # include_start_time_state
            )

            if not history:
                _LOGGER.warning("No history data found")
                return []

            soc_states = history.get(soc_sensor, [])
            charge_states = history.get(charge_sensor, [])

            if not soc_states or not charge_states:
                _LOGGER.warning("Missing sensor data in history")
                return []

            _LOGGER.info(
                f"Found {len(soc_states)} SoC states, {len(charge_states)} charge states"
            )

            # Najít monotónní nabíjecí intervaly
            cycles = self._find_monotonic_charging_intervals(soc_states)
            _LOGGER.info(
                f"Found {len(cycles)} monotonic charging intervals (ΔSoC ≥50%)"
            )

            # Pro každý interval spočítat kapacitu
            new_measurements = []
            for start_time_cycle, end_time_cycle, start_soc, end_soc in cycles:
                measurement = self._calculate_capacity(
                    start_time_cycle,
                    end_time_cycle,
                    start_soc,
                    end_soc,
                    charge_states,
                )
                if measurement:
                    # Zkontrolovat duplicity
                    is_duplicate = any(
                        m.timestamp == measurement.timestamp for m in self._measurements
                    )
                    if not is_duplicate:
                        self._measurements.append(measurement)
                        new_measurements.append(measurement)

            self._last_analysis = dt_util.now()

            if new_measurements:
                await self.async_save_to_storage()
                _LOGGER.info(f"Found {len(new_measurements)} new clean charging cycles")

            return new_measurements

        except Exception as e:
            _LOGGER.error(f"Error analyzing history: {e}", exc_info=True)
            return []

    async def backfill_from_statistics(self) -> List[CapacityMeasurement]:
        """Backfill starších dat z recorder statistics."""
        if self._stats_backfill_until is not None:
            return []

        end_time = dt_util.now() - timedelta(days=self._recorder_days)
        start_time = end_time - timedelta(days=self._stats_backfill_days)
        if start_time >= end_time:
            return []

        soc_sensor = f"sensor.oig_{self._box_id}_batt_bat_c"
        charge_sensor = f"sensor.oig_{self._box_id}_computed_batt_charge_energy_month"

        try:
            from homeassistant.components.recorder.statistics import (
                statistics_during_period,
            )
        except Exception as exc:
            _LOGGER.warning("Statistics not available: %s", exc)
            return []

        stats = await self._hass.async_add_executor_job(
            statistics_during_period,
            self._hass,
            start_time,
            end_time,
            {soc_sensor, charge_sensor},
            "day",
            None,
            {"mean", "max", "sum", "state"},
        )

        soc_points = self._extract_soc_points(stats.get(soc_sensor) if stats else None)
        charge_points = self._extract_charge_points(
            stats.get(charge_sensor) if stats else None
        )

        if not soc_points or not charge_points:
            _LOGGER.warning("Statistics backfill missing data")
            return []

        intervals = self._find_monotonic_intervals_from_points(soc_points)
        new_measurements: List[CapacityMeasurement] = []

        for start_time_cycle, end_time_cycle, start_soc, end_soc in intervals:
            charge_start = self._nearest_value(charge_points, start_time_cycle)
            charge_end = self._nearest_value(charge_points, end_time_cycle)
            if charge_start is None or charge_end is None:
                continue
            charge_energy = charge_end - charge_start
            if charge_energy < 0:
                continue
            measurement = self._build_measurement(
                start_time_cycle, end_time_cycle, start_soc, end_soc, charge_energy
            )
            if measurement and not any(
                m.timestamp == measurement.timestamp for m in self._measurements
            ):
                self._measurements.append(measurement)
                new_measurements.append(measurement)

        if new_measurements:
            self._stats_backfill_until = end_time
            await self.async_save_to_storage()
            _LOGGER.info(
                "Backfilled %d measurements from statistics", len(new_measurements)
            )
        return new_measurements

    def _find_monotonic_charging_intervals(self, soc_states: List) -> List[tuple]:
        """
        Najít intervaly kde SoC MONOTÓNNĚ ROSTE (nikdy neklesne) o ≥50%.

        Returns:
            List of (start_time, end_time, start_soc, end_soc)
        """
        intervals: List[tuple] = []

        interval_start_time = None
        interval_start_soc = None
        interval_max_soc = None
        last_soc = None
        prev_timestamp = None

        for state in soc_states:
            if state.state in ["unknown", "unavailable"]:
                continue

            try:
                soc = float(state.state)
                timestamp = state.last_changed
            except (ValueError, TypeError):
                continue

            if last_soc is None:
                interval_start_time = timestamp
                interval_start_soc = soc
                interval_max_soc = soc
            elif soc >= last_soc - self._soc_drop_tolerance:
                interval_max_soc = soc
            else:
                self._maybe_add_interval(
                    intervals,
                    interval_start_time,
                    prev_timestamp,
                    interval_start_soc,
                    interval_max_soc,
                    self._min_duration_hours,
                )
                interval_start_time = timestamp
                interval_start_soc = soc
                interval_max_soc = soc

            prev_timestamp = timestamp
            last_soc = soc

        self._maybe_add_interval(
            intervals,
            interval_start_time,
            prev_timestamp,
            interval_start_soc,
            interval_max_soc,
            self._min_duration_hours,
        )

        return intervals

    @staticmethod
    def _maybe_add_interval(
        intervals: List[tuple],
        start_time: Optional[datetime],
        end_time: Optional[datetime],
        start_soc: Optional[float],
        end_soc: Optional[float],
        min_duration_hours: float,
    ) -> None:
        if start_soc is None or end_soc is None or start_time is None:
            return
        delta_soc = end_soc - start_soc
        if delta_soc < self._min_delta_soc or end_time is None:
            return
        duration_hours = (end_time - start_time).total_seconds() / 3600
        if duration_hours < min_duration_hours:
            return
        intervals.append((start_time, end_time, start_soc, end_soc))
        _LOGGER.debug(
            "Found interval: %.0f%%→%.0f%% (Δ%.0f%%)",
            start_soc,
            end_soc,
            delta_soc,
        )

    def _extract_soc_points(
        self, stats: Optional[List[Dict[str, Any]]]
    ) -> List[tuple]:
        if not stats:
            return []
        points = []
        for item in stats:
            timestamp = self._parse_stat_time(item)
            if not timestamp:
                continue
            value = item.get("max")
            if value is None:
                value = item.get("mean")
            if value is None:
                continue
            try:
                points.append((timestamp, float(value)))
            except (ValueError, TypeError):
                continue
        return sorted(points, key=lambda x: x[0])

    def _extract_charge_points(
        self, stats: Optional[List[Dict[str, Any]]]
    ) -> List[tuple]:
        if not stats:
            return []
        points = []
        for item in stats:
            timestamp = self._parse_stat_time(item)
            if not timestamp:
                continue
            value = item.get("state")
            if value is None:
                value = item.get("sum")
            if value is None:
                value = item.get("max")
            if value is None:
                value = item.get("mean")
            if value is None:
                continue
            try:
                points.append((timestamp, float(value)))
            except (ValueError, TypeError):
                continue
        return sorted(points, key=lambda x: x[0])

    @staticmethod
    def _parse_stat_time(item: Dict[str, Any]) -> Optional[datetime]:
        value = item.get("start") or item.get("start_time")
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            parsed = dt_util.parse_datetime(value)
            if parsed:
                return parsed
        return None

    @staticmethod
    def _nearest_value(points: List[tuple], target_time: datetime) -> Optional[float]:
        if not points:
            return None
        return min(points, key=lambda p: abs((p[0] - target_time).total_seconds()))[1]

    def _find_monotonic_intervals_from_points(self, points: List[tuple]) -> List[tuple]:
        intervals: List[tuple] = []
        if not points:
            return intervals

        interval_start_time = None
        interval_start_soc = None
        interval_max_soc = None
        last_soc = None
        prev_timestamp = None

        for timestamp, soc in points:
            if last_soc is None:
                interval_start_time = timestamp
                interval_start_soc = soc
                interval_max_soc = soc
            elif soc >= last_soc - self._soc_drop_tolerance:
                interval_max_soc = soc
            else:
                self._maybe_add_interval(
                    intervals,
                    interval_start_time,
                    prev_timestamp,
                    interval_start_soc,
                    interval_max_soc,
                    self._min_duration_hours,
                )
                interval_start_time = timestamp
                interval_start_soc = soc
                interval_max_soc = soc

            prev_timestamp = timestamp
            last_soc = soc

        self._maybe_add_interval(
            intervals,
            interval_start_time,
            prev_timestamp,
            interval_start_soc,
            interval_max_soc,
            self._min_duration_hours,
        )

        return intervals

    def _calculate_capacity(
        self,
        start_time: datetime,
        end_time: datetime,
        start_soc: float,
        end_soc: float,
        charge_states: List,
    ) -> Optional[CapacityMeasurement]:
        """
        Spočítat kapacitu pro monotónní nabíjecí interval.

        capacity = charge_energy / delta_soc
        """
        # Získat hodnoty charge_month na začátku a konci
        charge_start = self._get_value_at_time(charge_states, start_time)
        charge_end = self._get_value_at_time(charge_states, end_time)

        if charge_start is None or charge_end is None:
            _LOGGER.debug(
                f"Missing charge values for interval {start_time} → {end_time}"
            )
            return None

        charge_energy = charge_end - charge_start
        return self._build_measurement(
            start_time, end_time, start_soc, end_soc, charge_energy
        )

    def _resolve_charging_efficiency(self) -> float:
        efficiency_sensor = f"sensor.oig_{self._box_id}_battery_efficiency"
        efficiency_state = self._hass.states.get(efficiency_sensor)
        if efficiency_state and efficiency_state.state not in [
            "unknown",
            "unavailable",
        ]:
            try:
                round_trip_eff = float(efficiency_state.state) / 100.0
                return round_trip_eff**0.5
            except (ValueError, TypeError):
                return 0.97
        return 0.97

    def _build_measurement(
        self,
        start_time: datetime,
        end_time: datetime,
        start_soc: float,
        end_soc: float,
        charge_energy: float,
    ) -> Optional[CapacityMeasurement]:
        # Kontrola resetu měsíce (záporná hodnota = reset)
        if charge_energy < 0:
            _LOGGER.debug("Interval rejected: charge_month reset detected")
            return None

        # Kontrola minimální energie (filtr šumu)
        if charge_energy < self._min_charge_wh:
            _LOGGER.debug(
                f"Interval rejected: too little energy ({charge_energy:.0f} Wh)"
            )
            return None

        charging_efficiency = self._resolve_charging_efficiency()
        stored_energy = charge_energy * charging_efficiency

        delta_soc = end_soc - start_soc
        if delta_soc < self._min_delta_soc:
            return None

        capacity_kwh = (stored_energy / 1000.0) / (delta_soc / 100.0)
        soh_percent = (capacity_kwh / self._nominal_capacity_kwh) * 100.0

        if soh_percent > 105.0:
            _LOGGER.warning(
                f"Interval rejected: SoH {soh_percent:.1f}% > 105%% (measurement error), "
                f"capacity={capacity_kwh:.2f} kWh, ΔSoC={delta_soc:.0f}%, "
                f"charge={charge_energy:.0f} Wh, eff={charging_efficiency:.1%}"
            )
            return None
        if soh_percent < 70.0:
            _LOGGER.warning(
                f"Interval rejected: SoH {soh_percent:.1f}% < 70%% (extreme degradation or error), "
                f"capacity={capacity_kwh:.2f} kWh, ΔSoC={delta_soc:.0f}%, "
                f"charge={charge_energy:.0f} Wh, eff={charging_efficiency:.1%}"
            )
            return None

        soh_percent = min(soh_percent, 100.0)

        duration = end_time - start_time
        duration_hours = duration.total_seconds() / 3600
        if duration_hours < self._min_duration_hours:
            return None

        measurement = CapacityMeasurement(
            timestamp=end_time.isoformat(),
            start_soc=start_soc,
            end_soc=end_soc,
            delta_soc=delta_soc,
            charge_energy_wh=charge_energy,
            capacity_kwh=round(capacity_kwh, 3),
            soh_percent=round(soh_percent, 1),
            duration_hours=round(duration_hours, 2),
        )

        _LOGGER.info(
            f"✅ Valid interval: {start_soc:.0f}%→{end_soc:.0f}% (Δ{delta_soc:.0f}%), "
            f"charge={charge_energy:.0f} Wh (stored={stored_energy:.0f} Wh @{charging_efficiency:.1%}), "
            f"capacity={capacity_kwh:.2f} kWh, SoH={soh_percent:.1f}%"
        )

        return measurement

    def _get_value_at_time(
        self, states: List, target_time: datetime
    ) -> Optional[float]:
        """Získat hodnotu sensoru nejblíže k target_time."""
        if not states:
            return None

        closest_state = min(
            states,
            key=lambda s: abs((s.last_changed - target_time).total_seconds()),
        )

        try:
            return float(closest_state.state)
        except (ValueError, TypeError):
            return None

    def get_current_soh(self) -> Optional[float]:
        """Získat aktuální SoH (průměr z posledních měření)."""
        if not self._measurements:
            return None

        # Průměr z posledních 5 měření s jednoduchým filtrem odlehlých hodnot.
        recent = self._measurements[-5:]
        if len(recent) < 2:
            return None
        values = [m.soh_percent for m in recent]
        sorted_values = sorted(values)
        mid = len(sorted_values) // 2
        if len(sorted_values) % 2 == 0:
            median = (sorted_values[mid - 1] + sorted_values[mid]) / 2
        else:
            median = sorted_values[mid]
        filtered = [v for v in values if abs(v - median) <= 5.0]
        if not filtered:
            filtered = values
        return sum(filtered) / len(filtered)

    def get_current_capacity(self) -> Optional[float]:
        """Získat aktuální kapacitu (průměr z posledních měření)."""
        if not self._measurements:
            return None

        recent = self._measurements[-5:]
        if len(recent) < 2:
            return None
        values = [m.capacity_kwh for m in recent]
        sorted_values = sorted(values)
        mid = len(sorted_values) // 2
        if len(sorted_values) % 2 == 0:
            median = (sorted_values[mid - 1] + sorted_values[mid]) / 2
        else:
            median = sorted_values[mid]
        filtered = [v for v in values if abs(v - median) <= 1.0]
        if not filtered:
            filtered = values
        return sum(filtered) / len(filtered)


class BatteryHealthSensor(CoordinatorEntity, SensorEntity):
    """Sensor pro zobrazení zdraví baterie."""

    _attr_has_entity_name = True
    _attr_native_unit_of_measurement = "%"
    _attr_device_class = SensorDeviceClass.BATTERY
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:battery-heart-variant"

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        """Initialize battery health sensor."""
        super().__init__(coordinator)

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._device_info_dict = device_info
        self._hass_ref: Optional[HomeAssistant] = hass or getattr(
            coordinator, "hass", None
        )

        # Stabilní box_id resolution (config entry → proxy → coordinator numeric keys)
        try:
            from .base_sensor import resolve_box_id

            self._box_id = resolve_box_id(coordinator)
        except Exception:
            self._box_id = "unknown"

        self._attr_unique_id = f"oig_cloud_{self._box_id}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_name = "Battery Health (SoH)"

        # Nominální kapacita
        self._nominal_capacity_kwh: float = 15.3  # kWh - skutečná kapacita baterie

        # Tracker - bude inicializován v async_added_to_hass
        self._tracker: Optional[BatteryHealthTracker] = None

        # Denní analýza
        self._daily_unsub = None

        _LOGGER.info(f"Battery Health sensor initialized for box {self._box_id}")

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA."""
        await super().async_added_to_hass()

        # Inicializovat tracker
        self._tracker = BatteryHealthTracker(
            hass=self.hass,
            box_id=self._box_id,
            nominal_capacity_kwh=self._nominal_capacity_kwh,
        )

        # Načíst ze storage
        await self._tracker.async_load_from_storage()

        # Naplánovat denní analýzu v 01:00
        self._daily_unsub = async_track_time_change(
            self.hass, self._daily_analysis, hour=1, minute=0, second=0
        )
        _LOGGER.info("Scheduled daily battery health analysis at 01:00")

        # Spustit analýzu na pozadí (po startu HA)
        self.hass.async_create_task(self._initial_analysis())

    async def async_will_remove_from_hass(self) -> None:
        """Při odstranění z HA."""
        if self._daily_unsub:
            self._daily_unsub()

    async def _initial_analysis(self) -> None:
        """Počáteční analýza po startu."""
        # Počkat 60 sekund na stabilizaci HA
        await asyncio.sleep(60)
        await self._tracker.backfill_from_statistics()
        await self._tracker.analyze_last_10_days()
        self.async_write_ha_state()

    async def _daily_analysis(self, _now: datetime) -> None:
        """Denní analýza v 01:00."""
        _LOGGER.info("Starting daily battery health analysis")
        if self._tracker:
            await self._tracker.analyze_last_10_days()
            self.async_write_ha_state()

    @property
    def device_info(self) -> Dict[str, Any]:
        """Device info."""
        return self._device_info_dict

    @property
    def native_value(self) -> Optional[float]:
        """Vrátit aktuální SoH."""
        if not self._tracker:
            return None
        soh = self._tracker.get_current_soh()
        return round(soh, 1) if soh else None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Extra atributy."""
        if not self._tracker:
            return {"nominal_capacity_kwh": self._nominal_capacity_kwh}

        attrs = {
            "nominal_capacity_kwh": self._nominal_capacity_kwh,
            "measurement_count": len(self._tracker._measurements),
            "last_analysis": (
                self._tracker._last_analysis.isoformat()
                if self._tracker._last_analysis
                else None
            ),
        }

        # Aktuální kapacita
        capacity = self._tracker.get_current_capacity()
        if capacity:
            attrs["current_capacity_kwh"] = round(capacity, 2)
            attrs["capacity_loss_kwh"] = round(self._nominal_capacity_kwh - capacity, 2)

        # Poslední měření
        if self._tracker._measurements:
            recent = self._tracker._measurements[-5:]
            attrs["recent_measurements"] = [
                {
                    "timestamp": m.timestamp,
                    "capacity_kwh": m.capacity_kwh,
                    "soh_percent": m.soh_percent,
                    "delta_soc": m.delta_soc,
                    "charge_wh": m.charge_energy_wh,
                }
                for m in recent
            ]

        return attrs
