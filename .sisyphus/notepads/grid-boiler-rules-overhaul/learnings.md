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

## [2026-03-03] Task 1 — Baseline Rule Matrix Creation

### Matrix Artifacts Created
- `.sisyphus/evidence/task-1-baseline-matrix.md` — Complete rule matrix (61 rules)
- `tests/test_rule_matrix_baseline.py` — Schema validation tests (46 tests, all GREEN)

### Rule Categories Extracted
| Category | Count | ID Range |
|----------|-------|----------|
| GR-NNN (Grid) | 13 | GR-001 to GR-013 |
| SOC-NNN (SOC) | 7 | SOC-001 to SOC-016 |
| BA-NNN (Balancing) | 16 | BA-001 to BA-024 |
| AS-NNN (Auto-Switch) | 13 | AS-001 to AS-013 |
| PR-NNN (Protection) | 4 | PR-001 to PR-004 |
| BO-NNN (Boiler) | 5 | BO-001 to BO-005 |
| PV-NNN (PV-First NEW) | 3 | PV-001 to PV-003 |

### Key Findings Confirmed
1. **Root Cause**: `charging_plan.py` economic charging loop does NOT check PV forecast availability
2. **Secondary**: `boiler/planner.py` `_recommend_source()` defaults to Grid with no battery/PV coordination
3. **TODO Markers**: All balancing TODOs resolved (plan.py:3, core.py:3,705,760,929)

### Conflict/Overlap Hotspots Documented
- Protection vs Economic (GR-010 vs GR-005)
- Balancing vs Economic (BA-021 vs GR-005)
- Mode Guard vs Auto-Switch (AS-012 vs AS-007)
- HW Hold vs Cost Optimization (SOC-006 vs GR-005)

### Precedence Alignment
Rule IDs aligned with `precedence_contract.py` RULE_TO_PRECEDENCE mapping:
- GR-010, SOC-003, SOC-006, SOC-013, BA-001 → PROTECTION_SAFETY (900)
- SOC-004, SOC-016, BA-019 → DEATH_VALLEY (800)
- BA-021, BA-022, BA-024 → BALANCING_OVERRIDE (700)
- AS-012, AS-013 → MODE_GUARD (600)
- GR-001, GR-008 → RECOVERY_MODE (500)
- GR-004, GR-005, PR-001, PR-004 → ECONOMIC_CHARGING (400)
- BA-011, BA-012, BA-007 → OPPORTUNISTIC (300)
- AS-007, AS-009 → AUTO_SWITCH (200)
- SOC-001, SOC-002 → PLANNING_TARGET (100)

### Test Evidence
```
46 passed in 0.28s
```
All schema validation tests GREEN.


## [2026-03-03] Task 7 — PV-First Gate Implementation (Battery Side)

### Implementation Summary
- Added 3 PV forecast fields to `EconomicChargingPlanConfig` dataclass
- Created `should_defer_for_pv()` pure function gate
- Integrated gate into `economic_charging_plan()` before candidates evaluated

### EconomicChargingPlanConfig New Fields
- `pv_forecast_kwh: float = 0.0` — Total PV forecast in kWh
- `pv_forecast_confidence: float = 0.0` — Forecast confidence (0.0-1.0)
- `pv_forecast_lookahead_hours: int = 6` — Lookahead window for PV forecast

### Gate Function Design
`should_defer_for_pv(pv_forecast_kwh, pv_forecast_confidence, current_soc_kwh, death_valley_threshold_kwh, protection_override_active, flags) -> bool`

Logic order (precedence-aware):
1. Check `is_pv_first_active(flags)` — if False, bypass gate (legacy behavior)
2. Check `protection_override_active` — if True, bypass gate (safety > PV-first)
3. Check `current_soc_kwh < death_valley_threshold_kwh` — if True, bypass gate (death-valley > PV-first)
4. Check minimum forecast thresholds (0.5 kWh, 0.3 confidence) — if not met, don't defer
5. Return True (defer grid charging)

### Integration Point
Gate inserted in `economic_charging_plan()` after `_apply_protection_override()` but before `get_candidate_intervals()`. This ensures:
- Protection charging happens regardless of PV-first
- Economic candidates are only evaluated if PV-first allows

### Test Results
- Tests 1, 2, 6: GREEN (battery side complete)
- Tests 3, 4, 5: RED (boiler side — Task 11)
- All 2891 existing tests: GREEN

### Evidence File
`.sisyphus/evidence/task-7-pv-defer-green.txt`


## [2026-03-03] Task 8 — Dynamic-by-Day Policy Scoring Layer

### Implementation Summary
- Created `dynamic_day_policy.py` with deterministic day-context policy selector
- DayContextProfile dataclass: `profile_id`, `reason_code`, `precedence_level`, `allows_grid_charging`, `pv_first_enforced`
- DayPolicySelector class with deterministic selection based on: forecast quality, price spread, SOC runway, demand profile

### Profile Types
- **PV_FIRST**: Strong PV day (>10kWh, >50% confidence) - grid charging deferred, precedence 1000
- **COST_AWARE**: Weak PV (<3kWh) + high spread (>30%) + safe runway (>6h) - economic optimization, precedence 400
- **CONSERVATIVE**: Degraded inputs or moderate conditions - safe defaults, precedence 400
- **LEGACY**: Feature flags disabled - original algorithm, precedence 400

### PV-First Hard Guard
- PV-first is a HARD top-level invariant at precedence 1000
- Dynamic layer NEVER overrides PV-first (operates at precedence 400)
- Strong PV day ALWAYS returns PV_FIRST profile regardless of cost factors
- This is enforced in selection order: feature flags → quality check → PV-first (HARD) → cost-aware → conservative

### Determinism Guarantee
- Same inputs ALWAYS produce same output (no random tie-breaking)
- Selection order is fixed: flags → quality → PV → spread → default
- First-wins rule on equal conditions

### Threshold Constants (PolicyThresholds)
- PV_STRONG_DAY_KWH = 10.0 (above this = strong PV)
- PV_WEAK_DAY_KWH = 3.0 (below this = weak PV)
- PV_CONFIDENCE_MIN = 0.5 (minimum to trust forecast)
- PRICE_SPREAD_HIGH_PERCENT = 30.0 (good arbitrage opportunity)
- SOC_RUNWAY_SAFE_HOURS = 6.0 (safe to defer charging)
- SOC_RUNWAY_CRITICAL_HOURS = 2.0 (must charge soon)

### Integration Points
- Consumes: InputQualityStatus from input_quality.py, RolloutFlags from rollout_flags.py, PrecedenceLevel from precedence_contract.py
- Consumed by: Economic charging decisions in charging_plan.py (future integration)
- Pure functions: select_day_policy(), is_pv_first_profile(), allows_economic_charging()

### Test Coverage
- 25 tests in test_dynamic_day_policy.py
- Key acceptance tests: test_selects_cost_profile_when_pv_weak, test_pv_first_hard_guard_not_overridden
- All 2919 tests pass (25 new, 3 expected boiler failures from Task 11)

### Evidence Files
- `.sisyphus/evidence/task-8-dynamic-cost-profile.txt` — cost-aware selection test
- `.sisyphus/evidence/task-8-pv-hard-guard.txt` — PV-first hard guard test


## [2026-03-03] Task 9 — Economic Charging Branch Precedence Contract

### Implementation Summary
- Added `DecisionTrace` dataclass for per-interval decision tracking
- Added reason code constants: `REASON_DEATH_VALLEY`, `REASON_PROTECTION_SAFETY`, `REASON_ECONOMIC_CHARGING`, `REASON_PV_FIRST`
- Modified `_apply_protection_override()` to add `precedence_reason` and `precedence_level` to timeline intervals
- Modified `_apply_economic_candidate()` to return `DecisionTrace` and add precedence fields to intervals
- Modified `economic_charging_plan()` to collect decision traces and include in metrics

### DecisionTrace Structure
```python
@dataclass(slots=True)
class DecisionTrace:
    index: int
    timestamp: str
    action: str  # "charge" | "skip" | "defer"
    reason_code: str  # Human-readable reason
    precedence_level: int  # Numeric PrecedenceLevel value
    precedence_name: str  # PrecedenceLevel enum name
    details: Dict[str, Any]  # Additional context
```

### Timeline Interval Fields (New)
- `precedence_reason`: String code (e.g., "death_valley", "economic_charging")
- `precedence_level`: Numeric PrecedenceLevel value (e.g., 800, 400)

### Metrics Output (New)
- `decision_trace`: List of dict entries for each decision, serialized from DecisionTrace

### Precedence Tagging by Branch
1. **Protection Override** → `REASON_PROTECTION_SAFETY` / `PrecedenceLevel.PROTECTION_SAFETY` (900)
2. **Death Valley Fix** → `REASON_DEATH_VALLEY` / `PrecedenceLevel.DEATH_VALLEY` (800)
3. **Economic Charging** → `REASON_ECONOMIC_CHARGING` / `PrecedenceLevel.ECONOMIC_CHARGING` (400)
4. **PV-First Deferral** → `REASON_PV_FIRST` / `PrecedenceLevel.PV_FIRST` (1000)

### Test Coverage
- `test_economic_branch_uses_contract`: Verifies economic charging emits decision trace with precedence
- `test_death_valley_has_higher_priority_than_defer`: Verifies death valley charging occurs even with PV-first enabled
- All 2921 tests pass (2919 baseline + 2 new, 3 expected boiler failures from Task 11)

### Evidence Files
- `.sisyphus/evidence/task-9-economic-precedence.txt` — Economic branch test output
- `.sisyphus/evidence/task-9-death-valley-priority.txt` — Death valley priority test output

### Key Insight
The decision trace is lightweight (simple dict in metrics) and does NOT require HA state storage.
Each trace entry includes full context for debugging: index, timestamp, action, reason_code, precedence_level, and details.


## [2026-03-03] Task 10 — Guard/Watchdog Race Prevention & Reason Propagation

### Implementation Summary
- Added `SwitchContext` dataclass to `auto_switch.py` for propagating reason codes and precedence levels
- Modified `execute_mode_change()` and `ensure_current_mode()` to accept and return `SwitchContext`
- Added reason code constants: `REASON_WATCHDOG_ENFORCEMENT`, `REASON_SCHEDULED_SWITCH`, `REASON_CURRENT_BLOCK`, `REASON_GUARD_LOCK`
- Updated `mode_guard.py` to include `reason_code`, `precedence_level`, `precedence_name` in override dictionaries

### SwitchContext Dataclass
```python
@dataclass(slots=True)
class SwitchContext:
    reason_code: str
    precedence_level: int = PrecedenceLevel.AUTO_SWITCH
    precedence_name: str = "AUTO_SWITCH"
    decision_source: str = "auto_switch"  # auto_switch | mode_guard | watchdog | manual
    locked_by_higher_precedence: bool = False
    details: Dict[str, Any] = field(default_factory=dict)
```

### Race Condition Prevention Mechanisms
1. **90-second duplicate request window** in `execute_mode_change()` - blocks rapid duplicate mode requests
2. **30-minute min interval** in `ensure_current_mode()` - prevents mode oscillation
3. **ServiceShield pending change check** - respects external mode change tracking
4. **`locked_by_higher_precedence` flag** - marks decisions locked by higher-priority layers

### Test Coverage
- Created `tests/test_auto_switch_precedence.py` with 9 tests
- Key tests: `test_no_race_between_guard_and_watchdog`, `test_reason_code_is_propagated_to_switch`
- Updated existing tests in `test_planning_auto_switch.py` to handle new `context` parameter

### Evidence Files
- `.sisyphus/evidence/task-10-guard-watchdog-race.txt` — pytest output for race test
- `.sisyphus/evidence/task-10-reason-propagation.txt` — pytest output for reason propagation test

### Integration Points
- `auto_switch.py` imports `PrecedenceLevel` from `precedence_contract.py`
- `mode_guard.py` imports `PrecedenceLevel` and adds to override dictionaries
- Reason codes flow from decision engine → `execute_mode_change()` → logging

### Gotcha: Mock Signature Compatibility
When updating function signatures with new optional parameters, existing mocks must also accept the new parameters. Updated `_ensure` and `_execute` mocks in `test_planning_auto_switch.py` to accept `context=None`.


## [2026-03-03] Task 11 — Boiler Coordination Contract with Battery-Aware Source Selection

### Implementation Summary
- Extended `_recommend_source()` in `boiler/planner.py` with PV forecast parameters
- Added PV-first precedence: when PV forecast > thresholds, returns FVE instead of Grid
- Preserved backward compatibility: Grid fallback when no PV available

### New Parameters
- `pv_forecast: float = 0.0` — PV forecast in kWh
- `pv_confidence: float = 0.0` — Forecast confidence (0.0-1.0)

### Threshold Constants (Class-level)
- `PV_FORECAST_MIN_KWH = 0.5` — Minimum PV forecast to defer
- `PV_CONFIDENCE_MIN = 0.3` — Minimum confidence to trust forecast

### Decision Order
1. FVE overflow (0 Kč) → return FVE
2. PV-first (forecast > 0.5 kWh AND confidence > 0.3) → return FVE
3. Alternative cheaper than Grid → return ALTERNATIVE
4. Fallback → return GRID

### Test Results
- All 6 incident tests: GREEN (tests 3, 4, 5 now pass)
- New test file: `tests/test_boiler_precedence.py` (2 tests)
- Full suite: 2935 passed, 0 failed

### Evidence Files
- `.sisyphus/evidence/task-11-boiler-battery-aware.txt`
- `.sisyphus/evidence/task-11-boiler-grid-fallback.txt`

### Key Insight
The parameter is named `pv_forecast` (not `pv_forecast_kwh`) because test 5 explicitly checks for parameter name matching `pv_forecast`, `pv_expected`, or `pv_available`. This naming convention is now part of the API contract.


## [2026-03-03] Task 13 — Observability Pack for Aggressive Rollout

### Implementation Summary
- Created `observability.py` pure Python module with no HA dependencies
- `RolloutMetrics` dataclass: tracks pv_defer_count, grid_charge_count, protection_bypass_count, boiler_source_outcomes, decision_reason_counts
- `RolloutGate` dataclass: evaluates rollout health with status (HEALTHY/DEGRADED/UNHEALTHY), alerts, recommendations
- `AlertCondition` dataclass: defines threshold + comparison + message + severity
- Pure functions: evaluate_rollout_health(), format_metrics_summary(), create_metrics_from_dict(), merge_metrics()

### Threshold Constants
- MAX_PROTECTION_BYPASS_RATE = 0.05 (5%) - critical alert if exceeded
- MIN_PV_DEFER_RATE = 0.10 (10%) - warning if below when PV-first enabled
- MAX_GRID_CHARGE_RATE = 0.30 (30%) - warning if exceeded when PV-first enabled

### Health Status Logic
- HEALTHY: No alerts triggered
- DEGRADED: Warning-level alerts only
- UNHEALTHY: Any critical-level alert (triggers should_pause=True)

### Design Patterns
- Mutable counters for incremental updates during decision cycle
- Rate calculations handle zero-decision edge case (return 0.0)
- Metrics snapshot isolation: snapshot is a copy, not affected by later changes
- merge_metrics() finds MAX timestamp (not first in reverse order)

### Test Coverage
- 29 tests in test_observability.py
- Key tests: test_pv_defer_counter_increments, test_protection_bypass_alerts_threshold, test_boiler_source_outcome_tracking
- Acceptance tests: test_rollout_gate_passes_healthy_metrics, test_rollout_gate_fails_on_high_bypass_rate
- Full suite: 2964 passed (2935 baseline + 29 new)

### Evidence Files
- `.sisyphus/evidence/task-13-observability-counters.txt` — full test output
- `.sisyphus/evidence/task-13-rollout-gate.txt` — rollout gate acceptance tests

### Integration Considerations
- Module is standalone (no integration in decision loop yet — Task 14)
- Consumes: RolloutFlags, PrecedenceLevel (for reason codes)
- Will be consumed by: hybrid_planning.py for metrics collection during charging decisions


## [2026-03-03] Task 16 — Regression Hardening Edge-Case Cluster B + Rollout Canary Checks

### Implementation Summary
- Created `tests/test_regression_cluster_b.py` with 13 tests (exceeds 12 minimum)
- Three test classes: boiler coordination edge cases, observability canary checks, rollout flag combinations

### Test Categories

#### Boiler Coordination Edge Cases (5 tests)
- `test_boiler_pv_forecast_exactly_at_minimum` — 0.5 kWh exactly at threshold → FVE
- `test_boiler_pv_forecast_below_minimum_falls_back_to_grid` — 0.49 kWh → Grid
- `test_boiler_with_zero_confidence_no_defer` — 0.0 confidence → Grid
- `test_boiler_overflow_always_wins_over_pv_forecast` — overflow takes priority
- `test_boiler_alternative_source_beats_grid_even_without_pv` — economic fallback works

#### Observability Gate Canary Checks (6 tests)
- `test_canary_healthy_run_metrics_passes_gate` — realistic 80/20 split → HEALTHY
- `test_canary_high_bypass_rate_fails_gate` — 10% bypass → UNHEALTHY
- `test_canary_low_pv_defer_when_pv_enabled_fails` — 0% defer → DEGRADED
- `test_canary_grid_charge_rate_above_threshold_with_pv_fails` — 35% grid → DEGRADED
- `test_canary_zero_decisions_with_pv_enabled_warns` — 0 decisions + PV enabled → DEGRADED
- `test_canary_zero_decisions_pv_disabled_passes` — 0 decisions + PV disabled → HEALTHY

#### Rollout Flag Combination Checks (2 tests)
- `test_all_flags_enabled_full_policy_active` — all flags True → full new policy
- `test_emergency_rollback_disables_all_policy` — emergency_rollback=True → all disabled

### Key Finding: Zero Decisions Edge Case
- When `total_decisions == 0`, rate calculations return 0.0
- This triggers `min_pv_defer_rate` warning when `pv_first_enabled=True` (0.0 < 0.1)
- **Current behavior**: Fresh installations with PV-first enabled see warnings until decisions are made
- **Mitigation**: With `pv_first_enabled=False`, gate passes (PV checks skipped)
- This is documented in test `test_canary_zero_decisions_with_pv_enabled_warns`

### Threshold Constants Verified
From `boiler/planner.py`:
- `PV_FORECAST_MIN_KWH = 0.5`
- `PV_CONFIDENCE_MIN = 0.3`

From `observability.py`:
- `MAX_PROTECTION_BYPASS_RATE = 0.05` (5%)
- `MIN_PV_DEFER_RATE = 0.10` (10%)
- `MAX_GRID_CHARGE_RATE = 0.30` (30%)

### Test Results
- 13 new tests: ALL GREEN
- Full suite: 3016 passed, 2 failed (pre-existing in test_regression_cluster_a.py)
- No regressions introduced by new tests

### Evidence Files
- `.sisyphus/evidence/task-16-regression-b.txt` — full test output
- `.sisyphus/evidence/task-16-canary-checks.txt` — canary-specific tests
