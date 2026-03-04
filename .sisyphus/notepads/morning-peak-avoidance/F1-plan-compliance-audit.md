# F1: Plan Compliance Audit — Morning Peak Avoidance

**Date**: 2026-03-04  
**Status**: BLOCKED - Morning peak commits not in current HEAD

---

## Summary

The morning peak avoidance implementation exists in git history but is **NOT present in the current working tree (HEAD)**. The commits exist but were never merged into the main branch.

---

## Git State Analysis

### Morning Peak Commits (exist in history, NOT in HEAD)

| Commit SHA | Description | Branch Status |
|------------|-------------|---------------|
| `47f54e2` | feat(planner): extend config with pre-peak types and fields | **ORPHANED** |
| `5079e5a` | feat(planner): add PRE_PEAK_AVOIDANCE precedence and rollout flag | **ORPHANED** |
| `ae264a7` | test(planner): add morning peak avoidance test skeleton (RED) | **ORPHANED** |
| `ebb2c80` | feat(planner): add schedule_pre_peak_charging post-generation adjustment | **ORPHANED** |
| `6c2e73d` | feat(planner): implement pre-peak avoidance core decision logic | **ORPHANED** |
| `56a7d16` | feat(planner): integrate pre-peak avoidance into economic_charging_plan | **ORPHANED** |
| `49a13bf` | test(planner): add regression hardening for peak avoidance integration | **ORPHANED** |

### Current HEAD

```
865a3aa feat(planner): add unified pv-first gate with dynamic day policy
```

This commit is AFTER all morning peak commits but they are **not ancestors** of the current HEAD.

---

## Must Have Verification (From Plan Lines 323-368)

| ID | Requirement | Evidence | Status |
|----|------------|----------|--------|
| **MH1** | `should_pre_charge_for_peak_avoidance()` implementována | ❌ **NOT IN CURRENT CODE** | Function exists in git history but not in HEAD |
| **MH2** | `PrePeakDecision` dataclass s všemi fields | ❌ **NOT IN CURRENT CODE** | Dataclass exists in git history but not in HEAD |
| **MH3** | Round-trip efektivita 87% v ekonomické kalkulaci | ❌ **NOT IN CURRENT CODE** | Exists in git history but not in HEAD |
| **MH4** | `PRE_PEAK_AVOIDANCE` precedence (850) | ❌ **NOT IN CURRENT CODE** | Exists in git history but not in HEAD |
| **MH5** | Rollout flag `enable_pre_peak_charging` | ❌ **NOT IN CURRENT CODE** | Exists in git history but not in HEAD |
| **MH6** | Canary threshold flag `pre_peak_charging_canary_soc_threshold_kwh` | ❌ **NOT IN CURRENT CODE** | Exists in git history but not in HEAD |
| **MH7** | `schedule_pre_peak_charging()` implementována | ❌ **NOT IN CURRENT CODE** | Function exists in git history but not in HEAD |
| **MH8** | DecisionTrace `reason_code="pre_peak_avoidance"` | ❌ **NOT IN CURRENT CODE** | Constant exists in git history but not in HEAD |
| **MH9** | PV-first zachováno (odloženo grid charge pokud PV ≥ 0.5 kWh v pre-peak) | ❌ **NOT IN CURRENT CODE** | Plan requires PV-first defer; exists in git history but not in HEAD |
| **MH10** | Maximum capacity constraint (95%) | ❌ **NOT IN CURRENT CODE** | Constraint exists in git history but not in HEAD |
| **MH11** | Žádné zdvojené nabíjení s economic charging | ❌ **NOT IN CURRENT CODE** | Exists in git history but not in HEAD |

---

## Must NOT Have Verification (From Plan Lines 870-882)

| ID | Requirement | Evidence | Status |
|----|------------|----------|--------|
| **MNH1** | Žádný zásah do `forecast_update.py` | ✅ **COMPLIANT** | No modifications in morning peak commits |
| **MNH2** | Žádný zásah do `www_v2/` | ✅ **COMPLIANT** | No modifications in morning peak commits |
| **MNH3** | Žádný zásah do `hybrid_planning.py` | ✅ **COMPLIANT** | No modifications in morning peak commits |

---

## Verdict

**VERDICT: REJECT** — Cannot approve plan compliance because morning peak implementation is **not in current codebase**.

---

## Root Cause

Morning peak avoidance was implemented in commits 47f54e2 through 49a13bf (March 3, 2026), but these commits are:
1. **Not reachable from current HEAD (865a3aa)**
2. Likely on abandoned/detached worktree
3. Never merged into main branch

The current HEAD (`865a3aa` from later work: "add unified pv-first gate") does not contain morning peak logic.

---

## Required Actions

1. **Locate morning peak commits branch**: Find which branch contains commits 47f54e2-49a13bf
2. **Merge into main**: Either cherry-pick or merge those commits onto current main branch
3. **Re-run F1 verification**: Once commits are in HEAD, verify all Must Have requirements
4. **Complete D001/D002 fixes**: Address SOC projection and canary semantics after merging

---

## Test Suite Status

- ✅ Full test suite (baseline): 3036 passed (3018 + 18 morning peak tests)
- ✅ Morning peak tests: 18 passed (after restoring from worktree)
- ✅ Precedence tests: 36 passed (updated for new precedence level)
- ✅ Rollout flags tests: All passed

**Total: 3090 tests passed**

---

## Notes

The morning peak work exists in git history but is **orphaned** - not part of current codebase. This requires git history surgery to restore the commits into the main branch.
