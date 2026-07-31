# RCA-R4 — solar step no prefill from options / hass.config

Source: worker `task-f1-rca-r4-solar-step-no-prefill-7a996b` (fe/research), verified against
`custom_components/oig_cloud/config/steps.py`, `config_migration.py` on branch
`f1-plan3.6-impl` (base_sha `aa00fe923eb5f94ca62f15d64fc0443247114e41`).

## Root cause (2 lines)

The solar step schema (`config/steps.py:1679-1720`, `_get_solar_schema()`) DOES read
`hass.config.latitude/longitude` and DOES apply `self._wizard_data` as `defaults` — the
general prefill mechanism is present, not missing. The defect is a hardcoded Prague fallback
(`50.0 / 14.0`, `config/steps.py:1687-1688`) used whenever `self.hass` is falsy or a field is
absent from `_wizard_data`, which masks "not actually configured" as "configured to Prague"
instead of surfacing an empty/prompt state — and this fallback is silent, so a user with a
different HA location or a config that predates the seeding migration sees plausible-looking
but wrong defaults rather than an obvious gap.

## Verification performed (orchestrator)

- Confirmed `config/steps.py:1687-1688`:
  `ha_latitude = self.hass.config.latitude if self.hass else 50.0` (and longitude / 14.0) —
  exact hardcoded Prague-coordinate fallback, matches worker's citation and line numbers.
- Confirmed `config/steps.py:1715ish` uses `defaults.get(CONF_SOLAR_FORECAST_LATITUDE,
  ha_latitude)` as the schema default — i.e. `_wizard_data` (existing options) takes priority
  over the `hass.config` fallback when present, contradicting the R4 ticket's premise that the
  step "does not pre-fill from existing options... at all". It does, when the key is present.
- Confirmed `OigCloudOptionsFlowHandler.__init__` (`config/steps.py:3374-3410`) builds
  `self._wizard_data = backend_options | frontend_pricing` from `config_entry.options` — same
  general seeding path R2 investigates, shared by solar.
- Confirmed `config_migration.py:145-146` — author-default GPS constants
  (`_AUTHOR_DEFAULT_SOLAR_LATITUDE/LONGITUDE` ≈ 50.122/13.937, i.e. also Prague-area) exist as
  a *separate* migration-time seeding path from the runtime fallback above; did not trace
  whether `run_migration()` (`config_migration.py:174-207`) is guaranteed to execute before
  every OptionsFlow open — worker flagged this as unconfirmed, orchestrator did not close it.
- **Discrepancy with the original ticket wording**: "empty fields for a configured install" is
  not what the code produces — it produces *plausible non-empty Prague-coordinate* fields for
  an unconfigured or pre-migration install. Flagging for R6 adversarial review: either the
  ticket's symptom description is imprecise (this RCA's finding is the real defect), or there
  is a second, still-unfound code path that produces genuinely empty fields and this RCA only
  explains a related-but-different bug. Worker did not live-test the deployed DEBUG environment
  to confirm which.

## Fix proposals

### Minimal (effort S) — remove hardcoded Prague fallback

`config/steps.py:1687-1688`: fallback to `None` instead of `50.0`/`14.0` when `self.hass` is
falsy. `config/steps.py:~1715-1720`: schema default chain becomes
`defaults.get(KEY, ha_latitude if ha_latitude is not None else "")` — field renders empty
(forces explicit user input) instead of silently-wrong Prague coordinates. No behavior change
for the already-working case (options present, `self.hass` set).

### Proper (effort M) — shared prefill helper (also closes part of R2)

Extract a `config/prefill_helper.py` with one `get_field_default(key, wizard_data, hass_config,
fallback)` resolving `wizard_data → hass.config attr → explicit fallback`, used by
`_get_solar_schema` and the other `_get_*_schema` methods. Single source of truth for the
prefill order; prevents this class of silent-wrong-default recurring per-step. Overlaps with
R2's general seeding fix — coordinate scope with the R2 fix before implementing either.

## Severity and recommendation

MEDIUM — not "data loss" (R2/R3 are worse: R2 loses ALL seeded values, R3 loses a whole config
surface), but silently-wrong GPS coordinates corrupt solar-forecast accuracy for any
non-Czech-region or pre-migration install without any visible error. Recommendation: confirm
the ticket-vs-finding discrepancy above in R6 review before scoping the fix — if a second empty-
field path exists it needs its own RCA. Ship the minimal fix regardless; it is strictly safer
than the current hardcoded fallback either way.

## Not established (worker-reported gaps)

- Whether `self.hass` is actually `None` in the live deployed DEBUG environment during solar
  step render — code review only, not dynamically tested.
- Whether migration failures that leave `solar_forecast_latitude/longitude` absent from
  `entry.options` are surfaced to the user or fail silently.
- Live user behavior on the actual rejected release — not observed directly.
