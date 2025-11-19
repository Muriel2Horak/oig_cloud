# Analýza datových zdrojů - Kompletní přehled

**Datum analýzy:** 2. listopadu 2025, 12:30

## 📊 Dostupné datové zdroje

### 1️⃣ ACTIVE TIMELINE
**Zdroj:** `/api/oig_cloud/battery_forecast/{box_id}/timeline?type=active` → `timeline[]`

**Stav:** ❌ **PRÁZDNÝ** (0 bodů)

**Účel:**
- Body optimalizace (baseline vs active plán)
- Měl by obsahovat všechny body pro porovnání režimů
- **PROBLÉM:** Momentálně vrací prázdné pole!

**Datový formát:**
```json
{
  "time": "2025-11-02T12:15:00",
  "state": "completed|active|future",
  "planned": {"net_cost": 2.85},
  "actual": {"net_cost": 1.23}
}
```

---

### 2️⃣ TIMELINE_EXTENDED.TODAY
**Zdroj:** `/api/oig_cloud/battery_forecast/{box_id}/timeline?type=active` → `timeline_extended.today.intervals[]`

**Stav:** ✅ **FUNKČNÍ** (96 intervalů)

**Data:**
- **UPLYNULÉ:** 50 intervalů
  - Plán: 134.57 Kč
  - Skutečnost: 64.87 Kč

- **AKTIVNÍ:** 1 interval
  - Plán: 3.21 Kč
  - Skutečnost: 0.00 Kč

- **BUDOUCÍ:** 45 intervalů
  - Plán: 83.16 Kč

- **CELKEM DNE:**
  - Plán: 220.94 Kč
  - Skutečnost: 64.87 Kč

**Datový formát:**
```json
{
  "time": "2025-11-02T12:15:00",
  "planned": {
    "net_cost": 3.21,
    "mode": "HOME UPS",
    "soc": 15
  },
  "actual": {
    "net_cost": 1.23,
    "mode": "HOME I",
    "soc": 12
  }
}
```

---

### 3️⃣ UNIFIED_COST_TILE.TODAY
**Zdroj:** `/api/states/sensor.oig_2206237016_battery_forecast` → `attributes.unified_cost_tile.today`

**Stav:** ✅ **FUNKČNÍ**

**Data:**
- `plan_total_cost`: 220.26 Kč (celý den plán)
- `actual_total_cost`: 64.87 Kč (skutečnost dosud)
- `delta`: -69.70 Kč (úspora oproti plánu dosud)
- `completed_intervals`: 50/96
- `progress_pct`: 1.7%

**EOD Predikce:**
- `predicted_total`: 106.18 Kč
- `vs_plan`: -114.08 Kč (úspora oproti celému plánu)
- `vs_plan_pct`: 0.0% (chyba!)

**Výpočet EOD predikce:**
```python
drift_ratio = actual_so_far / planned_so_far  # 64.87 / 114.72 = 0.565
eod_prediction = actual_so_far + (planned_future * drift_ratio)
                = 64.87 + (83.16 × 0.565)
                = 64.87 + 46.99
                = 111.86 Kč  # (ne 106.18!)
```

**❓ NESROVNALOST:** EOD predikce neodpovídá výpočtu!

---

## 🎯 Co má být zobrazeno KDE

### 📱 HLAVNÍ STRÁNKA - Dlaždice DNES

**Aktuální stav:**
```
💰 DNES 52%
100 Kč         ← EOD predikce

✓ 65 Kč        ← actual_total_cost
→ 35 Kč        ← EOD - actual (106.18 - 64.87)
△ -52%         ← vs_plan_pct
```

**SPRÁVNĚ by mělo být:**
```
💰 DNES 52%
106 Kč         ← eod_prediction.predicted_total

✓ 65 Kč        ← actual_total_cost (skutečnost dosud)
→ 41 Kč        ← eod_prediction - actual (106 - 65)
△ -52%         ← eod_prediction.vs_plan_pct
```

**Zdroj dat:** `unified_cost_tile.today`

---

### 📋 DETAIL - Tab DNES

#### Sekce UPLYNULÉ
```
🔄 UPLYNULÉ
💰 64.87 Kč skutečnost (celkem: 134.57 Kč plán) ✅ -52%
```

**Data:**
- Součet všech uplynulých intervalů z `timeline_extended.today.intervals`
- Filtr: `interval_time < current_interval_time && actual exists`

**Zdroj:** `timeline_extended.today.intervals` (uplynulé)

---

#### Sekce AKTIVNÍ
```
🔥 AKTIVNÍ INTERVAL 1 INTERVAL
12:30 ⚡ HOME UPS
3.25 Kč plán 🔋 9%
Skutečně dosud: 0.30 Kč (9% plánu) 🔋 0.0%
```

**Data:**
- Aktuální 15min interval
- Plán: 3.21 Kč
- Skutečnost průběžná: 0.30 Kč

**Zdroj:** `timeline_extended.today.intervals` (aktivní)

---

#### Sekce BUDOUCÍ
```
📅 BUDOUCÍ
💰 83.16 Kč
```

**Data:**
- Součet všech budoucích intervalů z `timeline_extended.today.intervals`
- Filtr: `interval_time > current_interval_time`
- **POZOR:** Toto je **PLÁN**, ne predikce!

**Možnosti:**
1. **Varianta A - Čistý plán** (doporučuji)
   ```
   📅 BUDOUCÍ
   💰 83.16 Kč plán
   ```
   - Zobrazuje, co je naplánováno
   - Jasné, srozumitelné

2. **Varianta B - S predikcí**
   ```
   📅 BUDOUCÍ
   💰 47.00 Kč předpověď (plán: 83.16 Kč)
   ```
   - Aplikuje drift_ratio: 83.16 × 0.565 = 47.00 Kč
   - Ukazuje realistický odhad
   - Více komplexní

**Zdroj:** `timeline_extended.today.intervals` (budoucí)

---

## 🔧 Matematická konzistence

### Kontrola součtů:

1. **TIMELINE_EXTENDED:**
   - Uplynulé plán: 134.57 Kč
   - Aktivní plán: 3.21 Kč
   - Budoucí plán: 83.16 Kč
   - **CELKEM:** 220.94 Kč ✅

2. **UNIFIED_COST_TILE:**
   - plan_total_cost: 220.26 Kč
   - **ROZDÍL:** 0.68 Kč ⚠️ (pravděpodobně zaokrouhlení)

3. **EOD PREDIKCE:**
   - Skutečnost dosud: 64.87 Kč
   - Budoucí predikce: 83.16 × 0.565 = 46.99 Kč
   - **EOD = 111.86 Kč** (vs 106.18 Kč v datech) ❌

### ❗ NALEZENÉ PROBLÉMY:

1. **EOD predikce nesedí** - rozdíl 5.68 Kč
2. **Active timeline je prázdný** - nelze použít pro detail
3. **vs_plan_pct je 0.0%** - mělo by být -51.8%

---

## ✅ DOPORUČENÍ - Konzistentní logika

### Pro HLAVNÍ STRÁNKU (dlaždice DNES):

```javascript
const eodPredicted = unifiedCostData.today.eod_prediction.predicted_total;
const actualSoFar = unifiedCostData.today.actual_total_cost;
const remaining = eodPredicted - actualSoFar;

// Zobrazit:
// Hlavní číslo: eodPredicted (106 Kč)
// ✓ actualSoFar (65 Kč)
// → remaining (41 Kč)
// △ eod_prediction.vs_plan_pct (-52%)
```

### Pro DETAIL (tab DNES):

**Použít POUZE `timeline_extended.today.intervals`:**

```javascript
// UPLYNULÉ
const completed = intervals.filter(iv => iv.time < now && iv.actual);
const completedActual = sum(completed, 'actual.net_cost');
const completedPlan = sum(completed, 'planned.net_cost');

// AKTIVNÍ
const active = intervals.filter(iv => iv.time == now);
const activePlan = sum(active, 'planned.net_cost');
const activeActual = sum(active, 'actual.net_cost');

// BUDOUCÍ - VARIANTA A (čistý plán)
const future = intervals.filter(iv => iv.time > now);
const futurePlan = sum(future, 'planned.net_cost');

// Zobrazit:
// UPLYNULÉ: completedActual (plán: completedPlan)
// AKTIVNÍ: activePlan (dosud: activeActual)
// BUDOUCÍ: futurePlan
```

---

## 🎯 AKČNÍ BODY

1. ✅ **Opravit EOD predikci v Pythonu** - přepočítat správně
2. ✅ **Opravit vs_plan_pct** - není 0.0%, ale -51.8%
3. ✅ **BUDOUCÍ sekce** - zobrazovat čistý plán (83.16 Kč)
4. ✅ **Dlaždice DNES** - použít EOD - actual pro zbývající
5. ❓ **Active timeline** - zjistit proč je prázdný

---

## 📝 POZNÁMKY

- Všechna čísla jsou v Kč
- Drift ratio = 0.565 znamená, že utrácíme 56.5% plánu
- EOD predikce by měla být 111.86 Kč, ne 106.18 Kč
- Timeline_extended je jediný spolehlivý zdroj pro intervaly

---

## ⚠️ HOME II mimo plán (nejdražší spot)

### Co se stalo

- **19. 11. 12:45–14:15** a znovu v **15:00** běžel střídač v režimu **HOME II**, přestože aktivní plán očekával **HOME I** (vybíjení baterie).
- Po celou dobu zůstala baterie na **14.9 kWh**, místo aby podle plánu klesla k ~14.2 kWh – reálná spotřeba šla zbytečně ze sítě.
- Celkem se v těchto špičkových hodinách importovalo **0.666 kWh** místo plánovaných 0 kWh a utratilo se navíc **3.50 Kč**.

### Důkaz dat

| Čas (CET) | Plán (timeline_autonomy_live) | Reálná data (latest_timeline_live) | Spot [Kč/kWh] | Δ grid [kWh] | Δ náklad [Kč] |
|-----------|-------------------------------|------------------------------------|---------------|--------------|---------------|
| 12:45     | HOME I · grid 0.000 kWh       | HOME II · grid 0.140 kWh           | 4.89          | +0.140       | +0.68 |
| 13:00     | HOME I · grid 0.000 kWh       | HOME II · grid 0.035 kWh           | 4.89          | +0.035       | +0.17 |
| 13:15     | HOME I · grid 0.000 kWh       | HOME II · grid 0.035 kWh           | 4.93          | +0.035       | +0.17 |
| 13:30     | HOME I · grid 0.000 kWh       | HOME II · grid 0.035 kWh           | 5.11          | +0.035       | +0.18 |
| 13:45     | HOME I · grid 0.000 kWh       | HOME II · grid 0.035 kWh           | 5.39          | +0.035       | +0.19 |
| 14:00     | HOME I · grid 0.000 kWh       | HOME II · grid 0.089 kWh           | 4.98          | +0.089       | +0.44 |
| 14:15     | HOME I · grid 0.000 kWh       | HOME II · grid 0.089 kWh           | 5.37          | +0.089       | +0.48 |
| 15:00     | HOME I · grid 0.000 kWh       | HOME II · grid 0.206 kWh           | 5.71          | +0.206       | +1.17 |

> Zdroj: `timeline_autonomy_live.json` (plán) × `latest_timeline_live.json` (z reality) – viz jejich záznamy pro 19. listopadu 2025 kolem 12:45–15:00.

### Logy a přístup k datům

- **Historie režimů**: `mode_history_17_18.json` + `mode_history_2025-11-18.json` potvrzuje, že HA logbook opravdu přepínal `Home 1 ↔ Home 2` v několika minutových intervalech.
- **Aktuální logy HA**: přes `ssh ha` lze okamžitě zkontrolovat komponentu `service_shield` a volání `set_box_mode`:

  ```bash
  ssh ha "ha core logs | tail -n 200"
  ssh ha "ha core logs | grep -i 'oig_cloud' | tail -n 200"
  ```

- **API přístup**: soubor `.ha_config` obsahuje `HA_URL`, `HA_TOKEN` a `BOX_ID`, takže lze kdykoli stáhnout aktuální timeline:

  ```bash
  source .ha_config
  curl -H "Authorization: Bearer $HA_TOKEN" "$TIMELINE_API?type=active" > latest_timeline_live.json
  ```

### Dopad a akce

1. **Zjištění důvodu přepnutí** – chybí logy „oig_cloud.set_box_mode“ v časech 12:45–14:15, takže je třeba z HA logbooku/Recorderu zjistit, co vydalo příkaz „Home 2“ (možný fallback `service_shield` při chybě aktivního plánu).
2. **Monitoring** – přidat alert, když plánovaný mód ≠ skutečný mód > 1 interval (lze porovnávat `timeline_autonomy_live` vs. `/api/states/sensor.oig_*_box_prms_mode`).
3. **Validace plánu** – ověřit, že `plan_manager` skutečně aplikuje blok HOME I v časech s vysokými cenami; pokud se plán nepřehraje, je potřeba logovat důvod (např. `cannot_apply_plan`).
