import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html, render } from 'lit';
import { fieldsFromRegistry } from '@/data/registry-data';
import { STEP_SOLAR } from '@/ui/features/onboarding/step-solar';
import { STEP_PRICING } from '@/ui/features/onboarding/step-pricing';
import { REGISTRY_FIXTURE } from './fixtures/registry-fixture';

// ---- paired-host regression (Task 1) — mocks only the network edges, NOT
// registry-data (the other tests in this file need the real fieldsFromRegistry
// against REGISTRY_FIXTURE) ----
vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('@/data/settings-data', async () => {
  const actual = await vi.importActual<typeof import('@/data/settings-data')>('@/data/settings-data');
  return {
    ...actual,
    loadModuleConfig: vi.fn().mockResolvedValue({ modules: {}, battery: {}, solar: {}, boiler: {} }),
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
