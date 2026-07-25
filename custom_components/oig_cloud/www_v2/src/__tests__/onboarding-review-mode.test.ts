// src/__tests__/onboarding-review-mode.test.ts
//
// F1 Wizard v2 Stage S2 (Tasks 6-11) — review-mode state: originalValues
// snapshot, per-field diff hints, entry.options seeding, the step-9 diff
// table, the single final save, and the recovered-values / module-off notes
// (UX-SPEC-wizard-v2.md §3).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';
import { SOLAR_REGISTRY_FIXTURE } from './fixtures/solar-registry-fixture';

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
  return {
    ...actual,
    loadFieldRegistry: loadFieldRegistryMock,
  };
});
vi.mock('@/data/settings-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/settings-data')>();
  return {
    ...actual,
    saveModuleConfig: saveModuleConfigMock,
  };
});

import '@/ui/features/onboarding';

const REVIEW_ONBOARDING_STATE = {
  schema_version: 1,
  steps: {
    modules: 'done', ai: 'done', solar: 'done', pricing_distribution: 'done',
    pricing_supplier: 'done', battery: 'done', boiler: 'done', connection: 'done',
  },
  timestamps: {},
  provider: 'forecast_solar',
  grandfathered: true,
  banner_dismissed: true,
};

const PRICELISTS = {
  distributors: { cez: { D57d: { price_incl_vat: 7.1, price_excl_vat: 5.6, unit: 'Kc/kWh' } } },
  tariffs: ['D57d'],
  selected_distributor: 'cez', selected_tariff: 'D57d',
  confirmed_distribution_price_incl_vat: 7.1,
  confirmed_distribution_price_excl_vat: 5.6,
  confirmed_distribution_unit: 'Kc/kWh',
  stale_warning: false, valid_from: null, year: 2026,
};

function moduleConfigFetch(doc: Record<string, unknown>) {
  return (path: string): Promise<unknown> => {
    if (path.includes('/onboarding')) return Promise.resolve(REVIEW_ONBOARDING_STATE);
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

/** Private-state peek — every review-mode assertion needs to read wizard
 * internals no test-id exposes yet (originalValues, drafts). */
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

describe('originalValues snapshot + review-mode detection (Task 6)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('snapshots entry.options-derived module_config once at bootstrap, unaffected by later draft edits', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      battery: { charge_rate_kw: 2.8 },
      pricing: { confirmed_distribution_distributor: 'cez' },
    }));

    const wizard = await openWizard();
    const w = internals(wizard);

    expect(w.originalValues.charge_rate_kw).toBe(2.8);

    // Mutate a live draft after the snapshot — the snapshot must not move.
    w.pricingDraft = { ...w.pricingDraft, confirmed_distribution_distributor: 'egd' };
    await wizard.updateComplete;

    expect(w.originalValues.charge_rate_kw).toBe(2.8);
    expect(w.originalValues.confirmed_distribution_distributor).toBe('cez');
  });

  it('does not overwrite the snapshot on a second startBootstrap within the same test — a fresh open resets it', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({ battery: { charge_rate_kw: 2.8 } }));
    const wizard = await openWizard();
    const w = internals(wizard);
    expect(w.originalValues.charge_rate_kw).toBe(2.8);

    fixtureCleanup();
    fetchOIGAPI.mockImplementation(moduleConfigFetch({ battery: { charge_rate_kw: 3.4 } }));
    const wizard2 = await openWizard();
    expect(internals(wizard2).originalValues.charge_rate_kw).toBe(3.4);
  });
});
