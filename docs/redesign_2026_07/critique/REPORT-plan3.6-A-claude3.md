# Adversarial review — F1 Plan 3.6 (onboarding wizard completion)

Reviewed: `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md`
Against: `PLAN-3.6-SPEC.md`, `VERIFICATION-STANDARD.md`, `F1-DESIGN.md`, `DECISIONS.md`, `SCOPE-REVISION.md`,
current code in `custom_components/oig_cloud/`.

## Verdict: UNSOUND

The plan's architecture is correct (real symbols, right reuse pattern, right OQ-A/OQ-B reading), but
**Task 5 — the endpoint this whole plan exists to add — instructs the implementer toward code that
violates four already-CLOSED, binding `SCOPE-REVISION.md` clauses (R9.2, R10.2, R10.3, and the
AK-2 contract's own field names), and none of the plan's RED tests would catch it.** That is the exact
failure class `VERIFICATION-STANDARD.md` was written to stop: a task whose stated GREEN + test can pass
while the shipped behavior is wrong. This is not stylistic — it's Task 5's own words ("preserve current
forecast fetch behavior") pointing at code that keeps the wrong session and the wrong timeout.

---

## Must-fix (ranked)

### 1. Task 5 timeout target contradicts the binding spec — plan's own RED test wouldn't catch it
- **Where:** implementation plan Task 5 GREEN, `"protect forecast call path with server timeout `< 30s`"`;
  Task 5 RED, `"slow call path under asyncio.wait_for timeout => classified API error (>30s)"`.
- **Binding text:** `SCOPE-REVISION.md:416` (R9.2, "R6.5 outbound timeout"): *"`/solar_test` provider
  calls MUST use the Home Assistant shared aiohttp session and a server-side hard timeout of `10 s`."*
  This is current — not superseded by R10.1–R10.4 (those touch TER-1, the fetch budget, and the rate-limit
  bucket key, never the 10 s number).
- **Failure mode:** an implementation with e.g. a 25s timeout satisfies Task 5's own RED test ("classified
  error at >30s") and AK-2b's loosely-worded "kratší než 30 s" (PLAN-3.6-SPEC.md:57-59), yet fails
  R9.2's falsifier ("provider stub sleeps longer than 10 s → classified timeout") and would fail
  deployment gate. The plan should cite `10 s` verbatim and the RED test should assert the boundary at
  10s, not 30s.

### 2. Task 5 has zero coverage for the binding rate-limit / concurrency contract
- **Where:** implementation plan Task 5 RED (lines 176-182 of the plan) — lists only 403/400/extra-keys/
  success/timeout. No rate-limit or concurrency test anywhere in the plan's 7 tasks.
- **Binding text:** `PLAN-3.6-SPEC.md:135` (the plan's OWN reference doc, "R9 closeout bindings")
  already states this is in scope: *"`/solar_test` outbound calls are bounded by a shared token/
  concurrency key that is exactly `(entry_id, provider)`: one outbound call per `(entry_id, provider)`
  per `30 s`; one in-flight provider call per `(entry_id, provider)`; and at most four provider calls
  in flight across the integration."* Refined further in `SCOPE-REVISION.md` R9.2 and R10.3 (MAJOR),
  with an explicit falsifier (100 concurrent bodies, one entry/provider → max 1 concurrent, max 4
  integration-wide). `SCOPE-REVISION.md:R12.1` confirms this endpoint is authored BY Plan 3.6 —
  it is not deferred to Plan 4.
- **Impact:** Task 5 as scoped ships a `/solar_test` endpoint with no rate limiting at all. This is
  exactly the "un-verifiable / no test for a MAJOR binding clause" failure the review brief asked to
  hunt for — add a Task 5b (or extend Task 5) with the RED test SCOPE-REVISION already specifies
  verbatim (line 417).

### 3. Task 5's GREEN literally points at the wrong session + wrong timeout
- **Where:** implementation plan Task 5 GREEN: *"route to existing forecast logic in
  `custom_components/oig_cloud/services/__init__.py` (`handle_update_solar_forecast`) or equivalent
  helper path **to preserve current forecast fetch behavior**."*
- **Code:** `custom_components/oig_cloud/entities/solar_forecast_sensor.py:527` opens
  `async with aiohttp.ClientSession() as session:` (its own session, not HA's shared one) with
  `timeout=aiohttp.ClientTimeout(total=30)` at lines 625 and 795.
- **Contradiction:** R9.2 requires "the Home Assistant shared aiohttp session" and a "hard timeout of
  10 s" for `/solar_test` specifically. "Preserve current forecast fetch behavior" is the opposite
  instruction — it tells the implementer to keep the un-shared session and 30s timeout that R9.2 exists
  to replace for this new endpoint. The task needs to say explicitly: new timeout/session wrapper around
  the existing fetch, not reuse of its session/timeout.

### 4. AK-2's contract cites field names that do not exist in the codebase
- **Where:** `PLAN-3.6-SPEC.md:44-51` (AK-2, the binding contract Task 4/5 must implement) — request
  body keys are `provider`, credential/site id, `latitude`, `longitude`, and *"active string values...
  (`solar_panel_power_kwp`, `solar_panel_tilt`, `solar_panel_azimuth`)"*.
- **Verified:** `rg -n "solar_panel_power_kwp|solar_panel_tilt|solar_panel_azimuth" .` → **zero hits**
  anywhere in the repo. The actual registry fields (`config_registry.py:279-296`) are
  `solar_forecast_latitude` / `solar_forecast_longitude` (not bare `latitude`/`longitude`) and
  `solar_forecast_string{1,2}_kwp` / `_declination` / `_azimuth` (not `tilt`). "Declination", not
  "tilt", is the real term used throughout `solar_forecast_sensor.py` and the registry.
- **Impact:** Task 4 RED ("string geometry keys") and Task 5 RED ("string geometry keys") both defer
  to this contract without naming real keys. An implementer who follows AK-2 literally ships a payload
  shape that cannot be built from the actual registry/config data — this is the "cites a symbol that
  does not exist" failure mode the review brief named directly. Fix AK-2 to name the real fields (and
  decide once, in the plan, whether the wire body renames them to `latitude`/`longitude`/`declination`
  or keeps the registry names — right now nothing decides this).

---

## Should-fix

### 5. R10.2 (CRITICAL) wizard-fetch/abort-deadline requirement has no task at all
`SCOPE-REVISION.md:R10.2` (PERF-NEW-R9-B, CRITICAL, current — not superseded) requires one
`AbortController` per wizard open, each of `/module_config`, `/config_registry`, `/onboarding`,
`/pricelists` to settle or abort within 3s, a 5s shared bootstrap deadline, a classified retry state on
timeout, and close/skip/dashboard to stay usable while a fetch hangs. Task 2's GREEN only says "Ensure
registry load is per-open and does not run continuously on every render" — prose, not a task, and no RED
test anywhere in the plan exercises a never-resolving fetch. Given this is graded CRITICAL in the source
doc, its total absence from a 7-task "TDD bite-sized" plan is a real gap, not a rounding error.

### 6. R9.2 "R6.11 wizard fetch budget" (≤1 GET per endpoint per open, no duplicate fetches) — untested
Same root cause as #5: `SCOPE-REVISION.md:445` requires route-intercepting the production launch path
and asserting `<=1` GET per endpoint per open, including from duplicate launch entry points. No task
tests this. Task 2's "load registry once and does not run continuously" is the closest prose gets, but
it isn't a render-path dedup guarantee and there's no assertion of it anywhere.

### 7. R9.2 "R6.12 render budget" (≤16ms p95, `fieldsFromRegistry` called ≤1×/section/render, stable
field identity) — untested. No task budgets or asserts render performance or call-count stability for
the new registry-driven Step 2/3 render path this plan introduces.

### 8. OQ-A (grandfathered Finish) has no grandfathered-specific test
The plan's own header pins `OQ-A = YES`: *"'Finish' must persist on completion even if the user is
`grandfathered` and never saw the banner."* Task 3 RED only lists *"Finish path persists provider +
timestamps + terminal step statuses for all remaining steps"* — a general finish test that can pass
without ever setting `grandfathered=true` on the seeded entry. `state.py`'s `is_grandfathered()` is
derived from `entry.options` at `state.py:41-58`; add a RED test that seeds those options, drives
Finish, and asserts the state store still transitions to done/skipped despite `grandfathered=true`. This
is the one behavior the plan explicitly calls out as a fixed design constraint, and it's the one without
a named test.

### 9. Task 5 misses the R7.3 secrecy-classification falsifier
`SCOPE-REVISION.md:253-258` (R7.3, closed but still binding) requires that failing `/solar_test`
responses/logs/diagnostics never leak the raw key, key prefix, provider URL, or raw exception text — with
a named falsifier seeding `fs_secret_123456789` / `sc_secret_123456789`. Task 5 RED has no such assertion
(its "success"/"400"/"403"/"timeout" tests never inject a secret and check for its absence in the error
path). Worth a line in Task 5's RED list before this ships.

---

## Minor

### 10. Task 1 undersells the `renderField` extraction
`renderField` (`settings/index.ts:643`) and `renderFieldDisableable` (`:754`) are **private instance
methods** reading `this.current()`, `this.pending`, `this.setPending`, `this.entityCatalog` directly —
not free functions. Task 1's "move the current renderField/renderFieldDisableable logic" is directionally
right (both are real, both close over the same field-rendering logic) but doesn't name the signature
change actually required: `value`, `dirty`, `onChange`, `entityCatalog`, `secretSet` all need to become
explicit parameters. Actionable, but a task author following it literally could produce a "shared module"
that still secretly imports component state — worth one more sentence pinning the parameter list.

### 11. `visibleFields()` edge cases untested
Task 2 tests the provider-switch case (forecast_solar ↔ solcast) but not: registry returns zero solar
fields, or every solar field's `isVisible()` predicate is false (e.g. neither string enabled). Both are
reachable states (`isVisible`, `registry-data.ts:64-67`) and the empty-DOM failure mode is precisely what
`VERIFICATION-STANDARD.md` exists to prevent — worth one negative test.

---

## Checked and NOT a defect (documented here so it isn't re-litigated)

- **OQ-B soft-gate vs `DECISIONS.md` P3.** `DECISIONS.md:72-75` (P3, APPROVED) reads as a hard gate
  ("bez úspěchu nejde pokračovat"). This looks like a contradiction with Plan 3.6's `OQ-B = NO` at first
  read, but it is NOT: `F1-STATUS-MAP.md:37` explicitly records P3 as superseded — *"Ano, #6 z něj dělá
  neblokující soft-guide test"* — and `SCOPE-REVISION.md` R8.9/R6.5 falsifiers (`:389`, `:416-417`)
  both require the non-blocking behavior. Plan 3.6's OQ-B reading is correctly grounded; no fix needed.

- **Scope leak.** No Plan 4 items (dead-key cleanup, migration, GPS admin-gate, OQ-5) appear anywhere in
  the 7 tasks. The pricing editor is untouched — Task 6 only adds a confirm action that calls the existing
  `saveModuleConfig("pricing", …)`, consistent with "the wizard only sets a tariff."

- **Cheaper mechanism / no reinvention.** Task 1 correctly proposes reusing the Settings field renderer
  rather than a second implementation; Task 6 correctly reuses `/pricelists` + `saveModuleConfig` rather
  than adding a new save path. Registry/visibility symbols (`STEP_SOLAR`, `fieldsFromRegistry`,
  `isVisible`) are real and match the plan's description.

- **Grounding symbols.** Spot-checked: `WIZARD_STEPS`, `STEP_SKIPPABLE`, `goNext`, `skip`, `close`,
  `renderStepContent`, `loadOnboardingState`, `skipOnboardingStep`, `completeOnboardingStep` (missing:
  `goNext` currently does NOT call `completeOnboardingStep` — confirms Task 3 is needed, not already
  done), `STEP_SOLAR`/`fields`/`visibleFields`, `OIGCloudOnboardingView`, `OnboardingState.async_complete_step`
  / `async_skip_step`, `confirmed_distribution_*` fields — all exist as cited.

- **i18n note (context, not a Plan-3.6 defect).** `strings.json:549`, `translations/en.json:902`,
  `translations/cs.json:780` already contain raw provider URLs inside translation strings — exactly the
  hassfest URL-in-translations class of defect. This predates Plan 3.6 (step-ai.ts, not touched by this
  plan) and isn't in its scope, but flagging since the plan is silent on i18n entirely while working in
  the adjacent onboarding surface — worth a follow-up ticket, not a Plan 3.6 blocker.

---

## Ranked top 3 (for the report line)

1. Task 5 as written would ship a `/solar_test` that keeps the un-shared session + 30s timeout the spec
   exists to replace, with no rate-limit/concurrency coverage — 3 binding CRITICAL/MAJOR clauses
   (R9.2, R10.2/R10.3) with zero test coverage in the plan.
2. AK-2's contract names fields (`solar_panel_power_kwp`, `solar_panel_tilt`, `solar_panel_azimuth`)
   that don't exist anywhere in the repo; real names are `solar_forecast_string{1,2}_kwp/declination/azimuth`.
3. OQ-A (grandfathered Finish) is a named design constraint with no test that actually seeds a
   grandfathered entry.
