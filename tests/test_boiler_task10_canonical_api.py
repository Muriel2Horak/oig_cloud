"""Contract tests for canonical boiler API endpoint (Task 10).

RED→GREEN cycle: these tests must fail before the canonical endpoint exists,
then pass after implementation.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from custom_components.oig_cloud.boiler import api_views as module
from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES


# ============================================================================
# DUMMY HELPERS
# ============================================================================

class DummyRequest:
    def __init__(self, hass, query=None):
        self.app = {"hass": hass, "hass_user": SimpleNamespace(is_admin=True)}
        self.query = query or {}


class DummyHass:
    def __init__(self, config_entries=None, states=None, data=None):
        self.config_entries = config_entries or DummyConfigEntries()
        self.states = states or DummyStates()
        self.data = data or {}


class DummyConfigEntries:
    def __init__(self, entries=None):
        self._entries = entries or []

    def async_entries(self, _domain):
        return self._entries

    def async_get_entry(self, entry_id):
        for entry in self._entries:
            if entry.entry_id == entry_id:
                return entry
        return None


class DummyStates:
    def __init__(self, state_map=None):
        self._map = state_map or {}

    def get(self, entity_id):
        return self._map.get(entity_id)


class DummyEntry:
    def __init__(self, entry_id, options=None, data=None, domain=DOMAIN):
        self.entry_id = entry_id
        self.options = options or {}
        self.data = data or {}
        self.domain = domain


class DummyBoilerPlan:
    def __init__(self):
        self.created_at = datetime(2026, 4, 26, 10, 0, tzinfo=timezone.utc)
        self.valid_until = datetime(2026, 4, 27, 10, 0, tzinfo=timezone.utc)
        self.slots = []
        self.total_consumption_kwh = 0.0
        self.estimated_cost_czk = 0.0
        self.fve_kwh = 0.0
        self.grid_kwh = 0.0
        self.alt_kwh = 0.0


class DummyBoilerProfile:
    def __init__(self):
        self.category = "workday_summer"
        self.hourly_avg = {8: 1.5, 9: 2.0}
        self.confidence = {8: 0.9, 9: 0.85}
        self.sample_count = {8: 10, 9: 12}
        self.last_updated = datetime(2026, 4, 26, 0, 0, tzinfo=timezone.utc)


class DummyPlanResult:
    def __init__(self):
        self.selected_source = SimpleNamespace(value="fve")
        self.actuated_source = SimpleNamespace(value="fve")
        self.comfort_status = SimpleNamespace(value="comfort_satisfied")
        self.comfort_satisfied = True
        self.reason_codes = []
        self.degraded = False
        self.temperature_at_deadline_c = 58.5
        self.unsatisfied_comfort_gap_c = 0.0


class DummyActuatorSerializer:
    def __init__(self):
        self.state = SimpleNamespace(value="running")
        self._last_actuated_source = "fve"
        self._override_state = None
        self._reason_codes = []

    @property
    def last_actuated_source(self):
        return self._last_actuated_source

    @property
    def override_state(self):
        return self._override_state

    @property
    def reason_codes(self):
        return self._reason_codes


class DummyBoilerRuntime:
    def __init__(self, hass, coordinator, box_id="123", entry_id="entry1"):
        self.hass = hass
        self.coordinator = coordinator
        self.box_id = box_id
        self.entry_id = entry_id
        self._current_plan = DummyBoilerPlan()
        self._current_profile = DummyBoilerProfile()
        self.last_plan_result = DummyPlanResult()
        self.actuator = MagicMock()
        self.actuator.last_actuated_source = "fve"
        self.actuator.override_state = None
        self.actuator.reason_codes = []
        self._serializer = DummyActuatorSerializer()

    def get_current_plan(self):
        return self._current_plan

    def get_current_profile(self):
        return self._current_profile


class DummyBoilerCoordinator:
    def __init__(self, config=None, box_id="123"):
        self.config = config or {
            "boiler_volume_l": 200,
            "boiler_target_temp_c": 60.0,
            "boiler_temp_sensor_top": "sensor.temp_top",
            "boiler_temp_sensor_bottom": "sensor.temp_bottom",
            "boiler_cold_inlet_temp_c": 10.0,
        }
        self.box_id = box_id
        self.entry_id = "entry1"
        self.hass: Any = None


# ============================================================================
# IDENTITY / 4xx TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_canonical_view_missing_entry_returns_404():
    """Unknown entry_id must return 404 with identity error."""
    hass = DummyHass(config_entries=DummyConfigEntries([]))
    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "missing_entry", "123")
    payload = json.loads(response.text)

    assert response.status == 404
    assert "error" in payload
    assert payload.get("reason_code") == "api_repair_required"


@pytest.mark.asyncio
async def test_canonical_view_unknown_box_returns_404():
    """Known entry but no runtime for box_id must return 404."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "unknown_box")
    payload = json.loads(response.text)

    assert response.status == 404
    assert "error" in payload
    assert payload.get("reason_code") == "api_repair_required"


@pytest.mark.asyncio
async def test_canonical_view_mismatched_box_ownership_returns_404():
    """Box_id not matching entry options/data must return 404."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "999"})
    coordinator = DummyBoilerCoordinator(config={"boiler_volume_l": 200}, box_id="123")
    runtime = DummyBoilerRuntime(
        hass=DummyHass(), coordinator=coordinator, box_id="123", entry_id="entry1"
    )
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 404
    assert payload.get("reason_code") == "api_repair_required"


# ============================================================================
# VALID CONTRACT TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_canonical_view_returns_all_required_top_level_keys():
    """Canonical response must contain exactly the required top-level keys."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(config={
        "boiler_volume_l": 200,
        "boiler_target_temp_c": 60.0,
        "boiler_temp_sensor_top": "sensor.temp_top",
        "boiler_temp_sensor_bottom": "sensor.temp_bottom",
        "boiler_cold_inlet_temp_c": 10.0,
    }, box_id="123")

    states = DummyStates({
        "sensor.temp_top": SimpleNamespace(state="45.2", last_updated=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc)),
        "sensor.temp_bottom": SimpleNamespace(state="38.1", last_updated=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc)),
        "sensor.oig_123_boiler_manual_mode": SimpleNamespace(state="Zapnuto"),
        "sensor.oig_123_boiler_current_cbb_w": SimpleNamespace(state="1500"),
        "sensor.oig_123_boiler_day_w": SimpleNamespace(state="5200"),
    })
    hass = DummyHass(config_entries=DummyConfigEntries([entry]), states=states)

    runtime = DummyBoilerRuntime(hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1")
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}
    coordinator.hass = hass

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200, f"Unexpected status {response.status}: {payload}"
    required_keys = {
        "entry_id",
        "box_id",
        "current_state",
        "comfort_status",
        "selected_source",
        "actuated_source",
        "plan_slots",
        "reason_codes",
        "freshness",
        "degraded_flags",
        "manual_override",
    }
    assert required_keys.issubset(set(payload.keys())), f"Missing keys: {required_keys - set(payload.keys())}"


@pytest.mark.asyncio
async def test_canonical_view_current_state_has_temperatures_and_energy():
    """current_state must include temperatures and energy sub-objects."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(config={
        "boiler_volume_l": 200,
        "boiler_target_temp_c": 60.0,
        "boiler_temp_sensor_top": "sensor.temp_top",
        "boiler_cold_inlet_temp_c": 10.0,
    }, box_id="123")

    states = DummyStates({
        "sensor.temp_top": SimpleNamespace(state="45.2", last_updated=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc)),
    })
    hass = DummyHass(config_entries=DummyConfigEntries([entry]), states=states)
    runtime = DummyBoilerRuntime(hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1")
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}
    coordinator.hass = hass

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    current_state = payload["current_state"]
    assert "temperatures" in current_state
    assert "energy_state" in current_state
    assert "energy_tracking" in current_state


@pytest.mark.asyncio
async def test_canonical_view_plan_slots_shape():
    """plan_slots must be a list with representative slot shape."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(box_id="123")
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    runtime = DummyBoilerRuntime(hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1")

    # Add a slot to the plan
    from custom_components.oig_cloud.boiler.models import BoilerSlot, EnergySource
    slot = BoilerSlot(
        start=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc),
        end=datetime(2026, 4, 26, 12, 15, tzinfo=timezone.utc),
        avg_consumption_kwh=0.5,
        confidence=0.85,
        recommended_source=EnergySource.FVE,
        spot_price_kwh=1.23,
        alt_price_kwh=None,
        overflow_available=True,
    )
    runtime._current_plan.slots = [slot]

    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    slots = payload["plan_slots"]
    assert isinstance(slots, list)
    assert len(slots) == 1
    first = slots[0]
    assert "start" in first
    assert "end" in first
    assert "consumption_kwh" in first
    assert "recommended_source" in first


# ============================================================================
# LEGACY ENDPOINT DEPRECATION TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_legacy_boiler_profile_returns_deprecation():
    """Legacy BoilerProfileView must return deterministic deprecation response when entry exists but no legacy coordinator."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    hass.data[DOMAIN] = {"entry1": {}}
    view = module.BoilerProfileView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1")
    payload = json.loads(response.text)

    assert response.status == 410
    assert payload.get("reason_code") == "api_repair_required"
    assert "deprecated" in payload.get("error", "").lower() or "repair" in payload.get("error", "").lower()


@pytest.mark.asyncio
async def test_legacy_boiler_plan_returns_deprecation():
    """Legacy BoilerPlanView must return deterministic deprecation response when entry exists but no legacy coordinator."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    hass.data[DOMAIN] = {"entry1": {}}
    view = module.BoilerPlanView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1")
    payload = json.loads(response.text)

    assert response.status == 410
    assert payload.get("reason_code") == "api_repair_required"


# ============================================================================
# GREP CONTRACT: no private coordinator fields in canonical endpoint
# ============================================================================


def test_canonical_assembler_does_not_reference_private_coordinator_fields():
    """The _assemble_canonical_dto helper must not access coordinator._current_plan,
    coordinator._current_profile, or raw coordinator.data.
    """
    import inspect

    source = inspect.getsource(module._assemble_canonical_dto)
    forbidden = ["coordinator._current_plan", "coordinator._current_profile", "coordinator.data"]
    for token in forbidden:
        assert token not in source, f"Canonical assembler must not reference {token}"
