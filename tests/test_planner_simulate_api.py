from __future__ import annotations

import copy
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.api import planning_api

REQUIRED_TIMELINE_KEYS = {
    "interval_index",
    "soc_kwh",
    "soc_percent",
    "solar_kwh",
    "load_kwh",
    "grid_import_kwh",
    "grid_export_kwh",
    "cost_czk",
    "mode",
    "mode_name",
}

REQUIRED_SUMMARY_KEYS = {
    "total_cost_czk",
    "total_grid_import_kwh",
    "total_grid_export_kwh",
    "total_solar_kwh",
    "min_soc_kwh",
    "max_soc_kwh",
    "min_soc_percent",
    "max_soc_percent",
    "mode_distribution",
}

REQUIRED_TOP_KEYS = {
    "preset",
    "horizon_intervals",
    "interval_minutes",
    "timeline",
    "summary",
}


class DummyRequest:
    def __init__(self, hass=None, json_data=None, admin=True):
        self.app = {"hass": hass} if hass is not None else {}
        self._json_data = json_data or {}
        self._user = SimpleNamespace(is_admin=admin) if admin is not None else None

    def get(self, key, default=None):
        if key == "hass_user":
            return self._user
        return default

    async def json(self):
        return self._json_data


def _explicit_payload():
    n = 8
    return {
        "prices": [1.0, 2.0, 3.0, 4.0, 5.0, 4.0, 3.0, 2.0][:n],
        "solar": [0.0, 0.1, 0.3, 0.5, 0.5, 0.3, 0.1, 0.0][:n],
        "consumption": [0.3] * n,
        "soc_start": 5.0,
    }


@pytest.mark.asyncio
async def test_planner_simulate_requires_admin():
    request = DummyRequest(json_data=_explicit_payload(), admin=False)
    response = await planning_api.OIGCloudPlannerSimulateView().post(request, "box")
    assert response.status == 403


@pytest.mark.asyncio
async def test_planner_simulate_explicit_series_shape():
    request = DummyRequest(json_data=_explicit_payload())
    response = await planning_api.OIGCloudPlannerSimulateView().post(request, "box")
    assert response.status == 200

    import json as _json

    body = _json.loads(response.body)
    assert REQUIRED_TOP_KEYS <= body.keys()
    assert REQUIRED_SUMMARY_KEYS <= body["summary"].keys()
    assert body["horizon_intervals"] == 8
    assert len(body["timeline"]) == 8
    for interval in body["timeline"]:
        assert REQUIRED_TIMELINE_KEYS <= interval.keys()
    assert body["preset"] is None


@pytest.mark.asyncio
async def test_planner_simulate_unknown_preset_rejected():
    request = DummyRequest(json_data={"preset": "does-not-exist"})
    response = await planning_api.OIGCloudPlannerSimulateView().post(request, "box")
    assert response.status == 400


@pytest.mark.asyncio
async def test_planner_simulate_mismatched_lengths_rejected():
    payload = _explicit_payload()
    payload["solar"] = payload["solar"][:-1]
    request = DummyRequest(json_data=payload)
    response = await planning_api.OIGCloudPlannerSimulateView().post(request, "box")
    assert response.status == 400


@pytest.mark.asyncio
async def test_planner_simulate_series_too_long_rejected():
    n = planning_api.MAX_SIMULATE_INTERVALS + 1
    payload = {
        "prices": [1.0] * n,
        "solar": [0.0] * n,
        "consumption": [0.3] * n,
        "soc_start": 5.0,
    }
    request = DummyRequest(json_data=payload)
    response = await planning_api.OIGCloudPlannerSimulateView().post(request, "box")
    assert response.status == 400


@pytest.mark.asyncio
async def test_planner_simulate_missing_series_without_preset_rejected():
    request = DummyRequest(json_data={"soc_start": 5.0})
    response = await planning_api.OIGCloudPlannerSimulateView().post(request, "box")
    assert response.status == 400


@pytest.mark.asyncio
async def test_planner_simulate_all_presets_load_and_run():
    presets = planning_api._load_presets()
    for preset_id in presets["presets"]:
        request = DummyRequest(json_data={"preset": preset_id})
        response = await planning_api.OIGCloudPlannerSimulateView().post(request, "box")
        assert response.status == 200, f"preset {preset_id} failed: {response.body}"


@pytest.mark.asyncio
async def test_planner_simulate_preset_determinism():
    """Same preset id -> identical plan output across two independent calls."""
    request_a = DummyRequest(json_data={"preset": "shoulder"})
    request_b = DummyRequest(json_data={"preset": "shoulder"})

    response_a = await planning_api.OIGCloudPlannerSimulateView().post(request_a, "box")
    response_b = await planning_api.OIGCloudPlannerSimulateView().post(request_b, "box")

    assert response_a.status == 200
    assert response_b.status == 200
    assert response_a.body == response_b.body


@pytest.mark.asyncio
async def test_planner_simulate_no_side_effects_on_store_or_live_state():
    """The simulator must never touch hass.data (plan store / live state)."""
    store_sentinel = {
        "oig_cloud": {
            "planning_system": SimpleNamespace(marker="untouched"),
            "some_live_state": {"soc": 42},
        }
    }
    hass = SimpleNamespace(data=copy.deepcopy(store_sentinel))
    before = copy.deepcopy(hass.data)

    request = DummyRequest(hass=hass, json_data={"preset": "winter_high_price"})
    response = await planning_api.OIGCloudPlannerSimulateView().post(request, "box")

    assert response.status == 200
    # hass.data must be byte-for-byte unchanged: the view never reads or
    # writes it (it never even dereferences request.app["hass"]).
    assert hass.data["oig_cloud"]["some_live_state"] == before["oig_cloud"]["some_live_state"]
    assert hass.data["oig_cloud"]["planning_system"].marker == "untouched"


@pytest.mark.asyncio
async def test_planner_simulate_ui_style_draft_round_trip_200():
    """Owner live repro guard: a UI-style draft — the shape the FE simulator
    posts after `simulator-fetcher.ts` converts `expensive_percentile` from
    the display percent to the registry-canonical fraction
    (config_registry.py:314, scale=100) — must simulate cleanly. planning_api
    itself stays strict/unchanged: it accepts the SAME canonical units the
    rest of the config surface already uses, no special-casing.
    """
    payload = _explicit_payload()
    payload["config_overrides"] = {
        "expensive_percentile": 0.7,
        "battery_comfort_soc_percent": 50,
    }
    request = DummyRequest(json_data=payload)
    response = await planning_api.OIGCloudPlannerSimulateView().post(request, "box")
    assert response.status == 200


@pytest.mark.asyncio
async def test_planner_simulate_raw_ui_percent_still_rejected():
    """Documents the failure this migration/FE-fix closes: the RAW display
    percent (70), unconverted, must still 400 — planning_api enforces the
    canonical fraction, it does not guess at units.
    """
    payload = _explicit_payload()
    payload["config_overrides"] = {"expensive_percentile": 70}
    request = DummyRequest(json_data=payload)
    response = await planning_api.OIGCloudPlannerSimulateView().post(request, "box")
    assert response.status == 400

    import json as _json

    body = _json.loads(response.body)
    assert "(0, 1]" in body["error"]


def test_planner_simulate_config_overrides_applied():
    """config_overrides must win over default_config when building PlannerInputs."""
    defaults = planning_api._load_presets()["default_config"]
    inputs = planning_api._build_planner_inputs(
        prices=[1.0, 1.0],
        solar=[0.0, 0.0],
        consumption=[0.1, 0.1],
        soc_start_kwh=5.0,
        config_overrides={"max_capacity_kwh": 20.0, "hw_min_kwh": 4.0},
        defaults=defaults,
    )
    assert inputs.max_capacity_kwh == 20.0
    assert inputs.hw_min_kwh == 4.0
    # Unoverridden keys still come from defaults.
    assert inputs.charge_rate_kw == defaults["charge_rate_kw"]


def test_setup_planning_api_views_registers_planner_simulate():
    class DummyHTTP:
        def __init__(self):
            self.views = []

        def register_view(self, view):
            self.views.append(view)

    hass = SimpleNamespace(http=DummyHTTP())
    planning_api.setup_planning_api_views(hass)
    assert any(
        isinstance(v, planning_api.OIGCloudPlannerSimulateView) for v in hass.http.views
    )


# --- planner_simulate presets GET (fe/fix): the overlay fetches the preset
# list to populate chips; POST-only left it 404. Mirrors the simulate view's
# admin gate; the list is a fully synthetic read of the bundled JSON. ---


@pytest.mark.asyncio
async def test_planner_simulate_presets_requires_admin():
    request = DummyRequest(admin=False)
    response = await planning_api.OIGCloudPlannerSimulatePresetsView().get(request, "box")
    assert response.status == 403


@pytest.mark.asyncio
async def test_planner_simulate_presets_returns_id_and_name_for_every_preset():
    request = DummyRequest()
    response = await planning_api.OIGCloudPlannerSimulatePresetsView().get(request, "box")
    assert response.status == 200

    import json as _json

    items = _json.loads(response.body)
    presets = planning_api._load_presets()["presets"]
    assert isinstance(items, list) and len(items) == len(presets)
    for item in items:
        # Contract: [{id, name}] — name is a short CZ label for the chip.
        assert set(item.keys()) == {"id", "name"}
        assert item["id"] in presets
        assert isinstance(item["name"], str) and item["name"]


def test_setup_planning_api_views_registers_planner_simulate_presets():
    class DummyHTTP:
        def __init__(self):
            self.views = []

        def register_view(self, view):
            self.views.append(view)

    hass = SimpleNamespace(http=DummyHTTP())
    planning_api.setup_planning_api_views(hass)
    assert any(
        isinstance(v, planning_api.OIGCloudPlannerSimulatePresetsView)
        for v in hass.http.views
    )
