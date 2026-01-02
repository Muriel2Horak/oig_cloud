from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.sensors import (
    grid_charging_sensor as grid_module,
)
from custom_components.oig_cloud import sensor_types as sensor_types_module


class DummyPrecomputedStore:
    def __init__(self, data):
        self._data = data

    async def async_load(self):
        return self._data


class DummyBatterySensor:
    def __init__(self, entity_id, precomputed):
        self.entity_id = entity_id
        self._precomputed_store = precomputed


class DummyComponent:
    def __init__(self, entities):
        self.entities = entities


class DummyHass:
    def __init__(self, component=None):
        self.data = {
            "entity_components": {"sensor": component} if component else {},
        }

    def async_create_task(self, coro):
        coro.close()
        return object()


class DummyCoordinator:
    def __init__(self, hass):
        self.hass = hass
        self.config_entry = None


def _make_sensor(monkeypatch, hass):
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: "123",
    )
    monkeypatch.setitem(
        sensor_types_module.SENSOR_TYPES,
        "grid_charge_plan",
        {"name": "Grid plan"},
    )
    coordinator = DummyCoordinator(hass)
    device_info = {"identifiers": {("oig_cloud", "123")}}
    sensor = grid_module.OigCloudGridChargingPlanSensor(
        coordinator,
        "grid_charge_plan",
        device_info,
    )
    sensor.hass = hass
    sensor._box_id = "123"
    return sensor


def test_calculate_charging_intervals(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    sensor._cached_ups_blocks = [
        {"grid_charge_kwh": 1.2, "cost_czk": 4.5},
        {"grid_charge_kwh": 0.8, "cost_czk": 2.0},
    ]

    intervals, energy, cost = sensor._calculate_charging_intervals()

    assert intervals == sensor._cached_ups_blocks
    assert energy == 2.0
    assert cost == 6.5


def test_dynamic_offset_fallback(monkeypatch):
    sensor = _make_sensor(monkeypatch, hass=None)
    assert sensor._get_dynamic_offset("home1", "homeups") == 300.0


@pytest.mark.asyncio
async def test_get_home_ups_blocks_from_detail_tabs(monkeypatch):
    fixed_now = datetime(2025, 1, 1, 12, 0, 0)
    monkeypatch.setattr(grid_module.dt_util, "now", lambda: fixed_now)

    detail_tabs = {
        "today": {
            "mode_blocks": [
                {
                    "mode_planned": "HOME UPS",
                    "mode_historical": "",
                    "status": "planned",
                    "start_time": "11:00",
                    "end_time": "13:00",
                    "grid_import_total_kwh": 2.5,
                    "cost_planned": 6.0,
                    "battery_soc_start": 5.0,
                    "battery_soc_end": 6.0,
                    "interval_count": 4,
                    "duration_hours": 1.0,
                },
                {
                    "mode_planned": "HOME 1",
                    "mode_historical": "HOME 1",
                    "status": "planned",
                    "start_time": "14:00",
                    "end_time": "15:00",
                },
            ]
        },
        "tomorrow": {
            "mode_blocks": [
                {
                    "mode_planned": "HOME UPS",
                    "start_time": "01:00",
                    "end_time": "02:00",
                    "grid_import_total_kwh": 1.0,
                    "cost_planned": 2.5,
                    "battery_soc_start": 6.0,
                    "battery_soc_end": 6.5,
                    "interval_count": 4,
                    "duration_hours": 1.0,
                }
            ]
        },
    }

    precomputed = DummyPrecomputedStore({"detail_tabs": detail_tabs})
    battery_sensor = DummyBatterySensor(
        "sensor.oig_123_battery_forecast", precomputed
    )
    component = DummyComponent([battery_sensor])
    hass = DummyHass(component)

    sensor = _make_sensor(monkeypatch, hass)

    blocks = await sensor._get_home_ups_blocks_from_detail_tabs()

    assert len(blocks) == 2
    assert blocks[0]["day"] == "today"
    assert blocks[1]["day"] == "tomorrow"
    assert blocks[0]["grid_charge_kwh"] == 2.5
    assert blocks[1]["cost_czk"] == 2.5
