#!/usr/bin/env python3
"""
Analýza What-If výsledků z DP optimalizace.

Vysvětlí:
- Proč DP zvolil tento mix režimů
- Kolik by stály alternativní strategie
- Jak se rozhoduje mezi režimy podle cen a času
"""

import requests
import json
from datetime import datetime
from typing import Dict, List, Any

# API endpoint
BASE_URL = "https://ha.muriel-cz.cz"
SENSOR_ID = "sensor.oig_2206237016_battery_forecast"


def get_sensor_attributes() -> Dict[str, Any]:
    """Získat atributy battery forecast senzoru."""
    url = f"{BASE_URL}/api/states/{SENSOR_ID}"
    response = requests.get(url)
    data = response.json()
    return data.get("attributes", {})


def analyze_mode_distribution(modes_dist: Dict[str, int]) -> None:
    """Analyzovat distribuci režimů."""
    total = sum(modes_dist.values())

    print("📊 DISTRIBUCE REŽIMŮ V DP PLÁNU:")
    print("=" * 80)

    mode_descriptions = {
        "HOME_I": "Grid priority - nabíjení ze sítě, levné hodiny",
        "HOME_II": "Battery priority - vybíjení baterie, drahé hodiny",
        "HOME_III": "Solar priority - výchozí režim",
        "HOME_UPS": "UPS - AC nabíjení, držení baterie",
    }

    for mode_name in ["HOME_I", "HOME_II", "HOME_III", "HOME_UPS"]:
        count = modes_dist.get(mode_name, 0)
        if count == 0:
            continue
        pct = (count / total * 100) if total > 0 else 0
        desc = mode_descriptions.get(mode_name, "")

        # Visual bar
        bar_length = int(pct / 2)  # Scale to 50 chars max
        bar = "█" * bar_length

        print(f"{mode_name:10} : {count:3}× ({pct:5.1f}%) {bar}")
        print(f"             {desc}")
        print()


def analyze_alternatives(alternatives: Dict[str, Any], dp_cost: float) -> None:
    """Analyzovat alternativní strategie."""
    print("📉 WHAT-IF ANALÝZA - Srovnání strategií:")
    print("=" * 80)
    print(f"✅ DP OPTIMALIZACE (Multi-Mode): {dp_cost:.2f} Kč")
    print()

    # Seřadit podle nákladů
    sorted_alts = sorted(
        alternatives.items(), key=lambda x: x[1].get("total_cost_czk", 0)
    )

    strategy_descriptions = {
        "HOME I": "Vždy nabíjet ze sítě (ignoruje ceny)",
        "HOME II": "Vždy z baterie (minimální grid)",
        "HOME III": "Vždy solar (bez nabíjení)",
        "Home UPS": "Vždy UPS (maximální komfort)",
        "DO NOTHING": "Žádné nabíjení ze sítě",
        "CHARGE ALWAYS": "Agresivní nabíjení (vždy full)",
    }

    for strategy_name, data in sorted_alts:
        cost = data.get("total_cost_czk", 0)
        delta = data.get("delta_czk", 0)
        delta_pct = data.get("delta_percent", 0)

        desc = strategy_descriptions.get(strategy_name, "")

        if delta > 0:
            # DP je levnější
            symbol = "💰"
            comparison = f"DP UŠETŘÍ {delta:6.2f} Kč ({delta_pct:5.1f}%)"
        elif delta < 0:
            # DP je dražší (nemělo by se stát)
            symbol = "⚠️"
            comparison = f"DP ZDRAŽENÍ {abs(delta):6.2f} Kč ({abs(delta_pct):5.1f}%)"
        else:
            symbol = "➖"
            comparison = "STEJNÉ"

        print(f"{symbol} {strategy_name:15} : {cost:7.2f} Kč  |  {comparison}")
        if desc:
            print(f"   └─ {desc}")
        print()


def get_timeline_details() -> List[Dict[str, Any]]:
    """Získat detailní timeline data."""
    url = f"{BASE_URL}/api/oig_cloud/battery_forecast/2206237016/timeline?type=active"
    response = requests.get(url)
    data = response.json()
    return data.get("active", [])


def analyze_mode_switches(timeline: List[Dict[str, Any]]) -> None:
    """Analyzovat přepínání režimů v čase."""
    print("🔄 ČASOVÝ PRŮBĚH REŽIMŮ (24h):")
    print("=" * 80)

    # Seskupit po hodinách
    hourly = {}
    for point in timeline:
        ts = point.get("timestamp", "")
        mode = point.get("mode", "UNKNOWN")
        price = point.get("spot_price_czk", 0)

        try:
            dt = datetime.fromisoformat(ts)
            hour = dt.hour

            if hour not in hourly:
                hourly[hour] = []
            hourly[hour].append({"mode": mode, "price": price})
        except:
            continue

    # Vypsat po hodinách
    for hour in sorted(hourly.keys()):
        intervals = hourly[hour]
        modes = [i["mode"] for i in intervals]
        avg_price = sum(i["price"] for i in intervals) / len(intervals)

        # Určit dominantní režim
        mode_counts = {}
        for m in modes:
            mode_counts[m] = mode_counts.get(m, 0) + 1
        dominant = max(mode_counts, key=mode_counts.get)

        # Emoji podle režimu
        emoji = {
            "HOME I": "⚡",
            "HOME II": "🔋",
            "HOME III": "☀️",
            "Home UPS": "🏠",
        }.get(dominant, "❓")

        # Price color indication
        if avg_price < 3.5:
            price_indicator = "💚 levná"
        elif avg_price < 4.5:
            price_indicator = "💛 střední"
        else:
            price_indicator = "❤️ drahá"

        print(
            f"{hour:02d}:00-{hour:02d}:59  {emoji} {dominant:10}  |  "
            f"{avg_price:5.2f} Kč/kWh {price_indicator}"
        )


def explain_decision_logic():
    """Vysvětlit rozhodovací logiku DP."""
    print()
    print("💡 ROZHODOVACÍ LOGIKA:")
    print("=" * 80)
    print(
        """
DP (Dynamic Programming) optimalizace rozhoduje podle:

1️⃣  CENA ELEKTŘINY (spot price):
    • Nízká cena (<3.5 Kč/kWh) → HOME I (nabíjet ze sítě)
    • Vysoká cena (>4.5 Kč/kWh) → HOME II (vybíjet baterii)
    • Střední cena → HOME III nebo optimalizovat

2️⃣  STAV BATERIE (SoC):
    • Nízká kapacita → priorita nabíjení (HOME I/UPS)
    • Vysoká kapacita → priorita vybíjení (HOME II)
    • Musí držet nad minimum (20% = 2.46 kWh)

3️⃣  SLUNEČNÍ VÝROBA:
    • Hodně slunce → HOME III (solar priorita)
    • Přebytek → HOME I (uložit do baterie)
    • Nedostatek → HOME II (z baterie)

4️⃣  SPOTŘEBA (load):
    • Vysoká spotřeba + nízká cena → HOME I (ze sítě)
    • Vysoká spotřeba + vysoká cena → HOME II (z baterie)

5️⃣  EKONOMICKÁ ROVNOVÁHA:
    • Porovnává NÁKLADY na nákup vs. ÚSPORY z vybíjení
    • Opportunity cost: co bychom ztratili nevybíjením
    • Bellman equation: minimalizuje CELKOVÉ náklady za 24h

✅ VÝSLEDEK: Mix režimů, který minimalizuje celkové náklady!
    """
    )


def main():
    print("🔍 WHAT-IF ANALÝZA - Battery Forecast DP Optimization")
    print("=" * 80)
    print()

    # Získat data
    attrs = get_sensor_attributes()

    # Mode optimization summary
    mode_opt = attrs.get("mode_optimization", {})
    if not mode_opt:
        print("❌ Žádná DP optimalizace není dostupná!")
        return

    dp_cost = mode_opt.get("total_cost_czk", 0)
    modes_dist = mode_opt.get("modes_distribution", {})
    alternatives = mode_opt.get("alternatives", {})

    # Analýza
    analyze_mode_distribution(modes_dist)
    print()
    analyze_alternatives(alternatives, dp_cost)
    print()

    # Timeline detail
    try:
        timeline = get_timeline_details()
        analyze_mode_switches(timeline)
    except Exception as e:
        print(f"⚠️ Nelze načíst timeline detail: {e}")

    # Vysvětlení
    explain_decision_logic()


if __name__ == "__main__":
    main()
