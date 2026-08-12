"""Recorder-safe migration from legacy ``TOTAL_INCREASING`` to daily ``TOTAL``."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
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
