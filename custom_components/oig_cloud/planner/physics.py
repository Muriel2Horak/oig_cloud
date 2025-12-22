"""CBB mode physics simulator (15-minute interval).

Canonical physics implementation for the new single planner.

Design:
- Implements ONLY inverter mode physics
- Knows ONLY the HW minimum (hard clamp)
- Does NOT know planning_min/target (planner enforces those)

Reference:
- Derived from the historically tuned implementation in
  `custom_components/oig_cloud/oig_cloud_battery_forecast.py:_simulate_interval()`
  and its standalone copy in `tests/simulate_interval_standalone.py`.
"""

from __future__ import annotations

from dataclasses import dataclass

CBB_MODE_HOME_I = 0
CBB_MODE_HOME_II = 1
CBB_MODE_HOME_III = 2
CBB_MODE_HOME_UPS = 3


@dataclass(frozen=True)
class IntervalPhysicsResult:
    new_soc_kwh: float
    grid_import_kwh: float
    grid_export_kwh: float
    battery_charge_kwh: float
    battery_discharge_kwh: float
    # Raw charging split (kWh flowing into battery before efficiency). Used for dashboard stacked charts.
    grid_charge_kwh: float = 0.0
    solar_charge_kwh: float = 0.0


def simulate_interval(
    *,
    mode: int,
    solar_kwh: float,
    load_kwh: float,
    battery_soc_kwh: float,
    capacity_kwh: float,
    hw_min_capacity_kwh: float,
    charge_efficiency: float,
    discharge_efficiency: float,
    home_charge_rate_kwh_15min: float,
) -> IntervalPhysicsResult:
    """Simulate one 15-minute interval for a given CBB mode."""
    solar_kwh = max(0.0, float(solar_kwh))
    load_kwh = max(0.0, float(load_kwh))
    capacity_kwh = max(0.0, float(capacity_kwh))
    hw_min_capacity_kwh = max(0.0, float(hw_min_capacity_kwh))

    soc = max(0.0, min(capacity_kwh, float(battery_soc_kwh)))
    grid_import = 0.0
    grid_export = 0.0
    battery_charge = 0.0
    battery_discharge = 0.0
    grid_charge_raw = 0.0
    solar_charge_raw = 0.0

    # NIGHT optimization: solar == 0 → HOME I/II/III behave identically (discharge to HW min).
    if solar_kwh < 0.001 and mode in (
        CBB_MODE_HOME_I,
        CBB_MODE_HOME_II,
        CBB_MODE_HOME_III,
    ):
        available_battery = max(0.0, soc - hw_min_capacity_kwh)
        usable_from_battery = available_battery * discharge_efficiency

        covered_by_battery = min(load_kwh, usable_from_battery)
        if covered_by_battery > 0.001:
            battery_discharge = covered_by_battery / discharge_efficiency
            soc -= battery_discharge

        remaining = load_kwh - covered_by_battery
        if remaining > 0.001:
            grid_import += remaining

        soc = max(hw_min_capacity_kwh, soc)
        return IntervalPhysicsResult(
            new_soc_kwh=min(capacity_kwh, soc),
            grid_import_kwh=grid_import,
            grid_export_kwh=0.0,
            battery_charge_kwh=0.0,
            battery_discharge_kwh=battery_discharge,
            grid_charge_kwh=0.0,
            solar_charge_kwh=0.0,
        )

    # HOME I (0) - day: solar→load, surplus→battery, deficit→battery (then grid if empty)
    if mode == CBB_MODE_HOME_I:
        if solar_kwh >= load_kwh:
            surplus = solar_kwh - load_kwh
            battery_space = max(0.0, capacity_kwh - soc)
            charge_amount = min(surplus, battery_space)
            if charge_amount > 0.001:
                battery_charge = charge_amount
                solar_charge_raw = charge_amount
                soc = min(capacity_kwh, soc + charge_amount * charge_efficiency)
            remaining_surplus = surplus - charge_amount
            if remaining_surplus > 0.001:
                grid_export += remaining_surplus
        else:
            deficit = load_kwh - solar_kwh
            available_battery = max(0.0, soc - hw_min_capacity_kwh)
            usable_from_battery = available_battery * discharge_efficiency

            covered_by_battery = min(deficit, usable_from_battery)
            if covered_by_battery > 0.001:
                battery_discharge = covered_by_battery / discharge_efficiency
                soc -= battery_discharge

            remaining_deficit = deficit - covered_by_battery
            if remaining_deficit > 0.001:
                grid_import += remaining_deficit

            soc = max(hw_min_capacity_kwh, soc)

        return IntervalPhysicsResult(
            new_soc_kwh=min(capacity_kwh, soc),
            grid_import_kwh=grid_import,
            grid_export_kwh=grid_export,
            battery_charge_kwh=(
                battery_charge * charge_efficiency if battery_charge > 0 else 0.0
            ),
            battery_discharge_kwh=battery_discharge,
            grid_charge_kwh=grid_charge_raw,
            solar_charge_kwh=solar_charge_raw,
        )

    # HOME II (1) - day: solar→load, surplus→battery, deficit→GRID (battery untouched)
    if mode == CBB_MODE_HOME_II:
        if solar_kwh >= load_kwh:
            surplus = solar_kwh - load_kwh
            battery_space = max(0.0, capacity_kwh - soc)
            charge_amount = min(surplus, battery_space)
            if charge_amount > 0.001:
                battery_charge = charge_amount
                solar_charge_raw = charge_amount
                soc = min(capacity_kwh, soc + charge_amount * charge_efficiency)
            remaining_surplus = surplus - charge_amount
            if remaining_surplus > 0.001:
                grid_export += remaining_surplus
        else:
            grid_import += load_kwh - solar_kwh

        return IntervalPhysicsResult(
            new_soc_kwh=min(capacity_kwh, soc),
            grid_import_kwh=grid_import,
            grid_export_kwh=grid_export,
            battery_charge_kwh=(
                battery_charge * charge_efficiency if battery_charge > 0 else 0.0
            ),
            battery_discharge_kwh=0.0,
            grid_charge_kwh=grid_charge_raw,
            solar_charge_kwh=solar_charge_raw,
        )

    # HOME III (2) - day: ALL solar→battery, load→GRID
    if mode == CBB_MODE_HOME_III:
        battery_space = max(0.0, capacity_kwh - soc)
        charge_amount = min(solar_kwh, battery_space)
        if charge_amount > 0.001:
            battery_charge = charge_amount
            solar_charge_raw = charge_amount
            soc = min(capacity_kwh, soc + charge_amount * charge_efficiency)
        remaining_solar = solar_kwh - charge_amount
        if remaining_solar > 0.001:
            grid_export += remaining_solar
        grid_import += load_kwh

        return IntervalPhysicsResult(
            new_soc_kwh=min(capacity_kwh, soc),
            grid_import_kwh=grid_import,
            grid_export_kwh=grid_export,
            battery_charge_kwh=(
                battery_charge * charge_efficiency if battery_charge > 0 else 0.0
            ),
            battery_discharge_kwh=0.0,
            grid_charge_kwh=grid_charge_raw,
            solar_charge_kwh=solar_charge_raw,
        )

    # HOME UPS (3): solar→battery, load→GRID, grid→battery (up to charge rate)
    if mode == CBB_MODE_HOME_UPS:
        battery_space = max(0.0, capacity_kwh - soc)

        # 1) grid charging
        grid_to_battery = min(home_charge_rate_kwh_15min, battery_space)
        if grid_to_battery > 0.001:
            grid_import += grid_to_battery
            soc = min(capacity_kwh, soc + grid_to_battery * charge_efficiency)
            battery_charge += grid_to_battery
            grid_charge_raw += grid_to_battery

        # 2) solar charging (after grid charge to respect space)
        battery_space = max(0.0, capacity_kwh - soc)
        solar_to_battery = min(solar_kwh, battery_space)
        if solar_to_battery > 0.001:
            soc = min(capacity_kwh, soc + solar_to_battery * charge_efficiency)
            battery_charge += solar_to_battery
            solar_charge_raw += solar_to_battery

        remaining_solar = solar_kwh - solar_to_battery
        if remaining_solar > 0.001:
            grid_export += remaining_solar

        # 3) load from grid
        grid_import += load_kwh

        return IntervalPhysicsResult(
            new_soc_kwh=min(capacity_kwh, soc),
            grid_import_kwh=grid_import,
            grid_export_kwh=grid_export,
            battery_charge_kwh=(
                battery_charge * charge_efficiency if battery_charge > 0 else 0.0
            ),
            battery_discharge_kwh=0.0,
            grid_charge_kwh=grid_charge_raw,
            solar_charge_kwh=solar_charge_raw,
        )

    # Unknown mode → behave like HOME I (safe)
    return simulate_interval(
        mode=CBB_MODE_HOME_I,
        solar_kwh=solar_kwh,
        load_kwh=load_kwh,
        battery_soc_kwh=soc,
        capacity_kwh=capacity_kwh,
        hw_min_capacity_kwh=hw_min_capacity_kwh,
        charge_efficiency=charge_efficiency,
        discharge_efficiency=discharge_efficiency,
        home_charge_rate_kwh_15min=home_charge_rate_kwh_15min,
    )
