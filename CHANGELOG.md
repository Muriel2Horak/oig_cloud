# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.1] - 2026-08-13

Maintenance release focused on upgrade safety, solar-forecast reliability, authenticated
dashboard requests, and deterministic release quality. Full Czech release notes:
`RELEASE_NOTES_v2.4.1.md`.

### Added
- Hourly AI evaluation can publish a value-gated diagnostic report and dashboard status without
  changing device control decisions.
- Solar configuration now supports an explicit provider contract, private credential storage,
  legacy-value adoption, and truthful test/save transactions.

### Changed
- Solar azimuth uses the compass convention (`0/360` north, `90` east, `180` south, `270` west)
  and is converted only at the Forecast.Solar provider boundary.
- Optimized solar refreshes run at local wall-clock `06:00`, `12:00`, and `16:00`; daily mode
  runs at `06:00`. Retry recovery is durable across restart and cancellation.
- Dashboard API requests delegate authentication and token refresh to Home Assistant instead of
  reading or constructing bearer tokens in application code.
- CI now enforces Pylint `E0/F0`, Mypy, Flake8, frontend lint/typecheck, deterministic frontend
  builds, pre-commit idempotence, and coverage above 80% for both Python and frontend suites.
- Removed the unused `litellm` dependency and its Proxy/SSO server dependency tree. Runtime pins
  for `protobuf` and `urllib3`, plus the development `black` pin, were upgraded to their current
  security-fix versions and both hash-locked files were regenerated.
- Local CI now targets the actual V2 frontend and Home Assistant 2026.8.1 Hassfest source without
  traversing task virtual environments or mutating installed frontend dependencies.

### Fixed
- Solar candidates can no longer overwrite newer forecasts or relabel stale cache provenance;
  accepted forecasts, retry metadata, unload, and Store writes share one ordered transaction.
- Solar refresh survives startup at arbitrary minutes, daylight-saving transitions, repeated
  cancellation, restart, provider throttling, and Store failures without duplicate publication
  or secret-bearing diagnostics.
- Forecast string sensors publish one synchronized snapshot and manual refresh reports failure
  truthfully when throttled or rejected.
- `dc_in_fv_ad` daily energy statistics preserve existing Recorder history during the transition
  from `total_increasing` to daily `total`, and arm reset markers only after a proven rollover.
- Daily-energy restore handles missing midnight samples, restart gaps, low-yield days, stale
  markers, counter rollback, and unavailable values without double counting.
- Empty boiler schedule storage and expected OTE tomorrow-data retries no longer create false
  startup warnings; asynchronous planner and boiler tasks are owned and reconciled on unload.
- Registry fallback now resolves numeric OIG box IDs from real Home Assistant entity IDs without
  patching Python's global regular-expression compiler during tests.
- AI evaluation now bounds provider response bytes and text, owns all delayed and active tasks,
  and awaits cancellation before config-entry unload completes.
- Battery planning revalidates the live safety floor after its final awaited diagnostic step;
  fired forecast retries are tracked and reconciled during entity teardown.
- Daily Recorder reset markers retain the last proven cycle until a lower counter value proves
  the real rollover, preventing a stale post-midnight sample from temporarily doubling the sum.
- Groq-specific request fields now require the exact canonical HTTPS host, and ČHMÚ diagnostics
  identify the coordinate source without logging private latitude or longitude values.
- Home Assistant 2026.8 startup diagnostics, deferred annotations, manifest reads, and recorder
  access paths are compatible with the supported runtime.
- Battery forecast load profiles now resolve both box-prefixed and canonical
  `sensor.load_avg_*` entity IDs, restoring the ten configured household load buckets instead of
  silently falling back to a fixed load.
- Battery health analysis now persists successful scans even when no new clean charging cycle is
  found and skips a duplicate full recorder scan for 20 hours after Home Assistant restarts.
- The boiler daily Wh counter now advertises the Home Assistant energy device class, preserving
  valid utility-meter metadata, and an expected empty forecast during startup is logged as debug.

### Security
- Browser requests use Home Assistant's authenticated transport, strip caller authorization
  headers, validate integration-relative paths, and redact provider or exception details.
- Solar secrets stay in private Store records and proof-bound activation prevents replay or
  cross-entry credential reuse.
- An exhaustive sealed review covered all 124 source-like release-diff files, validated seven
  candidates, and identified five release-blocking findings; all five are fixed above with
  focused regression tests before publication.
- The immutable post-fix review covered all eight changed production files with complete coverage,
  zero findings, and no deferred security work.
- Runtime and development `pip-audit` report zero unaccepted findings. Three exact
  `cryptography==48.0.1` advisories remain as a visible, version-bound accepted risk because Home
  Assistant 2026.8.1 pins that version exactly. The exception expires automatically on 2026-09-12
  and CI fails closed after expiry or any package-version drift.
- Removed the unused LiteLLM dependency and its entire Proxy/SSO server attack surface. OIG uses
  its own outbound client and no longer needs an exception for LiteLLM server-only findings.

## [2.4.0] - 2026-07-31

Major user-facing release. Full Czech release notes: `RELEASE_NOTES_v2.4.0.md`.

### Added
- **V2 dashboard** as the default view — four tabs: Toky (flows), Ceny (prices),
  Bojler (boiler), Nastavení (settings).
- **Boiler tab rework** — hero energy-flow (source-coloured animated connectors →
  tank/heater → draws), rolling 24h SoC/temperature chart with FVE overlay,
  Plán & realita tile (Včera/Dnes/Zítra), Energie dnes, weekly water draw-map (P90).
- **Onboarding wizard v2** in the dashboard (Nastavení), re-runnable: Moduly → AI →
  Solár → Distribuce → Nákup → Prodej → Baterie → Bojler → Připojení → Shrnutí.
- **ČHMÚ weather warnings** module (local + national, 5 severities, header badge).
- **Telemetry source** choice: OIG Cloud or local OIG Proxy (Nastavení → Připojení).
- **ServiceShield™** configurable timeout (5–60 min) + external-change monitoring.
- Multi-device support via optional `device_id` service parameter.
- Hybrid/Autonomy preview planner + optional AI assistant (anonymous numeric inputs only).

### Fixed
- **OIG portal write contract (2026-07-31)** — the portal tightened its write API:
  `value` must be a JSON int, writes require the `X-Requested-With: XMLHttpRequest`
  header, and `ToGrid.Toggle.php` requires `p_max_feed_grid`. Boiler-mode,
  inverter-mode and grid-delivery writes work again.
- Boiler-tab visual fidelity (comma decimals, compact draw-map, hero flow) matched to
  the approved design.

## [2.3.36] - 2026-06-18

Large feature release: a from-scratch Boiler V2 dashboard and planner, a redesigned
Flow dashboard, a per-module Settings tab, planner improvements, plus a full
code-review pass fixing every confirmed high- and medium-severity finding.

### Added
- **Boiler V2 dashboard** — animated 3D tank model (heating element, alternative source, circulation flow), a weekly draw-map (P90 heatmap + day profiles), a combined plan/SoC chart, and a human-friendly water readout (usable ~38 °C litres + shower/bath equivalents with draw-type symbols). The tank is modelled as a "battery": ready hot water as state-of-charge.
- **Boiler planner V3** — demand-driven multi-window targets with spot-price arbitrage, Home 5 maneuver, pre-peak circulation, anti-legionella, and an opt-in **thermal arbitrage** mode that over-heats in cheap slots up to a configurable max temperature while reserving FVE-overflow headroom.
- **Boiler configuration** — full setup in the Home Assistant config/options wizard *and* in the dashboard's ⚙️ Nastavení tab, bridged over REST.
- **Flow dashboard redesign** — edge-gauge nodes (battery SoC perimeter, home self-sufficiency, grid, solar, inverter), per-phase colouring per ČSN, a záloha/nezáloha consumption split, and financial balance shown in the node aura.
- **Non-backup (nezáloha) sensors** — per-phase and total grid load plus today/month/year consumption energy.
- **Settings tab** — per-module wizards over REST, with a sectioned options menu and trustworthy persistence; real weather forecast in the header with a combined weather modal.

### Changed
- The boiler tank now renders as always-full with a thermal-stratification gradient driven by the **live** top/bottom temperatures, and the "ready" waterline follows the computed ready-fraction (was a fixed gradient).
- Dashboard V2 is now the default panel; the legacy V1 dashboard and its dead infrastructure were removed.
- Battery planner: displacement-based dynamic reserve, per-day expensive-price percentile, consistent AC round-trip efficiency, same-day solar reality-correction, and floor-defense that protects only the 20 % hardware minimum.

### Fixed
- **Lifecycle/leaks** — the main coordinator now cancels its spot-price/hourly timers on shutdown and both coordinators shut down on unload; battery-forecast sensor time-change/dispatcher listeners and the Flow canvas ResizeObserver are now torn down; both `sensor` and `switch` platforms are unloaded.
- **Storage/data integrity** — all read-modify-write sequences on the plans Store are serialized behind a lock; the profiler buckets by local time; a failed/empty forecast retries on the next tick; backfilled actual-interval costs are persisted; the deprecated blocking persistent-notification call was replaced with the async API.
- **Boiler actuator serializer** is now actually started in production, so override/config state is restored and the consumer loop runs.
- **Security** — `module_config` and plan-mutation REST endpoints are admin-guarded fail-closed; the box-id extraction regex was fixed.
- **Config flow** — cross-box validation no longer false-flags non-OIG temperature sensors; the modules section routes newly-enabled modules through their config before the summary.
- **Boiler** — phantom "during-heating" draws are suppressed (require a real top-temp fall), honest per-source cost/savings accounting, and the auto-switch watchdog can no longer leave the box stuck off-plan.

## [2.3.35] - 2026-04-22

### Changed
- Cloud telemetry is now MQTT-only, always enabled, and fixed to `telemetry.muriel-cz.cz` on the canonical `oig/cloud-telemetry/<device_id>` topic.
- Legacy telemetry toggles and MQTT host/prefix options were removed from the config/options flow; stored legacy telemetry settings are now ignored.

### Fixed
- SSH deploys now copy the full integration tree instead of truncating after the first file, preventing stale mixed-version Home Assistant deployments and startup import failures.
- The OIG Cloud Events Grafana dashboard now reads cloud event counts from valid telemetry fields, renders zero baselines for missing event types, and shows warning/error event tables from Influx-backed cloud telemetry.
- Local verification tooling now matches the current Home Assistant stack closely enough to keep the end-to-end local CI gate green while exercising the telemetry release path.

## [2.3.34] - 2026-04-20

### Fixed
- Hybrid battery planning no longer suppresses grid charging just because later daytime solar can eventually refill the battery; hold-limit protection now still tops the battery up before delayed solar arrives.
- `_force_target_before_index()` now evaluates reachability only within the enforced window, preventing future solar outside that window from disabling the low-SOC recovery path.
- Added regression coverage for the delayed-solar / low-SOC hold scenario so the planner cannot leave the battery sitting near `hw_min` for too long without scheduling grid charge.

## [2.3.33] - 2026-04-19

### Added
- Dashboard V2 now exposes dedicated Home 5 and Home 6 supplementary controls with confirmation flow, live-state rendering, and targeted regression coverage.
- `sensor.oig_{box_id}_box_mode_extended` now provides Home Assistant state translations so supplementary modes render as readable labels in entity details and history.

### Fixed
- Shield controller queue classification now treats supplementary PRM2 app toggles independently from main box-mode changes, preventing false pending-state coupling.
- Queue rendering now translates supplementary `prm2_app` values correctly and ignores the `(nyní: ...)` suffix when formatting change labels.
- Supplementary state refresh now reads `box_mode_extended` consistently, keeping main mode buttons stable while supplementary toggles are pending.

## [2.3.30] - 2026-04-16

### Changed
- Dashboard V2: removed inline limit-value input from the grid-delivery control panel. The limit is now displayed and edited exclusively through the dialog opened by the "S omezením" button.

## [2.3.29] - 2026-04-16

### Fixed
- Dashboard V2 now keeps the inline grid-delivery limit visible in the control panel while making the field read-only, so limit changes can only be made through the existing limited-mode dialog flow.

## [2.3.28] - 2026-04-16

### Fixed
- `sensor.oig_{box_id}_invertor_prms_to_grid` now correctly reflects grid-delivery state in `local_only` mode for inverters that expose `box_prms.crcte` instead of `box_prms.crct`.
- Added `box_prms_crcte` sensor type so the local-mapper suffix table includes the `crcte` key and payload updates are applied correctly.
- `_get_local_grid_mode()` now reads both `box_prms_crcte` and `box_prms_crct` and prefers `crcte` when available, matching the resolver's preference order.
- `_on_any_state_change()` no longer silently drops legacy proxy entity events (format `{domain}.{device_id}_tbl_…`) — it now delegates all filtering to `normalize_proxy_entity_id()`, which accepts both the current `oig_local_` prefix and the legacy format.
- `box_prms_crcte` entity now shows translated On/Off labels instead of raw `0`/`1`.

## [2.3.27] - 2026-04-16

### Fixed
- Local proxy entity mapping now supports the legacy format without `oig_local_` prefix (e.g. `switch.2206237016_tbl_invertor_prms_to_grid_cfg`), fixing a regression for users with older proxy versions.
- `normalize_proxy_entity_id`, `iter_local_entities`, `_get_local_entity_id_for_config`, and `_infer_box_id_from_local_entities` all recognize both `oig_local_` and legacy no-prefix formats.

## [2.3.26] - 2026-04-16

### Changed
- Single normalization boundary (`normalize_proxy_entity_id`) in `core/local_mapper.py` for all local proxy entity lookups.
- Support for all 5 audited proxy domains: `sensor`, `binary_sensor`, `switch`, `number`, `select`.
- `_cfg` suffix fallback for control entities across all domains.
- Alphanumeric device ID support (`dev01`) in local mapper normalization.
- Centralized `iter_local_entities` reused in `data_source.py` and `telemetry_store.py`.
- `data_sensor.py` local helper now routes through the normalization boundary.
- Updated docs: `docs/user/DATA_SOURCE.md`.

### Fixed
- Cloud-fallback guard fix in `_should_block_local_snapshot_publish`.

### Removed
- Dead code removal: `_LOCAL_ENTITY_RE`, `_is_valid_node_pair`, `_poke_coordinator`.

### Added
- Full regression test suite: 3377 passed, 27 skipped.

## [2.3.25] - 2026-04-15

### Changed
- Dashboard V2 control-panel grid-delivery selector no longer redundantly displays the active export limit in its label; the limit value remains visible in the inverter flow card.
- Clicking the already-active "S omezením" button in the control panel now opens a streamlined limit-only dialog, allowing users to edit the export limit without re-sending the mode change.

## [2.3.24] - 2026-04-14

### Fixed
- Dashboard V2 inverter card now clearly distinguishes the current live grid-delivery mode from a separately configured export limit, so an "off" state with a configured limit can no longer be misread as active limited-mode export.
- Inverter grid-delivery rendering now reuses the same explicit current-vs-pending semantics already used by the grid card, keeping control panel and inverter card semantics consistent.

## [2.3.23] - 2026-04-13

### Fixed
- Grid-delivery live state is now resolved canonically across backend sensors, shield validation, queue completion, and Dashboard V2, so unknown or unavailable telemetry no longer falls back to a misleading current off state.
- Dashboard V2 now shares one grid-delivery state model for current versus pending rendering, keeps suffix-aware entity lookup aligned with backend validation, and preserves accurate button state during shield-driven transitions.
- Added backend and frontend regression coverage for Local proxy plus King edge cases, suffixed entities, telemetry lag, malformed or unavailable values, and pending overlays in flow and control-panel views.

## [2.3.22] - 2026-04-11

### Fixed
- Shield `setGridDelivery` now correctly avoids redundant `mode: limited` writes when the inverter is already in limited mode or a limited-mode step is already pending, so limit-only updates no longer re-enqueue the same mode.
- Dashboard V2 control panel now reads grid-delivery sensors via `findSensorId()` instead of `getSensorId()`, fixing the missing/off state display for devices that expose suffixed entity IDs (e.g. `_2`).
- `adaptive_load_profiles_sensor.py` now narrows `self._hass` before passing it to recorder executor jobs, resolving a mypy type error without suppressions.

## [2.3.21] - 2026-04-10

### Fixed
- Grid-delivery updates in Dashboard V2 now avoid redundant `limited` mode writes when the inverter is already limited or a limited-mode step is already pending, so limit-only changes no longer resend the same mode before applying the new export limit.
- Confirmation dialogs now render trusted acknowledgement markup correctly in the shadow DOM, fixing the visible `<strong>` tag text that still leaked into the popup.
- Grid-delivery buttons now keep the limited state visually active during shield-driven transitions, so the control panel no longer shows disabled exports while limited export remains the effective current state.

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
