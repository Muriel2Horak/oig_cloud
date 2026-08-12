"""Validation contract for the daily-energy sensor ``dc_in_fv_ad``.

Invalid samples must never become Home Assistant state and must never reach
Recorder. The last valid in-memory value is retained instead.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import pytest
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.components.recorder.common import (
    async_wait_recording_done,
    do_adhoc_statistics,
)

from custom_components.oig_cloud.entities.daily_energy import (
    MAX_DAILY_ENERGY_WH,
    DailyEnergySample,
    classify_daily_energy_wh,
)
from custom_components.oig_cloud.entities.data_sensor import OigCloudDataSensor

BOX_ID = "2206237016"
ENTITY_ID = f"sensor.oig_{BOX_ID}_dc_in_fv_ad"
PRAGUE = "Europe/Prague"

T_DAY1 = datetime(2026, 8, 11, 12, 0, tzinfo=timezone.utc)

RECORDER_SENSOR_LOGGER = "homeassistant.components.sensor.recorder"


class _Coordinator:
    """Minimal coordinator accepted by ``resolve_box_id``."""

    forced_box_id = BOX_ID

    def __init__(self, data: dict[str, Any] | None = None) -> None:
        self.data = data or {BOX_ID: {"dc_in": {"fv_ad": 0}}}
        self.last_update_success = True

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


def _make_sensor(coordinator: _Coordinator | None = None) -> OigCloudDataSensor:
    sensor = OigCloudDataSensor(coordinator or _Coordinator(), "dc_in_fv_ad")
    return sensor


@pytest.mark.parametrize(
    "raw",
    [
        True,
        False,
        "",
        "   ",
        "nope",
        float("nan"),
        float("inf"),
        float("-inf"),
        -1,
        -0.001,
        MAX_DAILY_ENERGY_WH + 1,
    ],
)
def test_invalid_daily_energy_is_rejected(raw: Any) -> None:
    result = classify_daily_energy_wh(raw)
    assert result.value_wh is None
    assert result.reason_class != "ok"


@pytest.mark.parametrize(
    "raw, expected",
    [
        (0, 0.0),
        (1, 1.0),
        ("19497", 19497.0),
        ("0", 0.0),
        (MAX_DAILY_ENERGY_WH, MAX_DAILY_ENERGY_WH),
        ("1000000000", 1_000_000_000.0),
    ],
)
def test_valid_daily_energy_is_normalized(raw: Any, expected: float) -> None:
    assert classify_daily_energy_wh(raw) == DailyEnergySample(expected, "ok")


def test_boolean_is_rejected_before_numeric_coercion() -> None:
    """``bool`` is a ``float``-coercible subtype of ``int``; reject it first."""
    assert classify_daily_energy_wh(True) == DailyEnergySample(None, "boolean")
    assert classify_daily_energy_wh(False) == DailyEnergySample(None, "boolean")


@pytest.mark.parametrize(
    "raw, expected_reason",
    [
        (True, "boolean"),
        (False, "boolean"),
        ("", "empty"),
        ("   ", "empty"),
        ("nope", "malformed"),
        (float("nan"), "non_finite"),
        (float("inf"), "non_finite"),
        (float("-inf"), "non_finite"),
        (-1, "negative"),
        (MAX_DAILY_ENERGY_WH + 1, "above_max"),
    ],
)
def test_rejection_reason_classes(raw: Any, expected_reason: str) -> None:
    assert classify_daily_energy_wh(raw).reason_class == expected_reason


def test_cloud_shaped_invalid_sample_retains_prior_valid_value() -> None:
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)

    coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = 1000
    assert sensor.state == 1000.0

    invalid_samples = [True, "", "bad", float("nan"), float("inf"), -1, 1_000_000_001]
    for invalid in invalid_samples:
        coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = invalid
        assert sensor.state == 1000.0, f"state changed for invalid sample {invalid!r}"


def test_local_shaped_invalid_sample_retains_prior_valid_value(hass) -> None:
    """Local proxy data arrives as a string in the coordinator's cloud-shaped map."""
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor.hass = hass

    coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = "2000"
    assert sensor.state == 2000.0

    invalid_strings = ["", "   ", "nope", "-5", "inf", "1000000001"]
    for invalid in invalid_strings:
        coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = invalid
        assert sensor.state == 2000.0, (
            f"state changed for invalid local sample {invalid!r}"
        )


def test_validation_logs_only_sensor_type_and_reason_class(
    hass, caplog
) -> None:
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor.hass = hass

    caplog.set_level(logging.DEBUG)

    coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = -1
    sensor.state

    for record in caplog.records:
        if "daily energy" in record.message.lower() or "dc_in" in record.message:
            assert "-1" not in record.message
            assert "negative" in record.message


async def _publish(hass: Any, sensor: OigCloudDataSensor, value: Any) -> None:
    sensor.coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = value
    sensor.async_write_ha_state()
    await async_wait_recording_done(hass)


async def _latest_sum(hass: Any) -> float | None:
    from homeassistant.components.recorder.statistics import statistics_during_period

    stats = await hass.async_add_executor_job(
        statistics_during_period,
        hass,
        datetime(2026, 8, 10, tzinfo=timezone.utc),
        None,
        {ENTITY_ID},
        "5minute",
        None,
        {"sum", "state"},
    )
    periods = stats.get(ENTITY_ID, [])
    if not periods:
        return None
    return periods[-1]["sum"]


async def test_negative_daily_energy_never_changes_recorder_sum(
    recorder_mock_compat, hass, freezer, caplog
):
    await hass.config.async_set_time_zone(PRAGUE)
    assert await async_setup_component(hass, "sensor", {})
    await hass.async_block_till_done()

    caplog.set_level(logging.WARNING, logger=RECORDER_SENSOR_LOGGER)

    freezer.move_to(T_DAY1)
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor.hass = hass

    await _publish(hass, sensor, 1000)
    do_adhoc_statistics(hass, start=T_DAY1)
    await async_wait_recording_done(hass)

    before = await _latest_sum(hass)
    assert sensor.state == 1000.0

    await _publish(hass, sensor, -100)
    do_adhoc_statistics(hass, start=T_DAY1)
    await async_wait_recording_done(hass)

    after = await _latest_sum(hass)
    assert sensor.state == 1000.0
    assert after == before

    recorder_warnings = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == RECORDER_SENSOR_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert not recorder_warnings, f"recorder warned: {recorder_warnings}"
