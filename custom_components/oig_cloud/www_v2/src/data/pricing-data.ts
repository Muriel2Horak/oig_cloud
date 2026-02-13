/**
 * OIG Cloud V2 — Pricing Data Layer
 *
 * Full data extraction for the pricing tab:
 * - Timeline API fetch (spot prices, battery forecast, mode segments)
 * - Solar forecast from sensor attributes (String 1 + 2, interpolated to 15min)
 * - Battery forecast stacked arrays (baseline, solar/grid charge, consumption, net grid)
 * - Extreme price block detection (sliding window)
 * - Mode segment building for Chart.js plugin
 * - Planned consumption + what-if analysis from battery_forecast attributes
 * - Current sensor prices
 *
 * Port of V1 pricing.js data logic.
 */

import { haClient } from '@/data/ha-client';
import { oigLog } from '@/core/logger';
import {
  TimelinePoint,
  PricePoint,
  PriceBlock,
  ModeSegment,
  PricingData,
  EMPTY_PRICING_DATA,
  PRICING_MODE_CONFIG,
  SolarForecastData,
  BatteryForecastArrays,
  PlannedConsumption,
  WhatIfAnalysis,
} from '@/ui/features/pricing/types';

const params = new URLSearchParams(window.location.search);
const INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '2206237016';

function getSensorId(sensor: string): string {
  return `sensor.oig_${INVERTER_SN}_${sensor}`;
}

function parseNumber(state: any): number {
  if (!state?.state) return 0;
  const val = parseFloat(state.state);
  return isNaN(val) ? 0 : val;
}

// ============================================================================
// LOCAL ISO STRING (no UTC shift)
// ============================================================================

function toLocalISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// ============================================================================
// TIMELINE API FETCH
// ============================================================================

/** Per-plan cache to avoid re-fetching on tab switch */
const timelineCache: Record<string, { data: TimelinePoint[]; ts: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchTimeline(plan = 'hybrid'): Promise<TimelinePoint[]> {
  const cached = timelineCache[plan];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    oigLog.debug('Timeline cache hit', { plan, age: Math.round((Date.now() - cached.ts) / 1000) });
    return cached.data;
  }

  try {
    const hass = await haClient.getHass();
    if (!hass) return [];

    let data: any;
    if (hass.callApi) {
      data = await hass.callApi('GET', `oig_cloud/battery_forecast/${INVERTER_SN}/timeline?type=active`);
    } else {
      // Fallback: use fetchOIGAPI if callApi not available
      data = await haClient.fetchOIGAPI(`battery_forecast/${INVERTER_SN}/timeline?type=active`);
    }

    const timeline: TimelinePoint[] = data?.active || data?.timeline || [];
    timelineCache[plan] = { data: timeline, ts: Date.now() };
    oigLog.info('Timeline fetched', { plan, points: timeline.length });
    return timeline;
  } catch (err) {
    oigLog.error('Failed to fetch timeline', err as Error);
    return [];
  }
}

export function invalidateTimelineCache(plan?: string): void {
  if (plan) {
    delete timelineCache[plan];
  } else {
    Object.keys(timelineCache).forEach(k => delete timelineCache[k]);
  }
}

// ============================================================================
// FILTER FUTURE INTERVALS (from current 15-min bucket onward)
// ============================================================================

function filterFutureIntervals(data: TimelinePoint[]): TimelinePoint[] {
  const now = new Date();
  const bucketStart = new Date(now);
  bucketStart.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);

  return data.filter(point => {
    const pointTime = new Date(point.timestamp);
    return pointTime >= bucketStart;
  });
}

// ============================================================================
// PARSE TIMELINE LABELS (timestamps → Date objects)
// ============================================================================

function parseTimelineLabels(points: { timestamp: string }[]): Date[] {
  return points.map(p => {
    if (!p.timestamp) return new Date();
    try {
      const [datePart, timePart] = p.timestamp.split('T');
      if (!datePart || !timePart) return new Date();
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second = 0] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hour, minute, second);
    } catch {
      return new Date();
    }
  });
}

// ============================================================================
// MODE SEGMENTS
// ============================================================================

function resolvePricingMode(point: TimelinePoint): string | null {
  const raw = point.mode_name || point.mode_planned || point.mode || point.mode_display || null;
  if (!raw || typeof raw !== 'string') return null;
  const normalized = raw.trim();
  return normalized.length ? normalized : null;
}

function getModeShortLabel(modeName: string): string {
  if (modeName.startsWith('HOME ')) return modeName.replace('HOME ', '').trim();
  if (modeName === 'FULL HOME UPS' || modeName === 'HOME UPS') return 'UPS';
  if (modeName === 'DO NOTHING') return 'DN';
  return modeName.substring(0, 3).toUpperCase();
}

function getModeMeta(modeName: string) {
  return PRICING_MODE_CONFIG[modeName] || { icon: '❓', color: 'rgba(158, 158, 158, 0.15)', label: modeName };
}

export function buildModeSegments(timeline: TimelinePoint[]): ModeSegment[] {
  if (!timeline.length) return [];

  const rawSegments: { mode: string; start: Date; end: Date }[] = [];
  let current: { mode: string; start: Date; end: Date } | null = null;

  for (const point of timeline) {
    const modeName = resolvePricingMode(point);
    if (!modeName) {
      current = null;
      continue;
    }

    const startTime = new Date(point.timestamp);
    const endTime = new Date(startTime.getTime() + 15 * 60 * 1000);

    if (current !== null && current.mode === modeName) {
      current.end = endTime;
    } else {
      const seg: { mode: string; start: Date; end: Date } = { mode: modeName, start: startTime, end: endTime };
      rawSegments.push(seg);
      current = seg;
    }
  }

  return rawSegments.map(seg => {
    const meta = getModeMeta(seg.mode);
    return {
      ...seg,
      icon: meta.icon,
      color: meta.color,
      label: meta.label,
      shortLabel: getModeShortLabel(seg.mode),
    };
  });
}

// ============================================================================
// EXTREME PRICE BLOCKS (sliding window)
// ============================================================================

function findExtremeBlock(
  prices: PricePoint[],
  findLowest: boolean,
  blockHours = 3,
): PriceBlock | null {
  const blockSize = Math.floor((blockHours * 60) / 15);
  if (prices.length < blockSize) return null;

  let extremeBlock: PriceBlock | null = null;
  let extremeAvg = findLowest ? Infinity : -Infinity;

  for (let i = 0; i <= prices.length - blockSize; i++) {
    const block = prices.slice(i, i + blockSize);
    const values = block.map(p => p.price);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    if ((findLowest && avg < extremeAvg) || (!findLowest && avg > extremeAvg)) {
      extremeAvg = avg;
      extremeBlock = {
        start: block[0].timestamp,
        end: block[block.length - 1].timestamp,
        avg,
        min: Math.min(...values),
        max: Math.max(...values),
        values,
        type: 'cheapest-buy', // placeholder, set by caller
      };
    }
  }

  return extremeBlock;
}

// ============================================================================
// SOLAR FORECAST (from sensor attributes, interpolated to 15min)
// ============================================================================

function extractSolarForecast(hass: any, labels: Date[]): SolarForecastData | null {
  const states = hass?.states || {};
  const solarEntity = states[getSensorId('solar_forecast')];
  if (!solarEntity?.attributes || !labels.length) return null;

  const attrs = solarEntity.attributes;
  const todayTotal = attrs.today_total_kwh || 0;

  const todayS1 = attrs.today_hourly_string1_kw || {};
  const tomorrowS1 = attrs.tomorrow_hourly_string1_kw || {};
  const todayS2 = attrs.today_hourly_string2_kw || {};
  const tomorrowS2 = attrs.tomorrow_hourly_string2_kw || {};

  const allS1: Record<string, number> = { ...todayS1, ...tomorrowS1 };
  const allS2: Record<string, number> = { ...todayS2, ...tomorrowS2 };

  const interpolate = (v1: number | null, v2: number | null, ratio: number): number => {
    if (v1 == null || v2 == null) return v1 || v2 || 0;
    return v1 + (v2 - v1) * ratio;
  };

  const string1: number[] = [];
  const string2: number[] = [];

  for (const timeLabel of labels) {
    const hour = timeLabel.getHours();
    const minute = timeLabel.getMinutes();

    const currentHourDate = new Date(timeLabel);
    currentHourDate.setMinutes(0, 0, 0);
    const currentHourKey = toLocalISOString(currentHourDate);

    const nextHourDate = new Date(currentHourDate);
    nextHourDate.setHours(hour + 1);
    const nextHourKey = toLocalISOString(nextHourDate);

    const s1cur = allS1[currentHourKey] || 0;
    const s1next = allS1[nextHourKey] || 0;
    const s2cur = allS2[currentHourKey] || 0;
    const s2next = allS2[nextHourKey] || 0;

    const ratio = minute / 60;
    string1.push(interpolate(s1cur, s1next, ratio));
    string2.push(interpolate(s2cur, s2next, ratio));
  }

  return {
    string1,
    string2,
    todayTotal,
    hasString1: string1.some(v => v > 0),
    hasString2: string2.some(v => v > 0),
  };
}

// ============================================================================
// BATTERY FORECAST (stacked arrays from timeline data)
// ============================================================================

function buildBatteryArrays(
  timeline: TimelinePoint[],
  labels: Date[],
): { arrays: BatteryForecastArrays; initialZoomStart: number | null; initialZoomEnd: number | null } {
  if (!timeline.length) {
    return { arrays: { baseline: [], solarCharge: [], gridCharge: [], gridNet: [], consumption: [] }, initialZoomStart: null, initialZoomEnd: null };
  }

  const timelineTimestamps = timeline.map(t => new Date(t.timestamp));
  const initialZoomStart = timelineTimestamps[0].getTime();
  const lastTs = timelineTimestamps[timelineTimestamps.length - 1];
  const initialZoomEnd = lastTs ? lastTs.getTime() : initialZoomStart;

  const baseline: (number | null)[] = [];
  const solarCharge: (number | null)[] = [];
  const gridCharge: (number | null)[] = [];
  const gridNet: (number | null)[] = [];
  const consumption: (number | null)[] = [];

  for (const timeLabel of labels) {
    const isoKey = toLocalISOString(timeLabel);
    const entry = timeline.find(t => t.timestamp === isoKey);

    if (entry) {
      const targetCapacity =
        (entry.battery_capacity_kwh ?? entry.battery_soc ?? entry.battery_start) || 0;
      const sc = entry.solar_charge_kwh || 0;
      const gc = entry.grid_charge_kwh || 0;
      const gn = typeof entry.grid_net === 'number'
        ? entry.grid_net
        : (entry.grid_import || 0) - (entry.grid_export || 0);
      const loadKwhRaw = entry.load_kwh ?? entry.consumption_kwh ?? entry.load ?? 0;
      const loadKw = (Number(loadKwhRaw) || 0) * 4;

      baseline.push(targetCapacity - sc - gc);
      solarCharge.push(sc);
      gridCharge.push(gc);
      gridNet.push(gn);
      consumption.push(loadKw);
    } else {
      baseline.push(null);
      solarCharge.push(null);
      gridCharge.push(null);
      gridNet.push(null);
      consumption.push(null);
    }
  }

  return {
    arrays: { baseline, solarCharge, gridCharge, gridNet, consumption },
    initialZoomStart,
    initialZoomEnd,
  };
}

// ============================================================================
// PLANNED CONSUMPTION (from battery_forecast sensor attributes)
// ============================================================================

function extractPlannedConsumption(hass: any): PlannedConsumption | null {
  const states = hass?.states || {};
  const forecastEntity = states[getSensorId('battery_forecast')];
  if (!forecastEntity?.attributes || forecastEntity.state === 'unavailable' || forecastEntity.state === 'unknown') {
    return null;
  }

  const attrs = forecastEntity.attributes;
  const todayPlannedKwh = attrs.planned_consumption_today ?? null;
  const tomorrowKwh = attrs.planned_consumption_tomorrow ?? null;
  const profileToday = attrs.profile_today || 'Žádný profil';

  // Today consumed from ac_out_en_day sensor
  const todayConsumedEntity = states[getSensorId('ac_out_en_day')];
  const todayConsumedState = todayConsumedEntity?.state;
  const todayConsumedWh = todayConsumedState && todayConsumedState !== 'unavailable'
    ? parseFloat(todayConsumedState) || 0
    : 0;
  const todayConsumedKwh = todayConsumedWh / 1000;

  const todayTotalKwh = todayConsumedKwh + (todayPlannedKwh || 0);
  const totalPlannedKwh = (todayPlannedKwh || 0) + (tomorrowKwh || 0);

  // Trend text
  let trendText: string | null = null;
  if (todayTotalKwh > 0 && tomorrowKwh != null) {
    const diff = tomorrowKwh - todayTotalKwh;
    const diffPercent = (diff / todayTotalKwh) * 100;
    if (Math.abs(diffPercent) < 5) {
      trendText = 'Zítra podobně';
    } else if (diff > 0) {
      trendText = `Zítra více (+${Math.abs(diffPercent).toFixed(0)}%)`;
    } else {
      trendText = `Zítra méně (-${Math.abs(diffPercent).toFixed(0)}%)`;
    }
  }

  const profile = profileToday !== 'Žádný profil' && profileToday !== 'Neznámý profil'
    ? profileToday
    : 'Žádný profil';

  return {
    todayConsumedKwh,
    todayPlannedKwh,
    todayTotalKwh,
    tomorrowKwh,
    totalPlannedKwh,
    profile,
    trendText,
  };
}

// ============================================================================
// WHAT-IF ANALYSIS (from battery_forecast sensor attributes)
// ============================================================================

function extractWhatIf(hass: any): WhatIfAnalysis | null {
  const states = hass?.states || {};
  const forecastEntity = states[getSensorId('battery_forecast')];
  if (!forecastEntity?.attributes || forecastEntity.state === 'unavailable' || forecastEntity.state === 'unknown') {
    return null;
  }

  const attrs = forecastEntity.attributes;
  const modeOptData = attrs.mode_optimization || {};
  const alternatives = modeOptData.alternatives || {};

  const totalCost = modeOptData.total_cost_czk || 0;
  const totalSavings = modeOptData.total_savings_vs_home_i_czk || 0;

  const doNothing = alternatives['DO NOTHING'];
  const activeMode = doNothing?.current_mode || null;

  return { totalCost, totalSavings, alternatives, activeMode };
}

// ============================================================================
// MAIN LOAD FUNCTION
// ============================================================================

export async function loadPricingData(hass: any, plan = 'hybrid'): Promise<PricingData> {
  const perfStart = performance.now();
  oigLog.info('[Pricing] loadPricingData START');

  try {
    // 1. Fetch timeline from API
    const rawTimeline = await fetchTimeline(plan);
    const timeline = filterFutureIntervals(rawTimeline);

    if (!timeline.length) {
      oigLog.warn('[Pricing] No timeline data');
      return EMPTY_PRICING_DATA;
    }

    // 2. Extract prices for stat cards and block finding
    const prices: PricePoint[] = timeline.map(p => ({
      timestamp: p.timestamp,
      price: p.spot_price_czk || 0,
    }));

    const exportPrices: PricePoint[] = timeline.map(p => ({
      timestamp: p.timestamp,
      price: p.export_price_czk || 0,
    }));

    // 3. Parse labels (Date objects for chart X-axis)
    let labels = parseTimelineLabels(prices);

    // 4. Build mode segments for Chart.js plugin
    const modeSegments = buildModeSegments(timeline);

    // 5. Extreme buy blocks (3h sliding window)
    const cheapestBuyBlock = findExtremeBlock(prices, true, 3);
    if (cheapestBuyBlock) cheapestBuyBlock.type = 'cheapest-buy';

    const expensiveBuyBlock = findExtremeBlock(prices, false, 3);
    if (expensiveBuyBlock) expensiveBuyBlock.type = 'expensive-buy';

    // 6. Extreme export blocks
    const bestExportBlock = findExtremeBlock(exportPrices, false, 3);
    if (bestExportBlock) bestExportBlock.type = 'best-export';

    const worstExportBlock = findExtremeBlock(exportPrices, true, 3);
    if (worstExportBlock) worstExportBlock.type = 'worst-export';

    // 7. Battery forecast arrays + merge timestamps
    const timelineTimestamps = timeline.map(t => new Date(t.timestamp));
    const allTimestampsSet = new Set([...labels, ...timelineTimestamps].map(d => d.getTime()));
    labels = Array.from(allTimestampsSet)
      .sort((a, b) => a - b)
      .map(ts => new Date(ts));

    const {
      arrays: battery,
      initialZoomStart,
      initialZoomEnd,
    } = buildBatteryArrays(timeline, labels);

    // 8. Solar forecast
    const solar = extractSolarForecast(hass, labels);

    // 9. Current sensor prices
    const states = hass?.states || {};
    const currentSpotPrice = parseNumber(states[getSensorId('spot_price_current_15min')]);
    const currentExportPrice = parseNumber(states[getSensorId('export_price_current_15min')]);
    const avgSpotPrice = prices.length > 0
      ? prices.reduce((s, p) => s + p.price, 0) / prices.length
      : 0;

    // 10. Planned consumption + what-if
    const plannedConsumption = extractPlannedConsumption(hass);
    const whatIf = extractWhatIf(hass);

    // 11. Solar total
    const solarForecastTotal = solar?.todayTotal || 0;

    const result: PricingData = {
      timeline,
      labels,
      prices,
      exportPrices,
      modeSegments,
      cheapestBuyBlock,
      expensiveBuyBlock,
      bestExportBlock,
      worstExportBlock,
      solar,
      battery,
      initialZoomStart,
      initialZoomEnd,
      currentSpotPrice,
      currentExportPrice,
      avgSpotPrice,
      plannedConsumption,
      whatIf,
      solarForecastTotal,
    };

    const elapsed = (performance.now() - perfStart).toFixed(0);
    oigLog.info(`[Pricing] loadPricingData COMPLETE in ${elapsed}ms`, {
      points: timeline.length,
      segments: modeSegments.length,
    });

    return result;
  } catch (err) {
    oigLog.error('[Pricing] loadPricingData failed', err as Error);
    return EMPTY_PRICING_DATA;
  }
}
