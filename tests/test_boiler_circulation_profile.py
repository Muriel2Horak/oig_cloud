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
    with patch.object(boiler_runtime, "_build_demand_targets", return_value=targets), \
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
    with patch.object(boiler_runtime, "_build_demand_targets", return_value=targets), \
            patch.object(boiler_runtime.dt_util, "now", return_value=now), \
            patch.object(boiler_runtime, "_async_actuate_circulation_pump", AsyncMock(return_value=True)) as act:
        await rt._async_tick_circulation_pump()
    act.assert_not_awaited()
