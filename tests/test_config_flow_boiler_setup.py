"""Task 8: Boiler setup flow — simple + expert modes."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.config.steps import WizardMixin


class DummyWizard(WizardMixin):
    def __init__(self):
        super().__init__()
        self.hass = SimpleNamespace(
            config=SimpleNamespace(latitude=50.0, longitude=14.0),
            states=SimpleNamespace(get=lambda _eid: None),
        )

    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    def async_create_entry(self, **kwargs):
        return {"type": "create_entry", **kwargs}

    def async_abort(self, **kwargs):
        return {"type": "abort", **kwargs}

    async def async_step_wizard_summary(self, user_input=None):
        if user_input is not None and user_input.get("go_back"):
            return self.async_show_form(step_id="wizard_summary")
        return self.async_create_entry(
            title="OIG Cloud",
            data={"username": self._wizard_data.get("username", "")},
            options=self._build_options_payload(self._wizard_data),
        )


def _schema_keys(schema) -> set[str]:
    return {getattr(key, "schema", key) for key in schema.schema}


@pytest.mark.asyncio
async def test_boiler_simple_1_box_id_and_volume():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_1(
        {"boiler_box_id": "2206237017", "boiler_volume_l": 150}
    )

    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler_simple_2"
    assert flow._wizard_data["boiler_box_id"] == "2206237017"
    assert flow._wizard_data["boiler_volume_l"] == 150
    assert flow._wizard_data.get("boiler_setup_mode") == "simple"


@pytest.mark.asyncio
async def test_boiler_simple_2_top_thermometer_and_optional_second():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_2(
        {
            "boiler_temp_sensor_top": "sensor.boiler_top",
            "boiler_enable_second_thermometer": True,
            "boiler_temp_sensor_bottom": "sensor.boiler_bottom",
        }
    )

    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler_simple_3"
    assert flow._wizard_data["boiler_temp_sensor_top"] == "sensor.boiler_top"
    assert flow._wizard_data["boiler_enable_second_thermometer"] is True
    assert flow._wizard_data["boiler_temp_sensor_bottom"] == "sensor.boiler_bottom"


@pytest.mark.asyncio
async def test_boiler_simple_2_without_second_thermometer():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_2(
        {
            "boiler_temp_sensor_top": "sensor.boiler_top",
            "boiler_enable_second_thermometer": False,
        }
    )

    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler_simple_3"
    assert flow._wizard_data.get("boiler_temp_sensor_bottom") == ""


@pytest.mark.asyncio
async def test_boiler_simple_2_dynamic_reveal_bottom_thermometer():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_2(
        {
            "boiler_temp_sensor_top": "sensor.boiler_top",
            "boiler_enable_second_thermometer": True,
        }
    )

    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler_simple_2"
    assert result["errors"]["boiler_temp_sensor_bottom"] == "required"

    result = await flow.async_step_wizard_boiler_simple_2(
        {
            "boiler_temp_sensor_top": "sensor.boiler_top",
            "boiler_enable_second_thermometer": True,
            "boiler_temp_sensor_bottom": "sensor.boiler_bottom",
        }
    )

    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler_simple_3"
    assert flow._wizard_data["boiler_temp_sensor_bottom"] == "sensor.boiler_bottom"


@pytest.mark.asyncio
async def test_boiler_simple_3_primary_heating_and_effective_power():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_3(
        {
            "boiler_heater_switch_entity": "switch.boiler_heater",
            "boiler_heating_capacity_mode": "effective_power_w",
            "boiler_effective_power_w": 2000,
            "boiler_circulation_pump_switch_entity": "switch.boiler_pump",
        }
    )

    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler_simple_4"
    assert flow._wizard_data["boiler_heater_switch_entity"] == "switch.boiler_heater"
    assert flow._wizard_data["boiler_effective_power_w"] == 2000


@pytest.mark.asyncio
async def test_boiler_simple_3_recovery_rate_validation():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_3(
        {
            "boiler_heater_switch_entity": "switch.boiler_heater",
            "boiler_heating_capacity_mode": "recovery_rate_c_per_hour",
            "boiler_recovery_rate_c_per_hour": 35.0,
        }
    )

    assert result["type"] == "form"
    assert "boiler_recovery_rate_c_per_hour" in result.get("errors", {})


@pytest.mark.asyncio
async def test_boiler_simple_4_alternative_source_disabled():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_4(
        {"boiler_alt_source_mode": "disabled"}
    )

    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler_simple_5"
    assert flow._wizard_data["boiler_alt_source_mode"] == "disabled"


@pytest.mark.asyncio
async def test_boiler_simple_4_alternative_source_controllable_requires_entity():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_4(
        {
            "boiler_alt_source_mode": "controllable",
            "boiler_alt_cost_kwh": 2.5,
            "boiler_alt_heater_switch_entity": "",
        }
    )

    assert result["type"] == "form"
    assert result["errors"]["boiler_alt_heater_switch_entity"] == "required"


@pytest.mark.asyncio
async def test_boiler_simple_4_alternative_source_benchmark_only():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_4(
        {
            "boiler_alt_source_mode": "benchmark_only",
            "boiler_alt_cost_kwh": 1.5,
        }
    )

    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler_simple_5"


@pytest.mark.asyncio
async def test_boiler_simple_5_comfort_profile():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_5(
        {
            "boiler_comfort_profile_mode": "history_driven",
            "boiler_target_temp_c": 55.0,
            "boiler_deadline_time": "19:00",
        }
    )

    assert result["type"] == "create_entry"
    assert flow._wizard_data["boiler_setup_complete"] is True


@pytest.mark.asyncio
async def test_boiler_simple_full_path_creates_entry():
    flow = DummyWizard()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_boiler": True,
    }

    await flow.async_step_wizard_boiler_simple_1(
        {"boiler_box_id": "2206237017", "boiler_volume_l": 150}
    )
    await flow.async_step_wizard_boiler_simple_2(
        {
            "boiler_temp_sensor_top": "sensor.boiler_top",
            "boiler_enable_second_thermometer": False,
        }
    )
    await flow.async_step_wizard_boiler_simple_3(
        {
            "boiler_heater_switch_entity": "switch.boiler_heater",
            "boiler_heating_capacity_mode": "effective_power_w",
            "boiler_effective_power_w": 2000,
        }
    )
    await flow.async_step_wizard_boiler_simple_4(
        {"boiler_alt_source_mode": "disabled"}
    )
    result = await flow.async_step_wizard_boiler_simple_5(
        {
            "boiler_comfort_profile_mode": "history_driven",
            "boiler_target_temp_c": 55.0,
            "boiler_deadline_time": "19:00",
        }
    )

    assert result["type"] == "create_entry"
    options = result["options"]
    assert options["enable_boiler"] is True
    assert options["boiler_setup_complete"] is True
    assert options["boiler_box_id"] == "2206237017"
    assert options["boiler_volume_l"] == 150
    assert options["boiler_effective_power_w"] == 2000
    assert options["boiler_alt_source_mode"] == "disabled"
    assert options["boiler_comfort_profile_mode"] == "history_driven"


@pytest.mark.asyncio
async def test_boiler_expert_path_reaches_old_step():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_1(
        {
            "boiler_box_id": "123",
            "boiler_volume_l": 120,
            "boiler_setup_mode": "expert",
        }
    )

    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler"
    assert flow._wizard_data["boiler_setup_mode"] == "expert"


@pytest.mark.asyncio
async def test_alternative_source_mode_disabled():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    await flow.async_step_wizard_boiler_simple_1(
        {"boiler_box_id": "123", "boiler_volume_l": 120}
    )
    await flow.async_step_wizard_boiler_simple_2(
        {"boiler_temp_sensor_top": "sensor.top", "boiler_enable_second_thermometer": False}
    )
    await flow.async_step_wizard_boiler_simple_3(
        {
            "boiler_heater_switch_entity": "switch.heater",
            "boiler_heating_capacity_mode": "effective_power_w",
            "boiler_effective_power_w": 2000,
        }
    )
    result = await flow.async_step_wizard_boiler_simple_4(
        {"boiler_alt_source_mode": "disabled"}
    )
    assert result["step_id"] == "wizard_boiler_simple_5"


@pytest.mark.asyncio
async def test_alternative_source_mode_benchmark_only():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    await flow.async_step_wizard_boiler_simple_1(
        {"boiler_box_id": "123", "boiler_volume_l": 120}
    )
    await flow.async_step_wizard_boiler_simple_2(
        {"boiler_temp_sensor_top": "sensor.top", "boiler_enable_second_thermometer": False}
    )
    await flow.async_step_wizard_boiler_simple_3(
        {
            "boiler_heater_switch_entity": "switch.heater",
            "boiler_heating_capacity_mode": "effective_power_w",
            "boiler_effective_power_w": 2000,
        }
    )
    result = await flow.async_step_wizard_boiler_simple_4(
        {"boiler_alt_source_mode": "benchmark_only", "boiler_alt_cost_kwh": 2.0}
    )
    assert result["step_id"] == "wizard_boiler_simple_5"
    assert flow._wizard_data["boiler_alt_cost_kwh"] == 2.0


@pytest.mark.asyncio
async def test_alternative_source_mode_controllable_with_entity():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    await flow.async_step_wizard_boiler_simple_1(
        {"boiler_box_id": "123", "boiler_volume_l": 120}
    )
    await flow.async_step_wizard_boiler_simple_2(
        {"boiler_temp_sensor_top": "sensor.top", "boiler_enable_second_thermometer": False}
    )
    await flow.async_step_wizard_boiler_simple_3(
        {
            "boiler_heater_switch_entity": "switch.heater",
            "boiler_heating_capacity_mode": "effective_power_w",
            "boiler_effective_power_w": 2000,
        }
    )
    result = await flow.async_step_wizard_boiler_simple_4(
        {
            "boiler_alt_source_mode": "controllable",
            "boiler_alt_cost_kwh": 2.0,
            "boiler_alt_heater_switch_entity": "switch.alt_heater",
        }
    )
    assert result["step_id"] == "wizard_boiler_simple_5"
    assert flow._wizard_data["boiler_alt_heater_switch_entity"] == "switch.alt_heater"


@pytest.mark.asyncio
async def test_options_flow_reentry_preserves_existing_config():
    from custom_components.oig_cloud.config.steps import OigCloudOptionsFlowHandler

    existing_options = {
        "enable_boiler": True,
        "boiler_setup_complete": True,
        "boiler_box_id": "123",
        "boiler_volume_l": 200,
        "boiler_temp_sensor_top": "sensor.top",
        "boiler_effective_power_w": 3000,
        "boiler_alt_source_mode": "benchmark_only",
    }
    entry = SimpleNamespace(
        entry_id="entry1",
        data={"username": "demo"},
        options=existing_options,
    )

    class _DummyOptions(OigCloudOptionsFlowHandler):
        def async_show_form(self, **kwargs):
            return {"type": "form", **kwargs}

        def async_abort(self, **kwargs):
            return {"type": "abort", **kwargs}

    flow = _DummyOptions(entry)
    assert flow._wizard_data["boiler_volume_l"] == 200
    assert flow._wizard_data["boiler_effective_power_w"] == 3000


@pytest.mark.asyncio
async def test_multi_box_isolation_in_options():
    flow = DummyWizard()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_boiler": True,
        "boiler_box_id": "box_a",
        "boiler_volume_l": 100,
    }

    options = flow._build_options_payload(flow._wizard_data)
    assert options["boiler_box_id"] == "box_a"
    assert options["boiler_volume_l"] == 100

    flow._wizard_data["boiler_box_id"] = "box_b"
    flow._wizard_data["boiler_volume_l"] = 200
    options_b = flow._build_options_payload(flow._wizard_data)
    assert options_b["boiler_box_id"] == "box_b"
    assert options_b["boiler_volume_l"] == 200


@pytest.mark.asyncio
async def test_incomplete_setup_does_not_enable_boiler():
    flow = DummyWizard()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_boiler": True,
        "boiler_module_selected": True,
    }

    options = flow._build_options_payload(flow._wizard_data)
    assert options["enable_boiler"] is False
    assert options.get("boiler_setup_complete") is not True


@pytest.mark.asyncio
async def test_complete_setup_enables_boiler():
    flow = DummyWizard()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_boiler": True,
        "boiler_module_selected": True,
        "boiler_setup_complete": True,
    }

    options = flow._build_options_payload(flow._wizard_data)
    assert options["enable_boiler"] is True
    assert options["boiler_setup_complete"] is True


@pytest.mark.asyncio
async def test_effective_power_w_validation_too_low():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_3(
        {
            "boiler_heater_switch_entity": "switch.heater",
            "boiler_heating_capacity_mode": "effective_power_w",
            "boiler_effective_power_w": 50,
        }
    )
    assert result["type"] == "form"
    assert "boiler_effective_power_w" in result.get("errors", {})


@pytest.mark.asyncio
async def test_effective_power_w_validation_too_high():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_3(
        {
            "boiler_heater_switch_entity": "switch.heater",
            "boiler_heating_capacity_mode": "effective_power_w",
            "boiler_effective_power_w": 15000,
        }
    )
    assert result["type"] == "form"
    assert "boiler_effective_power_w" in result.get("errors", {})


@pytest.mark.asyncio
async def test_recovery_rate_c_per_hour_validation_too_low():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler_simple_3(
        {
            "boiler_heater_switch_entity": "switch.heater",
            "boiler_heating_capacity_mode": "recovery_rate_c_per_hour",
            "boiler_recovery_rate_c_per_hour": 0.05,
        }
    )
    assert result["type"] == "form"
    assert "boiler_recovery_rate_c_per_hour" in result.get("errors", {})


@pytest.mark.asyncio
async def test_options_flow_enqueues_config_update_command(monkeypatch):
    from custom_components.oig_cloud.config.steps import OigCloudOptionsFlowHandler
    from custom_components.oig_cloud.boiler.actuator import (
        ActuatorCommand,
        ActuatorCommandType,
    )

    existing_options = {
        "enable_boiler": True,
        "boiler_setup_complete": True,
        "boiler_box_id": "123",
        "boiler_volume_l": 200,
    }
    entry = SimpleNamespace(
        entry_id="entry1",
        data={"username": "demo"},
        options=existing_options,
    )

    enqueued_commands = []

    class FakeSerializer:
        state = "running"

        async def enqueue(self, cmd: ActuatorCommand) -> bool:
            enqueued_commands.append(cmd)
            return True

    class FakeRuntime:
        def __init__(self):
            self._serializer = FakeSerializer()
            self.entry_id = "entry1"
            self.box_id = "123"

    def _get_runtime(hass, entry_id, box_id):
        if entry_id == "entry1" and box_id == "123":
            return FakeRuntime()
        return None

    monkeypatch.setattr(
        "custom_components.oig_cloud.boiler.runtime.get_boiler_runtime",
        _get_runtime,
    )

    class _DummyOptions(OigCloudOptionsFlowHandler):
        def async_show_form(self, **kwargs):
            return {"type": "form", **kwargs}

        def async_abort(self, **kwargs):
            return {"type": "abort", **kwargs}

        async def async_step_wizard_modules(self, user_input=None):
            return await self.async_step_wizard_summary({})

    flow = _DummyOptions(entry)

    async def _async_reload(_eid):
        return None

    flow.hass = SimpleNamespace(
        config_entries=SimpleNamespace(
            async_update_entry=lambda _e, options=None: None,
            async_reload=_async_reload,
        )
    )
    flow._wizard_data = dict(existing_options)

    result = await flow.async_step_wizard_summary({})
    assert result["type"] == "abort"

    assert len(enqueued_commands) == 1
    cmd = enqueued_commands[0]
    assert cmd.command_type == ActuatorCommandType.CONFIG_UPDATE
    assert cmd.entry_id == "entry1"
    assert cmd.box_id == "123"


@pytest.mark.asyncio
async def test_legacy_boiler_step_still_works():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True}

    result = await flow.async_step_wizard_boiler(
        {
            "boiler_volume_l": 120,
            "boiler_temp_sensor_top": "sensor.top",
            "boiler_heater_switch_entity": "switch.heater",
            "boiler_stratification_mode": "simple_avg",
        }
    )

    assert result["type"] == "create_entry"


@pytest.mark.asyncio
async def test_boiler_expert_schema_hides_slot_size_tuning():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True, "boiler_setup_mode": "expert"}

    result = await flow.async_step_wizard_boiler()

    assert result["type"] == "form"
    keys = _schema_keys(result["data_schema"])
    assert "boiler_plan_slot_minutes" not in keys
    assert "boiler_planning_horizon_hours" in keys


@pytest.mark.asyncio
async def test_boiler_expert_schema_uses_explicit_alt_source_mode():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True, "boiler_setup_mode": "expert"}

    result = await flow.async_step_wizard_boiler()

    keys = _schema_keys(result["data_schema"])
    assert "boiler_alt_source_mode" in keys
    assert "boiler_has_alternative_heating" not in keys


def test_boiler_options_fix_slot_size_and_clamp_horizon_contract():
    flow = DummyWizard()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_boiler": True,
        "boiler_setup_complete": True,
        "boiler_plan_slot_minutes": 60,
        "boiler_planning_horizon_hours": 72,
    }

    options = flow._build_options_payload(flow._wizard_data)

    assert options["boiler_plan_slot_minutes"] == 15
    assert options["boiler_planning_horizon_hours"] == 48


def test_boiler_options_clamp_horizon_lower_bound():
    flow = DummyWizard()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_boiler": True,
        "boiler_setup_complete": True,
        "boiler_planning_horizon_hours": 6,
    }

    options = flow._build_options_payload(flow._wizard_data)

    assert options["boiler_planning_horizon_hours"] == 12


def test_boiler_options_do_not_guess_alt_source_mode_from_legacy_bool():
    flow = DummyWizard()
    flow._wizard_data = {
        "username": "demo",
        "password": "pass",
        "enable_boiler": True,
        "boiler_setup_complete": True,
        "boiler_has_alternative_heating": True,
        "boiler_alt_heater_switch_entity": "switch.alt_heater",
    }

    options = flow._build_options_payload(flow._wizard_data)

    assert options["boiler_alt_source_mode"] == "disabled"


def test_total_steps_with_boiler_simple_path():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True, "boiler_setup_mode": "simple"}

    total = flow._get_total_steps()
    assert total == 10


def test_step_sequence_with_boiler_simple_path():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True, "boiler_setup_mode": "simple"}

    steps = flow._build_step_sequence(False)
    assert "wizard_boiler_simple_1" in steps
    assert "wizard_boiler_simple_5" in steps
    assert "wizard_boiler" not in steps


def test_step_sequence_with_boiler_expert_path():
    flow = DummyWizard()
    flow._wizard_data = {"enable_boiler": True, "boiler_setup_mode": "expert"}

    steps = flow._build_step_sequence(False)
    assert "wizard_boiler" in steps
    assert "wizard_boiler_simple_1" not in steps
