"""Who gets the PV surplus and the breaker: car, boiler, home battery."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from custom_components.oig_cloud.battery_forecast.planning.flex_loads import (
    EvRequest,
    FlexInputs,
    GridLimits,
    plan_flex_loads,
)
from custom_components.oig_cloud.ev.profile import NextNeed

TZ = timezone(timedelta(hours=1))
NOW = datetime(2026, 11, 16, 1, 0, tzinfo=TZ)
LIMITS = GridLimits(breaker_a=25.0, reserve_a=0.0, voltage_v=230.0, phases=3)


def _starts(n):
    return [NOW + timedelta(minutes=15 * i) for i in range(n)]


def _inputs(n, **kw):
    values = dict(
        slot_starts=_starts(n),
        import_prices=[2.0] * n,
        export_prices=[0.5] * n,
        solar_kwh=[0.0] * n,
        backup_load_kwh=[0.0] * n,
        surplus_after_battery_kwh=[0.0] * n,
        battery_charge_kw=6.9,
        limits=LIMITS,
        priority=("ev", "boiler", "battery"),
        pv_battery_first=True,
        ev=None,
        boiler_electric_kwh=None,
    )
    values.update(kw)
    return FlexInputs(**values)


def _ev(deadline_slots, need_pct=60.0, **kw):
    values = dict(
        soc_pct=20.0,
        capacity_kwh=25.0,
        charge_limit_pct=100.0,
        max_power_kw=11.0,
        min_power_kw=4.1,
        need=NextNeed(NOW + timedelta(minutes=15 * deadline_slots), need_pct, 0),
        plugged_in=True,
        phases=3,
    )
    values.update(kw)
    return EvRequest(**values)


def test_without_flexible_loads_nothing_changes_for_the_battery():
    plan = plan_flex_loads(_inputs(4, solar_kwh=[1.0, 1.0, 0.0, 0.0]))

    assert plan.ev_plan is None
    assert plan.solar_for_battery == [1.0, 1.0, 0.0, 0.0]
    assert plan.ups_allowed == [True] * 4


def test_car_charging_blocks_battery_ups_where_the_breaker_cannot_take_both():
    # 25 A a phase = 17.25 kW. Car 11 kW + battery 6.9 kW > 17.25 kW.
    prices = [1.0, 5.0, 5.0, 5.0]
    plan = plan_flex_loads(_inputs(4, import_prices=prices, ev=_ev(4, need_pct=31.0)))

    assert plan.ev_plan.slots[0].grid_kwh == pytest.approx(2.75)
    assert plan.ups_allowed == [False, True, True, True]


def test_battery_ups_stays_allowed_when_both_fit_under_the_breaker():
    plan = plan_flex_loads(
        _inputs(2, battery_charge_kw=2.6, ev=_ev(2, need_pct=31.0))
    )

    assert plan.ev_plan.slots[0].grid_kwh == pytest.approx(2.75)
    assert plan.ups_allowed == [True, True]


def test_house_load_and_reserve_reduce_the_car_power():
    limits = GridLimits(breaker_a=25.0, reserve_a=2.0, voltage_v=230.0, phases=3)
    plan = plan_flex_loads(
        _inputs(
            1,
            limits=limits,
            backup_load_kwh=[1.0],  # 4 kW of house, 1.33 kW a phase
            ev=_ev(1, need_pct=100.0, max_power_kw=22.0),
        )
    )

    # (25 - 2) A * 230 V * 3 = 15.87 kW, less 4 kW of house.
    assert plan.ev_headroom_kw[0] == pytest.approx(15.87 - 4.0)
    assert plan.ev_plan.slots[0].power_kw == pytest.approx(11.87)


def test_single_phase_boiler_ranked_above_the_car_takes_its_phase_first():
    # Boiler 3 kW on one phase = 13.04 A there; a three-phase car gets the rest
    # of the most loaded phase on all three.
    plan = plan_flex_loads(
        _inputs(
            1,
            priority=("boiler", "ev", "battery"),
            boiler_electric_kwh=[0.75],
            ev=_ev(1, need_pct=100.0),
        )
    )

    phase_left = 25.0 - 3000.0 / 230.0
    assert plan.ev_headroom_kw[0] == pytest.approx(3 * 230.0 * phase_left / 1000.0)
    assert plan.boiler_grid_kwh == pytest.approx([0.75])


def test_car_ranked_above_the_boiler_ignores_it_and_reports_the_overload():
    plan = plan_flex_loads(
        _inputs(
            1,
            priority=("ev", "boiler", "battery"),
            boiler_electric_kwh=[0.75],
            ev=_ev(1, need_pct=100.0, max_power_kw=17.0),
        )
    )

    assert plan.ev_headroom_kw[0] == pytest.approx(17.25)
    assert plan.ev_plan.slots[0].power_kw == pytest.approx(17.0)
    assert plan.overloaded_slots == [0]


def test_with_the_box_order_the_car_gets_only_what_the_battery_leaves():
    plan = plan_flex_loads(
        _inputs(
            2,
            solar_kwh=[2.0, 2.0],
            surplus_after_battery_kwh=[0.0, 1.5],
            import_prices=[3.0, 3.0],
            export_prices=[0.2, 0.2],
            ev=_ev(2, need_pct=30.0, soc_pct=24.0),
        )
    )

    # 6 % of 25 kWh = 1.5 kWh, all from the surplus in slot 1.
    assert plan.ev_plan.pv_kwh_by_slot() == pytest.approx([0.0, 1.5])
    assert plan.solar_for_battery == [2.0, 2.0]


def test_pv_ranked_by_priority_takes_surplus_before_the_battery():
    plan = plan_flex_loads(
        _inputs(
            2,
            solar_kwh=[2.0, 2.0],
            backup_load_kwh=[0.5, 0.5],
            import_prices=[3.0, 3.0],
            export_prices=[0.2, 0.2],
            pv_battery_first=False,
            boiler_electric_kwh=[0.0, 0.75],
            ev=_ev(2, need_pct=24.0, charge_limit_pct=24.0),
        )
    )

    # Surplus 1.5 a slot. Car needs (and has room for) 1 kWh -> slot 0 PV.
    # Boiler takes 0.75 in slot 1.
    assert plan.ev_plan.pv_kwh_by_slot() == pytest.approx([1.0, 0.0])
    assert plan.boiler_pv_kwh == pytest.approx([0.0, 0.75])
    assert plan.solar_for_battery == pytest.approx([1.0, 1.25])


def test_boiler_without_surplus_heats_from_the_grid():
    plan = plan_flex_loads(_inputs(2, boiler_electric_kwh=[0.75, 0.0]))

    assert plan.boiler_grid_kwh == pytest.approx([0.75, 0.0])
    assert plan.boiler_pv_kwh == pytest.approx([0.0, 0.0])


def test_boiler_ranked_above_the_battery_blocks_ups_on_its_phase():
    # Boiler 13.04 A + battery 6.9 kW / 3 = 10 A on the same phase > 25 A? No: 23 A.
    # With 4 kW of house on top (5.8 A a phase) it no longer fits.
    plan = plan_flex_loads(
        _inputs(
            1,
            backup_load_kwh=[1.0],
            boiler_electric_kwh=[0.75],
        )
    )
    assert plan.ups_allowed == [False]


def test_battery_ranked_above_the_car_leaves_its_ups_alone():
    plan = plan_flex_loads(
        _inputs(
            1,
            priority=("battery", "ev", "boiler"),
            battery_ups_kwh=[6.9 / 4],
            ev=_ev(1, need_pct=100.0),
        )
    )

    assert plan.ups_allowed == [True]
    # The car gets what is left after the battery's 6.9 kW.
    assert plan.ev_headroom_kw[0] == pytest.approx(17.25 - 6.9)


def test_as_dict_is_serialisable():
    plan = plan_flex_loads(_inputs(2, ev=_ev(2, need_pct=31.0), boiler_electric_kwh=[0.1, 0.0]))
    data = plan.as_dict()

    assert data["ev"]["status"] == "planned"
    assert data["ups_blocked_slots"] == [0]
    assert data["boiler"]["grid_kwh"] == pytest.approx(0.1)
