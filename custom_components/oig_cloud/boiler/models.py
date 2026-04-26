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
    standing_loss_coefficient: float = 0.02

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
