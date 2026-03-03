# Issues & Gotchas — grid-boiler-rules-overhaul

## [2026-03-03] Session Bootstrap

### Pre-existing LSP Errors (Baseline — do not introduce these)
- `grid_charging_sensor.py` lines 29, 41, 268, 431: DeviceInfo/property override type errors
- `forecast_update.py` lines 186, 230, 247, 715, 760: datetime/tuple/unbound errors
- `spot_price_15min.py` lines 136, 143, 156: SensorEntity final method overrides, DeviceInfo type errors
- `test_grid_charging_plan_sensor.py` lines 170, 189, 200, 213, 224, 240: DummyCoordinator config_entry type errors
- `mode_guard.py` lines 403, 404: No overloads for "get"

### Known Root Causes of Incident
1. `charging_plan.py` — 9 decision layers, NONE check PV forecast before grid charge decision
2. `boiler/planner.py` `_recommend_source()` defaults to Grid when no battery overflow (no PV/battery coordination)

### Balancing Module Risk
- `balancing/core.py` and `balancing/plan.py` have TODO markers
- Runtime behavior may differ from comment intent — needs truthing in Task 6

## [2026-03-03] Task 6 — Balancing Truth-State Normalization

### TODO Markers Status
All TODO markers in balancing modules are **RESOLVED** — functionality is fully implemented.
Markers remain as documentation anchors only.

### PV-first Ambiguity (Action Item for Task 11)
**Issue:** `_create_opportunistic_plan()` and `_select_best_window()` use spot-price-only optimization.
They do NOT check if PV production is expected during the selected window.

**Impact:** OPPORTUNISTIC balancing may charge from grid during PV production hours,
potentially breaking PV-first contract.

**Resolution for Task 11:**
1. Add PV-first check to `_select_best_window()` — skip windows with high PV production
2. Create `balancing_pv_compatible()` helper
3. Document precedence rule: OPPORTUNISTIC defers to PV-first unless cost savings > threshold

### Production Code datetime.now() Issue
`balancing/core.py` uses `datetime.now()` directly in several places instead of `dt_util.now()`:
- Line 855: `now = datetime.now()` in `_select_best_window()`
- Line 1097: `now = datetime.now()` in `_calculate_immediate_balancing_cost()`

This causes timezone comparison issues in tests. Not a runtime bug (HA runs in consistent timezone),
but makes testing harder. Consider using `dt_util.now()` consistently.

### Test Infrastructure Note
Tests in `test_balancing_state_map.py` mock several methods to work around the datetime issue:
- `_calculate_immediate_balancing_cost`
- `_calculate_total_balancing_cost`
- `_select_best_window`
