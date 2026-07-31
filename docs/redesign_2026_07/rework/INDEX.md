# F1 wizard rework — RCA + UX-spec index

Owner rejected the F1 release (branch `f1-plan3.6-impl`, deployed as a DEBUG env) with six
defects. This bundle is the analysis + design spec for the rework. **Docs only, no code
changes.** Branch `f1/rework-rca-spec` off `f1-plan3.6-impl`.

All four RCAs and the UX spec were adversarially reviewed (`review-adversarial-review-f1-rework-rca-5f0edf`,
opus). RCA-R1's root cause was substantially wrong in its first pass and has been corrected in
place — see [RCA-R1.md](RCA-R1.md#correction-2026-07-25). R2, R3, R4, and the UX-spec's own
groundings verified clean.

## Defects and root causes

| # | Defect | Doc | Root cause (1 line) | Severity | Effort (minimal / proper) |
|---|---|---|---|---|---|
| R1 | i18n raw/humanised fallback labels | [RCA-R1.md](RCA-R1.md) | 7 fields (5 pricing + 2 battery) missing from `CS_LABELS` in `www_v2/src/i18n/fields.ts` → humanised fallback, not raw key as first diagnosed | MEDIUM | S (~5 min) / S (~10 min) |
| R2 | wizard not seeded from existing options | [RCA-R2.md](RCA-R2.md) | `steps.py:3404-3410`: `_map_backend_to_frontend` exception swallowed, falls back to `frontend_pricing={}` — drops seeded values silently | MEDIUM-HIGH | S (~30 lines) / M (~150 lines, phased) |
| R3 | commercial/supplier pricing regression | [RCA-R3.md](RCA-R3.md) | Registry pricing section carries only 5 `confirmed_distribution_*` fields; 19 legacy supplier-price fields (spot scenarios, dual tariff, fees) never ported from `config/steps.py` into `config_registry.py` | CRITICAL | S (~2-3h) / M (~1-2 days) |
| R4 | solar step no prefill | [RCA-R4.md](RCA-R4.md) | `config/steps.py:1687-1688` hardcodes Prague `50.0/14.0` fallback instead of reading existing options or `hass.config` lat/lon | MEDIUM | S / M (shared prefill helper) |
| R5 | AI motivation missing | [UX-SPEC-wizard-v2.md](UX-SPEC-wizard-v2.md) §5 | Design gap, not a code regression — spec adds an "AI: why and what for" intro block | — | design, in spec |
| R6 | overall wizard UX confusing | [UX-SPEC-wizard-v2.md](UX-SPEC-wizard-v2.md) | Design gap — spec restructures the wizard into a 10-step flow with review-mode | — | design, in spec |

## Priority read order

1. **R3** (CRITICAL) — commercial/supplier pricing is the highest-severity regression; blocks any
   user with a supplier contract from configuring their price model at all.
2. **R2** (MEDIUM-HIGH) — silent seeding failure breaks the "review your config, nothing lost"
   promise (D11/K2e) for every already-configured user.
3. **R1, R4** (MEDIUM) — visible but narrow-surface defects, cheap fixes.
4. **UX-SPEC** (R5/R6) — the redesign this analysis feeds: wizard v2 step structure, review-mode
   vs new-install mode, restored commercial-price section (19 fields, matches R3's inventory),
   AI-intro block, visual hierarchy guidance. All user-facing copy in Czech.

## What changed after adversarial review

- RCA-R1: root cause corrected (wrong file/mechanism in the first pass — see doc). Leak surface
  corrected from a claimed 30 fields to the actual 7 (5 pricing + 2 battery); solar fields (15)
  and 8 of 10 battery fields were never leaking.
- UX-SPEC-wizard-v2.md: 3 sections (Step 3 solar, Step 4 pricing, Step 6 battery) corrected to
  match R1's fixed root cause and field inventory; Step 6 now supplies the CZ copy for the 2
  fields actually missing (`balancing_opportunistic_threshold`/`balancing_economic_threshold`)
  instead of duplicate copy for 2 fields that were already translated.
- R2, R3, R4, and the rest of the UX-spec (AI §5, restored pricing §4, scope) verified grounded,
  no changes.

K2e repair-banner: SUPERSEDED by wizard review-mode. (phase D1, 2026-07-26)
