"""Sensor pro automatickou tvorbu adaptivních profilů spotřeby z historických dat."""

import logging
import asyncio
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

        # Profily storage
        self._profiles: Dict[str, Dict[str, Any]] = {}
        self._last_analysis: Optional[datetime] = None
        self._analysis_in_progress: bool = False
        self._initial_analysis_done: bool = False

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - spustit async initial analysis."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # Schedule initial analysis with delay (non-blocking)
        _LOGGER.info(
            "Adaptive load profiles sensor initialized, scheduling initial analysis..."
        )
        asyncio.create_task(self._delayed_initial_analysis())

        # TODO: Schedule nightly analysis at 02:00
        # from homeassistant.helpers.event import async_track_time_change
        # async_track_time_change(self.hass, self._nightly_analysis, hour=2, minute=0)

    async def _delayed_initial_analysis(self) -> None:
        """Initial analysis with delay to avoid blocking HA startup."""
        # Wait 10 seconds for HA to settle
        await asyncio.sleep(10)

        _LOGGER.info("Starting initial adaptive profiles analysis...")
        await self._run_analysis()

        self._initial_analysis_done = True
        _LOGGER.info("Initial adaptive profiles analysis completed")

    async def _run_analysis(self) -> None:
        """
        Hlavní analýza - načíst historical data a vytvořit profily.

        Používá jen posledních 90 dní pro rychlost.
        """
        if self._analysis_in_progress:
            _LOGGER.warning("Analysis already in progress, skipping")
            return

        try:
            self._analysis_in_progress = True
            start_time = datetime.now()

            consumption_sensor = f"sensor.oig_{self._box_id}_actual_aco_p"

            # Načíst všechna dostupná data z recorderu
            historical_days = await self._load_historical_days(
                consumption_sensor, max_days=None
            )

            if not historical_days:
                _LOGGER.warning("No historical data loaded for analysis")
                return

            _LOGGER.info(
                f"Loaded {len(historical_days)} days from recorder for clustering"
            )

            # Cluster similar days - vytvoří max 20 profilů
            profiles = self._cluster_similar_days(historical_days)

            if not profiles:
                _LOGGER.warning("No profiles created from clustering")
                return

            _LOGGER.info(f"Clustering complete: {len(profiles)} profiles created")

            # Uložit profily
            self._profiles = profiles
            self._last_analysis = datetime.now()

            elapsed = (datetime.now() - start_time).total_seconds()
            _LOGGER.info(
                f"Analysis completed in {elapsed:.1f}s: "
                f"{len(profiles)} profiles from {len(historical_days)} days"
            )

            # Trigger state update
            self.async_write_ha_state()

        except Exception as e:
            _LOGGER.error(
                f"Error during adaptive profiles analysis: {e}", exc_info=True
            )
        finally:
            self._analysis_in_progress = False

    async def _load_historical_days(
        self, consumption_sensor: str, max_days: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Načíst historical days přímo z databáze (obchází purge_keep_days limit).

        Optimalizovaná verze - jeden SQL query pro všechna data, pak zpracování v Pythonu.
        """
        try:
            from homeassistant.helpers.recorder import get_instance
            from sqlalchemy import text

            recorder_instance = get_instance(self.hass)
            if not recorder_instance:
                _LOGGER.error("Recorder instance not available")
                return []

            end_time = dt_util.now().replace(hour=0, minute=0, second=0, microsecond=0)

            # Pokud není specifikováno, použít až rok dat
            if max_days is None:
                max_days = 365

            start_time = end_time - timedelta(days=max_days)

            _LOGGER.info(
                f"Loading historical data from database: {max_days} days "
                f"({start_time.date()} - {end_time.date()})"
            )

            # Načíst VŠECHNA data najednou - jeden SQL query
            def get_all_states():
                """Query pro získání hodinových průměrů ze statistics - spustí se v executoru."""
                from homeassistant.helpers.recorder import get_instance, session_scope

                instance = get_instance(self.hass)
                with session_scope(
                    hass=self.hass, session=instance.get_session()
                ) as session:
                    # Čteme ze statistics tabulky (hodinové průměry, dlouhodobé uložení)
                    # místo states tabulky (raw data, omezená purge_keep_days)
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
                            "statistic_id": consumption_sensor,
                            "start_ts": start_ts,
                            "end_ts": end_ts,
                        },
                    )
                    return result.fetchall()

            # Spustit query v executoru
            _LOGGER.debug(f"Executing SQL query for {consumption_sensor}...")
            all_states = await self.hass.async_add_executor_job(get_all_states)

            if not all_states:
                _LOGGER.warning(
                    f"No historical data found in database for {consumption_sensor}"
                )
                return []

            _LOGGER.info(
                f"Loaded {len(all_states)} hourly statistics from database, processing by day..."
            )

            # Zpracovat data po dnech v Pythonu
            # Statistics už obsahuje hodinové průměry (1 záznam/hodina)
            days_data = {}  # {date: {hour: value}}

            for row in all_states:
                try:
                    mean_value = float(row[0])  # mean (hodinový průměr)
                    timestamp_ts = float(
                        row[1]
                    )  # start_ts (UNIX timestamp začátku hodiny)

                    # Převést UNIX timestamp na datetime
                    timestamp = datetime.fromtimestamp(timestamp_ts, tz=dt_util.UTC)

                    # Sanity check
                    if mean_value < 0 or mean_value > 20000:
                        continue

                    # Získat den a hodinu
                    day_date = timestamp.date()
                    hour = timestamp.hour

                    # Inicializovat den pokud neexistuje
                    if day_date not in days_data:
                        days_data[day_date] = {}

                    # Uložit hodinový průměr (už je agregovaný ze statistics)
                    days_data[day_date][hour] = mean_value

                except (ValueError, AttributeError, IndexError) as e:
                    continue

            _LOGGER.info(
                f"Processed {len(days_data)} days from {len(all_states)} hourly statistics"
            )

            # Převést na finální formát
            days = []
            skipped_days = 0
            sorted_dates = sorted(days_data.keys())

            for i, day_date in enumerate(sorted_dates):
                hourly_data = days_data[day_date]

                # Sestavit hodinovou spotřebu (statistics už obsahuje hodinové průměry)
                hourly_consumption = []
                for hour in range(24):
                    if hour in hourly_data:
                        avg_watts = hourly_data[hour]
                        kwh = avg_watts / 1000
                        hourly_consumption.append(kwh)
                    else:
                        hourly_consumption.append(0.0)

                # Skip days s chybějícími daty (>12h missing)
                missing_hours = hourly_consumption.count(0.0)
                if missing_hours > 12:
                    skipped_days += 1
                    continue

                total_consumption = sum(hourly_consumption)
                day_datetime = datetime.combine(day_date, datetime.min.time())
                is_weekend = day_datetime.weekday() >= 5
                day_of_week = day_datetime.weekday()

                # Určit season
                month = day_date.month
                if month in [12, 1, 2]:
                    season = "winter"
                elif month in [3, 4, 5]:
                    season = "spring"
                elif month in [6, 7, 8]:
                    season = "summer"
                else:
                    season = "autumn"

                # Detekovat transition type (pátek→sobota, neděle→pondělí)
                transition_type = None
                if i + 1 < len(sorted_dates):
                    next_date = sorted_dates[i + 1]
                    next_day_of_week = datetime.combine(
                        next_date, datetime.min.time()
                    ).weekday()

                    # Pátek (4) → Sobota (5)
                    if day_of_week == 4 and next_day_of_week == 5:
                        transition_type = "friday_to_saturday"
                    # Neděle (6) → Pondělí (0)
                    elif day_of_week == 6 and next_day_of_week == 0:
                        transition_type = "sunday_to_monday"

                days.append(
                    {
                        "date": day_date,
                        "day_of_week": day_of_week,
                        "is_weekend": is_weekend,
                        "season": season,
                        "transition_type": transition_type,
                        "hourly_consumption": hourly_consumption,
                        "total_consumption": total_consumption,
                    }
                )

            _LOGGER.info(
                f"Loaded {len(days)} valid days from database "
                f"(skipped {skipped_days} days with insufficient data)"
            )

            return days

        except Exception as e:
            _LOGGER.error(f"Error loading historical days: {e}", exc_info=True)
            return []

    async def _load_single_day(
        self, day_start: datetime, consumption_sensor: str
    ) -> Optional[Dict[str, Any]]:
        """Načíst data pro jeden den z recorderu."""
        try:
            day_end = day_start + timedelta(days=1)

            # Načíst states z recorderu
            states = await self.hass.async_add_executor_job(
                history.state_changes_during_period,
                self.hass,
                day_start,
                day_end,
                consumption_sensor,
            )

            if not states or consumption_sensor not in states:
                _LOGGER.debug(f"No states found for {day_start.date()}")
                return None

            consumption_states = states[consumption_sensor]
            if not consumption_states:
                _LOGGER.debug(f"Empty states for {day_start.date()}")
                return None

            # Spočítat hourly consumption (24 hodnot)
            hourly_values = [[] for _ in range(24)]

            for state in consumption_states:
                try:
                    hour = state.last_updated.hour
                    value = float(state.state)

                    if value < 0 or value > 20000:  # Sanity check
                        continue

                    hourly_values[hour].append(value)
                except (ValueError, AttributeError):
                    continue

            # Průměr pro každou hodinu → kWh
            hourly_consumption = []
            for hour_values in hourly_values:
                if hour_values:
                    avg_watts = statistics.mean(hour_values)
                    kwh = avg_watts / 1000
                    hourly_consumption.append(kwh)
                else:
                    hourly_consumption.append(0.0)

            # Skip days s chybějícími daty (>12h missing)
            missing_hours = hourly_consumption.count(0.0)
            if missing_hours > 12:
                _LOGGER.debug(
                    f"Skipping {day_start.date()}: {missing_hours} hours missing data"
                )
                return None

            total_consumption = sum(hourly_consumption)
            is_weekend = day_start.weekday() >= 5

            # Určit season
            month = day_start.month
            if month in [12, 1, 2]:
                season = "winter"
            elif month in [3, 4, 5]:
                season = "spring"
            elif month in [6, 7, 8]:
                season = "summer"
            else:
                season = "autumn"

            return {
                "date": day_start.date(),
                "day_of_week": day_start.weekday(),
                "is_weekend": is_weekend,
                "season": season,
                "hourly_consumption": hourly_consumption,
                "total_consumption": total_consumption,
            }

        except Exception as e:
            _LOGGER.debug(f"Error loading day {day_start.date()}: {e}")
            return None

    def _cluster_similar_days(
        self, historical_days: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Hierarchický clustering podobných dnů.

        Vytvoří profily:
        - Standardní: weekend/weekday × 4 seasons
        - Přechodové: friday_to_saturday/sunday_to_monday × 4 seasons
        - Sub-clustery podle consumption level (low/medium/high)
        """
        if not historical_days:
            return {}

        # Base clustering: transition_type nebo (day_type × season)
        base_clusters: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

        for day in historical_days:
            # Priorita: transition type má přednost
            if day.get("transition_type"):
                season = day["season"]
                base_id = f"{day['transition_type']}_{season}"
            else:
                day_type = "weekend" if day["is_weekend"] else "weekday"
                season = day["season"]
                base_id = f"{day_type}_{season}"

            base_clusters[base_id].append(day)

        _LOGGER.info(
            f"Base clustering: {len(base_clusters)} clusters "
            f"from {len(historical_days)} days"
        )

        # Sub-cluster each base cluster
        all_profiles = {}

        for base_id, days in base_clusters.items():
            if len(days) < 3:  # Skip malé clustery
                _LOGGER.debug(f"Skipping {base_id}: only {len(days)} days")
                continue

            # Sub-cluster podle consumption level
            sub_profiles = self._sub_cluster_by_consumption(days, base_id)
            all_profiles.update(sub_profiles)

        return all_profiles

    def _sub_cluster_by_consumption(
        self, days: List[Dict[str, Any]], base_name: str
    ) -> Dict[str, Dict[str, Any]]:
        """Sub-clustering podle consumption level."""
        if len(days) < 3:
            return {}

        # Spočítat consumption quantiles
        total_consumptions = [d["total_consumption"] for d in days]

        if len(days) >= 9:  # Rozdělit na 3 (low/medium/high)
            q33 = statistics.quantiles(total_consumptions, n=3)[0]
            q66 = statistics.quantiles(total_consumptions, n=3)[1]

            sub_clusters = {
                "low": [d for d in days if d["total_consumption"] < q33],
                "medium": [d for d in days if q33 <= d["total_consumption"] < q66],
                "high": [d for d in days if d["total_consumption"] >= q66],
            }
        else:  # Jen 1 profil
            sub_clusters = {"typical": days}

        # Vytvořit profily
        profiles = {}

        for level, cluster_days in sub_clusters.items():
            if len(cluster_days) < 2:
                continue

            profile_id = f"{base_name}_{level}"
            profile = self._create_profile_from_days(profile_id, cluster_days)

            if profile:
                profiles[profile_id] = profile

        return profiles

    def _create_profile_from_days(
        self, profile_id: str, days: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Vytvořit profil z clusteru dnů."""
        if not days:
            return None

        # Průměrná hourly consumption
        avg_hourly = [0.0] * 24
        for day in days:
            for hour in range(24):
                avg_hourly[hour] += day["hourly_consumption"][hour]

        for hour in range(24):
            avg_hourly[hour] /= len(days)

        total_daily_avg = sum(avg_hourly)

        # Characteristics
        peak_hour = avg_hourly.index(max(avg_hourly))
        peak_consumption = max(avg_hourly)

        # UI metadata (Python heuristics)
        ui_metadata = self._generate_profile_description(profile_id, avg_hourly, days)

        # Sample dates (max 10)
        sample_dates = [str(d["date"]) for d in days[:10]]

        # Detekovat transition type z prvního dne
        transition_type = days[0].get("transition_type")

        return {
            "profile_id": profile_id,
            "hourly_consumption": avg_hourly,
            "total_daily_avg": round(total_daily_avg, 2),
            "ui": ui_metadata,
            "characteristics": {
                "peak_hour": peak_hour,
                "peak_consumption": round(peak_consumption, 3),
                "day_type": days[0]["is_weekend"] and "weekend" or "weekday",
                "season": days[0]["season"],
                "transition_type": transition_type,  # friday_to_saturday, sunday_to_monday, nebo None
            },
            "sample_dates": sample_dates,
            "sample_count": len(days),
            "last_updated": datetime.now().isoformat(),
        }

    def _generate_profile_description(
        self,
        profile_id: str,
        hourly_consumption: List[float],
        days: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Python heuristiky pro generování UI metadata."""
        # Parse profile_id: může být transition (friday_to_saturday_winter) nebo standard (weekday_winter_high)
        parts = profile_id.split("_")

        # Detekovat transition profily
        if "to" in parts:
            # friday_to_saturday_winter_high
            transition_type = f"{parts[0]}_to_{parts[2]}"  # friday_to_saturday
            season = parts[3]  # winter
            level = parts[4] if len(parts) > 4 else "typical"
            day_type = "transition"
        else:
            # weekday_winter_high
            day_type = parts[0]  # weekday/weekend
            season = parts[1]  # winter/spring/summer/autumn
            level = parts[2] if len(parts) > 2 else "typical"  # low/medium/high/typical
            transition_type = None

        # Emoji + aktivities
        emoji = "📊"
        activities = []
        tags = []

        # Transition-specific
        if transition_type == "friday_to_saturday":
            emoji = "🎉"
            activities.append("Páteční večer")
            tags.append("víkend_start")
        elif transition_type == "sunday_to_monday":
            emoji = "📅"
            activities.append("Příprava na týden")
            tags.append("týden_start")

        # Season-based
        if season == "winter" and level in ["medium", "high"]:
            activities.append("Topení")
            if not transition_type:
                emoji = "🔥"
            tags.append("topení")
        elif season == "summer" and level in ["medium", "high"]:
            activities.append("Klimatizace")
            if not transition_type:
                emoji = "❄️"
            tags.append("klimatizace")

        # Pattern detection (morning/evening peak)
        morning_avg = statistics.mean(hourly_consumption[6:12])
        evening_avg = statistics.mean(hourly_consumption[16:22])
        day_avg = statistics.mean(hourly_consumption)

        if morning_avg > day_avg * 1.3:
            activities.append("Ranní špička")
            tags.append("ranní špička")
            if day_type == "weekend":
                activities.append("Praní")
                emoji = "🧺"
                tags.append("praní")
        elif evening_avg > day_avg * 1.3:
            activities.append("Večerní špička")
            tags.append("večerní špička")

        # Generate short name
        day_type_cs = "Víkend" if day_type == "weekend" else "Pracovní den"
        season_cs = {
            "winter": "zima",
            "spring": "jaro",
            "summer": "léto",
            "autumn": "podzim",
        }[season]

        level_cs = {
            "low": "nízká spotřeba",
            "medium": "střední spotřeba",
            "high": "vysoká spotřeba",
            "typical": "",
        }.get(level, "")

        # Prioritize activities for name
        if "Praní" in activities:
            name_short = f"{day_type_cs} s praním"
        elif "Topení" in activities:
            name_short = f"{day_type_cs} s topením"
        elif "Klimatizace" in activities:
            name_short = f"{day_type_cs} s klimatizací"
        else:
            name_short = f"{day_type_cs} ({season_cs})"
            if level_cs:
                name_short += f" - {level_cs}"

        return {
            "name": name_short,
            "emoji": emoji,
            "description": f"{name_short}, průměr {sum(hourly_consumption):.1f} kWh/den",
            "activities": activities[:5],
            "tags": tags[:5],
        }

    @property
    def native_value(self) -> Optional[int]:
        """Return počet profilů."""
        return len(self._profiles) if self._profiles else 0

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return attributes s profily."""
        return {
            "profiles": self._profiles,
            "profile_count": len(self._profiles),
            "last_analysis": (
                self._last_analysis.isoformat() if self._last_analysis else None
            ),
            "analysis_in_progress": self._analysis_in_progress,
            "initial_analysis_done": self._initial_analysis_done,
        }

    @property
    def device_info(self) -> Dict[str, Any]:
        """Return device info."""
        return self._device_info
