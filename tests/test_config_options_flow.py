from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.config.steps import OigCloudOptionsFlowHandler
from custom_components.oig_cloud.const import CONF_USERNAME


class DummyConfigEntries:
    def __init__(self):
        self.updated = []
        self.reloaded = []

    def async_update_entry(self, entry, options=None):
        self.updated.append((entry, options))

    async def async_reload(self, entry_id):
        self.reloaded.append(entry_id)


class DummyHass:
    def __init__(self):
        self.config_entries = DummyConfigEntries()


class DummyOptionsFlow(OigCloudOptionsFlowHandler):
    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    def async_abort(self, **kwargs):
        return {"type": "abort", **kwargs}

    async def async_step_wizard_modules(self, user_input=None):
        return {"type": "modules"}


@pytest.mark.asyncio
async def test_options_flow_welcome_reconfigure():
    entry = SimpleNamespace(entry_id="entry1", data={CONF_USERNAME: "demo"}, options={})
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    result = await flow.async_step_wizard_welcome_reconfigure()
    assert result["type"] == "form"

    result = await flow.async_step_wizard_welcome_reconfigure({})
    assert result["type"] == "modules"


@pytest.mark.asyncio
async def test_options_flow_init_redirect():
    entry = SimpleNamespace(entry_id="entry1", data={CONF_USERNAME: "demo"}, options={})
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    result = await flow.async_step_init()
    assert result["type"] == "form"
    assert result["step_id"] == "wizard_welcome_reconfigure"


@pytest.mark.asyncio
async def test_options_flow_summary_updates_entry():
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    assert flow.hass.config_entries.updated
    assert flow.hass.config_entries.reloaded == ["entry1"]


@pytest.mark.asyncio
async def test_options_flow_summary_back_button():
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._step_history = ["wizard_modules", "wizard_summary"]

    result = await flow.async_step_wizard_summary({"go_back": True})
    assert result["type"] == "modules"


@pytest.mark.asyncio
async def test_options_flow_summary_form():
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._wizard_data = {
        "enable_statistics": True,
        "enable_solar_forecast": False,
        "enable_battery_prediction": False,
        "enable_pricing": False,
        "enable_extended_sensors": False,
        "enable_dashboard": False,
        "standard_scan_interval": 30,
        "extended_scan_interval": 300,
    }

    result = await flow.async_step_wizard_summary()

    assert result["type"] == "form"
    assert "summary" in result["description_placeholders"]


@pytest.mark.asyncio
async def test_options_flow_summary_exception(monkeypatch):
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    def _raise(*_a, **_k):
        raise RuntimeError("boom")

    monkeypatch.setattr(flow.hass.config_entries, "async_update_entry", _raise)

    with pytest.raises(RuntimeError):
        await flow.async_step_wizard_summary({})


@pytest.mark.asyncio
async def test_options_flow_summary_flags():
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._wizard_data = {
        "enable_statistics": True,
        "enable_solar_forecast": True,
        "enable_battery_prediction": True,
        "enable_pricing": True,
        "enable_extended_sensors": True,
        "enable_dashboard": True,
        "standard_scan_interval": 30,
        "extended_scan_interval": 300,
    }

    result = await flow.async_step_wizard_summary()
    summary = result["description_placeholders"]["summary"]
    assert "Statistiky a analýzy" in summary
    assert "Solární předpověď" in summary
    assert "Predikce baterie" in summary
    assert "Cenové senzory" in summary
    assert "Rozšířené senzory" in summary
    assert "Webový dashboard" in summary


@pytest.mark.asyncio
async def test_options_flow_summary_maps_selected_fields():
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._wizard_data = {
        "enable_statistics": True,
        "enable_solar_forecast": True,
        "enable_battery_prediction": True,
        "enable_pricing": True,
        "enable_extended_sensors": True,
        "enable_dashboard": True,
        "data_source_mode": "hybrid",
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_mode": "hourly",
        "solar_forecast_string2_enabled": True,
        "min_capacity_percent": 25.0,
        "target_capacity_percent": 75.0,
        "max_ups_price_czk": 9.5,
        "disable_planning_min_guard": True,
        "import_pricing_scenario": "spot_fixed",
        "spot_fixed_fee_kwh": 0.55,
        "export_pricing_scenario": "fix_price",
        "export_fixed_price_kwh": 2.6,
        "tariff_count": "single",
        "distribution_fee_vt_kwh": 1.1,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    options = flow.hass.config_entries.updated[0][1]
    assert options["data_source_mode"] == "local_only"
    assert options["solar_forecast_provider"] == "forecast_solar"
    assert options["solar_forecast_mode"] == "hourly"
    assert options["solar_forecast_string2_enabled"] is True
    assert options["min_capacity_percent"] == 25.0
    assert options["target_capacity_percent"] == 75.0
    assert options["max_ups_price_czk"] == 9.5
    assert options["disable_planning_min_guard"] is True
    assert options["spot_pricing_model"] == "fixed"
    assert options["spot_fixed_fee_mwh"] == 550.0
    assert options["export_pricing_model"] == "fixed_prices"
    assert options["export_fixed_price"] == 2.6


@pytest.mark.asyncio
async def test_options_flow_summary_boiler_defaults():
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._wizard_data = {
        "enable_boiler": True,
        "boiler_volume_l": 120,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    options = flow.hass.config_entries.updated[0][1]
    assert options["boiler_volume_l"] == 120
    assert options["boiler_target_temp_c"] == 60.0
    assert options["boiler_temp_sensor_position"] == "top"
    assert options["boiler_alt_energy_sensor"] == ""
    assert options["boiler_deadline_time"] == "20:00"


@pytest.mark.asyncio
async def test_options_flow_summary_solar_battery_defaults():
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._wizard_data = {
        "enable_solar_forecast": True,
        "enable_battery_prediction": True,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    options = flow.hass.config_entries.updated[0][1]
    assert options["solar_forecast_provider"] == "forecast_solar"
    assert options["solar_forecast_mode"] == "daily_optimized"
    assert options["solar_forecast_api_key"] == ""
    assert options["solcast_api_key"] == ""
    assert options["solar_forecast_string1_enabled"] is True
    assert options["solar_forecast_string2_enabled"] is False
    assert options["min_capacity_percent"] == 20.0
    assert options["target_capacity_percent"] == 80.0
    assert options["home_charge_rate"] == 2.8
    assert options["max_ups_price_czk"] == 10.0
    assert options["balancing_enabled"] is True
    assert options["balancing_interval_days"] == 7
    assert options["balancing_hold_hours"] == 3


@pytest.mark.asyncio
async def test_options_flow_summary_auto_balancing_solar_string2():
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._wizard_data = {
        "enable_battery_prediction": True,
        "auto_mode_switch_enabled": True,
        "balancing_enabled": False,
        "balancing_interval_days": 9,
        "balancing_hold_hours": 4,
        "balancing_opportunistic_threshold": 1.5,
        "balancing_economic_threshold": 3.0,
        "cheap_window_percentile": 40,
        "enable_solar_forecast": True,
        "solar_forecast_string2_enabled": True,
        "solar_forecast_string2_declination": 40,
        "solar_forecast_string2_azimuth": 190,
        "solar_forecast_string2_kwp": 2.4,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    options = flow.hass.config_entries.updated[0][1]
    assert options["auto_mode_switch_enabled"] is True
    assert options["balancing_enabled"] is False
    assert options["balancing_interval_days"] == 9
    assert options["balancing_hold_hours"] == 4
    assert options["balancing_opportunistic_threshold"] == 1.5
    assert options["balancing_economic_threshold"] == 3.0
    assert options["cheap_window_percentile"] == 40
    assert options["solar_forecast_string2_enabled"] is True
    assert options["solar_forecast_string2_declination"] == 40
    assert options["solar_forecast_string2_azimuth"] == 190
    assert options["solar_forecast_string2_kwp"] == 2.4
