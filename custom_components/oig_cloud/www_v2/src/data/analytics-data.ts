/**
 * OIG Cloud V2 — Analytics Data Layer
 *
 * Fetches analytics data from:
 * 1. HA sensors: battery_efficiency, battery_health
 * 2. OIG REST API: unified_cost_tile, timeline (for yesterday analysis)
 *
 * Port of V1 js/features/analytics.js + battery-health.js data logic.
 */

import { haClient } from '@/data/ha-client';
import { getEntityStore } from '@/data/entity-store';
import { oigLog } from '@/core/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface BatteryEfficiencyData {
  /** Current or last-month efficiency (%) */
  efficiency: number;
  charged: number;          // kWh
  discharged: number;       // kWh
  losses: number;           // kWh
  lossesPct: number;        // %
  /** Comparison: current month efficiency - last month efficiency */
  trend: number;
  /** Which period is being shown */
  period: 'current_month' | 'last_month';
  currentMonthDays: number;
  /** Separate month data for dual bar */
  lastMonth: { efficiency: number; charged: number; discharged: number; losses: number } | null;
  currentMonth: { efficiency: number; charged: number; discharged: number; losses: number } | null;
}

export interface BatteryHealthData {
  soh: number;                    // Average SoH%
  capacity: number;               // kWh (p80)
  nominalCapacity: number;        // kWh (fallback)
  minCapacity: number;            // kWh (p20)
  measurementCount: number;
  lastAnalysis: string;           // ISO datetime
  qualityScore: number | null;
  sohMethod: string | null;
  sohMethodDescription: string | null;
  /** Measurement history for sparkline */
  measurementHistory: Array<{
    timestamp: string;
    soh_percent: number;
    capacity_kwh: number;
    delta_soc: number;
    charge_wh: number;
    duration_hours: number;
  }>;
  /** Degradation trends */
  degradation3m: number | null;
  degradation6m: number | null;
  degradation12m: number | null;
  /** Predictions */
  degradationPerYear: number | null;
  estimatedEolDate: string | null;
  yearsTo80Pct: number | null;
  trendConfidence: number | null;
  /** Derived status */
  status: 'excellent' | 'good' | 'fair' | 'poor';
  statusLabel: string;
}

export interface BatteryBalancingData {
  status: string;
  lastBalancing: string;
  cost: number;
  nextScheduled: string | null;
  /** Days remaining until next scheduled balancing */
  daysRemaining: number | null;
  /** Progress percentage (0-100) between last and next balancing */
  progressPercent: number | null;
  /** Interval in days between balancings */
  intervalDays: number | null;
  /** Estimated cost for next balancing */
  estimatedNextCost: number | null;
}

export interface CostComparisonData {
  activePlan: string;
  actualSpent: number;
  planTotalCost: number;
  futurePlanCost: number;
  tomorrowCost: number | null;
  /** Yesterday analysis */
  yesterdayPlannedCost: number | null;
  yesterdayActualCost: number | null;
  yesterdayDelta: number | null;
  yesterdayAccuracy: number | null;
}

export interface AnalyticsData {
  efficiency: BatteryEfficiencyData | null;
  health: BatteryHealthData | null;
  balancing: BatteryBalancingData | null;
  costComparison: CostComparisonData | null;
}

export const EMPTY_ANALYTICS: AnalyticsData = {
  efficiency: null,
  health: null,
  balancing: null,
  costComparison: null,
};

// ============================================================================
// BATTERY EFFICIENCY — from HA sensor
// ============================================================================

function extractEfficiency(_inverterSn: string): BatteryEfficiencyData | null {
  const store = getEntityStore();
  if (!store) return null;

  // Try to find the sensor (may have numeric suffix)
  const entityId = store.findSensorId(`battery_efficiency`);
  const entity = store.get(entityId);
  if (!entity) {
    oigLog.debug('Battery efficiency sensor not found');
    return null;
  }

  const attrs: any = entity.attributes || {};

  const lastMonth = (attrs.efficiency_last_month_pct != null) ? {
    efficiency: Number(attrs.efficiency_last_month_pct ?? 0),
    charged: Number(attrs.last_month_charge_kwh ?? 0),
    discharged: Number(attrs.last_month_discharge_kwh ?? 0),
    losses: Number(attrs.losses_last_month_kwh ?? 0),
  } : null;

  const currentMonth = (attrs.efficiency_current_month_pct != null) ? {
    efficiency: Number(attrs.efficiency_current_month_pct ?? 0),
    charged: Number(attrs.current_month_charge_kwh ?? 0),
    discharged: Number(attrs.current_month_discharge_kwh ?? 0),
    losses: Number(attrs.losses_current_month_kwh ?? 0),
  } : null;

  // Prefer last month (complete data), fall back to current
  const primary = lastMonth ?? currentMonth;
  if (!primary) return null;

  const period = lastMonth ? 'last_month' as const : 'current_month' as const;
  const trend = (lastMonth && currentMonth)
    ? currentMonth.efficiency - lastMonth.efficiency
    : 0;

  return {
    efficiency: primary.efficiency,
    charged: primary.charged,
    discharged: primary.discharged,
    losses: primary.losses,
    lossesPct: attrs[period === 'last_month' ? 'losses_last_month_pct' : 'losses_current_month_pct'] ?? 0,
    trend,
    period,
    currentMonthDays: attrs.current_month_days ?? 0,
    lastMonth,
    currentMonth,
  };
}

// ============================================================================
// BATTERY HEALTH — from HA sensor
// ============================================================================

function extractHealth(_inverterSn: string): BatteryHealthData | null {
  const store = getEntityStore();
  if (!store) return null;

  const entityId = store.findSensorId(`battery_health`);
  const entity = store.get(entityId);
  if (!entity) {
    oigLog.debug('Battery health sensor not found');
    return null;
  }

  const soh = parseFloat(entity.state) || 0;
  const attrs: any = entity.attributes || {};

  // Status classification (V1 logic)
  let status: BatteryHealthData['status'];
  let statusLabel: string;
  if (soh >= 95) { status = 'excellent'; statusLabel = 'Vynikající'; }
  else if (soh >= 90) { status = 'good'; statusLabel = 'Dobrý'; }
  else if (soh >= 80) { status = 'fair'; statusLabel = 'Uspokojivý'; }
  else { status = 'poor'; statusLabel = 'Špatný'; }

  return {
    soh,
    capacity: attrs.capacity_p80_last_20 ?? attrs.current_capacity_kwh ?? 0,
    nominalCapacity: attrs.current_capacity_kwh ?? 0,
    minCapacity: attrs.capacity_p20_last_20 ?? 0,
    measurementCount: attrs.measurement_count ?? 0,
    lastAnalysis: attrs.last_analysis ?? '',
    qualityScore: attrs.quality_score ?? null,
    sohMethod: attrs.soh_selection_method ?? null,
    sohMethodDescription: attrs.soh_method_description ?? null,
    measurementHistory: Array.isArray(attrs.measurement_history) ? attrs.measurement_history : [],
    degradation3m: attrs.degradation_3_months_percent ?? null,
    degradation6m: attrs.degradation_6_months_percent ?? null,
    degradation12m: attrs.degradation_12_months_percent ?? null,
    degradationPerYear: attrs.degradation_per_year_percent ?? null,
    estimatedEolDate: attrs.estimated_eol_date ?? null,
    yearsTo80Pct: attrs.years_to_80pct ?? null,
    trendConfidence: attrs.trend_confidence ?? null,
    status,
    statusLabel,
  };
}

// ============================================================================
// BATTERY BALANCING — from HA sensor attributes (on battery_health or separate)
// ============================================================================

/** Compute days remaining and progress between last and next balancing */
function computeBalancingProgress(
  lastStr: string,
  nextStr: string | null,
  intervalDays: number,
): { daysRemaining: number | null; progressPercent: number | null; intervalDays: number | null } {
  if (!lastStr || !nextStr) {
    return { daysRemaining: null, progressPercent: null, intervalDays: intervalDays || null };
  }
  try {
    const lastDate = new Date(lastStr);
    const nextDate = new Date(nextStr);
    const now = new Date();
    if (isNaN(lastDate.getTime()) || isNaN(nextDate.getTime())) {
      return { daysRemaining: null, progressPercent: null, intervalDays: intervalDays || null };
    }
    const totalMs = nextDate.getTime() - lastDate.getTime();
    const elapsedMs = now.getTime() - lastDate.getTime();
    const daysRemaining = Math.max(0, Math.round((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const progressPercent = totalMs > 0 ? Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100))) : null;
    const computedInterval = intervalDays || Math.round(totalMs / (1000 * 60 * 60 * 24));
    return { daysRemaining, progressPercent, intervalDays: computedInterval || null };
  } catch {
    return { daysRemaining: null, progressPercent: null, intervalDays: intervalDays || null };
  }
}

function extractBalancing(_inverterSn: string): BatteryBalancingData | null {
  const store = getEntityStore();
  if (!store) return null;

  // Balancing info might be on battery_health attrs or a separate sensor
  const entityId = store.findSensorId(`battery_balancing`);
  const entity = store.get(entityId);

  if (!entity) {
    // Fallback: read from battery_health attributes
    const healthEntity = store.get(store.findSensorId(`battery_health`));
    const hAttrs: any = healthEntity?.attributes;
    if (hAttrs?.balancing_status) {
      const lastStr = String(hAttrs.last_balancing ?? '');
      const nextStr = hAttrs.next_balancing ? String(hAttrs.next_balancing) : null;
      const computed = computeBalancingProgress(lastStr, nextStr, Number(hAttrs.balancing_interval_days ?? 0));
      return {
        status: String(hAttrs.balancing_status ?? 'unknown'),
        lastBalancing: lastStr,
        cost: Number(hAttrs.balancing_cost ?? 0),
        nextScheduled: nextStr,
        ...computed,
        estimatedNextCost: hAttrs.estimated_next_cost != null ? Number(hAttrs.estimated_next_cost) : null,
      };
    }
    return null;
  }

  const attrs: any = entity.attributes || {};
  const lastStr = String(attrs.last_balancing ?? '');
  const nextStr = attrs.next_scheduled ? String(attrs.next_scheduled) : null;
  const computed = computeBalancingProgress(lastStr, nextStr, Number(attrs.interval_days ?? 0));
  return {
    status: entity.state || 'unknown',
    lastBalancing: lastStr,
    cost: Number(attrs.cost ?? 0),
    nextScheduled: nextStr,
    ...computed,
    estimatedNextCost: attrs.estimated_next_cost != null ? Number(attrs.estimated_next_cost) : null,
  };
}

// ============================================================================
// COST COMPARISON — from OIG REST API
// ============================================================================

async function fetchCostComparison(inverterSn: string): Promise<CostComparisonData | null> {
  try {
    const data = await haClient.loadUnifiedCostTile(inverterSn);
    if (!data) return null;

    // Extract hybrid data (single-planner architecture)
    const hybridData = data.hybrid ?? data;
    const today = hybridData.today ?? {};

    const actualSpent = Math.round((today.actual_cost_so_far ?? today.actual_total_cost ?? 0) * 100) / 100;
    const futurePlanCost = today.future_plan_cost ?? 0;
    const planTotalCost = today.plan_total_cost ?? (actualSpent + futurePlanCost);
    const tomorrowCost = hybridData.tomorrow?.plan_total_cost ?? null;

    // Yesterday analysis from timeline
    let yesterdayPlannedCost: number | null = null;
    let yesterdayActualCost: number | null = null;
    let yesterdayDelta: number | null = null;
    let yesterdayAccuracy: number | null = null;

    try {
      const timeline = await haClient.loadBatteryTimeline(inverterSn, 'active');
      const yesterday = timeline?.timeline_extended?.yesterday;
      if (yesterday?.summary) {
        yesterdayPlannedCost = yesterday.summary.planned_total_cost ?? null;
        yesterdayActualCost = yesterday.summary.actual_total_cost ?? null;
        yesterdayDelta = yesterday.summary.delta_cost ?? null;
        yesterdayAccuracy = yesterday.summary.accuracy_pct ?? null;
      }
    } catch {
      oigLog.debug('Yesterday analysis not available');
    }

    return {
      activePlan: 'hybrid',
      actualSpent,
      planTotalCost,
      futurePlanCost,
      tomorrowCost,
      yesterdayPlannedCost,
      yesterdayActualCost,
      yesterdayDelta,
      yesterdayAccuracy,
    };
  } catch (e) {
    oigLog.error('Failed to fetch cost comparison', e as Error);
    return null;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Load all analytics data. Sensor data is synchronous, API data is async.
 */
export async function loadAnalyticsData(inverterSn: string): Promise<AnalyticsData> {
  // Sensor-based extractions are synchronous
  const efficiency = extractEfficiency(inverterSn);
  const health = extractHealth(inverterSn);
  const balancing = extractBalancing(inverterSn);

  // API-based fetch is async
  const costComparison = await fetchCostComparison(inverterSn);

  return {
    efficiency,
    health,
    balancing,
    costComparison,
  };
}

/**
 * Extract only sensor-based analytics (no API calls, for quick updates).
 */
export function extractAnalyticsSensors(inverterSn: string): Pick<AnalyticsData, 'efficiency' | 'health' | 'balancing'> {
  return {
    efficiency: extractEfficiency(inverterSn),
    health: extractHealth(inverterSn),
    balancing: extractBalancing(inverterSn),
  };
}
