from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace

from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.core import data_source as module


class DummyState:
    def __init__(self, entity_id, state, last_updated=None, last_changed=None):
        self.entity_id = entity_id
        self.state = state
        self.last_updated = last_updated
        self.last_changed = last_changed or last_updated
        self.attributes = {}


class DummyStates:
    def __init__(self, states):
        self._states = {s.entity_id: s for s in states}

    def get(self, entity_id):
        return self._states.get(entity_id)

    def async_all(self, domain):
        prefix = f"{domain}."
        return [s for s in self._states.values() if s.entity_id.startswith(prefix)]


class DummyBus:
    def __init__(self):
        self.fired = []

    def async_fire(self, event, data):
        self.fired.append((event, data))

    def async_listen(self, _event, _cb):
        return lambda: None


class DummyHass:
    def __init__(self, states):
        self.states = DummyStates(states)
        self.data = {module.DOMAIN: {}}
        self.bus = DummyBus()

    def async_create_task(self, _coro):
        return None


def _make_entry(mode, box_id="123"):
    return SimpleNamespace(
        entry_id="entry1",
        options={"data_source_mode": mode, "box_id": box_id},
    )


def test_init_data_source_state_local_ok():
    now = dt_util.utcnow()
    states = [
        DummyState(module.PROXY_LAST_DATA_ENTITY_ID, now.isoformat(), last_updated=now),
        DummyState(module.PROXY_BOX_ID_ENTITY_ID, "123", last_updated=now),
        DummyState("sensor.oig_local_123_ac_out", "1", last_updated=now),
    ]
    hass = DummyHass(states)
    entry = _make_entry(module.DATA_SOURCE_LOCAL_ONLY)

    state = module.init_data_source_state(hass, entry)

    assert state.local_available is True
    assert state.effective_mode == module.DATA_SOURCE_LOCAL_ONLY


def test_init_data_source_state_proxy_mismatch():
    now = dt_util.utcnow()
    states = [
        DummyState(module.PROXY_LAST_DATA_ENTITY_ID, now.isoformat(), last_updated=now),
        DummyState(module.PROXY_BOX_ID_ENTITY_ID, "999", last_updated=now),
        DummyState("sensor.oig_local_123_ac_out", "1", last_updated=now),
    ]
    hass = DummyHass(states)
    entry = _make_entry(module.DATA_SOURCE_LOCAL_ONLY, box_id="123")

    state = module.init_data_source_state(hass, entry)

    assert state.local_available is False
    assert state.reason == "proxy_box_id_mismatch"


def test_update_state_cloud_only_forces_cloud():
    now = dt_util.utcnow()
    states = [
        DummyState(module.PROXY_LAST_DATA_ENTITY_ID, now.isoformat(), last_updated=now),
        DummyState(module.PROXY_BOX_ID_ENTITY_ID, "123", last_updated=now),
    ]
    hass = DummyHass(states)
    entry = _make_entry(module.DATA_SOURCE_CLOUD_ONLY)
    controller = module.DataSourceController(hass, entry, coordinator=None)

    changed, mode_changed = controller._update_state(force=True)

    assert changed is True
    assert mode_changed is True
    state = module.get_data_source_state(hass, entry.entry_id)
    assert state.effective_mode == module.DATA_SOURCE_CLOUD_ONLY


def test_on_any_state_change_tracks_pending():
    now = dt_util.utcnow()
    states = [
        DummyState(module.PROXY_LAST_DATA_ENTITY_ID, now.isoformat(), last_updated=now),
        DummyState(module.PROXY_BOX_ID_ENTITY_ID, "123", last_updated=now),
    ]
    hass = DummyHass(states)
    entry = _make_entry(module.DATA_SOURCE_LOCAL_ONLY, box_id="123")
    controller = module.DataSourceController(hass, entry, coordinator=None)
    controller._schedule_debounced_poke = lambda: None

    hass.data[module.DOMAIN][entry.entry_id] = {
        "data_source_state": module.DataSourceState(
            configured_mode=module.DATA_SOURCE_LOCAL_ONLY,
            effective_mode=module.DATA_SOURCE_LOCAL_ONLY,
            local_available=True,
            last_local_data=now,
            reason="local_ok",
        )
    }

    event = SimpleNamespace(
        data={"entity_id": "sensor.oig_local_123_ac_out"},
        time_fired=now + timedelta(seconds=5),
    )
    controller._on_any_state_change(event)

    assert "sensor.oig_local_123_ac_out" in controller._pending_local_entities
    assert controller._last_local_entity_update is not None
