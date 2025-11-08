#!/usr/bin/env python3
"""
Analyzuje battery forecast data z API a diagnostikuje problém s hybrid režimem.
"""

import requests
import json
from datetime import datetime
from typing import Dict, List, Any

# Načtení konfigurace
with open(".ha_config", "r") as f:
    for line in f:
        if line.startswith("HA_URL="):
            HA_URL = line.split("=")[1].strip()
        elif line.startswith("HA_TOKEN="):
            HA_TOKEN = line.split("=")[1].strip()
        elif line.startswith("BOX_ID="):
            BOX_ID = line.split("=")[1].strip()

HEADERS = {"Authorization": f"Bearer {HA_TOKEN}", "Content-Type": "application/json"}

print("=" * 80)
print("BATTERY FORECAST HYBRID MODE DIAGNOSTIKA")
print("=" * 80)
print(f"HA URL: {HA_URL}")
print(f"Box ID: {BOX_ID}")
print()

# 1. Získat battery forecast z API
print("1. Získávám battery forecast z API...")
api_url = f"{HA_URL}/api/oig_cloud/battery_forecast/{BOX_ID}/timeline"
try:
    response = requests.get(api_url, headers=HEADERS, timeout=10)
    response.raise_for_status()
    forecast_response = response.json()

    print(f"   Status: {response.status_code}")
    print(f"   Response keys: {list(forecast_response.keys())}")

    # Zkontroluj strukturu dat
    active = forecast_response.get("active", {})
    baseline = forecast_response.get("baseline", {})
    mode_recs = forecast_response.get("mode_recommendations", [])
    timeline_ext = forecast_response.get("timeline_extended", [])
    metadata = forecast_response.get("metadata", {})

    print(f"\n   Active entries: {len(active) if isinstance(active, list) else 'dict'}")
    print(
        f"   Baseline entries: {len(baseline) if isinstance(baseline, list) else 'dict'}"
    )
    print(
        f"   Mode recommendations: {len(mode_recs) if isinstance(mode_recs, list) else 'dict'}"
    )
    print(f"   Timeline extended length: {len(timeline_ext)}")

    print("\n2. Analyzuji mode_recommendations...")
    forecast_data = []  # Initialize
    if mode_recs and isinstance(mode_recs, list):
        print(f"   Celkem režimů: {len(mode_recs)}")
        for mode_rec in mode_recs:
            mode_name = mode_rec.get("mode", "unknown")
            mode_label = mode_rec.get("mode_label", str(mode_name))
            timeline = mode_rec.get("timeline", [])
            print(f"\n   Režim: {mode_label} (mode={mode_name})")
            print(f"   Timeline length: {len(timeline)}")

            # Najdi hybrid režim (mode 2)
            if mode_name == 2 or (
                isinstance(mode_label, str) and "hybrid" in mode_label.lower()
            ):
                forecast_data = timeline
                print(f"   ✓ Nalezen HYBRID režim s {len(timeline)} záznamy")
                break
    else:
        print("   Mode recommendations nejsou list nebo jsou prázdné")

    # Pokud nebyl nalezen hybrid, použij active
    if not forecast_data:
        print("\n   ⚠️  Hybrid režim nenalezen v mode_recommendations!")
        print("   📊 Používám ACTIVE data (aktuálně aktivní režim)")
        forecast_data = active if isinstance(active, list) else []

    print(f"\n3. Analyzuji {len(forecast_data)} forecast záznamů...")
    if forecast_data:
        print("\n   První 5 záznamů:")
        for i, entry in enumerate(forecast_data[:5]):
            print(f"\n   [{i}] Time: {entry.get('time')}")
            print(f"       Battery Level: {entry.get('battery_level')}%")
            print(f"       Mode: {entry.get('mode')}")
            print(f"       Charging Power: {entry.get('charging_power')} kW")
            print(f"       Grid Import: {entry.get('grid_import')} kW")
            print(f"       Grid Export: {entry.get('grid_export')} kW")
            print(f"       Solar Production: {entry.get('solar_production')} kW")
            print(f"       Consumption: {entry.get('consumption')} kW")

    print("\n6. Hledám hybridní režimy s dobíjením...")
    hybrid_charging = [
        entry
        for entry in forecast_data
        if entry.get("mode") == "hybrid" and entry.get("charging_power", 0) > 0
    ]

    print(f"   Nalezeno {len(hybrid_charging)} hybridních záznamů s dobíjením")

    if hybrid_charging:
        print("\n   Hybridní dobíjení:")
        for entry in hybrid_charging[:5]:
            print(
                f"   - {entry.get('time')}: Battery {entry.get('battery_level')}%, "
                f"Charging {entry.get('charging_power')} kW, "
                f"Grid Import {entry.get('grid_import')} kW"
            )

    print("\n4. Hledám režimy s klesající baterií...")
    battery_drops = []
    for i in range(len(forecast_data) - 1):
        current = forecast_data[i]
        next_entry = forecast_data[i + 1]

        current_level = current.get("battery_level", 0)
        next_level = next_entry.get("battery_level", 0)

        if next_level < current_level:
            battery_drops.append(
                {
                    "time": current.get("time"),
                    "mode": current.get("mode"),
                    "from_level": current_level,
                    "to_level": next_level,
                    "drop": current_level - next_level,
                    "charging_power": current.get("charging_power", 0),
                    "solar": current.get("solar_production", 0),
                    "consumption": current.get("consumption", 0),
                    "grid_import": current.get("grid_import", 0),
                }
            )

    print(f"   Nalezeno {len(battery_drops)} období s klesající baterií")

    if battery_drops:
        print("\n   První pokles baterie:")
        for drop in battery_drops[:10]:
            print(
                f"   - {drop['time']}: {drop['from_level']}% → {drop['to_level']}% "
                f"(pokles {drop['drop']:.1f}%)"
            )
            print(
                f"     Mode: {drop['mode']}, Charging: {drop['charging_power']} kW, "
                f"Solar: {drop['solar']} kW, Consumption: {drop['consumption']} kW, "
                f"Grid Import: {drop['grid_import']} kW"
            )

    print("\n5. Kontroluji aktuální režim a stav...")
    mode_sensor_url = f"{HA_URL}/api/states/sensor.oig_cloud_battery_mode"
    mode_response = requests.get(mode_sensor_url, headers=HEADERS, timeout=10)
    if mode_response.ok:
        mode_data = mode_response.json()
        print(f"   Aktuální režim: {mode_data.get('state')}")

    battery_level_url = f"{HA_URL}/api/states/sensor.oig_cloud_battery_level"
    battery_response = requests.get(battery_level_url, headers=HEADERS, timeout=10)
    if battery_response.ok:
        battery_data = battery_response.json()
        print(f"   Aktuální úroveň baterie: {battery_data.get('state')}%")

    print("\n6. DIAGNOSTIKA PROBLÉMU:")
    print("   " + "=" * 70)

    # Analyzuj problém
    if len(hybrid_charging) == 0:
        print("   ⚠️  PROBLÉM: Žádné hybrid režimy s dobíjením nenalezeny!")
        print("   → Forecast nepočítá s dobíjením baterie v hybrid režimu")

    if battery_drops:
        hybrid_drops = [d for d in battery_drops if d["mode"] == "hybrid"]
        if hybrid_drops:
            print(
                f"   ⚠️  PROBLÉM: {len(hybrid_drops)} hybrid období s klesající baterií"
            )
            print("   → Hybrid režim by měl dobíjet, ale baterie klesá")

            # Zkontroluj, jestli je v těch obdobích nějaké dobíjení
            no_charging = [d for d in hybrid_drops if d["charging_power"] == 0]
            if no_charging:
                print(f"   ⚠️  KRITICKÝ: {len(no_charging)} hybrid období bez dobíjení!")
                print("   → Charging power je 0, i když baterie klesá v hybrid režimu")

    print("\n7. Detailní atributy forecastu:")
    print(f"   Balancer Mode: {forecast_response.get('balancer_mode')}")
    print(f"   Optimizer Priority: {forecast_response.get('optimizer_priority')}")
    print(f"   Grid Charging Enabled: {forecast_response.get('grid_charging_enabled')}")
    print(f"   Grid Charging Hours: {forecast_response.get('grid_charging_hours', [])}")
    print(f"   Response obsahuje: {', '.join(forecast_response.keys())}")


except requests.exceptions.RequestException as e:
    print(f"   ❌ Chyba při získávání dat: {e}")

print("\n" + "=" * 80)
print("KONEC DIAGNOSTIKY")
print("=" * 80)
