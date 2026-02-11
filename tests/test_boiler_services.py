from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.services import boiler as module


class DummyServices:
    def __init__(self):
        self.calls = []
        self._registered = set()

    async def async_call(self, domain, service, data, blocking=False, schema=None):
        self.calls.append((domain, service, data, blocking))

    def async_register(self, domain, services, schema=None):
        self._registered.add(domain)

    def has_service(self, domain, service):
        return domain in self._registered


class DummyStates:
    def __init__(self, states=None):
        self._states = states or {}

    def get(self, entity_id):
        return self._states.get(entity_id)


class DummyHass:
    def __init__(self, states=None):
        self.services = DummyServices()
        self.states = DummyStates(states)
        self.data = {}

    def async_create_task(self, _coro):
        return asyncio.create_task(_coro)


class DummyStore:
    def __init__(self, _hass, _version, _key):
        self.saved = None
        self._data = {}

    async def async_load(self):
        return dict(self._data)

    async def async_save(self, data):
        self.saved = data
        self._data = dict(data)


def _make_slot(start, end, consumption, source):
    return SimpleNamespace(
        start=start,
        end=end,
        avg_consumption_kwh=consumption,
        recommended_source=source,
    )


def test_build_heating_windows_merges_and_routes():
    now = datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc)
    slots = [
        _make_slot(now, now + timedelta(minutes=30), 1.0, module.EnergySource.GRID),
        _make_slot(now + timedelta(minutes=20), now + timedelta(minutes=40), 1.0, module.EnergySource.GRID),
        _make_slot(now + timedelta(hours=1), now + timedelta(hours=2), 0.0, module.EnergySource.GRID),
        _make_slot(now + timedelta(hours=3), now + timedelta(hours=4), 1.0, module.EnergySource.ALTERNATIVE),
    ]

    windows = module._build_heating_windows(slots, has_alt_config=True)
    assert len(windows["main"]) == 1
    assert len(windows["alt"]) == 1


@pytest.mark.asyncio
async def test_schedule_switch_window_paths(monkeypatch):
    now = datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(module.dt_util, "now", lambda: now)

    calls = []

    async def _on(_hass, entity_id):
        calls.append(("on", entity_id))

    async def _off(_hass, entity_id):
        calls.append(("off", entity_id))

    monkeypatch.setattr(module, "_async_switch_on", _on)
    monkeypatch.setattr(module, "_async_switch_off", _off)

    tracked = []

    def _track(_hass, _cb, when):
        tracked.append(when)
        return lambda: None

    monkeypatch.setattr(module, "async_track_point_in_time", _track)

    hass = DummyHass()
    assert module._schedule_switch_window(
        hass,
        "switch.x",
        {"start": now - timedelta(hours=2), "end": now - timedelta(hours=1)},
    ) == []

    callbacks = module._schedule_switch_window(
        hass,
        "switch.y",
        {"start": now - timedelta(minutes=5), "end": now + timedelta(minutes=5)},
    )
    await asyncio.sleep(0)
    assert callbacks
    assert calls[0][0] == "on"
    assert len(tracked) == 1

    calls.clear()
    tracked.clear()
    callbacks = module._schedule_switch_window(
        hass,
        "switch.z",
        {"start": now + timedelta(minutes=5), "end": now + timedelta(minutes=15)},
    )
    assert len(callbacks) == 2
    assert len(tracked) == 2
    assert calls == []


@pytest.mark.asyncio
async def test_apply_and_cancel_boiler_plan(monkeypatch):
    hass = DummyHass(
        states={
            "switch.oig_123_bojler_top": SimpleNamespace(state="off"),
            "switch.oig_123_bojler_alt": SimpleNamespace(state="off"),
            "switch.oig_123_bojler_cirkulace": SimpleNamespace(state="off"),
        }
    )
    coordinator = SimpleNamespace(
        _current_plan=SimpleNamespace(
            valid_until=datetime(2025, 1, 2, 0, 0, tzinfo=timezone.utc),
            slots=[
                _make_slot(
                    datetime(2025, 1, 1, 6, 0, tzinfo=timezone.utc),
                    datetime(2025, 1, 1, 7, 0, tzinfo=timezone.utc),
                    1.0,
                    module.EnergySource.GRID,
                ),
                _make_slot(
                    datetime(2025, 1, 1, 9, 0, tzinfo=timezone.utc),
                    datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc),
                    1.0,
                    module.EnergySource.ALTERNATIVE,
                ),
            ]
        ),
        _current_profile=SimpleNamespace(hourly_avg={7: 1.0}),
        async_request_refresh=lambda: None,
        config={
            module.CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.real_main",
            module.CONF_BOILER_ALT_HEATER_SWITCH_ENTITY: "switch.real_alt",
            module.CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.real_pump",
            "box_id": "123",
        },
    )

    scheduled = []

    def _schedule(_hass, entity_id, window):
        scheduled.append((entity_id, window))
        return [lambda: None]

    monkeypatch.setattr(module, "_schedule_switch_window", _schedule)
    monkeypatch.setattr(module, "Store", DummyStore)

    await module._apply_boiler_plan(hass, coordinator, "entry1")
    assert scheduled
    assert module.DOMAIN in hass.data

    await module._cancel_boiler_plan(hass, coordinator, "entry1", clear_plan=True)
    assert hass.services.calls
    assert coordinator._current_plan is None


@pytest.mark.asyncio
async def test_create_boiler_plan_skips_and_creates(monkeypatch):
    now = datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(module.dt_util, "now", lambda: now)

    planner_calls = []

    async def _create(**_kwargs):
        planner_calls.append("called")
        return SimpleNamespace(valid_until=now + timedelta(hours=1))

    async def _spot():
        return {}

    async def _overflow():
        return []

    async def _refresh():
        return None

    coordinator = SimpleNamespace(
        _current_plan=SimpleNamespace(valid_until=now + timedelta(hours=1)),
        _current_profile=SimpleNamespace(),
        planner=SimpleNamespace(async_create_plan=_create),
        _get_spot_prices=_spot,
        _get_overflow_windows=_overflow,
        async_request_refresh=_refresh,
        config={},
    )

    await module._create_boiler_plan(
        coordinator, "entry1", force=False, deadline_override=None
    )
    assert planner_calls == []

    coordinator._current_plan = None
    await module._create_boiler_plan(
        coordinator, "entry1", force=True, deadline_override=None
    )
    assert planner_calls


@pytest.mark.asyncio
async def test_restore_boiler_schedule(monkeypatch):
    hass = DummyHass()
    now = datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(module.dt_util, "now", lambda: now)
    monkeypatch.setattr(
        module.dt_util,
        "parse_datetime",
        lambda value: datetime.fromisoformat(value) if value else None,
    )

    store = DummyStore(hass, 1, "key")
    future = now + timedelta(hours=1)
    store._data = {
        "entry1": {
            "created_at": now.isoformat(),
            "entities": ["switch.x"],
            "windows": [
                {
                    "entity_id": "switch.x",
                    "start": now.isoformat(),
                    "end": future.isoformat(),
                }
            ],
        }
    }
    monkeypatch.setattr(module, "Store", lambda *_a, **_k: store)

    scheduled = []

    def _schedule(_hass, entity_id, window):
        scheduled.append((entity_id, window))
        return [lambda: None]

    monkeypatch.setattr(module, "_schedule_switch_window", _schedule)

    await module._restore_boiler_schedule(hass, "entry1")
    assert scheduled
    assert module.DOMAIN in hass.data


def test_helpers_and_validation():
    hass = DummyHass(states={"switch.oig_1_bojler_top": SimpleNamespace(state="on")})
    assert module._resolve_box_id(SimpleNamespace(box_id="1"), {"box_id": "1"}) == "1"
    assert module._resolve_box_id(SimpleNamespace(box_id="bad"), {"box_id": "2"}) == "2"
    assert module._resolve_wrapper_entity("1", "bojler_top") == "switch.oig_1_bojler_top"
    assert module._entity_exists(hass, "switch.oig_1_bojler_top") is True
    assert module._entity_exists(hass, "switch.missing") is False
    assert module._is_valid_time("12:30") is True
    assert module._is_valid_time("bad") is False


@pytest.mark.asyncio
async def test_apply_boiler_plan_missing_configs(monkeypatch):
    hass = DummyHass(
        states={
            "switch.oig_123_bojler_top": SimpleNamespace(state="off"),
        }
    )
    coordinator = SimpleNamespace(
        _current_plan=SimpleNamespace(slots=[_make_slot(
            datetime(2025, 1, 1, 6, 0, tzinfo=timezone.utc),
            datetime(2025, 1, 1, 7, 0, tzinfo=timezone.utc),
            1.0,
            module.EnergySource.GRID,
        )]),
        _current_profile=None,
        config={},
    )

    scheduled = []

    def _schedule(_hass, entity_id, window):
        scheduled.append((entity_id, window))
        return [lambda: None]

    monkeypatch.setattr(module, "_schedule_switch_window", _schedule)
    monkeypatch.setattr(module, "Store", DummyStore)

    await module._apply_boiler_plan(hass, coordinator, "entry1")
    assert scheduled == []


@pytest.mark.asyncio
async def test_apply_boiler_plan_missing_wrapper_switches(monkeypatch):
    hass = DummyHass(states={})
    coordinator = SimpleNamespace(
        _current_plan=SimpleNamespace(slots=[_make_slot(
            datetime(2025, 1, 1, 6, 0, tzinfo=timezone.utc),
            datetime(2025, 1, 1, 7, 0, tzinfo=timezone.utc),
            1.0,
            module.EnergySource.GRID,
        )]),
        _current_profile=None,
        config={
            module.CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.real_main",
            module.CONF_BOILER_ALT_HEATER_SWITCH_ENTITY: "switch.real_alt",
            "box_id": "123",
        },
    )

    scheduled = []

    def _schedule(_hass, entity_id, window):
        scheduled.append((entity_id, window))
        return [lambda: None]

    monkeypatch.setattr(module, "_schedule_switch_window", _schedule)
    monkeypatch.setattr(module, "Store", DummyStore)

    await module._apply_boiler_plan(hass, coordinator, "entry1")
    assert scheduled == []


@pytest.mark.asyncio
async def test_create_boiler_plan_no_profile(monkeypatch):
    async def _update_profile():
        coordinator._current_profile = None

    coordinator = SimpleNamespace(
        _current_plan=None,
        _current_profile=None,
        config={},
        _update_profile=_update_profile,
    )

    await module._create_boiler_plan(
        coordinator, "entry1", force=False, deadline_override=None
    )
    assert coordinator._current_plan is None


@pytest.mark.asyncio
async def test_ensure_schedule_windows():
    schedule = module.BoilerSchedule(
        cancel_callbacks=[],
        entities=set(),
        created_at=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
        windows={"switch.x": [{"start": datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                              "end": datetime(2025, 1, 1, 9, 0, tzinfo=timezone.utc)}]},
    )
    result = module._ensure_schedule_windows(schedule)
    assert result["switch.x"][0]["start"] == schedule.windows["switch.x"][0]["start"]


@pytest.mark.asyncio
async def test_setup_boiler_services_skips_if_registered(monkeypatch):
    hass = DummyHass()
    hass.services.has_service = lambda *_a: True

    scheduled = []
    def _schedule(_hass, entity_id, window):
        scheduled.append((entity_id, window))
        return [lambda: None]

    coordinator = SimpleNamespace(
        _current_plan=SimpleNamespace(slots=[]),
        _current_profile=None,
        config={},
        async_request_refresh=lambda: None,
    )

    monkeypatch.setattr(module, "_schedule_switch_window", _schedule)

    module.setup_boiler_services(hass, "entry1", coordinator)
    assert scheduled == []


@pytest.mark.asyncio
async def test_apply_boiler_plan_logs_error_alt_missing(monkeypatch):
    hass = DummyHass(
        states={
            "switch.oig_123_bojler_top": SimpleNamespace(state="off"),
        }
    )
    coordinator = SimpleNamespace(
        _current_plan=SimpleNamespace(slots=[_make_slot(
            datetime(2025, 1, 1, 6, 0, tzinfo=timezone.utc),
            datetime(2025, 1, 1, 7, 0, tzinfo=timezone.utc),
            1.0,
            module.EnergySource.GRID,
        )]),
        _current_profile=None,
        config={
            module.CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.real_main",
            module.CONF_BOILER_ALT_HEATER_SWITCH_ENTITY: "switch.real_alt",
            "box_id": "123",
        },
    )

    scheduled = []
    def _schedule(_hass, entity_id, window):
        scheduled.append((entity_id, window))
        return [lambda: None]

    monkeypatch.setattr(module, "_schedule_switch_window", _schedule)
    monkeypatch.setattr(module, "Store", DummyStore)

    await module._apply_boiler_plan(hass, coordinator, "entry1")
    assert scheduled == []


@pytest.mark.asyncio
async def test_apply_boiler_plan_logs_error_pump_missing(monkeypatch):
    hass = DummyHass(
        states={
            "switch.oig_123_bojler_top": SimpleNamespace(state="off"),
            "switch.oig_123_bojler_alt": SimpleNamespace(state="off"),
        }
    )
    coordinator = SimpleNamespace(
        _current_plan=SimpleNamespace(slots=[_make_slot(
            datetime(2025, 1, 1, 6, 0, tzinfo=timezone.utc),
            datetime(2025, 1, 1, 7, 0, tzinfo=timezone.utc),
            1.0,
            module.EnergySource.GRID,
        )]),
        _current_profile=None,
        config={
            module.CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.real_main",
            module.CONF_BOILER_ALT_HEATER_SWITCH_ENTITY: "switch.real_alt",
            module.CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.real_pump",
            "box_id": "123",
        },
    )

    scheduled = []
    def _schedule(_hass, entity_id, window):
        scheduled.append((entity_id, window))
        return [lambda: None]

    monkeypatch.setattr(module, "_schedule_switch_window", _schedule)
    monkeypatch.setattr(module, "Store", DummyStore)

    await module._apply_boiler_plan(hass, coordinator, "entry1")
    assert scheduled == []


def test_build_circulation_windows_empty_hourly_avg():
    profile = SimpleNamespace(hourly_avg=None)
    assert module._build_circulation_windows(profile) == []


def test_pick_peak_hours_empty_dict():
    assert module._pick_peak_hours({}) == []


def test_merge_window_first():
    windows = []
    start = datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc)
    end = datetime(2025, 1, 1, 9, 0, tzinfo=timezone.utc)
    module._merge_window(windows, start, end)
    assert len(windows) == 1
    assert windows[0]["start"] == start


def test_schedule_switch_window_none_entity(monkeypatch):
    now = datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(module.dt_util, "now", lambda: now)
    hass = DummyHass()
    result = module._schedule_switch_window(hass, None, {"start": now, "end": now + timedelta(minutes=15)})
    assert result == []


@pytest.mark.asyncio
async def test_restore_boiler_schedule_no_data(monkeypatch):
    hass = DummyHass()
    store = DummyStore(hass, 1, "key")
    store._data = {}
    monkeypatch.setattr(module, "Store", lambda *_a, **_k: store)
    await module._restore_boiler_schedule(hass, "entry1")
    assert module.DOMAIN not in hass.data


@pytest.mark.asyncio
async def test_restore_boiler_schedule_exception_handling(monkeypatch):
    hass = DummyHass()
    now = datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(module.dt_util, "now", lambda: now)
    monkeypatch.setattr(
        module.dt_util,
        "parse_datetime",
        lambda value: datetime.fromisoformat(value) if value else None,
    )

    store = DummyStore(hass, 1, "key")
    store._data = {
        "entry1": {
            "created_at": now.isoformat(),
            "entities": ["switch.x"],
            "windows": [
                {
                    "entity_id": "switch.x",
                    "start": "invalid",
                    "end": now.isoformat(),
                }
            ],
        }
    }
    monkeypatch.setattr(module, "Store", lambda *_a, **_k: store)

    scheduled = []
    def _schedule(_hass, entity_id, window):
        scheduled.append((entity_id, window))
        return [lambda: None]

    monkeypatch.setattr(module, "_schedule_switch_window", _schedule)

    await module._restore_boiler_schedule(hass, "entry1")
    assert scheduled == []


@pytest.mark.asyncio
async def test_setup_boiler_services_creates_plan_successfully(monkeypatch):
    hass = DummyHass()
    hass.services.async_register = lambda domain, services: None
    
    planner = SimpleNamespace()
    async def async_create_plan_mock(**kwargs):
        pass
    planner.async_create_plan = async_create_plan_mock
    
    coordinator = SimpleNamespace()
    coordinator._current_plan = None
    coordinator._current_profile = SimpleNamespace()
    async def _get_spot_prices_mock():
        return []
    coordinator._get_spot_prices = _get_spot_prices_mock
    async def _get_overflow_windows_mock():
        return []
    coordinator._get_overflow_windows = _get_overflow_windows_mock
    coordinator.planner = planner
    coordinator.config = {}
    coordinator.async_request_refresh = lambda: None
    
    async def _create_boiler_plan_mock(coordinator, entry_id, force, deadline_override):
        pass
    
    monkeypatch.setattr(module, '_create_boiler_plan', _create_boiler_plan_mock)
    
    await module.setup_boiler_services(hass, coordinator, "test_entry")
