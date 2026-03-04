from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import pytest

import custom_components.oig_cloud.battery_forecast.planning.charging_plan as charging_plan_module
from custom_components.oig_cloud.battery_forecast.planning.charging_plan import (
    EconomicChargingPlanConfig,
    PrePeakDecision,
    economic_charging_plan,
    should_defer_for_pv,
    should_pre_charge_for_peak_avoidance,
)
from custom_components.oig_cloud.battery_forecast.planning.precedence_contract import (
    PrecedenceLevel,
)
from custom_components.oig_cloud.battery_forecast.planning.rollout_flags import RolloutFlags


def _make_pre_peak_intervals(
    peak_start_hour: int = 6,
    pre_peak_hours: int = 2,
    peak_price: float = 11.0,
    pre_peak_price: float = 6.0,
    solar_kwh_pre_peak: float = 0.0,
    initial_soc_kwh: float = 1.5,
    max_capacity_kwh: float = 10.24,
    with_economic_charging: bool = False,
    consumption_kwh: float = 0.0,
) -> list[dict[str, Any]]:
    timeline: list[dict[str, Any]] = []
    now = datetime(2025, 1, 15, 4, 0, tzinfo=timezone.utc)
    pre_peak_start = peak_start_hour - pre_peak_hours
    peak_end_hour = peak_start_hour + 2

    for i in range(96):
        ts = now + timedelta(minutes=15 * i)
        hour = ts.hour

        if pre_peak_start <= hour < peak_start_hour:
            price = pre_peak_price
            zone = "pre_peak"
        elif peak_start_hour <= hour < peak_end_hour:
            price = peak_price
            zone = "peak"
        else:
            price = 4.0
            zone = "normal"

        solar_wh = solar_kwh_pre_peak * 1000 if zone == "pre_peak" and i > 0 else 0

        grid_charge_kwh = 0.0
        if with_economic_charging and zone == "pre_peak":
            grid_charge_kwh = 0.8

        soc_kwh = initial_soc_kwh
        if i > 0:
            prev_soc = timeline[i - 1]["battery_capacity_kwh"]
            soc_kwh = min(max_capacity_kwh, max(0.0, prev_soc + grid_charge_kwh - consumption_kwh))

        timeline.append(
            {
                "timestamp": ts.isoformat(),
                "spot_price_czk": price,
                "battery_capacity_kwh": soc_kwh,
                "grid_charge_kwh": grid_charge_kwh,
                "solar_wh": solar_wh,
                "consumption_kwh": consumption_kwh,
                "reason": "normal" if grid_charge_kwh == 0 else "economic_charge",
            }
        )

    return timeline


def _make_config(**overrides: Any) -> EconomicChargingPlanConfig:
    config = EconomicChargingPlanConfig(
        min_capacity_kwh=2.0,
        min_capacity_floor=1.0,
        effective_minimum_kwh=2.0,
        target_capacity_kwh=8.0,
        max_charging_price=10.0,
        min_savings_margin=0.5,
        charging_power_kw=3.0,
        max_capacity=10.24,
        battery_efficiency=0.87,
        config={},
        iso_tz_offset="+01:00",
        mode_label_home_ups="homeups",
        mode_label_home_i="home2",
        hw_min_soc_kwh=2.05,
        peak_start_hour=6,
        peak_end_hour=8,
        pre_peak_window_hours=2,
    )
    for key, value in overrides.items():
        setattr(config, key, value)
    return config


@pytest.fixture
def freeze_planner_now(monkeypatch: pytest.MonkeyPatch) -> None:
    class _FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz: Any | None = None) -> datetime:
            frozen = datetime(2025, 1, 15, 4, 0, tzinfo=timezone.utc)
            if tz is not None:
                return frozen.astimezone(tz)
            return frozen.replace(tzinfo=None)

    monkeypatch.setattr(charging_plan_module, "datetime", _FrozenDateTime)


def test_pv_first_defers_pre_peak_when_solar_available(freeze_planner_now: None):
    timeline = _make_pre_peak_intervals(initial_soc_kwh=2.1, solar_kwh_pre_peak=0.9)
    plan = _make_config(pv_forecast_kwh=4.0, pv_forecast_confidence=0.8)
    flags = RolloutFlags(enable_pre_peak_charging=True, pv_first_policy_enabled=True)

    result_timeline, metrics = economic_charging_plan(
        timeline_data=timeline,
        plan=plan,
        rollout_flags=flags,
    )

    assert metrics.get("pv_first_deferred") is True
    assert any(t["reason_code"] == "pv_first" for t in metrics.get("decision_trace", []))
    assert not any(
        "pre_peak_avoidance" in str(point.get("decision_reason", "")) for point in result_timeline
    )


def test_pre_peak_does_not_interfere_with_pv_first_decision(freeze_planner_now: None):
    timeline = _make_pre_peak_intervals(initial_soc_kwh=2.1, solar_kwh_pre_peak=0.0)
    plan = _make_config(pv_forecast_kwh=2.5, pv_forecast_confidence=0.9)
    flags = RolloutFlags(enable_pre_peak_charging=True, pv_first_policy_enabled=True)

    pre_peak_only = should_pre_charge_for_peak_avoidance(
        config=plan,
        flags=RolloutFlags(enable_pre_peak_charging=True, pv_first_policy_enabled=False),
        intervals=timeline,
        current_hour=4,
        current_soc_kwh=2.1,
    )
    assert isinstance(pre_peak_only, PrePeakDecision)
    assert pre_peak_only.should_charge is True

    _, metrics = economic_charging_plan(
        timeline_data=timeline,
        plan=plan,
        rollout_flags=flags,
    )

    reason_codes = [t["reason_code"] for t in metrics.get("decision_trace", [])]
    assert "pv_first" in reason_codes
    assert "pre_peak_avoidance" not in reason_codes


def test_death_valley_still_triggers_when_soc_critical(freeze_planner_now: None):
    timeline = _make_pre_peak_intervals(initial_soc_kwh=1.0, consumption_kwh=0.35)
    plan = _make_config(
        effective_minimum_kwh=2.0,
        min_capacity_kwh=2.0,
        pv_forecast_kwh=5.0,
        pv_forecast_confidence=0.9,
    )
    flags = RolloutFlags(enable_pre_peak_charging=True, pv_first_policy_enabled=True)

    assert (
        should_defer_for_pv(
            pv_forecast_kwh=plan.pv_forecast_kwh,
            pv_forecast_confidence=plan.pv_forecast_confidence,
            current_soc_kwh=1.0,
            death_valley_threshold_kwh=plan.effective_minimum_kwh,
            protection_override_active=False,
            flags=flags,
        )
        is False
    )

    _, metrics = economic_charging_plan(timeline_data=timeline, plan=plan, rollout_flags=flags)
    reason_codes = [t["reason_code"] for t in metrics.get("decision_trace", [])]

    assert "death_valley" in reason_codes
    death_valley_entries = [t for t in metrics.get("decision_trace", []) if t["reason_code"] == "death_valley"]
    assert all(t["precedence_level"] == PrecedenceLevel.DEATH_VALLEY for t in death_valley_entries)


def test_pre_peak_respects_protection_safety_precedence(freeze_planner_now: None):
    timeline = _make_pre_peak_intervals(initial_soc_kwh=1.2, consumption_kwh=0.2)
    plan = _make_config(
        config={
            "enable_blackout_protection": True,
            "blackout_protection_hours": 12,
            "blackout_target_soc_percent": 80.0,
        }
    )
    flags = RolloutFlags(enable_pre_peak_charging=True, pv_first_policy_enabled=False)

    _, metrics = economic_charging_plan(timeline_data=timeline, plan=plan, rollout_flags=flags)
    trace = metrics.get("decision_trace", [])

    protection_entries = [t for t in trace if t["reason_code"] == "protection_safety"]
    assert protection_entries
    assert all(t["precedence_level"] == PrecedenceLevel.PROTECTION_SAFETY for t in protection_entries)

    pre_peak_entries = [t for t in trace if t["reason_code"] == "pre_peak_avoidance"]
    if pre_peak_entries:
        assert all(
            p["precedence_level"] > pre["precedence_level"]
            for p in protection_entries
            for pre in pre_peak_entries
        )


def test_skip_pre_peak_when_less_than_one_hour_to_peak():
    timeline = _make_pre_peak_intervals(initial_soc_kwh=1.2)
    plan = _make_config()
    flags = RolloutFlags(enable_pre_peak_charging=True)

    decision = should_pre_charge_for_peak_avoidance(
        config=plan,
        flags=flags,
        intervals=timeline,
        current_hour=5,
        current_soc_kwh=1.2,
    )

    assert decision.should_charge is False
    assert decision.reason == "too_close_to_peak"


def test_no_double_charge_when_economic_already_scheduled(freeze_planner_now: None):
    timeline = _make_pre_peak_intervals(initial_soc_kwh=1.2, with_economic_charging=True)
    plan = _make_config()
    flags = RolloutFlags(enable_pre_peak_charging=True, pv_first_policy_enabled=False)

    pre_peak_indices = {
        idx
        for idx, interval in enumerate(timeline)
        if 4 <= datetime.fromisoformat(interval["timestamp"]).hour < 6
    }
    before_total = sum(timeline[i].get("grid_charge_kwh", 0.0) for i in pre_peak_indices)

    result_timeline, _ = economic_charging_plan(timeline_data=timeline, plan=plan, rollout_flags=flags)
    after_total = sum(result_timeline[i].get("grid_charge_kwh", 0.0) for i in pre_peak_indices)

    assert after_total == pytest.approx(before_total)


def test_skip_when_price_ratio_insufficient():
    timeline = _make_pre_peak_intervals(initial_soc_kwh=1.4, peak_price=7.0, pre_peak_price=6.0)
    plan = _make_config(round_trip_efficiency=0.87, peak_price_ratio_threshold=1.2)
    flags = RolloutFlags(enable_pre_peak_charging=True)

    decision = should_pre_charge_for_peak_avoidance(
        config=plan,
        flags=flags,
        intervals=timeline,
        current_hour=4,
        current_soc_kwh=1.4,
    )

    assert decision.should_charge is False
    assert decision.reason == "not_economical"


def test_canary_warning_logged_when_soc_below_threshold(
    freeze_planner_now: None, caplog: pytest.LogCaptureFixture
):
    timeline = _make_pre_peak_intervals(initial_soc_kwh=1.0, peak_price=12.0, pre_peak_price=5.0)
    plan = _make_config(pv_forecast_kwh=0.0, pv_forecast_confidence=0.0)
    flags = RolloutFlags(
        enable_pre_peak_charging=True,
        pv_first_policy_enabled=False,
        pre_peak_charging_canary_soc_threshold_kwh=1.5,
    )

    with caplog.at_level("WARNING"):
        economic_charging_plan(timeline_data=timeline, plan=plan, rollout_flags=flags)

    assert "PRE_PEAK_CANARY" in caplog.text
