from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.config.steps import OigCloudOptionsFlowHandler
from custom_components.oig_cloud.config_registry import fields_for_section
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
        # No OIG Local proxy entities present -> _proxy_ready() returns False,
        # matching the DummyWizard convention in tests/test_config_steps_more4.py.
        self.states = SimpleNamespace(get=lambda _eid: None)


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
    # Options flow now opens a section menu instead of re-running the wizard
    assert result["type"] == "menu"
    assert result["step_id"] == "init"
    assert "section_modules" in result["menu_options"]
    assert "section_all" in result["menu_options"]


@pytest.mark.asyncio
async def test_options_flow_summary_updates_entry():
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True, "standard_scan_interval": 30},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._wizard_data["standard_scan_interval"] = 45

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    assert flow.hass.config_entries.updated
    options = flow.hass.config_entries.updated[0][1]
    assert options["standard_scan_interval"] == 45
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
        options={"enable_statistics": True, "standard_scan_interval": 30},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._wizard_data["standard_scan_interval"] = 45

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
        "solar_forecast_provider": "solcast",
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
    assert options["solar_forecast_provider"] == "solcast"
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
        "boiler_volume_l": 150,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    options = flow.hass.config_entries.updated[0][1]
    assert options["enable_boiler"] is True
    assert options["boiler_volume_l"] == 150


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
        "solar_forecast_provider": "solcast",
        "solar_forecast_mode": "hourly",
        "min_capacity_percent": 25.0,
        "target_capacity_percent": 75.0,
        "home_charge_rate": 3.5,
        "balancing_interval_days": 9,
        "balancing_hold_hours": 4,
    }

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    options = flow.hass.config_entries.updated[0][1]
    assert options["solar_forecast_provider"] == "solcast"
    assert options["solar_forecast_mode"] == "hourly"
    assert options["min_capacity_percent"] == 25.0
    assert options["target_capacity_percent"] == 75.0
    assert options["home_charge_rate"] == 3.5
    assert options["charge_rate_kw"] == 3.5
    assert options["balancing_interval_days"] == 9
    assert options["balancing_hold_hours"] == 4


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


@pytest.mark.asyncio
async def test_options_flow_section_jumps_to_summary():
    """In section mode the flow ends at the summary instead of walking on."""
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={
            "enable_battery_prediction": True,
            "enable_pricing": True,
            "enable_boiler": False,
        },
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    flow._section = "battery"
    assert flow._get_next_step("wizard_battery") == "wizard_summary"

    flow._section = "pricing"
    assert flow._get_next_step("wizard_pricing_distribution") == "wizard_summary"
    # inside the pricing section the chain still walks normally
    assert flow._get_next_step("wizard_pricing_import") == "wizard_pricing_export"

    flow._section = None
    # without a section, battery continues into pricing as before
    assert flow._get_next_step("wizard_battery") == "wizard_pricing_import"


@pytest.mark.asyncio
async def test_options_flow_save_preserves_dashboard_only_keys():
    """K2f: options-flow save must merge, not replace, so dashboard-only keys survive."""
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={
            "home_charge_rate": 2.8,
            "boiler_thermal_arbitrage_enabled": True,
            "box_id": "X",
            "startup_grace_seconds": 15,
        },
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._wizard_data = {"home_charge_rate": 3.3}

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    options = flow.hass.config_entries.updated[0][1]
    assert options["home_charge_rate"] == 3.3
    assert options["boiler_thermal_arbitrage_enabled"] is True
    assert options["box_id"] == "X"
    assert options["startup_grace_seconds"] == 15


@pytest.mark.asyncio
async def test_options_flow_save_preserves_concurrent_rest_change():
    """Regression: an open options flow must not overwrite a later REST write.

    Flow opens with charge_rate_kw/home_charge_rate = 2.8. While the form is
    open the dashboard REST endpoint updates the same keys to 5.0. Saving an
    unrelated section through the options flow must leave the 5.0 values intact.
    """
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={
            "charge_rate_kw": 2.8,
            "home_charge_rate": 2.8,
            "enable_battery_prediction": True,
        },
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    # Simulate concurrent dashboard REST write after the flow opened.
    entry.options["charge_rate_kw"] = 5.0
    entry.options["home_charge_rate"] = 5.0

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    # Empty delta means merge_entry_options did not overwrite the REST values.
    assert not flow.hass.config_entries.updated
    assert entry.options["charge_rate_kw"] == 5.0
    assert entry.options["home_charge_rate"] == 5.0


@pytest.mark.asyncio
async def test_options_flow_save_preserves_concurrent_rest_change_legacy_mirror_only():
    """Regression: only the legacy mirror present at open must not lose REST value.

    Flow opens with home_charge_rate=2.8 and no charge_rate_kw. While the form
    is open the dashboard REST endpoint updates both aliases to 5.0. Saving an
    unrelated section must leave the 5.0 values intact.
    """
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"home_charge_rate": 2.8, "enable_battery_prediction": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    # Simulate concurrent dashboard REST write after the flow opened.
    entry.options["charge_rate_kw"] = 5.0
    entry.options["home_charge_rate"] = 5.0

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    # Empty delta => merge_entry_options did not overwrite the REST values.
    assert not flow.hass.config_entries.updated
    assert entry.options["charge_rate_kw"] == 5.0
    assert entry.options["home_charge_rate"] == 5.0


@pytest.mark.asyncio
async def test_options_flow_save_preserves_rest_value_for_absent_field():
    """Regression: a field absent at open must not be overwritten by defaults.

    standard_scan_interval is missing when the flow opens. A REST write sets it
    to 60 while the form is open. Saving an unrelated section must leave 60 in
    place.
    """
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    # Simulate concurrent REST write of a previously absent field.
    entry.options["standard_scan_interval"] = 60

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    assert not flow.hass.config_entries.updated
    assert entry.options["standard_scan_interval"] == 60


@pytest.mark.asyncio
async def test_options_flow_save_preserves_concurrent_rest_change_normalized_field():
    """Regression: serializer normalization of an untouched field is not a user edit.

    REST accepts expensive_percentile=0.705, but _build_battery_options rounds it
    to 0.7. The flow opens on 0.705; a REST write then sets 0.8. Saving without
    touching the wizard must not treat the 0.7 rounding as an edit and must leave
    the later 0.8 in place.
    """
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"expensive_percentile": 0.705, "enable_battery_prediction": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    # Simulate concurrent dashboard REST write after the flow opened.
    entry.options["expensive_percentile"] = 0.8

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    # Empty delta => the 0.705 -> 0.7 normalization never reached the merge.
    assert not flow.hass.config_entries.updated
    assert entry.options["expensive_percentile"] == 0.8


@pytest.mark.asyncio
async def test_options_flow_save_preserves_concurrent_rest_change_conflicting_aliases():
    """Regression: aliases disagreeing at open must not restore the stale value.

    The flow opens with charge_rate_kw=2.8 but a stale home_charge_rate=5.0. The
    canonical registered key is authoritative, so the logical baseline is 2.8. A
    REST update then sets both aliases to 7.0. An unrelated save must leave BOTH
    keys at 7.0 rather than restoring either opening value.
    """
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={
            "charge_rate_kw": 2.8,
            "home_charge_rate": 5.0,
            "enable_battery_prediction": True,
        },
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    # Simulate the canonical REST update, which writes both aliases.
    entry.options["charge_rate_kw"] = 7.0
    entry.options["home_charge_rate"] = 7.0

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    assert not flow.hass.config_entries.updated
    assert entry.options["charge_rate_kw"] == 7.0
    assert entry.options["home_charge_rate"] == 7.0


@pytest.mark.asyncio
async def test_options_flow_save_emits_only_canonical_mirror_key(monkeypatch):
    """A real charge-rate edit emits only charge_rate_kw; merge mirrors the alias.

    The legacy alias must never travel through the delta on its own, and saving
    self-heals a pair that disagreed at open.
    """
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={
            "charge_rate_kw": 2.8,
            "home_charge_rate": 5.0,
            "enable_battery_prediction": True,
        },
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    # Spy on the delta handed to merge_entry_options, without disabling the write.
    from custom_components.oig_cloud import config_merge

    deltas = []
    real_merge = config_merge.merge_entry_options

    def _spy(hass, entry_, updates, suppress_reload=False):
        deltas.append(dict(updates))
        return real_merge(hass, entry_, updates, suppress_reload=suppress_reload)

    monkeypatch.setattr(
        "custom_components.oig_cloud.config.steps.merge_entry_options", _spy
    )

    # The user edits the charge rate in the wizard.
    flow._wizard_data["charge_rate_kw"] = 4.0

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert deltas, "expected a merge write for a genuine user edit"
    delta = deltas[0]
    assert delta["charge_rate_kw"] == 4.0
    # The legacy alias is mirrored by merge_entry_options, never sent independently.
    assert "home_charge_rate" not in delta

    options = flow.hass.config_entries.updated[0][1]
    # merge_entry_options mirrored the canonical key onto the legacy alias,
    # self-healing the pair that disagreed at open.
    assert options["charge_rate_kw"] == 4.0
    assert options["home_charge_rate"] == 4.0


@pytest.mark.asyncio
async def test_options_flow_save_still_writes_genuine_user_change():
    """A value the user actually edited in the form must still be saved."""
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"standard_scan_interval": 30},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._wizard_data["standard_scan_interval"] = 45

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    assert flow.hass.config_entries.updated
    options = flow.hass.config_entries.updated[0][1]
    assert options["standard_scan_interval"] == 45


@pytest.mark.asyncio
async def test_options_flow_save_aborts_when_opening_snapshot_unreadable():
    """If the opening options snapshot cannot be read, save must not degrade."""

    class UnreadableEntry:
        entry_id = "entry1"
        data = {CONF_USERNAME: "demo"}

        @property
        def options(self):
            raise RuntimeError("storage unreachable")

    flow = DummyOptionsFlow(UnreadableEntry())
    flow.hass = DummyHass()

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "form"
    assert result["step_id"] == "wizard_summary"
    assert result["errors"]["base"] == "options_read_failed"
    assert not flow.hass.config_entries.updated


@pytest.mark.asyncio
async def test_options_flow_save_non_boiler_does_not_set_needs_reload():
    """Saving an unrelated section must not flag _needs_reload or double reload."""
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
    assert not flow.hass.config_entries.updated
    assert "_needs_reload" not in entry.options
    assert flow.hass.config_entries.reloaded == ["entry1"]


@pytest.mark.asyncio
async def test_options_flow_save_boiler_empty_delta_does_not_enqueue_config_update(monkeypatch):
    """Empty boiler save must not enqueue CONFIG_UPDATE and must keep REST value."""
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={
            "enable_boiler": True,
            "boiler_box_id": "123",
            "boiler_target_temp_c": 60.0,
        },
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    # Simulate concurrent REST/dashboard write that changes boiler_target_temp_c.
    entry.options["boiler_target_temp_c"] = 70.0

    enqueued = []

    class FakeSerializer:
        async def enqueue(self, cmd):
            enqueued.append(cmd)

    class FakeRuntime:
        def __init__(self):
            self._serializer = FakeSerializer()

    def _fake_get_runtime(hass, entry_id, box_id):
        if entry_id == "entry1" and box_id == "123":
            return FakeRuntime()
        return None

    monkeypatch.setattr(
        "custom_components.oig_cloud.boiler.runtime.get_boiler_runtime",
        _fake_get_runtime,
    )

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    assert not flow.hass.config_entries.updated
    assert not enqueued
    assert entry.options["boiler_target_temp_c"] == 70.0


@pytest.mark.asyncio
async def test_options_flow_save_boiler_enqueue_uses_post_merge_options(monkeypatch):
    """Real boiler edit should enqueue a CONFIG_UPDATE payload with merged live options."""
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={
            "enable_boiler": True,
            "boiler_box_id": "123",
            "boiler_target_temp_c": 60.0,
            "boiler_volume_l": 150,
        },
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    # Simulate concurrent REST/dashboard write in an untouched field.
    entry.options["boiler_target_temp_c"] = 70.0
    flow._wizard_data["boiler_volume_l"] = 180

    enqueued = []

    class FakeSerializer:
        async def enqueue(self, cmd):
            enqueued.append(cmd)

    class FakeRuntime:
        def __init__(self):
            self._serializer = FakeSerializer()

    def _fake_get_runtime(hass, entry_id, box_id):
        if entry_id == "entry1" and box_id == "123":
            return FakeRuntime()
        return None

    monkeypatch.setattr(
        "custom_components.oig_cloud.boiler.runtime.get_boiler_runtime",
        _fake_get_runtime,
    )

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    assert len(enqueued) == 1
    payload = enqueued[0].payload["new_options"]
    assert payload["boiler_target_temp_c"] == 70.0
    assert payload["boiler_volume_l"] == 180


@pytest.mark.asyncio
async def test_options_flow_save_boiler_enqueue_still_works(monkeypatch):
    """The boiler CONFIG_UPDATE enqueue block below the write must still see new_options."""
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"enable_statistics": True},
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._wizard_data = {
        "enable_boiler": True,
        "boiler_box_id": "123",
    }

    enqueued = []

    class FakeSerializer:
        async def enqueue(self, cmd):
            enqueued.append(cmd)

    class FakeRuntime:
        def __init__(self):
            self._serializer = FakeSerializer()

    def _fake_get_runtime(hass, entry_id, box_id):
        if entry_id == "entry1" and box_id == "123":
            return FakeRuntime()
        return None

    monkeypatch.setattr(
        "custom_components.oig_cloud.boiler.runtime.get_boiler_runtime",
        _fake_get_runtime,
    )

    result = await flow.async_step_wizard_summary({})

    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    assert len(enqueued) == 1


# --- Plan 2 Task 3: intervals step derives defaults/bounds from the registry ---
# Schema-marker convention note: voluptuous Optional markers expose the field
# name via ``marker.schema`` (not ``.key``, which is None) and wrap the default
# in a callable, so ``.default()`` is called. This matches the reader convention
# used across tests/ (e.g. test_config_steps_more4.py, test_mqtt_config.py).


@pytest.mark.asyncio
async def test_intervals_step_uses_registry_defaults():
    """Wizard interval defaults must come from FIELD_REGISTRY, not hard-coded literals."""
    entry = SimpleNamespace(
        entry_id="entry1", data={CONF_USERNAME: "demo"}, options={}
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._section = "intervals"
    flow._step_history = ["init"]

    result = await flow.async_step_wizard_intervals()
    schema = result["data_schema"].schema
    keys = {marker.schema: marker for marker in schema}

    basic = fields_for_section("basic")
    assert keys["standard_scan_interval"].default() == basic["standard_scan_interval"].default
    assert keys["extended_scan_interval"].default() == basic["extended_scan_interval"].default
    assert keys["local_proxy_stale_minutes"].default() == basic["local_proxy_stale_minutes"].default
    assert keys["local_event_debounce_ms"].default() == basic["local_event_debounce_ms"].default


@pytest.mark.asyncio
async def test_intervals_validation_uses_registry_bounds():
    """Out-of-registry-bounds values must still be rejected after de-hardcoding."""
    entry = SimpleNamespace(
        entry_id="entry1", data={CONF_USERNAME: "demo"}, options={}
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._section = "intervals"
    flow._step_history = ["init"]
    flow._wizard_data["data_source_mode"] = "cloud_only"

    result = await flow.async_step_wizard_intervals({
        "standard_scan_interval": 5,      # below registry min 30
        "extended_scan_interval": 200,    # below registry min 300
        "local_proxy_stale_minutes": 0,   # below registry min 1
        "local_event_debounce_ms": 6000,  # above registry max 5000
        "data_source_mode": "cloud_only",
        "go_back": False,
    })
    assert result["errors"]["standard_scan_interval"] == "interval_too_short"
    assert result["errors"]["extended_scan_interval"] == "extended_interval_too_short"
    assert result["errors"]["local_proxy_stale_minutes"] == "interval_too_short"
    assert result["errors"]["local_event_debounce_ms"] == "interval_too_long"


@pytest.mark.asyncio
async def test_intervals_error_path_repopulates_user_values():
    """REGRESSION (key-dialect trap): after a validation error the form must re-render the
    user's typed values, NOT registry defaults. Guards the alias/field-name bridge."""
    entry = SimpleNamespace(
        entry_id="entry1", data={CONF_USERNAME: "demo"}, options={}
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._section = "intervals"
    flow._step_history = ["init"]
    flow._wizard_data["data_source_mode"] = "cloud_only"

    # extended_scan_interval is invalid; the other three are valid and must survive.
    result = await flow.async_step_wizard_intervals({
        "standard_scan_interval": 120,
        "extended_scan_interval": 200,    # below registry min 300 -> error
        "local_proxy_stale_minutes": 45,
        "local_event_debounce_ms": 900,
        "data_source_mode": "local_only",
        "go_back": False,
    })

    assert result["errors"]["extended_scan_interval"] == "extended_interval_too_short"
    keys = {marker.schema: marker for marker in result["data_schema"].schema}
    assert keys["standard_scan_interval"].default() == 120
    assert keys["local_proxy_stale_minutes"].default() == 45
    assert keys["local_event_debounce_ms"].default() == 900
    assert keys["data_source_mode"].default() == "local_only"
    # the rejected value is echoed back so the user can correct it, not silently reset
    assert keys["extended_scan_interval"].default() == 200
