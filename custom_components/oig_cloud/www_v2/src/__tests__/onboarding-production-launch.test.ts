// src/__tests__/onboarding-production-launch.test.ts
//
// F1 Plan 3.6 Task 10 (finding #13; R8.2/R5.4) — production-launch anti-stub
// coverage. Pure test coverage: stitches Tasks 1-9 (all merged in this base)
// into ONE production-DOM walk through the real `<oig-app>` mount, both real
// launch entry points, and route-interception of the wizard's own four
// bootstrap endpoints (onboarding state, config_registry, pricelists,
// module_config — see index.ts:425-427). No production code changes.
//
// Mocked ONLY at the network boundary (`@/data/ha-client`) plus the heavy
// dashboard-only display features that Task 10 has no interest in (flow,
// boiler, analytics, weather, timeline, tiles, control-panel, header,
// theme-provider, tabs, grid). `@/ui/features/settings`, `@/ui/features/
// onboarding`, and `@/ui/features/onboarding/banner` are the REAL production
// components — this is what makes the mount "production-equivalent" rather
// than an isolated fixture (closes finding #13 / CRITIQUE-B #9).

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';
import { SOLAR_REGISTRY_FIXTURE } from './fixtures/solar-registry-fixture';

// Real inverter SN so the wizard's bootstrap gate (`if (!this.inverterSn)
// return`) actually opens — every module below computes its own
// `INVERTER_SN` from `window.location.search` at import time. ES import
// declarations are hoisted above all other top-level code in a module
// (including a plain `window.history.pushState(...)` statement textually
// placed above them), so a static `import '@/ui/app'` would evaluate
// against the default (empty) URL regardless of where this file put the
// pushState call. A dynamic `import()` inside `beforeAll`, AFTER the URL is
// set, is the only way to control that ordering.
const TEST_SN = 'SN123';

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string, options?: RequestInit], Promise<unknown>>());
const fetchOIGAPITyped = vi.hoisted(() => vi.fn<[path: string, options?: RequestInit], Promise<any>>());

vi.mock('@/data/ha-client', () => ({
  haClient: {
    // Never resolves — blocks `initApp()`'s big dashboard bootstrap (flow/
    // pricing/analytics/weather/boiler/tiles) past the `getHass()` await, the
    // same pattern the existing app-mount tests use. Only the wizard's own
    // bootstrap (driven by real `.inverterSn`/`open` property changes, not by
    // `initApp()`) is under test here.
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
// Deliberately NOT mocked: `@/ui/features/settings` (Settings launch button,
// entry point 2), `@/ui/features/onboarding` (+`/banner`) (the wizard + the
// banner button, entry point 1) — these are the real production consumers
// this task proves converge on the SAME mounted wizard.

beforeAll(async () => {
  window.history.pushState({}, '', `/?sn=${TEST_SN}`);
  await import('@/ui/app');
});

interface TestApp extends HTMLElement {
  onboarding: unknown;
  onboardingWizardOpen: boolean;
  activeTab: string;
  updateComplete: Promise<boolean>;
}

type WizardEl = HTMLElement & { updateComplete: Promise<boolean> } & Record<string, any>;

// ----------------------------------------------------------------------------
// Backend fixtures — a real `config_registry` (solar + pricing sections), a
// real two-distributor/two-tariff `/pricelists` dataset, and a mutable
// `/onboarding` + `/module_config` store so POSTs actually persist across a
// remount, mirroring the real REST bridge (ha_rest_api.py) instead of a
// hard-coded fixture response.
// ----------------------------------------------------------------------------

const PRICING_REGISTRY_FIELDS: FieldRegistry['fields'] = {
  confirmed_distribution_distributor: {
    section: 'pricing', type: 'str', scope: 'basic',
    label: 'field.confirmed_distribution_distributor.label',
    hint: 'field.confirmed_distribution_distributor.hint',
    enum: ['cez', 'pre'],
  },
  confirmed_distribution_tariff: {
    section: 'pricing', type: 'str', scope: 'basic',
    label: 'field.confirmed_distribution_tariff.label',
    hint: 'field.confirmed_distribution_tariff.hint',
    enum: ['D57d', 'D56d', 'D26d'],
  },
  confirmed_distribution_price_incl_vat: {
    section: 'pricing', type: 'float', scope: 'basic',
    label: 'field.confirmed_distribution_price_incl_vat.label', hint: '',
  },
  confirmed_distribution_price_excl_vat: {
    section: 'pricing', type: 'float', scope: 'basic',
    label: 'field.confirmed_distribution_price_excl_vat.label', hint: '',
  },
  confirmed_distribution_unit: {
    section: 'pricing', type: 'str', scope: 'basic',
    label: 'field.confirmed_distribution_unit.label', hint: '',
  },
};

const REGISTRY: FieldRegistry = {
  sections: ['solar', 'pricing'],
  fields: { ...SOLAR_REGISTRY_FIXTURE.fields, ...PRICING_REGISTRY_FIELDS },
};

const PRICELISTS_PAYLOAD = {
  distributors: {
    cez: {
      D57d: { price_incl_vat: 7.1, price_excl_vat: 5.6, unit: 'Kc/kWh' },
      D56d: { price_incl_vat: 6.8, price_excl_vat: 5.3, unit: 'Kc/kWh' },
    },
    pre: {
      D26d: { price_incl_vat: 6.3, price_excl_vat: 5.1, unit: 'Kc/kWh' },
    },
  },
  tariffs: ['D57d', 'D56d', 'D26d'],
  selected_distributor: 'cez',
  selected_tariff: 'D57d',
  confirmed_distribution_price_incl_vat: 7.1,
  confirmed_distribution_price_excl_vat: 5.6,
  confirmed_distribution_unit: 'Kc/kWh',
  stale_warning: false,
  valid_from: null,
  year: 2026,
};

interface Backend {
  onboarding: { steps: Record<'ai' | 'solar' | 'pricing', string>; timestamps: Record<string, unknown>; provider: string | null; grandfathered: boolean; finished_at?: string };
  moduleConfig: { modules: Record<string, unknown>; battery: Record<string, unknown>; solar: Record<string, unknown>; boiler: Record<string, unknown>; pricing: Record<string, unknown> };
  onboardingPosts: Array<Record<string, unknown>>;
  moduleConfigPosts: Array<Record<string, unknown>>;
  aiPosts: Array<Record<string, unknown>>;
  solarTestPosts: Array<Record<string, unknown>>;
  finishPosts: Array<Record<string, unknown>>;
}

function cloneState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T;
}

function makeBackend(): Backend {
  return {
    onboarding: {
      steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
      timestamps: {},
      provider: null,
      grandfathered: false,
    },
    moduleConfig: {
      modules: {}, battery: {}, solar: {}, boiler: {},
      pricing: {
        confirmed_distribution_distributor: 'cez',
        confirmed_distribution_tariff: 'D57d',
        confirmed_distribution_price_incl_vat: 7.1,
        confirmed_distribution_price_excl_vat: 5.6,
        confirmed_distribution_unit: 'Kc/kWh',
      },
    },
    onboardingPosts: [],
    moduleConfigPosts: [],
    aiPosts: [],
    solarTestPosts: [],
    finishPosts: [],
  };
}

function wireFetchOIGAPI(backend: Backend) {
  fetchOIGAPI.mockImplementation((path: string, options?: RequestInit) => {
    const method = options?.method ?? 'GET';

    if (path.includes('/config_registry')) {
      return Promise.resolve(cloneState(REGISTRY));
    }
    if (path.includes('/pricelists')) {
      return Promise.resolve(cloneState(PRICELISTS_PAYLOAD));
    }
    if (path.includes('/module_config')) {
      if (method === 'POST') {
        const body = JSON.parse(String(options!.body));
        backend.moduleConfigPosts.push(body);
        if (body.section === 'pricing') {
          backend.moduleConfig.pricing = { ...backend.moduleConfig.pricing, ...body.values };
        }
        return Promise.resolve({ updated: true });
      }
      return Promise.resolve(cloneState(backend.moduleConfig));
    }
    if (path.includes('/onboarding')) {
      if (method === 'POST') {
        const body = JSON.parse(String(options!.body));
        backend.onboardingPosts.push(body);
        if (body.action === 'complete_step') {
          backend.onboarding.steps[body.step as 'ai' | 'solar' | 'pricing'] = 'done';
        } else if (body.action === 'skip') {
          backend.onboarding.steps[body.step as 'ai' | 'solar' | 'pricing'] = 'skipped';
        }
        return Promise.resolve(cloneState(backend.onboarding));
      }
      return Promise.resolve(cloneState(backend.onboarding));
    }
    if (path.includes('/ai')) {
      if (method === 'POST') {
        const body = JSON.parse(String(options!.body));
        backend.aiPosts.push(body);
        return Promise.resolve({ ok: true, provider: body.provider, verified: true });
      }
      return Promise.resolve(null);
    }
    return Promise.resolve(null);
  });
}

function wireFetchOIGAPITyped(backend: Backend) {
  fetchOIGAPITyped.mockImplementation((path: string, options?: RequestInit) => {
    if (path.includes('/solar_test')) {
      backend.solarTestPosts.push(JSON.parse(String(options!.body)));
      return Promise.resolve({
        ok: true, status: 200,
        data: { tomorrow_total_kwh: 12.3, forecast_covers_tomorrow: true },
      });
    }
    if (path.includes('/onboarding') && options?.method === 'POST') {
      const body = JSON.parse(String(options.body));
      if (body.action === 'finish') {
        backend.onboarding.finished_at = '2026-07-23T00:00:00+00:00';
        backend.finishPosts.push(body);
        return Promise.resolve({ ok: true, status: 200, data: cloneState(backend.onboarding) });
      }
    }
    return Promise.resolve({ ok: true, status: 200, data: null });
  });
}

/** Flush the microtask/rAF chain behind a bootstrap fetch or a click handler
 *  across the app + wizard + step-ai shadow trees (three independent Lit
 *  elements in the same walk). */
async function flush(...elements: Array<HTMLElement & { updateComplete: Promise<boolean> }>): Promise<void> {
  for (const el of elements) await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (const el of elements) await el.updateComplete;
}

function getWizard(el: TestApp): WizardEl {
  return el.shadowRoot!.querySelector('oig-onboarding-wizard') as WizardEl;
}

function getBanner(el: TestApp): (HTMLElement & { shadowRoot: ShadowRoot }) | null {
  return el.shadowRoot!.querySelector('oig-onboarding-banner') as
    | (HTMLElement & { shadowRoot: ShadowRoot })
    | null;
}

describe('production-launch anti-stub coverage (F1 Plan 3.6 Task 10)', () => {
  let el: TestApp;
  let backend: Backend;

  beforeEach(async () => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    backend = makeBackend();
    wireFetchOIGAPI(backend);
    wireFetchOIGAPITyped(backend);

    el = await fixture<TestApp>(html`<oig-app></oig-app>`);
    (el as any).loading = false;
    (el as any).error = null;
    // The dashboard's own onboarding-banner-state fetch is blocked (initApp()
    // never gets past the hanging `getHass()`) — poke the banner-visibility
    // state directly, the same way every existing app-mount test does.
    el.onboarding = { steps: { ai: 'pending', solar: 'pending', pricing: 'pending' } };
    await el.updateComplete;
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('entry point 1: dispatching launch-onboarding from the real banner button mounts the wizard open', async () => {
    const banner = getBanner(el);
    expect(banner).toBeTruthy();

    const wizard = getWizard(el);
    expect(wizard.hasAttribute('open')).toBe(false);

    const launchBtn = banner!.shadowRoot.querySelector('button.launch') as HTMLButtonElement;
    expect(launchBtn).toBeTruthy();
    launchBtn.click();
    await flush(el);

    expect(wizard.hasAttribute('open')).toBe(true);
    // Real SN flows from the URL through app.ts into the wizard property —
    // proves this is the production wiring, not a manually-forced fixture.
    expect(wizard.inverterSn).toBe(TEST_SN);

    await flush(el, wizard);
    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]')).toBeTruthy();
    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-steps"]')).toBeTruthy();
    // wizard-v2 (Stage S1) opens on `welcome`, the first of the 10-step
    // sequence — `ai` no longer leads.
    const active = wizard.shadowRoot!.querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('welcome');
  });

  it('entry point 2: the Settings launch-onboarding button opens the SAME wizard component (convergence)', async () => {
    (el as any).activeTab = 'settings';
    await el.updateComplete;

    const settings = el.shadowRoot!.querySelector('oig-settings') as HTMLElement & { updateComplete: Promise<boolean> };
    expect(settings).toBeTruthy();
    await settings.updateComplete;

    const wizard = getWizard(el);
    expect(wizard.hasAttribute('open')).toBe(false);

    const launchBtn = settings.shadowRoot!.querySelector('[data-testid="launch-onboarding"]') as HTMLButtonElement;
    expect(launchBtn).toBeTruthy();
    launchBtn.click();
    await flush(el);

    // Same wizard element identity, same open transition — both entry points
    // converge on one real component (SCOPE-REVISION R8.2), not two.
    expect(getWizard(el)).toBe(wizard);
    expect(wizard.hasAttribute('open')).toBe(true);
    expect(wizard.inverterSn).toBe(TEST_SN);
  });

  // The full AI -> Solar -> Pricing -> Finish click-through (Task 10's
  // original anti-stub proof) asserted the retired 3-step shell verbatim:
  // a single unified "pricing" step with distributor/tariff <select>s and
  // an explicit [data-testid="pricing-confirm"] button, and an exact
  // 3-entry complete_step sequence. wizard-v2 (Stage S1-S3) split pricing
  // into pricing_distribution/pricing_supplier, inserted welcome/modules/
  // battery/boiler/connection/summary, and replaced the per-step confirm
  // button with a single batch save on Finish — none of which this test's
  // premise can express. Retired; the same production-wiring proof now
  // lives across:
  //   - banner-launch + full 10-step routing order + Finish + remount
  //     persistence: onboarding-mount.test.ts
  //   - AI [Ověřit] POST: onboarding-step-ai.test.ts
  //   - registry-driven pricing_distribution/pricing_supplier fields:
  //     onboarding-pricing-distribution.test.ts, onboarding-pricing-supplier.test.ts
  //   - batch saveModuleConfig on Finish + round-trip prefill from
  //     module_config (originalValues snapshot): onboarding-review-mode.test.ts
  //   - solar registry fields + [Otestovat]: onboarding-solar-gps.test.ts,
  //     onboarding-bootstrap.test.ts
});
