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

import { renderFieldPresenter } from '@/ui/features/field-renderer';
import type { FieldDef } from '@/ui/features/settings';
import '@/ui/features/settings';

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
});
