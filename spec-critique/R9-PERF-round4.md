# R9-PERF — Performance / event-loop review (round-4 re-critique)

CRITICAL: 2 | MAJOR: 1 | MINOR: 1

- Review target: binding specification text through `SCOPE-REVISION.md:R9`.
- Prior-finding population: 33 unique findings from `spec-critique/R2-PERF-perf.md`, `spec-critique/R6-PERF-round1.md`, and `spec-critique/R8-PERF-round3.md`.
- Prior-finding result: **20 CLOSED / 12 PARTIALLY-CLOSED / 1 OPEN**.
- Severity rule applied: CRITICAL only where a conforming implementation can block the Home Assistant event loop or leave the UI waiting without a finite bound.

## 1 — Prior-finding verdicts

### R2 findings: F-1.1 through F-5.3

| id | verdict | evidence `file:clause` | basis |
|---|---|---|---|
| F-1.1 / PERF-1 — `load_pricelists()` has no in-process cache | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.11`; `SCOPE-REVISION.md:R9.2` wizard fetch budget | Cache discipline and one browser fetch per open are binding. Cache residency, one-time parse, and a cache-hit assertion remain unspecified. |
| F-1.2 / PERF-2 — pricelist size budget missing | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.2`; `SCOPE-REVISION.md:R9.2` render budget | Coverage floors and deterministic release bytes are binding. No JSON byte ceiling or cold-parse budget exists. |
| F-1.3 / PERF-3 — no event-loop timer test for dataset load | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.11`; `SCOPE-REVISION.md:R9.2` `TER-1` | Repeated-load measurement is required, but `TER-1` covers migration transforms, not synchronous bundled-file read and JSON parse. No loader-specific event-loop test or numeric bound exists. |
| F-1.4 / PERF-4 — build-only requirements path missing | CLOSED | `SCOPE-REVISION.md:R7.5` | Binding paths are `scripts/requirements-build.txt` and `scripts/requirements-build.txt.lock`, with a pinned-hash bootstrap command. |
| F-1.5 / PERF-5 — no CI gate proving `openpyxl` is absent from runtime manifest | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R5.1`; `SCOPE-REVISION.md:R7.5` | Runtime-manifest exclusion is binding and build dependencies are locked. No named CI assertion against `custom_components/oig_cloud/manifest.json` is required. |
| F-2.1 / PERF-6 — `/pricelists` lacks server-side cache contract | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.11`; `SCOPE-REVISION.md:R9.2` wizard fetch budget | Client request count is bounded. The server may still open and parse bundled JSON on every allowed request. |
| F-2.2 / PERF-7 — immutable release data is not tied to cache lifetime | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R4`; `SCOPE-REVISION.md:R6.11` | Bundled, no-runtime-fetch data and generic cache discipline are binding. Cache lifetime and release invalidation remain unbound. |
| F-2.3 / PERF-8 — `/solar_test` has no numeric server timeout | CLOSED | `SCOPE-REVISION.md:R9.2` R6.5 outbound timeout | Shared-session provider work has a server-side `10 s` hard timeout and a sleeping-provider falsifier. |
| F-2.4 / PERF-9 — `/solar_test` may create a new HTTP session per call | CLOSED | `SCOPE-REVISION.md:R9.2` R6.5 outbound timeout | The Home Assistant shared aiohttp session is mandatory. |
| F-2.5 / PERF-10 — repeated clicks have no server throttle | CLOSED | `SCOPE-REVISION.md:R9.2` R6.5/R7.12/R8.9 shared rate limit | Manual and verify-before-replace triggers share a `30 s` token bucket and one in-flight request per bucket. |
| F-2.6 / PERF-11 — `/config_registry` is not ETag-aware | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.11`; `SCOPE-REVISION.md:R9.2` wizard fetch budget | One fetch per open is binding. No ETag, `If-None-Match`, `304`, or equivalent release-version validator is specified. |
| F-2.7 / PERF-12 — redundant `/module_config` cold-open fetches | CLOSED | `SCOPE-REVISION.md:R9.2` R6.11 wizard fetch budget | One open or remount permits at most one GET for each named endpoint; duplicate launch entry points cannot double-fetch. |
| F-3.1 / PERF-13 — pricing remains in the main frontend bundle | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.12`; `SCOPE-REVISION.md:R9.2` R6.12 render budget | Render work and registry calls are bounded. No main-chunk growth ceiling or lazy pricing module is required. |
| F-3.2 / PERF-14 — no lazy chunk boundary for pricing | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.12`; `SCOPE-REVISION.md:R9.2` R6.12 render budget | Runtime rendering is bounded, but download/parse isolation for Step 3 remains unspecified. |
| F-3.3 / PERF-15 — duplicate cold-open call paths | CLOSED | `SCOPE-REVISION.md:R9.2` R6.11 wizard fetch budget | Per-open endpoint counts and duplicate launch-entry behavior now have numeric falsifiers. |
| F-3.4 / PERF-16 — `fieldsFromRegistry()` is rebuilt without a measurable guard | CLOSED | `SCOPE-REVISION.md:R9.2` R6.12 render budget | Step 2/3 render p95 is `<= 16 ms`; the resolver may run at most once per section per render path with stable identity. |
| F-4.1 / PERF-17 — already-complete setup performs repeated Store I/O | CLOSED | `SCOPE-REVISION.md:R9.2` R6.11 already-complete migration budget | The completed path is `<= 50 ms`, performs no full rewrite, and permits no avoidable `Store.async_save()`. First-run migration remains an explicitly distinct slow path. |
| F-4.2 / PERF-18 — transform executability is unspecified | CLOSED | `SCOPE-REVISION.md:R9.2` `TER-1` | A named binding rule now distinguishes sync CPU-only transforms from async/executor-backed transforms. The replacement rule has a new correctness defect, reported as `PERF-NEW-R9-A`; that does not leave the original absence-of-rule finding open. |
| F-4.3 / PERF-19 — idempotent migration repeats writes | CLOSED | `SCOPE-REVISION.md:R9.2` R6.11 already-complete migration budget | Completed-marker reload must avoid a full rewrite and avoid unnecessary Store saves within `50 ms`. |
| F-5.1 / PERF-20 — build requirements file and lock missing | CLOSED | `SCOPE-REVISION.md:R7.5` | Both paths, pinned hashes, and bootstrap behavior are binding. |
| F-5.2 / PERF-21 — no explicit runtime-manifest CI assertion | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R5.1`; `SCOPE-REVISION.md:R7.5` | The exclusion is normative, but no named merge-gate command proves it. |
| F-5.3 / PERF-22 — JSON output has no size ceiling | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.2`; `SCOPE-REVISION.md:R9.2` | Coverage and drift floors are enforceable. Artifact bytes and cold parse remain uncapped. |

### R6 round-1 new findings

| id | verdict | evidence `file:clause` | basis |
|---|---|---|---|
| PERF-NEW-1 — timeout and rate-limit numbers missing | CLOSED | `SCOPE-REVISION.md:R9.2` R6.5/R7.12/R8.9 | `10 s`, one outbound call per named bucket per `30 s`, and one in-flight request per bucket are binding. |
| PERF-NEW-2 — fetch-count and cold-load budgets missing | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R9.2` R6.11 wizard fetch budget | The one-GET-per-endpoint count is closed. The requested numeric cold `load_pricelists()` parse/load bound is still absent. |
| PERF-NEW-3 — render-time and resolver-call budgets missing | CLOSED | `SCOPE-REVISION.md:R9.2` R6.12 render budget | `<= 16 ms` p95 and at most one resolver call per section/render path are binding. |
| PERF-NEW-4 — shared aiohttp session not mandatory | CLOSED | `SCOPE-REVISION.md:R9.2` R6.5 outbound timeout | The Home Assistant shared aiohttp session is mandatory. |
| PERF-NEW-5 — completed migration/setup path is not bounded | CLOSED | `SCOPE-REVISION.md:R9.2` R6.11 already-complete migration budget | The observable target is `<= 50 ms`, no full rewrite, and no avoidable Store save. The spec binds the performance outcome rather than one scheduling primitive. |
| PERF-NEW-6 — pricing lazy import/chunk is unspecified | OPEN | `SCOPE-REVISION.md:R6.12`; `SCOPE-REVISION.md:R9.2` R6.12 render budget | No binding text requires dynamic import, a separate pricing chunk, a main-bundle byte delta, or Step-3 chunk-load latency. |
| PERF-NEW-7 — no quantitative already-complete rewrite guard | CLOSED | `SCOPE-REVISION.md:R9.2` R6.11 already-complete migration budget | The completed path has both a `50 ms` time ceiling and a no-full-rewrite/no-avoidable-save condition. |

### R8 round-3 new findings

| id | verdict | evidence `file:clause` | basis |
|---|---|---|---|
| PERF-NEW-R8-A — manual and replacement verification do not share a rate bucket | CLOSED | `SCOPE-REVISION.md:R9.2` R6.5/R7.12/R8.9 shared rate limit | Both triggers share one bucket; the cross-trigger test requires exactly one upstream call and classified `rate_limited` for the second request. |
| PERF-NEW-R8-B — remount/launch falsifier suite has no CI budget | CLOSED | `SCOPE-REVISION.md:R9.3` PERF-NEW-R8-B | Combined p95 is `<= 30 s`; each remount test is `<= 10 s`, including retry. |
| PERF-NEW-R8-C — credential teardown I/O has no budget | CLOSED | `SCOPE-REVISION.md:R9.3` PERF-NEW-R8-C | Both private stores must be deleted within `<= 200 ms` aggregate averaged across five CI runs. |
| PERF-NEW-R8-D — deterministic clock may leak into a production global | CLOSED | `SCOPE-REVISION.md:R9.3` PERF-NEW-R8-D | Explicit function/test-helper injection, production-symbol grep, and p99 `< 5 us` are binding. |

## 2 — New findings on R8/R9 text

| id | severity | `file:clause` | what is wrong | falsification test | exact spec text that fixes it |
|---|---|---|---|---|---|
| PERF-NEW-R9-A | CRITICAL | `SCOPE-REVISION.md:R9.2` `TER-1`; `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:R9` Transform executability | Branch (b) treats an “awaited coroutine” as an alternative to `hass.async_add_executor_job`. An implementer can write `async def transform(): Path(...).read_text()` or call synchronous crypto/network code, await that coroutine, and satisfy the stated async path plus current fixture while the blocking call still runs on the HA event-loop thread. “Outside the event-loop hot path” is not an executable rule, and the test only rejects blocking I/O unless routed through the “async/executor path.” | Register `async def transform(payload): time.sleep(0.2); return payload` and variants using `Path.read_bytes()`, `requests.get()`, and a synchronous crypto KDF. Await each through the async registry. The clause must fail every variant and HA's blocking-call detector must emit no event-loop warning only after executor routing. | **Replace TER-1 branch (b):** “An async transform MUST call only natively non-blocking async/HA APIs. It MUST NOT call synchronous file, network, subprocess, sleep, crypto, or HA-state APIs on the event-loop thread. Every blocking callable MUST be passed directly to `hass.async_add_executor_job`; wrapping blocking code in `async def` and awaiting it does not satisfy this rule. Tests patch `open`, `Path.read_text/read_bytes`, `requests`, `subprocess`, `time.sleep`, and synchronous crypto entry points and assert execution occurs off the HA event-loop thread.” |
| PERF-NEW-R9-B | CRITICAL | `SCOPE-REVISION.md:R9.2` R6.11 wizard fetch budget; `SCOPE-REVISION.md:R9.3` PERF-NEW-R8-B; `PLAN-3.6-SPEC.md:R9 closeout bindings` | The spec limits request count and component render CPU, but gives no client deadline or open-to-interactive deadline for `/module_config`, `/config_registry`, `/onboarding`, or `/pricelists`. The `<= 10 s` test-wall budget measures successful falsifiers, not a production request that never settles. A conforming implementation can issue one GET per endpoint and leave Step 2/3 on an infinite spinner if one fetch hangs. | Through the production `oig-app` launch path, let each endpoint in turn return a promise that never settles. Advance a monotonic real clock. The wizard must stop waiting at the specified deadline, abort the request, render a classified retry state, keep close/skip/dashboard navigation usable, and leave no pending spinner or request. | **Add to R9.2:** “Wizard bootstrap uses one `AbortController` per open. Each GET to `/module_config`, `/config_registry`, `/onboarding`, and `/pricelists` MUST settle or be aborted within `3 s`; the shared bootstrap deadline is `5 s`. On deadline, abort pending requests, render a classified retry state in the affected step, and keep wizard close, skip, and dashboard navigation usable. Production launch must render the wizard shell within `100 ms` p95 and either interactive fields or the classified retry state within `5 s`. A never-resolving route-intercept test enforces these deadlines.” |
| PERF-NEW-R9-C | MAJOR | `SCOPE-REVISION.md:R9.2` R6.5/R7.12/R8.9 shared rate limit; `PLAN-3.6-SPEC.md:R9 closeout bindings` | `sane-prefix-of-body` is undefined and is part of the token-bucket key. Distinct coordinates, string values, or crafted prefixes can create arbitrarily many buckets. The one-in-flight rule is therefore per attacker-controlled body variant, not a per-entry or integration concurrency cap. Hundreds of distinct bodies can create hundreds of simultaneous `10 s` provider requests while every individual bucket remains conforming. | Send 100 valid but distinct request bodies for one entry/provider in one second, then repeat across both providers. Assert maximum provider concurrency is one per entry/provider, total integration provider concurrency is at most four, excess requests are classified before any shared-session call, and bucket state has bounded cardinality. | **Replace the bucket key rule:** “The provider-consumption and concurrency bucket key is exactly normalized `(entry_id, provider)`; request-body hashes may be used only for response deduplication and MUST NOT create independent rate or concurrency buckets. Permit at most one provider call in flight per `(entry_id, provider)`, at most four provider calls in flight across the integration, and at most one outbound call per `(entry_id, provider)` per `30 s`. Reject excess work as classified `rate_limited` before calling the shared aiohttp session. Bucket state is bounded to active entries and declared providers.” |
| PERF-NEW-R9-D | MINOR | `SCOPE-REVISION.md:R9.3` PERF-NEW-R8-B | “p95 over the last 50 PRs” has no named duration artifact, retention source, percentile algorithm, or merge-gate command. A single fast local run can be presented as closure while no 50-PR p95 is ever computed. This does not slow production directly, but leaves the numeric regression gate non-enforceable. | Remove all historical timing artifacts and run the stated wrapper once. The gate must fail closed or apply an explicit bootstrap rule; it must not report a 50-PR p95 from one sample. Seed 50 durations with the 48th–50th over budget and verify the documented percentile calculation and retry accounting. | **Add to R9.3:** “CI writes one non-retry duration artifact per PR for the combined falsifier suite, retains the latest 50 successful PR artifacts, and computes nearest-rank p95 through `scripts/check_onboarding_perf_history.py`. The merge gate fails when p95 exceeds `30 s`. Until 50 artifacts exist, every observed run MUST be `<= 30 s`. Retry time is added to the same PR duration and never replaces the first-attempt duration.” |

### Required performance-surface coverage

- Blocking I/O on the HA event loop: `TER-1` is numeric but still permits a blocking awaited coroutine; `PERF-NEW-R9-A` is CRITICAL.
- Provider calls: `/solar_test` has a `10 s` hard timeout, shared HA session, cross-trigger `30 s` rate bucket, and classified timeout. Retry after a sleeping-provider timeout is effectively disallowed by the required `10 s` return. Cross-body/global concurrency is not bounded; `PERF-NEW-R9-C` is MAJOR.
- Dataset load: bundled/no-runtime-fetch is binding at `SCOPE-REVISION.md:R4`; coverage and bytes are deterministic at `SCOPE-REVISION.md:R6.2`. Size ceiling, cold parse budget, event-loop routing, and in-process cache remain prior PARTIAL findings F-1.1/F-1.2/F-1.3/F-2.1/F-2.2/F-5.3.
- Config-flow/onboarding latency: Step render is `<= 16 ms` p95 and request count is one GET per endpoint/open at `SCOPE-REVISION.md:R9.2`. Fetch completion and production open-to-interactive deadlines are absent; `PERF-NEW-R9-B` is CRITICAL.
- Polling/refresh: R8/R9 introduces no periodic polling interval. It introduces per-open/remount fetches only, bounded by count at `SCOPE-REVISION.md:R9.2`; no new polling finding is warranted.

## 3 — Bucket routing

| bucket | findings | route |
|---|---|---|
| SPEC | `PERF-NEW-R9-A`, `PERF-NEW-R9-B`, `PERF-NEW-R9-C`, `PERF-NEW-R9-D` | Amend binding text in `SCOPE-REVISION.md:R9.2-R9.3` and mirror it in `docs/redesign_2026_07/PLAN-3.6-SPEC.md:R9 closeout bindings` plus `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:R9`. |
| SHIPPED-CODE | none | No new finding depends on current live implementation. No code repair is requested by this report. |

- Prior findings still PARTIALLY-CLOSED or OPEN are also SPEC findings. None of the 33 prior performance findings is newly routed to `spec-critique/SHIPPED-CODE-DEFECTS.md`.
- Explicit SHIPPED-CODE route for this round: **none**.

## 4 — What could not be established

- Actual `pricelists.json` byte size, cold file-read time, and JSON parse time cannot be established from binding text; `SCOPE-REVISION.md:R6.2` specifies data completeness and deterministic bytes but no size/performance target. Implementation measurement is outside this spec-only slice.
- Actual wizard open-to-interactive latency and browser fetch cancellation behavior cannot be established because `SCOPE-REVISION.md:R9.2` specifies request counts and component CPU only. `PERF-NEW-R9-B` supplies the missing falsifier and deadlines.
- Actual maximum concurrent provider calls cannot be derived from “one in-flight request per bucket” because `sane-prefix-of-body` is undefined at `SCOPE-REVISION.md:R9.2`. `PERF-NEW-R9-C` supplies a finite key and global cap.
- The existence of a 50-PR timing store cannot be established from `SCOPE-REVISION.md:R9.3`; no artifact path or aggregation command is named.
- No build, test suite, live HA check, or current implementation audit was run, as required by the review brief. This report judges only what the binding specification permits.
