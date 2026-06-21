from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, TypedDict

from .types import (
    DEFAULT_CHARGE_EFFICIENCY,
    DEFAULT_EFFICIENCY,
    INTERVAL_MINUTES,
)

# Default daily-price percentile above which a baseline grid import is
# considered "expensive" and worth displacing with pre-charging. Configurable
# per the LOCKED design (F1); full wiring from config_entry.options happens in
# a later phase (F2).
DEFAULT_EXPENSIVE_PERCENTILE: float = 0.70

# Default round-trip efficiency used by the economic (η-)gate. This mirrors the
# global simulation constants: storing then re-extracting energy incurs both the
# charge and discharge losses.
DEFAULT_ROUND_TRIP_EFFICIENCY: float = DEFAULT_EFFICIENCY * DEFAULT_CHARGE_EFFICIENCY


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
    # Daily-price percentile threshold P for the EXPENSIVE_IMPORT classifier.
    # Safe default per LOCKED design; wired from options in a later phase.
    expensive_percentile: float = DEFAULT_EXPENSIVE_PERCENTILE
    # Round-trip efficiency η for the economic gate (cheap/η < expensive).
    round_trip_efficiency: float = DEFAULT_ROUND_TRIP_EFFICIENCY
    # Optional per-interval day index (0=today, 1=tomorrow, ...). When set, the
    # EXPENSIVE_IMPORT percentile threshold is computed per day instead of over
    # the whole horizon, so a cheap day and an expensive day are judged
    # independently. Falls back to a whole-horizon percentile when None.
    interval_days: Optional[List[int]] = None
    # Comfort SoC target (kWh, 0 = disabled). The planner opportunistically tops
    # up toward this level using ONLY cheap windows (never expensive grid), so the
    # battery keeps a buffer well above the hard floor and the BOX never
    # force-charges to ~80% at any price. Distinct from the hard floor, which is
    # still defended at any price as the last resort.
    comfort_soc_kwh: float = 0.0

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

        if not (0.0 < self.expensive_percentile <= 1.0):
            raise ValueError("Expensive percentile must be in (0, 1]")

        if not (0.0 < self.round_trip_efficiency <= 1.0):
            raise ValueError("Round-trip efficiency must be in (0, 1]")


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
    # For EXPENSIVE_IMPORT moments: the all-in price at the expensive interval,
    # used by the economic η-gate during displacement. None for PLANNING_MIN.
    price_czk: Optional[float] = None


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
