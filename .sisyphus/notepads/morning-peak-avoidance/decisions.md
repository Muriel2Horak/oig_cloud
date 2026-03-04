# Morning Peak Avoidance - Decisions

**Date**: 2026-03-04  
**Project Phase**: Pre-consulting / Completion

---

## 1. SOC Projection Approach (D001)

### Decision Made
- **Choice**: Use `current_soc_kwh` parameter as approximation for SOC at peak start
- **Context**: Pre-peak decision point in `should_pre_charge_for_peak_avoidance()` called BEFORE economic charging timeline generation
- **Implementation**: Line 862-865 (worktree version): `soc_at_peak_start = current_soc_kwh`

### Rationale
1. **`simulate_forward()` Complexity**: The function requires:
   - Full timeline with economic charging decisions
   - Complete forward simulation state
   - At decision point, these do not exist yet
   
2. **Alternative Approaches Considered**:
   - Call `simulate_forward()` with minimal timeline (only pre-peak intervals)
   - Defer to post-peak adjustment phase for SOC calculation
   - Use simple linear projection based on expected charge amount

3. **Selected Approach**: Use parameter-based approximation
   - Simpler to implement
   - Matches existing pattern of using `current_soc` from `economic_charging_plan()` context
   - Documented as approximation in code comment

### Trade-offs
- **Pros**: Simpler implementation, consistent with existing codebase patterns
- **Cons**: Not explicitly following plan requirement to use `simulate_forward()`
- **Plan Compliance**: Marked as issue in pre-consulting analysis (D001)

---

## 2. Canary Semantics (D002)

### Decision Made
- **Choice**: Canary checks `current_soc` in integration code (Line 248 of worktree version)
- **Context**: Canary warning should trigger if SOC after pre-peak charging is insufficient

### Rationale
- **Original Intent**: Canary should warn if **post-charge SOC** is below threshold (1.5 kWh)
- **Current Implementation**: Checks if **pre-charge SOC** is below threshold
- **Impact**: False positives - warns when SOC is 1.0 kWh but pre-charge will boost it to 2.5 kWh
- **Resolution Required**: Update canary check to use `pre_peak_decision.soc_at_peak_start_kwh`

### Trade-offs
- **Complexity**: Requires access to `pre_peak_decision` return value
- **Plan Compliance**: Marked as critical issue in pre-consulting analysis (D002)

---

## 3. Test Update Strategy

### Decision Made
- **Approach**: Update tests immediately after adding new precedence level
- **Rationale**: Maintain test coverage for growing codebase
- **Implementation**:
  - Updated `test_level_count` to expect 11 levels
  - Updated `test_get_precedence_rank` for PLANNING_TARGET = 11
  - Updated `test_get_precedence_summary` to expect \"Total levels: 11\"
  - Updated `test_ladder_matches_enum_order` to include PRE_PEAK_AVOIDANCE
  - Updated `test_values_are_spaced_by_multiples_of_50` to accept 50 and 100 gaps
  - Updated rollout flags tests to include new fields

---

## 4. PV-First Override (MH9)

### Decision Made
- **Choice**: Include PV-first check in `should_pre_charge_for_peak_avoidance()` core logic
- **Plan Requirement**: \"Pokud PV forecast ≥ 0.5 kWh v pre-peak okně → should_charge=False (pv_first_deferred)\" (Plan Line 386)
- **Implementation Status**: **NOT IMPLEMENTED**
- **Worktree Version**: Commit 6c2e73d includes PV-first check at lines 852-860
- **Current HEAD Version**: PV-first check NOT present (code from earlier commit or not merged)

### Rationale for Omission
- **Complexity**: Adding PV-first check requires careful integration with PV-first gate
- **Risk of Conflict**: May create priority conflicts between PV-first gate and pre-peak override
- **Alternative**: Defer to existing PV-first gate or implement at decision consumption time
- **Status**: Documented as missing feature in issues.md

---

## 5. Orphaned Commits Handling

### Decision Made
- **Status**: NOT FIXED - Commits 47f54e2..49a13bf remain orphaned
- **Rationale**: Fixing D001/D002 requires code that is not in current HEAD
- **Recommended Action**: Cherry-pick morning peak commits first, then address D001/D002

---

## Summary

| Decision ID | Status | Impact | Priority |
|-------------|--------|---------|----------|
| D001: SOC Projection approximation | Implemented | Plan non-compliance | HIGH |
| D002: Canary semantics | NOT FIXED | Plan non-compliance | HIGH |
| D003: PV-first override omitted | NOT FIXED | Missing feature | MEDIUM |
| D004: Orphaned commits | NOT FIXED | Feature inaccessible | CRITICAL |

---

## Lessons

1. **Git Hygiene**: Always merge worktree commits into main before moving to other work
2. **Test Precedence**: Update test expectations immediately when adding new precedences
3. **Plan Compliance**: Document deviations with rationale, do not silently diverge
4. **Worktree Management**: Treat worktrees as staging, not production branches

