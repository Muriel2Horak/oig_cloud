import { beforeEach, describe, expect, it, vi } from 'vitest';
import { haClient, plannerState } from '@/data/ha-client';
import { oigLog } from '@/core/logger';
import {
  TIMELINE_MODE_CONFIG,
  TIMELINE_TAB_LABELS,
  loadAllTimelineTabs,
  loadPlannerSettings,
  loadTimelineTab,
  savePlannerSettings,
} from '@/data/timeline-data';

const loadDetailTabs = vi.hoisted(() => vi.fn());
const fetchOIGAPI = vi.hoisted(() => vi.fn());
const savePlannerSettingsMock = vi.hoisted(() => vi.fn());
const fetchSettings = vi.hoisted(() => vi.fn());
const invalidate = vi.hoisted(() => vi.fn());

vi.mock('@/data/ha-client', () => ({
  haClient: {
    loadDetailTabs,
    fetchOIGAPI,
    savePlannerSettings: savePlannerSettingsMock,
  },
  plannerState: {
    fetchSettings,
    invalidate,
  },
}));

vi.mock('@/core/logger', () => ({
  oigLog: {
    error: vi.fn(),
  },
}));

const mockLoadDetailTabs = haClient.loadDetailTabs as ReturnType<typeof vi.fn>;
const mockFetchOIGAPI = haClient.fetchOIGAPI as ReturnType<typeof vi.fn>;
const mockSavePlannerSettings = haClient.savePlannerSettings as ReturnType<typeof vi.fn>;
const mockFetchSettings = plannerState.fetchSettings as ReturnType<typeof vi.fn>;
const mockInvalidate = plannerState.invalidate as ReturnType<typeof vi.fn>;
const mockLogError = oigLog.error as ReturnType<typeof vi.fn>;

const COMPLETE_RAW = {
  date: '2026-08-13',
  mode_blocks: [
    {
      mode_historical: 'HOME I',
      mode_planned: 'HOME II',
      mode_match: false,
      status: 'completed',
      start_time: '23:30',
      end_time: '00:15',
      duration_hours: 0.75,
      cost_historical: 4.25,
      cost_planned: 3.9,
      cost_delta: 0.35,
      solar_total_kwh: 1.2,
      consumption_total_kwh: 2.4,
      grid_import_total_kwh: 1.2,
      grid_export_total_kwh: 0.1,
      interval_reasons: [{ time: '23:45', reason: 'planned transition' }],
    },
    {
      mode: 'DO NOTHING',
      status: 'current',
      start_time: '00:15',
      end_time: '01:00',
      interval_reasons: 'malformed',
    },
    {
      mode_historical: 'HOME UPS',
      mode_planned: 'HOME UPS',
      mode_match: true,
      status: 'planned',
      start_time: '01:00',
      end_time: '02:00',
      duration_hours: 1,
    },
  ],
  summary: {
    overall_adherence: 87.5,
    mode_switches: 2,
    total_cost: 8.15,
    metrics: {
      cost: { plan: 7.8, actual: 8.15, has_actual: true, unit: 'Kč' },
      solar: { plan: 3.2, actual: 2.8, has_actual: true, unit: 'kWh' },
      consumption: { plan: 5.5, actual: null, has_actual: false, unit: 'kWh' },
      grid: { plan: 2.3, actual: 2.4, has_actual: true, unit: 'kWh' },
    },
    completed_summary: { count: 2, total_cost: 5.2, adherence_pct: 91 },
    planned_summary: { count: 1, total_cost: 2.95 },
    progress_pct: 66,
    actual_total_cost: 8.15,
    plan_total_cost: 7.8,
    vs_plan_pct: 4.49,
    backup_baseline_cost: 12,
    backup_actual_cost: 8.15,
    backup_savings: 3.85,
    eod_prediction: { predicted_total: 10.2, predicted_savings: 1.8 },
  },
  metadata: { active_plan: 'hybrid', comparison_plan_available: 'baseline' },
  comparison: {
    plan: 'baseline',
    mode_blocks: [{ mode: 'DO NOTHING', status: 'planned', start_time: '02:00', end_time: '03:00' }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('timeline constants', () => {
  it('exposes the configured mode presentation and tab labels', () => {
    expect(TIMELINE_MODE_CONFIG).toEqual({
      'HOME I': { icon: '🏠', color: '#4CAF50', label: 'HOME I' },
      'HOME II': { icon: '⚡', color: '#2196F3', label: 'HOME II' },
      'HOME III': { icon: '🔋', color: '#9C27B0', label: 'HOME III' },
      'HOME UPS': { icon: '🛡️', color: '#FF9800', label: 'HOME UPS' },
      'FULL HOME UPS': { icon: '🛡️', color: '#FF9800', label: 'FULL HOME UPS' },
      'DO NOTHING': { icon: '⏸️', color: '#9E9E9E', label: 'DO NOTHING' },
    });
    expect(TIMELINE_TAB_LABELS).toEqual({
      yesterday: '📊 Včera',
      today: '📆 Dnes',
      tomorrow: '📅 Zítra',
      history: '📈 Historie',
      detail: '💎 Detail',
    });
  });
});

describe('loadTimelineTab', () => {
  it('maps a nested day payload including transition blocks and optional summaries', async () => {
    mockLoadDetailTabs.mockResolvedValueOnce({ today: COMPLETE_RAW });

    const result = await loadTimelineTab('SN123', 'today', 'baseline');

    expect(mockLoadDetailTabs).toHaveBeenCalledWith('SN123', 'today', 'baseline');
    expect(result).toEqual({
      date: '2026-08-13',
      modeBlocks: [
        {
          modeHistorical: 'HOME I',
          modePlanned: 'HOME II',
          modeMatch: false,
          status: 'completed',
          startTime: '23:30',
          endTime: '00:15',
          durationHours: 0.75,
          costHistorical: 4.25,
          costPlanned: 3.9,
          costDelta: 0.35,
          solarKwh: 1.2,
          consumptionKwh: 2.4,
          gridImportKwh: 1.2,
          gridExportKwh: 0.1,
          intervalReasons: [{ time: '23:45', reason: 'planned transition' }],
        },
        {
          modeHistorical: 'DO NOTHING',
          modePlanned: '',
          modeMatch: false,
          status: 'current',
          startTime: '00:15',
          endTime: '01:00',
          durationHours: 0,
          costHistorical: null,
          costPlanned: null,
          costDelta: null,
          solarKwh: 0,
          consumptionKwh: 0,
          gridImportKwh: 0,
          gridExportKwh: 0,
          intervalReasons: [],
        },
        {
          modeHistorical: 'HOME UPS',
          modePlanned: 'HOME UPS',
          modeMatch: true,
          status: 'planned',
          startTime: '01:00',
          endTime: '02:00',
          durationHours: 1,
          costHistorical: null,
          costPlanned: null,
          costDelta: null,
          solarKwh: 0,
          consumptionKwh: 0,
          gridImportKwh: 0,
          gridExportKwh: 0,
          intervalReasons: [],
        },
      ],
      summary: {
        overallAdherence: 87.5,
        modeSwitches: 2,
        totalCost: 8.15,
        metrics: {
          cost: { plan: 7.8, actual: 8.15, hasActual: true, unit: 'Kč' },
          solar: { plan: 3.2, actual: 2.8, hasActual: true, unit: 'kWh' },
          consumption: { plan: 5.5, actual: null, hasActual: false, unit: 'kWh' },
          grid: { plan: 2.3, actual: 2.4, hasActual: true, unit: 'kWh' },
        },
        completedSummary: { count: 2, totalCost: 5.2, adherencePct: 91 },
        plannedSummary: { count: 1, totalCost: 2.95 },
        progressPct: 66,
        actualTotalCost: 8.15,
        planTotalCost: 7.8,
        vsPlanPct: 4.49,
        backupBaselineCost: 12,
        backupActualCost: 8.15,
        backupSavings: 3.85,
        eodPrediction: { predictedTotal: 10.2, predictedSavings: 1.8 },
      },
      metadata: { activePlan: 'hybrid', comparisonPlanAvailable: 'baseline' },
      comparison: {
        plan: 'baseline',
        modeBlocks: [{
          modeHistorical: 'DO NOTHING',
          modePlanned: '',
          modeMatch: false,
          status: 'planned',
          startTime: '02:00',
          endTime: '03:00',
          durationHours: 0,
          costHistorical: null,
          costPlanned: null,
          costDelta: null,
          solarKwh: 0,
          consumptionKwh: 0,
          gridImportKwh: 0,
          gridExportKwh: 0,
          intervalReasons: [],
        }],
      },
    });
  });

  it('uses an unwrapped day payload and defaults missing fields safely', async () => {
    mockLoadDetailTabs.mockResolvedValueOnce({
      date: '2026-08-14',
      mode_blocks: {},
      summary: undefined,
      metadata: {},
      comparison: { mode_blocks: null },
    });

    await expect(loadTimelineTab('SN123', 'tomorrow')).resolves.toEqual({
      date: '2026-08-14',
      modeBlocks: [],
      summary: {
        overallAdherence: 0,
        modeSwitches: 0,
        totalCost: 0,
        metrics: {
          cost: { plan: 0, actual: null, hasActual: false, unit: '' },
          solar: { plan: 0, actual: null, hasActual: false, unit: '' },
          consumption: { plan: 0, actual: null, hasActual: false, unit: '' },
          grid: { plan: 0, actual: null, hasActual: false, unit: '' },
        },
      },
      metadata: { activePlan: 'hybrid', comparisonPlanAvailable: undefined },
      comparison: { plan: '', modeBlocks: [] },
    });
    expect(mockLoadDetailTabs).toHaveBeenCalledWith('SN123', 'tomorrow', 'hybrid');
  });

  it('omits optional metadata and comparison sections when the API leaves them out', async () => {
    mockLoadDetailTabs.mockResolvedValueOnce({
      date: '2026-08-15',
      mode_blocks: [],
      summary: { metrics: {} },
    });

    const result = await loadTimelineTab('SN123', 'detail');

    expect(result?.metadata).toBeUndefined();
    expect(result?.comparison).toBeUndefined();
  });

  it('returns null for an empty response and logs rejected requests', async () => {
    mockLoadDetailTabs.mockResolvedValueOnce(null);
    await expect(loadTimelineTab('SN123', 'yesterday')).resolves.toBeNull();

    mockLoadDetailTabs.mockRejectedValueOnce(new Error('timeline network failure'));
    await expect(loadTimelineTab('SN123', 'yesterday')).resolves.toBeNull();
    expect(mockLogError).toHaveBeenCalledWith(
      'Failed to load timeline tab: yesterday',
      expect.any(Error),
    );
  });
});

describe('loadAllTimelineTabs', () => {
  it('transforms every tab and preserves null tabs from the all-tabs response', async () => {
    mockFetchOIGAPI.mockResolvedValueOnce({
      yesterday: null,
      today: { date: '2026-08-13', summary: { metrics: {} } },
      tomorrow: COMPLETE_RAW,
      history: undefined,
      detail: { date: '2026-08-13', mode_blocks: [], summary: {} },
    });

    const result = await loadAllTimelineTabs('SN123', 'baseline');

    expect(mockFetchOIGAPI).toHaveBeenCalledWith(
      '/battery_forecast/SN123/detail_tabs?plan=baseline',
    );
    expect(result.yesterday).toBeNull();
    expect(result.today?.date).toBe('2026-08-13');
    expect(result.today?.modeBlocks).toEqual([]);
    expect(result.tomorrow?.modeBlocks).toHaveLength(3);
    expect(result.history).toBeNull();
    expect(result.detail?.summary.totalCost).toBe(0);
  });

  it('returns an empty record for missing data and on request failure', async () => {
    mockFetchOIGAPI.mockResolvedValueOnce(null);
    await expect(loadAllTimelineTabs('SN123')).resolves.toEqual({});

    mockFetchOIGAPI.mockRejectedValueOnce(new Error('all-tabs failure'));
    await expect(loadAllTimelineTabs('SN123')).resolves.toEqual({});
    expect(mockLogError).toHaveBeenCalledWith('Failed to load all timeline tabs', expect.any(Error));
  });
});

describe('planner settings loaders', () => {
  it('maps planner settings and defaults an omitted auto-mode flag', async () => {
    mockFetchSettings.mockResolvedValueOnce({ planner_mode: 'hybrid' });

    await expect(loadPlannerSettings('SN123')).resolves.toEqual({
      autoModeSwitchEnabled: false,
      plannerMode: 'hybrid',
    });
    expect(mockFetchSettings).toHaveBeenCalledWith(haClient, 'SN123');

    mockFetchSettings.mockResolvedValueOnce(null);
    await expect(loadPlannerSettings('SN123')).resolves.toBeNull();
  });

  it('returns null and logs when planner settings loading fails', async () => {
    mockFetchSettings.mockRejectedValueOnce(new Error('settings failure'));

    await expect(loadPlannerSettings('SN123')).resolves.toBeNull();
    expect(mockLogError).toHaveBeenCalledWith('Failed to load planner settings', expect.any(Error));
  });
});

describe('savePlannerSettings', () => {
  it('sends only defined settings and invalidates the planner cache', async () => {
    mockSavePlannerSettings.mockResolvedValueOnce(undefined);

    await expect(savePlannerSettings('SN123', { autoModeSwitchEnabled: true })).resolves.toBe(true);
    expect(mockSavePlannerSettings).toHaveBeenCalledWith('SN123', {
      auto_mode_switch_enabled: true,
    });
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    mockSavePlannerSettings.mockResolvedValueOnce(undefined);
    await expect(savePlannerSettings('SN123', {})).resolves.toBe(true);
    expect(mockSavePlannerSettings).toHaveBeenLastCalledWith('SN123', {});
  });

  it('preserves an explicit false auto-mode setting in the saved payload', async () => {
    mockSavePlannerSettings.mockResolvedValueOnce(undefined);

    await expect(savePlannerSettings('SN123', { autoModeSwitchEnabled: false })).resolves.toBe(true);

    expect(mockSavePlannerSettings).toHaveBeenCalledWith('SN123', {
      auto_mode_switch_enabled: false,
    });
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });

  it('returns false and logs when saving planner settings fails', async () => {
    mockSavePlannerSettings.mockRejectedValueOnce(new Error('save failure'));

    await expect(savePlannerSettings('SN123', { autoModeSwitchEnabled: false })).resolves.toBe(false);
    expect(mockLogError).toHaveBeenCalledWith('Failed to save planner settings', expect.any(Error));
    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});
