"""Phase 0.5: the daily archive records what actually happened.

All seven archived days on box 2206237016 held ``actual: []`` - the "Včera"
view had nothing real to compare against. What was stored as the day's "plan"
was not the day plan either, but a snapshot of the *remaining* forward timeline
taken at whatever moment the archive happened to run: 10:33 gave 54 slots,
14:10 gave 40, 23:14 gave 4. All of them were marked ``locked: true``.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.battery_forecast.storage import (
    plan_archive as module,
)


class DummyStore:
    def __init__(self, data=None):
        self._data = data if data is not None else {}

    async def async_load(self):
        return self._data

    async def async_save(self, data):
        self._data = data


class DummySensor:
    def __init__(self, store_data=None):
        self._plans_store = DummyStore(store_data)
        self._hass = object()
        self._box_id = "2206237016"
        self._daily_plan_state = None
        self._daily_plans_archive = {}
        self._plans_store_lock = None

    def _log_rate_limited(self, *_args, **_kwargs):
        return None


def _baseline_intervals() -> list[dict]:
    return [
        {
            "time": f"{i // 4:02d}:{(i % 4) * 15:02d}",
            "consumption_kwh": round(0.05 + 0.01 * (i // 4), 4),
            "solar_kwh": 0.0,
        }
        for i in range(96)
    ]


def _store_with_baseline(date_str: str) -> dict:
    return {
        "detailed": {
            date_str: {
                "intervals": _baseline_intervals(),
                "created_at": f"{date_str}T00:00:45+02:00",
                "baseline": True,
            }
        },
        "daily_archive": {},
    }


def _forward_snapshot() -> list[dict]:
    """What the archive used to store: the rest of the day, seen from 09:00."""
    return [
        {"time": f"2026-09-06T{i // 4:02d}:{(i % 4) * 15:02d}:00"}
        for i in range(36, 96)
    ]


def _patch_history(monkeypatch, *, measured_slots: int = 96):
    """Stand in for the Recorder with a known number of measured slots."""

    async def fake_modes(_sensor, *, day_start, fetch_end, date_str, source):
        lookup = {}
        for i in range(measured_slots):
            stamp = day_start + timedelta(minutes=15 * i)
            lookup[stamp.strftime("%Y-%m-%dT%H:%M:%S")] = {
                "mode": 0,
                "mode_name": "HOME I",
            }
        return lookup

    async def fake_interval(_sensor, start_time, _end_time):
        return {
            "consumption_kwh": 0.4 + 0.01 * start_time.hour,
            "solar_kwh": 0.2,
            "battery_soc": 55.0,
            "grid_import": 0.1,
            "grid_export": 0.0,
            "net_cost": 0.5,
        }

    monkeypatch.setattr(
        module.history_module, "build_historical_modes_lookup", fake_modes
    )
    monkeypatch.setattr(
        module.history_module, "fetch_interval_from_history", fake_interval
    )


# --------------------------------------------------------------------------
# the plan side
# --------------------------------------------------------------------------


def test_archive_plan_is_the_midnight_baseline():
    plan = module.baseline_plan_for(_store_with_baseline("2026-09-06"), "2026-09-06")

    assert len(plan) == 96
    assert plan[0]["time"] == "00:00"


def test_missing_baseline_yields_no_plan_rather_than_a_partial_snapshot():
    assert module.baseline_plan_for({"detailed": {}}, "2026-09-06") == []


def test_a_degenerate_baseline_is_not_archived_as_the_days_plan():
    """Archiving a flat plan as the record of the day would bake the defect
    into the history the accuracy work reads back."""
    flat = {
        "detailed": {
            "2026-09-06": {
                "intervals": [
                    {"time": f"{i // 4:02d}:{(i % 4) * 15:02d}", "consumption_kwh": 0.148}
                    for i in range(96)
                ]
            }
        }
    }

    assert module.baseline_plan_for(flat, "2026-09-06") == []


# --------------------------------------------------------------------------
# the actual side
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_actual_series_carries_the_measured_day(monkeypatch):
    _patch_history(monkeypatch)
    sensor = DummySensor()

    actual = await module.build_day_actual_series(sensor, date(2026, 9, 6))

    assert len(actual) == 96
    assert actual[0]["time"] == "00:00"
    assert actual[40]["consumption_kwh"] == pytest.approx(0.5)
    assert actual[40]["mode_name"] == "HOME I"


@pytest.mark.asyncio
async def test_a_recorder_gap_leaves_the_slot_out_instead_of_writing_a_zero(
    monkeypatch,
):
    """A zero is a measurement claim. An unmeasured slot must not make it into
    the archive as 0 kWh, or every accuracy number computed from it is wrong."""
    _patch_history(monkeypatch, measured_slots=60)
    sensor = DummySensor()

    actual = await module.build_day_actual_series(sensor, date(2026, 9, 6))

    assert len(actual) == 60
    assert all(row.get("consumption_kwh") is not None for row in actual)


@pytest.mark.asyncio
async def test_no_recorder_means_an_empty_series_not_a_crash():
    sensor = DummySensor()
    sensor._hass = None

    assert await module.build_day_actual_series(sensor, date(2026, 9, 6)) == []


# --------------------------------------------------------------------------
# the archive entry
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_complete_day_is_archived_locked_with_both_sides(monkeypatch):
    _patch_history(monkeypatch)
    sensor = DummySensor(_store_with_baseline("2026-09-06"))

    entry = await module.build_archive_entry(
        sensor, "2026-09-06", fallback_plan=_forward_snapshot()
    )

    assert len(entry["plan"]) == 96
    assert len(entry["actual"]) == 96
    assert entry["plan"][0]["time"] == "00:00"
    assert entry["locked"] is True
    assert entry["date"] == "2026-09-06"


@pytest.mark.asyncio
async def test_an_incomplete_day_is_archived_unlocked(monkeypatch):
    """Locking a half-recorded day is what froze four slots from 23:00 as the
    permanent record of 5. 9."""
    _patch_history(monkeypatch, measured_slots=40)
    sensor = DummySensor(_store_with_baseline("2026-09-06"))

    entry = await module.build_archive_entry(
        sensor, "2026-09-06", fallback_plan=_forward_snapshot()
    )

    assert entry["locked"] is False


@pytest.mark.asyncio
async def test_without_a_baseline_the_in_memory_plan_is_kept_but_not_locked(
    monkeypatch,
):
    _patch_history(monkeypatch)
    sensor = DummySensor({"detailed": {}, "daily_archive": {}})

    entry = await module.build_archive_entry(
        sensor, "2026-09-06", fallback_plan=_forward_snapshot()
    )

    assert entry["plan"] == _forward_snapshot()
    assert entry["locked"] is False


# --------------------------------------------------------------------------
# wiring into the daily cycle
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_daily_cycle_archives_yesterday_with_real_content(monkeypatch):
    from custom_components.oig_cloud.battery_forecast.storage import (
        plan_storage_daily as daily_module,
    )

    _patch_history(monkeypatch)
    sensor = DummySensor(_store_with_baseline("2026-09-06"))
    sensor._daily_plan_state = {
        "date": "2026-09-06",
        "created_at": "2026-09-06T09:01:59+02:00",
        "plan": _forward_snapshot(),
        "actual": [],
        "locked": True,
    }

    await daily_module._archive_daily_plan(sensor, dt_util.as_local(datetime(2026, 9, 7, 0, 20)))

    archived = sensor._daily_plans_archive["2026-09-06"]
    assert len(archived["plan"]) == 96
    assert len(archived["actual"]) == 96
    assert archived["plan"][0]["time"] == "00:00"
