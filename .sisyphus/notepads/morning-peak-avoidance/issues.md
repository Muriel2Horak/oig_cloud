# Morning Peak Avoidance - Issues

**Date**: 2026-03-04  
**Status**: OPEN

---

## Critical Issues

### 1. Orphaned Commits (P0 - CRITICAL)
- **Description**: Morning peak implementation commits exist in git history but are NOT reachable from current HEAD
- **Commits Affected**: 
  - `47f54e2` - feat(planner): extend config with pre-peak types and fields
  - `5079e5a` - feat(planner): add PRE_PEAK_AVOIDANCE precedence and rollout flag
  - `ae264a7` - test(planner): add morning peak avoidance test skeleton (RED)
  - `ebb2c80` - feat(planner): add schedule_pre_peak_charging post-generation adjustment
  - `6c2e73d` - feat(planner): implement pre-peak avoidance core decision logic
  - `56a7d16` - feat(planner): integrate pre-peak avoidance into economic_charging_plan
  - `49a13bf` - test(planner): add regression hardening for peak avoidance integration
- **Current HEAD**: `865a3aa` (unrelated commit: "add unified pv-first gate")
- **Impact**: Complete feature implementation is ORPHANED - not in active codebase
- **Root Cause**: Commits were created on worktree and never merged into main branch
- **Required Action**: Cherry-pick or merge commits 47f54e2..49a13bf onto main

---

## Plan Compliance Issues

### 2. D001 - SOC Projection Not Using `simulate_forward()` (P1 - HIGH)
- **Plan Requirement**: "Pomocí `simulate_forward()` z `charging_plan_utils.py` vypočítej projekci SOC na začátek špičky" (Plan Line 376-377)
- **Actual Implementation**: Uses `current_soc_kwh` parameter as approximation with comment "# Estimate SOC at peak start (use current_soc_kwh as approximation)"
- **Status**: **NOT COMPLIANT** with plan specification
- **Complexity**: `simulate_forward()` requires full timeline with economic charging decisions which don't exist at decision point
- **Resolution Required**: Either:
  1. Implement `simulate_forward()` call with forward simulation through candidate selection
  2. Document why approximation is architecturally necessary and acceptable for decision point logic

---

### 3. D002 - Canary Semantics (P1 - HIGH)
- **Plan Requirement**: "Alarm pokud SOC po pre-charge < 1.5 kWh" (Plan Lines 38-39, 562-563)
- **Actual Implementation**: Canary checks `current_soc < flags.pre_peak_charging_canary_soc_threshold_kwh`
- **Status**: **NOT COMPLIANT** with plan semantics
- **Issue**: Canary warns about current SOC instead of projected SOC after pre-peak charging
- **Correct Semantics**: Canary should check `pre_peak_decision.soc_at_peak_start_kwh < flags.pre_peak_charging_canary_soc_threshold_kwh`
- **Resolution Required**: Update canary check in integration code (Line 248) to use projected SOC

---

## Missing Features (Per Plan Specification)

### MH9 - PV-First Override
- **Plan Requirement**: "Pokud PV forecast ≥ 0.5 kWh v pre-peak okně → should_charge=False (pv_first_deferred)" (Plan Line 386)
- **Status**: **NOT IMPLEMENTED** in current code (worktree version has it, but current HEAD doesn't)
- **Impact**: Without PV-first override, pre-peak charging may conflict with solar production

---

## Testing Issues

### 4. Test Suite Outdated by New Features
- **Issue**: Precedence tests expected 10 levels, now 11
- **Fix Applied**: Updated test to expect 11 levels
- **Issue**: Rollout flags tests expected 3 fields, now 5
- **Fix Applied**: Updated test to include morning peak fields
- **Result**: All tests pass

---

## Deployment Issues

### 5. Final Verification Wave Not Executed
- **Plan Requirement**: Tasks F1-F4 (Lines 699-761) - audit, code review, real QA, scope fidelity
- **Status**: **NOT EXECUTED**
- **Reason**: Commits orphaned, making verification impossible without first merging

---

## Status Summary

| Category | Count | Status |
|-----------|-------|--------|
| Critical | 1 (orphaned commits) | ❌ BLOCKED |
| High | 2 (D001, D002) | ❌ PENDING |
| Medium | 0 | ✅ |
| Low | 2 (final wave not executed, feature not in HEAD) | ⚠️ BLOCKED |

---

## Resolution Path

1. **IMMEDIATE**: Cherry-pick or merge commits 47f54e2..49a13bf onto main branch
2. **AFTER MERGE**: Verify all morning peak Must Have requirements
3. **AFTER VERIFICATION**: Fix D001 and D002 if still relevant
4. **FINAL**: Execute F1-F4 verification wave
