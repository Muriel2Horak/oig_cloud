# Boiler Config UI Optimization - Code Review

**Datum revize:** 2025-03-12
**Plán:** `.sisyphus/plans/boiler-config-ui-optimization.md`
**Revizor:** Atlas (Orchestrator)

---

## 📊 Souhrn Implementace

| Kategorie | Počet | Stav |
|-----------|-------|------|
| **Celkem tasků** | 14 | - |
| **Hotovo** | 0 | ✅ |
| **Částečně** | 1 | ⚠️ |
| **Zbývá** | 13 | 🔴 |
| **Final Review** | 4 (F1-F4) | ⏳ |

**Verdikt:** Plán je zatím **NEIMPLEMENTOVÁN**. Konstanty existují, ale žádná funkcionalita není hotová.

---

## 🔴 Tasky k Implementaci (13)

### Wave 1: Config Flow Foundation

#### Task 1: Add config_mode toggle (simple/advanced)
**Status:** ✅ HOTOVO
**Důkaz:**
```bash
$ grep -r "CONF_BOILER_CONFIG_MODE" /repos/oig-cloud/custom_components/oig_cloud/
custom_components/oig_cloud/const.py:43:CONF_BOILER_CONFIG_MODE = "boiler_config_mode"

$ grep "config_mode.*simple" /repos/oig-cloud/custom_components/oig_cloud/config/steps.py
custom_components/oig_cloud/config/steps.py:439:"config_mode": wizard_data.get("config_mode", "simple"),
```
**Implementace:**
- Přidána konstanta `CONF_BOILER_CONFIG_MODE = "boiler_config_mode"` v const.py:43
- Přidán `config_mode` jako první položka v `_build_boiler_options()` se default "simple"
- Umístěno u ostatních boiler konstant a jako první položka v dict

---

#### Task 2: Reorganize parameters by Simple/Advanced mode
**Status:** ❌ NENÍ IMPLEMENTOVÁNO (blokováno Task 1)
**Co chybí:**
- Logika zobrazení parametrů podle `config_mode`
- **Simple (5 parametrů):** enable_boiler, boiler_volume_l, boiler_target_temp_c, boiler_temp_sensor_top, boiler_deadline_time
- **Advanced (všechny ostatní):** boiler_temp_sensor_bottom, boiler_temp_sensor_position, boiler_has_alternative_heating, boiler_alt_cost_kwh, boiler_alt_energy_sensor, boiler_spot_price_sensor, boiler_plan_slot_minutes, boiler_stratification_mode, boiler_planning_horizon_hours, boiler_heater_switch_entity, boiler_circulation_pump_switch_entity, boiler_heater_power_kw_entity, boiler_alt_heater_switch_entity

---

#### Task 3: Implement backwards compatibility (default Advanced)
**Status:** ❌ NENÍ IMPLEMENTOVÁNO (blokováno Task 1, 2)
**Co chybí:**
- Migrace existujících config entry bez `config_mode`
- Default = "advanced" pro existující konfigurace
- Zachování chování pro existující uživatele

**Soubory k úpravě:**
- `custom_components/oig_cloud/__init__.py` - migrace config entry

---

### Wave 2: Backend Logic

#### Task 4: Wire stratification_mode to coordinator (fix hardcoded)
**Status:** ⚠️ ČÁSTEČNĚ IMPLEMENTOVÁNO
**Důkaz:**
```python
# V coordinator.py:212
mode="two_zone"  # <-- HARDCODED

# V utils.py:20
def calculate_stratified_temp(..., mode: str = "two_zone", ...)
```
**Co chybí:**
- Přečíst hodnotu z configu: `config.get(CONF_BOILER_STRATIFICATION_MODE, "two_zone")`
- Podpora všech 3 módů: "simple_avg", "two_zone", "gradient"
- Aktualizace `calculate_stratified_temp` pro podporu všech módů

**Soubory k úpravě:**
- `custom_components/oig_cloud/boiler/coordinator.py:212`
- `custom_components/oig_cloud/boiler/utils.py`

---

#### Task 5: Wire planning_horizon_hours to planner (fix hardcoded)
**Status:** ❌ NENÍ IMPLEMENTOVÁNO
**Důkaz:**
```python
# V planner.py:64
plan_end = plan_start + timedelta(days=1)  # <-- HARDCODED 24h
```
**Co chybí:**
- Přečíst hodnotu z configu: `config.get(CONF_BOILER_PLANNING_HORIZON_HOURS, 24)`
- Použít dynamický výpočet: `plan_end = plan_start + timedelta(hours=config_hours)`
- Validace: min 12h, max 72h

**Soubory k úpravě:**
- `custom_components/oig_cloud/boiler/planner.py:64`

---

#### Task 6: Implement heater_switch_entity control
**Status:** ❌ NENÍ IMPLEMENTOVÁNO
**Důkaz:**
```python
# Konstanta existuje v const.py:33
CONF_BOILER_HEATER_SWITCH_ENTITY = "boiler_heater_switch_entity"

# Ale není použita pro ovládání v coordinator.py
```
**Co chybí:**
- Implementovat ovládání podle plánovače
- Zapnout když: aktivní slot v plánu AND teplota < cílová - hystereze
- Vypnout když: není aktivní slot nebo teplota >= cílová
- Použít `hass.services.call("switch", "turn_on/off")`
- Logovat změny stavu

**Soubory k úpravě:**
- `custom_components/oig_cloud/boiler/coordinator.py` - `_async_update_data()`

---

#### Task 7: Implement circulation_pump_switch_entity control
**Status:** ❌ NENÍ IMPLEMENTOVÁNO
**Důkaz:**
```python
# Konstanta existuje v const.py:35
CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY = "boiler_circulation_pump_switch_entity"

# V api_views.py:224 se čte z configu, ale není použita pro ovládání
```
**Co chybí:**
- Implementovat ovládání v oknech spotřeby dle profilu
- Použít peak hours z `BoilerProfile`
- Zapnout v peak hours, vypnout mimo
- Nezávislé na heater stavu

**Soubory k úpravě:**
- `custom_components/oig_cloud/boiler/coordinator.py`
- `custom_components/oig_cloud/boiler/profiler.py` - peak hours detection

---

#### Task 8: Remove placeholder params from config flow
**Status:** ❌ NENÍ IMPLEMENTOVÁNO (blokováno Task 2, 3)
**Co chybí:**
- Odstranit z config flow UI:
  - `boiler_cold_inlet_temp_c` (nikdy nepoužito)
  - `boiler_two_zone_split_ratio` (hardcoded 0.5)
- Ponechat konstanty v `const.py` pro backwards compat
- Pouze nezobrazovat v config flow UI

**Soubory k úpravě:**
- `custom_components/oig_cloud/config/steps.py` - `_build_boiler_options()`

---

### Wave 3: V2 Dashboard UI

#### Task 9: Remove Debug panel from V2 dashboard
**Status:** ❌ NENÍ IMPLEMENTOVÁNO
**Důkaz:**
```typescript
// V components.ts:69-100
@customElement('oig-boiler-debug-panel')
export class OigBoilerDebugPanel extends LitElement {
  // ... plná implementace debug panelu
}
```
**Co chybí:**
- Odstranit `OigBoilerDebugPanel` komponentu
- Odstranit import a export
- Odstranit použití v `boiler-view.ts`

**Soubory k úpravě:**
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts`
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/index.ts`

---

#### Task 10: Improve Plan Info visual hierarchy
**Status:** ❌ NENÍ IMPLEMENTOVÁNO
**Důkaz:**
```typescript
// V components.ts:504-589
// Plan Info má 9 řádků bez seskupení:
// 1. Mix zdrojů
// 2. Slotů
// 3. Topení aktivní
// 4. Nejlevnější spot
// 5. Nejdražší spot
// 6. FVE okna (forecast)
// 7. Grid okna (forecast)
// 8. Od
// 9. Do
```
**Co chybí:**
- Seskupit do logických sekcí:
  - Základní info (Mix zdrojů, Slotů, Topení aktivní)
  - Cenové info (Nejlevnější spot, Nejdražší spot)
  - Forecast info (FVE okna, Grid okna)
  - Časové info (Od, Do)
- Přidat vizuální oddělení (nadpisy, padding)

**Soubory k úpravě:**
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts:504-589`

---

#### Task 11: Verify Config Section displays correct values
**Status:** ❌ NENÍ IMPLEMENTOVÁNO (blokováno Task 4, 5)
**Co chybí:**
- Aktualizovat `oig-boiler-config-section` aby zobrazovala aktuální hodnoty
- Přidat zobrazení `config_mode` (simple/advanced)
- Odstranit zobrazení deprecated parametrů (cold_inlet_temp, two_zone_split_ratio)

**Soubory k úpravě:**
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts` - `OigBoilerConfigSection`

---

### Wave 4: Integration + Verification

#### Task 12: Integration test - full cycle
**Status:** ❌ NENÍ IMPLEMENTOVÁNO (blokováno Task 4-8, 11)
**Co chybí:**
- End-to-end test všech změn
- Test workflow: Config → Backend → UI
- Ověření ovládání switchů

---

#### Task 13: Backwards compatibility test
**Status:** ❌ NENÍ IMPLEMENTOVÁNO (blokováno Task 12)
**Co chybí:**
- Test s mock staré konfigurace (bez config_mode)
- Ověření default = "advanced"
- Ověření entity names nezměněny

---

#### Task 14: End-to-end UI verification
**Status:** ❌ NENÍ IMPLEMENTOVÁNO (blokováno Task 9, 10, 12, 13)
**Co chybí:**
- Kompletní UI test V2 dashboardu
- Screenshoty všech sekcí
- Ověření absence Debug panelu
- Ověření Plan Info hierarchie

---

## ✅ Co Už Existuje (Připraveno k Použití)

### 1. Konstanty v `const.py`
Všechny potřebné konstanty jsou definovány:
```python
CONF_BOILER_STRATIFICATION_MODE = "boiler_stratification_mode"          # Řádek 30
CONF_BOILER_PLANNING_HORIZON_HOURS = "boiler_planning_horizon_hours"    # Řádek 41
CONF_BOILER_HEATER_SWITCH_ENTITY = "boiler_heater_switch_entity"        # Řádek 33
CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY = "boiler_circulation_pump_switch_entity"  # Řádek 35
CONF_BOILER_COLD_INLET_TEMP_C = "boiler_cold_inlet_temp_c"              # Řádek 24
CONF_BOILER_TWO_ZONE_SPLIT_RATIO = "boiler_two_zone_split_ratio"        # Řádek 31
```

### 2. API Views
V `api_views.py` se čtou hodnoty z configu, ale nejsou použity pro logiku:
```python
"stratification_mode": config.get(CONF_BOILER_STRATIFICATION_MODE)  # Řádek 215
"circulation_pump_switch_entity": config.get(CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY)  # Řádek 224
```

### 3. V2 Dashboard Struktura
- Komponenty existují v `www_v2/src/ui/features/boiler/components.ts`
- Potřebují úpravy podle tasků 9-11

---

## 🎯 Doporučené Prioritizace

### Fáze 1: Základ (Task 1-3)
1. Task 1: Simple/Advanced toggle
2. Task 2: Reorganizace parametrů
3. Task 3: Backwards compatibility

### Fáze 2: Backend (Task 4-8)
4. Task 4: stratification_mode (rychlé - one-liner)
5. Task 5: planning_horizon_hours (rychlé - one-liner)
6. Task 8: Remove placeholder params
7. Task 6: heater_switch_entity control (komplexnější)
8. Task 7: circulation_pump_switch_entity control (komplexnější)

### Fáze 3: UI (Task 9-11)
9. Task 9: Remove Debug panel
10. Task 10: Plan Info hierarchy
11. Task 11: Config Section update

### Fáze 4: Testy (Task 12-14 + F1-F4)
12. Task 12-14: Integration a E2E testy
13. F1-F4: Final verification

---

## 📁 Evidence a Artefakty

Tento soubor slouží jako baseline pro začátek práce na plánu.

**Související soubory:**
- Plán: `.sisyphus/plans/boiler-config-ui-optimization.md`
- Kód: `custom_components/oig_cloud/boiler/`
- UI: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/`

---

*Vygenerováno automaticky při revizi kódu.*
