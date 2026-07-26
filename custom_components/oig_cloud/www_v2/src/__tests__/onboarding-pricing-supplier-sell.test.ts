// src/__tests__/onboarding-pricing-supplier-sell.test.ts
//
// Supplier-step redesign — "Ceny — prodej" (Sell) step: the other half of
// the Nakup/Prodej split (see onboarding-pricing-supplier.test.ts for the
// Buy step and the full rationale). Group B only (6 keys), scenario
// radio-cards + progressive disclosure. `export_fixed_price` has no VT/NT
// precedent anywhere in the codebase (UX-SPEC §4) so it never splits —
// no side-by-side layout needed here, unlike the Buy step's fixed_prices
// scenario.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string, options?: RequestInit], Promise<unknown>>());
const fetchOIGAPITyped = vi.hoisted(() => vi.fn());
const loadFieldRegistryMock = vi.hoisted(() => vi.fn<[signal?: AbortSignal], Promise<FieldRegistry | null>>());
const saveModuleConfigMock = vi.hoisted(() => vi.fn());

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI,
    fetchOIGAPITyped,
    getHass: vi.fn(async () => ({ auth: { data: { access_token: 'token' } } })),
    getHassSync: vi.fn(() => null),
    refreshHass: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('@/data/registry-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/registry-data')>();
  return { ...actual, loadFieldRegistry: loadFieldRegistryMock };
});
vi.mock('@/data/settings-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/settings-data')>();
  return { ...actual, saveModuleConfig: saveModuleConfigMock };
});

import '@/ui/features/onboarding';
import { STEP_PRICING_SUPPLIER_SELL } from '@/ui/features/onboarding/step-pricing-supplier-sell';
import { DUAL_TARIFF_CODES } from '@/ui/features/onboarding/step-pricing-distribution';

interface SpecWithAll {
  section: string; type: 'bool' | 'int' | 'float' | 'str'; scope: string;
  label: string; hint: string; default?: unknown;
  min?: number; max?: number; enum?: string[]; optional?: boolean;
  show_if?: { field: string; in: unknown[] };
  show_if_all?: { field: string; in: unknown[] }[];
}

const dual = { field: 'confirmed_distribution_tariff', in: [...DUAL_TARIFF_CODES] };

const fields: Record<string, SpecWithAll> = {
  confirmed_distribution_tariff: {
    section: 'pricing', type: 'str', scope: 'premium', label: 'l', hint: 'h', default: 'D01d',
    enum: ['D01d', 'D25d'],
  },
  spot_pricing_model: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h',
    default: 'percentage', enum: ['percentage', 'fixed', 'fixed_prices'],
  },

  // --- B: Prodejni cena / export — the only group this step renders ---
  export_pricing_model: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h',
    default: 'percentage', enum: ['percentage', 'fixed', 'fixed_prices'],
  },
  export_fee_percent: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 15,
    show_if: { field: 'export_pricing_model', in: ['percentage'] },
  },
  export_fee_percent_nt: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 13,
    show_if_all: [{ field: 'export_pricing_model', in: ['percentage'] }, dual],
  },
  export_fixed_fee_czk: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 0.2,
    show_if: { field: 'export_pricing_model', in: ['fixed'] },
  },
  export_fixed_fee_czk_nt: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 0.15,
    show_if_all: [{ field: 'export_pricing_model', in: ['fixed'] }, dual],
  },
  export_fixed_price: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 2.5,
    show_if: { field: 'export_pricing_model', in: ['fixed_prices'] },
  },
};

const REGISTRY_FIXTURE = { sections: ['pricing', 'pricing_supplier'], fields } as unknown as FieldRegistry;

const PRICELISTS = {
  distributors: { cez: { D01d: { price_incl_vat: 3.1, price_excl_vat: 2.56, unit: 'Kc/kWh' } } },
  tariffs: ['D01d'],
  selected_distributor: 'cez', selected_tariff: 'D01d',
  confirmed_distribution_price_incl_vat: 3.1,
  confirmed_distribution_price_excl_vat: 2.56,
  confirmed_distribution_unit: 'Kc/kWh',
  stale_warning: false, valid_from: null, year: 2026,
};

function moduleConfigFetch(doc: Record<string, unknown>) {
  return (path: string): Promise<unknown> => {
    if (path.includes('/onboarding')) {
      return Promise.resolve({
        steps: {
          modules: 'done', ai: 'pending', solar: 'pending', pricing_distribution: 'pending',
          pricing_supplier: 'pending', pricing_supplier_sell: 'pending',
        },
        timestamps: {}, grandfathered: false,
      });
    }
    if (path.includes('/pricelists')) return Promise.resolve(PRICELISTS);
    if (path.includes('/module_config')) return Promise.resolve(doc);
    return Promise.resolve(null);
  };
}

async function settle(wizard: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> {
  await wizard.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wizard.updateComplete;
}

async function openWizard(): Promise<HTMLElement & { updateComplete: Promise<boolean> }> {
  const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
    html`<oig-onboarding-wizard .inverterSn=${'SN123'} ?open=${true}></oig-onboarding-wizard>`,
  );
  await settle(wizard);
  return wizard;
}

async function goToStep(
  wizard: HTMLElement & { updateComplete: Promise<boolean> },
  step: string,
): Promise<void> {
  const btn = wizard.shadowRoot!.querySelector(
    `[data-testid="wizard-steps"] [data-step="${step}"]`,
  ) as HTMLButtonElement;
  btn.click();
  await settle(wizard);
}

describe('STEP_PRICING_SUPPLIER_SELL (Sell step) field set', () => {
  it('fields() = 6 keys — group B only (export); import/tariff-schedule/distribution keys never appear', () => {
    const keys = STEP_PRICING_SUPPLIER_SELL.fields(REGISTRY_FIXTURE).map((f) => f.key);
    expect(keys.length).toBe(6);
    expect(keys).toContain('export_pricing_model');
    expect(keys).not.toContain('spot_pricing_model');
    expect(keys).not.toContain('vat_rate');
  });

  it('visibleFields shows percentage-scenario fields when export_pricing_model=percentage, hides the wrong scenario', () => {
    const visible = STEP_PRICING_SUPPLIER_SELL.visibleFields(
      REGISTRY_FIXTURE, { export_pricing_model: 'percentage' }, false,
    ).map((f) => f.key);
    expect(visible).toContain('export_fee_percent');
    expect(visible).not.toContain('export_fixed_price');
  });

  it('export_fixed_price (fixed_prices scenario) has no _nt variant, dual or not', () => {
    const visible = STEP_PRICING_SUPPLIER_SELL.visibleFields(
      REGISTRY_FIXTURE, { export_pricing_model: 'fixed_prices' }, true,
    ).map((f) => f.key);
    expect(visible).toContain('export_fixed_price');
    expect(visible).not.toContain('export_fixed_price_nt');
  });

  it('_nt variant fields track isDualTariff, same cross-step flag as the Buy step', () => {
    const notDual = STEP_PRICING_SUPPLIER_SELL.visibleFields(
      REGISTRY_FIXTURE, { export_pricing_model: 'percentage' }, false,
    ).map((f) => f.key);
    expect(notDual).not.toContain('export_fee_percent_nt');

    const dualVisible = STEP_PRICING_SUPPLIER_SELL.visibleFields(
      REGISTRY_FIXTURE, { export_pricing_model: 'percentage' }, true,
    ).map((f) => f.key);
    expect(dualVisible).toContain('export_fee_percent_nt');
  });
});

describe('pricing_supplier_sell step render', () => {
  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(REGISTRY_FIXTURE);
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      pricing: { confirmed_distribution_distributor: 'cez', confirmed_distribution_tariff: 'D01d' },
    }));
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('shows only the 3 scenario radio-cards before a scenario is chosen — no fields, no raw enum value', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier_sell');

    const cards = [...wizard.shadowRoot!.querySelectorAll('[data-testid="scenario-cards-sell"] [data-scenario-card]')];
    expect(cards.map((c) => c.getAttribute('data-scenario-card'))).toEqual(['percentage', 'fixed', 'fixed_prices']);
    for (const value of ['percentage', 'fixed', 'fixed_prices']) {
      const card = wizard.shadowRoot!.querySelector(`[data-scenario-card="${value}"]`)!;
      expect(card.textContent).not.toContain(value);
    }
    expect(wizard.shadowRoot!.querySelector('[data-testid="scenario-fields-sell"]')).toBeNull();
  });

  it('choosing a card reveals its fields below it; the raw <select> for export_pricing_model is gone', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier_sell');

    (wizard.shadowRoot!.querySelector('[data-scenario-card="fixed"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-key="export_pricing_model"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="export_fixed_fee_czk"]')).not.toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-scenario-card="fixed"]')?.classList.contains('selected')).toBe(true);
  });

  it('never renders import (Buy-step) fields', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier_sell');
    (wizard.shadowRoot!.querySelector('[data-scenario-card="percentage"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-key="spot_pricing_model"]')).toBeNull();
  });

  it('review mode preselects the seeded scenario card and shows its fields immediately', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      pricing: { confirmed_distribution_distributor: 'cez', confirmed_distribution_tariff: 'D01d' },
      pricing_supplier: { export_pricing_model: 'fixed_prices' },
    }));
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier_sell');

    expect(wizard.shadowRoot!.querySelector('[data-scenario-card="fixed_prices"]')?.classList.contains('selected')).toBe(true);
    expect(wizard.shadowRoot!.querySelector('[data-key="export_fixed_price"]')).not.toBeNull();
  });
});
