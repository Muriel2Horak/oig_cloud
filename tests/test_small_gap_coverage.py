from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.planning import mode_guard
from custom_components.oig_cloud.boiler import circulation as circulation_module
from custom_components.oig_cloud.boiler import sensors as boiler_sensors
from custom_components.oig_cloud.entities.data_source_sensor import OigCloudDataSourceSensor
from custom_components.oig_cloud.switch import BoilerWrapperSwitch, _extract_digits, _resolve_box_id


def test_mode_guard_home_ups_extend_branch():
    modes = [3, 0, 0]  # short UPS block at start
    mode_names = {0: "Home 1", 3: "Home UPS"}
    min_mode_duration = {"Home UPS": 2}

    result = mode_guard.enforce_min_mode_duration(
        modes,
        mode_names=mode_names,
        min_mode_duration=min_mode_duration,
    )
    assert result[0] == 3
    assert result[1] == 3


def test_switch_resolve_box_id_and_extract_digits(monkeypatch):
    updates = []
    hass = SimpleNamespace(
        config_entries=SimpleNamespace(
            async_update_entry=lambda entry, options: updates.append((entry, options))
        )
    )
    entry = SimpleNamespace(options={}, data={}, title="OIG 123456789")

    resolved = _resolve_box_id(hass, entry)
    assert resolved == "123456789"
    assert updates and updates[0][1]["box_id"] == "123456789"

    assert _extract_digits(None) is None


def test_switch_resolve_box_id_from_entry_data():
    hass = SimpleNamespace(
        config_entries=SimpleNamespace(async_update_entry=lambda *_a, **_k: None)
    )
    entry = SimpleNamespace(options={}, data={"box_id": "998877"}, title="no digits")
    assert _resolve_box_id(hass, entry) == "998877"


@pytest.mark.asyncio
async def test_boiler_wrapper_switch_available_and_is_on_and_turn_off():
    calls = []

    class States:
        def __init__(self):
            self._map = {
                "switch.real": SimpleNamespace(state="on"),
                "switch.off": SimpleNamespace(state="off"),
            }

        def get(self, entity_id):
            return self._map.get(entity_id)

    class Services:
        async def async_call(self, domain, service, data, blocking=False):
            calls.append((domain, service, data, blocking))

    hass = SimpleNamespace(states=States(), services=Services())
    sw = BoilerWrapperSwitch(
        hass=hass,
        box_id="1",
        name="x",
        entity_suffix="bojler_top",
        target_entity_id="switch.real",
    )
    assert sw.available is True
    assert sw.is_on is True

    sw2 = BoilerWrapperSwitch(
        hass=hass,
        box_id="1",
        name="x",
        entity_suffix="bojler_alt",
        target_entity_id="switch.missing",
    )
    assert sw2.is_on is None

    await sw.async_turn_off()
    assert calls[-1][1] == "turn_off"


def test_circulation_no_peak_hours_branch():
    profile = SimpleNamespace(hourly_avg={0: 0.0, 1: 0.0})
    assert circulation_module.build_circulation_windows(profile) == []


def test_boiler_sensor_device_info_via_device():
    coordinator = SimpleNamespace(box_id="123", data={})
    sensor = boiler_sensors.BoilerUpperZoneTempSensor(coordinator)
    assert sensor.entity_id == "sensor.oig_123_boiler_upper_zone_temp"
    assert sensor.device_info["via_device"] == ("oig_cloud", "123")


@pytest.mark.asyncio
async def test_data_source_event_listener_refresh_branch(monkeypatch):
    callbacks = {}

    class DummyBus:
        def async_listen(self, event, cb):
            callbacks[event] = cb
            return lambda: None

    hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda _eid: None),
        bus=DummyBus(),
    )
    coordinator = SimpleNamespace(forced_box_id="123")
    entry = SimpleNamespace(entry_id="entry1")
    sensor = OigCloudDataSourceSensor(hass, coordinator, entry)

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.data_source_sensor.async_track_state_change_event",
        lambda *_a, **_k: (lambda: None),
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.data_source_sensor.async_track_time_interval",
        lambda *_a, **_k: (lambda: None),
    )

    called = {"refresh": 0}
    monkeypatch.setattr(sensor, "async_write_ha_state", lambda: called.__setitem__("refresh", called["refresh"] + 1))

    await sensor.async_added_to_hass()

    event_cb = next(iter(callbacks.values()))
    event_cb(SimpleNamespace(data={"entry_id": "entry1"}))
    assert called["refresh"] == 1
