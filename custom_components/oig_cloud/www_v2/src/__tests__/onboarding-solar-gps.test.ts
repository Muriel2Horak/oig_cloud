// src/__tests__/onboarding-solar-gps.test.ts
//
// Plan Task 12 — Solar GPS "Převzít z Home Assistanta" button: fills
// solar_forecast_latitude/longitude from hass.config, on click only, never
// on mount (R4 — no silent fallback).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';
import { SOLAR_REGISTRY_FIXTURE } from './fixtures/solar-registry-fixture';

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string], Promise<unknown>>());
const fetchOIGAPITyped = vi.hoisted(() => vi.fn());
const loadFieldRegistryMock = vi.hoisted(() => vi.fn<[signal?: AbortSignal], Promise<FieldRegistry | null>>());

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

import '@/ui/features/onboarding';

function moduleConfigFetch(path: string): Promise<unknown> {
  if (path.includes('/onboarding')) {
    return Promise.resolve({
      steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
      timestamps: {},
      provider: null,
      grandfathered: false,
    });
  }
  if (path.includes('/pricelists')) {
    return Promise.resolve({
      distributors: {}, tariffs: [],
      selected_distributor: '', selected_tariff: '',
      confirmed_distribution_price_incl_vat: 0,
      confirmed_distribution_price_excl_vat: 0,
      confirmed_distribution_unit: '',
      stale_warning: false, valid_from: null, year: null,
    });
  }
  return Promise.resolve(null);
}

async function settle(wizard: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> {
  await wizard.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wizard.updateComplete;
}

/** Private-state peek — `solarDraft` has no test-id, same pattern as onboarding-review-mode.test.ts. */
function internals(wizard: HTMLElement): Record<string, any> {
  return wizard as unknown as Record<string, any>;
}

async function openWizardOnSolarStep(hass: unknown = null): Promise<HTMLElement & { updateComplete: Promise<boolean> }> {
  const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
    html`<oig-onboarding-wizard .inverterSn=${'SN123'} .hass=${hass} ?open=${true}></oig-onboarding-wizard>`,
  );
  await settle(wizard);
  const solarNavBtn = wizard.shadowRoot!.querySelector('button[data-step="solar"]') as HTMLButtonElement;
  solarNavBtn.click();
  await settle(wizard);
  return wizard;
}

describe('solar GPS "Převzít z Home Assistanta" button (plan Task 12)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
    fetchOIGAPI.mockImplementation(moduleConfigFetch);
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('renders the button; fills solar_forecast_latitude/longitude from hass.config only on click, never on mount', async () => {
    const hass = { config: { latitude: 49.2, longitude: 16.6 } };
    const wizard = await openWizardOnSolarStep(hass);
    const w = internals(wizard);

    const button = wizard.shadowRoot!.querySelector('[data-testid="solar-gps-from-hass"]') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(w.solarDraft.solar_forecast_latitude).toBeUndefined();
    expect(w.solarDraft.solar_forecast_longitude).toBeUndefined();

    button.click();
    await settle(wizard);

    expect(w.solarDraft.solar_forecast_latitude).toBe(49.2);
    expect(w.solarDraft.solar_forecast_longitude).toBe(16.6);
  });

  it('disables the button when hass.config.latitude is unavailable (nothing to take over)', async () => {
    const wizard = await openWizardOnSolarStep(null);
    const button = wizard.shadowRoot!.querySelector('[data-testid="solar-gps-from-hass"]') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(true);
  });
});
