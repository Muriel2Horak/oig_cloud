from __future__ import annotations

"""Datové modely pro bojlerový modul."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

__all__ = [
    "StratificationMode",
    "ThermometerPlacement",
    "TemperatureTopology",
    "BoilerThermalTopology",
    "BootstrapProfile",
    "EnergySource",
    "BoilerSlot",
    "BoilerPlan",
    "BoilerProfile",
]


class StratificationMode(str, Enum):
    """Režim stratifikace teploty v bojleru."""

    SIMPLE_AVG = "simple_avg"
    TWO_ZONE = "two_zone"


class ThermometerPlacement(str, Enum):
    """Umístění teploměru v nádrži."""

    TOP = "top"
    UPPER_QUARTER = "upper_quarter"
    MIDDLE = "middle"
    LOWER_QUARTER = "lower_quarter"
    BOTTOM = "bottom"


class TemperatureTopology(str, Enum):
    """Konfigurace teplotních senzorů v nádrži."""

    TOP_ONLY = "top_only"
    TOP_BOTTOM = "top_bottom"
    BOTTOM_ONLY = "bottom_only"


@dataclass
class BoilerThermalTopology:
    """Validovaná tepelná topologie bojleru pro plánovač."""

    stratification_mode: StratificationMode | str
    thermometer_placements: list[ThermometerPlacement | str]
    temperature_topology: TemperatureTopology | str
    tank_volume_l: float
    target_temp_c: float
    cold_inlet_temp_c: float
    heater_power_kw: float
    # Default is 0.0 — the previously-used 0.02 kWh/(l·°C·h) produced ~20 kWh
    # loss per 15-min slot on a 100 l tank (40× heater output) which is
    # physically wrong.  Callers that have calibration data may pass a value
    # ≤ 0.0003 kWh/(l·°C·h).
    standing_loss_coefficient: float = 0.0

    def __post_init__(self):
        if isinstance(self.stratification_mode, str):
            self.stratification_mode = StratificationMode(self.stratification_mode)
        if isinstance(self.temperature_topology, str):
            self.temperature_topology = TemperatureTopology(self.temperature_topology)
        self.thermometer_placements = [
            ThermometerPlacement(p) if isinstance(p, str) else p
            for p in self.thermometer_placements
        ]


@dataclass
class BootstrapProfile:
    """Bootstrap profil pro první běh bez historie."""

    profile: "BoilerProfile"
    confidence: float
    degraded_reason: str


class EnergySource(str, Enum):
    """Zdroj energie pro ohřev."""

    FVE = "fve"  # Fotovoltaika (režim CBB - "Zapnuto")
    GRID = "grid"  # Síť (normální režim - "Vypnuto")
    ALTERNATIVE = "alternative"  # Alternativní zdroj (např. tepelné čerpadlo)
    BATTERY = "battery"  # R3: Baterie (Home 5 manévr — vybití baterie do bojleru)


@dataclass
class BoilerSlot:
    """15minutový slot v plánu."""

    start: datetime
    end: datetime
    avg_consumption_kwh: float  # Průměrná spotřeba z profilu
    confidence: float  # 0-1, kvalita predikce
    recommended_source: EnergySource  # Doporučený zdroj
    spot_price_kwh: Optional[float] = None  # Cena ze sítě (Kč/kWh)
    alt_price_kwh: Optional[float] = None  # Cena z alternativy (Kč/kWh)
    overflow_available: bool = False  # Je k dispozici FVE overflow
    # Attribution fields copied from PlanSlotAction (planner_core.py PlanSlotAction
    # uses identical names for heating_kwh, pv_kwh, grid_kwh, alt_kwh,
    # estimated_cost_czk; heating_kwh is a convenience alias for avg_consumption_kwh).
    heating_kwh: float = 0.0  # Spotřeba energie na topení v tomto slotu (kWh)
    pv_kwh: float = 0.0  # FVE energie použitá v tomto slotu (kWh)
    grid_kwh: float = 0.0  # Síťová energie v tomto slotu (kWh)
    alt_kwh: float = 0.0  # Alternativní energie v tomto slotu (kWh)
    estimated_cost_czk: float = 0.0  # Odhadovaná cena za energii v tomto slotu (Kč)
    # Normalize PlanSlotAction.predicted_top_temp_c: only values > 0.0 are valid.
    predicted_top_temp_c: Optional[float] = None  # Predikovaná horní teplota (°C)
    comfort_satisfied: Optional[bool] = None  # Splnění komfortu (None = nehodnoceno)
    pv_share: float = 0.0  # Podíl FVE energie na topení (0.0-1.0)
    # R3/R9: battery and purpose propagated from PlanSlotAction for canonical DTO
    battery_kwh: float = 0.0  # Energie z baterie v tomto slotu (kWh) — R3 Home 5
    purpose: str = "comfort"  # "comfort" | "legionella" — R9


@dataclass
class BoilerPlan:
    """Plán ohřevu na 24 hodin."""

    created_at: datetime
    valid_until: datetime
    slots: list[BoilerSlot] = field(default_factory=list)
    total_consumption_kwh: float = 0.0
    estimated_cost_czk: float = 0.0
    fve_kwh: float = 0.0  # Kolik z FVE (zdarma)
    grid_kwh: float = 0.0  # Kolik ze sítě
    alt_kwh: float = 0.0  # Kolik z alternativy

    def get_current_slot(self, now: datetime) -> Optional[BoilerSlot]:
        """Vrátí aktuální slot podle času."""
        for slot in self.slots:
            if slot.start <= now < slot.end:
                return slot
        return None


@dataclass
class BoilerProfile:
    """Profilování spotřeby (adaptivní - 8 kategorií)."""

    category: str  # "workday_spring", "weekend_winter" atd.
    hourly_avg: dict[int, float] = field(default_factory=dict)  # Hodina → průměr kWh
    confidence: dict[int, float] = field(default_factory=dict)  # Hodina → confidence
    sample_count: dict[int, int] = field(default_factory=dict)  # Hodina → počet vzorků
    last_updated: Optional[datetime] = None

    def get_consumption(self, hour: int) -> tuple[float, float]:
        """Vrátí (spotřeba_kWh, confidence) pro danou hodinu."""
        return (
            self.hourly_avg.get(hour, 0.0),
            self.confidence.get(hour, 0.0),
        )
