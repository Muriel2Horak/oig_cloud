"""Fix B: per-source daily energy accumulators survive an HA restart.

A mid-day restart/deploy must not zero the day's attribution (otherwise the
"patrona dnes" counter appears to start from the restart instead of midnight).
These tests exercise the real load/save methods bound to a minimal stub.
"""
from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.boiler.runtime import BoilerRuntime
from homeassistant.util import dt as dt_util


class _FakeStore:
    def __init__(self, data=None):
        self._data = data
        self.saved: list = []

    async def async_load(self):
        return self._data

    async def async_save(self, data):
        self.saved.append(data)


def _stub(store):
    stub = SimpleNamespace(
        _daily_source_loaded=False,
        _daily_source_store=store,
        _daily_source_kwh={"fve": 0.0, "grid": 0.0, "alternative": 0.0},
        _daily_source_cost_czk={"fve": 0.0, "grid": 0.0},
        _daily_source_date=None,
        _daily_source_reseeded=False,
        _daily_source_last_save_at=None,
    )
    stub._ensure_daily_source_store = lambda: store
    return stub


@pytest.mark.asyncio
async def test_load_restores_today():
    today = dt_util.now().date().isoformat()
    store = _FakeStore(
        {
            "date": today,
            "kwh": {"fve": 5.0, "grid": 2.0, "alternative": 0.0},
            "cost_czk": {"fve": 0.0, "grid": 6.0},
        }
    )
    stub = _stub(store)

    await BoilerRuntime.async_load_daily_source(stub)

    assert stub._daily_source_kwh == {"fve": 5.0, "grid": 2.0, "alternative": 0.0}
    assert stub._daily_source_cost_czk == {"fve": 0.0, "grid": 6.0}
    assert stub._daily_source_reseeded is True  # don't re-guess on top
    assert stub._daily_source_loaded is True


@pytest.mark.asyncio
async def test_load_ignores_stale_day():
    store = _FakeStore(
        {
            "date": "2020-01-01",
            "kwh": {"fve": 9.0, "grid": 9.0, "alternative": 0.0},
            "cost_czk": {"fve": 0.0, "grid": 9.0},
        }
    )
    stub = _stub(store)

    await BoilerRuntime.async_load_daily_source(stub)

    # Previous-day snapshot must not be restored — midnight reset still applies.
    assert stub._daily_source_kwh == {"fve": 0.0, "grid": 0.0, "alternative": 0.0}
    assert stub._daily_source_reseeded is False
    assert stub._daily_source_loaded is True


@pytest.mark.asyncio
async def test_load_handles_no_data():
    stub = _stub(_FakeStore(None))
    await BoilerRuntime.async_load_daily_source(stub)
    assert stub._daily_source_loaded is True
    assert stub._daily_source_kwh == {"fve": 0.0, "grid": 0.0, "alternative": 0.0}


def _seed_stub(loaded_from_store=False, current=None):
    return SimpleNamespace(
        _daily_source_loaded_from_store=loaded_from_store,
        _daily_source_kwh=current or {"fve": 0.0, "grid": 0.0, "alternative": 0.0},
        _daily_source_date=None,
        _daily_source_reseeded=False,
    )


def test_seed_from_state_applies_when_store_empty():
    stub = _seed_stub(loaded_from_store=False)
    BoilerRuntime.seed_daily_source_from_state(stub, "grid", 4.2)
    assert stub._daily_source_kwh["grid"] == 4.2
    assert stub._daily_source_reseeded is True


def test_seed_from_state_skipped_when_store_authoritative():
    stub = _seed_stub(loaded_from_store=True)
    BoilerRuntime.seed_daily_source_from_state(stub, "grid", 4.2)
    assert stub._daily_source_kwh["grid"] == 0.0  # Store wins


def test_seed_from_state_never_clobbers_fresher_value():
    stub = _seed_stub(current={"fve": 6.0, "grid": 0.0, "alternative": 0.0})
    BoilerRuntime.seed_daily_source_from_state(stub, "fve", 2.0)
    assert stub._daily_source_kwh["fve"] == 6.0  # kept the larger in-memory value


def test_seed_from_state_ignores_bad_input():
    stub = _seed_stub()
    BoilerRuntime.seed_daily_source_from_state(stub, "grid", float("nan"))
    BoilerRuntime.seed_daily_source_from_state(stub, "bogus", 5.0)
    BoilerRuntime.seed_daily_source_from_state(stub, "grid", -1.0)
    assert stub._daily_source_kwh["grid"] == 0.0


@pytest.mark.asyncio
async def test_save_persists_and_throttles():
    store = _FakeStore()

    class _Hass:
        def __init__(self):
            self.calls = 0

        def async_create_task(self, coro):
            self.calls += 1
            return asyncio.ensure_future(coro)

    stub = _stub(store)
    stub._daily_source_kwh = {"fve": 1.0, "grid": 2.0, "alternative": 0.0}
    stub._daily_source_cost_czk = {"fve": 0.0, "grid": 3.0}
    stub._daily_source_date = dt_util.now().date()
    stub.hass = _Hass()

    BoilerRuntime._schedule_daily_source_save(stub)
    BoilerRuntime._schedule_daily_source_save(stub)  # within 60s → throttled
    await asyncio.sleep(0)

    assert stub.hass.calls == 1
    assert store.saved and store.saved[0]["kwh"] == {
        "fve": 1.0,
        "grid": 2.0,
        "alternative": 0.0,
    }
    assert store.saved[0]["date"] == dt_util.now().date().isoformat()
