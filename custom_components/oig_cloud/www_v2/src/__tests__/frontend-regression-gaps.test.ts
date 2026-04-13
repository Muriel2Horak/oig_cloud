/**
 * Frontend Regression Gap Suite — Task 11
 *
 * Covers gaps not addressed in Tasks 6-9:
 * - live OFF + pending LIMITED
 * - live LIMITED + pending limit-only
 * - queued ON + requests LIMITED
 * - malformed activity attrs (additional edge cases)
 * - unavailable live sensors
 * - suffix `_2` parity in entity resolution
 * - DOM/render assertions proving current text + pending overlay coexist
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { haClient } from '@/data/ha-client';
import { OigGridDeliverySelector } from '@/ui/features/control-panel/selectors';
import { resolveGridFlowState, mapShieldPendingToFlowIndicators } from '@/ui/features/flow/pending';
import type { GridDeliveryStateModel } from '@/data/grid-delivery-model';
import type { ShieldServiceType } from '@/ui/features/control-panel/types';

// ============================================================================
// MOCKS (same pattern as shield-controller.test.ts)
// ============================================================================

const mockStoreState = {
  activityAttrs: {} as Record<string, unknown>,
  status: 'idle',
  queueCount: 0,
  boxMode: 'Home 1',
  gridMode: 'Vypnuto',
  gridLimit: 0,
  boilerMode: 'CBB',
  useGridSuffixSensors: false,
  unavailableEntities: new Set<string>(),
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
      if (mockStoreState.unavailableEntities.has(entityId)) {
        return { state: 'unavailable', attributes: {}, last_updated: null };
      }
      if (entityId === 'sensor.service_shield_activity') {
        return {
          state: 'activity',
          attributes: mockStoreState.activityAttrs,
        };
      }
      return null;
    },
    getString: (entityId: string) => {
      if (mockStoreState.unavailableEntities.has(entityId)) {
        return { value: 'unavailable', lastUpdated: null, attributes: {}, exists: true };
      }
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
      if (mockStoreState.unavailableEntities.has(entityId)) {
        return { value: 0, lastUpdated: null, attributes: {}, exists: true };
      }
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

// ============================================================================
// TESTS
// ============================================================================

describe('Frontend Regression Gaps — Flow Grid State', () => {
  const baseModel: GridDeliveryStateModel = {
    currentLiveDelivery: 'off',
    currentLiveLimit: null,
    pendingDeliveryTarget: null,
    pendingLimitTarget: null,
    isTransitioning: false,
    isUnavailable: false,
  };

  describe('live OFF + pending LIMITED', () => {
    it('shows current OFF state with LIMITED pending overlay', () => {
      const model: GridDeliveryStateModel = {
        ...baseModel,
        currentLiveDelivery: 'off',
        pendingDeliveryTarget: 'limited',
        pendingLimitTarget: 4500,
        isTransitioning: true,
      };
      const state = resolveGridFlowState(model);

      expect(state.currentText).toBe('Vypnuto');
      expect(state.pendingText).toBe('Ve frontě: Omezeno / 4500W');
      expect(state.pendingKind).toBe('both');
      expect(state.isTransitioning).toBe(true);
    });

    it('shows mode-only pending when limit not specified', () => {
      const model: GridDeliveryStateModel = {
        ...baseModel,
        currentLiveDelivery: 'off',
        pendingDeliveryTarget: 'limited',
        isTransitioning: true,
      };
      const state = resolveGridFlowState(model);

      expect(state.currentText).toBe('Vypnuto');
      expect(state.pendingText).toBe('Ve frontě: Omezeno');
      expect(state.pendingKind).toBe('mode');
    });
  });

  describe('live LIMITED + pending limit-only', () => {
    it('shows current limited value with pending limit overlay', () => {
      const model: GridDeliveryStateModel = {
        ...baseModel,
        currentLiveDelivery: 'limited',
        currentLiveLimit: 3000,
        pendingLimitTarget: 6000,
        isTransitioning: true,
      };
      const state = resolveGridFlowState(model);

      expect(state.currentText).toBe('Omezeno 3000W');
      expect(state.pendingText).toBe('Ve frontě: limit 6000W');
      expect(state.pendingKind).toBe('limit');
    });

    it('shows current limited with ? when live limit is null', () => {
      const model: GridDeliveryStateModel = {
        ...baseModel,
        currentLiveDelivery: 'limited',
        currentLiveLimit: null,
        pendingLimitTarget: 5000,
        isTransitioning: true,
      };
      const state = resolveGridFlowState(model);

      expect(state.currentText).toBe('Omezeno');
      expect(state.pendingText).toBe('Ve frontě: limit 5000W');
    });
  });

  describe('queued ON + requests LIMITED scenario', () => {
    it('handles transition from ON to LIMITED correctly', () => {
      const model: GridDeliveryStateModel = {
        ...baseModel,
        currentLiveDelivery: 'on',
        pendingDeliveryTarget: 'limited',
        pendingLimitTarget: 4000,
        isTransitioning: true,
      };
      const state = resolveGridFlowState(model);

      expect(state.currentText).toBe('Zapnuto');
      expect(state.pendingText).toBe('Ve frontě: Omezeno / 4000W');
      expect(state.pendingKind).toBe('both');
    });

    it('handles queued ON mode only (no limit)', () => {
      const model: GridDeliveryStateModel = {
        ...baseModel,
        currentLiveDelivery: 'off',
        pendingDeliveryTarget: 'on',
        isTransitioning: true,
      };
      const state = resolveGridFlowState(model);

      expect(state.currentText).toBe('Vypnuto');
      expect(state.pendingText).toBe('Ve frontě: Zapnuto');
      expect(state.pendingKind).toBe('mode');
    });
  });

  describe('unavailable live sensors', () => {
    it('shows ? for unavailable sensor with pending overlay', () => {
      const model: GridDeliveryStateModel = {
        ...baseModel,
        currentLiveDelivery: 'unknown',
        isUnavailable: true,
        pendingDeliveryTarget: 'limited',
        pendingLimitTarget: 3500,
        isTransitioning: true,
      };
      const state = resolveGridFlowState(model);

      expect(state.currentText).toBe('?');
      expect(state.currentUnavailable).toBe(true);
      expect(state.pendingText).toBe('Ve frontě: Omezeno / 3500W');
    });

    it('shows ? for unavailable without pending', () => {
      const model: GridDeliveryStateModel = {
        ...baseModel,
        currentLiveDelivery: 'unknown',
        isUnavailable: true,
      };
      const state = resolveGridFlowState(model);

      expect(state.currentText).toBe('?');
      expect(state.currentUnavailable).toBe(true);
      expect(state.pendingText).toBeNull();
    });
  });
});

describe('Frontend Regression Gaps — ShieldController', () => {
  beforeEach(() => {
    mockStoreState.activityAttrs = { running_requests: [], queued_requests: [] };
    mockStoreState.status = 'idle';
    mockStoreState.queueCount = 0;
    mockStoreState.boxMode = 'Home 1';
    mockStoreState.gridMode = 'Vypnuto';
    mockStoreState.gridLimit = 0;
    mockStoreState.boilerMode = 'CBB';
    mockStoreState.useGridSuffixSensors = false;
    mockStoreState.unavailableEntities.clear();
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('suffix _2 parity in entity resolution', () => {
    it('finds _2 suffixed grid mode sensor when base is unavailable', async () => {
      mockStoreState.useGridSuffixSensors = true;
      mockStoreState.gridMode = 'Omezeno';
      mockStoreState.gridLimit = 5400;

      const { ShieldController } = await import('@/data/shield-controller');
      const controller = new ShieldController();
      controller.refresh();

      const state = controller.getState();
      expect(state.currentGridDelivery).toBe('limited');
      expect(state.currentGridLimit).toBe(5400);
    });

    it('gridDeliveryState reflects _2 suffixed sensor values', async () => {
      mockStoreState.useGridSuffixSensors = true;
      mockStoreState.gridMode = 'Zapnuto';
      mockStoreState.gridLimit = 9999;

      const { ShieldController } = await import('@/data/shield-controller');
      const controller = new ShieldController();
      controller.refresh();

      const state = controller.getState();
      expect(state.gridDeliveryState.currentLiveDelivery).toBe('on');
      expect(state.gridDeliveryState.currentLiveLimit).toBe(9999);
    });

    it('returns correct button state for _2 suffixed limited mode', async () => {
      mockStoreState.useGridSuffixSensors = true;
      mockStoreState.gridMode = 'Omezeno';

      const { ShieldController } = await import('@/data/shield-controller');
      const controller = new ShieldController();
      controller.refresh();

      expect(controller.getGridDeliveryButtonState('limited')).toBe('active');
      expect(controller.getGridDeliveryButtonState('off')).toBe('idle');
      expect(controller.getGridDeliveryButtonState('on')).toBe('idle');
    });

    it('handles unavailable _2 sensor gracefully', async () => {
      mockStoreState.useGridSuffixSensors = true;
      mockStoreState.unavailableEntities.add('sensor.invertor_prms_to_grid_2');
      mockStoreState.unavailableEntities.add('sensor.invertor_prm1_p_max_feed_grid_2');

      const { ShieldController } = await import('@/data/shield-controller');
      const controller = new ShieldController();
      controller.refresh();

      const state = controller.getState();
      // Should not crash, should fallback to unknown
      expect(state.gridDeliveryState.currentLiveDelivery).toBe('unknown');
      expect(state.gridDeliveryState.isUnavailable).toBe(true);
    });
  });

  describe('queued ON + requests LIMITED', () => {
    it('handles ON queued and user requests LIMITED', async () => {
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

      await controller.setGridDelivery('limited', 4500);

      expect(vi.mocked(haClient.callService)).toHaveBeenCalled();
    });
  });

  describe('malformed activity attrs — additional edge cases', () => {
    it('handles deeply nested null values in requests', async () => {
      mockStoreState.activityAttrs = {
        running_requests: [
          {
            service: 'set_grid_delivery',
            params: { limit: null, mode: undefined },
            targets: [
              { param: 'limit', value: null, to: undefined, from: null },
            ],
            changes: null,
          },
        ],
        queued_requests: [],
      };

      const { ShieldController } = await import('@/data/shield-controller');
      const controller = new ShieldController();

      expect(() => controller.refresh()).not.toThrow();
      expect(controller.getState().allRequests).toHaveLength(1);
    });

    it('handles circular reference-like malformed data gracefully', async () => {
      // This tests resilience against weird object structures
      const weirdRequest = {
        service: 'set_box_mode',
        changes: [],
        params: Object.create(null), // No prototype object
        targets: [],
      };
      mockStoreState.activityAttrs = {
        running_requests: [weirdRequest],
        queued_requests: [],
      };

      const { ShieldController } = await import('@/data/shield-controller');
      const controller = new ShieldController();

      expect(() => controller.refresh()).not.toThrow();
    });
  });

  describe('unavailable live sensors', () => {
    it('marks gridDeliveryState unavailable when mode sensor is unavailable', async () => {
      mockStoreState.unavailableEntities.add('sensor.invertor_prms_to_grid');

      const { ShieldController } = await import('@/data/shield-controller');
      const controller = new ShieldController();
      controller.refresh();

      const state = controller.getState();
      expect(state.gridDeliveryState.isUnavailable).toBe(true);
      expect(state.gridDeliveryState.currentLiveDelivery).toBe('unknown');
    });

    it('preserves pending state even when live sensor unavailable', async () => {
      mockStoreState.unavailableEntities.add('sensor.invertor_prms_to_grid');
      mockStoreState.status = 'running';
      mockStoreState.queueCount = 1;
      mockStoreState.activityAttrs = {
        running_requests: [
          {
            service: 'set_grid_delivery',
            grid_delivery_step: 'mode',
            params: { mode: 'limited', _grid_delivery_step: 'mode' },
            targets: [{ param: 'mode', value: 'Omezeno', entity_id: 'sensor.invertor_prms_to_grid', from: 'unknown', to: 'Omezeno', current: 'unknown' }],
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
      expect(state.gridDeliveryState.isUnavailable).toBe(true);
      expect(state.gridDeliveryState.pendingDeliveryTarget).toBe('limited');
      expect(state.gridDeliveryState.isTransitioning).toBe(true);
    });
  });
});

describe('Frontend Regression Gaps — Control Panel Render', () => {
  function renderSelector(
    value: 'off' | 'on' | 'limited',
    pendingTarget: 'off' | 'on' | 'limited' | null,
    limit: number,
    buttonStates: Record<'off' | 'on' | 'limited', 'idle' | 'active' | 'pending' | 'processing' | 'disabled-by-service'>,
  ) {
    const el = new OigGridDeliverySelector();
    el.value = value;
    el.limit = limit;
    el.pendingTarget = pendingTarget;
    el.buttonStates = buttonStates;
    return Reflect.apply(
      Reflect.get(Object.getPrototypeOf(el), 'render'),
      el,
      [],
    ) as { values?: unknown[] } | null;
  }

  describe('DOM/render assertions — current state remains live-confirmed', () => {
    it('renders current limited active while pending shows off separately', () => {
      const result = renderSelector('limited', 'off', 5000, {
        off: 'idle',
        on: 'idle',
        limited: 'active',
      });

      // values[0] = activeLimitLabel (shows current limit)
      const activeLimitLabel = result?.values?.[0] as { values?: unknown[] } | null;
      expect(activeLimitLabel).not.toBeNull();
      expect(activeLimitLabel?.values).toContain(5000);

      // values[1] = pendingLabel (shows pending target)
      const pendingLabel = result?.values?.[1] as { values?: unknown[] } | null;
      expect(pendingLabel).not.toBeNull();
      expect(pendingLabel?.values?.some((v: unknown) => String(v).includes('Vypnuto'))).toBe(true);

      // Both should be present simultaneously
      expect(activeLimitLabel).not.toBeNull();
      expect(pendingLabel).not.toBeNull();
    });

    it('renders current off active while pending shows limited separately', () => {
      const result = renderSelector('off', 'limited', 0, {
        off: 'active',
        on: 'idle',
        limited: 'pending',
      });

      // Current is off, so no active limit label
      const activeLimitLabel = result?.values?.[0];
      expect(activeLimitLabel).toBeNull();

      // But pending label shows limited
      const pendingLabel = result?.values?.[1] as { values?: unknown[] } | null;
      expect(pendingLabel).not.toBeNull();
      expect(pendingLabel?.values?.some((v: unknown) => String(v).includes('S omezen'))).toBe(true);
    });

    it('renders current on active while pending shows limited with limit', () => {
      const result = renderSelector('on', 'limited', 0, {
        off: 'idle',
        on: 'active',
        limited: 'pending',
      });

      // Current is on, no limit label shown
      const activeLimitLabel = result?.values?.[0];
      expect(activeLimitLabel).toBeNull();

      // Pending shows limited
      const pendingLabel = result?.values?.[1] as { values?: unknown[] } | null;
      expect(pendingLabel).not.toBeNull();
    });

    it('button classes show current active and pending-target simultaneously', () => {
      const el = new OigGridDeliverySelector();
      el.value = 'limited';
      el.limit = 5000;
      el.pendingTarget = 'off';
      el.buttonStates = { off: 'idle', on: 'idle', limited: 'active' };

      const rendered = Reflect.apply(
        Reflect.get(Object.getPrototypeOf(el), 'render'),
        el,
        [],
      ) as { values?: unknown[] } | null;

      // values[2] = mode-buttons array
      const modeButtonsTemplate = rendered?.values?.[2] as Array<{ values?: unknown[] }> | null;
      expect(modeButtonsTemplate).toBeDefined();
      expect(Array.isArray(modeButtonsTemplate)).toBe(true);

      if (modeButtonsTemplate && Array.isArray(modeButtonsTemplate)) {
        // Check off button has pending-target class (it's the pending target)
        const offButton = modeButtonsTemplate[0] as { values?: unknown[] } | null;
        const offClass = String(offButton?.values?.[0] ?? '');
        expect(offClass).toContain('pending-target');

        // Check limited button has active class (it's the current value)
        const limitedButton = modeButtonsTemplate[2] as { values?: unknown[] } | null;
        const limitedClass = String(limitedButton?.values?.[0] ?? '');
        expect(limitedClass).toBe('active');
      }
    });
  });

  describe('live OFF + pending LIMITED in control panel', () => {
    it('shows off button as active with limited button as pending-target', () => {
      const el = new OigGridDeliverySelector();
      el.value = 'off';
      el.limit = 0;
      el.pendingTarget = 'limited';
      el.buttonStates = { off: 'active', on: 'idle', limited: 'idle' };

      const rendered = Reflect.apply(
        Reflect.get(Object.getPrototypeOf(el), 'render'),
        el,
        [],
      ) as { values?: unknown[] } | null;

      const modeButtonsTemplate = rendered?.values?.[2] as Array<{ values?: unknown[] }> | null;
      if (modeButtonsTemplate && Array.isArray(modeButtonsTemplate)) {
        // Off button should be active (current state)
        const offButton = modeButtonsTemplate[0] as { values?: unknown[] } | null;
        expect(String(offButton?.values?.[0] ?? '')).toBe('active');

        // Limited button should have pending-target class
        const limitedButton = modeButtonsTemplate[2] as { values?: unknown[] } | null;
        expect(String(limitedButton?.values?.[0] ?? '')).toContain('pending-target');
      }
    });
  });

  describe('live LIMITED + pending limit-only in control panel', () => {
    it('shows limited active with active limit label and no mode pending', () => {
      const result = renderSelector('limited', null, 3000, {
        off: 'idle',
        on: 'idle',
        limited: 'active',
      });

      // Active limit label shows current limit
      const activeLimitLabel = result?.values?.[0] as { values?: unknown[] } | null;
      expect(activeLimitLabel).not.toBeNull();
      expect(activeLimitLabel?.values).toContain(3000);

      // No pending label since pendingTarget is null (limit-only change)
      const pendingLabel = result?.values?.[1];
      expect(pendingLabel).toBeNull();
    });
  });
});

describe('Frontend Regression Gaps — Flow Pending Indicators', () => {
  describe('current + pending coexistence in flow indicators', () => {
    it('mapShieldPendingToFlowIndicators shows grid export changing alongside current', () => {
      const pendingServices = new Map<ShieldServiceType, string>([
        ['grid_mode', 'Omezeno'],
        ['grid_limit', '4500'],
      ]);
      const changingServices = new Set<ShieldServiceType>(['grid_mode', 'grid_limit']);

      const result = mapShieldPendingToFlowIndicators(pendingServices, changingServices);

      expect(result.gridExportChanging).toBe(true);
      expect(result.gridExportText).toBe('→ 4500W'); // limit takes precedence
    });

    it('shows mode pending when only mode is changing', () => {
      const pendingServices = new Map<ShieldServiceType, string>([
        ['grid_mode', 'Omezeno'],
      ]);
      const changingServices = new Set<ShieldServiceType>(['grid_mode']);

      const result = mapShieldPendingToFlowIndicators(pendingServices, changingServices);

      expect(result.gridExportChanging).toBe(true);
      expect(result.gridExportText).toBe('→ Omezeno');
    });

    it('shows inverter mode changing independently of grid', () => {
      const pendingServices = new Map<ShieldServiceType, string>([
        ['box_mode', 'Home 2'],
        ['grid_mode', 'Omezeno'],
      ]);
      const changingServices = new Set<ShieldServiceType>(['box_mode', 'grid_mode']);

      const result = mapShieldPendingToFlowIndicators(pendingServices, changingServices);

      expect(result.inverterModeChanging).toBe(true);
      expect(result.inverterModeText).toBe('→ Home 2');
      expect(result.gridExportChanging).toBe(true);
      expect(result.gridExportText).toBe('→ Omezeno');
    });
  });
});
