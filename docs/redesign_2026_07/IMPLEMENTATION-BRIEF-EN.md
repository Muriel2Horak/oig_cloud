# IMPLEMENTATION-BRIEF-EN

## 1. Why this document exists
- Plan 3 shipped an onboarding wizard where steps 2 and 3 rendered as empty screens.
- The unit layer passed because `STEP_SOLAR.fields()` was built from registry data as required by existing contracts.
- The bug was not in schema shape but in composition: no component in the flow rendered those fields into DOM.
- The user could not complete setup, so the feature looked finished in tests but was unusable in the product.
- Lesson: a passing unit-contract test is not proof of a rendered screen; render assertions on produced UI are mandatory.

## 2. Verification standard
- All features in onboarding must be verified by assertions against produced DOM, not only data contracts.
- For each step, there must be at least one test that proves required visible UI exists in rendered markup (`getByText`, labels, buttons, controls, groups, options, warnings).
- Do not pass features with checks that only confirm registry values, helper output, API status, or config objects.
- What MUST be true: each screen test must fail if the step renders empty DOM for required controls.
- What MUST be true: each screen test must fail if the expected action path is missing (`save`, `next`, `back`, inline errors, and completion indicators).
- Every prohibition has a positive check: if a field is required in behavior, the same requirement is expressed as DOM existence and a user-outcome assertion.
- Every verification item must include a user-observable outcome, not an internal-only outcome.
- Verification must include at least one route-to-flow assertion for step navigation and one data-path assertion from control to payload persistence.
- Failures must surface in the same format as product behavior, including visible warning states, error states, disabled buttons, and disabled/enabled transitions.
- If behavior differs from mock data or contract, DOM evidence is authoritative and controls whether implementation passes.
- Any file-level test gate that can pass with no rendered control is not accepted.

## 3. Binding scope R1 through R9

### R1 — Plan ordering
- Decides: ordering is fixed as Plan 4 first, then Plan 3.6, then D8.
- Obliges implementer: do not deliver Plan 3.6 before Plan 4 data/contract primitives are present; keep migration/cleanup dependency explicit in planning and PR dependencies.
- Source trace: `SCOPE-REVISION.md` section `R1`.

### R2 — AI helper responsibilities move to D8
- Decides: `extract_pricelist` and `validate_config` are out of Plan 3.6 and belong to D8.
- Obliges implementer: Plan 3.6 must not implement runtime AI-driven extraction/validation work, only consume outputs and contract surfaces.
- Source trace: `SCOPE-REVISION.md` section `R2`.

### R3 — 3.6 depends on Plan 4 contracts
- Decides: Plan 4 must finish the frontend-pricelist contract before 3.6 can be complete.
- Obliges implementer: integrate 3.6 only against the shipped Plan 4 contract (registry + endpoint + dataset source path) and do not invent alternate contracts in 3.6.
- Source trace: `SCOPE-REVISION.md` section `R3`.

### R4 — Pricelist dataset architecture
- Decides: dataset source is “ERU” decree input, transformed into release-bundled JSON, with validity snapshots and frozen build provenance.
- Obliges implementer: maintain the transformation pipeline from source decree artifacts to release artifact in-repo; do not fetch decrees at runtime.
- Obliges implementer: build output must include stable year and distributor keys for `cez`, `egd`, and `pre` and all fields required for pricing screens.
- Obliges implementer: runtime consumers must read bundled JSON from release assets, not network lookups to raw source files.
- Obliges implementer: stale/invalid dataset behavior must be explicit and observable in runtime validation logic.
- Source trace: `SCOPE-REVISION.md` section `R4`, `docs/redesign_2026_07/ERU-DATASET-RESEARCH.md`.

### R5.x — Anti-stub and integration hardening
- Decides: implementation work must be protected against empty or fake render/data outputs, and implementation docs must be in English.
- Obliges implementer: add non-stub checks for dataset build, pricing endpoint output, completion persistence, warning UX, and contract test quality.
- Obliges implementer: create this English implementation brief and keep all rule restatements self-contained.
- Source trace: `SCOPE-REVISION.md` sections around `R5`, `SCOPE-REVISION.md` at `R5.6`, `docs/redesign_2026_07/PLAN-3.6-SPEC.md`.

### R6.1 — Migration backup policy
- Decides: migration backup files must not retain secrets.
- Obliges implementer: remove credentials/secrets from any migration backup artifact and verify by test/grep-level assertion on persistence output.
- Source trace: `SCOPE-REVISION.md` `R6.1`.

### R6.2 — Release JSON byte-equivalence
- Decides: generated bundled dataset payload must be byte-equivalent and stable when regenerated from identical source inputs.
- Obliges implementer: canonicalize output ordering and formatting so repeated runs do not create nondeterministic diffs.
- Source trace: `SCOPE-REVISION.md` `R6.2`.

### R6.3 — Runtime schema consumption and stale rules
- Decides: FE must consume bundled schema, and stale/missing schema must route through explicit handling.
- Obliges implementer: do not silently continue when schema is absent; render/alert path must remain explicit and testable.
- Source trace: `SCOPE-REVISION.md` `R6.3`.

### R6.4 — Completion and persistence
- Decides: completion of onboarding steps must persist and survive reload through rendered UI state, not background-only side effects.
- Obliges implementer: assert that completion flag and visible indicators are written and visible after navigation/reload.
- Source trace: `SCOPE-REVISION.md` `R6.4`.

### R6.5 — `POST /solar_test` contract
- Decides: step 2 validation is via explicit API call with bounded retries, clear errors, and rate-limit/backoff semantics.
- Obliges implementer: integrate and test this endpoint flow against DOM-visible error states and next-step blocking/unblocking rules.
- Source trace: `SCOPE-REVISION.md` `R6.5`.

### R6.6 — Missing config warning
- Decides: missing-config warning must be visible and actionable in onboarding flow.
- Obliges implementer: show warning in rendered output, keep action path discoverable, and verify transition behavior under missing source conditions.
- Source trace: `SCOPE-REVISION.md` `R6.6`.

### R6.7 — AI key lifecycle
- Decides: replace/delete checks must exist for API key records and rotation behavior.
- Obliges implementer: maintain `AiKeyStore` delete and replacement checks and render their outcomes for UI or user-visible logs.
- Source trace: `SCOPE-REVISION.md` `R6.7`, and cross-check `spec-critique/R2-AIKEYS-aikeys.md`.

### R6.8 — AI prompt boundary and sensitive field stripping
- Decides: prompt inputs are enum/allow-list driven; sensitive values are excluded before collection/submission.
- Obliges implementer: enforce explicit allow-lists and redact excluded fields before API calls or persistence.
- Source trace: `SCOPE-REVISION.md` `R6.8`.

### R6.9 — Diagnostic redaction
- Decides: `oig_ai_status` and diagnostic payloads must not leak secret values or raw stack traces.
- Obliges implementer: implement redaction and assert visible diagnostics carry only safe text.
- Source trace: `SCOPE-REVISION.md` `R6.9`.

### R6.10 — Brief lint and CI gate
- Decides: implementation-brief lints must exist in CI and run in the merge gate.
- Obliges implementer: add/keep command for brief-lint and ensure CI fails when this file breaks required structure.
- Source trace: `SCOPE-REVISION.md` `R6.10`.

### R6.11 — Startup, restore, and cache behavior
- Decides: bounded startup and restore must be deterministic with measured cache behavior.
- Obliges implementer: implement bounded restore windows, cache invalidation strategy, and verify behavior with explicit timing/size assertions.
- Source trace: `SCOPE-REVISION.md` `R6.11`.

### R6.12 — Render metadata stability
- Decides: `fieldsFromRegistry` memoization and rendered metadata must be stable across rerenders.
- Obliges implementer: stable keys and consistent IDs must be guaranteed so UI does not drop controls while state updates.
- Source trace: `SCOPE-REVISION.md` `R6.12`.

## 4. Acceptance criteria per plan

### Plan 4 — cleanup/migration/dataset
- Command: `git show --no-patch codex/f1-spec-complete:docs/redesign_2026_07/plans/2026-07-17-f1-plan4-cleanup-migration-dataset.md` (ensure you are implementing from that contract).
- Command: `rg -n "ERU|remote_config/data/pricelists.json|build.*pricelist|snapshot|validity" custom_components/oig_cloud` (proof dataset source, build, and validity output exist).
- Command: `rg -n "\"year\"\s*:\s*2026|\"distributors\"\s*:\s*\{|\"cez\"|\"egd\"|\"pre\"" custom_components/oig_cloud/remote_config/data/pricelists.json` (proof release JSON contains required shape).
- Command: `rg -n "POST\s*/solar_test|/solar_test|solar_test" custom_components/oig_cloud` (proof endpoint is present and contract-aligned).
- Command: `rg -n "missing.*pricelist|no.*pricelist|stale.*pricelist|dataset.*invalid" custom_components/oig_cloud` (proof stale/missing messaging path is explicit).

### Plan 3.6 — onboarding pricing step and UI composition
- Command: `rg -n "STEP_SOLAR|step.*solar|fieldsFromRegistry|render|Pricing|distributors|distribucni sazba|Kc/A/mesic" custom_components/oig_cloud/www_v2/src custom_components/oig_cloud/test` (proof registry fields are rendered in DOM for pricing screen).
- Command: `rg -n "AiKeyStore|AiKey|delete|replace|api key|rotation" custom_components/oig_cloud/www_v2/src custom_components/oig_cloud -g '*.*'` (proof key lifecycle checks remain tied to UI flow).
- Command: `rg -n "oig_ai_status|warning|alert|error|retry|rate limit|429|timeout" custom_components/oig_cloud/www_v2/src custom_components/oig_cloud/test` (proof diagnostics and warning UX are visible and stateful).
- Command: `rg -n "completion|stepCompleted|saveDraft|persist|localStorage|next|finish" custom_components/oig_cloud/www_v2/src` (proof completion persistence and next-step progression are implemented and testable).
- Command: `rg -n "fieldsFromRegistry\(|fields_from_registry|rendered\s+fields|form\s+controls" docs/redesign_2026_07/F1-STATUS-MAP.md` (proof status map targets map to implemented deliverables).

## 5. Anti-stub rules
- Test data/build outputs must contain semantic data, not placeholders.
- Script may not output `{"year":2026,"distributors":{"cez":{},"egd":{},"pre":{}}}`.
- A test fixture with exactly that payload must force non-zero exit and visible error in build/test output.
- Every generated distributor bucket must have non-empty, schema-valid payload for required tariffs and metadata used by pricing controls.
- A change is invalid if it increases token count or short-circuits execution while still producing shape-like JSON.
- A dataset command must fail if checksum, row count, or required bucket count changes unexpectedly.
- A pricing endpoint response may not be hardcoded to satisfy snapshots; endpoint data must be derived from built dataset and registry contract.
- A successful flow cannot rely on mocks only; regression suite must include at least one rendered DOM assertion on the pricing step output.

## 6. Do-NOT list for implementers
- Do NOT pass tests with contract-only assertions only.
- DO assert final step field presence in rendered DOM and navigation outcome from UI interactions.
- Do NOT fetch decree/source data at runtime from external endpoints for pricing.
- DO consume release-bundled JSON from the committed build artifact and verify freshness/staleness explicitly.
- Do NOT store or log secrets in migration backup artifacts.
- DO strip secrets before persistence, prompts, diagnostics, and key status output.
- Do NOT silence `POST /solar_test` failures.
- DO show user-visible warning, retry, and retry-limit behavior when `solar_test` fails or times out.
- Do NOT ship an onboarding flow with hidden completion state.
- DO render completion state and persistence checks so the user can observe completion.
- Do NOT ship a brief in Czech or mixed language for implementation handoff.
- DO write this document in English with complete binding rules and proofs.

## Unresolved — needs an operator decision
- `spec-critique/R2-PERF-perf.md` warns about migration IO and endpoint timeout handling and does not close implementation-time guardrail details; confirm whether explicit perf budgets belong in this plan’s acceptance list.
- `spec-critique/R2-AIKEYS-aikeys.md` contains remaining CRITICAL follow-up points; confirm if this brief should include mandatory remediation checkpoints in next plan scope or keep them in D8 only.
- `spec-critique/R2-ANTISTUB-codex.md` notes anti-stub pressure around migration/build guarantees; confirm whether a dedicated empty-fixture test file and checksum assertion are required in Plan 4 CI or can remain in a dedicated follow-up test stage.

## 7. R7 — Round-2 closure alignment

- **R7.3 (AKEY-R6-001)**: `/solar_test` outputs and diagnostics must be classified-only and secret-safe (`SCOPE-REVISION.md: R7.3`).
- **R7.4 (anti-stub critical/AS-4)**: production dashboard DOM assertion is required, with `[data-testid=dashboard-primary]` and no onboarding blocker in pending state; no banner on grandfathered state (`SCOPE-REVISION.md: R7.4`).
- **R7.5 (AS-10)**: build requirements and lock policy are explicit at `scripts/requirements-build.txt` and `scripts/requirements-build.txt.lock`; lock hash validation is required in pipeline (`SCOPE-REVISION.md: R7.5`).
- **R7.6 (AS-15)**: stale warning uses the single dataset rule `snapshot.valid_from.year < current_year` (`PLAN-3.6-SPEC.md: AK-3`, `SCOPE-REVISION.md: R7.6`).
- **R7.7 / R7.8 (AS-13, AS-14)**: Step-2 and Step-3 values are persisted and reloaded before completion; `fieldsFromRegistry('solar')` and `fieldsFromRegistry('pricing')` keys are saved and remounted (`SCOPE-REVISION.md: R7.7`, `R7.8`), polarity now overridden by `SCOPE-REVISION.md: R8.1`.
- **R8.1 (AS-13, AS-14, AKEY-R7-001)**: non-secret remount values are required to be present; secret values are forbidden in UI, entries, responses, and draft state (`SCOPE-REVISION.md: R8.1`).
- **R8.9 (AKEY-R7-004, R7-AS-NEW-3)**: `/solar_test` belongs to Step-2; classified Step-2 failure does not block `wizard-next`/`wizard-skip`, and the same section should still display a visible warning (`SCOPE-REVISION.md: R8.9`).
- **R7.9 (AS-11)**: Task-5 warning coverage has owner+follow-up acceptance test in scope/plan (`SCOPE-REVISION.md: R7.9`).
- **R7.10 (M-2)**: non-admin refusal path for `/pricelists` is required with explicit matrix test (`SCOPE-REVISION.md: R7.10`).
- **R7.11 (AKEY-R6-004)**: cross-provider fallback requires explicit consent; `docs/redesign_2026_07/F1-DESIGN.md` fallback text is overridden by this rule (`SCOPE-REVISION.md: R7.11`).
- **R7.12 (AKEY-R6-003)**: replacement solar key is written only after successful `/solar_test` verification (`SCOPE-REVISION.md: R7.12`).
- **R7.1 / R7.2 (R6-SEC-1, R6-SEC-2)**: secret-only persistence in private stores and fail-closed migration write paths are mandatory (`SCOPE-REVISION.md: R7.1`, `R7.2`).

## 8. R9 — Round-4 closeout rules

### R9.1 — Closed `/api/oig_cloud/**` auth matrix
- Source trace: `SCOPE-REVISION.md: R9.1`.
- Rule: the endpoint auth matrix is closed. Any new `/api/oig_cloud/**` endpoint must be added to the matrix with allowed methods, admin outcome, non-admin refusal outcome, unsupported-method outcome, and its own non-admin refusal test before it ships.
- Matrix:

| Route | Allowed method(s) | Admin outcome | Authenticated non-admin outcome |
|---|---|---|---|
| `/api/oig_cloud/{box}/module_config` | `GET` | Return admin-visible module config. | `403`; no module payload; same refusal shape for existing and missing boxes. |
| `/api/oig_cloud/{box}/config_registry` | `GET` | Return registry metadata needed for controls. | `403`; no registry payload; same refusal shape for existing and missing boxes. |
| `/api/oig_cloud/{box}/pricelists` | `GET` | Return bundled distributor, tariff, price, unit, validity, and stale-warning data. | `403`; no priced data; same refusal shape for existing and missing boxes. |
| `/api/oig_cloud/{box}/solar_test` | `POST` | Run bounded provider check; return forecast data or classified error. | `403` before accepting request values or making any outbound provider call. |
| `/api/oig_cloud/{box}/onboarding` | `GET`, `POST` | `GET` returns non-secret setup state; `POST` accepts non-secret draft/status updates. | `403` before returning or accepting step status, timestamps, GPS, provider, pricing, `solcast_site_id`, or `*_set` fields. |

- Unsupported methods: every method outside the allowed method set returns `405`; no route data, state mutation, body acceptance, or outbound provider call is allowed.
- `/onboarding` negative test: seed latitude, longitude, provider, pricing values, `*_set` booleans, `solar_forecast_api_key="fs_secret_123456789"`, `solcast_api_key="sc_secret_123456789"`, and `solcast_site_id="site_leak_12345"`. As authenticated non-admin, call `GET` and `POST`; assert `403`, no leaked fields, no draft mutation, and identical refusal for an existing and missing box.
- `/onboarding` positive test: as admin, `GET` returns step status, timestamps, provider enum, non-secret solar fields, pricing fields, and credential `*_set` booleans needed for remount. The same seeded sentinels must be absent from REST, DOM, logs, diagnostics, and saved draft state.
- `/pricelists` rule: the box-scoped route has no public-route exception. A future public pricelist route must be boxless, contain no entry identifier, and have its own matrix row and tests.

### R9.2 — Numeric performance budgets
- `/solar_test` outbound timeout: `10 s` server-side hard cap using Home Assistant shared aiohttp session. Check: sleeping provider stub returns classified `timeout`; wizard next/skip remain enabled; no raw exception leaks.
- `/solar_test` shared rate limit: the provider-consumption and concurrency bucket key is exactly normalized `(entry_id, provider)`; request-body hashes may be used only for response deduplication and MUST NOT create independent rate or concurrency buckets. Permit at most one provider call in flight per `(entry_id, provider)`, at most four provider calls in flight across the integration, and at most one outbound call per `(entry_id, provider)` per `30 s`. Reject excess work as `rate_limited` before calling the shared aiohttp session.
- Wizard bootstrap: each GET to `/module_config`, `/config_registry`, `/onboarding`, and `/pricelists` must settle or be aborted within `3 s`; shared bootstrap deadline is `5 s`. On deadline, abort pending requests, render classified retry in affected step, and keep close/skip/dashboard navigation usable. Production launch must render the wizard shell within `100 ms` p95 and either interactive fields or classified retry state within `5 s`.
- Already-complete migration/setup budget: `<= 50 ms` on CI and no full rewrite. Check: completed marker reload measures setup with `time.monotonic()` and asserts no avoidable `Store.async_save()`.
- Step render budget: Step 2 and Step 3 field rendering `<= 16 ms` p95 per component render; `fieldsFromRegistry(...)` called at most once per section per render path. Check: component fixture measures `performance.now()`, counts calls, and asserts DOM controls keep stable keys after unrelated input changes.
- Transform executability: `TER-1`. An async transform MUST call only natively non-blocking async/HA APIs and MUST NOT call synchronous file, network, subprocess, sleep, crypto, or HA-state APIs on the event-loop thread. Every blocking callable MUST be passed directly to `hass.async_add_executor_job`; wrapping blocking code in `async def` and awaiting it does not satisfy this rule. Check: fixtures patch `open`, `Path.read_text/read_bytes`, `requests`, `subprocess`, `time.sleep`, and sync crypto entry points and assert execution is off the HA event-loop thread.

### R9.3 — Minor disposition
- `PERF-NEW-R9-D`: CI writes one non-retry duration artifact per PR for the combined falsifier suite, retains the latest 50 successful PR artifacts, and computes nearest-rank p95 through `scripts/check_onboarding_perf_history.py`. Merge gate fails when p95 exceeds `30 s`; until 50 artifacts exist, every observed run is `<= 30 s`.
- `PERF-NEW-R8-C`: credential clear/provider-switch/remove deletes `oig_cloud.ai_<entry_id>` and `oig_cloud.solar_<entry_id>` in `<= 200 ms` aggregate averaged across 5 CI runs, with both private store files gone and no migration-backup collision.
- `PERF-NEW-R8-D`: deterministic clock override is an explicit function parameter or test-helper export, not a production global. Check: `rg -n "WINDOW|DEBUG_CLOCK|TEST_CLOCK" custom_components/oig_cloud/` returns 0 for production code and snapshot-selection p99 is `< 5 us` over 10,000 calls.
- `R8-AS-NEW-1`: rejected for this R9 slice because the requested table edit is in `spec-critique/R6-CLASSIFICATION.md`, outside the allowed file list. Binding routing already exists in `SCOPE-REVISION.md: R8.4`; update the classification table only when that file is editable.
