// src/__tests__/simulator-mount.test.ts
//
// fe/fix: 'oig-simulator-open' (dispatched by the onboarding wizard's
// battery/boiler steps — features/onboarding/index.ts:2130,3133) was never
// wired to anything. grep showed zero listeners and zero <oig-simulator>
// mounts anywhere in the app; existing unit tests (onboarding-battery.test.ts,
// onboarding-boiler.test.ts) only assert the DISPATCH, never that anything
// opens. This proves the full seam: click the wizard's sim button -> the app
// shell mounts the overlay -> <oig-simulator> receives the right domain/draft.
// MUST fail on pre-fix app.ts (no listener => <oig-simulator> never appears)
// and pass after the fix.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';

// --- mocks mirrored from onboarding-mount.test.ts (same app surface) -------

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
const loadFieldRegistryMock = vi.hoisted(() =>
  vi.fn<[], Promise<FieldRegistry | null>>().mockResolvedValue(null),
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
    loadFieldRegistry: loadFieldRegistryMock,
  };
});

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
vi.mock('@/ui/features/onboarding/banner', () => ({}));
// We deliberately do NOT mock `@/ui/features/onboarding` — it registers the
// real `oig-onboarding-wizard`, the only current dispatcher of
// 'oig-simulator-open'. We also do NOT mock `@/ui/components/oig-simulator`
// — the whole point is to observe the REAL component mounted with the right
// props, not a stand-in.

// fe/fix: route the typed fetch by endpoint. The overlay's preset-list GET must
// resolve [{id,name}] (it maps them to chips), and the component's initial
// simulate POST must return a real BE shape. The previous flat {data:null}
// mock made fetchSimulatorPresets do null.map() -> throw, so the overlay showed
// its preset-error state and never mounted <oig-simulator> at all.
const BATTERY_PRESETS_FIXTURE = [
  { id: 'winter_high_price', name: 'Zima, draho' },
  { id: 'sunny_summer', name: 'Léto, slunečno' },
];
const BOILER_PRESETS_FIXTURE = [
  { id: 'workday', name: 'Pracovní den' },
  { id: 'weekend', name: 'Víkend' },
];
const BATTERY_SIM_FIXTURE = {
  preset: 'winter_high_price',
  horizon_intervals: 1,
  interval_minutes: 15,
  timeline: [
    {
      interval_index: 0, soc_kwh: 8.7, solar_kwh: 0, load_kwh: 0.2,
      grid_import_kwh: 0.2, grid_export_kwh: 0, cost_czk: 1.1, mode: 3,
      mode_name: 'HOME I', soc_percent: 50.0,
    },
  ],
  summary: { total_cost_czk: 1.1, mode_distribution: { 'HOME I': 1 } },
};
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
    return Promise.resolve({
      ok: true,
      status: 200,
      data: path.includes('simulate_water_day') ? BOILER_PRESETS_FIXTURE : BATTERY_PRESETS_FIXTURE,
    });
  }
  if (path.includes('simulate_water_day')) {
    return Promise.resolve({ ok: true, status: 200, data: BOILER_SIM_FIXTURE });
  }
  if (path.includes('planner_simulate')) {
    return Promise.resolve({ ok: true, status: 200, data: BATTERY_SIM_FIXTURE });
  }
  return Promise.resolve({ ok: true, status: 200, data: null });
}

import '@/ui/app';

interface TestApp extends HTMLElement {
  onboarding: unknown;
  onboardingWizardOpen: boolean;
  updateComplete: Promise<boolean>;
}

/** Wizard lives inside <oig-theme-provider> in the app's own shadow — same
 *  helper as onboarding-mount.test.ts. */
function getWizard(app: TestApp) {
  return app.shadowRoot!.querySelector('oig-onboarding-wizard') as
    | (HTMLElement & { updateComplete: Promise<boolean> } & Record<string, any>)
    | null;
}

function wizardRoot(wizard: HTMLElement): ShadowRoot {
  return wizard.shadowRoot as unknown as ShadowRoot;
}

async function flush(el: HTMLElement & { updateComplete: Promise<boolean> }) {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

/** The preset fetch -> mount -> initial-simulate chain is async across several
 *  Lit update cycles; a single flush only covers one. Pump enough cycles for
 *  onSimulatorOpen's await to settle and the component's firstUpdated POST to
 *  fire. */
async function settle(app: TestApp) {
  for (let i = 0; i < 6; i += 1) await flush(app);
}

/** Battery fields verbatim from onboarding-battery.test.ts's fixture, boiler
 *  fields verbatim from onboarding-boiler.test.ts's — merged into one
 *  registry so both wizard steps render their sim-trigger button. */
const REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['battery', 'boiler'],
  fields: {
    charge_rate_kw: {
      section: 'battery', type: 'float', scope: 'premium',
      label: 'field.charge_rate_kw.label', hint: 'field.charge_rate_kw.hint',
      min: 0.5, max: 10.0, step: 0.1,
    },
    battery_comfort_soc_percent: {
      section: 'battery', type: 'float', scope: 'premium',
      label: 'field.battery_comfort_soc_percent.label', hint: 'field.battery_comfort_soc_percent.hint',
      min: 0.0, max: 95.0, step: 5.0,
    },
    boiler_volume_l: {
      section: 'boiler', type: 'float', scope: 'premium', default: null, min: 30, max: 1000,
      label: 'field.boiler_volume_l.label', hint: 'field.boiler_volume_l.hint',
    },
    boiler_target_temp_c: {
      section: 'boiler', type: 'float', scope: 'premium', default: null, min: 40, max: 85,
      label: 'field.boiler_target_temp_c.label', hint: 'field.boiler_target_temp_c.hint',
    },
  },
};

describe('simulator overlay mount (fe/fix: seam was dispatch-only, nothing listened)', () => {
  let el: TestApp;

  beforeEach(async () => {
    // Boiler presets + simulate resolve entry_id from the URL (?entry_id=).
    // Battery ignores it, so setting it globally is safe for every test here.
    window.history.pushState({}, '', '/?entry_id=entry1');

    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    fetchOIGAPI.mockResolvedValue(null);
    fetchOIGAPITyped.mockImplementation(routeFetch);
    loadFieldRegistryMock.mockResolvedValue(REGISTRY_FIXTURE);
    // The real <oig-simulator>, once mounted, fires off a real fetch() in its
    // firstUpdated — stub it so that's a harmless no-op instead of a jsdom
    // "fetch is not defined" / unhandled rejection.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }));

    el = await fixture<TestApp>(html`<oig-app></oig-app>`);
    (el as any).loading = false;
    (el as any).error = null;
    el.onboarding = { steps: { ai: 'pending', solar: 'pending', pricing: 'pending' } };
    el.onboardingWizardOpen = false;
    await el.updateComplete;

    const banner = el.shadowRoot!.querySelector('oig-onboarding-banner')!;
    banner.dispatchEvent(new CustomEvent('launch-onboarding', { bubbles: true, composed: true }));
    await flush(el);

    // app.ts binds the wizard's `.inverterSn` to the module-level `INVERTER_SN`
    // (read from `?sn=`/`?inverter_sn=` at import time — empty in this jsdom
    // env). The wizard's registry/pricing/etc. bootstrap
    // (`startBootstrap`, index.ts:2423-2431) only fires once BOTH `open` and
    // `inverterSn` are truthy, so without this the battery/boiler steps never
    // get a registry and permanently show "not available" instead of the sim
    // button. Setting it directly here is the same as what a real URL would
    // provide — irrelevant to what this test actually proves.
    const wizard = getWizard(el)!;
    wizard.inverterSn = 'SN123';
    await flush(wizard);
  });

  afterEach(() => {
    fixtureCleanup();
    vi.unstubAllGlobals();
  });

  it('has no simulator mounted before the sim button is clicked', () => {
    expect(el.shadowRoot!.querySelector('oig-simulator')).toBeNull();
  });

  it('clicking the battery sim button OPENS the overlay with the battery draft', async () => {
    const wizard = getWizard(el)!;
    (wizardRoot(wizard).querySelector('button[data-step="battery"]') as HTMLButtonElement).click();
    await flush(wizard);

    wizard.batteryDraft = { ...wizard.batteryDraft, charge_rate_kw: 3.2 };
    await flush(wizard);

    const button = wizardRoot(wizard).querySelector(
      '[data-testid="battery-simulator-button"]',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    await settle(el);

    const sim = el.shadowRoot!.querySelector('oig-simulator') as HTMLElement & Record<string, any>;
    expect(sim).toBeTruthy();
    expect(sim.domain).toBe('battery');
    expect(sim.draft.charge_rate_kw).toBe(3.2);
  });

  it('clicking the boiler sim button OPENS the overlay with the boiler draft', async () => {
    const wizard = getWizard(el)!;
    (wizardRoot(wizard).querySelector('button[data-step="boiler"]') as HTMLButtonElement).click();
    await flush(wizard);

    wizard.boilerDraft = { ...wizard.boilerDraft, boiler_volume_l: 240 };
    await flush(wizard);

    const button = wizardRoot(wizard).querySelector(
      '[data-testid="boiler-simulator-button"]',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    await settle(el);

    const sim = el.shadowRoot!.querySelector('oig-simulator') as HTMLElement & Record<string, any>;
    expect(sim).toBeTruthy();
    expect(sim.domain).toBe('boiler');
    expect(sim.draft.boiler_volume_l).toBe(240);
  });

  it('fetches presets on open, renders chips, and the initial simulate carries the first preset id', async () => {
    const wizard = getWizard(el)!;
    (wizardRoot(wizard).querySelector('button[data-step="battery"]') as HTMLButtonElement).click();
    await flush(wizard);

    const button = wizardRoot(wizard).querySelector(
      '[data-testid="battery-simulator-button"]',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    await settle(el);

    // Preset-list GET fired against the planner presets route.
    const presetCalls = fetchOIGAPITyped.mock.calls.filter(
      ([p]) => typeof p === 'string' && p.endsWith('/presets'),
    );
    expect(presetCalls.length).toBeGreaterThanOrEqual(1);

    const sim = el.shadowRoot!.querySelector('oig-simulator') as HTMLElement & Record<string, any>;
    expect(sim).toBeTruthy();
    // The fetched presets were passed down and the first was default-selected
    // before the component's firstUpdated fired the initial simulate.
    expect(sim.activePresetId).toBe(BATTERY_PRESETS_FIXTURE[0].id);
    for (const preset of BATTERY_PRESETS_FIXTURE) {
      expect(sim.shadowRoot!.querySelector(`[data-testid="preset-${preset.id}"]`)).toBeTruthy();
    }

    // Initial simulate POST carries the first preset id (not a blank) — the
    // root cause of the owner's "'prices' required when no preset given" 400.
    const simulateCalls = fetchOIGAPITyped.mock.calls.filter(
      ([p, o]) =>
        typeof p === 'string' &&
        p.includes('planner_simulate') &&
        !p.endsWith('/presets') &&
        (o as RequestInit | undefined)?.method === 'POST',
    );
    expect(simulateCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(String((simulateCalls[0][1] as RequestInit)?.body));
    expect(body.preset).toBe(BATTERY_PRESETS_FIXTURE[0].id);
  });

  it('backdrop click closes the overlay and unmounts the simulator', async () => {
    const wizard = getWizard(el)!;
    (wizardRoot(wizard).querySelector('button[data-step="battery"]') as HTMLButtonElement).click();
    await flush(wizard);
    (wizardRoot(wizard).querySelector('[data-testid="battery-simulator-button"]') as HTMLButtonElement).click();
    await settle(el);
    expect(el.shadowRoot!.querySelector('oig-simulator')).toBeTruthy();

    const overlay = el.shadowRoot!.querySelector('[data-testid="simulator-overlay"]') as HTMLElement;
    expect(overlay).toBeTruthy();
    overlay.click();
    await flush(el);

    expect(el.shadowRoot!.querySelector('oig-simulator')).toBeNull();
  });
});
