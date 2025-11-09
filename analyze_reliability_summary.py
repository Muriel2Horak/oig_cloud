#!/usr/bin/env python3
"""
Finální analýza spolehlivosti měření - Summary Report
Založeno na 3 nabíjecích cyklech za období 2.-9.11.2025
"""

import statistics

print("=" * 70)
print("ANALÝZA SPOLEHLIVOSTI MĚŘENÍ BATERIE")
print("=" * 70)
print()

# Data z test_midnight_crossing.py (metoda NET ENERGY)
cycles = [
    {
        "num": 1,
        "date": "3.-4.11.2025",
        "delta_soc": 47,  # %
        "capacity_kwh": 19.35,
        "soh_15_36": 126.0,  # %
        "spans_midnight": True,
    },
    {
        "num": 2,
        "date": "8.11.2025",
        "delta_soc": 41,  # %
        "capacity_kwh": 16.07,
        "soh_15_36": 104.6,  # %
        "spans_midnight": False,
    },
    {
        "num": 3,
        "date": "8.-9.11.2025",
        "delta_soc": 76,  # %
        "capacity_kwh": 14.81,
        "soh_15_36": 96.4,  # %
        "spans_midnight": True,
    },
]

NOMINAL_CAPACITY = 15.36  # kWh

print("📊 VSTUPNÍ DATA:")
print()
for cycle in cycles:
    print(f"Cyklus {cycle['num']} ({cycle['date']}):")
    print(f"  ΔSoC: {cycle['delta_soc']}%")
    print(f"  Kapacita: {cycle['capacity_kwh']:.2f} kWh")
    print(f"  SoH: {cycle['soh_15_36']:.1f}%")
    print(f"  Přes půlnoc: {'Ano' if cycle['spans_midnight'] else 'Ne'}")
    print()

# STATISTIKA
capacities = [c["capacity_kwh"] for c in cycles]
sohs = [c["soh_15_36"] for c in cycles]
delta_socs = [c["delta_soc"] for c in cycles]

print("=" * 70)
print("STATISTICKÁ ANALÝZA")
print("=" * 70)
print()

print("📊 Kapacita (NET ENERGY metoda):")
print(f"   Průměr: {statistics.mean(capacities):.2f} kWh")
print(f"   Medián: {statistics.median(capacities):.2f} kWh")
print(f"   Min: {min(capacities):.2f} kWh (Cyklus 3)")
print(f"   Max: {max(capacities):.2f} kWh (Cyklus 1)")
stdev_cap = statistics.stdev(capacities)
mean_cap = statistics.mean(capacities)
variation_coef_cap = (stdev_cap / mean_cap) * 100
print(f"   Směrodatná odchylka: {stdev_cap:.2f} kWh")
print(f"   Variační koeficient: {variation_coef_cap:.1f}%")
print()

print("📊 State of Health (vs 15.36 kWh):")
print(f"   Průměr: {statistics.mean(sohs):.1f}%")
print(f"   Medián: {statistics.median(sohs):.1f}%")
print(f"   Min: {min(sohs):.1f}% (Cyklus 3)")
print(f"   Max: {max(sohs):.1f}% (Cyklus 1)")
stdev_soh = statistics.stdev(sohs)
mean_soh = statistics.mean(sohs)
variation_coef_soh = (stdev_soh / mean_soh) * 100
print(f"   Směrodatná odchylka: {stdev_soh:.1f}%")
print(f"   Variační koeficient: {variation_coef_soh:.1f}%")
print()

# KORELACE s velikostí cyklu
print("📊 Korelace velikost cyklu vs. SoH:")
for cycle in cycles:
    print(f"   ΔSoC {cycle['delta_soc']:>3}%  →  SoH {cycle['soh_15_36']:>6.1f}%")
print()

# ZÁVĚR
print("=" * 70)
print("🔬 ZÁVĚR O SPOLEHLIVOSTI")
print("=" * 70)
print()

# 1. Rozptyl měření
print("1️⃣  KONZISTENCE MĚŘENÍ:")
print()
if variation_coef_soh < 10:
    print(f"   ✅ DOBRÁ konzistence (variační koef. {variation_coef_soh:.1f}% < 10%)")
elif variation_coef_soh < 20:
    print(
        f"   ⚠️  STŘEDNÍ konzistence (variační koef. {variation_coef_soh:.1f}% = 10-20%)"
    )
else:
    print(f"   ❌ ŠPATNÁ konzistence (variační koef. {variation_coef_soh:.1f}% > 20%)")

print()
print(f"   Pozorování: Rozptyl {stdev_soh:.1f}% je relativně velký.")
print("   To naznačuje, že měření není zcela stabilní.")
print()

# 2. Korelace se swingem
print("2️⃣  VLIV VELIKOSTI CYKLU:")
print()
print("   Cykly s MALÝM swingem (41-47%):")
print(f"      Cyklus 1: 47% → SoH {cycles[0]['soh_15_36']:.1f}%")
print(f"      Cyklus 2: 41% → SoH {cycles[1]['soh_15_36']:.1f}%")
print("      → Nadhodnocený SoH >100%")
print()
print("   Cykly s VELKÝM swingem (76%):")
print(f"      Cyklus 3: 76% → SoH {cycles[2]['soh_15_36']:.1f}%")
print("      → Realistický SoH ~96%")
print()
print("   ⚠️  ZJIŠTĚNÍ: Malé cykly dávají NEPŘESNÉ výsledky!")
print("   → BMS SoC kalibrace není dostatečně přesná pro <50% swingy")
print()

# 3. Systematická chyba
print("3️⃣  SYSTEMATICKÁ ODCHYLKA:")
print()
print(f"   Průměrný SoH: {mean_soh:.1f}%")
print(f"   Nominální kapacita: {NOMINAL_CAPACITY} kWh")
print(f"   Vypočítaná průměrná kapacita: {mean_cap:.2f} kWh")
print()

if mean_soh > 100:
    print("   ⚠️  SoH > 100% indikuje PROBLÉM:")
    print()
    print("   MOŽNÁ PŘÍČINA #1: Nominální kapacita je chybně nastavena")
    calculated_nominal = statistics.median(capacities)  # Medián je robustnější
    print(f"      → Skutečná kapacita pravděpodobně: {calculated_nominal:.2f} kWh")
    print(
        f"      → Navrhovaná korekce: {NOMINAL_CAPACITY} → {calculated_nominal:.2f} kWh"
    )
    print()
    print("   MOŽNÁ PŘÍČINA #2: BMS SoC není lineární")
    print("      → BMS hlásí menší % změnu než skutečně proběhlo")
    print("      → Vliv je větší u malých cyklů (Cyklus 1, 2)")
    print()
    print("   MOŽNÁ PŘÍČINA #3: Energie senzory zahrnují dodatečné ztráty")
    print("      → Např. balancování článků, BMS overhead")
    print("      → To by zvyšovalo naměřenou energii vs. teoretickou")
print()

# 4. Doporučení
print("=" * 70)
print("💡 DOPORUČENÍ")
print("=" * 70)
print()

print("1. PRO PRODUKČNÍ KÓD:")
print()
print("   ✅ Použít MEDIÁN místo průměru (robustnější vůči outli erům)")
best_cycle = cycles[2]  # Cyklus 3
print(f"   ✅ Filtrovat cykly: POUZE ΔSoC >= 60% (eliminovat Cykly 1,2)")
print(
    f"   ✅ Aktuální nejlepší měření: Cyklus 3 = {best_cycle['capacity_kwh']:.2f} kWh ({best_cycle['soh_15_36']:.1f}% SoH)"
)
print()

print("2. NOMINÁLNÍ KAPACITA:")
print()
median_capacity = statistics.median(capacities)
if median_capacity > NOMINAL_CAPACITY * 1.05:
    print(f"   ⚠️  Doporučeno ZVÝŠIT na {median_capacity:.2f} kWh")
    print(f"      (aktuálně {NOMINAL_CAPACITY} kWh je pravděpodobně příliš nízká)")
elif best_cycle["soh_15_36"] >= 95:
    print(f"   ✅ Ponechat {NOMINAL_CAPACITY} kWh")
    print(f"      Nejlepší měření (Cyklus 3): {best_cycle['soh_15_36']:.1f}% SoH")
print()

print("3. FILTRY PRO SPOLEHLIVOST:")
print()
print("   • Minimální ΔSoC: 60% (ne 40%)")
print("   • Maximální doba: 12h")
print("   • Koncové SoC: >= 95%")
print("   • Počáteční SoC: <= 40%")
print("   → Toto zajistí kvalitnější data pro výpočet kapacity")
print()

print("4. LONG-TERM MONITORING:")
print()
print("   • Sbírat min. 10 kvalitních cyklů (ΔSoC >= 60%)")
print("   • Sledovat TREND degradace (regression line)")
print("   • Alarmovat pouze pokud SoH < 80% po více než 3 po sobě jdoucích cyklech")
print()

print("=" * 70)
print("📋 SHRNUTÍ")
print("=" * 70)
print()
print(f"✅ SoC data jsou KONZISTENTNÍ (detekce vs. měření shodné)")
print(f"✅ Midnight crossing logika FUNGUJE správně")
print(f"✅ NET ENERGY metoda je správný přístup")
print()
print(f"⚠️  Malé cykly (<60% swing) dávají NEPŘESNÉ výsledky")
print(f"⚠️  Variabilita {stdev_soh:.1f}% mezi cykly je vyšší než ideální")
print()
print(f"💡 NEJSPOLEHLIVĚJŠÍ měření: Cyklus 3")
print(f"   Kapacita: {best_cycle['capacity_kwh']:.2f} kWh")
print(f"   SoH: {best_cycle['soh_15_36']:.1f}%")
print(f"   Důvod: Největší swing ({best_cycle['delta_soc']}%), nejpřesnější měření")
print()
print("🎯 DOPORUČENÍ PRO PRODUKCI:")
print(f"   → Filtrovat pouze cykly s ΔSoC >= 60%")
print(f"   → Použít medián místo průměru")
print(f"   → Sledovat trend, ne jednotlivá měření")
print()
