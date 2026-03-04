# Morning Peak Avoidance - Learnings

**Date**: 2026-03-04  
**Project Phase**: Pre-consulting / Completion

---

## Implementation Patterns

### 1. TDD Approach (WORKED WELL)
- RED-GREEN-REFACTOR cycle was effective
- Test skeleton created BEFORE implementation (`ae264a7`)
- 18 tests covering all decision paths
- Implementation followed test structure closely

### 2. Precedence Integration (WORKED WELL)
- Added `PRE_PEAK_AVOIDANCE = 850` between PROTECTION_SAFETY(900) and DEATH_VALLEY(800)
- Updated precedence ladder and tests correctly
- Proper separation of concerns (precedence contract, rollout flags, core logic)

### 3. Post-Generation Adjustment Pattern (WORKED WELL)
- `schedule_pre_peak_charging()` follows existing pattern (`fix_minimum_capacity_violations`)
- Non-invasive: only modifies selected intervals
- Defensive: checks for existing charging to avoid double-charging

### 4. Decision Tracing (WORKED WELL)
- Extended `DecisionTrace` with all required fields
- Added `REASON_PRE_PEAK_AVOIDANCE` constant
- Proper precedence level integration

---

## Testing Strategy Effectiveness

### 1. Test Coverage
- 10 unit tests for core logic (`test_morning_peak_avoidance.py`)
- 8 regression tests for integration (`test_regression_peak_cluster.py`)
- All scenarios covered: SOC thresholds, economic calculations, PV-first override, feature flags

### 2. Edge Case Handling
- Time window validation (< 1 hour from peak)
- No double charge detection (existing economic charging)
- Max capacity constraint (95% limit)
- Canary threshold warning

### 3. Regression Prevention
- PV-first precedence verified
- DEATH_VALLEY precedence verified
- PROTECTION_SAFETY precedence verified
- No interference with existing priorities

---

## Rollout Strategy (NOT TESTED)

### Feature Flag Gating
- `enable_pre_peak_charging` defaults to False
- Canary threshold: `pre_peak_charging_canary_soc_threshold_kwh = 1.5`
- Rollout via configuration flags

### Monitoring
- Canary warning for low SOC situations
- Decision trace for debugging
- Post-deployment verification steps defined in `monitoring.md`

---

## Issues Encountered

### 1. Git History Fragmentation
- **Issue**: Morning peak commits (47f54e2-49a13bf) exist in git history but are **NOT reachable from current HEAD**
- **Impact**: Implementation is orphaned - not part of active codebase
- **Root Cause**: Commits likely created on worktree and never merged into main branch
- **Required Action**: Cherry-pick or merge morning peak commits into main

### 2. Test Suite Updates Required
- **Issue**: Precedence contract changes broke existing tests
- **Impact**: 3 tests failed due to new precedence level count (10→11)
- **Fix Applied**: Updated hardcoded expectations and spacing validation
- **Result**: All 36 precedence tests pass

### 3. Rollout Flags Tests Outdated
- **Issue**: Tests expected 3 fields, RolloutFlags now has 5 (with morning peak fields)
- **Impact**: 2 tests failed after morning peak integration
- **Fix Applied**: Updated test expectations to include new fields
- **Result**: All rollout flags tests pass

---

## Architectural Decisions

### 1. SOC Projection Approach
- **Decision**: Use `current_soc_kwh` parameter as approximation
- **Rationale**: Using `simulate_forward()` would require full timeline generation which doesn't exist at decision point
- **Status**: DOCUMENTED as approximation in code comment
- **Concern**: D001 identifies this as plan non-compliance (plan requires `simulate_forward()`)

### 2. Canary Semantics
- **Decision**: Canary checks `current_soc` in integration code
- **Rationale**: Canary should warn if **projected SOC after pre-charge** is low, not current SOC
- **Status**: D002 identifies this as critical issue
- **Required Action**: Update canary check to use `pre_peak_decision.soc_at_peak_start_kwh`

---

## Code Quality Observations

### 1. LSP False Positives
- LSP reports errors for unclosed parentheses and undefined functions
- These appear to be cache/stale issues
- Actual Python compilation succeeds (py_compile passes)
- **Lesson**: Trust compilation over LSP cache

### 2. Type Safety
- No type suppressions (`as any`, `@ts-ignore`) found in morning peak code
- All types properly imported from typing module
- Good use of dataclasses for structured data

### 3. Documentation
- Docstrings present for public functions
- Inline comments explain logic where needed
- Not over-commented

---

## What Worked

1. ✅ Feature design with precedence integration
2. ✅ TDD cycle (RED tests → GREEN implementation)
3. ✅ Comprehensive test coverage (18 tests)
4. ✅ Regression hardening (8 integration tests)
5. ✅ Updated all related tests (precedence, rollout flags)
6. ✅ Git history hygiene (clear commit messages)

---

## What Needs Work

1. ❌ **Merge morning peak commits into main** - Critical blocker
2. ❌ **Fix D001** - SOC projection with `simulate_forward()` or document why approximation is acceptable
3. ❌ **Fix D002** - Canary semantics to use post-charge projected SOC
4. ⚠️ **Final verification wave** (F1-F4) - Not executed (commits orphaned)

---

## Recommendations for Future Projects

1. **Work on active branch only**: Always commit to main or current branch, not to detached/worktree state
2. **Merge frequently**: Don't leave commits orphaned for long periods
3. **Verify reachability**: Before marking tasks complete, verify commits are reachable from HEAD
4. **Pre-committed PRD**: Update test expectations when adding new flags/precedence levels
5. **Integration testing**: Test integration points immediately after merging, not after multiple commits
