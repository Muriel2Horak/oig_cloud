"""Finding the boiler's entities without knowing any brand."""

from __future__ import annotations

from custom_components.oig_cloud.boiler.discovery import discover_boiler
from custom_components.oig_cloud.ev.discovery import EntityInfo


def _e(entity_id, state, device=None, device_name="", platform="", **attrs):
    return EntityInfo(entity_id, state, attrs, name=attrs.pop("friendly_name", ""),
                      device_id=device, device_name=device_name, platform=platform)


def _install():
    low, up, circ = "d_low", "d_up", "d_circ"
    return [
        _e("sensor.bojler_nahore_teplota", "55", up, "Bojler nahoře", unit_of_measurement="°C", device_class="temperature"),
        _e("sensor.bojler_dole_teplota", "38", low, "Bojler dole", unit_of_measurement="°C", device_class="temperature"),
        _e("switch.bojler_dole_main_switch", "on", low, "Bojler dole"),
        _e("switch.bojler_dole_high_temperature_switch", "off", low, "Bojler dole"),
        _e("switch.boiler_display_card_pre_release", "off", "d_hacs", "Boiler Display Card"),
        _e("sensor.em_bojler_vykon", "0", "d_em", "EM bojler", unit_of_measurement="W", device_class="power"),
        _e("sensor.termostat_energy_gas_hot_water", "3.2", "d_th", "Termostat", unit_of_measurement="kWh", device_class="energy"),
        _e("switch.cirkulace_zasuvka_1", "off", circ, "Cirkulace"),
        _e("switch.cirkulace_detsky_zamek", "off", circ, "Cirkulace"),
        # noise
        _e("sensor.obyvak_teplota", "21", "d_room", "Obývák", unit_of_measurement="°C", device_class="temperature"),
        _e("sensor.boiler_room_outdoor_temperature", "8", None, unit_of_measurement="°C", device_class="temperature"),
        _e("sensor.oig_123_boiler_top", "55", None, unit_of_measurement="°C", device_class="temperature"),
        _e("switch.boiler_ssr", "on", "d_box", "Box", platform="oig_cloud"),
    ]


def _best(result, role):
    found = result["roles"][role]
    return found[0]["entity_id"] if found else None


def test_every_boiler_setting_finds_its_entity():
    result = discover_boiler(_install())
    assert _best(result, "boiler_temp_sensor_top") == "sensor.bojler_nahore_teplota"
    assert _best(result, "boiler_temp_sensor_bottom") == "sensor.bojler_dole_teplota"
    assert _best(result, "boiler_current_power_entity") == "sensor.em_bojler_vykon"
    assert _best(result, "boiler_alt_energy_sensor") == "sensor.termostat_energy_gas_hot_water"
    assert _best(result, "boiler_heater_switch_entity") == "switch.bojler_dole_main_switch"
    assert _best(result, "boiler_circulation_pump_switch_entity") == "switch.cirkulace_zasuvka_1"


def test_setting_switches_room_sensors_and_own_entities_are_left_out():
    result = discover_boiler(_install())
    heaters = [c["entity_id"] for c in result["roles"]["boiler_heater_switch_entity"]]
    assert "switch.bojler_dole_high_temperature_switch" not in heaters
    assert "switch.boiler_display_card_pre_release" not in heaters
    assert "switch.boiler_ssr" not in heaters
    temps = [c["entity_id"] for c in result["roles"]["boiler_temp_sensor_top"]]
    assert "sensor.obyvak_teplota" not in temps
    assert "sensor.boiler_room_outdoor_temperature" not in temps
    assert "sensor.oig_123_boiler_top" not in temps
    circ = [c["entity_id"] for c in result["roles"]["boiler_circulation_pump_switch_entity"]]
    assert "switch.cirkulace_detsky_zamek" not in circ


def test_one_thermometer_is_not_both_top_and_bottom():
    only = [_e("sensor.bojler_teplota", "50", "d", "Bojler", unit_of_measurement="°C", device_class="temperature")]
    result = discover_boiler(only)
    assert _best(result, "boiler_temp_sensor_top") == "sensor.bojler_teplota"
    assert result["roles"]["boiler_temp_sensor_bottom"] == []


def test_nothing_found_on_an_empty_install():
    assert all(v == [] for v in discover_boiler([])["roles"].values())


async def test_discover_endpoint_returns_candidates_and_current(monkeypatch):
    import json
    from types import SimpleNamespace

    from custom_components.oig_cloud.boiler.discovery_api import OIGCloudBoilerDiscoverView
    from custom_components.oig_cloud.const import DOMAIN
    from custom_components.oig_cloud.ev import discovery as ev_discovery

    entry = SimpleNamespace(entry_id="e", options={"boiler_temp_sensor_top": "sensor.t"})
    hass = SimpleNamespace(
        data={DOMAIN: {"e": {"coordinator": SimpleNamespace(data={"123": {}})}}},
        config_entries=SimpleNamespace(async_entries=lambda domain: [entry]),
    )
    monkeypatch.setattr(ev_discovery, "entities_from_hass", lambda h: _install())
    request = SimpleNamespace(app={"hass": hass})
    body = json.loads((await OIGCloudBoilerDiscoverView().get(request, "123")).body)
    assert body["current"]["boiler_temp_sensor_top"] == "sensor.t"
    assert body["current"]["boiler_heater_switch_entity"] is None
    assert body["roles"]["boiler_heater_switch_entity"][0]["entity_id"] == "switch.bojler_dole_main_switch"
    assert (await OIGCloudBoilerDiscoverView().get(request, "999")).status == 404
