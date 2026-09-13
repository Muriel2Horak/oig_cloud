"""The sensor that publishes forecast accuracy.

State is the 7-day consumption MAPE; the attributes carry the breakdown the
Phase 3 decision will be made on — per horizon, per plan version, and against
the naive baseline anything else has to beat.
"""

from __future__ import annotations

from datetime import date, timedelta
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities import (
    forecast_accuracy_sensor as module,
)


class DummyStore:
    def __init__(self, data):
        self._data = data

    async def async_load(self):
        return self._data


def _day(planned: float, actual: float, day: date) -> dict:
    return {
        "date": day.strftime("%Y-%m-%d"),
        "created_at": f"{day}T00:00:45+02:00",
        "plan": [
            {
                "time": f"{i // 4:02d}:{(i % 4) * 15:02d}",
                "consumption_kwh": planned,
                "solar_kwh": 0.2,
                "net_cost": 0.4,
            }
            for i in range(96)
        ],
        "actual": [
            {
                "time": f"{i // 4:02d}:{(i % 4) * 15:02d}",
                "consumption_kwh": actual,
                "solar_kwh": 0.17,
                "net_cost": 0.5,
            }
            for i in range(96)
        ],
        "locked": True,
    }


def _archive(today: date, days: int = 5) -> dict:
    return {
        (today - timedelta(days=offset)).strftime("%Y-%m-%d"): _day(
            0.15, 0.33, today - timedelta(days=offset)
        )
        for offset in range(1, days + 1)
    }


def _sensor(store_data, today=date(2026, 9, 7)):
    coordinator = SimpleNamespace(hass=None)
    sensor = module.OigCloudForecastAccuracySensor(
        coordinator, "forecast_accuracy", SimpleNamespace(options={}), {}, None
    )
    sensor._plans_store = DummyStore(store_data)
    sensor._today_provider = lambda: today
    return sensor


@pytest.mark.asyncio
async def test_state_is_the_seven_day_consumption_error():
    sensor = _sensor({"daily_archive": _archive(date(2026, 9, 7))})

    await sensor.async_update()

    assert sensor.native_value == pytest.approx(54.5, abs=0.5)
    assert sensor.native_unit_of_measurement == "%"


@pytest.mark.asyncio
async def test_attributes_carry_both_windows():
    sensor = _sensor({"daily_archive": _archive(date(2026, 9, 7))})

    await sensor.async_update()
    attrs = sensor.extra_state_attributes

    assert attrs["last_7_days"]["days"] == 5
    assert attrs["last_30_days"]["days"] == 5
    assert attrs["last_7_days"]["consumption_bias_pct"] < 0


@pytest.mark.asyncio
async def test_attributes_score_the_naive_baseline_for_each_day():
    """Without this number there is no way to say whether the planner beats
    doing nothing clever at all."""
    sensor = _sensor({"daily_archive": _archive(date(2026, 9, 7), days=10)})

    await sensor.async_update()
    days = sensor.extra_state_attributes["days"]

    assert days
    assert any(entry.get("naive") for entry in days)


@pytest.mark.asyncio
async def test_cost_delta_is_reported_in_czk():
    sensor = _sensor({"daily_archive": _archive(date(2026, 9, 7))})

    await sensor.async_update()

    assert sensor.extra_state_attributes["last_7_days"]["cost_delta_czk"] > 0


@pytest.mark.asyncio
async def test_no_archive_leaves_the_state_unknown_rather_than_zero():
    sensor = _sensor({"daily_archive": {}})

    await sensor.async_update()

    assert sensor.native_value is None
    assert sensor.extra_state_attributes["last_7_days"]["days"] == 0


@pytest.mark.asyncio
async def test_a_store_failure_does_not_raise():
    class Broken:
        async def async_load(self):
            raise OSError("unreadable")

    sensor = _sensor({})
    sensor._plans_store = Broken()

    await sensor.async_update()

    assert sensor.native_value is None


@pytest.mark.asyncio
async def test_revision_versions_are_reported_per_day():
    today = date(2026, 9, 7)
    archive = _archive(today, days=2)
    day_key = (today - timedelta(days=1)).strftime("%Y-%m-%d")
    archive[day_key]["revisions"] = [
        {"version": 1, "created_at": f"{day_key}T06:00:00", "consumption_kwh": [0.33] * 96}
    ]

    sensor = _sensor({"daily_archive": archive})
    await sensor.async_update()

    day = next(
        entry
        for entry in sensor.extra_state_attributes["days"]
        if entry["date"] == day_key
    )
    versions = {entry["version"] for entry in day["versions"]}
    assert versions == {0, 1}


def test_the_sensor_type_is_registered_with_a_czech_name():
    from custom_components.oig_cloud.sensors.SENSOR_TYPES_STATISTICS import (
        SENSOR_TYPES_STATISTICS,
    )

    config = SENSOR_TYPES_STATISTICS["forecast_accuracy"]
    assert config["sensor_type_category"] == "forecast_accuracy"
    assert config["device_mapping"] == "analytics"
    assert config["name_cs"]


# --------------------------------------------------------------------------
# wiring: registered with the other battery-prediction sensors
# --------------------------------------------------------------------------


def test_the_sensor_is_created_alongside_the_battery_prediction_sensors():
    from custom_components.oig_cloud import sensor as sensor_module

    coordinator = SimpleNamespace(hass=None, data={})
    created = sensor_module._create_forecast_accuracy_sensors(
        coordinator, SimpleNamespace(options={}), {}, None
    )

    assert len(created) == 1
    assert created[0]._sensor_type == "forecast_accuracy"


def test_the_sensor_survives_orphan_cleanup_when_prediction_is_on():
    """A sensor missing from the expected set is deleted as an orphan on the
    next restart."""
    from custom_components.oig_cloud import sensor as sensor_module
    from custom_components.oig_cloud.const import DOMAIN

    entry = SimpleNamespace(
        entry_id="e1", options={"enable_battery_prediction": True}
    )
    hass = SimpleNamespace(
        data={DOMAIN: {"e1": {"statistics_enabled": False}}}
    )

    expected = sensor_module._get_expected_sensor_types(hass, entry)

    assert "forecast_accuracy" in expected
