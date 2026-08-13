"""Recorder-safe migration from legacy ``TOTAL_INCREASING`` to daily ``TOTAL``."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any

import pytest
from homeassistant.components.sensor import SensorStateClass
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.components.recorder.common import (
    async_wait_recording_done,
    do_adhoc_statistics,
)

from custom_components.oig_cloud.entities.daily_energy import (
    restore_daily_cycle_marker,
)
from custom_components.oig_cloud.entities.data_sensor import OigCloudDataSensor

BOX_ID = "2206237016"
ENTITY_ID = f"sensor.oig_{BOX_ID}_dc_in_fv_ad"
PRAGUE = "Europe/Prague"

T_DAY1_NOON = datetime(2026, 8, 11, 10, 0, tzinfo=timezone.utc)
T_DAY1_LATE = datetime(2026, 8, 11, 20, 0, tzinfo=timezone.utc)
T_DAY2_EARLY = datetime(2026, 8, 11, 22, 10, tzinfo=timezone.utc)
T_DAY2_HIGHER = datetime(2026, 8, 11, 22, 20, tzinfo=timezone.utc)
T_DAY3_EARLY = datetime(2026, 8, 12, 22, 10, tzinfo=timezone.utc)
T_DAY3_ROLLOVER = datetime(2026, 8, 12, 22, 20, tzinfo=timezone.utc)
T_DAY3_LATER = datetime(2026, 8, 12, 22, 30, tzinfo=timezone.utc)
T_DAY4_EARLY = datetime(2026, 8, 13, 22, 10, tzinfo=timezone.utc)

RECORDER_SENSOR_LOGGER = "homeassistant.components.sensor.recorder"


class _Coordinator:
    forced_box_id = BOX_ID

    def __init__(self, data: dict[str, Any] | None = None) -> None:
        self.data = data or {BOX_ID: {"dc_in": {"fv_ad": 0}}}
        self.last_update_success = True

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


def _make_sensor(coordinator: _Coordinator | None = None) -> OigCloudDataSensor:
    sensor = OigCloudDataSensor(coordinator or _Coordinator(), "dc_in_fv_ad")
    return sensor


async def _restore_sensor_from(
    hass: Any,
    previous_sensor: OigCloudDataSensor | None,
    last_state: Any,
) -> OigCloudDataSensor:
    restore_data = (
        previous_sensor.extra_restore_state_data if previous_sensor is not None else None
    )
    sensor = _make_sensor(_Coordinator({BOX_ID: {"dc_in": {}}}))
    sensor.hass = hass

    async def _last_state():
        return last_state

    async def _last_extra_data():
        return restore_data

    sensor.async_get_last_state = _last_state
    sensor.async_get_last_extra_data = _last_extra_data
    await sensor.async_added_to_hass()
    return sensor


def _recorded_state_snapshot(hass: Any) -> SimpleNamespace:
    state = hass.states.get(ENTITY_ID)
    assert state is not None
    return SimpleNamespace(state=state.state, last_changed=state.last_changed)


async def _publish(hass: Any, sensor: OigCloudDataSensor, value: Any) -> None:
    sensor.coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = value
    sensor.async_write_ha_state()
    await async_wait_recording_done(hass)


async def _latest_stats(hass: Any) -> list[dict]:
    from homeassistant.components.recorder.statistics import statistics_during_period

    stats = await hass.async_add_executor_job(
        statistics_during_period,
        hass,
        datetime(2026, 8, 10, tzinfo=timezone.utc),
        None,
        {ENTITY_ID},
        "5minute",
        None,
        {"sum", "state", "last_reset"},
    )
    return list(stats.get(ENTITY_ID, []))


async def _latest_sum(hass: Any) -> float | None:
    periods = await _latest_stats(hass)
    if not periods:
        return None
    return periods[-1]["sum"]


async def _seed_legacy_total_increasing(
    hass: Any, freezer: Any, values: list[int]
) -> None:
    """Write legacy ``TOTAL_INCREASING`` statistics directly.

    This simulates an existing installation that already has history for the
    entity before the integration is upgraded. The recorder's state machine is
    not involved; only the compiled statistics rows matter for the migration
    contract.
    """
    await hass.config.async_set_time_zone(PRAGUE)
    assert await async_setup_component(hass, "sensor", {})
    await hass.async_block_till_done()

    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor.hass = hass

    # Force the legacy state class for seeding.
    sensor._attr_state_class = SensorStateClass.TOTAL_INCREASING

    for index, value in enumerate(values):
        moment = T_DAY1_NOON.replace(hour=10 + index)
        freezer.move_to(moment)
        await _publish(hass, sensor, value)
        do_adhoc_statistics(hass, start=moment)
        await async_wait_recording_done(hass)

    sensor._attr_state_class = SensorStateClass.TOTAL


async def test_legacy_total_increasing_history_is_not_double_counted_on_first_total_sample(
    recorder_mock_compat, hass, freezer, caplog
):
    """Unarmed migration must not announce ``last_reset`` on the first sample."""
    await _seed_legacy_total_increasing(hass, freezer, values=[1000, 1100])

    caplog.set_level(logging.WARNING, logger=RECORDER_SENSOR_LOGGER)
    freezer.move_to(T_DAY1_LATE)

    # Simulate a legacy restored state with no versioned marker extra data.
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor.hass = hass
    sensor._restored_state = 1100.0
    sensor._daily_cycle_marker_state = restore_daily_cycle_marker(1100.0, None, None)

    await _publish(hass, sensor, 1200)
    do_adhoc_statistics(hass, start=T_DAY1_LATE)
    await async_wait_recording_done(hass)

    # Unarmed: no daily-cycle marker is announced yet.
    assert sensor.last_reset is None
    # Continuity: legacy sum was 100 Wh, new sample adds another 100 Wh.
    assert await _latest_sum(hass) == pytest.approx(200.0)

    # Next local day the counter drops to 0. This proves the rollover and arms
    # the marker before the value is published.
    freezer.move_to(T_DAY2_EARLY)
    await _publish(hass, sensor, 0)
    do_adhoc_statistics(hass, start=T_DAY2_EARLY)
    await async_wait_recording_done(hass)

    assert sensor.last_reset == dt_util.start_of_local_day()
    # The new cycle starts from 0; the historical 200 Wh is preserved.
    assert await _latest_sum(hass) == pytest.approx(200.0)

    recorder_warnings = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == RECORDER_SENSOR_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert not recorder_warnings, f"recorder warned: {recorder_warnings}"


async def test_legacy_total_increasing_history_is_not_double_counted_on_first_total_sample__via_entity(
    recorder_mock_compat, hass, freezer, caplog
):
    """Same contract, but the entity restores its own state through RestoreEntity."""
    await _seed_legacy_total_increasing(hass, freezer, values=[1000, 1100])

    caplog.set_level(logging.WARNING, logger=RECORDER_SENSOR_LOGGER)
    freezer.move_to(T_DAY1_LATE)

    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor.hass = hass

    # Simulate what async_added_to_hass would do with a legacy stored state.
    sensor._restored_state = 1100.0
    sensor._daily_cycle_marker_state = restore_daily_cycle_marker(1100.0, None, None)

    await _publish(hass, sensor, 1200)
    do_adhoc_statistics(hass, start=T_DAY1_LATE)
    await async_wait_recording_done(hass)

    assert sensor.last_reset is None
    assert await _latest_sum(hass) == pytest.approx(200.0)


async def test_low_yield_later_day_rollover_emits_marker_and_preserves_recorder_sum(
    recorder_mock_compat, hass, freezer, caplog
):
    """A low-yield first sample on the next local day is a credible rollover."""
    await _seed_legacy_total_increasing(hass, freezer, values=[200, 300])
    seed_sum = (await _latest_stats(hass))[-1]["sum"]

    caplog.set_level(logging.WARNING, logger=RECORDER_SENSOR_LOGGER)
    sensor = await _restore_sensor_from(
        hass,
        None,
        SimpleNamespace(state="300", last_changed=T_DAY1_NOON),
    )

    assert sensor.entity_id == ENTITY_ID
    assert sensor._attr_state_class == SensorStateClass.TOTAL

    for moment, value in (
        (T_DAY2_EARLY, 100),
        (T_DAY2_HIGHER, 250),
    ):
        freezer.move_to(moment)
        await _publish(hass, sensor, value)
        do_adhoc_statistics(hass, start=moment)
        await async_wait_recording_done(hass)

    new_stats = (await _latest_stats(hass))[2:]
    assert len(new_stats) == 2
    rollover, later = new_stats
    day2_midnight = datetime(2026, 8, 11, 22, 0, tzinfo=timezone.utc).timestamp()

    assert rollover["last_reset"] == pytest.approx(day2_midnight)
    assert later["last_reset"] == pytest.approx(day2_midnight)
    assert rollover["sum"] == pytest.approx(seed_sum + 100.0)
    assert later["sum"] == pytest.approx(seed_sum + 250.0)
    assert later["sum"] > rollover["sum"]

    recorder_warnings = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == RECORDER_SENSOR_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert not recorder_warnings, f"recorder warned: {recorder_warnings}"


async def test_cloudy_day_low_yield_rollover_does_not_wait_for_quarter_drop(
    recorder_mock_compat, hass, freezer, caplog
):
    """A 5000 -> 2000 first-new-day rollover is valid despite exceeding 25%."""
    await _seed_legacy_total_increasing(hass, freezer, values=[0, 5000])
    seed_sum = (await _latest_stats(hass))[-1]["sum"]

    caplog.set_level(logging.WARNING, logger=RECORDER_SENSOR_LOGGER)
    sensor = await _restore_sensor_from(
        hass,
        None,
        SimpleNamespace(state="5000", last_changed=T_DAY1_NOON),
    )

    freezer.move_to(T_DAY2_EARLY)
    await _publish(hass, sensor, 2000)
    do_adhoc_statistics(hass, start=T_DAY2_EARLY)
    await async_wait_recording_done(hass)

    new_stats = (await _latest_stats(hass))[2:]
    assert len(new_stats) == 1
    rollover = new_stats[0]
    assert rollover["last_reset"] == pytest.approx(
        datetime(2026, 8, 11, 22, 0, tzinfo=timezone.utc).timestamp()
    )
    assert rollover["sum"] == pytest.approx(seed_sum + 2000.0)
    assert rollover["sum"] >= 0

    recorder_warnings = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == RECORDER_SENSOR_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert not recorder_warnings, f"recorder warned: {recorder_warnings}"


async def test_low_yield_then_same_day_high_then_next_zero_keeps_recorder_sum_monotonic(
    recorder_mock_compat, hass, freezer, caplog
):
    """Legacy 19000 -> 19497 then 6000 -> 18000 -> 0 has no negative sums."""
    await _seed_legacy_total_increasing(hass, freezer, values=[19000, 19497])
    seed_sum = (await _latest_stats(hass))[-1]["sum"]

    caplog.set_level(logging.WARNING, logger=RECORDER_SENSOR_LOGGER)
    sensor = await _restore_sensor_from(
        hass,
        None,
        SimpleNamespace(state="19497", last_changed=T_DAY1_NOON),
    )

    for moment, value in (
        (T_DAY2_EARLY, 6000),
        (T_DAY2_HIGHER, 18000),
        (T_DAY3_EARLY, 0),
    ):
        freezer.move_to(moment)
        await _publish(hass, sensor, value)
        do_adhoc_statistics(hass, start=moment)
        await async_wait_recording_done(hass)

    new_stats = (await _latest_stats(hass))[2:]
    assert len(new_stats) == 3
    low, same_day_high, next_zero = new_stats
    day2_midnight = datetime(2026, 8, 11, 22, 0, tzinfo=timezone.utc).timestamp()
    day3_midnight = datetime(2026, 8, 12, 22, 0, tzinfo=timezone.utc).timestamp()

    assert low["last_reset"] == pytest.approx(day2_midnight)
    assert same_day_high["last_reset"] == pytest.approx(day2_midnight)
    assert next_zero["last_reset"] == pytest.approx(day3_midnight)
    assert low["sum"] == pytest.approx(seed_sum + 6000.0)
    assert same_day_high["sum"] == pytest.approx(seed_sum + 18000.0)
    assert next_zero["sum"] == pytest.approx(same_day_high["sum"])
    assert all(row["sum"] >= 0 for row in new_stats)
    assert all(
        later["sum"] >= earlier["sum"]
        for earlier, later in zip(new_stats, new_stats[1:])
    )

    recorder_warnings = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == RECORDER_SENSOR_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert not recorder_warnings, f"recorder warned: {recorder_warnings}"


async def test_missed_rollover_after_later_high_preserves_recorder_sum(
    recorder_mock_compat, hass, freezer, caplog
):
    """D0 300, D1 8000 -> 18000, D2 4000 emits one marker and no negative sum."""
    await _seed_legacy_total_increasing(hass, freezer, values=[200, 300])
    seed_stats = await _latest_stats(hass)

    caplog.set_level(logging.WARNING, logger=RECORDER_SENSOR_LOGGER)
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor.hass = hass

    async def _last_state():
        return SimpleNamespace(state="300", last_changed=T_DAY1_NOON)

    async def _last_extra_data():
        return None

    sensor.async_get_last_state = _last_state
    sensor.async_get_last_extra_data = _last_extra_data
    await sensor.async_added_to_hass()

    assert sensor.last_reset is None

    for moment, value in (
        (T_DAY2_EARLY, 8000),
        (T_DAY2_HIGHER, 18000),
        (T_DAY3_EARLY, 4000),
    ):
        freezer.move_to(moment)
        await _publish(hass, sensor, value)
        do_adhoc_statistics(hass, start=moment)
        await async_wait_recording_done(hass)

    new_stats = (await _latest_stats(hass))[len(seed_stats) :]
    assert len(new_stats) == 3
    high, higher, low = new_stats

    assert high["last_reset"] is None
    assert higher["last_reset"] is None
    marker_values = [
        row["last_reset"] for row in new_stats if row["last_reset"] is not None
    ]
    assert len(marker_values) == 1
    day3_midnight = datetime(2026, 8, 12, 22, 0, tzinfo=timezone.utc).timestamp()
    assert marker_values[0] == pytest.approx(day3_midnight)
    assert low["last_reset"] == pytest.approx(day3_midnight)
    assert low["sum"] >= higher["sum"]
    assert all(row["sum"] >= 0 for row in new_stats)

    recorder_warnings = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == RECORDER_SENSOR_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert not recorder_warnings, f"recorder warned: {recorder_warnings}"


async def test_sentinel_restore_stale_carry_over_keeps_recorder_sum_continuous(
    recorder_mock_compat, hass, freezer, caplog
):
    """Sentinel restore must keep Recorder continuity across a stale carry-over."""
    await hass.config.async_set_time_zone(PRAGUE)
    assert await async_setup_component(hass, "sensor", {})
    await hass.async_block_till_done()

    caplog.set_level(logging.WARNING, logger=RECORDER_SENSOR_LOGGER)
    coordinator = _Coordinator({BOX_ID: {"dc_in": {}}})
    sensor = _make_sensor(coordinator)
    sensor.hass = hass

    async def _last_state():
        return SimpleNamespace(state="unknown", last_changed=T_DAY1_NOON)

    async def _last_extra_data():
        return None

    sensor.async_get_last_state = _last_state
    sensor.async_get_last_extra_data = _last_extra_data
    await sensor.async_added_to_hass()

    assert sensor.last_reset is None

    for moment, value in (
        (T_DAY2_EARLY, 8000),
        (T_DAY2_HIGHER, 18000),
        (T_DAY3_EARLY, 18500),
        (T_DAY3_ROLLOVER, 50),
        (T_DAY3_LATER, 200),
        (T_DAY4_EARLY, 100),
    ):
        freezer.move_to(moment)
        await _publish(hass, sensor, value)
        do_adhoc_statistics(hass, start=moment)
        await async_wait_recording_done(hass)

    stats = await _latest_stats(hass)
    assert len(stats) == 6
    high, higher, stale_high, rollover, later, next_day = stats

    assert high["last_reset"] is None
    assert higher["last_reset"] is None
    assert stale_high["last_reset"] is None
    assert rollover["last_reset"] == pytest.approx(
        datetime(2026, 8, 12, 22, 0, tzinfo=timezone.utc).timestamp()
    )
    assert later["last_reset"] == pytest.approx(
        datetime(2026, 8, 12, 22, 0, tzinfo=timezone.utc).timestamp()
    )
    assert next_day["last_reset"] == pytest.approx(
        datetime(2026, 8, 13, 22, 0, tzinfo=timezone.utc).timestamp()
    )

    assert stale_high["sum"] == pytest.approx(10500.0)
    assert rollover["sum"] == pytest.approx(10550.0)
    assert later["sum"] == pytest.approx(10700.0)
    assert next_day["sum"] == pytest.approx(10800.0)
    assert rollover["sum"] > stale_high["sum"]
    assert later["sum"] > rollover["sum"]
    assert next_day["sum"] > later["sum"]

    recorder_warnings = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == RECORDER_SENSOR_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert not recorder_warnings, f"recorder warned: {recorder_warnings}"


async def test_missing_restored_local_date_recovers_across_recorder_restarts(
    recorder_mock_compat, hass, freezer, caplog
):
    """Missing restored date must not strand the marker or create negative sums."""
    await hass.config.async_set_time_zone(PRAGUE)
    assert await async_setup_component(hass, "sensor", {})
    await hass.async_block_till_done()

    caplog.set_level(logging.WARNING, logger=RECORDER_SENSOR_LOGGER)
    sensor = await _restore_sensor_from(
        hass,
        None,
        SimpleNamespace(state="unknown", last_changed=None),
    )

    for moment, value in (
        (T_DAY2_EARLY, 8000),
        (T_DAY2_HIGHER, 18000),
        (T_DAY3_EARLY, 18500),
        (T_DAY3_ROLLOVER, 50),
        (T_DAY3_LATER, 200),
        (T_DAY4_EARLY, 100),
    ):
        freezer.move_to(moment)
        await _publish(hass, sensor, value)
        do_adhoc_statistics(hass, start=moment)
        await async_wait_recording_done(hass)
        sensor = await _restore_sensor_from(
            hass,
            sensor,
            _recorded_state_snapshot(hass),
        )

    stats = await _latest_stats(hass)
    assert len(stats) == 6
    high, higher, stale_high, rollover, later, next_day = stats

    assert high["last_reset"] is None
    assert higher["last_reset"] is None
    assert stale_high["last_reset"] is None
    assert rollover["last_reset"] == pytest.approx(
        datetime(2026, 8, 12, 22, 0, tzinfo=timezone.utc).timestamp()
    )
    assert later["last_reset"] == pytest.approx(
        datetime(2026, 8, 12, 22, 0, tzinfo=timezone.utc).timestamp()
    )
    assert next_day["last_reset"] == pytest.approx(
        datetime(2026, 8, 13, 22, 0, tzinfo=timezone.utc).timestamp()
    )

    assert high["sum"] == pytest.approx(0.0)
    assert higher["sum"] == pytest.approx(10000.0)
    assert stale_high["sum"] == pytest.approx(10500.0)
    assert rollover["sum"] == pytest.approx(10550.0)
    assert later["sum"] == pytest.approx(10700.0)
    assert next_day["sum"] == pytest.approx(10800.0)
    assert all(row["sum"] >= 0 for row in stats)

    recorder_warnings = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == RECORDER_SENSOR_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert not recorder_warnings, f"recorder warned: {recorder_warnings}"


async def test_same_day_stale_high_counter_dip_does_not_arm_or_inflate_recorder_sum(
    recorder_mock_compat, hass, freezer, caplog
):
    """A small same-day dip after a stale carry-over is not a daily rollover."""
    await hass.config.async_set_time_zone(PRAGUE)
    assert await async_setup_component(hass, "sensor", {})
    await hass.async_block_till_done()

    caplog.set_level(logging.WARNING, logger=RECORDER_SENSOR_LOGGER)
    sensor = _make_sensor(_Coordinator({BOX_ID: {"dc_in": {}}}))
    sensor.hass = hass

    async def _last_state():
        return SimpleNamespace(state="unknown", last_changed=T_DAY1_NOON)

    async def _last_extra_data():
        return None

    sensor.async_get_last_state = _last_state
    sensor.async_get_last_extra_data = _last_extra_data
    await sensor.async_added_to_hass()

    for moment, value in (
        (T_DAY2_EARLY, 8000),
        (T_DAY2_HIGHER, 18000),
        (T_DAY3_EARLY, 18500),
        (T_DAY3_ROLLOVER, 18400),
        (T_DAY3_LATER, 18600),
    ):
        freezer.move_to(moment)
        await _publish(hass, sensor, value)
        do_adhoc_statistics(hass, start=moment)
        await async_wait_recording_done(hass)

    stats = await _latest_stats(hass)
    assert len(stats) == 5
    high, higher, stale_high, small_dip, resumed_climb = stats

    assert high["last_reset"] is None
    assert higher["last_reset"] is None
    assert stale_high["last_reset"] is None
    assert small_dip["last_reset"] is None
    assert resumed_climb["last_reset"] is None
    assert all(row["sum"] >= 0 for row in stats)
    assert small_dip["sum"] < stale_high["sum"] + 1000.0
    assert resumed_climb["sum"] < stale_high["sum"] + 1000.0

    recorder_warnings = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == RECORDER_SENSOR_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert not recorder_warnings, f"recorder warned: {recorder_warnings}"
