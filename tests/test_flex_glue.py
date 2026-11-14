"""The car and boiler wired into the battery forecast cycle."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud.battery_forecast.planning import (
    flex_glue,
    forecast_update as forecast_update_module,
)
from custom_components.oig_cloud.battery_forecast.planning.flex_loads import (
    EvRequest,
    FlexPlan,
)
from custom_components.oig_cloud.battery_forecast.types import (
    DEFAULT_CHARGE_EFFICIENCY,
    CBBMode,
)
from custom_components.oig_cloud.boiler.heating_forecast import (
    BoilerHeatingForecast,
    HeatingSlot,
)
from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES, KEY_EV_RUNTIME
from custom_components.oig_cloud.ev.profile import NextNeed
from custom_components.oig_cloud.ev.runtime import EvRuntime

HOME_1 = CBBMode.HOME_I.value
UPS = CBBMode.HOME_UPS.value
T0 = datetime(2026, 11, 16, 1, 0, tzinfo=timezone.utc)


def _spot(n, price=2.0):
    return [{"time": (T0 + timedelta(minutes=15 * i)).isoformat(), "price": price} for i in range(n)]


def test_priority_parsing_keeps_known_consumers_and_fills_the_rest():
    assert flex_glue.parse_priority("boiler, ev") == ("boiler", "ev", "battery")
    assert flex_glue.parse_priority("junk") == ("ev", "boiler", "battery")
    assert flex_glue.battery_outranks_car({"flex_priority": "battery,ev,boiler"}) is True
    assert flex_glue.battery_outranks_car({}) is False


def test_surplus_after_battery_fills_the_battery_first():
    surplus = flex_glue.estimate_surplus_after_battery(
        [2.0, 2.0, 2.0], [0.5, 0.5, 0.5], soc_kwh=9.0, max_kwh=10.0, min_kwh=2.0
    )
    # 1 kWh of room takes 1/efficiency of the surplus in slot 0; the rest flows out.
    assert surplus[0] == pytest.approx(1.5 - 1.0 / DEFAULT_CHARGE_EFFICIENCY)
    assert surplus[1] == pytest.approx(1.5)
    assert surplus[2] == pytest.approx(1.5)


class _FakeEvRuntime(EvRuntime):
    def __init__(self, request):
        self.request = request
        self.published = []
        self.entry_id = "entry"

    def build_request(self, now=None):
        return self.request

    def publish(self, plan):
        self.published.append(plan)


def _sensor(options=None, ev_request=None, boiler_runtimes=None):
    data: dict[str, Any] = {DOMAIN: {"entry": {}}}
    if ev_request is not None:
        data[DOMAIN]["entry"][KEY_EV_RUNTIME] = _FakeEvRuntime(ev_request)
    if boiler_runtimes:
        data[DOMAIN]["entry"][KEY_BOILER_RUNTIMES] = boiler_runtimes
    hass = SimpleNamespace(data=data, states=SimpleNamespace(get=lambda _e: None))
    return SimpleNamespace(
        hass=hass,
        _config_entry=SimpleNamespace(entry_id="entry", options=options or {}),
    )


def _coordinate(sensor, n=4, **kw):
    values = dict(
        spot_prices=_spot(n),
        export_prices=[],
        solar_kwh=[0.0] * n,
        load_kwh=[0.0] * n,
        current_capacity=8.0,
        max_capacity=15.36,
        min_capacity=3.0,
        charge_rate_kw=6.9,
    )
    values.update(kw)
    return flex_glue.coordinate_flex_loads(sensor, **values)


def test_nothing_to_share_gives_no_plan():
    assert _coordinate(_sensor()) is None


def test_car_plan_is_published_and_blocks_ups():
    request = EvRequest(
        soc_pct=20.0,
        capacity_kwh=25.0,
        charge_limit_pct=100.0,
        max_power_kw=11.0,
        min_power_kw=4.1,
        need=NextNeed(T0 + timedelta(hours=1), 31.0, 0),
    )
    sensor = _sensor(ev_request=request)
    plan = _coordinate(sensor)

    runtime = sensor.hass.data[DOMAIN]["entry"][KEY_EV_RUNTIME]
    assert runtime.published == [plan.ev_plan]
    assert plan.ev_plan.status == "planned"
    assert plan.ups_allowed[0] is False
    assert sensor._flex_plan is plan


def test_boiler_forecast_is_kept_on_its_runtime(monkeypatch):
    forecast = BoilerHeatingForecast(
        method="plan", slots=[HeatingSlot(start=T0, heat_kwh=0.75, electric_kwh=0.75, grid_kwh=0.75)]
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.boiler.heating_forecast_live.boiler_heating_forecast",
        lambda hass, runtime, starts, now=None: forecast,
    )
    runtime = SimpleNamespace()
    plan = _coordinate(_sensor(boiler_runtimes={"k": runtime}))

    assert runtime.heating_forecast is forecast
    assert plan.boiler_grid_kwh[0] == pytest.approx(0.75)


def test_no_breaker_configured_means_no_limit():
    request = EvRequest(20.0, 25.0, 100.0, 11.0, 4.1, NextNeed(T0 + timedelta(hours=1), 31.0, 0))
    plan = _coordinate(_sensor(options={"grid_breaker_a": 0}, ev_request=request))
    assert all(plan.ups_allowed)


# ── _run_planner with a flex plan ─────────────────────────────────────────

FLOOR = forecast_update_module.BoxFloorSnapshot(
    entity_id="sensor.bat_min",
    percent=20.0,
    reason_class=forecast_update_module.BAT_MIN_OK,
    raw_state="20",
    last_updated=None,
    local_mode=True,
)


class _Stop(Exception):
    pass


def test_run_planner_hands_the_battery_reduced_solar_and_ups_blocks(monkeypatch):
    captured = []

    def capture(inputs):
        captured.append(inputs)
        raise _Stop

    monkeypatch.setattr(forecast_update_module, "plan_battery_schedule", capture)
    sensor = SimpleNamespace(_config_entry=SimpleNamespace(options={}), _charging_metrics={})
    flex = FlexPlan(ev_plan=None, solar_for_battery=[0.5, 1.0, 0.0], ups_allowed=[False, True, True])

    forecast_update_module._run_planner(
        sensor, _spot(3), [], [0.25] * 3, [1.0, 1.0, 0.0], 5.0, 15.36, FLOOR, flex_plan=flex
    )

    assert captured[0].solar_forecast == [0.5, 1.0, 0.0]
    assert captured[0].ups_allowed == [False, True, True]


def test_run_planner_without_blocks_passes_no_permissions(monkeypatch):
    captured = []
    monkeypatch.setattr(
        forecast_update_module,
        "plan_battery_schedule",
        lambda inputs: (captured.append(inputs), (_ for _ in ()).throw(_Stop))[1],
    )
    sensor = SimpleNamespace(_config_entry=SimpleNamespace(options={}), _charging_metrics={})
    flex = FlexPlan(ev_plan=None, solar_for_battery=[1.0, 1.0], ups_allowed=[True, True])

    forecast_update_module._run_planner(
        sensor, _spot(2), [], [0.25] * 2, [1.0, 1.0], 5.0, 15.36, FLOOR, flex_plan=flex
    )

    assert captured[0].ups_allowed is None


def test_mode_guard_may_not_put_ups_back_into_a_blocked_slot():
    guarded = [UPS, UPS, UPS]
    planned = [HOME_1, UPS, HOME_1]
    result = forecast_update_module._keep_ups_blocks(guarded, planned, [False, False, True])

    # Slot 0: optimizer chose Home 1, guard re-added UPS -> Home 1.
    # Slot 1: optimizer kept UPS despite the block (hard minimum) -> stays.
    # Slot 2: not blocked -> the guard's choice stands.
    assert result == [HOME_1, UPS, UPS]


def test_non_backup_boiler_adds_only_its_battery_heat_to_the_battery_load():
    slot = SimpleNamespace(start=T0, grid_kwh=0.75, battery_kwh=0.25)
    runtime = SimpleNamespace(last_plan_result=SimpleNamespace(slots=[slot]))
    sensor = _sensor(boiler_runtimes={"k": runtime})

    with_grid = forecast_update_module._read_boiler_grid_load_overlay(sensor)
    without = forecast_update_module._read_boiler_grid_load_overlay(sensor, include_grid=False)

    assert list(with_grid.values()) == [pytest.approx(1.0)]
    assert list(without.values()) == [pytest.approx(0.25)]
    assert flex_glue.boiler_on_backup(sensor) is False
