from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities import battery_health_sensor as module
from custom_components.oig_cloud.entities.battery_health_sensor import CapacityMeasurement


class DummyState:
    def __init__(self, state, last_changed):
        self.state = state
        self.last_changed = last_changed


class DummyStates:
    def __init__(self, mapping):
        self._mapping = mapping

    def get(self, entity_id):
        return self._mapping.get(entity_id)


class DummyHass:
    def __init__(self, states):
        self.states = states


class DummyStore:
    def __init__(self, *_args, **_kwargs):
        self.saved = None

    async def async_load(self):
        return None

    async def async_save(self, data):
        self.saved = data


@pytest.mark.asyncio
async def test_find_monotonic_charging_intervals(monkeypatch):
    monkeypatch.setattr(module, "Store", DummyStore)

    hass = DummyHass(DummyStates({}))
    tracker = module.BatteryHealthTracker(hass, "123", nominal_capacity_kwh=10.0)

    t0 = datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc)
    states = [
        DummyState("10", t0),
        DummyState("20", t0 + timedelta(hours=1)),
        DummyState("70", t0 + timedelta(hours=2)),
        DummyState("60", t0 + timedelta(hours=3)),
    ]

    intervals = tracker._find_monotonic_charging_intervals(states)
    assert len(intervals) == 1
    start_time, end_time, start_soc, end_soc = intervals[0]
    assert start_soc == 10.0
    assert end_soc == 70.0
    assert end_time == t0 + timedelta(hours=2)


@pytest.mark.asyncio
async def test_calculate_capacity(monkeypatch):
    monkeypatch.setattr(module, "Store", DummyStore)

    t0 = datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(hours=2)

    efficiency_state = DummyState("90", t0)
    hass = DummyHass(
        DummyStates({"sensor.oig_123_battery_efficiency": efficiency_state})
    )

    tracker = module.BatteryHealthTracker(hass, "123", nominal_capacity_kwh=15.3)

    charge_states = [
        DummyState("1000", t0),
        DummyState("8000", t1),
    ]

    measurement = tracker._calculate_capacity(
        t0,
        t1,
        start_soc=10.0,
        end_soc=60.0,
        charge_states=charge_states,
    )

    assert measurement is not None
    assert measurement.delta_soc == 50.0
    assert measurement.capacity_kwh > 0
    assert 70.0 <= measurement.soh_percent <= 100.0


def test_get_value_at_time_invalid_state(monkeypatch):
    monkeypatch.setattr(module, "Store", DummyStore)
    hass = DummyHass(DummyStates({}))
    tracker = module.BatteryHealthTracker(hass, "123")

    t0 = datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc)
    states = [DummyState("bad", t0)]
    assert tracker._get_value_at_time(states, t0) is None


def test_current_soh_and_capacity(monkeypatch):
    monkeypatch.setattr(module, "Store", DummyStore)
    hass = DummyHass(DummyStates({}))
    tracker = module.BatteryHealthTracker(hass, "123")

    base = CapacityMeasurement(
        timestamp="2025-01-01T00:00:00+00:00",
        start_soc=0.0,
        end_soc=50.0,
        delta_soc=50.0,
        charge_energy_wh=5000.0,
        capacity_kwh=10.0,
        soh_percent=90.0,
        duration_hours=1.0,
    )
    tracker._measurements = [base, replace(base, soh_percent=80.0, capacity_kwh=9.0)]

    assert tracker.get_current_soh() == 85.0
    assert tracker.get_current_capacity() == 9.5
