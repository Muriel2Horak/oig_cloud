from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.config import HybridConfig, SimulatorConfig
from custom_components.oig_cloud.battery_forecast.config import NegativePriceStrategy
from custom_components.oig_cloud.battery_forecast.strategy import hybrid_planning as module
from custom_components.oig_cloud.battery_forecast.types import CBB_MODE_HOME_I, CBB_MODE_HOME_UPS


class DummySimulator:
    def simulate(
        self,
        *,
        battery_start,
        mode,
        solar_kwh,
        load_kwh,
        force_charge=False,
    ):
        if mode == CBB_MODE_HOME_I:
            net_change = solar_kwh - load_kwh
            battery_end = battery_start + net_change
            grid_import = max(0, -net_change)
            grid_export = max(0, net_change) if net_change > 0 else 0.0
        else:
            net_change = solar_kwh - load_kwh
            if force_charge:
                charge_bonus = min(1.0, 5.0 - battery_start)
                battery_end = min(5.0, battery_start + net_change + charge_bonus)
                grid_import = charge_bonus + max(0, -net_change)
            else:
                battery_end = battery_start + net_change
                grid_import = max(0, -net_change)
            grid_export = max(0, net_change) if net_change > 0 else 0.0

        return SimpleNamespace(
            battery_end=battery_end,
            grid_import=grid_import,
            grid_export=grid_export,
        )

    def calculate_cost(self, _result, price, export_price):
        return price - export_price


class DummyConfig:
    max_ups_price_czk = 1.0
    min_ups_duration_intervals = 2
    negative_price_strategy = NegativePriceStrategy.CHARGE_GRID
    round_trip_efficiency = 0.9
    price_hysteresis_czk = 0.0
    min_export_price_czk = -0.5


class DummySimConfig:
    ac_dc_efficiency = 0.9


class DummyStrategy:
    MAX_ITERATIONS = 3
    MIN_UPS_PRICE_BAND_PCT = 0.08

    def __init__(self):
        self.config = DummyConfig()
        self.sim_config = DummySimConfig()
        self.simulator = DummySimulator()
        self._planning_min = 2.0
        self._target = 3.0
        self._max = 5.0


def test_economic_charging_skipped_when_solar_reaches_target():
    strategy = DummyStrategy()
    
    initial_battery_kwh = 2.5
    solar_forecast = [2.0] * 24
    consumption_forecast = [0.5] * 24
    prices = [0.3] * 24

    result = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        prices=prices,
        balancing_plan=None,
        negative_price_intervals=None,
    )

    charging_intervals, infeasible_reason, price_band_intervals = result
    
    assert charging_intervals == set(), (
        f"Solar overflow bug should be fixed: Economic charging is skipped when solar reaches target. "
        f"Expected empty set(), got {charging_intervals}. "
        f"Setup: initial={initial_battery_kwh}kWh, target={strategy._target}kWh, "
        f"solar={solar_forecast[0]}kWh, consumption={consumption_forecast[0]}kWh → "
        f"net_gain={solar_forecast[0] - consumption_forecast[0]}kWh/interval. "
        f"After 1st interval: {initial_battery_kwh + solar_forecast[0] - consumption_forecast[0]}kWh "
        f"(exceeds target {strategy._target}kWh). "
        f"Economic charging should NOT add intervals when solar is sufficient."
    )


def test_target_fill_preserves_headroom_when_future_surplus_has_zero_export_value():
    strategy = DummyStrategy()
    strategy._target = 5.0

    charging_intervals, _, _ = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=3.2,
        solar_forecast=[0.0] * 4 + [0.35] * 8,
        consumption_forecast=[0.15] * 12,
        export_prices=[0.0] * 12,
        prices=[0.6] * 12,
        balancing_plan=None,
        negative_price_intervals=None,
    )

    assert charging_intervals == set(), (
        "Planner should preserve battery headroom for upcoming low-value solar surplus "
        "instead of topping battery to 100% before solar ramp-up."
    )


def test_target_fill_still_charges_when_future_surplus_can_be_exported_profitably():
    strategy = DummyStrategy()
    strategy._target = 5.0

    charging_intervals, _, _ = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=3.2,
        solar_forecast=[0.0] * 4 + [0.35] * 8,
        consumption_forecast=[0.15] * 12,
        export_prices=[0.6] * 12,
        prices=[0.6] * 12,
        balancing_plan=None,
        negative_price_intervals=None,
    )

    assert charging_intervals, (
        "When export remains economically viable, planner may still top up to target "
        "instead of preserving daytime headroom."
    )
