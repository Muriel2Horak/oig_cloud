"""Battery Health Monitoring - měření skutečné kapacity a degradace baterie."""

import logging
import numpy as np
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
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
    method: str  # "power_integration" nebo "coulomb_counting"
    validated: bool  # Zda bylo validováno druhou metodou
    confidence: float  # 0.0 - 1.0
    total_charge_wh: float  # Celková nabíjecí energie
    total_discharge_wh: float  # Celková vybíjecí energie
    duration_hours: float  # Délka cyklu v hodinách

    # NOVĚ: Purity metrics
    purity: float  # 0.0 - 1.0 (% čisté energie dovnitř)
    interruption_count: int  # Počet přerušení vybíjením
    quality_score: float  # 0-100 (celkové quality score)

    # Coulomb counting data (pokud je validace)
    coulomb_capacity_kwh: Optional[float] = None
    coulomb_discrepancy_percent: Optional[float] = None


@dataclass
class CycleTracker:
    """Sledování probíhajícího nabíjecího/vybíjecího cyklu."""

    in_progress: bool = False
    start_time: Optional[datetime] = None
    start_soc: Optional[float] = None
    current_soc: Optional[float] = None

    # Power integration (30s updates)
    total_charge_wh: float = 0.0
    total_discharge_wh: float = 0.0
    sample_count: int = 0

    # Purity tracking - detekce přerušení nabíjení
    interrupted: bool = False  # True pokud bylo přerušeno vybíjením
    interruption_count: int = 0  # Počet přerušení
    max_discharge_power_w: float = 0.0  # Max vybíjecí výkon během cyklu

    # Coulomb counting (5min updates)
    total_ah: float = 0.0
    voltage_samples: List[float] = field(default_factory=list)
    coulomb_sample_count: int = 0

    def reset(self) -> None:
        """Reset cycle tracking."""
        self.in_progress = False
        self.start_time = None
        self.start_soc = None
        self.current_soc = None
        self.total_charge_wh = 0.0
        self.total_discharge_wh = 0.0
        self.sample_count = 0
        self.interrupted = False
        self.interruption_count = 0
        self.max_discharge_power_w = 0.0
        self.total_ah = 0.0
        self.voltage_samples = []
        self.coulomb_sample_count = 0


class BatteryCapacityTracker:
    """Sledování a měření skutečné kapacity baterie."""

    def __init__(
        self,
        hass: HomeAssistant,
        box_id: str,
        nominal_capacity_kwh: float = 12.29,
    ) -> None:
        """
        Inicializace capacity trackeru.

        Args:
            hass: Home Assistant instance
            box_id: ID OIG zařízení
            nominal_capacity_kwh: Nominální kapacita baterie (default 12.29 kWh = 80% z 15.36 kWh)
        """
        self._hass = hass
        self._box_id = box_id
        self._nominal_capacity = nominal_capacity_kwh

        # Cycle tracking
        self._cycle = CycleTracker()

        # Measurements history (max 100 posledních měření)
        self._measurements: deque[BatteryMeasurement] = deque(maxlen=100)

        # PASIVNÍ MONITORING: Flexibilní kritéria
        self._min_delta_soc = 40.0  # % - minimum swing (40% stačí!)
        self._min_end_soc = 95.0  # % - konec cyklu MUSÍ být nahoře
        self._min_purity = 0.90  # 90% - min % čisté energie dovnitř
        self._max_discharge_interrupt_w = (
            300.0  # W - max vybíjecí výkon (přes = přerušení)
        )

        # Quality scoring
        self._min_quality_score = 60.0  # Minimum pro zařazení do průměru

        # Validace
        self._max_discrepancy_percent = (
            5.0  # Max rozdíl mezi power integration a coulomb counting
        )

        _LOGGER.info(
            f"BatteryCapacityTracker initialized for box {box_id}, "
            f"nominal capacity: {nominal_capacity_kwh:.2f} kWh"
        )

    def process_power_update(
        self,
        charge_power_w: float,
        discharge_power_w: float,
        current_soc: float,
        timestamp: Optional[datetime] = None,
    ) -> Optional[BatteryMeasurement]:
        """
        Zpracovat update power sensorů (30s interval).

        Args:
            charge_power_w: Nabíjecí výkon (W) z sensor.oig_{box_id}_batt_batt_comp_p_charge
            discharge_power_w: Vybíjecí výkon (W) z sensor.oig_{box_id}_batt_batt_comp_p_discharge
            current_soc: Aktuální SoC (%) z sensor.oig_{box_id}_batt_bat_c
            timestamp: Timestamp update (nebo None = now)

        Returns:
            BatteryMeasurement pokud byl dokončen cycle, jinak None
        """
        if timestamp is None:
            timestamp = dt_util.now()

        # Detekce startu cyklu
        if not self._cycle.in_progress:
            # PASIVNÍ: Start kdykoli začne nabíjení s SoC < 90%
            if charge_power_w > 100 and current_soc < 90:
                self._start_cycle(current_soc, timestamp)
                _LOGGER.info(
                    f"🔋 Battery cycle started: SoC={current_soc:.1f}% at {timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
                )

        # Pokud máme probíhající cycle
        if self._cycle.in_progress:
            # Update energy integration (30s interval)
            # E = P * t / 3600 (W * s / 3600 = Wh)
            delta_seconds = 30  # Předpokládáme 30s interval
            charge_wh = (charge_power_w * delta_seconds) / 3600
            discharge_wh = (discharge_power_w * delta_seconds) / 3600

            self._cycle.total_charge_wh += charge_wh
            self._cycle.total_discharge_wh += discharge_wh
            self._cycle.sample_count += 1
            self._cycle.current_soc = current_soc

            # PURITY TRACKING: Detekce přerušení vybíjením
            if discharge_power_w > self._max_discharge_interrupt_w:
                if not self._cycle.interrupted:
                    self._cycle.interrupted = True
                    _LOGGER.warning(
                        f"⚠️ Cycle interrupted by discharge: {discharge_power_w:.0f}W at {timestamp.strftime('%H:%M:%S')}"
                    )
                self._cycle.interruption_count += 1

            # Track max discharge power
            if discharge_power_w > self._cycle.max_discharge_power_w:
                self._cycle.max_discharge_power_w = discharge_power_w

            # Detekce konce cyklu
            if current_soc >= self._min_end_soc:
                return self._end_cycle(current_soc, timestamp)

        return None

    def process_coulomb_update(
        self,
        current_a: float,
        voltage_v: float,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """
        Zpracovat update coulomb counting sensorů (5min interval).

        Args:
            current_a: Proud (A) z sensor.oig_{box_id}_extended_battery_current
            voltage_v: Napětí (V) z sensor.oig_{box_id}_extended_battery_voltage
            timestamp: Timestamp update (nebo None = now)
        """
        if not self._cycle.in_progress:
            return

        # Coulomb counting: Q = I * t (Ah)
        # 5min interval = 5/60 h
        delta_hours = 5.0 / 60.0
        ah_delta = current_a * delta_hours

        self._cycle.total_ah += ah_delta
        self._cycle.voltage_samples.append(voltage_v)
        self._cycle.coulomb_sample_count += 1

    def _start_cycle(self, soc: float, timestamp: datetime) -> None:
        """Začít sledování nového cyklu."""
        self._cycle.reset()
        self._cycle.in_progress = True
        self._cycle.start_time = timestamp
        self._cycle.start_soc = soc
        self._cycle.current_soc = soc

    def _end_cycle(
        self, end_soc: float, timestamp: datetime
    ) -> Optional[BatteryMeasurement]:
        """
        Ukončit cycle a vypočítat kapacitu s purity a quality scoring.

        Args:
            end_soc: Koncový SoC (%)
            timestamp: Čas ukončení

        Returns:
            BatteryMeasurement nebo None pokud cyklus není validní
        """
        if not self._cycle.start_time or self._cycle.start_soc is None:
            _LOGGER.warning("Cannot end cycle - missing start data")
            self._cycle.reset()
            return None

        # Výpočet základních metrik
        delta_soc = end_soc - self._cycle.start_soc
        duration = timestamp - self._cycle.start_time
        duration_hours = duration.total_seconds() / 3600

        # === PURITY VÝPOČET ===
        total_energy = self._cycle.total_charge_wh + self._cycle.total_discharge_wh
        purity = self._cycle.total_charge_wh / total_energy if total_energy > 0 else 0.0

        # Validace: dostatečný rozsah?
        if delta_soc < self._min_delta_soc:
            _LOGGER.debug(
                f"Cycle rejected: delta_soc={delta_soc:.1f}% < {self._min_delta_soc}%"
            )
            self._cycle.reset()
            return None

        # Validace: dostatečná purity?
        if purity < self._min_purity:
            _LOGGER.debug(
                f"Cycle rejected: purity={purity:.1%} < {self._min_purity:.0%} "
                f"(interrupted {self._cycle.interruption_count} times)"
            )
            self._cycle.reset()
            return None

        # === POWER INTEGRATION ===
        net_energy_wh = self._cycle.total_charge_wh - self._cycle.total_discharge_wh
        net_energy_kwh = net_energy_wh / 1000.0

        # Measured capacity = net_energy / (delta_soc / 100)
        measured_capacity_kwh = net_energy_kwh / (delta_soc / 100.0)

        # State of Health
        soh_percent = (measured_capacity_kwh / self._nominal_capacity) * 100.0

        # === COULOMB COUNTING VALIDATION ===
        coulomb_capacity_kwh: Optional[float] = None
        coulomb_discrepancy_percent: Optional[float] = None
        validated = False

        if (
            self._cycle.coulomb_sample_count > 0
            and len(self._cycle.voltage_samples) > 0
        ):
            # Energy = Q * V_avg (Ah * V = Wh)
            avg_voltage = float(np.mean(self._cycle.voltage_samples))
            coulomb_energy_wh = abs(self._cycle.total_ah) * avg_voltage
            coulomb_energy_kwh = coulomb_energy_wh / 1000.0

            coulomb_capacity_kwh = float(coulomb_energy_kwh / (delta_soc / 100.0))

            # Discrepancy
            discrepancy_kwh = abs(measured_capacity_kwh - coulomb_capacity_kwh)
            coulomb_discrepancy_percent = float(
                (discrepancy_kwh / measured_capacity_kwh) * 100.0
            )

            # Validace: rozdíl < 5%?
            if coulomb_discrepancy_percent <= self._max_discrepancy_percent:
                validated = True

        # === QUALITY SCORING ===
        quality_score = self._calculate_quality_score(
            delta_soc=delta_soc,
            purity=purity,
            end_soc=end_soc,
            duration_hours=duration_hours,
            validated=validated,
        )

        # Validace: dostatečný quality score?
        if quality_score < self._min_quality_score:
            _LOGGER.debug(
                f"Cycle rejected: quality_score={quality_score:.0f} < {self._min_quality_score:.0f}"
            )
            self._cycle.reset()
            return None

        # Confidence score (0.0 - 1.0) - původní metrika
        confidence = quality_score / 100.0

        # Create measurement
        measurement = BatteryMeasurement(
            timestamp=timestamp,
            capacity_kwh=measured_capacity_kwh,
            soh_percent=soh_percent,
            start_soc=self._cycle.start_soc,
            end_soc=end_soc,
            delta_soc=delta_soc,
            method="power_integration",
            validated=validated,
            confidence=confidence,
            total_charge_wh=self._cycle.total_charge_wh,
            total_discharge_wh=self._cycle.total_discharge_wh,
            duration_hours=duration_hours,
            # NOVĚ: Purity metrics
            purity=purity,
            interruption_count=self._cycle.interruption_count,
            quality_score=quality_score,
            # Coulomb
            coulomb_capacity_kwh=coulomb_capacity_kwh,
            coulomb_discrepancy_percent=coulomb_discrepancy_percent,
        )

        # Store measurement
        self._measurements.append(measurement)

        _LOGGER.info(
            f"🔋 Battery cycle completed: "
            f"SoC {self._cycle.start_soc:.1f}% → {end_soc:.1f}% ({delta_soc:.1f}%), "
            f"capacity={measured_capacity_kwh:.2f} kWh, "
            f"SoH={soh_percent:.1f}%, "
            f"purity={purity:.1%}, "
            f"quality={quality_score:.0f}, "
            f"samples={self._cycle.sample_count}, "
            f"duration={duration_hours:.1f}h, "
            f"validated={'✅' if validated else '❌'}"
        )

        # Fire HA event
        self._fire_measurement_event(measurement)

        # Reset cycle
        self._cycle.reset()

        return measurement

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

        # 1. Delta SoC bonus
        if delta_soc >= 70:
            score += 20  # Excelentní rozsah
        elif delta_soc >= 50:
            score += 10  # Velmi dobrý rozsah
        elif delta_soc >= 40:
            score += 0  # Akceptovatelný
        else:
            return 0  # Zahodit

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
        intercept = coeffs[1]  # kWh

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

        # Nominální kapacita (načteme ze sensoru)
        self._nominal_capacity_kwh: float = 12.29  # Default

        _LOGGER.info(f"Battery Health sensor initialized for box {self._box_id}")

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # Načíst nominální kapacitu
        await self._load_nominal_capacity()

        # Inicializovat tracker
        self._tracker = BatteryCapacityTracker(
            hass=self._hass,
            box_id=self._box_id,
            nominal_capacity_kwh=self._nominal_capacity_kwh,
        )

        _LOGGER.info(f"Battery Health sensor added to HA, tracker initialized")

    async def _load_nominal_capacity(self) -> None:
        """Načíst nominální kapacitu baterie ze sensoru."""
        if not self._hass:
            return

        sensor_id = f"sensor.oig_{self._box_id}_usable_battery_capacity"
        state = self._hass.states.get(sensor_id)

        if state and state.state not in ["unknown", "unavailable"]:
            try:
                self._nominal_capacity_kwh = float(state.state)
                _LOGGER.info(
                    f"Loaded nominal capacity: {self._nominal_capacity_kwh:.2f} kWh from {sensor_id}"
                )
            except (ValueError, TypeError):
                _LOGGER.warning(
                    f"Failed to parse nominal capacity from {sensor_id}, using default"
                )
        
        # Schedule periodic updates (every 5 minutes)
        from homeassistant.helpers.event import async_track_time_change
        
        async def _health_update_job(now):
            """Run health update every 5 minutes."""
            _LOGGER.debug(f"⏰ Battery health update triggered at {now.strftime('%H:%M')}")
            try:
                await self.async_update()
            except Exception as e:
                _LOGGER.error(f"Battery health update failed: {e}", exc_info=True)
        
        # Schedule every 5 minutes (at :00, :05, :10, ...)
        for minute in range(0, 60, 5):
            async_track_time_change(
                self.hass,
                _health_update_job,
                minute=minute,
                second=0,
            )
        _LOGGER.info("✅ Scheduled battery health update every 5 minutes")

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
        State = SoH v procentech.

        Returns:
            SoH% nebo None pokud nemáme měření
        """
        if not self._tracker:
            return None

        _, soh = self._tracker.get_current_capacity()
        return round(soh, 1) if soh is not None else None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Dodatečné atributy."""
        if not self._tracker:
            return {}

        attrs = {
            "nominal_capacity_kwh": self._nominal_capacity_kwh,
        }

        # Current capacity
        capacity, soh = self._tracker.get_current_capacity()
        if capacity is not None:
            attrs["current_capacity_kwh"] = round(capacity, 2)
            attrs["capacity_loss_kwh"] = round(self._nominal_capacity_kwh - capacity, 2)

        # Degradation trend
        trend = self._tracker.analyze_degradation_trend(min_measurements=5)
        if trend:
            attrs.update(trend)

        # Cycle status
        if self._tracker._cycle.in_progress:
            attrs["cycle_in_progress"] = True
            if self._tracker._cycle.start_soc is not None:
                attrs["cycle_start_soc"] = round(self._tracker._cycle.start_soc, 1)
            if self._tracker._cycle.current_soc is not None:
                attrs["cycle_current_soc"] = round(self._tracker._cycle.current_soc, 1)
            attrs["cycle_duration_min"] = (
                (dt_util.now() - self._tracker._cycle.start_time).total_seconds() / 60
                if self._tracker._cycle.start_time
                else 0
            )
        else:
            attrs["cycle_in_progress"] = False

        # Recent measurements - zobrazit top 5 podle kvality
        recent = self._tracker.get_measurements(min_quality_score=60, limit=5)
        if recent:
            attrs["recent_measurements"] = [
                {
                    "timestamp": m.timestamp.isoformat(),
                    "capacity_kwh": round(m.capacity_kwh, 2),
                    "soh_percent": round(m.soh_percent, 1),
                    "quality_score": round(m.quality_score, 1),
                    "purity": round(m.purity * 100, 1),  # % clean charging
                    "delta_soc": round(m.end_soc - m.start_soc, 1),
                    "interruptions": m.interruption_count,
                    "validated": m.validated,
                }
                for m in recent
            ]

        # Celková statistika měření
        all_measurements = self._tracker._measurements
        if all_measurements:
            attrs["total_measurements"] = len(all_measurements)
            quality_measurements = [
                m for m in all_measurements if m.quality_score >= 60
            ]
            attrs["quality_measurements"] = len(quality_measurements)
            if quality_measurements:
                avg_quality = sum(m.quality_score for m in quality_measurements) / len(
                    quality_measurements
                )
                avg_purity = sum(m.purity for m in quality_measurements) / len(
                    quality_measurements
                )
                attrs["avg_quality_score"] = round(avg_quality, 1)
                attrs["avg_purity_percent"] = round(avg_purity * 100, 1)

        return attrs

    async def async_update(self) -> None:
        """Update sensor data - zpracovat power a coulomb updates."""
        if not self._hass or not self._tracker:
            return

        try:
            # Načíst power sensory (30s updates)
            charge_power = self._get_sensor_value(
                f"sensor.oig_{self._box_id}_batt_batt_comp_p_charge", 0.0
            )
            discharge_power = self._get_sensor_value(
                f"sensor.oig_{self._box_id}_batt_batt_comp_p_discharge", 0.0
            )
            current_soc = self._get_sensor_value(
                f"sensor.oig_{self._box_id}_batt_bat_c", 0.0
            )

            # Process power update
            if current_soc > 0:
                measurement = self._tracker.process_power_update(
                    charge_power_w=charge_power,
                    discharge_power_w=discharge_power,
                    current_soc=current_soc,
                )

                if measurement:
                    _LOGGER.info(
                        f"New battery measurement: {measurement.capacity_kwh:.2f} kWh"
                    )

            # Načíst coulomb sensory (5min updates)
            battery_current = self._get_sensor_value(
                f"sensor.oig_{self._box_id}_extended_battery_current", None
            )
            battery_voltage = self._get_sensor_value(
                f"sensor.oig_{self._box_id}_extended_battery_voltage", None
            )

            # Process coulomb update (pokud jsou dostupné)
            if battery_current is not None and battery_voltage is not None:
                self._tracker.process_coulomb_update(
                    current_a=battery_current,
                    voltage_v=battery_voltage,
                )

        except Exception as e:
            _LOGGER.error(f"Error updating battery health sensor: {e}", exc_info=True)

        # Trigger update
        self.async_write_ha_state()

    def _get_sensor_value(
        self, entity_id: str, default: Optional[float]
    ) -> Optional[float]:
        """Získat hodnotu ze sensoru."""
        if not self._hass:
            return default

        state = self._hass.states.get(entity_id)
        if not state or state.state in ["unknown", "unavailable"]:
            return default

        try:
            return float(state.state)
        except (ValueError, TypeError):
            return default
