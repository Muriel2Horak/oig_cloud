"""Task 2 boundary tests — explicit internal interface boundaries for boiler domain."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import asyncio
import re

import pytest

from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES
from custom_components.oig_cloud.boiler.models import BoilerPlan, BoilerProfile, BoilerSlot, EnergySource


class DummyPlanner:
    def __init__(self):
        self.create_calls = []

    async def async_create_plan(self, profile, spot_prices, overflow_windows, deadline_time, planner_input=None):
        self.create_calls.append((profile, spot_prices, overflow_windows, deadline_time))
        return BoilerPlan(
            created_at=datetime.now(timezone.utc),
            valid_until=datetime.now(timezone.utc) + timedelta(days=1),
            slots=[],
        )

    async def async_get_overflow_windows(self, battery_forecast_data):
        return []


class DummyActuator:
    def __init__(self):
        self.applied = []
        self.cancelled = []

    async def async_apply_plan(self, plan, profile, config, box_id, entry_id):
        self.applied.append((plan, profile, config, box_id, entry_id))

    async def async_cancel_plan(self, entry_id, clear_plan=False):
        self.cancelled.append((entry_id, clear_plan))


class DummyReadModel:
    def __init__(self, profile=None, plan=None):
        self._profile = profile
        self._plan = plan

    def get_current_profile(self):
        return self._profile

    def get_current_plan(self):
        return self._plan

    async def async_ensure_profile(self):
        return self._profile


class DummyEnergyAdapter:
    def __init__(self, prices=None, overflow=None):
        self._prices = prices or {}
        self._overflow = overflow or []
        self.calls = 0

    async def get_spot_prices(self):
        return self._prices

    async def get_overflow_windows(self):
        return self._overflow

    async def async_get_energy_input(self):
        from custom_components.oig_cloud.boiler.runtime import BoilerEnergyInput

        self.calls += 1
        return BoilerEnergyInput(
            spot_prices=self._prices,
            overflow_windows=self._overflow,
        )


def _make_dummy_coordinator():
    return SimpleNamespace(
        planner=DummyPlanner(),
        data={},
        config={"box_id": "123"},
        box_id="123",
        async_request_refresh=lambda: asyncio.sleep(0),
        hass=SimpleNamespace(states=SimpleNamespace(get=lambda _eid: None), data={}),
    )


def test_runtime_module_exports_interfaces():
    from custom_components.oig_cloud.boiler import runtime as runtime_mod

    assert hasattr(runtime_mod, "BoilerRuntime")
    assert hasattr(runtime_mod, "IBoilerReadModel")
    assert hasattr(runtime_mod, "IBoilerPlanner")
    assert hasattr(runtime_mod, "IBoilerActuator")
    assert hasattr(runtime_mod, "IBoilerEnergyInputAdapter")
    assert hasattr(runtime_mod, "create_boiler_runtime")
    assert hasattr(runtime_mod, "get_boiler_runtime")
    assert hasattr(runtime_mod, "destroy_boiler_runtime")


def test_actuator_module_exports():
    from custom_components.oig_cloud.boiler import actuator as actuator_mod

    assert hasattr(actuator_mod, "BoilerActuator")


def test_runtime_storage_exact_key():
    from custom_components.oig_cloud.boiler.runtime import (
        create_boiler_runtime,
        destroy_boiler_runtime,
        get_boiler_runtime,
    )

    hass = SimpleNamespace(data={})
    coordinator = _make_dummy_coordinator()

    runtime = create_boiler_runtime(hass, coordinator, "entry1", "123")

    assert DOMAIN in hass.data
    assert "entry1" in hass.data[DOMAIN]
    assert KEY_BOILER_RUNTIMES in hass.data[DOMAIN]["entry1"]
    assert "123" in hass.data[DOMAIN]["entry1"][KEY_BOILER_RUNTIMES]
    assert hass.data[DOMAIN]["entry1"][KEY_BOILER_RUNTIMES]["123"] is runtime

    looked_up = get_boiler_runtime(hass, "entry1", "123")
    assert looked_up is runtime

    destroy_boiler_runtime(hass, "entry1", "123")
    assert get_boiler_runtime(hass, "entry1", "123") is None


def test_runtime_storage_isolated_per_box_id():
    from custom_components.oig_cloud.boiler.runtime import create_boiler_runtime, get_boiler_runtime

    hass = SimpleNamespace(data={})
    coord1 = _make_dummy_coordinator()
    coord2 = _make_dummy_coordinator()

    rt1 = create_boiler_runtime(hass, coord1, "entry1", "123")
    rt2 = create_boiler_runtime(hass, coord2, "entry1", "456")

    assert get_boiler_runtime(hass, "entry1", "123") is rt1
    assert get_boiler_runtime(hass, "entry1", "456") is rt2


def test_runtime_delegates_to_read_model():
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime

    profile = BoilerProfile(category="workday_winter")
    plan = BoilerPlan(
        created_at=datetime.now(timezone.utc),
        valid_until=datetime.now(timezone.utc) + timedelta(days=1),
    )

    read_model = DummyReadModel(profile=profile, plan=plan)
    runtime = BoilerRuntime(
        hass=SimpleNamespace(),
        read_model=read_model,
        planner=DummyPlanner(),
        actuator=DummyActuator(),
        energy_adapter=DummyEnergyAdapter(),
        coordinator=_make_dummy_coordinator(),
        box_id="123",
        entry_id="entry1",
    )

    assert runtime.get_current_profile() is profile
    assert runtime.get_current_plan() is plan


@pytest.mark.asyncio
async def test_runtime_async_create_plan_delegates_to_planner_and_energy():
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime

    planner = DummyPlanner()
    energy = DummyEnergyAdapter(prices={"now": 5.0}, overflow=[("a", "b")])
    profile = BoilerProfile(category="workday_winter")
    read_model = DummyReadModel(profile=profile)

    runtime = BoilerRuntime(
        hass=SimpleNamespace(),
        read_model=read_model,
        planner=planner,
        actuator=DummyActuator(),
        energy_adapter=energy,
        coordinator=_make_dummy_coordinator(),
        box_id="123",
        entry_id="entry1",
    )

    plan = await runtime.async_create_plan(force=True)
    assert plan is not None
    assert energy.calls == 1
    assert planner.create_calls == []
    assert runtime.last_plan_result is not None
    assert runtime.last_plan_result.entry_id == "entry1"
    assert runtime.last_plan_result.box_id == "123"
    assert runtime.get_current_plan() is plan


@pytest.mark.asyncio
async def test_runtime_async_apply_plan_delegates_to_actuator():
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime

    actuator = DummyActuator()
    profile = BoilerProfile(category="workday_winter")
    plan = BoilerPlan(
        created_at=datetime.now(timezone.utc),
        valid_until=datetime.now(timezone.utc) + timedelta(days=1),
    )
    read_model = DummyReadModel(profile=profile, plan=plan)
    coordinator = _make_dummy_coordinator()

    runtime = BoilerRuntime(
        hass=SimpleNamespace(),
        read_model=read_model,
        planner=DummyPlanner(),
        actuator=actuator,
        energy_adapter=DummyEnergyAdapter(),
        coordinator=coordinator,
        box_id="123",
        entry_id="entry1",
    )

    await runtime.async_apply_plan("entry1")
    assert len(actuator.applied) == 1
    applied_plan, applied_profile, applied_config, applied_box_id, applied_entry_id = actuator.applied[0]
    assert applied_plan is plan
    assert applied_profile is profile
    assert applied_box_id == "123"
    assert applied_entry_id == "entry1"


@pytest.mark.asyncio
async def test_runtime_async_cancel_plan_delegates_to_actuator():
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime

    actuator = DummyActuator()
    runtime = BoilerRuntime(
        hass=SimpleNamespace(),
        read_model=DummyReadModel(),
        planner=DummyPlanner(),
        actuator=actuator,
        energy_adapter=DummyEnergyAdapter(),
        coordinator=_make_dummy_coordinator(),
        box_id="123",
        entry_id="entry1",
    )

    await runtime.async_cancel_plan("entry1", clear_plan=True)
    assert len(actuator.cancelled) == 1
    assert actuator.cancelled[0] == ("entry1", True)


def test_services_boiler_resolves_runtime():
    from custom_components.oig_cloud.services import boiler as svc
    from custom_components.oig_cloud.boiler.runtime import create_boiler_runtime

    assert hasattr(svc, "_get_boiler_runtime")

    hass = SimpleNamespace(data={})
    coordinator = _make_dummy_coordinator()
    runtime = create_boiler_runtime(hass, coordinator, "entry1", "123")

    looked_up = svc._get_boiler_runtime(hass, "entry1", "123")
    assert looked_up is runtime


@pytest.mark.asyncio
async def test_services_create_plan_through_runtime():
    from custom_components.oig_cloud.services import boiler as svc
    from custom_components.oig_cloud.boiler.runtime import create_boiler_runtime

    hass = SimpleNamespace(data={})
    coordinator = _make_dummy_coordinator()
    runtime = create_boiler_runtime(hass, coordinator, "entry1", "123")

    planner = DummyPlanner()
    runtime.planner = planner

    profile = BoilerProfile(category="workday_winter")
    runtime.read_model = DummyReadModel(profile=profile)

    await svc._create_boiler_plan(hass, runtime, "entry1", force=True, deadline_override=None)
    assert planner.create_calls == []
    assert runtime.last_plan_result is not None
    assert runtime.get_current_plan() is not None


@pytest.mark.asyncio
async def test_services_apply_plan_through_runtime():
    from custom_components.oig_cloud.services import boiler as svc
    from custom_components.oig_cloud.boiler.runtime import create_boiler_runtime

    hass = SimpleNamespace(data={})
    coordinator = _make_dummy_coordinator()
    runtime = create_boiler_runtime(hass, coordinator, "entry1", "123")

    actuator = DummyActuator()
    runtime.actuator = actuator

    profile = BoilerProfile(category="workday_winter", hourly_avg={7: 1.0})
    plan = BoilerPlan(
        created_at=datetime.now(timezone.utc),
        valid_until=datetime.now(timezone.utc) + timedelta(days=1),
        slots=[
            BoilerSlot(
                start=datetime.now(timezone.utc),
                end=datetime.now(timezone.utc) + timedelta(hours=1),
                avg_consumption_kwh=1.0,
                confidence=0.9,
                recommended_source=EnergySource.GRID,
            )
        ],
    )
    runtime.read_model = DummyReadModel(profile=profile, plan=plan)

    await svc._apply_boiler_plan(hass, runtime, "entry1")
    assert len(actuator.applied) == 1


@pytest.mark.asyncio
async def test_services_cancel_plan_through_runtime():
    from custom_components.oig_cloud.services import boiler as svc
    from custom_components.oig_cloud.boiler.runtime import create_boiler_runtime

    hass = SimpleNamespace(data={})
    coordinator = _make_dummy_coordinator()
    runtime = create_boiler_runtime(hass, coordinator, "entry1", "123")

    actuator = DummyActuator()
    runtime.actuator = actuator

    await svc._cancel_boiler_plan(hass, runtime, "entry1", clear_plan=True)
    assert len(actuator.cancelled) == 1
    assert actuator.cancelled[0] == ("entry1", True)


def test_coordinator_does_not_expose_planner_computation_to_services():
    from custom_components.oig_cloud.services import boiler as svc
    import inspect

    sig = inspect.signature(svc._create_boiler_plan)
    params = list(sig.parameters.keys())
    assert any(p in params for p in ("runtime", "coordinator", "runtime_or_coordinator"))


def test_default_read_model_wraps_coordinator():
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorReadModel

    profile = BoilerProfile(category="workday_winter")
    plan = BoilerPlan(
        created_at=datetime.now(timezone.utc),
        valid_until=datetime.now(timezone.utc) + timedelta(days=1),
    )
    coordinator = SimpleNamespace(_current_profile=profile, _current_plan=plan)

    read_model = _CoordinatorReadModel(coordinator)
    assert read_model.get_current_profile() is profile
    assert read_model.get_current_plan() is plan


@pytest.mark.asyncio
async def test_default_planner_wraps_coordinator():
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorPlanner

    planner_double = DummyPlanner()
    coordinator = SimpleNamespace(planner=planner_double)

    wrapper = _CoordinatorPlanner(coordinator)
    profile = BoilerProfile(category="workday_winter")
    result = await wrapper.async_create_plan(profile, {}, [], "06:00")
    assert result is not None
    assert len(planner_double.create_calls) == 1


@pytest.mark.asyncio
async def test_default_energy_adapter_reads_spot_prices_directly():
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter

    spot_state = SimpleNamespace(
        attributes={"prices": [{"datetime": "2025-01-01T00:00:00", "price": 3.0}]}
    )
    hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda eid: spot_state if eid == "sensor.spot" else None),
        data={},
    )
    coordinator = SimpleNamespace(
        config={"boiler_spot_price_sensor": "sensor.spot"},
        hass=hass,
    )

    adapter = _CoordinatorEnergyInputAdapter(coordinator)
    prices = await adapter.get_spot_prices()
    assert 3.0 in prices.values()


@pytest.mark.asyncio
async def test_default_energy_adapter_reads_entry_scoped_overflow_windows():
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter
    from datetime import datetime, timedelta, timezone

    start = datetime(2025, 1, 1, tzinfo=timezone.utc)
    raw_window = {
        "start": start.isoformat(),
        "end": (start + timedelta(hours=1)).isoformat(),
        "soc": 100.0,
    }
    hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda _eid: None),
        data={
            "oig_cloud": {
                "entry1": {
                    "coordinator": SimpleNamespace(
                        battery_forecast_data={"overflow_windows": [raw_window]}
                    )
                }
            }
        },
    )
    coordinator = SimpleNamespace(
        config={},
        hass=hass,
    )

    adapter = _CoordinatorEnergyInputAdapter(coordinator, entry_id="entry1", box_id="123")
    overflow = await adapter.get_overflow_windows()
    assert overflow == [(start, start + timedelta(hours=1))]


def test_init_boiler_runtime_lifecycle_helper_exists():
    from custom_components.oig_cloud import _init_boiler_runtime, _teardown_boiler_runtime

    assert callable(_init_boiler_runtime)
    assert callable(_teardown_boiler_runtime)


@pytest.mark.asyncio
async def test_init_boiler_runtime_creates_and_stores_runtime():
    from custom_components.oig_cloud import _init_boiler_runtime

    hass = SimpleNamespace(data={DOMAIN: {"entry1": {"boiler_coordinator": _make_dummy_coordinator()}}})
    entry = SimpleNamespace(entry_id="entry1", options={"box_id": "123", "enable_boiler": True})

    await _init_boiler_runtime(hass, entry)

    assert KEY_BOILER_RUNTIMES in hass.data[DOMAIN]["entry1"]
    assert "123" in hass.data[DOMAIN]["entry1"][KEY_BOILER_RUNTIMES]
    runtime = hass.data[DOMAIN]["entry1"][KEY_BOILER_RUNTIMES]["123"]
    assert runtime is not None
    assert runtime.box_id == "123"
    assert runtime.entry_id == "entry1"


@pytest.mark.asyncio
async def test_teardown_boiler_runtime_removes_storage():
    from custom_components.oig_cloud import _teardown_boiler_runtime
    from custom_components.oig_cloud.boiler.runtime import create_boiler_runtime, get_boiler_runtime

    hass = SimpleNamespace(data={DOMAIN: {"entry1": {}}})
    coordinator = _make_dummy_coordinator()
    create_boiler_runtime(hass, coordinator, "entry1", "123")

    assert get_boiler_runtime(hass, "entry1", "123") is not None

    entry = SimpleNamespace(entry_id="entry1", options={"box_id": "123", "enable_boiler": True})
    await _teardown_boiler_runtime(hass, entry)

    assert get_boiler_runtime(hass, "entry1", "123") is None


def test_get_boiler_runtime_fallback_to_coordinator():
    from custom_components.oig_cloud.services import boiler as svc

    hass = SimpleNamespace(
        data={DOMAIN: {"entry1": {"boiler_coordinator": _make_dummy_coordinator()}}}
    )

    result = svc._get_boiler_runtime(hass, "entry1", "123")
    assert result is not None


_FORBIDDEN_PATTERNS = [
    r'\._current_profile\b',
    r'\._current_plan\b',
    r'\._update_profile\b',
    r'\._get_spot_prices\b',
    r'\._get_overflow_windows\b',
    r'getattr\([^)]*["\']_current_profile["\']',
    r'getattr\([^)]*["\']_current_plan["\']',
    r'getattr\([^)]*["\']_update_profile["\']',
    r'getattr\([^)]*["\']_get_spot_prices["\']',
    r'getattr\([^)]*["\']_get_overflow_windows["\']',
]


def _read_source(rel_path: str) -> str:
    from pathlib import Path

    root = Path(__file__).parent.parent / "custom_components" / "oig_cloud"
    return (root / rel_path).read_text()


def test_services_boiler_no_direct_coordinator_private_access():
    src = _read_source("services/boiler.py")
    for pattern in _FORBIDDEN_PATTERNS:
        assert not re.search(pattern, src), f"Forbidden pattern {pattern!r} found in services/boiler.py"


def test_api_views_out_of_task2_scope():
    """API views DTO/read-model migration belongs to Task 10; Task 2 does not enforce boundaries on api_views.py."""
    src = _read_source("boiler/api_views.py")
    # api_views.py is allowed to access coordinator private fields until Task 10 migrates it to runtime seams.
    assert "BoilerProfileView" in src
    assert "BoilerPlanView" in src


def test_services_boiler_uses_runtime_interfaces():
    src = _read_source("services/boiler.py")
    assert "get_boiler_runtime" in src
    assert "async_create_plan" in src
    assert "async_apply_plan" in src
    assert "async_cancel_plan" in src


_COORDINATOR_FORBIDDEN_IMPORTS = [
    "validate_temperature_sensor",
    "calculate_energy_to_heat",
    "calculate_stratified_temp",
    "estimate_residual_energy",
]


def test_coordinator_is_thin_adapter():
    src = _read_source("boiler/coordinator.py")
    assert "_ThermalReadModel" in src, "Coordinator must instantiate _ThermalReadModel adapter"
    assert "_EnergyStateAdapter" in src, "Coordinator must instantiate _EnergyStateAdapter adapter"
    for name in _COORDINATOR_FORBIDDEN_IMPORTS:
        assert name not in src, f"Coordinator must not import business logic {name!r}"


def test_coordinator_async_update_data_delegates_to_adapters():
    src = _read_source("boiler/coordinator.py")
    assert "self._thermal_read_model" in src, "Coordinator must delegate thermal reads to adapter"
    assert "self._energy_state_adapter" in src, "Coordinator must delegate energy tracking to adapter"


def test_coordinator_has_no_forbidden_plan_methods():
    src = _read_source("boiler/coordinator.py")
    assert "async def _update_plan" not in src, "Coordinator must not define _update_plan"
    assert "async def _get_spot_prices" not in src, "Coordinator must not define _get_spot_prices"
    assert "async def _get_overflow_windows" not in src, "Coordinator must not define _get_overflow_windows"
    assert "self.planner.async_create_plan(" not in src, "Coordinator must not directly invoke planner.async_create_plan"


def test_coordinator_delegates_plan_creation_to_runtime():
    src = _read_source("boiler/coordinator.py")
    assert "get_boiler_runtime" in src, "Coordinator must look up runtime for plan creation"
    assert "runtime.async_create_plan" in src, "Coordinator must delegate plan creation to runtime"
