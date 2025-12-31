from datetime import datetime, timedelta, timezone

import pytest

from custom_components.oig_cloud.battery_forecast.data import history as history_module
from custom_components.oig_cloud.battery_forecast.types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_UPS,
    CBB_MODE_NAMES,
    SERVICE_MODE_HOME_UPS,
)


class DummyState:
    def __init__(self, state, last_updated):
        self.state = state
        self.last_updated = last_updated


class DummySensor:
    def __init__(self, hass):
        self._hass = hass
        self._box_id = "123"

    def _get_total_battery_capacity(self):
        return 10.0

    def _log_rate_limited(self, *args, **kwargs):
        return None


@pytest.mark.asyncio
async def test_fetch_interval_from_history_basic(hass, monkeypatch):
    start = datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc)
    end = start + timedelta(minutes=15)

    def _states(start_val, end_val):
        return [DummyState(start_val, start), DummyState(end_val, end)]

    states = {
        "sensor.oig_123_ac_out_en_day": _states("1000", "1500"),
        "sensor.oig_123_ac_in_ac_ad": _states("2000", "2300"),
        "sensor.oig_123_ac_in_ac_pd": _states("0", "100"),
        "sensor.oig_123_dc_in_fv_ad": _states("0", "200"),
        "sensor.oig_123_batt_bat_c": [DummyState("50", end)],
        "sensor.oig_123_box_prms_mode": [DummyState(SERVICE_MODE_HOME_UPS, end)],
        "sensor.oig_123_spot_price_current_15min": [DummyState("5", end)],
        "sensor.oig_123_export_price_current_15min": [DummyState("2", end)],
    }

    def fake_get_significant_states(*_args, **_kwargs):
        return states

    monkeypatch.setattr(
        "homeassistant.components.recorder.history.get_significant_states",
        fake_get_significant_states,
    )

    sensor = DummySensor(hass)
    result = await history_module.fetch_interval_from_history(sensor, start, end)

    assert result is not None
    assert result["consumption_kwh"] == 0.5
    assert result["grid_import"] == 0.3
    assert result["grid_export"] == 0.1
    assert result["solar_kwh"] == 0.2
    assert result["battery_soc"] == 50.0
    assert result["battery_kwh"] == 5.0
    assert result["spot_price"] == 5.0
    assert result["export_price"] == 2.0
    assert result["net_cost"] == 1.3
    assert result["mode"] == CBB_MODE_HOME_UPS
    assert result["mode_name"] == CBB_MODE_NAMES[CBB_MODE_HOME_UPS]


def test_map_mode_name_to_id_unknown() -> None:
    assert history_module.map_mode_name_to_id("unknown") == CBB_MODE_HOME_I
