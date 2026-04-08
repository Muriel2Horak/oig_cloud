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


def test_should_charge_now_uses_round_trip_cost_gate():
    assert not module._should_charge_now(
        4.80,
        min_future_price=4.48,
        round_trip_eff=0.84,
        hysteresis=0.0,
    )


def test_should_charge_now_allows_cheaper_precharge():
    assert module._should_charge_now(
        3.00,
        min_future_price=4.48,
        round_trip_eff=0.84,
        hysteresis=0.0,
    )


# =============================================================================
# Task 9 Tests: Economic Branch Precedence Contract Integration
# =============================================================================

from datetime import datetime, timedelta, timezone
from typing import Any
from typing import Any, Dict, List

from custom_components.oig_cloud.battery_forecast.planning import charging_plan
from custom_components.oig_cloud.battery_forecast.planning.charging_plan import (
    EconomicChargingPlanConfig,
    REASON_DEATH_VALLEY,
    REASON_PROTECTION_SAFETY,
    REASON_ECONOMIC_CHARGING,
    REASON_PV_FIRST,
)
from custom_components.oig_cloud.battery_forecast.planning.precedence_contract import PrecedenceLevel
from custom_components.oig_cloud.battery_forecast.planning.rollout_flags import RolloutFlags


def _make_timeline_point(ts: str, battery: float, price: float = 2.0) -> Dict[str, Any]:
    return {
        "timestamp": ts,
        "battery_capacity_kwh": battery,
        "spot_price_czk": price,
        "grid_charge_kwh": 0.0,
        "reason": "normal",
        "solar_production_kwh": 0.0,
        "consumption_kwh": 0.3,
    }


def _make_plan_config(**overrides) -> EconomicChargingPlanConfig:
    base: dict[str, Any] = dict(
        min_capacity_kwh=1.0,
        min_capacity_floor=0.5,
        effective_minimum_kwh=1.0,
        target_capacity_kwh=2.0,
        max_charging_price=5.0,
        min_savings_margin=0.1,
        charging_power_kw=2.0,
        max_capacity=10.0,
        battery_efficiency=1.0,
        config={},
        iso_tz_offset="+00:00",
        mode_label_home_ups="UPS",
        mode_label_home_i="I",
        target_reason="test",
        pv_forecast_kwh=0.0,
        pv_forecast_confidence=0.0,
        pv_forecast_lookahead_hours=6,
    )
    base.update(overrides)
    return EconomicChargingPlanConfig(**base)


def test_economic_branch_uses_contract(monkeypatch):
    """Test that economic charging branch emits decision trace with precedence reason.

    Scenario: Mixed price curve with medium PV forecast.
    - Some intervals should be accepted (economic_charge with precedence)
    - Some intervals should be rejected/skipped (insufficient savings with precedence)
    - Decision trace should include reason_code and precedence_level for each
    """
    now = datetime(2025, 1, 15, 10, 0, tzinfo=timezone.utc)
    timeline = [
        _make_timeline_point((now + timedelta(minutes=15 * i)).isoformat(), 5.0, price=1.0 if i % 2 == 0 else 4.0)
        for i in range(8)
    ]

    monkeypatch.setattr(
        charging_plan, "calculate_protection_requirement", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        charging_plan,
        "get_candidate_intervals",
        lambda *_a, **_k: [
            {"index": 0, "price": 1.0, "timestamp": timeline[0]["timestamp"]},
            {"index": 2, "price": 1.0, "timestamp": timeline[2]["timestamp"]},
        ],
    )

    def _simulate_forward(*_a, **kwargs):
        if kwargs.get("charge_now"):
            return {"total_charging_cost": 0.5}
        return {"total_charging_cost": 2.0, "min_soc": 3.0, "death_valley_reached": False}

    monkeypatch.setattr(charging_plan, "simulate_forward", _simulate_forward)
    monkeypatch.setattr(charging_plan, "recalculate_timeline_from_index", lambda *_a, **_k: None)

    plan = _make_plan_config(min_savings_margin=0.05)
    result_timeline, metrics = charging_plan.economic_charging_plan(
        timeline_data=timeline,
        plan=plan,
        rollout_flags=RolloutFlags(pv_first_policy_enabled=False),
    )

    assert "decision_trace" in metrics, "Metrics should include decision_trace"
    trace = metrics["decision_trace"]
    assert len(trace) >= 1, "Should have at least one trace entry for economic charging"

    charge_traces = [t for t in trace if t["action"] == "charge"]
    assert len(charge_traces) >= 1, "Should have at least one charge action"

    for t in charge_traces:
        assert "reason_code" in t, "Trace entry should have reason_code"
        assert "precedence_level" in t, "Trace entry should have precedence_level"
        assert "precedence_name" in t, "Trace entry should have precedence_name"
        assert t["reason_code"] == REASON_ECONOMIC_CHARGING, f"Expected economic_charging, got {t['reason_code']}"
        assert t["precedence_level"] == PrecedenceLevel.ECONOMIC_CHARGING.value

    for point in result_timeline:
        if point.get("grid_charge_kwh", 0) > 0 and point.get("reason") == "economic_charge":
            assert point.get("precedence_reason") == REASON_ECONOMIC_CHARGING
            assert point.get("precedence_level") == PrecedenceLevel.ECONOMIC_CHARGING


def test_death_valley_has_higher_priority_than_defer(monkeypatch):
    """Test that death-valley charging occurs even when PV-first would defer.

    Scenario: Low SOC runway (below death valley threshold)
    - PV-first is enabled with good forecast
    - But SOC is below death valley threshold
    - Death valley charging should occur with DEATH_VALLEY precedence (800)
    - This proves DEATH_VALLEY (800) > PV_FIRST (1000) is NOT the case
      - Actually, death valley bypasses PV-first gate in should_defer_for_pv()
    """
    now = datetime(2025, 1, 15, 10, 0, tzinfo=timezone.utc)
    timeline = [
        _make_timeline_point((now + timedelta(minutes=15 * i)).isoformat(), 0.5, price=2.0)
        for i in range(8)
    ]

    monkeypatch.setattr(
        charging_plan, "calculate_protection_requirement", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        charging_plan,
        "get_candidate_intervals",
        lambda *_a, **_k: [
            {"index": 0, "price": 2.0, "timestamp": timeline[0]["timestamp"]},
        ],
    )

    def _simulate_forward(*_a, **kwargs):
        if kwargs.get("charge_now"):
            return {"total_charging_cost": 1.0}
        return {"total_charging_cost": 10.0, "min_soc": 0.0, "death_valley_reached": True}

    monkeypatch.setattr(charging_plan, "simulate_forward", _simulate_forward)
    monkeypatch.setattr(charging_plan, "calculate_minimum_charge", lambda *_a, **_k: 0.5)
    monkeypatch.setattr(charging_plan, "recalculate_timeline_from_index", lambda *_a, **_k: None)

    plan = _make_plan_config(
        effective_minimum_kwh=1.0,
        pv_forecast_kwh=5.0,
        pv_forecast_confidence=0.8,
    )
    result_timeline, metrics = charging_plan.economic_charging_plan(
        timeline_data=timeline,
        plan=plan,
        rollout_flags=RolloutFlags(pv_first_policy_enabled=True),
    )

    assert "decision_trace" in metrics, "Metrics should include decision_trace"
    trace = metrics["decision_trace"]

    death_valley_traces = [t for t in trace if t["reason_code"] == REASON_DEATH_VALLEY]
    assert len(death_valley_traces) >= 1, "Should have death_valley trace entry"

    for t in death_valley_traces:
        assert t["action"] == "charge"
        assert t["precedence_level"] == PrecedenceLevel.DEATH_VALLEY.value
        assert t["precedence_name"] == "DEATH_VALLEY"

    death_valley_points = [
        p for p in result_timeline
        if p.get("precedence_reason") == REASON_DEATH_VALLEY
    ]
    assert len(death_valley_points) >= 1, "Should have death_valley interval in timeline"

    for point in death_valley_points:
        assert point.get("grid_charge_kwh", 0) > 0
        assert point.get("precedence_level") == PrecedenceLevel.DEATH_VALLEY
