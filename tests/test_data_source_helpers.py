from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.core import data_source as module


class DummyState:
    def __init__(self, entity_id, state, last_updated=None, last_changed=None):
        self.entity_id = entity_id
        self.state = state
        self.last_updated = last_updated
        self.last_changed = last_changed or last_updated


class DummyStates:
    def __init__(self, states):
        self._states = states

    def async_all(self, domain):
        return [s for s in self._states if s.entity_id.startswith(f"{domain}.")]


class DummyHass:
    def __init__(self, states=None):
        self.data = {module.DOMAIN: {}}
        self.states = DummyStates(states or [])


def test_parse_dt_variants():
    ts = module._parse_dt("1700000000")
    assert ts is not None

    ts = module._parse_dt(1_700_000_000_000)
    assert ts is not None

    iso = module._parse_dt("2025-01-01T00:00:00")
    assert iso is not None

    assert module._parse_dt("unknown") is None


def test_coerce_box_id_variants():
    assert module._coerce_box_id("2206237016") == "2206237016"
    assert module._coerce_box_id(123456) == "123456"
    assert module._coerce_box_id("box 987654") == "987654"
    assert module._coerce_box_id("bad") is None


def test_get_configured_mode_mapping():
    entry = SimpleNamespace(options={"data_source_mode": module.DATA_SOURCE_HYBRID})
    assert module.get_configured_mode(entry) == module.DATA_SOURCE_LOCAL_ONLY


def test_get_proxy_stale_minutes_default():
    entry = SimpleNamespace(options={"local_proxy_stale_minutes": "bad"})
    assert module.get_proxy_stale_minutes(entry) == module.DEFAULT_PROXY_STALE_MINUTES


def test_get_local_event_debounce_ms_default():
    entry = SimpleNamespace(options={"local_event_debounce_ms": None})
    assert module.get_local_event_debounce_ms(entry) == module.DEFAULT_LOCAL_EVENT_DEBOUNCE_MS


def test_get_data_source_state_default():
    hass = DummyHass()
    state = module.get_data_source_state(hass, "missing")
    assert state.configured_mode == module.DEFAULT_DATA_SOURCE_MODE


def test_get_latest_local_entity_update():
    now = datetime(2025, 1, 1, tzinfo=timezone.utc)
    states = [
        DummyState("sensor.oig_local_2206237016_ac_out", "1", last_updated=now),
        DummyState("binary_sensor.oig_local_2206237016_tbl_invertor_prms_to_grid", "on", last_updated=now),
    ]
    hass = DummyHass(states)
    latest = module._get_latest_local_entity_update(hass, "2206237016")
    assert latest is not None
