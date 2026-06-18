"""F5 — Boiler config keys, options-flow steps, REST whitelist, planner wiring.

Covered:
1. New const keys exist with correct values/defaults
2. PlannerInput accepts battery_cycle_cost_czk_kwh
3. Planner uses configured cost for Home 5 arbitrage (_resolve_battery_cycle_cost)
4. _battery_is_cheaper requires explicit cost param (no hidden fallback)
5. Options-flow steps 6/7/8 schema and validation
6. module_config boiler section GET returns new keys (alt_source_type, cycle cost, etc.)
7. module_config boiler section POST accepts/rejects new keys correctly
8. canonical DTO includes alt_source_type
9. _build_boiler_options includes all F5 keys
10. Section boiler last-step map (after step 8 → summary)
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any, Optional
from unittest.mock import MagicMock

import pytest

_ADMIN_USER = SimpleNamespace(is_admin=True)

from custom_components.oig_cloud.const import (
    CONF_BOILER_ALT_SOURCE_TYPE,
    CONF_BOILER_BATTERY_CYCLE_COST,
    DEFAULT_BOILER_ALT_SOURCE_TYPE,
    DEFAULT_BOILER_BATTERY_CYCLE_COST,
    DOMAIN,
    KEY_BOILER_RUNTIMES,
)
from custom_components.oig_cloud.boiler.const import BATTERY_CYCLE_COST_CZK_PER_KWH


# ---------------------------------------------------------------------------
# 1. New const keys
# ---------------------------------------------------------------------------


def test_conf_boiler_alt_source_type_key_and_default():
    assert CONF_BOILER_ALT_SOURCE_TYPE == "boiler_alt_source_type"
    assert DEFAULT_BOILER_ALT_SOURCE_TYPE == "gas"


def test_conf_boiler_battery_cycle_cost_key_and_default():
    assert CONF_BOILER_BATTERY_CYCLE_COST == "boiler_battery_cycle_cost_czk_kwh"
    assert DEFAULT_BOILER_BATTERY_CYCLE_COST == pytest.approx(0.50)
    # Must match the const it replaces
    assert DEFAULT_BOILER_BATTERY_CYCLE_COST == pytest.approx(BATTERY_CYCLE_COST_CZK_PER_KWH)


# ---------------------------------------------------------------------------
# 2. PlannerInput accepts battery_cycle_cost_czk_kwh
# ---------------------------------------------------------------------------


def _make_planner_input(**kwargs) -> Any:
    from custom_components.oig_cloud.boiler.models import BoilerProfile
    from custom_components.oig_cloud.boiler.planner_contract import PlannerInput

    profile = BoilerProfile(
        category="workday_summer",
        hourly_avg={h: 0.0 for h in range(24)},
        confidence={h: 1.0 for h in range(24)},
    )
    defaults: dict[str, Any] = {
        "entry_id": "test_entry",
        "box_id": "testbox",
        "profile": profile,
        "spot_prices": {},
        "overflow_windows": [],
        "deadline_time": "20:00",
    }
    defaults.update(kwargs)
    return PlannerInput(**defaults)


def test_planner_input_accepts_battery_cycle_cost():
    pi = _make_planner_input(battery_cycle_cost_czk_kwh=0.75)
    assert pi.battery_cycle_cost_czk_kwh == pytest.approx(0.75)


def test_planner_input_battery_cycle_cost_defaults_none():
    pi = _make_planner_input()
    assert pi.battery_cycle_cost_czk_kwh is None


# ---------------------------------------------------------------------------
# 3. _resolve_battery_cycle_cost uses configured value
# ---------------------------------------------------------------------------


def test_resolve_battery_cycle_cost_uses_configured():
    from custom_components.oig_cloud.boiler.planner_core import _resolve_battery_cycle_cost

    pi = _make_planner_input(battery_cycle_cost_czk_kwh=0.75)
    assert _resolve_battery_cycle_cost(pi) == pytest.approx(0.75)


def test_resolve_battery_cycle_cost_falls_back_to_const():
    from custom_components.oig_cloud.boiler.planner_core import _resolve_battery_cycle_cost

    pi = _make_planner_input()  # battery_cycle_cost_czk_kwh=None
    assert _resolve_battery_cycle_cost(pi) == pytest.approx(BATTERY_CYCLE_COST_CZK_PER_KWH)


def test_resolve_battery_cycle_cost_zero_is_valid():
    from custom_components.oig_cloud.boiler.planner_core import _resolve_battery_cycle_cost

    pi = _make_planner_input(battery_cycle_cost_czk_kwh=0.0)
    assert _resolve_battery_cycle_cost(pi) == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# 4. _battery_is_cheaper requires explicit cost param (no hidden fallback)
# ---------------------------------------------------------------------------


def test_battery_is_cheaper_with_explicit_cost():
    from custom_components.oig_cloud.boiler.planner_core import _battery_is_cheaper

    # configured cost 0.75, spot 0.80 → True
    assert _battery_is_cheaper(0.80, battery_cost=0.75) is True
    # configured cost 0.90, spot 0.80 → False
    assert _battery_is_cheaper(0.80, battery_cost=0.90) is False
    # using the default constant as explicit arg
    assert _battery_is_cheaper(0.80, battery_cost=0.50) is True
    assert _battery_is_cheaper(0.30, battery_cost=0.50) is False


def test_battery_is_cheaper_none_spot():
    from custom_components.oig_cloud.boiler.planner_core import _battery_is_cheaper

    assert _battery_is_cheaper(None, battery_cost=0.50) is False


# ---------------------------------------------------------------------------
# 5. Options-flow steps 6/7/8
# ---------------------------------------------------------------------------


def _schema_keys(schema) -> set[str]:
    return {getattr(key, "schema", key) for key in schema.schema}


def test_step_6_schema_has_expected_keys():
    from custom_components.oig_cloud.config.boiler_steps import get_boiler_simple_6_schema

    schema = get_boiler_simple_6_schema()
    keys = _schema_keys(schema)
    assert "boiler_has_alternative_heating" in keys
    assert "boiler_alt_source_type" in keys
    assert "boiler_alt_cost_kwh" in keys
    assert "box_has_home56" in keys
    assert "boiler_home5_maneuver_enabled" in keys
    assert "boiler_battery_cycle_cost_czk_kwh" in keys
    assert "go_back" in keys


def test_step_6_validation_rejects_out_of_range():
    from custom_components.oig_cloud.config.boiler_steps import validate_boiler_simple_6

    errors = validate_boiler_simple_6({"boiler_alt_cost_kwh": 25.0})
    assert "boiler_alt_cost_kwh" in errors

    errors = validate_boiler_simple_6({"boiler_battery_cycle_cost_czk_kwh": 10.0})
    assert "boiler_battery_cycle_cost_czk_kwh" in errors


def test_step_6_validation_passes_valid():
    from custom_components.oig_cloud.config.boiler_steps import validate_boiler_simple_6

    errors = validate_boiler_simple_6({
        "boiler_has_alternative_heating": True,
        "boiler_alt_source_type": "heat_pump",
        "boiler_alt_cost_kwh": 1.5,
        "box_has_home56": True,
        "boiler_home5_maneuver_enabled": True,
        "boiler_battery_cycle_cost_czk_kwh": 0.50,
    })
    assert errors == {}


def test_step_7_schema_has_expected_keys():
    from custom_components.oig_cloud.config.boiler_steps import get_boiler_simple_7_schema

    schema = get_boiler_simple_7_schema()
    keys = _schema_keys(schema)
    assert "boiler_circulation_enabled" in keys
    assert "boiler_circulation_lead_minutes" in keys
    assert "boiler_circulation_run_minutes" in keys
    assert "boiler_circulation_max_runs_per_day" in keys
    assert "boiler_circulation_min_gap_minutes" in keys
    assert "boiler_legionella_interval_days" in keys
    assert "boiler_legionella_target_temp_c" in keys


def test_step_7_validation_rejects_invalid():
    from custom_components.oig_cloud.config.boiler_steps import validate_boiler_simple_7

    errors = validate_boiler_simple_7({
        "boiler_circulation_lead_minutes": 200,  # max 120
        "boiler_legionella_interval_days": 31,    # max 30
        "boiler_legionella_target_temp_c": 80.0,  # max 75
    })
    assert "boiler_circulation_lead_minutes" in errors
    assert "boiler_legionella_interval_days" in errors
    assert "boiler_legionella_target_temp_c" in errors


def test_step_7_validation_passes_valid():
    from custom_components.oig_cloud.config.boiler_steps import validate_boiler_simple_7

    errors = validate_boiler_simple_7({
        "boiler_circulation_enabled": True,
        "boiler_circulation_lead_minutes": 15,
        "boiler_circulation_run_minutes": 10,
        "boiler_circulation_max_runs_per_day": 3,
        "boiler_circulation_min_gap_minutes": 120,
        "boiler_legionella_interval_days": 7,
        "boiler_legionella_target_temp_c": 60.0,
    })
    assert errors == {}


def test_step_8_schema_has_expected_keys():
    from custom_components.oig_cloud.config.boiler_steps import get_boiler_simple_8_schema

    schema = get_boiler_simple_8_schema()
    keys = _schema_keys(schema)
    assert "boiler_current_power_entity" in keys
    assert "boiler_alt_energy_sensor" in keys
    assert "boiler_alt_energy_daily" in keys


def test_step_8_validation_always_passes():
    from custom_components.oig_cloud.config.boiler_steps import validate_boiler_simple_8

    errors = validate_boiler_simple_8({})
    assert errors == {}


# ---------------------------------------------------------------------------
# 6 + 7. module_config boiler section GET/POST for new keys
# ---------------------------------------------------------------------------


def _make_hass_with_entry(box_id: str, options: dict) -> tuple[Any, Any]:
    entry_id = f"eid_{box_id}"

    class _DummyEntry:
        pass

    entry = _DummyEntry()
    entry.entry_id = entry_id
    entry.options = dict(options)
    entry.domain = DOMAIN

    class _DummyCoordinator:
        data = {box_id: {}}

    class _DummyConfigEntries:
        def async_entries(self, domain):
            return [entry]

        def async_update_entry(self, e, options):
            e.options = dict(options)

    hass = SimpleNamespace(
        config_entries=_DummyConfigEntries(),
        data={
            DOMAIN: {
                entry_id: {"coordinator": _DummyCoordinator()},
            }
        },
    )
    return hass, entry


@pytest.mark.asyncio
async def test_module_config_boiler_get_returns_new_keys():
    """GET module_config returns all new F5 boiler keys with defaults."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry(
        "f5box",
        {
            "boiler_alt_source_type": "heat_pump",
            "boiler_battery_cycle_cost_czk_kwh": 0.40,
        },
    )
    view = OIGCloudModuleConfigView()

    class _Req:
        app = {"hass": hass}

        def get(self, key, default=None):
            return default

    response = await view.get(_Req(), "f5box")
    assert response.status == 200
    data = json.loads(response.text)
    boiler = data["boiler"]

    assert boiler["boiler_alt_source_type"] == "heat_pump"
    assert boiler["boiler_battery_cycle_cost_czk_kwh"] == pytest.approx(0.40)
    # Bool flags present
    assert "box_has_home56" in boiler
    assert "boiler_home5_maneuver_enabled" in boiler
    assert "boiler_circulation_enabled" in boiler
    assert "boiler_legionella_interval_days" in boiler


@pytest.mark.asyncio
async def test_module_config_boiler_get_defaults_when_missing():
    """GET returns boolean defaults when keys absent from options."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry("f5box2", {})
    view = OIGCloudModuleConfigView()

    class _Req:
        app = {"hass": hass}

        def get(self, key, default=None):
            return default

    response = await view.get(_Req(), "f5box2")
    data = json.loads(response.text)
    boiler = data["boiler"]

    assert boiler["box_has_home56"] is False
    assert boiler["boiler_home5_maneuver_enabled"] is False
    assert boiler["boiler_circulation_enabled"] is False


@pytest.mark.asyncio
async def test_module_config_boiler_post_alt_source_type_valid():
    """POST boiler section accepts valid alt_source_type enum."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry("f5box3", {})
    captured: dict = {}

    def _capture(entry, options):
        captured.update(options)

    hass.config_entries.async_update_entry = _capture
    view = OIGCloudModuleConfigView()

    class _Req:
        app = {"hass": hass}

        def get(self, key, default=None):
            if key == "hass_user":
                return _ADMIN_USER
            return default

        async def json(self):
            return {
                "section": "boiler",
                "values": {
                    "boiler_alt_source_type": "fireplace",
                    "boiler_battery_cycle_cost_czk_kwh": 0.35,
                    "box_has_home56": True,
                    "boiler_home5_maneuver_enabled": True,
                },
            }

    response = await view.post(_Req(), "f5box3")
    assert response.status == 200
    data = json.loads(response.text)
    assert data["updated"] is True
    assert captured["boiler_alt_source_type"] == "fireplace"
    assert captured["boiler_battery_cycle_cost_czk_kwh"] == pytest.approx(0.35)
    assert captured["box_has_home56"] is True
    assert captured["boiler_home5_maneuver_enabled"] is True


@pytest.mark.asyncio
async def test_module_config_boiler_post_alt_source_type_invalid_enum():
    """POST boiler section rejects unknown alt_source_type."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry("f5box4", {})
    view = OIGCloudModuleConfigView()

    class _Req:
        app = {"hass": hass}

        def get(self, key, default=None):
            if key == "hass_user":
                return _ADMIN_USER
            return default

        async def json(self):
            return {
                "section": "boiler",
                "values": {"boiler_alt_source_type": "solar"},
            }

    response = await view.post(_Req(), "f5box4")
    assert response.status == 400
    data = json.loads(response.text)
    assert "boiler_alt_source_type" in data.get("fields", {})


@pytest.mark.asyncio
async def test_module_config_boiler_post_battery_cycle_cost_out_of_range():
    """POST boiler section rejects battery_cycle_cost_czk_kwh > 5."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry("f5box5", {})
    view = OIGCloudModuleConfigView()

    class _Req:
        app = {"hass": hass}

        def get(self, key, default=None):
            if key == "hass_user":
                return _ADMIN_USER
            return default

        async def json(self):
            return {
                "section": "boiler",
                "values": {"boiler_battery_cycle_cost_czk_kwh": 6.0},
            }

    response = await view.post(_Req(), "f5box5")
    assert response.status == 400
    data = json.loads(response.text)
    assert "boiler_battery_cycle_cost_czk_kwh" in data.get("fields", {})


@pytest.mark.asyncio
async def test_module_config_boiler_post_circulation_fields():
    """POST boiler section accepts circulation configuration."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry("f5box6", {})
    captured: dict = {}

    def _capture(entry, options):
        captured.update(options)

    hass.config_entries.async_update_entry = _capture
    view = OIGCloudModuleConfigView()

    class _Req:
        app = {"hass": hass}

        def get(self, key, default=None):
            if key == "hass_user":
                return _ADMIN_USER
            return default

        async def json(self):
            return {
                "section": "boiler",
                "values": {
                    "boiler_circulation_enabled": True,
                    "boiler_circulation_lead_minutes": 20,
                    "boiler_circulation_run_minutes": 15,
                    "boiler_circulation_max_runs_per_day": 5,
                    "boiler_circulation_min_gap_minutes": 90,
                },
            }

    response = await view.post(_Req(), "f5box6")
    assert response.status == 200
    assert captured["boiler_circulation_enabled"] is True
    assert captured["boiler_circulation_lead_minutes"] == 20
    assert captured["boiler_circulation_min_gap_minutes"] == 90


@pytest.mark.asyncio
async def test_module_config_boiler_post_legionella_fields():
    """POST boiler section accepts legionella configuration."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry("f5box7", {})
    captured: dict = {}

    def _capture(entry, options):
        captured.update(options)

    hass.config_entries.async_update_entry = _capture
    view = OIGCloudModuleConfigView()

    class _Req:
        app = {"hass": hass}

        def get(self, key, default=None):
            if key == "hass_user":
                return _ADMIN_USER
            return default

        async def json(self):
            return {
                "section": "boiler",
                "values": {
                    "boiler_legionella_interval_days": 14,
                    "boiler_legionella_target_temp_c": 65.0,
                },
            }

    response = await view.post(_Req(), "f5box7")
    assert response.status == 200
    assert captured["boiler_legionella_interval_days"] == 14
    assert captured["boiler_legionella_target_temp_c"] == pytest.approx(65.0)


@pytest.mark.asyncio
async def test_module_config_boiler_post_legionella_interval_out_of_range():
    """POST boiler section rejects legionella_interval_days > 30."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry("f5box8", {})
    view = OIGCloudModuleConfigView()

    class _Req:
        app = {"hass": hass}

        def get(self, key, default=None):
            if key == "hass_user":
                return _ADMIN_USER
            return default

        async def json(self):
            return {
                "section": "boiler",
                "values": {"boiler_legionella_interval_days": 31},
            }

    response = await view.post(_Req(), "f5box8")
    assert response.status == 400
    data = json.loads(response.text)
    assert "boiler_legionella_interval_days" in data.get("fields", {})


# ---------------------------------------------------------------------------
# 8. canonical DTO includes alt_source_type
# ---------------------------------------------------------------------------


def test_canonical_dto_includes_alt_source_type():
    """_assemble_canonical_dto emits top-level alt_source_type from config."""
    from custom_components.oig_cloud.boiler.api_views import _assemble_canonical_dto

    _config = {
        CONF_BOILER_ALT_SOURCE_TYPE: "heat_pump",
    }

    # Build a minimal but properly shaped hass object for identity validation
    class _DummyEntry:
        entry_id = "eid"
        domain = DOMAIN
        options: dict = {}
        data: dict = {}

    entry = _DummyEntry()

    class _DummyCoord:
        box_id = None  # prevent box_id mismatch check

    coord = _DummyCoord()
    coord.config = _config

    class _DummyRuntime:
        coordinator = coord
        last_plan_result = None
        _serializer = None
        actuator = None
        current_activity = None
        sparklines: dict = {}

        def get_current_plan(self):
            return None

        def get_current_profile(self):
            return None

    runtime = _DummyRuntime()

    class _DummyConfigEntries:
        def async_entries(self, domain):
            return [entry]

    class _DummyStates:
        def get(self, entity_id):
            return None

    hass = SimpleNamespace(
        config_entries=_DummyConfigEntries(),
        data={
            DOMAIN: {
                "eid": {
                    KEY_BOILER_RUNTIMES: {"testbox": runtime},
                }
            }
        },
        states=_DummyStates(),
    )

    result = _assemble_canonical_dto(hass, "eid", "testbox")
    # Should be a dict (not a web.Response)
    assert isinstance(result, dict), f"Expected dict, got {type(result)}: {result}"
    assert result.get("alt_source_type") == "heat_pump"


# ---------------------------------------------------------------------------
# 9. _build_boiler_options includes all F5 keys
# ---------------------------------------------------------------------------


def test_build_boiler_options_includes_f5_keys():
    """_build_boiler_options emits all F5 config keys with their defaults."""
    from custom_components.oig_cloud.config.steps import WizardMixin

    class _W(WizardMixin):
        def __init__(self):
            super().__init__()

        def async_show_form(self, **kwargs):
            return {}

        def async_create_entry(self, **kwargs):
            return {}

        def async_abort(self, **kwargs):
            return {}

    w = _W()
    opts = w._build_boiler_options({})

    assert "boiler_alt_source_type" in opts
    assert opts["boiler_alt_source_type"] == "gas"
    assert "boiler_battery_cycle_cost_czk_kwh" in opts
    assert opts["boiler_battery_cycle_cost_czk_kwh"] == pytest.approx(0.50)
    assert "box_has_home56" in opts
    assert opts["box_has_home56"] is False
    assert "boiler_home5_maneuver_enabled" in opts
    assert opts["boiler_home5_maneuver_enabled"] is False
    assert "boiler_circulation_enabled" in opts
    assert opts["boiler_circulation_enabled"] is False
    assert "boiler_legionella_interval_days" in opts
    assert opts["boiler_legionella_interval_days"] == 0
    assert "boiler_current_power_entity" in opts
    assert opts["boiler_current_power_entity"] == ""
    assert "boiler_alt_energy_daily" in opts
    assert opts["boiler_alt_energy_daily"] is True


def test_build_boiler_options_preserves_configured_values():
    """_build_boiler_options passes through wizard_data values."""
    from custom_components.oig_cloud.config.steps import WizardMixin

    class _W(WizardMixin):
        def __init__(self):
            super().__init__()

        def async_show_form(self, **kwargs):
            return {}

        def async_create_entry(self, **kwargs):
            return {}

        def async_abort(self, **kwargs):
            return {}

    w = _W()
    opts = w._build_boiler_options({
        "boiler_alt_source_type": "fireplace",
        "boiler_battery_cycle_cost_czk_kwh": 0.30,
        "box_has_home56": True,
        "boiler_home5_maneuver_enabled": True,
        "boiler_circulation_enabled": True,
        "boiler_circulation_lead_minutes": 20,
        "boiler_legionella_interval_days": 7,
        "boiler_legionella_target_temp_c": 62.0,
        "boiler_current_power_entity": "sensor.custom_cbb",
        "boiler_alt_energy_daily": False,
    })

    assert opts["boiler_alt_source_type"] == "fireplace"
    assert opts["boiler_battery_cycle_cost_czk_kwh"] == pytest.approx(0.30)
    assert opts["box_has_home56"] is True
    assert opts["boiler_home5_maneuver_enabled"] is True
    assert opts["boiler_circulation_enabled"] is True
    assert opts["boiler_circulation_lead_minutes"] == 20
    assert opts["boiler_legionella_interval_days"] == 7
    assert opts["boiler_legionella_target_temp_c"] == pytest.approx(62.0)
    assert opts["boiler_current_power_entity"] == "sensor.custom_cbb"
    assert opts["boiler_alt_energy_daily"] is False


# ---------------------------------------------------------------------------
# 10. Wizard flow: steps 5→6→7→8 chain
# ---------------------------------------------------------------------------


class _DummyWizard:
    """Minimal wizard stub for testing step chaining."""

    def __init__(self):
        from custom_components.oig_cloud.config.steps import WizardMixin

        class _W(WizardMixin):
            def __init__(self2):
                super().__init__()
                self2.hass = SimpleNamespace(
                    config=SimpleNamespace(latitude=50.0, longitude=14.0),
                    states=SimpleNamespace(get=lambda _: None),
                )

            def async_show_form(self2, **kwargs):
                return {"type": "form", **kwargs}

            def async_create_entry(self2, **kwargs):
                return {"type": "create_entry", **kwargs}

            def async_abort(self2, **kwargs):
                return {"type": "abort", **kwargs}

            async def async_step_wizard_summary(self2, user_input=None):
                if user_input is not None and user_input.get("go_back"):
                    return self2.async_show_form(step_id="wizard_summary")
                return self2.async_create_entry(
                    title="OIG Cloud",
                    data={},
                    options=self2._build_options_payload(self2._wizard_data),
                )

        self._inner = _W()
        self._inner._wizard_data = {"enable_boiler": True}

    def __getattr__(self, item):
        return getattr(self._inner, item)


@pytest.mark.asyncio
async def test_step5_leads_to_step6():
    w = _DummyWizard()
    result = await w._inner.async_step_wizard_boiler_simple_5(
        {
            "boiler_comfort_profile_mode": "history_driven",
            "boiler_target_temp_c": 60.0,
            "boiler_deadline_time": "20:00",
        }
    )
    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler_simple_6"


@pytest.mark.asyncio
async def test_step6_leads_to_step7():
    w = _DummyWizard()
    result = await w._inner.async_step_wizard_boiler_simple_6(
        {
            "boiler_has_alternative_heating": False,
            "boiler_alt_source_type": "gas",
            "boiler_alt_cost_kwh": 0.0,
            "box_has_home56": False,
            "boiler_home5_maneuver_enabled": False,
            "boiler_battery_cycle_cost_czk_kwh": 0.50,
        }
    )
    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler_simple_7"


@pytest.mark.asyncio
async def test_step7_leads_to_step8():
    w = _DummyWizard()
    result = await w._inner.async_step_wizard_boiler_simple_7(
        {
            "boiler_circulation_enabled": False,
            "boiler_circulation_lead_minutes": 15,
            "boiler_circulation_run_minutes": 10,
            "boiler_circulation_max_runs_per_day": 3,
            "boiler_circulation_min_gap_minutes": 120,
            "boiler_legionella_interval_days": 0,
            "boiler_legionella_target_temp_c": 60.0,
        }
    )
    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler_simple_8"


@pytest.mark.asyncio
async def test_step8_sets_setup_complete_and_creates_entry():
    w = _DummyWizard()
    # Prime wizard_data with minimal boiler setup
    w._inner._wizard_data.update({
        "boiler_box_id": "testbox",
        "boiler_volume_l": 120,
        "boiler_heater_switch_entity": "switch.heater",
        "boiler_effective_power_w": 2000,
        "boiler_heating_capacity_mode": "effective_power_w",
    })
    result = await w._inner.async_step_wizard_boiler_simple_8(
        {
            "boiler_current_power_entity": "",
            "boiler_alt_energy_sensor": "",
            "boiler_alt_energy_daily": True,
        }
    )
    assert result["type"] == "create_entry"
    assert w._inner._wizard_data["boiler_setup_complete"] is True
