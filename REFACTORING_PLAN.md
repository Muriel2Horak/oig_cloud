# REFACTORING PLAN - Battery Planning System

**Verze:** 1.0
**Datum:** 2025-01-XX
**Status:** DRAFT - Current State Analysis

**Účel:** Refaktorovat stávající battery planning systém podle specifikace v BUSINESS_REQUIREMENTS.md.

---

## 1. CURRENT STATE ANALYSIS

### 1.1 Existing Implementation Overview

#### 1.1.1 Core Files Identified

**Planning & Forecast:**
- `oig_cloud_battery_forecast.py` (10,714 lines)
  - `OigCloudBatteryForecastSensor` - hlavní senzor pro predikci a plánování
  - `OigCloudBatteryForecastPerformanceSensor` - performance tracking
  - Klíčové metody:
    - `_calculate_optimal_modes_hybrid()` - 9-phase hybridní algoritmus (line 1864)
    - `_optimize_grid_charging()` - optimalizace nabíjení ze sítě (line 6505)
    - `_economic_charging_plan()` - ekonomický plán nabíjení (line 6666)
    - `_smart_charging_plan()` - legacy percentile-based (line 6930)
    - `plan_charging_to_target()` - plánování nabití k cílovému SoC (line 8008)
    - `apply_charging_plan()` - aplikace plánu (line 8324)
    - `update_plan_lifecycle()` - lifecycle management (line 8390)
    - `cancel_charging_plan()` - zrušení plánu (line 8452)
    - `get_active_plan()` - získání aktivního plánu (line 8483)
    - `simulate_charging_plan()` - simulace plánu (line 8505)

**Balancing:**
- `oig_cloud_battery_balancing.py` (2,588 lines)
  - `OigCloudBatteryBalancingSensor` - správa battery balancing
  - Klíčové metody:
    - `_planning_loop()` - hodinový planning loop (background task)
    - `_balancing_profiling_loop()` - denní profiling loop (background task)
    - `_detect_last_balancing_from_history()` - detekce posledního balancování
    - `_find_candidate_windows()` - economic window selection
  - 7d Balancing Decision Profiling:
    - `BALANCING_PROFILE_EVENT_TYPE` - event type pro recorder
    - `MAX_BALANCING_PROFILES = 52` (52 týdnů)
    - Similarity scoring: spot_price (40%), solar (30%), success (30%)

**API Endpoints:**
- `api/ha_rest_api.py`
  - `OIGCloudBatteryTimelineView` - GET timeline data (line 44)
  - `OIGCloudSpotPricesView` - GET spot prices (line 162)
  - `OIGCloudAnalyticsView` - GET analytics (line 277)
  - `OIGCloudBalancingDecisionsView` - GET balancing decisions (line 437)
  - `OIGCloudUnifiedCostTileView` - GET unified cost tile (line 531)

- `api/ote_api.py`
  - OTE spot price fetching and caching
  - 15min interval price handling

- `api/api_chmu.py`
  - ČHMÚ CAP XML parsing
  - Weather warning detection
  - Point-in-polygon/circle filtering

**Configuration:**
- `config_flow_new.py`
  - `OigCloudConfigFlow` - wizard-based config flow (line 120)
  - Steps: welcome → auth → basic → features → shield/solar/pricing → summary
  - Multi-step process s navigací zpět

**Storage:**
- Daily plans: `/config/.storage/oig_cloud_daily_plans/`
  - JSON files per date
  - Metody: `_save_daily_plan_to_storage()`, `_load_daily_plan_from_storage()`

**Related Modules:**
- `boiler/planner.py` - Boiler planning (nezávislý modul)
- `oig_cloud_solar_forecast.py` - FVE forecast

---

### 1.2 What Works (Can Be Preserved/Adapted)

✅ **Storage Infrastructure:**
- JSON file-based persistence v `/config/.storage/oig_cloud_daily_plans/`
- Atomic writes, restore from HA storage
- Daily plan archiving works

✅ **API Infrastructure:**
- REST API endpoints are functional
- Box ID routing works
- Authentication framework exists (currently disabled)

✅ **OTE Pricing:**
- Spot price fetching from OTE
- 15min interval handling
- CNB exchange rate conversion
- Caching mechanism

✅ **ČHMÚ Integration:**
- CAP XML parsing
- Weather warning detection
- Severity mapping (Minor/Moderate/Severe/Extreme)
- GPS-based filtering (point-in-polygon)

✅ **Config Flow:**
- Wizard-based multi-step flow
- Feature toggles (Shield, Solar, Pricing)
- Navigation forward/backward

✅ **Background Tasks:**
- Hourly balancing planning loop
- Daily profiling loop
- Proper async task management (create_background_task)

✅ **Timeline Data Structure:**
- 15min intervals (96/day)
- Timestamps, SoC, cost tracking
- Baseline vs. active timeline separation

---

### 1.3 What Is Broken (Needs Fixing/Removal)

❌ **CRITICAL BUG - Battery Minimum Clamping:**
- **Location:** Simulation loops, timeline generation
- **Problem:** `max(0, battery)` should be `max(min_capacity, battery)`
- **Impact:** Baterie může klesnout pod hardware minimum (20%)
- **BR Violation:** BR-0.3.1 Hardware Minimum Constraint
- **Fix Priority:** P0 - IMMEDIATE

❌ **Mode Selection Logic:**
- **Location:** `_calculate_optimal_modes_hybrid()` (line 1864)
- **Problem:**
  - HOME II/III selection based on avg_price a future_prices
  - Ignoruje FVE forecast quality
  - Nerespektuje BR-1.2 behavior rules (zejména HOME III = max FVE → battery)
- **BR Violation:** BR-1.2 Mode Behavior, BR-3.5 Mode Selection
- **Fix Priority:** P1 - HIGH

❌ **Grid Charging Optimization:**
- **Location:** `_optimize_grid_charging()`, `_economic_charging_plan()`
- **Problem:**
  - Dual algorithm (economic vs legacy percentile-based)
  - Neimplementuje BR-3.4 Deficit Fix properly
  - Chybí prioritization podle BR-3.6 (P0 > P1 > P2 > P3)
  - Neřeší boiler integration z BR-0.1.8
- **BR Violation:** BR-3.4 Deficit Fix, BR-3.6 Optimization Priorities
- **Fix Priority:** P1 - HIGH

❌ **Balancing Integration:**
- **Location:** `plan_charging_to_target()`, balancing sensor coordination
- **Problem:**
  - Balancing sensor volá forecast planning API
  - Timeline **NEOBSAHUJE** holding intervals (BR-4.6.2 violated)
  - Emergency handling není podle BR-4.7 (apply anyway)
  - Mediána kalkulace není podle BR-4.3.1 (100% → OTE end)
- **BR Violation:** BR-4.6.2 Planner Outputs, BR-4.3 Economic Mode, BR-4.7 Emergency
- **Fix Priority:** P1 - HIGH

❌ **Weather Risk Emergency:**
- **Location:** MISSING - není implementováno
- **Problem:** BR-7.2 Weather Risk Emergency chybí kompletně
  - Chybí emergency_mode config parameter
  - Chybí emergency_levels config
  - Chybí logika "nabít na 100% K ZAČÁTKU varování"
  - Chybí holding do konce ČHMÚ aktivního varování
- **BR Violation:** BR-7.2 Weather Risk Emergency
- **Fix Priority:** P2 - MEDIUM (feature enhancement)

❌ **Target Capacity Soft Constraint:**
- **Location:** `_calculate_optimal_modes_hybrid()` backward pass
- **Problem:**
  - `required_battery[n] = max(target_capacity, min_capacity)` is WRONG
  - Target je SOFT constraint, min je HARD
  - Pokud není ekonomické nabít na target, mělo by stačit min_capacity
- **BR Violation:** BR-0.3.2 Target Capacity Soft Constraint, BR-3.6 Priorities
- **Fix Priority:** P1 - HIGH

❌ **Export Limits:**
- **Location:** Cost calculation, timeline simulation
- **Problem:**
  - BR-0.1.9 export limit sensor není integrován
  - BR-7.3 Export Limit (p_max_feed_grid × 0.25) není implementován
  - Timeline může plánovat export přes limit
- **BR Violation:** BR-0.1.9, BR-7.3 Export Limit
- **Fix Priority:** P2 - MEDIUM

❌ **Plan Status Lifecycle:**
- **Location:** `update_plan_lifecycle()`, storage
- **Problem:**
  - Chybí pending → active → completed flow z BR-2.2
  - Chybí "exactly one active plan" enforcement z BR-2.2.2
  - Chybí invalidation při OTE update z BR-2.4.1
  - Plan reversion není podle BR-2.6
- **BR Violation:** BR-2.2 Plan Status, BR-2.4 Plan Persistence
- **Fix Priority:** P1 - HIGH

❌ **Metadata Tracking:**
- **Location:** Timeline, plan results
- **Problem:**
  - Chybí metadata z BR-3.7:
    - `total_cost` (implemented partial)
    - `min_capacity_violations` (missing)
    - `target_capacity_violations` (missing)
    - `mode_switches` (missing count)
    - `clamp_events` (missing)
- **BR Violation:** BR-3.7 Metadata
- **Fix Priority:** P2 - MEDIUM

❌ **Config Flow Parameters:**
- **Location:** `config_flow_new.py`, options flow
- **Problem:**
  - Chybí threshold_cheap (BR-0.2.4)
  - Chybí safety_margin (BR-0.2.5)
  - Balancing params nejsou v config flow (holding_hours, max_balancing_interval)
  - Weather emergency params chybí (emergency_mode, emergency_levels)
- **BR Violation:** BR-0.2 Configuration Parameters
- **Fix Priority:** P2 - MEDIUM

---

### 1.4 What Is Missing (Needs New Implementation)

🆕 **Simulation Engine Refactor:**
- BR-3.1 Simulation Per Interval - potřebuje clean implementation
- Separace: simulation logic ≠ optimization logic
- Input: interval params, Output: battery_after, cost, clamp_deficit
- **Reason:** Současná simulace je rozptýlená napříč metodami

🆕 **Unified Planning API:**
- BR-2.7 API Endpoints - potřebuje kompletní implementaci
- POST /calculate - vypočítat plán BEZ aplikace
- POST /apply - aplikovat pending plán
- POST /revert - vrátit na předchozí
- DELETE /plan_id - smazat plán
- **Reason:** Současné API je jen read-only (GET endpoints)

🆕 **Manual Plan Creator:**
- BR-2.1.2 Manual Plan - UI + backend
- User-defined timeline (mode per interval)
- Validation against constraints
- **Reason:** Chybí kompletně, jen automatic planning existuje

🆕 **Simulation Comparison:**
- BR-2.1.3 Simulation Plan - compare scenarios
- Side-by-side cost comparison
- What-if analysis
- **Reason:** Partial exists (`simulate_charging_plan()`), needs full feature

🆕 **Boiler Integration:**
- BR-0.1.8 Boiler Status/Power sensors
- BR-3.2 Cost Function - boiler priority scheduling
- **Reason:** Boiler exists separately, not integrated into battery planning

🆕 **Tolerance & Floating Point:**
- BR-3.8 Tolerance 500Wh (0.5kWh)
- Use `abs(battery - min_capacity) < TOLERANCE` instead of `battery < min_capacity`
- **Reason:** Floating point precision issues

🆕 **Frontend Components:**
- BR-8 Frontend Requirements - všechny komponenty chybí nebo jsou nekonzistentní
- Timeline view s mode indicators
- Plan summary card
- Balancing status widget
- Weather risk indicator
- Manual plan creator UI
- Simulation comparison view
- **Reason:** Dashboard existuje ale není podle BR-8 specifikace

---

### 1.5 Code Quality Issues

⚠️ **File Size:**
- `oig_cloud_battery_forecast.py` = 10,714 lines
- **Problem:** God object anti-pattern
- **Impact:** Těžká maintenance, testovatelnost
- **Solution:** Split into modules (planning, simulation, optimization, api)

⚠️ **Type Safety:**
- Partial type hints, many `Any` types
- **Problem:** Runtime type errors
- **Solution:** Full typing coverage, strict mypy

⚠️ **Code Duplication:**
- Multiple simulation loops (HOME I, II, III, UPS)
- Charging logic duplicated (economic vs legacy)
- **Solution:** Extract common logic, single source of truth

⚠️ **Error Handling:**
- Broad `except Exception` blocks
- **Problem:** Skryté chyby, hard to debug
- **Solution:** Specific exceptions, proper logging levels

⚠️ **Testing:**
- Test coverage unknown (pytest.ini exists)
- **Problem:** No confidence in refactoring
- **Solution:** Write tests BEFORE refactoring

⚠️ **Documentation:**
- Inline comments částečně v češtině, částečně v angličtině
- **Problem:** Inconsistency
- **Solution:** Unified language (preferably English in code)

⚠️ **Magic Numbers:**
- `0.88` (efficiency), `2.8` (charge rate), `500W` (FVE threshold)
- **Problem:** Unclear meaning, hard to change
- **Solution:** Named constants with units

---

## 2. TARGET ARCHITECTURE

### 2.1 Module Structure (New Organization)

```
custom_components/oig_cloud/
├── planning/                          # NEW MODULE
│   ├── __init__.py
│   ├── constants.py                   # BR constants (modes, priorities, tolerance)
│   ├── types.py                       # Type definitions (PlanningInterval, Plan, etc.)
│   ├── simulation.py                  # BR-3.1 Simulation engine
│   ├── cost_calculator.py             # BR-3.2 Cost function
│   ├── mode_selector.py               # BR-3.5 Mode selection logic
│   ├── deficit_fixer.py               # BR-3.4 Deficit fix
│   ├── optimizer.py                   # BR-3.6 Optimization (P0-P3 priorities)
│   ├── planner.py                     # Main planning orchestrator
│   └── plan_manager.py                # BR-2 Plan lifecycle management
│
├── balancing/                         # REFACTOR EXISTING
│   ├── __init__.py
│   ├── detector.py                    # Detection (SoC >= 98% for hold_hours)
│   ├── economic_planner.py            # BR-4.3 Economic mode
│   ├── forced_planner.py              # BR-4.4 Forced mode (day 7+)
│   ├── opportunistic_handler.py       # BR-4.2 Opportunistic balancing
│   └── balancing_sensor.py            # Refactored sensor (slim coordinator)
│
├── safety/                            # NEW MODULE
│   ├── __init__.py
│   ├── weather_monitor.py             # BR-7.2 Weather risk emergency
│   ├── capacity_guard.py              # BR-7.1 Min capacity enforcement
│   └── limit_enforcer.py              # BR-7.3 Export/grid limits
│
├── api/                               # EXTEND EXISTING
│   ├── ha_rest_api.py                 # EXTEND with BR-2.7 endpoints
│   │   # NEW: POST /calculate, /apply, /revert, DELETE /plan_id
│   ├── ote_api.py                     # KEEP (works)
│   └── api_chmu.py                    # KEEP (works)
│
├── config/                            # REFACTOR
│   ├── config_flow.py                 # Simplified flow with ALL BR-0.2 params
│   └── validation.py                  # Parameter validation
│
├── sensors/                           # SLIM DOWN
│   ├── battery_forecast.py            # SLIM - delegate to planning module
│   └── battery_balancing.py           # SLIM - delegate to balancing module
│
├── storage/                           # NEW MODULE
│   ├── __init__.py
│   ├── plan_storage.py                # BR-2.4 JSON file persistence
│   └── profile_storage.py             # Balancing profiles
│
└── utils/                             # COMMON
    ├── constants.py                   # Global constants
    ├── types.py                       # Shared types
    └── helpers.py                     # Common helpers
```

---

### 2.2 Data Flow (Target Architecture)

#### 2.2.1 Planning Flow (BR-2, BR-3)

```
User/Automation
    ↓
API: POST /calculate
    ↓
PlanManager.calculate_plan()
    ↓
┌─────────────────────────────────────────────────────┐
│ Planner.optimize()                                  │
│  1. Load inputs (sensors, config, forecast)        │
│  2. Build intervals (96 × 15min)                    │
│  3. Simulation.simulate_all() - BR-3.1              │
│  4. Optimizer.optimize_modes() - BR-3.6             │
│     - Priority P0: Min capacity (DeficitFixer)     │
│     - Priority P1: Target capacity                  │
│     - Priority P2: Cost (CostCalculator)            │
│     - Priority P3: Mode switches (ModeSelector)     │
│  5. Metadata calculation - BR-3.7                   │
│  6. Return Plan object                              │
└─────────────────────────────────────────────────────┘
    ↓
PlanManager.save_plan(status=pending)
    ↓
API Response: {plan_id, timeline, metadata, status=pending}
    ↓
User reviews (optional)
    ↓
API: POST /apply/{plan_id}
    ↓
PlanManager.apply_plan()
    - Deactivate current active plan
    - Set plan status = active
    - Update battery_forecast sensor state
    ↓
Battery operates according to plan timeline
```

#### 2.2.2 Balancing Flow (BR-4)

```
BalancingSensor (hourly loop)
    ↓
Detector.detect_balancing_needed()
    - Check SoC >= 98% for hold_hours
    - Check days_since_last
    ↓
Decision: Opportunistic / Economic / Forced
    ↓
┌─────────────────────────────────────────────┐
│ EconomicPlanner.find_optimal_window()      │
│  - Calculate mediána from 100% to OTE end  │
│  - Find cheapest consecutive hold_hours    │
│  - Return target_time, target_soc=100%     │
└─────────────────────────────────────────────┘
    ↓
API: POST /calculate
    - Request: target_soc=100%, target_time, holding_hours
    ↓
Planner.optimize() - creates timeline INCLUDING holding
    ↓
API Response: {feasible, timeline, cost}
    ↓
If feasible=true:
    Apply plan normally
If feasible=false (BR-4.7 Emergency):
    Apply anyway (battery health > perfection)
    Log warning
```

#### 2.2.3 Weather Emergency Flow (BR-7.2)

```
WeatherMonitor (checks ČHMÚ sensor every 15min)
    ↓
Warning detected (orange/red level)
    ↓
WeatherMonitor.create_emergency_plan()
    - target_soc = 100%
    - target_time = warning_start (K ZAČÁTKU)
    - holding_mode = HOME_III (hold until inactive)
    ↓
API: POST /calculate (priority=emergency)
    ↓
Planner.optimize() - emergency overrides balancing
    ↓
PlanManager.apply_plan(priority=emergency)
    - Deactivate balancing plan if exists
    - Apply emergency plan immediately
    ↓
Monitor ČHMÚ sensor state
    ↓
When sensor.state = "inactive":
    Revert to normal planning
```

---

### 2.3 API Changes (BR-2.7)

#### NEW Endpoints:

```python
# POST /api/oig_cloud/plans/{box_id}/calculate
# Body: {type: "automatic"|"manual"|"simulation", config: {...}}
# Response: {plan_id, status: "pending", timeline: [...], metadata: {...}}

# POST /api/oig_cloud/plans/{box_id}/apply/{plan_id}
# Response: {success: true, active_plan_id}

# POST /api/oig_cloud/plans/{box_id}/revert/{plan_id}
# Response: {success: true, reverted_to: plan_id}

# DELETE /api/oig_cloud/plans/{box_id}/{plan_id}
# Response: {success: true}

# GET /api/oig_cloud/plans/{box_id}/active
# Response: {plan_id, status: "active", timeline: [...], applied_at: "..."}

# GET /api/oig_cloud/plans/{box_id}/{plan_id}
# Response: {plan_id, status, timeline, metadata, created_at, applied_at}
```

#### KEEP Existing (works):
- GET /api/oig_cloud/battery_forecast/{box_id}/timeline
- GET /api/oig_cloud/spot_prices/{box_id}
- GET /api/oig_cloud/analytics/{box_id}
- GET /api/oig_cloud/balancing_decisions/{box_id}

---

### 2.4 Configuration Changes (BR-0.2)

#### Add Missing Parameters:

```yaml
# Config Flow - Battery Planning Section
min_capacity_percent: 33.0          # BR-0.2.1 (existing)
target_capacity_percent: 80.0       # BR-0.2.2 (existing)
home_charge_rate: 2.8              # BR-0.2.3 (existing)
threshold_cheap: 1.5               # BR-0.2.4 (NEW) - cena pod kterou je "levná"
safety_margin: 2.0                 # BR-0.2.5 (NEW) - bezpečnostní margin kWh

# Config Flow - Balancing Section
enable_balancing: true             # Feature toggle
holding_hours: 3                   # BR-4.1.2 (NEW) - holding duration
max_balancing_interval: 7          # BR-4.4.1 (NEW) - forced mode trigger

# Config Flow - Weather Risk Section
enable_weather_risk: true          # Feature toggle (existing)
emergency_mode: false              # BR-7.2.1 (NEW) - emergency vs normal
emergency_levels:                  # BR-7.2.2 (NEW)
  - orange
  - red
weather_risk_target_soc: 70.0     # BR-7.2.3 (existing) - normal mode target
```

---

## 3. MIGRATION STRATEGY

### 3.1 Refactoring Principles

1. **Non-Breaking Changes First**
   - Create new modules alongside existing code
   - Gradual migration, component by component
   - Keep existing functionality working during transition

2. **Testing Before Refactoring**
   - Write tests for current behavior (even if buggy)
   - Document what SHOULD change vs MUST preserve
   - Test new components in isolation

3. **Feature Flags**
   - Use config toggles for new features
   - Allow rollback to legacy behavior if needed
   - Example: `enable_new_planning_engine: false` during testing

4. **Breaking Changes Documentation**
   - Document ALL API/interface changes
   - Provide migration guide for users
   - Version bumping: v2.0.4 → v3.0.0

5. **Backward Compatibility**
   - Preserve storage format (JSON files)
   - Maintain sensor entity IDs
   - Keep existing API endpoints working (deprecate gracefully)

---

### 3.2 Refactoring Phases

#### Phase 1: Core Planning Engine (P0 fixes)
**Goal:** Fix critical bugs, establish new planning module

**Tasks:**
1. Create `planning/` module structure
2. Extract `simulation.py` with BR-3.1 implementation
   - Fix: `max(min_capacity, battery)` clamping
   - Add: Tolerance 500Wh (BR-3.8)
3. Extract `cost_calculator.py` with BR-3.2
   - Add: Boiler integration
   - Fix: Export limit enforcement
4. Extract `deficit_fixer.py` with BR-3.4
   - Properly handle min_capacity violations
5. Write unit tests for all planning components
6. Feature flag: `enable_new_planning_engine`

**Deliverables:**
- `planning/simulation.py` - simulation engine
- `planning/cost_calculator.py` - cost function
- `planning/deficit_fixer.py` - deficit fix
- `tests/test_planning_*.py` - test suite
- Migration guide: "New Planning Engine"

**Impact:**
- **Breaking:** Planning API internal interfaces change
- **Non-breaking:** Sensor outputs remain same format
- **Dependency:** Battery forecast sensor needs update to use new modules

**Testing:**
- Run side-by-side comparison (old vs new engine)
- Validate against real historical data
- Ensure min_capacity never violated

---

#### Phase 2: Plan Lifecycle Management
**Goal:** Implement BR-2 plan status, API endpoints, storage

**Tasks:**
1. Create `planning/plan_manager.py`
   - BR-2.2 Plan Status lifecycle
   - BR-2.4 Plan persistence
   - BR-2.5 Atomic writes
   - BR-2.6 Plan reversion
2. Create `storage/plan_storage.py`
   - Refactor existing JSON storage
   - Add plan versioning
3. Extend `api/ha_rest_api.py`
   - POST /calculate, /apply, /revert
   - DELETE /plan_id
   - GET /active, /plan_id
4. Update config flow with missing params
   - threshold_cheap, safety_margin
5. Write integration tests

**Deliverables:**
- `planning/plan_manager.py`
- `storage/plan_storage.py`
- Extended API endpoints
- Updated config flow
- API documentation

**Impact:**
- **Breaking:** New API endpoints (old endpoints kept for compatibility)
- **Non-breaking:** Storage format extends (backward compatible)
- **Dependency:** Frontend needs update to use new API

**Testing:**
- Test plan status transitions
- Test "exactly one active plan" enforcement
- Test plan reversion chain

---

#### Phase 3: Balancing Integration
**Goal:** Implement BR-4 balancing with proper planning integration

**Tasks:**
1. Refactor `balancing/balancing_sensor.py`
   - Slim down to coordinator role
   - Delegate to new balancing modules
2. Create `balancing/detector.py` - BR-4.1 detection
3. Create `balancing/economic_planner.py` - BR-4.3
   - Mediána calculation (100% → OTE end)
   - Cheapest window selection
4. Create `balancing/forced_planner.py` - BR-4.4
   - Day 7+ enforcement
   - Emergency handling (BR-4.7)
5. Create `balancing/opportunistic_handler.py` - BR-4.2
6. Update planning API to accept balancing requests
   - `holding_hours` parameter
   - Timeline INCLUDES holding intervals
7. Add balancing config params to config flow

**Deliverables:**
- Refactored balancing modules
- Updated planning API
- Balancing config flow
- Integration tests

**Impact:**
- **Breaking:** Balancing sensor internal state changes
- **Breaking:** Planning API signature (adds holding_hours)
- **Non-breaking:** Sensor outputs same format
- **Dependency:** Battery forecast planning API

**Testing:**
- Test mediána calculation accuracy
- Test holding interval inclusion in timeline
- Test emergency mode (apply anyway when feasible=false)
- Test forced mode trigger (day 7+)

---

#### Phase 4: Weather Risk & Safety
**Goal:** Implement BR-7 safety margins, weather emergency

**Tasks:**
1. Create `safety/` module
2. Create `safety/weather_monitor.py`
   - ČHMÚ sensor monitoring
   - Emergency plan creation
   - BR-7.2 implementation (100% by warning_start)
3. Create `safety/capacity_guard.py`
   - Enforcement of min_capacity across all operations
4. Create `safety/limit_enforcer.py`
   - Export limit (BR-7.3)
   - Grid charging limit (BR-7.4)
5. Integrate weather emergency into plan manager
   - Priority: emergency > balancing > normal
6. Add weather config params to config flow
   - emergency_mode, emergency_levels

**Deliverables:**
- `safety/` module
- Weather emergency implementation
- Safety guards for all limits
- Config flow updates

**Impact:**
- **Breaking:** Plan priority system (emergency overrides)
- **Non-breaking:** Optional feature (config toggle)
- **Dependency:** ČHMÚ sensor must exist

**Testing:**
- Test emergency plan creation on warning
- Test holding until sensor inactive
- Test priority override (emergency > balancing)
- Test export/grid limits enforcement

---

#### Phase 5: Frontend & UX
**Goal:** Implement BR-8 frontend requirements

**Tasks:**
1. Audit existing dashboard components
2. Create new components per BR-8.2:
   - Timeline view (mode indicators)
   - Plan summary card
   - Balancing status widget
   - Weather risk indicator
   - Manual plan creator
   - Simulation comparison view
3. Implement backend-driven UI (BR-8.1)
   - FE ONLY displays, NO calculations
4. Design consistency (BR-8.3)
5. Real-time updates (BR-8.5)
6. Error handling (BR-8.7)

**Deliverables:**
- Updated dashboard YAML
- New Lovelace cards
- API integration
- UX documentation

**Impact:**
- **Breaking:** Dashboard YAML structure changes
- **Non-breaking:** Users can keep old dashboard
- **Dependency:** All backend APIs must be ready

**Testing:**
- UI testing (manual)
- API response validation
- Real-time update latency

---

### 3.3 Component Change Specification

#### 3.3.1 Battery Forecast Sensor

**File:** `sensors/battery_forecast.py` (currently `oig_cloud_battery_forecast.py`)

**Changes:**

**REMOVE:**
- `_calculate_optimal_modes_hybrid()` → migrate to `planning/optimizer.py`
- `_optimize_grid_charging()` → migrate to `planning/planner.py`
- `_economic_charging_plan()` → migrate to `planning/optimizer.py`
- `_smart_charging_plan()` → DELETE (legacy, replaced)
- `plan_charging_to_target()` → migrate to `planning/planner.py`
- Simulation loops → migrate to `planning/simulation.py`

**KEEP:**
- Sensor entity structure (`OigCloudBatteryForecastSensor`)
- Coordinator integration
- Timeline data cache (`_timeline_data`, `_baseline_timeline`)
- State restoration (`async_added_to_hass()`)
- Attributes for HA

**ADD:**
- Dependency injection: `PlanManager`, `Planner`
- Delegation to planning module:
  ```python
  async def async_update(self):
      plan = await self.plan_manager.get_active_plan()
      self._timeline_data = plan.timeline
      self._attr_native_value = plan.timeline[-1]["battery_soc"]
  ```

**Impact:**
- File size: 10,714 lines → ~500 lines (sensor logic only)
- Dependencies: Add `from planning import PlanManager, Planner`
- Tests: Update mocks to use planning module

---

#### 3.3.2 Battery Balancing Sensor

**File:** `balancing/balancing_sensor.py` (currently `oig_cloud_battery_balancing.py`)

**Changes:**

**REMOVE:**
- `_find_candidate_windows()` → migrate to `balancing/economic_planner.py`
- Inline balancing logic → migrate to specific modules

**KEEP:**
- Sensor entity structure
- `_planning_loop()` (hourly background task)
- `_balancing_profiling_loop()` (daily profiling)
- State restoration
- History detection

**ADD:**
- Dependency injection: `Detector`, `EconomicPlanner`, `ForcedPlanner`, `OpportunisticHandler`
- Delegation:
  ```python
  async def _planning_loop(self):
      while True:
          if self.detector.needs_balancing():
              mode = self.detector.determine_mode()  # opportunistic/economic/forced
              plan = await self.economic_planner.find_optimal_window()
              await self.plan_manager.calculate_and_apply(plan)
          await asyncio.sleep(3600)  # hourly
  ```

**Impact:**
- File size: 2,588 lines → ~400 lines
- Dependencies: Add balancing modules
- Tests: Mock balancing module responses

---

#### 3.3.3 REST API Endpoints

**File:** `api/ha_rest_api.py`

**Changes:**

**EXTEND:**
```python
# NEW endpoints
class OIGCloudPlanCalculateView(HomeAssistantView):
    url = "/api/oig_cloud/plans/{box_id}/calculate"
    name = "api:oig_cloud:plan_calculate"

    async def post(self, request, box_id):
        data = await request.json()
        plan = await plan_manager.calculate_plan(box_id, data)
        return web.json_response(plan.to_dict())

class OIGCloudPlanApplyView(HomeAssistantView):
    url = "/api/oig_cloud/plans/{box_id}/apply/{plan_id}"
    name = "api:oig_cloud:plan_apply"

    async def post(self, request, box_id, plan_id):
        success = await plan_manager.apply_plan(box_id, plan_id)
        return web.json_response({"success": success})

# Similar for /revert, DELETE
```

**KEEP:**
- All existing GET endpoints (timeline, spot_prices, analytics, balancing_decisions)
- Authentication framework (requires_auth)

**Impact:**
- Breaking: New API contract
- Non-breaking: Old endpoints still work
- Dependency: `PlanManager` must be available

---

#### 3.3.4 Config Flow

**File:** `config/config_flow.py` (currently `config_flow_new.py`)

**Changes:**

**ADD Parameters:**
```python
# In async_step_basic() or new async_step_planning()
vol.Required("threshold_cheap", default=1.5): vol.Coerce(float),
vol.Required("safety_margin", default=2.0): vol.Coerce(float),

# In async_step_balancing() (NEW step)
vol.Required("enable_balancing", default=True): bool,
vol.Required("holding_hours", default=3): vol.Range(min=1, max=12),
vol.Required("max_balancing_interval", default=7): vol.Range(min=1, max=14),

# In async_step_weather() (extend existing)
vol.Required("emergency_mode", default=False): bool,
vol.Required("emergency_levels", default=["orange", "red"]): cv.multi_select({
    "yellow": "Yellow",
    "orange": "Orange",
    "red": "Red",
}),
```

**REFACTOR:**
- Simplify step flow (too many steps currently)
- Group related params (Planning, Balancing, Weather, Pricing)

**Impact:**
- Breaking: Config flow structure changes
- Migration: Existing configs auto-migrate with defaults
- Dependency: Validation module

---

### 3.4 Breaking Changes Summary

#### API Changes:
1. **Planning API Internal Interfaces** (Phase 1)
   - Old: `_calculate_optimal_modes_hybrid()` in sensor
   - New: `Planner.optimize()` in planning module
   - **Migration:** Update code that directly calls sensor methods

2. **Balancing Planning API** (Phase 3)
   - Old: `plan_charging_to_target(target_soc, target_time)`
   - New: `Planner.optimize(target_soc, target_time, holding_hours)`
   - **Migration:** Update balancing sensor calls

3. **REST API Endpoints** (Phase 2)
   - Old: None (read-only)
   - New: POST /calculate, /apply, /revert, DELETE /plan_id
   - **Migration:** Frontend must use new endpoints for plan management

#### Configuration Changes:
1. **New Required Parameters** (Phase 2, 3, 4)
   - `threshold_cheap`, `safety_margin` (planning)
   - `holding_hours`, `max_balancing_interval` (balancing)
   - `emergency_mode`, `emergency_levels` (weather)
   - **Migration:** Auto-populate with defaults on upgrade

2. **Config Flow Steps** (Phase 2)
   - Old: welcome → auth → basic → features → shield/solar/pricing → summary
   - New: welcome → auth → planning → balancing → weather → pricing → summary
   - **Migration:** Existing configs work, new setup uses new flow

#### Storage Format:
1. **Plan Storage** (Phase 2)
   - Old: Daily plans JSON with `_daily_plan_state`
   - New: Plan objects with status, metadata, versioning
   - **Migration:** Auto-convert on first load, keep both formats during transition

---

### 3.5 Testing Strategy

#### Unit Tests (per component):
- `tests/planning/test_simulation.py` - BR-3.1 simulation
- `tests/planning/test_cost_calculator.py` - BR-3.2 cost
- `tests/planning/test_mode_selector.py` - BR-3.5 modes
- `tests/planning/test_deficit_fixer.py` - BR-3.4 deficit
- `tests/planning/test_optimizer.py` - BR-3.6 optimization
- `tests/balancing/test_detector.py` - BR-4.1 detection
- `tests/balancing/test_economic_planner.py` - BR-4.3 economic
- `tests/safety/test_weather_monitor.py` - BR-7.2 emergency

#### Integration Tests:
- `tests/integration/test_planning_flow.py` - End-to-end planning
- `tests/integration/test_balancing_flow.py` - Balancing with planning
- `tests/integration/test_weather_emergency.py` - Emergency override

#### Regression Tests:
- Compare old vs new implementation on historical data
- Validate no min_capacity violations in 1000+ simulation runs
- Cost optimization comparison (new should be ≤ old cost)

#### Performance Tests:
- Planning time < 5s for 96 intervals
- API response time < 1s
- Memory usage (new modules vs old monolith)

---

## 4. IMPLEMENTATION TASKS

### 4.1 Phase 1 Tasks (Current State Analysis → Core Planning)

**Status:** 🔄 IN PROGRESS

**Completed:**
✅ Current state analysis
✅ File discovery and code archaeology
✅ BR requirements review

**TODO:**

1. **Create planning module structure**
   - [ ] Create `planning/` directory
   - [ ] Create `planning/__init__.py`
   - [ ] Create `planning/constants.py` with BR constants
   - [ ] Create `planning/types.py` with type definitions

2. **Extract simulation engine (BR-3.1)**
   - [ ] Create `planning/simulation.py`
   - [ ] Function: `simulate_interval()`
     - Input: battery_before, solar_kwh, load_kwh, mode, min_capacity, max_capacity, efficiency
     - Output: battery_after, cost, clamp_deficit
   - [ ] Fix: `max(min_capacity, battery)` instead of `max(0, battery)`
   - [ ] Add: Tolerance check `abs(battery - min_capacity) < TOLERANCE`
   - [ ] Unit tests: `tests/planning/test_simulation.py`

3. **Extract cost calculator (BR-3.2)**
   - [ ] Create `planning/cost_calculator.py`
   - [ ] Function: `calculate_interval_cost()`
     - Input: grid_import, grid_export, spot_price, export_price, boiler_kwh
     - Output: cost (Kč)
   - [ ] Implement boiler priority scheduling
   - [ ] Unit tests: `tests/planning/test_cost_calculator.py`

4. **Extract deficit fixer (BR-3.4)**
   - [ ] Create `planning/deficit_fixer.py`
   - [ ] Function: `fix_deficit()`
     - Input: timeline with violations
     - Output: timeline with HOME_UPS added before violations
   - [ ] Unit tests: `tests/planning/test_deficit_fixer.py`

5. **Write comprehensive tests**
   - [ ] Test min_capacity clamping fix
   - [ ] Test tolerance edge cases
   - [ ] Test boiler integration
   - [ ] Run 1000+ simulations to validate no violations

6. **Feature flag implementation**
   - [ ] Add `enable_new_planning_engine` to config
   - [ ] Conditional execution in battery_forecast sensor
   - [ ] Logging for comparison (old vs new results)

---

### 4.2 Phase 2 Tasks (Plan Lifecycle)

**Status:** ⏸️ PENDING (after Phase 1)

**TODO:**

1. **Plan Manager**
   - [ ] Create `planning/plan_manager.py`
   - [ ] Implement BR-2.2 status lifecycle
   - [ ] Implement BR-2.4 persistence
   - [ ] Implement BR-2.6 reversion
   - [ ] Tests: status transitions, "exactly one active" enforcement

2. **Storage Module**
   - [ ] Create `storage/plan_storage.py`
   - [ ] Refactor JSON storage from battery_forecast
   - [ ] Add plan versioning
   - [ ] Backward compatibility with old format

3. **API Endpoints**
   - [ ] Implement POST /calculate
   - [ ] Implement POST /apply
   - [ ] Implement POST /revert
   - [ ] Implement DELETE /plan_id
   - [ ] Tests: API contract validation

4. **Config Flow Updates**
   - [ ] Add threshold_cheap parameter
   - [ ] Add safety_margin parameter
   - [ ] Update validation schema

---

### 4.3 Phase 3 Tasks (Balancing)

**Status:** ⏸️ PENDING (after Phase 2)

**TODO:**

1. **Balancing Modules**
   - [ ] Create `balancing/detector.py` (BR-4.1)
   - [ ] Create `balancing/economic_planner.py` (BR-4.3)
   - [ ] Create `balancing/forced_planner.py` (BR-4.4)
   - [ ] Create `balancing/opportunistic_handler.py` (BR-4.2)

2. **Mediána Calculation Fix**
   - [ ] Implement: mediána from 100% projected time to OTE data end
   - [ ] Not from NOW to end
   - [ ] Tests: verify mediána accuracy

3. **Timeline with Holding**
   - [ ] Update Planner.optimize() to accept holding_hours
   - [ ] Return timeline INCLUDING holding intervals (not added by balancer)
   - [ ] Tests: verify holding intervals present

4. **Emergency Handling**
   - [ ] Implement BR-4.7: apply anyway when feasible=false
   - [ ] Log warning but don't block
   - [ ] Tests: emergency scenario

5. **Refactor Balancing Sensor**
   - [ ] Slim down sensor to coordinator
   - [ ] Delegate to new modules
   - [ ] Preserve background task structure

---

### 4.4 Phase 4 Tasks (Weather & Safety)

**Status:** ⏸️ PENDING (after Phase 3)

**TODO:**

1. **Weather Monitor**
   - [ ] Create `safety/weather_monitor.py`
   - [ ] Monitor ČHMÚ sensor every 15min
   - [ ] Create emergency plan on warning (100% by warning_start)
   - [ ] Hold until sensor inactive (ignore warning_end)

2. **Safety Guards**
   - [ ] Create `safety/capacity_guard.py`
   - [ ] Create `safety/limit_enforcer.py`
   - [ ] Export limit: p_max_feed_grid × 0.25 per interval
   - [ ] Grid charging limit: home_charge_rate × 0.25 per interval

3. **Priority System**
   - [ ] Implement emergency > balancing > normal
   - [ ] Plan override logic in PlanManager
   - [ ] Tests: priority enforcement

4. **Config Parameters**
   - [ ] Add emergency_mode toggle
   - [ ] Add emergency_levels multi-select
   - [ ] Update validation

---

### 4.5 Phase 5 Tasks (Frontend)

**Status:** ⏸️ PENDING (after Phase 4)

**TODO:**

1. **Component Audit**
   - [ ] Review existing dashboard YAML
   - [ ] Identify components to keep/remove/refactor

2. **New Components**
   - [ ] Timeline view with mode indicators
   - [ ] Plan summary card
   - [ ] Balancing status widget
   - [ ] Weather risk indicator
   - [ ] Manual plan creator UI
   - [ ] Simulation comparison view

3. **Backend-Driven Implementation**
   - [ ] Remove FE calculations
   - [ ] Use API for all data
   - [ ] Real-time polling (30s default)

4. **Design Consistency**
   - [ ] Match existing dashboard style
   - [ ] Color scheme from DASHBOARD_COLOR_SCHEME.md
   - [ ] Responsive layouts

---

## 5. RISK ASSESSMENT

### 5.1 Technical Risks

**Risk:** Breaking existing functionality during refactoring
- **Probability:** HIGH
- **Impact:** HIGH (users without working battery management)
- **Mitigation:**
  - Feature flags for gradual rollout
  - Extensive testing before each phase
  - Keep old code until new code proven stable
  - Rollback mechanism in config

**Risk:** Performance degradation with modular architecture
- **Probability:** MEDIUM
- **Impact:** MEDIUM (slower planning updates)
- **Mitigation:**
  - Profile performance before/after
  - Optimize critical paths (simulation loop)
  - Cache expensive calculations
  - Async where appropriate

**Risk:** Type safety issues with complex types
- **Probability:** MEDIUM
- **Impact:** LOW (runtime errors but not catastrophic)
- **Mitigation:**
  - Full mypy strict mode
  - Pydantic for data validation
  - Comprehensive type hints

**Risk:** Storage migration failures
- **Probability:** LOW
- **Impact:** HIGH (lost plan history)
- **Mitigation:**
  - Backup before migration
  - Dual-format support during transition
  - Rollback to old format if migration fails

---

### 5.2 User Impact Risks

**Risk:** Config migration confusion
- **Probability:** MEDIUM
- **Impact:** MEDIUM (users don't know how to configure new params)
- **Mitigation:**
  - Auto-populate defaults
  - Migration guide in release notes
  - Config validation with helpful errors

**Risk:** API breaking changes affecting custom dashboards
- **Probability:** HIGH
- **Impact:** MEDIUM (users' custom dashboards break)
- **Mitigation:**
  - Keep old API endpoints working
  - Deprecation warnings in logs
  - Migration guide for custom integrations

**Risk:** Different planning results (even if correct)
- **Probability:** HIGH
- **Impact:** MEDIUM (users confused why plans changed)
- **Mitigation:**
  - Document why changes occurred (bug fixes)
  - Show side-by-side comparison in logs
  - "What changed in v3.0" documentation

---

### 5.3 Timeline Risks

**Risk:** Underestimating complexity
- **Probability:** HIGH
- **Impact:** MEDIUM (delayed release)
- **Mitigation:**
  - Incremental phases
  - Each phase independently valuable
  - Release partial improvements

**Risk:** Testing taking longer than development
- **Probability:** MEDIUM
- **Impact:** LOW (better to test thoroughly)
- **Mitigation:**
  - Write tests alongside development
  - Automated test suite
  - CI/CD integration

---

## 6. SUCCESS CRITERIA

### 6.1 Functional Success Criteria

✅ **Phase 1 Complete:**
- [ ] No min_capacity violations in 10,000 simulation runs
- [ ] New planning engine produces valid timelines
- [ ] Cost optimization ≤ old implementation (not worse)
- [ ] Feature flag allows switching between old/new

✅ **Phase 2 Complete:**
- [ ] Plan status lifecycle works (pending → active → completed)
- [ ] "Exactly one active plan" enforced
- [ ] Plan reversion chain works
- [ ] API endpoints functional (POST /calculate, /apply, /revert, DELETE)

✅ **Phase 3 Complete:**
- [ ] Balancing detection accurate (SoC >= 98% for hold_hours)
- [ ] Mediána calculation correct (100% → OTE end)
- [ ] Timeline includes holding intervals
- [ ] Forced mode triggers on day 7+
- [ ] Emergency mode applies even when feasible=false

✅ **Phase 4 Complete:**
- [ ] Weather emergency creates plan 100% by warning_start
- [ ] Holding continues until ČHMÚ sensor inactive
- [ ] Export limits enforced (no violations)
- [ ] Grid charging limits enforced

✅ **Phase 5 Complete:**
- [ ] All BR-8 components implemented
- [ ] FE has zero business logic
- [ ] Design consistent with existing dashboard
- [ ] Real-time updates working

---

### 6.2 Quality Success Criteria

✅ **Code Quality:**
- [ ] File sizes < 1000 lines (no god objects)
- [ ] Full type hints (mypy strict)
- [ ] No `# type: ignore` without justification
- [ ] Docstrings on all public functions

✅ **Test Coverage:**
- [ ] Unit tests: >80% coverage
- [ ] Integration tests: critical paths covered
- [ ] Regression tests: old vs new comparison

✅ **Documentation:**
- [ ] All BR requirements mapped to code
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Migration guide for v2.x → v3.0
- [ ] User-facing release notes

---

### 6.3 Performance Success Criteria

✅ **Timing:**
- [ ] Planning calculation < 5s for 96 intervals
- [ ] API response time < 1s
- [ ] Background tasks don't block HA startup

✅ **Resource Usage:**
- [ ] Memory usage < 100MB increase
- [ ] No memory leaks in long-running tasks
- [ ] CPU usage acceptable on Raspberry Pi

---

## 7. NEXT STEPS

### 7.1 Immediate Actions (This Week)

1. **Review & Approve Plan**
   - [ ] User review of REFACTORING_PLAN.md
   - [ ] Approve architecture direction
   - [ ] Confirm phase priorities

2. **Setup Development Environment**
   - [ ] Create feature branch: `refactor/battery-planning-v3`
   - [ ] Setup test infrastructure
   - [ ] Configure CI/CD for tests

3. **Start Phase 1 - Simulation Module**
   - [ ] Create `planning/simulation.py`
   - [ ] Write failing tests first (TDD)
   - [ ] Implement BR-3.1 simulation
   - [ ] Fix min_capacity clamping bug

### 7.2 Communication Plan

**Stakeholders:**
- User/maintainer (primary)
- End users (via release notes)

**Updates:**
- Weekly progress summary
- Per-phase completion announcements
- Breaking changes early warning

**Channels:**
- GitHub commit messages
- CHANGELOG.md updates
- Release notes

---

## 8. DOCUMENT STATUS

**Version:** 1.0 DRAFT
**Last Updated:** 2025-01-XX
**Status:** AWAITING USER REVIEW

**Changes Log:**
- v1.0 (2025-01-XX): Initial analysis and architecture proposal

**To Be Continued:**
- User feedback integration
- Detailed task breakdown per phase
- Test specifications
- API contract definitions

---

**END OF CURRENT STATE ANALYSIS**

Next: User review → Architecture approval → Phase 1 implementation start
