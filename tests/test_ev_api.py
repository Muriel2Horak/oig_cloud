"""REST endpoint feeding the dashboard's car tab."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.const import DOMAIN, KEY_EV_RUNTIME
from custom_components.oig_cloud.ev.api import OIGCloudEvView
from custom_components.oig_cloud.ev.planner import EvPlanInput, plan_ev_charging
from custom_components.oig_cloud.ev.profile import NextNeed
from custom_components.oig_cloud.ev.runtime import EvRuntime

T0 = datetime(2026, 11, 16, 20, 0, tzinfo=timezone.utc)


def _plan(prices, need_pct=40.0):
    n = len(prices)
    return plan_ev_charging(
        EvPlanInput(
            slot_starts=[T0 + timedelta(minutes=15 * i) for i in range(n)],
            import_prices=prices,
            export_prices=[0.0] * n,
            pv_surplus_kwh=[0.0] * n,
            grid_headroom_kw=[20.0] * n,
            soc_pct=20.0,
            capacity_kwh=25.0,
            charge_limit_pct=80.0,
            max_power_kw=11.0,
            min_power_kw=4.1,
            need=NextNeed(T0 + timedelta(minutes=15 * (n - 1)), need_pct, 1),
        )
    )


def test_detail_lists_every_slot_until_departure_with_price():
    plan = _plan([5.0, 1.0, 3.0, 2.0, 9.0])
    detail = plan.as_detail_dict()

    # Deadline is slot 4: slots 0-3 are shown, the departure slot is not.
    assert [s["price"] for s in detail["timeline"]] == [5.0, 1.0, 3.0, 2.0]
    assert sum(s["energy_kwh"] for s in detail["timeline"]) == pytest.approx(plan.planned_kwh)
    assert detail["status"] == "planned"


class _Entries:
    def __init__(self, entry):
        self._entry = entry

    def async_entries(self, domain):
        return [self._entry]


def _hass(runtime, *, soc="35", plugged="on"):
    entry = SimpleNamespace(entry_id="e", options={"enable_ev": True, "box_id": "123",
                                                   "ev_soc_entity": "sensor.car_soc",
                                                   "ev_plugged_entity": "binary_sensor.car_plugged"})
    states = {
        "sensor.car_soc": SimpleNamespace(state=soc, attributes={}),
        "binary_sensor.car_plugged": SimpleNamespace(state=plugged, attributes={}),
    }
    hass = SimpleNamespace(
        data={DOMAIN: {"e": {"coordinator": SimpleNamespace(data={"123": {}}), KEY_EV_RUNTIME: runtime}}},
        config_entries=_Entries(entry),
        states=SimpleNamespace(get=states.get),
    )
    return hass


class _Request:
    def __init__(self, hass):
        self.app = {"hass": hass, "hass_user": SimpleNamespace(is_admin=True)}
        self.query = {}


async def test_view_returns_the_car_state_plan_and_profile():
    hass = _hass(None)
    runtime = EvRuntime(hass, "e", hass.config_entries.async_entries(DOMAIN)[0].options)
    runtime.last_plan = _plan([5.0, 1.0, 3.0])
    hass.data[DOMAIN]["e"][KEY_EV_RUNTIME] = runtime

    response = await OIGCloudEvView().get(_Request(hass), "123")
    body = json.loads(response.body)

    assert body["enabled"] is True
    assert body["car"]["soc_pct"] == 35.0
    assert body["car"]["plugged_in"] is True
    assert body["plan"]["status"] == "planned"
    assert len(body["plan"]["timeline"]) == 2
    assert "profile" in body


async def test_view_without_the_car_enabled_says_so():
    hass = _hass(None)
    response = await OIGCloudEvView().get(_Request(hass), "123")
    body = json.loads(response.body)
    assert body == {"enabled": False}


async def test_unknown_box_is_404():
    hass = _hass(None)
    response = await OIGCloudEvView().get(_Request(hass), "999")
    assert response.status == 404


# ── write endpoints ────────────────────────────────────────────────────────

from custom_components.oig_cloud.ev.api import (  # noqa: E402
    OIGCloudEvChargeView,
    OIGCloudEvDayView,
    OIGCloudEvDiscoverView,
    OIGCloudEvVacationView,
)


class _Store:
    def __init__(self):
        self.saved = []

    async def async_load(self):
        return None

    async def async_save(self, data):
        self.saved.append(data)


class _JsonRequest(_Request):
    def __init__(self, hass, payload):
        super().__init__(hass)
        self._payload = payload

    async def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


def _with_runtime():
    hass = _hass(None)
    runtime = EvRuntime(hass, "e", hass.config_entries.async_entries(DOMAIN)[0].options)
    runtime._store = _Store()
    hass.data[DOMAIN]["e"][KEY_EV_RUNTIME] = runtime
    return hass, runtime


async def test_charge_now_and_back_to_plan():
    hass, runtime = _with_runtime()
    response = await OIGCloudEvChargeView().post(_JsonRequest(hass, {"mode": "now"}), "123")
    assert response.status == 200
    assert json.loads(response.body)["charge_override"]["mode"] == "now"
    response = await OIGCloudEvChargeView().post(_JsonRequest(hass, {"mode": "plan"}), "123")
    assert json.loads(response.body)["charge_override"] is None
    assert runtime.charge_override is None


async def test_charge_by_validates_the_time():
    hass, runtime = _with_runtime()
    bad = await OIGCloudEvChargeView().post(_JsonRequest(hass, {"mode": "by", "time": "25:99"}), "123")
    assert bad.status == 400
    ok = await OIGCloudEvChargeView().post(_JsonRequest(hass, {"mode": "by", "time": "05:00"}), "123")
    assert ok.status == 200
    assert runtime.charge_override.mode == "by"
    assert (await OIGCloudEvChargeView().post(_JsonRequest(hass, {"mode": "x"}), "123")).status == 400
    assert (await OIGCloudEvChargeView().post(_JsonRequest(hass, ValueError()), "123")).status == 400


async def test_day_endpoint_sets_and_validates():
    hass, runtime = _with_runtime()
    day = (datetime.now() + timedelta(days=2)).date().isoformat()
    response = await OIGCloudEvDayView().post(
        _JsonRequest(hass, {"date": day, "kind": "trip", "departure": "05:30", "precondition": True}), "123"
    )
    assert response.status == 200
    days = json.loads(response.body)["days"]
    assert any(d["date"] == day and d["source"] == "trip" for d in days)
    for payload in ({"date": "x"}, {"date": day, "kind": "boat"}, {"date": day, "departure": "noon"},
                    {"date": day, "precondition": "yes"}):
        assert (await OIGCloudEvDayView().post(_JsonRequest(hass, payload), "123")).status == 400


async def test_vacation_add_and_remove():
    hass, runtime = _with_runtime()
    start = (datetime.now() + timedelta(days=3)).date()
    end = start + timedelta(days=4)
    payload = {"start": start.isoformat(), "end": end.isoformat()}
    response = await OIGCloudEvVacationView().post(_JsonRequest(hass, payload), "123")
    assert json.loads(response.body)["vacations"] == [[start.isoformat(), end.isoformat()]]
    response = await OIGCloudEvVacationView().delete(_JsonRequest(hass, payload), "123")
    assert json.loads(response.body)["vacations"] == []
    reversed_range = {"start": end.isoformat(), "end": start.isoformat()}
    assert (await OIGCloudEvVacationView().post(_JsonRequest(hass, reversed_range), "123")).status == 400
    assert (await OIGCloudEvVacationView().post(_JsonRequest(hass, {"start": "x"}), "123")).status == 400


async def test_write_endpoints_need_the_car_enabled():
    hass = _hass(None)
    response = await OIGCloudEvChargeView().post(_JsonRequest(hass, {"mode": "now"}), "123")
    assert response.status == 409
    assert (await OIGCloudEvChargeView().post(_JsonRequest(hass, {"mode": "now"}), "999")).status == 404


async def test_view_lists_the_days_and_control(monkeypatch):
    hass, runtime = _with_runtime()
    body = json.loads((await OIGCloudEvView().get(_Request(hass), "123")).body)
    assert len(body["days"]) == 14
    assert body["control"] is None
    assert body["charge_override"] is None


async def test_discover_endpoint(monkeypatch):
    hass, _ = _with_runtime()
    from custom_components.oig_cloud.ev import discovery

    monkeypatch.setattr(discovery, "entities_from_hass", lambda h: [])
    body = json.loads((await OIGCloudEvDiscoverView().get(_Request(hass), "123")).body)
    assert body["control_mode"] == "none"
    assert body["current"]["ev_soc_entity"] == "sensor.car_soc"
    assert body["current"]["ev_switch_entity"] is None
    assert body["current_settings"]["ev_control_mode"] is None
    assert (await OIGCloudEvDiscoverView().get(_Request(hass), "999")).status == 404
