"""M1 config-wiring hotfixes regression tests.

Covers 4 independent bugs in production today:

(a) Heater power: config flow stores `boiler_effective_power_w` (W) but
    `_build_planner_topology` reads `boiler_heater_power_kw` (never written),
    silently defaulting to 2.0 kW for every install.

(b) Horizon key: `planner_input_horizon_hours` reads `boiler_horizon_hours`
    (never written); real key is `boiler_planning_horizon_hours`.

(c) planner_settings POST admin gate: `request.app.get("hass_user")` is never
    set in real HA, so the AUTO toggle always 403s. Must use the
    request-mapping-first / app fallback pattern used by every other admin
    view.

(d) Root cause of "Odhad ceny 0.00 Kc vs sit 0.00" while plan_slots hold
    ~8.5 kWh of grid heating. (Suspects investigated; see dedicated test.)
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.api import ha_rest_api as api_module
from custom_components.oig_cloud.boiler.thermal import heating_per_slot


# ---------------------------------------------------------------------------
# (a) Heater power W -> kW wiring
# ---------------------------------------------------------------------------


def test_build_planner_topology_consumes_boiler_effective_power_w_2000w():
    """2000 W in config must yield a 2.0 kW topology heater."""
    from custom_components.oig_cloud.boiler.runtime import _build_planner_topology

    topo = _build_planner_topology(
        {"boiler_effective_power_w": 2000, "boiler_volume_l": 100.0}
    )
    assert topo.heater_power_kw == pytest.approx(2.0)


def test_build_planner_topology_consumes_boiler_effective_power_w_6600w():
    """6600 W in config must yield a 6.6 kW topology heater."""
    from custom_components.oig_cloud.boiler.runtime import _build_planner_topology

    topo = _build_planner_topology(
        {"boiler_effective_power_w": 6600, "boiler_volume_l": 100.0}
    )
    assert topo.heater_power_kw == pytest.approx(6.6)


def test_build_planner_topology_heater_power_kw_override_takes_precedence():
    """Existing `boiler_heater_power_kw` (kW) override must still win when set."""
    from custom_components.oig_cloud.boiler.runtime import _build_planner_topology

    topo = _build_planner_topology(
        {
            "boiler_effective_power_w": 6600,
            "boiler_heater_power_kw": 4.2,
            "boiler_volume_l": 100.0,
        }
    )
    assert topo.heater_power_kw == pytest.approx(4.2)


def test_build_planner_topology_falls_back_to_default_when_neither_set():
    """When neither key is present, fall back to the module default (2.0 kW)."""
    from custom_components.oig_cloud.boiler.runtime import (
        _DEFAULT_HEATER_POWER_KW,
        _build_planner_topology,
    )

    topo = _build_planner_topology({"boiler_volume_l": 100.0})
    assert topo.heater_power_kw == pytest.approx(_DEFAULT_HEATER_POWER_KW)


def test_higher_power_config_needs_fewer_slots_for_same_demand():
    """6.6 kW config delivers more heat per slot than 2.0 kW for the same demand.

    For a fixed per-slot demand the higher-power config needs strictly fewer
    heating slots than the lower-power one (same slot duration, same demand).
    This is the user-visible consequence of the wiring bug.
    """
    slot_minutes = 15
    heat_low = heating_per_slot(2.0, slot_minutes)   # 0.5 kWh per slot
    heat_high = heating_per_slot(6.6, slot_minutes)  # 1.65 kWh per slot
    demand_kwh = 8.5

    slots_low = -(-int(demand_kwh * 1000) // int(heat_low * 1000))
    slots_high = -(-int(demand_kwh * 1000) // int(heat_high * 1000))

    assert slots_low > slots_high, (
        f"6.6 kW should need fewer slots than 2.0 kW; got "
        f"slots_low={slots_low}, slots_high={slots_high}"
    )


# ---------------------------------------------------------------------------
# (b) Horizon key wiring + 12..48 clamp
# ---------------------------------------------------------------------------


def test_planner_input_horizon_hours_reads_real_key():
    """planner_input_horizon_hours must read `boiler_planning_horizon_hours`."""
    from custom_components.oig_cloud.boiler.runtime import planner_input_horizon_hours

    config = {"boiler_planning_horizon_hours": 30}
    assert planner_input_horizon_hours(config) == 30


def test_planner_input_horizon_hours_default_when_unset():
    """When the real key is absent, fall back to the planner_core default."""
    from custom_components.oig_cloud.boiler.planner_core import DEFAULT_HORIZON_HOURS
    from custom_components.oig_cloud.boiler.runtime import planner_input_horizon_hours

    assert planner_input_horizon_hours({}) == DEFAULT_HORIZON_HOURS


@pytest.mark.parametrize("raw,expected", [(5, 12), (11, 12), (12, 12),
                                          (36, 36), (48, 48), (49, 48),
                                          (200, 48), (0, 12)])
def test_planner_input_horizon_hours_clamped_to_12_48(raw, expected):
    """Horizon must be clamped to the 12..48 hour window."""
    from custom_components.oig_cloud.boiler.runtime import planner_input_horizon_hours

    assert planner_input_horizon_hours(
        {"boiler_planning_horizon_hours": raw}
    ) == expected


def test_planner_planning_horizon_hours_no_longer_in_dead_option_keys():
    """After un-deading, `boiler_planning_horizon_hours` must not be stripped."""
    from custom_components.oig_cloud.config_migration import _DEAD_OPTION_KEYS
    from custom_components.oig_cloud.const import CONF_BOILER_PLANNING_HORIZON_HOURS

    assert CONF_BOILER_PLANNING_HORIZON_HOURS not in _DEAD_OPTION_KEYS


# ---------------------------------------------------------------------------
# (c) planner_settings POST admin gate fallback
# ---------------------------------------------------------------------------


_ADMIN_USER = SimpleNamespace(is_admin=True)


class _MappingOnlyRequest:
    """Real HA: `hass_user` is on the request mapping, not on the app.

    The view must read it via request.get("hass_user") and ignore request.app.
    """

    def __init__(self, hass):
        # Note: NO `hass_user` on app — that is exactly the production shape.
        self.app = {"hass": hass}

    def get(self, key, default=None):
        if key == "hass_user":
            return _ADMIN_USER
        return default


class _AppOnlyRequest:
    """Test harness: `hass_user` is only on `request.app`, not on the mapping.

    Mirrors the existing DummyRequest in test_ha_rest_api_views.py.
    """

    def __init__(self, hass):
        self.app = {"hass": hass, "hass_user": _ADMIN_USER}

    def get(self, key, default=None):
        return default


class _DummyJsonRequest(_AppOnlyRequest):
    """JSON POST body, mirroring DummyJsonRequest in the existing test file."""

    def __init__(self, hass, payload):
        super().__init__(hass)
        self._payload = payload

    async def json(self):
        return self._payload


def _hass_with_entry(box_id: str = "box_hotfix"):
    from custom_components.oig_cloud.const import DOMAIN

    class _Entry:
        entry_id = "entry_hotfix"
        options = {}
        data = {}
        domain = DOMAIN

    class _ConfigEntries:
        def __init__(self):
            self._entries = [_Entry()]
            self.updated = []

        def async_entries(self, _domain):
            return self._entries

        def async_update_entry(self, entry, options=None):
            entry.options = options or {}
            self.updated.append(entry)

    class _Hass:
        data = {}

        def __init__(self):
            self.config_entries = _ConfigEntries()

    hass = _Hass()
    hass.data[DOMAIN] = {
        "entry_hotfix": {
            "coordinator": SimpleNamespace(data={box_id: {}})
        }
    }
    return hass, _Entry


@pytest.mark.asyncio
async def test_planner_settings_post_accepts_request_mapping_only_user():
    """Real-HA shape: hass_user on request.get(...), NOT on request.app[...].

    Pre-fix the view read `request.app.get("hass_user")` and returned 403.
    """
    from custom_components.oig_cloud.const import CONF_AUTO_MODE_SWITCH

    hass, _entry_cls = _hass_with_entry()
    view = api_module.OIGCloudPlannerSettingsView()
    request = _MappingOnlyRequest(hass)

    response = await view.post(
        _MappingOnlyJsonRequest(request, {"auto_mode_switch_enabled": True}),
        "box_hotfix",
    )
    payload = json.loads(response.text)
    assert response.status == 200, payload
    assert payload["updated"] is True
    assert payload["auto_mode_switch_enabled"] is True


class _MappingOnlyJsonRequest(_MappingOnlyRequest):
    """JSON POST body for the mapping-only request shape."""

    def __init__(self, base, payload):
        self.app = base.app
        self._payload = payload

    def get(self, key, default=None):
        if key == "hass_user":
            return _ADMIN_USER
        return default

    async def json(self):
        return self._payload


@pytest.mark.asyncio
async def test_planner_settings_post_still_rejects_non_admin_via_mapping():
    """Non-admin user carried via request[...] must still be denied (403)."""
    hass, _entry_cls = _hass_with_entry()
    view = api_module.OIGCloudPlannerSettingsView()

    class _Req:
        app = {"hass": hass}

        def get(self, key, default=None):
            if key == "hass_user":
                return SimpleNamespace(is_admin=False)
            return default

        async def json(self):
            return {"auto_mode_switch_enabled": True}

    response = await view.post(_Req(), "box_hotfix")
    assert response.status == 403


@pytest.mark.asyncio
async def test_planner_settings_post_app_only_path_still_works_for_tests():
    """Legacy harness shape (hass_user only on request.app) must still pass.

    Guarantees the existing test_ha_rest_api_views.test_planner_settings_view_get_and_post
    keeps working after the fix.
    """
    hass, _entry_cls = _hass_with_entry()
    view = api_module.OIGCloudPlannerSettingsView()

    response = await view.post(
        _DummyJsonRequest(hass, {"auto_mode_switch_enabled": True}),
        "box_hotfix",
    )
    payload = json.loads(response.text)
    assert response.status == 200, payload
    assert payload["updated"] is True


# ---------------------------------------------------------------------------
# (d) Root-cause "Odhad ceny 0.00 Kc vs sit 0.00" while plan_slots hold
# ~8.5 kWh of grid heating.  Cause: when spot_prices is empty, the planner
# silently substitutes 0.0 for the missing grid price
# (planner_core._slot_allocation), so cost_czk=0.0 for every grid-heated
# slot and the Bojler tab emits "Odhad ceny 0.00 Kc" against a non-zero
# real-time sit value.  Fix: surface `cost_estimate_complete=False` on
# PlanResult, and let the DTO render `None` for the three cost fields.
# ---------------------------------------------------------------------------


def test_plan_result_marks_cost_incomplete_when_spot_price_missing():
    """PlanResult.cost_estimate_complete must be False when spot_prices empty."""
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core
    from custom_components.oig_cloud.boiler.planner_contract import (
        AlternativeSourceCapability,
        PlannerInput,
    )
    from custom_components.oig_cloud.boiler.models import (
        BoilerProfile,
        BoilerThermalTopology,
    )

    profile = BoilerProfile(
        category="workday_winter",
        hourly_avg={hour: 0.0 for hour in range(24)},
        confidence={hour: 1.0 for hour in range(24)},
    )
    topology = BoilerThermalTopology(
        stratification_mode="two_zone",
        thermometer_placements=["top"],
        temperature_topology="top_only",
        tank_volume_l=100.0,
        target_temp_c=50.0,
        cold_inlet_temp_c=10.0,
        heater_power_kw=6.6,
        standing_loss_coefficient=0.0,
    )
    now = datetime(2026, 7, 28, 4, 0, tzinfo=timezone.utc)
    planner_input = PlannerInput(
        entry_id="m1_d",
        box_id="box_m1_d",
        profile=profile,
        # No spot prices -> spot_price=None for every slot.
        spot_prices={},
        overflow_windows=[],
        deadline_time="06:00",
        topology=topology,
        current_top_temp_c=40.0,
        current_bottom_temp_c=None,
        temperature_updated_at=now,
        alt_source_capability=AlternativeSourceCapability.DISABLED,
        alt_cost_kwh=0.0,
    )
    result = plan_comfort_core(planner_input, now=now)

    assert result.cost_estimate_complete is False
    # Estimated_cost is still a number — it's the sum of the substituted
    # zeros.  The DTO reader must consult cost_estimate_complete, not the
    # number itself, to decide whether to render "0.00 Kc" or "—".
    assert result.estimated_cost_czk == pytest.approx(0.0)


def test_plan_result_marks_cost_complete_when_spot_prices_present():
    """When spot prices are populated, cost_estimate_complete must be True."""
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core
    from custom_components.oig_cloud.boiler.planner_contract import (
        AlternativeSourceCapability,
        PlannerInput,
    )
    from custom_components.oig_cloud.boiler.models import (
        BoilerProfile,
        BoilerThermalTopology,
    )

    profile = BoilerProfile(
        category="workday_winter",
        hourly_avg={hour: 0.0 for hour in range(24)},
        confidence={hour: 1.0 for hour in range(24)},
    )
    topology = BoilerThermalTopology(
        stratification_mode="two_zone",
        thermometer_placements=["top"],
        temperature_topology="top_only",
        tank_volume_l=100.0,
        target_temp_c=50.0,
        cold_inlet_temp_c=10.0,
        heater_power_kw=6.6,
        standing_loss_coefficient=0.0,
    )
    now = datetime(2026, 7, 28, 4, 0, tzinfo=timezone.utc)
    spot_prices = {
        now + timedelta(minutes=15 * i): 3.0 for i in range(48)
    }
    planner_input = PlannerInput(
        entry_id="m1_d_full",
        box_id="box_m1_d_full",
        profile=profile,
        spot_prices=spot_prices,
        overflow_windows=[],
        deadline_time="06:00",
        topology=topology,
        current_top_temp_c=40.0,
        current_bottom_temp_c=None,
        temperature_updated_at=now,
        alt_source_capability=AlternativeSourceCapability.DISABLED,
        alt_cost_kwh=0.0,
    )
    result = plan_comfort_core(planner_input, now=now)

    assert result.cost_estimate_complete is True
    # With 3 Kč/kWh and any grid-heated slots, cost > 0.
    grid_kwh_total = sum(s.grid_kwh for s in result.slots)
    if grid_kwh_total > 0:
        assert result.estimated_cost_czk > 0.0


def test_plan_summary_dto_emits_null_costs_when_incomplete():
    """plan_summary DTO must emit None (not 0.00) when cost_estimate_complete=False.

    This is the direct fix for the live-box symptom "Odhad ceny 0.00 Kc
    vs sit 0.00" — the FE renders "—" instead of a misleading zero.
    """
    from custom_components.oig_cloud.boiler.api_views import _build_plan_summary_dto

    class _FakePlanResult:
        estimated_cost_czk = 0.0
        cost_if_all_grid = 0.0
        cost_if_all_alt = 0.0
        cost_estimate_complete = False  # spot prices were missing

    dto = _build_plan_summary_dto(
        _FakePlanResult(), {"boiler_deadline_time": "06:00"}
    )
    assert dto is not None
    assert dto["estimated_cost_czk"] is None
    assert dto["cost_if_all_grid"] is None
    assert dto["cost_if_all_alt"] is None
    # deadline_time is independent of cost data — must still flow through.
    assert dto["deadline_time"] == "06:00"


def test_plan_summary_dto_emits_numeric_costs_when_complete():
    """When cost_estimate_complete=True, the numeric totals must round to 2 dp."""
    from custom_components.oig_cloud.boiler.api_views import _build_plan_summary_dto

    class _FakePlanResult:
        estimated_cost_czk = 3.504
        cost_if_all_grid = 7.205
        cost_if_all_alt = 5.101
        cost_estimate_complete = True

    dto = _build_plan_summary_dto(
        _FakePlanResult(), {"boiler_deadline_time": "06:00"}
    )
    assert dto["estimated_cost_czk"] == pytest.approx(3.50, abs=0.01)
    assert dto["cost_if_all_grid"] == pytest.approx(7.21, abs=0.01)
    assert dto["cost_if_all_alt"] == pytest.approx(5.10, abs=0.01)