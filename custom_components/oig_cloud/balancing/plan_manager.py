"""Plan Manager - Plan Lifecycle and Storage per BR-2."""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
import json
import logging

from .simulation import BatterySimulation, IntervalSimulation, SimulationContext

_LOGGER = logging.getLogger(__name__)


class PlanStatus(Enum):
    """Plan status per BR-2.2."""

    SIMULATED = "simulated"  # Calculated but not active
    ACTIVE = "active"  # Currently controlling CBB
    DEACTIVATED = "deactivated"  # Was active, now stopped


class PlanType(Enum):
    """Plan type per BR-2.1."""

    AUTOMATIC = "automatic"  # Background automatic planning
    MANUAL = "manual"  # User-initiated plan
    BALANCING = "balancing"  # Battery balancing plan
    WEATHER = "weather"  # Weather emergency plan


@dataclass
class Plan:
    """Battery plan per BR-2.1."""

    # Identification
    plan_id: str  # Unique ID (timestamp-based)
    plan_type: PlanType
    status: PlanStatus

    # Timeline
    created_at: datetime
    valid_from: datetime
    valid_until: datetime

    # Plan parameters
    target_soc_kwh: Optional[float] = None  # Target SoC (if applicable)
    target_time: Optional[datetime] = None  # Time to reach target
    holding_hours: Optional[int] = None  # Hours to hold
    holding_mode: Optional[int] = None  # Mode for holding

    # Simulation results
    intervals: List[Dict[str, Any]] = None  # Serialized IntervalSimulation list
    total_cost_czk: float = 0.0
    total_import_kwh: float = 0.0
    total_export_kwh: float = 0.0

    # Metadata
    metadata: Dict[str, Any] = None  # Additional plan-specific data

    def __post_init__(self):
        """Initialize mutable defaults."""
        if self.intervals is None:
            self.intervals = []
        if self.metadata is None:
            self.metadata = {}

    def to_dict(self) -> Dict[str, Any]:
        """Serialize plan to dict."""
        data = asdict(self)
        # Convert enums to strings
        data["plan_type"] = self.plan_type.value
        data["status"] = self.status.value
        # Convert datetimes to ISO strings
        data["created_at"] = self.created_at.isoformat()
        data["valid_from"] = self.valid_from.isoformat()
        data["valid_until"] = self.valid_until.isoformat()
        if self.target_time:
            data["target_time"] = self.target_time.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Plan:
        """Deserialize plan from dict."""
        # Convert strings to enums
        data["plan_type"] = PlanType(data["plan_type"])
        data["status"] = PlanStatus(data["status"])
        # Convert ISO strings to datetimes
        data["created_at"] = datetime.fromisoformat(data["created_at"])
        data["valid_from"] = datetime.fromisoformat(data["valid_from"])
        data["valid_until"] = datetime.fromisoformat(data["valid_until"])
        if data.get("target_time"):
            data["target_time"] = datetime.fromisoformat(data["target_time"])
        return cls(**data)


class PlanManager:
    """Manage plan lifecycle and storage per BR-2.

    Implements:
    - BR-2.1: Plan types (automatic, manual, balancing, weather)
    - BR-2.2: Plan status (simulated, active, deactivated)
    - BR-2.3: Plan storage (JSON files on HA server)
    - BR-2.4: Automatic vs Manual behavior
    - BR-2.5: Plan API
    """

    def __init__(
        self,
        storage_path: Path,
        simulation: BatterySimulation,
        box_id: str,
    ):
        """Initialize plan manager.

        Args:
            storage_path: Path to plan storage directory
            simulation: BatterySimulation instance
            box_id: OIG box ID for file naming
        """
        self.storage_path = Path(storage_path)
        self.simulation = simulation
        self.box_id = box_id
        self._logger = _LOGGER

        # Ensure storage path exists
        self.storage_path.mkdir(parents=True, exist_ok=True)

        # In-memory cache
        self._active_plan: Optional[Plan] = None
        self._plans_cache: Dict[str, Plan] = {}

    def create_automatic_plan(
        self,
        start_time: Optional[datetime] = None,
        horizon_hours: int = 48,
    ) -> Plan:
        """Create automatic plan per BR-2.4.

        Args:
            start_time: Plan start (default: now)
            horizon_hours: Planning horizon (default: 48h)

        Returns:
            New automatic plan (SIMULATED status)
        """
        now = datetime.now()
        start = start_time or now
        end = start + timedelta(hours=horizon_hours)

        # Generate plan ID
        plan_id = f"auto_{now.strftime('%Y%m%d_%H%M%S')}"

        # Optimize plan (soft target constraint)
        intervals = self.simulation.optimize_plan(
            start_time=start,
            end_time=end,
            target_soc_kwh=self.simulation.context.target_capacity_kwh,
            target_time=None,  # No specific target time for automatic
            context_type="automatic",
        )

        # Calculate totals
        total_cost = sum(i.interval_cost_czk for i in intervals)
        total_import = sum(i.grid_import_kwh for i in intervals)
        total_export = sum(i.grid_export_kwh for i in intervals)

        # Create plan
        plan = Plan(
            plan_id=plan_id,
            plan_type=PlanType.AUTOMATIC,
            status=PlanStatus.SIMULATED,
            created_at=now,
            valid_from=start,
            valid_until=end,
            intervals=[self._serialize_interval(i) for i in intervals],
            total_cost_czk=total_cost,
            total_import_kwh=total_import,
            total_export_kwh=total_export,
        )

        # Store plan
        self._save_plan(plan)
        self._plans_cache[plan_id] = plan

        self._logger.info(
            f"Created automatic plan {plan_id}: "
            f"{len(intervals)} intervals, cost={total_cost:.2f} CZK"
        )

        return plan

    def create_manual_plan(
        self,
        target_soc_percent: float,
        target_time: datetime,
        holding_hours: Optional[int] = None,
        holding_mode: Optional[int] = None,
    ) -> Plan:
        """Create manual plan per BR-2.4.

        Args:
            target_soc_percent: Target SoC (0-100%)
            target_time: Time to reach target (ZAČÁTEK holdingu if holding)
            holding_hours: Hours to hold after target (optional)
            holding_mode: Mode for holding (required if holding_hours set)

        Returns:
            New manual plan (SIMULATED status)
        """
        now = datetime.now()

        # Convert percent to kWh
        target_soc_kwh = (
            target_soc_percent / 100.0
        ) * self.simulation.context.battery_capacity_kwh

        # Calculate plan horizon
        if holding_hours:
            end_time = target_time + timedelta(hours=holding_hours)
        else:
            end_time = target_time + timedelta(hours=6)  # Default 6h after target

        # Generate plan ID
        plan_id = f"manual_{now.strftime('%Y%m%d_%H%M%S')}"

        # Optimize plan (HARD target constraint)
        intervals = self.simulation.optimize_plan(
            start_time=now,
            end_time=end_time,
            target_soc_kwh=target_soc_kwh,
            target_time=target_time,
            holding_hours=holding_hours,
            holding_mode=holding_mode,
            context_type="manual",
        )

        # Calculate totals
        total_cost = sum(i.interval_cost_czk for i in intervals)
        total_import = sum(i.grid_import_kwh for i in intervals)
        total_export = sum(i.grid_export_kwh for i in intervals)

        # Create plan
        plan = Plan(
            plan_id=plan_id,
            plan_type=PlanType.MANUAL,
            status=PlanStatus.SIMULATED,
            created_at=now,
            valid_from=now,
            valid_until=end_time,
            target_soc_kwh=target_soc_kwh,
            target_time=target_time,
            holding_hours=holding_hours,
            holding_mode=holding_mode,
            intervals=[self._serialize_interval(i) for i in intervals],
            total_cost_czk=total_cost,
            total_import_kwh=total_import,
            total_export_kwh=total_export,
        )

        # Store plan
        self._save_plan(plan)
        self._plans_cache[plan_id] = plan

        self._logger.info(
            f"Created manual plan {plan_id}: target={target_soc_percent}% "
            f"at {target_time}, holding={holding_hours}h"
        )

        return plan

    def create_balancing_plan(
        self,
        target_soc_percent: float,
        target_time: datetime,
        holding_hours: int,
        holding_mode: int,
        balancing_mode: str,  # "opportunistic", "economic", "forced"
    ) -> Plan:
        """Create balancing plan per BR-4.

        Args:
            target_soc_percent: Target SoC (typically 100%)
            target_time: Time to reach target (ZAČÁTEK holdingu)
            holding_hours: Hours to hold
            holding_mode: Mode for holding (typically HOME_III)
            balancing_mode: Balancing mode type

        Returns:
            New balancing plan (SIMULATED status)
        """
        now = datetime.now()

        # Convert percent to kWh
        target_soc_kwh = (
            target_soc_percent / 100.0
        ) * self.simulation.context.battery_capacity_kwh

        # Calculate plan horizon
        end_time = target_time + timedelta(hours=holding_hours)

        # Generate plan ID
        plan_id = f"balancing_{balancing_mode}_{now.strftime('%Y%m%d_%H%M%S')}"

        # Optimize plan (HARD target constraint)
        intervals = self.simulation.optimize_plan(
            start_time=now,
            end_time=end_time,
            target_soc_kwh=target_soc_kwh,
            target_time=target_time,
            holding_hours=holding_hours,
            holding_mode=holding_mode,
            context_type="balancing",
        )

        # Calculate totals
        total_cost = sum(i.interval_cost_czk for i in intervals)
        total_import = sum(i.grid_import_kwh for i in intervals)
        total_export = sum(i.grid_export_kwh for i in intervals)

        # Create plan
        plan = Plan(
            plan_id=plan_id,
            plan_type=PlanType.BALANCING,
            status=PlanStatus.SIMULATED,
            created_at=now,
            valid_from=now,
            valid_until=end_time,
            target_soc_kwh=target_soc_kwh,
            target_time=target_time,
            holding_hours=holding_hours,
            holding_mode=holding_mode,
            intervals=[self._serialize_interval(i) for i in intervals],
            total_cost_czk=total_cost,
            total_import_kwh=total_import,
            total_export_kwh=total_export,
            metadata={"balancing_mode": balancing_mode},
        )

        # Store plan
        self._save_plan(plan)
        self._plans_cache[plan_id] = plan

        self._logger.info(
            f"Created balancing plan {plan_id}: mode={balancing_mode}, "
            f"target={target_soc_percent}% at {target_time}, holding={holding_hours}h"
        )

        return plan

    def create_weather_plan(
        self,
        warning_start: datetime,
        warning_duration_hours: int,
        chmu_sensor_state: str,
    ) -> Plan:
        """Create weather emergency plan per BR-7.2.

        Args:
            warning_start: Warning start time (ZAČÁTEK holdingu)
            warning_duration_hours: Initial warning duration
            chmu_sensor_state: ČHMÚ sensor state

        Returns:
            New weather plan (SIMULATED status)
        """
        now = datetime.now()

        # Target: always 100%
        target_soc_kwh = self.simulation.context.battery_capacity_kwh

        # Calculate plan horizon (warning duration)
        end_time = warning_start + timedelta(hours=warning_duration_hours)

        # Generate plan ID
        plan_id = f"weather_{now.strftime('%Y%m%d_%H%M%S')}"

        # Optimize plan (HARD target constraint, highest priority)
        intervals = self.simulation.optimize_plan(
            start_time=now,
            end_time=end_time,
            target_soc_kwh=target_soc_kwh,
            target_time=warning_start,
            holding_hours=warning_duration_hours,
            holding_mode=3,  # HOME_III
            context_type="weather",
        )

        # Calculate totals
        total_cost = sum(i.interval_cost_czk for i in intervals)
        total_import = sum(i.grid_import_kwh for i in intervals)
        total_export = sum(i.grid_export_kwh for i in intervals)

        # Create plan
        plan = Plan(
            plan_id=plan_id,
            plan_type=PlanType.WEATHER,
            status=PlanStatus.SIMULATED,
            created_at=now,
            valid_from=now,
            valid_until=end_time,
            target_soc_kwh=target_soc_kwh,
            target_time=warning_start,
            holding_hours=warning_duration_hours,
            holding_mode=3,  # HOME_III
            intervals=[self._serialize_interval(i) for i in intervals],
            total_cost_czk=total_cost,
            total_import_kwh=total_import,
            total_export_kwh=total_export,
            metadata={
                "chmu_sensor_state": chmu_sensor_state,
                "warning_start": warning_start.isoformat(),
            },
        )

        # Store plan
        self._save_plan(plan)
        self._plans_cache[plan_id] = plan

        self._logger.info(
            f"Created weather plan {plan_id}: warning at {warning_start}, "
            f"duration={warning_duration_hours}h"
        )

        return plan

    def activate_plan(self, plan_id: str) -> Plan:
        """Activate plan per BR-2.2.

        Args:
            plan_id: Plan ID to activate

        Returns:
            Activated plan
        """
        # Deactivate current active plan
        if self._active_plan:
            self._logger.info(f"Deactivating current plan {self._active_plan.plan_id}")
            self._active_plan.status = PlanStatus.DEACTIVATED
            self._save_plan(self._active_plan)

        # Load and activate new plan
        plan = self.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")

        plan.status = PlanStatus.ACTIVE
        self._save_plan(plan)
        self._active_plan = plan

        self._logger.info(f"Activated plan {plan_id} ({plan.plan_type.value})")

        return plan

    def deactivate_plan(self, plan_id: str) -> Plan:
        """Deactivate plan per BR-2.2.

        Args:
            plan_id: Plan ID to deactivate

        Returns:
            Deactivated plan
        """
        plan = self.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")

        plan.status = PlanStatus.DEACTIVATED
        self._save_plan(plan)

        if self._active_plan and self._active_plan.plan_id == plan_id:
            self._active_plan = None

        self._logger.info(f"Deactivated plan {plan_id}")

        return plan

    def get_plan(self, plan_id: str) -> Optional[Plan]:
        """Get plan by ID per BR-2.5.

        Args:
            plan_id: Plan ID

        Returns:
            Plan or None if not found
        """
        # Check cache first
        if plan_id in self._plans_cache:
            return self._plans_cache[plan_id]

        # Load from storage
        plan = self._load_plan(plan_id)
        if plan:
            self._plans_cache[plan_id] = plan

        return plan

    def get_active_plan(self) -> Optional[Plan]:
        """Get currently active plan per BR-2.5.

        Returns:
            Active plan or None
        """
        return self._active_plan

    def list_plans(
        self,
        plan_type: Optional[PlanType] = None,
        status: Optional[PlanStatus] = None,
        limit: int = 100,
    ) -> List[Plan]:
        """List plans with optional filters per BR-2.5.

        Args:
            plan_type: Filter by plan type (optional)
            status: Filter by status (optional)
            limit: Maximum number of plans to return

        Returns:
            List of plans
        """
        plans = []

        # List all plan files
        for plan_file in self.storage_path.glob(f"{self.box_id}_plan_*.json"):
            try:
                plan = self._load_plan_from_file(plan_file)

                # Apply filters
                if plan_type and plan.plan_type != plan_type:
                    continue
                if status and plan.status != status:
                    continue

                plans.append(plan)

                if len(plans) >= limit:
                    break
            except Exception as e:
                self._logger.error(f"Error loading plan {plan_file}: {e}")

        # Sort by created_at (newest first)
        plans.sort(key=lambda p: p.created_at, reverse=True)

        return plans

    def _serialize_interval(self, interval: IntervalSimulation) -> Dict[str, Any]:
        """Serialize IntervalSimulation to dict."""
        return {
            "timestamp": interval.timestamp.isoformat(),
            "mode": interval.mode,
            "solar_kwh": interval.solar_kwh,
            "consumption_kwh": interval.consumption_kwh,
            "battery_charge_kwh": interval.battery_charge_kwh,
            "battery_discharge_kwh": interval.battery_discharge_kwh,
            "grid_import_kwh": interval.grid_import_kwh,
            "grid_export_kwh": interval.grid_export_kwh,
            "boiler_kwh": interval.boiler_kwh,
            "battery_before_kwh": interval.battery_before_kwh,
            "battery_after_kwh": interval.battery_after_kwh,
            "spot_price_czk": interval.spot_price_czk,
            "export_price_czk": interval.export_price_czk,
            "tariff_distribution_czk": interval.tariff_distribution_czk,
            "interval_cost_czk": interval.interval_cost_czk,
            "is_deficit": interval.is_deficit,
            "is_clamped": interval.is_clamped,
        }

    def _save_plan(self, plan: Plan) -> None:
        """Save plan to storage per BR-2.3."""
        filename = f"{self.box_id}_plan_{plan.plan_id}.json"
        filepath = self.storage_path / filename

        try:
            with open(filepath, "w") as f:
                json.dump(plan.to_dict(), f, indent=2)
            self._logger.debug(f"Saved plan {plan.plan_id} to {filepath}")
        except Exception as e:
            self._logger.error(f"Error saving plan {plan.plan_id}: {e}")
            raise

    def _load_plan(self, plan_id: str) -> Optional[Plan]:
        """Load plan from storage per BR-2.3."""
        filename = f"{self.box_id}_plan_{plan_id}.json"
        filepath = self.storage_path / filename

        if not filepath.exists():
            return None

        return self._load_plan_from_file(filepath)

    def _load_plan_from_file(self, filepath: Path) -> Plan:
        """Load plan from file."""
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
            return Plan.from_dict(data)
        except Exception as e:
            self._logger.error(f"Error loading plan from {filepath}: {e}")
            raise
