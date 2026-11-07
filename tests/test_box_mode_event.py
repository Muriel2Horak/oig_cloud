"""The box mode follows the box's own mode event, not only its rare parameter table.

Regression (2026-11-07, box 2206237016): the box applied Home UPS at 15:36:16
and logged "HG IV-UPS  Start", but the proxy published the mode only at
15:51:37, when the box finally sent tbl_box_prms. For 15 minutes HA, the shield
and the planner believed the box was in Home 1.
"""

from __future__ import annotations

from datetime import timedelta
from types import SimpleNamespace

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.core import data_source as module
from custom_components.oig_cloud.core.local_mapper import (
    PROXY_EVENTS_ENTITY_ID,
    box_mode_from_event,
)
from custom_components.oig_cloud.core.telemetry_store import TelemetryStore

# Texts exactly as the box logged them on 2026-11-07.
REAL = {
    "HG IV-UPS  Start (Load:559W, LoadNB:175W, PV:0W, BC:99%, BV:53.570V, BA:-14.200A, DAC:100%, GMin:20%)": 3,
    "HG IV-UPS  (Load:955W, LoadNB:315W, PV:73W, BC:100%, BV:56.470V, BA:0.000A, DAC:100%, GMin:20%)": 3,
    "HG I Start (Load:586W, LoadNB:197W, PV:0W, BC:100%, BV:56.480V, BA:0.000A, DAC:100%, GMin:20%)": 0,
    "HG I (Load:1092W, LoadNB:124W, PV:83W, BC:99%, BV:54.600V, BA:-23.200A, DAC:100%, GMin:20%)": 0,
    "HG II Start (Load:500W)": 1,
    "HG III Start (Load:500W)": 2,
}
NOT_MODES = [
    "FMT on [3-No Limit] Start (Load:559W, LoadNB:175W, PV:0W, BC:99%)",
    "FMT off [0-Standard (OFF)] End (Load:1050W)",
    "Remotely : tbl_box_prms / MODE: [0]->[0]",
    "Invertor ACK : ^S006SEP01",
    "SetAsReq Start",
    "HGX I",
    "",
    None,
]


@pytest.mark.parametrize("text,mode", REAL.items())
def test_mode_events_from_the_box_map_to_cloud_modes(text, mode):
    assert box_mode_from_event(text) == mode


@pytest.mark.parametrize("text", NOT_MODES)
def test_other_events_are_not_modes(text):
    assert box_mode_from_event(text) is None


class _States:
    def get(self, _entity_id):
        return None


def test_store_takes_the_mode_once():
    store = TelemetryStore(SimpleNamespace(states=_States()), box_id="2206237016")
    store._payload = {"2206237016": {"box_prms": {"mode": 0}}}
    assert store.apply_box_mode_event(next(iter(REAL))) == 3
    assert store.get_snapshot().payload["2206237016"]["box_prms"]["mode"] == 3
    assert store.apply_box_mode_event("HG IV-UPS  (Load:955W)") is None, "unchanged"
    assert store.apply_box_mode_event("SetAsReq Start") is None
    assert store.get_snapshot().payload["2206237016"]["box_prms"]["mode"] == 3


def _controller(effective_mode):
    now = dt_util.utcnow()
    store = TelemetryStore(SimpleNamespace(states=_States()), box_id="2206237016")
    store._payload = {"2206237016": {"box_prms": {"mode": 0}}}
    entry = SimpleNamespace(
        entry_id="e1", options={"box_id": "2206237016", "data_source_mode": module.DATA_SOURCE_LOCAL_ONLY},
        data={},
    )
    hass = SimpleNamespace(data={module.DOMAIN: {"e1": {"data_source_state": module.DataSourceState(
        configured_mode=module.DATA_SOURCE_LOCAL_ONLY, effective_mode=effective_mode,
        local_available=True, last_local_data=now, reason="local_ok")}}})
    controller = module.DataSourceController.__new__(module.DataSourceController)
    controller.hass = hass
    controller.entry = entry
    controller.telemetry_store = store
    controller._pending_local_entities = set()
    published: list[bool] = []
    controller._schedule_snapshot_publish = lambda: published.append(True)
    controller._schedule_debounced_poke = lambda: None
    return controller, store, published, now


def _event(text, now):
    return SimpleNamespace(
        data={"entity_id": PROXY_EVENTS_ENTITY_ID, "new_state": SimpleNamespace(state=text)},
        time_fired=now + timedelta(seconds=1),
    )


def test_box_mode_event_updates_the_mode_and_publishes_at_once():
    controller, store, published, now = _controller(module.DATA_SOURCE_LOCAL_ONLY)
    controller._on_any_state_change(_event(next(iter(REAL)), now))
    assert store.get_snapshot().payload["2206237016"]["box_prms"]["mode"] == 3
    assert published == [True]
    assert PROXY_EVENTS_ENTITY_ID not in controller._pending_local_entities


def test_other_box_events_change_nothing():
    controller, store, published, now = _controller(module.DATA_SOURCE_LOCAL_ONLY)
    controller._on_any_state_change(_event("Invertor ACK : ^S006SEP01", now))
    assert store.get_snapshot().payload["2206237016"]["box_prms"]["mode"] == 0
    assert published == []


def test_box_events_are_ignored_in_cloud_fallback():
    controller, store, published, now = _controller(module.DATA_SOURCE_CLOUD_ONLY)
    controller._on_any_state_change(_event(next(iter(REAL)), now))
    assert store.get_snapshot().payload["2206237016"]["box_prms"]["mode"] == 0
    assert published == []
