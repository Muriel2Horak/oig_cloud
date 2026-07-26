/**
 * OIG Cloud V2 — Enum-value label catalog.
 *
 * UX-SPEC §6: "no raw enum value is ever a visible label" — every `enum`-typed
 * registry field must render a human Czech label per allowed value. Same
 * shape/fallback pattern as `i18n/fields.ts`'s `CS_LABELS`: `field.<key>.enum.<value>`
 * → CZ string, falling back to the raw value for an uncatalogued enum so a
 * future value degrades safely instead of throwing.
 */

const CS_ENUM_LABELS: Record<string, string> = {
  // solar_forecast_provider (live-walk defect 1, UX-SPEC §Step 3)
  'field.solar_forecast_provider.enum.forecast_solar': 'Forecast.Solar (zdarma, bez registrace)',
  'field.solar_forecast_provider.enum.solcast': 'Solcast (přesnější, vyžaduje registraci)',

  'field.solar_forecast_mode.enum.hourly': 'Každou hodinu (vyžaduje API klíč)',
  'field.solar_forecast_mode.enum.every_4h': 'Každé 4 hodiny (vyžaduje API klíč)',
  'field.solar_forecast_mode.enum.daily_optimized': 'Denně, optimalizovaně (výchozí)',

  // data_source_mode (Task 20, UX-SPEC §Step 8) — 'hybrid' deliberately has
  // NO entry: it is filtered out of rendered options in step-connection.ts,
  // never reaches this fallback.
  'field.data_source_mode.enum.cloud_only': 'Přes OIG Cloud (výchozí — funguje vždy)',
  'field.data_source_mode.enum.local_only': 'Přímo z boxu po domácí síti (rychlejší, bez internetu)',

  // boiler_alt_source_type — same wording already shipped in the legacy
  // settings tab's hardcoded SOLAR/BOILER field list (settings/index.ts),
  // reused verbatim here so the registry-driven wizard step matches it.
  'field.boiler_alt_source_type.enum.gas': 'Plyn',
  'field.boiler_alt_source_type.enum.heat_pump': 'Tepelné čerpadlo',
  'field.boiler_alt_source_type.enum.fireplace': 'Krb',
  'field.boiler_alt_source_type.enum.other': 'Jiný',

  // spot_pricing_model / export_pricing_model — condensed from the fields'
  // own hint text (fields.ts field.spot_pricing_model.hint /
  // field.export_pricing_model.hint), same three scenarios.
  'field.spot_pricing_model.enum.percentage': 'SPOT + procento (variabilní)',
  'field.spot_pricing_model.enum.fixed': 'SPOT + fixní poplatek',
  'field.spot_pricing_model.enum.fixed_prices': 'Fixní cena (FIX)',
  'field.export_pricing_model.enum.percentage': 'SPOT − procento (variabilní)',
  'field.export_pricing_model.enum.fixed': 'SPOT − fixní srážka',
  'field.export_pricing_model.enum.fixed_prices': 'Fixní cena (FIX)',

  // ai_provider — not rendered as a generic select today (the AI step uses
  // its own PROVIDER_GUIDES card chooser, step-ai.ts), covered defensively
  // so a future generic-select rendering never regresses to raw values.
  'field.ai_provider.enum.ai_task': 'Vlastní AI v Home Assistantu (ai_task)',
  'field.ai_provider.enum.groq': 'Groq',
  'field.ai_provider.enum.nvidia': 'NVIDIA',
};

/** Falls back to the raw enum value — never throws, matches CS_LABELS' fallback pattern. */
export function enumLabel(key: string, value: string): string {
  return CS_ENUM_LABELS[`field.${key}.enum.${value}`] ?? value;
}
