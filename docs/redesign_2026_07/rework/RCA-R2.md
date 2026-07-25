# RCA-R2 — wizard not seeded from existing options

Source: worker `task-f1-rca-r2-wizard-not-seeded-from-73ff16` (fe/research), verified against
`custom_components/oig_cloud/config/steps.py`, `docs/redesign_2026_07/DECISIONS.md` on branch
`f1-plan3.6-impl` (base_sha `aa00fe923eb5f94ca62f15d64fc0443247114e41`).

## Root cause (2 lines)

`OigCloudOptionsFlowHandler.__init__` (`config/steps.py:3374-3410`) DOES seed `_wizard_data`
from `config_entry.options` for an existing entry — there is no separate reconfigure flow
(`async_get_options_flow` at `steps.py:3364` is the only entry point), so this handler is
what every re-entering user hits. The gap is narrower than the ticket states: the pricing
backend->frontend mapping (`_map_backend_to_frontend`, `steps.py:3405-3408`) is wrapped in a
bare `except Exception` that on failure leaves `frontend_pricing = {}` — silently dropping ALL
pricing-section seeding (not other sections) and falling through to hardcoded step defaults
(15.0, 9.0, 1.42, 0.91, 4.50 ...) with no visible error to the user.

## Verification performed (orchestrator)

- Confirmed `steps.py:3364` `async_get_options_flow` is the sole options-flow entry point —
  no separate `async_step_reconfigure` exists in this file, so an existing-entry user's wizard
  re-entry always goes through `OigCloudOptionsFlowHandler.__init__`, which does read
  `config_entry.options` (line ~3386) and does merge `self._wizard_data = backend_options |
  frontend_pricing` (line ~3410).
- Confirmed the exact exception-swallow at `steps.py:3404-3408`:
  `frontend_pricing = {}` initialized before the `try`, `except Exception: _LOGGER.exception(...)`
  with no re-raise and no fallback population — matches worker's citation exactly.
- Confirmed `DECISIONS.md:47` (D11): *"Kdo už config má, nic neztratí"* ("whoever already has a
  config loses nothing") and `DECISIONS.md:177` (K2e): pre-seed existing EFFECTIVE values into
  the wizard on upgrade — both confirm the promise this defect violates.
- Did not independently re-derive the full backend->frontend key mapping table (pricing
  import/export/distribution sections, ~15 keys) worker reported at `steps.py:1952-2385` —
  spot-checked `dual_tariff_enabled -> tariff_count` and `distribution_fee_vt_kwh` (direct) as
  plausible given RCA-R3's key inventory; not re-verified line-by-line.
- Did not reproduce the exception path (would require simulating a malformed `backend_options`)
  or check production logs for `"OptionsFlow init: pricing mapping failed"` occurrences.
- **Discrepancy with the original ticket wording**, same pattern as RCA-R4: "wizard drafts are
  NOT seeded... sees dataset defaults, not their own values" describes a total seeding failure;
  the code shows seeding working for basic/solar/battery/modules sections and only the pricing
  mapping being fragile. Flagging for R6 adversarial review: either (a) the pricing exception
  path is in fact the sole cause and non-pricing sections seed correctly on the live DEBUG env
  too (ticket description is imprecise), or (b) a second, still-unfound defect causes the
  broader "sees dataset defaults" symptom the owner reported and this RCA only explains the
  pricing slice of it. Not live-tested against the deployed DEBUG environment.

## Fix proposals

### Minimal (effort S, ~30 lines)

`steps.py:3404-3408`: on `_map_backend_to_frontend` exception, fall back to a best-effort direct
copy of `backend_options` into `frontend_pricing` (raw backend keys) instead of `{}`, so pricing
fields show SOME prior value instead of silently reverting to hardcoded defaults. Log stays, add
a user-visible non-blocking warning if feasible.

### Proper (effort M, ~150 lines, 2-3 releases to deprecate legacy keys)

Unify field naming: stop maintaining two parallel key systems (backend `spot_pricing_model` /
frontend `import_pricing_scenario`, etc.) — migrate existing entries to one canonical registry
name on first OptionsFlow open post-upgrade. Removes the mapping layer entirely, so there is no
mapping-failure path left to have this class of bug. Overlaps with RCA-R3's registry-restoration
work — coordinate: if R3's proper fix (registry pricing_supplier section) ships, this becomes
the natural place to also collapse the two naming systems in one pass.

## Severity and recommendation

MEDIUM-HIGH — silent, no user-visible error, and hits exactly the promise (D11/K2e) the owner
cited when rejecting the release. Recommendation: ship the minimal fix immediately (raw-copy
fallback removes the silent-default-revert risk with a small, low-risk change); fold the proper
fix into R3's registry-restoration work since both touch the same backend/frontend pricing key
mapping.

## Not established (worker-reported gaps)

- Whether the `_map_backend_to_frontend` exception has ever fired in production — no log access.
- Exact repro steps for the owner's reported symptom — ticket does not cite one; worker inferred
  the failure mode from code reading only.
- Whether non-pricing sections (solar/battery/basic/modules) seed correctly on the actual
  deployed DEBUG environment, or only in this code-reading analysis.
