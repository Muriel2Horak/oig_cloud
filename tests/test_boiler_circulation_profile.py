"""Circulation from the draw profile: holidays, tomorrow's runs, presence."""

from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.boiler.circulation import build_circulation_runs
from custom_components.oig_cloud.boiler.demand_profiler import _get_day_category
from custom_components.oig_cloud.boiler.planner_contract import DemandTarget
from custom_components.oig_cloud.boiler import runtime as boiler_runtime

TZ = dt_util.get_time_zone("Europe/Prague")


def _dt(day, hour, minute=0):
    return datetime(2026, 11, day, hour, minute, tzinfo=TZ)


def test_a_public_holiday_is_planned_like_a_weekend():
    assert _get_day_category(_dt(17, 6)).startswith("weekend")  # Tue, Den boje za svobodu
    assert _get_day_category(_dt(18, 6)).startswith("workday")
    assert _get_day_category(_dt(21, 6)).startswith("weekend")


def test_an_evening_schedule_already_has_tomorrows_morning_run():
    now = _dt(16, 22)
    targets = [
        DemandTarget(start=_dt(16, 20), required_kwh=1.0, label="today_evening"),
        DemandTarget(start=_dt(17, 7, 15), required_kwh=1.0, label="tomorrow_morning"),
    ]
    runs = build_circulation_runs(targets, now, lead_min=15, run_min=15, max_runs=3, min_gap_min=120)
    assert runs == [(_dt(17, 7), _dt(17, 7, 15), "tomorrow_morning")]


def test_the_daily_cap_counts_each_day_on_its_own():
    now = _dt(16, 5)
    targets = [DemandTarget(start=_dt(16, h), required_kwh=1.0, label=f"a{h}") for h in (6, 9, 12, 20)]
    targets += [DemandTarget(start=_dt(17, 6, 30), required_kwh=1.0, label="next")]
    runs = build_circulation_runs(targets, now, lead_min=15, run_min=10, max_runs=3, min_gap_min=120)
    labels = [r[2] for r in runs]
    assert labels == ["a6", "a9", "a12"]  # 24 h horizon ends before 17. 06:15


@pytest.mark.parametrize(
    ("state", "home"),
    [(None, True), ("0", False), ("2", True), ("home", True), ("not_home", False),
     ("on", True), ("off", False), ("unavailable", True)],
)
def test_someone_home(state, home):
    hass = SimpleNamespace(states=SimpleNamespace(
        get=lambda _e: None if state is None else SimpleNamespace(state=state)))
    assert boiler_runtime._someone_home(hass, "zone.home") is home
    assert boiler_runtime._someone_home(hass, None) is True


def _runtime(config, pump_state="off", presence=None):
    states = {"switch.pump": SimpleNamespace(state=pump_state)}
    if presence is not None:
        states["zone.home"] = SimpleNamespace(state=presence)
    hass = MagicMock()
    hass.states.get = lambda e: states.get(e)
    coordinator = MagicMock()
    coordinator.config = config
    coordinator._demand_profiler = object()
    read_model = MagicMock()
    rt = boiler_runtime.BoilerRuntime(
        hass=hass, read_model=read_model, planner=MagicMock(), actuator=MagicMock(),
        energy_adapter=MagicMock(), coordinator=coordinator, box_id="b", entry_id="e", serializer=None,
    )
    return rt


CONFIG = {
    "boiler_circulation_enabled": True,
    "boiler_circulation_pump_switch_entity": "switch.pump",
    "boiler_circulation_lead_minutes": 15,
    "boiler_circulation_run_minutes": 15,
}


@pytest.mark.asyncio
async def test_tick_rebuilds_the_schedule_and_runs_the_pump():
    now = _dt(18, 6, 50)
    rt = _runtime(CONFIG)
    targets = [DemandTarget(start=_dt(18, 7), required_kwh=1.0, label="today_morning")]
    with patch.object(boiler_runtime, "_build_draw_targets", return_value=targets), \
            patch.object(boiler_runtime.dt_util, "now", return_value=now), \
            patch.object(boiler_runtime, "_async_actuate_circulation_pump", AsyncMock(return_value=True)) as act:
        await rt._async_tick_circulation_pump()
    assert rt._circulation_runs == [(_dt(18, 6, 45), _dt(18, 7), "today_morning")]
    act.assert_awaited_once()
    assert act.await_args.kwargs["turn_on"] is True


@pytest.mark.asyncio
async def test_nobody_home_means_no_circulation():
    now = _dt(18, 6, 50)
    rt = _runtime({**CONFIG, "boiler_circulation_presence_entity": "zone.home"}, presence="0")
    targets = [DemandTarget(start=_dt(18, 7), required_kwh=1.0, label="today_morning")]
    with patch.object(boiler_runtime, "_build_draw_targets", return_value=targets), \
            patch.object(boiler_runtime.dt_util, "now", return_value=now), \
            patch.object(boiler_runtime, "_async_actuate_circulation_pump", AsyncMock(return_value=True)) as act:
        await rt._async_tick_circulation_pump()
    act.assert_not_awaited()


# ── keeping the loop warm through the day (22. 11. 2026: cold water all day) ──

from custom_components.oig_cloud.boiler.circulation import (  # noqa: E402
    active_span,
    build_keep_warm_runs,
    merge_runs,
)

# Weekend autumn p80 on the reference household: draws 07:15-09:15, 19:30-20:45
# and a small one at 22:00.
WEEKEND_P80 = [0.0] * 96
for _slot, _kwh in {29: 0.03, 30: 0.2, 32: 0.45, 33: 0.34, 34: 0.72, 35: 0.07, 36: 0.15,
                    37: 0.05, 78: 0.04, 79: 0.43, 80: 0.12, 81: 0.02, 82: 0.61, 83: 0.04,
                    88: 0.02}.items():
    WEEKEND_P80[_slot] = _kwh


def test_active_hours_run_from_the_first_to_the_last_draw():
    midnight = _dt(22, 0)
    assert active_span(WEEKEND_P80, midnight, lead_min=15) == (_dt(22, 7), _dt(22, 22, 15))
    assert active_span([0.0] * 96, midnight, lead_min=15) is None


def test_keep_warm_alternates_run_and_pause_through_the_span():
    now = _dt(22, 10, 3)
    runs = build_keep_warm_runs([(_dt(22, 7), _dt(22, 22, 15))], now, run_min=15, pause_min=15)
    # The 10:00 run is still on; one every half hour until the span ends.
    assert runs[0] == (_dt(22, 10), _dt(22, 10, 15), "keep_warm")
    assert runs[1][0] == _dt(22, 10, 30)
    assert runs[-1] == (_dt(22, 22), _dt(22, 22, 15), "keep_warm")
    assert len(runs) == 25


def test_runs_before_draws_and_keep_warm_runs_merge():
    merged = merge_runs([
        (_dt(22, 7), _dt(22, 7, 15), "keep_warm"),
        (_dt(22, 7, 10), _dt(22, 7, 25), "today_morning"),
        (_dt(22, 8), _dt(22, 8, 15), "keep_warm"),
    ])
    assert merged == [
        (_dt(22, 7), _dt(22, 7, 25), "keep_warm"),
        (_dt(22, 8), _dt(22, 8, 15), "keep_warm"),
    ]


def test_schedule_adds_keep_warm_only_when_switched_on():
    now = _dt(22, 10, 3)
    spans = [(_dt(22, 7), _dt(22, 22, 15))]
    targets = [DemandTarget(start=_dt(22, 19, 45), required_kwh=0.5, label="today_evening")]
    config = {**CONFIG, "boiler_circulation_run_minutes": 15}
    off = boiler_runtime._build_circulation_schedule(
        demand_targets=targets, now=now, config=config, active_spans=spans
    )
    assert off == [(_dt(22, 19, 30), _dt(22, 19, 45), "today_evening")]
    on = boiler_runtime._build_circulation_schedule(
        demand_targets=targets,
        now=now,
        config={**config, "boiler_circulation_keep_warm": True},
        active_spans=spans,
    )
    assert len(on) == 25
    assert all(b - a == timedelta(minutes=15) for a, b, _ in on)


def test_active_spans_follow_each_days_profile():
    slots = [SimpleNamespace(p80_kwh=v) for v in WEEKEND_P80]
    good = SimpleNamespace(slots=slots, confidence=1.0, meta=SimpleNamespace(level="exact"))
    bootstrap = SimpleNamespace(slots=slots, confidence=1.0, meta=SimpleNamespace(level="bootstrap"))
    profiler = MagicMock()
    profiler.get_demand_map.side_effect = [good, bootstrap]
    coordinator = SimpleNamespace(_demand_profiler=profiler)
    spans = boiler_runtime._build_active_spans(coordinator=coordinator, now=_dt(22, 10), lead_min=15)
    assert spans == [(_dt(22, 7), _dt(22, 22, 15))]  # tomorrow's bootstrap profile gives none


def test_every_draw_of_the_profile_gets_a_run_not_only_the_windows():
    """22. 11. 2026: circulation must run before the small draws too."""
    slots = [SimpleNamespace(p80_kwh=v) for v in WEEKEND_P80]
    good = SimpleNamespace(slots=slots, confidence=1.0, meta=SimpleNamespace(level="exact"))
    profiler = MagicMock()
    profiler.get_demand_map.side_effect = [good, good]
    coordinator = SimpleNamespace(_demand_profiler=profiler)
    targets = boiler_runtime._build_draw_targets(coordinator=coordinator, now=_dt(22, 6), horizon_hours=30)
    starts = [t.start for t in targets]
    # 07:15-07:30, 08:00-09:15, 19:30-20:45 and the small 22:00 draw; then tomorrow's morning.
    assert starts[:4] == [_dt(22, 7, 15), _dt(22, 8), _dt(22, 19, 30), _dt(22, 22)]
    assert starts[4] == _dt(23, 7, 15)
    # 20 minutes for the loop to warm up: every draw gets its own run.
    runs = build_circulation_runs(targets, _dt(22, 6), lead_min=20, run_min=20, max_runs=20, min_gap_min=10)
    assert [r[0] for r in runs][:4] == [_dt(22, 6, 55), _dt(22, 7, 40), _dt(22, 19, 10), _dt(22, 21, 40)]
