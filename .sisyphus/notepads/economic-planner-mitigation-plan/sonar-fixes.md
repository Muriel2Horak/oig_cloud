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
