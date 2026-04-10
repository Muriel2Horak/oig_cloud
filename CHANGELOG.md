# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.20] - 2026-04-10

### Fixed
- Service mode actions now accept canonical machine values while preserving legacy labels, keeping dashboard controls user-friendly without breaking existing service callers.
- Shield grid-delivery processing now keeps the required split order (`limited` mode first, numeric limit second), exposes structured step metadata, and avoids skipping the pending limit step prematurely.
- Dashboard V2 control-panel handling for grid delivery is now more robust: it resolves localized mode variants, shows the active numeric export limit, parses structured shield queue payloads, and renders acknowledgement emphasis correctly in confirmation dialogs.
- Adaptive consumption, adaptive load-profile statistics, and interval statistics history lookups now run through Home Assistant's recorder executor, removing the remaining direct database-access warning paths.
- Security workflow Safety checks now evaluate the shipped runtime requirements instead of the whole CI environment, while documenting the Home Assistant-pinned protobuf exception in the local Safety policy.

## [2.3.19] - 2026-04-09

### Fixed
- Battery forecast planning now accepts usable partial adaptive load-profile payloads instead of collapsing to the legacy fallback path while profile warm-up is still in progress.
- Forecast updates now rerun immediately when adaptive profiles arrive mid-bucket, so planned consumption and charging decisions no longer stay stuck on the stale flat fallback line until the next 15-minute refresh.
- Planner load resolution now falls back to `load_avg` only when the selected adaptive profile is missing or unusable, with targeted regression coverage for partial profiles, same-bucket retries, and profile-update refresh triggers.

## [2.3.18] - 2026-04-08

### Fixed
- Battery planner now preserves morning battery headroom on the live runtime path so the box avoids unnecessary pre-solar charging to 100% before daytime production.
- Planner observability now exposes truthful decision traces for forecast updates and grid charging sensors, making planner decisions inspectable in Home Assistant.
- Runtime startup regressions from the clean-branch migration were resolved, including coordinator jitter compatibility, local snapshot publish behavior, telemetry log throttling, and startup/sensor alignment with `main`.
- Dashboard V2 live refresh wiring now updates derived data reliably, while SonarCloud CI now installs dashboard dependencies and classifies frontend test files correctly for coverage analysis.

## [2.3.16] - 2026-04-05

### Fixed
- Legacy V1 dashboard API calls now prefer Home Assistant's authenticated `hass.callApi` path and no longer send unauthenticated fallback requests to `/api/oig_cloud/...`, reducing invalid-auth ban noise while preserving valid embedded dashboard flows.
- Adaptive load profile statistics and battery efficiency fallback lookups now use Home Assistant recorder/statistics helper APIs via the recorder executor instead of direct database/session access, removing the remaining database-access warning paths.
- Battery efficiency fallback now fills missing battery start/end bounds from recorder statistics even when charge/discharge history is already available, keeping monthly efficiency calculations consistent.

## [2.3.15] - 2026-04-04

### Fixed
- Startup now skips the custom coordinator jitter on the first refresh, including the cached-startup path, so initial coordinator updates no longer pay a random startup delay.
- Sensor setup now keeps only the essential immediate groups in the blocking startup path while deferring computed sensors, reducing time to initial entity registration.
- Deferred computed sensor registration now retries briefly when coordinator data is not ready yet, preventing those sensors from being skipped permanently on slow startup.

## [2.3.14] - 2026-04-04

### Fixed
- Boiler coordinator refresh now runs in deferred startup without blocking config-entry setup, while boiler refresh failures no longer abort the rest of background startup completion.
- Boiler energy-needed sensor metadata no longer triggers Home Assistant energy state-class warnings during runtime.
- Auto-switch watchdog corrections are now rate-limited, reducing repeated warning spam when the watchdog keeps the box aligned with the planned mode.
- Expected telemetry delivery failures (HTTP 400/401/403) are now rate-limited and downgraded from warning spam while preserving diagnostics for unexpected failures.

## [2.3.13] - 2026-04-04

### Fixed
- Dashboard panel registration no longer blocks config entry bootstrap, preventing setup cancellation during Home Assistant startup on fresh installs.
- Battery balancing startup now treats missing forecast sensor wiring as a transient deferred-registration race, avoiding false warning logs during initial setup.
- Recorder history queries for battery forecast interval data now run through the recorder executor, eliminating repeated Home Assistant database access warnings.
- Options-flow wizard progress logging was reduced from warning-level noise to normal debug/info output.

## [2.3.12] - 2026-04-03

### Fixed
- Local telemetry updates now coalesce coordinator snapshot publishes, preventing websocket backlog storms and HA resource spikes in local/proxy mode.
- OIG Cloud startup now hydrates coordinator cache first and defers non-critical sensor registration/background setup, reducing warm startup time to the ~5 second target range.
- Battery forecast setup no longer waits for adaptive load profiles during startup, and related precompute/statistics restore work now runs in the background so Home Assistant setup is not blocked.
- Existing OIG sensor and switch entities now migrate to explicit short registry names during setup, preventing newer Home Assistant versions from prepending device names to legacy entity labels.

## [2.3.11] - 2026-04-01

## [2.3.10] - 2026-03-17

### Fixed
- Battery health sensor now reads actual battery capacity from `installed_battery_capacity_kwh` sensor instead of hardcoded 15.3 kWh value
- SoH calculations now correctly reflect the real battery capacity when it differs from the default

## [2.3.9] - 2026-03-17

### Fixed
- `extended_grid_consumption` sensor changed from `total_increasing` to `total` state class to prevent warnings when API reports corrected/reset values
- Battery health sensor SoH rejection messages changed from WARNING to DEBUG level (these are expected measurement errors, not system issues)

## [2.3.8] - 2026-03-17

### Fixed
- `extended_fve_current_1` and `extended_fve_current_2` sensors now handle None values gracefully instead of raising TypeError

## [2.3.7] - 2026-03-16

### Changed
- Battery planner now uses only Home I and Home UPS modes (removed Home III from planned output)
- All fallback modes changed from Home III to Home I for consistency

### Added
- Dashboard control panel now includes Home 5 and Home 6 mode buttons for boxes that support these modes
- User-friendly error message when attempting to switch to Home 5/6 on unsupported boxes

## [2.3.6] - 2026-03-12

### Added
- Economic battery planner: optimizes battery charging/discharging based on spot prices, PV forecast, and home consumption profile.
- New sensor exposing the planner's economic score and recommended mode schedule.
- Integration tests and 9,000+ historical scenario dataset for planner validation.
- Documentation: `docs/user/ECONOMIC_PLANNER.md`.

## [2.3.5] - 2026-03-11

### Fixed
- Added full reauthentication flow (`reauth` + `reauth_confirm`) so failed auth can be recovered directly from UI without deleting the integration.
- Mapped `OigCloudAuthError` to `InvalidAuth` in config validation to prevent unexpected exception crashes during reauth.
- Standardized OIG Cloud base URL to `https://portal.oigpower.cz/` (no fallback) and aligned API headers/endpoints with the new host.
- Added regression tests for reauth handling, credential persistence paths, and portal-only authentication behavior.


## [2.3.4] - 2026-03-11

### Fixed
- Migrated remaining OIG Cloud host references from `www.oigpower.cz` to `portal.oigpower.cz` in runtime notification wiring and service documentation.
- Updated session-manager fallback base URL logging to the portal host for consistent diagnostics.
- This release also keeps hassfest-compatible wizard text (no direct URL literals in translation descriptions).

## [2.3.2] - 2026-03-02

### Fixed
- `battery_efficiency` sensor crash (`AttributeError: 'dict' object has no attribute 'state'`)
  - `_history_value()` now handles HA 2026.x compressed state format (dict with `s` key)
- Shipped built `www_v2/dist/` in repository so HACS installations receive the dashboard frontend
- Added GitHub Actions workflow to auto-rebuild `www_v2/dist` on every push to main

## [2.2.0] - 2026-01-22

### Added
- Test coverage increased to 99% (3066 tests, 35 missed lines from 23732 statements)
- New test modules for uncovered code paths:
  - `test_remaining_gap_coverage.py` - hybrid planning edge cases
  - `test_config_and_statistics_gaps.py` - config steps & statistics sensor branches
  - `test_coordinator_and_ote_api_gaps.py` - OTE API SOAP body and cache handling
  - `test_statistics_sensor_stats_store_coverage.py` - statistics store initialization and saving
  - `test_forecast_update_round_trip_coverage.py` - round-trip efficiency validation
  - `test_config_steps_coverage_extra.py` - wizard boiler validation (hysteresis, hold hours)
  - `test_init_coverage_gaps.py` - shield monitoring and stats flush
  - `test_ote_api_exception_coverage.py` - cache file corruption handling
  - `test_coordinator_throttle_coverage.py` - battery forecast throttling logic
  - `test_hybrid_planning_mode_guard_coverage.py` - mode guard override branches
  - `test_config_steps_wizard_boiler_coverage.py` - wizard boiler form handling
  - `test_tiny_remaining_coverage.py` - sensor type extraction and timestamp parsing
  - `test_boiler_api_views_helper_branches.py` - API view helper functions
  - `test_forecast_update_round_trip_coverage.py` - efficiency edge cases
- CI/CD workflows:
  - `security.yml` - CodeQL, Bandit, Safety security scans
  - `sonarcloud.yml` - SonarCloud quality analysis
  - `maintainability.yml` - Radon complexity, Vulture dead code detection
  - `dependency-check.yml` - Dependabot, pip-audit dependency monitoring
  - `secret-scanning.yml` - Trivy, Gitleaks, Snyk secret scanning
  - `pre-commit.yml` - automated linting before commits
- Quality configurations:
  - `.pylintrc` - Pylint static analysis settings
  - `.editorconfig` - editor configuration for consistent formatting
  - `.prettierrc` - Prettier frontend formatting settings
  - `dependabot-config.yml` - Dependabot security and license policy
  - `CI_CD.md` - comprehensive CI/CD documentation

### Changed
- `__init__.py`: improved error handling for statistics store flush
- `core/coordinator.py`: better spot price update scheduling and hourly fallback
- `api/ote_api.py`: improved cache file corruption handling
- `entities/statistics_sensor.py`: robust statistics store integration
- `battery_forecast/strategy/hybrid_planning.py`: optimized mode guard logic
- `config/steps.py`: validation improvements for wizard battery forms
- `boiler/api_views.py`: helper functions refactored and tested
- `battery_forecast/planning/forecast_update.py`: round-trip efficiency validation added

### Fixed
- Fixed several code defects found during coverage push:
  - `_write_cooldown` typo in statistics storage
  - Broken regex in shared logging module
  - Wrong cache attribute access in coordinator
  - User retrieval fix in HA REST API
  - Multiple type annotation issues corrected

### Security
- Added comprehensive security scanning pipeline:
  - CodeQL analysis for advanced vulnerability detection
  - Bandit for Python-specific security issues
  - Safety for dependency vulnerability monitoring
  - Trivy for container-based scanning
  - Gitleaks for secret detection
  - Snyk for SAST (Static Application Security Testing)
- Dependabot integration for automated security updates
- pip-audit for Python package security auditing

### Quality
- SonarCloud integration for code quality metrics
- Radon complexity analysis for maintainability tracking
- Vulture dead code detection
- Pre-commit hooks for automated quality checks
- Pylint configuration with Python 3.12 compatibility
- Mypy type checking enabled
- flake8 linting with 120-char line limit

## [2.1.7] - 2026-01-16
