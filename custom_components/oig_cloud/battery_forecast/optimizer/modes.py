"""Mode selector - intelligent mode selection logic.

Provides logic for selecting optimal CBB mode based on:
- Solar production
- Spot prices
- Battery state
- Future demand
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from ..types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
)

_LOGGER = logging.getLogger(__name__)


class ModeSelector:
    """Selects optimal CBB mode for each interval.

    Selection logic:
    - HOME I: Cheap electricity, preserve battery for expensive hours
    - HOME II: Preserve battery, solar only to consumption
    - HOME III: Default solar priority mode
    - HOME UPS: Active AC charging from grid
    """

    def __init__(
        self,
        max_capacity: float,
        min_capacity: float,
        target_capacity: float,
        charge_rate_kw: float = 2.8,
    ) -> None:
        """Initialize mode selector.

        Args:
            max_capacity: Maximum battery capacity (kWh)
            min_capacity: Minimum battery capacity (kWh)
            target_capacity: Target battery capacity (kWh)
            charge_rate_kw: AC charging rate (kW)
        """
        self.max_capacity = max_capacity
        self.min_capacity = min_capacity
        self.target_capacity = target_capacity
        self.charge_rate_kw = charge_rate_kw
        self.max_charge_per_interval = charge_rate_kw / 4.0  # kWh per 15min

    def select_mode(
        self,
        solar_kwh: float,
        consumption_kwh: float,
        battery_kwh: float,
        spot_price: float,
        avg_price: float,
        future_prices: List[float],
        needs_charging: bool = False,
        is_balancing: bool = False,
        is_holding: bool = False,
    ) -> Tuple[int, str]:
        """Select optimal mode for a single interval.

        Args:
            solar_kwh: Expected solar production
            consumption_kwh: Expected consumption
            battery_kwh: Current battery level
            spot_price: Current spot price
            avg_price: Average spot price
            future_prices: Future spot prices (next 3h)
            needs_charging: True if battery needs charging
            is_balancing: True if in balancing period
            is_holding: True if in holding period

        Returns:
            Tuple of (mode, reason)
        """
        # Priority 1: Balancing takes precedence
        if is_holding:
            return CBB_MODE_HOME_UPS, "Holding 100% for balancing"

        if is_balancing:
            return CBB_MODE_HOME_UPS, "Charging for balancing target"

        # Priority 2: Battery critically low
        battery_pct = battery_kwh / self.max_capacity * 100
        if battery_pct < 25 and spot_price < avg_price:
            return CBB_MODE_HOME_UPS, f"Emergency charging - battery {battery_pct:.0f}%"

        # Priority 3: Needs charging and cheap electricity
        if needs_charging and spot_price < avg_price * 0.8:
            return CBB_MODE_HOME_UPS, f"Cheap charging at {spot_price:.2f} CZK"

        # Priority 4: No solar - use grid mode
        if solar_kwh < 0.01:
            # Check if there's expensive period coming
            if future_prices and max(future_prices) > spot_price * 1.4:
                return CBB_MODE_HOME_I, "Grid priority - expensive hours ahead"
            return CBB_MODE_HOME_I, "Grid priority - no solar"

        # Priority 5: Good solar production
        if solar_kwh > 0.3:
            # Check if we should store for later
            if future_prices and max(future_prices) > spot_price * 1.5:
                if battery_kwh < self.max_capacity - 1.0:
                    return CBB_MODE_HOME_III, "Storing solar for expensive hours"

            # Check if cheap enough to use grid
            if spot_price < avg_price * 0.7:
                return CBB_MODE_HOME_I, "Grid priority - very cheap electricity"

            return CBB_MODE_HOME_III, f"Solar priority - {solar_kwh:.1f} kWh"

        # Default: Solar priority
        return CBB_MODE_HOME_III, "Default solar priority"

    def select_modes_for_timeline(
        self,
        spot_prices: List[Dict[str, Any]],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        battery_trajectory: List[float],
        required_battery: List[float],
        balancing_indices: Optional[set] = None,
        holding_indices: Optional[set] = None,
    ) -> List[int]:
        """Select modes for entire timeline.

        Args:
            spot_prices: List of spot price dicts
            solar_forecast: Solar kWh for each interval
            consumption_forecast: Consumption kWh for each interval
            battery_trajectory: Battery level at each interval
            required_battery: Required battery level at each interval
            balancing_indices: Indices in balancing period
            holding_indices: Indices in holding period

        Returns:
            List of mode values for each interval
        """
        n = len(spot_prices)
        modes = [CBB_MODE_HOME_III] * n  # Default to HOME III

        balancing_indices = balancing_indices or set()
        holding_indices = holding_indices or set()

        # Calculate average price
        prices = [sp.get("price", 0) for sp in spot_prices]
        avg_price = sum(prices) / len(prices) if prices else 0

        for i in range(n):
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            consumption = (
                consumption_forecast[i] if i < len(consumption_forecast) else 0.125
            )
            battery = (
                battery_trajectory[i]
                if i < len(battery_trajectory)
                else self.min_capacity
            )
            required = (
                required_battery[i] if i < len(required_battery) else self.min_capacity
            )
            price = prices[i] if i < len(prices) else 0

            # Get future prices (next 12 intervals = 3 hours)
            future_prices = prices[i + 1 : i + 13] if i + 1 < n else []

            # Check if charging needed
            needs_charging = battery < required

            mode, reason = self.select_mode(
                solar_kwh=solar,
                consumption_kwh=consumption,
                battery_kwh=battery,
                spot_price=price,
                avg_price=avg_price,
                future_prices=future_prices,
                needs_charging=needs_charging,
                is_balancing=i in balancing_indices,
                is_holding=i in holding_indices,
            )

            modes[i] = mode

        return modes

    def find_charging_opportunities(
        self,
        spot_prices: List[Dict[str, Any]],
        battery_trajectory: List[float],
        required_battery: List[float],
        max_intervals: int = 20,
        before_deadline: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Find best intervals for charging.

        Args:
            spot_prices: List of spot price dicts
            battery_trajectory: Current battery trajectory
            required_battery: Required battery at each interval
            max_intervals: Maximum charging intervals to return
            before_deadline: Only consider intervals before this index

        Returns:
            List of charging opportunities sorted by price
        """
        opportunities = []
        n = len(spot_prices)
        deadline = before_deadline or n

        for i in range(min(deadline, n)):
            battery = battery_trajectory[i] if i < len(battery_trajectory) else 0
            required = required_battery[i] if i < len(required_battery) else 0

            deficit = required - battery

            if deficit > 0.1:  # Need at least 100Wh
                opportunities.append(
                    {
                        "index": i,
                        "time": spot_prices[i].get("time", ""),
                        "price": spot_prices[i].get("price", 0),
                        "deficit": deficit,
                    }
                )

        # Sort by price (cheapest first)
        opportunities.sort(key=lambda x: x["price"])

        return opportunities[:max_intervals]

    def enforce_min_mode_duration(
        self,
        modes: List[int],
        min_duration_intervals: int = 2,
    ) -> List[int]:
        """Enforce minimum mode duration to avoid rapid switching.

        Args:
            modes: List of mode values
            min_duration_intervals: Minimum consecutive intervals for same mode

        Returns:
            Modified modes list with minimum duration enforced
        """
        if len(modes) < min_duration_intervals:
            return modes

        result = modes.copy()

        # Find runs shorter than minimum and extend them
        i = 0
        while i < len(result):
            current_mode = result[i]
            run_start = i

            # Find end of run
            while i < len(result) and result[i] == current_mode:
                i += 1

            run_length = i - run_start

            # If run is too short and it's UPS, extend it
            if (
                run_length < min_duration_intervals
                and current_mode == CBB_MODE_HOME_UPS
            ):
                # Extend forward if possible
                extension_needed = min_duration_intervals - run_length
                for j in range(i, min(i + extension_needed, len(result))):
                    result[j] = current_mode

        return result

    def merge_close_ups_intervals(
        self,
        modes: List[int],
        gap_threshold: int = 2,
    ) -> List[int]:
        """Merge UPS intervals that are close together.

        If two UPS blocks are separated by only a few intervals,
        merge them to avoid unnecessary mode switching.

        Args:
            modes: List of mode values
            gap_threshold: Maximum gap size to merge

        Returns:
            Modified modes list with merged UPS blocks
        """
        result = modes.copy()

        # Find UPS runs
        ups_runs = []
        i = 0
        while i < len(result):
            if result[i] == CBB_MODE_HOME_UPS:
                start = i
                while i < len(result) and result[i] == CBB_MODE_HOME_UPS:
                    i += 1
                ups_runs.append((start, i))
            else:
                i += 1

        # Merge runs that are close
        for j in range(len(ups_runs) - 1):
            end_current = ups_runs[j][1]
            start_next = ups_runs[j + 1][0]
            gap = start_next - end_current

            if 0 < gap <= gap_threshold:
                # Fill gap with UPS
                for k in range(end_current, start_next):
                    result[k] = CBB_MODE_HOME_UPS

        return result
