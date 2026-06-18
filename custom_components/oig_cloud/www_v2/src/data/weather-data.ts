/**
 * OIG Cloud V2 — Weather forecast data layer
 *
 * Reads the current conditions from a Home Assistant `weather.*` entity and
 * fetches the hourly + daily forecast via the `weather.get_forecasts` service
 * (return_response). This is a real meteorological forecast (temperature,
 * condition, precipitation) — distinct from the ČHMÚ warnings ([[chmu-data]])
 * and from the PV/solar production forecast shown on the Solar tile.
 */

import { haClient } from '@/data/ha-client';
import { oigLog } from '@/core/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface WeatherForecastEntry {
  datetime: string;
  condition: string;
  temperature: number | null;
  templow: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  windSpeed: number | null;
}

export interface WeatherData {
  available: boolean;
  entityId: string | null;
  /** Current condition (HA condition slug). */
  condition: string;
  temperature: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  tempUnit: string;
  windUnit: string;
  hourly: WeatherForecastEntry[];
  daily: WeatherForecastEntry[];
}

export const EMPTY_WEATHER_DATA: WeatherData = {
  available: false,
  entityId: null,
  condition: '',
  temperature: null,
  apparentTemperature: null,
  humidity: null,
  windSpeed: null,
  tempUnit: '°C',
  windUnit: 'km/h',
  hourly: [],
  daily: [],
};

// ============================================================================
// CONDITION → icon / label  (Home Assistant weather condition slugs)
// ============================================================================

const CONDITION_ICON: Record<string, string> = {
  'clear-night': 'mdi:weather-night',
  cloudy: 'mdi:weather-cloudy',
  fog: 'mdi:weather-fog',
  hail: 'mdi:weather-hail',
  lightning: 'mdi:weather-lightning',
  'lightning-rainy': 'mdi:weather-lightning-rainy',
  partlycloudy: 'mdi:weather-partly-cloudy',
  pouring: 'mdi:weather-pouring',
  rainy: 'mdi:weather-rainy',
  snowy: 'mdi:weather-snowy',
  'snowy-rainy': 'mdi:weather-snowy-rainy',
  sunny: 'mdi:weather-sunny',
  windy: 'mdi:weather-windy',
  'windy-variant': 'mdi:weather-windy-variant',
  exceptional: 'mdi:weather-cloudy',
};

const CONDITION_LABEL: Record<string, string> = {
  'clear-night': 'Jasná noc',
  cloudy: 'Zataženo',
  fog: 'Mlha',
  hail: 'Krupobití',
  lightning: 'Bouřky',
  'lightning-rainy': 'Bouřky s deštěm',
  partlycloudy: 'Polojasno',
  pouring: 'Vydatný déšť',
  rainy: 'Déšť',
  snowy: 'Sněžení',
  'snowy-rainy': 'Déšť se sněhem',
  sunny: 'Slunečno',
  windy: 'Větrno',
  'windy-variant': 'Větrno',
  exceptional: 'Výjimečné počasí',
};

export function weatherConditionIcon(condition: string): string {
  return CONDITION_ICON[condition] ?? 'mdi:weather-cloudy';
}

export function weatherConditionLabel(condition: string): string {
  return CONDITION_LABEL[condition] ?? (condition || 'Počasí');
}

// ============================================================================
// ENTITY DISCOVERY + EXTRACTION
// ============================================================================

/** First usable `weather.*` entity from the HA state machine. */
export function findWeatherEntityId(): string | null {
  const states = haClient.getHassSync()?.states ?? {};
  const ids = Object.keys(states).filter((id) => id.startsWith('weather.'));
  // Prefer an entity that is currently reporting a condition.
  const live = ids.find((id) => {
    const s = states[id]?.state;
    return s && s !== 'unavailable' && s !== 'unknown';
  });
  return live ?? ids[0] ?? null;
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function mapEntry(raw: Record<string, unknown>): WeatherForecastEntry {
  return {
    datetime: String(raw.datetime ?? ''),
    condition: String(raw.condition ?? ''),
    temperature: num(raw.temperature),
    templow: num(raw.templow),
    precipitation: num(raw.precipitation),
    precipitationProbability: num(raw.precipitation_probability),
    windSpeed: num(raw.wind_speed),
  };
}

async function fetchForecast(entityId: string, type: 'hourly' | 'daily'): Promise<WeatherForecastEntry[]> {
  try {
    const res = await haClient.callWS<{ response?: Record<string, { forecast?: Record<string, unknown>[] }> }>({
      type: 'call_service',
      domain: 'weather',
      service: 'get_forecasts',
      service_data: { type },
      target: { entity_id: entityId },
      return_response: true,
    });
    const forecast = res?.response?.[entityId]?.forecast ?? [];
    return forecast.map(mapEntry);
  } catch (err) {
    oigLog.debug(`weather.get_forecasts(${type}) failed`, { entityId, err: String(err) });
    return [];
  }
}

/**
 * Load current conditions + hourly/daily forecast for the discovered weather
 * entity. Returns EMPTY_WEATHER_DATA when no weather entity is configured.
 */
export async function loadWeatherData(): Promise<WeatherData> {
  const entityId = findWeatherEntityId();
  if (!entityId) return EMPTY_WEATHER_DATA;

  const state = haClient.getHassSync()?.states?.[entityId];
  if (!state) return { ...EMPTY_WEATHER_DATA, entityId };

  const a = state.attributes ?? {};
  const [hourly, daily] = await Promise.all([
    fetchForecast(entityId, 'hourly'),
    fetchForecast(entityId, 'daily'),
  ]);

  return {
    available: true,
    entityId,
    condition: state.state || '',
    temperature: num(a.temperature),
    apparentTemperature: num(a.apparent_temperature),
    humidity: num(a.humidity),
    windSpeed: num(a.wind_speed),
    tempUnit: String(a.temperature_unit ?? '°C'),
    windUnit: String(a.wind_speed_unit ?? 'km/h'),
    hourly,
    daily,
  };
}
