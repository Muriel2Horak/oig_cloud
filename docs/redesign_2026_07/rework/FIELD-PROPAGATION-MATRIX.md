# Field propagation + consumption audit — ALL registry fields

Owner question this answers: *"projel jsi vsechny volby, ze se propisuji do BE a jsou pouzite?"*

Scope: every field in `config_registry.py FIELD_REGISTRY` (102 total; worktree `/repos/wt-f1-fieldaudit`, branch `f1/field-propagation-audit`, base `f1/wizard-v2-impl`). Guard test: `tests/test_registry_field_consumption.py` (parses FIELD_REGISTRY, greps the BE package for a literal read of each key or its `CONF_*` alias, excluding the wizard/validation write path in `config/` and `config_flow.py`). A field newly added to the registry without a BE reader now fails CI.

## Summary

| verdict | count |
|---|---|
| CONSUMED | 87 |
| DISPLAY-ONLY (justified) | 4 |
| DEAD | 11 |
| **total** | **102** |

### DEAD fields (11) — the deliverable highlight

**8 caught by the automated guard test** (zero textual consumer anywhere in the BE package outside `config_registry.py`/`const.py`):

- `ai_provider`, `ai_base_url`, `ai_model` — AI section propagation is broken end to end: the wizard writes all three into `entry.options`, but the runtime (`ai_task.py`) reads the provider from a separate `AiKeyStore` and always uses the hardcoded `PROVIDERS[provider]["base_url"]` / `MODEL_CHAINS[provider]` instead of the stored options. The registry's own comment ("base_url is user-overridable", config_registry.py:430) does not match runtime behaviour.
- `spot_positive_fee_percent_nt`, `spot_negative_fee_percent_nt`, `spot_fixed_fee_mwh_nt`, `export_fee_percent_nt`, `export_fixed_fee_czk_nt` — the NT (low-tariff) variants of the percentage/fixed pricing-model fees are captured by the wizard (gated by `show_if_all` on a dual-tariff distribution code) but **no pricing consumer branches on tariff for these two models** — only `fixed_prices` actually splits VT/NT (via `fixed_commercial_price_vt`/`_nt`, a different, already-consumed pair). A dual-tariff household on the percentage or fixed pricing model is billed the VT fee around the clock; the NT fields they configured in the wizard are silently ignored.

**3 more found by manual read-path tracing, NOT caught by the automated guard** (a textual mention of the key exists, it's just unreachable — a limitation of any grep-based check, documented in the test's own docstring):

- `local_proxy_stale_minutes`, `local_event_debounce_ms` — each has a getter in `core/data_source.py` (`get_proxy_stale_minutes` / `get_local_event_debounce_ms`) that does read the option, but **neither getter has any caller anywhere in the package**.
- `boiler_enable_second_thermometer` — the only non-wizard hit is a legacy-key allowlist entry in `boiler/migration.py` (migration bookkeeping, never a `.get()` read). Whether the second thermometer is actually used is decided purely by whether `boiler_temp_sensor_bottom` is non-empty (boiler/coordinator.py:105-108); this toggle itself is never consulted.

### reload_on_change mismatches (2)

`standard_scan_interval` and `extended_scan_interval` are read once in `async_setup_entry` (__init__.py:1123/1126) and baked into the cloud-poll coordinator's fixed interval — changing either via the dashboard sets no `_needs_reload` flag (`config_merge.py:35` only flags a reload when `FIELD_REGISTRY[key].reload_on_change` is True), so a saved change silently has no effect until a manual restart. Traced and confirmed correct: every `modules`/`boiler` field (already `reload_on_change=True` on every field per config_registry.py:288-294/:376), `enable_dashboard` (has its own live panel add/remove path in `async_update_options`, __init__.py:2203+), `data_source_mode` (has an explicit live-transition handler, core/data_source.py:784+), and the battery/solar fields sampled (`balancing_enabled`, `solar_forecast_string1/2_enabled`, etc. — all read live via `self._entry.options.get(...)` inside sensor compute methods, not cached at setup).

## Limitations

- CONSUMED verdicts are grep/read-path evidence that *a* BE module reads the key; for the 87 CONSUMED fields this was spot-checked (directory-bucket classification + manual verification of every field flagged as textually-ambiguous), not individually traced to a running code path the way the 11 DEAD fields were. The guard test proves textual presence, not reachability — see the 3 manually-found DEAD fields above for why that gap matters.
- reload_on_change was traced for every `modules`/`boiler` field (25+7, all correct) plus a risk-selected sample of `battery`/`solar`/`basic` fields (structural-looking flags: entity-count/platform changes, polling cadence, panel registration). The two `basic`-section scan-interval fields are the only confirmed mismatch; a full trace of all ~90 `reload_on_change=False` fields individually was out of scope for this pass.

## Section: `modules` (7 fields)

| key | type | reload_on_change | write path | consumer (file:line : count) | verdict |
|---|---|---|---|---|---|
| `enable_solar_forecast` | bool | **True** | POST/GET `/module_config` | `__init__.py:605` : 10 | **CONSUMED** |
| `enable_battery_prediction` | bool | **True** | POST/GET `/module_config` | `__init__.py:607` : 14 | **CONSUMED** |
| `enable_pricing` | bool | **True** | POST/GET `/module_config` | `__init__.py:1035` : 18 | **CONSUMED** |
| `enable_boiler` | bool | **True** | POST/GET `/module_config` | `__init__.py:1436` : 17 | **CONSUMED** |
| `enable_statistics` | bool | **True** | POST/GET `/module_config` | `__init__.py:1764` : 6 | **CONSUMED** |
| `enable_extended_sensors` | bool | **True** | POST/GET `/module_config` | `core/coordinator.py:693` : 4 | **CONSUMED** |
| `enable_chmu_warnings` | bool | **True** | POST/GET `/module_config` | `sensor.py:1366` : 4 | **CONSUMED** |

## Section: `battery` (16 fields)

| key | type | reload_on_change | write path | consumer (file:line : count) | verdict |
|---|---|---|---|---|---|
| `auto_mode_switch_enabled` | bool | False | POST/GET `/module_config` | `api/ha_rest_api.py:1333` : 27 | **CONSUMED** |
| `charge_rate_kw` | float | False | POST/GET `/module_config` | `__init__.py:269` : 21 | **CONSUMED** |
| `expensive_percentile` | float | False | POST/GET `/module_config` | `api/planning_api.py:97` : 8 | **CONSUMED** |
| `battery_comfort_soc_percent` | float | False | POST/GET `/module_config` | `battery_forecast/planning/forecast_update.py:987` : 3 | **CONSUMED** |
| `balancing_enabled` | bool | False | POST/GET `/module_config` | `__init__.py:1509` : 9 | **CONSUMED** |
| `balancing_interval_days` | int | False | POST/GET `/module_config` | `ai/backends.py:58` : 3 | **CONSUMED** |
| `balancing_hold_hours` | int | False | POST/GET `/module_config` | `ai/backends.py:58` : 3 | **CONSUMED** |
| `balancing_opportunistic_threshold` | float | False | POST/GET `/module_config` | `battery_forecast/balancing/core.py:151` : 1 | **CONSUMED** |
| `balancing_economic_threshold` | float | False | POST/GET `/module_config` | `battery_forecast/balancing/core.py:161` : 1 | **CONSUMED** |
| `cheap_window_percentile` | int | False | POST/GET `/module_config` | `battery_forecast/balancing/core.py:143` : 4 | **CONSUMED** |
| `hw_min_fraction` | float | False | POST/GET `/module_config` | `battery_forecast/planning/forecast_update.py:963` : 1 | **CONSUMED** |
| `mode_guard_minutes` | int | False | POST/GET `/module_config` | `battery_forecast/planning/forecast_update.py:1027` : 7 | **CONSUMED** |
| `box_floor_safety_margin_pct` | float | False | POST/GET `/module_config` | `battery_forecast/planning/forecast_update.py:979` : 1 | **CONSUMED** |
| `holding_soc_threshold_percent` | float | False | POST/GET `/module_config` | `battery_forecast/balancing/core.py:633` : 1 | **CONSUMED** |
| `ups_opportunistic_price_czk_kwh` | float | False | POST/GET `/module_config` | `battery_forecast/sensors/ha_sensor.py:434` : 1 | **CONSUMED** |
| `ups_opportunistic_charge_rate_kw` | float | False | POST/GET `/module_config` | `battery_forecast/sensors/ha_sensor.py:438` : 1 | **CONSUMED** |

## Section: `solar` (15 fields)

| key | type | reload_on_change | write path | consumer (file:line : count) | verdict |
|---|---|---|---|---|---|
| `solar_forecast_provider` | str | False | POST/GET `/module_config` | `api/ha_rest_api.py:1523` : 12 | **CONSUMED** |
| `solar_forecast_mode` | str | False | POST/GET `/module_config` | `entities/solar_forecast_sensor.py:214` : 3 | **CONSUMED** |
| `solar_forecast_api_key` | str | False | POST/GET `/module_config` | `api/ha_rest_api.py:1583` : 13 | **CONSUMED** |
| `solcast_api_key` | str | False | POST/GET `/module_config` | `api/ha_rest_api.py:1590` : 11 | **CONSUMED** |
| `solcast_site_id` | str | False | POST/GET `/module_config` | `api/ha_rest_api.py:1590` : 11 | **CONSUMED** |
| `solar_forecast_latitude` | float | False | POST/GET `/module_config` | `config_migration.py:199` : 9 | **CONSUMED** |
| `solar_forecast_longitude` | float | False | POST/GET `/module_config` | `config_migration.py:201` : 9 | **CONSUMED** |
| `solar_forecast_string1_enabled` | bool | False | POST/GET `/module_config` | `api/ha_rest_api.py:289` : 7 | **CONSUMED** |
| `solar_forecast_string1_kwp` | float | False | POST/GET `/module_config` | `api/ha_rest_api.py:291` : 4 | **CONSUMED** |
| `solar_forecast_string1_declination` | int | False | POST/GET `/module_config` | `api/ha_rest_api.py:296` : 3 | **CONSUMED** |
| `solar_forecast_string1_azimuth` | int | False | POST/GET `/module_config` | `api/ha_rest_api.py:297` : 4 | **CONSUMED** |
| `solar_forecast_string2_enabled` | bool | False | POST/GET `/module_config` | `api/ha_rest_api.py:290` : 5 | **CONSUMED** |
| `solar_forecast_string2_kwp` | float | False | POST/GET `/module_config` | `api/ha_rest_api.py:292` : 4 | **CONSUMED** |
| `solar_forecast_string2_declination` | int | False | POST/GET `/module_config` | `api/ha_rest_api.py:298` : 3 | **CONSUMED** |
| `solar_forecast_string2_azimuth` | int | False | POST/GET `/module_config` | `api/ha_rest_api.py:299` : 4 | **CONSUMED** |

## Section: `boiler` (25 fields)

| key | type | reload_on_change | write path | consumer (file:line : count) | verdict |
|---|---|---|---|---|---|
| `boiler_volume_l` | float | **True** | POST/GET `/module_config` | `boiler/api_views.py:911` : 19 | **CONSUMED** |
| `boiler_temp_sensor_top` | str | **True** | POST/GET `/module_config` | `boiler/api_views.py:867` : 18 | **CONSUMED** |
| `boiler_temp_sensor_bottom` | str | **True** | POST/GET `/module_config` | `boiler/api_views.py:868` : 15 | **CONSUMED** |
| `boiler_enable_second_thermometer` | bool | **True** | POST/GET `/module_config` | `boiler/migration.py:34` : 1 | **DEAD** |
| `boiler_current_power_entity` | str | **True** | POST/GET `/module_config` | `boiler/runtime.py:1859` : 6 | **CONSUMED** |
| `boiler_alt_energy_sensor` | str | **True** | POST/GET `/module_config` | `boiler/api_views.py:982` : 8 | **CONSUMED** |
| `boiler_alt_energy_daily` | bool | **True** | POST/GET `/module_config` | `boiler/api_views.py:1045` : 2 | **CONSUMED** |
| `boiler_alt_cost_kwh` | float | **True** | POST/GET `/module_config` | `boiler/api_views.py:1085` : 10 | **CONSUMED** |
| `boiler_has_alternative_heating` | bool | **True** | POST/GET `/module_config` | `boiler/api_views.py:658` : 11 | **CONSUMED** |
| `boiler_target_temp_c` | float | **True** | POST/GET `/module_config` | `boiler/api_views.py:912` : 14 | **CONSUMED** |
| `boiler_deadline_time` | str | **True** | POST/GET `/module_config` | `boiler/api_views.py:634` : 10 | **CONSUMED** |
| `boiler_alt_source_type` | str | **True** | POST/GET `/module_config` | `boiler/api_views.py:1507` : 2 | **CONSUMED** |
| `boiler_battery_cycle_cost_czk_kwh` | float | **True** | POST/GET `/module_config` | `boiler/runtime.py:2471` : 6 | **CONSUMED** |
| `boiler_thermal_arbitrage_enabled` | bool | **True** | POST/GET `/module_config` | `boiler/api_views.py:702` : 6 | **CONSUMED** |
| `boiler_max_temp_c` | float | **True** | POST/GET `/module_config` | `boiler/runtime.py:34` : 2 | **CONSUMED** |
| `boiler_alt_power_kw` | float | **True** | POST/GET `/module_config` | `boiler/api_views.py:21` : 5 | **CONSUMED** |
| `box_has_home56` | bool | **True** | POST/GET `/module_config` | `boiler/api_views.py:663` : 9 | **CONSUMED** |
| `boiler_home5_maneuver_enabled` | bool | **True** | POST/GET `/module_config` | `boiler/api_views.py:1700` : 9 | **CONSUMED** |
| `boiler_circulation_enabled` | bool | **True** | POST/GET `/module_config` | `boiler/api_views.py:1672` : 5 | **CONSUMED** |
| `boiler_circulation_lead_minutes` | int | **True** | POST/GET `/module_config` | `boiler/runtime.py:1223` : 2 | **CONSUMED** |
| `boiler_circulation_run_minutes` | int | **True** | POST/GET `/module_config` | `boiler/runtime.py:1224` : 2 | **CONSUMED** |
| `boiler_circulation_max_runs_per_day` | int | **True** | POST/GET `/module_config` | `boiler/runtime.py:1225` : 2 | **CONSUMED** |
| `boiler_circulation_min_gap_minutes` | int | **True** | POST/GET `/module_config` | `boiler/runtime.py:1226` : 2 | **CONSUMED** |
| `boiler_legionella_interval_days` | int | **True** | POST/GET `/module_config` | `boiler/api_views.py:1627` : 7 | **CONSUMED** |
| `boiler_legionella_target_temp_c` | float | **True** | POST/GET `/module_config` | `boiler/runtime.py:1149` : 5 | **CONSUMED** |

- **`boiler_enable_second_thermometer`** (DEAD): the only non-wizard hit is `boiler/migration.py:34`, a legacy-key ALLOWLIST for migration bookkeeping (never a `.get()` read). The actual behaviour (whether the bottom-zone thermal read model activates) is gated purely by whether `boiler_temp_sensor_bottom` is non-empty (boiler/coordinator.py:105-108) — this flag is not consulted anywhere.

## Section: `ai` (4 fields)

| key | type | reload_on_change | write path | consumer (file:line : count) | verdict |
|---|---|---|---|---|---|
| `ai_provider` | str | False | options-flow (`async_step_ai`) only — NOT in `/module_config` | **none** | **DEAD** |
| `ai_base_url` | str | False | options-flow (`async_step_ai`) only — NOT in `/module_config` | **none** | **DEAD** |
| `ai_model` | str | False | options-flow (`async_step_ai`) only — NOT in `/module_config` | **none** | **DEAD** |
| `ai_consent_cross_provider_fallback` | bool | False | options-flow (`async_step_ai`) only — NOT in `/module_config` | `ai_task.py:252` : 2 | **CONSUMED** |

- **`ai_provider`** (DEAD): written to entry.options by config/steps.py `async_step_ai`, but runtime reads the provider from `AiKeyStore.async_get_provider()` (ai_task.py:240) — the entry.options copy is never read back.
- **`ai_base_url`** (DEAD): wizard captures a custom base URL, but backend construction always uses the hardcoded `PROVIDERS[provider]["base_url"]` (ai_task.py:288, ai/backends.py:31/35) — the option is never read.
- **`ai_model`** (DEAD): wizard captures a custom model, but backend construction always uses the hardcoded `MODEL_CHAINS[provider]` (ai_task.py:288) — the option is never read.

## Section: `pricing` (8 fields)

| key | type | reload_on_change | write path | consumer (file:line : count) | verdict |
|---|---|---|---|---|---|
| `confirmed_distribution_distributor` | str | False | POST/GET `/module_config` | `api/ha_rest_api.py:1682` : 2 | **DISPLAY-ONLY** |
| `confirmed_distribution_tariff` | str | False | POST/GET `/module_config` | `api/ha_rest_api.py:1568` : 4 | **CONSUMED** |
| `confirmed_distribution_price_incl_vat` | float | False | POST/GET `/module_config` | `api/ha_rest_api.py:1707` : 2 | **DISPLAY-ONLY** |
| `confirmed_distribution_price_excl_vat` | float | False | POST/GET `/module_config` | `api/ha_rest_api.py:1710` : 2 | **DISPLAY-ONLY** |
| `confirmed_distribution_unit` | str | False | POST/GET `/module_config` | `api/ha_rest_api.py:1713` : 2 | **DISPLAY-ONLY** |
| `distribution_fee_vt_kwh` | float | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:55` : 37 | **CONSUMED** |
| `distribution_fee_nt_kwh` | float | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:56` : 33 | **CONSUMED** |
| `vat_rate` | float | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:191` : 28 | **CONSUMED** |

- **`confirmed_distribution_distributor`** (DISPLAY-ONLY): used only to look up the official distributor pricelist for the read-only confirmation block (api/ha_rest_api.py:1681-1713); the live billing calc reads the separate, user-editable `distribution_fee_vt_kwh`/`distribution_fee_nt_kwh` fields, not this one.
- **`confirmed_distribution_price_incl_vat`** (DISPLAY-ONLY): recomputed every save from distributor+tariff (api/ha_rest_api.py:1706-1707); shown for reference only, never fed into the pricing calc.
- **`confirmed_distribution_price_excl_vat`** (DISPLAY-ONLY): same as confirmed_distribution_price_incl_vat.
- **`confirmed_distribution_unit`** (DISPLAY-ONLY): same pattern; display unit string for the confirmation block only.

## Section: `pricing_supplier` (21 fields)

| key | type | reload_on_change | write path | consumer (file:line : count) | verdict |
|---|---|---|---|---|---|
| `spot_pricing_model` | str | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:35` : 6 | **CONSUMED** |
| `spot_positive_fee_percent` | float | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:36` : 5 | **CONSUMED** |
| `spot_positive_fee_percent_nt` | float | False | POST/GET `/module_config` | **none** | **DEAD** |
| `spot_negative_fee_percent` | float | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:37` : 5 | **CONSUMED** |
| `spot_negative_fee_percent_nt` | float | False | POST/GET `/module_config` | **none** | **DEAD** |
| `spot_fixed_fee_mwh` | float | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:38` : 5 | **CONSUMED** |
| `spot_fixed_fee_mwh_nt` | float | False | POST/GET `/module_config` | **none** | **DEAD** |
| `fixed_commercial_price_vt` | float | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:45` : 9 | **CONSUMED** |
| `fixed_commercial_price_nt` | float | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:46` : 8 | **CONSUMED** |
| `export_pricing_model` | str | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:170` : 2 | **CONSUMED** |
| `export_fee_percent` | float | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:171` : 3 | **CONSUMED** |
| `export_fee_percent_nt` | float | False | POST/GET `/module_config` | **none** | **DEAD** |
| `export_fixed_fee_czk` | float | False | POST/GET `/module_config` | `pricing/spot_price_export_15min.py:89` : 2 | **CONSUMED** |
| `export_fixed_fee_czk_nt` | float | False | POST/GET `/module_config` | **none** | **DEAD** |
| `export_fixed_price` | float | False | POST/GET `/module_config` | `battery_forecast/data/pricing.py:172` : 4 | **CONSUMED** |
| `tariff_vt_start_weekday` | str | False | POST/GET `/module_config` | `battery_forecast/utils_common.py:77` : 2 | **CONSUMED** |
| `tariff_nt_start_weekday` | str | False | POST/GET `/module_config` | `battery_forecast/utils_common.py:76` : 2 | **CONSUMED** |
| `tariff_weekend_same_as_weekday` | bool | False | POST/GET `/module_config` | `config_migration.py:144` : 1 | **CONSUMED** |
| `tariff_vt_start_weekend` | str | False | POST/GET `/module_config` | `battery_forecast/utils_common.py:74` : 2 | **CONSUMED** |
| `tariff_nt_start_weekend` | str | False | POST/GET `/module_config` | `battery_forecast/utils_common.py:73` : 2 | **CONSUMED** |
| `dual_tariff_enabled` *(hidden)* | bool | False | POST/GET `/module_config` | `api/ha_rest_api.py:1569` : 38 | **CONSUMED** |

- **`spot_positive_fee_percent_nt`** (DEAD): percentage import-pricing model always applies the VT/base fee (`spot_positive_fee_percent`) regardless of current tariff — no consumer branches on tariff for this key (pricing/spot_price_15min.py:107, battery_forecast/data/pricing.py:36, entities/analytics_sensor.py:520+).
- **`spot_negative_fee_percent_nt`** (DEAD): same defect as spot_positive_fee_percent_nt for the negative-price leg.
- **`spot_fixed_fee_mwh_nt`** (DEAD): fixed import-pricing model always applies the VT/base fee (`spot_fixed_fee_mwh`) regardless of tariff — no NT branch exists.
- **`export_fee_percent_nt`** (DEAD): percentage export-pricing model always applies the VT/base fee (`export_fee_percent`) regardless of tariff (pricing/spot_price_export_15min.py:88, battery_forecast/data/pricing.py:171).
- **`export_fixed_fee_czk_nt`** (DEAD): fixed export-pricing model always applies the VT/base fee (`export_fixed_fee_czk`) regardless of tariff (pricing/spot_price_export_15min.py:89).

## Section: `basic` (6 fields)

| key | type | reload_on_change | write path | consumer (file:line : count) | verdict |
|---|---|---|---|---|---|
| `standard_scan_interval` | int | False ⚠ | POST/GET `/module_config` | `__init__.py:1123` : 11 | **CONSUMED** |
| `extended_scan_interval` | int | False ⚠ | POST/GET `/module_config` | `__init__.py:1126` : 9 | **CONSUMED** |
| `data_source_mode` | str | False | POST/GET `/module_config` | `core/data_source.py:95` : 2 | **CONSUMED** |
| `local_proxy_stale_minutes` | int | False | POST/GET `/module_config` | `core/data_source.py:107` : 2 | **DEAD** |
| `local_event_debounce_ms` | int | False | POST/GET `/module_config` | `__init__.py:165` : 2 | **DEAD** |
| `enable_dashboard` | bool | False | POST/GET `/module_config` | `__init__.py:2203` : 5 | **CONSUMED** |

- **`standard_scan_interval`** (reload_on_change ⚠): read once in `async_setup_entry` (__init__.py:1123) and baked into the cloud-poll coordinator's fixed interval; `reload_on_change=False` means a saved change sets no `_needs_reload` flag (config_merge.py:35) and silently has no effect until a manual restart/reload.
- **`extended_scan_interval`** (reload_on_change ⚠): same defect as standard_scan_interval — read once at setup (__init__.py:1126), no live re-read path, but not flagged reload_on_change.
- **`local_proxy_stale_minutes`** (DEAD): written by the wizard and by `_ensure_data_source_option_defaults` (__init__.py:164), and `core/data_source.py:107 get_proxy_stale_minutes()` reads it back — but that getter has ZERO callers anywhere in the package. Static grep sees a hit; nothing calls the function that contains it.
- **`local_event_debounce_ms`** (DEAD): same shape as local_proxy_stale_minutes: `core/data_source.py:117 get_local_event_debounce_ms()` reads the option but is never called.

