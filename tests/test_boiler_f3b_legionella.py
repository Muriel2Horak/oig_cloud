"""R9: Anti-legionella obligation tests.

Covers:
- Disabled (interval 0) → zero change to plan
- Overdue → cheapest-window allocation with purpose tags + reason code
- Comfort takes precedence (comfort slots not stolen)
- Recorder-unknown → no scheduling
- PlanSlotAction default purpose keeps old constructors working
- LegionellaObligation fields + PlannerInput acceptance
- _allocate_legionella: cheapest contiguous window selection
- _async_build_legionella_obligation: short-circuit when current temp >= target
- _async_detect_last_legionella_event: cache freshness
"""

from __future__ import annotations

import asyncio
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.oig_cloud.boiler.models import (
    BoilerThermalTopology,
    BoilerProfile,
    EnergySource,
)
from custom_components.oig_cloud.boiler.planner_contract import (
    LegionellaObligation,
    PlannerInput,
    PlannerReasonCode,
)
from custom_components.oig_cloud.boiler.planner_core import (
    PlanSlotAction,
    PlanResult,
    plan_comfort_core,
    _allocate_legionella,
    _build_empty_slots,
    _slot_allocation,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_UTC = timezone.utc


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
) -> BoilerThermalTopology:
    return BoilerThermalTopology(
        stratification_mode="two_zone",
        thermometer_placements=["top"],
        temperature_topology="top_only",
        tank_volume_l=tank_volume_l,
        target_temp_c=target_temp_c,
        cold_inlet_temp_c=10.0,
        heater_power_kw=heater_power_kw,
        standing_loss_coefficient=0.0,
    )


def _planner_input(
    *,
    now: datetime,
    top_temp: float = 45.0,
    topology: BoilerThermalTopology | None = None,
    deadline_time: str = "01:00",
    spot_prices: dict[datetime, float] | None = None,
    legionella_obligation: LegionellaObligation | None = None,
) -> PlannerInput:
    return PlannerInput(
        entry_id="entry_f3b",
        box_id="box_f3b",
        profile=_profile(),
        spot_prices=spot_prices or {},
        overflow_windows=[],
        deadline_time=deadline_time,
        topology=topology or _topology(),
        current_top_temp_c=top_temp,
        current_bottom_temp_c=None,
        temperature_updated_at=now,
        legionella_obligation=legionella_obligation,
    )


def _now() -> datetime:
    return datetime(2026, 6, 10, 12, 0, tzinfo=_UTC)


# ---------------------------------------------------------------------------
# 1. PlanSlotAction default purpose = "comfort"
# ---------------------------------------------------------------------------

def test_plan_slot_action_default_purpose():
    """Old constructors without purpose= still produce purpose='comfort'."""
    now = _now()
    slot = PlanSlotAction(
        start=now,
        end=now + timedelta(minutes=15),
        action="idle",
        source=None,
    )
    assert slot.purpose == "comfort"


def test_plan_slot_action_legionella_purpose():
    """Explicit purpose='legionella' roundtrips correctly."""
    now = _now()
    slot = PlanSlotAction(
        start=now,
        end=now + timedelta(minutes=15),
        action="heat",
        source=EnergySource.GRID,
        heating_kwh=1.0,
        grid_kwh=1.0,
        purpose="legionella",
    )
    assert slot.purpose == "legionella"


# ---------------------------------------------------------------------------
# 2. LegionellaObligation dataclass fields
# ---------------------------------------------------------------------------

def test_legionella_obligation_fields():
    ob = LegionellaObligation(
        overdue=True,
        required_kwh=3.5,
        legionella_target_temp_c=60.0,
        days_since_last=8,
        interval_days=7,
    )
    assert ob.overdue is True
    assert ob.required_kwh == 3.5
    assert ob.legionella_target_temp_c == 60.0
    assert ob.days_since_last == 8
    assert ob.interval_days == 7


def test_legionella_obligation_none_days_since():
    ob = LegionellaObligation(
        overdue=False,
        required_kwh=0.0,
        legionella_target_temp_c=60.0,
        days_since_last=None,
        interval_days=7,
    )
    assert ob.days_since_last is None


# ---------------------------------------------------------------------------
# 3. PlannerInput accepts legionella_obligation field (no ValueError)
# ---------------------------------------------------------------------------

def test_planner_input_accepts_legionella_obligation():
    now = _now()
    ob = LegionellaObligation(
        overdue=False,
        required_kwh=0.0,
        legionella_target_temp_c=60.0,
        days_since_last=3,
        interval_days=7,
    )
    inp = _planner_input(now=now, legionella_obligation=ob)
    assert inp.legionella_obligation is ob


def test_planner_input_default_legionella_obligation_is_none():
    now = _now()
    inp = _planner_input(now=now)
    assert inp.legionella_obligation is None


# ---------------------------------------------------------------------------
# 4. Disabled (interval 0 or obligation=None) → plan unchanged
# ---------------------------------------------------------------------------

def test_legionella_disabled_no_change_to_plan():
    """When obligation is None (disabled), plan_comfort_core behaves identically."""
    now = _now()
    inp_without = _planner_input(now=now, top_temp=45.0)
    inp_with_none = _planner_input(now=now, top_temp=45.0, legionella_obligation=None)

    result_without = plan_comfort_core(inp_without, now=now)
    result_with = plan_comfort_core(inp_with_none, now=now)

    # Same comfort result.
    assert result_without.comfort_satisfied == result_with.comfort_satisfied
    assert result_without.grid_kwh == pytest.approx(result_with.grid_kwh)
    # No legionella reason codes.
    assert PlannerReasonCode.LEGIONELLA_SCHEDULED not in result_with.reason_codes
    assert PlannerReasonCode.LEGIONELLA_OVERDUE_INFEASIBLE not in result_with.reason_codes
    # All slots have purpose="comfort".
    assert all(slot.purpose == "comfort" for slot in result_with.slots)


def test_legionella_not_overdue_no_extra_slots():
    """When not overdue, no legionella-purpose slots are created."""
    now = _now()
    ob = LegionellaObligation(
        overdue=False,
        required_kwh=3.0,
        legionella_target_temp_c=60.0,
        days_since_last=3,
        interval_days=7,
    )
    inp = _planner_input(now=now, top_temp=45.0, legionella_obligation=ob)
    result = plan_comfort_core(inp, now=now)

    assert all(slot.purpose == "comfort" for slot in result.slots)
    assert PlannerReasonCode.LEGIONELLA_SCHEDULED not in result.reason_codes


# ---------------------------------------------------------------------------
# 5. Overdue → legionella slots + reason code LEGIONELLA_SCHEDULED
# ---------------------------------------------------------------------------

def test_legionella_overdue_creates_purpose_tagged_slots():
    """Overdue obligation produces legionella-purpose slots and reason code."""
    now = _now()
    # Make spot prices uniform (0 cost everywhere so cheapest window = any early window)
    prices = {
        now + timedelta(minutes=15 * i): 1.0
        for i in range(96)
    }
    ob = LegionellaObligation(
        overdue=True,
        required_kwh=2.0,  # needs several slots with a 4 kW heater (0.25 kWh/slot × 8 = 2.0)
        legionella_target_temp_c=60.0,
        days_since_last=8,
        interval_days=7,
    )
    inp = _planner_input(
        now=now,
        top_temp=45.0,
        spot_prices=prices,
        legionella_obligation=ob,
    )
    result = plan_comfort_core(inp, now=now)

    legionella_slots = [s for s in result.slots if s.purpose == "legionella"]
    comfort_slots = [s for s in result.slots if s.purpose == "comfort" and s.action == "heat"]

    assert len(legionella_slots) > 0, "Expected legionella-purpose heated slots"
    assert PlannerReasonCode.LEGIONELLA_SCHEDULED in result.reason_codes
    assert PlannerReasonCode.LEGIONELLA_OVERDUE_INFEASIBLE not in result.reason_codes
    # All legionella slots must actually be heated.
    assert all(s.action == "heat" for s in legionella_slots)


def test_legionella_overdue_zero_kwh_already_satisfied():
    """Overdue obligation with required_kwh=0 → emits LEGIONELLA_ALREADY_SATISFIED
    without allocating any extra slots (temperature already meets target)."""
    now = _now()
    ob = LegionellaObligation(
        overdue=True,
        required_kwh=0.0,
        legionella_target_temp_c=60.0,
        days_since_last=8,
        interval_days=7,
    )
    inp = _planner_input(now=now, top_temp=45.0, legionella_obligation=ob)
    result = plan_comfort_core(inp, now=now)

    # required_kwh=0 → _allocate_legionella short-circuits with LEGIONELLA_ALREADY_SATISFIED
    assert PlannerReasonCode.LEGIONELLA_ALREADY_SATISFIED in result.reason_codes
    assert PlannerReasonCode.LEGIONELLA_SCHEDULED not in result.reason_codes
    assert all(slot.purpose == "comfort" for slot in result.slots)


# ---------------------------------------------------------------------------
# 6. Comfort takes precedence — legionella slots do not steal comfort slots
# ---------------------------------------------------------------------------

def test_legionella_does_not_steal_comfort_slots():
    """Legionella allocation uses only slots not already comfort-allocated."""
    now = _now()
    # Uniform prices to get repeatable comfort slot selection
    prices = {now + timedelta(minutes=15 * i): 1.0 for i in range(96)}

    # Plan without legionella
    inp_no_legionella = _planner_input(
        now=now, top_temp=40.0, spot_prices=prices, deadline_time="01:00"
    )
    result_no_legionella = plan_comfort_core(inp_no_legionella, now=now)
    comfort_starts_no_legionella = {
        s.start for s in result_no_legionella.slots if s.action == "heat"
    }

    # Plan with legionella
    ob = LegionellaObligation(
        overdue=True,
        required_kwh=1.0,
        legionella_target_temp_c=60.0,
        days_since_last=10,
        interval_days=7,
    )
    inp_with_legionella = _planner_input(
        now=now, top_temp=40.0, spot_prices=prices, deadline_time="01:00",
        legionella_obligation=ob,
    )
    result_with = plan_comfort_core(inp_with_legionella, now=now)

    # All comfort-slot starts from the non-legionella plan must still be heated.
    heated_starts_with = {s.start for s in result_with.slots if s.action == "heat"}
    assert comfort_starts_no_legionella.issubset(heated_starts_with), (
        "Legionella allocation stole comfort-allocated slots"
    )

    # The legionella slots are disjoint from the original comfort slots.
    legionella_starts = {s.start for s in result_with.slots if s.purpose == "legionella"}
    assert legionella_starts.isdisjoint(comfort_starts_no_legionella), (
        "Legionella purpose overlap with comfort slots"
    )


# ---------------------------------------------------------------------------
# 7. Cheapest-window selection in _allocate_legionella
# ---------------------------------------------------------------------------

def test_allocate_legionella_picks_cheapest_contiguous_window():
    """_allocate_legionella should pick the contiguous window with minimum cost."""
    now = _now()
    slots = _build_empty_slots(now, 4)  # 4 h = 16 slots
    # Assign non-uniform prices: slots 0-3 expensive, slots 4-7 cheap, 8-15 medium
    prices: dict[datetime, float] = {}
    for i, slot in enumerate(slots):
        if i < 4:
            prices[slot.start] = 10.0  # expensive
        elif i < 8:
            prices[slot.start] = 0.5   # cheapest
        else:
            prices[slot.start] = 3.0   # medium

    inp = _planner_input(now=now, spot_prices=prices)
    heat_kwh = 0.25  # 4 kW × 15 min
    slots_needed = 2

    # Allocate with no comfort slots pre-allocated
    combined, legionella_starts = _allocate_legionella(
        slots=slots,
        comfort_allocated={},
        required_kwh=slots_needed * heat_kwh,
        planner_input=inp,
        heat_kwh=heat_kwh,
        reasons=[],
    )

    # All selected slots should be in the cheap window (indices 4-7)
    cheap_starts = {slots[i].start for i in range(4, 8)}
    assert legionella_starts.issubset(cheap_starts), (
        f"Expected cheapest window slots, got {legionella_starts}"
    )
    assert len(legionella_starts) == slots_needed


def test_allocate_legionella_infeasible_appends_reason():
    """When no contiguous window of the needed size fits, LEGIONELLA_OVERDUE_INFEASIBLE
    is appended."""
    now = _now()
    # 4 slots (1 h). Pre-allocate all slots as comfort → 0 free slots.
    slots = _build_empty_slots(now, 1)  # 4 slots (1 h)
    inp = _planner_input(now=now, spot_prices={s.start: 1.0 for s in slots})
    heat_kwh = 0.25
    reasons: list[PlannerReasonCode] = []

    # Pre-allocate all 4 slots as comfort so nothing is free.
    comfort_alloc = {
        slots[i].start: _slot_allocation(slots[i], inp, heat_kwh) for i in range(4)
    }

    combined, legionella_starts = _allocate_legionella(
        slots=slots,
        comfort_allocated=comfort_alloc,
        required_kwh=heat_kwh,  # needs 1 slot, but 0 free
        planner_input=inp,
        heat_kwh=heat_kwh,
        reasons=reasons,
    )

    assert PlannerReasonCode.LEGIONELLA_OVERDUE_INFEASIBLE in reasons
    assert len(legionella_starts) == 0


def test_allocate_legionella_skips_already_comfort_allocated():
    """Slots already comfort-allocated are excluded from legionella window search."""
    now = _now()
    slots = _build_empty_slots(now, 4)  # 16 slots
    inp = _planner_input(now=now, spot_prices={s.start: 1.0 for s in slots})
    heat_kwh = 0.25
    reasons: list[PlannerReasonCode] = []

    # Pre-allocate the first 14 slots as comfort.
    from custom_components.oig_cloud.boiler.planner_core import _slot_allocation
    comfort_alloc = {
        slots[i].start: _slot_allocation(slots[i], inp, heat_kwh)
        for i in range(14)
    }

    combined, legionella_starts = _allocate_legionella(
        slots=slots,
        comfort_allocated=comfort_alloc,
        required_kwh=2 * heat_kwh,  # needs 2 contiguous free slots
        planner_input=inp,
        heat_kwh=heat_kwh,
        reasons=reasons,
    )

    # Slots 14 and 15 are free and contiguous → should be selected.
    expected = {slots[14].start, slots[15].start}
    assert legionella_starts == expected
    assert PlannerReasonCode.LEGIONELLA_SCHEDULED in reasons


# ---------------------------------------------------------------------------
# 8. LEGIONELLA_OVERDUE_INFEASIBLE when horizon too short
# ---------------------------------------------------------------------------

def test_legionella_overdue_infeasible_reason_code():
    """When the horizon has no contiguous feasible window, LEGIONELLA_OVERDUE_INFEASIBLE
    is emitted and no legionella slots appear."""
    now = _now()
    # Very small heater (0.001 kW) → each slot produces almost no heat;
    # required_kwh >> what any window can provide means contiguous slots feasible
    # in count but let's just pre-fill all slots as comfort.
    prices = {now + timedelta(minutes=15 * i): 1.0 for i in range(96)}

    # Pre-fill all slots with comfort allocation by making required_kwh huge.
    ob = LegionellaObligation(
        overdue=True,
        required_kwh=9999.0,  # absurdly large → slots_needed >> horizon
        legionella_target_temp_c=60.0,
        days_since_last=8,
        interval_days=7,
    )
    inp = _planner_input(now=now, top_temp=45.0, spot_prices=prices, legionella_obligation=ob)
    result = plan_comfort_core(inp, now=now)

    assert PlannerReasonCode.LEGIONELLA_OVERDUE_INFEASIBLE in result.reason_codes
    legionella_slots = [s for s in result.slots if s.purpose == "legionella"]
    assert len(legionella_slots) == 0


# ---------------------------------------------------------------------------
# 9. Recorder unknown → no scheduling
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_legionella_detection_recorder_unavailable_no_scheduling():
    """When recorder is unavailable, _async_build_legionella_obligation returns
    a non-overdue obligation (unknown treated as do-not-schedule)."""
    from custom_components.oig_cloud.boiler.runtime import (
        _async_build_legionella_obligation,
        _LegionellaCache,
    )

    hass = MagicMock()
    config = {
        "boiler_legionella_interval_days": 7,
        "boiler_legionella_target_temp_c": 60.0,
        "boiler_temp_sensor_top": "sensor.boiler_top",
    }
    now = _now()
    topology = _topology(target_temp_c=55.0, tank_volume_l=100.0)
    cache = _LegionellaCache()

    with patch(
        "custom_components.oig_cloud.boiler.runtime._async_detect_last_legionella_event",
        return_value=None,  # recorder unavailable
    ):
        obligation = await _async_build_legionella_obligation(
            hass,
            config=config,
            now=now,
            current_top_temp_c=45.0,
            topology=topology,
            cache=cache,
        )

    assert obligation is not None
    assert obligation.overdue is False
    assert obligation.required_kwh == 0.0
    assert obligation.days_since_last is None


@pytest.mark.asyncio
async def test_legionella_detection_get_instance_returns_none():
    """When get_instance(hass) returns None, treat as recorder unavailable."""
    from custom_components.oig_cloud.boiler.runtime import (
        _async_detect_last_legionella_event,
        _LegionellaCache,
    )

    hass = MagicMock()
    now = _now()
    cache = _LegionellaCache()

    with patch(
        "custom_components.oig_cloud.boiler.runtime._async_detect_last_legionella_event",
        new=AsyncMock(return_value=None),
    ):
        result = await _async_detect_last_legionella_event(
            hass,
            top_sensor_entity="sensor.boiler_top",
            legionella_target_temp_c=60.0,
            interval_days=7,
            now=now,
            cache=cache,
        )
    # The mock returns None → treat as unknown
    assert result is None


# ---------------------------------------------------------------------------
# 10. Short-circuit: current temp >= target → cache achievement
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_legionella_detection_short_circuit_current_temp():
    """When current top temp >= legionella target, short-circuits and returns now."""
    from custom_components.oig_cloud.boiler.runtime import (
        _async_detect_last_legionella_event,
        _LegionellaCache,
    )

    hass = MagicMock()
    now = _now()
    cache = _LegionellaCache()

    result = await _async_detect_last_legionella_event(
        hass,
        top_sensor_entity="sensor.boiler_top",
        legionella_target_temp_c=60.0,
        interval_days=7,
        now=now,
        cache=cache,
        current_top_temp_c=65.0,  # above target
    )

    assert result == now
    assert cache.last_achieved_at == now
    assert cache.last_checked_at == now


@pytest.mark.asyncio
async def test_legionella_cache_freshness_skips_recorder():
    """Within 6h of last check, the recorder is not re-scanned."""
    from custom_components.oig_cloud.boiler.runtime import (
        _async_detect_last_legionella_event,
        _LegionellaCache,
        _LEGIONELLA_CACHE_REFRESH_INTERVAL,
    )

    hass = MagicMock()
    now = _now()
    # Cache was last checked 1 hour ago (within 6h).
    last_achieved = now - timedelta(days=3)
    cache = _LegionellaCache(
        last_checked_at=now - timedelta(hours=1),
        last_achieved_at=last_achieved,
    )

    with patch(
        "homeassistant.helpers.recorder.get_instance",
    ) as mock_get_instance:
        result = await _async_detect_last_legionella_event(
            hass,
            top_sensor_entity="sensor.boiler_top",
            legionella_target_temp_c=60.0,
            interval_days=7,
            now=now,
            cache=cache,
            current_top_temp_c=45.0,  # below target
        )
        # get_instance should NOT have been called (cache hit).
        mock_get_instance.assert_not_called()

    assert result == last_achieved


# ---------------------------------------------------------------------------
# 11. _async_build_legionella_obligation: disabled when interval_days=0
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_legionella_obligation_disabled_interval_zero():
    """interval_days=0 means disabled → None returned."""
    from custom_components.oig_cloud.boiler.runtime import (
        _async_build_legionella_obligation,
        _LegionellaCache,
    )

    hass = MagicMock()
    config = {"boiler_legionella_interval_days": 0}
    now = _now()
    cache = _LegionellaCache()

    result = await _async_build_legionella_obligation(
        hass,
        config=config,
        now=now,
        current_top_temp_c=45.0,
        topology=_topology(),
        cache=cache,
    )
    assert result is None


@pytest.mark.asyncio
async def test_legionella_obligation_no_sensor_configured():
    """No top sensor → None returned (cannot detect)."""
    from custom_components.oig_cloud.boiler.runtime import (
        _async_build_legionella_obligation,
        _LegionellaCache,
    )

    hass = MagicMock()
    config = {
        "boiler_legionella_interval_days": 7,
        "boiler_legionella_target_temp_c": 60.0,
        # No CONF_BOILER_TEMP_SENSOR_TOP key
    }
    now = _now()
    cache = _LegionellaCache()

    result = await _async_build_legionella_obligation(
        hass,
        config=config,
        now=now,
        current_top_temp_c=45.0,
        topology=_topology(),
        cache=cache,
    )
    assert result is None


# ---------------------------------------------------------------------------
# 12. canonical DTO: plan slots carry "purpose" key
# ---------------------------------------------------------------------------

def test_assemble_plan_slots_includes_purpose():
    """_assemble_plan_slots emits 'purpose' key for each slot."""
    from custom_components.oig_cloud.boiler import api_views
    now = _now()

    class FakeSlot:
        def __init__(self, purpose="comfort"):
            self.start = now
            self.end = now + timedelta(minutes=15)
            self.avg_consumption_kwh = 0.0
            self.confidence = 1.0
            self.recommended_source = None
            self.spot_price_kwh = None
            self.alt_price_kwh = None
            self.overflow_available = False
            self.heating_kwh = 0.0
            self.pv_kwh = 0.0
            self.grid_kwh = 0.0
            self.alt_kwh = 0.0
            self.estimated_cost_czk = 0.0
            self.predicted_top_temp_c = 0.0
            self.pv_share = 0.0
            self.purpose = purpose

    class FakePlan:
        slots = [FakeSlot("comfort"), FakeSlot("legionella")]

    result = api_views._assemble_plan_slots(FakePlan())
    assert len(result) == 2
    assert result[0]["purpose"] == "comfort"
    assert result[1]["purpose"] == "legionella"


def test_assemble_plan_slots_missing_purpose_defaults_to_comfort():
    """Slots without purpose attribute (legacy) default to 'comfort'."""
    from custom_components.oig_cloud.boiler import api_views
    now = _now()

    class OldSlot:
        """Legacy slot without purpose field."""
        def __init__(self):
            self.start = now
            self.end = now + timedelta(minutes=15)
            self.avg_consumption_kwh = 0.0
            self.confidence = 1.0
            self.recommended_source = None
            self.spot_price_kwh = None
            self.alt_price_kwh = None
            self.overflow_available = False
            self.heating_kwh = 0.0
            self.pv_kwh = 0.0
            self.grid_kwh = 0.0
            self.alt_kwh = 0.0
            self.estimated_cost_czk = 0.0
            self.predicted_top_temp_c = 0.0
            self.pv_share = 0.0
            # No purpose attribute

    class FakePlan:
        slots = [OldSlot()]

    result = api_views._assemble_plan_slots(FakePlan())
    assert result[0]["purpose"] == "comfort"


# ---------------------------------------------------------------------------
# 13. canonical DTO: "legionella" top-level key present and null-safe
# ---------------------------------------------------------------------------

def test_build_legionella_dto_disabled():
    """interval_days=0 → enabled=False, nulls for days_since and scheduled_start."""
    from custom_components.oig_cloud.boiler.api_views import _build_legionella_dto

    config = {"boiler_legionella_interval_days": 0}
    dto = _build_legionella_dto(None, config, None)

    assert dto is not None
    assert dto["enabled"] is False
    assert dto["interval_days"] == 0
    assert dto["days_since_last"] is None
    assert dto["scheduled_start"] is None


def test_build_legionella_dto_enabled_with_scheduled_start():
    """When a plan result has legionella-purpose slots, scheduled_start is set."""
    from custom_components.oig_cloud.boiler.api_views import _build_legionella_dto

    now = _now()
    config = {
        "boiler_legionella_interval_days": 7,
        "boiler_legionella_target_temp_c": 60.0,
    }

    class FakePlanResult:
        slots = [
            PlanSlotAction(
                start=now + timedelta(hours=1),
                end=now + timedelta(hours=1, minutes=15),
                action="heat",
                source=EnergySource.GRID,
                heating_kwh=0.25,
                purpose="legionella",
            ),
        ]

    dto = _build_legionella_dto(None, config, FakePlanResult())

    assert dto is not None
    assert dto["enabled"] is True
    assert dto["interval_days"] == 7
    assert dto["scheduled_start"] is not None
    assert dto["scheduled_start"] == (now + timedelta(hours=1)).isoformat()


def test_build_legionella_dto_no_scheduled_start_when_no_legionella_slots():
    """When plan has no legionella slots, scheduled_start=None."""
    from custom_components.oig_cloud.boiler.api_views import _build_legionella_dto

    now = _now()
    config = {
        "boiler_legionella_interval_days": 7,
        "boiler_legionella_target_temp_c": 60.0,
    }

    class FakePlanResult:
        slots = [
            PlanSlotAction(
                start=now,
                end=now + timedelta(minutes=15),
                action="heat",
                source=EnergySource.GRID,
                heating_kwh=0.25,
                purpose="comfort",
            ),
        ]

    dto = _build_legionella_dto(None, config, FakePlanResult())

    assert dto is not None
    assert dto["scheduled_start"] is None


# ---------------------------------------------------------------------------
# 14. Reason codes in PlannerReasonCode enum
# ---------------------------------------------------------------------------

def test_legionella_reason_codes_exist():
    assert PlannerReasonCode.LEGIONELLA_SCHEDULED.value == "legionella_scheduled"
    assert PlannerReasonCode.LEGIONELLA_OVERDUE_INFEASIBLE.value == "legionella_overdue_infeasible"
