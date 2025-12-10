"""
Bridge module for migrating from legacy oig_cloud_battery_forecast to new modular architecture.

This module provides a compatibility layer that allows gradual migration
from the 17k-line monster file to the new modular battery_forecast package.

Usage in oig_cloud_battery_forecast.py:
    from .battery_forecast.bridge import calculate_hybrid_with_new_module

    # Instead of calling self._calculate_optimal_modes_hybrid(...)
    result = calculate_hybrid_with_new_module(
        current_capacity=current_capacity,
        max_capacity=max_capacity,
        ...
    )
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from homeassistant.util import dt as dt_util

from .sensor import (
    BatteryForecastOrchestrator,
    ForecastConfig,
    ForecastResult,
)
from .types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
    CBB_MODE_NAMES,
    DEFAULT_CHARGE_RATE_KW,
    DEFAULT_EFFICIENCY,
)

_LOGGER = logging.getLogger(__name__)


def calculate_hybrid_with_new_module(
    current_capacity: float,
    max_capacity: float,
    min_capacity: float,
    target_capacity: float,
    spot_prices: List[Dict[str, Any]],
    export_prices: List[Dict[str, Any]],  # Not used in new module yet
    solar_forecast: Dict[str, Any],
    load_forecast: List[float],
    balancing_plan: Optional[Dict[str, Any]] = None,
    efficiency: float = DEFAULT_EFFICIENCY,
    charge_rate_kw: float = DEFAULT_CHARGE_RATE_KW,
) -> Dict[str, Any]:
    """
    Bridge function that calls new modular battery_forecast and returns
    result in the same format as legacy _calculate_optimal_modes_hybrid.

    This allows drop-in replacement in oig_cloud_battery_forecast.py.

    Args:
        current_capacity: Current battery level (kWh)
        max_capacity: Maximum battery capacity (kWh)
        min_capacity: Minimum usable capacity / reserve (kWh)
        target_capacity: Target capacity to reach (kWh)
        spot_prices: List of {time, price} dicts
        export_prices: Export prices (not used currently)
        solar_forecast: Solar forecast dict or list
        load_forecast: Consumption forecast (kWh per interval)
        balancing_plan: Optional balancing plan from BalancingManager
        efficiency: Battery roundtrip efficiency (0-1)
        charge_rate_kw: AC charging power (kW)

    Returns:
        Dict compatible with legacy _calculate_optimal_modes_hybrid output:
        {
            "modes": List[int],
            "optimal_timeline": List[Dict],
            "total_cost": float,
            "baseline_cost": float,
            "savings": float,
            "mode_recommendations": List[Dict],
            "soc_trajectory": List[float],
            ...
        }
    """
    _LOGGER.debug(
        "Bridge: calculate_hybrid_with_new_module called with %d prices, "
        "battery=%.2f/%.2f, target=%.2f, balancing=%s",
        len(spot_prices),
        current_capacity,
        max_capacity,
        target_capacity,
        balancing_plan is not None,
    )

    # Convert solar_forecast from dict to list if needed
    solar_list = _convert_solar_forecast(solar_forecast, spot_prices)

    # Create orchestrator with configuration
    config = ForecastConfig(
        max_capacity=max_capacity,
        min_capacity=min_capacity,
        target_capacity=target_capacity,
        charge_rate_kw=charge_rate_kw,
        efficiency=efficiency,
        use_balancing=balancing_plan is not None,
    )

    orchestrator = BatteryForecastOrchestrator(config)

    # Call new module with export_prices for negative price detection
    result = orchestrator.calculate_forecast(
        current_capacity=current_capacity,
        spot_prices=spot_prices,
        solar_forecast=solar_list,
        load_forecast=load_forecast,
        balancing_plan=balancing_plan,
        export_prices=export_prices,
    )

    # Convert to legacy format
    legacy_result = _convert_to_legacy_format(
        result, spot_prices, solar_list, load_forecast
    )

    _LOGGER.debug(
        "Bridge: New module returned %d modes, cost=%.2f CZK, savings=%.2f CZK",
        len(legacy_result.get("modes", [])),
        legacy_result.get("total_cost", 0),
        legacy_result.get("savings", 0),
    )

    return legacy_result


def _convert_solar_forecast(
    solar_forecast: Any,
    spot_prices: List[Dict[str, Any]],
) -> List[float]:
    """
    Convert solar forecast from various formats to simple list.

    The legacy code uses solar_forecast as a dict with nested structure.
    New module expects simple list of kWh values per interval.
    """
    n_intervals = len(spot_prices)

    if isinstance(solar_forecast, list):
        # Already a list
        if len(solar_forecast) >= n_intervals:
            return solar_forecast[:n_intervals]
        # Pad with zeros
        return solar_forecast + [0.0] * (n_intervals - len(solar_forecast))

    if isinstance(solar_forecast, dict):
        # Extract from dict format
        # Common formats: {"watts": [...], "watt_hours": [...]} or {"forecast": [...]}

        # Try watts (convert to kWh per 15min)
        if "watts" in solar_forecast:
            watts = solar_forecast["watts"]
            # watts to kWh per 15min: watts * 0.25 / 1000
            return [w * 0.00025 for w in watts[:n_intervals]]

        # Try watt_hours
        if "watt_hours" in solar_forecast:
            wh = solar_forecast["watt_hours"]
            # Wh to kWh
            return [w / 1000.0 for w in wh[:n_intervals]]

        # Try forecast key
        if "forecast" in solar_forecast:
            return _convert_solar_forecast(solar_forecast["forecast"], spot_prices)

        # Try to extract by timestamp
        result: List[float] = []
        for price_data in spot_prices:
            ts = price_data.get("time", "")
            solar_value = solar_forecast.get(ts, 0.0)
            if isinstance(solar_value, dict):
                solar_value = solar_value.get("pv_estimate", 0.0)
            result.append(float(solar_value) if solar_value else 0.0)

        if result:
            return result

    # Fallback: zeros
    _LOGGER.warning("Could not parse solar_forecast, using zeros")
    return [0.0] * n_intervals


def _convert_to_legacy_format(
    result: ForecastResult,
    spot_prices: List[Dict[str, Any]],
    solar_forecast: List[float],
    load_forecast: List[float],
) -> Dict[str, Any]:
    """
    Convert ForecastResult to legacy format expected by oig_cloud_battery_forecast.

    The legacy code expects specific keys in the result dict.
    """
    n_intervals = len(result.modes) if result.modes else 0

    # Build optimal_timeline in legacy format
    optimal_timeline: List[Dict[str, Any]] = []

    for i, interval in enumerate(result.timeline):
        # Legacy format for each interval
        legacy_interval = {
            "timestamp": interval.get("timestamp", ""),
            "mode": interval.get("mode", CBB_MODE_HOME_I),
            "mode_name": interval.get("mode_name", "HOME I"),
            "battery_start": interval.get("battery_kwh", 0),
            "battery_end": (
                result.battery_trajectory[i + 1]
                if i + 1 < len(result.battery_trajectory)
                else interval.get("battery_kwh", 0)
            ),
            "solar_kwh": solar_forecast[i] if i < len(solar_forecast) else 0.0,
            "consumption_kwh": load_forecast[i] if i < len(load_forecast) else 0.0,
            "spot_price": interval.get("spot_price", 0),
            "grid_import_kwh": interval.get("grid_import_kwh", 0),
            "cost_czk": interval.get("cost_czk", 0),
        }
        optimal_timeline.append(legacy_interval)

    # Build mode_recommendations (summary by mode)
    mode_recommendations: List[Dict[str, Any]] = []
    current_mode: Optional[int] = None
    mode_start_idx = 0

    for i, mode in enumerate(result.modes + [None]):  # +None to flush last group
        if mode != current_mode:
            if current_mode is not None and i > mode_start_idx:
                # End of mode group
                start_time = spot_prices[mode_start_idx].get("time", "")
                end_idx = min(i, len(spot_prices) - 1)
                end_time = spot_prices[end_idx].get("time", "")

                mode_recommendations.append(
                    {
                        "mode": current_mode,
                        "mode_name": CBB_MODE_NAMES.get(
                            current_mode, f"Mode {current_mode}"
                        ),
                        "start_index": mode_start_idx,
                        "end_index": i - 1,
                        "start_time": start_time,
                        "end_time": end_time,
                        "intervals": i - mode_start_idx,
                        "reason": (
                            "optimized"
                            if current_mode != CBB_MODE_HOME_UPS
                            else (
                                "balancing" if result.balancing_applied else "charging"
                            )
                        ),
                    }
                )

            current_mode = mode
            mode_start_idx = i

    # Calculate mode distribution
    modes_distribution = {
        "HOME I": result.home_i_intervals,
        "HOME II": result.home_ii_intervals,
        "HOME III": result.home_iii_intervals,
        "HOME UPS": result.ups_intervals,
    }

    return {
        # Core outputs
        "modes": result.modes,
        "optimal_timeline": optimal_timeline,
        "soc_trajectory": result.battery_trajectory,
        # Costs
        "total_cost": result.total_cost_czk,
        "baseline_cost": result.baseline_cost_czk,
        "savings": result.savings_czk,
        # Mode recommendations
        "mode_recommendations": mode_recommendations,
        "modes_distribution": modes_distribution,
        # Balancing info
        "balancing_applied": result.balancing_applied,
        "balancing_ups_count": result.balancing_ups_count,
        "balancing_reason": result.balancing_reason,
        # Metadata
        "algorithm": result.algorithm,
        "calculation_time_ms": result.calculation_time_ms,
        "timestamp": result.timestamp,
        # Statistics
        "total_ups_intervals": result.ups_intervals,
        "total_home_i_intervals": result.home_i_intervals,
    }


# Validation helper for testing
def validate_bridge_compatibility(
    legacy_result: Dict[str, Any],
    new_result: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compare legacy and new module results for validation.

    Returns dict with comparison results and any differences found.
    """
    differences: List[str] = []

    # Compare modes
    legacy_modes = legacy_result.get("modes", [])
    new_modes = new_result.get("modes", [])

    if len(legacy_modes) != len(new_modes):
        differences.append(
            f"Mode count differs: legacy={len(legacy_modes)}, new={len(new_modes)}"
        )
    else:
        mode_diff_count = sum(1 for l, n in zip(legacy_modes, new_modes) if l != n)
        if mode_diff_count > 0:
            differences.append(
                f"Mode differences in {mode_diff_count}/{len(legacy_modes)} intervals"
            )

    # Compare costs
    legacy_cost = legacy_result.get("total_cost", 0)
    new_cost = new_result.get("total_cost", 0)
    cost_diff = abs(legacy_cost - new_cost)

    if cost_diff > 0.5:  # Allow small rounding differences
        differences.append(
            f"Cost differs: legacy={legacy_cost:.2f}, new={new_cost:.2f}"
        )

    return {
        "compatible": len(differences) == 0,
        "differences": differences,
        "legacy_modes_count": len(legacy_modes),
        "new_modes_count": len(new_modes),
        "legacy_cost": legacy_cost,
        "new_cost": new_cost,
    }


def simulate_interval_with_new_module(
    mode: int,
    solar_kwh: float,
    load_kwh: float,
    battery_soc_kwh: float,
    capacity_kwh: float,
    hw_min_capacity_kwh: float,
    spot_price_czk: float,
    export_price_czk: float,
    charge_efficiency: float = 0.95,
    discharge_efficiency: float = 0.95,
    home_charge_rate_kwh_15min: float = 0.7,
    planning_min_capacity_kwh: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Simulate single 15-min interval using new modular SoCSimulator.

    Bridge function that replaces legacy _simulate_interval method.
    Returns result in the same format as legacy code.
    """
    from .timeline.simulator import SoCSimulator

    # Use planning_min if provided, otherwise hw_min
    min_cap = (
        planning_min_capacity_kwh if planning_min_capacity_kwh else hw_min_capacity_kwh
    )

    # Create simulator
    sim = SoCSimulator(
        max_capacity=capacity_kwh,
        min_capacity=min_cap,
        charge_rate_kw=home_charge_rate_kwh_15min * 4,  # Convert back to kW
        efficiency=(charge_efficiency + discharge_efficiency) / 2,  # Average
    )

    # Determine if forced charging (UPS mode)
    force_charge = mode == CBB_MODE_HOME_UPS

    # Simulate
    result = sim.simulate_interval(
        battery_start=battery_soc_kwh,
        mode=mode,
        solar_kwh=solar_kwh,
        consumption_kwh=load_kwh,
        force_charge=force_charge,
    )

    # Calculate costs
    grid_cost = result.grid_import * spot_price_czk if spot_price_czk else 0.0
    export_revenue = result.grid_export * export_price_czk if export_price_czk else 0.0
    net_cost = grid_cost - export_revenue

    # Return in legacy format
    # SimulationResult attributes: battery_end, grid_import, grid_export,
    #   battery_charge, battery_discharge, solar_used, solar_to_battery, solar_exported
    return {
        "new_soc_kwh": result.battery_end,
        "grid_import_kwh": result.grid_import,
        "grid_export_kwh": result.grid_export,
        "battery_charge_kwh": result.battery_charge,
        "battery_discharge_kwh": result.battery_discharge,
        "solar_used_kwh": result.solar_used,
        "solar_to_battery_kwh": result.solar_to_battery,
        "solar_to_grid_kwh": result.solar_exported,
        "load_from_solar_kwh": result.solar_used,
        "load_from_battery_kwh": result.battery_discharge,  # battery discharge = load from battery
        "load_from_grid_kwh": result.grid_import,
        "grid_cost_czk": grid_cost,
        "export_revenue_czk": export_revenue,
        "net_cost_czk": net_cost,
        "mode": mode,
        "mode_name": CBB_MODE_NAMES.get(mode, f"Mode {mode}"),
    }


def calculate_timeline_with_new_module(
    current_capacity: float,
    max_capacity: float,
    min_capacity: float,
    spot_prices: List[Dict[str, Any]],
    export_prices: List[Dict[str, Any]],
    solar_forecast: Any,
    load_forecast: List[float],
    modes: Optional[List[int]] = None,
    efficiency: float = DEFAULT_EFFICIENCY,
    charge_rate_kw: float = DEFAULT_CHARGE_RATE_KW,
) -> List[Dict[str, Any]]:
    """
    Calculate timeline using new modular architecture.

    Bridge function that replaces legacy _calculate_timeline method.
    Returns timeline in the same format as legacy code.

    Args:
        current_capacity: Current battery level (kWh)
        max_capacity: Maximum battery capacity (kWh)
        min_capacity: Minimum usable capacity (kWh)
        spot_prices: List of {time, price} dicts
        export_prices: List of {time, price} dicts
        solar_forecast: Solar forecast (dict or list)
        load_forecast: Consumption forecast (kWh per interval)
        modes: Optional pre-calculated modes (if None, uses HOME I)
        efficiency: Battery efficiency
        charge_rate_kw: AC charging rate

    Returns:
        Timeline in legacy format
    """
    from .timeline.simulator import SoCSimulator
    from .timeline.builder import TimelineBuilder

    n_intervals = len(spot_prices)

    # Convert solar forecast
    solar_list = _convert_solar_forecast(solar_forecast, spot_prices)

    # Ensure load_forecast matches
    if len(load_forecast) < n_intervals:
        load_forecast = load_forecast + [0.3] * (n_intervals - len(load_forecast))

    # Default modes if not provided
    if modes is None:
        modes = [CBB_MODE_HOME_I] * n_intervals

    # Create simulator and builder
    sim = SoCSimulator(
        max_capacity=max_capacity,
        min_capacity=min_capacity,
        charge_rate_kw=charge_rate_kw,
        efficiency=efficiency,
    )

    builder = TimelineBuilder(
        max_capacity=max_capacity,
        min_capacity=min_capacity,
    )

    # Simulate timeline
    battery_trajectory, grid_imports, grid_exports = sim.simulate_timeline(
        initial_battery=current_capacity,
        modes=modes,
        solar_forecast=solar_list[:n_intervals],
        consumption_forecast=load_forecast[:n_intervals],
    )

    # Build timeline in legacy format
    timeline: List[Dict[str, Any]] = []

    for i in range(n_intervals):
        spot_price = spot_prices[i].get("price", 0) or 0
        export_price = export_prices[i].get("price", 0) if i < len(export_prices) else 0
        export_price = export_price or 0

        battery_start = (
            battery_trajectory[i] if i < len(battery_trajectory) else current_capacity
        )
        battery_end = (
            battery_trajectory[i + 1]
            if i + 1 < len(battery_trajectory)
            else battery_start
        )

        grid_import = grid_imports[i] if i < len(grid_imports) else 0
        grid_export = grid_exports[i] if i < len(grid_exports) else 0

        solar = solar_list[i] if i < len(solar_list) else 0
        load = load_forecast[i] if i < len(load_forecast) else 0

        mode = modes[i] if i < len(modes) else CBB_MODE_HOME_I

        # Calculate costs
        grid_cost = grid_import * spot_price
        export_revenue = grid_export * export_price
        net_cost = grid_cost - export_revenue

        interval = {
            "timestamp": spot_prices[i].get("time", ""),
            "battery_soc_kwh": battery_start,
            "battery_end_kwh": battery_end,
            "solar_kwh": solar,
            "consumption_kwh": load,
            "grid_import_kwh": grid_import,
            "grid_export_kwh": grid_export,
            "spot_price_czk": spot_price,
            "export_price_czk": export_price,
            "grid_cost_czk": grid_cost,
            "export_revenue_czk": export_revenue,
            "net_cost_czk": net_cost,
            "mode": mode,
            "mode_name": CBB_MODE_NAMES.get(mode, f"Mode {mode}"),
            # Legacy fields
            "planned": {
                "mode": mode,
                "mode_name": CBB_MODE_NAMES.get(mode, f"Mode {mode}"),
                "grid_import_kwh": grid_import,
                "grid_export_kwh": grid_export,
                "net_cost": net_cost,
            },
        }

        timeline.append(interval)

    return timeline
