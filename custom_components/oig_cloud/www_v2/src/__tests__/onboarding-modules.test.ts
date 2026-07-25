// src/__tests__/onboarding-modules.test.ts
//
// F1 Wizard v2 Stage S3 Task 21 — Modules step "Hlavní moduly"/"Doplňkové"
// grouping + real `modulesDraft` seeding from `entry.options`/registry
// defaults (UX-SPEC-wizard-v2.md §Step 1).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';

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

/** Mirrors `config_registry.py`'s `modules` section (Field(name, 'modules',
 * bool, default=...)) — the 7 toggles the Modules step renders. Field ORDER
 * here deliberately does not match the spec's group order (battery sits
 * before pricing, like the real registry) — the render branch must sort by
 * the spec-fixed group lists, not by registry order. */
const MODULES_REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['modules'],
  fields: {
    enable_solar_forecast: {
      section: 'modules', type: 'bool', scope: 'basic',
      label: 'field.enable_solar_forecast.label', hint: 'field.enable_solar_forecast.hint',
      default: false,
    },
    enable_battery_prediction: {
      section: 'modules', type: 'bool', scope: 'basic',
      label: 'field.enable_battery_prediction.label', hint: 'field.enable_battery_prediction.hint',
      default: false,
    },
    enable_pricing: {
      section: 'modules', type: 'bool', scope: 'basic',
      label: 'field.enable_pricing.label', hint: 'field.enable_pricing.hint',
      default: false,
    },
    enable_boiler: {
      section: 'modules', type: 'bool', scope: 'basic',
      label: 'field.enable_boiler.label', hint: 'field.enable_boiler.hint',
      default: false,
    },
    enable_statistics: {
      section: 'modules', type: 'bool', scope: 'basic',
      label: 'field.enable_statistics.label', hint: 'field.enable_statistics.hint',
      default: true,
    },
    enable_extended_sensors: {
      section: 'modules', type: 'bool', scope: 'basic',
      label: 'field.enable_extended_sensors.label', hint: 'field.enable_extended_sensors.hint',
      default: true,
    },
    enable_chmu_warnings: {
      section: 'modules', type: 'bool', scope: 'basic',
      label: 'field.enable_chmu_warnings.label', hint: 'field.enable_chmu_warnings.hint',
      default: false,
    },
  },
};

async function settle(wizard: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> {
  await wizard.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wizard.updateComplete;
}

/** Private-state peek, same pattern as `onboarding-review-mode.test.ts`. */
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

/** Modules is always visible (no `STEP_GATE` entry) and immediately after
 * welcome — jump to it via the nav, same helper shape as the review-mode
 * suite's `goToStep`. */
async function openWizardOnModules(): Promise<HTMLElement & { updateComplete: Promise<boolean> }> {
  const wizard = await openWizard();
  const btn = wizard.shadowRoot!.querySelector(
    '[data-testid="wizard-steps"] [data-step="modules"]',
  ) as HTMLButtonElement;
  btn.click();
  await settle(wizard);
  return wizard;
}

function moduleConfigFetch(doc: Record<string, unknown>) {
  return (path: string): Promise<unknown> => {
    if (path.includes('/module_config')) return Promise.resolve(doc);
    return Promise.resolve(null);
  };
}

describe('modules step grouping (Task 21)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    fetchOIGAPI.mockResolvedValue(null);
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(MODULES_REGISTRY_FIXTURE);
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('modules step groups fields into Hlavní moduly (4, each gates a later step) and Doplňkové (3)', async () => {
    const wizard = await openWizardOnModules();

    const main = [...wizard.shadowRoot!.querySelectorAll('[data-group="hlavni"] [data-key]')]
      .map((n) => (n as HTMLElement).dataset.key);
    const extra = [...wizard.shadowRoot!.querySelectorAll('[data-group="doplnkove"] [data-key]')]
      .map((n) => (n as HTMLElement).dataset.key);

    expect(main).toEqual(['enable_solar_forecast', 'enable_pricing', 'enable_battery_prediction', 'enable_boiler']);
    expect(extra).toEqual(['enable_statistics', 'enable_extended_sensors', 'enable_chmu_warnings']);
  });

  it('renders the spec-verbatim Czech group headers "Hlavní moduly" / "Doplňkové"', async () => {
    const wizard = await openWizardOnModules();
    const content = wizard.shadowRoot!.querySelector('section[data-step="modules"]')?.textContent ?? '';
    expect(content).toContain('Hlavní moduly');
    expect(content).toContain('Doplňkové');
  });

  it('renders each toggle as a bool control (checkbox) inside its data-key wrapper', async () => {
    const wizard = await openWizardOnModules();
    const wrapper = wizard.shadowRoot!.querySelector('[data-key="enable_boiler"]');
    expect(wrapper?.querySelector('input[type="checkbox"]')).toBeTruthy();
  });
});

describe('modulesDraft seeding (Task 21)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(MODULES_REGISTRY_FIXTURE);
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('review mode (grandfathered) seeds modulesDraft from module_config, not registry defaults', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch({
      modules: { enable_boiler: true, enable_pricing: false, enable_statistics: false },
    }));

    const wizard = await openWizard();
    const w = internals(wizard);

    // Registry default for enable_boiler is false — a true seed here proves
    // module_config (entry.options), not the registry default, won.
    expect(w.modulesDraft.enable_boiler).toBe(true);
    expect(w.modulesDraft.enable_pricing).toBe(false);
    // Registry default for enable_statistics is true — module_config's
    // explicit false must still win.
    expect(w.modulesDraft.enable_statistics).toBe(false);
  });

  it('new install (no module_config modules section) falls back to registry defaults — all off except recommended (UX-SPEC table-of-contents)', async () => {
    fetchOIGAPI.mockResolvedValue(null);

    const wizard = await openWizard();
    const w = internals(wizard);

    expect(w.modulesDraft.enable_solar_forecast).toBe(false);
    expect(w.modulesDraft.enable_pricing).toBe(false);
    expect(w.modulesDraft.enable_battery_prediction).toBe(false);
    expect(w.modulesDraft.enable_boiler).toBe(false);
    expect(w.modulesDraft.enable_statistics).toBe(true);
    expect(w.modulesDraft.enable_extended_sensors).toBe(true);
    expect(w.modulesDraft.enable_chmu_warnings).toBe(false);
  });

  it('seeded modulesDraft drives step gating — a module left off (registry default) hides its gated step from nav', async () => {
    fetchOIGAPI.mockResolvedValue(null);

    const wizard = await openWizard();

    const steps = [...wizard.shadowRoot!.querySelectorAll('[data-testid="wizard-steps"] button')]
      .map((b) => b.getAttribute('data-step'));
    // enable_solar_forecast/enable_pricing/enable_battery_prediction/enable_boiler
    // all default false — every step they gate must be absent from nav.
    expect(steps).not.toContain('solar');
    expect(steps).not.toContain('pricing_distribution');
    expect(steps).not.toContain('battery');
    expect(steps).not.toContain('boiler');
  });
});
