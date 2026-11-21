"""Cheapest-slot scheduling of a flexible load against energy deadlines."""

from __future__ import annotations

import pytest

from custom_components.oig_cloud.shared.flex_scheduler import (
    FlexSlot,
    OpportunisticRule,
    Requirement,
    Tranche,
    schedule_flexible_load,
)


def _grid_slots(prices, cap=1.0):
    return [
        FlexSlot(max_kwh=cap, tranches=(Tranche(cost_per_kwh=p, kwh=cap, source="grid"),))
        for p in prices
    ]


def test_picks_cheapest_slots_before_the_deadline():
    slots = _grid_slots([5.0, 1.0, 3.0, 0.5, 0.1])
    result = schedule_flexible_load(slots, [Requirement(before_index=4, kwh=2.0)])

    assert [round(e, 6) for e in result.energy_kwh] == [0.0, 1.0, 0.0, 1.0, 0.0]
    assert result.shortfall_kwh == 0.0
    assert result.cost_czk == pytest.approx(1.5)


def test_later_deadline_counts_energy_delivered_for_the_earlier_one():
    # 1 kWh by slot 2, 2 kWh in total by slot 4.
    slots = _grid_slots([5.0, 1.0, 1.0, 10.0])
    result = schedule_flexible_load(
        slots,
        [Requirement(before_index=2, kwh=1.0), Requirement(before_index=4, kwh=2.0)],
    )

    assert result.energy_kwh == [0.0, 1.0, 1.0, 0.0]
    assert result.cost_czk == pytest.approx(2.0)


def test_partial_slot_finishes_the_requirement():
    slots = _grid_slots([2.0, 1.0, 3.0], cap=1.0)
    result = schedule_flexible_load(slots, [Requirement(before_index=3, kwh=1.25)])

    assert result.energy_kwh == pytest.approx([0.25, 1.0, 0.0])


def test_reports_shortfall_when_capacity_before_deadline_is_too_small():
    slots = _grid_slots([1.0, 1.0, 1.0], cap=0.5)
    result = schedule_flexible_load(slots, [Requirement(before_index=2, kwh=2.0)])

    assert result.energy_kwh == [0.5, 0.5, 0.0]
    assert result.shortfall_kwh == pytest.approx(1.0)


def test_cheap_pv_tranche_is_used_before_grid_and_slot_cap_holds():
    # Slot 0: 0.6 kWh of PV surplus at the export price, the rest from the grid.
    slots = [
        FlexSlot(
            max_kwh=1.0,
            tranches=(
                Tranche(cost_per_kwh=0.2, kwh=0.6, source="pv"),
                Tranche(cost_per_kwh=4.0, kwh=1.0, source="grid"),
            ),
        ),
        FlexSlot(max_kwh=1.0, tranches=(Tranche(cost_per_kwh=3.0, kwh=1.0, source="grid"),)),
    ]
    result = schedule_flexible_load(slots, [Requirement(before_index=2, kwh=1.8)])

    # PV 0.6 (0.2) + slot 1 grid 1.0 (3.0) + slot 0 grid 0.2 (4.0) — never above 1 kWh a slot.
    assert result.energy_kwh == pytest.approx([0.8, 1.0])
    assert result.by_source[0] == pytest.approx({"pv": 0.6, "grid": 0.2})
    assert result.by_source[1] == pytest.approx({"grid": 1.0})
    assert result.cost_czk == pytest.approx(0.6 * 0.2 + 3.0 + 0.2 * 4.0)


def test_ties_go_to_the_earlier_slot():
    slots = _grid_slots([1.0, 1.0, 1.0])
    result = schedule_flexible_load(slots, [Requirement(before_index=3, kwh=1.0)])

    assert result.energy_kwh == [1.0, 0.0, 0.0]


def test_opportunistic_energy_takes_only_tranches_at_or_below_the_price_cap():
    slots = [
        FlexSlot(max_kwh=1.0, tranches=(Tranche(cost_per_kwh=0.1, kwh=0.5, source="pv"),)),
        FlexSlot(max_kwh=1.0, tranches=(Tranche(cost_per_kwh=5.0, kwh=1.0, source="grid"),)),
        FlexSlot(max_kwh=1.0, tranches=(Tranche(cost_per_kwh=0.3, kwh=1.0, source="pv"),)),
    ]
    result = schedule_flexible_load(
        slots,
        [],
        opportunistic=[OpportunisticRule(max_cost_per_kwh=0.5)],
        opportunistic_max_kwh=1.2,
    )

    assert result.energy_kwh == pytest.approx([0.5, 0.0, 0.7])
    assert result.opportunistic_kwh == pytest.approx(1.2)


def test_opportunistic_energy_comes_on_top_of_the_requirement():
    slots = [
        FlexSlot(max_kwh=1.0, tranches=(Tranche(cost_per_kwh=0.1, kwh=1.0, source="pv"),)),
        FlexSlot(max_kwh=1.0, tranches=(Tranche(cost_per_kwh=0.1, kwh=1.0, source="pv"),)),
    ]
    result = schedule_flexible_load(
        slots,
        [Requirement(before_index=1, kwh=0.5)],
        opportunistic=[OpportunisticRule(max_cost_per_kwh=0.2)],
        opportunistic_max_kwh=1.0,
    )

    assert result.energy_kwh == pytest.approx([1.0, 0.5])
    assert result.opportunistic_kwh == pytest.approx(1.0)


def test_requirement_past_the_last_slot_uses_every_slot():
    slots = _grid_slots([1.0, 2.0])
    result = schedule_flexible_load(slots, [Requirement(before_index=10, kwh=1.5)])

    assert result.energy_kwh == pytest.approx([1.0, 0.5])


def test_zero_requirement_schedules_nothing():
    result = schedule_flexible_load(_grid_slots([1.0]), [Requirement(before_index=1, kwh=0.0)])

    assert result.energy_kwh == [0.0]
    assert result.cost_czk == 0.0


def test_opportunistic_rules_filter_by_source_and_share_one_total():
    slots = [
        FlexSlot(
            max_kwh=2.0,
            tranches=(
                Tranche(cost_per_kwh=-0.5, kwh=1.0, source="grid"),
                Tranche(cost_per_kwh=0.1, kwh=1.0, source="pv"),
            ),
        ),
        FlexSlot(max_kwh=1.0, tranches=(Tranche(cost_per_kwh=0.2, kwh=1.0, source="grid"),)),
    ]
    result = schedule_flexible_load(
        slots,
        [],
        opportunistic=[
            OpportunisticRule(max_cost_per_kwh=1.0, sources=frozenset({"pv"})),
            OpportunisticRule(max_cost_per_kwh=0.0, sources=frozenset({"grid"})),
        ],
        opportunistic_max_kwh=1.5,
    )

    # PV first (1.0), then only negative-price grid, and 1.5 kWh in all.
    assert result.by_source[0] == pytest.approx({"pv": 1.0, "grid": 0.5})
    assert result.energy_kwh[1] == 0.0
    assert result.opportunistic_kwh == pytest.approx(1.5)
