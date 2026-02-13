/**
 * OIG Cloud V2 — Timeline Data Layer
 *
 * Fetches mode timeline data from OIG REST API.
 * Endpoints:
 *   GET /api/oig_cloud/battery_forecast/{SN}/detail_tabs?tab={tab}&plan=hybrid
 *   GET /api/oig_cloud/battery_forecast/{SN}/planner_settings
 *   POST /api/oig_cloud/battery_forecast/{SN}/planner_settings
 *
 * Port of V1 js/features/timeline.js data logic.
 */

import { haClient, plannerState } from '@/data/ha-client';
import { oigLog } from '@/core/logger';

// ============================================================================
// TYPES
// ============================================================================

export type TimelineTab = 'yesterday' | 'today' | 'tomorrow' | 'history' | 'detail';

export interface ModeBlock {
  modeHistorical: string;
  modePlanned: string;
  modeMatch: boolean;
  status: 'completed' | 'current' | 'planned';
  startTime: string;        // "HH:MM"
  endTime: string;
  durationHours: number;
  costHistorical: number | null;
  costPlanned: number | null;
  costDelta: number | null;
  solarKwh: number;
  consumptionKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  intervalReasons: Array<{ time: string; reason: string }>;
}

export interface MetricTile {
  plan: number;
  actual: number | null;
  hasActual: boolean;
  unit: string;
}

export interface DaySummary {
  overallAdherence: number;
  modeSwitches: number;
  totalCost: number;
  metrics: {
    cost: MetricTile;
    solar: MetricTile;
    consumption: MetricTile;
    grid: MetricTile;
  };
  /** Today-specific fields */
  completedSummary?: {
    count: number;
    totalCost: number;
    adherencePct: number;
  };
  plannedSummary?: {
    count: number;
    totalCost: number;
  };
  progressPct?: number;
  actualTotalCost?: number;
  planTotalCost?: number;
  vsPlanPct?: number;
  eodPrediction?: {
    predictedTotal: number;
    predictedSavings: number;
  };
}

export interface TimelineDayData {
  date: string;
  modeBlocks: ModeBlock[];
  summary: DaySummary;
  metadata?: {
    activePlan: string;
    comparisonPlanAvailable?: string;
  };
  comparison?: {
    plan: string;
    modeBlocks: ModeBlock[];
  };
}

export interface PlannerSettings {
  autoModeSwitchEnabled: boolean;
  plannerMode?: string;
}

export interface TimelineState {
  activeTab: TimelineTab;
  data: Record<string, TimelineDayData | null>;
  loading: boolean;
  plannerSettings: PlannerSettings | null;
}

// ============================================================================
// MODE CONFIG (same as V1)
// ============================================================================

export const TIMELINE_MODE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  'HOME I':         { icon: '🏠', color: '#4CAF50', label: 'HOME I' },
  'HOME II':        { icon: '⚡', color: '#2196F3', label: 'HOME II' },
  'HOME III':       { icon: '🔋', color: '#9C27B0', label: 'HOME III' },
  'HOME UPS':       { icon: '🛡️', color: '#FF9800', label: 'HOME UPS' },
  'FULL HOME UPS':  { icon: '🛡️', color: '#FF9800', label: 'FULL HOME UPS' },
  'DO NOTHING':     { icon: '⏸️', color: '#9E9E9E', label: 'DO NOTHING' },
};

export const TIMELINE_TAB_LABELS: Record<TimelineTab, string> = {
  yesterday: '📊 Včera',
  today: '📆 Dnes',
  tomorrow: '📅 Zítra',
  history: '📈 Historie',
  detail: '💎 Detail',
};

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

function transformModeBlock(raw: any): ModeBlock {
  return {
    modeHistorical: raw.mode_historical ?? raw.mode ?? '',
    modePlanned: raw.mode_planned ?? '',
    modeMatch: raw.mode_match ?? false,
    status: raw.status ?? 'planned',
    startTime: raw.start_time ?? '',
    endTime: raw.end_time ?? '',
    durationHours: raw.duration_hours ?? 0,
    costHistorical: raw.cost_historical ?? null,
    costPlanned: raw.cost_planned ?? null,
    costDelta: raw.cost_delta ?? null,
    solarKwh: raw.solar_total_kwh ?? 0,
    consumptionKwh: raw.consumption_total_kwh ?? 0,
    gridImportKwh: raw.grid_import_total_kwh ?? 0,
    gridExportKwh: raw.grid_export_total_kwh ?? 0,
    intervalReasons: Array.isArray(raw.interval_reasons) ? raw.interval_reasons : [],
  };
}

function transformMetricTile(raw: any): MetricTile {
  return {
    plan: raw?.plan ?? 0,
    actual: raw?.actual ?? null,
    hasActual: raw?.has_actual ?? false,
    unit: raw?.unit ?? '',
  };
}

function transformSummary(raw: any): DaySummary {
  const metrics = raw?.metrics ?? {};
  return {
    overallAdherence: raw?.overall_adherence ?? 0,
    modeSwitches: raw?.mode_switches ?? 0,
    totalCost: raw?.total_cost ?? 0,
    metrics: {
      cost: transformMetricTile(metrics.cost),
      solar: transformMetricTile(metrics.solar),
      consumption: transformMetricTile(metrics.consumption),
      grid: transformMetricTile(metrics.grid),
    },
    completedSummary: raw?.completed_summary ? {
      count: raw.completed_summary.count ?? 0,
      totalCost: raw.completed_summary.total_cost ?? 0,
      adherencePct: raw.completed_summary.adherence_pct ?? 0,
    } : undefined,
    plannedSummary: raw?.planned_summary ? {
      count: raw.planned_summary.count ?? 0,
      totalCost: raw.planned_summary.total_cost ?? 0,
    } : undefined,
    progressPct: raw?.progress_pct,
    actualTotalCost: raw?.actual_total_cost,
    planTotalCost: raw?.plan_total_cost,
    vsPlanPct: raw?.vs_plan_pct,
    eodPrediction: raw?.eod_prediction ? {
      predictedTotal: raw.eod_prediction.predicted_total ?? 0,
      predictedSavings: raw.eod_prediction.predicted_savings ?? 0,
    } : undefined,
  };
}

function transformDayData(raw: any): TimelineDayData | null {
  if (!raw) return null;

  return {
    date: raw.date ?? '',
    modeBlocks: Array.isArray(raw.mode_blocks) ? raw.mode_blocks.map(transformModeBlock) : [],
    summary: transformSummary(raw.summary),
    metadata: raw.metadata ? {
      activePlan: raw.metadata.active_plan ?? 'hybrid',
      comparisonPlanAvailable: raw.metadata.comparison_plan_available,
    } : undefined,
    comparison: raw.comparison ? {
      plan: raw.comparison.plan ?? '',
      modeBlocks: Array.isArray(raw.comparison.mode_blocks) ? raw.comparison.mode_blocks.map(transformModeBlock) : [],
    } : undefined,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Load timeline data for a specific tab.
 */
export async function loadTimelineTab(
  inverterSn: string,
  tab: TimelineTab,
  plan = 'hybrid',
): Promise<TimelineDayData | null> {
  try {
    const data = await haClient.loadDetailTabs(inverterSn, tab, plan);
    if (!data) return null;

    // The API returns { [tab]: dayData } for single-tab requests
    const dayData = data[tab] ?? data;
    return transformDayData(dayData);
  } catch (e) {
    oigLog.error(`Failed to load timeline tab: ${tab}`, e as Error);
    return null;
  }
}

/**
 * Load all timeline tabs at once.
 */
export async function loadAllTimelineTabs(
  inverterSn: string,
  plan = 'hybrid',
): Promise<Record<string, TimelineDayData | null>> {
  try {
    const data = await haClient.fetchOIGAPI(
      `/battery_forecast/${inverterSn}/detail_tabs?plan=${plan}`,
    );
    if (!data) return {};

    return {
      yesterday: transformDayData(data.yesterday),
      today: transformDayData(data.today),
      tomorrow: transformDayData(data.tomorrow),
      history: transformDayData(data.history),
      detail: transformDayData(data.detail),
    };
  } catch (e) {
    oigLog.error('Failed to load all timeline tabs', e as Error);
    return {};
  }
}

/**
 * Load planner settings.
 */
export async function loadPlannerSettings(inverterSn: string): Promise<PlannerSettings | null> {
  try {
    const data = await plannerState.fetchSettings(haClient, inverterSn);
    if (!data) return null;

    return {
      autoModeSwitchEnabled: data.auto_mode_switch_enabled ?? false,
      plannerMode: data.planner_mode,
    };
  } catch (e) {
    oigLog.error('Failed to load planner settings', e as Error);
    return null;
  }
}

/**
 * Save planner settings (e.g. toggle auto-mode).
 */
export async function savePlannerSettings(
  inverterSn: string,
  settings: Partial<PlannerSettings>,
): Promise<boolean> {
  try {
    const payload: Record<string, unknown> = {};
    if (settings.autoModeSwitchEnabled !== undefined) {
      payload.auto_mode_switch_enabled = settings.autoModeSwitchEnabled;
    }

    await haClient.savePlannerSettings(inverterSn, payload);
    plannerState.invalidate();
    return true;
  } catch (e) {
    oigLog.error('Failed to save planner settings', e as Error);
    return false;
  }
}
