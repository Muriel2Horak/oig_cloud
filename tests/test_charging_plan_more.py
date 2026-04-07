from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import pytest

from custom_components.oig_cloud.battery_forecast.planning import charging_plan
from custom_components.oig_cloud.battery_forecast.planning.charging_plan import (
    EconomicChargingPlanConfig,
)
from custom_components.oig_cloud.battery_forecast.planning.rollout_flags import RolloutFlags


def _timeline_point(ts: str, battery: float, price: float = 2.0):
    return {
        "timestamp": ts,
        "battery_capacity_kwh": battery,
        "spot_price_czk": price,
        "grid_charge_kwh": 0.0,
        "reason": "normal",
    }


def _make_plan(**overrides) -> EconomicChargingPlanConfig:
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
    )
    base.update(overrides)
    return EconomicChargingPlanConfig(**base)


def test_economic_charging_plan_no_candidates(monkeypatch):
    timeline = [_timeline_point("2025-01-01T00:00:00", 5.0)]

    monkeypatch.setattr(
        charging_plan, "calculate_protection_requirement", lambda *_a, **_k: None
    )
    monkeypatch.setattr(charging_plan, "get_candidate_intervals", lambda *_a, **_k: [])

    result_timeline, metrics = charging_plan.economic_charging_plan(
        timeline_data=timeline,
        plan=_make_plan(),
    )

    assert result_timeline == timeline
    assert metrics == {}


def test_economic_charging_plan_death_valley_fix(monkeypatch):
    timeline = [
        _timeline_point("2025-01-01T00:00:00", 5.0),
        _timeline_point("2025-01-01T00:15:00", 4.0),
    ]

    monkeypatch.setattr(
        charging_plan, "calculate_protection_requirement", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        charging_plan,
        "get_candidate_intervals",
        lambda *_a, **_k: [{"index": 0, "price": 2.0, "timestamp": "t"}],
    )

    def _simulate_forward(*_a, **kwargs):
        if kwargs.get("charge_now"):
            return {"total_charging_cost": 1.0}
        return {"total_charging_cost": 10.0, "min_soc": 0.0, "death_valley_reached": True}

    monkeypatch.setattr(charging_plan, "simulate_forward", _simulate_forward)
    monkeypatch.setattr(charging_plan, "calculate_minimum_charge", lambda *_a, **_k: 0.5)
    monkeypatch.setattr(charging_plan, "recalculate_timeline_from_index", lambda *_a, **_k: None)

    result_timeline, _ = charging_plan.economic_charging_plan(
        timeline_data=timeline,
        plan=_make_plan(),
    )

    assert result_timeline[0]["reason"] == "death_valley_fix"
    assert result_timeline[0]["grid_charge_kwh"] > 0


def test_economic_charging_plan_economic_charge(monkeypatch):
    timeline = [
        _timeline_point("2025-01-01T00:00:00", 5.0),
        _timeline_point("2025-01-01T00:15:00", 4.0),
    ]

    monkeypatch.setattr(
        charging_plan, "calculate_protection_requirement", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        charging_plan,
        "get_candidate_intervals",
        lambda *_a, **_k: [{"index": 0, "price": 1.0, "timestamp": "t"}],
    )

    def _simulate_forward(*_a, **kwargs):
        if kwargs.get("charge_now"):
            return {"total_charging_cost": 1.0}
        return {"total_charging_cost": 2.0, "min_soc": 2.0, "death_valley_reached": False}

    monkeypatch.setattr(charging_plan, "simulate_forward", _simulate_forward)
    monkeypatch.setattr(charging_plan, "recalculate_timeline_from_index", lambda *_a, **_k: None)

    result_timeline, metrics = charging_plan.economic_charging_plan(
        timeline_data=timeline,
        plan=_make_plan(),
    )

    assert result_timeline[0]["reason"] == "economic_charge"
    assert metrics["algorithm"] == "economic"


def test_smart_charging_plan_critical_fix(monkeypatch):
    now = datetime.now()
    timeline = [
        {
            "timestamp": (now + timedelta(minutes=15 * i)).isoformat(),
            "spot_price_czk": 1.0,
            "battery_capacity_kwh": 0.0 if i == 2 else 5.0,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
        }
        for i in range(4)
    ]

    monkeypatch.setattr(
        charging_plan, "recalculate_timeline_from_index", lambda *_a, **_k: None
    )

    result_timeline, metrics = charging_plan.smart_charging_plan(
        timeline=timeline,
        min_capacity=1.0,
        target_capacity=5.0,
        max_price=5.0,
        charging_power_kw=2.0,
        max_capacity=10.0,
        efficiency=1.0,
        mode_label_home_ups="UPS",
        mode_label_home_i="I",
    )

    assert "target_capacity_kwh" in metrics
    assert any(point["grid_charge_kwh"] > 0 for point in result_timeline)


def test_should_pre_charge_for_peak_avoidance_waits_for_cheaper_post_peak_slot():
    intervals = [
        {
            "timestamp": "2025-01-01T04:00:00+00:00",
            "spot_price_czk": 1.8,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T05:00:00+00:00",
            "spot_price_czk": 2.0,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T06:00:00+00:00",
            "spot_price_czk": 4.5,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T07:00:00+00:00",
            "spot_price_czk": 4.7,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T08:00:00+00:00",
            "spot_price_czk": 1.0,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
    ]

    decision = charging_plan.should_pre_charge_for_peak_avoidance(
        config=_make_plan(hw_min_soc_kwh=1.5, round_trip_efficiency=0.87, max_capacity=2.0),
        flags=RolloutFlags(enable_pre_peak_charging=True),
        intervals=intervals,
        current_hour=3,
        current_soc_kwh=1.6,
    )

    assert decision.should_charge is False
    assert decision.reason == "cheaper_post_peak_available"


def test_should_pre_charge_for_peak_avoidance_preserves_headroom_for_future_negative_price():
    intervals = [
        {
            "timestamp": "2025-01-01T04:00:00+00:00",
            "spot_price_czk": 1.8,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T05:00:00+00:00",
            "spot_price_czk": 1.9,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T06:00:00+00:00",
            "spot_price_czk": 4.5,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T07:00:00+00:00",
            "spot_price_czk": 4.7,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T08:00:00+00:00",
            "spot_price_czk": -0.5,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.8,
        },
    ]

    decision = charging_plan.should_pre_charge_for_peak_avoidance(
        config=_make_plan(
            hw_min_soc_kwh=1.5,
            round_trip_efficiency=0.87,
            max_capacity=2.4,
        ),
        flags=RolloutFlags(enable_pre_peak_charging=True),
        intervals=intervals,
        current_hour=3,
        current_soc_kwh=1.6,
    )

    assert decision.should_charge is False
    assert decision.reason == "future_negative_price_headroom"


def test_should_pre_charge_for_peak_avoidance_keeps_precharge_when_pre_peak_load_would_drain_battery():
    intervals = [
        {
            "timestamp": "2025-01-01T04:00:00+00:00",
            "spot_price_czk": 1.8,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.5,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T05:00:00+00:00",
            "spot_price_czk": 1.9,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.5,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T06:00:00+00:00",
            "spot_price_czk": 4.5,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.1,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T07:00:00+00:00",
            "spot_price_czk": 4.7,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.1,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T08:00:00+00:00",
            "spot_price_czk": 1.0,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
    ]

    decision = charging_plan.should_pre_charge_for_peak_avoidance(
        config=_make_plan(hw_min_soc_kwh=1.5, round_trip_efficiency=0.87),
        flags=RolloutFlags(enable_pre_peak_charging=True),
        intervals=intervals,
        current_hour=3,
        current_soc_kwh=1.6,
    )

    assert decision.should_charge is True
    assert decision.reason == "economical_pre_peak"


def test_should_pre_charge_for_peak_avoidance_projects_soc_before_soc_sufficient_check():
    intervals = [
        {
            "timestamp": "2025-01-01T04:00:00+00:00",
            "spot_price_czk": 1.8,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.2,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T05:00:00+00:00",
            "spot_price_czk": 1.9,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.2,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T06:00:00+00:00",
            "spot_price_czk": 4.5,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.1,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T07:00:00+00:00",
            "spot_price_czk": 4.7,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.1,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T08:00:00+00:00",
            "spot_price_czk": 4.0,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
    ]

    decision = charging_plan.should_pre_charge_for_peak_avoidance(
        config=_make_plan(hw_min_soc_kwh=1.0, round_trip_efficiency=0.87),
        flags=RolloutFlags(enable_pre_peak_charging=True),
        intervals=intervals,
        current_hour=3,
        current_soc_kwh=1.15,
    )

    assert decision.should_charge is True
    assert decision.reason == "economical_pre_peak"


def test_should_pre_charge_for_peak_avoidance_detects_next_day_cheaper_slot():
    intervals = [
        {
            "timestamp": "2025-01-01T04:00:00+00:00",
            "spot_price_czk": 2.0,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T05:00:00+00:00",
            "spot_price_czk": 2.2,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T06:00:00+00:00",
            "spot_price_czk": 4.8,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T07:00:00+00:00",
            "spot_price_czk": 4.9,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-02T04:00:00+00:00",
            "spot_price_czk": 0.7,
            "battery_capacity_kwh": 1.6,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
    ]

    decision = charging_plan.should_pre_charge_for_peak_avoidance(
        config=_make_plan(hw_min_soc_kwh=1.5, round_trip_efficiency=0.87),
        flags=RolloutFlags(enable_pre_peak_charging=True),
        intervals=intervals,
        current_hour=3,
        current_soc_kwh=1.6,
    )

    assert decision.should_charge is False
    assert decision.reason == "cheaper_post_peak_available"


def test_should_pre_charge_for_peak_avoidance_ignores_negative_price_when_headroom_remains_sufficient():
    intervals = [
        {
            "timestamp": "2025-01-01T04:00:00+00:00",
            "spot_price_czk": 1.8,
            "battery_capacity_kwh": 1.0,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T05:00:00+00:00",
            "spot_price_czk": 1.9,
            "battery_capacity_kwh": 1.0,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T06:00:00+00:00",
            "spot_price_czk": 4.5,
            "battery_capacity_kwh": 1.0,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T07:00:00+00:00",
            "spot_price_czk": 4.7,
            "battery_capacity_kwh": 1.0,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.0,
        },
        {
            "timestamp": "2025-01-01T08:00:00+00:00",
            "spot_price_czk": 2.2,
            "battery_capacity_kwh": 1.0,
            "grid_charge_kwh": 0.0,
            "reason": "normal",
            "consumption_kwh": 0.0,
            "solar_production_kwh": 0.6,
        },
    ]

    decision = charging_plan.should_pre_charge_for_peak_avoidance(
        config=_make_plan(hw_min_soc_kwh=1.0, round_trip_efficiency=0.87, max_capacity=10.0),
        flags=RolloutFlags(enable_pre_peak_charging=True),
        intervals=intervals,
        current_hour=3,
        current_soc_kwh=1.0,
    )

    assert decision.should_charge is True
    assert decision.reason == "economical_pre_peak"
