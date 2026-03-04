# Morning Peak Avoidance - Problems

**Date**: 2026-03-04  
**Status**: OPEN

---

## Critical Blockers

### PB0: Orphaned Implementation Commits (CRITICAL)
- **Description**: Morning peak commits (47f54e2..49a13bf) exist in git history but are NOT in current HEAD
- **Impact**: Feature is completely inaccessible in active codebase
- **Blocks**: All verification, deployment, and usage
- **Root Cause**: Worktree commits never merged into main branch
- **Resolution Path**: 
  1. Cherry-pick commits 47f54e2..49a13bf onto main
  2. Verify all Must Have requirements
  3. Address D001 (SOC projection) and D002 (canary semantics)
  4. Execute F1-F4 verification wave
- **Estimated Effort**: 2-4 hours

---

## High Priority Issues

### PH1: D001 - SOC Projection Not Using `simulate_forward()` (HIGH)
- **Description**: Plan requires `simulate_forward()` call, implementation uses parameter approximation
- **Status**: NOT FIXED
- **Impact**: Economic calculations may be inaccurate without forward simulation
- **Root Cause**: `simulate_forward()` requires full timeline with economic charging decisions that do not exist at decision point

### PH2: D002 - Canary Semantics (HIGH)
- **Description**: Canary checks current SOC instead of projected SOC after pre-peak
- **Status**: NOT FIXED
- **Impact**: False positive warnings, operational confusion
- **Root Cause**: Integration code uses `current_soc` parameter instead of `pre_peak_decision.soc_at_peak_start_kwh`

---

## Medium Priority Issues

### PH3: MH9 - PV-First Override Missing (MEDIUM)
- **Description**: PV-first override check not implemented in current code
- **Status**: NOT IMPLEMENTED
- **Impact**: Pre-peak charging may schedule during high PV production
- **Root Cause**: Feature removed or not merged from worktree version

---

## Low Priority Issues

### PL1: Final Verification Wave Not Executed (LOW)
- **Description**: Tasks F1-F4 from plan (audit, code review, real QA, scope fidelity) not executed
- **Status**: NOT EXECUTED
- **Impact**: Cannot verify plan compliance without feature in codebase
- **Root Cause**: Orphaned commits prevent verification

---

## Status Summary

| Priority | Count | Status |
|-----------|-------|--------|
| CRITICAL | 1 (orphaned) | ❌ BLOCKED |
| HIGH | 2 (D001, D002) | ❌ BLOCKED |
| MEDIUM | 1 (PV-first missing) | ❌ BLOCKED |
| LOW | 1 (verification wave) | ❌ BLOCKED |

---

## Resolution Dependencies

- **PB0** (orphaned) must be resolved before any other tasks
- **PH1** and **PH2** require code in active HEAD
- **PL1** requires feature in active HEAD

