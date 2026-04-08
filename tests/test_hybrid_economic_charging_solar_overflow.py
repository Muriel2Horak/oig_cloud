from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.config import HybridConfig, SimulatorConfig
from custom_components.oig_cloud.battery_forecast.config import NegativePriceStrategy
from custom_components.oig_cloud.battery_forecast.strategy import hybrid_planning as module
from custom_components.oig_cloud.battery_forecast.strategy.planner_observability import (
    PlannerDecisionLog,
    UPSDecisionAction,
    UPSDecisionReason,
)
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
                grid_export = 0.0
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
    solar_forecast = [0.8] * 24
    consumption_forecast = [0.2] * 24
    prices = [0.3] * 24

    decision_log = PlannerDecisionLog(
        planning_cycle_id="test-solar-overflow",
        initial_soc_kwh=initial_battery_kwh,
        target_soc_kwh=strategy._target,
    )

    result = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        prices=prices,
        balancing_plan=None,
        negative_price_intervals=None,
        decision_log=decision_log,
    )

    charging_intervals, infeasible_reason, price_band_intervals = result

    assert charging_intervals == set(), (
        f"Solar overflow bug should be fixed: Economic charging is skipped when solar reaches target. "
        f"Expected empty set(), got {charging_intervals}. "
        f"Setup: initial={initial_battery_kwh}kWh, target={strategy._target}kWh, "
        f"solar={solar_forecast[0]}kWh, consumption={consumption_forecast[0]}kWh -> "
        f"net_gain={solar_forecast[0] - consumption_forecast[0]}kWh/interval. "
        f"After 1st interval: {initial_battery_kwh + solar_forecast[0] - consumption_forecast[0]}kWh "
        f"(exceeds target {strategy._target}kWh). "
        f"Economic charging should NOT add intervals when solar is sufficient."
    )

    solar_blocked = decision_log.get_solar_fill_blocked_decisions()

    economic_charging_skipped = len(decision_log.decisions) == 0
    has_blocked_decisions = len(solar_blocked) > 0

    assert economic_charging_skipped or has_blocked_decisions, (
        f"Expected either no decisions (economic charging skipped) OR blocked decisions "
        f"with FUTURE_SOLAR_WILL_FILL reason. Got {len(decision_log.decisions)} decisions, "
        f"{len(solar_blocked)} blocked: "
        f"{[(d.interval_idx, d.action.value, d.reason.value) for d in decision_log.decisions]}"
    )

    if has_blocked_decisions:
        for decision in solar_blocked:
            assert decision.action == UPSDecisionAction.BLOCK, (
                f"Expected BLOCK action for interval {decision.interval_idx}, got {decision.action}"
            )
            assert decision.reason == UPSDecisionReason.FUTURE_SOLAR_WILL_FILL, (
                f"Expected FUTURE_SOLAR_WILL_FILL reason for interval {decision.interval_idx}, "
                f"got {decision.reason}"
            )
            assert decision.future_solar_fill is True, (
                f"Expected future_solar_fill=True for interval {decision.interval_idx}"
            )
            d = decision.to_dict()
            assert "price_czk" in d, "Missing required field: price_czk"
            assert "battery_soc_kwh" in d, "Missing required field: battery_soc_kwh"
            assert "target_soc_kwh" in d, "Missing required field: target_soc_kwh"
            assert "planning_min_kwh" in d, "Missing required field: planning_min_kwh"
            assert "future_solar_fill" in d, "Missing required field: future_solar_fill"
            assert "source_function" in d, "Missing required field: source_function"


def test_negative_price_seed_does_not_force_precharge_when_future_solar_fills_target():
    strategy = DummyStrategy()
    strategy._planning_min = 1.0

    initial_battery_kwh = 2.5
    prices = [-0.5, -0.4, 0.2, 0.3, 0.4, 0.5]
    solar_forecast = [0.0, 0.0, 1.8, 1.8, 1.2, 0.8]
    consumption_forecast = [0.1, 0.1, 0.3, 0.3, 0.3, 0.3]

    decision_log = PlannerDecisionLog(
        planning_cycle_id="test-negative-price-solar",
        initial_soc_kwh=initial_battery_kwh,
        target_soc_kwh=strategy._target,
    )

    charging_intervals, _, _ = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        prices=prices,
        balancing_plan=None,
        negative_price_intervals=[0, 1],
        decision_log=decision_log,
    )

    assert 0 not in charging_intervals
    assert 1 not in charging_intervals
    assert charging_intervals == set()

    solar_blocked = decision_log.get_solar_fill_blocked_decisions()
    assert len(solar_blocked) > 0, (
        f"Expected at least one BLOCK decision with FUTURE_SOLAR_WILL_FILL reason. "
        f"Decision log has {len(decision_log.decisions)} decisions: "
        f"{[(d.interval_idx, d.action.value, d.reason.value) for d in decision_log.decisions]}"
    )

    blocked_indices = {d.interval_idx for d in solar_blocked}
    assert 0 in blocked_indices or 1 in blocked_indices, (
        f"Expected intervals 0 or 1 to be blocked due to future solar fill. "
        f"Blocked indices: {blocked_indices}"
    )

    for decision in solar_blocked:
        assert decision.action == UPSDecisionAction.BLOCK, (
            f"Expected BLOCK action for interval {decision.interval_idx}, got {decision.action}"
        )
        assert decision.reason == UPSDecisionReason.FUTURE_SOLAR_WILL_FILL, (
            f"Expected FUTURE_SOLAR_WILL_FILL reason for interval {decision.interval_idx}, "
            f"got {decision.reason}"
        )
        assert decision.future_solar_fill is True, (
            f"Expected future_solar_fill=True for interval {decision.interval_idx}"
        )
        d = decision.to_dict()
        assert "price_czk" in d, "Missing required field: price_czk"
        assert "battery_soc_kwh" in d, "Missing required field: battery_soc_kwh"
        assert "target_soc_kwh" in d, "Missing required field: target_soc_kwh"
        assert "planning_min_kwh" in d, "Missing required field: planning_min_kwh"
        assert "future_solar_fill" in d, "Missing required field: future_solar_fill"
        assert "source_function" in d, "Missing required field: source_function"
        assert d["price_czk"] < 0, (
            f"Expected negative price for negative price interval test, got {d['price_czk']}"
        )


def test_weak_solar_evening_peak_still_allows_protective_charging():
    strategy = DummyStrategy()
    strategy._planning_min = 2.0
    strategy._target = 3.0

    initial_battery_kwh = 2.0

    solar_forecast = [0.1] * 96

    consumption_forecast = [0.3] * 96
    for i in range(72, 84):
        consumption_forecast[i] = 0.6

    prices = [0.2] * 24 + [1.5] * 72

    decision_log = PlannerDecisionLog(
        planning_cycle_id="test-weak-solar-evening-peak",
        initial_soc_kwh=initial_battery_kwh,
        target_soc_kwh=strategy._target,
    )

    charging_intervals, infeasible_reason, price_band_intervals = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        prices=prices,
        balancing_plan=None,
        negative_price_intervals=None,
        decision_log=decision_log,
    )

    assert len(charging_intervals) > 0, (
        f"Weak solar regression failed: Expected protective charging intervals but got empty set. "
        f"Setup: initial={initial_battery_kwh}kWh, target={strategy._target}kWh, "
        f"planning_min={strategy._planning_min}kWh, solar={solar_forecast[0]}kWh/interval, "
        f"evening_peak_consumption={consumption_forecast[72]}kWh/interval. "
        f"Future solar alone cannot cover evening peak demand - planner must charge protectively."
    )

    cheap_intervals = set(range(0, 24))
    charging_in_cheap_period = charging_intervals & cheap_intervals
    assert len(charging_in_cheap_period) > 0, (
        f"Expected charging in cheap early intervals (0-24), got {charging_intervals}. "
        f"Protective charging should occur during cheap night rates."
    )


def test_full_target_is_softened_when_daytime_solar_surplus_would_overflow():
    strategy = DummyStrategy()
    strategy._planning_min = 1.25
    strategy._target = 5.0

    initial_battery_kwh = 3.2
    prices = [0.2] * 24
    solar_forecast = [0.0] * 8 + [0.8] * 16
    consumption_forecast = [0.15] * 24

    charging_intervals, _, _ = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        prices=prices,
        balancing_plan=None,
        negative_price_intervals=None,
    )

    assert charging_intervals == set(), (
        "Planner should preserve solar headroom instead of forcing overnight fill to the hard 100% target "
        "when forecast daytime solar surplus would otherwise overflow."
    )


def test_non_full_target_still_reaches_target_without_softening():
    strategy = DummyStrategy()
    strategy._planning_min = 1.25
    strategy._target = 4.0

    initial_battery_kwh = 2.0
    prices = [0.2] * 24
    solar_forecast = [0.0] * 8 + [0.8] * 16
    consumption_forecast = [0.15] * 24

    charging_intervals, _, _ = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        prices=prices,
        balancing_plan=None,
        negative_price_intervals=None,
    )

    assert charging_intervals, (
        "Soft target logic must not disable normal target-reaching when configured target is below full capacity."
    )


def test_cloudy_fallback_does_not_trust_optimistic_solar():
    strategy = DummyStrategy()
    strategy._planning_min = 2.0
    strategy._target = 3.0

    initial_battery_kwh = 2.5

    solar_forecast = [0.05] * 96

    consumption_forecast = [0.25] * 96

    prices = [0.3] * 96

    decision_log = PlannerDecisionLog(
        planning_cycle_id="test-cloudy-fallback",
        initial_soc_kwh=initial_battery_kwh,
        target_soc_kwh=strategy._target,
    )

    charging_intervals, infeasible_reason, price_band_intervals = module.plan_charging_intervals(
        strategy,
        initial_battery_kwh=initial_battery_kwh,
        solar_forecast=solar_forecast,
        consumption_forecast=consumption_forecast,
        prices=prices,
        balancing_plan=None,
        negative_price_intervals=None,
        decision_log=decision_log,
    )

    solar_blocked = decision_log.get_solar_fill_blocked_decisions()

    assert len(solar_blocked) == 0, (
        f"Cloudy fallback regression failed: Planner incorrectly blocked charging due to "
        f"'future solar will fill' when solar is very weak (0.05 kWh/interval). "
        f"Blocked decisions: {len(solar_blocked)}. "
        f"Under cloudy conditions, planner must NOT assume optimistic solar fill."
    )

    add_decisions = [d for d in decision_log.decisions if d.action == UPSDecisionAction.ADD]
    assert len(add_decisions) > 0, (
        f"Cloudy fallback regression failed: Expected protective charging under cloudy conditions "
        f"but got no ADD decisions. Charging intervals: {charging_intervals}. "
        f"Planner must add protective charging when solar is insufficient."
    )
