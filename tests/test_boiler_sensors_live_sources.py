"""Boiler sensors must not show unavailable/unknown while the first boiler refresh runs.

Regression (2026-11-06, box 2206237016): after every HA restart or entry
reload the heater state sensors showed ``unavailable`` and the temperature
sensors ``unknown`` for 2-8 minutes, although the heater switches were on and
the temperature sensors had values. The sensors read only the boiler
coordinator data, which arrives after the slow first refresh (profile and
plan), and the heater state only the runtime activity, which is empty until the
first activity event.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from homeassistant.core import HomeAssistant

from custom_components.oig_cloud.boiler import sensors as boiler_sensors
from custom_components.oig_cloud.const import (
    CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    CONF_BOILER_TEMP_SENSOR_BOTTOM,
    CONF_BOILER_TEMP_SENSOR_TOP,
)

MAIN = "switch.bojler_dole_local_main_switch"
ALT = "switch.bojler_nahora_local_main_switch"
TOP = "sensor.bojler_nahore_teplota"
BOTTOM = "sensor.bojler_dole_teplota"


def _coordinator(hass: HomeAssistant, data=None):
    return SimpleNamespace(
        hass=hass,
        box_id="2206237016",
        data=data,
        last_update_success=True,
        config={
            CONF_BOILER_HEATER_SWITCH_ENTITY: MAIN,
            CONF_BOILER_ALT_HEATER_SWITCH_ENTITY: ALT,
            CONF_BOILER_TEMP_SENSOR_TOP: TOP,
            CONF_BOILER_TEMP_SENSOR_BOTTOM: BOTTOM,
        },
        async_add_listener=lambda *_a, **_k: (lambda: None),
    )


def _runtime_without_activity():
    return SimpleNamespace(current_activity=None)


@pytest.mark.asyncio
async def test_heater_state_follows_the_switch_before_the_first_activity(hass):
    hass.states.async_set(MAIN, "on")
    hass.states.async_set(ALT, "off")
    coordinator = _coordinator(hass)
    runtime = _runtime_without_activity()
    main = boiler_sensors.BoilerHeaterMainStateSensor(coordinator, runtime=runtime)
    alt = boiler_sensors.BoilerHeaterAltStateSensor(coordinator, runtime=runtime)
    assert main.native_value == "on"
    assert alt.native_value == "off"
    hass.states.async_set(MAIN, "unavailable")
    assert main.native_value == "unavailable"


@pytest.mark.asyncio
async def test_runtime_activity_still_wins_when_it_has_the_heater(hass):
    hass.states.async_set(MAIN, "off")
    runtime = SimpleNamespace(
        current_activity=SimpleNamespace(heater_states={MAIN: "on"})
    )
    main = boiler_sensors.BoilerHeaterMainStateSensor(_coordinator(hass), runtime=runtime)
    assert main.native_value == "on"


@pytest.mark.asyncio
async def test_temperatures_come_live_until_the_coordinator_has_data(hass):
    hass.states.async_set(TOP, "35.1")
    hass.states.async_set(BOTTOM, "19.2")
    coordinator = _coordinator(hass, data=None)
    upper = boiler_sensors.BoilerUpperZoneTempSensor(coordinator)
    lower = boiler_sensors.BoilerLowerZoneTempSensor(coordinator)
    avg = boiler_sensors.BoilerAvgTempSensor(coordinator)
    needed = boiler_sensors.BoilerEnergyNeededSensor(coordinator)
    assert upper.native_value == 35.1
    assert lower.native_value == 19.2
    assert avg.native_value == pytest.approx(27.15)
    assert needed.native_value is not None

    coordinator.data = {"temperatures": {"upper_zone": 50.0, "lower_zone": 40.0},
                        "energy_state": {"avg_temp": 45.0, "energy_needed_kwh": 1.0}}
    assert upper.native_value == 50.0, "coordinator data is used once it exists"
    assert avg.native_value == 45.0


@pytest.mark.asyncio
async def test_source_change_rewrites_the_sensor_state(hass):
    hass.states.async_set(MAIN, "off")
    coordinator = _coordinator(hass)
    main = boiler_sensors.BoilerHeaterMainStateSensor(
        coordinator, runtime=_runtime_without_activity()
    )
    main.hass = hass
    main.entity_id = "sensor.oig_2206237016_boiler_heater_main_state"
    writes: list[str] = []
    main.async_write_ha_state = lambda: writes.append(main.native_value)
    await main.async_added_to_hass()
    hass.states.async_set(MAIN, "on")
    await hass.async_block_till_done()
    assert writes and writes[-1] == "on"
    await main.async_will_remove_from_hass()
    hass.states.async_set(MAIN, "off")
    await hass.async_block_till_done()
    assert writes[-1] == "on", "no writes after removal"
