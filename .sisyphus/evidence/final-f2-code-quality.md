# F2 — Final Code Quality Review Evidence (Rerun)

**Review Date:** 2026-04-26
**Reviewer:** Sisyphus-Junior
**Scope:** Tasks 1–13 boiler module redesign (Python + TypeScript)
**Previous Verdict:** REJECT
**Current Verdict:** APPROVE

---

## VERDICT: APPROVE

All three previous rejection blockers have been resolved:

1. **Duplicate active planners** → unified to single `plan_comfort_core()` path with `plan_result_to_boiler_plan()` adapter.
2. **Slot model mismatch** → actuator now has defensive `getattr` fallbacks for both old and new field names; adapter maps correctly.
3. **Hardcoded `2206237016` in production frontend** → replaced with empty-string defaults.

Tests pass, LSP is clean, V2 app does not render debug panel.

---

## 1. Previous Blocker Resolution

### Blocker 1 (CRITICAL): Duplicate Active Planner Implementations — RESOLVED

**Previous State:** `planner.py` `BoilerPlanner.async_create_plan()` contained a complete old slot-building algorithm (while-loop over 24h, profile interpolation, source recommendation). It also called `plan_comfort_core()` as a discarded side-effect when `planner_input.topology` was present. `runtime.py` `async_create_plan()` delegated to `coordinator.planner` (the old planner), while `async_request_replan()` called `plan_comfort_core()` directly but never stored the result in `_current_plan`.

**Current State:**
- `planner.py` `async_create_plan()` (lines 149–192) is now a thin shim:
  - Builds a `PlannerInput` if one is not provided (legacy caller compatibility).
  - Calls `plan_comfort_core(planner_input)` once.
  - Converts the `PlanResult` to `BoilerPlan` via `plan_result_to_boiler_plan()`.
  - Returns the adapted `BoilerPlan`.
  - All old slot-building logic (while-loop, `_recommend_source`, etc.) has been removed from the production path.
- `runtime.py` `async_create_plan()` (lines 940–978) now calls `plan_comfort_core()` directly and stores the adapted `BoilerPlan` in `self._current_plan` (line 976).
- `runtime.py` `async_request_replan()` (lines 847–889) also converts and stores in `self._current_plan` (lines 881–884).

**Evidence:**
```python
# planner.py:179-183
self.last_core_result = plan_comfort_core(planner_input)
plan = plan_result_to_boiler_plan(
    self.last_core_result,
    planner_input=planner_input,
)
```
```python
# runtime.py:962-976
try:
    result = plan_comfort_core(
        planner_input,
        now=now,
        previous_plan=self.last_plan_result,
    )
except Exception as err:
    ...
self.last_plan_result = result
new_plan = plan_result_to_boiler_plan(
    result,
    planner_input=planner_input,
)
self._current_plan = new_plan
```

**Test Evidence:** `tests/test_boiler_task6a_planner_core.py` + `tests/test_boiler_task6b_multi_source.py` → **20 passed**.

---

### Blocker 2 (CRITICAL): Slot Model Mismatch Between New Planner and Actuator — RESOLVED

**Previous State:** `PlanSlotAction` used `heating_kwh`/`source` while `BoilerSlot` used `avg_consumption_kwh`/`recommended_source`. The actuator only read the old field names, so new planner slots would be silently skipped.

**Current State:**
- `plan_result_to_boiler_plan()` (planner.py:25–55) explicitly maps:
  - `slot.heating_kwh` → `BoilerSlot.avg_consumption_kwh`
  - `slot.source` → `BoilerSlot.recommended_source`
- `actuator.py` `_build_heating_windows()` (lines 639–650) now uses defensive `getattr` with fallbacks for BOTH field names:
  ```python
  consumption = getattr(
      slot,
      "avg_consumption_kwh",
      getattr(slot, "heating_kwh", 0.0),
  )
  source = getattr(
      slot,
      "recommended_source",
      getattr(slot, "source", EnergySource.GRID),
  )
  ```

**Test Evidence:** `tests/test_boiler_task6b_multi_source.py::test_plan_result_adapter_maps_heating_and_source_for_actuator_windows` passes.

---

### Blocker 3 (HIGH): Hardcoded `2206237016` in Production Frontend — RESOLVED

**Previous State:** `flow-data.ts:28` and `entity-store.ts:20` had `|| '2206237016'` as fallback defaults.

**Current State:**
- `flow-data.ts:28`: `const INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '';`
- `entity-store.ts:20`: `constructor(hass: any, inverterSn: string = '')`

**Test Evidence:** `tests/test_boiler_task1_routing.py` → **23 passed** (previously 2 failed).

---

## 2. Additional Verification

### 2.1 V2 App Does Not Render Debug Panel — VERIFIED
- `app.ts` boiler tab (lines 943–1030) renders V2 components (`oig-boiler-status-panel`, `oig-boiler-plan-timeline`, `oig-boiler-source-explanation`, `oig-boiler-override-panel`) and legacy diagnostic components inside a `<details>` collapsible.
- `oig-boiler-debug-panel` is defined in `components.ts` and exported from `index.ts`, but is **not instantiated** in `app.ts` or any other rendered template.

### 2.2 V1 Read-Only Guards — VERIFIED (unchanged from previous review)
- `www/js/features/boiler.js`: `planBoilerHeating`, `applyBoilerPlan`, `cancelBoilerPlan` are no-op guards.
- `www/js/components/shield.js`: `set_boiler_mode` is a no-op guard; no `callService('oig_cloud', 'set_boiler_mode', …)` emitted.

### 2.3 Canonical DTO is External Read Model — VERIFIED (unchanged)
- `BoilerCanonicalView` assembles DTO from public runtime methods and `hass.states.get()`. No coordinator-private reads.
- V2 frontend `mapCanonicalToV2()` consumes canonical DTO without fabricated state.

### 2.4 No Fake UI Data — VERIFIED (unchanged)
- `boiler-data.ts` uses `isFinite(x as any) ? x : null` for all temperature/energy fields. No `|| 45` or similar fabricated defaults.

### 2.5 No TODO/FIXME/HACK — VERIFIED (unchanged)
- Grep in `custom_components/oig_cloud/boiler/*.py`: zero matches.

### 2.6 No Unbounded Loops — VERIFIED (unchanged)
- No `while True` or unbounded ranges in boiler Python files.

### 2.7 LSP Clean — VERIFIED
- `lsp_diagnostics` on `planner.py`, `runtime.py`, `actuator.py`, `api_views.py`: **0 diagnostics**.

---

## 3. Test Results Summary

| Test Suite | Result |
|---|---|
| `tests/test_boiler_task1_routing.py` | **23 passed** |
| `tests/test_boiler_task6a_planner_core.py` | **13 passed** |
| `tests/test_boiler_task6b_multi_source.py` | **7 passed** |
| `tests/test_boiler_task7a_actuator_serializer.py` | **passed** (in combined run) |
| `tests/test_boiler_task7b_manual_override.py` | **passed** (in combined run) |
| `tests/test_boiler_task9_migration_repair.py` | **9 passed** |
| `tests/test_boiler_task10_canonical_api.py` | **9 passed** |
| `tests/test_config_flow_boiler_setup.py` | **27 passed** |
| **Combined broad regression** | **167 passed** |
| V2 frontend unit tests (`vitest run`) | **657 passed** |

---

## 4. Remaining Non-Blocking Observations

These are noted for future cleanup but do **not** block approval:

1. **Dead code in `planner.py`**: `_is_in_overflow_window`, `_get_spot_price`, `_recommend_source`, `_calculate_plan_totals` are no longer called by `async_create_plan()`. They are legacy methods that can be removed in a future refactor.
2. **Unused `_CoordinatorPlanner` adapter**: `runtime.py` still constructs `_CoordinatorPlanner(coordinator)` and injects it as `self.planner`, but `BoilerRuntime.async_create_plan()` no longer delegates to it. It is dead code but harmless.
3. **Coordinator-private reads in internal adapters**: `_CoordinatorReadModel`, `_EnergyStateAdapter`, and `_ThermalReadModel` still use `getattr(self._coordinator, "_current_profile", None)` etc. These are intentional migration bridges hidden behind adapter classes and do not leak into the public runtime API.
4. **`as any` density in `boiler-data.ts`**: ~20 defensive casts for API boundary validation. Functional but could benefit from a runtime validation library in future.

---

## 5. Summary

| Criterion | Status |
|---|---|
| Single planner path (no duplicate active implementation) | ✅ RESOLVED |
| Slot model compatible with actuator | ✅ RESOLVED |
| No hardcoded `2206237016` in production code | ✅ RESOLVED |
| V1 read-only guards (no boiler write service calls) | ✅ VERIFIED |
| Canonical DTO is external read model, V2 consumes without fabricated state | ✅ VERIFIED |
| All targeted tests pass | ✅ VERIFIED |
| LSP clean on changed files | ✅ VERIFIED |

**F2 Code Quality Review — APPROVED.**

---

*End of Evidence File*
