import { beforeEach, describe, expect, it, vi } from 'vitest';
import { haClient } from '@/data/ha-client';
import { loadBoilerData, setBoilerEndpointParamsForTest } from '@/data/boiler-data';

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI: vi.fn(),
    loadBatteryTimeline: vi.fn().mockResolvedValue(null),
  },
}));

const CANONICAL_RESPONSE = {
  entry_id: 'entry1',
  box_id: '2206237016',
  current_state: {
    temperatures: { top: 58.5, bottom: 42.1, upper_zone: 58.5, lower_zone: 42.1 },
    energy_state: { avg_temp: 50.3, energy_needed_kwh: 1.4 },
    energy_tracking: { current_source: 'fve', total_kwh: 5.2, fve_kwh: 3.1, grid_kwh: 2.1, alt_kwh: 0 },
    heating: true,
    recommended_source: 'fve',
    last_update: '2026-04-26T10:00:00Z',
  },
  comfort_status: {
    comfort_satisfied: true,
    comfort_status_code: 'ok',
    temperature_at_deadline_c: 60.0,
    unsatisfied_comfort_gap_c: null,
  },
  selected_source: 'fve',
  actuated_source: 'fve',
  plan_slots: [],
  reason_codes: [],
  freshness: {
    plan_created_at: '2026-04-26T09:55:00Z',
    plan_valid_until: '2026-04-26T15:00:00Z',
    last_update: '2026-04-26T10:00:00Z',
    data_age_seconds: 120,
  },
  degraded_flags: { degraded: false, flags: [], serializer_state: 'idle' },
  manual_override: { active: false, state: null },
};

const PROFILE_RESPONSE = {
  config: {
    volume_l: 150,
    heater_power_kw: 3.0,
    target_temp_c: 65,
    deadline_time: '07:00',
    aura_max_temp_c: 80,
  },
};

const mockFetchOIGAPI = haClient.fetchOIGAPI as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  setBoilerEndpointParamsForTest('entry1', 'SN123');
});

describe('loadBoilerData — dual fetch', () => {
  it('fetches canonical endpoint', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(CANONICAL_RESPONSE)
      .mockResolvedValueOnce(PROFILE_RESPONSE);

    await loadBoilerData();

    const calls = mockFetchOIGAPI.mock.calls.map(c => c[0] as string);
    expect(calls.some(url => url.includes('/boiler/'))).toBe(true);
  });

  it('fetches boiler_profile endpoint', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(CANONICAL_RESPONSE)
      .mockResolvedValueOnce(PROFILE_RESPONSE);

    await loadBoilerData();

    const calls = mockFetchOIGAPI.mock.calls.map(c => c[0] as string);
    expect(calls.some(url => url.includes('boiler_profile'))).toBe(true);
  });

  it('config.volumeL comes from profile config, not canonical plan data', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(CANONICAL_RESPONSE)
      .mockResolvedValueOnce(PROFILE_RESPONSE);

    const data = await loadBoilerData();

    expect(data.config.volumeL).toBe(150);
  });

  it('config.heaterPowerKw comes from profile config', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(CANONICAL_RESPONSE)
      .mockResolvedValueOnce(PROFILE_RESPONSE);

    const data = await loadBoilerData();

    expect(data.config.heaterPowerKw).toBe(3.0);
  });

  it('config.auraMaxTempC comes from profile config', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(CANONICAL_RESPONSE)
      .mockResolvedValueOnce(PROFILE_RESPONSE);

    const data = await loadBoilerData();

    expect(data.config.auraMaxTempC).toBe(80);
  });

  it('config.targetTempC comes from profile config', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(CANONICAL_RESPONSE)
      .mockResolvedValueOnce(PROFILE_RESPONSE);

    const data = await loadBoilerData();

    expect(data.config.targetTempC).toBe(65);
  });

  it('config fields are null when profile config is absent (not from canonical plan data)', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(CANONICAL_RESPONSE)
      .mockResolvedValueOnce({ no_config_key: true });

    const data = await loadBoilerData();

    expect(data.config.volumeL).toBeNull();
    expect(data.config.heaterPowerKw).toBeNull();
    expect(data.config.auraMaxTempC).toBeNull();
  });

  it('v2Data.explanation.degradedReasons contains config_profile_unavailable when profile fetch fails', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(CANONICAL_RESPONSE)
      .mockRejectedValueOnce(new Error('network error'));

    const data = await loadBoilerData();

    expect(data.v2Data?.explanation?.degradedReasons ?? []).toContain('config_profile_unavailable');
  });

  it('v2Data.explanation.degradedReasons contains config_profile_unavailable when profile has no config key', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(CANONICAL_RESPONSE)
      .mockResolvedValueOnce({ other_key: 'value' });

    const data = await loadBoilerData();

    expect(data.v2Data?.explanation?.degradedReasons ?? []).toContain('config_profile_unavailable');
  });

  it('v2Data.explanation.degradedReasons does NOT contain config_profile_unavailable when profile succeeds', async () => {
    mockFetchOIGAPI
      .mockResolvedValueOnce(CANONICAL_RESPONSE)
      .mockResolvedValueOnce(PROFILE_RESPONSE);

    const data = await loadBoilerData();

    expect(data.v2Data?.explanation?.degradedReasons ?? []).not.toContain('config_profile_unavailable');
  });

  it('canonical plan slots still feed v2Data planSlots', async () => {
    const canonicalWithSlots = {
      ...CANONICAL_RESPONSE,
      plan_slots: [
        {
          start: '2026-04-26T10:00:00Z',
          end: '2026-04-26T10:15:00Z',
          consumption_kwh: 0.375,
          confidence: 0.9,
          recommended_source: 'fve',
          spot_price: 1.5,
          alt_price: null,
          overflow_available: true,
        },
      ],
    };
    mockFetchOIGAPI
      .mockResolvedValueOnce(canonicalWithSlots)
      .mockResolvedValueOnce(PROFILE_RESPONSE);

    const data = await loadBoilerData();

    expect(data.v2Data?.planSlots).toHaveLength(1);
    expect(data.v2Data?.planSlots[0].recommendedSource).toBe('fve');
  });

  it('root-level canonical fields do not override profile config', async () => {
    const canonicalWithRootConfig = {
      ...CANONICAL_RESPONSE,
      volume_l: 999,
      heater_power_kw: 99,
    };
    mockFetchOIGAPI
      .mockResolvedValueOnce(canonicalWithRootConfig)
      .mockResolvedValueOnce(PROFILE_RESPONSE);

    const data = await loadBoilerData();

    expect(data.config.volumeL).toBe(150);
    expect(data.config.heaterPowerKw).toBe(3.0);
  });
});
