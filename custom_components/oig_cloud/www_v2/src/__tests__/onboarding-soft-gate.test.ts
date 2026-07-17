import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';

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

  it('a grandfathered entry gets no banner and no wizard (D11 × #6)', async () => {
    el.onboarding = { grandfathered: true, steps: { ai: 'pending', solar: 'done', pricing: 'done' } };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('oig-onboarding-banner')).toBeNull();
  });

  it('the wizard is launchable from Settings, per step', async () => {
    const settings = await fixture<HTMLElement>(html`<oig-settings></oig-settings>`);
    expect(settings.shadowRoot!.querySelector('[data-testid="launch-onboarding"]')).toBeTruthy();
  });
});
