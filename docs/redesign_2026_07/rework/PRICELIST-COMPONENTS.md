# Pricelist Regulated Components Fix (D57d)

- Owner-verified real-box bug: wizard's suggested distribution fee per kWh
  used only the distributor's own distribution leg (`dist_leg`), not the
  FULL per-kWh regulated price a consumer actually pays. Owner's real D57d
  value: 754.77 (distribution VT) + 164.24 (system services) + 28.30
  (electricity tax) = 947.31 Kc/MWh = 0.94731 Kc/kWh, excl VAT.
- Guilty layers:
  - `scripts/build_pricelists.py` — decree parser never extracted
    "Cena za systemove sluzby" from the `Regulovana slozka NN` sheet, and
    had no source of the electricity-tax legislative constant at all.
  - `custom_components/oig_cloud/api/ha_rest_api.py` — `OIGCloudPricelistsView`
    dropped the new `regulated_components` section on the way to the FE.
  - `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts`
    — `applyDistributionFeeSuggestion` and the decree-mismatch hint in
    `renderDistributionPriceBlock` summed `dist_leg` only.
- Fix:
  - `_extract_eru_system_services` parses "Cena za systemove sluzby" (unit
    check `Kc/MWh`) off the `Regulovana slozka NN` sheet.
  - `ELECTRICITY_TAX_EXCL_VAT = 28.30` (zakon 261/2007 Sb.) is a legislative
    constant, not present on the decree sheet at all — see the sheet's own
    footnote excluding taxes.
  - `_build_eru_regulated_components` emits a distributor-independent
    top-level `regulated_components` section: `system_services` (164.24
    excl / 198.73 incl VAT, source `ceny-nn26-1.xlsx`) and `electricity_tax`
    (28.30 excl / 34.24 incl VAT, source `zakon 261/2007 Sb.`).
    `distributors` section values are unchanged.
  - `OIGCloudPricelistsView` passes `regulated_components` through as-is
    (degrades to `{}` for older/synthetic payloads missing the section).
  - FE: `regulatedComponentsExclVat()` sums `system_services +
    electricity_tax` (excl VAT). Suggestion and decree-mismatch comparison
    now use `(dist_leg + system_services + electricity_tax) / 1000`, kept
    at FULL precision (no round to 2 decimals — 947.31/1000 = 0.94731
    exactly; only display formatting shortens). Mismatch epsilon tightened
    0.005 -> 0.0005 (a 2-decimal-rounded comparison would never match a
    full-precision stored value). Hint text carries the breakdown, e.g.
    `Cenove rozhodnuti ERU + poplatky: 0.94731 Kc/kWh (distribuce 0.75477 +
    sys. sluzby 0.16424 + dan 0.02830)`.

## Red-First Proof

- Pre-fix committed dataset (`git show HEAD:custom_components/oig_cloud/remote_config/data/pricelists.json`)
  has no `regulated_components` key:
  ```
  $ /repos/oig-cloud/.ha-env/bin/python -c "
  import json, subprocess
  old = subprocess.run(['git','show','HEAD:custom_components/oig_cloud/remote_config/data/pricelists.json'],
                        capture_output=True, text=True).stdout
  payload = json.loads(old)
  try:
      payload['regulated_components']
  except KeyError as e:
      print('KeyError:', e)
  "
  KeyError: 'regulated_components'
  ```
- New BE regression `test_shipped_pricelists_has_regulated_components` in
  `tests/test_build_pricelists.py` would fail with the same `KeyError` against
  the pre-fix dataset; it passes against the rebuilt one (see Gates below).
- New FE regression `owner D57d box: full-precision stored fee (0.94731)
  matches the decree total -> no mismatch hint` in
  `onboarding-pricing-distribution.test.ts` would fail pre-fix (stored
  0.94731 vs old dist-leg-only decree 0.75 -> false mismatch shown forever
  on the owner's real box). Passes post-fix.

## Gates (foreground, full suites)

- BE suite:
  - Command: `/repos/oig-cloud/.ha-env/bin/python -m pytest`
  - Result: `4803 passed, 27 skipped, 32 warnings in 142.62s (0:02:22)`
  - `tests/e2e/test_data_refresh_fallback_e2e.py::test_forecast_solar_fallback_then_recovery`
    (flagged as a known pre-existing failure in the brief) is SKIPPED in
    this environment, not failed — confirmed with a targeted re-run of that
    file alone: all 4 tests in it show `SKIPPED`.
- BE targeted (changed files):
  - Command: `/repos/oig-cloud/.ha-env/bin/python -m pytest tests/test_build_pricelists.py tests/test_ha_rest_api_views.py -v`
  - Result: `107 passed in 4.00s`
- FE typecheck:
  - Command: `npx tsc --noEmit` (run from `custom_components/oig_cloud/www_v2`)
  - Result: exit code `0`, no output
- FE tests:
  - Command: `npx vitest run`
  - Result: `Test Files 88 passed (88)`, `Tests 1754 passed (1754)`, `Duration 19.23s`
- FE build:
  - Command: `npm run build`
  - Result: `tsc && vite build` succeeded, `✓ built in 3.36s`. Pre-existing
    chunk-size warning for `dist/assets/index.js` (981.88 kB) unrelated to
    this change.

## Notes

- BE suite emitted existing MQTT thread/unraisable-exception warnings
  during teardown (pre-existing, unrelated to this change). Run still
  passed with 0 failures.
- Vitest emitted existing Lit dev-mode/update warnings (pre-existing).
- Nothing could NOT be established: all acceptance points from the brief
  verified against the diff and confirmed green under foreground gates.
