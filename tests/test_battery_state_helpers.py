from custom_components.oig_cloud.battery_forecast.data import battery_state


class DummySensor:
    def __init__(self, hass):
        self._hass = hass
        self._box_id = "123"
        self._config_entry = None

    def _log_rate_limited(self, *args, **kwargs):
        return None


def test_get_total_battery_capacity_installed(hass):
    hass.states.async_set(
        "sensor.oig_123_installed_battery_capacity_kwh",
        "8000",
    )
    sensor = DummySensor(hass)
    assert battery_state.get_total_battery_capacity(sensor) == 8.0


def test_get_total_battery_capacity_pv_data(hass):
    hass.states.async_set(
        "sensor.oig_123_installed_battery_capacity_kwh",
        "unknown",
    )
    hass.states.async_set(
        "sensor.oig_123_pv_data",
        "ok",
        {"data": {"box_prms": {"p_bat": 9000}}},
    )
    sensor = DummySensor(hass)
    assert battery_state.get_total_battery_capacity(sensor) == 9.0


def test_get_current_battery_capacity(hass):
    hass.states.async_set(
        "sensor.oig_123_installed_battery_capacity_kwh",
        "8000",
    )
    hass.states.async_set("sensor.oig_123_batt_bat_c", "50")
    sensor = DummySensor(hass)
    assert battery_state.get_current_battery_capacity(sensor) == 4.0
