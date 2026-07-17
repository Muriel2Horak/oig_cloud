/**
 * Trimmed real `/config_registry` body used by the solar conditional-visibility
 * specs (PLAN3 Task 4).
 *
 * Only the `solar` section fields the specs assert on are present. The
 * provider select has no `show_if` (always visible); the forecast.solar and
 * Solcast credential blocks are each gated on the matching provider value.
 *
 * Verbatim mirror of `config_registry.py` RegistrySpec — see
 * `src/data/registry-data.ts` `RegistrySpec` for the FE contract.
 */

import type { FieldRegistry } from '@/data/registry-data';

export const REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['solar'],
  fields: {
    // Provider select — always visible (no show_if).
    solar_forecast_provider: {
      section: 'solar',
      type: 'str',
      scope: 'premium',
      label: 'field.solar_forecast_provider.label',
      hint: 'field.solar_forecast_provider.hint',
      default: 'forecast_solar',
      enum: ['forecast_solar', 'solcast'],
    },
    // forecast.solar block — visible only when provider = forecast_solar.
    solar_forecast_api_key: {
      section: 'solar',
      type: 'str',
      scope: 'premium',
      secret: true,
      optional: true,
      label: 'field.solar_forecast_api_key.label',
      hint: 'field.solar_forecast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    solar_forecast_mode: {
      section: 'solar',
      type: 'str',
      scope: 'premium',
      label: 'field.solar_forecast_mode.label',
      hint: 'field.solar_forecast_mode.hint',
      default: 'hourly',
      enum: ['hourly', 'four_hour'],
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    // Solcast block — visible only when provider = solcast.
    solcast_api_key: {
      section: 'solar',
      type: 'str',
      scope: 'premium',
      secret: true,
      label: 'field.solcast_api_key.label',
      hint: 'field.solcast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['solcast'] },
    },
    solcast_site_id: {
      section: 'solar',
      type: 'str',
      scope: 'premium',
      label: 'field.solcast_site_id.label',
      hint: 'field.solcast_site_id.hint',
      show_if: { field: 'solar_forecast_provider', in: ['solcast'] },
    },
  },
};
