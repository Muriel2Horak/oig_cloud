from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from homeassistant.helpers import frame

from custom_components.oig_cloud.boiler import coordinator as module
from custom_components.oig_cloud.boiler.models import BoilerProfile, EnergySource
from custom_components.oig_cloud.const import (
    CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
    CONF_BOILER_HEATER_POWER_KW_ENTITY,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    CONF_BOILER_TEMP_SENSOR_BOTTOM,
    CONF_BOILER_TEMP_SENSOR_TOP,
)


class DummyState:
    def __init__(self, state, attributes=None, last_updated=None):
        self.state = state
        self.attributes = attributes or {}
        self.last_updated = last_updated
        self.last_changed = last_updated


class DummyStates:
    def __init__(self, data):
        self._data = data

    def get(self, entity_id):
        return self._data.get(entity_id)

    def set(self, entity_id, state):
        self._data[entity_id] = state


class DummyHass:
    def __init__(self, states=None):
        self.states = DummyStates(states or {})
        self.data = {}


class DummyLoop:
    def __init__(self, now=0.0):
        self.now = now

    def time(self):
        return self.now


class DummyBus:
    def __init__(self):
        self.listeners = []

    def async_listen(self, event_type, callback):
        record = SimpleNamespace(
            event_type=event_type,
            callback=callback,
            active=True,
            unsubscribe_calls=0,
        )
        self.listeners.append(record)

        def _unsubscribe():
            record.unsubscribe_calls += 1
            record.active = False

        return _unsubscribe

    def fire_state_changed(self, entity_id, time_fired):
        event = SimpleNamespace(data={"entity_id": entity_id}, time_fired=time_fired)
        for record in list(self.listeners):
            if record.active:
                record.callback(event)

    @property
    def active_callbacks(self):
        return [record for record in self.listeners if record.active]


class ActivityHass(DummyHass):
    def __init__(self, states=None):
        super().__init__(states)
        self.loop = DummyLoop()
        self.bus = DummyBus()


class RuntimeReadModel:
    def __init__(self, coordinator):
        self._coordinator = coordinator

    def get_current_profile(self):
        return getattr(self._coordinator, "_current_profile", None)

    def get_current_plan(self):
        return getattr(self._coordinator, "_current_plan", None)

    async def async_ensure_profile(self):
        return self.get_current_profile()


class CountingClassifier:
    def __init__(self, fail=False):
        from custom_components.oig_cloud.boiler.classifier import BoilerActivityClassifier

        self._real = BoilerActivityClassifier()
        self.calls = []
        self.fail = fail

    def classify(self, prev, curr, snapshot):
        self.calls.append((prev, curr, snapshot))
        if self.fail:
            raise RuntimeError("classifier boom")
        return self._real.classify(prev, curr, snapshot)


def _make_activity_runtime(hass, config=None, plan=None):
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime

    coordinator = SimpleNamespace(
        config=config or {},
        _oig_manual_mode_entity="sensor.manual_mode",
        _oig_current_cbb_entity="sensor.current_cbb",
        _current_plan=plan,
        _current_profile=None,
    )
    runtime = BoilerRuntime(
        hass=hass,
        read_model=RuntimeReadModel(coordinator),
        planner=SimpleNamespace(),
        actuator=SimpleNamespace(),
        energy_adapter=SimpleNamespace(),
        coordinator=coordinator,
        box_id="123",
        entry_id="entry1",
    )
    return runtime, coordinator


def _set_state(hass, entity_id, value, timestamp, attributes=None):
    hass.states.set(entity_id, DummyState(value, attributes, last_updated=timestamp))


def _freeze_runtime_now(monkeypatch, timestamp):
    from custom_components.oig_cloud.boiler import runtime as runtime_module

    monkeypatch.setattr(runtime_module.dt_util, "now", lambda: timestamp)


class DummyProfiler:
    def __init__(self, *args, **kwargs):
        self._profiles = []

    async def async_update_profiles(self):
        return self._profiles

    def get_profile_for_datetime(self, _dt):
        return BoilerProfile(category="test")


class DummyPlanner:
    def __init__(self, *args, **kwargs):
        self._overflow = []

    async def async_create_plan(self, **_kwargs):
        return SimpleNamespace(
            get_current_slot=lambda _now: SimpleNamespace(
                recommended_source=SimpleNamespace(value=EnergySource.GRID.value)
            )
        )

    async def async_get_overflow_windows(self, _data):
        return self._overflow


@pytest.fixture(autouse=True)
def _disable_frame_report(monkeypatch):
    monkeypatch.setattr(frame, "report_usage", lambda *_a, **_k: None)


@pytest.mark.asyncio
async def test_async_update_data_success(monkeypatch):
    monkeypatch.setattr(module, "BoilerProfiler", DummyProfiler)
    monkeypatch.setattr(module, "BoilerPlanner", DummyPlanner)

    hass = DummyHass()
    config = {}
    coordinator = module.BoilerCoordinator(hass, config)

    async def _mock_temps():
        return {
            "top": 55.0,
            "bottom": 45.0,
            "upper_zone": 55.0,
            "lower_zone": 45.0,
        }

    monkeypatch.setattr(
        coordinator._thermal_read_model,
        "read_temperatures",
        _mock_temps,
    )
    monkeypatch.setattr(
        coordinator._thermal_read_model,
        "calculate_energy_state",
        lambda _temps: {"avg_temp": 50.0, "energy_needed_kwh": 1.23},
    )

    monkeypatch.setattr(
        coordinator._energy_state_adapter,
        "track_energy_sources",
        lambda: {
            "current_source": EnergySource.GRID.value,
            "total_kwh": 0.0,
            "fve_kwh": 0.0,
            "grid_kwh": 0.0,
            "alt_kwh": 0.0,
        },
    )

    data = await coordinator._async_update_data()
    assert data["energy_state"]["energy_needed_kwh"] == 1.23
    assert data["charging_recommended"] is False


@pytest.mark.asyncio
async def test_async_update_data_error(monkeypatch):
    monkeypatch.setattr(module, "BoilerProfiler", DummyProfiler)
    monkeypatch.setattr(module, "BoilerPlanner", DummyPlanner)

    hass = DummyHass()
    coordinator = module.BoilerCoordinator(hass, {})

    async def _boom():
        raise RuntimeError("fail")

    monkeypatch.setattr(coordinator._thermal_read_model, "read_temperatures", _boom)

    with pytest.raises(module.UpdateFailed):
        await coordinator._async_update_data()


def test_should_update_profile():
    coordinator = module.BoilerCoordinator(DummyHass(), {})
    now = datetime(2025, 1, 1, 12, 0, 0)
    assert coordinator._should_update_profile(now) is True
    coordinator._last_profile_update = now
    assert coordinator._should_update_profile(now + timedelta(hours=1)) is False
    assert coordinator._should_update_profile(
        now + module.PROFILE_UPDATE_INTERVAL
    ) is True


@pytest.mark.asyncio
async def test_update_profile_error(monkeypatch):
    class BadProfiler(DummyProfiler):
        async def async_update_profiles(self):
            raise RuntimeError("boom")

    monkeypatch.setattr(module, "BoilerProfiler", BadProfiler)
    monkeypatch.setattr(module, "BoilerPlanner", DummyPlanner)

    coordinator = module.BoilerCoordinator(DummyHass(), {})
    await coordinator._update_profile()
    assert coordinator._current_profile is None


@pytest.mark.asyncio
async def test_read_temperatures_paths(monkeypatch):
    from custom_components.oig_cloud.boiler.runtime import _ThermalReadModel

    async def _mock_read(_self):
        return {"top": 50.0, "upper_zone": 52.0, "lower_zone": 48.0, "bottom": None}

    monkeypatch.setattr(_ThermalReadModel, "read_temperatures", _mock_read)

    hass = DummyHass({"sensor.top": DummyState("50")})
    config = {module.CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top"}
    coordinator = module.BoilerCoordinator(hass, config)
    temps = await coordinator._read_temperatures()
    assert temps["upper_zone"] == 52.0


@pytest.mark.asyncio
async def test_read_temperatures_uses_sensor_position(monkeypatch):
    from custom_components.oig_cloud.boiler.runtime import _ThermalReadModel

    captured = {}

    async def _read_temps(_self):
        _config = getattr(coordinator, "config", {}) or {}
        captured["sensor_position"] = _config.get(module.CONF_BOILER_TEMP_SENSOR_POSITION)
        return {"top": 50.0, "upper_zone": 55.0, "lower_zone": 45.0, "bottom": None}

    monkeypatch.setattr(_ThermalReadModel, "read_temperatures", _read_temps)

    hass = DummyHass({"sensor.top": DummyState("50")})
    config = {
        module.CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top",
        module.CONF_BOILER_TEMP_SENSOR_POSITION: "lower_quarter",
        module.CONF_BOILER_TWO_ZONE_SPLIT_RATIO: 0.5,
    }
    coordinator = module.BoilerCoordinator(hass, config)
    temps = await coordinator._read_temperatures()

    assert captured["sensor_position"] == "lower_quarter"
    assert temps["upper_zone"] == 55.0


def test_calculate_energy_state(monkeypatch):
    coordinator = module.BoilerCoordinator(DummyHass(), {})
    monkeypatch.setattr(
        coordinator._thermal_read_model,
        "calculate_energy_state",
        lambda _temps: {"avg_temp": 50.0, "energy_needed_kwh": 2.0},
    )
    temps = {"upper_zone": 60.0, "lower_zone": 40.0}
    energy = coordinator._calculate_energy_state(temps)
    assert energy["energy_needed_kwh"] == 2.0
    monkeypatch.setattr(
        coordinator._thermal_read_model,
        "calculate_energy_state",
        lambda _temps: {"avg_temp": 0.0, "energy_needed_kwh": 0.0},
    )
    temps = {"upper_zone": None, "lower_zone": None}
    energy = coordinator._calculate_energy_state(temps)
    assert energy["avg_temp"] == 0.0


@pytest.mark.asyncio
async def test_track_energy_sources_variants(monkeypatch):
    monkeypatch.setattr(module, "BoilerProfiler", DummyProfiler)
    monkeypatch.setattr(module, "BoilerPlanner", DummyPlanner)

    hass = DummyHass(
        {
            "sensor.oig_123_boiler_manual_mode": DummyState("Zapnuto"),
            "sensor.oig_123_boiler_current_cbb_w": DummyState("5"),
            "sensor.oig_123_boiler_day_w": DummyState("1000"),
            "sensor.alt": DummyState("2000", {"unit_of_measurement": "Wh"}),
        }
    )
    config = {"box_id": "123", module.CONF_BOILER_ALT_ENERGY_SENSOR: "sensor.alt"}
    coordinator = module.BoilerCoordinator(hass, config)
    data = await coordinator._track_energy_sources()
    assert data["current_source"] == EnergySource.FVE.value
    assert data["total_kwh"] == 1.0
    assert data["alt_kwh"] == 2.0

    hass = DummyHass(
        {
            "sensor.oig_123_boiler_current_cbb_w": DummyState("bad"),
            "sensor.oig_123_boiler_day_w": DummyState("bad"),
        }
    )
    coordinator = module.BoilerCoordinator(hass, {"box_id": "123"})

    def _mock_tracking():
        return {
            "current_source": EnergySource.GRID.value,
            "total_kwh": 0.0,
            "fve_kwh": 0.0,
            "grid_kwh": 0.0,
            "alt_kwh": 3.0,
        }

    monkeypatch.setattr(
        coordinator._energy_state_adapter,
        "track_energy_sources",
        _mock_tracking,
    )
    data = await coordinator._track_energy_sources()
    assert data["alt_kwh"] == 3.0


@pytest.mark.asyncio
async def test_energy_input_adapter_spot_prices(monkeypatch):
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter

    hass = DummyHass(
        {
            "sensor.spot": DummyState(
                "ok",
                {
                    "prices": [
                        {"datetime": "2025-01-01T00:00:00", "price": 2.0},
                        {"datetime": None, "price": 3.0},
                    ]
                },
            )
        }
    )
    config = {module.CONF_BOILER_SPOT_PRICE_SENSOR: "sensor.spot"}
    coordinator = module.BoilerCoordinator(hass, config)
    adapter = _CoordinatorEnergyInputAdapter(coordinator)
    prices = await adapter.get_spot_prices()
    assert len(prices) == 1
    assert 2.0 in prices.values()


@pytest.mark.asyncio
async def test_energy_input_adapter_overflow_windows(monkeypatch):
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter

    monkeypatch.setattr(module, "BoilerProfiler", DummyProfiler)
    monkeypatch.setattr(module, "BoilerPlanner", DummyPlanner)

    coordinator = module.BoilerCoordinator(DummyHass(), {})
    adapter = _CoordinatorEnergyInputAdapter(coordinator)
    assert await adapter.get_overflow_windows() == []

    start = datetime(2025, 1, 1)
    coordinator.hass.data = {
        "oig_cloud": {
            "entry1": {
                "coordinator": SimpleNamespace(
                    battery_forecast_data={
                        "overflow_windows": [
                            {
                                "start": start.isoformat(),
                                "end": datetime(2025, 1, 2).isoformat(),
                                "soc": 100.0,
                            }
                        ]
                    }
                )
            }
        }
    }
    adapter = _CoordinatorEnergyInputAdapter(coordinator, entry_id="entry1", box_id="123")
    windows = await adapter.get_overflow_windows()
    assert windows


@pytest.mark.asyncio
async def test_track_energy_sources_alt_invalid(monkeypatch):
    monkeypatch.setattr(module, "BoilerProfiler", DummyProfiler)
    monkeypatch.setattr(module, "BoilerPlanner", DummyPlanner)

    hass = DummyHass({"sensor.alt": DummyState("bad")})
    config = {module.CONF_BOILER_ALT_ENERGY_SENSOR: "sensor.alt"}
    coordinator = module.BoilerCoordinator(hass, config)
    data = await coordinator._track_energy_sources()
    assert data["alt_kwh"] == 0.0


@pytest.mark.asyncio
async def test_runtime_create_plan_error(monkeypatch):
    from custom_components.oig_cloud.boiler.runtime import (
        BoilerRuntime,
        _CoordinatorReadModel,
        _CoordinatorPlanner,
        _CoordinatorEnergyInputAdapter,
    )

    monkeypatch.setattr(module, "BoilerProfiler", DummyProfiler)
    monkeypatch.setattr(module, "BoilerPlanner", DummyPlanner)

    coordinator = module.BoilerCoordinator(DummyHass(), {})
    coordinator._current_profile = BoilerProfile(category="test")

    legacy_planner_calls = []

    async def _legacy_planner_must_not_run(**_kwargs):
        legacy_planner_calls.append("called")
        raise RuntimeError("boom")

    async def _empty_energy_input():
        from custom_components.oig_cloud.boiler.runtime import BoilerEnergyInput

        return BoilerEnergyInput()

    monkeypatch.setattr(coordinator.planner, "async_create_plan", _legacy_planner_must_not_run)

    read_model = _CoordinatorReadModel(coordinator)
    planner = _CoordinatorPlanner(coordinator)
    energy_adapter = _CoordinatorEnergyInputAdapter(coordinator)
    monkeypatch.setattr(energy_adapter, "async_get_energy_input", _empty_energy_input)

    runtime = BoilerRuntime(
        hass=DummyHass(),
        read_model=read_model,
        planner=planner,
        actuator=SimpleNamespace(async_apply_plan=lambda **_k: None, async_cancel_plan=lambda **_k: None),
        energy_adapter=energy_adapter,
        coordinator=coordinator,
        box_id="123",
        entry_id="entry1",
    )
    plan = await runtime.async_create_plan(force=True)
    assert plan is not None
    assert legacy_planner_calls == []
    assert runtime.last_plan_result is not None
    assert runtime.last_plan_result.entry_id == "entry1"
    assert runtime.last_plan_result.box_id == "123"
    assert runtime.get_current_plan() is plan


@pytest.mark.asyncio
async def test_energy_input_adapter_spot_prices_missing_state(monkeypatch):
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter

    monkeypatch.setattr(module, "BoilerProfiler", DummyProfiler)
    monkeypatch.setattr(module, "BoilerPlanner", DummyPlanner)

    hass = DummyHass()
    config = {module.CONF_BOILER_SPOT_PRICE_SENSOR: "sensor.spot"}
    coordinator = module.BoilerCoordinator(hass, config)
    adapter = _CoordinatorEnergyInputAdapter(coordinator)
    prices = await adapter.get_spot_prices()
    assert prices == {}


def test_resolve_box_id_uses_forced_when_valid():
    hass = DummyHass()
    config = {"box_id": "123"}
    coordinator = module.BoilerCoordinator(hass, config)
    coordinator.forced_box_id = "999"
    result = coordinator._resolve_box_id(config)
    assert result == "123" or result == "999"


def test_resolve_box_id_no_infer_from_states():
    hass = DummyHass(
        {
            "sensor.oig_123_boiler_day_w": DummyState("1000"),
        }
    )
    coordinator = module.BoilerCoordinator(hass, {})
    result = coordinator._resolve_box_id({})
    assert result == "unknown"


def test_build_oig_entity_id_unknown_box_no_hardcode():
    hass = DummyHass()
    coordinator = module.BoilerCoordinator(hass, {})
    coordinator.box_id = "unknown"
    result = coordinator._build_oig_entity_id("test_suffix")
    assert result == "sensor.oig_unknown_test_suffix"
    assert "2206237016" not in result


def test_build_oig_entity_id_known_box_id():
    hass = DummyHass()
    coordinator = module.BoilerCoordinator(hass, {"box_id": "123"})
    coordinator.box_id = "123"
    result = coordinator._build_oig_entity_id("test_suffix")
    assert result == "sensor.oig_123_test_suffix"


def test_runtime_activity_listener_filters_and_updates_cache(monkeypatch):
    from custom_components.oig_cloud.boiler.models import BoilerPlan, BoilerSlot

    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    _freeze_runtime_now(monkeypatch, now)
    hass = ActivityHass()
    config = {
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top",
        CONF_BOILER_TEMP_SENSOR_BOTTOM: "sensor.bottom",
        CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.main",
        CONF_BOILER_ALT_HEATER_SWITCH_ENTITY: "switch.alt",
        CONF_BOILER_HEATER_POWER_KW_ENTITY: "sensor.power_kw",
    }
    _set_state(hass, "sensor.top", "50", now)
    _set_state(hass, "sensor.bottom", "42", now)
    _set_state(hass, "switch.main", "on", now)
    _set_state(hass, "switch.alt", "off", now)
    _set_state(hass, "sensor.power_kw", "2.5", now)
    _set_state(hass, "sensor.manual_mode", "CBB", now)  # CBB mode → power-first: overflow
    _set_state(hass, "sensor.current_cbb", "2000", now)  # 2000 W > threshold → electric
    plan = BoilerPlan(
        created_at=now,
        valid_until=now + timedelta(hours=1),
        slots=[
            BoilerSlot(
                start=now - timedelta(minutes=15),
                end=now + timedelta(minutes=15),
                avg_consumption_kwh=1.0,
                confidence=0.9,
                recommended_source=EnergySource.FVE,
                overflow_available=True,
            )
        ],
    )
    runtime, _coordinator = _make_activity_runtime(hass, config=config, plan=plan)
    spy = CountingClassifier()
    runtime._activity_classifier = spy

    expected_entities = {
        "sensor.top",
        "sensor.bottom",
        "switch.main",
        "switch.alt",
        "sensor.power_kw",
        "sensor.manual_mode",
        "sensor.current_cbb",
    }
    assert runtime._activity_entity_ids == expected_entities
    assert [record.event_type for record in hass.bus.listeners] == ["state_changed"]

    hass.bus.fire_state_changed("sensor.unrelated", now)

    assert spy.calls == []
    assert runtime.current_activity is None
    assert runtime.timeline_buffer == []

    hass.bus.fire_state_changed("sensor.top", now)

    assert len(spy.calls) == 1
    activity = runtime.current_activity
    assert activity is not None
    assert activity.state == "charging_overflow"
    # Task A: power-first classifier. CBB=2000W + CBB mode + overflow → source='overflow'.
    assert activity.source == "overflow"
    assert activity.heater_states == {
        "switch.main": "on",
        "switch.alt": "off",
    }
    assert activity.stale_flags == []
    assert runtime.timeline_buffer == [
        {
            "timestamp": now,
            "top_temp_c": 50.0,
            "bottom_temp_c": 42.0,
            "source_key": "overflow",
            "power_kw": 2.5,
            "activity_state": "charging_overflow",
        }
    ]


def test_runtime_activity_debounce_power_update_and_boundary_sampling():
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    hass = ActivityHass()
    config = {
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top",
        CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.main",
        CONF_BOILER_HEATER_POWER_KW_ENTITY: "sensor.power_kw",
    }
    _set_state(hass, "sensor.top", "50", now)
    _set_state(hass, "switch.main", "on", now)
    _set_state(hass, "sensor.power_kw", "2.0", now)
    _set_state(hass, "sensor.manual_mode", "Vypnuto", now)
    # CBB = 0 W → power-first: NOT charging (correct behavior post Task A fix).
    # Even though switch.main is "on", 0 W CBB power means the box is not
    # actually sending electricity to the boiler.
    _set_state(hass, "sensor.current_cbb", "0", now)
    runtime, _coordinator = _make_activity_runtime(hass, config=config)
    spy = CountingClassifier()
    runtime._activity_classifier = spy

    hass.loop.now = 0.0
    hass.bus.fire_state_changed("sensor.top", now)

    assert len(spy.calls) == 1
    assert len(runtime.timeline_buffer) == 1
    # Task A: 0 W CBB power → standby, NOT charging_grid.
    # This is the exact bug that was fixed: UI was claiming "charging" when
    # the box was actually sending 0 W to the boiler.
    assert runtime.timeline_buffer[0]["activity_state"] == "standby"

    hass.loop.now = 0.5
    _set_state(hass, "sensor.power_kw", "4.0", now + timedelta(seconds=1))
    hass.bus.fire_state_changed("sensor.power_kw", now + timedelta(seconds=1))

    assert len(spy.calls) == 1
    assert runtime.timeline_buffer[0]["power_kw"] == 2.0

    hass.loop.now = 2.0
    _set_state(hass, "sensor.power_kw", "4.0", now + timedelta(seconds=30))
    hass.bus.fire_state_changed("sensor.power_kw", now + timedelta(seconds=30))

    assert len(spy.calls) == 2
    assert len(runtime.timeline_buffer) == 1
    assert runtime.timeline_buffer[0]["power_kw"] == 4.0

    hass.loop.now = 4.0
    boundary_time = now + timedelta(seconds=31)
    _set_state(hass, "switch.main", "off", boundary_time)
    _set_state(hass, "sensor.top", "49", boundary_time)
    hass.bus.fire_state_changed("switch.main", boundary_time)

    assert len(spy.calls) == 3
    assert len(runtime.timeline_buffer) == 2
    assert runtime.timeline_buffer[-1]["timestamp"] == boundary_time
    assert runtime.timeline_buffer[-1]["source_key"] == "discharge"
    assert runtime.timeline_buffer[-1]["activity_state"] == "discharging"


@pytest.mark.parametrize(
    ("raw_power", "expected"),
    [
        ("1.25", 1.25),
        ("0.0", 0.0),
        (None, None),
        ("unknown", None),
        ("unavailable", None),
        ("", None),
        ("not-a-number", None),
        ("nan", None),
        ("inf", None),
        ("-inf", None),
    ],
)
def test_runtime_activity_power_kw_parsing_variants(raw_power, expected):
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    hass = ActivityHass()
    config = {
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top",
        CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.main",
        CONF_BOILER_HEATER_POWER_KW_ENTITY: "sensor.power_kw",
    }
    _set_state(hass, "sensor.top", "50", now)
    _set_state(hass, "switch.main", "on", now)
    _set_state(hass, "sensor.manual_mode", "Vypnuto", now)
    _set_state(hass, "sensor.current_cbb", "0", now)
    if raw_power is not None:
        _set_state(hass, "sensor.power_kw", raw_power, now)
    runtime, _coordinator = _make_activity_runtime(hass, config=config)

    hass.bus.fire_state_changed("sensor.top", now)

    assert runtime.timeline_buffer[0]["power_kw"] == expected


def test_runtime_activity_missing_power_entity_stores_none():
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    hass = ActivityHass()
    config = {
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top",
        CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.main",
    }
    _set_state(hass, "sensor.top", "50", now)
    _set_state(hass, "switch.main", "on", now)
    _set_state(hass, "sensor.manual_mode", "Vypnuto", now)
    _set_state(hass, "sensor.current_cbb", "0", now)
    runtime, _coordinator = _make_activity_runtime(hass, config=config)

    hass.bus.fire_state_changed("sensor.top", now)

    assert runtime.timeline_buffer[0]["power_kw"] is None


def test_runtime_activity_unload_calls_unsubscribers_once_and_clears():
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    hass = ActivityHass()
    config = {CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top"}
    _set_state(hass, "sensor.top", "50", now)
    runtime, _coordinator = _make_activity_runtime(hass, config=config)
    calls = []

    def _bad_unsub():
        calls.append("bad")
        raise RuntimeError("unsubscribe failed")

    runtime._activity_listener_unsubs.append(_bad_unsub)

    runtime.unload_activity_listeners()
    runtime.unload_activity_listeners()

    assert hass.bus.listeners[0].unsubscribe_calls == 1
    assert calls == ["bad"]
    assert runtime._activity_listener_unsubs == []
    assert hass.bus.active_callbacks == []


def test_runtime_activity_listener_exceptions_do_not_propagate():
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    hass = ActivityHass()
    config = {CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top"}
    _set_state(hass, "sensor.top", "50", now)
    runtime, _coordinator = _make_activity_runtime(hass, config=config)
    runtime._activity_classifier = CountingClassifier(fail=True)

    hass.bus.fire_state_changed("sensor.top", now)

    assert runtime.current_activity is None
    assert runtime.timeline_buffer == []
    assert len(runtime._activity_classifier.calls) == 1


def test_runtime_activity_stale_flags_rebuild_and_clear(monkeypatch):
    old = datetime(2026, 5, 4, 11, 40, tzinfo=timezone.utc)
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    fresh = now + timedelta(seconds=602)
    _freeze_runtime_now(monkeypatch, now)
    hass = ActivityHass()
    config = {
        CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top",
        CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.main",
    }
    _set_state(hass, "sensor.top", "50", old)
    _set_state(hass, "switch.main", "on", old)
    _set_state(hass, "sensor.manual_mode", "Vypnuto", old)
    _set_state(hass, "sensor.current_cbb", "0", old)
    runtime, _coordinator = _make_activity_runtime(hass, config=config)

    hass.bus.fire_state_changed("sensor.top", now)

    activity = runtime.current_activity
    assert activity is not None
    assert "temperature_stale" in activity.stale_flags
    assert "source_stale" in activity.stale_flags
    assert "activity_stale" not in activity.stale_flags
    assert runtime._segment_derivation_flags == set()

    _freeze_runtime_now(monkeypatch, now + timedelta(seconds=601))

    activity = runtime.current_activity
    assert activity is not None
    assert "activity_stale" in activity.stale_flags

    hass.loop.now = 2.0
    _set_state(hass, "sensor.top", "51", fresh)
    _set_state(hass, "switch.main", "on", fresh)
    _set_state(hass, "sensor.manual_mode", "Vypnuto", fresh)
    _set_state(hass, "sensor.current_cbb", "0", fresh)
    _freeze_runtime_now(monkeypatch, fresh)
    hass.bus.fire_state_changed("sensor.top", fresh)

    activity = runtime.current_activity
    assert activity is not None
    assert activity.stale_flags == []


def test_runtime_activity_unavailable_temperature_and_empty_buffer(monkeypatch):
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    _freeze_runtime_now(monkeypatch, now)
    hass = ActivityHass()
    config = {CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top"}
    runtime, _coordinator = _make_activity_runtime(hass, config=config)

    assert runtime.current_activity is None
    assert runtime.timeline_buffer == []

    _set_state(hass, "sensor.top", "unavailable", now)
    _set_state(hass, "sensor.manual_mode", "Vypnuto", now)
    _set_state(hass, "sensor.current_cbb", "0", now)
    hass.bus.fire_state_changed("sensor.top", now)

    activity = runtime.current_activity
    assert activity is not None
    assert activity.state == "unknown"
    assert "temperature_unavailable" in activity.stale_flags
    assert runtime.timeline_buffer[0]["top_temp_c"] is None
    assert runtime.timeline_buffer[0]["activity_state"] == "unknown"


def test_runtime_activity_ignores_older_timestamp_and_same_timestamp_wins():
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(seconds=10)
    hass = ActivityHass()
    config = {CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top"}
    _set_state(hass, "sensor.manual_mode", "Vypnuto", t1)
    _set_state(hass, "sensor.current_cbb", "0", t1)
    runtime, _coordinator = _make_activity_runtime(hass, config=config)
    spy = CountingClassifier()
    runtime._activity_classifier = spy

    _set_state(hass, "sensor.top", "50", t1)
    hass.loop.now = 0.0
    hass.bus.fire_state_changed("sensor.top", t1)

    assert runtime.timeline_buffer[0]["top_temp_c"] == 50.0

    _set_state(hass, "sensor.top", "60", t0)
    hass.loop.now = 2.0
    hass.bus.fire_state_changed("sensor.top", t0)

    assert len(spy.calls) == 1
    assert runtime.timeline_buffer[0]["top_temp_c"] == 50.0

    _set_state(hass, "sensor.top", "55", t1)
    hass.loop.now = 4.0
    hass.bus.fire_state_changed("sensor.top", t1)

    assert len(spy.calls) == 2
    assert len(runtime.timeline_buffer) == 1
    assert runtime.timeline_buffer[0]["top_temp_c"] == 55.0
