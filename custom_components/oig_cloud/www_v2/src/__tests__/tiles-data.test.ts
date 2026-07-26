import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/data/ha-client', () => ({
  haClient: {
    callWS: vi.fn(),
    callService: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/data/entity-store', () => ({
  getEntityStore: vi.fn().mockReturnValue(null),
}));

import { haClient } from '@/data/ha-client';
import {
  DEFAULT_TILES_CONFIG,
  loadTilesConfig,
  saveTilesConfig,
  filterDashboardTiles,
  shouldRenderDashboardTile,
  isEmptyTilesConfig,
  type ResolvedTile,
  type TilesConfig,
} from '@/data/tiles-data';

const STORAGE_KEY = 'oig_dashboard_tiles';
const PREV_STORAGE_KEY = 'oig_dashboard_tiles_prev';

function makeConfig(overrides: Partial<TilesConfig> = {}): TilesConfig {
  return {
    tiles_left: [
      { type: 'entity', entity_id: 'sensor.oig_bazen', module: 'core' },
      null,
      null,
      null,
      null,
      null,
    ],
    tiles_right: [null, null, null, null, null, null],
    left_count: 4,
    right_count: 4,
    visible: true,
    version: 1,
    ...overrides,
  };
}

function makeResolvedTile(entityId: string, module: ResolvedTile['config']['module']): ResolvedTile {
  return {
    config: { type: 'entity', entity_id: entityId, module },
    value: '1',
    unit: '',
    isActive: true,
    isZero: false,
    formattedValue: '1',
    supportValues: {},
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(haClient.callWS).mockReset();
  vi.mocked(haClient.callService).mockReset().mockResolvedValue(true);
});

describe('isEmptyTilesConfig', () => {
  it('treats null/undefined as empty', () => {
    expect(isEmptyTilesConfig(null)).toBe(true);
    expect(isEmptyTilesConfig(undefined)).toBe(true);
  });

  it('treats all-null tiles arrays as empty', () => {
    expect(isEmptyTilesConfig(DEFAULT_TILES_CONFIG)).toBe(true);
  });

  it('treats a config with at least one tile as non-empty', () => {
    expect(isEmptyTilesConfig(makeConfig())).toBe(false);
  });
});

describe('saveTilesConfig — backup-on-save', () => {
  it('writes both the current key and the previous-version key on the very first save', async () => {
    const config = makeConfig();
    await saveTilesConfig(config);

    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(config));
    expect(localStorage.getItem(PREV_STORAGE_KEY)).not.toBeNull();
  });

  it('preserves the prior current value as the previous-version snapshot on subsequent saves', async () => {
    const first = makeConfig();
    const second = makeConfig({ tiles_left: [null, null, null, null, null, null] });

    await saveTilesConfig(first);
    await saveTilesConfig(second);

    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(second));
    expect(localStorage.getItem(PREV_STORAGE_KEY)).toBe(JSON.stringify(first));
  });

  it('calls the save_dashboard_tiles service for every save', async () => {
    const config = makeConfig();
    await saveTilesConfig(config);

    expect(haClient.callService).toHaveBeenCalledWith(
      'oig_cloud',
      'save_dashboard_tiles',
      { config: JSON.stringify(config) },
    );
  });
});

describe('loadTilesConfig — recovery', () => {
  it('returns the HA config when it is non-empty', async () => {
    const config = makeConfig();
    vi.mocked(haClient.callWS).mockResolvedValue({ response: { config } });

    const result = await loadTilesConfig();
    expect(result.tiles_left[0]?.entity_id).toBe('sensor.oig_bazen');
  });

  it('falls back to localStorage when HA returns an empty config', async () => {
    vi.mocked(haClient.callWS).mockResolvedValue({ response: { config: DEFAULT_TILES_CONFIG } });
    const local = makeConfig();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));

    const result = await loadTilesConfig();
    expect(result.tiles_left[0]?.entity_id).toBe('sensor.oig_bazen');
  });

  it('recovers from the previous-version backup when both HA and current localStorage are empty', async () => {
    vi.mocked(haClient.callWS).mockResolvedValue({ response: { config: DEFAULT_TILES_CONFIG } });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TILES_CONFIG));
    const backup = makeConfig();
    localStorage.setItem(PREV_STORAGE_KEY, JSON.stringify(backup));

    const result = await loadTilesConfig();
    expect(result.tiles_left[0]?.entity_id).toBe('sensor.oig_bazen');
  });

  it('falls back to DEFAULT_TILES_CONFIG when HA, localStorage and backup are all empty', async () => {
    vi.mocked(haClient.callWS).mockRejectedValue(new Error('no ws'));

    const result = await loadTilesConfig();
    expect(isEmptyTilesConfig(result)).toBe(true);
  });
});

describe('filterDashboardTiles / shouldRenderDashboardTile — defensive flags', () => {
  it('passes every tile through when flags are missing entirely (no cfg.modules)', () => {
    const tiles = [
      makeResolvedTile('sensor.oig_bazen', 'core'),
      makeResolvedTile('sensor.oig_boiler_temp', 'boiler'),
      makeResolvedTile('sensor.oig_spot_price_now', 'pricing'),
      makeResolvedTile('sensor.oig_hourly_load', 'statistics'),
      makeResolvedTile('sensor.oig_battery_efficiency', 'battery_prediction'),
    ];

    expect(filterDashboardTiles(tiles, {})).toHaveLength(tiles.length);
    expect(filterDashboardTiles(tiles)).toHaveLength(tiles.length);
  });

  it('still hides a module explicitly disabled', () => {
    const boilerTile = makeResolvedTile('sensor.oig_boiler_temp', 'boiler');
    expect(shouldRenderDashboardTile(boilerTile, { enableBoiler: false })).toBe(false);
  });

  it('always keeps core tiles visible even if every module flag is false', () => {
    const coreTile = makeResolvedTile('sensor.oig_bazen', 'core');
    const flags = {
      enablePricing: false,
      enableBoiler: false,
      enableStatistics: false,
      enablePrediction: false,
    };
    expect(shouldRenderDashboardTile(coreTile, flags)).toBe(true);
  });

  it('defaults enablePrediction to true', () => {
    const predictionTile = makeResolvedTile('sensor.oig_battery_efficiency', 'battery_prediction');
    expect(shouldRenderDashboardTile(predictionTile, {})).toBe(true);
  });
});
