from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.data import solar_forecast as sf_data
from custom_components.oig_cloud.battery_forecast.strategy import hybrid_planning
from custom_components.oig_cloud.boiler import coordinator as boiler_coordinator_module
from custom_components.oig_cloud.entities import battery_health_sensor as battery_health_module
from custom_components.oig_cloud.entities import solar_forecast_sensor as solar_sensor_module


def test_solar_forecast_data_missing_and_no_attrs_paths():
    logs = []

    sensor = SimpleNamespace(
        _hass=SimpleNamespace(states=SimpleNamespace(get=lambda _eid: None)),
        _config_entry=SimpleNamespace(options={"enable_solar_forecast": True}),
        coordinator=SimpleNamespace(solar_forecast_data=None),
        _box_id="123",
        _log_rate_limited=lambda *args, **kwargs: logs.append((args, kwargs)),
    )

    # no state + no cache -> _log_forecast_missing branch
    out = sf_data.get_solar_forecast(sensor)
    assert out == {}

    # state exists but no attrs -> _log_forecast_no_attrs branch
    sensor._hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda _eid: SimpleNamespace(attributes=None))
    )
    out2 = sf_data.get_solar_forecast(sensor)
    assert out2 == {}

    # get_solar_forecast_strings early return branches
    sensor._hass = None
    assert sf_data.get_solar_forecast_strings(sensor) == {}

    sensor._hass = SimpleNamespace(states=SimpleNamespace(get=lambda _eid: SimpleNamespace(attributes=None)))
    assert sf_data.get_solar_forecast_strings(sensor) == {}


def test_solar_forecast_cached_parsing_and_invalid_entries():
    logs = []
    sensor = SimpleNamespace(
        _hass=SimpleNamespace(states=SimpleNamespace(get=lambda _eid: None)),
        _config_entry=SimpleNamespace(options={"enable_solar_forecast": True}),
        coordinator=SimpleNamespace(
            solar_forecast_data={
                "total_hourly": {
                    "invalid": 100,  # parse exception branch
                    "2025-01-01T10:00:00": 500,
                }
            }
        ),
        _box_id="123",
        _log_rate_limited=lambda *args, **kwargs: logs.append((args, kwargs)),
    )

    out = sf_data.get_solar_forecast(sensor)
    assert isinstance(out, dict)
    assert "today" in out and "tomorrow" in out


def test_battery_health_context_and_threshold_branches(monkeypatch):
    class DummyStore:
        def __init__(self, *_a, **_k):
            pass

    monkeypatch.setattr(battery_health_module, "Store", DummyStore)
    tracker = battery_health_module.BatteryHealthTracker(
        SimpleNamespace(states=SimpleNamespace(get=lambda _eid: None), config=SimpleNamespace(config_dir="/tmp")),
        "123",
    )

    # no context / empty parts branches
    assert tracker._format_measurement_context(None) == ""
    assert tracker._format_measurement_context({"source": None}) == ""

    # threshold helper
    value = tracker._max_discharge_threshold(100.0)
    assert isinstance(value, (int, float))


@pytest.mark.asyncio
async def test_solar_sensor_normalization_and_solcast_error_paths(monkeypatch):
    # _normalize_hourly_keys branches (non-str key, invalid str, aware/naive)
    normalized = solar_sensor_module._normalize_hourly_keys(
        {
            1: 100.0,
            "bad": 50.0,
            "2025-01-01T10:15:00+00:00": 300.0,
            "2025-01-01T10:45:00": 250.0,
        }
    )
    assert 1 in normalized
    assert "bad" in normalized

    # sensor for load/save normalization branches
    coordinator = SimpleNamespace(forced_box_id="123", async_add_listener=lambda *_a, **_k: (lambda: None))
    entry = SimpleNamespace(options={"enable_solar_forecast": True})
    sensor = solar_sensor_module.OigCloudSolarForecastSensor(
        coordinator, "solar_forecast", entry, {}
    )
    sensor.hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda _eid: None),
        services=SimpleNamespace(async_call=lambda *_a, **_k: None),
        async_create_task=lambda _coro: None,
    )

    class DummyStore:
        async def async_load(self):
            return {
                "last_api_call": 0,
                "forecast_data": {
                    "total_hourly": {
                        "2025-01-01T10:15:00+00:00": 100.0,
                        "2025-01-01T10:45:00+00:00": 120.0,
                    }
                },
            }

        async def async_save(self, _data):
            return None

    saved = {"called": False}

    async def _save():
        saved["called"] = True

    monkeypatch.setattr(solar_sensor_module, "Store", lambda *_a, **_k: DummyStore())
    monkeypatch.setattr(sensor, "_save_persistent_data", _save)
    await sensor._load_persistent_data()
    assert saved["called"] is True

    # solcast missing site_id branch (line 626-627)
    sensor._config_entry.options.update(
        {
            "solar_forecast_provider": "solcast",
            "solcast_api_key": "key",
            "solcast_site_id": "",
        }
    )
    await sensor._fetch_solcast_data(1000.0)

    # parse forecast entry invalid pv_estimate branch (711-714)
    parsed = sensor._parse_forecast_entry(
        {"period_end": "2025-01-01T00:30:00+00:00", "pv_estimate": "not-a-number"},
        total_kwp=1.0,
    )
    assert parsed is None

    # _convert_to_hourly naive timestamp branch (dt.tzinfo is None)
    hourly = sensor._convert_to_hourly({"2025-01-01T10:15:00": 50.0})
    assert hourly


def test_boiler_coordinator_infer_box_id_branches(monkeypatch):
    from homeassistant.helpers import frame

    monkeypatch.setattr(frame, "report_usage", lambda *_a, **_k: None)

    hass = SimpleNamespace(
        states=SimpleNamespace(
            async_entity_ids=lambda _domain: [
                "sensor.invalid",  # len(parts) < 3 branch
                "sensor.foo_bar_baz",  # parts[1] != oig branch
                "sensor_oig_123_boiler_day_w",  # valid branch
            ]
        )
    )
    coordinator = boiler_coordinator_module.BoilerCoordinator(hass, {})
    assert coordinator._infer_box_id_from_states() == "123"


def test_boiler_coordinator_resolve_box_id_forced_branch(monkeypatch):
    from homeassistant.helpers import frame

    monkeypatch.setattr(frame, "report_usage", lambda *_a, **_k: None)

    hass = SimpleNamespace(states=SimpleNamespace(async_entity_ids=lambda _domain: []))
    coordinator = boiler_coordinator_module.BoilerCoordinator(hass, {})
    coordinator.forced_box_id = "777"
    assert coordinator._resolve_box_id({}) == "777"


def _hybrid_strategy_stub():
    class _Sim:
        def simulate(self, *, battery_start, mode, solar_kwh, load_kwh, force_charge=False):
            _ = mode
            _ = force_charge
            return SimpleNamespace(battery_end=battery_start + solar_kwh - load_kwh, grid_import=1.0)

    return SimpleNamespace(
        MAX_ITERATIONS=3,
        MIN_UPS_PRICE_BAND_PCT=0.08,
        config=SimpleNamespace(
            max_ups_price_czk=10.0,
            min_ups_duration_intervals=1,
            price_hysteresis_czk=0.0,
            hw_min_hold_hours=0.5,
            round_trip_efficiency=None,
        ),
        sim_config=SimpleNamespace(min_capacity_kwh=1.0, ac_dc_efficiency=0.0, dc_ac_efficiency=0.0),
        simulator=_Sim(),
        _planning_min=1.0,
        _target=3.0,
    )


def test_hybrid_planning_helper_branches(monkeypatch):
    strategy = _hybrid_strategy_stub()

    assert hybrid_planning._resolve_round_trip_efficiency(strategy) == 0.0

    charging_intervals = set()
    hybrid_planning._reach_target_soc(
        strategy,
        initial_battery_kwh=1.0,
        solar_forecast=[0.0],
        consumption_forecast=[0.0],
        charging_intervals=charging_intervals,
        blocked_indices=set(),
        prices=[1.0],
        add_ups_interval=lambda *_a, **_k: charging_intervals.add(999),
        eps_kwh=1e-6,
        limit=0,
    )
    assert 999 not in charging_intervals

    monkeypatch.setattr(hybrid_planning, "extend_ups_blocks_by_price_band", lambda *_a, **_k: {2})
    base = {0}
    extended = hybrid_planning._apply_price_band_extension(
        strategy,
        charging_intervals=base,
        prices=[1.0, 1.1, 1.2],
        blocked_indices=set(),
    )
    assert extended == {2}
    assert 2 in base

    ctx = hybrid_planning._ModeDecisionContext(
        strategy=strategy,
        charging_intervals=set(),
        blocked_indices={0},
        prices=[1.0],
        max_price=10.0,
        solar_forecast=[0.0],
        consumption_forecast=[0.0],
        n=1,
        eps_kwh=1e-6,
        round_trip_eff=0.9,
        hysteresis=0.0,
        add_ups_interval=lambda *_a, **_k: None,
    )
    assert hybrid_planning._determine_mode_for_interval(0, 1.0, ctx) == hybrid_planning.CBB_MODE_HOME_I


def test_hybrid_planning_force_target_and_hold_limit(monkeypatch):
    strategy = _hybrid_strategy_stub()

    strategy._target = strategy._planning_min
    assert (
        hybrid_planning._force_target_before_index(
            strategy,
            initial_battery_kwh=1.0,
            solar_forecast=[0.0],
            consumption_forecast=[0.0],
            charging_intervals=set(),
            blocked_indices=set(),
            prices=[1.0],
            add_ups_interval=lambda *_a, **_k: None,
            limit=1,
            eps_kwh=1e-6,
        )
        is False
    )

    strategy._target = 3.0
    monkeypatch.setattr(hybrid_planning, "simulate_trajectory", lambda *_a, **_k: [1.5])
    candidates = iter([0, None])
    monkeypatch.setattr(hybrid_planning, "_find_cheapest_candidate", lambda **_k: next(candidates))
    added = []
    applied = hybrid_planning._force_target_before_index(
        strategy,
        initial_battery_kwh=1.0,
        solar_forecast=[0.0],
        consumption_forecast=[0.0],
        charging_intervals=set(),
        blocked_indices=set(),
        prices=[1.0],
        add_ups_interval=lambda idx, **_k: added.append(idx),
        limit=1,
        eps_kwh=1e-6,
    )
    assert applied is True
    assert added == [0]

    monkeypatch.setattr(hybrid_planning, "_simulate_with_results", lambda *_a, **_k: ([0.9, 0.9, 1.2], []))
    calls = []
    monkeypatch.setattr(
        hybrid_planning,
        "_force_target_before_index",
        lambda *_a, **k: calls.append(k["limit"]) or True,
    )
    assert (
        hybrid_planning._apply_hw_min_hold_limit(
            strategy,
            initial_battery_kwh=1.0,
            solar_forecast=[0.0, 0.0, 0.0],
            consumption_forecast=[0.0, 0.0, 0.0],
            charging_intervals=set(),
            blocked_indices=set(),
            prices=[1.0, 1.0, 1.0],
            add_ups_interval=lambda *_a, **_k: None,
            n=3,
            eps_kwh=1e-6,
        )
        is True
    )
    assert calls == [2]

    monkeypatch.setattr(hybrid_planning, "_simulate_with_results", lambda *_a, **_k: ([0.9, 0.9, 0.9], []))
    calls.clear()
    assert (
        hybrid_planning._apply_hw_min_hold_limit(
            strategy,
            initial_battery_kwh=1.0,
            solar_forecast=[0.0, 0.0, 0.0],
            consumption_forecast=[0.0, 0.0, 0.0],
            charging_intervals=set(),
            blocked_indices=set(),
            prices=[1.0, 1.0, 1.0],
            add_ups_interval=lambda *_a, **_k: None,
            n=3,
            eps_kwh=1e-6,
        )
        is True
    )
    assert calls == [3]


def test_hybrid_planning_cost_override_and_band_helpers():
    cand, cap = hybrid_planning._pick_cost_override_candidate(
        trajectory=[0.0, 0.0],
        results=[SimpleNamespace(grid_import=1.0)],
        prices=[1.0, 2.0],
        charging_intervals=set(),
        blocked_indices=set(),
        round_trip_eff=0.9,
        hysteresis=2.0,
        hw_min=1.0,
        eps_kwh=1e-6,
    )
    assert cand is None and cap is None

    cand2, cap2 = hybrid_planning._pick_cost_override_candidate(
        trajectory=[0.0, 0.0],
        results=[SimpleNamespace(grid_import=1.0), SimpleNamespace(grid_import=2.0)],
        prices=[5.0, 5.0],
        charging_intervals=set(),
        blocked_indices={0},
        round_trip_eff=1.0,
        hysteresis=0.0,
        hw_min=1.0,
        eps_kwh=1e-6,
    )
    assert cand2 is None and cap2 is None

    assert (
        hybrid_planning._find_min_future_price(
            [5.0, 4.0, 3.0],
            start=0,
            end=2,
            max_price=10.0,
            blocked_indices={1},
        )
        == 3.0
    )

    can_extend = hybrid_planning._build_can_extend(
        prices=[1.0, 1.05, 0.7],
        blocked_indices=set(),
        max_price=2.0,
        delta_pct=0.1,
        lookahead=3,
        n=3,
    )
    assert can_extend(0, 1) is False

    can_extend_blocked = hybrid_planning._build_can_extend(
        prices=[1.0, 1.0],
        blocked_indices={1},
        max_price=2.0,
        delta_pct=0.1,
        lookahead=1,
        n=2,
    )
    assert can_extend_blocked(0, 1) is False

    ups_flags = [True, False, True]
    extended = set()
    hybrid_planning._fill_single_gaps(
        ups_flags,
        charging_intervals={0, 2},
        extended=extended,
        can_extend=lambda *_a, **_k: True,
    )
    assert 1 in extended


def test_hybrid_planning_remaining_single_line_branches(monkeypatch):
    strategy = _hybrid_strategy_stub()

    strategy.sim_config = SimpleNamespace(min_capacity_kwh=1.0, ac_dc_efficiency=0.8, dc_ac_efficiency=0.9)
    assert hybrid_planning._resolve_round_trip_efficiency(strategy) == pytest.approx(0.72)

    monkeypatch.setattr(hybrid_planning, "_simulate_with_results", lambda *_a, **_k: ([0.9, 1.2], []))
    assert (
        hybrid_planning._apply_hw_min_hold_limit(
            strategy,
            initial_battery_kwh=1.0,
            solar_forecast=[0.0, 0.0],
            consumption_forecast=[0.0, 0.0],
            charging_intervals=set(),
            blocked_indices=set(),
            prices=[1.0, 1.0],
            add_ups_interval=lambda *_a, **_k: None,
            n=2,
            eps_kwh=1e-6,
        )
        is False
    )

    monkeypatch.setattr(hybrid_planning, "simulate_trajectory", lambda *_a, **_k: [5.0])
    assert (
        hybrid_planning._force_target_before_index(
            strategy,
            initial_battery_kwh=1.0,
            solar_forecast=[0.0],
            consumption_forecast=[0.0],
            charging_intervals=set(),
            blocked_indices=set(),
            prices=[1.0],
            add_ups_interval=lambda *_a, **_k: None,
            limit=1,
            eps_kwh=1e-6,
        )
        is False
    )

    monkeypatch.setattr(hybrid_planning, "_apply_planning_min_repair", lambda *_a, **_k: "x")
    monkeypatch.setattr(hybrid_planning, "_apply_economic_charging", lambda *_a, **_k: None)
    monkeypatch.setattr(hybrid_planning, "_apply_cost_aware_override", lambda *_a, **_k: False)
    monkeypatch.setattr(hybrid_planning, "_apply_hw_min_hold_limit", lambda *_a, **_k: True)
    monkeypatch.setattr(hybrid_planning, "_finalize_infeasible_reason", lambda *_a, **_k: None)
    monkeypatch.setattr(hybrid_planning, "_apply_price_band_extension", lambda *_a, **_k: set())
    _charging, reason, _bands = hybrid_planning.plan_charging_intervals(
        strategy,
        initial_battery_kwh=2.0,
        prices=[1.0],
        solar_forecast=[0.0],
        consumption_forecast=[0.0],
        balancing_plan=None,
        negative_price_intervals=None,
    )
    assert reason is None


def test_boiler_coordinator_len_parts_guard_branch(monkeypatch):
    from homeassistant.helpers import frame

    monkeypatch.setattr(frame, "report_usage", lambda *_a, **_k: None)

    class FakeEntityId:
        def __contains__(self, _item):
            return True

        def split(self, _sep):
            return ["sensor", "oig"]

    hass = SimpleNamespace(
        states=SimpleNamespace(
            async_entity_ids=lambda _domain: [
                FakeEntityId(),
            ]
        )
    )
    coordinator = boiler_coordinator_module.BoilerCoordinator(hass, {})
    assert coordinator._infer_box_id_from_states() is None
