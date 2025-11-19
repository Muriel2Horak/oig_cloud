#!/usr/bin/env python3
"""Grid-search autonomy planner parameters on a stored scenario."""

from __future__ import annotations

import argparse
import itertools
from pathlib import Path
from typing import List, Sequence

import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tests.planner_utils import load_scenario, optimize_modes, trace_metrics

SCENARIO_DIR = Path("tests/data/planner_scenarios")


def run_grid_search(paths: Sequence[Path], top: int) -> None:
    scenarios = [load_scenario(path) for path in paths]

    min_penalties = [0.5, 2.0, 4.0, 6.0, 8.0, 10.0, 12.0]
    target_penalties = [0.5, 1.0, 2.0, 3.0, 4.0]

    results = []
    for min_pen, target_pen in itertools.product(min_penalties, target_penalties):
        total_cost = 0.0
        min_socs: List[float] = []
        max_socs: List[float] = []
        time_below: List[float] = []
        time_near: List[float] = []

        for scenario in scenarios:
            _, trace, cost = optimize_modes(
                scenario,
                soc_step_kwh=0.5,
                min_penalty=min_pen,
                target_penalty=target_pen,
            )
            stats = trace_metrics(trace, scenario.metadata)
            total_cost += cost
            min_socs.append(stats["min_soc"])
            max_socs.append(stats["max_soc"])
            time_below.append(stats["time_below_buffer"])
            time_near.append(stats["time_near_max"])

        avg_min_soc = sum(min_socs) / len(min_socs)
        avg_max_soc = sum(max_socs) / len(max_socs)
        max_time_below = max(time_below)
        avg_time_below = sum(time_below) / len(time_below)
        avg_time_near = sum(time_near) / len(time_near)
        avg_depth = sum(
            max(0.0, min_soc - scenarios[idx].metadata["min_capacity"])
            for idx, min_soc in enumerate(min_socs)
        ) / len(min_socs)

        score = (
            total_cost
            + 200.0 * max_time_below
            + 40.0 * avg_time_near
            + 10.0 * avg_depth
        )

        results.append(
            {
                "min_penalty": min_pen,
                "target_penalty": target_pen,
                "score": score,
                "total_cost": total_cost,
                "avg_min_soc": avg_min_soc,
                "avg_max_soc": avg_max_soc,
                "avg_time_below": avg_time_below,
                "max_time_below": max_time_below,
                "avg_time_near": avg_time_near,
            }
        )

    results.sort(key=lambda item: item["score"])

    print(f"Evaluated {len(results)} parameter sets across {len(scenarios)} scenarios")
    print(
        "min_pen  target_pen  cost[Kč]  avg_min  avg_max  max_time_below  avg_time_near  score"
    )
    for entry in results[:top]:
        print(
            f"{entry['min_penalty']:>7.2f}  {entry['target_penalty']:>10.2f}  "
            f"{entry['total_cost']:>8.2f}  "
            f"{entry['avg_min_soc']:>7.2f}  {entry['avg_max_soc']:>7.2f}  "
            f"{entry['max_time_below']:>15.3f}  {entry['avg_time_near']:>13.3f}  "
            f"{entry['score']:>7.2f}"
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Autonomy planner parameter optimizer")
    parser.add_argument(
        "--scenario",
        type=Path,
        action="append",
        help="Scenario JSON file (default: all in tests/data/planner_scenarios)",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=10,
        help="How many top parameter sets to print",
    )
    args = parser.parse_args()

    if args.scenario:
        scenarios = args.scenario
    else:
        scenarios = sorted(SCENARIO_DIR.glob("*.json"))
    if not scenarios:
        raise SystemExit("No scenarios found")

    run_grid_search(scenarios, args.top)
