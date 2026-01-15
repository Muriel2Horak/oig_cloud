from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.battery_forecast.timeline import extended as module


class DummyStore:
    def __init__(self, data=None, raise_error: bool = False):
        self._data = data or {}
        self._raise_error = raise_error

    async def async_load(self):
        if self._raise_error:
            raise RuntimeError("boom")
        return self._data


class DummySensor:
    def __init__(self):
        self._plans_store = None
        self._hass = None
        self._daily_plan_state = None
        self._timeline_data = []
        self._baseline_repair_attempts = set()
        self._mode_optimization_result = None

    def _is_baseline_plan_invalid(self, _plan):
        return False

    async def _save_plan_to_storage(self, *_a, **_k):
        return None

    async def _create_baseline_plan(self, *_a, **_k):
        return False

    def _get_current_mode(self):
        return 0

    def _get_current_battery_soc_percent(self):
        return 55.5

    def _get_current_battery_capacity(self):
        return 8.0


@pytest.mark.asyncio
async def test_build_timeline_extended_storage_error(monkeypatch):
    sensor = DummySensor()
    sensor._plans_store = DummyStore(raise_error=True)

    async def _fake_day(*_a, **_k):
        return {"intervals": []}

    monkeypatch.setattr(module, "build_day_timeline", _fake_day)
    data = await module.build_timeline_extended(sensor)
    assert "today_tile_summary" in data


@pytest.mark.asyncio
async def test_build_day_timeline_historical_archive_save_error(monkeypatch):
    sensor = DummySensor()
    sensor._plans_store = DummyStore()
    sensor._hass = SimpleNamespace()

    async def _save(*_a, **_k):
        raise RuntimeError("boom")

    sensor._save_plan_to_storage = _save

    monkeypatch.setattr(
        module.history_module,
        "build_historical_modes_lookup",
        lambda *_a, **_k: {"2025-01-01T00:00:00": {"mode": 1, "mode_name": "Home 1"}},
    )
    monkeypatch.setattr(
        module.history_module,
        "fetch_interval_from_history",
        lambda *_a, **_k: None,
    )

    storage_plans = {
        "daily_archive": {
            "2025-01-01": {"plan": [{"time": "bad"}]}
        }
    }
    day = dt_util.as_local(datetime(2025, 1, 1)).date()
    data = await module.build_day_timeline(sensor, day, storage_plans)
    assert data["date"] == "2025-01-01"


@pytest.mark.asyncio
async def test_build_day_timeline_historical_archive_save_success(monkeypatch):
    sensor = DummySensor()
    sensor._plans_store = DummyStore()
    sensor._hass = SimpleNamespace()
    saved = {}

    async def _save(*_a, **_k):
        saved["ok"] = True

    sensor._save_plan_to_storage = _save

    monkeypatch.setattr(
        module.history_module,
        "build_historical_modes_lookup",
        lambda *_a, **_k: {},
    )

    fixed_now = dt_util.as_local(datetime(2025, 1, 2, 0, 5, 0))
    monkeypatch.setattr(module.dt_util, "now", lambda: fixed_now)

    storage_plans = {
        "daily_archive": {
            "2025-01-01": {"plan": [{"time": "00:00"}]}
        }
    }
    day = dt_util.as_local(datetime(2025, 1, 1)).date()
    data = await module.build_day_timeline(sensor, day, storage_plans)
    assert data["date"] == "2025-01-01"
    assert saved["ok"] is True


@pytest.mark.asyncio
async def test_load_storage_plans_no_store():
    sensor = DummySensor()
    assert await module._load_storage_plans(sensor) == {}


@pytest.mark.asyncio
async def test_build_planned_intervals_map_skips_missing_time(monkeypatch):
    sensor = DummySensor()
    sensor._plans_store = DummyStore()
    day = dt_util.as_local(datetime(2025, 1, 1)).date()
    date_str = day.strftime(module.DATE_FMT)
    storage_plans = {"detailed": {date_str: {"intervals": [{"time": ""}]}}}

    monkeypatch.setattr(module.dt_util, "as_local", lambda dt: dt)

    planned = await module._build_planned_intervals_map(
        sensor, storage_plans, day, date_str
    )
    assert planned == {}


@pytest.mark.asyncio
async def test_build_planned_intervals_map_parse_exception(monkeypatch):
    sensor = DummySensor()
    sensor._plans_store = DummyStore()
    day = dt_util.as_local(datetime(2025, 1, 1)).date()
    date_str = day.strftime(module.DATE_FMT)
    storage_plans = {"detailed": {date_str: {"intervals": [{"time": "00:00"}]}}}

    def _boom(*_a, **_k):
        raise ValueError("bad")

    monkeypatch.setattr(module, "_parse_planned_time", _boom)

    planned = await module._build_planned_intervals_map(
        sensor, storage_plans, day, date_str
    )
    assert planned == {}


def test_parse_planned_time_empty_returns_none():
    day = dt_util.as_local(datetime(2025, 1, 1)).date()
    assert module._parse_planned_time("", day, "2025-01-01") is None


@pytest.mark.asyncio
async def test_maybe_repair_baseline_skips_when_attempted():
    sensor = DummySensor()
    date_str = "2025-01-01"
    sensor._baseline_repair_attempts.add(date_str)
    storage_plans = {"detailed": {date_str: {"intervals": []}}}

    result, repaired = await module._maybe_repair_baseline(sensor, storage_plans, date_str)
    assert result == storage_plans
    assert repaired is False


@pytest.mark.asyncio
async def test_refresh_storage_after_repair_returns_loaded():
    sensor = DummySensor()
    sensor._plans_store = DummyStore(
        data={"detailed": {"2025-01-01": {"intervals": [{"time": "00:00"}]}}}
    )

    result = await module._refresh_storage_after_repair(
        sensor, {}, "2025-01-01"
    )
    assert result["detailed"]["2025-01-01"]["intervals"]


def test_load_past_planned_from_daily_state_date_mismatch():
    sensor = DummySensor()
    sensor._daily_plan_state = {"date": "2025-01-02", "plan": []}
    day = dt_util.as_local(datetime(2025, 1, 1)).date()
    assert module._load_past_planned_from_daily_state(
        sensor, "2025-01-01", day
    ) == []


def test_build_planned_lookup_skips_missing_and_bad_times():
    current_interval = datetime(2025, 1, 1, 12, 0, 0)
    past = [{"time": ""}]
    future = [{"time": ""}, {"time": "bad"}]

    planned = module._build_planned_lookup(
        past, future, "2025-01-01", current_interval
    )
    assert planned == {}


@pytest.mark.asyncio
async def test_build_day_timeline_historical_archive_invalid(monkeypatch):
    sensor = DummySensor()
    sensor._hass = SimpleNamespace()
    sensor._is_baseline_plan_invalid = lambda *_a, **_k: True

    monkeypatch.setattr(
        module.history_module,
        "build_historical_modes_lookup",
        lambda *_a, **_k: {},
    )

    storage_plans = {
        "daily_archive": {
            "2025-01-01": {"plan": [{"time": "00:00"}]}
        }
    }
    day = dt_util.as_local(datetime(2025, 1, 1)).date()
    data = await module.build_day_timeline(sensor, day, storage_plans)
    assert data["intervals"]


@pytest.mark.asyncio
async def test_build_day_timeline_mixed_repair_and_parse_errors(monkeypatch):
    sensor = DummySensor()
    sensor._plans_store = DummyStore(raise_error=True)
    sensor._hass = SimpleNamespace()
    sensor._daily_plan_state = {
        "date": "2025-01-02",
        "plan": [],
        "actual": [{"time": "00:00"}, {"time": "bad"}],
    }
    sensor._timeline_data = [{"time": "bad"}, {"time": "2025-01-03T00:00:00"}]

    async def _create(*_a, **_k):
        raise RuntimeError("boom")

    sensor._create_baseline_plan = _create

    monkeypatch.setattr(
        module.history_module,
        "build_historical_modes_lookup",
        lambda *_a, **_k: {"2025-01-02T00:00:00": {"mode": 1, "mode_name": "Home 1"}},
    )
    monkeypatch.setattr(
        module.history_module,
        "fetch_interval_from_history",
        lambda *_a, **_k: None,
    )

    fixed_now = dt_util.as_local(datetime(2025, 1, 2, 0, 5, 0))
    monkeypatch.setattr(module.dt_util, "now", lambda: fixed_now)

    data = await module.build_day_timeline(sensor, fixed_now.date(), {})
    assert data["intervals"]


@pytest.mark.asyncio
async def test_build_day_timeline_mixed_invalid_storage_warning(monkeypatch):
    sensor = DummySensor()
    sensor._hass = SimpleNamespace()
    sensor._is_baseline_plan_invalid = lambda *_a, **_k: True

    monkeypatch.setattr(
        module.history_module,
        "build_historical_modes_lookup",
        lambda *_a, **_k: {},
    )

    fixed_now = dt_util.as_local(datetime(2025, 1, 2, 12, 5, 0))
    monkeypatch.setattr(module.dt_util, "now", lambda: fixed_now)

    storage_plans = {
        "detailed": {"2025-01-02": {"intervals": [{"time": "00:00"}]}}
    }
    data = await module.build_day_timeline(sensor, fixed_now.date(), storage_plans)
    assert data["intervals"]


@pytest.mark.asyncio
async def test_build_day_timeline_mixed_repair_success(monkeypatch):
    sensor = DummySensor()
    sensor._plans_store = DummyStore(
        data={"detailed": {"2025-01-02": {"intervals": [{"time": "00:00"}]}}}
    )
    sensor._hass = SimpleNamespace()

    async def _create(*_a, **_k):
        return True

    sensor._create_baseline_plan = _create
    sensor._is_baseline_plan_invalid = lambda *_a, **_k: False

    monkeypatch.setattr(
        module.history_module,
        "build_historical_modes_lookup",
        lambda *_a, **_k: {},
    )

    fixed_now = dt_util.as_local(datetime(2025, 1, 2, 12, 5, 0))
    monkeypatch.setattr(module.dt_util, "now", lambda: fixed_now)

    data = await module.build_day_timeline(sensor, fixed_now.date(), {})
    assert data["intervals"]


@pytest.mark.asyncio
async def test_build_day_timeline_mixed_future_skip_and_parse_error(monkeypatch):
    sensor = DummySensor()
    sensor._hass = SimpleNamespace()
    sensor._timeline_data = [
        {"time": "2025-01-02T10:00:00"},
        {"time": "2025-01-02T11:00:00Z"},
    ]

    monkeypatch.setattr(
        module.history_module,
        "build_historical_modes_lookup",
        lambda *_a, **_k: {},
    )

    fixed_now = dt_util.as_local(datetime(2025, 1, 2, 12, 5, 0))
    monkeypatch.setattr(module.dt_util, "now", lambda: fixed_now)

    data = await module.build_day_timeline(sensor, fixed_now.date(), {})
    assert data["intervals"]


@pytest.mark.asyncio
async def test_build_day_timeline_mixed_repair_reload_error(monkeypatch):
    sensor = DummySensor()
    sensor._plans_store = DummyStore(raise_error=True)
    sensor._hass = SimpleNamespace()

    async def _create(*_a, **_k):
        return True

    sensor._create_baseline_plan = _create

    monkeypatch.setattr(
        module.history_module,
        "build_historical_modes_lookup",
        lambda *_a, **_k: {},
    )

    fixed_now = dt_util.as_local(datetime(2025, 1, 2, 0, 5, 0))
    monkeypatch.setattr(module.dt_util, "now", lambda: fixed_now)

    data = await module.build_day_timeline(sensor, fixed_now.date(), {})
    assert isinstance(data["intervals"], list)


@pytest.mark.asyncio
async def test_build_day_timeline_planned_only(monkeypatch):
    sensor = DummySensor()
    day = dt_util.as_local(datetime(2025, 1, 3)).date()
    sensor._mode_optimization_result = {
        "optimal_timeline": [
            {"time": ""},
            {"time": "bad"},
            {"time": "2025-01-03T00:00:00", "mode": 1},
        ]
    }

    data = await module.build_day_timeline(sensor, day, {})
    assert data["intervals"]
