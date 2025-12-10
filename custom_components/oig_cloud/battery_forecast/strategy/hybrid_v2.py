"""Hybrid Strategy v2 - Solar-first with economic optimization.

This strategy implements:
1. Solar-first: When solar >= load, price is irrelevant
2. Economic thresholds: P_cheap and P_breakeven based on horizon prices
3. Backward propagation: Ensure battery never drops below planning_min
4. Winter strategy: Keep battery charged around target

Key concepts:
- P_cheap: Average of bottom 30% prices in horizon (nabíjej!)
- P_breakeven: P_cheap × ROUND_TRIP_FACTOR (vybíjej!)
- Between P_cheap and P_breakeven: Take from grid, preserve battery (HOME II)
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Tuple, Set
import logging
import time

from ..config import HybridConfig, SimulatorConfig
from ..physics import IntervalSimulator
from ..types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
    CBB_MODE_NAMES,
    SpotPrice,
)
from .balancing import BalancingPlan


_LOGGER = logging.getLogger(__name__)


# Default efficiency - used only if not provided in config
DEFAULT_BATTERY_EFFICIENCY = 0.838  # 95% inverter * 88.2% battery (measured on output)

# Price percentile thresholds
CHEAP_PERCENTILE = 0.30  # Bottom 30% = cheap
EXPENSIVE_PERCENTILE = 0.70  # Top 30% = expensive


@dataclass
class PriceThresholds:
    """Dynamic price thresholds calculated from horizon prices."""

    p_cheap: float  # Below this = nabíjej
    p_breakeven: float  # Above this = vybíjej
    p_min: float  # Minimum price in horizon
    p_max: float  # Maximum price in horizon
    p_avg: float  # Average price in horizon


@dataclass
class IntervalDecision:
    """Decision for a single interval."""

    mode: int
    mode_name: str
    reason: str
    battery_end: float
    grid_import: float
    grid_export: float
    cost_czk: float
    is_balancing: bool = False
    is_holding: bool = False
    is_negative_price: bool = False
    scores: Dict[int, float] = field(default_factory=dict)


@dataclass
class HybridResult:
    """Result of hybrid optimization."""

    decisions: List[IntervalDecision]
    total_cost_czk: float
    baseline_cost_czk: float
    savings_czk: float
    total_grid_import_kwh: float
    total_grid_export_kwh: float
    final_battery_kwh: float
    mode_counts: Dict[str, int]
    ups_intervals: int
    calculation_time_ms: float
    negative_prices_detected: bool
    balancing_applied: bool
    price_thresholds: Optional[PriceThresholds] = None

    @property
    def modes(self) -> List[int]:
        return [d.mode for d in self.decisions]

    @property
    def savings_percent(self) -> float:
        if self.baseline_cost_czk <= 0:
            return 0.0
        return (self.savings_czk / self.baseline_cost_czk) * 100.0


class HybridStrategy:
    """Solar-first strategy with economic optimization.

    Algorithm:
    1. Calculate price thresholds (P_cheap, P_breakeven) from horizon
    2. For each interval:
       a) If solar >= load → HOME I (solar covers everything)
       b) If solar < load (deficit):
          - P < P_cheap → HOME II (deficit from grid) + maybe HOME UPS if bat < target
          - P_cheap < P < P_breakeven → HOME II (deficit from grid, preserve battery)
          - P > P_breakeven → HOME I (deficit from battery)
    3. Backward propagation: Ensure battery never < planning_min
    """

    MAX_ITERATIONS = 100
    CHARGE_PER_INTERVAL = 1.25  # kWh per 15min interval

    def __init__(
        self,
        config: HybridConfig,
        simulator_config: SimulatorConfig,
    ) -> None:
        self.config = config
        self.sim_config = simulator_config
        self.simulator = IntervalSimulator(simulator_config)

        # Cache derived values
        self._planning_min = config.planning_min_kwh(simulator_config.max_capacity_kwh)
        self._target = config.target_kwh(simulator_config.max_capacity_kwh)
        self._hw_min = simulator_config.min_capacity_kwh
        self._max = simulator_config.max_capacity_kwh
        self._efficiency = DEFAULT_BATTERY_EFFICIENCY  # Will be updated in optimize()

    def optimize(
        self,
        initial_battery_kwh: float,
        spot_prices: List[SpotPrice],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        balancing_plan: Optional[BalancingPlan] = None,
        export_prices: Optional[List[float]] = None,
        battery_efficiency: Optional[float] = None,
    ) -> HybridResult:
        """Optimize mode selection using solar-first + economic thresholds.

        Args:
            battery_efficiency: Output efficiency from sensor (e.g. 0.838).
                We pay for 1 kWh input, but get efficiency * 1 kWh output.
                If None, uses DEFAULT_BATTERY_EFFICIENCY (0.838).
        """
        start_time = time.time()

        # Use provided efficiency or default
        self._efficiency = (
            battery_efficiency
            if battery_efficiency is not None
            else DEFAULT_BATTERY_EFFICIENCY
        )

        n_intervals = len(spot_prices)
        prices = self._extract_prices(spot_prices)
        exports = export_prices or [p * 0.85 for p in prices]

        # Step 1: Calculate dynamic price thresholds
        thresholds = self._calculate_thresholds(prices)

        _LOGGER.debug(
            "Price thresholds: P_cheap=%.2f, P_breakeven=%.2f, P_avg=%.2f",
            thresholds.p_cheap,
            thresholds.p_breakeven,
            thresholds.p_avg,
        )

        # Detect negative prices
        negative_prices = [i for i, p in enumerate(prices) if p < 0]
        has_negative = len(negative_prices) > 0

        # Step 2: First pass - determine modes based on solar + price logic
        # (without backward propagation yet)
        initial_modes = self._determine_initial_modes(
            initial_battery_kwh=initial_battery_kwh,
            prices=prices,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            thresholds=thresholds,
            balancing_plan=balancing_plan,
        )

        # Step 3: Backward propagation - ensure planning_min is never violated
        final_modes = self._backward_propagation(
            initial_battery_kwh=initial_battery_kwh,
            initial_modes=initial_modes,
            prices=prices,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            thresholds=thresholds,
        )

        # Step 4: Generate final decisions
        decisions, total_cost, total_import, total_export, final_battery = (
            self._generate_decisions(
                initial_battery_kwh=initial_battery_kwh,
                modes=final_modes,
                prices=prices,
                exports=exports,
                solar_forecast=solar_forecast,
                consumption_forecast=consumption_forecast,
                balancing_plan=balancing_plan,
            )
        )

        # Calculate mode counts
        mode_counts = {"HOME I": 0, "HOME II": 0, "HOME III": 0, "HOME UPS": 0}
        for d in decisions:
            mode_counts[d.mode_name] = mode_counts.get(d.mode_name, 0) + 1

        # Calculate baseline (all HOME I)
        baseline_cost = self._calculate_baseline_cost(
            initial_battery_kwh, solar_forecast, consumption_forecast, prices, exports
        )

        calc_time = (time.time() - start_time) * 1000

        return HybridResult(
            decisions=decisions,
            total_cost_czk=total_cost,
            baseline_cost_czk=baseline_cost,
            savings_czk=baseline_cost - total_cost,
            total_grid_import_kwh=total_import,
            total_grid_export_kwh=total_export,
            final_battery_kwh=final_battery,
            mode_counts=mode_counts,
            ups_intervals=mode_counts["HOME UPS"],
            calculation_time_ms=calc_time,
            negative_prices_detected=has_negative,
            balancing_applied=balancing_plan is not None and balancing_plan.is_active,
            price_thresholds=thresholds,
        )

    def _calculate_thresholds(self, prices: List[float]) -> PriceThresholds:
        """Calculate dynamic price thresholds from horizon prices."""
        if not prices:
            return PriceThresholds(
                p_cheap=2.0, p_breakeven=2.4, p_min=0.0, p_max=10.0, p_avg=5.0
            )

        sorted_prices = sorted(prices)
        n = len(sorted_prices)

        # Bottom 30% = cheap prices
        cheap_count = max(1, int(n * CHEAP_PERCENTILE))
        cheap_prices = sorted_prices[:cheap_count]
        p_cheap = sum(cheap_prices) / len(cheap_prices)

        # Break-even price calculation:
        # - We charge at P_cheap, paying for 1 kWh
        # - We get back efficiency * 1 kWh when discharging
        # - Effective cost of battery energy = P_cheap / efficiency
        # - Discharge when grid price > P_cheap / efficiency
        p_breakeven = p_cheap / self._efficiency

        return PriceThresholds(
            p_cheap=p_cheap,
            p_breakeven=p_breakeven,
            p_min=sorted_prices[0],
            p_max=sorted_prices[-1],
            p_avg=sum(prices) / n,
        )

    def _determine_initial_modes(
        self,
        initial_battery_kwh: float,
        prices: List[float],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        thresholds: PriceThresholds,
        balancing_plan: Optional[BalancingPlan] = None,
    ) -> List[Tuple[int, str]]:
        """Determine initial mode for each interval based on solar + price logic.

        Returns list of (mode, reason) tuples.
        """
        n = len(prices)
        modes: List[Tuple[int, str]] = []
        battery = initial_battery_kwh

        for i in range(n):
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            load = consumption_forecast[i] if i < len(consumption_forecast) else 0.125
            price = prices[i]

            # Check balancing constraints first
            if balancing_plan:
                if i in balancing_plan.charging_intervals:
                    modes.append((CBB_MODE_HOME_UPS, "balancing_charge"))
                    continue
                if i in balancing_plan.holding_intervals:
                    mode = CBB_MODE_HOME_III if solar > 0.1 else CBB_MODE_HOME_II
                    modes.append((mode, "balancing_hold"))
                    continue

            # Determine mode based on solar and price
            mode, reason = self._select_mode_for_interval(
                battery=battery,
                solar=solar,
                load=load,
                price=price,
                thresholds=thresholds,
            )
            modes.append((mode, reason))

            # Simulate to track battery (approximate)
            result = self.simulator.simulate(
                battery_start=battery,
                mode=mode,
                solar_kwh=solar,
                load_kwh=load,
                force_charge=(mode == CBB_MODE_HOME_UPS),
            )
            battery = result.battery_end

        return modes

    def _select_mode_for_interval(
        self,
        battery: float,
        solar: float,
        load: float,
        price: float,
        thresholds: PriceThresholds,
    ) -> Tuple[int, str]:
        """Select mode for single interval based on solar-first + economic logic.

        Ekonomická logika:
        - P < 0 → HOME UPS: nabíjej (jsme placeni!)
        - P <= P_cheap → HOME UPS: nabíjej (levná energie)
        - P_cheap < P < P_breakeven → HOME II: drž baterii, spotřeba ze sítě
        - P >= P_breakeven → HOME I: vybíjej baterii

        HOME II se vyplatí pro střední ceny - nevyplatí se ani nabíjet ani vybíjet.
        Backward propagation pak přidá HOME UPS intervaly pro dosažení target.
        """
        # CASE A: Negative price - charge from grid (we get paid!)
        if price < 0:
            if battery < self._max - 0.1:  # Space to charge
                return (CBB_MODE_HOME_UPS, f"negative_price_charge_{price:.2f}")
            else:
                return (CBB_MODE_HOME_I, "negative_price_bat_full")

        # CASE B: Very cheap price - charge from grid
        # Only charge at truly cheap prices (bottom 30%)
        # Backward propagation will add more charging if needed
        if price <= thresholds.p_cheap:
            if battery < self._target:
                return (
                    CBB_MODE_HOME_UPS,
                    f"cheap_charge_{price:.2f}<={thresholds.p_cheap:.2f}",
                )
            else:
                # Battery is high enough, just use HOME I
                return (CBB_MODE_HOME_I, f"cheap_but_bat_ok_{battery:.2f}")

        # CASE C: Middle price (P_cheap < P < P_breakeven) - hold battery
        # DON'T charge at middle prices - wait for backward propagation
        # to add charging only where absolutely necessary
        if price < thresholds.p_breakeven:
            # HOME II: hold battery, deficit from grid
            return (CBB_MODE_HOME_II, f"hold_{price:.2f}")

        # CASE D: Expensive price (P >= P_breakeven) - discharge battery
        # Battery was charged cheap, use it now!
        net_flow = solar - load
        if net_flow >= 0:
            return (CBB_MODE_HOME_I, "solar_surplus")
        else:
            return (CBB_MODE_HOME_I, f"discharge_{price:.2f}")

    def _backward_propagation(
        self,
        initial_battery_kwh: float,
        initial_modes: List[Tuple[int, str]],
        prices: List[float],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        thresholds: PriceThresholds,
    ) -> List[Tuple[int, str]]:
        """Ensure battery constraints using backward propagation.

        Two-phase algorithm:
        Phase 1: Ensure battery never drops below planning_min
        Phase 2: Add charging to reach target at end of horizon (winter strategy)

        For each phase:
        1. Simulate with current modes
        2. Find problem (battery too low)
        3. Find cheapest available interval to charge
        4. Repeat until solved
        """
        modes = list(initial_modes)  # Copy
        n = len(modes)

        # Track which intervals are already set to charge
        charging_intervals: Set[int] = {
            i for i, (mode, _) in enumerate(modes) if mode == CBB_MODE_HOME_UPS
        }

        # Create sorted price index for finding cheapest intervals
        price_order = sorted(range(n), key=lambda i: prices[i])

        # ===== PHASE 1: Ensure planning_min is never violated =====
        iteration = 0
        while iteration < self.MAX_ITERATIONS:
            iteration += 1

            trajectory = self._simulate_trajectory_with_modes(
                initial_battery_kwh=initial_battery_kwh,
                modes=[m for m, _ in modes],
                solar_forecast=solar_forecast,
                consumption_forecast=consumption_forecast,
            )

            # Find first problem (battery < planning_min)
            problem_idx = None
            for i, batt in enumerate(trajectory):
                if batt < self._planning_min:
                    problem_idx = i
                    break

            if problem_idx is None:
                _LOGGER.debug(
                    "Phase 1 (planning_min) converged after %d iterations", iteration
                )
                break

            # Find cheapest interval BEFORE problem
            found_solution = False
            for idx in price_order:
                if idx < problem_idx and idx not in charging_intervals:
                    modes[idx] = (
                        CBB_MODE_HOME_UPS,
                        f"backprop_min_{prices[idx]:.2f}",
                    )
                    charging_intervals.add(idx)
                    found_solution = True
                    break

            if not found_solution:
                _LOGGER.warning(
                    "Phase 1: Cannot fix battery at interval %d", problem_idx
                )
                break

        # ===== PHASE 2: Ensure final battery reaches target =====
        # Simple approach: Add charging intervals until final_battery >= target
        # Note: HA picks cheapest available intervals, so we do the same

        iteration = 0
        while iteration < self.MAX_ITERATIONS:
            iteration += 1

            trajectory = self._simulate_trajectory_with_modes(
                initial_battery_kwh=initial_battery_kwh,
                modes=[m for m, _ in modes],
                solar_forecast=solar_forecast,
                consumption_forecast=consumption_forecast,
            )

            final_battery = trajectory[-1] if trajectory else initial_battery_kwh

            # Check if target is reached
            if final_battery >= self._target - 0.1:
                _LOGGER.debug(
                    "Phase 2 converged after %d iterations, "
                    "final_battery=%.2f >= target=%.2f",
                    iteration,
                    final_battery,
                    self._target,
                )
                break

            # Also check minimum threshold - battery should never drop below planning_min
            problem_idx = None
            for i, batt in enumerate(trajectory):
                if batt < self._planning_min:
                    problem_idx = i
                    break

            # If battery drops below minimum, that's our problem point
            # Otherwise, problem is at the end (need more charge for final target)
            if problem_idx is None:
                problem_idx = n - 1

            # Strategy: Find cheapest interval to charge from grid (HOME UPS)
            # Note: HA uses ALL intervals sorted by price, no p_breakeven limit
            found_solution = False

            # Option A: Find cheapest interval before problem to charge from grid
            cheap_candidates = [
                (idx, prices[idx])
                for idx in range(problem_idx + 1)
                if idx not in charging_intervals
            ]
            cheap_candidates.sort(key=lambda x: x[1])

            if cheap_candidates:
                idx = cheap_candidates[0][0]
                modes[idx] = (
                    CBB_MODE_HOME_UPS,
                    f"cheap_charge_{prices[idx]:.2f}",
                )
                charging_intervals.add(idx)
                found_solution = True

            if not found_solution:
                # Last resort: find ANY remaining interval, sorted by price
                remaining = [
                    (idx, prices[idx])
                    for idx in range(n)
                    if idx not in charging_intervals
                ]
                remaining.sort(key=lambda x: x[1])
                if remaining:
                    idx = remaining[0][0]
                    modes[idx] = (
                        CBB_MODE_HOME_UPS,
                        f"fallback_charge_{prices[idx]:.2f}",
                    )
                    charging_intervals.add(idx)
                    found_solution = True

            if not found_solution:
                _LOGGER.debug(
                    "Phase 2: No more intervals available, final_battery=%.2f",
                    final_battery,
                )
                break

        if iteration >= self.MAX_ITERATIONS:
            _LOGGER.warning(
                "Backward propagation hit max iterations (%d)", self.MAX_ITERATIONS
            )

        return modes

    def _simulate_trajectory_with_modes(
        self,
        initial_battery_kwh: float,
        modes: List[int],
        solar_forecast: List[float],
        consumption_forecast: List[float],
    ) -> List[float]:
        """Simulate battery trajectory with given modes."""
        n = len(modes)
        trajectory: List[float] = []
        battery = initial_battery_kwh

        for i in range(n):
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            load = consumption_forecast[i] if i < len(consumption_forecast) else 0.125
            mode = modes[i]

            result = self.simulator.simulate(
                battery_start=battery,
                mode=mode,
                solar_kwh=solar,
                load_kwh=load,
                force_charge=(mode == CBB_MODE_HOME_UPS),
            )

            battery = result.battery_end
            trajectory.append(battery)

        return trajectory

    def _generate_decisions(
        self,
        initial_battery_kwh: float,
        modes: List[Tuple[int, str]],
        prices: List[float],
        exports: List[float],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        balancing_plan: Optional[BalancingPlan] = None,
    ) -> Tuple[List[IntervalDecision], float, float, float, float]:
        """Generate final decisions and calculate totals."""
        decisions: List[IntervalDecision] = []
        battery = initial_battery_kwh
        total_cost = 0.0
        total_import = 0.0
        total_export = 0.0

        for i, (mode, reason) in enumerate(modes):
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            load = consumption_forecast[i] if i < len(consumption_forecast) else 0.125
            price = prices[i]
            export_price = exports[i]

            # Simulate
            result = self.simulator.simulate(
                battery_start=battery,
                mode=mode,
                solar_kwh=solar,
                load_kwh=load,
                force_charge=(mode == CBB_MODE_HOME_UPS),
            )

            # Calculate cost
            cost = self.simulator.calculate_cost(result, price, export_price)

            # Check flags
            is_balancing = balancing_plan and i in balancing_plan.charging_intervals
            is_holding = balancing_plan and i in balancing_plan.holding_intervals
            is_negative = price < 0

            decision = IntervalDecision(
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
            decisions.append(decision)

            # Update state
            battery = result.battery_end
            total_cost += cost
            total_import += result.grid_import
            total_export += result.grid_export

        return decisions, total_cost, total_import, total_export, battery

    def _calculate_baseline_cost(
        self,
        initial_battery_kwh: float,
        solar_forecast: List[float],
        consumption_forecast: List[float],
        prices: List[float],
        exports: List[float],
    ) -> float:
        """Calculate cost with all HOME I (baseline for comparison)."""
        battery = initial_battery_kwh
        total_cost = 0.0

        for i in range(len(prices)):
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            load = consumption_forecast[i] if i < len(consumption_forecast) else 0.125

            result = self.simulator.simulate(
                battery_start=battery,
                mode=CBB_MODE_HOME_I,
                solar_kwh=solar,
                load_kwh=load,
            )

            cost = self.simulator.calculate_cost(result, prices[i], exports[i])
            total_cost += cost
            battery = result.battery_end

        return total_cost

    def _extract_prices(self, spot_prices: List[SpotPrice]) -> List[float]:
        """Extract price values from SpotPrice objects."""
        prices: List[float] = []
        for sp in spot_prices:
            if isinstance(sp, dict):
                prices.append(float(sp.get("price", 0.0)))
            elif hasattr(sp, "price_czk_kwh"):
                prices.append(float(sp.price_czk_kwh))
            else:
                prices.append(float(sp))
        return prices
