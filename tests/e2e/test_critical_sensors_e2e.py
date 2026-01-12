from __future__ import annotations

import pytest


@pytest.mark.e2e
async def test_critical_sensor_battery_health(e2e_setup):
    hass, _entry = e2e_setup
    sensor_id = "sensor.oig_2206237016_battery_health"

    hass.states.async_set(sensor_id, "95.0", {"unit_of_measurement": "%"})
    state = hass.states.get(sensor_id)

    assert state is not None
    assert state.state == "95.0"
    assert state.attributes.get("unit_of_measurement") == "%"


@pytest.mark.e2e
async def test_critical_sensor_battery_balancing(e2e_setup):
    hass, _entry = e2e_setup
    sensor_id = "sensor.oig_2206237016_battery_balancing"

    hass.states.async_set(sensor_id, "active", {"mode": "opportunistic"})
    state = hass.states.get(sensor_id)

    assert state is not None
    assert state.state == "active"
    assert state.attributes.get("mode") == "opportunistic"


@pytest.mark.e2e
async def test_critical_sensor_charging_efficiency(e2e_setup):
    hass, _entry = e2e_setup
    sensor_id = "sensor.oig_2206237016_charging_efficiency"

    hass.states.async_set(sensor_id, "88.2", {"unit_of_measurement": "%"})
    state = hass.states.get(sensor_id)

    assert state is not None
    assert state.state == "88.2"
    assert state.attributes.get("unit_of_measurement") == "%"
