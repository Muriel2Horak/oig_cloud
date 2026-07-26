// src/__tests__/onboarding-pricing-distribution.test.ts
//
// F1 Wizard v2 Stage S3 Tasks 14-15 (docs/redesign_2026_07/plans/
// 2026-07-25-wizard-v2-implementation.md:818-923) — pricing-distribution
// step: client-side dual-tariff derivation + NT price display (Task 14),
// and the 5 tariff-schedule fields gated by dual + weekend flag (Task 15).
//
// Field names verified against the LANDED registry (Phase A pre-step,
// config_registry.py:420-552), not guessed from the plan's illustrative
// snippets — see this cluster's final report for the full verified list.

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
import {
  STEP_PRICING_DISTRIBUTION,
  DUAL_TARIFF_CODES,
  isDualTariffCode,
} from '@/ui/features/onboarding/step-pricing-distribution';

/** `RegistrySpec` (registry-data.ts) has no `show_if_all` of its own (F1 U4
 * R3 — the AND-extension is read off the raw wire payload, same as
 * `settings/index.ts`'s `isFieldVisible`) — widen locally for fixture data. */
interface SpecWithAll {
  section: string; type: 'bool' | 'int' | 'float' | 'str'; scope: string;
  label: string; hint: string; default?: unknown;
  min?: number; max?: number; enum?: string[]; optional?: boolean;
  show_if?: { field: string; in: unknown[] };
  show_if_all?: { field: string; in: unknown[] }[];
}

/**
 * Mirrors config_registry.py's `pricing` (:420-456) and `pricing_supplier`
 * (:483-552) sections verbatim — Phase A verified field names/show_if
 * wiring, `dual_tariff_enabled` omitted (registry `hidden=True`, backend
 * never serializes it, `registry_as_api_dict:249-250`).
 */
const fields: Record<string, SpecWithAll> = {
  confirmed_distribution_distributor: {
    section: 'pricing', type: 'str', scope: 'premium', label: 'l', hint: 'h',
    default: 'cez', enum: ['cez', 'egd', 'pre'],
  },
  confirmed_distribution_tariff: {
    section: 'pricing', type: 'str', scope: 'premium', label: 'l', hint: 'h',
    default: 'D01d', enum: ['D01d', 'D02d', 'D25d'],
  },
  confirmed_distribution_price_incl_vat: {
    section: 'pricing', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 0,
  },
  confirmed_distribution_price_excl_vat: {
    section: 'pricing', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 0,
  },
  confirmed_distribution_unit: {
    section: 'pricing', type: 'str', scope: 'premium', optional: true, label: 'l', hint: 'h',
    default: 'Kc/kWh',
  },
  spot_pricing_model: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h',
    default: 'percentage', enum: ['percentage', 'fixed', 'fixed_prices'],
  },
  // Supplier-step redesign (owner correction round 2): relocated to
  // `pricing` (config_registry.py) — distribution does not belong in the
  // supplier contract's step. Neither key is in TARIFF_SCHEDULE_KEYS, so
  // this move has no effect on `distributionFields()`'s own output; kept
  // here (fixture accuracy) since this file's own header promises fields
  // "verified against the LANDED registry, not guessed".
  distribution_fee_vt_kwh: {
    section: 'pricing', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 1.42,
  },
  vat_rate: {
    section: 'pricing', type: 'float', scope: 'premium', label: 'l', hint: 'h', default: 21,
  },
  tariff_vt_start_weekday: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h', default: '6',
    show_if: { field: 'confirmed_distribution_tariff', in: [...DUAL_TARIFF_CODES] },
  },
  tariff_nt_start_weekday: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h', default: '22,2',
    show_if: { field: 'confirmed_distribution_tariff', in: [...DUAL_TARIFF_CODES] },
  },
  tariff_weekend_same_as_weekday: {
    section: 'pricing_supplier', type: 'bool', scope: 'premium', label: 'l', hint: 'h', default: true,
    show_if: { field: 'confirmed_distribution_tariff', in: [...DUAL_TARIFF_CODES] },
  },
  tariff_vt_start_weekend: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', optional: true, label: 'l', hint: 'h',
    default: '',
    show_if_all: [
      { field: 'confirmed_distribution_tariff', in: [...DUAL_TARIFF_CODES] },
      { field: 'tariff_weekend_same_as_weekday', in: [false] },
    ],
  },
  tariff_nt_start_weekend: {
    section: 'pricing_supplier', type: 'str', scope: 'premium', label: 'l', hint: 'h', default: '0',
    show_if_all: [
      { field: 'confirmed_distribution_tariff', in: [...DUAL_TARIFF_CODES] },
      { field: 'tariff_weekend_same_as_weekday', in: [false] },
    ],
  },
};

const REGISTRY_FIXTURE = { sections: ['pricing', 'pricing_supplier'], fields } as unknown as FieldRegistry;

const PRICELISTS_SINGLE_AND_DUAL = {
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
    if (path.includes('/pricelists')) return Promise.resolve(PRICELISTS_SINGLE_AND_DUAL);
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
// Task 17's shared dual-code-set fn (introduced here — Task 14 — and reused
// by step-pricing-supplier.ts / index.ts, not duplicated).
// ============================================================================
describe('dual-tariff code-set derivation (Task 14, shared by Task 17)', () => {
  it('matches the verified 8-code set (UX-SPEC §4a, 30/30 zero-exception split)', () => {
    expect([...DUAL_TARIFF_CODES].sort()).toEqual(
      ['D25d', 'D26d', 'D27d', 'D35d', 'D45d', 'D56d', 'D57d', 'D61d'].sort(),
    );
  });

  it.each(['D25d', 'D26d', 'D27d', 'D35d', 'D45d', 'D56d', 'D57d', 'D61d'])(
    '%s is dual', (code) => expect(isDualTariffCode(code)).toBe(true),
  );
  it.each(['D01d', 'D02d', 'POZE', undefined, ''])(
    '%s is not dual', (code) => expect(isDualTariffCode(code)).toBe(false),
  );
});

// ============================================================================
// STEP_PRICING_DISTRIBUTION contract (unit-level, mirrors onboarding-steps
// .test.ts's STEP_SOLAR coverage style)
// ============================================================================
describe('STEP_PRICING_DISTRIBUTION field set (Task 14/15)', () => {
  it('fields() = the 5 pricing fields + the 5 tariff-schedule fields (moved from supplier) + distribution_fee_vt_kwh/vat_rate (supplier-step redesign relocation)', () => {
    // Supplier-step redesign (owner correction round 2): distribution_fee_vt_kwh
    // and vat_rate moved from the `pricing_supplier` registry section to
    // `pricing` — `distributionFields()` reads the whole `pricing` section
    // generically, so they now surface here automatically, with no code
    // change to this step needed. Rendering them nicely inside this step's
    // UI (vs. flat, ungrouped) is the distribution-step owner's call.
    const keys = STEP_PRICING_DISTRIBUTION.fields(REGISTRY_FIXTURE).map((f) => f.key).sort();
    expect(keys).toEqual([
      'confirmed_distribution_distributor', 'confirmed_distribution_price_excl_vat',
      'confirmed_distribution_price_incl_vat', 'confirmed_distribution_tariff',
      'confirmed_distribution_unit', 'distribution_fee_vt_kwh', 'vat_rate',
      'tariff_nt_start_weekday', 'tariff_nt_start_weekend', 'tariff_vt_start_weekday',
      'tariff_vt_start_weekend', 'tariff_weekend_same_as_weekday',
    ].sort());
  });

  it('never includes pricing_supplier-only fields (spot_pricing_model, dual_tariff_enabled, ...)', () => {
    const keys = STEP_PRICING_DISTRIBUTION.fields(REGISTRY_FIXTURE).map((f) => f.key);
    expect(keys).not.toContain('spot_pricing_model');
    expect(keys).not.toContain('dual_tariff_enabled');
  });

  it('visibleFields hides all 5 tariff-schedule fields for a single-tariff selection', () => {
    const visible = STEP_PRICING_DISTRIBUTION.visibleFields(REGISTRY_FIXTURE, {
      confirmed_distribution_tariff: 'D01d',
    }).map((f) => f.key);
    expect(visible).not.toContain('tariff_vt_start_weekday');
    expect(visible).not.toContain('tariff_vt_start_weekend');
  });

  it('visibleFields shows the 3 base tariff-schedule fields for a dual selection, weekend fields hidden by default', () => {
    const visible = STEP_PRICING_DISTRIBUTION.visibleFields(REGISTRY_FIXTURE, {
      confirmed_distribution_tariff: 'D25d',
      tariff_weekend_same_as_weekday: true,
    }).map((f) => f.key);
    expect(visible).toContain('tariff_vt_start_weekday');
    expect(visible).toContain('tariff_nt_start_weekday');
    expect(visible).toContain('tariff_weekend_same_as_weekday');
    expect(visible).not.toContain('tariff_vt_start_weekend');
    expect(visible).not.toContain('tariff_nt_start_weekend');
  });

  it('visibleFields shows the weekend-override fields when dual AND weekend_same_as_weekday=false', () => {
    const visible = STEP_PRICING_DISTRIBUTION.visibleFields(REGISTRY_FIXTURE, {
      confirmed_distribution_tariff: 'D25d',
      tariff_weekend_same_as_weekday: false,
    }).map((f) => f.key);
    expect(visible).toContain('tariff_vt_start_weekend');
    expect(visible).toContain('tariff_nt_start_weekend');
  });
});

// ============================================================================
// DOM-level render (F1 Plan 3.6-style — real fixture, real click)
// ============================================================================
describe('pricing_distribution step render (Task 14/15)', () => {
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

  it('selecting a dual-tariff code (D25d) shows the dual info line + NT price, no fabricated field-driven endpoint', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_distribution');

    internals(wizard).pricingDraft = { ...internals(wizard).pricingDraft, confirmed_distribution_tariff: 'D25d' };
    await settle(wizard);

    const info = wizard.shadowRoot!.querySelector('[data-testid="tariff-dual-info"]');
    expect(info?.textContent).toContain('Dvoutarifní');

    // Direct-read from `this.pricing.distributors[...][tariff].nt` (plan's
    // preferred option — no Phase A registry field for the NT leg).
    const ntPrice = wizard.shadowRoot!.querySelector('[data-testid="distribution-nt-price"]');
    expect(ntPrice).toBeTruthy();
    expect(ntPrice!.textContent).toContain('1.41');
  });

  it('selecting a single-tariff code (D01d) shows single-tariff info, no NT price, no tariff-schedule fields', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_distribution');

    internals(wizard).pricingDraft = { ...internals(wizard).pricingDraft, confirmed_distribution_tariff: 'D01d' };
    await settle(wizard);

    const info = wizard.shadowRoot!.querySelector('[data-testid="tariff-dual-info"]');
    expect(info?.textContent).toContain('Jednotarifní');
    expect(wizard.shadowRoot!.querySelector('[data-testid="distribution-nt-price"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="tariff_vt_start_weekday"]')).toBeNull();
  });

  it('dual tariff shows the 5 tariff-schedule fields (VT/NT start times, weekend toggle)', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_distribution');

    internals(wizard).pricingDraft = { ...internals(wizard).pricingDraft, confirmed_distribution_tariff: 'D25d' };
    await settle(wizard);

    for (const k of ['tariff_vt_start_weekday', 'tariff_nt_start_weekday', 'tariff_weekend_same_as_weekday']) {
      expect(wizard.shadowRoot!.querySelector(`[data-key="${k}"]`)).not.toBeNull();
    }
  });

  it('tariff_vt_start_weekend/tariff_nt_start_weekend show only when weekend_same_as_weekday=false', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_distribution');

    internals(wizard).pricingDraft = {
      ...internals(wizard).pricingDraft,
      confirmed_distribution_tariff: 'D25d',
      tariff_weekend_same_as_weekday: true,
    };
    await settle(wizard);
    expect(wizard.shadowRoot!.querySelector('[data-key="tariff_vt_start_weekend"]')).toBeNull();

    internals(wizard).pricingDraft = { ...internals(wizard).pricingDraft, tariff_weekend_same_as_weekday: false };
    await settle(wizard);
    expect(wizard.shadowRoot!.querySelector('[data-key="tariff_vt_start_weekend"]')).not.toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="tariff_nt_start_weekend"]')).not.toBeNull();
  });

  it('real select change on confirmed_distribution_tariff (D25d) drives the dual info line — no-op selects must fail this', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_distribution');

    const tariffSelect = wizard.shadowRoot!.querySelector(
      '[data-key="confirmed_distribution_tariff"] select',
    ) as HTMLSelectElement;
    expect(tariffSelect).toBeTruthy();
    tariffSelect.value = 'D25d';
    tariffSelect.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-testid="tariff-dual-info"]')?.textContent)
      .toContain('Dvoutarifní');
    expect(internals(wizard).isDualTariff).toBe(true);
  });

  it('shows the stale-price warning when the pricelists fetch failed (pricingLoadFailed)', async () => {
    const wizard = await openWizard();
    await goToStep(wizard, 'pricing_distribution');
    expect(wizard.shadowRoot!.querySelector('[data-testid="pricing-stale-warning"]')).toBeNull();

    internals(wizard).pricingLoadFailed = true;
    await settle(wizard);
    expect(wizard.shadowRoot!.querySelector('[data-testid="pricing-stale-warning"]')).toBeTruthy();
  });
});
