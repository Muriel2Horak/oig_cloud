"""Sensors for the boiler heating forecast and the car charging plan."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.boiler.heating_forecast import (
    BoilerHeatingForecast,
    HeatingSlot,
)
from custom_components.oig_cloud.boiler.sensors import (
    BoilerHeatingForecastSensor,
    get_boiler_sensors,
)
from custom_components.oig_cloud.ev.planner import EvPlanInput, plan_ev_charging
from custom_components.oig_cloud.ev.profile import NextNeed
from custom_components.oig_cloud.ev.sensors import EvChargingPlanSensor

T0 = datetime(2026, 11, 16, 1, 0, tzinfo=timezone.utc)


def _coordinator():
    return SimpleNamespace(box_id="2206237016", data={}, config={}, last_update_success=True)


def test_boiler_sensor_list_has_the_heating_forecast():
    sensors = get_boiler_sensors(_coordinator(), runtime=None)
    assert any(isinstance(s, BoilerHeatingForecastSensor) for s in sensors)


def test_heating_forecast_sensor_shows_the_runtime_forecast():
    forecast = BoilerHeatingForecast(
        method="thermostat",
        slots=[
            HeatingSlot(start=T0, heat_kwh=0.75, electric_kwh=0.75, grid_kwh=0.75),
            HeatingSlot(start=T0 + timedelta(minutes=15), heat_kwh=0.5, electric_kwh=0.0, alt_kwh=0.5),
        ],
    )
    runtime = SimpleNamespace(heating_forecast=forecast)
    sensor = BoilerHeatingForecastSensor(_coordinator(), runtime=runtime)

    assert sensor.unique_id == "oig_cloud_2206237016_boiler_heating_forecast"
    assert sensor.native_value == pytest.approx(1.25)
    attrs = sensor.extra_state_attributes
    assert attrs["method"] == "thermostat"
    assert attrs["electric_kwh"] == pytest.approx(0.75)
    assert attrs["first_heat_at"] == T0.isoformat()
    assert len(attrs["slots"]) == 2


def test_heating_forecast_sensor_without_a_forecast_is_unknown():
    sensor = BoilerHeatingForecastSensor(_coordinator(), runtime=SimpleNamespace())
    assert sensor.native_value is None
    assert sensor.extra_state_attributes == {}


def _plan(prices, need_pct):
    n = len(prices)
    return plan_ev_charging(
        EvPlanInput(
            slot_starts=[T0 + timedelta(minutes=15 * i) for i in range(n)],
            import_prices=prices,
            export_prices=[0.0] * n,
            pv_surplus_kwh=[0.0] * n,
            grid_headroom_kw=[20.0] * n,
            soc_pct=20.0,
            capacity_kwh=25.0,
            charge_limit_pct=100.0,
            max_power_kw=11.0,
            min_power_kw=4.1,
            need=NextNeed(T0 + timedelta(minutes=15 * n), need_pct, 0),
        )
    )


class _Runtime:
    def __init__(self, plan):
        self.last_plan = plan
        self.entry_id = "entry"

    def as_dict(self):
        return {"plan": self.last_plan.as_dict() if self.last_plan else None, "need_pct": 31.0}


def test_ev_sensor_says_charge_when_the_plan_charges_now():
    sensor = EvChargingPlanSensor(_Runtime(_plan([1.0, 5.0], 31.0)), box_id="2206237016")

    assert sensor.unique_id == "oig_cloud_2206237016_ev_charging_plan"
    assert sensor.entity_id == "sensor.oig_2206237016_ev_charging_plan"
    assert sensor.native_value == "charge"
    attrs = sensor.extra_state_attributes
    assert attrs["charge_now"] is True
    assert attrs["plan"]["status"] == "planned"


def test_ev_sensor_shows_the_plan_status_while_waiting():
    sensor = EvChargingPlanSensor(_Runtime(_plan([5.0, 1.0], 31.0)), box_id="2206237016")

    assert sensor.native_value == "planned"
    assert sensor.extra_state_attributes["charge_now"] is False
    assert sensor.extra_state_attributes["next_start"] == (T0 + timedelta(minutes=15)).isoformat()


def test_ev_sensor_without_a_plan_is_unknown():
    sensor = EvChargingPlanSensor(_Runtime(None), box_id="2206237016")
    assert sensor.native_value is None
    assert sensor.extra_state_attributes["charge_now"] is False
