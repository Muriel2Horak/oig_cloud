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

// --- mocks mirrored from onboarding-soft-gate.test.ts (same app surface) ----

vi.mock('@/data/ha-client', () => ({
  haClient: {
    getHass: vi.fn(() => new Promise(() => undefined)),
    getHassSync: vi.fn().mockReturnValue(null),
    refreshHass: vi.fn().mockResolvedValue(null),
    fetchOIGAPI: vi.fn().mockResolvedValue(null),
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

vi.mock('@/data/registry-data', () => ({
  loadFieldRegistry: vi.fn().mockResolvedValue(null),
  fieldsFromRegistry: vi.fn().mockReturnValue([]),
  isVisible: vi.fn().mockReturnValue(true),
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

describe('wizard mount + route (Plan 3.5 item 4)', () => {
  let el: TestApp;

  beforeEach(async () => {
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

  it('routes steps in order AI → Solar → Pricing via [Další]', async () => {
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

    // ① AI
    let active = wizardRoot(wizard).querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('ai');

    // click [Další] → ② Solar
    const nextBtn = wizardRoot(wizard).querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement;
    nextBtn.click();
    await (wizard as any).updateComplete;
    active = wizardRoot(wizard).querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('solar');

    // click [Další] again → ③ Pricing
    (wizardRoot(wizard).querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement).click();
    await (wizard as any).updateComplete;
    active = wizardRoot(wizard).querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('pricing');

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
    expect(active?.getAttribute('data-step')).toBe('pricing');
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
