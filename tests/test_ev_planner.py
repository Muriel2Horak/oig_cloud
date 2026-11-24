"""Price-driven EV charging window before the predicted departure."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from custom_components.oig_cloud.ev.planner import EvPlanInput, plan_ev_charging
from custom_components.oig_cloud.ev.profile import NextNeed

TZ = timezone(timedelta(hours=1))
NOW = datetime(2026, 11, 16, 20, 0, tzinfo=TZ)


def _starts(n: int) -> list[datetime]:
    return [NOW + timedelta(minutes=15 * i) for i in range(n)]


def _input(prices, **overrides) -> EvPlanInput:
    n = len(prices)
    values = dict(
        slot_starts=_starts(n),
        import_prices=list(prices),
        export_prices=[0.0] * n,
        pv_surplus_kwh=[0.0] * n,
        grid_headroom_kw=[20.0] * n,
        soc_pct=20.0,
        capacity_kwh=25.0,
        charge_limit_pct=100.0,
        max_power_kw=11.0,
        min_power_kw=4.0,
        need=NextNeed(deadline=NOW + timedelta(minutes=15 * n), need_pct=60.0, weekday=1),
        plugged_in=True,
    )
    values.update(overrides)
    return EvPlanInput(**values)


def test_cheapest_slots_before_departure_at_wallbox_power():
    prices = [6.0, 5.0, 1.0, 2.0, 1.5, 4.0, 3.0, 7.0]
    plan = plan_ev_charging(_input(prices))

    # 20 % -> 60 % of 25 kWh = 10 kWh; 11 kW gives 2.75 kWh a slot.
    assert plan.status == "planned"
    assert plan.needed_kwh == pytest.approx(10.0)
    energy = [slot.energy_kwh for slot in plan.slots]
    assert energy == pytest.approx([0, 0, 2.75, 2.75, 2.75, 0, 1.75, 0])
    assert plan.cost_czk == pytest.approx(2.75 * (1.0 + 2.0 + 1.5) + 1.75 * 3.0)
    assert plan.charge_now is False
    assert plan.next_start == NOW + timedelta(minutes=30)
    assert plan.soc_at_deadline_pct == pytest.approx(60.0)
    assert plan.slots[2].power_kw == pytest.approx(11.0)


def test_target_never_above_the_charge_limit():
    plan = plan_ev_charging(
        _input([1.0] * 8, need=NextNeed(NOW + timedelta(hours=2), 95.0, 1), charge_limit_pct=80.0)
    )

    assert plan.target_soc_pct == pytest.approx(80.0)
    assert plan.needed_kwh == pytest.approx(15.0)


def test_grid_headroom_caps_power_and_drops_slots_below_minimum():
    prices = [1.0, 2.0, 3.0]
    plan = plan_ev_charging(
        _input(
            prices,
            grid_headroom_kw=[3.0, 6.0, 20.0],
            need=NextNeed(NOW + timedelta(minutes=45), 40.0, 1),
        )
    )

    # Slot 0 cannot reach the wallbox minimum, slot 1 runs at 6 kW.
    assert [s.energy_kwh for s in plan.slots] == pytest.approx([0.0, 1.5, 2.75])
    assert plan.shortfall_kwh == pytest.approx(5.0 - 4.25)
    assert plan.status == "shortfall"


def test_pv_surplus_valued_at_the_export_price_beats_cheap_grid():
    plan = plan_ev_charging(
        _input(
            [3.0, 1.0],
            export_prices=[0.5, 0.5],
            pv_surplus_kwh=[1.0, 0.0],
            need=NextNeed(NOW + timedelta(minutes=30), 24.0, 1),
        )
    )

    assert plan.slots[0].pv_kwh == pytest.approx(1.0)
    assert plan.slots[0].grid_kwh == pytest.approx(0.0)
    assert plan.slots[1].energy_kwh == 0.0
    assert plan.charge_now is True


def test_pv_surplus_lets_a_slot_run_below_the_grid_minimum():
    plan = plan_ev_charging(
        _input(
            [1.0],
            pv_surplus_kwh=[0.5],
            grid_headroom_kw=[2.0],
            need=NextNeed(NOW + timedelta(minutes=15), 30.0, 1),
        )
    )

    # 2 kW of PV + 2 kW of grid reach the 4 kW minimum.
    assert plan.slots[0].pv_kwh == pytest.approx(0.5)
    assert plan.slots[0].grid_kwh == pytest.approx(0.5)


def test_surplus_that_would_be_exported_fills_the_car_up_to_its_limit():
    plan = plan_ev_charging(
        _input(
            [4.0, 4.0, 4.0],
            export_prices=[0.3, 0.3, 0.3],
            pv_surplus_kwh=[2.0, 2.0, 0.0],
            soc_pct=60.0,
            charge_limit_pct=70.0,
            need=NextNeed(NOW + timedelta(minutes=45), 40.0, 1),
        )
    )

    assert plan.needed_kwh == 0.0
    assert plan.opportunistic_kwh == pytest.approx(2.5)
    assert [s.energy_kwh for s in plan.slots] == pytest.approx([2.0, 0.5, 0.0])
    assert plan.status == "no_need"


def test_negative_import_price_charges_beyond_the_need():
    plan = plan_ev_charging(
        _input(
            [-1.0, 3.0],
            soc_pct=60.0,
            need=NextNeed(NOW + timedelta(minutes=30), 40.0, 1),
        )
    )

    assert plan.slots[0].grid_kwh == pytest.approx(2.75)
    assert plan.slots[1].energy_kwh == 0.0


def test_no_charging_after_the_car_has_left():
    plan = plan_ev_charging(
        _input(
            [5.0, 5.0, 0.1, 0.1],
            need=NextNeed(NOW + timedelta(minutes=30), 30.0, 1),
        )
    )

    assert [s.energy_kwh for s in plan.slots] == pytest.approx([2.5, 0.0, 0.0, 0.0])


def test_departure_past_the_known_prices_plans_estimated_slots_at_the_median():
    plan = plan_ev_charging(
        _input(
            [9.0, 1.0, 5.0],
            need=NextNeed(NOW + timedelta(hours=1), 40.0, 1),
        )
    )

    # 5 kWh: slot 1 (1.0) gives 2.75, then the estimated slot (median 5.0, first
    # in time among the ties) gives the rest.
    assert len(plan.slots) == 4
    assert plan.slots[3].estimated is True
    assert plan.slots[1].energy_kwh == pytest.approx(2.75)
    assert plan.slots[2].energy_kwh + plan.slots[3].energy_kwh == pytest.approx(2.25)


def test_unplugged_car_gets_no_charging():
    plan = plan_ev_charging(_input([1.0, 1.0], plugged_in=False))

    assert plan.status == "unplugged"
    assert plan.charge_now is False
    assert all(slot.energy_kwh == 0.0 for slot in plan.slots)


def test_without_a_predicted_drive_only_cheap_surplus_is_taken():
    plan = plan_ev_charging(
        _input(
            [1.0, 1.0],
            pv_surplus_kwh=[0.0, 1.0],
            export_prices=[0.2, 0.2],
            need=None,
        )
    )

    assert plan.status == "no_need"
    assert [s.energy_kwh for s in plan.slots] == pytest.approx([0.0, 1.0])


def test_grid_and_pv_series_line_up_with_the_input_slots():
    plan = plan_ev_charging(
        _input([1.0, 2.0], pv_surplus_kwh=[0.5, 0.0], need=NextNeed(NOW + timedelta(minutes=30), 40.0, 1))
    )

    assert plan.grid_kwh_by_slot() == pytest.approx([2.25, 2.25])
    assert plan.pv_kwh_by_slot() == pytest.approx([0.5, 0.0])


def test_limit_mode_charges_to_the_charge_limit_before_departure():
    plan = plan_ev_charging(
        _input([1.0] * 12, need=NextNeed(NOW + timedelta(hours=3), 40.0, 1), charge_limit_pct=80.0, target_mode="limit")
    )

    # 20 % -> 80 % of 25 kWh = 15 kWh, whatever the typical need says.
    assert plan.target_soc_pct == pytest.approx(80.0)
    assert plan.needed_kwh == pytest.approx(15.0)


def test_limit_mode_without_a_predicted_drive_takes_only_cheap_surplus():
    plan = plan_ev_charging(_input([1.0, 1.0], need=None, target_mode="limit"))
    assert plan.needed_kwh == 0.0
