# Redesign Plánovacího Algoritmu pro ČEZ Battery Box

## TL;DR
> **Cíl:** Nový čistý plánovací algoritmus bez skrytých voleb a fallbacků, který:
> 1. Respektuje fyziku CBB (4 režimy, HW minimum 20%)
> 2. Nikdy nespadne pod plánovací minimum
> 3. Preferuje FVE před nabíjením ze sítě
> 4. Nabíjí ze sítě jen když nutné a za nejlevnější cenu
> 5. Je simulovatelný mimo runtime pro testování
>
> **Rozsah:** Kompletní nahrazení `hybrid_planning.py` a `charging_plan.py`
> **Výstup:** Čistý deterministický algoritmus s plnými AC

---

## Kontext

### Současný Problém
Aktuální plánovač má následující problémy:
- **Skryté volby**: Feature flags (`pv_first_policy_enabled`, `enable_pre_peak_charging`)
- **Fallbacky**: Více vrstev fallback logiky (`_run_recovery`, `_apply_hw_min_hold_limit`, ...)
- **Nedeterministické**: Není jasné proč plánuje UPS v daný čas
- **Ignoruje FVE**: Plánuje nabíjení ze sítě i když FVE dosáhne cíle sama

### Fyzika CBB (Zachovat)
**4 režimy:**
- `HOME I` (0): Grid priority - deficit ze sítě, surplus do baterie
- `HOME II` (1): Battery priority - deficit ze sítě (baterie se nerozbitá)
- `HOME III` (2): Solar priority - FVE → spotřeba → baterie (default)
- `HOME UPS` (3): UPS mode - nabíjení ze sítě + FVE

**HW minimum:** 20% SOC (fyzická ochrana baterie) - `hw_min_capacity_kwh = 3.07 kWh`

### Vstupy Algoritmu
- **Ceny**: Spot ceny na 36h dopředu (15min intervaly)
- **Spotřeba**: Plánovaná spotřeba na 2 dny (15min intervaly)
- **FVE**: Solární prognóza na 2 dny (15min intervaly)
- **Stav**: Aktuální SOC, plánovací minimum, target

---

## Pravidla Nového Algoritmu

### Hlavní Principy
1. **Safety First**: Nikdy nespadnout pod plánovací minimum
2. **Solar First**: FVE má přednost před nabíjením ze sítě
3. **Economy**: Nabíjet ze sítě jen když nutné a za nejlevnější cenu
4. **Simplicity**: Bez feature flags, bez fallbacků, deterministický

### Algoritmus (3 Fáze)

#### Fáze 1: Baseline Simulace
```
Simuluj celou dobu (36h) v HOME III režimu:
- Pro každý interval: solar - load = delta
- Pokud delta > 0: nabij baterii
- Pokud delta < 0: vybíjej baterii (pokud > planning_min)
- Zaznamenej SOC v každém intervalu
```

#### Fáze 2: Detekce Deficitů
```
Projdi baseline výsledek:
- Najdi první interval kde SOC < planning_min
- Najdi intervaly kde SOC < target
- Spočítej celkový deficit do cíle
```

#### Fáze 3: Optimalizace Nabíjení
```
Pokud baseline dosáhne target:
  → Žádné nabíjení ze sítě (HOME III celou dobu)
  
Pokud baseline nedosáhne target:
  → Najdi nejlevnější intervaly PŘED deficity
  → Naplánuj UPS v těchto intervalech
  → Simuluj znovu a ověř
```

---

## Work Objectives

### Core Objective
Vytvořit nový modul `simple_planner.py` který nahradí `hybrid_planning.py` a `charging_plan.py` s čistým 3-fázovým algoritmem.

### Concrete Deliverables
1. `custom_components/oig_cloud/battery_forecast/planning/simple_planner.py` - nový algoritmus
2. `custom_components/oig_cloud/battery_forecast/planning/simple_planner_types.py` - typy
3. `tests/test_simple_planner.py` - komplexní testy na historických datech
4. Refactor volání v `battery_forecast/` aby používal nový plánovač

### Must Have
- [ ] Simulace baseline (HOME III) pro 36h
- [ ] Detekce deficitů pod planning_min
- [ ] Optimalizace nabíjení v nejlevnějších intervalech
- [ ] Respektování HW minima (20% SOC)
- [ ] Deterministický výstup (stejný vstup = stejný výstup)
- [ ] Plné pokrytí AC testy

### Must NOT Have (Guardrails)
- [ ] Žádné feature flags (pv_first, pre_peak)
- [ ] Žádné fallbacky a recovery módy
- [ ] Žádné heuristiky na "levná okna" bez simulace
- [ ] Žádné dědičnosti ze starého kódu

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Vytvořit simple_planner_types.py [quick]
├── Task 2: Implementovat baseline simulaci [quick]
├── Task 3: Implementovat detekci deficitů [quick]
└── Task 4: Unit testy pro simulaci [quick]

Wave 2 (After Wave 1):
├── Task 5: Implementovat optimalizaci nabíjení [deep]
├── Task 6: Integrace s physics.py [quick]
└── Task 7: Vytvořit historické test data [unspecified-high]

Wave 3 (After Wave 2):
├── Task 8: Komplexní AC testy [deep]
├── Task 9: Refactor volání v battery_forecast [unspecified-high]
└── Task 10: Odstranění starých modulů [quick]

Wave 4 (After Wave 3):
├── Task 11: E2E testy s reálnými daty [deep]
├── Task 12: Dokumentace [writing]
└── Task 13: Performance testy [unspecified-high]
```

---

## TODOs

### Wave 1: Základy

- [ ] **Task 1: Vytvořit simple_planner_types.py**
  **What to do:**
  - Definovat `SimplePlannerConfig` dataclass
  - Definovat `IntervalState` pro výsledek simulace
  - Definovat `PlannerResult` s timeline a metrikami
  - Exportovat typy pro testy
  
  **Recommended Agent Profile:**
  - **Category**: `quick` - čisté definice typů
  - **Skills**: Typové anotace, dataclasses
  
  **Parallelization:**
  - Can Run In Parallel: YES
  - Wave: Wave 1
  
  **References:**
  - Pattern: `battery_forecast/config.py` - jak definovat config
  - Pattern: `battery_forecast/types.py` - TimelineInterval TypedDict
  
  **Acceptance Criteria:**
  - [ ] Soubor vytvořen a kompiluje se bez chyb
  - [ ] Mypy/pyright kontrola projde
  - [ ] Všechny typy mají docstrings

- [ ] **Task 2: Implementovat baseline simulaci**
  **What to do:**
  - Vytvořit funkci `simulate_baseline()`
  - Simuluje N intervalů v HOME III režimu
  - Vrací list `IntervalState` pro každý interval
  - Používá `physics.simulate_interval()` pro fyziku
  
  **Recommended Agent Profile:**
  - **Category**: `quick` - přímá implementace
  - **Skills**: Základní Python, integrace s existujícím kódem
  
  **Parallelization:**
  - Can Run In Parallel: YES (závisí na Task 1)
  - Blocked By: Task 1
  
  **References:**
  - API: `physics.simulate_interval()` - použít pro každý interval
  - Pattern: `hybrid_planning.py:simulate_trajectory()` - jako inspirace
  
  **Acceptance Criteria:**
  - [ ] Simulace běží pro 96 intervalů (24h) za < 100ms
  - [ ] Vrací správné SOC pro jednoduché scénáře (pouze FVE, pouze spotřeba)
  - [ ] Respektuje HW minimum (20% SOC)

- [ ] **Task 3: Implementovat detekci deficitů**
  **What to do:**
  - Vytvořit funkci `find_deficits()`
  - Najde intervaly kde SOC < planning_min
  - Spočítá energii potřebnou k dosažení target
  - Vrací list deficitů s indexy a množstvím
  
  **Recommended Agent Profile:**
  - **Category**: `quick` - logika prohledávání
  - **Skills**: List operations, algoritmy
  
  **Parallelization:**
  - Can Run In Parallel: YES (závisí na Task 2)
  - Blocked By: Task 2
  
  **References:**
  - Pattern: `charging_plan.py:_collect_critical_intervals()` - jako inspirace
  
  **Acceptance Criteria:**
  - [ ] Správně detekuje všechny deficity
  - [ ] Správně spočítá potřebnou energii
  - [ ] Unit testy pro edge cases (přesně na hranici, pod hranicí)

- [ ] **Task 4: Unit testy pro simulaci**
  **What to do:**
  - Vytvořit `tests/test_simple_planner_unit.py`
  - Testy pro baseline simulaci
  - Testy pro detekci deficitů
  - Mock data (nezávislé na runtime)
  
  **Recommended Agent Profile:**
  - **Category**: `quick` - unit testy
  - **Skills**: pytest, fixtures
  
  **Parallelization:**
  - Can Run In Parallel: YES (závisí na Task 2, 3)
  - Blocked By: Task 2, Task 3
  
  **References:**
  - Pattern: `tests/test_hybrid_planning_more.py` - jak strukturovat testy
  
  **Acceptance Criteria:**
  - [ ] 100% pokrytí Task 2 a Task 3
  - [ ] Všechny testy pass
  - [ ] Testy běží izolovaně (bez HA runtime)

### Wave 2: Optimalizace

- [ ] **Task 5: Implementovat optimalizaci nabíjení**
  **What to do:**
  - Vytvořit funkci `optimize_charging()`
  - Pokud baseline dosáhne target → žádné UPS
  - Jinak najde nejlevnější intervaly před deficity
  - Používá greedy algoritmus: vždy nejlevnější dostupný interval
  
  **Recommended Agent Profile:**
  - **Category**: `deep` - jádro algoritmu
  - **Skills**: Optimalizační algoritmy, numpy/pandas optional
  
  **Parallelization:**
  - Can Run In Parallel: NO - je to hlavní logika
  - Blocked By: Task 2, Task 3
  
  **References:**
  - Pattern: `hybrid_planning.py:_find_cheapest_candidate()` - jako inspirace
  - Pattern: `charging_plan.py:_apply_target_charging()` - ale zjednodušené
  
  **Acceptance Criteria:**
  - [ ] Algoritmus vždy najde řešení pokud existuje
  - [ ] Používá nejlevnější možné intervaly
  - [ ] Nikdy nenaplánuje UPS pokud FVE stačí
  - [ ] Simulace ověří že deficity jsou opraveny

- [ ] **Task 6: Integrace s physics.py**
  **What to do:**
  - Ověřit že `simulate_interval()` funguje správně
  - Přidat wrapper pokud potřeba
  - Ověřit konzistenci jednotek (kWh vs %)
  
  **Recommended Agent Profile:**
  - **Category**: `quick` - integrace
  - **Skills**: API design, unit testy
  
  **Parallelization:**
  - Can Run In Parallel: YES
  
  **Acceptance Criteria:**
  - [ ] Všechny 4 režimy správně simulovány
  - [ ] Konzistentní jednotky (vždy kWh interně)
  - [ ] Respektování HW minima

- [ ] **Task 7: Vytvořit historické test data**
  **What to do:**
  - Extrahovat reálná data z existujících sensorů
  - Vytvořit JSON soubory s historickými scénáři
  - Různé typy dní: slunečný, zatažený, polojasný
  - Různé ceny: levné, drahé, proměnlivé
  
  **Recommended Agent Profile:**
  - **Category**: `unspecified-high` - datová příprava
  - **Skills**: Data processing, JSON
  
  **Parallelization:**
  - Can Run In Parallel: YES
  
  **Acceptance Criteria:**
  - [ ] Min 5 různých scénářů (JSON soubory)
  - [ ] Každý scénář má: ceny, FVE prognózu, spotřebu, očekávaný výsledek
  - [ ] Scénáře pokrývají edge cases

### Wave 3: Testování a Integrace

- [ ] **Task 8: Komplexní AC testy**
  **What to do:**
  - Vytvořit `tests/test_simple_planner_ac.py`
  - AC (Acceptance Criteria) testy na historických datech
  - Každý test ověří jeden scénář
  - Výstup: PASS/FAIL s vysvětlením
  
  **Recommended Agent Profile:**
  - **Category**: `deep` - validace
  - **Skills**: pytest, parametrized tests
  
  **Parallelization:**
  - Can Run In Parallel: YES (závisí na Task 5, 7)
  - Blocked By: Task 5, Task 7
  
  **Acceptance Criteria:**
  - [ ] Min 10 AC testů
  - [ ] Každý test má jasný popis co ověřuje
  - [ ] Všechny testy pass
  - [ ] Testy běží v < 5 sekund

- [ ] **Task 9: Refactor volání v battery_forecast**
  **What to do:**
  - Najít všechna místa kde se volá starý plánovač
  - Nahradit volání novým `simple_planner`
  - Aktualizovat config flow pokud potřeba
  - Udržet zpětnou kompatibilitu pro config
  
  **Recommended Agent Profile:**
  - **Category**: `unspecified-high` - integrace
  - **Skills**: Refactoring, HA integrace
  
  **Parallelization:**
  - Can Run In Parallel: NO - postupně
  - Blocked By: Task 5
  
  **Acceptance Criteria:**
  - [ ] Všechny staré volání nahrazeny
  - [ ] Config flow funguje
  - [ ] Integrace se zbuildí bez chyb

- [ ] **Task 10: Odstranění starých modulů**
  **What to do:**
  - Smazat `hybrid_planning.py` (zálohovat do `.old/`)
  - Smazat `charging_plan.py` (zálohovat do `.old/`)
  - Smazat `charging_plan_utils.py` (zálohovat do `.old/`)
  - Aktualizovat `__init__.py` importy
  
  **Recommended Agent Profile:**
  - **Category**: `quick` - úklid
  - **Skills**: Git, file operations
  
  **Parallelization:**
  - Can Run In Parallel: NO - po Task 9
  - Blocked By: Task 9
  
  **Acceptance Criteria:**
  - [ ] Staré moduly smazány/zálohovány
  - [ ] Nový kód funguje bez nich
  - [ ] Git commit s popisem změn

### Wave 4: Finalizace

- [ ] **Task 11: E2E testy s reálnými daty**
  **What to do:**
  - Spustit plánovač na 7 dní historických dat
  - Porovnat s očekávaným chováním
  - Ověřit že žádné deficity
  - Ověřit ekonomičnost
  
  **Recommended Agent Profile:**
  - **Category**: `deep` - validace
  - **Skills**: Data analysis, vizualizace
  
  **Parallelization:**
  - Can Run In Parallel: NO
  - Blocked By: Task 9
  
  **Acceptance Criteria:**
  - [ ] 7 dní dat zpracováno bez chyb
  - [ ] Žádný deficity pod planning_min
  - [ ] Průměrná cena nabíjení je < průměrné spotové ceny

- [ ] **Task 12: Dokumentace**
  **What to do:**
  - Vytvořit `docs/user/SIMPLE_PLANNER.md`
  - Popis algoritmu (3 fáze)
  - Příklady použití
  - Troubleshooting
  
  **Recommended Agent Profile:**
  - **Category**: `writing` - dokumentace
  - **Skills**: Technical writing, Markdown
  
  **Parallelization:**
  - Can Run In Parallel: YES
  
  **Acceptance Criteria:**
  - [ ] Dokumentace kompletní a čitelná
  - [ ] Příklady funkční
  - [ ] Propojeno z hlavní dokumentace

- [ ] **Task 13: Performance testy**
  **What to do:**
  - Měření času výpočtu pro 36h
  - Cíl: < 500ms na 36h plan
  - Profiling pokud pomalé
  
  **Recommended Agent Profile:**
  - **Category**: `unspecified-high` - optimalizace
  - **Skills**: Profiling, performance tuning
  
  **Parallelization:**
  - Can Run In Parallel: YES
  
  **Acceptance Criteria:**
  - [ ] Průměrný čas < 500ms pro 36h
  - [ ] Max čas < 1s pro 36h
  - [ ] Výsledky zdokumentovány

---

## Final Verification Wave

- [ ] **F1: Plan Compliance Audit** (`oracle`)
  - Ověřit že všechny AC z todo listu jsou implementovány
  - Ověřit že staré moduly jsou odstraněny
  - Ověřit že nový plánovač je používán

- [ ] **F2: Code Quality Review** (`unspecified-high`)
  - `tsc --noEmit` nebo python ekvivalent
  - Linter bez chyb
  - 100% type coverage

- [ ] **F3: Real Data Validation** (`unspecified-high`)
  - Spustit na 30 dní historických dat
  - Statistiky: počet UPS intervalů, průměrná cena, deficity

- [ ] **F4: Scope Fidelity Check** (`deep`)
  - Žádné feature flags
  - Žádné fallbacky
  - Čistý 3-fázový algoritmus

---

## Success Criteria

### Verification Commands
```bash
# Testy
pytest tests/test_simple_planner.py -v

# Performance
time python -c "from simple_planner import plan; plan(...)"

# Lint
flake8 custom_components/oig_cloud/battery_forecast/planning/simple_planner.py
```

### Final Checklist
- [ ] Všechny AC testy pass
- [ ] Performance < 500ms pro 36h
- [ ] Žádné staré moduly v importech
- [ ] Dokumentace kompletní
- [ ] 7 dní E2E testů bez chyb

---

## Technická Poznámka: Simulovatelnost

Klíčový požadavek je simulovatelnost mimo runtime. Nový algoritmus musí:

1. **Čisté funkce**: Žádné závislosti na HA stavech, DB, atd.
2. **Pure data in/out**: Vstup je dataclass, výstup je dataclass
3. **Deterministický**: Stejný vstup = stejný výstup (žádné random)
4. **Testovatelný**: Lze unit testovat bez HA instance

Příklad čistého rozhraní:
```python
def plan_battery_schedule(
    config: SimplePlannerConfig,
    prices: List[float],  # 36h dopředu
    solar_forecast: List[float],  # 36h dopředu
    load_forecast: List[float],  # 36h dopředu
    current_soc_kwh: float,
) -> PlannerResult:
    ...
```

Toto umožní:
- Unit testy bez HA
- Property-based testing (Hypothesis)
- Benchmarking na historických datech
- Debuggování offline
