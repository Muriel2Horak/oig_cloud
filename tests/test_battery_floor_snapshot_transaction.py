"""Transactional BOX battery-floor planning.

Planner readiness reads the live BOX ``bat_min`` sensor once; asynchronous
input collection then runs; and the old ``_run_planner()`` read the same
sensor again before committing. A changed or unavailable value between the
two reads let readiness accept one floor while planning used another --
and the inconsistent result was still summarized, published, broadcast and
persisted.

The fix is one immutable snapshot captured before any awaited planner input
collection, threaded through readiness and planning, with an identity check
(entity ID, raw state, ``last_updated``) immediately before the first result
side effect. A mismatch discards the entire result and leaves the bucket
open for the next tick; a stable identity commits exactly as before.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as forecast_update_module,
)

BOX_ID = "2206237016"
BAT_MIN_ENTITY_ID = f"sensor.oig_local_{BOX_ID}_tbl_batt_prms_bat_min"
PLANNER_LOGGER = "custom_components.oig_cloud.battery_forecast.planning.forecast_update"


class _PlannerSensor:
    """Battery-forecast sensor stand-in wired to a real ``hass``."""

    def __init__(self, hass, options: dict[str, Any] | None = None) -> None:
        self._forecast_in_progress = False
        self._last_forecast_bucket: datetime | None = None
        self._current_capacity: float | None = 5.0
        self._max_capacity = 10.0
        self._min_capacity = 2.0
        self._retry_delay: float | None = None
        self._plan_lock_until = None
        self._plan_lock_modes = None
        self._timeline_data: list = []
        self._hybrid_timeline: list = []
        self._mode_optimization_result = None
        self._mode_recommendations: list = []
        self._data_hash: str | None = None
        self._last_update = None
        self._consumption_summary = None
        self._first_update = True
        self._profiles_dirty = True
        self._last_precompute_hash = None
        self._last_precompute_at = None
        self._side_effects_enabled = False
        self._box_id = BOX_ID
        self._config_entry = SimpleNamespace(options=dict(options or {}))
        self.hass = hass
        self._hass = hass
        self.coordinator = SimpleNamespace(battery_forecast_data=None)
        self._charging_metrics: dict[str, Any] = {}
        self.log_calls: list[tuple[str, str, str]] = []
        self.write_called = False
        self.write_calls = 0
        self.precompute_called = False
        self.daily_plan_calls = 0

    def _log_rate_limited(self, key, level, message, *args, **kwargs):
        self.log_calls.append((key, level, message % args if args else message))
        logger = logging.getLogger(PLANNER_LOGGER)
        getattr(logger, level, logger.debug)(message, *args)

    def _get_current_battery_capacity(self):
        return self._current_capacity

    def _get_max_battery_capacity(self):
        return self._max_capacity

    def _get_min_battery_capacity(self):
        return self._min_capacity

    def _schedule_forecast_retry(self, delay_s):
        self._retry_delay = delay_s

    async def _get_spot_price_timeline(self):
        return [{"time": datetime(2026, 8, 11, 12, 0).isoformat(), "price": 1.0}]

    async def _get_export_price_timeline(self):
        return [{"time": datetime(2026, 8, 11, 12, 0).isoformat(), "price": 0.5}]

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
        self.daily_plan_calls += 1
        return None

    def _calculate_data_hash(self, _data):
        return "hash"

    def async_write_ha_state(self):
        self.write_called = True
        self.write_calls += 1

    def _schedule_precompute(self, force=False):
        self.precompute_called = True

    def _create_task_threadsafe(self, *_args, **_kwargs):
        return None


class _Spy:
    """Records calls and delegates to the real implementation."""

    def __init__(self, target):
        self.target = target
        self.calls = 0

    def __call__(self, *args, **kwargs):
        self.calls += 1
        return self.target(*args, **kwargs)


class _PlanResult:
    modes = ["HOME1"]
    decisions: list = []
    infeasible = False
    infeasible_reason = None


@pytest.fixture
def planner_env(monkeypatch):
    """Neutralise everything except the floor-snapshot transaction under test."""
    fixed_now = datetime(2026, 8, 11, 12, 7, 0, tzinfo=timezone.utc)
    clock = {"now": fixed_now}

    monkeypatch.setattr(
        forecast_update_module.dt_util, "now", lambda *_a, **_k: clock["now"]
    )
    monkeypatch.setattr(
        forecast_update_module, "get_load_avg_for_timestamp", lambda *_a, **_k: 0.25
    )
    monkeypatch.setattr(
        forecast_update_module, "get_solar_for_timestamp", lambda *_a, **_k: 0.1
    )

    class _AdaptiveHelper:
        def __init__(self, *_args, **_kwargs):
            pass

        async def get_adaptive_load_prediction(self):
            return None

        async def calculate_recent_consumption_ratio(self, _profiles):
            return None

        def calculate_consumption_summary(self, _profiles):
            return {}

        async def calculate_observed_consumption_ratio(self, *_args, **_kwargs):
            return None

        def apply_consumption_boost_to_forecast(self, *_args, **_kwargs):
            return None

        def apply_solar_correction_to_forecast(self, *_args, **_kwargs):
            return None

    monkeypatch.setattr(
        forecast_update_module, "AdaptiveConsumptionHelper", _AdaptiveHelper
    )
    monkeypatch.setattr(
        forecast_update_module, "plan_battery_schedule", lambda *_a, **_k: _PlanResult()
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
        forecast_update_module,
        "add_decision_reasons_to_timeline",
        lambda *_a, **_k: None,
    )
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "apply_guard_reasons_to_timeline",
        lambda *_a, **_k: None,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.dispatcher.async_dispatcher_send", lambda *_a, **_k: None
    )

    spies = {
        name: _Spy(getattr(forecast_update_module, name))
        for name in ("_run_planner", "_apply_planner_results", "_dispatch_forecast_updated")
    }
    for name, spy in spies.items():
        monkeypatch.setattr(forecast_update_module, name, spy)

    return SimpleNamespace(clock=clock, spies=spies)


def _local_only(**extra) -> dict:
    return {"data_source_mode": "local_only", "box_id": BOX_ID, **extra}


def _cloud_only(**extra) -> dict:
    return {"data_source_mode": "cloud_only", "box_id": BOX_ID, **extra}


def _set_floor(hass, value: str) -> None:
    hass.states.async_set(BAT_MIN_ENTITY_ID, value)


# ---------------------------------------------------------------------------
# 1. BOX floor changes during an awaited input-collection step
# ---------------------------------------------------------------------------


async def test_bat_min_change_during_input_collection_discards_every_result_side_effect(
    hass, planner_env, monkeypatch
):
    sensor = _PlannerSensor(hass, _local_only())
    _set_floor(hass, "15")
    await hass.async_block_till_done()

    async def mutate_during_collection(*_args, **_kwargs):
        _set_floor(hass, "unavailable")
        await hass.async_block_till_done()

    monkeypatch.setattr(
        forecast_update_module,
        "_maybe_apply_solar_correction",
        mutate_during_collection,
    )

    await forecast_update_module.async_update(sensor)

    assert sensor._timeline_data == []
    assert sensor.write_called is False
    assert sensor.daily_plan_calls == 0
    assert planner_env.spies["_apply_planner_results"].calls == 0
    assert planner_env.spies["_dispatch_forecast_updated"].calls == 0
    assert sensor._last_forecast_bucket is None, "the bucket must stay open"


# ---------------------------------------------------------------------------
# 2. BOX floor changes after planning but before the result commit
# ---------------------------------------------------------------------------


async def test_floor_identity_change_before_commit_discards_plan(
    hass, planner_env, monkeypatch
):
    sensor = _PlannerSensor(hass, _local_only())
    _set_floor(hass, "15")
    await hass.async_block_till_done()

    pre_run_lock_until = sensor._plan_lock_until
    pre_run_lock_modes = sensor._plan_lock_modes
    pre_run_charging_metrics = dict(sensor._charging_metrics)

    fresh_lock_until = datetime(2026, 8, 11, 13, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(
        forecast_update_module.mode_guard_module,
        "build_plan_lock",
        lambda *_a, **_k: (fresh_lock_until, ["HOME1"]),
    )
    monkeypatch.setattr(
        forecast_update_module,
        "build_planner_decision_trace",
        lambda *_a, **_k: [{"decision": "charge"}],
    )

    def mutate_after_plan(*_args, **_kwargs):
        _set_floor(hass, "16")
        return _PlanResult()

    monkeypatch.setattr(
        forecast_update_module, "plan_battery_schedule", mutate_after_plan
    )

    await forecast_update_module.async_update(sensor)

    assert sensor._timeline_data == []
    assert sensor.write_called is False
    assert sensor.daily_plan_calls == 0
    assert planner_env.spies["_apply_planner_results"].calls == 0
    assert planner_env.spies["_dispatch_forecast_updated"].calls == 0
    assert sensor._last_forecast_bucket is None, "the bucket must stay open"

    # The discarded run must leave zero trace: plan_battery_schedule() returned
    # a non-empty lock/decision trace before the floor moved, and _run_planner
    # writes those onto the sensor before async_update ever reaches the
    # commit-identity gate. A discard that only skips publication while
    # leaving this write in place still steers (or surfaces via
    # planner_decision_trace) the next run.
    assert sensor._plan_lock_until == pre_run_lock_until
    assert sensor._plan_lock_modes == pre_run_lock_modes
    assert sensor._charging_metrics == pre_run_charging_metrics
    assert "planner_decision_trace" not in sensor._charging_metrics

    # A later, stable run is not blinded by the rollback: it must compute and
    # commit its own fresh lock/trace exactly once.
    await forecast_update_module.async_update(sensor)

    assert sensor._plan_lock_until == fresh_lock_until
    assert sensor._plan_lock_modes == ["HOME1"]
    assert sensor._charging_metrics["planner_decision_trace"] == [
        {"decision": "charge"}
    ]
    assert sensor._last_forecast_bucket is not None


async def test_floor_change_during_summary_emit_discards_plan(
    hass, planner_env, monkeypatch
):
    """A state change in the awaited summary window invalidates the plan."""
    sensor = _PlannerSensor(hass, _local_only())
    _set_floor(hass, "15")
    await hass.async_block_till_done()

    async def mutate_during_summary(*_args, **_kwargs):
        _set_floor(hass, "35")
        await hass.async_block_till_done()

    monkeypatch.setattr(
        forecast_update_module,
        "_emit_planner_summary_event",
        mutate_during_summary,
    )

    await forecast_update_module.async_update(sensor)

    assert sensor._timeline_data == []
    assert planner_env.spies["_apply_planner_results"].calls == 0
    assert sensor._last_forecast_bucket is None


async def test_planner_exception_after_floor_change_discards_failure_metrics(
    hass, planner_env, monkeypatch
):
    """The exception path in ``_run_planner`` also writes to the sensor before
    the commit gate -- a discard must roll that back too, not just the
    success path's lock/trace."""
    sensor = _PlannerSensor(hass, _local_only())
    _set_floor(hass, "15")
    await hass.async_block_till_done()

    pre_run_charging_metrics = dict(sensor._charging_metrics)

    def mutate_then_raise(*_args, **_kwargs):
        _set_floor(hass, "16")
        raise RuntimeError("boom")

    monkeypatch.setattr(
        forecast_update_module, "plan_battery_schedule", mutate_then_raise
    )

    await forecast_update_module.async_update(sensor)

    assert sensor._charging_metrics == pre_run_charging_metrics
    assert "planner_failure_class" not in sensor._charging_metrics
    assert sensor._last_forecast_bucket is None, "the bucket must stay open"


# ---------------------------------------------------------------------------
# 3. Stable control: no mutation, single commit
# ---------------------------------------------------------------------------


async def test_stable_floor_snapshot_commits_once(hass, planner_env):
    sensor = _PlannerSensor(hass, _local_only())
    _set_floor(hass, "15")
    await hass.async_block_till_done()

    await forecast_update_module.async_update(sensor)

    assert sensor._timeline_data == [{"battery_capacity_kwh": 4.0}]
    assert sensor.write_called is True
    assert sensor.write_calls == 1
    assert sensor.daily_plan_calls == 1
    assert planner_env.spies["_apply_planner_results"].calls == 1
    assert planner_env.spies["_dispatch_forecast_updated"].calls == 1
    assert sensor._mode_optimization_result["target_kwh"] == pytest.approx(1.7)
    assert sensor._last_forecast_bucket is not None, "a stable plan commits the bucket"


# ---------------------------------------------------------------------------
# 4. Backward compatibility: a config-entry-like double without `.options`
# ---------------------------------------------------------------------------


async def test_capture_box_floor_snapshot_tolerates_config_entry_without_options(
    hass,
):
    """A non-``None`` ``_config_entry`` that has no ``.options`` attribute (a
    partial test double, or a config-entry stand-in from an older caller)
    must not raise out of floor classification -- only ``local_mode``
    depends on it, and that is best-effort, not load-bearing."""
    sensor = _PlannerSensor(hass, _local_only())
    sensor._config_entry = SimpleNamespace()  # no .options
    _set_floor(hass, "15")
    await hass.async_block_till_done()

    snapshot = forecast_update_module._capture_box_floor_snapshot(sensor)

    assert snapshot.percent == 15.0
    assert snapshot.reason_class == forecast_update_module.BAT_MIN_OK


async def test_stable_run_with_config_entry_without_options_still_commits(
    hass, planner_env
):
    """End-to-end: a full async_update() with a `.options`-less config entry
    must reach a normal commit, not abort silently into the outer
    except-and-log handler."""
    sensor = _PlannerSensor(hass, _local_only())
    sensor._config_entry = SimpleNamespace()  # no .options
    _set_floor(hass, "15")
    await hass.async_block_till_done()

    await forecast_update_module.async_update(sensor)

    assert sensor.write_called is True
    assert sensor._last_forecast_bucket is not None


# ---------------------------------------------------------------------------
# 5. Source-mode switches during awaited work discard the plan
# ---------------------------------------------------------------------------


async def test_local_to_cloud_mode_switch_during_input_collection_discards_result(
    hass, planner_env, monkeypatch
):
    sensor = _PlannerSensor(hass, _local_only())
    _set_floor(hass, "15")
    await hass.async_block_till_done()

    original_prepare = forecast_update_module._prepare_forecast_inputs

    async def mutate_and_prepare(*args, **kwargs):
        sensor._config_entry.options["data_source_mode"] = "cloud_only"
        return await original_prepare(*args, **kwargs)

    monkeypatch.setattr(
        forecast_update_module, "_prepare_forecast_inputs", mutate_and_prepare
    )

    await forecast_update_module.async_update(sensor)

    assert sensor._timeline_data == []
    assert sensor.write_called is False
    assert sensor.daily_plan_calls == 0
    assert planner_env.spies["_apply_planner_results"].calls == 0
    assert planner_env.spies["_dispatch_forecast_updated"].calls == 0
    assert sensor._last_forecast_bucket is None, "the bucket must stay open"


async def test_local_to_cloud_mode_switch_during_planner_execution_discards_result(
    hass, planner_env, monkeypatch
):
    sensor = _PlannerSensor(hass, _local_only())
    _set_floor(hass, "15")
    await hass.async_block_till_done()

    def mutate_and_plan(*args, **kwargs):
        sensor._config_entry.options["data_source_mode"] = "cloud_only"
        return _PlanResult()

    monkeypatch.setattr(
        forecast_update_module, "plan_battery_schedule", mutate_and_plan
    )

    await forecast_update_module.async_update(sensor)

    assert sensor._timeline_data == []
    assert sensor.write_called is False
    assert sensor.daily_plan_calls == 0
    assert planner_env.spies["_apply_planner_results"].calls == 0
    assert planner_env.spies["_dispatch_forecast_updated"].calls == 0
    assert sensor._last_forecast_bucket is None, "the bucket must stay open"


async def test_cloud_to_local_mode_switch_during_awaited_work_discards_result(
    hass, planner_env, monkeypatch
):
    sensor = _PlannerSensor(hass, _cloud_only())
    # No BOX floor entity is expected in cloud-only mode.
    await hass.async_block_till_done()

    original_prepare = forecast_update_module._prepare_forecast_inputs

    async def mutate_and_prepare(*args, **kwargs):
        sensor._config_entry.options["data_source_mode"] = "local_only"
        return await original_prepare(*args, **kwargs)

    monkeypatch.setattr(
        forecast_update_module, "_prepare_forecast_inputs", mutate_and_prepare
    )

    await forecast_update_module.async_update(sensor)

    assert sensor._timeline_data == []
    assert sensor.write_called is False
    assert sensor.daily_plan_calls == 0
    assert planner_env.spies["_apply_planner_results"].calls == 0
    assert planner_env.spies["_dispatch_forecast_updated"].calls == 0
    assert sensor._last_forecast_bucket is None, "the bucket must stay open"


# ---------------------------------------------------------------------------
# 6. Stable source-mode negative controls commit once
# ---------------------------------------------------------------------------


async def test_stable_cloud_only_snapshot_commits_once(hass, planner_env):
    sensor = _PlannerSensor(hass, _cloud_only())
    await hass.async_block_till_done()

    await forecast_update_module.async_update(sensor)

    assert sensor._timeline_data == [{"battery_capacity_kwh": 4.0}]
    assert sensor.write_called is True
    assert sensor.write_calls == 1
    assert sensor.daily_plan_calls == 1
    assert planner_env.spies["_apply_planner_results"].calls == 1
    assert planner_env.spies["_dispatch_forecast_updated"].calls == 1
    assert sensor._mode_optimization_result["target_kwh"] == pytest.approx(2.2)
    assert sensor._last_forecast_bucket is not None, "a stable cloud plan commits the bucket"
