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
  resolveTiles,
  getTileEntityIds,
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

// Owner live-storage payload (INTEGRATOR EVIDENCE, fix-tiles-render-empty-despite-valid):
// /config/.storage/oig_dashboard_tiles held these 3 tiles — mostly external
// (non-oig) entities plus one button — but left_count/right_count are stale
// legacy fields nothing in the app ever keeps in sync with occupancy (no UI
// reads or writes them; onTileSaved fills the first free null slot with no
// regard for count). A config saved back when count was smaller than the
// slot index a tile now occupies renders that tile invisible even though it
// is fully intact in storage.
const OWNER_LIVE_PAYLOAD = {
  tiles_left: [
    {
      type: 'entity',
      entity_id: 'sensor.bazen_teplota',
      label: 'Bazen',
      icon: 'mdi:pool',
      support_entities: { top_right: 'sensor.bazen_ph', bottom_right: 'sensor.bazen_chlor' },
    },
    {
      type: 'entity',
      entity_id: 'sensor.bojler_nahora_local_teplota',
      label: 'Bojler',
    },
    {
      type: 'button',
      entity_id: 'input_boolean.doohrev_plynem_manual',
      label: 'Ohrat',
      action: 'toggle',
    },
    null, null, null,
  ],
  tiles_right: [null, null, null, null, null, null],
  // Stale legacy value: only the first slot was ever within count when this
  // config was first created; the 2nd and 3rd tiles were added later.
  left_count: 1,
  right_count: 4,
  visible: true,
  version: 1,
};

describe('owner live-storage payload — render/load path (fix-tiles-render-empty-despite-valid)', () => {
  it('normalizeTilesConfig (via loadTilesConfig) drops none of the 3 owner tiles', async () => {
    vi.mocked(haClient.callWS).mockResolvedValue({ response: { config: OWNER_LIVE_PAYLOAD } });

    const result = await loadTilesConfig();
    expect(result.tiles_left.filter(Boolean)).toHaveLength(3);
  });

  it('the button tile survives normalize with its type and action intact', async () => {
    vi.mocked(haClient.callWS).mockResolvedValue({ response: { config: OWNER_LIVE_PAYLOAD } });

    const result = await loadTilesConfig();
    const button = result.tiles_left.find((t) => t?.entity_id === 'input_boolean.doohrev_plynem_manual');
    expect(button?.type).toBe('button');
    expect(button?.action).toBe('toggle');
  });

  it('resolveTiles renders every occupied slot, not just the ones within the stale left_count', async () => {
    vi.mocked(haClient.callWS).mockResolvedValue({ response: { config: OWNER_LIVE_PAYLOAD } });

    const cfg = await loadTilesConfig();
    const resolved = resolveTiles(cfg);
    expect(resolved.left).toHaveLength(3);
  });

  it('getTileEntityIds watches every occupied slot too, not just the ones within count', async () => {
    vi.mocked(haClient.callWS).mockResolvedValue({ response: { config: OWNER_LIVE_PAYLOAD } });

    const cfg = await loadTilesConfig();
    const ids = getTileEntityIds(cfg);
    expect(ids).toEqual(expect.arrayContaining([
      'sensor.bazen_teplota',
      'sensor.bazen_ph',
      'sensor.bazen_chlor',
      'sensor.bojler_nahora_local_teplota',
      'input_boolean.doohrev_plynem_manual',
    ]));
  });

  it('all 3 tiles pass the dashboard filter with every module enabled', async () => {
    vi.mocked(haClient.callWS).mockResolvedValue({ response: { config: OWNER_LIVE_PAYLOAD } });

    const cfg = await loadTilesConfig();
    const resolved = resolveTiles(cfg);
    const visible = filterDashboardTiles([...resolved.left, ...resolved.right], {
      enablePricing: true, enableBoiler: true, enableStatistics: true, enablePrediction: true,
    });
    expect(visible).toHaveLength(3);
  });

  it('all 3 tiles still render when module flags are unavailable (mid-load / bootstrap not done) — fail-open', async () => {
    vi.mocked(haClient.callWS).mockResolvedValue({ response: { config: OWNER_LIVE_PAYLOAD } });

    const cfg = await loadTilesConfig();
    const resolved = resolveTiles(cfg);
    const visible = filterDashboardTiles([...resolved.left, ...resolved.right]);
    expect(visible).toHaveLength(3);
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
