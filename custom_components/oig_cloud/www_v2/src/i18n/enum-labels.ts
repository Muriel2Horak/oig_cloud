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
  'field.solar_forecast_mode.enum.hourly': 'Každou hodinu (vyžaduje API klíč)',
  'field.solar_forecast_mode.enum.every_4h': 'Každé 4 hodiny (vyžaduje API klíč)',
  'field.solar_forecast_mode.enum.daily_optimized': 'Denně, optimalizovaně (výchozí)',

  // data_source_mode (Task 20, UX-SPEC §Step 8) — 'hybrid' deliberately has
  // NO entry: it is filtered out of rendered options in step-connection.ts,
  // never reaches this fallback.
  'field.data_source_mode.enum.cloud_only': 'Přes OIG Cloud (výchozí — funguje vždy)',
  'field.data_source_mode.enum.local_only': 'Přímo z boxu po domácí síti (rychlejší, bez internetu)',
};

/** Falls back to the raw enum value — never throws, matches CS_LABELS' fallback pattern. */
export function enumLabel(key: string, value: string): string {
  return CS_ENUM_LABELS[`field.${key}.enum.${value}`] ?? value;
}
