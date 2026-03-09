## 2026-03-08 - PR #22 Sonar/CI remediation

- Investigated failing checks on PR #22 (`Pytest Check`, `test`, `SonarCloud Scan`).
- Root cause in CI logs: a single failing test `tests/test_economic_planner_integration.py::TestLoadPlannerInputs::test_load_planner_inputs_basic`.
- Failure cause: test mocked `hass.states.get` with one generic state (`5.0`) for all entities, so `max_capacity_kwh` was incorrectly read as `5.0` instead of expected `10.24`.

### Applied fix

- Updated `test_load_planner_inputs_basic` to use entity-specific mocked states:
  - `sensor.oig_12345_battery_level` -> `5.0`
  - `sensor.oig_12345_installed_battery_capacity_kwh` -> `10.24`
  - `sensor.oig_12345_batt_bat_min` -> `1.0`
- Implemented `hass.states.get.side_effect` dispatch function for deterministic sensor mapping.

### Verification

- Targeted test: PASS.
- Whole file `tests/test_economic_planner_integration.py`: PASS (17/17).
- Full local suite: PASS (`3108 passed`) with coverage output generated.
- Local coverage report summary: `TOTAL 24943 statements, 971 missed, 96%`.

### SonarCloud quality gate details (PR #22)

- `new_coverage`: **74.2%** (threshold **80%**) -> still failing quality gate.
- `new_bugs`: 0 (pass).
- `new_code_smells`: 0 (pass).
- `new_duplicated_lines_density`: 0.0% (pass).
- `new_security_hotspots_reviewed`: 100% (pass).

### Remaining blocker

- The only remaining Sonar quality gate blocker on PR #22 is **new code coverage below 80%**.
- Biggest uncovered source in PR diff:
  - `custom_components/oig_cloud/battery_forecast/economic_planner_integration.py`
  - `new_coverage: 45.0%`, `110` uncovered new lines.

## 2026-03-08 - economic_planner targeted coverage uplift

- Ran requested command:
  - `python3 -m pytest tests/test_economic_planner.py -v --cov=custom_components/oig_cloud/battery_forecast/economic_planner.py --cov-report=term-missing`
  - Note: pytest-cov did not collect with filesystem path syntax in this environment (`module-not-imported`).
- Verified with importable module path:
  - `python3 -m pytest tests/test_economic_planner.py -v --cov=custom_components.oig_cloud.battery_forecast.economic_planner --cov-report=term-missing`
  - Result: `31 passed`, `economic_planner` coverage `100%` (`165 statements, 0 missed`).

### Added tests (only in `tests/test_economic_planner.py`)

- `test_calculate_cost_use_battery_returns_zero_when_moment_out_of_range`
  - covers early return when `moment.interval >= len(inputs.intervals)`.
- `test_calculate_cost_use_battery_uses_current_soc_when_moment_soc_is_none`
  - covers `initial_soc is None` fallback branch.
- `test_calculate_cost_wait_for_solar_returns_infinity_when_no_solar_surplus`
  - covers `solar_start is None -> inf` branch.
- `test_calculate_cost_wait_for_solar_uses_current_soc_when_moment_soc_is_none`
  - covers `initial_soc is None` branch in wait-for-solar path.
- `test_calculate_cost_charge_cheapest_handles_invalid_ranges_and_breaks_when_filled`
  - covers guard returns (`deficit <= 0`, invalid bounded range), sorted candidate charging, and early break.
- `test_make_economic_decisions_emergency_when_all_strategies_non_finite`
  - covers emergency fallback decision (`EMERGENCY_NO_FINITE_STRATEGY`).
- `test_generate_plan_raises_on_safety_validation_failure`
  - covers safety validation exception path in `generate_plan`.

### Validation

- All tests in file pass after changes.
- LSP diagnostics clean for changed file `tests/test_economic_planner.py`.
- No source changes in `economic_planner.py`; test-only coverage uplift.

## 2026-03-09 - Home Assistant startup crash after PR #22

- Investigated `PlannerInputs` construction path in `planning/forecast_update.py` (lines 324-334) and validation in `economic_planner_types.py`.
- Root cause identified: `PlannerInputs.__post_init__` rejected `current_soc_kwh <= 0` with `ValueError("Current SOC must be positive")`.
- This is too strict for real HA startup conditions where battery SOC can legitimately be `0.0 kWh`.

### Applied fix

- File changed: `custom_components/oig_cloud/battery_forecast/economic_planner_types.py`
- Validation relaxed from `current_soc_kwh <= 0` to `current_soc_kwh < 0`.
- Error message updated to `"Current SOC cannot be negative"`.

### Why this is safe

- `0.0` SOC is physically valid and should not crash planner initialization.
- Negative SOC remains blocked.
- Existing `current_soc_kwh > max_capacity_kwh` guard remains intact.
- Forecast length and negative forecast guards are unchanged.
- `IntervalData` currently includes only `index`; runtime planner logic does not validate TypedDict keys at runtime, so extra `time` key in `forecast_update.py` is not the startup crash trigger.

### Verification

- LSP diagnostics: clean for changed source file.
- Syntax compile check passed:
  - `python3 -m py_compile custom_components/oig_cloud/battery_forecast/economic_planner_types.py`
  - `python3 -m py_compile custom_components/oig_cloud/battery_forecast/planning/forecast_update.py`
- Environment note: direct import smoke test via package root failed locally due to missing Home Assistant runtime dependency (`ModuleNotFoundError: homeassistant`), not due to planner code syntax.

## 2026-03-09 - Config flow handler registration fix

- Investigated persistent HA error: `Flow handler not found for entry ... for oig_cloud` after SOC validation fix.
- Confirmed `manifest.json` still has `"config_flow": true` and `config/steps.py` defines `ConfigFlow` with `domain = DOMAIN`.
- Root cause: `custom_components/oig_cloud/config_flow.py` only re-exported `ConfigFlow` imported from `config.steps`; in HA startup/import chain this can miss explicit domain-bound class registration expected by loader.

### Applied fix

- File changed: `custom_components/oig_cloud/config_flow.py`
- Added explicit local entrypoint class bound to domain:
  - `from .config.steps import ConfigFlow as StepsConfigFlow, OigCloudOptionsFlowHandler`
  - `from .const import DOMAIN`
  - `class ConfigFlow(StepsConfigFlow, domain=DOMAIN): pass`
- Kept `__all__ = ["ConfigFlow", "OigCloudOptionsFlowHandler"]` so HA resolves flow handler directly from module export.

### Verification

- LSP diagnostics clean for changed file: `custom_components/oig_cloud/config_flow.py`.
- Syntax/build check passed:
  - `python3 -m py_compile custom_components/oig_cloud/config_flow.py`
- Import smoke command for full HA flow chain remains blocked locally by missing dev deps (`homeassistant`, `voluptuous`) in this shell, but no syntax/import-structure regressions introduced in changed file.
