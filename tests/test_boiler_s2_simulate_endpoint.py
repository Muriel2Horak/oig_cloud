"""Contract tests for the boiler dry-run simulate endpoint (S2).

POST /api/oig_cloud/boiler/{entry_id}/{box_id}/simulate_water_day

Covers: response shape, no-side-effects (no sensor reads, no store/entry
writes), preset determinism, admin gate, and basic input validation.
"""

from __future__ import annotations

import copy
import json
from datetime import time as datetime_time
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.boiler import api_views as module
from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES


# ============================================================================
# DUMMY HELPERS (mirrors tests/test_boiler_task10_canonical_api.py)
# ============================================================================


class DummyRequest:
    def __init__(self, hass, json_body=None, is_admin=True, has_user=True):
        self.app = {"hass": hass}
        self._json_body = json_body if json_body is not None else {}
        self._user = SimpleNamespace(is_admin=is_admin) if has_user else None

    def get(self, key, default=None):
        if key == "hass_user":
            return self._user
        return default

    async def json(self):
        return self._json_body


class DummyStates:
    """Records every entity read — proves the simulator never touches sensors."""

    def __init__(self):
        self.get_calls: list[str] = []

    def get(self, entity_id):
        self.get_calls.append(entity_id)
        return None


class DummyConfigEntries:
    """Records every entry mutation — proves the simulator never writes config."""

    def __init__(self, entries=None):
        self._entries = entries or []
        self.update_calls: list[tuple] = []

    def async_entries(self, _domain):
        return self._entries

    def async_update_entry(self, entry, **kwargs):
        self.update_calls.append((entry, kwargs))


class DummyHass:
    def __init__(self, config_entries=None, states=None, data=None):
        self.config_entries = config_entries or DummyConfigEntries()
        self.states = states or DummyStates()
        self.data = data or {}


class DummyEntry:
    def __init__(self, entry_id, options=None, data=None, domain=DOMAIN):
        self.entry_id = entry_id
        self.options = options or {}
        self.data = data or {}
        self.domain = domain


class DummyBoilerCoordinator:
    def __init__(self, config=None, box_id="123"):
        self.config = config or {
            "boiler_volume_l": 200,
            "boiler_target_temp_c": 60.0,
            "boiler_cold_inlet_temp_c": 10.0,
            "boiler_deadline_time": "20:00",
        }
        self.box_id = box_id


class DummyBoilerRuntime:
    def __init__(self, hass, coordinator, box_id="123", entry_id="entry1"):
        self.hass = hass
        self.coordinator = coordinator
        self.box_id = box_id
        self.entry_id = entry_id


def _build_hass_with_runtime(config=None, box_id="123", entry_id="entry1"):
    entry = DummyEntry(entry_id=entry_id, options={"box_id": box_id})
    config_entries = DummyConfigEntries([entry])
    hass = DummyHass(config_entries=config_entries)
    coordinator = DummyBoilerCoordinator(config=config, box_id=box_id)
    runtime = DummyBoilerRuntime(hass, coordinator, box_id=box_id, entry_id=entry_id)
    hass.data[DOMAIN] = {entry_id: {KEY_BOILER_RUNTIMES: {box_id: runtime}}}
    return hass, entry, runtime


FIXED_NOW = "2026-07-26T05:00:00+02:00"


# ============================================================================
# SHAPE
# ============================================================================


@pytest.mark.asyncio
async def test_simulate_preset_returns_well_formed_response():
    hass, _entry, _runtime = _build_hass_with_runtime()
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"preset": "workday", "now": FIXED_NOW})

    response = await view.post(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["preset"] == "workday"
    assert payload["entry_id"] == "entry1"
    assert payload["box_id"] == "123"

    assert "inputs" in payload and "source" in payload
    for key in ("water_draw_profile_lh", "start_temp_c", "boiler_volume_l", "boiler_target_temp_c"):
        assert key in payload["inputs"]
    for key in ("water_draw_profile_lh", "grid_prices_czk_kwh", "boiler_volume_l"):
        assert key in payload["source"]

    assert isinstance(payload["timeline"], list) and len(payload["timeline"]) > 0
    slot = payload["timeline"][0]
    for key in (
        "start", "end", "action", "source", "heating_kwh", "pv_kwh", "grid_kwh",
        "alt_kwh", "battery_kwh", "estimated_cost_czk", "predicted_top_temp_c", "purpose",
    ):
        assert key in slot

    summary = payload["summary"]
    for key in (
        "total_heating_kwh", "cost_czk", "pv_kwh", "grid_kwh", "alt_kwh", "battery_kwh",
        "comfort_satisfied", "comfort_status", "temperature_at_deadline_c",
        "unsatisfied_comfort_gap_c", "degraded", "reason_codes",
    ):
        assert key in summary


@pytest.mark.asyncio
async def test_simulate_explicit_series_accepted():
    hass, _entry, _runtime = _build_hass_with_runtime()
    view = module.BoilerSimulateView(hass)
    draws = [0.0] * 24
    draws[7] = 40.0
    request = DummyRequest(
        hass, json_body={"water_draw_profile_lh": draws, "now": FIXED_NOW}
    )

    response = await view.post(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["preset"] is None
    assert payload["source"]["water_draw_profile_lh"] == "request"


@pytest.mark.asyncio
async def test_simulate_legionella_preset_sets_obligation_source():
    hass, _entry, _runtime = _build_hass_with_runtime()
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(
        hass, json_body={"preset": "legionella_cycle", "now": FIXED_NOW}
    )

    response = await view.post(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["source"]["legionella_obligation"] == "preset"


# ============================================================================
# LIVE-CONFIG deadline_time TOLERANCE (owner box probe: TimeSelector stores
# "HH:MM:SS", the sim used to str()-cast that straight into a validator that
# only accepted "HH:MM" -> 500.
# ============================================================================


@pytest.mark.asyncio
async def test_simulate_accepts_hh_mm_ss_deadline_time_from_live_config():
    hass, _entry, _runtime = _build_hass_with_runtime(
        config={
            "boiler_volume_l": 200,
            "boiler_target_temp_c": 60.0,
            "boiler_cold_inlet_temp_c": 10.0,
            "boiler_deadline_time": "06:00:00",
        }
    )
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"preset": "workday", "now": FIXED_NOW})

    response = await view.post(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["inputs"]["deadline_time"] == "06:00"


@pytest.mark.asyncio
async def test_simulate_accepts_datetime_time_deadline_time_from_live_config():
    hass, _entry, _runtime = _build_hass_with_runtime(
        config={
            "boiler_volume_l": 200,
            "boiler_target_temp_c": 60.0,
            "boiler_cold_inlet_temp_c": 10.0,
            "boiler_deadline_time": datetime_time(6, 30),
        }
    )
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"preset": "workday", "now": FIXED_NOW})

    response = await view.post(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["inputs"]["deadline_time"] == "06:30"


@pytest.mark.asyncio
async def test_simulate_accepts_numeric_hour_deadline_time():
    hass, _entry, _runtime = _build_hass_with_runtime(
        config={
            "boiler_volume_l": 200,
            "boiler_target_temp_c": 60.0,
            "boiler_cold_inlet_temp_c": 10.0,
            "boiler_deadline_time": 6,
        }
    )
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"preset": "workday", "now": FIXED_NOW})

    response = await view.post(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["inputs"]["deadline_time"] == "06:00"


@pytest.mark.asyncio
async def test_simulate_falls_back_to_default_on_unparseable_deadline_time(caplog):
    hass, _entry, _runtime = _build_hass_with_runtime(
        config={
            "boiler_volume_l": 200,
            "boiler_target_temp_c": 60.0,
            "boiler_cold_inlet_temp_c": 10.0,
            "boiler_deadline_time": "not-a-time",
        }
    )
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"preset": "workday", "now": FIXED_NOW})

    with caplog.at_level("WARNING"):
        response = await view.post(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["inputs"]["deadline_time"] == module.DEFAULT_BOILER_DEADLINE_TIME
    assert any("deadline_time" in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_simulate_falls_back_to_default_on_none_deadline_time():
    hass, _entry, _runtime = _build_hass_with_runtime(
        config={
            "boiler_volume_l": 200,
            "boiler_target_temp_c": 60.0,
            "boiler_cold_inlet_temp_c": 10.0,
            "boiler_deadline_time": None,
        }
    )
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"preset": "workday", "now": FIXED_NOW})

    response = await view.post(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["inputs"]["deadline_time"] == module.DEFAULT_BOILER_DEADLINE_TIME


# ============================================================================
# VALIDATION / ERRORS
# ============================================================================


@pytest.mark.asyncio
async def test_simulate_missing_input_returns_400():
    hass, _entry, _runtime = _build_hass_with_runtime()
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"now": FIXED_NOW})

    response = await view.post(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 400
    assert "error" in payload


@pytest.mark.asyncio
async def test_simulate_unknown_preset_returns_400():
    hass, _entry, _runtime = _build_hass_with_runtime()
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"preset": "does_not_exist"})

    response = await view.post(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 400
    assert "error" in payload


@pytest.mark.asyncio
async def test_simulate_wrong_length_series_returns_400():
    hass, _entry, _runtime = _build_hass_with_runtime()
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"water_draw_profile_lh": [1.0, 2.0]})

    response = await view.post(request, "entry1", "123")
    assert response.status == 400


@pytest.mark.asyncio
async def test_simulate_unknown_box_returns_404():
    hass, _entry, _runtime = _build_hass_with_runtime()
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"preset": "workday"})

    response = await view.post(request, "entry1", "unknown_box")

    assert response.status == 404


# ============================================================================
# ADMIN GATE
# ============================================================================


@pytest.mark.asyncio
async def test_simulate_requires_admin_rejects_non_admin():
    hass, _entry, _runtime = _build_hass_with_runtime()
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"preset": "workday"}, is_admin=False)

    response = await view.post(request, "entry1", "123")

    assert response.status == 403


@pytest.mark.asyncio
async def test_simulate_requires_admin_rejects_missing_user():
    hass, _entry, _runtime = _build_hass_with_runtime()
    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"preset": "workday"}, has_user=False)

    response = await view.post(request, "entry1", "123")

    assert response.status == 403


# ============================================================================
# NO SIDE EFFECTS
# ============================================================================


@pytest.mark.asyncio
async def test_simulate_touches_no_sensors_or_store():
    hass, entry, runtime = _build_hass_with_runtime()
    config_before = copy.deepcopy(runtime.coordinator.config)
    options_before = copy.deepcopy(entry.options)

    view = module.BoilerSimulateView(hass)
    request = DummyRequest(hass, json_body={"preset": "weekend", "now": FIXED_NOW})

    response = await view.post(request, "entry1", "123")

    assert response.status == 200
    # No sensor was ever read — dry-run must not touch live state.
    assert hass.states.get_calls == []
    # No config entry was ever written.
    assert hass.config_entries.update_calls == []
    # The runtime's own config dict was not mutated (view only reads a copy).
    assert runtime.coordinator.config == config_before
    assert entry.options == options_before
    # hass.data topology is untouched — same runtime object still registered.
    assert hass.data[DOMAIN]["entry1"][KEY_BOILER_RUNTIMES]["123"] is runtime


@pytest.mark.asyncio
async def test_simulate_override_config_does_not_mutate_base_config():
    hass, _entry, runtime = _build_hass_with_runtime()
    config_before = copy.deepcopy(runtime.coordinator.config)

    view = module.BoilerSimulateView(hass)
    request = DummyRequest(
        hass,
        json_body={
            "preset": "workday",
            "now": FIXED_NOW,
            "override_config": {"boiler_target_temp_c": 65.0},
        },
    )

    response = await view.post(request, "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["inputs"]["boiler_target_temp_c"] == 65.0
    assert payload["source"]["boiler_target_temp_c"] == "request"
    # The box's persisted config is untouched by the override.
    assert runtime.coordinator.config == config_before


# ============================================================================
# DETERMINISM
# ============================================================================


@pytest.mark.asyncio
async def test_simulate_preset_determinism_same_preset_same_output():
    hass, _entry, _runtime = _build_hass_with_runtime()
    view = module.BoilerSimulateView(hass)

    request1 = DummyRequest(hass, json_body={"preset": "vacation", "now": FIXED_NOW})
    request2 = DummyRequest(hass, json_body={"preset": "vacation", "now": FIXED_NOW})

    response1 = await view.post(request1, "entry1", "123")
    response2 = await view.post(request2, "entry1", "123")

    assert response1.status == 200
    assert response2.status == 200
    assert json.loads(response1.text) == json.loads(response2.text)


@pytest.mark.asyncio
async def test_simulate_preset_determinism_across_two_runtimes():
    """Same preset + same 'now' must be deterministic even against independently
    built hass/runtime fixtures (not just the same object)."""
    hass1, _e1, _r1 = _build_hass_with_runtime()
    hass2, _e2, _r2 = _build_hass_with_runtime()
    view1 = module.BoilerSimulateView(hass1)
    view2 = module.BoilerSimulateView(hass2)

    body = {"preset": "guest", "now": FIXED_NOW}
    response1 = await view1.post(DummyRequest(hass1, json_body=body), "entry1", "123")
    response2 = await view2.post(DummyRequest(hass2, json_body=body), "entry1", "123")

    assert json.loads(response1.text) == json.loads(response2.text)


# ============================================================================
# PRESETS GET (fe/fix): the overlay fetches the preset list to populate chips;
# POST-only left it 404. Admin-gated + identity-validated like simulate_water_day.
# ============================================================================


@pytest.mark.asyncio
async def test_simulate_presets_requires_admin_rejects_non_admin():
    hass, _e, _r = _build_hass_with_runtime()
    view = module.BoilerSimulatePresetsView(hass)
    request = DummyRequest(hass, is_admin=False)

    response = await view.get(request, "entry1", "123")

    assert response.status == 403


@pytest.mark.asyncio
async def test_simulate_presets_unknown_box_returns_404():
    hass, _e, _r = _build_hass_with_runtime()
    view = module.BoilerSimulatePresetsView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "unknown_box")

    assert response.status == 404


@pytest.mark.asyncio
async def test_simulate_presets_returns_id_and_name_for_every_preset():
    hass, _e, _r = _build_hass_with_runtime()
    view = module.BoilerSimulatePresetsView(hass)
    request = DummyRequest(hass)

    response = await view.get(request, "entry1", "123")
    assert response.status == 200

    items = json.loads(response.text)
    presets = module._load_water_day_presets()
    assert isinstance(items, list) and len(items) == len(presets)
    for item in items:
        # Contract: [{id, name}] — name is a short CZ label for the chip.
        assert set(item.keys()) == {"id", "name"}
        assert item["id"] in presets
        assert isinstance(item["name"], str) and item["name"]
