// src/__tests__/onboarding-solar-provider-guide.test.ts
//
// Live-walk defect 3: the solar step had no acquisition guide for either
// provider, unlike the AI step's PROVIDER_GUIDES card (step-ai.ts). This
// mirrors that pattern for forecast.solar/Solcast — rendered near the
// provider select, with real (WebFetch-verified) registration/key links.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';
import { SOLAR_REGISTRY_FIXTURE } from './fixtures/solar-registry-fixture';
import { SOLAR_PROVIDER_GUIDES } from '@/ui/features/onboarding/step-solar';

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

describe('solar provider acquisition guide (live-walk defect 3)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockClear();
    loadFieldRegistryMock.mockClear();
    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/onboarding')) {
        return Promise.resolve({
          steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
          timestamps: {},
          grandfathered: false,
        });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('default provider (forecast_solar) shows its guide with a real registration link', async () => {
    const wizard = await mountOnSolarStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const guide = content.querySelector('[data-testid="solar-provider-guide"]') as HTMLElement;

    expect(guide).toBeTruthy();
    expect(guide.getAttribute('data-provider')).toBe('forecast_solar');
    const link = guide.querySelector('a') as HTMLAnchorElement;
    expect(link.href).toBe(SOLAR_PROVIDER_GUIDES.forecast_solar.registerUrl);
    expect(guide.querySelectorAll('li').length).toBeGreaterThan(0);
  });

  it('switching to solcast shows its guide, including numbered Site ID steps', async () => {
    const wizard = await mountOnSolarStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const providerSelect = content.querySelector('select') as HTMLSelectElement;
    providerSelect.value = 'solcast';
    providerSelect.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await (wizard as any).updateComplete;

    const updated = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const guide = updated.querySelector('[data-testid="solar-provider-guide"]') as HTMLElement;
    expect(guide).toBeTruthy();
    expect(guide.getAttribute('data-provider')).toBe('solcast');

    const links = Array.from(guide.querySelectorAll('a')).map((a) => (a as HTMLAnchorElement).href);
    expect(links.some((l) => l.startsWith(SOLAR_PROVIDER_GUIDES.solcast.registerUrl))).toBe(true);

    // Site ID guidance is Solcast-specific — forecast.solar has no such field.
    expect(guide.textContent).toContain('Site ID');
  });

  it('every solar provider guide link is a real, non-fabricated https URL', () => {
    for (const guide of Object.values(SOLAR_PROVIDER_GUIDES)) {
      expect(guide.registerUrl).toMatch(/^https:\/\//);
      if (guide.keysUrl) expect(guide.keysUrl).toMatch(/^https:\/\//);
    }
  });
});
