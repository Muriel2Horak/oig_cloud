"""Coverage for recorder fallback branches in statistics_sensor and adaptive_consumption."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud.battery_forecast.data.adaptive_consumption import (
    AdaptiveConsumptionHelper,
)
from custom_components.oig_cloud.entities.statistics_sensor import (
    OigCloudStatisticsSensor,
)


# --------------------------------------------------------------------------- #
# AdaptiveConsumptionHelper.get_consumption_today – recorder fallback + no executor
# --------------------------------------------------------------------------- #

class DummyStates:
    def __init__(self, mapping: dict):
        self._mapping = mapping

    def get(self, entity_id: str):
        return self._mapping.get(entity_id)


class DummyStateObj:
    """Minimal state object that behaves like a dict for the consumption path."""

    def __init__(self, state: Any):
        self._state = state
        self.state = state

    def get(self, key: str, default: Any = None) -> Any:
        if key == "state":
            return self._state
        return default


@pytest.mark.asyncio
async def test_get_consumption_today_no_recorder_no_executor(monkeypatch) -> None:
    """Branch: no recorder_instance AND hass lacks async_add_executor_job → returns None."""
    helper = AdaptiveConsumptionHelper(hass=SimpleNamespace(), box_id="123")
    # Ensure hass has no async_add_executor_job and recorder can't be fetched
    helper._hass = SimpleNamespace(
        states=DummyStates({}),
    )

    monkeypatch.setattr(
        "homeassistant.helpers.recorder.get_instance",
        lambda _h: (_ for _ in ()).throw(Exception("no recorder")),
    )

    result = await helper.get_consumption_today()
    assert result is None


@pytest.mark.asyncio
async def test_get_consumption_today_recorder_present_uses_executor(monkeypatch) -> None:
    """Branch: recorder_instance is available → uses its async_add_executor_job."""
    helper = AdaptiveConsumptionHelper(hass=SimpleNamespace(), box_id="123")

    async def fake_executor_job(fn, *args, **kwargs):
        return fn(*args, **kwargs)

    fake_recorder = SimpleNamespace(
        async_add_executor_job=fake_executor_job,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.recorder.get_instance",
        lambda _h: fake_recorder,
    )

    monkeypatch.setattr(
        "homeassistant.components.recorder.history.get_significant_states",
        lambda _h, _s, _e, _entities: {
            "sensor.oig_123_actual_aco_p": [
                DummyStateObj("500.0"),
                DummyStateObj("600.0"),
            ]
        },
    )

    result = await helper.get_consumption_today()
    # Should compute a consumption value (not None)
    assert result is not None
    assert isinstance(result, float)


# --------------------------------------------------------------------------- #
# OigCloudStatisticsSensor._calculate_interval_statistics_from_history
# Fallback: no recorder_instance AND hass lacks async_add_executor_job
# --------------------------------------------------------------------------- #

class DummyCoordinator:
    def __init__(self):
        self.data = {"123": {}}
        self.config_entry: Any = None

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class DummyOptions(dict):
    def __getattr__(self, name: str) -> Any:
        if name in self:
            return self[name]
        raise AttributeError(name)


def _make_interval_sensor(hass: Any) -> OigCloudStatisticsSensor:
    """Build an interval-type sensor with a minimal coordinator."""
    coordinator = DummyCoordinator()
    coordinator.config_entry = SimpleNamespace(options=DummyOptions())
    device_info = {"identifiers": {("oig_cloud", "123")}}
    sensor = OigCloudStatisticsSensor(coordinator, "interval_test", device_info)
    sensor.hass = hass
    sensor.async_write_ha_state = lambda: None
    sensor._time_range = (6, 8)
    sensor._max_age_days = 2
    sensor._day_type = "weekday"
    return sensor


@pytest.mark.asyncio
async def test_calculate_interval_statistics_no_recorder_no_executor(monkeypatch) -> None:
    """Branch: no recorder_instance AND hass lacks async_add_executor_job → returns None."""
    # hass without async_add_executor_job
    hass = SimpleNamespace(states=DummyStates({}))
    sensor = _make_interval_sensor(hass)

    monkeypatch.setattr(
        "homeassistant.helpers.recorder.get_instance",
        lambda _h: (_ for _ in ()).throw(Exception("no recorder")),
    )

    result = await sensor._calculate_interval_statistics_from_history()
    assert result is None


@pytest.mark.asyncio
async def test_calculate_interval_statistics_hass_executor_fallback(monkeypatch) -> None:
    """Branch: no recorder_instance but hass.async_add_executor_job exists → uses it."""
    async def fake_executor_job(fn, *args, **kwargs):
        return fn(*args, **kwargs)

    hass = SimpleNamespace(
        states=DummyStates({}),
        async_add_executor_job=fake_executor_job,
    )
    sensor = _make_interval_sensor(hass)

    monkeypatch.setattr(
        "homeassistant.helpers.recorder.get_instance",
        lambda _h: (_ for _ in ()).throw(Exception("no recorder")),
    )

    class DummyState:
        def __init__(self, state: str, last_updated: datetime):
            self.state = state
            self.last_updated = last_updated

    fixed_now = datetime(2025, 1, 3, 12, 0)

    class FixedDatetime(datetime):
        min = datetime.min

        @classmethod
        def now(cls, tz=None):
            return fixed_now

        @classmethod
        def combine(cls, date, time, tzinfo=None):
            return datetime.combine(date, time, tzinfo)

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.statistics_sensor.datetime", FixedDatetime
    )

    def _history_period(_h, _start, _end, entity_id):
        return {
            entity_id: [
                DummyState("10", datetime(2025, 1, 2, 7, 0)),
                DummyState("20", datetime(2025, 1, 3, 7, 0)),
            ]
        }

    monkeypatch.setattr(
        "homeassistant.components.recorder.history.state_changes_during_period",
        _history_period,
    )

    value = await sensor._calculate_interval_statistics_from_history()
    assert value is not None
    assert isinstance(value, float)


@pytest.mark.asyncio
async def test_calculate_interval_statistics_recorder_executor_path(monkeypatch) -> None:
    calls = {"recorder": 0}

    async def fake_recorder_executor(fn, *args, **kwargs):
        calls["recorder"] += 1
        return fn(*args, **kwargs)

    hass = SimpleNamespace(states=DummyStates({}))
    sensor = _make_interval_sensor(hass)

    monkeypatch.setattr(
        "homeassistant.helpers.recorder.get_instance",
        lambda _h: SimpleNamespace(async_add_executor_job=fake_recorder_executor),
    )

    class DummyState:
        def __init__(self, state: str, last_updated: datetime):
            self.state = state
            self.last_updated = last_updated

    fixed_now = datetime(2025, 1, 3, 12, 0)

    class FixedDatetime(datetime):
        min = datetime.min

        @classmethod
        def now(cls, tz=None):
            return fixed_now

        @classmethod
        def combine(cls, date, time, tzinfo=None):
            return datetime.combine(date, time, tzinfo)

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.statistics_sensor.datetime", FixedDatetime
    )

    def _history_period(_h, _start, _end, entity_id):
        return {
            entity_id: [
                DummyState("10", datetime(2025, 1, 2, 7, 0)),
                DummyState("20", datetime(2025, 1, 3, 7, 0)),
            ]
        }

    monkeypatch.setattr(
        "homeassistant.components.recorder.history.state_changes_during_period",
        _history_period,
    )

    value = await sensor._calculate_interval_statistics_from_history()
    assert value is not None
    assert calls["recorder"] == 1
