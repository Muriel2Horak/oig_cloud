# F1 rework Phase A — integration report

Branch: `f1/rework-impl` — tip `0dd68c8ab` (pushed to origin).
Base: `aa00fe923` (`f1-plan3.6-impl`, merged "gates green").
Orchestrator slice: `fix-phase-a-implement-r1-r2-r4-fixes-7a53c1`.

## Scope delivered

Four units, each authored by a worker, reviewed by a different model, integrated.

| unit | change | author slice | review slice | verdict |
|---|---|---|---|---|
| R1 (fe/fix) | 7 missing `CS_LABELS` + registry-label coverage regression test | `task-r1-add-7-missing-cs-labels-regis-50dfdb` | `review-unit-1-r1-7-cz-labels-reg-990da5` (opus) | delivered |
| R4 (java/fix) | remove hardcoded Prague GPS fallback; expose `hass.config` GPS as suggestion | `task-r4-remove-hardcoded-prague-gps-f-2e328c` | `review-unit-2-r4-solar-gps-prefi-da9d35` (opus) | delivered |
| R2 (java/fix) | stop silent pricing-mapping swallow; seed wizard from existing options | `task-r2-stop-silent-pricing-mapping-s-e69a8e` | `review-unit-3-r2-wizard-seeding-f4fd8d` (opus-3) | delivered |
| R3 (java/author) | restore `pricing_supplier` registry section + dual-ness derivation + labels + REST round-trip + FE render | `task-r3-restore-supplier-pricing-regi-84675b` | `review-unit-4-r3-supplier-pricin-20b097` (opus) | delivered |

Commits on the branch: R4 `9ef6e10f5`, R2 `a478bdb59`, R1 `a70bb3db8`, R3 `0dd68c8ab`
(docs RCA-R1..R4 + UX-SPEC round 2 merged in ahead of them).

## Gates

Files changed by Phase A (`aa00fe923..0dd68c8ab`):
`api/ha_rest_api.py`, `config/steps.py`, `config_registry.py`,
`www_v2/src/{data/settings-data.ts,i18n/fields.ts,ui/features/settings/index.ts}`,
docs, and `tests/{test_config_flow_entry,test_config_options_flow,test_config_registry,test_config_steps_pricing,test_ha_rest_api_more,test_ha_rest_api_views}.py`.

- pytest (full, `.ha-env`) — verified green by the integrate workers and independently by
  `task-independent-full-gate-verificati-30f84b` (qwen3.7-max, delivered) at tip `0dd68c8ab`.
- FE `npx tsc --noEmit` + `npx vitest run` — verified green, same slices.
- flake8 (`--max-line-length=120`) over changed `.py` files — **base-vs-change diff is EMPTY**.
  Base `aa00fe923` and tip `0dd68c8ab` both emit the SAME 14 violations
  (7×F811, 2×F401, 4×E501, 1×E203). Phase A introduced **zero** new lint violations.

## Pre-existing lint debt — NOT fixed here (out of scope, flagged for the human)

The 14 flake8 violations above are inherited from the base branch, untouched by R1/R2/R3/R4:

- `tests/test_ha_rest_api_views.py` — 7×F811: seven test functions are defined twice; the later
  definition silently shadows the earlier one, so pytest only ever ran the later copy. This is
  latent lost coverage that predates Phase A.
- `tests/test_ha_rest_api_more.py` — 2×F401: unused `datetime`/`timezone` imports.
- `api/ha_rest_api.py` (3×E501), `config_registry.py` (1×E501), `config/steps.py` (1×E203) —
  pre-existing style nits.

A fix slice was drafted (`fix-flake8-gate-dedup-7-f811-sha-cccc19`, patch in its bundle) but was
**declined for merge** here. Reason: for 4 of the 7 F811s it *deletes* the later (actually-running)
test body and keeps the earlier one, which changes which body executes; that is only safe if each
deleted body is semantically identical to its surviving twin, which was not verified by a review.
Merging an unreviewed test-deletion under turn-budget pressure, to clean debt Phase A did not
introduce, is the wrong trade. Recommendation: a dedicated, reviewed lint-debt slice that fixes the
F811s by **renaming** (restoring the shadowed coverage) rather than deleting — and only deletes a
copy after confirming it is a true duplicate.

## Status

Phase A complete. Deliverable committed and pushed to `origin/f1/rework-impl`. No merge to
`f1-plan3.6-impl`/`main`, no deploy — as scoped.
