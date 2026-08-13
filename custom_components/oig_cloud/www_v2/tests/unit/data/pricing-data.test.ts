import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const haMocks = vi.hoisted(() => ({
  getHass: vi.fn(),
  fetchOIGAPI: vi.fn(),
}));

vi.mock('@/data/ha-client', () => ({ haClient: haMocks }));
vi.mock('@/core/logger', () => ({
  oigLog: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  buildModeSegments,
  fetchTimeline,
  invalidateTimelineCache,
  loadPricingData,
} from '@/data/pricing-data';
import type { TimelinePoint } from '@/ui/features/pricing/types';

const BASE_NOW = new Date('2030-06-15T12:00:00Z');
const QUARTER_HOUR_MS = 15 * 60 * 1000;

/** Mirrors toLocalISOString from pricing-data.ts:49-57 so timestamps
 *  match what the production code derives from the same system clock,
 *  regardless of the host timezone. */
function toLocalISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function timestamp(offset = 0): string {
  return toLocalISOString(new Date(BASE_NOW.getTime() + offset * QUARTER_HOUR_MS));
}

function timelinePoint(offset: number, overrides: Partial<TimelinePoint> = {}): TimelinePoint {
  return {
    timestamp: timestamp(offset),
    spot_price_czk: offset === 12 ? 100 : 10,
    export_price_czk: offset === 0 ? 100 : 10,
    battery_capacity_kwh: 10,
    solar_charge_kwh: 2,
    grid_charge_kwh: 1,
    grid_net: 0.5,
    load_kwh: 1.5,
    mode: 'HOME 1',
    ...overrides,
  };
}

function futureTimeline(length = 13): TimelinePoint[] {
  return Array.from({ length }, (_, index) => timelinePoint(index));
}

function statesForPricing(options: {
  batteryForecast?: { state?: string; attributes?: Record<string, unknown> } | null;
  exportPrice?: string;
  solarForecast?: { attributes: Record<string, unknown> } | null;
  spotPrice?: string;
  todayConsumptionWh?: string;
} = {}): Record<string, unknown> {
  const batteryForecast = options.batteryForecast === undefined
    ? {
        state: 'ok',
        attributes: {
          planned_consumption_today: 2,
          planned_consumption_tomorrow: 8,
          profile_today: 'Normal household',
          mode_optimization: {
            total_cost_czk: 123,
            total_savings_vs_home_i_czk: 45,
            alternatives: { 'DO NOTHING': { current_mode: 'HOME 1' } },
          },
        },
      }
    : options.batteryForecast;
  const solarForecast = options.solarForecast === undefined
    ? {
        attributes: {
          today_total_kwh: 12,
          tomorrow_total_kwh: 14,
          forecast_stale: true,
          today_hourly_string1_kw: {
            [timestamp(0)]: 2,
            [timestamp(4)]: 6,
          },
          today_hourly_string2_kw: {
            [timestamp(0)]: 4,
            [timestamp(4)]: 0,
          },
        },
      }
    : options.solarForecast;

  return new Proxy({}, {
    get(_target, property) {
      if (typeof property !== 'string') return undefined;
      if (property.endsWith('_spot_price_current_15min')) return { state: options.spotPrice ?? '1.25' };
      if (property.endsWith('_export_price_current_15min')) return { state: options.exportPrice ?? '0.75' };
      if (property.endsWith('_battery_forecast')) return batteryForecast;
      if (property.endsWith('_ac_out_en_day')) return { state: options.todayConsumptionWh ?? '3000' };
      if (property.endsWith('_solar_forecast')) return solarForecast;
      return undefined;
    },
  });
}

function mockHass(timeline: TimelinePoint[], states = statesForPricing()) {
  const hass = { callApi: vi.fn().mockResolvedValue({ active: timeline }), states };
  haMocks.getHass.mockResolvedValue(hass);
  return hass;
}

describe('pricing-data', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_NOW);
    vi.clearAllMocks();
    invalidateTimelineCache();
  });

  afterEach(() => {
    invalidateTimelineCache();
    vi.useRealTimers();
  });

  describe('fetchTimeline', () => {
    it('caches data per plan until the five-minute TTL expires', async () => {
      const hass = mockHass([timelinePoint(0)]);

      await expect(fetchTimeline('hybrid')).resolves.toEqual([timelinePoint(0)]);
      await expect(fetchTimeline('hybrid')).resolves.toEqual([timelinePoint(0)]);
      expect(hass.callApi).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5 * 60 * 1000);
      await fetchTimeline('hybrid');
      expect(hass.callApi).toHaveBeenCalledTimes(2);
    });

    it('uses the fallback API when Home Assistant has no callApi method', async () => {
      haMocks.getHass.mockResolvedValue({});
      haMocks.fetchOIGAPI.mockResolvedValue({ timeline: [timelinePoint(0)] });

      await expect(fetchTimeline()).resolves.toEqual([timelinePoint(0)]);
      expect(haMocks.fetchOIGAPI).toHaveBeenCalledWith('battery_forecast//timeline?type=active');
    });

    it('returns no timeline when Home Assistant is absent or its request rejects', async () => {
      haMocks.getHass.mockResolvedValueOnce(null);
      await expect(fetchTimeline('absent')).resolves.toEqual([]);

      haMocks.getHass.mockResolvedValueOnce({ callApi: vi.fn().mockRejectedValue(new Error('offline')) });
      await expect(fetchTimeline('failed')).resolves.toEqual([]);
    });

    it('invalidates only the requested plan cache entry', async () => {
      const hass = mockHass([timelinePoint(0)]);

      await fetchTimeline('hybrid');
      await fetchTimeline('solar');
      invalidateTimelineCache('hybrid');
      await fetchTimeline('hybrid');
      await fetchTimeline('solar');

      expect(hass.callApi).toHaveBeenCalledTimes(3);
    });
  });

  describe('buildModeSegments', () => {
    it('groups adjacent modes, splits gaps, and resolves each supported mode field', () => {
      const segments = buildModeSegments([
        timelinePoint(0, { mode_name: ' HOME 1 ' }),
        timelinePoint(1, { mode: 'HOME 1' }),
        timelinePoint(2, { mode: '   ' }),
        timelinePoint(3, { mode_planned: 'HOME UPS' }),
        timelinePoint(4, { mode: undefined, mode_display: 'DO NOTHING' }),
        timelinePoint(5, { mode: 'custom operation' }),
      ]);

      expect(segments.map(segment => [segment.mode, segment.shortLabel])).toEqual([
        ['HOME 1', '1'],
        ['HOME UPS', 'UPS'],
        ['DO NOTHING', 'DN'],
        ['custom operation', 'CUS'],
      ]);
      expect(segments[0]).toMatchObject({ start: new Date(timestamp(0)), end: new Date(timestamp(2)) });
      expect(segments[3]).toMatchObject({ label: 'custom operation', color: 'rgba(158, 158, 158, 0.15)' });
    });

    it('returns no segments for an empty timeline', () => {
      expect(buildModeSegments([])).toEqual([]);
    });
  });

  describe('loadPricingData', () => {
    it('retains an interval at the current bucket boundary while dropping an older interval', async () => {
      const hass = mockHass([timelinePoint(-1), timelinePoint(0)]);

      const result = await loadPricingData(hass);

      expect(result.timeline.map(point => point.timestamp)).toEqual([timestamp(0)]);
    });

    it('selects the distinct cheapest and most expensive three-hour buy windows', async () => {
      const hass = mockHass(futureTimeline());

      const result = await loadPricingData(hass);

      expect(result.cheapestBuyBlock).toMatchObject({
        start: timestamp(0), end: timestamp(11), avg: 10, min: 10, max: 10, type: 'cheapest-buy',
      });
      expect(result.expensiveBuyBlock).toMatchObject({
        start: timestamp(1), end: timestamp(12), avg: 17.5, type: 'expensive-buy',
      });
    });

    it('selects the distinct best and worst three-hour export windows', async () => {
      const hass = mockHass(futureTimeline());

      const result = await loadPricingData(hass);

      expect(result.bestExportBlock).toMatchObject({ start: timestamp(0), end: timestamp(11), type: 'best-export' });
      expect(result.worstExportBlock).toMatchObject({ start: timestamp(1), end: timestamp(12), type: 'worst-export' });
    });

    it('builds battery stacks and zoom bounds from matched timeline labels', async () => {
      const hass = mockHass(futureTimeline());

      const result = await loadPricingData(hass);

      expect(result.battery.baseline.slice(0, 2)).toEqual([7, 7]);
      expect(result.battery.solarCharge.slice(0, 2)).toEqual([2, 2]);
      expect(result.battery.gridCharge.slice(0, 2)).toEqual([1, 1]);
      expect(result.battery.gridNet.slice(0, 2)).toEqual([0.5, 0.5]);
      expect(result.battery.consumption.slice(0, 2)).toEqual([6, 6]);
      expect(result.initialZoomStart).toBe(new Date(timestamp(0)).getTime());
      expect(result.initialZoomEnd).toBe(new Date(timestamp(12)).getTime());
    });

    it('interpolates solar strings and carries the forecast totals and staleness flag', async () => {
      const hass = mockHass(futureTimeline());

      const result = await loadPricingData(hass);

      expect(result.solar?.string1.slice(0, 3)).toEqual([2, 3, 4]);
      expect(result.solar?.string2.slice(0, 3)).toEqual([4, 3, 2]);
      expect(result.solar).toMatchObject({
        todayTotal: 12,
        tomorrowTotal: 14,
        stale: true,
        hasString1: true,
        hasString2: true,
      });
      expect(result.solarForecastTotal).toBe(12);
      expect(result.solarForecastTomorrow).toBe(14);
      expect(result.solarForecastStale).toBe(true);
    });

    it.each([
      [5.1, 'Zítra podobně'],
      [8, 'Zítra více (+60%)'],
      [2, 'Zítra méně (-60%)'],
    ])('formats planned consumption trend for tomorrow %s', async (tomorrow, trendText) => {
      const hass = mockHass(futureTimeline(), statesForPricing({
        batteryForecast: {
          state: 'ok',
          attributes: {
            planned_consumption_today: 2,
            planned_consumption_tomorrow: tomorrow,
            profile_today: 'Žádný profil',
            mode_optimization: { alternatives: { 'DO NOTHING': { current_mode: 'HOME 2' } } },
          },
        },
      }));

      const result = await loadPricingData(hass);

      expect(result.plannedConsumption).toMatchObject({
        todayConsumedKwh: 3,
        todayTotalKwh: 5,
        totalPlannedKwh: tomorrow + 2,
        profile: 'Žádný profil',
        trendText,
      });
      expect(result.whatIf).toMatchObject({ activeMode: 'HOME 2', totalCost: 0, totalSavings: 0 });
    });

    it('uses fallback battery fields and rejects malformed current sensor values', async () => {
      const hass = mockHass([
        timelinePoint(0, {
          battery_capacity_kwh: undefined,
          battery_soc: 9,
          grid_net: undefined,
          grid_import: 5,
          grid_export: 1,
          load_kwh: undefined,
          consumption_kwh: 0.5,
          mode: 'custom operation',
        }),
      ], statesForPricing({ batteryForecast: null, solarForecast: null, spotPrice: 'invalid', exportPrice: '' }));

      const result = await loadPricingData(hass);

      expect(result.battery).toMatchObject({ baseline: [6], gridNet: [4], consumption: [2] });
      expect(result.modeSegments[0]).toMatchObject({ shortLabel: 'CUS', label: 'custom operation' });
      expect(result.currentSpotPrice).toBe(0);
      expect(result.currentExportPrice).toBe(0);
      expect(result.plannedConsumption).toBeNull();
      expect(result.whatIf).toBeNull();
      expect(result.solar).toBeNull();
    });

    it('returns the empty pricing shape for a missing timeline or unavailable forecast', async () => {
      const noTimelineHass = mockHass([]);
      const noTimeline = await loadPricingData(noTimelineHass);
      expect(noTimeline).toMatchObject({ timeline: [], labels: [], battery: null });

      invalidateTimelineCache();
      const unavailableHass = mockHass([timelinePoint(0)], statesForPricing({
        batteryForecast: { state: 'unavailable', attributes: {} },
      }));
      const unavailable = await loadPricingData(unavailableHass);
      expect(unavailable.plannedConsumption).toBeNull();
      expect(unavailable.whatIf).toBeNull();
    });

    it('passes through a non-fallback profile value from the battery_forecast sensor', async () => {
      const hass = mockHass(futureTimeline(), statesForPricing({
        batteryForecast: {
          state: 'ok',
          attributes: {
            planned_consumption_today: 2,
            planned_consumption_tomorrow: 8,
            profile_today: 'Charging only at night',
            mode_optimization: { alternatives: { 'DO NOTHING': { current_mode: 'HOME 1' } } },
          },
        },
      }));

      const result = await loadPricingData(hass);

      expect(result.plannedConsumption?.profile).toBe('Charging only at night');
    });

    it('asserts non-zero totalCost and totalSavings from extractWhatIf', async () => {
      const hass = mockHass(futureTimeline());

      const result = await loadPricingData(hass);

      expect(result.whatIf?.totalCost).toBe(123);
      expect(result.whatIf?.totalSavings).toBe(45);
    });
  });
});
