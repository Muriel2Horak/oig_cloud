# Task 2 report — Pylint and pre-commit gates

## Outcome

- Enforced Pylint `fail-under=9.50` and `fail-on=E,F`.
- Preserved the inherited 13-rule disable set; repaired only its malformed syntax.
- Added a report wrapper that emits JSON2 and returns Pylint's exact exit status.
- Added immutable-SHA pre-commit hooks plus canonical local Mypy, Pylint, v2 ESLint, and v2 typecheck hooks.
- Locked Python `3.14.3`, Pylint `4.0.7`, pre-commit `4.6.1`, and transitive dependencies with hashes.
- Made `.github/workflows/pre-commit.yml` blocking; added `pip check`, exact `npm ci`, and always-uploaded Pylint artifact.
- Repaired all three Pylint errors and converted 313 direct logging f-strings to lazy formatting outside authentication and solar paths.
- Final Pylint score: `9.523990304587798/10`; `E=0`; `F=0`; exit `0`.

## RED evidence

- Canonical environment: CPython `3.14.3`; Pylint `4.0.7`; pre-commit `4.6.1`; uv `0.11.31`.
- Discarded evidence: `/opt/homebrew/bin/pylint` run produced 351 false `E0401` imports because it was outside the locked environment.
- Canonical baseline command:
  - `.venv-task2/bin/python -m pylint custom_components/oig_cloud --rcfile=.pylintrc --output-format=json2`
  - Exit `30`; score `9.42404859955022`; 1,961 messages.
  - Counts: `C=643`; `W=1,187`; `R=128`; `E=3`; `F=0`.
  - Error roots: callable inference in `boiler/sensors.py`; optional subscript in `boiler/runtime.py`; optional subscript in `api/ha_rest_api.py`.
- Policy RED command:
  - `.venv-task2/bin/python -m pytest tests/test_quality_gate_policy.py -q`
  - Six assertion failures: malformed disable syntax; missing score/E/F policy; missing report runner/hooks; swallowed CI failure; missing exact pins.
- Error-regression RED:
  - Added executable Pylint checks for the three error modules and an injected undefined-name fixture.
  - Failed before production fixes; collection and environment failures were not counted as RED.

## GREEN evidence

- Policy and behavior:
  - `tests/test_quality_gate_policy.py`: 8 passed.
  - Three Pylint error modules plus focused boiler/API behavior: 45 passed.
  - All mechanically touched production modules: 983 focused tests passed in 13.60s.
- Pylint:
  - `PYLINT_REPORT=/tmp/task2-pylint-final.json PYTHON_BIN=.venv-task2/bin/python ./scripts/run_pylint.sh`
  - Exit `0`; JSON2 size 1,125,357 bytes; stderr 0 bytes.
  - Score `9.523990304587798`; 1,631 messages: `C=629`; `R=128`; `W=874`; `E=0`; `F=0`.
  - No unknown-option or deprecated-option diagnostics.
  - Injected `E0602` fixture returns nonzero under the final configuration.
- Pre-commit:
  - `PATH="$PWD/.venv-task2/bin:$PATH" PYTHON_BIN=.venv-task2/bin/python .venv-task2/bin/python -m pre_commit run --all-files --show-diff-on-failure`
  - Accepted first run: exit `1` only because trailing-whitespace and EOF hooks normalized active files; all semantic hooks passed.
  - Final-config run: exit `0`; all nine hooks passed.
  - Idempotence rerun: exit `0`; all nine hooks passed; no rewrites.
- Python suite and coverage:
  - `.venv-task2/bin/python -m pytest --cov=custom_components/oig_cloud --cov-report=xml --cov-report=term-missing --cov-fail-under=80.01`
  - 4,933 passed; 27 skipped; 10 warnings; 115.06s.
  - Coverage `91.01%`; no socket or leak errors.
- Independent gates:
  - `.venv-task2/bin/python -m flake8 custom_components/oig_cloud tests`: exit `0`.
  - `.venv-task2/bin/python -m mypy custom_components/oig_cloud --ignore-missing-imports --explicit-package-bases`: 198 source files; zero issues.
  - `npm --prefix custom_components/oig_cloud/www_v2 run lint -- --quiet`: exit `0`.
  - `npm --prefix custom_components/oig_cloud/www_v2 run typecheck`: exit `0`.
  - `.venv-task2/bin/python -m pip check`: no broken requirements.
  - `UV_BIN=.venv-task2/bin/uv ./scripts/generate_requirements.sh --check`: exit `0`; both locks deterministic and current.
  - `git diff --check`: exit `0`.

## Gate files

- `.pylintrc`
- `.pre-commit-config.yaml`
- `.github/workflows/pre-commit.yml`
- `requirements-dev.in`
- `requirements-dev.txt`
- `scripts/run_pylint.sh`
- `tests/test_quality_gate_policy.py`

## Production files

- `custom_components/oig_cloud/api/api_chmu.py`
- `custom_components/oig_cloud/api/ha_rest_api.py`
- `custom_components/oig_cloud/api/ote_api.py`
- `custom_components/oig_cloud/battery_forecast/balancing/core.py`
- `custom_components/oig_cloud/binary_sensor.py`
- `custom_components/oig_cloud/boiler/runtime.py`
- `custom_components/oig_cloud/boiler/sensors.py`
- `custom_components/oig_cloud/core/coordinator.py`
- `custom_components/oig_cloud/core/oig_cloud_notification.py`
- `custom_components/oig_cloud/entities/adaptive_load_profiles_sensor.py`
- `custom_components/oig_cloud/entities/analytics_sensor.py`
- `custom_components/oig_cloud/entities/battery_balancing_sensor.py`
- `custom_components/oig_cloud/entities/battery_health_sensor.py`
- `custom_components/oig_cloud/entities/chmu_sensor.py`
- `custom_components/oig_cloud/entities/computed_sensor.py`
- `custom_components/oig_cloud/entities/data_sensor.py`
- `custom_components/oig_cloud/entities/shield_sensor.py`
- `custom_components/oig_cloud/entities/statistics_sensor.py`
- `custom_components/oig_cloud/pricing/spot_price_hourly.py`
- `custom_components/oig_cloud/sensor.py`
- `custom_components/oig_cloud/shield/core.py`

## Normalization-only files

- Count: 86 tracked active files.
- Change kind: trailing whitespace removal and final-newline normalization only.
- Blob comparison against `HEAD`: 86/86 files equal the deterministic trailing-whitespace plus EOF transformation.
- Generated dist, archived plans, evidence, notepads, drafts, and report artifacts remained byte-unchanged.
- `.devcontainer/devcontainer.json` and `.vscode/launch.json` remain excluded only from `check-json` because they are JSONC; `.vscode/settings.json` is checked as valid JSON.
- Files:
  - `.coveragerc`
  - `.current_status.md`
  - `.github/workflows/dependency-check.yml`
  - `.github/workflows/maintainability.yml`
  - `.github/workflows/quality.yml`
  - `.github/workflows/sonarcloud.yml`
  - `.opencode/todo.md`
  - `.openhands/microagents/repo.md`
  - `.safety-project.ini`
  - `.sisyphus/boulder.json`
  - `.sisyphus/plans/battery-planner-redesign-v2.md`
  - `.sisyphus/plans/battery-planner-redesign.md`
  - `.sisyphus/plans/boiler-config-ui-optimization.md`
  - `.sisyphus/plans/economic-battery-logic-rework.md`
  - `.sisyphus/plans/economic-battery-planner-final.md`
  - `.sisyphus/plans/economic-battery-planner-v3.md`
  - `.sisyphus/plans/economic-planner-mitigation-plan.md`
  - `.sisyphus/plans/grid-charging-fix.md`
  - `.vscode/launch.json`
  - `.vscode/settings.json`
  - `.whitesource`
  - `DEPLOYMENT_SUCCESS_REPORT.md`
  - `FIX_CHROME_CACHE.md`
  - `MANUAL_FIXES.md`
  - `README.md`
  - `custom_components/oig_cloud/remote_config/data/pricelists.json`
  - `custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts`
  - `custom_components/oig_cloud/www_v2/src/__tests__/example.test.ts`
  - `custom_components/oig_cloud/www_v2/src/__tests__/node-sizing.test.ts`
  - `custom_components/oig_cloud/www_v2/src/__tests__/setup.ts`
  - `custom_components/oig_cloud/www_v2/src/core/errors.ts`
  - `custom_components/oig_cloud/www_v2/src/core/lifecycle.ts`
  - `custom_components/oig_cloud/www_v2/src/core/logger.ts`
  - `custom_components/oig_cloud/www_v2/src/data/api.ts`
  - `custom_components/oig_cloud/www_v2/src/ui/components/simulator-charts.ts`
  - `custom_components/oig_cloud/www_v2/src/ui/components/theme-provider.ts`
  - `custom_components/oig_cloud/www_v2/src/ui/features/control-panel/dialog.ts`
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/canvas.ts`
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts`
  - `custom_components/oig_cloud/www_v2/src/ui/layout/tabs.ts`
  - `custom_components/oig_cloud/www_v2/src/ui/theme.ts`
  - `custom_components/oig_cloud/www_v2/src/utils/dom.ts`
  - `custom_components/oig_cloud/www_v2/src/utils/motion.ts`
  - `custom_components/oig_cloud/www_v2/tests/setup.ts`
  - `custom_components/oig_cloud/www_v2/tests/unit/core/errors.test.ts`
  - `custom_components/oig_cloud/www_v2/tests/unit/core/lifecycle.test.ts`
  - `custom_components/oig_cloud/www_v2/tests/unit/data/query-cache.test.ts`
  - `custom_components/oig_cloud/www_v2/tests/unit/ui/components.test.ts`
  - `custom_components/oig_cloud/www_v2/tests/unit/ui/control-panel/types.test.ts`
  - `custom_components/oig_cloud/www_v2/tests/unit/ui/pricing/types.test.ts`
  - `custom_components/oig_cloud/www_v2/tests/unit/utils/colors.test.ts`
  - `custom_components/oig_cloud/www_v2/tests/unit/utils/dom.test.ts`
  - `custom_components/oig_cloud/www_v2/tests/unit/utils/motion.test.ts`
  - `custom_components/oig_cloud/www_v2/vite.config.ts`
  - `custom_components/oig_cloud/www_v2/vitest.config.ts`
  - `deploy_to_ha.sh`
  - `docs/fe_v2/ARCHITECTURE.md`
  - `docs/fe_v2/CUTOVER_PLAN.md`
  - `docs/fe_v2/PARITY_CONTRACT.md`
  - `docs/fe_v2/TEST_PLAN.md`
  - `docs/redesign_2026_07/nim-model-test-2026-07-09.json`
  - `docs/redesign_2026_07/plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md`
  - `docs/redesign_2026_07/plans/2026-07-25-wizard-v2-implementation.md`
  - `docs/redesign_2026_07/rework/BOILER-INPUTS-RESEARCH.md`
  - `docs/redesign_2026_07/rework/ERU-DATA-ANALYSIS.md`
  - `docs/redesign_2026_07/rework/FIELD-PROPAGATION-MATRIX.md`
  - `docs/redesign_2026_07/rework/PLANNER-INPUTS-RESEARCH.md`
  - `docs/user/DATA_SOURCE.md`
  - `settings.json`
  - `spec-critique/LOOP-STATUS.md`
  - `spec-critique/R10-PERF-round5.md`
  - `spec-critique/R2-SECURITY-sec.md`
  - `tests/data/historical_scenarios.json`
  - `tests/sample-response.json`
  - `tests/test_boiler_m1_hotfixes.py`
  - `tests/test_box_mode_extended_sensor.py`
  - `tests/test_box_prm2_api.py`
  - `tests/test_box_prm2_app_local_proxy_mapping.py`
  - `tests/test_box_prm2_app_sensor.py`
  - `tests/test_config_steps_coverage_extra.py`
  - `tests/test_config_steps_more3.py`
  - `tests/test_input_quality_guards.py`
  - `tests/test_proxy_normalization.py`
  - `tests/test_rollout_flags.py`
  - `tests/test_rule_matrix_baseline.py`
  - `tests/test_services_init_coverage.py`

## Residual risks

- Pylint still reports 1,630 enabled non-E/F findings; the enforced score and all-E/F failure policy prevent regression beyond the configured threshold.
- The approved whitespace/EOF baseline repair creates a broad mechanical review surface; paths are isolated above and the final all-files rerun is byte-clean.
- Ten non-failing pytest warnings remain; no new socket or resource-leak warning was observed.
- No authentication, azimuth/provider, or solar scheduler behavior was changed.

## Review fix — configuration and workflow propagation

### RED

- Canonical reproduction: CPython `3.14.3`; Pylint `4.0.7`; pre-commit `4.6.1`; hash-locked install; `pip check` clean.
- Focused Pylint run emitted `R0022 useless-option-value` for inherited disabled `no-self-use`; focused module score remained `10.0` and exit remained `0`.
- Added executable coverage for all known Pylint configuration diagnostic symbols, including `useless-option-value`.
- Added repository-wide workflow invocation coverage requiring the canonical wrapper, report path, exact exit propagation, and no swallowed invocation.
- RED command:
  - `.venv-task2-review/bin/python -m pytest tests/test_quality_gate_policy.py::test_pylint_configuration_emits_no_diagnostics tests/test_quality_gate_policy.py::test_every_workflow_pylint_invocation_is_canonical_and_blocking -q`
  - Result: 2 failed for intended reasons; no collection or environment failure.
  - Failure 1: JSON2 contained `R0022 useless-option-value`.
  - Failure 2: `.github/workflows/quality.yml` invoked `python -m pylint ... || true` directly.

### GREEN

- Loaded `pylint.extensions.no_self_use`; retained the exact inherited 13-rule disable set.
- Replaced the duplicate quality-workflow command with `scripts/run_pylint.sh` and `PYLINT_REPORT=pylint-report.json`.
- Added `if: always()` report upload without masking the failed Pylint step.
- Focused policy suite: 10 passed in 8.16s, including the injected E fixture.
- Pylint wrapper: exit `0`; score `9.523990304587798`; 1,630 messages; `C=629`; `R=127`; `W=874`; `E=0`; `F=0`.
- Pylint JSON2 report: 1,124,746 bytes; zero configuration diagnostics; stderr 0 bytes.
- Pre-commit all-files: two consecutive exit-`0` runs; all nine hooks passed; no rewrites.
- Flake8: exit `0` across production and tests.
- Mypy: 198 production files; zero issues.
- Workflow YAML parse and `bash -n scripts/run_pylint.sh`: exit `0`.
- Full Python suite was not repeated because this follow-up changes only Pylint configuration, workflow YAML, policy tests, and this report. Reviewed production baseline remains 4,933 passed, 27 skipped, and 91.01% coverage.
