# Grid + Boiler Rules Overhaul (PV-First)

## TL;DR

> **Quick Summary**: Kompletní revize rozhodovací logiky plánovače tak, aby primárně maximalizoval využití vlastní FV výroby, a grid nabíjení používal jen jako fallback při explicitních bezpečnostních/podmíněných situacích.
>
> **Deliverables**:
> - Explicitní baseline matice všech současných pravidel a konfliktů
> - Nová sjednocená precedence policy (battery-grid-boiler)
> - TDD regresní testy reprodukující incident + nové edge-case scénáře
> - Agresivní rollout s guardraily a rollback mechanismem
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves + final verification
> **Critical Path**: Task 1 -> Task 6 -> Task 9 -> Task 12 -> Task 14 -> F1-F4

---

## Context

### Original Request
Uživatel hlásí neoptimální chování: baterie se nabila ze sítě i v den očekávané výroby FV, čímž vznikl náklad ~5 CZK/kWh; následně energie končí v bojleru. Cíl: kompletní revize pravidel a případná změna automatizační logiky.

### Interview Summary
**Key Discussions**:
- Priorita #1: maximalizovat vlastní FV self-consumption.
- Priorita #2: po PV-first řídit dynamicky podle dne (forecast + ceny + situace).
- Rozsah: zahrnout grid pravidla i koordinaci bojleru.
- Rollout: může být agresivní.
- Nutné vycházet z aktuálně implementovaných pravidel a jejich logických překryvů.
- Test strategie: TDD.

**Research Findings**:
- Rozhodovací řetězec vede přes: `charging_plan.py`, `hybrid_planning.py`, `hybrid.py`, `forecast_update.py`, `balancing/core.py`, `boiler/planner.py`, `auto_switch.py`, `mode_guard.py`, `spot_price_15min.py`.
- Existují překryvy: protection vs economic, balancing override vs economic, mode guard vs auto-switch, HW hold vs ekonomika.
- Balancing vrstva obsahuje TODO markery a musí projít truthingem vůči real behavior.

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Chybějící explicitní rollback/kill-switch guardrails pro agresivní rollout.
- Potřeba formalizovat priority mapu mezi battery/grid/boiler při konfliktech.
- Potřeba pokrýt edge-case scénáře (forecast error, stale prices, manual override races, balancing konflikty).

---

## Work Objectives

### Core Objective
Přestavět pravidla plánovače na deterministickou PV-first politiku s jednoznačnou precedence vrstvou mezi baterií, gridem a bojlerem, aby se předešlo drahému grid chargingu v situacích, kdy je očekávaný FV zisk.

### Concrete Deliverables
- Nová precedence specifikace a conflict resolution matrix pro rule engine.
- Implementovatelný plán refaktoru stávajících pravidel s minimem regresí.
- TDD sada reprodukující incident a validující nové priority.
- Rollout/rollback postup pro bezpečné nasazení agresivních změn.

### Definition of Done
- [ ] Incident je reprodukovatelný testem před změnou a po změně test PASS.
- [ ] V edge-case scénářích není grid charging aktivní, pokud PV-expected branch říká defer (kromě explicitních protection override).
- [ ] Boiler routing respektuje novou precedence logiku a neobchází battery/PV-first politiku.
- [ ] QA evidence je uložená v `.sisyphus/evidence/` pro každý task scénář.

### Must Have
- Deterministická precedence pravidel (žádné implicitní kolize).
- TDD-first průběh pro kritické decision body.
- Guardrails pro agresivní rollout (feature flags, emergency fallback, observability).

### Must NOT Have (Guardrails)
- Žádné tiché změny business priority mimo explicitní policy matrix.
- Žádné rozšiřování scope do unrelated UI/UX redesignu.
- Žádné odstranění protection safety logiky bez ekvivalentní náhrady.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ověření pouze agent-executed.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: TDD
- **Framework**: pytest (core), vitest/playwright where relevant
- **TDD policy**: RED -> GREEN -> REFACTOR u každého kritického decision tasku

### QA Policy
Každý task obsahuje minimálně:
- 1 happy-path scenario
- 1 failure/edge scenario
- důkazní artefakt do `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately — baseline + contracts):
- Task 1, 2, 3, 4, 5, 6

Wave 2 (Policy + core decision refactor):
- Task 7, 8, 9, 10, 11

Wave 3 (Integration + rollout safety):
- Task 12, 13, 14

Wave 4 (Regression hardening):
- Task 15, 16

Wave FINAL (Independent review):
- F1, F2, F3, F4

### Dependency Matrix

- **1**: none -> 7, 8
- **2**: none -> 7, 9
- **3**: none -> 8, 10
- **4**: none -> 9, 10
- **5**: none -> 11, 13
- **6**: none -> 11, 12
- **7**: 1,2 -> 12, 15
- **8**: 1,3 -> 12, 15
- **9**: 2,4 -> 12, 16
- **10**: 3,4 -> 13, 16
- **11**: 5,6 -> 13, 14
- **12**: 7,8,9 -> 14, 15
- **13**: 10,11 -> 14, 16
- **14**: 11,12,13 -> 15, 16
- **15**: 7,8,12,14 -> F1-F4
- **16**: 9,10,13,14 -> F1-F4

### Agent Dispatch Summary

- **Wave 1**: 6 tasks — `deep` x2, `quick` x2, `unspecified-high` x2
- **Wave 2**: 5 tasks — `deep` x3, `unspecified-high` x1, `quick` x1
- **Wave 3**: 3 tasks — `deep` x1, `unspecified-high` x1, `quick` x1
- **Wave 4**: 2 tasks — `deep` x2
- **FINAL**: 4 tasks — `oracle`, `unspecified-high`, `unspecified-high`, `deep`

---

## TODOs

- [ ] 1. Build authoritative current-rule matrix from code

  **What to do**:
  - Extract all currently active decision rules from planner/boiler/balancing/autoswitch modules.
  - Record explicit condition -> action -> priority/order -> overlap mappings as baseline artifact.
  - Freeze baseline snapshot for regression comparisons.

  **Must NOT do**:
  - Do not infer behavior from docs only.
  - Do not change runtime behavior in this task.

  **Recommended Agent Profile**:
  - **Category**: `deep` (multi-module logic extraction and conflict mapping)
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `playwright`: not needed for static logic extraction.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 2,3,4,5,6)
  - **Blocks**: 7, 8
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py` - core grid/economic/protection branches.
  - `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py` - recovery/planning min/blocked indices.
  - `custom_components/oig_cloud/battery_forecast/strategy/hybrid.py` - mode decision outcomes and interval behavior.
  - `custom_components/oig_cloud/boiler/planner.py` - boiler source priority and overflow windows.

  **Acceptance Criteria**:
  - [ ] Baseline rule matrix created with unique Rule IDs and explicit precedence ordering.
  - [ ] Conflict/overlap section includes at least protection-vs-economic and balancing-vs-economic collisions.

  **QA Scenarios**:
  ```text
  Scenario: Baseline matrix completeness
    Tool: Bash (pytest)
    Preconditions: repository test environment available
    Steps:
      1. Run: pytest tests/test_planning_helpers.py -q
      2. Verify parser/normalizer helpers still pass after baseline extraction scripts/docs update.
      3. Save output.
    Expected Result: command exits 0 and baseline generation does not break helper layer.
    Failure Indicators: non-zero exit, missing matrix sections.
    Evidence: .sisyphus/evidence/task-1-baseline-matrix.txt

  Scenario: Missing-precedence guard
    Tool: Bash (pytest)
    Preconditions: baseline matrix generated
    Steps:
      1. Run targeted validation test for matrix schema (new test file for matrix integrity).
      2. Assert missing priority field fails the test in RED phase.
    Expected Result: RED before implementation, GREEN after matrix validation logic.
    Evidence: .sisyphus/evidence/task-1-matrix-schema-error.txt
  ```

  **Commit**: YES (groups with 2)
  - Message: `test(planner): add codified rule-matrix baseline`

- [ ] 2. Create incident reproduction tests (RED)

  **What to do**:
  - Encode user incident as deterministic failing tests (grid charge despite PV expected; subsequent boiler diversion).
  - Add fixtures for forecast, price curve, SOC start, and boiler demand.
  - Assert current behavior fails PV-first expectation.

  **Must NOT do**:
  - Do not patch core logic yet.
  - Do not weaken assertions to pass current behavior.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: irrelevant.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 7, 9
  - **Blocked By**: None

  **References**:
  - `tests/test_hybrid_planning_more.py` - pattern for planner behavior assertions.
  - `tests/test_grid_charging_plan_sensor.py` - grid charging detection patterns.
  - `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py` - orchestration path to reproduce timeline.

  **Acceptance Criteria**:
  - [ ] At least two RED tests exist: incident happy reproduction and conflict scenario with boiler route.
  - [ ] Tests fail for the right reason (PV-first expectation violated).

  **QA Scenarios**:
  ```text
  Scenario: Incident RED reproduction
    Tool: Bash (pytest)
    Preconditions: new regression tests added
    Steps:
      1. Run: pytest tests/test_pv_first_incident.py::test_grid_charge_is_deferred_when_pv_expected -q
      2. Assert test fails with mismatch on grid charge decision.
    Expected Result: FAIL in RED phase with explicit assertion message.
    Failure Indicators: test passes unexpectedly or fails for setup error.
    Evidence: .sisyphus/evidence/task-2-incident-red.txt

  Scenario: Boiler diversion conflict RED
    Tool: Bash (pytest)
    Preconditions: conflict fixture includes boiler demand + partial SOC
    Steps:
      1. Run: pytest tests/test_pv_first_incident.py::test_boiler_does_not_force_early_grid_charge -q
      2. Assert current logic violates desired precedence.
    Expected Result: FAIL with conflict assertion.
    Evidence: .sisyphus/evidence/task-2-boiler-conflict-red.txt
  ```

  **Commit**: YES (groups with 1)
  - Message: `test(planner): reproduce pv-first regression incident`

- [ ] 3. Add deterministic precedence contract specification

  **What to do**:
  - Define explicit global priority ladder (PV-first, dynamic day policy, protection overrides, fallbacks).
  - Encode conflict-resolution contract used by all decision layers.
  - Include invariant list for non-negotiables.

  **Must NOT do**:
  - Do not embed contradictory local priorities.
  - Do not leave unresolved tie rules.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `writing`: artifact is technical contract bound to executable checks.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 8, 10
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/battery_forecast/config.py` - existing configurable thresholds and flags.
  - `custom_components/oig_cloud/battery_forecast/planning/mode_guard.py` - current override behavior requiring harmonization.

  **Acceptance Criteria**:
  - [ ] Contract defines strict ordering and tie-breakers.
  - [ ] Contract is referenced by tests validating decision ordering.

  **QA Scenarios**:
  ```text
  Scenario: Precedence ladder invariant checks
    Tool: Bash (pytest)
    Preconditions: contract file and invariant tests added
    Steps:
      1. Run: pytest tests/test_rule_precedence_contract.py::test_priority_order_is_total -q
      2. Assert no ambiguous ordering remains.
    Expected Result: PASS once contract complete.
    Failure Indicators: cycle/ambiguity in precedence graph.
    Evidence: .sisyphus/evidence/task-3-precedence-invariants.txt

  Scenario: Tie-break failure case
    Tool: Bash (pytest)
    Preconditions: synthetic case with equal score branches
    Steps:
      1. Run: pytest tests/test_rule_precedence_contract.py::test_tie_breakers_are_deterministic -q
      2. Verify deterministic branch is selected.
    Expected Result: PASS with fixed chosen action id.
    Evidence: .sisyphus/evidence/task-3-tiebreak.txt
  ```

  **Commit**: NO

- [ ] 4. Add stale-input guards for forecast and pricing quality

  **What to do**:
  - Introduce stale/invalid input quality checks for PV forecast and spot pricing data.
  - Define fallback behavior matrix (safe degrade path).
  - Add telemetry markers for degraded decision mode.

  **Must NOT do**:
  - Do not silently continue with stale high-risk inputs.
  - Do not disable existing protection overrides.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `playwright`: not relevant.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 9, 10
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/pricing/spot_price_15min.py` - pricing feed shape and fallback handling.
  - `custom_components/oig_cloud/battery_forecast/data/solar_forecast.py` - PV forecast ingestion details.

  **Acceptance Criteria**:
  - [ ] Degraded mode triggers when forecast/price are stale.
  - [ ] Fallback path is explicit and covered by tests.

  **QA Scenarios**:
  ```text
  Scenario: Stale forecast fallback
    Tool: Bash (pytest)
    Preconditions: stale forecast fixture with valid prices
    Steps:
      1. Run: pytest tests/test_input_quality_guards.py::test_stale_pv_forecast_triggers_fallback -q
      2. Assert decision includes degraded_reason flag.
    Expected Result: PASS with fallback action and reason code.
    Failure Indicators: no flag or unsafe grid charge path.
    Evidence: .sisyphus/evidence/task-4-stale-forecast.txt

  Scenario: Stale pricing fallback
    Tool: Bash (pytest)
    Preconditions: stale price fixture with valid PV forecast
    Steps:
      1. Run: pytest tests/test_input_quality_guards.py::test_stale_price_data_blocks_economic_charge -q
      2. Assert economic branch is disabled in degraded mode.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-4-stale-prices.txt
  ```

  **Commit**: NO

- [ ] 5. Establish aggressive rollout safety envelope (flags + rollback)

  **What to do**:
  - Add feature flags for new PV-first policy and boiler-coordination policy.
  - Define emergency rollback switch restoring legacy decision path.
  - Add rollout phases with explicit gate metrics.

  **Must NOT do**:
  - Do not ship irreversible logic without kill-switch.
  - Do not tie rollback to manual code edit.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: not required for implementation logic.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 11, 13
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/battery_forecast/config.py` - config surface for policy switches.
  - `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py` - central orchestration injection point for feature gating.

  **Acceptance Criteria**:
  - [ ] New policy can be enabled/disabled without code changes.
  - [ ] Rollback path is tested and restores legacy branch behavior.

  **QA Scenarios**:
  ```text
  Scenario: Feature-flag enable path
    Tool: Bash (pytest)
    Preconditions: new flags configured ON in test fixture
    Steps:
      1. Run: pytest tests/test_rollout_flags.py::test_new_policy_enabled_path -q
      2. Assert new precedence branch executes.
    Expected Result: PASS.
    Failure Indicators: legacy path remains active.
    Evidence: .sisyphus/evidence/task-5-flag-enable.txt

  Scenario: Emergency rollback path
    Tool: Bash (pytest)
    Preconditions: emergency rollback flag true
    Steps:
      1. Run: pytest tests/test_rollout_flags.py::test_rollback_restores_legacy_logic -q
      2. Assert outputs match legacy baseline fixtures.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-5-rollback.txt
  ```

  **Commit**: NO

- [ ] 6. Normalize balancing truth-state and TODO ambiguity

  **What to do**:
  - Verify actual runtime behavior of natural/opportunistic/forced balancing vs TODO markers.
  - Produce explicit truth table consumed by precedence engine.
  - Lock explicit integration boundary between balancing and core decision policy.

  **Must NOT do**:
  - Do not leave balancing status implicit/assumed.
  - Do not let balancing silently override PV-first without explicit precedence rule.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `writing`: requires executable validations, not prose only.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 11, 12
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/battery_forecast/balancing/core.py` - balancing mode behavior and completion checks.
  - `custom_components/oig_cloud/battery_forecast/balancing/plan.py` - balancing plan structure contract.

  **Acceptance Criteria**:
  - [ ] Balancing state transitions are explicit and tested.
  - [ ] TODO ambiguity is replaced by executable assertions and documented state map.

  **QA Scenarios**:
  ```text
  Scenario: Forced balancing state transition
    Tool: Bash (pytest)
    Preconditions: cycle-expiry fixture
    Steps:
      1. Run: pytest tests/test_balancing_state_map.py::test_forced_balancing_transition -q
      2. Assert transition order and override markers.
    Expected Result: PASS.
    Failure Indicators: unexpected state order, missing markers.
    Evidence: .sisyphus/evidence/task-6-forced-balancing.txt

  Scenario: Opportunistic conflict with PV-first
    Tool: Bash (pytest)
    Preconditions: opportunistic window + strong PV forecast
    Steps:
      1. Run: pytest tests/test_balancing_state_map.py::test_opportunistic_does_not_break_pv_first_contract -q
      2. Assert precedence engine decision matches contract.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-6-opportunistic-conflict.txt
  ```

  **Commit**: YES (groups with 5,6)
  - Message: `chore(planner): add rollout guards and balancing state truth map`

- [ ] 7. Implement unified PV-first gate at charge decision entry

  **What to do**:
  - Add a single gate function deciding defer-vs-charge before economic charging branch executes.
  - Integrate protection/death-valley bypass as explicit exceptions.
  - Route downstream planners through this unified decision output.

  **Must NOT do**:
  - Do not duplicate gate logic in multiple modules.
  - Do not remove protection override path.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: not relevant.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with 8,9,10,11)
  - **Blocks**: 12, 15
  - **Blocked By**: 1, 2

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py` - economic charge decision entry points.
  - `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py` - recovery and candidate timing.

  **Acceptance Criteria**:
  - [ ] Incident RED test turns GREEN with PV-first defer behavior.
  - [ ] Protection/death-valley tests remain GREEN.

  **QA Scenarios**:
  ```text
  Scenario: PV-first defer happy path
    Tool: Bash (pytest)
    Preconditions: strong PV forecast within configured lookahead
    Steps:
      1. Run: pytest tests/test_pv_first_incident.py::test_grid_charge_is_deferred_when_pv_expected -q
      2. Assert grid charge energy for early expensive interval is zero.
    Expected Result: PASS.
    Failure Indicators: interval still marked as grid charge.
    Evidence: .sisyphus/evidence/task-7-pv-defer-green.txt

  Scenario: Protection override bypass
    Tool: Bash (pytest)
    Preconditions: low SOC crossing safety threshold
    Steps:
      1. Run: pytest tests/test_pv_first_incident.py::test_protection_override_bypasses_defer -q
      2. Assert charging occurs despite PV defer candidate.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-7-protection-bypass.txt
  ```

  **Commit**: NO

- [ ] 8. Implement dynamic-by-day policy scoring layer

  **What to do**:
  - Implement day-context policy selector (forecast quality, price spread, SOC runway, demand profile).
  - Keep PV-first as hard top priority; dynamic layer only resolves lower-order conflicts.
  - Persist reason codes for observability.

  **Must NOT do**:
  - Do not let dynamic score override PV-first hard constraints.
  - Do not create non-deterministic random tie outcomes.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `artistry`: not needed for deterministic policy engine.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 12, 15
  - **Blocked By**: 1, 3

  **References**:
  - `custom_components/oig_cloud/battery_forecast/strategy/hybrid.py` - current scoring patterns.
  - `custom_components/oig_cloud/battery_forecast/strategy/hybrid_scoring.py` - existing mode score inputs.

  **Acceptance Criteria**:
  - [ ] Dynamic policy emits deterministic selected strategy and reason code.
  - [ ] Invariant tests confirm PV-first never downgraded.

  **QA Scenarios**:
  ```text
  Scenario: Dynamic policy chooses cost-aware profile on weak PV day
    Tool: Bash (pytest)
    Preconditions: weak PV forecast, high evening price spread
    Steps:
      1. Run: pytest tests/test_dynamic_day_policy.py::test_selects_cost_profile_when_pv_weak -q
      2. Assert selected profile id and reason code.
    Expected Result: PASS.
    Failure Indicators: undefined profile or unstable outcome.
    Evidence: .sisyphus/evidence/task-8-dynamic-cost-profile.txt

  Scenario: PV-first hard guard intact
    Tool: Bash (pytest)
    Preconditions: strong PV day fixture
    Steps:
      1. Run: pytest tests/test_dynamic_day_policy.py::test_pv_first_hard_guard_not_overridden -q
      2. Assert no early expensive grid charge.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-8-pv-hard-guard.txt
  ```

  **Commit**: YES (groups with 7,8)
  - Message: `feat(planner): add unified pv-first gate with dynamic day policy`

- [ ] 9. Rework economic charging branch to consume precedence contract

  **What to do**:
  - Refactor economic candidate evaluation to call precedence contract before committing interval charge.
  - Keep death-valley and protection branches explicit with higher priority tags.
  - Emit decision trace data for each accepted/rejected interval.

  **Must NOT do**:
  - Do not preserve hidden branch-specific precedence.
  - Do not drop existing savings-margin checks without replacement.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: implementation-focused task.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 12, 16
  - **Blocked By**: 2, 4

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py` - candidate filtering, protection, death-valley branches.
  - `custom_components/oig_cloud/battery_forecast/data/pricing.py` - pricing normalization used by economic checks.

  **Acceptance Criteria**:
  - [ ] Economic decisions include precedence-aware trace code.
  - [ ] Existing core economic tests remain green.

  **QA Scenarios**:
  ```text
  Scenario: Economic branch honors precedence contract
    Tool: Bash (pytest)
    Preconditions: mixed price curve + medium PV day
    Steps:
      1. Run: pytest tests/test_hybrid_planning_more.py::test_economic_branch_uses_contract -q
      2. Assert rejected intervals include precedence reason.
    Expected Result: PASS.
    Failure Indicators: missing reason code or wrong charged interval.
    Evidence: .sisyphus/evidence/task-9-economic-precedence.txt

  Scenario: Death-valley still forces charge
    Tool: Bash (pytest)
    Preconditions: low SOC runway fixture
    Steps:
      1. Run: pytest tests/test_hybrid_planning_more.py::test_death_valley_has_higher_priority_than_defer -q
      2. Assert charge occurs and trace reason=death_valley.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-9-death-valley-priority.txt
  ```

  **Commit**: NO

- [ ] 10. Harmonize mode guard and auto-switch with new precedence

  **What to do**:
  - Align mode guard locks and watchdog corrections to precedence outputs.
  - Eliminate race conditions where manual/guard branches re-enable undesired mode.
  - Add explicit reason propagation from decision engine to switch executor.

  **Must NOT do**:
  - Do not bypass MIN_AUTO_SWITCH_INTERVAL safeguards.
  - Do not remove manual override safety behavior.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `playwright`: no browser workflow needed.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 13, 16
  - **Blocked By**: 3, 4

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/auto_switch.py` - watchdog/event scheduling.
  - `custom_components/oig_cloud/battery_forecast/planning/mode_guard.py` - lock and exception logic.

  **Acceptance Criteria**:
  - [ ] No conflicting switch command in same control window for same decision context.
  - [ ] Reason code continuity from planner to switch layer is test-covered.

  **QA Scenarios**:
  ```text
  Scenario: Guard/watchdog race prevention
    Tool: Bash (pytest)
    Preconditions: fixture with rapid mode change + manual intervention
    Steps:
      1. Run: pytest tests/test_auto_switch_precedence.py::test_no_race_between_guard_and_watchdog -q
      2. Assert only one valid switch command emitted.
    Expected Result: PASS.
    Failure Indicators: duplicated or contradictory commands.
    Evidence: .sisyphus/evidence/task-10-guard-watchdog-race.txt

  Scenario: Reason propagation to executor
    Tool: Bash (pytest)
    Preconditions: precedence decision fixture with defer reason
    Steps:
      1. Run: pytest tests/test_auto_switch_precedence.py::test_reason_code_is_propagated_to_switch -q
      2. Assert executor payload contains decision reason.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-10-reason-propagation.txt
  ```

  **Commit**: NO

- [ ] 11. Add boiler coordination contract (battery-aware source selection)

  **What to do**:
  - Extend boiler source decision to respect battery/PV precedence contract.
  - Add battery-usable-as-source condition above direct grid fallback where policy allows.
  - Preserve existing alternative-source economics as lower-order fallback.

  **Must NOT do**:
  - Do not force boiler to bypass safety/comfort minimums.
  - Do not remove existing alternative source path.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: not relevant.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 13, 14
  - **Blocked By**: 5, 6

  **References**:
  - `custom_components/oig_cloud/boiler/planner.py` - `_recommend_source()` priority tree.
  - `custom_components/oig_cloud/boiler/coordinator.py` - integration and actuator path.

  **Acceptance Criteria**:
  - [ ] Boiler does not trigger avoidable early grid consumption when battery/PV branch is available by contract.
  - [ ] Boiler source decision logs include precedence reason.

  **QA Scenarios**:
  ```text
  Scenario: Boiler chooses battery-aware path over immediate grid
    Tool: Bash (pytest)
    Preconditions: medium SOC above policy threshold + near-term PV forecast
    Steps:
      1. Run: pytest tests/test_boiler_precedence.py::test_boiler_avoids_early_grid_when_battery_or_pv_available -q
      2. Assert source != GRID for early expensive slot.
    Expected Result: PASS.
    Failure Indicators: source selected GRID despite higher-priority option.
    Evidence: .sisyphus/evidence/task-11-boiler-battery-aware.txt

  Scenario: Boiler fallback still works when battery/PV unavailable
    Tool: Bash (pytest)
    Preconditions: low SOC + no PV + no cheap alternative
    Steps:
      1. Run: pytest tests/test_boiler_precedence.py::test_boiler_fallback_to_grid_when_required -q
      2. Assert source=GRID with fallback reason code.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-11-boiler-grid-fallback.txt
  ```

  **Commit**: YES (groups with 9,10,11)
  - Message: `feat(orchestration): align economic, switching, and boiler decisions with precedence contract`

- [ ] 12. Integrate unified decision trace into forecast update pipeline

  **What to do**:
  - Wire precedence outputs into end-to-end planner update flow.
  - Ensure timeline/summary sensors expose why decisions were taken.
  - Keep backward-compatible output shape where required.

  **Must NOT do**:
  - Do not break existing sensor contracts without explicit migration handling.
  - Do not hide fallback/degraded-state reasons.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `writing`: this is runtime integration work.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 13,14)
  - **Blocks**: 14, 15
  - **Blocked By**: 7, 8, 9

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py` - top-level orchestration.
  - `custom_components/oig_cloud/battery_forecast/sensors/grid_charging_sensor.py` - user-visible plan exposure.

  **Acceptance Criteria**:
  - [ ] Decision trace is available in pipeline outputs for charged/deferred intervals.
  - [ ] Existing consumers continue to parse output successfully.

  **QA Scenarios**:
  ```text
  Scenario: Pipeline exposes decision trace
    Tool: Bash (pytest)
    Preconditions: integration fixture with mixed defer/charge decisions
    Steps:
      1. Run: pytest tests/test_forecast_update_trace.py::test_trace_propagates_to_outputs -q
      2. Assert trace fields exist and match branch decisions.
    Expected Result: PASS.
    Failure Indicators: missing trace fields or mismatched reasons.
    Evidence: .sisyphus/evidence/task-12-trace-propagation.txt

  Scenario: Backward compatibility of output shape
    Tool: Bash (pytest)
    Preconditions: legacy consumer fixture
    Steps:
      1. Run: pytest tests/test_forecast_update_trace.py::test_legacy_consumer_contract_still_valid -q
      2. Assert mandatory legacy keys unchanged.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-12-legacy-contract.txt
  ```

  **Commit**: NO

- [ ] 13. Implement observability pack for aggressive rollout

  **What to do**:
  - Add counters/metrics for defer reasons, protection bypass count, boiler-source outcomes, rollback activations.
  - Add structured logs for interval-level decision trace sampling.
  - Define rollout gate thresholds and alert conditions.

  **Must NOT do**:
  - Do not emit unbounded noisy logs.
  - Do not ship aggressive rollout without measurable health signals.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `playwright`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 14, 16
  - **Blocked By**: 10, 11

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py` - event emission point.
  - `custom_components/oig_cloud/boiler/coordinator.py` - source selection outcomes to track.

  **Acceptance Criteria**:
  - [ ] Metrics exist for each critical decision family.
  - [ ] Alert thresholds are defined and test-validated.

  **QA Scenarios**:
  ```text
  Scenario: Metrics emitted for defer/protection decisions
    Tool: Bash (pytest)
    Preconditions: telemetry fixture enabled
    Steps:
      1. Run: pytest tests/test_rollout_observability.py::test_decision_metrics_emitted -q
      2. Assert counters increment for defer and protection paths.
    Expected Result: PASS.
    Failure Indicators: missing metrics keys or zero increments.
    Evidence: .sisyphus/evidence/task-13-metrics.txt

  Scenario: Alert gate trigger on anomaly
    Tool: Bash (pytest)
    Preconditions: anomaly fixture with unexpected early grid spikes
    Steps:
      1. Run: pytest tests/test_rollout_observability.py::test_alert_gate_triggers_on_grid_spike -q
      2. Assert gate status=FAIL and rollback recommendation emitted.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-13-alert-gate.txt
  ```

  **Commit**: YES (groups with 12,13)
  - Message: `feat(ops): add decision observability and rollout gates`

- [ ] 14. Run end-to-end integration suite for battery-grid-boiler precedence

  **What to do**:
  - Build integration fixtures covering full daily cycles with PV/load/price/boiler demand.
  - Verify precedence behavior across mixed scenarios and override states.
  - Validate no contradictory actuator intents in same interval.

  **Must NOT do**:
  - Do not test modules in isolation only.
  - Do not skip negative scenarios.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `writing`: test execution-heavy task.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 15, 16
  - **Blocked By**: 11, 12, 13

  **References**:
  - `tests/test_planner_timeline.py` - timeline integration style.
  - `tests/test_planning_api.py` - end-to-end API/planner assertions.

  **Acceptance Criteria**:
  - [ ] Full-cycle integration suite passes for at least 4 scenario families.
  - [ ] No interval reports conflicting mode/source intents.

  **QA Scenarios**:
  ```text
  Scenario: Full-cycle sunny-day integration
    Tool: Bash (pytest)
    Preconditions: sunny-day fixture with noon PV peak
    Steps:
      1. Run: pytest tests/test_precedence_integration.py::test_sunny_day_pv_first_full_cycle -q
      2. Assert early expensive slots have no avoidable grid charge.
      3. Assert boiler source follows precedence.
    Expected Result: PASS.
    Failure Indicators: contradictory decisions or avoidable early grid charge.
    Evidence: .sisyphus/evidence/task-14-sunny-cycle.txt

  Scenario: Cloudy-day fallback integration
    Tool: Bash (pytest)
    Preconditions: low PV + protection threshold crossing
    Steps:
      1. Run: pytest tests/test_precedence_integration.py::test_cloudy_day_safety_fallback_full_cycle -q
      2. Assert protection fallback activates correctly.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-14-cloudy-fallback.txt
  ```

  **Commit**: YES (groups with 14)
  - Message: `test(integration): validate end-to-end precedence across planner and boiler`

- [ ] 15. Regression hardening for edge-case cluster A

  **What to do**:
  - Add regression tests for forecast error spikes, stale data transitions, and rapid price inversion.
  - Validate deterministic outputs under repeated runs.

  **Must NOT do**:
  - Do not leave flaky nondeterministic cases.
  - Do not skip replay-based reproducibility checks.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `artistry`: not needed.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with 16)
  - **Blocks**: F1, F2, F3, F4
  - **Blocked By**: 7, 8, 12, 14

  **References**:
  - `tests/test_hybrid_planning_more.py` - rich edge case style.
  - `tests/test_planning_helpers.py` - helper determinism and utility guards.

  **Acceptance Criteria**:
  - [ ] Edge-case A suite is green and stable across repeated execution.
  - [ ] No newly introduced flaky tests.

  **QA Scenarios**:
  ```text
  Scenario: Replay determinism check
    Tool: Bash (pytest)
    Preconditions: deterministic fixtures and fixed seeds
    Steps:
      1. Run twice: pytest tests/test_precedence_edge_cases_a.py -q
      2. Compare outputs for identical decision traces.
    Expected Result: both runs PASS with identical traces.
    Failure Indicators: divergent decisions between runs.
    Evidence: .sisyphus/evidence/task-15-replay-determinism.txt

  Scenario: Forecast-error spike handling
    Tool: Bash (pytest)
    Preconditions: abrupt forecast correction fixture
    Steps:
      1. Run: pytest tests/test_precedence_edge_cases_a.py::test_forecast_spike_safe_degrade -q
      2. Assert degraded mode + safe fallback.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-15-forecast-spike.txt
  ```

  **Commit**: NO

- [ ] 16. Regression hardening for edge-case cluster B + rollout canary checks

  **What to do**:
  - Add tests for manual override races, balancing overlap, and boiler-demand bursts.
  - Add canary acceptance checks for aggressive rollout phase gates.
  - Verify rollback toggles under gate-failure scenarios.

  **Must NOT do**:
  - Do not pass canary without gate metrics.
  - Do not merge if rollback path is unverified.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `playwright`: backend policy focus.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1, F2, F3, F4
  - **Blocked By**: 9, 10, 13, 14

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/auto_switch.py` - race-prone switching paths.
  - `custom_components/oig_cloud/battery_forecast/balancing/core.py` - balancing overlap behavior.
  - `custom_components/oig_cloud/boiler/planner.py` - demand burst source decisions.

  **Acceptance Criteria**:
  - [ ] Canary gate suite determines PASS/FAIL from observed metrics, not manual judgement.
  - [ ] Rollback automation is validated in failing-canary simulation.

  **QA Scenarios**:
  ```text
  Scenario: Manual override race regression
    Tool: Bash (pytest)
    Preconditions: manual override burst fixture
    Steps:
      1. Run: pytest tests/test_precedence_edge_cases_b.py::test_manual_override_race_resolved -q
      2. Assert single consistent final mode intent.
    Expected Result: PASS.
    Failure Indicators: oscillation or conflicting intents.
    Evidence: .sisyphus/evidence/task-16-manual-race.txt

  Scenario: Canary failure triggers rollback
    Tool: Bash (pytest)
    Preconditions: synthetic anomaly causes gate fail
    Steps:
      1. Run: pytest tests/test_rollout_canary.py::test_gate_failure_auto_rollback -q
      2. Assert rollback flag and legacy branch activation.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-16-canary-rollback.txt
  ```

  **Commit**: YES (groups with 15,16)
  - Message: `test(rollout): harden edge cases and validate canary rollback`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Ověřit každé Must Have / Must NOT Have proti výsledné implementaci a evidence artefaktům.

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Spustit typovou kontrolu/lint/testy, detekovat risky anti-patterns, zkontrolovat clean diff.

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Exekvovat všechny QA scénáře ze všech tasků, uložit důkazy do `.sisyphus/evidence/final-qa/`.

- [ ] F4. **Scope Fidelity Check** — `deep`
  Ověřit 1:1 souladu realizace proti task-spec, bez scope creep.

---

## Commit Strategy

- **Commit 1 (Wave 1 baseline/tests)**: `test(planner): add incident reproduction and rule matrix assertions`
- **Commit 2 (Wave 2 core policy)**: `feat(planner): enforce pv-first precedence with explicit conflict resolution`
- **Commit 3 (Wave 3 integration/rollout)**: `feat(orchestration): align boiler coordination and rollout safeguards`
- **Commit 4 (Wave 4 hardening)**: `test(regression): expand edge-case coverage for planner/boiler conflicts`

---

## Success Criteria

### Verification Commands
```bash
pytest tests -q
```

```bash
pytest tests/test_hybrid_planning_more.py -q
```

```bash
pytest tests/test_grid_charging_plan_sensor.py -q
```

### Final Checklist
- [ ] Všechny Must Have splněny
- [ ] Všechny Must NOT Have potvrzeně absent
- [ ] Incident regresní scénář PASS
- [ ] Edge-case sada PASS
- [ ] Evidence kompletní
