"""Tests for the boiler detail-tabs REST endpoint (GET .../detail_tabs?tab=...).

Covers auth/shape, 404 of unknown entry/box, tab=tomorrow with null actuals,
first-day yesterday {"available": false}, and the CONTRACT null fields that are
pending the M2 plan/actuals persistence unit (adherence/progress/eod).
"""

from __future__ import annotations

import json
from datetime import timedelta
from types import SimpleNamespace

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.api import ha_rest_api as api_module
from custom_components.oig_cloud.boiler.models import EnergySource
from custom_components.oig_cloud.const import (
    CONF_BOILER_COLD_INLET_TEMP_C,
    CONF_BOILER_TARGET_TEMP_C,
    CONF_BOILER_VOLUME_L,
    DOMAIN,
    KEY_BOILER_RUNTIMES,
)

_ENTRY_ID = "entry_dt"
_BOX_ID = "box_dt"

_BLOCK_SOURCES = {"fve", "grid", "battery", "alt", "idle"}
_BLOCK_STATUSES = {"historical", "current", "planned"}
_METRIC_KEYS = {"cost_czk", "grid_kwh", "fve_kwh", "ready_liters_min"}


class _Entry:
    entry_id = _ENTRY_ID
    domain = DOMAIN
    options: dict = {}


class _ConfigEntries:
    def __init__(self, entries):
        self._entries = entries

    def async_get_entry(self, entry_id):
        for entry in self._entries:
            if entry.entry_id == entry_id:
                return entry
        return None


class _Hass:
    def __init__(self):
        self.data: dict = {}
        self.config_entries = _ConfigEntries([_Entry()])
        # No `states` attribute -> temperature reads degrade to None (soc null),
        # keeping the tests deterministic without wiring live sensors.


class _Request:
    """Real-HA shape: query params on request.query, hass on request.app."""

    def __init__(self, hass, tab=None):
        self.app = {"hass": hass}
        query = {}
        if tab is not None:
            query["tab"] = tab
        self.query = query

    def get(self, key, default=None):
        if key == "hass_user":
            return None
        return default


def _slot(start, end, source, heating, cost, grid=0.0, pv=0.0, predicted=50.0):
    return SimpleNamespace(
        start=start,
        end=end,
        recommended_source=source,
        heating_kwh=heating,
        estimated_cost_czk=cost,
        grid_kwh=grid,
        pv_kwh=pv,
        predicted_top_temp_c=predicted,
        spot_price_kwh=3.0,
        alt_price_kwh=2.0,
    )


def _day_slots(day_date):
    """Two 15-min heating slots (grid then fve) at 01:00-01:30 on `day_date`."""
    base = dt_util.now().replace(
        year=day_date.year,
        month=day_date.month,
        day=day_date.day,
        hour=1,
        minute=0,
        second=0,
        microsecond=0,
    )
    q = timedelta(minutes=15)
    return [
        _slot(base, base + q, EnergySource.GRID, 0.5, 1.5, grid=0.5, predicted=45.0),
        _slot(base + q, base + 2 * q, EnergySource.FVE, 0.4, 0.0, pv=0.4, predicted=55.0),
    ]


def _hass_with_plan(slots, daily=None):
    hass = _Hass()
    plan = SimpleNamespace(slots=slots) if slots is not None else None
    runtime = SimpleNamespace(
        coordinator=SimpleNamespace(
            config={
                CONF_BOILER_VOLUME_L: 200.0,
                CONF_BOILER_TARGET_TEMP_C: 60.0,
                CONF_BOILER_COLD_INLET_TEMP_C: 10.0,
            }
        ),
        get_current_plan=lambda: plan,
        get_daily_source_kwh=lambda: (daily if daily is not None else {"fve": 2.8, "grid": 4.1}),
    )
    hass.data[DOMAIN] = {_ENTRY_ID: {KEY_BOILER_RUNTIMES: {_BOX_ID: runtime}}}
    return hass


def _view():
    return api_module.OIGCloudBoilerDetailTabsView()


def test_detail_tabs_requires_auth_no_admin_gate():
    # Authenticated (HA handles it) but read-only: no per-call admin gate exists.
    view = _view()
    assert view.requires_auth is True
    assert not hasattr(view, "_admin_or_none")


@pytest.mark.asyncio
async def test_detail_tabs_today_shape():
    hass = _hass_with_plan(_day_slots(dt_util.now().date()))
    response = await _view().get(_Request(hass, "today"), _ENTRY_ID, _BOX_ID)
    payload = json.loads(response.text)

    assert response.status == 200, payload
    assert payload["tab"] == "today"
    assert payload["available"] is True

    # capacity_kwh = volume_l * (target - cold) * 0.001163 = 200 * 50 * 0.001163
    assert payload["capacity_kwh"] == pytest.approx(11.63)

    # metrics: exactly the 4 CONTRACT keys; today populates grid/fve actuals.
    assert {m["key"] for m in payload["metrics"]} == _METRIC_KEYS
    by_key = {m["key"]: m for m in payload["metrics"]}
    assert by_key["grid_kwh"]["actual"] == pytest.approx(4.1)
    assert by_key["fve_kwh"]["actual"] == pytest.approx(2.8)
    assert by_key["cost_czk"]["actual"] is None  # pending M2 actual cost

    # blocks cover the two slots, valid source classes and statuses.
    assert payload["blocks"], payload
    for block in payload["blocks"]:
        assert set(block) == {
            "start", "end", "source", "planned_kwh",
            "actual_kwh", "cost_czk", "status", "mismatch",
        }
        assert block["source"] in _BLOCK_SOURCES
        assert block["status"] in _BLOCK_STATUSES
        assert block["mismatch"] is False
        assert block["actual_kwh"] is None  # per-slot actuals pending M2

    # savings computed from slot spot/alt prices (real plan data).
    assert isinstance(payload["savings"]["vs_grid_czk"], float)
    assert isinstance(payload["savings"]["vs_alt_czk"], float)

    # CONTRACT fields pending M2/forecast -> explicit null.
    assert payload["adherence_pct"] is None
    assert payload["progress"] is None
    assert payload["eod_prediction"] is None

    # soc reported (null here: no temperature sensors wired in the test hass).
    assert set(payload["soc"]) == {"now_kwh", "now_liters", "now_pct"}


@pytest.mark.asyncio
async def test_detail_tabs_tomorrow_null_actuals():
    tomorrow = dt_util.now().date() + timedelta(days=1)
    hass = _hass_with_plan(_day_slots(tomorrow))
    response = await _view().get(_Request(hass, "tomorrow"), _ENTRY_ID, _BOX_ID)
    payload = json.loads(response.text)

    assert response.status == 200, payload
    assert payload["tab"] == "tomorrow"
    assert payload["available"] is True

    # No live actuals for a future tab.
    for metric in payload["metrics"]:
        assert metric["actual"] is None, metric
    for block in payload["blocks"]:
        assert block["actual_kwh"] is None
    assert payload["adherence_pct"] is None
    assert payload["progress"] is None


@pytest.mark.asyncio
async def test_detail_tabs_yesterday_first_day_unavailable():
    # Plan only covers today -> yesterday has no persisted history in v1.
    hass = _hass_with_plan(_day_slots(dt_util.now().date()))
    response = await _view().get(_Request(hass, "yesterday"), _ENTRY_ID, _BOX_ID)
    payload = json.loads(response.text)

    assert response.status == 200, payload
    assert payload == {"tab": "yesterday", "available": False}


@pytest.mark.asyncio
async def test_detail_tabs_no_plan_unavailable():
    hass = _hass_with_plan(None)
    response = await _view().get(_Request(hass, "today"), _ENTRY_ID, _BOX_ID)
    payload = json.loads(response.text)

    assert response.status == 200, payload
    assert payload == {"tab": "today", "available": False}


@pytest.mark.asyncio
async def test_detail_tabs_unknown_box_returns_404():
    hass = _hass_with_plan(_day_slots(dt_util.now().date()))
    response = await _view().get(_Request(hass, "today"), _ENTRY_ID, "unknown_box")
    assert response.status == 404


@pytest.mark.asyncio
async def test_detail_tabs_unknown_entry_returns_404():
    hass = _hass_with_plan(_day_slots(dt_util.now().date()))
    response = await _view().get(_Request(hass, "today"), "unknown_entry", _BOX_ID)
    assert response.status == 404


@pytest.mark.asyncio
async def test_detail_tabs_invalid_tab_returns_400():
    hass = _hass_with_plan(_day_slots(dt_util.now().date()))
    response = await _view().get(_Request(hass, "later"), _ENTRY_ID, _BOX_ID)
    assert response.status == 400


@pytest.mark.asyncio
async def test_detail_tabs_defaults_to_today_when_tab_absent():
    hass = _hass_with_plan(_day_slots(dt_util.now().date()))
    response = await _view().get(_Request(hass, None), _ENTRY_ID, _BOX_ID)
    payload = json.loads(response.text)
    assert response.status == 200, payload
    assert payload["tab"] == "today"
