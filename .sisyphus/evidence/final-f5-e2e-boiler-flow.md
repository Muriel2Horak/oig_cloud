# F5 — End-to-End Boiler Flow QA Evidence

**Date:** 2026-04-26  
**Scope:** `setup → plan → actuate → override → TTL expiry → recompute → restart restore/recover`  
**VERDICT: APPROVE**

---

## Executive Summary

All stages of the canonical boiler end-to-end flow are covered by passing targeted tests. Both the happy path and explicit degraded/safe-hold failure branches are verified. The one set of unrelated test failures (2 tests in Task 1 routing checking for hardcoded inverter SN in frontend dev defaults) is documented as an exclusion — it does not affect the boiler e2e flow.

---

## Stage-by-Stage Verification

### Stage 1: Setup (Config Flow)

**Test file:** `tests/test_config_flow_boiler_setup.py`  
**Command:**
```bash
python -m pytest tests/test_config_flow_boiler_setup.py -q
```
**Result:** `27 passed, 0 failed`  
**Coverage:**
- 5-screen simple path (box_id/volume → thermometers → primary heating → alt source → comfort profile)
- Expert path preserved as non-default branch
- Incomplete setup guard (`boiler_setup_complete` flag prevents enabling with incomplete config)
- Step count validation (15 steps with all modules + simple boiler)
- Dynamic reveal of bottom thermometer field on screen 2

### Stage 2: Planner — Comfort-Safe Plan Production

**Test files:** `tests/test_boiler_task6a_planner_core.py`, `tests/test_boiler_task6b_multi_source.py`  
**Command:**
```bash
python -m pytest tests/test_boiler_task6a_planner_core.py tests/test_boiler_task6b_multi_source.py -q
```
**Result:** `18 passed, 0 failed` (11 + 7)  
**Coverage:**
- Single-source happy path reaches comfort by deadline
- Deadline comfort wins over cheaper post-deadline slots
- Unsatisfied plan heats safest achievable slots and reports gap
- Stale top temperature emits reason and applies bias
- Planner timeout returns last safe plan or safe hold
- Multi-source economic selection (grid vs FVE vs benchmark)
- Replan triggers on price/source changes

### Stage 3: Actuator — Apply Actuator Command

**Test file:** `tests/test_boiler_task7a_actuator_serializer.py`  
**Command:**
```bash
python -m pytest tests/test_boiler_task7a_actuator_serializer.py -q
```
**Result:** `36 passed, 0 failed`  
**Coverage:**
- Apply/cancel command DTOs exist and serialize correctly
- Safety priority higher than replan
- Queue bounded at 32, safety command preserved when full
- Stale plan/config versions rejected
- Consumer exception handling enters safe hold
- Rate limiting per source
- Store failure handling (load failure keeps in-memory state, save failure emits reason)
- Source availability: primary unavailable → pause + reason; alternative unavailable → downgrade to benchmark-only
- Namespaced persistence with `entry_id + box_id` key

### Stage 4: Manual Override

**Test file:** `tests/test_boiler_task7b_manual_override.py`  
**Command:**
```bash
python -m pytest tests/test_boiler_task7b_manual_override.py -q
```
**Result:** `36 passed, 0 failed`  
**Coverage:**
- Override creation requires canonical reason code
- Default TTL is 120 minutes, min 15, max 1440, 15-minute increments
- Override active blocks automatic plan commands
- Safety command allowed during override
- Override state exposes reason
- Override saved to store on create, cleared on explicit clear
- Multiple override create updates TTL
- Override commands block replan in execute and use CONFIG priority

### Stage 5: TTL Expiry → Recompute

**Test file:** `tests/test_boiler_task7b_manual_override.py` (OverrideExpiry class)  
**Command:**
```bash
python -m pytest tests/test_boiler_task7b_manual_override.py -q -k "expiry or expired"
```
**Result:** `6 passed, 0 failed`  
**Coverage:**
- `test_override_expires_after_ttl` — override expires after TTL
- `test_expired_override_clears_state` — expired override clears state
- `test_after_expiry_automatic_plan_accepted_again` — after expiry, automatic plan is accepted again

**V2 UI TTL controls:**  
**Test file:** `custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts`  
**Command:** `npx vitest run src/__tests__/boiler-v2-ui.test.ts`  
**Result:** `64 passed, 0 failed`  
**Coverage:** TTL input with default 120 min, min=15, max=1440, step=15; reason textarea with required attribute; capability gating; unavailable-state reason priority chain.

### Stage 6: Restart Restore / Recover

**Test files:** `tests/test_boiler_task9_migration_repair.py`, `tests/test_boiler_task7b_manual_override.py`  
**Commands:**
```bash
python -m pytest tests/test_boiler_task9_migration_repair.py -q
python -m pytest tests/test_boiler_task7b_manual_override.py -q -k "restart or restore or crash"
```
**Results:** `9 passed, 0 failed` (Task 9) + `11 passed, 0 failed` (Task 7b restore/crash)  
**Coverage:**
- Task 9: Restart during staged migration resumes disabled+repair state, cancels future callbacks, preserves physical output, rewrites legacy schedule to schema_version=2 empty entries
- Task 9: Modern complete/versioned configs bypass destructive migration
- Task 7b: `test_valid_override_survives_restart` — valid override survives restart
- Task 7b: `test_expired_override_cleared_on_restore` — expired override cleared on restore
- Task 7b: `test_fresh_serializer_restores_desired_state_from_store` — fresh serializer restores desired state from store
- Task 7b: Crash recovery reconciles desired vs actual, respects rate limit and plan version

### Stage 7: Canonical API (Read Model)

**Test file:** `tests/test_boiler_task10_canonical_api.py`  
**Command:**
```bash
python -m pytest tests/test_boiler_task10_canonical_api.py -q
```
**Result:** `9 passed, 0 failed`  
**Coverage:**
- Valid canonical DTO response with all required keys
- Nested shape validation
- Identity 4xx errors (wrong entry_id, wrong box_id, module disabled)
- Legacy views return deprecation when no legacy coordinator exists
- Grep contract: no private coordinator field access in assembler

---

## Failure / Degraded Branch Verification

**Command:**
```bash
python -m pytest tests/test_boiler*.py -k "degraded or unavailable or failure or safe" -q
```
**Result:** `25 passed, 0 failed`  
**Key tests:**

| Scenario | Test | Result |
|---|---|---|
| Top thermometer unavailable → safe hold | `test_top_unavailable_returns_safe_hold_without_new_actuation` | PASS |
| Bottom thermometer unavailable → degrade to top-only | `test_bottom_unavailable_degrades_two_sensor_setup_to_top_only` | PASS |
| Stale top temperature → reason + bias | `test_stale_top_temperature_emits_reason_and_applies_bias` | PASS |
| Planner timeout → safe hold | `test_planner_timeout_returns_last_safe_plan_or_safe_hold` | PASS |
| Runtime top unavailable → no planner call | `test_runtime_top_unavailable_does_not_call_planner_or_store_new_plan` | PASS |
| Runtime bottom unavailable → degraded + still calls planner | `test_runtime_bottom_unavailable_degrades_and_still_calls_planner` | PASS |
| Consumer exception → safe hold | `test_consumer_exception_enters_safe_hold` | PASS |
| Primary actuator unavailable → reason + pause | `test_primary_unavailable_emits_reason_and_pauses` | PASS |
| Alternative actuator unavailable → downgrade to benchmark | `test_alternative_unavailable_downgrades_to_benchmark_only` | PASS |

---

## Combined E2E Chain

**Command:**
```bash
python -m pytest tests/test_boiler_task6a_planner_core.py tests/test_boiler_task6b_multi_source.py tests/test_boiler_task7a_actuator_serializer.py tests/test_boiler_task7b_manual_override.py tests/test_boiler_task7c_platform_integration.py tests/test_boiler_task9_migration_repair.py tests/test_boiler_task10_canonical_api.py tests/test_config_flow_boiler_setup.py -q
```
**Result:** `156 passed, 0 failed`

---

## Exclusions / Known Non-Blockers

### Broad Regression: 2 Task 1 Routing Test Failures

**Command:**
```bash
python -m pytest tests/test_boiler*.py -q --deselect tests/test_boiler_module.py
```
**Result:** `362 passed, 2 failed, 24 deselected`  

**Failed tests:**
- `test_no_hardcoded_2206237016_in_task1_target_files` — fails on `www_v2/src/data/entity-store.ts:20` default constructor param
- `test_no_hardcoded_2206237016_in_extra_frontend_files` — fails on `www_v2/src/data/flow-data.ts:28` fallback URL param

**Rationale for exclusion:**
- These are **Task 1 routing tests**, not part of the e2e boiler flow (Tasks 6–10).
- The hardcoded `2206237016` is a **frontend test/dev convenience default** (inverter SN, not boiler routing).
- Task 11 intentionally restored this default after removing it caused 10 frontend test failures (documented in learnings.md: "Restored default to '2206237016' — this is a test/dev convenience default, not a fabricated sensor value").
- Neither file is part of boiler setup, planning, actuation, override, TTL expiry, recompute, or restart restore/recover logic.

---

## Summary Table

| Stage | Tests | Passed | Failed |
|---|---|---|---|
| Setup (Task 8) | 27 | 27 | 0 |
| Planner Core (Task 6a) | 11 | 11 | 0 |
| Planner Multi-Source (Task 6b) | 7 | 7 | 0 |
| Actuator/Serializer (Task 7a) | 36 | 36 | 0 |
| Manual Override (Task 7b) | 36 | 36 | 0 |
| Platform Integration (Task 7c) | 21 | 21 | 0 |
| Migration/Repair (Task 9) | 9 | 9 | 0 |
| Canonical API (Task 10) | 9 | 9 | 0 |
| **Combined E2E Chain** | **156** | **156** | **0** |
| Degraded/Failure Branch | 25 | 25 | 0 |
| V2 UI (override/TTL) | 64 | 64 | 0 |

---

## Conclusion

The canonical boiler instance can complete the full end-to-end flow: setup → plan → actuate → override → TTL expiry → recompute → restart restore/recover. Both the happy path and the degraded/safe-hold failure branch (unavailable thermometer / unavailable actuator) are verified by targeted passing tests. The 2 unrelated Task 1 routing test failures are documented as non-blocking exclusions.

**VERDICT: APPROVE**
