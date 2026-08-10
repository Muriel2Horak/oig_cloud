# Task 1 fix report: executable and sealed HA 2026.8 quality gates

- Status: `DONE`
- Fix base: `3b59a2bb9d80501fab2ed3114162fe728a50836a`
- Commit: the commit containing this report; exact immutable hash is recorded in the task handoff because a commit cannot contain its own hash
- Scope: rejected Task 1 quality slice only; no auth, azimuth, provider, scheduler, release, Pylint, pre-commit, remote, PR, push, or deployment work

## Outcome

- Align every `requirements-dev.txt` workflow consumer to Python `3.14.3`.
- Install the canonical development lock in every pytest workflow; remove the split `--no-deps` plugin overlay.
- Pin `pytest-homeassistant-custom-component==0.13.355`, which declares exact compatibility with Home Assistant `2026.8.1`.
- Remove direct test pins owned by the canonical plugin metadata.
- Remove the obsolete HTTP patch-target shim and its false-green assertion.
- Generate a Linux runtime lock and universal development lock from sealed inputs and hashes.
- Make resolution independent of the configured uv index, stale metadata, and existing output locks with explicit PyPI, global refresh, package refresh, and upgrade resolution.
- Retain `--prerelease explicit`, not global prerelease admission. The only selected prerelease is the explicit `opentelemetry-semantic-conventions==0.50b0` input required exactly by stable `opentelemetry-sdk==1.29.0`.
- Restore strict HA 2026.8 cleanup/socket verification by removing root fixture overrides and fixing narrow test lifecycle/network seams.

## TDD RED evidence

- Static CI/dependency contracts before workflow and dependency edits:
  - Command: `python3.14 -m pytest --noconftest -q tests/test_dependency_policy.py`
  - Result: exit 1; failures identified Python `3.12` development-lock consumers, pytest jobs without the canonical lock, the stale `0.13.316` split overlay and `--no-deps` install, redundant plugin-owned pins, missing sealed generator/cutoff/hash/reproducibility contracts, and globally mutable prerelease resolution.
  - The first invocation without `--noconftest` was discarded because the pre-lock system interpreter could not import Home Assistant; it was not treated as RED evidence.
- Mock E2E background-worker regression:
  - Command: `.venv-task1-fix/bin/pytest -q tests/e2e/test_services_e2e.py::test_mock_setup_does_not_start_external_background_workers`
  - Result: exit 1; timeout after 15 seconds plus lingering `CloudMqttPublisher._run_worker`.
  - Follow-up exposed a lingering `DataSourceController._on_periodic` timer before all mock-only external workers were isolated.
  - Log: `/tmp/oig-task1-e2e-red.log`.
- Exact full-suite lifecycle/socket baseline:
  - Command: `.venv-task1-fix/bin/pytest -v --tb=short --cov=custom_components/oig_cloud --cov-report=xml --cov-report=term-missing:skip-covered`
  - Result: exit 1; `3 failed, 4915 passed, 27 skipped, 51 errors in 113.16s`.
  - Classified failures/errors: 35 setup-entry MQTT socket errors; 7 boiler serializer consumer leaks; 3 quick-setup OTE socket errors; 2 OTE fallback socket errors; 3 sensor forecast timer leaks; 1 coordinator debouncer timer; 2 boiler resolver assertions invoking an unrelated HA frame helper; 1 stale unload-platform assertion.
  - Log: `/tmp/oig-task1-pytest-final.log`.
- Focused compatibility/lifecycle RED:
  - Command: `.venv-task1-fix/bin/pytest -q --tb=short tests/test_boiler_services.py tests/test_boiler_task1_routing.py::test_boiler_coordinator_no_infer_box_id_from_states tests/test_boiler_task1_routing.py::test_boiler_coordinator_infer_method_removed_or_safe tests/test_reload_partial_failure.py::test_async_unload_entry_survives_platform_unload_exception tests/test_config_flow_entry.py::test_quick_setup_success tests/test_config_flow_quick_setup.py::test_quick_setup_success tests/test_config_steps_more4.py::test_quick_setup_ote_api_warning tests/test_coordinator.py::test_update_battery_forecast_config_entry_options_error tests/test_ote_api.py::test_get_spot_prices_fallback_to_cache_on_error tests/test_ote_api.py::test_get_spot_prices_error_no_cache tests/test_sensor_lifecycle.py::test_async_added_to_hass_restore_state_failures tests/test_sensor_lifecycle.py::test_async_added_to_hass_store_failures tests/test_sensor_lifecycle.py::test_async_added_to_hass_initial_refresh_error`
  - Result: exit 1; `2 failed, 27 passed, 16 errors`.
- Output-file-independent lock regeneration:
  - Command: `./scripts/generate_requirements.sh --check`
  - Result: exit 1; two isolated generations matched, but committed `requirements.txt` differed at line 22 because uv preferred the existing output lock.
  - Added RED contract: `.venv-task1-fix/bin/pytest -q tests/test_dependency_policy.py::test_canonical_lock_generator_seals_and_refreshes_resolution` failed on the missing `--upgrade` argument.
  - Logs: `/tmp/oig-task1-lock-check.log`, `/tmp/oig-task1-lock-check-green.log`.
- Interrupted diagnostic run:
  - One early full run was manually interrupted by this executor with `SIGINT` after it hung in `tests/e2e/test_services_e2e.py::test_service_set_boiler_mode_calls_api`; it ended after 9 passed and 27 skipped with `KeyboardInterrupt` and was not verification.
  - Root cause: mock E2E setup started a Paho MQTT reconnect worker and AI `_initial_tick`; strict DNS/socket cleanup exposed them.
  - Unrelated PID `37103` was inspected read-only and left untouched.

## GREEN evidence

- Dependency-policy contracts:
  - Command: `.venv-task1-fix/bin/pytest -q tests/test_dependency_policy.py`
  - Result: PASS; `14 passed in 0.20s`.
- Focused compatibility/lifecycle cluster:
  - Command: the focused 70-test cluster covering all classified nodes plus all of `tests/test_init_setup_entry.py`.
  - Result: PASS; `70 passed in 0.62s`.
- E2E services:
  - Command: `.venv-task1-fix/bin/pytest -q tests/e2e/test_services_e2e.py`
  - Result: PASS; `8 passed in 0.29s`.
- Lock generation and reproducibility:
  - Commands: `./scripts/generate_requirements.sh`; `./scripts/generate_requirements.sh --check`.
  - Result: PASS; two isolated generations are byte-identical and both committed locks match them.
  - Final log: `/tmp/oig-task1-lock-check-final.log`.
- Exact committed development lock installation:
  - Command: `.venv-task1-fix/bin/python -m pip install --require-hashes -r requirements-dev.txt`.
  - Result: PASS in a fresh Python `3.14.3` environment.
  - Command: `.venv-task1-fix/bin/python -m pip check`.
  - Result: PASS; `No broken requirements found.`
  - Installed versions: `homeassistant=2026.8.1`; `pytest-homeassistant-custom-component=0.13.355`.
- Exact full Python CI suite against the final installed lock:
  - Command: `.venv-task1-fix/bin/pytest -v --tb=short --cov=custom_components/oig_cloud --cov-report=xml --cov-report=term-missing:skip-covered`.
  - Result: PASS; `4918 passed, 27 skipped, 10 warnings in 109.21s`; total coverage `91%`; no failures or errors.
  - Log: `/tmp/oig-task1-pytest-final-green.log`.
- Full Flake8:
  - Command: `.venv-task1-fix/bin/python -m flake8 custom_components/oig_cloud tests --max-line-length=120`.
  - Result: PASS; exit 0, no findings.
- Full Mypy:
  - Command: `.venv-task1-fix/bin/mypy custom_components/oig_cloud --ignore-missing-imports --explicit-package-bases`.
  - Result: PASS; `Success: no issues found in 198 source files`.
- Frontend ESLint:
  - Command: `cd custom_components/oig_cloud/www_v2 && npm run lint -- --quiet`.
  - Result: PASS; exit 0.
- Frontend typecheck:
  - Command: `cd custom_components/oig_cloud/www_v2 && npm run typecheck`.
  - Result: PASS; exit 0.
- Focused onboarding unit test:
  - Command: `cd custom_components/oig_cloud/www_v2 && TZ=UTC npm run test:unit -- src/__tests__/onboarding-quicksave.test.ts`.
  - Result: PASS; `17 passed`.
- Diff hygiene:
  - Command: `git diff --check`.
  - Result: PASS; exit 0.

## Changed files

- Workflows: `.github/workflows/dependency-check.yml`, `.github/workflows/quality.yml`, `.github/workflows/sonarcloud.yml`, `.github/workflows/test.yml`.
- Dependency inputs and locks: `requirements.in`, `requirements-dev.in`, `requirements.txt`, `requirements-dev.txt`.
- Removed obsolete overlay: `requirements-ha-test-plugin.in`, `requirements-ha-test-plugin.txt`.
- Generator: `scripts/generate_requirements.sh`.
- Harness cleanup: `tests/conftest.py`, `tests/test_ai_optional.py`.
- Dependency contracts: `tests/test_dependency_policy.py`.
- Mock E2E lifecycle: `tests/e2e/conftest.py`, `tests/e2e/test_services_e2e.py`.
- HA 2026.8 test compatibility and explicit lifecycle isolation: `tests/test_boiler_services.py`, `tests/test_boiler_task1_routing.py`, `tests/test_config_flow_entry.py`, `tests/test_config_flow_quick_setup.py`, `tests/test_config_steps_more4.py`, `tests/test_coordinator.py`, `tests/test_init_setup_entry.py`, `tests/test_ote_api.py`, `tests/test_reload_partial_failure.py`, `tests/test_sensor_lifecycle.py`.

## Residual risks

- The development lock is universal so macOS can verify it exactly with pip; the runtime lock is explicitly Linux `x86_64-manylinux_2_28`. GitHub Ubuntu remains the final platform execution environment, but both structures are produced and checked by one sealed generator.
- `--prerelease explicit` is required because stable OTel `1.29.0` declares exact beta semantic conventions `0.50b0`. The policy prevents unrequested prereleases but deliberately permits that exact input dependency.
- Mock-only worker patches in E2E and setup-entry unit tests isolate external MQTT, AI, shield, and data-source lifecycle. Production startup and teardown code is unchanged.
- The focused onboarding test emits existing Lit development/update-scheduling warnings; it passes all 17 assertions and this slice does not alter frontend behavior.

## Round 2 review corrections

### Accepted findings and outcome

- Seal uv resolution from ambient inputs. The generator now runs exact `uv==0.11.31` through a strict `env -i` boundary, adds uv-supported `--no-config` and repository-compatible `--no-sources`, retains explicit PyPI, the sealed cutoff, global refresh, upgrade resolution, and `--prerelease explicit`, and rejects any other uv version before writing output.
- Add exact `uv==0.11.31` to `requirements-dev.in`, so the CI resolver binary is installed from the hash-locked development lock. The lock-check workflow verifies the executable version before regeneration.
- Make local verification fail before installation unless its interpreter is exactly Python `3.14.3`; install `requirements-dev.txt` with `pip --require-hashes` and run `pip check` before later checks.
- Update `README.md` and `TESTING.md` to create and verify an exact Python `3.14.3` environment, install with hashes, and run `pip check`.
- Make every executable workflow consumer of `requirements-dev.txt` use `python -m pip install --require-hashes` followed by `python -m pip check`; remove unpinned `pip install --upgrade pip` and the redundant unpinned Sonar `coverage` install.
- Add a required executable CI lock check to `dependency-check.yml`. It installs exact uv through the hash-locked development lock, verifies `uv 0.11.31`, and runs `./scripts/generate_requirements.sh --check`.
- Replace module-wide autouse MQTT and boiler serializer suppression with explicit fixture requests only in unit tests that intentionally enter setup/runtime paths without owning those workers. Dedicated real MQTT and serializer start/stop lifecycle tests remain enabled.

### Round 2 TDD RED evidence

- Policy contracts before implementation:
  - Command: `.venv-task1-fix/bin/pytest -q --tb=short tests/test_dependency_policy.py`.
  - Result: exit 1; `21 collected, 8 failed, 13 passed in 1.85s`.
  - Failures proved: four executable workflow consumers lacked hash verification and `pip check` and upgraded pip outside the lock; no workflow executed the canonical lock check; uv was not a direct exact lock input; hostile `UV_CONFIG_FILE` and `UV_CONSTRAINT` reached uv; uv `0.11.6` was accepted instead of exact `0.11.31`; local checks accepted Python `3.14.2`; local checks did not hash-install and validate the development lock.
- Real hostile uv inputs before implementation:
  - Commands: `UV_CONFIG_FILE="$PWD/.round2-hostile-uv.toml" UV_BIN="$PWD/.venv-task1-fix/bin/uv" ./scripts/generate_requirements.sh --check` and the equivalent command with `UV_CONSTRAINT="$PWD/.round2-hostile-constraint.txt"`.
  - Result: both exit 1; uv applied the hostile `aiohappyeyeballs==2.6.1` constraint and generated bytes differed from the committed lock.
  - Logs: `/tmp/oig-task1-r2-hostile-config-red.log`, `/tmp/oig-task1-r2-hostile-constraint-red.log`.
- Wrong resolver version before implementation:
  - Command: `UV_BIN=/opt/homebrew/bin/uv ./scripts/generate_requirements.sh --check` with system uv `0.11.6`.
  - Result: exit 0, proving the generator did not enforce its resolver version.
  - Log: `/tmp/oig-task1-r2-uv-version-red.log`.
- Narrow fixture regression before replacing autouse behavior:
  - Command: `.venv-task1-fix/bin/pytest -q --tb=short tests/test_init_setup_entry.py::test_async_setup_entry_success_cloud tests/test_boiler_services.py::test_apply_and_cancel_boiler_plan` after making both suppression fixtures non-autouse.
  - Result: both assertions passed but teardown produced two errors: a real Paho MQTT socket attempt and a leaked boiler serializer consumer task. This proved those individual tests require explicit lifecycle isolation.

### Round 2 GREEN evidence

- Policy contracts:
  - Command: `.venv-task1-fix/bin/pytest -q --tb=short tests/test_dependency_policy.py`.
  - Result: PASS; `21 passed in 1.93s`.
- Narrow fixtures and preserved real lifecycle coverage:
  - Command: `.venv-task1-fix/bin/pytest -q --tb=short tests/test_boiler_services.py tests/test_init_setup_entry.py`.
  - Result: PASS; `58 passed in 0.52s`; no socket or task-leak errors.
  - Command: `.venv-task1-fix/bin/pytest -q --tb=short tests/test_emitter.py tests/test_mqtt_publisher.py tests/test_boiler_task7a_actuator_serializer.py`.
  - Result: PASS; `54 passed in 0.80s`; explicit real MQTT and serializer lifecycle tests remain active.
- Pinned resolver and hostile environment sealing:
  - Command: `.venv-task1-fix/bin/uv --version`.
  - Result: `uv 0.11.31`.
  - Command: `UV_BIN=/opt/homebrew/bin/uv ./scripts/generate_requirements.sh --check` with system uv `0.11.6`.
  - Result: expected exit 1 before resolution: `Dependency generation requires uv 0.11.31; found 0.11.6.`
  - Commands: canonical `./scripts/generate_requirements.sh --check`, then the same check with hostile `UV_CONFIG_FILE`, then with hostile `UV_CONSTRAINT`, all using `UV_BIN=.venv-task1-fix/bin/uv`.
  - Result: PASS for all three commands. Every command performed two isolated generations (`144` runtime packages and `211` development packages); each pair was byte-identical and both committed locks matched. Temporary hostile files were removed before final verification.
  - Logs: `/tmp/oig-task1-r2-lock-check-green.log`, `/tmp/oig-task1-r2-hostile-config-green.log`, `/tmp/oig-task1-r2-hostile-constraint-green.log`.
- Fresh exact local install using the final CI dependency path:
  - Commands: `python3.14 -m venv .venv-task1-r2`; `.venv-task1-r2/bin/python -m pip install --require-hashes -r requirements-dev.txt`; `.venv-task1-r2/bin/python -m pip check`.
  - Result: PASS under Python `3.14.3`; `No broken requirements found.` This verifies hashes for top-level lock artifacts but does not claim hermetic PEP 517 build isolation.
  - Installed versions: `homeassistant==2026.8.1`; `pytest-homeassistant-custom-component==0.13.355`; `uv==0.11.31`; `pip==26.2.1`.
- Exact full Python CI suite from the fresh environment:
  - Command: `.venv-task1-r2/bin/pytest -v --tb=short --cov=custom_components/oig_cloud --cov-report=xml --cov-report=term-missing:skip-covered`.
  - Result: PASS; `4925 passed, 27 skipped, 10 warnings in 106.53s`; total coverage `91%`; no failures, errors, socket exceptions, or leaked-task exceptions.
  - Log: `/tmp/oig-task1-r2-pytest-full.log`.
- Full Flake8:
  - Command: `.venv-task1-r2/bin/python -m flake8 custom_components/oig_cloud tests --max-line-length=120`.
  - Result: PASS; exit 0, no findings.
- Full Mypy:
  - Command: `.venv-task1-r2/bin/mypy custom_components/oig_cloud --ignore-missing-imports --explicit-package-bases`.
  - Result: PASS; `Success: no issues found in 198 source files`.
- Frontend gates:
  - Commands from `custom_components/oig_cloud/www_v2`: `npm run lint -- --quiet`; `npm run typecheck`; `TZ=UTC npm run test:unit -- src/__tests__/onboarding-quicksave.test.ts`.
  - Result: PASS; ESLint and TypeScript exit 0; focused unit `17 passed`.
- Executable syntax and diff hygiene:
  - Commands: `bash -n scripts/generate_requirements.sh scripts/run_local_checks.sh`; parse all `.github/workflows/*.yml` with PyYAML; `git diff --check`.
  - Result: PASS; all exit 0 with no findings.

### PEP 517 finding deferred to Task 6

- A complete wheel-only Ubuntu 24.04 / Python `3.14.3` install cannot currently be proven from this development lock. Exact uv cross-target command: `.venv-task1-r2/bin/uv --no-config pip install --dry-run --python .venv-task1-r2/bin/python --python-platform x86_64-manylinux_2_39 --default-index https://pypi.org/simple --index-strategy first-index --only-binary :all: --require-hashes -r requirements-dev.txt`.
- Result: exit 1 solely because `bluetooth-data-tools==1.29.21` has no usable glibc 2.39 wheel. Its source distribution declares build requirements `setuptools>=77.0`, `Cython`, and `poetry-core>=2.0.0`; the current development lock contains setuptools but not Cython or poetry-core.
- Actual Ubuntu execution was unavailable in this checkout: `docker version` found the Darwin client but exited 1 because `/var/run/docker.sock` did not exist. No remote run or deployment was authorized.
- A weak `--no-build-isolation` workaround would permit incomplete or unverified toolchain state. The complete Ubuntu wheelhouse or hash-locked no-build-isolation toolchain, plus proof that no build dependency is fetched outside it, is explicitly tracked in the existing Task 6 checklist in `docs/superpowers/plans/2026-08-10-quality-gates-release.md`. No skipped or xfailed false-green policy was added.

### Round 2 changed files

- Resolver, inputs, and locks: `scripts/generate_requirements.sh`, `requirements-dev.in`, `requirements.txt`, `requirements-dev.txt`.
- Local and CI executable dependency gates: `scripts/run_local_checks.sh`, `.github/workflows/dependency-check.yml`, `.github/workflows/quality.yml`, `.github/workflows/sonarcloud.yml`, `.github/workflows/test.yml`.
- Setup documentation: `README.md`, `TESTING.md`.
- Executable policy and lifecycle regressions: `tests/test_dependency_policy.py`, `tests/test_boiler_services.py`, `tests/test_init_setup_entry.py`.
- Durable deferral evidence: `docs/superpowers/plans/2026-08-10-quality-gates-release.md` and this report.

### Round 2 residual risks

- CI now verifies hash-locked top-level artifacts. It does not yet prove hermetic PEP 517 build isolation on Ubuntu because the Linux-only source build described above needs a separately hash-locked build toolchain or prebuilt checked wheelhouse.
- The generator intentionally permits only explicitly requested prereleases. This remains necessary for the exact `opentelemetry-semantic-conventions==0.50b0` dependency of stable `opentelemetry-sdk==1.29.0`.
- The local checks script installs Task 6 security tools after validating the canonical development lock. Those tools remain outside this Task 1 lock and are not part of the hermeticity claim; Task 6 owns their pinning and blocking audit policy.
