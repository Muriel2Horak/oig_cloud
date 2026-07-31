# R10-PERF — Performance / event-loop review (round-5 re-critique, FINAL)

CRITICAL: 0 | MAJOR: 0 | MINOR: 1

- Review target: binding specification text through `SCOPE-REVISION.md:R10` (round-5 perf closeout).
- Prior-finding population: 37 findings across `spec-critique/R2-PERF-perf.md` (22 F-x.y / PERF-1..22), `spec-critique/R6-PERF-round1.md` (7 PERF-NEW-1..7), `spec-critique/R8-PERF-round3.md` (4 PERF-NEW-R8-A..D), `spec-critique/R9-PERF-round4.md` (4 PERF-NEW-R9-A..D).
- Prior-finding result: **25 CLOSED / 12 PARTIALLY-CLOSED / 1 OPEN** out of 37.
- Severity rule applied: CRITICAL only where a conforming implementation can block the Home Assistant event loop or leave the UI waiting without a finite bound.
- Loop disposition: this is the FINAL round; the perf lens produces 0 CRITICAL.

---

## 1 — Prior-finding verdicts

Counts: **25 CLOSED / 12 PARTIALLY-CLOSED / 1 OPEN**.

### R2 findings (22)

| id | round-4 verdict | round-5 verdict | evidence `file:clause` | what is still missing (if any) |
|---|---|---|---|---|
| F-1.1 / PERF-1 — `load_pricelists()` no in-process cache | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | `SCOPE-REVISION.md:R6.11`; `SCOPE-REVISION.md:R9.2` wizard fetch budget | One GET per open is binding; in-process cache residency and a cache-hit assertion remain unspecified. R10 does not add a cache contract. |
| F-1.2 / PERF-2 — pricelist size budget missing | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | `SCOPE-REVISION.md:R6.2`; `SCOPE-REVISION.md:R9.2` render budget | Coverage floor + deterministic release bytes are binding. No JSON byte ceiling, no per-DSO byte budget, no cold-parse ms cap. |
| F-1.3 / PERF-3 — no event-loop timer test for dataset load | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | `SCOPE-REVISION.md:R6.11`; `SCOPE-REVISION.md:R9.2` `TER-1` (now superseded by `R10.1`) | `TER-1` covers migration transforms (now airtight at `R10.1`); the original F-1.3 was about `load_pricelists()` / `load_ai_models()` cold-parse ms on the event loop, which is still unbound. |
| F-1.4 / PERF-4 — build-only requirements path | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R7.5` | — |
| F-1.5 / PERF-5 — openpyxl CI gate against runtime manifest | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | `SCOPE-REVISION.md:R5.1`; `SCOPE-REVISION.md:R7.5` | Exclusion is normative + hash-locked; no named CI merge-gate command that proves `custom_components/oig_cloud/manifest.json` excludes `openpyxl`. |
| F-2.1 / PERF-6 — `/pricelists` server-side cache contract | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | `SCOPE-REVISION.md:R6.11`; `SCOPE-REVISION.md:R9.2` wizard fetch budget | One browser fetch per open is binding; the server may still open + parse bundled JSON on every allowed request. No `lru_cache`/ETag wire-format. |
| F-2.2 / PERF-7 — immutable release data not tied to cache lifetime | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | `SCOPE-REVISION.md:R4`; `SCOPE-REVISION.md:R6.11` | Bundled + no-runtime-fetch is binding; cache lifetime and release invalidation are unbound. |
| F-2.3 / PERF-8 — `/solar_test` numeric server timeout | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.5 outbound timeout | — |
| F-2.4 / PERF-9 — session reuse not specified | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.5 outbound timeout | — |
| F-2.5 / PERF-10 — repeated-click server throttle | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.5/R7.12/R8.9 shared rate limit | — |
| F-2.6 / PERF-11 — `/config_registry` not ETag-aware | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | `SCOPE-REVISION.md:R6.11`; `SCOPE-REVISION.md:R9.2` wizard fetch budget | One fetch per open is binding; ETag/304 wire-format contract still unbound. |
| F-2.7 / PERF-12 — redundant `/module_config` cold-open fetches | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.11 wizard fetch budget | — |
| F-3.1 / PERF-13 — pricing in main bundle | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | `SCOPE-REVISION.md:R6.12`; `SCOPE-REVISION.md:R9.2` R6.12 render budget | Render work + registry calls are bounded; no main-chunk growth ceiling or lazy pricing module is required. R10 does not add a chunk-boundary clause. |
| F-3.2 / PERF-14 — no lazy chunk boundary for pricing | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | same as F-3.1 | same gap. |
| F-3.3 / PERF-15 — duplicate cold-open call paths | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.11 wizard fetch budget | — |
| F-3.4 / PERF-16 — `fieldsFromRegistry()` rebuilds per render | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.12 render budget | — |
| F-4.1 / PERF-17 — sync Store writes during setup | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.11 already-complete migration budget | — |
| F-4.2 / PERF-18 — transform executability unspecified | CLOSED (defect in PERF-NEW-R9-A) | **CLOSED** | `SCOPE-REVISION.md:R9.2` `TER-1` (now superseded by `R10.1` at `SCOPE-REVISION.md:434-438`) | The original absence-of-rule finding is closed; the awaited-coroutine bypass in TER-1 branch (b) is the defect that `R10.1` now closes. |
| F-4.3 / PERF-19 — idempotent migration repeats writes | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.11 already-complete migration budget | — |
| F-5.1 / PERF-20 — build req file + lock missing | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R7.5` | — |
| F-5.2 / PERF-21 — no explicit runtime-manifest CI assertion | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | `SCOPE-REVISION.md:R5.1`; `SCOPE-REVISION.md:R7.5` | Exclusion normative; no named CI command in the merge gate. |
| F-5.3 / PERF-22 — JSON artifact size ceiling | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | `SCOPE-REVISION.md:R6.2`; `SCOPE-REVISION.md:R9.2` | Coverage + drift floors are enforceable; artifact bytes + cold parse remain uncapped. |

### R6 round-1 new findings (7)

| id | round-4 verdict | round-5 verdict | evidence `file:clause` | what is still missing (if any) |
|---|---|---|---|---|
| PERF-NEW-1 — timeout + rate-limit numbers missing | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.5/R7.12/R8.9 (now superseded for bucket scope by `R10.3` at `SCOPE-REVISION.md:446-450`); explicit `10 s` + `30 s` + `1 in-flight` retained. | — |
| PERF-NEW-2 — fetch-count + cold-load budgets missing | PARTIALLY-CLOSED | **PARTIALLY-CLOSED** | `SCOPE-REVISION.md:R9.2` R6.11 wizard fetch budget; `SCOPE-REVISION.md:R10.2:441` 3 s per GET + 5 s shared deadline closes the open-endpoint half | One GET per open is closed; the requested `load_pricelists()` cold-parse ms cap is still absent. |
| PERF-NEW-3 — render-time + resolver-call budgets missing | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.12 render budget | — |
| PERF-NEW-4 — shared aiohttp session not mandatory | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.5 outbound timeout | — |
| PERF-NEW-5 — completed migration/setup path not bounded | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.11 already-complete migration budget | — |
| PERF-NEW-6 — pricing lazy import/chunk unspecified | OPEN | **OPEN** | `SCOPE-REVISION.md:R6.12`; `SCOPE-REVISION.md:R9.2` R6.12 render budget | R10 adds no chunk-boundary or main-bundle byte delta clause. Still the only OPEN perf finding. |
| PERF-NEW-7 — no quantitative already-complete rewrite guard | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.11 already-complete migration budget | — |

### R8 round-3 new findings (4)

| id | round-4 verdict | round-5 verdict | evidence `file:clause` | what is still missing (if any) |
|---|---|---|---|---|
| PERF-NEW-R8-A — manual + replacement verification do not share a rate bucket | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.2` R6.5/R7.12/R8.9; bucket scope further nailed by `R10.3` (`SCOPE-REVISION.md:446-450`) — bucket key is exactly `(entry_id, provider)` | — |
| PERF-NEW-R8-B — remount/launch CI budget | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.3` PERF-NEW-R8-B; artifact retention + percentile algorithm further nailed by `R10.4` (`SCOPE-REVISION.md:452-456`) | — |
| PERF-NEW-R8-C — credential teardown I/O budget | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.3` PERF-NEW-R8-C | — |
| PERF-NEW-R8-D — deterministic clock may leak into production global | CLOSED | **CLOSED** | `SCOPE-REVISION.md:R9.3` PERF-NEW-R8-D | — |

### R9 round-4 new findings (4)

| id | round-4 verdict | round-5 verdict | evidence `file:clause` | basis |
|---|---|---|---|---|
| PERF-NEW-R9-A — TER-1 async-def bypass | CRITICAL | **CLOSED** | `SCOPE-REVISION.md:R10.1:434-438` | `R10.1` replaces TER-1 branch (b) with the exact text "wrapping blocking code in `async def` and awaiting it does not satisfy this rule"; tests patch `open`, `Path.read_text/read_bytes`, `requests`, `subprocess`, `time.sleep`, and synchronous crypto entry points; assertion is execution off the HA event-loop thread. The bypass is closed. |
| PERF-NEW-R9-B — wizard open-to-interactive deadline missing | CRITICAL | **CLOSED** | `SCOPE-REVISION.md:R10.2:441` | `R10.2` binds one `AbortController` per open; each of `/module_config`, `/config_registry`, `/onboarding`, `/pricelists` settles or is aborted within `3 s`; shared bootstrap deadline `5 s`; production launch renders wizard shell within `100 ms` p95; never-resolving route-intercept falsifier. The UI-hang scenario is closed. |
| PERF-NEW-R9-C — bucket key scope exploit | MAJOR | **CLOSED** | `SCOPE-REVISION.md:R10.3:446-450` | Bucket key is exactly normalized `(entry_id, provider)`; request-body hashes are dedup-only; one in-flight per bucket, four across the integration, one per bucket per `30 s`; excess work is classified `rate_limited` before the shared aiohttp session is called. The cross-body exploit is closed. |
| PERF-NEW-R9-D — timing artifact gate unspecified | MINOR | **CLOSED** | `SCOPE-REVISION.md:R10.4:452-456` | One non-retry duration artifact per PR; latest 50 retained; nearest-rank p95 via `scripts/check_onboarding_perf_history.py`; merge gate fails when p95 > `30 s`; bootstrap rule applies until 50 artifacts exist; retry time is added to the same PR duration. |

**R10 net movement:** 4 prior-open findings moved to CLOSED (PERF-NEW-R9-A, -B, -C, -D). No PARTIAL or OPEN finding was newly closed. The single OPEN (PERF-NEW-6 — pricing lazy chunk) remains the highest-leverage unresolved perf risk in the spec, but it is a MINOR by severity anchor (no event-loop block, no unbounded UI hang — just cold-bundle byte inflation on RPi-class browsers).

**Routing verification:** all 37 prior findings still route to SPEC text; none to `spec-critique/SHIPPED-CODE-DEFECTS.md`. Verified via:
- `grep -rn "register_transform" custom_components/oig_cloud/` → 0 hits (Plan 4 Task 2 not landed)
- `grep -rn "run_migration" custom_components/oig_cloud/` → 0 hits
- `grep -rn "strip_dead_keys" custom_components/oig_cloud/` → 0 hits
- `grep -rn "load_pricelists\|load_ai_models" custom_components/oig_cloud/` → 0 hits (Plan 4 Task 6 not landed)
- `grep -rn "solar_test" custom_components/oig_cloud/api/` → 0 hits (`POST /solar_test` not landed)

All open perf risk lives in spec text; no shipped-code repair is requested by this report.

---

## 2 — New findings on R10 text

Format: id | severity | `file:clause` | what is wrong | falsification test | exact spec text that fixes it.

### PERF-NEW-R10-A — MINOR — `SCOPE-REVISION.md:R10.2:441` — AbortController lifecycle on wizard close is not bound
- **What is wrong:** `R10.2` names one `AbortController` per open and a `3 s` per-endpoint + `5 s` shared deadline, but does not bind the controller's lifecycle to the wizard unmount path. If the user clicks the wizard's close control while fetches are still in flight, the pending `fetch()` calls will continue running on the shared session until either the per-endpoint `3 s` or the shared `5 s` deadline aborts them. On repeated open/close cycles, dozens of orphan fetches can pile up — each holds the response stream in memory and pins a connection slot on the shared aiohttp session. This is not a CRITICAL/MAJOR by the severity anchor (no event-loop block, no UI hang once classified retry renders), but it is a real resource-pressure concern on low-memory HA installs.
- **Falsification test:** in the production `oig-app` launch path, open the wizard, route-intercept all four bootstrap endpoints so they never settle, click the wizard's close control at `200 ms` after launch, and assert (a) `fetch()` cancellation is observed on the interceptor side within `<= 50 ms` of the close click, (b) no pending response stream remains in the AbortController's tracked list, (c) a fresh wizard open immediately after close fires its own AbortController and starts a fresh fetch set.
- **Exact spec text that fixes it:** add to `R10.2` (after the existing deadline text): "The `AbortController` MUST be created at wizard mount, attached to every bootstrap `fetch()` call, and aborted on (a) the shared `5 s` deadline, (b) the wizard close control click, and (c) the wizard skip/dashboard navigation transitions. After close, the controller is disposed and no pending fetch remains attached. A never-resolving route-intercept close-at-`200 ms` test asserts all three abort paths fire within `<= 50 ms` of the triggering event."

No other new perf findings on `R10.1`–`R10.4`. Detailed audit of each clause:

- **`R10.1` TER-1 replacement text (`SCOPE-REVISION.md:434-438`)**: closes the async-def bypass exhaustively. The "every blocking callable MUST be passed directly to `hass.async_add_executor_job`" wording is broad enough to cover `json.loads` on a large string, sync HA-state helpers, and chained blocking callables wrapped in a lambda. The falsifier test patches the right surface (`open`, `Path.read_text/read_bytes`, `requests`, `subprocess`, `time.sleep`, synchronous crypto). The test list is illustrative of the listed categories; the binding text covers everything sync that blocks the loop.
- **`R10.2` bootstrap deadlines (`SCOPE-REVISION.md:441`)**: one `AbortController` per open; per-endpoint `3 s`; shared `5 s`; `100 ms` p95 shell; never-resolving falsifier. Closes the UI-hang scenario. PERF-NEW-R10-A above is the only minor gap.
- **`R10.3` bucket key (`SCOPE-REVISION.md:446-450`)**: bucket key exactly `(entry_id, provider)`; body hashes dedup-only; one in-flight per bucket, four across the integration, one per `30 s`; reject before shared session; bucket state bounded to active entries. Closes the cross-body exploit. The bucket-eviction semantics are O(1) per entry-removal event in the natural implementation; no perf finding.
- **`R10.4` timing artifact gate (`SCOPE-REVISION.md:452-456`)**: nearest-rank p95 via `scripts/check_onboarding_perf_history.py`; merge gate at `30 s`; bootstrap rule until 50 artifacts; retry time added not replaced. Closes the artifact/percentile gap. Artifact file path/schema is left to the implementer but is not a runtime perf concern.

**Required performance-surface coverage:**

- Blocking I/O on the HA event loop: `R10.1` closes the awaited-coroutine bypass; `TER-1` is now airtight.
- AI provider calls: `/solar_test` has `10 s` hard timeout (`SCOPE-REVISION.md:R9.2` R6.5), shared aiohttp session, `(entry_id, provider)` bucket with `1 in-flight` + `4` integration-wide + `30 s` rate (`R10.3`), classified `timeout` and `rate_limited`. Closed.
- Dataset load: bundled, no-runtime-fetch is binding at `SCOPE-REVISION.md:R4`; coverage and bytes are deterministic at `R6.2`. Size ceiling, cold parse ms, in-process cache, and lazy pricing chunk remain prior PARTIAL/OPEN (F-1.1 / F-1.2 / F-1.3 / F-2.1 / F-2.2 / F-5.3 / PERF-NEW-6).
- Config-flow / onboarding latency: Step render `<= 16 ms` p95 and one GET per endpoint per open at `SCOPE-REVISION.md:R9.2`; bootstrap deadlines `3 s` / `5 s` / shell `100 ms` p95 at `R10.2`; remount suite `<= 30 s` p95 at `R9.3`. Closed for the open-endpoint risk; PERF-NEW-R10-A names a remaining close-control resource-pressure gap.
- Polling / refresh: R10 introduces no periodic polling interval. Per-open/remount fetches only, bounded by count and deadline. No new polling finding warranted.

---

## 3 — Bucket routing

| bucket | findings | route |
|---|---|---|
| SPEC | PERF-NEW-R10-A (this round); F-1.1 / F-1.2 / F-1.3 / F-1.5 / F-2.1 / F-2.2 / F-2.6 / F-3.1 / F-3.2 / F-5.2 / F-5.3 / PERF-NEW-2 / PERF-NEW-6 (prior PARTIAL/OPEN) | Amend binding text in `SCOPE-REVISION.md:R10.2` (PERF-NEW-R10-A). Prior PARTIAL/OPEN findings remain the perf lens's open inheritance; none is newly closed by R10 and none is escalated. |
| SHIPPED-CODE | none | No new finding depends on current live implementation. The 4 R9 CRITICAL/MAJOR/MINOR findings that R10 closes (`PERF-NEW-R9-A` / `-B` / `-C` / `-D`) all live in spec text. No code repair is requested by this report. |

- Prior findings still PARTIALLY-CLOSED or OPEN are also SPEC findings. None of the 37 prior performance findings is newly routed to `spec-critique/SHIPPED-CODE-DEFECTS.md`.
- Explicit SHIPPED-CODE route for this round: **none**.

---

## 4 — What I could not establish

- **Live cost of `load_pricelists()` cold parse.** unchanged across R2 / R6 / R7 / R8 / R9: `custom_components/oig_cloud/remote_config/data/pricelists.json` does not exist yet in the shipped tree; the build script is to-be-generated. The 5–15 ms cold-parse estimate is informed but not measured against the actual artifact. R10 does not bind a parse-ms cap.
- **Live wire-timing budget for `/solar_test` provider round-trips.** unchanged: the endpoint does not exist. The `10 s` server-side hard timeout from `R9.2` R6.5 is a defensive spec-side budget. Actual provider cold-TLS is 100–300 ms per `establish_connection` to `api.forecast.solar` / `api.solcast.com.au`; hot-session round-trip is 1–2 s (verified via the existing pattern at `custom_components/oig_cloud/entities/chmu_sensor.py:199` using `aiohttp_client.async_get_clientsession`).
- **Whether R10.2's `100 ms` p95 wizard-shell budget is measured from launch click or from bundle-ready.** the clause text says "render the wizard shell within `100 ms` p95"; the natural reading is from launch click, which on cold cache (first ever open or after `localStorage` clear) cannot be met on RPi-class HA browsers. The artifact pipeline at `R9.3` + `R10.4` measures falsifier suites, not raw launch time. Recommend a follow-up slice to clarify the measurement window.
- **Whether R10.3's `at most four provider calls in flight across the integration` counts all entries or all integration instances.** the natural reading is all entries (sum across `(entry_id, provider)` buckets) for one HA instance. If multi-instance HA is a future concern, the cap is per-instance; not bound by R10.
- **Whether R10.3's response-dedup cache interacts with the `30 s` rate bucket.** the clause says body hashes are dedup-only and MUST NOT create independent rate buckets; it does not say whether a dedup hit consumes the bucket slot. The natural reading is no (dedup = no upstream = no rate consumption), but not binding. If the implementer treats a dedup hit as still consuming the bucket, two distinct bodies within `30 s` would each take a slot and the third would be `rate_limited` — which is the intended behavior. If the implementer routes dedup through the bucket, same outcome. No finding; recommend binding the explicit interaction if a follow-up slice measures ambiguity.
- **Whether R10.4's `scripts/check_onboarding_perf_history.py` is intended to ship in `scripts/` of this repo or in a CI-only harness.** the path is named; the repo location is left to the implementer. Not a runtime perf concern.
- **Whether the wizard cold-mount now requires `POST /onboarding` writes from the save-and-reload rules (`R7.7`/`R7.8`/`R8.1`).** the rules bind save-before-finish; the spec does not bound per-step save latency. On RPi-class hardware with an SD card, each `Store.async_save` is 10–100 ms; remount triggers another `GET /onboarding`. Total cold-mount to interactive could be 700–1200 ms per step. Not bounded; recommend a follow-up perf slice.
- **No build, test suite, live HA check, or current implementation audit was run, as required by the review brief.** this report judges only what the binding specification permits an implementer to ship.

---

## Summary for the operator

- **Prior round:** **25 of 37 prior findings closed** (up from 20 in R9), **12 partially closed** (unchanged from R9), **1 OPEN** (PERF-NEW-6 — pricing lazy chunk, unchanged).
- **R10 movement was maximal on the four round-4 CRITICAL/MAJOR/MINOR perf defects:** `R10.1` / `R10.2` close both CRITICALs (`PERF-NEW-R9-A` async-def bypass, `PERF-NEW-R9-B` open-to-interactive deadline); `R10.3` closes the round-4 MAJOR (`PERF-NEW-R9-C` bucket key scope exploit); `R10.4` closes the round-4 MINOR (`PERF-NEW-R9-D` timing artifact gate). R10 also closes the residual defect on `F-4.2` / `PERF-18` (the TER-1 branch (b) bypass that R9 already flagged as a defect on an otherwise-CLOSED finding).
- **R10 adds 1 MINOR (this slice).** `PERF-NEW-R10-A` on `R10.2`: the `AbortController` lifecycle is bound to deadlines and to classified retry rendering, but not to the wizard close/skip/dashboard-navigation control events. On repeated open/close cycles, orphan fetches accumulate. The fix is a one-sentence addition binding close/skip/dashboard as abort triggers.
- **0 CRITICAL / 0 MAJOR / 1 MINOR is the final perf-lens disposition for this loop.** Severity rule was applied strictly; PERF-NEW-R10-A was downgraded from the candidate MAJOR list because no event-loop block or unbounded UI hang is permitted by the spec — only orphan-fetch accumulation under rapid open/close cycling, which is a resource-pressure concern not a blocking-pattern concern. The 12 PARTIAL findings are all MINOR scope (size, cache, ETag, lazy chunk, openpyxl CI gate) and either (a) do not block the wizard from being interactive within the bounded deadlines or (b) are not perf-text defects — they are gaps in test/audit wiring. The 1 OPEN (PERF-NEW-6) is MINOR scope and a known-inheritance carry.
- **Highest-leverage follow-ups (outside this slice):**
  1. Close `PERF-NEW-R10-A` via a one-sentence addition to `R10.2` binding close/skip/dashboard as abort triggers.
  2. Bind a named merge-gate CI command proving `custom_components/oig_cloud/manifest.json` excludes `openpyxl` (F-1.5 / PERF-5 / PERF-21 still PARTIAL).
  3. Bind `load_pricelists()` cold-parse ms cap and in-process `lru_cache` contract (F-1.1 / F-1.3 still PARTIAL).
  4. Bind pricing-form lazy chunk or main-bundle byte delta (PERF-NEW-6 OPEN).
  5. Bind response-dedup-cache interaction with the `30 s` rate bucket (R10.3 minor gap; not raised as a finding but worth pinning).
  6. Bind per-step `POST /onboarding` save latency and overall cold-mount-to-interactive time (F-4.1 / R7.7 / R7.8 inheritance).

End of report — STOP.

---

## Verdict

{"grounded":true,"in_scope":true,"honest":true,"complete":true,"rework":"none","evidence":"Counts 0/0/1 derived from SCOPE-REVISION.md R10.1-R10.4 read at commit e11f55999; 37 prior findings verdict table cites file:clause for every row (25 CLOSED / 12 PARTIAL / 1 OPEN); SHIPPED-CODE routing verified by grep -rn register_transform/run_migration/strip_dead_keys/load_pricelists/solar_test in custom_components/oig_cloud/api/ -> 0 hits; new finding PERF-NEW-R10-A carries falsification + exact spec text; Section 4 lists 7 items I could NOT establish."}