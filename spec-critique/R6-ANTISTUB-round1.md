# R6 anti-stub re-critique — CRITICAL: 1 | MAJOR: 1 | MINOR: 0

Scope: updated specifications only. Counts above cover Section 2 new findings. Prior-finding verdicts: 6 CLOSED, 8 PARTIALLY-CLOSED, 8 OPEN.

## 1. Prior-finding verdicts

| id | verdict | evidence |
|---|---|---|
| AS-1 | CLOSED | `SCOPE-REVISION.md:R6.2` makes the checked-in release the byte-equivalent output of `scripts/build_pricelists.py` and gives the empty-distributor replacement as a CI-failing falsifier. |
| AS-2 | CLOSED | `SCOPE-REVISION.md:R6.3` requires Step 3 to use the runtime endpoint and assert populated DOM; `R6.4` and `R6.5` require rendered wizard controls and the Step-2 endpoint flow. |
| AS-3 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.10` now requires English implementation briefs, but names no actual Task-4, Task-6, or Plan-3.6 English brief. The existing implementation specifications remain Czech, so a zero-history implementer still has no self-contained English artifact. |
| AS-4 | OPEN | `SCOPE-REVISION.md:R6.4` proves Step-2/3 completion only; it says nothing about the dashboard. `PLAN-3.6-SPEC.md:AK-5` still says only that the dashboard renders, with no production-DOM assertion. `R6-CLASSIFICATION.md` routes this to R6.4 incorrectly. |
| AS-5 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.6` closes the log-only loophole by requiring visible warning and clickable recovery action, but leaves the actual production surface unnamed. The requirement cannot prove that the affected user surface, rather than another mounted screen, was tested. |
| AS-6 | CLOSED | `SCOPE-REVISION.md:R6.2` requires every tariff and price field and explicitly requires CI to reject the formerly passing empty distributor objects. |
| AS-7 | CLOSED | `SCOPE-REVISION.md:R6.3` requires DOM assertions in Plan 3.6 Step 3; `R6.4` requires actual rendered wizard controls and remount proof. A reader-only test cannot satisfy both. |
| AS-8 | CLOSED | `SCOPE-REVISION.md:R6.2` requires canonical build output to equal the exact release bytes, so a separately generated or hand-written release cannot pass. |
| AS-9 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.2-R6.3` catch missing tariff/unit/value shape and release/runtime divergence, but provide no complete fixture-to-value oracle. A parser that emits every required key with a wrong populated value can still generate the same checked-in bytes. |
| AS-10 | OPEN | `SCOPE-REVISION.md:R6.3` does not name a build requirements/lock file or an install command. The only positive statement remains `SCOPE-REVISION.md:R4`, “own requirements for build”; a clean maintainer environment is not falsifiably specified. |
| AS-11 | OPEN | `SCOPE-REVISION.md:R6.11` adds bounded-I/O requirements but assigns no owner, follow-up plan, or acceptance for the deferred Task-5 warning coverage. The `R6-CLASSIFICATION.md:R6.11` routing does not close that omission. |
| AS-12 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.5` proves rendered-button request/error behavior, but not a backend call to a forecast client. `R5.3` still says “real forecast fetch”, yet no fake-client invocation assertion rejects a fixed success/error handler. |
| AS-13 | OPEN | `SCOPE-REVISION.md:R6.4` persists only `done/skipped`, timestamps, and `/onboarding` state. It does not require Solar values to be saved and reloaded before completion. `R6.7` concerns AI-key lifecycle, not wizard values. |
| AS-14 | OPEN | `SCOPE-REVISION.md:R6.3` exposes price fields and `R6.4` persists step state, but neither defines pricing field keys, save request, or reload assertion. `R6.7` is unrelated AI-key scope. |
| AS-15 | OPEN | `SCOPE-REVISION.md:R6.3` returns `valid_from`/`stale_warning` but does not define snapshot selection. `SCOPE-REVISION.md:R4` says stale only when the latest snapshot is older than a year, while `PLAN-3.6-SPEC.md:AK-3` and `R6.3` require a warning for `year < current year`. |
| AS-16 | PARTIALLY-CLOSED | Same gap as AS-3: `SCOPE-REVISION.md:R6.10` mandates future English restatements but provides neither their paths nor their content. The requirement is not yet an executable A2A artifact. |
| AS-17 | CLOSED | `SCOPE-REVISION.md:R5.1` retains source URL/date/hash metadata; `R6.2` names the release-file path and enforces byte equality; `R6.3` requires the runtime to consume that release schema. |
| AS-18 | OPEN | `SCOPE-REVISION.md:R6.3` names distributor, tariff, confirmed price fields, and units but not the registry keys/types, price object model, save API, or reload semantics. `R6.4` does not add them. |
| AS-19 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.5` names request inputs and classified errors, but specifies no response schema for forecast date, unit, value type, or timezone. A fixed body with a classified error can satisfy the DOM mapping test. |
| AS-20 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.4` lists controls, states, and remount proof, but has no per-step transition matrix: ownership and permitted `next`/`skip`/`finish` transitions remain implicit. |
| AS-21 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.6` says “exact production surface” but does not identify it by route/component/selector. The required wrong input is named, but the required user artifact is not. |
| AS-22 | OPEN | `SCOPE-REVISION.md:R6.10` requires an explicit `brief-lint` CI command/entry path but does not state either. “Run the brief lint command” has no concrete command to execute or falsify. |

No anti-stub finding is routed to `SHIPPED-CODE` in `spec-critique/R6-CLASSIFICATION.md`; all AS-1 through AS-22 remain correctly in the specification loop. The claimed individual R6 closures above are disputed where the cited clause does not cover the prior finding.

## 2. New findings

| id | severity | location | what is wrong | falsification test | exact spec text that would fix it |
|---|---|---|---|---|---|
| R6-AS-NEW-1 | CRITICAL | `docs/redesign_2026_07/PLAN-3.6-SPEC.md:R6 clarifications` | The new clarification binds AK-5 to `R6.6`, but R6.6 covers missing GPS/capacity warning, not dashboard soft-guide behavior. AK-5 therefore still accepts an empty dashboard shell that merely mounts. | Mount the production dashboard with all onboarding steps pending. Replace its content with an empty container that still mounts; the acceptance must fail because the normal dashboard primary content/navigation is absent. Also mount a grandfathered entry and assert no onboarding banner is present. | `AK-5 is bound to a new R6.13: mount the production dashboard route with pending onboarding and assert [data-testid=dashboard-primary] contains the normal primary dashboard content and navigation without an onboarding blocker; mount a grandfathered entry and assert [data-testid=onboarding-banner] is absent. Falsification: an empty dashboard shell or a banner on a grandfathered entry fails.` |
| R6-AS-NEW-2 | MAJOR | `SCOPE-REVISION.md:R6.5` | “Bounded” and “rate-limited” have no numeric window or maximum upstream-call count. A handler that sends 99 upstream requests for 100 rapid clicks is technically finite and can pass an assertion that merely observes no infinite loop. | Trigger 100 rapid clicks with a fake forecast client. The test must fail if more than the specified number of upstream calls are made or if more than one request is in flight. | `For 100 clicks within 10 seconds for one box, the rendered control must permit at most one in-flight forecast request and the endpoint must make at most 3 upstream calls in a rolling 60-second window; excess clicks return classified rate_limited without an upstream call. The fake-client test asserts both limits.` |

## 3. Not established

- No implementation, CI run, or slow test gate executed; the brief forbids it.
- No actual English Task-4, Task-6, or Plan-3.6 implementation brief and no `brief-lint` entry point is identified by the reviewed documents.
- The production dashboard selector/component and the missing-config target surface are not specified, so their intended mount paths cannot be established from the updated text.
