// src/__tests__/onboarding-secret-set-state.test.ts
//
// Live-walk defect 2: the owner has a saved forecast.solar/Solcast key, but
// the wizard's solar step renders the secret input as if unset — every
// `renderFieldPresenter` call in onboarding/index.ts hardcodes
// `secretSet: false`, instead of reading the `{key}_set` flag the backend
// already emits on GET /module_config (ha_rest_api.py:1166-1169, mirrored by
// the settings tab's own `secretSet` computation, settings/index.ts:612).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';
import { SOLAR_REGISTRY_FIXTURE, DEFAULT_SOLAR_DRAFT } from './fixtures/solar-registry-fixture';

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string], Promise<unknown>>());
const fetchOIGAPITyped = vi.hoisted(() => vi.fn());
const loadFieldRegistryMock = vi.hoisted(() => vi.fn<[], Promise<FieldRegistry | null>>());

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

import '@/ui/features/onboarding';

async function mountOnSolarStep(): Promise<HTMLElement> {
  const wizard = await fixture<HTMLElement>(html`<oig-onboarding-wizard
    .inverterSn=${'SN123'}
    ?open=${true}
  ></oig-onboarding-wizard>`);
  await (wizard as any).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (wizard as any).updateComplete;

  const solarNavBtn = wizard.shadowRoot!.querySelector(
    'button[data-step="solar"]',
  ) as HTMLButtonElement;
  solarNavBtn.click();
  await (wizard as any).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (wizard as any).updateComplete;

  return wizard;
}

describe('solar step secret set-state (live-walk defect 2)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockClear();
    loadFieldRegistryMock.mockClear();
    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('a saved forecast.solar key renders "nastaveno", never the value, never a blank/unset look', async () => {
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/onboarding')) {
        return Promise.resolve({
          steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
          timestamps: {},
          grandfathered: false,
        });
      }
      if (path.includes('/module_config')) {
        return Promise.resolve({
          modules: {}, battery: {},
          solar: { ...DEFAULT_SOLAR_DRAFT, solar_forecast_api_key_set: true },
          boiler: {},
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
    });

    const wizard = await mountOnSolarStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const keyInput = content.querySelector('input[type="password"]') as HTMLInputElement;

    expect(keyInput).toBeTruthy();
    expect(keyInput.placeholder).toBe('••••• (nastaveno)');
    expect(keyInput.value).toBe(''); // write-only: never echoes the saved value
  });

  it('an unset forecast.solar key renders the unset placeholder, not "nastaveno"', async () => {
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/onboarding')) {
        return Promise.resolve({
          steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
          timestamps: {},
          grandfathered: false,
        });
      }
      if (path.includes('/module_config')) {
        return Promise.resolve({
          modules: {}, battery: {},
          solar: { ...DEFAULT_SOLAR_DRAFT, solar_forecast_api_key_set: false },
          boiler: {},
        });
      }
      return Promise.resolve(null);
    });

    const wizard = await mountOnSolarStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const keyInput = content.querySelector('input[type="password"]') as HTMLInputElement;

    expect(keyInput).toBeTruthy();
    expect(keyInput.placeholder).toBe('nenastaveno');
  });

  it('a saved Solcast key+site_id both render "nastaveno" after switching provider', async () => {
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/onboarding')) {
        return Promise.resolve({
          steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
          timestamps: {},
          grandfathered: false,
        });
      }
      if (path.includes('/module_config')) {
        return Promise.resolve({
          modules: {}, battery: {},
          solar: {
            ...DEFAULT_SOLAR_DRAFT,
            solar_forecast_provider: 'solcast',
            solcast_api_key_set: true,
          },
          boiler: {},
        });
      }
      return Promise.resolve(null);
    });

    const wizard = await mountOnSolarStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const providerSelect = content.querySelector('select') as HTMLSelectElement;
    providerSelect.value = 'solcast';
    providerSelect.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await (wizard as any).updateComplete;

    const updated = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const keyInput = updated.querySelector('input[type="password"]') as HTMLInputElement;
    expect(keyInput).toBeTruthy();
    expect(keyInput.placeholder).toBe('••••• (nastaveno)');
    expect(keyInput.value).toBe('');
  });
});
