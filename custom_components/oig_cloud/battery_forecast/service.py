"""Battery Forecast Service - top-level orchestrator.

This service coordinates:
1. Balancing strategy (if enabled)
2. Hybrid optimization strategy
3. Physics simulation

It provides a clean API for Home Assistant integration with
backward-compatible output format.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import logging

from .config import (
    ForecastServiceConfig,
    SimulatorConfig,
    HybridConfig,
    BalancingConfig,
)
from .physics import IntervalSimulator
from .strategy import BalancingStrategy, HybridStrategy, BalancingPlan, HybridResult
from .types import (
    CBB_MODE_NAMES,
    TimelineInterval,
    OptimizationResult,
    SpotPrice,
)


_LOGGER = logging.getLogger(__name__)


@dataclass
class ForecastInput:
    """Input data for forecast calculation."""

    # Current state
    current_battery_kwh: float
    current_time: datetime

    # Forecasts (per interval)
    spot_prices: List[SpotPrice]
    solar_forecast: List[float]
    consumption_forecast: List[float]

    # Optional export prices (default: 85% of spot)
    export_prices: Optional[List[float]] = None

    # Balancing state
    last_balancing: Optional[datetime] = None

    # Timestamps for each interval
    interval_timestamps: Optional[List[datetime]] = None


@dataclass
class ForecastOutput:
    """Output of forecast calculation.

    Compatible with existing frontend API.
    """

    # Timeline (main output for frontend)
    timeline: List[TimelineInterval]

    # Optimization result (for detailed view)
    optimization: OptimizationResult

    # Balancing info (if applicable)
    balancing_plan: Optional[Dict[str, Any]] = None

    # Summary metrics
    total_cost_czk: float = 0.0
    savings_czk: float = 0.0
    final_battery_kwh: float = 0.0
    final_battery_pct: float = 0.0

    # Mode distribution
    mode_counts: Dict[str, int] = field(default_factory=dict)

    # Timestamps
    calculated_at: str = ""
    valid_from: str = ""
    valid_until: str = ""


class BatteryForecastService:
    """Main service for battery forecast and optimization.

    This is the top-level API that coordinates all layers:
    1. BalancingStrategy - determines if/when balancing is needed
    2. HybridStrategy - optimizes mode selection
    3. IntervalSimulator - simulates physics

    Example:
        config = ForecastServiceConfig.from_ha_config(ha_config, box_id)
        service = BatteryForecastService(config)

        result = service.calculate_forecast(
            current_battery_kwh=10.0,
            current_time=datetime.now(),
            spot_prices=[...],
            solar_forecast=[...],
            consumption_forecast=[...],
        )

        # Use result.timeline for frontend
        # Use result.optimization for detailed metrics
    """

    def __init__(self, config: ForecastServiceConfig) -> None:
        """Initialize service with configuration.

        Args:
            config: Complete service configuration
        """
        self.config = config

        # Initialize layers
        self.simulator = IntervalSimulator(config.simulator)
        self.balancing_strategy = BalancingStrategy(
            config.balancing,
            config.simulator,
        )
        self.hybrid_strategy = HybridStrategy(
            config.hybrid,
            config.simulator,
        )

        _LOGGER.debug(
            "BatteryForecastService initialized for box %s",
            config.box_id,
        )

    def calculate_forecast(
        self,
        current_battery_kwh: float,
        current_time: datetime,
        spot_prices: List[SpotPrice],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        export_prices: Optional[List[float]] = None,
        last_balancing: Optional[datetime] = None,
    ) -> ForecastOutput:
        """Calculate battery forecast with optimization.

        Args:
            current_battery_kwh: Current battery level
            current_time: Current time
            spot_prices: Spot prices for planning horizon
            solar_forecast: Solar forecast (kWh per interval)
            consumption_forecast: Consumption forecast (kWh per interval)
            export_prices: Optional export prices (default: 85% of spot)
            last_balancing: When battery was last at 100%

        Returns:
            ForecastOutput with timeline and optimization results
        """
        _LOGGER.debug(
            "Calculating forecast: battery=%.2f kWh, %d intervals",
            current_battery_kwh,
            len(spot_prices),
        )

        n_intervals = len(spot_prices)
        interval_minutes = self.config.simulator.interval_minutes

        # Generate timestamps
        timestamps = [
            current_time + timedelta(minutes=i * interval_minutes)
            for i in range(n_intervals)
        ]

        # Step 1: Calculate balancing plan (if enabled)
        balancing_plan: Optional[BalancingPlan] = None
        if self.config.balancing.enabled:
            balancing_result = self.balancing_strategy.plan(
                current_battery_kwh=current_battery_kwh,
                last_balancing=last_balancing,
                spot_prices=spot_prices,
                solar_forecast=solar_forecast,
                now=current_time,
                interval_timestamps=timestamps,
            )
            if balancing_result.should_balance:
                balancing_plan = balancing_result.plan
                _LOGGER.debug(
                    "Balancing planned: deadline=%s, charging=%d intervals",
                    balancing_plan.deadline if balancing_plan else None,
                    len(balancing_plan.charging_intervals) if balancing_plan else 0,
                )

        # Step 2: Run hybrid optimization
        hybrid_result = self.hybrid_strategy.optimize(
            initial_battery_kwh=current_battery_kwh,
            spot_prices=spot_prices,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            balancing_plan=balancing_plan,
            export_prices=export_prices,
        )

        _LOGGER.debug(
            "Optimization complete: cost=%.2f CZK, savings=%.2f CZK",
            hybrid_result.total_cost_czk,
            hybrid_result.savings_czk,
        )

        # Step 3: Build output in legacy format
        timeline = self._build_timeline(
            decisions=hybrid_result.decisions,
            timestamps=timestamps,
            spot_prices=spot_prices,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            balancing_plan=balancing_plan,
            current_battery_kwh=current_battery_kwh,
        )

        optimization = self._build_optimization_result(
            hybrid_result=hybrid_result,
            balancing_plan=balancing_plan,
        )

        # Build balancing info for frontend
        balancing_info: Optional[Dict[str, Any]] = None
        if balancing_plan:
            balancing_info = {
                "active": True,
                "reason": balancing_plan.reason,
                "deadline": balancing_plan.deadline.isoformat(),
                "holding_start": balancing_plan.holding_start.isoformat(),
                "holding_end": balancing_plan.holding_end.isoformat(),
                "charging_intervals_count": len(balancing_plan.charging_intervals),
                "estimated_cost_czk": balancing_plan.estimated_cost_czk,
            }

        return ForecastOutput(
            timeline=timeline,
            optimization=optimization,
            balancing_plan=balancing_info,
            total_cost_czk=hybrid_result.total_cost_czk,
            savings_czk=hybrid_result.savings_czk,
            final_battery_kwh=hybrid_result.final_battery_kwh,
            final_battery_pct=self._kwh_to_pct(hybrid_result.final_battery_kwh),
            mode_counts=hybrid_result.mode_counts,
            calculated_at=current_time.isoformat(),
            valid_from=timestamps[0].isoformat() if timestamps else "",
            valid_until=timestamps[-1].isoformat() if timestamps else "",
        )

    def _build_timeline(
        self,
        decisions: List[Any],  # IntervalDecision
        timestamps: List[datetime],
        spot_prices: List[SpotPrice],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        balancing_plan: Optional[BalancingPlan],
        current_battery_kwh: float,
    ) -> List[TimelineInterval]:
        """Build timeline in legacy format for frontend."""
        _ = balancing_plan
        timeline: List[TimelineInterval] = []
        prev_mode: Optional[int] = None
        battery = current_battery_kwh

        for i, decision in enumerate(decisions):
            timestamp = timestamps[i] if i < len(timestamps) else None
            spot = spot_prices[i] if i < len(spot_prices) else {}
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            load = consumption_forecast[i] if i < len(consumption_forecast) else 0.125

            # Extract price
            if isinstance(spot, dict):
                price = float(spot.get("price", 0.0))
            else:
                price = float(spot)

            interval: TimelineInterval = {
                "timestamp": timestamp.isoformat() if timestamp else "",
                "battery_kwh": battery,
                "battery_pct": self._kwh_to_pct(battery),
                "mode": decision.mode,
                "mode_name": CBB_MODE_NAMES.get(decision.mode, "UNKNOWN"),
                "solar_kwh": solar,
                "consumption_kwh": load,
                "grid_import_kwh": decision.grid_import,
                "grid_export_kwh": decision.grid_export,
                "spot_price": price,
                "cost_czk": decision.cost_czk,
                "reason": decision.reason,
                "is_mode_change": decision.mode != prev_mode,
                "is_charging": decision.mode == 3,  # HOME UPS
                "is_balancing": decision.is_balancing,
                "is_holding": decision.is_holding,
            }

            timeline.append(interval)
            battery = decision.battery_end
            prev_mode = decision.mode

        return timeline

    def _build_optimization_result(
        self,
        hybrid_result: HybridResult,
        balancing_plan: Optional[BalancingPlan],
    ) -> OptimizationResult:
        """Build optimization result in legacy format."""
        return OptimizationResult(
            modes=[d.mode for d in hybrid_result.decisions],
            modes_distribution=hybrid_result.mode_counts,
            total_cost_czk=hybrid_result.total_cost_czk,
            baseline_cost_czk=hybrid_result.baseline_cost_czk,
            total_grid_import_kwh=hybrid_result.total_grid_import_kwh,
            total_grid_export_kwh=hybrid_result.total_grid_export_kwh,
            total_solar_kwh=0.0,  # NOTE: calculate (legacy placeholder)
            ups_intervals_count=hybrid_result.ups_intervals,
            charging_kwh=0.0,  # NOTE: calculate (legacy placeholder)
            final_battery_kwh=hybrid_result.final_battery_kwh,
            is_balancing_mode=balancing_plan is not None,
            balancing_deadline=(
                balancing_plan.deadline.isoformat() if balancing_plan else None
            ),
            balancing_holding_start=(
                balancing_plan.holding_start.isoformat() if balancing_plan else None
            ),
            balancing_holding_end=(
                balancing_plan.holding_end.isoformat() if balancing_plan else None
            ),
            calculation_time_ms=hybrid_result.calculation_time_ms,
            negative_price_detected=hybrid_result.negative_prices_detected,
            negative_price_start_idx=0,
            negative_price_end_idx=0,
            negative_price_excess_solar_kwh=0.0,
            negative_price_curtailment_kwh=0.0,
            negative_price_actions=[],
        )

    def _kwh_to_pct(self, kwh: float) -> float:
        """Convert kWh to percentage."""
        return (kwh / self.config.simulator.max_capacity_kwh) * 100.0

    def get_current_mode_recommendation(
        self,
        current_battery_kwh: float,
        current_solar_kwh: float,
        current_load_kwh: float,
        current_price: float,
        current_export_price: float,
    ) -> Dict[str, Any]:
        """Get real-time mode recommendation.

        Useful for immediate decisions without full forecast.

        Args:
            current_battery_kwh: Current battery level
            current_solar_kwh: Current solar production
            current_load_kwh: Current load
            current_price: Current spot price
            current_export_price: Current export price

        Returns:
            Dict with mode recommendation and reason
        """
        from .strategy.hybrid import calculate_optimal_mode

        mode, reason = calculate_optimal_mode(
            battery=current_battery_kwh,
            solar=current_solar_kwh,
            load=current_load_kwh,
            price=current_price,
            export_price=current_export_price,
            config=self.config.hybrid,
            sim_config=self.config.simulator,
        )

        return {
            "mode": mode,
            "mode_name": CBB_MODE_NAMES.get(mode, "UNKNOWN"),
            "reason": reason,
            "battery_kwh": current_battery_kwh,
            "battery_pct": self._kwh_to_pct(current_battery_kwh),
        }


# =============================================================================
# Factory functions
# =============================================================================


def create_service(
    box_id: str,
    max_capacity_kwh: float = 15.36,
    min_capacity_percent: float = 20.0,
    target_percent: float = 80.0,
    balancing_enabled: bool = True,
    balancing_interval_days: int = 7,
) -> BatteryForecastService:
    """Create BatteryForecastService with common parameters.

    Args:
        box_id: Device identifier
        max_capacity_kwh: Maximum battery capacity
        min_capacity_percent: Planning minimum SoC %
        target_percent: Target SoC %
        balancing_enabled: Enable balancing
        balancing_interval_days: Days between balancing

    Returns:
        Configured BatteryForecastService
    """
    config = ForecastServiceConfig(
        simulator=SimulatorConfig(
            max_capacity_kwh=max_capacity_kwh,
            min_capacity_kwh=max_capacity_kwh * 0.2,  # HW minimum
        ),
        hybrid=HybridConfig(
            planning_min_percent=min_capacity_percent,
            target_percent=target_percent,
        ),
        balancing=BalancingConfig(
            enabled=balancing_enabled,
            interval_days=balancing_interval_days,
        ),
        box_id=box_id,
    )

    return BatteryForecastService(config)


def create_service_from_ha(
    ha_config: Dict[str, Any],
    box_id: str,
) -> BatteryForecastService:
    """Create service from Home Assistant config entry.

    Args:
        ha_config: Config entry data
        box_id: Device box ID

    Returns:
        Configured BatteryForecastService
    """
    config = ForecastServiceConfig.from_ha_config(ha_config, box_id)
    return BatteryForecastService(config)
