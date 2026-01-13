from __future__ import annotations

import json
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.api import ha_rest_api as api_module
from custom_components.oig_cloud.battery_forecast.presentation import (
    unified_cost_tile_helpers as uct_module,
)
from custom_components.oig_cloud.battery_forecast.strategy import hybrid as hybrid_module
from custom_components.oig_cloud.battery_forecast.strategy import hybrid_planning
from custom_components.oig_cloud.battery_forecast.strategy import hybrid_scoring
from custom_components.oig_cloud.battery_forecast.types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
)


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


class DummyEntity:
    def __init__(self, entity_id):
        self.entity_id = entity_id


@pytest.mark.asyncio
async def test_battery_timeline_view_exception(monkeypatch):
    hass = DummyHass()

    class BadComponent:
        @property
        def entities(self):
            raise RuntimeError("boom")

    hass.data["sensor"] = BadComponent()

    view = api_module.OIGCloudBatteryTimelineView()
    response = await view.get(DummyRequest(hass), "123")
    payload = json.loads(response.text)
    assert response.status == 500
    assert "error" in payload


@pytest.mark.asyncio
async def test_unified_cost_tile_missing_entity(monkeypatch):
    class Store:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([])
    monkeypatch.setattr("homeassistant.helpers.storage.Store", Store)

    view = api_module.OIGCloudUnifiedCostTileView()
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 503


@pytest.mark.asyncio
async def test_unified_cost_tile_comparison_merge(monkeypatch):
    class Store:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return {"unified_cost_tile": {"today": {"delta": 1.0}}, "cost_comparison": {"ok": True}}

    class Entity(DummyEntity):
        async def build_unified_cost_tile(self):
            return {"today": {"delta": 1.0}}

    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([Entity("sensor.oig_123_battery_forecast")])
    monkeypatch.setattr("homeassistant.helpers.storage.Store", Store)

    view = api_module.OIGCloudUnifiedCostTileView()
    response = await view.get(DummyRequest(hass), "123")
    payload = json.loads(response.text)
    assert payload["comparison"]["ok"] is True


@pytest.mark.asyncio
async def test_detail_tabs_view_missing_entity(monkeypatch):
    class Store:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([])
    monkeypatch.setattr("homeassistant.helpers.storage.Store", Store)

    view = api_module.OIGCloudDetailTabsView()
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 404


@pytest.mark.asyncio
async def test_detail_tabs_view_precomputed_missing_detail_tabs(monkeypatch):
    class Store:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    class Entity(DummyEntity):
        def __init__(self, entity_id):
            super().__init__(entity_id)
            self._precomputed_store = SimpleNamespace(async_load=lambda: {"last_update": datetime.now().isoformat()})

        async def build_detail_tabs(self, tab=None, plan=None):
            return {"today": {"tab": tab, "plan": plan}}

    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([Entity("sensor.oig_123_battery_forecast")])
    monkeypatch.setattr("homeassistant.helpers.storage.Store", Store)

    view = api_module.OIGCloudDetailTabsView()
    response = await view.get(DummyRequest(hass, {"tab": "today"}), "123")
    payload = json.loads(response.text)
    assert payload["today"]["plan"] == "hybrid"


@pytest.mark.asyncio
async def test_detail_tabs_view_precomputed_error(monkeypatch):
    class Store:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    class Entity(DummyEntity):
        def __init__(self, entity_id):
            super().__init__(entity_id)
            async def _fail():
                raise RuntimeError("boom")
            self._precomputed_store = SimpleNamespace(async_load=_fail)

        async def build_detail_tabs(self, tab=None, plan=None):
            return {"today": {"ok": True}}

    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([Entity("sensor.oig_123_battery_forecast")])
    monkeypatch.setattr("homeassistant.helpers.storage.Store", Store)

    view = api_module.OIGCloudDetailTabsView()
    response = await view.get(DummyRequest(hass), "123")
    payload = json.loads(response.text)
    assert "today" in payload


@pytest.mark.asyncio
async def test_detail_tabs_view_build_error(monkeypatch):
    class Store:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    class Entity(DummyEntity):
        async def build_detail_tabs(self, tab=None, plan=None):
            raise RuntimeError("boom")

    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([Entity("sensor.oig_123_battery_forecast")])
    monkeypatch.setattr("homeassistant.helpers.storage.Store", Store)

    view = api_module.OIGCloudDetailTabsView()
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 500


def test_hybrid_savings_percent_positive():
    result = hybrid_module.HybridResult(
        decisions=[],
        total_cost_czk=5.0,
        baseline_cost_czk=10.0,
        savings_czk=5.0,
        total_grid_import_kwh=0.0,
        total_grid_export_kwh=0.0,
        final_battery_kwh=0.0,
        mode_counts={},
        ups_intervals=0,
        calculation_time_ms=0.0,
        negative_prices_detected=False,
        balancing_applied=False,
    )
    assert result.savings_percent == 50.0


def test_hybrid_planning_min_len_and_recovery_index():
    class Strategy:
        MAX_ITERATIONS = 1
        MIN_UPS_PRICE_BAND_PCT = 0.08

        def __init__(self):
            self.config = SimpleNamespace(
                max_ups_price_czk=1.0,
                min_ups_duration_intervals=1,
                negative_price_strategy=SimpleNamespace(),
            )
            self.sim_config = SimpleNamespace(ac_dc_efficiency=0.9)
            self.simulator = SimpleNamespace(
                simulate=lambda **_k: SimpleNamespace(battery_end=3.0)
            )
            self._planning_min = 2.0
            self._target = 3.0

    strategy = Strategy()
    charging, reason, _ = hybrid_planning.plan_charging_intervals(
        strategy,
        initial_battery_kwh=1.0,
        prices=[0.1],
        solar_forecast=[0.0],
        consumption_forecast=[0.0],
        balancing_plan=None,
        negative_price_intervals=None,
    )
    assert charging == {0}
    assert reason is None


def test_hybrid_planning_gap_fill_forward():
    strategy = SimpleNamespace(
        config=SimpleNamespace(max_ups_price_czk=1.0),
        sim_config=SimpleNamespace(ac_dc_efficiency=0.9),
        MIN_UPS_PRICE_BAND_PCT=0.08,
    )
    extended = hybrid_planning.extend_ups_blocks_by_price_band(
        strategy,
        charging_intervals={0},
        prices=[0.5, 0.51, 0.52],
        blocked_indices=set(),
    )
    assert extended == {1, 2}


def test_hybrid_scoring_reason_branches(monkeypatch):
    strategy = SimpleNamespace(
        sim_config=SimpleNamespace(ac_dc_efficiency=0.9, dc_ac_efficiency=0.9),
        LOOKAHEAD_INTERVALS=4,
        MIN_PRICE_SPREAD_PERCENT=10,
        simulator=SimpleNamespace(
            simulate=lambda **_k: SimpleNamespace(
                battery_end=3.0, solar_used_direct=0.0
            ),
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
        prices=[1.0, 2.0, 3.0, 4.0],
        export_prices=[0.0] * 4,
        consumption_forecast=[0.1] * 4,
    )
    assert analysis[0]["charge_reason"]

    def _score(_strategy, mode, **_k):
        return {CBB_MODE_HOME_I: 3, CBB_MODE_HOME_III: 2, CBB_MODE_HOME_II: 1, CBB_MODE_HOME_UPS: 0}[mode]

    monkeypatch.setattr(hybrid_scoring, "score_mode", _score)
    mode, reason, _ = hybrid_scoring.select_best_mode(
        strategy,
        battery=3.0,
        solar=0.0,
        load=1.0,
        price=1.0,
        export_price=0.0,
        cheap_threshold=0.5,
        expensive_threshold=2.0,
        very_cheap=0.2,
    )
    assert mode == CBB_MODE_HOME_I
    assert reason == "normal_operation"


@pytest.mark.asyncio
async def test_build_today_cost_data_edge_cases(monkeypatch):
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=dt_util.UTC)
    monkeypatch.setattr(uct_module.dt_util, "now", lambda: now)
    monkeypatch.setattr(uct_module.dt_util, "as_local", lambda dt: dt)

    async def _fake_yesterday(*_a, **_k):
        return "ok"

    async def _fake_tomorrow(*_a, **_k):
        return "ok"

    monkeypatch.setattr(uct_module, "analyze_yesterday_performance", _fake_yesterday)
    monkeypatch.setattr(uct_module, "analyze_tomorrow_plan", _fake_tomorrow)

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
        def __init__(self):
            self._plans_store = None
            self.coordinator = SimpleNamespace(data={"spot_prices": {"timeline": []}})

        async def _build_day_timeline(self, _day, _storage_plans=None):
            intervals = _Intervals(
                [
                    None,
                    "bad",
                    {"time": "2025-01-01T10:00:00+00:00", "planned": {"net_cost": 1.0}},
                ],
                [
                    {"time": "2025-01-01T10:00:00+00:00", "planned": {"net_cost": 1.0}},
                    {"time": "2025-01-01T12:00:00+00:00", "planned": {"net_cost": 2.0}},
                    {
                        "time": "2025-01-01T13:00:00+00:00",
                        "planned": {"net_cost": 3.0},
                        "actual": {"net_cost": 4.0, "savings": 1.0},
                        "duration_minutes": 60,
                    },
                ],
            )
            return {
                "intervals": intervals
            }

        def _group_intervals_by_mode(self, _intervals, _key):
            return []

    data = await uct_module.build_today_cost_data(Sensor())
    assert data["performance"] in ("better", "worse", "on_plan")
    assert data["eod_prediction"]["confidence"] in ("low", "medium", "high")


@pytest.mark.asyncio
async def test_build_tomorrow_cost_data_mode_distribution(monkeypatch):
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
                [
                    {"planned": {"mode": 1, "net_cost": 0}},
                    {"planned": {"mode": "Home", "net_cost": 0}},
                ],
                [
                    None,
                    {"planned": {"mode": 1, "net_cost": 0}},
                    {"planned": {"mode": "Home", "net_cost": 0}},
                ],
            )
            return {
                "intervals": intervals
            }

        def _group_intervals_by_mode(self, _intervals, _key):
            return []

    data = await uct_module.build_tomorrow_cost_data(Sensor(), mode_names={1: "Mode 1"})
    assert data["dominant_mode_name"]
