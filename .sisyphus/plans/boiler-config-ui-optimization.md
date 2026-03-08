# Boiler Config & V2 Dashboard Optimization

## TL;DR

> **Quick Summary**: Optimalizace boiler modulu - zjednodušení config flow (z 22 na ~13 aktivních parametrů) s Simple/Advanced toggle, implementace nepoužívaných parametrů (heater_switch, circulation_pump), oprava hardcoded hodnot (stratification_mode, planning_horizon), a zlepšení V2 dashboard UI (odstranění Debug panelu, vylepšení vizuální hierarchie Plan Info).
>
> **Deliverables**:
> - Simple/Advanced toggle v config flow
> - Implementace boiler_heater_switch_entity (ovládání dle plánovače)
> - Implementace circulation_pump_switch_entity (dle profilu spotřeby)
> - Oprava hardcoded stratification_mode a planning_horizon_hours
> - Odstranění placeholder parametrů (cold_inlet_temp, two_zone_split_ratio)
> - Odstranění Debug panelu z V2 dashboard
> - Vylepšení vizuální hierarchie Plan Info (9 řádků)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 vlny (Config, Backend, UI)
> **Critical Path**: Task 1 → Task 2,3,4,5 → Task 6,7,8,9 → Task 10,11,12 → F1-F4

---

## Context

### Original Request
Uživatel chce optimalizovat boiler modul - v config flow je 22 parametrů, z nichž mnohé nedávají smysl nebo se nepoužívají. V2 dashboard má UX/UI problémy (příliš mnoho informací, nejasné ovládání).

### Interview Summary
**Key Discussions**:
- Identifikováno 9 placeholder parametrů z 22 (konfigurovatelné ale nikdy nepoužité v kódu)
- Rozhodnutí implementovat nepoužívané parametry místo jejich odstranění
- Simple/Advanced toggle pro config flow (5 parametrů vs všechny)
- Odstranění Debug panelu z V2 dashboardu
- Vylepšení vizuální hierarchie Plan Info (ponechat všech 9 řádků ale lépe seskupit)
- Paralelní práce na configu a UI

**Research Findings**:
- `boiler_stratification_mode` je hardcoded na "two_zone" v coordinator.py:212
- `boiler_planning_horizon_hours` je hardcoded na 24h v planner.py:64
- `boiler_cold_inlet_temp_c` se nikde nepoužívá
- `boiler_heater_switch_entity` je definováno ale nikdy nepoužito pro ovládání
- `boiler_circulation_pump_switch_entity` je definováno ale nikdy nepoužito
- V2 dashboard má 12 sekcí, Debug panel je matoucí

### Metis Review
**Identified Gaps (addressed)**:
- Chybějící specifikace algoritmu pro heater_switch_entity → vyřešeno: použít existující plánovač
- Chybějící specifikace pro circulation_pump → vyřešeno: zapnout v oknech spotřeby dle profilu
- Nejasná definice Simple/Advanced split → vyřešeno: 5 základních parametrů
- Nejasnosti ohledně Debug panelu → vyřešeno: odstranit úplně
- Backwards compatibility → vyřešeno: default = Advanced pro existující konfigurace

---

## Work Objectives

### Core Objective
Zjednodušit boiler konfiguraci pro běžné uživatele (Simple/Advanced toggle), implementovat skutečné použití definovaných switch entit (heater, circulation_pump), opravit hardcoded konfigurační hodnoty, a vylepšit UX V2 dashboardu.

### Concrete Deliverables
1. Simple/Advanced toggle v config flow s jasným rozdělením parametrů
2. Implementace ovládání boiler_heater_switch_entity podle existujícího plánovače
3. Implementace ovládání circulation_pump_switch_entity v oknech spotřeby dle profilu
4. Oprava hardcoded stratification_mode (respektovat konfiguraci)
5. Oprava hardcoded planning_horizon_hours (respektovat konfiguraci)
6. Odstranění nepoužívaných parametrů z config flow (cold_inlet_temp, two_zone_split_ratio)
7. Odstranění Debug panelu z V2 dashboard komponent
8. Vylepšení vizuální hierarchie Plan Info sekce
9. Backwards compatibility pro existující konfigurace

### Definition of Done
- [ ] Simple/Advanced toggle funguje a zobrazuje správné parametry
- [ ] boiler_heater_switch_entity se skutečně zapíná/vypíná podle plánu
- [ ] circulation_pump_switch_entity se zapíná v oknech spotřeby dle profilu
- [ ] stratification_mode respektuje konfiguraci (ne hardcoded two_zone)
- [ ] planning_horizon_hours respektuje konfiguraci (ne hardcoded 24h)
- [ ] Placeholder parametry odebrány z config flow
- [ ] Debug panel odstraněn z V2 dashboard
- [ ] Plan Info má lepší vizuální hierarchii
- [ ] Existující konfigurace fungují bez změn (default Advanced)
- [ ] QA evidence uložena v `.sisyphus/evidence/`

### Must Have
- Simple/Advanced toggle v config flow
- Implementace heater_switch_entity (ovládání dle plánovače)
- Implementace circulation_pump_switch_entity (dle profilu)
- Oprava stratification_mode hardcode
- Oprava planning_horizon_hours hardcode
- Odstranění Debug panelu z V2
- Backwards compatibility (default Advanced)

### Must NOT Have (Guardrails)
- Žádné BREAKING CHANGES pro existující konfigurace
- Žádné odstranění funkcionality (jen reorganizace a implementace)
- Žádné změny entity names (zlobí automatizace uživatelů)
- Žádné přidávání nových parametrů nad rámec existujících
- Žádné zásadní přepisy algoritmů (pouze wiring config do existující logiky)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (máme pytest v tests/)
- **Automated tests**: Tests-after (pro nové ovládání switchů)
- **Framework**: pytest
- **Policy**: Implement → Verify → Commit

### QA Policy
Každý task obsahuje minimálně:
- 1 happy-path scenario
- 1 failure/edge scenario
- Evidence do `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`

### Evidence Requirements
- Config flow test: screenshot nebo záznam interakce
- Switch control test: logy zapnutí/vypnutí
- Dashboard test: screenshot V2 UI
- Backwards compat test: ověření existující config funguje

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Config Flow - Foundation):
├── Task 1: Add config_mode toggle (simple/advanced)
├── Task 2: Reorganize parameters by mode
└── Task 3: Implement backwards compatibility (default advanced)

Wave 2 (Backend Logic - MAX PARALLEL):
├── Task 4: Wire stratification_mode to coordinator
├── Task 5: Wire planning_horizon_hours to planner
├── Task 6: Implement heater_switch_entity control
├── Task 7: Implement circulation_pump_switch_entity control
└── Task 8: Remove placeholder params from config flow

Wave 3 (V2 Dashboard UI):
├── Task 9: Remove Debug panel from components.ts
├── Task 10: Improve Plan Info visual hierarchy
└── Task 11: Verify Config Section displays correct values

Wave 4 (Integration + Verification):
├── Task 12: Integration test - full cycle
├── Task 13: Backwards compatibility test
└── Task 14: End-to-end UI verification

Wave FINAL (Independent Review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review
├── Task F3: Real manual QA
└── Task F4: Scope fidelity check

Critical Path: Task 1 → Task 4,5,6,7,8 → Task 9,10,11 → Task 12,13,14 → F1-F4
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | - | 2, 3 |
| 2 | 1 | 3, 8 |
| 3 | 1, 2 | 4, 5, 6, 7, 8 |
| 4 | 3 | 12, 13, 14 |
| 5 | 3 | 12, 13, 14 |
| 6 | 3 | 12, 13, 14 |
| 7 | 3 | 12, 13, 14 |
| 8 | 2, 3 | 12, 13, 14 |
| 9 | - | 14 |
| 10 | - | 14 |
| 11 | 4, 5 | 14 |
| 12 | 4, 5, 6, 7, 8, 11 | 13, 14 |
| 13 | 12 | 14 |
| 14 | 9, 10, 12, 13 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — all `quick` (config flow changes)
- **Wave 2**: 5 tasks — `quick` x2, `unspecified-high` x3 (backend logic)
- **Wave 3**: 3 tasks — all `visual-engineering` (Lit/frontend)
- **Wave 4**: 3 tasks — `unspecified-high` x2, `visual-engineering` x1
- **FINAL**: 4 tasks — `oracle`, `unspecified-high` x2, `deep` x1

---

## TODOs

- [ ] 1. Add config_mode toggle (simple/advanced) to config flow

**What to do**:
- Přidat nový parametr `config_mode` s volbami "simple" a "advanced"
- Výchozí hodnota pro nové instalace: "simple"
- Uložit do config entry data

**Must NOT do**:
- Neměnit existující parametry, jen přidat nový toggle
- Nevytvářet nové kroky config flow, jen přidat field do existujícího

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 2, 3
- **Blocked By**: None

**References**:
- `custom_components/oig_cloud/config/steps.py` - _build_boiler_options funkce
- `custom_components/oig_cloud/const.py` - konstanty pro config

**Acceptance Criteria**:
- [ ] Nový parametr `config_mode` je dostupný v config flow
- [ ] Možnosti: "simple", "advanced"
- [ ] Výchozí hodnota: "simple"

**QA Scenarios**:
```
Scenario: Config mode toggle exists
Tool: Read file
Preconditions: None
Steps:
1. Read custom_components/oig_cloud/config/steps.py
2. Verify config_mode field exists in boiler options
Expected Result: Field defined with simple/advanced choices
Evidence: .sisyphus/evidence/task-1-config-mode-field.txt
```

**Commit**: YES (groups with Task 2)
- Message: `feat(config): add simple/advanced toggle for boiler config`

---

- [ ] 2. Reorganize parameters by Simple/Advanced mode

**What to do**:
- Definovat které parametry se zobrazují v Simple vs Advanced režimu
- **Simple (5 parametrů)**: enable_boiler, boiler_volume_l, boiler_target_temp_c, boiler_temp_sensor_top, boiler_deadline_time
- **Advanced (všechny ostatní)**: boiler_temp_sensor_bottom, boiler_temp_sensor_position, boiler_has_alternative_heating, boiler_alt_cost_kwh, boiler_alt_energy_sensor, boiler_spot_price_sensor, boiler_plan_slot_minutes, boiler_stratification_mode, boiler_planning_horizon_hours, boiler_heater_switch_entity, boiler_circulation_pump_switch_entity, boiler_heater_power_kw_entity, boiler_alt_heater_switch_entity
- Implementovat logiku zobrazení dle config_mode

**Must NOT do**:
- Neměnit názvy parametrů
- Neodstraňovat parametry z config flow (jen skrývat)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 3, 8
- **Blocked By**: Task 1

**References**:
- `custom_components/oig_cloud/config/steps.py` - _build_boiler_options
- `custom_components/oig_cloud/const.py` - CONF_BOILER_* konstanty

**Acceptance Criteria**:
- [ ] V Simple režimu se zobrazuje pouze 5 parametrů
- [ ] V Advanced režimu se zobrazují všechny parametry
- [ ] Přepínání mezi režimy funguje

**QA Scenarios**:
```
Scenario: Simple mode shows only 5 params
Tool: Bash (test)
Preconditions: config_mode = simple
Steps:
1. Načíst boiler config flow
2. Spočítat zobrazené parametry
Expected Result: Přesně 5 parametrů zobrazeno
Evidence: .sisyphus/evidence/task-2-simple-mode.txt

Scenario: Advanced mode shows all params
Tool: Bash (test)
Preconditions: config_mode = advanced
Steps:
1. Načíst boiler config flow
2. Spočítat zobrazené parametry
Expected Result: Všechny parametry zobrazeny
Evidence: .sisyphus/evidence/task-2-advanced-mode.txt
```

**Commit**: YES (groups with Task 1)
- Message: `feat(config): reorganize boiler params by simple/advanced mode`

---

- [ ] 3. Implement backwards compatibility (default Advanced)

**What to do**:
- Pro existující konfigurace bez `config_mode` nastavit default = "advanced"
- Zajistit že existující config flow funguje bez změn
- Migrace: pokud config_mode chybí, doplnit "advanced"

**Must NOT do**:
- Neměnit chování pro existující uživatele (žádné BREAKING CHANGES)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 4, 5, 6, 7, 8
- **Blocked By**: Task 1, 2

**References**:
- `custom_components/oig_cloud/__init__.py` - migrace config entry
- `custom_components/oig_cloud/config/steps.py` - default handling

**Acceptance Criteria**:
- [ ] Existující config entry bez config_mode defaultuje na "advanced"
- [ ] Všechny parametry viditelné pro existující uživatele
- [ ] Žádné chyby při načítání existující config

**QA Scenarios**:
```
Scenario: Existing config without config_mode
Tool: Bash (test)
Preconditions: Simulace staré config entry bez config_mode
Steps:
1. Načíst config entry
2. Ověřit že config_mode = "advanced"
Expected Result: Default správně nastaven
Evidence: .sisyphus/evidence/task-3-backwards-compat.txt
```

**Commit**: YES (groups with Task 1, 2)
- Message: `feat(config): add backwards compatibility for boiler config mode`

---

- [ ] 4. Wire stratification_mode to coordinator (fix hardcoded)

**What to do**:
- V coordinator.py řádek 212 je hardcoded `mode="two_zone"`
- Nahradit tímto: `mode=config.get(CONF_BOILER_STRATIFICATION_MODE, "two_zone")`
- Podporované hodnoty: "simple_avg", "two_zone", "gradient"
- Upravit funkci `calculate_stratified_temp` v utils.py aby podporovala všechny 3 módy

**Must NOT do**:
- Neměnit výchozí chování pro existující uživatele (two_zone zůstává default)

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2
- **Blocks**: Task 11, 12, 13, 14
- **Blocked By**: Task 3

**References**:
- `custom_components/oig_cloud/boiler/coordinator.py:212` - hardcoded mode
- `custom_components/oig_cloud/boiler/utils.py` - calculate_stratified_temp funkce
- `custom_components/oig_cloud/const.py` - CONF_BOILER_STRATIFICATION_MODE

**Acceptance Criteria**:
- [ ] stratification_mode se čte z configu
- [ ] Podporovány všechny 3 módy: simple_avg, two_zone, gradient
- [ ] Default hodnota: "two_zone" (pro backwards compat)

**QA Scenarios**:
```
Scenario: stratification_mode respected from config
Tool: Bash (test)
Preconditions: config with stratification_mode="gradient"
Steps:
1. Inicializovat coordinator
2. Ověřit že se používá gradient metoda
Expected Result: Konfigurace respektována
Evidence: .sisyphus/evidence/task-4-stratification-mode.txt

Scenario: Default two_zone for missing config
Tool: Bash (test)
Preconditions: config without stratification_mode
Steps:
1. Inicializovat coordinator
2. Ověřit že se používá two_zone
Expected Result: Default two_zone použit
Evidence: .sisyphus/evidence/task-4-stratification-default.txt
```

**Commit**: NO (groups with Task 5)

---

- [ ] 5. Wire planning_horizon_hours to planner (fix hardcoded)

**What to do**:
- V planner.py řádek 64 je hardcoded `plan_end = plan_start + timedelta(days=1)`
- Nahradit dynamickým výpočtem dle configu: `plan_end = plan_start + timedelta(hours=config_hours)`
- Použít config.get(CONF_BOILER_PLANNING_HORIZON_HOURS, 24)
- Validace: min 12h, max 72h

**Must NOT do**:
- Neměnit výchozí chování (24h zůstává default)
- Nepovolit extrémní hodnoty (omezení 12-72h)

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2
- **Blocks**: Task 12, 13, 14
- **Blocked By**: Task 3

**References**:
- `custom_components/oig_cloud/boiler/planner.py:64` - hardcoded 24h
- `custom_components/oig_cloud/const.py` - CONF_BOILER_PLANNING_HORIZON_HOURS

**Acceptance Criteria**:
- [ ] planning_horizon_hours se čte z configu
- [ ] Plánování respektuje nastavený horizont
- [ ] Validace: min 12h, max 72h

**QA Scenarios**:
```
Scenario: planning_horizon_hours respected
Tool: Bash (test)
Preconditions: config with planning_horizon_hours=48
Steps:
1. Vytvořit plán
2. Ověřit že plán má 48 hodin
Expected Result: Horizont respektován
Evidence: .sisyphus/evidence/task-5-horizon-respected.txt

Scenario: Default 24h for missing config
Tool: Bash (test)
Preconditions: config without planning_horizon
Steps:
1. Vytvořit plán
2. Ověřit že plán má 24 hodin
Expected Result: Default 24h použit
Evidence: .sisyphus/evidence/task-5-horizon-default.txt
```

**Commit**: YES (groups with Task 4)
- Message: `fix(boiler): respect stratification_mode and planning_horizon config`

---

- [ ] 6. Implement heater_switch_entity control

**What to do**:
- Implementovat ovládání boiler_heater_switch_entity podle plánovače
- Zapnout když: Je aktivní slot v plánu AND teplota < cílová - hystereze
- Vypnout když: Není aktivní slot nebo teplota >= cílová
- Použít hass.services.call("switch", "turn_on/off")
- Logovat všechny změny stavu

**Must NOT do**:
- Neměnit existující plánovací logiku, jen přidat ovládání
- Nepřidávat složité PID regulátory

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2
- **Blocks**: Task 12, 13, 14
- **Blocked By**: Task 3

**References**:
- `custom_components/oig_cloud/boiler/coordinator.py` - _async_update_data
- `custom_components/oig_cloud/boiler/planner.py` - BoilerPlan, BoilerSlot
- Home Assistant switch service calls

**Acceptance Criteria**:
- [ ] Heater se zapne když je aktivní slot a teplota < cílová
- [ ] Heater se vypne když není aktivní slot nebo teplota >= cílová
- [ ] Logy obsahují změny stavu s důvodem

**QA Scenarios**:
```
Scenario: Heater turns on during active slot
Tool: Bash (test)
Preconditions: Active slot + low temp
Steps:
1. Simulovat aktivní slot v plánu
2. Simulovat teplotu < cílová
3. Spustit update
Expected Result: switch.turn_on voláno
Evidence: .sisyphus/evidence/task-6-heater-on.txt

Scenario: Heater turns off when temp reached
Tool: Bash (test)
Preconditions: Heater ON + temp >= target
Steps:
1. Simulovat teplotu >= cílová
2. Spustit update
Expected Result: switch.turn_off voláno
Evidence: .sisyphus/evidence/task-6-heater-off.txt
```

**Commit**: NO

---

- [ ] 7. Implement circulation_pump_switch_entity control

**What to do**:
- Implementovat ovládání circulation_pump_switch_entity
- Zapnout v oknech kdy se očekává spotřeba teplé vody (dle profilu)
- Použít peak hours z BoilerProfile pro určení ok
- Vypnout mimo spotřební okna
- Nezávislé na topení - běží i když se netopí

**Must NOT do**:
- Nevázat na heater stav (nezávislé ovládání)

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2
- **Blocks**: Task 12, 13, 14
- **Blocked By**: Task 3

**References**:
- `custom_components/oig_cloud/boiler/coordinator.py`
- `custom_components/oig_cloud/boiler/profiler.py` - peak hours detection
- `custom_components/oig_cloud/boiler/models.py` - BoilerProfile

**Acceptance Criteria**:
- [ ] Pump se zapne v peak hours dle profilu
- [ ] Pump se vypne mimo peak hours
- [ ] Nezávislé na heater stavu

**QA Scenarios**:
```
Scenario: Pump turns on during peak hours
Tool: Bash (test)
Preconditions: Peak hour from profile
Steps:
1. Simulovat čas v peak hour
2. Spustit update
Expected Result: switch.turn_on voláno pro pump
Evidence: .sisyphus/evidence/task-7-pump-on.txt

Scenario: Pump turns off outside peak hours
Tool: Bash (test)
Preconditions: Non-peak hour
Steps:
1. Simulovat čas mimo peak hour
2. Spustit update
Expected Result: switch.turn_off voláno pro pump
Evidence: .sisyphus/evidence/task-7-pump-off.txt
```

**Commit**: NO

---

- [ ] 8. Remove placeholder params from config flow

**What to do**:
- Odstranit z config flow:
  - boiler_cold_inlet_temp_c (nikdy nepoužito)
  - boiler_two_zone_split_ratio (hardcoded 0.5, nepotřeba konfigurovat)
- Uchovat v const.py pro backwards compat (neodstraňovat konstanty)
- Jen nezobrazovat v config flow UI

**Must NOT do**:
- Neodstraňovat konstanty z const.py (backwards compat)
- Neovlivňovat existující uložené konfigurace

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2
- **Blocks**: Task 12, 13, 14
- **Blocked By**: Task 2, 3

**References**:
- `custom_components/oig_cloud/config/steps.py` - _build_boiler_options
- `custom_components/oig_cloud/const.py` - CONF_BOILER_COLD_INLET_TEMP_C, CONF_BOILER_TWO_ZONE_SPLIT_RATIO

**Acceptance Criteria**:
- [ ] Parametry nejsou viditelné v config flow UI
- [ ] Konstanty zůstávají v const.py
- [ ] Existující konfigurace s těmito parametry fungují

**QA Scenarios**:
```
Scenario: Placeholder params not visible
Tool: Bash (test)
Preconditions: Nová konfigurace
Steps:
1. Otevřít config flow
2. Ověřit absence cold_inlet_temp a two_zone_split_ratio
Expected Result: Parametry neviditelné
Evidence: .sisyphus/evidence/task-8-placeholder-removed.txt

Scenario: Existing config still works
Tool: Bash (test)
Preconditions: Existující config s placeholder parametry
Steps:
1. Načíst existující config
2. Ověřit že integrace funguje
Expected Result: Žádné chyby
Evidence: .sisyphus/evidence/task-8-backwards-compat.txt
```

**Commit**: YES (groups with Task 6, 7)
- Message: `feat(boiler): implement heater and circulation pump control, remove placeholders`

---

- [ ] 9. Remove Debug panel from V2 dashboard

**What to do**:
- Odstranit `oig-boiler-debug-panel` komponent z components.ts
- Odstranit import a export Debug panelu
- Odstranit použití v boiler-view.ts (pokud existuje)
- Zachovat funkcionalitu ale skrýt ji - případně přesunout do API pro pokročilé uživatele

**Must NOT do**:
- Neměnit ostatní komponenty
- Neodstraňovat debug endpointy z API, jen UI

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3
- **Blocks**: Task 14
- **Blocked By**: None

**References**:
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts` - OigBoilerDebugPanel
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/index.ts` - exports

**Acceptance Criteria**:
- [ ] Debug panel odstraněn z komponent
- [ ] Dashboard načte bez Debug panelu
- [ ] Žádné console chyby

**QA Scenarios**:
```
Scenario: Debug panel removed from UI
Tool: Playwright (screenshot)
Preconditions: Dashboard loaded
Steps:
1. Otevřít boiler dashboard
2. Ověřit absence Debug panelu
Expected Result: Debug panel neviditelný
Evidence: .sisyphus/evidence/task-9-debug-removed.png
```

**Commit**: NO

---

- [ ] 10. Improve Plan Info visual hierarchy

**What to do**:
- Vylepšit vizuální hierarchii Plan Info (9 řádků)
- Seskupit související informace:
  - Základní info (Mix zdrojů, Slotů, Topení aktivní)
  - Cenové info (Nejlevnější spot, Nejdražší spot)
  - Forecast info (FVE okna, Grid okna)
  - Časové info (Od, Do)
- Použít vizuální oddělení (skupiny s nadpisy nebo padding)
- Zachovat všechny 9 řádků, jen lépe uspořádat

**Must NOT do**:
- Neodstraňovat žádné řádky
- Neměnit data, jen prezentaci

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3
- **Blocks**: Task 14
- **Blocked By**: None

**References**:
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts` - OigBoilerPlanInfo
- Lines 504-589 v components.ts

**Acceptance Criteria**:
- [ ] Všechny 9 řádky zobrazeny
- [ ] Seskupení do logických sekcí
- [ ] Lepší vizuální hierarchie (nadpisy, oddělení)

**QA Scenarios**:
```
Scenario: Plan Info has improved hierarchy
Tool: Playwright (screenshot)
Preconditions: Dashboard loaded with plan
Steps:
1. Otevřít boiler dashboard
2. Prohlédnout Plan Info sekci
Expected Result: Informace seskupeny logicky, lepší čitelnost
Evidence: .sisyphus/evidence/task-10-plan-info-hierarchy.png
```

**Commit**: NO

---

- [ ] 11. Verify Config Section displays correct values

**What to do**:
- Ověřit že `oig-boiler-config-section` zobrazuje správné hodnoty z configu
- Upravit aby zobrazovala aktuální konfiguraci (po změnách v Task 4, 5)
- Přidat zobrazení config_mode (simple/advanced)
- Odstranit zobrazení deprecated parametrů (cold_inlet_temp, two_zone_split_ratio)

**Must NOT do**:
- Nepřidávat nové parametry do zobrazení, jen aktualizovat existující

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3
- **Blocks**: Task 14
- **Blocked By**: Task 4, 5

**References**:
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts` - OigBoilerConfigSection
- Lines 1140-1211 v components.ts

**Acceptance Criteria**:
- [ ] Config zobrazuje aktuální hodnoty z backendu
- [ ] config_mode je viditelný
- [ ] Deprecated parametry nejsou zobrazeny

**QA Scenarios**:
```
Scenario: Config section shows current values
Tool: Playwright (screenshot)
Preconditions: Dashboard loaded
Steps:
1. Otevřít boiler dashboard
2. Prohlédnout Config sekci
Expected Result: Viditelné aktuální hodnoty z configu
Evidence: .sisyphus/evidence/task-11-config-section.png
```

**Commit**: YES (groups with Task 9, 10)
- Message: `feat(v2): remove debug panel, improve plan info hierarchy, update config display`

---

- [ ] 12. Integration test - full cycle

**What to do**:
- End-to-end test všech změn dohromady
- Test celého workflow:
  1. Config flow s Simple/Advanced toggle
  2. Backend respektuje stratification_mode a planning_horizon
  3. Heater a Pump se ovládají podle plánu
  4. V2 dashboard zobrazuje správné hodnoty
- Ověřit že všechny části fungují dohromady

**Must NOT do**:
- Nezapomínat na žádnou část (config + backend + UI)

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 4
- **Blocks**: Task 13, 14
- **Blocked By**: Task 4, 5, 6, 7, 8, 11

**References**:
- Všechny soubory z předchozích tasků

**Acceptance Criteria**:
- [ ] Celý flow funguje: Config → Backend → UI
- [ ] Žádné chyby v logách
- [ ] Všechny parametry respektovány

**QA Scenarios**:
```
Scenario: Full integration test
Tool: Bash (pytest) + Playwright
Preconditions: All components implemented
Steps:
1. Vytvořit novou konfiguraci (Simple mode)
2. Ověřit že backend respektuje nastavení
3. Ověřit že UI zobrazuje správné hodnoty
4. Spustit plánovací cyklus
5. Ověřit ovládání switchů
Expected Result: Vše funkční
Evidence: .sisyphus/evidence/task-12-integration.txt + screenshot
```

**Commit**: NO

---

- [ ] 13. Backwards compatibility test

**What to do**:
- Ověřit že existující konfigurace fungují bez změn
- Test s mock staré konfigurace (bez config_mode)
- Ověřit že default = "advanced" funguje
- Ověřit že existující entity names nezměněny

**Must NOT do**:
- Nenarušit existující instalace

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 4
- **Blocks**: Task 14
- **Blocked By**: Task 12

**References**:
- `custom_components/oig_cloud/__init__.py` - config entry migrace

**Acceptance Criteria**:
- [ ] Stará konfigurace načte správně
- [ ] Všechny entity fungují
- [ ] Žádné chyby při migraci

**QA Scenarios**:
```
Scenario: Existing config works unchanged
Tool: Bash (test)
Preconditions: Mock staré konfigurace bez config_mode
Steps:
1. Načíst starou konfiguraci
2. Ověřit že config_mode = "advanced"
3. Ověřit funkčnost všech komponent
Expected Result: Bez chyb, vše funguje
Evidence: .sisyphus/evidence/task-13-backwards-compat.txt
```

**Commit**: YES (groups with Task 12)
- Message: `test(boiler): add integration and backwards compatibility tests`

---

- [ ] 14. End-to-end UI verification

**What to do**:
- Kompletní UI test V2 dashboardu
- Screenshots všech sekcí
- Ověřit absence Debug panelu
- Ověřit Plan Info hierarchii
- Ověřit Config Section hodnoty
- Ověřit Heatmap a ostatní komponenty

**Must NOT do**:
- Nezapomenout na žádnou sekci

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`, `playwright`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 4
- **Blocks**: F1-F4
- **Blocked By**: Task 9, 10, 12, 13

**References**:
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts`

**Acceptance Criteria**:
- [ ] Všechny sekce zobrazeny správně
- [ ] Debug panel odstraněn
- [ ] Plan Info má lepší hierarchii
- [ ] Žádné chyby v konzoli

**QA Scenarios**:
```
Scenario: Complete UI verification
Tool: Playwright (screenshots)
Preconditions: Dashboard loaded
Steps:
1. Otevřít dashboard
2. Screenshot každé sekce
3. Ověřit absence Debug panelu
4. Ověřit hierarchii Plan Info
Expected Result: Vše vizuálně správné
Evidence: .sisyphus/evidence/task-14-ui-*.png (více screenshotů)
```

**Commit**: NO

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan. Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`. Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes. Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Commit 1 (Wave 1 - Config)**: `feat(config): add simple/advanced toggle for boiler config`
- **Commit 2 (Wave 2 - Backend)**: `fix(boiler): respect stratification_mode and planning_horizon config`
- **Commit 3 (Wave 2 - Control)**: `feat(boiler): implement heater and circulation pump control, remove placeholders`
- **Commit 4 (Wave 3 - UI)**: `feat(v2): remove debug panel, improve plan info hierarchy, update config display`
- **Commit 5 (Wave 4 - Tests)**: `test(boiler): add integration and backwards compatibility tests`

---

## Success Criteria

### Verification Commands
```bash
# Config flow tests
pytest tests/test_config_flow.py -v

# Backend tests
pytest tests/test_boiler*.py -v

# Type check
tsc --noEmit

# Lint
pylint custom_components/oig_cloud/boiler/
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Simple/Advanced toggle works
- [ ] Heater and Pump control implemented
- [ ] Hardcoded values fixed
- [ ] Placeholder params removed
- [ ] Debug panel removed
- [ ] Plan Info improved
- [ ] Backwards compatibility preserved
- [ ] All evidence files present

---

**Plan saved to**: `.sisyphus/plans/boiler-config-ui-optimization.md`

**To start execution, run**: `/start-work boiler-config-ui-optimization`

