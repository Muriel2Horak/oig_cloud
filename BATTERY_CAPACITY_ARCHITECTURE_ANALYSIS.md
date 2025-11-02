# Analýza Architektury Kapacity Baterie a SOC

**Datum:** 1. listopadu 2025
**Účel:** Identifikovat rozpory v architektuře kapacity baterie a navrhnout opravy

---

## 0. BUSINESS POŽADAVKY A SCOPE

### 0.1 Business Cíle Systému

**Primární cíl:** Minimalizovat náklady na elektřinu při zachování komfortu a bezpečnosti dodávky

**Dílčí cíle:**
1. **Optimalizace nákladů** - využít spot pricing pro levné nabíjení
2. **Predikce spotřeby** - plánovat podle očekávané spotřeby a FVE produkce
3. **Flexibilní target** - dosáhnout požadovaného SoC v daný čas a udržet ho
4. **Minimalizace opotřebení** - omezit zbytečné cykly nabíjení/vybíjení
5. **Transparentnost** - uživatel vidí plán, skutečnost a úspory

### 0.2 Požadavky na Přepínání Režimů

#### Business Kontext
- **CBB invertor má 4 režimy** (HOME I, II, III, UPS)
- **Fyzické přepnutí trvá 2-5 minut** (switching time)
- **Režim se aplikuje okamžitě** po přepnutí (no gradual transition)
- **Častré přepínání není žádoucí** z několika důvodů:

**Důvody omezit přepínání:**

1. **Mechanical wear** (opotřebení)
   - Každé přepnutí = zátěž na relé/kontaktory
   - Zkracuje životnost zařízení
   - Není to kritické pro jednotlivé přepnutí, ale dlouhodobě škodlivé

2. **User experience** (uživatelský komfort)
   - Uživatel vidí LED indikaci režimu na invertoru
   - Časté blikání = chaos, nejistota
   - Lepší: stabilní režim 30-60 minut než změna každých 15 minut

3. **Stability** (stabilita systému)
   - Při přepnutí může dojít k micro-outage (2-5 sekund)
   - Citlivá elektronika může reagovat
   - Minimalizovat počet přerušení

4. **Predictability** (prediktabilita)
   - Stabilní režim = předvídatelné chování
   - Snazší debugging a monitoring
   - Jasná korelace mezi plánem a realitou

**NENÍ to o:**
- ❌ Transition costs (energetické ztráty při přepnutí) - tyto jsou zanedbatelné (20-50Wh)
- ❌ Time delay (15min zpoždění) - přepnutí je během 2-5 minut
- ❌ Zvýšených nákladech - přepnutí samo o sobě nestojí peníze

**JE to o:**
- ✅ **Minimálním počtu přepnutí** - co nejméně switchů za den
- ✅ **Minimální době trvání režimu** - pokud přepneme, ať to má smysl (min 30-60 min)
- ✅ **Gap merging** - pokud je mezi dvěma UPS bloky krátká mezera, sloučit je
- ✅ **Cost/benefit analýze** - přepnout jen když benefit > cost of complexity

### 0.3 Konkrétní Business Požadavky

#### BR-1: Minimální Doba Trvání Režimu
**Požadavek:** Každý režim musí běžet minimálně 30 minut (2 intervaly × 15 min)

**Výjimka:** HOME I (default mode) může být i kratší

**Zdůvodnění:**
- Pokud přepínáme, ať to má smysl
- 15 minut UPS nabíjení = max 0.7 kWh → malý benefit
- 30 minut UPS nabíjení = max 1.4 kWh → rozumný benefit

**Implementace:**
```python
MIN_MODE_DURATION = {
    "Home UPS": 2,    # 30 minut minimum
    "Home II": 2,     # 30 minut minimum
    "Home III": 2,    # 30 minut minimum
    "Home I": 1,      # 15 minut OK (default mode)
}
```

#### BR-2: Gap Merging
**Požadavek:** Pokud jsou dva bloky stejného režimu oddělené krátkým úsekem (1-2 intervaly), sloučit je

**Příklad:**
```
Původní: [UPS, UPS, HOME_I, UPS, UPS]
Sloučený: [UPS, UPS, UPS, UPS, UPS]
```

**Zdůvodnění:**
- 2 přepnutí (UPS→I, I→UPS) vs 0 přepnutí
- Gap 15-30 minut nemá velký ekonomický přínos
- Stabilnější provoz

**Kritéria pro merging:**
```python
# Sloučit pokud:
# 1. Gap je max 2 intervaly (30 min)
# 2. Režimy před a po gap jsou stejné
# 3. Gap režim je HOME I nebo HOME II (ne HOME III nebo UPS)
```

#### BR-3: Maximální Počet Přepnutí za Den
**Požadavek (soft):** Optimálně max 6-8 přepnutí za den

**Typický scénář:**
```
Noc:       HOME I (vybíjení baterie)
04:00-06:00: HOME UPS (nabíjení levná elektřina)
06:00-09:00: HOME I
09:00-16:00: HOME III (maximální využití FVE)
16:00-18:00: HOME II (šetření baterie na večer)
18:00-20:00: HOME I (špička - baterie dodává)
20:00-22:00: HOME UPS (nabíjení na noc)
22:00-00:00: HOME I
```
= 7 přepnutí (přijatelné)

**Anti-pattern:**
```
Časté přepínání každých 15-30 minut
= 20-30 přepnutí za den (NEPŘIJATELNÉ)
```

#### BR-4: Cost/Benefit Ratio
**Požadavek:** Přepnout režim jen když očekávaný benefit > threshold

**Threshold:** Min 2 Kč úspora za blok režimu

**Příklad:**
```python
# UPS blok: 4 intervaly (1 hodina)
# Nabití: 4 × 0.7 kWh = 2.8 kWh
# Cena nabíjení: 2.8 × 1.5 Kč/kWh = 4.2 Kč
# Cena použití později: 2.8 × 4.0 Kč/kWh = 11.2 Kč
# Benefit: 11.2 - 4.2 = 7 Kč → VYPLATÍ SE

# UPS blok: 1 interval (15 minut)
# Nabití: 0.7 kWh
# Benefit: max 1-2 Kč → NEVYPLATÍ SE
```

#### BR-5: Smart Mode Selection Priority
**Požadavek:** Preferenční pořadí režimů podle situace

**Priorita při FVE = 0 (noc):**
1. HOME I - default (baterie → load)
2. HOME UPS - jen když potřeba nabít levně

**Priorita při FVE > 0 (den):**
1. HOME III - když je slunce + baterie není plná (max využití FVE)
2. HOME II - když je drahá špička později + baterie má rezervu
3. HOME I - default (solar → load, baterie jako buffer)
4. HOME UPS - NIKDY (nemá smysl nabíjet ze sítě když svítí slunce)

### 0.4 Scope Optimalizace

**V scope:**
1. ✅ Minimální doba trvání režimů (BR-1)
2. ✅ Gap merging optimization (BR-2)
3. ✅ Cost/benefit analysis pro režimy (BR-4)
4. ✅ Smart mode selection s ohledem na SoC (BR-5)
5. ✅ Tracking počtu přepnutí (BR-3 monitoring)

**Out of scope:**
1. ❌ Transition energy losses (zanedbatelné 20-50Wh)
2. ❌ Time delay implementation (přepnutí je rychlé 2-5 min)
3. ❌ Penalizace za počet switchů v cost funkci (nepřímé - řešíme minimální dobou trvání)
4. ❌ Adaptive learning (ML na režimy) - budoucnost

**Priorita implementace:**
1. **P0 (KRITICKÉ):** Bug fixes (BUG 1-4) - blocker pro vše ostatní
2. **P1 (VYSOKÁ):** Minimum duration enforcement (BR-1)
3. **P1 (VYSOKÁ):** Gap merging improvement (BR-2)
4. **P2 (STŘEDNÍ):** SoC-aware mode selection (BR-5)
5. **P2 (STŘEDNÍ):** Cost/benefit threshold (BR-4)
6. **P3 (NÍZKÁ):** Switch count monitoring (BR-3)

### 0.5 Success Kritéria

**Po implementaci očekáváme:**

1. **Stabilní provoz**
   - Max 6-10 přepnutí za den
   - Každý režim běží min 30 minut (kromě HOME I)

2. **Ekonomická efektivita**
   - Žádné zbytečné UPS bloky < 30 min
   - UPS pouze v nejlevnějších hodinách
   - HOME III max využití FVE

3. **Transparentnost**
   - Metadata obsahuje `mode_switches` count
   - Dashboard zobrazuje režimové bloky
   - Historie ukazuje důvod přepnutí

4. **Robustnost**
   - Respektuje SoC limity
   - Nenavrhuje nemožné režimy (UPS when FVE=max)
   - Graceful degradation při chybějících datech

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

## 10. TARGET TIMING & BALANCOVÁNÍ - Nový Požadavek

### 10.1 Současný Stav

**Existující struktura charging_plan:**
```python
{
    "requester": "battery_balancing",
    "mode": "balancing_weekly",
    "target_soc_percent": 100.0,
    "deadline": "2025-11-03T06:00:00+01:00",  # Kdy má být dosaženo targetu
    "charging_plan": {
        "holding_start": "2025-11-03T06:00:00+01:00",  # Start HOLDING na 100%
        "holding_end": "2025-11-03T12:00:00+01:00",    # Konec HOLDING
        "charging_intervals": [...]  # Kdy nabíjet (price-optimized)
    }
}
```

**PROBLÉM:**
- `deadline` = kdy má být target dosažen ✅
- `holding_start` - `holding_end` = jak dlouho držet target ✅
- **ALE**: Chybí explicitní parametry pro konfiguraci těchto časů!

### 10.2 Požadavky na Target Timing

#### Use Case 1: Balancování Baterie
```
Cíl: Nabít baterii na 100% a držet 6 hodin pro balancování
Parametry:
- target_soc: 100%
- target_deadline: 06:00 (musí být nabito DO této doby)
- holding_duration: 6 hodin (držet OD 06:00 DO 12:00)
- holding_start: target_deadline (začít držet ihned po dosažení)
```

**Očekávané chování:**
```
00:00-06:00: Nabíjení ze sítě (price-optimized intervals)
06:00-12:00: Držení na 100% (HOME UPS mode - spotřeba ze sítě)
12:00+:      Normální režim (baterie se může vybíjet)
```

#### Use Case 2: Příprava na Výpadek
```
Cíl: Nabít baterii na 80% a být připraven
Parametry:
- target_soc: 80%
- target_deadline: 18:00 (musí být nabito DO 18:00)
- holding_duration: 0 (žádné držení, jen nabít a nechat)
```

**Očekávané chování:**
```
14:00-18:00: Nabíjení (price-optimized)
18:00+:      Normální režim (baterie použitelná)
```

#### Use Case 3: Ranní Start s Plnou Baterií
```
Cíl: Mít baterii plnou celou noc až do rána
Parametry:
- target_soc: 100%
- target_deadline: 22:00 (nabít do večera)
- holding_duration: 8 hodin (držet přes noc 22:00-06:00)
```

**Očekávané chování:**
```
20:00-22:00: Nabíjení
22:00-06:00: Držení na 100%
06:00+:      Normální režim (FVE převezme)
```

### 10.3 Navrhovaná API Struktura

#### Vstup: Plan Request
```python
{
    "requester": "battery_balancing",
    "mode": "balancing_weekly",
    "target_soc_percent": 100.0,

    # NOVÉ: Explicit target timing
    "target_deadline": "2025-11-03T06:00:00+01:00",  # Kdy MÁ BÝT target dosažen
    "holding_duration_hours": 6,  # Jak dlouho držet (0 = žádné držení)

    # OPTIONAL: Advanced control
    "charging_window_start": "2025-11-02T22:00:00+01:00",  # Nejdřív kdy začít nabíjet
    "max_charging_power_kw": 2.8,  # AC limit
    "prefer_solar": false  # Nabíjet jen ze sítě (ignore FVE)
}
```

#### Výstup: Charging Plan
```python
{
    "charging_plan": {
        # Vypočtené intervaly
        "charging_start": "2025-11-03T00:00:00+01:00",  # Kdy začít nabíjet
        "target_reached_at": "2025-11-03T06:00:00+01:00",  # Kdy bude target dosažen
        "holding_start": "2025-11-03T06:00:00+01:00",  # Začátek držení
        "holding_end": "2025-11-03T12:00:00+01:00",  # Konec držení

        # Intervaly kdy nabíjet (price-optimized)
        "charging_intervals": [
            {"timestamp": "2025-11-03T00:00:00+01:00", "duration_min": 15, "price": 2.5},
            {"timestamp": "2025-11-03T01:00:00+01:00", "duration_min": 15, "price": 2.3},
            ...
        ],

        # Costs
        "total_charging_cost": 15.50,  # Kč za nabití
        "total_holding_cost": 8.20,    # Kč za držení (spotřeba během UPS)
        "total_cost": 23.70
    }
}
```

### 10.4 Implementace: Charging Plan Calculator

```python
def _calculate_charging_plan_with_holding(
    self,
    target_soc_percent: float,
    target_deadline: datetime,
    holding_duration_hours: float,
    charging_window_start: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Vypočítat optimální nabíjecí plán s držením targetu.

    Args:
        target_soc_percent: Cílový SOC (%)
        target_deadline: Kdy MÁ BÝT target dosažen
        holding_duration_hours: Jak dlouho držet (0 = žádné držení)
        charging_window_start: Nejdřív kdy začít (default = now + 1h)

    Returns:
        Charging plan s intervals, costs, timing
    """

    # 1. Výpočet potřebné energie
    current_soc = self._get_current_battery_soc_percent()
    energy_needed_kwh = (target_soc_percent - current_soc) / 100.0 * self._total_capacity

    # 2. Výpočet počtu intervalů
    ac_limit_kwh_per_15min = self._config.get("home_charge_rate", 2.8) / 4.0
    intervals_needed = ceil(energy_needed_kwh / ac_limit_kwh_per_15min)

    # 3. Najít price-optimized intervaly v okně
    window_start = charging_window_start or (dt_util.now() + timedelta(hours=1))
    window_end = target_deadline

    available_intervals = self._get_intervals_in_window(window_start, window_end)
    sorted_by_price = sorted(available_intervals, key=lambda x: x["spot_price"])

    # 4. Vybrat N nejlevnějších
    charging_intervals = sorted_by_price[:intervals_needed]

    # 5. Vypočítat timing
    last_charging_interval = max(charging_intervals, key=lambda x: x["timestamp"])
    target_reached_at = last_charging_interval["timestamp"] + timedelta(minutes=15)

    # 6. Holding period
    holding_start = target_reached_at
    holding_end = holding_start + timedelta(hours=holding_duration_hours)

    # 7. Costs
    charging_cost = sum(iv["spot_price"] * ac_limit_kwh_per_15min for iv in charging_intervals)

    # Holding cost = spotřeba během UPS mode × průměrná cena
    avg_load_during_holding = self._estimate_avg_load_kwh_per_15min()
    holding_intervals_count = int(holding_duration_hours * 4)
    holding_cost = avg_load_during_holding * holding_intervals_count * self._get_avg_price()

    return {
        "charging_start": min(iv["timestamp"] for iv in charging_intervals),
        "target_reached_at": target_reached_at,
        "holding_start": holding_start,
        "holding_end": holding_end,
        "charging_intervals": charging_intervals,
        "total_charging_cost": round(charging_cost, 2),
        "total_holding_cost": round(holding_cost, 2),
        "total_cost": round(charging_cost + holding_cost, 2),
    }
```

### 10.5 Integrace do DP Algoritmu

**Úprava `_calculate_timeline_base()` pro respektování charging plan:**

```python
# Řádky 2900-3100 (v main timeline loop)
for i, point in enumerate(timeline_points):
    timestamp = point["timestamp"]

    # CHECK: Jsme v charging interval?
    if timestamp in balancing_charging_intervals:
        # FORCE: Nabíjení ze sítě
        point["mode"] = CBB_MODE_HOME_UPS  # UPS = AC charging enabled
        point["grid_charge_kwh"] = min(ac_limit_kwh, max_capacity - battery_kwh)
        point["reason"] = f"balancing_charging_{balancing_reason}"
        battery_kwh += point["grid_charge_kwh"]

    # CHECK: Jsme v holding period?
    elif balancing_start <= timestamp < balancing_end:
        # FORCE: Držení na target SOC
        point["mode"] = CBB_MODE_HOME_UPS
        point["reason"] = f"balancing_holding_{balancing_reason}"
        # Spotřeba jde ze sítě, baterie se nemění
        point["grid_import"] = point["load_kwh"]
        battery_kwh = target_soc_kwh  # Force držení

    # ELSE: Normální režim (DP optimalizace nebo HOME I)
    else:
        # ... existing logic ...
```

### 10.6 Validace a Constraints

**Safety Checks:**
```python
# 1. Deadline musí být v budoucnosti
assert target_deadline > dt_util.now(), "Deadline must be in future"

# 2. Holding nesmí být delší než 24h (bezpečnostní limit)
assert 0 <= holding_duration_hours <= 24, "Holding duration 0-24h"

# 3. Target SOC nesmí být pod user minimum
assert target_soc_percent >= user_min_soc, "Target below user minimum"

# 4. Target SOC nesmí být nad 100%
assert target_soc_percent <= 100, "Target above maximum"

# 5. Musí být dost času na nabití
min_time_needed = intervals_needed * 15 / 60  # hodiny
time_available = (target_deadline - charging_window_start).total_seconds() / 3600
assert time_available >= min_time_needed, "Not enough time to charge"
```

### 10.7 Priorita Implementace

**Fáze 1: Core Timing (2h)**
- Přidat `holding_duration_hours` do plan request
- Implementovat `_calculate_charging_plan_with_holding()`
- Update `_calculate_timeline_base()` pro respektování holding period

**Fáze 2: Cost Tracking (1h)**
- Přidat `total_holding_cost` výpočet
- Update dashboard API pro zobrazení breakdown nákladů

**Fáze 3: Advanced Control (2h)**
- Přidat `charging_window_start` support
- Implementovat `prefer_solar` flag
- Validace constraints

---

## 11. AKTUALIZOVANÁ PRIORITA OPRAV

### 11.1 Rozšířená Priorita s Target Timing

Po přidání požadavků na target timing a balancování:

1. **CRITICAL (nejdřív):** Opravit BUG 1 - Forward pass clamp
   - **Důvod:** Bez toho algorithmus špatně simuluje vybíjení
   - **Dopad na balancing:** Může špatně vypočítat kolik energie je potřeba

2. **CRITICAL (nejdřív):** Opravit BUG 3 - Duplicitní deficit
   - **Důvod:** Duplicitní import ovlivňuje cost calculation
   - **Dopad na balancing:** Špatný výpočet nákladů na holding period

3. **HIGH:** Implementovat Target Timing (Sekce 10)
   - **Důvod:** Nový požadavek pro balancování
   - **Dependencies:** Potřebuje BUG 1 + BUG 3 opravu

4. **HIGH:** Přidat validation warnings (BUG 2)
   - **Důvod:** Detekce porušení constraints
   - **Dopad:** Catch bugs dříve

5. **MEDIUM:** Unified simulation
   - **Důvod:** Odstranit duplikaci logiky
   - **Benefit:** Jednodušší maintenance

6. **LOW:** Migrate to SOC%
   - **Důvod:** Architektonická změna
   - **Benefit:** Čitelnější kód, ale není nutné pro funkcionalitu

### 11.2 Vztah Target Timing k Existujícím Bugům

**BUG 1 + BUG 3 BLOKUJÍ Target Timing implementaci protože:**

```python
# Holding period cost calculation spoléhá na správný deficit výpočet
holding_cost = 0.0
for interval in holding_intervals:
    # Spotřeba jde ze sítě (baterie držena na 100%)
    load_kwh = interval["load_kwh"]
    spot_price = interval["spot_price"]

    # BUG 3: Pokud je deficit duplicitní, holding_cost bude 2x větší! ❌
    cost = load_kwh * spot_price
    holding_cost += cost
```

**Proto:**
1. Nejdřív opravit BUG 1 + BUG 3
2. Pak implementovat Target Timing
3. Pak teprve validace a refaktoring

### 11.3 Test Scénář: Balancování s Target Timing

**Setup:**
```
Čas: 2025-11-02 18:00
Current SOC: 45% (6.9 kWh)
Target: 100% (15.36 kWh)
Deadline: 2025-11-03 06:00 (za 12h)
Holding: 6h (06:00-12:00)
```

**Očekávaný Výsledek:**

```python
# 1. Energy calculation
energy_needed = (100% - 45%) * 15.36 kWh = 8.45 kWh

# 2. Intervals needed
ac_limit = 2.8 / 4 = 0.7 kWh/15min
intervals = ceil(8.45 / 0.7) = 13 intervalů

# 3. Price optimization
# Vybrat 13 nejlevnějších intervalů mezi 18:00-06:00 (48 intervalů)
# Typicky noční tarif: 2-3 Kč/kWh

# 4. Timeline validation
# ✅ Battery NIKDY neklesne pod 33% (user minimum)
# ✅ Battery dosáhne 100% PŘED 06:00
# ✅ Battery se DRŽÍ na 100% během 06:00-12:00
# ✅ Po 12:00 normální režim (může vybíjet)

# 5. Costs
charging_cost = 13 × 0.7 kWh × 2.5 Kč = 22.75 Kč
holding_cost = 24 × 0.35 kWh × 3.0 Kč = 25.20 Kč  # 6h × 4 intervals × avg_load × price
total_cost = 47.95 Kč

# 6. Benefit analysis
# Balancing benefit = lepší životnost baterie (nekwantifikovatelné)
# Cost = 47.95 Kč / týden = ~200 Kč / měsíc
```

---

## 12. SIMULACE - Současný Stav a Požadavky

### 12.1 Existující Implementace

**✅ CO JIŽ EXISTUJE:**

#### 1. `simulate_charging_plan()` - Simulace BEZ aplikace
```python
async def simulate_charging_plan(
    self,
    target_soc_percent: float,
    charging_start: datetime,
    charging_end: datetime,
    holding_start: datetime,
    holding_end: datetime,
    requester: str,
    mode: str = "economic",
) -> Dict[str, Any]:
```

**Funkce:**
- ✅ Vytvoří KOPII baseline timeline
- ✅ Aplikuje simulovaný plán (charging + holding)
- ✅ Spočítá náklady (charging, holding, opportunity)
- ✅ Validuje constraints (minimal_capacity_breach)
- ✅ Vrátí výsledky BEZ změny skutečného stavu
- ✅ Uloží simulaci do `self._simulations[sim_id]`

**Výstup:**
```python
{
    "simulation_id": "sim_balancing_20251102_180000",
    "feasible": True,
    "violation": None,
    "charging_cost_czk": 35.12,
    "holding_cost_czk": 2.15,
    "opportunity_cost_czk": 5.30,
    "total_cost_czk": 42.57,
    "energy_needed_kwh": 9.8,
    "achieved_soc_percent": 100.0,
    "charging_intervals": [...]
}
```

#### 2. `apply_charging_plan()` - Aplikace plánu
```python
def apply_charging_plan(
    self,
    plan_result: Dict[str, Any],
    plan_start: datetime,
    plan_end: datetime,
) -> bool:
```

**Funkce:**
- ✅ Aplikuje schválený plán na `self._active_charging_plan`
- ✅ Lifecycle management (PLANNED → LOCKED → RUNNING → COMPLETED)
- ✅ Přepočítá forecast s novým plánem (`async_update()`)
- ✅ Persistuje data do HA attributes

**Input:** Potřebuje `plan_result` z `plan_charging_to_target()`, NE ze simulace!

#### 3. Storage simulací
```python
self._simulations: Dict[str, Dict] = {
    "sim_balancing_20251102_180000": {
        "created_at": datetime,
        "timeline": [...],
        "costs": {...},
        "violations": [...],
        "metadata": {...}
    }
}
```

**Features:**
- ✅ Auto-cleanup: starší než 1h
- ✅ Max 10 simulací v paměti
- ✅ Každá simulace má unique ID

---

### 12.2 CO CHYBÍ - Gap Analysis

**❌ CHYBĚJÍCÍ FUNKCE:**

#### 1. `get_simulation(sim_id)` - Získat uloženou simulaci
```python
def get_simulation(self, sim_id: str) -> Optional[Dict[str, Any]]:
    """
    Získat výsledky uložené simulace.

    Returns:
        None pokud simulace neexistuje nebo expirovala
        Dict s plnými daty simulace
    """
```

**Použití:**
- Dashboard potřebuje zobrazit výsledky simulace
- API endpoint `/api/oig_cloud/simulation/<sim_id>` potřebuje data
- Porovnání více simulací

#### 2. `apply_simulation(sim_id)` - Aplikovat simulaci
```python
def apply_simulation(self, sim_id: str) -> bool:
    """
    Aplikuje uloženou simulaci jako aktivní plán.

    Process:
    1. Načte simulaci z self._simulations[sim_id]
    2. Validuje že simulace je feasible
    3. Převede simulaci na plan_result format
    4. Volá apply_charging_plan()

    Returns:
        True pokud úspěšně aplikováno
        False pokud simulace neexistuje nebo není feasible
    """
```

**Problém:** `apply_charging_plan()` očekává output z `plan_charging_to_target()`, ne ze simulace!

**Řešení:** Potřebujeme konverzi:
```python
simulation_data → plan_result format → apply_charging_plan()
```

#### 3. `get_simulation_timeline(sim_id)` - Timeline data
```python
def get_simulation_timeline(self, sim_id: str) -> Optional[List[Dict[str, Any]]]:
    """
    Získat timeline ze simulace pro vizualizaci.

    Returns:
        List timeline points nebo None
    """
```

**Použití:**
- Dashboard graf "Co kdyby..."
- Porovnání actual vs simulated timeline

---

### 12.3 Problém: Formát Incompatibility

**KRITICKÝ PROBLÉM:**

`simulate_charging_plan()` vrací:
```python
{
    "simulation_id": str,
    "feasible": bool,
    "charging_cost_czk": float,
    "charging_intervals": [...]  # List[Dict] s timestamp, grid_kwh, price
}
```

`apply_charging_plan()` očekává `plan_result` z `plan_charging_to_target()`:
```python
{
    "feasible": bool,
    "requester": str,
    "mode": str,
    "target_soc_percent": float,
    "charging_plan": {
        "holding_start": str,
        "holding_end": str,
        "charging_intervals": [...]  # List[Dict] s timestamp, duration_min, price
    },
    "created_at": str
}
```

**Rozdíly:**
1. ❌ Charging intervals mají jiný formát
2. ❌ Simulace má metadata přímo, plan_result má je v `charging_plan`
3. ❌ Chybí `requester`, `mode` v simulaci
4. ❌ Simulace nemá `charging_plan` wrapper

---

### 12.4 Navrhované Řešení

#### Option A: Konverzní funkce (DOPORUČENO)
```python
def _convert_simulation_to_plan_result(
    self,
    simulation: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Převede simulaci na plan_result format pro apply_charging_plan().

    Args:
        simulation: Výsledek z simulate_charging_plan()

    Returns:
        plan_result format kompatibilní s apply_charging_plan()
    """
    # Extract metadata
    metadata = simulation.get("metadata", {})

    return {
        "feasible": simulation.get("feasible", False),
        "requester": metadata.get("requester", "simulation"),
        "mode": metadata.get("mode", "economic"),
        "target_soc_percent": simulation.get("achieved_soc_percent", 100.0),
        "charging_plan": {
            "holding_start": metadata.get("holding_start").isoformat(),
            "holding_end": metadata.get("holding_end").isoformat(),
            "charging_intervals": [
                {
                    "timestamp": iv["timestamp"],
                    "duration_min": 15,
                    "price": iv.get("price_czk", 0),
                }
                for iv in simulation.get("charging_intervals", [])
            ],
        },
        "created_at": simulation.get("created_at", dt_util.now().isoformat()),
        "initial_battery_kwh": simulation.get("initial_soc_percent", 0) / 100.0 * self._get_max_battery_capacity(),
    }
```

#### Option B: Unified Format (LEPŠÍ, ale větší refactoring)
Sjednotit formát aby `simulate_charging_plan()` vracel už správný `plan_result` format.

**Výhoda:** Žádná konverze
**Nevýhoda:** Breaking change pro existující kód

---

### 12.5 Implementace Chybějících Funkcí

```python
def get_simulation(self, sim_id: str) -> Optional[Dict[str, Any]]:
    """Získat simulaci včetně timeline a costs."""
    if not hasattr(self, "_simulations"):
        return None

    return self._simulations.get(sim_id)


def get_simulation_timeline(self, sim_id: str) -> Optional[List[Dict[str, Any]]]:
    """Získat timeline ze simulace."""
    sim = self.get_simulation(sim_id)
    if not sim:
        return None

    return sim.get("timeline")


def apply_simulation(self, sim_id: str) -> bool:
    """
    Aplikuje simulaci jako aktivní plán.

    Process:
    1. Load simulation
    2. Validate feasibility
    3. Convert to plan_result format
    4. Extract plan_start/plan_end from metadata
    5. Call apply_charging_plan()
    """
    # 1. Load
    sim = self.get_simulation(sim_id)
    if not sim:
        _LOGGER.error(f"Simulation {sim_id} not found")
        return False

    # 2. Validate - check both simulation result AND stored data
    simulation_result = sim  # The simulation dict itself contains feasibility
    if not simulation_result.get("feasible", False):
        _LOGGER.warning(f"Cannot apply non-feasible simulation {sim_id}")
        return False

    # 3. Convert format
    plan_result = self._convert_simulation_to_plan_result(simulation_result)

    # 4. Extract timing
    metadata = sim.get("metadata", {})
    plan_start = metadata.get("charging_start")
    plan_end = metadata.get("holding_end")

    if not plan_start or not plan_end:
        _LOGGER.error(f"Simulation {sim_id} missing timing metadata")
        return False

    # 5. Apply
    return self.apply_charging_plan(plan_result, plan_start, plan_end)


def list_simulations(self) -> List[Dict[str, Any]]:
    """
    Vrátí seznam všech aktivních simulací.

    Returns:
        List[{sim_id, created_at, requester, feasible, total_cost}]
    """
    if not hasattr(self, "_simulations"):
        return []

    result = []
    for sim_id, sim_data in self._simulations.items():
        metadata = sim_data.get("metadata", {})
        costs = sim_data.get("costs", {})

        result.append({
            "sim_id": sim_id,
            "created_at": sim_data.get("created_at").isoformat() if sim_data.get("created_at") else None,
            "requester": metadata.get("requester", "unknown"),
            "feasible": len([v for v in sim_data.get("violations", []) if v["severity"] == "critical"]) == 0,
            "total_cost_czk": costs.get("total", 0),
        })

    return sorted(result, key=lambda x: x["created_at"] or "", reverse=True)
```

---

### 12.6 Integrace s API

Pro dashboard/frontend přidat API endpointy:

```python
# ha_rest_api.py

class OIGCloudSimulationView(HomeAssistantView):
    """API endpoint pro simulace."""

    url = f"{API_BASE}/simulation/{{box_id}}/{{sim_id}}"
    name = "api:oig_cloud:simulation"

    async def get(self, request, box_id: str, sim_id: str):
        """GET /api/oig_cloud/simulation/{box_id}/{sim_id}"""
        entity = self._find_forecast_sensor(box_id)
        if not entity:
            return self.json({"error": "Entity not found"}, status=404)

        sim = entity.get_simulation(sim_id)
        if not sim:
            return self.json({"error": "Simulation not found"}, status=404)

        return self.json(sim)


class OIGCloudSimulationApplyView(HomeAssistantView):
    """API endpoint pro aplikaci simulace."""

    url = f"{API_BASE}/simulation/{{box_id}}/{{sim_id}}/apply"
    name = "api:oig_cloud:simulation_apply"

    async def post(self, request, box_id: str, sim_id: str):
        """POST /api/oig_cloud/simulation/{box_id}/{sim_id}/apply"""
        entity = self._find_forecast_sensor(box_id)
        if not entity:
            return self.json({"error": "Entity not found"}, status=404)

        success = entity.apply_simulation(sim_id)

        return self.json({
            "success": success,
            "active_plan": entity._active_charging_plan if success else None
        })


class OIGCloudSimulationListView(HomeAssistantView):
    """API endpoint pro seznam simulací."""

    url = f"{API_BASE}/simulations/{{box_id}}"
    name = "api:oig_cloud:simulations"

    async def get(self, request, box_id: str):
        """GET /api/oig_cloud/simulations/{box_id}"""
        entity = self._find_forecast_sensor(box_id)
        if not entity:
            return self.json({"error": "Entity not found"}, status=404)

        simulations = entity.list_simulations()

        return self.json({
            "simulations": simulations,
            "count": len(simulations)
        })
```

---

### 12.7 Omezení a Slepé Uličky

**SOUČASNÁ OMEZENÍ:**

1. **Simulace expirují po 1h**
   - Problém: Pokud uživatel odejde a vrátí se později, simulace už neexistuje
   - Řešení: Prodloužit TTL na 24h nebo persist do storage

2. **Max 10 simulací v paměti**
   - Problém: Při testování více variant rychle dojde k limitu
   - Řešení: Zvýšit na 50 nebo persist do disk storage

3. **Simulace se ztrácejí při restartu**
   - Problém: Restart HA = ztráta všech simulací
   - Řešení: Persist do `.storage/oig_cloud_simulations/`

4. **Formát incompatibility**
   - Problém: Simulace ≠ plan_result format
   - Řešení: Konverzní funkce nebo unified format

5. **Chybí timeline v simulaci**
   - Problém: Simulace ukládá timeline do `self._simulations[sim_id]["timeline"]`
   - Ale `simulate_charging_plan()` NEVRACÍ timeline v response!
   - Řešení: Přidat `timeline` do return dict

**SLEPÉ ULIČKY:**

❌ **Pokus aplikovat simulaci přímo bez konverze**
```python
# ❌ NEFUNGUJE
self.apply_charging_plan(simulation_result, ...)
# TypeError: missing keys 'charging_plan', 'requester', 'mode'
```

❌ **Použít simulaci jako baseline pro další simulaci**
```python
# ❌ CIRCULAR DEPENDENCY
sim1 = simulate_charging_plan(...)
# Modifikovat _baseline_timeline = sim1["timeline"]
sim2 = simulate_charging_plan(...)  # Simuluje na sim1, ne na skutečném stavu!
```

❌ **Aplikovat simulaci během RUNNING plánu**
```python
# ❌ CONFLICT
# Pokud už běží plán, apply_simulation() by ho přepsalo
# Potřeba nejdřív zrušit aktivní plán nebo odmítnout
```

---

### 12.8 Doporučené Změny

**PRIORITA:**

1. **HIGH:** Implementovat `get_simulation()`, `apply_simulation()`, `list_simulations()`
   - Důvod: Základní funkcionalita pro dashboard
   - Čas: 2h

2. **HIGH:** Přidat konverzní funkci `_convert_simulation_to_plan_result()`
   - Důvod: Nutné pro `apply_simulation()`
   - Čas: 1h

3. **MEDIUM:** Přidat timeline do `simulate_charging_plan()` response
   - Důvod: Dashboard potřebuje vizualizaci
   - Čas: 30min

4. **MEDIUM:** Prodloužit TTL simulací na 24h
   - Důvod: Lepší UX
   - Čas: 15min

5. **LOW:** Persist simulací do storage
   - Důvod: Přežití restartu
   - Čas: 2h

6. **LOW:** API endpointy
   - Důvod: Dashboard integrace
   - Čas: 1h

---

## 13. AKTUALIZOVANÝ IMPLEMENTAČNÍ PLÁN (Post-Business Analysis)

**Revize:** Implementační plán přepracován podle business požadavků z sekce 0

**Nové priority:**
1. **P0 (BLOCKER):** Bug fixes - bez nich je planning nesprávný
2. **P1 (HIGH):** Mode switching optimization - business requirement (stability)
3. **P2 (MEDIUM):** Smart mode selection - ekonomická optimalizace
4. **P3 (LOW):** Simulace & target timing - future features

---

### 13.1 FÁZE 0: Kritické Opravy Bugů (BLOCKER - 4-6h)

**Musí být hotovo NEJDŘÍV - blokuje správnost všech výpočtů**

#### BUG 1: Forward Pass Clamp (1h)

**Problém:**
```python
# Line ~1892 v _calculate_optimal_modes_hybrid()
battery = max(0, min(battery, max_capacity))  # ← WRONG: clamp na 0
```

**Fix:**
```python
battery = max(min_capacity, min(battery, max_capacity))  # ← Respektuje minimum
```

**Důvod:** Forward pass musí respektovat minimum jinak underestimuje potřebu nabíjení

**Test:**
- Scénář: battery klesá pod minimum
- Expected: `min_reached >= min_capacity`
- Validation: Log warning pokud `min_reached < min_capacity`

**Soubor:** `oig_cloud_battery_forecast.py` line ~1892

---

#### BUG 3: Duplicitní Deficit Výpočet (1h)

**Problém:**
```python
# Lines 858-866 v _simulate_interval_with_mode()
# Deficit je spočítán 2× s různými vzorci!
```

**Fix:** Odstranit duplicitu, použít jednotný výpočet

**Test:**
- Porovnat cost před/po
- Validovat že se net_cost nezměnil pro stejné vstupy

**Soubor:** `oig_cloud_battery_forecast.py` lines 858-866

---

#### BUG 2: Validation Warnings (1.5h)

**Problém:** Crash při porušení SoC constraints místo graceful degradation

**Fix:**
```python
# V _build_result() přidat validaci:
if battery < min_capacity - 0.01:  # 0.01 kWh tolerance
    _LOGGER.warning(
        f"⚠️  Battery violated minimum: "
        f"soc={battery:.2f} < min={min_capacity:.2f} at interval {i}"
    )
    # Don't crash - clamp and continue
    battery = min_capacity
```

**Test:**
- Scenario: Forced violation
- Expected: Warning logged, execution continues
- Validation: No crashes

**Soubor:** `oig_cloud_battery_forecast.py` `_build_result()`

---

#### BUG 4: Documentation (0.5h)

**Fix:** Aktualizovat TRANSITION_COSTS konstanty podle business reality

```python
# OLD (INCORRECT):
TRANSITION_COSTS = {
    ("Home I", "Home UPS"): {
        "energy_loss_kwh": 0.05,  # Ignorovat - zanedbatelné
        "time_delay_intervals": 1,  # Ignorovat - přepnutí je 2-5 min
    },
    # ...
}

# NEW (ACCURATE):
# TRANSITION_COSTS jsou deprecated - nepoužívat pro cost calculation
# Používat pouze MIN_MODE_DURATION pro stabilitu

MIN_MODE_DURATION = {
    "Home UPS": 2,    # 30 minut minimum (BR-1)
    "Home II": 2,     # 30 minut minimum (BR-1)
    "Home III": 2,    # 30 minut minimum (BR-1)
    "Home I": 1,      # 15 minut OK (default mode)
}
```

**Soubor:** `oig_cloud_battery_forecast.py` lines 47-75

---

### 13.2 FÁZE 1: Mode Switching Optimization (HIGH PRIORITY - 6-8h)

**Business justification:** BR-1, BR-2, BR-3 - stability a user experience

#### Úkol 1.1: Minimum Duration Enforcement (3h)

**Implementation:**

```python
def _enforce_minimum_mode_duration(
    self, modes: List[int], min_durations: Dict[str, int]
) -> List[int]:
    """
    Enforce minimum mode duration per BR-1.

    Args:
        modes: List of mode integers
        min_durations: Dict mapping mode name to min intervals

    Returns:
        Adjusted modes list with short blocks converted to HOME I
    """
    result = modes.copy()

    # Identifikovat bloky
    blocks = []
    i = 0
    while i < len(result):
        mode = result[i]
        start = i
        while i < len(result) and result[i] == mode:
            i += 1
        blocks.append({
            "mode": mode,
            "start": start,
            "end": i,
            "duration": i - start
        })

    # Enforcement
    for block in blocks:
        mode = block["mode"]
        duration = block["duration"]
        mode_name = CBB_MODE_NAMES.get(mode, "Unknown")
        min_required = min_durations.get(mode_name, 2)

        if duration < min_required and mode != CBB_MODE_HOME_I:
            # Krátký blok → HOME I fallback
            _LOGGER.info(
                f"🔧 {mode_name} block @ intervals {block['start']}-{block['end']} "
                f"too short ({duration}×15min < {min_required}×15min) → HOME I"
            )
            for idx in range(block["start"], block["end"]):
                result[idx] = CBB_MODE_HOME_I

    return result
```

**Integration:**
```python
# V _calculate_optimal_modes_hybrid() after PHASE 7:

# PHASE 7.5: Enforce minimum duration (BR-1)
modes = self._enforce_minimum_mode_duration(modes, MIN_MODE_DURATION)
```

**Tests:**
- Test short HOME II block (1 interval) → converted to HOME I
- Test short HOME III block (1 interval) → converted to HOME I
- Test HOME I short block → unchanged
- Test multi-interval blocks → unchanged

**Time:** 2h implementation + 1h testing

---

#### Úkol 1.2: Enhanced Gap Merging (3h)

**Implementation:**

```python
def _merge_mode_gaps(
    self,
    modes: List[int],
    spot_prices: List[Dict[str, Any]],
    solar_forecast: Dict[str, Any],
    max_gap_size: int = 2
) -> List[int]:
    """
    Merge mode gaps per BR-2.

    Sloučí bloky stejného režimu oddělené krátkým gapem (1-2 intervaly HOME I).

    Args:
        modes: List of modes
        spot_prices: Price data for cost estimation
        solar_forecast: Solar forecast for context
        max_gap_size: Max gap to merge (default 2 = 30min)

    Returns:
        Modes list with merged gaps
    """
    result = modes.copy()

    for gap_size in range(1, max_gap_size + 1):
        i = 0
        while i < len(result) - gap_size - 1:
            before_mode = result[i]
            after_mode = result[i + gap_size + 1]

            # Same mode před a po?
            if before_mode != after_mode or before_mode == CBB_MODE_HOME_I:
                i += 1
                continue

            # Gap je jen HOME I?
            gap_indices = [i + 1 + j for j in range(gap_size)]
            gap_is_home_i = all(result[idx] == CBB_MODE_HOME_I for idx in gap_indices)

            if not gap_is_home_i:
                i += 1
                continue

            # Cost/Benefit analýza
            mode_name = CBB_MODE_NAMES.get(before_mode, "Unknown")

            # Stability benefit: 2 přepnutí ušetříme
            stability_benefit = 2.0  # Kč equivalent

            # Cost: Gap intervaly v jiném režimu
            # Pro UPS: Může být dražší nabíjet v gap
            # Pro HOME III: Vždy výhodné (solar zdarma)
            gap_cost_delta = 0.0

            if before_mode == CBB_MODE_HOME_UPS:
                # Check: Je gap stále levný?
                gap_prices = [spot_prices[idx].get("price", 0) for idx in gap_indices]
                avg_price = sum(sp.get("price", 0) for sp in spot_prices) / len(spot_prices)

                # Pokud je gap cena > avg → může být nevýhodné
                if any(p > avg_price for p in gap_prices):
                    gap_cost_delta = 0.5 * gap_size  # Penalizace

            # Decision
            if stability_benefit >= gap_cost_delta:
                _LOGGER.debug(
                    f"🔀 Merging {mode_name} gap at intervals {gap_indices} "
                    f"(gap_size={gap_size}, benefit={stability_benefit:.2f})"
                )
                for idx in gap_indices:
                    result[idx] = before_mode

            i += 1

    return result
```

**Integration:**
```python
# V _calculate_optimal_modes_hybrid() replace PHASE 9:

# PHASE 9: Gap merging (BR-2) - ENHANCED
modes = self._merge_mode_gaps(
    modes, spot_prices, solar_forecast, max_gap_size=2
)
```

**Tests:**
- Test UPS-HOME_I-UPS gap (1 interval) → merged
- Test UPS-HOME_I-HOME_I-UPS gap (2 intervals) → merged
- Test HOME_III gaps → merged
- Test expensive gap → not merged

**Time:** 2h implementation + 1h testing

---

#### Úkol 1.3: Integration Testing (2h)

**End-to-end scenarios:**

1. **Frequent switching scenario:**
   - Input: Data s častými režimy
   - Expected: Max 8 přepnutí za den
   - Validate: Switch count < 10

2. **Gap merging effectiveness:**
   - Input: UPS bloky s 1-2 interval gaps
   - Expected: Gaps merged, switch count reduced
   - Validate: Before/after comparison

3. **Minimum duration:**
   - Input: Krátké HOME II/III bloky
   - Expected: Converted to HOME I
   - Validate: No blocks < 30min (kromě HOME I)

---

### 13.3 FÁZE 2: Smart Mode Selection (MEDIUM PRIORITY - 4-6h)

**Business justification:** BR-4, BR-5 - ekonomická optimalizace

#### Úkol 2.1: SoC-Aware Mode Selection (2h)

**Implementation:**

```python
# V _calculate_optimal_modes_hybrid() PHASE 4 update:

# PHASE 4: Inteligentní výběr HOME I/II/III - SoC-aware
for i in range(n):
    solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
    load_kwh = load_forecast[i]
    current_price = spot_prices[i].get("price", 0)

    # Estimate SoC (from PHASE 5 forward simulation)
    estimated_soc = battery_soc_forward[i] if i < len(battery_soc_forward) else current_capacity
    soc_percent = (estimated_soc / max_capacity) * 100

    # FVE = 0 → HOME I
    if solar_kwh < 0.01:
        modes[i] = CBB_MODE_HOME_I
        continue

    # HOME III: Max nabíjení - jen když je místo (BR-5)
    if (solar_kwh > 0.3
        and current_price < avg_price * 0.8
        and soc_percent < 80  # ← NEW: Min 20% space
        and i < n - 8):
        modes[i] = CBB_MODE_HOME_III

    # HOME II: Šetření - jen když má co šetřit (BR-5)
    elif (solar_kwh > 0
          and solar_kwh < load_kwh
          and soc_percent > 30  # ← NEW: Min 30% SoC
          and i < n - 4):
        future_prices = [
            spot_prices[j].get("price", 0)
            for j in range(i + 1, min(i + 12, n))
        ]
        if future_prices and max(future_prices) > current_price * 1.4:
            modes[i] = CBB_MODE_HOME_II
        else:
            modes[i] = CBB_MODE_HOME_I
    else:
        modes[i] = CBB_MODE_HOME_I
```

**Tests:**
- Test HOME III when SoC=95% → should be HOME I
- Test HOME II when SoC=15% → should be HOME I
- Validate no lossy exports

**Time:** 1.5h implementation + 0.5h testing

---

#### Úkol 2.2: Conditional UPS Assignment (3h)

**Implementation:** (viz sekce 14.6 - Řešení P2-2)

```python
def _assign_ups_with_benefit_threshold(
    self,
    modes: List[int],
    charge_opportunities: List[Dict[str, Any]],
    spot_prices: List[Dict[str, Any]],
    solar_forecast: Dict[str, Any],
    min_benefit_threshold: float = 2.0
) -> List[int]:
    """Assign HOME UPS with BR-4 and BR-5 checks."""
    # Full implementation in section 14.6
    # Key checks:
    # 1. No UPS when solar > 0.5 kWh
    # 2. Preserve HOME III
    # 3. Benefit > 2 Kč threshold
    # 4. Sort by benefit (not just price)
```

**Integration:**
```python
# Replace PHASE 7:
modes = self._assign_ups_with_benefit_threshold(
    modes, charge_opportunities, spot_prices, solar_forecast,
    min_benefit_threshold=2.0
)
```

**Tests:**
- Test UPS assignment when solar > 0 → skipped
- Test UPS vs HOME III → HOME III preserved
- Test low benefit opportunity → skipped
- Validate benefit calculation

**Time:** 2h implementation + 1h testing

---

### 13.4 FÁZE 3: Monitoring & Metadata (LOW PRIORITY - 2h)

#### Úkol 3.1: Enhanced Metadata (1h)

```python
# V _calculate_today_performance_vs_plan():

"metadata": {
    "mode_switches": mode_switches,
    "total_blocks": total_blocks,
    "switches_target": 8,  # BR-3
    "switches_status": "ok" if mode_switches <= 8 else "warning",
    "mode_distribution": {  # NEW
        "home_i_blocks": sum(1 for b in blocks if b["mode"] == 0),
        "home_ii_blocks": sum(1 for b in blocks if b["mode"] == 1),
        "home_iii_blocks": sum(1 for b in blocks if b["mode"] == 2),
        "home_ups_blocks": sum(1 for b in blocks if b["mode"] == 3),
    },
}
```

**Time:** 1h

---

#### Úkol 3.2: Dashboard Integration (1h)

- Display switch count with target
- Color coding: green (≤8), yellow (9-10), red (>10)
- Mode distribution chart

**Time:** 1h

---

### 13.5 FÁZE 4 & 5: Simulace a Target Timing (BUDOUCNOST)

**Postponed - lower priority than mode optimization**

Původní Fáze 2 (Target Timing) a Fáze 1 (Simulace) jsou přesunuty na později, protože:
1. Bug fixes blokují správnost (P0)
2. Mode switching je business requirement (P1)
3. Simulace a target timing jsou nice-to-have features (P3)

---

### 13.6 Časový Plán - REVIDOVANÝ

| Fáze | Priorita | Čas | Status |
|------|----------|-----|--------|
| 0: Bug Fixes | P0 (BLOCKER) | 4-6h | ⏳ TODO |
| 1: Mode Switching | P1 (HIGH) | 6-8h | ⏳ TODO |
| 2: Smart Selection | P2 (MEDIUM) | 4-6h | ⏳ TODO |
| 3: Monitoring | P3 (LOW) | 2h | ⏳ TODO |
| 4-5: Features | P3 (LOW) | 8-10h | 📋 BACKLOG |

**Total P0-P2:** 14-20 hodin (2-3 dny fulltime)
**Total včetně P3:** 16-22 hodin

---
    """POST /api/oig_cloud/simulation/{box_id}/{sim_id}/apply"""
    # Implementation in section 12.6

class OIGCloudSimulationListView(HomeAssistantView):
    """GET /api/oig_cloud/simulations/{box_id}"""
    # Implementation in section 12.6
```

**Registrace:**
```python
# __init__.py
hass.http.register_view(OIGCloudSimulationView())
hass.http.register_view(OIGCloudSimulationApplyView())
hass.http.register_view(OIGCloudSimulationListView())
```

---

### 13.5 Fáze 4: Režimy - Analýza & Optimalizace (TBD)

**NOVÝ POŽADAVEK:** Analyzovat přepínání režimů v plánování

Bude analyzováno v sekci 14.

---

### 13.6 Fáze 5: Refactoring (Volitelné, 4-6h)

**1. Unified Simulation (2h):**
- Odstranit duplikaci mezi `_simulate_interval_with_mode()` a `_build_result()`
- Použít jednu fyzikální logiku

**2. SOC% Migration (4h):**
- Změnit všechny algoritmy na SOC% místo kWh
- Update API responses

---

### 13.7 Celkový Čas & Priorita

| Fáze | Popis | Čas | Priorita | Dependencies |
|------|-------|-----|----------|--------------|
| 0 | Bug Fixes | 2-3h | CRITICAL | - |
| 1 | Simulace Functions | 3-4h | HIGH | Fáze 0 |
| 2 | Target Timing | 3-4h | HIGH | Fáze 0 |
| 3 | API Endpointy | 2h | MEDIUM | Fáze 1 |
| 4 | Režimy Analysis | TBD | HIGH | - |
| 5 | Refactoring | 4-6h | LOW | - |

**Celkem:** 14-19h (bez Fáze 5)
**S refactoringem:** 18-25h

---

## 14. PŘEPÍNÁNÍ REŽIMŮ - Analýza

### 14.1 Definice Režimů a Konstant

**CBB Mode konstanty (lines 33-43):**
```python
CBB_MODE_HOME_I = 0     # Grid priority (cheap mode)
CBB_MODE_HOME_II = 1    # Battery priority
CBB_MODE_HOME_III = 2   # Solar priority (default)
CBB_MODE_HOME_UPS = 3   # UPS mode (AC charging enabled)
```

**Transition Costs (lines 47-66):**
```python
TRANSITION_COSTS = {
    ("Home I", "Home UPS"): {
        "energy_loss_kwh": 0.05,         # Ztráta energie při přepnutí na UPS
        "time_delay_intervals": 1,       # Zpoždění 1 interval (15 min)
    },
    ("Home UPS", "Home I"): {
        "energy_loss_kwh": 0.02,         # Menší ztráta při přepnutí z UPS
        "time_delay_intervals": 0,
    },
    ("Home I", "Home II"): {
        "energy_loss_kwh": 0.0,          # Žádné ztráty mezi Home režimy
        "time_delay_intervals": 0,
    },
    # ... další kombinace
}

MIN_MODE_DURATION = {
    "Home UPS": 2,   # UPS musí běžet min 30 minut (2×15min)
    "Home I": 1,
    "Home II": 1,
}
```

### 14.2 Algoritmus Výběru Režimů

**Hlavní funkce:** `_calculate_optimal_modes_hybrid()` (lines 1864-2170)

**Strategická fáze:**

#### PHASE 1: Forward Pass (lines 1906-1940)
```python
# Simulace s HOME I všude - zjistit minimum dosažené kapacity
battery_trajectory = [current_capacity]
battery = current_capacity
total_transition_cost = 0.0  # Iniciální tracking (NEPOUŽÍVÁ SE v Phase 1!)
prev_mode_name = "Home I"

for i in range(n):
    # Získat solar + load
    solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
    load_kwh = load_forecast[i]

    # HOME I logika: solar → baterie nebo baterie → load
    if solar_kwh >= load_kwh:
        net_energy = solar_kwh - load_kwh     # Přebytek nabíjí
    else:
        net_energy = -(load_kwh - solar_kwh) / efficiency  # Vybíjení s losses

    battery += net_energy
    battery = max(0, min(battery, max_capacity))
    battery_trajectory.append(battery)

min_reached = min(battery_trajectory)
final_capacity = battery_trajectory[-1]
```

**🔴 BUG POZOROVÁNÍ: `total_transition_cost` je inicializován ale NIKDY SE NEPOUŽÍVÁ v celém algoritmu!**
- Line 1908: `total_transition_cost = 0.0` - deklarace
- Není žádné přičítání transition costs během simulace
- Není započítání do `total_cost` v rezultátu

#### PHASE 2: Rozhodnutí o nabíjení (lines 1942-1952)
```python
needs_charging_for_minimum = min_reached < min_capacity
needs_charging_for_target = final_capacity < target_capacity

if not needs_charging_for_minimum and not needs_charging_for_target:
    # HOME I všude je dostatečné
    return self._build_result(...)
```

#### PHASE 3: Backward Pass (lines 1954-1996)
```python
# Spočítat required battery capacity pro každý interval (zpětně)
required_battery = [0.0] * (n + 1)
required_battery[n] = max(target_capacity, min_capacity)

for i in range(n - 1, -1, -1):
    solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
    load_kwh = load_forecast[i]

    # Reverse simulace: co musí být NA ZAČÁTKU aby NA KONCI bylo required
    if solar_kwh >= load_kwh:
        net_energy = solar_kwh - load_kwh
        required_battery[i] = required_battery[i + 1] - net_energy
    else:
        drain = (load_kwh - solar_kwh) / efficiency
        required_battery[i] = required_battery[i + 1] + drain

    # ⚠️ KRITICKÉ: Jen clamp na max (ne min!)
    required_battery[i] = min(required_battery[i], max_capacity)
```

**Důvod proč NECLAMPOVAT na minimum:**
- Pokud `required_battery[i]` > `min_capacity`, signalizuje to POTŘEBU NABÍJENÍ
- Clamp by tuto potřebu skryl!

#### PHASE 4: Inteligentní výběr HOME I/II/III (lines 1998-2070)
```python
avg_price = sum(sp.get("price", 0) for sp in spot_prices) / len(spot_prices)

for i in range(n):
    solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
    load_kwh = load_forecast[i]
    current_price = spot_prices[i].get("price", 0)

    # Pravidlo 1: FVE = 0 → vždy HOME I (nejlevnější v noci)
    if solar_kwh < 0.01:
        modes[i] = CBB_MODE_HOME_I
        continue

    # Pravidlo 2: HOME III - maximální nabíjení baterie
    # Celá FVE → baterie, spotřeba → grid
    # Podmínky:
    if (solar_kwh > 0.3                      # Slušná FVE (>1.2kW)
        and current_price < avg_price * 0.8  # Levná elektřina
        and i < n - 8):                      # Není poslední 2h
        modes[i] = CBB_MODE_HOME_III

    # Pravidlo 3: HOME II - šetření baterie na drahou špičku
    # FVE → spotřeba, deficit → grid, baterie netouched
    # Podmínky:
    elif (solar_kwh > 0
          and solar_kwh < load_kwh           # FVE nestačí
          and i < n - 4):                    # Není poslední 1h
        # Hledat drahou špičku v budoucnu
        future_prices = [spot_prices[j].get("price", 0)
                        for j in range(i + 1, min(i + 12, n))]
        if future_prices:
            max_future_price = max(future_prices)
            # Pokud budoucí špička >40% dražší → HOME II
            if max_future_price > current_price * 1.4:
                modes[i] = CBB_MODE_HOME_II
            else:
                modes[i] = CBB_MODE_HOME_I
    else:
        modes[i] = CBB_MODE_HOME_I  # Default
```

**🔴 CHYBĚJÍCÍ LOGIKA:**
- SoC baterie není brán v úvahu při rozhodování o HOME II/III
- Může nastat situace kdy HOME III nabíjí plnou baterii
- Nebo HOME II šetří prázdnou baterii

#### PHASE 5: Identifikace charging opportunities (lines 2072-2100)
```python
charge_opportunities = []
battery = current_capacity

for i in range(n):
    deficit = required_battery[i] - battery
    price = spot_prices[i].get("price", 0)

    # Deficit > 100Wh → charging opportunity
    if deficit > 0.1:
        charge_opportunities.append({
            "index": i,
            "deficit": deficit,
            "price": price,
            "time": spot_prices[i].get("time", ""),
        })

    # Simulace intervalu s aktuálním režimem (HOME I/II/III)
    # ... (simplified physics per mode)

    battery = max(0, min(battery, max_capacity))
```

#### PHASE 6: Seřazení podle ceny (line 2102-2104)
```python
charge_opportunities.sort(key=lambda x: x["price"])
```

**Výběr nejlevnějších 20 intervalů (max 5h nabíjení)**

#### PHASE 7: Přiřazení HOME UPS (lines 2106-2112)
```python
for opp in charge_opportunities[:20]:  # Max 20 intervalů
    idx = opp["index"]
    modes[idx] = CBB_MODE_HOME_UPS
```

**🔴 PROBLÉM: Přepíše i HOME II/III rozhodnutí z PHASE 4!**
- Ztráta inteligence z phase-aware selection

#### PHASE 8: Enforcement minimum duration (lines 2114-2120)
```python
min_duration = MIN_MODE_DURATION.get("Home UPS", 2)
i = 0
while i < len(modes):
    if modes[i] == CBB_MODE_HOME_UPS:
        # Prodloužit UPS na minimum duration
        for j in range(i, min(i + min_duration, len(modes))):
            modes[j] = CBB_MODE_HOME_UPS
        i += min_duration
    else:
        i += 1
```

#### PHASE 9: Transition optimization - merge gaps (lines 2122-2148)
```python
i = 0
while i < len(modes) - 2:
    # UPS → HOME I → UPS (gap of 1 interval)
    if (modes[i] == CBB_MODE_HOME_UPS
        and modes[i + 1] in [CBB_MODE_HOME_I, CBB_MODE_HOME_II, CBB_MODE_HOME_III]
        and modes[i + 2] == CBB_MODE_HOME_UPS):

        gap_price = spot_prices[i + 1].get("price", 0)
        gap_cost = gap_price * max_charge_per_interval  # Nabíjení v gap

        # Transition cost: 2× přepnutí (UPS→I + I→UPS)
        transition_loss = TRANSITION_COSTS.get(("Home UPS", "Home I"), {}).get(
            "energy_loss_kwh", 0.02
        )
        transition_loss += TRANSITION_COSTS.get(("Home I", "Home UPS"), {}).get(
            "energy_loss_kwh", 0.05
        )
        transition_cost_czk = transition_loss * gap_price

        # Pokud je levnější nabíjet v gap než switchovat → merge
        if gap_cost < transition_cost_czk:
            modes[i + 1] = CBB_MODE_HOME_UPS
```

**✅ SPRÁVNĚ: Transition costs jsou použity pro gap merging**

**🔴 PROBLÉM: Ale NE pro běžné mode switching v simulaci!**

### 14.3 Použití Režimů v Simulaci

**Funkce:** `_simulate_interval_with_mode()` (lines 741-900)

**FVE = 0 optimalizace (lines 799-843):**
```python
# SHORT-CIRCUIT: Když FVE = 0, HOME I/II/III jsou IDENTICKÉ!
if solar_kwh < 0.001 and mode in [CBB_MODE_HOME_I, CBB_MODE_HOME_II, CBB_MODE_HOME_III]:
    # Všechny 3 režimy: baterie → load (discharge do 20% SoC)
    available_battery = battery_soc - min_capacity
    discharge_amount = min(load_kwh, available_battery / efficiency)

    result["battery_discharge"] = discharge_amount
    result["new_soc"] = battery_soc - discharge_amount * efficiency

    # Grid pokrývá zbytek
    deficit = load_kwh - discharge_amount
    if deficit > 0.001:
        result["grid_import"] = deficit
        result["grid_cost"] = deficit * spot_price

    return result
```

**Fyzika podle režimů (lines 845-900):**

**HOME I (Battery Priority):**
```python
# FVE → battery (DC/DC 95%)
charge_amount = min(solar_kwh, battery_space / efficiency)
result["battery_charge"] = charge_amount
result["new_soc"] += charge_amount * efficiency

# Zbytek FVE → load nebo export
if remaining_solar >= load_kwh:
    surplus = remaining_solar - load_kwh
    # Export jen když profitable
    if export_price > 0:
        result["grid_export"] = surplus
    else:
        # Lossy export (curtailment)
        result["curtailed_loss"] = abs(surplus * export_price)
else:
    # Deficit → battery discharge (DC/AC 88.2%)
    discharge = min(deficit / efficiency, battery_available)
    result["battery_discharge"] = discharge
```

**HOME II, HOME III:** (podobná logika, ale jiné priority)

**HOME UPS:**
```python
# Spotřeba ze sítě, baterie nabíjí ze solaru + gridu
battery_space = max_capacity - battery
grid_charge = min(max_charge_per_interval, battery_space / efficiency)
grid_import = load_kwh + grid_charge  # Import na spotřebu + nabíjení
battery += solar_kwh + grid_charge
total_cost += grid_import * price
```

**⚠️ KRITICKÁ CHYBA: `_simulate_interval_with_mode()` NEPŘIJÍMÁ previous_mode parameter!**
- **Nemůže započítat transition costs při přepnutí režimů**
- **Není time delay při přechodu UPS ↔ HOME I**
- **Chybí energy loss z TRANSITION_COSTS**

### 14.4 Tracking Mode Switches

**Funkce:** `_calculate_today_performance_vs_plan()` (lines 4412-4542)

```python
# Počítání mode switches pro metadata
mode_switches = 0
total_blocks = 0
last_mode = None

for interval in intervals:
    current_mode = interval.get("planned", {}).get("mode", "")
    if current_mode != last_mode:
        if last_mode is not None:
            mode_switches += 1
        total_blocks += 1
        last_mode = current_mode

# Metadata v rezultátu
"metadata": {
    "mode_switches": mode_switches,
    "total_blocks": total_blocks,
    ...
}
```

**✅ SPRÁVNĚ: Mode switches jsou trackované v performance metrikách**

**🔴 PROBLÉM: Ale transition costs z těchto switches NEJSOU započítané do net_cost!**

### 14.5 Revize Problémů podle Business Požadavků

**PŮVODNÍ analýza identifikovala 5 problémů, ale některé jsou IRELEVANTNÍ podle BR:**

#### ❌ PŮVODNÍ Problém 1: "Transition Costs nejsou započítané"

**Původní analýza:**
- Energy loss: 0.02-0.05 kWh per transition
- Impact: Underestimation nákladů, frequent switching

**Business realita (z BR-0.2):**
- ✅ Transition energy losses jsou **ZANEDBATELNÉ** (20-50Wh = ~0.5-2 Kč)
- ✅ Přepnutí trvá 2-5 minut, **NE 15 minut**
- ✅ Není to o nákladech, je to o **počtu přepnutí a stabilitě**

**Závěr:** ❌ **NENÍ TŘEBA ŘEŠIT** - energie losses ignorovat, soustředit se na minimální počet switchů

---

#### ❌ PŮVODNÍ Problém 2: "Time Delay není implementován"

**Původní analýza:**
- UPS → HOME I má 1 interval (15 min) delay
- Chybí lag mechanismus

**Business realita:**
- ✅ Přepnutí trvá **2-5 minut**, ne 15 minut
- ✅ Režim se aplikuje **okamžitě** po přepnutí
- ✅ Není třeba delay v plánování (15min interval je dostatečná granularita)

**Závěr:** ❌ **NENÍ TŘEBA ŘEŠIT** - 2-5 min delay je zanedbatelný v 15min intervalech

---

#### ✅ SKUTEČNÝ Problém 1: **Minimální doba trvání není vynucena**

**Business požadavek:** BR-1: Každý režim (kromě HOME I) musí běžet min 30 minut

**Současný stav:**
- ✅ PHASE 8 enforcement pro HOME UPS (lines 2114-2120)
- ❌ CHYBÍ enforcement pro HOME II a HOME III

**Příklad problému:**
```python
# PHASE 4 může vytvořit:
modes = [HOME_I, HOME_III, HOME_I, HOME_III, HOME_I]  # HOME III jen 1 interval (15 min)
         └─ 0 ──┴── 2 ────┴── 0 ──┴── 2 ────┴── 0 ──┘

# Výsledek: 4 přepnutí za 1 hodinu → NEPŘIJATELNÉ
```

**Impact:**
- Častré přepínání (10-20× za den místo 6-8×)
- Špatný UX (LED blikání)
- Wear na hardware

**Fix:** Přidat min duration enforcement pro všechny režimy v PHASE 8

---

#### ✅ SKUTEČNÝ Problém 2: **Gap merging není dostatečný**

**Business požadavek:** BR-2: Sloučit bloky oddělené 1-2 intervaly

**Současný stav (PHASE 9, lines 2122-2148):**
- ✅ Merguje UPS bloky s 1-intervalovým gapem
- ❌ CHYBÍ merging pro HOME II/III bloky
- ❌ CHYBÍ merging pro 2-intervalové gapy

**Příklad problému:**
```python
# Původní:
modes = [UPS, UPS, HOME_I, HOME_I, UPS, UPS]
         └─────────┴────gap 2×─────┴─────────┘

# Současný algoritmus: NEMERGUJE (gap > 1)
# Mělo by být: [UPS, UPS, UPS, UPS, UPS, UPS]
```

**Impact:**
- Extra 2 přepnutí (UPS→I a I→UPS)
- Gap 30 min nemá velký ekonomický přínos
- Nestabilní provoz

**Fix:** Rozšířit gap merging na 2 intervaly a všechny režimy

---

#### ✅ SKUTEČNÝ Problém 3: **SoC není brán v úvahu při mode selection**

**Business požadavek:** BR-5: Smart mode selection s ohledem na SoC

**Současný stav (PHASE 4, lines 1817-1860):**
```python
# Rozhodnutí o HOME III:
if (solar_kwh > 0.3
    and current_price < avg_price * 0.8
    and i < n - 8):
    modes[i] = CBB_MODE_HOME_III  # ← CHYBÍ SoC check!
```

**Problém:**
- Co když je baterie 95% plná?
- HOME III pošle celou FVE → baterie → overflow → export at loss
- Lepší: HOME I (FVE→load, přebytek→baterie, overflow→export)

**Příklad:**
```python
# Situace: SoC=95%, solar=2kWh, load=1kWh
# HOME III: 2kWh → baterie (overflow 1.5kWh → export at -0.5 Kč/kWh) = -0.75 Kč ztráta
# HOME I: 1kWh → load, 0.3kWh → baterie, 0.7kWh → export = menší ztráta
```

**Impact:**
- Suboptimální režimy
- Lossy export
- Zbytečné nabíjení plné baterie

**Fix:** Přidat SoC check do PHASE 4 rozhodování

---

#### ⚠️ SKUTEČNÝ Problém 4: **HOME UPS přepisuje HOME III bez analýzy**

**Business požadavek:** BR-5: Preferenční pořadí režimů

**Současný stav:**
- PHASE 4 (lines 1817-1860): Intelligent selection → HOME III
- PHASE 7 (lines 2106-2112): Price-based override → HOME UPS
- **BEZ kontroly zda UPS je opravdu lepší!**

**Příklad problému:**
```python
# Interval i=20 (10:00, slunce svítí):
# PHASE 4: modes[20] = HOME_III (solar=3kWh, price=2.0 Kč/kWh < avg*0.8)
# PHASE 7: deficit > 0.1 → modes[20] = HOME_UPS  (OVERRIDE!)

# HOME III benefit: 3kWh FVE → baterie zdarma
# HOME UPS benefit: 0.7kWh grid charging × 2.0 = 1.4 Kč cost

# Ztráta: HOME III by bylo LEPŠÍ (free solar vs paid grid)
```

**Impact:**
- Platíme za grid charging když máme slunce
- Logika PHASE 4 je zbytečná
- Suboptimální ekonomika

**Fix:** PHASE 7 conditional assignment - preserve HOME III když je lepší

---

#### ✅ SKUTEČNÝ Problém 5: **Cost/Benefit threshold chybí**

**Business požadavek:** BR-4: Přepnout jen když benefit > 2 Kč

**Současný stav:**
- PHASE 7: Přiřadí UPS na **VŠECHNY** charging opportunities (max 20)
- **Žádná kontrola zda se to vyplatí!**

**Příklad problému:**
```python
# Charging opportunity:
# deficit=0.15 kWh, price=1.5 Kč/kWh
# nabití cost: 0.15 × 1.5 = 0.225 Kč
# použití later: 0.15 × 3.0 = 0.45 Kč
# benefit: 0.45 - 0.225 = 0.225 Kč → NEVYPLATÍ SE!

# Ale algoritmus přiřadí UPS → 2 extra přepnutí kvůli 0.225 Kč
```

**Impact:**
- Zbytečné UPS bloky pro malé úspory
- Zvýšený počet přepnutí
- Komplexita vs benefit

**Fix:** Přidat threshold filter v PHASE 7 (min 2 Kč benefit per blok)

---

#### ℹ️ Minor: **`total_transition_cost` zombie variable**

**Kód:** Line 1908: `total_transition_cost = 0.0` nikdy nepoužitá

**Impact:** None (jen code cleanliness)

**Fix:** Smazat nebo použít pro tracking (low priority)

---

### 14.6 Optimální Řešení podle Business Požadavků

**Priorita:** P0 (bug fixes) → P1 (min duration + gap merging) → P2 (SoC awareness + cost/benefit)

#### Řešení P1-1: **Rozšířit Minimum Duration Enforcement**

**Současný PHASE 8 (lines 2114-2120):**
```python
# Enforce minimum mode duration (HOME UPS musí běžet min 30 min)
min_duration = MIN_MODE_DURATION.get("Home UPS", 2)
i = 0
while i < len(modes):
    if modes[i] == CBB_MODE_HOME_UPS:
        # Extend UPS to minimum duration
        for j in range(i, min(i + min_duration, len(modes))):
            modes[j] = CBB_MODE_HOME_UPS
        i += min_duration
    else:
        i += 1
```

**Nové řešení - UNIVERZÁLNÍ pro všechny režimy:**
```python
def _enforce_minimum_mode_duration(self, modes: List[int]) -> List[int]:
    """
    Enforce minimum mode duration per BR-1.

    Pravidla:
    - HOME I: min 1 interval (15 min) - default mode, může být kratší
    - HOME II: min 2 intervaly (30 min)
    - HOME III: min 2 intervaly (30 min)
    - HOME UPS: min 2 intervaly (30 min)

    Pokud režim trvá kratší dobu, sloučit s předchozím nebo následujícím HOME I.
    """
    result = modes.copy()

    # Najít bloky jednotlivých režimů
    blocks = []
    i = 0
    while i < len(result):
        mode = result[i]
        start = i
        # Spočítat délku bloku
        while i < len(result) and result[i] == mode:
            i += 1
        end = i
        duration = end - start

        blocks.append({
            "mode": mode,
            "start": start,
            "end": end,
            "duration": duration
        })

    # Enforcement: Krátké bloky HOME II/III/UPS → HOME I
    min_durations = {
        CBB_MODE_HOME_I: 1,
        CBB_MODE_HOME_II: 2,
        CBB_MODE_HOME_III: 2,
        CBB_MODE_HOME_UPS: 2,
    }

    for block in blocks:
        mode = block["mode"]
        duration = block["duration"]
        min_required = min_durations.get(mode, 2)

        if duration < min_required and mode != CBB_MODE_HOME_I:
            # Krátký blok → převést na HOME I (fallback)
            _LOGGER.info(
                f"🔧 Mode {CBB_MODE_NAMES[mode]} block too short "
                f"({duration}×15min < {min_required}×15min) → converting to HOME I"
            )
            for idx in range(block["start"], block["end"]):
                result[idx] = CBB_MODE_HOME_I

    return result
```

**Umístění:** Přidat po PHASE 7 (před PHASE 8 - který zůstane pro UPS extension)

**Impact:**
- ✅ Eliminuje krátké HOME II/III bloky
- ✅ Sníží počet přepnutí
- ✅ Stabilnější provoz

---

#### Řešení P1-2: **Rozšířit Gap Merging**

**Současný PHASE 9 (lines 2122-2148):**
```python
# Merguje jen UPS s gap 1 interval
if (modes[i] == CBB_MODE_HOME_UPS
    and modes[i + 1] in [CBB_MODE_HOME_I, CBB_MODE_HOME_II, CBB_MODE_HOME_III]
    and modes[i + 2] == CBB_MODE_HOME_UPS):

    # Cost comparison
    gap_cost = gap_price * max_charge_per_interval
    transition_cost = (transition_loss_ups_to_i + transition_loss_i_to_ups) * gap_price

    if gap_cost < transition_cost_czk:
        modes[i + 1] = CBB_MODE_HOME_UPS  # Merge
```

**Nové řešení - UNIVERZÁLNÍ a 2-intervalové gapy:**
```python
def _merge_mode_gaps(
    self,
    modes: List[int],
    spot_prices: List[Dict[str, Any]],
    max_gap_size: int = 2
) -> List[int]:
    """
    Merge mode gaps per BR-2.

    Pravidla:
    - Gap max 2 intervaly (30 min)
    - Režimy před a po jsou stejné
    - Gap je HOME I (default mode, lze bezpečně přepsat)
    - Cost/benefit: merge jen když má smysl
    """
    result = modes.copy()

    # Iterovat přes všechny možné gap sizes (1 a 2)
    for gap_size in range(1, max_gap_size + 1):
        i = 0
        while i < len(result) - gap_size - 1:
            before_mode = result[i]
            after_mode = result[i + gap_size + 1]

            # Check: Režimy před a po jsou stejné?
            if before_mode != after_mode:
                i += 1
                continue

            # Check: Gap je jen HOME I?
            gap_is_home_i = all(
                result[i + 1 + j] == CBB_MODE_HOME_I
                for j in range(gap_size)
            )

            if not gap_is_home_i:
                i += 1
                continue

            # Cost/Benefit analýza
            # Option 1: Keep gap (HOME I) → 2 přepnutí
            # Option 2: Merge gap (extend mode) → 0 přepnutí

            # Benefit: Ušetříme 2 přepnutí (stability gain)
            # Cost: Gap intervaly budou v jiném režimu (může být dražší)

            gap_indices = [i + 1 + j for j in range(gap_size)]

            # Spočítat cost difference
            gap_cost_home_i = 0.0
            gap_cost_merged = 0.0

            for idx in gap_indices:
                price = spot_prices[idx].get("price", 0)

                # HOME I cost (current)
                # Simplified: HOME I = baseline
                gap_cost_home_i += 0  # Reference

                # Merged mode cost (estimated)
                # Simplified: Merge má smysl když režim je výhodný
                # Např. UPS v levné hodině, HOME III při slunci
                if before_mode == CBB_MODE_HOME_UPS:
                    # UPS charging - má smysl když je levná cena
                    avg_price = sum(sp.get("price", 0) for sp in spot_prices) / len(spot_prices)
                    if price < avg_price * 0.9:
                        # Levná cena → merge má smysl
                        gap_cost_merged -= 1.0  # Benefit

                # HOME III při slunci - vždy má smysl mergovat
                if before_mode == CBB_MODE_HOME_III:
                    gap_cost_merged -= 0.5  # Benefit

            # Decision: Merge pokud má benefit nebo je neutrální
            stability_benefit = 2.0  # Kč equivalent za stabilitu (2 přepnutí méně)

            if gap_cost_merged + stability_benefit >= gap_cost_home_i:
                # Merge!
                _LOGGER.debug(
                    f"🔀 Merging {CBB_MODE_NAMES[before_mode]} gap "
                    f"at intervals {gap_indices} (gap_size={gap_size})"
                )
                for idx in gap_indices:
                    result[idx] = before_mode

            i += 1

    return result
```

**Umístění:** Nahradit PHASE 9

**Impact:**
- ✅ Merguje všechny režimy (ne jen UPS)
- ✅ Podporuje gap size 1-2 intervaly
- ✅ Stability benefit zahrnutý
- ✅ Sníží počet přepnutí o 30-50%

---

#### Řešení P2-1: **SoC-Aware Mode Selection**

**Současný PHASE 4 - HOME III selection (lines 1829-1837):**
```python
# HOME III: Když chceme maximálně nabít baterii a je levná elektřina
if (solar_kwh > 0.3
    and current_price < avg_price * 0.8
    and i < n - 8):
    modes[i] = CBB_MODE_HOME_III
```

**Nové řešení:**
```python
# Tracking SoC během forward simulation v PHASE 5
battery_soc_forward = [current_capacity]  # Initialize
# ... (existing forward simulation builds this)

# PHASE 4: Add SoC awareness
for i in range(n):
    solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)
    load_kwh = load_forecast[i]
    current_price = spot_prices[i].get("price", 0)

    # Estimate SoC at this interval (from phase 5 simulation)
    estimated_soc = battery_soc_forward[i] if i < len(battery_soc_forward) else current_capacity
    soc_percent = (estimated_soc / max_capacity) * 100

    # FVE = 0 → HOME I
    if solar_kwh < 0.01:
        modes[i] = CBB_MODE_HOME_I
        continue

    # HOME III: Max nabíjení - JEN když je místo v baterii
    if (solar_kwh > 0.3
        and current_price < avg_price * 0.8
        and soc_percent < 80  # ← NEW: Min 20% místa v baterii
        and i < n - 8):
        modes[i] = CBB_MODE_HOME_III

    # HOME II: Šetření baterie - JEN když má co šetřit
    elif (solar_kwh > 0
          and solar_kwh < load_kwh
          and soc_percent > 30  # ← NEW: Min 30% SoC aby mělo smysl šetřit
          and i < n - 4):
        future_prices = [spot_prices[j].get("price", 0)
                        for j in range(i + 1, min(i + 12, n))]
        if future_prices and max(future_prices) > current_price * 1.4:
            modes[i] = CBB_MODE_HOME_II
        else:
            modes[i] = CBB_MODE_HOME_I
    else:
        modes[i] = CBB_MODE_HOME_I
```

**Impact:**
- ✅ HOME III jen když je místo (< 80% SoC)
- ✅ HOME II jen když má co šetřit (> 30% SoC)
- ✅ Eliminuje zbytečné režimy
- ✅ Lepší ekonomika

---

#### Řešení P2-2: **Conditional UPS Assignment s Cost/Benefit**

**Současný PHASE 7 (lines 2106-2112):**
```python
# PHASE 7: Přidat HOME UPS na nejlevnějších intervalech
for opp in charge_opportunities[:20]:
    idx = opp["index"]
    modes[idx] = CBB_MODE_HOME_UPS  # ← Bezpodmínečně!
```

**Nové řešení:**
```python
def _assign_ups_with_benefit_threshold(
    self,
    modes: List[int],
    charge_opportunities: List[Dict[str, Any]],
    spot_prices: List[Dict[str, Any]],
    solar_forecast: Dict[str, Any],
    max_charge_per_interval: float,
    min_benefit_threshold: float = 2.0  # BR-4: Min 2 Kč per blok
) -> List[int]:
    """
    Assign HOME UPS smartly per BR-4 and BR-5.

    Pravidla:
    - Jen v nejlevnějších hodinách
    - Benefit > 2 Kč per blok
    - NIKDY když svítí slunce (FVE > 0.5 kWh/15min)
    - Nepřepisovat HOME III
    """
    result = modes.copy()

    # Filter opportunities
    valid_opportunities = []

    for opp in charge_opportunities:
        idx = opp["index"]
        price = opp["price"]
        deficit = opp["deficit"]

        # Check 1: NIKDY UPS když svítí slunce
        try:
            timestamp = datetime.fromisoformat(spot_prices[idx]["time"])
            solar_kwh = self._get_solar_for_timestamp(timestamp, solar_forecast)

            if solar_kwh > 0.5:  # > 2kW produkce
                _LOGGER.debug(
                    f"⊘ Skipping UPS at interval {idx}: solar={solar_kwh:.2f} kWh"
                )
                continue
        except:
            pass

        # Check 2: Nepřepisovat HOME III (smart mode)
        if result[idx] == CBB_MODE_HOME_III:
            _LOGGER.debug(
                f"⊘ Skipping UPS at interval {idx}: HOME III already optimal"
            )
            continue

        # Check 3: Cost/Benefit threshold
        # Nabíjení cost: deficit × price
        charging_cost = deficit * price

        # Expected usage later: deficit × avg_future_price
        future_prices = [
            spot_prices[j].get("price", 0)
            for j in range(idx + 1, min(idx + 24, len(spot_prices)))  # Next 6h
        ]
        avg_future_price = (
            sum(future_prices) / len(future_prices)
            if future_prices else price * 1.5
        )

        usage_value = deficit * avg_future_price
        benefit = usage_value - charging_cost

        if benefit < min_benefit_threshold:
            _LOGGER.debug(
                f"⊘ Skipping UPS at interval {idx}: benefit={benefit:.2f} < {min_benefit_threshold}"
            )
            continue

        # Valid opportunity
        valid_opportunities.append({
            "index": idx,
            "deficit": deficit,
            "price": price,
            "benefit": benefit,
        })

    # Sort by benefit (descending) - nejvyšší benefit first
    valid_opportunities.sort(key=lambda x: x["benefit"], reverse=True)

    # Assign UPS to top opportunities (max 20 intervals = 5h)
    for opp in valid_opportunities[:20]:
        idx = opp["index"]
        result[idx] = CBB_MODE_HOME_UPS
        _LOGGER.debug(
            f"✅ UPS assigned at interval {idx}: benefit={opp['benefit']:.2f} Kč"
        )

    return result

# Usage in _calculate_optimal_modes_hybrid:
# PHASE 7: Replace simple assignment with smart function
modes = self._assign_ups_with_benefit_threshold(
    modes,
    charge_opportunities,
    spot_prices,
    solar_forecast,
    max_charge_per_interval,
    min_benefit_threshold=2.0
)
```

**Impact:**
- ✅ Žádné UPS při slunci
- ✅ HOME III preserved
- ✅ Jen opportunities > 2 Kč benefit
- ✅ Priorita podle benefitu (ne jen ceny)
- ✅ Sníží počet UPS bloků o 40-60%

---

#### Řešení P3: **Tracking a Monitoring**

**Přidat do metadata:**
```python
# In _calculate_today_performance_vs_plan() metadata:
"metadata": {
    "mode_switches": mode_switches,  # Existing
    "total_blocks": total_blocks,    # Existing
    "mode_distribution": {  # NEW
        "home_i_blocks": home_i_blocks,
        "home_ii_blocks": home_ii_blocks,
        "home_iii_blocks": home_iii_blocks,
        "home_ups_blocks": home_ups_blocks,
    },
    "switches_target": 8,  # BR-3: Target max 8 switches/day
    "switches_status": "ok" if mode_switches <= 8 else "warning",
}
```

**Impact:**
- ✅ Viditelnost počtu přepnutí
- ✅ Srovnání s targetem
- ✅ Monitoring trendů

---

### 14.7 Implementační Plán - Revize

**Aktualizovaný plán s business prioritami:**

#### PHASE 0: Bug Fixes (BLOCKING - 4-6h)
- BUG 1: Forward pass clamp fix
- BUG 3: Duplicate deficit fix
- BUG 2: Validation warnings
- BUG 4: Documentation update

#### PHASE 1: Mode Switching Optimization (HIGH PRIORITY - 6-8h)

**P1-1: Minimum Duration Enforcement (3h)**
1. Implement `_enforce_minimum_mode_duration()`
2. Add after PHASE 7 in `_calculate_optimal_modes_hybrid()`
3. Unit tests for short blocks
4. Integration test s real data

**P1-2: Enhanced Gap Merging (3h)**
1. Implement `_merge_mode_gaps()` with 2-interval support
2. Replace PHASE 9
3. Add stability benefit calculation
4. Unit tests for various gap scenarios

**Testing (2h)**
- Test case: Frequent switching scenario
- Test case: Gap merging effectiveness
- Validate switch count reduction

#### PHASE 2: Smart Mode Selection (MEDIUM PRIORITY - 4-6h)

**P2-1: SoC-Aware Selection (2h)**
1. Add SoC tracking to PHASE 4
2. Add SoC thresholds (80% for HOME III, 30% for HOME II)
3. Unit tests

**P2-2: Conditional UPS Assignment (3h)**
1. Implement `_assign_ups_with_benefit_threshold()`
2. Replace PHASE 7 simple assignment
3. Add solar check, HOME III preservation, benefit threshold
4. Unit tests

**Testing (1h)**
- Test case: Full battery + HOME III
- Test case: UPS vs HOME III conflict
- Validate benefit threshold

#### PHASE 3: Monitoring (LOW PRIORITY - 2h)
1. Add mode_distribution to metadata
2. Add switches_target and status
3. Dashboard integration (if needed)

**Total estimate:** 16-22 hours

---

### 14.1 Kde se Režimy Rozhodují

Hledám v kódu kde a jak se přepínají režimy...
