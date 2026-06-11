"""R5: Circulation pre-peak scheduling tests.

Covers:
- build_circulation_runs: lead timing, cap at max_runs, min_gap deduplication,
  day boundary filtering, only future-or-active runs, empty demand list
- is_circulation_recommended: True inside window, False outside, False no schedule
- Disabled feature → empty schedule + no service calls
- Pump entity missing → CIRCULATION_PUMP_UNAVAILABLE reason code emitted
- turn_on / turn_off boundaries with mocked hass services
- Manual-control non-interference (we only turn_off what we turned on)
- DTO: circulation_runs empty when disabled, populated when enabled
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.oig_cloud.boiler.circulation import (
    build_circulation_runs,
    is_circulation_recommended,
)
from custom_components.oig_cloud.boiler.planner_contract import (
    DemandTarget,
    PlannerReasonCode,
)


_UTC = timezone.utc

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _dt(hour: int, minute: int = 0, tz: timezone = _UTC) -> datetime:
    """Return a UTC datetime at 2026-06-11 HH:MM."""
    return datetime(2026, 6, 11, hour, minute, 0, tzinfo=tz)


def _target(hour: int, label: str = "peak") -> DemandTarget:
    return DemandTarget(
        start=_dt(hour),
        required_kwh=1.0,
        label=label,
    )


# ---------------------------------------------------------------------------
# build_circulation_runs — pure scheduling
# ---------------------------------------------------------------------------


class TestBuildCirculationRuns:
    def test_single_target_lead_15(self) -> None:
        """Run starts 15 min before demand window."""
        now = _dt(7, 0)  # 07:00; demand at 07:30 → run 07:15-07:25
        targets = [_target(7, 30)]
        targets[0] = DemandTarget(start=_dt(7, 30), required_kwh=1.0, label="morning")
        runs = build_circulation_runs(targets, now, lead_min=15, run_min=10, max_runs=3, min_gap_min=120)
        assert len(runs) == 1
        start, end, label = runs[0]
        assert start == _dt(7, 15)
        assert end == _dt(7, 25)
        assert label == "morning"

    def test_only_future_or_active_runs(self) -> None:
        """Runs fully in the past are excluded."""
        now = _dt(10, 0)
        # demand at 09:00 → run 08:45-08:55 (fully past)
        past_target = DemandTarget(start=_dt(9, 0), required_kwh=1.0, label="past")
        # demand at 11:00 → run 10:45-10:55 (future)
        future_target = DemandTarget(start=_dt(11, 0), required_kwh=1.0, label="future")
        runs = build_circulation_runs(
            [past_target, future_target], now, lead_min=15, run_min=10, max_runs=3, min_gap_min=60
        )
        assert len(runs) == 1
        _, _, label = runs[0]
        assert label == "future"

    def test_active_run_included(self) -> None:
        """A run that has already started but not ended is included."""
        now = _dt(10, 17)  # inside 10:15-10:25 window
        target = DemandTarget(start=_dt(10, 30), required_kwh=1.0, label="brunch")
        runs = build_circulation_runs([target], now, lead_min=15, run_min=10, max_runs=3, min_gap_min=60)
        assert len(runs) == 1
        start, end, _ = runs[0]
        assert start <= now < end

    def test_cap_at_max_runs(self) -> None:
        """Max 3 runs per day."""
        targets = [
            DemandTarget(start=_dt(h), required_kwh=1.0, label=f"h{h}")
            for h in [8, 10, 12, 14, 16]
        ]
        now = _dt(7)
        runs = build_circulation_runs(targets, now, lead_min=15, run_min=10, max_runs=3, min_gap_min=30)
        assert len(runs) == 3

    def test_min_gap_deduplication(self) -> None:
        """Targets within min_gap of each other produce only one run."""
        now = _dt(7)
        # Two targets 10 min apart, min_gap=120 → only the first survives.
        t1 = DemandTarget(start=_dt(8, 0), required_kwh=1.0, label="a")
        t2 = DemandTarget(start=_dt(8, 10), required_kwh=1.0, label="b")
        runs = build_circulation_runs([t1, t2], now, lead_min=15, run_min=10, max_runs=3, min_gap_min=120)
        assert len(runs) == 1
        _, _, label = runs[0]
        assert label == "a"

    def test_min_gap_allows_spaced_runs(self) -> None:
        """Targets far apart both get runs."""
        now = _dt(6)
        t1 = DemandTarget(start=_dt(8, 0), required_kwh=1.0, label="morning")
        t2 = DemandTarget(start=_dt(12, 0), required_kwh=1.0, label="noon")
        runs = build_circulation_runs([t1, t2], now, lead_min=15, run_min=10, max_runs=3, min_gap_min=120)
        assert len(runs) == 2

    def test_empty_targets_returns_empty(self) -> None:
        runs = build_circulation_runs([], _dt(8), lead_min=15, run_min=10, max_runs=3, min_gap_min=120)
        assert runs == []

    def test_max_runs_zero_returns_empty(self) -> None:
        targets = [DemandTarget(start=_dt(9), required_kwh=1.0, label="x")]
        runs = build_circulation_runs(targets, _dt(8), lead_min=15, run_min=10, max_runs=0, min_gap_min=60)
        assert runs == []

    def test_run_duration(self) -> None:
        """run_min controls duration exactly."""
        now = _dt(7)
        target = DemandTarget(start=_dt(8), required_kwh=1.0, label="x")
        runs = build_circulation_runs([target], now, lead_min=20, run_min=5, max_runs=3, min_gap_min=60)
        assert len(runs) == 1
        start, end, _ = runs[0]
        assert (end - start) == timedelta(minutes=5)
        assert start == _dt(7, 40)

    def test_chronological_sorting(self) -> None:
        """Targets are sorted chronologically regardless of input order."""
        now = _dt(7)
        t_late = DemandTarget(start=_dt(12), required_kwh=1.0, label="late")
        t_early = DemandTarget(start=_dt(9), required_kwh=1.0, label="early")
        runs = build_circulation_runs(
            [t_late, t_early], now, lead_min=15, run_min=10, max_runs=3, min_gap_min=30
        )
        labels = [r[2] for r in runs]
        assert labels == ["early", "late"]


# ---------------------------------------------------------------------------
# is_circulation_recommended
# ---------------------------------------------------------------------------


class TestIsCirculationRecommended:
    def test_false_when_no_schedule(self) -> None:
        assert is_circulation_recommended(None, _dt(10)) is False

    def test_false_when_schedule_empty(self) -> None:
        assert is_circulation_recommended(None, _dt(10), schedule=[]) is False

    def test_false_when_now_is_none(self) -> None:
        run = (_dt(10), _dt(10, 10), "x")
        assert is_circulation_recommended(None, None, schedule=[run]) is False

    def test_true_inside_window(self) -> None:
        run = (_dt(10), _dt(10, 10), "peak")
        now = _dt(10, 5)
        assert is_circulation_recommended(None, now, schedule=[run]) is True

    def test_false_before_window(self) -> None:
        run = (_dt(10), _dt(10, 10), "peak")
        assert is_circulation_recommended(None, _dt(9, 59), schedule=[run]) is False

    def test_false_at_or_after_end(self) -> None:
        run = (_dt(10), _dt(10, 10), "peak")
        # end is exclusive
        assert is_circulation_recommended(None, _dt(10, 10), schedule=[run]) is False

    def test_profile_parameter_ignored(self) -> None:
        """profile param is accepted for backward compat but not used."""
        run = (_dt(10), _dt(10, 10), "peak")
        profile = object()
        assert is_circulation_recommended(profile, _dt(10, 5), schedule=[run]) is True


# ---------------------------------------------------------------------------
# _build_circulation_schedule integration (via runtime.py helper)
# ---------------------------------------------------------------------------


class TestBuildCirculationScheduleHelper:
    def test_disabled_returns_empty(self) -> None:
        from custom_components.oig_cloud.boiler.runtime import _build_circulation_schedule
        from custom_components.oig_cloud.const import CONF_BOILER_CIRCULATION_ENABLED

        targets = [DemandTarget(start=_dt(9), required_kwh=1.0, label="x")]
        config = {CONF_BOILER_CIRCULATION_ENABLED: False}
        result = _build_circulation_schedule(demand_targets=targets, now=_dt(8), config=config)
        assert result == []

    def test_enabled_with_targets(self) -> None:
        from custom_components.oig_cloud.boiler.runtime import _build_circulation_schedule
        from custom_components.oig_cloud.const import (
            CONF_BOILER_CIRCULATION_ENABLED,
            CONF_BOILER_CIRCULATION_LEAD_MINUTES,
            CONF_BOILER_CIRCULATION_RUN_MINUTES,
            CONF_BOILER_CIRCULATION_MAX_RUNS_PER_DAY,
            CONF_BOILER_CIRCULATION_MIN_GAP_MINUTES,
        )

        targets = [DemandTarget(start=_dt(9), required_kwh=1.0, label="morning")]
        config = {
            CONF_BOILER_CIRCULATION_ENABLED: True,
            CONF_BOILER_CIRCULATION_LEAD_MINUTES: 15,
            CONF_BOILER_CIRCULATION_RUN_MINUTES: 10,
            CONF_BOILER_CIRCULATION_MAX_RUNS_PER_DAY: 3,
            CONF_BOILER_CIRCULATION_MIN_GAP_MINUTES: 120,
        }
        result = _build_circulation_schedule(demand_targets=targets, now=_dt(8), config=config)
        assert len(result) == 1
        start, end, label = result[0]
        assert start == _dt(8, 45)
        assert end == _dt(8, 55)
        assert label == "morning"

    def test_empty_targets_returns_empty_even_when_enabled(self) -> None:
        from custom_components.oig_cloud.boiler.runtime import _build_circulation_schedule
        from custom_components.oig_cloud.const import CONF_BOILER_CIRCULATION_ENABLED

        config = {CONF_BOILER_CIRCULATION_ENABLED: True}
        result = _build_circulation_schedule(demand_targets=[], now=_dt(8), config=config)
        assert result == []


# ---------------------------------------------------------------------------
# _async_actuate_circulation_pump
# ---------------------------------------------------------------------------


class TestAsyncActuateCirculationPump:
    @pytest.mark.asyncio
    async def test_turn_on_success(self) -> None:
        from custom_components.oig_cloud.boiler.runtime import _async_actuate_circulation_pump

        hass = MagicMock()
        hass.services = MagicMock()
        hass.services.async_call = AsyncMock(return_value=None)

        mock_state = MagicMock()
        mock_state.state = "off"
        hass.states = MagicMock()
        hass.states.get = MagicMock(return_value=mock_state)

        result = await _async_actuate_circulation_pump(hass, pump_entity="switch.pump", turn_on=True)
        assert result is True
        hass.services.async_call.assert_called_once_with(
            "switch", "turn_on", {"entity_id": "switch.pump"}, blocking=False
        )

    @pytest.mark.asyncio
    async def test_turn_off_success(self) -> None:
        from custom_components.oig_cloud.boiler.runtime import _async_actuate_circulation_pump

        hass = MagicMock()
        hass.services = MagicMock()
        hass.services.async_call = AsyncMock(return_value=None)

        mock_state = MagicMock()
        mock_state.state = "on"
        hass.states = MagicMock()
        hass.states.get = MagicMock(return_value=mock_state)

        result = await _async_actuate_circulation_pump(hass, pump_entity="switch.pump", turn_on=False)
        assert result is True
        hass.services.async_call.assert_called_once_with(
            "switch", "turn_off", {"entity_id": "switch.pump"}, blocking=False
        )

    @pytest.mark.asyncio
    async def test_turn_on_blocked_when_unavailable(self) -> None:
        """Should not call service when entity is unavailable."""
        from custom_components.oig_cloud.boiler.runtime import _async_actuate_circulation_pump

        hass = MagicMock()
        hass.services = MagicMock()
        hass.services.async_call = AsyncMock(return_value=None)

        mock_state = MagicMock()
        mock_state.state = "unavailable"
        hass.states = MagicMock()
        hass.states.get = MagicMock(return_value=mock_state)

        result = await _async_actuate_circulation_pump(hass, pump_entity="switch.pump", turn_on=True)
        assert result is False
        hass.services.async_call.assert_not_called()

    @pytest.mark.asyncio
    async def test_empty_pump_entity_returns_false(self) -> None:
        from custom_components.oig_cloud.boiler.runtime import _async_actuate_circulation_pump

        hass = MagicMock()
        result = await _async_actuate_circulation_pump(hass, pump_entity="", turn_on=True)
        assert result is False


# ---------------------------------------------------------------------------
# _async_tick_circulation_pump on BoilerRuntime
# ---------------------------------------------------------------------------


def _make_runtime(
    *,
    config: dict[str, Any],
    pump_state: str = "off",
) -> Any:
    """Build a minimal BoilerRuntime-like object for pump tick tests."""
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime

    hass = MagicMock()
    hass.services = MagicMock()
    hass.services.async_call = AsyncMock(return_value=None)

    # states.get returns our mock state for any entity
    mock_state = MagicMock()
    mock_state.state = pump_state
    hass.states = MagicMock()
    hass.states.get = MagicMock(return_value=mock_state)

    coordinator = MagicMock()
    coordinator.config = config

    # Minimal protocol stubs
    read_model = MagicMock()
    read_model.get_current_profile = MagicMock(return_value=None)
    read_model.get_current_plan = MagicMock(return_value=None)
    read_model.async_ensure_profile = AsyncMock(return_value=None)

    planner = MagicMock()
    actuator = MagicMock()
    energy_adapter = MagicMock()

    runtime = BoilerRuntime(
        hass=hass,
        read_model=read_model,
        planner=planner,
        actuator=actuator,
        energy_adapter=energy_adapter,
        coordinator=coordinator,
        box_id="test",
        entry_id="entry_test",
        serializer=None,
    )
    return runtime


class TestAsyncTickCirculationPump:
    @pytest.mark.asyncio
    async def test_disabled_no_service_call(self) -> None:
        """When feature is disabled, no service calls are made."""
        from custom_components.oig_cloud.const import CONF_BOILER_CIRCULATION_ENABLED

        runtime = _make_runtime(config={CONF_BOILER_CIRCULATION_ENABLED: False})
        await runtime._async_tick_circulation_pump()
        runtime.hass.services.async_call.assert_not_called()

    @pytest.mark.asyncio
    async def test_pump_entity_missing_emits_reason_code(self) -> None:
        """When entity is not in states, CIRCULATION_PUMP_UNAVAILABLE is emitted."""
        from custom_components.oig_cloud.const import (
            CONF_BOILER_CIRCULATION_ENABLED,
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
        )
        from custom_components.oig_cloud.boiler.planner_core import PlanResult

        runtime = _make_runtime(
            config={
                CONF_BOILER_CIRCULATION_ENABLED: True,
                CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.missing_pump",
            }
        )
        # states.get returns None for missing entity
        runtime.hass.states.get = MagicMock(return_value=None)

        # Give runtime a mock last_plan_result to receive reason codes
        mock_result = MagicMock()
        mock_result.reason_codes = []
        runtime.last_plan_result = mock_result

        await runtime._async_tick_circulation_pump()
        assert PlannerReasonCode.CIRCULATION_PUMP_UNAVAILABLE in mock_result.reason_codes

    @pytest.mark.asyncio
    async def test_turn_on_when_inside_run(self) -> None:
        """Pump is turned on when now is inside a scheduled run."""
        from custom_components.oig_cloud.const import (
            CONF_BOILER_CIRCULATION_ENABLED,
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
        )

        now = _dt(8, 50)  # inside 08:45-08:55 run
        run_start = _dt(8, 45)
        run_end = _dt(8, 55)

        runtime = _make_runtime(
            config={
                CONF_BOILER_CIRCULATION_ENABLED: True,
                CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.circ_pump",
            }
        )
        runtime._circulation_runs = [(run_start, run_end, "morning")]

        with patch("custom_components.oig_cloud.boiler.runtime.dt_util") as mock_dt:
            mock_dt.now.return_value = now
            await runtime._async_tick_circulation_pump()

        runtime.hass.services.async_call.assert_called_once_with(
            "switch", "turn_on", {"entity_id": "switch.circ_pump"}, blocking=False
        )
        assert runtime._circulation_pump_on is True

    @pytest.mark.asyncio
    async def test_turn_off_when_leaving_run(self) -> None:
        """Pump is turned off when we previously turned it on and now is outside run."""
        from custom_components.oig_cloud.const import (
            CONF_BOILER_CIRCULATION_ENABLED,
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
        )

        now = _dt(9, 5)  # after 08:45-08:55
        run_start = _dt(8, 45)
        run_end = _dt(8, 55)

        runtime = _make_runtime(
            config={
                CONF_BOILER_CIRCULATION_ENABLED: True,
                CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.circ_pump",
            }
        )
        runtime._circulation_runs = [(run_start, run_end, "morning")]
        runtime._circulation_pump_on = True  # we turned it on previously

        with patch("custom_components.oig_cloud.boiler.runtime.dt_util") as mock_dt:
            mock_dt.now.return_value = now
            await runtime._async_tick_circulation_pump()

        runtime.hass.services.async_call.assert_called_once_with(
            "switch", "turn_off", {"entity_id": "switch.circ_pump"}, blocking=False
        )
        assert runtime._circulation_pump_on is False

    @pytest.mark.asyncio
    async def test_manual_control_non_interference(self) -> None:
        """We do NOT turn off a pump that we did NOT turn on."""
        from custom_components.oig_cloud.const import (
            CONF_BOILER_CIRCULATION_ENABLED,
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
        )

        now = _dt(9, 5)  # outside any run
        runtime = _make_runtime(
            config={
                CONF_BOILER_CIRCULATION_ENABLED: True,
                CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.circ_pump",
            }
        )
        # pump is on (manually), but _circulation_pump_on is False (we didn't turn it on)
        runtime._circulation_pump_on = False
        runtime._circulation_runs = []

        with patch("custom_components.oig_cloud.boiler.runtime.dt_util") as mock_dt:
            mock_dt.now.return_value = now
            await runtime._async_tick_circulation_pump()

        runtime.hass.services.async_call.assert_not_called()

    @pytest.mark.asyncio
    async def test_no_double_turn_on_inside_same_run(self) -> None:
        """Pump is NOT turned on again if _circulation_pump_on is already True."""
        from custom_components.oig_cloud.const import (
            CONF_BOILER_CIRCULATION_ENABLED,
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
        )

        now = _dt(8, 50)
        run_start = _dt(8, 45)
        run_end = _dt(8, 55)

        runtime = _make_runtime(
            config={
                CONF_BOILER_CIRCULATION_ENABLED: True,
                CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.circ_pump",
            }
        )
        runtime._circulation_runs = [(run_start, run_end, "morning")]
        runtime._circulation_pump_on = True  # already on

        with patch("custom_components.oig_cloud.boiler.runtime.dt_util") as mock_dt:
            mock_dt.now.return_value = now
            await runtime._async_tick_circulation_pump()

        runtime.hass.services.async_call.assert_not_called()

    @pytest.mark.asyncio
    async def test_disabled_mid_flight_turns_off(self) -> None:
        """Feature disabled mid-flight: turn off pump if we turned it on."""
        from custom_components.oig_cloud.const import (
            CONF_BOILER_CIRCULATION_ENABLED,
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
        )

        runtime = _make_runtime(
            config={
                CONF_BOILER_CIRCULATION_ENABLED: False,  # disabled
                CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.circ_pump",
            }
        )
        runtime._circulation_pump_on = True  # we had turned it on before disabling

        await runtime._async_tick_circulation_pump()

        # Should attempt turn_off
        runtime.hass.services.async_call.assert_called_once_with(
            "switch", "turn_off", {"entity_id": "switch.circ_pump"}, blocking=False
        )
        assert runtime._circulation_pump_on is False


# ---------------------------------------------------------------------------
# DTO: canonical API circulation_runs field
# ---------------------------------------------------------------------------


class TestCirculationRunsDto:
    def test_disabled_returns_empty_list(self) -> None:
        from custom_components.oig_cloud.boiler.api_views import _build_circulation_runs_dto
        from custom_components.oig_cloud.const import CONF_BOILER_CIRCULATION_ENABLED

        runtime = MagicMock()
        runtime._circulation_runs = [(
            _dt(8, 45), _dt(8, 55), "morning"
        )]
        config = {CONF_BOILER_CIRCULATION_ENABLED: False}
        result = _build_circulation_runs_dto(runtime, config)
        assert result == []

    def test_enabled_returns_serialised_runs(self) -> None:
        from custom_components.oig_cloud.boiler.api_views import _build_circulation_runs_dto
        from custom_components.oig_cloud.const import CONF_BOILER_CIRCULATION_ENABLED

        run_start = _dt(8, 45)
        run_end = _dt(8, 55)
        runtime = MagicMock()
        runtime._circulation_runs = [(run_start, run_end, "morning")]
        config = {CONF_BOILER_CIRCULATION_ENABLED: True}
        result = _build_circulation_runs_dto(runtime, config)
        assert len(result) == 1
        assert result[0]["start"] == run_start.isoformat()
        assert result[0]["end"] == run_end.isoformat()
        assert result[0]["label"] == "morning"

    def test_none_runtime_returns_empty(self) -> None:
        from custom_components.oig_cloud.boiler.api_views import _build_circulation_runs_dto
        from custom_components.oig_cloud.const import CONF_BOILER_CIRCULATION_ENABLED

        config = {CONF_BOILER_CIRCULATION_ENABLED: True}
        result = _build_circulation_runs_dto(None, config)
        assert result == []

    def test_empty_runs_on_runtime_returns_empty_list(self) -> None:
        from custom_components.oig_cloud.boiler.api_views import _build_circulation_runs_dto
        from custom_components.oig_cloud.const import CONF_BOILER_CIRCULATION_ENABLED

        runtime = MagicMock()
        runtime._circulation_runs = []
        config = {CONF_BOILER_CIRCULATION_ENABLED: True}
        result = _build_circulation_runs_dto(runtime, config)
        assert result == []
