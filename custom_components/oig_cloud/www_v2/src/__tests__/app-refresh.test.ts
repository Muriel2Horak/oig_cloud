import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/data/pricing-data', () => ({
  invalidateTimelineCache: vi.fn(),
  loadPricingData: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/data/analytics-data', () => ({
  loadAnalyticsData: vi.fn().mockResolvedValue({
    efficiency: null,
    health: null,
    balancing: null,
    costComparison: null,
  }),
  extractAnalyticsSensors: vi.fn().mockReturnValue({
    efficiency: null,
    health: null,
    balancing: null,
  }),
  EMPTY_ANALYTICS: {
    efficiency: null,
    health: null,
    balancing: null,
    costComparison: null,
  },
}));

vi.mock('@/data/boiler-data', () => ({
  loadBoilerData: vi.fn().mockResolvedValue({
    state: null,
    plan: null,
    energyBreakdown: null,
    predictedUsage: null,
    config: null,
    heatmap7x24: [],
    profiling: null,
    currentCategory: '',
    availableCategories: [],
    forecastWindows: { fve: '--', grid: '--' },
  }),
}));

vi.mock('@/data/chmu-data', () => ({
  extractChmuData: vi.fn().mockReturnValue({
    effectiveSeverity: 0,
    warningsCount: 0,
  }),
  EMPTY_CHMU_DATA: {
    effectiveSeverity: 0,
    warningsCount: 0,
  },
}));

vi.mock('@/data/timeline-data', () => ({
  loadTimelineTab: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/data/tiles-data', () => ({
  loadTilesConfig: vi.fn().mockResolvedValue({
    tiles_left: [],
    tiles_right: [],
  }),
  saveTilesConfig: vi.fn(),
  resolveTiles: vi.fn().mockReturnValue({
    left: [],
    right: [],
  }),
}));

vi.mock('@/data/shield-controller', () => ({
  shieldController: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('@/data/ha-client', () => ({
  haClient: {
    getHass: vi.fn().mockResolvedValue(null),
    getHassSync: vi.fn().mockReturnValue(null),
    refreshHass: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/ui/components/header', () => ({}));
vi.mock('@/ui/components/theme-provider', () => ({}));
vi.mock('@/ui/layout/tabs', () => ({}));
vi.mock('@/ui/layout/grid', () => ({}));
vi.mock('@/ui/features/flow', () => ({}));
vi.mock('@/ui/features/flow/grid-charging-dialog', () => ({}));
vi.mock('@/ui/features/pricing', () => ({}));
vi.mock('@/ui/features/boiler', () => ({}));
vi.mock('@/ui/features/control-panel', () => ({}));
vi.mock('@/ui/features/analytics', () => ({}));
vi.mock('@/ui/features/chmu', () => ({}));
vi.mock('@/ui/features/timeline', () => ({}));
vi.mock('@/ui/features/tiles', () => ({}));
vi.mock('@/ui/features/tiles/icon-picker', () => ({}));
vi.mock('@/ui/features/tiles/tile-dialog', () => ({}));

import { invalidateTimelineCache } from '@/data/pricing-data';
import { haClient } from '@/data/ha-client';
import { stateWatcher } from '@/data/state-watcher';
import { OigApp } from '@/ui/app';

describe('OigApp live refresh', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('prefers entity store values over stale hass snapshot for flow data', () => {
    const app = new OigApp() as any;
    app.hass = {
      states: {
        'sensor.oig_2206237016_actual_aco_p': { state: '1200' },
      },
    };
    app.entityStore = {
      getAll: () => ({
        'sensor.oig_2206237016_actual_aco_p': { state: '790' },
      }),
    };

    app.updateFlowData();

    expect(app.flowData.housePower).toBe(790);
  });

  it('syncs hass state changes into the local snapshot', () => {
    const app = new OigApp() as any;
    app.hass = {};

    app.syncHassState('sensor.oig_2206237016_actual_aco_p', { state: '790' });
    expect(app.hass.states['sensor.oig_2206237016_actual_aco_p']).toEqual({ state: '790' });

    app.syncHassState('sensor.oig_2206237016_actual_aco_p', null);
    expect(app.hass.states['sensor.oig_2206237016_actual_aco_p']).toBeUndefined();
  });

  it('marks derived pricing data dirty and refreshes active pricing tab', () => {
    const app = new OigApp() as any;
    app.activeTab = 'pricing';
    app.timelineTab = 'today';

    const pricingSpy = vi.spyOn(app, 'loadPricingData').mockResolvedValue(undefined);
    const timelineSpy = vi.spyOn(app, 'loadTimelineTabData').mockResolvedValue(undefined);
    const analyticsSpy = vi.spyOn(app, 'loadAnalyticsAsync').mockResolvedValue(undefined);
    const boilerSpy = vi.spyOn(app, 'loadBoilerDataAsync').mockResolvedValue(undefined);

    app.refreshDerivedData();

    expect(app.pricingDirty).toBe(true);
    expect(app.timelineDirty).toBe(true);
    expect(app.analyticsDirty).toBe(true);
    expect(app.boilerDirty).toBe(true);
    expect(invalidateTimelineCache).toHaveBeenCalled();
    expect(pricingSpy).toHaveBeenCalledTimes(1);
    expect(timelineSpy).toHaveBeenCalledWith('today');
    expect(analyticsSpy).toHaveBeenCalledTimes(1);
    expect(boilerSpy).not.toHaveBeenCalled();
  });

  it('reloads dirty pricing data when pricing tab becomes active', () => {
    const app = new OigApp() as any;
    app.activeTab = 'pricing';
    app.pricingDirty = true;
    app.analyticsDirty = true;
    app.timelineDirty = true;
    app.boilerDirty = false;
    app.pricingData = { existing: true };
    app.timelineData = { existing: true };
    app.analyticsData = { existing: true };

    const pricingSpy = vi.spyOn(app, 'loadPricingData').mockResolvedValue(undefined);
    const timelineSpy = vi.spyOn(app, 'loadTimelineTabData').mockResolvedValue(undefined);
    const analyticsSpy = vi.spyOn(app, 'loadAnalyticsAsync').mockResolvedValue(undefined);

    app.updated(new Map([['activeTab', 'flow']]) as any);

    expect(pricingSpy).toHaveBeenCalledTimes(1);
    expect(timelineSpy).toHaveBeenCalledWith('today');
    expect(analyticsSpy).toHaveBeenCalledTimes(1);
  });

  it('rebinds entity store when hass context is refreshed', async () => {
    const app = new OigApp() as any;
    const nextHass = {
      states: {
        'sensor.oig_2206237016_actual_aco_p': { state: '805', last_updated: '2026-04-03T13:40:00Z' },
      },
      connection: {
        subscribeEvents: vi.fn().mockResolvedValue(() => {}),
      },
    };

    const entityStore = {
      updateHass: vi.fn(),
      getAll: () => nextHass.states,
    };

    const watcherSpy = vi.spyOn(stateWatcher, 'start').mockResolvedValue(undefined);

    app.entityStore = entityStore;
    app.hass = { states: {} };
    vi.mocked(haClient.refreshHass).mockResolvedValue(nextHass as any);

    await app.rebindHassContext();

    expect(haClient.refreshHass).toHaveBeenCalledTimes(1);
    expect(entityStore.updateHass).toHaveBeenCalledWith(nextHass);
    expect(watcherSpy).toHaveBeenCalledTimes(1);
    expect(app.flowData.housePower).toBe(805);
  });

  it('refreshes hass context when page becomes visible again', () => {
    const app = new OigApp() as any;
    const rebindSpy = vi.spyOn(app, 'rebindHassContext').mockResolvedValue(undefined);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    app.onDocumentVisibilityChange();

    expect(rebindSpy).toHaveBeenCalledTimes(1);
  });

  it('resubscribes state watcher when HA connection changes', async () => {
    const firstConnection = {
      subscribeEvents: vi.fn().mockResolvedValue(() => {}),
    };
    const secondConnection = {
      subscribeEvents: vi.fn().mockResolvedValue(() => {}),
    };

    await stateWatcher.start({
      getHass: () => ({ connection: firstConnection, states: {} }) as any,
      prefixes: ['sensor.oig_2206237016_'],
    });

    await stateWatcher.start({
      getHass: () => ({ connection: secondConnection, states: {} }) as any,
      prefixes: ['sensor.oig_2206237016_'],
    });

    expect(firstConnection.subscribeEvents).toHaveBeenCalledTimes(1);
    expect(secondConnection.subscribeEvents).toHaveBeenCalledTimes(1);

    stateWatcher.stop();
  });

  it('removes stale entities when entity store refreshes from new hass snapshot', async () => {
    const { EntityStore } = await import('@/data/entity-store');
    const store = new EntityStore({
      states: {
        'sensor.oig_2206237016_actual_aco_p': { state: '790', last_updated: '2026-04-03T13:40:00Z', attributes: {}, entity_id: 'sensor.oig_2206237016_actual_aco_p', last_changed: '2026-04-03T13:40:00Z' },
        'sensor.oig_2206237016_actual_fv_total': { state: '1500', last_updated: '2026-04-03T13:40:00Z', attributes: {}, entity_id: 'sensor.oig_2206237016_actual_fv_total', last_changed: '2026-04-03T13:40:00Z' },
      },
    });

    store.updateHass({
      states: {
        'sensor.oig_2206237016_actual_aco_p': { state: '805', last_updated: '2026-04-03T13:41:00Z', attributes: {}, entity_id: 'sensor.oig_2206237016_actual_aco_p', last_changed: '2026-04-03T13:41:00Z' },
      },
    });

    expect(store.get('sensor.oig_2206237016_actual_aco_p')?.state).toBe('805');
    expect(store.get('sensor.oig_2206237016_actual_fv_total')).toBeNull();

    store.destroy();
  });
});
