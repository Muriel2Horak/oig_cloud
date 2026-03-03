# Balancing State Truth Table — Task 6

**Generated:** 2026-03-03
**Purpose:** Explicit documentation of all balancing states, transitions, and PV-first interaction for the precedence engine (Task 11).

---

## 1. TODO Markers Resolution

| File | Line | TODO | Resolution | Status |
|------|------|------|------------|--------|
| `plan.py` | 3 | TODO 2: Define balancing plan structure | `BalancingPlan` dataclass fully defined with `BalancingMode`, `BalancingPriority`, `BalancingInterval` | **RESOLVED** |
| `core.py` | 3 | TODO 5: Implement Natural/Opportunistic/Forced balancing | All three modes implemented in `check_balancing()` flow | **RESOLVED** |
| `core.py` | 52 | Reference to TODO 5 in docstring | Documentation only | **RESOLVED** |
| `core.py` | 705 | TODO 5.1: Natural balancing detection | `_check_natural_balancing()` scans HYBRID timeline for 12 consecutive intervals at ≥99% SoC | **RESOLVED** |
| `core.py` | 760 | TODO 5.2: Opportunistic balancing | `_create_opportunistic_plan()` evaluates immediate vs delayed costs, selects cheapest | **RESOLVED** |
| `core.py` | 929 | TODO 5.3: Forced balancing | `_create_forced_plan()` charges ASAP regardless of cost when cycle exceeded | **RESOLVED** |

**All TODO markers in balancing modules are IMPLEMENTED.** The markers remain as documentation anchors but the functionality is complete.

---

## 2. Balancing States

### State Definitions

| State | Enum Value | Description |
|-------|------------|-------------|
| IDLE | `idle` | No active plan, balancing not needed |
| NATURAL | `natural` | HYBRID forecast naturally reaches 100% for 3h |
| OPPORTUNISTIC | `opportunistic` | Planned charging during cheap hours (5-6 days) |
| FORCED | `forced` | Emergency charging regardless of cost (7+ days) |
| OVERDUE | `overdue` | No plan + cycle exceeded (waiting for forced) |

### State Attributes

| State | Priority | Locked | Override Intervals | PV-first Deference |
|-------|----------|--------|-------------------|-------------------|
| IDLE | N/A | N/A | None | N/A |
| NATURAL | `NORMAL` | `False` | None (no intervention) | Yes (no override) |
| OPPORTUNISTIC | `NORMAL` or `HIGH` | `False` | HOME_UPS during charging + holding | **AMBIGUOUS** (see §4) |
| FORCED | `CRITICAL` | `True` | HOME_UPS from now until 100% | **No** (health priority) |
| OVERDUE | N/A | N/A | None | N/A |

---

## 3. State Transitions

### Transition Order in `check_balancing()`

```
check_balancing()
├── 1. _handle_recent_balancing()     → If completed: IDLE (update last_balancing_ts)
├── 2. _handle_active_plan()          → If in holding: keep current state
├── 3. force=True?                    → FORCED (immediate)
├── 4. _maybe_apply_natural_plan()    → NATURAL (if HYBRID shows 3h @ 100%)
├── 5. _maybe_force_plan()            → FORCED (if days >= cycle_days)
└── 6. _maybe_opportunistic_plan()    → OPPORTUNISTIC (if cooldown + SoC threshold)
```

### Transition Matrix

| From | To NATURAL | To OPPORTUNISTIC | To FORCED | To IDLE |
|------|------------|------------------|-----------|---------|
| IDLE | HYBRID shows ≥99% for 12 intervals | SoC ≥80% + cooldown + cheap window | days ≥ cycle OR force=True | N/A |
| NATURAL | — | — | — | holding_end passed |
| OPPORTUNISTIC | — | — | — | holding_end passed |
| FORCED | — | — | — | holding_end passed |

### Entry Conditions (Detailed)

| State | Entry Condition | Code Location |
|-------|-----------------|---------------|
| NATURAL | `_check_natural_balancing()` finds 12 consecutive intervals in HYBRID timeline with `soc_kwh >= capacity * 0.99` | `core.py:732-749` |
| OPPORTUNISTIC | `_get_current_soc_percent() >= soc_threshold` (default 80%) AND `_get_hours_since_last_balancing() >= cooldown_hours` AND cheap window found | `core.py:777-840` |
| FORCED | `_get_days_since_last_balancing() >= cycle_days` (default 7) OR `force=True` parameter | `core.py:337-345`, `core.py:926-1000` |

### Exit Conditions

| State | Exit Condition | Code Location |
|-------|----------------|---------------|
| NATURAL | `holding_end < now` OR `_check_if_balancing_occurred()` detects completion | `core.py:408-415`, `core.py:481-530` |
| OPPORTUNISTIC | `holding_end < now` | `core.py:408-415` |
| FORCED | `holding_end < now` | `core.py:408-415` |

---

## 4. PV-first Interaction (Critical)

### Current Behavior Analysis

**NATURAL Balancing:**
- No override intervals created
- Relies on HYBRID forecast naturally reaching 100%
- **PV-first Contract: PRESERVED** (no intervention)

**FORCED Balancing:**
- Creates HOME_UPS intervals from `now` until 100% reached
- `locked=True`, `priority=CRITICAL`
- **PV-first Contract: OVERRIDDEN** (explicit health priority)

**OPPORTUNISTIC Balancing:**
- Uses `_select_best_window()` to find cheapest window
- Cost calculation: `immediate_cost` vs `delayed_cost`
- Window selection based on: `avg_price <= cheap_price_threshold`
- **PV-first Contract: AMBIGUOUS**

### The Ambiguity

In `_create_opportunistic_plan()` and `_select_best_window()`:
```python
# core.py:852-891
cheap_price_threshold = self._get_cheap_price_threshold(prices)
# ...
if window_avg_price > cheap_price_threshold:
    continue
```

The code selects windows based on **spot price only**, not PV production forecast.

**Potential Conflict:**
1. PV production expected during window → PV-first would prefer PV charging
2. Spot price is low → Opportunistic selects this window for grid charging
3. Result: Grid charging during PV production

### Explicit Contract Definition

| Balancing Mode | PV-first Deference | Precedence Rule |
|----------------|-------------------|-----------------|
| NATURAL | **Yes** | Natural behavior, no override |
| OPPORTUNISTIC | **Should defer** | If PV-first would reject grid charge during PV production, opportunistic should skip that window |
| FORCED | **No** | Health priority overrides all |

**Required Behavior (for Task 11 precedence engine):**
```
IF balancing.mode == FORCED:
    OVERRIDE all other policies (health priority)
ELIF balancing.mode == OPPORTUNISTIC:
    IF pv_first.allows_grid_charge(window):
        ALLOW balancing intervals
    ELSE:
        SKIP window (find next cheap window without PV conflict)
ELSE:  # NATURAL or IDLE
    DEFER to pv_first
```

---

## 5. Integration Boundary

### Balancing → Core Decision Policy Interface

**Output from Balancing:**
```python
class BalancingPlan:
    mode: BalancingMode          # natural | opportunistic | forced
    holding_start: str           # ISO datetime
    holding_end: str             # ISO datetime
    intervals: List[BalancingInterval]  # Override mode schedule
    locked: bool                 # True for forced
    priority: BalancingPriority  # normal | high | critical
```

**Consumed by:**
- `hybrid_planning.py` — applies `intervals` as mode overrides
- `forecast_update.py` — reads plan for timeline display
- `auto_switch.py` — respects `locked` flag

**Contract Points:**
1. `intervals` list contains `BalancingInterval(ts, mode)` entries
2. `mode` is CBB mode integer: 0=HOME_I, 1=HOME_II, 2=HOME_III, 3=HOME_UPS
3. When `locked=True`, consumer MUST apply intervals regardless of other policies
4. When `locked=False`, consumer SHOULD check PV-first before applying

---

## 6. Summary for Precedence Engine (Task 11)

### Balancing Override Hierarchy

```
1. FORCED (locked=True, priority=CRITICAL)
   → Overrides: PV-first, Economic, Mode-guard
   → Reason: Battery health

2. OPPORTUNISTIC (locked=False, priority=NORMAL/HIGH)
   → SHOULD check: PV-first compatibility
   → MAY override: Economic (if cheaper)
   → DEFER to: Mode-guard safety rules

3. NATURAL (locked=False, priority=NORMAL)
   → No override intervals
   → Just metadata for tracking
```

### Actionable Items for Task 11

1. **Add PV-first check to `_select_best_window()`** — skip windows with high PV production
2. **Create `balancing_pv_compatible()` helper** — check if window conflicts with PV-first
3. **Document precedence rule** — OPPORTUNISTIC defers to PV-first unless cost savings > threshold
4. **Add integration test** — verify opportunistic doesn't charge from grid during PV peak

---

## Appendix A: Code References

| Component | File | Lines |
|-----------|------|-------|
| State machine entry | `core.py` | 275-322 |
| Natural detection | `core.py` | 702-755 |
| Opportunistic creation | `core.py` | 757-840 |
| Forced creation | `core.py` | 926-1000 |
| Plan structure | `plan.py` | 52-98 |
| Mode enum | `plan.py` | 15-21 |
| Priority enum | `plan.py` | 24-29 |

## Appendix B: Test Coverage

Existing tests verify state transitions:
- `test_balancing_manager_core.py` — state machine tests
- `test_balancing_plan_more.py` — plan serialization
- `test_balancing_core_more.py` — additional core tests

New tests (Task 6):
- `test_balancing_state_map.py::test_forced_balancing_transition` — deterministic transitions
- `test_balancing_state_map.py::test_opportunistic_does_not_break_pv_first_contract` — PV-first contract
