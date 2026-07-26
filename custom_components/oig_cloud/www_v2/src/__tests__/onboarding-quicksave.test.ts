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

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string, options?: RequestInit], Promise<unknown>>());
const fetchOIGAPITyped = vi.hoisted(() => vi.fn());
const loadFieldRegistryMock = vi.hoisted(() => vi.fn<[signal?: AbortSignal], Promise<FieldRegistry | null>>());
const saveModuleConfigMock = vi.hoisted(() => vi.fn());
const waitForModuleConfigAfterReloadMock = vi.hoisted(() => vi.fn());
var realWaitForModuleConfigAfterReload: typeof import('@/data/settings-data').waitForModuleConfigAfterReload;

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
  realWaitForModuleConfigAfterReload = actual.waitForModuleConfigAfterReload;
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
    expect(wizard.shadowRoot!.querySelector('[data-testid="quicksave-discard-confirm"]')).toBeFalsy();
    expect(wizard.shadowRoot!.querySelector('[data-testid="quicksave-bar"]')).toBeFalsy();
    expect(saveModuleConfigMock).not.toHaveBeenCalled();
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
