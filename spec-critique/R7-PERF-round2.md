# R7-PERF — Performance / event-loop review (round-2 re-critique)

**Reviewer:** performance lens, round-2 re-critique.
**Date:** 2026-07-18.
**Input:**
  - prior `spec-critique/R2-PERF-perf.md` (22 prior findings F-1.1..F-5.3 / PERF-1..PERF-22),
  - prior `spec-critique/R6-PERF-round1.md` (6 CLOSED / 15 PARTIAL / 1 OPEN on R6.x; 3 MAJOR / 4 MINOR new),
  - `SCOPE-REVISION.md` R6.1–R6.12 (round-1) + R7.1–R7.12 (round-2) — read at commits `2a7393f29` and `9acfd7b47`,
  - `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md` (R5.6/R6.10 binding restatement, R7 alignment §7),
  - `spec-critique/R6-CLASSIFICATION.md` (PERF-1..PERF-22 routing),
  - `spec-critique/SHIPPED-CODE-DEFECTS.md`,
  - `docs/redesign_2026_07/PLAN-3.6-SPEC.md`,
  - `docs/redesign_2026_07/VERIFICATION-STANDARD.md`,
  - `git show codex/f1-spec-complete:docs/redesign_2026_07/plans/2026-07-17-f1-plan4-cleanup-migration-dataset.md` (read-only from `/tmp/plan4-cleanup.md`).
**Out of scope:** sec/anti-stub/aikeys re-critiques (own reports); AI plan D8 (later); Plan 2/3 hot items; R1–R5 settled context (`F1-STATUS-MAP.md`, `PRE-PROD-REVIEW-*.md`, `ERU-DATASET-RESEARCH.md` — re-litigation forbidden by brief).
**Method:** static read of R6/R7 text and prior two reports; targeted greps against the shipped tree for `__init__.py:1535`, `remote_config/` existence, `scripts/requirements-build*` paths, `tests/` migration-smoke matrix. No commits, no live build, no HA deploy.

---

## Header

**0 CRITICAL / 1 MAJOR / 2 MINOR (new R7-specific findings).**

Prior-finding verdict: **8 CLOSED / 13 PARTIALLY-CLOSED / 1 OPEN** out of 22 prior findings.

R7 closes **two** PARTIAL prior findings via `R7.5` (`scripts/requirements-build.txt` + `.lock` policy): PERF-4 (F-1.4, build-only requirements path) and PERF-20 (F-5.1, same). The remaining 13 PARTIAL gaps and the 1 OPEN gap (PERF-18 — blocking-transform risk, F-4.2) are **NOT** addressed by any R7 clause; R7 is a security/anti-stub/aikeys closure round, not a perf closure round. The 3 MAJOR new findings from R6 round 1 (PERF-NEW-1, -2, -3 — all numeric-budget gaps on existing clauses R6.5/R6.11/R6.12) are inherited unchanged. R7 does add **one** new MAJOR (PERF-NEW-R7-A on `R7.12`) and two MINORs on the build-install CI budget (`R7.5`) and the smoke-test runtime budget (`R7.4`). 0 CRITICAL is a legitimate outcome: no R6/R7 clause specifies a blocking event-loop design, and the inbound outbound call (`/solar_test`) is bounded by R6.5 + R7.3 rate-limit + error classification (the *number* still missing).

---

## Section 1 — prior-finding verdict

Id maps to `R2-PERF-perf.md` `F-x.y` rows and `R6-CLASSIFICATION.md` `PERF-N` rows. Counts: **8 CLOSED / 13 PARTIAL / 1 OPEN**.

| id | round-1 verdict | round-2 verdict | evidence (file:clause) | what is still missing |
|---|---|---|---|---|
| F-1.1 / PERF-1 (MINOR) — `load_pricelists` no in-process cache | PARTIAL | **PARTIAL** | `SCOPE-REVISION.md:229-232` R6.11 ("cache discipline and measurable test coverage for repeated loads"); R7 has no perf cache clause (R7 is sec/anti-stub/aikeys) | same gap: cache location not specified, no per-call hit assertion, no max age |
| F-1.2 / PERF-2 (MINOR) — pricelist size budget missing | PARTIAL | **PARTIAL** | `SCOPE-REVISION.md:184-188` R6.2 (byte-equivalent build artifact); R7.5 (lock); R7.10 (auth matrix) | R6.2 numeric **floor** on coverage (closes 50%); R7 has no size **ceiling**. Same gap as round 1 |
| F-1.3 / PERF-3 (MINOR) — no loop-blocking timer test | PARTIAL | **PARTIAL** | `SCOPE-REVISION.md:229-232` R6.11 ("measurable test coverage for repeated loads"); R7 has no timer test | the `time.perf_counter()` budget for `load_pricelists()` / `load_ai_models()` not named; no N-ms test |
| F-1.4 / PERF-4 (MINOR) — build-only requirements path | PARTIAL | **CLOSED** | `SCOPE-REVISION.md:265-267` R7.5: "`scripts/build_pricelists.py` uses the explicit build requirement files `scripts/requirements-build.txt` and `scripts/requirements-build.txt.lock`, and build execution uses pinned hashes from the lock file"; `SCOPE-REVISION.md:267` "build bootstrap command is explicit (`python -m pip install --require-hashes -r scripts/requirements-build.txt`) and must be documented alongside failure rule when locks diverge"; implementation brief `IMPLEMENTATION-BRIEF-EN.md:163` carries R7.5 forward | lock policy adds CI build perf cost (see PERF-NEW-R7-B MINOR); the runtime-perf gap is closed |
| F-1.5 / PERF-5 (MINOR) — no CI gate openpyxl ∉ manifest | PARTIAL | **PARTIAL** | `SCOPE-REVISION.md:184-188` R6.2 ("CI must compare canonical byte output to checked-in release bytes and fail on any mismatch"); R7.5 adds lock + hash | R7.5 closes the **build-side** hash drift; R6.2 closes the **build-output** drift; **runtime manifest.json gate is not yet named as an explicit CI step** in any R6/R7 clause — openpyxl could still leak into runtime manifest without a named check |
| F-2.1 / PERF-6 (MINOR) — `GET /pricelists` server-side cache | PARTIAL | **PARTIAL** | `SCOPE-REVISION.md:229-232` R6.11; R7.10 binds admin-only auth but not cache | R7 added /pricelists auth gating (R7.10) but did not add any cache detail; same gap as round 1: no `lru_cache(1)` / no wire-format ETag |
| F-2.2 / PERF-7 (MINOR) — immutable per release not tied to cache lifetime | PARTIAL | **PARTIAL** | same as F-2.1 | R6.3 (`valid_from` / `stale_warning`) closes data-side; R7.6 (`SCOPE-REVISION.md:271-275`) unifies snapshot selection but does not bind cache lifetime to release; same gap as round 1 |
| F-2.3 / PERF-8 (**MAJOR**) — `POST /solar_test` no timeout | **CLOSED (round 1)** | **CLOSED (round 2)** | `SCOPE-REVISION.md:200-203` R6.5 ("bounded (timeout), and rate-limited; errors must be classified"); R7.3 (`SCOPE-REVISION.md:253-257`) classifies the error surface but does not add the numeric timeout — see PERF-NEW-R7-A for the still-open numeric half | see PERF-NEW-R7-A; rate-limit bucket must be shared with replacement-verify (R7.12) |
| F-2.4 / PERF-9 (MINOR) — session reuse not specified | PARTIAL | **PARTIAL** | `SCOPE-REVISION.md:200-203` R6.5; `SCOPE-REVISION.md:253-257` R7.3 | R7.3 adds logging/redaction but does not bind `aiohttp_client.async_get_clientsession(hass)` reuse; same gap as round 1 |
| F-2.5 / PERF-10 (MINOR) — repeated-click throttle | **CLOSED (round 1)** | **CLOSED (round 2)** | `SCOPE-REVISION.md:203` R6.5 falsification "100% repeated click test that does not turn into unbounded repeated upstream calls"; R7.3 layers classification but does not regress the falsification | — |
| F-2.6 / PERF-11 (MINOR) — `/config_registry` not ETag-aware | PARTIAL | **PARTIAL** | `SCOPE-REVISION.md:229-232` R6.11 | ETag wire-format still not bound; R7 has no ETag clause |
| F-2.7 / PERF-12 (MINOR) — `/module_config` redundant cold-open fetches | **CLOSED (round 1)** | **CLOSED (round 2)** | `SCOPE-REVISION.md:232` R6.11 "no unbounded duplicate config fetches on one wizard open" | R7.10 (`SCOPE-REVISION.md:295-299`) layers admin-only auth but does not regress this falsification |
| F-3.1 / PERF-13 (MINOR) — pricing in main bundle | PARTIAL | **PARTIAL** | `SCOPE-REVISION.md:234-236` R6.12; R7.4 / R7.6 / R7.7 / R7.8 add rendering and persistence rules but no chunk boundary | R6 round 1 verdict "routing correct, but leaves the bundle-split half of those findings uncovered; the correct disposition is PARTIAL, not CLOSED" remains valid: memoization in, lazy chunk still not specified |
| F-3.2 / PERF-14 (MINOR) — no chunk boundary for heavy pricing form path | PARTIAL | **PARTIAL** | same as F-3.1 | same gap |
| F-3.3 / PERF-15 (MINOR) — duplicate cold-open call paths | **CLOSED (round 1)** | **CLOSED (round 2)** | `SCOPE-REVISION.md:232` R6.11 | — |
| F-3.4 / PERF-16 (MINOR) — registry field list rebuilt every render | **CLOSED (round 1)** | **CLOSED (round 2)** | `SCOPE-REVISION.md:235-236` R6.12 "no repeated recomputation without stable keys" + falsification | — |
| F-4.1 / PERF-17 (**MAJOR**) — setup adds multiple sync Store writes | PARTIAL | **PARTIAL** | `SCOPE-REVISION.md:229-232` R6.11; **R7.2** (`SCOPE-REVISION.md:247-251`) closes **secret-stripping** but does not address I/O shape | R7.2 changes the secret-write path; it does not bind `hass.async_create_task` for non-critical migration I/O. The ms-budget on the already-complete fast path is still absent. **Plan 4 Task 2 Step 1 docstring** (`/tmp/plan4-cleanup.md:152-158`) confirms every Store call is **awaited** (correct), but the explicit `async_create_task` for `strip_dead_keys` in `__init__.py` setup is not specified in any clause |
| F-4.2 / PERF-18 (**MAJOR**) — transform execution path can become blocking | **OPEN (round 1)** | **OPEN (round 2)** | R7.2 / R7.1 / R7.12 do not name transform executability | Plan 4 Task 2 exposes `register_transform(fn: Callable[[Dict[str, Any]], Dict[str, Any]])` — sync only (`/tmp/plan4-cleanup.md:311`). Plan 4 Task 4 registers a sensor-first pre-seed transform; if it ever needs `await sensor.async_get_last_state()` the transform silently becomes blocking under `run_migration`, which is called from `async_setup_entry`. R6.11 / R7.x needs an explicit "transforms are synchronous and CPU-bound, OR scheduled via `hass.async_add_executor_job` / awaited via executor" rule; no clause binds it |
| F-4.3 / PERF-19 (MINOR) — idempotent migration performs unnecessary I/O | **CLOSED (round 1)** | **CLOSED (round 2)** | `SCOPE-REVISION.md:230` R6.11 "...provide explicit behavior when already-complete" | — |
| F-5.1 / PERF-20 (MINOR) — build requirements file + lock | PARTIAL | **CLOSED** | `SCOPE-REVISION.md:265-267` R7.5 (paths named, lock + hashes named, bootstrap command named, failure rule named); `SCOPE-REVISION.md:269` falsifier (remove one locked hash → build verification fails) | closed, see PERF-NEW-R7-B for the CI time-budget half |
| F-5.2 / PERF-21 (MINOR) — no CI check openpyxl ∉ runtime manifest | PARTIAL | **PARTIAL** | `SCOPE-REVISION.md:184-188` R6.2 + `SCOPE-REVISION.md:265-267` R7.5 | **runtime manifest gate still not named as a CI step.** Build-side coverage is now adequate (lock + byte-equivalence); manifest-side `grep openpyxl manifest.json` is left implicit, same as round 1 |
| F-5.3 / PERF-22 (MINOR) — JSON artifact size floor/ceiling | PARTIAL | **PARTIAL** | `SCOPE-REVISION.md:184-188` R6.2 (floor on coverage + 30 % drift); R7.5 (build-side hash gate) | R6.2 closes floor (coverage); **ceiling** on payload size + cold-parse ms not bound. Same gap as round 1 |

**SHIPPED-CODE routing in `R6-CLASSIFICATION.md`:** All 22 PERF-N rows route to `SCOPE-REVISION.md:` clauses, none to `SHIPPED-CODE-DEFECTS.md`. The routing is correct as a **direction** (no shipped code has the issue — the defects live in the spec, not in the tree, verified against the worktree: `ls custom_components/oig_cloud/remote_config/` → not a directory; `grep -rn "scripts/requirements-build" custom_components` → 0 hits; `run_migration` / `register_transform` / `strip_dead_keys` 0 hits). The R6 round-1 dispute on **PERF-13/14 → R6.12** stands: memoization is correct, bundle-split half is PARTIAL, and R7 does not close it. The R6 round-1 observation that **PERF-18 / F-4.2 → R6.11** is correct *as a clause reference* but R6.11 does not actually address transform executability — `R6-CLASSIFICATION.md` carries no partial-flag column, so the table implies CLOSED; the correct disposition is **OPEN**.

**Net round-2 movement:** 6→8 CLOSED (F-1.4, F-5.1 closed via R7.5); 15→13 PARTIAL (the two net-closing ones moved out); 1 OPEN unchanged (PERF-18, still open).

---

## Section 2 — new findings (R7-specific)

Format: id | severity | `file:clause` | cost and where it lands | measurable budget | test that measures it.

### PERF-NEW-R7-A — **MAJOR** — `SCOPE-REVISION.md:202` R6.5 + `SCOPE-REVISION.md:307-312` R7.12 — replacement-verify and manual [Otestovat] must share the same rate-limit token bucket

- **Cost / where:** R7.12 introduces a **system-triggered** `/solar_test` call path on top of the user-triggered `[Otestovat]` click: "a newly submitted solar key must pass `/solar_test` successfully before becoming active" + "provider switches requiring different credential material fail unless replacement credential is present and verified in flow." R6.5 mandates "rate-limited" but does not name the token scope. If the implementer buckets the limit per click-event (one window per R6.5 "100% repeated click" test), the replacement-verify and a manual [Otestovat] click within the same window can both pass through — two upstream calls in <30 s on a key-rotation. On `forecast.solar` / `api.solcast.com.au` that's two TLS handshakes + two provider-rate-limit consumptions. Worse, an attacker who can key-rotate the options via a benign UI path could trigger verification in a tight loop against the upstream provider.
- **Budget:** the rate-limit MUST scope to all inbound `/solar_test` calls regardless of trigger, with budget `≤ 1 outbound call per (entry_id, sane-prefix-of-body) within a 30-second sliding window` (number from R6-PERF-round1 PERF-NEW-1, the open half of F-2.3). Implementer MUST add a single in-flight tracker shared by both call sites; the R7.12 observable outcome ("no active forecast call uses an inactive secret") does not exempt the replacement-verify from the rate-limit gate.
- **Test:** an integration test seeds a stub provider, then (a) calls `POST /solar_test` with new key + body (system replacement-verify), (b) within 5 s calls `POST /solar_test` again from the same UI click path with old body (manual [Otestovat]); assert upstream stub is invoked exactly **once** within the 30 s window and the second call returns a classified `{"error": "rate_limited"}` JSON without an outbound wire call. Pair with R6.5's "100% repeated click" test extended for the trigger set.

### PERF-NEW-R7-B — MINOR — `SCOPE-REVISION.md:265-269` R7.5 — build-install + build cycle needs a CI time budget

- **Cost / where:** R7.5 mandates `python -m pip install --require-hashes -r scripts/build_pricelists.py`-prefixed pipeline before `scripts/build_pricelists.py` runs. `pip install --require-hashes` revalidates the lock against every CI run; cold environments and any lock-file-flush event will pull openpyxl from PyPI. Build-machine variance on `pip install --require-hashes` ranges 5-40 s depending on cache state. Without a CI time budget, this silently adds minutes to the smoke matrix (`tests/test-migration-plan4-smoke.sh` per plan4-cleanup.md:997-1009) without any test failing.
- **Budget:** the build-install + `python scripts/build_pricelists.py` cycle MUST complete in ≤ 90 s on the CI runner (averaged across 5 runs, dropping the slowest); the smoke-matrix shell exit must annotate the wall time and fail if the budget is exceeded by >20 %. The lock file MUST be cached across CI runs (a `~/.cache/pip` keyed at the lock-hash level) so the per-run cost amortizes to <5 s on warm cache.
- **Test:** an instrumented `tests/test-migration-plan4-smoke.sh` (per plan4-cleanup.md:996-1009) that wraps the install+build with `time` and fails the matrix if `real > 90s`. Local-dev runs are not bound; only the CI runner gate applies.

### PERF-NEW-R7-C — MINOR — `SCOPE-REVISION.md:259-263` R7.4 — production dashboard DOM assertion needs a CI-runtime budget

- **Cost / where:** R7.4 mandates a production-mounted dashboard render test asserting `[data-testid=dashboard-primary]` + navigation presence + no onboarding blocker for grandfathered state. The natural implementation is a Playwright run against the served dashboard (current F1-DESIGN §7 path uses browser verification, per VERIFICATION-STANDARD P4). Each Playwright run is 3-15 s wall time. Without a CI budget, this test becomes the flaky gate that reddens the smoke matrix on transient CI runner hiccups (the failure mode seen in the R2 round 2 critique when Plan 3's wizard tests passed locally but failed in CI on rendered-dom flakiness — the very reason VERIFICATION-STANDARD Rule 3 exists).
- **Budget:** the R7.4 falsifier MUST complete within ≤ 10 s wall time on the CI runner (p95 over the last 50 PRs); the test MUST retry once on failure before marking red, and the retry budget MUST be subtracted from the 10 s assertion so an honest 12-s run fails the budget rather than masking it. Locally the test should remain instant in headless mode; CI cost is what gets bounded.
- **Test:** an instrumented wrapper around the R7.4 test that captures `performance.now()` deltas across the mount and asserts a `≤ 10000 ms` ceiling; a separate CI-time-tracker that records p95 across PRs and alerts (not blocks) on p95 > 12 s.

---

## Section 3 — what I could NOT establish

- **Live cost of `load_pricelists()` cold parse.** unchanged from R6 round 1: the shipped `data/pricelists.json` does not exist yet (`ls custom_components/oig_cloud/remote_config/` → `No such file or directory`); the build script is to-be-generated by `scripts/build_pricelists.py`. The 5-15 ms cold-parse estimate is informed but not measured against the actual artifact. The R7.5 lock + hash policy will make the build reproducible; the resulting artifact size is still unmeasured.
- **Live wire-timing budget for `/solar_test` provider round-trips.** the endpoint does not exist; `POST /solar_test` is to-be-built per R5.3/R6.5/R7.3/R7.12. The PERF-NEW-R7-A "30-second sliding window" number is a defensive spec-side budget, not a measured provider round-trip. Actual provider cold-TLS to `forecast.solar` / `api.solcast.com.au` is 100-300 ms per `establish_connection`; a hot-session round-trip is 1-2 s. Recommend re-measuring once the handler ships.
- **Whether R7.4's dashboard DOM assertion lands in Playwright or in a lighter `lit-html` test.** the spec binds the user-observable outcome (DOM contains `[data-testid=dashboard-primary]`) but not the testing mechanism. PERF-NEW-R7-C budgets against a 10 s CI ceiling assuming a Playwright run; if the implementer lands a faster unit-level render check (vitest + `@open-wc/testing` without a real browser), the budget shifts and the assertion needs adjustment. The 10 s ceiling holds for any mechanism that mounts the actual component tree under a real DOM.
- **Whether the R7.5 lock-step installs in CI as a separate job or as part of Task 9 smoke.** the smoke matrix at plan4-cleanup.md:996-1009 omits an `install --require-hashes` step (it lists pytest invocations only). The install step is implied by R7.5 but the smoke matrix does not name it as a CI stage. PERF-NEW-R7-B budgets against "the smoke matrix shell exit"; the smoke matrix itself does not yet contain the install step.
- **Whether R7.10's non-admin matrix test is wired into the auth-fuzz layer or lives in `tests/test_ha_rest_api_views.py`.** the spec binds the matrix but does not name the test file; the existing module_config POST admin test lives there. PERF-NEW-R7-C implicitly assumes the R7.4 test lands alongside it; if it lands elsewhere, the CI budget assertion needs the matching test-path grep.
- **Whether the new R7.12 verify-on-replacement call path uses the same provider stub as the manual [Otestovat] handler.** the spec binds behavior at both ends but does not bind code reuse. If the implementer copies the forecast-fetch code rather than calling a shared helper, the rate-limit token bucket becomes per-call-site (the bug PERF-NEW-R7-A warns about), regardless of what the spec says.
- **What the eventual wizard cold-start wall time is.** R7.7 / R7.8 mandate full-form save-on-step-transition. Today the wizard cold-mount triggers ~4 REST calls (per R2 round 2 §3.2); the new save-and-reload rule adds a `POST /onboarding` per step, which on RPi-class hardware could push cold-mount to 500-700 ms. Not measured; not bounded; recommend a follow-up perf slice once the wizard PR lands.

---

## Summary for the operator

- **Prior round:** **8 of 22 prior findings closed** (up from 6 in R6 round 1), **13 partially closed** (down from 15), **1 OPEN** unchanged (PERF-18 — blocking-transform risk on `_TRANSFORMS` registered via Plan 4 Task 2/4, the only prior finding that R6, R7, and the implementation brief all leave unaddressed).
- **R7 movement was narrow but real:** R7 closed F-1.4 / PERF-4 and F-5.1 / PERF-20 via `R7.5` (explicit `scripts/requirements-build.txt` + `.lock` paths with `--require-hashes`). It also closed nothing else for perf — R7 is a security/anti-stub/aikeys closure round.
- **The 3 MAJORs from R6 round 1 (PERF-NEW-1, -2, -3 — numeric budgets on R6.5 / R6.11 / R6.12) remain open in R7.** R7.3 / R7.10 / R7.12 inherit those clauses verbatim; no number was added.
- **R7 adds 1 MAJOR + 2 MINOR (this slice).** The MAJOR is on R7.12 / R6.5: the new system-triggered verify-on-replacement must share the rate-limit bucket with the manual [Otestovat] click, and the spec does not name the bucket scope.
- **Highest-leverage spec edits before implementation:**
  1. Add the literal number to R6.5 line 202 (`timeout=10` server-side hard cap, `1 in-flight / (entry_id, sane-prefix-of-body) / 30 s window` rate) — INHERITED from R6 round 1 PERF-NEW-1; partially re-stated under PERF-NEW-R7-A.
  2. Add the literal count to R6.11 line 232 (`≤ 1 fetch per endpoint per wizard open`; `setup_entry setup time ≤ 50 ms` already-migrated) — INHERITED from R6 round 1 PERF-NEW-2.
  3. Add the literal time/invocation bound to R6.12 line 235 (`fieldsFromRegistry called ≤ 1 per render`; `≤ 16 ms` per Step 2/3 render in fixture) — INHERITED from R6 round 1 PERF-NEW-3.
  4. Bind transform-executability (still OPEN from R2 round 2 / F-4.2 / PERF-18): sync-only OR executor via `hass.async_add_executor_job`. The Plan 4 Task 2 signature `Callable[[Dict[str, Any]], Dict[str, Any]]` is sync-only; Plan 4 Task 4's sensor-first pre-seed will break it.
  5. Bind a named CI step that fails the build if `openpyxl` appears in `custom_components/oig_cloud/manifest.json` (F-1.5 / PERF-5 / PERF-21 still PARTIAL — R6.2 + R7.5 cover build-side and hash-side but neither names the runtime-manifest gate explicitly).
  6. NEW: bind the rate-limit token bucket scope across R6.5 + R7.12 (PERF-NEW-R7-A) so replacement-verify and manual [Otestovat] share the gate.
  7. NEW: add a CI time budget for the R7.5 install+build cycle (PERF-NEW-R7-B); a separate CI wall-time budget for the R7.4 dashboard DOM assertion (PERF-NEW-R7-C).

End of report — STOP.
