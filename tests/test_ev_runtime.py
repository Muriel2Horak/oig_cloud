"""The car on a live install: entities in, request and profile out."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from custom_components.oig_cloud.ev import runtime as ev_runtime
from custom_components.oig_cloud.ev.runtime import (
    EvRuntime,
    charge_kw_from_statistics,
    soc_rows_from_statistics,
)

TZ = timezone(timedelta(hours=1))


class _States:
    def __init__(self, values):
        self._values = values

    def get(self, entity_id):
        value = self._values.get(entity_id)
        if value is None:
            return None
        if isinstance(value, tuple):
            state, attrs = value
        else:
            state, attrs = value, {}
        return SimpleNamespace(state=state, attributes=attrs)


def _hass(states):
    return SimpleNamespace(states=_States(states), data={})


OPTIONS = {
    "ev_soc_entity": "sensor.car_soc",
    "ev_plugged_entity": "binary_sensor.car_plugged",
    "ev_charge_limit_entity": "number.car_limit",
    "ev_capacity_kwh": 24.3,
    "ev_max_power_kw": 11.0,
}


def test_request_reads_soc_plug_and_limit_from_entities():
    hass = _hass({"sensor.car_soc": "35", "binary_sensor.car_plugged": "on", "number.car_limit": "80"})
    request = EvRuntime(hass, "entry", OPTIONS).build_request(datetime(2026, 11, 16, 20, tzinfo=TZ))

    assert request.soc_pct == 35.0
    assert request.plugged_in is True
    assert request.charge_limit_pct == 80.0
    assert request.capacity_kwh == 24.3
    assert request.max_power_kw == 11.0
    assert request.need is None  # no profile yet


def test_unplugged_car_and_missing_limit_fall_back_to_config():
    hass = _hass({"sensor.car_soc": "35", "binary_sensor.car_plugged": "off", "number.car_limit": "unknown"})
    options = {**OPTIONS, "ev_charge_limit_pct": 90}
    request = EvRuntime(hass, "entry", options).build_request()

    assert request.plugged_in is False
    assert request.charge_limit_pct == 90.0


def test_no_request_without_soc_or_capacity():
    runtime = EvRuntime(_hass({"sensor.car_soc": "unavailable"}), "entry", OPTIONS)
    assert runtime.build_request() is None
    assert runtime.last_request_issue == "soc_unavailable"

    runtime = EvRuntime(_hass({"sensor.car_soc": "50"}), "entry", {**OPTIONS, "ev_capacity_kwh": 0})
    assert runtime.build_request() is None
    assert runtime.last_request_issue == "capacity_unknown"


def test_statistics_rows_convert_seconds_and_milliseconds():
    ts = datetime(2026, 11, 8, 10, tzinfo=timezone.utc).timestamp()
    rows = soc_rows_from_statistics(
        [
            {"start": ts, "min": 10.0, "max": 20.0},
            {"start": ts * 1000 + 3_600_000, "min": 20.0, "max": 30.0},
            {"start": ts, "min": None, "max": 1.0},
        ]
    )
    assert len(rows) == 2
    assert rows[1].start - rows[0].start == timedelta(hours=1)


def test_charger_power_in_watts_becomes_kilowatts():
    ts = datetime(2026, 11, 8, 10, tzinfo=timezone.utc).timestamp()
    kw = charge_kw_from_statistics([{"start": ts, "mean": 11000.0}], unit="W")
    assert list(kw.values()) == [11.0]


async def test_profile_and_capacity_come_from_statistics():
    # Home Assistant's local zone is UTC in tests.
    monday = datetime(2026, 9, 7, tzinfo=timezone.utc)
    soc_rows = []
    power_rows = []
    for week in range(4):
        for hour in range(24):
            start = monday + timedelta(days=7 * week, hours=hour)
            level = 100.0 if hour < 7 else 60.0
            soc_rows.append({"start": start.timestamp(), "min": level, "max": level})
    # One charging hour: 10 % -> 50 % with 10 kWh.
    charge_start = datetime(2026, 9, 9, 2, tzinfo=timezone.utc)
    soc_rows += [
        {"start": charge_start.timestamp(), "min": 10.0, "max": 10.0},
        {"start": (charge_start + timedelta(hours=1)).timestamp(), "min": 10.0, "max": 50.0},
    ]
    power_rows.append({"start": (charge_start + timedelta(hours=1)).timestamp(), "mean": 10.0})

    hass = _hass({"sensor.wallbox": ("0", {"unit_of_measurement": "kW"})})
    options = {**OPTIONS, "ev_capacity_kwh": 0, "ev_charger_power_entity": "sensor.wallbox"}
    runtime = EvRuntime(hass, "entry", options)
    fetch = AsyncMock(return_value={"sensor.car_soc": soc_rows, "sensor.wallbox": power_rows})
    with patch.object(ev_runtime, "async_fetch_hourly_statistics", fetch):
        await runtime.async_refresh_profile(now=datetime(2026, 10, 5, tzinfo=TZ))

    assert runtime.profile.weekdays[0].need_pct == pytest.approx(40.0)
    assert runtime.profile.weekdays[0].departure_hour == 7
    assert runtime.capacity_kwh() == pytest.approx(25.0)


async def test_statistics_error_keeps_the_previous_profile():
    runtime = EvRuntime(_hass({}), "entry", OPTIONS)
    runtime.profile = "previous"
    with patch.object(
        ev_runtime, "async_fetch_hourly_statistics", AsyncMock(side_effect=RuntimeError("busy"))
    ):
        await runtime.async_refresh_profile()
    assert runtime.profile == "previous"


def test_publish_stores_the_plan_and_signals():
    runtime = EvRuntime(_hass({}), "entry", OPTIONS)
    with patch.object(ev_runtime, "async_dispatcher_send") as send:
        runtime.publish(None)
    send.assert_called_once()
    assert runtime.as_dict()["plan"] is None


def test_target_mode_defaults_to_the_limit_and_follows_the_option():
    hass = _hass({"sensor.car_soc": "35"})
    assert EvRuntime(hass, "entry", OPTIONS).build_request().target_mode == "limit"
    assert EvRuntime(hass, "entry", {**OPTIONS, "ev_target_mode": "need"}).build_request().target_mode == "need"
