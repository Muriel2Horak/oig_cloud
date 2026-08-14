"""Daily-cycle marker restore and state-machine contract."""

from __future__ import annotations

from datetime import date

import pytest

from custom_components.oig_cloud.entities.daily_energy import (
    DailyCycleMarkerState,
    DailyCycleRestoreData,
    classify_daily_energy_wh,
    observe_daily_cycle_value,
    restore_daily_cycle_marker,
)

DAY1 = date(2026, 8, 11)
DAY2 = date(2026, 8, 12)
DAY3 = date(2026, 8, 13)
DAY4 = date(2026, 8, 14)
DAY5 = date(2026, 8, 15)


def _armed_state(value_wh: float, local_date: date) -> DailyCycleMarkerState:
    return DailyCycleMarkerState(
        armed=True, last_value_wh=value_wh, last_local_date=local_date
    )


def _unarmed_state(value_wh: float, local_date: date) -> DailyCycleMarkerState:
    return DailyCycleMarkerState(
        armed=False, last_value_wh=value_wh, last_local_date=local_date
    )


def _restart_marker(state: DailyCycleMarkerState) -> DailyCycleMarkerState:
    return restore_daily_cycle_marker(
        state.last_value_wh,
        state.last_local_date,
        DailyCycleRestoreData(state).as_dict(),
        restored_state_seen=True,
    )


def _pending_payload(
    pending_value_wh: float,
    pending_local_date: date,
    last_local_date: date | None = DAY1,
) -> dict:
    return {
        "daily_cycle_marker": {
            "version": 1,
            "armed": False,
            "last_value_wh": None,
            "last_local_date": (
                last_local_date.isoformat() if last_local_date is not None else None
            ),
            "pending_high_value_wh": pending_value_wh,
            "pending_high_local_date": pending_local_date.isoformat(),
        }
    }


def test_new_entity_is_armed_immediately() -> None:
    state = restore_daily_cycle_marker(None, None, None)
    assert state.armed is True
    assert state.last_value_wh is None
    assert state.last_local_date is None


def test_legacy_restore_stays_unarmed_until_lower_value_on_later_local_day() -> None:
    state = restore_daily_cycle_marker(19497.0, DAY1, None)
    assert state.armed is False
    assert state.last_value_wh == 19497.0
    assert state.last_local_date == DAY1

    stale = observe_daily_cycle_value(state, 19497.0, DAY2)
    assert stale.armed is False
    assert stale.last_local_date == DAY1
    assert stale.last_value_wh == 19497.0

    rolled = observe_daily_cycle_value(stale, 0.0, DAY2)
    assert rolled.armed is True
    assert rolled.last_value_wh == 0.0
    assert rolled.last_local_date == DAY2


def test_versioned_armed_restore_round_trips() -> None:
    original = _armed_state(500.0, DAY2)
    restore_data = DailyCycleRestoreData(original)
    restored = restore_daily_cycle_marker(500.0, DAY2, restore_data.as_dict())
    assert restored == original


def test_armed_marker_waits_for_proven_rollover_on_next_day() -> None:
    state = _armed_state(18000.0, DAY1)

    stale = observe_daily_cycle_value(state, 18000.0, DAY2)
    rolled = observe_daily_cycle_value(stale, 0.0, DAY2)

    assert stale.armed is True
    assert stale.last_value_wh == 18000.0
    assert stale.last_local_date == DAY1
    assert stale.pending_high_value_wh == 18000.0
    assert stale.pending_high_local_date == DAY2
    assert rolled.armed is True
    assert rolled.last_value_wh == 0.0
    assert rolled.last_local_date == DAY2
    assert rolled.pending_high_value_wh is None


def test_versioned_unarmed_restore_round_trips() -> None:
    original = _unarmed_state(19497.0, DAY1)
    restore_data = DailyCycleRestoreData(original)
    restored = restore_daily_cycle_marker(19497.0, DAY1, restore_data.as_dict())
    assert restored == original


@pytest.mark.parametrize(
    "payload",
    [
        {"daily_cycle_marker": {"version": 2, "armed": False}},
        {"daily_cycle_marker": {"version": 1, "armed": "yes"}},
        {"daily_cycle_marker": "not-a-dict"},
        {"daily_cycle_marker": {"version": 1, "last_local_date": "not-a-date"}},
        {"unexpected_key": True},
    ],
)
def test_malformed_restore_payload_fails_closed_when_state_exists(payload) -> None:
    state = restore_daily_cycle_marker(19497.0, DAY1, payload)
    assert state.armed is False
    assert state.last_value_wh == 19497.0
    assert state.last_local_date == DAY1


@pytest.mark.parametrize("payload", [{}, None])
def test_malformed_restore_payload_fails_closed_to_fresh_when_no_state(
    payload,
) -> None:
    state = restore_daily_cycle_marker(None, None, payload)
    assert state.armed is True
    assert state.last_value_wh is None
    assert state.last_local_date is None


def test_same_day_small_dip_refreshes_reference() -> None:
    state = restore_daily_cycle_marker(1000.0, DAY1, None)
    assert state.armed is False

    dipped = observe_daily_cycle_value(state, 998.0, DAY1)
    assert dipped.armed is False
    assert dipped.last_value_wh == 998.0
    assert dipped.last_local_date == DAY1


def test_same_day_rise_does_not_arm() -> None:
    state = restore_daily_cycle_marker(1000.0, DAY1, None)
    risen = observe_daily_cycle_value(state, 1100.0, DAY1)
    assert risen.armed is False
    assert risen.last_value_wh == 1100.0
    assert risen.last_local_date == DAY1


def test_later_day_equal_value_retains_pre_boundary_reference() -> None:
    state = restore_daily_cycle_marker(19497.0, DAY1, None)
    equal = observe_daily_cycle_value(state, 19497.0, DAY2)
    assert equal.armed is False
    assert equal.last_value_wh == 19497.0
    assert equal.last_local_date == DAY1


def test_later_day_higher_value_retains_pre_boundary_reference() -> None:
    state = restore_daily_cycle_marker(19497.0, DAY1, None)
    higher = observe_daily_cycle_value(state, 20000.0, DAY2)
    assert higher.armed is False
    assert higher.last_value_wh == 19497.0
    assert higher.last_local_date == DAY1
    assert higher.pending_high_value_wh == 20000.0
    assert higher.pending_high_local_date == DAY2


def test_later_day_high_watermark_updates_without_replacing_original_reference() -> None:
    state = restore_daily_cycle_marker(300.0, DAY1, None)

    first_high = observe_daily_cycle_value(state, 8000.0, DAY2)
    second_high = observe_daily_cycle_value(first_high, 18000.0, DAY2)

    assert second_high.armed is False
    assert second_high.last_value_wh == 300.0
    assert second_high.last_local_date == DAY1
    assert second_high.pending_high_value_wh == 18000.0
    assert second_high.pending_high_local_date == DAY2


def test_lower_than_pending_high_arms_after_missed_low_window() -> None:
    state = restore_daily_cycle_marker(300.0, DAY1, None)

    high = observe_daily_cycle_value(state, 8000.0, DAY2)
    higher = observe_daily_cycle_value(high, 18000.0, DAY2)
    rolled = observe_daily_cycle_value(higher, 4000.0, DAY3)

    assert rolled.armed is True
    assert rolled.last_value_wh == 4000.0
    assert rolled.last_local_date == DAY3
    assert rolled.pending_high_value_wh is None
    assert rolled.pending_high_local_date is None


@pytest.mark.parametrize(
    "value_wh",
    [
        pytest.param(4500.1, id="above-quarter"),
        pytest.param(4500.0, id="quarter-boundary"),
        pytest.param(4499.9, id="below-quarter"),
    ],
)
def test_first_lower_value_on_later_local_day_arms_without_fraction_gate(
    value_wh: float,
) -> None:
    state = restore_daily_cycle_marker(18000.0, DAY1, None)

    rolled = observe_daily_cycle_value(state, value_wh, DAY2)

    assert rolled.armed is True
    assert rolled.last_value_wh == value_wh
    assert rolled.last_local_date == DAY2
    assert rolled.pending_high_value_wh is None
    assert rolled.pending_high_local_date is None


def test_stale_later_high_then_same_day_lower_arms_from_pending_high() -> None:
    state = restore_daily_cycle_marker(300.0, DAY1, None)

    stale_high = observe_daily_cycle_value(state, 18000.0, DAY2)
    rolled = observe_daily_cycle_value(stale_high, 4000.0, DAY2)

    assert rolled.armed is True
    assert rolled.last_value_wh == 4000.0
    assert rolled.last_local_date == DAY2
    assert rolled.pending_high_value_wh is None
    assert rolled.pending_high_local_date is None


def test_stale_later_high_then_low_yield_same_day_arms_from_pending_high() -> None:
    state = restore_daily_cycle_marker(300.0, DAY1, None)

    stale_high = observe_daily_cycle_value(state, 300.0, DAY2)
    rolled = observe_daily_cycle_value(stale_high, 100.0, DAY2)

    assert stale_high.armed is False
    assert stale_high.last_value_wh == 300.0
    assert stale_high.last_local_date == DAY1
    assert stale_high.pending_high_value_wh == 300.0
    assert stale_high.pending_high_local_date == DAY2

    assert rolled.armed is True
    assert rolled.last_value_wh == 100.0
    assert rolled.last_local_date == DAY2
    assert rolled.pending_high_value_wh is None
    assert rolled.pending_high_local_date is None


def test_later_than_pending_high_low_yield_arms_after_missed_low_window() -> None:
    state = restore_daily_cycle_marker(300.0, DAY1, None)

    stale_high = observe_daily_cycle_value(state, 300.0, DAY2)
    rolled = observe_daily_cycle_value(stale_high, 150.0, DAY3)

    assert stale_high.armed is False
    assert stale_high.last_value_wh == 300.0
    assert stale_high.last_local_date == DAY1
    assert stale_high.pending_high_value_wh == 300.0
    assert stale_high.pending_high_local_date == DAY2

    assert rolled.armed is True
    assert rolled.last_value_wh == 150.0
    assert rolled.last_local_date == DAY3
    assert rolled.pending_high_value_wh is None
    assert rolled.pending_high_local_date is None


def test_stale_carry_above_restored_reference_arms_on_lower_same_day_value() -> None:
    state = restore_daily_cycle_marker(300.0, DAY1, None)

    stale_high = observe_daily_cycle_value(state, 500.0, DAY2)
    rolled = observe_daily_cycle_value(stale_high, 130.0, DAY2)

    assert stale_high.armed is False
    assert stale_high.last_value_wh == 300.0
    assert stale_high.last_local_date == DAY1
    assert stale_high.pending_high_value_wh == 500.0
    assert stale_high.pending_high_local_date == DAY2

    assert rolled.armed is True
    assert rolled.last_value_wh == 130.0
    assert rolled.last_local_date == DAY2
    assert rolled.pending_high_value_wh is None
    assert rolled.pending_high_local_date is None


def test_sentinel_restore_first_same_day_value_seeds_pending_high() -> None:
    state = DailyCycleMarkerState(
        armed=False,
        last_value_wh=None,
        last_local_date=DAY1,
    )

    high = observe_daily_cycle_value(state, 8000.0, DAY1)
    higher = observe_daily_cycle_value(high, 18000.0, DAY1)

    assert high.armed is False
    assert high.last_value_wh is None
    assert high.last_local_date == DAY1
    assert high.pending_high_value_wh == 8000.0
    assert high.pending_high_local_date == DAY1

    assert higher.armed is False
    assert higher.last_value_wh is None
    assert higher.last_local_date == DAY1
    assert higher.pending_high_value_wh == 18000.0
    assert higher.pending_high_local_date == DAY1


def test_same_day_pending_low_without_prior_day_reference_stays_unarmed() -> None:
    state = restore_daily_cycle_marker(
        None, None, None, restored_state_seen=True
    )

    pending_high = observe_daily_cycle_value(state, 18000.0, DAY2)
    same_day_low = observe_daily_cycle_value(pending_high, 100.0, DAY2)

    assert pending_high.armed is False
    assert pending_high.last_value_wh is None
    assert pending_high.last_local_date is None
    assert pending_high.pending_high_value_wh == 18000.0
    assert pending_high.pending_high_local_date == DAY2

    assert same_day_low.armed is False
    assert same_day_low.last_value_wh is None
    assert same_day_low.last_local_date is None
    assert same_day_low.pending_high_value_wh == 18000.0
    assert same_day_low.pending_high_local_date == DAY2


def test_sentinel_restore_promotes_pending_high_then_arms_on_credible_same_day_low() -> None:
    state = DailyCycleMarkerState(
        armed=False,
        last_value_wh=None,
        last_local_date=DAY1,
    )

    high = observe_daily_cycle_value(state, 8000.0, DAY2)
    same_day_lower = observe_daily_cycle_value(high, 4000.0, DAY2)
    same_day_equal = observe_daily_cycle_value(same_day_lower, 8000.0, DAY2)
    same_day_higher = observe_daily_cycle_value(same_day_equal, 18000.0, DAY2)
    later_equal = observe_daily_cycle_value(same_day_higher, 18000.0, DAY3)
    later_higher = observe_daily_cycle_value(later_equal, 19000.0, DAY3)
    rolled = observe_daily_cycle_value(later_higher, 4000.0, DAY3)

    assert high.armed is False
    assert high.last_value_wh is None
    assert high.last_local_date == DAY1
    assert high.pending_high_value_wh == 8000.0
    assert high.pending_high_local_date == DAY2

    assert same_day_lower.armed is False
    assert same_day_lower.pending_high_value_wh == 8000.0
    assert same_day_lower.pending_high_local_date == DAY2

    assert same_day_equal.armed is False
    assert same_day_equal.pending_high_value_wh == 8000.0
    assert same_day_equal.pending_high_local_date == DAY2

    assert same_day_higher.armed is False
    assert same_day_higher.pending_high_value_wh == 18000.0
    assert same_day_higher.pending_high_local_date == DAY2

    assert later_equal.armed is False
    assert later_equal.last_value_wh == 18000.0
    assert later_equal.last_local_date == DAY2
    assert later_equal.pending_high_value_wh == 18000.0
    assert later_equal.pending_high_local_date == DAY3

    assert later_higher.armed is False
    assert later_higher.last_value_wh == 18000.0
    assert later_higher.last_local_date == DAY2
    assert later_higher.pending_high_value_wh == 19000.0
    assert later_higher.pending_high_local_date == DAY3

    assert rolled.armed is True
    assert rolled.last_value_wh == 4000.0
    assert rolled.last_local_date == DAY3
    assert rolled.pending_high_value_wh is None
    assert rolled.pending_high_local_date is None

    next_day_stale = observe_daily_cycle_value(rolled, 4000.0, DAY4)
    assert next_day_stale.armed is True
    assert next_day_stale.last_value_wh == 4000.0
    assert next_day_stale.last_local_date == DAY3
    assert next_day_stale.pending_high_value_wh == 4000.0
    assert next_day_stale.pending_high_local_date == DAY4


def test_restart_with_sentinel_pending_high_promotes_then_arms_on_credible_low() -> None:
    payload = _pending_payload(18000.0, DAY2)

    restored = restore_daily_cycle_marker(None, DAY1, payload)
    stale_high = observe_daily_cycle_value(restored, 18500.0, DAY3)
    rollover = observe_daily_cycle_value(stale_high, 50.0, DAY3)
    later_same_day = observe_daily_cycle_value(rollover, 200.0, DAY3)
    next_day = observe_daily_cycle_value(later_same_day, 100.0, DAY4)

    assert restored.armed is False
    assert restored.last_value_wh is None
    assert restored.last_local_date == DAY1
    assert restored.pending_high_value_wh == 18000.0
    assert restored.pending_high_local_date == DAY2

    assert stale_high.armed is False
    assert stale_high.last_value_wh == 18000.0
    assert stale_high.last_local_date == DAY2
    assert stale_high.pending_high_value_wh == 18500.0
    assert stale_high.pending_high_local_date == DAY3

    assert rollover.armed is True
    assert rollover.last_value_wh == 50.0
    assert rollover.last_local_date == DAY3
    assert rollover.pending_high_value_wh is None
    assert rollover.pending_high_local_date is None

    assert later_same_day.armed is True
    assert later_same_day.last_value_wh == 200.0
    assert later_same_day.last_local_date == DAY3
    assert later_same_day.pending_high_value_wh is None
    assert later_same_day.pending_high_local_date is None

    assert next_day.armed is True
    assert next_day.last_value_wh == 100.0
    assert next_day.last_local_date == DAY4


def test_missing_restored_local_date_uses_pending_high_as_recoverable_reference() -> None:
    state = restore_daily_cycle_marker(
        None, None, None, restored_state_seen=True
    )

    same_day_first = observe_daily_cycle_value(state, 8000.0, DAY2)
    same_day_high = observe_daily_cycle_value(same_day_first, 18000.0, DAY2)
    stale_high = observe_daily_cycle_value(same_day_high, 18500.0, DAY3)
    rollover = observe_daily_cycle_value(stale_high, 50.0, DAY3)

    assert same_day_high.armed is False
    assert same_day_high.last_value_wh is None
    assert same_day_high.last_local_date is None
    assert same_day_high.pending_high_value_wh == 18000.0
    assert same_day_high.pending_high_local_date == DAY2

    assert stale_high.armed is False
    assert stale_high.last_value_wh == 18000.0
    assert stale_high.last_local_date == DAY2
    assert stale_high.pending_high_value_wh == 18500.0
    assert stale_high.pending_high_local_date == DAY3

    assert rollover.armed is True
    assert rollover.last_value_wh == 50.0
    assert rollover.last_local_date == DAY3
    assert rollover.pending_high_value_wh is None
    assert rollover.pending_high_local_date is None


def test_missing_restored_date_with_numeric_value_arms_on_credible_drop() -> None:
    state = DailyCycleMarkerState(
        armed=False,
        last_value_wh=18000.0,
        last_local_date=None,
    )

    rolled = observe_daily_cycle_value(state, 4000.0, DAY3)

    assert rolled.armed is True
    assert rolled.last_value_wh == 4000.0
    assert rolled.last_local_date == DAY3
    assert rolled.pending_high_value_wh is None
    assert rolled.pending_high_local_date is None


def test_missing_restored_date_ordinary_drop_stays_unarmed() -> None:
    state = restore_daily_cycle_marker(18000.0, None, None)

    out = observe_daily_cycle_value(state, 10000.0, DAY3)

    assert out.armed is False
    assert out.last_value_wh == 18000.0
    assert out.last_local_date is None
    assert out.pending_high_value_wh == 18000.0
    assert out.pending_high_local_date == DAY3


def test_sentinel_pending_high_ignores_out_of_order_sample_before_pending_day() -> None:
    restored = restore_daily_cycle_marker(
        None, DAY1, _pending_payload(18000.0, DAY3)
    )

    earlier = observe_daily_cycle_value(restored, 10.0, DAY2)

    assert earlier == restored


def test_missing_restored_date_carry_then_ordinary_drop_stays_unarmed() -> None:
    state = restore_daily_cycle_marker(18000.0, None, None)

    carried = observe_daily_cycle_value(state, 18000.0, DAY2)
    ordinary_drop = observe_daily_cycle_value(carried, 10000.0, DAY2)

    assert carried.armed is False
    assert carried.last_value_wh == 18000.0
    assert carried.last_local_date is None
    assert carried.pending_high_value_wh == 18000.0
    assert carried.pending_high_local_date == DAY2

    assert ordinary_drop.armed is False
    assert ordinary_drop.last_value_wh == 18000.0
    assert ordinary_drop.last_local_date is None
    assert ordinary_drop.pending_high_value_wh == 18000.0
    assert ordinary_drop.pending_high_local_date == DAY2


def test_same_day_non_rollover_dip_after_stale_high_stays_unarmed() -> None:
    restored = restore_daily_cycle_marker(
        None, DAY1, _pending_payload(18000.0, DAY2)
    )

    stale_high = observe_daily_cycle_value(restored, 18500.0, DAY3)
    small_dip = observe_daily_cycle_value(stale_high, 18400.0, DAY3)
    resumed_climb = observe_daily_cycle_value(small_dip, 18600.0, DAY3)

    assert small_dip.armed is False
    assert small_dip.last_value_wh == 18000.0
    assert small_dip.last_local_date == DAY2
    assert small_dip.pending_high_value_wh == 18500.0
    assert small_dip.pending_high_local_date == DAY3

    assert resumed_climb.armed is False
    assert resumed_climb.last_value_wh == 18000.0
    assert resumed_climb.last_local_date == DAY2
    assert resumed_climb.pending_high_value_wh == 18600.0
    assert resumed_climb.pending_high_local_date == DAY3


@pytest.mark.parametrize(
    "value_wh, expected_armed",
    [
        pytest.param(18000.0, False, id="equal-high"),
        pytest.param(4500.1, False, id="just-above-quarter"),
        pytest.param(4500.0, True, id="quarter-boundary"),
        pytest.param(4499.9, True, id="just-below-quarter"),
        pytest.param(4000.0, True, id="accepted-18000-to-4000"),
        pytest.param(0.0, True, id="zero"),
    ],
)
def test_promoted_pending_high_uses_conservative_rollover_predicate(
    value_wh: float, expected_armed: bool
) -> None:
    promoted = DailyCycleMarkerState(
        armed=False,
        last_value_wh=1000.0,
        last_local_date=DAY2,
        pending_high_value_wh=18000.0,
        pending_high_local_date=DAY3,
    )

    observed = observe_daily_cycle_value(promoted, value_wh, DAY3)

    assert observed.armed is expected_armed
    if expected_armed:
        assert observed.last_value_wh == value_wh
        assert observed.last_local_date == DAY3
        assert observed.pending_high_value_wh is None
        assert observed.pending_high_local_date is None
    else:
        assert observed.last_value_wh == 1000.0
        assert observed.last_local_date == DAY2
        assert observed.pending_high_value_wh == 18000.0
        assert observed.pending_high_local_date == DAY3


def test_zero_pending_high_cannot_prove_rollover() -> None:
    state = DailyCycleMarkerState(
        armed=False,
        last_value_wh=1000.0,
        last_local_date=DAY2,
        pending_high_value_wh=0.0,
        pending_high_local_date=DAY3,
    )

    observed = observe_daily_cycle_value(state, 0.0, DAY3)

    assert observed.armed is False
    assert observed.pending_high_value_wh == 0.0
    assert observed.pending_high_local_date == DAY3


def test_later_stale_highs_roll_pending_high_into_prior_day_reference() -> None:
    state = restore_daily_cycle_marker(
        None, DAY1, _pending_payload(18000.0, DAY2)
    )

    day3 = _restart_marker(observe_daily_cycle_value(state, 18500.0, DAY3))
    day4 = _restart_marker(observe_daily_cycle_value(day3, 18600.0, DAY4))
    day5 = _restart_marker(observe_daily_cycle_value(day4, 18700.0, DAY5))
    rollover = _restart_marker(observe_daily_cycle_value(day5, 30.0, DAY5))

    assert day3.armed is False
    assert day3.last_value_wh == 18000.0
    assert day3.last_local_date == DAY2
    assert day3.pending_high_value_wh == 18500.0
    assert day3.pending_high_local_date == DAY3

    assert day4.armed is False
    assert day4.last_value_wh == 18500.0
    assert day4.last_local_date == DAY3
    assert day4.pending_high_value_wh == 18600.0
    assert day4.pending_high_local_date == DAY4

    assert day5.armed is False
    assert day5.last_value_wh == 18600.0
    assert day5.last_local_date == DAY4
    assert day5.pending_high_value_wh == 18700.0
    assert day5.pending_high_local_date == DAY5

    assert rollover.armed is True
    assert rollover.last_value_wh == 30.0
    assert rollover.last_local_date == DAY5
    assert rollover.pending_high_value_wh is None
    assert rollover.pending_high_local_date is None


def test_stale_pre_midnight_data_after_midnight_does_not_arm() -> None:
    """A high pre-midnight sample arriving after midnight must not arm the marker."""
    state = restore_daily_cycle_marker(19497.0, DAY1, None)
    stale = observe_daily_cycle_value(state, 19505.0, DAY2)
    assert stale.armed is False
    assert stale.last_value_wh == 19497.0
    assert stale.last_local_date == DAY1


def test_proven_rollover_arms_on_lower_value_after_midnight() -> None:
    state = restore_daily_cycle_marker(19497.0, DAY1, None)
    rolled = observe_daily_cycle_value(state, 0.0, DAY2)
    assert rolled.armed is True
    assert rolled.last_value_wh == 0.0
    assert rolled.last_local_date == DAY2


def test_restart_while_unarmed_resumes_pre_boundary_reference() -> None:
    state = _unarmed_state(19497.0, DAY1)
    restore_data = DailyCycleRestoreData(state)
    restored = restore_daily_cycle_marker(19497.0, DAY1, restore_data.as_dict())
    assert restored.armed is False

    same_day = observe_daily_cycle_value(restored, 19500.0, DAY1)
    assert same_day.armed is False
    assert same_day.last_value_wh == 19500.0

    next_day_equal = observe_daily_cycle_value(same_day, 19500.0, DAY2)
    assert next_day_equal.armed is False
    assert next_day_equal.last_value_wh == 19500.0

    next_day_lower = observe_daily_cycle_value(next_day_equal, 0.0, DAY2)
    assert next_day_lower.armed is True


def test_restart_after_arming_stays_armed() -> None:
    state = _armed_state(500.0, DAY2)
    restore_data = DailyCycleRestoreData(state)
    restored = restore_daily_cycle_marker(500.0, DAY2, restore_data.as_dict())
    assert restored.armed is True

    next_value = observe_daily_cycle_value(restored, 600.0, DAY2)
    assert next_value.armed is True
    assert next_value.last_value_wh == 600.0


def test_restart_while_unarmed_preserves_pending_high_watermark() -> None:
    payload = {
        "daily_cycle_marker": {
            "version": 1,
            "armed": False,
            "last_value_wh": 300.0,
            "last_local_date": DAY1.isoformat(),
            "pending_high_value_wh": 18000.0,
            "pending_high_local_date": DAY2.isoformat(),
        }
    }

    restored = restore_daily_cycle_marker(300.0, DAY1, payload)
    rolled = observe_daily_cycle_value(restored, 4000.0, DAY3)

    assert restored.armed is False
    assert restored.last_value_wh == 300.0
    assert restored.last_local_date == DAY1
    assert restored.pending_high_value_wh == 18000.0
    assert restored.pending_high_local_date == DAY2
    assert rolled.armed is True
    assert rolled.last_value_wh == 4000.0
    assert rolled.last_local_date == DAY3


@pytest.mark.parametrize(
    "field, value",
    [
        ("last_value_wh", True),
        ("last_value_wh", -1.0),
        ("last_value_wh", float("nan")),
        ("pending_high_value_wh", True),
        ("pending_high_value_wh", -1.0),
        ("pending_high_value_wh", float("inf")),
        ("pending_high_local_date", "not-a-date"),
    ],
)
def test_malformed_versioned_numeric_marker_fields_fail_closed(field, value) -> None:
    payload = {
        "daily_cycle_marker": {
            "version": 1,
            "armed": True,
            "last_value_wh": 500.0,
            "last_local_date": DAY2.isoformat(),
            "pending_high_value_wh": 18000.0,
            "pending_high_local_date": DAY2.isoformat(),
            field: value,
        }
    }

    state = restore_daily_cycle_marker(19497.0, DAY1, payload)

    assert state == _unarmed_state(19497.0, DAY1)


def test_earlier_local_date_than_reference_is_ignored() -> None:
    state = _unarmed_state(1000.0, DAY2)
    earlier = observe_daily_cycle_value(state, 0.0, DAY1)
    assert earlier.armed is False
    assert earlier.last_value_wh == 1000.0
    assert earlier.last_local_date == DAY2


def test_observe_only_accepts_validated_values() -> None:
    """The state machine expects already-validated float values."""
    sample = classify_daily_energy_wh("1500")
    assert sample.reason_class == "ok"
    state = observe_daily_cycle_value(
        _armed_state(0.0, DAY1), sample.value_wh, DAY1
    )
    assert state.last_value_wh == 1500.0
