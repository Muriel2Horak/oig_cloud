# R7 anti-stub re-critique — CRITICAL: 2 | MAJOR: 1 | MINOR: 0

Scope: updated specification documents only. Counts cover Section 2 new findings. No slow
build, test, or deployment check was run.

## 1. Prior-finding verdicts

| id | verdict | evidence (`file:clause`) |
|---|---|---|
| AS-1 | CLOSED | `SCOPE-REVISION.md:R6.2` makes `scripts/build_pricelists.py` the only source and requires byte equality with the released JSON. |
| AS-2 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.3-R6.5` requires populated Step-3 DOM and rendered Step-2 controls, but does not require either assertion through a named production wizard route/mount. |
| AS-3 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.10`; `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:§1-§4` now provide an English restatement, but no per-Task-4/Task-6/Plan-3.6 executable handoff with exact files and acceptance commands is named. |
| AS-4 | CLOSED | `SCOPE-REVISION.md:R7.4`; `docs/redesign_2026_07/PLAN-3.6-SPEC.md:AK-5` require the production dashboard route, primary DOM, navigation, and no onboarding blocker. |
| AS-5 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.6` closes the log-only loophole with a visible warning and clickable recovery action, but names neither the affected production route/component nor its selector. |
| AS-6 | CLOSED | `SCOPE-REVISION.md:R6.2` requires every tariff and price field and explicitly rejects the formerly passing empty-distributor payload. |
| AS-7 | OPEN | `SCOPE-REVISION.md:R6.3-R6.4`; `docs/redesign_2026_07/PLAN-3.6-SPEC.md:AK-1-AK-4` require rendered controls but never a production wizard mount path. An isolated or test-only wizard can satisfy all stated Step-2/3 assertions while the shipped launch flow remains empty. |
| AS-8 | CLOSED | `SCOPE-REVISION.md:R6.2` requires canonical script output to equal the exact checked-in release bytes. |
| AS-9 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R5.1,R6.2-R6.3` catches missing fields, units, and release divergence, but names no complete versioned fixture-to-value oracle. A fully populated parser with wrong price values can still reproduce the checked-in bytes. |
| AS-10 | CLOSED | `SCOPE-REVISION.md:R7.5` names `scripts/requirements-build.txt`, `scripts/requirements-build.txt.lock`, the hash policy, and bootstrap command. |
| AS-11 | OPEN | `SCOPE-REVISION.md:R7.9` requires a named task, owner, follow-up plan, and acceptance test, but supplies none. `rg -n -i 'warning coverage|Task-5 warning|follow-up plan|owner.*warning' . -g '*.md'` finds no other assignment. |
| AS-12 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.5` proves rendered request/error behavior, timeout, and rate limiting, but has no fake-forecast-client assertion that a successful handler actually invokes the provider rather than returning fixed data. |
| AS-13 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R7.7` positively requires save/reload, but its falsifier says to assert the saved latitude and credential are absent after remount; Section 2 records the resulting anti-stub test-polarity defect. |
| AS-14 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R7.8` positively requires save/reload, but its falsifier says to assert the selected distributor/tariff and price are missing after remount; Section 2 records the resulting anti-stub test-polarity defect. |
| AS-15 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R7.6`; `docs/redesign_2026_07/PLAN-3.6-SPEC.md:AK-3` state the intended rule, but `SCOPE-REVISION.md:R4` still says stale only when the newest snapshot is older than one year. R7.6 does not explicitly supersede that earlier rule or define clock/timezone injection. |
| AS-16 | PARTIALLY-CLOSED | Same evidence and missing per-task executable handoff as AS-3: `SCOPE-REVISION.md:R6.10`; `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:§1-§4`. |
| AS-17 | CLOSED | `SCOPE-REVISION.md:R5.1` requires source URL/date/hash metadata; `R6.2` names and byte-checks the release path; `R6.3` binds runtime consumption. |
| AS-18 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.3,R7.8` establishes runtime fields and persistence, but still omits concrete registry keys/types, price-object model, and save/load API contract for zero-history implementation. |
| AS-19 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.5`; `docs/redesign_2026_07/PLAN-3.6-SPEC.md:AK-2` define request keys and classified errors but no successful response schema for value type, unit, forecast date, and timezone. |
| AS-20 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.4` names controls and remount outcome, but has no per-step action/transition matrix defining allowed `next`, `skip`, and `finish` ownership. |
| AS-21 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.6` says “exact production surface” but does not identify a route/component/selector, so a test cannot prove it mounted the affected surface. |
| AS-22 | OPEN | `SCOPE-REVISION.md:R6.10` demands an explicit runnable CI `brief-lint`, but `find . -maxdepth 4 -type f -iname '*brief*lint*'` found no entry point and the clause supplies no command/path. |

All AS findings remain correctly routed to SPEC in
`spec-critique/R6-CLASSIFICATION.md`; none is a SHIPPED-CODE finding.

## 2. New findings

| id | severity | `file:clause` | what is wrong | falsification test that would catch it | exact spec text that would fix it |
|---|---|---|---|---|---|
| R7-AS-NEW-1 | CRITICAL | `SCOPE-REVISION.md:R7.7-R7.8` | Both newly added falsifiers have reversed polarity: they instruct the test to assert values are absent/missing after remount, although the binding requirement says they must persist. A missing-state implementation can therefore satisfy the stated falsifier. R7.7 also must not require secret bytes to reappear in DOM. | Save solar latitude plus a credential, and pricing distributor/tariff plus one price; close and remount through the production flow. The test fails if latitude, `credential_set`, distributor, tariff, or price is missing, and fails if raw credential text appears in DOM or `entry.options`. | `Falsifier: save Step-2 latitude and credential, close, and remount through the production wizard; assert latitude and a non-secret credential_set indicator remain present. The test fails if either is missing or raw credential text appears in DOM or entry.options. Save Step-3 distributor, tariff, and one confirmed price, close, and remount; assert all remain present. The test fails if any is missing.` |
| R7-AS-NEW-2 | CRITICAL | `SCOPE-REVISION.md:R6.3-R6.5`; `docs/redesign_2026_07/PLAN-3.6-SPEC.md:AK-1-AK-4`; `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:§2` | R7 adds a production-route assertion only for the dashboard. Steps 2 and 3 still need only a rendered “real wizard”; no route, launch action, or production mount is named. A test-only wizard containing the fields can pass while the actual app launch path never mounts it—the original empty-screen failure. | Mount the real `oig-app` onboarding launch path, trigger the same user action that launches onboarding, navigate to Steps 2 and 3, and assert their DOM controls and actions. Replace the production launch handler with the old settings-link/empty screen; the route-level test must fail. | `For AK-1 through AK-4, mount the production onboarding launch path in oig-app, invoke the user-visible launch action, and navigate by wizard controls. Assert Step-2 and Step-3 controls in that mounted DOM. An isolated oig-onboarding-wizard fixture or a direct step property does not satisfy these criteria. Falsifier: replace the production launch handler with an empty/settings-link screen; the route-level DOM test fails.` |
| R7-AS-NEW-3 | MAJOR | `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:R6.5` | The English handoff calls `/solar_test` “step 3 validation” and leaves “next-step blocking/unblocking rules” unspecified. `PLAN-3.6-SPEC.md:AK-2` places the control in Step 2 and says a failure must not block the soft guide. A zero-history implementer receives contradictory flow behavior. | Trigger a classified `/solar_test` failure in Step 2, then click Next. The test fails unless the visible classified error remains and Step 3 is reachable without a successful forecast. | `R6.5 — Step-2 solar-test contract: [Otestovat] belongs to Step 2. On classified failure, render the user-visible error and keep Next/Skip available; failure must not block navigation in the soft guide. Assert this behavior from the production onboarding mount.` |

## 3. Not established

- No implementation, CI run, slow test gate, or deployment check was run; the brief forbids it.
- The intended Task-5 warning owner, follow-up plan, acceptance-test name, and target production surface cannot be established because the updated documents provide no names.
- No complete versioned ERÚ fixture-to-canonical-price oracle, wizard production-mount path, or runnable `brief-lint` entry point is specified.
