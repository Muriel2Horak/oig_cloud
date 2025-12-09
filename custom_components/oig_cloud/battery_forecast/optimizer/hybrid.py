"""HYBRID optimizer - main optimization algorithm.

This module implements the HYBRID multi-mode optimization algorithm
that combines forward/backward passes with price-aware charging.

Key features:
- Forward pass: Simulate with HOME I to find minimum points
- Backward pass: Calculate required battery for target
- Price-aware UPS: Charge in cheapest intervals
- Balancing support: Override for 100% target with deadline
"""

import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

from homeassistant.util import dt as dt_util

from ..types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
    CBB_MODE_NAMES,
    BalancingPlan,
    OptimizationResult,
    DEFAULT_EFFICIENCY,
    DEFAULT_CHARGE_RATE_KW,
    INTERVAL_MINUTES,
)
from ..timeline.simulator import SoCSimulator
from .modes import ModeSelector

_LOGGER = logging.getLogger(__name__)


@dataclass
class BalancingConfig:
    """Configuration for balancing mode."""

    is_active: bool = False
    deadline: Optional[datetime] = None
    holding_start: Optional[datetime] = None
    holding_end: Optional[datetime] = None
    preferred_intervals: Set[datetime] = None
    reason: str = "unknown"

    def __post_init__(self):
        if self.preferred_intervals is None:
            self.preferred_intervals = set()


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
    ) -> OptimizationResult:
        """Run HYBRID optimization.

        Args:
            current_capacity: Current battery level (kWh)
            spot_prices: List of spot price dicts with 'time' and 'price'
            solar_forecast: Solar kWh for each interval
            load_forecast: Load kWh for each interval
            balancing_plan: Optional balancing plan dict

        Returns:
            OptimizationResult with modes and metrics
        """
        start_time = time.time()
        n = len(spot_prices)

        if n == 0:
            return self._empty_result()

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
                if (
                    price >= expensive_threshold
                    and battery_level > self.min_capacity + 1.0
                ):
                    # EXPENSIVE night → discharge battery (HOME I)
                    modes[i] = CBB_MODE_HOME_I
                else:
                    # Normal/cheap night → HOME I (PHASE 5 may upgrade to UPS)
                    modes[i] = CBB_MODE_HOME_I

            elif solar >= load + 0.1:
                # ═══ DAY with EXCESS SOLAR (solar > load) ═══
                # Options:
                # - HOME I: solar→load, excess→battery (free charging!)
                # - HOME III: ALL solar→battery, load→grid (if want max charge)
                #
                # Decision: Is it worth storing solar for later?
                # breakeven: price_now < price_later * round_trip_eff

                if battery_space > 0.5:
                    # Room in battery - charge from solar (HOME I)
                    # This is FREE energy, always worth it
                    modes[i] = CBB_MODE_HOME_I
                else:
                    # Battery full - export excess (HOME I still works)
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
        )

        _LOGGER.info(f"⚡ Applied {ups_count} UPS intervals from arbitrage analysis")

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

        # Calculate metrics
        total_cost = sum(
            grid_imports[i] * spot_prices[i].get("price", 0)
            for i in range(n)
            if i < len(grid_imports)
        )

        # Calculate baseline cost:
        # What would it cost to achieve the SAME final battery level
        # without smart optimization (charging at average price)?
        #
        # Two components:
        # 1. HOME III baseline (normal usage with battery discharge)
        # 2. Value of extra energy stored vs baseline
        baseline_trajectory, baseline_imports, _ = self.simulator.simulate_timeline(
            initial_battery=current_capacity,
            modes=[CBB_MODE_HOME_III] * n,  # HOME III = normal battery usage
            solar_forecast=solar_forecast,
            consumption_forecast=load_forecast,
        )
        baseline_consumption_cost = sum(
            baseline_imports[i] * spot_prices[i].get("price", 0)
            for i in range(n)
            if i < len(baseline_imports)
        )

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

    def _apply_balancing_charging(
        self,
        modes: List[int],
        spot_prices: List[Dict[str, Any]],
        charge_opportunities: List[Dict[str, Any]],
        balancing: BalancingConfig,
    ) -> int:
        """Apply charging for balancing mode with priorities."""
        n = len(modes)
        ups_added = 0

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
                if ts in balancing.preferred_intervals:
                    if modes[i] != CBB_MODE_HOME_UPS:
                        modes[i] = CBB_MODE_HOME_UPS
                        preferred_used += 1
                        ups_added += 1
            except (ValueError, TypeError):
                continue

        # Priority 2: Cheapest intervals before deadline
        opportunities_before_deadline = [
            opp
            for opp in charge_opportunities
            if opp["index"] < deadline_idx and modes[opp["index"]] != CBB_MODE_HOME_UPS
        ]
        opportunities_before_deadline.sort(key=lambda x: x["price"])

        additional_added = 0
        for opp in opportunities_before_deadline[:20]:
            idx = opp["index"]
            modes[idx] = CBB_MODE_HOME_UPS
            additional_added += 1
            ups_added += 1

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
        )
