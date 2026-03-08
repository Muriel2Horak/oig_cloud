# Economic Battery Planner - Learnings & Conventions

## Project Structure
- Worktree: `/Users/martinhorak/Downloads/oig_cloud-worktrees/economic-battery-planner-final`
- Battery forecast module: `custom_components/oig_cloud/battery_forecast/`
- Tests: `tests/`

## Key Files to Reference
- Existing planner code in `battery_forecast/` directory
- Physics calculations in `physics.py`
- Services in `services/`

## Conventions
- Use dataclasses for type definitions
- Follow existing code patterns in the integration
- All parameters must be dynamic (from sensors/config flow)
- No hardcoded values allowed
- Test coverage required for all critical paths

## Data Sources (from plan)
- JSON storage: `/config/.storage/oig_cloud/battery_forecast/`
- MySQL: Home Assistant database
- SSH access: `ssh ha`

## Battery Physics
- Charge rate: 2.8 kW default
- Round-trip efficiency: ~88% (0.882 discharge factor)
- HW minimum: from sensor.batt_bat_min
- Capacity: from sensor.installed_battery_capacity_kwh

## Modes
- 0 = HOME_I (normal)
- 2 = HOME_III (FVE priority)
- 3 = HOME_UPS (charging from grid)

## 2026-03-06 - Environment Discovery (Task 0.1)
- Home Assistant `.storage` uses flat keys like `oig_cloud.*` files, not nested `/config/.storage/oig_cloud/battery_forecast/` directory.
- Useful candidate artifacts for forecast/planner data discovery are `oig_cloud.battery_plans_*`, `oig_cloud.precomputed_data_*`, and `oig_cloud_daily_plans`.
- DB shell access likely requires integration-specific credentials/flags; plain `homeassistant` user query from CLI currently fails.
- Created local extraction scaffold at `tests/data/historical_scenarios/json_storage` and `tests/data/historical_scenarios/mysql_exports`.


## 2026-03-06 - Synthetic Historical Scenarios (Task 0.2)
- Created `tests/data/historical_scenarios.json` with 30 synthetic days (`2025-03-01` .. `2025-03-30`) matching planner schema: `id`, 4-category vector, `data` (`soc_start`, `solar`, `load`, `prices`), and `expected` outcome text.
- Each scenario contains exactly 96 quarter-hour intervals with realistic daily shapes:
  - Solar: zero at night + bell curve around noon (weather-scaled for `slunečný` / `polojasný` / `zatažený`).
  - Load: household morning/evening peaks; `impulzivní` includes TUV-like spikes above 3 kWh/interval.
  - Prices: low-night / high-day profile with category constraints for `levný`, `drahý`, `rozdílný`.
- Enforced category thresholds per scenario with validation:
  - FVE: `slunečný` (`solar > load + 3`), `zatažený` (`solar < load - 2`), `polojasný` in-between.
  - Cena: `levný` (`avg < 2.50`), `drahý` (`max > 10`), `rozdílný` (`avg >= 2.5` and `max <= 10`).
  - Spotřeba: `nízká` (`<15 kWh`), `vysoká` (`>20 kWh`), `impulzivní` (`peak >3 kWh`).
  - SOC: `nabitý` (>70%), `hladový` (30-50%), `kritický` (< planning minimum 33% of 10.24 kWh).
- Validation note: targeted `pytest` invocation fails in this local shell because `homeassistant` package is unavailable (`ModuleNotFoundError` during test collection), so dataset integrity was verified via direct JSON+threshold checks instead.

## 2026-03-06 - Economic Planner Types (Task 2.1)
- Added `custom_components/oig_cloud/battery_forecast/economic_planner_types.py` with dataclasses: `PlannerInputs`, `SimulatedState`, `CriticalMoment`, `Decision`, `PlannerResult`.
- `PlannerInputs` validates `planning_min_kwh >= hw_min_kwh` in `__post_init__` and also validates aligned forecast lengths against `intervals`.
- Derived values are exposed via properties (`planning_min_kwh`, `charge_rate_per_interval`) and interval charge uses shared `INTERVAL_MINUTES` from `battery_forecast/types.py` to avoid hardcoded timing constants.
- Type compatibility kept explicit with `List`, `Optional`, and `Tuple` annotations plus `IntervalData = Dict[str, Any]` alias for dynamic interval payloads.

## 2026-03-06 - HOME I Detailed Simulation (Task 2.2)
- Added `custom_components/oig_cloud/battery_forecast/economic_planner.py` with `simulate_home_i_detailed(inputs)` returning one `SimulatedState` per interval.
- HOME I flow implemented as: solar covers load first; surplus charges battery with 0.95 charge efficiency and remaining surplus exports to grid.
- Deficit flow implemented as: battery discharges only above `hw_min_kwh`; load-side battery coverage is limited by `DEFAULT_EFFICIENCY` (0.882), remainder imports from grid.
- SOC is clamped to `[hw_min_kwh, max_capacity_kwh]` and interval cost is `grid_import_kwh * price`.
- Added `DEFAULT_CHARGE_EFFICIENCY = 0.95` to `battery_forecast/types.py` so HOME I simulation imports both charge/discharge efficiency constants from shared type constants (no literal efficiency values in the simulator).

## 2026-03-06 - Critical Moments Detection (Task 2.3)
- Added `find_critical_moments(states, inputs)` to `custom_components/oig_cloud/battery_forecast/economic_planner.py`.
- Detection condition is strict (`state.soc_kwh < inputs.planning_min_kwh`), so values exactly on planning minimum are not flagged.
- For each critical interval, planner computes `deficit_kwh`, `intervals_needed = ceil(deficit / charge_rate_per_interval)`, and `must_start_charging = interval - intervals_needed` and returns `CriticalMoment(type="PLANNING_MIN", ...)` entries.


## 2026-03-06 - Unit Tests for Economic Planner (Task 2.4)
- Added `tests/test_economic_planner.py` covering `simulate_home_i_detailed` and `find_critical_moments` with focused HOME I scenarios.
- TUV heating spike scenario uses `current_soc_kwh=3.07` with a late high-load interval and verifies SOC reaches HW floor (not below, due simulator clamp) and falls below planning minimum.
- SOC boundary coverage includes `nabitý` (clamp to max capacity), `hladový` (stable with no load), and `kritický` (clamp to HW minimum).
- Edge-case coverage includes zero-solar/zero-load steady state and full battery with surplus solar exporting to grid.
- Critical-moment tests validate interval detection for `soc_kwh < planning_min_kwh`, computed deficits/timing, and error path when charge rate per interval is zero.

## 2026-03-06 - Cost of Using Battery Strategy (Task 3.1)
- Added `calculate_cost_use_battery(moment, inputs)` to `custom_components/oig_cloud/battery_forecast/economic_planner.py`.
- Strategy starts at `moment.interval`, applies HOME I energy flow without any explicit grid charging, and sums only `grid_import_kwh * price` to total CZK cost.
- Initial SOC uses `moment.soc_kwh` (fallback to `inputs.current_soc_kwh`) and is clamped to `[hw_min_kwh, max_capacity_kwh]` to stay physically valid.
- Edge case `moment.interval >= len(inputs.intervals)` returns `0.0` immediately.

## 2026-03-06 - Cheapest Grid Charge Cost (Task 3.2)
- Added calculate_cost_charge_cheapest(start_idx, end_idx, deficit, inputs) to custom_components/oig_cloud/battery_forecast/economic_planner.py returning (total_cost, charge_intervals).
- Candidate charging intervals are selected from [start_idx, end_idx) (bounded to valid interval range) and sorted by ascending inputs.prices[i] to prioritize cheapest slots first.
- Charging per selected interval is limited by inputs.charge_rate_per_interval; required grid input is computed as remaining_deficit / DEFAULT_EFFICIENCY so effective delivered energy after losses closes the deficit correctly.
- Cost accumulation uses grid input energy (charged_energy * price) and delivered energy reduces remaining deficit as charged_energy * DEFAULT_EFFICIENCY (0.882), keeping efficiency handling consistent with existing planner constants.

## 2026-03-06 - Wait for Solar Strategy Cost (Task 3.3)
- Added `calculate_cost_wait_for_solar(moment, inputs)` to `custom_components/oig_cloud/battery_forecast/economic_planner.py`.
- Solar start detection is strict (`inputs.solar_forecast[i] > inputs.load_forecast[i]`) from `moment.interval`; when no such interval exists, function returns `float("inf")`.
- Waiting-period cost simulation reuses HOME I physics between `moment.interval` and `solar_start` (exclusive): solar first, battery discharge above HW minimum, and grid import for residual deficit.
- Cost output is total CZK from waiting period only (`grid_import_kwh * price` per interval), with initial SOC from `moment.soc_kwh` fallback to `inputs.current_soc_kwh` and bounded to physical limits.

## 2026-03-06 - Economic Decision Selection (Task 3.4)
- Added `make_economic_decisions(moments, inputs)` to `custom_components/oig_cloud/battery_forecast/economic_planner.py` returning `List[Decision]`.
- For each critical moment, planner now evaluates all three strategies: `USE_BATTERY`, `CHARGE_CHEAPEST`, `WAIT_FOR_SOLAR` and keeps `charge_intervals` only for the charging strategy.
- Decision logic filters non-finite costs before selecting minimum (important because `WAIT_FOR_SOLAR` can return `float("inf")`), then picks the cheapest viable strategy.
- Emergency fallback added for edge cases with no finite strategy: returns `Decision(strategy="USE_BATTERY", cost=inf, reason="EMERGENCY_NO_FINITE_STRATEGY")` while preserving alternatives for debugging.

## 2026-03-06 - Final Plan Generation (Task 4.1)
- Added `generate_plan(decisions, inputs)` to `custom_components/oig_cloud/battery_forecast/economic_planner.py` returning `PlannerResult`.
- Added internal `_simulate_with_modes(modes, inputs)` that simulates interval trajectory for mixed mode plans and keeps SOC clamped to physical bounds.
- Mode assignment order is intentional: initialize all intervals to `HOME_I`, apply `CHARGE_CHEAPEST` intervals as `HOME_UPS`, then apply FVE priority by converting only remaining `HOME_I` intervals with solar forecast to `HOME_III`.
- Safety validation enforces SOC floor with tolerance (`state.soc_kwh >= inputs.hw_min_kwh * 0.95`) and raises `ValueError` with interval context on violation.
- Total plan cost is aggregated from simulated states (`sum(state.cost_czk for state in states)`) and returned with original decisions in `PlannerResult`.

## 2026-03-06 - Main Planner Orchestration (Task 4.2)
- Added `plan_battery_schedule(inputs)` to `custom_components/oig_cloud/battery_forecast/economic_planner.py` as the main entry point over all planning phases.
- Execution pipeline is now explicit: baseline HOME I simulation (`simulate_home_i_detailed`) -> critical moment detection (`find_critical_moments`) -> decisioning (`make_economic_decisions`) -> final mode/states synthesis (`generate_plan`).
- No-critical-moment path returns a simple plan through `generate_plan([], inputs)`, which keeps default `HOME_I` and applies FVE-priority `HOME_III` where solar exists.
- Added defensive error handling: on unexpected runtime failure, planner falls back to a safe deterministic plan (HOME I + solar-driven HOME III), re-simulates states, and returns a valid `PlannerResult` instead of propagating exceptions.

## 2026-03-06 - Unit Tests for Plan Functions (Task 4.3)
- Extended tests/test_economic_planner.py with direct coverage for generate_plan() and plan_battery_schedule() across 96-interval day profiles.
- Added scenario tests for ideal day (no critical moments, no HOME_UPS), critical day (low SOC + no solar + expensive load leads to CHARGE_CHEAPEST decisions with HOME_UPS intervals), and TUV spike day (single high-load interval produces a critical decision at spike interval).
- Added emergency fallback test for plan_battery_schedule() using charge_rate_kw=0.0 to trigger planning failure path and verify safe fallback modes (HOME_I/HOME_III) with empty decisions.
- Added generate_plan() structure assertions: result type, modes/states length parity, charge interval mode overrides, and total_cost consistency with simulated state costs.

## 2026-03-06 - Planner Comparison Script (Task 5.2)
- Added `tests/compare_planners.py` in the economic planner worktree to compare baseline HOME_I simulation (`simulate_home_i_detailed`) against the new economic planner (`plan_battery_schedule`) across all historical scenarios in `tests/data/historical_scenarios.json`.
- Script builds `PlannerInputs` per scenario, validates 96-interval data lengths, computes baseline cost as sum of baseline state costs, computes new planner total via `PlannerResult.total_cost`, and checks safety with `state.soc_kwh >= HW_MIN_KWH` for both planners.
- Per-scenario output includes date, old/new cost, savings, and old/new safety flags; final summary reports total savings, average daily savings, improved/worse/unchanged day counts, and days where both planners remained safe.
- Local execution note: script runs successfully with `PYTHONPATH="." python3 tests/compare_planners.py`; package import logs a non-fatal warning about missing Home Assistant dependency in this shell (`ModuleNotFoundError: homeassistant`) before scenario comparison output.

## 2026-03-07 - Task 6.2 Legacy planner cutover
- Switched runtime planner pipeline in `planning/forecast_update.py` from `HybridStrategy.optimize(...)` to `plan_battery_schedule(PlannerInputs)`; planning-min is now clamped to HW minimum directly when creating `PlannerInputs`.
- Removed obsolete runtime coupling in sensor layer by deleting `BatteryForecastSensor._economic_charging_plan` and `_smart_charging_plan` proxies and dropping `charging_helpers` import from `sensors/ha_sensor.py`.
- Updated public exports in `battery_forecast/__init__.py` to expose economic planner API (`PlannerInputs`, `PlannerResult`, `plan_battery_schedule`) instead of hybrid strategy exports.
- Created required backups before cleanup: `planning/charging_plan.py.bak` and `strategy/hybrid_planning.py.bak`.
- Adjusted forecast-update tests from `HybridStrategy` monkeypatching to `plan_battery_schedule` monkeypatching so tests validate the new entrypoint.
- Verification: LSP diagnostics clean for all changed files. Economic planner suites pass (`tests/test_economic_planner.py`, `tests/test_historical_scenarios.py`). Full HA-dependent forecast/sensor test modules still require Home Assistant package in environment (`ModuleNotFoundError: homeassistant`).

## 2026-03-07 - Task 7.1 Config flow economic planner options
- Added shared constants in `const.py` for planner config keys and defaults: `CONF_PLANNING_MIN_PERCENT`, `CONF_CHARGE_RATE_KW`, `DEFAULT_HW_MIN_PERCENT`, `DEFAULT_PLANNING_MIN_PERCENT`, `DEFAULT_CHARGE_RATE_KW`.
- Extended battery wizard schema in `config/steps.py` with HA UI fields for `planning_min_percent` (slider 20-100, default 33) and `charge_rate_kw` (number 0.5-10.0, default 2.8); both are persisted into options payload.
- Validation added in `_validate_battery_config`: planning minimum must be >= HW minimum floor (20%), and charge rate must stay within 0.5-10.0 kW.
- Kept backward compatibility by mapping new fields to legacy runtime keys (`min_capacity_percent`, `home_charge_rate`) while also storing canonical new keys.
- Updated quick-setup defaults and legacy options migration in `__init__.py` so existing installs get new planner option keys automatically (with fallback from legacy values).
- Added new config/option translation labels and descriptions in `strings.json`, plus new error messages (`planning_min_below_hw`, `invalid_charge_rate_kw`) so fields and validation are visible in HA UI.
- Refactored `battery_forecast/economic_planner_integration.py` to consume constants from `const.py` instead of local hardcoded defaults for planner input loading.
- Verification: LSP diagnostics clean on changed files (`const.py`, `config/steps.py`, `battery_forecast/economic_planner_integration.py`). `pytest` run is blocked in this shell by missing dependency `voluptuous` during collection.

## 2026-03-07 - Task P1.1 PlannerInputs input validation
- Expanded `PlannerInputs.__post_init__` in `economic_planner_types.py` with strict input validation: positive `max_capacity_kwh`, positive `current_soc_kwh`, `current_soc_kwh <= max_capacity_kwh`, positive `charge_rate_kw`, `planning_min_percent <= 100`, aligned forecast lengths, and non-negative solar/load forecasts.
- Kept spot-price behavior intentionally permissive: negative `prices` are accepted (OTE negative-price market case).
- Unified all length mismatch failures under one error message (`Forecast lengths must match intervals count`) to simplify and centralize assertions.
- Added/updated unit tests in `tests/test_economic_planner.py` for each new validation plus explicit negative-price acceptance.
- Existing tests that depended on constructing invalid `PlannerInputs` were adapted by constructing valid objects first and then mutating fields for runtime-path checks (e.g., `charge_rate_kw=0.0` and over-capacity SOC clamp simulation).
- Verification status: LSP diagnostics clean on changed files; planner-focused suite passed (`57 passed`). Full repository `pytest` is currently blocked in local environment by missing Home Assistant stack/dependency constraints and Python 3.14 incompatibilities in pinned dev requirements.

## 2026-03-08 - Task P2.1 Real forecasts in economic planner integration
- Replaced placeholder arrays in `battery_forecast/economic_planner_integration.py` with real input loading via three helpers: `fetch_solar_forecast`, `fetch_load_forecast`, and `fetch_prices`.
- Solar forecast pattern aligned with existing solar sensor attributes: reads `today_hourly_total_kw` and `tomorrow_hourly_total_kw` from `sensor.oig_{box_id}_solar_forecast` (fallback `sensor.solcast_forecast`), then converts hourly kW to 15-minute kWh by `/4`.
- Load forecast pattern aligned with existing load profile code: reconstructs `load_avg_*` sensor map using `SENSOR_TYPES_STATISTICS` metadata (`time_range`, `day_type`) and computes each 15-minute value with `get_load_avg_for_timestamp`.
- Price forecast pattern aligned with pricing pipeline: first consumes coordinator cache (`hass.data[DOMAIN][entry_id]["coordinator"].data["spot_prices"]["prices15m_czk_kwh"]`), then falls back to current spot sensor scalar, finally to safe defaults.
- Added robust normalization for all streams (parse+sort timestamps, non-negative clamps, strict 96-interval pad/trim), preserving planner stability when sensors are partial/missing.
- Verification: LSP diagnostics clean for changed integration file; targeted planner tests pass (`tests/test_economic_planner.py`). Full `pytest` in this shell still fails at collection due missing environment dependencies (`homeassistant`, `voluptuous`, `numpy`, `pytest_socket`, etc.).

## 2026-03-08 - Task P2.2 Refactor duplicated HOME_I simulation
- Introduced shared `_simulate_interval(soc, solar, load, price, inputs, mode)` in `battery_forecast/economic_planner.py` returning `(new_soc, grid_import, grid_export, cost)`.
- Unified the common interval physics (solar->load first, solar surplus charging with `DEFAULT_CHARGE_EFFICIENCY`, battery discharge above `hw_min_kwh` with `DEFAULT_EFFICIENCY`, residual grid import/export) in one place.
- Refactored `simulate_home_i_detailed`, `calculate_cost_use_battery`, `calculate_cost_wait_for_solar`, and `_simulate_with_modes` to call the shared helper, removing duplicated HOME_I flow logic without changing behavior.
- Kept HOME_UPS-specific branch inside helper for `_simulate_with_modes`, so mixed-mode simulation still uses identical per-interval math as before.
- Verification: LSP diagnostics clean for changed file; `tests/test_economic_planner.py` passed (24/24). Full repository `pytest` is still blocked in this shell by missing dependencies (`homeassistant`, `pytest_socket`, `numpy`, `voluptuous`, ...).

## 2026-03-08 - Task P3.3 Standardize Comments
- Searched for Czech comments in `economic_planner.py`, `economic_planner_types.py`, and `economic_planner_integration.py`.
- Found NO Czech comments in these files - all comments were already in English.
- Comments present are simple English inline comments (e.g., "# Get box_id from config", "# Sensor entity IDs", "# Read current values from sensors").
- Tests pass (24/24), LSP diagnostics clean on all three files.
- Note: Found one Czech comment in a different file (`planning/charging_plan_adjustments.py`: "# Early return pokud should_charge=False"), but this was outside the scope of the specified economic_planner files.
