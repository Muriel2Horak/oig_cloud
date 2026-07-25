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

async function openWizardOnSummary(): Promise<HTMLElement & { updateComplete: Promise<boolean> }> {
  const wizard = await openWizard();
  const nextBtn = () => wizard.shadowRoot!.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement;
  const activeStep = () => wizard.shadowRoot!.querySelector('button.active')?.getAttribute('data-step');
  for (let i = 0; i < 12 && activeStep() !== 'summary'; i++) {
    nextBtn().click();
    await settle(wizard);
  }
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

describe('seed every step draft from entry.options in review mode (Task 8)', () => {
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

  it('review mode (grandfathered) seeds solarDraft from module_config, not registry defaults', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      solar: {
        solar_forecast_provider: 'solcast', // registry default is 'forecast_solar' — proves the source
        solar_forecast_latitude: 49.5,
        solar_forecast_longitude: 14.0,
      },
    }));

    const wizard = await openWizard();
    const w = internals(wizard);

    expect(w.solarDraft.solar_forecast_provider).toBe('solcast');
    expect(w.solarDraft.solar_forecast_latitude).toBe(49.5);
    expect(w.solarDraft.solar_forecast_longitude).toBe(14.0);
  });

  it('new install (no module_config solar section) leaves fields empty, no fabricated value', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      solar: {
        solar_forecast_provider: 'forecast_solar',
        solar_forecast_latitude: null,
        solar_forecast_longitude: null,
      },
    }));

    const wizard = await openWizard();
    const w = internals(wizard);

    // No live source and no registry default (SOLAR_REGISTRY_FIXTURE) for
    // lat/lon — must stay empty, never a fabricated coordinate.
    expect(w.solarDraft.solar_forecast_latitude).toBeUndefined();
    expect(w.solarDraft.solar_forecast_longitude).toBeUndefined();
    // A field WITH a registry default still gets it (registry-default
    // fallback for a genuinely-unset field is correct, per spec §3).
    expect(w.solarDraft.solar_forecast_string1_enabled).toBe(true);
  });

});

describe('step-9 full diff table in review mode (Task 9)', () => {
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

  it('renders one row per CHANGED field only, columns Pole/Bylo/Nyní', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      solar: {
        solar_forecast_provider: 'forecast_solar', solar_forecast_mode: 'hourly',
        solar_forecast_string1_enabled: true, solar_forecast_string2_enabled: false,
        solar_forecast_latitude: 49.5, solar_forecast_longitude: 14.0,
      },
      pricing: { confirmed_distribution_distributor: 'cez', confirmed_distribution_tariff: 'D57d' },
    }));

    const wizard = await openWizardOnSummary();
    expect(internals(wizard).currentStep).toBe('summary');

    // Edit a solar field so it diverges from its snapshot — the summary
    // step reads whatever is in solarDraft NOW, no re-fetch needed.
    internals(wizard).solarDraft = { ...internals(wizard).solarDraft, solar_forecast_latitude: 50.1 };
    await wizard.updateComplete;

    const rows = wizard.shadowRoot!.querySelectorAll('[data-testid="summary-diff-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('49.5');
    expect(rows[0].textContent).toContain('50.1');
  });

  it('shows the empty-diff message and the confirm-copy notice when nothing changed', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      solar: {
        solar_forecast_provider: 'forecast_solar', solar_forecast_mode: 'hourly',
        solar_forecast_string1_enabled: true, solar_forecast_string2_enabled: false,
        solar_forecast_latitude: 49.5, solar_forecast_longitude: 14.0,
      },
    }));
    const wizard = await openWizardOnSummary();

    expect(wizard.shadowRoot!.querySelector('[data-testid="summary-diff-row"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-testid="summary-diff-empty"]')).toBeTruthy();
    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]')?.textContent)
      .toContain('Toto se změní. Dokud nekliknete na Uložit, nic se neuloží.');
  });

  it('the summary save button reads "Uložit" in review mode (spec §6 — same primary-action convention)', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({ solar: { solar_forecast_provider: 'forecast_solar' } }));
    const wizard = await openWizardOnSummary();
    expect((wizard.shadowRoot!.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement).textContent)
      .toBe('Uložit');
  });
});

describe('single final save at step 9 (Task 10)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
    saveModuleConfigMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('summary Uložit saves every changed section in one batch, nothing before it', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      solar: {
        solar_forecast_provider: 'forecast_solar', solar_forecast_mode: 'hourly',
        solar_forecast_string1_enabled: true, solar_forecast_string2_enabled: false,
        solar_forecast_latitude: 49.5, solar_forecast_longitude: 14.0,
      },
      pricing: { confirmed_distribution_distributor: 'cez', confirmed_distribution_tariff: 'D57d' },
    }));

    const wizard = await openWizardOnSummary();
    // No save before the summary step's own save click.
    expect(saveModuleConfigMock).not.toHaveBeenCalled();

    // Change a solar field and a pricing field.
    internals(wizard).solarDraft = { ...internals(wizard).solarDraft, solar_forecast_latitude: 50.1 };
    internals(wizard).pricingDraft = { ...internals(wizard).pricingDraft, confirmed_distribution_distributor: 'egd' };
    await wizard.updateComplete;

    (wizard.shadowRoot!.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(saveModuleConfigMock).toHaveBeenCalledTimes(2);
    expect(saveModuleConfigMock).toHaveBeenCalledWith('solar', { solar_forecast_latitude: 50.1 });
    expect(saveModuleConfigMock).toHaveBeenCalledWith('pricing', { confirmed_distribution_distributor: 'egd' });
  });

  it('does not call saveModuleConfig for a section with no changes', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      solar: {
        solar_forecast_provider: 'forecast_solar', solar_forecast_mode: 'hourly',
        solar_forecast_string1_enabled: true, solar_forecast_string2_enabled: false,
        solar_forecast_latitude: 49.5, solar_forecast_longitude: 14.0,
      },
      pricing: { confirmed_distribution_distributor: 'cez', confirmed_distribution_tariff: 'D57d' },
    }));

    const wizard = await openWizardOnSummary();
    internals(wizard).solarDraft = { ...internals(wizard).solarDraft, solar_forecast_latitude: 50.1 };
    await wizard.updateComplete;

    (wizard.shadowRoot!.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(saveModuleConfigMock).toHaveBeenCalledTimes(1);
    expect(saveModuleConfigMock).toHaveBeenCalledWith('solar', { solar_forecast_latitude: 50.1 });
  });
});

describe('re-seed ordering (Task 8 continued)', () => {
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

  it('re-seeds correctly regardless of which of the two bootstrap fetches settles first', async () => {
    let releaseRegistry: (() => void) | undefined;
    loadFieldRegistryMock.mockImplementation(
      () => new Promise((resolve) => { releaseRegistry = () => resolve(SOLAR_REGISTRY_FIXTURE); }),
    );
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      solar: { solar_forecast_provider: 'solcast', solar_forecast_latitude: 49.5, solar_forecast_longitude: 14.0 },
    }));

    const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard .inverterSn=${'SN123'} ?open=${true}></oig-onboarding-wizard>`,
    );
    await settle(wizard);
    // module_config has settled; the registry fetch is still pending.
    expect(internals(wizard).originalValues.solar_forecast_latitude).toBe(49.5);
    expect(internals(wizard).solarDraft.solar_forecast_latitude).toBeUndefined();

    releaseRegistry?.();
    await settle(wizard);
    expect(internals(wizard).solarDraft.solar_forecast_latitude).toBe(49.5);
  });
});
