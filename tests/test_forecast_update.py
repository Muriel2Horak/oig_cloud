from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as forecast_update_module,
)


class DummySensor:
    def __init__(self):
        self._forecast_in_progress = False
        self._last_forecast_bucket: datetime | None = None
        self._current_capacity: float | None = 5.0
        self._max_capacity = 10.0
        self._min_capacity = 2.0
        self._retry_delay = None
        self._log_entries = []
        self._plan_lock_until = None
        self._plan_lock_modes = None
        self._timeline_data = []
        self._hybrid_timeline = []
        self._mode_optimization_result = None
        self._mode_recommendations = []
        self._data_hash: str | None = None
        self._last_update = None
        self._consumption_summary = None
        self._first_update = True
        self._profiles_dirty = True
        self._last_precompute_hash = None
        self._last_precompute_at = None
        self._side_effects_enabled = False
        self._box_id = "123"
        self._config_entry = SimpleNamespace(options={})
        self._hass = SimpleNamespace(data={})
        self.hass = SimpleNamespace()
        self.coordinator = SimpleNamespace(battery_forecast_data=None)
        self._write_called = False
        self._precompute_called = False
        self._charging_metrics: dict[str, Any] = {}

    def _log_rate_limited(self, key, level, message, *args, **kwargs):
        self._log_entries.append((key, level, message))

    def _get_current_battery_capacity(self):
        return self._current_capacity

    def _get_max_battery_capacity(self):
        return self._max_capacity

    def _get_min_battery_capacity(self):
        return self._min_capacity

    def _schedule_forecast_retry(self, delay_s):
        self._retry_delay = delay_s

    async def _get_spot_price_timeline(self):
        now = datetime(2025, 1, 1, 12, 0, 0)
        return [{"time": now.isoformat(), "price": 1.0}]

    async def _get_export_price_timeline(self):
        now = datetime(2025, 1, 1, 12, 0, 0)
        return [{"time": now.isoformat(), "price": 0.5}]

    def _get_solar_forecast(self):
        return {}

    def _get_load_avg_sensors(self):
        return {}

    def _get_balancing_plan(self):
        return None

    def _get_target_battery_capacity(self):
        return None

    def _get_current_battery_soc_percent(self):
        return None

    def _get_battery_efficiency(self):
        return 0.9

    def _build_strategy_balancing_plan(self, *_args, **_kwargs):
        return None

    def _create_mode_recommendations(self, *_args, **_kwargs):
        return [{"mode": "Home 1"}]

    async def _maybe_fix_daily_plan(self):
        return None

    def _calculate_data_hash(self, _data):
        return "hash"

    def async_write_ha_state(self):
        self._write_called = True

    def _schedule_precompute(self, force=False):
        self._precompute_called = force

    def _create_task_threadsafe(self, *_args, **_kwargs):
        return None


class RecordingPlannerEmitter:
    def __init__(
        self,
        *,
        order: list[str] | None = None,
        should_raise: bool = False,
        result: bool = True,
    ) -> None:
        self.order = order
        self.should_raise = should_raise
        self.result = result
        self.events: list[dict[str, Any]] = []

    async def emit_cloud_event(self, event: dict[str, Any]) -> bool:
        if self.order is not None:
            self.order.append("emit")
        if self.should_raise:
            raise RuntimeError("broker unavailable")
        self.events.append(dict(event))
        return self.result


def _configure_planner_runtime(
    monkeypatch,
    sensor: DummySensor,
    *,
    fixed_now: datetime,
    planner_result: tuple[list[dict[str, Any]], dict[str, Any] | None, list[dict[str, Any]]],
    emitter: RecordingPlannerEmitter | None = None,
    box_id: str | None = "123",
    order: list[str] | None = None,
) -> None:
    entry_options = {"box_id": box_id} if box_id is not None else {}
    sensor._config_entry = SimpleNamespace(entry_id="entry-1", options=entry_options)
    sensor.hass = SimpleNamespace(
        data={
            "core.uuid": "core-uuid",
            "oig_cloud": {
                "entry-1": {
                    "telemetry": {"emitter": emitter},
                }
            },
        }
    )
    sensor._hass = sensor.hass

    async def _fake_prepare(_sensor, _bucket_start):
        return (
            5.0,
            10.0,
            2.0,
            [{"time": fixed_now.isoformat(), "price": 1.0}],
            [{"time": fixed_now.isoformat(), "price": 0.5}],
            {},
            None,
            SimpleNamespace(),
            [0.25],
        )

    def _fake_run_planner(*_args, **_kwargs):
        if order is not None:
            order.append("run")
        return planner_result

    def _fake_apply(sensor_obj, timeline, mode_result, recommendations):
        if order is not None:
            order.append("apply")
        sensor_obj._timeline_data = timeline
        sensor_obj._mode_optimization_result = mode_result
        sensor_obj._mode_recommendations = recommendations

    monkeypatch.setattr(
        "custom_components.oig_cloud.battery_forecast.planning.forecast_update.dt_util.now",
        lambda: fixed_now,
    )
    monkeypatch.setattr(
        forecast_update_module, "_prepare_forecast_inputs", _fake_prepare
    )
    monkeypatch.setattr(
        forecast_update_module, "_resolve_target_and_soc", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        forecast_update_module, "_build_solar_kwh_list", lambda *_a, **_k: [0.1]
    )
    monkeypatch.setattr(forecast_update_module, "_run_planner", _fake_run_planner)
    monkeypatch.setattr(
        forecast_update_module, "_apply_planner_results", _fake_apply
    )
    monkeypatch.setattr(
        forecast_update_module, "_post_update_housekeeping", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        forecast_update_module, "_dispatch_forecast_updated", lambda *_a, **_k: None
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("planner_result", "expected_event_name", "expected_result"),
    [
        (
            (
                [{"recommended_mode": "HOME_I"}],
                {
                    "planning_min_kwh": 3.3,
                    "target_kwh": 8.4,
                    "optimal_modes": ["HOME_I"],
                    "infeasible": False,
                },
                [{"mode": "Home 1"}],
            ),
            "planner_run_completed",
            "success",
        ),
        (
            (
                [],
                {
                    "planning_min_kwh": 3.3,
                    "target_kwh": 8.4,
                    "optimal_modes": [],
                    "infeasible": False,
                },
                [],
            ),
            "planner_run_empty",
            "empty",
        ),
        (([], None, []), "planner_run_failed", "failed"),
    ],
)
async def test_async_update_emits_one_planner_summary_before_apply_results(
    monkeypatch,
    planner_result,
    expected_event_name,
    expected_result,
):
    fixed_now = datetime(2025, 1, 1, 12, 7, 0, tzinfo=timezone.utc)
    bucket_start = fixed_now.replace(minute=0, second=0, microsecond=0)
    order: list[str] = []
    emitter = RecordingPlannerEmitter(order=order)
    sensor = DummySensor()

    _configure_planner_runtime(
        monkeypatch,
        sensor,
        fixed_now=fixed_now,
        planner_result=planner_result,
        emitter=emitter,
        order=order,
    )

    await forecast_update_module.async_update(sensor)

    assert order == ["run", "emit", "apply"]
    assert len(emitter.events) == 1
    assert emitter.events[0]["event_name"] == expected_event_name
    assert emitter.events[0]["result"] == expected_result
    assert emitter.events[0]["run_id"] == f"123:{bucket_start.isoformat()}"
    assert emitter.events[0]["correlation_id"] == f"123:{bucket_start.isoformat()}"
    assert emitter.events[0]["device_id"] == "123"
    assert emitter.events[0]["metric_decisions_count"] == 0
    assert "optimal_timeline" not in emitter.events[0]
    assert "optimal_modes" not in emitter.events[0]
    assert "params" not in emitter.events[0]
    assert sensor._mode_optimization_result is planner_result[1]


@pytest.mark.asyncio
async def test_async_update_logs_marker_when_planner_telemetry_emit_fails_open(
    monkeypatch, caplog
):
    fixed_now = datetime(2025, 1, 1, 12, 7, 0, tzinfo=timezone.utc)
    run_id = "123:2025-01-01T12:00:00+00:00"
    order: list[str] = []
    emitter = RecordingPlannerEmitter(order=order, should_raise=True)
    sensor = DummySensor()

    _configure_planner_runtime(
        monkeypatch,
        sensor,
        fixed_now=fixed_now,
        planner_result=(
            [{"recommended_mode": "HOME_I"}],
            {
                "planning_min_kwh": 3.3,
                "target_kwh": 8.4,
                "optimal_modes": ["HOME_I"],
                "infeasible": False,
            },
            [],
        ),
        emitter=emitter,
        order=order,
    )

    with caplog.at_level(logging.WARNING):
        await forecast_update_module.async_update(sensor)

    assert order == ["run", "emit", "apply"]
    assert sensor._timeline_data == [{"recommended_mode": "HOME_I"}]
    assert (
        f"[OIG_CLOUD_WARNING][component=planner][corr={run_id}][run={run_id}]"
        in caplog.text
    )


@pytest.mark.asyncio
async def test_async_update_skips_planner_telemetry_without_device_id_and_logs_marker(
    monkeypatch, caplog
):
    fixed_now = datetime(2025, 1, 1, 12, 7, 0, tzinfo=timezone.utc)
    run_id = "123:2025-01-01T12:00:00+00:00"
    order: list[str] = []
    emitter = RecordingPlannerEmitter(order=order)
    sensor = DummySensor()

    _configure_planner_runtime(
        monkeypatch,
        sensor,
        fixed_now=fixed_now,
        planner_result=(
            [{"recommended_mode": "HOME_I"}],
            {
                "planning_min_kwh": 3.3,
                "target_kwh": 8.4,
                "optimal_modes": ["HOME_I"],
                "infeasible": False,
            },
            [],
        ),
        emitter=emitter,
        box_id=None,
        order=order,
    )

    with caplog.at_level(logging.WARNING):
        await forecast_update_module.async_update(sensor)

    assert order == ["run", "apply"]
    assert emitter.events == []
    assert sensor._timeline_data == [{"recommended_mode": "HOME_I"}]
    assert (
        f"[OIG_CLOUD_WARNING][component=planner][corr={run_id}][run={run_id}]"
        in caplog.text
    )


@pytest.mark.asyncio
async def test_async_update_skips_when_in_progress(monkeypatch):
    sensor = DummySensor()
    sensor._forecast_in_progress = True

    await forecast_update_module.async_update(sensor)

    assert sensor._forecast_in_progress is False
    assert sensor._last_forecast_bucket is None


@pytest.mark.asyncio
async def test_async_update_skips_same_bucket(monkeypatch):
    fixed_now = datetime(2025, 1, 1, 12, 7, 0)
    bucket_start = fixed_now.replace(minute=0, second=0, microsecond=0)

    sensor = DummySensor()
    sensor._last_forecast_bucket = bucket_start

    monkeypatch.setattr(
        "custom_components.oig_cloud.battery_forecast.planning.forecast_update.dt_util.now",
        lambda: fixed_now,
    )

    await forecast_update_module.async_update(sensor)

    assert sensor._forecast_in_progress is False
    assert sensor._last_forecast_bucket == bucket_start


@pytest.mark.asyncio
async def test_async_update_missing_capacity_schedules_retry(monkeypatch):
    fixed_now = datetime(2025, 1, 1, 12, 7, 0)

    sensor = DummySensor()
    sensor._current_capacity = None

    monkeypatch.setattr(
        "custom_components.oig_cloud.battery_forecast.planning.forecast_update.dt_util.now",
        lambda: fixed_now,
    )

    await forecast_update_module.async_update(sensor)

    assert sensor._retry_delay == 10.0
    assert sensor._last_forecast_bucket is None
    assert sensor._forecast_in_progress is False


@pytest.mark.asyncio
async def test_async_update_happy_path(monkeypatch):
    fixed_now = datetime(2025, 1, 1, 12, 7, 0)
    bucket_start = fixed_now.replace(minute=0, second=0, microsecond=0)

    sensor = DummySensor()
    sensor.hass = SimpleNamespace()

    monkeypatch.setattr(
        "custom_components.oig_cloud.battery_forecast.planning.forecast_update.dt_util.now",
        lambda: fixed_now,
    )

    monkeypatch.setattr(
        "custom_components.oig_cloud.battery_forecast.planning.forecast_update.get_load_avg_for_timestamp",
        lambda *_a, **_k: 0.25,
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.battery_forecast.planning.forecast_update.get_solar_for_timestamp",
        lambda *_a, **_k: 0.1,
    )

    class DummyAdaptiveHelper:
        def __init__(self, *_args, **_kwargs):
            pass

        async def get_adaptive_load_prediction(self):
            return None

        async def calculate_recent_consumption_ratio(self, _profiles):
            return None

        def calculate_consumption_summary(self, _profiles):
            return {}

        def apply_consumption_boost_to_forecast(self, *_args, **_kwargs):
            return None

    monkeypatch.setattr(
        forecast_update_module, "AdaptiveConsumptionHelper", DummyAdaptiveHelper
    )

    class DummyResult:
        modes = ["HOME1"]
        decisions = []
        infeasible = False
        infeasible_reason = None

    monkeypatch.setattr(
        forecast_update_module, "plan_battery_schedule", lambda *_a, **_k: DummyResult()
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "build_plan_lock",
        lambda *_a, **_k: (None, None),
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "apply_mode_guard",
        lambda *_a, **_k: (["HOME1"], {}, None),
    )
    monkeypatch.setattr(
        forecast_update_module,
        "build_planner_timeline",
        lambda *_a, **_k: [{"battery_capacity_kwh": 4.0}],
    )
    monkeypatch.setattr(
        forecast_update_module, "attach_planner_reasons", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        forecast_update_module, "add_decision_reasons_to_timeline", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "apply_guard_reasons_to_timeline",
        lambda *_a, **_k: None,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.dispatcher.async_dispatcher_send",
        lambda *_a, **_k: None,
    )

    await forecast_update_module.async_update(sensor)

    assert sensor._timeline_data
    assert sensor._data_hash == "hash"
    assert sensor._last_forecast_bucket == bucket_start
    assert sensor._forecast_in_progress is False
    assert sensor._write_called is True
    assert sensor._precompute_called is True
    assert sensor._charging_metrics["planner_decision_trace"] == []
    mode_optimization_result = sensor._mode_optimization_result
    assert mode_optimization_result is not None
    assert mode_optimization_result["target_kwh"] == pytest.approx(3.3)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "disable_guard,expected_min_percent",
    [
        (False, 30.0),
        (True, 30.0),
    ],
)
async def test_async_update_planner_options(monkeypatch, disable_guard, expected_min_percent):
    fixed_now = datetime(2025, 1, 1, 12, 7, 0)
    sensor = DummySensor()
    sensor.hass = SimpleNamespace()
    sensor._config_entry = SimpleNamespace(
        options={
            "disable_planning_min_guard": disable_guard,
            "min_capacity_percent": 30.0,
            "target_capacity_percent": 85.0,
            "max_ups_price_czk": 12.5,
            "home_charge_rate": 4.2,
        }
    )

    monkeypatch.setattr(
        "custom_components.oig_cloud.battery_forecast.planning.forecast_update.dt_util.now",
        lambda: fixed_now,
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.battery_forecast.planning.forecast_update.get_load_avg_for_timestamp",
        lambda *_a, **_k: 0.25,
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.battery_forecast.planning.forecast_update.get_solar_for_timestamp",
        lambda *_a, **_k: 0.1,
    )

    class DummyAdaptiveHelper:
        def __init__(self, *_args, **_kwargs):
            pass

        async def get_adaptive_load_prediction(self):
            return None

        async def calculate_recent_consumption_ratio(self, _profiles):
            return None

        def calculate_consumption_summary(self, _profiles):
            return {}

        def apply_consumption_boost_to_forecast(self, *_args, **_kwargs):
            return None

    monkeypatch.setattr(
        forecast_update_module, "AdaptiveConsumptionHelper", DummyAdaptiveHelper
    )

    class DummyResult:
        modes = ["HOME1"]
        decisions = []
        infeasible = False
        infeasible_reason = None

    captured = {}

    def _fake_plan(inputs):
        captured["inputs"] = inputs
        return DummyResult()

    monkeypatch.setattr(forecast_update_module, "plan_battery_schedule", _fake_plan)
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "build_plan_lock",
        lambda *_a, **_k: (None, None),
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "apply_mode_guard",
        lambda *_a, **_k: (["HOME1"], {}, None),
    )
    monkeypatch.setattr(
        forecast_update_module,
        "build_planner_timeline",
        lambda *_a, **_k: [{"battery_capacity_kwh": 4.0}],
    )
    monkeypatch.setattr(
        forecast_update_module, "attach_planner_reasons", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        forecast_update_module, "add_decision_reasons_to_timeline", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "apply_guard_reasons_to_timeline",
        lambda *_a, **_k: None,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.dispatcher.async_dispatcher_send",
        lambda *_a, **_k: None,
    )

    await forecast_update_module.async_update(sensor)

    assert captured["inputs"].planning_min_percent == expected_min_percent
    assert captured["inputs"].charge_rate_kw == 4.2
