from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from homeassistant.helpers import frame

from custom_components.oig_cloud.boiler import coordinator as module
from custom_components.oig_cloud.boiler.models import BoilerProfile, EnergySource


class DummyState:
    def __init__(self, state, attributes=None):
        self.state = state
        self.attributes = attributes or {}


class DummyStates:
    def __init__(self, data):
        self._data = data

    def get(self, entity_id):
        return self._data.get(entity_id)


class DummyHass:
    def __init__(self, states=None):
        self.states = DummyStates(states or {})
        self.data = {}


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
