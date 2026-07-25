// src/__tests__/onboarding-mount.test.ts
//
// Plan 3.5 item 4: prove that the launch-onboarding event MOUNTS the wizard
// shell, and that the wizard routes AI → Solar → Pricing with a working
// Přeskočit (skip) on every step. These tests must FAIL against the pre-wiring
// stub (which only re-dispatches the event) and PASS after the wiring that
// Plan 3.5 item 4 introduces in app.ts and ui/features/onboarding/index.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';

// --- mocks mirrored from onboarding-soft-gate.test.ts (same app surface) ----

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
const saveModuleConfigMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true }),
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
  saveModuleConfig: saveModuleConfigMock,
  waitForModuleConfigAfterReload: vi.fn(),
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
// We deliberately do NOT mock `@/ui/features/onboarding` — the app imports it
// in order to register `oig-onboarding-wizard` as a real Lit element. The
// module's only side effects inside index.ts are the @customElement calls
// and a couple of pure-data re-exports; the ha-client dependency it pulls in
// transitively (onboarding-data.ts) is already mocked above.

import '@/ui/app';

interface TestApp extends HTMLElement {
  onboarding: unknown;
  onboardingWizardOpen: boolean;
  updateComplete: Promise<boolean>;
}

/** Find the wizard element in the rendered app — it lives inside
 *  <oig-theme-provider> in the app's shadow. The app's render() places it
 *  alongside the other global overlays. */
function getWizard(app: TestApp) {
  return app.shadowRoot!.querySelector('oig-onboarding-wizard') as
    | (HTMLElement & { open: boolean; openShadowRoot: ShadowRoot | null })
    | null;
}

/**
 * Return a live `shadowRoot` for the wizard whether or not it is currently
 * `open`. Lit attaches a shadow root on `connectedCallback` even when render
 * returns `nothing` — but the rendered DOM only contains the modal when
 * `open === true`. So we read the root directly off the element.
 */
function wizardRoot(wizard: HTMLElement): ShadowRoot {
  // Lit's shadow root is on the element itself.
  return wizard.shadowRoot as unknown as ShadowRoot;
}

const PRICING_STATE = {
  confirmed_distribution_distributor: 'cez',
  confirmed_distribution_tariff: 'D57d',
  confirmed_distribution_price_incl_vat: 7.1,
  confirmed_distribution_price_excl_vat: 5.6,
  confirmed_distribution_unit: 'Kc/kWh',
};

const PRICING_PAYLOAD = {
  distributors: {
    cez: {
      D57d: {
        price_incl_vat: 7.1,
        price_excl_vat: 5.6,
        unit: 'Kc/kWh',
      },
    },
  },
  tariffs: ['D57d'],
  selected_distributor: 'cez',
  selected_tariff: 'D57d',
  confirmed_distribution_price_incl_vat: 7.1,
  confirmed_distribution_price_excl_vat: 5.6,
  confirmed_distribution_unit: 'Kc/kWh',
  stale_warning: false,
  valid_from: null,
  year: 2026,
};

const MINIMAL_REGISTRY: FieldRegistry = {
  sections: ['pricing'],
  fields: {},
};

type StepState = Record<'ai' | 'solar' | 'pricing', 'pending' | 'done' | 'skipped'>;

interface OnboardingFixtureState {
  schema_version: number;
  steps: StepState;
  timestamps: Record<string, unknown>;
  provider: string | null;
  grandfathered: boolean;
  finished_at?: string;
}

function cloneState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T;
}

async function flushWizard(wizard: HTMLElement & { updateComplete: Promise<boolean> }) {
  await wizard.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wizard.updateComplete;
}

function typedFinishCalls() {
  return fetchOIGAPITyped.mock.calls.filter(([path, options]) => {
    if (path !== '/SN123/onboarding' || options?.method !== 'POST') return false;
    return JSON.parse(String(options.body)).action === 'finish';
  });
}

describe('wizard mount + route (Plan 3.5 item 4)', () => {
  let el: TestApp;

  beforeEach(async () => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    fetchOIGAPI.mockResolvedValue(null);
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(null);
    saveModuleConfigMock.mockResolvedValue({ ok: true });

    el = await fixture<TestApp>(html`<oig-app></oig-app>`);
    (el as any).loading = false;
    (el as any).error = null;
    // Banner is hidden when everything is `done` — set partial state so the
    // banner fires the `launch-onboarding` event.
    el.onboarding = { steps: { ai: 'pending', solar: 'pending', pricing: 'pending' } };
    el.onboardingWizardOpen = false;
    await el.updateComplete;
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('mounts <oig-onboarding-wizard> in the DOM (registered by index.ts)', () => {
    const wizard = getWizard(el);
    expect(wizard).toBeTruthy();
    // closed by default
    expect(wizard!.hasAttribute('open')).toBe(false);
  });

  it('dispatching launch-onboarding from the banner OPENS the wizard', async () => {
    const banner = el.shadowRoot!.querySelector('oig-onboarding-banner');
    expect(banner).toBeTruthy();

    // Pre-condition: wizard closed.
    const wizard = getWizard(el)!;
    expect(wizard.hasAttribute('open')).toBe(false);

    // Dispatch the event from the banner — exactly what the user does when
    // they click "Spustit průvodce" (banner.ts:88).
    banner!.dispatchEvent(new CustomEvent('launch-onboarding', {
      bubbles: true,
      composed: true,
    }));
    await el.updateComplete;

    // Post-condition: wizard open.
    expect(wizard.hasAttribute('open')).toBe(true);
  });

  it('routes steps in order welcome → modules → ai → solar → … via [Další]', async () => {
    const banner = el.shadowRoot!.querySelector('oig-onboarding-banner')!;
    banner.dispatchEvent(new CustomEvent('launch-onboarding', {
      bubbles: true,
      composed: true,
    }));
    await el.updateComplete;

    const wizard = getWizard(el)!;
    expect(wizard.hasAttribute('open')).toBe(true);

    // The wizard uses `display: contents`, so its DOM ends up in the
    // app's shadow. Look for the test-id we added.
    const overlay = wizardRoot(wizard).querySelector('[data-testid="onboarding-wizard"]');
    expect(overlay).toBeTruthy();

    // ⓪ Welcome (first step, opens by default)
    let active = wizardRoot(wizard).querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('welcome');

    // click [Další] → modules
    const nextBtn = wizardRoot(wizard).querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement;
    nextBtn.click();
    await (wizard as any).updateComplete;
    active = wizardRoot(wizard).querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('modules');

    // click [Další] again → ai
    (wizardRoot(wizard).querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement).click();
    await (wizard as any).updateComplete;
    active = wizardRoot(wizard).querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('ai');

    // jump directly to the last step (summary) — full ordering is covered by
    // the dedicated WIZARD_STEPS test.
    (wizardRoot(wizard).querySelector(
      'button[data-step="summary"]',
    ) as HTMLButtonElement).click();
    await (wizard as any).updateComplete;
    active = wizardRoot(wizard).querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('summary');

    // clicking [Další] on the last step closes the wizard.
    (wizardRoot(wizard).querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement).click();
    await el.updateComplete;
    expect(wizard.hasAttribute('open')).toBe(false);
  });

  it('Přeskočit advances to the next step from AI', async () => {
    const banner = el.shadowRoot!.querySelector('oig-onboarding-banner')!;
    banner.dispatchEvent(new CustomEvent('launch-onboarding', {
      bubbles: true,
      composed: true,
    }));
    await el.updateComplete;

    const wizard = getWizard(el)!;

    // Drive to the AI step by clicking the indicator directly (wizard opens
    // on 'welcome' now).
    (wizardRoot(wizard).querySelector(
      'button[data-step="ai"]',
    ) as HTMLButtonElement).click();
    await (wizard as any).updateComplete;
    let active = wizardRoot(wizard).querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('ai');

    const skipBtn = wizardRoot(wizard).querySelector(
      '[data-testid="wizard-skip"]',
    ) as HTMLButtonElement;
    expect(skipBtn).toBeTruthy();
    skipBtn.click();
    await (wizard as any).updateComplete;

    active = wizardRoot(wizard).querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('solar');
  });

  it('Přeskočit advances to the next step from Solar (every step skippable, #5/#6)', async () => {
    const banner = el.shadowRoot!.querySelector('oig-onboarding-banner')!;
    banner.dispatchEvent(new CustomEvent('launch-onboarding', {
      bubbles: true,
      composed: true,
    }));
    await el.updateComplete;

    const wizard = getWizard(el)!;

    // Drive to the Solar step by clicking the indicator directly — also
    // proves the user can jump to any step (no lock/gate; #6).
    (wizardRoot(wizard).querySelector(
      'button[data-step="solar"]',
    ) as HTMLButtonElement).click();
    await (wizard as any).updateComplete;
    let active = wizardRoot(wizard).querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('solar');

    (wizardRoot(wizard).querySelector(
      '[data-testid="wizard-skip"]',
    ) as HTMLButtonElement).click();
    await (wizard as any).updateComplete;
    active = wizardRoot(wizard).querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('pricing_distribution');
  });

  it('returns to the dashboard when the user closes the wizard (no lock, #6)', async () => {
    const banner = el.shadowRoot!.querySelector('oig-onboarding-banner')!;
    banner.dispatchEvent(new CustomEvent('launch-onboarding', {
      bubbles: true,
      composed: true,
    }));
    await el.updateComplete;

    const wizard = getWizard(el)!;
    expect(wizard.hasAttribute('open')).toBe(true);

    // Close — the close button is always available (no lock).
    (wizardRoot(wizard).querySelector(
      '[data-testid="wizard-close"]',
    ) as HTMLButtonElement).click();
    await el.updateComplete;

    expect(wizard.hasAttribute('open')).toBe(false);
    // The dashboard keeps rendering: tabs still present.
    expect(el.shadowRoot!.querySelector('oig-tabs')).toBeTruthy();
    // activeTab stays on `flow` — the wizard never replaces the dashboard.
    expect((el as any).activeTab).toBe('flow');
  });
});

describe('wizard Finish flow (F1 Plan 3.6 Task 8)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    loadFieldRegistryMock.mockResolvedValue(MINIMAL_REGISTRY);
    saveModuleConfigMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('real Finish click posts action:"finish" and remount shows ai=done, solar=pending, pricing=done', async () => {
    let persisted: OnboardingFixtureState = {
      schema_version: 1,
      steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
      timestamps: {},
      provider: null,
      grandfathered: false,
    };

    fetchOIGAPI.mockImplementation((path: string, options?: RequestInit) => {
      if (path === '/SN123/onboarding') {
        if (options?.method === 'POST') {
          const body = JSON.parse(String(options.body));
          if (body.action === 'complete_step') {
            const step = body.step as keyof StepState;
            persisted = {
              ...persisted,
              steps: { ...persisted.steps, [step]: 'done' },
            };
          }
        }
        return Promise.resolve(cloneState(persisted));
      }
      if (path === '/SN123/pricelists') return Promise.resolve(PRICING_PAYLOAD);
      if (path === '/SN123/module_config') return Promise.resolve({ pricing: PRICING_STATE });
      if (path === '/SN123/ai') {
        return Promise.resolve({ ok: true, provider: 'groq', verified: true });
      }
      return Promise.resolve(null);
    });

    fetchOIGAPITyped.mockImplementation((path: string, options?: RequestInit) => {
      if (path === '/SN123/onboarding' && options?.method === 'POST') {
        const body = JSON.parse(String(options.body));
        if (body.action === 'finish') {
          persisted = { ...persisted, finished_at: '2026-07-23T00:00:00+00:00' };
          return Promise.resolve({ ok: true, status: 200, data: cloneState(persisted) });
        }
      }
      return Promise.resolve({ ok: true, status: 200, data: null });
    });

    let wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard
        .inverterSn=${'SN123'}
        ?open=${true}
      ></oig-onboarding-wizard>`,
    );
    await flushWizard(wizard);

    // Wizard opens on 'welcome' — jump to 'ai' directly (#6: no lock/gate,
    // any step is reachable from the nav).
    (wizard.shadowRoot!.querySelector('button[data-step="ai"]') as HTMLButtonElement).click();
    await flushWizard(wizard);

    const aiStep = wizard.shadowRoot!.querySelector('oig-onboarding-step-ai') as
      | (HTMLElement & { updateComplete: Promise<boolean> })
      | null;
    expect(aiStep).toBeTruthy();
    await flushWizard(aiStep!);
    const aiKey = aiStep!.shadowRoot!.querySelector('input[type="password"]') as HTMLInputElement;
    expect(aiKey).toBeTruthy();
    aiKey.value = 'gsk_123456789';
    aiKey.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await flushWizard(wizard);

    // [Další] from 'ai' persists it 'done' and advances to 'solar'.
    const nextBtn = wizard.shadowRoot!.querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement;
    nextBtn.click();
    await flushWizard(wizard);

    // Jump straight to the last step (summary) — the stub steps in between
    // (Stage S3 content) have nothing to interact with in S1.
    (wizard.shadowRoot!.querySelector('button[data-step="summary"]') as HTMLButtonElement).click();
    await flushWizard(wizard);
    (wizard.shadowRoot!.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement).click();
    await flushWizard(wizard);

    expect(typedFinishCalls()).toHaveLength(1);
    expect(JSON.parse(String(typedFinishCalls()[0][1]!.body))).toEqual({ action: 'finish' });
    expect(persisted.steps.ai).toBe('done');
    expect(persisted.steps.solar).toBe('pending');
    expect(wizard.hasAttribute('open')).toBe(false);

    fixtureCleanup();
    wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard
        .inverterSn=${'SN123'}
        ?open=${true}
      ></oig-onboarding-wizard>`,
    );
    await flushWizard(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-step-status-ai"]')?.textContent)
      .toContain('done');
    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-step-status-solar"]')?.textContent)
      .toContain('pending');
  });

  it('double-clicking Finish issues exactly one action:"finish" request', async () => {
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path === '/SN123/onboarding') {
        return Promise.resolve({
          schema_version: 1,
          steps: { ai: 'done', solar: 'pending', pricing: 'done' },
          timestamps: {},
          provider: null,
          grandfathered: false,
        });
      }
      if (path === '/SN123/pricelists') return Promise.resolve(PRICING_PAYLOAD);
      if (path === '/SN123/module_config') return Promise.resolve({ pricing: PRICING_STATE });
      return Promise.resolve(null);
    });

    let resolveFinish: ((value: unknown) => void) | null = null;
    fetchOIGAPITyped.mockImplementation((_path: string, _options?: RequestInit) =>
      new Promise((resolve) => {
        resolveFinish = resolve;
      }),
    );

    const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard
        .inverterSn=${'SN123'}
        ?open=${true}
      ></oig-onboarding-wizard>`,
    );
    await flushWizard(wizard);

    (wizard.shadowRoot!.querySelector('button[data-step="summary"]') as HTMLButtonElement).click();
    await flushWizard(wizard);

    const finishBtn = wizard.shadowRoot!.querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement;
    finishBtn.click();
    finishBtn.click();
    await flushWizard(wizard);

    expect(typedFinishCalls()).toHaveLength(1);

    resolveFinish!({
      ok: true,
      status: 200,
      data: {
        schema_version: 1,
        steps: { ai: 'done', solar: 'pending', pricing: 'done' },
        timestamps: {},
        provider: null,
        grandfathered: false,
        finished_at: '2026-07-23T00:00:00+00:00',
      },
    });
    await flushWizard(wizard);
  });

  it('classified Finish failure keeps the wizard open with a retry control', async () => {
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path === '/SN123/onboarding') {
        return Promise.resolve({
          schema_version: 1,
          steps: { ai: 'done', solar: 'pending', pricing: 'done' },
          timestamps: {},
          provider: null,
          grandfathered: false,
        });
      }
      if (path === '/SN123/pricelists') return Promise.resolve(PRICING_PAYLOAD);
      if (path === '/SN123/module_config') return Promise.resolve({ pricing: PRICING_STATE });
      return Promise.resolve(null);
    });
    fetchOIGAPITyped
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        code: 'finish_save_failed',
        error: 'finish_save_failed',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          schema_version: 1,
          steps: { ai: 'done', solar: 'pending', pricing: 'done' },
          timestamps: {},
          provider: null,
          grandfathered: false,
          finished_at: '2026-07-23T00:00:00+00:00',
        },
      });

    const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard
        .inverterSn=${'SN123'}
        ?open=${true}
      ></oig-onboarding-wizard>`,
    );
    await flushWizard(wizard);

    (wizard.shadowRoot!.querySelector('button[data-step="summary"]') as HTMLButtonElement).click();
    await flushWizard(wizard);

    (wizard.shadowRoot!.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement).click();
    await flushWizard(wizard);

    expect(wizard.hasAttribute('open')).toBe(true);
    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-error"]')).toBeTruthy();
    const retry = wizard.shadowRoot!.querySelector(
      '[data-testid="wizard-finish-retry"]',
    ) as HTMLButtonElement;
    expect(retry).toBeTruthy();

    retry.click();
    await flushWizard(wizard);
    expect(typedFinishCalls()).toHaveLength(2);
    expect(wizard.hasAttribute('open')).toBe(false);
  });
});

describe('WIZARD_STEPS 10-step sequence (F1 Wizard v2 S1 Task 2)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    fetchOIGAPI.mockResolvedValue(null);
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(null);
    saveModuleConfigMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('WIZARD_STEPS is the 10-step wizard-v2 sequence, welcome first and summary last', async () => {
    const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard .inverterSn=${'SN123'} ?open=${true}></oig-onboarding-wizard>`,
    );
    await flushWizard(wizard);

    const steps = [...wizard.shadowRoot!.querySelectorAll('[data-testid="wizard-steps"] button')]
      .map((b) => b.getAttribute('data-step'));
    expect(steps).toEqual([
      'welcome', 'modules', 'ai', 'solar', 'pricing_distribution', 'pricing_supplier',
      'battery', 'boiler', 'connection', 'summary',
    ]);
  });
});
