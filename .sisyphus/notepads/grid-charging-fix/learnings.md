# Task 1: Write failing regression test (RED) - COMPLETED

## Summary
Created `tests/test_hybrid_economic_charging_solar_overflow.py` with test `test_economic_charging_skipped_when_solar_reaches_target`.

## Test Setup
- **DummyStrategy** with `_planning_min = 2.0`, `_target = 3.0`
- **Initial battery**: 2.5 kWh (above planning_min → NOT recovery mode)
- **Solar forecast**: [2.0] * 24 (2.0 kWh per interval)
- **Consumption forecast**: [0.5] * 24 (0.5 kWh per interval)  
- **Net solar gain**: +1.5 kWh per interval
- **Prices**: [0.3] * 24 (below max_ups_price_czk = 1.0, triggers economic charging)
- **Required config**: `round_trip_efficiency = 0.9` for _apply_economic_charging to run

## Expected vs Actual Behavior
- **Expected**: `charging_intervals == set()` (empty - no grid charging needed)
- **Actual**: `charging_intervals == {0, 1, 2, ..., 23}` (all 24 intervals added)

## Test Result
✅ **FAILING as expected** - Test demonstrates the solar overflow bug
- Economic charging incorrectly adds grid charging intervals despite solar being sufficient
- Bug confirmed: _apply_economic_charging ignores solar sufficiency and adds intervals based purely on price comparison

## Next Steps
- Test is ready for Task 3 (implement fix) to make it pass (GREEN)
- Test will verify that guard properly skips economic charging when solar+plan reaches target SOC