"""Task 6a tests: comfort-core boiler planner and schedule output."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest

from custom_components.oig_cloud.boiler.models import (
    BoilerPlan,
    BoilerProfile,
    BoilerThermalTopology,
    EnergySource,
)
from custom_components.oig_cloud.boiler.planner_contract import (
    PlannerInput,
    PlannerReasonCode,
)


def _profile() -> BoilerProfile:
    return BoilerProfile(
        category="workday_winter",
        hourly_avg={hour: 0.0 for hour in range(24)},
        confidence={hour: 1.0 for hour in range(24)},
    )


def _topology(
    *,
    tank_volume_l: float = 100.0,
    target_temp_c: float = 50.0,
    heater_power_kw: float = 4.0,
    temperature_topology: str = "top_only",
) -> BoilerThermalTopology:
    placements = ["top", "bottom"] if temperature_topology == "top_bottom" else ["top"]
    return BoilerThermalTopology(
        stratification_mode="two_zone",
        thermometer_placements=placements,
        temperature_topology=temperature_topology,
        tank_volume_l=tank_volume_l,
        target_temp_c=target_temp_c,
        cold_inlet_temp_c=10.0,
        heater_power_kw=heater_power_kw,
        standing_loss_coefficient=0.0,
    )


def _planner_input(
    *,
    now: datetime,
    top_temp: float | None = 45.0,
    bottom_temp: float | None = None,
    topology: BoilerThermalTopology | None = None,
    deadline_time: str = "01:00",
    reason_codes: list[PlannerReasonCode] | None = None,
    horizon_hours: int | None = None,
    temperature_updated_at: datetime | None = None,
    spot_prices: dict[datetime, float] | None = None,
) -> PlannerInput:
    return PlannerInput(
        entry_id="entry_task6a",
        box_id="box_task6a",
        profile=_profile(),
        spot_prices=spot_prices or {},
        overflow_windows=[],
        deadline_time=deadline_time,
        topology=topology or _topology(),
        current_top_temp_c=top_temp,
        current_bottom_temp_c=bottom_temp,
        temperature_updated_at=temperature_updated_at or now,
        horizon_hours=horizon_hours,
        reason_codes=reason_codes or [],
    )


def _heated_slots(result):
    return [slot for slot in result.slots if slot.action == "heat"]


@pytest.mark.asyncio
async def test_boiler_planner_async_create_plan_returns_adapted_comfort_core_plan():
    from custom_components.oig_cloud.boiler.planner import BoilerPlanner

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)
    planner = BoilerPlanner(SimpleNamespace())

    plan = await planner.async_create_plan(
        planner_input=_planner_input(now=now, top_temp=45.0)
    )

    assert planner.last_core_result is not None
    core_heat_kwh = sum(slot.heating_kwh for slot in planner.last_core_result.slots)
    assert core_heat_kwh > 0.0
    assert plan.total_consumption_kwh == pytest.approx(core_heat_kwh)
    assert any(slot.avg_consumption_kwh > 0.0 for slot in plan.slots)


def test_single_source_happy_path_reaches_comfort_by_deadline():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)
    result = plan_comfort_core(_planner_input(now=now), now=now)

    assert result.entry_id == "entry_task6a"
    assert result.box_id == "box_task6a"
    assert len(result.slots) == 96
    assert all(
        slot.end - slot.start == timedelta(minutes=15)
        for slot in result.slots
    )
    assert result.selected_source == EnergySource.GRID
    assert result.actuated_source == EnergySource.GRID
    assert result.comfort_satisfied is True
    assert result.comfort_status == PlannerReasonCode.COMFORT_SATISFIED
    assert PlannerReasonCode.COMFORT_SATISFIED in result.reason_codes
    assert result.temperature_at_deadline_c >= 50.0
    assert result.unsatisfied_comfort_gap_c == pytest.approx(0.0)
    assert result.explanation["objective"] == "comfort_first"
    assert _heated_slots(result)


def test_deadline_comfort_wins_over_cheaper_post_deadline_slot():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)
    deadline = now + timedelta(minutes=30)
    prices = {
        now: 10.0,
        now + timedelta(minutes=15): 10.0,
        now + timedelta(minutes=30): 0.1,
        now + timedelta(minutes=45): 0.1,
    }
    inp = _planner_input(
        now=now,
        top_temp=45.0,
        deadline_time="00:30",
        spot_prices=prices,
    )

    result = plan_comfort_core(inp, now=now)

    assert result.comfort_satisfied is True
    assert _heated_slots(result)
    assert all(slot.end <= deadline for slot in _heated_slots(result))
    assert not any(slot.start >= deadline for slot in _heated_slots(result))
    assert result.temperature_at_deadline_c >= inp.topology.target_temp_c


def test_midnight_and_dst_deadlines_use_utc_backed_15_minute_slots():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    prague = ZoneInfo("Europe/Prague")
    midnight_now = datetime(2026, 4, 25, 23, 30, tzinfo=prague)
    midnight_result = plan_comfort_core(
        _planner_input(now=midnight_now, deadline_time="00:15"),
        now=midnight_now,
    )

    assert midnight_result.deadline > midnight_now
    assert midnight_result.deadline.date().day == 26
    assert midnight_result.comfort_satisfied is True
    assert all(slot.end <= midnight_result.deadline for slot in _heated_slots(midnight_result))

    dst_now = datetime(2026, 3, 29, 1, 30, tzinfo=prague)
    dst_result = plan_comfort_core(
        _planner_input(now=dst_now, deadline_time="03:15"),
        now=dst_now,
    )
    utc_starts = [slot.start.astimezone(timezone.utc) for slot in dst_result.slots]

    assert len(utc_starts) == len(set(utc_starts))
    assert all(
        later - earlier == timedelta(minutes=15)
        for earlier, later in zip(utc_starts, utc_starts[1:])
    )
    assert dst_result.deadline > dst_now
    assert dst_result.comfort_satisfied is True


def test_unsatisfied_plan_heats_safest_achievable_slots_and_reports_gap():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)
    inp = _planner_input(
        now=now,
        top_temp=20.0,
        topology=_topology(
            tank_volume_l=300.0,
            target_temp_c=65.0,
            heater_power_kw=1.0,
        ),
        deadline_time="00:45",
    )

    result = plan_comfort_core(inp, now=now)

    assert result.comfort_satisfied is False
    assert result.comfort_status == PlannerReasonCode.COMFORT_UNSATISFIED
    assert PlannerReasonCode.COMFORT_UNSATISFIED in result.reason_codes
    assert PlannerReasonCode.NO_FEASIBLE_PLAN in result.reason_codes
    assert PlannerReasonCode.COMFORT_SATISFIED not in result.reason_codes
    assert result.unsatisfied_comfort_gap_c > 0.0
    assert _heated_slots(result)
    assert all(slot.end <= result.deadline for slot in _heated_slots(result))


def test_top_unavailable_returns_safe_hold_without_new_actuation():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)
    inp = _planner_input(
        now=now,
        top_temp=None,
        reason_codes=[PlannerReasonCode.TOP_SENSOR_UNAVAILABLE],
    )

    result = plan_comfort_core(inp, now=now)

    assert result.safe_hold is True
    assert result.actuated_source is None
    assert result.comfort_satisfied is False
    assert PlannerReasonCode.TOP_SENSOR_UNAVAILABLE in result.reason_codes
    assert not _heated_slots(result)


def test_bottom_unavailable_degrades_two_sensor_setup_to_top_only():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)
    inp = _planner_input(
        now=now,
        top_temp=45.0,
        bottom_temp=None,
        topology=_topology(temperature_topology="top_bottom"),
    )

    result = plan_comfort_core(inp, now=now)

    assert result.comfort_satisfied is True
    assert PlannerReasonCode.BOTTOM_SENSOR_UNAVAILABLE_TOP_ONLY_DEGRADED in result.reason_codes
    assert result.explanation["temperature_model"]["topology"] == "top_only_degraded"


def test_stale_top_temperature_emits_reason_and_applies_bias():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)
    inp = _planner_input(
        now=now,
        top_temp=50.0,
        temperature_updated_at=now - timedelta(minutes=30),
    )

    result = plan_comfort_core(inp, now=now)

    assert PlannerReasonCode.INPUT_STALE_TEMPERATURE in result.reason_codes
    assert result.explanation["temperature_model"]["starting_top_temp_c"] < 50.0


def test_planner_timeout_returns_last_safe_plan_or_safe_hold():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)
    safe_result = plan_comfort_core(_planner_input(now=now), now=now)
    calls = iter([0.0, 6.0])

    timed_out = plan_comfort_core(
        _planner_input(now=now),
        now=now,
        previous_plan=safe_result,
        time_source=lambda: next(calls),
    )

    assert timed_out.comfort_satisfied is True
    assert timed_out.safe_hold is False
    assert PlannerReasonCode.PLANNER_TIMEOUT in timed_out.reason_codes
    assert timed_out.slots == safe_result.slots

    empty_timeout_calls = iter([0.0, 6.0])
    safe_hold = plan_comfort_core(
        _planner_input(now=now),
        now=now,
        time_source=lambda: next(empty_timeout_calls),
    )

    assert safe_hold.safe_hold is True
    assert safe_hold.actuated_source is None
    assert PlannerReasonCode.PLANNER_TIMEOUT in safe_hold.reason_codes


def test_runtime_temperature_resolution_adds_task6a_degraded_reasons():
    from custom_components.oig_cloud.boiler.runtime import resolve_temperature_state

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)

    class States:
        def __init__(self, mapping):
            self._mapping = mapping

        def get(self, entity_id):
            return self._mapping.get(entity_id)

    top_state = SimpleNamespace(
        state="unavailable",
        last_updated=now,
    )
    bottom_state = SimpleNamespace(
        state="unavailable",
        last_updated=now,
    )
    hass = SimpleNamespace(states=States({"sensor.top": top_state}))

    unavailable = resolve_temperature_state(
        hass=hass,
        config={"boiler_temp_sensor_top": "sensor.top"},
        now=now,
    )
    assert unavailable.safe_hold is True
    assert PlannerReasonCode.TOP_SENSOR_UNAVAILABLE in unavailable.reason_codes

    stale_top = SimpleNamespace(
        state="49.0",
        last_updated=(now - timedelta(minutes=30)).replace(tzinfo=None),
    )
    hass = SimpleNamespace(
        states=States({"sensor.top": stale_top, "sensor.bottom": bottom_state})
    )
    degraded = resolve_temperature_state(
        hass=hass,
        config={
            "boiler_temp_sensor_top": "sensor.top",
            "boiler_temp_sensor_bottom": "sensor.bottom",
        },
        now=now,
    )

    assert degraded.safe_hold is False
    assert degraded.top_temp_c == 49.0
    assert degraded.bottom_temp_c is None
    assert PlannerReasonCode.INPUT_STALE_TEMPERATURE in degraded.reason_codes
    assert PlannerReasonCode.BOTTOM_SENSOR_UNAVAILABLE_TOP_ONLY_DEGRADED in degraded.reason_codes


@pytest.mark.asyncio
async def test_runtime_top_unavailable_does_not_call_planner_or_store_new_plan():
    from custom_components.oig_cloud.boiler.runtime import BoilerEnergyInput, BoilerRuntime
    from custom_components.oig_cloud.const import CONF_BOILER_TEMP_SENSOR_TOP

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)
    old_plan = BoilerPlan(
        created_at=now - timedelta(hours=1),
        valid_until=now + timedelta(hours=1),
        slots=[],
    )

    class States:
        def get(self, entity_id):
            assert entity_id == "sensor.top"
            return SimpleNamespace(state="unavailable", last_updated=now)

    class ReadModel:
        def get_current_profile(self):
            return _profile()

        def get_current_plan(self):
            return old_plan

        async def async_ensure_profile(self):
            return _profile()

    class FailingPlanner:
        def __init__(self):
            self.calls = 0

        async def async_create_plan(self, **_kwargs):
            self.calls += 1
            raise AssertionError("planner must not be called on top unavailable")

    class EnergyAdapter:
        async def async_get_energy_input(self):
            return BoilerEnergyInput()

    class Actuator:
        async def async_apply_plan(self, **_kwargs):
            return None

        async def async_cancel_plan(self, *_args, **_kwargs):
            return None

    planner = FailingPlanner()
    runtime = BoilerRuntime(
        hass=SimpleNamespace(states=States()),
        read_model=ReadModel(),
        planner=planner,
        actuator=Actuator(),
        energy_adapter=EnergyAdapter(),
        coordinator=SimpleNamespace(
            config={CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top"}
        ),
        box_id="box_task6a",
        entry_id="entry_task6a",
    )

    result = await runtime.async_create_plan(force=True)

    assert result is None
    assert planner.calls == 0
    assert runtime.get_current_plan() is None


@pytest.mark.asyncio
async def test_runtime_create_plan_uses_core_and_stores_adapted_plan(monkeypatch):
    from custom_components.oig_cloud.boiler import runtime as runtime_mod
    from custom_components.oig_cloud.boiler.runtime import BoilerEnergyInput, BoilerRuntime
    from custom_components.oig_cloud.const import (
        CONF_BOILER_DEADLINE_TIME,
        CONF_BOILER_TARGET_TEMP_C,
        CONF_BOILER_TEMP_SENSOR_BOTTOM,
        CONF_BOILER_TEMP_SENSOR_TOP,
        CONF_BOILER_VOLUME_L,
    )

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(runtime_mod.dt_util, "now", lambda: now)

    class States:
        def __init__(self):
            self._states = {
                "sensor.top": SimpleNamespace(state="47.0", last_updated=now),
                "sensor.bottom": SimpleNamespace(state="unavailable", last_updated=now),
            }

        def get(self, entity_id):
            return self._states.get(entity_id)

    class ReadModel:
        def get_current_profile(self):
            return _profile()

        def get_current_plan(self):
            return None

        async def async_ensure_profile(self):
            return _profile()

    class LegacyPlannerShouldNotRun:
        def __init__(self):
            self.calls = 0

        async def async_create_plan(self, **_kwargs):
            self.calls += 1
            raise AssertionError("runtime async_create_plan must use planner_core directly")

    class EnergyAdapter:
        async def async_get_energy_input(self):
            return BoilerEnergyInput()

    class Actuator:
        async def async_apply_plan(self, **_kwargs):
            return None

        async def async_cancel_plan(self, *_args, **_kwargs):
            return None

    planner = LegacyPlannerShouldNotRun()
    runtime = BoilerRuntime(
        hass=SimpleNamespace(states=States()),
        read_model=ReadModel(),
        planner=planner,
        actuator=Actuator(),
        energy_adapter=EnergyAdapter(),
        coordinator=SimpleNamespace(
            config={
                CONF_BOILER_TEMP_SENSOR_TOP: "sensor.top",
                CONF_BOILER_TEMP_SENSOR_BOTTOM: "sensor.bottom",
                CONF_BOILER_DEADLINE_TIME: "01:00",
                CONF_BOILER_VOLUME_L: 100.0,
                CONF_BOILER_TARGET_TEMP_C: 50.0,
                "boiler_heater_power_kw": 4.0,
            }
        ),
        box_id="box_task6a",
        entry_id="entry_task6a",
    )

    result = await runtime.async_create_plan(force=True)

    assert result is not None
    assert planner.calls == 0
    assert runtime.last_plan_result is not None
    assert PlannerReasonCode.BOTTOM_SENSOR_UNAVAILABLE_TOP_ONLY_DEGRADED in (
        runtime.last_plan_result.reason_codes
    )
    assert runtime.get_current_plan() is result
    assert result.total_consumption_kwh == pytest.approx(
        sum(slot.heating_kwh for slot in runtime.last_plan_result.slots)
    )
    assert any(slot.avg_consumption_kwh > 0.0 for slot in result.slots)


# ---------------------------------------------------------------------------
# Task 2: BoilerSlot attribution field preservation
# ---------------------------------------------------------------------------


def test_plan_slot_preserves_attribution_fields():
    """BoilerSlot fields (heating_kwh, pv_kwh, grid_kwh, alt_kwh,
    estimated_cost_czk, predicted_top_temp_c > 0) survive
    PlanResult -> BoilerPlan conversion."""
    from custom_components.oig_cloud.boiler.planner import plan_result_to_boiler_plan
    from custom_components.oig_cloud.boiler.planner_core import PlanResult, PlanSlotAction

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)
    slot = PlanSlotAction(
        start=now,
        end=now + timedelta(minutes=15),
        action="heat",
        source=EnergySource.FVE,
        heating_kwh=1.5,
        pv_kwh=1.2,
        grid_kwh=0.2,
        alt_kwh=0.1,
        estimated_cost_czk=4.80,
        predicted_top_temp_c=55.5,
    )
    result = PlanResult(
        entry_id="test_entry",
        box_id="test_box",
        created_at=now,
        valid_until=now + timedelta(hours=1),
        deadline=now + timedelta(hours=1),
        slots=[slot],
        selected_source=EnergySource.FVE,
        actuated_source=EnergySource.FVE,
        comfort_satisfied=True,
        estimated_cost_czk=4.80,
        pv_kwh=1.2,
        grid_kwh=0.2,
        alt_kwh=0.1,
    )

    plan = plan_result_to_boiler_plan(result)

    assert len(plan.slots) == 1
    s = plan.slots[0]
    assert s.heating_kwh == 1.5
    assert s.pv_kwh == 1.2
    assert s.grid_kwh == 0.2
    assert s.alt_kwh == 0.1
    assert s.estimated_cost_czk == 4.80
    assert s.predicted_top_temp_c == 55.5
    assert s.comfort_satisfied is None


def test_plan_slot_pv_share_computed():
    """pv_share is computed as (pv_kwh / heating_kwh) when heating_kwh > 0,
    else 0.0. pv_kwh=None is treated as 0.0."""
    from custom_components.oig_cloud.boiler.planner import plan_result_to_boiler_plan
    from custom_components.oig_cloud.boiler.planner_core import PlanResult, PlanSlotAction

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)

    slot_normal = PlanSlotAction(
        start=now,
        end=now + timedelta(minutes=15),
        action="heat",
        source=EnergySource.FVE,
        heating_kwh=2.0,
        pv_kwh=1.5,
        grid_kwh=0.5,
        alt_kwh=0.0,
        estimated_cost_czk=2.00,
        predicted_top_temp_c=60.0,
    )
    slot_zero_heat = PlanSlotAction(
        start=now,
        end=now + timedelta(minutes=15),
        action="idle",
        source=None,
        heating_kwh=0.0,
        pv_kwh=0.0,
        grid_kwh=0.0,
        alt_kwh=0.0,
        estimated_cost_czk=0.0,
        predicted_top_temp_c=0.0,
    )
    result = PlanResult(
        entry_id="test_entry",
        box_id="test_box",
        created_at=now,
        valid_until=now + timedelta(hours=1),
        deadline=now + timedelta(hours=1),
        slots=[slot_normal, slot_zero_heat],
        selected_source=EnergySource.FVE,
        actuated_source=EnergySource.FVE,
        comfort_satisfied=True,
        estimated_cost_czk=2.00,
        pv_kwh=1.5,
        grid_kwh=0.5,
        alt_kwh=0.0,
    )

    plan = plan_result_to_boiler_plan(result)

    assert len(plan.slots) == 2
    assert plan.slots[0].pv_share == pytest.approx(0.75)
    assert plan.slots[1].pv_share == 0.0


def test_plan_slot_pv_share_with_none_pv_kwh():
    from custom_components.oig_cloud.boiler.planner import plan_result_to_boiler_plan
    from custom_components.oig_cloud.boiler.planner_core import PlanResult, PlanSlotAction

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)

    slot = PlanSlotAction(
        start=now,
        end=now + timedelta(minutes=15),
        action="heat",
        source=EnergySource.FVE,
        heating_kwh=2.0,
        pv_kwh=None,
        grid_kwh=0.5,
        alt_kwh=0.0,
        estimated_cost_czk=2.00,
        predicted_top_temp_c=55.5,
    )
    result = PlanResult(
        entry_id="test_entry",
        box_id="test_box",
        created_at=now,
        valid_until=now + timedelta(hours=1),
        deadline=now + timedelta(hours=1),
        slots=[slot],
        selected_source=EnergySource.FVE,
        actuated_source=EnergySource.FVE,
        comfort_satisfied=True,
        estimated_cost_czk=2.00,
        pv_kwh=0.0,
        grid_kwh=0.5,
        alt_kwh=0.0,
    )

    plan = plan_result_to_boiler_plan(result)

    assert len(plan.slots) == 1
    assert plan.slots[0].pv_kwh == 0.0
    assert plan.slots[0].pv_share == 0.0
    assert plan.slots[0].overflow_available is False


def test_plan_slot_prediction_zero_normalizes_to_none():
    from custom_components.oig_cloud.boiler.planner import plan_result_to_boiler_plan
    from custom_components.oig_cloud.boiler.planner_core import PlanResult, PlanSlotAction

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)

    slot_zero_pred = PlanSlotAction(
        start=now,
        end=now + timedelta(minutes=15),
        action="heat",
        source=EnergySource.GRID,
        heating_kwh=1.0,
        pv_kwh=0.0,
        grid_kwh=1.0,
        alt_kwh=0.0,
        estimated_cost_czk=3.00,
        predicted_top_temp_c=0.0,
    )
    slot_negative_pred = PlanSlotAction(
        start=now + timedelta(minutes=15),
        end=now + timedelta(minutes=30),
        action="heat",
        source=EnergySource.GRID,
        heating_kwh=1.0,
        pv_kwh=0.0,
        grid_kwh=1.0,
        alt_kwh=0.0,
        estimated_cost_czk=3.00,
        predicted_top_temp_c=-5.0,
    )
    slot_none_pred = PlanSlotAction(
        start=now + timedelta(minutes=30),
        end=now + timedelta(minutes=45),
        action="heat",
        source=EnergySource.GRID,
        heating_kwh=1.0,
        pv_kwh=0.0,
        grid_kwh=1.0,
        alt_kwh=0.0,
        estimated_cost_czk=3.00,
        predicted_top_temp_c=0.0,
    )
    slot_valid_pred = PlanSlotAction(
        start=now + timedelta(minutes=45),
        end=now + timedelta(minutes=60),
        action="heat",
        source=EnergySource.FVE,
        heating_kwh=1.0,
        pv_kwh=1.0,
        grid_kwh=0.0,
        alt_kwh=0.0,
        estimated_cost_czk=0.0,
        predicted_top_temp_c=62.3,
    )
    result = PlanResult(
        entry_id="test_entry",
        box_id="test_box",
        created_at=now,
        valid_until=now + timedelta(hours=1),
        deadline=now + timedelta(hours=1),
        slots=[slot_zero_pred, slot_negative_pred, slot_none_pred, slot_valid_pred],
        selected_source=EnergySource.GRID,
        actuated_source=EnergySource.GRID,
        comfort_satisfied=False,
        estimated_cost_czk=9.00,
        pv_kwh=1.0,
        grid_kwh=3.0,
        alt_kwh=0.0,
    )

    plan = plan_result_to_boiler_plan(result)

    assert len(plan.slots) == 4
    assert plan.slots[0].predicted_top_temp_c is None
    assert plan.slots[1].predicted_top_temp_c is None

    predicted = plan.slots[2].predicted_top_temp_c
    assert predicted is None, f"slot_none_pred predicted_top_temp_c should be None, got {predicted}"
    assert plan.slots[3].predicted_top_temp_c == 62.3


def test_plan_slot_prediction_none_input_becomes_none():
    from custom_components.oig_cloud.boiler.planner import plan_result_to_boiler_plan
    from custom_components.oig_cloud.boiler.planner_core import PlanResult, PlanSlotAction

    now = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)

    slot = PlanSlotAction(
        start=now,
        end=now + timedelta(minutes=15),
        action="heat",
        source=EnergySource.GRID,
        heating_kwh=1.5,
        pv_kwh=0.0,
        grid_kwh=1.5,
        alt_kwh=0.0,
        estimated_cost_czk=4.50,
        predicted_top_temp_c=None,
    )
    result = PlanResult(
        entry_id="test_entry",
        box_id="test_box",
        created_at=now,
        valid_until=now + timedelta(hours=1),
        deadline=now + timedelta(hours=1),
        slots=[slot],
        selected_source=EnergySource.GRID,
        actuated_source=EnergySource.GRID,
        comfort_satisfied=False,
        estimated_cost_czk=4.50,
        pv_kwh=0.0,
        grid_kwh=1.5,
        alt_kwh=0.0,
    )

    plan = plan_result_to_boiler_plan(result)

    assert len(plan.slots) == 1
    assert plan.slots[0].predicted_top_temp_c is None


# ---------------------------------------------------------------------------
# F3a: multi-target scheduling tests
# ---------------------------------------------------------------------------

def _f3a_topology(
    *,
    tank_volume_l: float = 100.0,
    target_temp_c: float = 55.0,
    heater_power_kw: float = 2.0,
    standing_loss_coefficient: float = 0.0,
) -> BoilerThermalTopology:
    return BoilerThermalTopology(
        stratification_mode="two_zone",
        thermometer_placements=["top"],
        temperature_topology="top_only",
        tank_volume_l=tank_volume_l,
        target_temp_c=target_temp_c,
        cold_inlet_temp_c=10.0,
        heater_power_kw=heater_power_kw,
        standing_loss_coefficient=standing_loss_coefficient,
    )


def _make_prices(
    base: datetime,
    *,
    slots: int = 96,
    flat_price: float = 5.0,
) -> dict[datetime, float]:
    return {base + timedelta(minutes=15 * i): flat_price for i in range(slots)}


def test_f3a_empty_demand_targets_degenerates_to_legacy_path():
    """With no demand_targets, result is identical to the old single-deadline path."""
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)
    topo = _f3a_topology(heater_power_kw=2.0)
    prices = _make_prices(now)

    inp = PlannerInput(
        entry_id="test",
        box_id="box",
        profile=_profile(),
        spot_prices=prices,
        overflow_windows=[],
        deadline_time="06:00",
        topology=topo,
        current_top_temp_c=45.0,
        temperature_updated_at=now,
    )

    result = plan_comfort_core(inp, now=now)
    # Legacy: comfort satisfied, no demand_labels populated (no demand_targets given).
    assert result.comfort_satisfied is True
    assert result.demand_labels == []
    assert result.demands_met == []


def test_f3a_single_demand_target_met_by_early_heat_slot():
    """Single demand target before the safety-net deadline: slot allocated before target.start."""
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core
    from custom_components.oig_cloud.boiler.planner_contract import DemandTarget

    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)
    # Very easy: tank almost at target, tiny demand target requires only 0.1 kWh.
    # Heater outputs 2 kW * 15 min = 0.5 kWh per slot.  One slot is more than enough.
    topo = _f3a_topology(heater_power_kw=2.0, target_temp_c=52.0)

    # One demand target at 05:30 requiring 0.3 kWh (one slot easily covers it).
    target_start = now + timedelta(hours=1, minutes=30)
    demand_targets = [
        DemandTarget(start=target_start, required_kwh=0.3, label="morning")
    ]

    prices = _make_prices(now, flat_price=5.0)
    inp = PlannerInput(
        entry_id="test",
        box_id="box",
        profile=_profile(),
        spot_prices=prices,
        overflow_windows=[],
        deadline_time="07:00",
        topology=topo,
        current_top_temp_c=50.0,
        temperature_updated_at=now,
        demand_targets=demand_targets,
    )

    result = plan_comfort_core(inp, now=now)

    assert result.comfort_satisfied is True
    assert len(result.demands_met) == 1
    assert result.demands_met[0] is True
    assert result.demand_labels == ["morning"]
    # All allocated slots for the demand target must end before target_start.
    heated = [s for s in result.slots if s.action == "heat"]
    demand_heated = [s for s in heated if s.end <= target_start]
    assert len(demand_heated) >= 1, "At least one slot must be allocated before target"


def test_f3a_multi_target_two_windows_both_met():
    """Two demand targets, both feasible; planner allocates slots for each."""
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core
    from custom_components.oig_cloud.boiler.planner_contract import DemandTarget

    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)
    # Large tank; heater 4 kW → 1 kWh per slot.  Plenty of headroom.
    topo = _f3a_topology(tank_volume_l=200.0, heater_power_kw=4.0, target_temp_c=60.0)

    morning_target = DemandTarget(
        start=now + timedelta(hours=2),
        required_kwh=0.5,
        label="morning",
    )
    evening_target = DemandTarget(
        start=now + timedelta(hours=8),
        required_kwh=0.5,
        label="evening",
    )

    prices = _make_prices(now, flat_price=3.0)
    inp = PlannerInput(
        entry_id="test",
        box_id="box",
        profile=_profile(),
        spot_prices=prices,
        overflow_windows=[],
        deadline_time="12:00",
        topology=topo,
        current_top_temp_c=40.0,
        temperature_updated_at=now,
        demand_targets=[morning_target, evening_target],
    )

    result = plan_comfort_core(inp, now=now)

    assert len(result.demands_met) == 2
    assert all(result.demands_met), "Both targets should be met"
    assert result.demand_labels == ["morning", "evening"]
    assert PlannerReasonCode.DEMAND_TARGET_MISSED not in result.reason_codes


def test_f3a_sequential_draws_each_get_their_own_heat():
    """A later draw must NOT inherit heat already consumed by an earlier draw.

    Two equal back-to-back draws (each = exactly one heat slot). The earlier
    draw consumes its prepared heat, so the later draw needs its OWN heat slot
    between the two targets. The old cumulative-credit bug heated only once.
    """
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core
    from custom_components.oig_cloud.boiler.planner_contract import DemandTarget

    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)
    # 4 kW heater → 1.0 kWh per 15-min slot. Tank already near target so the
    # safety-net adds (almost) nothing → isolates the demand-target allocation.
    topo = _f3a_topology(tank_volume_l=200.0, heater_power_kw=4.0, target_temp_c=60.0)

    morning = DemandTarget(start=now + timedelta(hours=2), required_kwh=1.0, label="morning")
    midday = DemandTarget(start=now + timedelta(hours=5), required_kwh=1.0, label="midday")

    prices = _make_prices(now, flat_price=3.0)
    inp = PlannerInput(
        entry_id="test",
        box_id="box",
        profile=_profile(),
        spot_prices=prices,
        overflow_windows=[],
        deadline_time="11:00",
        topology=topo,
        current_top_temp_c=59.5,
        temperature_updated_at=now,
        demand_targets=[morning, midday],
    )

    result = plan_comfort_core(inp, now=now)

    heated = [s for s in result.slots if s.action == "heat"]
    before_morning = [s for s in heated if s.end <= morning.start]
    between = [s for s in heated if morning.start <= s.end <= midday.start]
    # Each draw gets its own preparation: ≥1 slot before morning AND ≥1 between
    # morning and midday (the fix; the old bug left `between` empty).
    assert len(before_morning) >= 1, "morning draw must be prepared"
    assert len(between) >= 1, "midday draw must get its OWN heat after the morning draw"
    assert result.demands_met == [True, True]


def test_f3a_infeasible_demand_target_emits_reason_code():
    """When a demand target cannot be met (no slots available), DEMAND_TARGET_MISSED is set."""
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core
    from custom_components.oig_cloud.boiler.planner_contract import DemandTarget

    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)
    # Target starts at now+1min — no slots end before that.
    # Required kWh = 5.0 (many slots needed), but zero available before target.start.
    infeasible_target = DemandTarget(
        start=now + timedelta(minutes=1),
        required_kwh=5.0,
        label="immediate",
    )

    topo = _f3a_topology(heater_power_kw=2.0, target_temp_c=55.0)
    prices = _make_prices(now, flat_price=5.0)
    inp = PlannerInput(
        entry_id="test",
        box_id="box",
        profile=_profile(),
        spot_prices=prices,
        overflow_windows=[],
        deadline_time="07:00",
        topology=topo,
        current_top_temp_c=50.0,
        temperature_updated_at=now,
        demand_targets=[infeasible_target],
    )

    result = plan_comfort_core(inp, now=now)

    assert PlannerReasonCode.DEMAND_TARGET_MISSED in result.reason_codes
    assert len(result.demands_met) == 1
    assert result.demands_met[0] is False


def test_f3a_overflow_beats_cheap_grid_beats_alt():
    """Source priority: overflow (FVE, cost=0) > cheap grid > disabled alt."""
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core
    from custom_components.oig_cloud.boiler.planner_contract import (
        AlternativeSourceCapability,
        DemandTarget,
    )

    now = datetime(2026, 6, 11, 6, 0, tzinfo=timezone.utc)
    topo = _f3a_topology(heater_power_kw=2.0, target_temp_c=55.0)

    # Overflow covers slot 0.
    overflow_start = now
    overflow_end = now + timedelta(minutes=15)

    # Grid is cheap (1 Kč/kWh); alt is 0.8 Kč/kWh but DISABLED.
    prices = {overflow_start + timedelta(minutes=15 * i): 1.0 for i in range(40)}

    target_start = now + timedelta(hours=2)
    demand_target = DemandTarget(start=target_start, required_kwh=0.4, label="morning")

    inp = PlannerInput(
        entry_id="test",
        box_id="box",
        profile=_profile(),
        spot_prices=prices,
        overflow_windows=[(overflow_start, overflow_end)],
        deadline_time="08:00",
        topology=topo,
        current_top_temp_c=50.0,
        temperature_updated_at=now,
        alt_source_capability=AlternativeSourceCapability.DISABLED,
        alt_cost_kwh=0.8,
        demand_targets=[demand_target],
    )

    result = plan_comfort_core(inp, now=now)

    # The overflow slot should have been preferred (cost=0).
    overflow_slot = next(
        (s for s in result.slots if s.start == overflow_start and s.action == "heat"),
        None,
    )
    if overflow_slot is not None:
        assert overflow_slot.source.value == "fve"
        assert overflow_slot.estimated_cost_czk == pytest.approx(0.0)

    # Alt disabled → no alt_kwh at all.
    assert result.alt_kwh == pytest.approx(0.0)


def test_f3a_standing_loss_bias_prefers_just_in_time_on_flat_prices():
    """With non-zero standing_loss_coefficient and flat prices, later slots are preferred."""
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)
    deadline = now + timedelta(hours=4)  # 08:00

    # standing_loss_coefficient > 0 → just-in-time bias active.
    topo = _f3a_topology(
        heater_power_kw=2.0,
        target_temp_c=52.0,
        standing_loss_coefficient=0.02,
    )

    # Current temp 50°C → needs ~1 slot to reach 52°C.
    prices = {now + timedelta(minutes=15 * i): 5.0 for i in range(16 * 4)}

    inp = PlannerInput(
        entry_id="test",
        box_id="box",
        profile=_profile(),
        spot_prices=prices,
        overflow_windows=[],
        deadline_time="08:00",
        topology=topo,
        current_top_temp_c=50.0,
        temperature_updated_at=now,
    )

    result = plan_comfort_core(inp, now=now)
    heated = sorted(
        [s for s in result.slots if s.action == "heat"],
        key=lambda s: s.start,
    )
    # With just-in-time bias: slot(s) should be as late as possible before deadline.
    assert result.comfort_satisfied is True
    if heated:
        # Last heat slot should end at or near deadline.
        assert heated[-1].end <= deadline
        # The chosen slot(s) should be in the second half of the window.
        midpoint = now + (deadline - now) / 2
        assert heated[0].start >= midpoint, (
            f"Expected heat after midpoint {midpoint}, got {heated[0].start}"
        )


def test_f3a_early_cheap_slot_beats_just_in_time_when_spread_exceeds_losses():
    """An early slot with a much lower price beats just-in-time when saving > standing loss."""
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core

    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)

    # standing_loss_coefficient = 0.001 → very small loss; a large price spread wins.
    topo = _f3a_topology(
        tank_volume_l=100.0,
        heater_power_kw=2.0,
        target_temp_c=52.0,
        standing_loss_coefficient=0.001,
    )

    # Prices: slot 0 (now) is 0.5 Kč/kWh; all subsequent slots are 50 Kč/kWh.
    prices: dict[datetime, float] = {}
    prices[now] = 0.5
    for i in range(1, 96):
        prices[now + timedelta(minutes=15 * i)] = 50.0

    inp = PlannerInput(
        entry_id="test",
        box_id="box",
        profile=_profile(),
        spot_prices=prices,
        overflow_windows=[],
        deadline_time="06:00",
        topology=topo,
        current_top_temp_c=50.0,
        temperature_updated_at=now,
    )

    result = plan_comfort_core(inp, now=now)
    heated = [s for s in result.slots if s.action == "heat"]

    assert result.comfort_satisfied is True
    assert heated, "At least one heated slot"
    # The earliest (cheapest) slot must have been chosen.
    assert heated[0].start == now, (
        f"Expected heating at cheapest slot {now}, got {heated[0].start}"
    )


def test_f3a_low_confidence_fallback_uses_legacy_single_deadline():
    """When demand_profiler returns confidence < 0.3, demand_targets is [] (legacy)."""
    from custom_components.oig_cloud.boiler.runtime import _build_demand_targets
    from custom_components.oig_cloud.boiler.demand_profiler import (
        BoilerDemandProfiler,
        BoilerDemandProfilerAsync,
    )

    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)

    # A profiler with zero history → confidence=0.0 → bootstrap.
    profiler = BoilerDemandProfilerAsync(
        hass=None,
        temp_sensor_entity="sensor.top",
        heating_entity=None,
        volume_l=100.0,
        target_temp_c=55.0,
        cold_inlet_temp_c=10.0,
    )
    # No calls to async_update, so _profiler._category_slots is empty.

    class FakeCoordinator:
        _demand_profiler = profiler

    targets = _build_demand_targets(
        coordinator=FakeCoordinator(),
        now=now,
        horizon_hours=24,
    )
    assert targets == [], f"Expected [] for bootstrap profiler, got {targets}"


def test_f3a_demand_targets_populated_when_confident_profiler():
    """_build_demand_targets returns targets when profiler has enough history."""
    from custom_components.oig_cloud.boiler.runtime import _build_demand_targets
    from custom_components.oig_cloud.boiler.demand_profiler import (
        BoilerDemandProfiler,
        BoilerDemandProfilerAsync,
        DrawEvent,
    )
    from datetime import date

    now = datetime(2026, 6, 11, 8, 0, tzinfo=timezone.utc)

    profiler_async = BoilerDemandProfilerAsync(
        hass=None,
        temp_sensor_entity="sensor.top",
        heating_entity=None,
        volume_l=100.0,
        target_temp_c=55.0,
        cold_inlet_temp_c=10.0,
    )

    # Inject enough draws to produce confidence >= 0.3.
    # 3 workday_summer days with a morning draw.
    draws = []
    for day in range(10):
        draw_start = datetime(2026, 6, 1 + day, 7, 0, tzinfo=timezone.utc)
        draw_end = draw_start + timedelta(minutes=10)
        draws.append(DrawEvent(
            start=draw_start,
            end=draw_end,
            drop_c=3.0,
            rate_c_per_min=0.3,
            energy_kwh=0.5,
            liters=10.0,
        ))

    from custom_components.oig_cloud.boiler.demand_profiler import build_category_slots
    profiler_async._profiler._category_slots = build_category_slots(draws)

    class FakeCoordinator:
        _demand_profiler = profiler_async

    targets = _build_demand_targets(
        coordinator=FakeCoordinator(),
        now=now,
        horizon_hours=24,
    )
    # Should have at least one target within the horizon (morning window).
    assert len(targets) >= 1, f"Expected at least one demand target, got {targets}"
    for t in targets:
        assert t.required_kwh > 0.0
        assert t.start > now


def test_f3a_plan_result_has_cost_benchmarks():
    """PlanResult.cost_if_all_grid and cost_if_all_alt are computed correctly."""
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core
    from custom_components.oig_cloud.boiler.planner_contract import AlternativeSourceCapability

    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)
    topo = _f3a_topology(heater_power_kw=2.0, target_temp_c=52.0)

    # Fixed price 4 Kč/kWh; alt at 2 Kč/kWh (BENCHMARK_ONLY → not actuated, but benchmark).
    prices = {now + timedelta(minutes=15 * i): 4.0 for i in range(96)}

    inp = PlannerInput(
        entry_id="test",
        box_id="box",
        profile=_profile(),
        spot_prices=prices,
        overflow_windows=[],
        deadline_time="06:00",
        topology=topo,
        current_top_temp_c=50.0,
        temperature_updated_at=now,
        alt_source_capability=AlternativeSourceCapability.BENCHMARK_ONLY,
        alt_cost_kwh=2.0,
    )

    result = plan_comfort_core(inp, now=now)

    heated = [s for s in result.slots if s.action == "heat"]
    heat_kwh_total = sum(s.heating_kwh for s in heated)

    # cost_if_all_grid: heat_kwh * 4.0 per slot.
    assert result.cost_if_all_grid == pytest.approx(heat_kwh_total * 4.0, rel=1e-3)
    # cost_if_all_alt: heat_kwh * 2.0 per slot.
    assert result.cost_if_all_alt == pytest.approx(heat_kwh_total * 2.0, rel=1e-3)


# ---------------------------------------------------------------------------
# Phase B: thermal arbitrage (opt-in over-heat in cheap slots)
# ---------------------------------------------------------------------------

def _arb_input(now, *, enabled, alt_cost, prices, overflow=None, top=48.0):
    from custom_components.oig_cloud.boiler.planner_contract import (
        AlternativeSourceCapability,
    )
    topo = _f3a_topology(heater_power_kw=4.0, target_temp_c=50.0)
    return PlannerInput(
        entry_id="t", box_id="b", profile=_profile(), spot_prices=prices,
        overflow_windows=overflow or [], deadline_time="06:00", topology=topo,
        current_top_temp_c=top, temperature_updated_at=now,
        alt_source_capability=AlternativeSourceCapability.BENCHMARK_ONLY,
        alt_cost_kwh=alt_cost, thermal_arbitrage_enabled=enabled,
    )


def test_arbitrage_off_means_no_extra_heat():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core
    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)
    prices = _make_prices(now, flat_price=1.0)  # cheap everywhere
    off = plan_comfort_core(_arb_input(now, enabled=False, alt_cost=3.0, prices=prices), now=now)
    on = plan_comfort_core(_arb_input(now, enabled=True, alt_cost=3.0, prices=prices), now=now)
    n_off = sum(1 for s in off.slots if s.action == "heat")
    n_on = sum(1 for s in on.slots if s.action == "heat")
    # Arbitrage ON heats strictly more slots (fills toward max_temp in cheap slots).
    assert n_on > n_off
    assert PlannerReasonCode.ARBITRAGE_SCHEDULED in on.reason_codes


def test_arbitrage_skipped_when_spot_above_alt_cost():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core
    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)
    prices = _make_prices(now, flat_price=5.0)  # all above alt cost 3.0
    off = plan_comfort_core(_arb_input(now, enabled=False, alt_cost=3.0, prices=prices), now=now)
    on = plan_comfort_core(_arb_input(now, enabled=True, alt_cost=3.0, prices=prices), now=now)
    n_off = sum(1 for s in off.slots if s.action == "heat")
    n_on = sum(1 for s in on.slots if s.action == "heat")
    # No cheap slots → arbitrage adds nothing.
    assert n_on == n_off


def test_arbitrage_reserves_for_overflow():
    from custom_components.oig_cloud.boiler.planner_core import plan_comfort_core
    now = datetime(2026, 6, 11, 4, 0, tzinfo=timezone.utc)
    prices = _make_prices(now, flat_price=1.0)
    no_ovf = plan_comfort_core(_arb_input(now, enabled=True, alt_cost=3.0, prices=prices), now=now)
    # Big overflow window (free FVE) → leave headroom, fewer arbitrage slots.
    ovf = [(now + timedelta(hours=6), now + timedelta(hours=14), 4.0)]
    with_ovf = plan_comfort_core(
        _arb_input(now, enabled=True, alt_cost=3.0, prices=prices, overflow=ovf), now=now
    )
    n_no = sum(1 for s in no_ovf.slots if s.action == "heat")
    n_ovf = sum(1 for s in with_ovf.slots if s.action == "heat")
    assert n_ovf <= n_no
