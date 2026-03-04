# Morning Peak Avoidance — Plán implementace

## TL;DR

> **Quick Summary**: Přidat do charging planneru logiku, která detekuje ranní cenovou špičku (06:00–08:00), ověří zda bude SOC < 20% v době špičky, ekonomicky vyhodnotí round-trip efektivitu, a naplánuje předem levné nabíjení z gridu v okně 04:00–06:00 — tak aby baterie přečkala špičku bez odběru ze sítě.
>
> **Deliverables**:
> - `charging_plan.py` — nová funkce `should_pre_charge_for_peak_avoidance()` + integrace do `economic_charging_plan()`
> - `precedence_contract.py` — nová úroveň `PRE_PEAK_AVOIDANCE = 850`
> - `charging_plan_adjustments.py` — `schedule_pre_peak_charging()` funkce
> - `rollout_flags.py` — flag `enable_pre_peak_charging`
> - `tests/test_morning_peak_avoidance.py` — kompletní TDD suite
> - `tests/test_regression_peak_cluster.py` — regresní cluster
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 (types + config) → Task 3 (core logic) → Task 5 (integration) → Task 7 (e2e) → Final Wave

---

## Context

### Original Request
Systém ráno v 06:00–07:00 dosáhne 20% SOC (hardwarový limit BOXu). Spotové ceny jsou v tuto dobu 8–12 CZK/kWh, zatímco o hodinu dříve (04:00–06:00) jsou 5–7 CZK/kWh. FVE v tomto okně neprodukuje nic. Algoritmus by měl nabít levně před špičkou a přečkat ji z baterie.

### Interview Summary
**Klíčová rozhodnutí**:
- Round-trip efektivita: ~87% (92% nabíjení × 95% vybíjení)
- Threshold pro spuštění: vyplatí se pokud `peak_avg > pre_peak_avg / 0.87 * 1.1` (10% buffer)
- Insertion point: `charging_plan.py` po PV-first defer check
- PV-first bezpečnost: pre-peak window je 04:00–07:00 kde FVE ≈ 0 → žádný konflikt za normálního dne
- Phase 1 scope: morning peak only, single battery, no UI

**Research Findings**:
- Timeline data (živá): SOC v 07:00 = 2.05 kWh (20%), spot peak = 11.73–12.17 CZK, pre-peak = 5.66–7.06 CZK
- `simulate_forward()` v `charging_plan_utils.py:73-159` → returns `death_valley_reached`, `min_soc` → použít pro SOC projekci
- `fix_minimum_capacity_violations()` v `charging_plan_adjustments.py` → vzor pro post-generation charging
- Žádná pre-peak logika v kódu neexistuje

### Metis Review
**Identifikované mezery (ošetřeny v plánu)**:
- PrecedenceLevel: použít `PRE_PEAK_AVOIDANCE = 850` (pod PROTECTION_SAFETY=900, nad DEATH_VALLEY=800)
- Guardrail G2: MUST NOT nabíjet nad `max_capacity * 0.95` — FVE headroom
- Guardrail G6: MUST NOT touch `forecast_update.py` (pre-existing LSP errors)
- Edge case E3: Pokud je špička méně než 1 hodinu, skip
- Edge case E6: Pokud ECONOMIC_CHARGING již naplánoval stejný interval, nezdvojovat

---

## Work Objectives

### Core Objective
Implementovat pre-peak charging window logiku která detekuje ranní cenovou špičku, ekonomicky validuje nabíjení s ohledem na round-trip ztráty, a přidá charging sloty do plánu — aniž by narušila PV-first chování nebo DEATH_VALLEY ochranu.

### Concrete Deliverables
- Nová funkce `should_pre_charge_for_peak_avoidance(config, intervals, now)` → `PrePeakDecision`
- Rozšířený `EconomicChargingPlanConfig` o `peak_start_hour`, `hw_min_soc_kwh`, `round_trip_efficiency`
- Nový `PrecedenceLevel.PRE_PEAK_AVOIDANCE = 850`
- Nový rollout flag `enable_pre_peak_charging` (default: False)
- DecisionTrace rozšíření o `reason_code="pre_peak_avoidance"` s projekcí SOC a ekonomikou
- 6+ TDD testů pro core decision funkci
- 5+ regresních testů (PV-first zachování, DEATH_VALLEY zachování)

### Definition of Done
- [ ] `pytest tests/test_morning_peak_avoidance.py -v` → PASS (všechny testy)
- [ ] `pytest tests/test_regression_peak_cluster.py -v` → PASS
- [ ] `pytest tests/ -v` → PASS (celý suite, žádná regrese)
- [ ] `.venv/bin/python -c "from battery_forecast.planning.charging_plan import economic_charging_plan; print('OK')"` → OK
- [ ] Feature flag `enable_pre_peak_charging=True` → pre-peak logika aktivní v testu
- [ ] Feature flag `enable_pre_peak_charging=False` (default) → žádná pre-peak logika

### Must Have
- Ekonomická kalkulace zahrnuje round-trip efektivitu (~87%)
- Pre-peak charging se nespustí pokud PV-first by byl aktivní (deferral check)
- Detekce špičky: hledá okno kde průměrná cena > threshold (ne pouze 06:00 hardcode)
- SOC projekce pomocí existujícího `simulate_forward()`
- Rollout flag (default: False pro bezpečný canary rollout)
- DecisionTrace pro observability

### Must NOT Have (Guardrails)
- **NESMÍ** zasahovat do `forecast_update.py` (pre-existing LSP errors, mimo scope)
- **NESMÍ** měnit signaturu `simulate_forward()` (použita na 4+ místech)
- **NESMÍ** nabíjet nad `max_capacity * 0.95` (zachovat FVE headroom)
- **NESMÍ** přidávat HA entity ani Config Flow UI v Phase 1
- **NESMÍ** měnit PV_FIRST ani DEATH_VALLEY precedence
- **NESMÍ** zasahovat do `www_v2/` ani `hybrid_planning.py` (scope creep)
- **NESMÍ** řešit odpolední/večerní špičky (Phase 1: morning only)
- **NESMÍ** duplicitně přidávat charging do intervalu kde již ECONOMIC_CHARGING plánoval

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification je agent-executed.

### Test Decision
- **Infrastructure exists**: YES (pytest, 3066+ testů zelených)
- **Automated tests**: TDD (RED-GREEN-REFACTOR)
- **Framework**: pytest s `.venv/bin/python`
- **TDD flow**: Každý TODO následuje RED → GREEN → REFACTOR

### QA Policy
- **Backend logic**: Bash (pytest + import test)
- **Integration**: Bash (pytest e2e suite)
- Evidence: `.sisyphus/evidence/`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation, parallel):
├── Task 1: Types + Config rozšíření (EconomicChargingPlanConfig, PrePeakDecision) [quick]
├── Task 2: PrecedenceLevel rozšíření + RolloutFlag [quick]
└── Task 3: TDD skeleton — test_morning_peak_avoidance.py (RED fáze) [quick]

Wave 2 (After Wave 1 — core logic):
├── Task 4: should_pre_charge_for_peak_avoidance() implementace (GREEN fáze) [unspecified-high]
└── Task 5: schedule_pre_peak_charging() v charging_plan_adjustments.py [unspecified-high]

Wave 3 (After Wave 2 — integrace + regrese):
├── Task 6: Integrace do economic_charging_plan() + DecisionTrace [unspecified-high]
└── Task 7: Regresní testy + observability canary alerts [unspecified-high]

Wave FINAL (After ALL tasks — independent review, parallel):
├── F1: Plan Compliance Audit (oracle)
├── F2: Code Quality Review (unspecified-high)
├── F3: Real QA — pytest full suite (unspecified-high)
└── F4: Scope Fidelity Check (deep)

Critical Path: T1 → T4 → T6 → T7 → F1-F4
```

### Dependency Matrix
- **T1**: — — T4, T5
- **T2**: — — T4, T6
- **T3**: T1 — T4
- **T4**: T1, T2, T3 — T6
- **T5**: T1 — T6
- **T6**: T4, T5, T2 — T7
- **T7**: T6 — Final Wave

### Agent Dispatch Summary
- **Wave 1**: T1 → `quick`, T2 → `quick`, T3 → `quick`
- **Wave 2**: T4 → `unspecified-high`, T5 → `unspecified-high`
- **Wave 3**: T6 → `unspecified-high`, T7 → `unspecified-high`
- **Final**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Types + Config rozšíření

  **What to do**:
  - V `charging_plan.py` rozšíř `EconomicChargingPlanConfig` o nové pole:
    - `peak_start_hour: int = 6` (hodina kdy začíná špička, default 6)
    - `peak_end_hour: int = 8` (hodina kdy špička končí)
    - `pre_peak_window_hours: int = 2` (kolik hodin před špičkou prohledávat levné sloty)
    - `hw_min_soc_kwh: float = 2.05` (hardwarové minimum BOXu v kWh, 20% z 10.24 kWh)
    - `round_trip_efficiency: float = 0.87` (0.92 nabíjení × 0.95 vybíjení)
    - `peak_price_ratio_threshold: float = 1.2` (špička musí být aspoň 1.2× dražší než pre-peak po ztrátách)
    - `max_charge_fraction: float = 0.95` (nabíjet max do 95% kapacity, FVE headroom)
  - Vytvoř nový dataclass `PrePeakDecision` (v `charging_plan.py` nebo novém `pre_peak_types.py`):
    ```python
    @dataclass
    class PrePeakDecision:
        should_charge: bool
        reason: str
        soc_at_peak_start_kwh: float
        cheapest_intervals: list[int]  # indexy intervalů k nabíjení
        expected_charge_kwh: float
        estimated_saving_czk: float
        peak_avg_price: float
        pre_peak_avg_price: float
    ```

  **Must NOT do**:
  - NESMÍ měnit signaturu existujících funkcí
  - NESMÍ zasahovat do `forecast_update.py`
  - NESMÍ přidávat HA entity

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Čisté datové typy a config rozšíření, bez složité logiky
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (s Tasks 2, 3)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: None (can start immediately)

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py` — `EconomicChargingPlanConfig` dataclass (najdi existující definici a rozšiř ji)
  - `custom_components/oig_cloud/battery_forecast/planning/precedence_contract.py` — vzor pro konstanty a datové typy

  **Acceptance Criteria**:
  - [ ] `from battery_forecast.planning.charging_plan import EconomicChargingPlanConfig, PrePeakDecision` → ImportError nenastane
  - [ ] `EconomicChargingPlanConfig()` lze vytvořit s default hodnotami → `peak_start_hour == 6`
  - [ ] `.venv/bin/python -m pytest tests/ -v -k "not test_morning_peak"` → 0 nových selhání

  **QA Scenarios**:
  ```
  Scenario: Import nových typů funguje
    Tool: Bash
    Steps:
      1. .venv/bin/python -c "from custom_components.oig_cloud.battery_forecast.planning.charging_plan import EconomicChargingPlanConfig, PrePeakDecision; c = EconomicChargingPlanConfig(); print('peak_start_hour:', c.peak_start_hour, 'round_trip:', c.round_trip_efficiency)"
    Expected Result: "peak_start_hour: 6 round_trip: 0.87"
    Evidence: .sisyphus/evidence/task-1-import-types.txt

  Scenario: Stávající testy nerozbity
    Tool: Bash
    Steps:
      1. .venv/bin/python -m pytest tests/ -v --tb=short -k "not test_morning_peak" 2>&1 | tail -5
    Expected Result: "N passed, 0 failed"
    Evidence: .sisyphus/evidence/task-1-regression.txt
  ```

  **Commit**: YES (group s Task 2)
  - Message: `feat(planner): extend config with pre-peak types and fields`
  - Files: `charging_plan.py`

- [ ] 2. PrecedenceLevel rozšíření + RolloutFlag

  **What to do**:
  - V `precedence_contract.py` přidej novou úroveň:
    ```python
    PRE_PEAK_AVOIDANCE = 850  # Mezi PROTECTION_SAFETY(900) a DEATH_VALLEY(800)
    ```
    Doplň docstring vysvětlující pozici v hierarchii.
  - V `rollout_flags.py` přidej nový flag:
    ```python
    enable_pre_peak_charging: bool = False  # Morning peak avoidance (conservative default)
    ```
  - Přidej do `RolloutFlags` také canary alert threshold:
    ```python
    pre_peak_charging_canary_soc_threshold_kwh: float = 1.5  # Alarm pokud SOC po pre-charge < 1.5 kWh
    ```

  **Must NOT do**:
  - NESMÍ měnit existující PrecedenceLevel hodnoty
  - NESMÍ měnit default hodnoty existujících flagů
  - Default `enable_pre_peak_charging = False` je povinný (bezpečný rollout)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Jednoduché konstanty a flag, žádná logika
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (s Tasks 1, 3)
  - **Blocks**: Tasks 4, 6
  - **Blocked By**: None (can start immediately)

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/precedence_contract.py` — existující PrecedenceLevel enum (najdi hodnoty PROTECTION_SAFETY a DEATH_VALLEY pro správné umístění 850)
  - `custom_components/oig_cloud/battery_forecast/planning/rollout_flags.py` — vzor pro nové flagy (viz `pv_first_policy_enabled`)
  - `tests/test_observability.py` — vzor jak testovat rollout flags

  **Acceptance Criteria**:
  - [ ] `from battery_forecast.planning.precedence_contract import PrecedenceLevel; assert PrecedenceLevel.PRE_PEAK_AVOIDANCE == 850` → PASS
  - [ ] `from battery_forecast.planning.rollout_flags import RolloutFlags; assert RolloutFlags().enable_pre_peak_charging == False` → PASS
  - [ ] `.venv/bin/python -m pytest tests/ -v -k "not test_morning_peak"` → 0 nových selhání

  **QA Scenarios**:
  ```
  Scenario: Precedence hodnota správně umístěna
    Tool: Bash
    Steps:
      1. .venv/bin/python -c "from custom_components.oig_cloud.battery_forecast.planning.precedence_contract import PrecedenceLevel; vals = sorted([(k,v) for k,v in vars(PrecedenceLevel).items() if not k.startswith('_')], key=lambda x: x[1]); [print(v,k) for k,v in vals]"
    Expected Result: PRE_PEAK_AVOIDANCE=850 mezi hodnotami 800 a 900
    Evidence: .sisyphus/evidence/task-2-precedence.txt

  Scenario: Feature flag je False by default
    Tool: Bash
    Steps:
      1. .venv/bin/python -c "from custom_components.oig_cloud.battery_forecast.planning.rollout_flags import RolloutFlags; f = RolloutFlags(); print('pre_peak:', f.enable_pre_peak_charging)"
    Expected Result: "pre_peak: False"
    Evidence: .sisyphus/evidence/task-2-rollout-flag.txt
  ```

  **Commit**: YES (group s Task 1)
  - Message: `feat(planner): extend config with pre-peak types and fields`
  - Files: `precedence_contract.py`, `rollout_flags.py`

- [ ] 3. TDD skeleton — test_morning_peak_avoidance.py (RED fáze)

  **What to do**:
  - Vytvoř `tests/test_morning_peak_avoidance.py` s kompletními testy PŘED implementací (RED fáze):

  ```python
  # test_morning_peak_avoidance.py
  # Tests for Task 4 (core decision logic)
  def test_no_pre_charge_when_soc_sufficient():
      """SOC > 30% v 06:00 → skip"""
  def test_pre_charge_triggered_when_soc_low():
      """SOC ≤ 20% v 06:00 AND peak > pre_peak * 1.2 / 0.87 → should_charge=True"""
  def test_economic_calculation_includes_round_trip():
      """Kalkulace zahrnuje 87% round-trip, ne 100%"""
  def test_pv_first_overrides_peak_avoidance():
      """PV forecast ≥ 0.5 kWh v pre-peak okně → should_charge=False"""
  def test_feature_flag_disables_logic():
      """enable_pre_peak_charging=False → PrePeakDecision.should_charge=False"""
  def test_decision_trace_populated():
      """PrePeakDecision obsahuje soc_at_peak_start_kwh, peak_avg_price, estimated_saving_czk"""
  def test_skip_if_peak_less_than_one_hour_away():
      """Méně než 4 intervaly do špičky → skip (nedostatek času na nabití)"""
  def test_no_double_charge_if_economic_already_scheduled():
      """Pokud ECONOMIC_CHARGING již plánuje tentýž interval → nezdvojovat"""
  def test_do_not_exceed_max_capacity_fraction():
      """Nenabíjet nad max_capacity * 0.95"""
  def test_cheapest_intervals_selected():
      """Z pre-peak okna jsou vybrány nejlevnější intervaly, ne všechny"""
  ```
  Všechny testy musí selhat (`ImportError` nebo `AssertionError`) — to je správné pro RED fázi.

  **Must NOT do**:
  - NESMÍ implementovat logiku — pouze testy
  - NESMÍ importovat neexistující symboly (testy selžou s ImportError, ne SyntaxError)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Psaní test skeletonu, žádná produkční logika
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (s Tasks 1, 2)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1 (potřebuje typy pro import v testech)

  **References**:
  - `tests/test_pv_first_incident.py` — vzor pro strukturu incident testů
  - `tests/test_regression_cluster_a.py` — vzor pro boundary condition testy
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py` — `economic_charging_plan()` signatura pro mock setup

  **Acceptance Criteria**:
  - [ ] Soubor `tests/test_morning_peak_avoidance.py` existuje s 10+ testy
  - [ ] `.venv/bin/python -m pytest tests/test_morning_peak_avoidance.py -v 2>&1 | grep -E "FAILED|ERROR"` → všechny testy selhávají (RED)
  - [ ] `.venv/bin/python -m pytest tests/ -v -k "not test_morning_peak"` → 0 nových selhání v ostatních testech

  **QA Scenarios**:
  ```
  Scenario: RED fáze — všechny nové testy selhávají
    Tool: Bash
    Steps:
      1. .venv/bin/python -m pytest tests/test_morning_peak_avoidance.py -v --tb=line 2>&1 | tail -20
    Expected Result: "N failed, 0 passed" (ImportError nebo AssertionError — NIKOLI SyntaxError)
    Failure Indicators: SyntaxError = chyba v testu; 0 tests collected = prázdný soubor
    Evidence: .sisyphus/evidence/task-3-red-phase.txt
  ```

  **Commit**: YES (standalone)
  - Message: `test(planner): add morning peak avoidance test skeleton (RED phase)`
  - Files: `tests/test_morning_peak_avoidance.py`

- [ ] 4. should_pre_charge_for_peak_avoidance() — core logic (GREEN fáze)

  **What to do**:
  - V `charging_plan.py` implementuj funkci `should_pre_charge_for_peak_avoidance()`:
    ```python
    def should_pre_charge_for_peak_avoidance(
        config: EconomicChargingPlanConfig,
        intervals: list[dict],  # všechny plánované intervaly s time, spot_price_czk, solar_kwh
        now: datetime,
        rollout_flags: RolloutFlags,
    ) -> PrePeakDecision:
    ```
  - Logika funkce:
    1. Zkontroluj `rollout_flags.enable_pre_peak_charging` → pokud False, return `PrePeakDecision(should_charge=False, reason="flag_disabled", ...)`
    2. Najdi první "peak window" od `now` kde průměrná cena > threshold (hledej okno peak_start_hour–peak_end_hour)
    3. Zkontroluj zda je ≥ 4 intervalů (1 hodina) do začátku špičky — pokud ne, return `should_charge=False, reason="too_close_to_peak"`
    4. Pomocí `simulate_forward()` z `charging_plan_utils.py` vypočítej projekci SOC na začátek špičky
    5. Pokud `soc_at_peak_start >= hw_min_soc_kwh * 1.1` → return `should_charge=False, reason="soc_sufficient"`
    6. Zkontroluj PV forecast v pre-peak okně: pokud `sum(solar_kwh) >= 0.5` → return `should_charge=False, reason="pv_first_deferred"`
    7. Spočítej ekonomiku:
       - `pre_peak_avg = mean(spot prices v okně now → peak_start)`
       - `peak_avg = mean(spot prices v okně peak_start → peak_end)`
       - `breakeven = pre_peak_avg / round_trip_efficiency`
       - Pokud `peak_avg < breakeven * peak_price_ratio_threshold` → return `should_charge=False, reason="not_economical"`
    8. Vyber nejlevnější intervaly v pre-peak okně, nabij do `min(hw_min_soc_kwh * 1.2, max_capacity * max_charge_fraction)`
    9. Ověř že neduplicujeme intervaly kde je ECONOMIC_CHARGING (projdi existující plan a přeskoč)
    10. Return `PrePeakDecision(should_charge=True, reason="economical_pre_peak", ...)`

  **Must NOT do**:
  - NESMÍ volat `simulate_forward()` s jinými parametry než existující call sites
  - NESMÍ modifikovat `simulate_forward()` signaturu
  - NESMÍ přistupovat k HA API přímo

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Komplexní business logika s ekonomickými výpočty, edge cases a interakcí s existujícím kodem
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential po Wave 1)
  - **Parallel Group**: Wave 2 (s Task 5)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan_utils.py:73-159` — `simulate_forward()` funkce (přesná signatura a návratové hodnoty)
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py:68-95` — `should_defer_for_pv()` vzor pro similar gate funkci
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py:97-267` — `economic_charging_plan()` kontext kde bude funkce volána
  - `custom_components/oig_cloud/battery_forecast/planning/rollout_flags.py` — `RolloutFlags` dataclass (přidán v Task 2)
  - `tests/test_morning_peak_avoidance.py` — 10 testů k zelené (RED→GREEN fáze)

  **Acceptance Criteria**:
  - [ ] `.venv/bin/python -m pytest tests/test_morning_peak_avoidance.py -v` → všechny testy PASS (GREEN)
  - [ ] `.venv/bin/python -m pytest tests/ -v -k "not test_morning_peak"` → 0 nových selhání
  - [ ] `should_pre_charge_for_peak_avoidance()` vrací `should_charge=False` pokud `enable_pre_peak_charging=False`
  - [ ] Kalkulace zahrnuje `round_trip_efficiency=0.87` (test AC3 v test souboru)

  **QA Scenarios**:
  ```
  Scenario: GREEN fáze — všechny testy procházejí
    Tool: Bash
    Steps:
      1. .venv/bin/python -m pytest tests/test_morning_peak_avoidance.py -v 2>&1 | tail -15
    Expected Result: "10 passed, 0 failed"
    Failure Indicators: Jakýkoli FAILED nebo ERROR
    Evidence: .sisyphus/evidence/task-4-green-phase.txt

  Scenario: Feature flag disables logic
    Tool: Bash
    Steps:
      1. .venv/bin/python -c "
  from custom_components.oig_cloud.battery_forecast.planning.charging_plan import should_pre_charge_for_peak_avoidance, EconomicChargingPlanConfig
  from custom_components.oig_cloud.battery_forecast.planning.rollout_flags import RolloutFlags
  flags = RolloutFlags()  # default: enable_pre_peak_charging=False
  result = should_pre_charge_for_peak_avoidance(EconomicChargingPlanConfig(), [], __import__('datetime').datetime.now(), flags)
  print('should_charge:', result.should_charge, '| reason:', result.reason)
  "
    Expected Result: "should_charge: False | reason: flag_disabled"
    Evidence: .sisyphus/evidence/task-4-flag-disabled.txt

  Scenario: Ekonomická kalkulace zahrnuje round-trip ztráty
    Tool: Bash
    Steps:
      1. .venv/bin/python -m pytest tests/test_morning_peak_avoidance.py::test_economic_calculation_includes_round_trip -v 2>&1
    Expected Result: "1 passed"
    Evidence: .sisyphus/evidence/task-4-round-trip.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(planner): implement pre-peak avoidance core decision logic`
  - Files: `charging_plan.py`

- [ ] 5. schedule_pre_peak_charging() v charging_plan_adjustments.py

  **What to do**:
  - V `charging_plan_adjustments.py` přidej funkci `schedule_pre_peak_charging()`:
    ```python
    def schedule_pre_peak_charging(
        intervals: list[dict],
        decision: PrePeakDecision,
        config: EconomicChargingPlanConfig,
    ) -> list[dict]:
        """
        Post-generation adjustment: přidá grid_charge_kwh do vybraných pre-peak intervalů.
        Vzor: fix_minimum_capacity_violations() v tomto souboru.
        """
    ```
  - Logika:
    1. Pokud `decision.should_charge == False` → return intervals beze změny
    2. Pro každý index v `decision.cheapest_intervals`:
       - Ověř že interval ještě nemá `grid_charge_kwh > 0` (ne-duplikovat)
       - Nastav `grid_charge_kwh` na vypočítanou hodnotu
       - Nastav `mode` na odpovídající grid charging mode
       - Přidej `decision_reason = f"pre_peak_avoidance: {decision.reason}"`
    3. Return modifikované intervals

  **Must NOT do**:
  - NESMÍ měnit existující funkce `fix_minimum_capacity_violations()` a `ensure_target_capacity_at_end()`
  - NESMÍ měnit intervaly mimo `decision.cheapest_intervals`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Interakce s existující strukturou intervalů, musí respektovat vzory z fix_minimum_capacity_violations()
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (s Task 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1 (typy)

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan_adjustments.py:13-78` — `fix_minimum_capacity_violations()` vzor (přesná struktura intervals dicts, jak se nastavuje grid_charge_kwh)
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan_adjustments.py:81-150` — `ensure_target_capacity_at_end()` vzor pro post-generation adjustments
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py` — `PrePeakDecision` dataclass (přidán v Task 1)

  **Acceptance Criteria**:
  - [ ] `from battery_forecast.planning.charging_plan_adjustments import schedule_pre_peak_charging` → OK
  - [ ] Volání s `decision.should_charge=False` → intervals vráceny beze změny
  - [ ] Volání s validním `decision` → správný interval má `grid_charge_kwh > 0`
  - [ ] `.venv/bin/python -m pytest tests/ -v -k "not test_morning_peak"` → 0 nových selhání

  **QA Scenarios**:
  ```
  Scenario: Import funkce funguje
    Tool: Bash
    Steps:
      1. .venv/bin/python -c "from custom_components.oig_cloud.battery_forecast.planning.charging_plan_adjustments import schedule_pre_peak_charging; print('OK')"
    Expected Result: "OK"
    Evidence: .sisyphus/evidence/task-5-import.txt

  Scenario: schedule_pre_peak_charging nemodifikuje intervals pokud should_charge=False
    Tool: Bash
    Steps:
      1. .venv/bin/python -m pytest tests/test_morning_peak_avoidance.py -v -k "schedule" 2>&1 | tail -5
    Expected Result: "passed, 0 failed" (nebo žádný test k filtraci — stačí že stávající testy projdou)
    Evidence: .sisyphus/evidence/task-5-no-modify.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(planner): add schedule_pre_peak_charging post-generation adjustment`
  - Files: `charging_plan_adjustments.py`

- [ ] 6. Integrace do economic_charging_plan() + DecisionTrace

  **What to do**:
  - V `charging_plan.py`, v `economic_charging_plan()`, přidej volání pre-peak logiky:
    - Po PV-first defer check (~line 162), ALE před hlavním economic candidate selection
    - Pseudokód:
      ```python
      # Pre-peak avoidance pass (PRE_PEAK_AVOIDANCE = 850)
      pre_peak_decision = should_pre_charge_for_peak_avoidance(config, intervals, now, rollout_flags)
      if pre_peak_decision.should_charge:
          intervals = schedule_pre_peak_charging(intervals, pre_peak_decision, config)
          trace.add_decision(
              reason_code="pre_peak_avoidance",
              precedence=PrecedenceLevel.PRE_PEAK_AVOIDANCE,
              details={
                  "soc_at_peak_start_kwh": pre_peak_decision.soc_at_peak_start_kwh,
                  "peak_avg_price": pre_peak_decision.peak_avg_price,
                  "pre_peak_avg_price": pre_peak_decision.pre_peak_avg_price,
                  "estimated_saving_czk": pre_peak_decision.estimated_saving_czk,
                  "charged_kwh": pre_peak_decision.expected_charge_kwh,
              }
          )
      ```
  - Rozšíř `DecisionTrace` o nový `reason_code="pre_peak_avoidance"` pokud ještě nepodporuje arbitrary reason codes
  - Přidej observability: pokud canary threshold překročen (SOC po pre-charge < `pre_peak_charging_canary_soc_threshold_kwh`), loguj varování

  **Must NOT do**:
  - NESMÍ vložit pre-peak call PŘED PV-first check (PV-first má vyšší precedenci 1000)
  - NESMÍ měnit signaturu `economic_charging_plan()`
  - NESMÍ zasahovat do `forecast_update.py`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integrace do kritického kódu, musí respektovat precedence hierarchii a existující flow
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential po Wave 2)
  - **Parallel Group**: Wave 3 (s Task 7)
  - **Blocks**: Task 7, Final Wave
  - **Blocked By**: Tasks 4, 5, 2

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py:97-267` — `economic_charging_plan()` celá funkce (přesné místo vložení: po should_defer_for_pv() check)
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py:68-95` — `should_defer_for_pv()` (pre-peak volání MUSÍ být AŽ ZA tímto blokem)
  - `custom_components/oig_cloud/battery_forecast/planning/precedence_contract.py` — `PrecedenceLevel.PRE_PEAK_AVOIDANCE` (přidán v Task 2)
  - `custom_components/oig_cloud/battery_forecast/planning/observability.py` — vzor pro canary alerting (`add_canary_alert()` nebo podobné)
  - `tests/test_e2e_precedence_chain.py` — vzor pro e2e precedence testy

  **Acceptance Criteria**:
  - [ ] `.venv/bin/python -m pytest tests/test_morning_peak_avoidance.py -v` → PASS (všechny testy)
  - [ ] `.venv/bin/python -m pytest tests/test_pv_first_incident.py -v` → 6 passed (žádná PV-first regrese)
  - [ ] `.venv/bin/python -m pytest tests/test_e2e_precedence_chain.py -v` → PASS (žádná e2e regrese)
  - [ ] Pokud `enable_pre_peak_charging=True` a podmínky splněny → `decision_reason` v intervalech obsahuje "pre_peak_avoidance"
  - [ ] DecisionTrace obsahuje `soc_at_peak_start_kwh` a `estimated_saving_czk`

  **QA Scenarios**:
  ```
  Scenario: Integrace — pre-peak logika se volá z economic_charging_plan()
    Tool: Bash
    Steps:
      1. .venv/bin/python -m pytest tests/test_morning_peak_avoidance.py -v 2>&1 | tail -15
    Expected Result: "10+ passed, 0 failed"
    Evidence: .sisyphus/evidence/task-6-integration.txt

  Scenario: PV-first stále funguje — žádná regrese
    Tool: Bash
    Steps:
      1. .venv/bin/python -m pytest tests/test_pv_first_incident.py tests/test_e2e_precedence_chain.py -v 2>&1 | tail -10
    Expected Result: "17 passed, 0 failed" (6 + 11 původních testů)
    Failure Indicators: Jakýkoli FAILED = regrese v PV-first nebo precedence
    Evidence: .sisyphus/evidence/task-6-pv-first-regression.txt

  Scenario: DecisionTrace obsahuje pre-peak metadata
    Tool: Bash
    Steps:
      1. .venv/bin/python -m pytest tests/test_morning_peak_avoidance.py::test_decision_trace_populated -v 2>&1
    Expected Result: "1 passed"
    Evidence: .sisyphus/evidence/task-6-decision-trace.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(planner): integrate pre-peak avoidance into economic charging pipeline`
  - Files: `charging_plan.py`

- [ ] 7. Regresní testy + observability canary alerts

  **What to do**:
  - Vytvoř `tests/test_regression_peak_cluster.py` s regresními testy:
    ```python
    # Cluster A: PV-first zachování
    def test_pv_first_not_overridden_by_pre_peak_avoidance():
        """S PV forecast ≥ 0.5 kWh → pre_peak.should_charge=False"""
    def test_pv_first_still_wins_when_pre_peak_active():
        """I s enable_pre_peak_charging=True, PV_FIRST(1000) > PRE_PEAK(850)"""

    # Cluster B: DEATH_VALLEY zachování
    def test_death_valley_still_triggers_independently():
        """DEATH_VALLEY(800) stále funguje i když PRE_PEAK_AVOIDANCE(850) byl přidán"""

    # Cluster C: Edge cases z Metis
    def test_skip_when_peak_less_than_one_hour_away():
        """< 4 intervaly do špičky → skip"""
    def test_no_double_charge_existing_economic_intervals():
        """ECONOMIC_CHARGING interval → nezdvojovat"""
    def test_not_economical_when_spread_too_small():
        """peak/pre_peak spread < 1.2/0.87 → should_charge=False"""
    def test_soc_already_sufficient_skip():
        """SOC=60% v 06:00 → skip"""

    # Cluster D: Rollout
    def test_canary_flag_logs_warning_on_low_post_charge_soc():
        """Pokud SOC po pre-charge < canary_threshold → warning zalogován"""
    ```
  - Ověř v observability že nové canary alert pro pre-peak funguje (check `observability.py` vzory)
  - Spusť celý test suite a ověř 0 regresí

  **Must NOT do**:
  - NESMÍ měnit existující test soubory (pouze nové přidávat)
  - NESMÍ zasahovat do `forecast_update.py`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Obsáhlý regresní cluster, vyžaduje porozumění celé precedence hierarchy
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (s Task 6)
  - **Blocks**: Final Wave
  - **Blocked By**: Task 6

  **References**:
  - `tests/test_regression_cluster_a.py` — vzor pro regresní cluster strukturu (22 testů, boundary conditions)
  - `tests/test_regression_cluster_b.py` — vzor (13 testů, boiler + canary)
  - `custom_components/oig_cloud/battery_forecast/planning/observability.py` — existující canary alerting vzory
  - `custom_components/oig_cloud/battery_forecast/planning/rollout_flags.py` — `pre_peak_charging_canary_soc_threshold_kwh` (přidán v Task 2)

  **Acceptance Criteria**:
  - [ ] `tests/test_regression_peak_cluster.py` existuje s 8+ testy
  - [ ] `.venv/bin/python -m pytest tests/test_regression_peak_cluster.py -v` → PASS
  - [ ] `.venv/bin/python -m pytest tests/ -v` → PASS (celý suite, žádná regrese)
  - [ ] Počet testů v suite ≥ 3066 + nové testy z Tasks 3 a 7 (žádné testy nezmizely)

  **QA Scenarios**:
  ```
  Scenario: Celý test suite zelený
    Tool: Bash
    Steps:
      1. .venv/bin/python -m pytest tests/ -v --tb=short 2>&1 | tail -10
    Expected Result: "N passed, 0 failed" kde N ≥ 3076
    Failure Indicators: Jakýkoli FAILED nebo ERROR v existujících testech
    Evidence: .sisyphus/evidence/task-7-full-suite.txt

  Scenario: Regresní cluster prochází
    Tool: Bash
    Steps:
      1. .venv/bin/python -m pytest tests/test_regression_peak_cluster.py -v 2>&1 | tail -15
    Expected Result: "8+ passed, 0 failed"
    Evidence: .sisyphus/evidence/task-7-regression-cluster.txt

  Scenario: Canary alert test
    Tool: Bash
    Steps:
      1. .venv/bin/python -m pytest tests/test_regression_peak_cluster.py::test_canary_flag_logs_warning_on_low_post_charge_soc -v 2>&1
    Expected Result: "1 passed"
    Evidence: .sisyphus/evidence/task-7-canary.txt
  ```

  **Commit**: YES (standalone)
  - Message: `test(regression): add morning-peak regression cluster and canary checks`
  - Files: `tests/test_regression_peak_cluster.py`

---

## Final Verification Wave

> 4 review agenti běží PARALELNĚ. Všichni musí schválit.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Přečti plán od začátku. Pro každý "Must Have": ověř implementaci (přečti soubor, spusť test). Pro každý "Must NOT Have": prohledej codebase pro zakázané vzory — odmítni s file:line pokud nalezeno. Zkontroluj existence evidence souborů v .sisyphus/evidence/. Porovnej deliverables oproti plánu.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Spusť `.venv/bin/python -m pytest tests/ -v --tb=short 2>&1 | tail -20`. Zkontroluj nové soubory: žádné `as any`/@ts-ignore, prázdné except, print() v produkčním kódu. Zkontroluj AI slop: zbytečné komentáře, přílišná abstrakce.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real QA** — `unspecified-high`
  Spusť kompletní test suite: `.venv/bin/python -m pytest tests/ -v 2>&1`. Ověř každý QA scénář z každého tasku. Ověř edge cases: SOC=100% (skip), SOC=25% (trigger), PV-first override (nespustit), flag=False (nespustit).
  Output: `Tests [N/N pass] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  Pro každý task: přečti "What to do", přečti skutečný diff (`git log --oneline -10`, `git diff HEAD~7`). Ověř 1:1. Zkontroluj "Must NOT do": žádný zásah do forecast_update.py, www_v2/, hybrid_planning.py. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(planner): add pre-peak types, config, and precedence level` — charging_plan.py, precedence_contract.py, rollout_flags.py
- **Wave 2**: `feat(planner): implement pre-peak avoidance core logic` — charging_plan.py, charging_plan_adjustments.py
- **Wave 3**: `feat(planner): integrate pre-peak avoidance and add observability` — charging_plan.py, tests/
- **Final**: `test(regression): add morning-peak regression cluster` — tests/

---

## Success Criteria

### Verification Commands
```bash
# 1. Celý test suite zelený
.venv/bin/python -m pytest tests/ -v --tb=short 2>&1 | tail -5
# Expected: N passed, 0 failed

# 2. Feature flag funguje
.venv/bin/python -m pytest tests/test_morning_peak_avoidance.py -v
# Expected: všechny testy PASS

# 3. Import funguje
.venv/bin/python -c "from custom_components.oig_cloud.battery_forecast.planning.charging_plan import economic_charging_plan; print('OK')"
# Expected: OK

# 4. Žádná regrese PV-first
.venv/bin/python -m pytest tests/test_pv_first_incident.py -v
# Expected: 6 passed
```

### Final Checklist
- [ ] Must Have: `should_pre_charge_for_peak_avoidance()` implementována a integrována
- [ ] Must Have: Round-trip efektivita 87% v ekonomické kalkulaci
- [ ] Must Have: PV-first zachováno (žádná regrese)
- [ ] Must Have: DEATH_VALLEY zachováno (žádná regrese)
- [ ] Must Have: Rollout flag `enable_pre_peak_charging` (default=False)
- [ ] Must Have: DecisionTrace reason_code="pre_peak_avoidance"
- [ ] Must NOT Have: Žádný zásah do forecast_update.py
- [ ] Must NOT Have: Žádné nové HA entity
- [ ] Must NOT Have: Žádný zásah do www_v2/ ani hybrid_planning.py
- [ ] Testy: `pytest tests/ -v` → 0 failures
