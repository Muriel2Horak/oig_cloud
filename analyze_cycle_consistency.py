#!/usr/bin/env python3
"""
Zjednodušená analýza: Použije 3 známé nabíjecí cykly a zkontroluje
konzistenci SoC průběhu s naměřenou energií.
"""

import json
from datetime import datetime
from typing import Any
import statistics


def parse_timestamp(ts_str: str) -> datetime:
    """Parse timestamp string to datetime"""
    return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))


def get_soc_changes_in_range(
    soc_data: list[dict[str, Any]], start_time: datetime, end_time: datetime
) -> list[tuple[datetime, float]]:
    """Vrátí všechny SoC hodnoty v daném časovém rozmezí"""
    changes = []
    for entry in soc_data:
        if entry["state"] in ("unavailable", "unknown", ""):
            continue

        entry_time = parse_timestamp(entry["last_changed"])
        if start_time <= entry_time <= end_time:
            soc = float(entry["state"])
            changes.append((entry_time, soc))

    # Seřadit podle času
    changes.sort()
    return changes


def main() -> None:
    """Hlavní funkce"""
    print("📊 Analýza konzistence SoC změn vs. naměřená energie")
    print("=" * 70)
    print()

    # Načti data
    with open("battery_health_soc_data.json") as f:
        soc_data = json.load(f)

    with open("battery_health_cycle_data.json") as f:
        cycle_data = json.load(f)

    NOMINAL_CAPACITY_KWH = 15.36

    print(f"Nominální kapacita: {NOMINAL_CAPACITY_KWH} kWh")
    print()

    all_capacities = []
    all_sohs = []
    all_deviations = []

    for idx, cycle in enumerate(cycle_data, 1):
        start_time = parse_timestamp(cycle["start_time"])
        end_time = parse_timestamp(cycle["end_time"])

        print(f"{'=' * 70}")
        print(f"CYKLUS #{idx}")
        print(f"{'=' * 70}")
        print(
            f"⏰ {start_time.strftime('%Y-%m-%d %H:%M')} → {end_time.strftime('%Y-%m-%d %H:%M')}"
        )
        print(
            f"📊 SoC: {cycle['start_soc']:.0f}% → {cycle['end_soc']:.0f}% (Δ{cycle['end_soc'] - cycle['start_soc']:+.0f}%)"
        )
        duration_h = (end_time - start_time).total_seconds() / 3600
        print(f"⏱️  Trvání: {duration_h:.2f}h")
        print()

        # Získej všechny SoC změny během cyklu
        soc_changes = get_soc_changes_in_range(soc_data, start_time, end_time)

        if soc_changes:
            print(f"🔍 Nalezeno {len(soc_changes)} SoC měření během cyklu:")
            print(
                f"   První: {soc_changes[0][0].strftime('%H:%M:%S')} = {soc_changes[0][1]:.0f}%"
            )
            print(
                f"   Poslední: {soc_changes[-1][0].strftime('%H:%M:%S')} = {soc_changes[-1][1]:.0f}%"
            )

            # Vypočítej průměrnou rychlost změny SoC
            measured_delta_soc = soc_changes[-1][1] - soc_changes[0][1]
            print(f"   Naměřená ΔSoC: {measured_delta_soc:+.0f}%")
            print(f"   Detekovaná ΔSoC: {cycle['end_soc'] - cycle['start_soc']:+.0f}%")

            # Kontrola konzistence
            soc_diff = abs(measured_delta_soc - (cycle["end_soc"] - cycle["start_soc"]))
            if soc_diff <= 2:
                print(f"   ✅ Konzistentní (rozdíl {soc_diff:.0f}%)")
            else:
                print(f"   ⚠️  NEKONZISTENTNÍ (rozdíl {soc_diff:.0f}%)")
        print()

        # Energie
        charge_wh = cycle["charge_energy_wh"]
        discharge_wh = cycle["discharge_energy_wh"]
        net_wh = charge_wh - discharge_wh

        print(f"⚡ Energie:")
        print(f"   Nabito: {charge_wh:.0f} Wh ({charge_wh/1000:.2f} kWh)")
        print(f"   Vybito: {discharge_wh:.0f} Wh ({discharge_wh/1000:.2f} kWh)")
        print(f"   Netto: {net_wh:.0f} Wh ({net_wh/1000:.2f} kWh)")
        print()

        # Výpočet kapacity
        delta_soc_pct = cycle["end_soc"] - cycle["start_soc"]
        if delta_soc_pct != 0:
            # VARIANTA 1: Net energy
            capacity_net_kwh = (net_wh / 1000) / (abs(delta_soc_pct) / 100)
            soh_net = (capacity_net_kwh / NOMINAL_CAPACITY_KWH) * 100

            # VARIANTA 2: Charge only
            capacity_charge_kwh = (charge_wh / 1000) / (abs(delta_soc_pct) / 100)
            soh_charge = (capacity_charge_kwh / NOMINAL_CAPACITY_KWH) * 100

            # Teoretická energie
            theoretical_wh = NOMINAL_CAPACITY_KWH * 1000 * (abs(delta_soc_pct) / 100)
            deviation_net = ((net_wh - theoretical_wh) / theoretical_wh) * 100
            deviation_charge = ((charge_wh - theoretical_wh) / theoretical_wh) * 100

            print(f"💡 Výpočet kapacity:")
            print()
            print(f"Teoretická energie pro {abs(delta_soc_pct):.0f}% změnu:")
            print(f"   {theoretical_wh/1000:.2f} kWh")
            print()
            print(f"Metoda 1 - NET ENERGY (nabití - vybití):")
            print(f"   Kapacita: {capacity_net_kwh:.2f} kWh")
            print(f"   SoH: {soh_net:.1f}%")
            print(f"   Odchylka od teorie: {deviation_net:+.1f}%")
            print()
            print(f"Metoda 2 - CHARGE ONLY (jen nabití):")
            print(f"   Kapacita: {capacity_charge_kwh:.2f} kWh")
            print(f"   SoH: {soh_charge:.1f}%")
            print(f"   Odchylka od teorie: {deviation_charge:+.1f}%")
            print()

            # Uložit pro statistiku
            all_capacities.append(capacity_net_kwh)
            all_sohs.append(soh_net)
            all_deviations.append(deviation_net)

        print()

    # CELKOVÁ STATISTIKA
    print("=" * 70)
    print("CELKOVÁ STATISTIKA (Metoda Net Energy)")
    print("=" * 70)
    print()

    if all_capacities:
        print(f"📊 Kapacita:")
        print(f"   Průměr: {statistics.mean(all_capacities):.2f} kWh")
        print(f"   Medián: {statistics.median(all_capacities):.2f} kWh")
        print(f"   Min: {min(all_capacities):.2f} kWh")
        print(f"   Max: {max(all_capacities):.2f} kWh")
        if len(all_capacities) > 1:
            stdev = statistics.stdev(all_capacities)
            print(f"   Směrodatná odchylka: {stdev:.2f} kWh")
            print(
                f"   Variační koeficient: {(stdev/statistics.mean(all_capacities))*100:.1f}%"
            )
        print()

        print(f"📊 State of Health:")
        print(f"   Průměr: {statistics.mean(all_sohs):.1f}%")
        print(f"   Medián: {statistics.median(all_sohs):.1f}%")
        print(f"   Min: {min(all_sohs):.1f}%")
        print(f"   Max: {max(all_sohs):.1f}%")
        if len(all_sohs) > 1:
            stdev_soh = statistics.stdev(all_sohs)
            print(f"   Směrodatná odchylka: {stdev_soh:.1f}%")
            print(
                f"   Variační koeficient: {(stdev_soh/statistics.mean(all_sohs))*100:.1f}%"
            )
        print()

        print(f"📊 Odchylka od teoretické energie:")
        print(f"   Průměr: {statistics.mean(all_deviations):+.1f}%")
        print(f"   Medián: {statistics.median(all_deviations):+.1f}%")
        print(f"   Min: {min(all_deviations):+.1f}%")
        print(f"   Max: {max(all_deviations):+.1f}%")
        print()

        # ZÁVĚR
        print("=" * 70)
        print("🔬 ZÁVĚR O SPOLEHLIVOSTI MĚŘENÍ")
        print("=" * 70)
        print()

        avg_soh = statistics.mean(all_sohs)
        if len(all_sohs) > 1:
            soh_stdev = statistics.stdev(all_sohs)
            variation_coef = (soh_stdev / avg_soh) * 100

            print(f"Průměrný SoH: {avg_soh:.1f}% ± {soh_stdev:.1f}%")
            print()

            # Hodnocení rozptylu
            if variation_coef < 5:
                print("✅ VYSOKÁ SPOLEHLIVOST")
                print(f"   Variační koeficient {variation_coef:.1f}% < 5%")
                print("   Měření jsou konzistentní mezi různými cykly")
            elif variation_coef < 15:
                print("⚠️  STŘEDNÍ SPOLEHLIVOST")
                print(f"   Variační koeficient {variation_coef:.1f}% (5-15%)")
                print("   Měření vykazují mírný rozptyl")
            else:
                print("❌ NÍZKÁ SPOLEHLIVOST")
                print(f"   Variační koeficient {variation_coef:.1f}% > 15%")
                print("   Měření jsou velmi nekonzistentní")

            print()

            # Hodnocení SoH hodnoty
            if avg_soh > 110:
                print("❌ KRITICKÝ PROBLÉM:")
                print(f"   Průměrný SoH {avg_soh:.1f}% >> 100%")
                print()
                print("   Možné příčiny:")
                print(f"   1. Nominální kapacita {NOMINAL_CAPACITY_KWH} kWh je CHYBNÁ")
                calculated_nominal = statistics.mean(all_capacities)
                print(
                    f"      → Skutečná kapacita pravděpodobně: ~{calculated_nominal:.2f} kWh"
                )
                print()
                print("   2. BMS SoC kalibrace je CHYBNÁ")
                print("      → BMS hlásí menší ΔSoC než skutečně proběhlo")
                print()
                print("   3. Energie senzory zahrnují DODATEČNÉ ZTRÁTY")
                print("      → Měří i balancování nebo jiné systémové ztráty")

            elif avg_soh > 105:
                print("⚠️  PROBLÉM:")
                print(f"   Průměrný SoH {avg_soh:.1f}% > 105%")
                print("   Naměřená energie je systematicky vyšší než teoretická")
                print()
                print(
                    "   Doporučení: Zkontrolovat kalibraci BMS nebo nominální kapacitu"
                )

            elif 95 <= avg_soh <= 105:
                print("✅ ODPOVÍDÁ OČEKÁVÁNÍ:")
                print(f"   Průměrný SoH {avg_soh:.1f}% je v rozmezí 95-105%")
                print("   Měření jsou v souladu s nominální kapacitou")
                print("   Baterie vykazuje normální chování")

            elif 80 <= avg_soh < 95:
                print("⚠️  MÍRNÁ DEGRADACE:")
                print(f"   Průměrný SoH {avg_soh:.1f}% < 95%")
                print("   Baterie vykazuje známky degradace")

            else:
                print("❌ VÝRAZNÁ DEGRADACE:")
                print(f"   Průměrný SoH {avg_soh:.1f}% < 80%")
                print("   Baterie má významně sníženou kapacitu")


if __name__ == "__main__":
    main()
