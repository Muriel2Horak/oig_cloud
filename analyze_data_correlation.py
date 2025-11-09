#!/usr/bin/env python3
"""
Komplexní analýza korelace mezi SoC, nabíjecí energií a vybíjecí energií.
Cíl: Odvodit spolehlivost měření a validitu vstupních dat.
"""

import json
import os
from datetime import datetime, timedelta
from typing import Any
import requests

# Konfigurace
CONFIG_FILE = ".ha_config"
BOX_ID = "2206237016"
DAYS_BACK = 3


def load_config() -> dict[str, str]:
    """Načte konfiguraci z .ha_config"""
    config = {}
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    config[key] = value.strip('"').strip("'")
    return config


def download_history(
    entity_id: str,
    start_time: datetime,
    ha_url: str,
    ha_token: str,
    minimal: bool = False,
) -> list[dict[str, Any]]:
    """Stáhne historii entity z HA"""
    url = f"{ha_url}/api/history/period/{start_time.isoformat()}"
    headers = {"Authorization": f"Bearer {ha_token}"}
    params = {"filter_entity_id": entity_id}
    if minimal:
        params["minimal_response"] = "true"

    response = requests.get(url, headers=headers, params=params, timeout=30)
    response.raise_for_status()

    data = response.json()
    if data and len(data) > 0:
        return data[0]
    return []


def parse_state(state_str: str) -> float | None:
    """Parsuje state hodnotu na float"""
    if state_str in ("unknown", "unavailable", ""):
        return None
    try:
        return float(state_str)
    except (ValueError, TypeError):
        return None


def main() -> None:
    """Hlavní funkce"""
    config = load_config()
    ha_url = config.get("HA_URL", "http://10.0.0.143:8123")
    ha_token = config.get("HA_TOKEN", "")

    if not ha_token:
        print("❌ HA_TOKEN not found in .ha_config")
        return

    # Časové rozmezí
    end_time = datetime.now()
    start_time = end_time - timedelta(days=DAYS_BACK)

    print(f"📥 Stahuji data za období {DAYS_BACK} dní")
    print(f"   Od: {start_time}")
    print(f"   Do: {end_time}")
    print()

    # Entity k stažení
    entities = {
        "soc": f"sensor.oig_{BOX_ID}_batt_bat_c",
        "charge": f"sensor.oig_{BOX_ID}_computed_batt_charge_energy_today",
        "discharge": f"sensor.oig_{BOX_ID}_computed_batt_discharge_energy_today",
    }

    # Stažení dat
    data = {}
    for key, entity_id in entities.items():
        print(f"📊 Stahuji {key}: {entity_id}")
        # Pro SoC potřebujeme všechna data (ne minimal)
        minimal = key != "soc"
        history = download_history(
            entity_id, start_time, ha_url, ha_token, minimal=minimal
        )
        print(f"   ✓ {len(history)} datových bodů")
        data[key] = history

    print()

    # Uložení dat
    output_file = "battery_full_data.json"
    with open(output_file, "w") as f:
        json.dump(data, f, indent=2)
    print(f"💾 Data uložena do {output_file}")

    # ANALÝZA 1: Konzistence SoC změn vs. energie
    print("\n" + "=" * 70)
    print("ANALÝZA 1: Konzistence SoC změn vs. naměřená energie")
    print("=" * 70)

    # Zpracování dat do časové řady
    soc_series = []
    for entry in data["soc"]:
        timestamp = datetime.fromisoformat(entry["last_changed"].replace("Z", "+00:00"))
        state = parse_state(entry["state"])
        if state is not None:
            soc_series.append({"time": timestamp, "soc": state})

    charge_series = []
    for entry in data["charge"]:
        timestamp = datetime.fromisoformat(entry["last_changed"].replace("Z", "+00:00"))
        state = parse_state(entry["state"])
        if state is not None:
            charge_series.append({"time": timestamp, "energy": state})

    discharge_series = []
    for entry in data["discharge"]:
        timestamp = datetime.fromisoformat(entry["last_changed"].replace("Z", "+00:00"))
        state = parse_state(entry["state"])
        if state is not None:
            discharge_series.append({"time": timestamp, "energy": state})

    print(f"📊 SoC body: {len(soc_series)}")
    print(f"📊 Nabíjení body: {len(charge_series)}")
    print(f"📊 Vybíjení body: {len(discharge_series)}")
    print()

    # ANALÝZA 2: Detekce všech významných SoC změn
    print("=" * 70)
    print("ANALÝZA 2: Detekce všech významných SoC změn (>5%)")
    print("=" * 70)

    soc_changes = []
    for i in range(1, len(soc_series)):
        prev = soc_series[i - 1]
        curr = soc_series[i]
        delta_soc = curr["soc"] - prev["soc"]
        delta_time = (curr["time"] - prev["time"]).total_seconds() / 3600  # hodiny

        if abs(delta_soc) > 5 and delta_time < 12:  # Změna >5% za <12h
            soc_changes.append(
                {
                    "start_time": prev["time"],
                    "end_time": curr["time"],
                    "start_soc": prev["soc"],
                    "end_soc": curr["soc"],
                    "delta_soc": delta_soc,
                    "duration_hours": delta_time,
                }
            )

    print(f"🔍 Nalezeno {len(soc_changes)} významných SoC změn")
    print()

    # Pro každou změnu zjistíme energii
    NOMINAL_CAPACITY = 15.36  # kWh

    for idx, change in enumerate(soc_changes, 1):
        print(f"--- Změna #{idx} ---")
        print(f"Čas: {change['start_time']} → {change['end_time']}")
        print(f"SoC: {change['start_soc']:.1f}% → {change['end_soc']:.1f}%")
        print(f"ΔSoC: {change['delta_soc']:+.1f}%")
        print(f"Trvání: {change['duration_hours']:.2f}h")

        # Teoretická energie pro tuto změnu
        theoretical_energy_kwh = NOMINAL_CAPACITY * abs(change["delta_soc"]) / 100
        print(f"📐 Teoretická energie: {theoretical_energy_kwh:.2f} kWh")

        # Zjistíme skutečnou energii z charge/discharge senzorů
        # Potřebujeme najít nejbližší hodnoty před a po
        start_date = change["start_time"].date()
        end_date = change["end_time"].date()
        spans_midnight = start_date != end_date

        if change["delta_soc"] > 0:
            # NABÍJENÍ
            if spans_midnight:
                # Najít poslední hodnotu před půlnocí
                charge_before = None
                for entry in reversed(charge_series):
                    if (
                        entry["time"].date() == start_date
                        and entry["time"] <= change["end_time"]
                    ):
                        charge_before = entry["energy"]
                        break

                # Najít hodnotu po půlnoci
                charge_after = None
                for entry in charge_series:
                    if (
                        entry["time"].date() == end_date
                        and entry["time"] >= change["end_time"]
                    ):
                        charge_after = entry["energy"]
                        break

                if charge_before is not None and charge_after is not None:
                    measured_energy_wh = charge_before + charge_after
                    print(
                        f"⚡ Naměřená energie (midnight): {charge_before:.1f} + {charge_after:.1f} = {measured_energy_wh:.1f} Wh"
                    )
                else:
                    measured_energy_wh = None
                    print("⚠️  Data nejsou k dispozici (midnight crossing)")
            else:
                # Stejný den - delta
                charge_start = None
                charge_end = None
                for entry in charge_series:
                    if entry["time"] >= change["start_time"]:
                        if charge_start is None:
                            charge_start = entry["energy"]
                    if entry["time"] >= change["end_time"]:
                        charge_end = entry["energy"]
                        break

                if charge_start is not None and charge_end is not None:
                    measured_energy_wh = charge_end - charge_start
                    print(
                        f"⚡ Naměřená energie (delta): {charge_end:.1f} - {charge_start:.1f} = {measured_energy_wh:.1f} Wh"
                    )
                else:
                    measured_energy_wh = None
                    print("⚠️  Data nejsou k dispozici")

        else:
            # VYBÍJENÍ
            if spans_midnight:
                discharge_before = None
                for entry in reversed(discharge_series):
                    if (
                        entry["time"].date() == start_date
                        and entry["time"] <= change["end_time"]
                    ):
                        discharge_before = entry["energy"]
                        break

                discharge_after = None
                for entry in discharge_series:
                    if (
                        entry["time"].date() == end_date
                        and entry["time"] >= change["end_time"]
                    ):
                        discharge_after = entry["energy"]
                        break

                if discharge_before is not None and discharge_after is not None:
                    measured_energy_wh = discharge_before + discharge_after
                    print(
                        f"⚡ Naměřená energie (midnight): {discharge_before:.1f} + {discharge_after:.1f} = {measured_energy_wh:.1f} Wh"
                    )
                else:
                    measured_energy_wh = None
                    print("⚠️  Data nejsou k dispozici (midnight crossing)")
            else:
                discharge_start = None
                discharge_end = None
                for entry in discharge_series:
                    if entry["time"] >= change["start_time"]:
                        if discharge_start is None:
                            discharge_start = entry["energy"]
                    if entry["time"] >= change["end_time"]:
                        discharge_end = entry["energy"]
                        break

                if discharge_start is not None and discharge_end is not None:
                    measured_energy_wh = discharge_end - discharge_start
                    print(
                        f"⚡ Naměřená energie (delta): {discharge_end:.1f} - {discharge_start:.1f} = {measured_energy_wh:.1f} Wh"
                    )
                else:
                    measured_energy_wh = None
                    print("⚠️  Data nejsou k dispozici")

        # Výpočet odchylky
        if measured_energy_wh is not None:
            measured_energy_kwh = measured_energy_wh / 1000
            deviation_pct = (
                (measured_energy_kwh - theoretical_energy_kwh)
                / theoretical_energy_kwh
                * 100
            )
            print(f"📊 Naměřeno: {measured_energy_kwh:.2f} kWh")
            print(f"📊 Odchylka: {deviation_pct:+.1f}%")

            # Odvozená kapacita
            derived_capacity = measured_energy_kwh / (abs(change["delta_soc"]) / 100)
            derived_soh = (derived_capacity / NOMINAL_CAPACITY) * 100
            print(f"💡 Odvozená kapacita: {derived_capacity:.2f} kWh")
            print(f"💡 Odvozený SoH: {derived_soh:.1f}%")

        print()

    # ANALÝZA 3: Distribuce odchylek
    print("=" * 70)
    print("ANALÝZA 3: Statistika spolehlivosti měření")
    print("=" * 70)

    # Shrneme všechny odvozeně kapacity a SoH hodnoty
    capacities = []
    sohs = []

    print("\n📊 Shrnutí dostupných měření:")
    print()


if __name__ == "__main__":
    main()
