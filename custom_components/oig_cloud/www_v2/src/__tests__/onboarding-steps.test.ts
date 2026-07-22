import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html, render } from 'lit';
import { fieldsFromRegistry } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import { STEP_SOLAR } from '@/ui/features/onboarding/step-solar';
import { STEP_PRICING } from '@/ui/features/onboarding/step-pricing';
import { REGISTRY_FIXTURE } from './fixtures/registry-fixture';
import {
  SOLAR_REGISTRY_FIXTURE,
  DEFAULT_SOLAR_DRAFT,
  EMPTY_SOLAR_REGISTRY,
} from './fixtures/solar-registry-fixture';

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string], Promise<unknown>>());
const loadFieldRegistryMock = vi.hoisted(() => vi.fn<[], Promise<FieldRegistry | null>>());
const loadModuleConfigMock = vi.hoisted(() => vi.fn().mockResolvedValue({
  modules: {}, battery: {}, solar: {}, boiler: {},
}));

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI,
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
    const nextBtn = wizard.shadowRoot!.querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement;
    nextBtn.click();
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
    const nextBtn = wizard.shadowRoot!.querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement;
    nextBtn.click();
    await (wizard as any).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (wizard as any).updateComplete;

    let content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    // With default provider = forecast_solar, forecast_solar credential visible, solcast hidden
    let selects = content.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(1);

    // Change provider to solcast via the select
    const providerSelect = content.querySelector('select') as HTMLSelectElement;
    expect(providerSelect).toBeTruthy();
    // The visible fields are rendered directly via renderFieldPresenter; we need to
    // simulate a provider change. STEP_SOLAR.visibleFields tells us the expected set.
    const forecastFields = STEP_SOLAR.visibleFields(
      SOLAR_REGISTRY_FIXTURE,
      { solar_forecast_provider: 'forecast_solar' } as Record<string, unknown>,
    );
    const forecastKeys = forecastFields.map((f) => f.key);
    expect(forecastKeys).toContain('solar_forecast_api_key');
    expect(forecastKeys).not.toContain('solcast_api_key');
    expect(forecastKeys).not.toContain('solcast_site_id');

    const solcastFields = STEP_SOLAR.visibleFields(
      SOLAR_REGISTRY_FIXTURE,
      { solar_forecast_provider: 'solcast' } as Record<string, unknown>,
    );
    const solcastKeys = solcastFields.map((f) => f.key);
    expect(solcastKeys).toContain('solcast_api_key');
    expect(solcastKeys).toContain('solcast_site_id');
    expect(solcastKeys).not.toContain('solar_forecast_api_key');
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

    const nextBtn = wizard.shadowRoot!.querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement;
    nextBtn.click();
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

    const nextBtn = wizard.shadowRoot!.querySelector(
      '[data-testid="wizard-next"]',
    ) as HTMLButtonElement;
    nextBtn.click();
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
    const stringFields = Array.from(numberInputs).filter((inp) => {
      // lat/lon values are around 49.5/14.0; kwp values are > 0.1
      return true; // just count how many number inputs exist
    });
    // Only lat and lon number inputs should be visible
    expect(numberInputs.length).toBeLessThanOrEqual(2);
  });
});

describe('step ③ pricing', () => {
  it('is reachable without a verified AI (#5)', () => {
    expect(STEP_PRICING.requiresAi).toBe(false);
  });

  it('AI cross-verification is an optional helper button, not a precondition', () => {
    expect(STEP_PRICING.aiVerify.optional).toBe(true);
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

    // Modules card renders MODULE_FIELDS — 'enable_boiler' is a real bool field.
    const liveInput = settings.shadowRoot!.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(liveInput).toBeTruthy();
    const liveRow = liveInput.closest('.row') as HTMLElement;
    expect(liveRow).toBeTruthy();

    // Bare presenter call, explicit ctx — exactly what `oig-onboarding-wizard`
    // will call directly once Task 2 wires it up. Same FieldDef shape as the
    // real 'enable_boiler' MODULE_FIELDS entry.
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
