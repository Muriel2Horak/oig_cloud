# Battery Planner Logic Cleanup

## TL;DR

> **Quick Summary**: Unify planner configuration reading into one canonical path, remove conflicting defaults, and make every night-charging decision traceable to explicit precedence + config source.
>
> **Deliverables**:
> - Canonical config accessor layer for planner keys
> - Deterministic precedence flow across planning modules
> - Migration + observability so old/new config keys cannot silently diverge
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves + final verification
> **Critical Path**: T1 -> T6 -> T9 -> T12 -> F1/F2/F3/F4

---

## Context

### Original Request
Udelat plan na vycisteni logiky planneru, odstranit chaos kolem konfigurace a mit jasnou, cistou, vysvetlitelnou logiku proc se baterie v noci (ne)nabiji.

### Interview Summary
**Key Discussions**:
- Runtime audit potvrdil 1 aktivni `oig_cloud` entry, ale rozporne hodnoty (`min_capacity_percent=20.0`, `planning_min_percent=25.0`).
- V runtime planu se pres noc nenabiji (`HOME I`, `grid_charge_kwh=0`) a SoC drzi HW minimum.
- Podezreni na nesoulad starych/novych konfiguraci je potvrzene ctenim kodu i HA storage.

**Research Findings**:
- Vice modulu cte config jinak (options/data/defaulty), s ruznymi defaulty (20/33).
- `enable_pre_peak_charging` je feature-flag default False; pokud chybi v options, predspickove nabijeni je vypnute.
- UI vystavuje legacy aliasy i pri single-planner architekture, coz zhorsuje interpretaci.

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Chybi jednotny canonical accessor pro planning keys.
- Chybi explicitni migracni pravidla + warningy pri coercion pod HW minimum.
- Chybi jednotna observability: u rozhodnuti neni vzdy jasny source key/value/precedence.
- Scope locknut: refactor precedence/config/observability, bez zmen business algoritmu mimo nezbytnou determinizaci.

---

## Work Objectives

### Core Objective
Zajistit jeden zdroj pravdy pro planner konfiguraci a jednotnou precedence logiku tak, aby nozni nabijeni bylo deterministicke, auditovatelne a bez legacy driftu.

### Concrete Deliverables
- Canonical config access layer pouzivana vsemi planner moduly.
- Jednotne mapovani klicu (`planning_min_percent`, `min_capacity_percent`, feature flags) s explicitni migraci.
- Rozsireny decision trace obsahujici config source + precedence metadata.
- Testy a dokumentace potvrzujici kompatibilitu a vysvetlitelnost.

### Definition of Done
- [ ] Vsechny planner cesty ctou planning minima pres jeden accessor.
- [ ] Neni zadny runtime drift mezi options/data/defaults bez explicitniho logu.
- [ ] Nocni charging rozhodnuti obsahuje explicitni reason + source key/value.
- [ ] Regression testy planneru a forecast pipeline prochazi.

### Must Have
- Deterministicka precedence: options -> data (legacy fallback) -> canonical defaults.
- Coercion pod HW minimum je jednotna a logovana.
- Feature-flag stavy jsou explicitne viditelne v trace/metrics.
- Canonical planner key je `planning_min_percent`; `min_capacity_percent` je legacy alias s migracnim warningem pri konfliktu.

### Must NOT Have (Guardrails)
- Zadna skryta zmena ekonomicke strategie mimo sjednoceni precedence/config cteni.
- Zadny paralelni "druhy planner" ani dalsi ad-hoc fallback vetve.
- Zadna ticha zmena defaultu bez migration note a testu.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - all verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (`pytest`, rozsahle planner testy)
- **Automated tests**: YES (Tests-after)
- **Framework**: pytest

### QA Policy
Kazdy task obsahuje agent-executed QA scenare (happy path + failure/edge case) s evidenci v `.sisyphus/evidence/`.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundation + canonical contracts):
- T1 Canonical config accessor module
- T2 Canonical defaults/constants normalization
- T3 Legacy key migration contract
- T4 Feature-flag exposure contract
- T5 Decision trace schema extension

Wave 2 (Module migration, max parallel):
- T6 Migrate `forecast_update` to accessor
- T7 Migrate `battery_state` and charging helpers
- T8 Migrate pricing/auto-switch config readers
- T9 Precedence contract enforcement in charging paths
- T10 Timeline reason normalization at HW minimum boundary

Wave 3 (Integration + docs + tests):
- T11 End-to-end planner regression suite updates
- T12 Observability outputs (metrics/log fields) alignment
- T13 User/dev docs cleanup for canonical keys and migration

Wave FINAL (Independent verification):
- F1 Plan compliance audit
- F2 Code quality review
- F3 Real QA replay on planner traces
- F4 Scope fidelity check

### Dependency Matrix
- T1: none -> T6, T7, T8, T9, T12, T13
- T2: none -> T1, T6, T7
- T3: none -> T1, T6, T7, T8, T13
- T4: none -> T9, T12, T13
- T5: none -> T10, T12
- T6: T1, T2, T3 -> T11
- T7: T1, T2, T3 -> T11
- T8: T1, T3 -> T11
- T9: T1, T4 -> T11, T12
- T10: T5 -> T11, T12
- T11: T6, T7, T8, T9, T10 -> F1, F2, F3, F4
- T12: T1, T4, T5, T9, T10 -> F1, F3
- T13: T1, T3, T4 -> F1, F4

### Agent Dispatch Summary
- Wave 1: T1-T3 `deep`, T4 `unspecified-high`, T5 `quick`
- Wave 2: T6-T9 `deep`, T10 `unspecified-high`
- Wave 3: T11 `deep`, T12 `unspecified-high`, T13 `writing`
- Final: F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

---

- [ ] 1. Create canonical planner config accessor

  **What to do**:
  - Add one accessor module for planner-relevant keys (planning min, target, max UPS price, flags).
  - Encode precedence order (`options -> data -> canonical defaults`) in one place.
  - Return both value and source metadata for observability.

  **Must NOT do**:
  - Do not change planner economic formulas.
  - Do not duplicate accessors in multiple files.

  **Recommended Agent Profile**:
  - **Category**: `deep` (cross-module contract design)
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `frontend-ui-ux` (no UI work)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (T1-T5)
  - **Blocks**: T6, T7, T8, T9, T12, T13
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/battery_forecast/sensors/sensor_runtime.py:37` - current options/data precedence behavior.
  - `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py:313` - runtime planner key read path.
  - `custom_components/oig_cloud/battery_forecast/data/battery_state.py:154` - another reader using different defaults.

  **Acceptance Criteria**:
  - [ ] Single accessor API exists and is importable by planner modules.
  - [ ] Accessor returns value + source (`options|data|default`) deterministically.
  - [ ] Unit tests cover missing key, options key, data fallback, coercion behavior.

  **QA Scenarios**:
  ```text
  Scenario: accessor chooses options over data
    Tool: Bash
    Preconditions: test fixture with both options and data values
    Steps:
      1. Run targeted pytest for accessor precedence case.
      2. Assert returned source == "options" and expected numeric value.
    Expected Result: precedence test passes with deterministic source metadata
    Failure Indicators: source is "data" or value mismatch
    Evidence: .sisyphus/evidence/task-1-accessor-options.txt

  Scenario: accessor fallback and coercion path
    Tool: Bash
    Preconditions: fixture missing key in options and data, plus below-HW value case
    Steps:
      1. Run pytest case for default fallback.
      2. Run pytest case for coercion below HW minimum.
    Expected Result: fallback uses canonical default; coercion path logged/tested
    Evidence: .sisyphus/evidence/task-1-accessor-fallback-error.txt
  ```

- [ ] 2. Normalize canonical defaults/constants

  **What to do**:
  - Define canonical default values once for planner keys and reference them from accessor.
  - Remove ambiguous per-module fallback literals (20/33 drift) from planner paths.

  **Must NOT do**:
  - Do not silently change effective defaults without migration note.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `writing` (implementation-heavy constants pass)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T1, T6, T7
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/const.py:62` - HW min and planning defaults.
  - `custom_components/oig_cloud/battery_forecast/config.py:81` - dataclass default currently different.
  - `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py:320` - runtime literal fallback.

  **Acceptance Criteria**:
  - [ ] Planner-relevant defaults are defined centrally and referenced.
  - [ ] No planner path retains conflicting literal defaults.

  **QA Scenarios**:
  ```text
  Scenario: static scan for conflicting literals
    Tool: Bash
    Preconditions: code updated
    Steps:
      1. Run grep for planner key defaults in battery_forecast modules.
      2. Verify only canonical constants remain in planner read paths.
    Expected Result: no conflicting 20/33 literals in planner access paths
    Evidence: .sisyphus/evidence/task-2-defaults-scan.txt

  Scenario: regression of default behavior
    Tool: Bash
    Preconditions: tests for config defaults present
    Steps:
      1. Run pytest for config-related forecast tests.
      2. Assert no baseline failures introduced.
    Expected Result: config tests pass
    Evidence: .sisyphus/evidence/task-2-defaults-regression-error.txt
  ```

- [ ] 3. Implement legacy key migration contract

  **What to do**:
  - Add deterministic migration mapping between legacy/new keys for planner config.
  - Ensure migration produces explicit warnings when conflicting keys differ.

  **Must NOT do**:
  - Do not delete legacy keys without compatibility window.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `artistry` (not creative-prototype work)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T1, T6, T7, T8, T13
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/config/steps.py:405` - wizard option defaults and migration context.
  - `custom_components/oig_cloud/battery_forecast/planning/auto_switch.py:108` - existing legacy fallback warning pattern.

  **Acceptance Criteria**:
  - [ ] Conflict between legacy/new keys is detectable and logged.
  - [ ] Migration behavior is covered by tests for all key combinations.
  - [ ] Pri konfliktu vyhrava `planning_min_percent`, ale je emitovan warning s obema hodnotami.

  **QA Scenarios**:
  ```text
  Scenario: conflicting key values in options
    Tool: Bash
    Preconditions: fixture with min_capacity_percent != planning_min_percent
    Steps:
      1. Run migration unit test.
      2. Assert winner key is deterministic and conflict warning captured.
    Expected Result: deterministic winner + explicit warning
    Evidence: .sisyphus/evidence/task-3-migration-conflict.txt

  Scenario: legacy-only config fallback
    Tool: Bash
    Preconditions: fixture with only legacy key present
    Steps:
      1. Run migration test for legacy-only payload.
      2. Assert migrated canonical value is used.
    Expected Result: canonical config value resolved with source metadata
    Evidence: .sisyphus/evidence/task-3-migration-legacy-error.txt
  ```

- [ ] 4. Define feature-flag exposure contract

  **What to do**:
  - Establish explicit policy for hidden/default-off flags (including pre-peak charging).
  - Ensure runtime trace shows whether feature was disabled by missing option vs explicit false.

  **Must NOT do**:
  - Do not enable hidden flags by default in this refactor.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `frontend-ui-ux` (policy and backend behavior only)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T9, T12, T13
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/rollout_flags.py:65` - flag parsing from options.
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py:895` - pre-peak gate.

  **Acceptance Criteria**:
  - [ ] Decision trace/metrics distinguishes missing vs explicit false for key flags.
  - [ ] Flag contract documented for planner maintainers.

  **QA Scenarios**:
  ```text
  Scenario: missing flag state
    Tool: Bash
    Preconditions: options without enable_pre_peak_charging
    Steps:
      1. Run pre-peak decision tests with missing key.
      2. Assert reason indicates disabled-by-default (missing source).
    Expected Result: deterministic "flag missing -> default false" trace
    Evidence: .sisyphus/evidence/task-4-flag-missing.txt

  Scenario: explicit false vs explicit true differentiation
    Tool: Bash
    Preconditions: two fixtures (false and true)
    Steps:
      1. Execute tests for both fixtures.
      2. Assert trace metadata differs by source/value.
    Expected Result: clear differentiation in metrics/trace
    Evidence: .sisyphus/evidence/task-4-flag-explicit-error.txt
  ```

- [ ] 5. Extend decision trace schema with config-source fields

  **What to do**:
  - Add standardized fields to decision trace (`config_key`, `config_value`, `config_source`, `precedence_level`).
  - Ensure fields are propagated to timeline/precomputed outputs.

  **Must NOT do**:
  - Do not change user-facing reason wording in this task.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `writing` (schema/runtime change first)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T10, T12
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py:33` - existing `DecisionTrace`.
  - `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py:445` - decision_trace propagation to coordinator.
  - `custom_components/oig_cloud/battery_forecast/presentation/precompute.py:100` - precomputed payload keys.

  **Acceptance Criteria**:
  - [ ] New trace fields are present in planner outputs.
  - [ ] Backward-compatible handling for existing consumers is preserved.

  **QA Scenarios**:
  ```text
  Scenario: decision trace includes config source metadata
    Tool: Bash
    Preconditions: planner unit/integration tests run with instrumented decisions
    Steps:
      1. Execute targeted test generating decision_trace.
      2. Assert each relevant decision includes config_key/value/source fields.
    Expected Result: enriched trace available without breaking serialization
    Evidence: .sisyphus/evidence/task-5-trace-schema.txt

  Scenario: compatibility with existing precompute payload
    Tool: Bash
    Preconditions: precompute test fixture
    Steps:
      1. Run precompute-related tests.
      2. Verify legacy aliases still exist and no KeyError occurs.
    Expected Result: payload backward compatible, trace enriched
    Evidence: .sisyphus/evidence/task-5-trace-compat-error.txt
  ```

- [ ] 6. Migrate `forecast_update` planner config reads to accessor

  **What to do**:
  - Replace direct `options.get(...)` planner key reads with canonical accessor calls.
  - Keep behavior deterministic with explicit source metadata.

  **Must NOT do**:
  - Do not alter timeline physics or simulator behavior.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `ultrabrain` (not required for this migration)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (T6-T10)
  - **Blocks**: T11
  - **Blocked By**: T1, T2, T3

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py:313` - current direct options read.

  **Acceptance Criteria**:
  - [ ] `forecast_update` reads planner keys only via accessor.
  - [ ] Existing forecast update tests remain green.

  **QA Scenarios**:
  ```text
  Scenario: runtime planner minimum follows accessor source
    Tool: Bash
    Preconditions: fixture with divergent options/data values
    Steps:
      1. Run forecast_update tests.
      2. Assert effective planning minimum and source match accessor contract.
    Expected Result: no direct read drift remains
    Evidence: .sisyphus/evidence/task-6-forecast-accessor.txt

  Scenario: missing config entry fallback
    Tool: Bash
    Preconditions: test with absent config entry
    Steps:
      1. Execute failure/edge test path.
      2. Verify default handling without crash and with source=default.
    Expected Result: graceful behavior, deterministic defaults
    Evidence: .sisyphus/evidence/task-6-forecast-fallback-error.txt
  ```

- [ ] 7. Migrate `battery_state` and charging helpers to accessor

  **What to do**:
  - Replace ad-hoc min/target percent reads in battery state and charging helpers.
  - Align min/target computation with canonical source and defaults.

  **Must NOT do**:
  - Do not change sensor entity IDs or external API shape.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `writing` (implementation and tests first)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T11
  - **Blocked By**: T1, T2, T3

  **References**:
  - `custom_components/oig_cloud/battery_forecast/data/battery_state.py:154` - min capacity read path.
  - `custom_components/oig_cloud/battery_forecast/planning/charging_helpers.py:27` - min capacity fallback literal.

  **Acceptance Criteria**:
  - [ ] Battery min/target calculations use canonical accessor.
  - [ ] Existing sensor runtime tests pass.

  **QA Scenarios**:
  ```text
  Scenario: min capacity from canonical source in battery_state
    Tool: Bash
    Preconditions: fixture with options/data divergence
    Steps:
      1. Run battery_state tests.
      2. Assert min/target values reflect canonical precedence.
    Expected Result: aligned min/target behavior across modules
    Evidence: .sisyphus/evidence/task-7-battery-state.txt

  Scenario: charging helper no longer uses conflicting literal fallback
    Tool: Bash
    Preconditions: charging helper unit tests
    Steps:
      1. Run helper tests with missing keys.
      2. Assert canonical defaults are used.
    Expected Result: no divergent fallback behavior
    Evidence: .sisyphus/evidence/task-7-charging-helper-error.txt
  ```

- [ ] 8. Migrate pricing and auto-switch readers to unified precedence helpers

  **What to do**:
  - Apply consistent options/data/default precedence helper in pricing and auto-switch config reads.
  - Keep legacy-data fallback only as explicit compatibility mode with warning.

  **Must NOT do**:
  - Do not modify tariff calculation formulas.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `deep` (local migration with clear pattern)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T11
  - **Blocked By**: T1, T3

  **References**:
  - `custom_components/oig_cloud/battery_forecast/data/pricing.py:24` - pricing config source pattern.
  - `custom_components/oig_cloud/battery_forecast/planning/auto_switch.py:96` - legacy warning behavior.

  **Acceptance Criteria**:
  - [ ] Pricing and auto-switch resolve config via shared precedence helper.
  - [ ] Legacy fallback warning remains explicit where needed.

  **QA Scenarios**:
  ```text
  Scenario: pricing reads unified config source
    Tool: Bash
    Preconditions: pricing tests and fixtures
    Steps:
      1. Run pricing-related tests.
      2. Assert source precedence behavior matches contract.
    Expected Result: no module-specific precedence drift
    Evidence: .sisyphus/evidence/task-8-pricing-precedence.txt

  Scenario: auto-switch legacy fallback warning path
    Tool: Bash
    Preconditions: fixture with key in data only
    Steps:
      1. Run auto-switch tests.
      2. Assert fallback works and warning is emitted.
    Expected Result: compatibility retained with explicit warning
    Evidence: .sisyphus/evidence/task-8-autoswitch-legacy-error.txt
  ```

- [ ] 9. Enforce precedence contract in charging decision conflict points

  **What to do**:
  - Ensure conflict resolution in charging path uses documented precedence ladder consistently.
  - Map reason codes to precedence metadata without ambiguous overrides.

  **Must NOT do**:
  - Do not invent new precedence levels in this refactor.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `quick` (cross-flow semantics)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T11, T12
  - **Blocked By**: T1, T4

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/precedence_contract.py:95` - canonical ladder.
  - `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py:218` - pre-peak + economic interplay.

  **Acceptance Criteria**:
  - [ ] Decision conflicts resolve according to precedence contract.
  - [ ] Trace includes winning precedence level and loser reason when applicable.

  **QA Scenarios**:
  ```text
  Scenario: pre-peak vs economic conflict resolution
    Tool: Bash
    Preconditions: fixture where both conditions are true
    Steps:
      1. Run charging_plan conflict test.
      2. Assert winner precedence matches contract ordering.
    Expected Result: deterministic winner with trace metadata
    Evidence: .sisyphus/evidence/task-9-precedence-conflict.txt

  Scenario: rollback/emergency path precedence behavior
    Tool: Bash
    Preconditions: emergency rollback flag fixture
    Steps:
      1. Run flag precedence tests.
      2. Assert new policies are disabled and trace records rollback state.
    Expected Result: deterministic legacy-mode behavior
    Evidence: .sisyphus/evidence/task-9-precedence-rollback-error.txt
  ```

- [ ] 10. Normalize timeline decision reasons at HW-min boundary

  **What to do**:
  - Adjust reason-generation logic to avoid misleading "battery discharge" messages when SOC is effectively at HW minimum.
  - Keep semantics clear: import-driven vs discharge-driven behavior.

  **Must NOT do**:
  - Do not alter charging decisions themselves; only reason labeling/metrics.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `writing` (logic + tests first)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T11, T12
  - **Blocked By**: T5

  **References**:
  - `custom_components/oig_cloud/battery_forecast/timeline/planner.py:336` - default reason fallback.
  - `custom_components/oig_cloud/battery_forecast/timeline/planner.py:342` - decision metrics context.

  **Acceptance Criteria**:
  - [ ] Reason text at HW-min boundary matches actual energy flow semantics.
  - [ ] Existing timeline tests updated and passing.

  **QA Scenarios**:
  ```text
  Scenario: HW-min boundary reason correctness
    Tool: Bash
    Preconditions: fixture with SOC at HW minimum and positive deficit
    Steps:
      1. Run timeline reason unit test.
      2. Assert reason indicates grid reliance/boundary, not battery discharge.
    Expected Result: non-misleading reason output
    Evidence: .sisyphus/evidence/task-10-reason-boundary.txt

  Scenario: non-boundary behavior unchanged
    Tool: Bash
    Preconditions: fixture with SOC above HW minimum
    Steps:
      1. Run reason regression tests.
      2. Verify prior reason mappings still valid.
    Expected Result: no unintended wording drift
    Evidence: .sisyphus/evidence/task-10-reason-regression-error.txt
  ```

- [ ] 11. Build regression suite for config-drift and night-charging paths

  **What to do**:
  - Add/extend tests covering divergent config keys, missing flags, and overnight planning outcomes.
  - Cover both unit and integration-level planner flows.

  **Must NOT do**:
  - Do not rely on manual QA-only signoff.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `quick` (broad cross-module test coverage)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F1, F2, F3, F4
  - **Blocked By**: T6, T7, T8, T9, T10

  **References**:
  - `tests/test_battery_forecast_config_more.py` - config behavior patterns.
  - `tests/test_battery_forecast_sensor_runtime_more.py` - runtime reader behavior.
  - `tests/test_battery_forecast_timeline.py` - reason/timeline expectations.

  **Acceptance Criteria**:
  - [ ] Regression suite covers old/new key mismatch and expected winner behavior.
  - [ ] Night charging scenario tests assert deterministic outcomes and trace metadata.

  **QA Scenarios**:
  ```text
  Scenario: divergent key regression matrix
    Tool: Bash
    Preconditions: test matrix for options/data/key combinations
    Steps:
      1. Run pytest on config/runtime regression files.
      2. Assert all matrix cases pass.
    Expected Result: deterministic behavior across all combinations
    Evidence: .sisyphus/evidence/task-11-regression-matrix.txt

  Scenario: night charging decision trace regression
    Tool: Bash
    Preconditions: integration-style planner timeline test
    Steps:
      1. Run targeted planner/timeline tests.
      2. Assert no UPS overnight case carries explicit source and reason metadata.
    Expected Result: explainable non-charging decisions
    Evidence: .sisyphus/evidence/task-11-night-trace-error.txt
  ```

- [ ] 12. Align observability outputs across coordinator and precompute

  **What to do**:
  - Ensure enriched trace + config-source fields flow to coordinator snapshot and precomputed payload consistently.
  - Add concise planner debug summary fields for active config source values.

  **Must NOT do**:
  - Do not introduce sensitive data in trace payload.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `deep` (schema propagation task)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F1, F3
  - **Blocked By**: T1, T4, T5, T9, T10

  **References**:
  - `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py:432` - coordinator payload writer.
  - `custom_components/oig_cloud/battery_forecast/presentation/precompute.py:95` - precompute payload build.

  **Acceptance Criteria**:
  - [ ] Coordinator and precompute expose the same decision-source fields.
  - [ ] Runtime snapshot clearly shows which config source drove key decisions.

  **QA Scenarios**:
  ```text
  Scenario: coordinator payload contains enriched decision metadata
    Tool: Bash
    Preconditions: integration test with populated decision trace
    Steps:
      1. Run forecast update integration test.
      2. Assert coordinator payload fields include config source metadata.
    Expected Result: metadata present and serialized
    Evidence: .sisyphus/evidence/task-12-coordinator-observability.txt

  Scenario: precompute payload compatibility with enriched fields
    Tool: Bash
    Preconditions: precompute test fixture with legacy aliases
    Steps:
      1. Run precompute tests.
      2. Verify legacy aliases remain and new fields are available.
    Expected Result: compatibility maintained
    Evidence: .sisyphus/evidence/task-12-precompute-compat-error.txt
  ```

- [ ] 13. Update documentation for canonical config and migration behavior

  **What to do**:
  - Document canonical planner keys, precedence order, and migration behavior.
  - Add troubleshooting section for "night not charging" with trace-driven diagnosis steps.

  **Must NOT do**:
  - Do not document deprecated behavior as preferred.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: `quick` (documentation quality and clarity priority)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F1, F4
  - **Blocked By**: T1, T3, T4

  **References**:
  - `docs/user/PLANNER.md` - user-facing planner docs.
  - `docs/user/TROUBLESHOOTING.md` - issue diagnosis path.
  - `custom_components/oig_cloud/battery_forecast/planning/precedence_contract.py:24` - precedence ladder.

  **Acceptance Criteria**:
  - [ ] Docs define one source-of-truth keys and fallback behavior.
  - [ ] Troubleshooting includes exact trace fields to inspect.

  **QA Scenarios**:
  ```text
  Scenario: docs consistency review
    Tool: Bash
    Preconditions: docs updated
    Steps:
      1. Search docs for old/conflicting key guidance.
      2. Verify all references align with canonical key policy.
    Expected Result: no conflicting instructions remain
    Evidence: .sisyphus/evidence/task-13-docs-consistency.txt

  Scenario: troubleshooting walkthrough validity
    Tool: Bash
    Preconditions: sample trace fixture available
    Steps:
      1. Follow documented troubleshooting steps against fixture.
      2. Confirm issue root cause can be identified deterministically.
    Expected Result: reproducible diagnosis path
    Evidence: .sisyphus/evidence/task-13-troubleshooting-error.txt
  ```

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify Must Have / Must NOT Have against changed files and evidence artifacts.

  **QA Scenarios**:
  ```text
  Scenario: must-have and guardrail compliance
    Tool: Bash
    Preconditions: implementation tasks T1-T13 marked complete; evidence files exist
    Steps:
      1. Read plan and extract Must Have / Must NOT Have checklist.
      2. Inspect changed files and test outputs against each checklist item.
      3. Produce verdict with pass/fail counts.
    Expected Result: explicit matrix Must Have [N/N], Must NOT Have [N/N]
    Failure Indicators: any unmet must-have, any guardrail violation, missing evidence files
    Evidence: .sisyphus/evidence/final-f1-plan-compliance.txt

  Scenario: unaccounted change detection
    Tool: Bash
    Preconditions: git diff available for execution wave
    Steps:
      1. Compare changed files against planned task file scope.
      2. Flag files not mapped to any task reference.
    Expected Result: zero unaccounted files or explicit reject report
    Evidence: .sisyphus/evidence/final-f1-unaccounted-error.txt
  ```

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run typing/lint/tests and detect anti-patterns (`as any`, empty catches, dead/commented code).

  **QA Scenarios**:
  ```text
  Scenario: quality gate run
    Tool: Bash
    Preconditions: repository in post-implementation state
    Steps:
      1. Run configured lint/type/test commands for project.
      2. Collect failures and map them to files/lines.
      3. Produce PASS/FAIL summary.
    Expected Result: all configured quality gates pass
    Failure Indicators: any failing lint/type/test command
    Evidence: .sisyphus/evidence/final-f2-quality-gate.txt

  Scenario: anti-pattern sweep
    Tool: Bash
    Preconditions: codebase indexed
    Steps:
      1. Search changed files for banned patterns (`as any`, empty catches, dead code markers).
      2. Validate each hit as real issue or false positive.
    Expected Result: zero unresolved anti-pattern violations
    Evidence: .sisyphus/evidence/final-f2-antipattern-error.txt
  ```

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Replay all task QA scenarios end-to-end and store artifacts in `.sisyphus/evidence/final-qa/`.

  **QA Scenarios**:
  ```text
  Scenario: replay all task scenarios end-to-end
    Tool: Bash
    Preconditions: T1-T13 QA scenarios documented and runnable
    Steps:
      1. Execute each task's happy-path scenario in order.
      2. Execute each task's failure/edge scenario.
      3. Record pass/fail and artifact paths.
    Expected Result: all scenarios pass with evidence files present
    Failure Indicators: missing artifact, non-zero exit, assertion mismatch
    Evidence: .sisyphus/evidence/final-f3-scenario-replay.txt

  Scenario: cross-task integration check
    Tool: Bash
    Preconditions: merged implementation state
    Steps:
      1. Run integration-focused tests touching config accessor + planner + timeline + precompute.
      2. Verify trace metadata survives full pipeline.
    Expected Result: integrated behavior consistent and explainable
    Evidence: .sisyphus/evidence/final-f3-integration-error.txt
  ```

- [ ] F4. **Scope Fidelity Check** — `deep`
  Validate each diff hunk maps 1:1 to planned tasks without scope creep.

  **QA Scenarios**:
  ```text
  Scenario: task-to-diff fidelity mapping
    Tool: Bash
    Preconditions: complete diff available
    Steps:
      1. For each task T1-T13, map changed hunks to planned "What to do" items.
      2. Mark extra hunks not justified by any task.
    Expected Result: all hunks mapped; no uncontrolled scope expansion
    Failure Indicators: unmatched hunks or task requirements not implemented
    Evidence: .sisyphus/evidence/final-f4-fidelity-map.txt

  Scenario: cross-task contamination detection
    Tool: Bash
    Preconditions: task/file reference matrix from plan
    Steps:
      1. Compare changed file set per task against reference matrix.
      2. Flag contamination where a task modifies unrelated task domains.
    Expected Result: contamination clean or explicit reject list
    Evidence: .sisyphus/evidence/final-f4-contamination-error.txt
  ```

---

## Commit Strategy

- 1: `feat(planner-config): add canonical config accessor and migration contract`
- 2: `refactor(planner): migrate modules to canonical config precedence`
- 3: `feat(observability): enrich decision trace with config source and precedence`
- 4: `test(planner): add regression/e2e coverage for config drift and night charging`
- 5: `docs(planner): document canonical keys and migration behavior`

---

## Success Criteria

### Verification Commands
```bash
pytest tests/test_battery_forecast_* -q
pytest tests/test_battery_forecast_config_more.py -q
pytest tests/test_battery_forecast_sensor_runtime_more.py -q
```

### Final Checklist
- [ ] All Must Have present
- [ ] All Must NOT Have absent
- [ ] Planner decisions trace source key/value + precedence
- [ ] Legacy/new key mismatch no longer causes silent drift
- [ ] Tests pass
