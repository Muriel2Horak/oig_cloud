"""The planner waits for real consumption data after a restart.

Regression: the first run after startup found neither the adaptive profile nor
the load_avg sensors, so every interval fell back to a flat 500 W. That plan was
published to the dashboard and could steer the box until the data arrived,
8.5 minutes later on the slowest measured start.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as update_module,
)

NOW = datetime(2026, 11, 1, 8, 35, tzinfo=timezone.utc)
LOAD_AVG = {"sensor.load_avg_6_8_weekday": {"value": 700.0}}
PROFILES = {"today_profile": {"start_hour": 8, "hourly_consumption": [1.0]}}


class _Sensor:
    def __init__(self):
        self.retries = []
        self.logged = []
        self.load_avg = {}
        self.fetched_prices = 0
        self.hass = object()
        self._box_id = "123"
        self._hass = self.hass

    def _schedule_forecast_retry(self, delay):
        self.retries.append(delay)

    def _log_rate_limited(self, key, level, *_args, **_kwargs):
        self.logged.append((key, level))

    def _get_current_battery_capacity(self):
        return 5.0

    def _get_max_battery_capacity(self):
        return 15.0

    def _get_min_battery_capacity(self):
        return 3.0

    def _get_solar_forecast(self):
        return {}

    def _get_load_avg_sensors(self):
        return self.load_avg


@pytest.fixture
def clock(monkeypatch):
    state = SimpleNamespace(now=NOW)
    monkeypatch.setattr(update_module.dt_util, "now", lambda *_a, **_k: state.now)
    return state


def test_defers_while_no_consumption_data_exists(clock):
    sensor = _Sensor()

    assert update_module._should_defer_for_load_data(sensor, {}, None) is True
    assert sensor.retries == [update_module.LOAD_DATA_RETRY_SECONDS]


def test_load_avg_sensors_are_enough_to_plan(clock):
    sensor = _Sensor()

    assert update_module._should_defer_for_load_data(sensor, LOAD_AVG, None) is False
    assert sensor.retries == []


def test_adaptive_profile_is_enough_to_plan(clock):
    sensor = _Sensor()

    assert update_module._should_defer_for_load_data(sensor, {}, PROFILES) is False
    assert sensor.retries == []


def test_wait_is_bounded_and_reported(clock):
    """An install that never gets the data still needs a plan."""
    sensor = _Sensor()
    update_module._should_defer_for_load_data(sensor, {}, None)

    clock.now = NOW + timedelta(minutes=update_module.LOAD_DATA_GRACE_MINUTES)

    assert update_module._should_defer_for_load_data(sensor, {}, None) is False
    assert ("load_data_absent_after_grace", "warning") in sensor.logged


def test_wait_keeps_its_original_start(clock):
    sensor = _Sensor()
    update_module._should_defer_for_load_data(sensor, {}, None)

    clock.now = NOW + timedelta(minutes=update_module.LOAD_DATA_GRACE_MINUTES - 1)

    assert update_module._should_defer_for_load_data(sensor, {}, None) is True


def test_data_arriving_resets_the_wait(clock):
    """A later outage gets its own full window, not the leftovers of startup."""
    sensor = _Sensor()
    update_module._should_defer_for_load_data(sensor, {}, None)
    update_module._should_defer_for_load_data(sensor, LOAD_AVG, None)

    clock.now = NOW + timedelta(minutes=update_module.LOAD_DATA_GRACE_MINUTES + 5)

    assert update_module._should_defer_for_load_data(sensor, {}, None) is True


class _Helper:
    profiles = None

    def __init__(self, *_args, **_kwargs):
        pass

    async def get_adaptive_load_prediction(self):
        return _Helper.profiles


@pytest.fixture
def planner_inputs(monkeypatch, clock):
    calls = []

    async def _fetch_prices(*_args):
        calls.append("prices")
        return [], []

    async def _build_load_forecast(*_args):
        calls.append("forecast")
        return []

    monkeypatch.setattr(update_module, "AdaptiveConsumptionHelper", _Helper)
    monkeypatch.setattr(update_module, "_fetch_prices", _fetch_prices)
    monkeypatch.setattr(update_module, "_build_load_forecast", _build_load_forecast)
    monkeypatch.setattr(
        update_module, "_apply_boiler_grid_load_overlay", lambda *_a, **_k: None
    )
    _Helper.profiles = None
    return calls


@pytest.mark.asyncio
async def test_no_plan_inputs_without_consumption_data(planner_inputs):
    """Nothing downstream runs, so nothing flat can be published or steer the box."""
    sensor = _Sensor()

    prepared = await update_module._prepare_forecast_inputs(sensor, NOW)

    assert prepared is None
    assert planner_inputs == []


@pytest.mark.asyncio
async def test_plan_inputs_are_built_once_data_exists(planner_inputs):
    sensor = _Sensor()
    sensor.load_avg = LOAD_AVG

    prepared = await update_module._prepare_forecast_inputs(sensor, NOW)

    assert prepared is not None
    assert planner_inputs == ["prices", "forecast"]
