# RCA-R1 — i18n raw/humanised fallback labels (pricing + battery steps)

Source: worker `task-f1-rca-r1-i18n-raw-label-root-ca-2dbf99` (fe/research); root cause
corrected after adversarial review (`review-adversarial-review-f1-rework-rca-5f0edf`, opus,
`rework:trivial`-scoped but substantial on this doc — see "Correction" below). Verified against
`custom_components/oig_cloud/www_v2/src/i18n/fields.ts` and `config_registry.py` on branch
`f1-plan3.6-impl`.

## Correction (2026-07-25)

The first pass of this RCA misdiagnosed the mechanism: it grepped `strings.json`/
`translations/cs.json` — the **HA-native (Python) config-flow** translation layer — and
concluded the registry-driven FE reads raw `field.<key>.label` keys from there. It does not.

The registry-driven FE wizard resolves labels via `fieldLabel()` in
`custom_components/oig_cloud/www_v2/src/i18n/fields.ts:132-133`:

```
return CS_LABELS[i18nKey] ?? key.replace(/_/g, ' ')
```

This **never** returns a raw `field.<key>.label` string — the file's own header
(`fields.ts:8,13`) states it exists precisely so that key never leaks. A key missing from
`CS_LABELS` instead falls back to a **humanised** key (`confirmed_distribution_distributor` →
"confirmed distribution distributor") — English-looking snake-derived text in a CZ UI, which is
plausibly what the owner actually saw, but a different bug in a different file than first
reported. `strings.json`/`cs.json` are irrelevant to this defect: the HA-native flow's
`wizard_pricing_distribution.data.*` keys are already translated there and never touch this path.

## Root cause (2 lines)

Two fields in the pricing section (5 keys) and two in the battery section lack an entry in
`CS_LABELS` (`www_v2/src/i18n/fields.ts`). `fieldLabel()` falls back to a humanised
(underscore-to-space) rendering of the raw key for exactly those fields — everything else in
solar/battery already has a `CS_LABELS` entry and renders correctly in Czech.

## Verification performed (orchestrator, against `fields.ts`)

- `grep confirmed_distribution fields.ts` — **zero matches**. All 5
  `confirmed_distribution_distributor/tariff/price_incl_vat/price_excl_vat/unit` keys are
  missing from `CS_LABELS`. Confirmed defect.
- `grep balancing_ fields.ts` — `balancing_enabled`, `balancing_interval_days`,
  `balancing_hold_hours` present (lines 32-34); `balancing_opportunistic_threshold` and
  `balancing_economic_threshold` **absent**. Confirmed defect (2 of 10 battery fields).
- Spot-checked the remaining disputed battery/solar keys: `expensive_percentile` (line 30),
  `battery_comfort_soc_percent` (line 31), `auto_mode_switch_enabled` (line 28),
  `charge_rate_kw` (line 29), `cheap_window_percentile` (line 35), `solar_forecast_provider`
  (line 38), `solar_forecast_mode` (line 81), `solar_forecast_string1_kwp` (line 44) — **all
  present** in `CS_LABELS`. Not leaking.
- Confirmed `fieldLabel()` (`fields.ts:132-133`) implementation — humanised fallback, never
  raw-key.

## Full EN-leak inventory (corrected)

**Pricing step (5 fields, all missing from `CS_LABELS`):**
`confirmed_distribution_distributor`, `confirmed_distribution_tariff`,
`confirmed_distribution_price_incl_vat`, `confirmed_distribution_price_excl_vat`,
`confirmed_distribution_unit`.

**Battery step (2 of 10 fields missing from `CS_LABELS`):**
`balancing_opportunistic_threshold`, `balancing_economic_threshold`.

**Solar step: not leaking.** All 15 solar fields listed in the original pass
(`solar_forecast_provider`, `solar_forecast_mode`, `solar_forecast_api_key`, `solcast_api_key`,
`solcast_site_id`, `solar_forecast_latitude`, `solar_forecast_longitude`,
`solar_forecast_string1/2_enabled/kwp/declination/azimuth`) already have `CS_LABELS` entries.

**Battery step: 8 of 10 not leaking.** `auto_mode_switch_enabled`, `charge_rate_kw`,
`expensive_percentile`, `battery_comfort_soc_percent`, `balancing_enabled`,
`balancing_interval_days`, `balancing_hold_hours`, `cheap_window_percentile` all present.

**Total: 7 fields leak (5 pricing + 2 battery)**, not 30. All render **humanised**, not raw-key.

## Fix proposals

### Minimal (effort S, ~5 min) — pricing step only

Add 5 entries to `CS_LABELS` (and matching `CS_HINTS` if hints are wanted) in
`www_v2/src/i18n/fields.ts` for the `confirmed_distribution_*` keys. Stops the reported defect;
leaves the 2 battery leaks live.

### Proper (effort S, ~10 min) — all 7 fields

Same mechanism, add all 7 missing `CS_LABELS` entries (5 pricing + 2 battery) in one pass. Pure
frontend translation-data change, no `config_registry.py`/Python change, no `strings.json`/
`cs.json` change (those are a different layer and already correct). Optionally pair with a
lint/test asserting every registry field key used by the FE wizard has a `CS_LABELS` entry, to
catch future additions before they ship.

## Severity and recommendation

MEDIUM — visibly wrong copy in a Czech UI (5 pricing + 2 battery fields), but far smaller
surface than first reported (7 fields, not 30) and a one-file, non-logic fix. Recommendation:
ship the 7-field fix in `fields.ts` directly (S effort, minutes) — no CI-lint follow-up
required to close this specific defect, since it is not systemic (23 of 30 originally-suspected
fields were already correct).

## Not established (worker-reported gaps, still open)

- Whether `self.hass` being `None` mid-flow (a separate R4-adjacent edge case) could route
  through a different, non-registry label path — not investigated here, out of R1 scope.
- Live-render confirmation (screenshot) not taken — code/data analysis only.
- Whether the owner's reported leak was seen on the FE dashboard (humanised fallback, this doc's
  finding) or somewhere in the HA-native flow (translated already) — no live-env access to
  confirm which surface the owner actually saw.
