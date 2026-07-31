# Pricelist Serving Fix

- Guilty layer: `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts`
- Root cause: `applyDistributionFeeSuggestion()` treated registry defaults as the only "untouched" signal. Once a tariff auto-filled VT/NT once, the draft values no longer matched the defaults, so later tariff changes kept the stale suggestion instead of refreshing it.
- Fix:
  - Track the last auto-suggested VT/NT values in the wizard.
  - Refresh a field when it is `null`/`undefined`, still at the registry default, or still equal to the prior auto-suggested value.
  - Clear the suggestion memory on bootstrap/reset paths.

## Failing-Test-First Proof

- Added regression in `custom_components/oig_cloud/www_v2/src/__tests__/onboarding-pricing-distribution.test.ts`.
- Red run before the fix:
  - Command: `npx vitest run src/__tests__/onboarding-pricing-distribution.test.ts -t "refreshes the suggested distribution fees for every CEZ sazba instead of keeping the first suggestion"`
  - Failure: `expected 2.67 to be 2.08`
- Green run after the fix:
  - Same command passed.

## Gates

- BE suite:
  - Command: `/repos/oig-cloud/.ha-env/bin/python -m pytest`
  - Result: `4802 passed, 27 skipped, 41 warnings in 176.09s (0:02:56)`
- FE typecheck:
  - Command: `npx tsc --noEmit`
  - Result: exit code `0`
- FE tests:
  - Command: `npx vitest run`
  - Result: `88 passed (88), 1752 passed (1752)`
- FE build:
  - Command: `npm run build`
  - Result: build succeeded, `vite` completed in `3.10s`

## Notes

- The backend suite emitted existing MQTT thread/unraisable warnings during teardown. The run still passed.
- Vitest emitted existing Lit dev-mode/update warnings. The run still passed.
- The build emitted the existing chunk-size warning for `dist/assets/index.js`. Build still succeeded.
