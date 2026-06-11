"""F4 DTO additions: energy_today and plan_summary top-level keys.

Tests cover:
- energy_today present with correct sub-keys
- energy_today battery_kwh always 0.0 (not tracked retroactively yet)
- energy_today source_invalid flag propagation
- plan_summary present when plan_result exists (benchmarks + deadline)
- plan_summary null-safe when no plan_result (still emits deadline_time)
- deadline_time from config (or default when key absent)
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock

import pytest

from custom_components.oig_cloud.boiler import api_views as module
from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES


# ---------------------------------------------------------------------------
# Shared dummies (minimal — only what the assembler needs)
# ---------------------------------------------------------------------------

class DummyRequest:
    def __init__(self, hass):
        self.app = {"hass": hass, "hass_user": SimpleNamespace(is_admin=True)}
        self.query = {}


class DummyHass:
    def __init__(self, config_entries=None, states=None, data=None):
        self.config_entries = config_entries or _DummyConfigEntries()
        self.states = states or _DummyStates()
        self.data = data or {}


class _DummyConfigEntries:
    def __init__(self, entries=None):
        self._entries = entries or []

    def async_entries(self, _domain):
        return self._entries

    def async_get_entry(self, entry_id):
        for e in self._entries:
            if e.entry_id == entry_id:
                return e
        return None


class _DummyStates:
    def __init__(self, state_map=None):
        self._map = state_map or {}

    def get(self, entity_id):
        return self._map.get(entity_id)


class _DummyEntry:
    def __init__(self, entry_id, options=None):
        self.entry_id = entry_id
        self.options = options or {}
        self.data = {}
        self.domain = DOMAIN


class _DummyPlanResult:
    """Minimal PlanResult stand-in that includes F3a benchmark fields."""

    def __init__(
        self,
        estimated_cost_czk: float = 3.50,
        cost_if_all_grid: float = 7.20,
        cost_if_all_alt: float = 5.10,
    ):
        self.selected_source = SimpleNamespace(value="fve")
        self.actuated_source = SimpleNamespace(value="fve")
        self.comfort_status = SimpleNamespace(value="comfort_satisfied")
        self.comfort_satisfied = True
        self.reason_codes = []
        self.degraded = False
        self.temperature_at_deadline_c = 58.5
        self.unsatisfied_comfort_gap_c = 0.0
        self.estimated_cost_czk = estimated_cost_czk
        self.cost_if_all_grid = cost_if_all_grid
        self.cost_if_all_alt = cost_if_all_alt
        self.slots = []


class _DummyBoilerPlan:
    def __init__(self):
        self.created_at = datetime(2026, 6, 11, 6, 0, tzinfo=timezone.utc)
        self.valid_until = datetime(2026, 6, 12, 6, 0, tzinfo=timezone.utc)
        self.slots = []
        self.total_consumption_kwh = 0.0
        self.estimated_cost_czk = 0.0
        self.fve_kwh = 0.0
        self.grid_kwh = 0.0
        self.alt_kwh = 0.0


class _DummyCoordinator:
    def __init__(self, config=None, box_id="box1"):
        self.config = config or {}
        self.box_id = box_id
        self.entry_id = "entry1"
        self.hass: Any = None


class _DummyRuntime:
    def __init__(self, hass, coordinator, box_id="box1", entry_id="entry1", plan_result=None):
        self.hass = hass
        self.coordinator = coordinator
        self.box_id = box_id
        self.entry_id = entry_id
        self._plan = _DummyBoilerPlan()
        self.last_plan_result = plan_result
        self.actuator = MagicMock()
        self.actuator.last_actuated_source = None
        self.actuator.override_state = None
        self.actuator.reason_codes = []
        self._serializer = SimpleNamespace(
            state=SimpleNamespace(value="running"),
            last_actuated_source=None,
            override_state=None,
            reason_codes=[],
        )
        self.current_activity = None
        self.timeline_buffer = []
        self.source_segments = []
        self.sparklines = {}

    def get_current_plan(self):
        return self._plan

    def get_current_profile(self):
        return None


def _make_hass_runtime(config=None, states=None, plan_result=None):
    """Build a minimal hass+runtime with the given config and states."""
    entry = _DummyEntry(entry_id="entry1", options={"box_id": "box1"})
    base_config = {
        "boiler_volume_l": 100,
        "boiler_target_temp_c": 55.0,
        "boiler_cold_inlet_temp_c": 10.0,
    }
    if config:
        base_config.update(config)
    coordinator = _DummyCoordinator(config=base_config, box_id="box1")
    state_map = states or {}
    hass = DummyHass(
        config_entries=_DummyConfigEntries([entry]),
        states=_DummyStates(state_map),
    )
    runtime = _DummyRuntime(
        hass=hass, coordinator=coordinator, box_id="box1", entry_id="entry1",
        plan_result=plan_result,
    )
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"box1": runtime}}}
    coordinator.hass = hass
    return hass


# ---------------------------------------------------------------------------
# energy_today tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_energy_today_key_present():
    """energy_today must be present as a top-level key."""
    hass = _make_hass_runtime()
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    assert response.status == 200
    assert "energy_today" in payload


@pytest.mark.asyncio
async def test_energy_today_subkeys():
    """energy_today must expose all required sub-keys."""
    states = {
        "sensor.oig_box1_boiler_day_w": SimpleNamespace(state="4200"),
    }
    hass = _make_hass_runtime(states=states)
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    et = payload["energy_today"]
    for key in ("total_kwh", "fve_kwh", "grid_kwh", "alt_kwh", "battery_kwh", "source_invalid"):
        assert key in et, f"energy_today missing key: {key}"


@pytest.mark.asyncio
async def test_energy_today_battery_kwh_always_zero():
    """battery_kwh in energy_today must be 0.0 (not tracked retroactively yet)."""
    hass = _make_hass_runtime()
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    assert payload["energy_today"]["battery_kwh"] == 0.0


@pytest.mark.asyncio
async def test_energy_today_total_kwh_from_sensor():
    """total_kwh must derive from boiler_day_w sensor (Wh -> kWh conversion)."""
    states = {
        "sensor.oig_box1_boiler_day_w": SimpleNamespace(state="5000"),
    }
    hass = _make_hass_runtime(states=states)
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    assert payload["energy_today"]["total_kwh"] == pytest.approx(5.0, abs=0.01)


@pytest.mark.asyncio
async def test_energy_today_source_invalid_false_by_default():
    """source_invalid must be False (boolean) when no invalid source encountered."""
    hass = _make_hass_runtime()
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    assert payload["energy_today"]["source_invalid"] is False


@pytest.mark.asyncio
async def test_energy_today_no_sensor_returns_zeros():
    """When boiler_day_w sensor is absent, total/fve/grid all default to 0.0."""
    hass = _make_hass_runtime(states={})
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    et = payload["energy_today"]
    assert et["total_kwh"] == 0.0
    assert et["fve_kwh"] == 0.0
    assert et["grid_kwh"] == 0.0


# ---------------------------------------------------------------------------
# plan_summary tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_plan_summary_key_present():
    """plan_summary must be present as a top-level key."""
    hass = _make_hass_runtime(plan_result=_DummyPlanResult())
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    assert response.status == 200
    assert "plan_summary" in payload


@pytest.mark.asyncio
async def test_plan_summary_subkeys_with_plan():
    """plan_summary with a plan_result must expose all cost + deadline sub-keys."""
    hass = _make_hass_runtime(plan_result=_DummyPlanResult(
        estimated_cost_czk=3.50, cost_if_all_grid=7.20, cost_if_all_alt=5.10
    ))
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    ps = payload["plan_summary"]
    assert "estimated_cost_czk" in ps
    assert "cost_if_all_grid" in ps
    assert "cost_if_all_alt" in ps
    assert "deadline_time" in ps


@pytest.mark.asyncio
async def test_plan_summary_cost_values_rounded():
    """plan_summary cost fields must reflect PlanResult values (2 dp)."""
    hass = _make_hass_runtime(plan_result=_DummyPlanResult(
        estimated_cost_czk=3.504, cost_if_all_grid=7.205, cost_if_all_alt=5.101
    ))
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    ps = payload["plan_summary"]
    assert ps["estimated_cost_czk"] == pytest.approx(3.50, abs=0.01)
    assert ps["cost_if_all_grid"] == pytest.approx(7.21, abs=0.01)
    assert ps["cost_if_all_alt"] == pytest.approx(5.10, abs=0.01)


@pytest.mark.asyncio
async def test_plan_summary_deadline_time_from_config():
    """deadline_time must be read from CONF_BOILER_DEADLINE_TIME in config."""
    hass = _make_hass_runtime(
        config={"boiler_deadline_time": "07:30"},
        plan_result=_DummyPlanResult(),
    )
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    assert payload["plan_summary"]["deadline_time"] == "07:30"


@pytest.mark.asyncio
async def test_plan_summary_null_safe_no_plan():
    """plan_summary must be non-null even when plan_result is None."""
    hass = _make_hass_runtime(plan_result=None)
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    ps = payload["plan_summary"]
    assert ps is not None
    assert "deadline_time" in ps
    # Cost fields are None when no plan
    assert ps["estimated_cost_czk"] is None
    assert ps["cost_if_all_grid"] is None
    assert ps["cost_if_all_alt"] is None


@pytest.mark.asyncio
async def test_plan_summary_deadline_time_present_when_no_plan():
    """deadline_time must be present even when plan_result is None."""
    hass = _make_hass_runtime(
        config={"boiler_deadline_time": "08:00"},
        plan_result=None,
    )
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    assert payload["plan_summary"]["deadline_time"] == "08:00"


@pytest.mark.asyncio
async def test_plan_summary_default_deadline_when_config_key_absent():
    """When CONF_BOILER_DEADLINE_TIME is absent from config, a string default is used."""
    hass = _make_hass_runtime(config={}, plan_result=None)
    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "box1")
    payload = json.loads(response.text)

    ps = payload["plan_summary"]
    assert isinstance(ps["deadline_time"], str)
    assert ":" in ps["deadline_time"]  # must be "HH:MM" shaped
