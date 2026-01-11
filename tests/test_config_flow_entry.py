from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.config import steps as steps_module
from custom_components.oig_cloud.const import CONF_AUTO_MODE_SWITCH


class DummyConfigFlow(steps_module.ConfigFlow):
    def __init__(self):
        super().__init__()
        self.hass = SimpleNamespace()

    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    def async_create_entry(self, title, data, options=None):
        return {"type": "create_entry", "title": title, "data": data, "options": options}

    def async_abort(self, reason):
        return {"type": "abort", "reason": reason}


@pytest.mark.asyncio
async def test_step_user_form():
    flow = DummyConfigFlow()
    result = await flow.async_step_user()
    assert result["type"] == "form"
    assert result["step_id"] == "user"


@pytest.mark.asyncio
async def test_step_user_quick_setup():
    flow = DummyConfigFlow()
    result = await flow.async_step_user({"setup_type": "quick"})
    assert result["type"] == "form"
    assert result["step_id"] == "quick_setup"


@pytest.mark.asyncio
async def test_step_user_wizard():
    flow = DummyConfigFlow()
    result = await flow.async_step_user({"setup_type": "wizard"})
    assert result["type"] == "form"
    assert result["step_id"] == "wizard_welcome"


@pytest.mark.asyncio
async def test_quick_setup_requires_live_data():
    flow = DummyConfigFlow()
    result = await flow.async_step_quick_setup(
        {
            "username": "demo",
            "password": "pass",
            "live_data_enabled": False,
        }
    )
    assert result["type"] == "form"
    assert result["errors"]["live_data_enabled"] == "live_data_not_confirmed"


@pytest.mark.asyncio
async def test_quick_setup_success(monkeypatch):
    async def _fake_validate_input(_hass, _data):
        return {"title": "OIG Cloud"}

    monkeypatch.setattr(steps_module, "validate_input", _fake_validate_input)

    flow = DummyConfigFlow()
    result = await flow.async_step_quick_setup(
        {
            "username": "demo",
            "password": "pass",
            "live_data_enabled": True,
        }
    )

    assert result["type"] == "create_entry"
    assert result["data"]["username"] == "demo"
    assert result["options"]["data_source_mode"] == "cloud_only"


@pytest.mark.asyncio
async def test_import_yaml_not_implemented():
    flow = DummyConfigFlow()
    result = await flow.async_step_import_yaml({})
    assert result["type"] == "abort"
    assert result["reason"] == "not_implemented"


@pytest.mark.asyncio
async def test_wizard_summary_creates_entry():
    flow = DummyConfigFlow()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_pricing": True,
        "enable_battery_prediction": True,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "create_entry"
    assert result["data"]["username"] == "demo"
    assert result["options"]["enable_pricing"] is True


@pytest.mark.asyncio
async def test_wizard_summary_sanitizes_data_source_mode():
    flow = DummyConfigFlow()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "data_source_mode": "hybrid",
    }
    result = await flow.async_step_wizard_summary({})
    assert result["type"] == "create_entry"
    assert result["options"]["data_source_mode"] == "local_only"


@pytest.mark.asyncio
async def test_wizard_summary_full_option_mapping():
    flow = DummyConfigFlow()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "standard_scan_interval": 15,
        "extended_scan_interval": 120,
        "data_source_mode": "local_only",
        "local_proxy_stale_minutes": 7,
        "local_event_debounce_ms": 150,
        "enable_statistics": True,
        "enable_solar_forecast": True,
        "enable_battery_prediction": True,
        "enable_pricing": True,
        "enable_extended_sensors": False,
        "enable_chmu_warnings": True,
        "enable_dashboard": True,
        "solar_forecast_mode": "hourly",
        "solar_forecast_api_key": "key",
        "solar_forecast_latitude": 50.5,
        "solar_forecast_longitude": 14.5,
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_declination": 30,
        "solar_forecast_string1_azimuth": 10,
        "solar_forecast_string1_kwp": 4.2,
        "solar_forecast_string2_enabled": True,
        "solar_forecast_string2_declination": 40,
        "solar_forecast_string2_azimuth": 190,
        "solar_forecast_string2_kwp": 2.4,
        "min_capacity_percent": 25.0,
        "target_capacity_percent": 75.0,
        "home_charge_rate": 3.1,
        CONF_AUTO_MODE_SWITCH: True,
        "disable_planning_min_guard": True,
        "max_ups_price_czk": 9.5,
        "balancing_enabled": True,
        "balancing_interval_days": 5,
        "balancing_hold_hours": 2,
        "balancing_opportunistic_threshold": 1.2,
        "balancing_economic_threshold": 2.0,
        "cheap_window_percentile": 25,
        "import_pricing_scenario": "spot_fixed",
        "spot_fixed_fee_kwh": 0.55,
        "export_pricing_scenario": "fix_price",
        "export_fixed_price_kwh": 2.6,
        "tariff_count": "dual",
        "distribution_fee_vt_kwh": 1.5,
        "distribution_fee_nt_kwh": 0.9,
        "tariff_vt_start_weekday": "6",
        "tariff_nt_start_weekday": "22,2",
        "tariff_weekend_same_as_weekday": False,
        "tariff_vt_start_weekend": "8",
        "tariff_nt_start_weekend": "0",
        "vat_rate": 19.0,
        "enable_boiler": True,
        "boiler_volume_l": 150,
        "boiler_target_temp_c": 55.0,
        "boiler_cold_inlet_temp_c": 12.0,
        "boiler_temp_sensor_top": "sensor.boiler_top",
        "boiler_temp_sensor_bottom": "sensor.boiler_bottom",
        "boiler_temp_sensor_position": "upper_quarter",
        "boiler_stratification_mode": "two_zone",
        "boiler_two_zone_split_ratio": 0.6,
        "boiler_heater_power_kw_entity": "sensor.boiler_power",
        "boiler_heater_switch_entity": "switch.boiler",
        "boiler_alt_heater_switch_entity": "switch.boiler_alt",
        "boiler_has_alternative_heating": True,
        "boiler_alt_cost_kwh": 3.2,
        "boiler_alt_energy_sensor": "sensor.boiler_alt_energy",
        "boiler_spot_price_sensor": "sensor.spot_price",
        "boiler_deadline_time": "21:00",
        "boiler_planning_horizon_hours": 48,
        "boiler_plan_slot_minutes": 15,
        "enable_auto": True,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "create_entry"
    options = result["options"]
    assert options["standard_scan_interval"] == 15
    assert options["extended_scan_interval"] == 120
    assert options["data_source_mode"] == "local_only"
    assert options["local_proxy_stale_minutes"] == 7
    assert options["local_event_debounce_ms"] == 150
    assert options["enable_extended_sensors"] is False
    assert options["enable_chmu_warnings"] is True
    assert options["solar_forecast_mode"] == "hourly"
    assert options["solar_forecast_string2_enabled"] is True
    assert options["min_capacity_percent"] == 25.0
    assert options["target_capacity_percent"] == 75.0
    assert options["home_charge_rate"] == 3.1
    assert options[CONF_AUTO_MODE_SWITCH] is True
    assert options["disable_planning_min_guard"] is True
    assert options["max_ups_price_czk"] == 9.5
    assert options["balancing_interval_days"] == 5
    assert options["cheap_window_percentile"] == 25
    assert options["spot_pricing_model"] == "fixed"
    assert options["spot_fixed_fee_mwh"] == 550.0
    assert options["export_pricing_model"] == "fixed_prices"
    assert options["export_fixed_price"] == 2.6
    assert options["dual_tariff_enabled"] is True
    assert options["tariff_vt_start_weekend"] == "8"
    assert options["tariff_nt_start_weekend"] == "0"
    assert options["boiler_plan_slot_minutes"] == 15
    assert options["boiler_temp_sensor_position"] == "upper_quarter"
    assert options["boiler_alt_energy_sensor"] == "sensor.boiler_alt_energy"
    assert options["enable_auto"] is True


@pytest.mark.asyncio
async def test_wizard_summary_defaults_for_optional_sections():
    flow = DummyConfigFlow()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_solar_forecast": False,
        "enable_battery_prediction": False,
        "enable_pricing": False,
        "enable_boiler": False,
        "enable_auto": False,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "create_entry"
    options = result["options"]
    assert options["solar_forecast_mode"] == "daily_optimized"
    assert options["min_capacity_percent"] == 20.0
    assert options["target_capacity_percent"] == 80.0
    assert options["home_charge_rate"] == 2.8
    assert options["max_ups_price_czk"] == 10.0
    assert options["disable_planning_min_guard"] is False
    assert options["enable_boiler"] is False
    assert options["enable_auto"] is False


@pytest.mark.asyncio
async def test_wizard_summary_defaults_for_solar_and_battery():
    flow = DummyConfigFlow()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_solar_forecast": True,
        "enable_battery_prediction": True,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "create_entry"
    options = result["options"]
    assert options["solar_forecast_mode"] == "daily_optimized"
    assert options["solar_forecast_api_key"] == ""
    assert options["solar_forecast_latitude"] == 50.0
    assert options["solar_forecast_longitude"] == 14.0
    assert options["solar_forecast_string1_enabled"] is True
    assert options["solar_forecast_string1_kwp"] == 5.0
    assert options["solar_forecast_string2_enabled"] is False
    assert options["min_capacity_percent"] == 20.0
    assert options["target_capacity_percent"] == 80.0
    assert options["home_charge_rate"] == 2.8
    assert options["max_ups_price_czk"] == 10.0
    assert options["balancing_enabled"] is True
    assert options["balancing_interval_days"] == 7
    assert options["balancing_hold_hours"] == 3
    assert options["balancing_opportunistic_threshold"] == 1.1
    assert options["balancing_economic_threshold"] == 2.5
    assert options["cheap_window_percentile"] == 30


@pytest.mark.asyncio
async def test_wizard_summary_auto_and_balancing_values():
    flow = DummyConfigFlow()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_battery_prediction": True,
        "auto_mode_switch_enabled": True,
        "balancing_enabled": False,
        "balancing_interval_days": 9,
        "balancing_hold_hours": 4,
        "balancing_opportunistic_threshold": 1.5,
        "balancing_economic_threshold": 3.0,
        "cheap_window_percentile": 40,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "create_entry"
    options = result["options"]
    assert options["auto_mode_switch_enabled"] is True
    assert options["balancing_enabled"] is False
    assert options["balancing_interval_days"] == 9
    assert options["balancing_hold_hours"] == 4
    assert options["balancing_opportunistic_threshold"] == 1.5
    assert options["balancing_economic_threshold"] == 3.0
    assert options["cheap_window_percentile"] == 40


@pytest.mark.asyncio
async def test_wizard_summary_solar_string2_disabled_values():
    flow = DummyConfigFlow()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_solar_forecast": True,
        "solar_forecast_string2_enabled": False,
        "solar_forecast_string2_declination": 35,
        "solar_forecast_string2_azimuth": 180,
        "solar_forecast_string2_kwp": 2.0,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "create_entry"
    options = result["options"]
    assert options["solar_forecast_string2_enabled"] is False
    assert options["solar_forecast_string2_declination"] == 35
    assert options["solar_forecast_string2_azimuth"] == 180
    assert options["solar_forecast_string2_kwp"] == 2.0


@pytest.mark.asyncio
async def test_wizard_summary_defaults_for_boiler_fields():
    flow = DummyConfigFlow()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_boiler": True,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "create_entry"
    options = result["options"]
    assert options["boiler_volume_l"] == 120
    assert options["boiler_target_temp_c"] == 60.0
    assert options["boiler_cold_inlet_temp_c"] == 10.0
    assert options["boiler_stratification_mode"] == "simple_avg"
    assert options["boiler_two_zone_split_ratio"] == 0.5
    assert options["boiler_temp_sensor_position"] == "top"
    assert options["boiler_alt_energy_sensor"] == ""
    assert options["boiler_deadline_time"] == "20:00"
    assert options["boiler_planning_horizon_hours"] == 36
    assert options["boiler_plan_slot_minutes"] == 30


@pytest.mark.asyncio
async def test_wizard_summary_back_button():
    flow = DummyConfigFlow()
    flow._step_history = ["wizard_summary"]
    result = await flow.async_step_wizard_summary({"go_back": True})
    assert result["type"] == "form"


@pytest.mark.asyncio
async def test_wizard_summary_form():
    flow = DummyConfigFlow()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
    }
    result = await flow.async_step_wizard_summary()
    assert result["type"] == "form"
    assert "summary" in result["description_placeholders"]


def test_async_get_options_flow_handler():
    flow = DummyConfigFlow()
    handler = flow.async_get_options_flow(SimpleNamespace(options={}, data={}))
    assert handler is not None
