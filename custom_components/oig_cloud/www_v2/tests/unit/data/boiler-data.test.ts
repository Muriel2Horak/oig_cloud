import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizePlannerSource,
  normalizeRuntimeSource,
  filterPublicFlags,
  getSensorId,
  setBoilerEndpointParamsForTest,
  parseStateForTest,
  parseConfigForTest,
  buildBatteryForecast,
  mapCanonicalToV2,
  planBoilerHeating,
  applyBoilerPlan,
  cancelBoilerPlan,
  loadBoilerData,
  recomputeForCategory,
} from '@/data/boiler-data';
import { haClient } from '@/data/ha-client';
import type { BoilerConfig } from '@/ui/features/boiler/types';

type BoilerPlanAPI = Parameters<typeof parseStateForTest>[0];
type MockedHaClient = typeof haClient & {
  fetchOIGAPI: ReturnType<typeof vi.fn>;
  fetchOIGAPITyped: ReturnType<typeof vi.fn>;
  callService: ReturnType<typeof vi.fn>;
  loadBatteryTimeline: ReturnType<typeof vi.fn>;
};

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI: vi.fn().mockResolvedValue(null),
    fetchOIGAPITyped: vi.fn().mockResolvedValue(null),
    callService: vi.fn().mockResolvedValue(true),
    loadBatteryTimeline: vi.fn().mockResolvedValue(null),
  },
}));

const mockedHaClient = haClient as MockedHaClient;
const mockFetchOIGAPI = mockedHaClient.fetchOIGAPI;
const mockFetchOIGAPITyped = mockedHaClient.fetchOIGAPITyped;
const mockCallService = mockedHaClient.callService;
const mockLoadBatteryTimeline = mockedHaClient.loadBatteryTimeline;

beforeEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  mockFetchOIGAPI.mockResolvedValue(null);
  mockFetchOIGAPITyped.mockResolvedValue(null);
  mockCallService.mockResolvedValue(true);
  mockLoadBatteryTimeline.mockResolvedValue(null);
  setBoilerEndpointParamsForTest('entry123', 'sn456');
});

afterEach(() => {
  vi.useRealTimers();
});

function localIso(year: number, monthIndex: number, day: number, hour: number, minute = 0): string {
  return new Date(year, monthIndex, day, hour, minute).toISOString();
}

function canonicalBase(overrides: Record<string, unknown> = {}) {
  return {
    entry_id: 'entry123',
    box_id: 'box456',
    current_state: {
      temperatures: {},
      energy_state: {},
      heating: false,
      recommended_source: null,
      last_update: '2024-01-01T10:00:00Z',
    },
    comfort_status: {
      comfort_satisfied: true,
      comfort_status_code: null,
      temperature_at_deadline_c: null,
      unsatisfied_comfort_gap_c: null,
    },
    selected_source: null,
    actuated_source: null,
    plan_slots: [],
    reason_codes: [],
    freshness: {
      last_update: '2024-01-01T10:00:00Z',
      data_age_seconds: 0,
    },
    degraded_flags: {
      degraded: false,
      flags: [],
      serializer_state: null,
    },
    manual_override: {
      active: false,
      state: null,
    },
    ...overrides,
  };
}

describe('boiler service calls', () => {
  it('plans, applies, and cancels through the expected HA services', async () => {
    const callService = vi.mocked(haClient.callService);
    callService.mockResolvedValue(true);

    await expect(planBoilerHeating()).resolves.toBe(true);
    await expect(applyBoilerPlan()).resolves.toBe(true);
    await expect(cancelBoilerPlan()).resolves.toBe(true);

    expect(callService).toHaveBeenNthCalledWith(1, 'oig_cloud', 'plan_boiler_heating', {});
    expect(callService).toHaveBeenNthCalledWith(2, 'oig_cloud', 'apply_boiler_plan', {});
    expect(callService).toHaveBeenNthCalledWith(3, 'oig_cloud', 'cancel_boiler_plan', {});
  });

  it('propagates a rejected HA service call to the caller', async () => {
    const error = new Error('service transport failed');
    const callService = vi.mocked(haClient.callService);
    callService.mockRejectedValue(error);

    await expect(applyBoilerPlan()).rejects.toThrow('service transport failed');
    expect(callService).toHaveBeenCalledWith('oig_cloud', 'apply_boiler_plan', {});
  });
});

describe('loadBoilerData and category recomputation', () => {
  it('returns a safe empty result when endpoint parameters are unavailable', async () => {
    setBoilerEndpointParamsForTest('', '');

    const result = await loadBoilerData();

    expect(vi.mocked(haClient.fetchOIGAPI)).not.toHaveBeenCalled();
    expect(result.v2Data.loadError).toBe('Nepodařilo se načíst data bojleru');
    expect(result.plan).toBeNull();
    expect(result.forecastWindows).toEqual({ fve: '--', grid: '--' });
  });

  it('loads canonical data, config, battery forecast, and derived plan outputs', async () => {
    const canonical = canonicalBase({
      current_state: {
        temperatures: { upper_zone: 55, lower_zone: 40 },
        energy_state: { avg_temp: 45, energy_needed_kwh: 2.5 },
        energy_tracking: { fve_kwh: 1.2, grid_kwh: 0.3, alt_kwh: 0 },
        heating: true,
        recommended_source: 'grid',
        last_update: '2024-01-01T10:00:00Z',
      },
      comfort_status: {
        comfort_satisfied: false,
        comfort_status_code: 'warming',
        temperature_at_deadline_c: 55,
        unsatisfied_comfort_gap_c: 5,
      },
      selected_source: 'fve',
      actuated_source: 'fve',
      plan_slots: [
        {
          start: localIso(2024, 0, 1, 10),
          end: localIso(2024, 0, 1, 10, 45),
          consumption_kwh: 1.5,
          confidence: 0.9,
          recommended_source: 'fve',
          spot_price: 2.5,
          alt_price: 4,
          overflow_available: true,
        },
      ],
    });
    const fetchOIGAPI = vi.mocked(haClient.fetchOIGAPI);
    fetchOIGAPI
      .mockResolvedValueOnce(canonical)
      .mockResolvedValueOnce({ config: {
        volume_l: 200,
        heater_power_kw: 3,
        target_temp_c: 60,
        deadline_time: '18:00',
        stratification_mode: 'auto',
        cold_inlet_temp_c: 12,
        aura_max_temp_c: 80,
      } });
    vi.mocked(haClient.loadBatteryTimeline).mockResolvedValue({ active: [
      { timestamp: localIso(2024, 0, 1, 10), solar_kwh: 1, grid_charge_kwh: 0 },
      { timestamp: localIso(2024, 0, 1, 10, 15), solar_kwh: 1, grid_charge_kwh: 0 },
      { timestamp: localIso(2024, 0, 1, 10, 30), solar_kwh: 0, grid_charge_kwh: 0.5 },
      { timestamp: localIso(2024, 0, 1, 10, 45), solar_kwh: 0, grid_charge_kwh: 0.5 },
    ] });

    const result = await loadBoilerData();

    expect(fetchOIGAPI).toHaveBeenNthCalledWith(1, '/boiler/entry123/sn456');
    expect(fetchOIGAPI).toHaveBeenNthCalledWith(2, '/entry123/boiler_profile');
    expect(result.state).toMatchObject({
      currentTemp: 55,
      tempTop: 55,
      tempBottom: 40,
      avgTemp: 45,
      heatingPercent: 68.75,
      energyNeeded: 2.5,
      nextHeating: '10:00–10:45 (FVE)',
    });
    expect(result.plan).toMatchObject({
      totalConsumptionKwh: 1.5,
      fveKwh: 1.2,
      gridKwh: 0.3,
      activeSlotCount: 1,
    });
    expect(result.energyBreakdown).toEqual({
      fveKwh: 1.2,
      gridKwh: 0.3,
      altKwh: 0,
      fvePercent: 80,
      gridPercent: 20,
      altPercent: 0,
    });
    expect(result.config).toMatchObject({ volumeL: 200, heaterPowerW: 3000, coldInletTempC: 12 });
    expect(result.forecastWindows).toEqual({ fve: '10:00–10:30', grid: '10:30–11:00' });
    expect(result.heatmap).toHaveLength(24);
    expect(result.heatmap7x24).toHaveLength(7);
    expect(result.profiling.hourlyAvg).toHaveLength(24);
    expect(result.v2Data.status).toMatchObject({ selectedSource: 'fve', actuatedSource: 'fve', degraded: false });
    expect(result.v2Data.explanation.degradedReasons).toEqual([]);
    expect(result.v2Data.batteryForecast).toHaveLength(4);
  });

  it('marks profile data unavailable and tolerates canonical and timeline failures', async () => {
    const canonical = canonicalBase();
    const fetchOIGAPI = vi.mocked(haClient.fetchOIGAPI);
    fetchOIGAPI.mockResolvedValueOnce(canonical).mockRejectedValueOnce(new Error('profile unavailable'));
    vi.mocked(haClient.loadBatteryTimeline).mockRejectedValueOnce(new Error('timeline unavailable'));

    const result = await loadBoilerData();

    expect(result.v2Data.explanation?.degradedReasons).toEqual(['config_profile_unavailable']);
    expect(result.v2Data.batteryForecast).toEqual([]);

    vi.clearAllMocks();
    setBoilerEndpointParamsForTest('entry123', 'sn456');
    vi.mocked(haClient.fetchOIGAPI).mockRejectedValueOnce(new Error('canonical unavailable'));
    vi.mocked(haClient.loadBatteryTimeline).mockRejectedValueOnce(new Error('timeline unavailable'));

    const failedResult = await loadBoilerData();

    expect(failedResult.v2Data.loadError).toBe('Nepodařilo se načíst data bojleru');
    expect(failedResult.plan).toBeNull();

    vi.clearAllMocks();
    setBoilerEndpointParamsForTest('entry123', 'sn456');
    vi.mocked(haClient.fetchOIGAPI).mockResolvedValueOnce(null);
    const nullCanonicalResult = await loadBoilerData();
    expect(nullCanonicalResult.v2Data.loadError).toBe('Nepodařilo se načíst data bojleru');

    vi.clearAllMocks();
    setBoilerEndpointParamsForTest('entry123', 'sn456');
    vi.mocked(haClient.fetchOIGAPI)
      .mockResolvedValueOnce(canonicalBase({
        plan_slots: [{
          start: localIso(2024, 0, 1, 10),
          end: localIso(2024, 0, 1, 10, 15),
          consumption_kwh: 1,
          recommended_source: 'grid',
        }],
      }))
      .mockResolvedValueOnce({});
    vi.mocked(haClient.loadBatteryTimeline).mockResolvedValue([
      { timestamp: localIso(2024, 0, 1, 10), solar_kwh: 0, grid_charge_kwh: 0 },
    ]);
    const missingConfigResult = await loadBoilerData();
    expect(missingConfigResult.v2Data.explanation?.degradedReasons).toEqual(['config_profile_unavailable']);
    expect(missingConfigResult.forecastWindows).toEqual({ fve: '--', grid: '--' });
  });

  it('recomputes category-specific heatmap, profiling, and predicted usage', () => {
    const profileData = {
      profiles: {
        evening: {
          hourly_avg: { 0: 1, 1: 2, 2: 3 },
          heatmap: [[{ consumption: 4 }, 'invalid', ...Array(22).fill(0)]],
        },
      },
      summary: {
        avg_confidence: 0.8,
        circulation_windows: [{ start: '23:00', end: '23:30' }],
      },
    };

    const result = recomputeForCategory(profileData, { state: { circulation_recommended: true } }, 'evening');

    expect(result.currentCategory).toBe('evening');
    expect(result.heatmap7x24?.[0]).toEqual({ day: 'Po', hours: [4, 0, ...Array(22).fill(0)] });
    expect(result.heatmap7x24?.[1].hours).toEqual(Array(24).fill(0));
    expect(result.profiling).toMatchObject({
      peakHours: [0, 1, 2],
      predictedTotalKwh: 6,
      confidence: 0.8,
      daysTracked: 7,
    });
    expect(result.profiling?.hourlyAvg.slice(0, 4)).toEqual([1, 2, 3, 0]);
    expect(result.predictedUsage).toMatchObject({
      predictedTodayKwh: 6,
      peakHours: [0, 1, 2],
      waterLiters40c: null,
      circulationWindows: '23:00–23:30',
    });
  });

  it('reports an active circulation window with its remaining end time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 10, 15));

    const result = recomputeForCategory({
      profiles: { morning: { hourly_avg: {} } },
      summary: { circulation_windows: [{ start: '10:00', end: '11:00' }] },
    }, null, 'morning');

    expect(result.predictedUsage?.circulationNow).toBe('ANO (do 11:00)');
  });

  it('reports no circulation recommendation when all windows are invalid', () => {
    const result = recomputeForCategory({
      profiles: { morning: { hourly_avg: {} } },
      summary: { circulation_windows: [{ start: 'bad', end: 'also-bad' }] },
    }, { state: { circulation_recommended: false } }, 'morning');

    expect(result.predictedUsage?.circulationNow).toBe('Ne');
  });

  it('reports the next window when circulation is not recommended', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 10));

    const result = recomputeForCategory({
      profiles: { morning: { hourly_avg: {} } },
      summary: { circulation_windows: [{ start: '12:00', end: '12:30' }] },
    }, { state: { circulation_recommended: false } }, 'morning');

    expect(result.predictedUsage?.circulationNow).toBe('Ne (další 12:00–12:30)');
  });

  it('recognizes an overnight circulation window across midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 23, 30));

    const result = recomputeForCategory({
      profiles: { night: { hourly_avg: {} } },
      summary: { circulation_windows: [{ start: '23:00', end: '01:00' }] },
    }, null, 'night');

    expect(result.predictedUsage?.circulationNow).toBe('ANO (do 01:00)');
  });
});

describe('boiler-data utilities', () => {
  describe('normalizePlannerSource', () => {
    it('returns null and invalid flag for empty input', () => {
      expect(normalizePlannerSource('')).toEqual({ source: null, sourceInvalid: false });
      expect(normalizePlannerSource(null)).toEqual({ source: null, sourceInvalid: false });
      expect(normalizePlannerSource(undefined)).toEqual({ source: null, sourceInvalid: false });
    });

    it('normalizes fve/pv aliases to fve', () => {
      expect(normalizePlannerSource('fve')).toEqual({ source: 'fve', sourceInvalid: false });
      expect(normalizePlannerSource('pv')).toEqual({ source: 'fve', sourceInvalid: false });
      expect(normalizePlannerSource('FVE')).toEqual({ source: 'fve', sourceInvalid: false });
      expect(normalizePlannerSource('PV')).toEqual({ source: 'fve', sourceInvalid: false });
    });

    it('normalizes overflow source', () => {
      expect(normalizePlannerSource('overflow')).toEqual({ source: 'overflow', sourceInvalid: false });
    });

    it('normalizes grid source', () => {
      expect(normalizePlannerSource('grid')).toEqual({ source: 'grid', sourceInvalid: false });
    });

    it('keeps alternative/alt distinct', () => {
      expect(normalizePlannerSource('alternative')).toEqual({ source: 'alternative', sourceInvalid: false });
      expect(normalizePlannerSource('alt')).toEqual({ source: 'alternative', sourceInvalid: false });
    });

    it('normalizes battery source (R3)', () => {
      expect(normalizePlannerSource('battery')).toEqual({ source: 'battery', sourceInvalid: false });
    });

    it('returns null and invalid flag for unknown source', () => {
      expect(normalizePlannerSource('unknown')).toEqual({ source: null, sourceInvalid: true });
      expect(normalizePlannerSource('nuclear')).toEqual({ source: null, sourceInvalid: true });
    });
  });

  describe('normalizeRuntimeSource', () => {
    it('returns null for empty input', () => {
      expect(normalizeRuntimeSource('')).toBeNull();
      expect(normalizeRuntimeSource(null)).toBeNull();
      expect(normalizeRuntimeSource(undefined)).toBeNull();
    });

    it('normalizes fve/pv aliases to fve', () => {
      expect(normalizeRuntimeSource('fve')).toBe('fve');
      expect(normalizeRuntimeSource('pv')).toBe('fve');
      expect(normalizeRuntimeSource('FVE')).toBe('fve');
    });

    it('normalizes overflow source', () => {
      expect(normalizeRuntimeSource('overflow')).toBe('overflow');
    });

    it('normalizes grid source', () => {
      expect(normalizeRuntimeSource('grid')).toBe('grid');
    });

    it('keeps alternative/alt distinct', () => {
      expect(normalizeRuntimeSource('alternative')).toBe('alternative');
      expect(normalizeRuntimeSource('alt')).toBe('alternative');
    });

    it('normalizes discharge sources', () => {
      expect(normalizeRuntimeSource('discharge')).toBe('discharge');
      expect(normalizeRuntimeSource('discharging')).toBe('discharge');
    });

    it('returns null for unknown source', () => {
      expect(normalizeRuntimeSource('unknown')).toBeNull();
      expect(normalizeRuntimeSource('nuclear')).toBeNull();
    });
  });

  describe('filterPublicFlags', () => {
    it('returns empty array for no flags', () => {
      expect(filterPublicFlags([])).toEqual([]);
    });

    it('filters only public boiler flags', () => {
      const flags = [
        'temperature_unavailable',
        'temperature_stale',
        'source_stale',
        'activity_stale',
        'source_invalid',
        'power_sign_mismatch_charge',
        'power_sign_mismatch_discharge',
        'runtime_cache_empty',
        'internal_debug_flag',
        'private_diagnostic',
      ];
      const result = filterPublicFlags(flags);
      expect(result).toEqual([
        'temperature_unavailable',
        'temperature_stale',
        'source_stale',
        'activity_stale',
        'source_invalid',
        'power_sign_mismatch_charge',
        'power_sign_mismatch_discharge',
        'runtime_cache_empty',
      ]);
    });

    it('handles flags with only private flags', () => {
      const flags = ['internal_debug_flag', 'private_diagnostic', 'secret_flag'];
      expect(filterPublicFlags(flags)).toEqual([]);
    });
  });

  describe('getSensorId and setBoilerEndpointParamsForTest', () => {
    beforeEach(() => {
      setBoilerEndpointParamsForTest('entry123', 'sn456');
    });

    it('constructs sensor ID with inverter serial number', () => {
      expect(getSensorId('temperature')).toBe('sensor.oig_sn456_temperature');
      expect(getSensorId('power')).toBe('sensor.oig_sn456_power');
    });

    it('uses empty string when no params set', () => {
      setBoilerEndpointParamsForTest('', '');
      expect(getSensorId('temperature')).toBe('sensor.oig__temperature');
    });

    it('updates params when setBoilerEndpointParamsForTest is called', () => {
      expect(getSensorId('temp')).toBe('sensor.oig_sn456_temp');
      setBoilerEndpointParamsForTest('new_entry', 'new_sn');
      expect(getSensorId('temp')).toBe('sensor.oig_new_sn_temp');
    });
  });

  describe('parseStateForTest', () => {
    const mockConfig: BoilerConfig = {
      volumeL: 200,
      heaterPowerW: 3000,
      heaterPowerKw: 3,
      targetTempC: 60,
      deadlineTime: '18:00',
      stratificationMode: 'auto',
      kCoefficient: '0.2326',
      coldInletTempC: 10,
      auraMaxTempC: 80,
    };

    it('parses state with all temperatures', () => {
      const planData: BoilerPlanAPI = {
        state: {
          current_temp: 45,
          target_temp: 60,
          heating: true,
          temperatures: {
            upper_zone: 50,
            lower_zone: 40,
            top: 55,
            bottom: 35,
          },
          energy_state: {
            avg_temp: 45,
            energy_needed_kwh: 2.5,
          },
        },
      };

      const result = parseStateForTest(planData, null, mockConfig);
      expect(result.currentTemp).toBe(45);
      expect(result.targetTemp).toBe(60);
      expect(result.heating).toBe(true);
      expect(result.tempTop).toBe(50);
      expect(result.tempBottom).toBe(40);
      expect(result.avgTemp).toBe(45);
      expect(result.energyNeeded).toBe(2.5);
    });

    it('calculates heating percent correctly', () => {
      const planData: BoilerPlanAPI = {
        state: {
          current_temp: 50,
          temperatures: {
            upper_zone: 50,
            lower_zone: 40,
          },
          energy_state: {
            avg_temp: 50,
          },
        },
      };

      const result = parseStateForTest(planData, null, mockConfig);
      expect(result.avgTemp).toBe(50);
      expect(result.heatingPercent).toBe(80);
    });

    it('handles missing temperatures', () => {
      const planData: BoilerPlanAPI = {
        state: {
          current_temp: null,
        },
      };

      const result = parseStateForTest(planData, null, mockConfig);
      expect(result.currentTemp).toBeNull();
      expect(result.tempTop).toBeNull();
      expect(result.tempBottom).toBeNull();
    });

    it('handles null and undefined avgTemp', () => {
      const planData: BoilerPlanAPI = {
        state: {
          energy_state: {
            avg_temp: null,
          },
        },
      };

      const result = parseStateForTest(planData, null, mockConfig);
      expect(result.avgTemp).toBeNull();
      expect(result.heatingPercent).toBeNull();
    });

    it('clamps heating percent to 0-100 range', () => {
      const planData: BoilerPlanAPI = {
        state: {
          energy_state: {
            avg_temp: 70,
          },
        },
      };

      const result = parseStateForTest(planData, null, mockConfig);
      expect(result.heatingPercent).toBe(100);
    });

    it('formats next heating time from slots', () => {
      const planData: BoilerPlanAPI = {
        state: {},
        slots: [
          {
            start: localIso(2024, 0, 1, 10),
            end: localIso(2024, 0, 1, 12),
            consumption_kwh: 1.5,
            recommended_source: 'fve',
          },
        ],
        next_slot: {
          start: localIso(2024, 0, 1, 10),
          end: localIso(2024, 0, 1, 12),
          consumption_kwh: 1.5,
          recommended_source: 'fve',
        },
      };

      const result = parseStateForTest(planData, null, mockConfig);
      expect(result.nextHeating).toContain('10:00');
      expect(result.nextHeating).toContain('12:00');
      expect(result.nextHeating).toContain('FVE');
    });

    it('uses profile state when plan data is absent and normalizes invalid readings', () => {
      const result = parseStateForTest(null, {
        state: {
          current_temp: Number.NaN,
          heating: false,
          temperatures: { top: 42, bottom: 31 },
          energy_state: { avg_temp: Number.NaN, energy_needed_kwh: Number.NaN },
        },
      }, mockConfig);

      expect(result).toMatchObject({
        currentTemp: null,
        tempTop: 42,
        tempBottom: 31,
        avgTemp: null,
        energyNeeded: null,
        heating: false,
        nextHeating: 'Neplánováno',
      });
    });

    it('selects a future slot using end_time and avg consumption fallbacks', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 10));

      const result = parseStateForTest({
        slots: [
          { end: localIso(2024, 0, 1, 11), consumption_kwh: 0, recommended_source: 'grid' },
          { start: localIso(2024, 0, 1, 12), end_time: localIso(2024, 0, 1, 13), avg_consumption_kwh: 1, recommended_source: 'alternative' },
        ],
      }, null, mockConfig);

      expect(result.nextHeating).toBe('12:00–--:-- (Alternativa)');
    });
  });

  describe('parseConfigForTest', () => {
    it('parses full config object', () => {
      const profileData = {
        config: {
          volume_l: 200,
          heater_power_kw: 3,
          target_temp_c: 60,
          deadline_time: '18:00',
          stratification_mode: 'auto',
          cold_inlet_temp_c: 12,
          aura_max_temp_c: 80,
        },
      };

      const result = parseConfigForTest(profileData);
      expect(result.volumeL).toBe(200);
      expect(result.heaterPowerKw).toBe(3);
      expect(result.heaterPowerW).toBe(3000);
      expect(result.targetTempC).toBe(60);
      expect(result.deadlineTime).toBe('18:00');
      expect(result.stratificationMode).toBe('auto');
      expect(result.coldInletTempC).toBe(12);
      expect(result.auraMaxTempC).toBe(80);
    });

    it('defaults missing values', () => {
      const result = parseConfigForTest(null);
      expect(result.volumeL).toBeNull();
      expect(result.heaterPowerW).toBeNull();
      expect(result.heaterPowerKw).toBeNull();
      expect(result.targetTempC).toBeNull();
      expect(result.deadlineTime).toBe('--:--');
      expect(result.stratificationMode).toBe('--');
      expect(result.coldInletTempC).toBe(10);
      expect(result.auraMaxTempC).toBeNull();
    });

    it('handles partial config', () => {
      const profileData = {
        config: {
          volume_l: 150,
          target_temp_c: 55,
        },
      };

      const result = parseConfigForTest(profileData);
      expect(result.volumeL).toBe(150);
      expect(result.heaterPowerW).toBeNull();
      expect(result.targetTempC).toBe(55);
      expect(result.coldInletTempC).toBe(10);
    });

    it('calculates kCoefficient from volume', () => {
      const profileData = {
        config: {
          volume_l: 200,
        },
      };

      const result = parseConfigForTest(profileData);
      expect(result.kCoefficient).toBe('0.2326');
    });

    it('returns -- kCoefficient when volume is missing', () => {
      const result = parseConfigForTest(null);
      expect(result.kCoefficient).toBe('--');
    });

    it('uses defaults when the wrapper has no config property', () => {
      const result = parseConfigForTest({});
      expect(result).toMatchObject({
        volumeL: null,
        targetTempC: null,
        deadlineTime: '--:--',
        coldInletTempC: 10,
      });
    });
  });

  describe('buildBatteryForecast', () => {
    it('builds forecast from timeline entries', () => {
      const entries = [
        { timestamp: '2024-01-01T10:00:00Z', solar_kwh: 1.5, grid_charge_kwh: 0.5 },
        { timestamp: '2024-01-01T11:00:00Z', solar_charge_kwh: 2.0, grid_charge_kwh: 0.3 },
        { timestamp: '2024-01-01T12:00:00Z', solar: 1.0, grid: 0.2 },
      ];

      const result = buildBatteryForecast(entries);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        timestampMs: expect.any(Number),
        solarKwh: 1.5,
        gridChargeKwh: 0.5,
        batterySocPct: null,
      });
      expect(result[1]).toMatchObject({
        solarKwh: 2.0,
        gridChargeKwh: 0.3,
      });
    });

    it('handles entries with alternate field names', () => {
      const entries = [
        { time: '2024-01-01T10:00:00Z', solar_charge_kwh: 1.0, grid_charge_kwh: 0.5 },
      ];

      const result = buildBatteryForecast(entries);
      expect(result[0].solarKwh).toBe(1.0);
      expect(result[0].gridChargeKwh).toBe(0.5);
    });

    it('returns empty array for null input', () => {
      expect(buildBatteryForecast(null)).toEqual([]);
    });

    it('returns empty array for non-array input', () => {
      expect(buildBatteryForecast({} as unknown as never)).toEqual([]);
    });

    it('skips entries without timestamp', () => {
      const entries = [
        { solar_kwh: 1.5, grid_charge_kwh: 0.5 },
        { timestamp: '2024-01-01T10:00:00Z', solar_kwh: 2.0, grid_charge_kwh: 0.3 },
      ];

      const result = buildBatteryForecast(entries);
      expect(result).toHaveLength(1);
      expect(result[0].solarKwh).toBe(2.0);
    });

    it('parses timestamps correctly', () => {
      const entries = [
        { timestamp: '2024-01-01T10:00:00Z', solar_kwh: 1.0, grid_charge_kwh: 0.5 },
      ];

      const result = buildBatteryForecast(entries);
      expect(result[0].timestampMs).toBe(1704103200000);
    });

    it('handles zero values', () => {
      const entries = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          solar_kwh: 0,
          solar_charge_kwh: 2,
          grid_charge_kwh: 0,
        },
      ];

      const result = buildBatteryForecast(entries);
      expect(result[0].solarKwh).toBe(0);
      expect(result[0].gridChargeKwh).toBe(0);
    });
  });

  describe('mapCanonicalToV2', () => {
    it('returns loading error state for null canonical', () => {
      const result = mapCanonicalToV2(null);
      expect(result.loading).toBe(false);
      expect(result.loadError).toBe('Nepodařilo se načíst data bojleru');
      expect(result.identity.available).toBe(false);
      expect(result.status).toBeNull();
      expect(result.planSlots).toEqual([]);
    });

    it('maps current state data', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {
            upper_zone: 55,
            lower_zone: 40,
          },
          energy_state: {
            energy_needed_kwh: 2.5,
          },
          heating: true,
          recommended_source: 'fve',
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: 'ok',
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: 60,
        },
        selected_source: 'fve',
        actuated_source: 'fve',
        degraded_flags: {
          degraded: false,
          flags: [],
          serializer_state: null,
        },
        plan_slots: [],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
      };

      const result = mapCanonicalToV2(canonical);
      expect(result.status).toMatchObject({
        currentState: 'heating',
        temperatureTop: 55,
        temperatureBottom: 40,
        energyNeededKwh: 2.5,
        heating: true,
        selectedSource: 'fve',
        actuatedSource: 'fve',
      });
      expect(result.identity).toMatchObject({
        entryId: 'entry123',
        boxId: 'box456',
        available: true,
      });
    });

    it('maps plan slots with normalization', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {},
          energy_state: {},
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: null,
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: null,
        },
        selected_source: null,
        actuated_source: null,
        degraded_flags: {
          degraded: false,
          flags: [],
          serializer_state: null,
        },
        plan_slots: [
          {
            start: '2024-01-01T10:00:00Z',
            end: '2024-01-01T12:00:00Z',
            consumption_kwh: 1.5,
            confidence: 0.9,
            recommended_source: 'fve',
            spot_price: 2.5,
            alt_price: 5.0,
            overflow_available: true,
            heating_kwh: 1.2,
            pv_kwh: 1.0,
            grid_kwh: 0.3,
            alt_kwh: 0.2,
            purpose: 'comfort',
          },
          {
            start: '2024-01-01T14:00:00Z',
            end: '2024-01-01T15:00:00Z',
            consumption_kwh: 2.0,
            confidence: 0.8,
            recommended_source: 'grid',
            spot_price: 3.0,
            purpose: 'legionella',
          },
        ],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
      };

      const result = mapCanonicalToV2(canonical);
      expect(result.planSlots).toHaveLength(2);
      expect(result.planSlots[0]).toMatchObject({
        start: '2024-01-01T10:00:00Z',
        end: '2024-01-01T12:00:00Z',
        consumptionKwh: 1.5,
        confidence: 0.9,
        recommendedSource: 'fve',
        sourceInvalid: null,
        spotPrice: 2.5,
        altPrice: 5.0,
        overflowAvailable: true,
        heatingKwh: 1.2,
        pvKwh: 1.0,
        gridKwh: 0.3,
        altKwh: 0.2,
        purpose: 'comfort',
      });
      expect(result.planSlots[1]).toMatchObject({
        recommendedSource: 'grid',
        purpose: 'legionella',
      });
    });

    it('maps activity data', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {},
          energy_state: {},
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: null,
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: null,
        },
        selected_source: null,
        actuated_source: null,
        degraded_flags: {
          degraded: false,
          flags: [],
          serializer_state: null,
        },
        activity: {
          state: 'charging_fve',
          source: 'fve',
          temperature_trend_c_per_min: 0.5,
          fill_level_pct: 75,
          aura_max_temp_c: 80,
          heater_states: {
            top: 'on',
            bottom: 'off',
          },
          stale_flags: ['temperature_stale'],
        },
        plan_slots: [],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
      };

      const result = mapCanonicalToV2(canonical);
      expect(result.activity).toMatchObject({
        state: 'charging_fve',
        source: 'fve',
        temperatureTrendCPerMin: 0.5,
        fillLevelPct: 75,
        auraMaxTempC: 80,
        heaterStates: {
          top: 'on',
          bottom: 'off',
        },
        staleFlags: ['temperature_stale'],
      });
    });

    it('maps activity with unknown state', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {},
          energy_state: {},
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: null,
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: null,
        },
        selected_source: null,
        actuated_source: null,
        degraded_flags: {
          degraded: false,
          flags: [],
          serializer_state: null,
        },
        activity: {
          state: 'invalid_state',
          source: 'unknown_source',
        },
        plan_slots: [],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
      };

      const result = mapCanonicalToV2(canonical);
      expect(result.activity?.state).toBe('unknown');
      expect(result.activity?.source).toBeNull();
    });

    it('maps heater states with normalization', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {},
          energy_state: {},
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: null,
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: null,
        },
        selected_source: null,
        actuated_source: null,
        degraded_flags: {
          degraded: false,
          flags: [],
          serializer_state: null,
        },
        activity: {
          state: 'standby',
          heater_states: {
            heater1: 'on',
            heater2: 'off',
            heater3: 'invalid',
          },
        },
        plan_slots: [],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
      };

      const result = mapCanonicalToV2(canonical);
      expect(result.activity?.heaterStates).toEqual({
        heater1: 'on',
        heater2: 'off',
        heater3: 'unavailable',
      });
    });

    it('adds config_profile_unavailable flag when requested', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {},
          energy_state: {},
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: null,
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: null,
        },
        selected_source: null,
        actuated_source: null,
        degraded_flags: {
          degraded: false,
          flags: ['temperature_stale'],
          serializer_state: null,
        },
        plan_slots: [],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
      };

      const result = mapCanonicalToV2(canonical, true);
      expect(result.explanation.degradedReasons).toContain('config_profile_unavailable');
    });

    it('filters public flags from activity stale_flags', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {},
          energy_state: {},
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: null,
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: null,
        },
        selected_source: null,
        actuated_source: null,
        degraded_flags: {
          degraded: false,
          flags: [],
          serializer_state: null,
        },
        activity: {
          state: 'standby',
          stale_flags: ['temperature_stale', 'internal_debug'],
        },
        plan_slots: [],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
      };

      const result = mapCanonicalToV2(canonical);
      expect(result.activity?.staleFlags).toEqual(['temperature_stale']);
    });

    it('maps demand map when present', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {},
          energy_state: {},
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: null,
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: null,
        },
        selected_source: null,
        actuated_source: null,
        degraded_flags: {
          degraded: false,
          flags: [],
          serializer_state: null,
        },
        plan_slots: [],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
        demand_map: {
          slot_duration_min: 15,
          slots_p50: [1.0, 2.0],
          slots_p80: [1.5, 2.5],
          windows: [
            {
              slot_index: 0,
              start_minute: 600,
              p80_kwh: 1.5,
              liters: 50,
              label: 'evening',
            },
          ],
          profile: {
            category: 'workday',
            level: 'normal',
            days_used: 7,
            label: 'Workday',
            fallback_used: false,
          },
          confidence: 0.85,
          min_confidence: 0.3,
          drives_plan: true,
        },
      };

      const result = mapCanonicalToV2(canonical);
      expect(result.demandMap).toMatchObject({
        slotDurationMin: 15,
        slotsP50: [1.0, 2.0],
        slotsP80: [1.5, 2.5],
        confidence: 0.85,
        minConfidence: 0.3,
        drivesPlan: true,
        profile: {
          category: 'workday',
          level: 'normal',
          daysUsed: 7,
          label: 'Workday',
          fallbackUsed: false,
        },
      });
      expect(result.demandMap?.windows).toHaveLength(1);
      expect(result.demandMap?.windows[0]).toMatchObject({
        slotIndex: 0,
        startMinute: 600,
        p80Kwh: 1.5,
        liters: 50,
        label: 'evening',
      });
    });

    it('maps legionella status', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {},
          energy_state: {},
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: null,
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: null,
        },
        selected_source: null,
        actuated_source: null,
        degraded_flags: {
          degraded: false,
          flags: [],
          serializer_state: null,
        },
        plan_slots: [],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
        legionella: {
          enabled: true,
          days_since_last: 14,
          interval_days: 30,
          scheduled_start: '2024-01-15T03:00:00Z',
        },
      };

      const result = mapCanonicalToV2(canonical);
      expect(result.legionella).toMatchObject({
        enabled: true,
        daysSinceLast: 14,
        intervalDays: 30,
        scheduledStart: '2024-01-15T03:00:00Z',
      });
    });

    it('maps energy today data', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {},
          energy_state: {},
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: null,
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: null,
        },
        selected_source: null,
        actuated_source: null,
        degraded_flags: {
          degraded: false,
          flags: [],
          serializer_state: null,
        },
        plan_slots: [],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
        energy_today: {
          total_kwh: 10.5,
          fve_kwh: 7.0,
          grid_kwh: 2.5,
          alt_kwh: 1.0,
          battery_kwh: 0.5,
          unattributed_kwh: 0.3,
          source_invalid: false,
          cost_czk: 25.5,
          grid_cost_czk: 20.0,
          alt_cost_czk: 5.5,
          savings_vs_alt_czk: 15.0,
        },
      };

      const result = mapCanonicalToV2(canonical);
      expect(result.energyToday).toMatchObject({
        totalKwh: 10.5,
        fveKwh: 7.0,
        gridKwh: 2.5,
        altKwh: 1.0,
        batteryKwh: 0.5,
        unattributedKwh: 0.3,
        sourceInvalid: false,
        costCzk: 25.5,
        gridCostCzk: 20.0,
        altCostCzk: 5.5,
        savingsVsAltCzk: 15.0,
      });
    });

    it('passes alt_source_type through to FE consumers (F5/Task C)', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {},
          energy_state: {},
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: null,
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: null,
        },
        selected_source: null,
        actuated_source: null,
        degraded_flags: {
          degraded: false,
          flags: [],
          serializer_state: null,
        },
        plan_slots: [],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
        alt_source_type: 'gas',
      };

      const result = mapCanonicalToV2(canonical);
      expect(result.altSourceType).toBe('gas');
    });

    it('handles null alt_source_type', () => {
      const canonical = {
        entry_id: 'entry123',
        box_id: 'box456',
        current_state: {
          temperatures: {},
          energy_state: {},
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        comfort_status: {
          comfort_satisfied: true,
          comfort_status_code: null,
          unsatisfied_comfort_gap_c: null,
          temperature_at_deadline_c: null,
        },
        selected_source: null,
        actuated_source: null,
        degraded_flags: {
          degraded: false,
          flags: [],
          serializer_state: null,
        },
        plan_slots: [],
        reason_codes: [],
        freshness: {
          last_update: '2024-01-01T10:00:00Z',
          data_age_seconds: 60,
        },
        manual_override: {
          active: false,
          state: null,
        },
        alt_source_type: null,
      };

      const result = mapCanonicalToV2(canonical);
      expect(result.altSourceType).toBeNull();
    });

    it('maps optional telemetry and applies invalid-value fallbacks', () => {
      const canonical = canonicalBase({
        current_state: {
          temperatures: { top: 51, bottom: 39 },
          energy_state: { energy_needed_kwh: Number.NaN },
          heating: false,
          last_update: '2024-01-01T10:00:00Z',
        },
        plan_slots: [
          {
            start: '2024-01-01T10:00:00Z',
            end: '2024-01-01T10:15:00Z',
            consumption_kwh: 2,
            confidence: 0.8,
            recommended_source: 'grid',
            overflow_available: false,
            pv_share: 0.25,
          },
          {
            start: '2024-01-01T10:15:00Z',
            end: '2024-01-01T10:30:00Z',
            consumption_kwh: 2,
            confidence: 0.8,
            recommended_source: 'grid',
            overflow_available: false,
            pv_contribution_kwh: 1,
          },
        ],
        source_segments: [
          { key: 'pv', start: '10:00', end: null, energy_kwh: 'bad', fill_pct: 'bad', active: true },
          { key: 'unknown', start: '10:15', end: '10:30', energy_kwh: 1, fill_pct: 2, active: false },
        ],
        timeline: [{
          timestamp: '2024-01-01T10:00:00Z',
          top_temp_c: 'bad',
          bottom_temp_c: undefined,
          power_kw: 'bad',
          source_key: 'alt',
          activity_state: 'invalid',
        }],
        sparkline: { temperature: 'bad', power: undefined },
        draw_map: {
          slot_duration_min: 15,
          weekly: [{ date: '2024-01-01', category: 'workday', day_type: 'weekday', slots_liters: {}, total_liters: 0 }],
          profiles: { workday: { slots_liters_p90: {}, days: 3 } },
        },
        plan_summary: {
          estimated_cost_czk: 'bad',
          cost_if_all_grid: 'bad',
          cost_if_all_alt: 'bad',
          deadline_time: '',
        },
        circulation_runs: {},
        energy_today: { source_invalid: 'true' },
      });

      const result = mapCanonicalToV2(canonical as Parameters<typeof mapCanonicalToV2>[0]);

      expect(result.sourceSegments).toEqual([
        { key: 'fve', start: '10:00', end: null, energyKwh: 0, fillPct: 0, active: true },
        { key: null, start: '10:15', end: '10:30', energyKwh: 1, fillPct: 2, active: false },
      ]);
      expect(result.planSlots.map(slot => slot.pvShare)).toEqual([0.25, 0.5]);
      expect(result.timeline).toEqual([{
        timestamp: '2024-01-01T10:00:00Z',
        topTempC: null,
        bottomTempC: null,
        powerKw: null,
        sourceKey: 'alternative',
        activityState: 'unknown',
      }]);
      expect(result.sparkline).toEqual({ temperature: [], power: [] });
      expect(result.drawMap?.weekly[0].slotsLiters).toEqual([]);
      expect(result.drawMap?.profiles.workday.slotsLitersP90).toEqual([]);
      expect(result.planSummary).toEqual({
        estimatedCostCzk: null,
        costIfAllGrid: null,
        costIfAllAlt: null,
        deadlineTime: '18:00',
      });
      expect(result.circulationRuns).toEqual([]);
      expect(result.energyToday).toMatchObject({
        totalKwh: 0,
        fveKwh: 0,
        gridKwh: 0,
        altKwh: 0,
        batteryKwh: 0,
        sourceInvalid: false,
      });
    });
  });
});
