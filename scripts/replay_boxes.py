#!/usr/bin/env python3
"""Replay the battery planner on many boxes' anonymous energy slots.

Reads the ``energy_slots`` / ``energy_box`` measurements (bucket ``energy``,
filled by the integration's opt-in energy telemetry) and, per install, runs the
real planner (``economic_planner``) in a closed loop over the measured 15-minute
slots: every slot it plans with what it would have known then (profile load,
prices visible day-ahead from 13:00, measured PV as a perfect forecast), applies
the first slot's mode to what really happened, and moves the SoC on. Variants
differ in one planner setting, so the per-box cost shows which settings matter
across installs.

Usage:
    INFLUX_URL=http://10.0.0.161:8086 INFLUX_TOKEN=... INFLUX_ORG=... \\
        python scripts/replay_boxes.py --days 30
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from custom_components.oig_cloud.battery_forecast import economic_planner as ep  # noqa: E402
from custom_components.oig_cloud.battery_forecast.economic_planner_types import (  # noqa: E402
    PlannerInputs,
)
from custom_components.oig_cloud.battery_forecast.planning.live_load import (  # noqa: E402
    blend_live_load,
)
from custom_components.oig_cloud.battery_forecast.types import (  # noqa: E402
    DEFAULT_CHARGE_EFFICIENCY as CHARGE_EFF,
    DEFAULT_EFFICIENCY as DISCHARGE_EFF,
)

TZ = ZoneInfo("Europe/Prague")
SLOT = 900
HOME_1, HOME_UPS = 0, 3
# What each variant changes against the deployed planner.
VARIANTS: Dict[str, Dict[str, Any]] = {
    "deployed": {"wear": 0.5},
    "no_wear": {"wear": 0.0},
    "live_load": {"wear": 0.5, "live": True},
}
# Planning minimum above bat_min, as the integration derives it.
PLANNING_MARGIN_PCT = 2.0


def known_until(t: int, last: int) -> int:
    """End (exclusive) of the prices visible at ``t``: tomorrow from 13:00."""
    local = datetime.fromtimestamp(t, TZ)
    days = 2 if local.hour >= 13 else 1
    end = (local.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=days))
    return min(int(end.timestamp()), last + SLOT)


def profile_load(load: Dict[int, float], t: int) -> float:
    """Mean load of the same quarter-hour over the previous (up to) 7 days."""
    values = [load[t - 86400 * k] for k in range(1, 8) if (t - 86400 * k) in load]
    if values:
        return sum(values) / len(values)
    earlier = [v for ts, v in load.items() if ts < t]
    return sum(earlier) / len(earlier) if earlier else 0.25


def _step(soc: float, mode: int, load: float, pv: float, box: Dict[str, float]) -> tuple:
    cap, floor, rate = box["capacity_kwh"], box["hw_min_kwh"], box["charge_kw"] / 4
    surplus, deficit = max(0.0, pv - load), max(0.0, load - pv)
    charge = min(surplus, (cap - soc) / CHARGE_EFF)
    soc += charge * CHARGE_EFF
    export = surplus - charge
    if mode == HOME_UPS:
        grid = min(rate, max(0.0, (cap - soc) / CHARGE_EFF))
        soc += grid * CHARGE_EFF
        return soc, deficit + grid, export
    out = min(deficit, max(0.0, soc - floor) * DISCHARGE_EFF)
    soc -= out / DISCHARGE_EFF
    return soc, deficit - out, export


def replay_box(slots: List[Dict[str, Any]], box: Dict[str, Any], *, variant: str) -> Dict[str, Any]:
    """Closed-loop replay of one install; ``slots`` must be contiguous 15-min rows."""
    cfg = VARIANTS[variant]
    rows = sorted(slots, key=lambda s: s["t"])
    by_t = {s["t"]: s for s in rows}
    load = {s["t"]: float(s["load_kwh"]) for s in rows}
    last = rows[-1]["t"]
    capacity = float(box.get("capacity_kwh") or 0) or 10.0
    bat_min = float(box.get("bat_min_pct") or 20.0)
    params = {
        "capacity_kwh": capacity,
        "hw_min_kwh": capacity * bat_min / 100,
        "charge_kw": float(box.get("charge_kw") or 2.6),
    }
    start = rows[0]["t"] + 86400  # one day of history for the profile
    soc = capacity * float(by_t.get(start, rows[0])["soc_pct"]) / 100
    prev, money, switches, discharged = HOME_1, 0.0, 0, 0.0
    t = start
    while t <= last and t in by_t:
        times = [x for x in range(t, known_until(t, last), SLOT) if x in by_t][:144]
        forecast = [profile_load(load, x) for x in times]
        if cfg.get("live") and (t - SLOT) in load:
            blend_live_load(forecast, load[t - SLOT] * 4)
        inputs = PlannerInputs(
            current_soc_kwh=max(soc, 0.01),
            max_capacity_kwh=capacity,
            hw_min_kwh=params["hw_min_kwh"],
            planning_min_percent=bat_min + PLANNING_MARGIN_PCT,
            charge_rate_kw=params["charge_kw"],
            intervals=[{"index": i} for i in range(len(times))],
            prices=[float(by_t[x]["import_price"]) for x in times],
            solar_forecast=[float(by_t[x]["pv_kwh"]) for x in times],
            load_forecast=forecast,
            export_prices=[float(by_t[x]["export_price"]) for x in times],
            current_mode=prev,
            battery_wear_czk_per_kwh=cfg["wear"],
        )
        mode = ep.plan_battery_schedule(inputs).modes[0]
        row = by_t[t]
        new_soc, imported, exported = _step(soc, mode, float(row["load_kwh"]), float(row["pv_kwh"]), params)
        money += imported * float(row["import_price"]) - exported * float(row["export_price"])
        discharged += max(0.0, soc - new_soc)
        switches += int(mode != prev)
        soc, prev = new_soc, mode
        t += SLOT
    prices = sorted(float(s["import_price"]) for s in rows)
    cheap = prices[: max(1, len(prices) * 3 // 10)]
    end_value = sum(cheap) / len(cheap) / CHARGE_EFF
    return {
        "money_czk": round(money, 2),
        "adjusted_czk": round(money - soc * end_value, 2),
        "switches": switches,
        "discharged_kwh": round(discharged, 2),
        "days": round((t - start) / 86400, 1),
    }


def contiguous_runs(slots: Iterable[Dict[str, Any]], min_days: float = 2.0) -> List[List[Dict[str, Any]]]:
    """Split one install's slots at gaps; keep runs of at least ``min_days``."""
    runs: List[List[Dict[str, Any]]] = []
    current: List[Dict[str, Any]] = []
    for slot in sorted(slots, key=lambda s: s["t"]):
        if current and slot["t"] - current[-1]["t"] != SLOT:
            runs.append(current)
            current = []
        current.append(slot)
    if current:
        runs.append(current)
    return [run for run in runs if len(run) >= min_days * 96]


def _flux(url: str, token: str, org: str, query: str) -> List[Dict[str, str]]:
    request = urllib.request.Request(
        f"{url.rstrip('/')}/api/v2/query?org={urllib.request.quote(org)}",
        data=json.dumps({"query": query, "type": "flux"}).encode(),
        headers={
            "Authorization": f"Token {token}",
            "Content-Type": "application/json",
            "Accept": "application/csv",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:  # nosec B310 - operator URL
        text = response.read().decode()
    return [row for row in csv.DictReader(io.StringIO(text)) if row.get("_time")]


def fetch(url: str, token: str, org: str, bucket: str, days: int) -> tuple:
    slots_query = f'''
from(bucket: "{bucket}") |> range(start: -{days}d)
  |> filter(fn: (r) => r._measurement == "energy_slots")
  |> pivot(rowKey: ["_time", "install_id"], columnKey: ["_field"], valueColumn: "_value")'''
    box_query = f'''
from(bucket: "{bucket}") |> range(start: -{days}d)
  |> filter(fn: (r) => r._measurement == "energy_box")
  |> last()
  |> pivot(rowKey: ["install_id"], columnKey: ["_field"], valueColumn: "_value")'''
    slots: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for row in _flux(url, token, org, slots_query):
        t = int(datetime.fromisoformat(row["_time"].replace("Z", "+00:00")).timestamp())
        slots[row["install_id"]].append(
            {key: float(row[key]) for key in ("load_kwh", "pv_kwh", "soc_pct", "import_price", "export_price") if row.get(key)} | {"t": t}
        )
    boxes = {row["install_id"]: {k: float(v) for k, v in row.items() if k in ("capacity_kwh", "bat_min_pct", "charge_kw") and v} for row in _flux(url, token, org, box_query)}
    return slots, boxes


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--bucket", default="energy")
    args = parser.parse_args(argv)
    url, token, org = (os.environ.get(k) for k in ("INFLUX_URL", "INFLUX_TOKEN", "INFLUX_ORG"))
    if not (url and token and org):
        print("Set INFLUX_URL, INFLUX_TOKEN and INFLUX_ORG", file=sys.stderr)
        return 2
    slots, boxes = fetch(url, token, org, args.bucket, args.days)
    print(f"{'install':26s} {'days':>5s} " + " ".join(f"{v:>12s}" for v in VARIANTS))
    for install, rows in sorted(slots.items()):
        for run in contiguous_runs(rows):
            results = {v: replay_box(run, boxes.get(install, {}), variant=v) for v in VARIANTS}
            days = results["deployed"]["days"]
            print(f"{install:26s} {days:5.1f} " + " ".join(f"{results[v]['adjusted_czk']:12.1f}" for v in VARIANTS))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
