/**
 * OIG Cloud V2 — Boiler Detail-Tabs Data Layer (milestone 1 of the Bojler-tab-v2 rebuild)
 *
 * Data layer only — no UI. Mirrors the Ceny-side `timeline-data.ts` shape:
 * snake_case -> camelCase transforms with `??` defaults, async loaders wrapping
 * `haClient.fetchOIGAPI` in try/catch -> `oigLog.error` -> resolve null on failure.
 *
 * Endpoint (per the milestone CONTRACT, authoritative):
 *   GET /api/oig_cloud/boiler/{entry_id}/{box_id}/detail_tabs?tab=today|yesterday|tomorrow
 *
 * `{box_id}` is the inverter serial (`INVERTER_SN`), same segment the canonical
 * boiler endpoint uses (`boiler-data.ts:422` -> `/boiler/{ENTRY_ID}/{INVERTER_SN}`).
 *
 * No-fabrication rule (parent brief): every field not derivable from the response
 * resolves to null/undefined — NEVER a fabricated number (no `?? 0` on data values).
 */

import { haClient } from '@/data/ha-client';
import { oigLog } from '@/core/logger';

// ============================================================================
// ENDPOINT PARAMS
// ----------------------------------------------------------------------------
// Mirrors the `boiler-data.ts` param seam. `ENTRY_ID`/`INVERTER_SN` are NOT
// exported from `boiler-data.ts` and the scope fence forbids editing that file,
// so the URL-param read is mirrored here with its own test seam rather than
// imported. Both modules read the same `window.location.search` at load, so the
// runtime values are identical. See the report for the import-vs-duplicate note.
// ============================================================================

const params = new URLSearchParams(window.location.search);
let INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '';
let ENTRY_ID = params.get('entry_id') || '';

export function setBoilerDetailTabEndpointParamsForTest(entryId: string, inverterSn: string): void {
  ENTRY_ID = entryId;
  INVERTER_SN = inverterSn;
}

// ============================================================================
// TYPES
// ============================================================================

export type BoilerDetailTab = 'today' | 'yesterday' | 'tomorrow';

/** Block energy source. String-typed to tolerate an unknown source from BE. */
export type BoilerBlockSource = 'fve' | 'grid' | 'battery' | 'alt' | 'idle';
export type BoilerBlockStatus = 'historical' | 'current' | 'planned';
export type BoilerMetricKey = 'cost_czk' | 'grid_kwh' | 'fve_kwh' | 'ready_liters_min';
export type BoilerMetricBetter = 'lower' | 'higher';
export type BoilerConfidence = 'low' | 'medium' | 'high';

export interface BoilerDetailSavings {
  vsAltCzk: number | null;
  vsGridCzk: number | null;
  detail: string;
}

export interface BoilerDetailProgress {
  progressPct: number;
  actualCostCzk: number;
  planCostCzk: number;
  vsPlanPct: number | null;
}

export interface BoilerDetailEodPrediction {
  predictedTotalCzk: number;
  vsPlanCzk: number;
  confidence: BoilerConfidence;
}

export interface BoilerDetailMetric {
  /** One of `BoilerMetricKey`; kept `string` so an unknown key is preserved, not dropped. */
  key: string;
  plan: number;
  actual: number | null;
  better: BoilerMetricBetter;
}

export interface BoilerDetailBlock {
  start: string;            // "HH:MM"
  end: string;              // "HH:MM"
  /** One of `BoilerBlockSource`; kept `string` so an unknown source is preserved. */
  source: string;
  plannedKwh: number;
  actualKwh: number | null;
  costCzk: number | null;
  status: BoilerBlockStatus;
  mismatch: boolean;
}

export interface BoilerDetailSoc {
  nowKwh: number | null;
  nowLiters: number | null;
  nowPct: number | null;
}

/**
 * Transformed detail-tab payload. Every field below `available` is OPTIONAL:
 * on `available:false` (e.g. yesterday-on-fresh-install) the transform returns
 * only `{ tab, available:false }` and omits the rest — see `transformBoilerDetailTab`.
 */
export interface BoilerDetailTabData {
  tab: BoilerDetailTab;
  available: boolean;
  savings?: BoilerDetailSavings;
  adherencePct?: number | null;
  progress?: BoilerDetailProgress | null;
  eodPrediction?: BoilerDetailEodPrediction | null;
  metrics?: BoilerDetailMetric[];
  blocks?: BoilerDetailBlock[];
  capacityKwh?: number;
  soc?: BoilerDetailSoc;
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

function transformSavings(raw: any): BoilerDetailSavings | undefined {
  if (!raw) return undefined;
  return {
    vsAltCzk: raw.vs_alt_czk ?? null,
    vsGridCzk: raw.vs_grid_czk ?? null,
    detail: raw.detail ?? '',
  };
}

function transformProgress(raw: any): BoilerDetailProgress | null {
  if (!raw) return null;
  return {
    // Contract-guaranteed floats: passed through as-is — NOT defaulted to 0,
    // so a malformed/missing value surfaces as undefined rather than a fake number.
    progressPct: raw.progress_pct,
    actualCostCzk: raw.actual_cost_czk,
    planCostCzk: raw.plan_cost_czk,
    vsPlanPct: raw.vs_plan_pct ?? null,
  };
}

function transformEodPrediction(raw: any): BoilerDetailEodPrediction | null {
  if (!raw) return null;
  return {
    predictedTotalCzk: raw.predicted_total_czk,
    vsPlanCzk: raw.vs_plan_czk,
    confidence: raw.confidence,
  };
}

function transformMetric(raw: any): BoilerDetailMetric {
  return {
    key: raw.key,
    plan: raw.plan,
    actual: raw.actual ?? null,
    better: raw.better,
  };
}

function transformBlock(raw: any): BoilerDetailBlock {
  return {
    start: raw.start ?? '',
    end: raw.end ?? '',
    source: raw.source,
    plannedKwh: raw.planned_kwh,
    actualKwh: raw.actual_kwh ?? null,
    costCzk: raw.cost_czk ?? null,
    status: raw.status,
    mismatch: raw.mismatch ?? false,
  };
}

function transformSoc(raw: any): BoilerDetailSoc | undefined {
  if (!raw) return undefined;
  return {
    nowKwh: raw.now_kwh ?? null,
    nowLiters: raw.now_liters ?? null,
    nowPct: raw.now_pct ?? null,
  };
}

/**
 * Transform a raw detail-tab response into `BoilerDetailTabData`.
 *
 * `available:false` (yesterday-on-fresh-install) returns `{ tab, available:false }`
 * with every other field omitted — no access to `savings`/`blocks`/etc, so a
 * response that carries only `{tab, available:false}` cannot crash.
 */
export function transformBoilerDetailTab(raw: any): BoilerDetailTabData {
  const tab = raw?.tab as BoilerDetailTab;

  if (!raw || raw.available !== true) {
    return { tab, available: false };
  }

  return {
    tab,
    available: true,
    savings: transformSavings(raw.savings),
    adherencePct: raw.adherence_pct ?? null,
    progress: transformProgress(raw.progress),
    eodPrediction: transformEodPrediction(raw.eod_prediction),
    metrics: Array.isArray(raw.metrics) ? raw.metrics.map(transformMetric) : [],
    blocks: Array.isArray(raw.blocks) ? raw.blocks.map(transformBlock) : [],
    // Contract-guaranteed float — passthrough, not defaulted (no-fabrication rule).
    capacityKwh: raw.capacity_kwh,
    soc: transformSoc(raw.soc),
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Load one boiler detail tab.
 *
 * Resolves `null` — never throws — on any failure. `fetchOIGAPI` already
 * swallows fetch/HTTP errors (incl. a 404 from an older BE without the endpoint)
 * to `null` after logging internally; this loader treats that `null` as
 * "nothing to render" and stays QUIET (no extra `oigLog.error`), so the expected
 * 404 case does not spam. The catch here only fires on an unexpected throw
 * (e.g. a transform bug), which IS logged at error severity.
 */
export async function loadBoilerDetailTab(
  tab: BoilerDetailTab,
): Promise<BoilerDetailTabData | null> {
  try {
    const raw = await haClient.fetchOIGAPI(
      `/boiler/${ENTRY_ID}/${INVERTER_SN}/detail_tabs?tab=${tab}`,
    );
    if (!raw) return null;
    return transformBoilerDetailTab(raw);
  } catch (e) {
    oigLog.error(`Failed to load boiler detail tab: ${tab}`, e as Error);
    return null;
  }
}

/**
 * Load all three boiler detail tabs.
 *
 * The CONTRACT defines only a per-tab endpoint (`?tab=...`) — unlike the Ceny-side
 * `loadAllTimelineTabs`, which has a single no-tab all-tabs response. So this fans
 * out to three independent per-tab requests via `Promise.all`; each `loadBoilerDetailTab`
 * self-catches to `null`, so one tab failing never rejects the whole call.
 */
export async function loadAllBoilerDetailTabs(): Promise<
  Record<BoilerDetailTab, BoilerDetailTabData | null>
> {
  const tabs: BoilerDetailTab[] = ['today', 'yesterday', 'tomorrow'];
  const [today, yesterday, tomorrow] = await Promise.all(
    tabs.map((t) => loadBoilerDetailTab(t)),
  );
  return { today, yesterday, tomorrow };
}
