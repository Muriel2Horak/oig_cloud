"""What ``_run_planner`` hands the optimizer from the live system."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as forecast_update_module,
)
from custom_components.oig_cloud.battery_forecast.types import CBBMode
from custom_components.oig_cloud.const import (
    CONF_BOILER_BATTERY_CYCLE_COST,
    DEFAULT_BOILER_BATTERY_CYCLE_COST,
)

FLOOR = forecast_update_module.BoxFloorSnapshot(
    entity_id="sensor.bat_min",
    percent=20.0,
    reason_class=forecast_update_module.BAT_MIN_OK,
    raw_state="20",
    last_updated=None,
    local_mode=True,
)
SPOT = [
    {"time": "2026-11-01T00:00:00", "price": 8.0},
    {"time": "2026-11-01T00:15:00", "price": 8.5},
    {"time": "2026-11-01T00:30:00", "price": 9.0},
]


class _Stop(Exception):
    """Ends the run once the inputs are captured."""


def _planned_inputs(
    monkeypatch,
    *,
    options: dict[str, Any] | None = None,
    export_prices: list[dict[str, Any]] | None = None,
    sensor_mode: int | None = None,
) -> Any:
    captured = []

    def capture(inputs):
        captured.append(inputs)
        raise _Stop

    monkeypatch.setattr(forecast_update_module, "plan_battery_schedule", capture)
    sensor = SimpleNamespace(
        _config_entry=SimpleNamespace(options=options or {}),
        _charging_metrics={},
    )
    if sensor_mode is not None:
        sensor._get_current_mode = lambda: sensor_mode

    forecast_update_module._run_planner(
        sensor,
        SPOT,
        export_prices if export_prices is not None else [],
        [0.25, 0.25, 0.25],
        [0.0, 0.0, 0.0],
        5.0,
        15.36,
        FLOOR,
    )
    assert len(captured) == 1
    return captured[0]


def test_wear_defaults_to_the_battery_cycle_cost(monkeypatch) -> None:
    inputs = _planned_inputs(monkeypatch)

    assert inputs.battery_wear_czk_per_kwh == DEFAULT_BOILER_BATTERY_CYCLE_COST


def test_wear_follows_the_battery_cycle_cost_option(monkeypatch) -> None:
    inputs = _planned_inputs(monkeypatch, options={CONF_BOILER_BATTERY_CYCLE_COST: 1.25})

    assert inputs.battery_wear_czk_per_kwh == 1.25


@pytest.mark.parametrize("stored", [None, "junk", -0.5, float("nan")])
def test_a_bad_stored_wear_does_not_cost_the_plan(monkeypatch, stored) -> None:
    inputs = _planned_inputs(monkeypatch, options={CONF_BOILER_BATTERY_CYCLE_COST: stored})

    assert inputs.battery_wear_czk_per_kwh == DEFAULT_BOILER_BATTERY_CYCLE_COST


def test_export_prices_follow_the_slots(monkeypatch) -> None:
    inputs = _planned_inputs(
        monkeypatch,
        export_prices=[
            {"time": "2026-11-01T00:00:00", "price": 1.5},
            {"time": "2026-11-01T00:15:00", "price": -0.5},
        ],
    )

    # Same rule as the displayed timeline: a missing slot exports at zero.
    assert inputs.export_prices == [1.5, -0.5, 0.0]


def test_current_mode_comes_from_the_box(monkeypatch) -> None:
    inputs = _planned_inputs(monkeypatch, sensor_mode=CBBMode.HOME_UPS.value)

    assert inputs.current_mode == CBBMode.HOME_UPS.value


def test_unknown_current_mode_stays_unknown(monkeypatch) -> None:
    inputs = _planned_inputs(monkeypatch)

    assert inputs.current_mode is None


def test_hard_minimum_stays_the_box_trigger_plus_its_margin(monkeypatch) -> None:
    inputs = _planned_inputs(monkeypatch, options={"box_floor_safety_margin_pct": 2.0})

    assert inputs.planning_min_percent == 22.0


def test_trace_names_the_clock_time_of_each_ups_run() -> None:
    trace = [
        {"reason": "A", "charge_intervals": [1, 2]},
        {"reason": "B", "charge_intervals": []},
        {"reason": "C", "charge_intervals": [99]},
    ]

    result = forecast_update_module._with_slot_times(trace, SPOT)

    assert result[0]["charge_start"] == "2026-11-01T00:15:00"
    assert "charge_start" not in result[1]
    assert "charge_start" not in result[2]
