"""Phase 0.4: the day plan gets revised during the day, without losing v0.

The stored baseline was written once at 00:00 and never touched again, so the
whole day's "planned vs actual" compared reality against a document the planner
itself had stopped believing. Revisions record what the live planner thinks at
06:00 / 12:00 / 18:00, while the midnight baseline stays untouched as the
honest yardstick.
"""

from __future__ import annotations

from datetime import datetime

import pytest

from custom_components.oig_cloud.battery_forecast.storage import (
    plan_revisions as module,
)


class DummyStore:
    def __init__(self, data=None):
        self._data = data if data is not None else {}
        self.saves = 0

    async def async_load(self):
        return self._data

    async def async_save(self, data):
        self._data = data
        self.saves += 1


class DummySensor:
    def __init__(self, store_data=None, timeline=None):
        self._plans_store = DummyStore(store_data)
        self._timeline_data = timeline or []
        self._plans_store_lock = None


def _baseline_intervals() -> list[dict]:
    return [
        {
            "time": f"{i // 4:02d}:{(i % 4) * 15:02d}",
            "consumption_kwh": round(0.05 + 0.01 * (i // 4), 4),
            "solar_kwh": 0.0,
        }
        for i in range(96)
    ]


def _live_timeline(day: str, from_slot: int, load: float) -> list[dict]:
    """What the live planner currently believes about the rest of the day."""
    return [
        {
            "time": f"{day}T{i // 4:02d}:{(i % 4) * 15:02d}:00",
            "load_kwh": load,
            "solar_kwh": 0.25,
        }
        for i in range(from_slot, 96)
    ]


def _store_with_baseline(date_str: str) -> dict:
    return {
        "detailed": {
            date_str: {
                "intervals": _baseline_intervals(),
                "created_at": f"{date_str}T00:00:45+02:00",
                "baseline": True,
            }
        }
    }


# --------------------------------------------------------------------------
# which moments count as a revision point
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "hour,expected",
    [(6, 1), (12, 2), (18, 3)],
)
def test_revision_hours_map_to_versions(hour, expected):
    assert module.revision_version_for(datetime(2026, 9, 7, hour, 3)) == expected


@pytest.mark.parametrize("hour", [0, 5, 7, 11, 13, 17, 19, 23])
def test_other_hours_are_not_revision_points(hour):
    assert module.revision_version_for(datetime(2026, 9, 7, hour, 3)) is None


# --------------------------------------------------------------------------
# the record itself stays small
# --------------------------------------------------------------------------


def test_revision_record_holds_the_day_grid_with_past_slots_left_open():
    now = datetime(2026, 9, 7, 12, 4)
    record = module.build_revision_record(
        2, now, _live_timeline("2026-09-07", from_slot=48, load=0.31)
    )

    assert record["version"] == 2
    assert record["created_at"] == now.isoformat()
    assert len(record["consumption_kwh"]) == 96
    assert record["consumption_kwh"][:48] == [None] * 48
    assert record["consumption_kwh"][48] == pytest.approx(0.31)
    assert record["solar_kwh"][95] == pytest.approx(0.25)


def test_revision_record_carries_series_not_whole_intervals():
    """Four full copies of a 96-slot plan per day would roughly quadruple a
    store that already sits above half a megabyte."""
    record = module.build_revision_record(
        1, datetime(2026, 9, 7, 6, 1), _live_timeline("2026-09-07", 24, 0.4)
    )

    assert set(record) == {"version", "created_at", "consumption_kwh", "solar_kwh"}


# --------------------------------------------------------------------------
# recording into the store
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_revision_is_appended_to_the_stored_day():
    date_str = "2026-09-07"
    sensor = DummySensor(
        _store_with_baseline(date_str), _live_timeline(date_str, 24, 0.4)
    )

    recorded = await module.maybe_record_plan_revision(
        sensor, datetime(2026, 9, 7, 6, 2)
    )

    assert recorded is True
    day = sensor._plans_store._data["detailed"][date_str]
    assert [r["version"] for r in day["revisions"]] == [1]


@pytest.mark.asyncio
async def test_the_midnight_baseline_is_never_overwritten():
    """v0 is the yardstick. A revision that edits it destroys the only honest
    answer to "how wrong were we this morning?"."""
    date_str = "2026-09-07"
    sensor = DummySensor(
        _store_with_baseline(date_str), _live_timeline(date_str, 24, 0.4)
    )
    before = [dict(i) for i in _baseline_intervals()]

    await module.maybe_record_plan_revision(sensor, datetime(2026, 9, 7, 6, 2))
    await module.maybe_record_plan_revision(sensor, datetime(2026, 9, 7, 12, 2))

    day = sensor._plans_store._data["detailed"][date_str]
    assert day["intervals"] == before
    assert day["created_at"] == f"{date_str}T00:00:45+02:00"


@pytest.mark.asyncio
async def test_a_day_of_operation_yields_three_revisions_with_distinct_times():
    date_str = "2026-09-07"
    sensor = DummySensor(
        _store_with_baseline(date_str), _live_timeline(date_str, 24, 0.4)
    )

    for hour in (6, 12, 18):
        await module.maybe_record_plan_revision(sensor, datetime(2026, 9, 7, hour, 5))

    day = sensor._plans_store._data["detailed"][date_str]
    assert [r["version"] for r in day["revisions"]] == [1, 2, 3]
    assert len({r["created_at"] for r in day["revisions"]}) == 3


@pytest.mark.asyncio
async def test_the_same_revision_window_records_only_once():
    date_str = "2026-09-07"
    sensor = DummySensor(
        _store_with_baseline(date_str), _live_timeline(date_str, 24, 0.4)
    )

    first = await module.maybe_record_plan_revision(sensor, datetime(2026, 9, 7, 6, 1))
    second = await module.maybe_record_plan_revision(sensor, datetime(2026, 9, 7, 6, 40))

    assert first is True
    assert second is False
    assert len(sensor._plans_store._data["detailed"][date_str]["revisions"]) == 1


@pytest.mark.asyncio
async def test_nothing_is_recorded_outside_a_revision_window():
    date_str = "2026-09-07"
    sensor = DummySensor(
        _store_with_baseline(date_str), _live_timeline(date_str, 24, 0.4)
    )

    recorded = await module.maybe_record_plan_revision(
        sensor, datetime(2026, 9, 7, 15, 30)
    )

    assert recorded is False
    assert sensor._plans_store.saves == 0


@pytest.mark.asyncio
async def test_no_baseline_for_the_day_means_no_revision():
    sensor = DummySensor({"detailed": {}}, _live_timeline("2026-09-07", 24, 0.4))

    recorded = await module.maybe_record_plan_revision(
        sensor, datetime(2026, 9, 7, 6, 2)
    )

    assert recorded is False


@pytest.mark.asyncio
async def test_an_empty_live_timeline_records_nothing():
    date_str = "2026-09-07"
    sensor = DummySensor(_store_with_baseline(date_str), [])

    recorded = await module.maybe_record_plan_revision(
        sensor, datetime(2026, 9, 7, 6, 2)
    )

    assert recorded is False
    assert sensor._plans_store.saves == 0


@pytest.mark.asyncio
async def test_a_store_failure_does_not_propagate():
    date_str = "2026-09-07"
    sensor = DummySensor(
        _store_with_baseline(date_str), _live_timeline(date_str, 24, 0.4)
    )

    async def _boom(_data):
        raise OSError("storage full")

    sensor._plans_store.async_save = _boom

    assert await module.maybe_record_plan_revision(
        sensor, datetime(2026, 9, 7, 6, 2)
    ) is False


# --------------------------------------------------------------------------
# wiring: the daily cycle must actually call this
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_daily_cycle_records_a_revision_even_when_the_plan_is_locked(monkeypatch):
    """During the day maybe_fix_daily_plan returns early on the locked plan, so
    a revision hook placed after that return would never fire."""
    from custom_components.oig_cloud.battery_forecast.storage import (
        plan_storage_daily as daily_module,
    )

    date_str = "2026-09-07"
    sensor = DummySensor(
        _store_with_baseline(date_str), _live_timeline(date_str, 48, 0.33)
    )
    sensor._daily_plan_state = {
        "date": date_str,
        "plan": [{"time": f"{date_str}T00:00:00"}],
        "actual": [],
        "locked": True,
    }
    sensor._daily_plans_archive = {}
    sensor._mode_optimization_result = None

    monkeypatch.setattr(
        daily_module.dt_util, "now", lambda: datetime(2026, 9, 7, 12, 5)
    )

    await daily_module.maybe_fix_daily_plan(sensor)

    day = sensor._plans_store._data["detailed"][date_str]
    assert [r["version"] for r in day.get("revisions", [])] == [2]
