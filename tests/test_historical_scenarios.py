from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import pytest

from custom_components.oig_cloud.battery_forecast.economic_planner import plan_battery_schedule
from custom_components.oig_cloud.battery_forecast.economic_planner_types import PlannerInputs
from custom_components.oig_cloud.battery_forecast.types import CBBMode

MAX_CAPACITY_KWH = 10.24
HW_MIN_KWH = 2.048
PLANNING_MIN_PERCENT = 33.0
CHARGE_RATE_KW = 2.8
EXPECTED_SCENARIO_COUNT = 30
INTERVALS_PER_DAY = 96
VALID_MODES = {CBBMode.HOME_I.value, CBBMode.HOME_UPS.value}


def _load_historical_scenarios() -> list[dict[str, Any]]:
    scenarios_path = Path(__file__).parent / "data" / "historical_scenarios.json"
    with scenarios_path.open("r", encoding="utf-8") as file_handle:
        data = json.load(file_handle)
    return data.get("scenarios", []) if isinstance(data, dict) else data


def _expected_max_cost(load: list[float], prices: list[float]) -> float:
    full_grid_cost = sum(max(0.0, load_value) * max(0.0, price) for load_value, price in zip(load, prices))
    one_full_charge_worst_price = MAX_CAPACITY_KWH * max((max(0.0, price) for price in prices), default=0.0)
    return full_grid_cost + one_full_charge_worst_price + 1e-6


SCENARIOS = _load_historical_scenarios()


def test_historical_scenarios_dataset_has_30_entries() -> None:
    assert len(SCENARIOS) == EXPECTED_SCENARIO_COUNT


@pytest.mark.parametrize("scenario", SCENARIOS, ids=[scenario["id"] for scenario in SCENARIOS])
def test_planner_passes_all_historical_scenarios(scenario: dict[str, Any]) -> None:
    scenario_data = scenario["data"]
    soc_start = float(scenario_data["soc_start"])
    solar = [float(value) for value in scenario_data["solar"]]
    load = [float(value) for value in scenario_data["load"]]
    prices = [float(value) for value in scenario_data["prices"]]

    assert len(solar) == INTERVALS_PER_DAY
    assert len(load) == INTERVALS_PER_DAY
    assert len(prices) == INTERVALS_PER_DAY

    inputs = PlannerInputs(
        current_soc_kwh=soc_start,
        max_capacity_kwh=MAX_CAPACITY_KWH,
        hw_min_kwh=HW_MIN_KWH,
        planning_min_percent=PLANNING_MIN_PERCENT,
        charge_rate_kw=CHARGE_RATE_KW,
        intervals=[{"index": interval_index} for interval_index in range(INTERVALS_PER_DAY)],
        prices=prices,
        solar_forecast=solar,
        load_forecast=load,
    )

    result = plan_battery_schedule(inputs)
    scenario_id = scenario["id"]

    assert len(result.modes) == INTERVALS_PER_DAY, f"{scenario_id}: unexpected mode length"
    assert len(result.states) == INTERVALS_PER_DAY, f"{scenario_id}: unexpected states length"
    assert math.isfinite(result.total_cost), f"{scenario_id}: total_cost must be finite"
    assert result.total_cost >= 0.0, f"{scenario_id}: total_cost must be non-negative"

    expected_max_cost = _expected_max_cost(load, prices)
    assert result.total_cost < expected_max_cost, (
        f"{scenario_id}: total_cost={result.total_cost:.4f} exceeds expected_max_cost={expected_max_cost:.4f}"
    )

    invalid_modes = sorted(set(result.modes) - VALID_MODES)
    assert not invalid_modes, f"{scenario_id}: invalid planner modes {invalid_modes}"

    for state in result.states:
        assert state.soc_kwh >= (HW_MIN_KWH - 1e-6), (
            f"{scenario_id}: SOC below HW min at interval {state.interval_index} "
            f"(soc={state.soc_kwh:.6f}, hw_min={HW_MIN_KWH:.6f})"
        )
        assert state.mode in VALID_MODES, (
            f"{scenario_id}: invalid state mode {state.mode} at interval {state.interval_index}"
        )
