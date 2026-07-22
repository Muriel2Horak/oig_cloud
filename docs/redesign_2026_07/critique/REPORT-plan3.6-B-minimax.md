# Critique — F1 Plan 3.6 onboarding wizard completion

## Overall verdict

**UNSOUND — substantial rework required before implementation.**

The plan identifies the visible empty-screen defect and names many real files, but it does not yet describe a mergeable implementation. The largest gaps are not cosmetic: Solar draft values and credentials have no persistence path, the proposed `/solar_test` reuse target cannot accept the wizard's candidate values, Finish is neither atomic nor proven through the UI, and the plan omits the binding security/performance rules in `SCOPE-REVISION.md` and `IMPLEMENTATION-BRIEF-EN.md`.

The plan is broadly in scope: it does not explicitly add Plan 4 dead-key cleanup, migration, GPS admin-gate work, or runtime pricing fetch. However, it must declare the Plan 4 contract as a prerequisite and must not assume that the existing Solar credential path is safe; the current tree still stores Solar secrets in options and has no `oig_cloud.solar_<entry_id>` store.

## Ranked findings

### 1. Blocker — The authoritative R7–R10 contract is omitted from the plan

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:9-15,267-281`; `SCOPE-REVISION.md:240-256,277-329,332-389,397-449`; `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:159-226`.

The source list names the spec, design, verification standard, Plan 1, and decisions, but not `SCOPE-REVISION.md` or the English implementation brief that restates the binding rules for this slice. As a result, the task list and Done-gate omit all of the following mandatory behavior:

- `/solar_test` classified-only output and secret redaction (R7.3).
- Save/reload of non-secret Solar and pricing values before completion, with secrets forbidden in DOM/options/responses (R7.7, R7.8, R8.1).
- Production `oig-app` launch coverage for AK-1 through AK-4 (R8.2).
- Closed auth matrix, identical non-admin refusal for existing/missing boxes, and 405 checks (R9.1).
- A 10-second server cap using the shared HA aiohttp session, `(entry_id, provider)` rate/concurrency buckets, and the four-call integration cap (R9.2/R10.3).
- Abortable wizard bootstrap with 3-second per-request and 5-second shared deadlines (R10.2).
- 16 ms render budget and one `fieldsFromRegistry` call per section/render path (R9.2).

These are acceptance requirements, not optional hardening. Add the authoritative documents to the plan, map every binding to a numbered task and falsifier, and make Plan 4 completion an explicit prerequisite rather than silently relying on it.

### 2. Blocker — Step 2 values never have a persistence or safe credential-lifecycle path

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:97-103,123-132,153-163`; `SCOPE-REVISION.md:277-280,319-328`; `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts:643-726`; `custom_components/oig_cloud/config_registry.py:273-296`.

Task 2 creates local wizard state and Task 4 sends that state to `/solar_test`. Task 3 only posts onboarding status/provider. No task saves the Solar field values to `module_config`, a draft store, or a private Solar credential store, and no task reloads them before completion. Therefore a user can enter latitude, geometry, provider, site ID, or a candidate key, close the wizard, and lose the values. The required R7.7/R8.1 remount behavior cannot emerge from this plan.

The security gap is stronger than a missing test. The current registry marks `solar_forecast_api_key` and `solcast_api_key` as secret, while the current module-config path writes ordinary entry options; the tree contains no `oig_cloud.solar_<entry_id>` store. R7.1/R8.7 require private per-entry storage, provider-switch clearing, and teardown. The plan also does not implement R7.12's rule that a replacement key is promoted only after a successful `/solar_test`, with the previous active key preserved on failure.

Define one safe draft/activation flow before implementing the UI: persist non-secret draft fields through the registry, keep candidate secrets in a private per-entry store, run the test against the candidate, and promote only on success. Add a production remount falsifier that seeds both secret sentinels and non-secret values, then proves only the latter return to the UI.

### 3. Blocker — Finish is a sequence of best-effort POSTs, not a defined or atomic operation

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:114-133`; `custom_components/oig_cloud/api/ha_rest_api.py:1443-1522`; `custom_components/oig_cloud/onboarding/state.py:96-127`; `custom_components/oig_cloud/www_v2/src/data/ha-client.ts:227-242`.

The plan asks the REST test to prove a “Finish path” (`docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:118-120`), but the existing backend has no Finish action. `OIGCloudOnboardingView.post()` accepts one `step` and/or one `provider` and calls one `async_save()` per operation (`custom_components/oig_cloud/api/ha_rest_api.py:1501-1522`; `custom_components/oig_cloud/onboarding/state.py:96-127`). The proposed frontend behavior instead loops over remaining steps (`docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:129-132`) without defining a request schema, transaction, lock, retry policy, or partial-failure state.

This creates several concrete failures:

- Two rapid Next/Finish clicks can issue duplicate or out-of-order writes; `goNext` has no in-flight guard.
- A failure after the first step save leaves a partially terminal wizard while the UI closes.
- `fetchOIGAPI()` converts both network failures and non-2xx responses to `null` (`custom_components/oig_cloud/www_v2/src/data/ha-client.ts:227-242`), so the plan's `try/catch` wording does not reliably detect failure.
- A grandfathered user has no banner to rediscover a failed close; the plan provides no explicit retry surface or Settings launch test for this path.
- The tests can call REST POSTs directly and still pass without proving that a rendered Finish click caused them, contrary to R5.4/R6.4.

Prefer a single authenticated `action: "finish"` request carrying the already-saved, user-resolved statuses/provider, backed by an atomic `OnboardingState` transition (or an explicitly locked serial transaction). Disable/reject duplicate Finish while pending, return a classified failure without closing, and test a mutable production UI flow including the grandfathered launch from Settings.

### 4. Blocker — The proposed `/solar_test` implementation target is not a usable candidate-test API

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:185-193`; `custom_components/oig_cloud/services/__init__.py:649-690,968-986`; `custom_components/oig_cloud/entities/solar_forecast_sensor.py:527-639,641-830`.

`handle_update_solar_forecast` is a nested service callback (`custom_components/oig_cloud/services/__init__.py:968-986`), not a reusable module-level forecast function. It iterates live entries and calls an existing sensor's `async_manual_update()` using the already-active config. The helper returns status/entity metadata, not `tomorrow_total_kwh` or `forecast_covers_tomorrow` (`custom_components/oig_cloud/services/__init__.py:649-690`). It cannot test the wizard's unsaved candidate values.

The sensor methods cited as an “equivalent helper” also have incompatible semantics: they read `self._config_entry.options`, mutate/persist sensor forecast state, create their own `aiohttp.ClientSession`, use 30-second timeouts, and log the complete Forecast.Solar URL including the API key (`custom_components/oig_cloud/entities/solar_forecast_sensor.py:624-625`). Routing a candidate test through them would either test stale active settings, temporarily overwrite active configuration, or leak credentials. Solcast has a separate URL/site-ID path and different result mapping (`custom_components/oig_cloud/entities/solar_forecast_sensor.py:750-830`).

Specify and implement a dedicated, typed provider-test service/helper that accepts validated candidate data, uses HA's shared session, returns the exact tomorrow result, has no active-config side effects, and emits only classified/redacted errors. Do not leave “or equivalent helper path” as the implementation decision.

### 5. Major — The Solar request contract is not actionable for the two-string model

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:146-161`; `docs/redesign_2026_07/PLAN-3.6-SPEC.md:43-52`; `SCOPE-REVISION.md:199-202`; `custom_components/oig_cloud/config_registry.py:283-296`.

The plan says “active string geometry keys” but never names them. The spec calls for singular `solar_panel_power_kwp`, `solar_panel_tilt`, and `solar_panel_azimuth`, while the real registry has two conditional sets: `solar_forecast_string1_*` and `solar_forecast_string2_*`. A request with two active strings cannot satisfy the stated exact-key/additional-properties contract without choosing a representation (array, numbered keys, or one request per string). Solcast also consumes site/key and total kWp differently from Forecast.Solar.

This is an OPEN QUESTION FOR HUMAN, not a detail an implementer can safely invent: decide and document the canonical wire schema, including zero/one/two active strings and provider-specific required fields. Then make the frontend and backend tests use that schema verbatim and reject all other shapes.

### 6. Major — Frontend cannot display the planned classified API errors with the existing client

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:143-164,185-192`; `custom_components/oig_cloud/www_v2/src/data/ha-client.ts:160-183,227-242`.

The backend task asks for 400/403/timeout responses and classified error bodies. `fetchWithRetry()` turns every non-OK response into `NetworkError`, retries it, and `fetchOIGAPI()` catches the final error and returns `null`; the response JSON is never available to the wizard. The frontend therefore cannot distinguish `auth`, `provider_unreachable`, `timeout`, or `rate_limited`, and it cannot satisfy the requested human-readable mapping or secret-safe DOM assertion.

Choose one explicit boundary: extend the client with a typed non-2xx result/error path and an `AbortSignal`, or define a safe 200 envelope for provider failures while retaining 4xx/403 for auth/validation. Add tests that inspect the actual response body and prove raw upstream exception, URL, key, and site ID never reach logs, REST, or DOM.

### 7. Major — Pricing is still a second, hard-coded field implementation and the proposed save call does not type-check

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:202-223`; `docs/redesign_2026_07/PLAN-3.6-SPEC.md:106-114`; `SCOPE-REVISION.md:282-286,319-328`; `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/step-pricing.ts:9-16`; `custom_components/oig_cloud/www_v2/src/data/settings-data.ts:91-99`; `custom_components/oig_cloud/api/ha_rest_api.py:1115-1122`.

`STEP_PRICING` is only a descriptor with `id`, `blocksDashboard`, `skippable`, and AI metadata; it has no `fields`/`visibleFields` (`custom_components/oig_cloud/www_v2/src/ui/features/onboarding/step-pricing.ts:9-16`). Task 6 instead hard-codes distributor/tariff/price markup and a literal `confirmed_distribution_*` object. That contradicts the single registry/rendering path required by P5 and R7.8, and it leaves pricing field metadata and remount behavior outside the shared renderer.

There is also a concrete TypeScript/API mismatch: `SettingsSection` is currently `'modules' | 'battery' | 'solar' | 'boiler'` (`custom_components/oig_cloud/www_v2/src/data/settings-data.ts:99`), so `saveModuleConfig("pricing", values)` in the plan does not type-check. The backend module-config GET similarly omits the `pricing` section (`custom_components/oig_cloud/api/ha_rest_api.py:1115-1122`). The plan names neither change.

Extend the typed data contract and backend response deliberately, or expose a pricing-specific save function. Build the tariff-dependent options from `/pricelists` while rendering registry `FieldDef`s, and test two different distributor/tariff selections through save, reload, and DOM—not just a spy call. A no-op save or hard-coded fixture response must fail.

### 8. Major — Shared renderer extraction is under-specified and can break the Settings card

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:62-80`; `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts:301-370,634-727`.

The existing `renderField` is a private method, not a pure function. It closes over `current()`, `pending`, `setPending()`, `renderLabel()`, `entityCatalog`, section state, and the Settings component's shadow-root CSS. Moving only “composition” does not define the required context/callback API. The styles (`.row`, `.lab`, `.row-control`, `.switch`, input rules) are scoped to `oig-settings`; emitted templates in `oig-onboarding-wizard` will be unstyled unless styles are extracted too.

The proposed test checks `.field`/`.field-label` “if present”, but the real renderer uses `.row`/`.lab`; a custom renderer can satisfy the test without proving reuse. There is no Settings-card DOM regression test for secret masking, bool handling, entity fields, save callbacks, or provider conditional visibility.

Extract a real shared field component/presenter with an explicit value/change contract and shared styles, then mount it in both hosts. Add paired Settings and Wizard render tests so either host breaking fails.

### 9. Major — Most acceptance tests are isolated or contract-only, despite R8.2/R5.4

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:86-104,113-121,142-152,203-223,267-281`; `SCOPE-REVISION.md:332-336,194-197`; `docs/redesign_2026_07/VERIFICATION-STANDARD.md:51-87`.

The plan adds isolated wizard fixtures and direct REST tests. The production `oig-app` launch path is only mentioned in a mount assertion and the final manual checklist. That is insufficient for the binding rule that AK-1 through AK-4 must be exercised from the real launch event.

Specific anti-stub holes:

- Task 3 asserts that a POST was called, but not that a real rendered Finish click produced the final state and that the same state is visible after close/reopen.
- Task 4 asserts `wizard-next` remains clickable, but does not click it and assert transition to Pricing; a handler that leaves the button inert passes.
- Task 5 can pass with a hard-coded success object unless the provider adapter invocation and candidate-to-result mapping are asserted.
- Task 6 asserts a save spy call, not a backend round trip/remount.
- Task 7 checks mounted DOM, not dashboard navigation or a user action while the error state is present.

Use a mutable route-intercept/API harness around `oig-app`, launch from banner and Settings, fill/select controls, click Next/Skip/Test/Confirm/Finish, then remount and assert DOM plus request payloads. Keep isolated unit tests for pure predicates, but do not count them as AK-1–AK-4 evidence.

### 10. Major — Bootstrap and registry failure states are not specified

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:97-104`; `SCOPE-REVISION.md:414-420,440-449`; `custom_components/oig_cloud/www_v2/src/data/registry-data.ts:28-34`; `custom_components/oig_cloud/www_v2/src/data/settings-data.ts:100-108`.

“Load once per open” does not implement the required bounded bootstrap. The current loaders accept no `AbortSignal`, and the plan defines no 3-second request deadline, 5-second shared deadline, retry state, or cancellation on close. A never-resolving registry/module-config request can leave the wizard with an empty content area indefinitely.

The plan also has no render tests for null/empty registry, all-hidden fields, or a provider-dependent field set with missing values. `loadFieldRegistry()` returns `null` when `fields` is absent; a renderer that treats that as an empty list recreates the exact empty-screen defect the plan exists to prevent. Add explicit classified retry/schema-invalid states, close/skip usability under stalled requests, and empty/all-hidden/provider cases.

### 11. Major — Soft-guide verification is factually ungrounded and does not test interactivity

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:230-244,251-280`; `custom_components/oig_cloud/www_v2/src/ui/app.ts:975-987,1331-1347,1471-1478`; `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts:313-321,664-727`.

`dashboard-primary` does not exist anywhere in the current frontend. The production app has `<oig-tabs>` and `.tab-content`, but no such `data-testid`; the plan's selector cannot be asserted without an unmentioned app change.

More importantly, the existing wizard is a full-screen fixed `.overlay` with a modal and z-index (`custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts:313-321`). It intercepts clicks and stops propagation inside the modal. “Dashboard mounted behind it” is not the same as “dashboard remains interactive during wizard operation.” The plan only checks DOM presence and absence of a class, so the current blocking overlay can pass while dashboard navigation is unusable.

Either define the intended semantics (a voluntarily opened modal may temporarily occlude the dashboard, while close/skip remain usable) or implement true pass-through/accessible navigation. Add a real click test against tabs/dashboard controls during Step-2 error and a selector that actually exists. Also note that `app.ts` refreshes onboarding on `close` (`:983-987`); it does not listen for `onboarding-changed`, so the plan's claim that that event drives `app.loadOnboarding()` is inaccurate.

### 12. Major — User-facing strings and error localization are absent from the plan, and the current hassfest hazard is visible

**Anchors:** `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md:153-164,185-193`; `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts:567-632`; `custom_components/oig_cloud/translations/cs.json:780`; `custom_components/oig_cloud/translations/en.json:902`; `scripts/run_hassfest.sh:33-37`.

The plan asks for “readable” and “classified” errors but defines no error-code-to-copy map, translation keys, fallback language, or test that secrets/URLs are absent from localized text. New wizard strings are literal Czech/English in the component. The repository already contains direct URLs in HA translation descriptions at `custom_components/oig_cloud/translations/cs.json:780` and `custom_components/oig_cloud/translations/en.json:902`, despite the changelog's claim that wizard text is hassfest-compatible; `scripts/run_hassfest.sh` is the explicit gate.

Add a localization task for wizard labels, stale/missing/retry states, and all classified Solar errors. Keep registration URLs out of HA translation descriptions in the form hassfest accepts, and include the hassfest command in the verification gate. A rendered DOM test must assert the user-facing localized message and absence of credential, site ID, full URL, and raw exception text.

## Task-by-task disposition

- **Task 1:** real target, but renderer API/style boundary and Settings regression coverage are missing.
- **Task 2:** real target, but values are ephemeral; bootstrap deadlines, null/empty registry states, performance, and production launch are missing.
- **Task 3:** substantial redesign needed; no defined Finish API/transaction, no duplicate-write guard, no grandfathered UI proof, and no UI-observable persisted status.
- **Task 4:** endpoint path is named, but wire schema is ambiguous and existing client/error behavior cannot support the claimed result/error UX.
- **Task 5:** substantial redesign needed; the cited service/sensor path cannot test candidates or return the contract result and has timeout/secrecy/rate-limit hazards.
- **Task 6:** real dataset endpoint exists, but the pricing renderer is not registry-driven, the save type is incomplete, and no persistence round trip is tested.
- **Task 7:** scope intent is correct, but the selector is nonexistent and the test does not prove dashboard interactivity.

## Decision pressure-test

### OQ-A — Finish for grandfathered users

The **yes** decision is sound: suppressing the banner must not make the persisted state diverge from what the user explicitly completed. The plan does not actually prove it. Add a production Settings launch with `grandfathered: true`, click Finish, assert the POST/state response, close, reload, and verify terminal state. Do not close silently on a failed Finish; expose retry or leave the wizard open.

### OQ-B — Solar Test failure is non-blocking

The **no** decision is consistent with the authoritative soft-guide rule (`SCOPE-REVISION.md:384-389`). The plan must still define the status semantics: after a failed test, does clicking Next record `done`, record `skipped`, or leave Solar `pending` while allowing navigation? `goNext` currently always advances and the plan says it completes the step before advancing. Marking a failed/untested step `done` can suppress the banner while the required forecast verification never succeeded. This is an OPEN QUESTION FOR HUMAN unless the product contract explicitly chooses one status mapping. Whichever choice is made, test the actual click-to-transition path, not merely button enabled state.

## Cheaper/reuse mechanisms

- Reuse the existing `fieldsFromRegistry()` and `isVisible()` predicates, but extract the Settings field renderer as a shared component with explicit callbacks and shared styles rather than copying template branches.
- Reuse the existing bundled `/pricelists` endpoint and registry metadata; do not add a pricing source fetch. Add dataset-derived options to registry field definitions instead of hard-coding a second pricing form.
- Extract provider request/response logic from the sensor into a side-effect-free candidate-test helper instead of invoking the nested service handler or mutating a live sensor.
- Use one atomic onboarding Finish transition rather than multiple best-effort status POSTs.

## Must-fix before implementation

1. Add `SCOPE-REVISION.md`/`IMPLEMENTATION-BRIEF-EN.md` as binding sources and map R7.1/R7.3/R7.7/R7.8/R8.1/R8.2/R8.9/R9.1/R9.2/R10.2/R10.3 to tasks and falsifiers.
2. Define the Solar candidate schema and safe private draft/activation lifecycle, including remount and provider-switch behavior.
3. Replace the nested live-sensor reuse proposal with a side-effect-free, shared-session, 10-second, rate-limited endpoint design.
4. Define an atomic, UI-driven Finish contract with duplicate-write protection, classified failures, and a grandfathered launch test.
5. Make Pricing registry/type/save contracts explicit and prove save/reload through production DOM.
6. Add production-launch anti-stub tests, real error-to-next transition tests, bounded bootstrap tests, and dashboard interaction tests.
7. Add localization/hassfest coverage and regression tests for the shared Settings renderer.

## Final verdict

**UNSOUND.** The plan is a useful defect inventory, but its current RED/GREEN tasks would permit a superficially green implementation that loses Solar configuration, marks failed onboarding complete, leaks credentials through the existing forecast path, and never proves the user flow on the production mount. Rework the plan at the architecture and acceptance-contract level before dispatching implementation.
