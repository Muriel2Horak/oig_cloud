#!/usr/bin/env python3
"""
Analyze Solar Forecast Accuracy
================================

Porovnává predikovanou solární produkci (z planned_forecast)
se skutečnou produkcí (z actual_intervals) pro daný den.

Usage:
    python3 analyze_solar_forecast.py 2025-11-03
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime


def load_daily_plan(date_str: str, storage_dir: Path) -> Dict:
    """Načíst daily plan JSON."""
    file_path = storage_dir / f"{date_str}.json"
    if not file_path.exists():
        raise FileNotFoundError(f"Plan for {date_str} not found at {file_path}")

    with open(file_path, "r") as f:
        return json.load(f)


def extract_solar_data(plan: Dict, date_str: str) -> Tuple[List[Dict], List[Dict]]:
    """
    Extrahovat solar data z plánu.

    Returns:
        (planned_solar, actual_solar) - lists of {time, solar_kwh}
    """
    planned_forecast = plan.get("planned_forecast", [])
    actual_intervals = plan.get("actual_intervals", [])

    # Filtrovat jen dnešní den
    planned_solar = [
        {"time": x["time"], "solar_kwh": x.get("solar_kwh", 0)}
        for x in planned_forecast
        if date_str in x.get("time", "")
    ]

    actual_solar = [
        {"time": x["time"], "solar_kwh": x.get("solar_kwh", 0)}
        for x in actual_intervals
        if date_str in x.get("time", "")
    ]

    return planned_solar, actual_solar


def align_data(planned: List[Dict], actual: List[Dict]) -> List[Dict]:
    """
    Zarovnat planned a actual data podle času.

    Returns:
        List of {time, planned_kwh, actual_kwh}
    """
    # Vytvořit lookup pro actual data
    actual_map = {x["time"]: x["solar_kwh"] for x in actual}

    # Zarovnat
    aligned = []
    for p in planned:
        time = p["time"]
        if time in actual_map:
            aligned.append(
                {
                    "time": time,
                    "planned_kwh": p["solar_kwh"],
                    "actual_kwh": actual_map[time],
                }
            )

    return aligned


def calculate_metrics(data: List[Dict]) -> Dict:
    """Spočítat accuracy metriky."""
    if not data:
        return {}

    # Extract values
    planned = [x["planned_kwh"] for x in data]
    actual = [x["actual_kwh"] for x in data]

    # Total production
    total_planned = sum(planned)
    total_actual = sum(actual)

    # MAE (Mean Absolute Error)
    mae = sum(abs(p - a) for p, a in zip(planned, actual)) / len(data)

    # RMSE (Root Mean Square Error)
    rmse = (sum((p - a) ** 2 for p, a in zip(planned, actual)) / len(data)) ** 0.5

    # Bias (positive = over-prediction)
    bias = sum(p - a for p, a in zip(planned, actual)) / len(data)

    # Relative error
    relative_error = (
        ((total_planned - total_actual) / total_actual * 100) if total_actual > 0 else 0
    )

    return {
        "intervals": len(data),
        "total_planned_kwh": round(total_planned, 3),
        "total_actual_kwh": round(total_actual, 3),
        "mae_kwh": round(mae, 4),
        "rmse_kwh": round(rmse, 4),
        "bias_kwh": round(bias, 4),
        "relative_error_pct": round(relative_error, 2),
    }


def print_hourly_comparison(data: List[Dict]):
    """Vypsat hodinové porovnání."""
    print("\n📊 Hourly Solar Production Comparison:")
    print(f"{'Time':<10} {'Planned':>10} {'Actual':>10} {'Error':>10} {'Error %':>10}")
    print("-" * 60)

    # Seskupit po hodinách
    hourly = {}
    for d in data:
        hour = d["time"][:13]  # "2025-11-03T08"
        if hour not in hourly:
            hourly[hour] = {"planned": 0, "actual": 0}
        hourly[hour]["planned"] += d["planned_kwh"]
        hourly[hour]["actual"] += d["actual_kwh"]

    # Vypsat
    for hour in sorted(hourly.keys()):
        h = hourly[hour]
        planned = h["planned"]
        actual = h["actual"]
        error = planned - actual
        error_pct = (error / actual * 100) if actual > 0 else 0

        if planned > 0 or actual > 0:  # Jen hodiny s produkcí
            print(
                f"{hour}:00   {planned:>8.3f}   {actual:>8.3f}   {error:>+8.3f}   {error_pct:>+8.1f}%"
            )


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 analyze_solar_forecast.py <date>")
        print("Example: python3 analyze_solar_forecast.py 2025-11-03")
        sys.exit(1)

    date_str = sys.argv[1]

    # REMOTE path - použijeme přes SSH
    print(f"\n🌞 Solar Forecast Accuracy Analysis")
    print(f"📅 Date: {date_str}")
    print("=" * 60)

    # Note: Toto se spustí lokálně, ale JSON je remote
    # Proto budeme volat přes SSH nebo použít lokální kopii
    print("\n⚠️  This script needs to run on HA server or with JSON copied locally.")
    print(
        "Run via: ssh ha 'python3 /config/custom_components/oig_cloud/analyze_solar_forecast.py 2025-11-03'"
    )


if __name__ == "__main__":
    main()
