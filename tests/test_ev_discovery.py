"""Finding car and charger entities without knowing any brand."""

from __future__ import annotations

from custom_components.oig_cloud.ev.discovery import EntityInfo, discover


def _e(entity_id, state, device=None, device_name="", **attrs):
    return EntityInfo(entity_id, state, attrs, name=attrs.pop("friendly_name", ""), device_id=device, device_name=device_name)


def _install():
    car, wb, phone = "car1", "wb1", "ph1"
    return [
        # a car (any brand): SoC, plug, limit, range, climate, window heating
        _e("sensor.kodiaq_battery_level", "42", car, "Kodiaq", unit_of_measurement="%", device_class="battery"),
        _e("sensor.kodiaq_fuel_level", "62", car, "Kodiaq", unit_of_measurement="%"),
        _e("binary_sensor.kodiaq_charger_connected", "on", car, "Kodiaq", device_class="plug"),
        _e("number.kodiaq_charge_limit", "80", car, "Kodiaq", unit_of_measurement="%", device_class="battery", min=50, max=100),
        _e("sensor.kodiaq_range", "350", car, "Kodiaq", unit_of_measurement="km", device_class="distance"),
        _e("climate.kodiaq_air_conditioning", "off", car, "Kodiaq", hvac_modes=["heat_cool", "off"]),
        _e("switch.kodiaq_window_heating", "off", car, "Kodiaq"),
        _e("switch.kodiaq_charging", "off", car, "Kodiaq"),
        _e("switch.kodiaq_unlock_cable_after_charging", "on", car, "Kodiaq"),
        _e("sensor.kodiaq_outside_temperature", "10", car, "Kodiaq", unit_of_measurement="°C", device_class="temperature"),
        # a charger (any brand)
        _e("switch.garage_charger_pause_resume", "on", wb, "Garage charger"),
        _e("number.garage_charger_max_charging_current", "16", wb, "Garage charger", unit_of_measurement="A", min=6, max=16),
        _e("number.garage_charger_max_icp_current", "25", wb, "Garage charger", unit_of_measurement="A", min=6, max=255),
        _e("sensor.garage_charger_charging_power", "0", wb, "Garage charger", unit_of_measurement="kW", device_class="power"),
        _e("sensor.garage_charger_max_available_power", "16", wb, "Garage charger", unit_of_measurement="kW", device_class="power"),
        # noise
        _e("sensor.phone_battery_level", "77", phone, "Pixel", unit_of_measurement="%", device_class="battery"),
        _e("sensor.garden_outdoor_temperature", "8", None, unit_of_measurement="°C", device_class="temperature"),
        _e("weather.home", "cloudy", None, temperature=7.1),
        _e("sensor.oig_123_battery_soc", "50", None, unit_of_measurement="%", device_class="battery"),
    ]


def _best(result, role):
    found = result["roles"][role]
    return found[0]["entity_id"] if found else None


def test_every_role_finds_the_right_entity():
    result = discover(_install())
    assert _best(result, "ev_soc_entity") == "sensor.kodiaq_battery_level"
    assert _best(result, "ev_plugged_entity") == "binary_sensor.kodiaq_charger_connected"
    assert _best(result, "ev_charge_limit_entity") == "number.kodiaq_charge_limit"
    assert _best(result, "ev_charger_power_entity") == "sensor.garage_charger_charging_power"
    assert _best(result, "ev_switch_entity") == "switch.garage_charger_pause_resume"
    assert _best(result, "ev_current_entity") == "number.garage_charger_max_charging_current"
    assert _best(result, "ev_climate_entity") == "climate.kodiaq_air_conditioning"
    assert _best(result, "ev_window_heating_entity") == "switch.kodiaq_window_heating"
    assert _best(result, "ev_outside_temp_entity") == "sensor.garden_outdoor_temperature"
    assert result["control_mode"] == "wallbox"
    assert result["switch_inverted"] is False


def test_own_entities_and_lookalikes_are_left_out():
    result = discover(_install())
    socs = [c["entity_id"] for c in result["roles"]["ev_soc_entity"]]
    assert "sensor.oig_123_battery_soc" not in socs
    assert "sensor.kodiaq_fuel_level" not in socs
    switches = [c["entity_id"] for c in result["roles"]["ev_switch_entity"]]
    assert "switch.kodiaq_unlock_cable_after_charging" not in switches
    currents = [c["entity_id"] for c in result["roles"]["ev_current_entity"]]
    assert "number.garage_charger_max_icp_current" not in currents
    assert result["roles"]["ev_soc_entity"][0]["reasons"]


def test_without_a_charger_the_car_switch_is_used_through_the_cloud():
    entities = [e for e in _install() if not e.entity_id.startswith(("switch.garage", "number.garage", "sensor.garage"))]
    result = discover(entities)
    assert _best(result, "ev_switch_entity") == "switch.kodiaq_charging"
    assert result["control_mode"] == "car"


def test_a_pause_only_switch_is_read_inverted():
    entities = [
        _e("switch.evse_pause_charging", "off", "c", "EVSE charger"),
        _e("number.evse_charging_current", "16", "c", "EVSE charger", unit_of_measurement="A", min=6, max=32),
    ]
    result = discover(entities)
    assert _best(result, "ev_switch_entity") == "switch.evse_pause_charging"
    assert result["switch_inverted"] is True


def test_nothing_found_on_an_empty_install():
    result = discover([])
    assert all(v == [] for v in result["roles"].values())
    assert result["control_mode"] == "none"


def test_charge_control_beats_availability_and_own_platform_is_skipped():
    entities = [
        _e("switch.charger_availability", "on", "c", "Charger"),
        _e("switch.charger_charge_control", "on", "c", "Charger"),
        _e("number.charger_maximum_current", "16", "c", "Charger", unit_of_measurement="A", min=6, max=16),
        _e("sensor.charger_power_active_export", "0", "c", "Charger", unit_of_measurement="kW", device_class="power"),
        _e("sensor.charger_power_active_import", "0", "c", "Charger", unit_of_measurement="kW", device_class="power"),
        EntityInfo("binary_sensor.123_charge_ac", "on", {"device_class": "plug"}, platform="oig_cloud"),
    ]
    result = discover(entities)
    assert _best(result, "ev_switch_entity") == "switch.charger_charge_control"
    assert _best(result, "ev_charger_power_entity") == "sensor.charger_power_active_import"
    assert result["roles"]["ev_plugged_entity"] == []
