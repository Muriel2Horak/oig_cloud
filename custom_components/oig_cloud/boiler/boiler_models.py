"""Data models for Boiler module."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal, Optional


@dataclass
class BoilerConfig:
    """Configuration for Boiler module."""

    # Tank parameters
    volume_l: float
    target_temp_c: float
    cold_inlet_temp_c: float

    # Temperature sensors
    temp_sensor_top: Optional[str] = None
    temp_sensor_bottom: Optional[str] = None
    stratification_mode: Literal["simple_avg", "two_zone"] = "simple_avg"
    two_zone_split_ratio: float = 0.5

    # Heater control
    heater_power_kw_entity: str = "sensor.oig_2206237016_boiler_install_power"
    heater_switch_entity: Optional[str] = None
    alt_heater_switch_entity: Optional[str] = None

    # Alternative heating
    has_alternative_heating: bool = False
    alt_cost_kwh: Optional[float] = None

    # Pricing & planning
    spot_price_sensor: Optional[str] = None
    deadline_time: str = "20:00"
    planning_horizon_hours: int = 36
    plan_slot_minutes: int = 30

    def __post_init__(self) -> None:
        """Validate configuration after initialization."""
        if self.volume_l <= 0:
            raise ValueError("volume_l must be positive")
        if not 0 <= self.target_temp_c <= 100:
            raise ValueError("target_temp_c must be between 0 and 100")
        if not 0 <= self.cold_inlet_temp_c <= 100:
            raise ValueError("cold_inlet_temp_c must be between 0 and 100")
        if self.stratification_mode not in ("simple_avg", "two_zone"):
            raise ValueError("stratification_mode must be 'simple_avg' or 'two_zone'")
        if not 0.1 <= self.two_zone_split_ratio <= 0.9:
            raise ValueError("two_zone_split_ratio must be between 0.1 and 0.9")
        if self.planning_horizon_hours <= 0:
            raise ValueError("planning_horizon_hours must be positive")
        if self.plan_slot_minutes <= 0:
            raise ValueError("plan_slot_minutes must be positive")


@dataclass
class BoilerState:
    """Current state of the boiler."""

    # Temperature readings
    temp_top_c: Optional[float] = None
    temp_bottom_c: Optional[float] = None
    temp_avg_c: Optional[float] = None

    # Energy state
    energy_now_kwh: float = 0.0
    energy_target_kwh: float = 0.0
    energy_required_kwh: float = 0.0
    soc_percent: float = 0.0

    # Metadata
    updated_at: Optional[datetime] = None
    method: Literal["simple_avg", "two_zone"] = "simple_avg"

    def to_digest(self) -> dict[str, Any]:
        """Convert to digest for entity attributes (small footprint)."""
        return {
            "temp_top_c": round(self.temp_top_c, 1) if self.temp_top_c else None,
            "temp_bottom_c": (
                round(self.temp_bottom_c, 1) if self.temp_bottom_c else None
            ),
            "temp_avg_c": round(self.temp_avg_c, 1) if self.temp_avg_c else None,
            "energy_now_kwh": round(self.energy_now_kwh, 2),
            "energy_target_kwh": round(self.energy_target_kwh, 2),
            "energy_required_kwh": round(self.energy_required_kwh, 2),
            "soc_percent": round(self.soc_percent, 1),
            "method": self.method,
            "updated_at": (self.updated_at.isoformat() if self.updated_at else None),
        }


@dataclass
class PlanSlot:
    """Single heating slot in plan."""

    start: datetime
    end: datetime
    duration_min: int
    energy_kwh: float
    price_czk_kwh: float
    cost_czk: float

    def to_dict(self) -> dict[str, Any]:
        """Convert to dict for JSON serialization."""
        return {
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "duration_min": self.duration_min,
            "energy_kwh": round(self.energy_kwh, 2),
            "price_czk_kwh": round(self.price_czk_kwh, 2),
            "cost_czk": round(self.cost_czk, 2),
        }


@dataclass
class BoilerPlan:
    """Complete heating plan."""

    slots: list[PlanSlot] = field(default_factory=list)
    total_energy_kwh: float = 0.0
    total_cost_czk: float = 0.0
    deadline: Optional[datetime] = None
    use_alternative: bool = False
    created_at: Optional[datetime] = None

    # Breakdown: grid vs alternative
    grid_energy_kwh: float = 0.0
    grid_cost_czk: float = 0.0
    alt_energy_kwh: float = 0.0
    alt_cost_czk: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dict for JSON serialization."""
        return {
            "slots": [slot.to_dict() for slot in self.slots],
            "total_energy_kwh": round(self.total_energy_kwh, 2),
            "total_cost_czk": round(self.total_cost_czk, 2),
            "grid_energy_kwh": round(self.grid_energy_kwh, 2),
            "grid_cost_czk": round(self.grid_cost_czk, 2),
            "alt_energy_kwh": round(self.alt_energy_kwh, 2),
            "alt_cost_czk": round(self.alt_cost_czk, 2),
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "use_alternative": self.use_alternative,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_digest(self, max_slots: int = 6) -> dict[str, Any]:
        """Convert to digest for entity attributes (limited slots)."""
        return {
            "total_energy_kwh": round(self.total_energy_kwh, 2),
            "total_cost_czk": round(self.total_cost_czk, 2),
            "grid_energy_kwh": round(self.grid_energy_kwh, 2),
            "grid_cost_czk": round(self.grid_cost_czk, 2),
            "alt_energy_kwh": round(self.alt_energy_kwh, 2),
            "alt_cost_czk": round(self.alt_cost_czk, 2),
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "use_alternative": self.use_alternative,
            "slots_count": len(self.slots),
            "slots": [slot.to_dict() for slot in self.slots[:max_slots]],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


@dataclass
class WaterUsageProfile:
    """Profile of water usage patterns."""

    # Histogram: hour -> average consumption kWh
    hourly_avg_kwh: dict[int, float] = field(default_factory=dict)

    # Total tracked period
    days_tracked: int = 7

    # Metadata
    last_updated: Optional[datetime] = None

    def get_expected_usage_kwh(self, start_hour: int, end_hour: int) -> float:
        """Get expected usage between hours (handles wrapping)."""
        total = 0.0
        hour = start_hour
        while hour != end_hour:
            total += self.hourly_avg_kwh.get(hour, 0.0)
            hour = (hour + 1) % 24
        return total

    def to_digest(self, top_n: int = 6) -> dict[str, Any]:
        """Convert to digest (top N hours with highest usage)."""
        sorted_hours = sorted(
            self.hourly_avg_kwh.items(), key=lambda x: x[1], reverse=True
        )
        return {
            "top_usage_hours": [
                {"hour": h, "avg_kwh": round(kwh, 2)} for h, kwh in sorted_hours[:top_n]
            ],
            "days_tracked": self.days_tracked,
            "last_updated": (
                self.last_updated.isoformat() if self.last_updated else None
            ),
        }

    def to_dict(self) -> dict[str, Any]:
        """Full dict for file storage."""
        return {
            "hourly_avg_kwh": {
                str(h): round(kwh, 2) for h, kwh in self.hourly_avg_kwh.items()
            },
            "days_tracked": self.days_tracked,
            "last_updated": (
                self.last_updated.isoformat() if self.last_updated else None
            ),
        }
