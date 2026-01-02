from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as forecast_update_module,
)
from custom_components.oig_cloud.const import DOMAIN


class DummyCoordinator:
    def __init__(self) -> None:
        self.battery_forecast_data = None


class DummySensor:
    def __init__(self) -> None:
        self._forecast_in_progress = False
        self._last_forecast_bucket = None
        self._log_messages: list[str] = []
        self._config_entry = SimpleNamespace(
            options={
                "max_ups_price_czk": 6.0,
                "home_charge_rate": 2.8,
                "min_capacity_percent": 33.0,
                "target_capacity_percent": 80.0,
            },
            entry_id="entry",
        )
        self._box_id = "123"
        self._hass = SimpleNamespace(data={DOMAIN: {"entry": {"balancing_manager": None}}})
        self.hass = self._hass
        self.coordinator = DummyCoordinator()
        self._plan_lock_until = None
        self._plan_lock_modes = []
        self._timeline_data = []
        self._mode_optimization_result = None
        self._mode_recommendations = []
        self._baseline_timeline = []
        self._data_hash = "old"
        self._last_update = None
        self._consumption_summary = {}
        self._first_update = True
        self._profiles_dirty = True
        self._side_effects_enabled = False
        self._last_precompute_hash = None
        self._last_precompute_at = None
        self._state_written = False
        self._precompute_called = False

    def _log_rate_limited(self, key, level, message, *args, cooldown_s=300.0):
        self._log_messages.append(key)

    def _get_current_battery_capacity(self):
        return 5.0

    def _get_max_battery_capacity(self):
        return 10.0

    def _get_min_battery_capacity(self):
        return 2.0

    def _get_target_battery_capacity(self):
        return None

    def _get_current_battery_soc_percent(self):
        return None

    async def _get_spot_price_timeline(self):
        return [
            {"time": "2025-01-01T12:00:00", "price": 3.0},
            {"time": "2025-01-01T12:15:00", "price": 3.5},
        ]

    async def _get_export_price_timeline(self):
        return [
            {"time": "2025-01-01T12:00:00", "price": 1.0},
            {"time": "2025-01-01T12:15:00", "price": 1.2},
        ]

    def _get_solar_forecast(self):
        return {}

    def _get_load_avg_sensors(self):
        return {}

    def _get_balancing_plan(self):
        return None

    def _build_strategy_balancing_plan(self, *_args, **_kwargs):
        return None

    def _get_battery_efficiency(self):
        return 0.9

    async def _maybe_fix_daily_plan(self):
        self._fixed_plan = True

    def _calculate_data_hash(self, _timeline):
        return "hash"

    def _create_mode_recommendations(self, _timeline, hours_ahead=48):
        return [{"mode": 0, "hours": hours_ahead}]

    def _schedule_precompute(self, force=False):
        self._precompute_called = force

    def async_write_ha_state(self):
        self._state_written = True

    def _schedule_forecast_retry(self, delay_seconds: float):
        self._retry = delay_seconds

    def _create_task_threadsafe(self, coro_func, *args):
        self._task = (coro_func, args)


class DummyAdaptiveHelper:
    def __init__(self, *_args, **_kwargs):
        self.called = True

    async def get_adaptive_load_prediction(self):
        return None

    async def calculate_recent_consumption_ratio(self, _profiles):
        return None

    def apply_consumption_boost_to_forecast(self, *_args, **_kwargs):
        return None

    def calculate_consumption_summary(self, _profiles):
        return {"summary": True}


class DummyOptimizeResult:
    def __init__(self, modes):
        self.modes = modes
        self.decisions = []
        self.infeasible = False
        self.infeasible_reason = None


class DummyStrategy:
    def __init__(self, *_args, **_kwargs):
        pass

    def optimize(self, *args, **kwargs):
        return DummyOptimizeResult([0, 0])


class DummyAdaptiveHelperProfiles(DummyAdaptiveHelper):
    def __init__(self, *_args, **_kwargs):
        super().__init__()
        self.boost_applied = False

    async def get_adaptive_load_prediction(self):
        return {
            "today_profile": {
                "start_hour": 12,
                "hourly_consumption": [1.2],
                "avg_kwh_h": 0.8,
            },
            "tomorrow_profile": {
                "start_hour": 0,
                "hourly_consumption": [0.4],
                "avg_kwh_h": 0.5,
            },
        }

    async def calculate_recent_consumption_ratio(self, _profiles):
        return 1.2

    def apply_consumption_boost_to_forecast(self, *_args, **_kwargs):
        self.boost_applied = True


@pytest.mark.asyncio
async def test_forecast_update_skips_when_in_progress(monkeypatch):
    sensor = DummySensor()
    sensor._forecast_in_progress = True

    fixed_now = dt_util.as_local(datetime(2025, 1, 1, 12, 7, 0))
    monkeypatch.setattr(forecast_update_module.dt_util, "now", lambda: fixed_now)

    await forecast_update_module.async_update(sensor)

    assert sensor._forecast_in_progress is False
    assert sensor._last_forecast_bucket is None


@pytest.mark.asyncio
async def test_forecast_update_skips_same_bucket(monkeypatch):
    sensor = DummySensor()
    fixed_now = dt_util.as_local(datetime(2025, 1, 1, 12, 7, 0))
    bucket_start = fixed_now.replace(minute=0, second=0, microsecond=0)
    sensor._last_forecast_bucket = bucket_start

    monkeypatch.setattr(forecast_update_module.dt_util, "now", lambda: fixed_now)

    await forecast_update_module.async_update(sensor)

    assert sensor._last_forecast_bucket == bucket_start
    assert sensor._timeline_data == []


@pytest.mark.asyncio
async def test_forecast_update_retries_when_capacity_missing(monkeypatch):
    sensor = DummySensor()
    sensor._get_current_battery_capacity = lambda: None
    sensor._get_max_battery_capacity = lambda: None
    sensor._get_min_battery_capacity = lambda: None

    fixed_now = dt_util.as_local(datetime(2025, 1, 1, 12, 7, 0))
    monkeypatch.setattr(forecast_update_module.dt_util, "now", lambda: fixed_now)

    await forecast_update_module.async_update(sensor)

    assert sensor._retry == 10.0
    assert sensor._forecast_in_progress is False


@pytest.mark.asyncio
async def test_forecast_update_happy_path(monkeypatch):
    sensor = DummySensor()

    fixed_now = dt_util.as_local(datetime(2025, 1, 1, 12, 7, 0))
    monkeypatch.setattr(forecast_update_module.dt_util, "now", lambda: fixed_now)

    monkeypatch.setattr(
        forecast_update_module,
        "AdaptiveConsumptionHelper",
        DummyAdaptiveHelper,
    )
    monkeypatch.setattr(forecast_update_module, "HybridStrategy", DummyStrategy)
    monkeypatch.setattr(
        forecast_update_module,
        "get_load_avg_for_timestamp",
        lambda *_args, **_kwargs: 0.25,
    )
    monkeypatch.setattr(
        forecast_update_module,
        "get_solar_for_timestamp",
        lambda *_args, **_kwargs: 0.1,
    )
    monkeypatch.setattr(
        forecast_update_module,
        "build_planner_timeline",
        lambda **_kwargs: [
            {"time": "2025-01-01T12:00:00", "battery_capacity_kwh": 5.0}
        ],
    )
    monkeypatch.setattr(
        forecast_update_module, "attach_planner_reasons", lambda *_args, **_kwargs: None
    )
    monkeypatch.setattr(
        forecast_update_module,
        "add_decision_reasons_to_timeline",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "build_plan_lock",
        lambda **_kwargs: (None, []),
    )

    def _apply_mode_guard(**kwargs):
        return (kwargs["modes"], [], None)

    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "apply_mode_guard",
        _apply_mode_guard,
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "apply_guard_reasons_to_timeline",
        lambda *_args, **_kwargs: None,
    )

    import homeassistant.helpers.dispatcher as dispatcher

    monkeypatch.setattr(dispatcher, "async_dispatcher_send", lambda *_args, **_kwargs: None)

    await forecast_update_module.async_update(sensor)

    assert sensor._timeline_data
    assert sensor._mode_optimization_result is not None
    assert sensor._data_hash == "hash"
    assert sensor._state_written is True
    assert sensor.coordinator.battery_forecast_data is not None
    assert sensor._precompute_called is True
    assert sensor._last_forecast_bucket is not None


@pytest.mark.asyncio
async def test_forecast_update_with_adaptive_profiles(monkeypatch):
    sensor = DummySensor()
    sensor._side_effects_enabled = True

    async def _spot_prices():
        return [
            {"time": "2025-01-01T11:45:00", "price": 2.9},
            {"time": "2025-01-01T12:00:00", "price": 3.0},
            {"time": "2025-01-02T00:00:00", "price": 3.2},
        ]

    async def _export_prices():
        return [
            {"time": "2025-01-01T12:00:00", "price": 1.0},
        ]

    sensor._get_spot_price_timeline = _spot_prices
    sensor._get_export_price_timeline = _export_prices

    fixed_now = dt_util.as_local(datetime(2025, 1, 1, 12, 7, 0))
    monkeypatch.setattr(forecast_update_module.dt_util, "now", lambda: fixed_now)

    helper = DummyAdaptiveHelperProfiles()
    monkeypatch.setattr(
        forecast_update_module,
        "AdaptiveConsumptionHelper",
        lambda *_args, **_kwargs: helper,
    )
    monkeypatch.setattr(forecast_update_module, "HybridStrategy", DummyStrategy)

    def _load_avg(*_args, **_kwargs):
        raise AssertionError("load_avg should not be used with adaptive profiles")

    monkeypatch.setattr(forecast_update_module, "get_load_avg_for_timestamp", _load_avg)
    monkeypatch.setattr(
        forecast_update_module,
        "get_solar_for_timestamp",
        lambda *_args, **_kwargs: 0.2,
    )
    monkeypatch.setattr(
        forecast_update_module,
        "build_planner_timeline",
        lambda **_kwargs: [
            {"time": "2025-01-01T12:00:00", "battery_capacity_kwh": 5.0}
        ],
    )
    monkeypatch.setattr(
        forecast_update_module, "attach_planner_reasons", lambda *_args, **_kwargs: None
    )
    monkeypatch.setattr(
        forecast_update_module,
        "add_decision_reasons_to_timeline",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "build_plan_lock",
        lambda **_kwargs: (None, []),
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "apply_mode_guard",
        lambda **kwargs: (kwargs["modes"], [], None),
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "apply_guard_reasons_to_timeline",
        lambda *_args, **_kwargs: None,
    )

    called = {"auto": False}

    def _fake_auto(_sensor):
        called["auto"] = True

    monkeypatch.setattr(
        forecast_update_module.auto_switch_module,
        "update_auto_switch_schedule",
        _fake_auto,
    )

    def _create_task_threadsafe(func, *args):
        sensor._task = (func, args)
        func(*args)

    sensor._create_task_threadsafe = _create_task_threadsafe

    import homeassistant.helpers.dispatcher as dispatcher

    monkeypatch.setattr(dispatcher, "async_dispatcher_send", lambda *_a, **_k: None)

    await forecast_update_module.async_update(sensor)

    assert helper.boost_applied is True
    assert sensor._consumption_summary == {"summary": True}
    assert sensor._task[0] == _fake_auto
    assert called["auto"] is True


@pytest.mark.asyncio
async def test_forecast_update_skips_write_when_not_added(monkeypatch):
    sensor = DummySensor()
    sensor.hass = None

    fixed_now = dt_util.as_local(datetime(2025, 1, 1, 12, 7, 0))
    monkeypatch.setattr(forecast_update_module.dt_util, "now", lambda: fixed_now)

    monkeypatch.setattr(forecast_update_module, "AdaptiveConsumptionHelper", DummyAdaptiveHelper)
    monkeypatch.setattr(forecast_update_module, "HybridStrategy", DummyStrategy)
    monkeypatch.setattr(
        forecast_update_module,
        "get_load_avg_for_timestamp",
        lambda *_args, **_kwargs: 0.25,
    )
    monkeypatch.setattr(
        forecast_update_module,
        "get_solar_for_timestamp",
        lambda *_args, **_kwargs: 0.1,
    )
    monkeypatch.setattr(
        forecast_update_module,
        "build_planner_timeline",
        lambda **_kwargs: [
            {"time": "2025-01-01T12:00:00", "battery_capacity_kwh": 5.0}
        ],
    )
    monkeypatch.setattr(
        forecast_update_module, "attach_planner_reasons", lambda *_args, **_kwargs: None
    )
    monkeypatch.setattr(
        forecast_update_module,
        "add_decision_reasons_to_timeline",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "build_plan_lock",
        lambda **_kwargs: (None, []),
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "apply_mode_guard",
        lambda **kwargs: (kwargs["modes"], [], None),
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "apply_guard_reasons_to_timeline",
        lambda *_args, **_kwargs: None,
    )

    await forecast_update_module.async_update(sensor)

    assert sensor._state_written is False
    assert sensor._precompute_called is False
