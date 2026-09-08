"""Storage for the boiler day record: baseline frozen once, actual accumulated.

Exercises the real ``day_store`` module against a fake HA ``Store`` and a
minimal ``hass`` stand-in (``hass.data`` is all it needs).
"""

from __future__ import annotations

from datetime import date, datetime

import pytest
from freezegun import freeze_time

from custom_components.oig_cloud.boiler import day_record, day_store


class _FakeStore:
    """Mirrors homeassistant.helpers.storage.Store's async load/save shape."""

    def __init__(self, data=None):
        self._data = data
        self.save_count = 0

    async def async_load(self):
        return self._data

    async def async_save(self, data):
        self.save_count += 1
        # Store persists a real (deep-ish) snapshot, not the live in-memory dict.
        import copy

        self._data = copy.deepcopy(data)


def _hass():
    class _Hass:
        pass

    hass = _Hass()
    hass.data = {}
    return hass


def _plan_slots(day: str, *, start_slot: int = 0, count: int = 96, kwh: float = 0.5):
    return [
        {
            "start": f"{day}T{i // 4:02d}:{(i % 4) * 15:02d}:00+02:00",
            "heating_kwh": kwh,
            "recommended_source": "fve",
            "estimated_cost_czk": 0.0,
            "predicted_top_temp_c": 45.0,
        }
        for i in range(start_slot, start_slot + count)
    ]


def _install_fake_store(hass, entry_id, box_id, data=None):
    """Seed the module's state bucket directly with a fake store.

    Bypasses ``_state_entry``'s own Store construction (which needs a real
    ``hass.config``) — the point of these tests is the day_store logic, not
    Home Assistant's storage helper.
    """
    store = _FakeStore(data)
    bucket = hass.data.setdefault(day_store._STATE_KEY, {})
    bucket[(entry_id, box_id)] = {"store": store, "record": None, "last_save": None}
    return store


# --------------------------------------------------------------------------
# baseline: frozen once, never rewritten
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_baseline_frozen_once_and_not_rewritten():
    hass = _hass()
    with freeze_time("2026-09-08 08:00:00"):
        today = date(2026, 9, 8)
        first = await day_store.async_ensure_baseline(
            hass, "entry1", "box1", _plan_slots("2026-09-08", kwh=0.5), today
        )
        assert first is True

        record = await day_store.async_load(hass, "entry1", "box1")
        assert record["plan"][0]["heating_kwh"] == 0.5

        second = await day_store.async_ensure_baseline(
            hass, "entry1", "box1", _plan_slots("2026-09-08", kwh=9.9), today
        )
        assert second is False

        record_after = await day_store.async_load(hass, "entry1", "box1")
        assert record_after["plan"][0]["heating_kwh"] == 0.5  # untouched


@pytest.mark.asyncio
async def test_baseline_leaves_unreached_slots_none():
    hass = _hass()
    with freeze_time("2026-09-08 08:00:00"):
        today = date(2026, 9, 8)
        await day_store.async_ensure_baseline(
            hass,
            "entry1",
            "box1",
            _plan_slots("2026-09-08", start_slot=0, count=40, kwh=1.0),
            today,
        )
        record = await day_store.async_load(hass, "entry1", "box1")
        assert record["plan"][50]["heating_kwh"] is None


# --------------------------------------------------------------------------
# measurement -> slot, survives a reload
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_measurement_lands_in_right_slot():
    hass = _hass()
    with freeze_time("2026-09-08 10:07:00"):
        when = datetime(2026, 9, 8, 10, 7, 0)
        await day_store.async_record(
            hass,
            "entry1",
            "box1",
            when,
            heating_kwh=0.25,
            source="grid",
            top_temp_c=48.5,
        )
        record = await day_store.async_load(hass, "entry1", "box1")
        index = day_record.slot_index(when)
        slot = record["actual"][index]
        assert slot["heating_kwh"] == 0.25
        assert slot["source"] == "grid"
        assert slot["top_temp_c"] == 48.5


@pytest.mark.asyncio
async def test_measurement_survives_reload():
    hass = _hass()
    fake_store = _install_fake_store(hass, "entry1", "box1")

    with freeze_time("2026-09-08 10:07:00"):
        when = datetime(2026, 9, 8, 10, 7, 0)
        await day_store.async_record(
            hass,
            "entry1",
            "box1",
            when,
            heating_kwh=0.4,
            source="fve",
            top_temp_c=50.0,
        )

    assert fake_store.save_count >= 1  # first write of the day is never throttled

    # Simulate a restart: fresh hass, same backing store's persisted data.
    new_hass = _hass()
    day_store._state_entry(new_hass, "entry1", "box1")["store"] = fake_store
    with freeze_time("2026-09-08 10:08:00"):
        reloaded = await day_store.async_load(new_hass, "entry1", "box1")
    index = day_record.slot_index(when)
    assert reloaded["actual"][index]["heating_kwh"] == 0.4


@pytest.mark.asyncio
async def test_writes_are_debounced_to_once_per_minute():
    hass = _hass()
    fake_store = _install_fake_store(hass, "entry1", "box1")

    with freeze_time("2026-09-08 10:00:00"):
        await day_store.async_record(
            hass, "entry1", "box1", datetime(2026, 9, 8, 10, 0, 0),
            heating_kwh=0.1, source="grid", top_temp_c=40.0,
        )
    assert fake_store.save_count == 1

    with freeze_time("2026-09-08 10:00:30"):
        await day_store.async_record(
            hass, "entry1", "box1", datetime(2026, 9, 8, 10, 0, 30),
            heating_kwh=0.1, source="grid", top_temp_c=40.0,
        )
    assert fake_store.save_count == 1  # inside the 60s window — throttled

    with freeze_time("2026-09-08 10:01:05"):
        await day_store.async_record(
            hass, "entry1", "box1", datetime(2026, 9, 8, 10, 1, 5),
            heating_kwh=0.1, source="grid", top_temp_c=40.0,
        )
    assert fake_store.save_count == 2  # past the window — flushed


# --------------------------------------------------------------------------
# roll-over: archive, prune to 7, start fresh
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_roll_over_archives_finished_day_and_starts_fresh():
    hass = _hass()
    with freeze_time("2026-09-07 09:00:00"):
        today = date(2026, 9, 7)
        await day_store.async_ensure_baseline(
            hass, "entry1", "box1", _plan_slots("2026-09-07"), today
        )
        await day_store.async_record(
            hass, "entry1", "box1", datetime(2026, 9, 7, 9, 0, 0),
            heating_kwh=0.3, source="fve", top_temp_c=44.0,
        )

    with freeze_time("2026-09-08 00:00:05"):
        await day_store.async_roll_over(
            hass, "entry1", "box1", datetime(2026, 9, 8, 0, 0, 5)
        )
        record = await day_store.async_load(hass, "entry1", "box1")

    assert record["date"] == "2026-09-08"
    assert record["plan"] is None
    assert all(slot["heating_kwh"] is None for slot in record["actual"])
    assert "2026-09-07" in record["archive"]
    archived = record["archive"]["2026-09-07"]
    assert archived["plan"][0]["heating_kwh"] == 0.5
    assert archived["actual"][day_record.slot_index(datetime(2026, 9, 7, 9, 0, 0))][
        "heating_kwh"
    ] == 0.3


@pytest.mark.asyncio
async def test_roll_over_prunes_archive_to_seven_days():
    hass = _hass()
    day_n = 1
    for day_n in range(1, 9):  # 8 days of history, one roll-over each
        with freeze_time(f"2026-09-{day_n:02d} 12:00:00"):
            await day_store.async_record(
                hass,
                "entry1",
                "box1",
                datetime(2026, 9, day_n, 12, 0, 0),
                heating_kwh=0.1,
                source="grid",
                top_temp_c=40.0,
            )
        with freeze_time(f"2026-09-{day_n + 1:02d} 00:00:05"):
            await day_store.async_roll_over(
                hass, "entry1", "box1", datetime(2026, 9, day_n + 1, 0, 0, 5)
            )

    record = await day_store.async_load(hass, "entry1", "box1")
    assert len(record["archive"]) == 7
    assert "2026-09-01" not in record["archive"]  # oldest pruned
    assert "2026-09-08" in record["archive"]


@pytest.mark.asyncio
async def test_roll_over_is_a_noop_when_already_current():
    hass = _hass()
    with freeze_time("2026-09-08 12:00:00"):
        await day_store.async_record(
            hass, "entry1", "box1", datetime(2026, 9, 8, 12, 0, 0),
            heating_kwh=0.1, source="grid", top_temp_c=40.0,
        )
        await day_store.async_roll_over(
            hass, "entry1", "box1", datetime(2026, 9, 8, 12, 0, 6)
        )
        record = await day_store.async_load(hass, "entry1", "box1")

    assert record["date"] == "2026-09-08"
    assert record["archive"] == {}


@pytest.mark.asyncio
async def test_async_load_archives_stale_day_left_by_a_restart():
    hass = _hass()
    stale_actual = day_record.empty_actual()
    day_record.accumulate(
        stale_actual, datetime(2026, 9, 7, 9, 0, 0),
        heating_kwh=0.6, source="grid", top_temp_c=41.0,
    )
    stale_data = {
        "date": "2026-09-07",
        "plan": day_record.snapshot_plan(_plan_slots("2026-09-07"), date(2026, 9, 7)),
        "plan_created_at": "2026-09-07T08:00:00",
        "actual": stale_actual,
        "locked": False,
        "archive": {},
    }
    _install_fake_store(hass, "entry1", "box1", data=stale_data)

    with freeze_time("2026-09-08 06:00:00"):
        record = await day_store.async_load(hass, "entry1", "box1")

    assert record["date"] == "2026-09-08"
    assert record["plan"] is None
    assert "2026-09-07" in record["archive"]


# --------------------------------------------------------------------------
# locked
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_locked_only_when_both_plan_and_actual_carry_96_slots():
    hass = _hass()
    with freeze_time("2026-09-08 00:05:00"):
        today = date(2026, 9, 8)
        await day_store.async_ensure_baseline(
            hass,
            "entry1",
            "box1",
            _plan_slots("2026-09-08", start_slot=0, count=40),  # partial plan
            today,
        )
        record = await day_store.async_load(hass, "entry1", "box1")
        assert record["locked"] is False  # plan doesn't reach all 96 slots

    with freeze_time("2026-09-08 00:10:00"):
        # Fill the rest of the plan via a fresh baseline is not allowed (frozen);
        # simulate a fully-reached plan directly to isolate the locked check.
        record["plan"] = day_record.snapshot_plan(
            _plan_slots("2026-09-08", start_slot=0, count=96), today
        )
        for index in range(96):
            day_record.accumulate(
                record["actual"],
                datetime(2026, 9, 8, index // 4, (index % 4) * 15),
                heating_kwh=0.5,
                source="grid",
                top_temp_c=45.0,
            )
        day_store._recompute_locked(record)
        assert record["locked"] is True


# --------------------------------------------------------------------------
# a store exception never propagates
# --------------------------------------------------------------------------


class _BrokenStore:
    async def async_load(self):
        raise RuntimeError("disk is on fire")

    async def async_save(self, data):
        raise RuntimeError("disk is on fire")


@pytest.mark.asyncio
async def test_load_failure_does_not_propagate():
    hass = _hass()
    day_store._state_entry(hass, "entry1", "box1")["store"] = _BrokenStore()

    with freeze_time("2026-09-08 08:00:00"):
        record = await day_store.async_load(hass, "entry1", "box1")

    assert record["date"] == "2026-09-08"  # falls back to a fresh record


@pytest.mark.asyncio
async def test_save_failure_does_not_propagate_from_record():
    hass = _hass()
    day_store._state_entry(hass, "entry1", "box1")["store"] = _BrokenStore()

    with freeze_time("2026-09-08 08:00:00"):
        # Must not raise even though the underlying save blows up.
        await day_store.async_record(
            hass, "entry1", "box1", datetime(2026, 9, 8, 8, 0, 0),
            heating_kwh=0.2, source="grid", top_temp_c=42.0,
        )


@pytest.mark.asyncio
async def test_ensure_baseline_failure_does_not_propagate():
    hass = _hass()
    day_store._state_entry(hass, "entry1", "box1")["store"] = _BrokenStore()

    with freeze_time("2026-09-08 08:00:00"):
        # Must not raise even though the underlying save blows up — the
        # in-memory baseline is still frozen, only the disk write failed.
        result = await day_store.async_ensure_baseline(
            hass, "entry1", "box1", _plan_slots("2026-09-08"), date(2026, 9, 8)
        )
    assert result is True


@pytest.mark.asyncio
async def test_roll_over_failure_does_not_propagate():
    hass = _hass()
    day_store._state_entry(hass, "entry1", "box1")["store"] = _BrokenStore()

    with freeze_time("2026-09-08 08:00:00"):
        await day_store.async_roll_over(
            hass, "entry1", "box1", datetime(2026, 9, 8, 0, 0, 5)
        )
