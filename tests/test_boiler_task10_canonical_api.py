"""Contract tests for canonical boiler API endpoint (Task 10).

RED->GREEN cycle: these tests must fail before the canonical endpoint exists,
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


class DummyActivityDTO:
    def __init__(self, state="standby", source="grid", trend=None, fill=0.5):
        self.state = state
        self.source = source
        self.temperature_trend_c_per_min = trend
        self.fill_level_pct = fill
        self.aura_max_temp_c = 80.0
        self.stale_flags = []
        self.active_segment_hint = None
        self.heater_states = {}


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
    def __init__(
        self,
        hass,
        coordinator,
        box_id="123",
        entry_id="entry1",
        activity=None,
        timeline=None,
        segments=None,
        sparklines=None,
    ):
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
        self._activity = activity
        self._timeline = timeline or []
        self._segments = segments or []
        self._sparklines = sparklines or {}

    def get_current_plan(self):
        return self._current_plan

    def get_current_profile(self):
        return self._current_profile

    @property
    def current_activity(self):
        return self._activity

    @property
    def timeline_buffer(self):
        return self._timeline

    @property
    def source_segments(self):
        return self._segments

    @property
    def sparklines(self):
        return self._sparklines


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
        "activity",
        "aura",
        "source_segments",
        "timeline",
        "sparklines",
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
    assert "heating_kwh" in first
    assert "pv_kwh" in first
    assert "grid_kwh" in first
    assert "alt_kwh" in first
    assert "estimated_cost_czk" in first
    assert "predicted_top_temp_c" in first
    assert "comfort_satisfied" in first
    assert "pv_share" in first


# ============================================================================
# TASK 6 ENRICHMENT TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_canonical_view_enriched_payload_activity_aura():
    """activity and aura must serialize when runtime cache has data."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(config={
        "boiler_volume_l": 200,
        "boiler_target_temp_c": 60.0,
        "boiler_temp_sensor_top": "sensor.temp_top",
        "boiler_cold_inlet_temp_c": 10.0,
    }, box_id="123")

    states = DummyStates({
        "sensor.temp_top": SimpleNamespace(state="62.0", last_updated=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc)),
    })
    hass = DummyHass(config_entries=DummyConfigEntries([entry]), states=states)
    activity = DummyActivityDTO(state="charging_fve", source="fve", trend=0.12, fill=0.775)
    runtime = DummyBoilerRuntime(
        hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1", activity=activity
    )
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}
    coordinator.hass = hass

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["activity"] is not None
    assert payload["activity"]["state"] == "charging_fve"
    assert payload["activity"]["source"] == "fve"
    assert payload["activity"]["temperature_trend_c_per_min"] == 0.12
    assert payload["activity"]["fill_level_pct"] == 0.775
    assert payload["activity"]["aura_max_temp_c"] == 80.0
    assert "heater_states" in payload["activity"]

    assert payload["aura"] is not None
    assert payload["aura"]["fill_level_pct"] == 0.775
    assert payload["aura"]["max_temp_c"] == 80.0
    assert payload["aura"]["current_temp_c"] == 62.0


@pytest.mark.asyncio
async def test_canonical_view_empty_runtime_cache_defaults():
    """When runtime has no activity, default to unknown state with runtime_cache_empty flag."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(config={
        "boiler_volume_l": 200,
        "boiler_target_temp_c": 60.0,
        "boiler_temp_sensor_top": "sensor.temp_top",
        "boiler_cold_inlet_temp_c": 10.0,
    }, box_id="123")

    states = DummyStates({
        "sensor.temp_top": SimpleNamespace(state="45.0", last_updated=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc)),
    })
    hass = DummyHass(config_entries=DummyConfigEntries([entry]), states=states)
    runtime = DummyBoilerRuntime(
        hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1", activity=None
    )
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}
    coordinator.hass = hass

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["activity"]["state"] == "unknown"
    assert payload["activity"]["source"] is None
    assert payload["activity"]["temperature_trend_c_per_min"] is None
    assert payload["activity"]["fill_level_pct"] == 0.0
    assert payload["activity"]["stale_flags"] == ["runtime_cache_empty"]
    assert payload["aura"]["fill_level_pct"] == 0.0


@pytest.mark.asyncio
async def test_canonical_view_source_segments_and_timeline_serialize():
    """source_segments and timeline must serialize from runtime properties."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(box_id="123")
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))

    segments = [
        {"key": "fve", "start": datetime(2026, 4, 26, 10, 0, tzinfo=timezone.utc), "end": datetime(2026, 4, 26, 11, 0, tzinfo=timezone.utc), "energy_kwh": 1.5, "fill_pct": 0.4, "active": False},
        {"key": "discharge", "start": datetime(2026, 4, 26, 11, 0, tzinfo=timezone.utc), "end": None, "energy_kwh": 0.0, "fill_pct": 0.1, "active": True},
    ]
    timeline = [
        {"timestamp": datetime(2026, 4, 26, 10, 0, tzinfo=timezone.utc), "top_temp_c": 55.0, "bottom_temp_c": 40.0, "source_key": "fve", "power_kw": 2.0, "activity_state": "charging_fve"},
    ]
    sparklines = {"temperature": [55.0, 56.0], "power": [2.0, 1.5]}
    runtime = DummyBoilerRuntime(
        hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1",
        segments=segments, timeline=timeline, sparklines=sparklines,
    )
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    segs = payload["source_segments"]
    assert len(segs) == 2
    assert segs[0]["key"] == "fve"
    assert segs[0]["energy_kwh"] == 1.5
    assert segs[1]["key"] == "discharge"
    assert segs[1]["fill_pct"] == 0.0

    tl = payload["timeline"]
    assert len(tl) == 1
    assert tl[0]["source_key"] == "fve"
    assert tl[0]["top_temp_c"] == 55.0

    sp = payload["sparklines"]
    assert sp["temperature"] == [55.0, 56.0]


@pytest.mark.asyncio
async def test_canonical_view_source_no_leak_normalized():
    """Raw EnergySource enum, alternative, manual-mode, and localized labels must not leak."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(box_id="123")
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))

    from custom_components.oig_cloud.boiler.models import EnergySource
    slot = SimpleNamespace(
        start=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc),
        end=datetime(2026, 4, 26, 12, 15, tzinfo=timezone.utc),
        avg_consumption_kwh=0.5,
        confidence=0.85,
        recommended_source=EnergySource.ALTERNATIVE,
        spot_price_kwh=1.23,
        alt_price_kwh=None,
        overflow_available=False,
        heating_kwh=0.5,
        pv_kwh=0.0,
        grid_kwh=0.0,
        alt_kwh=0.5,
        estimated_cost_czk=0.75,
        predicted_top_temp_c=None,
        comfort_satisfied=None,
        pv_share=0.0,
    )
    runtime = DummyBoilerRuntime(hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1")
    runtime._current_plan.slots = [slot]
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    first = payload["plan_slots"][0]
    # 'alternative' is now kept as a distinct source key (not collapsed to 'grid')
    # so that the FE plan strip can render orange alternative bands.
    assert first["recommended_source"] == "alternative"
    assert "manual" not in json.dumps(payload).lower() or payload.get("manual_override") is not None
    assert "ALTERNATIVE" not in json.dumps(payload)


@pytest.mark.asyncio
async def test_canonical_view_energy_tracking_runtime_attribution():
    """Energy tracking must attribute to runtime source, not hardcode fve_kwh=0.0."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(box_id="123")
    states = DummyStates({
        "sensor.oig_123_boiler_day_w": SimpleNamespace(state="5200"),
    })
    hass = DummyHass(config_entries=DummyConfigEntries([entry]), states=states)

    activity = DummyActivityDTO(state="charging_fve", source="fve")
    runtime = DummyBoilerRuntime(
        hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1", activity=activity
    )
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    et = payload["current_state"]["energy_tracking"]
    assert et["current_source"] == "fve"
    assert et["total_kwh"] == 5.2
    assert et["fve_kwh"] == 5.2
    assert et["grid_kwh"] == 0.0


@pytest.mark.asyncio
async def test_canonical_view_energy_tracking_grid_source():
    """Runtime source=grid must attribute total energy to grid_kwh, not fve_kwh."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(box_id="123")
    states = DummyStates({
        "sensor.oig_123_boiler_day_w": SimpleNamespace(state="3100"),
    })
    hass = DummyHass(config_entries=DummyConfigEntries([entry]), states=states)

    activity = DummyActivityDTO(state="charging_grid", source="grid")
    runtime = DummyBoilerRuntime(
        hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1", activity=activity
    )
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    et = payload["current_state"]["energy_tracking"]
    assert et["current_source"] == "grid"
    assert et["total_kwh"] == 3.1
    assert et["fve_kwh"] == 0.0
    assert et["grid_kwh"] == 3.1


@pytest.mark.asyncio
async def test_canonical_view_energy_tracking_discharge_source():
    """Runtime source=discharge must not fall through to legacy heuristic; alt absorbs total."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(box_id="123")
    states = DummyStates({
        "sensor.oig_123_boiler_day_w": SimpleNamespace(state="1000"),
    })
    hass = DummyHass(config_entries=DummyConfigEntries([entry]), states=states)

    activity = DummyActivityDTO(state="discharging", source="discharge")
    runtime = DummyBoilerRuntime(
        hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1", activity=activity
    )
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    et = payload["current_state"]["energy_tracking"]
    assert et["current_source"] is None
    assert et["fve_kwh"] == 0.0
    assert et["grid_kwh"] == 0.0
    assert et["alt_kwh"] == 1.0


@pytest.mark.asyncio
async def test_canonical_view_energy_tracking_invalid_source():
    """Invalid runtime source must not fall through to legacy; alt absorbs total."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(box_id="123")
    states = DummyStates({
        "sensor.oig_123_boiler_day_w": SimpleNamespace(state="2000"),
    })
    hass = DummyHass(config_entries=DummyConfigEntries([entry]), states=states)

    activity = DummyActivityDTO(state="unknown", source="bogus")
    runtime = DummyBoilerRuntime(
        hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1", activity=activity
    )
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    et = payload["current_state"]["energy_tracking"]
    assert et["current_source"] is None
    assert et.get("source_invalid") is True
    assert et["fve_kwh"] == 0.0
    assert et["grid_kwh"] == 0.0
    assert et["alt_kwh"] == 2.0


@pytest.mark.asyncio
async def test_canonical_view_energy_tracking_legacy_fallback():
    """When runtime has no activity, legacy heuristic must still work with non-zero energy."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(box_id="123")
    states = DummyStates({
        "sensor.oig_123_boiler_day_w": SimpleNamespace(state="4000"),
    })
    hass = DummyHass(config_entries=DummyConfigEntries([entry]), states=states)
    runtime = DummyBoilerRuntime(
        hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1", activity=None
    )
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    et = payload["current_state"]["energy_tracking"]
    assert et["current_source"] in ("fve", "grid", "overflow", None)
    assert et["total_kwh"] == 4.0
    assert et["fve_kwh"] + et["grid_kwh"] == pytest.approx(et["total_kwh"])


@pytest.mark.asyncio
async def test_canonical_view_config_summary_has_new_keys():
    """Config summary must preserve existing keys and add aura_max_temp_c, heater_power_kw."""
    from custom_components.oig_cloud.boiler.api_views import _build_boiler_config_summary

    class FakeCoord:
        config = {
            "boiler_volume_l": 200,
            "boiler_target_temp_c": 60.0,
            "boiler_cold_inlet_temp_c": 10.0,
            "boiler_deadline_time": "20:00",
            "boiler_plan_slot_minutes": 15,
            "boiler_stratification_mode": "two_zone",
            "boiler_temp_sensor_position": "top",
            "boiler_two_zone_split_ratio": 0.5,
            "boiler_circulation_pump_switch_entity": "switch.pump",
            "boiler_effective_power_w": 2500,
        }

    summary = _build_boiler_config_summary(FakeCoord())
    assert summary["volume_l"] == 200
    assert summary["target_temp_c"] == 60.0
    assert summary["deadline_time"] == "20:00"
    assert summary["aura_max_temp_c"] == 80.0
    assert summary["heater_power_kw"] == 2.5


@pytest.mark.asyncio
async def test_canonical_view_config_summary_zero_power():
    """heater_power_kw must be 0.0 when effective power is zero."""
    from custom_components.oig_cloud.boiler.api_views import _build_boiler_config_summary

    class FakeCoord:
        config = {"boiler_effective_power_w": 0}

    summary = _build_boiler_config_summary(FakeCoord())
    assert summary["heater_power_kw"] == 0.0


@pytest.mark.asyncio
async def test_canonical_view_config_summary_invalid_power_omitted():
    """Invalid power string must omit heater_power_kw, not set it to 0.0."""
    from custom_components.oig_cloud.boiler.api_views import _build_boiler_config_summary

    class FakeCoord:
        config = {"boiler_effective_power_w": "invalid"}

    summary = _build_boiler_config_summary(FakeCoord())
    assert "heater_power_kw" not in summary


@pytest.mark.asyncio
async def test_canonical_view_config_summary_empty_string_power_omitted():
    """Empty string power must omit heater_power_kw."""
    from custom_components.oig_cloud.boiler.api_views import _build_boiler_config_summary

    class FakeCoord:
        config = {"boiler_effective_power_w": ""}

    summary = _build_boiler_config_summary(FakeCoord())
    assert "heater_power_kw" not in summary


@pytest.mark.asyncio
async def test_canonical_view_config_summary_none_power_omitted():
    """None power must omit heater_power_kw."""
    from custom_components.oig_cloud.boiler.api_views import _build_boiler_config_summary

    class FakeCoord:
        config = {"boiler_effective_power_w": None}

    summary = _build_boiler_config_summary(FakeCoord())
    assert "heater_power_kw" not in summary


@pytest.mark.asyncio
async def test_canonical_view_config_summary_unknown_unavailable_omitted():
    """HA unavailable/unknown sensor strings must omit heater_power_kw."""
    from custom_components.oig_cloud.boiler.api_views import _build_boiler_config_summary

    for val in ("unknown", "unavailable"):
        class FakeCoord:
            config = {"boiler_effective_power_w": val}

        summary = _build_boiler_config_summary(FakeCoord())
        assert "heater_power_kw" not in summary, f"failed for {val!r}"


@pytest.mark.asyncio
async def test_canonical_view_config_summary_nan_inf_omitted():
    """NaN and Inf strings must omit heater_power_kw."""
    from custom_components.oig_cloud.boiler.api_views import _build_boiler_config_summary

    for val in ("nan", "inf", "-inf", "NaN", "INF"):
        class FakeCoord:
            config = {"boiler_effective_power_w": val}

        summary = _build_boiler_config_summary(FakeCoord())
        assert "heater_power_kw" not in summary, f"failed for {val!r}"


@pytest.mark.asyncio
async def test_canonical_view_plan_slot_comfort_satisfied():
    """comfort_satisfied must be computed from predicted_top_temp_c >= target_temp_c."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(config={
        "boiler_target_temp_c": 60.0,
    }, box_id="123")
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))

    from custom_components.oig_cloud.boiler.models import EnergySource
    slot = SimpleNamespace(
        start=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc),
        end=datetime(2026, 4, 26, 12, 15, tzinfo=timezone.utc),
        avg_consumption_kwh=0.5,
        confidence=0.85,
        recommended_source=EnergySource.GRID,
        spot_price_kwh=1.23,
        alt_price_kwh=None,
        overflow_available=False,
        heating_kwh=0.5,
        pv_kwh=0.0,
        grid_kwh=0.5,
        alt_kwh=0.0,
        estimated_cost_czk=0.75,
        predicted_top_temp_c=62.0,
        comfort_satisfied=None,
        pv_share=0.0,
    )
    runtime = DummyBoilerRuntime(hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1")
    runtime._current_plan.slots = [slot]
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    first = payload["plan_slots"][0]
    assert first["comfort_satisfied"] is True
    assert first["predicted_top_temp_c"] == 62.0


@pytest.mark.asyncio
async def test_canonical_view_plan_slot_predicted_zero_is_none():
    """predicted_top_temp_c <= 0.0 must serialize as None with comfort_satisfied None."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(config={
        "boiler_target_temp_c": 60.0,
    }, box_id="123")
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))

    from custom_components.oig_cloud.boiler.models import EnergySource
    slot = SimpleNamespace(
        start=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc),
        end=datetime(2026, 4, 26, 12, 15, tzinfo=timezone.utc),
        avg_consumption_kwh=0.5,
        confidence=0.85,
        recommended_source=EnergySource.GRID,
        spot_price_kwh=1.23,
        alt_price_kwh=None,
        overflow_available=False,
        heating_kwh=0.5,
        pv_kwh=0.0,
        grid_kwh=0.5,
        alt_kwh=0.0,
        estimated_cost_czk=0.75,
        predicted_top_temp_c=0.0,
        comfort_satisfied=None,
        pv_share=0.0,
    )
    runtime = DummyBoilerRuntime(hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1")
    runtime._current_plan.slots = [slot]
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    first = payload["plan_slots"][0]
    assert first["predicted_top_temp_c"] is None
    assert first["comfort_satisfied"] is None


@pytest.mark.asyncio
async def test_canonical_view_plan_slot_predicted_negative_is_none():
    """predicted_top_temp_c negative must serialize as None with comfort_satisfied None."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(config={
        "boiler_target_temp_c": 60.0,
    }, box_id="123")
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))

    from custom_components.oig_cloud.boiler.models import EnergySource
    slot = SimpleNamespace(
        start=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc),
        end=datetime(2026, 4, 26, 12, 15, tzinfo=timezone.utc),
        avg_consumption_kwh=0.5,
        confidence=0.85,
        recommended_source=EnergySource.GRID,
        spot_price_kwh=1.23,
        alt_price_kwh=None,
        overflow_available=False,
        heating_kwh=0.5,
        pv_kwh=0.0,
        grid_kwh=0.5,
        alt_kwh=0.0,
        estimated_cost_czk=0.75,
        predicted_top_temp_c=-5.0,
        comfort_satisfied=None,
        pv_share=0.0,
    )
    runtime = DummyBoilerRuntime(hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1")
    runtime._current_plan.slots = [slot]
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    first = payload["plan_slots"][0]
    assert first["predicted_top_temp_c"] is None
    assert first["comfort_satisfied"] is None


@pytest.mark.asyncio
async def test_canonical_view_plan_slot_comfort_not_satisfied():
    """comfort_satisfied must be False when predicted temp is below target."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(config={
        "boiler_target_temp_c": 60.0,
    }, box_id="123")
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))

    from custom_components.oig_cloud.boiler.models import EnergySource
    slot = SimpleNamespace(
        start=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc),
        end=datetime(2026, 4, 26, 12, 15, tzinfo=timezone.utc),
        avg_consumption_kwh=0.5,
        confidence=0.85,
        recommended_source=EnergySource.GRID,
        spot_price_kwh=1.23,
        alt_price_kwh=None,
        overflow_available=False,
        heating_kwh=0.5,
        pv_kwh=0.0,
        grid_kwh=0.5,
        alt_kwh=0.0,
        estimated_cost_czk=0.75,
        predicted_top_temp_c=55.0,
        comfort_satisfied=None,
        pv_share=0.0,
    )
    runtime = DummyBoilerRuntime(hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1")
    runtime._current_plan.slots = [slot]
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    first = payload["plan_slots"][0]
    assert first["comfort_satisfied"] is False


@pytest.mark.asyncio
async def test_canonical_view_source_invalid_flag_on_bad_source():
    """Invalid source values must serialize as null with source_invalid flag."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(box_id="123")
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))

    slot = SimpleNamespace(
        start=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc),
        end=datetime(2026, 4, 26, 12, 15, tzinfo=timezone.utc),
        avg_consumption_kwh=0.5,
        confidence=0.85,
        recommended_source="bogus_source",
        spot_price_kwh=1.23,
        alt_price_kwh=None,
        overflow_available=False,
        heating_kwh=0.5,
        pv_kwh=0.0,
        grid_kwh=0.5,
        alt_kwh=0.0,
        estimated_cost_czk=0.75,
        predicted_top_temp_c=None,
        comfort_satisfied=None,
        pv_share=0.0,
    )
    runtime = DummyBoilerRuntime(hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1")
    runtime._current_plan.slots = [slot]
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerCanonicalView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    first = payload["plan_slots"][0]
    assert first["recommended_source"] is None
    assert first.get("source_invalid") is True


@pytest.mark.asyncio
async def test_canonical_view_dynamic_deadline_from_config():
    """Deadline time must reflect config value in config summary."""
    entry = DummyEntry(entry_id="entry1", options={"box_id": "123"})
    coordinator = DummyBoilerCoordinator(config={
        "boiler_deadline_time": "07:30",
        "boiler_effective_power_w": 3000,
    }, box_id="123")
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    runtime = DummyBoilerRuntime(hass=hass, coordinator=coordinator, box_id="123", entry_id="entry1")
    hass.data[DOMAIN] = {"entry1": {KEY_BOILER_RUNTIMES: {"123": runtime}}}

    view = module.BoilerProfileView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["config"]["deadline_time"] == "07:30"
    assert payload["config"]["heater_power_kw"] == 3.0


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
