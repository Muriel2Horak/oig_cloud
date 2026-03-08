# Redesign Plánovacího Algoritmu - Detailní Specifikace v2

## TL;DR
> **Problém dnes (5.3.2026)**: Máte 6.96 kWh (68%), FVE dnes 18.17 kWh, spotřeba 13.3 kWh.
> **FVE sama nabije baterii na 100%** bez nabíjení ze sítě.
> **Současný plánovač**: Plánuje HOME_I místo HOME_III, ignoruje solar surplus.
>
> **Nový algoritmus**: 4-fázový s explicitním výpočtem solar surplusu.

---

## Analýza Dnešních Reálných Dat

### Vstupy (z HA 8:45)
```python
# Z battery_forecast sensoru
actual_soc_kwh = 6.96          # 68% z 10.24 kWh
max_capacity_kwh = 10.24       # 100%
hw_min_kwh = 3.072             # 30% - fyzická ochrana
planning_min_percent = 30.0    # předpoklad
planning_min_kwh = 3.072       # 30% z 10.24
target_percent = 80.0          # uživatelský cíl
target_kwh = 8.192             # 80% z 10.24

# Z solar_forecast sensoru
solar_today_kwh = 18.17        # denní prognóza
solar_tomorrow_kwh = 18.01     # zítřejší prognóza

# Z planned_consumption (v atributech battery_forecast)
load_today_kwh = 13.3          # dnes
load_tomorrow_kwh = 17.4       # zítra

# Předpoklad: spotřeba rozložena rovnoměrně
# V reálu bychom měli hourly/15min data
```

### Klíčový Výpočet: Solar Surplus
```python
# Dnešní bilance
solar_surplus_today = solar_today_kwh - load_today_kwh
                    = 18.17 - 13.3
                    = +4.87 kWh

# Co to znamená pro baterii
projected_evening_soc = actual_soc_kwh + solar_surplus_today
                      = 6.96 + 4.87
                      = 11.83 kWh

# Ale max je 10.24 kWh
max_achievable = min(projected_evening_soc, max_capacity_kwh)
               = 10.24 kWh (100%)

# Dosažení targetu
can_reach_target = max_achievable >= target_kwh
                 = 10.24 >= 8.192
                 = True

# Závěr: Dnes není třeba žádné nabíjení ze sítě!
```

---

## Detailní Specifikace Nového Algoritmu

### Architektura: 4 Fáze

#### FÁZE 1: Solar Surplus Analysis
**Vstup**: Denní součty FVE a spotřeby
**Výstup**: Boolean "FVE stačí sama?"

```python
def calculate_solar_surplus(
    solar_forecast: List[float],      # 96 intervalů (24h)
    load_forecast: List[float],        # 96 intervalů (24h)
    current_soc: float,                # kWh nyní
    target_soc: float,                # kWh cíl
    max_capacity: float,              # kWh max
) -> Tuple[bool, float]:
    """
    Vrátí:
    - can_reach_target: True pokud FVE stačí k targetu
    - projected_max_soc: Maximální SOC kterého FVE dosáhne
    """
    total_solar = sum(solar_forecast)   # kWh za den
    total_load = sum(load_forecast)   # kWh za den
    surplus = total_solar - total_load
    
    projected_max = min(current_soc + surplus, max_capacity)
    can_reach = projected_max >= target_soc
    
    return can_reach, projected_max
```

**Příklad pro dnešek:**
```python
can_reach, projected = calculate_solar_surplus(
    solar_forecast=[0.10, 0.25, 0.43, 0.57, 0.66, 0.68, ...],  # 96 hodnot
    load_forecast=[0.33, 0.33, 0.33, 0.33, 0.33, 0.33, ...],   # 96 hodnot
    current_soc=6.96,
    target_soc=8.192,
    max_capacity=10.24
)
# Výsledek: can_reach=True, projected=10.24
# Akce: Žádné nabíjení ze sítě dnes!
```

#### FÁZE 2: Interval-Level Simulation (pokud FVE nestačí)
**Vstup**: 15min intervaly s FVE, spotřebou, cenami
**Výstup**: SOC trajektorie, detekce deficitů

```python
from dataclasses import dataclass
from typing import List, Optional, Tuple

@dataclass
class IntervalData:
    timestamp: str          # ISO format "2026-03-05T08:45:00"
    solar_kwh: float       # FVE výroba v tomto intervalu
    load_kwh: float        # Spotřeba v tomto intervalu
    price_czk: float       # Cena za kWh
    
@dataclass  
class SimulatedInterval:
    interval: IntervalData
    start_soc: float       # SOC na začátku intervalu
    end_soc: float         # SOC na konci intervalu
    mode: int              # 0=HOME_I, 1=HOME_II, 2=HOME_III, 3=UPS
    grid_import: float     # kWh ze sítě
    grid_export: float     # kWh do sítě
    solar_charge: float    # kWh nabito z FVE
    grid_charge: float     # kWh nabito ze sítě

def simulate_interval(
    interval: IntervalData,
    start_soc: float,
    mode: int,
    max_capacity: float,
    hw_min: float,
    charge_efficiency: float = 0.95,
    discharge_efficiency: float = 0.882,
    ups_rate_kwh: float = 0.7,  # 2.8kW * 0.25h
) -> SimulatedInterval:
    """
    Simuluje jeden 15min interval podle fyziky CBB.
    """
    if mode == 3:  # HOME_UPS
        # Nabíjení ze sítě + FVE
        grid_charge = min(ups_rate_kwh, max_capacity - start_soc)
        solar_charge = min(interval.solar_kwh, 
                          max_capacity - start_soc - grid_charge)
        total_charge = (grid_charge + solar_charge) * charge_efficiency
        end_soc = min(max_capacity, start_soc + total_charge)
        grid_import = interval.load_kwh + grid_charge
        grid_export = max(0, interval.solar_kwh - solar_charge)
        
    elif mode == 0:  # HOME_I
        # Standardní: FVE -> spotřeba -> baterie
        if interval.solar_kwh >= interval.load_kwh:
            surplus = interval.solar_kwh - interval.load_kwh
            charge_amount = min(surplus, max_capacity - start_soc)
            solar_charge = charge_amount
            end_soc = start_soc + charge_amount * charge_efficiency
            grid_import = 0
            grid_export = surplus - charge_amount
        else:
            deficit = interval.load_kwh - interval.solar_kwh
            available = max(0, start_soc - hw_min)
            usable = available * discharge_efficiency
            discharge = min(deficit, usable)
            
            if discharge > 0:
                end_soc = start_soc - discharge / discharge_efficiency
                grid_import = deficit - discharge
            else:
                end_soc = start_soc
                grid_import = deficit
                
            solar_charge = interval.solar_kwh
            grid_export = 0
    
    # HOME_II a HOME_III implementace podobně...
    
    return SimulatedInterval(
        interval=interval,
        start_soc=start_soc,
        end_soc=max(hw_min, end_soc),  # Nikdy pod HW minimum
        mode=mode,
        grid_import=grid_import,
        grid_export=grid_export,
        solar_charge=solar_charge,
        grid_charge=grid_charge if mode == 3 else 0
    )

def simulate_timeline(
    intervals: List[IntervalData],
    initial_soc: float,
    modes: List[int],  # Režim pro každý interval
    max_capacity: float,
    hw_min: float,
) -> List[SimulatedInterval]:
    """Simuluje celou timeline s danými režimy."""
    results = []
    soc = initial_soc
    
    for interval, mode in zip(intervals, modes):
        result = simulate_interval(
            interval=interval,
            start_soc=soc,
            mode=mode,
            max_capacity=max_capacity,
            hw_min=hw_min
        )
        results.append(result)
        soc = result.end_soc
        
    return results
```

**Detekce Deficitů:**
```python
def find_deficits(
    simulated: List[SimulatedInterval],
    planning_min: float
) -> List[Tuple[int, float]]:
    """
    Najde intervaly kde SOC klesne pod planning_min.
    Vracá: [(index_intervalu, chybějící_kWh), ...]
    """
    deficits = []
    for i, interval in enumerate(simulated):
        if interval.end_soc < planning_min:
            shortage = planning_min - interval.end_soc
            deficits.append((i, shortage))
    return deficits
```

#### FÁZE 3: Optimalizace Nabíjení (pouze pokud nutné)
**Vstup**: Seznam deficitů, ceny, dostupné intervaly
**Výstup**: Kde naplánovat UPS (HOME_UPS)

```python
def optimize_charging(
    intervals: List[IntervalData],
    initial_soc: float,
    deficits: List[Tuple[int, float]],
    max_capacity: float,
    hw_min: float,
    planning_min: float,
    ups_rate_kwh: float = 0.7,
) -> List[int]:  # Indexy intervalů pro UPS
    """
    Najde nejlevnější intervaly pro nabíjení tak,
    aby se odstranily všechny deficity.
    
    Algoritmus:
    1. Pro každý deficit najdi všechny intervaly před ním
    2. Seřaď podle ceny (nejlevnější první)
    3. Simuluj přidání UPS do nejlevnějšího
    4. Pokud to odstraní deficit, zastav
    5. Jinak pokračuj dalším nejlevnějším
    """
    charging_intervals = set()
    
    for deficit_idx, deficit_amount in deficits:
        # Najdi všechny intervaly před deficitem
        candidates = [
            (i, intervals[i].price_czk)
            for i in range(deficit_idx)
            if i not in charging_intervals
        ]
        
        # Seřaď podle ceny
        candidates.sort(key=lambda x: x[1])
        
        needed = deficit_amount
        for idx, price in candidates:
            if needed <= 0:
                break
                
            # Simuluj přidání UPS do tohoto intervalu
            test_intervals = list(intervals)
            test_intervals[idx] = IntervalData(
                timestamp=intervals[idx].timestamp,
                solar_kwh=intervals[idx].solar_kwh,
                load_kwh=intervals[idx].load_kwh,
                price_czk=intervals[idx].price_czk
            )
            
            test_modes = [0] * len(intervals)  # HOME_I
            for ci in charging_intervals:
                test_modes[ci] = 3  # HOME_UPS
            test_modes[idx] = 3  # Přidáme UPS
            
            simulated = simulate_timeline(
                intervals=test_intervals,
                initial_soc=initial_soc,
                modes=test_modes,
                max_capacity=max_capacity,
                hw_min=hw_min
            )
            
            # Kontrola zda je deficit opraven
            new_deficits = find_deficits(simulated, planning_min)
            deficit_fixed = all(d[0] != deficit_idx for d in new_deficits)
            
            if deficit_fixed:
                charging_intervals.add(idx)
                needed -= ups_rate_kwh
                
    return sorted(charging_intervals)
```

#### FÁZE 4: Generování Režimů
**Vstup**: Intervaly, kde nabíjet
**Výstup**: Seznam režimů pro každý interval

```python
def generate_modes(
    intervals: List[IntervalData],
    charging_indices: List[int],
    solar_surplus_sufficient: bool,
) -> List[int]:
    """
    Vygeneruje režim pro každý interval.
    
    Logika:
    - Pokud FVE stačí: HOME_III (solar priority)
    - Pokud interval v charging_indices: HOME_UPS
    - Jinak: HOME_I (grid priority pro deficit)
    """
    modes = []
    
    if solar_surplus_sufficient:
        # Dnes stačí FVE, celý den HOME_III
        return [2] * len(intervals)  # HOME_III
    
    for i, interval in enumerate(intervals):
        if i in charging_indices:
            modes.append(3)  # HOME_UPS - nabíjení ze sítě
        elif interval.solar_kwh > 0:
            modes.append(2)  # HOME_III - solar priority
        else:
            modes.append(0)  # HOME_I - grid priority (noc)
            
    return modes
```

---

## Kompletní Algoritmus (Spojení Všech Fází)

```python
def plan_battery_schedule(
    current_soc: float,
    target_soc: float,
    planning_min: float,
    max_capacity: float,
    hw_min: float,
    intervals: List[IntervalData],  # 15min intervaly
    charge_efficiency: float = 0.95,
    ups_rate_kwh: float = 0.7,
) -> Tuple[List[int], List[SimulatedInterval], str]:
    """
    Hlavní plánovací funkce.
    
    Returns:
    - modes: Seznam režimů pro každý interval
    - simulated: Simulovaná timeline
    - reason: Důvod rozhodnutí (pro debug)
    """
    
    # ========== FÁZE 1: Solar Surplus Analysis ==========
    total_solar = sum(i.solar_kwh for i in intervals)
    total_load = sum(i.load_kwh for i in intervals)
    solar_surplus = total_solar - total_load
    
    projected_max = min(current_soc + solar_surplus, max_capacity)
    can_reach_target = projected_max >= target_soc
    
    if can_reach_target:
        # FVE sama nabije na target, žádné nabíjení ze sítě
        modes = [2] * len(intervals)  # HOME_III celý den
        simulated = simulate_timeline(
            intervals=intervals,
            initial_soc=current_soc,
            modes=modes,
            max_capacity=max_capacity,
            hw_min=hw_min
        )
        return modes, simulated, f"FVE surplus: {solar_surplus:.2f} kWh"
    
    # ========== FÁZE 2: Simulace s HOME_I ==========
    baseline_modes = [0] * len(intervals)  # HOME_I
    baseline_sim = simulate_timeline(
        intervals=intervals,
        initial_soc=current_soc,
        modes=baseline_modes,
        max_capacity=max_capacity,
        hw_min=hw_min
    )
    
    deficits = find_deficits(baseline_sim, planning_min)
    
    if not deficits:
        # Žádné deficity, FVE stačí i když nedosáhne targetu
        modes = [2] * len(intervals)  # HOME_III
        return modes, baseline_sim, "No deficits with FVE only"
    
    # ========== FÁZE 3: Optimalizace Nabíjení ==========
    charging_indices = optimize_charging(
        intervals=intervals,
        initial_soc=current_soc,
        deficits=deficits,
        max_capacity=max_capacity,
        hw_min=hw_min,
        planning_min=planning_min,
        ups_rate_kwh=ups_rate_kwh
    )
    
    # ========== FÁZE 4: Generování Režimů ==========
    modes = []
    for i, interval in enumerate(intervals):
        if i in charging_indices:
            modes.append(3)  # HOME_UPS
        else:
            modes.append(2 if interval.solar_kwh > 0 else 0)
    
    # Finální simulace
    simulated = simulate_timeline(
        intervals=intervals,
        initial_soc=current_soc,
        modes=modes,
        max_capacity=max_capacity,
        hw_min=hw_min
    )
    
    # Ověření
    final_deficits = find_deficits(simulated, planning_min)
    if final_deficits:
        return modes, simulated, f"WARNING: Still deficits at {final_deficits}"
    
    return modes, simulated, f"Optimized: {len(charging_indices)} UPS intervals"
```

---

## Příklad Výpočtu pro Dnešek (5.3.2026)

### Vstupní Data
```python
current_soc = 6.96        # 68%
target_soc = 8.192        # 80%
planning_min = 3.072      # 30%
max_capacity = 10.24      # 100%
hw_min = 3.072           # 30%

# Intervaly (zkráceno, pouze klíčové)
intervals = [
    IntervalData("08:45", solar=0.25, load=0.33, price=1.50),
    IntervalData("09:00", solar=0.43, load=0.33, price=1.45),
    IntervalData("10:00", solar=0.57, load=0.33, price=1.60),
    IntervalData("11:00", solar=0.66, load=0.33, price=1.80),
    IntervalData("12:00", solar=0.68, load=0.33, price=2.00),
    # ... další intervaly
]
```

### Průběh Algoritmu

**Fáze 1: Solar Surplus**
```
total_solar = 18.17 kWh
total_load = 13.3 kWh
surplus = +4.87 kWh

projected_max = min(6.96 + 4.87, 10.24) = 10.24 kWh
can_reach_target = 10.24 >= 8.192 = True

→ VÝSLEDEK: FVE stačí, žádné nabíjení ze sítě!
```

**Fáze 4: Režimy**
```python
modes = [2, 2, 2, 2, 2, ...]  # HOME_III všechny intervaly
```

### Výstup pro Dnešek
```json
{
  "modes": [2, 2, 2, 2, 2, ...],  // HOME_III celý den
  "reason": "FVE surplus: 4.87 kWh",
  "projected_final_soc": 10.24,     // 100%
  "projected_target_reached": true,
  "ups_intervals": [],              // Žádné nabíjení ze sítě!
  "savings_vs_baseline": "~15 Kč"   // Oproti nabíjení v 10:00
}
```

---

## Porovnání se Současným Plánovačem

### Současný Plánovač (Chybný)
```python
# Problém: Hledá nejlevnější intervaly bez ohledu na FVE
# Najde třeba interval v 10:00 za 1.60 Kč/kWh

modes = [0, 0, 3, 0, 0, ...]  # HOME_UPS v 10:00
# V 10:00 svítí slunce (0.57 kW), ale jde do sítě místo do baterie!
```

**Náklady**: 0.7 kWh * 1.60 Kč = **1.12 Kč** navíc
**Plýtvání**: FVE jde do sítě místo do baterie

### Nový Plánovač (Správný)
```python
modes = [2, 2, 2, 2, 2, ...]  # HOME_III celý den
# FVE v 10:00 jde do baterie (0.57 kWh), ne do sítě
```

**Náklady**: 0 Kč
**Úspora**: 1.12 Kč dnes
**Roční úspora** (100 slunečných dnů): ~112 Kč

---

## Work Objectives (Přepracované)

### Core Objective
Vytvořit `simple_planner.py` s 4-fázovým algoritmem:
1. Solar surplus analysis
2. Interval-level simulation
3. Deficit-based optimization
4. Mode generation

### Must Have
- [ ] Fáze 1: Solar surplus check s denními součty
- [ ] Fáze 2: Interval simulation s fyzikou CBB
- [ ] Fáze 3: Optimalizace pouze pokud deficity existují
- [ ] Fáze 4: HOME_III když FVE > 0, jinak HOME_I
- [ ] Detekce deficitů pod planning_min (ne HW min)
- [ ] Deterministický výstup
- [ ] Simulovatelné offline

### Must NOT Have
- [ ] Žádné nabíjení ze sítě pokud FVE stačí
- [ ] Žádné HOME_UPS v intervalu s FVE > 0
- [ ] Žádné feature flags (pv_first, pre_peak)
- [ ] Žádné komplexní ekonomické kalkulace
- [ ] Žádné fallbacky a recovery módy

---

## TODOs (Detailní)

### Wave 1: Datové Struktury a Fyzika

- [ ] **Task 1: Vytvořit dataclasses**
  - `IntervalData`, `SimulatedInterval`, `PlannerConfig`
  - Přesné typování pro mypy

- [ ] **Task 2: Implementovat simulate_interval()**
  - HOME_I (grid priority)
  - HOME_III (solar priority)
  - HOME_UPS (AC charging)
  - Respektovat HW minimum
  - Unit testy

- [ ] **Task 3: Implementovat simulate_timeline()**
  - Iterace přes intervaly
  - Sledování SOC
  - Vrací List[SimulatedInterval]

### Wave 2: Solar Surplus a Deficity

- [ ] **Task 4: Solar surplus analysis**
  - Součet FVE a spotřeby
  - Porovnání s targetem
  - Boolean rozhodnutí

- [ ] **Task 5: find_deficits()**
  - Prohledá simulovanou timeline
  - Najde intervaly pod planning_min
  - Vrací seznam (index, shortage)

### Wave 3: Optimalizace

- [ ] **Task 6: optimize_charging()**
  - Greedy algoritmus: nejlevnější první
  - Simulace před přidáním UPS
  - Ověření odstranění deficitu
  - Vrací List[int] (UPS indexy)

- [ ] **Task 7: generate_modes()**
  - Pokud surplus: HOME_III všude
  - Jinak: HOME_UPS na charging indexech
  - HOME_III když FVE > 0 jinde
  - HOME_I v noci

### Wave 4: Integrace a Testy

- [ ] **Task 8: plan_battery_schedule()**
  - Spojení všech fází
  - Error handling
  - Logging

- [ ] **Task 9: Testy s dnešními daty**
  - Simulace dnešního dne (5.3.2026)
  - Ověření: žádný UPS režim
  - Ověření: SOC dosáhne 100%
  - Vizualizace průběhu dne

- [ ] **Task 10: Testy s deficity**
  - Vytvořit scénář s málo FVE
  - Ověření: UPS naplánován v nejlevnějším intervalu
  - Ověření: deficit opraven

- [ ] **Task 11: Historické testy**
  - 7 dní reálných dat z HA
  - Porovnání se současným plánovačem
  - Měření úspor

---

## Příklad Volání

```python
# Použití v integraci
from simple_planner import plan_battery_schedule, IntervalData

# Příprava dat z HA sensorů
intervals = []
for hour in range(24):
    for quarter in range(4):
        timestamp = f"2026-03-05T{hour:02d}:{quarter*15:02d}:00"
        solar = get_solar_for_timestamp(timestamp)  # z sensoru
        load = get_load_for_timestamp(timestamp)    # z profilu
        price = get_spot_price(timestamp)           # z cen
        intervals.append(IntervalData(timestamp, solar, load, price))

# Volání plánovače
modes, simulated, reason = plan_battery_schedule(
    current_soc=6.96,
    target_soc=8.192,
    planning_min=3.072,
    max_capacity=10.24,
    hw_min=3.072,
    intervals=intervals
)

# Výstup
print(f"Režimy: {modes}")           # [2, 2, 2, 2, ...] pro dnešek
print(f"Důvod: {reason}")          # "FVE surplus: 4.87 kWh"
print(f"UPS intervaly: {[i for i, m in enumerate(modes) if m == 3]}")
```

---

## Success Criteria

### Funkční
1. Dnešní scénář (5.3.2026): **Žádný UPS režim**
2. SOC na konci dne: **100%** (nebo target)
3. Nikdy pod planning_min: **0 deficita**
4. Deterministické: Stejný vstup = stejný výstup

### Výkonnostní
- Čas výpočtu: **< 100ms** pro 96 intervalů (24h)
- Paměť: **< 10 MB** pro celou timeline

### Testovací
- Unit testy: **100%** pokrytí simulate_interval
- AC testy: Min **10** scénářů
- Historické testy: Min **7** dní
