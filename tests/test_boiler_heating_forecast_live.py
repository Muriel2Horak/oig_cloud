"""Boiler heating forecast built from a live boiler runtime."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.boiler.demand_profiler import DemandMap, DemandSlot, MatchMeta
from custom_components.oig_cloud.boiler.heating_forecast_live import (
    boiler_heating_forecast,
    electric_kwh_for_slots,
)

NOW = datetime(2026, 7, 1, 5, 0, tzinfo=timezone.utc)


class _States:
    def __init__(self, values):
        self._values = values

    def get(self, entity_id):
        if entity_id not in self._values:
            return None
        return SimpleNamespace(state=self._values[entity_id], attributes={}, last_updated=NOW)


class _Profiler:
    def __init__(self, slot_kwh: dict[int, float], confidence: float = 0.9):
        self._slots = [DemandSlot(p50_kwh=0.0, p80_kwh=slot_kwh.get(i, 0.0), has_data=True) for i in range(96)]
        self._confidence = confidence

    def get_demand_map(self, category):
        return DemandMap(
            slots=self._slots,
            windows=[],
            meta=MatchMeta(category=category, level="exact", days_used=10, label="", fallback_used=False),
            confidence=self._confidence,
        )


def _runtime(*, plan=None, config=None, profiler=None):
    base = {
        "boiler_temp_sensor_top": "sensor.top",
        "boiler_volume_l": 200.0,
        "boiler_target_temp_c": 60.0,
        "boiler_effective_power_w": 3000,
    }
    base.update(config or {})
    coordinator = SimpleNamespace(config=base, _demand_profiler=profiler)
    return SimpleNamespace(coordinator=coordinator, last_plan_result=plan)


def _starts(n):
    return [NOW + timedelta(minutes=15 * i) for i in range(n)]


def test_without_a_plan_the_tank_is_simulated_with_the_demand_profile():
    # A 20 K draw at 05:15 (slot 21) pulls the tank below the switch-on point.
    draw = 20.0 * 200.0 * 4186.0 / 3_600_000.0
    runtime = _runtime(profiler=_Profiler({21: draw}))
    hass = SimpleNamespace(states=_States({"sensor.top": "60.0"}))

    forecast = boiler_heating_forecast(hass, runtime, _starts(16), now=NOW)

    assert forecast.method == "thermostat"
    assert forecast.first_heat_at == NOW + timedelta(minutes=15)
    assert forecast.total_heat_kwh > draw  # draw plus standing loss
    assert forecast.electric_kwh == pytest.approx(forecast.total_heat_kwh)


def test_boiler_with_an_alternative_source_heats_unplanned_from_it():
    draw = 20.0 * 200.0 * 4186.0 / 3_600_000.0
    runtime = _runtime(
        profiler=_Profiler({21: draw}),
        config={"boiler_has_alternative_heating": True},
    )
    hass = SimpleNamespace(states=_States({"sensor.top": "60.0"}))

    forecast = boiler_heating_forecast(hass, runtime, _starts(16), now=NOW)

    assert forecast.electric_kwh == 0.0
    assert forecast.total_heat_kwh > 0.0


def test_low_confidence_profile_means_no_draws():
    runtime = _runtime(profiler=_Profiler({21: 4.0}, confidence=0.1))
    hass = SimpleNamespace(states=_States({"sensor.top": "60.0"}))

    forecast = boiler_heating_forecast(hass, runtime, _starts(8), now=NOW)

    assert forecast.total_heat_kwh == 0.0


def test_unreadable_temperature_gives_no_thermostat_forecast():
    runtime = _runtime(profiler=_Profiler({}))
    hass = SimpleNamespace(states=_States({"sensor.top": "unavailable"}))

    forecast = boiler_heating_forecast(hass, runtime, _starts(4), now=NOW)

    assert forecast.method == "none"


@dataclass
class _Slot:
    start: datetime
    end: datetime
    heating_kwh: float = 0.0
    grid_kwh: float = 0.0
    pv_kwh: float = 0.0


def test_a_plan_wins_and_maps_onto_the_planner_slots():
    plan = SimpleNamespace(slots=[_Slot(NOW + timedelta(minutes=15), NOW + timedelta(minutes=30), 0.75, grid_kwh=0.75)])
    runtime = _runtime(plan=plan)
    hass = SimpleNamespace(states=_States({"sensor.top": "60.0"}))

    forecast = boiler_heating_forecast(hass, runtime, _starts(4), now=NOW)

    assert forecast.method == "plan"
    assert electric_kwh_for_slots(forecast, _starts(4)) == pytest.approx([0.0, 0.75, 0.0, 0.0])


def test_slot_mapping_matches_naive_and_aware_times():
    plan = SimpleNamespace(slots=[_Slot(NOW, NOW + timedelta(minutes=15), 0.5, grid_kwh=0.5)])
    forecast = boiler_heating_forecast(
        SimpleNamespace(states=_States({})), _runtime(plan=plan), _starts(2), now=NOW
    )
    assert electric_kwh_for_slots(forecast, _starts(2)) == pytest.approx([0.5, 0.0])


# ── draw calibration on a live runtime ─────────────────────────────────────

from unittest.mock import AsyncMock, patch  # noqa: E402

from custom_components.oig_cloud.boiler import heating_forecast_live as live  # noqa: E402


async def test_calibration_scales_the_profile_draws_to_measured_heat():
    # Profile: 0.5 kWh draw in every slot of the day = 48 kWh/day at p80... too much:
    # use 0.03125 kWh/slot = 3 kWh/day.
    runtime = _runtime(profiler=_Profiler({i: 0.03125 for i in range(96)}))
    runtime.box_id = "123"
    hass = SimpleNamespace(states=_States({"sensor.top": "60.0"}))
    days = [NOW - timedelta(days=k) for k in range(1, 8)]
    rows = {
        "sensor.oig_123_boiler_alt_energy": [{"start": d.timestamp(), "change": 11.0} for d in days],
        "sensor.oig_123_boiler_fve_energy": [{"start": d.timestamp(), "change": 0.0} for d in days],
        "sensor.oig_123_boiler_grid_energy": [{"start": d.timestamp(), "change": 0.0} for d in days],
    }
    with patch.object(live, "async_fetch_daily_change", AsyncMock(return_value=rows)):
        scale = await live.async_refresh_draw_scale(hass, runtime, now=NOW)
    loss = live.TANK_LOSS_W_PER_K * (60.0 - live.AMBIENT_TEMP_C) * 24 / 1000
    assert scale == pytest.approx((11.0 - loss) / 3.0, rel=1e-3)
    assert runtime.heating_draw_scale == scale

    # Once a day: a second call does not read statistics again.
    with patch.object(live, "async_fetch_daily_change", AsyncMock(side_effect=AssertionError)):
        assert await live.async_refresh_draw_scale(hass, runtime, now=NOW + timedelta(hours=2)) == scale

    forecast = boiler_heating_forecast(hass, runtime, _starts(4), now=NOW)
    assert forecast.draw_scale == pytest.approx(scale)
    assert forecast.as_dict()["draw_scale"] == pytest.approx(round(scale, 2))
