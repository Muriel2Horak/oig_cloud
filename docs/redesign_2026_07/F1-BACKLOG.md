# F1 Backlog Status (docs/redesign_2026_07)

Generated from:
- `docs/redesign_2026_07/F1-DESIGN.md`
- `docs/redesign_2026_07/DECISIONS.md`
- `docs/redesign_2026_07/plans/2026-07-10-f1-plan1-registry-merge.md`
- `git show codex/f1-plan2-doc:docs/redesign_2026_07/plans/2026-07-16-f1-plan2-basic-fields-registry.md`
- deployed Plan-1 code on `b64876712`

Commit basis for DONE items: `b64876712`

## Scope changes 2026-07-17

Authority: `SCOPE-REVISION.md` (repo root) — decided with Martin 2026-07-17, FINAL. This section
supersedes any earlier remote-management wording in the rows below. Summary of the reclassification:

- **DROPPED — remote fetch / remote tuning / hard gate.** The runtime `remote_config/loader.py` fetch,
  signature, MITM, cache, rollback and expiry machinery (and its tests) is removed; remote tuning of
  battery/boiler heuristics is removed (heuristics stay LOCAL in code); the K1 hard dashboard gate is
  removed — onboarding becomes a SOFT, voluntary wizard + banner. (SCOPE-REVISION #1, #4, #6.)
- **MOVED to a bundled per-release dataset.** `pricelists` (ČEZ/EG.D/PRE from ERÚ) and the `ai_models`
  list (with fallback order) ship as bundled files in each release — NO runtime fetch, no signature/
  cache/expiry machinery. (SCOPE-REVISION #2, #3, #4.)
- **KEPT — AI runtime (Plan 3), optional.** AI stays as OIG's OWN backend (`AITaskEntity` feature
  `GENERATE_DATA` + `OpenAiCompatBackend` calling Groq/NVIDIA directly with the user's key; NO HACS-plugin
  dependency), an OPTIONAL onboarding helper (extract_pricelist, validate_config) — NOT a dashboard run
  condition. Provider is a CO-EQUAL choice (Groq / NVIDIA / the user's own HA ai_task). (SCOPE-REVISION #5, #8, #9.)
- **Closes critique CRITICAL #1** — the remote_config fetch/tuning live-control-plane machinery is gone.
- **CRITICAL #2** (GET `module_config` exposes config to non-admin HA users) → a small standalone admin-gate
  fix, tracked under Plan 4 below.

Pre-existing DONE (plan1) and PLANNED (plan2) rows are preserved; only the remote_config / tuning / AI /
gate rows are reclassified to match.

## Status map — by F1-DESIGN section

### Section 1 — Scope, goals and constraints
- DONE (plan1): canonical module field metadata exists via registry and merge primitives in
  `custom_components/oig_cloud/config_registry.py:120-219` and `custom_components/oig_cloud/config_merge.py:18-40`.
- DONE (plan1): module config sections are exposed to REST and merged on read/write in
  `custom_components/oig_cloud/api/ha_rest_api.py:1192-1279` and committed via existing options flow wiring in
  `custom_components/oig_cloud/config/steps.py:3429-3437`.
- PLANNED (plan2): finalize scope-complete field coverage and split basic/common fields per plan2 requirements.
  Refer to plan2 tasks 1 and 2 in `2026-07-16-f1-plan2-basic-fields-registry.md`.
- TODO-PLAN4 (CRITICAL #2 fix — approved 2026-07-17, SCOPE-REVISION consequence): `OIGCloudModuleConfigView.get`
  currently requires only authentication, not `hass_user.is_admin` (unlike POST) — so any authenticated HA
  account can read non-secret solar lat/long and site ID. Add the admin-gate (or redact GPS for non-admins).
  Target: `custom_components/oig_cloud/api/ha_rest_api.py:1202-1222` (GET) to match the POST admin check at
  `:1224-1230`. Standalone — independent of the bundled-dataset work.

### Section 2 — AI runtime
- KEPT — Plan 3 (reclassified 2026-07-17, SCOPE-REVISION #5,#8,#9): AI stays as an OPTIONAL onboarding helper
  (extract_pricelist = pricelist verification across 2 models; validate_config = numeric-relationship checks,
  NO location), NOT a dashboard run condition. Implemented as OIG's OWN backend — `AITaskEntity` (feature
  `GENERATE_DATA`, `_async_generate_data(...) -> GenDataTaskResult`) + `OpenAiCompatBackend` calling
  Groq/NVIDIA directly with the user's key. NO HACS-plugin dependency. Provider is a CO-EQUAL choice
  (Groq / NVIDIA / the user's own HA ai_task), not "Groq recommended". Prompts are anonymized.
- Note: AI actively driving battery/boiler RUNTIME decisions (feedback loops) stays deferred to F3 — only the
  onboarding helper is in Plan 3. See the F2/F3 carve-out below.

### Section 3 — remote_config (reclassified 2026-07-17, SCOPE-REVISION #1,#2,#3,#4)
- DROPPED: the runtime `remote_config/loader.py` fetch / signature / MITM / cache / rollback / expiry machinery
  and its tests. There is NO runtime fetch; the §9 "GitHub unavailable" line is removed. This closes critique
  CRITICAL #1 (remote_config as an undefined live control plane).
- DROPPED: remote tuning of battery/boiler heuristics. Heuristics stay LOCAL in code — no remote input
  influences them (SCOPE-REVISION #1).
- TODO — Plan 4: ship a BUNDLED per-release dataset instead — pricelists (ČEZ/EG.D/PRE from ERÚ) and the
  ai_models list (with fallback order) as files in each release. No fetch, no signature/cache/expiry machinery
  (SCOPE-REVISION #2,#3,#4). The old TODO-PLAN4 adapter-hook wording for a runtime fetch is superseded.

### Section 4 — Onboarding / wizard entry points
- DONE (plan1): not implemented in plan1 backend work (Plan-1 is registry/merge only).
- TODO-PLAN3 (SOFT wizard — reclassified 2026-07-17, SCOPE-REVISION #6): onboarding is a VOLUNTARY guided
  flow launchable from Settings + a banner for incomplete setup. The K1 HARD dashboard gate is DROPPED — no
  hard lock, not even for fresh installs. Implement onboarding surfaces and wizard routing in
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
- D11: KEPT — Plan 3 (reclassified 2026-07-17, SCOPE-REVISION #5,#8,#9): AI is an OPTIONAL onboarding helper
  via OIG's OWN backend (`AITaskEntity` + `OpenAiCompatBackend`, Groq/NVIDIA direct, no HACS plugin), NOT a
  dashboard run condition. Runtime AI decisioning still defers to F3.

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
- K2g: KEPT — Plan 3 (reclassified 2026-07-17): the onboarding AI helper (extract_pricelist/validate_config)
  is in Plan 3 as OIG's own optional backend; runtime AI-driven decisioning still defers to F3.

## 3-vs-4 split rationale (revised 2026-07-17, SCOPE-REVISION)

Plan 3 boundary: all user-facing config-flow behavior and provider/AI wiring.
- OWNERSHIP PLAN 3:
  - SOFT onboarding wizard — voluntary guided flow + banner, NO hard K1 gate (SCOPE-REVISION #6),
  - registry-driven settings forms incl. provider-conditional visibility/validation,
  - OIG's OWN AI backend (`AITaskEntity` + `OpenAiCompatBackend`, Groq/NVIDIA direct, no HACS plugin) as an
    OPTIONAL helper; provider CO-EQUAL (Groq / NVIDIA / user's HA ai_task); direct registration links +
    numbered key steps (Groq `gsk_`, NVIDIA `nvapi-`) in onboarding step ① (SCOPE-REVISION #5,#7,#8,#9),
  - the two UX fixes: provider→key conditional visibility/validation, and select-dropdown transparency,
  - any frontend wiring required to expose plan-2 registry data in V2.

Plan 4 boundary: migration safety, runtime cleanup, and the bundled dataset.
- OWNERSHIP PLAN 4:
  - dead-key deletion / compatibility cleanup (heuristics stay LOCAL — no remote tuning, SCOPE-REVISION #1),
  - transactional, recoverable migration/downgrade protocol,
  - BUNDLED per-release dataset (pricelists + ai_models list, no fetch — SCOPE-REVISION #2,#3,#4),
  - the small GET `module_config` admin-gate fix (critique CRITICAL #2),
  - API/flow hardening after all Plan 2/3 consumers are in place.

This split keeps already-accepted plan2 work intact and avoids mixing short-cycle UX wiring with long-tail compatibility debt.

## Deferred (F2 / F3)

- F2 (wizard battery/boiler + advice chat): not in current F1 scope. F2 should define flow orchestration, wizard state persistence, and conversational guidance UX.
  Open questions for F2 design:
  - What are hard stop conditions and checkpoints in each wizard step?
  - How is partially-completed flow state stored and resumed across sessions?
  - What are the privacy/compliance guarantees for user-entered advice inputs/outputs?

- F3 (AI actively wired): not in current F1 scope. Note (2026-07-17): the onboarding AI HELPER
  (extract_pricelist, validate_config) moved to Plan 3 as OIG's own optional backend; what STAYS deferred to
  F3 is AI actively driving battery/boiler RUNTIME decisions and the feedback loops around it. F3 should
  define model invocation, prompt policy, and runtime decision feedback loops once F2 flow exists.
  Open questions for F3 design:
  - Which model/provider contract is canonical and where is the service boundary?
  - How are AI suggestions versioned against registry schema versions?
  - What are failure/retry and trust-score rules for AI-driven recommendations?
