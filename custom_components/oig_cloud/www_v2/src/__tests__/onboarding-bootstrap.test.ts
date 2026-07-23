// src/__tests__/onboarding-bootstrap.test.ts
//
// F1 Plan 3.6 Task 9 (finding #11; R9.2/R10.2) — bounded wizard bootstrap.
// A never-resolving bootstrap fetch must not hang the wizard forever: the
// request is aborted at 3s, the affected step shows a classified retry
// state by the 5s shared deadline, and wizard-close/wizard-skip/dashboard
// nav stay usable throughout (proven by clicking them, not by reading
// `disabled`). Separately: the four bootstrap endpoints must each fire at
// most once per open, across step navigation and a fresh remount.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';
import { SOLAR_REGISTRY_FIXTURE } from './fixtures/solar-registry-fixture';

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
  distributors: { cez: { D57d: { price_incl_vat: 7.1, price_excl_vat: 5.6, unit: 'Kc/kWh' } } },
  tariffs: ['D57d'],
  selected_distributor: 'cez', selected_tariff: 'D57d',
  confirmed_distribution_price_incl_vat: 7.1,
  confirmed_distribution_price_excl_vat: 5.6,
  confirmed_distribution_unit: 'Kc/kWh',
  stale_warning: false, valid_from: null, year: 2026,
};

const MODULE_CONFIG = {
  pricing: {
    confirmed_distribution_distributor: 'cez',
    confirmed_distribution_tariff: 'D57d',
    confirmed_distribution_price_incl_vat: 7.1,
    confirmed_distribution_price_excl_vat: 5.6,
    confirmed_distribution_unit: 'Kc/kWh',
  },
};

function defaultFetchOIGAPI(path: string): Promise<unknown> {
  if (path.includes('/onboarding')) return Promise.resolve(ONBOARDING_STATE);
  if (path.includes('/pricelists')) return Promise.resolve(PRICELISTS);
  if (path.includes('/module_config')) return Promise.resolve(MODULE_CONFIG);
  return Promise.resolve(null);
}

/** Rejects with an AbortError when `signal` fires — like real `fetch`, the
 * OPPOSITE of a promise that just never settles. Never resolves otherwise. */
function abortAware<T = unknown>(signal: AbortSignal | undefined): Promise<T> {
  return new Promise((_resolve, reject) => {
    if (!signal) return;
    const onAbort = () => reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/** `fetchOIGAPI` mock that hangs (then rejects on abort, like real `fetch`)
 * for any GET whose path matches one of `hangPaths`; everything else
 * resolves via `defaultFetchOIGAPI`. POSTs (e.g. complete_step/finish) never
 * hang, even against a matching path. */
function abortAwareFetch(hangPaths: string[]) {
  return (path: string, options?: RequestInit): Promise<unknown> => {
    const isHang = options?.method !== 'POST' && hangPaths.some((p) => path.includes(p));
    if (isHang) return abortAware(options?.signal ?? undefined);
    return defaultFetchOIGAPI(path);
  };
}

async function settle(wizard: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> {
  await wizard.updateComplete;
  if (vi.isFakeTimers()) {
    // Flushes the microtask chain behind a click handler (fetch mock resolve
    // -> await unwrap -> state assignment -> re-render) — a bare
    // `Promise.resolve()` tick is not enough hops under fake timers.
    await vi.advanceTimersByTimeAsync(0);
  } else {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await wizard.updateComplete;
}

describe('bounded wizard bootstrap (F1 Plan 3.6 Task 9)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    fetchOIGAPI.mockImplementation(defaultFetchOIGAPI);
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
  });

  afterEach(() => {
    fixtureCleanup();
    vi.useRealTimers();
  });

  it('aborts a hung registry fetch at 3s and shows a retry state by 5s, without disabling close/skip', async () => {
    vi.useFakeTimers();

    let capturedSignal: AbortSignal | undefined;
    loadFieldRegistryMock.mockImplementation((signal?: AbortSignal) => {
      capturedSignal = signal;
      // Realistic: rejects when the signal fires, like real `fetch` — NOT a
      // promise that just never settles (Finding 3: the opposite of real
      // fetch masked the "aborted looks settled" bug).
      return abortAware(signal);
    });

    const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard
        .inverterSn=${'SN123'}
        ?open=${true}
      ></oig-onboarding-wizard>`,
    );
    await settle(wizard);

    // Before the 3s per-request deadline the signal must not be aborted yet.
    expect(capturedSignal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(3000);
    expect(capturedSignal?.aborted).toBe(true);

    // Navigate to the affected (solar) step — no retry state yet at 3s, and
    // the generic "not available" path must not substitute for it either.
    const nextBtn = wizard.shadowRoot!.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement;
    nextBtn.click();
    await settle(wizard);
    expect(wizard.shadowRoot!.querySelector('[data-testid="solar-bootstrap-retry"]')).toBeFalsy();

    await vi.advanceTimersByTimeAsync(2000); // total 5s
    await settle(wizard);
    expect(wizard.shadowRoot!.querySelector('[data-testid="solar-bootstrap-retry"]')).toBeTruthy();
    expect(wizard.shadowRoot!.querySelector('[data-testid="solar-not-available"]')).toBeFalsy();

    // wizard-skip must be REAL clickable — click it and observe the effect
    // (advances past solar to pricing), not merely "not disabled".
    const skipBtn = wizard.shadowRoot!.querySelector('[data-testid="wizard-skip"]') as HTMLButtonElement;
    expect(skipBtn.disabled).toBe(false);
    skipBtn.click();
    await settle(wizard);
    const active = wizard.shadowRoot!.querySelector('button.active') as HTMLButtonElement | null;
    expect(active?.getAttribute('data-step')).toBe('pricing');

    // wizard-close must be REAL clickable too — click it and observe the close.
    const closeBtn = wizard.shadowRoot!.querySelector('[data-testid="wizard-close"]') as HTMLButtonElement;
    closeBtn.click();
    await settle(wizard);
    expect(wizard.hasAttribute('open')).toBe(false);
  });

  it('an aborted onboarding-state fetch (a second, distinct endpoint) shows its own classified retry at 5s', async () => {
    vi.useFakeTimers();
    fetchOIGAPI.mockImplementation(abortAwareFetch(['/onboarding']));

    const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard
        .inverterSn=${'SN123'}
        ?open=${true}
      ></oig-onboarding-wizard>`,
    );
    await settle(wizard);

    await vi.advanceTimersByTimeAsync(3000); // abort fires, onboarding fetch rejects
    await settle(wizard);
    expect(wizard.shadowRoot!.querySelector('[data-testid="onboarding-state-retry"]')).toBeFalsy();

    await vi.advanceTimersByTimeAsync(2000); // total 5s
    await settle(wizard);
    expect(wizard.shadowRoot!.querySelector('[data-testid="onboarding-state-retry"]')).toBeTruthy();
  });

  it('close aborts the bootstrap controller and clears both timers (no leaked request or timer)', async () => {
    vi.useFakeTimers();
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
    loadFieldRegistryMock.mockImplementation((signal?: AbortSignal) => abortAware(signal));

    const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard
        .inverterSn=${'SN123'}
        ?open=${true}
      ></oig-onboarding-wizard>`,
    );
    await settle(wizard);

    // The 3s abort timer + 5s deadline timer are both pending mid-bootstrap.
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    const closeBtn = wizard.shadowRoot!.querySelector('[data-testid="wizard-close"]') as HTMLButtonElement;
    closeBtn.click();
    await settle(wizard);

    expect(abortSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    abortSpy.mockRestore();
  });

  it('the retry button re-fetches and clears the retry state on success', async () => {
    vi.useFakeTimers();

    loadFieldRegistryMock.mockImplementation(() => new Promise(() => undefined));

    const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard
        .inverterSn=${'SN123'}
        ?open=${true}
      ></oig-onboarding-wizard>`,
    );
    await settle(wizard);

    (wizard.shadowRoot!.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement).click();
    await settle(wizard);

    await vi.advanceTimersByTimeAsync(5000);
    await settle(wizard);
    expect(wizard.shadowRoot!.querySelector('[data-testid="solar-bootstrap-retry"]')).toBeTruthy();

    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
    (wizard.shadowRoot!.querySelector('[data-testid="solar-bootstrap-retry-button"]') as HTMLButtonElement).click();
    await settle(wizard);
    await Promise.resolve();
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-testid="solar-bootstrap-retry"]')).toBeFalsy();
    expect(wizard.shadowRoot!.querySelector('[data-testid="solar-test"]')).toBeTruthy();
  });

  it('fetches each of the four bootstrap endpoints at most once per open across step nav, close, and a fresh remount', async () => {
    let wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard
        .inverterSn=${'SN123'}
        ?open=${true}
      ></oig-onboarding-wizard>`,
    );
    await settle(wizard);

    const nextBtn = () => wizard.shadowRoot!.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement;
    nextBtn().click(); // -> solar
    await settle(wizard);
    nextBtn().click(); // -> pricing
    await settle(wizard);

    (wizard.shadowRoot!.querySelector('[data-testid="wizard-close"]') as HTMLButtonElement).click();
    await settle(wizard);

    // Only count the bootstrap GET — `wizard-next` also POSTs `complete_step`
    // to the same `/onboarding` path, which is a separate call budget.
    const callsFor = (path: string) => fetchOIGAPI.mock.calls.filter(
      ([p, options]) => p.includes(path) && options?.method !== 'POST',
    ).length;
    expect(callsFor('/onboarding')).toBe(1);
    expect(callsFor('/pricelists')).toBe(1);
    expect(callsFor('/module_config')).toBe(1);
    expect(loadFieldRegistryMock).toHaveBeenCalledTimes(1);

    // A fresh remount (new instance) starts its own budget from zero.
    fixtureCleanup();
    fetchOIGAPI.mockClear();
    loadFieldRegistryMock.mockClear();

    wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard
        .inverterSn=${'SN123'}
        ?open=${true}
      ></oig-onboarding-wizard>`,
    );
    await settle(wizard);

    expect(callsFor('/onboarding')).toBe(1);
    expect(callsFor('/pricelists')).toBe(1);
    expect(callsFor('/module_config')).toBe(1);
    expect(loadFieldRegistryMock).toHaveBeenCalledTimes(1);
  });
});
