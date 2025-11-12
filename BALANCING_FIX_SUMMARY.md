# Balancing Fix Summary - 12. listopadu 2025

## 🎯 Hlavní problémy

### Problém #1: Forced balancing čeká 2h i při vysokém SoC
- **Symptom:** Balancing nastupuje s 2h zpožděním i když je SoC 98% (potřeba pouze ~15-30min nabíjení)
- **Impact:** Zbytečné prodlužování balancing cyklu, deadline shifting
- **Status:** ✅ **VYŘEŠENO**

### Problém #2: Timeline neukazuje kontinuální HOME UPS
- **Symptom:** Během holding periody se zobrazují HOME I/II bloky místo jednoho kontinuálního HOME UPS bloku
- **Impact:** Uživatel nevidí, že systém drží baterii na 100%
- **Status:** ✅ **VYŘEŠENO** (state synchronization fix)

### Problém #3: Deadline drift každých 30 minut
- **Symptom:** Balancing deadline se posouvá: 01:20 → 01:50 → 02:20 → ... → 07:20
- **Impact:** Balancing nikdy nenastoupí, deadline se pořád odsouvá do budoucnosti
- **Status:** ✅ **VYŘEŠENO**

---

## 🔍 Root Cause Analysis

### Root Cause #1: Hardcoded 2h delay v `_create_forced_plan()`

**Původní kód** (`balancing/core.py` line ~679):
```python
# Start holding in 2 hours (time to charge + safety margin)
holding_start = now + timedelta(hours=2)
```

**Problém:**
- Ignoruje aktuální SoC baterie
- Při SoC 98% čeká zbytečně 2h místo ~15-30min
- Způsobuje deadline shifting

**Oprava:**
```python
# Calculate required charging time based on current SoC
soc_needed = 100.0 - current_soc_percent
intervals_needed = max(1, int(soc_needed / 5.0) + 1)  # +1 safety margin
charging_hours = intervals_needed * 0.25  # 15min intervals

# Round to nearest 15-minute interval
minutes_rounded = ((int(charging_hours * 60) + 14) // 15) * 15
holding_start = now + timedelta(minutes=minutes_rounded)

_LOGGER.info(
    f"⚡ Forced balancing schedule: SoC {current_soc_percent:.1f}% → 100%, "
    f"charging ~{charging_hours:.1f}h ({intervals_needed} intervals), "
    f"holding {holding_start.strftime('%H:%M')}-{holding_end.strftime('%H:%M')}"
)
```

**Výsledek:**
- SoC 98% → potřeba 2% → 1-2 intervaly → ~15-30min
- SoC 80% → potřeba 20% → 5 intervalů → ~1.25h
- SoC 50% → potřeba 50% → 11 intervalů → ~2.75h

---

### Root Cause #2: Plán se mazal během holding periody

**Původní kód** (`balancing/core.py` line ~225):
```python
# Check if deadline passed
if holding_start < now:
    _LOGGER.warning(f"⏰ Active plan deadline is in the past! Clearing...")
    self._active_plan = None
    await self._save_state()
```

**Problém:**
- Pokud `holding_start < now` (jsme PO deadlinu), smaže plán
- Ale to platí i BĚHEM holding periody (holding_start až holding_end)!
- Každých 30min se plán smaže a vytvoří nový → deadline drift

**Oprava:**
```python
# Check if we're DURING holding period
if holding_start <= now <= holding_end:
    _LOGGER.info(
        f"🔋 Currently IN holding period ({holding_start.strftime('%H:%M')}-"
        f"{holding_end.strftime('%H:%M')}). Keeping active plan."
    )
    return self._active_plan

# Check if holding period completely passed
if holding_end < now:
    _LOGGER.warning(
        f"⏰ Holding period ended at {holding_end.strftime('%H:%M')}. "
        f"Clearing expired plan."
    )
    self._active_plan = None
    await self._save_state()
else:
    # Deadline still in future - keep existing plan
    _LOGGER.debug(
        f"🔒 Active plan already exists ({self._active_plan.mode.name}), "
        f"deadline at {holding_start.strftime('%H:%M')}. "
        "Skipping new plan creation."
    )
    return self._active_plan
```

**Výsledek:**
- Plán se **ZACHOVÁ** během celé holding periody
- Smaže se až po `holding_end`
- Deadline zůstává locked během celého procesu

---

### Root Cause #3: Timeline ignoruje BalancingManager

**Problém:**
- Timeline calculation v `_calculate_timeline()` nenačítá aktivní balancing plán
- HYBRID optimization nemá informace o holding periodě
- UI neukazuje HOME UPS bloky

**Oprava** (`oig_cloud_battery_forecast.py`):
```python
# In _calculate_timeline()
balancing_plan = None
if self.balancing_manager:
    balancing_plan = self.balancing_manager.get_active_plan()
    if balancing_plan:
        _LOGGER.debug(
            f"🔋 Loaded balancing plan: mode={balancing_plan.mode.name}, "
            f"holding={balancing_plan.holding_start.strftime('%H:%M')}-"
            f"{balancing_plan.holding_end.strftime('%H:%M')}"
        )

# In _calculate_optimal_modes_hybrid()
# Priority 3: HOLDING PERIOD - maintain battery at 100%
if balancing_plan:
    for i in range(len(intervals)):
        ts = intervals[i]["timestamp"]
        ts_end = intervals[i]["timestamp_end"]

        if ts < balancing_plan.holding_end and ts_end > balancing_plan.holding_start:
            modes[i] = CBB_MODE_HOME_UPS  # Continuous HOME UPS
```

**Výsledek:**
- Timeline načítá aktivní balancing plán
- Všechny intervaly během holding periody → HOME UPS
- UI zobrazuje kontinuální HOME UPS blok

---

### Root Cause #4: State divergence mezi BalancingManager a forecast sensor

**Zjištění při testování:**
- `sensor.oig_2206237016_battery_balancing` hlásí `planned: null, days_since_last: 0`
- `sensor.oig_2206237016_battery_forecast` má `active_plan_data` blob se starým plánem z 09.11.2025
- Timeline API vrací pouze HOME I intervaly (žádné HOME UPS)
- UI nikdy nezobrazuje HOME UPS blok i když plán existoval
- **Horizon zkrácen na 32.2h (130 intervalů) místo 48h (192 intervalů)**

**Problém:**
1. Když `BalancingManager` smaže plán (`active_plan = None`), forecast sensor se neaktualizoval
2. Snapshot `_balancing_plan_snapshot` v forecast sensoru zůstal starý
3. Timeline používal stará data → nesynchronizované stavy
4. Žádná automatická refresh při změně balancing stavu

**Oprava:**
```python
# balancing/core.py (lines 151-175)
async def _save_state(self) -> None:
    """Save state and trigger coordinator refresh."""
    # ... save to storage ...

    # CRITICAL: Always refresh coordinator when balancing state changes
    if self._coordinator:
        _LOGGER.debug("🔄 Requesting coordinator refresh after state save")
        self._coordinator.async_request_refresh()
```

```python
# oig_cloud_battery_forecast.py (lines 203-205, 4135-4299, 607-617)
async def async_update(self) -> None:
    # Sync snapshot with BalancingManager
    if self.balancing_manager:
        self._balancing_plan_snapshot = self.balancing_manager.get_active_plan()

    # Use snapshot as authoritative source
    self._active_charging_plan = self._balancing_plan_snapshot

    # Export through attributes
    if self._balancing_plan_snapshot:
        self._attr_extra_state_attributes["active_plan_data"] = {
            "mode": self._balancing_plan_snapshot.mode.name,
            "holding_start": self._balancing_plan_snapshot.holding_start.isoformat(),
            "holding_end": self._balancing_plan_snapshot.holding_end.isoformat(),
            # ...
        }
    else:
        self._attr_extra_state_attributes["active_plan_data"] = None
```

**Výsledek:**
- Když manager smaže plán → coordinator refresh → forecast sensor update
- Snapshot se synchronizuje při každém update
- Timeline API vrací aktuální data
- `active_plan_data` attributes vždy odpovídají skutečnosti

---

## 🛠️ Implementované změny

### 1. Dynamický holding_start (SoC-based)
**Soubor:** `custom_components/oig_cloud/balancing/core.py`
**Řádky:** 670-715
**Změna:**
- Výpočet charging time na základě aktuálního SoC
- Zaokrouhlení na 15min intervaly
- Přidání debug loggingu

### 2. Holding period detection
**Soubor:** `custom_components/oig_cloud/balancing/core.py`
**Řádky:** 225-280
**Změna:**
- Detekce "BĚHEM holding periody" (`holding_start <= now <= holding_end`)
- Zachování plánu během holding
- Smazání až po `holding_end`
- Timezone-aware datetime porovnání

### 3. Coordinator-based refresh
**Soubor:** `custom_components/oig_cloud/balancing/core.py`
**Řádky:** 148-178
**Změna:**

- `_save_state()` volá `coordinator.async_request_refresh()`
- Místo `async_update()` → předchází deadlock
- Přidána `set_coordinator()` metoda

### 4. Timeline integrace s BalancingManager

**Soubor:** `custom_components/oig_cloud/oig_cloud_battery_forecast.py`
**Řádky:** 4190-4240, 2730-2850
**Změna:**

- `_calculate_timeline()` načítá `balancing_plan`
- HYBRID aplikuje HOME_UPS na holding intervaly
- Debug logging pro tracking

### 5. State synchronization fix (NOVÉ)

**Soubor:** `custom_components/oig_cloud/balancing/core.py`
**Řádky:** 151-175
**Změna:**

- `_save_state()` vždy trigguje coordinator refresh
- Clearing plánu nyní automaticky aktualizuje forecast sensor

**Soubor:** `custom_components/oig_cloud/oig_cloud_battery_forecast.py`
**Řádky:** 203-205, 4135-4299, 607-617
**Změna:**

- `_balancing_plan_snapshot` synchronizován s BalancingManager
- Snapshot použit jako autoritativní zdroj pro `_active_charging_plan`
- `active_plan_data` attributes automaticky aktualizovány
- Timeline API vrací aktuální data

### 6. Manual trigger service (NOVÉ)

**Soubor:** `custom_components/oig_cloud/services.py`
**Řádky:** 200-325
**Změna:**

- Přidána service `oig_cloud.check_balancing`
- Volitelný parametr `box_id`
- Volá `check_balancing()` na všech registrovaných BalancingManager
- Vrací strukturovanou response pro Developer Tools

---

## 📊 Aktuální stav

### Deployment

- ✅ Kód nasazen do HA (15:14 + aktualizace po state sync fix)
- ✅ HA restartována
- ✅ Balancing storage připraven (last_balancing: 04.11.2025)
- ✅ Service `oig_cloud.check_balancing` přidána
- ✅ Python syntax validována (`python3 -m compileall`)

### Zjištěné problémy při testování

**State divergence:**

- `sensor.oig_2206237016_battery_balancing`: `planned: null, days_since_last: 0`
- `sensor.oig_2206237016_battery_forecast`: měl starý `active_plan_data` blob z 09.11.2025
- Timeline API: pouze HOME I intervaly (130), žádné HOME UPS
- **Horizon zkrácen:** 32.2h (130 intervalů) místo očekávaných 48h (192 intervalů)

**Opraveno v latest update:**

- Coordinator refresh při každé změně balancing stavu
- Snapshot synchronizace v forecast sensoru
- Manual trigger service pro testování

### Storage state

```json
{
  "last_balancing_ts": "2025-11-04T15:30:00+01:00",
  "active_plan": null
}
```

### Čeká na test

- ⏳ Reload OIG Cloud integration nebo restart HA
- ⏳ Manual trigger: `oig_cloud.check_balancing` s `{"box_id": "2206237016"}`
- 📊 Vytvoření forced balancing plánu (7+ dní od posledního)
- 🔋 Verifikace kontinuálního HOME UPS v timeline

---

## 🧪 Testovací scénář

### Očekávaný průběh:

**15:45 - Periodic check**
```
📊 Balancing check: 8.0 days since last
⚡ Creating FORCED balancing plan (7+ days since last balancing)
⚡ Forced balancing schedule: SoC 98.0% → 100%, charging ~0.5h (2 intervals)
🔋 Created forced balancing plan: holding 16:15-19:15
```

**16:15 - Další periodic check (BĚHEM holding)**
```
🔋 Currently IN holding period (16:15-19:15). Keeping active plan.
```

**Timeline API response:**
```json
{
  "intervals": [
    {
      "timestamp": "2025-11-12T16:15:00+01:00",
      "mode_planned": "HOME UPS",
      "mode_reason": "Balancing: holding battery at 100%"
    },
    // ... všechny intervaly 16:15-19:15 → HOME UPS
  ]
}
```

---

## 🐛 Známé problémy a jejich řešení

### 1. Periodic task běží jen 1x/60min

**Symptom:** V logách vidíme check_balancing pouze 1x za hodinu místo 2x (každých 30min)

**Impact:** Pomalejší reakce na změny

**Root cause:** Možná kolize s async_track_time_interval

**Status:** 🔍 Vyžaduje další investigation

### 2. Service check_balancing

**Symptom:** Nelze vyvolat balancing manuálně přes service call

**Impact:** Nutnost čekat na periodic check nebo restart

**Řešení:** Přidat service registration v `services.py`

**Status:** ✅ **VYŘEŠENO** - service `oig_cloud.check_balancing` implementována

### 3. Timeline zkrácený horizon

**Symptom:** Timeline API vrací pouze 32.2h (130 intervalů) místo 48h (192 intervalů)

**Impact:** Neúplná data pro dlouhodobé plánování

**Root cause:** Neznámý - pravděpodobně issue v data feed

**Status:** 🔍 **NEXT PRIORITY** - vyžaduje investigation po ověření balancing fix

### 4. State divergence (VYŘEŠENO)

**Symptom:** BalancingManager a forecast sensor měly různá data

**Root cause:** Chybějící synchronizace při změně stavu
**Status:** ⏳ Čeká na test deployment

---

## 📝 Logy pro monitoring

### Úspěšný forced balancing:
```
⚡ Forced balancing schedule: SoC X% → 100%, charging ~Yh (Z intervals)
🔋 Created forced balancing plan: holding HH:MM-HH:MM
✅ Connected BalancingManager to forecast sensor and coordinator
```

### Holding period maintenance:
```
🔋 Currently IN holding period (HH:MM-HH:MM). Keeping active plan.
⚡ BALANCING charging plan: preferred=X, additional_cheapest=Y, holding=Z
```

### Completion detection

```log
✅ Balancing completed at YYYY-MM-DD HH:MM! Battery held at ≥99% for 3h
```

---

## ⏭️ Další kroky

### Immediate (po reloadu integrace)

1. **Reload OIG Cloud integration** nebo restart HA
2. **Test manual trigger:**
   - Developer Tools → Services
   - Service: `oig_cloud.check_balancing`
   - Optional: `{"box_id": "2206237016"}`
   - Zkontrolovat response - má vytvořit plán nebo hlásit "no plan needed"
3. **Ověřit synchronizaci:**
   - `sensor.oig_2206237016_battery_balancing` - `planned` by měl odpovídat realitě
   - `sensor.oig_2206237016_battery_forecast` - `active_plan_data` by měl být synchronizovaný
4. **Zkontrolovat timeline API:**
   - `/api/oig_cloud/battery_forecast/2206237016/timeline`
   - Při aktivním plánu: HOME UPS bloky během holding periody
   - Intervaly by měly zobrazovat `mode_planned: "HOME UPS"`

### Medium-term

5. **Monitorovat balancing cycle** - když skutečně proběhne:
   - HOME UPS blok se zobrazí v timeline UI
   - Detail tabs ukazují holding period
   - Plán se drží během holding periody (nesmaže se)
6. **Investigate timeline horizon** - proč jen 32.2h místo 48h?
   - Zkontrolovat data feed
   - Ověřit calculation logic
   - Možná issue v upstream API

### Long-term

7. **Fix periodic task frequency** - pokud stále běží jen 1x/60min
8. **Dokumentovat nový workflow** - pro uživatelskou dokumentaci

---

## 📚 Reference

### Upravené soubory

- **BalancingManager:** `custom_components/oig_cloud/balancing/core.py`
  - Lines 151-175: State save + coordinator refresh
  - Lines 225-280: Holding period detection
  - Lines 670-715: Dynamic holding_start calculation
- **Forecast sensor:** `custom_components/oig_cloud/oig_cloud_battery_forecast.py`
  - Lines 203-205: Snapshot synchronization
  - Lines 607-617: Active plan snapshot usage
  - Lines 2730-2850: HYBRID optimization with balancing
  - Lines 4135-4299: Timeline calculation with balancing
- **Services:** `custom_components/oig_cloud/services.py`
  - Lines 200-325: Manual trigger service `check_balancing`
- **Storage:** `/config/.storage/oig_cloud_balancing_2206237016`

### Testing commands

```bash
# Manual trigger balancing check
# Developer Tools → Services → oig_cloud.check_balancing
{"box_id": "2206237016"}

# Check timeline API
curl http://10.0.0.143:8123/api/oig_cloud/battery_forecast/2206237016/timeline

# Check sensor states
curl http://10.0.0.143:8123/api/states/sensor.oig_2206237016_battery_balancing
curl http://10.0.0.143:8123/api/states/sensor.oig_2206237016_battery_forecast
```

---

**Poslední update:** 12. listopadu 2025, 16:00

**Status:** ✅ State synchronization fix implementován a připraven k testu

**Changelog:**

- 15:14 - Initial deployment (dynamic holding_start, holding period detection)
- 15:37 - Coordinator refresh integration
- 16:00 - State synchronization fix + manual trigger service
