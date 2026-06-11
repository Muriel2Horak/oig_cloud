"""Canonical planner input and source-capability contract for boiler module.

Defines DTOs, enums, reason codes, and validation logic for the boiler planner
boundary introduced in Task 4.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, ClassVar, Optional

from homeassistant.util import dt as dt_util

from .models import BoilerProfile, BoilerThermalTopology


class AlternativeSourceCapability(str, Enum):
    """Alternative-source capability levels for boiler heating."""

    DISABLED = "disabled"
    BENCHMARK_ONLY = "benchmark_only"
    CONTROLLABLE = "controllable"


class PlannerReasonCode(str, Enum):
    """Canonical reason/degraded/freshness codes.

    Exact set from Reason Code Appendix (boiler-module-redesign.md).
    """

    COMFORT_SATISFIED = "comfort_satisfied"
    COMFORT_UNSATISFIED = "comfort_unsatisfied"
    NO_FEASIBLE_PLAN = "no_feasible_plan"
    BOOTSTRAP_PROFILE = "bootstrap_profile"
    HISTORY_PROFILE_LOW_CONFIDENCE = "history_profile_low_confidence"
    INPUT_STALE_PRICE = "input_stale_price"
    INPUT_STALE_PV = "input_stale_pv"
    INPUT_MISSING_RECORDER = "input_missing_recorder"
    INPUT_ADAPTER_ERROR = "input_adapter_error"
    INPUT_STALE_TEMPERATURE = "input_stale_temperature"
    TOP_SENSOR_UNAVAILABLE = "top_sensor_unavailable"
    BOTTOM_SENSOR_UNAVAILABLE_TOP_ONLY_DEGRADED = "bottom_sensor_unavailable_top_only_degraded"
    PRIMARY_ACTUATOR_UNAVAILABLE = "primary_actuator_unavailable"
    ALTERNATIVE_ACTUATOR_UNAVAILABLE_BENCHMARK_ONLY = "alternative_actuator_unavailable_benchmark_only"
    CIRCULATION_PUMP_UNAVAILABLE = "circulation_pump_unavailable"
    ACTUATOR_RATE_LIMITED = "actuator_rate_limited"
    ACTUATOR_SERIALIZER_ERROR = "actuator_serializer_error"
    OVERRIDE_ACTIVE = "override_active"
    OVERRIDE_EXPIRED = "override_expired"
    PLANNER_TIMEOUT = "planner_timeout"
    REPLAN_COALESCED = "replan_coalesced"
    SOURCE_SELECTED_GRID = "source_selected_grid"
    SOURCE_SELECTED_PV = "source_selected_pv"
    SOURCE_SELECTED_ALTERNATIVE = "source_selected_alternative"
    SOURCE_BENCHMARK_ONLY = "source_benchmark_only"
    SETUP_INCOMPLETE = "setup_incomplete"
    MIGRATION_REQUIRED = "migration_required"
    API_REPAIR_REQUIRED = "api_repair_required"
    STORAGE_WRITE_FAILED = "storage_write_failed"
    DEMAND_TARGET_MISSED = "demand_target_missed"
    # R9: anti-legionella obligation reason codes
    LEGIONELLA_SCHEDULED = "legionella_scheduled"
    LEGIONELLA_OVERDUE_INFEASIBLE = "legionella_overdue_infeasible"
    LEGIONELLA_ALREADY_SATISFIED = "legionella_already_satisfied"
    # R3: Home 5 maneuver (battery-discharge boiler heating)
    SOURCE_SELECTED_BATTERY = "source_selected_battery"


@dataclass
class DemandTarget:
    """A single demand readiness target derived from the F2 demand profiler.

    start: earliest time by which the required energy must be available.
    required_kwh: cumulative hot-water energy needed at *start*.
    label: human-readable identifier (e.g. "workday_summer_morning").

    When demand_targets is empty (bootstrap / low-confidence path) the planner
    degenerates to the existing single-deadline model — zero regression.
    """

    start: datetime
    required_kwh: float
    label: str


@dataclass
class LegionellaObligation:
    """Legionella heating obligation to pass into the planner.

    When overdue (days_since >= interval_days and interval_days > 0), the
    planner allocates extra slots to reach legionella_target_temp_c on top
    of the comfort plan.

    Fields
    ------
    overdue:              True when anti-legionella heating is due.
    required_kwh:         kWh needed to raise TOP zone to legionella_target_temp_c.
    legionella_target_temp_c: Target temperature for legionella kill.
    days_since_last:      Days since last verified legionella-temperature event
                          (None when unknown / recorder unavailable).
    interval_days:        Configured check interval (0 = disabled).
    """

    overdue: bool
    required_kwh: float
    legionella_target_temp_c: float
    days_since_last: Optional[int]
    interval_days: int


@dataclass
class BoilerBatterySignals:
    """Explicitly allowed battery-derived signals for boiler planner input.

    Rejects or ignores forbidden battery planner internals by contract.
    """

    ALLOWED_FIELDS: ClassVar[frozenset[str]] = frozenset(
        {"overflow_windows", "battery_usable_kwh"}
    )

    overflow_windows: list[tuple[datetime, datetime]] = field(default_factory=list)
    # R3: kWh available above the reserve/min-SoC right now; None when unknown.
    battery_usable_kwh: Optional[float] = None

    @classmethod
    def from_raw(cls, raw: dict[str, Any]) -> "BoilerBatterySignals":
        """Sanitize raw battery forecast data to allowed signal set only."""
        if not isinstance(raw, dict):
            raise TypeError("raw battery data must be a dict")
        allowed = {k: v for k, v in raw.items() if k in cls.ALLOWED_FIELDS}
        battery_usable_kwh = allowed.get("battery_usable_kwh")
        if battery_usable_kwh is not None:
            try:
                battery_usable_kwh = float(battery_usable_kwh)
            except (TypeError, ValueError):
                battery_usable_kwh = None
        return cls(
            overflow_windows=allowed.get("overflow_windows", []),
            battery_usable_kwh=battery_usable_kwh,
        )


@dataclass
class PlannerInput:
    """Canonical planner input DTO with explicit validation.

    Invalid planner inputs fail loudly via ValueError/TypeError in __post_init__.
    """

    entry_id: str
    box_id: str
    profile: BoilerProfile
    spot_prices: dict[datetime, float]
    overflow_windows: list[tuple[datetime, datetime]]
    deadline_time: str = "06:00"
    topology: Optional[BoilerThermalTopology] = None
    alt_source_capability: AlternativeSourceCapability = AlternativeSourceCapability.DISABLED
    alt_cost_kwh: float = 0.0
    pv_forecast: float = 0.0
    pv_confidence: float = 0.0
    battery_signals: Optional[BoilerBatterySignals] = None
    current_top_temp_c: Optional[float] = None
    current_bottom_temp_c: Optional[float] = None
    temperature_updated_at: Optional[datetime] = None
    horizon_hours: Optional[int] = None
    reason_codes: list[PlannerReasonCode] = field(default_factory=list)
    demand_targets: list[DemandTarget] = field(default_factory=list)
    # R9: anti-legionella obligation (None = disabled / not yet detected)
    legionella_obligation: Optional[LegionellaObligation] = None
    # R3: Home 5 maneuver available (both CONF_BOX_HAS_HOME56 AND
    # CONF_BOILER_HOME5_MANEUVER_ENABLED must be True, set by runtime).
    home5_available: bool = False

    def __post_init__(self) -> None:
        if not isinstance(self.entry_id, str) or not self.entry_id:
            raise ValueError("entry_id is required and must be a non-empty string")
        if not isinstance(self.box_id, str) or not self.box_id:
            raise ValueError("box_id is required and must be a non-empty string")
        if self.profile is None:
            raise ValueError("profile is required")
        if not isinstance(self.spot_prices, dict):
            raise TypeError("spot_prices must be a dict mapping datetime to float")
        if not isinstance(self.overflow_windows, list):
            raise TypeError("overflow_windows must be a list")
        _validate_deadline_time(self.deadline_time)
        if isinstance(self.alt_source_capability, str):
            self.alt_source_capability = AlternativeSourceCapability(
                self.alt_source_capability
            )
        if not isinstance(
            self.alt_source_capability, AlternativeSourceCapability
        ):
            raise ValueError(
                f"invalid alt_source_capability: {self.alt_source_capability}"
            )
        self.reason_codes = _normalize_reason_codes(self.reason_codes)


def _validate_deadline_time(value: str) -> None:
    """Validate deadline_time is a valid HH:MM string."""
    if not isinstance(value, str):
        raise ValueError("deadline_time must be a string in HH:MM format")
    parts = value.split(":")
    if len(parts) != 2:
        raise ValueError("deadline_time must be a string in HH:MM format")
    try:
        hours = int(parts[0])
        minutes = int(parts[1])
    except ValueError:
        raise ValueError("deadline_time must be a string in HH:MM format")
    if not (0 <= hours <= 23 and 0 <= minutes <= 59):
        raise ValueError("deadline_time must be a valid time in HH:MM format")


def _normalize_reason_codes(
    values: Sequence[PlannerReasonCode | str],
) -> list[PlannerReasonCode]:
    """Coerce reason code strings/enums and preserve first-seen order."""
    if isinstance(values, (str, bytes)) or not isinstance(values, Sequence):
        raise TypeError("reason_codes must be a sequence")
    normalized: list[PlannerReasonCode] = []
    for value in values:
        code = value if isinstance(value, PlannerReasonCode) else PlannerReasonCode(value)
        if code not in normalized:
            normalized.append(code)
    return normalized


def validate_freshness(
    planner_input: PlannerInput,
    slot_minutes: int = 15,
    now: Optional[datetime] = None,
) -> tuple[bool, list[PlannerReasonCode]]:
    """Validate that planner inputs are fresh.

    Inputs are fresh only when current slot and next two planning slots are
    covered by spot_prices and overflow_windows respectively.

    Returns:
        (is_fresh, list_of_stale_reason_codes)
    """
    if now is None:
        now = dt_util.now()

    reasons: list[PlannerReasonCode] = []

    slot_start = now.replace(
        second=0, microsecond=0
    )
    slot_start = slot_start.replace(
        minute=(slot_start.minute // slot_minutes) * slot_minutes
    )
    required_slots = [
        slot_start + timedelta(minutes=slot_minutes * i) for i in range(3)
    ]

    # Price coverage check
    price_missing = False
    if not all(isinstance(k, datetime) for k in planner_input.spot_prices):
        price_missing = True
    else:
        for slot in required_slots:
            if slot not in planner_input.spot_prices:
                price_missing = True
                break
    if price_missing:
        reasons.append(PlannerReasonCode.INPUT_STALE_PRICE)

    # PV freshness: overflow windows are a SCHEDULE OF OPPORTUNITIES, not a
    # freshness signal. Since F1 they come from the battery pipeline, and an
    # empty/non-covering window list is perfectly fresh data ("no overflow
    # expected now" — e.g. every night). Requiring windows to cover the next
    # slots kept the plan degraded with INPUT_STALE_PV all night. True PV
    # staleness (pipeline missing, unparseable payload) is flagged by the
    # energy-input adapter and propagates via planner_input.reason_codes, so
    # no coverage check belongs here.

    is_fresh = len(reasons) == 0
    return is_fresh, reasons


def resolve_alt_source_capability(
    has_alternative: bool,
    actuator_model: Optional[str] = None,
    supported_models: Optional[set[str]] = None,
) -> AlternativeSourceCapability:
    """Downgrade unsupported alternative-source actuator models deterministically.

    - No alternative source → DISABLED
    - Unsupported/unknown model → BENCHMARK_ONLY
    - Supported model → CONTROLLABLE
    """
    if not has_alternative:
        return AlternativeSourceCapability.DISABLED
    if supported_models is None:
        supported_models = set()
    if actuator_model is None or actuator_model not in supported_models:
        return AlternativeSourceCapability.BENCHMARK_ONLY
    return AlternativeSourceCapability.CONTROLLABLE
