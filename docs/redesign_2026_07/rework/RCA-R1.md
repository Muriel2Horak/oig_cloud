# RCA-R1 — i18n raw fallback labels (pricing step + wizard-wide)

Source: worker `task-f1-rca-r1-i18n-raw-label-root-ca-2dbf99` (fe/research), verified against
`custom_components/oig_cloud/config_registry.py`, `strings.json`, `translations/cs.json` on
branch `f1-plan3.6-impl` (base_sha `aa00fe923eb5f94ca62f15d64fc0443247114e41`).

## Root cause (2 lines)

Five pricing-section `Field()` entries in `config_registry.py:406-442`
(`confirmed_distribution_distributor/tariff/price_incl_vat/price_excl_vat/unit`) are
registered with no explicit `label`/`hint`. `Field.__post_init__` (`config_registry.py:47-51`)
auto-generates the i18n keys `field.{key}.label` / `field.{key}.hint` for any field missing
them — but no `"field"` section exists in `strings.json` or `translations/cs.json`, so the
frontend renders the raw key text.

## Verification performed (orchestrator)

- Confirmed `config_registry.py:406-442` — all 5 pricing fields lack `label=`/`hint=` kwargs.
- Confirmed `Field.__post_init__` (`config_registry.py:47-51`) generates
  `f"field.{self.key}.label"` only `if not self.label` — i.e. exactly the fallback path these
  5 fields hit.
- Confirmed `grep '"field"' strings.json` and `translations/cs.json` — zero matches, no
  `"field"` section in either file.
- Confirmed `registry_as_api_dict()` (`config_registry.py:237-268`) serializes `f.label`/
  `f.hint` verbatim to the FE — the raw fallback string ships as-is, not resolved client-side.
- Did not independently re-derive the solar/battery leak lists (15 + 10 fields) line-by-line;
  spot-checked 3 of the 25 against `config_registry.py` solar/battery sections and found the
  same no-label pattern. Trusted for the remainder pending R6 adversarial review.

## Full EN-leak inventory

**Pricing step (confirmed R1 defect, 5 fields):**
`confirmed_distribution_distributor`, `confirmed_distribution_tariff`,
`confirmed_distribution_price_incl_vat`, `confirmed_distribution_price_excl_vat`,
`confirmed_distribution_unit`.

**Solar step (same root cause, not previously reported, 15 fields):**
`solar_forecast_provider`, `solar_forecast_mode`, `solar_forecast_api_key`, `solcast_api_key`,
`solcast_site_id`, `solar_forecast_latitude`, `solar_forecast_longitude`,
`solar_forecast_string1_enabled`, `solar_forecast_string1_kwp`,
`solar_forecast_string1_declination`, `solar_forecast_string1_azimuth`,
`solar_forecast_string2_enabled`, `solar_forecast_string2_kwp`,
`solar_forecast_string2_declination`, `solar_forecast_string2_azimuth`.

**Battery step (same root cause, not previously reported, 10 fields):**
`auto_mode_switch_enabled`, `charge_rate_kw`, `expensive_percentile`,
`battery_comfort_soc_percent`, `balancing_enabled`, `balancing_interval_days`,
`balancing_hold_hours`, `balancing_opportunistic_threshold`, `balancing_economic_threshold`,
`cheap_window_percentile`.

**Total: 30 fields across pricing/solar/battery sections.** All other wizard step labels
(`wizard_pricing_distribution.data.tariff_count` etc.) are properly keyed under
`config.step.wizard_*` in both `strings.json` and `translations/cs.json` — no EN/CZ leak found
outside the field-registry auto-generated path.

## Fix proposals

### Minimal (effort S, ~2 min) — pricing step only

Add a `"field"` section to `strings.json` (EN source) and `translations/cs.json` (CZ) with
`label`/`hint` for the 5 `confirmed_distribution_*` keys. Stops the reported defect; leaves the
25 solar/battery leaks live.

### Proper (effort M, ~15-20 min) — all 30 fields, both languages

Same mechanism, extended to all 30 field-registry keys missing explicit labels (pricing +
solar + battery), in both `strings.json` and `translations/cs.json`. Closes the whole class —
any future `Field()` added without a label degrades the same way, so pair this with a CI
lint (grep `FIELD_REGISTRY` keys against `translations/cs.json` `"field"` keys, fail on gap)
to prevent recurrence. No code change needed either way — pure translation data.

## Severity and recommendation

HIGH — visibly broken UX (raw snake_case-derived English strings in a Czech product), and the
defect the owner specifically named. Low effort, low risk (translation JSON only, no logic
change). Recommendation: ship the proper fix directly (M vs S effort delta is minutes) plus the
CI lint, rather than patching pricing alone and leaving 25 more leaks to be found later.

## Not established (worker-reported gaps)

- Whether `self.hass` being `None` mid-flow (a separate R4-adjacent edge case) could route
  through a different, non-registry label path — not investigated here, out of R1 scope.
- Live-render confirmation (screenshot) not taken — code/data analysis only.
