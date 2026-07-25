# RCA-R3 — commercial/supplier price regression (REGRESSION, highest severity)

Source: worker `task-f1-rca-r3-commercial-supplier-pr-286820` (java/research), verified
against `custom_components/oig_cloud/config_registry.py` and `config/steps.py` on branch
`f1-plan3.6-impl` (base_sha `aa00fe923eb5f94ca62f15d64fc0443247114e41`).

## Root cause (2 lines)

`config_registry.py` pricing section (lines ~402-442) defines only the 5
`confirmed_distribution_*` dataset-derived fields — zero of the 19 supplier/commercial
pricing keys the legacy `config/steps.py` wizard flow reads and writes. Silent scope gap
in commit `485dfc910` ("Plan 4 Task 2 transactional migration + Task 6b/6c pricing dataset
surface"): Task 6b/6c added the dataset-selector fields but never ported the pre-existing
commercial-pricing model, and no planning doc (`SCOPE-REVISION.md`, `DECISIONS.md`,
`PLAN-3.6-SPEC.md`, `IMPLEMENTATION-BRIEF-EN.md`) records a decision to drop it.

## Verification performed (orchestrator)

- Confirmed `config_registry.py` pricing section (verified at current lines, ~402-442)
  contains only `confirmed_distribution_distributor`, `confirmed_distribution_tariff`,
  `confirmed_distribution_price_incl_vat`, `confirmed_distribution_price_excl_vat`,
  `confirmed_distribution_unit` — no supplier/spot/tariff/VAT fields.
- Confirmed `config/steps.py` actively reads/writes `spot_pricing_model` (steps.py:128,275,
  283,287), `dual_tariff_enabled` (steps.py:116,324), `vat_rate` (steps.py:266),
  `fixed_commercial_price_vt` (steps.py:193,199,292) — i.e. the legacy flow is live, not dead
  code.
- Confirmed a live runtime consumer: `pricing/spot_price_15min.py:78-79` reads
  `dual_tariff_enabled` from `entry.options`; `:106` reads `spot_pricing_model`.
- Confirmed commit `485dfc910` exists with the cited message.
- Did not independently re-verify all 19 keys' consumer line numbers or the full
  git-history doc search — spot-checked a representative subset; worker's inventory table
  trusted for the remainder pending R6 adversarial review.

## Full inventory — legacy key -> live consumer(s) -> in registry (Y/N)

| Legacy key (`steps.py`) | Type | Default | Controls | Live consumer(s) | In registry? |
|---|---|---|---|---|---|
| `spot_pricing_model` | str | `percentage` | Import pricing scenario (percentage/fixed/fixed_prices) | `pricing/spot_price_15min.py:106`, `battery_forecast/data/pricing.py:35`, `entities/analytics_sensor.py:297,518,665` | **NO** |
| `spot_positive_fee_percent` | float | 15.0 | Import spot positive fee % (single tariff) | `pricing/spot_price_15min.py:107`, `battery_forecast/data/pricing.py:36`, `entities/analytics_sensor.py:520` | **NO** |
| `spot_negative_fee_percent` | float | 9.0 | Import spot negative fee % (single tariff) | `pricing/spot_price_15min.py:108`, `battery_forecast/data/pricing.py:37`, `entities/analytics_sensor.py:522` | **NO** |
| `spot_fixed_fee_mwh` | float | 500.0 | Import spot fixed fee (CZK/MWh, single tariff) | `pricing/spot_price_15min.py:109`, `battery_forecast/data/pricing.py:38`, `entities/analytics_sensor.py:523` | **NO** |
| `fixed_commercial_price_vt` | float | 4.50 | Import fixed commercial price VT (CZK/kWh) | `pricing/spot_price_15min.py:120`, `battery_forecast/data/pricing.py:45`, `entities/analytics_sensor.py:311,445,453` | **NO** |
| `fixed_commercial_price_nt` | float | 3.20 | Import fixed commercial price NT (CZK/kWh) | `pricing/spot_price_15min.py:121`, `battery_forecast/data/pricing.py:46`, `entities/analytics_sensor.py:312,454` | **NO** |
| `export_pricing_model` | str | `percentage` | Export pricing scenario | `pricing/spot_price_export_15min.py:87`, `battery_forecast/data/pricing.py:170` | **NO** |
| `export_fee_percent` | float | 15.0 | Export spot fee % (single tariff) | `pricing/spot_price_export_15min.py:88`, `battery_forecast/data/pricing.py:171` | **NO** |
| `export_fixed_fee_czk` | float | 0.20 | Export spot fixed fee (CZK/kWh) | `pricing/spot_price_export_15min.py:89` | **NO** |
| `export_fixed_price` | float | 2.50 | Export fixed price (CZK/kWh) | `pricing/spot_price_export_15min.py:90` | **NO** |
| `dual_tariff_enabled` | bool | True | Enable dual tariff (VT/NT) | `pricing/spot_price_15min.py:78`, `battery_forecast/utils_common.py:66`, `entities/analytics_sensor.py:155,196,248,319,440,530,633,690` | **NO** |
| `distribution_fee_vt_kwh` | float | 1.42 | Distribution fee VT (CZK/kWh) | `pricing/spot_price_15min.py:110`, `battery_forecast/data/pricing.py:55`, `entities/analytics_sensor.py:313,446,455,524,654,703` | **NO** |
| `distribution_fee_nt_kwh` | float | 0.91 | Distribution fee NT (CZK/kWh) | `pricing/spot_price_15min.py:111`, `battery_forecast/data/pricing.py:56`, `entities/analytics_sensor.py:316,458,527,659` | **NO** |
| `tariff_vt_start_weekday` | str | `6` | VT start hours, weekday | `battery_forecast/utils_common.py:77`, `entities/analytics_sensor.py:120` | **NO** |
| `tariff_nt_start_weekday` | str | `22,2` | NT start hours, weekday | `battery_forecast/utils_common.py:76`, `entities/analytics_sensor.py:117` | **NO** |
| `tariff_vt_start_weekend` | str | `` | VT start hours, weekend | `battery_forecast/utils_common.py:74`, `entities/analytics_sensor.py:113` | **NO** |
| `tariff_nt_start_weekend` | str | `0` | NT start hours, weekend | `battery_forecast/utils_common.py:73`, `entities/analytics_sensor.py:110` | **NO** |
| `tariff_weekend_same_as_weekday` | bool | True | Weekend tariff = weekday | `entities/analytics_sensor.py` (weekend/weekday comparison) | **NO** |
| `vat_rate` | float | 21.0 | VAT rate (%) | `pricing/spot_price_15min.py:112`, `battery_forecast/data/pricing.py:191`, `entities/analytics_sensor.py:320,441,531,683` | **NO** |

**Registry pricing section** (`config_registry.py` ~402-442): only
`confirmed_distribution_distributor`, `confirmed_distribution_tariff`,
`confirmed_distribution_price_incl_vat`, `confirmed_distribution_price_excl_vat`,
`confirmed_distribution_unit` — all derived from the bundled `pricelists.json` dataset.

**Missing from registry: all 19 supplier/commercial pricing fields above.**

## Git-history finding — silent loss, not an explicit decision

- Commit `485dfc910` (2026-07-19), "feat(migration+pricing): Plan 4 Task 2 transactional
  migration + Task 6b/6c pricing dataset surface" — added the 5 dataset-selector fields to
  `config_registry.py`'s pricing section. Did not port the pre-existing supplier-pricing
  model.
- No explicit decision to drop supplier pricing found in `SCOPE-REVISION.md`,
  `DECISIONS.md`, `PLAN-3.6-SPEC.md`, `IMPLEMENTATION-BRIEF-EN.md`, or the Plan 3.6 v2 doc.
- Conclusion: Task 6b/6c scope was narrowly "pricing dataset surface" (distributor/tariff/
  confirmed-price from bundled JSON); the legacy supplier-pricing fields were never ported
  to the registry. Wizard UI lost the ability to write them; 5+ consumer modules keep
  reading stale/default `entry.options` values.

## Fix proposals

### Minimal (effort S, ~2-3h)

- Add the 19 missing `Field()` definitions to `config_registry.py`'s pricing section
  (types, defaults, enums, `show_if` for scenario-dependent fields).
- `config/steps.py`: point `_map_pricing_to_backend()` / `_map_backend_to_frontend()` at
  registry keys (wizard steps already collect the values via `_wizard_data`).
- No consumer changes needed — they already read `entry.options` by the same key names.
- Risk: low. Fields are already live via the legacy options flow; this makes them
  registry-visible only.

### Proper (effort M, ~1-2 days) — flag for UX-spec design child (R5 wizard-v2 spec)

- Split registry pricing into `pricing_distribution` (dataset selector, current 5 fields)
  and `pricing_supplier` (19 legacy fields: spot scenarios, dual tariff, distribution fees,
  VAT), with `show_if` gating (e.g. spot_percentage fields only when
  `spot_pricing_model="percentage"`).
- Expose both subsections via `/module_config` GET/POST.
- Dashboard settings form renders `pricing_supplier` from registry metadata.
- Wizard keeps its 3-step pricing flow (import/export/distribution), validated against
  registry constraints.
- No data migration needed — legacy keys already live in `entry.options`.

## Severity and recommendation

CRITICAL — highest priority of the six rejected defects. Registry-driven UI (wizard +
settings) cannot configure or display commercial/supplier pricing at all; 5+ consumer
modules (pricing sensors, battery forecast, economic planner) depend on these keys.
New installs cannot set supplier pricing; existing installs cannot change it via the
dashboard. Recommendation: ship the minimal fix first (restores functional parity),
schedule the proper fix into the wizard-v2 UX spec.

## Not established (worker-reported gaps)

- Dashboard settings form (`www_v2`) supplier-pricing UI presence not investigated —
  check before implementing the proper fix.
- No documented migration path if the registry ever enforces registry-only writes
  (legacy keys currently persist directly in `entry.options`, outside registry control).
- Effort estimates: S / M, per proposal above.
