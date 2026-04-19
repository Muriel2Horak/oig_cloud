import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShieldController } from '@/data/shield-controller';

vi.mock('@/data/entity-store', () => ({
  getEntityStore: vi.fn(),
}));

vi.mock('@/data/state-watcher', () => ({
  stateWatcher: {
    onEntityChange: vi.fn(() => () => {}),
    registerEntities: vi.fn(),
  },
}));

vi.mock('@/data/ha-client', () => ({
  haClient: {},
}));

vi.mock('@/core/logger', () => ({
  oigLog: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

type MockSensor = { state: string; attributes?: Record<string, unknown> };

function makeMockStore(sensors: Record<string, MockSensor>) {
  return {
    findSensorId: (name: string) => `sensor.oig_2206237016_${name}`,
    getString: (id: string) => {
      const s = sensors[id];
      if (!s) return { value: '', lastUpdated: null, attributes: {}, exists: false };
      const value = s.state !== 'unavailable' && s.state !== 'unknown' ? s.state : '';
      return { value, lastUpdated: null, attributes: s.attributes ?? {}, exists: true };
    },
    getNumeric: (id: string) => {
      const s = sensors[id];
      if (!s) return { value: 0, lastUpdated: null, attributes: {}, exists: false };
      return { value: parseFloat(s.state) || 0, lastUpdated: null, attributes: s.attributes ?? {}, exists: true };
    },
    get: (id: string) => {
      const s = sensors[id];
      if (!s) return null;
      return { state: s.state, attributes: s.attributes ?? {}, last_updated: '' };
    },
  };
}

function baselineSensors(overrides: Record<string, MockSensor> = {}): Record<string, MockSensor> {
  return {
    'sensor.oig_2206237016_service_shield_activity': {
      state: 'idle',
      attributes: { running_requests: [], queued_requests: [] },
    },
    'sensor.oig_2206237016_service_shield_status': { state: 'idle' },
    'sensor.oig_2206237016_service_shield_queue': { state: '0' },
    'sensor.oig_2206237016_box_prms_mode': { state: 'Home 1' },
    'sensor.oig_2206237016_invertor_prms_to_grid': { state: 'off' },
    'sensor.oig_2206237016_invertor_prm1_p_max_feed_grid': { state: '5000' },
    'sensor.oig_2206237016_boiler_manual_mode': { state: 'CBB' },
    ...overrides,
  };
}

describe('ShieldController supplementary state propagation', () => {
  let controller: ShieldController;
  let getEntityStore: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/data/entity-store');
    getEntityStore = vi.mocked(mod.getEntityStore);
    controller = new ShieldController();
  });

  it('sets available=false and all toggles false when box_mode_extended sensor is missing', () => {
    getEntityStore.mockReturnValue(makeMockStore(baselineSensors()));
    controller.refresh();
    const { supplementary } = controller.getState();
    expect(supplementary.available).toBe(false);
    expect(supplementary.home_grid_v).toBe(false);
    expect(supplementary.home_grid_vi).toBe(false);
    expect(supplementary.flexibilita).toBe(false);
  });

  it('sets available=false when box_mode_extended state is "unavailable"', () => {
    getEntityStore.mockReturnValue(makeMockStore(baselineSensors({
      'sensor.oig_2206237016_box_mode_extended': { state: 'unavailable' },
    })));
    controller.refresh();
    const { supplementary } = controller.getState();
    expect(supplementary.available).toBe(false);
    expect(supplementary.home_grid_v).toBe(false);
    expect(supplementary.home_grid_vi).toBe(false);
  });

  it('raw_app=1 sets home_grid_v=true, home_grid_vi=false, flexibilita=false', () => {
    getEntityStore.mockReturnValue(makeMockStore(baselineSensors({
      'sensor.oig_2206237016_box_mode_extended': {
        state: 'home_5',
        attributes: { home_grid_v: true, home_grid_vi: false, flexibilita: false, raw_app: 1 },
      },
    })));
    controller.refresh();
    const { supplementary } = controller.getState();
    expect(supplementary.available).toBe(true);
    expect(supplementary.home_grid_v).toBe(true);
    expect(supplementary.home_grid_vi).toBe(false);
    expect(supplementary.flexibilita).toBe(false);
  });

  it('raw_app=2 sets home_grid_v=false, home_grid_vi=true — matches live HA evidence', () => {
    getEntityStore.mockReturnValue(makeMockStore(baselineSensors({
      'sensor.oig_2206237016_box_mode_extended': {
        state: 'home_6',
        attributes: { home_grid_v: false, home_grid_vi: true, flexibilita: false, raw_app: 2 },
      },
    })));
    controller.refresh();
    const { supplementary } = controller.getState();
    expect(supplementary.available).toBe(true);
    expect(supplementary.home_grid_v).toBe(false);
    expect(supplementary.home_grid_vi).toBe(true);
    expect(supplementary.flexibilita).toBe(false);
  });

  it('raw_app=3 sets home_grid_v=true AND home_grid_vi=true simultaneously', () => {
    getEntityStore.mockReturnValue(makeMockStore(baselineSensors({
      'sensor.oig_2206237016_box_mode_extended': {
        state: 'home_5_home_6',
        attributes: { home_grid_v: true, home_grid_vi: true, flexibilita: false, raw_app: 3 },
      },
    })));
    controller.refresh();
    const { supplementary } = controller.getState();
    expect(supplementary.available).toBe(true);
    expect(supplementary.home_grid_v).toBe(true);
    expect(supplementary.home_grid_vi).toBe(true);
    expect(supplementary.flexibilita).toBe(false);
  });

  it('raw_app=4 sets flexibilita=true to block supplementary controls', () => {
    getEntityStore.mockReturnValue(makeMockStore(baselineSensors({
      'sensor.oig_2206237016_box_mode_extended': {
        state: 'flexibilita',
        attributes: { home_grid_v: false, home_grid_vi: false, flexibilita: true, raw_app: 4 },
      },
    })));
    controller.refresh();
    const { supplementary } = controller.getState();
    expect(supplementary.available).toBe(true);
    expect(supplementary.flexibilita).toBe(true);
  });

  it('supplementary state is independent from currentBoxMode (Home 1..UPS)', () => {
    getEntityStore.mockReturnValue(makeMockStore(baselineSensors({
      'sensor.oig_2206237016_box_prms_mode': { state: 'Home 2' },
      'sensor.oig_2206237016_box_mode_extended': {
        state: 'home_6',
        attributes: { home_grid_v: false, home_grid_vi: true, flexibilita: false, raw_app: 2 },
      },
    })));
    controller.refresh();
    const state = controller.getState();
    expect(state.currentBoxMode).toBe('home_2');
    expect(state.supplementary.home_grid_vi).toBe(true);
    expect(state.supplementary.home_grid_v).toBe(false);
  });

  it('does NOT preserve stale supplementary across refresh() calls (regression guard)', () => {
    getEntityStore.mockReturnValue(makeMockStore(baselineSensors({
      'sensor.oig_2206237016_box_mode_extended': {
        state: 'home_5',
        attributes: { home_grid_v: true, home_grid_vi: false, flexibilita: false, raw_app: 1 },
      },
    })));
    controller.refresh();
    expect(controller.getState().supplementary.home_grid_v).toBe(true);
    expect(controller.getState().supplementary.home_grid_vi).toBe(false);

    getEntityStore.mockReturnValue(makeMockStore(baselineSensors({
      'sensor.oig_2206237016_box_mode_extended': {
        state: 'home_6',
        attributes: { home_grid_v: false, home_grid_vi: true, flexibilita: false, raw_app: 2 },
      },
    })));
    controller.refresh();

    const { supplementary } = controller.getState();
    expect(supplementary.home_grid_v).toBe(false);
    expect(supplementary.home_grid_vi).toBe(true);
  });

  it('shouldRefreshShield triggers on box_mode_extended sensor changes', () => {
    const c = controller as unknown as { shouldRefreshShield(entityId: string): boolean };
    expect(c.shouldRefreshShield('sensor.oig_2206237016_box_mode_extended')).toBe(true);
  });

  it('shouldRefreshShield triggers on box_prm2_app sensor changes', () => {
    const c = controller as unknown as { shouldRefreshShield(entityId: string): boolean };
    expect(c.shouldRefreshShield('sensor.oig_2206237016_box_prm2_app')).toBe(true);
  });
});
