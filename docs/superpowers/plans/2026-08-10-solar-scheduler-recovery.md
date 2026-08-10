# Solar wall-clock scheduler and stale recovery implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh solar forecasts at deterministic Home Assistant local times, recover from transient failures, and never publish partial, stale-as-current, or post-unload state.

**Architecture:** Refactor provider fetches to return a classified candidate instead of mutating sensor state. A primary-sensor refresh controller owns wall-clock subscriptions, one lock, occurrence generations, retry handles, and lifecycle cancellation. A versioned cache envelope records provenance; candidate validation and persistence complete before one atomic publish step.

**Tech Stack:** Python 3.14, Home Assistant event helpers, asyncio, HA Store, pytest, freezegun/HA time helpers.

---

## Contract references

- Design: `docs/superpowers/specs/2026-08-10-wizard-v2-auth-solar-design.md`
- Sensor: `custom_components/oig_cloud/entities/solar_forecast_sensor.py`
- Key revision source: `custom_components/oig_cloud/config/solar_key_store.py`
- Existing tests: `tests/test_entities_solar_forecast_sensor*.py`
- Service tests: `tests/test_services_actions_coverage.py`

### Task 1: Introduce classified fetch outcomes with RED tests

**Files:**

- Add: `custom_components/oig_cloud/forecast/refresh_result.py`
- Add: `tests/test_solar_refresh_result.py`
- Modify: `tests/test_entities_solar_forecast_sensor_more4.py`

- [ ] Define RED tables for accepted, retryable (`timeout`, `connection`, `rate_limited`, `server_error`), and terminal (`auth`, `forbidden`, `invalid_config`, `not_found`, `unprocessable`, `invalid_response`, `cancelled`) outcomes.
- [ ] Require `SolarFetchResult` to carry `accepted`, `retryable`, safe `code`, and optional complete candidate; never raw exception/body/credentials.
- [ ] Correct the old manual-success test: a provider returning no accepted candidate must yield `False` and must not advance response time.
- [ ] Run `pytest -q tests/test_solar_refresh_result.py tests/test_entities_solar_forecast_sensor_more4.py`; expect missing type and old truthfulness failure.
- [ ] Implement the immutable result type and fixed classification helpers.

### Task 2: Make provider fetches side-effect-free and candidate-based

**Files:**

- Modify: `custom_components/oig_cloud/entities/solar_forecast_sensor.py`
- Modify/add focused provider tests in `tests/test_entities_solar_forecast_sensor.py` and `tests/test_entities_solar_forecast_sensor_more4.py`

- [ ] Add RED tests asserting Forecast.Solar and Solcast fetch functions return candidates without changing `_last_forecast_data`, `_last_api_call`, coordinator state, HA state, storage, or broadcasts.
- [ ] Cover timeout/connection/429/5xx as retryable; 401/403/400/404/422/config as terminal; cancellation is re-raised or returned terminal without logging raw data.
- [ ] Cover malformed/empty/error-bearing HTTP-200 and missing enabled-string data as terminal `invalid_response`.
- [ ] Refactor `_fetch_solcast_data`, Forecast.Solar string fetches, and `async_fetch_forecast_data` to return `SolarFetchResult`; remove all direct commit side effects from provider branches.
- [ ] Keep safe provider diagnostics; never log response bodies or credential-bearing URLs.
- [ ] Run focused tests; expect green.

### Task 3: Define accepted snapshots and atomic commits

**Files:**

- Add: `custom_components/oig_cloud/forecast/cache_contract.py`
- Add: `tests/test_solar_cache_contract.py`
- Modify: `custom_components/oig_cloud/entities/solar_forecast_sensor.py`

- [ ] Add RED validation tables: mapping shape, parseable response time, no error, finite non-negative numbers, local today/tomorrow, every enabled Forecast.Solar string, Solcast aggregate plus derived string ratios.
- [ ] Add RED tests for empty data, partial strings, recent-but-no-tomorrow, NaN/infinity, negative values, malformed dates, and error-bearing payloads.
- [ ] Add RED atomicity tests: storage failure, generation change, and unload between fetch/save/publish leave prior memory/coordinator/state/broadcast unchanged.
- [ ] Add RED durable-boundary tests: unload/cancel before HA Store atomic save completes leaves the old envelope; save completion before lifecycle invalidation makes the candidate authoritative, emits no removed-entity state, and replacement setup loads/publishes it exactly once.
- [ ] Add RED cancellation-race tests where caller cancellation arrives immediately before, during, and immediately after Store completion. The tracked save task is shielded and reconciled; durable outcome is observed exactly once before unload returns.
- [ ] Add RED idempotency test: duplicate callback for the same occurrence commits/broadcasts once.
- [ ] Implement pure `validate_forecast_candidate` and an `async_commit_candidate` sequence: generation check, create/track Store save task, await with `asyncio.shield`, reconcile its result after caller cancellation, generation check, then one memory/coordinator/state/broadcast publish. Treat save completion as the durable commit boundary and reconcile it on replacement setup.
- [ ] Make manual refresh return `True` only after `async_commit_candidate` succeeds.

### Task 4: Add cache provenance and safe v1 adoption

**Files:**

- Modify: `custom_components/oig_cloud/config/solar_key_store.py`
- Modify: `custom_components/oig_cloud/entities/solar_forecast_sensor.py`
- Modify: `custom_components/oig_cloud/forecast/cache_contract.py`
- Add/modify: `tests/test_solar_key_store.py`
- Modify: `tests/test_entities_solar_forecast_sensor_more2.py`

- [ ] Consume the provider-plan key store's non-secret monotonically increasing revision from committed activations/clears; never expose credential values and never increment it for `/solar_test`.
- [ ] Define cache envelope schema `2`: entry ID, provider, normalized non-secret fingerprint, credential revision, last accepted time, response payload, saved time.
- [ ] Add optional scheduled-retry recovery fields: occurrence ID/local instant, completed attempt index, next-at instant, safe code, and matching provenance. Initial/manual failure must never populate them.
- [ ] Fingerprint provider/mode/enabled flags/kWp plus Forecast.Solar GPS/tilt/raw stored azimuth. Exclude Solcast geometry; use credential revision for Site ID/API-key change.
- [ ] Change new storage ownership to include ConfigEntry ID. If new storage is absent, read the legacy box-only envelope once as stale fallback; missing provenance can never be current and triggers immediate fetch.
- [ ] Add RED tests for provider, azimuth/GPS/tilt/kWp, credential revision, mode, enabled strings, and reused box ID mismatch.
- [ ] Add RED tests: matching schema-2 cache under 24h with today/tomorrow skips startup fetch; provenance mismatch or recent cache lacking tomorrow triggers it; failed replacement retains stale fallback.
- [ ] Add a persisted/runtime forced-stale reason for provenance mismatch. RED: even a recent today/tomorrow fallback exposes `forecast_stale=true` and `stale_reason=provenance_mismatch` until a matching accepted commit clears both.
- [ ] Add restart RED tests: future retry is restored; overdue retry within the original `+45m` horizon runs once; exhausted/terminal/newer/provenance-mismatched retry state is cleared; no duplicate initial call is introduced.
- [ ] Make occurrence ID restart-stable from ConfigEntry ID, mode, and scheduled local ISO instant including offset. Lifecycle generation remains a separate in-memory guard. RED: restart changes generation but restores the same occurrence once.
- [ ] Define setup precedence in tests and code: valid matching retry state restores/runs first and suppresses cache-driven initial fetch; absent/cleared retry state then applies cache usability and may fetch initially.
- [ ] Implement envelope load/save and provenance comparison. Do not rewrite legacy storage on read; leave the box-only legacy envelope untouched and write schema 2 only under the ConfigEntry-specific key after accepted data.
- [ ] Prove backward rollback with a previous-artifact cache-reader fixture: it ignores the entry-specific schema-2 key and retains legacy behavior without destructive conversion.

### Task 5: Implement primary-only wall-clock subscriptions

**Files:**

- Modify: `custom_components/oig_cloud/entities/solar_forecast_sensor.py`
- Modify: `tests/test_entities_solar_forecast_sensor.py`
- Modify: `tests/test_entities_solar_forecast_sensor_more.py`

- [ ] Replace direct `_periodic_update` hour-gate tests with registration and event-firing tests using Home Assistant time helpers.
- [ ] RED: setup at Europe/Prague `10:42`; local `12:00` fires one daily-optimized occurrence regardless of startup minute/second.
- [ ] RED: daily-optimized fires local `06:00/12:00/16:00`; daily fires local `06:00`; no UTC substitution or catch-up.
- [ ] RED: Prague spring/fall transition days fire each target exactly once.
- [ ] RED: secondary string sensors register no wall-clock or interval subscription and never fetch.
- [ ] Implement `async_track_time_change` for daily modes with HA local hours/minute/second. Retain true interval scheduling for hourly/every-4h and no schedule for manual.
- [ ] Remove `_should_fetch_daily*` minute-window gates.

### Task 6: Implement occurrence retries and overlap control

**Files:**

- Modify: `custom_components/oig_cloud/entities/solar_forecast_sensor.py`
- Add: `tests/test_solar_refresh_scheduler.py`

- [ ] RED: one occurrence attempts immediately, then exactly at `+15m` and `+45m`; two retry failures create no fourth call.
- [ ] RED: success at any attempt cancels remaining work; terminal failure schedules none.
- [ ] RED: newer occurrence cancels older retry handles and old generation cannot commit.
- [ ] RED: simultaneous manual/scheduled/initial callbacks serialize through one `asyncio.Lock`; no provider overlap.
- [ ] RED: lock wait plus provider call has one 90-second total attempt deadline. Timeout releases the lock, scheduled occurrence classifies retryable, manual call returns false, and later work proceeds.
- [ ] RED: duplicated callbacks for one occurrence create exactly one provider dispatch,
  one owned retry chain, and one commit/broadcast; occurrence ownership is claimed before
  lock wait or provider I/O.
- [ ] Implement occurrence ID from entry/mode/scheduled local instant, never lifecycle generation. Persist retry state before arming its timer and calculate delays relative to the original occurrence, not request completion. Clear persisted/timer state on success, terminal failure, final exhaustion, newer occurrence, or provenance mismatch. Unload cancels the in-memory timer/task but retains matching durable retry state for restart.
- [ ] RED persistence faults: retry-state Store failure arms no timer and terminates with safe `storage_failed`; crash after persistence/before timer registration is restored exactly once; timer-registration failure dispatches nothing and leaves the durable record for restart recovery.
- [ ] Wrap lock acquisition and provider I/O in one 90-second attempt deadline; never leave an orphaned provider task after timeout.
- [ ] Use one primary-sensor lock for initial, scheduled, retry, and manual paths.

### Task 7: Make unload cancellation complete

**Files:**

- Modify: `custom_components/oig_cloud/entities/solar_forecast_sensor.py`
- Modify: `tests/test_entities_solar_forecast_sensor_more2.py`
- Modify: `tests/test_entities_solar_forecast_sensor_more3.py`
- Modify: `tests/test_solar_refresh_scheduler.py`

- [ ] RED: unload with active initial/scheduled/retry/manual tasks cancels and awaits the unified set; all unsubscribers run once.
- [ ] RED: unload during provider await, storage await, and lock wait produces no subsequent storage/coordinator/state/broadcast write and no pending task warning.
- [ ] RED: unload waits for shielded durable-write reconciliation; it may cancel refresh callers but never abandons the Store task or publishes from the removed entity.
- [ ] RED: repeated removal is idempotent.
- [ ] Register every task-producing callback through one task factory and track initial/scheduled/retry/manual refreshes. Manual refresh registers the current task while active.
- [ ] On removal, set removed first, increment lifecycle generation, unsubscribe, cancel the unified task set except the current removal task, await it with cancellation collected, then call superclass removal.
- [ ] Re-check lifecycle immediately before persistence and publish.

### Task 8: Add stale-recovery integration/E2E coverage

**Files:**

- Add: `tests/e2e/test_solar_scheduler_recovery_e2e.py`
- Modify: `tests/test_services_actions_coverage.py`
- Modify frontend stats tests covering `forecast_stale`

- [ ] Scenario: accepted initial forecast, advance two days, verify stale; fire next local occurrence, accept new today/tomorrow data, verify response time advances, age below 24h, covers tomorrow true, stale false.
- [ ] Scenario: transient 429 then timeout then success at `+45m`; old card remains visible during failures and clears stale after commit.
- [ ] Scenario: terminal auth/config failure preserves old card, creates no retry, and manual service returns false.
- [ ] Scenario: restart between attempts restores the exact pending `+15m`/`+45m` recovery without duplicate dispatch; restart after a durable pre-unload save publishes the committed snapshot once.
- [ ] Run focused E2E and assert no leaked pending tasks at teardown.

### Task 9: Verify and commit the scheduler slice

**Files:** all scheduler/cache files above

- [ ] Run all `tests/test_entities_solar_forecast_sensor*.py`, cache/key-store/scheduler tests, service tests, and stale E2E.
- [ ] Run full Python unit coverage plus Flake8, Mypy, Pylint, pre-commit, Bandit, and dependency security gates from the quality plan.
- [ ] Run `git diff --check`; inspect cancellation paths and safe logs manually.
- [ ] Commit only this slice: `fix: schedule solar refreshes on local wall clock`.
