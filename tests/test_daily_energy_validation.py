"""Validation contract for the daily-energy sensor ``dc_in_fv_ad``.

Invalid samples must never become Home Assistant state and must never reach
Recorder. The last valid in-memory value is retained instead.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

import pytest
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.components.recorder.common import (
    async_wait_recording_done,
    do_adhoc_statistics,
)

from custom_components.oig_cloud.entities.daily_energy import (
    MAX_DAILY_ENERGY_WH,
    DailyCycleMarkerState,
    DailyCycleRestoreData,
    DailyEnergySample,
    classify_daily_energy_wh,
)
from custom_components.oig_cloud.entities.data_sensor import OigCloudDataSensor

BOX_ID = "2206237016"
ENTITY_ID = f"sensor.oig_{BOX_ID}_dc_in_fv_ad"
PRAGUE = "Europe/Prague"

T_DAY1 = datetime(2026, 8, 11, 12, 0, tzinfo=timezone.utc)
T_DAY2_EARLY = datetime(2026, 8, 11, 22, 10, tzinfo=timezone.utc)

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


def _daily_energy_log_records(caplog: Any) -> list[Any]:
    return [
        rec
        for rec in caplog.records
        if "daily energy" in rec.message.lower() or "dc_in" in rec.message
    ]


def test_initial_invalid_daily_energy_without_state_is_unavailable() -> None:
    """Invalid first sample with no last valid or restored state returns None."""
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = -1
    assert sensor.state is None


def test_non_validated_energy_sensor_fallback_unchanged() -> None:
    """Generic energy sensors without ``validated_daily_energy`` still fall back to 0.0."""
    coordinator = _Coordinator()
    sensor = OigCloudDataSensor(coordinator, "computed_batt_charge_energy_today")
    assert sensor._sensor_config.get("device_class") == "energy"
    assert not sensor._sensor_config.get("validated_daily_energy")
    assert sensor.state == 0.0


def test_restored_daily_energy_state_used_for_initial_invalid_sample() -> None:
    """Restored state is retained when the first new sample is invalid."""
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor._restored_state = 19497.0
    coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = -1
    assert sensor.state == 19497.0


@pytest.mark.parametrize(
    "raw",
    [
        pytest.param(True, id="bool"),
        pytest.param(-1, id="negative"),
        pytest.param("", id="empty"),
        pytest.param("not-a-number", id="malformed"),
        pytest.param(float("nan"), id="nan"),
        pytest.param(float("inf"), id="infinity"),
        pytest.param(MAX_DAILY_ENERGY_WH + 1, id="above_max"),
    ],
)
async def test_async_added_to_hass_rejects_invalid_restored_daily_energy_state(
    hass, freezer, caplog, raw: Any
) -> None:
    """Invalid restored state is history, not a numeric baseline."""
    await hass.config.async_set_time_zone(PRAGUE)
    freezer.move_to(T_DAY2_EARLY)

    coordinator = _Coordinator({BOX_ID: {"dc_in": {}}})
    sensor = _make_sensor(coordinator)
    sensor.hass = hass

    async def _last_state():
        return SimpleNamespace(state=raw, last_changed=T_DAY1)

    async def _last_extra_data():
        return None

    sensor.async_get_last_state = _last_state
    sensor.async_get_last_extra_data = _last_extra_data
    caplog.set_level(logging.DEBUG)

    await sensor.async_added_to_hass()

    assert sensor._restored_state is None
    assert sensor._daily_energy_fallback_value() is None
    assert sensor.state is None
    assert sensor.last_reset is None

    marker = sensor._daily_cycle_marker_state
    assert marker is not None
    assert marker.armed is False
    assert marker.last_value_wh is None
    assert marker.last_local_date == T_DAY1.date()

    coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = 1000
    assert sensor.state == 1000.0
    assert sensor.last_reset is None
    assert sensor._daily_cycle_marker_state is not None
    assert sensor._daily_cycle_marker_state.armed is False
    assert sensor._daily_cycle_marker_state.pending_high_value_wh == 1000.0

    assert not _daily_energy_log_records(caplog)


async def test_async_added_to_hass_preserves_valid_restored_marker_payload(
    hass,
) -> None:
    """Valid legacy version-1 marker data remains readable through RestoreEntity."""
    marker_state = DailyCycleMarkerState(
        armed=False,
        last_value_wh=19497.0,
        last_local_date=T_DAY1.date(),
    )
    coordinator = _Coordinator({BOX_ID: {"dc_in": {}}})
    sensor = _make_sensor(coordinator)
    sensor.hass = hass

    async def _last_state():
        return SimpleNamespace(state="19497", last_changed=T_DAY1)

    async def _last_extra_data():
        return DailyCycleRestoreData(marker_state)

    sensor.async_get_last_state = _last_state
    sensor.async_get_last_extra_data = _last_extra_data

    await sensor.async_added_to_hass()

    assert sensor._restored_state == 19497.0
    assert sensor._daily_cycle_marker_state == marker_state
    assert sensor.state == 19497.0


async def test_invalid_restored_state_without_current_sample_is_not_recorded(
    recorder_mock_compat, hass, freezer
) -> None:
    """Recorder must never see an invalid restored value as sensor input."""
    await hass.config.async_set_time_zone(PRAGUE)
    assert await async_setup_component(hass, "sensor", {})
    await hass.async_block_till_done()
    freezer.move_to(T_DAY2_EARLY)

    coordinator = _Coordinator({BOX_ID: {"dc_in": {}}})
    sensor = _make_sensor(coordinator)
    sensor.hass = hass

    async def _last_state():
        return SimpleNamespace(state=-1, last_changed=T_DAY1)

    async def _last_extra_data():
        return None

    sensor.async_get_last_state = _last_state
    sensor.async_get_last_extra_data = _last_extra_data

    await sensor.async_added_to_hass()
    sensor.async_write_ha_state()
    await async_wait_recording_done(hass)
    do_adhoc_statistics(hass, start=T_DAY2_EARLY)
    await async_wait_recording_done(hass)

    ha_state = hass.states.get(ENTITY_ID)
    assert ha_state is None or ha_state.state in {"unknown", "unavailable"}
    assert await _latest_sum(hass) is None


def test_first_invalid_diagnostic_emits_before_300_second_monotonic_window(
    hass, caplog
) -> None:
    """First diagnostic for a reason emits immediately, even early in monotonic time."""
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor.hass = hass
    caplog.set_level(logging.DEBUG)

    coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = -1
    with patch("time.monotonic", return_value=5.0):
        sensor.state

    records = _daily_energy_log_records(caplog)
    assert len(records) == 1
    assert "negative" in records[0].message


def test_repeated_same_reason_inside_window_is_rate_limited(hass, caplog) -> None:
    """Same reason within 300 seconds does not emit a second diagnostic."""
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor.hass = hass
    caplog.set_level(logging.DEBUG)

    coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = -1
    with patch("time.monotonic", side_effect=[5.0, 10.0]):
        sensor.state
        sensor.state

    records = _daily_energy_log_records(caplog)
    assert len(records) == 1


def test_different_reason_and_boundary_emit_separate_diagnostics(hass, caplog) -> None:
    """Each reason has its own window; exactly 300 seconds re-opens the window."""
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor.hass = hass
    caplog.set_level(logging.DEBUG)

    coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = -1
    with patch("time.monotonic", side_effect=[5.0, 10.0, 305.0]):
        sensor.state
        coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = True
        sensor.state
        coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = -1
        sensor.state

    records = _daily_energy_log_records(caplog)
    messages = [rec.message for rec in records]
    assert len(messages) == 3
    assert messages[0].count("negative") == 1
    assert messages[1].count("boolean") == 1
    assert messages[2].count("negative") == 1


def test_diagnostic_never_contains_raw_sample_or_exception_text(
    hass, caplog
) -> None:
    """Diagnostic message, args, and formatted record contain no raw value or exception."""
    coordinator = _Coordinator()
    sensor = _make_sensor(coordinator)
    sensor.hass = hass
    caplog.set_level(logging.DEBUG)

    raw = -12345.678
    coordinator.data[BOX_ID]["dc_in"]["fv_ad"] = raw
    with patch("time.monotonic", return_value=5.0):
        sensor.state

    for rec in _daily_energy_log_records(caplog):
        assert str(raw) not in rec.message
        assert str(raw) not in str(rec.args)
        formatted = rec.getMessage()
        assert str(raw) not in formatted
        assert "Traceback" not in formatted
        assert "Exception" not in formatted
        assert "negative" in formatted
