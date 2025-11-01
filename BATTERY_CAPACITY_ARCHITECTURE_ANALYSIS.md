# Analýza Architektury Kapacity Baterie a SOC

**Datum:** 1. listopadu 2025
**Účel:** Identifikovat rozpory v architektuře kapacity baterie a navrhnout opravy

---

## 1. SOUČASNÝ STAV - Definice Kapacit a SOC

### 1.1 Fyzické Hodnoty ze Senzorů

```python
# Total kapacita (instalovaná kapacita baterie)
sensor.oig_2206237016_installed_battery_capacity_kwh = 15.36 kWh (15360 Wh)
# → To je 100% fyzické SOC

# Využitelná kapacita (dynamická hodnota z API)
sensor.oig_2206237016_usable_battery_capacity = 12.29 kWh
# → Podle kódu: 80% z total capacity
# → Reálně: může se měnit podle stavu baterie

# Fyzické minimum SOC (z integrace/hardware)
sensor.oig_2206237016_batt_bat_min = 20%
# → HARD LIMIT - baterie se nikdy nedostane níže
# → V kWh: 20% × 15.36 = 3.072 kWh
```

### 1.2 Konfigurační Hodnoty (Config Flow)

```python
# User minimum SOC (z config flow)
min_capacity_percent = 33% (default)
# → Uživatelsky nastavené minimum - plánování NESMÍ jít níže
# → V kWh: 33% × 15.36 = 5.0688 kWh

# Target SOC (z config flow)
target_capacity_percent = 80% (default)
# → Cílový stav na konci plánovacího období
# → V kWh: 80% × 15.36 = 12.288 kWh
```

### 1.3 Jak se Kapacity Počítají v Kódu

```python
# _get_total_battery_capacity() (řádky 3200-3245)
# → Vrací 15.36 kWh (total installed capacity)

# _get_min_battery_capacity() (řádky 3295-3325)
min_kwh = total * float(min_percent) / 100.0
# → 15.36 × 33% = 5.0688 kWh
# ✅ SPRÁVNĚ: Počítá z total capacity

# _get_target_battery_capacity() (řádky 3327-3357)
target_kwh = total * float(target_percent) / 100.0
# → 15.36 × 80% = 12.288 kWh
# ✅ SPRÁVNĚ: Počítá z total capacity

# _get_current_battery_capacity() (řádky 3270-3288)
current_kwh = total * soc_percent / 100.0
# → 15.36 × SOC% / 100
# ✅ SPRÁVNĚ: Aktuální kapacita podle SOC%
```

---

## 2. KLÍČOVÝ PROBLÉM - Timeline vs SOC

### 2.1 Co Obsahuje Timeline

```json
{
  "time": "2025-11-01T17:15:00",
  "battery_soc": 12.945957617742266,
  "battery_capacity_kwh": 12.945957617742266,
  "mode": 0,
  "mode_name": "HOME I",
  "solar_kwh": 0.0,
  "load_kwh": 0.7746572963868056,
  "grid_import": 0.0
}
```

**POZOROVÁNÍ:**
- `battery_soc` a `battery_capacity_kwh` mají **STEJNOU HODNOTU**
- To naznačuje, že **nejedná se o SOC%**, ale o **kWh kapacitu**

### 2.2 Analýza Timeline Values

```
17:15 → battery_capacity_kwh: 12.95 kWh
17:30 → battery_capacity_kwh: 12.07 kWh
17:45 → battery_capacity_kwh: 11.19 kWh
...pokračuje klesání...
```

**Převod na SOC%:**
```
12.95 kWh / 15.36 kWh = 84.3% SOC ✅
12.07 kWh / 15.36 kWh = 78.6% SOC ✅
11.19 kWh / 15.36 kWh = 72.8% SOC ✅
```

**User minimum:** 33% SOC = 5.07 kWh
**Fyzické minimum:** 20% SOC = 3.07 kWh

---

## 3. ROZPOR - "Využitelná Kapacita" vs SOC

### 3.1 Dvě Různé Interpretace

#### Interpretace A: Využitelná kapacita = Usable range (33%-100%)
```
Total: 15.36 kWh (100% SOC)
User min: 5.07 kWh (33% SOC)
─────────────────────────────────
Využitelná kapacita: 15.36 - 5.07 = 10.29 kWh

0 kWh využitelné = 33% SOC (user minimum)
10.29 kWh využitelné = 100% SOC
```

**Problém:** Senzor `usable_battery_capacity` = 12.29 kWh, ne 10.29 kWh! ❌

#### Interpretace B: Využitelná kapacita = Total - Physical minimum (20%)
```
Total: 15.36 kWh (100% SOC)
Physical min: 3.07 kWh (20% SOC)
─────────────────────────────────
Využitelná kapacita: 15.36 - 3.07 = 12.29 kWh ✅

0 kWh využitelné = 20% SOC (physical minimum)
12.29 kWh využitelné = 100% SOC
```

**Shoda:** Senzor vrací 12.29 kWh! ✅

### 3.2 Závěr

**`sensor.oig_2206237016_usable_battery_capacity` = Kapacita mezi fyzickým minimem a maximem**

```
Fyzické SOC rozsah:  20% ────────────────── 100%
Fyzické kWh rozsah:  3.07 kWh ──────────── 15.36 kWh
Využitelná kapacita: 0 kWh ────────────── 12.29 kWh

User minimum (33% SOC) = 2.0 kWh využitelné kapacity
Target (80% SOC) = 9.21 kWh využitelné kapacity
```

---

## 4. KRITICKÁ CHYBA V ALGORITMU

### 4.1 Simulace Intervalu (`_simulate_interval_with_mode`)

**Řádky 770-792:**
```python
# Night mode (FVE=0): HOME I/II/III identical → discharge battery to load
available_battery = battery_soc - min_capacity

# VALIDATION: Never discharge below minimum
if available_battery < 0:
    available_battery = 0.0

discharge_amount = min(load_kwh, available_battery / efficiency)

if discharge_amount > 0.001:
    result["battery_discharge"] = discharge_amount
    result["new_soc"] = battery_soc - discharge_amount * efficiency

# Grid covers remaining load
deficit = load_kwh - discharge_amount
if deficit > 0.001:
    result["grid_import"] = deficit
    result["grid_cost"] = deficit * spot_price

# Clamp SoC (SAFETY: Should never discharge below min_capacity)
result["new_soc"] = max(min_capacity, min(max_capacity, result["new_soc"]))
```

**PROBLÉM:**
- `min_capacity` v algoritmu = **user minimum** (5.07 kWh = 33% SOC)
- Algoritmus počítá: `available_battery = battery_soc - min_capacity`
- **Ale**: Pokud `battery_soc` klesne blízko k `min_capacity`, baterie přestane vybíjet
- **Důsledek**: Spotřeba se pokryje ze sítě → vyšší náklady

**Ale toto není bug, toto je ZÁMĚR!** User minimum = constraint, pod který se nesmí plánování dostat.

### 4.2 HYBRID Algoritmus - Forward Pass

**Řádky 1880-1895:**
```python
# HOME I logika: solar → baterie nebo baterie → load
if solar_kwh >= load_kwh:
    net_energy = solar_kwh - load_kwh  # Přebytek nabíjí baterii
else:
    net_energy = -(load_kwh - solar_kwh) / efficiency  # Vybíjení s losses

battery += net_energy
battery = max(0, min(battery, max_capacity))
battery_trajectory.append(battery)
```

**PROBLÉM 1: Clamp na 0 místo min_capacity**
```python
battery = max(0, min(battery, max_capacity))
#            ↑
#            Mělo by být: max(min_capacity, ...)
```

**Důsledek:** Forward pass simuluje vybíjení až k 0 kWh místo 5.07 kWh (user minimum)!

### 4.3 HYBRID Algoritmus - Backward Pass

**Řádky 1915-1938:**
```python
for i in range(n - 1, -1, -1):
    # ... výpočet net_energy ...

    if solar_kwh >= load_kwh:
        net_energy = solar_kwh - load_kwh
        required_battery[i] = required_battery[i + 1] - net_energy
    else:
        drain = (load_kwh - solar_kwh) / efficiency
        required_battery[i] = required_battery[i + 1] + drain

    # KRITICKÉ: NEPOUŽÍVAT min clamp! Pokud baterie klesá pod minimum,
    # required_battery MUSÍ být VYŠŠÍ než min_capacity aby trigger nabíjení!
    # Jen clamp na max kapacitu
    required_battery[i] = min(required_battery[i], max_capacity)
```

**PROBLÉM 2: Komentář je SPRÁVNÝ, ale implementace NERESPEKTUJE user minimum**

Backward pass správně nepoužívá `max(min_capacity, ...)` aby detekoval potřebu nabíjení.
**ALE**: Po výpočtu by měl algoritmus OVĚŘIT, že trajektorie nikdy neklesá pod `min_capacity`!

### 4.4 HYBRID Algoritmus - Build Result

**Řádky 2100-2170:**
```python
elif mode == CBB_MODE_HOME_II:
    # HOME II: FVE → spotřeba, grid doplňuje, baterie netouched (když FVE < load)
    if solar_kwh >= load_kwh:
        # Přebytek → baterie
        surplus = solar_kwh - load_kwh
        battery += surplus
        if battery > max_capacity:
            grid_export = battery - max_capacity
            battery = max_capacity
            total_cost -= grid_export * price
    else:
        # Deficit → GRID (ne baterie!)
        deficit = load_kwh - solar_kwh
        grid_import = deficit
        total_cost += grid_import * price
        # Baterie se nemění ← PROBLÉM!
```

**PROBLÉM 3: HOME II nerespektuje fyziku baterie**

HOME II říká "baterie se nemění", ale ve skutečnosti **baterie má self-discharge**!
Navíc: Pokud baterie je na minimu a režim HOME II, spotřeba MUSÍ ze sítě → SPRÁVNĚ ✅

---

## 5. IDENTIFIKOVANÉ BUGY

### 🐛 BUG 1: Forward Pass Clamp na 0 místo min_capacity
**Lokace:** `_calculate_optimal_modes_hybrid()`, řádek ~1892
**Současný kód:**
```python
battery = max(0, min(battery, max_capacity))
```
**Správně:**
```python
battery = max(min_capacity, min(battery, max_capacity))
```
**Dopad:** Forward pass simuluje vybíjení pod user minimum → špatný odhad `min_reached`

---

### 🐛 BUG 2: Chybí validace trajektorie v _build_result
**Lokace:** `_build_result()`, řádky 2100-2300
**Problém:** Timeline se builduje bez ověření, že `battery` nikdy neklesá pod `min_capacity`
**Řešení:** Přidat assert nebo warning:
```python
if battery < min_capacity - 0.01:
    _LOGGER.warning(
        f"⚠️ Battery below minimum at {timestamp_str}: "
        f"battery={battery:.2f} kWh < min={min_capacity:.2f} kWh"
    )
    battery = min_capacity  # Force clamp
```

---

### 🐛 BUG 3: HOME I logika v _build_result je zjednodušená
**Lokace:** `_build_result()`, řádky 2100-2120
**Současný kód:**
```python
elif mode == CBB_MODE_HOME_I:
    if solar_kwh >= load_kwh:
        battery += solar_kwh - load_kwh
    else:
        battery -= (load_kwh - solar_kwh) / efficiency
```

**Problém:** Nepoužívá `_simulate_interval_with_mode()` → nedodržuje stejnou fyziku!

**Důsledek:**
- `_simulate_interval_with_mode()` má komplexní logiku pro HOME I (nabíjení, vybíjení, export)
- `_build_result()` má zjednodušenou verzi → ROZDÍLNÉ VÝSLEDKY!

**Řešení:** Použít `_simulate_interval_with_mode()` v `_build_result()` místo duplikace logiky.

---

### 🐛 BUG 4: Chybí enforcement user minimum v režimech I/II/III
**Lokace:** `_simulate_interval_with_mode()`, režimy HOME I/II/III
**Problém:** Algoritmy předpokládají, že baterie NIKDY neklesne pod `min_capacity`, ale neexistuje HARD CHECK!

**Současný kód (HOME I, řádky 810-870):**
```python
# Not enough FVE - discharge battery (DC/AC)
deficit = load_kwh - remaining_solar
battery_available = result["new_soc"] - min_capacity
discharge_amount = min(deficit / efficiency, battery_available)

result["battery_discharge"] = discharge_amount
result["new_soc"] -= discharge_amount

# CRITICAL FIX: Pokud baterie nestačí (je na minimu), zbytek deficitu ze sítě!
if discharge_amount < deficit / efficiency:
    remaining_deficit = deficit - (discharge_amount * efficiency)
    result["grid_import"] = remaining_deficit
    result["grid_cost"] = remaining_deficit * spot_price

# If still deficit, import from grid
remaining_deficit = deficit - discharge_amount * efficiency
if remaining_deficit > 0.001:  # tolerance
    result["grid_import"] = remaining_deficit
    result["grid_cost"] = remaining_deficit * spot_price
```

**Pozorování:** Kód už OBSAHUJE logiku pro pokrytí deficitu ze sítě! ✅

**Ale:** Deficit se počítá DVAKRÁT (řádky 858-860 a 863-866) → **DUPLICITNÍ IMPORT!** 🐛

---

## 6. ARCHITEKTONICKÝ PROBLÉM - Smíšené Jednotky

### 6.1 Současný Stav

**Plánovač pracuje s kWh:**
```python
battery_soc = 12.95  # kWh
min_capacity = 5.07  # kWh
max_capacity = 15.36 # kWh
target_capacity = 12.29 # kWh
```

**Problémy:**
1. **Nekonzistence:** `battery_capacity_kwh` v timeline je kWh, ne SOC%
2. **Složitá konverze:** Každý výpočet musí konvertovat mezi kWh a %
3. **Chyby zaokrouhlení:** Při konverzi se ztrácí přesnost
4. **Nečitelnost:** 12.95 kWh není intuitivní - je to 84% nebo 73%?

### 6.2 Navrhované Řešení

**Jednotný systém: SOC% jako primární jednotka**

```python
# NOVÝ SYSTÉM - vše v SOC%
battery_soc_percent = 84.3  # %
physical_min_soc = 20.0     # % (z sensoru batt_bat_min)
user_min_soc = 33.0         # % (z config flow)
target_soc = 80.0           # % (z config flow)
max_soc = 100.0             # %

# Konverze jen když OPRAVDU potřebujeme kWh
def soc_to_kwh(soc_percent: float) -> float:
    total_capacity = self._get_total_battery_capacity()
    return total_capacity * soc_percent / 100.0

def kwh_to_soc(kwh: float) -> float:
    total_capacity = self._get_total_battery_capacity()
    return (kwh / total_capacity) * 100.0
```

**Výhody:**
- ✅ Intuitivní: "baterie na 84%" vs "baterie na 12.95 kWh"
- ✅ Přesnost: Procenta nemají zaokrouhlovací chyby
- ✅ Jednoduchost: Všechny výpočty v jedné jednotce
- ✅ Konzistence: Timeline, senzory, API - vše SOC%
- ✅ Validation: `assert 20.0 <= soc <= 100.0` místo `assert 3.07 <= kwh <= 15.36`

---

## 7. DOPORUČENÉ ZMĚNY

### 7.1 Kritické Opravy (MUSÍ být opraveno)

1. **FIX BUG 1:** Clamp forward pass na `min_capacity` místo `0`
2. **FIX BUG 3:** Odstranit duplicitní výpočet `remaining_deficit` v HOME I
3. **FIX BUG 2:** Přidat validaci `battery >= min_capacity` do `_build_result()`

### 7.2 Architektonická Refaktorizace (SILNĚ DOPORUČENO)

1. **Migrate to SOC%:** Změnit všechny algoritmy aby pracovaly s SOC% místo kWh
2. **Unified simulation:** Použít `_simulate_interval_with_mode()` všude místo duplikace
3. **Constraint enforcement:** Explicitní ověření constraints v každém kroku

### 7.3 Implementační Plán

#### Fáze 1: Quick Fixes (30 min)
- Opravit BUG 1 (clamp na min_capacity)
- Opravit BUG 3 (duplicitní deficit)
- Přidat validation warnings

#### Fáze 2: Unified Simulation (2h)
- Refaktorovat `_build_result()` aby používal `_simulate_interval_with_mode()`
- Odstranit duplikaci logiky režimů

#### Fáze 3: SOC% Migration (4-6h)
- Přepsat `_calculate_optimal_modes_hybrid()` na SOC%
- Přepsat `_simulate_interval_with_mode()` na SOC%
- Upravit API timeline aby vracelo SOC% jako `battery_soc_percent`
- Udržet `battery_capacity_kwh` pro zpětnou kompatibilitu (computed)

---

## 8. VALIDACE

### 8.1 Test Scénáře

**Scénář 1: Noční vybíjení**
```
Čas: 00:00 - 06:00
FVE: 0 kWh
Load: 0.5 kWh/interval (2 kW)
Režim: HOME I
Start SOC: 50% (7.68 kWh)
User min: 33% (5.07 kWh)

Očekávaný výsledek:
- Baterie vybíjí 0.5/0.88 = 0.57 kWh/interval
- Po 24 intervalech (6h): 7.68 - 24×0.57 = -6.0 kWh ❌
- Mělo by: Vybít do 33% (5.07 kWh), zbytek ze sítě ✅
```

**Scénář 2: Noční nabíjení**
```
Čas: 22:00 - 06:00 (32 intervalů)
FVE: 0 kWh
Load: 0.5 kWh/interval
Režim: Optimální (HYBRID)
Start SOC: 40% (6.14 kWh)
Target: 80% (12.29 kWh)
Spot prices: 2-5 Kč/kWh (noční variace)

Očekávaný výsledek:
- Potřeba dobít: 12.29 - 6.14 = 6.15 kWh
- AC limit: 0.7 kWh/interval
- Počet intervalů: ceil(6.15/0.7) = 9 intervalů
- HYBRID vybere 9 nejlevnějších intervalů mezi 22-06h
- Nabije přesně na 80% SOC
- Minimum NIKDY neklesne pod 33% SOC ✅
```

### 8.2 Assertion Checks

```python
# Po každém intervalu
assert battery_soc >= min_capacity, \
    f"Battery below minimum: {battery_soc:.2f} < {min_capacity:.2f}"

# Na konci optimalizace
assert final_soc >= target_capacity * 0.95, \
    f"Failed to reach target: {final_soc:.2f} < {target_capacity:.2f}"

# Energie se musí zachovat
total_input = sum(solar + grid_import + grid_charge)
total_output = sum(load + grid_export + battery_charge)
assert abs(total_input - total_output) < 0.1, "Energy not conserved!"
```

---

## 9. SHRNUTÍ

### ✅ Co Funguje Správně
- Výpočet `min_capacity`, `target_capacity` z percentil
- `_simulate_interval_with_mode()` logika pro HOME I/UPS
- Backward pass detekce potřeby nabíjení
- Price-aware charging selection

### ❌ Co Je Rozbité
1. Forward pass clamp na 0 místo min_capacity
2. Duplicitní výpočet deficitu v HOME I
3. `_build_result()` duplikuje fyziku místo použití `_simulate_interval_with_mode()`
4. Chybí validace že baterie nikdy neklesne pod user minimum

### 🎯 Priorita Oprav
1. **CRITICAL:** Opravit forward pass clamp (BUG 1)
2. **HIGH:** Odstranit duplicitní deficit (BUG 3)
3. **HIGH:** Přidat validation warnings (BUG 2)
4. **MEDIUM:** Unified simulation (odstranit duplikaci)
5. **LOW:** Migrate to SOC% (architektonická změna)

---

**Připraveno k implementaci:** ✅
**Čeká na approval:** Ano
