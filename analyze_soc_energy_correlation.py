#!/usr/bin/env python3
"""
Analýza korelace mezi SoC změnami a energetickými senzory.
Použije již stažená data z battery_health_*.json
"""

import json
from datetime import datetime, timedelta
from typing import Any
import statistics


def parse_timestamp(ts_str: str) -> datetime:
    """Parse timestamp string to datetime"""
    return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))


def get_state_at_time(
    data: list[dict[str, Any]], target_time: datetime
) -> float | None:
    """Najde nejbližší stav k danému času"""
    closest = None
    closest_diff = None

    for entry in data:
        entry_time = parse_timestamp(entry["last_changed"])
        diff = abs((entry_time - target_time).total_seconds())

        if closest_diff is None or diff < closest_diff:
            closest_diff = diff
            closest = float(entry["state"])

    return closest


def main() -> None:
    """Hlavní funkce"""
    print("📊 Načítám již stažená data...")
    print()

    # Načti SoC data
    with open("battery_health_soc_data.json") as f:
        soc_data = json.load(f)

    # Načti cycle data (obsahuje charge/discharge energie)
    with open("battery_health_cycle_data.json") as f:
        cycle_data = json.load(f)

    print(f"✓ SoC data: {len(soc_data)} bodů")
    print(f"✓ Cykly: {len(cycle_data)}")
    print()

    # ANALÝZA: Všechny významné SoC změny
    print("=" * 70)
    print("ANALÝZA: Všechny SoC změny >5% (nabíjení i vybíjení)")
    print("=" * 70)
    print()

    NOMINAL_CAPACITY_KWH = 15.36
    MIN_SOC_CHANGE = 1.0  # Minimální změna SoC v % (sníženo z 5)
    MAX_DURATION_H = 12.0  # Maximální doba trvání v hodinách

    changes = []

    for i in range(1, len(soc_data)):
        prev = soc_data[i - 1]
        curr = soc_data[i]

        # Skip unavailable states
        if prev["state"] in ("unavailable", "unknown", "") or curr["state"] in (
            "unavailable",
            "unknown",
            "",
        ):
            continue

        prev_time = parse_timestamp(prev["last_changed"])
        curr_time = parse_timestamp(curr["last_changed"])
        prev_soc = float(prev["state"])
        curr_soc = float(curr["state"])

        delta_soc = curr_soc - prev_soc
        duration_h = (curr_time - prev_time).total_seconds() / 3600

        # Filtr: jen významné změny za rozumnou dobu
        if abs(delta_soc) >= MIN_SOC_CHANGE and duration_h <= MAX_DURATION_H:
            changes.append(
                {
                    "start_time": prev_time,
                    "end_time": curr_time,
                    "start_soc": prev_soc,
                    "end_soc": curr_soc,
                    "delta_soc": delta_soc,
                    "duration_h": duration_h,
                }
            )

    print(f"🔍 Nalezeno {len(changes)} významných změn (>5% za <12h)")
    print()

    # Pro každou změnu najdi odpovídající energii z cycle_data
    capacities = []
    sohs = []

    for idx, change in enumerate(changes, 1):
        print(f"--- Změna #{idx} ---")
        print(
            f"⏰ {change['start_time'].strftime('%Y-%m-%d %H:%M')} → {change['end_time'].strftime('%Y-%m-%d %H:%M')}"
        )
        print(
            f"📊 SoC: {change['start_soc']:.0f}% → {change['end_soc']:.0f}% (Δ{change['delta_soc']:+.0f}%)"
        )
        print(f"⏱️  Trvání: {change['duration_h']:.2f}h")

        # Teoretická energie
        theoretical_energy_kwh = NOMINAL_CAPACITY_KWH * abs(change["delta_soc"]) / 100
        print(f"📐 Teoretická energie: {theoretical_energy_kwh:.2f} kWh")

        # Najdi odpovídající cyklus
        matching_cycle = None
        for cycle in cycle_data:
            cycle_start = parse_timestamp(cycle["start_time"])
            cycle_end = parse_timestamp(cycle["end_time"])

            # Pokud se časy překrývají
            time_diff_start = abs((cycle_start - change["start_time"]).total_seconds())
            time_diff_end = abs((cycle_end - change["end_time"]).total_seconds())

            # Tolerance 5 minut
            if time_diff_start < 300 and time_diff_end < 300:
                matching_cycle = cycle
                break

        if matching_cycle:
            # Máme energii!
            if change["delta_soc"] > 0:
                # Nabíjení
                measured_energy_wh = matching_cycle["charge_energy_wh"]
                print(f"⚡ Naměřená energie (nabíjení): {measured_energy_wh:.0f} Wh")
            else:
                # Vybíjení
                measured_energy_wh = matching_cycle["discharge_energy_wh"]
                print(f"⚡ Naměřená energie (vybíjení): {measured_energy_wh:.0f} Wh")

            measured_energy_kwh = measured_energy_wh / 1000

            # Výpočet odvozeně kapacity
            derived_capacity_kwh = measured_energy_kwh / (
                abs(change["delta_soc"]) / 100
            )
            derived_soh = (derived_capacity_kwh / NOMINAL_CAPACITY_KWH) * 100

            deviation_pct = (
                (measured_energy_kwh - theoretical_energy_kwh)
                / theoretical_energy_kwh
                * 100
            )

            print(f"📊 Naměřeno: {measured_energy_kwh:.2f} kWh")
            print(f"📊 Odchylka: {deviation_pct:+.1f}%")
            print(f"💡 Odvozená kapacita: {derived_capacity_kwh:.2f} kWh")
            print(f"💡 Odvozený SoH: {derived_soh:.1f}%")

            capacities.append(derived_capacity_kwh)
            sohs.append(derived_soh)
        else:
            print("⚠️  Nenalezen odpovídající cyklus s energií")

        print()

    # STATISTIKA
    print("=" * 70)
    print("STATISTICKÉ ZHODNOCENÍ")
    print("=" * 70)
    print()

    if capacities:
        print(f"📊 Celkem analyzováno: {len(capacities)} změn s energií")
        print()
        print(f"Kapacita:")
        print(f"  Průměr: {statistics.mean(capacities):.2f} kWh")
        print(f"  Medián: {statistics.median(capacities):.2f} kWh")
        print(f"  Min: {min(capacities):.2f} kWh")
        print(f"  Max: {max(capacities):.2f} kWh")
        if len(capacities) > 1:
            print(f"  Směrodatná odchylka: {statistics.stdev(capacities):.2f} kWh")
        print()
        print(f"State of Health:")
        print(f"  Průměr: {statistics.mean(sohs):.1f}%")
        print(f"  Medián: {statistics.median(sohs):.1f}%")
        print(f"  Min: {min(sohs):.1f}%")
        print(f"  Max: {max(sohs):.1f}%")
        if len(sohs) > 1:
            print(f"  Směrodatná odchylka: {statistics.stdev(sohs):.1f}%")
        print()

        # Hodnocení spolehlivosti
        print("🔬 ZÁVĚR O SPOLEHLIVOSTI:")
        print()
        avg_soh = statistics.mean(sohs)
        if len(sohs) > 1:
            soh_stdev = statistics.stdev(sohs)
            print(
                f"  Průměrný SoH: {avg_soh:.1f}% ± {soh_stdev:.1f}% (směrodatná odchylka)"
            )

            if soh_stdev < 5:
                print("  ✅ VYSOKÁ spolehlivost - malý rozptyl měření")
            elif soh_stdev < 10:
                print("  ⚠️  STŘEDNÍ spolehlivost - mírný rozptyl měření")
            else:
                print("  ❌ NÍZKÁ spolehlivost - velký rozptyl měření")

            if avg_soh > 105:
                print()
                print(
                    "  ⚠️  PROBLÉM: Průměrný SoH >105% naznačuje chybu v měření nebo kapacitě"
                )
                print("  Možné příčiny:")
                print(
                    f"    • Nominální kapacita {NOMINAL_CAPACITY_KWH} kWh je příliš nízká"
                )
                print("    • BMS SoC není lineární (neodpovídá skutečné kapacitě)")
                print("    • Energie senzory zahrnují ztráty/balancování")
            elif avg_soh < 80:
                print()
                print("  ⚠️  VAROVÁNÍ: Baterie vykazuje degradaci <80% SoH")
    else:
        print("❌ Žádná data pro statistiku")


if __name__ == "__main__":
    main()
