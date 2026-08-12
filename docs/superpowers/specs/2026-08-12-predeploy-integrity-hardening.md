# Pre-deploy planner and Recorder integrity hardening

Status: operator-approved design

Target branch: `codex/wizard-v2-auth-fix`

Design base: `bf99703811574321b4f165626ed3b12d9edd74ec`

## Objective

- Remove four release-blocking defects found before direct Home Assistant deployment.
- Keep battery plans internally consistent across asynchronous work.
- Prevent forecast retry callbacks from surviving entity teardown.
- Reject invalid daily PV energy before Home Assistant state and Recorder statistics.
- Preserve the existing `dc_in_fv_ad` entity/statistic identity and history while migrating from `TOTAL_INCREASING` to daily-cycle `TOTAL` semantics.
- Retain direct `deploy_to_ha.sh` delivery without GitHub after implementation, review, and release gates succeed.

## Confirmed defects

### Battery-floor snapshot race

- Planner readiness reads the live BOX `bat_min` sensor.
- Asynchronous input collection then runs.
- `_run_planner()` reads `bat_min` again.
- A changed or unavailable value can make readiness accept one floor and planning use another.
- The inconsistent result is still summarized, published, broadcast, persisted, and may reach optional auto-switch behavior.

### Forecast retry after unload

- `schedule_forecast_retry()` owns a Home Assistant timer unsubscribe handle on the sensor.
- `handle_will_remove()` does not call it.
- The timer callback has no lifecycle identity.
- A callback captured before unload can schedule `async_update()` for a retired entity.

### Invalid daily energy publication

- `dc_in.fv_ad` is published as an energy `TOTAL` sensor without value validation.
- Negative, boolean, malformed, non-finite, or extreme values can reach Home Assistant state.
- Home Assistant Recorder accepts a negative delta and durably reduces the statistics sum.

### First reset-marker migration overcount

- Existing installations retain `TOTAL_INCREASING` Recorder history for the same entity/statistic ID.
- The new implementation publishes `TOTAL` plus a non-null `last_reset` immediately.
- Home Assistant Recorder treats the first marker as a new cycle and adds the full current counter to the retained sum.
- The validated upgrade sequence `1000 -> 1100`, then `1200` with a first marker, produces `1300 Wh` instead of `200 Wh` continuity.

## Accepted contracts

### 1. Immutable BOX floor snapshot

- Capture one validated BOX floor snapshot before any awaited planner input collection.
- Snapshot fields are immutable and secret-free:
  - source entity ID;
  - validated percentage or `None`;
  - reason class;
  - raw state token;
  - state `last_updated` identity;
  - local/cloud configuration class.
- Readiness, hardware-floor resolution, planning minimum, and result metadata consume this exact snapshot.
- `_run_planner()` must not read the live BOX floor.
- Immediately before the first result side effect, capture the current identity again.
- If identity differs, discard the complete calculation and leave the bucket open.
- Discard means no summary event, result application, daily-plan write, housekeeping mutation, dependent dispatch, HA state write, coordinator mutation, persistence, or auto-switch action.
- Stable identity retains current planner behavior.

### 2. Retry lifecycle ownership

- Sensor initialization owns `_forecast_lifecycle_generation` and `_forecast_lifecycle_active`.
- A successful entity add activates a new generation.
- Each retry callback captures that generation.
- Teardown marks the generation inactive before any unsubscribe or superclass removal.
- Teardown calls the retry unsubscribe exactly once and clears the stored handle.
- A callback already dequeued before teardown checks active state and generation before scheduling work.
- Stale callbacks are inert: no task creation, update, state publication, persistence, broadcast, or device action.
- Active same-generation retries still execute once.

### 3. Daily-energy validation

- Validation applies only to the explicitly configured `dc_in_fv_ad` daily energy sensor.
- Accept integers, floats, and base-10 numeric strings that produce a finite value in the inclusive range `0..1_000_000_000 Wh`.
- Reject booleans, empty text, malformed text, NaN, infinity, negative values, and values above `1_000_000_000 Wh`.
- Classify every sample as exactly one of `ok`, `boolean`, `empty`, `malformed`, `non_finite`, `negative`, or `above_max`.
- A rejected sample never becomes Home Assistant state and never reaches Recorder.
- Preserve the last valid in-memory state; otherwise use the restored state; otherwise return unavailable.
- Log only a rate-limited reason class and sensor type. Never log the raw sample or exception text. Rate-limit each reason class to one diagnostic per entity per 300 seconds.
- Cloud and local-proxy data use the same validation path.

### 4. Recorder-safe daily-cycle migration

- Preserve the existing entity ID, unique ID, state class target, statistic ID, unit, and Recorder history.
- Use Home Assistant `RestoreEntity` extra data; add no separate Store and no config-entry migration.
- Persist a versioned, secret-free marker record:

```json
{
  "daily_cycle_marker": {
    "version": 1,
    "armed": false,
    "last_value_wh": 19497.0,
    "last_local_date": "2026-08-11"
  }
}
```

- Fresh entity with no restored state starts armed and keeps current daily-cycle behavior.
- Restored entity with valid versioned extra data resumes the stored state.
- Restored entity with state but no marker extra data is a legacy migration and starts unarmed.
- Malformed marker extra data fails closed to the legacy unarmed state when a restored state exists.
- While unarmed, `last_reset` is `None`.
- A proven rollover requires both:
  - current Home Assistant local date is later than the retained pre-boundary date;
  - the new validated counter is strictly lower than the retained pre-boundary counter.
- Stale pre-midnight data observed after midnight does not arm the marker and does not replace the retained pre-boundary reference.
- Same-day valid updates may refresh the retained reference.
- On the first proven rollover, arm before Home Assistant publishes that lower sample so Recorder sees the correct new local-midnight marker with the reset value.
- Once armed, remain armed across restarts and continue deriving `last_reset` from `dt_util.start_of_local_day()`.
- Never rewrite or delete existing Recorder rows.

## Verification contract

- Use TDD. Every behavior group must show a valid assertion RED before production edits and focused GREEN afterward.
- Use real Home Assistant 2026.8.1 Recorder for migration and invalid-sample persistence tests.
- Required concurrency/lifecycle tests:
  - BOX floor changes during an awaited input collection;
  - floor changes after planning but before commit;
  - unload before timer delivery;
  - callback dequeued before unload;
  - repeated teardown;
  - stable active retry.
- Required migration tests:
  - fresh install;
  - legacy restored state, first same-day sample;
  - stale previous-day high sample after midnight;
  - proven lower rollover;
  - restart while unarmed;
  - restart after arming;
  - malformed extra restore data;
  - real Recorder continuity from legacy `TOTAL_INCREASING` history.
- Required invalid-value table: boolean, empty, malformed, NaN, positive infinity, negative infinity, negative number, and above-cap value for cloud and local-shaped coordinator data.
- Canonical full Python coverage must remain above `80.01%`.
- Flake8, Mypy, canonical Pylint E0/F0, security diff scan, Bandit, Gitleaks, dependency classification, and two consecutive all-files pre-commit runs must pass for introduced code.
- HP `agent-ops` implementation requires an attributed different-model review worker and frozen review bundle.
- Direct deployment remains blocked until local integration, exact release-toolchain checks, config check, backup, restart readiness, OIG-scoped log review, entity availability, calculation invariants, and one natural solar wall-clock refresh succeed.

## Non-goals

- No entity rename or statistic-ID fork.
- No Recorder database rewrite.
- No bulk deletion of historical statistics.
- No dependency upgrade in this slice.
- No frontend source or distribution change.
- No change to solar provider/scheduler contracts already reviewed.
- No GitHub push or PR is required for the operator-authorized direct deployment.
