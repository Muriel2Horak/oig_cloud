"""The boiler's missing half: what actually happened against what was planned.

The boiler tab has a plan and nothing else. There is no adherence, no archive,
no plan-versus-actual anywhere in the module — so the tab can say what it
intends to do and never what it did, which is the whole difference from the
Ceny tab.

The plan the boiler publishes is a *rolling* 24 hours (created 11:55, valid to
11:45 tomorrow), not a day. Comparing against a target that moves every cycle
is meaningless, so the day gets a baseline snapshotted once and left alone.
"""

from __future__ import annotations

from datetime import date, datetime

import pytest

from custom_components.oig_cloud.boiler import day_record as module


def _rolling_plan(day: str, start_slot: int = 0, slots: int = 96) -> list[dict]:
    """A slice of the rolling plan, in the shape the boiler API publishes."""
    return [
        {
            "start": f"{day}T{i // 4:02d}:{(i % 4) * 15:02d}:00+02:00",
            "heating_kwh": 0.5 if 57 <= i <= 67 else 0.0,
            "recommended_source": "fve" if 57 <= i <= 67 else "none",
            "estimated_cost_czk": 0.0,
            "predicted_top_temp_c": 42.0 + i * 0.1,
            "ready_liters": 12.5,
        }
        for i in range(start_slot, start_slot + slots)
    ]


# --------------------------------------------------------------------------
# the day baseline
# --------------------------------------------------------------------------


def test_the_baseline_keeps_only_todays_slots():
    """The rolling plan runs into tomorrow; a day record must not."""
    plan = _rolling_plan("2026-09-08", start_slot=47, slots=96)

    baseline = module.snapshot_plan(plan, date(2026, 9, 8))

    assert len(baseline) == 96
    assert baseline[0]["time"] == "00:00"
    assert baseline[95]["time"] == "23:45"


def test_slots_the_rolling_plan_does_not_reach_stay_open():
    """A baseline taken at noon knows nothing about the morning; inventing a
    zero there would show the day as perfectly followed."""
    plan = _rolling_plan("2026-09-08", start_slot=48, slots=48)

    baseline = module.snapshot_plan(plan, date(2026, 9, 8))

    assert baseline[0]["heating_kwh"] is None
    assert baseline[60]["heating_kwh"] == pytest.approx(0.5)


def test_the_baseline_carries_what_the_comparison_needs():
    baseline = module.snapshot_plan(_rolling_plan("2026-09-08"), date(2026, 9, 8))

    assert set(baseline[60]) == {
        "time",
        "heating_kwh",
        "source",
        "cost_czk",
        "predicted_top_temp_c",
    }


# --------------------------------------------------------------------------
# recording what happened
# --------------------------------------------------------------------------


def test_an_empty_day_has_a_slot_for_every_quarter_hour():
    actual = module.empty_actual()

    assert len(actual) == 96
    assert all(row["heating_kwh"] is None for row in actual)


def test_energy_accumulates_into_the_slot_it_happened_in():
    actual = module.empty_actual()

    module.accumulate(actual, datetime(2026, 9, 8, 14, 20), heating_kwh=0.2, source="fve", top_temp_c=48.0)
    module.accumulate(actual, datetime(2026, 9, 8, 14, 27), heating_kwh=0.3, source="fve", top_temp_c=49.0)

    slot = actual[57]  # 14:15
    assert slot["heating_kwh"] == pytest.approx(0.5)
    assert slot["source"] == "fve"
    assert slot["top_temp_c"] == pytest.approx(49.0)


def test_a_slot_records_the_source_that_delivered_most_of_its_energy():
    """A slot that starts on PV and finishes on grid is a grid slot if that is
    where the kWh came from — otherwise adherence flatters itself."""
    actual = module.empty_actual()

    module.accumulate(actual, datetime(2026, 9, 8, 14, 16), heating_kwh=0.1, source="fve", top_temp_c=48.0)
    module.accumulate(actual, datetime(2026, 9, 8, 14, 25), heating_kwh=0.4, source="grid", top_temp_c=49.0)

    assert actual[57]["source"] == "grid"


def test_a_slot_with_no_heating_still_records_temperature():
    actual = module.empty_actual()

    module.accumulate(actual, datetime(2026, 9, 8, 3, 5), heating_kwh=0.0, source=None, top_temp_c=38.0)

    assert actual[12]["heating_kwh"] == pytest.approx(0.0)
    assert actual[12]["top_temp_c"] == pytest.approx(38.0)
    assert actual[12]["source"] is None


# --------------------------------------------------------------------------
# the comparison
# --------------------------------------------------------------------------


def _day_with(planned_slots: dict[int, tuple[float, str]],
              actual_slots: dict[int, tuple[float, str]]) -> tuple[list, list]:
    plan = [
        {
            "time": f"{i // 4:02d}:{(i % 4) * 15:02d}",
            "heating_kwh": planned_slots.get(i, (0.0, "none"))[0],
            "source": planned_slots.get(i, (0.0, "none"))[1],
            "cost_czk": 0.0,
            "predicted_top_temp_c": 45.0,
        }
        for i in range(96)
    ]
    actual = module.empty_actual()
    for i, (kwh, src) in actual_slots.items():
        actual[i].update({"heating_kwh": kwh, "source": src, "top_temp_c": 45.0})
    return plan, actual


def test_comparison_pairs_every_slot_and_counts_the_completed_ones():
    plan, actual = _day_with({57: (0.5, "fve")}, {57: (0.5, "fve"), 58: (0.0, None)})

    result = module.compare(plan, actual)

    assert len(result["slots"]) == 96
    assert result["completed_slots"] == 2
    assert result["slots"][57]["status"] == "historical"
    assert result["slots"][80]["status"] == "planned"


def test_adherence_counts_only_slots_where_something_was_meant_to_happen():
    """Eighty-five idle slots matching eighty-five idle slots is not 100 %
    adherence to anything."""
    plan, actual = _day_with(
        {57: (0.5, "fve"), 58: (0.5, "fve")},
        {57: (0.5, "fve"), 58: (0.5, "grid")},
    )

    result = module.compare(plan, actual)

    assert result["adherence_pct"] == pytest.approx(50.0)


def test_adherence_is_unknown_before_anything_was_planned_to_happen():
    plan, actual = _day_with({}, {10: (0.0, None)})

    assert module.compare(plan, actual)["adherence_pct"] is None


def test_heating_that_happened_off_plan_counts_against_adherence():
    plan, actual = _day_with({}, {57: (0.5, "grid")})

    result = module.compare(plan, actual)

    assert result["adherence_pct"] == pytest.approx(0.0)
    assert result["slots"][57]["source_match"] is False


def test_energy_totals_separate_what_was_planned_from_what_ran():
    plan, actual = _day_with(
        {57: (0.5, "fve"), 58: (0.5, "fve")},
        {57: (0.6, "fve")},
    )

    energy = module.compare(plan, actual)["energy"]

    assert energy["planned_kwh"] == pytest.approx(1.0)
    assert energy["actual_kwh"] == pytest.approx(0.6)
    assert energy["delta_kwh"] == pytest.approx(-0.4)


# --------------------------------------------------------------------------
# end of day
# --------------------------------------------------------------------------


def test_eod_adds_the_rest_of_the_plan_to_what_already_ran():
    plan, actual = _day_with(
        {57: (0.5, "fve"), 80: (0.5, "fve")},
        {57: (0.6, "fve")},
    )

    eod = module.eod_estimate(plan, actual, now=datetime(2026, 9, 8, 15, 0))

    assert eod["actual_so_far_kwh"] == pytest.approx(0.6)
    assert eod["remaining_planned_kwh"] == pytest.approx(0.5)
    assert eod["estimated_total_kwh"] == pytest.approx(1.1)
    assert eod["planned_total_kwh"] == pytest.approx(1.0)


def test_eod_at_the_end_of_the_day_is_just_what_happened():
    plan, actual = _day_with({57: (0.5, "fve")}, {57: (0.6, "fve")})

    eod = module.eod_estimate(plan, actual, now=datetime(2026, 9, 8, 23, 59))

    assert eod["remaining_planned_kwh"] == pytest.approx(0.0)
    assert eod["estimated_total_kwh"] == pytest.approx(0.6)
