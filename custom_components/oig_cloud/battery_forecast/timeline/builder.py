"""Timeline builder - creates timeline data structure.

This module handles the creation of timeline intervals with all
required metadata for display and analysis.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
    CBB_MODE_NAMES,
    TimelineInterval,
    INTERVAL_MINUTES,
)

_LOGGER = logging.getLogger(__name__)


class TimelineBuilder:
    """Builds timeline data structure from optimization results.

    The timeline is a list of intervals, each containing:
    - Timestamp and battery state
    - Recommended mode and reason
    - Energy flows (solar, consumption, grid)
    - Cost information
    """

    def __init__(
        self,
        max_capacity: float,
        min_capacity: float,
        efficiency: float = 0.882,
        interval_minutes: int = INTERVAL_MINUTES,
    ) -> None:
        """Initialize timeline builder.

        Args:
            max_capacity: Maximum battery capacity (kWh)
            min_capacity: Minimum battery capacity / user reserve (kWh)
            efficiency: Battery round-trip efficiency
            interval_minutes: Interval length in minutes
        """
        self.max_capacity = max_capacity
        self.min_capacity = min_capacity
        self.efficiency = efficiency
        self.interval_minutes = interval_minutes

    def build_interval(
        self,
        timestamp: datetime,
        battery_kwh: float,
        mode: int,
        solar_kwh: float,
        consumption_kwh: float,
        spot_price: float,
        grid_import_kwh: float = 0.0,
        grid_export_kwh: float = 0.0,
        export_price: Optional[float] = None,
        reason: str = "",
        is_mode_change: bool = False,
        is_balancing: bool = False,
        is_holding: bool = False,
    ) -> TimelineInterval:
        """Build a single timeline interval.

        Args:
            timestamp: Interval start time
            battery_kwh: Battery state at interval START
            mode: Recommended mode (0-3)
            solar_kwh: Expected solar production
            consumption_kwh: Expected consumption
            spot_price: Spot price (buy price) for this interval
            grid_import_kwh: Expected grid import
            grid_export_kwh: Expected grid export
            export_price: Export price (sell price) for this interval.
                         If None, spot_price is used for backward compatibility.
                         NOTE: Can be negative!
            reason: Reason for mode selection
            is_mode_change: True if mode changed from previous
            is_balancing: True if part of balancing plan
            is_holding: True if in holding period

        Returns:
            TimelineInterval dict
        """
        # Calculate battery percentage
        battery_pct = (
            (battery_kwh / self.max_capacity * 100) if self.max_capacity > 0 else 0
        )

        # Determine if charging
        is_charging = grid_import_kwh > 0.01 or (
            solar_kwh > consumption_kwh and battery_kwh < self.max_capacity
        )

        # Calculate interval cost using BOTH buy and sell prices
        # Net cost = import cost - export revenue
        # NOTE: When export_price < 0, export_revenue becomes negative → ADDS to cost!
        effective_export_price = (
            export_price if export_price is not None else spot_price
        )
        import_cost = grid_import_kwh * spot_price
        export_revenue = grid_export_kwh * effective_export_price
        cost_czk = import_cost - export_revenue

        # Get mode name
        mode_name = CBB_MODE_NAMES.get(mode, f"MODE_{mode}")

        return TimelineInterval(
            timestamp=(
                timestamp.isoformat()
                if hasattr(timestamp, "isoformat")
                else str(timestamp)
            ),
            battery_kwh=round(battery_kwh, 3),
            battery_pct=round(battery_pct, 1),
            mode=mode,
            mode_name=mode_name,
            solar_kwh=round(solar_kwh, 3),
            consumption_kwh=round(consumption_kwh, 3),
            grid_import_kwh=round(grid_import_kwh, 3),
            grid_export_kwh=round(grid_export_kwh, 3),
            spot_price=round(spot_price, 2),
            cost_czk=round(cost_czk, 2),
            reason=reason,
            is_mode_change=is_mode_change,
            is_charging=is_charging,
            is_balancing=is_balancing,
            is_holding=is_holding,
        )

    def build_timeline(
        self,
        spot_prices: List[Dict[str, Any]],
        modes: List[int],
        battery_trajectory: List[float],
        solar_forecast: List[float],
        consumption_forecast: List[float],
        grid_imports: Optional[List[float]] = None,
        grid_exports: Optional[List[float]] = None,
        export_prices: Optional[List[Dict[str, Any]]] = None,
        balancing_indices: Optional[set] = None,
        holding_indices: Optional[set] = None,
    ) -> List[TimelineInterval]:
        """Build complete timeline from optimization results.

        Args:
            spot_prices: List of spot price dicts with 'time' and 'price' (buy prices)
            modes: List of mode values for each interval
            battery_trajectory: Battery SoC for each interval START
            solar_forecast: Solar kWh for each interval
            consumption_forecast: Consumption kWh for each interval
            grid_imports: Grid import kWh for each interval
            grid_exports: Grid export kWh for each interval
            export_prices: List of export price dicts with 'time' and 'price' (sell prices)
                          If None, spot_prices used for backward compatibility.
                          NOTE: Export prices can be negative!
            balancing_indices: Set of indices that are balancing
            holding_indices: Set of indices in holding period

        Returns:
            List of TimelineInterval dicts
        """
        n = len(spot_prices)
        timeline: List[TimelineInterval] = []

        # Default empty sets
        balancing_indices = balancing_indices or set()
        holding_indices = holding_indices or set()

        # Default grid flows if not provided
        if grid_imports is None:
            grid_imports = [0.0] * n
        if grid_exports is None:
            grid_exports = [0.0] * n

        # Use export_prices if provided, otherwise None (build_interval will fall back)
        effective_export_prices = export_prices

        prev_mode: Optional[int] = None

        for i in range(n):
            try:
                timestamp = datetime.fromisoformat(spot_prices[i]["time"])
            except (ValueError, KeyError):
                _LOGGER.warning(f"Invalid timestamp at index {i}")
                continue

            mode = modes[i] if i < len(modes) else CBB_MODE_HOME_III
            battery = battery_trajectory[i] if i < len(battery_trajectory) else 0.0
            solar = solar_forecast[i] if i < len(solar_forecast) else 0.0
            consumption = (
                consumption_forecast[i] if i < len(consumption_forecast) else 0.125
            )
            price = spot_prices[i].get("price", 0.0)
            grid_in = grid_imports[i] if i < len(grid_imports) else 0.0
            grid_out = grid_exports[i] if i < len(grid_exports) else 0.0

            # Get export price for this interval (can be negative!)
            export_price_value: Optional[float] = None
            if effective_export_prices and i < len(effective_export_prices):
                export_price_value = effective_export_prices[i].get("price")

            # Detect mode change
            is_mode_change = prev_mode is not None and mode != prev_mode
            prev_mode = mode

            # Generate reason
            reason = self._generate_reason(
                mode=mode,
                is_balancing=i in balancing_indices,
                is_holding=i in holding_indices,
                battery=battery,
                solar=solar,
                price=price,
            )

            interval = self.build_interval(
                timestamp=timestamp,
                battery_kwh=battery,
                mode=mode,
                solar_kwh=solar,
                consumption_kwh=consumption,
                spot_price=price,
                grid_import_kwh=grid_in,
                grid_export_kwh=grid_out,
                export_price=export_price_value,
                reason=reason,
                is_mode_change=is_mode_change,
                is_balancing=i in balancing_indices,
                is_holding=i in holding_indices,
            )
            timeline.append(interval)

        return timeline

    def _generate_reason(
        self,
        mode: int,
        is_balancing: bool,
        is_holding: bool,
        battery: float,
        solar: float,
        price: float,
    ) -> str:
        """Generate human-readable reason for mode selection.

        Args:
            mode: Selected mode
            is_balancing: Part of balancing
            is_holding: In holding period
            battery: Current battery level
            solar: Solar production
            price: Spot price

        Returns:
            Reason string
        """
        if is_holding:
            return "Holding at 100% for balancing"

        if is_balancing:
            return "Charging for balancing target"

        mode_name = CBB_MODE_NAMES.get(mode, "")

        if mode == CBB_MODE_HOME_UPS:
            if battery < self.min_capacity * 1.1:
                return "Charging - battery low"
            return "Charging during cheap electricity"

        if mode == CBB_MODE_HOME_I:
            if solar > 0.1:
                return "Grid priority - preserving battery for expensive hours"
            return "Grid priority - no solar"

        if solar > 0.3:
            return f"Solar priority - {solar:.1f} kWh expected"

        return f"{mode_name} - standard operation"

    def summarize_timeline(
        self,
        timeline: List[TimelineInterval],
    ) -> Dict[str, Any]:
        """Generate summary statistics from timeline.

        Args:
            timeline: List of timeline intervals

        Returns:
            Summary dict with totals and statistics
        """
        if not timeline:
            return {}

        total_cost = sum(t.get("cost_czk", 0) for t in timeline)
        total_grid_import = sum(t.get("grid_import_kwh", 0) for t in timeline)
        total_grid_export = sum(t.get("grid_export_kwh", 0) for t in timeline)
        total_solar = sum(t.get("solar_kwh", 0) for t in timeline)
        total_consumption = sum(t.get("consumption_kwh", 0) for t in timeline)

        # Mode distribution
        modes = [t.get("mode", 2) for t in timeline]
        mode_dist = {
            "HOME_I": modes.count(CBB_MODE_HOME_I),
            "HOME_II": modes.count(1),
            "HOME_III": modes.count(2),
            "HOME_UPS": modes.count(CBB_MODE_HOME_UPS),
        }

        # Balancing stats
        balancing_count = sum(1 for t in timeline if t.get("is_balancing"))
        holding_count = sum(1 for t in timeline if t.get("is_holding"))

        # Battery range
        batteries = [t.get("battery_kwh", 0) for t in timeline]

        return {
            "intervals_count": len(timeline),
            "total_cost_czk": round(total_cost, 2),
            "total_grid_import_kwh": round(total_grid_import, 2),
            "total_grid_export_kwh": round(total_grid_export, 2),
            "total_solar_kwh": round(total_solar, 2),
            "total_consumption_kwh": round(total_consumption, 2),
            "modes_distribution": mode_dist,
            "balancing_intervals": balancing_count,
            "holding_intervals": holding_count,
            "battery_min_kwh": round(min(batteries), 2) if batteries else 0,
            "battery_max_kwh": round(max(batteries), 2) if batteries else 0,
            "battery_start_kwh": round(batteries[0], 2) if batteries else 0,
            "battery_end_kwh": round(batteries[-1], 2) if batteries else 0,
        }
