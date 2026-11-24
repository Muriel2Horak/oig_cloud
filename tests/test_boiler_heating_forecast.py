"""Source-agnostic boiler heating forecast: how much heat, and when."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import pytest

from custom_components.oig_cloud.boiler.heating_forecast import (
    WATER_KWH_PER_L_K,
    build_heating_forecast,
    forecast_from_plan,
    simulate_thermostat,
)

TZ = timezone(timedelta(hours=1))
NOW = datetime(2026, 7, 1, 5, 0, tzinfo=TZ)


def _starts(n):
    return [NOW + timedelta(minutes=15 * i) for i in range(n)]


def _sim(n, draws=None, **kw):
    values = dict(
        slot_starts=_starts(n),
        start_temp_c=60.0,
        volume_l=200.0,
        setpoint_c=60.0,
        hysteresis_c=5.0,
        heater_kw=3.0,
        draws_kwh=draws or [0.0] * n,
        ambient_c=20.0,
        loss_w_per_k=0.0,
    )
    values.update(kw)
    return simulate_thermostat(**values)


def test_idle_tank_without_draws_or_losses_never_heats():
    slots = _sim(8)
    assert sum(s.heat_kwh for s in slots) == 0.0
    assert slots[-1].temp_c == pytest.approx(60.0)


def test_standing_loss_cools_the_tank():
    slots = _sim(4, loss_w_per_k=2.0)
    # 2 W/K * 40 K = 80 W -> 0.02 kWh a slot from 200 l.
    expected_drop = 0.02 / (200.0 * WATER_KWH_PER_L_K)
    assert slots[0].loss_kwh == pytest.approx(0.02)
    assert slots[0].temp_c == pytest.approx(60.0 - expected_drop)


def test_a_draw_below_the_switch_on_point_heats_back_to_setpoint():
    # 4.65 kWh out of 200 l is a 20 K drop: 60 -> 40, below 55.
    draw = 20.0 * 200.0 * WATER_KWH_PER_L_K
    slots = _sim(12, draws=[draw] + [0.0] * 11)

    heats = [round(s.heat_kwh, 4) for s in slots]
    # 3 kW = 0.75 kWh a slot, so the slot of the draw and the next ones heat
    # until the energy is back.
    assert heats[:6] == [0.75] * 6
    assert sum(s.heat_kwh for s in slots) == pytest.approx(draw, abs=1e-6)
    assert slots[-1].temp_c == pytest.approx(60.0)


def test_a_small_draw_inside_the_hysteresis_does_not_switch_the_heater_on():
    draw = 3.0 * 200.0 * WATER_KWH_PER_L_K  # 3 K
    slots = _sim(4, draws=[draw, 0.0, 0.0, 0.0])
    assert sum(s.heat_kwh for s in slots) == 0.0
    assert slots[-1].temp_c == pytest.approx(57.0)


@dataclass
class _PlanSlot:
    start: datetime
    end: datetime
    heating_kwh: float = 0.0
    pv_kwh: float = 0.0
    grid_kwh: float = 0.0
    alt_kwh: float = 0.0
    battery_kwh: float = 0.0
    predicted_top_temp_c: float = 0.0


def _plan(slots):
    class _Result:
        pass

    result = _Result()
    result.slots = slots
    return result


def test_plan_slots_give_the_electric_share_by_source():
    start = NOW
    plan = _plan(
        [
            _PlanSlot(start, start + timedelta(minutes=15), heating_kwh=0.75, pv_kwh=0.75),
            _PlanSlot(start + timedelta(minutes=15), start + timedelta(minutes=30), heating_kwh=0.75, grid_kwh=0.5, battery_kwh=0.25),
            _PlanSlot(start + timedelta(minutes=30), start + timedelta(minutes=45), heating_kwh=1.0, alt_kwh=1.0),
        ]
    )

    slots = forecast_from_plan(plan)

    assert [s.electric_kwh for s in slots] == pytest.approx([0.75, 0.75, 0.0])
    assert slots[0].pv_kwh == pytest.approx(0.75)
    assert slots[1].grid_kwh == pytest.approx(0.5)
    assert slots[1].battery_kwh == pytest.approx(0.25)
    assert slots[2].alt_kwh == pytest.approx(1.0)
    assert all(s.method == "plan" for s in slots)


def test_forecast_uses_the_plan_when_there_is_one():
    plan = _plan([_PlanSlot(NOW, NOW + timedelta(minutes=15), heating_kwh=0.5, grid_kwh=0.5)])
    forecast = build_heating_forecast(plan_result=plan, thermostat=None)

    assert forecast.method == "plan"
    assert forecast.electric_kwh_by_start() == {NOW: 0.5}


def test_forecast_falls_back_to_the_thermostat_when_there_is_no_plan():
    draw = 20.0 * 200.0 * WATER_KWH_PER_L_K
    thermostat = _sim(12, draws=[draw] + [0.0] * 11)
    forecast = build_heating_forecast(plan_result=None, thermostat=thermostat)

    assert forecast.method == "thermostat"
    assert forecast.total_heat_kwh == pytest.approx(draw)
    assert forecast.electric_kwh == pytest.approx(draw)
    assert forecast.first_heat_at == NOW
    # Without a plan the heat is not split by source: all of it is grid side.
    assert forecast.slots[0].grid_kwh == pytest.approx(0.75)


def test_thermostat_heat_from_the_alternative_source_is_not_electric():
    draw = 20.0 * 200.0 * WATER_KWH_PER_L_K
    thermostat = _sim(12, draws=[draw] + [0.0] * 11)
    forecast = build_heating_forecast(plan_result=None, thermostat=thermostat, electric=False)

    assert forecast.electric_kwh == 0.0
    assert forecast.total_heat_kwh == pytest.approx(draw)
    assert forecast.slots[0].alt_kwh == pytest.approx(0.75)


def test_empty_plan_falls_back_to_the_thermostat():
    thermostat = _sim(2)
    forecast = build_heating_forecast(plan_result=_plan([]), thermostat=thermostat)
    assert forecast.method == "thermostat"


def test_no_inputs_give_an_empty_forecast():
    forecast = build_heating_forecast(plan_result=None, thermostat=None)
    assert forecast.method == "none"
    assert forecast.slots == []
    assert forecast.as_dict()["total_heat_kwh"] == 0.0


# ── draw calibration ───────────────────────────────────────────────────────

from custom_components.oig_cloud.boiler.heating_forecast import draw_scale  # noqa: E402


def test_draw_scale_matches_measured_heat_minus_losses():
    # Measured 11 kWh a day, 2 kWh of it standing loss, profile says 3 kWh of draws.
    assert draw_scale([10.0, 12.0, 11.0], [3.0, 3.0, 3.0], 2.0) == pytest.approx(3.0)


def test_draw_scale_is_clamped_and_needs_enough_days():
    assert draw_scale([50.0, 50.0, 50.0], [1.0, 1.0, 1.0], 0.0) == 4.0
    assert draw_scale([1.0, 1.0, 1.0], [5.0, 5.0, 5.0], 0.0) == 0.5
    assert draw_scale([10.0, 12.0], [3.0, 3.0], 2.0) == 1.0  # too few days
    assert draw_scale([10.0, 12.0, 11.0], [0.0, 0.0, 0.0], 2.0) == 1.0  # no profile


def test_days_without_measured_heat_are_left_out():
    assert draw_scale([0.0, 10.0, 12.0, 11.0], [3.0, 3.0, 3.0, 3.0], 2.0) == pytest.approx(3.0)
