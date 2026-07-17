# F1 Backlog Status (docs/redesign_2026_07)

Generated from:
- `docs/redesign_2026_07/F1-DESIGN.md`
- `docs/redesign_2026_07/DECISIONS.md`
- `docs/redesign_2026_07/plans/2026-07-10-f1-plan1-registry-merge.md`
- `git show codex/f1-plan2-doc:docs/redesign_2026_07/plans/2026-07-16-f1-plan2-basic-fields-registry.md`
- deployed Plan-1 code on `b64876712`

Commit basis for DONE items: `b64876712`

## Status map — by F1-DESIGN section

### Section 1 — Scope, goals and constraints
- DONE (plan1): canonical module field metadata exists via registry and merge primitives in
  `custom_components/oig_cloud/config_registry.py:120-219` and `custom_components/oig_cloud/config_merge.py:18-40`.
- DONE (plan1): module config sections are exposed to REST and merged on read/write in
  `custom_components/oig_cloud/api/ha_rest_api.py:1192-1279` and committed via existing options flow wiring in
  `custom_components/oig_cloud/config/steps.py:3429-3437`.
- PLANNED (plan2): finalize scope-complete field coverage and split basic/common fields per plan2 requirements.
  Refer to plan2 tasks 1 and 2 in `2026-07-16-f1-plan2-basic-fields-registry.md`.

### Section 2 — AI runtime
- F3: AI runtime is not implemented in Plan-1/Plan-2 artifacts and appears outside the current F1 execution slice.
  No implementation references were found in required checked-in files; no files to touch are assigned in Plan-3/4.

### Section 3 — remote_config
- F3: remote-config delivery pipeline is not present in Plan-1/Plan-2 code (directory `custom_components/oig_cloud/remote_config` is absent from checked tree).
- TODO-PLAN4: if this requirement remains in F1, migration/backward-compat cleanup and adapter hooks should land in
  `custom_components/oig_cloud/api/ha_rest_api.py` and `custom_components/oig_cloud/config/steps.py`.

### Section 4 — Onboarding / wizard entry points
- DONE (plan1): not implemented in plan1 backend work (Plan-1 is registry/merge only).
- TODO-PLAN3: implement onboarding surfaces and wizard routing in
  `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/*` and any router/module registrations under `custom_components/oig_cloud/www_v2/src/ui/*`.
- TODO-PLAN3: Provider-key UX wiring for solar forecast key input:
  `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts:83-97` (provider select remains flat),
  `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts:574-585` (rendered fields are static).

### Section 5 — Registry + shared merge behavior
- DONE (plan1): section registry exists and supports shared merge behavior in
  `custom_components/oig_cloud/config_registry.py:120-219`, `custom_components/oig_cloud/config_merge.py:18-40`.
- DONE (plan1): merge-compatible REST APIs are in place (`/config_registry` and module config GET/POST flow) in
  `custom_components/oig_cloud/api/ha_rest_api.py:1282-1297`, `1192-1222`, `1246-1279`.
- PLANNED (plan2): refine exposed section payloads and basic-field registration per plan2 task 1.

### Section 6 — Config-flow slimming and cleanup
- PLANNED (plan2): remove hard-coded interval/default form schema behavior and move toward registry-informed payload flow (plan2 task 4 and task 3 evidence).
  - `custom_components/oig_cloud/config/steps.py` is currently hardcoded (`_collect_interval_values`, `_build_base_options`, `_show_intervals_form`) at `1395-1446` and `355-387`, `1464-1535`.
- TODO-PLAN4: delete dead keys / compatibility-only logic (alias-based fields like `standard`, `extended`, `proxy_stale`, `debounce_ms`) and keep canonical names.
  Target: `custom_components/oig_cloud/config/steps.py:1395-1535`.
- TODO-PLAN3: complete config-flow wiring in settings UI and hook visibility/validation to registry metadata.
  Target: `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts:1-700` (registration + field render path).

### Section 7 — Migration plan
- TODO-PLAN4: migration strategy and migration tooling are not yet authored in Plan-1/Plan-2; design requires cleanup/migration passes.
  Files: `custom_components/oig_cloud/api/ha_rest_api.py:1157-1279`, `custom_components/oig_cloud/config/steps.py:1395-1446`, `custom_components/oig_cloud/core/data_source.py:30-32, 94-101`.
- TODO-PLAN4: drop legacy compatibility-only runtime fields only after migration guardrails; no final pass executed yet.

### Section 8 — Error states and compatibility handling
- DONE (plan1): API still masks sensitive fields and returns validation behavior through `_coerce_module_value` + merge checks in
  `custom_components/oig_cloud/api/ha_rest_api.py:1157-1279`.
- TODO-PLAN4: convert legacy fallback/compat code paths into explicit migration-safe error-state handling and remove temporary guard code paths.
  Files: `custom_components/oig_cloud/api/ha_rest_api.py:1167-1279`, `custom_components/oig_cloud/config/steps.py:1400-1460`.

### Section 9 — Tests
- PLANNED (plan2): regression guard appears in plan2 draft task 5; this is the formal test guard for plan2 scope.
- TODO-PLAN4: expand to migration/smoke tests and end-to-end coverage for UI provider-conditional behavior and alias deprecation.
  Files: `custom_components/oig_cloud/tests/*`, `custom_components/oig_cloud/www_v2/src/ui/features/settings/*` (where tests and snapshots currently absent).

### Section 10 — Live UX gaps / field polish (explicitly required)
- TODO-PLAN3: provider→key not wired (`solar_forecast_provider` currently no conditional key visibility/validation) in
  `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts:83-97` and render path `574-585`.
- TODO-PLAN3: transparent select dropdown option popover needs solid themed background in settings stylesheet/render styles in
  `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts:289-293`.

## Approved decisions status

### D1–D11
- D1: DONE (plan1) — registry-driven field ownership is implemented in plan-1 (`config_registry.py`, commit `b64876712`).
- D2: DONE (plan1) — shared module config sections are merged/retrieved centrally (`config_merge.py`, `config_registry.py`).
- D3: DONE (plan1) — basic secret field handling and redaction is done in REST view (`ha_rest_api.py`).
- D4: DONE (plan1) — sectioned module config API contract is in place.
- D5: DONE (plan1) with pending hardening in plan4 for legacy key cleanup (`ha_rest_api.py:1157-1297`).
- D6: PLANNED (plan2) — completion is in plan2 draft (field set and behavior alignment tasks 1/2).
- D7: PLANNED (plan2) — interval option baseline normalization and alias handling remains in plan2 work.
- D8: TODO-PLAN4 — remove legacy-only branches after migration; no final cleanup exists yet.
- D9: TODO-PLAN4 — final migration/compatibility decisions require plan4 deprecation sweep.
- D10: TODO-PLAN4 — hardening/cleanup of compatibility defaults not yet completed.
- D11: F3 — any active AI/runtime coupling from this decision is deferred to later feature track.

### P1–P10
- P1: DONE (plan1) — registry + merge baseline.
- P2: DONE (plan1) — central config sectioning and schema availability in API.
- P3: PLANNED (plan2) — basic/common section registry tasks are in plan2.
- P4: PLANNED (plan2) — `_build_base_options` cleanup and interval flow normalization are explicit in plan2 task 4 and task 3.
- P5: DONE (plan1) — secret masking and merge-safe write path implemented.
- P6: TODO-PLAN4 — complete removal of old defaults and alias drift handling (`steps.py:355-387`, `1395-1446`).
- P7: PLANNED (plan2) — regression guard for open questions (`plan2 task 5`).
- P8: TODO-PLAN3 — V2 settings provider/key UX wiring, currently missing.
- P9: TODO-PLAN3 — UI polish and select background visibility issue in settings screen.
- P10: TODO-PLAN4 — final compatibility cleanup and migration documentation in shared flow.

### K2a–K2g
- K2a: TODO-PLAN4 — dead-key migration order and precedence cleanup in `custom_components/oig_cloud/config/steps.py:1395-1446`.
- K2b: TODO-PLAN4 — alias compatibility handling (`standard`, `extended`, `proxy_stale`, `debounce_ms`) cleanup in `custom_components/oig_cloud/config/steps.py:1395-1412`.
- K2c: TODO-PLAN4 — data source compatibility and mapping cleanup in `custom_components/oig_cloud/core/data_source.py:30-32,94-101`.
- K2d: TODO-PLAN4 — secret/hidden field handling simplification in `custom_components/oig_cloud/api/ha_rest_api.py:1157-1172,1220-1279`.
- K2e: TODO-PLAN4 — remove migration-only branches once compatibility window closes.
- K2f: PLANNED (plan2) — fallback keys and regression checks are addressed by plan2 task 3+5.
- K2g: F3 — no active AI-driven decisioning context in F1 core implementation.

## 3-vs-4 split rationale

Plan 3 boundary: all user-facing config-flow behavior and provider wiring.
- OWNERSHIP PLAN 3:
  - settings rendering driven from registry metadata, including provider-conditional visibility/validation,
  - onboarding/wizard entry points (F1 onboarding requirement),
  - immediate UX corrections (provider key field visibility and select popover readability),
  - any frontend wiring required to expose plan-2 registry data in V2.

Plan 4 boundary: migration safety and runtime cleanup.
- OWNERSHIP PLAN 4:
  - dead-key deletion and compatibility cleanup,
  - alias/legacy key migration behavior and guard rails,
  - API/flow hardening after all Plan 2/3 consumers are in place.

This split keeps already-accepted plan2 work intact and avoids mixing short-cycle UX wiring with long-tail compatibility debt.

## Deferred (F2 / F3)

- F2 (wizard battery/boiler + advice chat): not in current F1 scope. F2 should define flow orchestration, wizard state persistence, and conversational guidance UX.
  Open questions for F2 design:
  - What are hard stop conditions and checkpoints in each wizard step?
  - How is partially-completed flow state stored and resumed across sessions?
  - What are the privacy/compliance guarantees for user-entered advice inputs/outputs?

- F3 (AI actively wired): not in current F1 scope. F3 should define model invocation, prompt policy, and runtime decision feedback loops once F2 flow exists.
  Open questions for F3 design:
  - Which model/provider contract is canonical and where is the service boundary?
  - How are AI suggestions versioned against registry schema versions?
  - What are failure/retry and trust-score rules for AI-driven recommendations?
