import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';
import { SOLAR_REGISTRY_FIXTURE } from './fixtures/solar-registry-fixture';

const loadFieldRegistryMock = vi.hoisted(() =>
  vi.fn<[signal?: AbortSignal], Promise<FieldRegistry | null>>().mockResolvedValue(null),
);

vi.mock('@/data/ha-client', () => ({
  haClient: {
    getHass: vi.fn(() => new Promise(() => undefined)),
    getHassSync: vi.fn().mockReturnValue(null),
    refreshHass: vi.fn().mockResolvedValue(null),
    fetchOIGAPI: vi.fn().mockResolvedValue(null),
    fetchOIGAPITyped: vi.fn().mockResolvedValue({ ok: true, status: 200, data: null }),
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
  }),
  saveModuleConfig: vi.fn(),
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
// Task 11 (F1 Plan 3.6): deliberately NOT mocked — the real interaction proof
// below clicks the actual <oig-tabs> buttons, which requires the real
// component (a mocked-out module leaves the tag unregistered, with no
// shadow DOM to click into).
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

import '@/ui/app';

interface TestApp extends HTMLElement {
  onboarding: unknown;
  updateComplete: Promise<boolean>;
}

describe('SCOPE-REVISION #6 — the guide is SOFT', () => {
  let el: TestApp;

  beforeEach(async () => {
    el = await fixture<TestApp>(html`<oig-app></oig-app>`);
    (el as any).loading = false;
    (el as any).error = null;
    el.onboarding = { steps: { ai: 'pending', solar: 'pending', pricing: 'pending' } };
    await el.updateComplete;
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('renders the normal tabs for a brand-new install with nothing configured', async () => {
    el.onboarding = { steps: { ai: 'pending', solar: 'pending', pricing: 'pending' } };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('oig-tabs')).toBeTruthy();
    expect(el.shadowRoot!.textContent).not.toMatch(/dokončit nastavení, než/i);
  });

  it('never replaces the dashboard with the wizard', async () => {
    // the K1 lockout this design deliberately dropped
    expect(el.shadowRoot!.querySelector('.tab-content')).toBeTruthy();
    expect((el as any).activeTab).toBe('flow');   // app.ts:66 default is preserved
  });

  it('shows a dismissible banner while setup is unfinished', async () => {
    const banner = el.shadowRoot!.querySelector('oig-onboarding-banner');
    expect(banner).toBeTruthy();
    expect(banner!.getAttribute('role')).toBe('status');   // not 'alertdialog'
  });

  it('hides the banner once every step is done', async () => {
    el.onboarding = { steps: { ai: 'done', solar: 'done', pricing: 'done' } };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('oig-onboarding-banner')).toBeNull();
  });

  it('a grandfathered entry gets the review banner, never a wizard wall (D11 × #6)', async () => {
    el.onboarding = { grandfathered: true, banner_dismissed: false, steps: { ai: 'pending', solar: 'done', pricing: 'done' } };
    await el.updateComplete;
    const banner = el.shadowRoot!.querySelector('oig-onboarding-banner');
    expect(banner).toBeTruthy();
    expect(banner!.getAttribute('role')).toBe('status');   // not 'alertdialog'
    expect(el.shadowRoot!.querySelector('.tab-content')).toBeTruthy();   // dashboard still renders — no gate
  });

  it('a grandfathered entry whose banner was already dismissed sees no banner', async () => {
    el.onboarding = { grandfathered: true, banner_dismissed: true, steps: { ai: 'pending', solar: 'done', pricing: 'done' } };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('oig-onboarding-banner')).toBeNull();
  });

  it('the grandfathered banner shows distinct "review your configuration" copy', async () => {
    el.onboarding = { grandfathered: true, banner_dismissed: false, steps: { ai: 'pending', solar: 'done', pricing: 'done' } };
    await el.updateComplete;
    const banner = el.shadowRoot!.querySelector('oig-onboarding-banner')!;
    expect(banner.shadowRoot!.textContent).toMatch(/zkontrolujte svou stávající konfiguraci/i);
  });

  it('dismissing the grandfathered banner hides it immediately and re-syncs onboarding state (persistence contract covered in onboarding-skip.test.ts)', async () => {
    // app.ts binds `.inverterSn`-style values from a module-level constant
    // parsed from the URL query string, empty in this test environment (see
    // the Task 11 block below) — so the REST round-trip itself is a no-op
    // here. What IS observable at this layer: the optimistic local hide, and
    // that the dismiss event triggers the same reload path as wizard-close.
    const loadOnboardingSpy = vi.spyOn(el as any, 'loadOnboarding');

    el.onboarding = { grandfathered: true, banner_dismissed: false, steps: { ai: 'pending', solar: 'done', pricing: 'done' } };
    await el.updateComplete;

    const banner = el.shadowRoot!.querySelector('oig-onboarding-banner')!;
    const closeBtn = banner.shadowRoot!.querySelector('.close') as HTMLButtonElement;
    closeBtn.click();
    await banner.updateComplete;
    // Local optimistic hide — instant, before any REST round-trip.
    expect(banner.shadowRoot!.querySelector('.banner')).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loadOnboardingSpy).toHaveBeenCalled();
  });

  it('the wizard stays launchable for a grandfathered entry after the banner is dismissed (no gate)', async () => {
    el.onboarding = { grandfathered: true, banner_dismissed: true, steps: { ai: 'pending', solar: 'done', pricing: 'done' } };
    await el.updateComplete;
    (el as any).onboardingWizardOpen = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('oig-onboarding-wizard')).toBeTruthy();
  });

  it('the wizard is launchable from Settings, per step', async () => {
    const settings = await fixture<HTMLElement>(html`<oig-settings></oig-settings>`);
    expect(settings.shadowRoot!.querySelector('[data-testid="launch-onboarding"]')).toBeTruthy();
  });
});

// ============================================================================
// F1 Plan 3.6 Task 11 — real selectors + real interaction proof (finding #14)
//
// `dashboard-primary` never existed in production (0 hits in src/); the real
// selectors are `<oig-tabs>` / `.tab-content` / `.tab-content.active`, used
// throughout this file already. This block adds the interaction proof both
// critiques asked for: not "the button isn't disabled" but an actual click,
// during an actual Step-2 classified-error state.
//
// Chosen semantic (v2 plan, default — occlusion reading): the wizard is a
// deliberately-opened `.overlay` (position:fixed, z-index:1000) covering the
// dashboard while open. It may occlude the dashboard while open; wizard-close
// and wizard-skip stay usable throughout, and dashboard-nav-after-close is
// proven to actually work (not just "not disabled"). Click-through to the
// dashboard while the overlay is still open is NOT implemented — that is the
// stricter, unconfirmed reading the v2 plan flags as new scope.
// ============================================================================
describe('Task 11 — soft-guide real interaction proof (F1 Plan 3.6, occlusion reading)', () => {
  let el: TestApp;

  beforeEach(async () => {
    loadFieldRegistryMock.mockReset();
    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);

    el = await fixture<TestApp>(html`<oig-app></oig-app>`);
    (el as any).loading = false;
    (el as any).error = null;
    el.onboarding = { steps: { ai: 'pending', solar: 'pending', pricing: 'pending' } };
    await el.updateComplete;
  });

  afterEach(() => {
    fixtureCleanup();
    loadFieldRegistryMock.mockReset();
    loadFieldRegistryMock.mockResolvedValue(null);
  });

  function getWizard(): HTMLElement & Record<string, any> {
    return el.shadowRoot!.querySelector('oig-onboarding-wizard') as HTMLElement & Record<string, any>;
  }

  /** Open the wizard and force it onto Step-2 with a classified test error —
   *  the real state shape `runSolarTest()` sets on a failed `/solar_test`. */
  async function openWizardOnSolarErrorStep(): Promise<HTMLElement & Record<string, any>> {
    (el as any).onboardingWizardOpen = true;
    await el.updateComplete;

    const wizard = getWizard();
    await wizard.updateComplete;
    // `app.ts` binds `.inverterSn` from the module-level `INVERTER_SN`
    // (parsed from the URL query string), which is empty in the test
    // environment — the wizard's bootstrap in `updated()` is gated on a
    // truthy `inverterSn`, so force one directly to exercise the real
    // registry-driven render.
    wizard.inverterSn = 'SN123';
    await wizard.updateComplete;
    // Let the bootstrap `loadFieldRegistry()` microtask resolve before
    // forcing the step/error state below.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wizard.updateComplete;

    wizard.currentStep = 'solar';
    wizard.solarTestError = { code: 'timeout', message: 'Časový limit vypršel.' };
    wizard.requestUpdate();
    await wizard.updateComplete;

    return wizard;
  }

  it('<oig-tabs> and .tab-content.active stay present and unmodified while the wizard is open with pending onboarding', async () => {
    (el as any).onboardingWizardOpen = true;
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('oig-tabs')).toBeTruthy();
    const activeTabContent = el.shadowRoot!.querySelector('.tab-content.active');
    expect(activeTabContent).toBeTruthy();
    expect((el as any).activeTab).toBe('flow');
  });

  it('grandfathered still renders <oig-onboarding-banner> when open; wizard itself stays manually launchable', async () => {
    el.onboarding = { grandfathered: true, banner_dismissed: false, steps: { ai: 'pending', solar: 'done', pricing: 'done' } };
    (el as any).onboardingWizardOpen = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('oig-onboarding-banner')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('oig-onboarding-wizard')).toBeTruthy();
  });

  it('during the Step-2 classified-error state, wizard-close and wizard-skip are real, clickable, functional controls', async () => {
    const wizard = await openWizardOnSolarErrorStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    expect(content.querySelector('[data-testid="solar-test-error"]')).toBeTruthy();

    const closeBtn = wizard.shadowRoot!.querySelector('[data-testid="wizard-close"]') as HTMLButtonElement;
    const skipBtn = wizard.shadowRoot!.querySelector('[data-testid="wizard-skip"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    expect(skipBtn).toBeTruthy();
    expect(closeBtn.disabled).toBe(false);
    expect(skipBtn.disabled).toBe(false);
  });

  it('clicking wizard-skip during the Step-2 error advances the step (real click, real transition)', async () => {
    const wizard = await openWizardOnSolarErrorStep();

    const skipBtn = wizard.shadowRoot!.querySelector('[data-testid="wizard-skip"]') as HTMLButtonElement;
    skipBtn.click();
    await wizard.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wizard.updateComplete;

    const active = wizard.shadowRoot!.querySelector(
      '[data-testid="wizard-steps"] button.active',
    ) as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('pricing_distribution');
  });

  it('clicking wizard-close during the Step-2 error actually closes the wizard, and a dashboard tab click works after', async () => {
    const wizard = await openWizardOnSolarErrorStep();

    const closeBtn = wizard.shadowRoot!.querySelector('[data-testid="wizard-close"]') as HTMLButtonElement;
    closeBtn.click();
    await el.updateComplete;
    await wizard.updateComplete;

    expect(wizard.hasAttribute('open')).toBe(false);
    expect(wizard.shadowRoot!.querySelector('[data-testid="onboarding-wizard-overlay"]')).toBeNull();

    // Real dashboard-nav-after-close: click the actual <oig-tabs> button.
    const tabs = el.shadowRoot!.querySelector('oig-tabs') as HTMLElement;
    const pricingTabBtn = Array.from(tabs.shadowRoot!.querySelectorAll('button.tab')).find(
      (b) => b.textContent?.includes('Ceny'),
    ) as HTMLButtonElement | undefined;
    expect(pricingTabBtn).toBeTruthy();

    pricingTabBtn!.click();
    await el.updateComplete;

    expect((el as any).activeTab).toBe('pricing');
    expect(el.shadowRoot!.querySelector('.tab-content.active')).toBeTruthy();
  });

  it('app.ts refreshes onboarding state on close (kept); a mid-wizard onboarding-changed does not need a separate app.ts listener, because Finish always closes too', async () => {
    const loadOnboardingSpy = vi.spyOn(el as any, 'loadOnboarding');
    const wizard = getWizard();

    // Mid-wizard event (skip()/persistCurrentStep() dispatch this while the
    // wizard stays open) — under the occlusion reading the banner is hidden
    // behind the open overlay, so no dashboard-visible refresh is needed yet.
    wizard.dispatchEvent(new CustomEvent('onboarding-changed', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(loadOnboardingSpy).not.toHaveBeenCalled();

    // Close (including the one `finish()` always issues) is the single
    // trigger that refreshes the dashboard's onboarding snapshot.
    wizard.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(loadOnboardingSpy).toHaveBeenCalledTimes(1);
  });
});
