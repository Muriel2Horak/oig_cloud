from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from custom_components.oig_cloud.battery_forecast.economic_planner import (
    plan_battery_schedule,
    simulate_home_i_detailed,
)
from custom_components.oig_cloud.battery_forecast.economic_planner_types import (
    PlannerInputs,
    PlannerResult,
)

MAX_CAPACITY_KWH = 10.24
HW_MIN_KWH = 2.048
PLANNING_MIN_PERCENT = 33.0
CHARGE_RATE_KW = 2.8
INTERVALS_PER_DAY = 96


def _load_historical_scenarios() -> list[dict[str, Any]]:
    scenarios_path = Path(__file__).parent / "data" / "historical_scenarios.json"
    with scenarios_path.open("r", encoding="utf-8") as file_handle:
        scenarios = json.load(file_handle)
    if not isinstance(scenarios, list):
        raise ValueError("historical_scenarios.json must contain a list")
    return scenarios


def _build_inputs(scenario: dict[str, Any]) -> PlannerInputs:
    scenario_data = scenario["data"]
    solar = [float(value) for value in scenario_data["solar"]]
    load = [float(value) for value in scenario_data["load"]]
    prices = [float(value) for value in scenario_data["prices"]]

    if len(solar) != INTERVALS_PER_DAY:
        raise ValueError(f"{scenario['id']}: invalid solar length {len(solar)}")
    if len(load) != INTERVALS_PER_DAY:
        raise ValueError(f"{scenario['id']}: invalid load length {len(load)}")
    if len(prices) != INTERVALS_PER_DAY:
        raise ValueError(f"{scenario['id']}: invalid prices length {len(prices)}")

    return PlannerInputs(
        current_soc_kwh=float(scenario_data["soc_start"]),
        max_capacity_kwh=MAX_CAPACITY_KWH,
        hw_min_kwh=HW_MIN_KWH,
        planning_min_percent=PLANNING_MIN_PERCENT,
        charge_rate_kw=CHARGE_RATE_KW,
        intervals=[{"index": interval_index} for interval_index in range(INTERVALS_PER_DAY)],
        prices=prices,
        solar_forecast=solar,
        load_forecast=load,
    )


def _run_old_planner(inputs: PlannerInputs) -> PlannerResult:
    states = simulate_home_i_detailed(inputs)
    return PlannerResult(
        modes=[state.mode for state in states],
        states=states,
        total_cost=sum(state.cost_czk for state in states),
        decisions=[],
    )


def _is_safe(result: PlannerResult) -> bool:
    return all(state.soc_kwh >= HW_MIN_KWH for state in result.states)


def main() -> None:
    scenarios = _load_historical_scenarios()

    results: list[dict[str, Any]] = []
    for scenario in scenarios:
        scenario_id = str(scenario["id"])
        inputs = _build_inputs(scenario)

        old_result = _run_old_planner(inputs)
        new_result = plan_battery_schedule(inputs)

        old_safe = _is_safe(old_result)
        new_safe = _is_safe(new_result)
        savings = old_result.total_cost - new_result.total_cost

        results.append(
            {
                "date": scenario_id,
                "old_cost": old_result.total_cost,
                "new_cost": new_result.total_cost,
                "savings": savings,
                "old_safety_check": old_safe,
                "new_safety_check": new_safe,
            }
        )

        print(
            f"{scenario_id}: old={old_result.total_cost:.2f} Kč, "
            f"new={new_result.total_cost:.2f} Kč, "
            f"savings={savings:.2f} Kč, "
            f"safe(old/new)={old_safe}/{new_safe}"
        )

    total_savings = sum(item["savings"] for item in results)
    average_savings = total_savings / len(results) if results else 0.0
    improved_days = sum(1 for item in results if item["savings"] > 0.0)
    worse_days = sum(1 for item in results if item["savings"] < 0.0)
    unchanged_days = sum(1 for item in results if item["savings"] == 0.0)
    both_safe_days = sum(
        1
        for item in results
        if item["old_safety_check"] and item["new_safety_check"]
    )

    print("\n=== Souhrn porovnání plánovačů ===")
    print(f"Scénáře celkem: {len(results)}")
    print(f"Celkové úspory: {total_savings:.2f} Kč")
    print(f"Průměrná úspora na den: {average_savings:.2f} Kč")
    print(f"Lepší dny (new < old): {improved_days}")
    print(f"Horší dny (new > old): {worse_days}")
    print(f"Beze změny: {unchanged_days}")
    print(f"Dny se splněnou bezpečností (old i new): {both_safe_days}/{len(results)}")


if __name__ == "__main__":
    main()
