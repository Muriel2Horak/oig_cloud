from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.shield import queue as queue_module


class DummyBus:
    def __init__(self):
        self.events = []

    def async_fire(self, event, data):
        self.events.append((event, data))


class DummyHass:
    def __init__(self):
        self.bus = DummyBus()


class DummyShield:
    def __init__(self):
        self.hass = DummyHass()
        self.pending = {}
        self.queue = []
        self.queue_metadata = {}
        self.running = None
        self._state_listener_unsub = None
        self._is_checking = False
        self.logged = []
        self.notified = 0

    def _normalize_value(self, value):
        return str(value).lower()

    async def _log_event(self, *_args, **_kwargs):
        self.logged.append((_args, _kwargs))

    def _notify_state_change(self):
        self.notified += 1


@pytest.mark.asyncio
async def test_handle_remove_from_queue():
    shield = DummyShield()
    shield.queue = [
        ("oig_cloud.set_box_mode", {"mode": "home1"}, {"box_prms_mode": "home1"}),
        ("oig_cloud.set_grid_delivery", {"mode": "limited"}, {"grid": "limited"}),
    ]
    shield.queue_metadata[("oig_cloud.set_box_mode", str({"mode": "home1"}))] = True
    call = SimpleNamespace(data={"position": 2}, context="ctx")

    await queue_module.handle_remove_from_queue(shield, call)

    assert len(shield.queue) == 1
    assert shield.notified == 1
    assert any(evt[0] == "oig_cloud_shield_queue_removed" for evt in shield.hass.bus.events)


def test_has_pending_mode_change():
    shield = DummyShield()
    shield.pending = {
        "oig_cloud.set_box_mode": {
            "entities": {"box_prms_mode": "Home 2"},
        }
    }
    assert queue_module.has_pending_mode_change(shield, "Home 2") is True


@pytest.mark.asyncio
async def test_check_loop_empty_cleans_listener():
    shield = DummyShield()
    called = {"done": False}

    def _unsub():
        called["done"] = True

    shield._state_listener_unsub = _unsub
    await queue_module.check_loop(shield, None)
    assert called["done"] is True
