# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
