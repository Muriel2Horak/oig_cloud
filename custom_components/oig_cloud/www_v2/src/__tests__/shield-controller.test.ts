import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStoreState = {
  activityAttrs: {} as Record<string, unknown>,
  status: 'idle',
  queueCount: 0,
  boxMode: 'Home 1',
  gridMode: 'Omezeno',
  gridLimit: 5400,
  boilerMode: 'CBB',
};

vi.mock('@/data/entity-store', () => ({
  getEntityStore: vi.fn(() => ({
    findSensorId: (sensorName: string) => `sensor.${sensorName}`,
    getSensorId: (sensorName: string) => `sensor.${sensorName}`,
    get: (entityId: string) => {
      if (entityId === 'sensor.service_shield_activity') {
        return {
          state: 'activity',
          attributes: mockStoreState.activityAttrs,
        };
      }
      return null;
    },
    getString: (entityId: string) => {
      switch (entityId) {
        case 'sensor.service_shield_status':
          return { value: mockStoreState.status, lastUpdated: null, attributes: {}, exists: true };
        case 'sensor.box_prms_mode':
          return { value: mockStoreState.boxMode, lastUpdated: null, attributes: {}, exists: true };
        case 'sensor.invertor_prms_to_grid':
          return { value: mockStoreState.gridMode, lastUpdated: null, attributes: {}, exists: true };
        case 'sensor.boiler_manual_mode':
          return { value: mockStoreState.boilerMode, lastUpdated: null, attributes: {}, exists: true };
        default:
          return { value: '', lastUpdated: null, attributes: {}, exists: false };
      }
    },
    getNumeric: (entityId: string) => {
      switch (entityId) {
        case 'sensor.service_shield_queue':
          return { value: mockStoreState.queueCount, lastUpdated: null, attributes: {}, exists: true };
        case 'sensor.invertor_prm1_p_max_feed_grid':
          return { value: mockStoreState.gridLimit, lastUpdated: null, attributes: {}, exists: true };
        default:
          return { value: 0, lastUpdated: null, attributes: {}, exists: false };
      }
    },
  })),
}));

vi.mock('@/data/ha-client', () => ({
  haClient: {
    callService: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/data/state-watcher', () => ({
  stateWatcher: {
    onEntityChange: vi.fn(() => () => {}),
  },
}));

describe('ShieldController structured split grid parsing', () => {
  beforeEach(() => {
    mockStoreState.activityAttrs = {};
    mockStoreState.status = 'idle';
    mockStoreState.queueCount = 0;
    mockStoreState.boxMode = 'Home 1';
    mockStoreState.gridMode = 'Omezeno';
    mockStoreState.gridLimit = 5400;
    mockStoreState.boilerMode = 'CBB';
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('uses structured grid limit payloads instead of parsing quoted change strings', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          description: 'set_grid_delivery: 5400 (step: limit)',
          grid_delivery_step: 'limit',
          params: {
            limit: 5400,
            _grid_delivery_step: 'limit',
          },
          targets: [
            {
              param: 'limit',
              value: '5400',
              entity_id: 'sensor.oig_2206237016_invertor_prm1_p_max_feed_grid',
              from: '5000',
              to: '5400',
              current: '5000',
            },
          ],
          changes: ["p_max_feed_grid: '5000' → '5400' (nyní: '5000')"],
          started_at: '2026-04-09T12:00:00Z',
          trace_id: 'abc123',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_limit')).toBe('5400');
    expect(state.changingServices.has('grid_limit')).toBe(true);
    expect(state.allRequests[0]?.gridDeliveryStep).toBe('limit');
    expect(state.allRequests[0]?.targetValue).toBe('5400');
    expect(state.allRequests[0]?.targets?.[0]?.to).toBe('5400');
  });

  it('uses structured grid mode payloads and keeps friendly text', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.gridMode = 'Probíhá změna';
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          description: 'set_grid_delivery: Omezeno (step: mode)',
          grid_delivery_step: 'mode',
          params: {
            mode: 'limited',
            _grid_delivery_step: 'mode',
          },
          targets: [
            {
              param: 'mode',
              value: 'Omezeno',
              entity_id: 'sensor.oig_2206237016_invertor_prms_to_grid',
              from: 'Zapnuto',
              to: 'Omezeno',
              current: 'Zapnuto',
            },
          ],
          changes: ["prms_to_grid: 'Zapnuto' → 'Omezeno' (nyní: 'Zapnuto')"],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_mode')).toBe('Omezeno');
    expect(state.changingServices.has('grid_mode')).toBe(true);
    expect(state.currentGridDelivery).toBe('off');
  });

  it('falls back to quoted numeric change parsing when structured fields are absent', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          changes: ["p_max_feed_grid: '5000' → '5400'"],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_limit')).toBe('5400');
    expect(state.changingServices.has('grid_limit')).toBe(true);
  });

  it('preserves previous grid mode during Probíhá změna transition refreshes', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };
    mockStoreState.gridMode = 'Omezeno';
    controller.refresh();
    expect(controller.getState().currentGridDelivery).toBe('limited');

    mockStoreState.gridMode = 'Probíhá změna';
    controller.refresh();
    expect(controller.getState().currentGridDelivery).toBe('limited');
  });
});
