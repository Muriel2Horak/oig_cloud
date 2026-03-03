# Baseline Rule Matrix — Grid-Boiler Rules Overhaul

> **Generated**: 2026-03-03
> **Task**: Task 1 — Build authoritative current-rule matrix from code
> **Scope**: READ-ONLY analysis of planner/boiler/balancing modules

---

## Executive Summary

This document captures all currently active decision rules extracted from the codebase baseline. Rules are organized by category and assigned unique IDs for traceability. The matrix serves as the authoritative reference for the grid-boiler rules overhaul project.

**Key Finding**: `charging_plan.py` contains 9+ layers of grid charging logic, NONE of which check PV forecast availability before deciding to charge from grid. This is the root cause of the PV-first violation.

---

## Rule Categories & ID Prefixes

| Prefix | Category | Module |
|--------|----------|--------|
| `GR-NNN` | Grid Charging | `charging_plan.py`, `hybrid_planning.py` |
| `SOC-NNN` | State of Charge | `charging_plan.py`, `mode_guard.py` |
| `BA-NNN` | Balancing | `balancing/core.py`, `balancing/plan.py` |
| `AS-NNN` | Auto-Switch | `auto_switch.py` |
| `PR-NNN` | Protection | `charging_plan.py`, `mode_guard.py` |
| `BO-NNN` | Boiler | `boiler/planner.py` |
| `PV-NNN` | PV-First (NEW) | _To be implemented_ |

---

## 1. GRID CHARGING RULES (GR-NNN)

### GR-001: Recovery Mode Grid Charge
| Field | Value |
|-------|-------|
| **Rule ID** | GR-001 |
| **Module:line** | `charging_plan.py:328-340` |
| **Condition** | `recovery_mode = initial_battery_kwh < planning_min - eps_kwh` |
| **Action** | Force grid charge (UPS mode) regardless of price to reach planning minimum |
| **Precedence** | RECOVERY_MODE (500) |
| **Overlaps** | SOC-004 (Death Valley), BA-019 (Balancing Death Valley) |

### GR-002: No Economic Candidates
| Field | Value |
|-------|-------|
| **Rule ID** | GR-002 |
| **Module:line** | `charging_plan.py:64-69` |
| **Condition** | `candidates = []` (no intervals under max_price) |
| **Action** | Return timeline unchanged, skip economic charging |
| **Precedence** | ECONOMIC_CHARGING (400) |
| **Overlaps** | None |

### GR-003: Economic Candidate Processing
| Field | Value |
|-------|-------|
| **Rule ID** | GR-003 |
| **Module:line** | `charging_plan.py:73-79` |
| **Condition** | `candidates` list non-empty |
| **Action** | Process each candidate through `_apply_economic_candidate()` |
| **Precedence** | ECONOMIC_CHARGING (400) |
| **Overlaps** | GR-004, GR-005 |

### GR-004: Death Valley Fix
| Field | Value |
|-------|-------|
| **Rule ID** | GR-004 |
| **Module:line** | `charging_plan.py:312-348` |
| **Condition** | `death_valley_wait = True` AND `shortage > 0` |
| **Action** | Add `min_charge` kWh to prevent SOC dropping below effective_minimum |
| **Precedence** | ECONOMIC_CHARGING (400) |
| **Overlaps** | SOC-004, PR-002 |

### GR-005: Economic Savings Threshold
| Field | Value |
|-------|-------|
| **Rule ID** | GR-005 |
| **Module:line** | `charging_plan.py:350-375` |
| **Condition** | `savings_per_kwh >= min_savings_margin` |
| **Action** | Add grid charge at candidate interval |
| **Precedence** | ECONOMIC_CHARGING (400) |
| **Overlaps** | None |

### GR-006: Price Cap Filter (Hybrid)
| Field | Value |
|-------|-------|
| **Rule ID** | GR-006 |
| **Module:line** | `hybrid_planning.py:198-199` |
| **Condition** | `prices[idx] > price_cap` |
| **Action** | Skip adding UPS interval (price too high) |
| **Precedence** | ECONOMIC_CHARGING (400) |
| **Overlaps** | GR-002 |

### GR-007: Negative Price Strategy
| Field | Value |
|-------|-------|
| **Rule ID** | GR-007 |
| **Module:line** | `hybrid_planning.py:293-307` |
| **Condition** | `negative_price_strategy == CHARGE_GRID` AND idx in negative_price_intervals |
| **Action** | Add to charging_intervals (charge on negative prices) |
| **Precedence** | ECONOMIC_CHARGING (400) |
| **Overlaps** | None |

### GR-008: Recovery Charging (Hybrid)
| Field | Value |
|-------|-------|
| **Rule ID** | GR-008 |
| **Module:line** | `hybrid_planning.py:328-375` |
| **Condition** | `initial_battery_kwh < planning_min - eps_kwh` |
| **Action** | Force UPS charging ignoring price cap until SOC >= planning_min |
| **Precedence** | RECOVERY_MODE (500) |
| **Overlaps** | GR-001 |

### GR-009: Planning Minimum Violation Repair
| Field | Value |
|-------|-------|
| **Rule ID** | GR-009 |
| **Module:line** | `hybrid_planning.py:414-463` |
| **Condition** | `battery_trajectory[i] < planning_min + buffer` |
| **Action** | Add cheapest candidate before violation point |
| **Precedence** | DEATH_VALLEY (800) |
| **Overlaps** | SOC-004 |

### GR-010: Protection Override (Blackout/Weather Risk)
| Field | Value |
|-------|-------|
| **Rule ID** | GR-010 |
| **Module:line** | `charging_plan.py:197-272` |
| **Condition** | `enable_blackout_protection OR enable_weather_risk` AND `protection_shortage > 0` |
| **Action** | Force grid charge at cheapest candidates to reach protection_soc_kwh |
| **Precedence** | PROTECTION_SAFETY (900) |
| **Overlaps** | PR-001, SOC-003 |

### GR-011: Target SOC Charging (Hybrid)
| Field | Value |
|-------|-------|
| **Rule ID** | GR-011 |
| **Module:line** | `hybrid_planning.py:513-566` |
| **Condition** | `max_soc < target - eps_kwh` |
| **Action** | Find cheapest candidate and add UPS interval |
| **Precedence** | ECONOMIC_CHARGING (400) |
| **Overlaps** | None |

### GR-012: Price Band Extension
| Field | Value |
|-------|-------|
| **Rule ID** | GR-012 |
| **Module:line** | `hybrid_planning.py:599-620` |
| **Condition** | Price within efficiency-based band of previous UPS interval |
| **Action** | Extend UPS block forward if no cheaper price ahead |
| **Precedence** | ECONOMIC_CHARGING (400) |
| **Overlaps** | None |

### GR-013: Cost-Aware Override
| Field | Value |
|-------|-------|
| **Rule ID** | GR-013 |
| **Module:line** | `hybrid_planning.py:812-858` |
| **Condition** | Grid import at interval AND SOC <= hw_min AND expensive UPS avoids higher import cost |
| **Action** | Allow expensive UPS charging to avoid even higher grid import |
| **Precedence** | ECONOMIC_CHARGING (400) |
| **Overlaps** | SOC-006 |

---

## 2. STATE OF CHARGE RULES (SOC-NNN)

### SOC-001: Target Achieved
| Field | Value |
|-------|-------|
| **Rule ID** | SOC-001 |
| **Module:line** | `charging_plan.py:82-83` |
| **Condition** | `final_capacity >= target_capacity_kwh` |
| **Action** | Mark `target_achieved = True`, no further action needed |
| **Precedence** | PLANNING_TARGET (100) |
| **Overlaps** | None |

### SOC-002: Minimum Achieved
| Field | Value |
|-------|-------|
| **Rule ID** | SOC-002 |
| **Module:line** | `charging_plan.py:83` |
| **Condition** | `final_capacity >= min_capacity_kwh` |
| **Action** | Mark `min_achieved = True` |
| **Precedence** | PLANNING_TARGET (100) |
| **Overlaps** | None |

### SOC-003: Protection SOC Requirement
| Field | Value |
|-------|-------|
| **Rule ID** | SOC-003 |
| **Module:line** | `charging_plan.py:204-211` |
| **Condition** | Blackout protection enabled AND weather risk detected |
| **Action** | Calculate `protection_soc_kwh` as higher SOC target |
| **Precedence** | PROTECTION_SAFETY (900) |
| **Overlaps** | GR-010 |

### SOC-004: Death Valley Detection
| Field | Value |
|-------|-------|
| **Rule ID** | SOC-004 |
| **Module:line** | `charging_plan.py:310-311` |
| **Condition** | `min_soc_wait < effective_minimum_kwh` |
| **Action** | Flag `death_valley_reached = True`, trigger immediate charge |
| **Precedence** | DEATH_VALLEY (800) |
| **Overlaps** | GR-004, GR-009 |

### SOC-005: Critical Interval Collection
| Field | Value |
|-------|-------|
| **Rule ID** | SOC-005 |
| **Module:line** | `charging_plan.py:386-399` |
| **Condition** | `capacity < min_capacity` in timeline |
| **Action** | Add interval to `critical_intervals` list for repair |
| **Precedence** | DEATH_VALLEY (800) |
| **Overlaps** | SOC-004 |

### SOC-006: HW Minimum Hold Limit
| Field | Value |
|-------|-------|
| **Rule ID** | SOC-006 |
| **Module:line** | `hybrid_planning.py:929-991` |
| **Condition** | SOC at hw_min for >= `hw_min_hold_hours` |
| **Action** | Force target charging before limit to escape minimum |
| **Precedence** | PROTECTION_SAFETY (900) |
| **Overlaps** | GR-013 |

### SOC-013: Mode Guard SOC Exception
| Field | Value |
|-------|-------|
| **Rule ID** | SOC-013 |
| **Module:line** | `mode_guard.py:267-278` |
| **Condition** | `next_soc < planning_min_kwh` during guard window |
| **Action** | Bypass mode guard, allow planned mode instead of locked mode |
| **Precedence** | PROTECTION_SAFETY (900) |
| **Overlaps** | AS-012 |

### SOC-016: Minimum Mode Duration (Non-UPS)
| Field | Value |
|-------|-------|
| **Rule ID** | SOC-016 |
| **Module:line** | `mode_guard.py:54-85` |
| **Condition** | Block length < min_duration AND mode != HOME_UPS |
| **Action** | Replace short block with adjacent mode |
| **Precedence** | DEATH_VALLEY (800) |
| **Overlaps** | None |

---

## 3. BALANCING RULES (BA-NNN)

### BA-001: Balancing Completion Detection
| Field | Value |
|-------|-------|
| **Rule ID** | BA-001 |
| **Module:line** | `balancing/core.py:481-530` |
| **Condition** | SoC >= 99% for `holding_time_hours` consecutive hours |
| **Action** | Mark balancing complete, update `last_balancing_ts` |
| **Precedence** | PROTECTION_SAFETY (900) |
| **Overlaps** | None |

### BA-002: Active Plan Holding Period
| Field | Value |
|-------|-------|
| **Rule ID** | BA-002 |
| **Module:line** | `balancing/core.py:388-422` |
| **Condition** | `holding_start <= now <= holding_end` |
| **Action** | Keep active plan, skip new plan creation |
| **Precedence** | BALANCING_OVERRIDE (700) |
| **Overlaps** | None |

### BA-003: Expired Plan Cleanup
| Field | Value |
|-------|-------|
| **Rule ID** | BA-003 |
| **Module:line** | `balancing/core.py:408-415` |
| **Condition** | `holding_end < now` |
| **Action** | Clear `active_plan`, save state |
| **Precedence** | BALANCING_OVERRIDE (700) |
| **Overlaps** | None |

### BA-005: Forced Mode Trigger
| Field | Value |
|-------|-------|
| **Rule ID** | BA-005 |
| **Module:line** | `balancing/core.py:299-301` |
| **Condition** | `force=True` passed to `check_balancing()` |
| **Action** | Create FORCED plan immediately (manual trigger) |
| **Precedence** | BALANCING_OVERRIDE (700) |
| **Overlaps** | BA-024 |

### BA-006: Cycle Days Exceeded
| Field | Value |
|-------|-------|
| **Rule ID** | BA-006 |
| **Module:line** | `balancing/core.py:334-345` |
| **Condition** | `days_since_last >= cycle_days` |
| **Action** | Create FORCED plan (health priority) |
| **Precedence** | BALANCING_OVERRIDE (700) |
| **Overlaps** | BA-024 |

### BA-007: Natural Balancing Detection
| Field | Value |
|-------|-------|
| **Rule ID** | BA-007 |
| **Module:line** | `balancing/core.py:702-755` |
| **Condition** | HYBRID timeline shows >= 12 consecutive intervals at >= 99% SoC |
| **Action** | Create NATURAL plan (no override intervals needed) |
| **Precedence** | OPPORTUNISTIC (300) |
| **Overlaps** | None |

### BA-008: Cooldown Active
| Field | Value |
|-------|-------|
| **Rule ID** | BA-008 |
| **Module:line** | `balancing/core.py:351-363` |
| **Condition** | `hours_since_last < cooldown_hours` OR `_is_plan_cooldown_active()` |
| **Action** | Skip opportunistic balancing, return None |
| **Precedence** | OPPORTUNISTIC (300) |
| **Overlaps** | None |

### BA-009: SoC Below Threshold
| Field | Value |
|-------|-------|
| **Rule ID** | BA-009 |
| **Module:line** | `balancing/core.py:772-783` |
| **Condition** | `current_soc_percent < soc_threshold` (default 80%) |
| **Action** | Skip opportunistic balancing |
| **Precedence** | OPPORTUNISTIC (300) |
| **Overlaps** | None |

### BA-010: Opportunistic Window Selection
| Field | Value |
|-------|-------|
| **Rule ID** | BA-010 |
| **Module:line** | `balancing/core.py:842-876` |
| **Condition** | `window_avg_price <= cheap_price_threshold` |
| **Action** | Select cheapest window for delayed balancing |
| **Precedence** | OPPORTUNISTIC (300) |
| **Overlaps** | None |

### BA-011: Immediate vs Delayed Cost Selection
| Field | Value |
|-------|-------|
| **Rule ID** | BA-011 |
| **Module:line** | `balancing/core.py:893-924` |
| **Condition** | `immediate_cost < min_cost` OR no cheap window found |
| **Action** | Select immediate balancing if cheaper than any delayed window |
| **Precedence** | OPPORTUNISTIC (300) |
| **Overlaps** | None |

### BA-012: Opportunistic Priority Assignment
| Field | Value |
|-------|-------|
| **Rule ID** | BA-012 |
| **Module:line** | `balancing/plan.py:192-194` |
| **Condition** | `days_since_last >= 6` |
| **Action** | Set `priority=HIGH` for opportunistic plan |
| **Precedence** | OPPORTUNISTIC (300) |
| **Overlaps** | None |

### BA-019: Forced Charging Time Calculation
| Field | Value |
|-------|-------|
| **Rule ID** | BA-019 |
| **Module:line** | `balancing/core.py:962-974` |
| **Condition** | FORCED plan creation |
| **Action** | Calculate aggressive charging intervals to reach 100% ASAP |
| **Precedence** | DEATH_VALLEY (800) |
| **Overlaps** | None |

### BA-021: Forced Plan Lock
| Field | Value |
|-------|-------|
| **Rule ID** | BA-021 |
| **Module:line** | `balancing/plan.py:221` |
| **Condition** | `mode=FORCED` |
| **Action** | Set `locked=True` (cannot be overridden) |
| **Precedence** | BALANCING_OVERRIDE (700) |
| **Overlaps** | None |

### BA-022: Forced Plan Critical Priority
| Field | Value |
|-------|-------|
| **Rule ID** | BA-022 |
| **Module:line** | `balancing/plan.py:222` |
| **Condition** | `mode=FORCED` |
| **Action** | Set `priority=CRITICAL` |
| **Precedence** | BALANCING_OVERRIDE (700) |
| **Overlaps** | None |

### BA-024: Forced Plan Override Intervals
| Field | Value |
|-------|-------|
| **Rule ID** | BA-024 |
| **Module:line** | `balancing/core.py:982-994` |
| **Condition** | FORCED plan creation |
| **Action** | Generate aggressive UPS charging intervals + holding intervals |
| **Precedence** | BALANCING_OVERRIDE (700) |
| **Overlaps** | None |

---

## 4. AUTO-SWITCH RULES (AS-NNN)

### AS-001: Auto-Switch Disabled
| Field | Value |
|-------|-------|
| **Rule ID** | AS-001 |
| **Module:line** | `auto_switch.py:55-59` |
| **Condition** | `CONF_AUTO_MODE_SWITCH = False` in options |
| **Action** | Skip all auto-switch logic |
| **Precedence** | AUTO_SWITCH (200) |
| **Overlaps** | None |

### AS-002: No Timeline Available
| Field | Value |
|-------|-------|
| **Rule ID** | AS-002 |
| **Module:line** | `auto_switch.py:381-386` |
| **Condition** | `timeline = []` or None |
| **Action** | Return empty schedule, no mode switches |
| **Precedence** | AUTO_SWITCH (200) |
| **Overlaps** | None |

### AS-003: Startup Delay Active
| Field | Value |
|-------|-------|
| **Rule ID** | AS-003 |
| **Module:line** | `auto_switch.py:514-531` |
| **Condition** | `now < auto_switch_ready_at` |
| **Action** | Schedule retry, skip immediate scheduling |
| **Precedence** | AUTO_SWITCH (200) |
| **Overlaps** | None |

### AS-004: Shield Pending Mode Change
| Field | Value |
|-------|-------|
| **Rule ID** | AS-004 |
| **Module:line** | `auto_switch.py:314-321` |
| **Condition** | `service_shield.has_pending_mode_change(target_mode)` |
| **Action** | Skip duplicate request |
| **Precedence** | AUTO_SWITCH (200) |
| **Overlaps** | None |

### AS-005: Duplicate Request Protection
| Field | Value |
|-------|-------|
| **Rule ID** | AS-005 |
| **Module:line** | `auto_switch.py:323-335` |
| **Condition** | Same target_mode within 90 seconds |
| **Action** | Skip duplicate request |
| **Precedence** | AUTO_SWITCH (200) |
| **Overlaps** | None |

### AS-006: Min Interval Between Switches
| Field | Value |
|-------|-------|
| **Rule ID** | AS-006 |
| **Module:line** | `auto_switch.py:369-377` |
| **Condition** | `(now - last_changed) < 30 minutes` |
| **Action** | Skip mode change (min interval not met) |
| **Precedence** | AUTO_SWITCH (200) |
| **Overlaps** | None |

### AS-007: Current Mode Enforcement
| Field | Value |
|-------|-------|
| **Rule ID** | AS-007 |
| **Module:line** | `auto_switch.py:495-496` |
| **Condition** | `current_mode != planned_mode` for current interval |
| **Action** | Call `ensure_current_mode()` to switch |
| **Precedence** | AUTO_SWITCH (200) |
| **Overlaps** | AS-009 |

### AS-008: Scheduled Mode Switch
| Field | Value |
|-------|-------|
| **Rule ID** | AS-008 |
| **Module:line** | `auto_switch.py:534-561` |
| **Condition** | Mode change scheduled for future time |
| **Action** | Register `async_track_point_in_time` callback |
| **Precedence** | AUTO_SWITCH (200) |
| **Overlaps** | None |

### AS-009: Watchdog Mode Correction
| Field | Value |
|-------|-------|
| **Rule ID** | AS-009 |
| **Module:line** | `auto_switch.py:169-192` |
| **Condition** | Watchdog tick detects `current_mode != desired_mode` |
| **Action** | Log warning, call `ensure_current_mode()` |
| **Precedence** | AUTO_SWITCH (200) |
| **Overlaps** | AS-007 |

### AS-010: Forecast Sensor Not Set
| Field | Value |
|-------|-------|
| **Rule ID** | AS-010 |
| **Module:line** | `balancing/core.py:288-290` |
| **Condition** | `_forecast_sensor = None` |
| **Action** | Return None, cannot check balancing |
| **Precedence** | AUTO_SWITCH (200) |
| **Overlaps** | None |

### AS-011: Mode Already Correct
| Field | Value |
|-------|-------|
| **Rule ID** | AS-011 |
| **Module:line** | `auto_switch.py:362-367` |
| **Condition** | `current_mode == desired_mode` |
| **Action** | Skip mode change (already correct) |
| **Precedence** | AUTO_SWITCH (200) |
| **Overlaps** | None |

### AS-012: Mode Guard Lock Active
| Field | Value |
|-------|-------|
| **Rule ID** | AS-012 |
| **Module:line** | `mode_guard.py:198-199` |
| **Condition** | `guard_until` is set AND interval within guard window |
| **Action** | Use locked mode instead of planned mode |
| **Precedence** | MODE_GUARD (600) |
| **Overlaps** | AS-007, AS-009 |

### AS-013: Mode Guard SOC Exception
| Field | Value |
|-------|-------|
| **Rule ID** | AS-013 |
| **Module:line** | `mode_guard.py:267-288` |
| **Condition** | Guard would cause `next_soc < planning_min_kwh` |
| **Action** | Bypass guard, use planned mode |
| **Precedence** | MODE_GUARD (600) |
| **Overlaps** | AS-012 |

---

## 5. PROTECTION RULES (PR-NNN)

### PR-001: Blackout Protection Enabled
| Field | Value |
|-------|-------|
| **Rule ID** | PR-001 |
| **Module:line** | `charging_plan.py:204-209` |
| **Condition** | `enable_blackout_protection = True` |
| **Action** | Calculate protection SOC target from weather/risk config |
| **Precedence** | PROTECTION_SAFETY (900) |
| **Overlaps** | GR-010, SOC-003 |

### PR-002: Weather Risk Protection
| Field | Value |
|-------|-------|
| **Rule ID** | PR-002 |
| **Module:line** | `charging_plan.py:206` |
| **Condition** | `enable_weather_risk = True` |
| **Action** | Include weather risk in protection SOC calculation |
| **Precedence** | PROTECTION_SAFETY (900) |
| **Overlaps** | PR-001 |

### PR-003: Protection Charging Candidates
| Field | Value |
|-------|-------|
| **Rule ID** | PR-003 |
| **Module:line** | `charging_plan.py:225-236` |
| **Condition** | `protection_shortage > 0` AND no candidates under max_price |
| **Action** | Log error, return protection_soc_kwh (protection failed) |
| **Precedence** | PROTECTION_SAFETY (900) |
| **Overlaps** | GR-010 |

### PR-004: Protection Charge Application
| Field | Value |
|-------|-------|
| **Rule ID** | PR-004 |
| **Module:line** | `charging_plan.py:238-266` |
| **Condition** | Candidates available AND `charged < protection_shortage` |
| **Action** | Add charge at candidate, set reason="protection_charge" |
| **Precedence** | PROTECTION_SAFETY (900) |
| **Overlaps** | GR-010 |

---

## 6. BOILER RULES (BO-NNN)

### BO-001: FVE Overflow Priority
| Field | Value |
|-------|-------|
| **Rule ID** | BO-001 |
| **Module:line** | `boiler/planner.py:189-191` |
| **Condition** | `overflow_available = True` |
| **Action** | Return `EnergySource.FVE` (free energy) |
| **Precedence** | N/A (Boiler domain) |
| **Overlaps** | None |

### BO-002: No Alternative Available
| Field | Value |
|-------|-------|
| **Rule ID** | BO-002 |
| **Module:line** | `boiler/planner.py:194-195` |
| **Condition** | `has_alternative = False` |
| **Action** | Return `EnergySource.GRID` |
| **Precedence** | N/A (Boiler domain) |
| **Overlaps** | None |

### BO-003: No Spot Price Available
| Field | Value |
|-------|-------|
| **Rule ID** | BO-003 |
| **Module:line** | `boiler/planner.py:197-199` |
| **Condition** | `spot_price is None` |
| **Action** | Return `ALTERNATIVE` if `alt_price > 0`, else `GRID` |
| **Precedence** | N/A (Boiler domain) |
| **Overlaps** | None |

### BO-004: Alternative Cheaper Than Grid
| Field | Value |
|-------|-------|
| **Rule ID** | BO-004 |
| **Module:line** | `boiler/planner.py:201-203` |
| **Condition** | `alt_price > 0 AND alt_price < spot_price` |
| **Action** | Return `EnergySource.ALTERNATIVE` |
| **Precedence** | N/A (Boiler domain) |
| **Overlaps** | None |

### BO-005: Default to Grid
| Field | Value |
|-------|-------|
| **Rule ID** | BO-005 |
| **Module:line** | `boiler/planner.py:205` |
| **Condition** | All other conditions false |
| **Action** | Return `EnergySource.GRID` |
| **Precedence** | N/A (Boiler domain) |
| **Overlaps** | **ISSUE**: No coordination with battery/PV forecast |

---

## 7. PV-FIRST RULES (PV-NNN) — NEW (Not Yet Implemented)

> These rules are defined in `precedence_contract.py` but NOT YET implemented in code.

### PV-001: PV Available Defers Grid
| Field | Value |
|-------|-------|
| **Rule ID** | PV-001 |
| **Module:line** | _To be implemented_ |
| **Condition** | PV forecast available with sufficient confidence AND SOC above death-valley |
| **Action** | Defer grid charging to PV charging |
| **Precedence** | PV_FIRST (1000) — HIGHEST |
| **Overlaps** | GR-004, GR-005, GR-011, GR-013 |

### PV-002: PV Forecast Required
| Field | Value |
|-------|-------|
| **Rule ID** | PV-002 |
| **Module:line** | _To be implemented_ |
| **Condition** | PV forecast is None OR zero prediction |
| **Action** | PV-first policy does NOT activate |
| **Precedence** | PV_FIRST (1000) |
| **Overlaps** | None |

### PV-003: SOC Above Death Valley for PV-First
| Field | Value |
|-------|-------|
| **Rule ID** | PV-003 |
| **Module:line** | _To be implemented_ |
| **Condition** | SOC below death-valley threshold |
| **Action** | PV-first policy does NOT activate (protection takes precedence) |
| **Precedence** | PV_FIRST (1000) |
| **Overlaps** | SOC-004, GR-004 |

---

## 8. CONFLICT/OVERLAP ANALYSIS

### 8.1 Protection vs Economic Charging

| Rule A | Rule B | Conflict Type | Resolution |
|--------|--------|---------------|------------|
| GR-010 (Protection Override) | GR-005 (Economic Savings) | Priority conflict | Protection wins (900 > 400) |
| PR-001 (Blackout Protection) | GR-004 (Death Valley Fix) | Overlap | Both activate; protection higher priority |
| SOC-003 (Protection SOC) | SOC-004 (Death Valley) | Both protection | Both trigger, protection_soc >= effective_minimum |

**Key Issue**: Protection rules bypass all economic logic, which is correct for safety but may cause cost spikes if protection SOC is set too conservatively.

### 8.2 Balancing vs Economic Plan

| Rule A | Rule B | Conflict Type | Resolution |
|--------|--------|---------------|------------|
| BA-021 (Forced Lock) | GR-005 (Economic) | Mode override | FORCED wins (locked=True, priority=CRITICAL) |
| BA-011 (Immediate Cost) | GR-012 (Price Band) | Cost optimization | Balancing cost logic supersedes economic charging |
| BA-007 (Natural) | GR-004 (Death Valley) | No conflict | Natural has no override intervals, economic still applies |

**Key Issue**: OPPORTUNISTIC balancing (BA-011, BA-012) uses spot-price-only optimization without checking PV forecast. This may select grid charging during PV production hours.

### 8.3 Mode Guard vs Auto-Switch

| Rule A | Rule B | Conflict Type | Resolution |
|--------|--------|---------------|------------|
| AS-012 (Guard Lock) | AS-007 (Current Mode) | Mode conflict | Guard wins within guard window |
| AS-013 (SOC Exception) | AS-012 (Guard Lock) | Safety override | SOC exception bypasses guard |
| AS-006 (Min Interval) | AS-009 (Watchdog) | Timing conflict | Both enforce 30-min minimum |

**Key Issue**: Mode guard prevents rapid oscillation but SOC exception (AS-013) provides safety escape hatch.

### 8.4 HW Hold vs Cost Optimization

| Rule A | Rule B | Conflict Type | Resolution |
|--------|--------|---------------|------------|
| SOC-006 (HW Min Hold) | GR-005 (Economic) | Priority conflict | HW Hold wins (900 > 400) |
| SOC-006 (HW Min Hold) | GR-013 (Cost Override) | Complex | Cost override only if avoids higher import cost |

**Key Issue**: Extended time at HW minimum triggers forced target charging regardless of price.

---

## 9. TODO MARKERS FOUND

| Location | TODO | Status |
|----------|------|--------|
| `balancing/plan.py:3` | TODO 2: BalancingPlan structure | RESOLVED |
| `balancing/core.py:3` | TODO 5: Natural/Opportunistic/Forced | RESOLVED |
| `balancing/core.py:705` | TODO 5.1: Natural balancing | RESOLVED |
| `balancing/core.py:760` | TODO 5.2: Opportunistic balancing | RESOLVED |
| `balancing/core.py:929` | TODO 5.3: Forced balancing | RESOLVED |

---

## 10. ROOT CAUSE ANALYSIS

### Primary Issue: Missing PV-First Check

**Location**: `charging_plan.py` lines 73-79, 275-384

**Problem**: The economic charging candidate processing loop does NOT check PV forecast before deciding to add grid charge:

```python
# _apply_economic_candidate() - NO PV CHECK
for candidate in candidates:
    # ... cost calculations ...
    if savings_per_kwh >= plan.min_savings_margin:
        timeline[idx]["grid_charge_kwh"] = old_charge + charge_per_interval
        # ^^^ GRID CHARGE ADDED WITHOUT PV CHECK ^^^
```

**Impact**: Grid charging may occur during peak PV production, wasting free solar energy.

### Secondary Issue: Boiler Default to Grid

**Location**: `boiler/planner.py` line 205

**Problem**: `_recommend_source()` defaults to Grid when battery overflow unavailable:

```python
def _recommend_source(...):
    if overflow_available:
        return EnergySource.FVE
    # ... no battery SOC check ...
    return EnergySource.GRID  # DEFAULT
```

**Impact**: Boiler heats from grid even when battery has sufficient charge.

---

## 11. RULE COUNT SUMMARY

| Category | Count | Precedence Range |
|----------|-------|------------------|
| GR-NNN (Grid) | 13 | 400-900 |
| SOC-NNN (SOC) | 7 | 100-900 |
| BA-NNN (Balancing) | 16 | 300-800 |
| AS-NNN (Auto-Switch) | 13 | 200-600 |
| PR-NNN (Protection) | 4 | 900 |
| BO-NNN (Boiler) | 5 | N/A |
| PV-NNN (PV-First) | 3 | 1000 |
| **TOTAL** | **61** | 100-1000 |

---

## Appendix A: Precedence Ladder Reference

From `precedence_contract.py`:

| Rank | Level | Value | Description |
|------|-------|-------|-------------|
| 1 | PV_FIRST | 1000 | PV-first policy |
| 2 | PROTECTION_SAFETY | 900 | Hardware protection, safety |
| 3 | DEATH_VALLEY | 800 | Minimum SOC enforcement |
| 4 | BALANCING_OVERRIDE | 700 | Cell calibration |
| 5 | MODE_GUARD | 600 | Stability enforcement |
| 6 | RECOVERY_MODE | 500 | Error state recovery |
| 7 | ECONOMIC_CHARGING | 400 | Cost optimization |
| 8 | OPPORTUNISTIC | 300 | Natural balancing |
| 9 | AUTO_SWITCH | 200 | Mode switching |
| 10 | PLANNING_TARGET | 100 | Target achieved |

---

## Appendix B: Files Analyzed

1. `custom_components/oig_cloud/battery_forecast/planning/charging_plan.py` (601 lines)
2. `custom_components/oig_cloud/battery_forecast/strategy/hybrid_planning.py` (1232 lines)
3. `custom_components/oig_cloud/boiler/planner.py` (291 lines)
4. `custom_components/oig_cloud/battery_forecast/balancing/core.py` (1462 lines)
5. `custom_components/oig_cloud/battery_forecast/balancing/plan.py` (224 lines)
6. `custom_components/oig_cloud/battery_forecast/planning/auto_switch.py` (574 lines)
7. `custom_components/oig_cloud/battery_forecast/planning/mode_guard.py` (449 lines)
8. `custom_components/oig_cloud/battery_forecast/planning/precedence_contract.py` (395 lines)

**Total lines analyzed**: 5,228

---

*End of Baseline Rule Matrix*
