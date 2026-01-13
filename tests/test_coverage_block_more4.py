from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from homeassistant.helpers import frame
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.api import ha_rest_api as api_module
from custom_components.oig_cloud.battery_forecast.presentation import (
    unified_cost_tile_helpers as uct_module,
)
from custom_components.oig_cloud.battery_forecast.strategy import hybrid_planning
from custom_components.oig_cloud.battery_forecast.strategy import hybrid_scoring
from custom_components.oig_cloud.battery_forecast.types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
)
from custom_components.oig_cloud.battery_forecast.timeline import extended as extended_module
from custom_components.oig_cloud.boiler.coordinator import BoilerCoordinator
from custom_components.oig_cloud.boiler.models import BoilerPlan, BoilerProfile, BoilerSlot, EnergySource
from custom_components.oig_cloud.boiler.planner import BoilerPlanner
from custom_components.oig_cloud.boiler.profiler import BoilerProfiler
from custom_components.oig_cloud.config import schema as schema_module
from custom_components.oig_cloud.core import local_mapper as local_mapper
from custom_components.oig_cloud.core.telemetry_store import TelemetryStore


class DummyRequest:
    def __init__(self, hass, query=None):
        self.app = {"hass": hass}
        self.query = query or {}


class DummyComponent:
    def __init__(self, entities):
        self.entities = entities


class DummyHass:
    def __init__(self):
        self.data = {}
        self.config_entries = SimpleNamespace(async_entries=lambda _d: [])
        self.states = SimpleNamespace(get=lambda _eid: None, async_all=lambda _d: [])


@pytest.mark.asyncio
async def test_unified_cost_tile_fallback_compare_and_error(monkeypatch):
    class Store:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return {"cost_comparison": {"ok": True}}

    class Entity:
        entity_id = "sensor.oig_123_battery_forecast"

        async def build_unified_cost_tile(self):
            return {"today": {"delta": 1.0}}

    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([Entity()])
    monkeypatch.setattr("homeassistant.helpers.storage.Store", Store)

    view = api_module.OIGCloudUnifiedCostTileView()
    response = await view.get(DummyRequest(hass), "123")
    payload = json.loads(response.text)
    assert payload["comparison"]["ok"] is True

    class BadStore:
        def __init__(self, _hass, _version, _key):
            raise RuntimeError("boom")

    monkeypatch.setattr("homeassistant.helpers.storage.Store", BadStore)
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 500


@pytest.mark.asyncio
async def test_detail_tabs_view_outer_exception(monkeypatch):
    hass = DummyHass()

    class BadComponent:
        @property
        def entities(self):
            raise RuntimeError("boom")

    hass.data["sensor"] = BadComponent()
    view = api_module.OIGCloudDetailTabsView()
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 500


@pytest.mark.asyncio
async def test_detail_tabs_view_tab_filter_from_precomputed(monkeypatch):
    class Store:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return {"detail_tabs": {"today": {"ok": True}}}

    hass = DummyHass()
    monkeypatch.setattr("homeassistant.helpers.storage.Store", Store)

    view = api_module.OIGCloudDetailTabsView()
    response = await view.get(DummyRequest(hass, {"tab": "today"}), "123")
    payload = json.loads(response.text)
    assert payload["today"]["ok"] is True


@pytest.mark.asyncio
async def test_build_today_cost_data_branches(monkeypatch):
    now = datetime(2025, 1, 1, 12, 30, 0, tzinfo=dt_util.UTC)
    monkeypatch.setattr(uct_module.dt_util, "now", lambda: now)
    monkeypatch.setattr(uct_module.dt_util, "as_local", lambda dt: dt)

    async def _fake_yesterday(*_a, **_k):
        return "ok"

    async def _fake_tomorrow(*_a, **_k):
        return "ok"

    monkeypatch.setattr(uct_module, "analyze_yesterday_performance", _fake_yesterday)
    monkeypatch.setattr(uct_module, "analyze_tomorrow_plan", _fake_tomorrow)

    class Sensor:
        def __init__(self):
            self._plans_store = None
            self.coordinator = SimpleNamespace(data={"spot_prices": {"timeline": []}})

        async def _build_day_timeline(self, _day, _storage_plans=None):
            completed = []
            start = datetime(2025, 1, 1, 10, 0, 0, tzinfo=dt_util.UTC)
            for i in range(10):
                completed.append(
                    {
                        "time": (start + timedelta(minutes=15 * i)).isoformat(),
                        "planned": {"net_cost": 1.0},
                        "actual": {"net_cost": 1.0},
                    }
                )
            return {
                "intervals": completed
                + [
                    {
                        "time": "2025-01-01T12:30:00+00:00",
                        "planned": {"net_cost": 1.0},
                        "actual": {"net_cost": 1.0},
                        "duration_minutes": 30,
                    }
                ]
            }

        def _group_intervals_by_mode(self, _intervals, _key):
            return []

    data = await uct_module.build_today_cost_data(Sensor())
    assert data["performance"] == "on_plan"
    assert data["eod_prediction"]["confidence"] == "medium"


@pytest.mark.asyncio
async def test_build_tomorrow_cost_data_empty_modes(monkeypatch):
    monkeypatch.setattr(uct_module.dt_util, "now", lambda: datetime(2025, 1, 1, 0, 0, 0))

    class _Intervals:
        def __init__(self, first, later):
            self._first = first
            self._later = later
            self._count = 0

        def __iter__(self):
            self._count += 1
            return iter(self._first if self._count == 1 else self._later)

        def __len__(self):
            return len(self._later)

    class Sensor:
        async def _build_day_timeline(self, _day):
            intervals = _Intervals(
                [{"planned": {"net_cost": 0}}],
                [None],
            )
            return {"intervals": intervals}

        def _group_intervals_by_mode(self, _intervals, _key):
            return []

    data = await uct_module.build_tomorrow_cost_data(Sensor(), mode_names={})
    assert data["dominant_mode_name"] == "Unknown"


def test_hybrid_planning_gap_fill_variants():
    strategy = SimpleNamespace(
        config=SimpleNamespace(max_ups_price_czk=1.0),
        sim_config=SimpleNamespace(ac_dc_efficiency=0.9),
        MIN_UPS_PRICE_BAND_PCT=0.08,
    )
    extended = hybrid_planning.extend_ups_blocks_by_price_band(
        strategy,
        charging_intervals={0, 2},
        prices=[0.5, 0.51, 0.52],
        blocked_indices=set(),
    )
    assert extended == {1}


def test_hybrid_scoring_reason_branches(monkeypatch):
    strategy = SimpleNamespace(
        sim_config=SimpleNamespace(ac_dc_efficiency=0.9, dc_ac_efficiency=0.9),
        LOOKAHEAD_INTERVALS=4,
        MIN_PRICE_SPREAD_PERCENT=10,
        simulator=SimpleNamespace(
            simulate=lambda **_k: SimpleNamespace(battery_end=3.0, solar_used_direct=0.0),
            calculate_cost=lambda *_a, **_k: 1.0,
        ),
        config=SimpleNamespace(
            weight_cost=1.0,
            weight_battery_preservation=1.0,
            weight_self_consumption=1.0,
            charging_strategy=SimpleNamespace(),
            max_ups_price_czk=1.0,
        ),
        _planning_min=2.0,
        _target=4.0,
        _max=10.0,
    )

    analysis = hybrid_scoring.analyze_future_prices(
        strategy,
        prices=[1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        export_prices=[0.0] * 20,
        consumption_forecast=[0.1] * 20,
    )
    assert analysis[0]["charge_reason"]

    def _score(_strategy, mode, **_k):
        return {CBB_MODE_HOME_UPS: 4, CBB_MODE_HOME_III: 3, CBB_MODE_HOME_II: 2, CBB_MODE_HOME_I: 1}[mode]

    monkeypatch.setattr(hybrid_scoring, "score_mode", _score)
    mode, reason, _ = hybrid_scoring.select_best_mode(
        strategy,
        battery=3.0,
        solar=0.0,
        load=0.0,
        price=2.0,
        export_price=0.0,
        cheap_threshold=0.5,
        expensive_threshold=3.0,
        very_cheap=1.0,
    )
    assert mode == CBB_MODE_HOME_UPS
    assert reason == "opportunistic_charge"

    def _score_home3(_strategy, mode, **_k):
        return {CBB_MODE_HOME_III: 5, CBB_MODE_HOME_UPS: 4, CBB_MODE_HOME_II: 1, CBB_MODE_HOME_I: 0}[mode]

    monkeypatch.setattr(hybrid_scoring, "score_mode", _score_home3)
    mode, reason, _ = hybrid_scoring.select_best_mode(
        strategy,
        battery=5.0,
        solar=0.0,
        load=1.0,
        price=2.0,
        export_price=0.0,
        cheap_threshold=0.5,
        expensive_threshold=3.0,
        very_cheap=1.0,
    )
    assert reason == "preserve_battery_high_solar"


@pytest.mark.asyncio
async def test_timeline_extended_missing_branches(monkeypatch):
    target_day = date.today() - timedelta(days=1)
    date_str = target_day.strftime(extended_module.DATE_FMT)
    storage_plans = {"detailed": {date_str: {"intervals": [], "invalid": True}}}

    class Sensor:
        def __init__(self):
            self._plans_store = SimpleNamespace(async_load=lambda: storage_plans)
            self._hass = SimpleNamespace()
            self._baseline_repair_attempts = set()
            self._daily_plan_state = None
            self._timeline_data = [{"time": "bad-time"}]
            self._mode_optimization_result = None

        def _is_baseline_plan_invalid(self, plan):
            return True

        async def _save_plan_to_storage(self, *_a, **_k):
            return None

        async def _create_baseline_plan(self, *_a, **_k):
            return False

        def _get_current_mode(self):
            return 0

        def _get_current_battery_soc_percent(self):
            return 50.0

        def _get_current_battery_capacity(self):
            return 5.0

    async def fake_build_modes(*_a, **_k):
        key = dt_util.as_local(datetime.combine(target_day, datetime.min.time())).strftime(
            extended_module.DATETIME_FMT
        )
        return {key: {"mode": 0, "mode_name": "Home 1"}}

    async def fake_fetch_interval(*_a, **_k):
        return None

    monkeypatch.setattr(extended_module.history_module, "build_historical_modes_lookup", fake_build_modes)
    monkeypatch.setattr(extended_module.history_module, "fetch_interval_from_history", fake_fetch_interval)

    sensor = Sensor()
    result = await extended_module.build_day_timeline(sensor, target_day, storage_plans)
    assert result["date"] == date_str


def test_schema_edge_cases():
    ok, err = schema_module.validate_tariff_hours("6", "22,2")
    assert ok is True
    assert err is None


def test_local_mapper_edge_cases():
    assert local_mapper._normalize_domains([]) == ("sensor",)
    assert local_mapper._normalize_value_map({}) is None


@pytest.fixture(autouse=True)
def _disable_frame_report(monkeypatch):
    monkeypatch.setattr(frame, "report_usage", lambda *_a, **_k: None)


@pytest.mark.asyncio
async def test_boiler_coordinator_energy_tracking(monkeypatch):
    hass = DummyHass()

    class State:
        def __init__(self, state, attrs=None):
            self.state = state
            self.attributes = attrs or {}

    hass.states.get = lambda eid: {
        "sensor.oig_2206237016_boiler_manual_mode": State("Vypnuto"),
        "sensor.oig_2206237016_boiler_current_cbb_w": State("10"),
        "sensor.oig_2206237016_boiler_day_w": State("1000"),
        "sensor.alt_energy": State("2000", {"unit_of_measurement": "Wh"}),
    }.get(eid)

    config = {"boiler_alt_energy_sensor": "sensor.alt_energy"}
    coordinator = BoilerCoordinator(hass, config)
    stats = await coordinator._track_energy_sources()
    assert stats["current_source"] == EnergySource.FVE.value
    assert stats["alt_kwh"] == 2.0

    coordinator._current_profile = None
    await coordinator._update_plan()

    coordinator._current_profile = BoilerProfile(category="c1")
    coordinator.planner.async_create_plan = SimpleNamespace(side_effect=RuntimeError("boom"))


def test_boiler_planner_overflow_window_and_totals():
    planner = BoilerPlanner(hass=None, slot_minutes=30, alt_cost_kwh=2.0, has_alternative=True)
    start = datetime(2025, 1, 1, 0, 0, 0)
    end = start + timedelta(minutes=30)
    assert planner._is_in_overflow_window(start, end, [(start + timedelta(minutes=10), end)]) is True

    plan = BoilerPlan(created_at=start, valid_until=end)
    plan.slots = [
        BoilerSlot(start=start, end=end, avg_consumption_kwh=1.0, confidence=0.5, recommended_source=EnergySource.FVE),
        BoilerSlot(start=start, end=end, avg_consumption_kwh=2.0, confidence=0.5, recommended_source=EnergySource.ALTERNATIVE, alt_price_kwh=1.0),
    ]
    planner._calculate_plan_totals(plan)
    assert plan.fve_kwh == 1.0
    assert plan.alt_kwh == 2.0


@pytest.mark.asyncio
async def test_boiler_profiler_paths(monkeypatch):
    hass = DummyHass()
    profiler = BoilerProfiler(hass=hass, energy_sensor="sensor.boiler", lookback_days=1)

    monkeypatch.setattr("custom_components.oig_cloud.boiler.profiler.get_instance", lambda _h: None)
    data = await profiler._fetch_history(datetime.now(), datetime.now())
    assert data == []
