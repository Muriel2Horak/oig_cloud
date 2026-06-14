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
    v2Data: null,
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
import { getSensorId } from '@/data/flow-data';
import { OigApp } from '@/ui/app';

function flattenTemplate(tmpl: unknown): string {
  if (tmpl == null || tmpl === false) return '';
  if (typeof tmpl === 'string') return tmpl;
  if (typeof tmpl !== 'object') return '';
  const t = tmpl as Record<string, unknown>;
  const strs = t['strings']
    ? Array.from(t['strings'] as ArrayLike<string>).join('')
    : '';
  const vals = t['values']
    ? Array.from(t['values'] as Iterable<unknown>).map(v => flattenTemplate(v)).join('')
    : '';
  return strs + vals;
}

function getAppTemplateAll(app: OigApp): string {
  const result = Reflect.apply(
    Reflect.get(Object.getPrototypeOf(app), 'render'),
    app,
    [],
  );
  return flattenTemplate(result);
}

describe('OigApp live refresh', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('prefers entity store values over stale hass snapshot for flow data', () => {
    const housePowerKey = getSensorId('actual_aco_p');
    const app = new OigApp() as any;
    app.hass = {
      states: {
        [housePowerKey]: { state: '1200' },
      },
    };
    app.entityStore = {
      getAll: () => ({
        [housePowerKey]: { state: '790' },
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
    const housePowerKey = getSensorId('actual_aco_p');
    const app = new OigApp() as any;
    const nextHass = {
      states: {
        [housePowerKey]: { state: '805', last_updated: '2026-04-03T13:40:00Z' },
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

describe('OigApp V2 boiler tab — no legacy tags, setup guide present', () => {
  function makeApp(): OigApp {
    const app = new OigApp() as any;
    app.loading = false;
    app.error = null;
    return app as OigApp;
  }

  function makeAppWithStatus(): OigApp {
    const app = new OigApp() as any;
    app.loading = false;
    app.error = null;
    app.boilerV2Data = {
      status: {
        currentState: 'heating',
        heating: true,
        selectedSource: 'fve',
        actuatedSource: 'fve',
        temperatureTop: 55.0,
        temperatureBottom: null,
        comfortSatisfied: true,
        comfortStatusCode: 'ok',
        energyNeededKwh: 1.0,
        lastUpdate: null,
        degraded: false,
        degradedFlags: [],
      },
      planSlots: [],
      explanation: null,
      manualOverride: null,
      identity: { entryId: 'entry1', boxId: 'box1', available: true },
      activity: null,
      sourceSegments: [],
      timeline: [],
      sparkline: null,
      loading: false,
      loadError: null,
    };
    return app as OigApp;
  }

  function makeAppWithConfigProfileUnavailable(): OigApp {
    const app = new OigApp() as any;
    app.loading = false;
    app.error = null;
    app.boilerV2Data = {
      status: null,
      planSlots: [],
      explanation: {
        reasonCodes: [],
        planCreatedAt: null,
        planValidUntil: null,
        dataAgeSecs: null,
        degradedReasons: ['config_profile_unavailable'],
        unsatisfiedComfortGapC: null,
        temperatureAtDeadlineC: null,
      },
      manualOverride: null,
      identity: { entryId: 'entry1', boxId: 'box1', available: true },
      activity: null,
      sourceSegments: [],
      timeline: [],
      sparkline: null,
      loading: false,
      loadError: null,
    };
    return app as OigApp;
  }

  it('boiler tab template does NOT contain oig-boiler-state', () => {
    const all = getAppTemplateAll(makeApp());
    expect(all).not.toContain('<oig-boiler-state');
  });

  it('boiler tab template does NOT contain oig-boiler-status-grid', () => {
    const all = getAppTemplateAll(makeApp());
    expect(all).not.toContain('<oig-boiler-status-grid');
  });

  it('boiler tab template does NOT contain boiler-visual-grid class', () => {
    const all = getAppTemplateAll(makeApp());
    expect(all).not.toContain('boiler-visual-grid');
  });

  it('boiler tab template does NOT contain oig-boiler-tank', () => {
    const all = getAppTemplateAll(makeApp());
    expect(all).not.toContain('<oig-boiler-tank');
  });

  it('boiler tab template does NOT contain oig-boiler-heatmap-grid', () => {
    const all = getAppTemplateAll(makeApp());
    expect(all).not.toContain('<oig-boiler-heatmap-grid');
  });

  it('boiler tab template does NOT contain oig-boiler-stats-cards', () => {
    const all = getAppTemplateAll(makeApp());
    expect(all).not.toContain('<oig-boiler-stats-cards');
  });

  it('boiler tab template does NOT contain oig-boiler-config-section', () => {
    const all = getAppTemplateAll(makeApp());
    expect(all).not.toContain('<oig-boiler-config-section');
  });

  it('boiler tab keeps setup guide inside the collapsed controls section', () => {
    const all = getAppTemplateAll(makeAppWithStatus());
    expect(all).toContain('data-testid="boiler-setup-guide"');
    expect(all).toContain('Průvodce nastavením bojleru');
  });

  it('boiler tab template contains the redesigned model + draw-map when v2 data available', () => {
    const all = getAppTemplateAll(makeAppWithStatus());
    expect(all).toContain('oig-boiler-model');
    expect(all).toContain('oig-boiler-draw-map');
  });

  it('boiler tab template contains the SoC chart and plan sections', () => {
    const all = getAppTemplateAll(makeAppWithStatus());
    expect(all).toContain('oig-boiler-soc-chart');
    expect(all).toContain('oig-boiler-plan');
  });

  it('boiler tab template contains the slim strip', () => {
    const all = getAppTemplateAll(makeAppWithStatus());
    expect(all).toContain('boiler-slim');
  });

  it('boiler tab template does NOT contain oig-boiler-timeline-chart (removed in Task 3)', () => {
    const all = getAppTemplateAll(makeAppWithStatus());
    expect(all).not.toContain('oig-boiler-timeline-chart');
  });

  it('boiler tab template does NOT contain oig-boiler-status-panel', () => {
    const all = getAppTemplateAll(makeAppWithStatus());
    expect(all).not.toContain('oig-boiler-status-panel');
  });

  it('boiler tab template does NOT contain oig-boiler-plan-timeline', () => {
    const all = getAppTemplateAll(makeApp());
    expect(all).not.toContain('oig-boiler-plan-timeline');
  });

  it('boiler tab template does NOT contain oig-boiler-source-explanation', () => {
    const all = getAppTemplateAll(makeApp());
    expect(all).not.toContain('oig-boiler-source-explanation');
  });

  it('boiler tab keeps the manual override panel inside the collapsed controls section', () => {
    const all = getAppTemplateAll(makeAppWithStatus());
    expect(all).toContain('<oig-boiler-override-panel');
  });

  it('boiler tab template does NOT contain oig-boiler-energy-today (removed in Task 3)', () => {
    const all = getAppTemplateAll(makeAppWithStatus());
    expect(all).not.toContain('oig-boiler-energy-today');
  });

  it('boiler tab renders the collapsed Ovládání a nastavení controls section', () => {
    const all = getAppTemplateAll(makeAppWithStatus());
    expect(all).toContain('boiler-controls-section');
    expect(all).toContain('Ovládání a nastavení');
  });

  it('boiler tab template does NOT contain data-testid="boiler-advanced-row" (removed per mockup)', () => {
    const all = getAppTemplateAll(makeAppWithStatus());
    expect(all).not.toContain('data-testid="boiler-advanced-row"');
  });

  it('config_profile_unavailable alone does not block model render', () => {
    const all = getAppTemplateAll(makeAppWithConfigProfileUnavailable());
    expect(all).toContain('oig-boiler-model');
    expect(all).not.toContain('reason="degraded"');
  });

  it('mounted: boiler tab does NOT contain oig-boiler-timeline-chart (removed in Task 3)', async () => {
    const app = makeAppWithStatus() as any;
    app.activeTab = 'boiler';
    document.body.appendChild(app);
    await app.updateComplete;
    const timeline = app.shadowRoot!.querySelector('oig-boiler-timeline-chart');
    expect(timeline).toBeNull();
    document.body.removeChild(app);
  });

  it('malformed V2 data does not throw from template render and does not use errorCode or code props', () => {
    const app = new OigApp() as any;
    app.loading = false;
    app.error = null;
    app.boilerV2Data = { status: null, planSlots: null, explanation: null, manualOverride: null, identity: null, activity: null, sourceSegments: null, timeline: null, sparkline: null, loading: false, loadError: null };
    expect(() => getAppTemplateAll(app as OigApp)).not.toThrow();
    const all = getAppTemplateAll(app as OigApp);
    expect(all).not.toContain('errorCode');
    expect(all).not.toContain('.code=');
  });
});

import { resolveLang } from '@/i18n/boiler';

describe('app boiler lang wiring', () => {
  it('resolves cs from hass.locale', () => {
    expect(resolveLang({ locale: { language: 'cs' } } as any)).toBe('cs');
  });
  it('renders status panel with lang attribute when hass language is en', () => {
    const app = new OigApp() as any;
    app.loading = false;
    app.error = null;
    app.hass = { locale: { language: 'en' } };
    const all = getAppTemplateAll(app as OigApp);
    expect(all).toContain('.lang=');
  });
});
