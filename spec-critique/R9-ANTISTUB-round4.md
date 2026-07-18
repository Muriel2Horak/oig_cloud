# R9 anti-stub re-critique — CRITICAL: 0 | MAJOR: 2 | MINOR: 0

Scope: binding R6-R9 text, Plan 3.6 specification, implementation brief, and prior anti-stub reports. Counts cover Section 2 only. Prior-item verdicts: 20 CLOSED, 7 PARTIALLY-CLOSED, 1 OPEN.

## 1. Prior-finding verdicts

| id | verdict | evidence (`file:clause`) |
|---|---|---|
| AS-1 | CLOSED | `SCOPE-REVISION.md:R6.2` makes `scripts/build_pricelists.py` the sole source for `remote_config/data/pricelists.json`, byte-compares the release artifact, and explicitly rejects the empty-distributor payload. |
| AS-2 | CLOSED | `SCOPE-REVISION.md:R6.3`; `SCOPE-REVISION.md:R8.2` require populated Step-3 DOM through the production `oig-app` launch path. |
| AS-3 | PARTIALLY-CLOSED | `IMPLEMENTATION-BRIEF-EN.md:1-206` is an English restatement, but its Plan-4 and Plan-3.6 handoff at `:116-128` is grep-oriented and does not give each task a self-contained file list plus executable acceptance command. |
| AS-4 | CLOSED | `SCOPE-REVISION.md:R7.4`; `PLAN-3.6-SPEC.md:AK-5` require production-dashboard primary DOM and navigation, preserve it for pending onboarding, and reject an empty shell. |
| AS-5 | CLOSED | `SCOPE-REVISION.md:R6.6`; `SCOPE-REVISION.md:R8.3` require a warning and clickable recovery action on the named production `oig-app` surface, rejecting mock/settings-only coverage. |
| AS-6 | CLOSED | `SCOPE-REVISION.md:R6.2` requires every distributor, tariff, and price field and makes the formerly passing empty objects a CI failure. |
| AS-7 | CLOSED | `SCOPE-REVISION.md:R8.2` requires the real banner/settings launch event to mount `<oig-onboarding-wizard>` with reachable navigation and content. |
| AS-8 | CLOSED | `SCOPE-REVISION.md:R6.2` makes checked-in release bytes equal the canonical build output. |
| AS-9 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R5.1,R6.2` require coverage and selected cell mappings, but no versioned fixture-to-every-price-field expected-value oracle exists; fully populated, consistently wrong generated and released values remain possible. |
| AS-10 | CLOSED | `SCOPE-REVISION.md:R7.5` names `scripts/requirements-build.txt`, `scripts/requirements-build.txt.lock`, the hash-checked bootstrap command, and a missing-lock falsifier. |
| AS-11 | CLOSED | `SCOPE-REVISION.md:R8.5` names the owner, `Task-5 warning coverage`, follow-up, production surface, and `onboarding-warning-recovery.spec.ts`. |
| AS-12 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R5.3,R9.2` require a real provider path and timeout stub, but no positive fake-provider assertion proves that a successful provider result, rather than a fixed success response, becomes the user-visible forecast. |
| AS-13 | CLOSED | `SCOPE-REVISION.md:R8.1` requires seeded non-secret Step-2 fields after production-launch remount and rejects raw-secret prefill. |
| AS-14 | CLOSED | `SCOPE-REVISION.md:R8.1` requires seeded distributor, tariff, and confirmed prices to remain present in rendered Step-3 controls after remount. |
| AS-15 | CLOSED | `SCOPE-REVISION.md:R7.6,R8.6`; `PLAN-3.6-SPEC.md:AK-3` define one injected-clock rule: newest `valid_from <= now`, stale iff its year is before the current year. |
| AS-16 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.10`; `IMPLEMENTATION-BRIEF-EN.md:116-128` provide English rules but not a self-contained per-task executable handoff. |
| AS-17 | CLOSED | `SCOPE-REVISION.md:R5.1,R6.2,R6.3` require source provenance, exact release-artifact binding, and runtime consumption of that release schema. |
| AS-18 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.3,R8.1` require rendered and persisted pricing outputs, but omit concrete registry keys/types, the complete confirmed-price object, and save/load API schema. |
| AS-19 | PARTIALLY-CLOSED | `PLAN-3.6-SPEC.md:AK-2`; `SCOPE-REVISION.md:R6.5,R9.2` define request keys, classified errors, timeout, and rate limit but no successful forecast response schema for value type, unit, date, and timezone. |
| AS-20 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.4,R8.9` require controls and Step-2 failure progression, but do not define a complete per-step `next`/`skip`/`finish` transition and ownership matrix. |
| AS-21 | CLOSED | `SCOPE-REVISION.md:R8.2,R8.3` name the production launch and warning surface selectors and reject isolated/mock coverage. |
| AS-22 | CLOSED | `SCOPE-REVISION.md:R8.4` correctly routes the absent runnable lint entry to `spec-critique/SHIPPED-CODE-DEFECTS.md:AS-22`; closure is routing, not a claim that the command now exists. |
| R6-AS-NEW-1 | CLOSED | `SCOPE-REVISION.md:R7.4`; `PLAN-3.6-SPEC.md:AK-5` require production dashboard primary content, navigation, and an empty-shell falsifier. |
| R6-AS-NEW-2 | CLOSED | `SCOPE-REVISION.md:R9.2` supplies a 10-second timeout, one in-flight request, and `<= 1` outbound call per specified bucket per 30 seconds with a repeated-trigger falsifier. |
| R7-AS-NEW-1 | CLOSED | `SCOPE-REVISION.md:R8.1` replaces the reversed remount assertions with positive non-secret values present and secret values absent. |
| R7-AS-NEW-2 | CLOSED | `SCOPE-REVISION.md:R8.2` makes the real `oig-app` launch mandatory and rejects static settings links and empty screens. |
| R7-AS-NEW-3 | CLOSED | `SCOPE-REVISION.md:R8.9` keeps visible classified failure while `[data-testid="wizard-next"]` and `[data-testid="wizard-skip"]` remain enabled. |
| R8-AS-NEW-1 | OPEN | `spec-critique/R6-CLASSIFICATION.md:26` still labels AS-22 `SPEC`; `SCOPE-REVISION.md:R9.3` records the mismatch as rejected for this file-scope, not corrected or routed as a current-table fix. |

## 2. New findings

| id | severity | `file:clause` | what is wrong | falsification test that would catch it | exact spec text that would fix it |
|---|---|---|---|---|---|
| R9-AS-NEW-1 | MAJOR | `SCOPE-REVISION.md:R9.1` | The claimed closed auth matrix requires every shipped route to appear, but specifies tests only for routes already in the table. An unlisted `/api/oig_cloud/**` handler can ship while every prescribed matrix test passes. | Register a valid extra `/api/oig_cloud/{box}/unlisted` route, omit it from the table, and run all R9.1 route tests; they pass because none discovers registered routes or compares the set to the matrix. | `The auth-matrix CI test MUST enumerate every registered /api/oig_cloud/** route and compare the normalized (path, allowed-methods) set for exact equality with the R9.1 matrix. Any unlisted route, omitted method, or table-only route fails before handler-specific tests run.` |
| R9-AS-NEW-2 | MAJOR | `SCOPE-REVISION.md:R9.2` | `sane-prefix-of-body` is undefined. Changing valid latitude, active-string values, site ID, or credential can create a different bucket, so repeated requests can make unlimited upstream calls while each individual bucket obeys the stated limit. | Send ten valid `/solar_test` requests for one entry/provider inside 30 seconds, changing one accepted body value each time. Current wording permits ten upstream calls. | `The /solar_test rate-limit bucket key MUST be exactly (entry_id, provider), independent of all request-body values, and it MUST retain no raw body or prefix. Ten requests that change any accepted field within 30 seconds issue at most one outbound call; every excess request returns classified rate_limited without an upstream call.` |

## 3. Bucket routing

- SPEC: AS-1 through AS-21; R6-AS-NEW-1; R6-AS-NEW-2; R7-AS-NEW-1 through R7-AS-NEW-3; R8-AS-NEW-1; R9-AS-NEW-1; R9-AS-NEW-2.
- SHIPPED-CODE: AS-22 only, correctly routed at `spec-critique/SHIPPED-CODE-DEFECTS.md:AS-22`.

## 4. What could not establish

- No build, test suite, deployment, or live-UI check was run; this slice reviews binding text only and forbids slow gates.
- No complete versioned `ERÚ` fixture-to-every-price-field oracle, successful `/solar_test` response schema, or complete wizard action-transition matrix is present in the reviewed text.
- The runnable `brief-lint` entry remains a routed shipped-code item; this report does not claim it is implemented.
