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
