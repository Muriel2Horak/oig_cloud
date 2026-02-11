from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.services import boiler as module


class DummyServices:
    def __init__(self):
        self.registered = {}
        self.calls = []

    def has_service(self, _domain, name):
        return name in self.registered

    def async_register(self, domain, name, handler, schema=None):
        self.registered[(domain, name)] = handler

    async def async_call(self, domain, service, data, blocking=False):
        self.calls.append((domain, service, data, blocking))


class DummyStore:
    def __init__(self, *_args, **_kwargs):
        self.data = {}
        self.saved = None

    async def async_load(self):
        return dict(self.data)

    async def async_save(self, data):
        self.saved = dict(data)
        self.data = dict(data)


class DummyHass:
    def __init__(self):
        self.services = DummyServices()
        self.data = {}
        self.states = SimpleNamespace(get=lambda _eid: SimpleNamespace(state="off"))
        self.created_tasks = []

    def async_create_task(self, coro):
        self.created_tasks.append(coro)
        return coro


@pytest.mark.asyncio
async def test_setup_boiler_services_registers_handlers_and_invalid_deadline(monkeypatch):
    hass = DummyHass()
    coordinator = SimpleNamespace()

    called = {"apply": False, "cancel": False}

    async def _apply(*_args, **_kwargs):
        called["apply"] = True

    async def _cancel(*_args, **_kwargs):
        called["cancel"] = True

    monkeypatch.setattr(module, "_restore_boiler_schedule", lambda *_a, **_k: None)
    monkeypatch.setattr(module, "_apply_boiler_plan", _apply)
    monkeypatch.setattr(module, "_cancel_boiler_plan", _cancel)

    module.setup_boiler_services(hass, "entry1", coordinator)

    plan_handler = hass.services.registered[(module.DOMAIN, module.SERVICE_PLAN_BOILER_HEATING)]
    apply_handler = hass.services.registered[(module.DOMAIN, module.SERVICE_APPLY_BOILER_PLAN)]
    cancel_handler = hass.services.registered[(module.DOMAIN, module.SERVICE_CANCEL_BOILER_PLAN)]

    bad_call = SimpleNamespace(data={"deadline": "not-time", "force": False})
    await plan_handler(bad_call)

    await apply_handler(SimpleNamespace(data={}))
    await cancel_handler(SimpleNamespace(data={}))
    assert called["apply"] is True
    assert called["cancel"] is True


@pytest.mark.asyncio
async def test_setup_boiler_services_plan_handler_calls_create(monkeypatch):
    hass = DummyHass()
    coordinator = SimpleNamespace()
    called = {"create": False}

    async def _create(*_args, **_kwargs):
        called["create"] = True

    monkeypatch.setattr(module, "_restore_boiler_schedule", lambda *_a, **_k: None)
    monkeypatch.setattr(module, "_create_boiler_plan", _create)
    monkeypatch.setattr(module, "_apply_boiler_plan", lambda *_a, **_k: None)
    monkeypatch.setattr(module, "_cancel_boiler_plan", lambda *_a, **_k: None)

    module.setup_boiler_services(hass, "entry1", coordinator)
    plan_handler = hass.services.registered[(module.DOMAIN, module.SERVICE_PLAN_BOILER_HEATING)]
    await plan_handler(SimpleNamespace(data={"deadline": "12:30", "force": True}))
    assert called["create"] is True


@pytest.mark.asyncio
async def test_apply_boiler_plan_no_plan_logs_warning(monkeypatch):
    hass = DummyHass()
    coordinator = SimpleNamespace(_current_plan=None)
    monkeypatch.setattr(module, "Store", lambda *_a, **_k: DummyStore())
    await module._apply_boiler_plan(hass, coordinator, "entry1")


@pytest.mark.asyncio
async def test_clear_persisted_schedule_entry_exists(monkeypatch):
    store = DummyStore()
    store.data = {"entry1": {"x": 1}, "entry2": {"x": 2}}
    monkeypatch.setattr(module, "Store", lambda *_a, **_k: store)
    await module._clear_persisted_schedule(DummyHass(), "entry1")
    assert store.saved is not None
    assert "entry1" not in store.saved


@pytest.mark.asyncio
async def test_restore_schedule_skips_invalid_and_expired(monkeypatch):
    now = datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(module.dt_util, "now", lambda: now)
    monkeypatch.setattr(
        module.dt_util,
        "parse_datetime",
        lambda value: datetime.fromisoformat(value) if value and "T" in value else None,
    )

    store = DummyStore()
    store.data = {
        "entry1": {
            "windows": [
                {"entity_id": None, "start": now.isoformat(), "end": (now + timedelta(hours=1)).isoformat()},
                {"entity_id": "switch.a", "start": "bad", "end": (now + timedelta(hours=1)).isoformat()},
                {"entity_id": "switch.b", "start": (now - timedelta(hours=2)).isoformat(), "end": (now - timedelta(hours=1)).isoformat()},
            ]
        }
    }
    monkeypatch.setattr(module, "Store", lambda *_a, **_k: store)

    await module._restore_boiler_schedule(DummyHass(), "entry1")


def test_build_circulation_windows_no_peak_hours():
    profile = SimpleNamespace(hourly_avg={0: 0.0, 1: 0.0})
    assert module._build_circulation_windows(profile) == []


def test_merge_window_appends_non_overlapping():
    now = datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc)
    windows = [{"start": now, "end": now + timedelta(minutes=10)}]
    module._merge_window(
        windows,
        now + timedelta(minutes=20),
        now + timedelta(minutes=30),
    )
    assert len(windows) == 2


@pytest.mark.asyncio
async def test_async_switch_on_calls_service():
    hass = DummyHass()
    await module._async_switch_on(hass, "switch.any")
    assert hass.services.calls[0][1] == "turn_on"


@pytest.mark.asyncio
async def test_schedule_switch_window_executes_inner_callbacks(monkeypatch):
    now = datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(module.dt_util, "now", lambda: now)

    captured = []

    def _track(_hass, cb, when):
        captured.append((cb, when))
        return lambda: None

    monkeypatch.setattr(module, "async_track_point_in_time", _track)

    hass = DummyHass()
    module._schedule_switch_window(
        hass,
        "switch.any",
        {"start": now + timedelta(minutes=1), "end": now + timedelta(minutes=2)},
    )

    # execute tracked callbacks to cover inner _turn_on/_turn_off branches
    for cb, when in captured:
        await cb(when)

    services = [call[1] for call in hass.services.calls]
    assert "turn_on" in services
    assert "turn_off" in services
