# Business Requirements - Battery Planning System

**Datum:** 2. listopadu 2025
**Verze:** 1.0

---

## BR-0: Parametry Plánování

### Účel
Definovat základní parametry a omezení pro plánování nabíjení a vybíjení baterie.

### 0.1 Hardware Parametry (z API/senzorů)

**Požadavek:** Systém musí získat a respektovat fyzické limity baterie z OIG Cloud API.

**Parametry:**

1. **Celková kapacita** (`total_capacity`)
   - Hodnota: 15.36 kWh (100% instalované kapacity)
   - Zdroj: `sensor.oig_{box_id}_installed_battery_capacity_kwh`
   - Použití: Maximální možný stav baterie

2. **Hardware minimum SoC** (`hardware_min_soc`)
   - Hodnota: 20% (3.072 kWh)
   - Zdroj: `sensor.oig_{box_id}_batt_bat_min`
   - Použití: Absolutní dolní hranice (BMS limit) - SoC NIKDY nesmí klesnout pod tuto hodnotu

3. **Aktuální SoC**
   - Zdroj: `sensor.oig_{box_id}_battery_soc` (vždy v %)
   - Použití: Výchozí bod pro všechny plány

4. **Účinnost baterie** (`battery_efficiency`)
   - Hodnota: ~88.2% (DC/AC konverze)
   - Zdroj: `sensor.oig_{box_id}_battery_efficiency`
   - Použití: **Pouze pro vybíjení** - když chceme získat 1 kWh energie z baterie do spotřeby/přetoku/prodeje, vynásobíme efektivitou
   - Pro nabíjení NENÍ relevantní

5. **Aktuální režim invertoru**
   - Hodnoty: "Home 1", "Home 2", "Home 3", "Home UPS" (existují i "Home V", "Home VI", ale bez definovaných pravidel)
   - Zdroj: `sensor.oig_{box_id}_box_prms_mode`
   - Použití: Detekce současného stavu, historie přepínání

6. **Stav použití boileru**
   - Hodnota: True/False
   - Zdroj: `sensor.oig_{box_id}_boiler_is_use`
   - Použití: Pokud True → přednostně směrovat přebytek do boileru před exportem

7. **Instalovaný výkon boileru**
   - Hodnota: kW (typicky 2.0-3.0 kW)
   - Zdroj: `sensor.oig_{box_id}_boiler_install_power`
   - Použití: Limit pro směrování energie do boileru

8. **Limit exportu do sítě**
   - Hodnota: kW (maximální výkon exportu)
   - Zdroj: `sensor.oig_{box_id}_invertor_prm1_p_max_feed_grid`
   - Použití: Omezení množství energie exportované za interval (max_export_kwh = p_max_feed_grid * 0.25)

### 0.2 Uživatelská Konfigurace (Config Flow)

**Požadavek:** Uživatel musí mít možnost nastavit preferované limity a parametry nabíjení.

**Parametry:**

1. **Minimální kapacita** (`min_capacity_percent`)
   - Default: 33%
   - Rozsah: `hardware_min_soc` až `target_capacity_percent`
   - Význam: Baterie nesmí klesnout pod tuto úroveň při plánování (uživatelská rezerva)
   - Validace: `min_capacity_percent >= hardware_min_soc` A `min_capacity_percent <= target_capacity_percent`

2. **Cílová kapacita** (`target_capacity_percent`)
   - Default: 80%
   - Rozsah: `hardware_min_soc` až 100%
   - Význam: Požadovaný stav baterie na konci plánovacího období (typicky EOD)
   - Validace: `target_capacity_percent >= min_capacity_percent` A `target_capacity_percent >= hardware_min_soc`

3. **Rychlost AC nabíjení** (`home_charge_rate`)
   - Default: 2.8 kW
   - Rozsah: bez omezení (teoreticky 1.0-5.0 kW, ale neomezovat)
   - Význam: Maximální výkon nabíjení ze sítě (režim UPS)

4. **Práh levné ceny** (`threshold_cheap`)
   - Default: 1.5 Kč/kWh
   - Rozsah: 0.0 až 10.0 Kč/kWh
   - Význam: Pokud `spot_price < threshold_cheap`, považovat hodinu za "levnou" pro nabíjení
   - Použití: Rozhodování v algoritmu, kdy nabíjet ze sítě (režim UPS)

5. **Margin nad minimum** (`margin`)
   - Default: 2.0 kWh
   - Rozsah: 0.0 až 5.0 kWh
   - Význam: Rezerva nad `min_capacity` pro rozhodování o vybíjení
   - Použití: `if battery_soc > min_capacity + margin` → lze vybíjet

**Validační pravidla:**
- `hardware_min_soc <= min_capacity_percent <= target_capacity_percent <= 100%`
- `threshold_cheap >= 0` A `threshold_cheap <= 10.0`
- `margin >= 0` A `margin <= 5.0`

### 0.3 Omezení min_capacity - HARD CONSTRAINT při plánování

**Požadavek:** SoC NIKDY nesmí klesnout pod `hardware_min_soc`. Při plánování nesmí klesnout pod `min_capacity_percent` z config flow.

**Pravidla:**
1. **Absolutní limit:** SoC >= `hardware_min_soc` (20%) - VŽDY
2. **Plánovací limit:** Každý interval v plánu musí mít SoC >= `min_capacity_percent` (např. 33%)
3. Pokud předpověď ukazuje pokles pod `min_capacity_percent` → automaticky přidat nabíjení
4. Pokud nelze dodržet `min_capacity_percent` ani s maximálním nabíjením → warning + best effort
5. Tolerance: **0.5 kWh (500 Wh)** pro floating point porovnání

**Priorita:** Absolutní - nelze obětovat pro jiné cíle (včetně úspory nákladů)

### 0.4 Cílová Kapacita - SOFT CONSTRAINT

**Požadavek:** Baterie BY MĚLA dosáhnout target kapacity, pokud je to cenově efektivní.

**Typy cílů:**

1. **Automatický cíl (EOD)**
   - Target: `target_capacity_percent` z konfigurace
   - Deadline: Konec dne (23:59)
   - Použití: Běžný denní provoz
   - **Pravidlo:** Target nemusí být dosažen, pokud nebude cenově efektivní ho dosáhnout. Ale EOD SoC nesmí být menší než `min_capacity_percent` z config flow.

2. **Manuální cíl**
   - Target: Uživatelem zadaná hodnota (např. 90%)
   - Deadline: Uživatelem zadaný čas (např. 06:00)
   - Holding: Možnost udržet target po určitou dobu (holding time)
   - Použití: Specifické potřeby (ranní odjezd, očekávaný výpadek, atd.)

3. **Emergency cíl**
   - Target: Vždy 100%
   - Deadline: ASAP
   - Holding: Holding time (doba udržení na 100%)
   - Priorita: Rychlost nad cenou
   - Použití: Očekávaný blackout, jiná kritická situace

**Pravidla:**
1. Target je "best effort" - pokud nedosažitelný nebo neefektivní, najít optimální SoC
2. Target nesmí porušit `min_capacity_percent` (priorita min > target)
3. Systém musí oznámit pokud target není dosažitelný s danými parametry
4. Pokud target dosažitelný, vybrat nejlevnější cestu jak ho dosáhnout

### 0.5 Vztahy a Priority

**Hierarchie omezení:**
```
1. hardware_min_soc (20%) - fyzický limit BMS, NIKDY nesmí klesnout
2. min_capacity_percent (33%) - HARD constraint při plánování
3. target_capacity_percent (80%) - SOFT goal (pouze pokud cenově efektivní pro automatický plán)
4. max_capacity (100%) - fyzický limit
```

**Priorita při konfliktech:**
```
hardware_min_soc > min_capacity_percent > target_capacity > cost_optimization
```

To znamená:
- SoC NIKDY < `hardware_min_soc`
- Plán NIKDY s SoC < `min_capacity_percent`
- Target je best effort (pro automatický plán cenově podmíněný, pro manuální/emergency snaha dosáhnout)
- Mezi více způsoby jak dosáhnout target vybrat nejlevnější

### 0.6 Cenové Parametry pro Plánování

**Požadavek:** Systém musí získat timeline budoucích cen pro optimalizaci nákladů plánování.

**Parametry:**

1. **Import Price (Nákup ze sítě)**
   - Senzor: `sensor.oig_{box_id}_spot_price_current_15min`
   - Kde najít: `state.attributes` obsahuje ceny po 15minutových intervalech
   - Obsahuje: Finální cenu včetně spot + obchodní přirážka + distribuce + DPH
   - Použití: Výpočet nákladů UPS nabíjení, HOME III spotřeby, HOME II doplnění ze sítě

2. **Export Price (Prodej do sítě)**
   - Senzor: `sensor.oig_{box_id}_export_price_current_15min`
   - Kde najít: `state.attributes` obsahuje ceny po 15minutových intervalech
   - Obsahuje: Cenu za prodej do sítě
   - Použití: Výpočet zisku z exportu přebytku FVE (HOME I když baterie plná)

**Rozsah Plánování:**

- **Historická data:** Senzory obsahují i historii, ale pro plánování NEPOUŽÍVAT
- **Plánování:** Vždy od aktuálního intervalu do budoucna (dokud jsou dostupná data)
- **Minimum:** Do konce aktuálního dne (EOD)
- **Optimální:** Až 36 hodin dopředu (co OTE API poskytuje na další den)
- **Granularita:** 15 minut (konzistentní s plánovacími intervaly)

**Fallback:**
- Pokud timeline není k dispozici → nelze plánovat (warning)
- Použít poslední známý plán nebo výchozí režim (HOME I)

**Rozsah dostupných cen v senzorech určuje maximální rozsah plánování do budoucna.**

---

## BR-1: Režimy CBB (Combined Battery Box)

### Účel
Definovat přesné chování jednotlivých režimů invertoru a jejich vliv na toky energie mezi FVE, baterií, spotřebou a sítí.

### 1.1 Přehled Režimů

**Podporované režimy pro plánování:**
- **HOME I** (mode 0) - Výchozí režim, off-grid provoz (FVE + baterie)
- **HOME II** (mode 1) - Šetřící režim, baterie netouched při FVE > 0
- **HOME III** (mode 2) - Maximalizace nabíjení z FVE (vyšší DC/DC efektivita)
- **HOME UPS** (mode 3) - Nabíjení ze sítě (backup režim)

**Nepoužívané režimy:**
- HOME V, HOME VI - existují v API, ale bez definovaných pravidel pro plánování

### 1.2 Chování Režimů - FVE > 0 (Den, Slunce Svítí)

#### HOME I - Výchozí Režim (Off-grid)

**Baterie:**
- **Nabíjí**: z přebytku FVE (když FVE > spotřeba) - **bez omezení výkonu** (stejně jako HOME II a III)
- **Vybíjí**: když FVE < spotřeba (dodává rozdíl)

**Spotřeba:**
1. FVE (co dá)
2. Baterie (zbytek)

**Grid:**
- Pouze špičky (>3kW na fázi)

**Použití:**
- Výchozí režim pro normální provoz
- Off-grid režim - využívá primárně FVE a baterii
- Žádné další náklady (nepotřebuje síť)
- Maximální využití baterie

---

#### HOME II - Šetřící Režim

**Baterie:**
- **Nabíjí**: z přebytku FVE (když FVE > spotřeba) - **bez omezení výkonu**
- **NETOUCHED**: když FVE < spotřeba (NEUBÍRÁ se z baterie!)

**Spotřeba:**
1. FVE (co dá)
2. **Grid (zbytek!)** - když FVE nestačí

**Grid:**
- **Vždy když FVE < spotřeba** (doplňuje rozdíl místo baterie)

**Použití:**
- Šetření baterie na večerní špičku (když večerní cena >> denní cena)
- **Když nedokážeme efektivně doplnit kapacitu baterie** - levnější nechat baterii jak je a odebírat přímo z gridu (ušetříme ztráty baterie AC/DC + DC/AC)
- Vyplatí se když: nabíjení baterie by bylo neefektivní kvůli ztrátám

**KRITICKÉ:** V režimu HOME II při FVE > 0 se baterie NEVYBÍJÍ, i když FVE < spotřeba!

---

#### HOME III - Maximalizace Nabíjení (Vyšší Efektivita)

**Baterie:**
- **Nabíjí**: z **CELÉ FVE bez omezení výkonu** (může být >10 kW!)

**Spotřeba:**
- **Grid (celá spotřeba)** - i když je FVE

**Grid:**
- **Vždy** (spotřeba, FVE jde celá do baterie)

**Použití:**
- Maximální nabití baterie ze solaru
- Příprava na večerní špičku
- Dosažení target SoC během dne
- **Může být výhodnější než HOME II** - vyšší DC/DC efektivita (95%) vs AC/DC ztráty při pozdějším nabíjení
- **Může být výhodnější než HOME UPS** v zimě při vysokých cenách - porovnat celkové náklady nabíjení z FVE+grid (HOME III) vs pouze nabíjení ze sítě (HOME UPS)

**Ekonomická úvaha:**
- HOME III: FVE (free) → baterie (DC/DC 95% efektivita) + spotřeba z gridu
- HOME UPS: FVE (free) + grid → baterie (AC/DC 95% efektivita) + spotřeba z gridu
- HOME II: FVE → spotřeba, zbytek grid, baterie netouched (bez ztrát)

**KRITICKÉ:** HOME III nabíjí z FVE BEZ limitu výkonu (ne max 0.7 kWh/15min)!

---

#### HOME UPS - Nabíjení ze Sítě

**Baterie:**
- **Nabíjí současně**:
  - Grid → baterie: MAX 2.8 kW (z config `home_charge_rate`)
  - FVE → baterie: **BEZ OMEZENÍ** (DC/DC path)
- **Nabíjí do 100% SoC**

**Spotřeba:**
- **Grid** (celá spotřeba)

**Grid:**
- **Vždy** (spotřeba + nabíjení baterie)

**Použití:**
- Nabíjení v levných hodinách (nízká spotová cena)
- Příprava na očekávaný výpadek (blackout warning)
- Emergency dobití

**KRITICKÉ:**
- Grid nabíjení limitováno na `home_charge_rate` (2.8 kW)
- FVE nabíjení bez limitu
- Celkové nabíjení může být > 2.8 kW (grid + FVE současně)
- **Po dosažení 100% baterie stále drží UPS režim** (ne přepnutí do HOME I)

---

### 1.3 Chování Režimů - FVE = 0 (Noc, Žádné Slunce)

**HOME I, HOME II, HOME III:**
- **IDENTICKÉ chování**
- Baterie vybíjí až do 20% SoC (hardware minimum)
- Spotřeba pokrývána z baterie (dokud SoC > 20%)
- Grid se použije když SoC ≤ 20%

**HOME UPS:**
- Nabíjí ze sítě max. výkonem (2.8 kW) až do 100%
- Celá spotřeba ze sítě
- Nejdražší v noci (kupuje i spotřebu i nabíjení)

### 1.4 Technické Parametry

**Výkonové limity:**

```
HOME I nabíjení:
- FVE → baterie: BEZ LIMITU (DC/DC path)

HOME II nabíjení:
- FVE → baterie: BEZ LIMITU (DC/DC path)

HOME III nabíjení:
- FVE → baterie: BEZ LIMITU (může být >10 kW během špičky)
- Per interval: CELÁ dostupná FVE

HOME UPS nabíjení:
- Grid → baterie: max 2.8 kW (z config flow home_charge_rate)
- Per interval (15 min): max 0.7 kWh z gridu
- FVE → baterie: BEZ LIMITU (DC/DC path)
- Total charge per interval: může být > 0.7 kWh (grid + FVE současně)
```

**Efektivity:**

```
battery_efficiency (DC/AC) = 88.2% - pouze pro vybíjení
- Když chceme 1 kWh z baterie do spotřeby/exportu → vynásobíme 0.882

AC/DC (grid → baterie) = 95% - ztráty při nabíjení ze sítě (HOME UPS)
DC/DC (FVE → baterie) = 95% - ztráty při nabíjení z FVE (všechny režimy)
```

**Kapacity:**

```
total_capacity = 15.36 kWh (100%)
hardware_min_soc = 20% (3.072 kWh) - BMS limit
```

### 1.5 Ekonomická Logika - Kdy Použít Který Režim

**HOME I - Off-grid provoz:**
- Výchozí režim pro normální provoz
- **Off-grid režim**: využívá primárně FVE a baterii, žádné další náklady
- Maximální využití baterie
- Nejlevnější při běžném provozu (nepotřebuje síť)

**HOME II - Šetření baterie:**
- Grid doplňuje místo baterie když FVE < spotřeba
- Vyplatí se když:
  - Večerní cena >> denní cena (šetří baterii na mega špičku)
  - **Nedokážeme efektivně doplnit baterie** - levnější odebírat přímo z gridu než platit ztráty cyklem nabití/vybití

**HOME III - DC/DC efektivita:**
- Celá FVE → baterie (spotřeba ze sítě)
- Vyplatí se když:
  - Potřebujeme nabít baterii + máme FVE
  - **Vyšší DC/DC efektivita (95%)** vs pozdější AC/DC nabíjení
  - V zimě při vysokých cenách: porovnat HOME III vs HOME UPS (celkové náklady)

**HOME UPS - Nabíjení ze sítě:**
- Vždy kupuje ze sítě (spotřeba + nabíjení)
- Použít pro:
  - Nabíjení v **nejlevnějších hodinách** (optimalizace spotové ceny)
  - Příprava na očekávaný výpadek
  - Emergency dobití

### 1.6 Klíčové Rozdíly - Souhrn

**Během dne (FVE > 0) když FVE < Spotřeba:**

| Režim | Baterie | Grid | Ekonomika |
|-------|---------|------|-----------|
| **HOME I** | ✅ VYBÍJÍ rozdíl | ➖ Nečerpá | Off-grid, bez nákladů |
| **HOME II** | ➖ NETOUCHED | ❌ DOPLŇUJE rozdíl | Šetří baterii + ušetří ztráty |
| **HOME III** | ✅ NABÍJÍ z FVE | ❌ POKRÝVÁ VŠE | DC/DC efektivita, srovnat s UPS |
| **HOME UPS** | ✅ NABÍJÍ z Grid+FVE | ❌ POKRÝVÁ VŠE | Nabíjení v levných hodinách |

**V noci (FVE = 0):**

- **HOME I/II/III**: Všechny IDENTICKÉ - vybíjí do 20% SoC
- **HOME UPS**: Nabíjí ze sítě, vše ze sítě

### 1.7 Validační Požadavky

**Implementace MUSÍ respektovat:**

1. **HOME I**: FVE nabíjení BEZ limitu výkonu
2. **HOME II**: FVE nabíjení BEZ limitu výkonu
3. **HOME III**: FVE nabíjení BEZ limitu výkonu (ne max 0.7 kWh!)
4. **HOME UPS**:
   - Grid limit: `home_charge_rate / 4` per interval
   - FVE: BEZ limitu
   - Současné nabíjení: grid + FVE
5. **HOME II**: Když FVE > 0 a FVE < spotřeba → baterie NETOUCHED, grid doplňuje
6. **HOME I**: Když FVE < spotřeba → baterie vybíjí rozdíl
7. **Efektivita**: Používat pouze pro vybíjení (battery_efficiency = 88.2%)

---

## BR-2: Plánování - Workflow a Správa Plánů

### Účel
Definovat workflow, stavy, perzistenci a přístup k plánům. Samotný výpočet je v BR-3.

### 2.1 Vstupy pro Plánování

**Požadavek:** Pro vytvoření plánu musí být k dispozici následující vstupy.

**Povinné vstupy:**
1. **Aktuální stav baterie** (SoC v kWh) - z BR-0.1
2. **Min capacity** (v kWh) - z config flow, BR-0.2
3. **Target capacity** (v kWh) a deadline (timestamp) - z BR-0.4
4. **Import price timeline** (Kč/kWh, timestamp) - z BR-0.6
5. **Export price timeline** (Kč/kWh, timestamp) - z BR-0.6
6. **FVE forecast** (kWh per interval, timestamp)
7. **Spotřeba forecast** (kWh per interval, timestamp)
8. **Plan type** - "automatic" nebo "manual"

**Jednotky (VŽDY konvertovat):**
- **Energie:** kWh
- **Cena:** Kč
- **Čas:** timestamp (ISO 8601)
- **Interval:** 15 minut

**Validace před plánováním:**
- Všechny vstupy dostupné
- Timeline pokrývá minimálně do deadline
- Current SoC >= hardware_min_soc (20%)
- Min capacity <= target capacity

**Pokud vstupy chybí:**
- **ŽÁDNÉ FALLBACKY** - nelze plánovat
- Error do logu
- Zachovat poslední aplikovaný plán (viz 2.8)

### 2.2 Výstup Plánování - Timeline (Forecast)

**Požadavek:** Plán vrací forecast pole s režimy pro každý interval.

**Formát timeline:**
```json
[
  {
    "interval": 0,
    "timestamp": "2025-11-02T15:00:00Z",
    "mode": 0,
    "mode_name": "HOME I",
    "battery_soc_kwh": 8.45,
    "solar_kwh": 1.2,
    "consumption_kwh": 0.8,
    "grid_import_kwh": 0.0,
    "grid_export_kwh": 0.0,
    "spot_price_czk": 5.29,
    "export_price_czk": 2.15,
    "interval_cost_czk": 0.0
  }
]
```

**Metadata plánu:**
```json
{
  "plan_id": "plan_abc123",
  "plan_type": "automatic",
  "plan_status": "active",
  "created_timestamp": "2025-11-02T15:00:00Z",
  "applied_timestamp": "2025-11-02T15:00:30Z",
  "deadline_timestamp": "2025-11-02T23:59:00Z",
  "current_soc_kwh": 8.45,
  "target_soc_kwh": 12.288,
  "total_cost_czk": 42.50,
  "total_intervals": 96,
  "mode_switches": 5,
  "achievable": true,
  "final_soc_kwh": 12.5,
  "min_capacity_violations": 0
}
```

### 2.3 Plánování vs Aplikace - Oddělení Odpovědnosti

**Požadavek:** Plánování vypočítá, aplikace nasadí. Dva samostatné kroky.

#### 2.3.1 Plánovací Engine (BR-3)

**Odpovědnost:**
- Přijmout vstupy (SoC, target, deadline, ceny, forecast, plan_type)
- Spočítat optimální timeline (algoritmus v BR-3)
- Vrátit plán s metadata
- **NEPROVÁDÍ aplikaci**

**Volání:**
```python
plan = await planning_engine.calculate_plan(
    current_soc_kwh=8.45,
    target_soc_kwh=12.288,
    deadline_timestamp="2025-11-02T23:59:00Z",
    import_prices=[...],
    export_prices=[...],
    solar_forecast=[...],
    consumption_forecast=[...],
    plan_type="automatic"
)
```

#### 2.3.2 Aplikace Plánu (Plan Manager)

**Odpovědnost:**
- Přijmout plán k aplikaci
- Revertovat aktuální aplikovaný plán
- Aplikovat nový plán
- Aktualizovat storage

**Volání:**
```python
await plan_manager.apply_plan(
    new_plan=plan,
    requester="automatic"
)
```

**Proces aplikace:**
1. Načíst aktuální active plan z storage
2. Pokud existuje → revert (status → "reverted")
3. Aplikovat nový (status → "active")
4. Zneplatnit všechny simulace (status → "invalidated")
5. Uložit do storage

### 2.4 Typy Plánů a Status

**Požadavek:** Systém podporuje 2 typy plánů.

#### Plan Types:
- **"automatic"** - Automatický plán (každou hodinu)
- **"manual"** - Manuální plán (na požadavek)

#### Plan Status:
- **"pending"** - Vytvořen, čeká na aplikaci (pouze manual)
- **"active"** - Aktuálně aplikovaný (VŽDY právě 1)
- **"reverted"** - Byl aktivní, pak nahrazen
- **"invalidated"** - Simulace zneplatněná aplikací
- **"expired"** - Prošel deadline, smazat

#### 2.4.1 Automatic Plan

**Charakteristika:**
- Plan_type: "automatic"
- Target: `target_capacity_percent` z config (80%)
- Deadline: EOD (23:59)
- **Auto-apply:** ANO

**Workflow:**
1. Trigger (každou hodinu)
2. Calculate plan
3. Apply okamžitě
4. Status → "active"

#### 2.4.2 Manual Plan

**Charakteristika:**
- Plan_type: "manual"
- Target: User zadá
- Deadline: User zadá
- Holding: Možnost
- **Auto-apply:** NE

**Workflow:**
1. User: "create manual plan" (API)
2. Calculate plan
3. Status → "pending"
4. User: review v FE (data z BE)
5. User: "apply plan" (API)
6. Apply plan
7. Status → "active"

#### 2.4.3 Simulation

**Charakteristika:**
- Plan_type: "manual"
- **NIKDY se neaplikuje**
- Více najednou

**Workflow:**
1. User: "create simulation" × N
2. Calculate × N
3. Status → "pending"
4. User: porovnání v FE
5. User: "apply simulation X" → apply
6. Ostatní: status → "invalidated"

### 2.5 Perzistence a Storage

**Požadavek:** Plány přežijí restart, ale nejsou perzistentní dlouhodobě.

**Storage:**
- **Formát:** JSON soubor
- **Cesta:** `/config/.storage/oig_cloud_plans/plans.json`
- **NE databáze/paměť**

**Struktura:**
```json
{
  "active_plan": {
    "plan_id": "plan_abc123",
    "plan_type": "automatic",
    "plan_status": "active",
    "timeline": [...],
    "metadata": {...}
  },
  "pending_plans": [...],
  "last_update_timestamp": "2025-11-02T15:30:00Z"
}
```

**Aktualizace:**
- Při každé změně (create, apply, revert)
- Atomický zápis (temp + rename)

**Čištění:**
- Expired plány: smazat po uplynutí deadline
- Invalidated: smazat po 24h
- Daily cleanup

**Po restartu/reload:**
1. Načíst active_plan
2. Pokud validní (deadline > now) → použít
3. Jinak → spočítat nový automatic → apply
4. **VŽDY musí existovat active plan**

### 2.6 Frekvence Přeplánování

**Požadavek:** Automatic plán se přepočítává pravidelně.

**Frekvence:** Každou hodinu (60 min)

**Triggery:**
1. **Každou hodinu** - automatic replanning
2. **Po restart/reload** - pokud není validní active
3. **Změna config** (min_capacity, target_capacity, home_charge_rate)
4. **Manuální trigger** - force recalculate (API)

**Asynchronní start:**
- Po reload/restart spustit plánování asynchronně
- **Neblokovat** naběhnutí integrace
- Background task s timeout

### 2.7 API Přístup

**Požadavek:** Plán dostupný přes zabezpečené API.

**Endpointy:**
```
GET  /api/oig_cloud/plan/active          # Aktuální aktivní plán
GET  /api/oig_cloud/plan/{plan_id}       # Konkrétní plán
POST /api/oig_cloud/plan/calculate       # Spočítat nový (neaplikovat)
POST /api/oig_cloud/plan/apply/{plan_id} # Aplikovat pending
POST /api/oig_cloud/plan/revert          # Revert na automatic
DELETE /api/oig_cloud/plan/{plan_id}     # Smazat pending
```

**Autentizace:**
- Home Assistant autentizace token
- Kdo má token → může měnit plán

**Response:**
- JSON s timeline + metadata
- HTTP status: 200/400/404

### 2.8 Pravidlo "Vždy Existuje Plán"

**Požadavek:** VŽDY právě jeden active plan.

**Situace:**
1. **První start:** Calculate automatic → apply → active
2. **Revert manual:** Calculate automatic → apply → revert old
3. **Expirovaný plán:** Calculate automatic → apply

**Fallback:**
- Nelze spočítat → zachovat poslední active
- Ani ten není validní → HOME I režim (hardcoded)

### 2.9 Frontend Zobrazení

**Požadavek:** FE zobrazuje data z BE, veškerá logika v BE.

**Pravidla:**
- FE jen renderuje JSON z API
- **ŽÁDNÁ logika** výpočtů v FE
- FE může formátovat pro zobrazení
- Všechny výpočty v BE

### 2.10 Invalidace Simulací

**Požadavek:** Při apply zneplatnit všechny pending simulace.

**Proces:**
1. Aplikuje se plán
2. Najít všechny "pending" manual
3. Status → "invalidated"
4. Metadata: důvod invalidace

**Cleanup:**
- Smazat po 24h
- Nebo při limitu (max 10 pending)

---

## BR-3: Plánovací Algoritmus

### 3.1 Vstupní Data
**Požadavek:** Algoritmus pracuje se vstupy z BR-2.1 (8 parametrů).

**Výstup:** Timeline optimálních režimů pro každý interval + metrika kvality plánu.

---

### 3.2 Simulace Intervalu
**Požadavek:** Pro každý interval simulovat energetické toky podle režimu (viz BR-1).

**Klíčové hodnoty:**
- `battery_after` (kWh): výsledný stav baterie po intervalu
- `cost` (Kč): náklady/výnosy za interval
- `clamp_deficit` (kWh): energie chybějící k dodržení min_capacity

**Důležité:** Pokud `battery_after < min_capacity`, je to porušení HARD constraint → nutné detekovat.

---

### 3.3 Nákladová Funkce
**Požadavek:** Pro každý interval vypočítat čistý náklad/výnos.

**Základní vzorec:**
```
cost = import_kwh * spot_price - export_kwh * export_price
```

**Speciální případy:**
- **Boiler:** Pokud `boiler_is_use = True`, přednostně směrovat přebytek do boileru (limit `boiler_install_power`), teprve pak export.
- **Export limit:** Respektovat `invertor_prm1_p_max_feed_grid` (kW) → max export za interval = `p_max_feed_grid * 0.25` kWh.

---

### 3.4 Deficit Fix (Clamp Detection)
**Požadavek:** Pokud simulace intervalu dá `battery_after < min_capacity`, PŘED tímto intervalem vložit nabíjecí interval v režimu UPS.

**Postup:**
1. Zjistit deficit: `deficit = min_capacity - battery_after`
2. **Před** problematickým intervalem přidat UPS režim, který dobije baterii o `deficit` kWh.
3. Použít cenově nejvhodnější interval v předchozích hodinách (nejlevnější import).

**Poznámka:** Clamp není jen virtuální limit – je to detekční mechanismus vyžadující opravu plánu.

---

### 3.5 Výběr Režimu pro Interval
**Požadavek:** Pro každý interval vybrat optimální režim podle podmínek.

**Základní rozhodovací logika:**

**FVE = 0 (Noc/bez FVE):**
- Pokud `battery_soc > min_capacity + margin` A `spot_price < threshold_cheap` → **UPS** (nabít levně)
- Pokud `battery_soc > min_capacity + margin` → **HOME I** (vybíjet)
- Pokud `battery_soc ≈ min_capacity` → **HOME UPS** (dobít)

**FVE > 0, Přebytek (solar >= consumption):**
- Pokud `battery_soc < target` → **HOME III** (max nabíjení z FVE)
- Jinak → **HOME I** (normální provoz)

**FVE > 0, Deficit (solar < consumption):**
- **Důležité:** Nemá smysl přepínat HOME II/III z HOME I, pokud FVE ≤ 500 W (režijní ztráty).
- Pokud drahá hodina A budou levnější → **HOME II** (šetři baterii)
- Pokud `battery_soc > min_capacity + margin` → **HOME I** (vybíjet)
- Jinak → **HOME III** (nabít z FVE) nebo **HOME UPS** (dobít ze sítě)

**Parametry rozhodování:**
- `threshold_cheap`: **UŽIVATELSKY KONFIGUROVATELNÉ** (config flow), doporučená výchozí hodnota např. 1.5 Kč/kWh
- `margin`: **UŽIVATELSKY KONFIGUROVATELNÉ** (config flow), doporučená výchozí hodnota např. 2.0 kWh (nad minimum)
- `tolerance`: **500 Wh** (0.5 kWh) – tolerance pro floating point porovnání
- `fve_switch_threshold`: **500 W** – minimální FVE pro přepínání mezi HOME I/II/III

**Poznámka:** Parametry `threshold_cheap` a `margin` MUSÍ být přidány do config flow (BR-0.2).

---

### 3.6 Cílová Kapacita (Soft Constraint)
**Požadavek:** Snažit se dosáhnout `target_capacity` v intervalech s levnou cenou nebo vysokým FVE.

**Strategie:**
- Pokud `battery_soc < target` A levná hodina → nabíjet (UPS nebo HOME III podle FVE).
- Pokud `battery_soc ≥ target` → není nutné nabíjet, pokud není speciální důvod (očekávaný deficit).

**Priorita:** P1 (viz BR-0.5) – po dodržení min_capacity (P0), před optimalizací nákladů (P2).

---

### 3.7 Optimalizace Nákladů
**Požadavek:** Minimalizovat celkové náklady plánu při dodržení všech constraints.

**Přístup:**
- Vybíjet v drahých hodinách (vysoký `spot_price`).
- Nabíjet v levných hodinách (nízký `spot_price` nebo export_price).
- Preferovat FVE nabíjení (HOME III) před síťovým (UPS).
- Exportovat v hodinách s vysokým `export_price` (pokud `battery_soc ≥ target`).

**Priorita:** P2 – až po dodržení min/target capacity.

---

### 3.8 Minimalizace Přepínání
**Požadavek:** Pokud možno minimalizovat počet změn režimu (opotřebení HW, stabilita).

**Strategie:**
- Pokud dva režimy dávají podobný výsledek (rozdíl < tolerance nákladů), preferovat ten, co udržuje aktuální režim.
- Tolerance: např. 0.10 Kč rozdíl v nákladech intervalu.

**Priorita:** P3 – nejnižší, až po všech předchozích kritériích.

---

### 3.9 Metadata Plánu
**Požadavek:** Spolu s timeline vrátit metadata o kvalitě a stavu plánu.

**Povinné položky:**
- `total_cost` (Kč): suma nákladů všech intervalů
- `min_capacity_violations`: počet intervalů, kde `battery_soc < min_capacity` (mělo by být 0)
- `target_achieved_count`: kolikrát bylo dosaženo `target_capacity`
- `mode_switches`: počet přepnutí režimu
- `clamp_events`: počet detekovaných deficitů (mělo by být 0 po deficit_fix)

**Validace:** Pokud `min_capacity_violations > 0` nebo `clamp_events > 0`, plán je **INVALID**.

---

## BR-4: Battery Balancing (Vyrovnání Článků)

### Účel
Zajistit pravidelné vyrovnání napětí jednotlivých článků baterie držením na 100% SoC po definovanou dobu, s minimálními náklady.

---

### 4.1 Základní Princip

**Požadavek:** Baterie musí dosáhnout 100% a držet se tam po `hold_hours` minimálně jednou za `interval_days`.

**Parametry (config flow):**
- `balancing_enabled`: True/False (povolit automatické balancing)
- `balancing_interval_days`: 7 dní (default) - maximální interval mezi balancingem
- `balancing_hold_hours`: 3 hodiny (default) - doba držení na 100% SoC

**Detekce dokončení balancingu:**
- Automatická detekce z historie: hledat souvislý úsek SoC >= 98% po dobu >= `hold_hours`
- Pokud nalezeno → reset čítače, `last_balancing = konec_holdingu`
- Nemusí být explicitně naplánováno, stačí přirozené dosažení (např. z FVE)

---

### 4.2 Opportunistický Balancing

**Požadavek:** Využít příležitost, když baterie přirozeně dosáhne 100%.

**Pravidla:**
1. Pokud baterie dosáhne 100% (z jakéhokoli důvodu - FVE, plánované nabití, apod.)
2. A `spot_price < median(future_prices)` - import není nad mediánem budoucích cen od tohoto okamžiku do konce dostupných OTE cen
3. → Spustit balancing holding **okamžitě** (držet `hold_hours`, kompenzovat pouze spotřebu)

**Režim během holdingu:**
- **HOME III** (nedovolit vybíjení baterie, držet na 100%)
- Pokud FVE > spotřeba → zůstat na 100%
- Pokud FVE < spotřeba → dobít rozdíl ze sítě (minimální import)

**Výhoda:** Žádné extra náklady na nabíjení, využít "zadarmo" dosažené 100%.

**Poznámka:** Mediána se počítá z budoucích importních cen od aktuálního okamžiku do konce OTE forecast.

---

### 4.3 Plánovaný Balancing (Economic Mode)

**Požadavek:** Najít nejlevnější cestu k balancingu v následujících dnech.

**Časování:**
- OTE publikuje ceny ve **13:00** pro D+1
- Balancer kontroluje **každých 15 minut** dostupnost nových cen
- **Přepočet plánu 1× denně** po načtení nových OTE cen
- Plánování pro okno: **od now do konce dostupných OTE cen** (forecast sensor)

---

### 4.4 Proces Plánování Balancingu

**Požadavek:** Balancer používá plánovač (BR-3) pro nalezení optimální cesty k 100% + holding.

**Vstup pro plánovač:**
```python
request = {
  "current_soc_kwh": 8.5,                    # Aktuální stav baterie
  "target_soc_kwh": 15.36,                   # 100% kapacity
  "target_time": "2025-11-03T22:00:00",      # Deadline pro dosažení 100%
  "holding_hours": 3,                        # Doba držení na 100%
  "mode": "balancing",                       # Speciální režim
  "import_prices": [...],                    # OTE timeline
  "export_prices": [...],
  "solar_forecast": [...],
  "consumption_forecast": [...]
}
```

**Výstup od plánovače:**
```json
{
  "timeline": [
    {"interval": 0, "mode": 0, "battery_soc_kwh": 8.5, ...},
    {"interval": 1, "mode": 3, "battery_soc_kwh": 9.2, ...},
    ...
    {"interval": 28, "mode": 2, "battery_soc_kwh": 15.36, ...},  // Dosaženo 100%
    {"interval": 29, "mode": 2, "battery_soc_kwh": 15.36, ...},  // Holding
    {"interval": 30, "mode": 2, "battery_soc_kwh": 15.36, ...},  // Holding
    {"interval": 31, "mode": 2, "battery_soc_kwh": 15.36, ...},  // Holding konec
    ...
  ],
  "metadata": {
    "achieved_soc": 15.36,                   // Dosažený SoC v kWh
    "total_cost": 42.50,                     // Kč za celý plán (nabití + holding)
    "feasible": true,                        // true = dosáhne 100% + udrží holding
    "holding_start": "2025-11-03T22:00:00",  // Začátek holdingu
    "holding_end": "2025-11-04T01:00:00",    // Konec holdingu
    "target_achieved": true                  // Dosáhl target_soc po holding_hours
  }
}
```

**Povinnost plánovače:**
- Vrátit timeline, který dosáhne `target_soc_kwh` v čase `target_time`
- Následně držet baterii na této úrovni po dobu `holding_hours`
- V metadata vrátit, zda bylo dosaženo cíle (`feasible`, `target_achieved`)
- Holding intervaly jsou **součástí výstupu** plánovače, ne přidané balancerem

---

### 4.5 Výběr Kandidátního Okna (Economic Mode)

**Požadavek:** Vyzkoušet různé časy pro `target_time` a vybrat nejlevnější.

**Proces:**
1. Získat timeline OTE cen (délka = kolik hodin máme ceny)
2. Pro každou celou hodinu v okně jako kandidátní `target_time`:
   - Zavolat plánovač s tímto `target_time` a `holding_hours`
   - Plánovač vrátí plán + `total_cost`
3. Filtrovat pouze feasible plány (`feasible = true`)
4. Vybrat kandidáta s **nejnižšími celkovými náklady** (`min(total_cost)`)
5. Uložit jako `planned_window`

**Validace kandidáta:**
- `target_time >= now + 2h` (časová rezerva)
- `holding_end <= konec_OTE_forecast` (stihne se holding v dostupných cenách)
- `feasible = true` (plánovač potvrdil dosažitelnost)

**Scoring:** Vyber kandidáta s `min(total_cost)` kde `feasible = true`.

---

### 4.6 Forced Mode (Den 7)

**Požadavek:** Pokud během 7 dnů nenajdu feasible ekonomický plán → den 7 MUSÍ proběhnout.

**Pravidla:**
- Den 7 od `last_balancing` → forced mode
- Po načtení OTE cen (13:00+) naplánovat balancing **ke konci dostupného okna**:
  - `target_time` = co nejblíž konci OTE forecast mínus `holding_hours`
  - `holding_end` blízko poslední dostupné hodině z OTE
- Použít nejlevnější cestu bez ohledu na to, jestli je "drahá"

**Emergency plan:**
- Pokud ani forced mode nevrátí `feasible = true` (nedosáhne 100%)
- **Není problém** - aplikovat plán co plánovač vrátil
- Je to emergency, důležité je zdraví baterie
- Metadata budou obsahovat `target_achieved = false`
- Další den zkusit znovu

**Poznámka:** "Ke konci okna" znamená holding má skončit co nejblíž poslední dostupné hodině z OTE.

---

### 4.7 Integrace s Automatic Plánovačem

**Požadavek:** Balancer NEIMPLEMENTUJE vlastní logiku nabíjení - jen volá plánovač s balancing parametry.

**Spolupráce:**
1. Balancer určí **deadline** pro 100% SoC (např. "2025-11-03 22:00")
2. Zavolá plánovač s `mode="balancing"`, `holding_hours=3`
3. Plánovač vrátí **kompletní timeline včetně holding intervalů**
4. Balancer vyhodnotí `total_cost` a `feasible`
5. Vybere nejlevnější feasible plán
6. Aplikuje jej

**Plánovač automaticky:**
- Zkouší různé cesty (direct 100%, staged approach, různé režimy)
- Vrátí nejlevnější cestu k dosažení 100% + holding
- Zajistí, že během holdingu baterie zůstane na 100% (režim HOME III)

---

### 4.8 Stavy a Monitoring

**Sensor `sensor.oig_{box_id}_battery_balancing` states:**
- `standby`: Čeká (dny < 7, není naplánováno)
- `planned`: Naplánováno (zobrazit start a náklady)
- `opportunistic`: Probíhá opportunistický balancing (baterie dosáhla 100% přirozeně)
- `charging`: Probíhá plánované nabíjení k 100%
- `holding`: Drží na 100%, probíhá balancing (během `hold_hours`)
- `completed`: Balancing dokončen

**Metadata atributy:**
- `days_since_last`: Počet dní od posledního balancingu
- `last_balancing`: Timestamp konce posledního holdingu (ISO 8601)
- `next_check`: Kdy proběhne další kontrola OTE cen (každých 15 min)
- `next_calculation`: Kdy proběhne přepočet plánu (po načtení OTE ve 13:00+)
- `planned_window`: Dict `{target_time, holding_start, holding_end, total_cost, mode}`
- `mode`: "economic", "forced", "opportunistic"
- `time_remaining`: Čas do startu/konce ve formátu "HH:MM"

**Status ikony:**
- 🟢 OK (dny < 7, není urgentní)
- 🟡 Plánováno (naplánováno okno)
- 🔴 Forced (den 7+, musí proběhnout)

---

## BR-7: Safety Margins & Reserves

### Účel
Definovat bezpečnostní rezervy a limity pro ochranu baterie a sítě.

### 7.1 Minimální Kapacita (Primary Reserve)
**Požadavek:** `min_capacity_percent` (viz BR-0.2) zajišťuje základní bezpečnostní rezervu.

**Pravidla:**
- Uživatel si nastavuje vlastní rezervu (default 33%, rozsah hardware_min až target)
- HARD constraint - plán NIKDY nesmí klesnout pod tuto úroveň (viz BR-0.3)
- Tato rezerva pokrývá nouzové scénáře (blackout, výpadek sítě, nepředvídaná spotřeba)

**Poznámka:** Není potřeba samostatná "blackout reserve" - `min_capacity` ji poskytuje.

---

### 7.2 Weather Risk Reserve (ČHMÚ Varování)
**Požadavek:** Při meteorologickém varování (ČHMÚ) automaticky zvýšit cílovou kapacitu baterie nebo aktivovat emergency režim.

**Konfigurace (config flow parameters):**
- `weather_risk_enabled`: True/False (povolit weather risk management)
- `weather_risk_alert_level`: Výběr minimální úrovně varování pro aktivaci
  - Možnosti: "yellow" (žlutá), "orange" (oranžová), "red" (červená)
- `weather_risk_phenomena`: Výběr meteorologických jevů, které aktivují režim
  - Možnosti: "storm" (bouřka), "wind" (vítr), "snow" (sníh), "ice" (led), "all" (všechny)
- `weather_risk_target_soc`: Cílový SoC při aktivním varování (default 90%, rozsah 60-100%)
- `weather_risk_emergency_mode`: True/False (aktivovat emergency režim pro vybrané úrovně)
- `weather_risk_emergency_levels`: Výběr úrovní pro emergency režim
  - Možnosti: "orange" (oranžová), "red" (červená)
  - Default: "red" (pouze červená)

**Frontend konfigurace:**
- Průvodce v dashboard (NE v config flow) pro snadné nastavení
- Uložit výsledek do config entry options
- Zobrazit aktuální stav (aktivní varování, úroveň, režim, zbývající čas)

---

#### 7.2.1 Běžný Režim (Emergency Mode = OFF)

**Chování při aktivním varování:**
1. Sledovat ČHMÚ sensor pro vybranou úroveň a jevy
2. Pokud je aktivní varování odpovídající konfiguraci → dočasně změnit:
   ```
   target_capacity = weather_risk_target_soc
   ```
3. Po skončení varování → vrátit `target_capacity` na normální hodnotu z config flow
4. Priorita: **P1** (stejná jako běžný target, viz BR-0.5)

**Důležité:**
- Weather risk **NEOVLIVŇUJE** `min_capacity` (to je HARD limit, nemění se)
- Mění pouze `target_capacity` (SOFT constraint)
- Algoritmus se snaží dosáhnout vyššího targetu, ale nepřerušuje běžný provoz

**Příklad:**
- Normálně: `target = 80%`
- ČHMÚ varování: červená, bouřka
- Config: `weather_risk_target_soc = 90%`
- Během varování: `target = 90%` → algoritmus nabije baterii výše

---

#### 7.2.2 Emergency Režim (Emergency Mode = ON)

**Požadavek:** Při kritických varováních (oranžová/červená) nabít baterii na 100% k začátku varování a držet do konce.

**Aktivace:**
- `weather_risk_emergency_mode = True` v config flow
- Aktivní ČHMÚ varování úrovně `weather_risk_emergency_levels` (např. červená)
- Jev odpovídá `weather_risk_phenomena`

**Chování:**
1. **Detekce varování:**
   - ČHMÚ sensor hlásí varování úrovně "red" (nebo "orange" pokud v config)
   - Načíst `warning_start` (začátek varování) a `warning_end` (konec varování)

2. **Naplánovat emergency nabíjení:**
   - Zavolat plánovač s emergency parametry:
   ```python
   request = {
     "current_soc_kwh": current,
     "target_soc_kwh": 15.36,              # 100%
     "target_time": warning_start,         # K začátku varování
     "holding_hours": None,                # Držet do konce varování
     "holding_end": warning_end,           # Explicitní konec holdingu
     "mode": "emergency_weather",          # Emergency režim
     "priority": "speed_over_cost"         # Rychlost > cena
   }
   ```

3. **Během emergency:**
   - Nabít na 100% K ZAČÁTKU varování (nejlevnější cesta do `warning_start`)
   - Držet na 100% režimem **HOME III** (nedovolit vybíjení)
   - Kompenzovat spotřebu ze sítě
   - **Ignorovat `warning_end`** - držet dokud ČHMÚ sensor nehlásí konec varování

4. **Ukončení:**
   - ČHMÚ sensor změní stav z "active" → "inactive" (varování pominulo)
   - Ukončit holding
   - Vrátit se k běžnému automatic plánování

**Plánovač - emergency režim:**
- Priorita: dosažení 100% > náklady
- Použít nejrychlejší cestu (může kombinovat UPS + HOME III)
- Holding: režim HOME III, kompenzace spotřeby
- `holding_end` je INFORMATIVNÍ - skutečný konec až po zrušení ČHMÚ varování

**Fallback:**
- Pokud nelze dosáhnout 100% do `warning_start` → nabít maximum možné
- Emergency plan: použít všechny dostupné zdroje (grid max rate)

**Příklad timeline:**
```
NOW:              2025-11-03 10:00 (SoC 60%)
Warning start:    2025-11-03 18:00 (ČHMÚ: červená výstraha)
Warning end:      2025-11-04 06:00 (plánovaný konec)

Emergency plán:
10:00-18:00: Nabíjení na 100% (kombinace FVE + UPS)
18:00-???:   Holding na 100% (HOME III) až do zrušení výstrahy
            (ignorovat warning_end, sledovat ČHMÚ sensor)
```

---

#### 7.2.3 Priorita Režimů

**Rozhodovací strom:**
1. Je aktivní ČHMÚ varování? → **ANO**
2. Je zapnutý `weather_risk_emergency_mode`?
   - **ANO** → Je úroveň v `emergency_levels`?
     - **ANO** → **EMERGENCY REŽIM** (nabít 100%, držet do konce)
     - **NE** → Běžný režim (zvýšit target)
   - **NE** → Běžný režim (zvýšit target)
3. Není varování → normální `target_capacity`

**Poznámka:** Emergency režim má prioritu nad balancingem - pokud probíhá emergency, balancing počká.

---

### 7.3 Export Limit Enforcement
**Požadavek:** Respektovat maximální výkon exportu do sítě podle invertoru.

**Implementace:** Viz BR-0.1 (Hardware Parameters) a BR-3.3 (Nákladová Funkce)

**Pravidla:**
- Sensor: `sensor.oig_{box_id}_invertor_prm1_p_max_feed_grid` (kW)
- Maximální export za 15min interval: `p_max_feed_grid * 0.25` kWh
- Enforcement: V simulaci intervalu (BR-3.2) omezit export_kwh tímto limitem
- Pokud přebytek > limit → zbytek nelze exportovat (ztráta nebo boiler)

**Žádná další pravidla nejsou potřeba.**

---

## BR-8: Frontend Requirements

### Účel
Definovat požadavky na frontend zobrazení a interakci s plánovacím systémem.

---

### 8.1 Základní Princip: Backend-Driven UI

**Požadavek:** Frontend JEN zobrazuje data z backendu, ŽÁDNÉ výpočty v FE.

**Pravidla:**
1. **Všechna data z BE API** - FE nikdy nepočítá režimy, náklady, SoC progression
2. **Read-only rendering** - FE jen renderuje JSON z API endpointů
3. **No business logic** - žádná rozhodovací logika, validace, optimalizace v FE
4. **Formatting only** - FE může formátovat data pro zobrazení (zaokrouhlení, jednotky, barvy)

**Zakázané v FE:**
- ❌ Výpočet nákladů intervalů
- ❌ Simulace battery SoC progression
- ❌ Rozhodování o režimech
- ❌ Validace constraints (min/target capacity)
- ❌ Optimalizační algoritmy
- ❌ Predikce spotřeby/výroby

**Povolené v FE:**
- ✅ Zobrazení dat z BE (timeline, grafy, tabulky)
- ✅ Formátování (čísla, datum/čas, jednotky)
- ✅ UI interakce (klikání, scroll, zoom)
- ✅ Vstupní formuláře (manual plan params)
- ✅ Volání BE API (fetch data, trigger actions)

---

### 8.2 Design Konzistence

**Požadavek:** Všechny nové pohledy MUSÍ respektovat stávající design systém.

**Design pravidla:**
1. **Stejný vizuální styl** jako aktuální dashboard
2. **Konzistentní barevná paleta** (gradienty, accent barvy)
3. **Jednotné komponenty** (cards, buttons, inputs)
4. **Responzivní layout** (grid system z current dashboard)
5. **Stejné ikony a typography**

**Reference:** Stávající `www/dashboard.html` a CSS styly.

**Nové komponenty:**
- Použít stávající design patterns
- Držet se grid layoutu
- Respektovat spacing a padding
- Konzistentní hover/active states

---

### 8.3 API Endpointy pro FE

**Požadavek:** FE přistupuje k datům pouze přes definované API endpointy (viz BR-2.7).

**Dostupné endpointy:**

```
GET  /api/oig_cloud/plan/active
Response: {
  "plan_id": "plan_abc123",
  "timeline": [
    {
      "interval": 0,
      "timestamp": "2025-11-02T15:00:00Z",
      "mode": 0,
      "mode_name": "HOME I",
      "battery_soc_kwh": 8.45,
      "battery_soc_percent": 55.0,
      "solar_kwh": 1.2,
      "consumption_kwh": 0.8,
      "grid_import_kwh": 0.0,
      "grid_export_kwh": 0.0,
      "spot_price_czk": 5.29,
      "export_price_czk": 2.15,
      "interval_cost_czk": 0.0
    },
    ...
  ],
  "metadata": {
    "plan_type": "automatic",
    "created_timestamp": "2025-11-02T15:00:00Z",
    "total_cost_czk": 42.50,
    "achievable": true,
    ...
  }
}

GET  /api/oig_cloud/plan/{plan_id}
Response: Stejná struktura jako /active

POST /api/oig_cloud/plan/calculate
Request: {
  "plan_type": "manual",
  "target_soc_percent": 90,
  "deadline": "2025-11-03T06:00:00Z",
  "holding_hours": 2
}
Response: Calculated plan (status "pending")

POST /api/oig_cloud/plan/apply/{plan_id}
Response: Applied plan (status "active")

POST /api/oig_cloud/plan/revert
Response: Reverted to automatic

GET  /api/oig_cloud/balancing/status
Response: {
  "state": "planned",
  "days_since_last": 5,
  "last_balancing": "2025-10-28T03:00:00Z",
  "next_deadline": "2025-11-04T23:59:00Z",
  "planned_window": {
    "target_time": "2025-11-03T22:00:00Z",
    "holding_start": "2025-11-03T22:00:00Z",
    "holding_end": "2025-11-04T01:00:00Z",
    "total_cost": 35.20,
    "mode": "economic"
  },
  "mode": "economic",
  "time_remaining": "18:30"
}

GET  /api/oig_cloud/weather_risk/status
Response: {
  "enabled": true,
  "active_warning": true,
  "warning_level": "red",
  "warning_phenomena": "storm",
  "warning_start": "2025-11-03T18:00:00Z",
  "warning_end": "2025-11-04T06:00:00Z",
  "emergency_mode": true,
  "current_target_soc": 100,
  "normal_target_soc": 80,
  "holding_active": false
}
```

**Pravidla:**
- FE volá API každých 15-60 sekund pro refresh (configurable)
- BE vrací VŽDY kompletní data (ne delta updates)
- FE re-renderuje podle nových dat

---

### 8.4 Dashboard Komponenty

**Požadavek:** Definovat jaké komponenty FE zobrazuje pro plánování.

#### 8.4.1 Timeline View (Hlavní Graf)

**Zobrazení:**
- **Graf SoC progression** - battery_soc_kwh v čase (linka)
- **Režimy jako pozadí** - barevné bloky podle mode (HOME I/II/III/UPS)
- **Min/Target kapacita** - horizontální čáry (červená/zelená)
- **Náklady intervalů** - bar chart pod timeline
- **FVE forecast** - žlutá area
- **Spotřeba forecast** - modrá area

**Interakce:**
- Zoom (scroll, pinch)
- Hover tooltip (detaily intervalu)
- Click interval → detail panel

**Data z BE:** `/api/oig_cloud/plan/active` → render timeline[]

---

#### 8.4.2 Plan Summary Card

**Zobrazení:**
- **Plan type** (automatic/manual)
- **Total cost** (Kč)
- **Final SoC** (kWh, %)
- **Achievable** (✅/❌)
- **Mode switches** (počet)
- **Created timestamp**

**Data z BE:** `/api/oig_cloud/plan/active` → metadata

---

#### 8.4.3 Balancing Status Card

**Zobrazení:**
- **Days since last** (s progress barem 0-7)
- **Status icon** (🟢/🟡/🔴)
- **Planned window** (pokud naplánováno)
  - Start time
  - Total cost
  - Mode (economic/forced)
- **Time remaining** (countdown)

**Data z BE:** `/api/oig_cloud/balancing/status`

**Interakce:**
- Click → detail modal s historií

---

#### 8.4.4 Weather Risk Status Card

**Zobrazení (pokud enabled):**
- **Active warning** (ano/ne)
- **Warning level** (žlutá/oranžová/červená badge)
- **Phenomena** (ikona + text)
- **Duration** (start → end)
- **Current target** (zvýšený SoC)
- **Emergency mode** (pokud aktivní)

**Data z BE:** `/api/oig_cloud/weather_risk/status`

**Interakce:**
- Click → weather risk config modal (dashboard průvodce)

---

#### 8.4.5 Manual Plan Creator

**Zobrazení:**
- **Input form:**
  - Target SoC (slider 60-100%)
  - Deadline (datetime picker)
  - Holding hours (optional, 0-12h)
- **Calculate button** → POST /plan/calculate
- **Preview** → zobrazit timeline + cost
- **Apply/Cancel buttons**

**Flow:**
1. User nastaví parametry
2. Click "Calculate" → BE vrací plan (pending)
3. FE zobrazí preview (timeline z BE)
4. User: "Apply" → POST /plan/apply → active
5. User: "Cancel" → DELETE /plan/{id}

**Data z BE:** Vše z API, FE jen posílá parametry a zobrazuje response.

---

#### 8.4.6 Simulation Comparison

**Zobrazení:**
- **List pending plans** (simulace)
- **Side-by-side timeline** (max 3 plány)
- **Cost comparison table**
- **Apply selected** button

**Flow:**
1. User vytvoří N simulací (manual plans)
2. FE volá GET /plan/{id} pro každou
3. Zobrazí všechny timeline vedle sebe
4. User vybere → Apply

---

### 8.5 Real-time Updates

**Požadavek:** FE pravidelně refreshuje data z BE.

**Strategie:**
- **Polling interval:** 30 sekund (configurable)
- **Endpoints to poll:**
  - `/api/oig_cloud/plan/active` (timeline může change každou hodinu)
  - `/api/oig_cloud/balancing/status` (změna stavu)
  - `/api/oig_cloud/weather_risk/status` (aktivní varování)

**Optimalizace:**
- Pokud FE vidí změnu `plan_id` → full refresh
- Pokud stejný plan → update jen metadata (cost může change)
- Background polling (i když tab není aktivní)

---

### 8.6 Error Handling

**Požadavek:** FE zobrazuje chyby z BE uživatelsky přívětivě.

**HTTP Status handling:**
- **200 OK** → render data
- **400 Bad Request** → zobrazit chybovou hlášku z BE (validation errors)
- **404 Not Found** → "Plan not found"
- **500 Server Error** → "Chyba serveru, zkuste to znovu"
- **Timeout** → "Server neodpovídá"

**Fallback:**
- Pokud API selže → zobrazit poslední úspěšná data
- Show warning banner "Data mohou být zastaralá"

---

### 8.7 Validace pouze v BE

**Požadavek:** FE NEVALIDUJE uživatelské vstupy (jen basic sanity check).

**FE validace (pouze UX):**
- ✅ Required fields filled
- ✅ Numeric range (min/max z config)
- ✅ Datetime format

**BE validace (business logic):**
- ❌ Min < Target constraint
- ❌ Feasibility check (dosažitelnost)
- ❌ Deadline vs available data
- ❌ Conflicts s balancing

**Workflow:**
- FE odešle data "as is"
- BE validuje → vrátí error response
- FE zobrazí chybu uživateli

---

### 8.8 Design Mockup Requirements

**Požadavek:** Před implementací vytvořit mockupy nových views.

**Proces:**
1. Navrhnout layout v stávajícím designu
2. Review (konzistence, UX)
3. Approve
4. Implementovat

**Nástroje:**
- Reuse stávající CSS třídy
- Komponenty z current dashboard
- Grid system 12-column

---

**Shrnutí BR-8:**
- ✅ FE = thin client (jen zobrazení)
- ✅ Všechny výpočty v BE
- ✅ Konzistentní design
- ✅ API-driven architecture
- ✅ Real-time polling
- ✅ Error handling
- ✅ Validace v BE

---
### 7.4 Grid Charging Limit Enforcement
**Požadavek:** Respektovat maximální rychlost nabíjení ze sítě (režim UPS).

**Implementace:** Viz BR-0.2 (User Configuration) a BR-1.4 (Režim HOME UPS)

**Pravidla:**
- Parametr: `home_charge_rate` (default 2.8 kW)
- Maximální nabití za 15min interval: `home_charge_rate * 0.25` kWh
- Enforcement: V režimu UPS (BR-1.4) omezit import_kwh tímto limitem
- Žádný dynamický limit ani tarif-based omezení

**Žádná další pravidla nejsou potřeba.**

---
