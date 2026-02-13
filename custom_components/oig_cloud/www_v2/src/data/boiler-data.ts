// ============================================================================
// Boiler Tab — Data Layer
// Full feature parity with V1: API fetching, parsing, state extraction
// ============================================================================

import {
  BoilerProfile, BoilerState, BoilerHourData, BoilerPlan,
  BoilerEnergyBreakdown, BoilerPredictedUsage, BoilerConfig,
  BoilerHeatmapRow, BoilerProfilingData, BoilerData, BoilerPlanSlot,
  SOURCE_LABELS,
} from '@/ui/features/boiler/types';
import { haClient } from '@/data/ha-client';
import { oigLog } from '@/core/logger';

const params = new URLSearchParams(window.location.search);
const INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '2206237016';
const ENTRY_ID = params.get('entry_id') || '';

export function getSensorId(sensor: string): string {
  return `sensor.oig_${INVERTER_SN}_${sensor}`;
}

// ============================================================================
// RAW API TYPES
// ============================================================================

interface BoilerProfileAPI {
  id?: string;
  name?: string;
  target_temp?: number;
  start_time?: string;
  end_time?: string;
  days?: number[];
  enabled?: boolean;
  hourly_avg?: Record<string, number>;
  heatmap?: number[][];
}

interface BoilerPlanAPI {
  state?: {
    current_temp?: number;
    target_temp?: number;
    heating?: boolean;
    next_profile?: string;
    next_start?: string;
    temperatures?: {
      upper_zone?: number;
      lower_zone?: number;
      top?: number;
      bottom?: number;
    };
    energy_state?: {
      avg_temp?: number;
      energy_needed_kwh?: number;
    };
    recommended_source?: string;
    circulation_recommended?: boolean;
  };
  profiles?: Record<string, BoilerProfileAPI>;
  current_category?: string;
  config?: {
    min_temp?: number;
    max_temp?: number;
    volume_l?: number;
    target_temp_c?: number;
    deadline_time?: string;
    stratification_mode?: string;
    cold_inlet_temp_c?: number;
  };
  summary?: {
    today_hours?: number[];
    predicted_total_kwh?: number;
    predicted_cost?: number;
    peak_hours?: number[];
    water_liters_40c?: number;
    circulation_windows?: Array<{ start: string; end: string }>;
    avg_confidence?: number;
  };
  slots?: Array<{
    start?: string;
    end?: string;
    consumption_kwh?: number;
    avg_consumption_kwh?: number;
    recommended_source?: string;
    spot_price?: number;
    temp_top?: number;
    soc?: number;
  }>;
  total_consumption_kwh?: number;
  fve_kwh?: number;
  grid_kwh?: number;
  alt_kwh?: number;
  estimated_cost_czk?: number;
  next_slot?: any;
}

// ============================================================================
// UTILITY FUNCTIONS (ported from V1)
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  if (isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function computeHeatingPercent(avgTemp: number | null, targetTemp: number, coldInlet: number): number | null {
  if (avgTemp === null || avgTemp === undefined) return null;
  const delta = targetTemp - coldInlet;
  if (delta <= 0) return null;
  const percent = ((avgTemp - coldInlet) / delta) * 100;
  return clamp(percent, 0, 100);
}

function formatTimeLabel(value: string | Date | null | undefined): string {
  if (!value) return '--:--';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTimeLabel(value: string | null | undefined): string {
  if (!value) return '--';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '--';
  return date.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeRange(start: string | undefined, end: string | undefined): string {
  return `${formatTimeLabel(start)}–${formatTimeLabel(end)}`;
}

function formatSourceLabel(source: string | undefined | null): string {
  return SOURCE_LABELS[source || ''] || source || '--';
}

function sumHourlyAvg(hourlyAvg: Record<string, number> | undefined): number {
  if (!hourlyAvg) return 0;
  return Object.values(hourlyAvg).reduce((acc, val) => acc + (parseFloat(String(val)) || 0), 0);
}

function pickPeakHours(hourlyAvg: Record<string, number> | undefined): number[] {
  if (!hourlyAvg) return [];
  const ranked = Object.entries(hourlyAvg)
    .map(([hour, value]) => ({ hour: parseInt(hour, 10), value: parseFloat(String(value)) || 0 }))
    .filter(item => isFinite(item.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .filter(item => item.value > 0)
    .map(item => item.hour);
  return ranked.sort((a, b) => a - b);
}

function parseTimeMinutes(label: string | undefined): number | null {
  if (!label) return null;
  const parts = label.split(':').map(p => parseInt(p, 10));
  if (parts.length < 2 || !isFinite(parts[0]) || !isFinite(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

function isNowInWindow(nowMinutes: number, startMinutes: number | null, endMinutes: number | null): boolean {
  if (startMinutes === null || endMinutes === null) return false;
  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

// ============================================================================
// API FETCHING
// ============================================================================

async function fetchBoilerProfile(): Promise<BoilerPlanAPI | null> {
  try {
    if (!ENTRY_ID) {
      oigLog.warn('[Boiler] No entry_id — cannot fetch boiler profile');
      return null;
    }
    return await haClient.fetchOIGAPI<BoilerPlanAPI>(`/${ENTRY_ID}/boiler_profile`);
  } catch (err) {
    oigLog.warn('[Boiler] Failed to fetch profile', { err });
    return null;
  }
}

async function fetchBoilerPlan(): Promise<BoilerPlanAPI | null> {
  try {
    if (!ENTRY_ID) {
      oigLog.warn('[Boiler] No entry_id — cannot fetch boiler plan');
      return null;
    }
    return await haClient.fetchOIGAPI<BoilerPlanAPI>(`/${ENTRY_ID}/boiler_plan`);
  } catch (err) {
    oigLog.warn('[Boiler] Failed to fetch plan', { err });
    return null;
  }
}

// ============================================================================
// PARSERS
// ============================================================================

function parseState(planData: BoilerPlanAPI | null, profileData: BoilerPlanAPI | null, config: BoilerConfig): BoilerState {
  const plan = planData || profileData;
  const state = plan?.state;
  const temps = state?.temperatures || {};
  const energyState = state?.energy_state || {};

  const tempTop = isFinite(temps.upper_zone ?? temps.top as any) ? (temps.upper_zone ?? temps.top ?? null) : null;
  const tempBottom = isFinite(temps.lower_zone ?? temps.bottom as any) ? (temps.lower_zone ?? temps.bottom ?? null) : null;
  const avgTemp = isFinite(energyState.avg_temp as any) ? (energyState.avg_temp ?? null) : null;
  const energyNeeded = isFinite(energyState.energy_needed_kwh as any) ? (energyState.energy_needed_kwh ?? null) : null;

  const targetTemp = config.targetTempC ?? 60;
  const coldInlet = config.coldInletTempC ?? 10;
  const heatingPercent = computeHeatingPercent(avgTemp, targetTemp, coldInlet);

  // Next heating slot
  const slots = planData?.slots || [];
  const nextSlot = planData?.next_slot || findNextHeatingSlot(slots);
  let nextHeating = 'Neplánováno';
  if (nextSlot) {
    const sourceLabel = formatSourceLabel(nextSlot.recommended_source);
    nextHeating = `${formatTimeRange(nextSlot.start, nextSlot.end)} (${sourceLabel})`;
  }

  const recommendedSource = formatSourceLabel(state?.recommended_source || nextSlot?.recommended_source);

  return {
    currentTemp: state?.current_temp || 45,
    targetTemp: state?.target_temp || targetTemp,
    heating: state?.heating || false,
    tempTop,
    tempBottom,
    avgTemp,
    heatingPercent,
    energyNeeded,
    planCost: planData?.estimated_cost_czk ?? null,
    nextHeating,
    recommendedSource,
    nextProfile: state?.next_profile || '',
    nextStart: state?.next_start || '',
  };
}

function findNextHeatingSlot(slots: any[]): any | null {
  if (!Array.isArray(slots)) return null;
  const now = Date.now();
  return slots.find((slot: any) => {
    const end = new Date(slot.end || slot.end_time || '').getTime();
    const consumption = slot.consumption_kwh ?? slot.avg_consumption_kwh ?? 0;
    return end > now && consumption > 0;
  }) || null;
}

function parsePlan(planData: BoilerPlanAPI | null): BoilerPlan | null {
  if (!planData?.slots?.length) return null;

  const slots: BoilerPlanSlot[] = planData.slots.map(s => ({
    start: s.start || '',
    end: s.end || '',
    consumptionKwh: s.consumption_kwh ?? s.avg_consumption_kwh ?? 0,
    recommendedSource: s.recommended_source || '',
    spotPrice: isFinite(s.spot_price as any) ? (s.spot_price ?? null) : null,
    tempTop: s.temp_top,
    soc: s.soc,
  }));

  const heatingSlots = slots.filter(s => s.consumptionKwh > 0);
  const total = parseFloat(String(planData.total_consumption_kwh)) || 0;
  const fve = parseFloat(String(planData.fve_kwh)) || 0;
  const grid = parseFloat(String(planData.grid_kwh)) || 0;
  const alt = parseFloat(String(planData.alt_kwh)) || 0;
  const cost = parseFloat(String(planData.estimated_cost_czk)) || 0;

  // Source digest
  let sourceDigest = 'Mix: --';
  if (total > 0) {
    const fveShare = Math.round((fve / total) * 100);
    const gridShare = Math.round((grid / total) * 100);
    const altShare = Math.round((alt / total) * 100);
    sourceDigest = `Mix: FVE ${fveShare}% · Síť ${gridShare}% · Alt ${altShare}%`;
  }

  // Spot prices
  const spotSlots = slots
    .filter(s => s.consumptionKwh > 0 && s.spotPrice !== null)
    .map(s => ({ slot: s, price: s.spotPrice! }));

  let cheapestSpot = '--';
  let mostExpensiveSpot = '--';
  if (spotSlots.length) {
    const min = spotSlots.reduce((best, c) => c.price < best.price ? c : best);
    const max = spotSlots.reduce((best, c) => c.price > best.price ? c : best);
    cheapestSpot = `${formatTimeRange(min.slot.start, min.slot.end)} (${min.price.toFixed(2)} Kč/kWh)`;
    mostExpensiveSpot = `${formatTimeRange(max.slot.start, max.slot.end)} (${max.price.toFixed(2)} Kč/kWh)`;
  }

  return {
    slots,
    totalConsumptionKwh: total,
    fveKwh: fve,
    gridKwh: grid,
    altKwh: alt,
    estimatedCostCzk: cost,
    nextSlot: planData.next_slot ? {
      start: planData.next_slot.start || '',
      end: planData.next_slot.end || '',
      consumptionKwh: planData.next_slot.consumption_kwh || 0,
      recommendedSource: planData.next_slot.recommended_source || '',
      spotPrice: planData.next_slot.spot_price ?? null,
    } : null,
    planStart: formatDateTimeLabel(planData.slots[0]?.start),
    planEnd: formatDateTimeLabel(planData.slots[planData.slots.length - 1]?.end),
    sourceDigest,
    activeSlotCount: heatingSlots.length,
    cheapestSpot,
    mostExpensiveSpot,
  };
}

function parseEnergyBreakdown(planData: BoilerPlanAPI | null): BoilerEnergyBreakdown {
  const fve = parseFloat(String(planData?.fve_kwh)) || 0;
  const grid = parseFloat(String(planData?.grid_kwh)) || 0;
  const alt = parseFloat(String(planData?.alt_kwh)) || 0;
  const total = fve + grid + alt;

  return {
    fveKwh: fve,
    gridKwh: grid,
    altKwh: alt,
    fvePercent: total > 0 ? (fve / total) * 100 : 0,
    gridPercent: total > 0 ? (grid / total) * 100 : 0,
    altPercent: total > 0 ? (alt / total) * 100 : 0,
  };
}

function parsePredictedUsage(
  profileData: BoilerPlanAPI | null,
  planData: BoilerPlanAPI | null,
  currentCategory: string
): BoilerPredictedUsage {
  const summary = profileData?.summary || {};
  const profile = profileData?.profiles?.[currentCategory];
  const hourlyAvg = (profile as any)?.hourly_avg || {};

  const predictedTodayKwh = summary.predicted_total_kwh ?? sumHourlyAvg(hourlyAvg);
  const peakHours = summary.peak_hours ?? pickPeakHours(hourlyAvg);
  const waterLiters40c = isFinite(summary.water_liters_40c as any) ? (summary.water_liters_40c ?? null) : null;

  // Circulation windows
  const windows = summary.circulation_windows || [];
  const circulationWindows = windows.length
    ? windows.map(w => `${w.start}–${w.end}`).join(', ')
    : '--';

  // Circulation now
  let circulationNow = '--';
  if (windows.length) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isActive = windows.some(w => {
      const start = parseTimeMinutes(w.start);
      const end = parseTimeMinutes(w.end);
      return isNowInWindow(nowMinutes, start, end);
    });

    if (isActive) {
      const currentWindow = windows.find(w => {
        const start = parseTimeMinutes(w.start);
        const end = parseTimeMinutes(w.end);
        return isNowInWindow(nowMinutes, start, end);
      });
      circulationNow = currentWindow ? `ANO (do ${currentWindow.end})` : 'ANO';
    } else {
      const state = planData?.state;
      const recommended = state?.circulation_recommended;
      // Find next window
      let bestDelta = Infinity;
      let bestWindow: { start: string; end: string } | null = null;
      for (const w of windows) {
        const start = parseTimeMinutes(w.start);
        if (start === null) continue;
        let delta = start - nowMinutes;
        if (delta < 0) delta += 24 * 60;
        if (delta < bestDelta) {
          bestDelta = delta;
          bestWindow = w;
        }
      }

      if (recommended && bestWindow) {
        circulationNow = `DOPORUČENO (${bestWindow.start}–${bestWindow.end})`;
      } else if (bestWindow) {
        circulationNow = `Ne (další ${bestWindow.start}–${bestWindow.end})`;
      } else {
        circulationNow = 'Ne';
      }
    }
  }

  return {
    predictedTodayKwh,
    peakHours,
    waterLiters40c,
    circulationWindows,
    circulationNow,
  };
}

function parseConfig(profileData: BoilerPlanAPI | null): BoilerConfig {
  const config = profileData?.config || {};
  const volumeL = isFinite(config.volume_l as any) ? (config.volume_l ?? null) : null;

  return {
    volumeL,
    heaterPowerW: null, // Not available from API
    targetTempC: isFinite(config.target_temp_c as any) ? (config.target_temp_c ?? null) : null,
    deadlineTime: (config as any).deadline_time || '--:--',
    stratificationMode: (config as any).stratification_mode || '--',
    kCoefficient: volumeL ? (volumeL * 0.001163).toFixed(4) : '--',
    coldInletTempC: isFinite(config.cold_inlet_temp_c as any) ? (config.cold_inlet_temp_c ?? 10) : 10,
  };
}

function parseProfiles(data: BoilerPlanAPI | null): BoilerProfile[] {
  if (!data?.profiles) return [];

  return Object.entries(data.profiles).map(([id, profile]) => ({
    id,
    name: profile.name || id,
    targetTemp: profile.target_temp || 55,
    startTime: profile.start_time || '06:00',
    endTime: profile.end_time || '22:00',
    days: profile.days || [1, 1, 1, 1, 1, 0, 0],
    enabled: profile.enabled !== false,
  }));
}

function generateHeatmapData(data: BoilerPlanAPI | null): BoilerHourData[] {
  const hours: BoilerHourData[] = [];
  const summary = data?.summary?.today_hours || [];

  for (let i = 0; i < 24; i++) {
    const isActive = summary.includes(i);
    hours.push({
      hour: i,
      temp: isActive ? 55 : 25,
      heating: isActive,
    });
  }

  return hours;
}

function generate7x24Heatmap(profileData: BoilerPlanAPI | null, currentCategory: string): BoilerHeatmapRow[] {
  const profile = profileData?.profiles?.[currentCategory] as any;
  const dayLabels = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  if (!profile) {
    return dayLabels.map(day => ({ day, hours: Array(24).fill(0) }));
  }

  const heatmapData = profile.heatmap || [];
  let dataMatrix: number[][] = [];

  if (heatmapData.length > 0) {
    dataMatrix = heatmapData.map((dayData: any[]) =>
      dayData.map((cell: any) => {
        if (cell && typeof cell === 'object') {
          return parseFloat(cell.consumption) || 0;
        }
        return parseFloat(String(cell)) || 0;
      })
    );
  } else {
    // Fallback: use hourly_avg for all days
    const hourlyAvg = profile.hourly_avg || {};
    dataMatrix = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, (_, hour) => parseFloat(String(hourlyAvg[hour] || 0)))
    );
  }

  return dayLabels.map((day, i) => ({
    day,
    hours: dataMatrix[i] || Array(24).fill(0),
  }));
}

function parseProfiling(profileData: BoilerPlanAPI | null, currentCategory: string): BoilerProfilingData {
  const profile = profileData?.profiles?.[currentCategory] as any;
  const summary = profileData?.summary || {};
  const hourlyAvg = profile?.hourly_avg || {};

  const hourlyArray = Array.from({ length: 24 }, (_, i) => parseFloat(String(hourlyAvg[i] || 0)));
  const predictedTotalKwh = summary.predicted_total_kwh ?? sumHourlyAvg(hourlyAvg);
  const peakHours = summary.peak_hours ?? pickPeakHours(hourlyAvg);
  const confidence = isFinite(summary.avg_confidence as any) ? (summary.avg_confidence ?? null) : null;

  return {
    hourlyAvg: hourlyArray,
    peakHours,
    predictedTotalKwh,
    confidence,
    daysTracked: 7,
  };
}

function parseForecastWindows(planData: BoilerPlanAPI | null, batteryTimeline: any[] | null): { fve: string; grid: string } {
  if (!planData?.slots?.length || !batteryTimeline?.length) {
    return { fve: '--', grid: '--' };
  }

  const planStart = planData.slots[0]?.start;
  const planEnd = planData.slots[planData.slots.length - 1]?.end;
  const startMs = planStart ? new Date(planStart).getTime() : null;
  const endMs = planEnd ? new Date(planEnd).getTime() : null;

  const filtered = batteryTimeline.filter(entry => {
    if (!startMs || !endMs) return true;
    const ts = entry.timestamp || entry.time;
    if (!ts) return false;
    const t = new Date(ts).getTime();
    return t >= startMs && t <= endMs;
  });

  const buildWindows = (selector: (entry: any) => boolean): string => {
    const windows: Array<{ start: Date; end: Date }> = [];
    let current: { start: Date; end: Date } | null = null;

    for (const entry of filtered) {
      const ts = entry.timestamp || entry.time;
      if (!ts) continue;
      const time = new Date(ts);
      const isActive = selector(entry);

      if (isActive && !current) {
        current = { start: time, end: time };
      } else if (isActive && current) {
        current.end = time;
      } else if (!isActive && current) {
        windows.push(current);
        current = null;
      }
    }
    if (current) windows.push(current);

    return windows.length
      ? windows.map(w => `${formatTimeLabel(w.start)}–${formatTimeLabel(new Date(w.end.getTime() + 15 * 60000))}`).join(', ')
      : '--';
  };

  const fve = buildWindows(entry => {
    const solar = parseFloat(entry.solar_kwh ?? entry.solar_charge_kwh ?? 0) || 0;
    return solar > 0;
  });

  const grid = buildWindows(entry => {
    const gridVal = parseFloat(entry.grid_charge_kwh ?? 0) || 0;
    return gridVal > 0;
  });

  return { fve, grid };
}

// ============================================================================
// SERVICE CALLS
// ============================================================================

export async function planBoilerHeating(): Promise<boolean> {
  oigLog.info('[Boiler] Planning heating...');
  const success = await haClient.callService('oig_cloud', 'plan_boiler_heating', {});
  return success;
}

export async function applyBoilerPlan(): Promise<boolean> {
  oigLog.info('[Boiler] Applying plan...');
  const success = await haClient.callService('oig_cloud', 'apply_boiler_plan', {});
  return success;
}

export async function cancelBoilerPlan(): Promise<boolean> {
  oigLog.info('[Boiler] Canceling plan...');
  const success = await haClient.callService('oig_cloud', 'cancel_boiler_plan', {});
  return success;
}

// ============================================================================
// MAIN LOADER
// ============================================================================

export async function loadBoilerData(_hass?: any): Promise<BoilerData> {
  const [profileData, planData] = await Promise.all([
    fetchBoilerProfile(),
    fetchBoilerPlan(),
  ]);

  // Battery timeline for forecast windows
  let batteryTimeline: any[] | null = null;
  try {
    const timelineData = await haClient.loadBatteryTimeline(INVERTER_SN, 'active');
    batteryTimeline = timelineData?.active || timelineData || null;
    if (Array.isArray(batteryTimeline) && batteryTimeline.length === 0) batteryTimeline = null;
  } catch {
    // Ignore battery timeline errors
  }

  const currentCategory = profileData?.current_category || Object.keys(profileData?.profiles || {})[0] || 'workday_summer';
  const availableCategories = Object.keys(profileData?.profiles || {});

  const config = parseConfig(profileData);

  return {
    state: parseState(planData, profileData, config),
    plan: parsePlan(planData),
    energyBreakdown: parseEnergyBreakdown(planData),
    predictedUsage: parsePredictedUsage(profileData, planData, currentCategory),
    config,
    profiles: parseProfiles(profileData || planData),
    heatmap: generateHeatmapData(planData || profileData),
    heatmap7x24: generate7x24Heatmap(profileData, currentCategory),
    profiling: parseProfiling(profileData, currentCategory),
    currentCategory,
    availableCategories,
    forecastWindows: parseForecastWindows(planData, batteryTimeline),
  };
}

/** Reload with different category (no API refetch needed if we cache raw data) */
export function recomputeForCategory(
  profileData: any,
  planData: any,
  category: string,
  _batteryTimeline: any[] | null = null
): Partial<BoilerData> {
  return {
    heatmap7x24: generate7x24Heatmap(profileData, category),
    profiling: parseProfiling(profileData, category),
    predictedUsage: parsePredictedUsage(profileData, planData, category),
    currentCategory: category,
  };
}
