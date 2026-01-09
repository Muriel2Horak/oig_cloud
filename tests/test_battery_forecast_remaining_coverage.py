from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest
from homeassistant.util import dt as dt_util

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


class DummySensor:
    def __init__(self):
        self._plans_store = DummyStore()
        self._timeline_data = []
        self._daily_plan_state = None


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
async def test_baseline_plan_no_store():
    sensor = DummySensor()
    sensor._plans_store = None
    assert await plan_storage_baseline.create_baseline_plan(sensor, "2025-01-01") is False


@pytest.mark.asyncio
async def test_baseline_plan_daily_plan_state_fallback(monkeypatch):
    sensor = DummySensor()
    sensor._plans_store = DummyStore({})
    sensor._daily_plan_state = {
        "date": "2025-01-01",
        "plan": [{"time": "00:00", "consumption_kwh": 0.1}] * 96,
    }

    captured = {}

    async def fake_save(_sensor, date_str, intervals, meta):
        captured["date"] = date_str
        captured["intervals"] = intervals
        captured["meta"] = meta
        return True

    monkeypatch.setattr(plan_storage_baseline, "save_plan_to_storage", fake_save)

    ok = await plan_storage_baseline.create_baseline_plan(sensor, "2025-01-01")

    assert ok is True
    assert captured["date"] == "2025-01-01"
    assert captured["meta"]["baseline"] is True


@pytest.mark.asyncio
async def test_baseline_plan_no_fallback_returns_false():
    sensor = DummySensor()
    sensor._plans_store = DummyStore({"detailed": {}, "daily_archive": {}})
    assert await plan_storage_baseline.create_baseline_plan(sensor, "2025-01-01") is False


@pytest.mark.asyncio
async def test_baseline_plan_history_fill(monkeypatch):
    sensor = DummySensor()
    sensor._timeline_data = [{"time": "00:30", "battery_soc": 55.0}]

    call_count = {"n": 0}

    async def fake_fetch(*_args, **_kwargs):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return {
                "solar_kwh": 0.1,
                "consumption_kwh": 0.2,
                "battery_soc": 55.0,
                "battery_kwh": 7.0,
                "grid_import_kwh": 0.1,
                "grid_export_kwh": 0.0,
                "spot_price": 3.0,
                "net_cost": 0.2,
            }
        return None

    captured = {}

    async def fake_save(_sensor, date_str, intervals, meta):
        captured["filled_intervals"] = meta["filled_intervals"]
        captured["intervals"] = intervals
        return True

    monkeypatch.setattr(plan_storage_baseline.history_module, "fetch_interval_from_history", fake_fetch)
    monkeypatch.setattr(plan_storage_baseline, "save_plan_to_storage", fake_save)

    ok = await plan_storage_baseline.create_baseline_plan(sensor, "2025-01-01")

    assert ok is True
    assert captured["filled_intervals"] == "00:00-00:30"
    assert captured["intervals"]


@pytest.mark.asyncio
async def test_ensure_plan_exists_windows(monkeypatch):
    sensor = DummySensor()

    async def fake_exists(_sensor, _date):
        return False

    async def fake_create(_sensor, _date):
        return True

    monkeypatch.setattr(plan_storage_baseline, "plan_exists_in_storage", fake_exists)
    monkeypatch.setattr(plan_storage_baseline, "create_baseline_plan", fake_create)
    monkeypatch.setattr(
        plan_storage_baseline.dt_util,
        "now",
        lambda: datetime(2025, 1, 1, 6, 5, 0),
    )

    assert await plan_storage_baseline.ensure_plan_exists(sensor, "2025-01-01") is True


@pytest.mark.asyncio
async def test_ensure_plan_exists_non_today(monkeypatch):
    sensor = DummySensor()

    async def fake_exists(_sensor, _date):
        return False

    monkeypatch.setattr(plan_storage_baseline, "plan_exists_in_storage", fake_exists)
    monkeypatch.setattr(
        plan_storage_baseline.dt_util,
        "now",
        lambda: datetime(2025, 1, 2, 0, 20, 0),
    )

    assert await plan_storage_baseline.ensure_plan_exists(sensor, "2025-01-01") is False


def test_hybrid_planning_price_band_gap_fill():
    strategy = DummyStrategy()
    extended = hybrid_planning.extend_ups_blocks_by_price_band(
        strategy,
        charging_intervals={0, 2},
        prices=[0.5, 0.5, 0.5],
        blocked_indices=set(),
    )
    assert extended == {1}


def test_hybrid_planning_simulate_trajectory():
    strategy = DummyStrategy()
    trajectory = hybrid_planning.simulate_trajectory(
        strategy,
        initial_battery_kwh=2.0,
        solar_forecast=[0.1, 0.1],
        consumption_forecast=[0.2, 0.2],
        charging_intervals={1},
    )
    assert trajectory == pytest.approx([1.9, 1.8])


def test_hybrid_planning_target_fill_adds_cheapest():
    strategy = DummyStrategy()
    strategy._target = 4.0
    charging, reason, _ = hybrid_planning.plan_charging_intervals(
        strategy,
        initial_battery_kwh=2.5,
        prices=[0.8, 0.2, 0.5],
        solar_forecast=[0.0, 0.0, 0.0],
        consumption_forecast=[0.0, 0.0, 0.0],
        balancing_plan=None,
        negative_price_intervals=None,
    )
    assert reason is None
    assert 1 in charging


def test_hybrid_scoring_extract_prices_and_reasons():
    prices = hybrid_scoring.extract_prices([{"price": 1.2}, 2.3])
    assert prices == [1.2, 2.3]

    strategy = SimpleNamespace(
        sim_config=SimpleNamespace(ac_dc_efficiency=0.9, dc_ac_efficiency=0.9),
        simulator=DummySim(),
        config=SimpleNamespace(
            weight_cost=1.0,
            weight_battery_preservation=1.0,
            weight_self_consumption=1.0,
            charging_strategy=ChargingStrategy.BELOW_THRESHOLD,
            max_ups_price_czk=5.0,
            min_mode_duration_intervals=2,
            negative_price_strategy=NegativePriceStrategy.AUTO,
        ),
        _planning_min=2.0,
        _target=4.0,
        _max=10.0,
        LOOKAHEAD_INTERVALS=4,
        MIN_PRICE_SPREAD_PERCENT=10,
    )

    mode, reason, _ = hybrid_scoring.select_best_mode(
        strategy,
        battery=1.0,
        solar=0.0,
        load=0.0,
        price=5.0,
        export_price=0.0,
        cheap_threshold=2.0,
        expensive_threshold=4.0,
        very_cheap=1.0,
    )
    assert mode in {CBB_MODE_HOME_I, CBB_MODE_HOME_II, CBB_MODE_HOME_III, CBB_MODE_HOME_UPS}
    assert reason


def test_hybrid_scoring_negative_price_strategies():
    strategy = SimpleNamespace(
        config=SimpleNamespace(negative_price_strategy=NegativePriceStrategy.CHARGE_GRID),
        _max=10.0,
    )
    mode, reason = hybrid_scoring.handle_negative_price(
        strategy,
        battery=9.0,
        solar=0.0,
        load=0.0,
        price=-1.0,
        export_price=0.0,
    )
    assert mode == CBB_MODE_HOME_UPS
    assert reason == "negative_price_charge"

    strategy.config.negative_price_strategy = NegativePriceStrategy.CURTAIL
    mode, reason = hybrid_scoring.handle_negative_price(
        strategy,
        battery=9.0,
        solar=1.0,
        load=0.0,
        price=-1.0,
        export_price=0.0,
    )
    assert mode == CBB_MODE_HOME_III
    assert reason == "negative_price_curtail"

    strategy.config.negative_price_strategy = NegativePriceStrategy.CONSUME
    mode, reason = hybrid_scoring.handle_negative_price(
        strategy,
        battery=9.0,
        solar=0.0,
        load=0.0,
        price=-1.0,
        export_price=0.0,
    )
    assert mode == CBB_MODE_HOME_I
    assert reason == "negative_price_consume"


def test_hybrid_scoring_smoothing_merges():
    strategy = SimpleNamespace(config=SimpleNamespace(min_mode_duration_intervals=3))
    decisions = [
        SimpleNamespace(mode=CBB_MODE_HOME_I, mode_name="HOME I", reason="a", is_balancing=False, is_holding=False),
        SimpleNamespace(mode=CBB_MODE_HOME_UPS, mode_name="HOME UPS", reason="b", is_balancing=False, is_holding=False),
        SimpleNamespace(mode=CBB_MODE_HOME_I, mode_name="HOME I", reason="c", is_balancing=False, is_holding=False),
    ]
    smoothed = hybrid_scoring.apply_smoothing(
        strategy,
        decisions=decisions,
        solar_forecast=[],
        consumption_forecast=[],
        prices=[],
        export_prices=[],
    )
    assert smoothed[1].mode == CBB_MODE_HOME_I
    assert smoothed[1].reason == "smoothing_merged"


def test_hybrid_strategy_optimize_branches(monkeypatch):
    config = HybridConfig(negative_price_strategy=NegativePriceStrategy.CHARGE_GRID)
    sim_config = SimulatorConfig(max_capacity_kwh=10.0)
    strategy = hybrid_module.HybridStrategy(config, sim_config)

    monkeypatch.setattr(
        hybrid_module.hybrid_planning_module,
        "plan_charging_intervals",
        lambda *_a, **_k: ({1}, None, {1}),
    )

    balancing_plan = StrategyBalancingPlan(
        charging_intervals=set(),
        holding_intervals={0},
        mode_overrides={0: CBB_MODE_HOME_UPS},
        is_active=True,
    )

    result = strategy.optimize(
        initial_battery_kwh=5.0,
        spot_prices=[{"price": -1.0}, {"price": 1.0}, {"price": 2.0}],
        solar_forecast=[0.0, 0.0, 0.0],
        consumption_forecast=[0.1, 0.1, 0.1],
        balancing_plan=balancing_plan,
    )

    assert result.decisions[0].reason == "holding_period"
    assert result.decisions[1].reason == "price_band_hold"
    assert result.negative_prices_detected is True


def test_calculate_optimal_mode():
    config = HybridConfig()
    sim_config = SimulatorConfig(max_capacity_kwh=10.0)
    mode, reason = hybrid_module.calculate_optimal_mode(
        battery=5.0,
        solar=0.2,
        load=0.1,
        price=1.0,
        export_price=0.0,
        config=config,
        sim_config=sim_config,
    )
    assert mode in {CBB_MODE_HOME_I, CBB_MODE_HOME_II, CBB_MODE_HOME_III, CBB_MODE_HOME_UPS}
    assert reason


@pytest.mark.asyncio
async def test_timeline_extended_storage_load_error(monkeypatch):
    class DummyTimelineSensor:
        def __init__(self):
            self._plans_store = DummyStore(fail=True)
            self._hass = None
            self._baseline_repair_attempts = set()
            self._daily_plan_state = None
            self._timeline_data = []
            self._mode_optimization_result = None

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

    sensor = DummyTimelineSensor()
    monkeypatch.setattr(extended_module.dt_util, "now", lambda: datetime(2025, 1, 2, 12, 0, 0, tzinfo=dt_util.UTC))
    result = await extended_module.build_timeline_extended(sensor)
    assert "today" in result
