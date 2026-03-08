from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, TypedDict

from .types import CBBMode, INTERVAL_MINUTES


class IntervalData(TypedDict):
    """Data for a single planning interval.

    Attributes:
        index: Interval index in the planning timeline
    """

    index: int


@dataclass
class PlannerInputs:
    """All dynamic inputs required by the economic planner."""

    current_soc_kwh: float
    max_capacity_kwh: float
    hw_min_kwh: float
    planning_min_percent: float
    charge_rate_kw: float
    intervals: List[IntervalData]
    prices: List[float]
    solar_forecast: List[float]
    load_forecast: List[float]

    @property
    def planning_min_kwh(self) -> float:
        return self.max_capacity_kwh * (self.planning_min_percent / 100.0)

    @property
    def charge_rate_per_interval(self) -> float:
        return self.charge_rate_kw * (INTERVAL_MINUTES / 60.0)

    def __post_init__(self) -> None:
        if self.max_capacity_kwh <= 0:
            raise ValueError("Max capacity must be positive")

        if self.current_soc_kwh <= 0:
            raise ValueError("Current SOC must be positive")

        if self.current_soc_kwh > self.max_capacity_kwh:
            raise ValueError("Current SOC exceeds capacity")

        if self.charge_rate_kw <= 0:
            raise ValueError("Charge rate must be positive")

        if self.planning_min_percent > 100:
            raise ValueError("Planning min percent cannot exceed 100")

        if self.planning_min_kwh < self.hw_min_kwh:
            raise ValueError("Planning min < HW min")

        n_intervals = len(self.intervals)
        if (
            len(self.prices) != n_intervals
            or len(self.solar_forecast) != n_intervals
            or len(self.load_forecast) != n_intervals
        ):
            raise ValueError("Forecast lengths must match intervals count")

        if any(solar < 0 for solar in self.solar_forecast):
            raise ValueError("Solar forecast cannot be negative")

        if any(load < 0 for load in self.load_forecast):
            raise ValueError("Load forecast cannot be negative")


@dataclass
class SimulatedState:
    """Battery and grid state for one simulated interval."""

    interval_index: int
    soc_kwh: float
    solar_kwh: float
    load_kwh: float
    grid_import_kwh: float
    grid_export_kwh: float
    cost_czk: float
    mode: int


@dataclass
class CriticalMoment:
    """Moment where predicted SOC falls below planning minimum."""

    type: str
    interval: int
    deficit_kwh: float
    intervals_needed: int
    must_start_charging: int
    soc_kwh: Optional[float] = None


@dataclass
class Decision:
    """Economic decision for a critical moment and selected strategy."""

    moment: CriticalMoment
    strategy: str
    cost: float
    charge_intervals: List[int] = field(default_factory=list)
    alternatives: Optional[List[Tuple[str, float]]] = None
    reason: Optional[str] = None


@dataclass
class PlannerResult:
    """Final planner output with selected modes and simulation trajectory."""

    modes: List[int]
    states: List[SimulatedState]
    total_cost: float
    decisions: List[Decision] = field(default_factory=list)
