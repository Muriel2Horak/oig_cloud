from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from types import SimpleNamespace

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.api import ha_rest_api as api_module
from custom_components.oig_cloud.battery_forecast.config import (
    ChargingStrategy,
    HybridConfig,
    NegativePriceStrategy,
    SimulatorConfig,
)
from custom_components.oig_cloud.battery_forecast.storage import plan_storage_baseline
from custom_components.oig_cloud.battery_forecast.strategy import hybrid as hybrid_module
from custom_components.oig_cloud.battery_forecast.strategy import hybrid_planning
from custom_components.oig_cloud.battery_forecast.strategy import hybrid_scoring
from custom_components.oig_cloud.battery_forecast.strategy.balancing import (
    StrategyBalancingPlan,
)
from custom_components.oig_cloud.battery_forecast.timeline import extended as extended_module
from custom_components.oig_cloud.battery_forecast.types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
)
from custom_components.oig_cloud.const import CONF_AUTO_MODE_SWITCH


class DummyStore:
    def __init__(self, data=None, *, fail=False):
        self._data = data or {}
        self._fail = fail

    async def async_load(self):
        if self._fail:
            raise RuntimeError("boom")
        return self._data

    async def async_save(self, _data):
        return None


class DummyRequest:
    def __init__(self, hass, query=None):
        self.app = {"hass": hass}
        self.query = query or {}


class DummyComponent:
    def __init__(self, entities):
        self.entities = entities


class DummyEntity:
    def __init__(self, entity_id):
        self.entity_id = entity_id


class DummyConfigEntries:
    def __init__(self, entries=None):
        self._entries = entries or []
        self.updated = []

    def async_entries(self, _domain):
        return self._entries

    def async_update_entry(self, entry, options=None):
        entry.options = options or {}
        self.updated.append(entry)

    def async_get_entry(self, entry_id):
        for entry in self._entries:
            if entry.entry_id == entry_id:
                return entry
        return None


class DummyHass:
    def __init__(self, config_entries=None):
        self.data = {}
        self.config_entries = config_entries or DummyConfigEntries()


class DummySim:
    def simulate(self, *, battery_start, mode, solar_kwh, load_kwh, force_charge=False):
        _ = mode
        _ = force_charge
        return SimpleNamespace(
            battery_end=battery_start + solar_kwh - load_kwh,
            solar_used_direct=solar_kwh,
        )

    def calculate_cost(self, _result, price, export_price):
        return price - export_price


class DummyConfig:
    max_ups_price_czk = 1.0
    min_ups_duration_intervals = 2
    negative_price_strategy = NegativePriceStrategy.CONSUME
    charging_strategy = ChargingStrategy.BELOW_THRESHOLD


class DummySimConfig:
    ac_dc_efficiency = 0.9


class DummyStrategy:
    MAX_ITERATIONS = 3
    MIN_UPS_PRICE_BAND_PCT = 0.08

    def __init__(self):
        self.config = DummyConfig()
        self.sim_config = DummySimConfig()
        self.simulator = DummySim()
        self._planning_min = 2.0
        self._target = 3.0


@pytest.mark.asyncio
async def test_baseline_plan_detailed_fallback(monkeypatch):
    sensor = SimpleNamespace(_plans_store=DummyStore({"detailed": {"2025-01-01": {"intervals": [{"time": "00:00", "consumption_kwh": 0.1}] * 96}}}), _timeline_data=[], _daily_plan_state=None)

    captured = {}

    async def fake_save(_sensor, date_str, intervals, meta):
        captured["intervals"] = intervals
        captured["meta"] = meta
        return True

    monkeypatch.setattr(plan_storage_baseline, "save_plan_to_storage", fake_save)

    ok = await plan_storage_baseline.create_baseline_plan(sensor, "2025-01-01")
    assert ok is True
    assert captured["intervals"][0]["time"] == "00:00"


@pytest.mark.asyncio
async def test_ensure_plan_exists_emergency_success(monkeypatch):
    sensor = SimpleNamespace()

    async def fake_exists(_sensor, _date):
        return False

    async def fake_create(_sensor, _date):
        return True

    monkeypatch.setattr(plan_storage_baseline, "plan_exists_in_storage", fake_exists)
    monkeypatch.setattr(plan_storage_baseline, "create_baseline_plan", fake_create)
    monkeypatch.setattr(
        plan_storage_baseline.dt_util,
        "now",
        lambda: datetime(2025, 1, 1, 3, 15, 0),
    )

    assert await plan_storage_baseline.ensure_plan_exists(sensor, "2025-01-01") is True


def test_hybrid_planning_negative_prices_added():
    strategy = DummyStrategy()
    strategy.config.negative_price_strategy = NegativePriceStrategy.CHARGE_GRID
    charging, reason, _ = hybrid_planning.plan_charging_intervals(
        strategy,
        initial_battery_kwh=5.0,
        prices=[-1.0],
        solar_forecast=[0.0],
        consumption_forecast=[0.0],
        balancing_plan=None,
        negative_price_intervals=[0],
    )
    assert charging == {0}
    assert reason is None


def test_hybrid_planning_add_ups_blocked_and_min_len():
    strategy = DummyStrategy()
    strategy.config.min_ups_duration_intervals = 1
    balancing_plan = StrategyBalancingPlan(
        charging_intervals=set(),
        holding_intervals=set(),
        mode_overrides={0: CBB_MODE_HOME_I},
        is_active=True,
    )
    charging, reason, _ = hybrid_planning.plan_charging_intervals(
        strategy,
        initial_battery_kwh=0.0,
        prices=[0.5],
        solar_forecast=[0.0],
        consumption_forecast=[0.2],
        balancing_plan=balancing_plan,
        negative_price_intervals=None,
    )
    assert charging == set()
    assert reason


def test_hybrid_planning_recovery_sets_index(monkeypatch):
    strategy = DummyStrategy()
    charging, reason, _ = hybrid_planning.plan_charging_intervals(
        strategy,
        initial_battery_kwh=1.0,
        prices=[0.5, 0.5],
        solar_forecast=[2.0, 0.0],
        consumption_forecast=[0.0, 0.0],
        balancing_plan=None,
        negative_price_intervals=None,
    )
    assert reason is None
    assert charging


def test_hybrid_planning_recovery_unreachable_sets_infeasible():
    strategy = DummyStrategy()
    strategy.config.max_ups_price_czk = 10.0
    charging, reason, _ = hybrid_planning.plan_charging_intervals(
        strategy,
        initial_battery_kwh=0.0,
        prices=[0.1, 0.1],
        solar_forecast=[0.0, 0.0],
        consumption_forecast=[1.0, 1.0],
        balancing_plan=None,
        negative_price_intervals=None,
    )
    assert charging
    assert reason


def test_hybrid_planning_final_validation_infeasible(monkeypatch):
    class MinimalStrategy(DummyStrategy):
        MAX_ITERATIONS = 0

    strategy = MinimalStrategy()

    monkeypatch.setattr(
        hybrid_planning,
        "simulate_trajectory",
        lambda *_a, **_k: [0.0, 0.0],
    )

    charging, reason, _ = hybrid_planning.plan_charging_intervals(
        strategy,
        initial_battery_kwh=5.0,
        prices=[5.0, 5.0],
        solar_forecast=[0.0, 0.0],
        consumption_forecast=[1.0, 1.0],
        balancing_plan=None,
        negative_price_intervals=None,
    )
    assert charging == set()
    assert reason


def test_hybrid_planning_gap_fill_and_forward_pass():
    strategy = DummyStrategy()
    extended = hybrid_planning.extend_ups_blocks_by_price_band(
        strategy,
        charging_intervals={0, 2},
        prices=[0.5, 0.5, 0.5, 0.5],
        blocked_indices=set(),
    )
    assert extended == {1, 3}


def test_hybrid_scoring_analyze_future_price_branches():
    strategy = SimpleNamespace(
        sim_config=SimpleNamespace(ac_dc_efficiency=0.9, dc_ac_efficiency=0.9),
        LOOKAHEAD_INTERVALS=4,
        MIN_PRICE_SPREAD_PERCENT=10,
    )
    analysis = hybrid_scoring.analyze_future_prices(
        strategy,
        prices=[1.0, 1.5, 1.4, 1.3],
        export_prices=[0.0] * 4,
        consumption_forecast=[0.1] * 4,
    )
    assert analysis[0]["charge_reason"] in {
        "night_preparation",
        "below_avg_1.00<1.40",
        "relative_cheap_1.00",
        "not_profitable",
    } or analysis[0]["charge_reason"].startswith("arbitrage_")

    analysis = hybrid_scoring.analyze_future_prices(
        strategy,
        prices=[-1.0, -2.0],
        export_prices=[0.0, 0.0],
        consumption_forecast=[0.1, 0.1],
    )
    assert analysis[0]["charge_reason"] == "negative_price"


def test_hybrid_scoring_select_best_mode_reasons(monkeypatch):
    strategy = SimpleNamespace(_planning_min=2.0, _target=4.0)

    def _score(_strategy, mode, **_kwargs):
        return {CBB_MODE_HOME_UPS: 4, CBB_MODE_HOME_III: 3, CBB_MODE_HOME_II: 2, CBB_MODE_HOME_I: 1}[mode]

    monkeypatch.setattr(hybrid_scoring, "score_mode", _score)
    mode, reason, _ = hybrid_scoring.select_best_mode(
        strategy,
        battery=1.0,
        solar=0.0,
        load=0.0,
        price=2.0,
        export_price=0.0,
        cheap_threshold=1.0,
        expensive_threshold=3.0,
        very_cheap=1.0,
    )
    assert mode == CBB_MODE_HOME_UPS
    assert reason == "low_battery_charge"

    def _score_home3(_strategy, mode, **_kwargs):
        return {CBB_MODE_HOME_III: 5, CBB_MODE_HOME_UPS: 4, CBB_MODE_HOME_II: 3, CBB_MODE_HOME_I: 1}[mode]

    monkeypatch.setattr(hybrid_scoring, "score_mode", _score_home3)
    mode, reason, _ = hybrid_scoring.select_best_mode(
        strategy,
        battery=5.0,
        solar=1.0,
        load=0.5,
        price=2.0,
        export_price=0.0,
        cheap_threshold=1.0,
        expensive_threshold=3.0,
        very_cheap=1.0,
    )
    assert mode == CBB_MODE_HOME_III
    assert reason == "maximize_solar_storage"

    def _score_home2(_strategy, mode, **_kwargs):
        return {CBB_MODE_HOME_II: 5, CBB_MODE_HOME_UPS: 4, CBB_MODE_HOME_III: 3, CBB_MODE_HOME_I: 1}[mode]

    monkeypatch.setattr(hybrid_scoring, "score_mode", _score_home2)
    mode, reason, _ = hybrid_scoring.select_best_mode(
        strategy,
        battery=5.0,
        solar=0.0,
        load=1.0,
        price=5.0,
        export_price=0.0,
        cheap_threshold=1.0,
        expensive_threshold=3.0,
        very_cheap=1.0,
    )
    assert mode == CBB_MODE_HOME_II
    assert reason == "preserve_battery_day"

    def _score_home1(_strategy, mode, **_kwargs):
        return {CBB_MODE_HOME_I: 5, CBB_MODE_HOME_III: 3, CBB_MODE_HOME_UPS: 1, CBB_MODE_HOME_II: 0}[mode]

    monkeypatch.setattr(hybrid_scoring, "score_mode", _score_home1)
    mode, reason, _ = hybrid_scoring.select_best_mode(
        strategy,
        battery=5.0,
        solar=0.0,
        load=1.0,
        price=5.0,
        export_price=0.0,
        cheap_threshold=1.0,
        expensive_threshold=3.0,
        very_cheap=1.0,
    )
    assert mode == CBB_MODE_HOME_I
    assert reason == "expensive_use_battery"


def test_hybrid_scoring_score_mode_branches():
    strategy = SimpleNamespace(
        simulator=DummySim(),
        config=SimpleNamespace(
            weight_cost=1.0,
            weight_battery_preservation=1.0,
            weight_self_consumption=1.0,
            charging_strategy=ChargingStrategy.BELOW_THRESHOLD,
            max_ups_price_czk=1.0,
        ),
        _planning_min=2.0,
        _target=4.0,
    )
    score = hybrid_scoring.score_mode(
        strategy,
        mode=CBB_MODE_HOME_UPS,
        battery=1.0,
        solar=0.0,
        load=2.0,
        price=2.0,
        export_price=0.0,
        cheap_threshold=1.0,
        expected_saving=1.0,
        is_relatively_cheap=True,
    )
    assert score < 0

    score = hybrid_scoring.score_mode(
        strategy,
        mode=CBB_MODE_HOME_UPS,
        battery=1.0,
        solar=0.0,
        load=1.0,
        price=0.5,
        export_price=0.0,
        cheap_threshold=1.0,
        expected_saving=1.0,
        is_relatively_cheap=True,
    )
    assert score > -100


def test_hybrid_result_savings_percent_zero():
    result = hybrid_module.HybridResult(
        decisions=[],
        total_cost_czk=0.0,
        baseline_cost_czk=0.0,
        savings_czk=0.0,
        total_grid_import_kwh=0.0,
        total_grid_export_kwh=0.0,
        final_battery_kwh=0.0,
        mode_counts={},
        ups_intervals=0,
        calculation_time_ms=0.0,
        negative_prices_detected=False,
        balancing_applied=False,
    )
    assert result.savings_percent == 0.0


def test_hybrid_strategy_proxy_methods(monkeypatch):
    strategy = hybrid_module.HybridStrategy(HybridConfig(), SimulatorConfig())

    monkeypatch.setattr(hybrid_module.hybrid_planning_module, "get_price_band_delta_pct", lambda *_a, **_k: 0.42)
    assert strategy._get_price_band_delta_pct() == 0.42

    monkeypatch.setattr(
        hybrid_module.hybrid_planning_module,
        "extend_ups_blocks_by_price_band",
        lambda *_a, **_k: {1},
    )
    assert strategy._extend_ups_blocks_by_price_band(charging_intervals=set(), prices=[1.0], blocked_indices=set()) == {1}

    monkeypatch.setattr(
        hybrid_module.hybrid_planning_module,
        "simulate_trajectory",
        lambda *_a, **_k: [1.0],
    )
    assert strategy._simulate_trajectory(1.0, [0.0], [0.0], set()) == [1.0]

    monkeypatch.setattr(
        hybrid_module.hybrid_scoring_module,
        "analyze_future_prices",
        lambda *_a, **_k: {0: {"max_future_price": 1.0}},
    )
    assert strategy._analyze_future_prices([1.0], [0.0], [0.0])[0]["max_future_price"] == 1.0

    monkeypatch.setattr(
        hybrid_module.hybrid_scoring_module,
        "score_mode",
        lambda *_a, **_k: 3.0,
    )
    assert (
        strategy._score_mode(
            CBB_MODE_HOME_I, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, False
        )
        == 3.0
    )

    monkeypatch.setattr(
        hybrid_module.hybrid_scoring_module,
        "apply_smoothing",
        lambda *_a, **_k: [],
    )
    assert strategy._apply_smoothing([], [], [], [], []) == []


@pytest.mark.asyncio
async def test_timeline_extended_storage_debug_and_archive(monkeypatch):
    target_day = date.today() - timedelta(days=1)
    date_str = target_day.strftime(extended_module.DATE_FMT)
    storage_plans = {
        "detailed": {date_str: {"intervals": [], "invalid": True}},
        "daily_archive": {date_str: {"plan": [{"time": "00:00"}]}},
    }

    class DummySensor:
        def __init__(self):
            self._plans_store = DummyStore(storage_plans)
            self._hass = SimpleNamespace()
            self._baseline_repair_attempts = set()
            self._daily_plan_state = None
            self._timeline_data = []
            self._mode_optimization_result = None

        def _is_baseline_plan_invalid(self, _plan):
            return False

        async def _save_plan_to_storage(self, _date_str, _intervals, _meta):
            return None

        async def _create_baseline_plan(self, _date_str):
            return True

        def _get_current_mode(self):
            return 0

        def _get_current_battery_soc_percent(self):
            return 50.0

        def _get_current_battery_capacity(self):
            return 5.0

    async def fake_build_modes(*_args, **_kwargs):
        key = dt_util.as_local(datetime.combine(target_day, datetime.min.time())).strftime(
            extended_module.DATETIME_FMT
        )
        return {key: {"mode": 0, "mode_name": "Home 1"}}

    async def fake_fetch_interval(*_args, **_kwargs):
        return {
            "consumption_kwh": 1.0,
            "solar_kwh": 0.0,
            "battery_soc": 50.0,
            "battery_kwh": 5.0,
            "grid_import": 1.0,
            "grid_export": 0.0,
            "net_cost": 1.0,
        }

    monkeypatch.setattr(extended_module.history_module, "build_historical_modes_lookup", fake_build_modes)
    monkeypatch.setattr(extended_module.history_module, "fetch_interval_from_history", fake_fetch_interval)

    sensor = DummySensor()
    result = await extended_module.build_timeline_extended(sensor)
    assert result["yesterday"]["date"] == date_str


@pytest.mark.asyncio
async def test_timeline_extended_mixed_branches(monkeypatch):
    today = date.today()
    date_str = today.strftime(extended_module.DATE_FMT)
    storage_plans = {"detailed": {date_str: {"intervals": [{"time": "00:00"}]}}}

    class DummySensor:
        def __init__(self):
            self._plans_store = DummyStore(storage_plans)
            self._hass = SimpleNamespace()
            self._baseline_repair_attempts = set()
            self._daily_plan_state = {"date": date_str, "plan": []}
            self._timeline_data = [
                {"time": f"{date_str}T00:00:00"},
                {"time": "bad-time"},
            ]
            self._mode_optimization_result = None

        def _is_baseline_plan_invalid(self, plan):
            return bool(plan and plan.get("invalid"))

        async def _save_plan_to_storage(self, _date_str, _intervals, _meta):
            return None

        async def _create_baseline_plan(self, _date_str):
            return False

        def _get_current_mode(self):
            return 0

        def _get_current_battery_soc_percent(self):
            return 50.0

        def _get_current_battery_capacity(self):
            return 5.0

    async def fake_build_modes(*_args, **_kwargs):
        key = dt_util.as_local(datetime.combine(today, datetime.min.time())).strftime(
            extended_module.DATETIME_FMT
        )
        return {key: {"mode": 0, "mode_name": "Home 1"}}

    async def fake_fetch_interval(*_args, **_kwargs):
        return None

    monkeypatch.setattr(extended_module.history_module, "build_historical_modes_lookup", fake_build_modes)
    monkeypatch.setattr(extended_module.history_module, "fetch_interval_from_history", fake_fetch_interval)
    monkeypatch.setattr(extended_module.dt_util, "now", lambda: datetime.combine(today, datetime.min.time()))

    sensor = DummySensor()
    result = await extended_module.build_day_timeline(sensor, today, storage_plans)
    assert result["date"] == date_str


@pytest.mark.asyncio
async def test_timeline_extended_planned_only_empty_time():
    target_day = date.today() + timedelta(days=1)
    date_str = target_day.strftime(extended_module.DATE_FMT)

    class DummySensor:
        def __init__(self):
            self._plans_store = None
            self._hass = None
            self._baseline_repair_attempts = set()
            self._daily_plan_state = None
            self._timeline_data = []
            self._mode_optimization_result = {"optimal_timeline": [{"time": ""}]}

        def _is_baseline_plan_invalid(self, _plan):
            return False

        async def _save_plan_to_storage(self, _date_str, _intervals, _meta):
            return None

        async def _create_baseline_plan(self, _date_str):
            return False

        def _get_current_mode(self):
            return 0

        def _get_current_battery_soc_percent(self):
            return 50.0

        def _get_current_battery_capacity(self):
            return 5.0

    sensor = DummySensor()
    result = await extended_module.build_day_timeline(sensor, target_day, {}, mode_names={})
    assert result["date"] == date_str


@pytest.mark.asyncio
async def test_unified_cost_tile_fallback_build_errors(monkeypatch):
    class DummyStore:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    hass = DummyHass()
    monkeypatch.setattr("homeassistant.helpers.storage.Store", DummyStore)

    view = api_module.OIGCloudUnifiedCostTileView()
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 503

    entity = DummyEntity("sensor.oig_123_battery_forecast")
    hass.data["sensor"] = DummyComponent([entity])

    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 500

    class BadEntity(DummyEntity):
        async def build_unified_cost_tile(self):
            raise RuntimeError("boom")

    hass.data["sensor"] = DummyComponent([BadEntity("sensor.oig_123_battery_forecast")])
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 500


@pytest.mark.asyncio
async def test_detail_tabs_view_precomputed_paths(monkeypatch):
    class DummyStore:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return {"detail_tabs": {"today": {"ok": True}}}

    hass = DummyHass()
    monkeypatch.setattr("homeassistant.helpers.storage.Store", DummyStore)

    view = api_module.OIGCloudDetailTabsView()
    response = await view.get(DummyRequest(hass, {"tab": "today"}), "123")
    payload = json.loads(response.text)
    assert payload["today"]["ok"] is True


@pytest.mark.asyncio
async def test_detail_tabs_view_fallback_build(monkeypatch):
    class DummyStore:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    class Entity(DummyEntity):
        async def build_detail_tabs(self, tab=None, plan=None):
            return {"today": {"tab": tab, "plan": plan}}

    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([Entity("sensor.oig_123_battery_forecast")])
    monkeypatch.setattr("homeassistant.helpers.storage.Store", DummyStore)

    view = api_module.OIGCloudDetailTabsView()
    response = await view.get(DummyRequest(hass, {"tab": "today"}), "123")
    payload = json.loads(response.text)
    assert payload["today"]["tab"] == "today"


@pytest.mark.asyncio
async def test_planner_settings_post_no_change():
    entry = SimpleNamespace(entry_id="e1", options={CONF_AUTO_MODE_SWITCH: True})
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    hass.data["oig_cloud"] = {entry.entry_id: {"coordinator": SimpleNamespace(data={"123": {}})}}
    view = api_module.OIGCloudPlannerSettingsView()

    class JsonRequest(DummyRequest):
        async def json(self):
            return {"auto_mode_switch_enabled": True}

    response = await view.post(JsonRequest(hass), "123")
    payload = json.loads(response.text)
    assert payload["updated"] is False
