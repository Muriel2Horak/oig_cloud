// src/__tests__/boiler-simulator-bootstrap.test.ts
//
// Two live defects fixed together (boiler-override-sim-unit, Task B):
//   1. No dispatcher of 'oig-simulator-open' existed from the boiler tab.
//   2. Mounting <oig-simulator> in app.ts never passed .bootstrapPayload —
//      the prop exists on the component but nothing set it.
//
// This is an INTEGRATION test, not a unit test of the dispatcher or of
// onSimulatorOpen alone: it clicks the real button rendered by app.ts's
// boiler tab, lets the real CustomEvent bubble through the real DOM to the
// real onSimulatorOpen listener, and then asserts the mounted <oig-simulator>
// actually received a non-null bootstrapPayload built from live boiler
// state. A unit test on either half would miss a wiring gap between them —
// exactly the class of bug this unit was briefed to close.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { BoilerConfig, BoilerV2Data } from '@/ui/features/boiler/types';

const fetchOIGAPI = vi.hoisted(() =>
  vi.fn<[path: string, options?: RequestInit], Promise<unknown>>().mockResolvedValue(null),
);
const fetchOIGAPITyped = vi.hoisted(() =>
  vi.fn<[path: string, options?: RequestInit], Promise<any>>().mockResolvedValue({
    ok: true,
    status: 200,
    data: null,
  }),
);

vi.mock('@/data/ha-client', () => ({
  haClient: {
    getHass: vi.fn(() => new Promise(() => undefined)),
    getHassSync: vi.fn().mockReturnValue(null),
    refreshHass: vi.fn().mockResolvedValue(null),
    fetchOIGAPI,
    fetchOIGAPITyped,
  },
}));

vi.mock('@/data/state-watcher', () => ({
  stateWatcher: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    onEntityChange: vi.fn().mockReturnValue(vi.fn()),
  },
}));

vi.mock('@/data/shield-controller', () => ({
  shieldController: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('@/data/settings-data', () => ({
  loadModuleConfig: vi.fn().mockResolvedValue({
    modules: {},
    battery: {},
    solar: {},
    boiler: {},
    pricing: {},
  }),
  saveModuleConfig: vi.fn().mockResolvedValue({ ok: true }),
  waitForModuleConfigAfterReload: vi.fn((onSuccess: (cfg: unknown) => void) => onSuccess({})),
}));

vi.mock('@/data/registry-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/registry-data')>();
  return {
    ...actual,
    loadFieldRegistry: vi.fn().mockResolvedValue(null),
  };
});

// Everything below is irrelevant to this seam — mocked out to keep the
// fixture cheap, same approach as simulator-mount.test.ts. We deliberately
// do NOT mock '@/ui/components/oig-simulator': the whole point is to observe
// the REAL component mounted with the real prop, not a stand-in.
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
vi.mock('@/ui/features/weather', () => ({}));
vi.mock('@/ui/features/timeline', () => ({}));
vi.mock('@/ui/features/tiles', () => ({}));
vi.mock('@/ui/features/tiles/icon-picker', () => ({}));
vi.mock('@/ui/features/tiles/tile-dialog', () => ({}));
vi.mock('@/ui/features/onboarding', () => ({}));
vi.mock('@/ui/features/onboarding/banner', () => ({}));

const BOILER_PRESETS_FIXTURE = [
  { id: 'workday', name: 'Pracovní den' },
  { id: 'weekend', name: 'Víkend' },
];
const BOILER_SIM_FIXTURE = {
  entry_id: 'entry1', box_id: 'SN123', preset: 'workday', inputs: {}, source: {},
  timeline: [
    {
      start: '2026-07-26T05:00:00+02:00', end: '2026-07-26T05:15:00+02:00',
      action: 'heat', source: 'fve', heating_kwh: 0.5, pv_kwh: 0.5, grid_kwh: 0,
      alt_kwh: 0, battery_kwh: 0, estimated_cost_czk: 0, predicted_top_temp_c: 58.2,
      purpose: 'comfort',
    },
  ],
  summary: { total_heating_kwh: 2.4, cost_czk: 5.6, pv_kwh: 1.2, grid_kwh: 1.2, alt_kwh: 0, battery_kwh: 0 },
};
function routeFetch(path: string, options?: RequestInit): Promise<any> {
  const method = (options as { method?: string } | undefined)?.method ?? 'GET';
  if (method === 'GET' && path.endsWith('/presets')) {
    return Promise.resolve({ ok: true, status: 200, data: BOILER_PRESETS_FIXTURE });
  }
  if (path.includes('simulate_water_day')) {
    return Promise.resolve({ ok: true, status: 200, data: BOILER_SIM_FIXTURE });
  }
  return Promise.resolve({ ok: true, status: 200, data: null });
}

import '@/ui/app';

interface TestApp extends HTMLElement {
  updateComplete: Promise<boolean>;
}

async function flush(el: HTMLElement & { updateComplete: Promise<boolean> }) {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

async function settle(app: TestApp) {
  for (let i = 0; i < 6; i += 1) await flush(app);
}

const BOILER_V2_FIXTURE: BoilerV2Data = {
  status: {
    currentState: 'idle',
    comfortSatisfied: null,
    comfortStatusCode: null,
    selectedSource: null,
    actuatedSource: null,
    temperatureTop: 58.2,
    temperatureBottom: 41.6,
    energyNeededKwh: null,
    heating: false,
    lastUpdate: null,
    degraded: false,
    degradedFlags: [],
  },
  planSlots: [],
  explanation: null,
  manualOverride: null,
  identity: { entryId: 'entry1', boxId: 'SN123', available: true },
  activity: null,
  sourceSegments: [],
  timeline: [],
  sparkline: null,
  demandMap: null,
  drawMap: null,
  circulationRuns: [],
  legionella: null,
  planSummary: null,
  energyToday: null,
  loading: false,
  loadError: null,
  altSourceType: null,
};

const BOILER_CONFIG_FIXTURE: BoilerConfig = {
  volumeL: 200,
  heaterPowerW: null,
  heaterPowerKw: null,
  targetTempC: null,
  deadlineTime: '06:00',
  stratificationMode: 'default',
  kCoefficient: '1',
  coldInletTempC: 11.5,
  auraMaxTempC: null,
};

describe('boiler tab -> simulator bootstrap payload (fe/author: dispatcher + payload wiring)', () => {
  let el: TestApp;

  beforeEach(async () => {
    // The boiler-tab button dispatches with an empty draft (per brief) — box
    // id resolution falls back to the URL's ?sn=, same as production pages.
    window.history.pushState({}, '', '/?entry_id=entry1&sn=SN123');

    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    fetchOIGAPI.mockResolvedValue(null);
    fetchOIGAPITyped.mockImplementation(routeFetch);
    // <oig-simulator>'s own firstUpdated fires a real fetch() — stub it to a
    // harmless no-op, same as simulator-mount.test.ts.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }));

    el = await fixture<TestApp>(html`<oig-app></oig-app>`);
    (el as any).loading = false;
    (el as any).error = null;
    // Boiler tab content requires live v2 data/config — loadBoilerDataAsync
    // is gated on `this.hass`, which stays falsy in this harness (getHass
    // never resolves), so set the state it would have populated directly.
    (el as any).boilerV2Data = BOILER_V2_FIXTURE;
    (el as any).boilerConfig = BOILER_CONFIG_FIXTURE;
    await flush(el);
  });

  afterEach(() => {
    fixtureCleanup();
    vi.unstubAllGlobals();
  });

  it('renders the boiler-tab simulator button and no simulator is mounted yet', () => {
    const btn = el.shadowRoot!.querySelector('[data-testid="boiler-simulator-launch"]');
    expect(btn).toBeTruthy();
    expect(el.shadowRoot!.querySelector('oig-simulator')).toBeNull();
  });

  it('clicking the boiler-tab simulator button opens the overlay and the mounted <oig-simulator> receives the boiler bootstrap payload', async () => {
    const btn = el.shadowRoot!.querySelector('[data-testid="boiler-simulator-launch"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();

    btn.click();
    await settle(el);

    const sim = el.shadowRoot!.querySelector('oig-simulator') as HTMLElement & Record<string, any>;
    expect(sim).toBeTruthy();
    expect(sim.domain).toBe('boiler');

    // The full seam: event dispatched by the button -> bubbled to
    // onSimulatorOpen -> payload built from boilerV2Data/boilerConfig ->
    // reached the child component's actual property (not just app.ts state).
    expect(sim.bootstrapPayload).not.toBeNull();
    expect(sim.bootstrapPayload).toEqual({
      top_temp_c: 58.2,
      bottom_temp_c: 41.6,
      cold_inlet_c: 11.5,
    });
    // No source loaded into app.ts state for these — must stay unset, not
    // fabricated from volumeL or any other proxy.
    expect(sim.bootstrapPayload.capacity_kwh).toBeUndefined();
    expect(sim.bootstrapPayload.hw_min_soc_percent).toBeUndefined();
  });

  it('opening the simulator from a non-boiler domain leaves bootstrapPayload null', async () => {
    // Same shell seam, different domain — dispatched directly since no
    // battery-tab trigger is in scope for this unit; still exercises the
    // real onSimulatorOpen listener via a genuine bubbling event.
    const themeProvider = el.shadowRoot!.querySelector('oig-theme-provider') as HTMLElement;
    expect(themeProvider).toBeTruthy();
    themeProvider.dispatchEvent(new CustomEvent('oig-simulator-open', {
      bubbles: true,
      composed: true,
      detail: { domain: 'battery', draft: {} },
    }));
    await settle(el);

    const sim = el.shadowRoot!.querySelector('oig-simulator') as HTMLElement & Record<string, any>;
    expect(sim).toBeTruthy();
    expect(sim.domain).toBe('battery');
    expect(sim.bootstrapPayload).toBeNull();
  });
});
