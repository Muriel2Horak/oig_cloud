"""Sensor pro automatickou tvorbu adaptivních profilů spotřeby z historických dat."""

import logging
import asyncio
import hashlib
import json
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
PROFILE_EVENT_TYPE = "oig_cloud_consumption_profile_72h"
PROFILE_HOURS = 72  # Délka profilu v hodinách
PROFILE_MATCH_HOURS = 48  # Kolik hodin aktuálních dat používáme pro matching
PROFILE_PREDICT_HOURS = 24  # Kolik hodin předpovídáme z matched profilu
MAX_PROFILES = 365  # Maximum načtených profilů (1 rok denních profilů)

# Similarity scoring weights
WEIGHT_CORRELATION = 0.50  # Correlation coefficient weight
WEIGHT_RMSE = 0.30  # RMSE weight (inverted)
WEIGHT_TOTAL = 0.20  # Total consumption difference weight (inverted)


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
        self._data_hash: Optional[str] = None  # MD5 hash of current profile data
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
                    if self._hass:
                        self.async_write_ha_state()

                # Počkat do dalšího dne 00:30
                _LOGGER.info("⏱️ Waiting until tomorrow 00:30 for next profile")
                self._profiling_status = "idle"
                if self._hass:
                    self.async_write_ha_state()

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
        success = await self._create_consumption_profile(consumption_sensor)

        if success:
            self._last_profile_created = dt_util.now()
            self._profiling_status = "ok"
            self._profiling_error = None

            # Načíst best match a uložit do coordinatoru
            prediction = await self._find_best_matching_profile(consumption_sensor)
            self._current_prediction = prediction

            _LOGGER.info(
                f"✅ Profile created and prediction updated at {self._last_profile_created}"
            )
        else:
            self._profiling_status = "error"
            self._profiling_error = "Failed to create profile"
            _LOGGER.warning("❌ Failed to create daily consumption profile")

        if self._hass:
            self.async_write_ha_state()

    # ============================================================================
    # 72h Consumption Profiling System
    # ============================================================================

    async def _get_consumption_history_72h(
        self, consumption_sensor_entity_id: str
    ) -> Optional[List[float]]:
        """
        Načíst 72 hodin spotřeby z historie (hourly průměry).

        Args:
            consumption_sensor_entity_id: Entity ID senzoru spotřeby

        Returns:
            List 72 float hodnot (hodinové průměry v kWh), nebo None při chybě
        """
        if not self._hass:
            _LOGGER.warning("Cannot get consumption history - no hass instance")
            return None

        try:
            end_time = dt_util.now()
            start_time = end_time - timedelta(hours=PROFILE_HOURS)

            # Získat historical data
            history_data = await self._hass.async_add_executor_job(
                history.state_changes_during_period,
                self._hass,
                start_time,
                end_time,
                consumption_sensor_entity_id,
            )

            if not history_data or consumption_sensor_entity_id not in history_data:
                _LOGGER.warning(f"No history data for {consumption_sensor_entity_id}")
                return None

            states = history_data[consumption_sensor_entity_id]
            if not states:
                return None

            # Seskupit do hodinových průměrů
            hourly_consumption = []
            for hour_offset in range(PROFILE_HOURS):
                hour_start = start_time + timedelta(hours=hour_offset)
                hour_end = hour_start + timedelta(hours=1)

                # Filtrace states v této hodině
                hour_states = [
                    s
                    for s in states
                    if hour_start <= dt_util.as_local(s.last_changed) < hour_end
                ]

                if hour_states:
                    # Průměr hodnot v této hodině
                    values = []
                    for s in hour_states:
                        try:
                            values.append(float(s.state))
                        except (ValueError, TypeError):
                            continue

                    if values:
                        hourly_consumption.append(float(np.mean(values)))
                    else:
                        hourly_consumption.append(0.0)
                else:
                    # Žádná data - použít 0
                    hourly_consumption.append(0.0)

            if len(hourly_consumption) != PROFILE_HOURS:
                _LOGGER.warning(
                    f"Expected {PROFILE_HOURS} hours, got {len(hourly_consumption)}"
                )
                return None

            return hourly_consumption

        except Exception as e:
            _LOGGER.error(f"Failed to get consumption history: {e}", exc_info=True)
            return None

    async def _create_consumption_profile(
        self, consumption_sensor_entity_id: str
    ) -> bool:
        """
        Vytvořit nový 72h consumption profil a uložit do recorderu.

        Args:
            consumption_sensor_entity_id: Entity ID senzoru spotřeby

        Returns:
            True pokud úspěch, False při chybě
        """
        if not self._hass:
            return False

        try:
            # Načíst 72h data
            consumption_data = await self._get_consumption_history_72h(
                consumption_sensor_entity_id
            )

            if not consumption_data:
                _LOGGER.warning("Cannot create profile - no consumption data")
                return False

            # Připravit event data
            now = dt_util.now()
            profile_data = {
                "box_id": self._box_id,
                "created_at": now.isoformat(),
                "profile_hours": PROFILE_HOURS,
                "consumption_kwh": consumption_data,  # List[float] - 72 hodin
                "total_consumption": float(np.sum(consumption_data)),
                "avg_consumption": float(np.mean(consumption_data)),
                "max_consumption": float(np.max(consumption_data)),
                "min_consumption": float(np.min(consumption_data)),
            }

            # Spočítat hash pro change detection
            self._data_hash = self._calculate_data_hash(profile_data)

            # Fire event do recorderu
            self._hass.bus.async_fire(
                PROFILE_EVENT_TYPE,
                profile_data,
            )

            _LOGGER.info(
                f"📊 Created 72h consumption profile: "
                f"total={profile_data['total_consumption']:.2f} kWh, "
                f"avg={profile_data['avg_consumption']:.3f} kWh/h, "
                f"hash={self._data_hash[:8]}"
            )

            return True

        except Exception as e:
            _LOGGER.error(f"Failed to create consumption profile: {e}", exc_info=True)
            return False

    async def _load_consumption_profiles(
        self, max_profiles: int = MAX_PROFILES
    ) -> List[Dict[str, Any]]:
        """
        Načíst 72h consumption profily z recorderu.

        Args:
            max_profiles: Maximum načtených profilů (default 365)

        Returns:
            List profilů seřazených od nejnovějšího
        """
        if not self._hass:
            _LOGGER.warning("Cannot load profiles - no hass instance")
            return []

        try:
            from homeassistant.helpers.recorder import get_instance
            from sqlalchemy import text

            recorder = get_instance(self._hass)
            if not recorder or not recorder.engine:
                _LOGGER.warning("Recorder not available")
                return []

            # Načíst max_profiles nejnovějších
            with recorder.engine.connect() as conn:
                query = text(
                    """
                    SELECT event_data
                    FROM events
                    WHERE event_type = :event_type
                    AND JSON_EXTRACT(event_data, '$.box_id') = :box_id
                    ORDER BY time_fired DESC
                    LIMIT :limit
                """
                )

                result = conn.execute(
                    query,
                    {
                        "event_type": PROFILE_EVENT_TYPE,
                        "box_id": self._box_id,
                        "limit": max_profiles,
                    },
                )
                profiles = [json.loads(row[0]) for row in result]

            _LOGGER.debug(f"Loaded {len(profiles)} consumption profiles from recorder")
            return profiles

        except Exception as e:
            _LOGGER.error(f"Failed to load consumption profiles: {e}", exc_info=True)
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

            # 2. Načíst historické profily
            profiles = await self._load_consumption_profiles()

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

    def _calculate_data_hash(self, data: Dict[str, Any]) -> str:
        """Calculate MD5 hash of profile data for change detection."""
        data_string = json.dumps(data, sort_keys=True)
        return hashlib.md5(data_string.encode()).hexdigest()

    @property
    def native_value(self) -> Optional[str]:
        """Return hash of current profile data."""
        return self._data_hash[:8] if self._data_hash else "no_data"

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
            "data_hash": self._data_hash,
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

        return attrs

    def get_current_prediction(self) -> Optional[Dict[str, Any]]:
        """Get current consumption prediction for use by other components."""
        return self._current_prediction

    @property
    def device_info(self) -> Dict[str, Any]:
        """Return device info."""
        return self._device_info
