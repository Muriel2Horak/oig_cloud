"""HYBRID optimizer - main optimization algorithm.

This module implements the HYBRID multi-mode optimization algorithm
that combines forward/backward passes with price-aware charging.

Key features:
- Forward pass: Simulate with HOME I to find minimum points
- Backward pass: Calculate required battery for target
- Price-aware UPS: Charge in cheapest intervals
- Balancing support: Override for 100% target with deadline
- Negative price protection: Prepare battery for solar absorption
"""

import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

from homeassistant.util import dt as dt_util

from ..timeline.simulator import SoCSimulator
from ..types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
    DEFAULT_CHARGE_RATE_KW,
    DEFAULT_EFFICIENCY,
    INTERVAL_MINUTES,
    OptimizationResult,
)
from .modes import ModeSelector

_LOGGER = logging.getLogger(__name__)


@dataclass
class BalancingConfig:
    """Configuration for balancing mode."""

    is_active: bool = False
    deadline: Optional[datetime] = None
    holding_start: Optional[datetime] = None
    holding_end: Optional[datetime] = None
    preferred_intervals: Optional[Set[datetime]] = None
    reason: str = "unknown"

    def __post_init__(self) -> None:
        if self.preferred_intervals is None:
            self.preferred_intervals = set()


@dataclass
class NegativePriceStrategy:
    """Strategy for handling negative price periods.

    When negative prices are detected in the forecast, the algorithm
    prepares by:
    1. Draining battery before negative prices start
    2. Absorbing solar into empty battery during negative prices
    3. Selling stored energy during evening peak

    This maximizes profit and minimizes curtailment.
    """

    is_active: bool = False
    negative_start_idx: int = 0
    negative_end_idx: int = 0
    expected_solar_kwh: float = 0.0  # Solar during negative prices
    expected_load_kwh: float = 0.0  # Load during negative prices
    excess_solar_kwh: float = 0.0  # Solar - load during negative
    battery_space_needed_kwh: float = 0.0  # How much to drain
    target_soc_before_negative: float = 0.0  # Target SoC at start of negative
    drain_value_czk: float = 0.0  # Value of pre-draining
    curtailment_if_full_kwh: float = 0.0  # Solar we'd lose if battery full
    recommended_actions: Optional[List[str]] = None  # Actions to take

    def __post_init__(self) -> None:
        if self.recommended_actions is None:
            self.recommended_actions = []


class HybridOptimizer:
    """HYBRID multi-mode optimizer for battery management.

    The HYBRID algorithm optimizes battery modes across a timeline
    to minimize electricity costs while respecting constraints.

    Modes:
    - HOME I (0): Grid priority, preserve battery
    - HOME II (1): Battery priority, no discharge
    - HOME III (2): Solar priority (default)
    - HOME UPS (3): AC charging enabled

    Algorithm phases:
    1. Forward pass: Simulate HOME I to find minimum violations
    2. Backward pass: Calculate required battery for target
    3. Mode selection: Choose modes based on solar/prices
    4. Charging optimization: Place UPS in cheapest intervals
    5. Post-processing: Merge close UPS, enforce min duration

    Example:
        optimizer = HybridOptimizer(
            max_capacity=15.36,
            min_capacity=3.38,
            target_capacity=12.0,
            charge_rate_kw=2.8,
            efficiency=0.882,
        )

        result = optimizer.optimize(
            current_capacity=10.0,
            spot_prices=[...],
            solar_forecast=[...],
            load_forecast=[...],
        )

        print(f"Total cost: {result['total_cost_czk']} CZK")
        print(f"UPS intervals: {result['ups_intervals_count']}")
    """

    def __init__(
        self,
        max_capacity: float,
        min_capacity: float,
        target_capacity: float,
        charge_rate_kw: float = DEFAULT_CHARGE_RATE_KW,
        efficiency: float = DEFAULT_EFFICIENCY,
        interval_minutes: int = INTERVAL_MINUTES,
    ) -> None:
        """Initialize optimizer.

        Args:
            max_capacity: Maximum battery capacity (kWh)
            min_capacity: Minimum usable capacity / user reserve (kWh)
            target_capacity: Target battery at end of timeline (kWh)
            charge_rate_kw: AC charging rate (kW)
            efficiency: Battery round-trip efficiency
            interval_minutes: Planning interval in minutes
        """
        self.max_capacity = max_capacity
        self.min_capacity = min_capacity
        self.target_capacity = target_capacity
        self.charge_rate_kw = charge_rate_kw
        self.efficiency = efficiency
        self.interval_minutes = interval_minutes

        # Derived values
        self.interval_hours = interval_minutes / 60.0
        self.max_charge_per_interval = charge_rate_kw * self.interval_hours
        self.physical_min = max_capacity * 0.20  # 20% SoC hardware limit

        # Sub-components
        self.simulator = SoCSimulator(
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            charge_rate_kw=charge_rate_kw,
            efficiency=efficiency,
            interval_minutes=interval_minutes,
        )

        self.mode_selector = ModeSelector(
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            target_capacity=target_capacity,
            charge_rate_kw=charge_rate_kw,
        )

    def optimize(
        self,
        current_capacity: float,
        spot_prices: List[Dict[str, Any]],
        solar_forecast: List[float],
        load_forecast: List[float],
        balancing_plan: Optional[Dict[str, Any]] = None,
        export_prices: Optional[List[Dict[str, Any]]] = None,
    ) -> OptimizationResult:
        """Run HYBRID optimization.

        Args:
            current_capacity: Current battery level (kWh)
            spot_prices: List of spot price dicts with 'time' and 'price' (buy prices)
            solar_forecast: Solar kWh for each interval
            load_forecast: Load kWh for each interval
            balancing_plan: Optional balancing plan dict
            export_prices: List of export price dicts with 'time' and 'price' (sell prices)
                          Used for negative price detection. If not provided,
                          spot_prices are used as fallback.

        Returns:
            OptimizationResult with modes and metrics
        """
        start_time = time.time()
        n = len(spot_prices)

        if n == 0:
            return self._empty_result()

        # Use export_prices for negative price detection, fallback to spot_prices
        effective_export_prices = export_prices if export_prices else spot_prices

        # Parse balancing configuration
        balancing = self._parse_balancing(balancing_plan)

        # Adjust target for balancing
        effective_target = (
            self.max_capacity if balancing.is_active else self.target_capacity
        )

        _LOGGER.info(
            f"🔄 HYBRID optimization: current={current_capacity:.2f}, "
            f"min={self.min_capacity:.2f}, target={effective_target:.2f}, "
            f"max={self.max_capacity:.2f}, intervals={n}, "
            f"balancing={balancing.is_active}"
        )

        # PHASE 0: Detect negative prices and prepare strategy
        # Use export_prices for detection (actual sell prices), not spot_prices
        negative_strategy = self._detect_negative_prices(
            export_prices=effective_export_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
            current_capacity=current_capacity,
        )

        if negative_strategy.is_active:
            _LOGGER.warning(
                f"⚠️ NEGATIVE EXPORT PRICES DETECTED! Intervals {negative_strategy.negative_start_idx}-"
                f"{negative_strategy.negative_end_idx}, excess solar={negative_strategy.excess_solar_kwh:.1f} kWh"
            )
            for action in negative_strategy.recommended_actions or []:
                _LOGGER.warning(f"   {action}")

        # PHASE 1: Forward pass - simulate HOME I to find violations
        modes = [CBB_MODE_HOME_I] * n
        forward_trajectory, _, _ = self.simulator.simulate_timeline(
            initial_battery=current_capacity,
            modes=modes,
            solar_forecast=solar_forecast,
            consumption_forecast=load_forecast,
        )

        min_reached = min(forward_trajectory)
        min_index = forward_trajectory.index(min_reached)

        _LOGGER.debug(
            f"📊 Forward pass: min_reached={min_reached:.2f} kWh @ interval {min_index}"
        )

        # PHASE 2: Backward pass - calculate required battery
        required_battery = self._backward_pass(
            n=n,
            spot_prices=spot_prices,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
            target=effective_target,
            balancing=balancing,
        )

        # PHASE 3: Find charging opportunities
        charge_opportunities = self._find_charge_opportunities(
            n=n,
            spot_prices=spot_prices,
            forward_trajectory=forward_trajectory,
            required_battery=required_battery,
            solar_forecast=solar_forecast,
            load_forecast=load_forecast,
            balancing=balancing,
        )

        _LOGGER.info(f"⚡ Found {len(charge_opportunities)} charging opportunities")

        # PHASE 4: Select modes based on solar, prices, and efficiency
        # Key insights from CBB_MODES_DEFINITIVE.md:
        # - At NIGHT (FVE=0): HOME I/II/III are IDENTICAL - all DISCHARGE battery
        # - At NIGHT: HOME UPS is the ONLY mode that CHARGES from grid
        # - HOME II: Preserves battery during day (grid supplements when solar<load)
        # - HOME III: ALL solar → battery, load from grid (max charging)
        #
        # Economic strategy:
        # - Consider round-trip efficiency (typ. 80-85%) when deciding arbitrage
        # - Export solar when export price is high (HOME I with excess solar)
        # - HOME III when we need max battery charge AND grid is cheap

        # Calculate price thresholds - CONSISTENT with _find_charge_opportunities
        prices_sorted = sorted([sp.get("price", 0) for sp in spot_prices])
        avg_price = sum(prices_sorted) / n
        min_price = prices_sorted[0]
        max_price = prices_sorted[-1]

        cheap_threshold = avg_price * 0.75  # Below 75% of average = cheap
        expensive_threshold = avg_price * 1.25  # Above 125% of average = expensive

        # Round-trip efficiency for arbitrage decisions
        # Battery: charge (95% AC/DC) * discharge (88% DC/AC) = ~84%
        round_trip_eff = self.efficiency * 0.95

        _LOGGER.info(
            f"📊 Price analysis: min={min_price:.2f}, cheap<{cheap_threshold:.2f}, "
            f"avg={avg_price:.2f}, expensive>{expensive_threshold:.2f}, max={max_price:.2f}, "
            f"efficiency={round_trip_eff:.0%}"
        )

        # First pass: determine base modes considering all factors
        for i in range(n):
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            load = load_forecast[i] if i < len(load_forecast) else 0.0
            price = spot_prices[i].get("price", 0)
            battery_level = (
                forward_trajectory[i]
                if i < len(forward_trajectory)
                else self.min_capacity
            )
            battery_space = self.max_capacity - battery_level

            if solar < 0.05:
                # ═══ NIGHT (no solar) ═══
                # HOME I/II/III identical - all discharge to 20%
                # Only HOME UPS charges from grid
                # NOTE: Night behaviour is intentionally HOME I here; later passes may
                # upgrade to HOME UPS based on charging logic/constraints.
                modes[i] = CBB_MODE_HOME_I

            elif solar >= load + 0.1:
                # ═══ DAY with EXCESS SOLAR (solar > load) ═══
                # Options:
                # - HOME I: solar→load, excess→battery (free charging!)
                # - HOME III: ALL solar→battery, load→grid (if want max charge)
                #
                # Decision: Is it worth storing solar for later?
                # breakeven: price_now < price_later * round_trip_eff

                # Excess solar: HOME I covers load and stores/export surplus.
                modes[i] = CBB_MODE_HOME_I

            else:
                # ═══ DAY with SOLAR DEFICIT (0 < solar < load) ═══
                # Options:
                # - HOME I: solar→load, deficit→BATTERY (uses stored energy)
                # - HOME II: solar→load, deficit→GRID (preserves battery)
                # - HOME III: ALL solar→battery, ALL load→GRID (max charging)
                #
                # Key decision: Use battery now or save for later?

                # Calculate if arbitrage is profitable
                # If we use battery now, we lose efficiency
                # breakeven: current_price > avg_future_expensive_price * efficiency

                if price >= expensive_threshold:
                    # EXPENSIVE hour - use battery! (HOME I)
                    if battery_level > self.min_capacity + 1.0:
                        modes[i] = CBB_MODE_HOME_I
                    else:
                        # Low battery - must use grid (HOME II)
                        modes[i] = CBB_MODE_HOME_II

                elif price <= cheap_threshold:
                    # CHEAP hour - preserve battery for expensive hours
                    if battery_space > 1.0:
                        # Room in battery - charge maximally (HOME III)
                        # ALL solar→battery, consumption from cheap grid
                        modes[i] = CBB_MODE_HOME_III
                    else:
                        # Battery nearly full - preserve it (HOME II)
                        modes[i] = CBB_MODE_HOME_II

                else:
                    # NORMAL price hour
                    # Decision based on expected future prices
                    # If we expect expensive hours later, preserve battery
                    if battery_level > self.min_capacity + 2.0:
                        # Have some battery - use it moderately (HOME I)
                        modes[i] = CBB_MODE_HOME_I
                    else:
                        # Low battery - supplement from grid (HOME II)
                        modes[i] = CBB_MODE_HOME_II

        # Note: PHASE 5 (_apply_charging) will upgrade some intervals to HOME UPS
        # for grid charging during cheap hours based on arbitrage calculation

        # PHASE 5: Apply charging (HOME UPS) based on opportunities
        ups_count = self._apply_charging(
            modes=modes,
            charge_opportunities=charge_opportunities,
            spot_prices=spot_prices,
            balancing=balancing,
            current_capacity=current_capacity,
        )

        _LOGGER.info(f"⚡ Applied {ups_count} UPS intervals from arbitrage analysis")

        # PHASE 5.5: Apply negative price strategy if detected
        if negative_strategy.is_active:
            neg_changes = self._apply_negative_price_strategy(
                modes=modes,
                spot_prices=spot_prices,
                strategy=negative_strategy,
                solar_forecast=solar_forecast,
                load_forecast=load_forecast,
            )
            _LOGGER.info(
                f"⚡ Applied negative price strategy: {neg_changes} intervals adjusted"
            )

        # PHASE 6: Post-processing
        modes = self.mode_selector.enforce_min_mode_duration(
            modes, min_duration_intervals=2
        )
        modes = self.mode_selector.merge_close_ups_intervals(modes, gap_threshold=2)

        # PHASE 7: Final simulation with optimized modes
        final_trajectory, grid_imports, grid_exports = self.simulator.simulate_timeline(
            initial_battery=current_capacity,
            modes=modes,
            solar_forecast=solar_forecast,
            consumption_forecast=load_forecast,
            balancing_indices=self._get_balancing_indices(spot_prices, balancing),
        )

        # Calculate metrics using BOTH buy (spot) and sell (export) prices
        # Net cost = import cost - export revenue
        # NOTE: When export_price < 0, export_revenue is negative → ADDS to cost!
        import_cost = sum(
            grid_imports[i] * spot_prices[i].get("price", 0)
            for i in range(n)
            if i < len(grid_imports)
        )
        export_revenue = sum(
            grid_exports[i] * effective_export_prices[i].get("price", 0)
            for i in range(n)
            if i < len(grid_exports)
        )
        total_cost = import_cost - export_revenue

        # Calculate baseline cost:
        # What would it cost to achieve the SAME final battery level
        # without smart optimization (charging at average price)?
        #
        # Two components:
        # 1. HOME III baseline (normal usage with battery discharge)
        # 2. Value of extra energy stored vs baseline
        baseline_trajectory, baseline_imports, baseline_exports = (
            self.simulator.simulate_timeline(
                initial_battery=current_capacity,
                modes=[CBB_MODE_HOME_III] * n,  # HOME III = normal battery usage
                solar_forecast=solar_forecast,
                consumption_forecast=load_forecast,
            )
        )
        baseline_import_cost = sum(
            baseline_imports[i] * spot_prices[i].get("price", 0)
            for i in range(n)
            if i < len(baseline_imports)
        )
        baseline_export_revenue = sum(
            baseline_exports[i] * effective_export_prices[i].get("price", 0)
            for i in range(n)
            if i < len(baseline_exports)
        )
        baseline_consumption_cost = baseline_import_cost - baseline_export_revenue

        # Calculate energy stored above baseline
        final_battery = final_trajectory[-1] if final_trajectory else current_capacity
        baseline_final = (
            baseline_trajectory[-1] if baseline_trajectory else current_capacity
        )
        extra_energy_stored = max(0, final_battery - baseline_final)

        # What would it cost to charge that extra energy at average price?
        avg_price = sum(p.get("price", 0) for p in spot_prices) / n if n > 0 else 0
        # Account for charging efficiency (95% AC/DC)
        extra_energy_cost_baseline = extra_energy_stored / 0.95 * avg_price

        # Total baseline = consumption cost + hypothetical charging cost
        baseline_cost = baseline_consumption_cost + extra_energy_cost_baseline

        _LOGGER.debug(
            f"Baseline calculation: consumption={baseline_consumption_cost:.2f}, "
            f"extra_energy={extra_energy_stored:.2f} kWh at avg {avg_price:.2f} = "
            f"{extra_energy_cost_baseline:.2f}, total={baseline_cost:.2f}"
        )

        total_grid_import = sum(grid_imports)
        total_grid_export = sum(grid_exports)
        total_solar = sum(solar_forecast[:n])
        final_ups_count = modes.count(CBB_MODE_HOME_UPS)

        # Mode distribution
        mode_dist = {
            "HOME_I": modes.count(CBB_MODE_HOME_I),
            "HOME_II": modes.count(1),
            "HOME_III": modes.count(2),
            "HOME_UPS": modes.count(CBB_MODE_HOME_UPS),
        }

        calc_time = (time.time() - start_time) * 1000

        savings = baseline_cost - total_cost

        _LOGGER.info(
            f"✅ HYBRID optimization completed: "
            f"total_cost={total_cost:.2f} Kč, baseline={baseline_cost:.2f} Kč, "
            f"savings={savings:.2f} Kč, UPS={final_ups_count}, "
            f"modes={mode_dist}, time={calc_time:.0f}ms"
        )

        return OptimizationResult(
            modes=modes,
            modes_distribution=mode_dist,
            total_cost_czk=round(total_cost, 2),
            baseline_cost_czk=round(baseline_cost, 2),
            total_grid_import_kwh=round(total_grid_import, 2),
            total_grid_export_kwh=round(total_grid_export, 2),
            total_solar_kwh=round(total_solar, 2),
            ups_intervals_count=final_ups_count,
            charging_kwh=round(total_grid_import, 2),
            final_battery_kwh=round(
                final_trajectory[-1] if final_trajectory else current_capacity, 2
            ),
            is_balancing_mode=balancing.is_active,
            balancing_deadline=(
                balancing.deadline.isoformat() if balancing.deadline else None
            ),
            balancing_holding_start=(
                balancing.holding_start.isoformat() if balancing.holding_start else None
            ),
            balancing_holding_end=(
                balancing.holding_end.isoformat() if balancing.holding_end else None
            ),
            calculation_time_ms=round(calc_time, 1),
            # Negative price strategy fields
            negative_price_detected=negative_strategy.is_active,
            negative_price_start_idx=negative_strategy.negative_start_idx,
            negative_price_end_idx=negative_strategy.negative_end_idx,
            negative_price_excess_solar_kwh=round(
                negative_strategy.excess_solar_kwh, 2
            ),
            negative_price_curtailment_kwh=round(
                negative_strategy.curtailment_if_full_kwh, 2
            ),
            negative_price_actions=negative_strategy.recommended_actions or [],
        )

    def _parse_balancing(
        self,
        balancing_plan: Optional[Dict[str, Any]],
    ) -> BalancingConfig:
        """Parse balancing plan into config object."""
        if not balancing_plan:
            return BalancingConfig()

        try:
            # Parse holding times
            holding_start_raw = balancing_plan.get("holding_start")
            holding_end_raw = balancing_plan.get("holding_end")

            holding_start = None
            holding_end = None

            if holding_start_raw:
                if isinstance(holding_start_raw, str):
                    holding_start = datetime.fromisoformat(holding_start_raw)
                else:
                    holding_start = holding_start_raw
                if holding_start.tzinfo is None:
                    holding_start = dt_util.as_local(holding_start)

            if holding_end_raw:
                if isinstance(holding_end_raw, str):
                    holding_end = datetime.fromisoformat(holding_end_raw)
                else:
                    holding_end = holding_end_raw
                if holding_end.tzinfo is None:
                    holding_end = dt_util.as_local(holding_end)

            # Parse preferred intervals
            preferred = set()
            for iv in balancing_plan.get("charging_intervals", []):
                if isinstance(iv, str):
                    ts = datetime.fromisoformat(iv)
                elif isinstance(iv, dict):
                    ts = datetime.fromisoformat(iv.get("timestamp", ""))
                else:
                    continue
                if ts.tzinfo is None:
                    ts = dt_util.as_local(ts)
                preferred.add(ts)

            config = BalancingConfig(
                is_active=True,
                deadline=holding_start,  # Must reach 100% by holding_start
                holding_start=holding_start,
                holding_end=holding_end,
                preferred_intervals=preferred,
                reason=balancing_plan.get("reason", "unknown"),
            )

            _LOGGER.warning(
                f"🔋 BALANCING MODE: deadline={holding_start.strftime('%H:%M') if holding_start else 'N/A'}, "
                f"holding until {holding_end.strftime('%H:%M') if holding_end else 'N/A'}, "
                f"preferred={len(preferred)}"
            )

            return config

        except (ValueError, TypeError, KeyError) as e:
            _LOGGER.error(f"Failed to parse balancing plan: {e}")
            return BalancingConfig()

    def _backward_pass(
        self,
        n: int,
        spot_prices: List[Dict[str, Any]],
        solar_forecast: List[float],
        load_forecast: List[float],
        target: float,
        balancing: BalancingConfig,
    ) -> List[float]:
        """Calculate required battery at each interval.

        Works backwards from target to determine what battery level
        is needed at each point to reach target at the end.
        """
        required = [0.0] * (n + 1)

        if balancing.is_active and balancing.deadline:
            # Find deadline index
            deadline_idx = n
            for i, sp in enumerate(spot_prices):
                try:
                    ts = datetime.fromisoformat(sp["time"])
                    if ts.tzinfo is None:
                        ts = dt_util.as_local(ts)
                    if ts >= balancing.deadline:
                        deadline_idx = i
                        break
                except (ValueError, TypeError):
                    continue

            # Must be at 100% at deadline
            required[deadline_idx] = self.max_capacity

            # Backward from deadline
            for i in range(deadline_idx - 1, -1, -1):
                solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
                load = load_forecast[i] if i < len(load_forecast) else 0.125

                if solar >= load:
                    net = solar - load
                    required[i] = required[i + 1] - net
                else:
                    drain = (load - solar) / self.efficiency
                    required[i] = required[i + 1] + drain

                required[i] = min(required[i], self.max_capacity)

            # After deadline: maintain 100%
            for i in range(deadline_idx, n + 1):
                required[i] = self.max_capacity

            _LOGGER.info(
                f"📈 Balancing backward pass: required_start={required[0]:.2f} kWh, "
                f"deadline_idx={deadline_idx}, required_at_deadline={required[deadline_idx]:.2f} kWh"
            )
        else:
            # Normal backward pass to target
            required[n] = max(target, self.min_capacity)

            for i in range(n - 1, -1, -1):
                solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
                load = load_forecast[i] if i < len(load_forecast) else 0.125

                if solar >= load:
                    net = solar - load
                    required[i] = required[i + 1] - net
                else:
                    drain = (load - solar) / self.efficiency
                    required[i] = required[i + 1] + drain

                required[i] = min(required[i], self.max_capacity)

            _LOGGER.debug(
                f"📈 Normal backward pass: required_start={required[0]:.2f} kWh"
            )

        return required

    def _find_charge_opportunities(
        self,
        n: int,
        spot_prices: List[Dict[str, Any]],
        forward_trajectory: List[float],
        required_battery: List[float],
        solar_forecast: List[float],
        load_forecast: List[float],
        balancing: BalancingConfig,  # noqa: ARG002 - kept for API compatibility
    ) -> List[Dict[str, Any]]:
        """Find intervals where charging is beneficial using PRICE ARBITRAGE.

        Strategy:
        1. Find EXPENSIVE intervals (above avg) where we want to discharge
        2. Find CHEAP intervals (below avg) where we can charge
        3. Split charging into TWO phases:
           a) MORNING cheap hours (before expensive) - for arbitrage
           b) EVENING cheap hours (after expensive) - for reaching target
        4. Calculate if arbitrage is profitable (cheap_price * 1/efficiency < expensive_price)
        """
        _ = balancing
        prices = [sp.get("price", 0) for sp in spot_prices]
        avg_price = sum(prices) / n if n > 0 else 0

        # CONSISTENT thresholds with PHASE 4
        cheap_threshold = avg_price * 0.75  # Below 75% of average = cheap
        expensive_threshold = avg_price * 1.25  # Above 125% of average = expensive

        # Find cheap and expensive intervals
        cheap_intervals = []
        expensive_intervals = []
        last_expensive_idx = -1

        for i in range(n):
            price = prices[i]
            solar = solar_forecast[i] if i < len(solar_forecast) else 0
            load = load_forecast[i] if i < len(load_forecast) else 0

            if price <= cheap_threshold:
                cheap_intervals.append(
                    {
                        "index": i,
                        "time": spot_prices[i].get("time", ""),
                        "price": price,
                        "solar": solar,
                        "load": load,
                    }
                )
            elif price >= expensive_threshold and solar < 0.1:
                # Expensive AND no solar = good for discharge
                expensive_intervals.append(
                    {
                        "index": i,
                        "price": price,
                        "load": load,
                    }
                )
                last_expensive_idx = i

        if not cheap_intervals:
            _LOGGER.debug(f"No cheap intervals found (threshold={cheap_threshold:.2f})")
            return []

        # Split cheap intervals into BEFORE and AFTER expensive hours
        # This enables two-phase charging strategy
        cheap_before = [c for c in cheap_intervals if c["index"] < last_expensive_idx]
        cheap_after = [c for c in cheap_intervals if c["index"] > last_expensive_idx]

        # Sort each group by price (cheapest first)
        cheap_before.sort(key=lambda x: x["price"])
        cheap_after.sort(key=lambda x: x["price"])

        # Calculate energy needed for expensive intervals
        energy_for_expensive = sum(exp["load"] for exp in expensive_intervals)

        # Also need to maintain target SoC at end
        final_battery = forward_trajectory[-1] if forward_trajectory else 0
        target = required_battery[-1] if required_battery else self.target_capacity
        energy_deficit = max(0, target - final_battery)

        # Account for round-trip efficiency
        round_trip_efficiency = self.efficiency * 0.95  # ~84%
        charge_per_interval = self.charge_rate_kw * 0.25 * self.efficiency  # ~0.62 kWh

        # PHASE A: Morning charging for arbitrage (before expensive hours)
        energy_for_morning = energy_for_expensive / round_trip_efficiency
        battery_space = self.max_capacity - (
            forward_trajectory[0] if forward_trajectory else 0
        )
        energy_for_morning = min(energy_for_morning, battery_space)
        intervals_morning = int(energy_for_morning / charge_per_interval) + 1
        selected_morning = cheap_before[:intervals_morning]

        # PHASE B: Evening charging for target (after expensive hours)
        # For target achievement, we may need to charge even at non-cheap prices
        # So we use ALL intervals after expensive hours, sorted by price
        all_after = []
        for i in range(n):
            if i > last_expensive_idx:
                price = prices[i]
                solar = solar_forecast[i] if i < len(solar_forecast) else 0
                all_after.append(
                    {
                        "index": i,
                        "time": spot_prices[i].get("time", ""),
                        "price": price,
                        "solar": solar,
                    }
                )
        all_after.sort(key=lambda x: x["price"])

        # Calculate how much we need to charge in the evening
        energy_for_evening = energy_deficit / self.efficiency
        intervals_evening = int(energy_for_evening / charge_per_interval) + 1
        # Select cheapest available intervals (not just cheap_threshold)
        selected_evening = all_after[:intervals_evening]

        # Check if arbitrage is profitable
        if expensive_intervals and cheap_before:
            avg_cheap = sum(c["price"] for c in cheap_before) / len(cheap_before)
            avg_expensive = sum(e["price"] for e in expensive_intervals) / len(
                expensive_intervals
            )

            breakeven_price = avg_cheap / round_trip_efficiency
            if breakeven_price < avg_expensive:
                _LOGGER.info(
                    f"💰 Arbitrage profitable: buy@{avg_cheap:.2f} → sell@{avg_expensive:.2f} "
                    f"(breakeven={breakeven_price:.2f})"
                )
            else:
                _LOGGER.debug(
                    f"Arbitrage not profitable: {breakeven_price:.2f} >= {avg_expensive:.2f}"
                )
                # Skip morning charging if not profitable
                selected_morning = []

        # Combine both phases
        selected = selected_morning + selected_evening

        _LOGGER.info(
            f"⚡ Charge plan: morning={len(selected_morning)} (for {energy_for_expensive:.1f} kWh expensive), "
            f"evening={len(selected_evening)} (for {energy_deficit:.1f} kWh deficit) → {len(selected)} total UPS"
        )

        return selected

    def _apply_charging(
        self,
        modes: List[int],
        charge_opportunities: List[Dict[str, Any]],
        spot_prices: List[Dict[str, Any]],
        balancing: BalancingConfig,
        current_capacity: float = 0.0,
    ) -> int:
        """Apply HOME UPS to charging opportunities.

        charge_opportunities already contains only the cheapest intervals needed.
        """
        ups_added = 0

        if balancing.is_active:
            # BALANCING MODE: Special logic - must charge to deadline
            ups_added = self._apply_balancing_charging(
                modes=modes,
                spot_prices=spot_prices,
                charge_opportunities=charge_opportunities,
                balancing=balancing,
                current_capacity=current_capacity,
            )
        else:
            # Normal mode: Apply UPS to all selected opportunities
            for opp in charge_opportunities:
                idx = opp["index"]
                if modes[idx] != CBB_MODE_HOME_UPS:
                    modes[idx] = CBB_MODE_HOME_UPS
                    ups_added += 1

            if ups_added > 0:
                avg_price = sum(o["price"] for o in charge_opportunities) / len(
                    charge_opportunities
                )
                _LOGGER.debug(
                    f"Applied {ups_added} UPS intervals at avg price {avg_price:.2f} CZK/kWh"
                )

        return ups_added

    def _apply_balancing_charging(  # noqa: C901
        self,
        modes: List[int],
        spot_prices: List[Dict[str, Any]],
        charge_opportunities: List[Dict[str, Any]],
        balancing: BalancingConfig,
        current_capacity: float = 0.0,
    ) -> int:
        """Apply charging for balancing mode with priorities.

        MUST charge battery to 100% before deadline!
        """
        n = len(modes)
        ups_added = 0

        # Calculate how many intervals we need to reach 100%
        required_kwh = self.max_capacity - current_capacity
        charge_per_interval = self.charge_rate_kw * (self.interval_minutes / 60) * 0.95
        intervals_needed = int(required_kwh / charge_per_interval) + 2  # +2 for safety

        _LOGGER.info(
            f"🔋 Balancing: need {required_kwh:.2f} kWh, "
            f"~{charge_per_interval:.2f} kWh/interval, "
            f"need {intervals_needed} intervals"
        )

        # Find deadline index
        deadline_idx = n
        if balancing.deadline:
            for i, sp in enumerate(spot_prices):
                try:
                    ts = datetime.fromisoformat(sp["time"])
                    if ts.tzinfo is None:
                        ts = dt_util.as_local(ts)
                    if ts >= balancing.deadline:
                        deadline_idx = i
                        break
                except (ValueError, TypeError):
                    continue

        # Priority 1: Preferred intervals
        preferred_used = 0
        for i, sp in enumerate(spot_prices):
            if i >= deadline_idx:
                break
            try:
                ts = datetime.fromisoformat(sp["time"])
                if ts.tzinfo is None:
                    ts = dt_util.as_local(ts)
                if (
                    balancing.preferred_intervals is not None
                    and ts in balancing.preferred_intervals
                ):
                    if modes[i] != CBB_MODE_HOME_UPS:
                        modes[i] = CBB_MODE_HOME_UPS
                        preferred_used += 1
                        ups_added += 1
            except (ValueError, TypeError):
                continue

        # Priority 2: Cheapest intervals before deadline
        # Calculate remaining intervals needed after preferred
        remaining_needed = max(0, intervals_needed - preferred_used)

        opportunities_before_deadline = [
            opp
            for opp in charge_opportunities
            if opp["index"] < deadline_idx and modes[opp["index"]] != CBB_MODE_HOME_UPS
        ]
        opportunities_before_deadline.sort(key=lambda x: x["price"])

        additional_added = 0
        # Use remaining_needed instead of hardcoded 20!
        for opp in opportunities_before_deadline[:remaining_needed]:
            idx = opp["index"]
            modes[idx] = CBB_MODE_HOME_UPS
            additional_added += 1
            ups_added += 1

        # If still not enough, add ALL available intervals before deadline
        if ups_added < intervals_needed:
            for i in range(deadline_idx):
                if modes[i] != CBB_MODE_HOME_UPS:
                    modes[i] = CBB_MODE_HOME_UPS
                    additional_added += 1
                    ups_added += 1
                    if ups_added >= intervals_needed:
                        break

        # Priority 3: Holding period (deadline to holding_end)
        holding_added = 0
        if balancing.holding_start and balancing.holding_end:
            for i, sp in enumerate(spot_prices):
                try:
                    ts = datetime.fromisoformat(sp["time"])
                    if ts.tzinfo is None:
                        ts = dt_util.as_local(ts)
                    ts_end = ts + timedelta(minutes=self.interval_minutes)

                    # Overlaps holding period?
                    if ts < balancing.holding_end and ts_end > balancing.holding_start:
                        if modes[i] != CBB_MODE_HOME_UPS:
                            holding_added += 1
                        modes[i] = CBB_MODE_HOME_UPS
                        ups_added += 1
                except (ValueError, TypeError):
                    continue

        _LOGGER.warning(
            f"⚡ BALANCING charging: preferred={preferred_used}, "
            f"additional={additional_added}, holding={holding_added}, "
            f"total_UPS={ups_added}"
        )

        return ups_added

    def _get_balancing_indices(
        self,
        spot_prices: List[Dict[str, Any]],
        balancing: BalancingConfig,
    ) -> Set[int]:
        """Get set of indices that are in balancing period."""
        if not balancing.is_active:
            return set()

        indices = set()

        for i, sp in enumerate(spot_prices):
            try:
                ts = datetime.fromisoformat(sp["time"])
                if ts.tzinfo is None:
                    ts = dt_util.as_local(ts)

                # Before deadline = charging
                if balancing.deadline and ts < balancing.deadline:
                    indices.add(i)

                # During holding = holding
                if balancing.holding_start and balancing.holding_end:
                    ts_end = ts + timedelta(minutes=self.interval_minutes)
                    if ts < balancing.holding_end and ts_end > balancing.holding_start:
                        indices.add(i)
            except (ValueError, TypeError):
                continue

        return indices

    def _detect_negative_prices(
        self,
        export_prices: List[Dict[str, Any]],
        solar_forecast: List[float],
        load_forecast: List[float],
        current_capacity: float,
    ) -> NegativePriceStrategy:
        """Detect negative EXPORT price periods and calculate preparation strategy.

        Scans the EXPORT price forecast for negative prices and calculates how much
        battery space is needed to absorb solar during those periods.

        IMPORTANT: We use export_prices (sell prices), NOT spot_prices (buy prices)!
        The export price is what we actually get/pay when exporting to grid.
        Export price can be negative even when spot price is positive (due to fees).

        Strategy:
        - Find all negative EXPORT price intervals
        - Calculate expected solar excess during negative prices
        - Determine how much battery space we need
        - Calculate value of pre-draining vs curtailment

        Args:
            export_prices: List of EXPORT price dicts with 'time' and 'price'
                          These are the SELL prices, not buy prices!
            solar_forecast: Solar kWh for each interval
            load_forecast: Load kWh for each interval
            current_capacity: Current battery level (kWh)

        Returns:
            NegativePriceStrategy with detection results and recommendations
        """
        # Find negative EXPORT price intervals
        negative_indices = [
            i for i, sp in enumerate(export_prices) if sp.get("price", 0) < 0
        ]

        if not negative_indices:
            return NegativePriceStrategy(is_active=False)

        neg_start = negative_indices[0]
        neg_end = negative_indices[-1] + 1

        # Calculate solar and load during negative prices
        solar_during_neg = sum(
            solar_forecast[i] for i in negative_indices if i < len(solar_forecast)
        )
        load_during_neg = sum(
            load_forecast[i] for i in negative_indices if i < len(load_forecast)
        )
        excess_solar = max(0, solar_during_neg - load_during_neg)

        # How much battery space do we need?
        usable_capacity = self.max_capacity - self.min_capacity
        space_needed = min(excess_solar, usable_capacity)

        # Target SoC before negative prices (lower = more room for solar)
        target_soc = self.min_capacity + max(0, usable_capacity - excess_solar)
        target_soc = max(target_soc, self.min_capacity)  # Never below min

        # Calculate value
        # - If we drain battery evening before, we can sell at high prices
        # - During negative, we absorb solar instead of paying to export
        avg_neg_price = sum(
            export_prices[i].get("price", 0) for i in negative_indices
        ) / len(negative_indices)

        # Potential savings: excess_solar × |negative_price|
        curtailment_avoided_value = excess_solar * abs(avg_neg_price)

        # Find evening peak prices before negative period (for drain value)
        # Use export prices to calculate what we'd get for selling
        evening_indices = [
            i for i in range(neg_start) if export_prices[i].get("price", 0) > 0
        ]
        if evening_indices:
            prices = [export_prices[i].get("price", 0) for i in evening_indices]
            avg_evening_price = sum(prices) / len(prices)
        else:
            avg_evening_price = 0

        # Energy we need to drain
        drain_needed = max(0, current_capacity - target_soc)

        # Value of draining: sell at evening export prices
        drain_value = drain_needed * avg_evening_price

        # Recommended actions
        actions: List[str] = []

        if drain_needed > 0:
            actions.append(
                f"DRAIN: Vybít {drain_needed:.1f} kWh před {neg_start}. interval"
            )

            # Suggest methods
            hours_to_negative = neg_start * (self.interval_minutes / 60)
            if hours_to_negative > 4:
                actions.append("  - Bojler: zapnout ohřev (2 kW = 8 kWh/4h)")
            if hours_to_negative > 2:
                actions.append("  - Spotřeba: zvýšit odběr domácnosti")
            actions.append(
                f"  - Cílový SoC: {target_soc / self.max_capacity * 100:.0f}% před zápornými"
            )

        actions.append(
            f"ABSORB: Během záporných cen baterie pohltí {min(space_needed, usable_capacity):.1f} kWh"
        )

        if excess_solar > usable_capacity:
            curtailment = excess_solar - usable_capacity
            actions.append(
                f"⚠️ CURTAILMENT: {curtailment:.1f} kWh se nevejde - nutné omezit export"
            )
            actions.append("  - Nastavit p_max_feed_grid = 0 pro záporné hodiny")

        _LOGGER.warning(
            f"⚡ NEGATIVE PRICE DETECTED: intervals {neg_start}-{neg_end}, "
            f"solar={solar_during_neg:.1f}kWh, excess={excess_solar:.1f}kWh, "
            f"space_needed={space_needed:.1f}kWh, drain={drain_needed:.1f}kWh, "
            f"value={curtailment_avoided_value:.1f}Kč"
        )

        return NegativePriceStrategy(
            is_active=True,
            negative_start_idx=neg_start,
            negative_end_idx=neg_end,
            expected_solar_kwh=solar_during_neg,
            expected_load_kwh=load_during_neg,
            excess_solar_kwh=excess_solar,
            battery_space_needed_kwh=space_needed,
            target_soc_before_negative=target_soc,
            drain_value_czk=drain_value,
            curtailment_if_full_kwh=max(0, excess_solar - usable_capacity),
            recommended_actions=actions,
        )

    def _apply_negative_price_strategy(
        self,
        modes: List[int],
        spot_prices: List[Dict[str, Any]],
        strategy: NegativePriceStrategy,
        solar_forecast: List[float],
        load_forecast: List[float],
    ) -> int:
        """Apply mode changes for negative price strategy.

        During negative prices:
        - Use HOME I to absorb solar into battery
        - Battery fills from solar excess instead of exporting

        Before negative prices:
        - HOME II to preserve battery (grid supplements consumption)
        - Let morning solar export at low-but-positive prices

        Args:
            modes: List of modes to modify (in place)
            spot_prices: Price data
            strategy: Negative price strategy from detection
            solar_forecast: Solar kWh per interval
            load_forecast: Load kWh per interval

        Returns:
            Number of modes changed
        """
        _ = load_forecast
        if not strategy.is_active:
            return 0

        changes = 0
        n = len(modes)

        # Strategy for hours BEFORE negative prices
        # Goal: Keep battery as empty as possible to absorb solar later
        for i in range(min(strategy.negative_start_idx, n)):
            price = spot_prices[i].get("price", 0)
            solar = solar_forecast[i] if i < len(solar_forecast) else 0

            if solar > 0.1:
                # Daytime before negative: Let solar export, preserve battery
                # HOME II: Solar covers load, excess exports, battery untouched
                # (Actually HOME I also works - excess goes to battery first)
                #
                # Key insight: We CANNOT prevent solar from charging battery!
                # Best we can do: encourage discharge by using HOME I
                # and hoping consumption drains battery
                if price > 0:
                    # Positive price - let battery discharge if needed
                    modes[i] = CBB_MODE_HOME_I
                    changes += 1
            else:
                # Night before negative: discharge battery!
                # HOME I will use battery for consumption
                modes[i] = CBB_MODE_HOME_I
                changes += 1

        # During negative prices: HOME I to absorb solar
        for i in range(strategy.negative_start_idx, min(strategy.negative_end_idx, n)):
            # HOME I: Solar excess → battery → grid
            # Since battery has room (we drained it), solar fills battery
            modes[i] = CBB_MODE_HOME_I
            changes += 1

        # After negative prices: normal operation
        # (handled by main algorithm)

        _LOGGER.info(
            f"⚡ Applied negative price strategy: {changes} intervals modified, "
            f"target SoC before negative: {strategy.target_soc_before_negative:.1f} kWh "
            f"({strategy.target_soc_before_negative / self.max_capacity * 100:.0f}%)"
        )

        return changes

    def _empty_result(self) -> OptimizationResult:
        """Return empty result for edge cases."""
        return OptimizationResult(
            modes=[],
            modes_distribution={
                "HOME_I": 0,
                "HOME_II": 0,
                "HOME_III": 0,
                "HOME_UPS": 0,
            },
            total_cost_czk=0,
            total_grid_import_kwh=0,
            total_grid_export_kwh=0,
            total_solar_kwh=0,
            ups_intervals_count=0,
            charging_kwh=0,
            final_battery_kwh=0,
            is_balancing_mode=False,
            balancing_deadline=None,
            balancing_holding_start=None,
            balancing_holding_end=None,
            calculation_time_ms=0,
            # Negative price strategy defaults
            negative_price_detected=False,
            negative_price_start_idx=0,
            negative_price_end_idx=0,
            negative_price_excess_solar_kwh=0,
            negative_price_curtailment_kwh=0,
            negative_price_actions=[],
        )
