"""Daily-cycle contract for ``dc_in_fv_ad``, executed through the real recorder.

``dc_in_fv_ad`` reads the inverter node ``dc_in.fv_ad`` ("FVE aktual denni"):
the daily photovoltaic production accumulator in watt-hours. It resets to 0 at
**local** midnight and the inverter may re-aggregate the running daily total
downward by a few Wh during the day.

Home Assistant offers exactly two usable contracts for such a sensor, and both
halves matter:

* ``TOTAL_INCREASING`` -- every decrease is a candidate meter reset. The small
  intraday dip trips ``reset_detected()``/``warn_dip()`` and logs a recorder
  warning, and no ``last_reset`` is consulted at all.
* ``TOTAL`` + ``last_reset`` -- the midnight reset is announced explicitly via
  the ``last_reset`` attribute. ``TOTAL`` **without** ``last_reset`` is worse
  than either: ``homeassistant/components/sensor/recorder.py`` gates its reset
  branch on ``last_reset is not None``, so the midnight drop to 0 is booked as
  a genuine negative delta and the whole completed day is subtracted from the
  long-term sum.

These tests therefore do not assert metadata alone. They drive the production
``OigCloudDataSensor`` into a real ``hass`` state machine, run Home Assistant's
own ``sensor`` recorder platform over a local-midnight boundary, and read the
compiled short-term statistics back out of the recorder database.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import pytest
from homeassistant.components.sensor import SensorStateClass
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.components.recorder.common import (
    async_wait_recording_done,
    do_adhoc_statistics,
)

from custom_components.oig_cloud.entities.data_sensor import OigCloudDataSensor
from custom_components.oig_cloud.sensor_types import SENSOR_TYPES
from custom_components.oig_cloud.sensors.SENSOR_TYPES_DC_IN import SENSOR_TYPES_DC_IN

# Production box (see the operator's live install) -- only used to build a
# deterministic entity_id.
BOX_ID = "2206237016"
ENTITY_ID = f"sensor.oig_{BOX_ID}_dc_in_fv_ad"

DAILY_CYCLE_MARKER = "daily_cycle_reset"

# Production timezone of the reference install. Chosen deliberately: in August
# Europe/Prague is UTC+2, so local midnight falls at 22:00 UTC and a naive UTC
# implementation would reset on the wrong boundary.
PRAGUE = "Europe/Prague"

# Aug 11 23:40 / 23:50 local, then Aug 12 00:10 / 00:20 local.
T_LATE_DAY1 = datetime(2026, 8, 11, 21, 40, tzinfo=timezone.utc)
T_DIP_DAY1 = datetime(2026, 8, 11, 21, 50, tzinfo=timezone.utc)
T_RESET_DAY2 = datetime(2026, 8, 11, 22, 10, tzinfo=timezone.utc)
T_RISE_DAY2 = datetime(2026, 8, 11, 22, 20, tzinfo=timezone.utc)

# The production sequence taken from the operator's recorder log: a full day
# accumulated, a ~3 Wh downward re-aggregation, the midnight reset, then the
# new day starting to produce.
SEQUENCE = [
    (T_LATE_DAY1, 19500),
    (T_DIP_DAY1, 19497),
    (T_RESET_DAY2, 0),
    (T_RISE_DAY2, 300),
]

RECORDER_SENSOR_LOGGER = "homeassistant.components.sensor.recorder"


class _Coordinator:
    """Minimal coordinator: ``resolve_box_id`` accepts ``forced_box_id``."""

    forced_box_id = BOX_ID

    def __init__(self) -> None:
        self.data = {BOX_ID: {"dc_in": {"fv_ad": 0}}}
        self.last_update_success = True

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


def _make_sensor(hass, coordinator, sensor_type: str = "dc_in_fv_ad"):
    """Build the real production entity and bind it to a real hass."""
    sensor = OigCloudDataSensor(coordinator, sensor_type)
    sensor.hass = hass
    return sensor


async def _publish(hass, sensor, coordinator, value: int) -> None:
    coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = value
    sensor.async_write_ha_state()
    await async_wait_recording_done(hass)


async def _read_short_term_stats(hass) -> list[dict]:
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


# ---------------------------------------------------------------------------
# Scope: the daily-cycle treatment must not leak onto every TOTAL sensor
# ---------------------------------------------------------------------------


def test_daily_cycle_marker_is_scoped_to_dc_in_fv_ad():
    """Exactly one sensor type may request daily-cycle ``last_reset``.

    Attaching a daily ``last_reset`` to every ``TOTAL`` sensor would announce a
    midnight cycle for accumulators that do not have one (monthly/yearly
    counters, computed statistics), corrupting their long-term sums.
    """
    marked = {
        key for key, conf in SENSOR_TYPES.items() if conf.get(DAILY_CYCLE_MARKER)
    }
    assert marked == {"dc_in_fv_ad"}, (
        f"daily-cycle marker must stay scoped to dc_in_fv_ad, found {sorted(marked)}"
    )


def test_dc_in_fv_ad_declares_total_with_daily_cycle_marker():
    """The pair is inseparable: TOTAL alone silently loses the completed day."""
    cfg = SENSOR_TYPES_DC_IN["dc_in_fv_ad"]
    assert cfg["node_id"] == "dc_in"
    assert cfg["node_key"] == "fv_ad"
    assert cfg["state_class"] == SensorStateClass.TOTAL
    assert cfg.get(DAILY_CYCLE_MARKER) is True


async def test_last_reset_is_local_midnight_only_for_marked_sensor(hass, freezer):
    """``last_reset`` is local midnight for the marked sensor, ``None`` elsewhere."""
    await hass.config.async_set_time_zone(PRAGUE)
    freezer.move_to(T_DIP_DAY1)  # 2026-08-11 23:50 local

    coordinator = _Coordinator()
    marked = _make_sensor(hass, coordinator)
    unmarked = _make_sensor(hass, coordinator, "dc_in_fv_p1")

    expected = dt_util.start_of_local_day()
    assert marked.last_reset == expected
    assert expected.hour == 0 and expected.minute == 0
    assert expected.date() == datetime(2026, 8, 11).date()
    assert unmarked.last_reset is None


async def test_last_reset_follows_home_assistant_timezone(hass, freezer):
    """Local midnight comes from HA configuration, never a hardcoded zone."""
    freezer.move_to(T_DIP_DAY1)  # 2026-08-11 21:50 UTC
    coordinator = _Coordinator()

    await hass.config.async_set_time_zone(PRAGUE)
    prague_reset = _make_sensor(hass, coordinator).last_reset

    await hass.config.async_set_time_zone("America/New_York")
    new_york_reset = _make_sensor(hass, coordinator).last_reset

    assert prague_reset is not None and new_york_reset is not None
    # 21:50 UTC is already Aug 12 in Prague-relative terms only after 22:00, so
    # Prague midnight is Aug 11 00:00+02:00 while New York is still Aug 11
    # 00:00-04:00 -- different absolute instants, proving the zone is honoured.
    assert prague_reset != new_york_reset
    assert prague_reset.utcoffset() != new_york_reset.utcoffset()


# ---------------------------------------------------------------------------
# The real recorder calculation across local midnight
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "restart_before_index",
    [
        pytest.param(None, id="no_restart"),
        pytest.param(1, id="restart_within_the_day"),
        pytest.param(2, id="restart_after_midnight"),
    ],
)
async def test_recorder_keeps_completed_day_and_starts_new_one(
    recorder_mock_compat, hass, freezer, caplog, restart_before_index
):
    """Execute HA's own sensor-recorder statistics over the midnight boundary.

    Asserts the three production-observable outcomes:

    1. the completed day stays accumulated (the sum does not lose 19 497 Wh),
    2. the new day starts from zero and reaches 300 Wh,
    3. no reset/dip warning path is taken at all.
    """
    await hass.config.async_set_time_zone(PRAGUE)
    assert await async_setup_component(hass, "sensor", {})
    await hass.async_block_till_done()

    caplog.set_level(logging.WARNING, logger=RECORDER_SENSOR_LOGGER)

    coordinator = _Coordinator()
    sensor = _make_sensor(hass, coordinator)

    for index, (moment, value) in enumerate(SEQUENCE):
        if index == restart_before_index:
            # Home Assistant restart: a brand new entity instance must derive
            # last_reset from the wall clock, not from in-process memory.
            coordinator = _Coordinator()
            sensor = _make_sensor(hass, coordinator)
        freezer.move_to(moment)
        await _publish(hass, sensor, coordinator, value)
        do_adhoc_statistics(hass, start=moment)
        await async_wait_recording_done(hass)

    stats = await _read_short_term_stats(hass)
    assert len(stats) == len(SEQUENCE), f"expected one period per state, got {stats}"

    before_dip, after_dip, after_reset, new_day = stats

    # 1. The completed day survives the midnight reset. Without last_reset the
    #    recorder books 0 - 19497 and the sum collapses by the whole day.
    assert after_reset["sum"] == pytest.approx(after_dip["sum"]), (
        "midnight reset was booked as a negative delta -- the completed day was "
        f"subtracted from the long-term sum: {stats}"
    )
    assert after_reset["sum"] > -1000, (
        f"sum collapsed across local midnight: {after_reset['sum']}"
    )

    # 2. The new day starts at zero and then accumulates its own 300 Wh.
    assert after_reset["state"] == pytest.approx(0.0)
    assert new_day["state"] == pytest.approx(300.0)
    assert new_day["sum"] - after_reset["sum"] == pytest.approx(300.0), (
        f"new day did not accumulate to 300 Wh: {stats}"
    )

    # 3. last_reset is announced, and moves exactly once -- at local midnight.
    day1_midnight = datetime(2026, 8, 10, 22, 0, tzinfo=timezone.utc).timestamp()
    day2_midnight = datetime(2026, 8, 11, 22, 0, tzinfo=timezone.utc).timestamp()
    assert before_dip["last_reset"] == pytest.approx(day1_midnight)
    assert after_dip["last_reset"] == pytest.approx(day1_midnight)
    assert after_reset["last_reset"] == pytest.approx(day2_midnight)
    assert new_day["last_reset"] == pytest.approx(day2_midnight)

    # 4. No false reset/dip warning path. TOTAL_INCREASING would emit
    #    "has from time to time dipped" for the 19500 -> 19497 re-aggregation.
    recorder_warnings = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == RECORDER_SENSOR_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert not recorder_warnings, f"recorder warned about the daily cycle: {recorder_warnings}"
