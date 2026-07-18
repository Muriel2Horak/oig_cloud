# R6-PERF — Performance / event-loop review (round-1 re-critique)

**Reviewer:** performance lens, round-1 re-critique.
**Date:** 2026-07-18.
**Input:** `SCOPE-REVISION.md` R6.1–R6.12; prior `spec-critique/R2-PERF-perf.md`; `spec-critique/R6-CLASSIFICATION.md` (PERF-1..PERF-22 routing); `spec-critique/SHIPPED-CODE-DEFECTS.md`; `docs/redesign_2026_07/PLAN-3.6-SPEC.md`; `docs/redesign_2026_07/VERIFICATION-STANDARD.md`; `docs/redesign_2026_07/plans/2026-07-17-f1-plan4-cleanup-migration-dataset.md` (read-only from a tmp file).
**Out of scope:** sec/anti-stub/aikeys re-critique (own reports); AI plan D8 (later); Plan 2/3 hot items.
**Method:** static read of R6 text and prior report; targeted greps against the shipped tree (no commits, no live build).

---

## Header

**0 CRITICAL / 3 MAJOR / 4 MINOR (new findings).**

Prior-finding verdict: **6 CLOSED / 15 PARTIALLY-CLOSED / 1 OPEN** out of 22 prior findings.

`grep -c^` summary: R6 adds three perf-relevant clauses (R6.5, R6.11, R6.12). They close the **shape** of most prior findings but stop short of every measurable budget. The remaining gaps are concentrated in three families: (a) explicit numbers (timeout, rate-limit, fetch-count) — the clauses say "bounded" and "measurable" but do not name them; (b) the wire-format discipline for caching (no ETag/304 named anywhere); (c) the build/setup hot path (no `async_create_task` enforcement for known-non-blocking migration work, no ms budget on the already-complete fast path).

---

## Section 1 — prior-finding verdict

Id maps to the prior report's `F-x.y` and `PERF-N` rows in `R6-CLASSIFICATION.md`. Counts: **6 CLOSED / 15 PARTIAL / 1 OPEN**.

| id | verdict | evidence (file:clause) | what is still missing |
|---|---|---|---|
| F-1.1 / PERF-1 (MINOR) — `load_pricelists` no in-process cache | PARTIAL | `SCOPE-REVISION.md:231` R6.11 — "Runtime surfaces ... must include cache discipline" | no spec for **where** the cache lives (in-process vs. client), no max age, no per-call hit assertion |
| F-1.2 / PERF-2 (MINOR) — pricelist size budget missing | PARTIAL | `SCOPE-REVISION.md:187` R6.2 numeric **floor** on price coverage; `SCOPE-REVISION.md:191` R6.3 schema shape | no ceiling on the JSON artifact size, no per-DSO byte budget, no cold-parse load-time assertion |
| F-1.3 / PERF-3 (MINOR) — no loop-blocking timer test | PARTIAL | `SCOPE-REVISION.md:229-232` R6.11 "testable under load" / "measurable test coverage" | no N-ms budget for `load_pricelists()` / `load_ai_models()`; no test that records wall time on the loop during the load |
| F-1.4 / PERF-4 (MINOR) — build-only requirements path | PARTIAL | `SCOPE-REVISION.md:109-110` (R4 earlier) "vlastní requirements pro build"; no R6 add | R6 does not name `scripts/requirements-build.txt` nor require the file to exist; "vlastní" was a 2026-07-17 statement, R6 does not bind it |
| F-1.5 / PERF-5 (MINOR) — no CI gate openpyxl ∉ manifest | PARTIAL | `SCOPE-REVISION.md:184-188` R6.2 byte-equivalent artifact | no R6 line that says `manifest.json` MUST NOT list `openpyxl` and that CI MUST fail if it does; the existing absence is implicit |
| F-2.1 / PERF-6 (MINOR) — `GET /pricelists` server-side cache | PARTIAL | `SCOPE-REVISION.md:231` R6.11 "cache discipline" | server cache now required by name; no wire-format detail (in-process vs. response cache, no `lru_cache(1)` / ETag spelled out) |
| F-2.2 / PERF-7 (MINOR) — immutable per release not tied to cache lifetime | PARTIAL | `SCOPE-REVISION.md:191-193` R6.3 `valid_from` / `stale_warning`; R6.11 cache discipline | R6.3 closes the data-side warning; R6.11 closes the cache-side; the **tie** between immutable-per-release and cache lifetime is not made explicit |
| F-2.3 / PERF-8 (**MAJOR**) — `POST /solar_test` no timeout | **CLOSED** | `SCOPE-REVISION.md:202` R6.5 "Endpoint behavior MUST be ... bounded (timeout), and rate-limited; errors must be classified" + `:203` "100% repeated click test that does not turn into unbounded repeated upstream calls" | shape closed; the **number** (was the open half of this MAJOR) is left to PERF-NEW-1 |
| F-2.4 / PERF-9 (MINOR) — session reuse not specified | PARTIAL | `SCOPE-REVISION.md:200-203` R6.5 | timeout/rate-limit are in; **session reuse** (use `aiohttp_client.async_get_clientsession(hass)`) is not named anywhere in R6 |
| F-2.5 / PERF-10 (MINOR) — repeated-click throttle | **CLOSED** | `SCOPE-REVISION.md:203` R6.5 falsification: "100% repeated click test" | — |
| F-2.6 / PERF-11 (MINOR) — `/config_registry` not ETag-aware | PARTIAL | `SCOPE-REVISION.md:231` R6.11 includes `/config_registry` in cache discipline | ETag wire-format contract is not named; an `If-None-Match` → 304 path is not in scope, only an in-process or client-TTL cache |
| F-2.7 / PERF-12 (MINOR) — `/module_config` redundant cold-open fetches | **CLOSED** | `SCOPE-REVISION.md:232` R6.11 "no unbounded duplicate config fetches on one wizard open" | direct falsification |
| F-3.1 / PERF-13 (MINOR) — pricing in main bundle | PARTIAL | `SCOPE-REVISION.md:234-236` R6.12 "fieldsFromRegistry rendering ... stable per render path ... no repeated recomputation" | memoization is in scope; **bundle split / lazy import** for the pricing form is not specified anywhere in R6 (Plan 3.6:SPEC makes no mention of dynamic import either) |
| F-3.2 / PERF-14 (MINOR) — no chunk boundary for heavy pricing form path | PARTIAL | (same as F-3.1) | same gap: memoization yes, lazy chunk no |
| F-3.3 / PERF-15 (MINOR) — duplicate cold-open call paths | **CLOSED** | `SCOPE-REVISION.md:232` R6.11 "no unbounded duplicate config fetches on one wizard open" | — |
| F-3.4 / PERF-16 (MINOR) — registry field list rebuilt every render | **CLOSED** | `SCOPE-REVISION.md:235-236` R6.12 "no repeated recomputation without stable keys" + falsification "toggle unrelated inputs in step 3 and assert ... memoization is not violated by field identity churn" | — |
| F-4.1 / PERF-17 (**MAJOR**) — setup adds multiple sync Store writes | PARTIAL | `SCOPE-REVISION.md:230` R6.11 "Migration restore/strip operations must avoid unnecessary per-setup I/O and provide explicit behavior when already-complete" | clause requires no-avoidable I/O + already-complete fast path; does **not** require `hass.async_create_task` for the non-critical migration write that `Plan4:Task2:Step3` awaits in `async_setup_entry` (the in-repo precedent at `__init__.py:1535` uses `hass.async_create_task(coro)` for exactly this kind of setup coroutine). No ms budget on the already-complete fast path either |
| F-4.2 / PERF-18 (**MAJOR**) — transform execution path can become blocking | **OPEN** | `SCOPE-REVISION.md:229-232` R6.11 talks about I/O; **does not** name transform executability | Plan 4 Task 2 exposes `register_transform(fn: Callable[[Dict[str, Any]], Dict[str, Any]])` — sync only. Task 4 registers a sensor-first pre-seed transform; if that ever needs `await sensor.async_get_last_state()` the transform silently becomes blocking under `run_migration`, which is called from `async_setup_entry`. R6.11 needs an explicit "transforms are synchronous and CPU-bound, OR are scheduled via `hass.async_add_executor_job` / awaited via executor" rule |
| F-4.3 / PERF-19 (MINOR) — idempotent migration performs unnecessary I/O | **CLOSED** | `SCOPE-REVISION.md:230` R6.11 "... provide explicit behavior when already-complete" | — |
| F-5.1 / PERF-20 (MINOR) — build requirements file + lock | PARTIAL | same as F-1.4 | same gap: file path / lock not bound by R6 |
| F-5.2 / PERF-21 (MINOR) — no CI check openpyxl ∉ runtime manifest | PARTIAL | same as F-1.5 | same gap: no R6 line names the CI step |
| F-5.3 / PERF-22 (MINOR) — JSON artifact size floor/ceiling | PARTIAL | `SCOPE-REVISION.md:187-188` R6.2 floor on price coverage + drift > 30 % | floor (coverage) closed; **ceiling** on payload size is not. No per-snapshot byte cap, no cold-parse ms cap |

**Routing dispute (verification of `R6-CLASSIFICATION.md`):** the routing of `PERF-8` to R6.5 is correct. The routing of `PERF-13/14` to R6.12 is correct, but leaves the bundle-split half of those findings uncovered; the correct disposition is PARTIAL, not CLOSED. The classification table column does not show a partial flag — it implies CLOSED via "where fixed" link only.

---

## Section 2 — new findings

Format: id | severity | file:clause | the cost and where it lands | the measurable budget that should be specified | the test that measures it.

### PERF-NEW-1 — **MAJOR** — `SCOPE-REVISION.md:202` R6.5 — explicit number for the timeout and rate-limit is missing
- **Cost / where:** `POST /solar_test` (`api/ha_rest_api.py` future) currently has no enforced timeout in the spec; the existing forecast path `entities/solar_forecast_sensor.py:606` uses `aiohttp.ClientTimeout(total=30)`, so a naive implementation reuses 30 s and a malicious or stalled `forecast.solar` host keeps the request handler busy for the full window. On a single-process HA, that stalls the planner update worker and any other request sharing the worker. R6.5 line 202 says "bounded (timeout), and rate-limited" — "bounded" without a number is what F-2.3 already said with the same gap.
- **Budget:** the handler MUST wrap the upstream `await` in `asyncio.wait_for(coro, timeout=10.0)` (server-side hard cap), and the rate-limit MUST be no more than 1 in-flight request per `(entry_id, sane-prefix-of-body)` within a 30-second sliding window.
- **Test:** a single integration test seeds a stub provider that `await asyncio.sleep(60)`; the handler must return a classified `{"error": "timeout"}` JSON within ≤ 10.5 s of the click, with no further upstream call observable on the wire. A second test simulates 100 clicks in 5 s on the same entry and asserts the upstream stub is invoked at most 1 time within any 30-second window (R6.5's existing "100 % repeated click" test, but with a number added: "at most 1 upstream call per 30 s window").

### PERF-NEW-2 — **MAJOR** — `SCOPE-REVISION.md:231-232` R6.11 — cache-discipline clause lacks a measurable fetch-count budget
- **Cost / where:** "cache discipline and measurable test coverage for repeated loads" (R6.11 line 231) is a sentence about the existence of a test, not about what the cache achieves. The falsification line 232 says "no avoidable full rewrite path and no unbounded duplicate config fetches on one wizard open" — "unbounded" is non-quantitative; the literal reading is "≤ 100 is fine." On a slow RPi-class HA, the practical cost of three to four extra `/module_config` round-trips per wizard open is hundreds of milliseconds of perceived latency in the form.
- **Budget:** the falsification test MUST assert concrete counts — per single wizard mount (Steps 1→3 visible to the user), each of `GET /config_registry`, `GET /module_config`, `GET /pricelists` is called **at most once** from the integrated flow unless the user explicitly triggers a refresh; the cold-load wall time of `load_pricelists()` MUST be ≤ 50 ms on the build machine (CI assertion with `time.perf_counter()`).
- **Test:** a Playwright + vitest hybrid test that opens the wizard, completes Steps 1 → 2 → 3 with realistic interactions, and asserts an intercept counter of `<= 1` for each of those three endpoints; a separate Python unit test that `time.perf_counter()`-wraps `load_pricelists()` over the shipped JSON and fails the build if it crosses 50 ms.

### PERF-NEW-3 — **MAJOR** — `SCOPE-REVISION.md:235-236` R6.12 — `fieldsFromRegistry` memoization test lacks a render-time / invocation-count budget
- **Cost / where:** R6.12 requires field stability and forbids recomputation without stable keys, with a falsification that toggles an unrelated input and asserts DOM stability. That catches **identity churn** but not **inflation of a slow path**: the same cached list of fields can be re-walked 50 times per render if the caller does not memoize. Pricing step (Step 3) will iterate distributor enum × tariff enum × confirmed-price fields; without an invocation-budget this scales quietly with field count.
- **Budget:** the falsification test MUST also assert that `fieldsFromRegistry(reg, section)` is called **at most once per render path**, and that a render of Step 2 or Step 3 completes in ≤ 16 ms (one 60 fps frame) under a fixed-width fixture that includes the new `pricing` section. A flakiness threshold of 32 ms (two frames) is acceptable only on CI; under that, the test fails.
- **Test:** extend the existing R6.12 falsification with two `expect()` lines — one asserting a wrapped/spy counter on `fieldsFromRegistry` is `≤ 1` after the toggle, one asserting `performance.now()` deltas around render completion (or `lit-html` render end-callback) fall below the budget. The unit-side analogue: a vitest that calls the field renderer 100 times with the same `reg` reference and asserts the underlying registry walk happens exactly once.

### PERF-NEW-4 — MINOR — `SCOPE-REVISION.md:200-203` R6.5 — does not mandate `aiohttp.ClientSession` reuse
- **Cost / where:** the existing forecast path `_fetch_forecast_solar_strings` (`entities/solar_forecast_sensor.py:539`) opens a fresh `async with aiohttp.ClientSession() as session: …` per call. R6.5 closes timeout / rate-limit / error classification, but if the new `POST /solar_test` delegates to the same call shape, every click incurs a new TCP/TLS handshake against the provider. At 100–300 ms per TLS to `api.forecast.solar` / `api.solcast.com.au`, repeated testing is materially slower than necessary.
- **Budget:** the handler MUST call `aiohttp_client.async_get_clientsession(hass)` (matching `OIGCloudAiView.post` at `ha_rest_api.py:1402`) and reuse the resulting session across calls. The provider round-trip MUST complete in ≤ 1.5 s on a warm session (TLS already established); no per-request TCP connect observable in a packet capture stub.
- **Test:** a unit test monkeypatches `aiohttp_client.async_get_clientsession` to return a sentinel; the handler must obtain the session from the sentinel, not open its own `aiohttp.ClientSession()`. A second test wires a local socket that counts `connect()` events across 10 sequential test calls and asserts the count is 1, not 10.

### PERF-NEW-5 — MINOR — `SCOPE-REVISION.md:229-232` R6.11 — does not enforce `async_create_task` for the non-critical migration I/O in `async_setup_entry`
- **Cost / where:** Plan 4 Task 2 instructs that `await run_migration(hass, entry)` is called once from `async_setup_entry` (`plan4.md:140`), and the same await applies to `strip_dead_keys` (`:707`). On cold start of HA on RPi-class hardware with an SD card, each `Store.async_save` is 10–100 ms per write; the marker-already-complete fast path is supposed to short-circuit, but the marker-read itself is another `Store.async_load`. Net cold-start overhead: 30–300 ms per config entry, even when nothing changed. The repo already has the right pattern (`__init__.py:1535` `hass.async_create_task(coro)` for an equivalent fire-and-forget setup coroutine) — R6.11 should bind its use.
- **Budget:** once the migration marker says `complete=true`, `run_migration` MUST be schedulable via `hass.async_create_task(...)` so that `async_setup_entry` returns within ≤ 50 ms after the marker read; on a first-time entry (no marker yet), the await is acceptable and is the budgeted slow path. `strip_dead_keys` MUST observe the same rule when its `removed` set is empty (no-op skip).
- **Test:** an instrumented entry whose marker is already `complete=true`; `async_setup_entry` must complete within ≤ 50 ms wall time (pytest `time.monotonic()` deltas around `await hass.config_entries.async_setup(entry.entry_id)`). A second test counts `Store.async_save` calls during that fast-path setup and asserts the count is 0.

### PERF-NEW-6 — MINOR — `SCOPE-REVISION.md:234-236` R6.12 — bundle-split / lazy import for the pricing form path is not specified
- **Cost / where:** the shipped `dist/assets/index.js` is ≈ 800 KB. Adding the `pricing` registry distributor enum, tariff enum, and the Step-3 fields to the always-loaded bundle (F-3.1/F-3.2 prior) inflates cold-parse time on RPi-class HA browsers. R6.12 closes memoization but says nothing about a separate `pricing-*.js` chunk that the wizard loads only on Step 3.
- **Budget:** the pricing form module MUST be loaded via dynamic `import(...)` and result in a separate webpack chunk (file name `pricing.<hash>.js` produced by `npm run build`); the cold-load byte cost of the main chunk MUST NOT grow by more than 5 KB compared to the same build without the pricing section (vitest unit test or build artefact diff). A Playwright run on a throttled "Slow 3G" profile MUST observe Step 3's interactive `<select>` appearing within ≤ 800 ms after the user clicks into Step 3.
- **Test:** a build-artefact assertion: `ls www_v2/dist/assets | grep '^pricing\.'` returns exactly one file matching `pricing.[a-f0-9]{8,}.js`; a Playwright test on `wizard.open() → step3.click()` records `domcontentloaded` of the pricing chunk and asserts ≤ 800 ms.

### PERF-NEW-7 — MINOR — `SCOPE-REVISION.md:232` R6.11 — "no avoidable full rewrite path" is not quantitative
- **Cost / where:** the falsification's first clause ("no avoidable full rewrite path") names the concept but not the assertion. An implementer passes it with a re-write that only runs when the marker says incomplete; a stricter reading requires that the `_TRANSFORMS` list itself be skipped on a re-run, and that no `Store.async_save` be issued. Without a count, an over-eager backup-store write on every reload (test-fixture friendly) passes the clause and still does I/O.
- **Budget:** the falsification test MUST assert that on re-run of `run_migration` for an entry whose marker is `complete=true`, the count of `Store.async_save(...)` calls is 0 (zero); the count of `Store.async_load(...)` calls may be 1 (the marker read). A second assertion: the count of `merge_entry_options` / `async_update_entry` calls during the same fast path is 0.
- **Test:** a `run_migration` idempotent-re-run test (Plan 4 Task 2 already has one — `test_migration_is_idempotent_and_marks_complete`) extended with a `Store.async_save` spy; the spy count must be 0 on the second call.

---

## Section 3 — what I could NOT establish

- **Live cost of `load_pricelists()` cold parse.** the shipped `data/pricelists.json` does not exist yet (`ls custom_components/oig_cloud/remote_config` → not a directory; the bundled dataset is to-be-generated by `scripts/build_pricelists.py`). The estimate in the prior report (5–15 ms cold parse at 30–80 KB) is informed but not measured against the actual artifact.
- **Live cost of `_fetch_forecast_solar_strings` against `forecast.solar` / `solcast`.** the prior report cites `entities/solar_forecast_sensor.py:539,606`, but the wire-timing budget from `POST /solar_test` is not yet known because the endpoint does not exist. The 10 s number in PERF-NEW-1 is the spec-side budget; the actual provider round-trip will be measured at integration time, not now.
- **`fieldsFromRegistry` actual call site count under lit-html.** the prior report cites `registry-data.ts:46–61` but the export shape and the real call graph in `www_v2/src/ui/features/onboarding/**` is not read line-by-line in this pass; I infer (don’t verify) that Step 2 / Step 3 each call `fieldsFromRegistry(...)` in their render path. The PERF-NEW-3 / F-3.4 budgets assume that graph; if Step 3 uses a different resolver (e.g., precomputed `lit/static-html`) the budgets shift.
- **Whether `strip_dead_keys` actually has work to do on a greenfield entry.** Plan 4 Task 5 says it skips when `removed` is empty, but the implementation does `await _backup_store(...).async_load() or {}` even on the empty path (`:699`); that is one extra read per entry that R6.11 does not bound. I am flagging this as a likely-but-unverified cost.
- **Whether any of the new R6.5 / R6.11 / R6.12 acceptance tests will land in CI vs. only locally.** the tests are referenced in the clauses but I did not see `tests/test-migration-plan4-smoke.sh` in the shipped tree (`find tests -name 'test-migration-plan4-smoke*'` returns 0). The smoke matrix is documented as a Plan 4 deliverable but does not exist yet; how it runs in CI is not established.

---

## Summary for the operator

- **Prior round:** 6 of 22 prior findings fully closed; 15 partially closed (all share the same shape — the clause exists but lacks the number); 1 open (PERF-18 — blocking-transform risk).
- **New round:** 0 CRITICAL, 3 MAJOR, 4 MINOR. The 3 MAJOR are budget-absence findings on clauses that already say "bounded/measurable/stable" — they ask for the number to make the test assertable, which is what keeps a future Plan-5 from re-discussing the same scope.
- **Highest-leverage spec edits before implementation:**
  1. Add the literal number to R6.5 line 202 (`timeout=10` server-side hard cap, `1 in-flight / entry / 30 s` rate).
  2. Add the literal count to R6.11 line 232 (`≤ 1 fetch per endpoint per wizard open`; `setup_entry setup time ≤ 50 ms` already-migrated).
  3. Add the literal time/invocation bound to R6.12 line 235 (`fieldsFromRegistry called ≤ 1 per render`; `≤ 16 ms` per Step 2/3 render in fixture).
  4. Bind transform-executability in R6.11 (or a new sub-clause) — sync-only OR executor.
  5. Bind `scripts/requirements-build.txt` and a CI manifest gate (R5.1 / R6.2 already imply both; R6 does not bind the file path or the CI step).

End of report — STOP.
