from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.sensors import (
    efficiency_sensor as eff_module,
)
from custom_components.oig_cloud.sensors import SENSOR_TYPES_STATISTICS as stats_module


class DummyState:
    def __init__(self, state):
        self.state = str(state)
        self.attributes = {}
        self.last_updated = datetime.now(timezone.utc)


class DummyStates:
    def __init__(self):
        self._states = {}

    def get(self, entity_id):
        return self._states.get(entity_id)

    def async_set(self, entity_id, state):
        self._states[entity_id] = DummyState(state)

    def async_all(self, domain):
        prefix = f"{domain}."
        return [st for eid, st in self._states.items() if eid.startswith(prefix)]


class DummyHass:
    def __init__(self):
        self.states = DummyStates()
        self.created = []

    def async_create_task(self, coro):
        coro.close()
        self.created.append(True)
        return object()


class DummyCoordinator:
    def __init__(self, hass):
        self.hass = hass
        self.config_entry = SimpleNamespace(entry_id="entry")


def _make_sensor(monkeypatch, hass):
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: "123",
    )
    monkeypatch.setitem(
        stats_module.SENSOR_TYPES_STATISTICS,
        "battery_efficiency",
        {"name": "Battery Efficiency"},
    )
    coordinator = DummyCoordinator(hass)
    device_info = {"identifiers": {("oig_cloud", "123")}}
    entry = SimpleNamespace(entry_id="entry")
    sensor = eff_module.OigCloudBatteryEfficiencySensor(
        coordinator,
        "battery_efficiency",
        entry,
        device_info,
        hass,
    )
    sensor.hass = hass
    sensor.async_write_ha_state = lambda *args, **kwargs: None
    return sensor


@pytest.mark.asyncio
async def test_daily_update_computes_partial_efficiency(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    hass.states.async_set("sensor.oig_123_computed_batt_charge_energy_month", 10000)
    hass.states.async_set(
        "sensor.oig_123_computed_batt_discharge_energy_month", 8000
    )
    hass.states.async_set("sensor.oig_123_remaining_usable_capacity", 4.0)

    sensor._battery_kwh_month_start = 5.0

    await sensor._daily_update()

    assert sensor._current_month_partial["charge"] == 10.0
    assert sensor._current_month_partial["discharge"] == 8.0
    assert sensor._current_month_partial["efficiency"] == 90.0
    assert sensor._attr_native_value == 90.0


@pytest.mark.asyncio
async def test_monthly_calculation_sets_last_month(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    sensor._current_month_partial = {
        "charge": 10.0,
        "discharge": 8.0,
        "battery_start": 5.0,
        "battery_end": 4.0,
    }
    hass.states.async_set("sensor.oig_123_remaining_usable_capacity", 6.0)

    await sensor._monthly_calculation(datetime(2025, 2, 1, 0, 10, tzinfo=timezone.utc))

    assert sensor._efficiency_last_month == 90.0
    assert sensor._battery_kwh_month_start == 6.0
    assert sensor._current_month_partial == {}
