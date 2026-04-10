"""Sensor pro automatickou tvorbu adaptivních profilů spotřeby z historických dat."""

import asyncio
import logging
from collections import defaultdict
from datetime import date, datetime, timedelta
from functools import partial
from typing import Any, Dict, List, Optional, Tuple, cast

import numpy as np
from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

# 72h Consumption Profiling Constants
PROFILE_HOURS = 72  # Délka profilu v hodinách (3 dny)
# Plovoucí okno: matching + predikce = vždy 72h celkem
# Před půlnocí: matching až do předchozí půlnoci (max 48h), predikce až do další půlnoci (min 24h)
# Po půlnoci: matching jen 24h zpět, predikce 48h dopředu

# Similarity scoring weights
WEIGHT_CORRELATION = 0.50  # Correlation coefficient weight
WEIGHT_RMSE = 0.30  # RMSE weight (inverted)
WEIGHT_TOTAL = 0.20  # Total consumption difference weight (inverted)

# Profiling tuning
MAX_REASONABLE_KWH_H = 20.0  # 20 kWh/h (~20 kW) sanity limit
MAX_MISSING_HOURS_PER_DAY = 6  # Maximum hours to interpolate within a day
TOP_MATCHES = 7  # Average top-N profiles for stability
FLOOR_RATIO = 0.35  # Min floor as % of reference consumption
DEFAULT_DAYS_BACK = 90  # Fallback when history start can't be resolved


def _query_hourly_statistics(
    hass: HomeAssistant, sensor_entity_id: str, start_ts: int, end_ts: int
) -> list[Any]:
    """Load hourly statistics rows inside recorder executor context."""
    from homeassistant.components.recorder.statistics import statistics_during_period

    start_time = datetime.fromtimestamp(start_ts, tz=dt_util.UTC)
    end_time = datetime.fromtimestamp(end_ts, tz=dt_util.UTC)
    stats = statistics_during_period(
        hass,
        start_time,
        end_time,
        {sensor_entity_id},
        "hour",
        None,
        {"sum", "mean", "state"},
    )
    return stats.get(sensor_entity_id, []) if stats else []


def _query_earliest_statistics_start(
    hass: HomeAssistant, sensor_entity_id: str
) -> Optional[datetime]:
    """Resolve earliest available statistics timestamp inside recorder executor."""
    from homeassistant.components.recorder.statistics import statistics_during_period

    stats = statistics_during_period(
        hass,
        datetime.fromtimestamp(0, tz=dt_util.UTC),
        dt_util.utcnow(),
        {sensor_entity_id},
        "day",
        None,
        {"sum", "mean", "state"},
    )
    rows = stats.get(sensor_entity_id) if stats else None
    if not rows:
        return None
    first_row = rows[0]
    start = first_row.get("start") or first_row.get("start_time")
    if isinstance(start, datetime):
        return start if start.tzinfo else start.replace(tzinfo=dt_util.UTC)
    if isinstance(start, str):
        parsed = dt_util.parse_datetime(start)
        if parsed is None:
            return None
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=dt_util.UTC)
    if isinstance(start, (int, float)):
        timestamp = float(start)
        if timestamp > 1_000_000_000_000:
            timestamp /= 1000.0
        return datetime.fromtimestamp(timestamp, tz=dt_util.UTC)
    return None


def _get_season(dt: datetime) -> str:
    """Určit roční období z data."""
    month = dt.month
    if month in [12, 1, 2]:
        return "winter"
    elif month in [3, 4, 5]:
        return "spring"
    elif month in [6, 7, 8]:
        return "summer"
    else:
        return "autumn"


def _generate_profile_name(
    hourly_consumption: List[float], season: str, is_weekend: bool
) -> str:
    """
    Generuje lidsky čitelný název profilu na základě charakteristik spotřeby.

    Args:
        hourly_consumption: 24h profil hodinové spotřeby [kWh]
        season: roční období ('winter', 'spring', 'summer', 'autumn')
        is_weekend: True pokud jde o víkend

    Returns:
        Lidsky čitelný název (např. "Pracovní den s topením", "Víkend s praním")
    """
    if not hourly_consumption or len(hourly_consumption) != 24:
        return "Neznámý profil"

    day_name = "Víkend" if is_weekend else "Pracovní den"

    stats = _profile_consumption_stats(hourly_consumption)
    special_tags = _profile_special_tags(season, is_weekend, stats)
    if special_tags:
        special_name = _profile_special_name(day_name, special_tags[0])
        if special_name:
            return special_name

    return _profile_spike_name(day_name, stats)


def _profile_consumption_stats(hourly_consumption: List[float]) -> Dict[str, float]:
    """Compute basic averages and spike markers for a daily profile."""
    total = sum(hourly_consumption)
    daily_avg = total / 24
    morning_avg = float(np.mean(hourly_consumption[6:12]))
    afternoon_avg = float(np.mean(hourly_consumption[12:18]))
    evening_avg = float(np.mean(hourly_consumption[18:24]))
    night_avg = float(np.mean(hourly_consumption[0:6]))
    return {
        "daily_avg": daily_avg,
        "morning_avg": morning_avg,
        "afternoon_avg": afternoon_avg,
        "evening_avg": evening_avg,
        "night_avg": night_avg,
        "has_morning_spike": morning_avg > daily_avg * 1.3,
        "has_evening_spike": evening_avg > daily_avg * 1.3,
        "has_afternoon_spike": afternoon_avg > daily_avg * 1.3,
    }


def _profile_special_tags(
    season: str, is_weekend: bool, stats: Dict[str, float]
) -> List[str]:
    """Return ordered list of special tags detected from consumption."""
    special_tags: List[str] = []
    if season == "winter" and stats["evening_avg"] > 1.2:
        special_tags.append("topení")
    if season == "summer" and stats["afternoon_avg"] > 1.0:
        special_tags.append("klimatizace")
    if is_weekend and stats["has_morning_spike"]:
        special_tags.append("praní")
    if not is_weekend and stats["afternoon_avg"] > 0.8:
        special_tags.append("home office")
    if stats["night_avg"] > 0.5:
        special_tags.append("noční ohřev")
    return special_tags


def _profile_special_name(day_name: str, tag: str) -> Optional[str]:
    """Return a profile name for a special tag, if known."""
    if tag == "topení":
        return f"{day_name} s topením"
    if tag == "klimatizace":
        return f"{day_name} s klimatizací"
    if tag == "praní":
        return f"{day_name} s praním"
    if tag == "home office":
        return "Home office"
    if tag == "noční ohřev":
        return f"{day_name} s nočním ohřevem"
    return None


def _profile_spike_name(day_name: str, stats: Dict[str, float]) -> str:
    """Return a fallback name based on dominant spikes."""
    if stats["has_evening_spike"]:
        return f"{day_name} - večerní špička"
    if stats["has_morning_spike"]:
        return f"{day_name} - ranní špička"
    if stats["has_afternoon_spike"]:
        return f"{day_name} - polední špička"
    return f"{day_name} - běžný"


class OigCloudAdaptiveLoadProfilesSensor(SensorEntity):
    """
    Sensor pro automatickou analýzu a tvorbu profilů spotřeby.

    - Noční analýza historických dat (02:00)
    - Persistence profilů v attributes
    - UI-friendly zobrazení
    """

    def __setattr__(self, name: str, value: Any) -> None:
        super().__setattr__(name, value)
        try:
            if object.__getattribute__(self, "_initialized"):
                if name in ("_current_prediction", "_profiling_status", "_profiling_error", "_last_profile_reason", "_last_profile_created"):
                    self._refresh_attrs()
        except AttributeError:
            pass

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        """Initialize the adaptive profiles sensor."""
        super().__init__()

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._attr_device_info = cast(Optional[DeviceInfo], device_info)
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        # Stabilní box_id resolution (config entry → proxy → coordinator numeric keys)
        try:
            from .base_sensor import resolve_box_id

            self._box_id = resolve_box_id(coordinator)
        except Exception:
            self._box_id = "unknown"

        self._attr_unique_id = f"oig_cloud_{self._box_id}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:chart-timeline-variant-shimmer"
        self._attr_native_unit_of_measurement = None  # State = počet profilů
        self._attr_device_class = None
        self._attr_state_class = None
        self._attr_entity_category = EntityCategory.DIAGNOSTIC

        # Načíst název ze sensor types
        from ..sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or sensor_type

        # 72h Profiling storage
        self._last_profile_created: Optional[datetime] = None
        self._profiling_status: str = "idle"  # idle/creating/ok/error
        self._profiling_error: Optional[str] = None
        self._profiling_task: Optional[Any] = None  # Background task
        self._last_profile_reason: Optional[str] = None

        # Current consumption prediction (from coordinator)
        self._current_prediction: Optional[Dict[str, Any]] = None
        self._initialized = True
        self._refresh_attrs()

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - spustit profiling loop."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # START: Profiling loop jako background task
        _LOGGER.info("Starting consumption profiling loop")
        self._profiling_task = self.hass.async_create_background_task(
            self._profiling_loop(), name="oig_cloud_consumption_profiling_loop"
        )

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA - zrušit profiling task."""
        if self._profiling_task and not self._profiling_task.done():
            self._profiling_task.cancel()
        await super().async_will_remove_from_hass()

    async def _profiling_loop(self) -> None:
        """
        Profiling loop - vytváření adaptivní predikce spotřeby.

        Low-power default: každých 6 hodin (odlehčí DB zátěž).
        """
        try:
            # První běh s delay aby HA dostal čas
            await asyncio.sleep(10)

            _LOGGER.info(
                "📊 Adaptive profiling loop starting - matching every 6 hours (P2 optimalization)"
            )

            # První běh okamžitě
            await self._create_and_update_profile()

            while True:
                try:
                    # Low-power: čekat 6 hodin (odlehčí DB zátěž)
                    await asyncio.sleep(6 * 60 * 60)

                    _LOGGER.debug("📊 Running adaptive matching (6h update)")

                    await self._create_and_update_profile()

                except Exception as e:
                    _LOGGER.error(f"❌ Profiling loop error: {e}", exc_info=True)
                    self._profiling_status = "error"
                    self._profiling_error = str(e)
                    self.async_schedule_update_ha_state(force_refresh=True)

                    # Počkat 5 minut před retry po chybě
                    await asyncio.sleep(5 * 60)

        except asyncio.CancelledError:
            _LOGGER.info("Profiling loop cancelled")
            raise
        except Exception as e:
            _LOGGER.error(f"Fatal profiling loop error: {e}", exc_info=True)

    async def _wait_for_next_profile_window(self) -> None:
        """Počkat do dalšího profiling okna (00:30)."""
        now = dt_util.now()
        target_time = now.replace(hour=0, minute=30, second=0, microsecond=0)

        # Pokud už je po 00:30 dnes, čekat na zítra
        if now >= target_time:
            target_time += timedelta(days=1)

        wait_seconds = (target_time - now).total_seconds()
        _LOGGER.info(
            f"⏱️ Waiting {wait_seconds / 3600:.1f} hours until next profile window at {target_time}"
        )

        await asyncio.sleep(wait_seconds)

    async def _create_and_update_profile(self) -> None:
        """Vytvořit profil a updateovat state."""
        self._profiling_status = "creating"
        self._profiling_error = None
        if self._hass:
            self.async_write_ha_state()

        energy_sensor = f"sensor.oig_{self._box_id}_ac_out_en_day"
        power_sensor = f"sensor.oig_{self._box_id}_actual_aco_p"

        previous_reason = self._last_profile_reason
        self._last_profile_reason = None

        # Najít best matching profile přímo z aktuálních dat
        # (nepotřebujeme ukládat do events - profily jsou on-the-fly)
        prediction = await self._find_best_matching_profile(
            energy_sensor, fallback_sensor=power_sensor
        )

        if prediction:
            self._last_profile_created = dt_util.now()
            self._profiling_status = "ok"
            self._profiling_error = None
            self._current_prediction = prediction
            self._last_profile_reason = None

            _LOGGER.info(
                f"✅ Profile updated: predicted {prediction.get('predicted_total_kwh', 0):.2f} kWh for next 24h"
            )
        else:
            reason = self._last_profile_reason or "unknown"
            if reason.startswith("not_enough_") or reason.startswith("no_"):
                self._profiling_status = "warming_up"
                self._profiling_error = reason
                if reason != previous_reason:
                    _LOGGER.info("Profiling zatím nemá dost dat (%s).", reason)
            else:
                self._profiling_status = "error"
                self._profiling_error = "Failed to create profile"
                _LOGGER.warning("❌ Failed to update consumption profile")

        self._refresh_attrs()
        if self._hass:
            self.async_write_ha_state()

    # Notify dependent sensors (BatteryForecast) that profiles are ready
            if prediction:  # Only signal if we have valid data
                from homeassistant.helpers.dispatcher import async_dispatcher_send

                signal_name = f"oig_cloud_{self._box_id}_profiles_updated"
                _LOGGER.debug(f"📡 Sending signal: {signal_name}")
                async_dispatcher_send(self._hass, signal_name)

    # ============================================================================
    # 72h Consumption Profiling System
    # ============================================================================

    def _get_energy_unit_factor(self, sensor_entity_id: str) -> float:
        """Return conversion factor to kWh for energy sensors."""
        if not self._hass:
            return 0.001
        state = self._hass.states.get(sensor_entity_id)
        unit = None
        if state:
            unit = state.attributes.get("unit_of_measurement")
        if unit and unit.lower() == "kwh":
            return 1.0
        return 0.001  # Wh → kWh

    def _get_recorder_instance(self):
        """Return recorder instance when available."""
        if not self._hass:
            return None
        from homeassistant.helpers.recorder import get_instance

        recorder_instance = get_instance(self._hass)
        if not recorder_instance:
            _LOGGER.error("Recorder instance not available")
            return None
        return recorder_instance

    @staticmethod
    def _coerce_stat_timestamp(value: Any) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=dt_util.UTC)
        if isinstance(value, str):
            parsed = dt_util.parse_datetime(value)
            if parsed:
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=dt_util.UTC)
            return None
        if isinstance(value, (int, float)):
            timestamp = float(value)
            if timestamp > 1_000_000_000_000:
                timestamp /= 1000.0
            return datetime.fromtimestamp(timestamp, tz=dt_util.UTC)
        return None

    def _parse_hourly_row(
        self, row: Tuple[Any, ...], value_field: str, unit_factor: float
    ) -> Optional[Tuple[datetime, float]]:
        """Normalize a statistics row into a local timestamp and value."""
        if isinstance(row, dict):
            sum_val = row.get("sum")
            mean_val = row.get("mean")
            state_val = row.get("state")
            timestamp = self._coerce_stat_timestamp(
                row.get("start") or row.get("start_time")
            )
            if timestamp is None:
                return None
        else:
            try:
                sum_val = row[0]
                mean_val = row[1]
                state_val = row[2]
                timestamp = datetime.fromtimestamp(float(row[3]), tz=dt_util.UTC)
            except (ValueError, AttributeError, IndexError, TypeError):
                return None

        if value_field == "mean":
            if mean_val is None:
                return None
            value = float(mean_val) / 1000.0  # W → kWh/h
        else:
            raw = sum_val if sum_val is not None else state_val
            if raw is None:
                return None
            value = float(raw) * unit_factor  # Wh → kWh (if needed)

        if value < 0 or value > MAX_REASONABLE_KWH_H:
            return None

        return dt_util.as_local(timestamp), value

    async def _load_hourly_series(
        self,
        sensor_entity_id: str,
        start_time: datetime,
        end_time: datetime,
        *,
        value_field: str,
    ) -> List[Tuple[datetime, float]]:
        """
        Načíst hodinovou řadu ze statistics tabulky.

        Args:
            sensor_entity_id: Entity ID senzoru
            start_time: začátek rozsahu (local)
            end_time: konec rozsahu (local)
            value_field: "sum" (energy) nebo "mean" (power)
        """
        try:
            recorder_instance = self._get_recorder_instance()
            if not recorder_instance:
                return []
            start_ts = int(dt_util.as_utc(start_time).timestamp())
            end_ts = int(dt_util.as_utc(end_time).timestamp())

            stats_rows = await recorder_instance.async_add_executor_job(
                partial(
                    _query_hourly_statistics,
                    self._hass,
                    sensor_entity_id,
                    start_ts,
                    end_ts,
                )
            )
            if not stats_rows:
                return []

            unit_factor = self._get_energy_unit_factor(sensor_entity_id)
            series: List[Tuple[datetime, float]] = []

            for row in stats_rows:
                parsed = self._parse_hourly_row(row, value_field, unit_factor)
                if parsed:
                    series.append(parsed)

            return series

        except Exception as e:
            _LOGGER.error(f"Failed to load hourly series: {e}", exc_info=True)
            return []

    async def _get_earliest_statistics_start(
        self, sensor_entity_id: str
    ) -> Optional[datetime]:
        """Najít nejstarší dostupný hodinový záznam pro senzor."""
        if not self._hass:
            return None
        hass = self._hass

        try:
            from homeassistant.helpers.recorder import get_instance

            recorder_instance = get_instance(hass)
            if not recorder_instance:
                _LOGGER.error("Recorder instance not available")
                return None

            earliest = await recorder_instance.async_add_executor_job(
                partial(_query_earliest_statistics_start, hass, sensor_entity_id)
            )
            if earliest is None:
                return None

            local = dt_util.as_local(earliest)
            return datetime.combine(
                local.date(), datetime.min.time(), tzinfo=local.tzinfo
            )

        except Exception as e:
            _LOGGER.error(
                f"Failed to resolve earliest statistics start: {e}", exc_info=True
            )
            return None

    def _build_daily_profiles(
        self, hourly_series: List[Tuple[datetime, float]]
    ) -> Tuple[
        Dict[date, List[float]], Dict[int, float], Dict[date, int]
    ]:
        """Zarovnat hodinová data na kalendářní dny a dopočítat chybějící hodiny."""
        if not hourly_series:
            return {}, {}, {}

        day_map: Dict[date, Dict[int, float]] = defaultdict(dict)
        all_values: List[float] = []

        for ts, value in hourly_series:
            day = ts.date()
            hour = ts.hour
            day_map[day][hour] = float(value)
            all_values.append(float(value))

        hour_medians: Dict[int, float] = {}
        for hour in range(24):
            values: List[float] = [v[hour] for v in day_map.values() if hour in v]
            if values:
                hour_medians[hour] = float(np.median(values))

        global_median = float(np.median(all_values)) if all_values else 0.0

        daily_profiles: Dict[date, List[float]] = {}
        interpolated_counts: Dict[date, int] = {}

        for day, hours in day_map.items():
            day_values: List[Optional[float]] = [
                hours.get(h) if h in hours else None for h in range(24)
            ]
            missing = sum(1 for v in day_values if v is None)

            if missing > MAX_MISSING_HOURS_PER_DAY:
                _LOGGER.debug(
                    "Skipping day %s (missing %s hours)", day.isoformat(), missing
                )
                continue

            available = [v for v in day_values if v is not None]

            day_avg = float(np.mean(available)) if available else global_median
            filled, interpolated = self._fill_missing_hours(
                day_values, hour_medians, day_avg, global_median
            )
            daily_profiles[day] = filled
            interpolated_counts[day] = interpolated

        return daily_profiles, hour_medians, interpolated_counts

    def _fill_missing_hours(
        self,
        day_values: List[Optional[float]],
        hour_medians: Dict[int, float],
        day_avg: float,
        global_median: float,
    ) -> Tuple[List[float], int]:
        """Dopočítat chybějící hodiny (lineárně uvnitř dne, fallback na medián)."""
        return self._fill_missing_values(
            day_values, hour_medians, day_avg, global_median, hour_offset=0
        )

    def _fill_missing_values(
        self,
        values: List[Optional[float]],
        hour_medians: Dict[int, float],
        day_avg: float,
        global_median: float,
        *,
        hour_offset: int = 0,
    ) -> Tuple[List[float], int]:
        """Dopočítat chybějící hodnoty v libovolně dlouhém seznamu."""
        filled: List[float] = [float(v) if v is not None else 0.0 for v in values]
        interpolated = 0
        length = len(values)

        for idx, value in enumerate(values):
            if value is not None:
                continue

            prev_idx = next(
                (i for i in range(idx - 1, -1, -1) if values[i] is not None),
                None,
            )
            next_idx = next(
                (i for i in range(idx + 1, length) if values[i] is not None),
                None,
            )

            if prev_idx is not None and next_idx is not None:
                prev_raw = values[prev_idx]
                next_raw = values[next_idx]
                if prev_raw is not None and next_raw is not None:
                    prev_val = float(prev_raw)
                    next_val = float(next_raw)
                    ratio = (idx - prev_idx) / (next_idx - prev_idx)
                    fill_value: float = prev_val + (next_val - prev_val) * ratio
                else:
                    median_val = hour_medians.get(idx + hour_offset)
                    if median_val is not None:
                        fill_value = median_val
                    else:
                        fill_value = day_avg if day_avg is not None else global_median
            else:
                median_val = hour_medians.get(idx + hour_offset)
                if median_val is not None:
                    fill_value = median_val
                else:
                    fill_value = day_avg if day_avg is not None else global_median

            filled[idx] = fill_value
            interpolated += 1

        return filled, interpolated

    def _build_72h_profiles(
        self, daily_profiles: Dict[date, List[float]]
    ) -> List[Dict[str, Any]]:
        """Sestavit historické 72h profily z po sobě jdoucích dnů."""
        profiles: List[Dict[str, Any]] = []
        days = sorted(daily_profiles.keys())

        for i in range(len(days) - 2):
            d0, d1, d2 = days[i], days[i + 1], days[i + 2]
            if d1 != d0 + timedelta(days=1) or d2 != d1 + timedelta(days=1):
                continue

            profile_data = daily_profiles[d0] + daily_profiles[d1] + daily_profiles[d2]

            if len(profile_data) != PROFILE_HOURS:
                continue

            profiles.append(
                {
                    "consumption_kwh": profile_data,
                    "total_consumption": float(np.sum(profile_data)),
                    "avg_consumption": float(np.mean(profile_data)),
                    "start_date": d0.isoformat(),
                }
            )

        return profiles

    def _build_current_match(
        self,
        hourly_series: List[Tuple[datetime, float]],
        hour_medians: Dict[int, float],
    ) -> Optional[List[float]]:
        """Sestavit aktuální match okno z včerejška a dneška (dnešek může být neúplný)."""
        if not hourly_series:
            return None

        now = dt_util.now()
        current_hour = now.hour
        today = now.date()
        yesterday = today - timedelta(days=1)

        day_map: Dict[date, Dict[int, float]] = defaultdict(dict)
        all_values: List[float] = []

        for ts, value in hourly_series:
            day = ts.date()
            hour = ts.hour
            day_map[day][hour] = float(value)
            all_values.append(float(value))

        global_median = float(np.median(all_values)) if all_values else 0.0
        match: List[float] = []

        yesterday_hours = day_map.get(yesterday)
        if not yesterday_hours:
            return None

        yesterday_values: List[Optional[float]] = [
            yesterday_hours.get(h) for h in range(24)
        ]
        missing_y = sum(1 for v in yesterday_values if v is None)
        if missing_y > MAX_MISSING_HOURS_PER_DAY:
            return None

        y_available = [v for v in yesterday_values if v is not None]
        y_avg = float(np.mean(y_available))
        y_filled, _ = self._fill_missing_values(
            yesterday_values, hour_medians, y_avg, global_median, hour_offset=0
        )
        match.extend(y_filled)

        if current_hour == 0:
            return match

        today_hours = day_map.get(today)
        if not today_hours:
            return None

        today_values: List[Optional[float]] = [
            today_hours.get(h) for h in range(current_hour)
        ]
        missing_t = sum(1 for v in today_values if v is None)
        if missing_t > MAX_MISSING_HOURS_PER_DAY:
            return None

        t_available = [v for v in today_values if v is not None]
        if not t_available:
            return None
        t_avg = float(np.mean(t_available))
        t_filled, _ = self._fill_missing_values(
            today_values, hour_medians, t_avg, global_median, hour_offset=0
        )
        match.extend(t_filled)

        return match

    def _apply_floor_to_prediction(
        self,
        predicted: List[float],
        start_hour: int,
        hour_medians: Dict[int, float],
        recent_match: List[float],
    ) -> Tuple[List[float], int]:
        """Aplikovat minimální floor podle historické spotřeby."""
        if not predicted:
            return predicted, 0

        recent_window = recent_match[-24:] if recent_match else []
        recent_avg = float(np.mean(recent_window)) if recent_window else 0.0

        applied = 0
        for idx, value in enumerate(predicted):
            hour = (start_hour + idx) % 24
            base = hour_medians.get(hour, recent_avg)
            floor = base * FLOOR_RATIO if base else 0.0
            if floor > 0 and value < floor:
                predicted[idx] = floor
                applied += 1

        return predicted, applied

    def _calculate_profile_similarity(
        self, current_data: List[float], profile_data: List[float]
    ) -> float:
        """
        Spočítat similarity score mezi aktuálními daty a historickým profilem.

        Scoring:
        - 50% correlation coefficient (Pearsonův korelační koeficient)
        - 30% RMSE (root mean square error - inverted)
        - 20% total consumption difference (inverted)

        Args:
            current_data: Aktuální spotřeba (plovoucí počet hodin)
            profile_data: Historický profil (stejný počet hodin)

        Returns:
            Similarity score 0.0 - 1.0 (1.0 = perfektní match)
        """
        if len(current_data) != len(profile_data):
            _LOGGER.warning(
                f"Invalid data length for similarity: {len(current_data)} != {len(profile_data)}"
            )
            return 0.0

        try:
            # Convert to numpy arrays
            current = np.array(current_data)
            profile = np.array(profile_data)

            # 1. Correlation coefficient (50%)
            if np.std(current) == 0 or np.std(profile) == 0:
                correlation_score = 0.0
            else:
                correlation = np.corrcoef(current, profile)[0, 1]
                # Normalize to 0-1 (correlation je -1 až 1, chceme jen pozitivní podobnost)
                correlation_score = max(0.0, correlation)

            # 2. RMSE (30%) - lower is better, normalize to 0-1
            rmse = np.sqrt(np.mean((current - profile) ** 2))
            # Normalize: exponenciální decay, RMSE=0 → score=1, RMSE roste → score klesá
            max_reasonable_rmse = 5.0  # kWh
            rmse_score = np.exp(-rmse / max_reasonable_rmse)

            # 3. Total consumption difference (20%) - lower is better
            total_current = np.sum(current)
            total_profile = np.sum(profile)
            if total_profile > 0:
                total_diff = abs(total_current - total_profile) / total_profile
            else:
                total_diff = 1.0 if total_current > 0 else 0.0

            # Normalize: 0% diff → score=1, 100%+ diff → score≈0
            total_score = np.exp(-total_diff)

            # Weighted sum
            similarity = (
                WEIGHT_CORRELATION * correlation_score
                + WEIGHT_RMSE * rmse_score
                + WEIGHT_TOTAL * total_score
            )

            return float(similarity)

        except Exception as e:
            _LOGGER.error(f"Failed to calculate similarity: {e}", exc_info=True)
            return 0.0

    async def _find_best_matching_profile(
        self, current_consumption_sensor: str, fallback_sensor: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Najít matching profil s preferencí energy senzoru."""
        prediction = await self._find_best_matching_profile_for_sensor(
            current_consumption_sensor, value_field="sum"
        )
        if prediction or not fallback_sensor:
            return prediction

        _LOGGER.info(
            "Energy profiling unavailable for %s, falling back to %s",
            current_consumption_sensor,
            fallback_sensor,
        )
        return await self._find_best_matching_profile_for_sensor(
            fallback_sensor, value_field="mean"
        )

    def _log_profile_window(self, window: Dict[str, int]) -> None:
        _LOGGER.debug(
            "Profiling window: time=%02d:00, matching=%sh, prediction=%sh",
            window["current_hour"],
            window["match_hours"],
            window["predict_hours"],
        )

    async def _resolve_profile_history_window(
        self,
        sensor_entity_id: str,
        now: datetime,
        days_back: Optional[int],
    ) -> Tuple[datetime, datetime]:
        start_time, end_time, history_label = await _resolve_history_window(
            self, sensor_entity_id, now, days_back
        )
        _LOGGER.debug(
            "Profiling history window: %s → %s (%s)",
            start_time.date().isoformat(),
            end_time.date().isoformat(),
            history_label,
        )
        return start_time, end_time

    async def _load_profile_hourly_series(
        self,
        sensor_entity_id: str,
        start_time: datetime,
        end_time: datetime,
        *,
        value_field: str,
    ) -> Optional[List[Tuple[datetime, float]]]:
        hourly_series = await self._load_hourly_series(
            sensor_entity_id,
            start_time,
            end_time,
            value_field=value_field,
        )
        if not hourly_series:
            self._last_profile_reason = "no_hourly_stats"
            _LOGGER.debug("No hourly statistics data for %s", sensor_entity_id)
            return None
        return hourly_series

    def _prepare_profile_candidates(
        self,
        hourly_series: List[Tuple[datetime, float]],
        window: Dict[str, int],
    ) -> Optional[
        Tuple[List[Dict[str, Any]], Dict[int, float], Dict[date, int], List[float]]
    ]:
        daily_profiles, hour_medians, interpolated = self._build_daily_profiles(
            hourly_series
        )
        if not _has_enough_daily_profiles(self, daily_profiles):
            return None

        current_match = self._build_current_match(hourly_series, hour_medians)
        if current_match is None:
            self._last_profile_reason = "no_current_match"
            _LOGGER.debug("No current match data available")
            return None
        if not _has_enough_current_match(
            self, current_match, window["match_hours"]
        ):
            return None

        profiles = self._build_72h_profiles(daily_profiles)
        if not profiles:
            self._last_profile_reason = "no_historical_profiles"
            _LOGGER.debug("No historical 72h profiles available for matching")
            return None

        selected = _select_top_matches(
            self, profiles, current_match, window["match_hours"]
        )
        if not selected:
            self._last_profile_reason = "no_matching_profiles"
            _LOGGER.debug("No matching profile found")
            return None

        return selected, hour_medians, interpolated, current_match

    def _log_profile_match(
        self, result: Dict[str, Any], window: Dict[str, int]
    ) -> None:
        _LOGGER.info(
            "🎯 Profile match: score=%.3f, samples=%s, predicted_%sh=%.2f kWh",
            result["similarity_score"],
            result["sample_count"],
            window["predict_hours"],
            result["predicted_total_kwh"],
        )

    async def _find_best_matching_profile_for_sensor(
        self,
        sensor_entity_id: str,
        *,
        value_field: str,
        days_back: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Najít nejlepší matching 72h profil pro aktuální spotřebu.

        Plovoucí okno:
        - Před půlnocí (např. 20:00): matching 44h zpět, predikce 28h dopředu
        - Po půlnoci (např. 01:00): matching 24h zpět, predikce 48h dopředu
        - Vždy celkem 72h
        """
        if not self._hass:
            return None

        try:
            self._last_profile_reason = None
            now = dt_util.now()
            window = _resolve_profile_window(now)
            self._log_profile_window(window)
            start_time, end_time = await self._resolve_profile_history_window(
                sensor_entity_id, now, days_back
            )
            hourly_series = await self._load_profile_hourly_series(
                sensor_entity_id,
                start_time,
                end_time,
                value_field=value_field,
            )
            if not hourly_series:
                return None

            prepared = self._prepare_profile_candidates(hourly_series, window)
            if not prepared:
                return None

            selected, hour_medians, interpolated, current_match = prepared

            result = _build_profile_prediction(
                selected,
                window=window,
                hour_medians=hour_medians,
                current_match=current_match,
                sensor_entity_id=sensor_entity_id,
                interpolated=interpolated,
                apply_floor=self._apply_floor_to_prediction,
            )
            self._log_profile_match(result, window)

            return result

        except Exception as e:
            _LOGGER.error(f"Failed to find matching profile: {e}", exc_info=True)
            self._last_profile_reason = "error"
            return None

    def _compute_native_value(self) -> Optional[str]:
        if self._current_prediction:
            total = self._current_prediction.get("predicted_total_kwh", 0)
            return f"{total:.1f} kWh"
        return "no_data"

    def _compute_extra_state_attributes(self) -> Dict[str, Any]:
        attrs = {
            "profiling_status": self._profiling_status,
            "profiling_error": self._profiling_error,
            "profiling_reason": self._last_profile_reason,
            "last_profile_created": (
                self._last_profile_created.isoformat()
                if self._last_profile_created
                else None
            ),
        }
        attrs.update(self._build_prediction_attributes())
        return attrs

    def _refresh_attrs(self) -> None:
        object.__setattr__(self, "_attr_native_value", self._compute_native_value())
        object.__setattr__(
            self, "_attr_extra_state_attributes", self._compute_extra_state_attributes()
        )

    def _build_prediction_attributes(self) -> Dict[str, Any]:
        prediction = self._current_prediction
        if not prediction:
            return {}
        attrs = {"prediction_summary": self._build_prediction_summary(prediction)}
        attrs.update(self._build_profile_attributes(prediction))
        return attrs

    @staticmethod
    def _build_prediction_summary(prediction: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "similarity_score": prediction.get("similarity_score"),
            "predicted_total_kwh": prediction.get("predicted_total_kwh"),
            "predicted_avg_kwh": prediction.get("predicted_avg_kwh"),
            "sample_count": prediction.get("sample_count"),
            "match_hours": prediction.get("match_hours"),
            "data_source": prediction.get("data_source"),
            "floor_applied": prediction.get("floor_applied"),
            "interpolated_hours": prediction.get("interpolated_hours"),
        }

    def _build_profile_attributes(self, prediction: Dict[str, Any]) -> Dict[str, Any]:
        predicted = prediction.get("predicted_consumption", [])
        predict_hours = prediction.get("predict_hours", 0)
        if not predicted or predict_hours <= 0:
            return {}

        now = dt_util.now()
        current_hour = now.hour
        today_hours, tomorrow_hours = self._split_predicted_hours(
            predicted, predict_hours, current_hour
        )
        tomorrow_hours = self._pad_profile_hours(tomorrow_hours, 24, 0.5)

        similarity_score = prediction.get("similarity_score", 0)
        sample_count = prediction.get("sample_count", 1)
        season = _get_season(now)
        is_weekend_today = now.weekday() >= 5
        is_weekend_tomorrow = (now.weekday() + 1) % 7 >= 5

        name_suffix = self._build_profile_name_suffix(
            sample_count, similarity_score
        )
        today_name_source, tomorrow_name_source = self._resolve_name_sources(
            prediction.get("matched_profile_full", []),
            today_hours,
            tomorrow_hours,
            current_hour,
        )
        today_profile_name, tomorrow_profile_name = self._build_profile_names(
            today_name_source,
            tomorrow_name_source,
            season,
            is_weekend_today,
            is_weekend_tomorrow,
            name_suffix,
        )

        attrs: Dict[str, Any] = {}
        attrs["today_profile"] = self._build_profile_data(
            today_hours,
            current_hour,
            season,
            sample_count,
            today_profile_name,
            similarity_score,
            is_weekend_today,
        )
        attrs["tomorrow_profile"] = self._build_profile_data(
            tomorrow_hours[:24],
            0,
            season,
            sample_count,
            tomorrow_profile_name,
            similarity_score,
            is_weekend_tomorrow,
        )
        attrs["profile_name"] = today_profile_name
        attrs["match_score"] = round(similarity_score * 100, 1)
        attrs["sample_count"] = sample_count
        return attrs

    @staticmethod
    def _split_predicted_hours(
        predicted: List[float], predict_hours: int, current_hour: int
    ) -> Tuple[List[float], List[float]]:
        hours_until_midnight = 24 - current_hour
        today_count = min(hours_until_midnight, predict_hours)
        today_hours = predicted[:today_count]
        tomorrow_hours = predicted[today_count:] if today_count < predict_hours else []
        return today_hours, tomorrow_hours

    @staticmethod
    def _pad_profile_hours(
        hours: List[float], target: int, fallback: float
    ) -> List[float]:
        if len(hours) >= target:
            return list(hours)
        avg_hour = float(np.mean(hours)) if hours else fallback
        return list(hours) + [avg_hour] * (target - len(hours))

    @staticmethod
    def _build_profile_name_suffix(sample_count: int, similarity_score: float) -> str:
        if sample_count > 1:
            return f" ({sample_count} podobných dnů, shoda {similarity_score:.2f})"
        return f" (shoda {similarity_score:.2f})"

    def _resolve_name_sources(
        self,
        matched_profile_full: List[float],
        today_hours: List[float],
        tomorrow_hours: List[float],
        current_hour: int,
    ) -> Tuple[List[float], List[float]]:
        today_full: List[float] = []
        if len(matched_profile_full) >= 72:
            today_full = matched_profile_full[24:48]
            tomorrow_from_matched = matched_profile_full[48:72]
            today_from_matched = today_full[current_hour:]
        else:
            tomorrow_from_matched = tomorrow_hours[:24]
            today_from_matched = today_hours

        if len(matched_profile_full) >= 72 and len(today_full) == 24:
            today_name_source = today_full
        elif len(today_from_matched) == 24:
            today_name_source = today_from_matched
        else:
            padding = [0.0] * (24 - len(today_from_matched))
            today_name_source = today_from_matched + padding

        return today_name_source, tomorrow_from_matched

    @staticmethod
    def _build_profile_names(
        today_name_source: List[float],
        tomorrow_name_source: List[float],
        season: str,
        is_weekend_today: bool,
        is_weekend_tomorrow: bool,
        name_suffix: str,
    ) -> Tuple[str, str]:
        today_profile_name = _generate_profile_name(
            hourly_consumption=today_name_source,
            season=season,
            is_weekend=is_weekend_today,
        )
        today_profile_name = f"{today_profile_name}{name_suffix}"

        tomorrow_profile_name = _generate_profile_name(
            hourly_consumption=tomorrow_name_source,
            season=season,
            is_weekend=is_weekend_tomorrow,
        )
        tomorrow_profile_name = f"{tomorrow_profile_name}{name_suffix}"
        return today_profile_name, tomorrow_profile_name

    @staticmethod
    def _build_profile_data(
        hours: List[float],
        start_hour: int,
        season: str,
        sample_count: int,
        profile_name: str,
        similarity_score: float,
        is_weekend: bool,
    ) -> Dict[str, Any]:
        return {
            "hourly_consumption": hours,
            "start_hour": start_hour,
            "total_kwh": float(np.sum(hours)),
            "avg_kwh_h": float(np.mean(hours)) if hours else 0.0,
            "season": season,
            "day_count": sample_count,
            "ui": {
                "name": profile_name,
                "similarity_score": similarity_score,
                "sample_count": sample_count,
            },
            "characteristics": {
                "season": season,
                "is_weekend": is_weekend,
            },
            "sample_count": sample_count,
        }

    def get_current_prediction(self) -> Optional[Dict[str, Any]]:
        """Get current consumption prediction for use by other components."""
        return self._current_prediction


def _resolve_profile_window(now: datetime) -> Dict[str, int]:
    """Resolve matching/prediction window sizes based on current hour."""
    current_hour = now.hour
    match_hours = 24 + current_hour
    predict_hours = PROFILE_HOURS - match_hours
    return {
        "current_hour": current_hour,
        "match_hours": match_hours,
        "predict_hours": predict_hours,
    }


async def _resolve_history_window(
    sensor: OigCloudAdaptiveLoadProfilesSensor,
    sensor_entity_id: str,
    now: datetime,
    days_back: Optional[int],
) -> Tuple[datetime, datetime, str]:
    """Resolve history window boundaries for profiling."""
    if days_back is not None:
        start_time = now - timedelta(days=days_back)
        label = f"{days_back}d"
        return start_time, now, label

    earliest = await sensor._get_earliest_statistics_start(sensor_entity_id)
    if earliest:
        return earliest, now, "earliest_stats"

    fallback = now - timedelta(days=DEFAULT_DAYS_BACK)
    return fallback, now, f"fallback_{DEFAULT_DAYS_BACK}d"


def _has_enough_daily_profiles(
    sensor: OigCloudAdaptiveLoadProfilesSensor,
    daily_profiles: Dict[date, List[float]],
) -> bool:
    """Verify we have at least three days of daily profiles."""
    if len(daily_profiles) >= 3:
        return True
    sensor._last_profile_reason = f"not_enough_daily_profiles_{len(daily_profiles)}"
    _LOGGER.debug(
        "Not enough daily profiles (%s) for 72h matching", len(daily_profiles)
    )
    return False


def _has_enough_current_match(
    sensor: OigCloudAdaptiveLoadProfilesSensor,
    current_match: Optional[List[float]],
    match_hours: int,
) -> bool:
    """Check if we have enough current data for matching."""
    if current_match and len(current_match) >= match_hours:
        return True
    current_len = len(current_match) if current_match else 0
    sensor._last_profile_reason = f"not_enough_current_data_{current_len}"
    _LOGGER.debug(
        "Not enough current match data (%s/%s)", current_len, match_hours
    )
    return False


def _select_top_matches(
    sensor: OigCloudAdaptiveLoadProfilesSensor,
    profiles: List[Dict[str, Any]],
    current_match: List[float],
    match_hours: int,
) -> List[Dict[str, Any]]:
    """Score profiles and select top matches."""
    scored: List[Dict[str, Any]] = []
    for profile in profiles:
        data = profile.get("consumption_kwh") or []
        if len(data) < match_hours:
            continue
        segment = data[:match_hours]
        score = sensor._calculate_profile_similarity(current_match, segment)
        profile_with_score = dict(profile)
        profile_with_score["similarity_score"] = score
        scored.append(profile_with_score)

    if not scored:
        sensor._last_profile_reason = "no_matching_profiles"
        _LOGGER.debug("No matching profiles after scoring")
        return []

    scored.sort(key=lambda item: item.get("similarity_score", 0.0), reverse=True)
    return scored[:TOP_MATCHES]


def _average_profiles(profiles: List[Dict[str, Any]]) -> List[float]:
    """Average consumption profiles element-wise."""
    if not profiles:
        return []
    lengths = [len(profile.get("consumption_kwh") or []) for profile in profiles]
    length = min(lengths) if lengths else 0
    if length == 0:
        return []

    total = np.zeros(length, dtype=float)
    for profile in profiles:
        data = profile.get("consumption_kwh") or []
        total += np.array(data[:length], dtype=float)
    avg = total / len(profiles)
    avg_list = cast(List[float], avg.tolist())
    return [float(value) for value in avg_list]


def _build_profile_prediction(
    selected: List[Dict[str, Any]],
    *,
    window: Dict[str, int],
    hour_medians: Dict[int, float],
    current_match: List[float],
    sensor_entity_id: str,
    interpolated: Dict[date, int],
    apply_floor,
) -> Dict[str, Any]:
    """Build prediction payload from selected profiles."""
    averaged = _average_profiles(selected)
    match_hours = window["match_hours"]
    predict_hours = window["predict_hours"]
    predicted = averaged[match_hours : match_hours + predict_hours] if averaged else []

    floor_applied = 0
    if predicted:
        predicted, floor_applied = apply_floor(
            predicted, window["current_hour"], hour_medians, current_match
        )

    predicted_total = float(np.sum(predicted)) if predicted else 0.0
    predicted_avg = float(np.mean(predicted)) if predicted else 0.0

    scores = [profile.get("similarity_score", 0.0) for profile in selected]
    similarity_score = float(np.mean(scores)) if scores else 0.0
    best_profile = max(
        selected, key=lambda item: item.get("similarity_score", 0.0), default={}
    )

    return {
        "predicted_consumption": predicted,
        "predicted_total_kwh": predicted_total,
        "predicted_avg_kwh": predicted_avg,
        "sample_count": len(selected),
        "match_hours": match_hours,
        "predict_hours": predict_hours,
        "similarity_score": similarity_score,
        "data_source": sensor_entity_id,
        "floor_applied": floor_applied,
        "interpolated_hours": int(sum(interpolated.values())) if interpolated else 0,
        "matched_profile_full": best_profile.get("consumption_kwh", []),
    }
