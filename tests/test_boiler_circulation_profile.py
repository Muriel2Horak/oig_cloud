"""Circulation from the draw profile: holidays, tomorrow's runs, presence."""

from __future__ import annotations

from datetime import datetime
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


# ── a run before every expected draw, small ones too (22. 11. 2026) ──

from custom_components.oig_cloud.boiler.demand_profiler import _block_draw_probability  # noqa: E402


def test_draw_probability_counts_days_per_half_hour():
    days = {
        "d1": {48: 0.1},          # 12:00
        "d2": {49: 0.05},         # 12:15: same half hour, a few minutes later
        "d3": {},
        "d4": {80: 0.5},          # 20:00
    }
    probability = _block_draw_probability(days, 2)
    assert len(probability) == 48
    assert probability[24] == 0.5   # 12:00-12:30 on two of four days
    assert probability[40] == 0.25  # 20:00-20:30
    assert probability[0] == 0.0


def _profiler(probabilities_today, probabilities_tomorrow=None, level="exact"):
    demand_map = SimpleNamespace(confidence=1.0, meta=SimpleNamespace(level=level))
    profiler = MagicMock()
    profiler.get_demand_map.return_value = demand_map
    profiler.draw_probability.side_effect = [
        probabilities_today,
        probabilities_tomorrow if probabilities_tomorrow is not None else probabilities_today,
    ]
    return SimpleNamespace(_demand_profiler=profiler)


def _half_hours(**share):
    """48 half-hour shares from {"HHMM": share}."""
    out = [0.0] * 48
    for key, value in share.items():
        out[int(key[1:3]) * 2 + int(key[3:5]) // 30] = value
    return out


def test_every_half_hour_with_enough_draw_history_gets_a_run():
    # Weekend autumn on the reference household (share of days with a draw).
    weekend = _half_hours(t0700=0.41, t0730=0.41, t1300=0.18, t1230=0.06, t1530=0.18, t2030=0.35)
    coordinator = _profiler(weekend)
    targets = boiler_runtime._build_draw_targets(
        coordinator=coordinator, now=_dt(22, 6), horizon_hours=30, min_probability=0.10
    )
    starts = [t.start for t in targets]
    # 12:30 (one day in seventeen) stays out; tomorrow's 07:00 is within 30 h.
    assert starts == [
        _dt(22, 7), _dt(22, 7, 30), _dt(22, 13), _dt(22, 15, 30), _dt(22, 20, 30),
        _dt(23, 7), _dt(23, 7, 30),
    ]
    # The loop needs 20 minutes: each run starts 20 minutes before its half hour.
    runs = build_circulation_runs(targets, _dt(22, 6), lead_min=20, run_min=20, max_runs=20, min_gap_min=10)
    assert [(r[0], r[1]) for r in runs][:3] == [
        (_dt(22, 6, 40), _dt(22, 7)),
        (_dt(22, 7, 10), _dt(22, 7, 30)),
        (_dt(22, 12, 40), _dt(22, 13)),
    ]


def test_no_runs_from_a_bootstrap_profile():
    coordinator = _profiler(_half_hours(t0700=1.0), level="bootstrap")
    assert boiler_runtime._build_draw_targets(
        coordinator=coordinator, now=_dt(22, 6), horizon_hours=30
    ) == []
