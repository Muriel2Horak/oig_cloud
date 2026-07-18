# R10 anti-stub re-critique — CRITICAL: 0 | MAJOR: 0 | MINOR: 0

Scope: binding R6-R10 text, Plan 3.6 specification, English implementation brief, and all listed anti-stub reports. Counts cover Section 2 only. Prior-item verdicts: 21 CLOSED, 7 PARTIALLY-CLOSED, 2 OPEN.

## 1. Prior-finding verdicts

| id | verdict | evidence (`file:clause`) |
|---|---|---|
| AS-1 | CLOSED | `SCOPE-REVISION.md:R6.2` makes the generated output the sole source for `remote_config/data/pricelists.json`, byte-compares release bytes, and rejects the empty-distributor falsifier. |
| AS-2 | CLOSED | `SCOPE-REVISION.md:R6.3` requires non-empty Step-3 DOM; `SCOPE-REVISION.md:R8.2` requires the real `oig-app` launch path. |
| AS-3 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.10` and `IMPLEMENTATION-BRIEF-EN.md:1-206` provide English rules, but `IMPLEMENTATION-BRIEF-EN.md:116-128` remains grep-oriented rather than a self-contained per-task file list plus executable acceptance command. |
| AS-4 | CLOSED | `SCOPE-REVISION.md:R7.4` and `PLAN-3.6-SPEC.md:AK-5` require primary dashboard DOM, navigation, and the empty-shell falsifier. |
| AS-5 | CLOSED | `SCOPE-REVISION.md:R6.6` requires a visible warning and recovery action; `SCOPE-REVISION.md:R8.3` binds production `oig-app` selectors and rejects mock/settings-only coverage. |
| AS-6 | CLOSED | `SCOPE-REVISION.md:R6.2` requires every required tariff and price field and makes the formerly passing empty objects a CI failure. |
| AS-7 | CLOSED | `SCOPE-REVISION.md:R8.2` requires the banner/settings launch event to mount `<oig-onboarding-wizard>` with reachable Step-2 and Step-3 content. |
| AS-8 | CLOSED | `SCOPE-REVISION.md:R6.2` requires canonical build bytes to equal the checked-in release artifact. |
| AS-9 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R5.1,R6.2` require coverage and selected fixture mappings, but no complete versioned `ERÚ` fixture-to-every-price-field expected-value oracle exists. |
| AS-10 | CLOSED | `SCOPE-REVISION.md:R7.5` names `scripts/requirements-build.txt`, `scripts/requirements-build.txt.lock`, the hash-checked bootstrap command, and a lock-removal falsifier. |
| AS-11 | CLOSED | `SCOPE-REVISION.md:R8.5` names `Task-5 warning coverage`, its owner, follow-up, production surface, and `onboarding-warning-recovery.spec.ts`. |
| AS-12 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R5.3,R6.5,R9.2` require real fetch intent, current form values, timeout, and error UX, but no positive fake-provider assertion proves a successful provider result reaches the user rather than a fixed success response. |
| AS-13 | CLOSED | `SCOPE-REVISION.md:R8.1` requires seeded non-secret Step-2 values to be present after production-launch remount and secret text to be absent. |
| AS-14 | CLOSED | `SCOPE-REVISION.md:R8.1` requires seeded distributor, tariff, and confirmed-price values to remain in rendered Step-3 controls after remount. |
| AS-15 | CLOSED | `SCOPE-REVISION.md:R7.6,R8.6` and `PLAN-3.6-SPEC.md:AK-3` define one injected-clock rule: newest `valid_from <= now`, stale iff its year is before `current_year`. |
| AS-16 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.10` requires English briefs, but `IMPLEMENTATION-BRIEF-EN.md:116-128` does not supply a per-task executable acceptance handoff. |
| AS-17 | CLOSED | `SCOPE-REVISION.md:R5.1,R6.2,R6.3` require source provenance, exact release-artifact binding, and runtime consumption of that artifact. |
| AS-18 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.3,R8.1` require rendered and persisted pricing values, but omit concrete registry keys/types, the complete confirmed-price object, and save/load API schema. |
| AS-19 | PARTIALLY-CLOSED | `PLAN-3.6-SPEC.md:AK-2` and `SCOPE-REVISION.md:R6.5,R9.2` define request keys, failures, timeout, and rate limits, but omit the successful forecast value type, unit, date, and timezone schema. |
| AS-20 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.4,R8.9` require rendered controls and Step-2 failure progression, but omit a complete per-step `next`/`skip`/`finish` transition and ownership matrix. |
| AS-21 | CLOSED | `SCOPE-REVISION.md:R8.2,R8.3` name the production launch and warning-surface selectors and reject isolated/mock coverage. |
| AS-22 | CLOSED | `SCOPE-REVISION.md:R8.4` correctly routes the missing runnable lint entry to `spec-critique/SHIPPED-CODE-DEFECTS.md:AS-22`; this is routing, not a claim that the command exists. |
| R6-AS-NEW-1 | CLOSED | `SCOPE-REVISION.md:R7.4` and `PLAN-3.6-SPEC.md:AK-5` require production dashboard content, navigation, and an empty-shell falsifier. |
| R6-AS-NEW-2 | CLOSED | `SCOPE-REVISION.md:R10.3` requires an exact `(entry_id, provider)` bucket, one in-flight call, one call per 30 seconds, and classified refusal before an upstream call. |
| R7-AS-NEW-1 | CLOSED | `SCOPE-REVISION.md:R8.1` replaces reversed absence checks with positive remount assertions for non-secret values plus secret-absence checks. |
| R7-AS-NEW-2 | CLOSED | `SCOPE-REVISION.md:R8.2` makes production `oig-app` launch mandatory and falsifies static settings links and empty screens. |
| R7-AS-NEW-3 | CLOSED | `SCOPE-REVISION.md:R8.9` requires visible classified failure while `[data-testid="wizard-next"]` and `[data-testid="wizard-skip"]` stay enabled. |
| R8-AS-NEW-1 | OPEN | `spec-critique/R6-CLASSIFICATION.md:26` still classifies AS-22 as `SPEC`; `SCOPE-REVISION.md:R9.3` records this mismatch but leaves the required table correction for a later editable slice. |
| R9-AS-NEW-1 | OPEN | `SCOPE-REVISION.md:R9.1` requires every shipped endpoint to appear in the matrix, but requires no CI test that enumerates registered `/api/oig_cloud/**` routes and compares the exact path/method set; an unlisted handler can therefore evade the prescribed tests. |
| R9-AS-NEW-2 | CLOSED | `SCOPE-REVISION.md:R10.3` explicitly makes `(entry_id, provider)` the rate/concurrency bucket and forbids request-body hashes from creating independent buckets. |

## 2. New findings

No new anti-stub finding. R10.1 supplies an executor-positive requirement and blocking-call falsifier; R10.2 supplies production launch, retry-state, and usable-control assertions for hanging bootstrap requests; R10.3 supplies an exact bounded bucket; R10.4 supplies artifact-backed CI gating. These clauses do not permit an empty, non-rendering, or empty-dataset deliverable to satisfy their stated acceptance.

| id | severity | `file:clause` | what is wrong | falsification test that would catch it | exact spec text that would fix it |
|---|---|---|---|---|---|
| None | — | `SCOPE-REVISION.md:R10.1-R10.4` | No new anti-stub gap found under the CRITICAL anchor. | R10.1-R10.4 already supply their stated falsifiers. | No additional text required. |

## 3. Bucket routing

- SPEC: AS-1 through AS-21; R6-AS-NEW-1; R6-AS-NEW-2; R7-AS-NEW-1 through R7-AS-NEW-3; R8-AS-NEW-1; R9-AS-NEW-1; R9-AS-NEW-2.
- SHIPPED-CODE: AS-22 only, routed at `spec-critique/SHIPPED-CODE-DEFECTS.md:AS-22`.

## 4. What could not establish

- No build, test suite, deployment, or live-UI check ran; this slice reviews binding text only and forbids slow gates.
- No complete versioned `ERÚ` fixture-to-every-price-field oracle, successful `/solar_test` response schema, complete pricing save/load schema, or complete wizard transition matrix appears in the reviewed text.
- R10 requirements are binding text; this review does not establish their implementation in code or CI.
