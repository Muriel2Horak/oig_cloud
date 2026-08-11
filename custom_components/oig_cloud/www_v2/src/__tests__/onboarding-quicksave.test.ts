// src/__tests__/onboarding-quicksave.test.ts
//
// fe/fix Unit B — sticky quick-save bar (defect #2): on every step, when the
// draft diff vs originalValues is non-empty, show a bar with the changed-
// field count. Uložit reuses the SAME save+validate path as step 9 (Finish)
// — never a fork — and a backend validation error navigates to the
// offending step. Zahodit resets every draft to originalValues, behind a
// confirm dialog.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';
import { SOLAR_REGISTRY_FIXTURE } from './fixtures/solar-registry-fixture';

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string, options?: RequestInit], Promise<unknown>>());
const fetchOIGAPITyped = vi.hoisted(() => vi.fn());
const loadFieldRegistryMock = vi.hoisted(() => vi.fn<[signal?: AbortSignal], Promise<FieldRegistry | null>>());
const saveModuleConfigMock = vi.hoisted(() => vi.fn());
const waitForModuleConfigAfterReloadMock = vi.hoisted(() => vi.fn());
const realWaitForModuleConfigAfterReload = vi.hoisted(() =>
  vi.fn<
    Parameters<typeof import('@/data/settings-data').waitForModuleConfigAfterReload>,
    ReturnType<typeof import('@/data/settings-data').waitForModuleConfigAfterReload>
  >(),
);

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
  realWaitForModuleConfigAfterReload.mockImplementation(actual.waitForModuleConfigAfterReload);
  return {
    ...actual,
    saveModuleConfig: saveModuleConfigMock,
    waitForModuleConfigAfterReload: waitForModuleConfigAfterReloadMock,
  };
});

import '@/ui/features/onboarding';

/** Same 7-field modules registry shape as onboarding-modules.test.ts —
 * `ha_rest_api.py:1163` iterates `fields_for_section`, so `originalValues`
 * holds all 7 `enable_*` keys either way. */
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

const FULL_MODULES_DOC = {
  modules: {
    enable_solar_forecast: false, enable_battery_prediction: false, enable_pricing: false,
    enable_boiler: false, enable_statistics: true, enable_extended_sensors: true,
    enable_chmu_warnings: true,
  },
};

const MULTI_SECTION_REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['modules', 'battery', 'basic', 'boiler'],
  fields: {
    ...MODULES_REGISTRY_FIXTURE.fields,
    charge_rate_kw: {
      section: 'battery', type: 'float', scope: 'premium',
      label: 'field.charge_rate_kw.label', hint: 'field.charge_rate_kw.hint',
      default: 1.5,
    },
    data_source_mode: {
      section: 'basic', type: 'str', scope: 'basic',
      label: 'field.data_source_mode.label', hint: 'field.data_source_mode.hint',
      default: 'cloud_only', enum: ['cloud_only', 'local_only', 'hybrid'],
    },
    standard_scan_interval: {
      section: 'basic', type: 'int', scope: 'basic',
      label: 'field.standard_scan_interval.label', hint: 'field.standard_scan_interval.hint',
      default: 30,
    },
    boiler_target_temp_c: {
      section: 'boiler', type: 'float', scope: 'premium',
      label: 'field.boiler_target_temp_c.label', hint: 'field.boiler_target_temp_c.hint',
      default: 60,
    },
  },
};

const MULTI_SECTION_DOC = {
  modules: FULL_MODULES_DOC.modules,
  battery: { charge_rate_kw: 1.5 },
  basic: { data_source_mode: 'cloud_only', standard_scan_interval: 30 },
  boiler: { boiler_target_temp_c: 60 },
};

const SOLAR_RETRY_REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['solar', 'boiler'],
  fields: {
    ...SOLAR_REGISTRY_FIXTURE.fields,
    boiler_target_temp_c: MULTI_SECTION_REGISTRY_FIXTURE.fields.boiler_target_temp_c,
  },
};

const SOLAR_RETRY_DOC = {
  solar: {
    solar_forecast_provider: 'forecast_solar',
    solar_forecast_mode: 'hourly',
    solar_forecast_api_key_set: true,
    solar_forecast_string1_enabled: true,
    solar_forecast_string1_kwp: 5.5,
    solar_forecast_string1_declination: 35,
    solar_forecast_string1_azimuth: 180,
    solar_forecast_string2_enabled: false,
  },
  boiler: { boiler_target_temp_c: 60 },
  _meta: { legacy_fields: {} },
};

const PRICING_SAVE_REGISTRY_FIXTURE: FieldRegistry = {
  sections: [...MULTI_SECTION_REGISTRY_FIXTURE.sections, 'pricing_supplier'],
  fields: {
    ...MULTI_SECTION_REGISTRY_FIXTURE.fields,
    spot_pricing_model: {
      section: 'pricing_supplier', type: 'str', scope: 'premium',
      label: 'field.spot_pricing_model.label', hint: 'field.spot_pricing_model.hint',
      default: 'percentage', enum: ['percentage', 'fixed', 'fixed_prices'],
    },
  },
};

const PRICING_SAVE_DOC = {
  ...MULTI_SECTION_DOC,
  pricing_supplier: { spot_pricing_model: 'percentage' },
};

const MINIMAL_PRICELISTS = {
  distributors: {},
  tariffs: [],
  selected_distributor: '',
  selected_tariff: '',
  confirmed_distribution_price_incl_vat: 0,
  confirmed_distribution_price_excl_vat: 0,
  confirmed_distribution_unit: 'Kc/kWh',
  stale_warning: false,
  valid_from: null,
  year: 2026,
};

async function settle(wizard: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> {
  await wizard.updateComplete;
  if (vi.isFakeTimers()) {
    await vi.advanceTimersByTimeAsync(0);
  } else {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await wizard.updateComplete;
}

/** Private-state peek, same pattern as onboarding-modules.test.ts /
 * onboarding-review-mode.test.ts. */
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

function moduleConfigFetch(doc: Record<string, unknown>) {
  return (path: string): Promise<unknown> => {
    if (path.includes('/module_config')) return Promise.resolve(doc);
    return Promise.resolve(null);
  };
}

describe('quick-save bar (fe/fix defect #2)', () => {
  let reloadPanelSpy: any;

  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    waitForModuleConfigAfterReloadMock.mockReset();
    fetchOIGAPI.mockResolvedValue(null);
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(MODULES_REGISTRY_FIXTURE);
    saveModuleConfigMock.mockResolvedValue({ ok: true });
    // fe/fix defect #1: a successful Uložit ends in `runPostSaveReload`,
    // which polls this then calls a real `location.reload()` — settle the
    // poll immediately and stub the reload (see `reloadPanelSpy` below), same
    // pattern as onboarding-mount.test.ts's Finish-flow suite.
    waitForModuleConfigAfterReloadMock.mockImplementation((onSuccess: (cfg: unknown) => void) => {
      onSuccess({});
    });
    reloadPanelSpy = vi.spyOn(
      customElements.get('oig-onboarding-wizard')!.prototype as unknown as { reloadPanel(): void },
      'reloadPanel',
    ).mockImplementation(() => {});
  });

  afterEach(() => {
    fixtureCleanup();
    reloadPanelSpy.mockRestore();
  });

  it('does not render when the draft has no unsaved changes', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(FULL_MODULES_DOC));
    const wizard = await openWizard();
    expect(wizard.shadowRoot!.querySelector('[data-testid="quicksave-bar"]')).toBeFalsy();
  });

  it('renders with N = number of changed fields once a draft field differs from originalValues', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(FULL_MODULES_DOC));
    const wizard = await openWizard();
    const w = internals(wizard);
    w.modulesDraft = { ...w.modulesDraft, enable_chmu_warnings: false };
    await wizard.updateComplete;

    expect(wizard.shadowRoot!.querySelector('[data-testid="quicksave-bar"]')).toBeTruthy();
    const count = wizard.shadowRoot!.querySelector('[data-testid="quicksave-count"]');
    expect(count?.textContent).toContain('(1)');
  });

  it('N grows as more fields diverge from originalValues', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(FULL_MODULES_DOC));
    const wizard = await openWizard();
    const w = internals(wizard);
    w.modulesDraft = { ...w.modulesDraft, enable_chmu_warnings: false, enable_boiler: true };
    await wizard.updateComplete;

    const count = wizard.shadowRoot!.querySelector('[data-testid="quicksave-count"]');
    expect(count?.textContent).toContain('(2)');
  });

  it('renders on welcome when the draft is dirty, proving the bar is not step-9-only', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(FULL_MODULES_DOC));
    const wizard = await openWizard();
    const w = internals(wizard);
    expect(w.currentStep).toBe('welcome');

    w.modulesDraft = { ...w.modulesDraft, enable_chmu_warnings: false };
    await wizard.updateComplete;

    expect(w.currentStep).toBe('welcome');
    expect(wizard.shadowRoot!.querySelector('[data-testid="quicksave-bar"]')).toBeTruthy();
  });

  it('Uložit invokes the SAME save path step 9 Finish uses (saveModuleConfig with only the changed fields)', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(FULL_MODULES_DOC));
    const wizard = await openWizard();
    const w = internals(wizard);
    w.modulesDraft = { ...w.modulesDraft, enable_chmu_warnings: false };
    await wizard.updateComplete;

    const saveBtn = wizard.shadowRoot!.querySelector('[data-testid="quicksave-save"]') as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();
    saveBtn.click();
    await settle(wizard);

    expect(saveModuleConfigMock).toHaveBeenCalledWith('modules', { enable_chmu_warnings: false });
    // On success it runs the post-save reload flow from part 1 — same
    // blocking overlay + soft-reload as step 9's Finish.
    expect(wizard.shadowRoot!.querySelector('[data-testid="onboarding-wizard-reloading"]')).toBeTruthy();
    expect(reloadPanelSpy).toHaveBeenCalledTimes(1);
  });

  it('Zahodit shows a confirm dialog; confirming resets every draft to originalValues', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(FULL_MODULES_DOC));
    const wizard = await openWizard();
    const w = internals(wizard);
    w.modulesDraft = { ...w.modulesDraft, enable_chmu_warnings: false, enable_boiler: true };
    w.solarTestProof = 'stale-proof';
    w.solarTestResult = { tomorrow_total_kwh: 7.5, forecast_covers_tomorrow: true };
    w.solarTestError = { code: 'timeout', message: 'stale-error' };
    w.solarTestMatchesDraft = true;
    await wizard.updateComplete;

    const discardBtn = wizard.shadowRoot!.querySelector('[data-testid="quicksave-discard"]') as HTMLButtonElement;
    discardBtn.click();
    await wizard.updateComplete;

    // Not yet applied — confirm dialog up, edits still pending.
    expect(wizard.shadowRoot!.querySelector('[data-testid="quicksave-discard-confirm"]')).toBeTruthy();
    expect(w.modulesDraft.enable_chmu_warnings).toBe(false);
    expect(w.modulesDraft.enable_boiler).toBe(true);

    const confirmYes = wizard.shadowRoot!.querySelector(
      '[data-testid="quicksave-discard-confirm-yes"]',
    ) as HTMLButtonElement;
    confirmYes.click();
    await wizard.updateComplete;

    expect(w.modulesDraft.enable_chmu_warnings).toBe(true);
    expect(w.modulesDraft.enable_boiler).toBe(false);
    expect(w.solarTestProof).toBeNull();
    expect(w.solarTestResult).toBeNull();
    expect(w.solarTestError).toBeNull();
    expect(w.solarTestMatchesDraft).toBe(false);
    expect(wizard.shadowRoot!.querySelector('[data-testid="quicksave-discard-confirm"]')).toBeFalsy();
    expect(wizard.shadowRoot!.querySelector('[data-testid="quicksave-bar"]')).toBeFalsy();
    expect(saveModuleConfigMock).not.toHaveBeenCalled();
  });

  it('a new bootstrap clears candidate state so an old result cannot satisfy the newly loaded draft', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(FULL_MODULES_DOC));
    const wizard = await openWizard();
    const w = internals(wizard);
    w.solarTestProof = 'old-proof';
    w.solarTestResult = { tomorrow_total_kwh: 7.5, forecast_covers_tomorrow: true };
    w.solarTestError = { code: 'timeout', message: 'old-error' };
    w.solarTestMatchesDraft = true;
    w.legacySolarFields = {
      solar_forecast_string1_azimuth: { stored_value: -90, display_value: 90 },
    };

    w.open = false;
    await settle(wizard);
    w.open = true;
    await settle(wizard);

    expect(w.solarTestProof).toBeNull();
    expect(w.solarTestResult).toBeNull();
    expect(w.solarTestError).toBeNull();
    expect(w.solarTestMatchesDraft).toBe(false);
    expect(w.legacySolarFields).toEqual({});
  });

  it.each(['discard', 'reopen', 'bootstrap'] as const)(
    '%s invalidates an unresolved solar success before it can repopulate candidate state',
    async (action) => {
      fetchOIGAPI.mockImplementation(moduleConfigFetch(SOLAR_RETRY_DOC));
      loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
      let resolveOld!: (value: unknown) => void;
      fetchOIGAPITyped.mockReturnValueOnce(new Promise((resolve) => {
        resolveOld = resolve;
      }));
      const wizard = await openWizard();
      const w = internals(wizard);
      const oldRequest = w.runSolarTest();
      expect(w.solarTestLoading).toBe(true);

      if (action === 'discard') {
        w.resetAllDraftsToOriginal();
      } else if (action === 'reopen') {
        w.open = false;
        await settle(wizard);
        w.open = true;
        await settle(wizard);
      } else {
        w.startBootstrap();
        await settle(wizard);
      }

      resolveOld({
        ok: true,
        status: 200,
        data: {
          tomorrow_total_kwh: 99,
          forecast_covers_tomorrow: true,
          proof: 'old-proof',
        },
      });
      await oldRequest;
      await settle(wizard);

      expect(w.solarTestLoading).toBe(false);
      expect(w.solarTestProof).toBeNull();
      expect(w.solarTestResult).toBeNull();
      expect(w.solarTestError).toBeNull();
      expect(w.solarTestMatchesDraft).toBe(false);
    },
  );

  it('bootstrap invalidates an unresolved solar failure including its finally path', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(SOLAR_RETRY_DOC));
    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
    let resolveOld!: (value: unknown) => void;
    fetchOIGAPITyped.mockReturnValueOnce(new Promise((resolve) => {
      resolveOld = resolve;
    }));
    const wizard = await openWizard();
    const w = internals(wizard);
    const oldRequest = w.runSolarTest();

    w.startBootstrap();
    await settle(wizard);
    resolveOld({
      ok: false,
      status: 503,
      code: 'provider_unreachable',
      error: 'old provider failure',
    });
    await oldRequest;
    await settle(wizard);

    expect(w.solarTestLoading).toBe(false);
    expect(w.solarTestProof).toBeNull();
    expect(w.solarTestResult).toBeNull();
    expect(w.solarTestError).toBeNull();
    expect(w.solarTestMatchesDraft).toBe(false);
  });

  it('late module config reseed invalidates an unresolved test for the old draft', async () => {
    let resolveConfig!: (value: unknown) => void;
    fetchOIGAPI.mockImplementation((path) => {
      if (path.includes('/module_config')) {
        return new Promise((resolve) => {
          resolveConfig = resolve;
        });
      }
      return Promise.resolve(null);
    });
    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
    let resolveTest!: (value: unknown) => void;
    fetchOIGAPITyped.mockReturnValueOnce(new Promise((resolve) => {
      resolveTest = resolve;
    }));
    const wizard = await openWizard();
    const w = internals(wizard);
    expect(w.solarDraft.solar_forecast_string1_kwp).toBeUndefined();

    const oldRequest = w.runSolarTest();
    resolveConfig(SOLAR_RETRY_DOC);
    await settle(wizard);
    expect(w.solarDraft.solar_forecast_string1_kwp).toBe(5.5);

    resolveTest({
      ok: true,
      status: 200,
      data: {
        tomorrow_total_kwh: 99,
        forecast_covers_tomorrow: true,
        proof: 'pre-reseed-proof',
      },
    });
    await oldRequest;
    await settle(wizard);

    expect(w.solarTestLoading).toBe(false);
    expect(w.solarTestProof).toBeNull();
    expect(w.solarTestResult).toBeNull();
    expect(w.solarTestError).toBeNull();
    expect(w.solarTestMatchesDraft).toBe(false);
  });

  it('a new solar test after discard wins over the still unresolved old request', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(SOLAR_RETRY_DOC));
    loadFieldRegistryMock.mockResolvedValue(SOLAR_REGISTRY_FIXTURE);
    let resolveOld!: (value: unknown) => void;
    fetchOIGAPITyped
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveOld = resolve;
      }))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          tomorrow_total_kwh: 7.5,
          forecast_covers_tomorrow: true,
          proof: 'fresh-proof',
        },
      });
    const wizard = await openWizard();
    const w = internals(wizard);
    const oldRequest = w.runSolarTest();
    w.resetAllDraftsToOriginal();

    await w.runSolarTest();
    expect(w.solarTestProof).toBe('fresh-proof');
    expect(w.solarTestResult?.tomorrow_total_kwh).toBe(7.5);
    expect(w.solarTestLoading).toBe(false);

    resolveOld({
      ok: true,
      status: 200,
      data: {
        tomorrow_total_kwh: 99,
        forecast_covers_tomorrow: true,
        proof: 'old-proof',
      },
    });
    await oldRequest;
    await settle(wizard);

    expect(w.solarTestProof).toBe('fresh-proof');
    expect(w.solarTestResult?.tomorrow_total_kwh).toBe(7.5);
    expect(w.solarTestError).toBeNull();
    expect(w.solarTestMatchesDraft).toBe(true);
    expect(w.solarTestLoading).toBe(false);
  });

  it('Zahodit cancel leaves the draft untouched and dismisses the confirm dialog', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(FULL_MODULES_DOC));
    const wizard = await openWizard();
    const w = internals(wizard);
    w.modulesDraft = { ...w.modulesDraft, enable_chmu_warnings: false };
    await wizard.updateComplete;

    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-discard"]') as HTMLButtonElement).click();
    await wizard.updateComplete;
    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-discard-cancel"]') as HTMLButtonElement).click();
    await wizard.updateComplete;

    expect(wizard.shadowRoot!.querySelector('[data-testid="quicksave-discard-confirm"]')).toBeFalsy();
    expect(w.modulesDraft.enable_chmu_warnings).toBe(false);
    expect(wizard.shadowRoot!.querySelector('[data-testid="quicksave-bar"]')).toBeTruthy();
  });

  it('a backend validation error navigates to the offending step and shows why, without reaching Finish', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(FULL_MODULES_DOC));
    saveModuleConfigMock.mockResolvedValue({
      ok: false,
      fields: { enable_chmu_warnings: 'neplatná hodnota' },
    });
    const wizard = await openWizard();
    const w = internals(wizard);
    w.modulesDraft = { ...w.modulesDraft, enable_chmu_warnings: false };
    await wizard.updateComplete;
    expect(w.currentStep).toBe('welcome');

    const saveBtn = wizard.shadowRoot!.querySelector('[data-testid="quicksave-save"]') as HTMLButtonElement;
    saveBtn.click();
    await settle(wizard);

    expect(w.currentStep).toBe('modules');
    const err = wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-error"]');
    expect(err?.textContent).toContain('enable_chmu_warnings');
    expect(err?.textContent).toContain('neplatná hodnota');
    // A failed validation never reaches the finish POST or the reload flow.
    expect(fetchOIGAPITyped).not.toHaveBeenCalled();
    expect(reloadPanelSpy).not.toHaveBeenCalled();
  });

  it('a failed section save without field errors stops finish and surfaces a generic error', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(FULL_MODULES_DOC));
    saveModuleConfigMock.mockResolvedValue({ ok: false });
    const wizard = await openWizard();
    const w = internals(wizard);
    w.modulesDraft = { ...w.modulesDraft, enable_chmu_warnings: false };
    await wizard.updateComplete;

    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-save"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-error"]')).toBeTruthy();
    expect(fetchOIGAPITyped).not.toHaveBeenCalled();
    expect(waitForModuleConfigAfterReloadMock).not.toHaveBeenCalled();
    expect(reloadPanelSpy).not.toHaveBeenCalled();
  });
});

describe('post-save reload (fe/fix defect #1)', () => {
  let reloadPanelSpy: any;

  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    waitForModuleConfigAfterReloadMock.mockReset();
    fetchOIGAPI.mockImplementation(moduleConfigFetch(FULL_MODULES_DOC));
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(MODULES_REGISTRY_FIXTURE);
    saveModuleConfigMock.mockResolvedValue({ ok: true });
    reloadPanelSpy = vi.spyOn(
      customElements.get('oig-onboarding-wizard')!.prototype as unknown as { reloadPanel(): void },
      'reloadPanel',
    ).mockImplementation(() => {});
  });

  afterEach(() => {
    fixtureCleanup();
    reloadPanelSpy.mockRestore();
  });

  it('blocks the wizard with the reload overlay (no close control) while the integration is still coming back', async () => {
    let resolvePoll: (() => void) | null = null;
    waitForModuleConfigAfterReloadMock.mockImplementation((onSuccess: (cfg: unknown) => void) => {
      resolvePoll = () => onSuccess({});
    });

    const wizard = await openWizard();
    const w = internals(wizard);
    w.modulesDraft = { ...w.modulesDraft, enable_chmu_warnings: false };
    await wizard.updateComplete;
    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-save"]') as HTMLButtonElement).click();
    await settle(wizard);

    // Poll is still pending — blocked, no way to dismiss the wizard.
    expect(wizard.shadowRoot!.querySelector('[data-testid="onboarding-wizard-reloading"]')).toBeTruthy();
    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-close"]')).toBeFalsy();
    expect(reloadPanelSpy).not.toHaveBeenCalled();

    resolvePoll!();
    await settle(wizard);

    expect(reloadPanelSpy).toHaveBeenCalledTimes(1);
  });

  it('shows the retry state when the integration poll times out — never a blind reload', async () => {
    waitForModuleConfigAfterReloadMock.mockImplementation(
      (_onSuccess: (cfg: unknown) => void, onTimeout: () => void) => {
        onTimeout();
      },
    );

    const wizard = await openWizard();
    const w = internals(wizard);
    w.modulesDraft = { ...w.modulesDraft, enable_chmu_warnings: false };
    await wizard.updateComplete;
    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-save"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-testid="onboarding-wizard-reloading"]')).toBeFalsy();
    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-error"]')).toBeTruthy();
    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-retry"]')).toBeTruthy();
    expect(reloadPanelSpy).not.toHaveBeenCalled();
  });
});

describe('solar retry transaction baseline', () => {
  let reloadPanelSpy: any;

  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    waitForModuleConfigAfterReloadMock.mockReset();
    fetchOIGAPI.mockImplementation(moduleConfigFetch(SOLAR_RETRY_DOC));
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(SOLAR_RETRY_REGISTRY_FIXTURE);
    waitForModuleConfigAfterReloadMock.mockImplementation((onSuccess: (cfg: unknown) => void) => {
      onSuccess({});
    });
    reloadPanelSpy = vi.spyOn(
      customElements.get('oig-onboarding-wizard')!.prototype as unknown as { reloadPanel(): void },
      'reloadPanel',
    ).mockImplementation(() => {});
  });

  afterEach(() => {
    fixtureCleanup();
    reloadPanelSpy.mockRestore();
  });

  it('does not resave a committed verified solar section when a later section fails and is retried', async () => {
    let boilerAttempts = 0;
    saveModuleConfigMock.mockImplementation(async (section: string) => {
      if (section === 'boiler' && boilerAttempts++ === 0) return { ok: false };
      return { ok: true };
    });
    const wizard = await openWizard();
    const w = internals(wizard);
    w.solarDraft = { ...w.solarDraft, solar_forecast_string1_kwp: 6 };
    w.boilerDraft = { ...w.boilerDraft, boiler_target_temp_c: 66 };
    w.solarTestProof = 'verified-proof';
    await wizard.updateComplete;

    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-save"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(saveModuleConfigMock.mock.calls.map(([section]) => section)).toEqual(['solar', 'boiler']);
    expect(saveModuleConfigMock.mock.calls[0]).toEqual([
      'solar',
      { solar_forecast_string1_kwp: 6 },
      [],
      'verified-proof',
    ]);
    expect(w.solarTestProof).toBeNull();
    expect(fetchOIGAPITyped).not.toHaveBeenCalled();

    (wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-retry"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(saveModuleConfigMock.mock.calls.map(([section]) => section)).toEqual([
      'solar', 'boiler', 'boiler',
    ]);
    expect(w.originalValues.solar_forecast_string1_kwp).toBe(6);
    expect(fetchOIGAPITyped).toHaveBeenCalledTimes(1);
    expect(waitForModuleConfigAfterReloadMock).toHaveBeenCalledTimes(1);
    expect(reloadPanelSpy).toHaveBeenCalledTimes(1);
  });

  it('advances a successful section baseline without hiding a later edit', async () => {
    let boilerAttempts = 0;
    saveModuleConfigMock.mockImplementation(async (section: string) => {
      if (section === 'boiler' && boilerAttempts++ === 0) return { ok: false };
      return { ok: true };
    });
    const wizard = await openWizard();
    const w = internals(wizard);
    w.solarDraft = { ...w.solarDraft, solar_forecast_string1_kwp: 6 };
    w.boilerDraft = { ...w.boilerDraft, boiler_target_temp_c: 66 };
    w.solarTestProof = 'verified-proof';
    await w.saveAllChangedSections();

    w.solarDraft = { ...w.solarDraft, solar_forecast_string1_kwp: 7 };
    await w.saveAllChangedSections();

    const solarCalls = saveModuleConfigMock.mock.calls.filter(([section]) => section === 'solar');
    expect(solarCalls).toHaveLength(2);
    expect(solarCalls[1][1]).toEqual({ solar_forecast_string1_kwp: 7 });
  });

  it('keeps the proof when the solar section itself is not committed', async () => {
    saveModuleConfigMock.mockResolvedValue({ ok: false });
    const wizard = await openWizard();
    const w = internals(wizard);
    w.solarDraft = { ...w.solarDraft, solar_forecast_string1_kwp: 6 };
    w.solarTestProof = 'retryable-proof';

    await w.saveAllChangedSections();

    expect(w.solarTestProof).toBe('retryable-proof');
    expect(w.originalValues.solar_forecast_string1_kwp).toBe(5.5);
  });
});

describe('post-save reload recovery (real poll helper)', () => {
  let reloadPanelSpy: any;
  let moduleConfigRecovered = true;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    waitForModuleConfigAfterReloadMock.mockReset();
    moduleConfigRecovered = true;
    fetchOIGAPI.mockResolvedValue(null);
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(MULTI_SECTION_REGISTRY_FIXTURE);
    saveModuleConfigMock.mockResolvedValue({ ok: true });
    waitForModuleConfigAfterReloadMock.mockImplementation((onSuccess, onTimeout, delaysMs) =>
      realWaitForModuleConfigAfterReload(onSuccess, onTimeout, delaysMs));
    reloadPanelSpy = vi.spyOn(
      customElements.get('oig-onboarding-wizard')!.prototype as unknown as { reloadPanel(): void },
      'reloadPanel',
    ).mockImplementation(() => {});
  });

  afterEach(() => {
    fixtureCleanup();
    reloadPanelSpy.mockRestore();
    vi.useRealTimers();
  });

  it('reloads only after the real module_config poll confirms recovery', async () => {
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/module_config')) {
        return Promise.resolve(moduleConfigRecovered ? MULTI_SECTION_DOC : null);
      }
      return Promise.resolve(null);
    });

    const wizard = await openWizard();
    const w = internals(wizard);
    w.batteryDraft = { ...w.batteryDraft, charge_rate_kw: 2.1 };
    w.connectionDraft = { ...w.connectionDraft, data_source_mode: 'local_only' };
    w.boilerDraft = { ...w.boilerDraft, boiler_target_temp_c: 66 };
    await wizard.updateComplete;

    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-save"]') as HTMLButtonElement).click();
    await vi.runAllTimersAsync();
    await settle(wizard);

    expect(saveModuleConfigMock.mock.calls.map(([section]) => section)).toEqual(['battery', 'basic', 'boiler']);
    expect(wizard.shadowRoot!.querySelector('[data-testid="onboarding-wizard-reloading"]')).toBeTruthy();
    expect(reloadPanelSpy).toHaveBeenCalledTimes(1);
    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-error"]')).toBeFalsy();
  });

  it('shows the retry state instead of reloading when recovery never comes back', async () => {
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/module_config')) {
        return Promise.resolve(moduleConfigRecovered ? MULTI_SECTION_DOC : null);
      }
      return Promise.resolve(null);
    });
    saveModuleConfigMock.mockImplementation(async (section: string) => {
      if (section === 'boiler') moduleConfigRecovered = false;
      return { ok: true };
    });

    const wizard = await openWizard();
    const w = internals(wizard);
    w.batteryDraft = { ...w.batteryDraft, charge_rate_kw: 2.1 };
    w.connectionDraft = { ...w.connectionDraft, data_source_mode: 'local_only' };
    w.boilerDraft = { ...w.boilerDraft, boiler_target_temp_c: 66 };
    await wizard.updateComplete;

    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-save"]') as HTMLButtonElement).click();
    await vi.runAllTimersAsync();
    await settle(wizard);

    expect(wizard.shadowRoot!.querySelector('[data-testid="onboarding-wizard-reloading"]')).toBeFalsy();
    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-error"]')).toBeTruthy();
    expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-retry"]')).toBeTruthy();
    expect(reloadPanelSpy).not.toHaveBeenCalled();
  });
});

describe('quick-save drafts for battery, boiler, and connection', () => {
  let reloadPanelSpy: any;

  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    waitForModuleConfigAfterReloadMock.mockReset();
    fetchOIGAPI.mockResolvedValue(null);
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(MULTI_SECTION_REGISTRY_FIXTURE);
    saveModuleConfigMock.mockResolvedValue({ ok: true });
    waitForModuleConfigAfterReloadMock.mockImplementation((onSuccess: (cfg: unknown) => void) => {
      onSuccess({});
    });
    reloadPanelSpy = vi.spyOn(
      customElements.get('oig-onboarding-wizard')!.prototype as unknown as { reloadPanel(): void },
      'reloadPanel',
    ).mockImplementation(() => {});
  });

  afterEach(() => {
    fixtureCleanup();
    reloadPanelSpy.mockRestore();
  });

  it('counts battery, boiler, and connection draft edits in the sticky bar', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(MULTI_SECTION_DOC));
    const wizard = await openWizard();
    const w = internals(wizard);

    w.batteryDraft = { ...w.batteryDraft, charge_rate_kw: 2.1 };
    w.connectionDraft = { ...w.connectionDraft, data_source_mode: 'local_only' };
    w.boilerDraft = { ...w.boilerDraft, boiler_target_temp_c: 66 };
    await wizard.updateComplete;

    const count = wizard.shadowRoot!.querySelector('[data-testid="quicksave-count"]');
    expect(count?.textContent).toContain('(3)');
  });

  it('Zahodit resets battery, boiler, and connection drafts back to originalValues', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(MULTI_SECTION_DOC));
    const wizard = await openWizard();
    const w = internals(wizard);

    w.batteryDraft = { ...w.batteryDraft, charge_rate_kw: 2.1 };
    w.connectionDraft = { ...w.connectionDraft, data_source_mode: 'local_only' };
    w.boilerDraft = { ...w.boilerDraft, boiler_target_temp_c: 66 };
    await wizard.updateComplete;

    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-discard"]') as HTMLButtonElement).click();
    await wizard.updateComplete;
    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-discard-confirm-yes"]') as HTMLButtonElement).click();
    await wizard.updateComplete;

    expect(w.batteryDraft.charge_rate_kw).toBe(1.5);
    expect(w.connectionDraft.data_source_mode).toBe('cloud_only');
    expect(w.connectionDraft.standard_scan_interval).toBe(30);
    expect(Object.keys(w.boilerDraft)).toHaveLength(0);
    expect(wizard.shadowRoot!.querySelector('[data-testid="quicksave-bar"]')).toBeFalsy();
    expect(saveModuleConfigMock).not.toHaveBeenCalled();
  });

  it('Uložit saves battery, basic, and boiler drafts as separate sections', async () => {
    fetchOIGAPI.mockImplementation(moduleConfigFetch(MULTI_SECTION_DOC));
    const wizard = await openWizard();
    const w = internals(wizard);

    w.batteryDraft = { ...w.batteryDraft, charge_rate_kw: 2.1 };
    w.connectionDraft = { ...w.connectionDraft, data_source_mode: 'local_only' };
    w.boilerDraft = { ...w.boilerDraft, boiler_target_temp_c: 66 };
    await wizard.updateComplete;

    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-save"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(saveModuleConfigMock.mock.calls.map(([section]) => section)).toEqual(['battery', 'basic', 'boiler']);
    expect(saveModuleConfigMock.mock.calls[0][1]).toEqual({ charge_rate_kw: 2.1 });
    expect(saveModuleConfigMock.mock.calls[1][1]).toEqual({ data_source_mode: 'local_only' });
    expect(saveModuleConfigMock.mock.calls[2][1]).toEqual({ boiler_target_temp_c: 66 });
    expect(reloadPanelSpy).toHaveBeenCalledTimes(1);
  });
});

describe('quick-save routing for pricing_supplier fields', () => {
  let reloadPanelSpy: any;

  beforeEach(() => {
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    waitForModuleConfigAfterReloadMock.mockReset();
    fetchOIGAPI.mockResolvedValue(null);
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(PRICING_SAVE_REGISTRY_FIXTURE);
    saveModuleConfigMock.mockResolvedValue({ ok: true });
    waitForModuleConfigAfterReloadMock.mockImplementation((onSuccess: (cfg: unknown) => void) => {
      onSuccess({});
    });
    reloadPanelSpy = vi.spyOn(
      customElements.get('oig-onboarding-wizard')!.prototype as unknown as { reloadPanel(): void },
      'reloadPanel',
    ).mockImplementation(() => {});
  });

  afterEach(() => {
    fixtureCleanup();
    reloadPanelSpy.mockRestore();
  });

  it('posts spot_pricing_model under pricing_supplier, matching the backend section map', async () => {
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/module_config')) return Promise.resolve(PRICING_SAVE_DOC);
      if (path.includes('/pricelists')) return Promise.resolve(MINIMAL_PRICELISTS);
      return Promise.resolve(null);
    });

    const wizard = await openWizard();
    const w = internals(wizard);
    w.pricingDraft = { ...w.pricingDraft, spot_pricing_model: 'fixed' };
    await wizard.updateComplete;

    (wizard.shadowRoot!.querySelector('[data-testid="quicksave-save"]') as HTMLButtonElement).click();
    await settle(wizard);

    expect(saveModuleConfigMock.mock.calls).toEqual([
      ['pricing_supplier', { spot_pricing_model: 'fixed' }],
    ]);
    expect(reloadPanelSpy).toHaveBeenCalledTimes(1);
  });
});

describe('post-save reload rejection handling (real poll helper)', () => {
  let reloadPanelSpy: any;
  let moduleConfigRecovered = true;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchOIGAPI.mockReset();
    fetchOIGAPITyped.mockReset();
    loadFieldRegistryMock.mockReset();
    saveModuleConfigMock.mockReset();
    waitForModuleConfigAfterReloadMock.mockReset();
    moduleConfigRecovered = true;
    fetchOIGAPI.mockResolvedValue(null);
    fetchOIGAPITyped.mockResolvedValue({ ok: true, status: 200, data: null });
    loadFieldRegistryMock.mockResolvedValue(MULTI_SECTION_REGISTRY_FIXTURE);
    saveModuleConfigMock.mockResolvedValue({ ok: true });
    waitForModuleConfigAfterReloadMock.mockImplementation((onSuccess, onTimeout, delaysMs) =>
      realWaitForModuleConfigAfterReload(onSuccess, onTimeout, delaysMs));
    reloadPanelSpy = vi.spyOn(
      customElements.get('oig-onboarding-wizard')!.prototype as unknown as { reloadPanel(): void },
      'reloadPanel',
    ).mockImplementation(() => {});
  });

  afterEach(() => {
    fixtureCleanup();
    reloadPanelSpy.mockRestore();
    vi.useRealTimers();
  });

  it('dismisses the overlay and shows retry controls when the reload poll rejects unexpectedly', async () => {
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/module_config')) {
        return moduleConfigRecovered
          ? Promise.resolve(MULTI_SECTION_DOC)
          : Promise.reject(new Error('module_config poll rejected'));
      }
      return Promise.resolve(null);
    });
    saveModuleConfigMock.mockImplementation(async (section: string) => {
      if (section === 'boiler') moduleConfigRecovered = false;
      return { ok: true };
    });

    const swallowRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
    };
    window.addEventListener('unhandledrejection', swallowRejection);

    try {
      const wizard = await openWizard();
      const w = internals(wizard);
      w.batteryDraft = { ...w.batteryDraft, charge_rate_kw: 2.1 };
      w.connectionDraft = { ...w.connectionDraft, data_source_mode: 'local_only' };
      w.boilerDraft = { ...w.boilerDraft, boiler_target_temp_c: 66 };
      await wizard.updateComplete;

      (wizard.shadowRoot!.querySelector('[data-testid="quicksave-save"]') as HTMLButtonElement).click();
      await vi.runAllTimersAsync();
      await settle(wizard);

      expect(wizard.shadowRoot!.querySelector('[data-testid="onboarding-wizard-reloading"]')).toBeFalsy();
      expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-error"]')).toBeTruthy();
      expect(wizard.shadowRoot!.querySelector('[data-testid="wizard-finish-retry"]')).toBeTruthy();
      expect(reloadPanelSpy).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('unhandledrejection', swallowRejection);
    }
  });
});
