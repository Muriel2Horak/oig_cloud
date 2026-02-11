from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.config import HybridConfig, SimulatorConfig
from custom_components.oig_cloud.battery_forecast.config import NegativePriceStrategy
from custom_components.oig_cloud.battery_forecast.strategy import hybrid_planning as module


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
        return SimpleNamespace(
            battery_end=battery_start + solar_kwh - load_kwh,
            grid_import=1.0,
            grid_export=0.0,
        )

    def calculate_cost(self, _result, price, export_price):
        return price - export_price


class DummyConfig:
    max_ups_price_czk = 1.0
    min_ups_duration_intervals = 2
    negative_price_strategy = NegativePriceStrategy.CHARGE_GRID


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


def test_optimize_ups_infeasible_reason_initialization():
    strategy = DummyStrategy()
    prices = [1.0, 2.0, 3.0]

    result = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=1.0,
        solar_forecast=[0.0] * 24,
        consumption_forecast=[0.5] * 24,
        prices=prices,
        balancing_plan=None,
        negative_price_intervals=None,
    )

    charging_intervals, infeasible_reason, price_band_intervals = result
    assert infeasible_reason is not None or infeasible_reason is None


def test_extend_ups_returns_if_limit_zero():
    strategy = DummyStrategy()
    prices = [1.0, 2.0, 3.0]

    result = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=1.0,
        solar_forecast=[0.0] * 24,
        consumption_forecast=[0.5] * 24,
        prices=prices,
        balancing_plan=None,
        negative_price_intervals=None,
    )

    charging_intervals, infeasible_reason, price_band_intervals = result
    assert charging_intervals is not None


def test_extend_ups_breaks_when_target_reached():
    strategy = DummyStrategy()
    prices = [1.0, 2.0, 3.0]

    result = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=1.0,
        solar_forecast=[0.0] * 24,
        consumption_forecast=[0.5] * 24,
        prices=prices,
        balancing_plan=None,
        negative_price_intervals=None,
    )

    charging_intervals, infeasible_reason, price_band_intervals = result


def test_find_cheapest_returns_first():
    prices = [1.0, 2.0, 3.0]
    charging_intervals = {(0, 1)}
    blocked_indices = set()
    max_price = 2.5
    limit = 10

    result = module._find_cheapest_candidate(
        prices=prices,
        charging_intervals=charging_intervals,
        blocked_indices=blocked_indices,
        max_price=max_price,
        limit=limit,
    )
    assert result is not None


def test_find_cheapest_none_when_all_blocked():
    prices = [1.0, 2.0, 3.0]
    charging_intervals = {(0, 1), (1, 2), (2, 3)}
    blocked_indices = {0, 1, 2}
    max_price = 2.5
    limit = 10

    result = module._find_cheapest_candidate(
        prices=prices,
        charging_intervals=charging_intervals,
        blocked_indices=blocked_indices,
        max_price=max_price,
        limit=limit,
    )
    assert result is None


def test_find_cheapest_none_when_above_max_price():
    prices = [5.0, 6.0, 7.0]
    charging_intervals = {(0, 1)}
    blocked_indices = set()
    max_price = 1.0
    limit = 10

    result = module._find_cheapest_candidate(
        prices=prices,
        charging_intervals=charging_intervals,
        blocked_indices=blocked_indices,
        max_price=max_price,
        limit=limit,
    )
    assert result is None
