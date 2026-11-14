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
