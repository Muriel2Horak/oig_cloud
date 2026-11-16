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
