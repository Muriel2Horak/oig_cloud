"""Startup readiness of the BOX battery-minimum floor before the first plan.

The planner's hardware floor comes from the box's own ``bat_min`` trigger,
published by the local proxy as
``sensor.oig_local_<box>_tbl_batt_prms_bat_min``. During Home Assistant startup
that entity does not exist yet, so the resolver falls through to the configured
20 % fallback.

Suppressing the resulting warning is not a fix. A plan is not a log line: it is
applied to the sensor, broadcast to dependent entities and can lock a mode for
the next hour. Publishing one built on a floor the box does not actually use is
the defect; the warning was only the symptom. So for an install configured for
local data the planner must **wait** for the floor instead of guessing it --
bounded by the operator's own proxy-staleness window, after which a genuinely
absent proxy is reported truthfully and the fallback is used.

Distinct conditions, distinct handling:

* entity absent / unavailable -> not yet knowable; defer, retry, no warning
* entity absent past the grace window -> truthful warning, fallback floor
* entity present but malformed / implausible -> the box answered with something
  unusable; use the fallback now, and log the reason *class* only
* configured cloud-only -> no proxy exists to wait for; never defer
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as forecast_update_module,
)

BOX_ID = "2206237016"
BAT_MIN_ENTITY_ID = f"sensor.oig_local_{BOX_ID}_tbl_batt_prms_bat_min"
PLANNER_LOGGER = "custom_components.oig_cloud.battery_forecast.planning.forecast_update"

# max_capacity is 10 kWh below, so a floor percentage maps to target_kwh as
# (percent + 2 % box safety margin) / 100 * 10.
TARGET_KWH_FOR_15_PCT = 1.7
TARGET_KWH_FOR_20_PCT_FALLBACK = 2.2


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
        self.precompute_called = False

    # Production proxies straight onto the module logger, so caplog observes
    # exactly what an operator would see in home-assistant.log.
    def _log_rate_limited(self, key, level, message, *args, **kwargs):
        self.log_calls.append((key, level, message % args if args else message))
        getattr(logging.getLogger(PLANNER_LOGGER), level, None)
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
        return None

    def _calculate_data_hash(self, _data):
        return "hash"

    def async_write_ha_state(self):
        self.write_called = True

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


@pytest.fixture
def planner_env(monkeypatch):
    """Neutralise everything except the floor resolution under test."""
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

    class _PlanResult:
        modes = ["HOME1"]
        decisions: list = []
        infeasible = False
        infeasible_reason = None

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


def _advance(planner_env, sensor, delta: timedelta) -> None:
    """Move the planner clock and open the next 15-minute bucket."""
    planner_env.clock["now"] = planner_env.clock["now"] + delta
    sensor._last_forecast_bucket = None
    sensor._profiles_dirty = True


# ---------------------------------------------------------------------------
# 1. Proxy absent during startup: nothing is planned, applied or broadcast
# ---------------------------------------------------------------------------


async def test_startup_without_proxy_publishes_no_fallback_plan(
    hass, planner_env, caplog
):
    caplog.set_level(logging.DEBUG, logger=PLANNER_LOGGER)
    sensor = _PlannerSensor(hass, _local_only())

    assert hass.states.get(BAT_MIN_ENTITY_ID) is None, "precondition: entity absent"

    await forecast_update_module.async_update(sensor)

    assert planner_env.spies["_run_planner"].calls == 0, "planner ran on a guessed floor"
    assert planner_env.spies["_apply_planner_results"].calls == 0
    assert planner_env.spies["_dispatch_forecast_updated"].calls == 0
    assert sensor._timeline_data == []
    assert sensor._mode_optimization_result is None
    assert sensor.write_called is False
    assert sensor._last_forecast_bucket is None, "bucket closed; the retry would be skipped"
    assert sensor._retry_delay is not None, "no retry was scheduled"

    warnings = [rec for rec in caplog.records if rec.levelno >= logging.WARNING]
    assert not warnings, [rec.getMessage() for rec in warnings]


async def test_plan_uses_the_box_floor_once_the_proxy_registers(hass, planner_env):
    sensor = _PlannerSensor(hass, _local_only())

    await forecast_update_module.async_update(sensor)
    assert planner_env.spies["_run_planner"].calls == 0

    # The local proxy finishes starting and publishes the real trigger.
    hass.states.async_set(BAT_MIN_ENTITY_ID, "15")
    await hass.async_block_till_done()

    _advance(planner_env, sensor, timedelta(minutes=1))
    await forecast_update_module.async_update(sensor)

    assert planner_env.spies["_run_planner"].calls == 1
    assert planner_env.spies["_apply_planner_results"].calls == 1
    assert planner_env.spies["_dispatch_forecast_updated"].calls == 1
    assert sensor._mode_optimization_result is not None
    assert sensor._mode_optimization_result["target_kwh"] == pytest.approx(
        TARGET_KWH_FOR_15_PCT
    ), "the plan was not built on the box-reported 15 % floor"


# ---------------------------------------------------------------------------
# 2. Present but unusable: fallback now, reason class only
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "raw_value,expected_class",
    [
        ("not-a-number", forecast_update_module.BAT_MIN_MALFORMED),
        ("150", forecast_update_module.BAT_MIN_IMPLAUSIBLE),
        # Distinctive digits: a bare "0" would collide with the box id and the
        # timestamp in the log marker and make the leak check vacuous.
        ("-7.5", forecast_update_module.BAT_MIN_IMPLAUSIBLE),
    ],
)
async def test_unusable_present_value_warns_class_only_and_uses_fallback(
    hass, planner_env, caplog, raw_value, expected_class
):
    caplog.set_level(logging.WARNING, logger=PLANNER_LOGGER)
    sensor = _PlannerSensor(hass, _local_only())

    hass.states.async_set(BAT_MIN_ENTITY_ID, raw_value)
    await hass.async_block_till_done()

    await forecast_update_module.async_update(sensor)

    assert planner_env.spies["_run_planner"].calls == 1, "a present value must not defer"
    assert sensor._mode_optimization_result["target_kwh"] == pytest.approx(
        TARGET_KWH_FOR_20_PCT_FALLBACK
    )

    messages = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == PLANNER_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert messages, "an unusable box value must still be reported"
    assert any(f"reason_class={expected_class}" in msg for msg in messages), messages
    for msg in messages:
        assert raw_value not in msg, f"warning echoed the raw sensor value: {msg}"


# ---------------------------------------------------------------------------
# 3. Sustained absence past the bounded grace window
# ---------------------------------------------------------------------------


async def test_sustained_absence_warns_truthfully_after_grace_and_plans(
    hass, planner_env, caplog
):
    caplog.set_level(logging.DEBUG, logger=PLANNER_LOGGER)
    sensor = _PlannerSensor(hass, _local_only(local_proxy_stale_minutes=10))

    await forecast_update_module.async_update(sensor)
    assert planner_env.spies["_run_planner"].calls == 0

    _advance(planner_env, sensor, timedelta(minutes=11))
    await forecast_update_module.async_update(sensor)

    assert planner_env.spies["_run_planner"].calls == 1, (
        "an absent proxy must not block planning forever"
    )
    assert sensor._mode_optimization_result["target_kwh"] == pytest.approx(
        TARGET_KWH_FOR_20_PCT_FALLBACK
    )

    warnings = [
        rec.getMessage()
        for rec in caplog.records
        if rec.name == PLANNER_LOGGER and rec.levelno >= logging.WARNING
    ]
    assert any(
        f"reason_class={forecast_update_module.BAT_MIN_ABSENT}" in msg
        for msg in warnings
    ), f"the sustained absence was not reported truthfully: {warnings}"


async def test_grace_window_comes_from_the_operator_option(hass, planner_env):
    """A shorter configured staleness window shortens the wait, and vice versa."""
    sensor = _PlannerSensor(hass, _local_only(local_proxy_stale_minutes=1))

    await forecast_update_module.async_update(sensor)
    assert planner_env.spies["_run_planner"].calls == 0

    _advance(planner_env, sensor, timedelta(minutes=2))
    await forecast_update_module.async_update(sensor)
    assert planner_env.spies["_run_planner"].calls == 1


# ---------------------------------------------------------------------------
# 4. Cloud-only never waits for a proxy it does not have
# ---------------------------------------------------------------------------


async def test_cloud_only_entry_plans_immediately_with_the_configured_fallback(
    hass, planner_env
):
    sensor = _PlannerSensor(
        hass, {"data_source_mode": "cloud_only", "box_id": BOX_ID}
    )
    assert hass.states.get(BAT_MIN_ENTITY_ID) is None

    await forecast_update_module.async_update(sensor)

    assert planner_env.spies["_run_planner"].calls == 1, (
        "a cloud-only install has no local proxy to wait for"
    )
    assert sensor._mode_optimization_result["target_kwh"] == pytest.approx(
        TARGET_KWH_FOR_20_PCT_FALLBACK
    )


# ---------------------------------------------------------------------------
# 5. The classifier itself, against a real state machine
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "raw_value,expected_value,expected_class",
    [
        (None, None, forecast_update_module.BAT_MIN_ABSENT),
        ("unavailable", None, forecast_update_module.BAT_MIN_UNAVAILABLE),
        ("unknown", None, forecast_update_module.BAT_MIN_UNAVAILABLE),
        ("abc", None, forecast_update_module.BAT_MIN_MALFORMED),
        ("0", None, forecast_update_module.BAT_MIN_IMPLAUSIBLE),
        ("100", None, forecast_update_module.BAT_MIN_IMPLAUSIBLE),
        ("15", 15.0, forecast_update_module.BAT_MIN_OK),
        ("20", 20.0, forecast_update_module.BAT_MIN_OK),
    ],
)
async def test_bat_min_classification_against_real_state_machine(
    hass, raw_value, expected_value, expected_class
):
    sensor = _PlannerSensor(hass, _local_only())
    if raw_value is not None:
        hass.states.async_set(BAT_MIN_ENTITY_ID, raw_value)
        await hass.async_block_till_done()

    value, reason_class = forecast_update_module._resolve_proxy_bat_min(sensor)
    assert (value, reason_class) == (expected_value, expected_class)
    # The legacy value-only accessor stays in agreement with the classifier.
    assert forecast_update_module._resolve_proxy_bat_min_pct(sensor) == expected_value
