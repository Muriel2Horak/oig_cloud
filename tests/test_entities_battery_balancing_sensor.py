from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud.entities.battery_balancing_sensor import (
    OigCloudBatteryBalancingSensor,
    _format_hhmm,
    _parse_dt_local,
)


class DummyCoordinator:
    def __init__(self):
        self.forced_box_id = "123"
        self.hass = None

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class DummyManager:
    def __init__(self, plan, attrs):
        self._plan = plan
        self._attrs = attrs

    def get_sensor_attributes(self):
        return self._attrs

    def get_active_plan(self):
        return self._plan

    def _get_cycle_days(self):
        return 7

    def _get_holding_time_hours(self):
        return 3

    def _get_soc_threshold(self):
        return 80


class DummyHass:
    def __init__(self, entry_id, manager):
        self.data = {DOMAIN: {entry_id: {"balancing_manager": manager}}}


class DummyBadData:
    def get(self, *_args, **_kwargs):
        raise RuntimeError("boom")


def test_format_hhmm():
    assert _format_hhmm(timedelta(hours=2, minutes=5)) == "02:05"


def test_parse_dt_local():
    dt = _parse_dt_local("2025-01-01T10:00:00")
    assert dt is not None
    assert dt.tzinfo is not None


def test_balancing_sensor_update_from_manager(monkeypatch):
    now = datetime(2025, 1, 1, 10, 5, tzinfo=dt_util.UTC)
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.battery_balancing_sensor.dt_util.now",
        lambda: now,
    )

    holding_start = now + timedelta(minutes=55)
    holding_end = now + timedelta(hours=2)

    plan = SimpleNamespace(
        holding_start=holding_start.isoformat(),
        holding_end=holding_end.isoformat(),
        intervals=[SimpleNamespace(ts=now.isoformat(), mode="home")],
        reason="unit-test",
        mode=SimpleNamespace(value="home_ups"),
        priority=SimpleNamespace(value="critical"),
    )

    manager_attrs = {
        "last_balancing_ts": now.isoformat(),
        "days_since_last": 1,
        "immediate_cost_czk": 10.0,
        "selected_cost_czk": 8.0,
        "cost_savings_czk": 2.0,
    }

    manager = DummyManager(plan, manager_attrs)
    hass = DummyHass("entry1", manager)

    coordinator = DummyCoordinator()
    config_entry = SimpleNamespace(entry_id="entry1", options={"balancing_enabled": True})
    sensor = OigCloudBatteryBalancingSensor(
        coordinator, "battery_balancing", config_entry, {"identifiers": {("oig", "123")}}, hass
    )

    sensor._update_from_manager()

    assert sensor.native_value == "critical"
    attrs = sensor.extra_state_attributes
    assert attrs["current_state"] == "charging"
    assert attrs["planned"]["mode"] == "home_ups"
    assert attrs["cost_savings_czk"] == 2.0


def test_init_resolve_box_id_error(monkeypatch):
    coordinator = DummyCoordinator()
    config_entry = SimpleNamespace(entry_id="entry1", options={})
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("boom")),
    )
    sensor = OigCloudBatteryBalancingSensor(
        coordinator, "battery_balancing", config_entry, {"identifiers": set()}
    )
    assert sensor._box_id == "unknown"


def test_get_balancing_manager_no_hass():
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=None,
    )
    assert sensor._get_balancing_manager() is None


def test_get_balancing_manager_exception(monkeypatch):
    coordinator = DummyCoordinator()
    sensor = OigCloudBatteryBalancingSensor(
        coordinator,
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=SimpleNamespace(data=DummyBadData()),
    )
    assert sensor._get_balancing_manager() is None


def test_update_manager_missing_keeps_status(monkeypatch):
    coordinator = DummyCoordinator()
    sensor = OigCloudBatteryBalancingSensor(
        coordinator,
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=SimpleNamespace(data={}),
    )
    sensor._status = "custom"
    sensor._update_from_manager()
    assert sensor._status == "custom"


def test_update_manager_attrs_error(monkeypatch):
    class BadManager(DummyManager):
        def get_sensor_attributes(self):
            raise RuntimeError("boom")

    manager = BadManager(None, {})
    hass = DummyHass("entry1", manager)
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=hass,
    )
    sensor._update_from_manager()
    assert sensor.native_value == "unknown"


def test_update_manager_config_fallbacks(monkeypatch):
    class BadConfigManager(DummyManager):
        def _get_cycle_days(self):
            raise RuntimeError("boom")

        def _get_holding_time_hours(self):
            raise RuntimeError("boom")

        def _get_soc_threshold(self):
            raise RuntimeError("boom")

    manager = BadConfigManager(None, {"days_since_last": "bad"})
    hass = DummyHass("entry1", manager)
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=hass,
    )
    sensor._update_from_manager()
    assert sensor.extra_state_attributes["cycle_days"] == 7
    assert sensor.extra_state_attributes["holding_hours"] == 3
    assert sensor.extra_state_attributes["soc_threshold"] == 80
    assert sensor.extra_state_attributes["days_since_last"] == 99


def test_status_branches_without_plan(monkeypatch):
    manager = DummyManager(None, {"days_since_last": 9})
    hass = DummyHass("entry1", manager)
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=hass,
    )
    sensor._update_from_manager()
    assert sensor.native_value == "overdue"

    manager = DummyManager(None, {"days_since_last": 6})
    hass = DummyHass("entry1", manager)
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=hass,
    )
    sensor._update_from_manager()
    assert sensor.native_value == "due_soon"


def test_status_disabled(monkeypatch):
    manager = DummyManager(None, {"days_since_last": 1})
    hass = DummyHass("entry1", manager)
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={"balancing_enabled": False}),
        {"identifiers": set()},
        hass=hass,
    )
    sensor._update_from_manager()
    assert sensor.native_value == "disabled"


def test_current_state_planned_and_balancing(monkeypatch):
    now = datetime(2025, 1, 1, 10, 0, tzinfo=dt_util.UTC)
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.battery_balancing_sensor.dt_util.now",
        lambda: now,
    )

    holding_start = (now + timedelta(hours=1)).isoformat()
    holding_end = (now + timedelta(hours=2)).isoformat()
    plan = SimpleNamespace(
        holding_start=holding_start,
        holding_end=holding_end,
        intervals=[SimpleNamespace(ts=now.isoformat(), mode="home")],
        reason="unit-test",
        mode=SimpleNamespace(value="home_ups"),
        priority=SimpleNamespace(value="high"),
    )

    manager = DummyManager(plan, {"days_since_last": 1})
    hass = DummyHass("entry1", manager)
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=hass,
    )
    sensor._update_from_manager()
    assert sensor.extra_state_attributes["current_state"] == "charging"

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.battery_balancing_sensor.dt_util.now",
        lambda: now + timedelta(hours=1, minutes=10),
    )
    sensor._update_from_manager()
    assert sensor.extra_state_attributes["current_state"] == "balancing"


def test_current_state_completed_and_exception(monkeypatch):
    now = datetime(2025, 1, 1, 10, 0, tzinfo=dt_util.UTC)
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.battery_balancing_sensor.dt_util.now",
        lambda: now,
    )

    plan = SimpleNamespace(
        holding_start="bad",
        holding_end="bad",
        intervals=None,
        reason="unit-test",
        mode=SimpleNamespace(value="home_ups"),
        priority=SimpleNamespace(value="high"),
    )
    manager = DummyManager(plan, {"days_since_last": 1})
    hass = DummyHass("entry1", manager)
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=hass,
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.battery_balancing_sensor._parse_dt_local",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("boom")),
    )
    sensor._update_from_manager()
    assert sensor.extra_state_attributes["current_state"] == "standby"


def test_current_state_completed(monkeypatch):
    now = datetime(2025, 1, 1, 10, 0, tzinfo=dt_util.UTC)
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.battery_balancing_sensor.dt_util.now",
        lambda: now,
    )

    plan = SimpleNamespace(
        holding_start=(now - timedelta(hours=2)).isoformat(),
        holding_end=(now - timedelta(hours=1)).isoformat(),
        intervals=None,
        reason="unit-test",
        mode=SimpleNamespace(value="home_ups"),
        priority=SimpleNamespace(value="high"),
    )
    manager = DummyManager(plan, {"days_since_last": 1})
    hass = DummyHass("entry1", manager)
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=hass,
    )
    sensor._update_from_manager()
    assert sensor.extra_state_attributes["current_state"] == "completed"


def test_charging_intervals_exception(monkeypatch):
    now = datetime(2025, 1, 1, 10, 0, tzinfo=dt_util.UTC)
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.battery_balancing_sensor.dt_util.now",
        lambda: now,
    )

    plan = SimpleNamespace(
        holding_start=(now + timedelta(hours=1)).isoformat(),
        holding_end=(now + timedelta(hours=2)).isoformat(),
        intervals=[SimpleNamespace(ts=now.isoformat(), mode="home")],
        reason="unit-test",
        mode=SimpleNamespace(value="home_ups"),
        priority=SimpleNamespace(value="high"),
    )
    manager = DummyManager(plan, {"days_since_last": 1})
    hass = DummyHass("entry1", manager)
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=hass,
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.battery_balancing_sensor._parse_dt_local",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("boom")),
    )
    sensor._update_from_manager()
    assert sensor.extra_state_attributes["planned"]["charging_intervals"] == []


def test_device_info_and_update_hooks(monkeypatch):
    manager = DummyManager(None, {"days_since_last": 1})
    hass = DummyHass("entry1", manager)
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": {("oig", "123")}},
        hass=hass,
    )
    sensor.async_write_ha_state = lambda: None
    assert sensor.device_info["identifiers"]
    sensor._handle_coordinator_update()

    import asyncio

    asyncio.run(sensor.async_update())


@pytest.mark.asyncio
async def test_async_added_restores_and_errors(monkeypatch):
    manager = DummyManager(None, {"days_since_last": 1})
    hass = DummyHass("entry1", manager)
    sensor = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=hass,
    )

    async def _last_state():
        return SimpleNamespace(
            state="ok",
            attributes={"days_since_last": "bad", "last_balancing": "2025-01-01T00:00:00"},
        )

    monkeypatch.setattr(sensor, "async_get_last_state", _last_state)
    await sensor.async_added_to_hass()
    assert sensor.native_value == "ok"

    async def _boom():
        raise RuntimeError("boom")

    sensor2 = OigCloudBatteryBalancingSensor(
        DummyCoordinator(),
        "battery_balancing",
        SimpleNamespace(entry_id="entry1", options={}),
        {"identifiers": set()},
        hass=hass,
    )
    monkeypatch.setattr(sensor2, "async_get_last_state", _boom)
    await sensor2.async_added_to_hass()
