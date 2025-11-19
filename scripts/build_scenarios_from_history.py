#!/usr/bin/env python3
"""Export planner scenarios from Home Assistant history API."""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import requests
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parents[1]
CONFIG_PATH = BASE_DIR / ".ha_config"
DEFAULT_OUTPUT = BASE_DIR / "tests" / "data" / "planner_scenarios"
TZ = ZoneInfo("Europe/Prague")
MAX_CAPACITY_KWH = 15.3625
MIN_PERCENT = 0.22
TARGET_PERCENT = 0.80


@dataclass
class HAConfig:
    url: str
    token: str
    box_id: str


def load_config() -> HAConfig:
    if not CONFIG_PATH.exists():
        raise SystemExit(f"Missing {CONFIG_PATH}")

    values: Dict[str, str] = {}
    for raw in CONFIG_PATH.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, val = line.split("=", 1)
        values[key.strip()] = val.strip().strip('"')

    try:
        return HAConfig(
            url=values["HA_URL"],
            token=values["HA_TOKEN"],
            box_id=values["BOX_ID"],
        )
    except KeyError as exc:
        raise SystemExit(f"Missing {exc.args[0]} in {CONFIG_PATH}") from exc


@dataclass
class HistorySeries:
    entity_id: str
    samples: List[Tuple[datetime, float]]

    def value_at(self, dt: datetime) -> Optional[float]:
        dt_utc = dt.astimezone(timezone.utc)
        value: Optional[float] = None
        for ts, val in self.samples:
            if ts <= dt_utc:
                value = val
            else:
                break
        return value


def fetch_history(config: HAConfig, date: str, entities: Sequence[str]) -> Dict[str, HistorySeries]:
    start_local = datetime.fromisoformat(date).replace(tzinfo=TZ)
    end_local = start_local + timedelta(days=1)

    params: List[Tuple[str, str]] = [
        ("end_time", end_local.isoformat()),
        ("minimal_response", "true"),
    ]
    for entity in entities:
        params.append(("filter_entity_id", entity))

    url = f"{config.url}/api/history/period/{start_local.isoformat()}"
    headers = {"Authorization": f"Bearer {config.token}", "Content-Type": "application/json"}

    resp = requests.get(url, headers=headers, params=params, timeout=120)
    if resp.status_code != 200:
        raise RuntimeError(f"History API {resp.status_code}: {resp.text}")

    series: Dict[str, HistorySeries] = {}
    payload = resp.json()
    for entity_states in payload:
        if not entity_states:
            continue
        entity_id = entity_states[0]["entity_id"]
        samples: List[Tuple[datetime, float]] = []
        for state in entity_states:
            value = state.get("state")
            if value in ("unknown", "unavailable", None):
                continue
            try:
                val = float(value)
            except (ValueError, TypeError):
                continue
            ts = datetime.fromisoformat(state["last_changed"])
            samples.append((ts, val))
        samples.sort(key=lambda item: item[0])
        series[entity_id] = HistorySeries(entity_id=entity_id, samples=samples)

    return series


def get_value(series: Dict[str, HistorySeries], entity_id: str, dt: datetime) -> Optional[float]:
    obj = series.get(entity_id)
    if not obj:
        return None
    return obj.value_at(dt)


def get_delta(series: Dict[str, HistorySeries], entity_id: str, start: datetime, end: datetime) -> float:
    start_val = get_value(series, entity_id, start)
    end_val = get_value(series, entity_id, end)
    if start_val is None or end_val is None:
        return 0.0
    delta = end_val - start_val
    if delta < 0:
        delta = end_val
    return delta / 1000.0


def build_scenario(config: HAConfig, date: str, output_dir: Path) -> None:
    entities = [
        f"sensor.oig_{config.box_id}_ac_out_en_day",
        f"sensor.oig_{config.box_id}_ac_in_ac_ad",
        f"sensor.oig_{config.box_id}_ac_in_ac_pd",
        f"sensor.oig_{config.box_id}_dc_in_fv_ad",
        f"sensor.oig_{config.box_id}_batt_bat_c",
        f"sensor.oig_{config.box_id}_box_prms_mode",
        f"sensor.oig_{config.box_id}_spot_price_current_15min",
        f"sensor.oig_{config.box_id}_export_price_current_15min",
    ]
    series = fetch_history(config, date, entities)

    start = datetime.fromisoformat(date).replace(tzinfo=TZ)
    interval = timedelta(minutes=15)
    max_capacity = MAX_CAPACITY_KWH
    min_capacity = round(max_capacity * MIN_PERCENT, 3)
    target_capacity = round(max_capacity * TARGET_PERCENT, 3)

    load_kwh: List[float] = []
    solar_kwh: List[float] = []
    spot_entries: List[Dict[str, float]] = []

    for i in range(96):
        slot_start = start + i * interval
        slot_end = slot_start + interval
        load_kwh.append(
            max(
                get_delta(series, f"sensor.oig_{config.box_id}_ac_out_en_day", slot_start, slot_end),
                0.0,
            )
        )
        solar_kwh.append(
            max(
                get_delta(series, f"sensor.oig_{config.box_id}_dc_in_fv_ad", slot_start, slot_end),
                0.0,
            )
        )
        spot = get_value(series, f"sensor.oig_{config.box_id}_spot_price_current_15min", slot_start) or 0.0
        export = get_value(series, f"sensor.oig_{config.box_id}_export_price_current_15min", slot_start)
        if export is None:
            export = spot * 0.4
        spot_entries.append(
            {
                "time": slot_start.replace(tzinfo=None).isoformat(),
                "price": round(float(spot), 4),
                "export_price": round(float(export), 4),
            }
        )

    battery_percent = get_value(series, f"sensor.oig_{config.box_id}_batt_bat_c", start)
    if battery_percent is None:
        battery_percent = TARGET_PERCENT * 100
    initial_soc = round(max_capacity * (battery_percent / 100.0), 3)

    metadata = {
        "initial_soc": initial_soc,
        "max_capacity": max_capacity,
        "min_capacity": min_capacity,
        "target_capacity": target_capacity,
        "home_charge_rate_kw": 2.8,
        "efficiency": 0.95,
        "description": f"Historical reconstruction for {date}",
    }

    scenario = {
        "metadata": metadata,
        "spot_prices": spot_entries,
        "load_kwh": load_kwh,
        "solar_kwh": solar_kwh,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / f"{date}.json"
    out_path.write_text(json.dumps(scenario, indent=2))
    print(f"Saved {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build planner scenarios from HA history")
    parser.add_argument("dates", nargs="+", help="Dates (YYYY-MM-DD)")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Output directory (default: tests/data/planner_scenarios)",
    )
    args = parser.parse_args()

    config = load_config()
    for date in args.dates:
        try:
            build_scenario(config, date, args.output)
        except Exception as err:  # noqa: BLE001
            print(f"Failed to build scenario for {date}: {err}", file=sys.stderr)


if __name__ == "__main__":
    main()
