# Analýza: Mode Recommendations a Battery Balancer - Práce s Kapacitou

**Datum:** 1. listopadu 2025
**Účel:** Analýza jak Mode Recommendations a Battery Balancer pracují s kapacitou baterie

---

## 1. MODE RECOMMENDATIONS

### 1.1 Vstupní Data

**Zdroj:** `_create_mode_recommendations()` (řádky 1389-1650)

```python
def _create_mode_recommendations(
    self,
    optimal_timeline: List[Dict[str, Any]],  # ← Timeline z HYBRID optimalizace
    hours_ahead: int = 48
) -> List[Dict[str, Any]]:
```

**Co přijímá:**
- `optimal_timeline` z HYBRID algoritmu (`_calculate_optimal_modes_hybrid()`)
- Timeline obsahuje: `mode`, `mode_name`, `time`, `battery_soc`, `net_cost`, atd.

### 1.2 Jak Pracuje s Kapacitou

**ŽÁDNÁ PŘÍMÁ PRÁCE S KAPACITOU!**

Mode Recommendations:
1. ✅ **Přebírá** hotový timeline z HYBRID optimalizace
2. ✅ **Seskupuje** po sobě jdoucí intervaly se stejným režimem
3. ✅ **Agreguje** metriky (avg_spot_price, total_cost, savings_vs_home_i)
4. ✅ **Generuje** lidsky čitelné vysvětlení (`rationale`)

**Klíčové:**
```python
# Mode recommendations NEOPTIMALIZUJÍ, jen PREZENTUJÍ
for interval in future_intervals:
    mode = interval.get("mode")           # ← Z HYBRID výsledku
    battery_soc = interval.get("battery_soc")  # ← Z HYBRID simulace
    net_cost = interval.get("net_cost")   # ← Z HYBRID výpočtu
```

**Výstup:**
```json
{
  "mode": 0,
  "mode_name": "HOME I",
  "from_time": "2025-11-01T17:00:00",
  "to_time": "2025-11-01T20:45:00",
  "duration_hours": 3.75,
  "intervals_count": 15,
  "total_cost": 0.0,
  "savings_vs_home_i": 0.0,
  "rationale": "Vybíjíme baterii pro pokrytí spotřeby (FVE=0)..."
}
```

### 1.3 Závislost na HYBRID Algoritmu

**Kritická vazba:**
```python
# battery_forecast.py, řádek ~580
self._mode_optimization_result = self._calculate_optimal_modes_hybrid(
    current_capacity=current_capacity,
    max_capacity=max_capacity,
    min_capacity=min_capacity,      # ← USER MINIMUM!
    target_capacity=target_capacity, # ← TARGET SOC!
    spot_prices=spot_prices,
    export_prices=export_prices,
    solar_forecast=solar_forecast,
    load_forecast=load_forecast,
)

# Řádek ~615
optimal_timeline = self._mode_optimization_result.get("optimal_timeline", [])

# Řádek ~1389
recommendations = self._create_mode_recommendations(optimal_timeline)
```

**Pokud HYBRID nedodržuje min_capacity → Mode Recommendations zobrazí ŠPATNÁ doporučení!**

---

## 2. BATTERY BALANCER

### 2.1 Co Je Battery Balancer

**Účel:** Pravidelné nabíjení baterie na 100% pro udržení zdraví buněk (cell balancing).

**Konfigurace (config_flow.py):**
```python
"balancing_enabled": True,                    # Povolit balancing?
"balancing_interval_days": 7,                 # Každých 7 dní
"balancing_hold_hours": 3,                    # Držet 100% po 3 hodiny
"balancing_opportunistic_threshold": 1.1,     # Levná elektřina < 1.1 Kč/kWh
"balancing_economic_threshold": 2.5,          # Drahá elektřina > 2.5 Kč/kWh
```

### 2.2 Jak Funguje

**Krok 1: Detekce Potřeby Balancingu**
```python
# Separate sensor: battery_balancing.py
# Kontroluje:
# - Uplynulo 7 dní od posledního balancingu?
# - Je levná elektřina (<1.1 Kč/kWh) v příštích 48h?
# - Pokud ANO → vytvoří balancing plan
```

**Krok 2: Vytvoření Plánu**
```python
planned = {
    "reason": "scheduled",  # nebo "opportunistic"
    "holding_start": "2025-11-02T02:00:00",
    "holding_end": "2025-11-02T05:00:00",
    "required_soc": 100.0,  # ← VŽDY 100%!
}
```

**Krok 3: Předání do Battery Forecast**
```python
# battery_forecast.py, řádek ~522
balancing_plan = self._get_balancing_plan()

if balancing_plan:
    _LOGGER.info(
        f"Balancing plan: {balancing_plan.get('reason')} "
        f"from {balancing_plan.get('holding_start')} "
        f"to {balancing_plan.get('holding_end')}"
    )
```

### 2.3 Integrace s Timeline Výpočtem

**DEPRECATED:** Starý systém používal `balancing_plan` parametr:
```python
def _calculate_timeline(
    self,
    ...
    balancing_plan: Optional[Dict[str, Any]] = None,  # DEPRECATED!
):
```

**NOVÝ SYSTÉM:** Používá `self._active_charging_plan`:
```python
# battery_forecast.py, řádek ~177
self._active_charging_plan: Optional[Dict[str, Any]] = None

# Načtení z perzistence (řádek ~193)
if plan_json:
    self._active_charging_plan = json.loads(plan_json)
```

### 2.4 Vliv na HYBRID Optimalizaci

**OTÁZKA:** Jak balancing ovlivňuje HYBRID algoritmus?

**ODPOVĚĎ:** **PŘÍMO NIJAK!**

**Analýza kódu:**
```python
# _calculate_optimal_modes_hybrid() (řádky 1824-2170)
# PARAMETRY:
def _calculate_optimal_modes_hybrid(
    self,
    current_capacity: float,
    max_capacity: float,
    min_capacity: float,        # ← User minimum (33%)
    target_capacity: float,      # ← Target (80%)
    spot_prices: List[Dict[str, Any]],
    export_prices: List[Dict[str, Any]],
    solar_forecast: Dict[str, Any],
    load_forecast: List[float],
) -> Dict[str, Any]:

# ❌ ŽÁDNÝ balancing_plan parametr!
# ❌ ŽÁDNÝ self._active_charging_plan check!
# ❌ ŽÁDNÁ logika pro 100% SOC balancing!
```

**Závěr:**
- HYBRID pracuje s `target_capacity` (80% default)
- Balancing plánuje 100% SOC
- **ROZPOR:** HYBRID neví o balancing požadavku!

### 2.5 Kde Se Balancing Aplikuje?

**Hledání v kódu:**
```python
# Grep výsledky:
# - _active_charging_plan se načítá (řádek 193)
# - Ukládá se do attributes (řádek 350)
# - Předává se do _calculate_timeline (řádek 636)
```

**Zjištění:**
```python
# _calculate_timeline() (řádek ~2700)
def _calculate_timeline(
    ...
    balancing_plan: Optional[Dict[str, Any]] = None,  # DEPRECATED
    ...
):
    # POUŽITÍ balancing_plan v kódu:
    # ❌ NIKDE! Je to jen parametr pro backward compatibility!
```

**PROBLÉM:** Balancing plan se **IGNORUJE**!

### 2.6 Jak By Měl Balancing Fungovat

**Správný Flow:**

1. **Battery Balancing Sensor** vytvoří plán:
   ```python
   {
     "holding_start": "2025-11-02T02:00:00",
     "holding_end": "2025-11-02T05:00:00",
     "required_soc": 100.0  # ← MUSÍ dosáhnout 100%
   }
   ```

2. **HYBRID Algoritmus** by měl:
   ```python
   # PHASE 0: Check balancing requirement
   if self._active_charging_plan:
       holding_start = datetime.fromisoformat(
           self._active_charging_plan.get("holding_start")
       )
       required_soc = self._active_charging_plan.get("required_soc", 100.0)

       # Override target_capacity!
       target_capacity = max_capacity * (required_soc / 100.0)

       _LOGGER.info(
           f"🔋 Balancing mode: Targeting {required_soc}% "
           f"({target_capacity:.2f} kWh) by {holding_start}"
       )
   ```

3. **Backward Pass** musí respektovat:
   ```python
   # Místo:
   required_battery[n] = max(target_capacity, min_capacity)

   # Správně:
   if balancing_active:
       required_battery[n] = max_capacity  # 100% SOC!
   else:
       required_battery[n] = max(target_capacity, min_capacity)
   ```

### 2.7 Současný Stav - CO NEFUNGUJE

**❌ BUG:** Balancing plan se IGNORUJE v HYBRID optimalizaci!

**Důkaz:**
1. `_active_charging_plan` se načítá z persistence ✅
2. Ukládá se do sensor attributes ✅
3. **ALE**: `_calculate_optimal_modes_hybrid()` ho NEPOUŽÍVÁ ❌
4. HYBRID optimalizuje jen na `target_capacity` (80%) ❌
5. Balancing požadavek (100%) se NEZOHLEDŇUJE ❌

**Důsledek:**
- Balancing sensor říká: "Nabij na 100% v 02:00-05:00"
- HYBRID algoritmus: "Nabiju na 80% (target_capacity)"
- **Baterie se NENABIJE na 100%!**
- **Balancing SELHÁVÁ!**

---

## 3. POST-PROCESSING: _enforce_min_capacity_constraint

### 3.1 Účel

**Řádky 2555-2720:** Oprava timeline aby NIKDY neklesl pod `min_capacity`.

```python
def _enforce_min_capacity_constraint(
    self,
    optimal_timeline: List[Dict[str, Any]],
    optimal_modes: List[int],
    min_capacity: float,      # ← USER MINIMUM (33%)
    max_capacity: float,
    spot_prices: List[Dict[str, Any]],
    ...
) -> tuple[List[Dict[str, Any]], List[int]]:
```

### 3.2 Algoritmus

**Iterativní oprava:**
1. Simuluj timeline s HYBRID módy
2. Najdi PRVNÍ interval kde `battery_soc < min_capacity`
3. Vrať se ZPĚT, najdi nejlevnější intervaly PŘED porušením
4. Změň je na HOME UPS (nabíjení ze sítě)
5. OPAKUJ dokud žádné porušení neexistuje (max 10 iterací)

**Kód:**
```python
while iteration < MAX_ITERATIONS:
    # Simuluj timeline
    for i, (timeline_point, mode) in enumerate(zip(optimal_timeline, optimal_modes)):
        sim_result = self._simulate_interval_with_mode(
            mode=mode,
            solar_kwh=solar_kwh,
            load_kwh=load_kwh,
            battery_soc=battery_soc,
            max_capacity=max_capacity,
            min_capacity=min_capacity,  # ← Pro info, ale nespolehlivé
            spot_price=spot_price,
            export_price=export_price,
        )

        battery_soc = sim_result["new_soc"]

        # Najdi porušení
        if battery_soc < min_capacity:
            violation_index = i
            break

    # Pokud žádné porušení → HOTOVO
    if violation_index is None:
        break

    # Spočítej deficit
    deficit_kwh = min_capacity - battery_soc

    # Najdi nejlevnější intervaly PŘED porušením
    # Změň je na HOME UPS
    for candidate in candidates[:intervals_needed]:
        optimal_modes[candidate["index"]] = CBB_MODE_HOME_UPS
```

### 3.3 Práce s Kapacitou

**Klíčové:**
```python
# 1. Použije min_capacity pro detekci porušení ✅
if battery_soc < min_capacity:
    violation_index = i

# 2. Počítá deficit = kolik chybí do min_capacity ✅
deficit_kwh = min_capacity - battery_soc

# 3. Nabíjení: HOME UPS charge_per_interval = 0.7 kWh ✅
intervals_needed = int(np.ceil(deficit_kwh / 0.7))

# 4. Validace: Pokud se nepodaří opravit → ERROR ✅
if iteration >= MAX_ITERATIONS:
    _LOGGER.error("❌ Failed to enforce min_capacity!")
```

**Výhoda:** Post-processing OPRAVUJE chyby z HYBRID algoritmu!

**Nevýhoda:** Reaktivní (opravuje po faktu), ne preventivní (měl by HYBRID respektovat constraint od začátku)

---

## 4. SHRNUTÍ - Jak Systém Pracuje s Kapacitou

### 4.1 HYBRID Optimalizace

```
INPUT:
├─ current_capacity: aktuální SOC v kWh (např. 12.95 kWh = 84% SOC)
├─ min_capacity: user minimum v kWh (5.07 kWh = 33% SOC)
├─ target_capacity: target v kWh (12.29 kWh = 80% SOC)
└─ max_capacity: total v kWh (15.36 kWh = 100% SOC)

PROCESS:
1. Forward pass: Simuluje HOME I, najde min_reached
   ❌ BUG: Clamp na 0 místo min_capacity
2. Backward pass: Počítá required_battery[i]
   ✅ Správně: Neclampuje na min_capacity (aby detekoval potřebu nabíjení)
3. Výběr režimů: HOME I/II/III podle FVE a cen
   ⚠️  Nerespektuje balancing_plan!
4. Nabíjení: HOME UPS v nejlevnějších intervalech
   ✅ Optimalizuje cenu nabíjení

OUTPUT:
└─ optimal_timeline: List intervalů s mode, battery_soc, net_cost
```

### 4.2 Post-Processing

```
INPUT: optimal_timeline z HYBRID

PROCESS:
1. Simuluj timeline interval po intervalu
2. Detekuj porušení: battery_soc < min_capacity
3. Pokud porušení → přidej HOME UPS PŘED porušením
4. Opakuj dokud všechny porušení opravena

OUTPUT: Opravený timeline (NIKDY neklesne pod min_capacity)
```

### 4.3 Mode Recommendations

```
INPUT: optimal_timeline (po post-processingu)

PROCESS:
1. Seskup po sobě jdoucí stejné režimy
2. Spočítej aggregate metrics (cost, savings, duration)
3. Vygeneruj lidské vysvětlení (rationale)

OUTPUT: User-friendly doporučení pro DNES a ZÍTRA
```

### 4.4 Battery Balancer

```
INPUT: Config (interval_days, hold_hours, thresholds)

PROCESS:
1. Detekuj potřebu balancingu (každých 7 dní)
2. Najdi levné intervaly (<1.1 Kč/kWh)
3. Vytvoř balancing_plan: holding_start/end, required_soc=100%

OUTPUT: self._active_charging_plan

❌ PROBLÉM: HYBRID ho IGNORUJE!
```

---

## 5. IDENTIFIKOVANÉ PROBLÉMY

### 🐛 PROBLÉM 1: Balancing Plan Se Ignoruje

**Lokace:** `_calculate_optimal_modes_hybrid()`, řádky 1824-2170

**Popis:**
- Battery Balancer vytváří plán: "Nabij na 100% v 02:00-05:00"
- HYBRID používá `target_capacity` (80%) místo 100%
- **Baterie se nenabije na 100%!**

**Fix:**
```python
def _calculate_optimal_modes_hybrid(self, ...):
    # PHASE 0: Check balancing requirement
    effective_target = target_capacity

    if self._active_charging_plan:
        required_soc = self._active_charging_plan.get("required_soc", 100.0)
        effective_target = max_capacity * (required_soc / 100.0)
        _LOGGER.info(f"🔋 Balancing: Override target to {required_soc}%")

    # Use effective_target in backward pass
    required_battery[n] = max(effective_target, min_capacity)
```

---

### 🐛 PROBLÉM 2: Forward Pass Ignoruje min_capacity

**Lokace:** `_calculate_optimal_modes_hybrid()`, řádek ~1892

**Popis:**
```python
battery = max(0, min(battery, max_capacity))
#            ↑
#            Mělo by: max(min_capacity, ...)
```

**Dopad:** Forward pass simuluje vybíjení až k 0 kWh → špatný `min_reached`

**Fix:**
```python
battery = max(min_capacity, min(battery, max_capacity))
```

---

### 🐛 PROBLÉM 3: Post-Processing Je Reaktivní, Ne Preventivní

**Lokace:** `_enforce_min_capacity_constraint()`, řádky 2555-2720

**Popis:**
- Post-processing OPRAVUJE porušení constraints
- HYBRID by měl constraint RESPEKTOVAT od začátku!

**Ideální:**
- HYBRID správně clampuje forward pass
- HYBRID respektuje min_capacity v backward pass
- Post-processing jen jako **POJISTKA**, ne hlavní mechanismus

---

### 🐛 PROBLÉM 4: Smíšené Jednotky (kWh vs SOC%)

**Popis:**
- HYBRID pracuje s kWh (12.95 kWh, 5.07 kWh, ...)
- Balancer vyžaduje SOC% (100%)
- Konverze: `required_soc_kwh = max_capacity * (required_soc / 100.0)`

**Riziko:** Chyby v konverzi, ztráta přesnosti

**Řešení:** Unifikovat na SOC% jako primární jednotku (viz BATTERY_CAPACITY_ARCHITECTURE_ANALYSIS.md)

---

## 6. DOPORUČENÉ OPRAVY

### Priorita 1: KRITICKÉ

1. **Fix Forward Pass Clamp**
   - Řádek ~1892: `max(min_capacity, ...)` místo `max(0, ...)`

2. **Respektovat Balancing Plan v HYBRID**
   - Přidat check `self._active_charging_plan`
   - Override `target_capacity` na `required_soc`

3. **Fix Backward Pass Target**
   - Použít `effective_target` (80% nebo 100% podle balancing)

### Priorita 2: DŮLEŽITÉ

4. **Refaktorovat Post-Processing**
   - Změnit z reaktivního na preventivní
   - Post-processing jen jako pojistka

5. **Unifikovat Jednotky**
   - Migrate na SOC% jako primární jednotku
   - kWh jen pro výstupy/zobrazení

### Priorita 3: NICE-TO-HAVE

6. **Zjednodušit Balancing Integraci**
   - Místo separate sensor → integrace přímo do HYBRID
   - Automatická detekce levných intervalů

---

## 7. ZÁVĚR

**Mode Recommendations:**
- ✅ Funguje správně jako prezentační vrstva
- ⚠️  Závisí na kvalitě HYBRID výsledku

**Battery Balancer:**
- ✅ Správně detekuje potřebu balancingu
- ✅ Vytváří plán s optimálními intervaly
- ❌ **HYBRID ho ignoruje** - baterie se nenabije na 100%!

**Post-Processing:**
- ✅ Opravuje porušení min_capacity
- ⚠️  Měl by být pojistka, ne hlavní mechanismus

**Klíčový Problém:**
HYBRID algoritmus nerespektuje:
1. Balancing requirements (100% SOC)
2. Min_capacity constraint v forward pass
→ Post-processing musí opravovat co HYBRID pokazil

**Řešení:**
Fix HYBRID aby constraint respektoval od začátku!
