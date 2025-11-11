#!/usr/bin/env python3
"""
Analýza včerejšího hybrid chování - detailní kontrola dobíjení baterie
"""

import json
import sys
from pathlib import Path

# Načíst data
with open("/tmp/detail_tabs_data.json") as f:
    data = json.load(f)

blocks = data["yesterday"]["mode_blocks"]

print("=" * 100)
print("🔍 DETAILNÍ ANALÝZA PROBLÉMOVÉHO BLOKU 02:00-04:30")
print("=" * 100)

problem_block = blocks[6]  # Index 6 = blok č. 7

soc_start_pct = problem_block.get("battery_soc_start", 0.0)
soc_end_pct = problem_block.get("battery_soc_end", 0.0)
soc_start_kwh = problem_block.get("battery_kwh_start")
soc_end_kwh = problem_block.get("battery_kwh_end")

kwh_suffix = ""
if soc_start_kwh is not None and soc_end_kwh is not None:
    kwh_suffix = f" ({soc_start_kwh:.2f} → {soc_end_kwh:.2f} kWh)"
print(
    f'\nČas: {problem_block["start_time"]}-{problem_block["end_time"]} ({problem_block["duration_hours"]:.2f}h = {problem_block["interval_count"]} intervalů)'
)
print(
    f'Režim: {problem_block["mode_historical"]} (plán: {problem_block["mode_planned"]}) - Match: {"✅" if problem_block["mode_match"] else "❌"}'
)
print(f"\nBaterie: {soc_start_pct:.1f}% → {soc_end_pct:.1f}%{kwh_suffix}")
print("  ⚠️  Baterie nepřibyla - SOC stagnuje!")
print(f"\nNáklady:")
print(f'  Skutečnost: {problem_block["cost_historical"]:.2f} Kč')
print(f'  Plán:       {problem_block["cost_planned"]:.2f} Kč')
print(
    f'  DELTA:      +{problem_block["cost_delta"]:.2f} Kč (🔴 +{problem_block["cost_delta"]/problem_block["cost_planned"]*100:.0f}%)'
)
print(f"\nEnergie:")
print(f'  ☀️  Solár:      {problem_block["solar_total_kwh"]:.2f} kWh')
print(f'  🏠 Spotřeba:   {problem_block["consumption_total_kwh"]:.2f} kWh')
print(f'  ⬇️  Import:     {problem_block["grid_import_total_kwh"]:.2f} kWh')
print(f'  ⬆️  Export:     {problem_block["grid_export_total_kwh"]:.2f} kWh')

print("\n" + "=" * 100)
print("💡 HYPOTÉZY")
print("=" * 100)
print("\n1️⃣ BATERIE NEDOBÍJÍ")
print("   - Baterie držela konstantní SOC celý den")
print("   - Možná důvody:")
print("     a) Baterie je skutečně prázdná a nabíjení nefunguje")
print("     b) Historical data neobsahují korektní SOC%")
print("     c) Sensor battery_soc% nefunguje správně")

print("\n2️⃣ VYSOKÉ NÁKLADY PŘI HOME UPS (2.5h = +52.88 Kč)")
print("   - HOME UPS by měl držet baterii a minimalizovat import")
print("   - Ale spotřeba 0.73 kWh stála 76.86 Kč místo 23.98 Kč")
print("   - Možná důvody:")
print("     a) Baterie prázdná → musí importovat vše z mřížky")
print("     b) Vysoká tarif v noci (02:00-04:30)")
print("     c) Plán počítal s plnou baterií, ale byla prázdná")

print("\n3️⃣ ČASTÉ PŘEPÍNÁNÍ HOME UPS ↔ HOME I")
print("   - 26 změn za den = každou hodinu")
print("   - Možná důvody:")
print("     a) Balancer reaguje na prázdnou baterii")
print("     b) Hystereze/threshold příliš citlivé")
print("     c) Chybná logika pro výběr režimu při 0% SOC")

print("\n" + "=" * 100)
print("🔧 DOPORUČENÉ AKCE")
print("=" * 100)
print("\n1. Zkontrolovat sensor battery_soc% - proč stagnuje na stejné hodnotě")
print("2. Prozkoumat historical data API - obsahují korektní SOC%?")
print("3. Zkontrolovat balancer logiku pro prázdnou baterii")
print("4. Ověřit grid charging - proč nedobíjí baterii?")
print("5. Analyzovat tarify 02:00-04:30 - možná příliš drahé pro dobíjení")

print("\n" + "=" * 100)
