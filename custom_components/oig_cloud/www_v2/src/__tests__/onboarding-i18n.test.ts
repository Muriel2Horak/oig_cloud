// src/__tests__/onboarding-i18n.test.ts
//
// F1 Plan 3.6 Task 12 (finding #16) — i18n / hassfest gate RED tests.
//
// Tasks 6/7/8/9 embedded classified-error, stale/retry, and Finish-retry
// copy as literal Czech strings directly in onboarding/index.ts. This file
// asserts: (1) those literals are gone from the component source and only
// live in the i18n catalog, (2) the catalog actually drives what renders —
// for every classified `/solar_test` error code, the bootstrap-retry
// states, and Finish's own retry, and (3) a classified error's rendered
// text never leaks a raw secret/site-id/URL/exception even when the
// backend's `error` field carries one (localization must not become a
// redaction bypass — mirrors Task 4's R7.3 sentinel values).

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';
import { SOLAR_REGISTRY_FIXTURE } from './fixtures/solar-registry-fixture';
import { t, type OnboardingKey } from '@/i18n/onboarding';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string, options?: RequestInit], Promise<unknown>>());
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

const ONBOARDING_STATE = {
  steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
  timestamps: {},
  provider: null,
  grandfathered: false,
};

const PRICELISTS = {
  distributors: {}, tariffs: [],
  selected_distributor: '', selected_tariff: '',
  confirmed_distribution_price_incl_vat: 0,
  confirmed_distribution_price_excl_vat: 0,
  confirmed_distribution_unit: '',
  stale_warning: false, valid_from: null, year: null,
};

async function settle(el: { updateComplete: Promise<boolean> }): Promise<void> {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

async function openWizardOnSolarStep(hass: unknown = null): Promise<HTMLElement & { updateComplete: Promise<boolean> } & Record<string, any>> {
  const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
    html`<oig-onboarding-wizard .inverterSn=${'SN123'} .hass=${hass} ?open=${true}></oig-onboarding-wizard>`,
  );
  await settle(wizard);
  // wizard-v2 (Stage S1) inserted welcome/modules ahead of ai/solar — jump
  // straight to solar via its nav indicator (#6: any step directly reachable).
  const solarNavBtn = wizard.shadowRoot!.querySelector('button[data-step="solar"]') as HTMLButtonElement;
  solarNavBtn.click();
  await settle(wizard);
  return wizard as HTMLElement & { updateComplete: Promise<boolean> } & Record<string, any>;
}

describe('onboarding i18n catalog (F1 Plan 3.6 Task 12)', () => {
  const SOURCE = readFileSync(resolve(__dirname, '../ui/features/onboarding/index.ts'), 'utf-8');

  // The exact Czech literals Tasks 6/7/8/9 embedded directly in the
  // component, before this task moved them into i18n/onboarding.ts.
  const RETIRED_LITERALS = [
    'Test vypršel',
    'Neplatný přístupový klíč.',
    'Poskytovatel je nedostupný.',
    'Příliš mnoho pokusů',
    'Neočekávaná odpověď poskytovatele.',
    'Test byl přerušen.',
    'Dokončení už probíhá.',
    'Dokončení se nepodařilo uložit.',
    "'Dokončení se nepodařilo.'",
    'Načtení dat selhalo.',
    'Stav průvodce se nepodařilo načíst.',
    'Uložení se nezdařilo.',
    'Ceny jsou z předchozího roku.',
  ];

  it('no retired literal Czech string remains embedded in onboarding/index.ts', () => {
    for (const literal of RETIRED_LITERALS) {
      expect(SOURCE).not.toContain(literal);
    }
  });

  it('every catalog key used by the component resolves for both cs and en', () => {
    const keys: OnboardingKey[] = [
      'onboarding.solar_test.error.timeout',
      'onboarding.solar_test.error.auth',
      'onboarding.solar_test.error.provider_unreachable',
      'onboarding.solar_test.error.rate_limited',
      'onboarding.solar_test.error.invalid_response',
      'onboarding.solar_test.error.aborted',
      'onboarding.solar_test.error.generic',
      'onboarding.bootstrap.load_failed',
      'onboarding.bootstrap.state_load_failed',
      'onboarding.bootstrap.retry_button',
      'onboarding.pricing.save_error',
      'onboarding.pricing.stale_warning',
      'onboarding.finish.error.in_progress',
      'onboarding.finish.error.save_failed',
      'onboarding.finish.error.reload_timeout',
      'onboarding.finish.error.generic',
    ];
    for (const key of keys) {
      expect(t(key, 'cs').length).toBeGreaterThan(0);
      expect(t(key, 'en').length).toBeGreaterThan(0);
      expect(t(key, 'cs')).not.toBe(key);
      expect(t(key, 'en')).not.toBe(key);
    }
  });
});

describe('onboarding classified-error rendering is catalog-driven (Task 12)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/onboarding')) return Promise.resolve(ONBOARDING_STATE);
      if (path.includes('/pricelists')) return Promise.resolve(PRICELISTS);
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    fixtureCleanup();
  });

  const CODE_KEYS: Record<string, OnboardingKey> = {
    timeout: 'onboarding.solar_test.error.timeout',
    auth: 'onboarding.solar_test.error.auth',
    provider_unreachable: 'onboarding.solar_test.error.provider_unreachable',
    rate_limited: 'onboarding.solar_test.error.rate_limited',
    invalid_response: 'onboarding.solar_test.error.invalid_response',
  };

  it.each([
    ['timeout', 504],
    ['auth', 401],
    ['provider_unreachable', 502],
    ['rate_limited', 429],
    ['invalid_response', 422],
  ])('classified error %s renders exactly the catalog message, not the raw backend error', async (code, status) => {
    // A backend `error` field carrying a secret / site-id / URL / raw
    // exception (Task 4's R7.3 sentinel shapes) — this must NEVER reach the
    // DOM once `code` is classified, or localization becomes a redaction
    // bypass.
    const poisoned =
      'upstream failure key=fs_secret_123456789 site=site-123 ' +
      'url=https://api.forecast.solar/fs_secret_123456789/estimate ' +
      'TimeoutError: verbose upstream timeout with fs_secret_123456789';
    fetchOIGAPITyped.mockResolvedValueOnce({ ok: false, status, code, error: poisoned });

    const wizard = await openWizardOnSolarStep();
    const btn = wizard.shadowRoot!.querySelector('[data-testid="solar-test"]') as HTMLButtonElement;
    btn.click();
    await settle(wizard);

    const errorEl = wizard.shadowRoot!.querySelector('[data-testid="solar-test-error"]') as HTMLElement;
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent!.trim()).toBe(t(CODE_KEYS[code]));

    for (const sentinel of ['fs_secret_123456789', 'site-123', 'https://', 'TimeoutError']) {
      expect(errorEl.textContent).not.toContain(sentinel);
    }
  });

  it('bootstrap retry states render the shared catalog copy', async () => {
    const wizard = await openWizardOnSolarStep();
    (wizard as any).bootstrapRetry = {
      onboardingState: true, registry: true, pricing: true, pricingConfig: true,
    };
    await settle(wizard);

    const solarRetry = wizard.shadowRoot!.querySelector('[data-testid="solar-bootstrap-retry"]');
    expect(solarRetry?.textContent).toBe(t('onboarding.bootstrap.load_failed'));
    const solarRetryBtn = wizard.shadowRoot!.querySelector('[data-testid="solar-bootstrap-retry-button"]');
    expect(solarRetryBtn?.textContent).toBe(t('onboarding.bootstrap.retry_button'));

    const stateRetry = wizard.shadowRoot!.querySelector('[data-testid="onboarding-state-retry"]');
    expect(stateRetry?.textContent).toBe(t('onboarding.bootstrap.state_load_failed'));
  });

  it('Finish retry error renders the catalog copy for a classified finish failure', async () => {
    fetchOIGAPI.mockImplementation((path: string, options?: RequestInit) => {
      if (path.includes('/module_config') && options?.method === 'POST') {
        return Promise.resolve({ updated: true });
      }
      if (path.includes('/onboarding')) return Promise.resolve(ONBOARDING_STATE);
      if (path.includes('/pricelists')) return Promise.resolve(PRICELISTS);
      return Promise.resolve(null);
    });
    fetchOIGAPITyped.mockResolvedValueOnce({ ok: false, status: 409, code: 'finish_in_progress' });

    const wizard = await openWizardOnSolarStep();
    await (wizard as any).finish();
    await settle(wizard);

    const errorEl = wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-error"]');
    expect(errorEl?.textContent).toBe(t('onboarding.finish.error.in_progress'));
    const retryBtn = wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-retry"]');
    expect(retryBtn?.textContent).toBe(t('onboarding.bootstrap.retry_button'));
  });

  // Review must-fix #2: the wizard used to call `t(key)` with no language,
  // so classified-error/retry/stale copy always rendered Czech regardless of
  // `hass.locale`. These tests mount with an English `hass` and drive a real
  // Step-2 (Solar) error through the component — `t(key, 'en')` alone proves
  // the catalog HAS an English string, not that the component RENDERS it.
  it('renders English Step-2 classified-error text when hass.locale.language is en', async () => {
    fetchOIGAPITyped.mockResolvedValueOnce({ ok: false, status: 504, code: 'timeout', error: 'boom' });

    const wizard = await openWizardOnSolarStep({ locale: { language: 'en' } });
    const btn = wizard.shadowRoot!.querySelector('[data-testid="solar-test"]') as HTMLButtonElement;
    btn.click();
    await settle(wizard);

    const errorEl = wizard.shadowRoot!.querySelector('[data-testid="solar-test-error"]') as HTMLElement;
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent!.trim()).toBe(t('onboarding.solar_test.error.timeout', 'en'));
    expect(errorEl.textContent!.trim()).not.toBe(t('onboarding.solar_test.error.timeout', 'cs'));
  });

  it('renders English bootstrap-retry copy when hass.language is en (fallback field, no locale object)', async () => {
    const wizard = await openWizardOnSolarStep({ language: 'en' });
    (wizard as any).bootstrapRetry = { onboardingState: false, registry: true, pricing: false, pricingConfig: false };
    await settle(wizard);

    const solarRetry = wizard.shadowRoot!.querySelector('[data-testid="solar-bootstrap-retry"]');
    expect(solarRetry?.textContent).toBe(t('onboarding.bootstrap.load_failed', 'en'));
    const solarRetryBtn = wizard.shadowRoot!.querySelector('[data-testid="solar-bootstrap-retry-button"]');
    expect(solarRetryBtn?.textContent).toBe(t('onboarding.bootstrap.retry_button', 'en'));
  });
});
