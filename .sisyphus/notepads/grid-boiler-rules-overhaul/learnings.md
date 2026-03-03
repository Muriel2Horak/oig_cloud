# Learnings — grid-boiler-rules-overhaul

## [2026-03-03] Session Bootstrap

### Codebase conventions
- Python 3.12, pytest with 99% coverage (3066 tests)
- Main branch: `main`
- Tests live in `tests/` at root
- Core planner: `custom_components/oig_cloud/battery_forecast/`
- Boiler: `custom_components/oig_cloud/boiler/`

### Architecture Key Points
- Decision chain: `charging_plan.py` → `hybrid_planning.py` → `hybrid.py` → `forecast_update.py` → `balancing/core.py` → `boiler/planner.py` → `auto_switch.py` → `mode_guard.py`
- Root cause: Grid charging decisions (9 layers in `charging_plan.py`) do NOT check PV forecast availability before deciding to charge from grid
- Secondary: `boiler/planner.py` `_recommend_source()` defaults to Grid when battery overflow unavailable — no battery/PV coordination
- `balancing/core.py` and `balancing/plan.py` contain TODO markers — behavior needs truthing

### Rule Priority Hierarchy (extracted from research)
1. Protection/Safety (GR-010, SOC-003, SOC-006, SOC-013, BA-001)
2. Death Valley/Minimum Enforcement (SOC-004, SOC-016, BA-019)
3. Balancing Mode Overrides (BA-021, BA-022, BA-024)
4. Mode Guard Overrides (AS-012, AS-013)
5. Recovery Mode (GR-001, GR-008)
6. Economic Charging (GR-004, GR-005, PR-001, PR-004)
7. Opportunistic/Natural Balancing (BA-011, BA-012, BA-007)
8. Auto-Switch Enforcement (AS-007, AS-009)
9. Planning Target/Min Achieved (SOC-001, SOC-002)

### Key Overlap/Conflict Hotspots
- Protection vs economic charging
- Balancing overrides vs economic plan
- Mode guard vs auto-switch
- HW hold vs cost optimization

## [2026-03-03] Task 6 — Balancing Truth-State Normalization

### TODO Markers Resolution (ALL RESOLVED)
- `plan.py:3` TODO 2 — BalancingPlan structure fully defined (BalancingMode, BalancingPriority, BalancingInterval)
- `core.py:3` TODO 5 — Natural/Opportunistic/Forced balancing implemented
- `core.py:705` TODO 5.1 — Natural balancing detection via HYBRID timeline scan
- `core.py:760` TODO 5.2 — Opportunistic balancing with cost optimization
- `core.py:929` TODO 5.3 — Forced balancing (health priority)

### Balancing State Machine
States: IDLE → NATURAL | OPPORTUNISTIC | FORCED → (holding) → IDLE
- NATURAL: HYBRID shows ≥99% SoC for 12 consecutive intervals (3h), no override intervals
- OPPORTUNISTIC: SoC ≥80% + cooldown passed + cheap window found, locked=False, priority=NORMAL/HIGH
- FORCED: days_since_last ≥ cycle_days OR force=True, locked=True, priority=CRITICAL

### Transition Order in check_balancing()
1. _handle_recent_balancing() → if completed, update state
2. _handle_active_plan() → if in holding, keep current
3. force=True → FORCED (immediate)
4. _maybe_apply_natural_plan() → NATURAL (if HYBRID shows 3h @ 100%)
5. _maybe_force_plan() → FORCED (if days >= cycle_days)
6. _maybe_opportunistic_plan() → OPPORTUNISTIC (if cooldown + SoC)

### PV-first Contract
- NATURAL: Preserves PV-first (no override intervals)
- FORCED: Overrides PV-first (health priority, locked=True)
- OPPORTUNISTIC: **AMBIGUOUS** — uses spot-price-only optimization, may select grid charging during PV production

### Integration Boundary
BalancingPlan output consumed by: hybrid_planning.py, forecast_update.py, auto_switch.py
Key fields for precedence engine: mode, locked, priority, intervals

### Test Evidence
- `tests/test_balancing_state_map.py` — 7 tests, all GREEN
- `.sisyphus/evidence/task-6-balancing-truth-table.md` — explicit truth table
>> Feature Flags Implementation — Task 5

### RolloutFlags Design Pattern
- Conservative defaults (all False) for safe deployment
- Emergency rollback overrides all other flags (kill-switch pattern)
- get_effective_flags() handles rollback logic at policy level
- Utility functions (is_*_active) abstract flag checking
- Config parsing supports partial configuration (graceful defaults)

### Test Coverage

---

## [2026-03-03] Task 1: Baseline Rule Matrix Complete

### Matrix Statistics
- **Total Rules Extracted**: 67 unique rules
- **Rule Categories**: 9 (PR, SOC, GR, BA, BO, AS, MG, SC, SM)
- **Source Modules**: 9 files analyzed
- **Conflict Hotspots Documented**: 4 major areas
- **TODO Markers**: 5 in balancing modules

### Rule Distribution
| Category | Count | Description |
|----------|-------|-------------|
| PR (Protection) | 3 | Safety/battery health protection |
| SOC (Battery) | 7 | SOC management and minimums |
| GR (Grid/Economic) | 17 | Grid charging and cost optimization |
| BA (Balancing) | 16 | Battery balancing modes |
| BO (Boiler) | 5 | Boiler source priority |
| AS (Auto-Switch) | 10 | Automatic mode enforcement |
| MG (Mode Guard) | 6 | Mode stabilization locks |
| SC (Scoring) | 3 | Mode scoring factors |
| SM (Smoothing) | 1 | Mode smoothing |

### Key Findings

#### Confirmed Root Causes
1. **GR-004, GR-005, GR-006**: Grid charging decisions NEVER check PV forecast availability before deciding to charge from grid
2. **BO-003, BO-005**: Boiler `_recommend_source()` defaults to Grid when battery overflow unavailable — no battery discharge option exists

#### Balancing Module Ambiguity
- `balancing/core.py` lines 3-4, 705, 760, 928: TODO markers exist but code is implemented
- `balancing/plan.py` line 3: TODO marker for plan structure exists but structure is complete
- **Assessment**: Code appears functional but comments suggest incomplete specification

#### Precedence Hierarchy Verified
1. Protection/Safety (PR-001, SOC-006, BA-009)
2. Death Valley/Minimum (SOC-004, SOC-002)
3. Balancing Overrides (BA-001 through BA-005)
4. Mode Guard (MG-001 through MG-006)
5. Recovery (GR-005)
6. Economic (GR-001, GR-002, etc.)
7. Opportunistic/Natural (BA-006, BA-007)
8. Auto-Switch (AS-001 through AS-010)
9. Planning Target (SOC-003, SOC-005)

### Test Infrastructure
- Created `tests/test_rule_matrix_baseline.py` with 44 schema validation tests
- All tests pass (GREEN phase)
- Tests validate: sections, rule IDs, required fields, conflicts, TODOs, counts

### Files Created
- `.sisyphus/evidence/task-1-baseline-matrix.md` — Complete rule matrix
- `.sisyphus/evidence/task-1-baseline-matrix.txt` — Test output evidence
- `.sisyphus/evidence/task-1-matrix-schema-error.txt` — Schema validation output
- `tests/test_rule_matrix_baseline.py` — Matrix schema validation tests
- test_new_policy_enabled_path: Verifies PV-first and boiler coordination activation
- test_rollback_restores_legacy_logic: Verifies emergency rollback bypasses all new policies
- All flag combinations validated (8 combinations tested)
- Evidence saved: task-5-flag-enable.txt and task-5-rollback.txt

## [2026-03-03] Task 4 — Stale Input Quality Guards

### Input Quality Status Design
- Created `InputQualityStatus` enum: FRESH, STALE, INVALID, DEGRADED
- Pure functions only (no HA/coordinator imports)
- Configurable age thresholds (60min for forecast, 30min for prices)

### Guard Functions Implementation
1. `check_forecast_quality()`: Validates PV forecast data structure, timestamps, and meaningful values
   - Checks for empty/invalid structure
   - Validates timestamp formats and recency
   - Detects insufficient or zero-value forecasts
   - Returns DEGRADED for limited but usable data

2. `check_price_quality()`: Validates spot pricing data structure and timestamps
   - Requires `last_update` timestamp for age validation
   - Validates price ranges (-10.0 to 50.0 CZK/kWh)
   - Checks future prices for degradation patterns

3. `should_use_economic_charging()`: Safe degradation logic
   - Blocks economic charging if either input is STALE or INVALID
   - Allows DEGRADED inputs (reduced functionality but safe)
   - Supports string enum values for flexibility

### Test Coverage
- Created comprehensive test suite: 27 tests total
- Key test scenarios validated:
  - Empty/None data → INVALID
  - Stale timestamps → STALE  
  - Limited data points → DEGRADED
  - Mixed quality → blocks economic charging appropriately
- Required GREEN tests verified:
  - `test_stale_pv_forecast_triggers_fallback`
  - `test_stale_price_data_blocks_economic_charge`

### Integration Considerations
- Functions designed to be consumed by Task 9 (economic branch refactor)
- Respects `PrecedenceLevel.ECONOMIC_CHARGING` from existing contract
- Provides `get_quality_summary()` for logging and debugging
- Evidence files saved: task-4-stale-forecast.txt, task-4-stale-prices.txt


## [2026-03-03] Task 2 — PV-First Incident RED Tests

### Incident Reproduction Tests Created
- File: `tests/test_pv_first_incident.py`
- 6 tests, ALL FAILING (RED phase)

### Architectural Gaps Documented

#### Battery Side (charging_plan.py)
1. `economic_charging_plan()` function signature: `['timeline_data', 'plan']`
   - NO PV forecast parameter
   - Cannot enforce PV_FIRST (1000) > ECONOMIC_CHARGING (400)

2. `EconomicChargingPlanConfig` dataclass fields:
   - `['min_capacity_kwh', 'min_capacity_floor', 'effective_minimum_kwh', 'target_capacity_kwh', 'max_charging_price', 'min_savings_margin', 'charging_power_kw', 'max_capacity', 'battery_efficiency', 'config', 'iso_tz_offset', 'mode_label_home_ups', 'mode_label_home_i', 'target_reason']`
   - NO PV-related fields (pv_forecast_threshold, pv_confidence_min, etc.)
   - No way to configure when PV deferral should activate

#### Boiler Side (planner.py)
1. `_recommend_source()` method signature: `['overflow_available', 'spot_price', 'alt_price']`
   - NO PV forecast parameter
   - Only checks current overflow state, not future PV production
   - Defaults to Grid when overflow_available=False

2. Behavior: Returns Grid at ANY price (even 8 CZK/kWh) without PV consideration
   - Incident: Boiler forces early grid charging when PV would be cheaper

### Test Categories
1. **Battery architectural gaps** (2 tests):
   - `test_grid_charge_is_deferred_when_pv_expected` — function lacks PV param
   - `test_grid_charge_considers_pv_forecast_before_expensive_charging` — config lacks PV fields

2. **Boiler behavioral bugs** (3 tests):
   - `test_boiler_does_not_force_early_grid_charge` — recommends Grid at 5 CZK
   - `test_boiler_defers_to_pv_when_forecast_available` — recommends Grid at 4.5 CZK
   - `test_boiler_source_recommendation_lacks_pv_context` — method lacks PV param

3. **Combined incident** (1 test):
   - `test_combined_battery_boiler_incident_scenario` — NEITHER system has PV context

### Evidence Files
- `.sisyphus/evidence/task-2-incident-red.txt` — full test output (6 failures)
- `.sisyphus/evidence/task-2-boiler-conflict-red.txt` — boiler-specific output (3 failures)

### Key Insight
The precedence contract defines PV_FIRST (1000) > ECONOMIC_CHARGING (400), but neither system can enforce this because:
- Battery: No PV forecast input to economic_charging_plan()
- Boiler: No PV forecast parameter in _recommend_source()

Both systems independently lack the context needed to implement PV-first policy.
