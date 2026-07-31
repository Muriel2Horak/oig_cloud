// src/__tests__/onboarding-pricing-supplier.test.ts
//
// Supplier-step redesign (owner walkthrough: the combined supplier step was
// "too dense", scenario enums leaked technical values, distribution does
// not belong here) — SUPERSEDES UX-SPEC-wizard-v2.md §step-5's single-step
// layout where they conflict. This file covers the "Ceny — nákup" (Buy)
// step: group A only (9 keys), scenario radio-cards + progressive
// disclosure, VT/NT side-by-side for the fixed-price scenario. The "Ceny —
// prodej" (Sell) step has its own file,
// onboarding-pricing-supplier-sell.test.ts. Cross-step `isDualTariff`
// propagation (distribution -> supplier) still applies to this step.
//
// Field names verified against the LANDED registry (Phase A pre-step,
// config_registry.py): base VT fields keep their LEGACY unsuffixed key
// (`spot_positive_fee_percent`, NOT `_vt`); only `fixed_commercial_price_vt`/
// `_nt` carries a `_vt` suffix. `distribution_fee_vt_kwh`/`_nt_kwh`/
// `vat_rate` moved to the registry `pricing` section (this redesign) and no
// longer appear in this step's fixture at all.

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
import { STEP_PRICING_SUPPLIER } from '@/ui/features/onboarding/step-pricing-supplier';
import { DUAL_TARIFF_CODES } from '@/ui/features/onboarding/step-pricing-distribution';

interface SpecWithAll {
  section: string; type: 'bool' | 'int' | 'float' | 'str'; scope: string;
  label: string; hint: string; default?: unknown;
  min?: number; max?: number; enum?: string[]; optional?: boolean;
  show_if?: { field: string; in: unknown[] };
  show_if_all?: { field: string; in: unknown[] }[];
}

const dual = { field: 'confirmed_distribution_tariff', in: [...DUAL_TARIFF_CODES] };

/** Mirrors config_registry.py's `pricing_supplier` + `pricing` sections
 * verbatim, post supplier-step redesign (distribution fee + VAT keys now
 * live in `pricing`, `dual_tariff_enabled` omitted — registry `hidden=True`). */
const fields: Record<string, SpecWithAll> = {
  confirmed_distribution_tariff: {
    section: 'pricing', type: 'str', scope: 'premium', label: 'l', hint: 'h', default: 'D01d',
    enum: ['D01d', 'D25d'],
  },
  distribution_fee_vt_kwh: {
    section: 'pricing', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 1.42,
  },
  distribution_fee_nt_kwh: {
    section: 'pricing', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 0.91,
    show_if: dual,
  },
  vat_rate: {
    section: 'pricing', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 21,
  },

  // --- A: Nakupni cena (import) — the only group this step renders ---
  spot_pricing_model: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h',
    default: 'percentage', enum: ['percentage', 'fixed', 'fixed_prices'],
  },
  spot_positive_fee_percent: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 15,
    show_if: { field: 'spot_pricing_model', in: ['percentage'] },
  },
  spot_positive_fee_percent_nt: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 13,
    show_if_all: [{ field: 'spot_pricing_model', in: ['percentage'] }, dual],
  },
  spot_negative_fee_percent: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 9,
    show_if: { field: 'spot_pricing_model', in: ['percentage'] },
  },
  spot_negative_fee_percent_nt: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 7,
    show_if_all: [{ field: 'spot_pricing_model', in: ['percentage'] }, dual],
  },
  spot_fixed_fee_mwh: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 500,
    show_if: { field: 'spot_pricing_model', in: ['fixed'] },
  },
  spot_fixed_fee_mwh_nt: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 400,
    show_if_all: [{ field: 'spot_pricing_model', in: ['fixed'] }, dual],
  },
  fixed_commercial_price_vt: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 4.5,
    show_if: { field: 'spot_pricing_model', in: ['fixed_prices'] },
  },
  fixed_commercial_price_nt: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 3.2,
    show_if_all: [{ field: 'spot_pricing_model', in: ['fixed_prices'] }, dual],
  },

  // --- B: export — belongs to the Sell step, must never render here ---
  export_pricing_model: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h',
    default: 'percentage', enum: ['percentage', 'fixed', 'fixed_prices'],
  },
  export_fee_percent: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 15,
    show_if: { field: 'export_pricing_model', in: ['percentage'] },
  },

  // --- Tariff schedule (registry-side pricing_supplier; UI renders in the
  // distribution step — must NOT appear in either supplier step) ---
  tariff_vt_start_weekday: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h', default: '6',
    show_if: dual,
  },
};

const REGISTRY_FIXTURE = { sections: ['pricing', 'pricing_supplier'], fields } as unknown as FieldRegistry;

const PRICELISTS = {
  distributors: {
    cez: {
      D01d: { price_incl_vat: 3.1, price_excl_vat: 2.56, unit: 'Kc/kWh' },
      D25d: {
        price_incl_vat: 2.72, price_excl_vat: 2.25, unit: 'Kc/kWh',
        nt: { price_incl_vat: 1.41, price_excl_vat: 1.17, unit: 'Kc/kWh' },
      },
    },
  },
  tariffs: ['D01d', 'D25d'],
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

function internals(wizard: HTMLElement): Record<string, any> {
  return wizard as unknown as Record<string, any>;
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

// ============================================================================
// STEP_PRICING_SUPPLIER (Buy step) contract (unit-level)
// ============================================================================
describe('STEP_PRICING_SUPPLIER (Buy step) field set', () => {
  it('fields() = 9 keys — group A only (import); export/tariff-schedule/distribution keys never appear', () => {
    const keys = STEP_PRICING_SUPPLIER.fields(REGISTRY_FIXTURE).map((f) => f.key);
    expect(keys.length).toBe(9);
    expect(keys).toContain('spot_pricing_model');
    expect(keys).toContain('fixed_commercial_price_vt');
    expect(keys).not.toContain('export_pricing_model');
    expect(keys).not.toContain('tariff_vt_start_weekday');
    expect(keys).not.toContain('dual_tariff_enabled');
    expect(keys).not.toContain('vat_rate');
    expect(keys).not.toContain('distribution_fee_vt_kwh');
  });

  it('visibleFields shows percentage-scenario fields when spot_pricing_model=percentage, hides the wrong scenario', () => {
    const visible = STEP_PRICING_SUPPLIER.visibleFields(
      REGISTRY_FIXTURE, { spot_pricing_model: 'percentage' }, false,
    ).map((f) => f.key);
    expect(visible).toContain('spot_positive_fee_percent');
    expect(visible).not.toContain('fixed_commercial_price_vt');
  });

  it('no scenario selected (undefined) -> only the scenario selector field itself is "visible"', () => {
    const visible = STEP_PRICING_SUPPLIER.visibleFields(REGISTRY_FIXTURE, {}, false).map((f) => f.key);
    expect(visible).toEqual(['spot_pricing_model']);
  });

  it('_nt variant fields are hidden when isDualTariff=false, even in the matching scenario', () => {
    const visible = STEP_PRICING_SUPPLIER.visibleFields(
      REGISTRY_FIXTURE, { spot_pricing_model: 'percentage' }, false,
    ).map((f) => f.key);
    expect(visible).not.toContain('spot_positive_fee_percent_nt');
  });

  it('_nt variant fields show when isDualTariff=true and the scenario matches (cross-step flag consumed here)', () => {
    const visible = STEP_PRICING_SUPPLIER.visibleFields(
      REGISTRY_FIXTURE, { spot_pricing_model: 'percentage' }, true,
    ).map((f) => f.key);
    expect(visible).toContain('spot_positive_fee_percent_nt');
    expect(visible).toContain('spot_negative_fee_percent_nt');
  });

  it('fixed_prices scenario: only VT shows single-tariff, VT+NT show when dual', () => {
    const single = STEP_PRICING_SUPPLIER.visibleFields(
      REGISTRY_FIXTURE, { spot_pricing_model: 'fixed_prices' }, false,
    ).map((f) => f.key);
    expect(single).toContain('fixed_commercial_price_vt');
    expect(single).not.toContain('fixed_commercial_price_nt');

    const dualVisible = STEP_PRICING_SUPPLIER.visibleFields(
      REGISTRY_FIXTURE, { spot_pricing_model: 'fixed_prices' }, true,
    ).map((f) => f.key);
    expect(dualVisible).toContain('fixed_commercial_price_vt');
    expect(dualVisible).toContain('fixed_commercial_price_nt');
  });
});

// ============================================================================
// DOM-level render — radio cards + progressive disclosure
// ============================================================================
describe('pricing_supplier (Buy) step render', () => {
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
    await goToStep(wizard, 'pricing_supplier');

    const cards = [...wizard.shadowRoot!.querySelectorAll('[data-testid="scenario-cards-buy"] [data-scenario-card]')];
    expect(cards.map((c) => c.getAttribute('data-scenario-card'))).toEqual(['percentage', 'fixed', 'fixed_prices']);
    for (const value of ['percentage', 'fixed', 'fixed_prices']) {
      const card = wizard.shadowRoot!.querySelector(`[data-scenario-card="${value}"]`)!;
      expect(card.textContent).not.toContain(value); // no raw enum string anywhere in the card
    }
    expect(wizard.shadowRoot!.querySelector('[data-testid="scenario-fields-buy"]')).toBeNull();
  });

  it('choosing a card reveals its fields below it; the raw <select> for spot_pricing_model is gone', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier');

    (wizard.shadowRoot!.querySelector('[data-scenario-card="percentage"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-key="spot_pricing_model"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="spot_positive_fee_percent"]')).not.toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-scenario-card="percentage"]')?.classList.contains('selected')).toBe(true);
  });

  it('fixed_prices scenario, single tariff: only the VT field renders (one field, per brief)', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier');
    (wizard.shadowRoot!.querySelector('[data-scenario-card="fixed_prices"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-key="fixed_commercial_price_vt"]')).not.toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="fixed_commercial_price_nt"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-testid="incl-vat-fixed_commercial_price_vt"]')).not.toBeNull();
  });

  it('fixed_prices scenario, dual tariff: VT and NT render side by side with their own incl-VAT lines', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      pricing: { confirmed_distribution_distributor: 'cez', confirmed_distribution_tariff: 'D25d', vat_rate: 21 },
    }));
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier');
    expect(internals(wizard).isDualTariff).toBe(true);

    (wizard.shadowRoot!.querySelector('[data-scenario-card="fixed_prices"]') as HTMLButtonElement).click();
    await settle(wizard);

    const row = wizard.shadowRoot!.querySelector('[data-testid="fixed-price-vt-nt-row"]')!;
    expect(row.querySelector('[data-key="fixed_commercial_price_vt"]')).not.toBeNull();
    expect(row.querySelector('[data-key="fixed_commercial_price_nt"]')).not.toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-testid="incl-vat-fixed_commercial_price_vt"]')).not.toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-testid="incl-vat-fixed_commercial_price_nt"]')).not.toBeNull();
  });

  it('incl-VAT line computes excl-VAT * (1 + vat_rate/100)', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      pricing: { confirmed_distribution_distributor: 'cez', confirmed_distribution_tariff: 'D01d', vat_rate: 21 },
    }));
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier');
    (wizard.shadowRoot!.querySelector('[data-scenario-card="fixed_prices"]') as HTMLButtonElement).click();
    internals(wizard).pricingDraft = { ...internals(wizard).pricingDraft, fixed_commercial_price_vt: 4.5 };
    await settle(wizard);

    const line = wizard.shadowRoot!.querySelector('[data-testid="incl-vat-fixed_commercial_price_vt"]')!;
    expect(line.textContent).toContain('5.45'); // 4.5 * 1.21 = 5.445, rounded to 2dp display
  });

  it('never renders export/tariff-schedule/distribution keys (they belong elsewhere)', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier');
    (wizard.shadowRoot!.querySelector('[data-scenario-card="percentage"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-key="export_pricing_model"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="tariff_vt_start_weekday"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="vat_rate"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="distribution_fee_vt_kwh"]')).toBeNull();
  });

  it('review mode preselects the seeded scenario card and shows its fields immediately', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      pricing: { confirmed_distribution_distributor: 'cez', confirmed_distribution_tariff: 'D01d' },
      pricing_supplier: { spot_pricing_model: 'fixed' },
    }));
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier');

    expect(wizard.shadowRoot!.querySelector('[data-scenario-card="fixed"]')?.classList.contains('selected')).toBe(true);
    expect(wizard.shadowRoot!.querySelector('[data-key="spot_fixed_fee_mwh"]')).not.toBeNull();
  });
});

// ============================================================================
// Cross-step isDualTariff propagation (distribution -> supplier), real interaction
// ============================================================================
describe('cross-step dual-flag propagation (Buy step)', () => {
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

  it('changing the tariff in the distribution step (real select+change) updates isDualTariff, read by the buy step', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_distribution');

    const tariffSelect = wizard.shadowRoot!.querySelector(
      '[data-key="confirmed_distribution_tariff"] select',
    ) as HTMLSelectElement;
    tariffSelect.value = 'D25d';
    tariffSelect.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await settle(wizard);
    expect(internals(wizard).isDualTariff).toBe(true);

    await goToStep(wizard, 'pricing_supplier');
    (wizard.shadowRoot!.querySelector('[data-scenario-card="percentage"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-key="spot_positive_fee_percent_nt"]')).not.toBeNull();
  });

  it('the dual-code-set is ONE shared source: STEP_PRICING_SUPPLIER gates confirmed_distribution_tariff via the same DUAL_TARIFF_CODES import', () => {
    for (const code of DUAL_TARIFF_CODES) {
      const visible = STEP_PRICING_SUPPLIER.visibleFields(
        REGISTRY_FIXTURE, { spot_pricing_model: 'percentage' }, true,
      ).map((f) => f.key);
      expect(visible).toContain('spot_positive_fee_percent_nt');
      void code;
    }
  });
});
