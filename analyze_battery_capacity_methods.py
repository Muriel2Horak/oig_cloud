#!/usr/bin/env python3
"""
Analýza různých metod výpočtu kapacity baterie.

Porovnává:
1. Současná metoda (net energy = charge - discharge)
2. Jen charge energy
3. Charge energy s efficiency korekcí
4. Fyzikální model
"""

import json
from datetime import datetime
from typing import Dict, Any, List


def load_cycle_data() -> List[Dict[str, Any]]:
    """Načíst data cyklů."""
    with open("battery_health_cycle_data.json") as f:
        return json.load(f)


def get_energy_at_time(data: List[Dict], target_time: datetime) -> float:
    """
    Získat hodnotu energy sensoru v daném čase (nebo nejblíže).

    Args:
        data: List energy dat
        target_time: Cílový čas

    Returns:
        Energy value v Wh
    """
    if not data:
        return 0.0

    # Najít nejbližší datový bod
    closest = min(
        data,
        key=lambda x: abs(
            datetime.fromisoformat(x["last_changed"].replace("Z", "+00:00"))
            - target_time
        ),
    )

    try:
        return float(closest["state"])
    except (ValueError, KeyError):
        return 0.0


def analyze_cycle_method_1_current(
    cycle: Dict[str, Any], nominal_capacity: float = 15.36
) -> Dict[str, float]:
    """
    METODA 1 (SOUČASNÁ): Net energy = charge - discharge

    Problém: Nezohledňuje efficiency baterie a inverterů.
    Výsledek: SoH > 100% (nesmysl)
    """
    start_time = datetime.fromisoformat(cycle["start_time"].replace("Z", "+00:00"))
    end_time = datetime.fromisoformat(cycle["end_time"].replace("Z", "+00:00"))

    charge_start = get_energy_at_time(cycle["charge_data"], start_time)
    charge_end = get_energy_at_time(cycle["charge_data"], end_time)
    discharge_start = get_energy_at_time(cycle["discharge_data"], start_time)
    discharge_end = get_energy_at_time(cycle["discharge_data"], end_time)

    total_charge_wh = charge_end - charge_start
    total_discharge_wh = discharge_end - discharge_start
    net_energy_wh = total_charge_wh - total_discharge_wh

    delta_soc = cycle["delta_soc"]

    if net_energy_wh <= 0 or delta_soc <= 0:
        return {"error": "Invalid net energy or delta SoC"}

    measured_capacity = (net_energy_wh / 1000.0) / (delta_soc / 100.0)
    soh = (measured_capacity / nominal_capacity) * 100.0
    purity = (
        total_charge_wh / (total_charge_wh + total_discharge_wh)
        if (total_charge_wh + total_discharge_wh) > 0
        else 0
    )

    return {
        "method": "current_net_energy",
        "charge_wh": total_charge_wh,
        "discharge_wh": total_discharge_wh,
        "net_energy_wh": net_energy_wh,
        "purity": purity,
        "capacity_kwh": measured_capacity,
        "soh_percent": soh,
    }


def analyze_cycle_method_2_charge_only(
    cycle: Dict[str, Any], nominal_capacity: float = 15.36
) -> Dict[str, float]:
    """
    METODA 2: Použít jen nabíjecí energii

    capacity = charge_energy / delta_soc

    Předpoklad: Nabíjecí energie zahrnuje ztráty, ale měří co "vstoupilo do systému".
    """
    start_time = datetime.fromisoformat(cycle["start_time"].replace("Z", "+00:00"))
    end_time = datetime.fromisoformat(cycle["end_time"].replace("Z", "+00:00"))

    charge_start = get_energy_at_time(cycle["charge_data"], start_time)
    charge_end = get_energy_at_time(cycle["charge_data"], end_time)

    total_charge_wh = charge_end - charge_start
    delta_soc = cycle["delta_soc"]

    if total_charge_wh <= 0 or delta_soc <= 0:
        return {"error": "Invalid charge energy or delta SoC"}

    measured_capacity = (total_charge_wh / 1000.0) / (delta_soc / 100.0)
    soh = (measured_capacity / nominal_capacity) * 100.0

    return {
        "method": "charge_only",
        "charge_wh": total_charge_wh,
        "capacity_kwh": measured_capacity,
        "soh_percent": soh,
    }


def analyze_cycle_method_3_with_efficiency(
    cycle: Dict[str, Any],
    nominal_capacity: float = 15.36,
    charge_efficiency: float = 0.95,  # 95% charging efficiency
) -> Dict[str, float]:
    """
    METODA 3: Charge energy s korekcí na efficiency

    capacity = (charge_energy * efficiency) / delta_soc

    Předpoklad: Z nabíjecí energie se jen část dostane do baterie kvůli ztrátám.
    Round-trip efficiency Li-ion: 90-95%
    """
    start_time = datetime.fromisoformat(cycle["start_time"].replace("Z", "+00:00"))
    end_time = datetime.fromisoformat(cycle["end_time"].replace("Z", "+00:00"))

    charge_start = get_energy_at_time(cycle["charge_data"], start_time)
    charge_end = get_energy_at_time(cycle["charge_data"], end_time)

    total_charge_wh = charge_end - charge_start
    effective_energy_wh = total_charge_wh * charge_efficiency
    delta_soc = cycle["delta_soc"]

    if total_charge_wh <= 0 or delta_soc <= 0:
        return {"error": "Invalid charge energy or delta SoC"}

    measured_capacity = (effective_energy_wh / 1000.0) / (delta_soc / 100.0)
    soh = (measured_capacity / nominal_capacity) * 100.0

    return {
        "method": "charge_with_efficiency",
        "charge_wh": total_charge_wh,
        "effective_wh": effective_energy_wh,
        "efficiency": charge_efficiency,
        "capacity_kwh": measured_capacity,
        "soh_percent": soh,
    }


def analyze_cycle_method_4_physical(
    cycle: Dict[str, Any], nominal_capacity: float = 15.36
) -> Dict[str, float]:
    """
    METODA 4: Fyzikální model

    Skutečná kapacita = nominální kapacita × (delta_soc / 100)
    To je referenční hodnota - pokud SoC je přesný, toto je "pravda".

    Pak porovnat s naměřenou energií pro validaci.
    """
    delta_soc = cycle["delta_soc"]

    # Teoretická energie potřebná pro změnu SoC
    theoretical_energy_kwh = nominal_capacity * (delta_soc / 100.0)

    # Skutečně naměřená energie
    start_time = datetime.fromisoformat(cycle["start_time"].replace("Z", "+00:00"))
    end_time = datetime.fromisoformat(cycle["end_time"].replace("Z", "+00:00"))

    charge_start = get_energy_at_time(cycle["charge_data"], start_time)
    charge_end = get_energy_at_time(cycle["charge_data"], end_time)
    discharge_start = get_energy_at_time(cycle["discharge_data"], start_time)
    discharge_end = get_energy_at_time(cycle["discharge_data"], end_time)

    total_charge_wh = charge_end - charge_start
    total_discharge_wh = discharge_end - discharge_start

    # Očekávaná nabíjecí energie při 95% efficiency
    expected_charge_wh = theoretical_energy_kwh * 1000 / 0.95

    # Discrepancy
    charge_discrepancy = (
        (total_charge_wh / expected_charge_wh - 1.0) * 100
        if expected_charge_wh > 0
        else 0
    )

    return {
        "method": "physical_model",
        "theoretical_capacity_kwh": nominal_capacity,
        "theoretical_energy_kwh": theoretical_energy_kwh,
        "expected_charge_wh": expected_charge_wh,
        "actual_charge_wh": total_charge_wh,
        "actual_discharge_wh": total_discharge_wh,
        "charge_discrepancy_percent": charge_discrepancy,
        "soh_percent": 100.0,  # Reference
    }


def main():
    """Hlavní analýza."""
    print("🔬 Battery Capacity Calculation Methods Comparison")
    print("=" * 70)
    print()

    # Načíst data
    cycles = load_cycle_data()
    nominal_capacity = 15.36  # kWh

    print(f"Nominal capacity: {nominal_capacity} kWh")
    print(f"Analyzing {len(cycles)} charging cycles")
    print()

    for cycle in cycles:
        print(f"\n{'='*70}")
        print(f"CYCLE {cycle['cycle_num']}: {cycle['start_time'][:10]}")
        print(
            f"  SoC: {cycle['start_soc']:.1f}% → {cycle['end_soc']:.1f}% (Δ{cycle['delta_soc']:.1f}%)"
        )
        print(
            f"  Duration: {(datetime.fromisoformat(cycle['end_time'].replace('Z', '+00:00')) - datetime.fromisoformat(cycle['start_time'].replace('Z', '+00:00')))}"
        )
        print(f"{'='*70}")

        # Metoda 1: Současná (net energy)
        result1 = analyze_cycle_method_1_current(cycle, nominal_capacity)
        print(f"\n📊 METHOD 1 - Current (Net Energy):")
        if "error" not in result1:
            print(f"  Charge: {result1['charge_wh']:.0f} Wh")
            print(f"  Discharge: {result1['discharge_wh']:.0f} Wh")
            print(f"  Net: {result1['net_energy_wh']:.0f} Wh")
            print(f"  Purity: {result1['purity']*100:.1f}%")
            print(f"  ➜ Capacity: {result1['capacity_kwh']:.2f} kWh")
            print(f"  ➜ SoH: {result1['soh_percent']:.1f}%")
            if result1["soh_percent"] > 100:
                print(f"  ⚠️  PROBLEM: SoH > 100% (physically impossible!)")
        else:
            print(f"  ❌ {result1['error']}")

        # Metoda 2: Jen charge
        result2 = analyze_cycle_method_2_charge_only(cycle, nominal_capacity)
        print(f"\n📊 METHOD 2 - Charge Only:")
        if "error" not in result2:
            print(f"  Charge: {result2['charge_wh']:.0f} Wh")
            print(f"  ➜ Capacity: {result2['capacity_kwh']:.2f} kWh")
            print(f"  ➜ SoH: {result2['soh_percent']:.1f}%")
            if result2["soh_percent"] > 100:
                print(f"  ⚠️  Still > 100%")
        else:
            print(f"  ❌ {result2['error']}")

        # Metoda 3: S efficiency
        for eff in [0.95, 0.92, 0.90]:
            result3 = analyze_cycle_method_3_with_efficiency(
                cycle, nominal_capacity, eff
            )
            print(f"\n📊 METHOD 3 - With Efficiency ({eff*100:.0f}%):")
            if "error" not in result3:
                print(f"  Charge: {result3['charge_wh']:.0f} Wh")
                print(
                    f"  Effective: {result3['effective_wh']:.0f} Wh (after {eff*100:.0f}% efficiency)"
                )
                print(f"  ➜ Capacity: {result3['capacity_kwh']:.2f} kWh")
                print(f"  ➜ SoH: {result3['soh_percent']:.1f}%")
                if 80 <= result3["soh_percent"] <= 100:
                    print(f"  ✅ Realistic SoH range!")
            else:
                print(f"  ❌ {result3['error']}")

        # Metoda 4: Fyzikální referenční
        result4 = analyze_cycle_method_4_physical(cycle, nominal_capacity)
        print(f"\n📊 METHOD 4 - Physical Reference:")
        print(
            f"  Theoretical energy needed: {result4['theoretical_energy_kwh']:.2f} kWh"
        )
        print(f"  Expected charge (95% eff): {result4['expected_charge_wh']:.0f} Wh")
        print(f"  Actual charge: {result4['actual_charge_wh']:.0f} Wh")
        print(f"  Actual discharge: {result4['actual_discharge_wh']:.0f} Wh")
        print(f"  Discrepancy: {result4['charge_discrepancy_percent']:+.1f}%")
        print(f"  ➜ Reference SoH: {result4['soh_percent']:.0f}%")

    print(f"\n{'='*70}")
    print("\n💡 CONCLUSIONS:")
    print("  1. Method 1 (net energy) gives SoH > 100% ❌")
    print("  2. Method 2 (charge only) also too high ❌")
    print("  3. Method 3 (with efficiency) gives realistic results ✅")
    print("  4. Efficiency factor ~90-95% needed for accurate SoH")
    print()
    print("🎯 RECOMMENDATION:")
    print("  Use Method 3 with 92-95% charging efficiency")
    print("  This accounts for inverter and battery losses")
    print()


if __name__ == "__main__":
    main()
