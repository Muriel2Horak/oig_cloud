"""Historical solar correction, learned from the day archive.

The factor multiplies the raw forecast before the same-day drift correction. It
is learned from finished days, so it can only be as good as the archive feeding
it: an unfinished day must not teach it anything.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from custom_components.oig_cloud.battery_forecast import forecast_accuracy as accuracy
from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as update_module,
)
from custom_components.oig_cloud.battery_forecast.storage import (
    plan_storage_daily as daily_module,
)

NOW = datetime(2026, 10, 31, 12, 0, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def _frozen_now(monkeypatch):
    monkeypatch.setattr(accuracy.dt_util, "now", lambda: NOW)


def _history(*ratios):
    return {
        "forecast_accuracy": {
            (NOW.date() - timedelta(days=index + 1)).isoformat(): {
                "forecast_kwh": 10.0,
                "actual_kwh": 10.0 * ratio,
                "ratio": ratio,
            }
            for index, ratio in enumerate(ratios)
        }
    }


def test_factor_defaults_without_history():
    assert accuracy.compute_correction_factor({}) == accuracy.DEFAULT_CORRECTION_FACTOR


def test_factor_defaults_until_enough_days_are_known():
    short = _history(*[0.9] * (accuracy.MIN_DAYS_FOR_CORRECTION - 1))

    assert (
        accuracy.compute_correction_factor(short) == accuracy.DEFAULT_CORRECTION_FACTOR
    )


def test_factor_is_the_median_ratio():
    """One absurd day must not move the factor."""
    assert accuracy.compute_correction_factor(
        _history(0.6, 0.7, 0.8, 0.8, 0.8, 0.9, 40.0)
    ) == pytest.approx(0.8)


def test_factor_is_clamped():
    assert (
        accuracy.compute_correction_factor(_history(*[9.0] * 7))
        == accuracy.MAX_CORRECTION_FACTOR
    )
    assert (
        accuracy.compute_correction_factor(_history(*[0.01] * 7))
        == accuracy.MIN_CORRECTION_FACTOR
    )


def test_factor_ignores_days_outside_the_lookback():
    old = NOW.date() - timedelta(days=accuracy.LOOKBACK_DAYS + 1)
    data = _history(*[0.9] * 7)
    data["forecast_accuracy"][old.isoformat()] = {"ratio": 0.1}

    assert accuracy.compute_correction_factor(data) == pytest.approx(0.9)


def test_record_stores_ratio_and_prunes_old_days():
    stale = (NOW.date() - timedelta(days=accuracy.RETENTION_DAYS + 1)).isoformat()
    data = {"forecast_accuracy": {stale: {"ratio": 0.5}}}

    accuracy.record_forecast_accuracy(data, "2026-10-30", 20.0, 15.0)

    assert data["forecast_accuracy"]["2026-10-30"]["ratio"] == 0.75
    assert stale not in data["forecast_accuracy"]


def test_apply_correction_scales_every_interval():
    assert accuracy.apply_correction_to_forecast([1.0, 2.0], 0.5) == [0.5, 1.0]


class _Store:
    def __init__(self, loaded=None):
        self.loaded = loaded if loaded is not None else {}
        self.saved = None

    async def async_load(self):
        return self.loaded

    async def async_save(self, data):
        self.saved = data


class _ForecastSensor:
    def __init__(self, store):
        self._plans_store = store
        self.logged = []

    def _log_rate_limited(self, *args, **kwargs):
        self.logged.append(args)


@pytest.mark.asyncio
async def test_adaptive_correction_scales_the_solar_list_in_place():
    sensor = _ForecastSensor(_Store({}))
    solar = [1.0, 2.0]

    await update_module._maybe_apply_adaptive_correction(sensor, solar)

    factor = accuracy.DEFAULT_CORRECTION_FACTOR
    assert solar == [pytest.approx(1.0 * factor), pytest.approx(2.0 * factor)]


@pytest.mark.asyncio
async def test_adaptive_correction_uses_the_learned_factor():
    sensor = _ForecastSensor(_Store(_history(*[0.9] * 7)))
    solar = [1.0]

    await update_module._maybe_apply_adaptive_correction(sensor, solar)

    assert solar == [pytest.approx(0.9)]


@pytest.mark.asyncio
async def test_adaptive_correction_without_a_store_leaves_the_list_alone():
    sensor = _ForecastSensor(None)
    solar = [1.0]

    await update_module._maybe_apply_adaptive_correction(sensor, solar)

    assert solar == [1.0]


class _DriftHelper:
    def __init__(self):
        self.ratios = []

    def apply_solar_correction_to_forecast(self, _solar, ratio):
        self.ratios.append(ratio)


@pytest.mark.asyncio
async def test_same_day_correction_does_not_count_the_historical_bias_twice(
    monkeypatch,
):
    """Drift is measured against the raw forecast. Once the list is scaled, a day
    running exactly at the historical bias has nothing left to correct."""

    async def _ratio(*_args, **_kwargs):
        return 0.75

    monkeypatch.setattr(update_module, "_get_recent_solar_ratio", _ratio)
    helper = _DriftHelper()

    await update_module._maybe_apply_solar_correction(
        _ForecastSensor(None), helper, {}, [1.0], applied_factor=0.75
    )

    assert helper.ratios == []


@pytest.mark.asyncio
async def test_same_day_correction_applies_only_the_remaining_error(monkeypatch):
    async def _ratio(*_args, **_kwargs):
        return 0.375

    monkeypatch.setattr(update_module, "_get_recent_solar_ratio", _ratio)
    helper = _DriftHelper()

    await update_module._maybe_apply_solar_correction(
        _ForecastSensor(None), helper, {}, [1.0], applied_factor=0.75
    )

    assert helper.ratios == [pytest.approx(0.5)]


@pytest.mark.asyncio
async def test_same_day_correction_without_a_factor_is_unchanged(monkeypatch):
    async def _ratio(*_args, **_kwargs):
        return 0.75

    monkeypatch.setattr(update_module, "_get_recent_solar_ratio", _ratio)
    helper = _DriftHelper()

    await update_module._maybe_apply_solar_correction(
        _ForecastSensor(None), helper, {}, [1.0]
    )

    assert helper.ratios == [pytest.approx(0.75)]


class _DailySensor:
    def __init__(self):
        self._daily_plan_state = {"date": "2026-10-30", "plan": [], "actual": []}
        self._daily_plans_archive = {}
        self._plans_store = _Store({})


def _archive_entry(*, locked):
    return {
        "date": "2026-10-30",
        "plan": [
            {"time": "00:00", "solar_kwh": 2.0},
            {"time": "00:15", "solar_kwh": 2.0},
        ],
        "actual": [
            {"time": "00:00", "solar_kwh": 1.5},
            {"time": "00:15", "solar_kwh": 1.5},
        ],
        "locked": locked,
    }


@pytest.mark.asyncio
async def test_finished_day_teaches_the_correction(monkeypatch):
    sensor = _DailySensor()

    async def _entry(*_args, **_kwargs):
        return _archive_entry(locked=True)

    monkeypatch.setattr(daily_module, "build_archive_entry", _entry)

    await daily_module._archive_daily_plan(sensor, NOW)

    learned = sensor._plans_store.saved["forecast_accuracy"]["2026-10-30"]
    assert learned["forecast_kwh"] == 4.0
    assert learned["actual_kwh"] == 3.0
    assert learned["ratio"] == 0.75


@pytest.mark.asyncio
async def test_unfinished_day_teaches_nothing(monkeypatch):
    """A half-recorded day compares a whole forecast with part of the production."""
    sensor = _DailySensor()

    async def _entry(*_args, **_kwargs):
        return _archive_entry(locked=False)

    monkeypatch.setattr(daily_module, "build_archive_entry", _entry)

    await daily_module._archive_daily_plan(sensor, NOW)

    assert "forecast_accuracy" not in sensor._plans_store.saved


@pytest.mark.asyncio
async def test_day_without_production_teaches_nothing(monkeypatch):
    """Snow on the panels is not a forecast error worth a factor of zero."""
    sensor = _DailySensor()
    entry = _archive_entry(locked=True)
    entry["actual"] = [{"time": "00:00", "solar_kwh": 0.0}]

    async def _entry(*_args, **_kwargs):
        return entry

    monkeypatch.setattr(daily_module, "build_archive_entry", _entry)

    await daily_module._archive_daily_plan(sensor, NOW)

    assert "forecast_accuracy" not in sensor._plans_store.saved


@pytest.mark.asyncio
async def test_learning_failure_does_not_lose_the_archive(monkeypatch):
    sensor = _DailySensor()

    async def _entry(*_args, **_kwargs):
        return _archive_entry(locked=True)

    def _boom(*_args, **_kwargs):
        raise ValueError("bad data")

    monkeypatch.setattr(daily_module, "build_archive_entry", _entry)
    monkeypatch.setattr(daily_module, "record_forecast_accuracy", _boom)

    await daily_module._archive_daily_plan(sensor, NOW)

    assert "2026-10-30" in sensor._plans_store.saved["daily_archive"]
