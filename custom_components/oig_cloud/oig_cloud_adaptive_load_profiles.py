"""Sensor pro automatickou tvorbu adaptivních profilů spotřeby z historických dat."""

import logging
import asyncio
import numpy as np
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import statistics

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.util import dt as dt_util
from homeassistant.components import recorder
from homeassistant.components.recorder import history

_LOGGER = logging.getLogger(__name__)

# 72h Consumption Profiling Constants
PROFILE_HOURS = 72  # Délka profilu v hodinách
PROFILE_MATCH_HOURS = 48  # Kolik hodin aktuálních dat používáme pro matching
PROFILE_PREDICT_HOURS = 24  # Kolik hodin předpovídáme z matched profilu

# Similarity scoring weights
WEIGHT_CORRELATION = 0.50  # Correlation coefficient weight
WEIGHT_RMSE = 0.30  # RMSE weight (inverted)
WEIGHT_TOTAL = 0.20  # Total consumption difference weight (inverted)


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

    # 1. ZÁKLADNÍ KLASIFIKACE
    day_name = "Víkend" if is_weekend else "Pracovní den"

    # Celková denní spotřeba
    total = sum(hourly_consumption)
    daily_avg = total / 24

    # 2. ANALÝZA PATTERN SHAPE
    morning_avg = float(np.mean(hourly_consumption[6:12]))  # 6-12h
    afternoon_avg = float(np.mean(hourly_consumption[12:18]))  # 12-18h
    evening_avg = float(np.mean(hourly_consumption[18:24]))  # 18-24h
    night_avg = float(np.mean(hourly_consumption[0:6]))  # 0-6h

    # Detekce špiček (špička > 1.3× průměr)
    has_morning_spike = morning_avg > daily_avg * 1.3
    has_evening_spike = evening_avg > daily_avg * 1.3
    has_afternoon_spike = afternoon_avg > daily_avg * 1.3

    # 3. SPECIÁLNÍ DETEKCE
    special_tags = []

    # Topení (zimní vysoká večerní spotřeba)
    if season == "winter" and evening_avg > 1.2:
        special_tags.append("topení")

    # Klimatizace (letní vysoká odpolední spotřeba)
    if season == "summer" and afternoon_avg > 1.0:
        special_tags.append("klimatizace")

    # Praní (víkend s ranní špičkou)
    if is_weekend and has_morning_spike:
        special_tags.append("praní")

    # Home office (pracovní den s vysokou denní spotřebou)
    if not is_weekend and afternoon_avg > 0.8:
        special_tags.append("home office")

    # Vysoká noční spotřeba (bojler?)
    if night_avg > 0.5:
        special_tags.append("noční ohřev")

    # 4. SESTAVENÍ NÁZVU
    if special_tags:
        # Preferovat speciální tag
        main_tag = special_tags[0]
        if main_tag == "topení":
            return f"{day_name} s topením"
        elif main_tag == "klimatizace":
            return f"{day_name} s klimatizací"
        elif main_tag == "praní":
            return f"{day_name} s praním"
        elif main_tag == "home office":
            return "Home office"
        elif main_tag == "noční ohřev":
            return f"{day_name} s nočním ohřevem"

    # Fallback podle špičky
    if has_evening_spike:
        return f"{day_name} - večerní špička"
    elif has_morning_spike:
        return f"{day_name} - ranní špička"
    elif has_afternoon_spike:
        return f"{day_name} - polední špička"
    else:
        return f"{day_name} - běžný"


class OigCloudAdaptiveLoadProfilesSensor(CoordinatorEntity, SensorEntity):
    """
    Sensor pro automatickou analýzu a tvorbu profilů spotřeby.

    - Noční analýza historických dat (02:00)
    - Persistence profilů v attributes
    - UI-friendly zobrazení
    """

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        """Initialize the adaptive profiles sensor."""
        super().__init__(coordinator)

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._device_info = device_info
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        # Získání box_id z coordinator
        self._data_key = "unknown"
        if (
            coordinator
            and coordinator.data
            and isinstance(coordinator.data, dict)
            and coordinator.data
        ):
            self._data_key = list(coordinator.data.keys())[0]
            _LOGGER.debug(f"Adaptive profiles sensor: got box_id={self._data_key}")

        self._box_id = self._data_key
        self._attr_unique_id = f"oig_cloud_{self._data_key}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:chart-timeline-variant-shimmer"
        self._attr_native_unit_of_measurement = None  # State = počet profilů
        self._attr_device_class = None
        self._attr_state_class = None
        self._attr_entity_category = EntityCategory.DIAGNOSTIC

        # Načíst název ze sensor types
        from .sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or sensor_type

        # 72h Profiling storage
        self._last_profile_created: Optional[datetime] = None
        self._profiling_status: str = "idle"  # idle/creating/ok/error
        self._profiling_error: Optional[str] = None
        self._profiling_task: Optional[Any] = None  # Background task

        # Current consumption prediction (from coordinator)
        self._current_prediction: Optional[Dict[str, Any]] = None

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
        Profiling loop - vytváření 72h consumption profilů.

        První běh okamžitě (s delay 10s), pak denně v 00:30.
        """
        try:
            # První běh s delay aby HA dostal čas
            await asyncio.sleep(10)

            _LOGGER.info("📊 Consumption profiling loop starting - first run")

            # První běh okamžitě
            await self._create_and_update_profile()

            # Pak čekat do prvního 00:30
            await self._wait_for_next_profile_window()

            while True:
                try:
                    _LOGGER.info("📊 Creating daily 72h consumption profile")
                    await self._create_and_update_profile()

                except Exception as e:
                    _LOGGER.error(f"❌ Profiling loop error: {e}", exc_info=True)
                    self._profiling_status = "error"
                    self._profiling_error = str(e)
                    self.async_schedule_update_ha_state(force_refresh=True)

                # Počkat do dalšího dne 00:30
                _LOGGER.info("⏱️ Waiting until tomorrow 00:30 for next profile")
                self._profiling_status = "idle"
                self.async_schedule_update_ha_state(force_refresh=True)

                await self._wait_for_next_profile_window()

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

        consumption_sensor = f"sensor.oig_{self._box_id}_actual_aco_p"

        # Najít best matching profile přímo z aktuálních dat
        # (nepotřebujeme ukládat do events - profily jsou on-the-fly)
        prediction = await self._find_best_matching_profile(consumption_sensor)

        if prediction:
            self._last_profile_created = dt_util.now()
            self._profiling_status = "ok"
            self._profiling_error = None
            self._current_prediction = prediction

            _LOGGER.info(
                f"✅ Profile updated: predicted {prediction.get('predicted_total_kwh', 0):.2f} kWh for next 24h"
            )
        else:
            self._profiling_status = "error"
            self._profiling_error = "Failed to create profile"
            _LOGGER.warning("❌ Failed to update consumption profile")

        if self._hass:
            self.async_write_ha_state()

    # ============================================================================
    # 72h Consumption Profiling System
    # ============================================================================

    async def _get_consumption_history_72h(
        self, consumption_sensor_entity_id: str
    ) -> Optional[List[float]]:
        """
        Načíst 72 hodin spotřeby ze statistics tabulky (hourly průměry).

        Args:
            consumption_sensor_entity_id: Entity ID senzoru spotřeby

        Returns:
            List 72 float hodnot (hodinové průměry v kWh), nebo None při chybě
        """
        if not self._hass:
            _LOGGER.warning("Cannot get consumption history - no hass instance")
            return None

        try:
            from homeassistant.helpers.recorder import get_instance
            from sqlalchemy import text

            recorder_instance = get_instance(self._hass)
            if not recorder_instance:
                _LOGGER.error("Recorder instance not available")
                return None

            end_time = dt_util.now()
            start_time = end_time - timedelta(hours=PROFILE_HOURS)

            # SQL query pro statistics tabulku
            def get_hourly_statistics():
                """Query statistics table for hourly averages."""
                from homeassistant.helpers.recorder import session_scope

                instance = get_instance(self._hass)
                with session_scope(
                    hass=self._hass, session=instance.get_session()
                ) as session:
                    start_ts = int(start_time.timestamp())
                    end_ts = int(end_time.timestamp())

                    query = text(
                        """
                        SELECT s.mean, s.start_ts
                        FROM statistics s
                        INNER JOIN statistics_meta sm ON s.metadata_id = sm.id
                        WHERE sm.statistic_id = :statistic_id
                        AND s.start_ts >= :start_ts
                        AND s.start_ts < :end_ts
                        AND s.mean IS NOT NULL
                        ORDER BY s.start_ts
                        """
                    )

                    result = session.execute(
                        query,
                        {
                            "statistic_id": consumption_sensor_entity_id,
                            "start_ts": start_ts,
                            "end_ts": end_ts,
                        },
                    )
                    return result.fetchall()

            # Execute query in executor
            _LOGGER.debug(
                f"Loading 72h statistics for {consumption_sensor_entity_id}..."
            )
            stats_rows = await self._hass.async_add_executor_job(get_hourly_statistics)

            if not stats_rows:
                _LOGGER.warning(
                    f"No statistics data for {consumption_sensor_entity_id}"
                )
                return None

            # Convert to hourly consumption list
            hourly_data = {}
            for row in stats_rows:
                try:
                    mean_value = float(row[0])  # mean power in W
                    timestamp_ts = float(row[1])  # UNIX timestamp

                    # Convert to datetime
                    timestamp = datetime.fromtimestamp(timestamp_ts, tz=dt_util.UTC)

                    # Sanity check
                    if mean_value < 0 or mean_value > 20000:
                        continue

                    # Calculate hour offset from start
                    hour_offset = int((timestamp - start_time).total_seconds() / 3600)
                    if 0 <= hour_offset < PROFILE_HOURS:
                        # W → kWh (hourly average)
                        hourly_data[hour_offset] = mean_value / 1000.0

                except (ValueError, AttributeError, IndexError):
                    continue

            # Build final list with 0 for missing hours
            hourly_consumption = []
            for hour_offset in range(PROFILE_HOURS):
                if hour_offset in hourly_data:
                    hourly_consumption.append(hourly_data[hour_offset])
                else:
                    hourly_consumption.append(0.0)

            if len(hourly_consumption) != PROFILE_HOURS:
                _LOGGER.warning(
                    f"Expected {PROFILE_HOURS} hours, got {len(hourly_consumption)}"
                )
                return None

            total_kwh = sum(hourly_consumption)
            _LOGGER.info(
                f"✅ Loaded 72h statistics: {len(stats_rows)} records, total {total_kwh:.2f} kWh"
            )

            return hourly_consumption

        except Exception as e:
            _LOGGER.error(f"Failed to get consumption history: {e}", exc_info=True)
            return None

    async def _load_historical_profiles(
        self, consumption_sensor_entity_id: str, days_back: int = 90
    ) -> List[Dict[str, Any]]:
        """
        Načíst historické 72h profily ze statistics (sliding window po dnech).

        Args:
            consumption_sensor_entity_id: Entity ID senzoru spotřeby
            days_back: Kolik dní zpět načíst (default 90 = ~3 měsíce)

        Returns:
            List profilů, každý profil = 72h consumption data
        """
        if not self._hass:
            return []

        try:
            from homeassistant.helpers.recorder import get_instance
            from sqlalchemy import text

            recorder_instance = get_instance(self._hass)
            if not recorder_instance:
                _LOGGER.error("Recorder instance not available")
                return []

            end_time = dt_util.now()
            start_time = end_time - timedelta(days=days_back)

            # Načíst všechna dostupná data z statistics tabulky
            def get_all_statistics():
                """Query statistics for all hourly averages."""
                from homeassistant.helpers.recorder import session_scope

                instance = get_instance(self._hass)
                with session_scope(
                    hass=self._hass, session=instance.get_session()
                ) as session:
                    start_ts = int(start_time.timestamp())
                    end_ts = int(end_time.timestamp())

                    query = text(
                        """
                        SELECT s.mean, s.start_ts
                        FROM statistics s
                        INNER JOIN statistics_meta sm ON s.metadata_id = sm.id
                        WHERE sm.statistic_id = :statistic_id
                        AND s.start_ts >= :start_ts
                        AND s.start_ts < :end_ts
                        AND s.mean IS NOT NULL
                        ORDER BY s.start_ts
                        """
                    )

                    result = session.execute(
                        query,
                        {
                            "statistic_id": consumption_sensor_entity_id,
                            "start_ts": start_ts,
                            "end_ts": end_ts,
                        },
                    )
                    return result.fetchall()

            # Execute query
            _LOGGER.debug(
                f"Loading historical statistics for profile matching ({days_back} days)..."
            )
            stats_rows = await self._hass.async_add_executor_job(get_all_statistics)

            if not stats_rows:
                _LOGGER.warning(
                    f"No historical statistics data for {consumption_sensor_entity_id}"
                )
                return []

            # Convert to hourly consumption array
            hourly_data = []
            for row in stats_rows:
                try:
                    mean_value = float(row[0])  # mean power in W

                    # Sanity check
                    if mean_value < 0 or mean_value > 20000:
                        continue

                    # W → kWh
                    hourly_data.append(mean_value / 1000.0)

                except (ValueError, AttributeError, IndexError):
                    continue

            if len(hourly_data) < PROFILE_HOURS:
                _LOGGER.warning(f"Not enough historical data: {len(hourly_data)} hours")
                return []

            # Create sliding window profiles (každý den = nový profil)
            # Posuneme o 24h, takže každý profil je jiný den+předchozích 48h
            profiles = []
            step = 24  # Posun po 24h (1 den)

            for i in range(0, len(hourly_data) - PROFILE_HOURS + 1, step):
                profile_data = hourly_data[i : i + PROFILE_HOURS]

                if len(profile_data) == PROFILE_HOURS:
                    profiles.append(
                        {
                            "consumption_kwh": profile_data,
                            "total_consumption": float(np.sum(profile_data)),
                            "avg_consumption": float(np.mean(profile_data)),
                        }
                    )

            _LOGGER.info(
                f"✅ Loaded {len(profiles)} historical 72h profiles from {len(hourly_data)} hours of data"
            )

            return profiles

        except Exception as e:
            _LOGGER.error(f"Failed to load historical profiles: {e}", exc_info=True)
            return []

    def _calculate_profile_similarity(
        self, current_48h: List[float], profile_first_48h: List[float]
    ) -> float:
        """
        Spočítat similarity score mezi aktuálními 48h a prvními 48h profilu.

        Scoring:
        - 50% correlation coefficient (Pearsonův korelační koeficient)
        - 30% RMSE (root mean square error - inverted)
        - 20% total consumption difference (inverted)

        Args:
            current_48h: Aktuální 48h spotřeby
            profile_first_48h: První 48h historického profilu

        Returns:
            Similarity score 0.0 - 1.0 (1.0 = perfektní match)
        """
        if (
            len(current_48h) != PROFILE_MATCH_HOURS
            or len(profile_first_48h) != PROFILE_MATCH_HOURS
        ):
            _LOGGER.warning(
                f"Invalid data length for similarity: {len(current_48h)}, {len(profile_first_48h)}"
            )
            return 0.0

        try:
            # Convert to numpy arrays
            current = np.array(current_48h)
            profile = np.array(profile_first_48h)

            # 1. Correlation coefficient (50%)
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
        self, current_consumption_sensor: str
    ) -> Optional[Dict[str, Any]]:
        """
        Najít nejlepší matching 72h profil pro aktuální spotřebu.

        Args:
            current_consumption_sensor: Entity ID senzoru spotřeby

        Returns:
            Best matching profil s predicted consumption pro příštích 24h, nebo None
        """
        if not self._hass:
            return None

        try:
            # 1. Načíst aktuální 72h spotřeby (použijeme posledních 48h)
            current_72h = await self._get_consumption_history_72h(
                current_consumption_sensor
            )

            if not current_72h or len(current_72h) < PROFILE_MATCH_HOURS:
                _LOGGER.warning("Not enough current consumption data for matching")
                return None

            # Vezmi posledních 48h (nejnovější data)
            current_48h = current_72h[-PROFILE_MATCH_HOURS:]

            # 2. Načíst historické profily ze statistics (několik týdnů dat, rozdělených na 72h bloky)
            profiles = await self._load_historical_profiles(current_consumption_sensor)

            if not profiles:
                _LOGGER.warning("No historical profiles available for matching")
                return None

            # 3. Najít best match
            best_match = None
            best_score = 0.0

            for profile in profiles:
                # Vezmi první 48h z profilu
                profile_data = profile.get("consumption_kwh", [])
                if len(profile_data) != PROFILE_HOURS:
                    continue

                profile_first_48h = profile_data[:PROFILE_MATCH_HOURS]

                # Spočítat similarity
                score = self._calculate_profile_similarity(
                    current_48h, profile_first_48h
                )

                if score > best_score:
                    best_score = score
                    best_match = profile

            if not best_match:
                _LOGGER.warning("No matching profile found")
                return None

            # 4. Extrahovat predicted 24h (poslední 24h z matched profilu)
            matched_consumption = best_match.get("consumption_kwh", [])
            predicted_24h = matched_consumption[-PROFILE_PREDICT_HOURS:]

            result = {
                "matched_profile_created": best_match.get("created_at"),
                "similarity_score": best_score,
                "predicted_consumption_24h": predicted_24h,
                "predicted_total_kwh": float(np.sum(predicted_24h)),
                "predicted_avg_kwh": float(np.mean(predicted_24h)),
                "matched_profile_total": best_match.get("total_consumption"),
            }

            _LOGGER.info(
                f"🎯 Best matching profile: score={best_score:.3f}, "
                f"predicted_24h={result['predicted_total_kwh']:.2f} kWh"
            )

            return result

        except Exception as e:
            _LOGGER.error(f"Failed to find matching profile: {e}", exc_info=True)
            return None

    @property
    def native_value(self) -> Optional[str]:
        """Return profiling status."""
        if self._current_prediction:
            total = self._current_prediction.get("predicted_total_kwh", 0)
            return f"{total:.1f} kWh"
        return "no_data"

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return attributes."""
        attrs = {
            "profiling_status": self._profiling_status,
            "profiling_error": self._profiling_error,
            "last_profile_created": (
                self._last_profile_created.isoformat()
                if self._last_profile_created
                else None
            ),
        }

        # Add prediction summary if available
        if self._current_prediction:
            attrs["prediction_summary"] = {
                "similarity_score": self._current_prediction.get("similarity_score"),
                "predicted_total_kwh": self._current_prediction.get(
                    "predicted_total_kwh"
                ),
                "predicted_avg_kwh": self._current_prediction.get("predicted_avg_kwh"),
            }

            # Add today_profile and tomorrow_profile for battery_forecast integration
            predicted_24h = self._current_prediction.get(
                "predicted_consumption_24h", []
            )
            if predicted_24h and len(predicted_24h) == 24:
                similarity_score = self._current_prediction.get("similarity_score", 0)

                # Vytvoř základní metadata profilu
                now = dt_util.now()
                season = _get_season(now)
                is_weekend = now.weekday() >= 5  # 5=Sobota, 6=Neděle

                # Vytvoř UI-friendly název profilu pomocí inteligentní logiky
                profile_name = _generate_profile_name(
                    hourly_consumption=predicted_24h,
                    season=season,
                    is_weekend=is_weekend,
                )

                profile_data = {
                    "hourly_consumption": predicted_24h,
                    "total_kwh": self._current_prediction.get(
                        "predicted_total_kwh", 0.0
                    ),
                    "avg_kwh_h": self._current_prediction.get("predicted_avg_kwh", 0.0),
                    # Přidej metadata pro _format_profile_description()
                    "ui": {
                        "name": profile_name,
                        "similarity_score": similarity_score,
                    },
                    "characteristics": {
                        "season": season,
                        "is_weekend": is_weekend,
                    },
                    "sample_count": 1,  # Reprezentuje 1 matched profil
                }
                attrs["today_profile"] = profile_data
                attrs["tomorrow_profile"] = (
                    profile_data  # Same for now, can differentiate later
                )

        return attrs

    def get_current_prediction(self) -> Optional[Dict[str, Any]]:
        """Get current consumption prediction for use by other components."""
        return self._current_prediction

    @property
    def device_info(self) -> Dict[str, Any]:
        """Return device info."""
        return self._device_info
