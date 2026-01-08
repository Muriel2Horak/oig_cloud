from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import pytest

from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.battery_forecast.sensors import recommended_sensor


class DummyCoordinator:
    def __init__(self):
        self.hass = None
        self.last_update_success = True

    def async_add_listener(self, _callback):
        return lambda: None


class DummyConfigEntry:
    def __init__(self, options):
        self.options = options
        self.data = options
        self.entry_id = "entry-id"


class DummyStore:
    def __init__(self, data):
        self._data = data

    async def async_load(self):
        return self._data


def test_compute_state_and_attrs_with_detail_tabs(monkeypatch):
    monkeypatch.setattr(
        "custom_components.oig_cloud.sensor_types.SENSOR_TYPES",
        {"planner_recommended_mode": {"name": "Recommended", "icon": "mdi:robot"}},
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: "123",
    )

    coordinator = DummyCoordinator()
    config_entry = DummyConfigEntry({"auto_mode_switch_lead_seconds": 180.0})

    sensor = recommended_sensor.OigCloudPlannerRecommendedModeSensor(
        coordinator,
        "planner_recommended_mode",
        config_entry,
        device_info={},
        hass=None,
    )

    now = dt_util.now()
    current_start = now.replace(
        minute=(now.minute // 15) * 15, second=0, microsecond=0
    )
    next_start = current_start + timedelta(minutes=15)

    intervals = [
        {
            "time": current_start.strftime("%H:%M"),
            "planned": {"mode": 0, "mode_name": "HOME 1"},
        },
        {
            "time": next_start.strftime("%H:%M"),
            "planned": {"mode": 3, "mode_name": "HOME UPS"},
        },
    ]

    sensor._precomputed_payload = {
        "timeline_data": [],
        "calculation_time": now.isoformat(),
        "detail_tabs": {
            "today": {
                "date": current_start.date().isoformat(),
                "intervals": intervals,
            }
        },
    }

    value, attrs, _sig = sensor._compute_state_and_attrs()

    assert value == "Home 1"
    assert attrs["next_mode"] == "Home UPS"

    effective_from = dt_util.parse_datetime(attrs["recommended_effective_from"])
    next_change = dt_util.parse_datetime(attrs["next_mode_change_at"])
    assert (next_change - effective_from).total_seconds() == 180.0


def _make_sensor(monkeypatch, hass=None, options=None):
    monkeypatch.setattr(
        "custom_components.oig_cloud.sensor_types.SENSOR_TYPES",
        {"planner_recommended_mode": {"name": "Recommended", "icon": "mdi:robot"}},
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: "123",
    )
    coordinator = DummyCoordinator()
    coordinator.hass = hass
    config_entry = DummyConfigEntry(options or {})
    sensor = recommended_sensor.OigCloudPlannerRecommendedModeSensor(
        coordinator,
        "planner_recommended_mode",
        config_entry,
        device_info={},
        hass=hass,
    )
    sensor.hass = hass
    sensor.async_write_ha_state = lambda *args, **kwargs: None
    return sensor


def test_normalize_mode_label(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    assert sensor._normalize_mode_label("HOME UPS", None) == "Home UPS"
    assert sensor._normalize_mode_label("Home 1", None) == "Home 1"
    assert sensor._normalize_mode_label("HOME II", None) == "Home 1"
    assert sensor._normalize_mode_label("Home 3", None) == "Home 3"
    assert sensor._normalize_mode_label(None, 0) == "Home 1"
    assert sensor._normalize_mode_label(None, 3) == "Home UPS"
    assert sensor._normalize_mode_label("custom", None) is None


def test_parse_interval_time(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    date_hint = "2025-01-01"
    dt_val = sensor._parse_interval_time("12:15", date_hint)
    assert dt_val is not None
    assert sensor._parse_interval_time("bad", date_hint) is None


def test_get_auto_switch_lead_seconds(monkeypatch):
    hass = SimpleNamespace(data={}, config=SimpleNamespace(config_dir=str(Path.cwd())))
    sensor = _make_sensor(
        monkeypatch,
        hass=hass,
        options={"auto_mode_switch_lead_seconds": 90.0},
    )
    assert sensor._get_auto_switch_lead_seconds("Home 1", "Home 2") == 90.0

    hass.data["oig_cloud"] = {
        "entry-id": {
            "service_shield": SimpleNamespace(
                mode_tracker=SimpleNamespace(get_offset_for_scenario=lambda *_a: 120.0)
            )
        }
    }
    assert sensor._get_auto_switch_lead_seconds("Home 1", "Home 2") == 120.0


def test_compute_state_and_attrs_no_payload(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    value, attrs, _sig = sensor._compute_state_and_attrs()
    assert value is None
    assert attrs["points_count"] == 0


def test_compute_state_and_attrs_timeline_only(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    now = dt_util.now()
    timeline = [
        {"time": (now - timedelta(minutes=15)).isoformat(), "mode": 0},
        {"time": now.isoformat(), "mode": 1},
        {"time": (now + timedelta(minutes=15)).isoformat(), "mode": 3},
    ]
    sensor._precomputed_payload = {
        "timeline_data": timeline,
        "calculation_time": now.isoformat(),
    }
    value, attrs, _sig = sensor._compute_state_and_attrs()
    assert value in {"Home 2", "Home UPS", "Home 1"}
    assert attrs["next_mode_change_at"]


@pytest.mark.asyncio
async def test_async_refresh_precomputed_payload(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    sensor._precomputed_store = DummyStore({"timeline": []})
    await sensor._async_refresh_precomputed_payload()
    assert sensor._precomputed_payload is None

    sensor._precomputed_store = DummyStore(
        {
            "timeline": [{"time": datetime.now().isoformat(), "mode": 0}],
            "last_update": "now",
            "detail_tabs": {},
        }
    )
    await sensor._async_refresh_precomputed_payload()
    assert sensor._precomputed_payload["timeline_data"]


@pytest.mark.asyncio
async def test_async_recompute_sets_state(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    now = dt_util.now()
    sensor._precomputed_payload = {
        "timeline_data": [{"time": now.isoformat(), "mode": 0}],
        "calculation_time": now.isoformat(),
    }
    await sensor._async_recompute()
    assert sensor.native_value == "Home 1"


def test_available_and_extra_attrs(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    sensor._attr_extra_state_attributes = {"points_count": 0}
    assert sensor.available is False
    sensor._attr_extra_state_attributes = {"points_count": 1, "foo": "bar"}
    assert sensor.available is True
    assert sensor.extra_state_attributes["foo"] == "bar"
