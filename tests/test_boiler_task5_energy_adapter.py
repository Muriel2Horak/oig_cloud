"""Task 5 tests: explicit boiler energy input adapter boundary."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.const import CONF_BOILER_SPOT_PRICE_SENSOR, DOMAIN
from custom_components.oig_cloud.boiler.models import BoilerPlan, BoilerProfile
from custom_components.oig_cloud.boiler.planner_contract import PlannerReasonCode


FIXED_NOW = datetime(2026, 4, 25, 12, 7, tzinfo=timezone.utc)


class DummyStates:
    def __init__(self, states=None):
        self._states = states or {}

    def get(self, entity_id):
        return self._states.get(entity_id)


class DummyHass:
    def __init__(self, states=None, data=None):
        self.states = DummyStates(states)
        self.data = data or {}


class DummyReadModel:
    def __init__(self, profile=None, plan=None):
        self.profile = profile or BoilerProfile(category="workday_winter")
        self.plan = plan

    def get_current_profile(self):
        return self.profile

    def get_current_plan(self):
        return self.plan

    async def async_ensure_profile(self):
        return self.profile


class DummyActuator:
    async def async_apply_plan(self, **_kwargs):
        return None

    async def async_cancel_plan(self, *_args, **_kwargs):
        return None


class TrackingPlanner:
    def __init__(self):
        self.calls = []

    async def async_create_plan(
        self,
        profile=None,
        spot_prices=None,
        overflow_windows=None,
        deadline_time=None,
        planner_input=None,
    ):
        self.calls.append(
            (profile, spot_prices, overflow_windows, deadline_time, planner_input)
        )
        raise AssertionError("runtime must use plan_comfort_core directly")


def _slot_start(now: datetime = FIXED_NOW) -> datetime:
    return now.replace(
        minute=(now.minute // 15) * 15,
        second=0,
        microsecond=0,
    )


def _fresh_prices(now: datetime = FIXED_NOW) -> dict[datetime, float]:
    slot0 = _slot_start(now)
    return {
        slot0: 1.0,
        slot0 + timedelta(minutes=15): 2.0,
        slot0 + timedelta(minutes=30): 3.0,
    }


def _fresh_overflow(now: datetime = FIXED_NOW) -> list[tuple[datetime, datetime]]:
    slot0 = _slot_start(now)
    return [(slot0, slot0 + timedelta(minutes=45))]


def _make_runtime(energy_adapter, profile=None, plan=None):
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime

    planner = TrackingPlanner()
    runtime = BoilerRuntime(
        hass=DummyHass(),
        read_model=DummyReadModel(profile=profile, plan=plan),
        planner=planner,
        actuator=DummyActuator(),
        energy_adapter=energy_adapter,
        coordinator=SimpleNamespace(config={}),
        box_id="box_1",
        entry_id="entry_1",
    )
    return runtime, planner


async def _built_planner_input(runtime):
    planner_input = await runtime._async_build_planner_input(now=FIXED_NOW)
    assert planner_input is not None
    return planner_input


class TrackingEnergyAdapter:
    def __init__(self, energy_input):
        self.energy_input = energy_input
        self.calls = 0

    async def async_get_energy_input(self):
        self.calls += 1
        return self.energy_input


@pytest.mark.asyncio
async def test_runtime_calls_single_energy_input_adapter_output_once(monkeypatch):
    from custom_components.oig_cloud.boiler import runtime as runtime_mod
    from custom_components.oig_cloud.boiler.runtime import BoilerEnergyInput

    monkeypatch.setattr(runtime_mod.dt_util, "now", lambda: FIXED_NOW)
    energy_input = BoilerEnergyInput(
        spot_prices=_fresh_prices(),
        overflow_windows=_fresh_overflow(),
        reason_codes=[PlannerReasonCode.INPUT_STALE_PV],
    )
    adapter = TrackingEnergyAdapter(energy_input)
    runtime, planner = _make_runtime(adapter)

    planner_input = await _built_planner_input(runtime)

    assert adapter.calls == 1
    assert planner.calls == []
    assert planner_input.spot_prices == energy_input.spot_prices
    assert planner_input.overflow_windows == energy_input.overflow_windows
    assert PlannerReasonCode.INPUT_STALE_PV in planner_input.reason_codes


@pytest.mark.asyncio
async def test_runtime_skips_adapter_when_existing_plan_is_valid(monkeypatch):
    from custom_components.oig_cloud.boiler import runtime as runtime_mod
    from custom_components.oig_cloud.boiler.runtime import BoilerEnergyInput

    monkeypatch.setattr(runtime_mod.dt_util, "now", lambda: FIXED_NOW)
    current_plan = BoilerPlan(
        created_at=FIXED_NOW,
        valid_until=FIXED_NOW + timedelta(hours=1),
        slots=[],
    )
    adapter = TrackingEnergyAdapter(BoilerEnergyInput())
    runtime, planner = _make_runtime(adapter, plan=current_plan)

    plan = await runtime.async_create_plan(force=False)

    assert plan is current_plan
    assert adapter.calls == 0
    assert planner.calls == []


@pytest.mark.asyncio
async def test_runtime_appends_validate_freshness_reasons(monkeypatch):
    from custom_components.oig_cloud.boiler import runtime as runtime_mod
    from custom_components.oig_cloud.boiler.runtime import BoilerEnergyInput

    monkeypatch.setattr(runtime_mod.dt_util, "now", lambda: FIXED_NOW)
    adapter = TrackingEnergyAdapter(
        BoilerEnergyInput(spot_prices={}, overflow_windows=[])
    )
    runtime, planner = _make_runtime(adapter)

    await runtime.async_create_plan(force=True)

    assert planner.calls == []
    assert runtime.last_plan_result is not None
    assert PlannerReasonCode.INPUT_STALE_PRICE in runtime.last_plan_result.reason_codes
    assert PlannerReasonCode.INPUT_STALE_PV in runtime.last_plan_result.reason_codes


@pytest.mark.asyncio
async def test_runtime_bootstrap_profile_adds_missing_recorder_reason(monkeypatch):
    from custom_components.oig_cloud.boiler import runtime as runtime_mod
    from custom_components.oig_cloud.boiler.runtime import BoilerEnergyInput

    monkeypatch.setattr(runtime_mod.dt_util, "now", lambda: FIXED_NOW)
    profile = BoilerProfile(category="bootstrap")
    adapter = TrackingEnergyAdapter(
        BoilerEnergyInput(
            spot_prices=_fresh_prices(),
            overflow_windows=_fresh_overflow(),
        )
    )
    runtime, planner = _make_runtime(adapter, profile=profile)

    await runtime.async_create_plan(force=True)

    assert planner.calls == []
    assert runtime.last_plan_result is not None
    assert PlannerReasonCode.INPUT_MISSING_RECORDER in runtime.last_plan_result.reason_codes
    assert PlannerReasonCode.BOOTSTRAP_PROFILE in runtime.last_plan_result.reason_codes


@pytest.mark.asyncio
async def test_runtime_adapter_exception_converts_to_fallback_input(monkeypatch):
    from custom_components.oig_cloud.boiler import runtime as runtime_mod

    class ExplodingAdapter:
        async def async_get_energy_input(self):
            raise RuntimeError("boom")

    monkeypatch.setattr(runtime_mod.dt_util, "now", lambda: FIXED_NOW)
    runtime, planner = _make_runtime(ExplodingAdapter())

    plan = await runtime.async_create_plan(force=True)

    assert plan is not None
    assert planner.calls == []
    assert runtime.last_plan_result is not None
    assert PlannerReasonCode.INPUT_ADAPTER_ERROR in runtime.last_plan_result.reason_codes
    assert PlannerReasonCode.INPUT_STALE_PRICE in runtime.last_plan_result.reason_codes
    assert PlannerReasonCode.INPUT_STALE_PV in runtime.last_plan_result.reason_codes


@pytest.mark.asyncio
async def test_adapter_missing_price_and_pv_returns_degraded_reasons():
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter

    hass = DummyHass(data={DOMAIN: {"entry_1": {}}})
    coordinator = SimpleNamespace(config={}, hass=hass)
    adapter = _CoordinatorEnergyInputAdapter(
        coordinator,
        entry_id="entry_1",
        box_id="box_1",
    )

    energy_input = await adapter.async_get_energy_input()

    assert energy_input.spot_prices == {}
    assert energy_input.overflow_windows == []
    assert PlannerReasonCode.INPUT_STALE_PRICE in energy_input.reason_codes
    assert PlannerReasonCode.INPUT_STALE_PV in energy_input.reason_codes


@pytest.mark.asyncio
async def test_adapter_absent_battery_forecast_returns_non_pv_fallback():
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter

    prices = [
        {"datetime": dt.isoformat(), "price": price}
        for dt, price in _fresh_prices().items()
    ]
    hass = DummyHass(
        states={"sensor.spot": SimpleNamespace(attributes={"prices": prices})},
        data={DOMAIN: {"entry_1": {}}},
    )
    coordinator = SimpleNamespace(
        config={CONF_BOILER_SPOT_PRICE_SENSOR: "sensor.spot"},
        hass=hass,
    )
    adapter = _CoordinatorEnergyInputAdapter(
        coordinator,
        entry_id="entry_1",
        box_id="box_1",
    )

    energy_input = await adapter.async_get_energy_input()

    assert len(energy_input.spot_prices) == 3
    assert energy_input.overflow_windows == []
    assert PlannerReasonCode.INPUT_STALE_PV in energy_input.reason_codes
    assert PlannerReasonCode.INPUT_STALE_PRICE not in energy_input.reason_codes


@pytest.mark.asyncio
async def test_adapter_uses_entry_scoped_battery_forecast_only():
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter

    target_start = _slot_start()
    other_start = target_start + timedelta(hours=1)
    target_window = {
        "start": target_start.isoformat(),
        "end": (target_start + timedelta(minutes=45)).isoformat(),
        "soc": 100.0,
    }
    other_window = {
        "start": other_start.isoformat(),
        "end": (other_start + timedelta(minutes=45)).isoformat(),
        "soc": 100.0,
    }
    hass = DummyHass(
        data={
            DOMAIN: {
                "entry_other": {
                    "coordinator": SimpleNamespace(
                        battery_forecast_data={"overflow_windows": [other_window]}
                    )
                },
                "entry_target": {
                    "coordinator": SimpleNamespace(
                        battery_forecast_data={
                            "overflow_windows": [target_window],
                            "timeline_data": [{"must": "not_cross"}],
                            "mode_recommendations": ["internal"],
                            "decision_trace": ["internal"],
                            "planner_decision_trace": ["internal"],
                        }
                    )
                },
            }
        }
    )
    coordinator = SimpleNamespace(config={}, hass=hass)
    adapter = _CoordinatorEnergyInputAdapter(
        coordinator,
        entry_id="entry_target",
        box_id="box_1",
    )

    energy_input = await adapter.async_get_energy_input()

    assert energy_input.overflow_windows == [
        (target_start, target_start + timedelta(minutes=45))
    ]
    assert not hasattr(energy_input, "timeline_data")
    assert not hasattr(energy_input, "mode_recommendations")
    assert not hasattr(energy_input, "decision_trace")
    assert not hasattr(energy_input, "planner_decision_trace")


def test_runtime_source_has_no_global_battery_forecast_lookup():
    source = Path("custom_components/oig_cloud/boiler/runtime.py").read_text()

    assert "battery_forecast_coordinator" not in source
    assert 'hass.data.get("oig_cloud", {}).get' not in source
    assert "timeline_data" not in source
    assert "mode_recommendations" not in source
    assert "decision_trace" not in source
    assert "planner_decision_trace" not in source
