"""
Battery Forecast Sensor Orchestrator.

Simplified version with single optimization algorithm (HybridOptimizer).
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from .types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
    DEFAULT_CHARGE_RATE_KW,
    DEFAULT_EFFICIENCY,
    get_mode_name,
)
from .timeline.builder import TimelineBuilder
from .timeline.simulator import SoCSimulator
from .optimizer.hybrid import HybridOptimizer
from .balancing.executor import BalancingExecutor

_LOGGER = logging.getLogger(__name__)


@dataclass
class ForecastConfig:
    """Configuration for battery forecast."""

    max_capacity: float = 15.36  # kWh
    min_capacity: float = 3.0  # kWh (20% of 15.36)
    target_capacity: float = 12.0  # kWh
    charge_rate_kw: float = DEFAULT_CHARGE_RATE_KW
    efficiency: float = DEFAULT_EFFICIENCY

    # Algorithm settings
    use_balancing: bool = True

    # Safety margins
    min_soc_percent: float = 20.0
    max_soc_percent: float = 95.0

    def __post_init__(self) -> None:
        """Calculate derived values."""
        self.min_capacity = self.max_capacity * (self.min_soc_percent / 100.0)
        self.safe_max_capacity = self.max_capacity * (self.max_soc_percent / 100.0)


@dataclass
class ForecastResult:
    """Result of battery forecast calculation."""

    # Main outputs
    modes: List[int] = field(default_factory=list)
    timeline: List[Dict[str, Any]] = field(default_factory=list)
    battery_trajectory: List[float] = field(default_factory=list)

    # Cost analysis
    total_cost_czk: float = 0.0
    baseline_cost_czk: float = 0.0
    savings_czk: float = 0.0

    # Statistics
    ups_intervals: int = 0
    home_i_intervals: int = 0
    home_ii_intervals: int = 0
    home_iii_intervals: int = 0

    # Balancing info
    balancing_applied: bool = False
    balancing_ups_count: int = 0
    balancing_reason: str = ""

    # Metadata
    calculation_time_ms: float = 0.0
    algorithm: str = "HYBRID"
    timestamp: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for HA attributes."""
        return {
            "modes": self.modes,
            "timeline": self.timeline,
            "battery_trajectory": self.battery_trajectory,
            "total_cost_czk": round(self.total_cost_czk, 2),
            "baseline_cost_czk": round(self.baseline_cost_czk, 2),
            "savings_czk": round(self.savings_czk, 2),
            "ups_intervals": self.ups_intervals,
            "home_i_intervals": self.home_i_intervals,
            "home_ii_intervals": self.home_ii_intervals,
            "home_iii_intervals": self.home_iii_intervals,
            "balancing_applied": self.balancing_applied,
            "balancing_ups_count": self.balancing_ups_count,
            "balancing_reason": self.balancing_reason,
            "calculation_time_ms": round(self.calculation_time_ms, 2),
            "algorithm": self.algorithm,
            "timestamp": self.timestamp,
        }


class BatteryForecastOrchestrator:
    """
    Main orchestrator for battery forecast calculation.

    Coordinates:
    - HybridOptimizer for mode optimization
    - BalancingExecutor for balancing plan application
    - SoCSimulator for timeline simulation
    - TimelineBuilder for output generation
    """

    def __init__(self, config: Optional[ForecastConfig] = None) -> None:
        """Initialize orchestrator with configuration."""
        self.config = config or ForecastConfig()

        # Initialize optimizer
        self._optimizer = HybridOptimizer(
            max_capacity=self.config.max_capacity,
            min_capacity=self.config.min_capacity,
            target_capacity=self.config.target_capacity,
            charge_rate_kw=self.config.charge_rate_kw,
            efficiency=self.config.efficiency,
        )

        self._balancing = BalancingExecutor(
            max_capacity=self.config.max_capacity,
            charge_rate_kw=self.config.charge_rate_kw,
        )

        self._simulator = SoCSimulator(
            max_capacity=self.config.max_capacity,
            min_capacity=self.config.min_capacity,
            charge_rate_kw=self.config.charge_rate_kw,
            efficiency=self.config.efficiency,
        )

        self._builder = TimelineBuilder(
            max_capacity=self.config.max_capacity,
            min_capacity=self.config.min_capacity,
        )

        _LOGGER.info(
            "BatteryForecastOrchestrator initialized: max=%.2f, min=%.2f, target=%.2f",
            self.config.max_capacity,
            self.config.min_capacity,
            self.config.target_capacity,
        )

    def calculate_forecast(
        self,
        current_capacity: float,
        spot_prices: List[Dict[str, Any]],
        solar_forecast: List[float],
        load_forecast: List[float],
        balancing_plan: Optional[Dict[str, Any]] = None,
        export_prices: Optional[List[Dict[str, Any]]] = None,
    ) -> ForecastResult:
        """
        Calculate battery forecast.

        This is the main entry point that:
        1. Runs HYBRID optimization
        2. Applies balancing plan if provided
        3. Simulates final timeline
        4. Builds output structure

        Args:
            current_capacity: Current battery capacity in kWh
            spot_prices: List of {time, price} dictionaries (buy prices)
            solar_forecast: Solar production per interval in kWh
            load_forecast: Consumption per interval in kWh
            balancing_plan: Optional balancing plan from balancing module
            export_prices: List of {time, price} dictionaries (sell prices)

        Returns:
            ForecastResult with modes, timeline, and statistics
        """
        start_time = time.time()

        result = ForecastResult(
            timestamp=datetime.now().isoformat(),
            algorithm="HYBRID",
        )

        try:
            # Validate inputs
            if not spot_prices:
                _LOGGER.warning("No spot prices provided, returning empty result")
                return result

            n_intervals = len(spot_prices)

            # Ensure forecasts match spot prices length
            solar_forecast = self._pad_or_trim(solar_forecast, n_intervals)
            load_forecast = self._pad_or_trim(load_forecast, n_intervals)

            _LOGGER.debug(
                "calculate_forecast: battery=%.2f kWh, intervals=%d, balancing=%s",
                current_capacity,
                n_intervals,
                balancing_plan is not None,
            )

            # Step 1: Run optimization
            opt_result = self._optimizer.optimize(
                current_capacity=current_capacity,
                spot_prices=spot_prices,
                solar_forecast=solar_forecast,
                load_forecast=load_forecast,
                balancing_plan=balancing_plan,
                export_prices=export_prices,
            )
            modes = opt_result["modes"]
            result.baseline_cost_czk = opt_result.get("baseline_cost_czk", 0.0)

            # Step 2: Apply balancing plan if provided
            if balancing_plan and self.config.use_balancing:
                bal_result = self._balancing.apply_balancing(
                    modes=modes,
                    spot_prices=spot_prices,
                    current_battery=current_capacity,
                    balancing_plan=balancing_plan,
                )

                if bal_result.total_ups_added > 0:
                    result.balancing_applied = True
                    result.balancing_ups_count = bal_result.total_ups_added
                    result.balancing_reason = balancing_plan.get("reason", "balancing")

                    _LOGGER.info(
                        "Balancing applied: +%d UPS intervals",
                        bal_result.total_ups_added,
                    )

            # Step 3: Simulate final timeline
            battery_trajectory, grid_imports, grid_exports = (
                self._simulator.simulate_timeline(
                    initial_battery=current_capacity,
                    modes=modes,
                    solar_forecast=solar_forecast,
                    consumption_forecast=load_forecast,
                )
            )

            # Step 4: Calculate costs
            total_import_cost = 0.0
            total_export_revenue = 0.0
            effective_export_prices = export_prices if export_prices else spot_prices

            for i in range(len(grid_imports)):
                if i < len(spot_prices):
                    buy_price = spot_prices[i].get("price", 0.0) or 0.0
                    total_import_cost += grid_imports[i] * buy_price

                if i < len(grid_exports) and i < len(effective_export_prices):
                    sell_price = effective_export_prices[i].get("price", 0.0) or 0.0
                    total_export_revenue += grid_exports[i] * sell_price

            total_cost = total_import_cost - total_export_revenue
            result.total_cost_czk = total_cost
            result.savings_czk = result.baseline_cost_czk - total_cost

            # Step 5: Build timeline output
            result.timeline = self._builder.build_timeline(
                spot_prices=spot_prices,
                modes=modes,
                battery_trajectory=battery_trajectory,
                solar_forecast=solar_forecast,
                consumption_forecast=load_forecast,
                grid_imports=grid_imports,
                grid_exports=grid_exports,
                export_prices=export_prices,
            )

            # Step 6: Calculate statistics
            result.modes = modes
            result.battery_trajectory = battery_trajectory
            result.ups_intervals = sum(1 for m in modes if m == CBB_MODE_HOME_UPS)
            result.home_i_intervals = sum(1 for m in modes if m == CBB_MODE_HOME_I)
            result.home_ii_intervals = sum(1 for m in modes if m == 1)
            result.home_iii_intervals = sum(1 for m in modes if m == CBB_MODE_HOME_III)

            _LOGGER.info(
                "Forecast complete: I:%d, II:%d, III:%d, UPS:%d | Cost: %.2f CZK",
                result.home_i_intervals,
                result.home_ii_intervals,
                result.home_iii_intervals,
                result.ups_intervals,
                result.total_cost_czk,
            )

        except Exception as e:
            _LOGGER.exception("Error in calculate_forecast: %s", e)
            result.algorithm = f"ERROR: {str(e)}"

        finally:
            result.calculation_time_ms = (time.time() - start_time) * 1000

        return result

    def get_next_mode_change(
        self,
        result: ForecastResult,
    ) -> Optional[Dict[str, Any]]:
        """Get information about the next mode change."""
        if not result.timeline or len(result.timeline) < 2:
            return None

        current_mode = result.timeline[0].get("mode")

        for i, interval in enumerate(result.timeline[1:], 1):
            if interval.get("mode") != current_mode:
                try:
                    change_time = datetime.fromisoformat(interval.get("timestamp", ""))
                    return {
                        "current_mode": current_mode,
                        "current_mode_name": get_mode_name(current_mode),
                        "next_mode": interval.get("mode"),
                        "next_mode_name": interval.get("mode_name"),
                        "intervals_until": i,
                        "timestamp": change_time.isoformat(),
                    }
                except (ValueError, TypeError):
                    pass

        return None

    def get_charging_summary(
        self,
        result: ForecastResult,
    ) -> Dict[str, Any]:
        """Get summary of charging intervals."""
        if not result.modes:
            return {"error": "No forecast data"}

        charging_intervals = []
        for i, mode in enumerate(result.modes):
            if mode == CBB_MODE_HOME_UPS:
                if i < len(result.timeline):
                    charging_intervals.append(result.timeline[i])

        return {
            "total_ups_intervals": result.ups_intervals,
            "balancing_ups_intervals": result.balancing_ups_count,
            "optimization_ups_intervals": result.ups_intervals - result.balancing_ups_count,
            "charging_intervals": charging_intervals[:10],
        }

    def _pad_or_trim(
        self,
        data: List[float],
        target_len: int,
        default: float = 0.125,
    ) -> List[float]:
        """Pad or trim list to target length."""
        if len(data) >= target_len:
            return data[:target_len]
        return data + [default] * (target_len - len(data))


def calculate_battery_forecast(
    current_capacity: float,
    max_capacity: float,
    min_capacity: float,
    target_capacity: float,
    spot_prices: List[Dict[str, Any]],
    solar_forecast: List[float],
    load_forecast: List[float],
    balancing_plan: Optional[Dict[str, Any]] = None,
    efficiency: float = DEFAULT_EFFICIENCY,
    charge_rate_kw: float = DEFAULT_CHARGE_RATE_KW,
    export_prices: Optional[List[Dict[str, Any]]] = None,
) -> ForecastResult:
    """
    Convenience function to calculate battery forecast.

    Creates an orchestrator with standard configuration and runs forecast.
    """
    config = ForecastConfig(
        max_capacity=max_capacity,
        min_capacity=min_capacity,
        target_capacity=target_capacity,
        charge_rate_kw=charge_rate_kw,
        efficiency=efficiency,
        use_balancing=balancing_plan is not None,
    )

    orchestrator = BatteryForecastOrchestrator(config)

    return orchestrator.calculate_forecast(
        current_capacity=current_capacity,
        spot_prices=spot_prices,
        solar_forecast=solar_forecast,
        load_forecast=load_forecast,
        balancing_plan=balancing_plan,
        export_prices=export_prices,
    )
