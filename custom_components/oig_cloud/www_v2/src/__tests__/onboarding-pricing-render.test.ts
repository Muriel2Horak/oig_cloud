import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string], Promise<unknown>>());

vi.mock('@/data/ha-client', () => ({
    haClient: {
      fetchOIGAPI,
      getHass: vi.fn(async () => ({
        auth: { data: { access_token: 'token' } },
      })),
    getHassSync: vi.fn(() => null),
    refreshHass: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/data/state-watcher', () => ({
  stateWatcher: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    onEntityChange: vi.fn().mockReturnValue(vi.fn()),
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

import '@/ui/features/onboarding';

const basePayload = {
  distributors: {
    cez: {
      NT: {
        price_incl_vat: 9.2,
        price_excl_vat: 7.1,
        unit: 'Kc/A/mesic',
      },
      VT: {
        price_incl_vat: 12.4,
        price_excl_vat: 9.5,
        unit: 'Kc/A/mesic',
      },
    },
    egd: {
      NT: {
        price_incl_vat: 8.7,
        price_excl_vat: 6.4,
        unit: 'Kc/A/mesic',
      },
    },
  },
  tariffs: ['NT', 'VT'],
  selected_distributor: 'cez',
  selected_tariff: 'NT',
  confirmed_distribution_price_incl_vat: 9.2,
  confirmed_distribution_price_excl_vat: 7.1,
  confirmed_distribution_unit: 'Kc/A/mesic',
  valid_from: '2025-01-01',
  stale_warning: true,
};

describe('pricing step render test (Task 6B)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockClear();
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path === '/SN123/onboarding') {
        return Promise.resolve({
          steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
          timestamps: {},
          grandfathered: false,
        });
      }
      if (path === '/SN123/pricelists') {
        return Promise.resolve({ ...basePayload });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('renders pricing step with distributor/tariff selects, prefilled prices and stale warning', async () => {
    const wizard = await fixture<HTMLElement>(html`<oig-onboarding-wizard
      .inverterSn=${'SN123'}
      ?open=${true}
    ></oig-onboarding-wizard>`);
    await (wizard as any).updateComplete;

    const nextBtn = wizard.shadowRoot!.querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement;
    nextBtn.click();
    await (wizard as any).updateComplete;
    nextBtn.click();
    await (wizard as any).updateComplete;

    const distributorSelect = wizard.shadowRoot!.querySelector(
      '[data-testid="pricing-distributor-select"]',
    ) as HTMLSelectElement;
    const tariffSelect = wizard.shadowRoot!.querySelector(
      '[data-testid="pricing-tariff-select"]',
    ) as HTMLSelectElement;
    const priceInputs = wizard.shadowRoot!.querySelectorAll(
      'input[data-testid^="pricing-price-"]',
    );
    const stale = wizard.shadowRoot!.querySelector(
      '[data-testid="pricing-stale-warning"]',
    );

    expect(distributorSelect).toBeTruthy();
    expect(distributorSelect.options.length).toBeGreaterThan(0);
    expect(tariffSelect).toBeTruthy();
    expect(tariffSelect.options.length).toBeGreaterThan(0);
    expect(priceInputs.length).toBeGreaterThan(0);

    const firstPrice = priceInputs.item(0) as HTMLInputElement;
    expect(firstPrice.value).not.toBe('');
    expect(stale).toBeTruthy();
  });
});
