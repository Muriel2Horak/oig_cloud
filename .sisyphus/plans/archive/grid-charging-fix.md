# Fix: Grid Charging Solar Overflow Bug

## TL;DR

> **Quick Summary**: `_apply_economic_charging` přidává grid-charging intervaly i tehdy, kdy solár přirozeně nabije baterii na target SOC — způsobuje solar overflow do bojleru. Fix přidá guard v `plan_charging_intervals`: pokud `simulate_trajectory` ukáže, že existující plán + solár dosáhne targetu, economic charging se přeskočí.
>
> **Deliverables**:
> - Failing regression test (RED) demonstrující bug
> - Fix v `hybrid_planning.py:plan_charging_intervals` (guard před `_apply_economic_charging`)
> - Debug log při přeskočení economic charging
> - Audit mrtvého kódu v `charging_plan_utils.py`
> - Všechny testy procházejí (GREEN)
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 → Task 3 → Task 4

---

## Context

### Original Request
Systém občas nabije baterii ze sítě, a pak místo toho aby solár nabíjel baterii, jdou přetoky do bojleru. To je neefektivní a nedává to smysl.

### Interview Summary
**Key Discussions**:
- Problém identifikován jako: grid charging v noci i když solár druhý den baterii přirozeně nabije
- Celá architektura plánovače byla zmapována end-to-end
- Root cause nalezen v interakci `_reach_target_soc` → `_apply_economic_charging`

**Research Findings**:
- `_reach_target_soc` (line 494) SPRÁVNĚ zjistí, zda solár dosáhne targetu, a grid charging nepřidá
- `_apply_economic_charging` (line 669) běží POTÉ a ignoruje tuto informaci — přidá intervaly čistě na základě price comparison
- `simulate_trajectory` (line 1177) je dostupný nástroj pro předpověď SOC s daným plánem

### Metis Review
**Identified Gaps** (addressed):
- Binary skip vs. gap-filling debata: binary skip je správný přístup, protože `_reach_target_soc` již zajistil, že gap byl vyplněn grid chargingem pokud bylo potřeba
- `eps_kwh` tolerance: použijeme existující `eps_kwh = 0.01` (již definováno v `plan_charging_intervals`)
- Negative prices: jsou handled `_seed_charging_intervals` přes `negative_price_intervals` parametr — nebudou dotčeny
- Logging požadavek: přidán jako součást Task 3
- Dead code audit: Task 2 (samostatný, paralelně s Task 1)

---

## Work Objectives

### Core Objective
Zabránit `_apply_economic_charging` přidávat grid-charging intervaly v situaci, kdy existující plán + solár již dosáhnou target SOC — čímž eliminovat solar overflow do bojleru.

### Concrete Deliverables
- `tests/test_hybrid_economic_charging_solar_overflow.py` — nový test soubor
- `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py` — guard + debug log
- (Pokud dead code potvrzen) poznámka/komentář nebo odstranění z `planning/charging_plan_utils.py`

### Definition of Done
- [ ] `python3 -m pytest tests/test_hybrid_economic_charging_solar_overflow.py -v` → PASS
- [ ] `python3 -m pytest tests/ -x -q` → všechny testy PASS (žádné regresy)
- [ ] V debug logu se při přeskočení economic charging zobrazí zpráva s max_soc a target

### Must Have
- Guard musí běžet POUZE když `not recovery_mode` (stejná podmínka jako stávající `_apply_economic_charging` volání)
- Guard musí volat `simulate_trajectory` se STÁVAJÍCÍMI `charging_intervals` (po `_reach_target_soc`)
- Test musí nejprve FAILOVAT před fixem, PASSOVAT po fixu

### Must NOT Have (Guardrails)
- **Neměnit `simulate_trajectory` funkci** — široký dopad, out of scope
- **Neměnit `_reach_target_soc`** — funguje správně, netreba sahat
- **Nepřidávat nové config parametry** — žádné user-facing změny
- **Nerefaktorovat `_determine_mode_for_interval`** (Option B) — nesprávný přístup
- **Neopravovat `charging_plan_utils.py` key mismatch** v tomto PR — ověřit, zda dead code, pak handle separately
- **Neoptimalizovat výkon** extra `simulate_trajectory` volání — přijatelné pro nyní

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (pytest, 3066 tests passing)
- **Automated tests**: TDD — RED first, then GREEN
- **Framework**: pytest (python3 -m pytest)

### QA Policy
Každý task má agent-executed QA scenario. Evidence do `.sisyphus/evidence/`.

- **Library/Module**: Bash (python3 -m pytest) — import, call, assert výstupy

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — paralelně):
├── Task 1: Write failing regression test (RED) [quick]
└── Task 2: Dead code audit — charging_plan_utils.py [quick]

Wave 2 (After Task 1 — sequential):
└── Task 3: Implement fix + debug log (GREEN) [quick]

Wave 3 (After Task 3 — verification):
└── Task 4: Run full test suite + confirm no regressions [quick]

Wave FINAL (After ALL tasks — parallel review):
├── Task F1: Plan compliance audit [oracle]
└── Task F2: Code quality review [unspecified-high]
```

### Dependency Matrix

- **1**: — (žádné závislosti) — blokuje: 3
- **2**: — (žádné závislosti) — blokuje: —
- **3**: závisí na: 1 — blokuje: 4
- **4**: závisí na: 3 — blokuje: F1, F2
- **F1, F2**: závisí na: 4

### Agent Dispatch Summary

- **Wave 1**: T1 → `quick`, T2 → `quick`
- **Wave 2**: T3 → `quick`
- **Wave 3**: T4 → `quick`
- **FINAL**: F1 → `oracle`, F2 → `unspecified-high`

---

## TODOs

---

- [ ] 1. Napsat failing regression test (RED)

  **What to do**:
  - Vytvořit soubor `tests/test_hybrid_economic_charging_solar_overflow.py`
  - Napsat test `test_economic_charging_skipped_when_solar_reaches_target` demonstrující bug
  - Scénář: baterie nad `_planning_min`, solár dostačující na dosažení `_target`, levné ceny → `charging_intervals` by měly být prázdné, ale bugem nejsou
  - Test musí **FAILOVAT** před fixem, **PASSOVAT** po fixu

  **Konkrétní test setup**:
  ```python
  # DummyStrategy pro tento test:
  strategy._planning_min = 2.0
  strategy._target = 3.0
  strategy.config.round_trip_efficiency = 0.9   # <- nutné aby _apply_economic_charging vůbec běžel
  strategy.config.max_ups_price_czk = 1.0
  strategy.config.price_hysteresis_czk = 0.0

  initial_battery_kwh = 2.5   # nad planning_min → NOT recovery mode
  solar_forecast = [2.0] * 24  # net +1.5/interval → baterie přes target již po 1. intervalu
  consumption_forecast = [0.5] * 24
  prices = [0.3] * 24          # pod max_ups_price → _apply_economic_charging chce přidat intervaly
  ```
  - `DummySimulator.simulate()` musí ignorovat mode/force_charge a vracet `battery_end = battery_start + solar_kwh - load_kwh` (stávající chování)
  - Assertion: `assert charging_intervals == set()` — žádný grid-charging není potřeba

  **Must NOT do**:
  - Neměnit `tests/test_hybrid_planning_more.py`
  - Nepřidávat `_max` do DummyStrategy (není potřeba bez balancing_plan)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Jednoduchý nový test soubor dle existujícího vzoru
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: UI task, nesouvisí

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (s Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None (může začít okamžitě)

  **References**:

  **Pattern References**:
  - `tests/test_hybrid_planning_more.py:1-52` — DummySimulator, DummyConfig, DummyStrategy vzor; přesně zkopíruj tuto strukturu
  - `tests/test_hybrid_planning_more.py:54-69` — vzor volání `module.plan_charging_intervals()` a destructuring výsledku

  **API/Type References**:
  - `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py:16-25` — signatura `plan_charging_intervals`
  - `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py:886-903` — `_resolve_round_trip_efficiency`: musíš mít `strategy.config.round_trip_efficiency = 0.9` NEBO `sim_config.ac_dc_efficiency * sim_config.dc_ac_efficiency > 0`, jinak `_apply_economic_charging` hned vrátí (round_trip_eff <= 0) a bug se neprojeví

  **Test References**:
  - `tests/test_hybrid_planning_more.py:32-51` — DummyStrategy vzor; přidej `config.round_trip_efficiency = 0.9` a `config.price_hysteresis_czk = 0.0`

  **Acceptance Criteria**:

  - [ ] Soubor `tests/test_hybrid_economic_charging_solar_overflow.py` existuje
  - [ ] `python3 -m pytest tests/test_hybrid_economic_charging_solar_overflow.py -v` → **FAIL** (před fixem)
  - [ ] Test failure zpráva jasně ukazuje `charging_intervals != set()` — economic charging přidal intervaly, ačkoliv solár dosáhne targetu

  **QA Scenarios**:

  ```
  Scenario: Test soubor existuje a fail správně
    Tool: Bash
    Preconditions: Soubor vytvořen, fix NEPROVEDEN
    Steps:
      1. python3 -m pytest tests/test_hybrid_economic_charging_solar_overflow.py -v
      2. Zkontroluj exit code != 0
      3. Zkontroluj výstup obsahuje "FAILED test_economic_charging_skipped_when_solar_reaches_target"
    Expected Result: Test FAIL, exit code 1
    Failure Indicators: Test PASS před fixem = scénář není správně nastaven (bug se neprojevil)
    Evidence: .sisyphus/evidence/task-1-red-test-fail.txt
  ```

  **Commit**: NO (součást Task 3 commitu)

---

- [ ] 2. Dead code audit — `charging_plan_utils.py`

  **What to do**:
  - Projít `custom_components/oig_cloud/battery_forecast/planning/charging_plan_utils.py`
  - Pro každou z 5 funkcí (`get_candidate_intervals`, `simulate_forward`, `calculate_minimum_charge`, `calculate_protection_requirement`, `recalculate_timeline_from_index`) ověřit grep-em zda je volána v produkčním kódu
  - Zdokumentovat výsledek jako komentář `# AUDIT:` na začátek souboru, nebo jako poznámku v tomto plánu

  **Hint ze stávající analýzy**:
  - `recalculate_timeline_from_index` → volána z `charging_plan_adjustments.py:64,136` a z `charging_plan.py:257,332,357,452,556`
  - `get_candidate_intervals`, `simulate_forward`, `calculate_minimum_charge`, `calculate_protection_requirement` → všechny importovány a volány z `charging_plan.py`
  - **Pravděpodobný závěr: žádný dead code**; ale ověř grep-em aby bylo jisté

  **Must NOT do**:
  - Neopravovat žádný "key mismatch" v tomto PR
  - Nemazat žádný kód (jen audit)
  - Nerefaktorovat

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pouze grep + dokumentace, žádná změna kódu
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (s Task 1)
  - **Blocks**: nic
  - **Blocked By**: None

  **References**:

  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan_utils.py` — auditovaný soubor
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py:10-15` — import statement ukáže co je importováno
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan_adjustments.py:8` — import `recalculate_timeline_from_index`

  **Acceptance Criteria**:

  - [ ] Výsledek auditu zdokumentován (kde — viz níže)
  - [ ] Závěr: buď "žádný dead code" nebo seznam konkrétních nepoužívaných funkcí s řádky

  **Output auditu**: Zapiš výsledek jako komentář na konec sekce `## Context → Research Findings` v tomto plánu (`.sisyphus/plans/grid-charging-fix.md`).

  **QA Scenarios**:

  ```
  Scenario: Ověření že audit byl proveden
    Tool: Bash
    Steps:
      1. grep -rn "get_candidate_intervals\|simulate_forward\|calculate_minimum_charge\|calculate_protection_requirement\|recalculate_timeline_from_index" custom_components/ --include="*.py" | grep -v "__pycache__"
      2. Každá funkce musí mít aspoň 1 caller mimo vlastní definici
    Expected Result: Všechny 5 funkcí jsou volány z charging_plan.py nebo charging_plan_adjustments.py
    Evidence: .sisyphus/evidence/task-2-dead-code-audit.txt
  ```

  **Commit**: NO (audit, žádná code změna)

---

- [ ] 3. Implementovat fix + debug log (GREEN)

  **What to do**:
  - Otevřít `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py`
  - Najít řádek 101: `if not recovery_mode:` → hned za ním (před voláním `_apply_economic_charging`) přidat guard:
    1. Zavolat `simulate_trajectory` se stávajícími `charging_intervals` (po `_reach_target_soc`)
    2. Spočítat `max_soc = max(trajectory) if trajectory else initial_battery_kwh`
    3. Pokud `max_soc >= strategy._target - eps_kwh`: přidat `_LOGGER.debug(...)` a přeskočit `_apply_economic_charging`
    4. Jinak: zavolat `_apply_economic_charging` jako dosud
  - Guard musí být umístěn TAK, aby `_apply_cost_aware_override` a `_apply_hw_min_hold_limit` stále běžely nezávisle

  **Přesné umístění změny** (řádky 101–113):
  ```python
  # PŘED fixem:
  if not recovery_mode:
      _apply_economic_charging(
          strategy,
          initial_battery_kwh=initial_battery_kwh,
          ...
      )

  # PO fixu:
  if not recovery_mode:
      _pre_economic_trajectory = simulate_trajectory(
          strategy,
          initial_battery_kwh=initial_battery_kwh,
          solar_forecast=solar_forecast,
          consumption_forecast=consumption_forecast,
          charging_intervals=charging_intervals,
      )
      _pre_economic_max_soc = (
          max(_pre_economic_trajectory) if _pre_economic_trajectory else initial_battery_kwh
      )
      if _pre_economic_max_soc >= strategy._target - eps_kwh:
          _LOGGER.debug(
              "Skipping economic charging: solar+plan reaches target SOC "
              "(max_soc=%.3f >= target=%.3f)",
              _pre_economic_max_soc,
              strategy._target,
          )
      else:
          _apply_economic_charging(
              strategy,
              initial_battery_kwh=initial_battery_kwh,
              solar_forecast=solar_forecast,
              consumption_forecast=consumption_forecast,
              charging_intervals=charging_intervals,
              blocked_indices=blocked_indices,
              prices=prices,
              add_ups_interval=add_ups_interval,
              n=n,
              eps_kwh=eps_kwh,
          )
  ```

  **Must NOT do**:
  - Neměnit `simulate_trajectory` funkci
  - Neměnit `_reach_target_soc`
  - Nepřidávat nové config parametry
  - Nerefaktorovat `_determine_mode_for_interval`
  - Neoptimalizovat výkon extra `simulate_trajectory` volání
  - Nezasahovat do `_apply_cost_aware_override` ani `_apply_hw_min_hold_limit` — ty musí zůstat beze změny

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Přesně specifikovaný jednoduchý guard, ~15 řádků kódu
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sekvenčně po Task 1)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1 (test musí existovat a failovat před implementací fixu)

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py:519-534` — vzor jak `_reach_target_soc` volá `simulate_trajectory` a testuje `max_soc >= target - eps_kwh`; přesně stejný pattern použij v guardu
  - `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py:1177-1209` — signatura a chování `simulate_trajectory` — bere `charging_intervals: set[int]`, vrací `List[float]`
  - `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py:101-113` — místo vložení guardu (hned za `if not recovery_mode:`)

  **API/Type References**:
  - `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py:16-31` — lokální proměnné dostupné v `plan_charging_intervals` v bodě vložení guardu: `eps_kwh`, `charging_intervals`, `initial_battery_kwh`, `solar_forecast`, `consumption_forecast`

  **External References**:
  - Python `logging` — `_LOGGER.debug(fmt, arg1, arg2)` — lazy formatting, nepoužívat f-string

  **Acceptance Criteria**:

  - [ ] `python3 -m pytest tests/test_hybrid_economic_charging_solar_overflow.py -v` → **PASS**
  - [ ] `python3 -m pytest tests/ -x -q` → všechny testy PASS, žádné regresy
  - [ ] Debug log při přeskočení: `grep "Skipping economic charging"` najde zprávu v debug výstupu
  - [ ] `_apply_cost_aware_override` a `_apply_hw_min_hold_limit` stále volány (nejsou uvnitř guardu)

  **QA Scenarios**:

  ```
  Scenario: Regression test prochází po fixu (GREEN)
    Tool: Bash
    Steps:
      1. python3 -m pytest tests/test_hybrid_economic_charging_solar_overflow.py -v
      2. Ověř exit code == 0
      3. Ověř výstup obsahuje "PASSED test_economic_charging_skipped_when_solar_reaches_target"
    Expected Result: Test PASS
    Failure Indicators: Test stále FAIL = fix není správně implementován
    Evidence: .sisyphus/evidence/task-3-green-test-pass.txt

  Scenario: Debug log se zobrazí při přeskočení
    Tool: Bash
    Steps:
      1. python3 -c "
         import logging
         logging.basicConfig(level=logging.DEBUG)
         # ... (setup stejný jako v testu)
         # ... spusť plan_charging_intervals s high-solar scénářem
         "
      2. Zkontroluj výstup obsahuje "Skipping economic charging: solar+plan reaches target SOC"
    Expected Result: Log zpráva přítomna s konkrétními hodnotami max_soc a target
    Evidence: .sisyphus/evidence/task-3-debug-log.txt
  ```

  **Commit**: YES
  - Message: `fix(planner): skip economic charging when solar reaches target SOC`
  - Files: `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py`, `tests/test_hybrid_economic_charging_solar_overflow.py`
  - Pre-commit: `python3 -m pytest tests/ -x -q`

---

- [ ] 4. Spustit celou test suite + potvrdit žádné regresy

  **What to do**:
  - Spustit `python3 -m pytest tests/ -x -q`
  - Ověřit, že všechny stávající testy stále procházejí (expected: ~3066+ passed)
  - Ověřit, že nový test soubor je zahrnut a prochází
  - Pokud existují failures, zdokumentovat a opravit (scope: pouze regresy způsobené tímto fixem)

  **Must NOT do**:
  - Neopravovat existující testy které failují z jiných důvodů (jsou-li)
  - Neměnit test assertions v existujících testech kvůli changed behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pouze spuštění příkazů, žádný kód
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sekvenčně po Task 3)
  - **Blocks**: F1, F2
  - **Blocked By**: Task 3

  **References**:
  - `tests/` — celý test adresář
  - README.md → Development Setup sekce pro správný příkaz

  **Acceptance Criteria**:

  - [ ] `python3 -m pytest tests/ -x -q` → exit code 0
  - [ ] Počet passed testů ≥ 3066 + počet nových testů v `test_hybrid_economic_charging_solar_overflow.py`
  - [ ] 0 failures, 0 errors

  **QA Scenarios**:

  ```
  Scenario: Celá test suite bez regresů
    Tool: Bash
    Steps:
      1. python3 -m pytest tests/ -x -q 2>&1 | tee .sisyphus/evidence/task-4-full-suite.txt
      2. Zkontroluj poslední řádek: "N passed" kde N >= 3066
      3. Zkontroluj že neobsahuje "failed" ani "error"
    Expected Result: "3066+ passed, 0 failed" (nebo podobné)
    Failure Indicators: Jakýkoliv "FAILED" nebo "ERROR" řádek
    Evidence: .sisyphus/evidence/task-4-full-suite.txt
  ```

  **Commit**: NO (součást Task 3 commitu)

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Přečti plán end-to-end. Pro každé "Must Have": ověř existenci v kódu (read file). Pro každé "Must NOT Have": prohledej codebase na zakázané patterny. Ověř existenci evidence souborů v `.sisyphus/evidence/`.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Spusť `python3 -m pytest tests/ -q`. Zkontroluj změněné soubory na: `# type: ignore`, prázdné except bloky, debug print statements, unused imports. Ověř, že nový test soubor dodržuje konvenci ostatních testů v `tests/test_hybrid_planning_more.py`.
  Output: `Tests [N pass/N fail] | Issues [N] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

- **Task 3**: `fix(planner): skip economic charging when solar reaches target SOC`
  - Files: `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py`
  - Pre-commit: `python3 -m pytest tests/ -x -q`
- **Task 1**: Zahrnut do stejného commitu nebo jako `test(planner): add regression test for solar overflow bug`
  - Files: `tests/test_hybrid_economic_charging_solar_overflow.py`

---

## Success Criteria

### Verification Commands
```bash
python3 -m pytest tests/test_hybrid_economic_charging_solar_overflow.py -v
# Expected: všechny nové testy PASS

python3 -m pytest tests/ -x -q
# Expected: ~3066+ passed, 0 failed
```

### Final Checklist
- [ ] Failing test existuje a demonstruje bug (RED → GREEN)
- [ ] Guard v `plan_charging_intervals` před `_apply_economic_charging`
- [ ] Debug log při přeskočení economic charging
- [ ] Žádné regresy v existujících testech
- [ ] `charging_plan_utils.py` dead code status potvrzen a zdokumentován

---

## AUDIT NOTE: Dead Code Audit Results

**AUDIT DATE**: 2026-03-02  
**AUDIT SCOPE**: charging_plan_utils.py - 5 functions verified for production usage

### FUNCTIONS ANALYZED:

1. **get_candidate_intervals** (lines 14-70)
   - **STATUS**: ACTIVE ✅
   - **USAGE LOCATIONS**: 
     - charging_plan.py:13 (import)
     - charging_plan.py:57 (function call) 
     - charging_plan.py:225 (function call)

2. **simulate_forward** (lines 73-160)
   - **STATUS**: ACTIVE ✅
   - **USAGE LOCATIONS**:
     - charging_plan.py:15 (import)
     - charging_plan.py:288 (function call)
     - charging_plan.py:299 (function call)

3. **calculate_minimum_charge** (lines 162-175)
   - **STATUS**: ACTIVE ✅
   - **USAGE LOCATIONS**:
     - charging_plan.py:11 (import)
     - charging_plan.py:315 (function call)

4. **calculate_protection_requirement** (lines 177-233)
   - **STATUS**: ACTIVE ✅
   - **USAGE LOCATIONS**:
     - charging_plan.py:12 (import)
     - charging_plan.py:204 (function call)

5. **recalculate_timeline_from_index** (lines 235-281)
   - **STATUS**: ACTIVE ✅
   - **USAGE LOCATIONS**:
     - charging_plan.py:14 (import)
     - charging_plan.py:257, 332, 357, 452, 556 (5 function calls)
     - charging_plan_adjustments.py:8 (import)
     - charging_plan_adjustments.py:64, 136 (2 function calls)

### AUDIT SUMMARY:
- **TOTAL FUNCTIONS CHECKED**: 5
- **DEAD FUNCTIONS FOUND**: 0
- **ACTIVE FUNCTIONS**: 5
- **USAGE CONFIDENCE**: 100% (all functions are actively used in production code)

### CONCLUSION:
All 5 analyzed functions in charging_plan_utils.py are actively used in production code (charging_plan.py and/or charging_plan_adjustments.py). No dead code detected among the audited functions.

### VERIFICATION METHOD:
- Used grep to search for function names across production files
- Confirmed both imports and actual function calls exist
- Detailed evidence saved to: `.sisyphus/evidence/task-2-dead-code-audit.txt`
