import { beforeEach, describe, expect, it, vi } from 'vitest';
import { haClient } from '@/data/ha-client';

const mockStoreState = {
  activityAttrs: {} as Record<string, unknown>,
  status: 'idle',
  queueCount: 0,
  boxMode: 'Home 1',
  gridMode: 'Omezeno',
  gridLimit: 5400,
  boilerMode: 'CBB',
  useGridSuffixSensors: false,
};

vi.mock('@/data/entity-store', () => ({
  getEntityStore: vi.fn(() => ({
    findSensorId: (sensorName: string) => {
      if (mockStoreState.useGridSuffixSensors && sensorName === 'invertor_prms_to_grid') {
        return 'sensor.invertor_prms_to_grid_2';
      }
      if (mockStoreState.useGridSuffixSensors && sensorName === 'invertor_prm1_p_max_feed_grid') {
        return 'sensor.invertor_prm1_p_max_feed_grid_2';
      }
      return `sensor.${sensorName}`;
    },
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
          if (mockStoreState.useGridSuffixSensors) {
            return { value: '', lastUpdated: null, attributes: {}, exists: false };
          }
          return { value: mockStoreState.gridMode, lastUpdated: null, attributes: {}, exists: true };
        case 'sensor.invertor_prms_to_grid_2':
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
          if (mockStoreState.useGridSuffixSensors) {
            return { value: 0, lastUpdated: null, attributes: {}, exists: false };
          }
          return { value: mockStoreState.gridLimit, lastUpdated: null, attributes: {}, exists: true };
        case 'sensor.invertor_prm1_p_max_feed_grid_2':
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

describe('ShieldController lifecycle — start / stop / subscribe', () => {
  beforeEach(() => {
    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };
    mockStoreState.status = 'idle';
    mockStoreState.queueCount = 0;
    mockStoreState.boxMode = 'Home 1';
    mockStoreState.gridMode = 'Omezeno';
    mockStoreState.gridLimit = 5400;
    mockStoreState.boilerMode = 'CBB';
    mockStoreState.useGridSuffixSensors = false;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('start() subscribes to state watcher and calls refresh once', async () => {
    const { stateWatcher } = await import('@/data/state-watcher');
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    controller.start();

    expect(stateWatcher.onEntityChange).toHaveBeenCalledTimes(1);
  });

  it('start() is idempotent — second call is a no-op', async () => {
    const { stateWatcher } = await import('@/data/state-watcher');
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    controller.start();
    controller.start();

    expect(stateWatcher.onEntityChange).toHaveBeenCalledTimes(1);
  });

  it('stop() clears the watcher and interval without throwing', async () => {
    const { stateWatcher } = await import('@/data/state-watcher');
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    let unsub = false;
    (stateWatcher.onEntityChange as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (_cb: unknown) => () => { unsub = true; },
    );

    controller.start();
    expect(() => controller.stop()).not.toThrow();
    expect(unsub).toBe(true);
  });

  it('stop() can be called safely without prior start()', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    expect(() => controller.stop()).not.toThrow();
  });

  it('subscribe() fires listener immediately with current state', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    const received: unknown[] = [];
    controller.subscribe((s) => received.push(s));

    expect(received).toHaveLength(1);
    expect((received[0] as { status: string }).status).toBe('idle');
  });

  it('subscribe() returns an unsubscribe function that stops future notifications', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    const received: unknown[] = [];
    const unsub = controller.subscribe((s) => received.push(s));
    expect(received).toHaveLength(1);

    unsub();
    controller.refresh();
    expect(received).toHaveLength(1);
  });

  it('entity change on shield sensor triggers refresh via onEntityChange callback', async () => {
    const { stateWatcher } = await import('@/data/state-watcher');
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    let capturedCb: ((entityId: string, s: unknown) => void) | undefined;
    (stateWatcher.onEntityChange as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (cb: (entityId: string, s: unknown) => void) => {
        capturedCb = cb;
        return () => {};
      },
    );

    controller.start();

    const received: unknown[] = [];
    controller.subscribe((s) => received.push(s));
    const countBefore = received.length;

    capturedCb!('sensor.service_shield_status', {});
    expect(received.length).toBeGreaterThan(countBefore);
  });

  it('entity change on irrelevant sensor does NOT trigger refresh', async () => {
    const { stateWatcher } = await import('@/data/state-watcher');
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    let capturedCb: ((entityId: string, s: unknown) => void) | undefined;
    (stateWatcher.onEntityChange as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (cb: (entityId: string, s: unknown) => void) => {
        capturedCb = cb;
        return () => {};
      },
    );

    controller.start();

    const received: unknown[] = [];
    controller.subscribe((s) => received.push(s));
    const countBefore = received.length;

    capturedCb!('sensor.some_unrelated_entity', {});
    expect(received.length).toBe(countBefore);
  });
});

describe('ShieldController service calls', () => {
  beforeEach(() => {
    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };
    mockStoreState.status = 'idle';
    mockStoreState.queueCount = 0;
    mockStoreState.boxMode = 'Home 1';
    mockStoreState.gridMode = 'Omezeno';
    mockStoreState.gridLimit = 5400;
    mockStoreState.boilerMode = 'CBB';
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('setBoxMode returns false when mode is already active and not changing', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const result = await controller.setBoxMode('home_1');
    expect(result).toBe(false);
    expect(haClient.callService).not.toHaveBeenCalled();
  });

  it('setBoxMode calls haClient and returns true on success', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const result = await controller.setBoxMode('home_2');
    expect(result).toBe(true);
    expect(haClient.callService).toHaveBeenCalledWith('oig_cloud', 'set_box_mode', {
      mode: 'home_2',
      acknowledgement: true,
    });
  });

  it('setBoilerMode returns false when mode is already active and not changing', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const result = await controller.setBoilerMode('cbb');
    expect(result).toBe(false);
    expect(haClient.callService).not.toHaveBeenCalled();
  });

  it('setBoilerMode calls haClient and returns true on success', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const result = await controller.setBoilerMode('manual');
    expect(result).toBe(true);
    expect(haClient.callService).toHaveBeenCalledWith('oig_cloud', 'set_boiler_mode', {
      mode: 'manual',
      acknowledgement: true,
    });
  });

  it('setGridDelivery sends mode-only payload when no limit provided', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    await controller.setGridDelivery('off');
    expect(haClient.callService).toHaveBeenCalledWith('oig_cloud', 'set_grid_delivery', {
      acknowledgement: true,
      warning: true,
      mode: 'off',
    });
  });

  it('setGridDelivery sends only limit when already limited and switching limit value', async () => {
    mockStoreState.gridMode = 'Omezeno';
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    await controller.setGridDelivery('limited', 3000);
    const call = (haClient.callService as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[2]).toMatchObject({ limit: 3000 });
    expect(call[2]).not.toHaveProperty('mode');
  });

  it('setGridDelivery sends both mode and limit when switching from off to limited', async () => {
    mockStoreState.gridMode = 'Vypnuto';
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    await controller.setGridDelivery('limited', 4000);
    const call = (haClient.callService as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[2]).toMatchObject({ mode: 'limited', limit: 4000 });
  });

  it('setGridDelivery sends both mode and limit when switching from on to limited', async () => {
    mockStoreState.gridMode = 'Zapnuto';
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    await controller.setGridDelivery('limited', 4000);
    const call = (haClient.callService as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[2]).toMatchObject({ mode: 'limited', limit: 4000 });
  });

  it('setGridDelivery sends only limit when store already reports limited but cached state is stale', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    mockStoreState.gridMode = 'Zapnuto';
    controller.refresh();
    expect(controller.getState().currentGridDelivery).toBe('on');

    mockStoreState.gridMode = 'Omezeno';

    await controller.setGridDelivery('limited', 4200);

    const call = (haClient.callService as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[2]).toMatchObject({ limit: 4200 });
    expect(call[2]).not.toHaveProperty('mode');
  });

  it('setGridDelivery sends only limit when limited mode is already pending before numeric limit step', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 2;
    mockStoreState.gridMode = 'Probíhá změna';
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'limited', _grid_delivery_step: 'mode' },
          targets: [{ param: 'mode', value: 'Omezeno', entity_id: 'sensor.invertor_prms_to_grid', from: 'Zapnuto', to: 'Omezeno', current: 'Zapnuto' }],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    await controller.setGridDelivery('limited', 3600);

    const call = (haClient.callService as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[2]).toMatchObject({ limit: 3600 });
    expect(call[2]).not.toHaveProperty('mode');
  });

  it('setGridDelivery sends only limit when grid_mode is already pending even if raw sensor still says off', async () => {
    mockStoreState.status = 'idle';
    mockStoreState.queueCount = 1;
    mockStoreState.gridMode = 'Vypnuto';
    mockStoreState.activityAttrs = {
      running_requests: [],
      queued_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'limited', _grid_delivery_step: 'mode' },
          targets: [{ param: 'mode', value: 'Omezeno', entity_id: 'sensor.invertor_prms_to_grid', from: 'Vypnuto', to: 'Omezeno', current: 'Vypnuto' }],
          changes: [],
          queued_at: '2026-04-09T12:00:00Z',
        },
      ],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    await controller.setGridDelivery('limited', 5400);

    const call = (haClient.callService as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[2]).toMatchObject({ limit: 5400 });
    expect(call[2]).not.toHaveProperty('mode');
  });

  it('setGridDelivery still sends mode and limit when pending grid_mode targets on instead of limited', async () => {
    mockStoreState.status = 'idle';
    mockStoreState.queueCount = 1;
    mockStoreState.gridMode = 'Vypnuto';
    mockStoreState.activityAttrs = {
      running_requests: [],
      queued_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'on', _grid_delivery_step: 'mode' },
          targets: [{ param: 'mode', value: 'Zapnuto', entity_id: 'sensor.invertor_prms_to_grid', from: 'Vypnuto', to: 'Zapnuto', current: 'Vypnuto' }],
          changes: [],
          queued_at: '2026-04-09T12:00:00Z',
        },
      ],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    await controller.setGridDelivery('limited', 5400);

    const call = (haClient.callService as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[2]).toMatchObject({ mode: 'limited', limit: 5400 });
  });

  it('setGridDelivery sends limit only when delivery is non-limited with limit param', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    await controller.setGridDelivery('on', 2000);
    const call = (haClient.callService as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[2]).toMatchObject({ limit: 2000 });
  });

  it('removeFromQueue calls haClient with correct position', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    const result = await controller.removeFromQueue(2);
    expect(result).toBe(true);
    expect(haClient.callService).toHaveBeenCalledWith('oig_cloud', 'shield_remove_from_queue', {
      position: 2,
    });
  });

  it('shouldProceedWithQueue returns true when queue has fewer than 3 items', async () => {
    mockStoreState.queueCount = 2;
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    expect(controller.shouldProceedWithQueue()).toBe(true);
  });
});

describe('ShieldController button state helpers', () => {
  beforeEach(() => {
    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };
    mockStoreState.status = 'idle';
    mockStoreState.queueCount = 0;
    mockStoreState.boxMode = 'Home 1';
    mockStoreState.gridMode = 'Omezeno';
    mockStoreState.gridLimit = 5400;
    mockStoreState.boilerMode = 'CBB';
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('getBoxModeButtonState returns active for current mode when no pending', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    expect(controller.getBoxModeButtonState('home_1')).toBe('active');
    expect(controller.getBoxModeButtonState('home_2')).toBe('idle');
  });

  it('getBoxModeButtonState returns processing for pending mode when status=running', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_box_mode',
          changes: ["box_prms_mode: 'Home 1' → 'Home 2'"],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    expect(controller.getBoxModeButtonState('home_2')).toBe('processing');
    expect(controller.getBoxModeButtonState('home_1')).toBe('disabled-by-service');
  });

  it('getBoxModeButtonState returns pending for queued mode when status=idle', async () => {
    mockStoreState.status = 'idle';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [],
      queued_requests: [
        {
          service: 'set_box_mode',
          changes: ["box_prms_mode: 'Home 1' → 'Home 2'"],
          queued_at: '2026-04-09T12:00:00Z',
        },
      ],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    expect(controller.getBoxModeButtonState('home_2')).toBe('pending');
  });

  it('getGridDeliveryButtonState returns active for current delivery when no pending', async () => {
    mockStoreState.gridMode = 'Omezeno';
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    expect(controller.getGridDeliveryButtonState('limited')).toBe('active');
    expect(controller.getGridDeliveryButtonState('off')).toBe('idle');
  });

  it('refresh reads suffix-matched grid sensors via findSensorId so limited mode does not fall back to off', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    mockStoreState.useGridSuffixSensors = true;
    controller.refresh();

    expect(controller.getState().currentGridDelivery).toBe('limited');
    expect(controller.getGridDeliveryButtonState('limited')).toBe('active');
    expect(controller.getGridDeliveryButtonState('off')).toBe('idle');
  });

  it('getGridDeliveryButtonState returns processing for limited when grid_limit changing and status=running', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'limit',
          params: { limit: 3000, _grid_delivery_step: 'limit' },
          targets: [{ param: 'limit', value: '3000', entity_id: 'sensor.invertor_prm1_p_max_feed_grid', from: '5400', to: '3000', current: '5400' }],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    expect(controller.getGridDeliveryButtonState('limited')).toBe('processing');
    expect(controller.getGridDeliveryButtonState('off')).toBe('disabled-by-service');
  });

  it('getGridDeliveryButtonState keeps current limited active during queued transition away from limited', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    mockStoreState.gridMode = 'Omezeno';
    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };
    controller.refresh();

    mockStoreState.status = 'idle';
    mockStoreState.queueCount = 1;
    mockStoreState.gridMode = 'Omezeno';
    mockStoreState.activityAttrs = {
      running_requests: [],
      queued_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'off', _grid_delivery_step: 'mode' },
          targets: [{ param: 'mode', value: 'Vypnuto', entity_id: 'sensor.invertor_prms_to_grid', from: 'Omezeno', to: 'Vypnuto', current: 'Omezeno' }],
          changes: [],
          queued_at: '2026-04-09T12:00:00Z',
        },
      ],
    };

    controller.refresh();

    expect(controller.getGridDeliveryButtonState('limited')).toBe('active');
    expect(controller.getGridDeliveryButtonState('off')).toBe('pending');
    expect(controller.getGridDeliveryButtonState('on')).toBe('disabled-by-service');
  });

  it('getGridDeliveryButtonState keeps current limited active during running transition away from limited', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    mockStoreState.gridMode = 'Omezeno';
    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };
    controller.refresh();

    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.gridMode = 'Probíhá změna';
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'on', _grid_delivery_step: 'mode' },
          targets: [{ param: 'mode', value: 'Zapnuto', entity_id: 'sensor.invertor_prms_to_grid', from: 'Omezeno', to: 'Zapnuto', current: 'Omezeno' }],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    controller.refresh();

    expect(controller.getGridDeliveryButtonState('limited')).toBe('active');
    expect(controller.getGridDeliveryButtonState('on')).toBe('processing');
    expect(controller.getGridDeliveryButtonState('off')).toBe('disabled-by-service');
  });

  it('getBoilerModeButtonState returns active for current mode when no pending', async () => {
    mockStoreState.boilerMode = 'CBB';
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    expect(controller.getBoilerModeButtonState('cbb')).toBe('active');
    expect(controller.getBoilerModeButtonState('manual')).toBe('idle');
  });

  it('isAnyServiceChanging returns true when changingServices has entries', async () => {
    mockStoreState.status = 'running';
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_boiler_mode',
          changes: ["boiler_manual_mode: 'CBB' → 'Manuální'"],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    expect(controller.isAnyServiceChanging()).toBe(true);
  });

  it('isAnyServiceChanging returns false when no services changing', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    expect(controller.isAnyServiceChanging()).toBe(false);
  });
});

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

  it('preserves previous grid mode during prefixed Probíhá změna transition refreshes', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };
    mockStoreState.gridMode = 'Omezeno';
    controller.refresh();
    expect(controller.getState().currentGridDelivery).toBe('limited');

    mockStoreState.gridMode = 'Probíhá změna režimu';
    controller.refresh();
    expect(controller.getState().currentGridDelivery).toBe('limited');
  });

  it('currentGridDelivery preserves last-known value when live becomes unknown — no silent unknown->off coercion', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };
    mockStoreState.gridMode = 'Omezeno';
    controller.refresh();
    expect(controller.getState().currentGridDelivery).toBe('limited');

    mockStoreState.gridMode = 'unknown';
    controller.refresh();
    expect(controller.getState().currentGridDelivery).toBe('limited');
    expect(controller.getState().gridDeliveryState.currentLiveDelivery).toBe('unknown');
  });

  it('currentGridDelivery preserves last-known on when sensor becomes unavailable', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };
    mockStoreState.gridMode = 'Zapnuto';
    controller.refresh();
    expect(controller.getState().currentGridDelivery).toBe('on');

    mockStoreState.gridMode = 'unavailable';
    controller.refresh();
    expect(controller.getState().currentGridDelivery).toBe('on');
    expect(controller.getState().gridDeliveryState.currentLiveDelivery).toBe('unknown');
    expect(controller.getState().gridDeliveryState.isUnavailable).toBe(true);
  });

  it('resolves grid_limit from targets array when no gridDeliveryStep (extractStructuredTarget targets path)', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          targets: [
            {
              param: 'limit',
              value: '4000',
              to: '4000',
              entity_id: 'sensor.invertor_prm1_p_max_feed_grid',
              from: '5400',
              current: '5400',
            },
          ],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_limit')).toBe('4000');
  });

  it('resolves grid_mode from targets array when no gridDeliveryStep (extractStructuredTarget mode targets path)', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          targets: [
            {
              param: 'mode',
              value: 'Omezeno',
              to: 'Omezeno',
              entity_id: 'sensor.invertor_prms_to_grid',
              from: 'Zapnuto',
              current: 'Zapnuto',
            },
          ],
          changes: [],
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
  });

  it('falls back to grid_limit when changeStr has numeric arrow match and no structuredTarget or p_max_feed_grid', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          changes: ["some_param: 'old' → '3000'"],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_limit')).toBe('3000');
  });

  it('falls back to grid_limit when targetValue is numeric and changeStr has no arrow match', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          target_value: '7000',
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_limit')).toBe('7000');
  });

  it('falls back to grid_mode when changeStr has no numeric arrow match and targetValue is non-numeric', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_mode')).toBeDefined();
  });

  it('normalizeNumericTargetValue handles a finite number input', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'limit',
          params: { limit: 3333.7, _grid_delivery_step: 'limit' },
          targets: [],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_limit')).toBe('3334');
  });

  it('normalizeModeTargetValue maps english "off" to Vypnuto', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'off', _grid_delivery_step: 'mode' },
          targets: [],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_mode')).toBe('Vypnuto');
  });

  it('normalizeModeTargetValue maps english "on" to Zapnuto', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'on', _grid_delivery_step: 'mode' },
          targets: [],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_mode')).toBe('Zapnuto');
  });

  it('normalizeModeTargetValue maps english "limited" to Omezeno', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'limited', _grid_delivery_step: 'mode' },
          targets: [],
          changes: [],
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
  });

  it('normalizeModeTargetValue passes through unknown mode string unchanged', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'CustomMode', _grid_delivery_step: 'mode' },
          targets: [],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_mode')).toBe('CustomMode');
  });

  it('normalizeNumericTargetValue returns empty for non-string non-number input (null target)', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'limit',
          params: { _grid_delivery_step: 'limit' },
          targets: [],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_limit')).toBeUndefined();
  });

  it('normalizeNumericTargetValue returns empty for non-string non-number param (e.g. boolean) — line 386', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'limit',
          params: { limit: true, _grid_delivery_step: 'limit' },
          targets: [],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_limit')).toBeUndefined();
  });

  it('normalizeModeTargetValue returns empty for non-string mode param — lines 394-395 and parseServiceRequest lines 285-287', async () => {
    mockStoreState.status = 'running';
    mockStoreState.queueCount = 1;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 42, _grid_delivery_step: 'mode' },
          targets: [],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.pendingServices.get('grid_mode')).toBeUndefined();
  });

  it('parseServiceRequest returns null for gridDeliveryStep=mode when params.mode is non-string', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    const result = Reflect.apply(
      Reflect.get(controller, 'parseServiceRequest') as (req: Record<string, unknown>) => unknown,
      controller,
      [{
        service: 'set_grid_delivery',
        changes: [],
        targetValue: '',
        params: { mode: 42, _grid_delivery_step: 'mode' },
        targets: [],
        gridDeliveryStep: 'mode',
      }],
    );

    expect(result).toBeNull();
  });

  it('normalizeNumericTargetValue returns empty string for boolean input', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    const normalizeNumericTargetValue = Reflect.get(controller, 'normalizeNumericTargetValue') as (
      value: unknown
    ) => string;

    expect(normalizeNumericTargetValue(true)).toBe('');
  });

  it('normalizeModeTargetValue returns empty string for non-string input', async () => {
    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    const normalizeModeTargetValue = Reflect.get(controller, 'normalizeModeTargetValue') as (
      value: unknown
    ) => string;

    expect(normalizeModeTargetValue(42)).toBe('');
  });
});

describe('ShieldController live-vs-pending disagreement windows', () => {
  beforeEach(() => {
    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };
    mockStoreState.status = 'idle';
    mockStoreState.queueCount = 0;
    mockStoreState.boxMode = 'Home 1';
    mockStoreState.gridMode = 'Omezeno';
    mockStoreState.gridLimit = 5400;
    mockStoreState.boilerMode = 'CBB';
    mockStoreState.useGridSuffixSensors = false;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('gridDeliveryState exposes unknown live delivery during Probíhá změna transition', async () => {
    mockStoreState.gridMode = 'Probíhá změna';
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'limited', _grid_delivery_step: 'mode' },
          targets: [{ param: 'mode', value: 'Omezeno', entity_id: 'sensor.invertor_prms_to_grid', from: 'Vypnuto', to: 'Omezeno', current: 'Vypnuto' }],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.gridDeliveryState.currentLiveDelivery).toBe('unknown');
    expect(state.gridDeliveryState.isTransitioning).toBe(true);
    expect(state.gridDeliveryState.pendingDeliveryTarget).toBe('limited');
  });

  it('gridDeliveryState correctly separates live state from pending target', async () => {
    mockStoreState.gridMode = 'Vypnuto';
    mockStoreState.activityAttrs = {
      running_requests: [],
      queued_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'on', _grid_delivery_step: 'mode' },
          targets: [{ param: 'mode', value: 'Zapnuto', entity_id: 'sensor.invertor_prms_to_grid', from: 'Vypnuto', to: 'Zapnuto', current: 'Vypnuto' }],
          changes: [],
          queued_at: '2026-04-09T12:00:00Z',
        },
      ],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.gridDeliveryState.currentLiveDelivery).toBe('off');
    expect(state.gridDeliveryState.pendingDeliveryTarget).toBe('on');
    expect(state.gridDeliveryState.isTransitioning).toBe(true);
  });

  it('pending limit is tracked separately from pending delivery', async () => {
    mockStoreState.gridMode = 'Omezeno';
    mockStoreState.gridLimit = 5000;
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'limit',
          params: { limit: 3000, _grid_delivery_step: 'limit' },
          targets: [{ param: 'limit', value: '3000', entity_id: 'sensor.invertor_prm1_p_max_feed_grid', from: '5000', to: '3000', current: '5000' }],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.gridDeliveryState.currentLiveDelivery).toBe('limited');
    expect(state.gridDeliveryState.currentLiveLimit).toBe(5000);
    expect(state.gridDeliveryState.pendingDeliveryTarget).toBeNull();
    expect(state.gridDeliveryState.pendingLimitTarget).toBe(3000);
  });

  it('handles window where live says limited but pending is changing to on', async () => {
    mockStoreState.gridMode = 'Omezeno';
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          grid_delivery_step: 'mode',
          params: { mode: 'on', _grid_delivery_step: 'mode' },
          targets: [{ param: 'mode', value: 'Zapnuto', entity_id: 'sensor.invertor_prms_to_grid', from: 'Omezeno', to: 'Zapnuto', current: 'Omezeno' }],
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.gridDeliveryState.currentLiveDelivery).toBe('limited');
    expect(state.gridDeliveryState.pendingDeliveryTarget).toBe('on');
    expect(state.currentGridDelivery).toBe('limited');
  });

  it('isUnavailable is true when sensor reports unavailable', async () => {
    mockStoreState.gridMode = 'unavailable';
    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.gridDeliveryState.isUnavailable).toBe(true);
    expect(state.gridDeliveryState.currentLiveDelivery).toBe('unknown');
  });
});

describe('ShieldController malformed activity attrs handling', () => {
  beforeEach(() => {
    mockStoreState.activityAttrs = {};
    mockStoreState.status = 'idle';
    mockStoreState.queueCount = 0;
    mockStoreState.boxMode = 'Home 1';
    mockStoreState.gridMode = 'Omezeno';
    mockStoreState.gridLimit = 5400;
    mockStoreState.boilerMode = 'CBB';
    mockStoreState.useGridSuffixSensors = false;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('handles missing running_requests gracefully', async () => {
    mockStoreState.activityAttrs = { queued_requests: [] };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    expect(() => controller.refresh()).not.toThrow();
    expect(controller.getState().allRequests).toHaveLength(0);
  });

  it('handles missing queued_requests gracefully', async () => {
    mockStoreState.activityAttrs = { running_requests: [] };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    expect(() => controller.refresh()).not.toThrow();
    expect(controller.getState().allRequests).toHaveLength(0);
  });

  it('handles null activity attrs gracefully', async () => {
    mockStoreState.activityAttrs = null as any;

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    expect(() => controller.refresh()).not.toThrow();
    expect(controller.getState().allRequests).toHaveLength(0);
  });

  it('handles malformed request objects gracefully', async () => {
    mockStoreState.activityAttrs = {
      running_requests: [
        null,
        undefined,
        { service: null, changes: 'not-an-array' },
        { service: 'set_grid_delivery', changes: [null, undefined, 123] },
      ],
      queued_requests: [
        { service: undefined, params: null },
      ],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();

    expect(() => controller.refresh()).not.toThrow();
    const state = controller.getState();
    expect(state.allRequests.length).toBeGreaterThan(0);
    expect(state.pendingServices.has('grid_mode')).toBe(true);
  });

  it('handles requests with missing service field', async () => {
    mockStoreState.activityAttrs = {
      running_requests: [
        { changes: ["box_prms_mode: 'Home 1' → 'Home 2'"], started_at: '2026-04-09T12:00:00Z' },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.allRequests[0]?.service).toBe('');
    expect(state.allRequests[0]?.type).toBe('mode_change');
  });

  it('handles requests with non-string changes array elements', async () => {
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_box_mode',
          changes: [123, null, undefined, true, "box_prms_mode: 'Home 1' → 'Home 2'"],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.allRequests[0]?.changes).toContain("box_prms_mode: 'Home 1' → 'Home 2'");
    expect(state.pendingServices.has('box_mode')).toBe(true);
  });

  it('handles grid_delivery request without params or targets', async () => {
    mockStoreState.activityAttrs = {
      running_requests: [
        {
          service: 'set_grid_delivery',
          changes: [],
          started_at: '2026-04-09T12:00:00Z',
        },
      ],
      queued_requests: [],
    };

    const { ShieldController } = await import('@/data/shield-controller');
    const controller = new ShieldController();
    controller.refresh();

    const state = controller.getState();
    expect(state.allRequests[0]?.service).toBe('set_grid_delivery');
  });
});
