import { beforeEach, describe, expect, it, vi } from 'vitest';
import { haClient } from '@/data/ha-client';
import { oigLog } from '@/core/logger';
import {
  transformBoilerDetailTab,
  loadBoilerDetailTab,
  loadAllBoilerDetailTabs,
  setBoilerDetailTabEndpointParamsForTest,
} from '@/data/boiler-detail-tabs';

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI: vi.fn(),
  },
}));

vi.mock('@/core/logger', () => ({
  oigLog: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockFetchOIGAPI = haClient.fetchOIGAPI as ReturnType<typeof vi.fn>;
const mockLogError = oigLog.error as ReturnType<typeof vi.fn>;

// ============================================================================
// FIXTURES — inline, matching the CONTRACT exactly (established pattern; no
// dedicated fixtures/ dir exists for boiler/timeline). Snake_case as the BE emits.
// ============================================================================

/** today — in-progress: progress + eod present, blocks span historical/current/planned. */
const TODAY_RAW = {
  tab: 'today',
  available: true,
  savings: { vs_alt_czk: 12.4, vs_grid_czk: 8.1, detail: 'Cheaper than gas by 12.4 Kč' },
  adherence_pct: 92.5,
  progress: { progress_pct: 60.0, actual_cost_czk: 9.3, plan_cost_czk: 15.5, vs_plan_pct: -4.2 },
  eod_prediction: { predicted_total_czk: 14.8, vs_plan_czk: -0.7, confidence: 'medium' },
  metrics: [
    { key: 'cost_czk', plan: 15.5, actual: 9.3, better: 'lower' },
    { key: 'grid_kwh', plan: 2.0, actual: 1.1, better: 'lower' },
    { key: 'fve_kwh', plan: 3.4, actual: 2.0, better: 'higher' },
    { key: 'ready_liters_min', plan: 120, actual: 118, better: 'higher' },
  ],
  blocks: [
    { start: '06:00', end: '08:00', source: 'grid', planned_kwh: 1.2, actual_kwh: 1.1, cost_czk: 4.8, status: 'historical', mismatch: false },
    { start: '08:00', end: '10:00', source: 'fve', planned_kwh: 2.0, actual_kwh: 0.9, cost_czk: 0.0, status: 'current', mismatch: true },
    { start: '10:00', end: '12:00', source: 'fve', planned_kwh: 1.5, actual_kwh: null, cost_czk: null, status: 'planned', mismatch: false },
  ],
  capacity_kwh: 8.4,
  soc: { now_kwh: 5.2, now_liters: 96, now_pct: 62.0 },
};

/** yesterday — completed: no eod, all blocks historical, live soc all null (past day). */
const YESTERDAY_RAW = {
  tab: 'yesterday',
  available: true,
  savings: { vs_alt_czk: 20.1, vs_grid_czk: 15.0, detail: 'Saved 20.1 Kč vs gas' },
  adherence_pct: 88.0,
  progress: { progress_pct: 100.0, actual_cost_czk: 18.2, plan_cost_czk: 17.0, vs_plan_pct: 7.1 },
  eod_prediction: null,
  metrics: [
    { key: 'cost_czk', plan: 17.0, actual: 18.2, better: 'lower' },
    { key: 'grid_kwh', plan: 3.0, actual: 3.4, better: 'lower' },
  ],
  blocks: [
    { start: '05:00', end: '07:00', source: 'grid', planned_kwh: 2.0, actual_kwh: 2.2, cost_czk: 9.0, status: 'historical', mismatch: true },
    { start: '13:00', end: '15:00', source: 'fve', planned_kwh: 1.8, actual_kwh: 1.6, cost_czk: 0.0, status: 'historical', mismatch: false },
  ],
  capacity_kwh: 8.4,
  soc: { now_kwh: null, now_liters: null, now_pct: null },
};

/** tomorrow — fully planned: adherence/progress/eod null, no actuals, alt+idle sources. */
const TOMORROW_RAW = {
  tab: 'tomorrow',
  available: true,
  savings: { vs_alt_czk: 11.0, vs_grid_czk: 6.5, detail: 'Plan beats gas by 11 Kč' },
  adherence_pct: null,
  progress: null,
  eod_prediction: null,
  metrics: [
    { key: 'cost_czk', plan: 14.0, actual: null, better: 'lower' },
    { key: 'fve_kwh', plan: 4.1, actual: null, better: 'higher' },
  ],
  blocks: [
    { start: '09:00', end: '11:00', source: 'fve', planned_kwh: 2.5, actual_kwh: null, cost_czk: null, status: 'planned', mismatch: false },
    { start: '18:00', end: '20:00', source: 'alt', planned_kwh: 1.0, actual_kwh: null, cost_czk: 5.0, status: 'planned', mismatch: false },
    { start: '20:00', end: '22:00', source: 'idle', planned_kwh: 0.0, actual_kwh: null, cost_czk: null, status: 'planned', mismatch: false },
  ],
  capacity_kwh: 8.4,
  soc: { now_kwh: null, now_liters: null, now_pct: null },
};

/** yesterday on a fresh install — 200 but not available. */
const UNAVAILABLE_RAW = {
  tab: 'yesterday',
  available: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  setBoilerDetailTabEndpointParamsForTest('entry1', 'SN123');
});

// ============================================================================
// transformBoilerDetailTab
// ============================================================================

describe('transformBoilerDetailTab — populated tabs', () => {
  it('today: maps every snake_case field to camelCase', () => {
    const d = transformBoilerDetailTab(TODAY_RAW);

    expect(d.tab).toBe('today');
    expect(d.available).toBe(true);
    expect(d.savings).toEqual({ vsAltCzk: 12.4, vsGridCzk: 8.1, detail: 'Cheaper than gas by 12.4 Kč' });
    expect(d.adherencePct).toBe(92.5);
    expect(d.progress).toEqual({ progressPct: 60.0, actualCostCzk: 9.3, planCostCzk: 15.5, vsPlanPct: -4.2 });
    expect(d.eodPrediction).toEqual({ predictedTotalCzk: 14.8, vsPlanCzk: -0.7, confidence: 'medium' });
    expect(d.capacityKwh).toBe(8.4);
    expect(d.soc).toEqual({ nowKwh: 5.2, nowLiters: 96, nowPct: 62.0 });
  });

  it('today: metrics keep key/plan/actual/better', () => {
    const d = transformBoilerDetailTab(TODAY_RAW);
    expect(d.metrics).toHaveLength(4);
    expect(d.metrics?.[0]).toEqual({ key: 'cost_czk', plan: 15.5, actual: 9.3, better: 'lower' });
    expect(d.metrics?.[3]).toEqual({ key: 'ready_liters_min', plan: 120, actual: 118, better: 'higher' });
  });

  it('today: blocks map snake_case -> camelCase incl. mismatch and null actuals', () => {
    const d = transformBoilerDetailTab(TODAY_RAW);
    expect(d.blocks).toHaveLength(3);
    expect(d.blocks?.[0]).toEqual({
      start: '06:00', end: '08:00', source: 'grid', plannedKwh: 1.2,
      actualKwh: 1.1, costCzk: 4.8, status: 'historical', mismatch: false,
    });
    // current block flagged mismatch
    expect(d.blocks?.[1].status).toBe('current');
    expect(d.blocks?.[1].mismatch).toBe(true);
    // planned block: actual/cost null, not fabricated to 0
    expect(d.blocks?.[2].actualKwh).toBeNull();
    expect(d.blocks?.[2].costCzk).toBeNull();
  });

  it('yesterday: completed day — eodPrediction null, soc all null preserved', () => {
    const d = transformBoilerDetailTab(YESTERDAY_RAW);
    expect(d.available).toBe(true);
    expect(d.eodPrediction).toBeNull();
    expect(d.progress?.progressPct).toBe(100.0);
    expect(d.soc).toEqual({ nowKwh: null, nowLiters: null, nowPct: null });
    expect(d.blocks?.[0].mismatch).toBe(true);
  });

  it('tomorrow: planned-only — adherence/progress/eod null, actuals null, alt+idle sources', () => {
    const d = transformBoilerDetailTab(TOMORROW_RAW);
    expect(d.available).toBe(true);
    expect(d.adherencePct).toBeNull();
    expect(d.progress).toBeNull();
    expect(d.eodPrediction).toBeNull();
    expect(d.metrics?.[0].actual).toBeNull();
    expect(d.blocks?.[1].source).toBe('alt');
    expect(d.blocks?.[2].source).toBe('idle');
    expect(d.blocks?.[0].actualKwh).toBeNull();
  });
});

describe('transformBoilerDetailTab — available:false', () => {
  it('returns only {tab, available:false} and omits every other field (no crash)', () => {
    const d = transformBoilerDetailTab(UNAVAILABLE_RAW);

    expect(d.tab).toBe('yesterday');
    expect(d.available).toBe(false);
    // every optional field must be absent — nothing to render
    expect(d.savings).toBeUndefined();
    expect(d.adherencePct).toBeUndefined();
    expect(d.progress).toBeUndefined();
    expect(d.eodPrediction).toBeUndefined();
    expect(d.metrics).toBeUndefined();
    expect(d.blocks).toBeUndefined();
    expect(d.capacityKwh).toBeUndefined();
    expect(d.soc).toBeUndefined();
  });

  it('does not throw when savings/blocks/etc are entirely missing', () => {
    expect(() => transformBoilerDetailTab({ tab: 'yesterday', available: false })).not.toThrow();
  });
});

// ============================================================================
// loadBoilerDetailTab
// ============================================================================

describe('loadBoilerDetailTab', () => {
  it('calls the per-tab endpoint with entry_id/box_id and resolves transformed data', async () => {
    mockFetchOIGAPI.mockResolvedValueOnce(TODAY_RAW);

    const d = await loadBoilerDetailTab('today');

    expect(mockFetchOIGAPI).toHaveBeenCalledWith('/boiler/entry1/SN123/detail_tabs?tab=today');
    expect(d?.tab).toBe('today');
    expect(d?.progress?.progressPct).toBe(60.0);
  });

  it('resolves the available:false payload without crashing', async () => {
    mockFetchOIGAPI.mockResolvedValueOnce(UNAVAILABLE_RAW);

    const d = await loadBoilerDetailTab('yesterday');

    expect(d?.available).toBe(false);
    expect(d?.blocks).toBeUndefined();
  });

  it('404-shaped response (fetchOIGAPI -> null) resolves null QUIETLY (no error log)', async () => {
    // fetchOIGAPI swallows a 404 to null after logging internally; this loader
    // must NOT re-log at error severity for the expected older-BE 404 case.
    mockFetchOIGAPI.mockResolvedValueOnce(null);

    const d = await loadBoilerDetailTab('tomorrow');

    expect(d).toBeNull();
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it('a fetch rejection resolves to null — never throws past the loader', async () => {
    mockFetchOIGAPI.mockRejectedValueOnce(new Error('network boom'));

    await expect(loadBoilerDetailTab('today')).resolves.toBeNull();
    // an unexpected throw IS logged (distinct from the quiet 404 case)
    expect(mockLogError).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// loadAllBoilerDetailTabs
// ============================================================================

describe('loadAllBoilerDetailTabs', () => {
  it('fans out to 3 per-tab requests and keys the result by tab', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(TODAY_RAW)      // today
      .mockResolvedValueOnce(YESTERDAY_RAW)  // yesterday
      .mockResolvedValueOnce(TOMORROW_RAW);  // tomorrow

    const all = await loadAllBoilerDetailTabs();

    expect(mockFetchOIGAPI).toHaveBeenCalledTimes(3);
    expect(all.today?.tab).toBe('today');
    expect(all.yesterday?.tab).toBe('yesterday');
    expect(all.tomorrow?.tab).toBe('tomorrow');
  });

  it('one tab failing (null) does not reject the whole call', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(TODAY_RAW)
      .mockResolvedValueOnce(null)           // yesterday unavailable/404
      .mockResolvedValueOnce(TOMORROW_RAW);

    const all = await loadAllBoilerDetailTabs();

    expect(all.today?.available).toBe(true);
    expect(all.yesterday).toBeNull();
    expect(all.tomorrow?.available).toBe(true);
  });
});
