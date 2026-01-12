"""Hybrid Strategy - optimizes mode selection for cost/efficiency.

This strategy selects the optimal CBB mode for each interval based on:
- Spot prices (buy and export)
- Solar forecast
- Consumption forecast
- Battery state
- Balancing constraints

The optimizer uses a forward simulation approach with scoring.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from ..config import HybridConfig, SimulatorConfig
from ..physics import IntervalSimulator
from ..types import CBB_MODE_HOME_I, CBB_MODE_HOME_UPS, CBB_MODE_NAMES, SpotPrice
from . import hybrid_planning as hybrid_planning_module
from . import hybrid_scoring as hybrid_scoring_module
from .balancing import StrategyBalancingPlan

_LOGGER = logging.getLogger(__name__)

HOME_III_LABEL = "HOME III"
HOME_UPS_LABEL = "HOME UPS"


@dataclass
class IntervalDecision:
    """Decision for a single interval."""

    mode: int  # Selected mode (0-3)
    mode_name: str  # Human readable name
    reason: str  # Why this mode was selected

    # Simulation result for this mode
    battery_end: float  # Battery at end of interval
    grid_import: float  # kWh imported
    grid_export: float  # kWh exported
    cost_czk: float  # Net cost

    # Alternatives considered
    scores: Dict[int, float] = field(default_factory=dict)  # mode -> score

    # Flags
    is_balancing: bool = False
    is_holding: bool = False
    is_negative_price: bool = False


@dataclass
class HybridResult:
    """Result of hybrid optimization."""

    # Decisions for each interval
    decisions: List[IntervalDecision]

    # Aggregated metrics
    total_cost_czk: float
    baseline_cost_czk: float  # Cost with HOME I only
    savings_czk: float

    total_grid_import_kwh: float
    total_grid_export_kwh: float
    final_battery_kwh: float

    # Mode distribution
    mode_counts: Dict[str, int]
    ups_intervals: int

    # Timing
    calculation_time_ms: float

    # Flags
    negative_prices_detected: bool
    balancing_applied: bool
    infeasible: bool = False
    infeasible_reason: Optional[str] = None

    @property
    def modes(self) -> List[int]:
        """List of modes for each interval."""
        return [d.mode for d in self.decisions]

    @property
    def savings_percent(self) -> float:
        """Savings as percentage of baseline."""
        if self.baseline_cost_czk <= 0:
            return 0.0
        return (self.savings_czk / self.baseline_cost_czk) * 100.0


class HybridStrategy:
    """Strategy for optimizing mode selection across intervals.

    This is the main optimization layer that decides which CBB mode
    to use for each 15-minute interval.

    Algorithm (Backward Propagation):
    1. First pass: Simulate with HOME I only to find where battery drops below planning_min
    2. Backward propagation: For each problem interval, find cheapest unused interval BEFORE it
    3. Mark that interval for charging (HOME UPS)
    4. Repeat until no interval drops below planning_min
    5. Final pass: Generate decisions with marked charging intervals

    This ensures:
    - Battery never drops below planning_min
    - Charging happens at cheapest possible times
    - Forward-looking optimization without complex ROI calculations

    Example:
        config = HybridConfig(planning_min_percent=20.0, target_percent=80.0)
        simulator_config = SimulatorConfig(max_capacity_kwh=15.36)

        strategy = HybridStrategy(config, simulator_config)

        result = strategy.optimize(
            initial_battery_kwh=10.0,
            spot_prices=[...],
            solar_forecast=[...],
            consumption_forecast=[...],
            balancing_plan=None,
        )

        print(f"Modes: {result.modes}")
        print(f"Savings: {result.savings_czk:.2f} CZK")
    """

    # Max iterations for backward propagation to prevent infinite loops
    MAX_ITERATIONS = 100

    # Charge rate per interval (kWh) - how much we can charge in 15 min
    CHARGE_PER_INTERVAL = 1.25  # ~5kW * 0.25h

    # Legacy constants for compatibility
    LOOKAHEAD_INTERVALS = 24  # Look 6 hours ahead (24 * 15min)
    MIN_PRICE_SPREAD_PERCENT = 15.0  # Min price spread to justify charging (%)
    MIN_UPS_PRICE_BAND_PCT = 0.08  # Minimum price band for UPS continuity (8%)

    def __init__(
        self,
        config: HybridConfig,
        simulator_config: SimulatorConfig,
    ) -> None:
        """Initialize strategy.

        Args:
            config: Hybrid optimization configuration
            simulator_config: Simulator configuration
        """
        self.config = config
        self.sim_config = simulator_config
        self.simulator = IntervalSimulator(simulator_config)

        # Cache derived values
        self._planning_min = config.planning_min_kwh(simulator_config.max_capacity_kwh)
        self._target = config.target_kwh(simulator_config.max_capacity_kwh)
        self._max = simulator_config.max_capacity_kwh

    def optimize(
        self,
        initial_battery_kwh: float,
        spot_prices: List[SpotPrice],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        balancing_plan: Optional[StrategyBalancingPlan] = None,
        export_prices: Optional[List[float]] = None,
    ) -> HybridResult:
        """Optimize mode selection using backward propagation algorithm.

        Algorithm:
        1. First pass: Simulate with HOME I to find intervals where battery < planning_min
        2. Backward propagation: For each problem, find cheapest unused interval BEFORE it
        3. Mark that interval for charging (HOME UPS)
        4. Repeat until no interval drops below planning_min
        5. Final pass: Generate decisions with marked charging intervals

        Args:
            initial_battery_kwh: Starting battery level
            spot_prices: Spot price for each interval
            solar_forecast: Solar production per interval (kWh)
            consumption_forecast: Load per interval (kWh)
            balancing_plan: Optional balancing constraints
            export_prices: Optional explicit export prices (default: 85% of spot)

        Returns:
            HybridResult with optimized modes and metrics
        """
        import time

        start_time = time.time()

        n_intervals = len(spot_prices)

        # Extract prices
        prices = self._extract_prices(spot_prices)
        exports = export_prices or [p * 0.85 for p in prices]

        # Detect negative prices
        negative_prices = [i for i, p in enumerate(prices) if p < 0]
        has_negative = len(negative_prices) > 0

        # Step 1: Plan charging intervals using backward propagation
        (
            charging_intervals,
            infeasible_reason,
            price_band_intervals,
        ) = self._plan_charging_intervals(
            initial_battery_kwh=initial_battery_kwh,
            prices=prices,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            balancing_plan=balancing_plan,
            negative_price_intervals=negative_prices,
        )
        infeasible = infeasible_reason is not None

        _LOGGER.debug(
            "Backward propagation planned %d charging intervals: %s",
            len(charging_intervals),
            sorted(charging_intervals)[:10],
        )

        # Step 2: Final pass - generate decisions with planned charging.
        decisions = self._build_decisions(
            n_intervals=n_intervals,
            initial_battery_kwh=initial_battery_kwh,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            prices=prices,
            exports=exports,
            charging_intervals=charging_intervals,
            price_band_intervals=price_band_intervals,
            balancing_plan=balancing_plan,
        )

        # Apply smoothing to avoid rapid mode changes (recompute outputs after changes).
        smoothed = self._apply_smoothing(
            decisions=decisions,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            prices=prices,
            export_prices=exports,
        )

        if smoothed is not decisions:
            decisions = smoothed

        battery, totals, mode_counts = self._recompute_totals(
            decisions=decisions,
            initial_battery_kwh=initial_battery_kwh,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            prices=prices,
            exports=exports,
        )

        # Calculate baseline (HOME I only)
        baseline_cost = self._calculate_baseline_cost(
            initial_battery_kwh, solar_forecast, consumption_forecast, prices, exports
        )

        calc_time = (time.time() - start_time) * 1000

        return HybridResult(
            decisions=decisions,
            total_cost_czk=totals["cost"],
            baseline_cost_czk=baseline_cost,
            savings_czk=baseline_cost - totals["cost"],
            total_grid_import_kwh=totals["import"],
            total_grid_export_kwh=totals["export"],
            final_battery_kwh=battery,
            mode_counts=mode_counts,
            ups_intervals=mode_counts[HOME_UPS_LABEL],
            calculation_time_ms=calc_time,
            negative_prices_detected=has_negative,
            balancing_applied=balancing_plan is not None and balancing_plan.is_active,
            infeasible=infeasible,
            infeasible_reason=infeasible_reason,
        )

    def _build_decisions(
        self,
        *,
        n_intervals: int,
        initial_battery_kwh: float,
        solar_forecast: List[float],
        consumption_forecast: List[float],
        prices: List[float],
        exports: List[float],
        charging_intervals: set[int],
        price_band_intervals: set[int],
        balancing_plan: Optional[StrategyBalancingPlan],
    ) -> List[IntervalDecision]:
        decisions: List[IntervalDecision] = []
        battery = initial_battery_kwh
        for i in range(n_intervals):
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            load = consumption_forecast[i] if i < len(consumption_forecast) else 0.125
            price = prices[i]
            export_price = exports[i]

            is_balancing = balancing_plan and i in balancing_plan.charging_intervals
            is_holding = balancing_plan and i in balancing_plan.holding_intervals
            is_charging = i in charging_intervals
            is_price_band = i in price_band_intervals
            is_negative = price < 0
            override_mode = (
                balancing_plan.mode_overrides.get(i)
                if balancing_plan and balancing_plan.mode_overrides
                else None
            )

            mode, reason = self._determine_mode(
                battery=battery,
                solar=solar,
                load=load,
                price=price,
                export_price=export_price,
                is_balancing=bool(is_balancing),
                is_holding=bool(is_holding),
                is_charging=is_charging,
                is_price_band=is_price_band,
                is_negative=is_negative,
                override_mode=override_mode,
            )

            result = self.simulator.simulate(
                battery_start=battery,
                mode=mode,
                solar_kwh=solar,
                load_kwh=load,
                force_charge=(mode == CBB_MODE_HOME_UPS)
                and (is_balancing or is_charging),
            )
            cost = self.simulator.calculate_cost(result, price, export_price)

            decisions.append(
                IntervalDecision(
                    mode=mode,
                    mode_name=CBB_MODE_NAMES.get(mode, "UNKNOWN"),
                    reason=reason,
                    battery_end=result.battery_end,
                    grid_import=result.grid_import,
                    grid_export=result.grid_export,
                    cost_czk=cost,
                    is_balancing=is_balancing,
                    is_holding=is_holding,
                    is_negative_price=is_negative,
                )
            )

            battery = result.battery_end

        return decisions

    def _recompute_totals(
        self,
        *,
        decisions: List[IntervalDecision],
        initial_battery_kwh: float,
        solar_forecast: List[float],
        consumption_forecast: List[float],
        prices: List[float],
        exports: List[float],
    ) -> tuple[float, Dict[str, float], Dict[str, int]]:
        totals = {"cost": 0.0, "import": 0.0, "export": 0.0}
        mode_counts = {
            "HOME I": 0,
            "HOME II": 0,
            HOME_III_LABEL: 0,
            HOME_UPS_LABEL: 0,
        }
        battery = initial_battery_kwh
        for i, decision in enumerate(decisions):
            battery = self._recompute_decision_metrics(
                decision,
                index=i,
                battery=battery,
                solar_forecast=solar_forecast,
                consumption_forecast=consumption_forecast,
                prices=prices,
                exports=exports,
                totals=totals,
                mode_counts=mode_counts,
            )
        return battery, totals, mode_counts

    def _determine_mode(
        self,
        *,
        battery: float,
        solar: float,
        load: float,
        price: float,
        export_price: float,
        is_balancing: bool,
        is_holding: bool,
        is_charging: bool,
        is_price_band: bool,
        is_negative: bool,
        override_mode: Optional[int],
    ) -> tuple[int, str]:
        if override_mode is not None:
            if is_holding:
                return override_mode, "holding_period"
            if is_balancing:
                return override_mode, "balancing_charge"
            return override_mode, "balancing_override"

        if is_holding:
            return CBB_MODE_HOME_UPS, "holding_period"
        if is_balancing:
            return CBB_MODE_HOME_UPS, "balancing_charge"
        if is_negative:
            return self._handle_negative_price(
                battery, solar, load, price, export_price
            )
        if is_charging:
            if is_price_band:
                return CBB_MODE_HOME_UPS, "price_band_hold"
            return CBB_MODE_HOME_UPS, f"planned_charge_{price:.2f}CZK"
        return CBB_MODE_HOME_I, "default_discharge"

    def _recompute_decision_metrics(
        self,
        decision: IntervalDecision,
        *,
        index: int,
        battery: float,
        solar_forecast: List[float],
        consumption_forecast: List[float],
        prices: List[float],
        exports: List[float],
        totals: Dict[str, float],
        mode_counts: Dict[str, int],
    ) -> float:
        solar = solar_forecast[index] if index < len(solar_forecast) else 0.0
        load = (
            consumption_forecast[index]
            if index < len(consumption_forecast)
            else 0.125
        )
        price = prices[index]
        export_price = exports[index]

        result = self.simulator.simulate(
            battery_start=battery,
            mode=decision.mode,
            solar_kwh=solar,
            load_kwh=load,
            force_charge=(decision.mode == CBB_MODE_HOME_UPS)
            and (decision.is_balancing or decision.is_holding),
        )
        cost = self.simulator.calculate_cost(result, price, export_price)

        decision.battery_end = result.battery_end
        decision.grid_import = result.grid_import
        decision.grid_export = result.grid_export
        decision.cost_czk = cost

        totals["cost"] += cost
        totals["import"] += result.grid_import
        totals["export"] += result.grid_export
        mode_counts[CBB_MODE_NAMES.get(decision.mode, HOME_III_LABEL)] += 1

        return result.battery_end

    def _plan_charging_intervals(
        self,
        initial_battery_kwh: float,
        prices: List[float],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        balancing_plan: Optional[StrategyBalancingPlan] = None,
        negative_price_intervals: Optional[List[int]] = None,
    ) -> Tuple[set[int], Optional[str], set[int]]:
        """Proxy to planning helpers."""
        return hybrid_planning_module.plan_charging_intervals(
            self,
            initial_battery_kwh=initial_battery_kwh,
            prices=prices,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            balancing_plan=balancing_plan,
            negative_price_intervals=negative_price_intervals,
        )

    def _get_price_band_delta_pct(self) -> float:
        """Proxy to planning helpers."""
        return hybrid_planning_module.get_price_band_delta_pct(self)

    def _extend_ups_blocks_by_price_band(
        self,
        *,
        charging_intervals: set[int],
        prices: List[float],
        blocked_indices: set[int],
    ) -> set[int]:
        """Proxy to planning helpers."""
        return hybrid_planning_module.extend_ups_blocks_by_price_band(
            self,
            charging_intervals=charging_intervals,
            prices=prices,
            blocked_indices=blocked_indices,
        )

    def _simulate_trajectory(
        self,
        initial_battery_kwh: float,
        solar_forecast: List[float],
        consumption_forecast: List[float],
        charging_intervals: set[int],
    ) -> List[float]:
        """Proxy to planning helpers."""
        return hybrid_planning_module.simulate_trajectory(
            self,
            initial_battery_kwh=initial_battery_kwh,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            charging_intervals=charging_intervals,
        )

    def _extract_prices(self, spot_prices: List[SpotPrice]) -> List[float]:
        """Proxy to scoring helpers."""
        return hybrid_scoring_module.extract_prices(spot_prices)

    def _analyze_future_prices(
        self,
        prices: List[float],
        export_prices: List[float],
        consumption_forecast: List[float],
    ) -> Dict[int, Dict[str, float]]:
        """Proxy to scoring helpers."""
        return hybrid_scoring_module.analyze_future_prices(
            self,
            prices=prices,
            export_prices=export_prices,
            consumption_forecast=consumption_forecast,
        )

    def _select_best_mode(
        self,
        battery: float,
        solar: float,
        load: float,
        price: float,
        export_price: float,
        cheap_threshold: float,
        expensive_threshold: float,
        very_cheap: float,
        future_info: Optional[Dict[str, float]] = None,
    ) -> Tuple[int, str, Dict[int, float]]:
        """Proxy to scoring helpers."""
        return hybrid_scoring_module.select_best_mode(
            self,
            battery=battery,
            solar=solar,
            load=load,
            price=price,
            export_price=export_price,
            cheap_threshold=cheap_threshold,
            expensive_threshold=expensive_threshold,
            very_cheap=very_cheap,
            future_info=future_info,
        )

    def _score_mode(
        self,
        mode: int,
        battery: float,
        solar: float,
        load: float,
        price: float,
        export_price: float,
        cheap_threshold: float,
        expected_saving: float = 0.0,
        is_relatively_cheap: bool = False,
    ) -> float:
        """Proxy to scoring helpers."""
        return hybrid_scoring_module.score_mode(
            self,
            mode=mode,
            battery=battery,
            solar=solar,
            load=load,
            price=price,
            export_price=export_price,
            cheap_threshold=cheap_threshold,
            expected_saving=expected_saving,
            is_relatively_cheap=is_relatively_cheap,
        )

    def _handle_negative_price(
        self,
        battery: float,
        solar: float,
        load: float,
        price: float,
        export_price: float,
    ) -> Tuple[int, str]:
        """Proxy to scoring helpers."""
        return hybrid_scoring_module.handle_negative_price(
            self,
            battery=battery,
            solar=solar,
            load=load,
            price=price,
            export_price=export_price,
        )

    def _apply_smoothing(
        self,
        decisions: List[IntervalDecision],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        prices: List[float],
        export_prices: List[float],
    ) -> List[IntervalDecision]:
        """Proxy to scoring helpers."""
        return hybrid_scoring_module.apply_smoothing(
            self,
            decisions=decisions,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            prices=prices,
            export_prices=export_prices,
        )

    def _calculate_baseline_cost(
        self,
        initial_battery: float,
        solar_forecast: List[float],
        consumption_forecast: List[float],
        prices: List[float],
        export_prices: List[float],
    ) -> float:
        """Proxy to scoring helpers."""
        return hybrid_scoring_module.calculate_baseline_cost(
            self,
            initial_battery=initial_battery,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            prices=prices,
            export_prices=export_prices,
        )


# =============================================================================
# Utility functions
# =============================================================================


def calculate_optimal_mode(
    battery: float,
    solar: float,
    load: float,
    price: float,
    export_price: float,
    config: HybridConfig,
    sim_config: SimulatorConfig,
) -> Tuple[int, str]:
    """Quick calculation of optimal mode for a single interval.

    Useful for real-time decisions without full optimization.

    Args:
        battery: Current battery level (kWh)
        solar: Solar production (kWh)
        load: Consumption (kWh)
        price: Spot price (CZK/kWh)
        export_price: Export price (CZK/kWh)
        config: Hybrid configuration
        sim_config: Simulator configuration

    Returns:
        Tuple of (mode, reason)
    """
    strategy = HybridStrategy(config, sim_config)

    # Use simplified scoring
    avg_price = 2.0  # Assume average
    cheap = avg_price * 0.75
    expensive = avg_price * 1.25
    very_cheap = avg_price * 0.5

    mode, reason, _ = strategy._select_best_mode(
        battery=battery,
        solar=solar,
        load=load,
        price=price,
        export_price=export_price,
        cheap_threshold=cheap,
        expensive_threshold=expensive,
        very_cheap=very_cheap,
    )

    return mode, reason
