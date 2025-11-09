#!/usr/bin/env python3
"""
Prototyp pro analýzu Battery Health - měření skutečné kapacity baterie.

Cíl: Najít správný způsob výpočtu kapacity z historických dat.
"""

import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import requests
from dataclasses import dataclass


@dataclass
class BatteryMeasurement:
    """Struktura pro jedno měření kapacity baterie."""

    timestamp: datetime
    capacity_kwh: float
    soh_percent: float
    start_soc: float
    end_soc: float
    delta_soc: float
    method: str
    confidence: float
    total_charge_wh: float
    total_discharge_wh: float
    duration_hours: float
    purity: float
    quality_score: float


class HADataFetcher:
    """Stahování dat z Home Assistant."""

    def __init__(self, ha_url: str, ha_token: str):
        self.ha_url = ha_url.rstrip("/")
        self.ha_token = ha_token
        self.headers = {
            "Authorization": f"Bearer {ha_token}",
            "Content-Type": "application/json",
        }

    def get_statistics(
        self, entity_id: str, start_time: datetime, end_time: datetime
    ) -> List[Dict[str, Any]]:
        """
        Načíst statistiky pro entitu.

        Args:
            entity_id: ID entity (např. sensor.oig_2206237016_batt_bat_c)
            start_time: Začátek období
            end_time: Konec období

        Returns:
            List statistik
        """
        url = f"{self.ha_url}/api/history/period/{start_time.isoformat()}"
        params = {
            "filter_entity_id": entity_id,
            "end_time": end_time.isoformat(),
            "minimal_response": "true",
        }

        resp = requests.get(url, headers=self.headers, params=params, timeout=30)
        if resp.status_code != 200:
            raise Exception(f"Failed to fetch data: {resp.status_code}")
        data = resp.json()
        return data[0] if data else []

    def get_state(self, entity_id: str) -> Dict[str, Any]:
        """Získat aktuální stav entity."""
        url = f"{self.ha_url}/api/states/{entity_id}"

        resp = requests.get(url, headers=self.headers, timeout=10)
        if resp.status_code != 200:
            raise Exception(f"Failed to fetch state: {resp.status_code}")
        return resp.json()


class BatteryHealthAnalyzer:
    """Analyzátor health dat baterie."""

    def __init__(self, nominal_capacity_kwh: float = 15.36):
        self.nominal_capacity = nominal_capacity_kwh
        self.measurements: List[BatteryMeasurement] = []

    def detect_charging_cycles(
        self, soc_data: List[Dict]
    ) -> List[Tuple[datetime, datetime, float, float]]:
        """
        Detekce nabíjecích cyklů v SoC datech.

        Args:
            soc_data: List of {state: float, last_changed: datetime}

        Returns:
            List of (start_time, end_time, start_soc, end_soc)
        """
        cycles = []

        # Kritéria pro validní cyklus
        MIN_DELTA_SOC = 40.0  # % - minimum swing
        MIN_END_SOC = 95.0  # % - konec musí být ≥95%

        i = 0
        while i < len(soc_data) - 1:
            current_soc = float(soc_data[i]["state"])
            current_time = soc_data[i]["last_changed"]

            # Hledat lokální minimum (začátek nabíjení)
            if i > 0:
                prev_soc = float(soc_data[i - 1]["state"])
                if current_soc > prev_soc:
                    i += 1
                    continue

            # Od lokálního minima hledat konec nabíjení (high SoC)
            j = i + 1
            max_soc = current_soc
            max_idx = i

            while j < len(soc_data):
                next_soc = float(soc_data[j]["state"])

                if next_soc > max_soc:
                    max_soc = next_soc
                    max_idx = j
                elif next_soc < max_soc - 5:  # Pokles o 5% = konec nabíjení
                    break

                j += 1

            # Validace cyklu
            delta_soc = max_soc - current_soc
            if delta_soc >= MIN_DELTA_SOC and max_soc >= MIN_END_SOC:
                end_time = soc_data[max_idx]["last_changed"]
                cycles.append((current_time, end_time, current_soc, max_soc))
                print(
                    f"  ✓ Cycle found: {current_soc:.1f}% → {max_soc:.1f}% (Δ{delta_soc:.1f}%)"
                )

            i = max_idx + 1

        return cycles

    def calculate_capacity_from_energy(
        self,
        start_time: datetime,
        end_time: datetime,
        start_soc: float,
        end_soc: float,
        charge_data: List[Dict],
        discharge_data: List[Dict],
    ) -> Optional[BatteryMeasurement]:
        """
        Vypočítat kapacitu baterie z energy sensorů.

        PROBLÉM současného kódu:
        - measured_capacity_kwh = (net_energy_wh / 1000.0) / (delta_soc / 100.0)
        - net_energy_wh = charge_wh - discharge_wh
        - Nezohledňuje efficiency!

        SPRÁVNÝ přístup:
        - Použít JEN nabíjecí energii (charge_wh)
        - Započítat round-trip efficiency (~90-95%)
        - Nebo použít změnu SoC × nominal_capacity jako referenci

        Args:
            start_time: Začátek cyklu
            end_time: Konec cyklu
            start_soc: Počáteční SoC (%)
            end_soc: Konečný SoC (%)
            charge_data: Data z computed_batt_charge_energy_today
            discharge_data: Data z computed_batt_discharge_energy_today

        Returns:
            BatteryMeasurement nebo None
        """
        # TODO: Implementace různých metod výpočtu
        # 1. Současná metoda (pro srovnání)
        # 2. Jen charge energy / delta_soc
        # 3. Charge energy s efficiency korekcí
        # 4. Fyzikální model

        delta_soc = end_soc - start_soc
        duration = end_time - start_time

        print(f"\nAnalyzing cycle: {start_time} → {end_time}")
        print(f"  SoC: {start_soc:.1f}% → {end_soc:.1f}% (Δ{delta_soc:.1f}%)")
        print(f"  Duration: {duration}")

        # Získat energy values
        # TODO: Implementovat načítání z dat

        return None


def main():
    """Hlavní funkce pro analýzu."""

    # Načíst konfiguraci
    config_path = "/Users/martinhorak/Downloads/oig_cloud/.ha_config"
    if not os.path.exists(config_path):
        print(f"❌ Config file not found: {config_path}")
        return

    with open(config_path) as f:
        config = {}
        for line in f:
            if "=" in line:
                key, value = line.strip().split("=", 1)
                config[key] = value

    ha_url = config.get("HA_URL", "http://10.0.0.143:8123")
    ha_token = config.get("HA_TOKEN")
    box_id = config.get("BOX_ID", "2206237016")

    if not ha_token:
        print("❌ HA_TOKEN not found in config")
        return

    print(f"🔍 Battery Health Analysis")
    print(f"  HA URL: {ha_url}")
    print(f"  Box ID: {box_id}")
    print()

    # Inicializovat fetcher
    fetcher = HADataFetcher(ha_url, ha_token)
    analyzer = BatteryHealthAnalyzer()

    # Období analýzy - např. poslední týden
    end_time = datetime.now()
    start_time = end_time - timedelta(days=7)

    print(f"📅 Analysis period: {start_time.date()} to {end_time.date()}")
    print()

    # 1. Načíst SoC data
    print("📊 Fetching SoC data...")
    soc_sensor = f"sensor.oig_{box_id}_batt_bat_c"

    try:
        soc_data = fetcher.get_statistics(soc_sensor, start_time, end_time)
        print(f"  ✓ Got {len(soc_data)} SoC data points")

        # Uložit data pro offline analýzu
        output_file = "battery_health_soc_data.json"
        with open(output_file, "w") as f:
            # Convert datetime to ISO format
            data_to_save = []
            for point in soc_data:
                data_to_save.append(
                    {
                        "state": point.get("state"),
                        "last_changed": point.get("last_changed"),
                        "last_updated": point.get("last_updated"),
                    }
                )
            json.dump(data_to_save, f, indent=2)
        print(f"  💾 Saved to {output_file}")

    except Exception as e:
        print(f"  ❌ Error fetching SoC data: {e}")
        return

    # 2. Detekovat nabíjecí cykly
    print()
    print("🔍 Detecting charging cycles...")

    # Připravit data pro analýzu
    soc_points = []
    for point in soc_data:
        if point.get("state") not in ["unknown", "unavailable", None]:
            try:
                soc_points.append(
                    {
                        "state": float(point["state"]),
                        "last_changed": datetime.fromisoformat(
                            point["last_changed"].replace("Z", "+00:00")
                        ),
                    }
                )
            except (ValueError, KeyError):
                continue

    cycles = analyzer.detect_charging_cycles(soc_points)
    print(f"  ✓ Found {len(cycles)} charging cycles")

    # 3. Pro každý cyklus stáhnout energy data
    print()
    print("⚡ Fetching energy data for cycles...")

    charge_sensor = f"sensor.oig_{box_id}_computed_batt_charge_energy_today"
    discharge_sensor = f"sensor.oig_{box_id}_computed_batt_discharge_energy_today"

    cycle_data = []
    for i, (start_time, end_time, start_soc, end_soc) in enumerate(cycles, 1):
        print(f"\n  Cycle {i}: {start_time.date()} {start_soc:.1f}% → {end_soc:.1f}%")

        # Rozšířit časové okno o pár hodin před/po pro jistotu
        fetch_start = start_time - timedelta(hours=2)
        fetch_end = end_time + timedelta(hours=2)

        try:
            # Stáhnout charge data
            charge_data = fetcher.get_statistics(charge_sensor, fetch_start, fetch_end)
            print(f"    ✓ Charge data: {len(charge_data)} points")

            # Stáhnout discharge data
            discharge_data = fetcher.get_statistics(
                discharge_sensor, fetch_start, fetch_end
            )
            print(f"    ✓ Discharge data: {len(discharge_data)} points")

            # Uložit pro analýzu
            cycle_data.append(
                {
                    "cycle_num": i,
                    "start_time": start_time.isoformat(),
                    "end_time": end_time.isoformat(),
                    "start_soc": start_soc,
                    "end_soc": end_soc,
                    "delta_soc": end_soc - start_soc,
                    "charge_data": charge_data,
                    "discharge_data": discharge_data,
                }
            )

        except Exception as e:
            print(f"    ❌ Error fetching energy data: {e}")
            continue

    # Uložit cycle data
    if cycle_data:
        output_file = "battery_health_cycle_data.json"
        with open(output_file, "w") as f:
            json.dump(cycle_data, f, indent=2)
        print(f"\n  💾 Saved {len(cycle_data)} cycles to {output_file}")

    print()
    print("✅ Data collection complete")
    print()
    print("📊 Next steps:")
    print("  1. Analyze energy data to calculate capacity")
    print("  2. Compare different calculation methods")
    print("  3. Find the correct formula that gives realistic SoH (<100%)")


if __name__ == "__main__":
    main()
