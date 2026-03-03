"""Tests for decision_trace propagation through forecast_update pipeline."""
from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as forecast_update_module,
)
from custom_components.oig_cloud.battery_forecast.sensors import (
    grid_charging_sensor as grid_module,
)
from custom_components.oig_cloud import sensor_types as sensor_types_module


class DummyCoordinator:
    def __init__(self):
        self.battery_forecast_data = None
        self.config_entry = None
        self.data = {}


class DummySensor:
    def __init__(self):
        self.coordinator = DummyCoordinator()
        self._timeline_data = [{"battery_capacity_kwh": 5.0}]
        self._last_update = datetime(2025, 1, 1, 12, 0, 0)
        self._mode_recommendations = [{"mode": "HOME I"}]
        self._charging_metrics = None


class DummyGridHass:
    def __init__(self, component=None):
        self.data = {
            "entity_components": {"sensor": component} if component else {},
        }

    def async_create_task(self, coro):
        coro.close()
        return object()


class DummyGridCoordinator:
    def __init__(self, hass, battery_forecast_data=None):
        self.hass = hass
        self.config_entry = None
        self.data = {}
        self.battery_forecast_data = battery_forecast_data

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


def test_trace_propagates_to_outputs():
    sensor = DummySensor()
    sensor._charging_metrics = {
        "algorithm": "economic",
        "decision_trace": [
            {
                "index": 0,
                "timestamp": "2025-01-01T12:00:00",
                "action": "charge",
                "reason_code": "economic_charging",
                "precedence_level": 400,
                "precedence_name": "ECONOMIC_CHARGING",
                "details": {"price": 1.5, "kwh": 0.7},
            }
        ],
    }

    forecast_update_module._save_forecast_to_coordinator(sensor)

    assert sensor.coordinator.battery_forecast_data is not None
    assert "decision_trace" in sensor.coordinator.battery_forecast_data
    trace = sensor.coordinator.battery_forecast_data["decision_trace"]
    assert len(trace) == 1
    assert trace[0]["action"] == "charge"
    assert trace[0]["reason_code"] == "economic_charging"
    assert trace[0]["precedence_level"] == 400


def test_legacy_consumer_contract_still_valid():
    sensor = DummySensor()
    sensor._charging_metrics = {
        "algorithm": "economic",
        "target_capacity_kwh": 8.0,
    }

    forecast_update_module._save_forecast_to_coordinator(sensor)

    assert sensor.coordinator.battery_forecast_data is not None
    assert "decision_trace" not in sensor.coordinator.battery_forecast_data
    assert sensor.coordinator.battery_forecast_data["timeline_data"] == sensor._timeline_data


def test_trace_absent_when_metrics_missing():
    sensor = DummySensor()
    sensor._charging_metrics = None

    forecast_update_module._save_forecast_to_coordinator(sensor)

    assert sensor.coordinator.battery_forecast_data is not None
    assert "decision_trace" not in sensor.coordinator.battery_forecast_data


def test_grid_sensor_reads_trace_from_coordinator(monkeypatch):
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: "123",
    )
    monkeypatch.setitem(
        sensor_types_module.SENSOR_TYPES,
        "grid_charge_plan",
        {"name": "Grid plan"},
    )

    decision_trace = [
        {
            "index": 0,
            "timestamp": "2025-01-01T12:00:00",
            "action": "charge",
            "reason_code": "death_valley",
            "precedence_level": 800,
            "precedence_name": "DEATH_VALLEY",
            "details": {"shortage": 1.5},
        }
    ]

    coordinator = DummyGridCoordinator(
        DummyGridHass(),
        battery_forecast_data={
            "timeline_data": [],
            "decision_trace": decision_trace,
        },
    )
    device_info = {"identifiers": {("oig_cloud", "123")}}
    sensor = grid_module.OigCloudGridChargingPlanSensor(
        coordinator,
        "grid_charge_plan",
        device_info,
    )
    sensor._box_id = "123"

    trace = sensor._get_decision_trace()
    assert trace == decision_trace
    assert trace[0]["reason_code"] == "death_valley"
    assert trace[0]["precedence_level"] == 800


def test_grid_sensor_handles_missing_trace(monkeypatch):
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: "123",
    )
    monkeypatch.setitem(
        sensor_types_module.SENSOR_TYPES,
        "grid_charge_plan",
        {"name": "Grid plan"},
    )

    coordinator = DummyGridCoordinator(
        DummyGridHass(),
        battery_forecast_data={
            "timeline_data": [],
        },
    )
    device_info = {"identifiers": {("oig_cloud", "123")}}
    sensor = grid_module.OigCloudGridChargingPlanSensor(
        coordinator,
        "grid_charge_plan",
        device_info,
    )
    sensor._box_id = "123"

    trace = sensor._get_decision_trace()
    assert trace == []


def test_grid_sensor_handles_missing_forecast_data(monkeypatch):
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: "123",
    )
    monkeypatch.setitem(
        sensor_types_module.SENSOR_TYPES,
        "grid_charge_plan",
        {"name": "Grid plan"},
    )

    coordinator = DummyGridCoordinator(DummyGridHass())
    coordinator.battery_forecast_data = None
    device_info = {"identifiers": {("oig_cloud", "123")}}
    sensor = grid_module.OigCloudGridChargingPlanSensor(
        coordinator,
        "grid_charge_plan",
        device_info,
    )
    sensor._box_id = "123"

    trace = sensor._get_decision_trace()
    assert trace == []


def test_grid_sensor_extra_state_attributes_includes_trace(monkeypatch):
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: "123",
    )
    monkeypatch.setitem(
        sensor_types_module.SENSOR_TYPES,
        "grid_charge_plan",
        {"name": "Grid plan"},
    )

    decision_trace = [
        {
            "index": 0,
            "timestamp": "2025-01-01T12:00:00",
            "action": "defer",
            "reason_code": "pv_first",
            "precedence_level": 1000,
            "precedence_name": "PV_FIRST",
            "details": {"pv_forecast_kwh": 5.0},
        }
    ]

    coordinator = DummyGridCoordinator(
        DummyGridHass(),
        battery_forecast_data={
            "timeline_data": [],
            "decision_trace": decision_trace,
        },
    )
    device_info = {"identifiers": {("oig_cloud", "123")}}
    sensor = grid_module.OigCloudGridChargingPlanSensor(
        coordinator,
        "grid_charge_plan",
        device_info,
    )
    sensor._box_id = "123"
    sensor._cached_ups_blocks = []

    attrs = sensor.extra_state_attributes

    assert "decision_trace" in attrs
    assert attrs["decision_trace"] == decision_trace
    assert attrs["decision_trace"][0]["action"] == "defer"
    assert attrs["decision_trace"][0]["precedence_level"] == 1000


def test_grid_sensor_extra_state_attributes_no_trace_when_absent(monkeypatch):
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: "123",
    )
    monkeypatch.setitem(
        sensor_types_module.SENSOR_TYPES,
        "grid_charge_plan",
        {"name": "Grid plan"},
    )

    coordinator = DummyGridCoordinator(
        DummyGridHass(),
        battery_forecast_data={
            "timeline_data": [],
        },
    )
    device_info = {"identifiers": {("oig_cloud", "123")}}
    sensor = grid_module.OigCloudGridChargingPlanSensor(
        coordinator,
        "grid_charge_plan",
        device_info,
    )
    sensor._box_id = "123"
    sensor._cached_ups_blocks = []

    attrs = sensor.extra_state_attributes

    assert "decision_trace" not in attrs
