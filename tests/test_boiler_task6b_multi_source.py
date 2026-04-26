"""Task 6b tests: multi-source scoring and runtime replan mechanics."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.boiler.models import (
    BoilerProfile,
    BoilerThermalTopology,
    EnergySource,
)
from custom_components.oig_cloud.boiler.planner_contract import (
    AlternativeSourceCapability,
    PlannerInput,
    PlannerReasonCode,
)


FIXED_NOW = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)


def _profile() -> BoilerProfile:
    return BoilerProfile(
        category="workday_winter",
        hourly_avg={hour: 0.0 for hour in range(24)},
        confidence={hour: 1.0 for hour in range(24)},
    )


def _topology(
    *,
    target_temp_c: float = 50.0,
    heater_power_kw: float = 4.0,
) -> BoilerThermalTopology:
    return BoilerThermalTopology(
        stratification_mode="two_zone",
        thermometer_placements=["top"],
        temperature_topology="top_only",
        tank_volume_l=100.0,
        target_temp_c=target_temp_c,
        cold_inlet_temp_c=10.0,
        heater_power_kw=heater_power_kw,
        standing_loss_coefficient=0.0,
    )


def _slot(offset: int) -> datetime:
    return FIXED_NOW + timedelta(minutes=15 * offset)


def _surplus_window(offset: int, surplus_kwh: float):
    start = _slot(offset)
    return start, start + timedelta(minutes=15), surplus_kwh


def _planner_input(
    *,
    top_temp: float = 45.0,
    deadline_time: str = "01:00",
    spot_prices: dict[datetime, float] | None = None,
    overflow_windows: list | None = None,
    alt_source_capability: AlternativeSourceCapability = AlternativeSourceCapability.DISABLED,
    alt_cost_kwh: float = 0.0,
    reason_codes: list[PlannerReasonCode] | None = None,
) -> PlannerInput:
    return PlannerInput(
        entry_id="entry_task6b",
        box_id="box_task6b",
        profile=_profile(),
        spot_prices=spot_prices or {},
        overflow_windows=overflow_windows or [],
        deadline_time=deadline_time,
        topology=_topology(),
        current_top_temp_c=top_temp,
        current_bottom_temp_c=None,
        temperature_updated_at=FIXED_NOW,
        alt_source_capability=alt_source_capability,
        alt_cost_kwh=alt_cost_kwh,
        reason_codes=reason_codes or [],
    )


def _heated_slots(result):
    return [slot for slot in result.slots if slot.action == "heat"]


def test_pv_surplus_is_allocated_per_slot_and_residual_is_grid_scored():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    spot_prices = {
        _slot(0): 1.0,
        _slot(1): 9.0,
        _slot(2): 2.0,
        _slot(3): 10.0,
    }
    planner_input = _planner_input(
        top_temp=30.0,
        spot_prices=spot_prices,
        overflow_windows=[
            _surplus_window(1, 1.5),
            _surplus_window(2, 0.4),
        ],
    )

    result = plan_comfort_core(planner_input, now=FIXED_NOW)
    heated = _heated_slots(result)

    assert result.comfort_satisfied is True
    assert [slot.start for slot in heated] == [_slot(0), _slot(1), _slot(2)]
    assert heated[1].source == EnergySource.FVE
    assert heated[1].pv_kwh == pytest.approx(1.0)
    assert heated[1].grid_kwh == pytest.approx(0.0)
    assert heated[2].pv_kwh == pytest.approx(0.4)
    assert heated[2].grid_kwh == pytest.approx(0.6)
    assert result.pv_kwh == pytest.approx(1.4)
    assert result.grid_kwh == pytest.approx(1.6)
    assert result.estimated_cost_czk == pytest.approx(2.2)
    assert PlannerReasonCode.SOURCE_SELECTED_PV in result.reason_codes
    assert result.explanation["source_model"] == "multi_source_scoring"


def test_benchmark_only_alternative_recommends_without_actuating():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    result = plan_comfort_core(
        _planner_input(
            spot_prices={_slot(i): 5.0 for i in range(4)},
            alt_source_capability=AlternativeSourceCapability.BENCHMARK_ONLY,
            alt_cost_kwh=2.0,
        ),
        now=FIXED_NOW,
    )

    assert result.comfort_satisfied is True
    assert result.selected_source == EnergySource.ALTERNATIVE
    assert result.actuated_source == EnergySource.GRID
    assert result.alt_kwh == pytest.approx(0.0)
    assert result.grid_kwh > 0.0
    assert PlannerReasonCode.SOURCE_SELECTED_ALTERNATIVE in result.reason_codes
    assert PlannerReasonCode.SOURCE_BENCHMARK_ONLY in result.reason_codes
    assert result.explanation["alternative_source"]["mode"] == "benchmark_only"


def test_controllable_alternative_actuates_when_cheaper_than_grid():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    result = plan_comfort_core(
        _planner_input(
            spot_prices={_slot(i): 5.0 for i in range(4)},
            alt_source_capability=AlternativeSourceCapability.CONTROLLABLE,
            alt_cost_kwh=2.0,
        ),
        now=FIXED_NOW,
    )

    heated = _heated_slots(result)

    assert result.comfort_satisfied is True
    assert result.selected_source == EnergySource.ALTERNATIVE
    assert result.actuated_source == EnergySource.ALTERNATIVE
    assert all(slot.source == EnergySource.ALTERNATIVE for slot in heated)
    assert result.alt_kwh > 0.0
    assert result.grid_kwh == pytest.approx(0.0)
    assert result.estimated_cost_czk == pytest.approx(result.alt_kwh * 2.0)
    assert PlannerReasonCode.SOURCE_SELECTED_ALTERNATIVE in result.reason_codes


def test_plan_result_adapter_maps_heating_and_source_for_actuator_windows():
    from custom_components.oig_cloud.boiler.actuator import _build_heating_windows
    from custom_components.oig_cloud.boiler.planner import plan_result_to_boiler_plan
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    planner_input = _planner_input(
        spot_prices={_slot(i): 5.0 for i in range(4)},
        alt_source_capability=AlternativeSourceCapability.CONTROLLABLE,
        alt_cost_kwh=2.0,
    )
    result = plan_comfort_core(planner_input, now=FIXED_NOW)

    plan = plan_result_to_boiler_plan(result, planner_input=planner_input)
    heated_slots = [slot for slot in plan.slots if slot.avg_consumption_kwh > 0.0]
    windows = _build_heating_windows(plan.slots, has_alt_config=True)

    assert heated_slots
    assert all(slot.recommended_source == EnergySource.ALTERNATIVE for slot in heated_slots)
    assert plan.total_consumption_kwh == pytest.approx(
        sum(slot.heating_kwh for slot in result.slots)
    )
    assert windows["alt"]
    assert windows["main"] == []


def test_partial_pv_horizon_is_used_only_where_covered_and_marked_degraded():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    result = plan_comfort_core(
        _planner_input(
            top_temp=45.0,
            overflow_windows=[_surplus_window(0, 1.0)],
            reason_codes=[PlannerReasonCode.INPUT_STALE_PV],
        ),
        now=FIXED_NOW,
    )
    heated = _heated_slots(result)

    assert result.comfort_satisfied is True
    assert result.degraded is True
    assert PlannerReasonCode.INPUT_STALE_PV in result.reason_codes
    assert heated[0].start == FIXED_NOW
    assert heated[0].pv_kwh == pytest.approx(heated[0].heating_kwh)
    assert result.pv_kwh == pytest.approx(heated[0].heating_kwh)


def test_all_stale_optimization_inputs_keep_comfort_safe_latest_fallback():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    result = plan_comfort_core(
        _planner_input(
            top_temp=45.0,
            spot_prices={},
            overflow_windows=[],
            reason_codes=[
                PlannerReasonCode.INPUT_STALE_PRICE,
                PlannerReasonCode.INPUT_STALE_PV,
            ],
        ),
        now=FIXED_NOW,
    )
    heated = _heated_slots(result)

    assert result.comfort_satisfied is True
    assert result.degraded is True
    assert result.selected_source == EnergySource.GRID
    assert result.pv_kwh == pytest.approx(0.0)
    assert result.grid_kwh == pytest.approx(sum(slot.heating_kwh for slot in heated))
    assert heated[-1].end == result.deadline
    assert PlannerReasonCode.INPUT_STALE_PRICE in result.reason_codes
    assert PlannerReasonCode.INPUT_STALE_PV in result.reason_codes
    assert result.explanation["fallback"] == "stale_optimization_inputs"


class _States:
    def __init__(self, mapping):
        self._mapping = mapping

    def get(self, entity_id):
        return self._mapping.get(entity_id)


class _ReadModel:
    def get_current_profile(self):
        return _profile()

    def get_current_plan(self):
        return None

    async def async_ensure_profile(self):
        return _profile()


class _Actuator:
    async def async_apply_plan(self, **_kwargs):
        return None

    async def async_cancel_plan(self, *_args, **_kwargs):
        return None


class _LegacyPlannerShouldNotRun:
    async def async_create_plan(self, **_kwargs):
        raise AssertionError("Task 6b replan must call planner_core directly")


class _TrackingEnergyAdapter:
    def __init__(self):
        self.calls = 0

    async def async_get_energy_input(self):
        from custom_components.oig_cloud.boiler.runtime import BoilerEnergyInput

        self.calls += 1
        return BoilerEnergyInput(
            spot_prices={_slot(i): 1.0 for i in range(4)},
            overflow_windows=[],
        )


def _runtime_for_replan(now: datetime = FIXED_NOW):
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime
    from custom_components.oig_cloud.const import (
        CONF_BOILER_DEADLINE_TIME,
        CONF_BOILER_TARGET_TEMP_C,
        CONF_BOILER_TEMP_SENSOR_TOP,
        CONF_BOILER_VOLUME_L,
    )

    top_state = SimpleNamespace(state="45.0", last_updated=now)
    hass = SimpleNamespace(states=_States({"sensor.top": top_state}), data={})
    energy_adapter = _TrackingEnergyAdapter()
    runtime = BoilerRuntime(
        hass=hass,
        read_model=_ReadModel(),
        planner=_LegacyPlannerShouldNotRun(),
        actuator=_Actuator(),
        energy_adapter=energy_adapter,
        coordinator=SimpleNamespace(
            config={
                CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top",
                CONF_BOILER_DEADLINE_TIME: "01:00",
                CONF_BOILER_VOLUME_L: 100.0,
                CONF_BOILER_TARGET_TEMP_C: 50.0,
                "boiler_heater_power_kw": 4.0,
            }
        ),
        box_id="box_task6b",
        entry_id="entry_task6b",
    )
    return runtime, energy_adapter


@pytest.mark.asyncio
async def test_runtime_replan_accepts_required_triggers_and_hands_off_plan_result():
    from custom_components.oig_cloud.boiler.planner_core import PlanResult

    runtime, energy_adapter = _runtime_for_replan()
    triggers = [
        ("slot_boundary", {}, FIXED_NOW),
        ("price_update", {}, FIXED_NOW + timedelta(seconds=61)),
        ("pv_update", {}, FIXED_NOW + timedelta(seconds=122)),
        ("temperature_update", {"temperature_c": 45.0}, FIXED_NOW + timedelta(seconds=183)),
        ("temperature_update", {"temperature_c": 45.5}, FIXED_NOW + timedelta(seconds=244)),
        ("override_expiry", {}, FIXED_NOW + timedelta(seconds=245)),
        ("restart_restore", {}, FIXED_NOW + timedelta(seconds=246)),
    ]

    results = []
    for trigger, kwargs, now in triggers:
        results.append(await runtime.async_request_replan(trigger, now=now, **kwargs))

    assert all(isinstance(result, PlanResult) for result in results)
    assert energy_adapter.calls == len(triggers)
    assert len(runtime.plan_result_handoff) == len(triggers)
    assert runtime.plan_result_handoff == results
    assert runtime.last_plan_result is results[-1]
    current_plan = runtime.get_current_plan()
    assert current_plan is not None
    assert current_plan.total_consumption_kwh == pytest.approx(
        sum(slot.heating_kwh for slot in results[-1].slots)
    )
    assert any(slot.avg_consumption_kwh > 0.0 for slot in current_plan.slots)
    assert PlannerReasonCode.OVERRIDE_EXPIRED in results[-2].reason_codes


@pytest.mark.asyncio
async def test_runtime_replan_coalesces_inside_cooldown_and_forced_bypasses():
    runtime, energy_adapter = _runtime_for_replan()

    first = await runtime.async_request_replan("slot_boundary", now=FIXED_NOW)
    coalesced = await runtime.async_request_replan(
        "price_update",
        now=FIXED_NOW + timedelta(seconds=30),
    )

    assert coalesced is first
    assert energy_adapter.calls == 1
    assert len(runtime.plan_result_handoff) == 1
    assert PlannerReasonCode.REPLAN_COALESCED in first.reason_codes

    forced = await runtime.async_request_replan(
        "override_expiry",
        now=FIXED_NOW + timedelta(seconds=31),
    )

    assert forced is not first
    assert energy_adapter.calls == 2
    assert len(runtime.plan_result_handoff) == 2
    assert PlannerReasonCode.OVERRIDE_EXPIRED in forced.reason_codes
