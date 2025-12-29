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

from ..config import (
    ChargingStrategy,
    HybridConfig,
    NegativePriceStrategy,
    SimulatorConfig,
)
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
        balancing_plan: Optional[BalancingPlan] = None,
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

        # Step 2: Final pass - generate decisions with planned charging
        decisions: List[IntervalDecision] = []
        battery = initial_battery_kwh
        total_cost = 0.0
        total_import = 0.0
        total_export = 0.0
        mode_counts: Dict[str, int] = {
            "HOME I": 0,
            "HOME II": 0,
            "HOME III": 0,
            "HOME UPS": 0,
        }

        for i in range(n_intervals):
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            load = consumption_forecast[i] if i < len(consumption_forecast) else 0.125
            price = prices[i]
            export_price = exports[i]

            # Check constraints
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

            # Determine mode based on planning
            if override_mode is not None:
                mode = override_mode
                if is_holding:
                    reason = "holding_period"
                elif is_balancing:
                    reason = "balancing_charge"
                else:
                    reason = "balancing_override"
            elif is_holding:
                mode = CBB_MODE_HOME_UPS
                reason = "holding_period"
            elif is_balancing:
                mode = CBB_MODE_HOME_UPS
                reason = "balancing_charge"
            elif is_negative:
                mode, reason = self._handle_negative_price(
                    battery, solar, load, price, export_price
                )
            elif is_charging:
                mode = CBB_MODE_HOME_UPS
                if is_price_band:
                    reason = "price_band_hold"
                else:
                    reason = f"planned_charge_{price:.2f}CZK"
            else:
                # Default: HOME I (discharge battery when needed)
                mode = CBB_MODE_HOME_I
                reason = "default_discharge"

            # Simulate selected mode
            result = self.simulator.simulate(
                battery_start=battery,
                mode=mode,
                solar_kwh=solar,
                load_kwh=load,
                force_charge=(mode == CBB_MODE_HOME_UPS)
                and (is_balancing or is_charging),
            )

            # Calculate cost
            cost = self.simulator.calculate_cost(result, price, export_price)

            # Record decision
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
            mode_counts[CBB_MODE_NAMES.get(mode, "HOME III")] += 1

        # Calculate baseline (HOME I only)
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
            final_battery_kwh=battery,
            mode_counts=mode_counts,
            ups_intervals=mode_counts["HOME UPS"],
            calculation_time_ms=calc_time,
            negative_prices_detected=has_negative,
            balancing_applied=balancing_plan is not None and balancing_plan.is_active,
            infeasible=infeasible,
            infeasible_reason=infeasible_reason,
        )

    def _plan_charging_intervals(
        self,
        initial_battery_kwh: float,
        prices: List[float],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        balancing_plan: Optional[BalancingPlan] = None,
        negative_price_intervals: Optional[List[int]] = None,
    ) -> Tuple[set[int], Optional[str], set[int]]:
        """Plan charging intervals with planning-min enforcement and price guard."""
        n = len(prices)
        charging_intervals: set[int] = set()
        price_band_intervals: set[int] = set()
        infeasible_reason: Optional[str] = None
        eps_kwh = 0.01
        recovery_mode = initial_battery_kwh < self._planning_min - eps_kwh

        blocked_indices: set[int] = set()
        if balancing_plan and balancing_plan.mode_overrides:
            blocked_indices = {
                idx
                for idx, mode in balancing_plan.mode_overrides.items()
                if mode != CBB_MODE_HOME_UPS and 0 <= idx < n
            }

        # Add balancing charge intervals (UPS only)
        if balancing_plan:
            for idx in balancing_plan.charging_intervals:
                if 0 <= idx < n and idx not in blocked_indices:
                    charging_intervals.add(idx)

        # Respect negative price strategy (only force UPS when configured)
        if (
            negative_price_intervals
            and self.config.negative_price_strategy == NegativePriceStrategy.CHARGE_GRID
        ):
            for idx in negative_price_intervals:
                if 0 <= idx < n and idx not in blocked_indices:
                    charging_intervals.add(idx)

        def add_ups_interval(idx: int, *, allow_expensive: bool = False) -> None:
            if idx in blocked_indices:
                return
            charging_intervals.add(idx)
            min_len = max(1, self.config.min_ups_duration_intervals)
            if min_len <= 1:
                return
            for offset in range(1, min_len):
                next_idx = idx + offset
                if next_idx >= n:
                    break
                if next_idx in blocked_indices or next_idx in charging_intervals:
                    continue
                if allow_expensive or prices[next_idx] <= self.config.max_ups_price_czk:
                    charging_intervals.add(next_idx)

        # Recovery if we start below planning minimum: charge ASAP.
        recovery_index: Optional[int] = None
        if recovery_mode:
            soc = initial_battery_kwh
            for i in range(n):
                if soc >= self._planning_min - eps_kwh:
                    recovery_index = max(0, i - 1)
                    break

                price = prices[i]
                if price > self.config.max_ups_price_czk and infeasible_reason is None:
                    infeasible_reason = (
                        "Battery below planning minimum at start; "
                        f"interval {i} exceeds max_ups_price_czk={self.config.max_ups_price_czk}"
                    )
                add_ups_interval(
                    i, allow_expensive=price > self.config.max_ups_price_czk
                )

                solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
                load = (
                    consumption_forecast[i] if i < len(consumption_forecast) else 0.125
                )
                res = self.simulator.simulate(
                    battery_start=soc,
                    mode=CBB_MODE_HOME_UPS,
                    solar_kwh=solar,
                    load_kwh=load,
                    force_charge=True,
                )
                soc = res.battery_end

            if recovery_index is None and soc >= self._planning_min - eps_kwh:
                recovery_index = n - 1

            if soc < self._planning_min - eps_kwh:
                if infeasible_reason is None:
                    infeasible_reason = "Battery below planning minimum at start and could not recover within planning horizon"
                return charging_intervals, infeasible_reason, price_band_intervals
        else:
            recovery_index = 0

        # Repair loop: add UPS intervals before first violation.
        buffer = 0.5
        for _ in range(self.MAX_ITERATIONS):
            battery_trajectory = self._simulate_trajectory(
                initial_battery_kwh=initial_battery_kwh,
                solar_forecast=solar_forecast,
                consumption_forecast=consumption_forecast,
                charging_intervals=charging_intervals,
            )

            violation_idx = None
            start_idx = recovery_index + 1 if recovery_index is not None else 0
            for i in range(start_idx, len(battery_trajectory)):
                if battery_trajectory[i] < self._planning_min + buffer:
                    violation_idx = i
                    break

            if violation_idx is None:
                break

            candidate = None
            candidate_price = None
            for idx in range(0, min(n, violation_idx + 1)):
                if idx in charging_intervals or idx in blocked_indices:
                    continue
                price = prices[idx]
                if price > self.config.max_ups_price_czk:
                    continue
                if candidate is None or price < candidate_price:
                    candidate = idx
                    candidate_price = price

            if candidate is None:
                if infeasible_reason is None:
                    infeasible_reason = (
                        f"No UPS interval <= max_ups_price_czk={self.config.max_ups_price_czk} "
                        f"available before violation index {violation_idx}"
                    )
                for idx in range(0, min(n, violation_idx + 1)):
                    add_ups_interval(idx, allow_expensive=True)
                break

            add_ups_interval(candidate)

        # Target fill: add cheapest UPS intervals until target SoC is reachable.
        if self._target > self._planning_min + eps_kwh:
            for _ in range(self.MAX_ITERATIONS):
                battery_trajectory = self._simulate_trajectory(
                    initial_battery_kwh=initial_battery_kwh,
                    solar_forecast=solar_forecast,
                    consumption_forecast=consumption_forecast,
                    charging_intervals=charging_intervals,
                )
                max_soc = (
                    max(battery_trajectory)
                    if battery_trajectory
                    else initial_battery_kwh
                )
                if max_soc >= self._target - eps_kwh:
                    break

                candidate = None
                candidate_price = None
                for idx, price in enumerate(prices):
                    if idx in charging_intervals or idx in blocked_indices:
                        continue
                    if price > self.config.max_ups_price_czk:
                        continue
                    if candidate is None or price < candidate_price:
                        candidate = idx
                        candidate_price = price

                if candidate is None:
                    break

                add_ups_interval(candidate)

        # Final validation: flag infeasible if still under planning minimum.
        final_trajectory = self._simulate_trajectory(
            initial_battery_kwh=initial_battery_kwh,
            solar_forecast=solar_forecast,
            consumption_forecast=consumption_forecast,
            charging_intervals=charging_intervals,
        )
        start_idx = recovery_index + 1 if recovery_index is not None else 0
        for i in range(start_idx, len(final_trajectory)):
            if final_trajectory[i] < self._planning_min - eps_kwh:
                if infeasible_reason is None:
                    infeasible_reason = f"Planner could not satisfy planning minimum (first violation at index {i})"
                break

        if not recovery_mode:
            original_charging = set(charging_intervals)
            price_band_intervals = self._extend_ups_blocks_by_price_band(
                charging_intervals=original_charging,
                prices=prices,
                blocked_indices=blocked_indices,
            )
            if price_band_intervals:
                charging_intervals |= price_band_intervals
                _LOGGER.debug(
                    "Price-band UPS extension added %d intervals (delta=%.1f%%)",
                    len(price_band_intervals),
                    self._get_price_band_delta_pct() * 100,
                )

        return charging_intervals, infeasible_reason, price_band_intervals

    def _get_price_band_delta_pct(self) -> float:
        """Compute price band delta from battery efficiency (min 8%)."""
        eff = getattr(self.sim_config, "ac_dc_efficiency", None)
        try:
            eff_val = float(eff)
        except (TypeError, ValueError):
            eff_val = 0.0

        if eff_val <= 0 or eff_val > 1.0:
            return self.MIN_UPS_PRICE_BAND_PCT

        derived = (1.0 / eff_val) - 1.0
        return max(self.MIN_UPS_PRICE_BAND_PCT, derived)

    def _extend_ups_blocks_by_price_band(
        self,
        *,
        charging_intervals: set[int],
        prices: List[float],
        blocked_indices: set[int],
    ) -> set[int]:
        """Extend UPS blocks forward when prices stay within efficiency-based band."""
        if not charging_intervals or not prices:
            return set()

        max_price = float(self.config.max_ups_price_czk)
        delta_pct = self._get_price_band_delta_pct()
        n = len(prices)

        ups_flags = [False] * n
        for idx in charging_intervals:
            if 0 <= idx < n:
                ups_flags[idx] = True

        def _can_extend(prev_idx: int, idx: int) -> bool:
            if idx in blocked_indices:
                return False
            prev_price = prices[prev_idx]
            if prev_price > max_price:
                return False
            price = prices[idx]
            if price > max_price:
                return False
            return price <= prev_price * (1.0 + delta_pct)

        extended: set[int] = set()

        # Forward hysteresis: držet UPS, pokud cena neroste nad pásmo
        for i in range(1, n):
            if ups_flags[i - 1] and not ups_flags[i] and _can_extend(i - 1, i):
                ups_flags[i] = True
                if i not in charging_intervals:
                    extended.add(i)

        # Vyplnit jednorázové mezery mezi UPS bloky
        for i in range(1, n - 1):
            if ups_flags[i - 1] and (not ups_flags[i]) and ups_flags[i + 1]:
                if _can_extend(i - 1, i):
                    ups_flags[i] = True
                    if i not in charging_intervals:
                        extended.add(i)

        # Ještě jednou dopředně, aby se navázalo na doplněné mezery
        for i in range(1, n):
            if ups_flags[i - 1] and not ups_flags[i] and _can_extend(i - 1, i):
                ups_flags[i] = True
                if i not in charging_intervals:
                    extended.add(i)

        return extended

    def _simulate_trajectory(
        self,
        initial_battery_kwh: float,
        solar_forecast: List[float],
        consumption_forecast: List[float],
        charging_intervals: set[int],
    ) -> List[float]:
        """Simulate battery trajectory with given charging plan.

        Args:
            initial_battery_kwh: Starting battery level
            solar_forecast: Solar production per interval
            consumption_forecast: Load per interval
            charging_intervals: Set of intervals where HOME UPS is used

        Returns:
            List of battery levels at end of each interval
        """
        n = len(solar_forecast)
        trajectory: List[float] = []
        battery = initial_battery_kwh

        for i in range(n):
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            load = consumption_forecast[i] if i < len(consumption_forecast) else 0.125

            # Use HOME UPS if charging, otherwise HOME I
            mode = CBB_MODE_HOME_UPS if i in charging_intervals else CBB_MODE_HOME_I
            force_charge = i in charging_intervals

            result = self.simulator.simulate(
                battery_start=battery,
                mode=mode,
                solar_kwh=solar,
                load_kwh=load,
                force_charge=force_charge,
            )

            battery = result.battery_end
            trajectory.append(battery)

        return trajectory

    def _extract_prices(self, spot_prices: List[SpotPrice]) -> List[float]:
        """Extract price values from SpotPrice objects."""
        prices: List[float] = []
        for sp in spot_prices:
            if isinstance(sp, dict):
                prices.append(float(sp.get("price", 0.0)))
            else:
                prices.append(float(sp))
        return prices

    def _analyze_future_prices(
        self,
        prices: List[float],
        export_prices: List[float],
        consumption_forecast: List[float],
    ) -> Dict[int, Dict[str, float]]:
        """Analyze future prices for forward-looking optimization.

        For each interval, calculate:
        - max_future_price: Maximum price in lookahead window
        - expected_saving: Expected saving from charging now
        - should_charge: Whether charging is profitable

        The key insight: If future prices are significantly higher,
        it's profitable to charge from grid now (HOME UPS), even if
        the current price isn't "cheap" by absolute standards.

        Profitability calculation:
        - Cost to charge 1 kWh now: current_price / AC_DC_efficiency
        - Value of 1 kWh later: max_future_price * DC_AC_efficiency
        - Profit if: value_later > cost_now

        Args:
            prices: Spot prices for all intervals
            export_prices: Export prices for all intervals
            consumption_forecast: Expected consumption per interval

        Returns:
            Dict mapping interval index to analysis dict
        """
        _ = export_prices
        analysis: Dict[int, Dict[str, float]] = {}
        n = len(prices)

        # Efficiency constants
        ac_dc_eff = self.sim_config.ac_dc_efficiency  # ~0.95
        dc_ac_eff = self.sim_config.dc_ac_efficiency  # ~0.882
        # Round-trip efficiency: ac_dc * dc_ac = ~0.84

        # Calculate night consumption (intervals 56-96 = 20:00-00:00)
        # This helps decide how much to charge for night
        night_start_idx = 56  # Approximately 20:00 if starting from 06:00
        night_consumption = sum(
            consumption_forecast[i]
            for i in range(night_start_idx, min(n, night_start_idx + 20))
            if i < len(consumption_forecast)
        )

        for i in range(n):
            current_price = prices[i]

            # Look ahead window
            lookahead_end = min(i + self.LOOKAHEAD_INTERVALS, n)
            future_prices = prices[i + 1 : lookahead_end] if i + 1 < n else []

            if not future_prices:
                # No future data - can't do forward-looking
                analysis[i] = {
                    "max_future_price": current_price,
                    "avg_future_price": current_price,
                    "expected_saving": 0.0,
                    "should_charge": False,
                    "charge_reason": "no_future_data",
                    "night_deficit": 0.0,
                }
                continue

            max_future = max(future_prices)
            avg_future = sum(future_prices) / len(future_prices)
            min_future = min(future_prices)

            # Cost to charge 1 kWh now (from grid via AC)
            charge_cost = current_price / ac_dc_eff

            # Value of 1 kWh discharged later (at max future price)
            discharge_value = max_future * dc_ac_eff

            # Expected saving = value - cost
            expected_saving = discharge_value - charge_cost

            # Is charging profitable?
            # We need at least MIN_PRICE_SPREAD_PERCENT profit margin
            min_spread = current_price * (self.MIN_PRICE_SPREAD_PERCENT / 100.0)
            profitable = expected_saving > min_spread

            # Additional check: is current price in bottom 30% of future?
            price_percentile = sum(1 for p in future_prices if p > current_price)
            is_relatively_cheap = price_percentile >= len(future_prices) * 0.7

            # Night preparation: if approaching night and battery not full
            # Calculate how much energy we need for night
            intervals_to_night = max(0, night_start_idx - i)
            preparing_for_night = intervals_to_night < 20 and intervals_to_night > 0

            # Determine charge reason
            should_charge = False
            charge_reason = "not_profitable"

            if profitable and is_relatively_cheap:
                should_charge = True
                charge_reason = f"arbitrage_{expected_saving:.2f}CZK"
            elif preparing_for_night and is_relatively_cheap:
                should_charge = True
                charge_reason = "night_preparation"
            elif current_price < 0:
                should_charge = True
                charge_reason = "negative_price"
            elif current_price < avg_future * 0.85:
                # Current price is significantly below average
                should_charge = True
                charge_reason = f"below_avg_{current_price:.2f}<{avg_future:.2f}"
            elif is_relatively_cheap and current_price < min_future * 1.05:
                # Price is in bottom 30% AND close to minimum future price
                # This means it's a good time to charge regardless of strict ROI
                should_charge = True
                charge_reason = f"relative_cheap_{current_price:.2f}"

            analysis[i] = {
                "max_future_price": max_future,
                "avg_future_price": avg_future,
                "min_future_price": min_future,
                "expected_saving": expected_saving,
                "should_charge": should_charge,
                "charge_reason": charge_reason,
                "is_relatively_cheap": is_relatively_cheap,
                "preparing_for_night": preparing_for_night,
                "night_deficit": night_consumption,
            }

        return analysis

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
        """Select best mode based on scoring.

        Args:
            battery: Current battery level (kWh)
            solar: Solar production (kWh)
            load: Consumption (kWh)
            price: Current spot price
            export_price: Current export price
            cheap_threshold: Price below which is considered cheap
            expensive_threshold: Price above which is considered expensive
            very_cheap: Very cheap price threshold
            future_info: Forward-looking analysis for this interval

        Returns:
            Tuple of (mode, reason, scores)
        """
        scores: Dict[int, float] = {}

        # Get forward-looking info
        if future_info is None:
            future_info = {}
        is_relatively_cheap = future_info.get("is_relatively_cheap", False)
        expected_saving = future_info.get("expected_saving", 0.0)

        # Score each mode
        for mode in [
            CBB_MODE_HOME_I,
            CBB_MODE_HOME_II,
            CBB_MODE_HOME_III,
            CBB_MODE_HOME_UPS,
        ]:
            score = self._score_mode(
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
            scores[mode] = score

        # Select best mode
        best_mode = max(scores, key=lambda m: scores[m])

        # Determine reason
        if best_mode == CBB_MODE_HOME_UPS:
            if price <= very_cheap:
                reason = "very_cheap_grid_charge"
            elif battery < self._planning_min:
                reason = "low_battery_charge"
            else:
                reason = "opportunistic_charge"
        elif best_mode == CBB_MODE_HOME_III:
            if solar > load:
                reason = "maximize_solar_storage"
            else:
                reason = "preserve_battery_high_solar"
        elif best_mode == CBB_MODE_HOME_II:
            reason = "preserve_battery_day"
        else:  # HOME_I
            if price >= expensive_threshold:
                reason = "expensive_use_battery"
            else:
                reason = "normal_operation"

        return best_mode, reason, scores

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
        """Calculate score for a mode.

        Higher score = better choice.

        Args:
            mode: CBB mode to score
            battery: Current battery level
            solar: Solar production (kWh)
            load: Consumption (kWh)
            price: Current spot price
            export_price: Export price
            cheap_threshold: Price below which is cheap
            expected_saving: Expected saving from forward-looking analysis
            is_relatively_cheap: Whether price is in bottom 30% of future
        """
        # Simulate this mode
        result = self.simulator.simulate(
            battery_start=battery,
            mode=mode,
            solar_kwh=solar,
            load_kwh=load,
        )

        cost = self.simulator.calculate_cost(result, price, export_price)

        # Base score: negative cost (lower cost = higher score)
        score = -cost * self.config.weight_cost

        # Bonus for battery preservation
        if result.battery_end >= self._planning_min:
            score += 0.5 * self.config.weight_battery_preservation
        if result.battery_end >= self._target:
            score += 0.3 * self.config.weight_battery_preservation

        # Bonus for self-consumption
        if result.solar_used_direct > 0:
            score += result.solar_used_direct * self.config.weight_self_consumption

        # Penalty for going below planning minimum
        if result.battery_end < self._planning_min:
            deficit = self._planning_min - result.battery_end
            score -= deficit * 2.0

        # UPS mode scoring with forward-looking
        if mode == CBB_MODE_HOME_UPS:
            if self.config.charging_strategy == ChargingStrategy.DISABLED:
                score -= 100.0  # Effectively disable
            elif price > self.config.max_ups_price_czk:
                score -= 10.0  # Penalty for expensive charging
            elif price <= cheap_threshold:
                score += 1.0  # Bonus for cheap charging

            # Forward-looking bonus: if charging is profitable, boost UPS score
            if expected_saving > 0 and is_relatively_cheap:
                score += expected_saving * 0.5  # Add expected arbitrage profit
            if is_relatively_cheap and battery < self._target:
                score += 0.5  # Bonus for charging at relatively cheap prices

        return score

    def _handle_negative_price(
        self,
        battery: float,
        solar: float,
        load: float,
        price: float,
        export_price: float,
    ) -> Tuple[int, str]:
        """Handle negative price intervals.

        Returns:
            Tuple of (mode, reason)
        """
        _ = load
        _ = price
        _ = export_price
        strategy = self.config.negative_price_strategy

        if strategy == NegativePriceStrategy.CHARGE_GRID:
            # Charge from grid at negative prices = get paid!
            return CBB_MODE_HOME_UPS, "negative_price_charge"

        elif strategy == NegativePriceStrategy.CURTAIL:
            # Reduce export by using HOME III (solar → battery)
            return CBB_MODE_HOME_III, "negative_price_curtail"

        elif strategy == NegativePriceStrategy.CONSUME:
            # Maximize self-consumption (HOME I)
            return CBB_MODE_HOME_I, "negative_price_consume"

        else:  # AUTO
            # Auto-select based on conditions
            if battery < self._max - 1.0:
                # Room in battery - charge from grid (get paid!)
                return CBB_MODE_HOME_UPS, "auto_negative_charge"
            elif solar > 0.5:
                # High solar, battery full - curtail export
                return CBB_MODE_HOME_III, "auto_negative_curtail"
            else:
                # Maximize self-consumption
                return CBB_MODE_HOME_I, "auto_negative_consume"

    def _apply_smoothing(
        self,
        decisions: List[IntervalDecision],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        prices: List[float],
        export_prices: List[float],
    ) -> List[IntervalDecision]:
        """Apply smoothing to avoid rapid mode changes.

        Ensures minimum mode duration is respected.
        """
        _ = solar_forecast
        _ = consumption_forecast
        _ = prices
        _ = export_prices
        if len(decisions) < 2:
            return decisions

        min_duration = self.config.min_mode_duration_intervals

        # Find short mode runs and extend them
        i = 0
        while i < len(decisions):
            # Find run of same mode
            mode = decisions[i].mode
            run_start = i
            while i < len(decisions) and decisions[i].mode == mode:
                i += 1
            run_end = i
            run_length = run_end - run_start

            # If run is too short and not balancing/holding
            if run_length < min_duration:
                # Check if any interval in run is protected
                protected = any(
                    decisions[j].is_balancing or decisions[j].is_holding
                    for j in range(run_start, run_end)
                )

                if not protected:
                    # Extend to adjacent mode
                    if run_start > 0:
                        prev_mode = decisions[run_start - 1].mode
                        for j in range(run_start, run_end):
                            decisions[j].mode = prev_mode
                            decisions[j].mode_name = CBB_MODE_NAMES.get(
                                prev_mode, "UNKNOWN"
                            )
                            decisions[j].reason = "smoothing_merged"

        return decisions

    def _calculate_baseline_cost(
        self,
        initial_battery: float,
        solar_forecast: List[float],
        consumption_forecast: List[float],
        prices: List[float],
        export_prices: List[float],
    ) -> float:
        """Calculate cost with HOME I only (baseline)."""
        battery = initial_battery
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

            cost = self.simulator.calculate_cost(result, prices[i], export_prices[i])
            total_cost += cost
            battery = result.battery_end

        return total_cost


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
