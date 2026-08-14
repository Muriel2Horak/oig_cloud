import type { FieldRegistry } from '@/data/registry-data';

export const SOLAR_REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['solar'],
  fields: {
    solar_forecast_provider: {
      section: 'solar', type: 'str', scope: 'premium',
      label: 'field.solar_forecast_provider.label',
      hint: 'field.solar_forecast_provider.hint',
      default: 'forecast_solar',
      enum: ['forecast_solar', 'solcast'],
    },
    solar_forecast_api_key: {
      section: 'solar', type: 'str', scope: 'premium', secret: true, optional: true,
      label: 'field.solar_forecast_api_key.label',
      hint: 'field.solar_forecast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    solar_forecast_mode: {
      section: 'solar', type: 'str', scope: 'premium',
      label: 'field.solar_forecast_mode.label',
      hint: 'field.solar_forecast_mode.hint',
      default: 'hourly',
      enum: ['hourly', 'every_4h', 'daily', 'daily_optimized'],
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    solcast_api_key: {
      section: 'solar', type: 'str', scope: 'premium', secret: true,
      label: 'field.solcast_api_key.label',
      hint: 'field.solcast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['solcast'] },
    },
    solcast_site_id: {
      section: 'solar', type: 'str', scope: 'premium',
      label: 'field.solcast_site_id.label',
      hint: 'field.solcast_site_id.hint',
      show_if: { field: 'solar_forecast_provider', in: ['solcast'] },
    },
    solar_forecast_latitude: {
      section: 'solar', type: 'float', scope: 'premium',
      label: 'field.solar_forecast_latitude.label',
      hint: 'field.solar_forecast_latitude.hint',
      min: -90, max: 90, step: 0.0001,
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    solar_forecast_longitude: {
      section: 'solar', type: 'float', scope: 'premium',
      label: 'field.solar_forecast_longitude.label',
      hint: 'field.solar_forecast_longitude.hint',
      min: -180, max: 180, step: 0.0001,
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    solar_forecast_string1_enabled: {
      section: 'solar', type: 'bool', scope: 'premium',
      label: 'field.solar_forecast_string1_enabled.label',
      hint: 'field.solar_forecast_string1_enabled.hint',
      default: true,
    },
    solar_forecast_string1_kwp: {
      section: 'solar', type: 'float', scope: 'premium',
      label: 'field.solar_forecast_string1_kwp.label',
      hint: 'field.solar_forecast_string1_kwp.hint',
      min: 0.1, max: 50, step: 0.1,
      show_if: { field: 'solar_forecast_string1_enabled', in: [true] },
    },
    solar_forecast_string1_declination: {
      section: 'solar', type: 'int', scope: 'premium',
      label: 'field.solar_forecast_string1_declination.label',
      hint: 'field.solar_forecast_string1_declination.hint',
      min: 0, max: 90,
      show_if: { field: 'solar_forecast_string1_enabled', in: [true] },
      show_if_all: [{ field: 'solar_forecast_provider', in: ['forecast_solar'] }],
    },
    solar_forecast_string1_azimuth: {
      section: 'solar', type: 'int', scope: 'premium',
      label: 'field.solar_forecast_string1_azimuth.label',
      hint: 'field.solar_forecast_string1_azimuth.hint',
      min: 0, max: 360, step: 1,
      show_if: { field: 'solar_forecast_string1_enabled', in: [true] },
      show_if_all: [{ field: 'solar_forecast_provider', in: ['forecast_solar'] }],
    },
    solar_forecast_string2_enabled: {
      section: 'solar', type: 'bool', scope: 'premium',
      label: 'field.solar_forecast_string2_enabled.label',
      hint: 'field.solar_forecast_string2_enabled.hint',
      default: false,
    },
    solar_forecast_string2_kwp: {
      section: 'solar', type: 'float', scope: 'premium',
      label: 'field.solar_forecast_string2_kwp.label',
      hint: 'field.solar_forecast_string2_kwp.hint',
      min: 0.1, max: 50, step: 0.1,
      show_if: { field: 'solar_forecast_string2_enabled', in: [true] },
    },
    solar_forecast_string2_declination: {
      section: 'solar', type: 'int', scope: 'premium',
      label: 'field.solar_forecast_string2_declination.label',
      hint: 'field.solar_forecast_string2_declination.hint',
      min: 0, max: 90,
      show_if: { field: 'solar_forecast_string2_enabled', in: [true] },
      show_if_all: [{ field: 'solar_forecast_provider', in: ['forecast_solar'] }],
    },
    solar_forecast_string2_azimuth: {
      section: 'solar', type: 'int', scope: 'premium',
      label: 'field.solar_forecast_string2_azimuth.label',
      hint: 'field.solar_forecast_string2_azimuth.hint',
      min: 0, max: 360, step: 1,
      show_if: { field: 'solar_forecast_string2_enabled', in: [true] },
      show_if_all: [{ field: 'solar_forecast_provider', in: ['forecast_solar'] }],
    },
  },
};

/** Default draft values: forecast_solar provider, string1 enabled with values, string2 disabled. */
export const DEFAULT_SOLAR_DRAFT: Record<string, unknown> = {
  solar_forecast_provider: 'forecast_solar',
  solar_forecast_latitude: 49.5,
  solar_forecast_longitude: 14.0,
  solar_forecast_string1_enabled: true,
  solar_forecast_string1_kwp: 5.4,
  solar_forecast_string1_declination: 35,
  solar_forecast_string1_azimuth: 180,
  solar_forecast_string2_enabled: false,
};

/** Empty registry for the "not available" test. */
export const EMPTY_SOLAR_REGISTRY: FieldRegistry = {
  sections: ['solar'],
  fields: {},
};

/** Both strings disabled — string kwp/declination/azimuth should be absent. */
export const ALL_HIDDEN_DRAFT: Record<string, unknown> = {
  solar_forecast_provider: 'forecast_solar',
  solar_forecast_latitude: 49.5,
  solar_forecast_longitude: 14.0,
  solar_forecast_string1_enabled: false,
  solar_forecast_string2_enabled: false,
};
