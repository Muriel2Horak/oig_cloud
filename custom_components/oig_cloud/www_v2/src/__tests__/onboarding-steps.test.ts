import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html, render } from 'lit';
import { fieldsFromRegistry } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import { STEP_SOLAR } from '@/ui/features/onboarding/step-solar';
import { STEP_PRICING_DISTRIBUTION } from '@/ui/features/onboarding/step-pricing-distribution';
import { REGISTRY_FIXTURE } from './fixtures/registry-fixture';
import {
  SOLAR_REGISTRY_FIXTURE,
  DEFAULT_SOLAR_DRAFT,
  EMPTY_SOLAR_REGISTRY,
} from './fixtures/solar-registry-fixture';

const fetchOIGAPI = vi.hoisted(() =>
  vi.fn<[path: string, options?: RequestInit], Promise<unknown>>(),
);
const fetchOIGAPITyped = vi.hoisted(() => vi.fn());
const loadFieldRegistryMock = vi.hoisted(() => vi.fn<[], Promise<FieldRegistry | null>>());
const loadModuleConfigMock = vi.hoisted(() => vi.fn().mockResolvedValue({
  modules: {}, battery: {}, solar: {}, boiler: {},
}));

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI,
    fetchOIGAPITyped,
    getHass: vi.fn(async () => ({ auth: { data: { access_token: 'token' } } })),
    getHassSync: vi.fn(() => null),
    refreshHass: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('@/data/settings-data', async () => {
  const actual = await vi.importActual<typeof import('@/data/settings-data')>('@/data/settings-data');
  return {
    ...actual,
    loadModuleConfig: loadModuleConfigMock,
  };
});
vi.mock('@/data/registry-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/registry-data')>();
  return {
    ...actual,
    loadFieldRegistry: loadFieldRegistryMock,
  };
});

import { renderFieldPresenter, type FieldPresenterContext } from '@/ui/features/field-renderer';
import type { FieldDef } from '@/ui/features/settings';
import '@/ui/features/settings';
import '@/ui/features/onboarding';

describe('step ② solar (P3, as narrowed by SCOPE-REVISION #6)', () => {
  it('renders solar fields from the registry, not a local list', () => {
    expect(STEP_SOLAR.fields(REGISTRY_FIXTURE).map((f) => f.key))
      .toEqual(fieldsFromRegistry(REGISTRY_FIXTURE, 'solar').map((f) => f.key));
  });

  it('applies the same provider→key conditional as the settings tab', () => {
    const shown = STEP_SOLAR.visibleFields(REGISTRY_FIXTURE, { solar_forecast_provider: 'solcast' });
    expect(shown.map((f) => f.key)).toContain('solcast_api_key');
    expect(shown.map((f) => f.key)).not.toContain('solar_forecast_api_key');
  });

  it('hides Forecast.Solar geometry for Solcast but keeps local enabled-string kWp', () => {
    const values = {
      ...DEFAULT_SOLAR_DRAFT,
      solar_forecast_provider: 'solcast',
    };
    const keys = STEP_SOLAR.visibleFields(SOLAR_REGISTRY_FIXTURE, values)
      .map((field) => field.key);
    expect(keys).toContain('solar_forecast_string1_kwp');
    expect(keys).not.toContain('solar_forecast_latitude');
    expect(keys).not.toContain('solar_forecast_longitude');
    expect(keys).not.toContain('solar_forecast_string1_declination');
    expect(keys).not.toContain('solar_forecast_string1_azimuth');
  });

  it('[Otestovat] gates only the STEP, never the dashboard (#6)', () => {
    expect(STEP_SOLAR.blocksDashboard).toBe(false);
    expect(STEP_SOLAR.skippable).toBe(true);
  });
});

// ============================================================================
// F1 Plan 3.6 Task 2 — Solar step registry-driven render RED tests
// ============================================================================
describe('solar step render (F1 Plan 3.6 Task 2)', () => {
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
      if (path.includes('/pricelists')) {
        return Promise.resolve({
          distributors: {},
          tariffs: [],
          selected_distributor: '', selected_tariff: '',
          confirmed_distribution_price_incl_vat: 0,
          confirmed_distribution_price_excl_vat: 0,
          confirmed_distribution_unit: '',
          stale_warning: false, valid_from: null, year: null,
        });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('renders ≥6 interactive solar controls via the shared presenter on step-2', async () => {
    const wizard = await fixture<HTMLElement>(html`<oig-onboarding-wizard
      .inverterSn=${'SN123'}
      ?open=${true}
    ></oig-onboarding-wizard>`);
    await (wizard as any).updateComplete;
    // wait for loadFieldRegistry to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (wizard as any).updateComplete;

    // Navigate to solar step
    const solarNavBtn = wizard.shadowRoot!.querySelector(
      'button[data-step="solar"]',
    ) as HTMLButtonElement;
    solarNavBtn.click();
    await (wizard as any).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (wizard as any).updateComplete;

    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    expect(content).toBeTruthy();

    const interactive = content.querySelectorAll('input, select');
    expect(interactive.length).toBeGreaterThanOrEqual(6);

    // Every interactive control lives inside a shared-presenter .row
    const rows = content.querySelectorAll('.row');
    const visible = STEP_SOLAR.visibleFields(
      SOLAR_REGISTRY_FIXTURE,
      DEFAULT_SOLAR_DRAFT as Record<string, unknown>,
    );
    expect(rows.length).toBe(visible.length);
  });

  it('provider switch shows/hides credential fields via isVisible (same predicate as Settings)', async () => {
    const wizard = await fixture<HTMLElement>(html`<oig-onboarding-wizard
      .inverterSn=${'SN123'}
      ?open=${true}
    ></oig-onboarding-wizard>`);
    await (wizard as any).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (wizard as any).updateComplete;

    // Navigate to solar
    const solarNavBtn = wizard.shadowRoot!.querySelector(
      'button[data-step="solar"]',
    ) as HTMLButtonElement;
    solarNavBtn.click();
    await (wizard as any).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (wizard as any).updateComplete;

    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    // With default provider = forecast_solar, forecast_solar credential visible, solcast hidden
    expect(content.querySelectorAll('select').length).toBeGreaterThanOrEqual(1);
    expect(content.textContent).toContain('forecast.solar API klíč');
    expect(content.textContent).not.toContain('Solcast API klíč');
    expect(content.textContent).not.toContain('Solcast site ID');

    // Drive the REAL select — set .value and dispatch a real 'change' event,
    // exactly as a user would, so an onChange-wiring regression fails this test.
    const providerSelect = content.querySelector('select') as HTMLSelectElement;
    expect(providerSelect).toBeTruthy();
    providerSelect.value = 'solcast';
    providerSelect.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await (wizard as any).updateComplete;

    const updatedContent = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const controls = updatedContent.querySelectorAll('select, input');
    // Mirror the wizard's own draft-seeding (registry defaults for provider,
    // mode, string1/2 enabled) so the expected set matches what a real
    // provider-only field change leaves the OTHER draft keys as.
    const seededDraft: Record<string, unknown> = {};
    for (const f of STEP_SOLAR.fields(SOLAR_REGISTRY_FIXTURE)) {
      const spec = SOLAR_REGISTRY_FIXTURE.fields[f.key];
      if (spec?.default !== undefined) seededDraft[f.key] = spec.default;
    }
    const visible = STEP_SOLAR.visibleFields(
      SOLAR_REGISTRY_FIXTURE,
      { ...seededDraft, solar_forecast_provider: 'solcast' },
    );
    expect(controls.length).toBe(visible.length);

    // solcast fields present, forecast_solar-only fields gone.
    expect(updatedContent.textContent).toContain('Solcast API klíč');
    expect(updatedContent.textContent).toContain('Solcast site ID');
    expect(updatedContent.textContent).not.toContain('forecast.solar API klíč');
    expect(updatedContent.textContent).not.toContain('Frekvence aktualizace');
  });

  it('zero solar fields renders visible "not available" state', async () => {
    loadFieldRegistryMock.mockResolvedValueOnce(EMPTY_SOLAR_REGISTRY);

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

    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    expect(content.textContent).toBeTruthy();

    // Must NOT be empty — explicit "not available" text expected
    expect(content.textContent!.trim().length).toBeGreaterThan(0);

    // No .row controls should render
    const rows = content.querySelectorAll('.row');
    expect(rows.length).toBe(0);
  });

  it('all-hidden (both strings disabled): kwp/declination/azimuth absent and visible "enable" hint', async () => {
    loadFieldRegistryMock.mockResolvedValueOnce({
      ...SOLAR_REGISTRY_FIXTURE,
      fields: {
        ...SOLAR_REGISTRY_FIXTURE.fields,
        solar_forecast_string1_enabled: {
          ...SOLAR_REGISTRY_FIXTURE.fields.solar_forecast_string1_enabled,
          default: false,
        },
      },
    });

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

    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    expect(content.textContent).toBeTruthy();

    // All-hidden state shows a visible "enable a string" hint
    const hint = content.querySelector('[data-testid="solar-all-hidden"]');
    expect(hint).toBeTruthy();
    expect(hint!.textContent!.toLowerCase()).toContain('string');

    // No kwp/declination/azimuth inputs: only provider select + optional
    // credential + lat/lon + two bool toggles = 6 interactive controls max.
    // kwp/declination/azimuth number inputs must be absent.
    const numberInputs = content.querySelectorAll('input[type="number"]');
    // latitude and longitude are always visible, but kwp/declination/azimuth
    // depend on string*_enabled=true — both are false here.
    // Only lat and lon number inputs should be visible
    expect(numberInputs.length).toBeLessThanOrEqual(2);
  });

  it('loads the field registry exactly once across Solar→Pricing-distribution navigation', async () => {
    const wizard = await fixture<HTMLElement>(html`<oig-onboarding-wizard
      .inverterSn=${'SN123'}
      ?open=${true}
    ></oig-onboarding-wizard>`);
    await (wizard as any).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (wizard as any).updateComplete;

    // → Solar
    (wizard.shadowRoot!.querySelector('button[data-step="solar"]') as HTMLButtonElement).click();
    await (wizard as any).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (wizard as any).updateComplete;

    // Solar → Pricing-distribution
    (wizard.shadowRoot!.querySelector(
      'button[data-step="pricing_distribution"]',
    ) as HTMLButtonElement).click();
    await (wizard as any).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (wizard as any).updateComplete;

    expect(loadFieldRegistryMock).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// F1 Plan 3.6 Task 6 — [Otestovat] button + typed classified-error client RED tests
// ============================================================================
describe('solar step [Otestovat] button (F1 Plan 3.6 Task 6)', () => {
  const SOLAR_TEST_ALLOWED_WIRE_KEYS = new Set([
    'provider',
    'solar_forecast_mode',
    'solar_forecast_api_key',
    'solcast_api_key',
    'solcast_site_id',
    'solar_forecast_latitude',
    'solar_forecast_longitude',
    'solar_forecast_string1_enabled',
    'solar_forecast_string1_kwp',
    'solar_forecast_string1_declination',
    'solar_forecast_string1_azimuth',
    'solar_forecast_string2_enabled',
    'solar_forecast_string2_kwp',
    'solar_forecast_string2_declination',
    'solar_forecast_string2_azimuth',
  ]);

  beforeEach(() => {
    fetchOIGAPI.mockClear();
    fetchOIGAPITyped.mockClear();
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
  });

  afterEach(() => {
    fixtureCleanup();
  });

  async function openWizardOnSolarStep(): Promise<HTMLElement & Record<string, any>> {
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

    return wizard as HTMLElement & Record<string, any>;
  }

  it('[data-testid="solar-test"] exists on step-2', async () => {
    const wizard = await openWizardOnSolarStep();
    const btn = wizard.shadowRoot!.querySelector('[data-testid="solar-test"]');
    expect(btn).toBeTruthy();
  });

  it('renders legacy azimuth adoption warning from module-config metadata', async () => {
    const wizard = await openWizardOnSolarStep();
    wizard.legacySolarFields = {
      solar_forecast_string1_azimuth: {
        stored_value: -90,
        display_value: 90,
        legacy_provider_value: true,
        requires_adoption: true,
      },
    };
    await wizard.updateComplete;
    const warning = wizard.shadowRoot!.querySelector(
      '[data-testid="legacy-warning-solar_forecast_string1_azimuth"]',
    );
    expect(warning).toBeTruthy();
    expect(warning?.textContent).toContain('-90');
    expect(warning?.textContent).toContain('90');
  });

  it.each([361, 720, 90.5])(
    'renders a corrupt legacy azimuth warning for %s',
    async (storedValue) => {
      const wizard = await openWizardOnSolarStep();
      wizard.legacySolarFields = {
        solar_forecast_string1_azimuth: {
          stored_value: storedValue,
          display_value: null,
          legacy_provider_value: false,
          requires_adoption: false,
          invalid_legacy_value: true,
        },
      };
      await wizard.updateComplete;
      const warning = wizard.shadowRoot!.querySelector(
        '[data-testid="legacy-warning-solar_forecast_string1_azimuth"]',
      );
      expect(warning).toBeTruthy();
      expect(warning?.textContent).toContain(String(storedValue));
      expect(warning?.textContent).toContain('0');
      expect(warning?.textContent).toContain('360');
      expect(warning?.textContent).not.toMatch(/[−-]180\s*°?\s*(?:až|to)\s*360/);
    },
  );

  it('keeps an untouched legacy azimuth out of the candidate DTO, then adopts a same-number touch once', async () => {
    const wizard = await openWizardOnSolarStep();
    wizard.originalValues = {
      ...wizard.originalValues,
      solar_forecast_string1_azimuth: 90,
      unrelated_price: 'old',
    };
    wizard.solarDraft = {
      ...wizard.solarDraft,
      solar_forecast_string1_azimuth: 90,
    };
    wizard.legacySolarFields = {
      solar_forecast_string1_azimuth: {
        stored_value: -90,
        display_value: 90,
        legacy_provider_value: true,
        requires_adoption: true,
      },
    };
    await wizard.updateComplete;

    expect(wizard.buildSolarTestBody()).not.toHaveProperty(
      'solar_forecast_string1_azimuth',
    );

    const azimuthRow = Array.from(wizard.shadowRoot!.querySelectorAll('.row'))
      .find((row) => row.textContent?.includes('String 1 azimut'));
    const input = azimuthRow?.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = '90';
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await wizard.updateComplete;

    expect(wizard.buildSolarTestBody().solar_forecast_string1_azimuth).toBe(90);
    wizard.solarTestProof = 'proof-for-touched-legacy-dto';
    wizard.pricingDraft = { unrelated_price: 'new' };
    fetchOIGAPI.mockClear();
    await wizard.saveAllChangedSections();

    const saveBodies = fetchOIGAPI.mock.calls
      .filter((call) => call[1]?.method === 'POST')
      .map((call) => JSON.parse(call[1]!.body as string));
    expect(saveBodies[0]).toMatchObject({
      section: 'solar',
      values: { solar_forecast_string1_azimuth: 90 },
      adopt_legacy_fields: ['solar_forecast_string1_azimuth'],
      solar_test_proof: 'proof-for-touched-legacy-dto',
    });
    expect(saveBodies.filter((body) => body.section === 'solar')).toHaveLength(1);
  });

  it('click posts the Q1 wire-schema body to /{sn}/solar_test — no extra keys', async () => {
    fetchOIGAPITyped.mockResolvedValueOnce({
      ok: true, status: 200,
      data: { tomorrow_total_kwh: 7.5, forecast_covers_tomorrow: true },
    });

    const wizard = await openWizardOnSolarStep();
    const btn = wizard.shadowRoot!.querySelector('[data-testid="solar-test"]') as HTMLButtonElement;
    btn.click();
    await wizard.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wizard.updateComplete;

    expect(fetchOIGAPITyped).toHaveBeenCalledTimes(1);
    const [path, options] = fetchOIGAPITyped.mock.calls[0];
    expect(path).toBe('/SN123/solar_test');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body as string);
    // Registry key renamed to the Q1 top-level "provider" — never sent as
    // "solar_forecast_provider" (backend rejects unknown fields).
    expect(body.provider).toBe('forecast_solar');
    expect(body).not.toHaveProperty('solar_forecast_provider');
    expect(body.solar_forecast_mode).toBe('hourly');
    for (const key of Object.keys(body)) {
      expect(SOLAR_TEST_ALLOWED_WIRE_KEYS.has(key)).toBe(true);
    }
  });

  it('builds a Solcast DTO without local geometry but keeps allocation kWp', async () => {
    const wizard = await openWizardOnSolarStep();
    wizard.solarDraft = {
      ...wizard.solarDraft,
      solar_forecast_provider: 'solcast',
      solar_forecast_mode: 'daily',
      solcast_api_key: 'secret',
      solcast_site_id: 'roof',
      solar_forecast_latitude: 50.12,
      solar_forecast_longitude: 13.94,
      solar_forecast_string1_enabled: true,
      solar_forecast_string1_kwp: 5.5,
      solar_forecast_string1_declination: 35,
      solar_forecast_string1_azimuth: 180,
      solar_forecast_string2_enabled: false,
    };

    const body = wizard.buildSolarTestBody();
    expect(body).toMatchObject({
      provider: 'solcast',
      solar_forecast_mode: 'daily',
      solcast_api_key: 'secret',
      solcast_site_id: 'roof',
      solar_forecast_string1_enabled: true,
      solar_forecast_string1_kwp: 5.5,
      solar_forecast_string2_enabled: false,
    });
    expect(body).not.toHaveProperty('solar_forecast_latitude');
    expect(body).not.toHaveProperty('solar_forecast_longitude');
    expect(body).not.toHaveProperty('solar_forecast_string1_declination');
    expect(body).not.toHaveProperty('solar_forecast_string1_azimuth');
  });

  it('success shows tomorrow_total_kwh and sets solarTestMatchesDraft', async () => {
    fetchOIGAPITyped.mockResolvedValueOnce({
      ok: true, status: 200,
      data: { tomorrow_total_kwh: 9.42, forecast_covers_tomorrow: true },
    });

    const wizard = await openWizardOnSolarStep();
    const btn = wizard.shadowRoot!.querySelector('[data-testid="solar-test"]') as HTMLButtonElement;
    btn.click();
    await wizard.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wizard.updateComplete;

    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    expect(content.textContent).toContain('9.42');
    expect((wizard as any).solarTestMatchesDraft).toBe(true);
  });

  it.each([
    ['timeout', 504],
    ['auth', 401],
    ['provider_unreachable', 502],
    ['rate_limited', 429],
  ])('classified error %s: readable message, wizard-next stays enabled and actually navigates', async (code, status) => {
    fetchOIGAPITyped.mockResolvedValueOnce({ ok: false, status, code, error: 'boom' });

    const wizard = await openWizardOnSolarStep();
    const btn = wizard.shadowRoot!.querySelector('[data-testid="solar-test"]') as HTMLButtonElement;
    btn.click();
    await wizard.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wizard.updateComplete;

    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const errorEl = content.querySelector('[data-testid="solar-test-error"]');
    expect(errorEl).toBeTruthy();
    expect(errorEl!.textContent!.trim().length).toBeGreaterThan(0);

    const nextBtn = wizard.shadowRoot!.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement;
    const skipBtn = wizard.shadowRoot!.querySelector('[data-testid="wizard-skip"]') as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(false);
    expect(skipBtn.disabled).toBe(false);

    // OQ-B: navigation is never blocked by a failed test — actually click it.
    nextBtn.click();
    await wizard.updateComplete;

    const newContent = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    expect(newContent.querySelector('[data-step="pricing_distribution"]')).toBeTruthy();
  });

  it('editing a solar field after a successful test clears solarTestMatchesDraft', async () => {
    fetchOIGAPITyped.mockResolvedValueOnce({
      ok: true, status: 200,
      data: { tomorrow_total_kwh: 3.1, forecast_covers_tomorrow: true },
    });

    const wizard = await openWizardOnSolarStep();
    const btn = wizard.shadowRoot!.querySelector('[data-testid="solar-test"]') as HTMLButtonElement;
    btn.click();
    await wizard.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wizard.updateComplete;

    expect((wizard as any).solarTestMatchesDraft).toBe(true);

    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const latInput = content.querySelector('input[type="number"]') as HTMLInputElement;
    expect(latInput).toBeTruthy();
    latInput.value = '50.1';
    latInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await wizard.updateComplete;

    expect((wizard as any).solarTestMatchesDraft).toBe(false);
  });
});

describe('step pricing_distribution (stub — F1 Wizard v2 S1 Task 2)', () => {
  it('never blocks the dashboard and is skippable, same contract as every step (#5/#6)', () => {
    expect(STEP_PRICING_DISTRIBUTION.blocksDashboard).toBe(false);
    expect(STEP_PRICING_DISTRIBUTION.skippable).toBe(true);
  });
});

describe('ONBOARDING_STEPS wizard-v2 content steps (F1 Wizard v2 S1 Task 1)', () => {
  it('ONBOARDING_STEPS covers the 9 wizard-v2 content steps (supplier-step split, Nakup/Prodej)', async () => {
    const { ONBOARDING_STEPS, EMPTY_ONBOARDING_STATE } = await import('@/ui/features/onboarding/onboarding-data');
    expect(ONBOARDING_STEPS).toEqual([
      'modules', 'ai', 'solar', 'pricing_distribution', 'pricing_supplier',
      'pricing_supplier_sell', 'battery', 'boiler', 'connection',
    ]);
    expect(Object.keys(EMPTY_ONBOARDING_STATE.steps)).toEqual(ONBOARDING_STEPS);
  });
});

describe('paired-host regression (Task 1 — shared field renderer)', () => {
  afterEach(() => {
    fixtureCleanup();
  });

  it('<oig-settings> field markup is structurally identical to a bare renderFieldPresenter call', async () => {
    const settings = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-settings></oig-settings>`,
    );
    // let the async refresh() (mocked loadModuleConfig/loadFieldRegistry) resolve
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settings.updateComplete;

    // Modules card renders a real bool field in the shared presenter path.
    const liveInput = settings.shadowRoot!.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(liveInput).toBeTruthy();
    const liveRow = liveInput.closest('.row') as HTMLElement;
    expect(liveRow).toBeTruthy();

    // Bare presenter call, explicit ctx — exactly what `oig-onboarding-wizard`
    // will call directly once Task 2 wires it up. Same FieldDef shape as the
    // live 'enable_boiler' bool field.
    const f: FieldDef = { key: 'enable_boiler', label: 'Bojler', type: 'bool', hint: 'Inteligentní ohřev vody' };
    const bare = document.createElement('div');
    render(
      renderFieldPresenter(f, {
        value: false, dirty: false, secretSet: false, onChange: () => undefined, entityCatalog: [],
      }),
      bare,
    );
    const bareRow = bare.querySelector('.row') as HTMLElement;
    expect(bareRow).toBeTruthy();

    // Either host breaking (settings' wrapper drifting from the shared
    // presenter, or the presenter itself changing shape) fails this test.
    expect(liveRow.tagName).toBe(bareRow.tagName);
    expect([...liveRow.classList]).toEqual([...bareRow.classList]);
    expect(liveRow.querySelector('.lab')).toBeTruthy();
    expect(bareRow.querySelector('.lab')).toBeTruthy();
    expect(liveRow.querySelector('.row-control')!.tagName).toBe(bareRow.querySelector('.row-control')!.tagName);
    expect(liveRow.querySelector('input[type="checkbox"]')).toBeTruthy();
    expect(bareRow.querySelector('input[type="checkbox"]')).toBeTruthy();
  });

  it('renders the SAME FieldDef structurally identically in <oig-settings> and <oig-onboarding-wizard>, incl. masked-secret parity', async () => {
    const settings = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-settings></oig-settings>`,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settings.updateComplete;

    const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-wizard></oig-onboarding-wizard>`,
    );
    await wizard.updateComplete;

    // Fails if the wizard host stops adopting the shared field CSS — e.g. someone
    // drops `${fieldStyles}` from its static styles, or the `@/ui/features/field-renderer`
    // import wiring breaks. jsdom has no adoptedStyleSheets support, so Lit falls
    // back to a single <style> tag per shadow root — assert the shared rules are in it.
    const wizardStyleText = wizard.shadowRoot!.querySelector('style')?.textContent ?? '';
    expect(wizardStyleText).toContain('.row-control');
    expect(wizardStyleText).toContain('.optional-badge');

    function renderInto(host: HTMLElement, f: FieldDef, ctx: FieldPresenterContext): HTMLElement {
      const container = document.createElement('div');
      host.shadowRoot!.appendChild(container);
      render(renderFieldPresenter(f, ctx), container);
      return container;
    }

    // Same FieldDef, same ctx, only the host shadow root differs.
    const boolField: FieldDef = { key: 'enable_boiler', label: 'Bojler', type: 'bool', hint: 'Inteligentní ohřev vody' };
    const boolCtx: FieldPresenterContext = {
      value: true, dirty: false, secretSet: false, onChange: () => undefined, entityCatalog: [],
    };
    const settingsBoolRow = renderInto(settings, boolField, boolCtx).querySelector('.row') as HTMLElement;
    const wizardBoolRow = renderInto(wizard, boolField, boolCtx).querySelector('.row') as HTMLElement;
    expect(settingsBoolRow).toBeTruthy();
    expect(wizardBoolRow).toBeTruthy();
    expect(settingsBoolRow.tagName).toBe(wizardBoolRow.tagName);
    expect([...settingsBoolRow.classList]).toEqual([...wizardBoolRow.classList]);
    expect(settingsBoolRow.innerHTML).toBe(wizardBoolRow.innerHTML);

    // A SECRET field — masked value must be identical across both hosts.
    const secretField: FieldDef = {
      key: 'solcast_api_key', label: 'Solcast API klíč', type: 'text', secret: true, optional: true,
    };
    const secretCtx: FieldPresenterContext = {
      value: 'super-secret-value', dirty: false, secretSet: true, onChange: () => undefined, entityCatalog: [],
    };
    const settingsSecret = renderInto(settings, secretField, secretCtx);
    const wizardSecret = renderInto(wizard, secretField, secretCtx);

    const settingsInput = settingsSecret.querySelector('input[type="password"]') as HTMLInputElement;
    const wizardInput = wizardSecret.querySelector('input[type="password"]') as HTMLInputElement;
    expect(settingsInput).toBeTruthy();
    expect(wizardInput).toBeTruthy();
    expect(settingsInput.value).toBe('');
    expect(wizardInput.value).toBe('');
    expect(settingsInput.value).not.toContain('super-secret-value');
    expect(wizardInput.value).not.toContain('super-secret-value');
    expect(settingsInput.getAttribute('placeholder')).toBe(wizardInput.getAttribute('placeholder'));
    expect(settingsInput.getAttribute('placeholder')).toMatch(/nastaveno/);

    // .optional-badge (P2 — moved into shared fieldStyles) renders identically too.
    expect(settingsSecret.querySelector('.optional-badge')?.textContent)
      .toBe(wizardSecret.querySelector('.optional-badge')?.textContent);
  });
});
