// ============================================================================
// Boiler Tab — Data Layer
// Full feature parity with V1: API fetching, parsing, state extraction
// ============================================================================

import {
  BoilerProfile, BoilerState, BoilerHourData, BoilerPlan,
  BoilerEnergyBreakdown, BoilerPredictedUsage, BoilerConfig,
  BoilerHeatmapRow, BoilerProfilingData, BoilerData, BoilerPlanSlot,
  BoilerV2Data, BoilerV2PlanSlot, DemandMapData,
  CirculationRun, LegionellaStatus, PlanSummary, EnergyToday,
  OVERRIDE_TTL_DEFAULT_MINUTES, OVERRIDE_TTL_MIN_MINUTES,
  OVERRIDE_TTL_MAX_MINUTES, OVERRIDE_TTL_STEP_MINUTES,
  SOURCE_LABELS,
} from '@/ui/features/boiler/types';
import { haClient } from '@/data/ha-client';
import { oigLog } from '@/core/logger';

const PLANNER_SOURCE_MAP: Record<string, string> = {
  fve: 'fve',
  pv: 'fve',
  overflow: 'overflow',
  grid: 'grid',
  // 'alternative' is kept distinct so the plan strip can render orange alt bands
  alternative: 'alternative',
  alt: 'alternative',
  // R3: battery source emitted when Home 5 maneuver is active
  battery: 'battery',
};

const RUNTIME_SOURCE_MAP: Record<string, string> = {
  fve: 'fve',
  pv: 'fve',
  overflow: 'overflow',
  grid: 'grid',
  // 'alternative'/'alt' kept distinct — gas/alt heating is NOT the same as grid
  alternative: 'alternative',
  alt: 'alternative',
  discharge: 'discharge',
  discharging: 'discharge',
};

export function normalizePlannerSource(raw: string | null | undefined): { source: string | null; sourceInvalid: boolean } {
  if (raw == null || raw === '') return { source: null, sourceInvalid: false };
  const normalized = PLANNER_SOURCE_MAP[raw.toLowerCase()];
  if (normalized !== undefined) return { source: normalized, sourceInvalid: false };
  return { source: null, sourceInvalid: true };
}

export function normalizeRuntimeSource(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  return RUNTIME_SOURCE_MAP[raw.toLowerCase()] ?? null;
}

const PUBLIC_BOILER_FLAGS = new Set([
  'temperature_unavailable',
  'temperature_stale',
  'source_stale',
  'activity_stale',
  'source_invalid',
  'power_sign_mismatch_charge',
  'power_sign_mismatch_discharge',
  'runtime_cache_empty',
]);

export function filterPublicFlags(flags: string[]): string[] {
  return flags.filter(f => PUBLIC_BOILER_FLAGS.has(f));
}

const params = new URLSearchParams(window.location.search);
let INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '';
let ENTRY_ID = params.get('entry_id') || '';

export function getSensorId(sensor: string): string {
  return `sensor.oig_${INVERTER_SN}_${sensor}`;
}

export function setBoilerEndpointParamsForTest(entryId: string, inverterSn: string): void {
  ENTRY_ID = entryId;
  INVERTER_SN = inverterSn;
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
// CANONICAL API FETCHING
// ============================================================================

interface BoilerCanonicalSlot {
  start: string;
  end: string;
  consumption_kwh: number;
  confidence: number;
  recommended_source: string;
  spot_price: number | null;
  alt_price: number | null;
  overflow_available: boolean;
  predicted_temperature_c?: number | null;
  predicted_top_temp_c?: number | null;
  comfort_satisfied?: boolean | null;
  estimated_cost_czk?: number | null;
  pv_share?: number | null;
  pv_contribution_kwh?: number | null;
  heating_kwh?: number | null;
  pv_kwh?: number | null;
  grid_kwh?: number | null;
  alt_kwh?: number | null;
  /** Purpose: 'comfort' (default) or 'legionella' — R9/R12 */
  purpose?: string | null;
}

interface BoilerCanonicalActivity {
  state: string;
  source: string | null;
  temperature_trend_c_per_min: number | null;
  fill_level_pct: number | null;
  aura_max_temp_c: number;
  heater_states: Record<string, string>;
  stale_flags: string[];
}

interface BoilerCanonicalSourceSegment {
  key: string;
  start: string;
  end: string | null;
  energy_kwh: number;
  fill_pct: number;
  active: boolean;
}

interface BoilerCanonicalTimelinePoint {
  timestamp: string;
  top_temp_c: number | null;
  bottom_temp_c: number | null;
  power_kw: number | null;
  source_key: string | null;
  activity_state: string;
}

interface BoilerCanonicalSparkline {
  temperature: number[];
  power: number[];
}

interface BoilerCanonicalAPI {
  entry_id: string;
  box_id: string;
  /** F5/Task C: alt source type ("gas"|"heat_pump"|"fireplace"|"other") */
  alt_source_type?: string | null;
  current_state: {
    temperatures: {
      top?: number;
      bottom?: number;
      upper_zone?: number;
      lower_zone?: number;
    };
    energy_state: {
      avg_temp?: number;
      energy_needed_kwh?: number;
    };
    energy_tracking: {
      current_source?: string;
      total_kwh?: number;
      fve_kwh?: number;
      grid_kwh?: number;
      alt_kwh?: number;
    };
    heating: boolean;
    recommended_source: string | null;
    last_update: string;
  };
  comfort_status: {
    comfort_satisfied: boolean;
    comfort_status_code: string | null;
    temperature_at_deadline_c: number | null;
    unsatisfied_comfort_gap_c: number | null;
  };
  selected_source: string | null;
  actuated_source: string | null;
  plan_slots: BoilerCanonicalSlot[];
  reason_codes: string[];
  freshness: {
    plan_created_at?: string;
    plan_valid_until?: string;
    last_update: string;
    data_age_seconds: number;
    profile_last_updated?: string;
  };
  degraded_flags: {
    degraded: boolean;
    flags: string[];
    serializer_state: string | null;
  };
  manual_override: {
    active: boolean;
    state: any;
  };
  activity?: BoilerCanonicalActivity | null;
  source_segments?: BoilerCanonicalSourceSegment[] | null;
  timeline?: BoilerCanonicalTimelinePoint[] | null;
  sparkline?: BoilerCanonicalSparkline | null;
  demand_map?: {
    slot_duration_min: number;
    slots_p50: number[];
    slots_p80: number[];
    windows: Array<{
      slot_index: number;
      start_minute: number;
      p80_kwh: number;
      liters: number;
      label: string;
    }>;
    profile: {
      category: string;
      level: string;
      days_used: number;
      label: string;
      fallback_used: boolean;
    };
    confidence: number;
  } | null;
  circulation_runs?: Array<{
    start: string;
    end: string;
    label: string;
  }> | null;
  legionella?: {
    enabled: boolean;
    days_since_last: number | null;
    interval_days: number | null;
    scheduled_start: string | null;
  } | null;
  plan_summary?: {
    estimated_cost_czk: number | null;
    cost_if_all_grid: number | null;
    cost_if_all_alt: number | null;
    deadline_time: string;
  } | null;
  energy_today?: {
    total_kwh: number;
    fve_kwh: number;
    grid_kwh: number;
    alt_kwh: number;
    battery_kwh: number;
    unattributed_kwh?: number;
    source_invalid: boolean;
  } | null;
}

async function fetchBoilerCanonical(): Promise<{ profileData: BoilerPlanAPI | null; planData: BoilerPlanAPI | null; canonical: BoilerCanonicalAPI | null; configProfileUnavailable: boolean; boilerProfileConfig: Record<string, any> | null }> {
  try {
    if (!ENTRY_ID || !INVERTER_SN) {
      oigLog.warn('[Boiler] No entry_id or inverter_sn — cannot fetch boiler canonical');
      return { profileData: null, planData: null, canonical: null, configProfileUnavailable: false, boilerProfileConfig: null };
    }
    const canonical = await haClient.fetchOIGAPI<BoilerCanonicalAPI>(`/boiler/${ENTRY_ID}/${INVERTER_SN}`);
    if (!canonical) {
      return { profileData: null, planData: null, canonical: null, configProfileUnavailable: false, boilerProfileConfig: null };
    }

    let configProfileUnavailable = false;
    let boilerProfileConfig: Record<string, any> | null = null;
    try {
      const profileResp = await haClient.fetchOIGAPI<any>(`/${ENTRY_ID}/boiler_profile`);
      if (profileResp?.config) {
        boilerProfileConfig = profileResp.config;
      } else {
        configProfileUnavailable = true;
      }
    } catch {
      configProfileUnavailable = true;
    }

    const mappedPlanData: BoilerPlanAPI = {
      state: {
        current_temp: canonical.current_state.temperatures?.upper_zone ?? canonical.current_state.temperatures?.top,
        target_temp: undefined,
        heating: canonical.current_state.heating,
        temperatures: canonical.current_state.temperatures,
        energy_state: canonical.current_state.energy_state,
        recommended_source: canonical.selected_source || canonical.current_state.recommended_source || undefined,
        circulation_recommended: false,
      },
      slots: canonical.plan_slots.map((s) => ({
        start: s.start,
        end: s.end,
        consumption_kwh: s.consumption_kwh,
        avg_consumption_kwh: s.consumption_kwh,
        recommended_source: s.recommended_source,
        spot_price: s.spot_price ?? undefined,
      })),
      total_consumption_kwh: canonical.plan_slots.reduce((sum, s) => sum + (s.consumption_kwh || 0), 0),
      fve_kwh: canonical.current_state.energy_tracking?.fve_kwh ?? 0,
      grid_kwh: canonical.current_state.energy_tracking?.grid_kwh ?? 0,
      alt_kwh: canonical.current_state.energy_tracking?.alt_kwh ?? 0,
      next_slot: canonical.plan_slots[0] || undefined,
      profiles: {},
    };
    return { profileData: mappedPlanData, planData: mappedPlanData, canonical, configProfileUnavailable, boilerProfileConfig };
  } catch (err) {
    oigLog.warn('[Boiler] Failed to fetch canonical', { err });
    return { profileData: null, planData: null, canonical: null, configProfileUnavailable: false, boilerProfileConfig: null };
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
    currentTemp: isFinite(state?.current_temp as any) ? (state?.current_temp ?? null) : null,
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

function parseConfig(rawConfig: Record<string, any> | null): BoilerConfig {
  const config = rawConfig ?? {};
  const volumeL = isFinite(config.volume_l as any) ? (config.volume_l ?? null) : null;
  const heaterPowerKw = isFinite((config as any).heater_power_kw as any) ? ((config as any).heater_power_kw ?? null) : null;
  const heaterPowerW = heaterPowerKw !== null ? heaterPowerKw * 1000 : null;

  return {
    volumeL,
    heaterPowerW,
    heaterPowerKw,
    targetTempC: isFinite(config.target_temp_c as any) ? (config.target_temp_c ?? null) : null,
    deadlineTime: (config as any).deadline_time || '--:--',
    stratificationMode: (config as any).stratification_mode || '--',
    kCoefficient: volumeL ? (volumeL * 0.001163).toFixed(4) : '--',
    coldInletTempC: isFinite(config.cold_inlet_temp_c as any) ? (config.cold_inlet_temp_c ?? 10) : 10,
    auraMaxTempC: isFinite((config as any).aura_max_temp_c as any) ? ((config as any).aura_max_temp_c ?? null) : null,
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

const VALID_ACTIVITY_STATES = new Set([
  'charging_fve', 'charging_overflow', 'charging_grid', 'charging_alt', 'discharging', 'standby', 'unknown',
]);

function normalizeActivityState(raw: string | null | undefined): 'charging_fve' | 'charging_overflow' | 'charging_grid' | 'charging_alt' | 'discharging' | 'standby' | 'unknown' {
  if (raw && VALID_ACTIVITY_STATES.has(raw)) {
    return raw as 'charging_fve' | 'charging_overflow' | 'charging_grid' | 'charging_alt' | 'discharging' | 'standby' | 'unknown';
  }
  return 'unknown';
}

function normalizeHeaterState(raw: string | null | undefined): 'on' | 'off' | 'unavailable' {
  if (raw === 'on') return 'on';
  if (raw === 'off') return 'off';
  return 'unavailable';
}

export { OVERRIDE_TTL_DEFAULT_MINUTES, OVERRIDE_TTL_MIN_MINUTES, OVERRIDE_TTL_MAX_MINUTES, OVERRIDE_TTL_STEP_MINUTES };

export function mapCanonicalToV2(canonical: BoilerCanonicalAPI | null, configProfileUnavailable = false): BoilerV2Data {
  const noIdentity = { entryId: null, boxId: null, available: false };

  if (!canonical) {
    return {
      status: null,
      planSlots: [],
      explanation: null,
      manualOverride: null,
      identity: noIdentity,
      activity: null,
      sourceSegments: [],
      timeline: [],
      sparkline: null,
      demandMap: null,
      circulationRuns: [],
      legionella: null,
      planSummary: null,
      energyToday: null,
      loading: false,
      loadError: 'Nepodařilo se načíst data bojleru',
      altSourceType: null,
    };
  }

  const cs = canonical.current_state;
  const temps = cs.temperatures ?? {};
  const temperatureTop = isFinite(temps.top as any) ? (temps.top ?? null) : (isFinite(temps.upper_zone as any) ? (temps.upper_zone ?? null) : null);
  const temperatureBottom = isFinite(temps.bottom as any) ? (temps.bottom ?? null) : (isFinite(temps.lower_zone as any) ? (temps.lower_zone ?? null) : null);

  const status = {
    currentState: (cs.heating ? 'heating' : 'idle') as 'heating' | 'idle' | 'unknown',
    comfortSatisfied: canonical.comfort_status.comfort_satisfied,
    comfortStatusCode: canonical.comfort_status.comfort_status_code,
    selectedSource: normalizePlannerSource(canonical.selected_source).source,
    actuatedSource: normalizePlannerSource(canonical.actuated_source).source,
    temperatureTop,
    temperatureBottom,
    energyNeededKwh: isFinite(cs.energy_state?.energy_needed_kwh as any) ? (cs.energy_state?.energy_needed_kwh ?? null) : null,
    heating: cs.heating,
    lastUpdate: cs.last_update ?? null,
    degraded: canonical.degraded_flags.degraded,
    degradedFlags: filterPublicFlags(canonical.degraded_flags.flags ?? []),
  };

  const planSlots: BoilerV2PlanSlot[] = (canonical.plan_slots ?? []).map(s => {
    const { source: recommendedSource, sourceInvalid } = normalizePlannerSource(s.recommended_source);
    return {
      start: s.start,
      end: s.end,
      consumptionKwh: s.consumption_kwh,
      confidence: s.confidence,
      recommendedSource,
      sourceInvalid: sourceInvalid || null,
      spotPrice: isFinite(s.spot_price as any) ? (s.spot_price ?? null) : null,
      altPrice: isFinite(s.alt_price as any) ? (s.alt_price ?? null) : null,
      overflowAvailable: s.overflow_available,
      heatingKwh: s.heating_kwh ?? null,
      pvKwh: s.pv_kwh ?? null,
      gridKwh: s.grid_kwh ?? null,
      altKwh: s.alt_kwh ?? null,
      expectedTempTopC: s.predicted_top_temp_c ?? s.predicted_temperature_c ?? null,
      comfortSatisfied: s.comfort_satisfied ?? null,
      estimatedCostCzk: s.estimated_cost_czk ?? null,
      pvShare: typeof s.pv_share === 'number'
        ? s.pv_share
        : (s.consumption_kwh && s.pv_contribution_kwh != null
            ? s.pv_contribution_kwh / s.consumption_kwh
            : null),
      // R9/R12: purpose — 'comfort' (default) or 'legionella'
      purpose: s.purpose ?? null,
    };
  });

  const backendFlags = filterPublicFlags(canonical.degraded_flags.flags ?? []);
  const degradedReasons = configProfileUnavailable
    ? [...backendFlags, 'config_profile_unavailable']
    : backendFlags;

  const freshness = canonical.freshness ?? {};
  const explanation = {
    reasonCodes: canonical.reason_codes ?? [],
    planCreatedAt: freshness.plan_created_at ?? null,
    planValidUntil: freshness.plan_valid_until ?? null,
    dataAgeSecs: isFinite(freshness.data_age_seconds as any) ? (freshness.data_age_seconds ?? null) : null,
    degradedReasons,
    unsatisfiedComfortGapC: canonical.comfort_status.unsatisfied_comfort_gap_c ?? null,
    temperatureAtDeadlineC: canonical.comfort_status.temperature_at_deadline_c ?? null,
  };

  const manualOverride = {
    active: canonical.manual_override?.active ?? false,
    ttlMinutes: OVERRIDE_TTL_DEFAULT_MINUTES,
    reason: '',
    capabilityAvailable: canonical.manual_override != null,
  };

  const identity = {
    entryId: canonical.entry_id,
    boxId: canonical.box_id,
    available: !!(canonical.entry_id && canonical.box_id),
  };

  const rawActivity = canonical.activity ?? null;
  const activity = rawActivity != null ? {
    state: normalizeActivityState(rawActivity.state),
    source: normalizeRuntimeSource(rawActivity.source) as 'fve' | 'overflow' | 'grid' | 'discharge' | 'alternative' | null,
    temperatureTrendCPerMin: isFinite(rawActivity.temperature_trend_c_per_min as any) ? (rawActivity.temperature_trend_c_per_min ?? null) : null,
    fillLevelPct: isFinite(rawActivity.fill_level_pct as any) ? (rawActivity.fill_level_pct ?? null) : null,
    auraMaxTempC: isFinite(rawActivity.aura_max_temp_c as any) ? rawActivity.aura_max_temp_c : 0,
    heaterStates: Object.fromEntries(
      Object.entries(rawActivity.heater_states ?? {}).map(([k, v]) => [k, normalizeHeaterState(v)])
    ),
    staleFlags: filterPublicFlags(Array.isArray(rawActivity.stale_flags) ? rawActivity.stale_flags : []),
    sourceEstimated: (rawActivity as any).source_estimated === true,
  } : null;

  const sourceSegments = (canonical.source_segments ?? []).map(seg => ({
    key: normalizeRuntimeSource(seg.key) as 'fve' | 'overflow' | 'grid' | 'discharge' | 'alternative' | null,
    start: seg.start,
    end: seg.end,
    energyKwh: isFinite(seg.energy_kwh as any) ? seg.energy_kwh : 0,
    fillPct: isFinite(seg.fill_pct as any) ? seg.fill_pct : 0,
    active: seg.active,
  }));

  const timeline = (canonical.timeline ?? []).map(pt => ({
    timestamp: pt.timestamp,
    topTempC: isFinite(pt.top_temp_c as any) ? (pt.top_temp_c ?? null) : null,
    bottomTempC: isFinite(pt.bottom_temp_c as any) ? (pt.bottom_temp_c ?? null) : null,
    powerKw: isFinite(pt.power_kw as any) ? (pt.power_kw ?? null) : null,
    sourceKey: normalizeRuntimeSource(pt.source_key) as 'fve' | 'overflow' | 'grid' | 'discharge' | 'alternative' | null,
    activityState: normalizeActivityState(pt.activity_state),
  }));

  const rawSparkline = canonical.sparkline ?? null;
  const sparkline = rawSparkline != null ? {
    temperature: Array.isArray(rawSparkline.temperature) ? rawSparkline.temperature : [],
    power: Array.isArray(rawSparkline.power) ? rawSparkline.power : [],
  } : null;

  const rawDemandMap = canonical.demand_map ?? null;
  const demandMap: DemandMapData | null = rawDemandMap != null ? {
    slotDurationMin: rawDemandMap.slot_duration_min,
    slotsP50: Array.isArray(rawDemandMap.slots_p50) ? rawDemandMap.slots_p50 : [],
    slotsP80: Array.isArray(rawDemandMap.slots_p80) ? rawDemandMap.slots_p80 : [],
    windows: Array.isArray(rawDemandMap.windows) ? rawDemandMap.windows.map(w => ({
      slotIndex: w.slot_index,
      startMinute: w.start_minute,
      p80Kwh: w.p80_kwh,
      liters: w.liters,
      label: w.label,
    })) : [],
    profile: {
      category: rawDemandMap.profile.category,
      level: rawDemandMap.profile.level,
      daysUsed: rawDemandMap.profile.days_used,
      label: rawDemandMap.profile.label,
      fallbackUsed: rawDemandMap.profile.fallback_used,
    },
    confidence: rawDemandMap.confidence,
  } : null;

  // circulation_runs
  const rawCirc = canonical.circulation_runs ?? [];
  const circulationRuns: CirculationRun[] = Array.isArray(rawCirc)
    ? rawCirc.map(r => ({ start: r.start, end: r.end, label: r.label || '' }))
    : [];

  // legionella
  const rawLeg = canonical.legionella ?? null;
  const legionella: LegionellaStatus | null = rawLeg != null ? {
    enabled: rawLeg.enabled === true,
    daysSinceLast: typeof rawLeg.days_since_last === 'number' ? rawLeg.days_since_last : null,
    intervalDays: typeof rawLeg.interval_days === 'number' ? rawLeg.interval_days : null,
    scheduledStart: rawLeg.scheduled_start ?? null,
  } : null;

  // plan_summary
  const rawPS = canonical.plan_summary ?? null;
  const planSummary: PlanSummary | null = rawPS != null ? {
    estimatedCostCzk: typeof rawPS.estimated_cost_czk === 'number' ? rawPS.estimated_cost_czk : null,
    costIfAllGrid: typeof rawPS.cost_if_all_grid === 'number' ? rawPS.cost_if_all_grid : null,
    costIfAllAlt: typeof rawPS.cost_if_all_alt === 'number' ? rawPS.cost_if_all_alt : null,
    deadlineTime: rawPS.deadline_time || '18:00',
  } : null;

  // energy_today
  const rawET = canonical.energy_today ?? null;
  const energyToday: EnergyToday | null = rawET != null ? {
    totalKwh: typeof rawET.total_kwh === 'number' ? rawET.total_kwh : 0,
    fveKwh: typeof rawET.fve_kwh === 'number' ? rawET.fve_kwh : 0,
    gridKwh: typeof rawET.grid_kwh === 'number' ? rawET.grid_kwh : 0,
    altKwh: typeof rawET.alt_kwh === 'number' ? rawET.alt_kwh : 0,
    batteryKwh: typeof rawET.battery_kwh === 'number' ? rawET.battery_kwh : 0,
    unattributedKwh: typeof rawET.unattributed_kwh === 'number' ? rawET.unattributed_kwh : 0,
    sourceInvalid: rawET.source_invalid === true,
  } : null;

  return {
    status,
    planSlots,
    explanation,
    manualOverride,
    identity,
    activity,
    sourceSegments,
    timeline,
    sparkline,
    demandMap,
    circulationRuns,
    legionella,
    planSummary,
    energyToday,
    loading: false,
    loadError: null,
    // F5/Task C: pass alt_source_type from canonical DTO to FE consumers
    altSourceType: typeof canonical.alt_source_type === 'string' ? canonical.alt_source_type : null,
  };
}

export function parseStateForTest(
  planData: BoilerPlanAPI | null,
  profileData: BoilerPlanAPI | null,
  config: BoilerConfig,
): BoilerState {
  return parseState(planData, profileData, config);
}

export function parseConfigForTest(profileDataOrConfig: { config?: Record<string, any> } | null): BoilerConfig {
  if (profileDataOrConfig == null) return parseConfig(null);
  if ('config' in profileDataOrConfig && profileDataOrConfig.config != null) {
    return parseConfig(profileDataOrConfig.config as Record<string, any>);
  }
  return parseConfig(null);
}

// ============================================================================
// MAIN LOADER
// ============================================================================

export async function loadBoilerData(_hass?: any): Promise<BoilerData> {
  const { profileData, planData, canonical, configProfileUnavailable, boilerProfileConfig } = await fetchBoilerCanonical();

  let batteryTimeline: any[] | null = null;
  try {
    const timelineData = await haClient.loadBatteryTimeline(INVERTER_SN, 'active');
    batteryTimeline = timelineData?.active || timelineData || null;
    if (Array.isArray(batteryTimeline) && batteryTimeline.length === 0) batteryTimeline = null;
  } catch (_batteryTimelineError: unknown) {
    void _batteryTimelineError;
  }

  const currentCategory = profileData?.current_category || Object.keys(profileData?.profiles || {})[0] || 'workday_summer';
  const availableCategories = Object.keys(profileData?.profiles || {});

  const config = parseConfig(boilerProfileConfig);

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
    v2Data: mapCanonicalToV2(canonical, configProfileUnavailable),
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
