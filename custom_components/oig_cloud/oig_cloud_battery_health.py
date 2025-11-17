"""Battery Health Monitoring - měření skutečné kapacity a degradace baterie."""

import logging
import json
import os
import numpy as np
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from collections import deque

from homeassistant.components.sensor import (
    SensorEntity,
    SensorDeviceClass,
    SensorStateClass,
)
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)


@dataclass
class BatteryMeasurement:
    """Struktura pro jedno měření kapacity baterie."""

    timestamp: datetime
    capacity_kwh: float
    soh_percent: float
    start_soc: float
    end_soc: float
    delta_soc: float
    method: str  # "power_integration_retrospective"
    validated: bool  # Vždy False pro retrospektivní
    confidence: float  # 0.0 - 1.0
    total_charge_wh: float  # Celková nabíjecí energie
    total_discharge_wh: float  # Celková vybíjecí energie
    duration_hours: float  # Délka cyklu v hodinách

    # Purity metrics
    purity: float  # 0.0 - 1.0 (% čisté energie dovnitř)
    interruption_count: int  # Počet přerušení vybíjením
    quality_score: float  # 0-100 (celkové quality score)

    # Coulomb counting nepoužíváme v retrospektivě
    coulomb_capacity_kwh: Optional[float] = None
    coulomb_discrepancy_percent: Optional[float] = None


class BatteryCapacityTracker:
    """RETROSPEKTIVNÍ sledování a měření skutečné kapacity baterie z DB."""

    def __init__(
        self,
        hass: HomeAssistant,
        box_id: str,
        nominal_capacity_kwh: float = 15.36,
    ) -> None:
        """
        Inicializace capacity trackeru.

        Args:
            hass: Home Assistant instance
            box_id: ID OIG zařízení
            nominal_capacity_kwh: Nominální kapacita baterie (default 15.36 kWh - instalovaná kapacita)
        """
        self._hass = hass
        self._box_id = box_id
        self._nominal_capacity = nominal_capacity_kwh

        # Measurements history (max 100 posledních měření)
        self._measurements: deque[BatteryMeasurement] = deque(maxlen=100)

        # RETROSPEKTIVNÍ KRITÉRIA - na základě empirické analýzy dat
        # Analýza ukázala, že malé cykly (<60%) dávají nepřesné výsledky (SoH >120%)
        # Velké cykly (≥60%) dávají realistické výsledky (SoH ~96%)
        self._min_delta_soc = (
            60.0  # % - minimum swing (zvýšeno z 40% pro vyšší přesnost)
        )
        # Pokud máme málo kvalitních cyklů, povolíme i medium-swing cykly (45-60 %)
        self._fallback_min_delta_soc = 45.0  # % - nouzový limit pro sparse data
        self._min_strict_cycle_target = 2  # min. počet kvalitních cyklů před fallbackem
        self._min_end_soc = 95.0  # % - konec cyklu musí být ≥95%
        self._min_purity = 0.90  # 90% - min % čisté nabíjecí energie
        self._max_discharge_interrupt_w = 300.0  # W - max vybíjecí výkon
        self._min_quality_score = 60.0  # Minimum pro zařazení

        _LOGGER.info(
            f"BatteryCapacityTracker initialized (RETROSPECTIVE mode), "
            f"nominal capacity: {nominal_capacity_kwh:.2f} kWh"
        )

    def _calculate_quality_score(
        self,
        delta_soc: float,
        purity: float,
        end_soc: float,
        duration_hours: float,
        validated: bool,
    ) -> float:
        """
        Vypočítat quality score 0-100 pro měření.

        Empirická analýza ukázala:
        - Cykly <60% swing: nepřesné (SoH >120%), ale při nedostatku dat je použijeme s penalizací
        - Cykly ≥60% swing: přesné (SoH ~96%)
        - Variační koeficient mezi měřeními: 14%

        Args:
            delta_soc: Rozsah SoC změny (%)
            purity: Čistota nabíjení (0.0-1.0)
            end_soc: Koncový SoC (%)
            duration_hours: Délka cyklu (h)
            validated: Zda bylo validováno coulomb counting

        Returns:
            Quality score 0-100
        """
        score = 100.0

        # 1. Delta SoC bonus - upraveno dle empirických dat
        if delta_soc >= 75:
            score += 30  # Excelentní rozsah (nejvyšší přesnost)
        elif delta_soc >= 65:
            score += 20  # Velmi dobrý rozsah (dobrá přesnost)
        elif delta_soc >= 60:
            score += 10  # Dobrá přesnost, ale menší swing
        elif delta_soc >= 55:
            score += 0  # Akceptovatelný swing
        elif delta_soc >= 50:
            score -= 10  # Medium swing - menší důvěra
        elif delta_soc >= 45:
            score -= 25  # Fallback swing, použijeme jen při nedostatku dat
        else:
            return 0  # Zahodit - pod limitem

        # 2. Purity penalty
        if purity < 0.90:
            return 0  # Příliš přerušované
        elif purity < 0.95:
            score -= 20  # Středně přerušované
        elif purity < 0.98:
            score -= 10  # Mírně přerušované
        # Jinak žádný penalty

        # 3. End SoC bonus
        if end_soc >= 100:
            score += 10  # Perfektní konec
        elif end_soc >= 98:
            score += 5  # Velmi dobrý konec
        elif end_soc < 95:
            return 0  # Zahodit

        # 4. Duration penalty (rychlé = lepší)
        if duration_hours < 6:
            score += 10  # Rychlé nabíjení
        elif duration_hours > 12:
            score -= 10  # Dlouhé nabíjení

        # 5. Validation bonus
        if validated:
            score += 15  # Cross-validated

        return max(0, min(100, score))

    def _calculate_confidence_from_quality(
        self, quality_score: float, delta_soc: float
    ) -> float:
        """Odvodit confidence (0-1) z quality score a velikosti swingu."""
        base = max(0.0, min(1.0, quality_score / 100.0))
        if self._min_delta_soc <= 0:
            return round(base, 3)

        swing_factor = min(1.0, delta_soc / self._min_delta_soc)
        confidence = base * swing_factor
        return round(max(0.0, min(1.0, confidence)), 3)

    async def analyze_history_for_cycles(
        self,
        lookback_days: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[BatteryMeasurement]:
        """
        RETROSPEKTIVNÍ ANALÝZA: Najít nabíjecí cykly v historických datech.

        Args:
            lookback_days: Kolik dní zpět analyzovat (nebo None pokud používáme start/end_time)
            start_time: Custom start time (priorita před lookback_days)
            end_time: Custom end time (default = now)

        Returns:
            Seznam nově nalezených měření
        """
        from homeassistant.helpers import recorder

        # Určit časový rozsah
        if start_time is None:
            if lookback_days:
                start_time = dt_util.now() - timedelta(days=lookback_days)
            else:
                _LOGGER.error("Must provide either lookback_days or start_time")
                return []

        if end_time is None:
            end_time = dt_util.now()

        _LOGGER.info(
            f"🔍 Starting retrospective cycle analysis: {start_time} to {end_time} "
            f"({(end_time - start_time).days} days)"
        )

        # Načíst historii SoC sensoru a energy sensorů
        soc_sensor = f"sensor.oig_{self._box_id}_batt_bat_c"
        charge_energy_sensor = (
            f"sensor.oig_{self._box_id}_computed_batt_charge_energy_today"
        )
        discharge_energy_sensor = (
            f"sensor.oig_{self._box_id}_computed_batt_discharge_energy_today"
        )

        try:
            # Get SoC history from STATISTICS table (long-term data, like profiling does)
            # Statistics table obsahuje 5-minutové průměry a drží data mnohem déle než states
            soc_states = await self._get_soc_statistics(
                soc_sensor, start_time, end_time
            )

            if not soc_states:
                _LOGGER.warning(f"No statistics found for {soc_sensor}")
                return []

            _LOGGER.info(f"Found {len(soc_states)} SoC data points from statistics")

            # Najít nabíjecí cykly: low → high
            cycles = self._detect_charging_cycles_in_history(
                soc_states, self._min_delta_soc
            )
            strict_cycle_count = len(cycles)
            fallback_cycle_count = 0

            # Pokud máme málo kvalitních cyklů, použij fallback ΔSoC threshold
            if (
                strict_cycle_count < self._min_strict_cycle_target
                and self._fallback_min_delta_soc < self._min_delta_soc
            ):
                fallback_candidates = self._detect_charging_cycles_in_history(
                    soc_states, self._fallback_min_delta_soc
                )
                existing_keys = {(c[0], c[1]) for c in cycles}
                for candidate in fallback_candidates:
                    delta_soc = candidate[3] - candidate[2]
                    key = (candidate[0], candidate[1])
                    if (
                        delta_soc >= self._fallback_min_delta_soc
                        and delta_soc < self._min_delta_soc
                        and key not in existing_keys
                    ):
                        cycles.append(candidate)
                        existing_keys.add(key)
                        fallback_cycle_count += 1

                if fallback_cycle_count:
                    _LOGGER.info(
                        "Enabled fallback ΔSoC threshold %.0f%% "
                        "(strict cycles=%d, added medium cycles=%d)",
                        self._fallback_min_delta_soc,
                        strict_cycle_count,
                        fallback_cycle_count,
                    )

            _LOGGER.info(
                "Detected %d potential charging cycles (strict=%d, fallback=%d)",
                len(cycles),
                strict_cycle_count,
                fallback_cycle_count,
            )

            # Pro každý cyklus spočítat kapacitu
            new_measurements = []
            for cycle_start, cycle_end, start_soc, end_soc in cycles:
                # Načíst energy data pro tento interval
                measurement = await self._calculate_capacity_from_energy(
                    cycle_start,
                    cycle_end,
                    start_soc,
                    end_soc,
                    charge_energy_sensor,
                    discharge_energy_sensor,
                )

                if measurement:
                    self._measurements.append(measurement)
                    new_measurements.append(measurement)
                    self._fire_measurement_event(measurement)

            _LOGGER.info(
                f"✅ Retrospective analysis complete: {len(new_measurements)} valid measurements found"
            )
            return new_measurements

        except Exception as e:
            _LOGGER.error(f"Error during retrospective analysis: {e}", exc_info=True)
            return []

    async def _get_soc_statistics(
        self, soc_sensor: str, start_time: datetime, end_time: datetime
    ) -> List:
        """
        Načíst SoC statistiky z long-term statistics table (jako profiling).

        Statistics table drží data mnohem déle než states table (~10 dní).
        Vrací pseudo-states objekty kompatibilní s _detect_charging_cycles_in_history().

        Args:
            soc_sensor: Entity ID SoC senzoru
            start_time: Začátek období
            end_time: Konec období

        Returns:
            List pseudo-state objektů s atributy: state, last_changed
        """
        from homeassistant.helpers.recorder import get_instance
        from sqlalchemy import text
        from dataclasses import dataclass

        @dataclass
        class PseudoState:
            """Pseudo-state object pro kompatibilitu s cycle detection."""

            state: str
            last_changed: datetime

        def get_statistics():
            """Query statistics table for SoC data."""
            from homeassistant.helpers.recorder import session_scope

            instance = get_instance(self._hass)
            with session_scope(
                hass=self._hass, session=instance.get_session()
            ) as session:
                start_ts = int(start_time.timestamp())
                end_ts = int(end_time.timestamp())

                # Query short_term statistics (5-minute averages) - obsahuje mean
                query = text(
                    """
                    SELECT s.mean, s.start_ts
                    FROM statistics_short_term s
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
                        "statistic_id": soc_sensor,
                        "start_ts": start_ts,
                        "end_ts": end_ts,
                    },
                )
                return result.fetchall()

        try:
            _LOGGER.debug(
                f"Loading SoC statistics for {soc_sensor} from {start_time} to {end_time}"
            )
            stats_rows = await self._hass.async_add_executor_job(get_statistics)

            if not stats_rows:
                _LOGGER.warning(f"No statistics data for {soc_sensor}")
                return []

            # Convert SQL rows to pseudo-state objects
            pseudo_states = []
            for mean_value, start_ts in stats_rows:
                pseudo_states.append(
                    PseudoState(
                        state=str(mean_value),
                        last_changed=datetime.fromtimestamp(start_ts, tz=dt_util.UTC),
                    )
                )

            _LOGGER.debug(f"Loaded {len(pseudo_states)} SoC statistics records")
            return pseudo_states

        except Exception as e:
            _LOGGER.error(f"Error loading SoC statistics: {e}", exc_info=True)
            return []

    def _detect_charging_cycles_in_history(
        self, soc_states: List, min_delta_soc: float
    ) -> List[Tuple[datetime, datetime, float, float]]:
        """
        Detekovat nabíjecí cykly v historii SoC.

        Args:
            soc_states: Historie SoC hodnot (pseudo-states)
            min_delta_soc: Minimální požadovaný swing pro detekci cyklu

        Returns:
            List of (start_time, end_time, start_soc, end_soc)
        """
        cycles = []
        in_cycle = False
        cycle_start_time: Optional[datetime] = None
        cycle_start_soc: Optional[float] = None
        last_soc: Optional[float] = None

        for state in soc_states:
            if state.state in ["unknown", "unavailable"]:
                continue

            try:
                soc = float(state.state)
                timestamp = state.last_changed

                # Start cycle: SoC < 90% a rostoucí
                if not in_cycle and soc < 90 and (last_soc is None or soc > last_soc):
                    in_cycle = True
                    cycle_start_time = timestamp
                    cycle_start_soc = soc
                    _LOGGER.debug("Cycle started: %.1f%% at %s", soc, timestamp)

                # End cycle: SoC >= 95%
                elif (
                    in_cycle
                    and soc >= self._min_end_soc
                    and cycle_start_soc is not None
                ):
                    delta_soc = soc - cycle_start_soc
                    if delta_soc >= min_delta_soc and cycle_start_time is not None:
                        cycles.append(
                            (cycle_start_time, timestamp, cycle_start_soc, soc)
                        )
                        _LOGGER.debug(
                            f"Cycle completed: {cycle_start_soc:.1f}% → {soc:.1f}% ({delta_soc:.1f}%)"
                        )
                    in_cycle = False

                last_soc = soc

            except (ValueError, TypeError):
                continue

        return cycles

    async def _calculate_capacity_from_energy(
        self,
        start_time: datetime,
        end_time: datetime,
        start_soc: float,
        end_soc: float,
        charge_energy_sensor: str,
        discharge_energy_sensor: str,
    ) -> Optional[BatteryMeasurement]:
        """
        Spočítat kapacitu z energy sensorů (podporuje midnight crossing).

        Args:
            start_time: Začátek cyklu
            end_time: Konec cyklu
            start_soc: Počáteční SoC
            end_soc: Koncový SoC
            charge_energy_sensor: ID nabíjecího energy sensoru (_today)
            discharge_energy_sensor: ID vybíjecího energy sensoru (_today)

        Returns:
            BatteryMeasurement nebo None pokud není validní
        """
        from homeassistant.helpers import recorder
        from homeassistant.components.recorder.history import get_significant_states

        try:
            # Zjistit zda cyklus přechází přes půlnoc (UTC 00:00)
            start_date = start_time.date()
            end_date = end_time.date()
            spans_midnight = start_date != end_date

            _LOGGER.debug(
                f"Analyzing cycle {start_time} → {end_time}, spans_midnight={spans_midnight}"
            )

            # Načíst energy history - použít get_significant_states místo state_changes
            # protože potřebujeme VŠECHNY stavy, ne jen změny
            history = await recorder.get_instance(self._hass).async_add_executor_job(
                get_significant_states,
                self._hass,
                start_time,
                end_time,
                [charge_energy_sensor, discharge_energy_sensor],
                None,  # filters
                True,  # include_start_time_state
            )

            if not history:
                _LOGGER.debug("No history data returned from recorder")
                return None

            charge_states = history.get(charge_energy_sensor, [])
            discharge_states = history.get(discharge_energy_sensor, [])

            if not charge_states or not discharge_states:
                _LOGGER.debug("No energy data found for cycle")
                return None

            # IMPLEMENTACE MIDNIGHT CROSSING
            if spans_midnight:
                # Najít hodnoty před půlnocí (konec prvního dne)
                midnight = datetime.combine(end_date, datetime.min.time()).replace(
                    tzinfo=start_time.tzinfo
                )

                # Hodnoty před půlnocí (poslední stav před 00:00)
                charge_before = self._get_closest_state_before(charge_states, midnight)
                discharge_before = self._get_closest_state_before(
                    discharge_states, midnight
                )

                # Hodnoty po půlnoci (první stav po 00:00, po resetu na 0)
                charge_after = self._get_state_at_time(charge_states, end_time)
                discharge_after = self._get_state_at_time(discharge_states, end_time)

                if (
                    charge_before is None
                    or discharge_before is None
                    or charge_after is None
                    or discharge_after is None
                ):
                    _LOGGER.debug("Missing energy values for midnight crossing cycle")
                    return None

                # Sečíst energie z obou dní
                total_charge_wh = charge_before + charge_after
                total_discharge_wh = discharge_before + discharge_after

                _LOGGER.debug(
                    f"Midnight crossing: charge={charge_before:.1f}+{charge_after:.1f}={total_charge_wh:.1f} Wh, "
                    f"discharge={discharge_before:.1f}+{discharge_after:.1f}={total_discharge_wh:.1f} Wh"
                )

            else:
                # Cyklus v rámci jednoho dne - prostý delta
                charge_start = self._get_state_at_time(charge_states, start_time)
                charge_end = self._get_state_at_time(charge_states, end_time)
                discharge_start = self._get_state_at_time(discharge_states, start_time)
                discharge_end = self._get_state_at_time(discharge_states, end_time)

                if (
                    charge_start is None
                    or charge_end is None
                    or discharge_start is None
                    or discharge_end is None
                ):
                    _LOGGER.debug("Missing energy values for same-day cycle")
                    return None

                total_charge_wh = charge_end - charge_start
                total_discharge_wh = discharge_end - discharge_start

                _LOGGER.debug(
                    f"Same-day cycle: charge={total_charge_wh:.1f} Wh, discharge={total_discharge_wh:.1f} Wh"
                )

            # Výpočet čisté energie (net energy) a purity
            # Countery jsou kumulativní: charge roste když bat_p > 0, discharge když bat_p < 0
            # Během nabíjení mohou růst OBA countery (např. Home I mode)
            # Čistá změna v baterii = charge - discharge
            net_energy_wh = total_charge_wh - total_discharge_wh

            if net_energy_wh <= 0:
                _LOGGER.debug(
                    f"Invalid net energy: charge={total_charge_wh:.1f} discharge={total_discharge_wh:.1f}"
                )
                return None

            # Purity = poměr čisté energie k celkové energii (charge + discharge)
            # Vysoká purity = málo interrupcí vybíjením během nabíjení
            total_energy = total_charge_wh + total_discharge_wh
            purity = total_charge_wh / total_energy if total_energy > 0 else 0.0

            # Validace purity
            if purity < self._min_purity:
                _LOGGER.debug(
                    f"Cycle rejected: purity={purity:.1%} < {self._min_purity:.0%}"
                )
                return None

            # Kapacita = čistá energie do baterie / delta SoC
            # net_energy_wh = kolik reálně přibylo v baterii (charge - discharge)
            delta_soc = end_soc - start_soc
            measured_capacity_kwh = (net_energy_wh / 1000.0) / (delta_soc / 100.0)
            soh_percent = (measured_capacity_kwh / self._nominal_capacity) * 100.0

            # Duration
            duration = end_time - start_time
            duration_hours = duration.total_seconds() / 3600

            # Počet interrupcí - aproximace: (1 - purity) * 100
            # Pokud purity = 0.95, pak bylo ~5% vybíjení = ~5 interrupcí
            interruption_count = int((1.0 - purity) * 100)

            # Quality score
            quality_score = self._calculate_quality_score(
                delta_soc=delta_soc,
                purity=purity,
                end_soc=end_soc,
                duration_hours=duration_hours,
                validated=False,  # Retrospective nemá coulomb validation
            )

            if quality_score < self._min_quality_score:
                _LOGGER.debug(
                    f"Cycle rejected: quality={quality_score:.0f} < {self._min_quality_score:.0f}"
                )
                return None

            # Confidence reflektuje i hloubku swingu
            confidence = self._calculate_confidence_from_quality(
                quality_score, delta_soc
            )

            measurement = BatteryMeasurement(
                timestamp=end_time,
                capacity_kwh=measured_capacity_kwh,
                soh_percent=soh_percent,
                start_soc=start_soc,
                end_soc=end_soc,
                delta_soc=delta_soc,
                method="energy_sensor_retrospective",
                validated=False,
                confidence=confidence,
                total_charge_wh=total_charge_wh,
                total_discharge_wh=total_discharge_wh,
                duration_hours=duration_hours,
                purity=purity,
                interruption_count=interruption_count,
                quality_score=quality_score,
            )

            _LOGGER.info(
                f"✅ Valid cycle: {start_soc:.1f}%→{end_soc:.1f}% ({delta_soc:.1f}%), "
                f"capacity={measured_capacity_kwh:.2f} kWh, SoH={soh_percent:.1f}%, quality={quality_score:.0f}"
            )

            return measurement

        except Exception as e:
            _LOGGER.error(f"Error calculating capacity from energy: {e}", exc_info=True)
            return None

    def _get_state_at_time(
        self, states: List, target_time: datetime
    ) -> Optional[float]:
        """
        Získat hodnotu sensoru nejblíže k target_time.

        Args:
            states: Seznam states
            target_time: Cílový čas

        Returns:
            Float hodnota nebo None
        """
        if not states:
            return None

        # Najít stav nejblíže k target_time
        closest_state = min(
            states,
            key=lambda s: abs((s.last_changed - target_time).total_seconds()),
        )

        try:
            return float(closest_state.state)
        except (ValueError, TypeError):
            return None

    def _get_closest_state_before(
        self, states: List, target_time: datetime
    ) -> Optional[float]:
        """
        Získat hodnotu sensoru těsně před target_time.

        Args:
            states: Seznam states
            target_time: Cílový čas

        Returns:
            Float hodnota nebo None
        """
        if not states:
            return None

        # Filtrovat states před target_time
        before_states = [s for s in states if s.last_changed < target_time]
        if not before_states:
            return None

        # Vzít poslední před půlnocí
        last_before = max(before_states, key=lambda s: s.last_changed)

        try:
            return float(last_before.state)
        except (ValueError, TypeError):
            return None

    def _fire_measurement_event(self, measurement: BatteryMeasurement) -> None:
        """Fire HA event pro nové měření (pro persistence)."""
        self._hass.bus.async_fire(
            "oig_cloud_battery_capacity_measured",
            {
                "box_id": self._box_id,
                "timestamp": measurement.timestamp.isoformat(),
                "capacity_kwh": round(measurement.capacity_kwh, 3),
                "soh_percent": round(measurement.soh_percent, 2),
                "confidence": round(measurement.confidence, 3),
                "method": measurement.method,
                "validated": measurement.validated,
                "start_soc": round(measurement.start_soc, 1),
                "end_soc": round(measurement.end_soc, 1),
                "delta_soc": round(measurement.delta_soc, 1),
                "duration_hours": round(measurement.duration_hours, 2),
            },
        )

    def get_measurements(
        self, min_quality_score: float = 0.0, limit: Optional[int] = None
    ) -> List[BatteryMeasurement]:
        """
        Získat historii měření.

        Args:
            min_quality_score: Minimální quality score pro filtrování (0-100)
            limit: Max počet výsledků (nebo None = všechny)

        Returns:
            Seznam měření seřazený od nejnovějších (podle quality_score a času)
        """
        # Filtrovat podle kvality
        filtered = [
            m for m in self._measurements if m.quality_score >= min_quality_score
        ]

        # Seřadit podle quality_score (primary) a timestamp (secondary)
        filtered.sort(key=lambda m: (m.quality_score, m.timestamp), reverse=True)

        if limit:
            return filtered[:limit]
        return filtered

    def get_current_capacity(self) -> Tuple[Optional[float], Optional[float]]:
        """
        Získat aktuální (naměřenou) kapacitu a SoH pomocí váženého průměru.

        Returns:
            Tuple (capacity_kwh, soh_percent) nebo (None, None) pokud nemáme měření
        """
        # Filtrovat jen kvalitní měření (quality_score >= 60)
        valid_measurements = [m for m in self._measurements if m.quality_score >= 60]

        if not valid_measurements:
            return None, None

        # Seřadit od nejnovějších
        valid_measurements.sort(key=lambda x: x.timestamp, reverse=True)

        # Vzít max 10 nejnovějších
        recent = valid_measurements[:10]

        # VÁŽENÝ PRŮMĚR
        total_weight = 0.0
        weighted_capacity_sum = 0.0

        for i, m in enumerate(recent):
            # Novější měření = vyšší váha (age_weight)
            age_weight = 1.0 / (i + 1)  # 1.0, 0.5, 0.33, 0.25...

            # Quality weight (quality_score / 100)
            quality_weight = m.quality_score / 100.0

            # Kombinovaná váha
            weight = age_weight * quality_weight

            weighted_capacity_sum += m.capacity_kwh * weight
            total_weight += weight

        if total_weight == 0:
            return None, None

        # Vážená kapacita
        weighted_capacity = weighted_capacity_sum / total_weight

        # SoH
        soh = (weighted_capacity / self._nominal_capacity) * 100.0

        return weighted_capacity, soh

    def analyze_degradation_trend(
        self, min_measurements: int = 10
    ) -> Optional[Dict[str, Any]]:
        """
        Analyzovat trend degradace baterie.

        Args:
            min_measurements: Minimální počet měření pro analýzu

        Returns:
            Dict s trend daty nebo None pokud nemáme dost dat
        """
        # Použít jen kvalitní měření (quality_score >= 70 pro trend analýzu)
        measurements = self.get_measurements(min_quality_score=70)

        if len(measurements) < min_measurements:
            _LOGGER.debug(
                f"Not enough quality measurements for trend analysis: {len(measurements)} < {min_measurements}"
            )
            return None

        # Extract time series
        timestamps = [m.timestamp for m in reversed(measurements)]
        capacities = [m.capacity_kwh for m in reversed(measurements)]

        # Convert timestamps to days since first measurement
        first_time = timestamps[0]
        days = [(t - first_time).total_seconds() / 86400 for t in timestamps]

        # Linear regression: capacity = a * days + b
        if len(days) < 2:
            return None

        # Numpy polyfit
        coeffs = np.polyfit(days, capacities, 1)
        slope = coeffs[0]  # kWh/day

        # R-squared (correlation coefficient)
        predicted = np.polyval(coeffs, days)
        residuals = np.array(capacities) - predicted
        ss_res = np.sum(residuals**2)
        ss_tot = np.sum((np.array(capacities) - np.mean(capacities)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

        # Degradace per year
        degradation_kwh_per_year = slope * 365
        degradation_percent_per_year = (
            abs(degradation_kwh_per_year) / self._nominal_capacity
        ) * 100

        # Predikce EOL (80% SoH)
        current_capacity = capacities[-1]
        eol_capacity = self._nominal_capacity * 0.8  # 80% SoH

        if slope < 0:  # Degradace probíhá
            days_to_eol = (eol_capacity - current_capacity) / slope
            years_to_eol = days_to_eol / 365
            eol_date = datetime.now() + timedelta(days=days_to_eol)
        else:
            # Kapacita roste? (možná noise)
            years_to_eol = None
            eol_date = None

        # Confidence v trend (based on R²)
        trend_confidence = int(r_squared * 100)

        return {
            "current_capacity_kwh": round(current_capacity, 2),
            "nominal_capacity_kwh": self._nominal_capacity,
            "capacity_loss_kwh": round(self._nominal_capacity - current_capacity, 2),
            "degradation_kwh_per_year": round(degradation_kwh_per_year, 3),
            "degradation_percent_per_year": round(degradation_percent_per_year, 2),
            "estimated_eol_date": eol_date.date().isoformat() if eol_date else None,
            "years_to_80pct": round(years_to_eol, 1) if years_to_eol else None,
            "measurements_count": len(measurements),
            "last_measurement_date": measurements[0].timestamp.isoformat(),
            "trend_confidence": trend_confidence,
            "r_squared": round(r_squared, 3),
            "slope_kwh_per_day": round(slope, 6),
        }

    def get_statistics_30d(self) -> Optional[Dict[str, Any]]:
        """
        Vypočítat statistiky za posledních 30 dní.

        Returns:
            Dict se statistikami nebo None
        """
        cutoff_date = dt_util.now() - timedelta(days=30)
        measurements = [
            m
            for m in self._measurements
            if m.timestamp >= cutoff_date and m.quality_score >= 60
        ]

        if not measurements:
            return None

        capacities = [m.capacity_kwh for m in measurements]
        soh_values = [m.soh_percent for m in measurements]
        quality_scores = [m.quality_score for m in measurements]

        # Použití MEDIÁNU místo průměru pro robustnost vůči outlierům
        # Analýza dat ukázala variační koeficient 14%, medián je vhodnější
        return {
            "measurement_count": len(measurements),
            "last_measured": measurements[0].timestamp.isoformat(),
            "median_capacity_kwh": round(np.median(capacities), 2),
            "median_soh_percent": round(np.median(soh_values), 1),
            "avg_quality_score": round(np.mean(quality_scores), 0),
            "min_capacity_kwh": round(min(capacities), 2),
            "max_capacity_kwh": round(max(capacities), 2),
            "capacity_std_dev": round(np.std(capacities), 2),
        }

    def calculate_degradation_trends(
        self,
    ) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Vypočítat degradační trendy pro 3, 6 a 12 měsíců.

        Returns:
            Dict s trendy pro každé období
        """
        trends = {}

        for months, label in [(3, "3_months"), (6, "6_months"), (12, "12_months")]:
            cutoff_date = dt_util.now() - timedelta(days=months * 30)
            measurements = [
                m
                for m in self._measurements
                if m.timestamp >= cutoff_date and m.quality_score >= 60
            ]

            if len(measurements) < 2:
                trends[label] = None
                continue

            # Seřadit podle času
            measurements_sorted = sorted(measurements, key=lambda x: x.timestamp)

            # První a poslední měření
            first = measurements_sorted[0]
            last = measurements_sorted[-1]

            capacity_change = last.capacity_kwh - first.capacity_kwh
            capacity_change_percent = (capacity_change / self._nominal_capacity) * 100

            trends[label] = {
                "capacity_change_kwh": round(capacity_change, 2),
                "capacity_change_percent": round(capacity_change_percent, 2),
                "measurement_count": len(measurements),
                "period_start": first.timestamp.isoformat(),
                "period_end": last.timestamp.isoformat(),
            }

        return trends

    def _get_storage_path(self) -> str:
        """Získat cestu k storage souboru."""
        storage_dir = self._hass.config.path(".storage")
        return os.path.join(
            storage_dir, f"oig_cloud_battery_cycles_{self._box_id}.json"
        )

    async def _load_cycles_from_storage(self) -> Optional[datetime]:
        """
        Načíst uložené cykly ze storage.

        Returns:
            Timestamp poslední analýzy nebo None pokud storage neexistuje
        """
        storage_path = self._get_storage_path()

        if not os.path.exists(storage_path):
            _LOGGER.info(f"No existing storage found at {storage_path}")
            return None

        try:

            def _load():
                with open(storage_path, "r") as f:
                    return json.load(f)

            data = await self._hass.async_add_executor_job(_load)

            # Načíst cycles
            cycles = data.get("cycles", [])
            _LOGGER.info(f"Loading {len(cycles)} cycles from storage")

            for cycle_data in cycles:
                # Rekonstruovat BatteryMeasurement z JSON
                delta_soc = cycle_data["input_params"]["delta_soc"]
                quality_score = cycle_data["output_data"]["quality_score"]

                measurement = BatteryMeasurement(
                    timestamp=datetime.fromisoformat(cycle_data["timestamp_end"]),
                    capacity_kwh=cycle_data["output_data"]["measured_capacity_kwh"],
                    soh_percent=cycle_data["output_data"]["soh_percent"],
                    start_soc=cycle_data["input_params"]["soc_start"],
                    end_soc=cycle_data["input_params"]["soc_end"],
                    delta_soc=delta_soc,
                    method=cycle_data["output_data"]["method"],
                    validated=cycle_data["output_data"]["validated"],
                    confidence=self._calculate_confidence_from_quality(
                        quality_score, delta_soc
                    ),
                    total_charge_wh=cycle_data["input_params"]["charge_energy_wh"],
                    total_discharge_wh=cycle_data["input_params"][
                        "discharge_energy_wh"
                    ],
                    duration_hours=cycle_data["input_params"]["duration_hours"],
                    purity=cycle_data["input_params"]["purity_percent"] / 100.0,
                    interruption_count=cycle_data["input_params"]["interruption_count"],
                    quality_score=quality_score,
                )
                self._measurements.append(measurement)

            # Vrátit timestamp poslední analýzy
            last_analysis_str = data.get("last_analysis")
            if last_analysis_str:
                last_analysis = datetime.fromisoformat(last_analysis_str)
                _LOGGER.info(f"Last analysis was at {last_analysis}")
                return last_analysis

            return None

        except Exception as e:
            _LOGGER.error(f"Failed to load storage: {e}", exc_info=True)
            return None

    async def _save_cycle_to_storage(self, measurement: BatteryMeasurement) -> None:
        """
        Uložit nový cyklus do storage (inkrementálně).

        Args:
            measurement: Nové měření k uložení
        """
        storage_path = self._get_storage_path()

        try:
            # Načíst existující data
            if os.path.exists(storage_path):

                def _load():
                    with open(storage_path, "r") as f:
                        return json.load(f)

                data = await self._hass.async_add_executor_job(_load)
            else:
                # Vytvořit nový storage
                data = {
                    "version": 1,
                    "box_id": self._box_id,
                    "nominal_capacity_kwh": self._nominal_capacity,
                    "cycles": [],
                }

            # Přidat nový cyklus
            cycle_id = f"cycle_{measurement.timestamp.strftime('%Y-%m-%d_%H%M%S')}"

            # Zkontrolovat duplikáty (stejný timestamp)
            existing_ids = {c.get("id") for c in data["cycles"]}
            if cycle_id in existing_ids:
                _LOGGER.debug(f"Cycle {cycle_id} already exists, skipping")
                return

            cycle_data = {
                "id": cycle_id,
                "timestamp_start": (
                    measurement.timestamp - timedelta(hours=measurement.duration_hours)
                ).isoformat(),
                "timestamp_end": measurement.timestamp.isoformat(),
                "input_params": {
                    "soc_start": round(measurement.start_soc, 1),
                    "soc_end": round(measurement.end_soc, 1),
                    "delta_soc": round(measurement.delta_soc, 1),
                    "charge_energy_wh": round(measurement.total_charge_wh, 1),
                    "discharge_energy_wh": round(measurement.total_discharge_wh, 1),
                    "net_energy_wh": round(
                        measurement.total_charge_wh - measurement.total_discharge_wh, 1
                    ),
                    "duration_hours": round(measurement.duration_hours, 2),
                    "purity_percent": round(measurement.purity * 100, 1),
                    "interruption_count": measurement.interruption_count,
                    "spans_midnight": False,  # TODO: Track this in measurement
                },
                "output_data": {
                    "measured_capacity_kwh": round(measurement.capacity_kwh, 2),
                    "soh_percent": round(measurement.soh_percent, 1),
                    "quality_score": round(measurement.quality_score, 0),
                    "method": measurement.method,
                    "validated": measurement.validated,
                },
                "metadata": {
                    "created_at": dt_util.now().isoformat(),
                },
            }

            data["cycles"].append(cycle_data)
            data["last_analysis"] = dt_util.now().isoformat()

            # Automatické prořezávání starých záznamů
            # Limit: 3000 kvalitních měření = ~30 let při realistickém scénáři (1x týdně)
            # Poznámka: Toto NEJSOU nabíjecí cykly (těch je ~365/rok), ale kvalitní měření
            # kapacity (start <90%, end >95%, purity >90%) - typicky ~50/rok
            MAX_CYCLES = 3000  # Dostatečná rezerva pro celou životnost baterie
            if len(data["cycles"]) > MAX_CYCLES:
                # Seřadit podle timestamp_end (nejstarší první)
                data["cycles"].sort(key=lambda c: c["timestamp_end"])
                # Ponechat pouze nejnovější
                removed_count = len(data["cycles"]) - MAX_CYCLES
                data["cycles"] = data["cycles"][-MAX_CYCLES:]
                _LOGGER.warning(
                    f"Storage cleanup: removed {removed_count} oldest measurements, "
                    f"kept {MAX_CYCLES} most recent (expect ~50-100 new measurements/year)"
                )

            # Varování když se blížíme limitu (90%)
            if len(data["cycles"]) > MAX_CYCLES * 0.9:
                _LOGGER.info(
                    f"Storage usage: {len(data['cycles'])}/{MAX_CYCLES} measurements "
                    f"({len(data['cycles'])*100/MAX_CYCLES:.0f}%) - "
                    f"~{len(data['cycles']) / 50:.0f} years of data at typical rate"
                )

            # Uložit zpět
            def _save():
                os.makedirs(os.path.dirname(storage_path), exist_ok=True)
                with open(storage_path, "w") as f:
                    json.dump(data, f, indent=2)

            await self._hass.async_add_executor_job(_save)
            _LOGGER.debug(
                f"Saved cycle {cycle_id} to storage (total: {len(data['cycles'])} cycles)"
            )

        except Exception as e:
            _LOGGER.error(f"Failed to save cycle to storage: {e}", exc_info=True)

    async def _find_data_availability_window(
        self,
    ) -> Optional[Tuple[datetime, datetime]]:
        """
        Najít časové okno kde máme konzistentní data ze všech sensorů.

        Strategie: Použít SoC sensor z STATISTICS table (long-term data),
        energy senzory jsou nové ale aktuální data mají.

        Returns:
            (start_time, end_time) nebo None pokud nejsou data
        """
        from homeassistant.helpers import recorder
        from sqlalchemy import text

        # Senzory které potřebujeme
        soc_sensor = f"sensor.oig_{self._box_id}_batt_bat_c"

        try:
            # Query STATISTICS table pro SoC sensor (long-term data jako profiling)
            instance = recorder.get_instance(self._hass)

            def _query_soc_statistics():
                """Query statistics table for SoC sensor availability."""
                from homeassistant.helpers.recorder import session_scope

                with session_scope(
                    hass=self._hass, session=instance.get_session()
                ) as session:
                    # Najít MIN a MAX start_ts z short_term statistics
                    query = text(
                        """
                        SELECT MIN(s.start_ts) as min_ts, MAX(s.start_ts) as max_ts
                        FROM statistics_short_term s
                        INNER JOIN statistics_meta sm ON s.metadata_id = sm.id
                        WHERE sm.statistic_id = :statistic_id
                        AND s.mean IS NOT NULL
                        """
                    )

                    result = session.execute(
                        query,
                        {"statistic_id": soc_sensor},
                    ).first()

                    if result and result.min_ts and result.max_ts:
                        return {
                            "min": datetime.fromtimestamp(
                                result.min_ts, tz=dt_util.UTC
                            ),
                            "max": datetime.fromtimestamp(
                                result.max_ts, tz=dt_util.UTC
                            ),
                        }
                    return None

            soc_window = await self._hass.async_add_executor_job(_query_soc_statistics)

            if not soc_window:
                _LOGGER.warning(f"No SoC statistics found for sensor {soc_sensor}")
                return None

            start_time = soc_window["min"]
            end_time = soc_window["max"]

            _LOGGER.info(
                f"Data availability window (from statistics): {start_time.date()} to {end_time.date()} "
                f"({(end_time - start_time).days} days)"
            )

            return (start_time, end_time)

        except Exception as e:
            _LOGGER.error(
                f"Failed to query statistics availability window: {e}", exc_info=True
            )
            return None


class OigCloudBatteryHealthSensor(RestoreEntity, CoordinatorEntity, SensorEntity):
    """Sensor pro sledování stavu baterie (SoH - State of Health)."""

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
        self._device_info = device_info
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        # Get box_id from coordinator
        self._data_key = "unknown"
        if (
            coordinator
            and coordinator.data
            and isinstance(coordinator.data, dict)
            and coordinator.data
        ):
            self._data_key = list(coordinator.data.keys())[0]

        self._box_id = self._data_key
        self._attr_unique_id = f"oig_cloud_{self._data_key}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:battery-heart-variant"
        self._attr_native_unit_of_measurement = "%"
        self._attr_device_class = SensorDeviceClass.BATTERY
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_entity_category = EntityCategory.DIAGNOSTIC

        # Název
        self._attr_name = "Battery Health (SoH)"

        # Capacity tracker - bude inicializován v async_added_to_hass
        self._tracker: Optional[BatteryCapacityTracker] = None

        # Nominální kapacita (načteme ze sensoru INSTALLED capacity)
        self._nominal_capacity_kwh: float = 15.36  # Default INSTALLED capacity

        # Last analysis timestamp
        self._last_analysis: Optional[datetime] = None

        _LOGGER.info(f"Battery Health sensor initialized for box {self._box_id}")

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # Načíst nominální kapacitu
        self._load_nominal_capacity()

        # Inicializovat tracker
        self._tracker = BatteryCapacityTracker(
            hass=self._hass,
            box_id=self._box_id,
            nominal_capacity_kwh=self._nominal_capacity_kwh,
        )

        _LOGGER.info("Battery Health sensor added to HA, tracker initialized")

        # Naplánovat denní úlohu v 01:00
        from homeassistant.helpers.event import async_track_time_change

        async_track_time_change(
            self.hass, self._daily_analysis_task, hour=1, minute=0, second=0
        )
        _LOGGER.info("Scheduled daily analysis task at 01:00")

        # ASYNCHRONNÍ STARTUP - neblokuje HA startup
        # Spustit analýzu na pozadí (non-blocking)
        # Vylepšeno: primární min_delta_soc=60%, fallback=45% při nedostatku dat, použití mediánu
        self.hass.async_create_task(self._async_startup_analysis())
        _LOGGER.info(
            "✅ Battery health automatic analysis ENABLED "
            "(ΔSoC >=60%% for high quality, fallback to 45%% when data is sparse, median-based)"
        )

    async def _async_startup_analysis(self) -> None:
        """
        Asynchronní startup analýza - běží na pozadí, neblokuje HA.

        Strategie:
        1. Pokud existuje storage → inkrementální analýza od last_analysis
        2. Pokud neexistuje → full history analýza (může trvat déle)
        """
        _LOGGER.info("🔍 Starting background battery health analysis...")

        try:
            # 1. Zkusit načíst existující storage
            last_analysis = await self._tracker._load_cycles_from_storage()

            if last_analysis:
                # Máme storage - inkrementální analýza od last_analysis do now
                _LOGGER.info(
                    f"Found existing storage, analyzing from {last_analysis} to now"
                )
                measurements = await self._tracker.analyze_history_for_cycles(
                    start_time=last_analysis, end_time=dt_util.now()
                )

                # Uložit nové cykly
                for m in measurements:
                    await self._tracker._save_cycle_to_storage(m)

                self._last_analysis = dt_util.now()
                _LOGGER.info(
                    f"✅ Incremental analysis complete: {len(measurements)} new cycles"
                )
            else:
                # Žádná storage - najít data availability window a analyzovat celou historii
                _LOGGER.info(
                    "No existing storage found, performing full history analysis..."
                )
                _LOGGER.info(
                    "⚠️ This may take a few seconds on first run, but won't block HA startup"
                )

                window = await self._tracker._find_data_availability_window()

                if window:
                    start_time, end_time = window
                    days_count = (end_time - start_time).days
                    _LOGGER.info(
                        f"Analyzing full history: {start_time.date()} to {end_time.date()} "
                        f"({days_count} days)"
                    )

                    measurements = await self._tracker.analyze_history_for_cycles(
                        start_time=start_time, end_time=end_time
                    )

                    # Uložit všechny cycles
                    for m in measurements:
                        await self._tracker._save_cycle_to_storage(m)

                    self._last_analysis = dt_util.now()
                    _LOGGER.info(
                        f"✅ Full history analysis complete: {len(measurements)} cycles found "
                        f"over {days_count} days"
                    )
                else:
                    _LOGGER.warning(
                        "Could not determine data availability window, using 60-day fallback"
                    )
                    measurements = await self._tracker.analyze_history_for_cycles(
                        lookback_days=60
                    )
                    self._last_analysis = dt_util.now()
                    _LOGGER.info(
                        f"✅ Fallback analysis complete: {len(measurements)} cycles"
                    )

            # Trigger update pro UI
            self.async_write_ha_state()

        except Exception as e:
            _LOGGER.error(
                f"Background battery health analysis failed: {e}", exc_info=True
            )
            _LOGGER.info("Battery Health sensor will retry analysis in daily task")

    async def _daily_analysis_task(self, *args: Any) -> None:
        """Denní úloha pro analýzu nových cyklů."""
        if not self._tracker:
            return

        _LOGGER.info("🔄 Running daily battery health analysis...")

        try:
            # Najít poslední analýzu ze storage
            last_analysis = await self._tracker._load_cycles_from_storage()

            if not last_analysis:
                # Fallback: použít self._last_analysis nebo analyzovat 24h
                last_analysis = self._last_analysis or (
                    dt_util.now() - timedelta(days=1)
                )

            # Inkrementální analýza od last_analysis do now
            measurements = await self._tracker.analyze_history_for_cycles(
                start_time=last_analysis, end_time=dt_util.now()
            )

            # Uložit nové cykly
            for m in measurements:
                await self._tracker._save_cycle_to_storage(m)

            self._last_analysis = dt_util.now()
            self.async_write_ha_state()  # Update sensor state

            _LOGGER.info(f"✅ Daily analysis complete: {len(measurements)} new cycles")

        except Exception as e:
            _LOGGER.error(f"Daily analysis task failed: {e}", exc_info=True)

    def _load_nominal_capacity(self) -> None:
        """Načíst nominální kapacitu baterie ze sensoru (INSTALLED capacity 15.36 kWh)."""
        if not self._hass:
            return

        sensor_id = f"sensor.oig_{self._box_id}_installed_battery_capacity_kwh"
        state = self._hass.states.get(sensor_id)

        if state and state.state not in ["unknown", "unavailable"]:
            try:
                # Sensor je v Wh, převést na kWh
                capacity_wh = float(state.state)
                self._nominal_capacity_kwh = capacity_wh / 1000.0
                _LOGGER.info(
                    f"Loaded installed capacity: {self._nominal_capacity_kwh:.2f} kWh from {sensor_id}"
                )
            except (ValueError, TypeError):
                _LOGGER.warning(
                    f"Failed to parse installed capacity from {sensor_id}, using default 15.36 kWh"
                )

    def _handle_coordinator_update(self) -> None:
        """Handle coordinator update - NEDĚLÁ async tasky!

        Health se updatuje každých 5 min přes scheduler, ne při coordinator update.
        """
        # Jen zavolat parent pro refresh HA state
        super()._handle_coordinator_update()

    @property
    def device_info(self) -> Optional[Dict[str, Any]]:
        """Return device info."""
        return self._device_info

    @property
    def native_value(self) -> Optional[float]:
        """
        State = MEDIÁNOVÝ SoH za 30 dní v procentech.

        Returns:
            Mediánový SoH% za 30 dní nebo None pokud nemáme měření
            (None se zobrazí jako "unknown" během background analýzy)

        Note:
            Medián je použit místo průměru pro robustnost vůči outlierům.
            Empirická analýza ukázala variační koeficient 14% mezi měřeními.
        """
        if not self._tracker:
            return None

        try:
            stats_30d = self._tracker.get_statistics_30d()
            if stats_30d:
                return round(stats_30d["median_soh_percent"], 1)

            # Fallback na current capacity pokud nemáme 30-day stats
            _, soh = self._tracker.get_current_capacity()
            return round(soh, 1) if soh is not None else None
        except Exception as e:
            _LOGGER.debug(
                f"Could not get SoH value (background analysis may still be running): {e}"
            )
            return None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Dodatečné atributy."""
        if not self._tracker:
            return {}

        attrs = {
            "nominal_capacity_kwh": self._nominal_capacity_kwh,
        }

        # 30-DAY STATISTICS (hlavní zobrazení) - POUŽÍVÁ MEDIÁN
        stats_30d = self._tracker.get_statistics_30d()
        if stats_30d:
            attrs["measurement_count"] = stats_30d["measurement_count"]
            attrs["last_measured"] = stats_30d["last_measured"]
            attrs["capacity_kwh"] = stats_30d[
                "median_capacity_kwh"
            ]  # Medián místo průměru
            attrs["soh_percent"] = stats_30d[
                "median_soh_percent"
            ]  # Medián místo průměru
            # quality_score je interní - všechna měření už jsou kvalitní (filtrováno při uložení)
            attrs["min_capacity_kwh"] = stats_30d["min_capacity_kwh"]
            attrs["max_capacity_kwh"] = stats_30d["max_capacity_kwh"]
            attrs["capacity_std_dev"] = stats_30d["capacity_std_dev"]

        # DEGRADATION TRENDS (3, 6, 12 měsíců)
        trends = self._tracker.calculate_degradation_trends()
        for period, trend_data in trends.items():
            if trend_data:
                attrs[f"degradation_{period}_kwh"] = trend_data["capacity_change_kwh"]
                attrs[f"degradation_{period}_percent"] = trend_data[
                    "capacity_change_percent"
                ]

        # Current capacity (pro kompatibilitu)
        capacity, _ = self._tracker.get_current_capacity()
        if capacity is not None:
            attrs["current_capacity_kwh"] = round(capacity, 2)
            attrs["capacity_loss_kwh"] = round(self._nominal_capacity_kwh - capacity, 2)

        # Long-term degradation trend (regression analysis)
        # POZNÁMKA: Trend analýza je náročná, počítáme ji jen jednou denně v daily task
        # Ne při každém coordinator update (každých 5 minut)
        # Pro zobrazení trendu použijeme cachovanou hodnotu nebo None
        trend = self._tracker.analyze_degradation_trend(min_measurements=5)
        if trend:
            attrs["degradation_per_year_kwh"] = trend["degradation_kwh_per_year"]
            attrs["degradation_per_year_percent"] = trend[
                "degradation_percent_per_year"
            ]
            attrs["estimated_eol_date"] = trend["estimated_eol_date"]
            attrs["years_to_80pct"] = trend["years_to_80pct"]
            attrs["trend_confidence"] = trend["trend_confidence"]

        # Cycle status - RETROSPEKTIVNÍ MOD, žádný online tracking
        attrs["cycle_in_progress"] = False
        attrs["last_analysis"] = (
            self._last_analysis.isoformat() if self._last_analysis else None
        )

        # Storage info (diagnostické)
        total_measurements = len(self._tracker._measurements)
        attrs["storage_cycles_count"] = total_measurements
        attrs["storage_cycles_limit"] = 3000
        attrs["storage_usage_percent"] = round((total_measurements / 3000) * 100, 1)

        # Recent measurements - zobrazit top 5 (quality_score je interní, všechna jsou už kvalitní)
        recent = self._tracker.get_measurements(min_quality_score=60, limit=5)
        if recent:
            attrs["recent_measurements"] = [
                {
                    "timestamp": m.timestamp.isoformat(),
                    "capacity_kwh": round(m.capacity_kwh, 2),
                    "soh_percent": round(m.soh_percent, 1),
                    "purity": round(m.purity * 100, 1),  # % clean charging
                    "delta_soc": round(m.end_soc - m.start_soc, 1),
                    "interruptions": m.interruption_count,
                    "validated": m.validated,
                }
                for m in recent
            ]

        # Celková statistika měření (quality_score skryt - jen interní)
        all_measurements = self._tracker._measurements
        if all_measurements:
            attrs["total_measurements"] = len(all_measurements)
            quality_measurements = [
                m for m in all_measurements if m.quality_score >= 60
            ]
            attrs["quality_measurements"] = len(quality_measurements)
            if quality_measurements:
                avg_purity = sum(m.purity for m in quality_measurements) / len(
                    quality_measurements
                )
                attrs["avg_purity_percent"] = round(avg_purity * 100, 1)

        return attrs
