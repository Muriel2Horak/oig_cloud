# Decisions — grid-boiler-rules-overhaul

## [2026-03-03] Session Bootstrap

### Architecture Decisions
- Work on `main` branch directly (no separate worktree needed per plan — worktrees were from prior experiments)
- TDD strategy: RED → GREEN → REFACTOR for each critical decision task
- Evidence artifacts go to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`
- Feature flags: new PV-first policy must be toggleable without code changes

### Pre-existing LSP Errors (NOT caused by us — baseline state)
The following LSP errors exist in the repo BEFORE any of our changes:
- `grid_charging_sensor.py`: DeviceInfo type errors, property override issues
- `forecast_update.py`: datetime issues, tuple size mismatch at line 715, possibly unbound
- `spot_price_15min.py`: SensorEntity.state override final method, DeviceInfo type errors
- `test_grid_charging_plan_sensor.py`: DummyCoordinator config_entry type errors
- `mode_guard.py`: No overloads for "get" match

These are pre-existing and must NOT be introduced by our tasks. But we also should not fix them unless task scope requires it.

## [2026-03-03] Task 3: Precedence Contract Implementation

### Module Design Decisions
- **Location**: `custom_components/oig_cloud/battery_forecast/planning/precedence_contract.py`
- **No runtime dependencies**: Module imports cleanly without HA, coordinator, or config references
- **IntEnum-based precedence**: Numeric values spaced by 100 (1000, 900, 800...) to allow intermediate levels

### Priority Ladder Order (HIGHEST → LOWEST)
1. **PV_FIRST (1000)**: NEW - Defer grid charging when PV forecast available with confidence
2. **PROTECTION_SAFETY (900)**: Hardware limits, critical safety (GR-010, SOC-003, SOC-006, SOC-013, BA-001)
3. **DEATH_VALLEY (800)**: Minimum SOC enforcement (SOC-004, SOC-016, BA-019)
4. **BALANCING_OVERRIDE (700)**: Cell calibration requirements (BA-021, BA-022, BA-024)
5. **MODE_GUARD (600)**: Stability enforcement (AS-012, AS-013)
6. **RECOVERY_MODE (500)**: Error state recovery (GR-001, GR-008)
7. **ECONOMIC_CHARGING (400)**: Cost optimization (GR-004, GR-005, PR-001, PR-004) — dynamic-by-day
8. **OPPORTUNISTIC (300)**: Passive balancing (BA-011, BA-012, BA-007)
9. **AUTO_SWITCH (200)**: Automatic mode switching (AS-007, AS-009)
10. **PLANNING_TARGET (100)**: Baseline target/min achieved (SOC-001, SOC-002)

### Tie-Breaker Contract
- **First-wins rule**: `resolve_conflict(A, A) == A` — deterministic, no random/stateful decisions
- **Pure function**: No side effects, no global state modifications
- **Higher always wins**: `resolve_conflict(A, B) == max(A, B)` for all A, B

### Invariants Defined
13 non-negotiable invariants covering:
- PV-first deferral requirements
- Protection/safety overrides
- Death valley trigger conditions
- Balancing deadline enforcement
- Mode guard SOC exception
- Economic charging price caps
- Total order and deterministic tie-breaker guarantees

### Rule ID Mapping
All known rule IDs (GR-*, SOC-*, BA-*, AS-*, PR-*, PV-*) mapped to precedence levels via `RULE_TO_PRECEDENCE` dict.

### Test Coverage
- 36 tests in `tests/test_rule_precedence_contract.py`
- Total order verification: antisymmetry, transitivity, totality
- Deterministic tie-breaker verification: repeated calls, pure function analysis
- All tests GREEN (passed)

### Evidence Files
- `.sisyphus/evidence/task-3-precedence-invariants.txt` — total order test output
- `.sisyphus/evidence/task-3-tiebreak.txt` — tie-breaker test output
