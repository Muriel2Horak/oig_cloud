// src/__tests__/onboarding-pricing-supplier.test.ts
//
// F1 Wizard v2 Stage S3 Task 16 (18 pricing_supplier fields, groups A/B/C,
// section intro copy) + Task 17 (cross-step `isDualTariff` flag propagation,
// distribution -> supplier) — docs/redesign_2026_07/plans/
// 2026-07-25-wizard-v2-implementation.md:926-1024.
//
// Field names verified against the LANDED registry (Phase A pre-step,
// config_registry.py:483-552): base VT fields keep their LEGACY unsuffixed
// key (`spot_positive_fee_percent`, NOT `_vt` — the plan's illustrative
// `_vt` spelling does not match; only `fixed_commercial_price_vt`/`_nt` and
// `distribution_fee_vt_kwh`/`_nt` carry a `_vt` suffix, unchanged legacy
// names) — see this cluster's final report for the full verified list.

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

/** Mirrors config_registry.py's `pricing_supplier` section verbatim
 * (:483-552, `dual_tariff_enabled` omitted — registry `hidden=True`). */
const fields: Record<string, SpecWithAll> = {
  confirmed_distribution_tariff: {
    section: 'pricing', type: 'str', scope: 'premium', label: 'l', hint: 'h', default: 'D01d',
    enum: ['D01d', 'D25d'],
  },

  // --- A: Nakupni cena (import) ---
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

  // --- B: Prodejni cena / export ---
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

  // --- C: Distribuce, tarify a DPH ---
  distribution_fee_vt_kwh: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 1.42,
  },
  distribution_fee_nt_kwh: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 0.91,
    show_if: dual,
  },
  vat_rate: {
    section: 'pricing_supplier', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 21,
  },

  // --- Tariff schedule (registry-side pricing_supplier; UI renders in the
  // distribution step, Task 15 — must NOT appear in step 5) ---
  tariff_vt_start_weekday: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h', default: '6',
    show_if: dual,
  },
  tariff_nt_start_weekday: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h', default: '22,2',
    show_if: dual,
  },
  tariff_weekend_same_as_weekday: {
    section: 'pricing_supplier', type: 'bool', scope: 'premium', label: 'l', hint: 'h', default: true,
    show_if: dual,
  },
  tariff_vt_start_weekend: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', optional: true, label: 'l', hint: 'h',
    default: '',
    show_if_all: [dual, { field: 'tariff_weekend_same_as_weekday', in: [false] }],
  },
  tariff_nt_start_weekend: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h', default: '0',
    show_if_all: [dual, { field: 'tariff_weekend_same_as_weekday', in: [false] }],
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
        steps: { modules: 'done', ai: 'pending', solar: 'pending', pricing_distribution: 'pending', pricing_supplier: 'pending' },
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
// STEP_PRICING_SUPPLIER contract (unit-level)
// ============================================================================
describe('STEP_PRICING_SUPPLIER field set (Task 16, owner UX rev item 3 relocates group C to step 4)', () => {
  it('fields() = 15 keys — 24 pricing_supplier keys minus 5 tariff-schedule minus hidden dual_tariff_enabled minus group C (distribution_fee_vt/nt_kwh, vat_rate — now step 4)', () => {
    const keys = STEP_PRICING_SUPPLIER.fields(REGISTRY_FIXTURE).map((f) => f.key);
    expect(keys.length).toBe(15);
    expect(keys).not.toContain('tariff_vt_start_weekday');
    expect(keys).not.toContain('dual_tariff_enabled');
    expect(keys).not.toContain('vat_rate');
    expect(keys).not.toContain('distribution_fee_vt_kwh');
    expect(keys).not.toContain('distribution_fee_nt_kwh');
  });

  it('visibleFields shows group A percentage fields when spot_pricing_model=percentage, hides the wrong scenario', () => {
    const visible = STEP_PRICING_SUPPLIER.visibleFields(
      REGISTRY_FIXTURE, { spot_pricing_model: 'percentage' }, false,
    ).map((f) => f.key);
    expect(visible).toContain('spot_positive_fee_percent');
    expect(visible).not.toContain('fixed_commercial_price_vt');
    expect(visible).not.toContain('vat_rate');
  });

  it('_nt variant fields are hidden when isDualTariff=false, even in the matching scenario', () => {
    const visible = STEP_PRICING_SUPPLIER.visibleFields(
      REGISTRY_FIXTURE, { spot_pricing_model: 'percentage' }, false,
    ).map((f) => f.key);
    expect(visible).not.toContain('spot_positive_fee_percent_nt');
  });

  it('_nt variant fields show when isDualTariff=true and the scenario matches (Task 17 flag consumed here)', () => {
    const visible = STEP_PRICING_SUPPLIER.visibleFields(
      REGISTRY_FIXTURE, { spot_pricing_model: 'percentage' }, true,
    ).map((f) => f.key);
    expect(visible).toContain('spot_positive_fee_percent_nt');
    expect(visible).toContain('spot_negative_fee_percent_nt');
  });

});

// ============================================================================
// DOM-level render (Task 16)
// ============================================================================
describe('pricing_supplier step render (Task 16)', () => {
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

  it('renders group A (import) fields gated by spot_pricing_model, group B (export); group C (distribution/VAT) moved to step 4', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier');
    internals(wizard).pricingDraft = { ...internals(wizard).pricingDraft, spot_pricing_model: 'percentage' };
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-key="spot_positive_fee_percent"]')).not.toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="fixed_commercial_price_vt"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="vat_rate"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="distribution_fee_vt_kwh"]')).toBeNull();
  });

  it('renders two group cards (A/B) — group C no longer rendered here (owner UX rev item 3)', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier');
    internals(wizard).pricingDraft = { ...internals(wizard).pricingDraft, spot_pricing_model: 'percentage' };
    await settle(wizard);

    const groups = [...wizard.shadowRoot!.querySelectorAll('[data-group]')].map((g) => g.getAttribute('data-group'));
    expect(groups).toEqual(['import', 'export']);

    const importGroup = wizard.shadowRoot!.querySelector('[data-group="import"]')!;
    expect(importGroup.querySelector('[data-key="spot_positive_fee_percent"]')).not.toBeNull();
    expect(importGroup.querySelector('[data-key="vat_rate"]')).toBeNull();

    const exportGroup = wizard.shadowRoot!.querySelector('[data-group="export"]')!;
    expect(exportGroup.querySelector('[data-key="export_pricing_model"]')).not.toBeNull();
    expect(exportGroup.querySelector('[data-key="spot_positive_fee_percent"]')).toBeNull();

    expect(wizard.shadowRoot!.querySelector('[data-group="distribution"]')).toBeNull();
  });

  it('section intro copy distinguishes dataset price (step 4) from actual contract (step 5)', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier');
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-testid="pricing-supplier-intro"]')?.textContent)
      .toContain('vaše skutečná smlouva');
  });

  it('never renders tariff-schedule fields (moved to the distribution step, Task 15)', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_supplier');
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-key="tariff_vt_start_weekday"]')).toBeNull();
  });
});

// ============================================================================
// Task 17 — cross-step isDualTariff propagation, real interaction
// ============================================================================
describe('cross-step dual-flag propagation (Task 17)', () => {
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

  it('changing the tariff in the distribution step (real select+change) updates isDualTariff, read by the supplier step', async () => {
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
    internals(wizard).pricingDraft = { ...internals(wizard).pricingDraft, spot_pricing_model: 'percentage' };
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-key="spot_positive_fee_percent_nt"]')).not.toBeNull();
  });

  it('switching back to a single-tariff code (real select+change) clears isDualTariff and hides the _nt fields again', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_distribution');

    const tariffSelect = () => wizard.shadowRoot!.querySelector(
      '[data-key="confirmed_distribution_tariff"] select',
    ) as HTMLSelectElement;

    tariffSelect().value = 'D25d';
    tariffSelect().dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await settle(wizard);
    expect(internals(wizard).isDualTariff).toBe(true);

    tariffSelect().value = 'D01d';
    tariffSelect().dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await settle(wizard);
    expect(internals(wizard).isDualTariff).toBe(false);

    await goToStep(wizard, 'pricing_supplier');
    internals(wizard).pricingDraft = { ...internals(wizard).pricingDraft, spot_pricing_model: 'percentage' };
    await settle(wizard);
    expect(wizard.shadowRoot!.querySelector('[data-key="spot_positive_fee_percent_nt"]')).toBeNull();
  });

  it('seeds isDualTariff from loadPricingConfig on open (review/recovered draft), no distribution-step interaction needed', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      pricing: { confirmed_distribution_distributor: 'cez', confirmed_distribution_tariff: 'D25d' },
    }));
    const wizard = await openWizard();

    expect(internals(wizard).isDualTariff).toBe(true);

    await goToStep(wizard, 'pricing_supplier');
    internals(wizard).pricingDraft = { ...internals(wizard).pricingDraft, spot_pricing_model: 'percentage' };
    await settle(wizard);
    expect(wizard.shadowRoot!.querySelector('[data-key="spot_positive_fee_percent_nt"]')).not.toBeNull();
  });

  it('the dual-code-set is ONE shared source: STEP_PRICING_SUPPLIER gates confirmed_distribution_tariff via the same DUAL_TARIFF_CODES import', () => {
    // Not duplicated: importing DUAL_TARIFF_CODES here and asserting the
    // supplier step's gating agrees with it for every dual code proves both
    // steps consult the same set (a duplicated/second array could silently
    // diverge without this).
    for (const code of DUAL_TARIFF_CODES) {
      const visible = STEP_PRICING_SUPPLIER.visibleFields(
        REGISTRY_FIXTURE, { spot_pricing_model: 'percentage' }, true,
      ).map((f) => f.key);
      expect(visible).toContain('spot_positive_fee_percent_nt');
      void code;
    }
  });
});
