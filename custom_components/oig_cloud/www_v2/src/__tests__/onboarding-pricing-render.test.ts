import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string], Promise<unknown>>());
const loadFieldRegistryMock = vi.hoisted(() => vi.fn<[], Promise<FieldRegistry | null>>());
const saveModuleConfigMock = vi.hoisted(() => vi.fn());
const fieldsFromRegistryCalls = vi.hoisted(() => ({ pricing: 0 }));

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

vi.mock('@/data/settings-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/settings-data')>();
  return {
    ...actual,
    saveModuleConfig: saveModuleConfigMock,
  };
});

vi.mock('@/data/registry-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/registry-data')>();
  return {
    ...actual,
    loadFieldRegistry: loadFieldRegistryMock,
    fieldsFromRegistry: (reg: FieldRegistry, section: string) => {
      if (section === 'pricing') fieldsFromRegistryCalls.pricing += 1;
      return actual.fieldsFromRegistry(reg, section);
    },
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

import '@/ui/features/onboarding';

/**
 * Trimmed `/config_registry` `pricing` section — verbatim mirror of the
 * real `confirmed_distribution_*` fields registered in
 * `config_registry.py:362-397` (F1 Plan 3.6 Task 7).
 */
const PRICING_REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['pricing'],
  fields: {
    confirmed_distribution_distributor: {
      section: 'pricing', type: 'str', scope: 'premium',
      label: 'field.confirmed_distribution_distributor.label',
      hint: 'field.confirmed_distribution_distributor.hint',
      default: 'cez',
      enum: ['cez', 'egd'],
    },
    confirmed_distribution_tariff: {
      section: 'pricing', type: 'str', scope: 'premium',
      label: 'field.confirmed_distribution_tariff.label',
      hint: 'field.confirmed_distribution_tariff.hint',
      default: 'NT',
      enum: ['NT', 'VT'],
    },
    confirmed_distribution_price_incl_vat: {
      section: 'pricing', type: 'float', scope: 'premium',
      label: 'field.confirmed_distribution_price_incl_vat.label',
      hint: 'field.confirmed_distribution_price_incl_vat.hint',
      default: 0,
    },
    confirmed_distribution_price_excl_vat: {
      section: 'pricing', type: 'float', scope: 'premium',
      label: 'field.confirmed_distribution_price_excl_vat.label',
      hint: 'field.confirmed_distribution_price_excl_vat.hint',
      default: 0,
    },
    confirmed_distribution_unit: {
      section: 'pricing', type: 'str', scope: 'premium', optional: true,
      label: 'field.confirmed_distribution_unit.label',
      hint: 'field.confirmed_distribution_unit.hint',
      default: 'Kc/A/mesic',
    },
  },
};

const basePayload = {
  distributors: {
    cez: {
      NT: { price_incl_vat: 9.2, price_excl_vat: 7.1, unit: 'Kc/A/mesic' },
      VT: { price_incl_vat: 12.4, price_excl_vat: 9.5, unit: 'Kc/A/mesic' },
    },
    egd: {
      NT: { price_incl_vat: 8.7, price_excl_vat: 6.4, unit: 'Kc/A/mesic' },
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

/** Matches basePayload's cez/NT rate — what a fresh (never-confirmed) entry defaults to. */
const defaultModuleConfigPricing = {
  confirmed_distribution_distributor: 'cez',
  confirmed_distribution_tariff: 'NT',
  confirmed_distribution_price_incl_vat: 9.2,
  confirmed_distribution_price_excl_vat: 7.1,
  confirmed_distribution_unit: 'Kc/A/mesic',
};

/** A DIFFERENT persisted pick (egd/NT) — proves prefill reads module_config, not the dataset default. */
const persistedModuleConfigPricing = {
  confirmed_distribution_distributor: 'egd',
  confirmed_distribution_tariff: 'NT',
  confirmed_distribution_price_incl_vat: 8.7,
  confirmed_distribution_price_excl_vat: 6.4,
  confirmed_distribution_unit: 'Kc/A/mesic',
};

async function openWizardOnPricingStep(): Promise<HTMLElement & Record<string, any>> {
  const wizard = await fixture<HTMLElement>(html`<oig-onboarding-wizard
    .inverterSn=${'SN123'}
    ?open=${true}
  ></oig-onboarding-wizard>`);
  await (wizard as any).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (wizard as any).updateComplete;

  const nextBtn = wizard.shadowRoot!.querySelector(
    '[data-testid="wizard-next"]',
  ) as HTMLButtonElement;
  // ai -> solar
  nextBtn.click();
  await (wizard as any).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (wizard as any).updateComplete;
  // solar -> pricing
  nextBtn.click();
  await (wizard as any).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (wizard as any).updateComplete;

  return wizard as HTMLElement & Record<string, any>;
}

describe('pricing step render (F1 Plan 3.6 Task 7 — registry-driven)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockClear();
    loadFieldRegistryMock.mockClear();
    saveModuleConfigMock.mockReset();
    fieldsFromRegistryCalls.pricing = 0;
    loadFieldRegistryMock.mockResolvedValue(PRICING_REGISTRY_FIXTURE);
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/onboarding')) {
        return Promise.resolve({
          steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
          timestamps: {},
          grandfathered: false,
        });
      }
      if (path.includes('/pricelists')) {
        return Promise.resolve({ ...basePayload });
      }
      if (path.includes('/module_config')) {
        return Promise.resolve({ pricing: { ...defaultModuleConfigPricing } });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('renders pricing step with distributor/tariff selects, prefilled prices and stale warning', async () => {
    const wizard = await openWizardOnPricingStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    expect(content).toBeTruthy();

    const selects = content.querySelectorAll('select');
    expect(selects.length).toBe(2);
    expect(selects[0].options.length).toBeGreaterThan(0);
    expect(selects[1].options.length).toBeGreaterThan(0);

    const numberInputs = content.querySelectorAll('input[type="number"]');
    expect(numberInputs.length).toBe(2);
    const firstPrice = numberInputs.item(0) as HTMLInputElement;
    expect(firstPrice.value).not.toBe('');

    const stale = content.querySelector('[data-testid="pricing-stale-warning"]');
    expect(stale).toBeTruthy();
  });

  it('distributor <select> @change updates the tariff options and the displayed price (no-op selects must fail this)', async () => {
    const wizard = await openWizardOnPricingStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;

    const distributorSelect = content.querySelectorAll('select')[0] as HTMLSelectElement;
    const tariffSelectBefore = content.querySelectorAll('select')[1] as HTMLSelectElement;
    expect([...tariffSelectBefore.options].map((o) => o.value)).toEqual(['NT', 'VT']);

    distributorSelect.value = 'egd';
    distributorSelect.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await wizard.updateComplete;

    const updated = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const tariffSelectAfter = updated.querySelectorAll('select')[1] as HTMLSelectElement;
    expect([...tariffSelectAfter.options].map((o) => o.value)).toEqual(['NT']);

    const priceInput = updated.querySelectorAll('input[type="number"]')[0] as HTMLInputElement;
    expect(Number(priceInput.value)).toBeCloseTo(8.7);
  });

  it('[data-testid="pricing-confirm"] click emits exactly one saveModuleConfig("pricing", {...}) call with the currently-selected values', async () => {
    saveModuleConfigMock.mockResolvedValue({ ok: true });
    const wizard = await openWizardOnPricingStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;

    const distributorSelect = content.querySelectorAll('select')[0] as HTMLSelectElement;
    distributorSelect.value = 'egd';
    distributorSelect.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await wizard.updateComplete;

    const confirmBtn = wizard.shadowRoot!.querySelector('[data-testid="pricing-confirm"]') as HTMLButtonElement;
    expect(confirmBtn).toBeTruthy();
    confirmBtn.click();
    await wizard.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wizard.updateComplete;

    expect(saveModuleConfigMock).toHaveBeenCalledTimes(1);
    expect(saveModuleConfigMock).toHaveBeenCalledWith('pricing', {
      confirmed_distribution_distributor: 'egd',
      confirmed_distribution_tariff: 'NT',
      confirmed_distribution_price_incl_vat: 8.7,
      confirmed_distribution_price_excl_vat: 6.4,
      confirmed_distribution_unit: 'Kc/A/mesic',
    });
  });

  it('round trip: remounting with a persisted module_config pricing section pre-fills the confirmed values, not the dataset default (a no-op save must fail this)', async () => {
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/onboarding')) {
        return Promise.resolve({
          steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
          timestamps: {},
          grandfathered: false,
        });
      }
      if (path.includes('/pricelists')) {
        // Dataset still "suggests" cez/NT — proves the FE isn't reading this for prefill.
        return Promise.resolve({ ...basePayload });
      }
      if (path.includes('/module_config')) {
        return Promise.resolve({ pricing: { ...persistedModuleConfigPricing } });
      }
      return Promise.resolve(null);
    });

    const wizard = await openWizardOnPricingStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;

    const distributorSelect = content.querySelectorAll('select')[0] as HTMLSelectElement;
    expect(distributorSelect.value).toBe('egd');

    const priceInput = content.querySelectorAll('input[type="number"]')[0] as HTMLInputElement;
    expect(Number(priceInput.value)).toBeCloseTo(8.7);
  });

  it('render-budget: editing an unrelated pricing field triggers exactly one extra fieldsFromRegistry("pricing") call per render pass', async () => {
    const wizard = await openWizardOnPricingStep();
    const before = fieldsFromRegistryCalls.pricing;
    expect(before).toBeGreaterThan(0);

    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const priceExclInput = content.querySelectorAll('input[type="number"]')[1] as HTMLInputElement;
    priceExclInput.value = '10.5';
    priceExclInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await wizard.updateComplete;

    expect(fieldsFromRegistryCalls.pricing).toBe(before + 1);
  });
});
